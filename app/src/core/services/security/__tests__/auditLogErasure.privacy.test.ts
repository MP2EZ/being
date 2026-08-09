/**
 * Storage-access audit logs — erasure coverage (DEBUG-355)
 *
 * WHY THIS EXISTS
 *
 * `logStorageAccess` persists an entry to AsyncStorage under
 * `audit_log_${Date.now()}` on EVERY `crisis_tier` operation and on EVERY
 * failure. That prefix appeared in no sweep: `clearAllWellnessData` filtered on
 * the four `*_async_` / `wellness_migrated:` prefix families plus an exact-name
 * exception list, and `audit_log_` is none of them. So the records survived
 * account erasure.
 *
 * This is a DIFFERENT failure mode from the `critical_log_*` defect in the same
 * work item, and the distinction decides the remedy. `critical_log_*` went to
 * SecureStore, which has no enumerate API, so those records were unerasable BY
 * CONSTRUCTION — no sweep could ever have found them, and the only fix was to
 * stop writing. `audit_log_*` goes to AsyncStorage, which enumerates fine, so it
 * was unerasable merely BY OMISSION. One line in the sweep therefore fixes it
 * retroactively on every already-shipped install, without a migration.
 *
 * Note the records are write-only in the other direction too: nothing reads an
 * `audit_log_*` key back, and `cleanupAuditLogs()` prunes only the in-memory
 * `accessLog` array, never the persisted keys. Before this fix nothing in the
 * app could remove them at all.
 *
 * WHAT IS FAKED, AND WHY THAT IS SOUND
 *
 * Both stores are real in-memory Maps, because enumeration is the mechanism
 * under test. `EncryptionService` is a passthrough stub — the property proven
 * here is about KEY NAMING and sweep coverage, not cipher correctness, which
 * `EncryptionService.realcrypto.test.ts` covers.
 *
 * SURVIVOR FOUND HERE, CLOSED BY DEBUG-381 — `storage_metadata_index`
 *
 * Enumerating the store after erasure (which is how this suite works) also
 * exposed a THIRD unswept key, found while writing these tests: one record per
 * stored blob carrying `storageKey` (e.g. `crisis_async_<episodeId>`),
 * `storageTier: 'crisis_tier'`, `sensitivityLevel`, `dataType` and timestamps.
 *
 * It was left unfixed here because the obvious one-line fix was wrong:
 * `storeMetadata` re-serialises the entire in-memory `metadataCache` on every
 * write, so sweeping the key alone would have let the next write restore it.
 * DEBUG-381 closed it properly — cache cleared before the sweep, key on
 * `SWEPT_EXACT_KEYS` — and its own suite,
 * `storageMetadataIndexErasure.privacy.test.ts`, carries the write-back
 * regression pin. The whole-store assertion below was widened back at the same
 * time, which is what makes this file's coverage honest rather than scoped.
 *
 * Worth keeping the sequence in mind: this is the fourth local crisis-path
 * survivor across three work items, and each was found by enumerating after
 * erasure rather than by review. The enumeration IS the control.
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

jest.mock('../EncryptionService', () => {
  const wrap = (data: any, sensitivityLevel: string) => ({
    encryptedData: Buffer.from(JSON.stringify(data), 'utf-8').toString('base64'),
    iv: 'mock-iv',
    tag: 'mock-tag',
    salt: 'mock-salt',
    metadata: {
      algorithm: 'AES-GCM',
      keyVersion: 1,
      ivLength: 12,
      tagLength: 16,
      encryptedAt: Date.now(),
      sensitivityLevel,
      performanceMetrics: { encryptionTimeMs: 1, dataSize: 0, encryptedSize: 0 },
    },
    checksum: 'mock-checksum',
  });

  const stub = {
    encryptData: jest.fn(async (data: any, level: string) => wrap(data, level)),
    decryptData: jest.fn(async (pkg: any) =>
      JSON.parse(Buffer.from(pkg.encryptedData, 'base64').toString('utf-8'))
    ),
    encryptCrisisData: jest.fn(async (data: any) => wrap(data, 'level_1_crisis_responses')),
    encryptAssessmentData: jest.fn(async (data: any) => wrap(data, 'level_2_assessment_data')),
    initialize: jest.fn(async () => undefined),
    destroy: jest.fn(async () => undefined),
    deleteMasterKey: jest.fn(async () => undefined),
    getInstance: jest.fn(),
  };
  stub.getInstance.mockReturnValue(stub);
  return { __esModule: true, default: stub };
});

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock-docs/',
  writeAsStringAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({ exists: false, size: 0 })),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  default: service,
  SECURE_STORAGE_CONFIG,
  ERASURE_EXCLUDED_SECURE_STORE_KEYS,
} = require('../SecureStorageService');

const AUDIT_PREFIX: string = SECURE_STORAGE_CONFIG.AUDIT_LOG_PREFIX;

const auditKeys = () =>
  Array.from(mockAsyncStorageMap.keys()).filter((k) => k.startsWith(AUDIT_PREFIX));

beforeEach(async () => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
  await service.initialize();
});

describe('a crisis-tier operation really does persist an audit_log_* record', () => {
  it('writes at least one audit_log_* key on storeCrisisData', async () => {
    // Establishes the premise the erasure assertions rest on. Without this, a
    // "no audit_log_ key survives" test would pass vacuously if the writer were
    // ever removed or renamed, and the sweep entry would silently become dead.
    await service.storeCrisisData('episode-1', { phq9Q9: 2 }, 'episode-1');

    expect(auditKeys().length).toBeGreaterThan(0);
  });
});

describe('account erasure removes the storage-access audit logs', () => {
  it('clearAllWellnessData sweeps every audit_log_* key', async () => {
    await service.storeCrisisData('episode-1', { phq9Q9: 2 }, 'episode-1');
    expect(auditKeys().length).toBeGreaterThan(0);

    await service.clearAllWellnessData({ deleteMasterKey: true });

    expect(auditKeys()).toEqual([]);
  });

  it('sweeps audit_log_* records left by earlier installs', async () => {
    // Unlike the SecureStore half of DEBUG-355, this defect is fixable
    // retroactively: the keys enumerate, so adding the prefix to the sweep
    // reaches records already written on shipped builds. No sweeper or
    // persisted index is required.
    mockAsyncStorageMap.set(
      `${AUDIT_PREFIX}1700000000000`,
      JSON.stringify({ storageTier: 'crisis_tier', operationType: 'store', success: true })
    );
    mockAsyncStorageMap.set(
      `${AUDIT_PREFIX}1700000000001`,
      JSON.stringify({ storageTier: 'crisis_tier', operationType: 'retrieve', success: false })
    );

    await service.clearAllWellnessData();

    expect(auditKeys()).toEqual([]);
  });

  it('leaves no audit-log record content behind after erasure', async () => {
    await service.storeCrisisData('episode-1', { phq9Q9: 2 }, 'episode-1');
    expect(auditKeys().length).toBeGreaterThan(0);

    await service.clearAllWellnessData({ deleteMasterKey: true });

    // DEBUG-381 WIDENED THIS BACK, as that item's acceptance criteria required.
    // It was scoped to the `audit_log_` prefix because `storage_metadata_index`
    // survived erasure carrying `crisis_tier`, so the honest whole-store form
    // would have failed. That key is now swept AND its write-back loop closed,
    // so the unscoped assertion is the one that tells the truth.
    //
    // Both stores, not just AsyncStorage: asserting over one would under-assert
    // invisibly, because the gap only shows when the other store happens to be
    // non-empty.
    const dump = JSON.stringify([
      ...mockAsyncStorageMap.entries(),
      ...mockSecureStoreMap.entries(),
    ]);
    expect(dump).not.toContain('crisis_tier');

    // Kept alongside the whole-store form rather than replaced by it. This one
    // names the prefix THIS item exists for, so a regression here points at
    // `audit_log_` directly instead of at "something, somewhere, said
    // crisis_tier".
    const surviving = Array.from(mockAsyncStorageMap.entries()).filter(([k]) =>
      k.startsWith(AUDIT_PREFIX)
    );
    expect(surviving).toEqual([]);
  });

  it('proves the assertion can fail — a planted audit_log_ key IS detected', async () => {
    // Guards the guard: with an empty store the assertions above would pass
    // whether or not the sweep covers the prefix.
    mockAsyncStorageMap.set(`${AUDIT_PREFIX}1700000000002`, '{}');

    expect(auditKeys()).toEqual([`${AUDIT_PREFIX}1700000000002`]);
  });
});

describe('the erasure exclusions are unaffected', () => {
  it('preserves the consent audit trail and the identity anchor', async () => {
    // Lawful-basis evidence and the anonymous device-identity anchor are
    // DELIBERATELY excluded from the sweep. Widening the sweep by one prefix
    // must not widen it into these.
    for (const key of ERASURE_EXCLUDED_SECURE_STORE_KEYS as readonly string[]) {
      mockSecureStoreMap.set(key, JSON.stringify({ preserved: true }));
    }

    await service.clearAllWellnessData({ deleteMasterKey: true });

    for (const key of ERASURE_EXCLUDED_SECURE_STORE_KEYS as readonly string[]) {
      expect(mockSecureStoreMap.has(key)).toBe(true);
    }
  });
});
