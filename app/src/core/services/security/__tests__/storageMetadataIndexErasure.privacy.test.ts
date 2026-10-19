/**
 * `storage_metadata_index` — erasure coverage (DEBUG-381, re-anchored MAINT-716, MAINT-790)
 *
 * WHY THIS EXISTS
 *
 * Shipped builds of `SecureStorageService` persisted a metadata index to
 * AsyncStorage under the bare key `storage_metadata_index`, holding one record
 * per stored blob: `storageKey` (e.g. `assessment_async_<assessmentId>`),
 * `storageTier: 'assessment_tier'`, `sensitivityLevel: 'level_2_assessment_data'`,
 * `dataType`, `createdAt`, `lastAccessedAt`, `accessCount`, `dataSize`. No
 * wellness CONTENT — but a durable, CLEARTEXT local record that an assessment
 * record existed, under which record id, when it was created, when it was last
 * read, and how often.
 *
 * The key matched no swept prefix and was not on the exact-name list, so it
 * survived `clearAllWellnessData` — including the full account-deletion path
 * with `deleteMasterKey: true`. It is the FOURTH local wellness-path survivor
 * found across three work items (DEBUG-305 `crisis_intervention_*`, DEBUG-355
 * `critical_log_*` and `audit_log_*`, this one), and it was found the same way
 * the last one was: by enumerating the whole store after erasure.
 *
 * WHAT MAINT-716 AND MAINT-790 CHANGED
 *
 * The index had a write-back loop: `storeMetadata` re-serialised the ENTIRE
 * in-memory `metadataCache` on every write, so sweeping the key alone would have
 * been a FAKE CONTROL — the next write would restore it, erased records
 * included. DEBUG-381 closed that by clearing the cache first and sweeping the
 * key. MAINT-716 deleted `storeAssessmentData`, the last writer (no production
 * caller), together with `storeMetadata`, `deleteMetadata` and
 * `persistMetadataIndex`. MAINT-790 then deleted `loadStorageMetadata`, the last
 * READER, with the `metadataCache` it hydrated and every consumer of that cache.
 * Nothing writes or reads the key any more, so neither the write-back nor a
 * cache-hydration ghost can happen by construction, and "the key is written" is
 * no longer a premise this suite can stand on.
 *
 * What it stands on instead, in three parts:
 *   1. RESIDUE. Installs that shipped before the fix still carry the file. It
 *      is planted here as raw JSON, not produced by any production writer, so
 *      the sweep tests cannot pass vacuously and do not depend on a writer
 *      existing.
 *   2. A NO-WRITER PIN. Every surviving public writer is run against that
 *      residue, before and after erasure, and the key must be byte-identical
 *      beforehand and absent afterwards. Re-adding a persist call anywhere those
 *      writers reach turns it red.
 *   3. A NO-READER PIN. The same drives, checked against the mock's `getItem` and
 *      `multiGet` call logs: no surviving path may read the key. Membership in
 *      `SWEPT_EXACT_KEYS` is the whole control, and a reader would reopen the
 *      question of what the cleartext index feeds. Proved able to fail by
 *      temporarily adding a `getItem` of the key to a surviving path.
 *
 * WHAT IS FAKED, AND WHY THAT IS SOUND
 *
 * Both stores are real in-memory Maps, because enumeration is the mechanism
 * under test. `EncryptionService` is a passthrough stub — the property proven
 * here is key naming and sweep coverage, not cipher correctness.
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
    initialize: jest.fn(async () => undefined),
    destroy: jest.fn(async () => undefined),
    deleteMasterKey: jest.fn(async () => undefined),
    getInstance: jest.fn(),
  };
  stub.getInstance.mockReturnValue(stub);
  return { __esModule: true, default: stub };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  default: service,
  SECURE_STORAGE_CONFIG,
  STORAGE_METADATA_INDEX_KEY,
} = require('../SecureStorageService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AsyncStorage = require('@react-native-async-storage/async-storage');

const VICTIM = 'victim-record';
const VICTIM_KEY = `assessment_async_${VICTIM}`;

/** The persisted index, raw — or null when the key is absent. */
const indexRaw = (): string | null => mockAsyncStorageMap.get(STORAGE_METADATA_INDEX_KEY) ?? null;

/** Whole-store dump across BOTH stores. SecureStore is not enumerable in
 *  production, but it is here, and asserting over one store only would silently
 *  under-assert — the gap is invisible precisely because the other store happens
 *  to be empty at the moment of the check. */
const wholeStoreDump = (): string =>
  JSON.stringify([
    ...mockAsyncStorageMap.entries(),
    ...mockSecureStoreMap.entries(),
  ]);

