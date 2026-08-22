/**
 * stageNotes.ts — FEAT-292 stage-aware normalization for the daily loop.
 *
 * A sparse table of one-line normalizations, keyed by (self-assessed developmental
 * stage × principle), grounded in docs/product/stoic-mindfulness/practice/
 * developmental-stages.md. Read at render time from
 * educationStore.modules[moduleId].developmentalStage via the 1:1 step↔module map.
 *
 * INVARIANTS (philosopher, non-negotiable):
 *  - Stage is ONLY EVER self-asserted. Never computed, inferred, aggregated, or
 *    derived from practice counts, streaks, recency, or assessment scores. A user
 *    with 500 practices and no self-assessment gets SILENCE.
 *  - Stage is read PER PRINCIPLE (step↔module 1:1). There is no "loop stage." Any
 *    aggregate — modal, lowest, latest — manufactures an assertion the user never
 *    made and is forbidden. Source: developmental-stages.md:16, "you may advance in
 *    one domain while working with basics in another."
 *  - Stage modulates TONE ONLY. It never gates depth, features, prompt availability,
 *    or content, and is NEVER rendered as a label, status, badge, or progress marker
 *    — not in visible text, not in accessibilityLabel/Hint.
 *  - The table is SPARSE BY DESIGN. A cell exists only where developmental-stages.md
 *    NAMES a challenge for that stage AND that challenge lands on that principle.
 *    Filling the empty cells to make the matrix complete is a REGRESSION: a note on
 *    every beat every session is wallpaper and stops being felt. The 10-entry
 *    assertion in stageNotes.test.ts is the guard — do not update it to accommodate
 *    new cells without a philosopher pass.
 *  - Voice: normalize a predictable difficulty. Never praise, rank, congratulate, or
 *    gamify. Never use comparative framing ("beginners often", "at your level") —
 *    comparison installs the ladder the FEAT-292 re-scope rejects. Never promise
 *    improvement over time — that is the striving dynamic.
 *  - Mode-agnostic: ONE string per cell. These normalize the difficulty of the
 *    practice, not the tense of the day. getStageNote takes NO DailyLoopMode.
 *  - AT MOST ONE note per session (selectStageNoteStep). Equal count across quick and
 *    deep — an asymmetry would re-code deep as the richer practice and reinstall
 *    depth-as-progression.
 *  - CRISIS: the note is never interactive, never underlined, never adjacent to
 *    SUPPORT_LINE (it renders directly under the subtitle; the support line stays at
 *    the foot of the beat), and is excluded from the support-line-carrying step
 *    whenever any other eligible step exists. It must never outrank or visually
 *    mimic the crisis affordance.
 *  - stage === null, or a stage with no cell for this step, renders NOTHING —
 *    no placeholder, no spacing, and NO prompt to self-assess. The loop is never the
 *    site of self-assessment and never advertises it.
 */
import type { DailyLoopMode, DailyLoopDepth } from '@/features/practices/types/flows';
import type { DevelopmentalStage, ModuleId } from '@/features/learn/types/education';
import {
  DAILY_LOOP_STEP_KEYS,
  getStepKeysForDepth,
  showsSupportLine,
  type DailyLoopStepKey,
} from './tenseMode';

/** A stage the user has actually asserted (excludes the null "unassessed" state). */
export type AssertedStage = Exclude<DevelopmentalStage, null>;

/** The four canonical stages, in the doc's order. Ordering carries NO ranking weight. */
export const DEVELOPMENTAL_STAGE_KEYS = [
  'fragmented',
  'effortful',
  'fluid',
  'integrated',
] as const satisfies readonly AssertedStage[];

/**
 * The 1:1 step↔module correspondence that makes per-principle reading possible: each
 * loop beat runs the same principle as exactly one Learn module, so a beat can read
 * the stage the user self-assessed FOR THAT PRINCIPLE. This is what removes any need
 * to aggregate — and with it, any computed stage.
 */
export const MODULE_FOR_STEP: Record<DailyLoopStepKey, ModuleId> = {
  AwarePresence: 'aware-presence',
  RadicalAcceptance: 'radical-acceptance',
  SphereSovereignty: 'sphere-sovereignty',
  VirtuousResponse: 'virtuous-response',
  InterconnectedLiving: 'interconnected-living',
};

/**
 * The sparse normalization table — 10 of 20 cells.
 *
 * A cell earns a note only where developmental-stages.md NAMES a challenge and that
 * challenge lands on that specific principle. Where the doc describes a stage's
 * capacity but names no failure mode (fluid/AwarePresence, integrated/SphereSovereignty),
 * the honest copy is nothing — inventing a difficulty to have something to say is
 * generic by construction. Absent keys are absent DELIBERATELY; see the anti-backfill
 * invariant above.
 */
export const STAGE_NOTES: Partial<
  Record<AssertedStage, Partial<Record<DailyLoopStepKey, string>>>
