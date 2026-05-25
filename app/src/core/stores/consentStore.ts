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
  consentHistory: ConsentHistoryEntry[];
  consentStatus: 'loading' | 'valid' | 'invalid' | 'expired' | 'missing' | 'under_age';
  isLoading: boolean;
  error: string | null;

  // Cached for fast validation (<5ms)
  consentCache: {
    canCollectAnalytics: boolean;
    canCollectCrashReports: boolean;
    canSyncToCloud: boolean;
    canParticipateInResearch: boolean;
    canProcessMentalHealthData: boolean;
    ageVerified: boolean;
    isEligible: boolean;
    cacheTimestamp: number;
  };

  // Actions
  loadConsent: () => Promise<ConsentRecord | null>;
  grantConsent: (preferences: ConsentPreferences, ageVerification: AgeVerification) => Promise<void>;
  updateConsent: (preferences: Partial<ConsentPreferences>) => Promise<void>;
  revokeConsent: (reason?: string) => Promise<void>;
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
  ageVerified: false,
  isEligible: false,
  cacheTimestamp: 0,
};

/**
 * Current consent version (update when policy changes)
 */
const CONSENT_VERSION = '1.1.0';

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
export const useConsentStore = create<ConsentStore>((set, get) => ({
  currentConsent: null,
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
        set({
          currentConsent: null,
          consentStatus: 'missing',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return null;
      }

      const consent = JSON.parse(storedConsent) as ConsentRecord;

      // Validate consent integrity.
      // version !== CONSENT_VERSION forces re-grant when the policy shape changes
      // (e.g., DEBUG-150 added Art. 9 explicit consent at version 1.1.0).
      if (
        !consent.consentId ||
        !consent.userId ||
        consent.revoked ||
        consent.version !== CONSENT_VERSION
      ) {
        set({
          currentConsent: null,
          consentStatus: 'invalid',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return null;
      }

      // Check age eligibility
      if (!consent.ageVerification.isEligible) {
        set({
          currentConsent: consent,
          consentStatus: 'under_age',
          consentCache: DEFAULT_CACHE,
          isLoading: false,
        });
        return consent;
      }

      // Check expiry (if set)
      if (consent.expiresAt && consent.expiresAt < Date.now()) {
        set({
          currentConsent: consent,
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

      // Update cache for fast validation
      const cache = {
        canCollectAnalytics: consent.preferences.analyticsEnabled,
        canCollectCrashReports: consent.preferences.crashReportsEnabled,
        canSyncToCloud: consent.preferences.cloudSyncEnabled,
        canParticipateInResearch: consent.preferences.researchEnabled,
        canProcessMentalHealthData: consent.preferences.mentalHealthProcessingConsent ?? false,
        ageVerified: consent.ageVerification.verified,
        isEligible: consent.ageVerification.isEligible ?? false,
        cacheTimestamp: Date.now(),
      };

      // Cache preferences in AsyncStorage for fast access
      await AsyncStorage.setItem(CONSENT_CACHE_KEY, JSON.stringify(cache));

      set({
        currentConsent: consent,
        consentHistory: history,
        consentStatus: 'valid',
        consentCache: cache,
        isLoading: false,
      });

      return consent;
    } catch (error) {
      console.error('[Consent] Failed to load consent', error);
      set({
        error: 'Failed to load consent',
        consentStatus: 'invalid',
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
        ageVerified: ageVerification.verified,
        isEligible: ageVerification.isEligible ?? false,
        cacheTimestamp: now,
      };

      await AsyncStorage.setItem(CONSENT_CACHE_KEY, JSON.stringify(cache));

      set({
        currentConsent: consent,
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

      // Update cache
      const cache = {
        canCollectAnalytics: updatedPreferences.analyticsEnabled,
        canCollectCrashReports: updatedPreferences.crashReportsEnabled,
        canSyncToCloud: updatedPreferences.cloudSyncEnabled,
        canParticipateInResearch: updatedPreferences.researchEnabled,
        canProcessMentalHealthData: updatedPreferences.mentalHealthProcessingConsent,
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
        consentHistory: updatedHistory,
        consentStatus: 'invalid',
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
   */
  canPerformOperation: (operation) => {
    const { consentCache, consentStatus } = get();

    // Block if no valid consent (fail-safe)
    if (consentStatus !== 'valid') {
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
      case 'mental_health_processing':
        return consentCache.canProcessMentalHealthData;
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
