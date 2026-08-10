/**
 * CONSENT STORE
 * Zustand store for user consent management (FEAT-90)
 *
 * SECURITY:
 * - Consent records stored in SecureStore (encrypted)
 * - Consent preferences cached for fast validation (<5ms)
 * - Fail-safe defaults: missing consent = block access
 * - Emergency override for crisis intervention only
 *
 * COMPLIANCE:
 * - Privacy: Granular consent scopes with audit trail
 * - Age verification gate (18+ years, per ToS §4 / Privacy Policy §8)
 * - CCPA/VCDPA: Opt-out defaults, export capability
 * - GDPR Art. 9(2)(a): Explicit consent for mental-health data processing
 * - Dark pattern prevention: No pre-checked boxes
 *
 * NON-NEGOTIABLE:
 * - Crisis button access NEVER gated by consent
 * - All non-essential consents default to false (opt-out)
 * - Consent changes take effect immediately
 */

import { create } from 'zustand';
import { generateRandomString } from '@/core/utils/id';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import { getCurrentUserId } from '@/core/constants/devMode';

// Storage keys
const CONSENT_SECURE_KEY = 'consent_record_v1';
const CONSENT_CACHE_KEY = 'consent_cache_v1';
const AGE_VERIFICATION_KEY = 'age_verification_v1';
/** Legacy SecureStore key — left in place for the read-old/write-new migration. */
const LEGACY_CONSENT_HISTORY_KEY = 'consent_history_v1';
/**
 * Logical blob name passed to SecureStorageService.storeWellnessBlob. The
 * service maps this to its WELLNESS_ASYNC_PREFIX in AsyncStorage. AES-256-GCM
 * ciphertext only — master key remains in platform Keychain.
 */
const CONSENT_HISTORY_BLOB_KEY = 'consent_history_v1';
/** Per-keystore-migration idempotency flag, separate from EncryptionService's. */
const CONSENT_HISTORY_MIGRATION_FLAG = 'being.consent_history_migration_v2';
const LEGAL_GATE_CONSENTS_KEY = 'legal_gate_consents_v1';

/**
 * Legal-gate consents captured on CombinedLegalGateScreen — persisted between
 * the legal-gate step and the granular-preferences step in OnboardingScreen,
 * where the full ConsentRecord is granted.
 *
 * `mentalHealthProcessingConsent` is the GDPR Art. 9(2)(a) explicit consent
 * for processing wellness data (mood check-ins, anxiety/depression
 * self-screening responses, journal entries).
 */
export interface LegalGateConsents {
  tosAccepted: boolean;
  privacyAccepted: boolean;
  wellnessDisclaimerAcknowledged: boolean;
  mentalHealthProcessingConsent: boolean;
  /** Timestamp of acceptance (GDPR Art. 7(1) consent record) */
  timestamp: number;
  /** Policy version at acceptance time (for re-consent on policy changes) */
  version: string;
}

export const recordLegalGateConsents = async (
  consents: Omit<LegalGateConsents, 'timestamp' | 'version'>,
): Promise<void> => {
  const record: LegalGateConsents = {
    ...consents,
    timestamp: Date.now(),
    version: CONSENT_VERSION,
  };
  await SecureStore.setItemAsync(LEGAL_GATE_CONSENTS_KEY, JSON.stringify(record));
};

export const getLegalGateConsents = async (): Promise<LegalGateConsents | null> => {
  try {
    const stored = await SecureStore.getItemAsync(LEGAL_GATE_CONSENTS_KEY);
    return stored ? (JSON.parse(stored) as LegalGateConsents) : null;
  } catch {
    return null;
  }
};

/**
 * Consent categories (FEAT-90 requirements)
 * All default to false (opt-out, privacy-first)
 */
export interface ConsentPreferences {
  /** Anonymous usage analytics (default: false) */
  analyticsEnabled: boolean;
  /** Automatic crash reporting (default: false) */
  crashReportsEnabled: boolean;
  /** Cloud backup and sync (default: false) */
  cloudSyncEnabled: boolean;
  /** Research participation (default: false) */
  researchEnabled: boolean;
  /**
   * Explicit consent for processing personal wellness data (mood check-ins,
   * anxiety/depression self-screening responses, journal entries) for
   * wellness support features. Required under GDPR Art. 9(2)(a) for the
   * special category of "data concerning health." Must be ticked separately —
   * bundled consent does not satisfy "explicit."
   */
  mentalHealthProcessingConsent: boolean;
}

/**
 * Age verification data (18+ gate per ToS §4 / Privacy Policy §8)
 */
export interface AgeVerification {
  /** Whether age has been verified */
  verified: boolean;
  /** Birth year (not full DOB for privacy) */
  birthYear?: number;
  /** Calculated age at verification */
  ageAtVerification?: number;
  /** Timestamp of verification */
  verifiedAt?: number;
  /** Whether user is eligible (18+) */
  isEligible?: boolean;
}

/**
 * Full consent record (stored securely)
 */
export interface ConsentRecord {
  /** Unique consent ID */
  consentId: string;
  /** User ID */
  userId: string;
  /** Consent version (for re-consent on policy changes) */
  version: string;
  /** User's consent preferences */
  preferences: ConsentPreferences;
  /**
   * Universal opt-out signal (INFRA-151) — GPC-equivalent. When `true`,
   * overrides all non-essential preferences (analytics, crash reports,
   * cloud sync, research) and short-circuits `canPerformOperation` for
   * those categories. Mental-health processing consent is unaffected
   * (governed separately by GDPR Art. 9(2)(a)). Honored under CCPA,
   * TDPSA, CPA, CTDPA; VCDPA does not mandate a universal opt-out signal.
   */
  universalOptOut: boolean;
  /** Age verification data */
  ageVerification: AgeVerification;
  /** Timestamp of consent */
  timestamp: number;
  /** Timestamp of last update */
  updatedAt: number;
  /** Expiry timestamp (optional, for annual renewal) */
  expiresAt?: number;
  /** Whether consent has been revoked */
  revoked: boolean;
  /** Revocation timestamp */
  revokedAt?: number;
  /** Revocation reason */
  revocationReason?: string;
}

