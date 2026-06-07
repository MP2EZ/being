/**
 * crisisDetectionValidation.unit.test.ts — DEBUG-229 / MAINT-226 Decision E
 *
 * `validateCrisisDetection` must recognize the support tier introduced by the
 * dual-threshold fix: a `phq9_moderate_severe_score` detection is valid only in
 * the 15–19 band (≥ PHQ9_MODERATE_SEVERE_THRESHOLD, < PHQ9_SEVERE_THRESHOLD).
 * The pre-existing `phq9_severe_score` ≥20 guard is unchanged.
 */
import { validateCrisisDetection } from '@/features/assessment/types/validation';
import type { CrisisDetection, CrisisTriggerType } from '@/features/crisis/types/safety';

function detection(
  primaryTrigger: CrisisTriggerType,
  triggerValue: number,
): CrisisDetection {
  return {
    id: 'd1',
    isTriggered: true,
    primaryTrigger,
    secondaryTriggers: [],
    severityLevel: primaryTrigger === 'phq9_severe_score' ? 'critical' : 'high',
    triggerValue,
    assessmentType: 'phq9',
    timestamp: Date.now(),
    assessmentId: 'a1',
    userId: 'u1',
    detectionResponseTimeMs: 0,
    context: { triggeringAnswers: [], timeOfDay: 'morning' },
  };
}

describe('DEBUG-229 — validateCrisisDetection support tier', () => {
  it('phq9_moderate_severe_score at 17 is valid (within 15–19 support band)', () => {
    expect(validateCrisisDetection(detection('phq9_moderate_severe_score', 17)).isValid).toBe(true);
  });

  it('phq9_moderate_severe_score at 15 (floor) is valid', () => {
    expect(validateCrisisDetection(detection('phq9_moderate_severe_score', 15)).isValid).toBe(true);
  });

  it('phq9_moderate_severe_score at 12 is invalid (below support floor)', () => {
    expect(validateCrisisDetection(detection('phq9_moderate_severe_score', 12)).isValid).toBe(false);
  });

  it('phq9_severe_score at 22 is valid; at 18 is invalid (intervention floor unchanged)', () => {
    expect(validateCrisisDetection(detection('phq9_severe_score', 22)).isValid).toBe(true);
    expect(validateCrisisDetection(detection('phq9_severe_score', 18)).isValid).toBe(false);
  });
});
