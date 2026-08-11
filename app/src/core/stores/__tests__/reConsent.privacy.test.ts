/**
 * Re-consent write-path regression tests (FEAT-399).
 *
 * Pins the two write actions carved out of FEAT-375 — `renewConsent` and
 * `declineReConsent` — plus the typed version fields on `ConsentHistoryEntry`.
 *
 * WHY THIS FILE AND NOT `consentStore.test.ts`: that suite is listed in
 * `app/scripts/ci-uncovered-tests.json` and matches no CI or precommit
 * `--testPathPattern`, so a regression test written there cannot fail a PR.
 * `*.privacy.test.ts` is picked up by `npm run test:privacy`
 * (`jest --testPathPattern=privacy`), which runs in precommit AND in the
 * `Safety + privacy gates` CI job inside `ci-pass`. Siting is the gate.
 *
 * Invariants under test:
 *   1. Re-consent is ALLOWLISTED to {version_mismatch, expired} — never a denylist.
 *   2. The encrypted GDPR Art. 7(1) audit chain survives a renewal (the highest
 *      severity trap: `loadConsent` returns before history loads in exactly the
 *      two states these actions run in, so the in-memory array is empty).
 *   3. 18+ eligibility is RE-DERIVED from `birthYear`, never trusted from the
 *      persisted `isEligible` flag — DEBUG-150 flipped the gate 13+ → 18+ in the
 *      same commit that bumped 1.0.0 → 1.1.0, so on a v1.0.0 record (the only
 *      cohort `version_mismatch` can serve) `isEligible: true` means "≥13".
 *   4. Renewed preferences come from the CALLER, never carried forward — a
 *      v1.0.0 record predates `mentalHealthProcessingConsent`, so carry-forward
 *      would fabricate GDPR Art. 9(2)(a) explicit consent.
 *   5. `universalOptOut` carries forward verbatim (GPC-equivalent; CCPA/CPRA,
 *      TDPSA and CPA all bar requiring a consumer to re-assert an opt-out).
 *   6. A decline writes NO consent record — the stored record stays stale so the
 *      user is re-prompted next launch.
 *   7. `renewConsent` never touches `legal_gate_consents_v1` — no UI displays
 *      those documents in this slice, so stamping it would fabricate an
 *      attestation, on a plaintext key that survives account erasure.
 */

// In-memory SecureStore + AsyncStorage mocks — harness copied from
// consentStore.test.ts:20-68. Do NOT copy the mock in
// consentChangelog.privacy.test.ts: it declares `getWellnessBlob` /
// `removeWellnessBlob`, which are not the real SecureStorageService method
// names (`retrieveWellnessBlob` / `deleteWellnessBlob`), and its
// `storeWellnessBlob` resolves `undefined` so `result.success` throws. Harmless
// there (pure functions only); here it would make every history assertion
// silently vacuous.
const mockSecureStore: Record<string, string> = {};
const mockAsyncStorage: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStore[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockSecureStore[key];
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockAsyncStorage[key];
    }),
  },
}));

jest.mock('@/core/constants/devMode', () => ({
  getCurrentUserId: () => 'test-user-id',
}));

const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = data;
      return {
        success: true,
        operationType: 'store',
        storageKey: `wellness_async_${key}`,
        operationTimeMs: 0,
        dataSize: 0,
      };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      delete mockWellnessBlobs[key];
    }),
  },
}));

import * as SecureStore from 'expo-secure-store';
import {
  useConsentStore,
  CONSENT_VERSION,
  RE_CONSENT_ELIGIBLE_STATUSES,
  isReConsentEligible,
  type ConsentPreferences,
  type ConsentRecord,
  type ConsentHistoryEntry,
  type ConsentStatus,
} from '../consentStore';

const CONSENT_SECURE_KEY = 'consent_record_v1';
const CONSENT_HISTORY_BLOB_KEY = 'consent_history_v1';
const CONSENT_HISTORY_MIGRATION_FLAG = 'being.consent_history_migration_v2';
const LEGAL_GATE_CONSENTS_KEY = 'legal_gate_consents_v1';

