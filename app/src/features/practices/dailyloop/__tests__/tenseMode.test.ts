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
  MODE_LABELS,
  getStepConfig,
} from '../config/tenseMode';
import type { DailyLoopMode } from '@/features/practices/types/flows';

const MODES: DailyLoopMode[] = ['flat', 'morning', 'evening'];

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

  it('exposes a label + blurb for each mode picker option', () => {
    for (const mode of MODES) {
      expect(MODE_LABELS[mode].label.length).toBeGreaterThan(0);
      expect(MODE_LABELS[mode].blurb.length).toBeGreaterThan(0);
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
});
