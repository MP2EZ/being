import fs from 'fs';
import path from 'path';

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

// ---------------------------------------------------------------------------
// MAINT-398 — durable pins replacing the deleted two-path parity test.
//
// `CrisisPerformanceOptimizer.detectCrisisOptimized` was a second PHQ-9/GAD-7
// scorer. A parity harness run against both before deletion found 5 divergences
// in 29 cases, every one of them toward UNDER-detection (full table in the
// MAINT-398 PR body). Once the second path is gone no parity test can exist, so
// these pin the canonical behaviour at each point where the two disagreed —
// plus a structural guard that fails if a second scorer ever reappears.
// ---------------------------------------------------------------------------

const phqResultWithQ9 = (totalScore: number, q9Response: number): PHQ9Result => {
  const answers = phqAnswers(totalScore, q9Response);
  const actualTotal = answers.reduce((sum, a) => sum + a.response, 0);
  return {
    totalScore: actualTotal,
    severity:
      actualTotal >= 20 ? 'severe' :
      actualTotal >= 15 ? 'moderately_severe' :
      actualTotal >= 10 ? 'moderate' :
      actualTotal >= 5 ? 'mild' : 'minimal',
    isCrisis: actualTotal >= 15 || q9Response > 0,
    suicidalIdeation: q9Response > 0,
    completedAt: Date.now(),
    answers,
  };
};

describe('MAINT-398 — Q9 severity sweep (suicidal-ideation precedence at every total)', () => {
  // The deleted optimizer hardcoded `triggerValue = 1` for any Q9 > 0, discarding
  // the real total. Canonical carries totalScore, and Q9 takes precedence as
  // primaryTrigger at every score — including totals far below any tier floor.
  const cases: Array<[number, number]> = [];
  for (const q9 of [1, 2, 3]) {
    for (const total of [3, 14, 15, 19, 20]) {
      cases.push([total, q9]);
    }
  }

  it.each(cases)(
    'PHQ-9 total=%i with Q9=%i → suicidal-ideation trigger, intervention tier, real triggerValue',
    (total, q9) => {
      const detection = detectCrisis(phqResultWithQ9(total, q9), 'test-user');

      expect(detection).not.toBeNull();
      expect(detection!.primaryTrigger).toBe('phq9_suicidal_ideation');
      expect(isInterventionTier(detection!)).toBe(true);
      // Not the optimizer's hardcoded 1.
      expect(detection!.triggerValue).toBe(total);
    },
  );
});

describe('MAINT-398 — the exact band the deleted optimizer got wrong', () => {
  // Its PHQ9_CRISIS_LOOKUP was {20..27}, so 15–19 with Q9=0 returned null: a
  // straight false negative against "≥15 = support resources offered". It never
  // received the DEBUG-229 / MAINT-226 Decision E support-tier fix.
  it.each([[15], [16], [17], [18], [19]])(
    'PHQ-9 total=%i with Q9=0 MUST detect as phq9_moderate_severe_score / high',
    total => {
      const detection = detectCrisis(phqResultWithQ9(total, 0), 'test-user');

      expect(detection).not.toBeNull();
      expect(detection!.primaryTrigger).toBe('phq9_moderate_severe_score');
      expect(detection!.severityLevel).toBe('high');
      // Support tier, so NOT intervention — but detected, which is the point.
      expect(isInterventionTier(detection!)).toBe(false);
    },
  );

  // At ≥20 the optimizer emitted 'phq9_moderate_severe_score' where canonical
  // emits 'phq9_severe_score'. That value is excluded by isInterventionTier, so
  // the optimizer routed an active-intervention case to the support tier.
  it.each([[20], [23], [27]])(
    'PHQ-9 total=%i with Q9=0 MUST be phq9_severe_score / critical / intervention tier',
    total => {
      const detection = detectCrisis(phqResultWithQ9(total, 0), 'test-user');

      expect(detection).not.toBeNull();
      expect(detection!.primaryTrigger).toBe('phq9_severe_score');
      expect(detection!.severityLevel).toBe('critical');
      expect(isInterventionTier(detection!)).toBe(true);
    },
  );

  it('the 19 → 20 boundary changes tier, and neither side is ever undetected', () => {
    const support = detectCrisis(phqResultWithQ9(19, 0), 'u');
    const intervention = detectCrisis(phqResultWithQ9(20, 0), 'u');

    expect(support).not.toBeNull();
    expect(intervention).not.toBeNull();
    expect(isInterventionTier(support!)).toBe(false);
    expect(isInterventionTier(intervention!)).toBe(true);
  });
});