const CURRENT_YEAR = new Date().getFullYear();
/** Comfortably 18+ under `calculateAge` (currentYear - birthYear). */
const ADULT_BIRTH_YEAR = CURRENT_YEAR - 30;
/** 15 — eligible under the retired 13+ rule, ineligible under the shipped 18+ rule. */
const MINOR_BIRTH_YEAR = CURRENT_YEAR - 15;

const ALL_OPT_IN: ConsentPreferences = {
  analyticsEnabled: true,
  crashReportsEnabled: true,
  cloudSyncEnabled: true,
  researchEnabled: true,
  mentalHealthProcessingConsent: true,
};

const ALL_OPT_OUT: ConsentPreferences = {
  analyticsEnabled: false,
  crashReportsEnabled: false,
  cloudSyncEnabled: false,
  researchEnabled: false,
  mentalHealthProcessingConsent: false,
};

/**
 * Write a v1.0.0-shaped record straight to storage. Deliberately omits
 * `mentalHealthProcessingConsent` (DEBUG-150 added it AT 1.1.0) so the
 * carry-forward hazard is reachable.
 */
function seedStaleRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  const now = Date.now();
  const record = {
    consentId: 'consent_legacy_aaaaaa',
    userId: 'test-user-id',
    version: '1.0.0',
    preferences: {
      analyticsEnabled: true,
      crashReportsEnabled: false,
      cloudSyncEnabled: false,
      researchEnabled: false,
    } as unknown as ConsentPreferences,
    universalOptOut: false,
    ageVerification: {
      verified: true,
      birthYear: ADULT_BIRTH_YEAR,
      ageAtVerification: 30,
      verifiedAt: now - 1000,
      isEligible: true,
    },
    timestamp: now - 100_000,
    updatedAt: now - 100_000,
    expiresAt: now + 100_000,
    revoked: false,
    ...overrides,
  } as ConsentRecord;
  mockSecureStore[CONSENT_SECURE_KEY] = JSON.stringify(record);
  return record;
}

function resetAll(): void {
  for (const k of Object.keys(mockSecureStore)) delete mockSecureStore[k];
  for (const k of Object.keys(mockAsyncStorage)) delete mockAsyncStorage[k];
  for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];
  jest.clearAllMocks();
  // Skip the INFRA-144 one-time migration entry so history assertions read
  // only the entries these actions write.
  mockAsyncStorage[CONSENT_HISTORY_MIGRATION_FLAG] = '1';
  useConsentStore.setState({
    currentConsent: null,
    staleConsent: null,
    consentHistory: [],
    consentStatus: 'loading',
    isLoading: false,
    error: null,
  });
}

beforeEach(resetAll);

describe('FEAT-399 · re-consent eligibility allowlist', () => {
  it('is an allowlist of exactly {version_mismatch, expired}', () => {
    expect([...RE_CONSENT_ELIGIBLE_STATUSES].sort()).toEqual(['expired', 'version_mismatch']);
  });

  it.each<ConsentStatus>(['version_mismatch', 'expired'])('admits %s', (status) => {
    expect(isReConsentEligible(status)).toBe(true);
  });

  // A denylist ("everything except revoked") would wrongly admit every one of
  // these. consentStore.ts's own contract comment mandates the allowlist form.
  it.each<ConsentStatus>([
    'loading',
    'valid',
    'integrity_error',
    'revoked',
    'missing',
    'under_age',
  ])('refuses %s', (status) => {
    expect(isReConsentEligible(status)).toBe(false);
  });
});

