/**
 * CLINICAL SAFETY — SyncCoordinator crisis classification (DEBUG-233)
 *
 * Regression coverage for the GAD-7 misclassification bug: the previous
 * `evaluateAssessmentForCrisis` classified PHQ-9 vs GAD-7 by score *range*
 * (`totalScore <= 27` then an unreachable `else if (<= 21)`), so every GAD-7
 * score (max 21) fell into the PHQ-9 branch and a GAD-7 total of 15-19 — a real
 * ≥15 crisis — was neither flagged nor labelled correctly.
 *
 * The fix discriminates by result shape (`'suicidalIdeation' in result`, the
 * codebase's canonical PHQ-9/GAD-7 guard) and applies per-type thresholds:
 *   PHQ-9: crisis if totalScore ≥ 20 OR Q9/suicidalIdeation > 0 (any total)
 *   GAD-7: crisis if totalScore ≥ 15
 * with `result.isCrisis` OR'd in as a belt-and-suspenders net.
 *
 * Zero false negatives (CLAUDE.md → Safety Facts). Boundary cases mandatory.
 */

import { classifyAssessmentCrisis } from '../../src/core/services/supabase/SyncCoordinator';
import {
  PHQ9Result,
  GAD7Result,
} from '../../src/features/assessment/types/index';

const phq9 = (
  totalScore: number,
  suicidalIdeation = false,
  isCrisis = totalScore >= 20 || suicidalIdeation
): PHQ9Result => ({
  totalScore,
  severity: 'moderate',
  isCrisis,
  suicidalIdeation,
  completedAt: 0,
  answers: [],
});

const gad7 = (
  totalScore: number,
  isCrisis = totalScore >= 15
): GAD7Result => ({
  totalScore,
  severity: 'moderate',
  isCrisis,
  completedAt: 0,
  answers: [],
});

describe('classifyAssessmentCrisis — PHQ-9 thresholds', () => {
  it('PHQ-9 19 (no Q9) is NOT a crisis', () => {
    const c = classifyAssessmentCrisis(phq9(19));
    expect(c.isCrisis).toBe(false);
    expect(c.assessmentType).toBe('phq9');
  });

  it('PHQ-9 20 is a crisis, labelled phq9_score / phq9', () => {
    const c = classifyAssessmentCrisis(phq9(20));
    expect(c.isCrisis).toBe(true);
    expect(c.crisisType).toBe('phq9_score');
    expect(c.assessmentType).toBe('phq9');
    expect(c.crisisValue).toBe(20);
  });

  it('PHQ-9 21 is labelled phq9 (NOT gad7) — kills the score-range mislabel', () => {
    const c = classifyAssessmentCrisis(phq9(21));
    expect(c.assessmentType).toBe('phq9');
  });

  it('PHQ-9 Q9 > 0 with total < 20 is a crisis (Q9 overrides total)', () => {
    const c = classifyAssessmentCrisis(phq9(5, true));
    expect(c.isCrisis).toBe(true);
    expect(c.crisisType).toBe('phq9_suicidal');
    expect(c.assessmentType).toBe('phq9');
  });

  it('PHQ-9 Q9 = 0 with total < 20 is NOT a crisis', () => {
    const c = classifyAssessmentCrisis(phq9(5, false));
    expect(c.isCrisis).toBe(false);
  });
});

describe('classifyAssessmentCrisis — GAD-7 thresholds (the regression)', () => {
  it('GAD-7 14 is NOT a crisis', () => {
    const c = classifyAssessmentCrisis(gad7(14));
    expect(c.isCrisis).toBe(false);
    expect(c.assessmentType).toBe('gad7');
  });

  it('GAD-7 15 is a crisis, labelled gad7_score / gad7', () => {
    const c = classifyAssessmentCrisis(gad7(15));
    expect(c.isCrisis).toBe(true);
    expect(c.crisisType).toBe('gad7_score');
    expect(c.assessmentType).toBe('gad7');
    expect(c.crisisValue).toBe(15);
  });

  it('GAD-7 16 is a crisis labelled gad7 (the named DEBUG-233 case)', () => {
    const c = classifyAssessmentCrisis(gad7(16));
    expect(c.isCrisis).toBe(true);
    expect(c.assessmentType).toBe('gad7');
    expect(c.crisisType).toBe('gad7_score');
  });

  it('GAD-7 19 (the previously-missed 15-19 band) is a crisis', () => {
    const c = classifyAssessmentCrisis(gad7(19));
    expect(c.isCrisis).toBe(true);
    expect(c.assessmentType).toBe('gad7');
  });
});

describe('classifyAssessmentCrisis — discriminator & safety net', () => {
  it('discriminates by shape: GAD7Result has no suicidalIdeation key → gad7', () => {
    expect(classifyAssessmentCrisis(gad7(10)).assessmentType).toBe('gad7');
  });

  it('discriminates by shape: PHQ9Result has suicidalIdeation key → phq9', () => {
    expect(classifyAssessmentCrisis(phq9(10)).assessmentType).toBe('phq9');
  });

  it('honours authoritative isCrisis flag even when thresholds disagree', () => {
    // A result that slips past the per-type thresholds but was flagged crisis
    // at scoring time must still be treated as a crisis.
    const c = classifyAssessmentCrisis(gad7(3, /* isCrisis */ true));
    expect(c.isCrisis).toBe(true);
    expect(c.crisisType).toBe('assessment_crisis_flag');
  });
});
