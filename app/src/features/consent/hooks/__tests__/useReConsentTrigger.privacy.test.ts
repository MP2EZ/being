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
  CONSENT_BLOCK_STATUSES,
  resolveReConsentPresentation,
  useReConsentTrigger,
  hasShownReConsentThisLaunch,
  __resetReConsentTriggerForTests,
  type ReConsentTriggerInputs,
  type ReConsentPresentation,
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

/**
 * Every condition satisfied. Each case below breaks exactly one of them.
 *
 * `launchStatus` defaults to whatever `consentStatus` is, so a case that does
 * not care about the DEBUG-451 latch reads as if the status were resolved at
 * launch — which is the ordinary situation. Cases that DO exercise the latch
 * override it explicitly.
 */
const passingInputs = (
  overrides: Partial<ReConsentTriggerInputs> = {},
): ReConsentTriggerInputs => {
  const merged = {
    consentStatus: 'version_mismatch' as ConsentStatus,
    base: eligibleBase(),
    onboardingCompleted: true,
    activeRootRoute: 'Main' as string | undefined,
    navigationReady: true,
    shownThisLaunch: false,
    ...overrides,
  };
  return { launchStatus: merged.consentStatus, ...merged };
};

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

  /**
   * Split from a single case by DEBUG-451. These four still resolve 'none':
   * there is nothing to say to them. `loading` and `missing` are pre-resolution
   * states, and `valid` is the happy path.
   */
  it.each<ConsentStatus>(['loading', 'valid', 'missing'])(
    'never triggers, and presents nothing, from status %s',
    (status) => {
      expect(RECONSENT_TRIGGER_STATUSES.has(status)).toBe(false);
      expect(resolveReConsentPresentation(passingInputs({ consentStatus: status }))).toBe('none');
    },
  );

  /**
   * 🔴 DEBUG-451 INVERTED THIS DELIBERATELY — it previously asserted 'none' for
   * these three, which is precisely the defect: an onboarded user in any of them
   * strands at `Main` with no explanation.
   *
   * The half that must NOT change is the first assertion. `RECONSENT_TRIGGER_STATUSES`
   * stays narrow: admitting `revoked` there would arm the `'renew'` path and
   * re-prompt a GDPR Art. 7(3) withdrawal, and admitting `integrity_error` would
   * fabricate a fromVersion → toVersion audit entry off a record we could not
   * read (`consentStore.ts:315-322`). The new statuses resolve on their OWN
   * allowlist to a destination that can grant nothing.
   */
  it.each<ConsentStatus>(['integrity_error', 'revoked', 'under_age'])(
    'never triggers re-consent from status %s, but no longer presents nothing',
    (status) => {
      expect(RECONSENT_TRIGGER_STATUSES.has(status)).toBe(false);
      expect(resolveReConsentPresentation(passingInputs({ consentStatus: status }))).toBe('blocked');
    },
  );
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

