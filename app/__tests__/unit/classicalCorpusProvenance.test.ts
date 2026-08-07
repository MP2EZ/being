/**
 * Classical corpus provenance guard (DEBUG-352, PR-B)
 *
 * `app/assets/passages/*.json` is the repo's classical corpus, and
 * `practiceQuotes.test.ts` treats it as an AUTHORITY: it blesses any
 * PRACTICE_QUOTES entry whose citation has a counterpart there, via a
 * `corpusContains` substring check. That is only sound if the corpus itself is
 * what it claims to be — and it was not.
 *
 * Two entries declared a translator they were not:
 *   - `passages-5` Meditations 7.13 declared George Long. Its first sentence
 *     ("As the members of one body, so rational beings in their separate
 *     states...") is a rewrite; Long reads "Just as it is with the members in
 *     those bodies which are united in one...". It also read "thou still doest
 *     it merely" where Long has "barely".
 *   - `passages-3` "On Tranquility of Mind 13" declared Aubrey Stewart. Four of
 *     its distinctive phrases ("so much trouble", "what is our own and what is
 *     not", "interrupted by fortune", "against his expectation") return ZERO
 *     hits across Stewart's entire volume. Not Stewart. This one is not even in
 *     DEBUG-352's filed findings — it surfaced during the planning pass.
 * `passages-5` Meditations 2.1 additionally spliced out two of Long's sentences
 * with NO ellipsis and repunctuated ("busy-body", dropped commas), producing a
 * string no translator wrote. The same repunctuated string shipped as
 * `module-5`'s classicalQuote.
 *
 * WHY THE EXISTING SUITE MISSED ALL OF IT: `passagesContent.test.ts` asserts
 * only `translation.length > 0`. A declared translator was never checked
 * against a public-domain allowlist, and no text was ever pinned. So a false
 * "George Long" / "Aubrey Stewart" declaration sailed through a green suite —
 * and would have laundered non-Long text into PRACTICE_QUOTES the moment an
 * entry cited either locus. (Latent today: no PRACTICE_QUOTES entry cites 2.1
 * or 7.13, which `practiceQuotes.test.ts:238-243` documents deliberately and
 * names DEBUG-352 for.)
 *
 * CANONICAL DIGITIZATION — Project Gutenberg ebook #15877, "Thoughts of Marcus
 * Aurelius Antoninus", trans. George Long. This matters and is not pedantry:
 * Long exists in at least two public digitizations that DISAGREE on the exact
 * points above. PG #15877 reads "busybody" and "To act against one another,
 * then, is contrary to nature"; the MIT Internet Classics Archive Long reads
 * "busy-body" and drops both commas. The corpus was drawn from BOTH — it
 * matched MIT on 2.1 and PG on 7.29 — which makes "verbatim Long" unfalsifiable
 * until one is pinned. PG #15877 is pinned because it is the text DEBUG-352's
 * findings were written against and it carries Long's own bracketed apparatus,
 * so elisions stay visible. Long's bracketed glosses are omitted per this
 * corpus's existing convention (see 7.29, which drops Long's "[formal]").
 *
 * LOCATION: `app/__tests__/unit/` on purpose — the sibling provenance suites
 * under `app/src/features/<feature>/__tests__/` match none of CI's
 * `--testPathPattern` values, so they never run in CI or precommit.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const PASSAGES_DIR = resolve(__dirname, '../../assets/passages');

const PASSAGE_FILES = [
  'passages-1-aware-presence.json',
  'passages-2-radical-acceptance.json',
  'passages-3-sphere-sovereignty.json',
  'passages-4-virtuous-response.json',
  'passages-5-interconnected-living.json',
];

/**
 * Author-keyed public-domain translator allowlist. Mirrors the one
 * `moduleClassicalQuotes.test.ts` added for the module JSONs (DEBUG-343) —
 * deliberately a local copy, NOT a shared import: `practiceQuotes.test.ts:13-22`
 * evaluated hoisting these lists and rejected it, because the suites' extraction
 * scopes differ load-bearingly.
 */
const PUBLIC_DOMAIN_BY_AUTHOR: Readonly<Record<string, readonly string[]>> = {
  'Marcus Aurelius': ['George Long'],
  Epictetus: ['Elizabeth Carter'],
  Seneca: ['Richard Mott Gummere', 'Aubrey Stewart'],
};

interface Passage {
  id: string;
  citation: string;
  author: string;
  translation: string;
  text: string;
}