describe('MAINT-398 — structural guard: exactly one PHQ-9 crisis scorer in the tree', () => {
  // A file that PRODUCES a PHQ-9 crisis trigger is a scorer. A file that merely
  // COMPARES one (validation), declares the union type, or names one in a
  // comment is not — so the guard keys on production, not on mention. It is
  // written to catch the deleted optimizer's exact shape, which assigned the
  // literal to a local (`triggerType = 'phq9_moderate_severe_score'`) and would
  // slip past any regex anchored on the word `primaryTrigger`.
  const SRC_ROOT = path.resolve(__dirname, '../../../..');

  const TRIGGER_LITERALS = [
    'phq9_suicidal_ideation',
    'phq9_severe_score',
    'phq9_moderate_severe_score',
  ];

  // Every file permitted to produce a PHQ-9 crisis trigger, and why.
  const ALLOWED_PRODUCERS: Record<string, string> = {
    'features/crisis/types/safety.ts':
      'canonical detectCrisis — the single source of truth for PHQ-9 tiering',
    'features/assessment/stores/assessmentStore.ts':
      'deliberate second TRIGGER site for real-time Q9 (delegates severity to ClinicalScoringService); not a second scorer',
  };

  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : walk(full);
      }
      return /\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) ? [full] : [];
    });

  const producesTrigger = (line: string): boolean => {
    const code = line.trim();
    // Comments name triggers legitimately (tombstones, doc blocks, the union's
    // trailing annotations). They render nothing and decide nothing.
    if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return false;

    return TRIGGER_LITERALS.some(literal => {
      const quoted = `'${literal}'`;
      if (!code.includes(quoted)) return false;
      // Comparisons read a trigger, they don't mint one.
      if (new RegExp(`[=!]==\\s*${quoted}`).test(code)) return false;
      // Union members in the CrisisTriggerType declaration.
      if (new RegExp(`\\|\\s*${quoted}`).test(code)) return false;
      // Assignment, object-property value, array literal, or .push(...).
      return new RegExp(`(=|:|\\(|\\[|,)\\s*${quoted}`).test(code);
    });
  };

  it('no source file outside the allowlist produces a PHQ-9 crisis trigger', () => {
    const producers = walk(SRC_ROOT)
      .filter(file =>
        fs.readFileSync(file, 'utf8').split('\n').some(producesTrigger),
      )
      .map(file => path.relative(SRC_ROOT, file).split(path.sep).join('/'))
      .sort();

    expect(producers).toEqual(Object.keys(ALLOWED_PRODUCERS).sort());
  });

  it('the guard is not vacuous — it detects the canonical scorer it is meant to allow', () => {
    // If this fails, the matcher stopped recognising trigger production and the
    // test above would pass by finding nothing at all.
    const canonical = fs.readFileSync(
      path.join(SRC_ROOT, 'features/crisis/types/safety.ts'),
      'utf8',
    );
    expect(canonical.split('\n').filter(producesTrigger).length).toBeGreaterThan(0);
  });

  it('the guard rejects the deleted optimizer shape and accepts validation/comment mentions', () => {
    expect(producesTrigger("        triggerType = 'phq9_moderate_severe_score';")).toBe(true);
    expect(producesTrigger("      triggers.push('phq9_severe_score');")).toBe(true);
    expect(producesTrigger("        primaryTrigger: 'phq9_suicidal_ideation' as const,")).toBe(true);

    expect(producesTrigger("    if (detection.primaryTrigger === 'phq9_severe_score' &&")).toBe(false);
    expect(producesTrigger("  | 'phq9_severe_score'          // PHQ-9 score >=20")).toBe(false);
    expect(producesTrigger("  //   - PHQ-9 total >=20: the optimizer emitted 'phq9_moderate_severe_score'.")).toBe(false);
  });
});
