/**
 * DEBUG-330 / DEBUG-339 — static guard over PRACTICE_QUOTES.
 *
 * WHY THIS FILE EXISTS RATHER THAN AN EDIT TO AN EXISTING GUARD.
 * Three suites already ban in-copyright Hays phrasing, and PRACTICE_QUOTES
 * still shipped it. That is not an oversight in their patterns — each is bound
 * to a DIFFERENT data source by static IMPORT, not by a path glob:
 *   • learn/__tests__/moduleClassicalQuotes.test.ts  → imports assets/modules/*.json
 *   • library/__tests__/passagesContent.test.ts      → walks loadAllPassages()
 *   • insights/constants/__tests__/marcusQuotes.test.ts → imports MARCUS_QUOTES
 * None of them can see a constant declared in a .tsx source file, so there was
 * no glob to widen.
 *
 * DEBUG-339 considered hoisting the four denylists into one shared constant and
 * REJECTED it. Their intersection is exactly ONE regex
 * (/stands in the way becomes the way/i), and their extraction SCOPES differ in
 * a load-bearing way: passagesContent deliberately scopes to `p.text`/`p.fullText`
 * because passages-4-virtuous-response.json's `context` field legitimately
 * contains that banned phrase while explaining it. A hoist that also unified
 * extraction would fail that file on day one; a hoist of just the union list
 * would fail here and in marcusQuotes.ts, where banned strings live inside
 * explanatory comments. So it would dedupe one regex, not four lists.
 *
 * The real structural fix DEBUG-339 shipped instead is below: a CORPUS LOOP that
 * pins every entry with a public-domain counterpart automatically, plus a
 * mandatory `translation` field. PRACTICE_QUOTES had no translator field, which
 * is structurally WHY it drifted to Morgan (4.3) and Nicholas White (Enchiridion 1)
 * without anything noticing.
 *
 * TRANSLATOR NOTE: an earlier version of this header said the repo's Epictetus is
 * "Oldfather". That was wrong about this codebase — every Enchiridion entry in
 * assets/passages/passages-3-sphere-sovereignty.json declares Elizabeth Carter
 * (1758). Corrected in DEBUG-339.
 */
import { PRACTICE_QUOTES } from '../PracticeCompletionScreen';
import passages1 from '../../../../../assets/passages/passages-1-aware-presence.json';
import passages2 from '../../../../../assets/passages/passages-2-radical-acceptance.json';
import passages3 from '../../../../../assets/passages/passages-3-sphere-sovereignty.json';
import passages4 from '../../../../../assets/passages/passages-4-virtuous-response.json';
import passages5 from '../../../../../assets/passages/passages-5-interconnected-living.json';
// DEBUG-344: the module JSONs are the authoring source for practiceIds; the
// key-set guard at the bottom of this file asserts they agree with the map.
import module1 from '../../../../../assets/modules/module-1-aware-presence.json';
import module2 from '../../../../../assets/modules/module-2-radical-acceptance.json';
import module3 from '../../../../../assets/modules/module-3-sphere-sovereignty.json';
import module4 from '../../../../../assets/modules/module-4-virtuous-response.json';
import module5 from '../../../../../assets/modules/module-5-interconnected-living.json';

const serialized = JSON.stringify(PRACTICE_QUOTES);

type CorpusEntry = { citation?: string; text?: string; translation?: string };

/**
 * citation → corpus entry, across ALL FIVE passages files.
 *
 * DEBUG-330's version hardcoded passages-4 and hand-wrote one positive test per
 * entry, which is why only 2 of 9 entries were pinned. Building the whole map
 * lets the loop below cover every entry that HAS a counterpart, and cover any
 * future entry for free.
 */
const CORPUS: Record<string, CorpusEntry> = (() => {
  const files = [passages1, passages2, passages3, passages4, passages5];
  const map: Record<string, CorpusEntry> = {};
  for (const file of files) {
    const list =
      (Array.isArray(file) ? file : (file as { passages?: unknown[] }).passages) ?? [];
    for (const entry of list as CorpusEntry[]) {
      if (entry.citation) map[entry.citation] = entry;
    }
  }
  return map;
})();

/** Loose containment: case- and trailing-period-insensitive. */
const corpusContains = (corpusText: string, quoteText: string): boolean =>
  corpusText.toLowerCase().includes(quoteText.toLowerCase().replace(/\.$/, ''));

