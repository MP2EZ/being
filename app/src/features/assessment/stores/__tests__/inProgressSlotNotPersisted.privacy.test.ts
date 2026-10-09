/**
 * The in-progress screening slot never reaches disk (DEBUG-769).
 *
 * `currentSession`, the top-level `answers` and `currentQuestionIndex` used to be
 * persisted on every set(), so a half-finished PHQ-9 (Q9 included) sat in the encrypted
 * blob past the app closing — and, because completeAssessment never clears the slot,
 * so did a full copy of every COMPLETED screening's answers. The slot is now memory-only;
 * `completedAssessments` stays the authoritative record at its own DEBUG-705 tier.
 *
 * Drives the REAL store, the REAL SecureStorageService and the REAL retention sweep over
 * in-memory stores (EncryptionService a passthrough: the property is which fields reach
 * the key, not cipher correctness), and reads the blob back through
 * `retrieveWellnessBlob` — i.e. decrypts what is actually on disk.
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

jest.mock('@/core/services/supabase/SupabaseService', () => {
  const fn = jest.fn();
  return { __esModule: true, default: { trackCrisisDetection: fn }, supabaseService: { trackCrisisDetection: fn } };
});
jest.mock('@/features/crisis/services/crisisAlert', () => ({ showCrisisAlert: jest.fn() }));
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() }, Linking: { openURL: jest.fn() } }));

import SecureStorageService from '@/core/services/security/SecureStorageService';
import { DataRetentionService } from '@/core/services/data-retention';
import { useAssessmentStore } from '../assessmentStore';
import type { AssessmentSession } from '../../types/index';
import { seedWellnessWriteConsent } from '../../../../../__tests__/helpers/wellnessWriteConsent';

const BLOB = 'assessment_store';
const settle = () => new Promise((r) => setTimeout(r, 0));

type Disk = { state?: Record<string, unknown> } & Record<string, unknown>;
const readDisk = async () => (await SecureStorageService.retrieveWellnessBlob<Disk>(BLOB)) as Disk | null;
const stateOf = (disk: Disk | null) => (disk?.state ?? disk ?? {}) as Record<string, unknown>;

function expectNoSlot(disk: Disk | null) {
  const state = stateOf(disk);
  expect(state['currentSession'] ?? null).toBeNull();
  expect(state['answers'] ?? []).toEqual([]);
  expect(state['currentQuestionIndex'] ?? 0).toBe(0);
}

async function startAndAnswerThroughQ9(q9: number) {
  await useAssessmentStore.getState().startAssessment('phq9', 'standalone');
  for (let i = 1; i <= 8; i++) await useAssessmentStore.getState().answerQuestion(`phq9_${i}`, 1);
  await useAssessmentStore.getState().answerQuestion('phq9_9', q9 as 0 | 1 | 2 | 3);
}

const legacySlotBlob = (id: string) => ({
  state: {
    completedAssessments: [],
    currentSession: {
      id,
      type: 'phq9',
      context: 'standalone',
      progress: { type: 'phq9', currentQuestionIndex: 9, totalQuestions: 9, startedAt: Date.now() - 5000, answers: [], isComplete: false },
    },
    answers: [{ questionId: 'phq9_9', response: 3, timestamp: Date.now() }],
    currentQuestionIndex: 9,
    autoSaveEnabled: true,
  },
  version: 0,
});

beforeEach(async () => {
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  seedWellnessWriteConsent('granted');
  await useAssessmentStore.setState(useAssessmentStore.getInitialState(), true);
  await settle();
  mockSecureStoreMap.clear();
  mockAsyncStorageMap.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  seedWellnessWriteConsent('loading');
});

describe('the in-progress slot is memory-only (DEBUG-769)', () => {
  it('a Q9 > 0 partial leaves no slot on disk after saveProgress, but stays in memory', async () => {
    await startAndAnswerThroughQ9(2);
    await useAssessmentStore.getState().saveProgress();
    await settle();

    const disk = await readDisk();
    expect(disk).not.toBeNull();
    expectNoSlot(disk);
    expect(JSON.stringify(disk)).not.toContain('phq9_9');
    // Memory is untouched: the live flow keeps working.
    expect(useAssessmentStore.getState().currentSession).not.toBeNull();
    expect(useAssessmentStore.getState().answers).toHaveLength(9);
    expect(useAssessmentStore.getState().currentQuestionIndex).toBe(9);
  });

  it('keeps autoSaveEnabled and completedAssessments in the persisted state', async () => {
    await useAssessmentStore.getState().saveProgress();
    await settle();
    const state = stateOf(await readDisk());
    expect(state['autoSaveEnabled']).toBe(true);
    expect(state['completedAssessments']).toEqual([]);
    expect(Object.keys(state).sort()).toEqual(['autoSaveEnabled', 'completedAssessments']);
  });

  it('a COMPLETED screening is on disk as history only, with no slot copy of its answers', async () => {
    await startAndAnswerThroughQ9(0);
    await useAssessmentStore.getState().completeAssessment();
    await settle();

    const state = stateOf(await readDisk());
    const history = state['completedAssessments'] as AssessmentSession[];
    expect(history).toHaveLength(1);
    expect(history[0]!.progress.answers).toHaveLength(9); // the authoritative record is intact
    expectNoSlot(await readDisk());
  });

  it('nothing re-persists the slot: prune, hydrate->persist cycle, saveProgress, arbitrary set()', async () => {
    await startAndAnswerThroughQ9(3);
    await settle();

    await (DataRetentionService as unknown as { runRetentionCleanup: () => Promise<unknown> }).runRetentionCleanup();
    expectNoSlot(await readDisk());

    await useAssessmentStore.persist.rehydrate();
    await useAssessmentStore.setState({});
    await settle();
    expectNoSlot(await readDisk());

    await useAssessmentStore.getState().saveProgress();
    expectNoSlot(await readDisk());

    useAssessmentStore.setState({ error: 'x', isLoading: false });
    await settle();
    expectNoSlot(await readDisk());
    expect(JSON.stringify(await readDisk())).not.toContain('phq9_9');
  });

  it('hydration never takes the slot from a legacy blob: memory keeps its own', async () => {
    await startAndAnswerThroughQ9(1);
    await settle();
    const liveId = useAssessmentStore.getState().currentSession!.id;
    const liveAnswers = useAssessmentStore.getState().answers;

    await SecureStorageService.storeWellnessBlob(BLOB, legacySlotBlob('legacy-session'), 'level_2_assessment_data');
    await useAssessmentStore.persist.rehydrate();

    const after = useAssessmentStore.getState();
    expect(after.currentSession!.id).toBe(liveId);
    expect(after.answers).toBe(liveAnswers);
    expect(after.currentQuestionIndex).toBe(9);
  });

  it('a cold launch (empty memory) over a legacy slot restores nothing and leaves disk matching memory', async () => {
    await SecureStorageService.storeWellnessBlob(BLOB, legacySlotBlob('legacy-session'), 'level_2_assessment_data');

    await useAssessmentStore.persist.rehydrate();
    await settle();

    const after = useAssessmentStore.getState();
    expect(after.currentSession).toBeNull();
    expect(after.answers).toEqual([]);
    expect(after.currentQuestionIndex).toBe(0);
    // The single post-hydration write has replaced the legacy copy on disk.
    const disk = await readDisk();
    expectNoSlot(disk);
    expect(JSON.stringify(disk)).not.toContain('legacy-session');
  });

  it('does not write after hydration when the blob carried no slot', async () => {
    await SecureStorageService.storeWellnessBlob(
      BLOB,
      { state: { completedAssessments: [], autoSaveEnabled: true }, version: 0 },
      'level_2_assessment_data'
    );
    const before = mockAsyncStorageMap.get(`wellness_async_${BLOB}`);

    await useAssessmentStore.persist.rehydrate();
    await settle();

    expect(mockAsyncStorageMap.get(`wellness_async_${BLOB}`)).toBe(before);
  });
});