/**
 * Consent history entry (for audit trail)
 */
export interface ConsentHistoryEntry {
  /** Previous consent record hash (tamper detection) */
  previousHash?: string;
  /** Action taken */
  action: 'granted' | 'updated' | 'revoked' | 'renewed';
  /** What changed */
  changes: Partial<ConsentPreferences>;
  /** Timestamp */
  timestamp: number;
  /**
   * Optional note documenting non-user actions on the audit chain
   * (e.g., the INFRA-144 storage-substrate migration). Lets the audit
   * chain stay unbroken across maintenance events without inventing
   * new action types.
   */
  note?: string;
}

/**
 * Consent store state
 */
export interface ConsentStore {
  // State
  currentConsent: ConsentRecord | null;
  /**
   * The parsed-but-unusable consent record from a `version_mismatch` load
   * (FEAT-316 slice A). That branch nulls `currentConsent`, which destroys the
   * record FEAT-332's delta screen needs to compute "what changed" and to check
   * 18+ eligibility. Retained here purely as data for that later screen.
   *
   * 🚫 NEVER read this to widen permission. It is deliberately not consulted by
   * `canPerformOperation`, `hasValidConsent`, `isAgeVerified`, or the cache
   * builder, and is test-pinned inert. A stale record can be fully opted-in; if
   * any of those started reading it, a user whose consent lapsed would silently
   * regain processing they never re-authorized.
   *
   * Null on every other outcome. Deliberately NOT set on `expired` — that
   * branch retains `currentConsent`, so duplicating the record here would
   * create two sources of truth. FEAT-332 reads `staleConsent ?? currentConsent`.
   */
  staleConsent: ConsentRecord | null;
  consentHistory: ConsentHistoryEntry[];
  /**
   * FEAT-316 slice A split the former catch-all `'invalid'` into three causes.
   * Six sites produced it — four collapsed conditions in `loadConsent`, its
   * catch block, and `revokeConsent` — which made a user who deliberately
   * withdrew consent (GDPR Art. 7(3)) indistinguishable from one holding a
   * stale policy version. FEAT-332 mounts a re-consent prompt on that
   * distinction; without the split it would nag the withdrawn user.
   *
   * Re-consent is permitted for `version_mismatch` and `expired` ONLY, and must
   * be expressed as an allowlist — never "everything except revoked" — so that
   * adding a status here later cannot silently re-enable nagging.
   */
  consentStatus:
    | 'loading'
    | 'valid'
    /** Stored record predates the current CONSENT_VERSION. Re-consent eligible. */
    | 'version_mismatch'
    /** Record unreadable or missing identifiers. NEVER re-consent eligible. */
    | 'integrity_error'
    /** User deliberately withdrew (Art. 7(3)). NEVER re-consent eligible. */
    | 'revoked'
    | 'expired'
    | 'missing'
    | 'under_age';
  isLoading: boolean;
  error: string | null;

  // Cached for fast validation (<5ms)
  consentCache: {
    canCollectAnalytics: boolean;
    canCollectCrashReports: boolean;
    canSyncToCloud: boolean;
    canParticipateInResearch: boolean;
    canProcessMentalHealthData: boolean;
    /** Mirror of ConsentRecord.universalOptOut for <5ms hot-path reads (INFRA-151) */
    honorUniversalOptOut: boolean;
    ageVerified: boolean;
    isEligible: boolean;
    cacheTimestamp: number;
  };

  // Actions
  loadConsent: () => Promise<ConsentRecord | null>;
  grantConsent: (preferences: ConsentPreferences, ageVerification: AgeVerification) => Promise<void>;
  updateConsent: (preferences: Partial<ConsentPreferences>) => Promise<void>;
  revokeConsent: (reason?: string) => Promise<void>;
  /**
   * Set the universal opt-out flag (INFRA-151). When `true`, blocks all
   * non-essential operations (analytics, crash reports, cloud sync, research)
   * regardless of granular consent. Persists to SecureStore + appends a
   * `ConsentHistoryEntry` for audit trail (GDPR Art. 7).
   */
  setUniversalOptOut: (value: boolean) => Promise<void>;
  verifyAge: (birthYear: number) => Promise<{ eligible: boolean; age: number }>;
  getStoredAgeVerification: () => Promise<AgeVerification | null>;

  // Fast validation (uses cache, <5ms)
  canPerformOperation: (
    operation: 'analytics' | 'crash_reports' | 'cloud_sync' | 'research' | 'mental_health_processing',
  ) => boolean;
  hasValidConsent: () => boolean;
  isAgeVerified: () => boolean;

  // Export (CCPA compliance)
  exportConsentRecords: () => Promise<{
    currentConsent: ConsentRecord | null;
    history: ConsentHistoryEntry[];
    exportedAt: number;
  }>;

