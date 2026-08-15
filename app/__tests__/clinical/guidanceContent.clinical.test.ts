/**
 * FEAT-404 slice 2 — guidance content loader + authored conflict content — CLINICAL
 *
 * WHY THIS FILE LIVES HERE AND NOT BESIDE THE LOADER. `app/` has two test roots, and a
 * suite under `app/src/**\/__tests__/` matches NO CI `--testPathPattern`: `test:unit` is
 * `--testPathPattern=unit` and `test:clinical` is `--testPathPattern=clinical`, both plain
 * path substrings. `app/scripts/check-ci-test-coverage.js` (INFRA-368) recomputes
 * `jest --listTests` minus the union of every CI pattern and HARD-FAILS on any file that
 * matches none and is absent from `ci-uncovered-tests.json` — and that ledger has zero
 * guidance entries. So a co-located suite would either fail the `Safety + privacy gates`
 * job or have to be added to a debt register whose own note says shrinking it is the point.
 * This directory is what Slice 1 used for `guidanceGate.clinical.test.ts`, and it reaches
 * CI via validate:clinical-authority → validate:clinical-complete → test:clinical.
 * It is a semantic placement, not a filename hack: the abuse-apologetics guard below is
 * clinical-safety content review, which is exactly what this directory is for.
 *
 * WHY THE ABUSE GUARD IS IN SLICE 2 RATHER THAN SLICE 3b, WHERE THE STORY PUT IT. The
 * guard is a property of the authored COPY, not of a React component — "you cannot control
 * what they do" reads as apologetics when the other party is abusive, and that is
 * statically checkable over `JSON.stringify(content)`. Landing it with the content it
 * governs is what makes this slice safety-load-bearing rather than inert plumbing, and it
 * removes the dependency of the batch's most important guard on a later PR.
 *
 * 🔴 THE FINDING THAT SHAPED THE CONTENT. `guidanceGate.ts` gives a reader in the PHQ-9
 * 15-19 gentle band Tier 0 + Tier 1 ONLY. `obstacles` and `protocol` are Tier 2. So an
 * abuse escape clause placed only in the protocol would be invisible to precisely the
 * cohort most at risk. It is therefore duplicated into Tier 0 (`validation[1]`), and that
 * duplication is deliberate — it must not be "DRY-ed" away later.
 *
 * Source of the caveat: `docs/product/stoic-mindfulness/applications/troubleshooting.md`
 * lines 52-69 — "You might meditate to calm anxiety about abusive relationship rather than
 * leaving it… Wisdom requires both acceptance of current reality AND action toward change
 * when action is possible and appropriate."
 */
import {
  loadGuidanceContent,
  clearGuidanceContentCache,
} from '@/core/services/guidanceContent';
import type { GuidanceContent } from '@/features/guidance/types/guidance';

// ---------------------------------------------------------------------------------------
// DEBUG-343 quote-integrity lists.
//
// Deliberately an INDEPENDENT FIFTH COPY rather than an import from
// moduleClassicalQuotes.test.ts. That file documents at length why the hoist was evaluated
// and rejected: the extraction scope differs per surface, and a shared constant would let
// one surface's loosening silently weaken another's. `/best revenge/i` is added here
// because it is Gregory Hays' in-copyright rendering of the exact passage this content
// anchors on (Meditations 6.6).
// ---------------------------------------------------------------------------------------
const PUBLIC_DOMAIN_BY_AUTHOR: Record<string, string[]> = {
  'Marcus Aurelius': ['George Long'],
  Epictetus: ['Elizabeth Carter'],
  Seneca: ['Richard Mott Gummere', 'Aubrey Stewart'],
};
const TRANSLATOR_RE = /\(trans\.\s*([^)]+)\)/;

const IN_COPYRIGHT_PATTERNS: { pattern: RegExp; translator: string; work: string }[] = [
  { pattern: /\bup to us\b/i, translator: 'Nicholas White / Robin Hard', work: 'Enchiridion 1' },
  { pattern: /stands in the way becomes the way/i, translator: 'Gregory Hays', work: 'Meditations 5.20' },
  { pattern: /what good or harm they thought would come/i, translator: 'Gregory Hays', work: 'Meditations 7.26' },
  { pattern: /sympathy rather than outrage/i, translator: 'Gregory Hays', work: 'Meditations 7.26' },
  { pattern: /ashamed to need help/i, translator: 'Gregory Hays', work: 'Meditations 7.7' },
  { pattern: /upset you to lose/i, translator: 'Gregory Hays', work: 'Meditations 7.27' },
  { pattern: /fingers of a hand/i, translator: 'n/a — FEAT-54 misattribution', work: 'not Marcus Aurelius' },
  { pattern: /best revenge/i, translator: 'Gregory Hays', work: 'Meditations 6.6 — the passage this anchors on' },
];

