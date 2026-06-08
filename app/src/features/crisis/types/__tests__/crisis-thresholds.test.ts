import { CRISIS_THRESHOLDS } from '@/features/assessment/types';
import {
  CRISIS_SAFETY_THRESHOLDS,
  detectCrisis,
  isInterventionTier,
} from '@/features/crisis/types/safety';
import type {
  PHQ9Result,
  GAD7Result,
  AssessmentAnswer,
} from '@/features/assessment/types';

// Minimal PHQ-9 / GAD-7 result factories (mirrors AssessmentResults.test.tsx).
const phqAnswers = (totalScore: number, q9Response = 0): AssessmentAnswer[] => {
  const answers: AssessmentAnswer[] = [];
  let remaining = totalScore - q9Response;
  for (let i = 1; i <= 8; i++) {
    const response = Math.min(3, Math.max(0, remaining)) as AssessmentAnswer['response'];
    answers.push({ questionId: `phq9_${i}`, response, timestamp: Date.now() });
    remaining -= response;
  }
  answers.push({ questionId: 'phq9_9', response: q9Response as AssessmentAnswer['response'], timestamp: Date.now() });
  return answers;
};

const phqResult = (totalScore: number, suicidalIdeation = false): PHQ9Result => ({
  totalScore,
  severity:
    totalScore >= 20 ? 'severe' :
    totalScore >= 15 ? 'moderately_severe' :
    totalScore >= 10 ? 'moderate' :
    totalScore >= 5 ? 'mild' : 'minimal',
  isCrisis: totalScore >= 15 || suicidalIdeation,
  suicidalIdeation,
  completedAt: Date.now(),
  answers: phqAnswers(totalScore, suicidalIdeation ? 1 : 0),
});

const gad7Result = (totalScore: number): GAD7Result => ({
  totalScore,
  severity:
    totalScore >= 15 ? 'severe' :
    totalScore >= 10 ? 'moderate' :
    totalScore >= 5 ? 'mild' : 'minimal',
  isCrisis: totalScore >= 15,
  completedAt: Date.now(),
  answers: Array.from({ length: 7 }, (_, i) => ({
    questionId: `gad7_${i + 1}`,
    response: Math.min(3, Math.floor(totalScore / 7) + (i < totalScore % 7 ? 1 : 0)) as AssessmentAnswer['response'],
    timestamp: Date.now(),
  })),
});

describe('CRISIS thresholds — dual-threshold contract', () => {
  it('pins the documented support-vs-intervention split', () => {
    expect(CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE).toBe(15);
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE).toBe(20);

    expect(CRISIS_THRESHOLDS.PHQ9_MODERATE_SEVERE_THRESHOLD).toBe(15);
    expect(CRISIS_THRESHOLDS.PHQ9_SEVERE_THRESHOLD).toBe(20);
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_MODERATE_SEVERE_THRESHOLD).toBe(15);
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_SEVERE_THRESHOLD).toBe(20);

    expect(CRISIS_THRESHOLDS.GAD7_CRISIS_SCORE).toBe(15);
    expect(CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE).toBe(15);
    expect(CRISIS_THRESHOLDS.GAD7_SEVERE_THRESHOLD).toBe(15);
    expect(CRISIS_SAFETY_THRESHOLDS.GAD7_SEVERE_THRESHOLD).toBe(15);
  });

  it('pins the suicidal-ideation question ID across both modules', () => {
    expect(CRISIS_THRESHOLDS.PHQ9_SUICIDAL_QUESTION_ID).toBe('phq9_9');
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_SUICIDAL_QUESTION_ID).toBe('phq9_9');
  });

  it('pins the <200ms crisis-detection response budget', () => {
    expect(CRISIS_SAFETY_THRESHOLDS.MAX_CRISIS_RESPONSE_TIME_MS).toBe(200);
  });

  it('preserves the documented divergence — CRISIS_THRESHOLDS treats 15 as the crisis floor, CRISIS_SAFETY_THRESHOLDS treats 20', () => {
    expect(CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE).not.toBe(
      CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE,
    );
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE).toBeGreaterThan(
      CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE,
    );
  });
});

describe('detectCrisis intervention-tier classification (MAINT-251)', () => {
  // The assessment-results crisis banner fires for the active-intervention tier
  // (PHQ-9 ≥20 / Q9>0 / GAD-7 ≥15) and NOT for the PHQ-9 15–19 support tier
  // (which still offers resources via the severity-driven support surface).
  // isInterventionTier is the single predicate the component gates on.
  it.each([
    [14, false, false], // below support floor → no detection
    [15, false, false], // support tier floor (15–19) → NOT intervention
    [19, false, false], // support tier top → NOT intervention
    [20, false, true],  // severe → intervention
    [27, false, true],  // max → intervention
    [5, true, true],    // Q9>0, low score → intervention (suicidal-ideation precedence)
    [0, true, true],    // Q9>0, zero score → intervention
    [19, true, true],   // Q9>0 within the 15–19 band → still intervention (Q9 wins)
  ])('PHQ-9 score %i, Q9>0=%s → intervention=%s', (score, q9, expected) => {
    const detection = detectCrisis(phqResult(score as number, q9 as boolean), 'test-user');
    const intervention = detection !== null && isInterventionTier(detection);
    expect(intervention).toBe(expected);
  });

  it.each([
    [14, false],
    [15, true],
    [21, true],
  ])('GAD-7 score %i → intervention=%s', (score, expected) => {
    const detection = detectCrisis(gad7Result(score as number), 'test-user');
    const intervention = detection !== null && isInterventionTier(detection);
    expect(intervention).toBe(expected);
  });

  it('15–19 support tier is detected (non-null) but classified support, not intervention', () => {
    const detection = detectCrisis(phqResult(17), 'test-user');
    expect(detection).not.toBeNull();
    expect(detection!.primaryTrigger).toBe('phq9_moderate_severe_score');
    expect(detection!.severityLevel).toBe('high');
    expect(isInterventionTier(detection!)).toBe(false);
  });

  it('zero false negatives: every legacy banner case (≥20 / Q9>0 / GAD≥15) still classifies intervention', () => {
    const legacyBannerCases = [
      phqResult(20), phqResult(27), phqResult(5, true), phqResult(0, true),
      gad7Result(15), gad7Result(21),
    ];
    for (const r of legacyBannerCases) {
      const d = detectCrisis(r, 'u');
      expect(d).not.toBeNull();
      expect(isInterventionTier(d!)).toBe(true);
    }
  });
});
