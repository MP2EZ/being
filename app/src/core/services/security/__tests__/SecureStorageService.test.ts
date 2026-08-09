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
 *   - storeAssessmentData / retrieveAssessmentData round-trip
 *   - storeWellnessBlob / retrieveWellnessBlob round-trip
 *   - Assessment vs wellness-blob go to separate prefixes (prefix routing)
 *   - Audit log captures store/retrieve operations
 *   - Pre-init guard: operations before initialize() return failure
 *   - deleteSecureData removes data
 *   - getStorageMetrics returns structured shape
 *   - No public writer produces a key under CRISIS_ASYNC_PREFIX
 *
 * MAINT-378 removed the crisis storage tier (storeCrisisData /
 * retrieveCrisisData / 'crisis_tier'). The tier-agnostic machinery these tests
 * exercised — hybrid routing, legacy SecureStore fallback + migration,
 * migration-marker idempotence, audit logging, size caps, lazy init,
 * concurrency, the erasure sweep — is unchanged, so those cases were REPOINTED
 * to the assessment tier rather than deleted: assessment_tier walks the same
 * code paths the crisis tier did. Only the genuinely crisis-shaped cases (the
 * crisis round-trip and crisis-vs-assessment isolation) were dropped.
 *
 * Phase A also added a NODE_ENV=test guard in the constructor so the
 * setInterval cleanup scheduler doesn't keep Jest alive. Verified
 * indirectly: this test suite exits cleanly without --forceExit.
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
    encryptAssessmentData: jest.fn(async (data: any) => wrap(data, 'level_2_assessment_data')),
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

// FileSystem: only used in exportStorageData which isn't under test here.
// Provide a minimal stub so the module imports don't fail.
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock-docs/',
  writeAsStringAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({ exists: false, size: 0 })),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

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
const { default: service, SECURE_STORAGE_CONFIG } = require('../SecureStorageService');

beforeEach(() => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
});