describe('PRACTICE_QUOTES — no fabricated attributions', () => {
  test('does not ship the spurious Meditations 5.9 quotation', () => {
    // "You have power over your mind - not outside events..." appears in NO
    // standard translation. It is the single most widely circulated fake Marcus
    // quote, and it shipped here under a comment claiming philosopher validation.
    expect(serialized).not.toMatch(/You have power over your mind/i);
    expect(serialized).not.toMatch(/Realize this, and you will find strength/i);
  });

  test('cites no Meditations 5.9 at all', () => {
    // The real 5.9 IS a genuine George Long locus — the "when thou hast failed,
    // return back again" passage — and tenseMode.ts cites it correctly. This ban
    // is deliberately narrow: it stops THIS surface claiming 5.9 until some entry
    // legitimately renders that passage. DEBUG-339 re-verified and kept it as-is.
    // Do NOT widen it into a repo-wide "no Meditations 5.9 anywhere" rule.
    for (const [key, quote] of Object.entries(PRACTICE_QUOTES)) {
      expect(`${key}:${quote.source}`).not.toBe(`${key}:Meditations 5.9`);
    }
  });
});

describe('PRACTICE_QUOTES — no in-copyright or non-repo-translator phrasing', () => {
  // Gregory Hays (2002), Robin Hard (2011) and Nicholas White (1983) are in
  // copyright. A quote on a completion screen shown after every practice is a
  // materially weaker fair-use posture than a single critical quotation, so the
  // repo uses public-domain translations throughout: Long (Marcus), Carter
  // (Epictetus), Gummere/Stewart (Seneca).
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

  test('does not ship the Nicholas White rendering of Enchiridion 1', () => {
    // DEBUG-339: "Some things are up to us and some things are not up to us."
    // The "up to us" idiom is Nicholas White (Hackett, 1983) — IN COPYRIGHT —
    // and is also the shape Robin Hard (2014) uses. Carter's public-domain
    // rendering is "in our control", which is what passages-3 already carries.
    // The full White paragraph also shipped in
    // assets/modules/module-3-sphere-sovereignty.json; DEBUG-343 replaced it
    // with Carter and now bans the idiom corpus-wide in
    // learn/__tests__/moduleClassicalQuotes.test.ts.
    expect(serialized).not.toMatch(/\bup to us\b/i);
  });

  test('does not ship the Morgan rendering of Meditations 4.3', () => {
    // DEBUG-339: "The universe is change; our life is what our thoughts make
    // it." is Morris H. Morgan's rendering (the one Bartlett's popularised),
    // not George Long. Morgan died in 1910 so this is very probably NOT a
    // copyright defect — it is a TRANSLATOR-CONSISTENCY defect: it silently
    // mixed a fourth translator into a Marcus surface whose declared translator
    // everywhere else in this repo is Long.
    expect(serialized).not.toMatch(/our thoughts make it/i);
  });

  test('does not ship the unsourced resistance-check paraphrase', () => {
    // DEBUG-339: "Do not let the body's reflexes control the soul." appears in
    // NO translation, and Meditations 6.16 does not say it — 6.16's subject is
    // what is worth valuing, not bodily resistance.
    expect(serialized).not.toMatch(/body.s reflexes/i);
  });

  test('does not ship the Hays-shaped gratitude compression', () => {
    // DEBUG-339: "Receive without conceit, release without struggle." is a
    // synonym-swapped compression whose structure tracks Hays 8.33 ("To accept
    // it without arrogance, to let it go with indifference") — the same defect
    // shape DEBUG-330 found in virtue-check.
    expect(serialized).not.toMatch(/Receive without conceit/i);
    expect(serialized).not.toMatch(/release without struggle/i);
  });

  test('does not reintroduce the one-word drift in Meditations 5.18', () => {
    // DEBUG-339: Long reads "...WHICH he is not formed by nature to bear",
    // not "that". Exactly the byte-drift class this work item exists to kill.
    expect(serialized).not.toMatch(/that he is not formed by nature/i);
  });
});

describe('PRACTICE_QUOTES — agrees with the passages corpus', () => {
  // The positive half, and the durable one. Bans stop a return to a KNOWN bad
  // string; this stops drift to an unknown one. DEBUG-330 hand-wrote two of
  // these; DEBUG-339 replaced them with a loop so every entry that has a
  // public-domain counterpart is pinned automatically — including any future
  // entry, for free.
  const withCounterpart = Object.entries(PRACTICE_QUOTES).filter(
    ([, q]) => CORPUS[q.source] !== undefined,
  );

  test('at least the four known corpus-backed entries are covered', () => {
    // Guards the loop itself: if the corpus map silently failed to build, the
    // loop below would vacuously pass with zero cases.
    expect(withCounterpart.map(([k]) => k).sort()).toEqual(
      ['breathing-space', 'control-sorting', 'virtue-check', 'virtuous-reframing'].sort(),
    );
  });

  test.each(withCounterpart)(
    '%s is verbatim from the passages corpus',
    (key, quote) => {
      const entry = CORPUS[quote.source];
      expect(`${key}:${corpusContains(entry.text ?? '', quote.text)}`).toBe(`${key}:true`);
    },
  );

  test.each(withCounterpart)(
    '%s declares the same translator as the corpus',
    (key, quote) => {
      const entry = CORPUS[quote.source];
      expect(`${key}:${quote.translation}`).toBe(`${key}:${entry.translation}`);
    },
  );
});