// ---------------------------------------------------------------------------------------
// The abuse-apologetics guard, as ruled by the `philosopher` planning pass.
// ---------------------------------------------------------------------------------------
/** Dichotomy-of-control framing — the phrasing that can read as apologetics. */
const CONTROL =
  /(cannot|can'?t|do not|don'?t) control (what|how|whether) (they|he|she|the other|another)|not in your control|outside your control|beyond your control/i;
/** The wisdom-requires-action caveat that must accompany it. */
const ACTION =
  /acceptance (alone )?(is|isn'?t|is not) (enough|sufficient)|wisdom requires|does not mean (staying|tolerating|accepting)|never means (staying|tolerating|accepting)|leave|end the relationship|report/i;
/** Language that names an unsafe situation. */
const UNSAFE =
  /not safe|unsafe|afraid|frightened|threaten|hurting you|harm(s|ing)? you|control(s|ling)? you|abuse|mistreat/i;
/** A route to help that is not a hardcoded number. */
const ROUTE =
  /support button|crisis (support|resources)|emergency services|someone you trust|domestic (violence|abuse)/i;

/** Suppression / thought-terminating phrasings that must never ship. */
const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /let it go/i, why: 'reads as suppression; colloquial "stoic" is not Stoicism' },
  { pattern: /don'?t let (it|them) bother you/i, why: 'dismisses the distress it should validate' },
  { pattern: /just accept/i, why: 'acceptance as a first move, before validation' },
  { pattern: /everything happens for a reason/i, why: 'Providence-conflation; a known misattribution' },
  { pattern: /shouldn'?t (feel|be upset|be angry)/i, why: 'tells the reader their reaction is wrong' },
  { pattern: /stop feeling/i, why: 'suppression, not equanimity' },
  { pattern: /calm down/i, why: 'directive at a distressed reader' },
  { pattern: /rise above/i, why: 'superiority framing, not Stoic' },
  {
    pattern: /no one can (hurt|upset) you without your permission/i,
    why: 'victim-blaming; also a misattribution',
  },
  { pattern: /frankl/i, why: 'Frankl is existentialist/logotherapy — confirmed misattribution' },
];

describe('FEAT-404 slice 2 — guidance content', () => {
  let content: GuidanceContent;
  let stringified: string;

  beforeAll(async () => {
    clearGuidanceContentCache();
    content = await loadGuidanceContent('conflict');
    stringified = JSON.stringify(content);
  });

  // -------------------------------------------------------------------------------------
  // 1. Loader contract
  // -------------------------------------------------------------------------------------
  describe('loader contract', () => {
    test('loads the conflict domain', async () => {
      const c = await loadGuidanceContent('conflict');
      expect(c.domain).toBe('conflict');
      expect(typeof c.version).toBe('string');
    });

    test('returns the SAME object instance on a second call (cache hit)', async () => {
      const a = await loadGuidanceContent('conflict');
      const b = await loadGuidanceContent('conflict');
      expect(a).toBe(b);
    });

    test('clearGuidanceContentCache forces a fresh load', async () => {
      const a = await loadGuidanceContent('conflict');
      clearGuidanceContentCache();
      const b = await loadGuidanceContent('conflict');
      expect(b).toEqual(a);
      // Re-seed for the remaining tests.
      content = b;
    });

    test.each(['career', 'grief', 'pain'] as const)(
      'throws a named error for the unauthored domain %s',
      async (domain) => {
        await expect(loadGuidanceContent(domain)).rejects.toThrow(
          `Failed to load guidance content: ${domain}`
        );
      }
    );

    // The validator is private, so it is driven through the loader's public contract by
    // swapping the JSON asset in jest's module registry. Asserting against a
    // reimplementation of the checks would prove nothing about the shipped validator —
    // it would pass even if the real one were deleted, which is the shape of coverage
    // this repo distrusts most.
    // `build` takes the real document and returns the malformed one. A builder rather than
    // a spread-merged patch, because the first two cases must REPLACE the document — a
    // patch of `{}` merges onto a valid doc and silently tests nothing.
    describe.each<[string, (real: any) => any]>([
      ['an empty document', () => ({})],
      ['a document with only its header', () => ({ domain: 'conflict', version: '1.0.0' })],
      ['an empty validation array', (r) => ({ ...r, validation: [] })],
      ['an empty protocol array', (r) => ({ ...r, protocol: [] })],
      ['a validation callout with no content', (r) => ({ ...r, validation: [{ type: 'support' }] })],
      ['a microPractice with no id', (r) => ({ ...r, microPractice: { type: 'reflection' } })],
      ['a protocol concept with no content', (r) => ({ ...r, protocol: [{ title: 'x' }] })],
      [
        'a classicalAnchor missing its author',
        (r) => ({ ...r, classicalAnchor: { text: 'x', source: 'y' } }),
      ],
      ['obstacles that are not an array', (r) => ({ ...r, obstacles: 'nope' })],
    ])('the shipped validator rejects %s', (_label, build) => {
      test('via the loader', async () => {
        jest.resetModules();
        // Same absolute module the loader requires, addressed from this file.
        jest.doMock('../../assets/guidance/guidance-conflict.json', () =>
          build(JSON.parse(stringified))
        );
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fresh = require('@/core/services/guidanceContent');
        await expect(fresh.loadGuidanceContent('conflict')).rejects.toThrow(
          'Failed to load guidance content: conflict'
        );
        jest.dontMock('../../assets/guidance/guidance-conflict.json');
        jest.resetModules();
      });
    });

    test('the same swap mechanism accepts the REAL asset — the rejections are not vacuous', async () => {
      // Liveness for the block above: if `jest.doMock` silently failed to intercept, every
      // rejection test would be asserting against the real (valid) document and would go
      // red rather than green — but if the loader threw for some unrelated reason, they
      // would all pass for the wrong reason. This proves the mechanism admits a good doc.
      jest.resetModules();
      jest.doMock('../../assets/guidance/guidance-conflict.json', () => JSON.parse(stringified));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fresh = require('@/core/services/guidanceContent');
      await expect(fresh.loadGuidanceContent('conflict')).resolves.toMatchObject({
        domain: 'conflict',
      });
      jest.dontMock('../../assets/guidance/guidance-conflict.json');
      jest.resetModules();
    });
  });

  // -------------------------------------------------------------------------------------
  // 2. Schema completeness of the shipped asset
  // -------------------------------------------------------------------------------------
  describe('shipped asset completeness', () => {
    test.each([
      'domain',
      'version',
      'validation',
      'microPractice',
      'protocol',
      'obstacles',
      'classicalAnchor',
    ])('carries required field %s', (field) => {
      expect(content).toHaveProperty(field);
    });

    test('declares none of the six dormant optional fields', () => {
      // They exist so later phases are content-adds. Populating one here would ship a
      // render branch nothing has been designed against yet.
      for (const f of ['stageGate', 'lossFork', 'premeditatio', 'stageSequence', 'medicalCaveat']) {
        expect(content).not.toHaveProperty(f);
      }
    });
  });

  // -------------------------------------------------------------------------------------
  // 3. Tier 0 — the layer a distressed reader reaches first
  // -------------------------------------------------------------------------------------
  describe('Tier 0 (validation)', () => {
    test('is exactly two callouts: support first, then the warning', () => {
      expect(content.validation).toHaveLength(2);
      expect(content.validation[0]!.type).toBe('support');
      expect(content.validation[1]!.type).toBe('warning');
    });

    test('validation[0] validates WITHOUT reframing — no control/acceptance vocabulary', () => {
      // Validate first, caveat second, reframe third. A reframe in the first callout
      // arrives before the distress has been acknowledged, which reads as suppression —
      // and the source doc's own reframe material (domain-specific.md:98-102) arrives
      // with no prior validation, which is exactly why it was not ported verbatim.
      const first = content.validation[0]!.content;
      expect(first).not.toMatch(CONTROL);
      expect(first).not.toMatch(/\bin your power\b/i);
      expect(first).not.toMatch(/\baccept(ance)?\b/i);
      expect(first).not.toMatch(/\bopportunity\b/i);
      expect(first).not.toMatch(/\bat least\b/i);
      expect(first.length).toBeGreaterThan(80); // matcher liveness: the text is real
    });

    test('validation[1] carries the safety escape clause — UNSAFE and a ROUTE', () => {
      // 🔴 In Tier 0 on purpose. The gentle band (PHQ-9 15-19) never reaches Tier 2, so
      // an escape clause living only in the protocol is invisible to the cohort most at
      // risk. Do not consolidate this into `obstacles`.
      const warn = content.validation[1]!.content;
      expect(warn).toMatch(UNSAFE);
      expect(warn).toMatch(ROUTE);
      expect(warn).toMatch(ACTION);
    });
  });

  // -------------------------------------------------------------------------------------
  // 4. Tier 1 — the micro-practice
  // -------------------------------------------------------------------------------------
  describe('Tier 1 (microPractice)', () => {
    test('is a reflection, not a guided timer', () => {
      // A reader mid-conflict must not be held inside a countdown, and Tier 1 must render
      // with no timer surface.
      expect(content.microPractice.type).toBe('reflection');
      expect(content.microPractice.duration).toBeUndefined();
    });

    test('has at most six instructions', () => {
      expect(content.microPractice.instructions!.length).toBeGreaterThan(0);
      expect(content.microPractice.instructions!.length).toBeLessThanOrEqual(6);
    });

    test('opens with a body/breath/notice step, not a cognitive reframe', () => {
      expect(content.microPractice.instructions![0]).toMatch(/breath|body|notice|pause/i);
    });

    test('never instructs the reader to deliver a scripted line as a first move', () => {
      // The "I'm noticing I'm getting very activated" line is kept as an OPTION. Made a
      // first instruction it becomes a demand on someone already at capacity.
      expect(content.microPractice.instructions![0]).not.toMatch(/say[: ]/i);
    });
  });

  // -------------------------------------------------------------------------------------
  // 5. The principle-naming contract (domainBindings.ts point 2)
  // -------------------------------------------------------------------------------------
  describe('principle naming', () => {
    const BOUND = ['Interconnected Living', 'Aware Presence'];
    const UNBOUND = ['Sphere Sovereignty', 'Radical Acceptance', 'Virtuous Response'];

    test('names ONLY the two bound principles', () => {
      // A labelling contract, not a content restriction: the protocol leans heavily on
      // dichotomy-of-control material while naming Interconnected Living. Naming the
      // others would break cross-domain differentiation.
      for (const name of UNBOUND) {
        expect(stringified).not.toContain(name);
      }
      expect(BOUND.some((n) => stringified.includes(n))).toBe(true);
    });

    test('never leads with a principle name', () => {
      // Leading with the classical term reproduces the self-translation failure the whole
      // feature exists to remove.
      for (const concept of content.protocol) {
        for (const name of [...BOUND, ...UNBOUND]) {
          expect(concept.title).not.toContain(name);
        }
      }
      for (const name of [...BOUND, ...UNBOUND]) {
        expect(content.protocol[0]!.content).not.toContain(name);
      }
    });

    test('names a bound principle in the LAST protocol concept (Learn cross-reference)', () => {
      const last = content.protocol[content.protocol.length - 1]!;
      const text = `${last.content}${last.learnMore ?? ''}`;
      expect(BOUND.some((n) => text.includes(n))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------------------
  // 6. THE ABUSE-APOLOGETICS GUARD
  // -------------------------------------------------------------------------------------
  describe('abuse-apologetics guard', () => {
    test('A — control framing never ships without the wisdom-requires-action caveat', () => {
      expect(stringified).toMatch(CONTROL);
      expect(stringified).toMatch(ACTION);
    });

    test('B — the caveat is INLINE, in the same concept, not merely co-present', () => {
      // Co-presence is not enough: a caveat three concepts away is one a distressed
      // reader may never reach. The filtered set is asserted non-empty so the loop
      // cannot pass vacuously on content that simply stopped using the framing.
      const usingControl = content.protocol.filter((c) =>
        CONTROL.test(`${c.content}${c.learnMore ?? ''}`)
      );
      expect(usingControl.length).toBeGreaterThan(0);
      for (const concept of usingControl) {
        expect(`${concept.content}${concept.learnMore ?? ''}`).toMatch(ACTION);
      }
    });

    test('C — the escape clause is reachable from Tier 0', () => {
      const tier0 = content.validation.map((v) => v.content).join(' ');
      expect(tier0).toMatch(UNSAFE);
      expect(tier0).toMatch(ROUTE);
    });

    test('D — no hardcoded hotline number anywhere', () => {
      // 988 has a single source of truth in `.env.*`, enforced by
      // `scripts/check-crisis-hotline.js` on prepush. A number frozen into a content
      // asset is a safety string that guard cannot see, and it would go stale silently.
      expect(stringified).not.toMatch(/\b988\b/);
      expect(stringified).not.toMatch(/\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b/);
    });

    test('at least one obstacle is the justice check', () => {
      const justice = content.obstacles.filter(
        (o) => /avoid|tolerat|put up with|stay/i.test(o.question) && /justice/i.test(o.response)
      );
      expect(justice.length).toBeGreaterThan(0);
      expect(justice[0]!.response).toMatch(/leav|report|boundar/i);
    });
  });

  // -------------------------------------------------------------------------------------
  // 7. Banned phrasings + DEBUG-343 translator integrity
  // -------------------------------------------------------------------------------------
  describe('banned phrasings', () => {
    test.each(BANNED)('does not ship $why', ({ pattern }) => {
      expect(stringified).not.toMatch(pattern);
    });
  });

  describe('classical anchor (DEBUG-343)', () => {
    test('cites a public-domain translator for its author', () => {
      const { author, source } = content.classicalAnchor;
      expect(source).toMatch(TRANSLATOR_RE);
      const translator = source!.match(TRANSLATOR_RE)![1]!.trim();
      expect(PUBLIC_DOMAIN_BY_AUTHOR[author]).toContain(translator);
    });

    test.each(IN_COPYRIGHT_PATTERNS)(
      'does not ship $translator ($work)',
      ({ pattern }) => {
        expect(stringified).not.toMatch(pattern);
      }
    );

    test('does not duplicate an anchor already used by a Learn module', () => {
      // Meditations 2.1 is module-5-interconnected-living.json's anchor. Beyond the
      // duplication, its "vexed and to turn away" clause tells a mistreated reader that
      // being upset and walking away is contrary to nature — the abuse-apologetics
      // failure in classical dress.
      expect(content.classicalAnchor.source).not.toMatch(/Meditations 2\.1/);
      expect(stringified).not.toMatch(/vexed and to turn away/i);
    });
  });

  // -------------------------------------------------------------------------------------
  // 8. MATCHER LIVENESS (DEBUG-390)
  //
  // Every negative assertion above can pass by matching nothing at all. These prove each
  // matcher still fires, and that the corpus it runs over is non-trivial. Without this,
  // a future refactor that renamed a field would turn the whole guard green and silent.
  // -------------------------------------------------------------------------------------
  describe('matcher liveness', () => {
    test('the stringified corpus is substantial', () => {
      expect(stringified.length).toBeGreaterThan(2000);
    });

    test.each(BANNED)('the $why matcher fires on a known-bad string', ({ pattern }) => {
      const KNOWN_BAD: Record<string, string> = {
        'reads as suppression; colloquial "stoic" is not Stoicism': 'you should just let it go',
        'dismisses the distress it should validate': "don't let them bother you",
        'acceptance as a first move, before validation': 'just accept what happened',
        'Providence-conflation; a known misattribution': 'everything happens for a reason',
        'tells the reader their reaction is wrong': "you shouldn't feel angry about it",
        'suppression, not equanimity': 'stop feeling that way',
        'directive at a distressed reader': 'you need to calm down',
        'superiority framing, not Stoic': 'try to rise above it',
        'victim-blaming; also a misattribution':
          'no one can hurt you without your permission',
        'Frankl is existentialist/logotherapy — confirmed misattribution':
          'Viktor Frankl, drawing on Stoic principles',
      };
      const sample = KNOWN_BAD[BANNED.find((b) => b.pattern === pattern)!.why]!;
      expect(sample).toMatch(pattern);
    });

    test.each(IN_COPYRIGHT_PATTERNS)('the $translator matcher fires', ({ pattern, work }) => {
      const KNOWN_BAD: Record<string, string> = {
        'Enchiridion 1': 'some things are up to us and some are not',
        'Meditations 5.20': 'what stands in the way becomes the way',
        'Meditations 7.26': 'what good or harm they thought would come of it',
        'Meditations 7.7': 'never be ashamed to need help',
        'Meditations 7.27': 'it would upset you to lose',
        'not Marcus Aurelius': 'we are like the fingers of a hand',
        'Meditations 6.6 — the passage this anchors on': 'the best revenge is not to be like that',
      };
      // Meditations 7.26 has two patterns; the second sample is supplied inline.
      const sample =
        pattern.source === 'sympathy rather than outrage'
          ? 'meet them with sympathy rather than outrage'
          : KNOWN_BAD[work]!;
      expect(sample).toMatch(pattern);
    });

    test('the CONTROL, ACTION, UNSAFE and ROUTE matchers all fire', () => {
      expect('you cannot control what they think').toMatch(CONTROL);
      expect('wisdom requires action as well').toMatch(ACTION);
      expect('if they are hurting you').toMatch(UNSAFE);
      expect('talk to someone you trust').toMatch(ROUTE);
      // ...and do not fire on unrelated prose, so they are discriminating rather than
      // matching everything.
      expect('a neutral sentence about listening well').not.toMatch(CONTROL);
      expect('a neutral sentence about listening well').not.toMatch(UNSAFE);
    });
  });
});
