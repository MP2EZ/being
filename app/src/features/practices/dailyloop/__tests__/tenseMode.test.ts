/**
 * tenseMode fidelity guard — FEAT-291 (revised shape).
 *
 * Pins the philosopher + crisis non-negotiables for the daily loop so they can't
 * silently regress: canonical names + order, all three modes authored, the two-sided
 * dichotomy in step 3, the four cardinal virtues + multi-select in step 4, step-5
 * belonging framing free of the forbidden shorthand, the step-1 grounding, the
 * step-2 static support line, the morning-only premeditatio guardrails, and the
 * closing coda.
 */
import {
  DAILY_LOOP_STEP_KEYS,
  STEP_TITLES,
  VIRTUE_REFERENCE,
  PREMEDITATIO,
  SUPPORT_LINE,
  CLOSING,
  getStepConfig,
  QUICK_STEP_KEYS,
  QUICK_SUPPORT_STEP,
  getStepKeysForDepth,
  showsSupportLine,
  getCompleteTitle,
  DEPTH_LABELS,
  DEPTH_PICKER_COPY,
} from '../config/tenseMode';
import type { DailyLoopMode, DailyLoopDepth } from '@/features/practices/types/flows';

const MODES: DailyLoopMode[] = ['flat', 'morning', 'evening'];
const DEPTHS: DailyLoopDepth[] = ['quick', 'deep'];

describe('canonical names + order (invariant)', () => {
  it('is the Five Principles in canonical order', () => {
    expect(DAILY_LOOP_STEP_KEYS).toEqual([
      'AwarePresence',
      'RadicalAcceptance',
      'SphereSovereignty',
      'VirtuousResponse',
      'InterconnectedLiving',
    ]);
  });

  it('renders the canonical principle names as step titles', () => {
    expect(STEP_TITLES).toEqual({
      AwarePresence: 'Aware Presence',
      RadicalAcceptance: 'Radical Acceptance',
      SphereSovereignty: 'Sphere Sovereignty',
      VirtuousResponse: 'Virtuous Response',
      InterconnectedLiving: 'Interconnected Living',
    });
  });

  it('never uses the removed "Reality Check" label for Sphere Sovereignty', () => {
    expect(STEP_TITLES.SphereSovereignty).not.toMatch(/reality check/i);
  });
});