const loadPassages = (file: string): Passage[] => {
  const raw = readFileSync(join(PASSAGES_DIR, file), 'utf8');
  return (JSON.parse(raw).passages ?? []) as Passage[];
};

const allPassages = (): Array<Passage & { file: string }> =>
  PASSAGE_FILES.flatMap((file) =>
    loadPassages(file).map((p) => ({ ...p, file }))
  );

describe('classical corpus provenance (DEBUG-352)', () => {
  it('every passage file is readable and non-empty', () => {
    // Fail loudly if a file moves, rather than vacuously passing everything below.
    PASSAGE_FILES.forEach((file) => {
      expect(loadPassages(file).length).toBeGreaterThan(0);
    });
  });

  it('every declared translator is public domain for that author', () => {
    const offending = allPassages()
      .filter(({ author, translation }) => {
        const allowed = PUBLIC_DOMAIN_BY_AUTHOR[author];
        return !allowed || !allowed.includes(translation);
      })
      .map(({ file, id, author, translation }) => `${file}:${id} — ${author} / ${translation}`);

    expect(offending).toEqual([]);
  });

  it('every passage declares an author, translator, citation and text', () => {
    const incomplete = allPassages()
      .filter((p) => !p.author || !p.translation || !p.citation || !p.text?.trim())
      .map(({ file, id }) => `${file}:${id}`);

    expect(incomplete).toEqual([]);
  });

  /**
   * Exact pins for the loci this item repaired. A translator-allowlist check
   * alone cannot catch the original defect — those entries DID declare an
   * allowlisted translator, they just weren't that translator's words. Pinning
   * the opening clause is what makes a silent re-rewrite fail.
   */
  describe('repaired loci stay verbatim (PG #15877 Long / Stewart)', () => {
    const findPassage = (file: string, citation: string): Passage => {
      const p = loadPassages(file).find((x) => x.citation === citation);
      if (!p) throw new Error(`${citation} missing from ${file}`);
      return p;
    };

    it('Meditations 7.13 is Long, not the rewritten first sentence', () => {
      const p = findPassage('passages-5-interconnected-living.json', 'Meditations 7.13');
      expect(p.text).toContain(
        'Just as it is with the members in those bodies which are united in one'
      );
      expect(p.text).toContain('thou still doest it barely as a thing of propriety');
      // The rewrite this item removed must not come back.
      expect(p.text).not.toContain('As the members of one body, so rational beings');
      expect(p.text).not.toContain('doest it merely');
    });

    it('Meditations 2.1 is unspliced Long with PG #15877 punctuation', () => {
      const p = findPassage('passages-5-interconnected-living.json', 'Meditations 2.1');
      // The middle sentences that were silently elided (no ellipsis) — the
      // kinship / "nor hate him" conclusion is the doctrinally load-bearing part.
      expect(p.text).toContain('nor can I be angry with my kinsman, nor hate him');
      expect(p.text).toContain('For we are made for co-operation');
      expect(p.text).toContain('To act against one another, then, is contrary to nature');
      // MIT-digitization spellings/punctuation must not creep back in.
      expect(p.text).not.toContain('busy-body');
      expect(p.text).not.toContain('To act against one another then is');
    });

    it('On Tranquility of Mind 13 is actually Aubrey Stewart', () => {
      const p = findPassage('passages-3-sphere-sovereignty.json', 'On Tranquility of Mind 13');
      expect(p.translation).toBe('Aubrey Stewart');
      expect(p.text).toContain('I will set sail unless anything happens to prevent me');
      expect(p.text).toContain('I shall be praetor, if nothing hinders me');
      // 'befals' is Stewart's own spelling — do not silently modernise it.
      expect(p.text).toContain('befals');
      // The non-Stewart text this item replaced.
      expect(p.text).not.toContain('gives a mind so much trouble');
      expect(p.text).not.toContain('interrupted by fortune');
    });
  });

  /**
   * The Margaret Mead line ("Never doubt that a small group of thoughtful,
   * committed citizens...") is famously unverified — Mead's own Institute for
   * Intercultural Studies stated it could not be located in her published work.
   * Hedging it ("attributed to") still trades on her name for a line she cannot
   * be shown to have written, so it is removed outright, here and in module-5.
   */
  it('no unverifiable attribution ships in the corpus', () => {
    const hits = allPassages()
      .filter((p) => /Never doubt that a small group/i.test(`${p.text} ${p.citation}`))
      .map(({ file, id }) => `${file}:${id}`);

    expect(hits).toEqual([]);
  });
});