  /**
   * Write a minimized terminal audit attestation of an account-deletion request
   * to the plaintext `consent_history_v1` SecureStore key (FEAT-267). That key
   * is in ERASURE_EXCLUDED_SECURE_STORE_KEYS (survives clearAllWellnessData) and
   * is NOT master-key encrypted (survives deleteMasterKey:true), so it remains
   * readable as GDPR Art. 17(3)(b) demonstrability evidence after erasure. Only
   * the attestation (timestamp, action, prior-entry count, final consent
   * snapshot) is retained — not the full mutable history (Art. 5(1)(e)
   * minimization). Called by AccountDeletionService before the on-device wipe.
   */
  recordAccountDeletionAttestation: () => Promise<void>;

  // Reset (for testing/development)
  resetConsent: () => Promise<void>;
}

/**
 * Default consent preferences (all opt-out)
 */
const DEFAULT_PREFERENCES: ConsentPreferences = {
  analyticsEnabled: false,
  crashReportsEnabled: false,
  cloudSyncEnabled: false,
  researchEnabled: false,
  mentalHealthProcessingConsent: false,
};

/**
 * Default consent cache (all blocked)
 */
const DEFAULT_CACHE = {
  canCollectAnalytics: false,
  canCollectCrashReports: false,
  canSyncToCloud: false,
  canParticipateInResearch: false,
  canProcessMentalHealthData: false,
  honorUniversalOptOut: false,
  ageVerified: false,
  isEligible: false,
  cacheTimestamp: 0,
};

/**
 * Current consent version (update when policy changes).
 *
 * Exported (FEAT-316 slice A) so the version-keyed changelog map FEAT-332 adds
 * can live beside it — a bump and its user-facing "what changed" explanation
 * must not be able to drift apart.
 *
 * 🔴 DO NOT BUMP until the full re-consent flow (FEAT-332) has landed. This was
 * already bumped once (1.0.0 → 1.1.0, DEBUG-150 `c96ab71e`) explicitly to force
 * a re-grant, with no re-grant path ever built. Bumping again strips consent
 * from every onboarded install with no recovery: CleanRootNavigator routes on
 * `onboardingCompleted` first so they still reach Main, loadConsent nulls
 * currentConsent, and the only production re-grant surface (PrivacyDataScreen →
 * updateConsent) early-returns "No existing consent to update".
 */
export const CONSENT_VERSION = '1.1.0';

/**
 * A consent-material change, named as a preference field.
 *
 * `ageGate` is synthetic — eligibility lives on AgeVerification, not
 * ConsentPreferences — but an age-threshold change is consent-material and
 * needs a machine-readable name.
 *
 * ⚠️ DELIBERATELY NOT EXHAUSTIVE. This can only name changes expressible as a
 * ConsentPreferences field. DEBUG-150 also split the bundled legal-gate
 * checkbox into four, but `tosAccepted` / `privacyAccepted` /
 * `wellnessDisclaimerAcknowledged` live on LegalGateConsents (:56-65), a
 * different interface — so that change, which is what makes consent
 * "explicit" under GDPR Art. 9(2)(a), is carried by `summary` alone. Read
 * `changedKeys` as "which preference toggles changed", never as the complete
 * delta.
 *
 * Populate it by hand beside the summary. Never derive it from a schema diff:
 * a differ finds `mentalHealthProcessingConsent` but has no way to know
 * `ageGate` matters, since it is not a ConsentPreferences field at all.
 */
export type ConsentChangedKey = keyof ConsentPreferences | 'ageGate';

/** One policy version's user-facing explanation of what changed. */
export interface ConsentChangelogEntry {
  /**
   * Plain-language, neutral description (GDPR Art. 7(2) "clear and plain
   * language"). States what changed about our practices — never what happens
   * if the user does not re-consent, since the lapse-window characterisation
   * is a separate open counsel decision.
   */
  summary: string;
  changedKeys: ConsentChangedKey[];
}

/**
 * Shown when we cannot compute a real delta. Truthful about the fact of change
 * while claiming nothing about its content.
 */
export const GENERIC_CONSENT_CHANGE_SUMMARY =
  'Our privacy practices have changed since you last gave consent.';

/**
 * Version-keyed changelog, keyed by the version that INTRODUCED the change.
 *
 * `satisfies` rather than a `Record<string, …>` annotation is load-bearing: it
 * validates each entry's shape while preserving the literal key type, so
 * `keyof typeof CONSENT_CHANGELOG` stays `'1.1.0'` rather than widening to
 * `string`. The pin below depends on that.
 */
export const CONSENT_CHANGELOG = {
  /** DEBUG-150 (`c96ab71e`, 2026-05-24) — 1.0.0 → 1.1.0. */
  '1.1.0': {
    summary:
      'We raised the minimum age to use Being to 18, and we now ask for your ' +
      'separate, explicit consent before processing wellness data such as mood ' +
      'check-ins, screening responses, and journal entries.',
    changedKeys: ['ageGate', 'mentalHealthProcessingConsent'],
  },
} satisfies Record<string, ConsentChangelogEntry>;

/**
 * Source-level pin: a CONSENT_VERSION bump without its user-facing
 * explanation fails `npm run typecheck` (precommit step 1, and a CI gate).
 *
 * This is the type-level half; `consentChangelog.privacy.test.ts` asserts the
 * same property at runtime. Both are needed — tsconfig excludes test files and
 * jest transforms via babel, so a type assertion written in a test file would
 * gate nothing.
 */
// Underscore prefix satisfies eslint's varsIgnorePattern (eslint.config.js:34).
const _consentChangelogCoversCurrentVersion: keyof typeof CONSENT_CHANGELOG =
  CONSENT_VERSION;

interface ParsedConsentVersion {
  major: number;
  minor: number;
  patch: number;
}

