/**
 * SecureStorageService round-trip tests (audit TEST-02 paydown, part 2)
 *
 * Strategy: mock EncryptionService with a passthrough that wraps/
 * unwraps data in an EncryptedDataPackage shape. Mock SecureStore and
 * AsyncStorage with in-memory maps. The mocks don't perform real crypto
 * (covered by EncryptionService.test.ts) — they exercise the storage
 * layer: prefix routing, audit log writes, metadata caching, performance
 * thresholds, lifecycle, and the public surface.
 *
 * What this tests:
 *   - retrieveWellnessBlob over planted wellness ciphertext
 *   - storeWellnessBlob / retrieveWellnessBlob round-trip
 *   - Wellness-blob and residual assessment_async_ records use separate prefixes
 *   - Audit log captures store/retrieve operations (in memory only)
 *   - Lazy init: store/retrieve work without any initialize() call
 *   - The legacy SecureStore -> AsyncStorage migration on retrieveWellnessBlob
 *   - No public writer produces a key under CRISIS_ASYNC_PREFIX
 *
 * MAINT-716 removed `storeAssessmentData` (no production caller) and MAINT-790
 * removed `retrieveAssessmentData`, `deleteSecureData`, `initialize()`,
 * `getStorageMetrics` and the rest of the unwired lifecycle surface. The
 * `assessment_async_` sweep stays as a defensive floor for records on shipped
 * installs, so the sweep case plants raw ciphertext into the mock store. The
 * legacy-migration cases ran through `retrieveAssessmentData`; they now run
 * through `retrieveWellnessBlob`, which shares `readWithLegacyFallback`.
 *
 * MAINT-378 removed the crisis storage tier (storeCrisisData /
 * retrieveCrisisData / 'crisis_tier'). The tier-agnostic machinery these tests
 * exercised — hybrid routing, legacy SecureStore fallback + migration,
 * migration-marker idempotence, audit logging, size caps, lazy init,
 * concurrency, the erasure sweep — is unchanged, so those cases were REPOINTED
 * to the assessment tier rather than deleted: assessment_tier walks the same
 * code paths the crisis tier did. Only the genuinely crisis-shaped cases (the
 * crisis round-trip and crisis-vs-assessment isolation) were dropped.
 */

// In-memory backing for storage primitives.
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

// EncryptionService: passthrough that wraps payload in the
// EncryptedDataPackage shape SecureStorageService expects. Real crypto
// behavior is covered by EncryptionService.test.ts.
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
  const unwrap = (pkg: any) => JSON.parse(Buffer.from(pkg.encryptedData, 'base64').toString('utf-8'));

  const stub = {
    encryptData: jest.fn(async (data: any, level: string) => wrap(data, level)),
    decryptData: jest.fn(async (pkg: any) => unwrap(pkg)),
    encryptCrisisData: jest.fn(async (data: any) => wrap(data, 'level_1_crisis_responses')),
    initialize: jest.fn(async () => undefined),
    destroy: jest.fn(async () => undefined),
    deleteMasterKey: jest.fn(async () => undefined),
    getInstance: jest.fn(),
  };
  stub.getInstance.mockReturnValue(stub);
  return {
    __esModule: true,
    default: stub,
  };
});

// Force Platform.OS = ios so any platform-conditional paths take the
// native branch (matches T2.1's expectation).
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
}));

// Import after mocks. The default export is the singleton instance
// (`SecureStorageService.getInstance()`), not the class itself — call
// methods directly on it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  default: service,
  SECURE_STORAGE_CONFIG,
  ACCOUNT_ERASURE_SECURE_STORE_KEYS,
  ERASURE_EXCLUDED_SECURE_STORE_KEYS,
} = require('../SecureStorageService');

const plantPackage = (data: unknown): string =>
  JSON.stringify({
    encryptedData: Buffer.from(JSON.stringify(data), 'utf-8').toString('base64'),
    iv: 'mock-iv',
    tag: 'mock-tag',
    salt: 'mock-salt',
    metadata: {},
    checksum: 'mock-checksum',
  });

/**
 * Raw `wellness_async_<id>` ciphertext. The package is one the passthrough stub
 * can decrypt, so `retrieveWellnessBlob` takes its success path without a writer.
 */
const plantWellness = (id: string, data: unknown): void => {
  mockAsyncStorageMap.set(`wellness_async_${id}`, plantPackage(data));
};

