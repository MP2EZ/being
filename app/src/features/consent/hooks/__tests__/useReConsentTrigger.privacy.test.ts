/**
 * RE-CONSENT TRIGGER — invariant specs (FEAT-417 slice C2)
 *
 * Sited as `*.privacy.test.ts` deliberately. `npm run test:privacy` is
 * `jest --testPathPattern=privacy` and runs in `precommit`, so these specs gate.
 * The inherited FEAT-399 / FEAT-376 rule applies: a store-adjacent consent spec
 * written into `consentStore.test.ts` would be documentation, not a gate — that
 * file is on `app/scripts/ci-uncovered-tests.json` and matches no CI or
 * precommit `--testPathPattern`.
 *
 * What is under test is a LEGAL-BASIS GATE, not a UI convenience. Two of the six
 * conditions exist to stop a specific unlawful outcome:
 *   · the age predicate stops a 13-17-year-old being shown an Art. 9(2)(a)
 *     prompt they cannot lawfully answer (DEBUG-150's 13→18 flip shipped in the
 *     same commit as the 1.0.0→1.1.0 bump, so `isEligible: true` on a v1.0.0
 *     record — the ONLY cohort `version_mismatch` can serve — means "≥13")
 *   · the deferral set stops a consent form being pushed on top of a live
 *     crisis surface
 * Both are tested at their boundaries rather than on a happy path.
 */

const mockNavigate = jest.fn();
let mockNavReady = true;
jest.mock('@/core/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => mockNavReady,
    navigate: (...args: any[]) => mockNavigate(...args),
  },
  getActiveRootRouteName: jest.fn(),
}));

import type { ConsentRecord, ConsentStatus } from '@/core/stores/consentStore';

import React from 'react';
import { render } from '@testing-library/react-native';
import { useConsentStore } from '@/core/stores/consentStore';
import { useSettingsStore } from '@/core/stores/settingsStore';

import {
  RECONSENT_TRIGGER_STATUSES,
  RECONSENT_DEFERRAL_ROUTES,
  shouldPresentReConsent,
  useReConsentTrigger,
  hasShownReConsentThisLaunch,
  __resetReConsentTriggerForTests,
  type ReConsentTriggerInputs,
} from '../useReConsentTrigger';

/**
 * An 18+ v1.0.0 record — the shape the trigger is actually built for.
 *
 * `version` is 1.0.0 because that is the only version `version_mismatch` can be
 * reached from, and `birthYear` is present because `isBaseEligibleForRenewal`
 * fails closed without it (`consentStore.ts:738`).
 */
const eligibleBase = (overrides: Partial<ConsentRecord> = {}): ConsentRecord => ({
  consentId: 'consent_test_eligible',
  userId: 'user_test',
  version: '1.0.0',
  preferences: {
    analyticsEnabled: true,
    crashReportsEnabled: true,
    cloudSyncEnabled: true,
    researchEnabled: false,
    mentalHealthProcessingConsent: true,
  },
  universalOptOut: false,
  ageVerification: {
    verified: true,
    birthYear: 1990,
    ageAtVerification: new Date().getFullYear() - 1990,
    verifiedAt: 1_700_000_000_000,
    isEligible: true,
  },
  timestamp: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  revoked: false,
  ...overrides,
});

/** Every condition satisfied. Each case below breaks exactly one of them. */
const passingInputs = (
  overrides: Partial<ReConsentTriggerInputs> = {},
): ReConsentTriggerInputs => ({
  consentStatus: 'version_mismatch',
  base: eligibleBase(),
  onboardingCompleted: true,
  activeRootRoute: 'Main',
  navigationReady: true,
  shownThisLaunch: false,
  ...overrides,
});