/** Strict three-number semver. No pre-release, no build metadata, no `v` prefix. */
const parseConsentVersion = (version: string): ParsedConsentVersion | null => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return null;
  // Destructured with defaults rather than indexed: noUncheckedIndexedAccess
  // types match[n] as possibly undefined.
  const [, major = '0', minor = '0', patch = '0'] = match;
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
};

/**
 * Numeric semver ordering. Negative if `a < b`, positive if `a > b`, 0 if equal.
 *
 * Deliberately hand-rolled — a dependency for fifteen lines is not worth the
 * supply-chain surface on the consent path.
 *
 * Unparseable input compares as 0. Callers here guard first, and the effect on
 * the range filter is fail-closed: an unparseable changelog key is excluded
 * from the delta rather than fabricating one. A test pins that every key
 * parses, so that path is unreachable in practice.
 */
export const compareConsentVersions = (a: string, b: string): number => {
  const left = parseConsentVersion(a);
  const right = parseConsentVersion(b);
  if (!left || !right) return 0;
  return (
    left.major - right.major || left.minor - right.minor || left.patch - right.patch
  );
};

/** One version's contribution to a delta. */
export interface ConsentVersionChange {
  version: string;
  summary: string;
}

export interface ConsentDelta {
  fromVersion: string;
  toVersion: string;
  /** Ascending by version. Presentation (joining, truncating) is the screen's job. */
  changes: ConsentVersionChange[];
  /** Deduped union across `changes`. Empty when the delta is unknown. */
  changedKeys: ConsentChangedKey[];
  /**
   * Whether we could actually compute the delta.
   *
   * Discrete rather than inferable from `changes.length`, because the two
   * empty-ish states are opposites and must never be conflated:
   *   stored === current  → known, ZERO changes      (the `expired` path)
   *   unparseable/rollback → unknown, ONE generic change
   */
  isKnownVersion: boolean;
}

/**
 * Pure core, with the changelog injected so the union/dedup/ordering logic is
 * provable against more than one entry — today the real map has exactly one,
 * which would make those properties true by construction rather than by code.
 */
export const computeConsentDelta = (
  changelog: Record<string, ConsentChangelogEntry>,
  storedVersion: string,
  currentVersion: string,
): ConsentDelta => {
  // Fail open on prompting, closed on content: the caller still gets a
  // renewable result, but never a fabricated delta.
  const unknown = (): ConsentDelta => ({
    fromVersion: storedVersion,
    toVersion: currentVersion,
    changes: [{ version: currentVersion, summary: GENERIC_CONSENT_CHANGE_SUMMARY }],
    changedKeys: [],
    isKnownVersion: false,
  });

  if (!parseConsentVersion(storedVersion)) return unknown();
  // Stored is NEWER than this build knows about — a downgrade, or a reverted
  // release. Synthesising a delta here could describe unreleased policy.
  if (compareConsentVersions(storedVersion, currentVersion) > 0) return unknown();

  // Half-open range: stored < v <= current. A user already on v must not be
  // re-shown v's own entry.
  const applicable = Object.keys(changelog)
    .filter(
      (version) =>
        compareConsentVersions(storedVersion, version) < 0 &&
        compareConsentVersions(version, currentVersion) <= 0,
    )
    .sort(compareConsentVersions);

  const changes: ConsentVersionChange[] = [];
  const changedKeys: ConsentChangedKey[] = [];
  for (const version of applicable) {
    const entry = changelog[version];
    if (!entry) continue;
    changes.push({ version, summary: entry.summary });
    for (const key of entry.changedKeys) {
      if (!changedKeys.includes(key)) changedKeys.push(key);
    }
  }

  return {
    fromVersion: storedVersion,
    toVersion: currentVersion,
    changes,
    changedKeys,
    isKnownVersion: true,
  };
};

/**
 * What changed in our privacy practices since `storedVersion`.
 *
 * Read-only: computes, never gates. `canPerformOperation` remains the sole
 * authority on what a given consent state permits.
 */
export const getConsentDeltaSince = (storedVersion: string): ConsentDelta =>
  computeConsentDelta(CONSENT_CHANGELOG, storedVersion, CONSENT_VERSION);

/**
 * Generate unique consent ID
 */
const generateConsentId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = generateRandomString(6);
  return `consent_${timestamp}_${randomPart}`;
};

/**
 * Calculate age from birth year
 */
const calculateAge = (birthYear: number): number => {
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
};

/**
 * Persist consent history via SecureStorageService hybrid path (INFRA-144).
 * AES-256-GCM ciphertext in AsyncStorage; master key in platform Keychain.
 */
async function persistConsentHistory(history: ConsentHistoryEntry[]): Promise<void> {
  const result = await SecureStorageService.storeWellnessBlob(
    CONSENT_HISTORY_BLOB_KEY,
    history,
    'level_2_assessment_data'
  );
  if (!result.success) {
    throw new Error(`Failed to persist consent history: ${result.error ?? 'unknown'}`);
  }
}

/**
 * Load consent history with one-time legacy migration. On first read after
 * INFRA-144 ships: if `consent_history_v1` exists in SecureStore but not in
 * AsyncStorage, the underlying SecureStorageService moves the ciphertext to
 * AsyncStorage and deletes the SecureStore copy. We then append a single
 * `note`-annotated `ConsentHistoryEntry` so the audit chain documents the
 * substrate transition (compliance requirement, INFRA-144 sign-off).
 *
 * Idempotency: a separate flag (`being.consent_history_migration_v2`) ensures
 * the migration audit entry is appended exactly once across reruns.
 */
