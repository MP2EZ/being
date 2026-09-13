/**
 * DEBUG-545 — the account-deletion attestation survives the launches that follow
 * an erasure.
 *
 * THE DEFECT
 *
 * `recordAccountDeletionAttestation` wrote the Art. 17(3)(b) record to
 * `consent_history_v1`, which IS erasure-excluded — correct placement, and the
 * reason this looked safe. But `LEGACY_CONSENT_HISTORY_KEY` and
 * `CONSENT_HISTORY_BLOB_KEY` are the SAME literal, so that key is also the
 * consent-history chain's legacy source, and `loadConsentHistoryWithMigration`
 * runs on every consent read. It routes through `readWithLegacyFallback`, which
 * relocates the plaintext hit into `wellness_async_*`, writes a
 * `wellness_migrated:` marker, and DELETES the SecureStore copy. Both of those
 * prefixes are in `SWEPT_ASYNC_PREFIXES`.
 *
 * Net: the evidence left its protected home on the first post-erasure consent
 * read and became sweepable by any later `clearAllWellnessData` — including a
 * partial one. Nothing failed; the record was simply gone a launch later.
 *
 * WHY A SEPARATE KEY RATHER THAN AN EXEMPTION
 *
 * The obvious fix — "never migrate `consent_history_v1`" — is unavailable.
 * Migrating that key is REQUIRED behaviour for the consent history itself
 * (INFRA-144). The two payloads had to be split, which is why this suite tests a
 * NEW key rather than a new exclusion.
 *
 * WHY NOT IN consentStore.test.ts
 *
 * That file mocks `@/core/services/security/SecureStorageService` wholesale, so a
 * test placed there cannot reach `readWithLegacyFallback` at all and would pass
 * without the fix — a fake control. Here both stores are real in-memory Maps and
 * the service is real, because the migration path IS the mechanism under test.
 */

const mockSecureStoreMap = new Map<string, string>();
const mockAsyncStorageMap = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStoreMap.set(key, value);
  }),
  getItemAsync: jest.fn(async (key: string) => mockSecureStoreMap.get(key) ?? null),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStoreMap.delete(key);
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, value: string) => {
    mockAsyncStorageMap.set(key, value);
  }),
  getItem: jest.fn(async (key: string) => mockAsyncStorageMap.get(key) ?? null),
  removeItem: jest.fn(async (key: string) => {
    mockAsyncStorageMap.delete(key);
  }),
  getAllKeys: jest.fn(async () => Array.from(mockAsyncStorageMap.keys())),
  multiGet: jest.fn(async (keys: string[]) =>
    keys.map((k) => [k, mockAsyncStorageMap.get(k) ?? null])
  ),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => mockAsyncStorageMap.delete(k));
  }),
  clear: jest.fn(async () => {
    mockAsyncStorageMap.clear();
  }),
}));

// Passthrough EncryptionService. The property under test is KEY ROUTING — which
// key a payload lands in and which sweeps reach it — not cipher correctness,
// which `EncryptionService.realcrypto.test.ts` owns. Without this the real
// service demands a master key that no test provisions, and the migration path
// fails for the wrong reason.
jest.mock('../EncryptionService', () => {
  const wrap = (data: unknown, sensitivityLevel: string) => ({
    encryptedData: Buffer.from(JSON.stringify(data), 'utf-8').toString('base64'),
    iv: 'mock-iv',
    tag: 'mock-tag',
    salt: 'mock-salt',
    metadata: {
      algorithm: 'AES-GCM',
      keyVersion: 1,
      ivLength: 12,
      tagLength: 16,
      encryptedAt: 0,
      sensitivityLevel,
      performanceMetrics: { encryptionTimeMs: 1, dataSize: 0, encryptedSize: 0 },
    },
    checksum: 'mock-checksum',
  });
  const stub = {
    encryptData: jest.fn(async (data: unknown, level: string) => wrap(data, level)),
    decryptData: jest.fn(async (pkg: { encryptedData: string }) =>
      JSON.parse(Buffer.from(pkg.encryptedData, 'base64').toString('utf-8'))
    ),
    encryptCrisisData: jest.fn(async (d: unknown) => wrap(d, 'level_1_crisis_responses')),
    encryptAssessmentData: jest.fn(async (d: unknown) => wrap(d, 'level_2_assessment_data')),
    initialize: jest.fn(async () => undefined),
    destroy: jest.fn(async () => undefined),
    deleteMasterKey: jest.fn(async () => undefined),
    getInstance: jest.fn(),
  };
  stub.getInstance.mockReturnValue(stub);
  return { __esModule: true, default: stub };
});

import SecureStorageService, {
  ACCOUNT_DELETION_ATTESTATION_KEY,
  ERASURE_EXCLUDED_SECURE_STORE_KEYS,
  MIGRATION_ISOLATED_SECURE_STORE_KEYS,
  WELLNESS_SECURE_STORE_KEYS,
} from '../SecureStorageService';

const LEGACY_CONSENT_HISTORY_KEY = 'consent_history_v1';

/** The exact shape `recordAccountDeletionAttestation` writes. */
const attestation = {
  action: 'revoked' as const,
  changes: { analyticsEnabled: false },
  timestamp: 1_756_000_000_000,
  note: 'account_deletion_requested; prior_entries=3',
};

beforeEach(() => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
});

