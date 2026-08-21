/**
 * RE-CONSENT ROUTE CONTAINER — invariant specs (FEAT-417 slice C2)
 *
 * Sited `*.privacy.test.tsx` so `npm run test:privacy` picks it up in precommit
 * and in the `Safety + privacy gates` CI job — the siting rule inherited from
 * FEAT-375/399/376 and still binding.
 *
 * The three properties under test, in order of severity:
 *
 *   1. NO DIAGNOSTIC LEAK. `submitReConsent` returns a `stage` and an internal
 *      `message`. Neither may reach the user. `ineligible` in particular can
 *      fire on an AGE failure, and surfacing that would recreate — through a
 *      race — exactly the under-age route founder decision D2 refused to build.
 *   2. NO TRAP. The route is a `transparentModal` with `gestureEnabled: false`
 *      and no header, so it has exactly one exit: this container calling
 *      `onDismiss`. Every terminal path must reach it, including the failure
 *      paths, or the user is stranded on a modal they cannot leave.
 *   3. DISPLAY-ONLY READ. The prior record is passed to the screen for the
 *      "what you currently have on" notice, and for nothing else.
 *
 * `ReConsentScreen` is stubbed rather than rendered: this file is about what the
 * container DECIDES, and the screen's own rendering contract is already pinned
 * by `ReConsentScreen.accessibility.test.tsx` and
 * `ReConsentScreen.consentInvariant.privacy.test.tsx`.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ConsentRecord } from '@/core/stores/consentStore';

/** Props the container handed the screen, captured without rendering it. */
const mockScreenProps: Array<Record<string, any>> = [];
jest.mock('../ReConsentScreen', () => {
  const ReactActual = require('react');
  const { Text: RNText } = require('react-native');
  const Stub = (props: any) => {
    mockScreenProps.push(props);
    return ReactActual.createElement(RNText, { testID: 'reconsent-screen-stub' }, 'stub');
  };
  return { __esModule: true, default: Stub };
});

/**
 * DEBUG-418's destination, stubbed for the same reason as `ReConsentScreen`:
 * this file is about what the container DECIDES. The screen's own rendering
 * contract is pinned by `StaleConsentIneligibleScreen.accessibility.test.tsx`.
 */
const mockIneligibleProps: Array<Record<string, any>> = [];
jest.mock('../StaleConsentIneligibleScreen', () => {
  const ReactActual = require('react');
  const { Text: RNText } = require('react-native');
  const Stub = (props: any) => {
    mockIneligibleProps.push(props);
    return ReactActual.createElement(RNText, { testID: 'ineligible-screen-stub' }, 'stub');
  };
  return { __esModule: true, default: Stub };
});

const mockSubmitReConsent = jest.fn();
jest.mock('../../services/submitReConsent', () => ({
  submitReConsent: (...args: any[]) => mockSubmitReConsent(...args),
}));

const mockDeclineReConsent = jest.fn();
const mockGetConsentDeltaSince = jest.fn();

let mockStoreState: Record<string, any> = {};
/**
 * `isBaseEligibleForRenewal` is mockable so the DEBUG-418 branch can be driven
 * from both sides without constructing birth years. It defaults to TRUE so every
 * pre-existing case keeps exercising the renewable path unchanged — a default of
 * false would silently re-point the whole suite at the ineligible screen and it
 * would still pass, for the wrong reason.
 */
const mockIsBaseEligibleForRenewal = jest.fn(() => true);
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: (selector: (state: any) => unknown) => selector(mockStoreState),
  getConsentDeltaSince: (...args: any[]) => mockGetConsentDeltaSince(...args),
  isBaseEligibleForRenewal: (...args: any[]) => mockIsBaseEligibleForRenewal(...args),
}));

const mockLogError = jest.fn();
jest.mock('@/core/services/logging', () => ({
  logError: (...args: any[]) => mockLogError(...args),
  LogCategory: { SYSTEM: 'SYSTEM' },
}));

import ReConsentRoute from '../ReConsentRoute';

const STALE_PREFERENCES = {
  analyticsEnabled: true,
  crashReportsEnabled: false,
  cloudSyncEnabled: true,
  researchEnabled: false,
  mentalHealthProcessingConsent: true,
};

const staleRecord = (): ConsentRecord =>
  ({
    consentId: 'consent_stale',
    userId: 'user_test',
    version: '1.0.0',
    preferences: STALE_PREFERENCES,
    universalOptOut: false,
    ageVerification: {
      verified: true,
      birthYear: 1990,
      ageAtVerification: 36,
      verifiedAt: 1_700_000_000_000,
      isEligible: true,
    },
    timestamp: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    revoked: false,
  }) as ConsentRecord;

