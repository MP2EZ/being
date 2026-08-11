/**
 * DSR consent-history export regression tests (DEBUG-402).
 *
 * `exportConsentRecords` fed `get().consentHistory` straight into the CCPA/DSR
 * payload (`DataExportService` passes it through unchanged). But `loadConsent`
 * returns from FIVE branches before it ever loads history, so in every one of
 * those states the in-memory array is `[]` and a lapsed user's export claimed
 * an empty consent chain — indistinguishable from "this user never granted",
 * which is false for anyone who ever did. `history` is the GDPR Art. 7(1)
 * demonstrability artifact, so an empty one asserts something untrue in the one
 * document whose purpose is accuracy.
 *
 * WHY THIS FILE AND NOT `consentStore.test.ts`: that suite is listed in
 * `app/scripts/ci-uncovered-tests.json` and matches no CI or precommit
 * `--testPathPattern`, so a regression test written there cannot fail a PR.
 * `*.privacy.test.ts` is picked up by `npm run test:privacy`
 * (`jest --testPathPattern=privacy`), which runs in precommit AND in the
 * `Safety + privacy gates` CI job inside `ci-pass`. Siting is the gate.
 *
 * SCOPE NOTE: the work item named only `version_mismatch` and `expired`. That
 * pair was borrowed from `isReConsentEligible`, which answers a different
 * question ("who may re-consent?") than this one ("whose history is empty?").
 * All five early-return branches leave `consentHistory` empty, so all five are
 * pinned here — a `revoked` user retains a right-to-know over the audit chain
 * they built before withdrawing.
 *
 * THE COLD-START STEP IS LOAD-BEARING. Neither lapse branch *resets*
 * `consentHistory`, so a test that skips `setState({ consentHistory: [] })`
 * inherits a populated array from a previous action and passes against the
 * buggy code. Each case asserts the array is empty after `loadConsent` before
 * it asserts the export repopulates it.
 */

// In-memory SecureStore + AsyncStorage mocks — harness copied from
// reConsent.privacy.test.ts:43-88. Do NOT copy the mock in
// consentChangelog.privacy.test.ts: it declares `getWellnessBlob` /
// `removeWellnessBlob`, which are not the real SecureStorageService method
// names (`retrieveWellnessBlob` / `deleteWellnessBlob`), so every history
// assertion here would read `undefined` and pass vacuously.
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import {
  useConsentStore,
  CONSENT_VERSION,
  type ConsentPreferences,
  type ConsentRecord,
  type ConsentHistoryEntry,
  type ConsentStatus,
} from '../consentStore';

const CONSENT_SECURE_KEY = 'consent_record_v1';
const CONSENT_HISTORY_BLOB_KEY = 'consent_history_v1';
const CONSENT_HISTORY_MIGRATION_FLAG = 'being.consent_history_migration_v2';

const CURRENT_YEAR = new Date().getFullYear();
const ADULT_BIRTH_YEAR = CURRENT_YEAR - 30;

const PREFS: ConsentPreferences = {
  analyticsEnabled: true,
  crashReportsEnabled: true,
  cloudSyncEnabled: false,
  researchEnabled: false,
  mentalHealthProcessingConsent: true,
};

/** A real three-link Art. 7(1) chain: the user granted, then twice amended. */
const PERSISTED_HISTORY: ConsentHistoryEntry[] = [
  { action: 'granted', changes: {}, timestamp: 1_000 },
  { action: 'updated', changes: { analyticsEnabled: true }, timestamp: 2_000 },
  { action: 'updated', changes: { cloudSyncEnabled: false }, timestamp: 3_000 },
] as unknown as ConsentHistoryEntry[];

