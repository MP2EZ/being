/**
 * Module classical-quote integrity (FEAT-54 data-debt guard)
 *
 * FEAT-54 corrected inherited FEAT-49 data-debt in the shipped module quotes:
 * added missing source citations (modules 1/2/4) and fixed the module-5
 * "fingers of a hand" misattribution (not actually Marcus Aurelius). This is a
 * static guard so those corrections can't silently regress — analogous to the
 * passage content-integrity test and the clinical-config tests.
 */

import module1 from '../../../../assets/modules/module-1-aware-presence.json';
import module2 from '../../../../assets/modules/module-2-radical-acceptance.json';
import module3 from '../../../../assets/modules/module-3-sphere-sovereignty.json';
import module4 from '../../../../assets/modules/module-4-virtuous-response.json';
import module5 from '../../../../assets/modules/module-5-interconnected-living.json';

const MODULES = [module1, module2, module3, module4, module5];
const STOIC_AUTHORS = ['Marcus Aurelius', 'Epictetus', 'Seneca'];

describe('module classical quotes', () => {
  it.each(MODULES.map((m) => [m.id, m]))(
    '%s carries text, a known author, and a source citation',
    (_id, module) => {
      const quote = (module as any).classicalQuote;
      expect(quote.text.length).toBeGreaterThan(0);
      expect(STOIC_AUTHORS).toContain(quote.author);
      // Every quote must cite its source (the FEAT-54 data-debt fix).
      expect(typeof quote.source).toBe('string');
      expect(quote.source.length).toBeGreaterThan(0);
    }
  );

  it('does not re-introduce the module-5 "fingers of a hand" misattribution', () => {
    const serialized = JSON.stringify(module5);
    expect(serialized).not.toMatch(/fingers of a hand/i);
  });

  it('does not quote the in-copyright Hays "stands in the way" phrasing', () => {
    for (const module of MODULES) {
      expect(JSON.stringify(module)).not.toMatch(/stands in the way becomes the way/i);
    }
  });
});

/**
 * MAINT-331 — guard over shipped PRACTICE COPY, not just the module-level quote.
 *
 * The suites above (and moduleClassicalQuotes' own cases) police `classicalQuote`
 * objects. Nothing watched `practices[].instructions`, which is structurally why
 * `gratitude-reflection` shipped generic-wellness copy through a green suite: four
 * of its six instructions were CATEGORY-level ("the people who have contributed to
 * your wellbeing"), the shape daily-architecture.md §5 rejects by name, and its
 * terminus was an affective state ("allow the feeling of gratitude to settle in
 * your body") where Stoic gratitude is an act of justice and correct judgment,
 * good in itself.
 *
 * These are STRUCTURAL pins, not copy pins — they assert the moves that must be
 * present and the failures that must not return, so the wording stays editable.
 */
const findPractice = (module: unknown, id: string): { instructions?: string[] } | undefined => {
  let found: { instructions?: string[] } | undefined;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (obj.id === id) found = obj as { instructions?: string[] };
      Object.values(obj).forEach(walk);
    }
  };
  walk(module);
  return found;
};

describe('module-4 gratitude-reflection practice copy (MAINT-331)', () => {
  const practice = findPractice(module4, 'gratitude-reflection');
  const instructions = practice?.instructions ?? [];
  const joined = instructions.join(' ');

  it('still exists under module 4 with instructions', () => {
    // Guards the finder: a rename of the id would otherwise make every case below
    // pass vacuously against an empty array.
    expect(practice).toBeDefined();
    expect(instructions.length).toBeGreaterThan(0);
  });

  it('carries the Meditations 7.27 anti-clinging guard', () => {
    // Non-negotiable per the AC: imagined privation WITHOUT the guard manufactures
    // clinging — the mirror-image failure of the generic content it replaced.
    // Marcus supplies the guard himself in 7.27's second sentence.
    expect(joined).toMatch(/overvalu/i);
  });

  it('does not import the in-copyright Hays rendering of the 7.27 guard', () => {
    // Long (public domain) is "disturbed if ever thou shouldst not have them";
    // Hays (2002, in copyright) is "upset you to lose them".
    expect(joined).not.toMatch(/upset you to lose/i);
  });

  it('does not restore the affective terminus', () => {
    // "Allow the feeling of gratitude to settle in your body" made a felt state the
    // endpoint. daily-architecture.md rules on this exact error.
    expect(joined).not.toMatch(/feeling of gratitude to settle/i);
  });

  it('does not restore category-level gratitude prompts', () => {
    // The "I'm grateful for my family" shape: a class of things, not a specific one.
    expect(joined).not.toMatch(/people who have contributed/i);
    expect(joined).not.toMatch(/opportunities you've been given/i);
    expect(joined).not.toMatch(/ordinary blessings/i);
  });

  it('keeps the imagined absence bounded and returns it in the same step', () => {
    // The browse card renders only instructions.slice(0, 3) (PracticeTab.tsx) with
    // "+N more steps". If absence and return were separate steps, the card preview
    // would END on "picture it absent" and hide the restoration behind a tap —
    // privation as the terminal visible line, which condition (ii) forbids. Fusing
    // them makes the truncation safe by construction.
    const absenceStep = instructions.findIndex((i) => /absent/i.test(i));
    expect(absenceStep).toBeGreaterThanOrEqual(0);
    expect(absenceStep).toBeLessThan(3);
    expect(instructions[absenceStep]).toMatch(/come back|return/i);
  });
});