const DELTA = {
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  changes: [{ version: '1.1.0', summary: 'Wellness data handling clarified.' }],
  changedKeys: [],
  isKnownVersion: true,
};

const SUBMISSION = {
  legalGate: {
    tosAccepted: true,
    privacyAccepted: true,
    wellnessDisclaimerAcknowledged: true,
    mentalHealthProcessingConsent: true,
  },
  preferences: {
    analyticsEnabled: false,
    crashReportsEnabled: false,
    cloudSyncEnabled: false,
    researchEnabled: false,
    mentalHealthProcessingConsent: true,
  },
};

describe('ReConsentRoute (FEAT-417 container)', () => {
  let onDismiss: jest.Mock;

  beforeEach(() => {
    mockScreenProps.length = 0;
    mockIneligibleProps.length = 0;
    mockIsBaseEligibleForRenewal.mockReset().mockReturnValue(true);
    mockSubmitReConsent.mockReset();
    mockDeclineReConsent.mockReset().mockResolvedValue(undefined);
    mockGetConsentDeltaSince.mockReset().mockReturnValue(DELTA);
    mockLogError.mockReset();
    onDismiss = jest.fn();
    mockStoreState = {
      staleConsent: staleRecord(),
      currentConsent: null,
      declineReConsent: mockDeclineReConsent,
    };
  });

  describe('wiring the presentational screen', () => {
    it('computes the delta from the stale record version, not the current one', () => {
      render(<ReConsentRoute onDismiss={onDismiss} />);
      expect(mockGetConsentDeltaSince).toHaveBeenCalledWith('1.0.0');
      expect(mockScreenProps[0]?.delta).toBe(DELTA);
    });

    /**
     * `version_mismatch` nulls `currentConsent` and retains the record on
     * `staleConsent`; `expired` does the opposite. `staleConsent ?? currentConsent`
     * is the read `consentStore.ts:351-353` prescribes, and getting it backwards
     * would render an empty delta for the status the trigger actually serves.
     */
    it('falls back to currentConsent when staleConsent is null (the expired shape)', () => {
      mockStoreState = { ...mockStoreState, staleConsent: null, currentConsent: staleRecord() };
      render(<ReConsentRoute onDismiss={onDismiss} />);
      expect(mockGetConsentDeltaSince).toHaveBeenCalledWith('1.0.0');
    });

    /**
     * DISPLAY ONLY. The prior preferences drive the "you currently have X on"
     * notice above Group 2 so an unticked box is an informed choice rather than a
     * silent downgrade. They must never pre-check anything — that is the dark
     * pattern DEBUG-150 removed — but the pre-checking itself is the screen's
     * concern; what the container owes is passing the record through unaltered.
     */
    it('passes the prior preferences through for the display-only notice', () => {
      render(<ReConsentRoute onDismiss={onDismiss} />);
      expect(mockScreenProps[0]?.currentPreferences).toEqual(STALE_PREFERENCES);
    });

    it('starts with no error and not submitting', () => {
      render(<ReConsentRoute onDismiss={onDismiss} />);
      expect(mockScreenProps[0]?.errorMessage).toBeNull();
      expect(mockScreenProps[0]?.isSubmitting).toBe(false);
    });
  });

  describe('submit', () => {
    it('dismisses on success', async () => {
      mockSubmitReConsent.mockResolvedValue({ ok: true });
      render(<ReConsentRoute onDismiss={onDismiss} />);

      await mockScreenProps[0]?.onSubmit(SUBMISSION);

      expect(mockSubmitReConsent).toHaveBeenCalledWith(SUBMISSION);
      await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
    });

    /**
     * 🔴 THE LEAK TEST — the one this file exists for.
     *
     * Every stage collapses to the same user-facing copy. `ineligible` is the
     * dangerous one: `submitReConsent.ts:138-144` returns it on an AGE failure,
     * so a stage-specific message would tell a 15-year-old why they were
     * refused — the under-age route D2 declined to build, reached through a
     * race instead of the front door.
     */
    it.each([
      ['ineligible', 'Age eligibility could not be re-established'],
      ['art9_mismatch', 'Wellness-data consent must be recorded identically in both records'],
      ['legal_gate', 'Failed to record legal acceptances'],
      ['renew', 'Failed to renew consent'],
    ])('shows one generic message on stage %s and leaks no diagnostic', async (stage, message) => {
      mockSubmitReConsent.mockResolvedValue({ ok: false, stage, message });
      render(<ReConsentRoute onDismiss={onDismiss} />);

      await mockScreenProps[0]?.onSubmit(SUBMISSION);

      await waitFor(() => {
        const shown = mockScreenProps[mockScreenProps.length - 1]?.errorMessage as string | null;
        expect(shown).toBeTruthy();
        expect(shown).not.toContain(stage);
        expect(shown).not.toContain(message);
        // No age, eligibility, or which-write-failed hint in any form.
        expect(shown).not.toMatch(/age|eligib|18|minor|mismatch|record/i);
      });
      // A failure must NOT dismiss: the user has to be able to retry.
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('renders the same copy regardless of stage', async () => {
      const shownFor = async (stage: string, message: string): Promise<string> => {
        mockScreenProps.length = 0;
        mockSubmitReConsent.mockResolvedValue({ ok: false, stage, message });
        render(<ReConsentRoute onDismiss={onDismiss} />);
        await mockScreenProps[0]?.onSubmit(SUBMISSION);
        await waitFor(() => expect(mockScreenProps[mockScreenProps.length - 1]?.errorMessage).toBeTruthy());
        return mockScreenProps[mockScreenProps.length - 1]?.errorMessage as string;
      };

      expect(await shownFor('ineligible', 'a')).toBe(await shownFor('renew', 'b'));
    });

    /**
     * `consentStore.ts:522-527` bars consent copy from characterising what
     * happens if the user does not re-consent — the lapse window is open
     * counsel work. Describing the prompt CADENCE ("we'll ask again") is
     * observable and permitted; describing consequences is not.
     */
    it('does not characterise the lapse window', async () => {
      mockSubmitReConsent.mockResolvedValue({ ok: false, stage: 'renew', message: 'x' });
      render(<ReConsentRoute onDismiss={onDismiss} />);
      await mockScreenProps[0]?.onSubmit(SUBMISSION);

      await waitFor(() => expect(mockScreenProps[mockScreenProps.length - 1]?.errorMessage).toBeTruthy());
      const shown = mockScreenProps[mockScreenProps.length - 1]?.errorMessage as string;
      expect(shown).not.toMatch(/restrict|delete|suspend|lose access|days|expire/i);
    });

    it('surfaces the generic message when submitReConsent throws unexpectedly', async () => {
      mockSubmitReConsent.mockRejectedValue(new Error('boom'));
      render(<ReConsentRoute onDismiss={onDismiss} />);

      await mockScreenProps[0]?.onSubmit(SUBMISSION);

      await waitFor(() => expect(mockScreenProps[mockScreenProps.length - 1]?.errorMessage).toBeTruthy());
      expect(mockScreenProps[mockScreenProps.length - 1]?.errorMessage).not.toContain('boom');
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('clears isSubmitting after a failure so the user can retry', async () => {
      mockSubmitReConsent.mockResolvedValue({ ok: false, stage: 'renew', message: 'x' });
      render(<ReConsentRoute onDismiss={onDismiss} />);

      await mockScreenProps[0]?.onSubmit(SUBMISSION);

      await waitFor(() =>
        expect(mockScreenProps[mockScreenProps.length - 1]?.isSubmitting).toBe(false),
      );
    });
  });

  describe('decline', () => {
    it('records the decline, then dismisses', async () => {
      render(<ReConsentRoute onDismiss={onDismiss} />);

      await mockScreenProps[0]?.onDecline();

      expect(mockDeclineReConsent).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
    });

    /**
     * 🔴 NO TRAP. `declineReConsent` writes only an audit entry. If that write
     * fails, the user has still refused — holding them on a screen with no
     * header, no swipe-dismiss and no other exit because OUR audit write failed
     * turns a recorded refusal into a dead end.
     */
    it('dismisses even when recording the decline fails', async () => {
      mockDeclineReConsent.mockRejectedValue(new Error('audit write failed'));
      render(<ReConsentRoute onDismiss={onDismiss} />);

      await mockScreenProps[0]?.onDecline();

      await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
      expect(mockLogError).toHaveBeenCalled();
    });
  });

  describe('no renewable record (the race)', () => {
    /**
     * 🔴 `return null` alone would strand the user: a transparentModal card with
     * no children still covers the screen and swallows touches, over a Main they
     * can see but cannot reach. The only safe failure is to pop the route.
     */
    it('dismisses instead of rendering an empty un-exitable modal', async () => {
      mockStoreState = { ...mockStoreState, staleConsent: null, currentConsent: null };

      const { queryByTestId } = render(<ReConsentRoute onDismiss={onDismiss} />);

      expect(queryByTestId('reconsent-screen-stub')).toBeNull();
      await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
      expect(mockLogError).toHaveBeenCalled();
    });
  });

  describe('telemetry', () => {
    /**
     * 🚫 Ship nothing. `PostHogProvider` gates mounting on
     * `currentConsent?.preferences?.analyticsEnabled`, and `currentConsent` is
     * null for the entire `version_mismatch` window — so no client exists, and
     * any event would describe an interaction that happened before consent did.
     * Asserted against source because the absence of a call is otherwise
     * invisible.
     */
    it('the container reaches for no analytics sink', () => {
      const source = require('fs').readFileSync(
        require('path').join(__dirname, '../ReConsentRoute.tsx'),
        'utf8',
      );
      const code = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

      // Guard the guard (DEBUG-390): this file's own prose names PostHog to
      // explain why it is absent, so a bare match would hit the comment. Prove
      // the stripped source is substantial and the matcher still fires.
      expect(code.length).toBeGreaterThan(500);
      expect(/posthog|captureEvent|trackEvent/i.test('posthog.capture()')).toBe(true);

      expect(/posthog|captureEvent|trackEvent/i.test(code)).toBe(false);
    });
  });
});

/**
 * DEBUG-418 — the container picks the screen, and the choice is structural.
 *
 * `ReConsentScreen` is the ONLY component that can produce an Art. 9(2)(a)
 * affirmation. Deciding here — rather than accepting a route param — means it is
 * never MOUNTED for an ineligible record, so `submitReConsent`'s `'ineligible'`
 * age-failure stage (which this container's own header calls a reachable race)
 * becomes unreachable from this path entirely.
 */
describe('ReConsentRoute — DEBUG-418 ineligible branch', () => {
  let onDismiss: jest.Mock;

  beforeEach(() => {
    mockScreenProps.length = 0;
    mockIneligibleProps.length = 0;
    mockIsBaseEligibleForRenewal.mockReset().mockReturnValue(false);
    mockSubmitReConsent.mockReset();
    mockDeclineReConsent.mockReset().mockResolvedValue(undefined);
    mockGetConsentDeltaSince.mockReset().mockReturnValue(DELTA);
    mockLogError.mockReset();
    onDismiss = jest.fn();
    mockStoreState = {
      staleConsent: staleRecord(),
      currentConsent: null,
      declineReConsent: mockDeclineReConsent,
    };
  });

  it('mounts the ineligible notice and NEVER the renewable screen', () => {
    const { getByTestId, queryByTestId } = render(<ReConsentRoute onDismiss={onDismiss} />);

    expect(getByTestId('ineligible-screen-stub')).toBeTruthy();
    expect(queryByTestId('reconsent-screen-stub')).toBeNull();
    // The load-bearing assertion: the renewable screen was never even
    // constructed, so no Art. 9 affirmation is reachable from this branch.
    expect(mockScreenProps).toHaveLength(0);
  });

  it('passes the delta through, so the user is told what changed', () => {
    render(<ReConsentRoute onDismiss={onDismiss} />);
    expect(mockIneligibleProps[0]?.delta).toBe(DELTA);
  });

  it('gives the notice no submit affordance — only an acknowledge callback', () => {
    render(<ReConsentRoute onDismiss={onDismiss} />);
    const props = mockIneligibleProps[0] ?? {};

    expect(typeof props.onAcknowledge).toBe('function');
    // Nothing on this branch may offer a way to grant consent.
    expect(props.onSubmit).toBeUndefined();
    expect(props.onDecline).toBeUndefined();
  });

  it('records the refusal and dismisses when the user acknowledges', async () => {
    render(<ReConsentRoute onDismiss={onDismiss} />);
    await mockIneligibleProps[0].onAcknowledge();

    expect(mockDeclineReConsent).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses even when the audit write rejects', async () => {
    // Same reasoning as the renewable decline path: holding the user on a screen
    // with no header and no back gesture because OUR write failed would convert a
    // refusal they already made into a trap.
    mockDeclineReConsent.mockRejectedValueOnce(new Error('audit chain unavailable'));
    render(<ReConsentRoute onDismiss={onDismiss} />);
    await mockIneligibleProps[0].onAcknowledge();

    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
    expect(mockLogError).toHaveBeenCalled();
  });

  it('does not fire the refusal on mount — it must be a user act', () => {
    // An auto-fired audit entry fabricates a decision the user did not make,
    // which is the exact inverse of declineReConsent's stated rationale.
    render(<ReConsentRoute onDismiss={onDismiss} />);
    expect(mockDeclineReConsent).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('still fails closed and dismisses when there is no record to explain', () => {
    mockStoreState = { staleConsent: null, currentConsent: null, declineReConsent: mockDeclineReConsent };
    render(<ReConsentRoute onDismiss={onDismiss} />);

    expect(onDismiss).toHaveBeenCalled();
    expect(mockIneligibleProps).toHaveLength(0);
    expect(mockScreenProps).toHaveLength(0);
  });
});
