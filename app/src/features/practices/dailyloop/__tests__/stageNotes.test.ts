/**
 * stageNotes fidelity guard — FEAT-292 (loop stage-aware normalization, self-assessed).
 *
 * Pins the work item's GUARDRAIL acceptance criteria as executable invariants. Those
 * ACs are stated almost entirely as PROHIBITIONS ("never displayed as a label", "never
 * gates", "never computed"), so they are pinned here at the DATA layer — the
 * FEAT-291/301 precedent (tenseMode.test.ts) — rather than through render assertions,
 * which could only ever sample one (stage, step) pair at a time.
 *
 * Prohibitions are the easy thing to regress with a well-meaning copy edit: warming a
 * note to "you're making real progress" would satisfy every positive test while
 * breaking the central product-philosophy ruling. Testing the negative space is what
 * makes the philosopher sign-off durable instead of point-in-time.
 */
import {
  MODULE_FOR_STEP,
  STAGE_NOTES,
  DEVELOPMENTAL_STAGE_KEYS,
  getStageNote,
  selectStageNoteStep,
  dayIndexFor,
  type AssertedStage,
  type StagesByStep,
} from '../config/stageNotes';
import {
  DAILY_LOOP_STEP_KEYS,
  SUPPORT_LINE,
  getStepKeysForDepth,
  showsSupportLine,
  type DailyLoopStepKey,
} from '../config/tenseMode';
import type { DailyLoopMode, DailyLoopDepth } from '@/features/practices/types/flows';
import type { DevelopmentalStage } from '@/features/learn/types/education';

const STAGES = DEVELOPMENTAL_STAGE_KEYS;
const MODES: DailyLoopMode[] = ['flat', 'morning', 'evening'];
const DEPTHS: DailyLoopDepth[] = ['quick', 'deep'];

/** Every authored string in the table. */
const allNotes = (): string[] =>
  Object.values(STAGE_NOTES).flatMap((byStep) => Object.values(byStep ?? {}));

/** The authored (stage, step) pairs, sorted for stable comparison. */
const authoredPairs = (): string[] =>
  STAGES.flatMap((stage) =>
    DAILY_LOOP_STEP_KEYS.filter((step) => getStageNote(stage, step)).map(
      (step) => `${stage}/${step}`,
    ),
  ).sort();

/** A user who self-assessed the SAME stage on all five principles. */
const uniformStages = (stage: DevelopmentalStage): StagesByStep =>
  Object.fromEntries(DAILY_LOOP_STEP_KEYS.map((s) => [s, stage])) as StagesByStep;

describe('per-step module mapping (no aggregation)', () => {
  it('is a bijection — five steps onto five distinct modules', () => {
    const modules = DAILY_LOOP_STEP_KEYS.map((s) => MODULE_FOR_STEP[s]);
    expect(new Set(modules).size).toBe(DAILY_LOOP_STEP_KEYS.length);
  });

  it('pairs each step with its OWN principle, in canonical order', () => {
    // The 1:1 correspondence is the entire basis for reading stage per step rather
    // than synthesizing a loop-wide stage. If this drifts, a beat would start
    // speaking one principle's self-assessment over another principle's prompt.
    expect(DAILY_LOOP_STEP_KEYS.map((s) => MODULE_FOR_STEP[s])).toEqual([
      'aware-presence',
      'radical-acceptance',
      'sphere-sovereignty',
      'virtuous-response',
      'interconnected-living',
    ]);
  });
});

