/**
 * isInterventionTierScore ≡ isInterventionTier(detectCrisis()) — exhaustively (DEBUG-705).
 *
 * The score-only classifier exists for callers holding persisted records, which
 * detectCrisis cannot take (it reads `result.completedAt`). It decides which
 * screenings the retention sweep keeps for 3 years, so any drift from the
 * detection contract silently deletes crisis-tier records at 90 days. Every
 * reachable (type, total, Q9) is compared, not a sample.
 */
import { detectCrisis, isInterventionTier, isInterventionTierScore } from '../safety';
import type { GAD7Result, PHQ9Result } from '@/features/assessment/types';

const viaDetection = (result: PHQ9Result | GAD7Result): boolean => {
  const detection = detectCrisis(result, 'user-1');
  return detection !== null && isInterventionTier(detection);
};

describe('isInterventionTierScore parity with detectCrisis', () => {
  it.each([false, true])('PHQ-9, every total 0–27, Q9 positive = %s', (q9) => {
    for (let total = 0; total <= 27; total++) {
      const result: PHQ9Result = {
        totalScore: total,
        severity: 'moderate',
        isCrisis: total >= 15,
        suicidalIdeation: q9,
        completedAt: Date.now(),
        answers: [],
      };
      expect([total, isInterventionTierScore('phq9', total, q9)]).toEqual([total, viaDetection(result)]);
    }
  });

  it('GAD-7, every total 0–21', () => {
    for (let total = 0; total <= 21; total++) {
      const result: GAD7Result = {
        totalScore: total,
        severity: 'moderate',
        isCrisis: total >= 15,
        completedAt: Date.now(),
        answers: [],
      };
      expect([total, isInterventionTierScore('gad7', total, false)]).toEqual([total, viaDetection(result)]);
    }
  });

  it('pins the boundaries the retention policy names', () => {
    expect(isInterventionTierScore('phq9', 19, false)).toBe(false);
    expect(isInterventionTierScore('phq9', 20, false)).toBe(true);
    expect(isInterventionTierScore('phq9', 15, false)).toBe(false); // support tier: 90 days
    expect(isInterventionTierScore('phq9', 0, true)).toBe(true); // Q9 at any total
    expect(isInterventionTierScore('gad7', 14, false)).toBe(false);
    expect(isInterventionTierScore('gad7', 15, false)).toBe(true);
  });
});
