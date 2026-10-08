/**
 * Assessment retention on the LIVE storage path (DEBUG-705).
 *
 * cleanupAssessmentData used to read SecureStore `assessment_store_encrypted` —
 * the pre-INFRA-144 key, which migration deletes and new installs never write.
 * It pruned nothing on any current install, so the privacy policy's 90-day and
 * 3-year periods (§7.1/§7.2) were unenforced.
 *
 * This suite drives the REAL SecureStorageService (`storeWellnessBlob` /
 * `retrieveWellnessBlob`, key `wellness_async_assessment_store`) over in-memory
 * stores, with EncryptionService as a passthrough: the property proven is which
 * key is read and written and what survives, not cipher correctness. Nothing is
 * seeded under the legacy key, so a sweep still reading it prunes nothing and
 * fails every removal assertion here.
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
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, mockAsyncStorageMap.get(k) ?? null])),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((k) => mockAsyncStorageMap.delete(k));
  }),
  clear: jest.fn(async () => {
    mockAsyncStorageMap.clear();
  }),
}));

jest.mock('@/core/services/security/EncryptionService', () => {
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
      encryptedAt: Date.now(),
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
    initialize: jest.fn(async () => undefined),
    destroy: jest.fn(async () => undefined),
    deleteMasterKey: jest.fn(async () => undefined),
    getInstance: jest.fn(),
  };
  stub.getInstance.mockReturnValue(stub);
  return { __esModule: true, default: stub };
});

import SecureStorageService from '@/core/services/security/SecureStorageService';
import { DataRetentionService, DATA_RETENTION_CONFIG } from '@/core/services/data-retention';
import { ASSESSMENT_RETENTION_PERIODS } from '@/core/services/data-retention/assessmentRetention';

const DAY = 24 * 60 * 60 * 1000;
const BLOB = 'assessment_store';
const LEGACY_KEY = 'assessment_store_encrypted';

const answers = (type: 'phq9' | 'gad7', q9 = 0) =>
  type === 'phq9' ? [{ questionId: 'phq9_9', response: q9, timestamp: 1 }] : [];

function record(id: string, type: 'phq9' | 'gad7', total: number, ageDays: number, opts: { q9?: number; isCrisis?: boolean } = {}) {
  const startedAt = Date.now() - ageDays * DAY;
  return {
    id,
    type,
    progress: { type, currentQuestionIndex: 0, totalQuestions: 9, startedAt, answers: answers(type, opts.q9) },
    result: {
      totalScore: total,
      severity: 'moderate',
      isCrisis: opts.isCrisis ?? false,
      ...(type === 'phq9' ? { suicidalIdeation: (opts.q9 ?? 0) > 0 } : {}),
      completedAt: startedAt + 60_000,
      answers: answers(type, opts.q9),
    },
    context: 'standalone',
  };
}

const ids = (list: unknown[]) => (list as { id: string }[]).map((r) => r.id).sort();

async function runCleanup() {
  await (DataRetentionService as unknown as { runRetentionCleanup: () => Promise<{ errors: string[] }> }).runRetentionCleanup();
}

beforeEach(() => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
});

describe('assessment retention on the live wellness blob (DEBUG-705)', () => {
  it('prunes the flat shape written by saveProgress, by tier', async () => {
    await SecureStorageService.storeWellnessBlob(
      BLOB,
      {
        completedAssessments: [
          record('fresh', 'phq9', 5, 10),
          record('old-mild', 'phq9', 5, 91),
          record('old-15-19', 'phq9', 17, 100, { isCrisis: true }),
          record('severe-400d', 'phq9', 22, 400, { isCrisis: true }),
          record('q9-400d', 'phq9', 3, 400, { q9: 1 }),
          record('gad-severe-400d', 'gad7', 18, 400, { isCrisis: true }),
          record('severe-1100d', 'phq9', 22, 1100, { isCrisis: true }),
        ],
        currentSession: null,
        lastSavedAt: 123,
      },
      'level_2_assessment_data'
    );

    await runCleanup();

    const after = await SecureStorageService.retrieveWellnessBlob<Record<string, unknown>>(BLOB);
    expect(ids(after!['completedAssessments'] as unknown[])).toEqual(
      ['fresh', 'gad-severe-400d', 'q9-400d', 'severe-400d'].sort()
    );
    // Other fields survive the rewrite.
    expect(after!['lastSavedAt']).toBe(123);
    expect(after).toHaveProperty('currentSession', null);
  });

  it('prunes the {state, version} shape written by the persist middleware, keeping its shape', async () => {
    await SecureStorageService.storeWellnessBlob(
      BLOB,
      {
        state: {
          completedAssessments: [record('fresh', 'gad7', 4, 5), record('old', 'gad7', 4, 120)],
          currentSession: null,
          answers: [],
          currentQuestionIndex: 0,
          autoSaveEnabled: true,
        },
        version: 0,
      },
      'level_2_assessment_data'
    );

    await runCleanup();

    const after = await SecureStorageService.retrieveWellnessBlob<{ state: Record<string, unknown>; version: number }>(BLOB);
    expect(after!.version).toBe(0);
    expect(ids(after!.state['completedAssessments'] as unknown[])).toEqual(['fresh']);
    expect(after!.state['autoSaveEnabled']).toBe(true);
  });

  it('never touches the legacy SecureStore key', async () => {
    await SecureStorageService.storeWellnessBlob(
      BLOB,
      { completedAssessments: [record('old', 'phq9', 2, 200)] },
      'level_2_assessment_data'
    );
    mockSecureStoreMap.set(LEGACY_KEY, JSON.stringify({ completedAssessments: [record('legacy', 'phq9', 2, 200)] }));

    await runCleanup();

    // The legacy copy is the store hydration's to migrate, never the sweep's.
    expect(mockSecureStoreMap.get(LEGACY_KEY)).toContain('"legacy"');
    const after = await SecureStorageService.retrieveWellnessBlob<Record<string, unknown>>(BLOB);
    expect(after!['completedAssessments']).toEqual([]);
  });

  it('does not rewrite the blob when nothing has expired', async () => {
    await SecureStorageService.storeWellnessBlob(
      BLOB,
      { completedAssessments: [record('fresh', 'phq9', 5, 1)] },
      'level_2_assessment_data'
    );
    const before = mockAsyncStorageMap.get(`wellness_async_${BLOB}`);

    await runCleanup();

    expect(mockAsyncStorageMap.get(`wellness_async_${BLOB}`)).toBe(before);
  });

  it('leaves an unrecognised blob untouched and reports it', async () => {
    await SecureStorageService.storeWellnessBlob(BLOB, ['not', 'a', 'blob'], 'level_2_assessment_data');
    const before = mockAsyncStorageMap.get(`wellness_async_${BLOB}`);

    const result = await (DataRetentionService as unknown as {
      runRetentionCleanup: () => Promise<{ errors: string[] }>;
    }).runRetentionCleanup();

    expect(mockAsyncStorageMap.get(`wellness_async_${BLOB}`)).toBe(before);
    expect(result.errors.join(' ')).toMatch(/Assessment cleanup/);
  });

  it('the cutoffs are the published periods, and the store filter uses the same ones', () => {
    expect(DATA_RETENTION_CONFIG.DEFAULT_RETENTION_MS).toBe(90 * DAY);
    expect(DATA_RETENTION_CONFIG.CRISIS_RETENTION_MS).toBe(3 * 365 * DAY);
    expect(ASSESSMENT_RETENTION_PERIODS).toEqual({
      defaultMs: DATA_RETENTION_CONFIG.DEFAULT_RETENTION_MS,
      crisisMs: DATA_RETENTION_CONFIG.CRISIS_RETENTION_MS,
    });
  });
});