describe('SecureStorageService — assessment data tier', () => {
  it('storeAssessmentData → retrieveAssessmentData round-trips PHQ-9 data', async () => {
    await service.initialize();

    const phq9 = {
      type: 'PHQ-9' as const,
      responses: [1, 2, 3, 0, 2, 1, 3, 2, 0],
      totalScore: 14,
      timestamp: 1716000000000,
      userId: 'user-1',
    };

    const storeResult = await service.storeAssessmentData('assess-1', phq9);
    expect(storeResult.success).toBe(true);
    // INFRA-144: hybrid storage routes assessment ciphertext to AsyncStorage
    // under the assessment_async_ prefix; legacy assessment_secure_ remains as
    // the migration fallback only.
    expect(storeResult.storageKey).toMatch(/assessment_async_assess-1/);

    const retrieved = await service.retrieveAssessmentData('assess-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.data).toEqual(phq9);
    expect(retrieved?.metadata.storageTier).toBe('assessment_tier');
    expect(retrieved?.metadata.encrypted).toBe(true);
  });

  // Repointed from 'assessment tier is isolated from crisis tier' (MAINT-378).
  // The property under test is prefix routing — the same logical key stored via
  // two different writers must not collide — which assessment-vs-wellness-blob
  // exercises identically now that the crisis tier is gone.
  it('assessment tier is isolated from the wellness-blob namespace (separate prefixes)', async () => {
    await service.initialize();

    await service.storeWellnessBlob('overlap', { source: 'blob' }, 'level_2_assessment_data');
    await service.storeAssessmentData('overlap', {
      type: 'GAD-7',
      responses: [1, 0, 1, 0, 1, 0, 1],
      totalScore: 4,
      timestamp: Date.now(),
      userId: 'u',
    });

    const blob = await service.retrieveWellnessBlob('overlap');
    const assess = await service.retrieveAssessmentData('overlap');

    // Same logical key, different namespaces → both round-trip independently
    expect(blob).toEqual({ source: 'blob' });
    expect((assess?.data as any).type).toBe('GAD-7');
    expect(mockAsyncStorageMap.has('assessment_async_overlap')).toBe(true);
    expect(mockAsyncStorageMap.has('wellness_async_overlap')).toBe(true);
  });
});

describe('SecureStorageService — audit log', () => {
  it('logs successful store and retrieve operations', async () => {
    await service.initialize();

    await service.storeAssessmentData('audit-1', {
      type: 'PHQ-9',
      responses: [0, 0, 0, 0, 0, 0, 0, 0, 1],
      totalScore: 1,
      timestamp: 0,
      userId: 'u',
    });
    await service.retrieveAssessmentData('audit-1');

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

describe('SecureStorageService — lifecycle and metrics', () => {
  it('storeAssessmentData lazily auto-initializes if called before initialize() (INFRA-144 boot-order fix)', async () => {
    await service.destroy();

    // Pre-INFRA-144 this returned a failure result. Post-fix, store/retrieve
    // methods await encryptionService.initialize() (idempotent) so that
    // Zustand-persist rehydration paths that fire at module load can
    // succeed without depending on App.tsx ordering.
    const result = await service.storeAssessmentData('lazy-init', {
      type: 'PHQ-9',
      responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      totalScore: 0,
      timestamp: 0,
      userId: 'u',
    });
    expect(result.success).toBe(true);
  });

  it('getStorageMetrics returns structured shape', async () => {
    await service.initialize();

    await service.storeAssessmentData('metric-1', {
      type: 'GAD-7',
      responses: [1, 1, 1, 1, 1, 1, 1],
      totalScore: 7,
      timestamp: 0,
      userId: 'u',
    });

    const metrics = await service.getStorageMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics).toBe('object');
    expect(metrics).not.toBeNull();
    // MAINT-378 removed the `crisisEntries` field; `assessmentEntries` is the
    // surviving per-tier counter and must actually count the write above.
    expect(metrics.assessmentEntries).toBeGreaterThanOrEqual(1);
    expect(metrics).not.toHaveProperty('crisisEntries');
  });

  it('deleteSecureData removes stored assessment data', async () => {
    await service.initialize();

    await service.storeAssessmentData('to-delete', {
      type: 'PHQ-9',
      responses: [0, 1, 0, 1, 0, 1, 0, 1, 0],
      totalScore: 4,
      timestamp: 0,
      userId: 'u',
    });
    expect(await service.retrieveAssessmentData('to-delete')).not.toBeNull();

    // deleteSecureData takes the logical key (it tries every tier prefix internally).
    await service.deleteSecureData('to-delete');

    const after = await service.retrieveAssessmentData('to-delete');
    expect(after).toBeNull();
  });
});

describe('SecureStorageService — concurrent writes', () => {
  it('two concurrent stores both succeed (no last-writer corruption)', async () => {
    await service.initialize();

    const mk = (userId: string, totalScore: number) => ({
      type: 'PHQ-9' as const,
      responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      totalScore,
      timestamp: 0,
      userId,
    });

    const [r1, r2] = await Promise.all([
      service.storeAssessmentData('concur-a', mk('a', 1)),
      service.storeAssessmentData('concur-b', mk('b', 2)),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    const [a, b] = await Promise.all([
      service.retrieveAssessmentData('concur-a'),
      service.retrieveAssessmentData('concur-b'),
    ]);
    expect(a?.data).toEqual(mk('a', 1));
    expect(b?.data).toEqual(mk('b', 2));
  });
});

describe('SecureStorageService — INFRA-144 hybrid storage', () => {
  // Repointed from the crisis equivalent (MAINT-378). Aimed at the wellness-blob
  // writer rather than the assessment one so it is not a duplicate of
  // 'assessment ciphertext writes to AsyncStorage, not SecureStore' below —
  // storeWellnessBlob is a third public writer and this is its only
  // no-SecureStore-write assertion.
  it('wellness-blob ciphertext writes to AsyncStorage, not SecureStore (post-INFRA-144)', async () => {
    await service.initialize();
    await service.storeWellnessBlob('hybrid-1', { signal: 'x' }, 'level_2_assessment_data');

    expect(mockAsyncStorageMap.has('wellness_async_hybrid-1')).toBe(true);
    expect(mockSecureStoreMap.size).toBe(0);
  });

  it('reads from legacy SecureStore key and migrates to AsyncStorage on first read', async () => {
    await service.initialize();

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

    const retrieved = await service.retrieveAssessmentData('legacy-1');
    expect(retrieved?.data).toEqual({ from: 'legacy' });

    // After migration: ciphertext now in AsyncStorage, legacy SecureStore key
    // deleted, migration marker set.
    expect(mockAsyncStorageMap.get('assessment_async_legacy-1')).toBe(legacyPayload);
    expect(mockSecureStoreMap.has(legacyKey)).toBe(false);
    expect(mockAsyncStorageMap.get(`wellness_migrated:${legacyKey}`)).toBe('v1');
  });

  it('migration is idempotent — second read does not re-attempt SecureStore', async () => {
    await service.initialize();

    // Pre-mark migrated so the legacy fallback is skipped even if data exists.
    const legacyKey = 'assessment_secure_idemp-1';
    mockSecureStoreMap.set(legacyKey, 'should-never-be-read');
    mockAsyncStorageMap.set(`wellness_migrated:${legacyKey}`, 'v1');

    // No AsyncStorage value at the hybrid key, so retrieve should return null
    // without falling back to the legacy SecureStore copy.
    const retrieved = await service.retrieveAssessmentData('idemp-1');
    expect(retrieved).toBeNull();
    expect(mockSecureStoreMap.get(legacyKey)).toBe('should-never-be-read');
  });

  it('storeAssessmentData marks legacy key migrated so stale SecureStore copies are ignored', async () => {
    await service.initialize();

    // Pretend there's a stale legacy copy left behind.
    const legacyKey = 'assessment_secure_fresh-1';
    mockSecureStoreMap.set(legacyKey, 'stale-data');

    // A fresh write under the hybrid path should set the migration marker so
    // subsequent reads ignore the stale SecureStore entry.
    const fresh = {
      type: 'PHQ-9' as const,
      responses: [3, 3, 3, 3, 3, 3, 3, 3, 3],
      totalScore: 27,
      timestamp: 0,
      userId: 'u',
    };
    await service.storeAssessmentData('fresh-1', fresh);
    expect(mockAsyncStorageMap.get(`wellness_migrated:${legacyKey}`)).toBe('v1');

    const retrieved = await service.retrieveAssessmentData('fresh-1');
    expect(retrieved?.data).toEqual(fresh);
  });

  it('assessment ciphertext writes to AsyncStorage, not SecureStore (post-INFRA-144)', async () => {
    await service.initialize();
    await service.storeAssessmentData('assess-hybrid', {
      type: 'PHQ-9',
      responses: [0, 1, 2, 3, 0, 1, 2, 3, 0],
      totalScore: 12,
      timestamp: 0,
      userId: 'u',
    });

    expect(mockAsyncStorageMap.has('assessment_async_assess-hybrid')).toBe(true);
    expect(mockSecureStoreMap.has('assessment_secure_assess-hybrid')).toBe(false);

    const retrieved = await service.retrieveAssessmentData('assess-hybrid');
    expect((retrieved?.data as any).totalScore).toBe(12);
  });

  it('storeWellnessBlob → retrieveWellnessBlob round-trips arbitrary payloads', async () => {
    await service.initialize();

    const big = { entries: Array.from({ length: 50 }, (_, i) => ({ idx: i, n: i * 7 })) };
    const result = await service.storeWellnessBlob('test-blob', big, 'level_2_assessment_data');
    expect(result.success).toBe(true);

    const back = await service.retrieveWellnessBlob('test-blob');
    expect(back).toEqual(big);
  });

  it('large payload (>2KB) round-trips successfully (the headline INFRA-144 fix)', async () => {
    await service.initialize();

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
    const result = await service.storeAssessmentData('big-payload', big);
    expect(result.success).toBe(true);
    expect(result.dataSize).toBeGreaterThan(2048);

    const back = await service.retrieveAssessmentData('big-payload');
    expect((back?.data as any).history.length).toBe(200);
  });

  it('wellness payload size cap (256KB) is enforced', async () => {
    await service.initialize();

    // ~300KB of payload after wrap — should trip the cap. The oversize field
    // sits inside an otherwise well-formed assessment record so the rejection
    // provably comes from validateStorageSize, not from a malformed payload.
    const result = await service.storeAssessmentData('oversize', {
      type: 'PHQ-9',
      responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      totalScore: 0,
      timestamp: 0,
      userId: 'x'.repeat(300 * 1024),
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/payload size limit exceeded/i);
  });

  it('retrieveWellnessBlob propagates decryption failure when ciphertext is tampered', async () => {
    await service.initialize();

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
    await service.initialize();

    await service.storeAssessmentData('wipe-2', {
      type: 'GAD-7',
      responses: [0, 0, 0, 0, 0, 0, 0],
      totalScore: 0,
      timestamp: 0,
      userId: 'u',
    });
    await service.storeWellnessBlob('wipe-3', { b: 2 }, 'level_2_assessment_data');
    mockAsyncStorageMap.set('wellness_migrated:assessment_secure_old', 'v1');

    // DEBUG-355: `logStorageAccess` persists an `audit_log_${Date.now()}` entry
    // on every FAILED operation — since MAINT-378 removed the crisis tier, that
    // is the only remaining writer, so the audit_log_ assertion below needs a
    // real failure to be non-vacuous. A >256KB payload trips validateStorageSize
    // and lands in storeAssessmentData's catch, which logs the failure. That
    // prefix was outside the sweep, so the record survived account erasure.
    const failed = await service.storeAssessmentData('wipe-4', {
      type: 'PHQ-9',
      responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      totalScore: 0,
      timestamp: 0,
      userId: 'x'.repeat(300 * 1024),
    });
    expect(failed.success).toBe(false);
    expect(
      Array.from(mockAsyncStorageMap.keys()).some((k) => k.startsWith('audit_log_'))
    ).toBe(true);

    await service.clearAllWellnessData();

    const keysAfter = Array.from(mockAsyncStorageMap.keys());
    expect(keysAfter.some((k) => k.startsWith('assessment_async_'))).toBe(false);
    expect(keysAfter.some((k) => k.startsWith('wellness_async_'))).toBe(false);
    expect(keysAfter.some((k) => k.startsWith('wellness_migrated:'))).toBe(false);
    // Asserted here rather than left as an unobserved line in the filter.
    expect(keysAfter.some((k) => k.startsWith('audit_log_'))).toBe(false);
  });

  // MAINT-378 behavioural no-writer proof. The crisis storage tier is gone, but
  // CRISIS_ASYNC_PREFIX is deliberately RETAINED in SWEPT_ASYNC_PREFIXES and in
  // deleteSecureData as a defensive erasure floor for already-shipped installs.
  // That retention is only defensible while the namespace is genuinely
  // write-free, so prove it behaviourally: exercise every public writer and
  // assert none of them lands a key there. Asserts against the exported constant
  // so a rename cannot make this pass by drifting away from production.
  it('no public writer produces a key under CRISIS_ASYNC_PREFIX', async () => {
    await service.initialize();

    await service.storeAssessmentData('no-crisis-1', {
      type: 'PHQ-9',
      responses: [3, 3, 3, 3, 3, 3, 3, 3, 3],
      totalScore: 27,
      timestamp: 0,
      userId: 'u',
    });
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
    await service.initialize();
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

  // Consent audit-trail keys (lawful-basis evidence) and the device-identity
  // anchor must SURVIVE erasure — deleting them is itself a compliance defect.
  it('clearAllWellnessData preserves consent + identity keys (audit trail / identity anchor)', async () => {
    await service.initialize();
    mockSecureStoreMap.set('consent_record_v1', 'consent');
    mockSecureStoreMap.set('consent_history_v1', 'history');
    mockSecureStoreMap.set('legal_gate_consents_v1', 'legal');
    mockSecureStoreMap.set('age_verification_v1', 'age');
    mockSecureStoreMap.set('auth_device_id', 'device-anchor');
    mockSecureStoreMap.set('stoic_practice_state', 'cipher'); // wellness key — SHOULD be swept

    await service.clearAllWellnessData();

    expect(mockSecureStoreMap.has('consent_record_v1')).toBe(true);
    expect(mockSecureStoreMap.has('consent_history_v1')).toBe(true);
    expect(mockSecureStoreMap.has('legal_gate_consents_v1')).toBe(true);
    expect(mockSecureStoreMap.has('age_verification_v1')).toBe(true);
    expect(mockSecureStoreMap.has('auth_device_id')).toBe(true);
    expect(mockSecureStoreMap.has('stoic_practice_state')).toBe(false); // sanity
  });

  // The master key destroys access to ALL wellness ciphertext, so it is only
  // deleted on a full account-deletion wipe — never on logout/partial clears.
  it('clearAllWellnessData deletes the master key ONLY on full account-deletion wipe', async () => {
    await service.initialize();
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
    await service.initialize();

    await service.storeWellnessBlob('del-blob', { x: 1 }, 'level_2_assessment_data');
    mockSecureStoreMap.set('consent_history_v1', 'legacy-cipher'); // simulate unmigrated

    await service.deleteWellnessBlob('del-blob', 'consent_history_v1');

    expect(mockAsyncStorageMap.has('wellness_async_del-blob')).toBe(false);
    expect(mockSecureStoreMap.has('consent_history_v1')).toBe(false);
    expect(mockAsyncStorageMap.get('wellness_migrated:consent_history_v1')).toBe('v1');
  });

  it("migrates plaintext_json legacy data by encrypting on the fly (assessment + consent path)", async () => {
    await service.initialize();

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

    // Simulates Zustand persist rehydration at module load, ahead of
    // App.tsx's SecureStorageService.initialize(). Must not throw.
    const result = await service.storeWellnessBlob('rehydrate', { a: 1 }, 'level_2_assessment_data');
    expect(result.success).toBe(true);

    const back = await service.retrieveWellnessBlob('rehydrate');
    expect(back).toEqual({ a: 1 });
  });
});