/** The index exactly as a shipped build left it: cleartext, naming the record. */
const shippedIndex = (): string =>
  JSON.stringify([
    [
      VICTIM_KEY,
      {
        storageKey: VICTIM_KEY,
        storageTier: 'assessment_tier',
        sensitivityLevel: 'level_2_assessment_data',
        dataType: 'assessment_phq-9',
        createdAt: 1,
        lastAccessedAt: 1,
        accessCount: 3,
        encrypted: true,
        dataSize: 128,
        retentionPolicy: 'wellness_record',
      },
    ],
  ]);

/**
 * Shipped-install residue, as raw keys: the index plus the record it names. The
 * record is a package the passthrough stub can decrypt; no surviving path reads
 * it, which is part of what the writer drives below check.
 */
const plantShippedInstall = (): string => {
  const index = shippedIndex();
  mockAsyncStorageMap.set(STORAGE_METADATA_INDEX_KEY, index);
  mockAsyncStorageMap.set(
    VICTIM_KEY,
    JSON.stringify({
      encryptedData: Buffer.from(JSON.stringify({ totalScore: 14 }), 'utf-8').toString('base64'),
      iv: 'mock-iv',
      tag: 'mock-tag',
      salt: 'mock-salt',
      metadata: {},
      checksum: 'mock-checksum',
    })
  );
  return index;
};

/**
 * Every surviving public path that touches storage, with `tag` keeping the keys
 * of one round distinct from another's. None may write or read
 * `storage_metadata_index`. `StorageTier` covers both `storeGeneralData`
 * branches (plain and encrypted).
 */
const runSurvivingPaths = async (tag: string): Promise<void> => {
  await service.storeWellnessBlob(`${tag}-blob`, { n: 1 }, 'level_2_assessment_data');
  await service.retrieveWellnessBlob(`${tag}-blob`);
  await service.storeWellnessBlob(`${tag}-legacy`, { n: 2 }, 'level_2_assessment_data');
  await service.deleteWellnessBlob(`${tag}-legacy`, `legacy_secure_${tag}`);
  await service.deleteWellnessBlob(`${tag}-blob`);
  const oversize = await service.storeWellnessBlob(
    `${tag}-oversize`,
    'x'.repeat(300 * 1024),
    'level_2_assessment_data'
  );
  expect(oversize.success).toBe(false);
  await service.storeGeneralData(`${tag}-plain`, { n: 3 }, 'general_tier');
  await service.storeGeneralData(`${tag}-enc`, { n: 4 }, 'performance_tier');
  expect(await service.retrieveGeneralData(`${tag}-plain`)).toEqual({ n: 3 });
  expect(await service.retrieveGeneralData(`${tag}-absent`)).toBeNull();
  expect(await service.retrieveWellnessBlob(`${tag}-absent`)).toBeNull();
  await service.getAccessLog();
};

const indexWrites = (): unknown[][] =>
  AsyncStorage.setItem.mock.calls.filter((c: unknown[]) => c[0] === STORAGE_METADATA_INDEX_KEY);

beforeEach(() => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
});

describe('nothing writes the metadata index (MAINT-716)', () => {
  it('every surviving writer, run over a shipped index, leaves it untouched and never writes the key', async () => {
    // The no-writer pin. Planting the shipped index first means a writer that
    // re-serialised or removed it would show as a changed or missing value, not
    // as an absence a silent no-op also produces.
    const planted = plantShippedInstall();
    jest.clearAllMocks();

    await runSurvivingPaths('pre');

    expect(indexWrites()).toEqual([]);
    expect(indexRaw()).toBe(planted);
    // Guard the guard: the writers really wrote something, so an untouched
    // index is not the product of the round doing nothing.
    expect(AsyncStorage.setItem.mock.calls.length).toBeGreaterThan(0);
    // Nothing but erasure removes the residue record the index names.
    expect(mockAsyncStorageMap.has(VICTIM_KEY)).toBe(true);
  });

  it('after erasure the key is absent, and stays absent through every surviving writer', async () => {
    plantShippedInstall();
    await runSurvivingPaths('pre');

    await service.clearAllWellnessData({ deleteMasterKey: true });
    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);

    await runSurvivingPaths('post');

    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);
    expect(indexWrites()).toEqual([]);
    expect(wholeStoreDump()).not.toContain(VICTIM);
    // Guard the guard: the second round left records behind, so the store is
    // not clean merely because nothing ran.
    expect(wholeStoreDump()).toContain('post-enc');
    expect(mockAsyncStorageMap.size).toBeGreaterThan(0);
  });

  it('holds on the logout path too (deleteMasterKey omitted)', async () => {
    // `clearAllWellnessData()` with no options is the `deleteMasterKey: false`
    // branch. It has NO production caller today — `AccountDeletionService.ts:61`
    // is the only invocation in app/src and passes `true` — so this pins a
    // DECISION: the key is swept on both branches.
    plantShippedInstall();
    await runSurvivingPaths('pre');

    await service.clearAllWellnessData();
    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);

    await runSurvivingPaths('post');

    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);
    expect(wholeStoreDump()).not.toContain(VICTIM);
    expect(mockAsyncStorageMap.size).toBeGreaterThan(0);
  });
});

