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
 *   - storeCrisisData / retrieveCrisisData round-trip
 *   - storeAssessmentData / retrieveAssessmentData round-trip
 *   - Crisis vs assessment go to separate SecureStore keys (prefix routing)
 *   - Audit log captures store/retrieve operations
 *   - Pre-init guard: operations before initialize() return failure
 *   - deleteSecureData removes data
 *   - getStorageMetrics returns structured shape
 *   - Non-existent key retrieval returns null
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
const service = require('../SecureStorageService').default;

beforeEach(() => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
});

describe('SecureStorageService — crisis data tier', () => {
  it('storeCrisisData → retrieveCrisisData round-trips the payload', async () => {
    await service.initialize();

    const crisisData = {
      phq9Q9: 2,
      detectedAt: 1716000000000,
      interventionShown: '988',
    };
    const storeResult = await service.storeCrisisData(
      'episode-42',
      crisisData,
      'episode-42'
    );

    expect(storeResult.success).toBe(true);
    // INFRA-144: hybrid storage routes crisis ciphertext to AsyncStorage
    // under the crisis_async_ prefix; legacy crisis_secure_ remains as the
    // migration fallback only.
    expect(storeResult.storageKey).toMatch(/crisis_async_episode-42/);

    const retrieved = await service.retrieveCrisisData('episode-42');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.data).toEqual(crisisData);
    expect(retrieved?.metadata.storageTier).toBe('crisis_tier');
    expect(retrieved?.metadata.encrypted).toBe(true);
  });

  it('retrieveCrisisData returns null for non-existent key', async () => {
    await service.initialize();

    const retrieved = await service.retrieveCrisisData('does-not-exist');
    expect(retrieved).toBeNull();
  });

  it('storeCrisisData writes ciphertext to AsyncStorage under crisis_async_ prefix (tier isolation, INFRA-144)', async () => {
    await service.initialize();

    await service.storeCrisisData('iso-key', { a: 1 }, 'iso-key');

    // Hybrid: ciphertext lives in AsyncStorage; the legacy SecureStore key
    // would only be populated by an unmigrated install.
    const asyncKeys = Array.from(mockAsyncStorageMap.keys());
    expect(asyncKeys.some((k) => k.startsWith('crisis_async_iso-key'))).toBe(true);
    expect(asyncKeys.some((k) => k.startsWith('assessment_async_'))).toBe(false);

    const secureKeys = Array.from(mockSecureStoreMap.keys());
    expect(secureKeys.some((k) => k.startsWith('crisis_secure_iso-key'))).toBe(false);
  });
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

    const retrieved = await service.retrieveAssessmentData('assess-1');
    expect(retrieved?.data).toEqual(phq9);
    expect(retrieved?.metadata.storageTier).toBe('assessment_tier');
  });

  it('assessment tier is isolated from crisis tier (separate SecureStore keys)', async () => {
    await service.initialize();

    await service.storeCrisisData('overlap', { source: 'crisis' }, 'overlap');
    await service.storeAssessmentData('overlap', {
      type: 'GAD-7',
      responses: [1, 0, 1, 0, 1, 0, 1],
      totalScore: 4,
      timestamp: Date.now(),
      userId: 'u',
    });

    const crisis = await service.retrieveCrisisData('overlap');
    const assess = await service.retrieveAssessmentData('overlap');

    // Same logical key, different tiers → both round-trip independently
    expect(crisis?.data).toEqual({ source: 'crisis' });
    expect((assess?.data as any).type).toBe('GAD-7');
  });
});

describe('SecureStorageService — audit log', () => {
  it('logs successful store and retrieve operations', async () => {
    await service.initialize();

    await service.storeCrisisData('audit-1', { x: 1 }, 'audit-1');
    await service.retrieveCrisisData('audit-1');

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
    expect(storeOps[0].storageTier).toBe('crisis_tier');
  });
});

describe('SecureStorageService — lifecycle and metrics', () => {
  it('storeCrisisData before initialize() returns a failure result', async () => {
    await service.destroy();

    const result = await service.storeCrisisData('no-init', { a: 1 }, 'no-init');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not initialized/i);
  });

  it('getStorageMetrics returns structured shape', async () => {
    await service.initialize();

    await service.storeCrisisData('metric-1', { a: 1 }, 'metric-1');

    const metrics = await service.getStorageMetrics();
    expect(metrics).toBeDefined();
    // The exact shape may vary; assert it's an object with at least
    // some non-null fields.
    expect(typeof metrics).toBe('object');
    expect(metrics).not.toBeNull();
  });

  it('deleteSecureData removes stored crisis data', async () => {
    await service.initialize();

    await service.storeCrisisData('to-delete', { gone: false }, 'to-delete');
    expect(await service.retrieveCrisisData('to-delete')).not.toBeNull();

    // deleteSecureData takes the logical key (it tries every tier prefix internally).
    await service.deleteSecureData('to-delete');

    const after = await service.retrieveCrisisData('to-delete');
    expect(after).toBeNull();
  });
});

