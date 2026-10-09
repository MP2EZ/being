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
 * CANONICAL DIGITIZATION — Seneca, *Letters* (DEBUG-582). Wikisource's
 * transcription of "Moral letters to Lucilius", trans. Richard Mott Gummere,
 * Loeb Classical Library, backed by Internet Archive scans
 * `adluciliumepistu01seneuoft` (Vol. I, 1917, Epistles 1-65) and
 * `adluciliumepistu03seneuoft` (Vol. III, 1925, Epistles 93-124). TWO
 * identifiers, not one, and that is load-bearing: the corpus's two Seneca
 * *Letters* loci fall in DIFFERENT Loeb volumes (13.4 in Vol. I, 107.11 in
 * Vol. III), so a single-volume pin would leave 107.11 unpinned while appearing
 * to cover it. FEAT-663's 47.10 and 48.2-3 sit in Vol. I and its 95.51-52 in
 * Vol. III, under the same two-volume pin. Public domain by PRE-1929 US
 * PUBLICATION — and that is the SOLE
 * basis, not the safer of two. Life+70 is the wrong legal theory outright for
 * a pre-1978 published work: the US term for works published 1923-1977 runs
 * from publication (+ renewal, 95 years max), never from the author's life,
 * so Gummere's 1955 death is simply irrelevant here and must not reappear as
 * a backup rationale (corrected DEBUG-585; DEBUG-582 called it merely the
 * weaker footing).
 *
 * The work KEY that carries this pin is `Moral Letters to Lucilius` — the title
 * the pinned Wikisource transcription itself runs under. Title-cased in the
 * union because it names the work; sentence-case here because this docblock
 * quotes the source page verbatim. DEBUG-585 renamed it from `Letters from a
 * Stoic`, which is Robin Campbell's in-copyright 1969 Penguin selection.
 *
 * Pinned because Seneca was entirely unpinned until DEBUG-582: the allowlist
 * below carried Gummere's NAME, which is why a paraphrase shipping under it
 * sailed through. `seneca-letters-13` declared Gummere while its `text` was a
 * popular condensation ("We are more often frightened than hurt...") — and its
 * own `fullText` carried the genuine Gummere alongside, so the record held the
 * real translation and the paraphrase side by side, with the paraphrase in the
 * field that is displayed and attributed. Same defect class as DEBUG-352 and
 * FEAT-567, surviving for the same reason: those sweeps pinned only the loci
 * they had already repaired, so an unrepaired locus stayed invisible.
 *
 * A THIRD Gummere locus lives outside this corpus and was swept in the same pass:
 * `app/assets/modules/module-1-aware-presence.json`'s classicalQuote, "Letters
 * from a Stoic, 2.1". Collated against the same pinned digitization and CONFIRMED
 * verbatim — no repair needed. It is not pinned here because this suite reads
 * `PASSAGES_DIR` only, and the suite that does read the module JSONs
 * (`src/features/learn/__tests__/moduleClassicalQuotes.test.ts`) matches none of
 * CI's `--testPathPattern` values, so a pin there would never run. Recorded here
 * instead so the confirmation is at least auditable.
 *
 * CANONICAL DIGITIZATION — Seneca, dialogues (FEAT-660). Project Gutenberg ebook
 * #64576, "Minor Dialogues, Together With the Dialogue on Clemency", trans.
 * Aubrey Stewart, London: George Bell and Sons, 1889. Stewart was allowlisted
 * with NO pinned text until here — the DEBUG-582 condition exactly, a name with
 * nothing to check it against. The ebook itself never says "Bohn": the Bohn's
 * Classical Library identity rests on the title pages of Internet Archive scans
 * `minordialoguesto00seneuoft` and `cu31924026554281`, which also settle print
 * readings where a digitization might silently correct one. Public domain by
 * PRE-1929 US PUBLICATION, the sole basis, for the reason given for Gummere.
 * Stewart prints chapter numerals only, so a finer locator ("§4") is checked
 * against the Latin, never against this text. Work keys name the work, not
 * Stewart's titles: `On Tranquility` is his "Of Peace of Mind", `On Anger` his
 * "Of Anger" (Book II is PG's "Fourth Book of the Dialogues"), `On the Shortness
 * of Life` his "Of the Shortness of Life".
 *
 * EIGHT NORMALISATIONS ARE APPLIED TO THE PINNED TEXT, all recorded so they are
 * auditable rather than invisible:
 *   1. Long-s: the 1759 print sets `ſ`; the corpus uses `s`.
 *   2. The transcription emits a space before punctuation where the print
 *      italicises a proper noun ("Socrates ." -> "Socrates.").
 *   3. Verse lineation (DEBUG-582): Gummere sets the Cleanthes prayer at
 *      `Letters 107.11` as seven verse lines; the corpus flattens it to prose,
 *      which lowercases two line-initial capitals ("In sin" -> "in sin",
 *      "In noble" -> "in noble") while "Fate" keeps its capital as a
 *      personification rather than a line-initial. Every word and mark is
 *      otherwise Gummere's. AC4's sweep CONFIRMED that locus rather than
 *      repairing it — it is pinned below anyway, because an unpinned
 *      confirmation is exactly the condition that let seneca-letters-13 survive.
 *   4. Carter's apparatus (FEAT-581): her section numerals ("§. 5.") are dropped
 *      where a span crosses one, and her bracketed supplements ("[of Action]")
 *      are dropped exactly as Long's glosses are. Both are the translator's
 *      editorial layer, not the text. Dialogue turns set as separate paragraphs
 *      are joined with a single space, as prose paragraphs already were.
 *   5. Digitization apparatus (FEAT-660): PG page markers ("{80}") and footnote
 *      anchors ("[3]"), Wikisource zero-width page-join characters (U+200B) and
 *      Gummere's inline section numerals are dropped; hard line wraps and double
 *      spaces collapse to one space. Already live, unrecorded, at Tranquility 13
 *      ("{279}" dropped), which is why that locus is now pinned at both ends.
 *   6. Typographic quotes and apostrophes become ASCII ("man’s" -> "man's").
 *      Applied corpus-wide since the first passage; recorded here at last.
 *   7. Long's double hyphen (FEAT-661): PG #15877's plain text sets a dash as "--"
 *      ("bitter--Throw it away"); the corpus sets the unspaced em dash "—" that
 *      the same ebook's HTML edition prints.
 *   8. Carter's display capitals (FEAT-662): a chapter opening set as a drop
 *      initial plus a word in capitals ("EVERY Habit", Disc. 2.18) is sentence-
 *      cased ("Every Habit"), as every other Carter opening in the corpus already
 *      reads. It is the 1759 printing's typography, not Carter's spelling.
 *
 * PRINT READINGS ARE KEPT, never modernised: Stewart's "befals", and "temping us
 * to yawn" at On Anger 2.4, which is the 1889 print's own reading (IA
 * `minordialoguesto00seneuoft`), not a transcription slip.
 *
 * THREE LOCUS CORRECTIONS, likewise recorded rather than silently applied:
 *   - Ench. 8 in the pinned transcription reads "as you with; but with them" — a
 *     long-s OCR error for "wiſh".
 *   - Disc. 4.12 in the pinned transcription reads "still more advantageous but,"
 *     where the 1759 print (IA `allworksofepicte00epic`) sets "advantageous: but,"
 *     — a dropped colon (FEAT-660).
 *   - Ench. 43 in the pinned transcription reads "brought up with you and thus",
 *     where the 1759 print sets "up with you: and thus" — a colon dropped at the
 *     page join (FEAT-663).
 * The corpus carries the corrected readings and the assertions below pin each in
 * both directions, so the correction is falsifiable rather than folklore. Do NOT
 * "fix" the corpus back to the transcription's literal text.
 *
 * LOCATION: `app/__tests__/unit/` on purpose — the sibling provenance suites
 * under `app/src/features/<feature>/__tests__/` match none of CI's
 * `--testPathPattern` values, so they never run in CI or precommit.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const PASSAGES_DIR = resolve(__dirname, '../../assets/passages');
const MODULES_DIR = resolve(__dirname, '../../assets/modules');

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
  /** Closed-union work key. Metadata only — no surface renders it (DEBUG-585). */
  work: string;
  translation: string;
  text: string;
  /** Optional full quotation; `text` is the excerpt shown before the disclosure. */
  fullText?: string;
  /** Our editorial frame. Never the translator's words. */
  context?: string;
}

const loadPassages = (file: string): Passage[] => {
  const raw = readFileSync(join(PASSAGES_DIR, file), 'utf8');
  return (JSON.parse(raw).passages ?? []) as Passage[];
};

const allPassages = (): Array<Passage & { file: string }> =>
  PASSAGE_FILES.flatMap((file) =>
    loadPassages(file).map((p) => ({ ...p, file }))
  );

/**
 * Module `classicalQuote` citations (DEBUG-585). Read HERE, not in
 * `moduleClassicalQuotes.test.ts` where the module guards otherwise live:
 * that suite sits under `app/src/features/learn/__tests__/`, matches none of
 * CI's `--testPathPattern` values, and is listed in
 * `scripts/ci-uncovered-tests.json` as deliberately ungated — so a pin placed
 * there runs on nobody's PR. Same reasoning that put this whole file under
 * `app/__tests__/unit/`.
 */
const MODULE_FILES = [
  'module-1-aware-presence.json',
  'module-2-radical-acceptance.json',
  'module-3-sphere-sovereignty.json',
  'module-4-virtuous-response.json',
  'module-5-interconnected-living.json',
];

const moduleQuoteSources = (): Array<{ file: string; source: string }> =>
  MODULE_FILES.flatMap((file) => {
    const raw = JSON.parse(readFileSync(join(MODULES_DIR, file), 'utf8'));
    const source = raw?.classicalQuote?.source;
    return typeof source === 'string' ? [{ file, source }] : [];
  });

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
   * THE STRUCTURAL TELL (DEBUG-582). Where a record carries both fields, `text`
   * is the excerpt and `fullText` the whole quotation — so `text` must be a
   * verbatim SPAN of `fullText`. An excerpt that is not a substring of its own
   * full text is by construction not verbatim in at least one of the two, and
   * that is exactly the shape DEBUG-582 found: `seneca-letters-13` shipped a
   * popular condensation in `text` while its own `fullText` carried the real
   * Gummere, side by side under one attributed translator.
   *
   * This is the general form, and it is why the repair is not just one more
   * locus pin: a pin covers the locus it names, whereas this closes the class
   * for every teaser the corpus ever grows. `library.ts`'s doc contract carries
   * the same rule in prose for authors; this is the mechanical half.
   */
  it('an excerpt is a verbatim span of its own full text', () => {
    const drifted = allPassages()
      .filter((p) => p.fullText && !p.fullText.includes(p.text))
      .map(({ file, id }) => `${file}:${id}`);

    expect(drifted).toEqual([]);
  });

  it('the excerpt-span rule is not vacuous — some passage carries a fullText', () => {
    // The rule above is satisfied by an empty set, so it would pass unchanged if
    // `fullText` were renamed or dropped corpus-wide. Assert the population it
    // guards is non-empty, or the guard silently stops guarding.
    const withFullText = allPassages().filter((p) => p.fullText);
    expect(withFullText.length).toBeGreaterThan(0);
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
   * is discharged by FEAT-581's per-principle slices, which own the content —
   * FEAT-569 was scoped down to framing and moved no count.
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

    /**
     * Declared, dischargeable debt — each entry is owed by the FEAT-581 slice named.
     * Empty since FEAT-663 discharged the last entry (interconnected-living's
     * Epictetus and Seneca). Kept as the ledger a future debt lands in.
     */
    const BALANCE_DEBT: Readonly<Record<string, readonly string[]>> = {};

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
      // The header's own discriminator: the modernised revision reads "may be carried".
      ['passages-5-interconnected-living.json', 'epictetus-enchiridion-43', 'Every Thing hath two Handles; the one, by which it may be borne'],
    ])('%s / %s opens with the 1759 Carter wording', (file, id, opening) => {
      expect(findById(file, id).text).toContain(opening);
    });

    // Negative pins: the modernised readings that WERE shipped. A name check
    // alone cannot catch this class — those entries did declare an allowlisted
    // translator, they simply were not that translator's words.
    it('the modernised revision does not come back', () => {
      // Every Epictetus passage in the corpus, not a hand-listed set of files: the
      // list once covered files 1-3, so passages-4's first Epictetus (FEAT-662) would
      // have sat outside the Carter-not-modernised gate.
      const all = allPassages().filter((x) => x.author === 'Epictetus');
      expect(all.length).toBeGreaterThanOrEqual(14);

      for (const p of all) {
        // Contractions are impossible in a 1758/59 setting and are the cheapest
        // single tell that a modernised text has been substituted.
        expect(p.text).not.toMatch(/\b(don't|can't|won't|isn't|doesn't)\b/i);
      }

      const byId = Object.fromEntries(all.map((x) => [x.id, x.text]));
      expect(byId['epictetus-enchiridion-1']).not.toContain('Some things are in our control');
      expect(byId['epictetus-enchiridion-5']).not.toContain('Someone just starting instruction');
      expect(byId['epictetus-enchiridion-8']).not.toContain('demand that things happen');
      expect(byId['epictetus-enchiridion-43']).toContain('by which it may be borne');
      expect(byId['epictetus-enchiridion-43']).not.toContain('may be carried');
    });

    it('Ench. 43 carries the RECORDED colon correction, not the transcription slip', () => {
      // The pinned transcription drops the print's colon at a page join.
      const t = findById('passages-5-interconnected-living.json', 'epictetus-enchiridion-43').text;
      expect(t).toContain('that he was brought up with you: and thus you will lay hold on it');
      expect(t).not.toContain('up with you and thus');
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

  describe('repaired loci stay verbatim (PG #15877 Long / Stewart / Gummere Loeb)', () => {
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
      // Both ends, now that PG #64576 is pinned (FEAT-660): collated byte-exact
      // against the digitization under normalisations 5 and 6.
      expect(p.text.startsWith('I will set sail unless anything happens to prevent me')).toBe(true);
      expect(p.text.endsWith('less severely if he has not been at all events confident of success.')).toBe(true);
      expect(p.text).toContain('I shall be praetor, if nothing hinders me');
      // 'befals' is Stewart's own spelling — do not silently modernise it.
      expect(p.text).toContain('befals');
      // The non-Stewart text this item replaced.
      expect(p.text).not.toContain('gives a mind so much trouble');
      expect(p.text).not.toContain('interrupted by fortune');
    });

    it('Letters 13.4 is Gummere, not the popular condensation', () => {
      const p = findPassage('passages-4-virtuous-response.json', 'Letters 13.4');
      expect(p.translation).toBe('Richard Mott Gummere');
      // Gummere's own wording. "likely to frighten us than there are to crush us"
      // is idiosyncratic enough that no paraphraser reproduces it independently.
      expect(p.text).toContain('There are more things, Lucilius, likely to frighten us');
      expect(p.text).toContain('we suffer more often in imagination than in reality');
      // Seneca disavowing the hard-Stoic register in his own voice. This clause is
      // on the EXCERPT surface deliberately (DEBUG-582): `FromTheSourceSection`
      // renders `text` and never `fullText`, so behind the disclosure it reaches
      // no reader on that surface at all.
      expect(p.text).toContain('not speaking with you in the Stoic strain');
      // The unattributed condensation this item removed must not come back.
      expect(p.text).not.toContain('We are more often frightened than hurt');
      expect(p.text).not.toContain('suffer more from imagination');
    });

    it('Letters 107.11 is Gummere, confirmed not repaired', () => {
      // AC4's sweep found this locus already verbatim — every word, comma and
      // semicolon is Gummere's, with only the verse lineation flattened (see the
      // normalisation recorded in this file's header). It is pinned ANYWAY:
      // an unpinned confirmation is precisely the condition that let the
      // seneca-letters-13 defect survive FEAT-567's sweep, which pinned only the
      // loci it had already repaired.
      const p = findPassage('passages-4-virtuous-response.json', 'Letters 107.11');
      expect(p.translation).toBe('Richard Mott Gummere');
      expect(p.text).toContain('Lead me, O Master of the lofty heavens');
      expect(p.text).toContain('I shall not falter, but obey with speed');
      expect(p.text).toContain('the willing soul Fate leads, but the unwilling drags along');
    });
  });

  /**
   * FEAT-581 additions, pinned at admission rather than after a defect — every
   * locus above was pinned only once it had been caught shipping the wrong text.
   * Each span was extracted programmatically from the pinned digitization, not
   * retyped, and is pinned at BOTH ends: the opening is what the list shows, the
   * close is where a span boundary drifts when a later edit "tidies" it — and the
   * boundaries here were drawn by `crisis`, so drift is not cosmetic.
   */
  describe('FEAT-581 loci are verbatim at both ends (sphere-sovereignty)', () => {
    const SOVEREIGNTY = 'passages-3-sphere-sovereignty.json';
    const byId = (id: string): Passage => {
      const p = loadPassages(SOVEREIGNTY).find((x) => x.id === id);
      if (!p) throw new Error(`${id} missing from ${SOVEREIGNTY}`);
      return p;
    };

    it.each([
      [
        'epictetus-discourses-1-1',
        'Elizabeth Carter',
        'But now, when it is in our Power to take Care of one Thing',
        // Ends two exchanges before the Lateranus execution (crisis boundary).
        'To make the best of what is in our Power, and take the rest as it naturally happens.',
      ],
      [
        'epictetus-discourses-2-5',
        'Elizabeth Carter',
        'The Materials of Action are indifferent: but the Use of them is not indifferent.',
        // Runs past section 1 on purpose — section 1 alone ends in the withdrawal
        // trap — and stops before the voyage (drowning) and the ball game (poison).
        'because the Materials themselves are indifferent.',
      ],
      [
        'epictetus-discourses-2-13',
        'Elizabeth Carter',
        'When I see any one solicitous, I say, What doth this Man mean?',
        // Stops well before "hath Power to kill me" (crisis boundary).
        'In short, where his Skill lies, there is his Courage.',
      ],
      [
        'marcus-meditations-6-50',
        'George Long',
        'Let us try to persuade them. But act even against their will',
        // Must end here: Long's next sentence turns on a bracketed "[not]", and
        // this corpus drops Long's brackets, which would reverse its meaning.
        'thou didst not desire to do impossibilities.',
      ],
      [
        'marcus-meditations-8-8',
        'George Long',
        'Thou hast not leisure to read. But thou hast leisure to check arrogance',
        'not to be vexed at stupid and ungrateful people, nay even to care for them.',
      ],
    ])('%s is %s, opening and close intact', (id, translator, opening, close) => {
      const p = byId(id);
      expect(p.translation).toBe(translator);
      expect(p.text.startsWith(opening)).toBe(true);
      expect(p.text.endsWith(close)).toBe(true);
    });

    it('Carter section numerals and bracketed supplements are dropped, not transcribed', () => {
      // Normalisation 4 in this file's header. A span crossing a section break
      // (Disc. 1.1 at section 5, Disc. 2.5 at section 2) must not carry "§".
      expect(byId('epictetus-discourses-1-1').text).not.toMatch(/§/);
      expect(byId('epictetus-discourses-2-5').text).not.toMatch(/§|\[of Action\]/);
      expect(byId('epictetus-discourses-2-5').text).toContain('because the Use of the Materials is not indifferent');
    });
  });

  describe('FEAT-581 loci are verbatim at both ends (aware-presence)', () => {
    const AWARE = 'passages-1-aware-presence.json';
    const byId = (id: string): Passage => {
      const p = loadPassages(AWARE).find((x) => x.id === id);
      if (!p) throw new Error(`${id} missing from ${AWARE}`);
      return p;
    };

    it.each([
      [
        'seneca-letters-5',
        'Richard Mott Gummere',
        'Beasts avoid the dangers which they see',
        // 5.9 alone (crisis): 5.8's "both these ills" leans on 5.7's banned maxim.
        'The present alone can make no man wretched.',
      ],
      [
        'seneca-letters-57',
        'Richard Mott Gummere',
        'The gloom, however, furnished me with some food for thought',
        // 57.3 alone (crisis): 57.4 carries the precipice, 57.5 the blood.
        'Even such a man\'s mind will be smitten with a thrill and he will change colour.',
      ],
      [
        'seneca-on-anger-2-4',
        'Aubrey Stewart',
        'Furthermore, that you may know in what manner passions begin',
        'not if it be its duty, but whether or no.',
      ],
      [
        'seneca-on-the-shortness-of-life-9',
        'Aubrey Stewart',
        'They live laboriously, in order that they may live better',
        // Stops before the Virgil verse, old age and the journey's end.
        'everything future is uncertain: live now straightway.',
      ],
      [
        'epictetus-discourses-4-12',
        'Elizabeth Carter',
        'When you let go your Attention for a little while',
        // Stops before "no longer in your Power to call it back" (crisis).
        'For there is no Part of Life exempted, to which Attention doth not extend.',
      ],
    ])('%s is %s, opening and close intact', (id, translator, opening, close) => {
      const p = byId(id);
      expect(p.translation).toBe(translator);
      expect(p.text.startsWith(opening)).toBe(true);
      expect(p.text.endsWith(close)).toBe(true);
    });

    it('On Anger 2.4 ships the whole chapter behind the excerpt, with the print reading kept', () => {
      const p = byId('seneca-on-anger-2-4');
      // The excerpt ends on "already beyond our control"; only the full chapter
      // resolves it ("brought to an end by a deliberate mental act").
      expect(p.fullText?.endsWith('brought to an end by a deliberate mental act.')).toBe(true);
      expect(p.fullText).toContain('yawns temping us to yawn');
      expect(p.fullText).not.toContain('tempting');
    });

    it('Disc. 4.12 carries the RECORDED colon correction, not the transcription slip', () => {
      const t = byId('epictetus-discourses-4-12').text;
      expect(t).toContain('still more advantageous: but, if it be not advantageous');
      expect(t).not.toContain('advantageous but,');
    });

    it('digitization apparatus and typographic quotes are dropped (normalisations 5 and 6)', () => {
      for (const p of loadPassages(AWARE)) {
        const rendered = `${p.text} ${p.fullText ?? ''}`;
        expect({ id: p.id, residue: rendered.match(/[​‘’“”§]|\{\d+\}|\[\d+\]| {2}/g) }).toEqual({
          id: p.id,
          residue: null,
        });
      }
      // DEBUG-390: the residue matcher fires on each apparatus form it names.
      for (const bad of ['a {80} b', 'yawn:[3] we', 'when ​we', 'man’s', '§. 1.', 'two  spaces']) {
        expect(bad).toMatch(/[​‘’“”§]|\{\d+\}|\[\d+\]| {2}/);
      }
    });
  });

  describe('FEAT-581 loci are verbatim at both ends (radical-acceptance)', () => {
    const RADICAL_FILE = 'passages-2-radical-acceptance.json';
    const byId = (id: string): Passage => {
      const p = loadPassages(RADICAL_FILE).find((x) => x.id === id);
      if (!p) throw new Error(`${id} missing from ${RADICAL_FILE}`);
      return p;
    };

    it.each([
      [
        'marcus-meditations-4-49',
        'George Long',
        'Be like the promontory against which the waves continually break',
        // Cut at the virtue question (crisis): the section's last sentence calls the
        // event no misfortune, and 4.50 follows with "contempt of death".
        'by the presence of which man\'s nature obtains all that is its own?',
      ],
      [
        'marcus-meditations-8-50',
        'George Long',
        'A cucumber is bitter\u2014Throw it away.',
        // Stops before nature taking back what "appears to decay and to be useless".
        'shavings and cuttings from the things which they make.',
      ],
      [
        'seneca-letters-16',
        'Richard Mott Gummere',
        'Whether the truth, Lucilius, lies in one or in all of these views, we must be philosophers',
        'she will teach us to follow God and endure Chance.',
      ],
      [
        'seneca-on-tranquility-10',
        'Aubrey Stewart',
        'Call good sense to your aid against difficulties',
        'press less severely upon one who bears them skilfully.',
      ],
      [
        'seneca-letters-63',
        'Richard Mott Gummere',
        'I am grieved to hear that your friend Flaccus is dead',
        // Whole 63.1, ending before 63.2's one-day quota (crisis).
        'We may weep, but we must not wail.',
      ],
    ])('%s is %s, opening and close intact', (id, translator, opening, close) => {
      const p = byId(id);
      expect(p.translation).toBe(translator);
      expect(p.text.startsWith(opening)).toBe(true);
      expect(p.text.endsWith(close)).toBe(true);
    });

    it('Long\'s double hyphen is set as an em dash (normalisation 7)', () => {
      const t = byId('marcus-meditations-8-50').text;
      expect(t).toContain('bitter\u2014Throw it away.\u2014There are briers');
      expect(t).not.toContain('--');
    });

    it('Letters 16 carries the objection only alongside its answer', () => {
      const p = byId('seneca-letters-16');
      // 16.4 states the fixity objection; 16.5 answers it. The full text must end
      // with the excerpt, so the objection can never render without the reply.
      expect(p.fullText?.startsWith('Perhaps someone will say')).toBe(true);
      expect(p.fullText?.endsWith(p.text)).toBe(true);
    });

    it('Meditations 10.6 is retired', () => {
      expect(loadPassages(RADICAL_FILE).some((p) => p.id === 'marcus-meditations-10-6')).toBe(false);
    });
  });

  describe('FEAT-581 loci are verbatim at both ends (virtuous-response)', () => {
    const VIRTUOUS_FILE = 'passages-4-virtuous-response.json';
    const byId = (id: string): Passage => {
      const p = loadPassages(VIRTUOUS_FILE).find((x) => x.id === id);
      if (!p) throw new Error(`${id} missing from ${VIRTUOUS_FILE}`);
      return p;
    };

    it.each([
      [
        'epictetus-enchiridion-10',
        'Upon every Accident, remember to turn towards yourself',
        'And thus habituated, the Appearances of Things will not hurry you away along with them.',
      ],
      [
        'epictetus-discourses-2-18',
        'Every Habit and Faculty is preserved, and increased, by correspondent Actions',
        // Section 1 only (crisis): section 2 opens the lapse-as-verdict sequence.
        'but habituate yourself to something else.',
      ],
      [
        'epictetus-discourses-3-20',
        'In Appearances that are merely Objects of Contemplation',
        // Ends before "a Gainer, even by Sickness", the premise of the omitted
        // "Gainer by Dying" (crisis).
        'A right Use of Health is a Good; a wrong one, an Evil.',
      ],
      [
        'epictetus-discourses-1-24',
        'Difficulties are the Things that shew what Men are.',
        'That you may be a Conqueror, like one in the Olympic Games: and it cannot be without Toil.',
      ],
    ])('%s is Elizabeth Carter, opening and close intact', (id, opening, close) => {
      const p = byId(id);
      expect(p.translation).toBe('Elizabeth Carter');
      expect(p.text.startsWith(opening)).toBe(true);
      expect(p.text.endsWith(close)).toBe(true);
    });

    it('Carter\'s display capitals are sentence-cased (normalisation 8)', () => {
      const t = byId('epictetus-discourses-2-18').text;
      expect(t).not.toMatch(/^EVERY/);
      expect(t).toMatch(/^Every Habit/);
    });

    it('none of the four carries a fullText (crisis)', () => {
      for (const id of ['epictetus-enchiridion-10', 'epictetus-discourses-2-18', 'epictetus-discourses-3-20', 'epictetus-discourses-1-24']) {
        expect({ id, fullText: byId(id).fullText }).toEqual({ id, fullText: undefined });
      }
    });
  });

  describe('FEAT-581 loci are verbatim at both ends (interconnected-living)', () => {
    const INTERCONNECTED = 'passages-5-interconnected-living.json';
    const byId = (id: string): Passage => {
      const p = loadPassages(INTERCONNECTED).find((x) => x.id === id);
      if (!p) throw new Error(`${id} missing from ${INTERCONNECTED}`);
      return p;
    };
    const FEAT_663_IDS = [
      'seneca-letters-95',
      'seneca-letters-48',
      'seneca-letters-47',
      'seneca-on-anger-2-31',
      'epictetus-discourses-1-13',
      'epictetus-enchiridion-43',
    ];

    it.each([
      [
        'seneca-letters-95',
        'Richard Mott Gummere',
        'Then comes the second problem,—how to deal with men.',
        // Ends before 95.52's injury line and 95.53's verse (philosopher, crisis).
        'She engendered in us mutual affection, and made us prone to friendships.',
      ],
      [
        'seneca-letters-48',
        'Richard Mott Gummere',
        'But the fact is, the same thing is advantageous to me which is advantageous to you',
        // Ends before 48.4 turns to the dialecticians.
        'For he that has much in common with a fellow-man will have all things in common with a friend.',
      ],
      [
        'seneca-letters-47',
        'Richard Mott Gummere',
        'Kindly remember that he whom you call your slave sprang from the same stock',
        // The first two sentences of 47.10 only: stops before Gummere's "massacres
        // in Marius's day" and the reversal-of-fortune turn.
        'It is just as possible for you to see in him a free-born man as for him to see in you a slave.',
      ],
      [
        'seneca-on-anger-2-31',
        'Aubrey Stewart',
        'What, if the hands were to wish to hurt the feet?',
        // Ends before the vipers and the punishment turn (crisis).
        'The bond of society, however, cannot exist unless it guards and loves all its members.',
      ],
      [
        'epictetus-discourses-1-13',
        'Elizabeth Carter',
        // Opens at the hot water (crisis): the chapter's eating question would sit in
        // the list preview as moralised eating, a PHQ-9 appetite item.
        'And when you call for hot Water, and your Servant doth not hear you',
        // Ends before the slaveholder's "Right of Purchase" retort and the "Laws of
        // dead Men" (philosopher, crisis).
        'That they are by Nature your Relations, your Brothers; that they are the Offspring of God?',
      ],
      [
        'epictetus-enchiridion-43',
        'Elizabeth Carter',
        'Every Thing hath two Handles; the one, by which it may be borne; the other, by which it cannot.',
        'and thus you will lay hold on it, as it is to be borne.',
      ],
    ])('%s is %s, opening and close intact', (id, translator, opening, close) => {
      const p = byId(id);
      expect(p.translation).toBe(translator);
      expect(p.text.startsWith(opening)).toBe(true);
      expect(p.text.endsWith(close)).toBe(true);
    });

    it('Carter\'s bracketed supplement is dropped (normalisation 4)', () => {
      const t = byId('epictetus-discourses-1-13').text;
      expect(t).not.toMatch(/\[with yourself\]/);
      expect(t).toContain('and of the same high Descent? But, if you chance');
    });

    it('digitization apparatus and typographic quotes are dropped (normalisations 5 and 6)', () => {
      for (const p of loadPassages(INTERCONNECTED)) {
        const rendered = `${p.text} ${p.fullText ?? ''}`;
        expect({ id: p.id, residue: rendered.match(/[​‘’“”§]|\{\d+\}|\[\d+\]| {2}/g) }).toEqual({
          id: p.id,
          residue: null,
        });
      }
      // DEBUG-390: the residue matcher fires on each apparatus form it names.
      for (const bad of ['every one {108} who', 'help.[25] Let', 'brought ​up', 'man’s lot', '§. 1.', 'two  spaces']) {
        expect(bad).toMatch(/[​‘’“”§]|\{\d+\}|\[\d+\]| {2}/);
      }
    });

    it('none of the six carries a fullText (crisis)', () => {
      for (const id of FEAT_663_IDS) {
        expect({ id, fullText: byId(id).fullText }).toEqual({ id, fullText: undefined });
      }
    });

    it('Meditations 2.1 stays the first card, so no FEAT-663 locus is auto-expanded (crisis)', () => {
      // FromTheSourceSection expands the first passage by order; that must never
      // be Ench. 43 or a passage about slavery.
      const ps = JSON.parse(readFileSync(join(PASSAGES_DIR, INTERCONNECTED), 'utf8')).passages as Array<{ id: string; order: number }>;
      const first = [...ps].sort((a, b) => a.order - b.order)[0];
      expect(first.id).toBe('marcus-meditations-2-1');
    });
  });

  /**
   * THE SAME DEFECT ONE LAYER UP (DEBUG-585). DEBUG-352, FEAT-567 and DEBUG-582
   * each found an edition's identity attached to text that edition did not
   * produce, and each found it in `text`. This is that class in the METADATA:
   * both Seneca *Letters* records declared `work: "Letters from a Stoic"` — Robin
   * Campbell's 1969 Penguin Classics SELECTION title, in copyright — over
   * Gummere's public-domain Loeb text. A reader following our own metadata to
   * find the source landed on the wrong book.
   *
   * Nothing is infringed by a title alone (titles are not copyrightable subject
   * matter), so the exposure is not a copyright claim. It is the verifiability
   * of the repo's OWN public-domain warranty: `README.md`'s Acknowledgments
   * asserts "public-domain translations, the only renderings shipped in the app"
   * and, until this item, named a copyrighted commercial edition inside that
   * very sentence.
   *
   * The key names the WORK, never the volume — which is why nothing else in the
   * corpus shares the defect. `Meditations` is not Long's *Thoughts of the
   * Emperor M. Aurelius Antoninus*, `Enchiridion` is not Carter's *All the Works
   * of Epictetus*, and `On Tranquility` is not Stewart's *Minor Dialogues*. In
   * each case volume identity is confined to the digitization pin, which is the
   * correct architecture and is what this rename restores for Seneca.
   *
   * Asserted on the `work` FIELD, never on raw file text. `passages-4`'s
   * `marcus-meditations-5-20` note deliberately quotes the banned Hays phrasing
   * in order to warn against it, and a blind whole-file scan for a title string
   * would collide with the same convention the moment a note legitimately names
   * the Campbell edition to disambiguate it.
   */
  describe('the Loeb Gummere is not shelved under Penguin (DEBUG-585)', () => {
    const PENGUIN_SELECTION_TITLE = 'Letters from a Stoic';
    const LOEB_WORK = 'Moral Letters to Lucilius';

    it('no passage declares the in-copyright Penguin selection title', () => {
      const offending = allPassages()
        .filter((p) => p.work === PENGUIN_SELECTION_TITLE)
        .map(({ file, id, work }) => `${file}:${id} — ${work}`);

      expect(offending).toEqual([]);
    });

    it('every Seneca Letters locus names the Loeb edition Gummere translated', () => {
      const seneca = allPassages().filter((p) => p.citation.startsWith('Letters '));
      // Non-vacuity: the filter must actually select the known loci, or the
      // work assertion below passes over an empty list.
      expect(seneca.map((p) => p.citation).sort()).toEqual([
        'Letters 107.11',
        'Letters 13.4',
        'Letters 16.5',
        'Letters 47.10',
        'Letters 48.2-3',
        'Letters 5.9',
        'Letters 57.3',
        'Letters 63.1',
        'Letters 95.51-52',
      ]);
      for (const p of seneca) expect(p.work).toBe(LOEB_WORK);
    });

    it('no module citation names the Penguin selection title', () => {
      const offending = moduleQuoteSources()
        .filter(({ source }) => source.includes(PENGUIN_SELECTION_TITLE))
        .map(({ file, source }) => `${file} — ${source}`);

      expect(offending).toEqual([]);
    });

    it('the Gummere module locus names the Loeb edition and keeps its translator suffix', () => {
      const m = moduleQuoteSources().find(({ file }) => file === 'module-1-aware-presence.json');
      expect(m).toBeDefined();
      expect(m!.source).toContain(LOEB_WORK);
      // `moduleClassicalQuotes.test.ts` reads the translator out of this suffix.
      expect(m!.source).toContain('(trans. Richard Mott Gummere)');
    });

    /**
     * DEBUG-390 non-vacuity control. Both matchers above are `.filter(...)` over
     * a loaded list, so they pass identically against correct code and against a
     * loader that silently stopped returning anything. Prove the loaders are
     * non-trivial and that the predicates still fire on a literal known-bad
     * string.
     */
    it('the Penguin-title matchers still fire (DEBUG-390)', () => {
      expect(allPassages().length).toBeGreaterThan(10);
      expect(moduleQuoteSources().length).toBe(MODULE_FILES.length);

      const knownBad = 'Letters from a Stoic, 2.1 (trans. Richard Mott Gummere)';
      expect(knownBad.includes(PENGUIN_SELECTION_TITLE)).toBe(true);
      expect(PENGUIN_SELECTION_TITLE === LOEB_WORK).toBe(false);
      // Every passage carries a non-empty work key, so the field scan reads a
      // real value rather than a uniformly `undefined` one.
      expect(allPassages().every((p) => typeof p.work === 'string' && p.work.length > 0)).toBe(true);
    });
  });

  /**
   * THE OPENING TEST (FEAT-581, founder decision).
   *
   * `ClassicalLibraryScreen` previews `text` at two lines, under the principle
   * label, with no `context` beside it — so as the corpus grows the opening IS
   * the browse surface, and a trap stated there is read as the principle's own
   * endorsement. Rule: a passage's first ~90 characters, read alone under its
   * principle label, must not state that principle's trap. A failing locus gets
   * an excerpt with a safe opening, or is rejected. Putting `context` on the row
   * was considered and refused: a corrective cut at two lines stops mid-pivot.
   *
   * Whether an opening states a trap is a judgement, not a regex, so this is a
   * RATCHET over recorded rulings, the shape BALANCE_DEBT established. Each
   * opening below was read by `philosopher` at FEAT-581; a new passage, or an
   * edited opening, fails here until someone reads it and records it.
   */
  describe('every opening has been read under its label (FEAT-581)', () => {
    const OPENING_CHARS = 90;

    const REVIEWED_OPENINGS: Readonly<Record<string, string>> = {
      'marcus-meditations-8-36':
        'Do not disturb thyself by thinking of the whole of thy life. Let not thy thoughts at once ',
      'marcus-meditations-7-29':
        'Wipe out the imagination. Stop the pulling of the strings. Confine thyself to the present.',
      'epictetus-enchiridion-5':
        'Men are disturbed, not by Things, but by the Principles and Notions, which they form conce',
      'marcus-meditations-4-23':
        'Everything harmonizes with me, which is harmonious to thee, O Universe. Nothing for me is ',
      'epictetus-enchiridion-8':
        'Require not Things to happen as you wish; but wish them to happen as they do happen; and y',
      'epictetus-enchiridion-1':
        'Of Things, some are in our Power, and others not. In our Power are Opinion, Pursuit, Desir',
      'epictetus-enchiridion-2':
        'Remember that Desire promises the Attainment of that of which you are desirous; and Aversi',
      'seneca-on-tranquility-13':
        'I will set sail unless anything happens to prevent me, I shall be praetor, if nothing hind',
      'epictetus-discourses-1-1':
        'But now, when it is in our Power to take Care of one Thing, and to apply to one, we chuse ',
      'epictetus-discourses-2-5':
        'The Materials of Action are indifferent: but the Use of them is not indifferent. How, then',
      'epictetus-discourses-2-13':
        'When I see any one solicitous, I say, What doth this Man mean? Unless he wanted something ',
      'marcus-meditations-6-50':
        'Let us try to persuade them. But act even against their will, when the principles of justi',
      'marcus-meditations-8-8':
        'Thou hast not leisure to read. But thou hast leisure to check arrogance: thou hast leisure',
      'marcus-meditations-5-20':
        'In one respect man is the nearest thing to me, so far as I must do good to men and endure ',
      'marcus-meditations-10-16':
        'No longer talk at all about the kind of man that a good man ought to be, but be such.',
      'seneca-letters-13':
        'There are more things, Lucilius, likely to frighten us than there are to crush us; we suff',
      'seneca-letters-107':
        'Lead me, O Master of the lofty heavens, My Father, whithersoever thou shalt wish. I shall ',
      'marcus-meditations-2-1':
        'Begin the morning by saying to thyself, I shall meet with the busybody, the ungrateful, ar',
      'marcus-meditations-4-4':
        'If our intellectual part is common, the reason also, in respect of which we are rational b',
      'marcus-meditations-7-13':
        'Just as it is with the members in those bodies which are united in one, so it is with rati',
      // FEAT-660, read by philosopher under "Aware Presence".
      'seneca-letters-5':
        'Beasts avoid the dangers which they see, and when they have escaped them are free from car',
      'seneca-letters-57':
        'The gloom, however, furnished me with some food for thought; I felt a certain mental thril',
      'seneca-on-anger-2-4':
        'Furthermore, that you may know in what manner passions begin and swell and gain spirit, le',
      'seneca-on-the-shortness-of-life-9':
        'They live laboriously, in order that they may live better; they fit themselves out for lif',
      'epictetus-discourses-4-12':
        'When you let go your Attention for a little while, do not fancy you may recover it when-ev',
      // FEAT-661, read by philosopher under "Radical Acceptance".
      'marcus-meditations-4-49':
        'Be like the promontory against which the waves continually break, but it stands firm and t',
      'marcus-meditations-8-50':
        'A cucumber is bitter\u2014Throw it away.\u2014There are briers in the road\u2014Turn aside from them.\u2014Thi',
      'seneca-letters-16':
        'Whether the truth, Lucilius, lies in one or in all of these views, we must be philosophers',
      'seneca-on-tranquility-10':
        'Call good sense to your aid against difficulties: it is possible to soften what is harsh, ',
      'seneca-letters-63':
        'I am grieved to hear that your friend Flaccus is dead, but I would not have you sorrow mor',
      // FEAT-662, read by philosopher under "Virtuous Response".
      'epictetus-enchiridion-10':
        'Upon every Accident, remember to turn towards yourself, and enquire, what Powers you have ',
      'epictetus-discourses-2-18':
        'Every Habit and Faculty is preserved, and increased, by correspondent Actions: as the Habi',
      'epictetus-discourses-3-20':
        'In Appearances that are merely Objects of Contemplation, almost all Persons have allowed G',
      'epictetus-discourses-1-24':
        'Difficulties are the Things that shew what Men are. For the future, on any Difficulty, rem',
      // FEAT-663, read by philosopher under "Interconnected Living".
      'seneca-letters-95':
        'Then comes the second problem,—how to deal with men. What is our purpose? What precepts do',
      'seneca-letters-48':
        'But the fact is, the same thing is advantageous to me which is advantageous to you; for I ',
      'seneca-letters-47':
        'Kindly remember that he whom you call your slave sprang from the same stock, is smiled upo',
      'seneca-on-anger-2-31':
        'What, if the hands were to wish to hurt the feet? or the eyes to hurt the hands? As all th',
      'epictetus-discourses-1-13':
        'And when you call for hot Water, and your Servant doth not hear you; or, if he doth, bring',
      'epictetus-enchiridion-43':
        'Every Thing hath two Handles; the one, by which it may be borne; the other, by which it ca',
    };

    /**
     * Openings read and FAILED, declared rather than silently passed. Empty since
     * FEAT-661 retired its only entry: 10.6 opened "Whatever may happen to thee, it
     * was prepared for thee from all eternity" under Radical Acceptance, the
     * fatalist reading in the preview. Kept as the ledger a future failure lands in.
     */
    const OPENING_DEBT: Readonly<Record<string, string>> = {};

    it('every opening is recorded as read, or declared as failing', () => {
      const unread = allPassages()
        .filter((p) => !(p.id in OPENING_DEBT))
        .filter((p) => REVIEWED_OPENINGS[p.id] !== p.text.slice(0, OPENING_CHARS))
        .map(({ file, id, text }) => `${file}:${id} — "${text.slice(0, OPENING_CHARS)}"`);

      expect(unread).toEqual([]);
    });

    it('no recorded opening or declared failure is stale', () => {
      // A retired passage must take its entry with it — otherwise the id is
      // pre-cleared for whatever text lands under it next.
      const ids = new Set(allPassages().map((p) => p.id));
      const stale = [...Object.keys(REVIEWED_OPENINGS), ...Object.keys(OPENING_DEBT)].filter((id) => !ids.has(id));
      expect(stale).toEqual([]);
      // A declared failure that is also recorded as read is a contradiction.
      expect(Object.keys(OPENING_DEBT).filter((id) => id in REVIEWED_OPENINGS)).toEqual([]);
    });

    it('the ratchet reads real openings (DEBUG-390)', () => {
      // Both checks above pass vacuously over an empty corpus or an empty record.
      expect(allPassages().length).toBeGreaterThan(10);
      expect(Object.keys(REVIEWED_OPENINGS).length).toBeGreaterThan(10);
      // And the comparison genuinely discriminates: a one-character edit to a
      // recorded opening must read as unrecorded.
      const [id, opening] = Object.entries(REVIEWED_OPENINGS)[0];
      expect(REVIEWED_OPENINGS[id] === `${opening.slice(0, -1)}x`).toBe(false);
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
    // FEAT-580 brought a SECOND principle into this block. Everything above the
    // virtuous-response section below is still radical-acceptance's.
    const VIRTUOUS = 'passages-4-virtuous-response.json';

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
      // FEAT-661: the fixity objection named and answered, taking 10.6's slot.
      [RADICAL, 'seneca-letters-16', 'whatever the truth about fate'],
      [RADICAL, 'seneca-letters-16', 'Meeting Fortune defiantly is not resignation'],
      // The 'Not so' answers the inference, and the close turns to action.
      [RADICAL, 'marcus-meditations-4-49', 'His closing question turns toward action'],
      [RADICAL, 'marcus-meditations-8-50', 'The opening verbs are the pivot'],
      [RADICAL, 'seneca-on-tranquility-10', "Seneca's verbs are active: soften, widen, lighten"],
      // The grief note guards the principle's second trap, suppression.
      [RADICAL, 'seneca-letters-63', 'will not insist that Lucilius feel nothing'],
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
    });

    // The corrective may not overcorrect into denying what the passage says.
    // Letters 16.4-5 keeps causal fixity a live possibility and answers it without
    // denying it; a note implying outcomes are ours breaks sphere-sovereignty
    // while purporting to fix this principle.
    // Corpus-wide since FEAT-580: its own note turns on "consent changes the man,
    // not the outcome", which is one careless rewording away from the very claim
    // this guard forbids. Verified zero violators corpus-wide when widened.
    it('no note claims outcomes are within our control', () => {
      for (const p of allPassages()) {
        expect(p.context ?? '').not.toMatch(/\b(you can control|within your control|up to you to decide what happens)\b/i);
      }
    });

    /**
     * VIRTUOUS RESPONSE — Letters 107.11 (FEAT-580).
     *
     * Two live defects, one of them in no AC. The note credited "a hymn of the
     * Stoic Cleanthes", which is wrong twice: it scoped the whole quoted block —
     * including the closing line that has no counterpart in the Greek Epictetus
     * preserves at Ench. 53 — to Cleanthes; and von Arnim Frag. 527 is a standalone
     * prayer fragment, NOT the Hymn to Zeus (Frag. 537), so "hymn" is itself the
     * pop conflation.
     *
     * What the note may assert is bounded by what Gummere's own apparatus supports:
     * the textual fact that the closing line is absent from that Greek. It may NOT
     * say who composed it — the apparatus records division over the WHOLE passage
     * (Augustine and Wilamowitz give all of it to Seneca), not a four-plus-one split.
     *
     * The trap this pins against is a PREMEDITATIO framing. Ep. 107.3-9 genuinely is
     * expectation-shaped, so anyone reading the whole letter lands there — but we
     * cite 107.11, and seneca-letters-13 sits at order 3 in the same file already
     * owning that move.
     */
    it.each([
      // Both are led and both arrive: consent is not causally efficacious, so the
      // submission reading collapses from inside rather than being denied.
      [VIRTUOUS, 'seneca-letters-107', 'both arrive'],
      // What consent DOES change — the man. This is the file's own principle, and
      // it is why the passage sits under virtuous-response, not radical-acceptance.
      [VIRTUOUS, 'seneca-letters-107', 'changes the man, not the outcome'],
      // The affective refusal, marked as EXTERNAL to these lines. In the verse the
      // groaning belongs to the UNWILLING man; the passage does not itself make
      // room for tears, and a note implying it does has falsified the text.
      [VIRTUOUS, 'seneca-letters-107', 'not at feeling'],
    ])('%s / %s keeps its corrective', (file, id, anchor) => {
      expect(contextOf(file, id)).toContain(anchor);
    });

    it('the Cleanthes mis-attribution and the inert gloss do not come back', () => {
      const note = contextOf(VIRTUOUS, 'seneca-letters-107');
      // Scoped the whole verse — closing line included — to Cleanthes.
      expect(note).not.toContain('a hymn of the Stoic Cleanthes');
      // Bibliographically adequate, doctrinally inert: it framed the passage as
      // acceptance and stopped, which is the reading the corrective must defuse.
      expect(note).not.toContain('closing a letter on accepting what is not in our control');
      // "Hymn" is the Frag. 527 / Frag. 537 conflation. Independent of the phrase above.
      expect(note).not.toMatch(/\bhymn\b/i);
      // The premeditatio mis-aim AC1 names as the likeliest drift. Ep. 107.11 is
      // fatum/prohairesis; the anticipation passage in this file is seneca-letters-13.
      expect(note).not.toMatch(/\b(premeditatio|rehears\w*|anticipat\w*|foresee|expect the worst)\b/i);
    });

    /**
     * VIRTUOUS RESPONSE — the FEAT-662 additions. Four Carter loci, each carrying
     * the affective complement the Stoic-as-unfeeling trap needs (the 107.11 "not at
     * feeling" model). 1.24 and Ench. 10 also carry the harm clause (crisis).
     */
    it.each([
      [VIRTUOUS, 'epictetus-enchiridion-10', 'acting well while pain is still pain'],
      [VIRTUOUS, 'epictetus-discourses-2-18', 'acts and judgements, not feelings to stamp out'],
      [VIRTUOUS, 'epictetus-discourses-3-20', 'illness hurts and deserves care'],
      [VIRTUOUS, 'epictetus-discourses-1-24', 'and the toil is real'],
      // Answers the preview's "shew what Men are" read as a verdict (PHQ-9 item 6).
      [VIRTUOUS, 'epictetus-discourses-1-24', 'not a verdict on you'],
    ])('%s / %s keeps its affective complement', (file, id, anchor) => {
      expect(contextOf(file, id)).toContain(anchor);
    });

    it('the virtuous-response matchers still fire (DEBUG-390)', () => {
      // Literal known-bad strings, never corpus state. The shipped note FEAT-580
      // replaced is the natural negative fixture: every predicate above must fire
      // on it, or the pins would pass vacuously against correct-looking prose.
      const shipped =
        "Seneca's Latin rendering of a hymn of the Stoic Cleanthes, closing a letter on accepting what is not in our control.";
      expect(shipped).toContain('a hymn of the Stoic Cleanthes');
      expect(shipped).toContain('closing a letter on accepting what is not in our control');
      expect(shipped).toMatch(/\bhymn\b/i);
      expect(shipped).not.toContain('both arrive');
      expect(shipped).not.toContain('changes the man, not the outcome');
      expect(shipped).not.toContain('not at feeling');

      // The premeditatio matcher needs its own fixture — the shipped note does not
      // contain that drift, so asserting against it would prove nothing.
      const premeditatio = 'A passage on rehearsing misfortune before it arrives.';
      expect(premeditatio).toMatch(/\b(premeditatio|rehears\w*|anticipat\w*|foresee|expect the worst)\b/i);

      // And prove the note being read is real prose, not an empty string that would
      // satisfy every not.toContain above vacuously.
      expect(contextOf(VIRTUOUS, 'seneca-letters-107').length).toBeGreaterThan(40);
    });

    /**
     * SPHERE SOVEREIGNTY — the FEAT-581 additions. The trap is withdrawal /
     * learned helplessness: "not ours" heard as "not worth our effort", or as a
     * reason to care about fewer people. Every added note carries a clause doing
     * the opposite work, and that clause is what is pinned. There is no negative
     * pin because no defective phrasing ever shipped here; the notes also NAME
     * the trap in order to refuse it ("not withdrawal", "not to leave"), so a
     * regex against withdrawal vocabulary would fire on the correctives.
     */
    const SOVEREIGNTY = 'passages-3-sphere-sovereignty.json';

    it.each([
      // "Brother, Friend, Child" are listed as Incumbrances — the note refuses
      // the care-for-fewer-people reading, which crisis ruled a hazard in itself.
      [SOVEREIGNTY, 'epictetus-discourses-1-1', 'engagement, not withdrawal'],
      // Indifferent is a technical term; heard as "unimportant" it IS the trap.
      [SOVEREIGNTY, 'epictetus-discourses-2-5', 'Indifferent does not mean careless'],
      // Avoidance is the anxious reader's version of withdrawal.
      [SOVEREIGNTY, 'epictetus-discourses-2-13', 'not to leave the stage'],
      // When force blocks the way, the effort changes object; it does not end.
      [SOVEREIGNTY, 'marcus-meditations-6-50', 'turns to another virtue; it does not stop'],
      // The section closes on caring for difficult people, not on distance from them.
      [SOVEREIGNTY, 'marcus-meditations-8-8', 'ends on care, not distance'],
    ])('%s / %s keeps its anti-withdrawal clause', (file, id, anchor) => {
      expect(contextOf(file, id)).toContain(anchor);
    });

    it('the two harm-adjacent sovereignty notes keep the harm clause (crisis)', () => {
      // 6.50's "any man by using force stands in thy way" must not be heard as
      // counsel to endure force aimed at the reader.
      const note = contextOf(SOVEREIGNTY, 'marcus-meditations-6-50');
      expect(note).toContain('not harm done to you');
      expect(note).toContain('set limits or seek help');
      // 2.13's diagnosis must not read, to a GAD-7 >= 15 reader, as a verdict on them.
      expect(contextOf(SOVEREIGNTY, 'epictetus-discourses-2-13')).toContain('not a verdict on anxiety');
    });

    /**
     * AWARE PRESENCE — the FEAT-660 additions. The working trap is presentism:
     * "live only now, stop planning", which the framework itself rules out
     * (01-aware-presence.md: present perception "doesn't mean never reflecting on
     * the past or planning for the future"). The secondary traps are
     * mind-wandering heard as failure, and attention-to-self heard as
     * self-absorption. As with sovereignty there is no negative pin: the notes
     * name the trap in order to refuse it ("not to stop thinking ahead").
     */
    const AWARE = 'passages-1-aware-presence.json';

    it.each([
      // Memory and foresight are named blessings in 5.9 itself.
      [AWARE, 'seneca-letters-5', 'planning is not the fault here'],
      // The sage still changes colour: the first jolt is not a lapse.
      [AWARE, 'seneca-letters-57', 'not a failure of courage or of practice'],
      // The first movement answers both "feeling is failure" and suppression.
      [AWARE, 'seneca-on-anger-2-4', 'involuntary and no fault of ours'],
      // Deferral is the target, not foresight.
      [AWARE, 'seneca-on-the-shortness-of-life-9', 'postponing life, not planning for it'],
      // Mind-wandering, and attention-to-self as self-absorption.
      [AWARE, 'epictetus-discourses-4-12', 'The practice is returning, not never wandering'],
      [AWARE, 'epictetus-discourses-4-12', 'your own conduct, not self-preoccupation'],
    ])('%s / %s keeps its anti-presentism clause', (file, id, anchor) => {
      expect(contextOf(file, id).toLowerCase()).toContain(anchor.toLowerCase());
    });

    it('the radical-acceptance notes on holding hardship keep the harm clause (crisis)', () => {
      // 4.49's promontory, Tranquility 10's narrowing and 16.5's enduring Chance can
      // each be heard as counsel to stay under ongoing harm (FEAT-661 crisis ruling).
      for (const id of ['marcus-meditations-4-49', 'seneca-on-tranquility-10', 'seneca-letters-16']) {
        const note = contextOf(RADICAL, id);
        expect({ id, holds: note.includes('staying in or excusing ongoing harm') }).toEqual({ id, holds: true });
        expect({ id, limits: note.includes('set limits or seek help') }).toEqual({ id, limits: true });
      }
    });

    it('the harm-adjacent aware-presence notes keep their crisis clauses', () => {
      // On Anger's second movement is a judgement of being wronged; the pause
      // declines the striking back, never the recognition of the wrong.
      const anger = contextOf(AWARE, 'seneca-on-anger-2-4');
      expect(anger).toContain('without doubting the wrong');
      expect(anger).toContain('not about staying in or excusing ongoing harm');
      expect(anger).toContain('seeking help or reporting it');
      // Disc. 4.12's "Fault of To-day" must not read as a verdict on the reader.
      expect(contextOf(AWARE, 'epictetus-discourses-4-12')).toContain('not a verdict on you');
    });

    /**
     * INTERCONNECTED LIVING — the FEAT-663 additions. The trap is impersonal
     * collectivism: worth derived from "the whole", care as duty to an abstraction.
     * Every note grounds the bond in the kinship or affection the text itself
     * states. As with sovereignty there is no negative pin on the trap's own
     * vocabulary beyond crisis's: the notes name the reading in order to refuse it.
     */
    const INTERCONNECTED = 'passages-5-interconnected-living.json';

    it.each([
      // Gummere's "parts" is membra, the living member 7.13 prefers to "part".
      [INTERCONNECTED, 'seneca-letters-95', 'renders the Latin membra'],
      [INTERCONNECTED, 'seneca-letters-95', 'not a duty owed to an abstraction'],
      // Neither instrumental nor self-erasing.
      [INTERCONNECTED, 'seneca-letters-48', 'not a technique for one\'s own benefit'],
      [INTERCONNECTED, 'seneca-letters-48', 'What befalls one friend befalls both'],
      // Refuses the abolitionist reading.
      [INTERCONNECTED, 'seneca-letters-47', 'did not oppose slavery as an institution'],
      // Answers "the interest of the whole body" with the passage's own last word.
      [INTERCONNECTED, 'seneca-on-anger-2-31', 'guards and loves each of its members'],
      // Carter's Servant is enslaved, and the forbearance runs downward.
      [INTERCONNECTED, 'epictetus-discourses-1-13', 'an enslaved person'],
      [INTERCONNECTED, 'epictetus-discourses-1-13', 'runs from the more powerful toward the less'],
      // The handle is a judgement, not a denial: the wrong stays named.
      [INTERCONNECTED, 'epictetus-enchiridion-43', 'the injustice is real'],
    ])('%s / %s grounds the bond in kinship', (file, id, anchor) => {
      expect(contextOf(file, id)).toContain(anchor);
    });

    it('the two forbearance notes keep the harm clause (crisis)', () => {
      // Ench. 43's handle and 1.13's "bear with your own Brother" can each be heard,
      // from the weaker position, as counsel to put up with an abusive relative.
      for (const id of ['epictetus-enchiridion-43', 'epictetus-discourses-1-13']) {
        const note = contextOf(INTERCONNECTED, id);
        expect({ id, holds: note.includes('staying in or excusing ongoing harm') }).toEqual({ id, holds: true });
        expect({ id, limits: note.includes('set limits or seek help') }).toEqual({ id, limits: true });
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
      for (const id of ['marcus-meditations-4-23', 'epictetus-enchiridion-8', 'marcus-meditations-4-49']) {
        expect(contextOf(RADICAL, id).length).toBeGreaterThan(40);
      }
    });

    // The frame is ours; the passage is the source. A note that outgrows what it
    // frames has stopped framing and started competing.
    //
    // Corpus-wide since DEBUG-582. It was scoped to this principle only because
    // seneca-letters-13 was the sole corpus-wide violator, and it was a violator
    // only because its `text` was a truncated paraphrase rather than the Gummere
    // it declared. Repairing that provenance defect cleared the exception, so the
    // rule was widened here rather than the id being exempted there.
    it('no note runs longer than the passage it frames', () => {
      const overlong = allPassages()
        .filter((p) => p.context && p.context.length > p.text.length)
        .map(({ file, id, context, text }) => `${file}:${id} — ${context!.length} > ${text.length}`);

      expect(overlong).toEqual([]);
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
