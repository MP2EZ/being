/**
 * answerQuestionValidation.unit.test.ts — DEBUG-229 (TEST-08 / SEC-06)
 *
 * `answerQuestion` MUST validate per-question responses against the 0–3 clinical
 * scale (`AssessmentResponseSchema`) BEFORE storing/scoring. Out-of-range values
 * are rejected fail-loud: the answer is not stored, `error` is set, and the
 * inline Q9 crisis check never runs on a corrupt value.
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
import supabaseService from '@/core/services/supabase/SupabaseService';
import type { AssessmentResponse } from '../../types/index';

const mockTrack = (supabaseService as any).trackCrisisDetection as jest.Mock;
// Force out-of-range / wrong-type values past the TS signature for the runtime guard test.
const bad = (v: unknown) => v as AssessmentResponse;

describe('DEBUG-229 — answerQuestion 0–3 validation (fail-loud reject)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useAssessmentStore.getState().resetAssessment();
    await useAssessmentStore.getState().startAssessment('phq9');
  });

  it('stores a valid in-range response (0–3) and scores it', async () => {
    await useAssessmentStore.getState().answerQuestion('phq9_1', 3 as AssessmentResponse);
    const s = useAssessmentStore.getState();
    expect(s.answers.find((a) => a.questionId === 'phq9_1')?.response).toBe(3);
    expect(s.error).toBeNull();
  });

  it.each([5, 4, -1, 1.5, NaN, null, undefined, '2'])(
    'rejects out-of-range/invalid response %p — not stored, error set',
    async (value) => {
      await useAssessmentStore.getState().answerQuestion('phq9_1', bad(value));
      const s = useAssessmentStore.getState();
      expect(s.answers.find((a) => a.questionId === 'phq9_1')).toBeUndefined();
      expect(s.error).toBeTruthy();
    },
  );

  it('does NOT fire the inline Q9 crisis check for an out-of-range Q9 value', async () => {
    await useAssessmentStore.getState().answerQuestion('phq9_9', bad(5));
    const s = useAssessmentStore.getState();
    expect(s.answers.find((a) => a.questionId === 'phq9_9')).toBeUndefined();
    expect(s.crisisDetection).toBeNull();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('a valid Q9>0 still triggers the inline crisis path (guard does not over-reject)', async () => {
    await useAssessmentStore.getState().answerQuestion('phq9_9', 1 as AssessmentResponse);
    expect(useAssessmentStore.getState().crisisDetection?.primaryTrigger).toBe('phq9_suicidal_ideation');
  });
});