describe('PRACTICE_QUOTES — entries with no corpus counterpart', () => {
  /**
   * These five loci are not in assets/passages, so there is no second surface to
   * disagree with them and the corpus loop cannot cover them. They get EXACT
   * string equality instead of substring containment — a weaker pin would let a
   * silent edit through on precisely the entries nothing else watches.
   *
   * Every string below is George Long (1862), Project Gutenberg #15877.
   * Permitted edits to Long, each named where applied: drop a leading
   * subordinator/enumerator, capitalise the resulting first word, convert a
   * clause-final semicolon or colon to a period, render Gutenberg's double
   * hyphen as an em dash. No splicing across non-adjacent sentences.
   */
  const EXPECTED: Record<string, string> = {
    // Long 4.3, verbatim except the enumerating lead-in "One is that" dropped
    // and "Things" capitalised. Same edit class DEBUG-330 sanctioned for
    // virtuous-reframing.
    'acceptance-shift':
      'Things do not touch the soul, for they are external and remain immovable; but our perturbations come only from the opinion which is within.',
    // Long 8.28, contiguous and verbatim; only Gutenberg's double hyphens
    // rendered as em dashes. Chosen over 5.26 (taken by body-scan) and over
    // 5.26's opening sentence, which reads as emotional suppression against a
    // practice whose own instruction is "allowing it to be there".
    'resistance-check':
      'Pain is either an evil to the body — then let the body say what it thinks of it — or to the soul; but it is in the power of the soul to maintain its own serenity and tranquillity, and not to think that pain is an evil.',
    // Long 7.27, BOTH sentences, contiguous and verbatim — permitted under the
    // edit rules above, which forbid only splicing across NON-adjacent sentences.
    // This IS the Stoic gratitude passage; 8.33's actual subject is wealth.
    // MAINT-331 widened this from s.1 to s.1+s.2 deliberately: s.2 is Marcus's own
    // "At the same time however take care that…" hedge on s.1's counterfactual, and
    // PracticeCompletionScreen REPLACES the practice screen, so s.1 alone left the
    // flow ending on a desire-amplifying clause with the practice's in-situ guard
    // already off-screen. Restoring s.1-only here is a regression, not a cleanup.
    'gratitude-reflection':
      'Think not so much of what thou hast not as of what thou hast: but of the things which thou hast select the best, and then reflect how eagerly they would have been sought, if thou hadst them not. At the same time however take care that thou dost not through being so pleased with them accustom thyself to overvalue them, so as to be disturbed if ever thou shouldst not have them.',
    // Long 5.18, verbatim. "which", not "that".
    'reserve-clause': 'Nothing happens to any man which he is not formed by nature to bear.',
    // Long 5.26, verbatim except the leading "then" dropped (DEBUG-330).
    'body-scan':
      'Thou must not strive to resist the sensation, for it is natural: but let not the ruling part of itself add to the sensation the opinion that it is either good or bad.',
    // DEBUG-344 — the three module-5 entries. Exact-pinned here rather than
    // routed through the corpus loop ON PURPOSE: passages-5's "Meditations 7.13"
    // and "Meditations 2.1" declare George Long but are not his text, and
    // corpusContains() is a substring check, so citing either locus would let
    // non-Long text pass the guard test-blessed. Do NOT "fix" a future failure
    // here by adding 7.22 / 6.53 / 11.4 to passages-5. (Corpus defects: DEBUG-352.)
    //
    // Long 7.22, first sentence only. The continuation ("the wrong-doer has done
    // thee no harm…") reads as harm-minimisation on a context-free completion
    // screen — the ground DEBUG-339 used to reject 4.39 and 5.26's opening.
    'loving-kindness': 'It is peculiar to man to love even those who do wrong.',
    // Long 6.53, complete and verbatim.
    'mindful-listening':
      "Accustom thyself to attend carefully to what is said by another, and as much as it is possible, be in the speaker's mind.",
    // Long 11.4, first two sentences. Stops before Long's own bracketed
    // insertion "[doing such good]" — shipping the brackets is ugly, silently
    // unbracketing them invents translator text. Note the comma after "then".
    'social-impact-reflection':
      'Have I done something for the general interest? Well then, I have had my reward.',
  };

  test('covers exactly the entries the corpus loop cannot', () => {
    const uncovered = Object.entries(PRACTICE_QUOTES)
      .filter(([, q]) => CORPUS[q.source] === undefined)
      .map(([k]) => k)
      .sort();
    expect(uncovered).toEqual(Object.keys(EXPECTED).sort());
  });

  test.each(Object.entries(EXPECTED))('%s is verbatim George Long', (key, expected) => {
    expect(PRACTICE_QUOTES[key].text).toBe(expected);
  });

  test('British spelling in Long is preserved, not Americanised', () => {
    // "tranquillity" (double-l) is Long's own spelling in 8.28.
    expect(PRACTICE_QUOTES['resistance-check'].text).toContain('tranquillity');
  });
});

