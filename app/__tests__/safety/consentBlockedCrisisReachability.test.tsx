/**
 * CONSENT-BLOCKED NOTICE CRISIS REACHABILITY (DEBUG-451, AC3)
 *
 * Sited in `app/__tests__/safety/` and NOWHERE ELSE, for a mechanical reason:
 * `npm run test:safety` is
 * `--testPathPattern="(__tests__/safety|__tests__/crisis-safety)"`, which matches
 * the DIRECTORY. A co-located `*.safety.test.tsx` beside the screen would never
 * run in the precommit safety leg — it would look like coverage and be inert.
 *
 * ── WHAT THIS PINS ───────────────────────────────────────────────────────────
 *
 * DEBUG-451 routes three cohorts to a destination they previously never reached:
 * `integrity_error`, `revoked` and `under_age`, all of whom used to strand at
 * `Main`. AC3 requires 988, `CrisisResources` and the crisis store to stay
 * reachable throughout, and these are bad cases to lose it in — a user whose
 * consent record cannot be read at all, and a user we cannot establish is 18+.
 *
 * The affordance is the ROOT OVERLAY, not anything the screen renders. That
 * holds only because `ConsentBlocked` is absent from `SUPPRESSED_ROUTES`, which
 * is a property of a DIFFERENT file that this change does not touch — exactly
 * the kind of invariant that breaks silently later. Hence this file.
 *
 * ── THE OTHER HALF: THE ROUTE MUST STILL BE REACHED ──────────────────────────
 *
 * A crisis-reachability pin alone would stay green if the destination stopped
 * being presented at all — which is the original defect, not a fix. So the
 * resolution cases here assert the two properties that the stranding depended
 * on: that a record-less status still resolves to a destination, and that the
 * crisis deferral still suppresses it on a live crisis surface.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SUPPRESSED_ROUTES,
  IMMERSIVE_ROUTES,
} from '@/features/crisis/components/RootCrisisButton';
import {
  CONSENT_BLOCK_STATUSES,
  RECONSENT_TRIGGER_STATUSES,
  RECONSENT_DEFERRAL_ROUTES,
  resolveReConsentPresentation,
} from '@/features/consent/hooks/useReConsentTrigger';
import type { ConsentStatus } from '@/core/stores/consentStore';

const SCREEN_PATH = join(
  __dirname,
  '../../src/features/consent/screens/ConsentBlockedScreen.tsx',
);
const CRISIS_FEATURE_DIR = join(__dirname, '../../src/features/crisis');

/**
 * DEBUG-390: strip comments before matching source. This codebase deliberately
 * NAMES anti-patterns in prose to warn the next reader off them, and this
 * screen's own header discusses the crisis affordance at length — so an
 * unstripped assertion would match the explanation and fail on correct code.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const blockStatuses = [...CONSENT_BLOCK_STATUSES];

/** Inputs with every condition satisfied for a blocked presentation. */
const blockedInputs = (status: ConsentStatus, activeRootRoute: string | undefined = 'Main') => ({
  consentStatus: status,
  // 🔴 null on purpose. `integrity_error` and `revoked` carry NO record.
  base: null,
  onboardingCompleted: true,
  activeRootRoute,
  navigationReady: true,
  shownThisLaunch: false,
  launchStatus: status,
});

describe('ConsentBlocked route is covered by the root crisis overlay', () => {
  it('is NOT in SUPPRESSED_ROUTES, so the overlay renders over the modal', () => {
    // The whole affordance for these three cohorts rests on this one fact.
    expect(SUPPRESSED_ROUTES.has('ConsentBlocked')).toBe(false);
  });

  /**
   * Anti-vacuity. `has('ConsentBlocked') === false` is also true of an empty
   * Set, a renamed export, or a `has` that stopped working — all of which would
   * make the assertion above pass while proving nothing.
   */
  it('is a populated set that still discriminates', () => {
    expect(SUPPRESSED_ROUTES.size).toBeGreaterThan(0);
    expect(SUPPRESSED_ROUTES.has('LegalGate')).toBe(true);
    expect(SUPPRESSED_ROUTES.has('CrisisResources')).toBe(true);
  });

  /**
   * `immersive` fades the button to FADED_OPACITY. Correct for a meditative
   * practice surface; wrong for a notice explaining that the app is failing
   * closed, where the affordance should be at full emphasis.
   */
  it('is NOT in IMMERSIVE_ROUTES, so the overlay is at standard emphasis', () => {
    expect(IMMERSIVE_ROUTES.has('ConsentBlocked')).toBe(false);
    expect(IMMERSIVE_ROUTES.size).toBeGreaterThan(0);
  });

  /**
   * 🔴 LegalGate was the obvious destination and is the one that would have
   * silently switched 988 off. Pinned as a standing refusal, not just a choice
   * made once: it IS in SUPPRESSED_ROUTES, so routing any of these statuses
   * there would trade the proven root overlay for that screen's own footer.
   */
  it('did not route these statuses to a suppressed destination', () => {
    expect(SUPPRESSED_ROUTES.has('LegalGate')).toBe(true);
    expect(SUPPRESSED_ROUTES.has('ConsentBlocked')).toBe(false);
  });
});

