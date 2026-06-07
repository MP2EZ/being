/**
 * crisisDetectionParity.unit.test.ts — DEBUG-229 / MAINT-226 Decision E
 *
 * Pins the "ONE source of truth" invariant: the store's production crisis path
 * (startAssessment → answerQuestion → completeAssessment, read back via
 * `store.crisisDetection`) MUST return the same `primaryTrigger` + `severityLevel`
 * as the pure `detectCrisis()` in `@/features/crisis/types/safety` for the
 * dual-threshold boundary set {14, 15, 19, 20, Q9>0}.
 *
 * The store's CrisisDetectionService now delegates to the pure function, so a
 * future threshold/trigger-vocabulary divergence (the exact defect TEST-07 found)
 * cannot silently reappear. Asserts through the production store API — never a
 * test-local reimplementation (AC #3).
 */
import { jest } from '@jest/globals';

jest.mock('@/core/services/supabase/SupabaseService', () => {
  const fn = jest.fn();
  return { __esModule: true, default: { trackCrisisDetection: fn }, supabaseService: { trackCrisisDetection: fn } };
});
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() }, Linking: { openURL: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = data;
      return { success: true, operationType: 'store' as const, storageKey: `wellness_async_${key}`, operationTimeMs: 0, dataSize: 0 };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => { delete mockWellnessBlobs[key]; }),
  },
}));

import { useAssessmentStore } from '../assessmentStore';
import { detectCrisis } from '@/features/crisis/types/safety';
import type { PHQ9Result } from '@/features/assessment/types';
import type { AssessmentResponse } from '../../types/index';

type Ans = { questionId: string; response: AssessmentResponse };

/** Greedy fill q1..q8 to the target, leaving phq9_9 = `q9` (default 0). */
function phq9Answers(targetScore: number, q9 = 0): Ans[] {
  const ids = ['phq9_1', 'phq9_2', 'phq9_3', 'phq9_4', 'phq9_5', 'phq9_6', 'phq9_7', 'phq9_8'];
  const out: Ans[] = [];
  let remaining = targetScore - q9;
  for (let i = 0; i < ids.length; i++) {
    const left = ids.length - i;
    const minNeeded = Math.max(0, remaining - (left - 1) * 3);
    const r = Math.max(minNeeded, Math.min(3, remaining)) as AssessmentResponse;
    out.push({ questionId: ids[i], response: r });
    remaining -= r;
  }
  out.push({ questionId: 'phq9_9', response: q9 as AssessmentResponse });
  return out;
}

const pureResult = (totalScore: number, suicidalIdeation = false): PHQ9Result => ({
  totalScore,
  severity: 'minimal',
  isCrisis: false,
  suicidalIdeation,
  completedAt: Date.now(),
  answers: [],
});

async function runStore(answers: Ans[]) {
  const store = useAssessmentStore.getState();
  store.resetAssessment();
  await store.startAssessment('phq9');
  for (const a of answers) {
    await useAssessmentStore.getState().answerQuestion(a.questionId, a.response);
  }
  await useAssessmentStore.getState().completeAssessment();
  return useAssessmentStore.getState().crisisDetection;
}

describe('DEBUG-229 — pure detectCrisis ⇄ store CrisisDetectionService parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAssessmentStore.getState().resetAssessment();
  });

  it('PHQ-9 14, Q9=0 → both produce no crisis', async () => {
    expect(detectCrisis(pureResult(14), 'u1')).toBeNull();
    expect(await runStore(phq9Answers(14))).toBeNull();
  });

  it.each([15, 19, 20, 24])('PHQ-9 %i, Q9=0 → store matches pure (primaryTrigger + severityLevel)', async (score) => {
    const pure = detectCrisis(pureResult(score), 'u1');
    expect(pure).not.toBeNull();
    const fromStore = await runStore(phq9Answers(score));
    expect(fromStore).toBeTruthy();
    expect(fromStore!.primaryTrigger).toBe(pure!.primaryTrigger);
    expect(fromStore!.severityLevel).toBe(pure!.severityLevel);
  });

  it('PHQ-9 17 with Q9>0 → both report suicidal-ideation primary at "high"', async () => {
    const pure = detectCrisis(pureResult(17, true), 'u1');
    expect(pure!.primaryTrigger).toBe('phq9_suicidal_ideation');
    const fromStore = await runStore(phq9Answers(17, 2));
    expect(fromStore!.primaryTrigger).toBe(pure!.primaryTrigger);
    expect(fromStore!.severityLevel).toBe(pure!.severityLevel);
  });
});
