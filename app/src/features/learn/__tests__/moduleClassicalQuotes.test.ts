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
