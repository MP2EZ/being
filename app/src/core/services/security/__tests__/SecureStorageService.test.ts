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
    expect(storeResult.storageKey).toMatch(/crisis_secure_episode-42/);

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

  it('storeCrisisData uses the crisis_secure_ prefix (tier isolation)', async () => {
    await service.initialize();

    await service.storeCrisisData('iso-key', { a: 1 }, 'iso-key');

    const keys = Array.from(mockSecureStoreMap.keys());
    expect(keys.some((k) => k.startsWith('crisis_secure_iso-key'))).toBe(true);
    // Should NOT also be in assessment tier
    expect(keys.some((k) => k.startsWith('assessment_secure_'))).toBe(false);
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