describe('graceful default — no self-assessment means silence', () => {
  it.each(DAILY_LOOP_STEP_KEYS)('step %s yields nothing for an unassessed stage', (step) => {
    expect(getStageNote(null, step)).toBeUndefined();
  });

  it('cannot leak stage state through the SHAPE of its silence', () => {
    // "You haven't assessed" and "assessed, but nothing needed saying here" must be
    // indistinguishable to the caller — otherwise the loop reveals stage state by
    // rendering a different kind of nothing.
    expect(getStageNote(null, 'AwarePresence')).toBe(getStageNote('fluid', 'AwarePresence'));
  });

  it('tolerates a stage key outside the union without throwing', () => {
    // Not hypothetical: educationStore performs no validation on write.
    expect(() => getStageNote('integrating' as DevelopmentalStage, 'AwarePresence')).not.toThrow();
    expect(getStageNote('integrating' as DevelopmentalStage, 'AwarePresence')).toBeUndefined();
  });

  it('returns nothing for a step outside the canonical five', () => {
    expect(getStageNote('effortful', 'NotAPrinciple' as DailyLoopStepKey)).toBeUndefined();
  });

  it('never infers a stage from engagement — 500 practices with no self-assessment is silent', () => {
    // The "never computed" AC, made mechanical. If anyone ever derives a stage from
    // practice counts, streaks, recency, or assessment scores, this fails.
    const heavilyEngagedButUnassessed = uniformStages(null);
    for (const depth of DEPTHS) {
      for (const mode of MODES) {
        expect(selectStageNoteStep(heavilyEngagedButUnassessed, depth, mode, 42)).toBeNull();
      }
    }
  });
});

