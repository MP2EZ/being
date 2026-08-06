/**
 * DEBUG-330 — static guard over PRACTICE_QUOTES.
 *
 * WHY THIS FILE EXISTS RATHER THAN AN EDIT TO AN EXISTING GUARD.
 * Three suites already ban in-copyright Hays phrasing, and PRACTICE_QUOTES
 * still shipped it. That is not an oversight in their patterns — each is bound
 * to a DIFFERENT data source by static IMPORT, not by a path glob:
 *   • learn/__tests__/moduleClassicalQuotes.test.ts  → imports assets/modules/*.json
 *   • library/__tests__/passagesContent.test.ts      → walks loadAllPassages()
 *   • insights/constants/__tests__/marcusQuotes.test.ts → imports MARCUS_QUOTES
 * None of them can see a constant declared in a .tsx source file, so there was
 * no glob to widen. This is the fourth surface carrying classical quotes and
 * the fourth hand-written guard; if a fifth appears, hoist the shared denylist
 * into one exported list instead of copying it again.
 *
 * Shape follows DEBUG-319's marcusQuotes.test.ts: serialize the exported
 * constant, ban the known-bad strings, and add POSITIVE assertions — a denylist
 * alone cannot catch drift to some third paraphrase nobody has seen yet.
 */
import { PRACTICE_QUOTES } from '../PracticeCompletionScreen';
import passages4 from '../../../../../assets/passages/passages-4-virtuous-response.json';

const serialized = JSON.stringify(PRACTICE_QUOTES);

/** Text of a passages-corpus entry by citation, for cross-surface agreement. */
const passageText = (citation: string): string => {
  const list = (Array.isArray(passages4) ? passages4 : (passages4 as { passages?: unknown[] }).passages) ?? [];
  const hit = (list as Array<{ citation?: string; text?: string }>).find(
    (p) => p.citation === citation,
  );
  if (!hit?.text) throw new Error(`No passages-corpus entry for ${citation}`);
  return hit.text;
};

describe('PRACTICE_QUOTES — no fabricated attributions', () => {
  test('does not ship the spurious Meditations 5.9 quotation', () => {
    // "You have power over your mind - not outside events..." appears in NO
    // standard translation. It is the single most widely circulated fake Marcus
    // quote, and it shipped here under a comment claiming philosopher validation.
    expect(serialized).not.toMatch(/You have power over your mind/i);
    expect(serialized).not.toMatch(/Realize this, and you will find strength/i);
  });

  test('cites no Meditations 5.9 at all', () => {
    // The real 5.9 is the "return to it again" passage, cited correctly in
    // tenseMode.ts. Nothing on this surface should claim 5.9 until some entry
    // legitimately renders that passage.
    for (const [key, quote] of Object.entries(PRACTICE_QUOTES)) {
      expect(`${key}:${quote.source}`).not.toBe(`${key}:Meditations 5.9`);
    }
  });
});

describe('PRACTICE_QUOTES — no in-copyright phrasing', () => {
  // Gregory Hays (2002) and Robin Hard (2011) are in copyright. A quote on a
  // completion screen shown after every practice is a materially weaker
  // fair-use posture than a single critical quotation, so the repo uses
  // public-domain translations throughout: Long (Marcus), Gummere (Seneca),
  // Oldfather (Epictetus).
  test('does not ship the Hays rendering of Meditations 5.20', () => {
    expect(serialized).not.toMatch(/stands in the way becomes the way/i);
    expect(serialized).not.toMatch(/The impediment to action advances action/i);
  });

  test('does not ship the Hays rendering of Meditations 10.16', () => {
    // DEBUG-330 finding: the previous "Waste no more time arguing what a good
    // person should be. Be one." was NOT a loose paraphrase — it is Hays'
    // 10.16 with two words dropped. Same copyright defect as 5.20, in an entry
    // the original report classed as merely divergent.
    expect(serialized).not.toMatch(/Waste no more time arguing/i);
  });
});

describe('PRACTICE_QUOTES — agrees with the passages corpus', () => {
  // The positive half. Bans stop a return to a KNOWN bad string; these stop
  // drift to an unknown one by pinning the two entries that have a
  // public-domain counterpart already in the repo.
  test('virtuous-reframing is verbatim George Long, Meditations 5.20', () => {
    expect(passageText('Meditations 5.20')).toContain(PRACTICE_QUOTES['virtuous-reframing'].text.replace(/^The /, 'the '));
  });

  test('virtue-check is verbatim George Long, Meditations 10.16', () => {
    expect(passageText('Meditations 10.16')).toContain(PRACTICE_QUOTES['virtue-check'].text);
  });
});

describe('PRACTICE_QUOTES — shape and citation format', () => {
  test('every entry has non-empty text, author and source', () => {
    const entries = Object.entries(PRACTICE_QUOTES);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, quote] of entries) {
      expect(`${key}:${quote.text.trim().length > 0}`).toBe(`${key}:true`);
      expect(`${key}:${quote.author.trim().length > 0}`).toBe(`${key}:true`);
      expect(`${key}:${quote.source.trim().length > 0}`).toBe(`${key}:true`);
    }
  });

  test('citations use the dot convention shared with the passages corpus', () => {
    // "Meditations 5.20", never "Meditations 5:20". Matches the convention
    // marcusQuotes.test.ts pins repo-wide. Epictetus' Enchiridion has
    // single-number sections, so both forms are admissible.
    for (const [key, quote] of Object.entries(PRACTICE_QUOTES)) {
      expect(`${key}:${quote.source}`).toMatch(
        /^[^:]+:(Meditations \d+\.\d+|Enchiridion \d+(\.\d+)?|Letters \d+(\.\d+)?)$/,
      );
    }
  });

  test('no entry ends mid-sentence without terminal punctuation', () => {
    for (const [key, quote] of Object.entries(PRACTICE_QUOTES)) {
      expect(`${key}:${/[.?!]$/.test(quote.text.trim())}`).toBe(`${key}:true`);
    }
  });
});
