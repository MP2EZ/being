/**
 * Storage-access audit logs — erasure coverage (DEBUG-355)
 *
 * WHY THIS EXISTS
 *
 * `logStorageAccess` persists an entry to AsyncStorage under
 * `audit_log_${Date.now()}` on EVERY FAILED storage operation. (It also
 * persisted on every `crisis_tier` operation until MAINT-378 deleted that tier;
 * the failure arm is now the only writer, which is why the premise test below
 * drives a deliberate failure rather than a crisis write.) That prefix appeared
 * in no sweep: `clearAllWellnessData` filtered on the `*_async_` /
 * `wellness_migrated:` prefix families plus an exact-name exception list, and
 * `audit_log_` is none of them. So the records survived account erasure.
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
 * KNOWN SURVIVOR, NOT FIXED HERE — `storage_metadata_index`
 *
 * Enumerating the store after erasure (which is how this suite works) also
 * exposes a THIRD unswept key, found while writing these tests. It holds one
 * record per stored blob: `storageKey` (e.g. `assessment_async_<assessmentId>`),
 * `storageTier: 'assessment_tier'`, `sensitivityLevel:
 * 'level_2_assessment_data'`, `dataType: 'assessment_phq-9'`, and timestamps. No
 * wellness content, but it records that a PHQ-9/GAD-7 record existed and when —
 * and it survives account deletion. (The example was a `crisis_tier` record
 * until MAINT-378 removed that tier; the survivor itself is unchanged, only
 * which tiers can populate it.)
 *
 * It is deliberately NOT fixed in this change, because the obvious one-line fix
 * is wrong. `storeMetadata` re-serializes the ENTIRE in-memory `metadataCache`
 * on every write, and `clearAllWellnessData` never clears that cache — so
 * sweeping the key would delete the file and the next `storeMetadata` call would
 * write it straight back, complete with the erased records. A real fix must
 * clear the cache and the key together, which is a behavioural change to the
 * logout path (`deleteMasterKey: false`) that neither the compliance nor the
 * crisis review for this item covered. Tracked as DEBUG-381; the assertions
 * below are scoped so they neither depend on it nor pretend it is fine.
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

/**
 * A storage call that is GUARANTEED to fail, and to fail inside the try block
 * that logs the failure.
 *
 * `storeAssessmentData` encrypts, then calls `validateStorageSize(pkg,
 * 'assessment_tier')`, which throws once the wrapped package exceeds
 * `MAX_WELLNESS_PAYLOAD_SIZE` (256KB). The throw lands in the method's catch,
 * which calls `logStorageAccess({ success: false })` — the only remaining
 * `audit_log_*` writer since MAINT-378.
 *
 * The oversize field is deliberately part of an otherwise well-formed
 * assessment payload: the failure must come from the size cap, not from a
 * malformed record tripping some earlier guard.
 *
 * NOTE the sibling writer that does NOT work here: `storeWellnessBlob` hits the
 * same 256KB cap, but its catch only calls `logError` — it never reaches
 * `logStorageAccess`, so it persists nothing. If this premise ever needs
 * re-anchoring again, check the catch block, not just the throw site.
 */
const storeOversizedAssessment = () =>
  service.storeAssessmentData('premise-oversize', {
    type: 'PHQ-9',
    responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
    totalScore: 14,
    timestamp: 1716000000000,
    userId: 'x'.repeat(300 * 1024),
  });

beforeEach(async () => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
  await service.initialize();
});

describe('a FAILED storage operation really does persist an audit_log_* record', () => {
  it('writes at least one audit_log_* key when a store operation fails', async () => {
    // Establishes the premise the erasure assertions rest on. Without this, a
    // "no audit_log_ key survives" test would pass vacuously if the writer were
    // ever removed or renamed, and the sweep entry would silently become dead.
    //
    // This premise was anchored on `storeCrisisData` until MAINT-378 deleted it
    // — exactly the removal the premise exists to catch. It is re-anchored on a
    // deterministic failure rather than removed, because dropping it would
    // leave the erasure assertions below unable to distinguish "the sweep
    // works" from "nothing was ever written".

    // Nothing has failed yet, so nothing should be persisted yet. This pins the
    // key below to THIS call rather than to service.initialize() or to leftover
    // state, and would catch a change that started persisting on success again.
    expect(auditKeys()).toEqual([]);

    const result = await storeOversizedAssessment();

    // The failure is real (the size cap tripped), not a silently-swallowed
    // success — otherwise the audit assertion could never fire.
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/payload size limit exceeded/i);
    expect(auditKeys().length).toBeGreaterThan(0);
  });
});

describe('account erasure removes the storage-access audit logs', () => {
  it('clearAllWellnessData sweeps every audit_log_* key', async () => {
    await storeOversizedAssessment();
    expect(auditKeys().length).toBeGreaterThan(0);

    await service.clearAllWellnessData({ deleteMasterKey: true });

    expect(auditKeys()).toEqual([]);
  });

  it('sweeps audit_log_* records left by earlier installs', async () => {
    // Unlike the SecureStore half of DEBUG-355, this defect is fixable
    // retroactively: the keys enumerate, so adding the prefix to the sweep
    // reaches records already written on shipped builds. No sweeper or
    // persisted index is required.
    //
    // The `crisis_tier` fixtures below are deliberate and must NOT be retargeted
    // to `assessment_tier`: this test is specifically about records left behind
    // by ALREADY-SHIPPED installs, which wrote `crisis_tier` audit entries from
    // the tier MAINT-378 deleted. No current writer produces them; that is the
    // point. These are raw JSON planted straight into AsyncStorage, so they do
    // not depend on any production writer still existing.
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
    await storeOversizedAssessment();
    expect(auditKeys().length).toBeGreaterThan(0);

    await service.clearAllWellnessData({ deleteMasterKey: true });

    // Scoped to the audit-log records this item covers, deliberately — see the
    // KNOWN SURVIVOR note in the header.
    //
    // This comment used to say a whole-store `not.toContain('crisis_tier')`
    // would become the honest assertion once DEBUG-381 lands. That framing is
    // dead: MAINT-378 deleted the crisis tier, so no writer produces
    // `storageTier: 'crisis_tier'` at all and such an assertion would now pass
    // vacuously — it would prove nothing about the sweep. DEBUG-381 is still
    // open and still real: `storage_metadata_index` survives erasure carrying
    // per-record `storageKey` / `storageTier` / timestamps (now
    // `assessment_tier`). Its widened assertion must therefore target the
    // SURVIVING KEY (`storage_metadata_index` is absent, or its contents are
    // empty, after erasure) rather than a tier string that no longer exists.
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
