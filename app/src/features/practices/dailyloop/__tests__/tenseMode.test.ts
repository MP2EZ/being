/**
 * tenseMode fidelity guard — FEAT-291.
 *
 * Pins the philosopher planning pass's NON-NEGOTIABLE constraints for the daily
 * loop's canonical copy so they can't silently regress: canonical names + order,
 * all three tense modes authored (no stubs), the four cardinal virtues named,
 * step-5 free of the forbidden shorthand, and the premeditatio guardrails.
 */
import {
  DAILY_LOOP_STEP_KEYS,
  STEP_TITLES,
  VIRTUE_REFERENCE,
  PREMEDITATIO,
  MODE_LABELS,
  getStepCopy,
  type DailyLoopStepKey,
} from '../config/tenseMode';
import type { DailyLoopMode } from '@/features/practices/types/flows';

const MODES: DailyLoopMode[] = ['flat', 'morning', 'evening'];

describe('daily loop canonical names + order (invariant)', () => {
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

describe('all three tense modes authored to equal fidelity (no stubs)', () => {
  it.each(MODES)('mode %s has non-empty copy for every step', (mode) => {
    for (const step of DAILY_LOOP_STEP_KEYS) {
      const copy = getStepCopy(mode, step);
      expect(copy.subtitle.trim().length).toBeGreaterThan(0);
      expect(copy.inputLabel.trim().length).toBeGreaterThan(0);
      expect(copy.placeholder.trim().length).toBeGreaterThan(0);
    }
  });

  it('the three prompts for a step differ across modes (voice actually changes)', () => {
    for (const step of DAILY_LOOP_STEP_KEYS) {
      const labels = MODES.map((m) => getStepCopy(m, step).inputLabel);
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

describe('step 4 — four cardinal virtues named', () => {
  it('references exactly wisdom, courage, justice, temperance', () => {
    expect(VIRTUE_REFERENCE.map((v) => v.key)).toEqual(['wisdom', 'courage', 'justice', 'temperance']);
    for (const v of VIRTUE_REFERENCE) {
      expect(v.label.length).toBeGreaterThan(0);
      expect(v.gloss.length).toBeGreaterThan(0);
    }
  });

  it('names all four virtues in the flat step-4 prompt', () => {
    const label = getStepCopy('flat', 'VirtuousResponse').inputLabel.toLowerCase();
    for (const virtue of ['wisdom', 'courage', 'justice', 'temperance']) {
      expect(label).toContain(virtue);
    }
  });
});

describe('step 5 — Interconnected Living, never the narrowed shorthand', () => {
  const forbidden = [/social connection/i, /connect with people/i, /compassion/i];
  it.each(MODES)('mode %s step-5 copy avoids forbidden shorthand', (mode) => {
    const copy = getStepCopy(mode, 'InterconnectedLiving');
    const blob = `${copy.subtitle} ${copy.inputLabel} ${copy.inputHint ?? ''}`;
    for (const pattern of forbidden) {
      expect(blob).not.toMatch(pattern);
    }
  });

  it('carries the interconnection framing (community / others)', () => {
    const blob = MODES.map((m) => {
      const c = getStepCopy(m, 'InterconnectedLiving');
      return `${c.subtitle} ${c.inputLabel} ${c.inputHint ?? ''}`;
    }).join(' ').toLowerCase();
    expect(blob).toMatch(/communit|others|common good/);
  });
});

describe('premeditatio guardrails (step 4 morning-tensed)', () => {
  it('is optional/skippable and paired with a coping clause', () => {
    const hint = PREMEDITATIO.hint.toLowerCase();
    expect(hint).toMatch(/optional|skip/);
    expect(hint).toMatch(/cope|virtue/);
  });
});
