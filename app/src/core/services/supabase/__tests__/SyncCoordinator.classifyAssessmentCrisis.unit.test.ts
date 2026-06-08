/**
 * classifyAssessmentCrisis — crisis-threshold boundary contract (MAINT-235)
 *
 * Pins the corrected crisis classifier (the pure, exported successor to the
 * DEBUG-233-deleted `isCrisisScore` helper named in MAINT-235's AC). The function
 * disambiguates PHQ-9 vs GAD-7 by result SHAPE (`'suicidalIdeation' in result`),
 * not by score range — the range-based discrimination was the DEBUG-233 bug that
 * routed GAD-7 totals 15-19 into the PHQ-9 branch and missed them (false negative).
 *
 * Contract pinned (CLAUDE.md Safety Facts — zero false negatives):
 *   PHQ-9: crisis if Q9 (suicidalIdeation) > 0 at ANY total, OR totalScore ≥ 20.
 *   GAD-7: crisis if totalScore ≥ 15.
 *   Authoritative `result.isCrisis` flag is the belt-and-suspenders safety net.
 *
 * Pure + synchronous → exhaustive boundary table, no mocks. (Compliance/crisis
 * specialist planning pass: assert ONLY what this unit decides — the PHQ-9 ≥15
 * "support resources" tier is owned elsewhere and is NOT crisis here.)
 */

import { classifyAssessmentCrisis } from '../SyncCoordinator';
import type { PHQ9Result, GAD7Result } from '@/features/assessment/types';

// Minimal honest fixtures. severity/completedAt/answers are unread by the
// classifier (specialist-confirmed) — cast to keep the boundary table focused.
const phq9 = (totalScore: number, suicidalIdeation: boolean, isCrisis = false): PHQ9Result =>
  ({ totalScore, suicidalIdeation, isCrisis } as PHQ9Result);
const gad7 = (totalScore: number, isCrisis = false): GAD7Result =>
  ({ totalScore, isCrisis } as GAD7Result);

describe('classifyAssessmentCrisis — PHQ-9 boundaries (active-intervention floor ≥20)', () => {
  it('19 (no Q9) is NOT a crisis — below the ≥20 active-intervention floor', () => {
    const r = classifyAssessmentCrisis(phq9(19, false));
    expect(r).toEqual({ isCrisis: false, crisisType: '', crisisValue: 0, assessmentType: 'phq9' });
  });

  it('20 (no Q9) IS a crisis at the floor — phq9_score', () => {
    const r = classifyAssessmentCrisis(phq9(20, false));
    expect(r).toEqual({ isCrisis: true, crisisType: 'phq9_score', crisisValue: 20, assessmentType: 'phq9' });
  });

  it('27 (no Q9) is a crisis — phq9_score carries the total', () => {
    expect(classifyAssessmentCrisis(phq9(27, false))).toMatchObject({ isCrisis: true, crisisType: 'phq9_score', crisisValue: 27 });
  });

  it('Q9 > 0 at total 0 IS a crisis — suicidal ideation overrides total (zero false negative)', () => {
    const r = classifyAssessmentCrisis(phq9(0, true));
    expect(r).toEqual({ isCrisis: true, crisisType: 'phq9_suicidal', crisisValue: 1, assessmentType: 'phq9' });
  });

  it('Q9 > 0 at a sub-threshold total still flags suicidal (the suicidal branch wins over ≥20)', () => {
    expect(classifyAssessmentCrisis(phq9(5, true))).toMatchObject({ isCrisis: true, crisisType: 'phq9_suicidal', crisisValue: 1 });
  });
});

describe('classifyAssessmentCrisis — GAD-7 boundaries (crisis floor ≥15)', () => {
  it('14 is NOT a crisis — below the ≥15 floor', () => {
    expect(classifyAssessmentCrisis(gad7(14))).toEqual({ isCrisis: false, crisisType: '', crisisValue: 0, assessmentType: 'gad7' });
  });

  it('15 IS a crisis at the floor — gad7_score', () => {
    expect(classifyAssessmentCrisis(gad7(15))).toEqual({ isCrisis: true, crisisType: 'gad7_score', crisisValue: 15, assessmentType: 'gad7' });
  });

  it('21 (GAD-7 max) is a crisis — gad7_score carries the total', () => {
    expect(classifyAssessmentCrisis(gad7(21))).toMatchObject({ isCrisis: true, crisisType: 'gad7_score', crisisValue: 21 });
  });
});

describe('classifyAssessmentCrisis — DEBUG-233 regression: instrument read from shape, not the bare number', () => {
  it('GAD-7 total 16 (no suicidalIdeation key) IS a crisis — the exact bug DEBUG-233 fixed', () => {
    // Pre-fix this 16 was routed to the PHQ-9 branch, <20, and missed (false negative).
    const r = classifyAssessmentCrisis(gad7(16));
    expect(r).toMatchObject({ isCrisis: true, crisisType: 'gad7_score', assessmentType: 'gad7' });
  });

  it('PHQ-9 total 16 (suicidalIdeation key present, false) is NOT a crisis — same number, opposite outcome', () => {
    const r = classifyAssessmentCrisis(phq9(16, false));
    expect(r).toMatchObject({ isCrisis: false, crisisType: '', assessmentType: 'phq9' });
  });
});

describe('classifyAssessmentCrisis — authoritative-flag safety net + null safety', () => {
  it('honours result.isCrisis even when per-type thresholds disagree (sub-threshold GAD-7, flag set)', () => {
    const r = classifyAssessmentCrisis(gad7(8, true));
    expect(r).toEqual({ isCrisis: true, crisisType: 'assessment_crisis_flag', crisisValue: 8, assessmentType: 'gad7' });
  });

  it('null / undefined do not throw and return a non-crisis classification', () => {
    const expected = { isCrisis: false, crisisType: '', crisisValue: 0, assessmentType: 'gad7' };
    expect(classifyAssessmentCrisis(null)).toEqual(expected);
    expect(classifyAssessmentCrisis(undefined)).toEqual(expected);
  });
});