describe('RECONSENT_TRIGGER_STATUSES (allowlist membership)', () => {
  /**
   * A literal snapshot, not a derived one. The right-hand side is written by a
   * human, so ANY widening of the source Set fails this and has to be a
   * deliberate, reviewed edit — which is the entire reason `consentStore.ts:315-322`
   * mandates an allowlist over a denylist for re-consent eligibility.
   */
  it('holds exactly version_mismatch — nothing else', () => {
    expect([...RECONSENT_TRIGGER_STATUSES].sort()).toEqual(['version_mismatch']);
  });

  /**
   * The trigger set is deliberately NARROWER than the store's
   * `RE_CONSENT_ELIGIBLE_STATUSES`, which also admits 'expired'. `expired` is
   * descoped because a single-affirm carry-forward on a pure expiry is the dark
   * pattern DEBUG-150 removed, and because it is unreachable until ~2027-05.
   * Pinned so a future author cannot "align the two lists" and quietly arm it.
   */
  it('excludes expired, even though the store allows re-consent from it', () => {
    expect(RECONSENT_TRIGGER_STATUSES.has('expired')).toBe(false);
  });

  it.each<ConsentStatus>([
    'loading',
    'valid',
    'integrity_error',
    'revoked',
    'missing',
    'under_age',
  ])('never triggers from status %s', (status) => {
    expect(RECONSENT_TRIGGER_STATUSES.has(status)).toBe(false);
    expect(shouldPresentReConsent(passingInputs({ consentStatus: status }))).toBe(false);
  });
});

describe('RECONSENT_DEFERRAL_ROUTES (live crisis surfaces)', () => {
  it('holds exactly the three routes that are live crisis surfaces', () => {
    expect([...RECONSENT_DEFERRAL_ROUTES].sort()).toEqual([
      'AssessmentFlow',
      'CrisisResources',
      'LegalGate',
    ]);
  });

  /**
   * DEBUG-390 falsifier. A Set that silently became empty, and a matcher that
   * matches nothing, look exactly like a passing test. Prove the guard has
   * content before trusting any case that relies on it.
   */
  it('is non-empty, so the deferral cases below are not vacuous', () => {
    expect(RECONSENT_DEFERRAL_ROUTES.size).toBeGreaterThan(0);
  });
});

