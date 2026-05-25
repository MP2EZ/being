/**
 * detection.quick.test.ts — JEST_QUICK fast-path for `detectCrisis`.
 *
 * Pins the core branch logic of the crisis-detection pure function from
 * safety.ts. No mocks needed — the function is pure. Runs in <50ms under
 * quick-setup.js.
 *
 * Pairs with the heavier behavioral tests in PR 3 (CollapsibleCrisisButton,
 * CrisisSecurityProtocol). This quick test gives <1s feedback if anyone
 * accidentally inverts a threshold comparison.
 */
import { detectCrisis } from '@/features/crisis/types/safety';
import type { PHQ9Result, GAD7Result } from '@/features/assessment/types';

const phq = (totalScore: number, suicidalIdeation = false): PHQ9Result => ({
  totalScore,
  severity: 'minimal',
  isCrisis: false,
  suicidalIdeation,
  completedAt: Date.now(),
  answers: [],
});

const gad = (totalScore: number): GAD7Result => ({
  totalScore,
  severity: 'minimal',
  isCrisis: false,
  completedAt: Date.now(),
  answers: [],
});

describe('detectCrisis — quick branch coverage', () => {
  it('PHQ-9 score below 20 with no Q9 → no crisis', () => {
    expect(detectCrisis(phq(19), 'u1')).toBeNull();
  });

  it('PHQ-9 score at 20 with no Q9 → crisis with phq9_severe_score primaryTrigger', () => {
    const d = detectCrisis(phq(20), 'u1');
    expect(d).not.toBeNull();
    expect(d!.primaryTrigger).toBe('phq9_severe_score');
    expect(d!.severityLevel).toBe('high');
  });

  it('PHQ-9 with Q9>0 (suicidal) and low total → crisis with phq9_suicidal_ideation primaryTrigger', () => {
    const d = detectCrisis(phq(5, true), 'u1');
    expect(d).not.toBeNull();
    expect(d!.primaryTrigger).toBe('phq9_suicidal_ideation');
    // High score + Q9 = critical; low score + Q9 = high
    expect(d!.severityLevel).toBe('high');
  });

  it('PHQ-9 with Q9>0 (suicidal) AND high score → critical severity', () => {
    const d = detectCrisis(phq(22, true), 'u1');
    expect(d).not.toBeNull();
    expect(d!.severityLevel).toBe('critical');
    expect(d!.secondaryTriggers).toContain('phq9_severe_score');
  });

  it('GAD-7 score below 15 → no crisis', () => {
    expect(detectCrisis(gad(14), 'u1')).toBeNull();
  });

  it('GAD-7 score at 15 → crisis with gad7_severe_score', () => {
    const d = detectCrisis(gad(15), 'u1');
    expect(d).not.toBeNull();
    expect(d!.primaryTrigger).toBe('gad7_severe_score');
  });

  it('returns assessmentType matching the input (phq9 or gad7)', () => {
    expect(detectCrisis(phq(22), 'u1')!.assessmentType).toBe('phq9');
    expect(detectCrisis(gad(20), 'u1')!.assessmentType).toBe('gad7');
  });
});
