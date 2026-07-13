/**
 * thresholds.quick.test.ts — JEST_QUICK fast-path for the dual-threshold
 * contract documented in CLAUDE.md (≥15 = support, ≥20 = active intervention,
 * Q9>0 = immediate intervention).
 *
 * Pure constant assertions. Pairs with the heavier
 * `src/features/crisis/types/__tests__/crisis-thresholds.test.ts` (PR 1).
 * The quick variant gives <1s feedback if anyone changes 15 → 16 by accident.
 */
import { CRISIS_THRESHOLDS } from '@/features/assessment/types';
import { CRISIS_SAFETY_THRESHOLDS } from '@/features/crisis/types/safety';

describe('CRISIS thresholds — quick contract pin', () => {
  it('PHQ-9 support floor stays at 15', () => {
    expect(CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE).toBe(15);
    expect(CRISIS_THRESHOLDS.PHQ9_MODERATE_SEVERE_THRESHOLD).toBe(15);
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_MODERATE_SEVERE_THRESHOLD).toBe(15);
  });

  it('PHQ-9 active-intervention floor stays at 20', () => {
    expect(CRISIS_THRESHOLDS.PHQ9_SEVERE_THRESHOLD).toBe(20);
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_SEVERE_THRESHOLD).toBe(20);
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE).toBe(20);
  });

  it('GAD-7 severe floor stays at 15', () => {
    expect(CRISIS_THRESHOLDS.GAD7_CRISIS_SCORE).toBe(15);
    expect(CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE).toBe(15);
  });

  it('PHQ-9 suicidal-ideation question ID is phq9_9', () => {
    expect(CRISIS_THRESHOLDS.PHQ9_SUICIDAL_QUESTION_ID).toBe('phq9_9');
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_SUICIDAL_QUESTION_ID).toBe('phq9_9');
  });

  it('crisis-response budget stays at 200ms', () => {
    expect(CRISIS_SAFETY_THRESHOLDS.MAX_CRISIS_RESPONSE_TIME_MS).toBe(200);
  });
});
