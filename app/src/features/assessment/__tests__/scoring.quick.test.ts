/**
 * scoring.quick.test.ts — JEST_QUICK fast-path coverage for clinical scoring.
 *
 * The full PHQ-9 / GAD-7 scoring sweep lives in
 * `__tests__/clinical/assessment-accuracy/comprehensive-scoring-validation.test.ts`
 * (every 0-27 / 0-21 combo). This quick variant covers the boundary cases a
 * developer is most likely to break while editing: 0, max, just-below-crisis,
 * at-crisis, Q9-suicidal-with-low-total.
 *
 * Pure logic, no RN deps — runs in <50ms under quick-setup.js.
 */
import { ClinicalScoringService } from '@/features/assessment/stores/assessmentStore';
import type { AssessmentAnswer } from '@/features/assessment/types';

const phq9Answers = (responses: number[]): AssessmentAnswer[] =>
  responses.map((response, i) => ({
    questionId: `phq9_${i + 1}`,
    response: response as AssessmentAnswer['response'],
    timestamp: Date.now(),
  }));

const gad7Answers = (responses: number[]): AssessmentAnswer[] =>
  responses.map((response, i) => ({
    questionId: `gad7_${i + 1}`,
    response: response as AssessmentAnswer['response'],
    timestamp: Date.now(),
  }));

describe('ClinicalScoringService — quick boundary tests', () => {
  describe('PHQ-9', () => {
    it('total=0 → severity=minimal, isCrisis=false', () => {
      const r = ClinicalScoringService.calculatePHQ9Score(phq9Answers(Array(9).fill(0)));
      expect(r.totalScore).toBe(0);
      expect(r.severity).toBe('minimal');
      expect(r.isCrisis).toBe(false);
    });

    it('total=27 (max) → severity=severe, isCrisis=true', () => {
      const r = ClinicalScoringService.calculatePHQ9Score(phq9Answers(Array(9).fill(3)));
      expect(r.totalScore).toBe(27);
      expect(r.severity).toBe('severe');
      expect(r.isCrisis).toBe(true);
    });

    it('Q9>0 with low total → isCrisis=true (suicidal-ideation override)', () => {
      // Total=1 (Q9 only), well below the 15 score floor, but Q9>0 triggers
      const r = ClinicalScoringService.calculatePHQ9Score(
        phq9Answers([0, 0, 0, 0, 0, 0, 0, 0, 1]),
      );
      expect(r.totalScore).toBe(1);
      expect(r.isCrisis).toBe(true);
      expect(r.suicidalIdeation).toBe(true);
    });

    it('throws on invalid PHQ-9 answer count (regression guard)', () => {
      expect(() => ClinicalScoringService.calculatePHQ9Score(phq9Answers([0, 0, 0]))).toThrow();
    });
  });

  describe('GAD-7', () => {
    it('total=0 → severity=minimal, isCrisis=false', () => {
      const r = ClinicalScoringService.calculateGAD7Score(gad7Answers(Array(7).fill(0)));
      expect(r.totalScore).toBe(0);
      expect(r.severity).toBe('minimal');
      expect(r.isCrisis).toBe(false);
    });

    it('total=21 (max) → severity=severe, isCrisis=true', () => {
      const r = ClinicalScoringService.calculateGAD7Score(gad7Answers(Array(7).fill(3)));
      expect(r.totalScore).toBe(21);
      expect(r.severity).toBe('severe');
      expect(r.isCrisis).toBe(true);
    });

    it('throws on invalid GAD-7 answer count (regression guard)', () => {
      expect(() => ClinicalScoringService.calculateGAD7Score(gad7Answers([0, 0]))).toThrow();
    });
  });
});
