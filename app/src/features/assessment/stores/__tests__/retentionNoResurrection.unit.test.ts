/**
 * Retention cannot be undone from memory (DEBUG-705).
 *
 * The daily sweep prunes expired screenings from the persisted blob, but the
 * store hydrates at module load — so without its own filter, the in-memory
 * `completedAssessments` still holds the pruned records and the next persist
 * writes them straight back (the DEBUG-671 shape). The store therefore applies
 * the SAME retention rules (core/services/data-retention/assessmentRetention)
 * as it hydrates, whatever order hydration and the sweep run in.
 *
 * Crisis-tier records (PHQ-9 ≥ 20, Q9 > 0, GAD-7 ≥ 15) stay for 3 years; only
 * the period changes, never detection.
 */
import { jest } from '@jest/globals';

jest.mock('@/core/services/supabase/SupabaseService', () => {
  const fn = jest.fn();
  return { __esModule: true, default: { trackCrisisDetection: fn }, supabaseService: { trackCrisisDetection: fn } };
});
jest.mock('@/features/crisis/services/crisisAlert', () => ({ showCrisisAlert: jest.fn() }));
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() }, Linking: { openURL: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = JSON.parse(JSON.stringify(data));
      return { success: true, operationType: 'store' as const, storageKey: `wellness_async_${key}`, operationTimeMs: 0, dataSize: 0 };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      delete mockWellnessBlobs[key];
    }),
  },
}));

import { resetAssessmentStoreForErasure, useAssessmentStore } from '../assessmentStore';

const DAY = 24 * 60 * 60 * 1000;

function record(id: string, type: 'phq9' | 'gad7', total: number, ageDays: number, q9 = 0) {
  const startedAt = Date.now() - ageDays * DAY;
  return {
    id,
    type,
    progress: { type, currentQuestionIndex: 0, totalQuestions: 9, startedAt, answers: [] },
    result: {
      totalScore: total,
      severity: 'moderate',
      isCrisis: total >= 15,
      ...(type === 'phq9' ? { suicidalIdeation: q9 > 0 } : {}),
      completedAt: startedAt + 60_000,
      answers: type === 'phq9' ? [{ questionId: 'phq9_9', response: q9, timestamp: startedAt }] : [],
    },
    context: 'standalone',
  };
}

const SEEDED = [
  record('fresh', 'phq9', 4, 3),
  record('expired-mild', 'phq9', 4, 120),
  record('expired-15-19', 'phq9', 17, 120),
  record('severe-400d', 'phq9', 23, 400),
  record('q9-400d', 'phq9', 2, 400, 1),
];
const SURVIVORS = ['fresh', 'q9-400d', 'severe-400d'];

const idsIn = (list: unknown) => ((list ?? []) as { id: string }[]).map((r) => r.id).sort();

beforeEach(async () => {
  for (const key of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[key];
  await resetAssessmentStoreForErasure();
  jest.clearAllMocks();
});

it('hydration drops records past their period and keeps crisis-tier ones', async () => {
  mockWellnessBlobs['assessment_store'] = {
    state: { completedAssessments: SEEDED, currentSession: null, answers: [], currentQuestionIndex: 0, autoSaveEnabled: true },
    version: 0,
  };

  await useAssessmentStore.persist.rehydrate();

  expect(idsIn(useAssessmentStore.getState().completedAssessments)).toEqual(SURVIVORS);
});

it('the next write after hydration does not put a pruned record back on disk', async () => {
  mockWellnessBlobs['assessment_store'] = {
    state: { completedAssessments: SEEDED, currentSession: null, answers: [], currentQuestionIndex: 0, autoSaveEnabled: true },
    version: 0,
  };
  await useAssessmentStore.persist.rehydrate();

  await useAssessmentStore.getState().setSessionNote('fresh', 'slept badly');

  const onDisk = mockWellnessBlobs['assessment_store'] as Record<string, unknown> & { state?: Record<string, unknown> };
  const persisted = onDisk.state ? onDisk.state['completedAssessments'] : onDisk['completedAssessments'];
  expect(idsIn(persisted)).toEqual(SURVIVORS);
});

it('recoverSession applies the same filter to the history it restores', async () => {
  mockWellnessBlobs['assessment_store'] = {
    completedAssessments: SEEDED,
    currentSession: { id: 'live', type: 'phq9', progress: { startedAt: Date.now() } },
    answers: [],
    currentQuestionIndex: 0,
  };

  await expect(useAssessmentStore.getState().recoverSession()).resolves.toBe(true);

  expect(idsIn(useAssessmentStore.getState().completedAssessments)).toEqual(SURVIVORS);
});
