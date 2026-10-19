/**
 * Storage-access audit logs — erasure coverage (DEBUG-355; write-free since MAINT-790)
 *
 * WHY THIS EXISTS
 *
 * `logStorageAccess` used to persist an entry to AsyncStorage under
 * `audit_log_${Date.now()}` on every FAILED storage operation (and on every
 * `crisis_tier` operation until MAINT-378 deleted that tier). Those keys appeared
 * in no sweep: `clearAllWellnessData` filtered on the `*_async_` /
 * `wellness_migrated:` prefix families plus an exact-name exception list, and
 * `audit_log_` is none of them. So the records survived account erasure.
 *
 * MAINT-716 left the failure arm reachable only through two methods with no
 * production caller; MAINT-790 deleted the arm, so `logStorageAccess` is
 * in-memory only and NO CODE WRITES `audit_log_*`. The prefix stays on
 * `SWEPT_ASYNC_PREFIXES` as a defensive floor for records shipped installs already
 * carry. This suite therefore pins two things:
 *
 *  1. ERASURE: planted `audit_log_<epoch>` residue — raw JSON, so it depends on no
 *     production writer — is swept on BOTH `clearAllWellnessData` branches.
 *  2. NO WRITER: the surviving public methods, driven through success and through
 *     injected failures, never call `AsyncStorage.setItem` with an `audit_log_`
 *     key, and neither does `logStorageAccess` itself when handed a failed entry
 *     (the private method is called directly because no public method produces a
 *     failed entry any more — without that call the pin could not fail against a
 *     restored `if (!entry.success)` arm). Checked against the mock's call log,
 *     not just the final store, so a write that is later removed is still caught.
 *
 * This is a DIFFERENT failure mode from the `critical_log_*` defect in the same
 * work item. `critical_log_*` went to SecureStore, which has no enumerate API, so
 * those records were unerasable BY CONSTRUCTION. `audit_log_*` goes to
 * AsyncStorage, which enumerates fine, so it was unerasable merely BY OMISSION —
 * one line in the sweep fixes it retroactively on every already-shipped install.
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
 * exposed a THIRD unswept key. It holds one record per stored blob: `storageKey`
 * (e.g. `assessment_async_<assessmentId>`), `storageTier`, `sensitivityLevel`,
 * `dataType`, and timestamps. No wellness content, but it records that a
 * PHQ-9/GAD-7 record existed and when — and it survived account deletion.
 * DEBUG-381 closed it by putting the key on `SWEPT_EXACT_KEYS`; MAINT-716 deleted
 * its last writer and MAINT-790 its last reader. Its own suite,
 * `storageMetadataIndexErasure.privacy.test.ts`, carries the no-writer and
 * no-reader pins. The whole-store assertion below is what makes this file's
 * coverage honest rather than scoped.
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
  ERASURE_EXCLUDED_SECURE_STORE_KEYS,
  ACCOUNT_ERASURE_SECURE_STORE_KEYS,
  STORAGE_METADATA_INDEX_KEY,
} = require('../SecureStorageService');

const AUDIT_PREFIX: string = SECURE_STORAGE_CONFIG.AUDIT_LOG_PREFIX;

const auditKeys = () =>
  Array.from(mockAsyncStorageMap.keys()).filter((k) => k.startsWith(AUDIT_PREFIX));

const asyncStorageMock = jest.requireMock('@react-native-async-storage/async-storage');
const secureStoreMock = jest.requireMock('expo-secure-store');
const encryptionMock = jest.requireMock('../EncryptionService').default;

/** Every key any code path handed to `AsyncStorage.setItem` since the last reset. */
const keysWritten = (): string[] =>
  asyncStorageMock.setItem.mock.calls.map((call: unknown[]) => String(call[0]));

const auditKeysWritten = () => keysWritten().filter((k) => k.startsWith(AUDIT_PREFIX));

const throwOnce = (fn: jest.Mock, message: string) =>
  fn.mockImplementationOnce(async () => {
    throw new Error(message);
  });

beforeEach(() => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
});

