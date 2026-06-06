/**
 * crisis_detected telemetry field-population regression (DEBUG-218) — UNIT
 *
 * Pins the SAFETY-CRITICAL contract that BOTH crisis-detection emit paths carry a
 * real `severity_bucket` and `assessment_type` — never the literal string "undefined".
 *
 * Before DEBUG-218, the inline PHQ-9 Q9 path AND the score-based completed path both
 * built the CrisisDetection object without `severityLevel`/`assessmentType`, so
 * `SupabaseService.trackCrisisDetection` coerced the missing fields via String(undefined)
 * → "undefined" landed in `analytics_events` for the highest-acuity safety signal.
 *
 * These tests drive the REAL store actions (answerQuestion / completeAssessment) — not a
 * hand-built detection — and assert on the mocked telemetry sink. Telemetry-only: the
 * 988/intervention path and detection thresholds are unchanged.
 */
import { jest } from '@jest/globals';

// Mock the Supabase singleton entirely so we exercise the field-population contract only
// (the durable-queue internals live in the T6 landing test). jest.fn created INSIDE the
// factory — jest.mock is hoisted above module-scope consts (TDZ otherwise).
jest.mock('@/core/services/supabase/SupabaseService', () => {
  const fn = jest.fn();
  return {
    __esModule: true,
    default: { trackCrisisDetection: fn },
    supabaseService: { trackCrisisDetection: fn },
  };
});

// Emergency response calls Alert/Linking — keep them inert.
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn() },
}));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

// saveProgress() routes through SecureStorageService — passthrough so it never throws.
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

type Ans = { questionId: string; response: AssessmentResponse };

// Greedy fill: q1..qN absorb the score first, so phq9_9 stays 0 unless explicitly set.
function phq9(targetScore: number): Ans[] {
  const ids = ['phq9_1', 'phq9_2', 'phq9_3', 'phq9_4', 'phq9_5', 'phq9_6', 'phq9_7', 'phq9_8', 'phq9_9'];
  const out: Ans[] = [];
  let remaining = targetScore;
  for (let i = 0; i < ids.length; i++) {
    const left = ids.length - i;
    const minNeeded = Math.max(0, remaining - (left - 1) * 3);
    const r = Math.max(minNeeded, Math.min(3, remaining)) as AssessmentResponse;
    out.push({ questionId: ids[i], response: r });
    remaining -= r;
  }
  return out;
}

function gad7(targetScore: number): Ans[] {
  const ids = ['gad7_1', 'gad7_2', 'gad7_3', 'gad7_4', 'gad7_5', 'gad7_6', 'gad7_7'];
  const out: Ans[] = [];
  let remaining = targetScore;
  for (let i = 0; i < ids.length; i++) {
    const left = ids.length - i;
    const minNeeded = Math.max(0, remaining - (left - 1) * 3);
    const r = Math.max(minNeeded, Math.min(3, remaining)) as AssessmentResponse;
    out.push({ questionId: ids[i], response: r });
    remaining -= r;
  }
  return out;
}

async function answer(seq: Ans[]) {
  for (const a of seq) {
    await useAssessmentStore.getState().answerQuestion(a.questionId, a.response);
  }
}

function lastPayload() {
  return mockTrack.mock.calls[mockTrack.mock.calls.length - 1][0];
}

function expectNoUndefinedString(payload: Record<string, unknown>) {
  Object.values(payload).forEach((v) => expect(v).not.toBe('undefined'));
  expect(JSON.stringify(payload)).not.toContain('undefined');
}