async function loadConsentHistoryWithMigration(): Promise<ConsentHistoryEntry[]> {
  const migrationFlag = await AsyncStorage.getItem(CONSENT_HISTORY_MIGRATION_FLAG);
  const isFirstRun = migrationFlag !== '1';

  const history = await SecureStorageService.retrieveWellnessBlob<ConsentHistoryEntry[]>(
    CONSENT_HISTORY_BLOB_KEY,
    LEGACY_CONSENT_HISTORY_KEY,
    { legacyFormat: 'plaintext_json', sensitivityLevel: 'level_2_assessment_data' }
  );

  if (!isFirstRun || !history || history.length === 0) {
    // No legacy data to annotate, or migration audit entry already appended.
    if (isFirstRun) {
      await AsyncStorage.setItem(CONSENT_HISTORY_MIGRATION_FLAG, '1');
    }
    return history ?? [];
  }

  // Append migration audit entry (only on the run that actually migrated data).
  const migrationEntry: ConsentHistoryEntry = {
    action: 'updated',
    changes: {},
    timestamp: Date.now(),
    note: 'storage_migration_v2: ciphertext moved to AsyncStorage, encryption boundary preserved',
  };
  const annotated = [...history, migrationEntry];
  await persistConsentHistory(annotated);
  await AsyncStorage.setItem(CONSENT_HISTORY_MIGRATION_FLAG, '1');
  return annotated;
}

/**
 * Consent Zustand Store
 */
/**
 * Drop the persisted `consent_cache_v1` blob whenever consent resolves to
 * anything other than valid (FEAT-316 slice A).
 *
 * Scope note: this blob is write-only repo-wide — four writers, zero readers —
 * so a leftover permissive copy is NOT a live consent bypass today. This is
 * data hygiene against the day something starts reading it back, not a security
 * fix, and should not be described as one.
 *
 * Never throws: a storage failure here must not turn a recoverable stale-consent
 * load into an integrity error.
 */
async function clearPersistedConsentCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CONSENT_CACHE_KEY);
  } catch (error) {
    console.error('[Consent] Failed to clear persisted consent cache', error);
  }
}