/**
 * Raw `assessment_async_<id>` ciphertext, as a shipped install left it. Nothing
 * reads or writes the prefix any more (MAINT-716, MAINT-790); only the erasure
 * sweep still names it.
 */
const plantAssessment = (id: string, data: unknown): void => {
  mockAsyncStorageMap.set(`assessment_async_${id}`, plantPackage(data));
};

beforeEach(() => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
});

describe('SecureStorageService — wellness blob tier', () => {
  it('retrieveWellnessBlob decrypts a planted wellness_async_ PHQ-9 record', async () => {
    const phq9 = {
      type: 'PHQ-9' as const,
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 1716000000000,
      userId: 'user-1',
    };

    // INFRA-144: hybrid storage keeps wellness ciphertext in AsyncStorage under
    // the wellness_async_ prefix; legacy SecureStore keys are the migration
    // fallback only.
    plantWellness('assess-1', phq9);
    expect(mockAsyncStorageMap.has('wellness_async_assess-1')).toBe(true);

    expect(await service.retrieveWellnessBlob('assess-1')).toEqual(phq9);
  });

  // Repointed from 'assessment tier is isolated from crisis tier' (MAINT-378).
  // The property under test is prefix routing — the same logical key under two
  // namespaces must not collide — which a residual `assessment_async_` record
  // exercises now that nothing reads that namespace.
  it('wellness blobs are isolated from a residual assessment_async_ record (separate prefixes)', async () => {
    await service.storeWellnessBlob('overlap', { source: 'blob' }, 'level_2_assessment_data');
    plantAssessment('overlap', {
      type: 'GAD-7',
      responses: [1, 0, 1, 0, 1, 0, 1],
      totalScore: 4,
      timestamp: Date.now(),
      userId: 'u',
    });

    expect(await service.retrieveWellnessBlob('overlap')).toEqual({ source: 'blob' });
    expect(mockAsyncStorageMap.has('assessment_async_overlap')).toBe(true);
    expect(mockAsyncStorageMap.has('wellness_async_overlap')).toBe(true);
  });
});

describe('SecureStorageService — audit log', () => {
  it('logs successful store and retrieve operations', async () => {
    await service.storeWellnessBlob('audit-1', { totalScore: 1 }, 'level_2_assessment_data');
    await service.retrieveWellnessBlob('audit-1');

    const accessLog = await service.getAccessLog();
    expect(Array.isArray(accessLog)).toBe(true);

    const storeOps = accessLog.filter(
      (e: any) => e.operationType === 'store' && e.storageKey.includes('audit-1')
    );
    const retrieveOps = accessLog.filter(
      (e: any) => e.operationType === 'retrieve' && e.storageKey.includes('audit-1')
    );

    expect(storeOps.length).toBeGreaterThanOrEqual(1);
    expect(retrieveOps.length).toBeGreaterThanOrEqual(1);
    expect(storeOps[0].success).toBe(true);
    expect(storeOps[0].storageTier).toBe('assessment_tier');
  });
});

describe('SecureStorageService — lifecycle', () => {
  it('storeWellnessBlob lazily auto-initializes the encryption layer (INFRA-144 boot-order fix)', async () => {
    await service.destroy();

    // Store/retrieve methods await encryptionService.initialize() (idempotent)
    // so that Zustand-persist rehydration paths that fire at module load can
    // succeed. Nothing else initialises this service (MAINT-790).
    const result = await service.storeWellnessBlob(
      'lazy-init',
      { totalScore: 0 },
      'level_2_assessment_data'
    );
    expect(result.success).toBe(true);
  });
});

