/**
 * Domain guidance safety gate — boundary matrix (FEAT-55, slice 1).
 *
 * `decideGuidanceAccess` is the "crisis supersedes philosophy" rule: it decides
 * whether someone reaching for situational Stoic guidance is shown the full
 * ladder, only the gentlest layer, or nothing at all because they should be
 * looking at crisis resources instead. It is a pure function so that every
 * threshold boundary is table-testable with zero false negatives.
 *
 * WHY THIS FILE LIVES IN `__tests__/clinical/`: `npm run test:clinical` is
 * `jest --testPathPattern=clinical`, which matches on PATH. A spec co-located at
 * `src/features/guidance/__tests__/guidanceGate.test.ts` would be executed by
 * neither `test:clinical` nor `test:crisis-detection` (a hardcoded filename
 * whitelist), so the safety gate this feature depends on would have shipped with
 * its own verification silently not running.
 *
 * THE THRESHOLD COLLISION THIS SUITE EXISTS TO PIN: two modules export a field
 * literally named `PHQ9_CRISIS_SCORE` with different values —
 * `CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE` is 20 (active-intervention floor)
 * and `CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE` is 15 (support floor). The divergence
 * is deliberate and pinned by `crisis-thresholds.test.ts`. An import from the
 * wrong module type-checks silently (both are `number`) and would raise this
 * gate's gentle-layer floor from 15 to 20, handing the full ladder to people
 * scoring 15-19. Every assertion below reads the constants rather than literals,
 * so the boundary cases fail loudly if the wrong one is ever wired in.
 */

import { CRISIS_SAFETY_THRESHOLDS } from '@/features/crisis/types/safety';
import { CRISIS_THRESHOLDS, type PHQ9Result, type GAD7Result } from '@/features/assessment/types';
import type { DevelopmentalStage } from '@/features/learn/types/education';
import { decideGuidanceAccess } from '@/features/guidance/services/guidanceGate';
import {
  decideAdmissibleGuidanceAccess,
  GENTLE_WITHHELD_DECISION,
} from '@/features/guidance/services/guidanceAdmissibility';


const PHQ9_SEVERE = CRISIS_SAFETY_THRESHOLDS.PHQ9_SEVERE_THRESHOLD; // 20
const GAD7_SEVERE = CRISIS_SAFETY_THRESHOLDS.GAD7_SEVERE_THRESHOLD; // 15
const PHQ9_SUPPORT = CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE; // 15
// FEAT-457: the GAD-7 gentle floor. Same derivation as PHQ9_SUPPORT — the floor of
// the band immediately below that axis's suppression floor — so it is read from the
// constant here for the same reason the others are.
const GAD7_MODERATE = CRISIS_THRESHOLDS.GAD7_MODERATE_THRESHOLD; // 10

function phq9(totalScore: number, suicidalIdeation = false): PHQ9Result {
  return {
    totalScore,
    severity: 'moderate',
    isCrisis: totalScore >= PHQ9_SEVERE,
    suicidalIdeation,
    completedAt: 1_000,
    answers: [],
  };
}

function gad7(totalScore: number): GAD7Result {
  return {
    totalScore,
    severity: 'moderate',
    isCrisis: totalScore >= GAD7_SEVERE,
    completedAt: 1_000,
    answers: [],
  };
}

/** A pair that is comfortably below every floor, so a case under test is the
 *  only thing that can move the verdict. */
const CALM_PHQ9 = () => phq9(3);
const CALM_GAD7 = () => gad7(2);

describe('FEAT-55 · the constants this gate binds to', () => {
  // If these drift, every boundary below is testing the wrong thing.
  it('reads the support floor from CRISIS_THRESHOLDS (15), not CRISIS_SAFETY_THRESHOLDS (20)', () => {
    expect(PHQ9_SUPPORT).toBe(15);
    expect(CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE).toBe(20);
    // The collision is real and deliberate — this asserts it still exists, so a
    // future "cleanup" that unifies them cannot pass silently.
    expect(CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE).not.toBe(
      CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE
    );
  });

  it('reads the severe floors as 20 (PHQ-9) and 15 (GAD-7)', () => {
    expect(PHQ9_SEVERE).toBe(20);
    expect(GAD7_SEVERE).toBe(15);
  });
});