describe('no code writes an audit_log_* record (MAINT-790)', () => {
  const failedEntry = {
    timestamp: 1700000000000,
    operationType: 'retrieve',
    storageKey: 'wellness_async_x',
    storageTier: 'assessment_tier',
    dataType: 'wellness_blob',
    success: false,
    operationTimeMs: 0,
    dataSize: 0,
    error: 'injected',
  };

  it('logStorageAccess persists nothing for a failed entry, a successful one, or a crisis-shaped one', async () => {
    // The private method is driven directly: no public method produces a failed
    // entry any more, so this is the only call that fails against a restored
    // `if (!entry.success)` persistence arm.
    await (service as any).logStorageAccess(failedEntry);
    await (service as any).logStorageAccess({ ...failedEntry, success: true });
    await (service as any).logStorageAccess({ ...failedEntry, storageTier: 'crisis_tier' });

    expect(asyncStorageMock.setItem).not.toHaveBeenCalled();
    expect(auditKeys()).toEqual([]);
    // It still records in memory — the guard that the calls above did something.
    expect((await service.getAccessLog()).filter((e: any) => e.error === 'injected')).toHaveLength(3);
  });

  it('surviving public methods write no audit_log_* key on success or on injected failure', async () => {
    // Success paths. The positive control: the spy really does record writes.
    expect((await service.storeWellnessBlob('ok', { a: 1 }, 'level_2_assessment_data')).success).toBe(true);
    await service.retrieveWellnessBlob('ok');
    expect((await service.storeGeneralData('g', { a: 1 }, 'general_tier')).success).toBe(true);
    await service.retrieveGeneralData('g');
    await service.deleteWellnessBlob('ok');
    expect(keysWritten()).toEqual(expect.arrayContaining(['wellness_async_ok', 'general_g']));

    // storeWellnessBlob: size cap, then a failing write.
    const oversize = await service.storeWellnessBlob(
      'big',
      { blob: 'x'.repeat(300 * 1024) },
      'level_2_assessment_data'
    );
    expect(oversize.success).toBe(false);
    throwOnce(asyncStorageMock.setItem, 'disk full');
    expect((await service.storeWellnessBlob('w', { a: 1 }, 'level_2_assessment_data')).success).toBe(false);

    // storeGeneralData: failing encryption (non-general tier), then a failing write.
    throwOnce(encryptionMock.encryptData, 'encrypt failed');
    expect((await service.storeGeneralData('g2', { a: 1 }, 'performance_tier')).success).toBe(false);
    throwOnce(asyncStorageMock.setItem, 'disk full');
    expect((await service.storeGeneralData('g3', { a: 1 }, 'general_tier')).success).toBe(false);

    // retrieveWellnessBlob: failing decrypt of a planted record, then a failing read.
    mockAsyncStorageMap.set(
      'wellness_async_tampered',
      JSON.stringify({ encryptedData: 'bogus', iv: 'x', tag: 'x', salt: 'x', metadata: {}, checksum: 'x' })
    );
    throwOnce(encryptionMock.decryptData, 'tag verification failed');
    await expect(service.retrieveWellnessBlob('tampered')).rejects.toThrow(/tag verification/);
    throwOnce(asyncStorageMock.getItem, 'read failed');
    await expect(service.retrieveWellnessBlob('anything')).rejects.toThrow(/read failed/);

    // retrieveGeneralData: failing read (swallowed to null).
    throwOnce(asyncStorageMock.getItem, 'read failed');
    expect(await service.retrieveGeneralData('g')).toBeNull();

    // deleteWellnessBlob: failing remove.
    throwOnce(asyncStorageMock.removeItem, 'remove failed');
    await expect(service.deleteWellnessBlob('ok')).rejects.toThrow(/remove failed/);

    // clearAllWellnessData: failing enumeration, then a failing SecureStore delete.
    throwOnce(asyncStorageMock.getAllKeys, 'enumerate failed');
    await expect(service.clearAllWellnessData()).rejects.toThrow(/enumerate failed/);
    throwOnce(secureStoreMock.deleteItemAsync, 'keychain locked');
    await expect(service.clearAllWellnessData()).rejects.toThrow(/keychain locked/);

    expect(auditKeysWritten()).toEqual([]);
    expect(auditKeys()).toEqual([]);
  });
});

