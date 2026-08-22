/**
 * Translator-provenance guard for MARKDOWN surfaces (DEBUG-352)
 *
 * The repo ships only public-domain classical translations — George Long
 * (Marcus Aurelius), Elizabeth Carter (Epictetus), Richard Mott Gummere and
 * Aubrey Stewart (Seneca). Gregory Hays, Robin Hard and Nicholas White are in
 * copyright. DEBUG-330, DEBUG-339 and DEBUG-343 each built a guard for that
 * rule, but all three scan `app/assets/**` only, so nothing watched the
 * markdown — and the markdown is where the worst instances were:
 *
 *   - `README.md` Acknowledgments declared the repo's sources as the Hays
 *     Meditations and the Robin Hard Epictetus: a public, top-level file
 *     asserting the repo uses exactly the two translators its own suites ban.
 *   - `docs/product/stoic-mindfulness/principles/04-virtuous-response.md` and
 *     `docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md` both shipped
 *     the verbatim Hays *Meditations* 5.20 string ("What stands in the way
 *     becomes the way") that four jest suites exist to reject.
 *
 * WHY THE PRINCIPLE DOCS MATTER MOST: the module JSONs were EXTRACTED from
 * them (git d78a6371, "feat: FEAT-49 Complete module content extraction"), and
 * `docs/product/stoic-mindfulness/INDEX.md` calls them "Single source of
 * truth—all updates go to these split files". A defect left here is re-emitted
 * downstream on the next regeneration, which is exactly how the module text
 * DEBUG-343 fixed had drifted in the first place.
 *
 * SCOPE IS DELIBERATELY NARROW. Two markdown surfaces legitimately name the
 * banned translators and must NOT be swept:
 *   - `docs/product/app-store-connect-metadata.md` warns *against* shipping
 *     copyrighted translations and names Hays as the example of what to avoid.
 *   - `docs/product/stoic-mindfulness/operations/resources.md` recommends Hays
 *     and Hard editions to the READER. Recommending a book is a different act
 *     from claiming it as the repo's source; DEBUG-352 added an explicit
 *     separation note there instead of deleting the recommendations.
 * Naming a translator is therefore not the offence. ATTRIBUTING SHIPPED TEXT to
 * one is. The README assertions below check the attribution shape, not mere
 * presence — this file's own README fix names all three banned translators in
 * a sentence stating they are NOT used, and that must keep passing.
 *
 * NOT hoisted into a shared denylist: `practiceQuotes.test.ts:13-22` evaluated
 * and rejected that, because the sibling suites' extraction scopes differ
 * load-bearingly (`passages-4`'s `context` field legitimately contains a banned
 * phrase while explaining it). Each list stays file-local.
 *
 * LOCATION: this lives under `app/__tests__/unit/` on purpose. The three
 * existing provenance suites sit under `app/src/features/<feature>/__tests__/`,
 * which matches NONE of the `--testPathPattern` values CI runs (unit, integration,
 * encryption, security, accessibility, performance) nor precommit's (safety,
 * clinical, unit, privacy) — so they execute only under a bare `npm test`,
 * which nothing automated invokes. Wiring those three in is tracked separately;
 * this guard is placed where it actually runs.
 */

import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const REPO_ROOT = resolve(__dirname, '../../..');
const README = join(REPO_ROOT, 'README.md');
const PRINCIPLES_DIR = join(
  REPO_ROOT,
  'docs/product/stoic-mindfulness/principles'
);
const ARCHITECTURE_DOC = join(
  REPO_ROOT,
  'docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md'
);

/** In-copyright translators. Never the source of a shipped rendering. */
const IN_COPYRIGHT_TRANSLATORS = /Gregory Hays|Robin Hard|Nicholas White/;

/**
 * Renderings verified to be in-copyright, kept as literal patterns so a
 * paraphrase-shaped regression is caught even if no translator is named.
 * `stands in the way becomes the way` is Hays, Meditations 5.20.
 */