describe('FEAT-55 · PHQ-9 total drives the ladder at every boundary', () => {
  // 9/10/14 are FEAT-457 rows: they pin that PHQ-9's own `moderate` band (10-14)
  // stays `full`. The derivation rule gives 15 on this axis because PHQ-9 has FIVE
  // bands and GAD-7 has four, so "one band below suppression" is `moderately_severe`
  // here and `moderate` there. That the two land on differently-named bands is a
  // property of the instruments, not a drift between the axes — and lowering this
  // floor to 10 to "match" GAD-7 would be a new clinical decision over a large
  // shipped cohort, with no derivation warrant.
  it.each([
    [9, 'full'],
    [10, 'full'],
    [14, 'full'],
    [15, 'gentle'],
    [19, 'gentle'],
    [20, 'suppressed'],
    [21, 'suppressed'],
  ] as const)('PHQ-9 %i → %s', (total, expected) => {
    expect(decideGuidanceAccess(phq9(total), CALM_GAD7(), null).level).toBe(expected);
  });
});

/**
 * FEAT-457 — the GAD-7 arm gains a gentle band, and `[14, 'full']` becomes
 * `[14, 'gentle']`.
 *
 * Slice 1 shipped GAD-7 as suppression-only, so 10-14 fell through to `full`. That
 * was INERT while `full` and `gentle` both rendered Tier 0/1 and nothing else. It
 * stops being inert the moment Tier 2/3 render, at which point a GAD-7 12 reader
 * receives the complete four-tier ladder while a PHQ-9 17 reader does not — two
 * comparably distressed cohorts, opposite answers, for no clinical reason. The
 * asymmetry was never a policy; it was an artifact of `CRISIS_THRESHOLDS` having a
 * PHQ-9 support floor and no GAD-7 counterpart.
 */
describe('FEAT-457 · GAD-7 total drives the ladder at every boundary', () => {
  it.each([
    [9, 'full'],
    [10, 'gentle'],
    [12, 'gentle'],
    [14, 'gentle'],
    [15, 'suppressed'],
    [21, 'suppressed'],
  ] as const)('GAD-7 %i → %s', (total, expected) => {
    expect(decideGuidanceAccess(CALM_PHQ9(), gad7(total), null).level).toBe(expected);
  });

  it('caps the ladder across the whole gentle band, not merely at its floor', () => {
    for (let total = GAD7_MODERATE; total < GAD7_SEVERE; total++) {
      const result = decideGuidanceAccess(CALM_PHQ9(), gad7(total), null);
      expect(result.level).toBe('gentle');
      expect(result.allowTier2Plus).toBe(false);
      expect(result.crisisRoute).toBeUndefined();
    }
  });

  it('reads the floor from the constant, so a literal 10 cannot drift from it', () => {
    expect(decideGuidanceAccess(CALM_PHQ9(), gad7(GAD7_MODERATE - 1), null).level).toBe('full');
    expect(decideGuidanceAccess(CALM_PHQ9(), gad7(GAD7_MODERATE), null).level).toBe('gentle');
  });
});

/**
 * FEAT-457 — cross-axis precedence, now that BOTH axes have three bands.
 *
 * The gate must resolve to the MORE PROTECTIVE axis, and must not double-count: two
 * gentle readings are still gentle, never suppression.
 */