describe('the blocked notice adds no competing crisis affordance', () => {
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
    const proseOnly = stripComments(`
      // This screen deliberately renders no openCrisisUrl("tel:988") block.
      /* CollapsibleCrisisButton covers this route via the root overlay. */
      export default function Screen() { return null; }
    `);
    expect(proseOnly).not.toMatch(/openCrisisUrl\s*\(/);
    expect(proseOnly).not.toMatch(/<\s*CollapsibleCrisisButton/);
  });

  /**
   * 🔴 NO ACCEPT AFFORDANCE ON ANY VARIANT. `revoked` is a GDPR Art. 7(3)
   * withdrawal, so a control that could re-collect consent re-litigates a
   * decision the user already made. Scoped to accessibility labels and testIDs,
   * because the body copy legitimately contains "agree" inside a negation.
   */
  it('exposes no accept, renew or re-enable control', () => {
    expect(code).not.toMatch(/testID=["'][^"']*(accept|renew|re-?enable|consent-grant)/i);
    expect(code).not.toMatch(/accessibilityLabel=["'][^"']*(I agree|Accept|Re-?enable)/i);
    expect(code).not.toMatch(/submitReConsent|renewConsent|grantConsent|updateConsent/);
  });

  it('that accept matcher can still go red', () => {
    expect(stripComments('<Pressable testID="consent-blocked-accept" />')).toMatch(
      /testID=["'][^"']*(accept|renew|re-?enable|consent-grant)/i,
    );
    expect(stripComments('await renewConsent();')).toMatch(/renewConsent/);
  });
});

/**
 * The destination is still REACHED. Without these, every assertion above stays
 * green in the presence of the original defect.
 */
describe('the three fail-closed statuses still resolve to a destination', () => {
  it('has a non-empty status set, so the cases below are not vacuous', () => {
    expect(CONSENT_BLOCK_STATUSES.size).toBeGreaterThan(0);
    expect(blockStatuses.sort()).toEqual(['integrity_error', 'revoked', 'under_age']);
  });

  it.each(blockStatuses)('resolves %s to blocked with no consent record at all', (status) => {
    // The regression that matters: `integrity_error` and `revoked` null BOTH
    // `currentConsent` and `staleConsent`, so a record-driven read returns
    // 'none' — which IS the stranding.
    expect(resolveReConsentPresentation(blockedInputs(status))).toBe('blocked');
  });

  it.each(blockStatuses)('still defers %s on every live crisis surface', (status) => {
    for (const route of RECONSENT_DEFERRAL_ROUTES) {
      expect(resolveReConsentPresentation(blockedInputs(status, route))).toBe('none');
    }
    expect(RECONSENT_DEFERRAL_ROUTES.size).toBeGreaterThan(0);
  });

  /**
   * 🔴 THE ALLOWLIST MUST STAY NARROW. Admitting `revoked` to the re-consent
   * trigger would arm `ReConsentScreen` — the only component that can produce an
   * Art. 9(2)(a) affirmation — for a user who withdrew consent.
   */
  it('did not widen RECONSENT_TRIGGER_STATUSES to achieve this', () => {
    expect([...RECONSENT_TRIGGER_STATUSES].sort()).toEqual(['version_mismatch']);
    const overlap = blockStatuses.filter((s) => RECONSENT_TRIGGER_STATUSES.has(s));
    expect(overlap).toEqual([]);
  });

  /**
   * The launch latch (DEBUG-451). `PrivacyDataScreen` calls `loadConsent()` in a
   * mount effect, so a status can flip mid-session — and the deferral above
   * reads the ROOT route only, so it cannot see a nested crisis leaf such as
   * `VoiceReflection`'s journal-crisis banner under `Main`. A mid-session flip
   * must therefore not present at all.
   */
  it.each(blockStatuses)('does not present %s on a mid-session flip', (status) => {
    expect(
      resolveReConsentPresentation({ ...blockedInputs(status), launchStatus: 'valid' }),
    ).toBe('none');
  });
});

/**
 * 🔴 THE STRUCTURAL GUARANTEE BEHIND `canPerformCrisisIntervention()`.
 *
 * It returns `true` unconditionally as a vital-interests override. That is only
 * trustworthy while `features/crisis/` reads no consent state at all — the
 * moment it imports the store, a consent status can gate a crisis path.
 */
describe('features/crisis reads no consent state', () => {
  const { execSync } = require('child_process') as typeof import('child_process');

  it('imports consentStore zero times', () => {
    const hits = execSync(
      `grep -rl "consentStore" "${CRISIS_FEATURE_DIR}" || true`,
      { encoding: 'utf8' },
    ).trim();
    expect(hits).toBe('');
  });

  it('that grep can still go red', () => {
    // Proves the command, the path and the shell quoting all work — otherwise an
    // empty result means "grep failed", not "no imports".
    const control = execSync(
      `grep -rl "useConsentStore" "${join(__dirname, '../../src/features/consent')}" || true`,
      { encoding: 'utf8' },
    ).trim();
    expect(control.length).toBeGreaterThan(0);
  });
});
