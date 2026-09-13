/**
 * INELIGIBLE-NOTICE CRISIS REACHABILITY (DEBUG-418, AC3)
 *
 * Sited in `app/__tests__/safety/` and NOWHERE ELSE, for a mechanical reason:
 * `npm run test:safety` is
 * `--testPathPattern="(__tests__/safety|__tests__/crisis-safety)"`, which matches
 * the DIRECTORY. A co-located `*.safety.test.tsx` beside the screen would never
 * run in the precommit safety leg — it would look like coverage and be inert.
 *
 * ── WHAT THIS PINS ───────────────────────────────────────────────────────────
 *
 * DEBUG-418 routes a new cohort — a minor, or a user whose age we cannot
 * establish, holding a stale consent record — to a destination they previously
 * never reached. AC3 requires 988 to stay reachable throughout, and this cohort
 * is the worst case for losing it: a minor in an app that is failing closed.
 *
 * The affordance is the ROOT OVERLAY, not anything this screen renders. That
 * holds only because `ReConsent` is absent from `SUPPRESSED_ROUTES`, which is a
 * property of a DIFFERENT file that this change does not touch — exactly the kind
 * of invariant that breaks silently later. Hence this file.
 *
 * ── WHY THE SCREEN OWNS NO CRISIS BLOCK ──────────────────────────────────────
 *
 * Founder decision D1 settled that `ReConsent` renders no crisis section of its
 * own, and `crisis-zero-988-windows.test.tsx` records that adding a SECOND crisis
 * block to a screen that already had one was reverted as making things worse.
 * So the correct state is: root overlay present, in-screen block absent — and
 * both halves are asserted, because either one alone is satisfiable by a broken
 * screen.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SUPPRESSED_ROUTES,
  IMMERSIVE_ROUTES,
} from '@/features/crisis/components/RootCrisisButton';

const SCREEN_PATH = join(
  __dirname,
  '../../src/features/consent/screens/StaleConsentIneligibleScreen.tsx',
);

/**
 * DEBUG-390: strip comments before matching source. This codebase deliberately
 * NAMES anti-patterns in prose to warn the next reader off them, and this
 * screen's own header discusses the crisis affordance at length — so an
 * unstripped assertion would match the explanation and fail on correct code.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('ReConsent route is covered by the root crisis overlay', () => {
  it('is NOT in SUPPRESSED_ROUTES, so the overlay renders over the modal', () => {
    // The whole affordance for this cohort rests on this one fact.
    expect(SUPPRESSED_ROUTES.has('ReConsent')).toBe(false);
  });

  /**
   * Anti-vacuity. `SUPPRESSED_ROUTES.has('ReConsent') === false` is also true of
   * an empty Set, a renamed export, or a `has` that stopped working — all of
   * which would make the assertion above pass while proving nothing. Pin that
   * the set is populated AND that it discriminates on a route we know is in it.
   */
  it('is a populated set that still discriminates', () => {
    expect(SUPPRESSED_ROUTES.size).toBeGreaterThan(0);
    expect(SUPPRESSED_ROUTES.has('LegalGate')).toBe(true);
    expect(SUPPRESSED_ROUTES.has('CrisisResources')).toBe(true);
  });

  /**
   * `immersive` fades the button to FADED_OPACITY. Correct for a meditative
   * practice surface; wrong for a consent notice a minor is being held on, where
   * the affordance should be at full emphasis. `LegalGate` carries the same
   * rule in RootCrisisButton's own docblock.
   */
  it('is NOT in IMMERSIVE_ROUTES, so the overlay is at standard emphasis', () => {
    expect(IMMERSIVE_ROUTES.has('ReConsent')).toBe(false);
    expect(IMMERSIVE_ROUTES.size).toBeGreaterThan(0);
  });
});

describe('the ineligible notice adds no competing crisis affordance', () => {
  const code = stripComments(readFileSync(SCREEN_PATH, 'utf8'));

  it('was actually read and stripped to something substantial', () => {
    // Guard the guard: a stripper that ate the file makes every `not.toMatch`
    // below trivially true.
    expect(code.length).toBeGreaterThan(500);
  });

  it('renders no in-screen crisis block, per founder decision D1', () => {
    // Prop-shaped / call-shaped patterns, not bare identifiers — the header
    // discusses all of these in prose and that is intended.
    expect(code).not.toMatch(/openCrisisUrl\s*\(/);
    expect(code).not.toMatch(/tel:\s*988|['"]988['"]/);
    expect(code).not.toMatch(/CrisisResources/);
    expect(code).not.toMatch(/<\s*CollapsibleCrisisButton/);
    expect(code).not.toMatch(/<\s*Static988Button/);
  });

  it('the matchers can still go red', () => {
    // Without this, a typo in any pattern above yields a permanently-green test
    // that looks like a guarantee.
    expect(stripComments('const x = openCrisisUrl("tel:988");')).toMatch(/openCrisisUrl\s*\(/);
    expect(stripComments('const n = "988";')).toMatch(/['"]988['"]/);
    expect(stripComments('<CollapsibleCrisisButton />')).toMatch(/<\s*CollapsibleCrisisButton/);
  });

  it('a crisis affordance named only in a comment does not count as one', () => {
    // The inverse control: prose mentioning the overlay must NOT satisfy the
    // "has a crisis block" reading, which is what comment-stripping buys.
    const proseOnly = stripComments(`
      // This screen deliberately renders no openCrisisUrl("tel:988") block.
      /* CollapsibleCrisisButton covers this route via the root overlay. */
      export default function Screen() { return null; }
    `);
    expect(proseOnly).not.toMatch(/openCrisisUrl\s*\(/);
    expect(proseOnly).not.toMatch(/<\s*CollapsibleCrisisButton/);
  });
});