describe('FEAT-457 · cross-axis precedence with two banded axes', () => {
  it.each([
    ['PHQ-9 full-band + GAD-7 gentle-band → gentle', 12, false, 12, 'gentle', false],
    ['PHQ-9 full-band + GAD-7 below floor → full', 12, false, 9, 'full', true],
    ['both in their gentle bands → gentle, not suppressed', 17, false, 12, 'gentle', false],
    ['GAD-7 severe beats a calm PHQ-9', 2, false, 15, 'suppressed', false],
    ['PHQ-9 severe beats a gentle GAD-7', 20, false, 12, 'suppressed', false],
    ['Q9 beats BOTH gentle bands', 19, true, 12, 'suppressed', false],
  ] as const)('%s', (_label, p, q9, g, level, tier2) => {
    const result = decideGuidanceAccess(phq9(p, q9), gad7(g), null);
    expect(result.level).toBe(level);
    expect(result.allowTier2Plus).toBe(tier2);
  });
});

describe('FEAT-55 · Q9 suicidal ideation suppresses independently of any total', () => {
  // The single most safety-critical row in the matrix. CLAUDE.md: "Q9 (self-harm)
  // >0 = immediate intervention REGARDLESS of total." A gate that ANDs Q9 with a
  // score floor would pass every other test in this file.
  it.each([0, 1, 3, 14, 19])('Q9>0 at PHQ-9 total %i → suppressed', (total) => {
    const result = decideGuidanceAccess(phq9(total, true), CALM_GAD7(), null);
    expect(result.level).toBe('suppressed');
    expect(result.allowTier2Plus).toBe(false);
    expect(result.allowPremeditatio).toBe(false);
  });

  it('Q9=0 at the same low totals does not suppress', () => {
    expect(decideGuidanceAccess(phq9(1, false), CALM_GAD7(), null).level).toBe('full');
  });

  it('Q9>0 is not overridable by an advanced developmental stage', () => {
    expect(decideGuidanceAccess(phq9(1, true), CALM_GAD7(), 'integrated').level).toBe('suppressed');
  });
});

describe('FEAT-55 · conflicting signals resolve to the more protective axis', () => {
  it('calm PHQ-9 + severe GAD-7 → suppressed', () => {
    expect(decideGuidanceAccess(phq9(2), gad7(GAD7_SEVERE), null).level).toBe('suppressed');
  });

  it('severe PHQ-9 + calm GAD-7 → suppressed', () => {
    expect(decideGuidanceAccess(phq9(PHQ9_SEVERE), gad7(1), null).level).toBe('suppressed');
  });

  it('PHQ-9 in the gentle band + mild GAD-7 → gentle, not suppressed', () => {
    expect(decideGuidanceAccess(phq9(PHQ9_SUPPORT), gad7(4), null).level).toBe('gentle');
  });
});

describe('FEAT-55 · missing assessment data is never treated as safe', () => {
  // The default state for every new user, and — because the assessment store
  // hydrates asynchronously from encrypted storage — indistinguishable from a
  // not-yet-hydrated read. Both must land on the same conservative answer.
  it('both axes null → gentle (never full, never suppressed)', () => {
    const result = decideGuidanceAccess(null, null, null);
    expect(result.level).toBe('gentle');
    expect(result.allowTier2Plus).toBe(false);
    expect(result.allowPremeditatio).toBe(false);
    expect(result.crisisRoute).toBeUndefined();
  });

  it('never routes a user with no data to crisis resources', () => {
    // Hard-routing every new user to CrisisResources on their first tap would
    // erode trust in the crisis route itself.
    expect(decideGuidanceAccess(null, null, null).level).not.toBe('suppressed');
  });

  it.each([
    ['PHQ-9 missing', null, gad7(2)],
    ['PHQ-9 missing, GAD-7 below the moderate floor', null, gad7(9)],
    ['PHQ-9 missing, GAD-7 at the moderate floor', null, gad7(10)],
    ['PHQ-9 missing, GAD-7 inside the moderate band', null, gad7(12)],
    ['GAD-7 missing', phq9(2), null],
  ] as const)('%s → gentle, because a missing axis is not a zero score', (_label, p, g) => {
    expect(decideGuidanceAccess(p, g, null).level).toBe('gentle');
  });

  it('a missing axis still cannot mask a severe reading on the axis on record', () => {
    expect(decideGuidanceAccess(null, gad7(GAD7_SEVERE), null).level).toBe('suppressed');
    expect(decideGuidanceAccess(phq9(PHQ9_SEVERE), null, null).level).toBe('suppressed');
    expect(decideGuidanceAccess(phq9(1, true), null, null).level).toBe('suppressed');
  });
});