describe('stage is never surfaced as a label, a rank, or a promise', () => {
  const FORBIDDEN: Array<[string, RegExp]> = [
    // Stage-as-label (AC: never displayed as a status/label).
    ['stage key', /\b(fragmented|effortful|fluid|integrated)\b/i],
    ['stage noun', /\b(stage|level|phase)\b/i],
    // Comparative / cohort framing installs the ladder even without the key.
    ['cohort framing', /\b(beginner|novice|advanced|experienced|practitioners?)\b/i],
    ['comparison', /\b(most people|others often|at your|for someone|by now|still new)\b/i],
    ['ranking', /\b(ahead of|better than)\b/i],
    // Praise / gamification (FEAT-28 Insights non-negotiable).
    ['praise', /\b(great|well done|good job|nice work|congrat|proud of you)\b/i],
    ['encouragement', /(you're doing|you are doing|keep it up)/i],
    ['game mechanics', /\b(streak|milestone|achievement|badge|unlock|points|score)\b/i],
    // Promised improvement is the striving dynamic the re-scope rejects.
    ['promised ease', /(gets easier|will get easier)/i],
    ['temporal promise', /\b(over time|eventually|soon|one day|in time)\b/i],
    ['improvement', /\b(progress|improve|better at|grow into|advance|mastery)\b/i],
    // Must not shadow or mimic the crisis affordance.
    ['crisis vocabulary', /\b(crisis|emergency|988|support|help is|reach out)\b/i],
    // Reflect-first: the loop never issues gating imperatives.
    ['imperative', /(you must|you should|you need to|you have to)/i],
  ];

  it.each(FORBIDDEN)('no note contains %s', (_label, pattern) => {
    for (const note of allNotes()) {
      expect(note).not.toMatch(pattern);
    }
  });

  it('never mimics the crisis support line', () => {
    // A 12-char shared window would read as the same affordance at a glance.
    for (let i = 0; i + 12 <= SUPPORT_LINE.length; i += 1) {
      const window = SUPPORT_LINE.slice(i, i + 12);
      for (const note of allNotes()) {
        expect(note).not.toContain(window);
      }
    }
  });

  it('stays a quiet aside, not a lesson', () => {
    for (const note of allNotes()) {
      expect(note.length).toBeLessThanOrEqual(140);
    }
  });

  it('never exclaims or interrogates', () => {
    // An exclamation is praise by punctuation; a question turns a normalization into
    // a prompt the user now owes an answer to.
    for (const note of allNotes()) {
      expect(note).not.toContain('!');
      expect(note).not.toContain('?');
    }
  });

  it('uses only plain prose characters (no emoji, arrows, or decoration)', () => {
    for (const note of allNotes()) {
      expect(note).toMatch(/^[A-Za-z0-9 ,.'’—:;()-]+$/);
    }
  });
});

describe('the table is sparse by design', () => {
  it('exposes exactly the four canonical stage keys', () => {
    expect(DEVELOPMENTAL_STAGE_KEYS).toEqual(['fragmented', 'effortful', 'fluid', 'integrated']);
  });

  it('authors exactly the 10 philosopher-selected cells', () => {
    // ANTI-BACKFILL GUARD. A cell exists only where developmental-stages.md NAMES a
    // challenge for that stage AND it lands on that principle. Completing the matrix
    // is a REGRESSION — a note on every beat every session is wallpaper. Do not
    // update this list to accommodate new cells without a philosopher pass.
    expect(authoredPairs()).toEqual(
      [
        'fragmented/AwarePresence',
        'fragmented/SphereSovereignty',
        'effortful/SphereSovereignty',
        'effortful/VirtuousResponse',
        'fluid/RadicalAcceptance',
        'fluid/VirtuousResponse',
        'fluid/InterconnectedLiving',
        'integrated/AwarePresence',
        'integrated/RadicalAcceptance',
        'integrated/InterconnectedLiving',
      ].sort(),
    );
  });

  it('leaves half the matrix deliberately empty', () => {
    expect(allNotes().length).toBeLessThan(STAGES.length * DAILY_LOOP_STEP_KEYS.length);
  });

  it('authors normalization for every one of the four stages', () => {
    // A stage with zero cells would mean self-assessing it silently buys nothing.
    for (const stage of STAGES) {
      expect(DAILY_LOOP_STEP_KEYS.some((step) => getStageNote(stage, step))).toBe(true);
    }
  });

  it('has no duplicated copy (catches generic copy-paste fill)', () => {
    const notes = allNotes();
    expect(new Set(notes).size).toBe(notes.length);
  });

  it('declares no key outside the canonical stages and steps', () => {
    for (const stage of Object.keys(STAGE_NOTES)) {
      expect(STAGES).toContain(stage as AssertedStage);
      for (const step of Object.keys(STAGE_NOTES[stage as AssertedStage] ?? {})) {
        expect(DAILY_LOOP_STEP_KEYS).toContain(step as DailyLoopStepKey);
      }
    }
  });
});

describe('tone only — stage is not an axis of structure', () => {
  it('takes no mode parameter (notes normalize the practice, not the day)', () => {
    // A mode axis would triple the table into wallpaper. Arity is the mechanical guard.
    expect(getStageNote).toHaveLength(2);
  });

  it('is a pure lookup — same inputs, same output', () => {
    // Guards against anyone reintroducing a computed/adaptive stage behind this API.
    for (const stage of STAGES) {
      for (const step of DAILY_LOOP_STEP_KEYS) {
        expect(getStageNote(stage, step)).toBe(getStageNote(stage, step));
      }
    }
  });

  it('never changes which steps run', () => {
    // Stage must not gate depth or content: the step set is depth-derived only.
    for (const depth of DEPTHS) {
      const baseline = getStepKeysForDepth(depth);
      for (const stage of [...STAGES, null]) {
        selectStageNoteStep(uniformStages(stage), depth, 'flat', 7);
        expect(getStepKeysForDepth(depth)).toEqual(baseline);
      }
    }
  });
});

describe('one note per session (wallpaper + depth-parity cap)', () => {
  it('surfaces at most one note per session, for every stage and depth', () => {
    for (const stage of STAGES) {
      for (const depth of DEPTHS) {
        for (const mode of MODES) {
          const step = selectStageNoteStep(uniformStages(stage), depth, mode, 3);
          expect(step === null || getStageNote(stage, step)).toBeTruthy();
        }
      }
    }
  });

  it('gives quick and deep the SAME note count — deep is never the richer practice', () => {
    // An asymmetry (deep carrying 3 notes to quick's 1) would re-code deep as the
    // fuller practice and reinstall depth-as-progression, which the 2026-07-19
    // re-scope rejected.
    for (const stage of STAGES) {
      const counts = DEPTHS.map((depth) =>
        selectStageNoteStep(uniformStages(stage), depth, 'flat', 3) ? 1 : 0,
      );
      expect(new Set(counts).size).toBe(1);
    }
  });

  it('keeps the note off the crisis-support beat whenever another beat is eligible', () => {
    for (const stage of STAGES) {
      for (const depth of DEPTHS) {
        for (const mode of MODES) {
          const eligible = getStepKeysForDepth(depth).filter((s) => getStageNote(stage, s));
          const alternatives = eligible.filter((s) => !showsSupportLine(depth, mode, s));
          if (alternatives.length === 0) continue;
          for (let day = 0; day < 14; day += 1) {
            const chosen = selectStageNoteStep(uniformStages(stage), depth, mode, day);
            expect(chosen && showsSupportLine(depth, mode, chosen)).toBeFalsy();
          }
        }
      }
    }
  });

  it('still reaches a note whose ONLY eligible beat carries the support line', () => {
    // fluid/RadicalAcceptance is deep's support-line beat. A user who self-assessed
    // fluid on that principle alone must not be silently dropped.
    const onlyRadicalAcceptance: StagesByStep = { RadicalAcceptance: 'fluid' };
    expect(selectStageNoteStep(onlyRadicalAcceptance, 'deep', 'flat', 0)).toBe('RadicalAcceptance');
  });

  it('is deterministic for a given day', () => {
    for (const depth of DEPTHS) {
      const a = selectStageNoteStep(uniformStages('fluid'), depth, 'flat', 11);
      const b = selectStageNoteStep(uniformStages('fluid'), depth, 'flat', 11);
      expect(a).toBe(b);
    }
  });

  it('rotates across eligible beats rather than pinning one forever', () => {
    // fragmented/deep has two eligible beats, neither on the support line.
    const seen = new Set(
      Array.from({ length: 10 }, (_, day) =>
        selectStageNoteStep(uniformStages('fragmented'), 'deep', 'flat', day),
      ),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it('never indexes out of range on a negative day index', () => {
    expect(() => selectStageNoteStep(uniformStages('fluid'), 'deep', 'flat', -1)).not.toThrow();
    expect(selectStageNoteStep(uniformStages('fluid'), 'deep', 'flat', -1)).toBeTruthy();
  });

  it('reads each beat from its OWN principle, never a neighbour', () => {
    // Only Aware Presence is self-assessed. Fragmented authors a note for it, so a
    // per-principle reader surfaces exactly that beat — an aggregate would instead
    // propagate 'fragmented' onto four principles the user never asserted.
    const onlyAwarePresence: StagesByStep = { AwarePresence: 'fragmented' };
    expect(selectStageNoteStep(onlyAwarePresence, 'deep', 'flat', 0)).toBe('AwarePresence');

    // Sphere Sovereignty assessed alone at a stage with no cell there → silence,
    // never a fallback to some other beat's copy.
    const onlySphereFluid: StagesByStep = { SphereSovereignty: 'fluid' };
    expect(selectStageNoteStep(onlySphereFluid, 'deep', 'flat', 0)).toBeNull();
  });
});

describe('dayIndexFor', () => {
  it('is stable within a day and differs across days', () => {
    expect(dayIndexFor(new Date(2026, 6, 25))).toBe(dayIndexFor(new Date(2026, 6, 25)));
    expect(dayIndexFor(new Date(2026, 6, 25))).not.toBe(dayIndexFor(new Date(2026, 6, 26)));
  });

  it('is timezone-stable for a local calendar date', () => {
    expect(dayIndexFor(new Date(2026, 0, 1))).toBe(1);
  });
});
