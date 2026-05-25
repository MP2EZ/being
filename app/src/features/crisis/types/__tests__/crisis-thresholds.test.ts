import { CRISIS_THRESHOLDS } from '@/features/assessment/types';
import { CRISIS_SAFETY_THRESHOLDS } from '@/features/crisis/types/safety';

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