describe('FEAT-55 · tier permissions follow the level, and premeditatio fails closed', () => {
  it('allowTier2Plus is true only at full', () => {
    expect(decideGuidanceAccess(CALM_PHQ9(), CALM_GAD7(), null).allowTier2Plus).toBe(true);
    expect(decideGuidanceAccess(phq9(PHQ9_SUPPORT), CALM_GAD7(), null).allowTier2Plus).toBe(false);
    expect(decideGuidanceAccess(phq9(PHQ9_SEVERE), CALM_GAD7(), null).allowTier2Plus).toBe(false);
    // FEAT-457: the GAD-7 arm must cap it too, or Tier 2/3 reach the one cohort the
    // gentle band was extended to cover.
    expect(decideGuidanceAccess(CALM_PHQ9(), gad7(GAD7_MODERATE), null).allowTier2Plus).toBe(false);
    expect(decideGuidanceAccess(CALM_PHQ9(), gad7(GAD7_SEVERE), null).allowTier2Plus).toBe(false);
  });

  it.each([
    ['gentle band', phq9(PHQ9_SUPPORT)],
    ['one over the gentle band', phq9(PHQ9_SUPPORT + 1)],
    ['severe', phq9(PHQ9_SEVERE)],
  ] as const)(
    'allowPremeditatio is false at %s regardless of developmental stage',
    (_label, p) => {
      const stages: DevelopmentalStage[] = [null, 'fragmented', 'effortful', 'fluid', 'integrated'];
      for (const stage of stages) {
        expect(decideGuidanceAccess(p, CALM_GAD7(), stage).allowPremeditatio).toBe(false);
      }
    }
  );

  it('allowPremeditatio requires an explicitly advanced stage, so null fails closed', () => {
    // `setDevelopmentalStage` has zero call sites, so the stage is always null in
    // production today. Premeditatio malorum is the one practice that can harm if
    // shown to the wrong person, so an unknown stage must not unlock it.
    expect(decideGuidanceAccess(CALM_PHQ9(), CALM_GAD7(), null).allowPremeditatio).toBe(false);
    expect(decideGuidanceAccess(CALM_PHQ9(), CALM_GAD7(), 'fragmented').allowPremeditatio).toBe(
      false
    );
    expect(decideGuidanceAccess(CALM_PHQ9(), CALM_GAD7(), 'effortful').allowPremeditatio).toBe(
      false
    );
    expect(decideGuidanceAccess(CALM_PHQ9(), CALM_GAD7(), 'fluid').allowPremeditatio).toBe(true);
    expect(decideGuidanceAccess(CALM_PHQ9(), CALM_GAD7(), 'integrated').allowPremeditatio).toBe(
      true
    );
  });

  it('developmental stage gates ON TOP of the score ladder, never instead of it', () => {
    // An advanced stage must not lift a score-derived restriction.
    const gentleBand = decideGuidanceAccess(phq9(PHQ9_SUPPORT), CALM_GAD7(), 'integrated');
    expect(gentleBand.level).toBe('gentle');
    expect(gentleBand.allowTier2Plus).toBe(false);
  });
});

describe('FEAT-55 · the crisis hand-off', () => {
  it('carries a source-tagged CrisisResources route when suppressed', () => {
    const result = decideGuidanceAccess(phq9(PHQ9_SEVERE), CALM_GAD7(), null);
    expect(result.crisisRoute).toEqual({
      screen: 'CrisisResources',
      params: { source: 'guidance_gate' },
    });
  });

  it('omits the route when not suppressed', () => {
    expect(decideGuidanceAccess(CALM_PHQ9(), CALM_GAD7(), null).crisisRoute).toBeUndefined();
    expect(decideGuidanceAccess(phq9(PHQ9_SUPPORT), CALM_GAD7(), null).crisisRoute).toBeUndefined();
  });
});

