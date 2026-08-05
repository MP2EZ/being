/**
 * DEBUG-319 — data-debt guard for the Insights daily quote rotation.
 *
 * Follows the precedent set by FEAT-54 (moduleClassicalQuotes.test.ts) and FEAT-76
 * (about-stoic-mindfulness-screen.test.tsx): both prior citation-accuracy fixes in this
 * repo shipped a STATIC GUARD rather than relying on a one-time grep, because a grep
 * proves the state of the tree on the day it was run and nothing after.
 *
 * The two fabrications pinned out here are not hypothetical — both shipped to users.
 */

import { MARCUS_QUOTES, getDailyQuote } from '../marcusQuotes';

describe('MARCUS_QUOTES — fabrications must never return', () => {
  const serialized = JSON.stringify(MARCUS_QUOTES);

  test('does not contain the "precious privilege" misattribution (was cited Meditations 2:1)', () => {
    // A circulated internet confection with no counterpart in any standard translation.
    // Real 2.1 is the busybody passage, carried correctly in the passages corpus.
    expect(serialized).not.toMatch(/precious privilege/i);
  });

  test('does not contain the "ranks of the insane" misattribution (was cited Meditations 4:32)', () => {
    // Traces to a translation of Tolstoy's "Bethink Yourselves!", not Marcus. Real 4.32
    // is the Vespasian passage. Also contradicts Principle 5, Interconnected Living.
    expect(serialized).not.toMatch(/ranks of the insane/i);
    expect(serialized).not.toMatch(/side of the majority/i);
  });

  test('does not contain the composite 7.67 accretion', () => {
    // "Very little is needed to make a happy life" is genuine; the trailing clause is not.
    expect(serialized).not.toMatch(/all within yourself, in your way of thinking/i);
  });

  test('does not render Marcus\'s "fountain of good" as "a source of strength"', () => {
    // Semantic drift: converts a virtue-ethics claim (the agathon) into a resilience claim.
    expect(serialized).not.toMatch(/a source of strength which will always spring up/i);
  });
});

describe('MARCUS_QUOTES — copyright posture', () => {
  const serialized = JSON.stringify(MARCUS_QUOTES);

  test('uses only public-domain translations', () => {
    for (const q of MARCUS_QUOTES) {
      expect(['George Long', 'Gummere', 'Oldfather']).toContain(q.translation);
    }
  });

  test('does not introduce in-copyright Hays phrasing', () => {
    // Hays (2002) is in copyright and a DAILY-ROTATING quote is a materially weaker
    // fair-use posture than a single critical quotation. Two other suites already ban
    // this exact phrasing elsewhere (moduleClassicalQuotes.test.ts, passagesContent.test.ts).
    expect(serialized).not.toMatch(/stands in the way becomes the way/i);
    expect(serialized).not.toMatch(/The impediment to action advances action/i);
  });
});

describe('MARCUS_QUOTES — shape and citation format', () => {
  test('every entry has non-empty text, source and translation', () => {
    expect(MARCUS_QUOTES.length).toBeGreaterThan(0);
    for (const q of MARCUS_QUOTES) {
      expect(q.text.trim().length).toBeGreaterThan(0);
      expect(q.translation.trim().length).toBeGreaterThan(0);
    }
  });

  test('citations use the dot convention shared with the passages corpus', () => {
    // The corpus (assets/passages/*.json), PRACTICE_QUOTES and the library types all use
    // "Meditations 5.1". The colon form "Meditations 5:1" was unique to this file.
    for (const q of MARCUS_QUOTES) {
      expect(q.source).toMatch(/^Meditations \d+\.\d+$/);
    }
  });

  test('no entry ends mid-sentence without terminal punctuation', () => {
    for (const q of MARCUS_QUOTES) {
      expect(q.text.trim()).toMatch(/[.?!]$/);
    }
  });
});

describe('getDailyQuote', () => {
  const realNow = Date.now;
  afterEach(() => {
    Date.now = realNow;
  });

  test('always returns a member of the array, across a full year sweep', () => {
    // Index safety: the modulo must never produce an out-of-range read on any day.
    const base = new Date(2026, 0, 1).getTime();
    for (let day = 0; day < 366; day++) {
      Date.now = () => base + day * 24 * 60 * 60 * 1000;
      const q = getDailyQuote();
      expect(q).toBeDefined();
      expect(MARCUS_QUOTES).toContain(q);
    }
  });

  test('is deterministic for a given day', () => {
    Date.now = () => new Date(2026, 5, 15).getTime();
    expect(getDailyQuote()).toBe(getDailyQuote());
  });
});
