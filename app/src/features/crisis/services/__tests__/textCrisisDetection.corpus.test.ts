/**
 * textCrisisDetection — adversarial corpus harness (INFRA-512)
 *
 * WHAT THIS IS, AND WHAT IT DELIBERATELY IS NOT.
 *
 * This harness MEASURES `detectCrisisInText` against a labelled corpus and reports
 * three figures separately — MUST-FIRE recall, MUST-NOT-FIRE false-positive rate, and
 * STT-MANGLED recall. It does NOT threshold any of them. That is AC5: the baseline is
 * RECORDED, not silently enforced. A threshold set before the number is known either
 * passes vacuously or blocks every PR.
 *
 * WHY THE THREE FIGURES ARE NEVER BLENDED. The module's contract is precision over
 * a fixed vocabulary; in-contract recall and recognizer error are different
 * failures. A single blended number would understate the in-contract failure and
 * overstate the out-of-contract one.
 *
 * THIS FILE IS SELECTED BY CI. Every path under `features/crisis/` matches
 * `test:crisis-quick`'s `--testPathPattern="[Cc]risis"`, which CI runs via
 * `validate:crisis-authority`. Two consequences, both designed for:
 *   1. It must stay far under that job's 5s per-file timeout — this is a few dozen
 *      regex scans over one small JSON file, i.e. microseconds. Do not add I/O.
 *   2. That job runs `--silent`, so the console figures below are NOT the record.
 *      The record is the dated audit doc named in the corpus fixture.
 *
 * THE ONE THING THIS FILE HARD-FAILS ON is the ANCHOR set (see below) — a structural
 * regression pin, not a quality bar. It fires when `CRISIS_TEXT_PATTERN_SOURCES` is
 * narrowed, which is what stops the harness being "passed" by shrinking the detector
 * instead of improving it.
 *
 * DO NOT widen `CRISIS_TEXT_PATTERN_SOURCES` to raise a number here. That constant
 * feeds `journalCrisisScanner.scan`, which fires `showCrisisAlert()` — widening it for
 * recall buys alarm fatigue on the surface where it costs most. Any widening is a
 * separate item with a crisis pass.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { CRISIS_TEXT_PATTERN_SOURCES, detectCrisisInText } from '../textCrisisDetection';

type CorpusClass = 'MUST_FIRE' | 'MUST_NOT_FIRE' | 'KNOWN_OVER_FIRE' | 'STT_MANGLED';

interface CorpusItem {
  id: string;
  class: CorpusClass;
  text: string;
  sourceId?: string;
  refutes?: string;
  acceptedBecause?: string;
  provenance: { source: string; origin?: string; model?: string; runDate: string };
  review: { reviewer: string; reviewedOn: string; verdict: string };
}

// readFileSync + JSON.parse rather than `import ... from '.json'`: it gives an explicit
// missing-fixture failure and sidesteps resolveJsonModule/isolatedModules questions. Same
// convention textCrisisDetection.parity.test.ts already uses.
const CORPUS_PATH = join(__dirname, 'fixtures', 'crisisTextCorpus.v1.json');
const corpus = JSON.parse(readFileSync(CORPUS_PATH, 'utf8')) as {
  corpusVersion: string;
  items: CorpusItem[];
};

const itemsOfClass = (c: CorpusClass) => corpus.items.filter((i) => i.class === c);
const fires = (text: string) => detectCrisisInText(text)?.isTriggered === true;

/**
 * ANCHOR SET — one bare canonical phrase per currently-shipped pattern.
 *
 * This is the anti-narrowing lock. Every entry must fire, unconditionally, and the set
 * must stay the same size as CRISIS_TEXT_PATTERN_SOURCES. Removing a pattern reds this
 * immediately; adding one reds it until the corpus gains a matching anchor, which is the
 * intended coupling — a new pattern that nothing in the corpus exercises is unmeasured.
 */
const ANCHORS: ReadonlyArray<{ patternSource: string; corpusId: string }> = [
  { patternSource: 'suicidal', corpusId: 'mf-suicidal' },
  { patternSource: 'kill\\s*my\\s*self', corpusId: 'mf-kill-myself' },
  { patternSource: 'end\\s*it\\s*all', corpusId: 'mf-end-it-all' },
  { patternSource: 'can\\s*not\\s*go\\s*on', corpusId: 'mf-cannot-go-on' },
  { patternSource: 'want\\s*to\\s*die', corpusId: 'mf-want-to-die' },
  { patternSource: 'no\\s*point\\s*living', corpusId: 'mf-no-point-living' },
];