describe('DEBUG-218 — crisis_detected carries real severity_bucket + assessment_type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAssessmentStore.getState().resetAssessment();
  });

  describe('inline PHQ-9 Q9 path (answerQuestion)', () => {
    it('Q9>0 with full answers + low total → severity_bucket "high", assessment_type "phq9", no "undefined"', async () => {
      await useAssessmentStore.getState().startAssessment('phq9');
      // Answer 1-8 = 0, then Q9 = 2 last → total 2 (<20). All 9 present at emit time.
      await answer([...phq9(0).slice(0, 8), { questionId: 'phq9_9', response: 2 as AssessmentResponse }]);

      expect(mockTrack).toHaveBeenCalledTimes(1);
      const p = lastPayload();
      expect(p).toEqual({
        trigger_type: 'phq9_suicidal_ideation',
        severity_bucket: 'high',
        intervention_surfaced: true,
        assessment_type: 'phq9',
      });
      expectNoUndefinedString(p);
    });

    it('Q9>0 with full answers + high total (≥20) → severity_bucket "critical"', async () => {
      await useAssessmentStore.getState().startAssessment('phq9');
      // 1-8 = 3 each (24), Q9 = 1 last → total 25 (≥20).
      const high: Ans[] = [];
      for (let i = 1; i <= 8; i++) high.push({ questionId: `phq9_${i}`, response: 3 as AssessmentResponse });
      high.push({ questionId: 'phq9_9', response: 1 as AssessmentResponse });
      await answer(high);

      const p = lastPayload();
      expect(p.trigger_type).toBe('phq9_suicidal_ideation');
      expect(p.severity_bucket).toBe('critical');
      expect(p.assessment_type).toBe('phq9');
      expectNoUndefinedString(p);
    });

    it('Q9>0 with NO other answers yet → score-compute fails → safe "high" floor (never "undefined")', async () => {
      await useAssessmentStore.getState().startAssessment('phq9');
      // Only Q9 answered → calculatePHQ9Score throws (needs 9) → fallback 'high'.
      await answer([{ questionId: 'phq9_9', response: 1 as AssessmentResponse }]);

      const p = lastPayload();
      expect(p.trigger_type).toBe('phq9_suicidal_ideation');
      expect(p.severity_bucket).toBe('high');
      expect(p.assessment_type).toBe('phq9');
      expectNoUndefinedString(p);
    });

    it('Q9=0 → no crisis emit (boundary)', async () => {
      await useAssessmentStore.getState().startAssessment('phq9');
      await answer([{ questionId: 'phq9_9', response: 0 as AssessmentResponse }]);
      expect(mockTrack).not.toHaveBeenCalled();
    });
  });

  describe('score-based completed path (completeAssessment) — non-Q9 crises', () => {
    it('PHQ-9 ≥20 without Q9 → phq9_moderate_severe_score, severity_bucket "critical", assessment_type "phq9"', async () => {
      await useAssessmentStore.getState().startAssessment('phq9');
      await answer(phq9(20)); // greedy fill leaves phq9_9 = 0
      await useAssessmentStore.getState().completeAssessment();

      expect(mockTrack).toHaveBeenCalledTimes(1);
      const p = lastPayload();
      expect(p.trigger_type).toBe('phq9_moderate_severe_score');
      expect(p.severity_bucket).toBe('critical');
      expect(p.assessment_type).toBe('phq9');
      expectNoUndefinedString(p);
    });

    it('PHQ-9 15–19 without Q9 → severity_bucket "high"', async () => {
      await useAssessmentStore.getState().startAssessment('phq9');
      await answer(phq9(17));
      await useAssessmentStore.getState().completeAssessment();

      const p = lastPayload();
      expect(p.trigger_type).toBe('phq9_moderate_severe_score');
      expect(p.severity_bucket).toBe('high');
      expect(p.assessment_type).toBe('phq9');
      expectNoUndefinedString(p);
    });

    it('GAD-7 ≥15 → gad7_severe_score, severity_bucket "high", assessment_type "gad7"', async () => {
      await useAssessmentStore.getState().startAssessment('gad7');
      await answer(gad7(18));
      await useAssessmentStore.getState().completeAssessment();

      const p = lastPayload();
      expect(p.trigger_type).toBe('gad7_severe_score');
      expect(p.severity_bucket).toBe('high');
      expect(p.assessment_type).toBe('gad7');
      expectNoUndefinedString(p);
    });
  });
});
