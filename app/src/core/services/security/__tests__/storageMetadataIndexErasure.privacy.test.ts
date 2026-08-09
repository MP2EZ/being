/**
 * `storage_metadata_index` — erasure coverage (DEBUG-381)
 *
 * WHY THIS EXISTS
 *
 * `SecureStorageService` persists a metadata index to AsyncStorage under the
 * bare key `storage_metadata_index`, holding one record per stored blob:
 * `storageKey` (e.g. `assessment_async_<assessmentId>`), `storageTier: 'assessment_tier'`,
 * `sensitivityLevel: 'level_2_assessment_data'`, `dataType`, `createdAt`,
 * `lastAccessedAt`, `accessCount`, `dataSize`. No wellness CONTENT — but a
 * durable, CLEARTEXT local record that an assessment record existed, under which
 * record id, when it was created, when it was last read, and how often.
 *
 * The key matched no swept prefix and was not on the exact-name list, so it
 * survived `clearAllWellnessData` — including the full account-deletion path
 * with `deleteMasterKey: true`. It is the FOURTH local wellness-path survivor
 * found across three work items (DEBUG-305 `crisis_intervention_*`, DEBUG-355
 * `critical_log_*` and `audit_log_*`, this one), and it was found the same way
 * the last one was: by enumerating the whole store after erasure.
 *
 * WHY IT NEEDED ITS OWN SUITE RATHER THAN A LINE IN THE SWEEP
 *
 * This defect is unerasable by omission PLUS a write-back loop, and the second
 * half is what makes the one-line fix a FAKE CONTROL. `storeMetadata`
 * re-serialises the ENTIRE in-memory `metadataCache` on every single write, and
 * `clearAllWellnessData` never cleared that cache. So adding the key to the
 * sweep alone would delete the file and let the very next assessment
 * write put it straight back — complete with metadata for the records that were
 * just erased. It would read as a control while providing none, which is exactly
 * the shape `legacyPlaintextRecordSweeper` documents against itself and that
 * DEBUG-355 declined to repeat.
 *
 * THE TEST THAT DISTINGUISHES THE REAL FIX FROM THE FAKE ONE is
 * "does not come back after a subsequent assessment write". The sweep-only fix
 * passes every other assertion in this file and fails that one.
 *
 * A NOTE ON THAT ASSERTION'S SHAPE. The acceptance criterion as written asks
 * for a test proving the key "does not come back". Taken literally that is
 * impossible and would be wrong to build: the index is a live feature, so the
 * key legitimately reappears the moment anything is stored after erasure. The
 * provable — and correct — property is that when it comes back it contains ONLY
 * post-erasure entries. Hence these assertions key on the ERASED RECORD ID and
 * never on `assessment_tier`, which a post-erasure record legitimately carries.
 *
 * WHAT IS FAKED, AND WHY THAT IS SOUND
 *
 * Both stores are real in-memory Maps, because enumeration is the mechanism
 * under test. `EncryptionService` is a passthrough stub — the property proven
 * here is key naming and sweep coverage, not cipher correctness.
 *
 * SINGLETON HYGIENE, WHICH IS LOAD-BEARING HERE AND NOWHERE ELSE.
 * `loadStorageMetadata` only overwrites `metadataCache` when the persisted key
 * EXISTS, so clearing the mock Maps between tests does NOT clear the cache —
 * entries leak across tests. Every other erasure suite gets away with that;
 * this one cannot, because a leaked entry from a prior test is indistinguishable
 * from the resurrection bug under test. `__resetForTesting__()` clears the
 * instance's state IN PLACE before nulling the static, so calling it and then
 * re-initialising the SAME default export is safe — do NOT follow it with
 * `getInstance()`, which would mint a second instance with its own cache writing
 * the same key.
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
  SecureStorageService,
  SECURE_STORAGE_CONFIG,
  STORAGE_METADATA_INDEX_KEY,
} = require('../SecureStorageService');

/** The persisted index, parsed — or null when the key is absent. */
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

beforeEach(async () => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
  // See the singleton-hygiene note in the header. In place, then re-init the
  // SAME default export — never getInstance() after this.
  SecureStorageService.__resetForTesting__();
  await service.initialize();
});

