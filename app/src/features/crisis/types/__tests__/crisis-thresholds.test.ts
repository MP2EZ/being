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
import { GAD7_SCORING_CONFIG, PHQ9_SCORING_CONFIG } from '@/features/assessment/types/scoring';

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

/**
 * FEAT-457 — the GAD-7 gentle floor consumed by the domain-guidance gate.
 *
 * THE DERIVATION RULE, which is what these assertions actually pin: each axis's
 * gentle floor is the floor of the standard severity band IMMEDIATELY BELOW that
 * axis's suppression floor. PHQ-9 suppresses at 20 (`severe`) → gentle at 15
 * (`moderately_severe` floor). GAD-7 suppresses at 15 (`severe`) → gentle at 10
 * (`moderate` floor). One rule, two axes, no free parameters.
 *
 * So 10 is NOT a new clinical number: it is the Spitzer (2006) moderate cut-point
 * already encoded in `GAD7_SCORING_CONFIG`, reached by the same derivation that
 * produced the shipped PHQ-9 floor. The tests below assert the RELATIONSHIP rather
 * than restating the literal, so a future re-band of either instrument surfaces here
 * instead of silently moving a safety floor.
 *
 * `GAD7_MODERATE_THRESHOLD` is named for the BAND, never for a tier or a trigger.
 * `CRISIS_THRESHOLDS` is re-exported wholesale, so a `*_SUPPORT_*` or `*_CRISIS_*`
 * name here would read to the next author as a ratified intervention floor at
 * GAD-7 10 and invite a crisis banner or a `crisis_detected` emit. No detection
 * path may read this constant.
 */