describe('FEAT-399 · renewConsent guards', () => {
  it.each<ConsentStatus>(['revoked', 'integrity_error', 'missing', 'under_age', 'valid'])(
    'refuses to renew from %s and writes no consent record',
    async (status) => {
      const stale = seedStaleRecord();
      useConsentStore.setState({ consentStatus: status, staleConsent: stale });
      const before = mockSecureStore[CONSENT_SECURE_KEY];

      await useConsentStore.getState().renewConsent(ALL_OPT_IN);

      expect(mockSecureStore[CONSENT_SECURE_KEY]).toBe(before);
      expect(useConsentStore.getState().error).toBeTruthy();
    },
  );

  it('refuses when the base record is a minor by BIRTH YEAR even though isEligible is true', async () => {
    // The heart of the slice. DEBUG-150 (c96ab71e) flipped the gate 13+ → 18+
    // AND bumped 1.0.0 → 1.1.0 in one commit, so a v1.0.0 record's
    // `isEligible: true` was computed under the 13+ rule and means "≥13".
    // Trusting the flag re-consents a 15-year-old.
    seedStaleRecord({
      ageVerification: {
        verified: true,
        birthYear: MINOR_BIRTH_YEAR,
        ageAtVerification: 15,
        isEligible: true,
      },
    });
    await useConsentStore.getState().loadConsent();
    const before = mockSecureStore[CONSENT_SECURE_KEY];

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    expect(mockSecureStore[CONSENT_SECURE_KEY]).toBe(before);
    expect(useConsentStore.getState().consentStatus).toBe('version_mismatch');
    expect(useConsentStore.getState().error).toBeTruthy();
  });

  it('refuses when birthYear is absent (fail-safe — the field is optional)', async () => {
    seedStaleRecord({
      ageVerification: { verified: true, isEligible: true },
    });
    await useConsentStore.getState().loadConsent();
    const before = mockSecureStore[CONSENT_SECURE_KEY];

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    expect(mockSecureStore[CONSENT_SECURE_KEY]).toBe(before);
    expect(useConsentStore.getState().error).toBeTruthy();
  });

  it('does NOT drop the app into under_age as a side effect of a refused renewal', async () => {
    seedStaleRecord({
      ageVerification: { verified: true, birthYear: MINOR_BIRTH_YEAR, isEligible: true },
    });
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    // A rejected call must not mutate terminal state; the trigger layer owns
    // suppression. Staying version_mismatch is the fail-closed answer.
    expect(useConsentStore.getState().consentStatus).toBe('version_mismatch');
    expect(useConsentStore.getState().currentConsent).toBeNull();
  });

  it('pins the loadConsent ordering asymmetry: a stale ineligible record reads version_mismatch, never under_age', async () => {
    seedStaleRecord({
      ageVerification: { verified: true, birthYear: MINOR_BIRTH_YEAR, isEligible: false },
    });
    await useConsentStore.getState().loadConsent();
    // The version test runs BEFORE the age check, deliberately, so an Art. 7(3)
    // withdrawal is never re-prompted. Pinned as a test, never "fixed" by
    // reordering. The expired branch sits AFTER the age check and is safe.
    expect(useConsentStore.getState().consentStatus).toBe('version_mismatch');
  });
});