function seedRecord(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  const now = Date.now();
  const record = {
    consentId: 'consent_abcdef123456',
    userId: 'test-user-id',
    version: CONSENT_VERSION,
    preferences: PREFS,
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

/** The encrypted chain survives on disk in every lapse state — only the
 *  in-memory array is empty. Seeding the blob is what makes that observable. */
function seedPersistedHistory(): void {
  mockWellnessBlobs[CONSENT_HISTORY_BLOB_KEY] = [...PERSISTED_HISTORY];
}

function resetAll(): void {
  for (const k of Object.keys(mockSecureStore)) delete mockSecureStore[k];
  for (const k of Object.keys(mockAsyncStorage)) delete mockAsyncStorage[k];
  for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];
  jest.clearAllMocks();
  // Skip the INFRA-144 one-time migration entry so history assertions read only
  // the real persisted chain, not a migration annotation.
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

/**
 * Every branch of `loadConsent` that returns before the history load at the
 * bottom of the function. `integrity_error` and `revoked` and `version_mismatch`
 * are checked in that order and are deliberately non-overlapping here; the
 * `under_age` seed must carry the CURRENT version or it short-circuits to
 * `version_mismatch` first.
 */
const LAPSE_CASES: ReadonlyArray<{
  status: ConsentStatus;
  overrides: Partial<ConsentRecord>;
}> = [
  { status: 'integrity_error', overrides: { consentId: '' } as Partial<ConsentRecord> },
  { status: 'revoked', overrides: { revoked: true } },
  { status: 'version_mismatch', overrides: { version: '1.0.0' } },
  {
    status: 'under_age',
    overrides: {
      ageVerification: {
        verified: true,
        birthYear: CURRENT_YEAR - 15,
        ageAtVerification: 15,
        verifiedAt: Date.now() - 1000,
        isEligible: false,
      },
    } as Partial<ConsentRecord>,
  },
  { status: 'expired', overrides: { expiresAt: Date.now() - 1000 } },
];

describe('DEBUG-402 · DSR export returns the persisted consent history for lapsed users', () => {
  it.each(LAPSE_CASES)(
    'exports the full chain in $status, where the in-memory array is empty',
    async ({ status, overrides }) => {
      seedRecord(overrides);
      seedPersistedHistory();

      await useConsentStore.getState().loadConsent();

      // Precondition — this is the state the defect lives in. If either of
      // these fails the seed is wrong and the export assertion below proves
      // nothing.
      expect(useConsentStore.getState().consentStatus).toBe(status);
      expect(useConsentStore.getState().consentHistory).toEqual([]);

      const result = await useConsentStore.getState().exportConsentRecords();

      expect(result.history).toHaveLength(PERSISTED_HISTORY.length);
      expect(result.history.map((e) => e.action)).toEqual(['granted', 'updated', 'updated']);
      expect(result.history.map((e) => e.timestamp)).toEqual([1_000, 2_000, 3_000]);
    }
  );

  it('still exports an empty chain for a user who genuinely has no history', async () => {
    seedRecord({ version: '1.0.0' });
    // No seedPersistedHistory() — the blob does not exist.

    await useConsentStore.getState().loadConsent();
    const result = await useConsentStore.getState().exportConsentRecords();

    expect(result.history).toEqual([]);
  });

  it('reads the chain for a valid (non-lapsed) user too', async () => {
    seedRecord();
    seedPersistedHistory();

    await useConsentStore.getState().loadConsent();
    expect(useConsentStore.getState().consentStatus).toBe('valid');

    const result = await useConsentStore.getState().exportConsentRecords();
    expect(result.history).toHaveLength(PERSISTED_HISTORY.length);
  });
});

describe('DEBUG-402 · the export path is side-effect-free', () => {
  // The work item proposed routing the export through
  // `loadConsentHistoryWithMigration()`. That function WRITES on its first call
  // — it sets the migration flag even when there is no legacy data to migrate,
  // and persists an annotated chain when there is. Producing a write to the
  // audit chain *because* the data subject asked to read it is the one thing a
  // DSR export must not do, so the fix takes the underlying pure read instead.
  it.each(LAPSE_CASES)('writes nothing while exporting in $status', async ({ overrides }) => {
    seedRecord(overrides);
    seedPersistedHistory();

    await useConsentStore.getState().loadConsent();

    // Clear AFTER loadConsent — it legitimately clears the persisted cache, and
    // those writes are not the export's.
    jest.clearAllMocks();

    await useConsentStore.getState().exportConsentRecords();

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(SecureStorageService.storeWellnessBlob).not.toHaveBeenCalled();
    expect(SecureStorageService.deleteWellnessBlob).not.toHaveBeenCalled();
  });

  it('writes nothing even on a cold migration flag', async () => {
    // The exact case that makes `loadConsentHistoryWithMigration` write: the
    // one-time INFRA-144 flag has never been set. `resetAll` normally sets it;
    // remove it so a regression that reintroduces the migration call is caught.
    delete mockAsyncStorage[CONSENT_HISTORY_MIGRATION_FLAG];
    seedRecord({ version: '1.0.0' });
    seedPersistedHistory();

    await useConsentStore.getState().loadConsent();
    jest.clearAllMocks();

    await useConsentStore.getState().exportConsentRecords();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(SecureStorageService.storeWellnessBlob).not.toHaveBeenCalled();
    expect(mockAsyncStorage[CONSENT_HISTORY_MIGRATION_FLAG]).toBeUndefined();
  });
});