describe('PRACTICE_QUOTES — provenance is declared, not merely absent-of-bad', () => {
  /**
   * DEBUG-339's structural fix. Without a translator field the guard could only
   * ban strings it had already seen go wrong; it could not assert provenance
   * positively. That gap is why Morgan (4.3) and Nicholas White (Enchiridion 1)
   * both shipped here undetected while three other suites watched other surfaces.
   */
  const PUBLIC_DOMAIN_BY_AUTHOR: Record<string, string[]> = {
    'Marcus Aurelius': ['George Long'],
    Epictetus: ['Elizabeth Carter'],
    Seneca: ['Richard Mott Gummere', 'Aubrey Stewart'],
  };

  test('every entry declares a translation', () => {
    for (const [key, quote] of Object.entries(PRACTICE_QUOTES)) {
      expect(`${key}:${(quote.translation ?? '').trim().length > 0}`).toBe(`${key}:true`);
    }
  });

  test('every translator is public domain AND correct for that author', () => {
    // Author-keyed rather than a flat allowlist: "George Long" is right for
    // Marcus and wrong for Epictetus, and a flat list cannot say so.
    for (const [key, quote] of Object.entries(PRACTICE_QUOTES)) {
      const allowed = PUBLIC_DOMAIN_BY_AUTHOR[quote.author] ?? [];
      expect(`${key}:${allowed.includes(quote.translation)}`).toBe(`${key}:true`);
    }
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

  test('no two entries share a locus', () => {
    // A duplicated citation means one of them was chosen to fit a paraphrase
    // rather than the other way round — the failure mode behind both the 8.36
    // mis-citation and the 8.33 gratitude compression.
    const sources = Object.values(PRACTICE_QUOTES).map((q) => q.source);
    expect(sources.length).toBe(new Set(sources).size);
  });
});

/**
 * DEBUG-344 — key-set agreement between the authored practices and this map.
 *
 * The defect this replaces: module 5 authored `loving-kindness`,
 * `mindful-listening` and `social-impact-reflection`, none had an entry here,
 * and usePracticeCompletion's `|| PRACTICE_QUOTES['breathing-space']` served all
 * three the Aware-Presence quote. Twelve authored practices, nine entries, and
 * nothing failed — the fallback converted a missing entry into a silent
 * misattribution, which is exactly the principle→practice error the navigation
 * contract suite exists to prevent on the featured card.
 *
 * Asserted in BOTH directions. Forward catches the DEBUG-344 bug (a practice
 * ships without a quote); reverse catches an orphaned or typo'd key, which would
 * otherwise sit here looking authoritative and never render.
 *
 * ids come from `module.practices[].id` ONLY — never a recursive `id` scan.
 * module-3 nests 13 sorting-scenario objects that also carry `id`, and sweeping
 * those in would make this guard permanently red.
 */
describe('PRACTICE_QUOTES — covers exactly the authored practices (DEBUG-344)', () => {
  const authoredIds = [module1, module2, module3, module4, module5]
    .flatMap((m) => ((m as { practices?: { id: string }[] }).practices ?? []).map((p) => p.id))
    .sort();
  const quoteKeys = Object.keys(PRACTICE_QUOTES).sort();

  test('the authored set is non-empty (guards the extractor itself)', () => {
    // Without this, a rename of `practices` would empty both sides and make the
    // two assertions below pass vacuously.
    expect(authoredIds.length).toBeGreaterThan(0);
  });

  test('every authored practice has a quote', () => {
    expect(authoredIds.filter((id) => !quoteKeys.includes(id))).toEqual([]);
  });

  test('every quote key is an authored practice', () => {
    expect(quoteKeys.filter((k) => !authoredIds.includes(k))).toEqual([]);
  });
});