> = {
  // Doc §Stage One. Named: building consistency; retrospective application;
  // secondary self-criticism ("I'm terrible at this").
  fragmented: {
    // Doc lines 27-31: mind wanders for minutes; the return IS the rep.
    AwarePresence:
      'Minds wander — often for a while before you notice. The noticing is the practice, not an interruption of it.',
    // Doc line 34 names this challenge ON sphere sovereignty by name: understanding
    // that does not spontaneously arise in traffic or under criticism. Line 36: the
    // retrospective application "feels like failure" but is the learning.
    SphereSovereignty:
      'Seeing this clearly here and missing it in the moment are two different skills. Naming it afterward is still the work.',
  },

  // Doc §Stage Two. Named: effortfulness; reversion under stress; "Am I getting worse?"
  effortful: {
    // Doc lines 68-70, 75: the gap is real but costly to hold; high stress overwhelms it.
    SphereSovereignty:
      "This still takes deliberate effort, and pressure can take the space away. That's the shape of the work here, not a lapse.",
    // Doc line 83, near-verbatim: increased noticing of value violations is sensitivity,
    // not regression. Placed here because this beat asks about falling short.
    VirtuousResponse:
      "Sharper awareness turns up more to notice. That's not more failing — it's more visibility.",
  },

  // Doc §Stage Three. Named: subtle spiritual pride; practice as avoidance;
  // equanimity mistaken for indifference.
  fluid: {
    // Doc lines 104, 118. Acceptance is "not suppression or pretended indifference."
    RadicalAcceptance:
      'Acceptance gone quiet can pass for indifference. Worth checking which this is — steadiness and distance look alike from the inside.',
    // Doc line 117: retreating to practice rather than engaging what requires action.
    VirtuousResponse:
      "Reflection can stand in for the harder thing. If this situation is asking for action, here's where it gets named.",
    // Doc line 116 (spiritual pride) landed on the relational beat, and answered with
    // justice / suum cuique rather than with a counter-comparison. Classical ground:
    // Epictetus, Enchiridion 46 (sheep don't bring grass to the shepherd to show how
    // much they ate); Marcus, Meditations 12.27. Deliberately uncited on screen.
    InterconnectedLiving:
      'Skill at practice can become its own kind of vanity. The question here is only what these people are owed.',
  },

  // Doc §Stage Four. Named: complacency; isolation; the reality check that pain remains.
  integrated: {
    // Doc line 165 — the ONE cell where an explicit classical grounding earns its
    // place on screen, because the exemplar IS the argument against coasting.
    AwarePresence:
      'Familiar ground is easy to walk past. Marcus Aurelius was still writing the basics down to himself after decades.',
    // Doc lines 147-150: this stage does not transcend grief, loss, or pain; what
    // changes is the relationship to them. The most safety-load-bearing line in the
    // table — it disarms "I shouldn't still be feeling this," the harsh-stoicism
    // failure mode. Grounded in Seneca, Letters 63 and Marcus 8.47; NO citation
    // rendered — a footnote next to someone sitting with loss is heavy-handed.
    RadicalAcceptance:
      "None of this makes loss stop hurting. Steadiness isn't the absence of pain, only the refusal to add to it.",
    // Doc line 160: isolation — moving past earlier communities without finding peers.
    // Answered with cosmopolitanism (Marcus 6.44), uncited.
    InterconnectedLiving:
      'Practice can get lonely when no one near you is in it. Belonging was never limited to those who practice the same way.',
  },
};

/**
 * Resolve the normalization note for a (stage, step) pair.
 *
 * Returns `undefined` for the unassessed state, for a cell with no authored note, and
 * for any unrecognized key — the three are DELIBERATELY indistinguishable to the
 * caller, so the loop cannot leak stage state through the shape of its silence.
 *
 * Takes no `DailyLoopMode`: these normalize the difficulty of the practice, not the
 * tense of the day (philosopher ruling — a mode axis would triple the table into
 * wallpaper).
 *
 * Tolerates unrecognized stage keys without throwing: `educationStore` performs no
 * validation on write, and a non-union value is already present in the codebase's
 * persisted-state tests.
 */
export function getStageNote(
  stage: DevelopmentalStage,
  step: DailyLoopStepKey,
): string | undefined {
  if (!stage) return undefined;
  return STAGE_NOTES[stage]?.[step];
}

/** Per-principle self-assessments, as read from educationStore via MODULE_FOR_STEP. */
export type StagesByStep = Partial<Record<DailyLoopStepKey, DevelopmentalStage>>;

/**
 * Day-of-year, used to rotate WHICH eligible beat carries the session's single note.
 * Injectable so tests never depend on the wall clock.
 */
export function dayIndexFor(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / 86_400_000);
}

/**
 * Pick the ONE step that carries a normalization note this session, or null.
 *
 * Two problems close with this single rule:
 *  1. Wallpaper — a note on every eligible beat stops being felt by the third session.
 *  2. Depth asymmetry — deep could carry up to three notes to quick's one, which
 *     quietly re-codes deep as the richer practice and reinstalls depth-as-progression
 *     (the exact thing the 2026-07-19 re-scope rejected). Capping at one equalizes them.
 *
 * The support-line-carrying beat is excluded whenever any other eligible beat exists —
 * a second layer of crisis protection on top of the placement separation, so the note
 * and the crisis affordance are usually not even on the same screen. The fallback keeps
 * a sole-eligible cell reachable rather than silently dropping it.
 *
 * Deterministic and stateless: same inputs → same output, no persisted selection.
 */
export function selectStageNoteStep(
  stagesByStep: StagesByStep,
  depth: DailyLoopDepth,
  mode: DailyLoopMode,
  dayIndex: number,
): DailyLoopStepKey | null {
  const eligible = getStepKeysForDepth(depth).filter((step) =>
    getStageNote(stagesByStep[step] ?? null, step),
  );
  if (eligible.length === 0) return null;

  const offSupportLine = eligible.filter((step) => !showsSupportLine(depth, mode, step));
  const pool = offSupportLine.length > 0 ? offSupportLine : eligible;

  // Non-negative modulo — a caller passing a negative index must not index out of pool.
  const idx = ((dayIndex % pool.length) + pool.length) % pool.length;
  return pool[idx] ?? null;
}

/** Every canonical step, for callers building a StagesByStep map. */
export const STAGE_NOTE_STEPS = DAILY_LOOP_STEP_KEYS;
