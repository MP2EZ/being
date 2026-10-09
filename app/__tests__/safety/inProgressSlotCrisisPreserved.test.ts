/**
 * Dropping the in-progress slot must not touch the crisis path (DEBUG-769).
 *
 * A Q9 > 0 answer raises its alert inline, at answer time, and queues the
 * `crisis_detected` event durably — neither depends on the slot being persisted. This
 * drives the REAL store, the REAL SupabaseService crisis queue and the REAL retention
 * sweep, then proves that pruning and rehydrating (the next-launch path) leaves the
 * alert count, the queued event and `crisisIntervention` exactly as they were.
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

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));
jest.mock('@/features/crisis/services/crisisAlert', () => ({ showCrisisAlert: jest.fn() }));
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() }, Linking: { openURL: jest.fn() } }));

import SecureStorageService from '@/core/services/security/SecureStorageService';
import { DataRetentionService } from '@/core/services/data-retention';
import supabaseService from '@/core/services/supabase/SupabaseService';
import { showCrisisAlert } from '@/features/crisis/services/crisisAlert';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { seedWellnessWriteConsent } from '../helpers/wellnessWriteConsent';

const BLOB = 'assessment_store';
const CRISIS_QUEUE_KEY = '@being/supabase/crisis_analytics_queue';
const settle = () => new Promise((r) => setTimeout(r, 0));
const alertMock = showCrisisAlert as jest.Mock;

const sweep = () =>
  (DataRetentionService as unknown as { runRetentionCleanup: () => Promise<unknown> }).runRetentionCleanup();

const queuedEvents = () => {
  const raw = mockAsyncStorageMap.get(CRISIS_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as { event_type: string }[]) : [];
};

const diskState = async () => {
  const disk = await SecureStorageService.retrieveWellnessBlob<{ state?: Record<string, unknown> } & Record<string, unknown>>(BLOB);
  return (disk?.state ?? disk ?? {}) as Record<string, unknown>;
};

beforeEach(async () => {
  seedWellnessWriteConsent('granted');
  await useAssessmentStore.setState(useAssessmentStore.getInitialState(), true);
  await settle();
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
  // The service is a module singleton: its in-memory queue outlives a test.
  (supabaseService as unknown as { crisisAnalyticsQueue: unknown[] }).crisisAnalyticsQueue = [];
});

afterEach(() => {
  seedWellnessWriteConsent('loading');
});

describe('crisis path is independent of the persisted in-progress slot (DEBUG-769)', () => {
  it('a mid-session Q9 > 0 alerts once and queues the event; prune + rehydrate change neither', async () => {
    const store = () => useAssessmentStore.getState();
    await store().startAssessment('phq9', 'standalone');
    for (let i = 1; i <= 8; i++) await store().answerQuestion(`phq9_${i}`, 0);
    await store().answerQuestion('phq9_9', 2);
    await settle();

    // Inline alert fired at answer time; the event is durable and UNFLUSHED (no user yet).
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(queuedEvents().map((e) => e.event_type)).toEqual(['crisis_detected']);
    const interventionBefore = store().crisisIntervention;
    const detectionBefore = store().crisisDetection;
    expect(interventionBefore?.interventionStarted).toBe(true);

    // The next launch: the sweep runs, then hydration.
    await sweep();
    await useAssessmentStore.persist.rehydrate();
    await settle();

    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(queuedEvents().map((e) => e.event_type)).toEqual(['crisis_detected']);
    expect(store().crisisIntervention).toBe(interventionBefore);
    expect(store().crisisDetection).toBe(detectionBefore);
    // ...and the partial itself is not on disk.
    const state = await diskState();
    expect(state['currentSession'] ?? null).toBeNull();
    expect(state['answers'] ?? []).toEqual([]);
    expect(JSON.stringify(state)).not.toContain('phq9_9');
  });

  it('a true cold launch after the Q9 > 0 partial restores no slot and raises no second alert', async () => {
    const store = () => useAssessmentStore.getState();
    await store().startAssessment('phq9', 'standalone');
    for (let i = 1; i <= 8; i++) await store().answerQuestion(`phq9_${i}`, 0);
    await store().answerQuestion('phq9_9', 3);
    await settle();
    expect(alertMock).toHaveBeenCalledTimes(1);

    // App killed: memory gone, disk and the crisis queue survive. Persist's setState
    // wrapper re-writes the blob, so snapshot the bytes the process left and put them back.
    const onDisk = mockAsyncStorageMap.get(`wellness_async_${BLOB}`);
    useAssessmentStore.setState(
      { currentSession: null, answers: [], currentQuestionIndex: 0, crisisDetection: null, crisisIntervention: null },
      false
    );
    await settle();
    if (onDisk !== undefined) mockAsyncStorageMap.set(`wellness_async_${BLOB}`, onDisk);
    await sweep();
    await useAssessmentStore.persist.rehydrate();
    await settle();

    expect(store().currentSession).toBeNull();
    expect(store().answers).toEqual([]);
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(queuedEvents().map((e) => e.event_type)).toEqual(['crisis_detected']);
  });

  it('a COMPLETED PHQ-9 >= 20 with Q9 = 0 still detects via the score path, with exactly one alert', async () => {
    const store = () => useAssessmentStore.getState();
    await store().startAssessment('phq9', 'standalone');
    // 3+3+3+3+3+3+2+0+0 = 20; Q9 (phq9_9) answered LAST and zero, so no inline alert.
    const responses = [3, 3, 3, 3, 3, 3, 2, 0, 0] as const;
    for (let i = 0; i < 9; i++) await store().answerQuestion(`phq9_${i + 1}`, responses[i]!);
    expect(alertMock).not.toHaveBeenCalled();

    await store().completeAssessment();
    await settle();

    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(store().crisisDetection?.primaryTrigger).toBe('phq9_severe_score');
    expect(queuedEvents().map((e) => e.event_type)).toEqual(['crisis_detected']);

    await sweep();
    await useAssessmentStore.persist.rehydrate();
    await settle();

    expect(alertMock).toHaveBeenCalledTimes(1);
    const history = (await diskState())['completedAssessments'] as { result?: { totalScore: number } }[];
    expect(history).toHaveLength(1);
    expect(history[0]!.result?.totalScore).toBe(20);
  });
});