describe('shouldPresentReConsent — the six conditions', () => {
  it('presents when every condition holds', () => {
    expect(shouldPresentReConsent(passingInputs())).toBe(true);
  });

  describe('(2) the age predicate — NOT the record\'s own isEligible flag', () => {
    /**
     * 🔴 THE CASE THIS WHOLE GATE EXISTS FOR.
     *
     * A 15-year-old holding a v1.0.0 record carries `isEligible: true`, because
     * that flag was computed when the gate was 13+. Trusting it shows them an
     * Art. 9(2)(a) prompt, they affirm, and `renewConsent` then refuses at
     * `consentStore.ts:1174-1180` with `set({ error })` — no throw, no return
     * value, no forward path. A dead end after a legally meaningless
     * affirmation. The trigger must never get them that far.
     */
    it('refuses a 15-year-old whose stale record still claims isEligible: true', () => {
      const fifteen = new Date().getFullYear() - 15;
      const minor = eligibleBase({
        ageVerification: {
          verified: true,
          birthYear: fifteen,
          // Computed under the OLD 13+ rule, which is exactly the trap.
          ageAtVerification: 15,
          verifiedAt: 1_700_000_000_000,
          isEligible: true,
        },
      });

      expect(minor.ageVerification.isEligible).toBe(true);
      expect(shouldPresentReConsent(passingInputs({ base: minor }))).toBe(false);
    });

    it('presents at exactly 18 and refuses at exactly 17 (boundary)', () => {
      const atAge = (age: number): ConsentRecord =>
        eligibleBase({
          ageVerification: {
            verified: true,
            birthYear: new Date().getFullYear() - age,
            ageAtVerification: age,
            verifiedAt: 1_700_000_000_000,
            isEligible: true,
          },
        });

      expect(shouldPresentReConsent(passingInputs({ base: atAge(18) }))).toBe(true);
      expect(shouldPresentReConsent(passingInputs({ base: atAge(17) }))).toBe(false);
    });

    /**
     * `isBaseEligibleForRenewal` fails closed on a missing birthYear
     * (`consentStore.ts:738`) — the field is optional and refusing is the only
     * safe reading of "we cannot establish an age". That means the trigger goes
     * permanently silent for such a user, which is deliberate.
     */
    it('refuses when birthYear is absent (fails closed, not open)', () => {
      const noBirthYear = eligibleBase({
        ageVerification: {
          verified: true,
          ageAtVerification: 30,
          verifiedAt: 1_700_000_000_000,
          isEligible: true,
        },
      });
      expect(shouldPresentReConsent(passingInputs({ base: noBirthYear }))).toBe(false);
    });

    it('refuses when there is no base record at all', () => {
      expect(shouldPresentReConsent(passingInputs({ base: null }))).toBe(false);
    });
  });

  describe('(3) onboardingCompleted', () => {
    it('refuses mid-onboarding, so re-consent cannot land on the onboarding flow', () => {
      expect(shouldPresentReConsent(passingInputs({ onboardingCompleted: false }))).toBe(false);
    });
  });

  describe('(4) shownThisLaunch', () => {
    it('refuses once already presented this launch', () => {
      expect(shouldPresentReConsent(passingInputs({ shownThisLaunch: true }))).toBe(false);
    });
  });

  describe('(5) navigationReady', () => {
    it('refuses before the navigation container is ready', () => {
      expect(shouldPresentReConsent(passingInputs({ navigationReady: false }))).toBe(false);
    });
  });

  describe('(6) crisis deferral', () => {
    it.each([...RECONSENT_DEFERRAL_ROUTES])(
      'refuses while %s is the active root route',
      (route) => {
        expect(shouldPresentReConsent(passingInputs({ activeRootRoute: route }))).toBe(false);
      },
    );

    /**
     * 🔴 DEFERRAL, NOT SUPPRESSION — the property that distinguishes this guard
     * from a permanent skip.
     *
     * `navigationRef.navigate('ReConsent')` while `CrisisResources` is active
     * PUSHES the consent form on top of it (`navigationRef.ts:22-27` reads the
     * top of the root stack). 988 itself survives — `ReConsent` is not in
     * `SUPPRESSED_ROUTES`, so the overlay still renders — but the user is yanked
     * off the resources list, the safety plan and the text-line option onto a
     * consent form. `RootCrisisButton.tsx:190-198` names that exact harm when
     * justifying its own single-flight guard.
     *
     * Reachable, not theoretical: a cold-start `being://crisis` lands on
     * `CrisisResources` (DEBUG-372) while `loadConsent()` is still resolving
     * (`CleanRootNavigator.tsx:215-218`), so the status flip races the landing.
     *
     * The same inputs must therefore go from false to TRUE on nothing but a
     * route change — no flag consumed, no state reset.
     */
    it('presents once the user leaves the crisis surface, same inputs otherwise', () => {
      const onCrisis = passingInputs({ activeRootRoute: 'CrisisResources' });
      expect(shouldPresentReConsent(onCrisis)).toBe(false);
      expect(shouldPresentReConsent({ ...onCrisis, activeRootRoute: 'Main' })).toBe(true);
    });

    /**
     * `getActiveRootRouteName()` returns undefined before the container is
     * ready. Condition (5) already covers that, but an undefined route must not
     * be treated as "a deferral route" or as a crash.
     */
    it('does not treat an undefined active route as a deferral', () => {
      expect(
        shouldPresentReConsent(passingInputs({ activeRootRoute: undefined })),
      ).toBe(true);
    });

    /**
     * The guard reads the ROOT route only, so it is blind to nested leaf
     * surfaces — the journal crisis banner lives on `VoiceReflection` under
     * `Main`, which reads as 'Main' here. Tolerable ONLY because the trigger is
     * launch-scoped and `consentStatus` never returns to `version_mismatch`
     * mid-session. Pinned so the blindness is a recorded fact rather than a
     * surprise for whoever adds re-arming.
     */
    it('reads the root route only — Main is presentable even with a nested surface open', () => {
      expect(shouldPresentReConsent(passingInputs({ activeRootRoute: 'Main' }))).toBe(true);
    });
  });
});

/**
 * The effect half. The predicate above decides; this is what the decision DOES —
 * and the ordering property here (mark before navigate) is not visible from the
 * predicate at all.
 *
 * Drives the REAL stores via `setState` rather than mocking them, so a change to
 * the store's state shape breaks this rather than being papered over by a mock
 * that still matches the old shape. Only `navigationRef` is mocked, because
 * navigating is the side effect under test.
 */