describe('account erasure removes the metadata index', () => {
  it('clearAllWellnessData removes storage_metadata_index on a full account-deletion wipe', async () => {
    // Planted directly rather than via a write, to model a device that upgraded
    // into the fix. The key is a single fixed AsyncStorage name, so the sweep
    // reaches already-shipped installs with no migration and no launch sweeper.
    plantShippedInstall();
    expect(indexRaw()).not.toBeNull();

    await service.clearAllWellnessData({ deleteMasterKey: true });

    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);
    expect(wholeStoreDump()).not.toContain(VICTIM);
  });

  it('clearAllWellnessData removes it on the logout branch as well', async () => {
    plantShippedInstall();
    expect(indexRaw()).not.toBeNull();

    await service.clearAllWellnessData();

    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);
    expect(wholeStoreDump()).not.toContain(VICTIM);
  });

  it('sweeps an index planted after the service has already run', async () => {
    // Residue that arrived late — the sweep must depend on nothing but the key.
    await runSurvivingPaths('pre');
    mockAsyncStorageMap.set(STORAGE_METADATA_INDEX_KEY, shippedIndex());

    await service.clearAllWellnessData({ deleteMasterKey: true });

    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);
    expect(wholeStoreDump()).not.toContain(VICTIM);
  });
});

describe('nothing reads the metadata index (MAINT-790)', () => {
  const indexReads = (): string[] => {
    const viaGetItem = AsyncStorage.getItem.mock.calls
      .filter((c: unknown[]) => c[0] === STORAGE_METADATA_INDEX_KEY)
      .map(() => 'getItem');
    const viaMultiGet = AsyncStorage.multiGet.mock.calls
      .filter((c: unknown[]) => Array.isArray(c[0]) && (c[0] as string[]).includes(STORAGE_METADATA_INDEX_KEY))
      .map(() => 'multiGet');
    return [...viaGetItem, ...viaMultiGet];
  };

  it.each([
    ['full account-deletion wipe', { deleteMasterKey: true }],
    ['logout branch', {}],
  ])('no surviving path reads the key, before or after a %s', async (_label, options) => {
    plantShippedInstall();
    jest.clearAllMocks();

    await runSurvivingPaths('pre');
    await service.clearAllWellnessData(options);
    await runSurvivingPaths('post');
    await service.destroy();

    expect(indexReads()).toEqual([]);
    // Guard the guard: the spies really did observe reads of other keys, so an
    // empty result is not an inert spy.
    expect(AsyncStorage.getItem.mock.calls.length).toBeGreaterThan(0);
    expect(AsyncStorage.getItem.mock.calls.map((c: unknown[]) => c[0])).toContain('wellness_async_pre-blob');
    // And the residue's contents never surface through the service.
    expect(JSON.stringify(await service.getAccessLog())).not.toContain(VICTIM);
  });

  it('proves the reader pin can fail — a getItem of the key IS detected', async () => {
    await AsyncStorage.getItem(STORAGE_METADATA_INDEX_KEY);
    await AsyncStorage.multiGet(['x', STORAGE_METADATA_INDEX_KEY]);

    expect(indexReads()).toEqual(['getItem', 'multiGet']);
  });
});

describe('the index is covered by the auditable exception list, not a bespoke condition', () => {
  it('storage_metadata_index is on SWEPT_EXACT_KEYS', () => {
    // Membership, not behaviour — the behaviour is proven above. This pins WHERE
    // the coverage lives, because the constant's own doc requires anything added
    // to it to be covered by the crisis-path erasure guard, and that guard reads
    // this same constant. A bespoke inline `k === '...'` in the sweep filter
    // would work identically and be invisible to every suite that enumerates the
    // exception list.
    expect(SECURE_STORAGE_CONFIG.SWEPT_EXACT_KEYS).toContain(STORAGE_METADATA_INDEX_KEY);
  });

  it('proves the enumeration can fail — a planted unswept key IS detected', () => {
    // Guards the guard, in the shape crisisRecordErasure and auditLogErasure
    // both use. If enumeration silently stopped working, every assertion above
    // would pass vacuously against an empty store.
    mockAsyncStorageMap.set('some_unswept_key', JSON.stringify({ storageTier: 'assessment_tier' }));
    expect(wholeStoreDump()).toContain('some_unswept_key');
  });
});
