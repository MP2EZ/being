/**
 * The "crisis supersedes philosophy" gate (FEAT-55, slice 1).
 *
 * Someone reaching for situational Stoic guidance may be in more distress than
 * the guidance is appropriate for. This decides which of three things they get:
 * the full four-tier ladder, the gentlest layer only, or no domain content at
 * all because crisis resources are the right answer instead.
 *
 * PURE BY CONSTRUCTION. No React, no store access, no I/O, no clock. Callers read
 * fresh assessment state and hand it in; this function only decides. That is what
 * makes every threshold boundary table-testable, which is the whole point —
 * `__tests__/clinical/guidanceGate.clinical.test.ts` covers each edge because
 * "zero false negatives" is not a property you can spot-check.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ THRESHOLD IMPORTS — READ BEFORE EDITING
 *
 * Two modules export a field literally named `PHQ9_CRISIS_SCORE`:
 *
 *   CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE = 20   (active-intervention floor)
 *   CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE        = 15   (support floor)
 *
 * The divergence is deliberate, documented at both sites, and pinned by
 * `crisis-thresholds.test.ts`. Both are `number`, so importing the wrong one
 * TYPE-CHECKS SILENTLY and would raise this gate's gentle-layer floor from 15 to
 * 20 — handing the full ladder to readers scoring 15-19, who are exactly the
 * cohort the gentle layer exists for.
 *
 * The imports below are therefore named and non-destructured, and each threshold
 * read names its module at the point of use. Do not "simplify" them into a shared
 * local, and never inline a literal 15 or 20.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { CRISIS_SAFETY_THRESHOLDS } from '@/features/crisis/types/safety';
import { CRISIS_THRESHOLDS, type PHQ9Result, type GAD7Result } from '@/features/assessment/types';
import type { DevelopmentalStage } from '@/features/learn/types/education';
import type { GuidanceAccessDecision, GuidanceCrisisRoute } from '../types/guidance';

/**
 * Stages at which premeditatio malorum may be offered.
 *
 * `null` (unknown) is deliberately absent. `setDevelopmentalStage` currently has
 * zero call sites, so the stage is null for every user in production today —
 * which means this list makes premeditatio unreachable right now. That is the
 * intended posture: it is the one practice that can harm if shown to the wrong
 * reader, it has no authored content in P0, and an unknown stage is not evidence
 * of readiness any more than a missing assessment is evidence of safety.
 */
const PREMEDITATIO_STAGES: readonly DevelopmentalStage[] = ['fluid', 'integrated'];

const CRISIS_ROUTE: GuidanceCrisisRoute = {
  screen: 'CrisisResources',
  params: { source: 'guidance_gate' },
};

/**
 * Does this reading, on its own, mean crisis resources rather than philosophy?
 *
 * Evaluated per axis so a missing axis simply contributes nothing, rather than
 * contributing a zero. A `null` result means "never assessed" (or "not yet
 * hydrated"), which is not the same as "scored 0" and must never be flattened
 * into one.
 */
function suppressesOnPhq9(phq9: PHQ9Result | null): boolean {
  if (!phq9) return false;
  // Q9 > 0 is immediate intervention REGARDLESS of total (CLAUDE.md, Safety
  // Facts). This is an OR, never an AND with the score floor — a reader scoring 1
  // overall who answers Q9 affirmatively is suppressed.
  if (phq9.suicidalIdeation) return true;
  return phq9.totalScore >= CRISIS_SAFETY_THRESHOLDS.PHQ9_SEVERE_THRESHOLD;
}

function suppressesOnGad7(gad7: GAD7Result | null): boolean {
  if (!gad7) return false;
  return gad7.totalScore >= CRISIS_SAFETY_THRESHOLDS.GAD7_SEVERE_THRESHOLD;
}