describe('FEAT-457 — GAD-7 moderate floor (guidance gentle band)', () => {
  it('pins the constant at 10', () => {
    expect(CRISIS_THRESHOLDS.GAD7_MODERATE_THRESHOLD).toBe(10);
  });

  it('equals the floor of the standard GAD-7 moderate band, not an independent number', () => {
    expect(CRISIS_THRESHOLDS.GAD7_MODERATE_THRESHOLD).toBe(
      GAD7_SCORING_CONFIG.severityThresholds.moderate[0],
    );
  });

  it('sits strictly below the GAD-7 severe (suppression) floor', () => {
    expect(CRISIS_THRESHOLDS.GAD7_MODERATE_THRESHOLD).toBeLessThan(
      CRISIS_SAFETY_THRESHOLDS.GAD7_SEVERE_THRESHOLD,
    );
  });

  it('leaves NO score gap between the gentle band and suppression, on either axis', () => {
    // A gap is how a score falls through a ladder: every integer from the gentle
    // floor up to the suppression floor must be claimed by exactly one band.
    expect(GAD7_SCORING_CONFIG.severityThresholds.moderate[1] + 1).toBe(
      CRISIS_SAFETY_THRESHOLDS.GAD7_SEVERE_THRESHOLD,
    );
    expect(PHQ9_SCORING_CONFIG.severityThresholds.moderately_severe[1] + 1).toBe(
      CRISIS_SAFETY_THRESHOLDS.PHQ9_SEVERE_THRESHOLD,
    );
  });

  it('applies ONE derivation rule to both axes', () => {
    expect(CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE).toBe(
      PHQ9_SCORING_CONFIG.severityThresholds.moderately_severe[0],
    );
    expect(CRISIS_THRESHOLDS.GAD7_MODERATE_THRESHOLD).toBe(
      GAD7_SCORING_CONFIG.severityThresholds.moderate[0],
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
//
// MAINT-252 addendum. Three of the four divergences are pinned below with
// their rationale attached. The fourth is pinned ELSEWHERE and was, until now,
// pinned anonymously — recorded here because MAINT-252 deleted
// `CrisisPerformanceOptimizer.ts`, which was the only place the reasoning
// survived:
//
//   Fourth divergence — malformed input (wrong answer count). Canonical
//   `ClinicalScoringService.calculatePHQ9Score` THROWS and the caller sees it;
//   the optimizer's catch swallowed everything into `return null`, making a
//   scoring FAILURE indistinguishable from "no crisis". On a zero-false-negative
//   path that is a fail-OPEN. Pinned by
//   `features/assessment/__tests__/scoring.quick.test.ts`
//   ("throws on invalid PHQ-9/GAD-7 answer count"). Note the throw lives in
//   `ClinicalScoringService` (assessment/stores/assessmentStore.ts), NOT in
//   `detectCrisis` — canonical `detectCrisis` never inspects answer count, so
//   do not go looking for it in safety.ts.
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

describe('MAINT-702 — ports from the deleted SyncCoordinator classifier suites', () => {
  // SyncCoordinator.classifyAssessmentCrisis was a dormant second classifier; its
  // suites were the only pins on two cases canonical detectCrisis had no direct
  // assertion for. Translated to detectCrisis's own two tiers — its PHQ-9 ≥20
  // crisis floor is deliberately NOT ported (canonical detects 15–19 as support).

  // DEBUG-233: a GAD-7 total of 15–19 was the previously-missed band.
  it.each([[16], [17], [18], [19]])(
    'GAD-7 total=%i MUST detect as gad7_severe_score / intervention tier / gad7',
    total => {
      const detection = detectCrisis(gad7Result(total), 'test-user');

      expect(detection).not.toBeNull();
      expect(detection!.primaryTrigger).toBe('gad7_severe_score');
      expect(isInterventionTier(detection!)).toBe(true);
      expect(detection!.assessmentType).toBe('gad7');
    },
  );

  it('PHQ-9 total=16 with Q9=0 detects as the support tier, labelled phq9', () => {
    const detection = detectCrisis(phqResultWithQ9(16, 0), 'test-user');

    expect(detection).not.toBeNull();
    expect(detection!.primaryTrigger).toBe('phq9_moderate_severe_score');
    expect(detection!.severityLevel).toBe('high');
    expect(isInterventionTier(detection!)).toBe(false);
    expect(detection!.assessmentType).toBe('phq9');
  });
});

// Shared by the MAINT-398 and MAINT-712 structural guards: every non-test
// .ts/.tsx file under app/src.
const SRC_ROOT = path.resolve(__dirname, '../../../..');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : walk(full);
    }
    return /\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) ? [full] : [];
  });

describe('MAINT-398 — structural guard: exactly one PHQ-9 crisis scorer in the tree', () => {
  // A file that PRODUCES a PHQ-9 crisis trigger is a scorer. A file that merely
  // COMPARES one (validation), declares the union type, or names one in a
  // comment is not — so the guard keys on production, not on mention. It is
  // written to catch the deleted optimizer's exact shape, which assigned the
  // literal to a local (`triggerType = 'phq9_moderate_severe_score'`) and would
  // slip past any regex anchored on the word `primaryTrigger`.
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

// ---------------------------------------------------------------------------
// MAINT-712 — structural guard: no literal crisis-threshold comparison outside
// a COUNTED allowlist.
//
// MAINT-712 deleted three dead re-implementations of the crisis thresholds
// (validation.ts, safety.ts validateCrisisDetection, schemas.ts isCrisis
// refines) plus a live one (EncryptionService tiering). This guard stops the
// next copy: a comparison of a score/total/triggerValue against 15/20 or a
// *CRISIS*/*SEVERE* constant, or of Q9 against >0, anywhere in app/src outside
// the allowlist below fails here. Counts are exact, so a new comparison in an
// ALLOWED file fails too, and a removed one forces the entry down.
//
// RECORDED BLIND SPOTS — the guard cannot see these; each is pinned as a known
// negative in the self-test below so the record cannot silently go stale:
//   - Q9 tested across two lines. ClinicalScoringService.calculatePHQ9Score
//     looks Q9 up on one line (`suicidalAnswer = ...PHQ9_SUICIDAL_QUESTION_ID`)
//     and tests `suicidalAnswer.response > 0` on the next; neither line alone
//     matches. It is covered instead by crisis-thresholds.equivalence.test.ts.
//   - A score held in a name that contains neither score, total nor
//     triggerValue (`sum >= 20`), or a floor held in a name that contains
//     neither CRISIS nor SEVERE, or written as any other literal (`> 19`).
//   - A comparison wrapped across lines between operand and operator.
//   - Anything outside app/src (scripts/, supabase/functions/), test files,
//     and .js files — the walk covers non-test .ts/.tsx under app/src only.
//   - A regex literal containing a quote or comment marker can mis-strip the
//     rest of its line.
// NOT blind, though anticipated as one: the `(x.totalScore ?? 0) >= 20` shape
// (DataRetentionService before DEBUG-705) — NULLISH_PAREN matches it, self-tested below.
// ---------------------------------------------------------------------------

describe('MAINT-712 — structural guard: literal crisis-threshold comparisons are counted', () => {
  // Every file permitted to compare against a crisis floor, how many lines do,
  // and why. A file absent here must have zero.
  const ALLOWED_THRESHOLD_SITES: Record<string, { count: number; why: string }> = {
    'features/crisis/types/safety.ts': {
      count: 6,
      why: 'canonical detectCrisis — the single source of truth; plus isInterventionTierScore (DEBUG-705 retention tier), pinned to detectCrisis by interventionTierScore.test.ts exhaustive parity',
    },
    'features/assessment/stores/assessmentStore.ts': {
      count: 4,
      why: 'ClinicalScoringService PHQ-9/GAD-7 isCrisis, crisisSeverityLevel, inline Q9 trigger — each pinned to detectCrisis by crisis-thresholds.equivalence.test.ts',
    },
    'features/guidance/services/guidanceGate.ts': {
      count: 4,
      why: 'suppress/gentle predicates (FEAT-457) — pinned to detectCrisis/isInterventionTier by crisis-thresholds.equivalence.test.ts',
    },
    'features/assessment/types/schemas.ts': {
      count: 3,
      why: 'retained severity-BAND refines (PHQ9ResultSchema/GAD7ResultSchema) — banding, not crisis classification',
    },
    'core/services/supabase/SupabaseService.ts': {
      count: 4,
      why: 'retained scoreToSeverityBucket — privacy-preserving severity banding for telemetry',
    },
  };

  /** Blank comments, keep strings and line numbers. */
  const stripComments = (src: string): string => {
    let out = '';
    let quote: string | null = null;
    let i = 0;
    while (i < src.length) {
      const c = src[i]!;
      const next = src[i + 1];
      if (quote) {
        out += c;
        if (c === '\\') {
          out += next ?? '';
          i += 2;
          continue;
        }
        if (c === quote || (c === '\n' && quote !== '`')) quote = null;
        i++;
        continue;
      }
      if (c === '/' && next === '/') {
        while (i < src.length && src[i] !== '\n') i++;
        continue;
      }
      if (c === '/' && next === '*') {
        const end = src.indexOf('*/', i + 2);
        const stop = end === -1 ? src.length : end + 2;
        out += src.slice(i, stop).replace(/[^\n]/g, ' ');
        i = stop;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') quote = c;
      out += c;
      i++;
    }
    return out;
  };

  const SCORE_ID = String.raw`\b\w*(?:[Ss]core|[Tt]otal|[Tt]riggerValue)\w*\b`;
  const NULLISH_PAREN = String.raw`(?:\s*\?\?\s*\d+\s*\))?`;
  const OP = String.raw`\s*(?:>=|<=|>|<|===|!==|==|!=)\s*`;
  const FLOOR = String.raw`(?:\b(?:15|20)\b(?!\.\d)|[\w.]*(?:CRISIS|SEVERE)\w*)`;
  const SCORE_VS_FLOOR = new RegExp(`${SCORE_ID}${NULLISH_PAREN}${OP}${FLOOR}|${FLOOR}${OP}${SCORE_ID}`);
  const Q9_REF = /phq9_9|responses\[8\]|PHQ9_SUICIDAL_QUESTION_ID/;
  const Q9_POSITIVE = /(?:>\s*0\b|>=\s*1\b|!==?\s*0\b)/;

  const comparesThreshold = (codeLine: string): boolean =>
    SCORE_VS_FLOOR.test(codeLine) || (Q9_REF.test(codeLine) && Q9_POSITIVE.test(codeLine));

  const thresholdSites = (source: string): number =>
    stripComments(source).split('\n').filter(comparesThreshold).length;

  const scan = (root: string): Record<string, number> =>
    Object.fromEntries(
      walk(root)
        .map(file => [
          path.relative(root, file).split(path.sep).join('/'),
          thresholdSites(fs.readFileSync(file, 'utf8')),
        ] as const)
        .filter(([, n]) => n > 0)
        .sort(([a], [b]) => a.localeCompare(b)),
    );

  it('every literal crisis-threshold comparison in app/src is in the counted allowlist', () => {
    const expected = Object.fromEntries(
      Object.entries(ALLOWED_THRESHOLD_SITES)
        .map(([file, { count }]) => [file, count] as const)
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    expect(scan(SRC_ROOT)).toEqual(expected);
  });

  it('the guard is not vacuous — the scanned slice holds the allowlisted files and real hits', () => {
    // If the walk found nothing, or stripping ate the code, the test above
    // could only pass by an empty allowlist. Assert against the slice itself.
    const scanned = walk(SRC_ROOT).map(f => path.relative(SRC_ROOT, f).split(path.sep).join('/'));
    expect(scanned.length).toBeGreaterThan(Object.keys(ALLOWED_THRESHOLD_SITES).length);
    expect(scanned).toEqual(expect.arrayContaining(Object.keys(ALLOWED_THRESHOLD_SITES)));

    const canonical = fs.readFileSync(path.join(SRC_ROOT, 'features/crisis/types/safety.ts'), 'utf8');
    const stripped = stripComments(canonical);
    expect(stripped).toContain('export function detectCrisis(');
    expect(stripped.split('\n')).toHaveLength(canonical.split('\n').length);
    expect(thresholdSites(canonical)).toBeGreaterThan(0);

    const hits = Object.values(scan(SRC_ROOT)).reduce((a, b) => a + b, 0);
    expect(hits).toBeGreaterThan(0);
  });

  it('matches the shapes MAINT-712 deleted, ignores comments and non-floor comparisons', () => {
    const hit = (code: string) => thresholdSites(code) === 1;

    // Shapes of the deleted copies.
    expect(hit('if (totalScore >= 20) return x;')).toBe(true);
    expect(hit('const c = result.totalScore >= CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE || si;')).toBe(true);
    expect(hit('} else if (assessmentData.totalScore >= 20 ||')).toBe(true);
    expect(hit("(assessmentData.type === 'GAD-7' && assessmentData.totalScore >= 15)")).toBe(true);
    expect(hit('detection.triggerValue < CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE) {')).toBe(true);
    expect(hit('if (20 <= score) {')).toBe(true);
    expect(hit("(assessment.type === 'phq9' && (result?.totalScore ?? 0) >= 20) ||")).toBe(true);
    expect(hit("if (assessmentData.type === 'PHQ-9' && (assessmentData.responses[8] ?? 0) > 0) {")).toBe(true);
    expect(hit('if (questionId === CRISIS_THRESHOLDS.PHQ9_SUICIDAL_QUESTION_ID && response > 0) {')).toBe(true);
    expect(hit("const q9 = answers.find(a => a.questionId === 'phq9_9')?.response >= 1;")).toBe(true);

    // Comments decide nothing.
    expect(hit('// if (totalScore >= 20) return x;')).toBe(false);
    expect(hit('const a = 1; /* totalScore >= 20 */')).toBe(false);
    expect(hit('const url = "https://x"; // score >= 15')).toBe(false);

    // Not a crisis floor.
    expect(hit('if (totalTime > 200) warn();')).toBe(false);
    expect(hit('if (score >= 10) return "moderate";')).toBe(false);
    expect(hit("return severity === 'severe';")).toBe(false);
    expect(hit('if (score >= min && score <= max) {')).toBe(false);
  });

  it('records its blind spots as known negatives (see the header)', () => {
    const blind = (code: string) => thresholdSites(code) === 0;

    // calculatePHQ9Score's two-line Q9 test.
    expect(blind([
      'const suicidalAnswer = phqAnswers.find(a => a.questionId === CRISIS_THRESHOLDS.PHQ9_SUICIDAL_QUESTION_ID);',
      'const suicidalIdeation = suicidalAnswer ? suicidalAnswer.response > 0 : false;',
    ].join('\n'))).toBe(true);
    // Unrecognised names / literals.
    expect(blind('if (sum >= 20) return true;')).toBe(true);
    expect(blind('if (totalScore > 19) return true;')).toBe(true);
    // Wrapped comparison.
    expect(blind('if (totalScore >=\n  20) return true;')).toBe(true);
  });
});