describe('account erasure removes the storage-access audit logs', () => {
  it('clearAllWellnessData sweeps planted audit_log_* residue on BOTH branches', async () => {
    // Raw residue, as a shipped install left it: depends on no production writer.
    const plant = () => {
      mockAsyncStorageMap.set(
        `${AUDIT_PREFIX}1700000000000`,
        JSON.stringify({ storageKey: 'assessment_async_erased-id', success: false })
      );
      mockAsyncStorageMap.set(`${AUDIT_PREFIX}1700000000003`, '{}');
    };

    plant();
    expect(auditKeys().length).toBe(2);
    await service.clearAllWellnessData();
    expect(auditKeys()).toEqual([]);

    plant();
    expect(auditKeys().length).toBe(2);
    await service.clearAllWellnessData({ deleteMasterKey: true });
    expect(auditKeys()).toEqual([]);
  });

  it('sweeps audit_log_* records left by earlier installs', async () => {
    // Unlike the SecureStore half of DEBUG-355, this defect is fixable
    // retroactively: the keys enumerate, so the prefix in the sweep reaches
    // records already written on shipped builds. No sweeper or persisted index
    // is required.
    //
    // The `crisis_tier` fixtures below are deliberate and must NOT be retargeted
    // to `assessment_tier`: this test is specifically about records left behind
    // by ALREADY-SHIPPED installs, which wrote `crisis_tier` audit entries from
    // the tier MAINT-378 deleted. These are raw JSON planted straight into
    // AsyncStorage.
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
    // Shipped-install residue, planted raw: no production code writes the audit
    // records (MAINT-790) or the index (MAINT-716), so without these the
    // whole-store assertion below would pass vacuously. The guard lines prove the
    // plants are present.
    mockAsyncStorageMap.set(
      `${AUDIT_PREFIX}1700000000004`,
      JSON.stringify({ storageKey: 'assessment_async_erased-id', success: false })
    );
    expect(auditKeys().length).toBeGreaterThan(0);
    mockAsyncStorageMap.set(
      STORAGE_METADATA_INDEX_KEY,
      JSON.stringify([['assessment_async_planted-record', { storageTier: 'assessment_tier' }]])
    );
    expect(JSON.stringify([...mockAsyncStorageMap.entries()])).toContain(STORAGE_METADATA_INDEX_KEY);

    await service.clearAllWellnessData({ deleteMasterKey: true });

    // DEBUG-381 WIDENED THIS, in the shape MAINT-378 specified rather than the
    // one DEBUG-381 originally proposed. The original plan was a whole-store
    // `not.toContain('crisis_tier')`. MAINT-378 deleted the crisis tier, so no
    // writer produces `storageTier: 'crisis_tier'` at all and that assertion
    // would pass VACUOUSLY — green whether or not the sweep works, which is the
    // one thing a privacy pin must never be.
    //
    // So the widened form targets the SURVIVING KEY, not a tier string: after
    // erasure `storage_metadata_index` must be absent outright, against the
    // index planted above. Unlike a tier name it cannot be quietly emptied of
    // meaning by a future tier removal.
    //
    // Both stores, not just AsyncStorage: asserting over one under-asserts
    // invisibly, because the gap only shows when the other happens to be
    // non-empty.
    const dump = JSON.stringify([
      ...mockAsyncStorageMap.entries(),
      ...mockSecureStoreMap.entries(),
    ]);
    expect(dump).not.toContain(STORAGE_METADATA_INDEX_KEY);

    // Kept alongside the whole-store form rather than replaced by it. This one
    // names the prefix THIS item exists for, so a regression here points at
    // `audit_log_` directly instead of at "something, somewhere, survived".
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
  it('a full account-deletion wipe deletes every account-scoped erasure key (DEBUG-762)', async () => {
    // Positive control for the survivor assertion below: it only means something if the
    // keys it does NOT list really are gone. The consent record, legal-gate acceptances,
    // age check and device anchors belong to the account and go with it.
    expect([...ACCOUNT_ERASURE_SECURE_STORE_KEYS].length).toBe(5);
    for (const key of ACCOUNT_ERASURE_SECURE_STORE_KEYS as readonly string[]) {
      mockSecureStoreMap.set(key, JSON.stringify({ planted: true }));
    }

    await service.clearAllWellnessData({ deleteMasterKey: true });

    for (const key of ACCOUNT_ERASURE_SECURE_STORE_KEYS as readonly string[]) {
      expect([key, mockSecureStoreMap.has(key)]).toEqual([key, false]);
    }
  });

  it('preserves the deletion evidence (the attestation and the consent-history fallback)', async () => {
    // The account-deletion attestation is DELIBERATELY excluded from the sweep
    // (Art. 17(3)(b) demonstrability). Widening the sweep must not widen it into these.
    for (const key of ERASURE_EXCLUDED_SECURE_STORE_KEYS as readonly string[]) {
      mockSecureStoreMap.set(key, JSON.stringify({ preserved: true }));
    }

    await service.clearAllWellnessData({ deleteMasterKey: true });

    for (const key of ERASURE_EXCLUDED_SECURE_STORE_KEYS as readonly string[]) {
      expect(mockSecureStoreMap.has(key)).toBe(true);
    }
  });
});