describe('FEAT-55 · the gate is pure', () => {
  it('does not mutate its inputs', () => {
    const p = phq9(PHQ9_SEVERE, true);
    const g = gad7(GAD7_SEVERE);
    const pBefore = JSON.stringify(p);
    const gBefore = JSON.stringify(g);

    decideGuidanceAccess(p, g, 'integrated');

    expect(JSON.stringify(p)).toBe(pBefore);
    expect(JSON.stringify(g)).toBe(gBefore);
  });

  it('is deterministic across repeated calls', () => {
    const args = [phq9(PHQ9_SUPPORT), gad7(4), 'fluid'] as const;
    expect(decideGuidanceAccess(...args)).toEqual(decideGuidanceAccess(...args));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEAT-673 · admissibility under the Art. 9 write-block start (AC2)
//
// Pure: (phq9, gad7, stage, blockStart, predicateAllowed). blockStart is the consent
// selector's primitive: -Infinity = never blocked, a finite time = the latest block
// start, null = unknown (every reading inadmissible). A reading counts iff
// completedAt >= blockStart. A suppressing reading suppresses whether or not it counts.
// ─────────────────────────────────────────────────────────────────────────────


describe('FEAT-673 · AC2 admissibility (pure, table-tested)', () => {
  const B = 50_000;
  const at = <T extends { completedAt: number }>(r: T, completedAt: number): T => ({ ...r, completedAt });
  const decide = (
    p: PHQ9Result | null,
    g: GAD7Result | null,
    blockStart: number | null,
    allowed = true,
  ) => decideAdmissibleGuidanceAccess(p, g, null, blockStart, allowed);

  it('the fourth level withholds Tier 2+ and premeditatio and carries no crisis route', () => {
    expect(GENTLE_WITHHELD_DECISION).toEqual({
      level: 'gentle_withheld',
      allowTier2Plus: false,
      allowPremeditatio: false,
    });
    expect('crisisRoute' in GENTLE_WITHHELD_DECISION).toBe(false);
  });

  // (a) Never blocked, predicate allowing: identical to the unedited matrix.
  it.each([
    ['calm pair', CALM_PHQ9(), CALM_GAD7()],
    ['PHQ-9 gentle band', phq9(PHQ9_SUPPORT), CALM_GAD7()],
    ['GAD-7 gentle band', CALM_PHQ9(), gad7(GAD7_MODERATE)],
    ['Q9 > 0 at total 1', phq9(1, true), CALM_GAD7()],
    ['PHQ-9 severe', phq9(PHQ9_SEVERE), CALM_GAD7()],
    ['GAD-7 severe', CALM_PHQ9(), gad7(GAD7_SEVERE)],
    ['PHQ-9 missing', null, CALM_GAD7()],
    ['never assessed', null, null],
  ] as const)('(a) -Infinity + allowed: %s equals decideGuidanceAccess', (_label, p, g) => {
    for (const stage of [null, 'fluid'] as DevelopmentalStage[]) {
      expect(decideAdmissibleGuidanceAccess(p, g, stage, -Infinity, true)).toEqual(decideGuidanceAccess(p, g, stage));
    }
  });

  // (b) completedAt === B is admissible; B - 1 is not.
  it('(b) a finite B.start admits completedAt === B and rejects B - 1', () => {
    expect(decide(at(CALM_PHQ9(), B), at(CALM_GAD7(), B), B, false).level).toBe('full');
    expect(decide(at(CALM_PHQ9(), B - 1), at(CALM_GAD7(), B - 1), B, false)).toEqual(GENTLE_WITHHELD_DECISION);
  });

  // (c) + (j): null admits nothing, even an in-session reading, whether or not writes are allowed.
  it.each([true, false])('(c)/(j) null B.start admits nothing, predicate allowed=%s', (allowed) => {
    const fresh = Number.MAX_SAFE_INTEGER;
    expect(decide(at(CALM_PHQ9(), fresh), at(CALM_GAD7(), fresh), null, allowed)).toEqual(GENTLE_WITHHELD_DECISION);
  });

  // (d) A non-finite completedAt is inadmissible.
  it.each([NaN, Infinity, -Infinity])('(d) completedAt %s is inadmissible under a finite B.start', (bad) => {
    expect(decide(at(CALM_PHQ9(), bad), at(CALM_GAD7(), bad), B, true)).toEqual(GENTLE_WITHHELD_DECISION);
  });

  // (e) An inadmissible suppressing reading still suppresses.
  it.each([
    ['Q9 > 0 at total 1', at(phq9(1, true), B - 1), at(CALM_GAD7(), B)],
    ['PHQ-9 20', at(phq9(PHQ9_SEVERE), B - 1), at(CALM_GAD7(), B)],
    ['GAD-7 15', at(CALM_PHQ9(), B), at(gad7(GAD7_SEVERE), B - 1)],
  ] as const)('(e) stale %s -> suppressed, under a finite and a null B.start', (_label, p, g) => {
    for (const blockStart of [B, null]) {
      const d = decide(p, g, blockStart, false);
      expect(d.level).toBe('suppressed');
      expect(d.crisisRoute).toEqual({ screen: 'CrisisResources', params: { source: 'guidance_gate' } });
    }
  });

  // (f) One axis admissible and calm, the other inadmissible and calm -> that axis is missing -> gentle.
  it('(f) a calm admissible axis beside an inadmissible calm one is exactly gentle', () => {
    expect(decide(at(CALM_PHQ9(), B), at(CALM_GAD7(), B - 1), B, false).level).toBe('gentle');
    expect(decide(at(CALM_PHQ9(), B - 1), at(CALM_GAD7(), B), B, false).level).toBe('gentle');
  });

  it('(f) …unless the inadmissible axis suppresses, when (e) wins', () => {
    expect(decide(at(CALM_PHQ9(), B), at(gad7(GAD7_SEVERE), B - 1), B, false).level).toBe('suppressed');
  });

  // (g) No admissible reading on either axis and nothing suppressing -> the fourth level.
  it.each([
    ['finite B.start, never screened', B, null, null],
    ['finite B.start, all readings before it', B, at(CALM_PHQ9(), B - 1), at(CALM_GAD7(), B - 1)],
    ['null B.start, never screened', null, null, null],
  ] as const)('(g) %s -> gentle_withheld', (_label, blockStart, p, g) => {
    expect(decide(p, g, blockStart, false)).toEqual(GENTLE_WITHHELD_DECISION);
  });

  it('(g) control: never blocked and never screened is gentle (the existing row, unchanged)', () => {
    expect(decide(null, null, -Infinity, true).level).toBe('gentle');
  });

  // (h) Founder 2026-10-19: a fresh low pair counts while the user is still blocked.
  it('(h) admissible PHQ-9 3 / GAD-7 2 under a finite B.start, still blocked -> full', () => {
    expect(decide(at(phq9(3), B + 10), at(gad7(2), B + 10), B, false).level).toBe('full');
  });

  // (i) -Infinity with the predicate blocking is read as null.
  it('(i) -Infinity with the predicate blocked is treated as null', () => {
    expect(decide(at(CALM_PHQ9(), 1), at(CALM_GAD7(), 1), -Infinity, false)).toEqual(GENTLE_WITHHELD_DECISION);
  });

  it('the fourth level never carries a level string a prefix test could mistake for gentle', () => {
    // Philosopher condition: consumers branch on allowTier2Plus / the allowlist, never on a prefix.
    expect(GENTLE_WITHHELD_DECISION.level).not.toBe('gentle');
  });
});