describe('FEAT-399 · renewConsent preserves the Art. 7(1) audit chain', () => {
  it('appends to the PERSISTED history, not the empty in-memory array', async () => {
    await useConsentStore
      .getState()
      .grantConsent(ALL_OPT_IN, { verified: true, birthYear: ADULT_BIRTH_YEAR, isEligible: true });
    await useConsentStore.getState().updateConsent({ analyticsEnabled: false });
    expect(useConsentStore.getState().consentHistory).toHaveLength(2);

    // Force the record stale, keeping the (adult) age data intact.
    const stored = JSON.parse(mockSecureStore[CONSENT_SECURE_KEY]) as ConsentRecord;
    mockSecureStore[CONSENT_SECURE_KEY] = JSON.stringify({ ...stored, version: '1.0.0' });

    // DISCRIMINATING DETAIL — without this the test passes against a buggy
    // implementation. Neither the version_mismatch nor the expired branch of
    // loadConsent resets `consentHistory`, so the array populated above would
    // survive in memory and mask an implementation that reads
    // `get().consentHistory` instead of reloading. A real cold start has [].
    useConsentStore.setState({ consentHistory: [] });

    await useConsentStore.getState().loadConsent();
    expect(useConsentStore.getState().consentStatus).toBe('version_mismatch');
    expect(useConsentStore.getState().consentHistory).toHaveLength(0);

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    const history = useConsentStore.getState().consentHistory;
    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history[0].action).toBe('granted');
    expect(history[history.length - 1].action).toBe('renewed');

    // And it reached the encrypted blob, not just component state.
    const persisted = mockWellnessBlobs[CONSENT_HISTORY_BLOB_KEY] as ConsentHistoryEntry[];
    expect(persisted).toHaveLength(history.length);
    expect(persisted[0].action).toBe('granted');
  });

  it('records the REAL prior version in fromVersion, not CONSENT_VERSION', async () => {
    seedStaleRecord();
    mockWellnessBlobs[CONSENT_HISTORY_BLOB_KEY] = [
      { action: 'granted', changes: {}, timestamp: Date.now() - 5000 },
    ];
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    const last = useConsentStore.getState().consentHistory.slice(-1)[0];
    expect(last.action).toBe('renewed');
    expect(last.fromVersion).toBe('1.0.0');
    expect(last.toVersion).toBe(CONSENT_VERSION);
  });

  it('leaves legacy entries lacking the version fields byte-identical', async () => {
    const legacy: ConsentHistoryEntry = {
      action: 'granted',
      changes: { analyticsEnabled: true },
      timestamp: 1_700_000_000_000,
    };
    seedStaleRecord();
    mockWellnessBlobs[CONSENT_HISTORY_BLOB_KEY] = [legacy];
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    const persisted = mockWellnessBlobs[CONSENT_HISTORY_BLOB_KEY] as ConsentHistoryEntry[];
    // Optional fields mean zero migration: the old entry round-trips unchanged.
    expect(persisted[0]).toEqual(legacy);
    expect(JSON.parse(JSON.stringify(persisted[0]))).toEqual(legacy);
  });
});

describe('FEAT-399 · renewConsent record shape', () => {
  it('rewrites version, expiresAt and consentId, and does not carry revocation fields', async () => {
    const stale = seedStaleRecord({
      revokedAt: 123,
      revocationReason: 'should not survive',
    } as Partial<ConsentRecord>);
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    const next = useConsentStore.getState().currentConsent!;
    expect(next.version).toBe(CONSENT_VERSION);
    expect(next.consentId).not.toBe(stale.consentId);
    expect(next.expiresAt).toBeGreaterThan(Date.now());
    expect(next.revoked).toBe(false);
    // Built field by field, never `...base` — revocation fields cannot ride along.
    expect(next.revokedAt).toBeUndefined();
    expect(next.revocationReason).toBeUndefined();
    expect(next.userId).toBe(stale.userId);
    expect(useConsentStore.getState().consentStatus).toBe('valid');
    expect(useConsentStore.getState().staleConsent).toBeNull();
  });

  it('takes preferences from the CALLER and never carries them forward', async () => {
    // The stale record is opted IN to analytics and predates
    // mentalHealthProcessingConsent entirely. Renewing with an all-opt-out
    // argument must produce an all-opt-out record: inferring Art. 9(2)(a)
    // explicit consent from a stale record is not an affirmative user act.
    seedStaleRecord();
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().renewConsent(ALL_OPT_OUT);

    const next = useConsentStore.getState().currentConsent!;
    expect(next.preferences).toEqual(ALL_OPT_OUT);
    expect(next.preferences.mentalHealthProcessingConsent).toBe(false);
    expect(useConsentStore.getState().consentCache.canCollectAnalytics).toBe(false);
    expect(useConsentStore.getState().consentCache.canProcessMentalHealthData).toBe(false);
  });

  it('carries universalOptOut forward when set (a consumer must not re-assert an opt-out)', async () => {
    seedStaleRecord({ universalOptOut: true });
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    const next = useConsentStore.getState().currentConsent!;
    expect(next.universalOptOut).toBe(true);
    // And the cache honours it: opting in to analytics cannot override the signal.
    expect(useConsentStore.getState().consentCache.honorUniversalOptOut).toBe(true);
    expect(useConsentStore.getState().consentCache.canCollectAnalytics).toBe(false);
  });

  it('carries universalOptOut forward when unset (grantConsent hardcodes false; renewal must not)', async () => {
    seedStaleRecord({ universalOptOut: false });
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    expect(useConsentStore.getState().currentConsent!.universalOptOut).toBe(false);
    expect(useConsentStore.getState().consentCache.canCollectAnalytics).toBe(true);
  });

  it('never writes the legal-gate attestation blob', async () => {
    seedStaleRecord();
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().renewConsent(ALL_OPT_IN);

    // No UI displayed the ToS / Privacy Policy / wellness disclaimer in this
    // slice, so stamping a fresh version into that record would fabricate an
    // Art. 7(1) attestation — on a plaintext key that survives erasure.
    expect(mockSecureStore[LEGAL_GATE_CONSENTS_KEY]).toBeUndefined();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(
      LEGAL_GATE_CONSENTS_KEY,
      expect.anything(),
    );
  });
});