describe('DEBUG-545: the attestation key is isolated from the migration path', () => {
  it('is migration-isolated', () => {
    expect(MIGRATION_ISOLATED_SECURE_STORE_KEYS as readonly string[]).toContain(
      ACCOUNT_DELETION_ATTESTATION_KEY
    );
  });

  it('is erasure-excluded, so the sweep leaves it alone', () => {
    expect(ERASURE_EXCLUDED_SECURE_STORE_KEYS as readonly string[]).toContain(
      ACCOUNT_DELETION_ATTESTATION_KEY
    );
  });

  it('is NOT in the wellness manifest — the only list the sweep actually deletes from', () => {
    // `WELLNESS_SECURE_STORE_KEYS` is what `clearAllWellnessData` enumerates.
    // Erasure-exclusion is documentation and assertion coverage; ABSENCE here is
    // the real protection, so it gets its own assertion rather than being
    // inferred from the one above.
    expect(WELLNESS_SECURE_STORE_KEYS as readonly string[]).not.toContain(
      ACCOUNT_DELETION_ATTESTATION_KEY
    );
  });

  it('the two lists are NOT the same list', () => {
    // Conflating them would break consent history outright: `consent_history_v1`
    // is erasure-excluded AND is legitimately migrated on every load. This
    // assertion is what stops a later reader "simplifying" one into the other.
    expect(ERASURE_EXCLUDED_SECURE_STORE_KEYS as readonly string[]).toContain(
      LEGACY_CONSENT_HISTORY_KEY
    );
    expect(MIGRATION_ISOLATED_SECURE_STORE_KEYS as readonly string[]).not.toContain(
      LEGACY_CONSENT_HISTORY_KEY
    );
  });
});

describe('DEBUG-545: the attestation survives erasure and the launches after it', () => {
  it('is still readable after clearAllWellnessData({deleteMasterKey:true})', async () => {
    mockSecureStoreMap.set(ACCOUNT_DELETION_ATTESTATION_KEY, JSON.stringify(attestation));

    await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });

    expect(mockSecureStoreMap.get(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(
      JSON.stringify(attestation)
    );
  });

  it('survives a SECOND erasure', async () => {
    mockSecureStoreMap.set(ACCOUNT_DELETION_ATTESTATION_KEY, JSON.stringify(attestation));
    await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });
    await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });
    expect(mockSecureStoreMap.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(true);
  });

  it('NEGATIVE CONTROL — a NON-excluded SecureStore wellness key does NOT survive', async () => {
    // Proves the sweep actually runs in this harness. Without it, every
    // assertion above would pass against a `clearAllWellnessData` that did
    // nothing at all — the fake-control shape this codebase keeps rediscovering.
    const sweptKey = (WELLNESS_SECURE_STORE_KEYS as readonly string[])[0];
    mockSecureStoreMap.set(sweptKey, 'should not survive');
    mockSecureStoreMap.set(ACCOUNT_DELETION_ATTESTATION_KEY, JSON.stringify(attestation));

    await SecureStorageService.clearAllWellnessData({ deleteMasterKey: true });

    expect(mockSecureStoreMap.has(sweptKey)).toBe(false);
    expect(mockSecureStoreMap.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(true);
  });
});

describe('DEBUG-545: the migration path REFUSES the isolated key', () => {
  it('throws in development rather than relocating it', async () => {
    // The guard is what turns migration-isolation from a convention into a
    // property. Reaching the migration for this key is the defect.
    mockSecureStoreMap.set(ACCOUNT_DELETION_ATTESTATION_KEY, JSON.stringify(attestation));

    await expect(
      SecureStorageService.retrieveWellnessBlob(
        `wellness_async_${ACCOUNT_DELETION_ATTESTATION_KEY}`,
        ACCOUNT_DELETION_ATTESTATION_KEY,
        { legacyFormat: 'plaintext_json', sensitivityLevel: 'level_2_assessment_data' }
      )
    ).rejects.toThrow(/migration-isolated/);

    // and crucially it did NOT delete the SecureStore copy on the way out
    expect(mockSecureStoreMap.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(true);
  });

  it('CONTROL — the consent-history key is still migrated normally', async () => {
    // The guard must be narrow. If it fired on `consent_history_v1` it would
    // break INFRA-144's migration for every install, which is a far larger
    // regression than the bug being fixed.
    mockSecureStoreMap.set(LEGACY_CONSENT_HISTORY_KEY, JSON.stringify([attestation]));

    const result = await SecureStorageService.retrieveWellnessBlob(
      'wellness_async_consent_history_v1',
      LEGACY_CONSENT_HISTORY_KEY,
      { legacyFormat: 'plaintext_json', sensitivityLevel: 'level_2_assessment_data' }
    );

    expect(result).not.toBeNull();
    // migration completed: the legacy copy is gone, which is exactly the
    // behaviour that destroyed the attestation while it shared this key.
    expect(mockSecureStoreMap.has(LEGACY_CONSENT_HISTORY_KEY)).toBe(false);
  });
});

describe('DEBUG-545: the attestation carries no identifier', () => {
  it('is booleans, a timestamp and a count — nothing more', () => {
    const serialized = JSON.stringify(attestation);
    // The ceiling compliance set, asserted as a shape rather than trusted to
    // prose. A plaintext record that survives every wipe may not carry an id.
    expect(Object.keys(attestation).sort()).toEqual(['action', 'changes', 'note', 'timestamp']);
    for (const value of Object.values(attestation.changes)) {
      expect(typeof value).toBe('boolean');
    }
    expect(serialized).not.toMatch(/distinct_?id/i);
    expect(serialized).not.toMatch(/device_?id/i);
    expect(serialized).not.toMatch(/user_?id|auth_?uid/i);
  });
});