describe('the metadata index really is written, and really does name stored records', () => {
  it('storeAssessmentData persists storage_metadata_index containing the storage tier', async () => {
    // Establishes the premise every erasure assertion below rests on. Without
    // it, "the key does not survive" passes vacuously the day the writer is
    // renamed, and the sweep entry becomes dead code nothing detects.
    await service.storeAssessmentData('victim-record', {
      type: 'PHQ-9',
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 1716000000000,
      userId: 'u1',
    });

    const raw = indexRaw();
    expect(raw).not.toBeNull();
    expect(raw).toContain('assessment_tier');
    expect(raw).toContain('victim-record');
  });
});

describe('account erasure removes the metadata index', () => {
  it('clearAllWellnessData removes storage_metadata_index', async () => {
    await service.storeAssessmentData('victim-record', {
      type: 'PHQ-9',
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 1716000000000,
      userId: 'u1',
    });
    expect(indexRaw()).not.toBeNull();

    await service.clearAllWellnessData({ deleteMasterKey: true });

    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);
  });

  it('the erased record does not COME BACK on the next assessment write', async () => {
    // THE ASSERTION THAT DISTINGUISHES A REAL FIX FROM A FAKE ONE.
    //
    // Sweeping the key without clearing `metadataCache` passes every other test
    // in this file and fails this one: `storeMetadata` re-serialises the whole
    // cache, so the next write restores every pre-erasure entry verbatim.
    //
    // Note what is and is not asserted. `assessment_tier` is NOT checked for absence
    // — the post-erasure record legitimately carries it, and asserting otherwise
    // would force this test to be weakened later, which is how a pin becomes a
    // rubber stamp. The erased RECORD ID is the honest discriminator.
    await service.storeAssessmentData('victim-record', {
      type: 'PHQ-9',
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 1716000000000,
      userId: 'u1',
    });
    await service.clearAllWellnessData({ deleteMasterKey: true });

    await service.storeAssessmentData('fresh-record', {
      type: 'PHQ-9',
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 1716000000000,
      userId: 'u1',
    });

    const raw = indexRaw();
    // Proves the write actually happened — otherwise the negative below is vacuous.
    expect(raw).toContain('fresh-record');
    expect(raw).not.toContain('victim-record');
    expect(wholeStoreDump()).not.toContain('victim-record');
  });

  it('holds on the logout path too (deleteMasterKey omitted)', async () => {
    // `clearAllWellnessData()` with no options is the `deleteMasterKey: false`
    // branch. It has NO production caller today — `AccountDeletionService.ts:61`
    // is the only invocation in app/src and passes `true` — so this pins a
    // DECISION rather than fixing a live regression: the cache is cleared
    // unconditionally on both branches.
    //
    // Clearing it is the right default even though the branch is currently
    // unreachable. Every entry the cache can hold names an `assessment_async_*`
    // key (only storeAssessmentData writes metadata since MAINT-378 removed the
    // crisis tier), and both prefixes are swept on BOTH branches — so after
    // either call the cache is 100% stale by construction. Retaining it would
    // preserve only a record that erased data once existed, and would feed the
    // write-back loop.
    await service.storeAssessmentData('victim-record', {
      type: 'PHQ-9',
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 1716000000000,
      userId: 'u1',
    });

    await service.clearAllWellnessData();

    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);

    await service.storeAssessmentData('fresh-record', {
      type: 'PHQ-9',
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 1716000000000,
      userId: 'u1',
    });
    expect(indexRaw()).not.toContain('victim-record');
  });

  it('sweeps an index left by an install that predates this fix', async () => {
    // Like the `audit_log_*` half of DEBUG-355 and unlike `critical_log_*`, this
    // defect is fixable RETROACTIVELY: the key is a single fixed AsyncStorage
    // name, so the sweep reaches already-shipped installs with no migration and
    // no launch sweeper. Planted directly rather than via a write, to model a
    // device that upgraded into the fix.
    mockAsyncStorageMap.set(
      STORAGE_METADATA_INDEX_KEY,
      JSON.stringify([
        [
          'assessment_async_legacy-record',
          {
            storageKey: 'assessment_async_legacy-record',
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
      ])
    );

    await service.clearAllWellnessData({ deleteMasterKey: true });

    expect(mockAsyncStorageMap.has(STORAGE_METADATA_INDEX_KEY)).toBe(false);
    expect(wholeStoreDump()).not.toContain('legacy-record');
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
