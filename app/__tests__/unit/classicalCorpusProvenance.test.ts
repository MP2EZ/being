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
 * CANONICAL DIGITIZATION — Epictetus (FEAT-567). Wikisource's transcription of
 * "All the Works of Epictetus, Which Are Now Extant", trans. Elizabeth Carter,
 * 1759, from Internet Archive scan `allworksofepicte00epic`. Pinned for exactly
 * the reason Long was: the digitizations DISAGREE, and not only on orthography.
 * MIT's Internet Classics Archive text is credited to Carter but is a silently
 * MODERNISED revision by an unattributed hand — it reads "may be carried" at
 * Ench. 43 where the 1759 print reads "may be borne", and uses contractions
 * ("Don't") that cannot occur in a 1758/59 setting. FEAT-567 found all four
 * shipped Epictetus passages had been drawn from that modernised text while
 * declaring "Elizabeth Carter", which is the DEBUG-352 defect class exactly —
 * a real translator's name over another text — and it survived DEBUG-352
 * because that sweep pinned only the loci it had already repaired.
 *
 * TWO NORMALISATIONS ARE APPLIED TO THE PINNED TEXT, both recorded so they are
 * auditable rather than invisible:
 *   1. Long-s: the 1759 print sets `ſ`; the corpus uses `s`.
 *   2. The transcription emits a space before punctuation where the print
 *      italicises a proper noun ("Socrates ." -> "Socrates.").
 *
 * ONE LOCUS CORRECTION, likewise recorded rather than silently applied:
 * Ench. 8 in the pinned transcription reads "as you with; but with them" — a
 * long-s OCR error for "wiſh". The corpus carries the corrected reading and the
 * assertion below pins it, so the correction is falsifiable rather than folklore.
 * Do NOT "fix" the corpus back to the transcription's literal text.
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
  /**
   * AUTHOR BALANCE (FEAT-567, philosopher ruling).
   *
   * Marcus Aurelius is by far the easiest of the three to mine, so left to
   * convenience he dominates every principle — which is precisely what the parent
   * item's AC4 forbids. Measured before this change: Marcus 9/16 overall, and
   * `interconnected-living` 100% Marcus with zero Epictetus and zero Seneca.
   *
   * Shipped as a RATCHET, not a flat rule, and deliberately so: enforcing it
   * outright fails four of five principles today, and a gate that cannot go green
   * is the shape that trains people to bypass gates. So the existing violations are
   * DECLARED below and may not worsen; anything not declared must comply. The debt
   * is discharged by FEAT-569, which owns the content.
   *
   * Rules (a) and (c) apply only at 4+ passages: below that the ratios are too
   * coarse to be meaningful — a 3-passage principle cannot have a work supply
   * "half" of it in any useful sense.
   */
  describe('per-principle author balance (FEAT-567)', () => {
    const PRINCIPLE_FILES = [
      'passages-1-aware-presence.json',
      'passages-2-radical-acceptance.json',
      'passages-3-sphere-sovereignty.json',
      'passages-4-virtuous-response.json',
      'passages-5-interconnected-living.json',
    ];

    /** Declared, dischargeable debt — each entry is owed by FEAT-569. */
    const BALANCE_DEBT: Readonly<Record<string, readonly string[]>> = {
      'passages-1-aware-presence.json': ['Seneca'],
      'passages-2-radical-acceptance.json': ['Seneca'],
      'passages-4-virtuous-response.json': ['Epictetus'],
      'passages-5-interconnected-living.json': ['Epictetus', 'Seneca'],
    };

    const REQUIRED = ['Epictetus', 'Seneca'] as const;

    const counts = (file: string) => {
      const ps = loadPassages(file);
      const byAuthor: Record<string, number> = {};
      const byWork: Record<string, number> = {};
      for (const x of ps) {
        byAuthor[x.author] = (byAuthor[x.author] ?? 0) + 1;
        byWork[x.work] = (byWork[x.work] ?? 0) + 1;
      }
      return { total: ps.length, byAuthor, byWork };
    };

    it.each(PRINCIPLE_FILES)('%s satisfies the rule, or its gap is declared', (file) => {
      const { total, byAuthor, byWork } = counts(file);
      const declared = BALANCE_DEBT[file] ?? [];

      // (b) every principle carries at least one Epictetus and one Seneca —
      //     unless that author is a declared, still-outstanding debt.
      for (const author of REQUIRED) {
        if (declared.includes(author)) continue;
        expect({ file, author, have: byAuthor[author] ?? 0 }).toEqual({
          file,
          author,
          have: expect.any(Number),
        });
        expect(byAuthor[author] ?? 0).toBeGreaterThan(0);
      }

      if (total >= 4) {
        // (a) Marcus may not exceed half.
        expect(byAuthor['Marcus Aurelius'] ?? 0).toBeLessThanOrEqual(Math.floor(total / 2));
        // (c) no single work supplies more than half.
        for (const [work, n] of Object.entries(byWork)) {
          expect({ work, n }).toEqual({ work, n: expect.any(Number) });
          expect(n).toBeLessThanOrEqual(Math.floor(total / 2));
        }
      }
    });

    it('the declared debt is real and not stale', () => {
      // A principle that has since been balanced must be REMOVED from the debt
      // list. A stale entry silently exempts a principle that no longer needs it,
      // which is how a ratchet quietly stops ratcheting.
      for (const [file, authors] of Object.entries(BALANCE_DEBT)) {
        const { byAuthor } = counts(file);
        for (const author of authors) {
          expect({ file, author, present: (byAuthor[author] ?? 0) > 0 }).toEqual({
            file,
            author,
            present: false,
          });
        }
      }
    });

    it('the debt may not grow — no undeclared principle is unbalanced', () => {
      const undeclared = PRINCIPLE_FILES.filter((f) => !(f in BALANCE_DEBT));
      // Non-vacuity: if every principle were declared, the it.each above would
      // assert nothing at all and this suite would be theatre.
      expect(undeclared.length).toBeGreaterThan(0);
      for (const f of undeclared) {
        const { byAuthor } = counts(f);
        for (const author of REQUIRED) expect(byAuthor[author] ?? 0).toBeGreaterThan(0);
      }
    });
  });

  describe('Epictetus is 1759 Carter, not the modernised revision (FEAT-567)', () => {
    const findById = (file: string, id: string): Passage => {
      const p = loadPassages(file).find((x) => x.id === id);
      if (!p) throw new Error(`${id} missing from ${file}`);
      return p;
    };

    // Positive pins: an opening clause that ONLY the 1759 setting produces.
    it.each([
      ['passages-3-sphere-sovereignty.json', 'epictetus-enchiridion-1', 'Of Things, some are in our Power, and others not.'],
      ['passages-3-sphere-sovereignty.json', 'epictetus-enchiridion-2', 'Remember that Desire promises the Attainment'],
      ['passages-1-aware-presence.json', 'epictetus-enchiridion-5', 'Men are disturbed, not by Things, but by the Principles and Notions'],
      ['passages-2-radical-acceptance.json', 'epictetus-enchiridion-8', 'Require not Things to happen as you wish'],
    ])('%s / %s opens with the 1759 Carter wording', (file, id, opening) => {
      expect(findById(file, id).text).toContain(opening);
    });

    // Negative pins: the modernised readings that WERE shipped. A name check
    // alone cannot catch this class — those entries did declare an allowlisted
    // translator, they simply were not that translator's words.
    it('the modernised revision does not come back', () => {
      const all = [
        ...loadPassages('passages-1-aware-presence.json'),
        ...loadPassages('passages-2-radical-acceptance.json'),
        ...loadPassages('passages-3-sphere-sovereignty.json'),
      ].filter((x) => x.author === 'Epictetus');

      for (const p of all) {
        // Contractions are impossible in a 1758/59 setting and are the cheapest
        // single tell that a modernised text has been substituted.
        expect(p.text).not.toMatch(/\b(don't|can't|won't|isn't|doesn't)\b/i);
      }

      const byId = Object.fromEntries(all.map((x) => [x.id, x.text]));
      expect(byId['epictetus-enchiridion-1']).not.toContain('Some things are in our control');
      expect(byId['epictetus-enchiridion-5']).not.toContain('Someone just starting instruction');
      expect(byId['epictetus-enchiridion-8']).not.toContain('demand that things happen');
    });

    it('Ench. 8 carries the RECORDED locus correction, not the OCR defect', () => {
      // The pinned transcription reads "as you with; but with them" — a long-s
      // misread of "wiſh". The corpus carries the corrected reading. Pinned in
      // both directions so neither the defect nor a silent re-edit can land.
      const t = findById('passages-2-radical-acceptance.json', 'epictetus-enchiridion-8').text;
      expect(t).toContain('as you wish; but wish them to happen as they do happen');
      expect(t).not.toContain('as you with');
    });

    it('the matcher still fires (DEBUG-390)', () => {
      // Prove these assertions can go red: run the same predicate over a literal
      // known-bad string rather than over corpus state, which would make the
      // control a second symptom of the same failure.
      const modernised = "Don't demand that things happen as you wish";
      expect(modernised).toMatch(/\b(don't|can't|won't|isn't|doesn't)\b/i);
      expect(modernised).toContain('demand that things happen');
    });
  });

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
   * A passage can be verbatim, correctly attributed, public domain — and still
   * ship a reading its own principle is defined against. The provenance pins
   * above cannot see that class: they assert on `text`, and the defect lives in
   * `context`, our editorial frame. `radical-acceptance` carried it three times
   * over, every note assenting and none pivoting, so the file taught the Lazy
   * Argument by omission: if it was settled, deliberation is theatre.
   *
   * Prose alone does not close that — the next editor reverts it and nothing
   * goes red. These are the ratchet. Anchors are deliberately SHORT so ordinary
   * rewording survives while a semantic reversion does not, and each trap is
   * pinned in BOTH directions: the corrective must be present AND the reading it
   * replaced must stay gone.
   */
  describe('doctrinal traps stay closed (FEAT-569 AC5)', () => {
    const contextOf = (file: string, id: string): string => {
      const p = loadPassages(file).find((x) => x.id === id);
      if (!p) throw new Error(`${id} missing from ${file}`);
      // An absent note is the defect's original form, not a neutral state.
      if (!p.context) throw new Error(`${id} has no context note`);
      return p.context;
    };

    const RADICAL = 'passages-2-radical-acceptance.json';

    it('every radical-acceptance passage carries a note at all', () => {
      const missing = loadPassages(RADICAL)
        .filter((p) => !p.context?.trim())
        .map((p) => p.id);
      expect(missing).toEqual([]);
    });

    // Positive pins: the clause carrying the doctrinal work, not the whole note.
    it.each([
      // Assent is from inside the causal order, not from its sidelines.
      [RADICAL, 'marcus-meditations-4-23', 'from inside the order'],
      // The maxim governs desire and aversion — not action.
      [RADICAL, 'epictetus-enchiridion-8', 'desire and aversion'],
      // A choice is one of the causes, so fixity is not a reason for inaction.
      [RADICAL, 'marcus-meditations-10-6', 'one of those causes'],
    ])('%s / %s keeps its action pivot', (file, id, anchor) => {
      expect(contextOf(file, id)).toContain(anchor);
    });

    // Negative pins: the exact framings that were live before FEAT-569. A
    // presence check alone cannot catch this class — all three DID have notes;
    // they simply restated the trap instead of pivoting away from it.
    it('the assent-only framings do not come back', () => {
      expect(contextOf(RADICAL, 'marcus-meditations-4-23')).not.toContain(
        'the classic expression of the Stoic acceptance of fate',
      );
      expect(contextOf(RADICAL, 'epictetus-enchiridion-8')).not.toContain(
        'stating non-resistance to events directly',
      );
      expect(contextOf(RADICAL, 'marcus-meditations-10-6')).not.toContain(
        'a ground for welcoming what comes',
      );
    });

    // The corrective may not overcorrect into denying what the passage says.
    // Meditations 10.6 DOES assert causal fixity; a note implying outcomes are
    // ours breaks sphere-sovereignty while purporting to fix this principle.
    it('no note claims outcomes are within our control', () => {
      for (const p of loadPassages(RADICAL)) {
        expect(p.context ?? '').not.toMatch(/\b(you can control|within your control|up to you to decide what happens)\b/i);
      }
    });

    it('the matchers still fire (DEBUG-390)', () => {
      // Run each predicate over literal known-bad strings rather than over
      // corpus state — a control drawn from the corpus is a second symptom of
      // the same failure, not an independent check.
      const assentOnly = 'One of the Handbook\'s shortest maxims, stating non-resistance to events directly.';
      expect(assentOnly).toContain('stating non-resistance to events directly');
      expect(assentOnly).not.toContain('desire and aversion');

      const overcorrected = 'Marcus reminds us that outcomes are within your control.';
      expect(overcorrected).toMatch(/\b(you can control|within your control|up to you to decide what happens)\b/i);

      // And prove the notes being read are real prose, not empty strings that
      // would satisfy every not.toContain above vacuously.
      for (const id of ['marcus-meditations-4-23', 'epictetus-enchiridion-8', 'marcus-meditations-10-6']) {
        expect(contextOf(RADICAL, id).length).toBeGreaterThan(40);
      }
    });

    // The frame is ours; the passage is the source. A note that outgrows what it
    // frames has stopped framing and started competing.
    //
    // Scoped to this principle rather than the corpus, and the exception is
    // instructive: corpus-wide, the sole violator is seneca-letters-13, whose
    // note exceeds its text only because that `text` is a truncated paraphrase
    // rather than the Gummere it declares. The real Gummere is longer and clears
    // the rule, so DEBUG-582 fixes this by fixing the provenance defect — widen
    // this to allPassages() there rather than exempting the id here.
    it('no radical-acceptance note runs longer than the passage it frames', () => {
      for (const p of loadPassages(RADICAL)) {
        if (!p.context) continue;
        expect(p.context.length).toBeLessThanOrEqual(p.text.length);
      }
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