describe('useReConsentTrigger — the effect', () => {
  const Harness: React.FC<{ activeRootRoute?: string | undefined }> = ({ activeRootRoute }) => {
    useReConsentTrigger(activeRootRoute);
    return null;
  };

  const seedTriggerableState = (): void => {
    useConsentStore.setState({
      consentStatus: 'version_mismatch',
      staleConsent: eligibleBase(),
      currentConsent: null,
    });
    useSettingsStore.setState({
      settings: { onboardingCompleted: true } as never,
    });
  };

  beforeEach(() => {
    mockNavigate.mockClear();
    mockNavReady = true;
    __resetReConsentTriggerForTests();
    seedTriggerableState();
  });

  afterAll(() => {
    __resetReConsentTriggerForTests();
  });

  it('navigates to ReConsent when the conditions hold', () => {
    render(React.createElement(Harness, { activeRootRoute: 'Main' }));
    expect(mockNavigate).toHaveBeenCalledWith('ReConsent');
  });

  /**
   * Once per launch, across REMOUNTS — not merely across re-renders. The flag is
   * module scope precisely so a navigator remount cannot re-present.
   */
  it('presents at most once per launch, even across remounts', () => {
    render(React.createElement(Harness, { activeRootRoute: 'Main' })).unmount();
    render(React.createElement(Harness, { activeRootRoute: 'Main' }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('does not navigate before the container is ready', () => {
    mockNavReady = false;
    render(React.createElement(Harness, { activeRootRoute: undefined }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(hasShownReConsentThisLaunch()).toBe(false);
  });

  /**
   * 🔴 DEFERRAL, NOT SUPPRESSION — the effect-level counterpart of the predicate
   * case. Declining to present on a crisis surface must not consume the launch:
   * the same mounted tree must present once the route changes.
   */
  it('defers on a crisis surface without burning the launch, then presents', () => {
    const view = render(React.createElement(Harness, { activeRootRoute: 'CrisisResources' }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(hasShownReConsentThisLaunch()).toBe(false);

    view.rerender(React.createElement(Harness, { activeRootRoute: 'Main' }));
    expect(mockNavigate).toHaveBeenCalledWith('ReConsent');
  });

  /**
   * 🔴 FAIL CLOSED, NEVER THROW. This hook runs in `CleanRootNavigator`'s body;
   * a throw escapes to App.tsx's boundary and replaces the ENTIRE app with the
   * Static988Button fallback. A missing consent prompt is recoverable next
   * launch — a blanked navigator is a 988 degradation.
   *
   * The flag must still be consumed: marking happens BEFORE navigate precisely
   * so a throwing navigate cannot become a retry loop on every state change.
   */
  it('swallows a navigate failure instead of blanking the navigator', () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('navigate exploded');
    });

    expect(() =>
      render(React.createElement(Harness, { activeRootRoute: 'Main' })),
    ).not.toThrow();
    expect(hasShownReConsentThisLaunch()).toBe(true);
  });

  it('does not navigate for an under-18 holder of a stale record', () => {
    useConsentStore.setState({
      staleConsent: eligibleBase({
        ageVerification: {
          verified: true,
          birthYear: new Date().getFullYear() - 15,
          ageAtVerification: 15,
          verifiedAt: 1_700_000_000_000,
          isEligible: true,
        },
      }),
    });
    render(React.createElement(Harness, { activeRootRoute: 'Main' }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('the launch-scoped flag', () => {
  /**
   * Module-scope mutable state does not reset between tests without
   * `resetModules`, so this block re-imports deliberately. Without it the suite
   * is order-dependent and can pass for the wrong reason.
   */
  beforeEach(() => {
    jest.resetModules();
  });

  it('starts unset on a fresh module load, so the first launch presents', async () => {
    const mod = await import('../useReConsentTrigger');
    expect(mod.hasShownReConsentThisLaunch()).toBe(false);
  });

  it('is set by markReConsentShown and cleared only by the test reset', async () => {
    const mod = await import('../useReConsentTrigger');
    mod.markReConsentShown();
    expect(mod.hasShownReConsentThisLaunch()).toBe(true);

    mod.__resetReConsentTriggerForTests();
    expect(mod.hasShownReConsentThisLaunch()).toBe(false);
  });

  /**
   * 🔴 The flag must never be persisted. A persisted flag risks permanently
   * suppressing a legally required prompt — a bug whose symptom is silence, so
   * nothing would ever surface it. This asserts the module reaches for no
   * storage at all rather than trusting the implementation to be careful.
   */
  it('touches no persistence layer', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '../useReConsentTrigger.ts'),
      'utf8',
    );
    // Strip comments first: this file's own prose names the storage modules it
    // must not use, and a bare substring match would hit the warning rather
    // than the code (DEBUG-390).
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    // Guard the guard — prove the stripped source is still substantial and the
    // matcher still fires on a known-bad string.
    expect(code.length).toBeGreaterThan(200);
    expect(/AsyncStorage|SecureStore|expo-secure-store/.test('import AsyncStorage from "x"')).toBe(
      true,
    );

    expect(/AsyncStorage|SecureStore|expo-secure-store/.test(code)).toBe(false);
  });
});