export const useConsentStore = create<ConsentStore>((set, get) => ({
  currentConsent: null,
  staleConsent: null,
  consentHistory: [],
  consentStatus: 'loading',
  isLoading: false,
  error: null,
  consentCache: DEFAULT_CACHE,

  /**
   * Load consent from SecureStore
   */
  loadConsent: async () => {
    set({ isLoading: true, error: null });

    try {
      // Load consent record from SecureStore
      const storedConsent = await SecureStore.getItemAsync(CONSENT_SECURE_KEY);

      if (!storedConsent) {
        // No consent found - fail-safe: block access
        await clearPersistedConsentCache();
        set({
          currentConsent: null,
          staleConsent: null,
          consentStatus: 'missing',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return null;
      }

      const parsed = JSON.parse(storedConsent) as ConsentRecord;
      // INFRA-151: additive `universalOptOut` field — pre-v1.2 records lack it.
      // Defaulting to false here avoids forcing a re-grant for an opt-IN flag.
      const consent: ConsentRecord = {
        ...parsed,
        universalOptOut: parsed.universalOptOut ?? false,
      };

      // Validate consent integrity (FEAT-316 slice A).
      //
      // ⚠️ THE ORDER OF THESE THREE CHECKS IS SAFETY-CRITICAL — do not reorder.
      // The conditions overlap: a user who withdrew consent while on policy
      // 1.0.0 satisfies BOTH `revoked` and `version !== CONSENT_VERSION`. Test
      // `version` first and they resolve to 'version_mismatch', and FEAT-332's
      // re-consent screen re-prompts someone who deliberately said no — a GDPR
      // Art. 7(3) violation and a regression that does not exist today.
      //
      //   1. integrity — an unparseable/identifier-less record cannot be trusted
      //      to report its own `revoked` or `version` fields either.
      //   2. revoked   — a deliberate withdrawal. Terminal; never re-prompted.
      //   3. version   — the only re-consent-eligible outcome of the three.
      if (!consent.consentId || !consent.userId) {
        await clearPersistedConsentCache();
        set({
          currentConsent: null,
          staleConsent: null,
          consentStatus: 'integrity_error',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return null;
      }

      if (consent.revoked) {
        await clearPersistedConsentCache();
        set({
          currentConsent: null,
          staleConsent: null,
          consentStatus: 'revoked',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return null;
      }

      // version !== CONSENT_VERSION forces re-grant when the policy shape changes
      // (e.g., DEBUG-150 added Art. 9 explicit consent at version 1.1.0).
      if (consent.version !== CONSENT_VERSION) {
        await clearPersistedConsentCache();
        set({
          currentConsent: null,
          // Retained as inert data for FEAT-332's delta screen only. Note this
          // branch runs BEFORE the age check below, so an ineligible user never
          // reaches 'under_age' — the eligibility flag on this record is the
          // only thing standing between FEAT-332 and re-consenting a minor.
          staleConsent: consent,
          consentStatus: 'version_mismatch',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return null;
      }

      // Check age eligibility
      if (!consent.ageVerification.isEligible) {
        await clearPersistedConsentCache();
        set({
          currentConsent: consent,
          staleConsent: null,
          consentStatus: 'under_age',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return consent;
      }

      // Check expiry (if set). Unlike version_mismatch this retains
      // currentConsent, so staleConsent stays null — see its doc comment.
      if (consent.expiresAt && consent.expiresAt < Date.now()) {
        await clearPersistedConsentCache();
        set({
          currentConsent: consent,
          staleConsent: null,
          consentStatus: 'expired',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return consent;
      }

      // Load consent history via hybrid path (AES-256-GCM ciphertext in
      // AsyncStorage; master key in Keychain). Legacy SecureStore key is
      // migrated on first read. INFRA-144.
      const history = await loadConsentHistoryWithMigration();

      // Update cache for fast validation. INFRA-151: when universalOptOut is
      // active, force the analytics/tracking cache fields to false so direct
      // reads stay consistent without round-tripping through canPerformOperation.
      const optOut = consent.universalOptOut;
      const cache = {
        canCollectAnalytics: optOut ? false : consent.preferences.analyticsEnabled,
        canCollectCrashReports: optOut ? false : consent.preferences.crashReportsEnabled,
        canSyncToCloud: optOut ? false : consent.preferences.cloudSyncEnabled,
        canParticipateInResearch: optOut ? false : consent.preferences.researchEnabled,
        canProcessMentalHealthData: consent.preferences.mentalHealthProcessingConsent ?? false,
        honorUniversalOptOut: optOut,
        ageVerified: consent.ageVerification.verified,
        isEligible: consent.ageVerification.isEligible ?? false,
        cacheTimestamp: Date.now(),
      };

      // Cache preferences in AsyncStorage for fast access
      await AsyncStorage.setItem(CONSENT_CACHE_KEY, JSON.stringify(cache));

      set({
        currentConsent: consent,
        staleConsent: null,
        consentHistory: history,
        consentStatus: 'valid',
        consentCache: cache,
        isLoading: false,
      });

      return consent;
    } catch (error) {
      console.error('[Consent] Failed to load consent', error);
      await clearPersistedConsentCache();
      set({
        error: 'Failed to load consent',
        // A thrown load says nothing about WHY the record is unusable, so it
        // must never be re-consent eligible — fabricating a fromVersion →
        // toVersion audit entry off an unread record is worse than not
        // prompting. Also nulls currentConsent: this branch previously left a
        // prior in-memory record standing beside a non-valid status.
        currentConsent: null,
        staleConsent: null,
        consentStatus: 'integrity_error',
        consentCache: DEFAULT_CACHE,
        isLoading: false,
      });
      return null;
    }
  },

  /**
   * Grant consent (initial consent collection)
   */
  grantConsent: async (preferences: ConsentPreferences, ageVerification: AgeVerification) => {
    set({ isLoading: true, error: null });

    try {
      const userId = getCurrentUserId();
      const now = Date.now();
      const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);

      const consent: ConsentRecord = {
        consentId: generateConsentId(),
        userId,
        version: CONSENT_VERSION,
        preferences,
        // INFRA-151: New users default to no universal opt-out — they must
        // explicitly enable it via Settings → Privacy & Data.
        universalOptOut: false,
        ageVerification,
        timestamp: now,
        updatedAt: now,
        expiresAt: oneYearFromNow,
        revoked: false,
      };

      // Store consent in SecureStore
      await SecureStore.setItemAsync(CONSENT_SECURE_KEY, JSON.stringify(consent));

      // Add to history
      const historyEntry: ConsentHistoryEntry = {
        action: 'granted',
        changes: preferences,
        timestamp: now,
      };

      // Persist history via hybrid path (encrypted AsyncStorage). INFRA-144.
      const updatedHistory = [historyEntry];
      await persistConsentHistory(updatedHistory);

      // Update cache
      const cache = {
        canCollectAnalytics: preferences.analyticsEnabled,
        canCollectCrashReports: preferences.crashReportsEnabled,
        canSyncToCloud: preferences.cloudSyncEnabled,
        canParticipateInResearch: preferences.researchEnabled,
        canProcessMentalHealthData: preferences.mentalHealthProcessingConsent,
        honorUniversalOptOut: false,
        ageVerified: ageVerification.verified,
        isEligible: ageVerification.isEligible ?? false,
        cacheTimestamp: now,
      };

      await AsyncStorage.setItem(CONSENT_CACHE_KEY, JSON.stringify(cache));

      set({
        currentConsent: consent,
        // A fresh grant supersedes whatever stale record prompted it.
        staleConsent: null,
        consentHistory: updatedHistory,
        consentStatus: ageVerification.isEligible ? 'valid' : 'under_age',
        consentCache: cache,
        isLoading: false,
      });

      if (__DEV__) {
        console.log('[Consent] Consent granted:', consent.consentId);
      }
    } catch (error) {
      console.error('[Consent] Failed to grant consent', error);
      set({
        error: 'Failed to save consent',
        isLoading: false,
      });
    }
  },

  /**
   * Update consent preferences
   */
  updateConsent: async (updates: Partial<ConsentPreferences>) => {
    const { currentConsent, consentHistory } = get();
    if (!currentConsent) {
      set({ error: 'No existing consent to update' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const now = Date.now();
      const updatedPreferences = {
        ...currentConsent.preferences,
        ...updates,
      };

      const updatedConsent: ConsentRecord = {
        ...currentConsent,
        preferences: updatedPreferences,
        updatedAt: now,
      };

      // Store updated consent
      await SecureStore.setItemAsync(CONSENT_SECURE_KEY, JSON.stringify(updatedConsent));

      // Add to history
      const historyEntry: ConsentHistoryEntry = {
        action: 'updated',
        changes: updates,
        timestamp: now,
      };

      // Persist history via hybrid path (encrypted AsyncStorage). INFRA-144.
      const updatedHistory = [...consentHistory, historyEntry];
      await persistConsentHistory(updatedHistory);

      // Update cache. INFRA-151: respect existing universal opt-out — if active,
      // analytics/tracking fields stay false even when granular prefs are toggled.
      const optOut = currentConsent.universalOptOut;
      const cache = {
        canCollectAnalytics: optOut ? false : updatedPreferences.analyticsEnabled,
        canCollectCrashReports: optOut ? false : updatedPreferences.crashReportsEnabled,
        canSyncToCloud: optOut ? false : updatedPreferences.cloudSyncEnabled,
        canParticipateInResearch: optOut ? false : updatedPreferences.researchEnabled,
        canProcessMentalHealthData: updatedPreferences.mentalHealthProcessingConsent,
        honorUniversalOptOut: optOut,
        ageVerified: updatedConsent.ageVerification.verified,
        isEligible: updatedConsent.ageVerification.isEligible ?? false,
        cacheTimestamp: now,
      };

      await AsyncStorage.setItem(CONSENT_CACHE_KEY, JSON.stringify(cache));

      set({
        currentConsent: updatedConsent,
        consentHistory: updatedHistory,
        consentCache: cache,
        isLoading: false,
      });

      if (__DEV__) {
        console.log('[Consent] Consent updated:', Object.keys(updates).join(', '));
      }
    } catch (error) {
      console.error('[Consent] Failed to update consent', error);
      set({
        error: 'Failed to update consent',
        isLoading: false,
      });
    }
  },

  /**
   * Set universal opt-out flag (INFRA-151)
   *
   * Persists the new value, refreshes the consentCache (forcing
   * analytics/tracking cache fields to false when opt-out is on), and appends
   * a ConsentHistoryEntry for audit trail. The on-disk record is updated in
   * place — no version bump needed since `universalOptOut` is additive.
   */
  setUniversalOptOut: async (value: boolean) => {
    const { currentConsent, consentHistory } = get();
    if (!currentConsent) {
      set({ error: 'No existing consent to update' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const now = Date.now();
      const updatedConsent: ConsentRecord = {
        ...currentConsent,
        universalOptOut: value,
        updatedAt: now,
      };

      await SecureStore.setItemAsync(CONSENT_SECURE_KEY, JSON.stringify(updatedConsent));

      const historyEntry: ConsentHistoryEntry = {
        action: 'updated',
        // universalOptOut is a top-level field, not part of ConsentPreferences,
        // so `changes` stays empty — the action + timestamp record is enough
        // for the GDPR Art. 7 audit trail.
        changes: {},
        timestamp: now,
      };
      const updatedHistory = [...consentHistory, historyEntry];
      await persistConsentHistory(updatedHistory);

      const cache = {
        canCollectAnalytics: value ? false : updatedConsent.preferences.analyticsEnabled,
        canCollectCrashReports: value ? false : updatedConsent.preferences.crashReportsEnabled,
        canSyncToCloud: value ? false : updatedConsent.preferences.cloudSyncEnabled,
        canParticipateInResearch: value ? false : updatedConsent.preferences.researchEnabled,
        canProcessMentalHealthData: updatedConsent.preferences.mentalHealthProcessingConsent,
        honorUniversalOptOut: value,
        ageVerified: updatedConsent.ageVerification.verified,
        isEligible: updatedConsent.ageVerification.isEligible ?? false,
        cacheTimestamp: now,
      };
      await AsyncStorage.setItem(CONSENT_CACHE_KEY, JSON.stringify(cache));

      set({
        currentConsent: updatedConsent,
        consentHistory: updatedHistory,
        consentCache: cache,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Consent] Failed to set universal opt-out', error);
      set({
        error: 'Failed to update universal opt-out',
        isLoading: false,
      });
    }
  },

  /**
   * Revoke consent
   */
  revokeConsent: async (reason?: string) => {
    const { currentConsent, consentHistory } = get();
    if (!currentConsent) {
      set({ error: 'No consent to revoke' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const now = Date.now();
      const revokedConsent: ConsentRecord = {
        ...currentConsent,
        revoked: true,
        revokedAt: now,
        ...(reason ? { revocationReason: reason } : {}),
        updatedAt: now,
      };

      // Store revoked consent
      await SecureStore.setItemAsync(CONSENT_SECURE_KEY, JSON.stringify(revokedConsent));

      // Add to history
      const historyEntry: ConsentHistoryEntry = {
        action: 'revoked',
        changes: {},
        timestamp: now,
      };

      // Persist history via hybrid path (encrypted AsyncStorage). INFRA-144.
      const updatedHistory = [...consentHistory, historyEntry];
      await persistConsentHistory(updatedHistory);

      // Clear cache
      await AsyncStorage.removeItem(CONSENT_CACHE_KEY);

      set({
        currentConsent: revokedConsent,
        // FEAT-316 slice A: the sixth site that used to produce 'invalid', and
        // the only one representing a deliberate Art. 7(3) withdrawal. Leaving
        // it collapsed would have defeated the whole split — the in-memory
        // status after a revoke is exactly what a re-consent trigger reads.
        staleConsent: null,
        consentStatus: 'revoked',
        consentHistory: updatedHistory,
        consentCache: DEFAULT_CACHE,
        isLoading: false,
      });

      if (__DEV__) {
        console.log('[Consent] Consent revoked');
      }
    } catch (error) {
      console.error('[Consent] Failed to revoke consent', error);
      set({
        error: 'Failed to revoke consent',
        isLoading: false,
      });
    }
  },

  /**
   * Record a terminal account-deletion attestation (FEAT-267). See interface
   * doc. Written as plaintext JSON to the legacy consent_history_v1 SecureStore
   * key — the pre-INFRA-144 substrate — chosen deliberately because it is
   * preserved by erasure AND independent of the master key (which the wipe
   * deletes). Minimized to a single attestation entry, not the full chain.
   */
  recordAccountDeletionAttestation: async () => {
    const { currentConsent, consentHistory } = get();
    const attestation: ConsentHistoryEntry = {
      action: 'revoked',
      // Final consent-state snapshot (booleans only — no wellness content):
      // proves the lawful basis that existed at the moment of erasure.
      changes: currentConsent?.preferences ?? {},
      timestamp: Date.now(),
      note: `account_deletion_requested; prior_entries=${consentHistory.length}`,
    };
    await SecureStore.setItemAsync(LEGACY_CONSENT_HISTORY_KEY, JSON.stringify([attestation]));
  },

  /**
   * Verify age (18+ gate per ToS §4 / Privacy Policy §8)
   * Validates birth year is within acceptable range before processing
   */
  verifyAge: async (birthYear: number) => {
    const currentYear = new Date().getFullYear();

    // Validate input - security requirement
    if (!Number.isInteger(birthYear)) {
      throw new Error('Birth year must be an integer');
    }
    if (birthYear < 1900 || birthYear > currentYear) {
      throw new Error(`Birth year must be between 1900 and ${currentYear}`);
    }

    const age = calculateAge(birthYear);
    const eligible = age >= 18;

    const verification: AgeVerification = {
      verified: true,
      birthYear,
      ageAtVerification: age,
      verifiedAt: Date.now(),
      isEligible: eligible,
    };

    // Store age verification separately (for pre-consent check)
    await SecureStore.setItemAsync(AGE_VERIFICATION_KEY, JSON.stringify(verification));

    return { eligible, age };
  },

  /**
   * Get stored age verification (for onboarding flow)
   */
  getStoredAgeVerification: async () => {
    try {
      const stored = await SecureStore.getItemAsync(AGE_VERIFICATION_KEY);
      if (stored) {
        return JSON.parse(stored) as AgeVerification;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Fast consent validation (uses cache, <5ms)
   *
   * INFRA-151: when `honorUniversalOptOut` is true, all non-essential
   * categories return false regardless of granular consent. Mental-health
   * processing is governed by GDPR Art. 9(2)(a) explicit consent and is
   * intentionally NOT short-circuited — universal opt-out targets analytics
   * and tracking, not the user's primary wellness data processing they
   * actively consented to during onboarding.
   */
  canPerformOperation: (operation) => {
    const { consentCache, consentStatus } = get();

    // Block if no valid consent (fail-safe)
    if (consentStatus !== 'valid') {
      return false;
    }

    if (operation === 'mental_health_processing') {
      return consentCache.canProcessMentalHealthData;
    }

    if (consentCache.honorUniversalOptOut) {
      return false;
    }

    switch (operation) {
      case 'analytics':
        return consentCache.canCollectAnalytics;
      case 'crash_reports':
        return consentCache.canCollectCrashReports;
      case 'cloud_sync':
        return consentCache.canSyncToCloud;
      case 'research':
        return consentCache.canParticipateInResearch;
      default:
        return false;
    }
  },

  /**
   * Check if user has valid consent
   */
  hasValidConsent: () => {
    const { consentStatus } = get();
    return consentStatus === 'valid';
  },

  /**
   * Check if age is verified
   */
  isAgeVerified: () => {
    const { consentCache } = get();
    return consentCache.ageVerified && consentCache.isEligible;
  },

  /**
   * Export consent records (CCPA compliance)
   */
  exportConsentRecords: async () => {
    const { currentConsent, consentHistory } = get();

    return {
      currentConsent,
      history: consentHistory,
      exportedAt: Date.now(),
    };
  },

  /**
   * Reset consent (for testing/development)
   */
  resetConsent: async () => {
    try {
      await SecureStore.deleteItemAsync(CONSENT_SECURE_KEY);
      await SecureStore.deleteItemAsync(AGE_VERIFICATION_KEY);
      await SecureStore.deleteItemAsync(LEGAL_GATE_CONSENTS_KEY);
      await AsyncStorage.removeItem(CONSENT_CACHE_KEY);
      // Hybrid storage cleanup (INFRA-144): remove encrypted history blob and
      // its legacy SecureStore copy + migration flag.
      await SecureStorageService.deleteWellnessBlob(
        CONSENT_HISTORY_BLOB_KEY,
        LEGACY_CONSENT_HISTORY_KEY
      );
      await AsyncStorage.removeItem(CONSENT_HISTORY_MIGRATION_FLAG);

      set({
        currentConsent: null,
        staleConsent: null,
        consentHistory: [],
        consentStatus: 'missing',
        consentCache: DEFAULT_CACHE,
        isLoading: false,
        error: null,
      });

      console.log('[Consent] Consent reset');
    } catch (error) {
      console.error('[Consent] Failed to reset consent', error);
    }
  },
}));

/**
 * Convenience hooks
 */
export const useConsentPreferences = () => useConsentStore((state) => state.currentConsent?.preferences);
export const useConsentStatus = () => useConsentStore((state) => state.consentStatus);
export const useAgeVerification = () => useConsentStore((state) => state.currentConsent?.ageVerification);

/**
 * CRITICAL: Crisis intervention is NEVER gated by consent
 * This function always returns true for emergency access
 */
export const canPerformCrisisIntervention = (): boolean => {
  // Emergency override - crisis access ALWAYS allowed
  // This is a Privacy vital interests exception
  return true;
};