describe('SecureStorageService — concurrent writes', () => {
  it('two concurrent stores both succeed (no last-writer corruption)', async () => {
    const [r1, r2] = await Promise.all([
      service.storeWellnessBlob('concur-a', { userId: 'a', totalScore: 1 }, 'level_2_assessment_data'),
      service.storeWellnessBlob('concur-b', { userId: 'b', totalScore: 2 }, 'level_2_assessment_data'),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    const [a, b] = await Promise.all([
      service.retrieveWellnessBlob('concur-a'),
      service.retrieveWellnessBlob('concur-b'),
    ]);
    expect(a).toEqual({ userId: 'a', totalScore: 1 });
    expect(b).toEqual({ userId: 'b', totalScore: 2 });
  });
});

describe('SecureStorageService — INFRA-144 hybrid storage', () => {
  // Repointed from the crisis equivalent (MAINT-378). The assessment-writer twin
  // of this case went with `storeAssessmentData` (MAINT-716); this is now the
  // only no-SecureStore-write assertion for a public writer.
  it('wellness-blob ciphertext writes to AsyncStorage, not SecureStore (post-INFRA-144)', async () => {
    await service.storeWellnessBlob('hybrid-1', { signal: 'x' }, 'level_2_assessment_data');

    expect(mockAsyncStorageMap.has('wellness_async_hybrid-1')).toBe(true);
    expect(mockSecureStoreMap.size).toBe(0);
  });

  it('reads from legacy SecureStore key and migrates to AsyncStorage on first read', async () => {
    // Seed a legacy SecureStore record (simulates a pre-INFRA-144 install).
    const legacyKey = 'assessment_secure_legacy-1';
    const legacyPayload = JSON.stringify({
      encryptedData: Buffer.from(JSON.stringify({ from: 'legacy' }), 'utf-8').toString('base64'),
      iv: 'mock-iv',
      tag: 'mock-tag',
      salt: 'mock-salt',
      metadata: {
        algorithm: 'AES-GCM',
        keyVersion: 1,
        ivLength: 12,
        tagLength: 16,
        encryptedAt: 0,
        sensitivityLevel: 'level_2_assessment_data',
        performanceMetrics: { encryptionTimeMs: 0, dataSize: 0, encryptedSize: 0 },
      },
      checksum: 'mock-checksum',
    });
    mockSecureStoreMap.set(legacyKey, legacyPayload);

    const retrieved = await service.retrieveWellnessBlob('legacy-1', legacyKey);
    expect(retrieved).toEqual({ from: 'legacy' });

    // After migration: ciphertext now in AsyncStorage, legacy SecureStore key
    // deleted, migration marker set.
    expect(mockAsyncStorageMap.get('wellness_async_legacy-1')).toBe(legacyPayload);
    expect(mockSecureStoreMap.has(legacyKey)).toBe(false);
    expect(mockAsyncStorageMap.get(`wellness_migrated:${legacyKey}`)).toBe('v1');
  });

  it('migration is idempotent — second read does not re-attempt SecureStore', async () => {
    // Pre-mark migrated so the legacy fallback is skipped even if data exists.
    const legacyKey = 'assessment_secure_idemp-1';
    mockSecureStoreMap.set(legacyKey, 'should-never-be-read');
    mockAsyncStorageMap.set(`wellness_migrated:${legacyKey}`, 'v1');

    // No AsyncStorage value at the hybrid key, so retrieve should return null
    // without falling back to the legacy SecureStore copy.
    const retrieved = await service.retrieveWellnessBlob('idemp-1', legacyKey);
    expect(retrieved).toBeNull();
    expect(mockSecureStoreMap.get(legacyKey)).toBe('should-never-be-read');
  });

  it('migration decrypt-verifies first: an undecryptable legacy copy is NOT migrated and stays in SecureStore', async () => {
    const legacyKey = 'assessment_secure_corrupt-1';
    mockSecureStoreMap.set(legacyKey, plantPackage({ from: 'legacy' }));

    const enc = jest.requireMock('../EncryptionService').default;
    const originalDecrypt = enc.decryptData;
    enc.decryptData = jest.fn(async () => {
      throw new Error('AES-GCM authentication tag verification failed');
    });
    try {
      await expect(service.retrieveWellnessBlob('corrupt-1', legacyKey)).rejects.toThrow(/authentication tag/i);
    } finally {
      enc.decryptData = originalDecrypt;
    }

    expect(mockSecureStoreMap.has(legacyKey)).toBe(true);
    expect(mockAsyncStorageMap.has('wellness_async_corrupt-1')).toBe(false);
    expect(mockAsyncStorageMap.has(`wellness_migrated:${legacyKey}`)).toBe(false);
  });

  it('migration writes AsyncStorage BEFORE it deletes the SecureStore copy', async () => {
    const legacyKey = 'assessment_secure_order-1';
    mockSecureStoreMap.set(legacyKey, plantPackage({ from: 'legacy' }));

    const SecureStore = jest.requireMock('expo-secure-store');
    let asyncHadCopyAtDelete: boolean | null = null;
    SecureStore.deleteItemAsync.mockImplementationOnce(async (key: string) => {
      asyncHadCopyAtDelete = mockAsyncStorageMap.has('wellness_async_order-1');
      mockSecureStoreMap.delete(key);
    });

    await service.retrieveWellnessBlob('order-1', legacyKey);

    expect(asyncHadCopyAtDelete).toBe(true);
  });

  it('migration verifies the AsyncStorage read-back: a mismatch throws and the SecureStore copy survives', async () => {
    const legacyKey = 'assessment_secure_readback-1';
    mockSecureStoreMap.set(legacyKey, plantPackage({ from: 'legacy' }));

    const AsyncStorageMock = jest.requireMock('@react-native-async-storage/async-storage');
    // First read (the AsyncStorage-first lookup) misses; the read-back returns
    // something other than what was written.
    AsyncStorageMock.getItem
      .mockImplementationOnce(async () => null) // asyncKey lookup
      .mockImplementationOnce(async () => null) // isMigrated marker lookup
      .mockImplementationOnce(async () => 'corrupted-readback');

    await expect(service.retrieveWellnessBlob('readback-1', legacyKey)).rejects.toThrow(
      /write verification failed/i
    );
    expect(mockSecureStoreMap.has(legacyKey)).toBe(true);
    expect(mockAsyncStorageMap.has(`wellness_migrated:${legacyKey}`)).toBe(false);
  });

  it('deleteWellnessBlob(key, legacyKey) deletes a stale SecureStore copy and marks it migrated', async () => {
    // Pretend there's a stale legacy copy left behind.
    const legacyKey = 'assessment_secure_fresh-1';
    mockSecureStoreMap.set(legacyKey, 'stale-data');

    // Repointed from the `storeAssessmentData` case (MAINT-716): the marker is
    // what makes subsequent reads ignore the stale SecureStore entry, and
    // `deleteWellnessBlob` with a legacy key is the surviving writer of it.
    await service.deleteWellnessBlob('fresh-1', legacyKey);
    expect(mockSecureStoreMap.has(legacyKey)).toBe(false);
    expect(mockAsyncStorageMap.get(`wellness_migrated:${legacyKey}`)).toBe('v1');

    // Re-seeded after the marker is set: the read must not fall back to it.
    mockSecureStoreMap.set(legacyKey, 'stale-data');
    expect(await service.retrieveWellnessBlob('fresh-1', legacyKey)).toBeNull();
    expect(mockSecureStoreMap.get(legacyKey)).toBe('stale-data');
  });

  it('storeWellnessBlob → retrieveWellnessBlob round-trips arbitrary payloads', async () => {
    const big = { entries: Array.from({ length: 50 }, (_, i) => ({ idx: i, n: i * 7 })) };
    const result = await service.storeWellnessBlob('test-blob', big, 'level_2_assessment_data');
    expect(result.success).toBe(true);

    const back = await service.retrieveWellnessBlob('test-blob');
    expect(back).toEqual(big);
  });

  it('large payload (>2KB) round-trips successfully (the headline INFRA-144 fix)', async () => {
    // Build a payload that would have failed validateStorageSize under the
    // legacy SecureStore-only path (which capped at 2KB).
    const big = {
      type: 'PHQ-9' as const,
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 0,
      userId: 'u',
      history: Array.from({ length: 200 }, (_, i) => ({
        idx: i,
        text: 'x'.repeat(50),
      })),
    };
    const result = await service.storeWellnessBlob('big-payload', big, 'level_2_assessment_data');
    expect(result.success).toBe(true);
    expect(result.dataSize).toBeGreaterThan(2048);

    const back = await service.retrieveWellnessBlob<typeof big>('big-payload');
    expect(back?.history.length).toBe(200);
  });

  it('wellness payload size cap (256KB) is enforced', async () => {
    // ~300KB of payload after wrap — should trip the cap. The oversize field
    // sits inside an otherwise well-formed assessment record so the rejection
    // provably comes from validateStorageSize, not from a malformed payload.
    const result = await service.storeWellnessBlob(
      'oversize',
      {
        type: 'PHQ-9',
        responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalScore: 0,
        timestamp: 0,
        userId: 'x'.repeat(300 * 1024),
      },
      'level_2_assessment_data'
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/payload size limit exceeded/i);
  });

  it('retrieveWellnessBlob propagates decryption failure when ciphertext is tampered', async () => {
    // Stub decryptData to simulate AES-GCM auth tag failure on tampered input.
    const enc = jest.requireMock('../EncryptionService').default;
    const originalDecrypt = enc.decryptData;
    enc.decryptData = jest.fn(async () => {
      throw new Error('AES-GCM authentication tag verification failed');
    });

    // Plant a "tampered" ciphertext directly.
    mockAsyncStorageMap.set(
      'wellness_async_tampered',
      JSON.stringify({ encryptedData: 'bogus', iv: 'x', tag: 'x', salt: 'x', metadata: {}, checksum: 'x' })
    );

    await expect(service.retrieveWellnessBlob('tampered')).rejects.toThrow(/authentication tag/i);

    // Restore for subsequent tests.
    enc.decryptData = originalDecrypt;
  });

  it('clearAllWellnessData sweeps both AsyncStorage prefixes and migration markers', async () => {
    // Explicit `assessment_async_` seed: no code reads or writes the prefix since
    // MAINT-716 / MAINT-790, and the sweep covers it as a defensive floor for
    // shipped installs.
    plantAssessment('wipe-2', { totalScore: 0 });
    await service.storeWellnessBlob('wipe-3', { b: 2 }, 'level_2_assessment_data');
    mockAsyncStorageMap.set('wellness_migrated:assessment_secure_old', 'v1');

    // `audit_log_` has had no writer since MAINT-790 (`auditLogErasure.privacy.test.ts`
    // pins that), so a shipped-install residue record is seeded explicitly.
    mockAsyncStorageMap.set('audit_log_1700000000000', JSON.stringify({ success: false }));
    expect(mockAsyncStorageMap.has('assessment_async_wipe-2')).toBe(true);

    await service.clearAllWellnessData();

    const keysAfter = Array.from(mockAsyncStorageMap.keys());
    expect(keysAfter.some((k) => k.startsWith('assessment_async_'))).toBe(false);
    expect(keysAfter.some((k) => k.startsWith('wellness_async_'))).toBe(false);
    expect(keysAfter.some((k) => k.startsWith('wellness_migrated:'))).toBe(false);
    // Asserted here rather than left as an unobserved line in the filter.
    expect(keysAfter.some((k) => k.startsWith('audit_log_'))).toBe(false);
  });

  // MAINT-378 behavioural no-writer proof. The crisis storage tier is gone, but
  // CRISIS_ASYNC_PREFIX is deliberately RETAINED in SWEPT_ASYNC_PREFIXES as a
  // defensive erasure floor for already-shipped installs.
  // That retention is only defensible while the namespace is genuinely
  // write-free, so prove it behaviourally: exercise every public writer and
  // assert none of them lands a key there. Asserts against the exported constant
  // so a rename cannot make this pass by drifting away from production.
  it('no public writer produces a key under CRISIS_ASYNC_PREFIX', async () => {
    // The assessment writer is gone (MAINT-716); the surviving read and delete
    // paths are exercised in its place.
    plantWellness('no-crisis-1', { totalScore: 27 });
    await service.retrieveWellnessBlob('no-crisis-1');
    await service.deleteWellnessBlob('no-crisis-1');
    await service.storeWellnessBlob(
      'no-crisis-2',
      { safetyPlan: 'not persisted through this service' },
      'level_1_crisis_responses'
    );
    await service.storeGeneralData('no-crisis-3', { a: 1 }, 'general_tier');
    await service.storeGeneralData('no-crisis-4', { a: 2 }, 'performance_tier');

    const crisisPrefixed = Array.from(mockAsyncStorageMap.keys()).filter((k) =>
      k.startsWith(SECURE_STORAGE_CONFIG.CRISIS_ASYNC_PREFIX)
    );
    expect(crisisPrefixed).toEqual([]);
    // Guards the guard: the writers above really did write something, so the
    // emptiness above is a property of the namespace, not of an inert store.
    expect(mockAsyncStorageMap.size).toBeGreaterThan(0);
  });

  // MAINT-241 right-to-erasure key sweep: SecureStore has no enumerate API, so
  // clearAllWellnessData must explicitly delete the fixed wellness keys that
  // live outside the sweepable AsyncStorage prefixes.
  it('clearAllWellnessData sweeps fixed legacy SecureStore wellness keys', async () => {
    mockSecureStoreMap.set('stoic_practice_state', 'cipher');
    mockSecureStoreMap.set('assessment_store_encrypted', 'cipher');
    mockSecureStoreMap.set('subscription_secure_v1', 'cipher');
    mockSecureStoreMap.set('stoic_session_morning', 'cipher');
    mockSecureStoreMap.set('stoic_session_midday', 'cipher');
    mockSecureStoreMap.set('stoic_session_evening', 'cipher');

    await service.clearAllWellnessData();

    expect(mockSecureStoreMap.has('stoic_practice_state')).toBe(false);
    expect(mockSecureStoreMap.has('assessment_store_encrypted')).toBe(false);
    expect(mockSecureStoreMap.has('subscription_secure_v1')).toBe(false);
    expect(mockSecureStoreMap.has('stoic_session_morning')).toBe(false);
    expect(mockSecureStoreMap.has('stoic_session_midday')).toBe(false);
    expect(mockSecureStoreMap.has('stoic_session_evening')).toBe(false);
  });

  // DEBUG-762 — reversed. The consent record, legal-gate acceptances, age check and
  // device anchors belong to the account, so a FULL account-deletion wipe deletes them.
  // Only the two keys that evidence the deletion itself survive.
  const ACCOUNT_ERASURE_KEYS = [
    'consent_record_v1',
    'legal_gate_consents_v1',
    'age_verification_v1',
    'auth_device_id',
    '@being/device_id',
  ];

  it('ACCOUNT_ERASURE_SECURE_STORE_KEYS is exactly the five account-scoped keys', () => {
    expect([...ACCOUNT_ERASURE_SECURE_STORE_KEYS]).toEqual(ACCOUNT_ERASURE_KEYS);
  });

  it('the erasure-excluded list is only the attestation and the consent-history fallback', () => {
    expect([...ERASURE_EXCLUDED_SECURE_STORE_KEYS].sort()).toEqual(
      ['account_deletion_attestation_v1', 'consent_history_v1'].sort()
    );
    for (const key of ACCOUNT_ERASURE_KEYS) {
      expect(ERASURE_EXCLUDED_SECURE_STORE_KEYS as readonly string[]).not.toContain(key);
    }
  });

  it('clearAllWellnessData({deleteMasterKey:true}) deletes the five account keys; the attestation and history fallback survive', async () => {
    for (const key of ACCOUNT_ERASURE_KEYS) mockSecureStoreMap.set(key, 'x');
    mockSecureStoreMap.set('consent_history_v1', 'history');
    mockSecureStoreMap.set('account_deletion_attestation_v1', 'attestation');
    mockSecureStoreMap.set('stoic_practice_state', 'cipher'); // wellness key — sanity

    await service.clearAllWellnessData({ deleteMasterKey: true });

    for (const key of ACCOUNT_ERASURE_KEYS) expect([key, mockSecureStoreMap.has(key)]).toEqual([key, false]);
    expect(mockSecureStoreMap.has('consent_history_v1')).toBe(true);
    expect(mockSecureStoreMap.get('account_deletion_attestation_v1')).toBe('attestation');
    expect(mockSecureStoreMap.has('stoic_practice_state')).toBe(false); // sanity
  });

  it('a PARTIAL clear (no master-key deletion) leaves the account keys alone', async () => {
    for (const key of ACCOUNT_ERASURE_KEYS) mockSecureStoreMap.set(key, 'x');
    mockSecureStoreMap.set('stoic_practice_state', 'cipher');

    await service.clearAllWellnessData();

    for (const key of ACCOUNT_ERASURE_KEYS) expect([key, mockSecureStoreMap.has(key)]).toEqual([key, true]);
    expect(mockSecureStoreMap.has('stoic_practice_state')).toBe(false); // sanity
  });

  it('deletes the account keys BEFORE the master key', async () => {
    const enc = jest.requireMock('../EncryptionService').default;
    for (const key of ACCOUNT_ERASURE_KEYS) mockSecureStoreMap.set(key, 'x');
    let presentAtMasterKeyDelete: string[] = [];
    enc.deleteMasterKey.mockImplementationOnce(async () => {
      presentAtMasterKeyDelete = ACCOUNT_ERASURE_KEYS.filter((k) => mockSecureStoreMap.has(k));
    });

    await service.clearAllWellnessData({ deleteMasterKey: true });

    expect(presentAtMasterKeyDelete).toEqual([]);
  });

  it('a failed account-key delete THROWS (erasure reports failure) and the master key is not deleted', async () => {
    const enc = jest.requireMock('../EncryptionService').default;
    enc.deleteMasterKey.mockClear();
    for (const key of ACCOUNT_ERASURE_KEYS) mockSecureStoreMap.set(key, 'x');
    const SecureStore = jest.requireMock('expo-secure-store');
    const original = SecureStore.deleteItemAsync.getMockImplementation();
    SecureStore.deleteItemAsync.mockImplementation(async (key: string) => {
      if (key === 'consent_record_v1') throw new Error('keychain locked');
      mockSecureStoreMap.delete(key);
    });
    try {
      await expect(service.clearAllWellnessData({ deleteMasterKey: true })).rejects.toThrow(/keychain locked/);
    } finally {
      SecureStore.deleteItemAsync.mockImplementation(original);
    }
    expect(enc.deleteMasterKey).not.toHaveBeenCalled();
  });

  // The master key destroys access to ALL wellness ciphertext, so it is only
  // deleted on a full account-deletion wipe — never on logout/partial clears.
  it('clearAllWellnessData deletes the master key ONLY on full account-deletion wipe', async () => {
    const enc = jest.requireMock('../EncryptionService').default;
    enc.deleteMasterKey.mockClear();

    // Default (logout / partial wipe): master key preserved.
    await service.clearAllWellnessData();
    expect(enc.deleteMasterKey).not.toHaveBeenCalled();

    // Full account-deletion wipe: master key deleted, after the wellness sweep.
    mockSecureStoreMap.set('stoic_practice_state', 'cipher');
    await service.clearAllWellnessData({ deleteMasterKey: true });
    expect(enc.deleteMasterKey).toHaveBeenCalledTimes(1);
    expect(mockSecureStoreMap.has('stoic_practice_state')).toBe(false);
  });

  it('deleteWellnessBlob removes both AsyncStorage copy and legacy SecureStore copy', async () => {
    await service.storeWellnessBlob('del-blob', { x: 1 }, 'level_2_assessment_data');
    mockSecureStoreMap.set('consent_history_v1', 'legacy-cipher'); // simulate unmigrated

    await service.deleteWellnessBlob('del-blob', 'consent_history_v1');

    expect(mockAsyncStorageMap.has('wellness_async_del-blob')).toBe(false);
    expect(mockSecureStoreMap.has('consent_history_v1')).toBe(false);
    expect(mockAsyncStorageMap.get('wellness_migrated:consent_history_v1')).toBe('v1');
  });

  it("migrates plaintext_json legacy data by encrypting on the fly (assessment + consent path)", async () => {
    // Pre-INFRA-144 assessment/consent wrote plain JSON to SecureStore.
    // Migration must encrypt the JSON, not try to decrypt-verify it.
    const legacyKey = 'assessment_store_encrypted';
    const legacyPayload = JSON.stringify({
      completedAssessments: [{ id: 'a1', score: 12 }, { id: 'a2', score: 8 }],
      currentQuestionIndex: 0,
    });
    mockSecureStoreMap.set(legacyKey, legacyPayload);

    const retrieved = await service.retrieveWellnessBlob<{
      completedAssessments: Array<{ id: string; score: number }>;
    }>('assessment_store', legacyKey, {
      legacyFormat: 'plaintext_json',
      sensitivityLevel: 'level_2_assessment_data',
    });

    expect(retrieved?.completedAssessments).toHaveLength(2);
    expect(retrieved?.completedAssessments[0]).toEqual({ id: 'a1', score: 12 });

    // After migration: legacy SecureStore key gone, migration marker set,
    // AsyncStorage now contains a wrapped EncryptedDataPackage (not the
    // original JSON — the migration upgraded it to ciphertext).
    expect(mockSecureStoreMap.has(legacyKey)).toBe(false);
    expect(mockAsyncStorageMap.get(`wellness_migrated:${legacyKey}`)).toBe('v1');
    const asyncStored = mockAsyncStorageMap.get('wellness_async_assessment_store');
    expect(asyncStored).toBeDefined();
    expect(asyncStored).not.toBe(legacyPayload); // not the original plaintext
    expect(JSON.parse(asyncStored!).encryptedData).toBeDefined();
  });

  it('rehydration paths firing before initialize() succeed via lazy init (INFRA-144 boot-order fix)', async () => {
    await service.destroy();

    // Simulates Zustand persist rehydration at module load, before anything has
    // touched the encryption layer. Must not throw.
    const result = await service.storeWellnessBlob('rehydrate', { a: 1 }, 'level_2_assessment_data');
    expect(result.success).toBe(true);

    const back = await service.retrieveWellnessBlob('rehydrate');
    expect(back).toEqual({ a: 1 });
  });
});