describe('corpus harness — the harness itself still works', () => {
  // A measurement harness that silently stops measuring looks exactly like a clean
  // codebase. These prove the instrument is live before any figure is believed.
  it('fixture parses and is non-trivial', () => {
    expect(corpus.items.length).toBeGreaterThan(0);
    expect(typeof corpus.corpusVersion).toBe('string');
  });

  it('the detector under measurement is really wired (control pair)', () => {
    expect(fires('i want to die')).toBe(true);
    expect(fires('i want to dye my hair tomorrow')).toBe(false);
  });

  it('every class the harness reports on is populated', () => {
    expect(itemsOfClass('MUST_FIRE').length).toBeGreaterThan(0);
    expect(itemsOfClass('MUST_NOT_FIRE').length).toBeGreaterThan(0);
    expect(itemsOfClass('STT_MANGLED').length).toBeGreaterThan(0);
  });
});

describe('corpus integrity', () => {
  it('every item carries a review verdict — an unreviewed item may not land', () => {
    const unreviewed = corpus.items.filter((i) => !i.review?.verdict);
    expect(unreviewed.map((i) => i.id)).toEqual([]);
  });

  it('item ids are unique', () => {
    const ids = corpus.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every STT_MANGLED item resolves to a real MUST_FIRE source', () => {
    const mustFireIds = new Set(itemsOfClass('MUST_FIRE').map((i) => i.id));
    const dangling = itemsOfClass('STT_MANGLED').filter(
      (i) => !i.sourceId || !mustFireIds.has(i.sourceId),
    );
    expect(dangling.map((i) => i.id)).toEqual([]);
  });

  it('every MUST_NOT_FIRE item names the widening it refutes', () => {
    // Without this, the class fills with generic clean prose that refutes nothing and
    // the false-positive rate stops being adversarial.
    const unannotated = itemsOfClass('MUST_NOT_FIRE').filter((i) => !i.refutes);
    expect(unannotated.map((i) => i.id)).toEqual([]);
  });
});

describe('anti-narrowing anchor set', () => {
  it('has exactly one anchor per shipped pattern', () => {
    expect(ANCHORS.length).toBe(CRISIS_TEXT_PATTERN_SOURCES.length);
  });

  it('every anchor names a pattern that is still shipped', () => {
    const shipped = new Set(CRISIS_TEXT_PATTERN_SOURCES);
    const orphaned = ANCHORS.filter((a) => !shipped.has(a.patternSource));
    expect(orphaned.map((a) => a.patternSource)).toEqual([]);
  });

  it.each(ANCHORS)('anchor $corpusId fires unconditionally', ({ corpusId }) => {
    const item = corpus.items.find((i) => i.id === corpusId);
    expect(item).toBeDefined();
    expect(fires(item!.text)).toBe(true);
  });
});

describe('measurement — reported, never thresholded (AC5)', () => {
  it('reports MUST-FIRE recall, MUST-NOT-FIRE false-positive rate, and STT-MANGLED recall separately', () => {
    const mustFire = itemsOfClass('MUST_FIRE');
    const mustNotFire = itemsOfClass('MUST_NOT_FIRE');
    const sttMangled = itemsOfClass('STT_MANGLED');
    const knownOverFire = itemsOfClass('KNOWN_OVER_FIRE');

    const mustFireHits = mustFire.filter((i) => fires(i.text));
    const mustNotFireHits = mustNotFire.filter((i) => fires(i.text));
    const sttHits = sttMangled.filter((i) => fires(i.text));

    const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}%`);

    // KNOWN_OVER_FIRE is excluded from the false-positive denominator on purpose: it is
    // accepted behaviour, and folding it in would let a narrowing "improve" the rate by
    // reversing a crisis decision.
    // eslint-disable-next-line no-console
    console.log(
      [
        `\n  INFRA-512 corpus ${corpus.corpusVersion}`,
        `    MUST-FIRE recall:            ${mustFireHits.length}/${mustFire.length}  ${pct(mustFireHits.length, mustFire.length)}`,
        `    MUST-NOT-FIRE false-positive: ${mustNotFireHits.length}/${mustNotFire.length}  ${pct(mustNotFireHits.length, mustNotFire.length)}`,
        `    STT-MANGLED recall:          ${sttHits.length}/${sttMangled.length}  ${pct(sttHits.length, sttMangled.length)}`,
        `    KNOWN_OVER_FIRE (accepted):  ${knownOverFire.filter((i) => fires(i.text)).length}/${knownOverFire.length}`,
        `    MUST-FIRE misses:            ${mustFire.filter((i) => !fires(i.text)).map((i) => i.id).join(', ') || 'none'}`,
      ].join('\n'),
    );

    // The only assertion is that the measurement ran over a non-empty corpus. No rate is
    // asserted — see AC5 and this file's header.
    expect(mustFire.length + mustNotFire.length + sttMangled.length).toBeGreaterThan(0);
  });
});