/**
 * At or above this axis's gentle floor — gentlest layer only, not suppression.
 *
 * ONE RULE, APPLIED PER AXIS (FEAT-457): the gentle floor is the floor of the
 * standard severity band IMMEDIATELY BELOW that axis's suppression floor.
 *
 *   PHQ-9  suppresses at 20 (`severe`)  → gentle at 15 (`moderately_severe` floor)
 *   GAD-7  suppresses at 15 (`severe`)  → gentle at 10 (`moderate` floor)
 *
 * That the two land on differently-named bands is a property of the instruments —
 * PHQ-9 has five, GAD-7 has four — not a drift between the axes. Do NOT "align"
 * them by lowering the PHQ-9 floor to 10: that would be a new clinical decision
 * over a large shipped cohort with no derivation warrant.
 *
 * Kept as two sibling predicates rather than one `(score, floor)` helper on
 * purpose. The whole reason this file survives review is that every threshold read
 * NAMES ITS MODULE at the point of use — a shared helper takes the floor as a
 * parameter, which is exactly how the wrong constant gets passed in silently.
 */
function isGentleBandPhq9(phq9: PHQ9Result | null): boolean {
  if (!phq9) return false;
  return phq9.totalScore >= CRISIS_THRESHOLDS.PHQ9_CRISIS_SCORE;
}

function isGentleBandGad7(gad7: GAD7Result | null): boolean {
  if (!gad7) return false;
  return gad7.totalScore >= CRISIS_THRESHOLDS.GAD7_MODERATE_THRESHOLD;
}

/**
 * Decide how much of the guidance ladder this reader may see.
 *
 * @param phq9      Most recent PHQ-9 result, or null if never assessed.
 * @param gad7      Most recent GAD-7 result, or null if never assessed.
 * @param userStage Self-assessed developmental stage; null when unknown.
 *
 * Precedence, most protective first:
 *
 *   1. SUPPRESSED — Q9 > 0, or PHQ-9 ≥ 20, or GAD-7 ≥ 15, on whichever axis is
 *      on record. Renders no domain content and routes to crisis resources.
 *   2. GENTLE     — PHQ-9 ≥ 15, OR GAD-7 ≥ 10, OR either axis is missing. Tier 0
 *      and Tier 1 only.
 *   3. FULL       — both axes on record and below every floor.
 *
 * On "most recent": there is deliberately no staleness window here. Inventing one
 * would fork a second, ungoverned notion of assessment freshness alongside the
 * existing cadence design. A stale crisis-level reading continuing to protect is
 * the safe direction; whether to prompt re-assessment above some age is a product
 * decision, not a gate mechanic.
 *
 * On missing data: absence is never evidence of safety, so it cannot yield
 * `full`. It is equally never evidence of crisis, so it must not yield
 * `suppressed` either — hard-routing every new user to crisis resources on their
 * first tap would erode trust in the crisis route itself. `gentle` is the only
 * defensible answer, and it doubles as the safe landing for a not-yet-hydrated
 * store read, which is indistinguishable from "never assessed" at this boundary.
 */
export function decideGuidanceAccess(
  phq9: PHQ9Result | null,
  gad7: GAD7Result | null,
  userStage: DevelopmentalStage
): GuidanceAccessDecision {
  if (suppressesOnPhq9(phq9) || suppressesOnGad7(gad7)) {
    return {
      level: 'suppressed',
      crisisRoute: CRISIS_ROUTE,
      allowTier2Plus: false,
      allowPremeditatio: false,
    };
  }

  // `full` requires complete data. A missing axis cannot be read as a zero, so it
  // caps the ladder here rather than passing through.
  const hasBothAxes = phq9 !== null && gad7 !== null;
  // Per axis, ORed — the more protective reading wins and two gentle readings are
  // still gentle, never suppression. Until FEAT-457 the GAD-7 arm was absent here,
  // so GAD-7 10-14 fell through to `full`: inert while `full` and `gentle` rendered
  // the same two tiers, and a live divergence the moment Tier 2/3 landed.
  if (!hasBothAxes || isGentleBandPhq9(phq9) || isGentleBandGad7(gad7)) {
    return {
      level: 'gentle',
      allowTier2Plus: false,
      allowPremeditatio: false,
    };
  }

  // Developmental stage gates ON TOP of the score ladder, never instead of it —
  // it is only ever reached once the scores have already allowed `full`, and it
  // can only narrow what is offered from here.
  return {
    level: 'full',
    allowTier2Plus: true,
    allowPremeditatio: PREMEDITATIO_STAGES.includes(userStage),
  };
}