describe('FEAT-399 · declineReConsent', () => {
  it('appends a declined entry and writes NO consent record', async () => {
    seedStaleRecord();
    mockWellnessBlobs[CONSENT_HISTORY_BLOB_KEY] = [
      { action: 'granted', changes: {}, timestamp: Date.now() - 5000 },
    ];
    await useConsentStore.getState().loadConsent();
    const before = mockSecureStore[CONSENT_SECURE_KEY];
    (SecureStore.setItemAsync as jest.Mock).mockClear();

    await useConsentStore.getState().declineReConsent();

    const last = useConsentStore.getState().consentHistory.slice(-1)[0];
    expect(last.action).toBe('declined');
    expect(last.changes).toEqual({});
    expect(last.fromVersion).toBe('1.0.0');
    expect(last.toVersion).toBe(CONSENT_VERSION);

    // Assert BOTH: a byte-identical rewrite would pass the first alone.
    expect(mockSecureStore[CONSENT_SECURE_KEY]).toBe(before);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(
      CONSENT_SECURE_KEY,
      expect.anything(),
    );
  });

  it('leaves the stale record standing so the user is re-prompted next launch', async () => {
    seedStaleRecord();
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().declineReConsent();

    expect(useConsentStore.getState().consentStatus).toBe('version_mismatch');
    expect(useConsentStore.getState().currentConsent).toBeNull();
    expect(useConsentStore.getState().staleConsent).not.toBeNull();
  });

  it('preserves the audit chain (it runs in the same empty-history states)', async () => {
    seedStaleRecord();
    mockWellnessBlobs[CONSENT_HISTORY_BLOB_KEY] = [
      { action: 'granted', changes: {}, timestamp: Date.now() - 9000 },
      { action: 'updated', changes: { analyticsEnabled: true }, timestamp: Date.now() - 8000 },
    ];
    useConsentStore.setState({ consentHistory: [] });
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().declineReConsent();

    const persisted = mockWellnessBlobs[CONSENT_HISTORY_BLOB_KEY] as ConsentHistoryEntry[];
    expect(persisted).toHaveLength(3);
    expect(persisted[0].action).toBe('granted');
    expect(persisted[2].action).toBe('declined');
  });

  it('declines without an age gate (a minor refusing is truthful and writes nothing)', async () => {
    seedStaleRecord({
      ageVerification: { verified: true, birthYear: MINOR_BIRTH_YEAR, isEligible: true },
    });
    await useConsentStore.getState().loadConsent();

    await useConsentStore.getState().declineReConsent();

    expect(useConsentStore.getState().consentHistory.slice(-1)[0].action).toBe('declined');
  });

  it.each<ConsentStatus>(['revoked', 'integrity_error', 'missing', 'valid'])(
    'refuses to decline from %s',
    async (status) => {
      seedStaleRecord();
      useConsentStore.setState({ consentStatus: status, consentHistory: [] });

      await useConsentStore.getState().declineReConsent();

      expect(useConsentStore.getState().consentHistory).toHaveLength(0);
    },
  );
});