const IN_COPYRIGHT_RENDERINGS: ReadonlyArray<{
  pattern: RegExp;
  translator: string;
  work: string;
}> = [
  {
    pattern: /stands in the way becomes the way/i,
    translator: 'Gregory Hays',
    work: 'Meditations 5.20',
  },
  {
    pattern: /The impediment to action advances action/i,
    translator: 'Gregory Hays',
    work: 'Meditations 5.20',
  },
];

/**
 * Nicholas White's Enchiridion 1 idiom. Carter's public-domain rendering — the
 * one the modules and passages ship — reads "in our control". DEBUG-343 removed
 * this downstream; the principle docs are the regeneration source, so it must
 * not survive here or it comes straight back.
 */
const WHITE_IDIOM = /\bup to us\b/i;

const PRINCIPLE_FILES = [
  '01-aware-presence.md',
  '02-radical-acceptance.md',
  '03-sphere-sovereignty.md',
  '04-virtuous-response.md',
  '05-interconnected-living.md',
];

const read = (path: string): string => readFileSync(path, 'utf8');

describe('translator provenance — markdown surfaces (DEBUG-352)', () => {
  // A guard that silently passes because it is pointed at a path that no longer
  // exists is worse than no guard. Assert reachability FIRST, so a moved doc
  // fails loudly here rather than quietly disarming everything below.
  describe('guard reachability', () => {
    it('can see README.md', () => {
      expect(existsSync(README)).toBe(true);
    });

    it('can see the architecture spec', () => {
      expect(existsSync(ARCHITECTURE_DOC)).toBe(true);
    });

    it.each(PRINCIPLE_FILES)('can see principles/%s', (file) => {
      expect(existsSync(join(PRINCIPLES_DIR, file))).toBe(true);
    });
  });

  describe('README Acknowledgments states the translators actually used', () => {
    it('does not attribute a shipped text to an in-copyright translator', () => {
      // Check the ATTRIBUTION SHAPE, not mere presence: the Acknowledgments
      // bullet list is what claims a source. The surrounding prose naming Hays,
      // Hard and White as translators the repo does NOT use is correct and must
      // keep passing.
      const bulletLines = read(README)
        .split('\n')
        .filter((line) => /^\s*-\s/.test(line));

      const offending = bulletLines.filter((line) =>
        IN_COPYRIGHT_TRANSLATORS.test(line)
      );

      expect(offending).toEqual([]);
    });

    it('names each public-domain translator the app ships', () => {
      const readme = read(README);
      // These four are the allowlist enforced by moduleClassicalQuotes.test.ts.
      // If the README stops naming one, the two have drifted apart again.
      expect(readme).toMatch(/George Long/);
      expect(readme).toMatch(/Elizabeth Carter/);
      expect(readme).toMatch(/Gummere/);
      expect(readme).toMatch(/Aubrey Stewart/);
    });
  });

  describe('principle docs (the module-JSON regeneration source)', () => {
    it.each(PRINCIPLE_FILES)('%s names no in-copyright translator', (file) => {
      const path = join(PRINCIPLES_DIR, file);
      expect(IN_COPYRIGHT_TRANSLATORS.test(read(path))).toBe(false);
    });

    it.each(PRINCIPLE_FILES)(
      '%s does not use the "up to us" idiom (Enchiridion 1, Nicholas White)',
      (file) => {
        const path = join(PRINCIPLES_DIR, file);
        expect(WHITE_IDIOM.test(read(path))).toBe(false);
      }
    );
  });

  describe('no in-copyright rendering ships in markdown', () => {
    const surfaces = (): Array<{ label: string; body: string }> => [
      { label: 'README.md', body: read(README) },
      {
        label: 'docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md',
        body: read(ARCHITECTURE_DOC),
      },
      ...PRINCIPLE_FILES.map((file) => ({
        label: `principles/${file}`,
        body: read(join(PRINCIPLES_DIR, file)),
      })),
    ];

    it.each(IN_COPYRIGHT_RENDERINGS)(
      'rejects the $translator rendering of $work',
      ({ pattern }) => {
        const hits = surfaces()
          .filter(({ body }) => pattern.test(body))
          .map(({ label }) => label);

        expect(hits).toEqual([]);
      }
    );
  });
});