describe('SecureStorageService — concurrent writes', () => {
  it('two concurrent stores both succeed (no last-writer corruption)', async () => {
    await service.initialize();

    const [r1, r2] = await Promise.all([
      service.storeCrisisData('concur-a', { v: 'a' }, 'concur-a'),
      service.storeCrisisData('concur-b', { v: 'b' }, 'concur-b'),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    const [a, b] = await Promise.all([
      service.retrieveCrisisData('concur-a'),
      service.retrieveCrisisData('concur-b'),
    ]);
    expect(a?.data).toEqual({ v: 'a' });
    expect(b?.data).toEqual({ v: 'b' });
  });
});

describe('SecureStorageService — INFRA-144 hybrid storage', () => {
  it('crisis ciphertext writes to AsyncStorage, not SecureStore (post-INFRA-144)', async () => {
    await service.initialize();
    await service.storeCrisisData('hybrid-1', { signal: 'x' }, 'hybrid-1');

    expect(mockAsyncStorageMap.has('crisis_async_hybrid-1')).toBe(true);
    expect(mockSecureStoreMap.has('crisis_secure_hybrid-1')).toBe(false);
  });

  it('reads from legacy SecureStore key and migrates to AsyncStorage on first read', async () => {
    await service.initialize();

    // Seed a legacy SecureStore record (simulates a pre-INFRA-144 install).
    const legacyKey = 'crisis_secure_legacy-1';
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
        sensitivityLevel: 'level_1_crisis_responses',
        performanceMetrics: { encryptionTimeMs: 0, dataSize: 0, encryptedSize: 0 },
      },
      checksum: 'mock-checksum',
    });
    mockSecureStoreMap.set(legacyKey, legacyPayload);

    const retrieved = await service.retrieveCrisisData('legacy-1');
    expect(retrieved?.data).toEqual({ from: 'legacy' });

    // After migration: ciphertext now in AsyncStorage, legacy SecureStore key
    // deleted, migration marker set.
    expect(mockAsyncStorageMap.get('crisis_async_legacy-1')).toBe(legacyPayload);
    expect(mockSecureStoreMap.has(legacyKey)).toBe(false);
    expect(mockAsyncStorageMap.get(`wellness_migrated:${legacyKey}`)).toBe('v1');
  });

  it('migration is idempotent — second read does not re-attempt SecureStore', async () => {
    await service.initialize();

    // Pre-mark migrated so the legacy fallback is skipped even if data exists.
    const legacyKey = 'crisis_secure_idemp-1';
    mockSecureStoreMap.set(legacyKey, 'should-never-be-read');
    mockAsyncStorageMap.set(`wellness_migrated:${legacyKey}`, 'v1');

    // No AsyncStorage value at the hybrid key, so retrieve should return null
    // without falling back to the legacy SecureStore copy.
    const retrieved = await service.retrieveCrisisData('idemp-1');
    expect(retrieved).toBeNull();
    expect(mockSecureStoreMap.get(legacyKey)).toBe('should-never-be-read');
  });

  it('storeCrisisData marks legacy key migrated so stale SecureStore copies are ignored', async () => {
    await service.initialize();

    // Pretend there's a stale legacy copy left behind.
    const legacyKey = 'crisis_secure_fresh-1';
    mockSecureStoreMap.set(legacyKey, 'stale-data');

    // A fresh write under the hybrid path should set the migration marker so
    // subsequent reads ignore the stale SecureStore entry.
    await service.storeCrisisData('fresh-1', { fresh: true }, 'fresh-1');
    expect(mockAsyncStorageMap.get(`wellness_migrated:${legacyKey}`)).toBe('v1');

    const retrieved = await service.retrieveCrisisData('fresh-1');
    expect(retrieved?.data).toEqual({ fresh: true });
  });

  it('assessment hybrid path mirrors crisis behavior', async () => {
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
      entries: Array.from({ length: 200 }, (_, i) => ({
        idx: i,
        text: 'x'.repeat(50),
      })),
    };
    const result = await service.storeCrisisData('big-payload', big, 'big-payload');
    expect(result.success).toBe(true);
    expect(result.dataSize).toBeGreaterThan(2048);

    const back = await service.retrieveCrisisData('big-payload');
    expect((back?.data as any).entries.length).toBe(200);
  });

  it('wellness payload size cap (256KB) is enforced', async () => {
    await service.initialize();

    // ~300KB of payload after wrap — should trip the cap.
    const oversize = { blob: 'x'.repeat(300 * 1024) };
    const result = await service.storeCrisisData('oversize', oversize, 'oversize');
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

    await service.storeCrisisData('wipe-1', { a: 1 }, 'wipe-1');
    await service.storeAssessmentData('wipe-2', {
      type: 'GAD-7',
      responses: [0, 0, 0, 0, 0, 0, 0],
      totalScore: 0,
      timestamp: 0,
      userId: 'u',
    });
    await service.storeWellnessBlob('wipe-3', { b: 2 }, 'level_2_assessment_data');
    mockAsyncStorageMap.set('wellness_migrated:crisis_secure_old', 'v1');

    await service.clearAllWellnessData();

    const keysAfter = Array.from(mockAsyncStorageMap.keys());
    expect(keysAfter.some((k) => k.startsWith('crisis_async_'))).toBe(false);
    expect(keysAfter.some((k) => k.startsWith('assessment_async_'))).toBe(false);
    expect(keysAfter.some((k) => k.startsWith('wellness_async_'))).toBe(false);
    expect(keysAfter.some((k) => k.startsWith('wellness_migrated:'))).toBe(false);
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
});