describe('all three modes authored to equal fidelity (no stubs)', () => {
  it.each(MODES)('mode %s: every step has a subtitle and well-formed fields', (mode) => {
    for (const step of DAILY_LOOP_STEP_KEYS) {
      const cfg = getStepConfig(mode, step);
      expect(cfg.subtitle.trim().length).toBeGreaterThan(0);
      for (const f of cfg.fields) {
        expect(f.label.trim().length).toBeGreaterThan(0);
        expect(f.placeholder.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("the primary field's prompt differs across modes (voice actually changes)", () => {
    for (const step of DAILY_LOOP_STEP_KEYS) {
      const labels = MODES.map((m) => getStepConfig(m, step).fields[0]?.label);
      expect(new Set(labels).size).toBe(3);
    }
  });
});

describe('step 1 — Aware Presence grounding (body + environment)', () => {
  it.each(MODES)('mode %s surfaces multi-anchor grounding with the breath', (mode) => {
    const cfg = getStepConfig(mode, 'AwarePresence');
    expect(cfg.grounding && cfg.grounding.length).toBeGreaterThanOrEqual(3);
    const blob = (cfg.grounding ?? []).join(' ').toLowerCase();
    expect(blob).toMatch(/body|sensation|feet|skin/); // embodiment pillar
    expect(blob).toMatch(/space|around|where you are/); // environment
  });

  it('the primary capture is optional (reflect-first)', () => {
    const cfg = getStepConfig('flat', 'AwarePresence');
    expect(cfg.fields[0]?.label).toMatch(/optional/i);
  });
});

describe('step 3 — Sphere Sovereignty is the FULL two-sided dichotomy', () => {
  it.each(MODES)('mode %s has both a not-yours field and a yours field', (mode) => {
    const cfg = getStepConfig(mode, 'SphereSovereignty');
    const keys = cfg.fields.map((f) => f.key).sort();
    expect(keys).toEqual(['mine', 'notMine']);
  });

  it('frames "let go" as loosening/disowning (not suppression)', () => {
    const notMine = getStepConfig('flat', 'SphereSovereignty').fields.find((f) => f.key === 'notMine');
    const blob = `${notMine?.label} ${notMine?.hint ?? ''}`.toLowerCase();
    expect(blob).toMatch(/loosen|not up to me|let it be/);
  });
});

describe('step 4 — Virtuous Response: four virtues, multi-select, synthesis', () => {
  it('references exactly wisdom, courage, justice, temperance', () => {
    expect(VIRTUE_REFERENCE.map((v) => v.key)).toEqual(['wisdom', 'courage', 'justice', 'temperance']);
  });

  it.each(MODES)('mode %s shows the (optional, multi-select) virtue chips + a synthesis field', (mode) => {
    const cfg = getStepConfig(mode, 'VirtuousResponse');
    expect(cfg.virtueChips).toBe(true);
    expect(cfg.virtueChipsPrompt && cfg.virtueChipsPrompt.length).toBeGreaterThan(0);
    // Exactly one captured output: the synthesized action.
    expect(cfg.fields).toHaveLength(1);
  });
});

describe('step 5 — Interconnected Living: belonging, both directions, no shorthand', () => {
  const forbidden = [/social connection/i, /connect with people/i, /compassion/i];
  it.each(MODES)('mode %s avoids forbidden shorthand', (mode) => {
    const cfg = getStepConfig(mode, 'InterconnectedLiving');
    const blob = `${cfg.subtitle} ${cfg.fields.map((f) => `${f.label} ${f.hint ?? ''}`).join(' ')}`;
    for (const pattern of forbidden) expect(blob).not.toMatch(pattern);
  });

  it('carries BOTH the receiving and the giving side (bidirectional oikeiōsis)', () => {
    const blob = MODES.map((m) => {
      const c = getStepConfig(m, 'InterconnectedLiving');
      return `${c.subtitle} ${c.fields.map((f) => `${f.label} ${f.hint ?? ''}`).join(' ')}`;
    })
      .join(' ')
      .toLowerCase();
    expect(blob).toMatch(/lean on|supported|held|receive/); // receiving
    expect(blob).toMatch(/serve|support them|show up|held.*up/); // giving
    expect(blob).toMatch(/communit|others|share/); // interconnection
  });
});

describe('crisis constraints', () => {
  it('places the static support line ONLY on step 2 (Radical Acceptance)', () => {
    for (const mode of MODES) {
      expect(getStepConfig(mode, 'RadicalAcceptance').supportLine).toBe(true);
      for (const step of DAILY_LOOP_STEP_KEYS) {
        if (step !== 'RadicalAcceptance') {
          expect(getStepConfig(mode, step).supportLine).toBeFalsy();
        }
      }
    }
  });

  it('the support line is non-alarming (no crisis/emergency/suicide wording)', () => {
    expect(SUPPORT_LINE).not.toMatch(/crisis|emergency|suicide|harm/i);
    expect(SUPPORT_LINE.length).toBeGreaterThan(0);
  });

  it('step-2 acceptance keeps its non-approval disclaimer as a visible hint', () => {
    const hint = getStepConfig('flat', 'RadicalAcceptance').fields[0]?.hint?.toLowerCase() ?? '';
    expect(hint).toMatch(/isn't approval|not approval|giving up/);
  });

  it('premeditatio is optional/skippable and coping-paired', () => {
    const hint = PREMEDITATIO.hint.toLowerCase();
    expect(hint).toMatch(/optional|skip/);
    expect(hint).toMatch(/cope|virtue/);
  });
});

describe('closing coda copy (practice-architecture, not a principle)', () => {
  it('provides the breathe-and-release coda + completion strings', () => {
    expect(CLOSING.breathTitle.toLowerCase()).toMatch(/breath|release/);
    expect(CLOSING.completeTitle.length).toBeGreaterThan(0);
    expect(CLOSING.noteLabel).toMatch(/optional/i);
  });

  /**
   * FEAT-298 slice 6a — the self-compassion posture re-homed from the retired Midday
   * CompassionateCloseScreen. It lives in the CODA, not step 5 (which is oikeiōsis /
   * belonging, other-directed by construction). Until now that boundary was asserted only
   * in a docstring and enforced by nothing.
   */
  describe('self-compassion posture (re-homed from Midday)', () => {
    const codaText = [
      CLOSING.postureLine,
      CLOSING.notePlaceholder,
      CLOSING.returnLine,
    ].join(' ');

    it('keeps the standard — honesty is demanded, only the harshness is removed', () => {
      expect(CLOSING.postureLine.toLowerCase()).toMatch(/honest/);
    });

    it('re-homes the return-anytime reinforcement as beginning again', () => {
      expect(CLOSING.returnLine.toLowerCase()).toMatch(/begin|again|come back/);
    });

    it('never uses the word "compassion" — the substance is Stoic, the label is not', () => {
      // resources.md flags Neff as "not explicitly Stoic". Ship prokopē, not the import.
      expect(codaText).not.toMatch(/compassion/i);
    });

    it('never borrows step 5s relational framing', () => {
      // These recruit the moral-circle logic of Interconnected Living, and a reader would
      // experience the coda as "step 5 continued" — which is the collision to avoid.
      for (const banned of [
        /as you would (a )?friend/i,
        /not alone/i,
        /social connection/i,
        /connect with people/i,
      ]) {
        expect(codaText).not.toMatch(banned);
      }
    });

    it('never congratulates, rewards, or absolves', () => {
      // The completeTitle already states that the practice is finished; congratulating on
      // top of it would turn the coda into a trophy. Absolution would relocate
      // responsibility off the practitioner, where shortfall is data to act on, not a
      // charge to be acquitted.
      //
      // NOTE ON THIS GUARD'S REACH (FEAT-328): it matches only the joined CLOSING copy
      // constants, so it can police authored strings and nothing else. The "✓ Loop
      // complete" badge lived inline in the screen's JSX and was invisible to this guard
      // for exactly that reason — the rule was written down in the same file it was being
      // violated in. The render-level counterpart that covers the JSX is
      // DailyLoopCompleteScreen.completionRegister.test.tsx; keep both.
      for (const banned of [
        /well done/i,
        /nice work/i,
        /you earned/i,
        /you deserve/i,
        /treat yourself/i,
        /did your best/i,
        /not your fault/i,
      ]) {
        expect(codaText).not.toMatch(banned);
      }
    });

    it('EXCLUDES gratitudeLine from this join, deliberately', () => {
      // gratitudeLine is the ONE coda element that IS tense-bound — morning and evening are
      // genuinely different practices in the framework. It must stay outside the
      // tense-neutrality join below, or a future reader "fixing" a /today/i violation will
      // flatten three authored strings into one and lose a distinction the docs are
      // explicit about.
      expect(codaText).not.toContain(CLOSING.gratitudeLine.morning);
      expect(codaText).not.toContain(CLOSING.gratitudeLine.evening);
    });

    it('is tense-neutral — one string serves all three modes', () => {
      // A tense-bound posture would recreate the bug being fixed: reachable in one tense
      // only. Also depth-neutral: nothing here presumes five beats ran.
      for (const banned of [/today/i, /\bthe day you\b/i, /all five/i]) {
        expect(codaText).not.toMatch(banned);
      }
    });
  });

  /**
   * FEAT-298 slice 6b — gratitude, re-homed from the retired morning/evening flows.
   *
   * The warrant is a defect in ALREADY-SHIPPED code, not "deleting the flows removes
   * gratitude from the app" (that premise is false — a weak generic gratitude-reflection
   * survives in module-4). The loop ships PREMEDITATIO (beat 4, morning-only), and the
   * framework makes present-moment gratitude its REQUIRED complement — so the loop has
   * been shipping the aversive half of a two-half practice with nothing to complete it.
   */
  describe('gratitude (re-homed from morning/evening)', () => {
    const ALL_MODES: DailyLoopMode[] = ['flat', 'morning', 'evening'];
    const allGratitude = ALL_MODES.map((m) => CLOSING.gratitudeLine[m]).join(' ');

    it('is authored for every tense — no stubs', () => {
      for (const mode of ALL_MODES) {
        expect(CLOSING.gratitudeLine[mode]).toEqual(expect.any(String));
        expect(CLOSING.gratitudeLine[mode].length).toBeGreaterThan(40);
      }
    });

    it('gives each tense a DISTINCT line — the whole point of varying it', () => {
      expect(new Set(ALL_MODES.map((m) => CLOSING.gratitudeLine[m])).size).toBe(
        ALL_MODES.length
      );
    });

    it('morning keeps the impermanence framing (Epictetus, Enchiridion 11)', () => {
      expect(CLOSING.gratitudeLine.morning.toLowerCase()).toMatch(
        /isn't promised|not owed|if it were gone/
      );
    });

    it('evening keeps the SPECIFICITY requirement — a moment, not a category', () => {
      // daily-architecture.md is explicit: "Three specific things from today (not generic)".
      expect(CLOSING.gratitudeLine.evening).toMatch(/specific|moment, not a category/i);
    });

    it('flat frames it as noticing what is already here (Marcus 7.27)', () => {
      expect(CLOSING.gratitudeLine.flat.toLowerCase()).toMatch(/already here/);
    });

    it('never congratulates, moralizes, or imports wellness-gratitude register', () => {
      // Stoic gratitude is an act of correct judgment, good in itself — not instrumental
      // to a mood outcome. Same standard 6a applied when it stripped "compassion".
      for (const banned of [
        /well done/i,
        /you deserve/i,
        /you earned/i,
        /should be grateful/i,
        /count your blessings/i,
        /positive/i,
        /blessing/i,
      ]) {
        expect(allGratitude).not.toMatch(banned);
      }
    });

    it('offers somewhere to WRITE gratitude without adding a second input', () => {
      // A second coda input would turn a closing into a form; the existing note absorbs it.
      expect(CLOSING.notePlaceholder).toMatch(/glad of/i);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// FEAT-301 — per-session depth (quick / deep)
// ──────────────────────────────────────────────────────────────────────────────
describe('FEAT-301 depth — quick variant composition', () => {
  it('quick is canonical steps 1→3→4 (arrive → discern → act), a SUBSET in canonical order', () => {
    expect(QUICK_STEP_KEYS).toEqual(['AwarePresence', 'SphereSovereignty', 'VirtuousResponse']);
    // Every quick step is a canonical step, in the same relative order (no rename/reorder).
    const canonicalOrder = QUICK_STEP_KEYS.map((k) => DAILY_LOOP_STEP_KEYS.indexOf(k));
    expect(canonicalOrder).toEqual([...canonicalOrder].sort((a, b) => a - b));
    expect(canonicalOrder.every((i) => i !== -1)).toBe(true);
  });

  it('getStepKeysForDepth: deep = all five, quick = the three-beat arc', () => {
    expect(getStepKeysForDepth('deep')).toEqual(DAILY_LOOP_STEP_KEYS);
    expect(getStepKeysForDepth('quick')).toEqual(QUICK_STEP_KEYS);
    expect(getStepKeysForDepth('deep')).toHaveLength(5);
    expect(getStepKeysForDepth('quick')).toHaveLength(3);
  });

  it('quick reuses the canonical StepConfig verbatim for each included beat (no condensed copy)', () => {
    for (const mode of MODES) {
      for (const step of QUICK_STEP_KEYS) {
        // getStepConfig is depth-agnostic — quick renders the SAME canonical config.
        expect(getStepConfig(mode, step)).toBe(getStepConfig(mode, step));
        expect(getStepConfig(mode, step).subtitle.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('FEAT-301 depth — crisis support line "exactly once, per depth"', () => {
  it('quick surfaces the support line on EXACTLY Sphere Sovereignty (a no-breath-gate beat), never Aware Presence', () => {
    // Aware Presence gates its reflection behind a 30s breath; hosting the crisis
    // affordance there would make it strictly less available than deep's (crisis review).
    expect(QUICK_SUPPORT_STEP).toBe('SphereSovereignty');
    for (const mode of MODES) {
      const shown = QUICK_STEP_KEYS.filter((s) => showsSupportLine('quick', mode, s));
      expect(shown).toEqual(['SphereSovereignty']); // exactly one, and it's the no-gate beat
    }
  });

  it('deep still surfaces the support line on EXACTLY Radical Acceptance (byte-for-byte unchanged)', () => {
    for (const mode of MODES) {
      const shown = DAILY_LOOP_STEP_KEYS.filter((s) => showsSupportLine('deep', mode, s));
      expect(shown).toEqual(['RadicalAcceptance']);
    }
  });

  it('never zero and never duplicated for either depth', () => {
    for (const depth of DEPTHS) {
      for (const mode of MODES) {
        const shown = getStepKeysForDepth(depth).filter((s) => showsSupportLine(depth, mode, s));
        expect(shown).toHaveLength(1);
      }
    }
  });
});

describe('FEAT-301 depth — picker copy is symmetric + non-ranking', () => {
  it('exposes a label + blurb for each depth', () => {
    for (const depth of DEPTHS) {
      expect(DEPTH_LABELS[depth].label.length).toBeGreaterThan(0);
      expect(DEPTH_LABELS[depth].blurb.length).toBeGreaterThan(0);
    }
  });

  it('the picker frames BOTH as complete practices', () => {
    expect(DEPTH_PICKER_COPY.subtitle.toLowerCase()).toMatch(/both.*complete|complete practices/);
  });

  it('deep is never framed by a count of principles or as the "full/real/complete" one', () => {
    const deepBlob = `${DEPTH_LABELS.deep.label} ${DEPTH_LABELS.deep.blurb}`.toLowerCase();
    expect(deepBlob).not.toMatch(/all five|five principles|full|complete|the real|proper/);
    // "Deeper" is comparative (codes quick as less-deep) — forbidden.
    expect(DEPTH_LABELS.deep.label.toLowerCase()).not.toMatch(/deeper/);
  });

  it('quick is never framed as lesser / lite / partial / a subset', () => {
    const quickBlob = `${DEPTH_LABELS.quick.label} ${DEPTH_LABELS.quick.blurb}`.toLowerCase();
    expect(quickBlob).not.toMatch(/lite|lesser|partial|subset|less than|basic|just a/);
    // Affirmatively frames it as a whole/self-contained practice.
    expect(quickBlob).toMatch(/self-contained|whole|complete/);
  });
});

describe('FEAT-301 depth — completion copy is depth-accurate', () => {
  it('quick does NOT claim "all five principles" (false + re-ranking) and does not count', () => {
    const quickTitle = getCompleteTitle('quick').toLowerCase();
    expect(quickTitle).not.toMatch(/all five|five principles/);
    expect(getCompleteTitle('quick').length).toBeGreaterThan(0);
  });

  it('deep keeps the canonical completion title', () => {
    expect(getCompleteTitle('deep')).toBe(CLOSING.completeTitle);
  });
});