describe('resolveReConsentPresentation — the six conditions', () => {
  it('presents when every condition holds', () => {
    expect(resolveReConsentPresentation(passingInputs())).toBe('renew');
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
    it('routes a 15-year-old with isEligible: true to the ineligible destination', () => {
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
      expect(resolveReConsentPresentation(passingInputs({ base: minor }))).toBe('ineligible');
    });

    it('renews at exactly 18 and routes 17 to the ineligible destination (boundary)', () => {
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

      expect(resolveReConsentPresentation(passingInputs({ base: atAge(18) }))).toBe('renew');
      expect(resolveReConsentPresentation(passingInputs({ base: atAge(17) }))).toBe('ineligible');
    });

    /**
     * `isBaseEligibleForRenewal` fails closed on a missing birthYear
     * (`consentStore.ts:738`) — the field is optional and refusing is the only
     * safe reading of "we cannot establish an age". That means the trigger goes
     * permanently silent for such a user, which is deliberate.
     */
    it('routes to ineligible when birthYear is absent (fails closed, not open)', () => {
      const noBirthYear = eligibleBase({
        ageVerification: {
          verified: true,
          ageAtVerification: 30,
          verifiedAt: 1_700_000_000_000,
          isEligible: true,
        },
      });
      expect(resolveReConsentPresentation(passingInputs({ base: noBirthYear }))).toBe('ineligible');
    });

    it('refuses when there is no base record at all', () => {
      expect(resolveReConsentPresentation(passingInputs({ base: null }))).toBe('none');
    });
  });

  describe('(3) onboardingCompleted', () => {
    it('refuses mid-onboarding, so re-consent cannot land on the onboarding flow', () => {
      expect(resolveReConsentPresentation(passingInputs({ onboardingCompleted: false }))).toBe('none');
    });
  });

  describe('(4) shownThisLaunch', () => {
    it('refuses once already presented this launch', () => {
      expect(resolveReConsentPresentation(passingInputs({ shownThisLaunch: true }))).toBe('none');
    });
  });

  describe('(5) navigationReady', () => {
    it('refuses before the navigation container is ready', () => {
      expect(resolveReConsentPresentation(passingInputs({ navigationReady: false }))).toBe('none');
    });
  });

  describe('(6) crisis deferral', () => {
    it.each([...RECONSENT_DEFERRAL_ROUTES])(
      'refuses while %s is the active root route',
      (route) => {
        expect(resolveReConsentPresentation(passingInputs({ activeRootRoute: route }))).toBe('none');
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
      expect(resolveReConsentPresentation(onCrisis)).toBe('none');
      expect(resolveReConsentPresentation({ ...onCrisis, activeRootRoute: 'Main' })).toBe('renew');
    });

    /**
     * `getActiveRootRouteName()` returns undefined before the container is
     * ready. Condition (5) already covers that, but an undefined route must not
     * be treated as "a deferral route" or as a crash.
     */
    it('does not treat an undefined active route as a deferral', () => {
      expect(
        resolveReConsentPresentation(passingInputs({ activeRootRoute: undefined })),
      ).toBe('renew');
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
      expect(resolveReConsentPresentation(passingInputs({ activeRootRoute: 'Main' }))).toBe('renew');
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

  /**
   * 🔄 DEBUG-418 INVERTED THIS TEST, DELIBERATELY.
   *
   * It previously asserted `expect(mockNavigate).not.toHaveBeenCalled()` — that
   * an under-18 holder of a stale record is shown nothing. That WAS the intended
   * behaviour (founder decision D2) and it is the defect: it left them at a `Main`
   * where `canPerformOperation` returns false for every operation, with no prompt
   * and no explanation.
   *
   * They are still excluded from `ReConsentScreen` — that exclusion is what stops
   * a legally meaningless Art. 9(2)(a) affirmation, and it is unchanged. What
   * changed is that the exclusion now has a destination. `ReConsentRoute`
   * re-derives eligibility from the same predicate and mounts the decline-only
   * notice instead, so navigating here does NOT mean they can re-grant.
   */
  it('navigates for an under-18 holder of a stale record (to the ineligible notice)', () => {
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
    expect(mockNavigate).toHaveBeenCalledWith('ReConsent');
    // The launch-scoped flag is consumed on this path too — one presentation
    // attempt per launch, whichever screen it resolves to.
    expect(hasShownReConsentThisLaunch()).toBe(true);
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

/**
 * DEBUG-418 — the stranding, and why a boolean could not express the fix.
 *
 * Before this, "not eligible to renew" and "should see nothing" were the same
 * `false`. That collapse is the defect: a 13-17-year-old on a v1.0.0 record was
 * excluded from the prompt AND given nowhere to go, landing at a `Main` where
 * `canPerformOperation` returns false for every operation with nothing explaining
 * why.
 *
 * These cases pin the distinction itself, not just the new value — asserting
 * `not.toBe('none')` alongside `toBe('ineligible')`, because a future refactor
 * that folds the two back together would still satisfy a bare equality check
 * against whatever single value it kept.
 */
describe('DEBUG-418 — ineligible is a destination, not a silence', () => {
  const minorRecord = (): ConsentRecord =>
    eligibleBase({
      ageVerification: {
        verified: true,
        birthYear: new Date().getFullYear() - 16,
        // Computed under the OLD 13+ rule — the trap this cohort is caught in.
        ageAtVerification: 16,
        verifiedAt: 1_700_000_000_000,
        isEligible: true,
      },
    });

  it('resolves ineligible — and explicitly NOT none — for the titular cohort', () => {
    const result = resolveReConsentPresentation(passingInputs({ base: minorRecord() }));

    expect(result).toBe('ineligible');
    // The load-bearing half: 'none' is what stranded them.
    expect(result).not.toBe('none');
  });

  it('never resolves renew for them, so ReConsentScreen can never mount', () => {
    // ReConsentScreen is the only component that can produce an Art. 9(2)(a)
    // affirmation. Reaching it with this record is the dead end the age
    // predicate exists to prevent, and that must not regress.
    expect(resolveReConsentPresentation(passingInputs({ base: minorRecord() }))).not.toBe('renew');
  });

  it('still defers on a live crisis surface, exactly as the renewable cohort does', () => {
    // The crisis deferral is evaluated BEFORE the age branch, so the ineligible
    // cohort inherits it for free — a minor sitting on CrisisResources is not
    // yanked onto a consent notice either. Asserting it because "for free" is
    // precisely the kind of property a later reorder silently removes.
    for (const route of RECONSENT_DEFERRAL_ROUTES) {
      expect(
        resolveReConsentPresentation(passingInputs({ base: minorRecord(), activeRootRoute: route })),
      ).toBe('none');
    }

    // Anti-vacuity: the loop above proves nothing if the set is empty.
    expect(RECONSENT_DEFERRAL_ROUTES.size).toBeGreaterThan(0);
  });

  it('resolves all three values across the input space, so the type is not vestigial', () => {
    const seen = new Set([
      resolveReConsentPresentation(passingInputs()),
      resolveReConsentPresentation(passingInputs({ base: minorRecord() })),
      resolveReConsentPresentation(passingInputs({ shownThisLaunch: true })),
    ]);
    expect([...seen].sort()).toEqual(['ineligible', 'none', 'renew']);
  });
});

/**
 * DEBUG-451 — the three fail-closed statuses reach a destination.
 *
 * The superset DEBUG-418's investigation surfaced. `CleanRootNavigator`'s
 * `checkInitialRoute` tests `settings?.onboardingCompleted` FIRST and
 * unconditionally, so for any onboarded user the resolved consent status is
 * irrelevant to routing and `integrity_error`, `revoked` and `under_age` all
 * land at `Main`.
 *
 * 🔴 WHY DEBUG-418'S SEAM COULD NOT SIMPLY BE WIDENED. Its resolution is
 * RECORD-driven — it ends at `if (!base) return 'none'`, where `base` is
 * `staleConsent ?? currentConsent`. `loadConsent` nulls BOTH for
 * `integrity_error` (`consentStore.ts:875-885`, and the catch at `:978-995`)
 * and for `revoked` (`:887-897`); only `under_age` (`:918-928`) retains a
 * record. So widening the allowlist alone is a no-op for two of the three. The
 * resolution here is STATUS-driven and returns before that tail.
 */
describe('DEBUG-451 — status-driven destinations for the fail-closed statuses', () => {
  const blockStatuses: ConsentStatus[] = ['integrity_error', 'revoked', 'under_age'];

  describe('CONSENT_BLOCK_STATUSES (allowlist membership)', () => {
    /** Literal, human-written right-hand side — same rationale as the trigger set. */
    it('holds exactly the three fail-closed statuses', () => {
      expect([...CONSENT_BLOCK_STATUSES].sort()).toEqual([
        'integrity_error',
        'revoked',
        'under_age',
      ]);
    });

    it('is non-empty, so the cases below are not vacuous', () => {
      expect(CONSENT_BLOCK_STATUSES.size).toBeGreaterThan(0);
    });

    /**
     * 🔴 THE TWO SETS MUST NEVER INTERSECT. An overlap would mean one status
     * could resolve either to a screen that grants nothing or to `ReConsentScreen`,
     * the only component able to produce an Art. 9(2)(a) affirmation — decided by
     * branch order rather than by law.
     */
    it('is disjoint from RECONSENT_TRIGGER_STATUSES', () => {
      const overlap = [...CONSENT_BLOCK_STATUSES].filter((s) =>
        RECONSENT_TRIGGER_STATUSES.has(s),
      );
      expect(overlap).toEqual([]);
      // Anti-vacuity: both sets have content, so "no overlap" means something.
      expect(RECONSENT_TRIGGER_STATUSES.size).toBeGreaterThan(0);
      expect(CONSENT_BLOCK_STATUSES.size).toBeGreaterThan(0);
    });
  });

  /**
   * 🔴 THE REGRESSION THAT MATTERS MOST. This is the assertion that fails if
   * someone "simplifies" the blocked branch back below the `!base` guard — the
   * exact shape that made DEBUG-418's fix unable to serve these cohorts.
   */
  it.each(blockStatuses)(
    'resolves blocked for %s even with NO consent record at all',
    (status) => {
      const result = resolveReConsentPresentation(
        passingInputs({ consentStatus: status, base: null }),
      );
      expect(result).toBe('blocked');
      // The load-bearing half: 'none' is what stranded them at Main.
      expect(result).not.toBe('none');
    },
  );

  it.each(blockStatuses)(
    'resolves blocked for %s regardless of what a lingering record says',
    (status) => {
      // `revokeConsent` leaves `currentConsent: revokedConsent` in memory —
      // non-null, and `isEligible` still true because it spreads the old record
      // (`consentStore.ts:1417-1423`). A record-driven read would call that
      // renewable and re-prompt an Art. 7(3) withdrawal. Status wins over record.
      expect(
        resolveReConsentPresentation(passingInputs({ consentStatus: status, base: eligibleBase() })),
      ).toBe('blocked');
    },
  );

  /**
   * Crisis deferral, per status × per route, derived by iterating the exported
   * Set so a future member is covered automatically.
   */
  describe('crisis deferral applies identically to all three', () => {
    it.each(
      blockStatuses.flatMap((status) =>
        [...RECONSENT_DEFERRAL_ROUTES].map((route) => [status, route] as const),
      ),
    )('defers %s while %s is the active root route', (status, route) => {
      expect(
        resolveReConsentPresentation(
          passingInputs({ consentStatus: status, base: null, activeRootRoute: route }),
        ),
      ).toBe('none');
    });

    it('is a deferral, not a suppression — presents once the surface is left', () => {
      const onCrisis = passingInputs({
        consentStatus: 'integrity_error',
        base: null,
        activeRootRoute: 'CrisisResources',
      });
      expect(resolveReConsentPresentation(onCrisis)).toBe('none');
      expect(resolveReConsentPresentation({ ...onCrisis, activeRootRoute: 'Main' })).toBe('blocked');
    });

    it('has a non-empty deferral set, so the cases above are not vacuous', () => {
      expect(RECONSENT_DEFERRAL_ROUTES.size).toBeGreaterThan(0);
    });
  });

  /** The launch-scoped flag is SHARED, never per-status — one modal per launch. */
  it.each(blockStatuses)('respects the shared once-per-launch flag for %s', (status) => {
    expect(
      resolveReConsentPresentation(
        passingInputs({ consentStatus: status, base: null, shownThisLaunch: true }),
      ),
    ).toBe('none');
  });

  it.each(blockStatuses)('does not present %s before onboarding completes', (status) => {
    expect(
      resolveReConsentPresentation(
        passingInputs({ consentStatus: status, base: null, onboardingCompleted: false }),
      ),
    ).toBe('none');
  });

  it.each(blockStatuses)('does not present %s before navigation is ready', (status) => {
    expect(
      resolveReConsentPresentation(
        passingInputs({ consentStatus: status, base: null, navigationReady: false }),
      ),
    ).toBe('none');
  });

  /**
   * 🔴 THE MID-SESSION LATCH (DEBUG-451, resolving the blindness this hook's own
   * header warned about).
   *
   * The deferral guard reads the ROOT route only, so it cannot see a nested
   * crisis leaf — the journal crisis banner lives on `VoiceReflection` under
   * `Main`. That was tolerable while `consentStatus` only ever resolved at
   * launch. It no longer is: `PrivacyDataScreen.tsx:183-190` calls `loadConsent()`
   * in a mount effect, so a thrown read flips `valid → integrity_error` mid-session.
   *
   * Rather than widen the deferral to leaf routes, the blocked presentation is
   * latched to the status resolved AT LAUNCH. A mid-session flip therefore cannot
   * present at all; it surfaces on the next launch, when the pre-route window
   * makes a crisis leaf impossible. Fail-safe direction, and far smaller than
   * making the deferral leaf-aware.
   */
  describe('the launch latch', () => {
    it.each(blockStatuses)(
      'does NOT present %s when the status flipped after launch',
      (status) => {
        expect(
          resolveReConsentPresentation(
            passingInputs({ consentStatus: status, base: null, launchStatus: 'valid' }),
          ),
        ).toBe('none');
      },
    );

    it('does not present when the launch status is not yet known', () => {
      expect(
        resolveReConsentPresentation(
          passingInputs({ consentStatus: 'integrity_error', base: null, launchStatus: null }),
        ),
      ).toBe('none');
    });

    it('presents when the status was already resolved at launch', () => {
      expect(
        resolveReConsentPresentation(
          passingInputs({
            consentStatus: 'integrity_error',
            base: null,
            launchStatus: 'integrity_error',
          }),
        ),
      ).toBe('blocked');
    });

    /**
     * The latch must not leak across the re-consent path: `version_mismatch`
     * resolves at launch and is unaffected by this mechanism.
     */
    it('does not gate the renewable path', () => {
      expect(
        resolveReConsentPresentation(passingInputs({ launchStatus: 'valid' })),
      ).toBe('renew');
    });
  });

  it('resolves all four values across the input space, so none is vestigial', () => {
    const seen = new Set<ReConsentPresentation>([
      resolveReConsentPresentation(passingInputs()),
      resolveReConsentPresentation(
        passingInputs({
          base: eligibleBase({
            ageVerification: {
              verified: true,
              birthYear: new Date().getFullYear() - 16,
              ageAtVerification: 16,
              verifiedAt: 1_700_000_000_000,
              isEligible: true,
            },
          }),
        }),
      ),
      resolveReConsentPresentation(passingInputs({ shownThisLaunch: true })),
      resolveReConsentPresentation(passingInputs({ consentStatus: 'revoked', base: null })),
    ]);
    expect([...seen].sort()).toEqual(['blocked', 'ineligible', 'none', 'renew']);
  });
});
