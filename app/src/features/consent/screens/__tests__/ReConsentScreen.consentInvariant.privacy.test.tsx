/**
 * ReConsentScreen — consent invariants (FEAT-376 slice C1)
 *
 * WHY THIS FILE IS SEPARATE FROM `ReConsentScreen.accessibility.test.tsx`:
 * lane, not taste. `npm run test:accessibility` is
 * `jest --testPathPattern=accessibility` and `npm run test:privacy` is
 * `--testPathPattern=privacy`; neither selects the other's file. The assertions
 * below are compliance invariants, and `test:privacy` is what runs in
 * `npm run precommit` AND in the `Safety + privacy gates` CI job inside
 * `ci-pass`. Written into the accessibility file they would never be seen by
 * precommit. Same reasoning as `CombinedLegalGateScreen.consentInvariant.privacy.test.tsx`.
 *
 * The invariants:
 *   1. All EIGHT controls mount unchecked, unconditionally — even when the prior
 *      record had a preference enabled. Pre-checking is the dark pattern
 *      DEBUG-150 removed (`consentStore.ts:16`).
 *   2. Reading the prior record for the notice is DISPLAY ONLY. It may never
 *      widen what is submitted.
 *   3. The Art. 9(2)(a) tick is collected once and written to BOTH records with
 *      the same value.
 *   4. Submit is unreachable until all four document acceptances are ticked.
 *
 * ⚠️ INVARIANT 4 CARRIES A KNOWN, TRACKED DEFECT — see FEAT-475.
 *
 * FEAT-470 unbundled the Art. 9(2)(a) tick on `CombinedLegalGateScreen`, because a
 * mandatory special-category consent is not freely given under Art. 7(4). This screen
 * still bundles it: `allAccepted` (ReConsentScreen.tsx:158-163) requires all four,
 * and refusing here routes through `declineReConsent`, which restricts all FIVE
 * operations rather than just wellness processing — the same conditionality defect,
 * arriving from a version lapse instead of onboarding.
 *
 * It is NOT a live defect and FEAT-470 does not make it one. This screen presents only
 * from `RECONSENT_TRIGGER_STATUSES` (`useReConsentTrigger.ts`), whose sole member is
 * `version_mismatch`; the v1.0.0 cohort is empty, `expired` does not fire until
 * ~2027-05, and FEAT-470 deliberately does not bump `CONSENT_VERSION`. So the bundled
 * gate here is currently unreachable.
 *
 * 🔴 IT MUST BE UNBUNDLED BEFORE EITHER of these ships, whichever comes first:
 *   • the next `CONSENT_VERSION` bump, or
 *   • activation of the FEAT-399 one-year `expired` expiry (~2027-05).
 * Shipping either against this invariant re-opens on this surface exactly the Art. 7(4)
 * defect FEAT-470 closed on the legal gate. Written here rather than left implicit
 * because this is the file that will go red, and because a comment with no tracked
 * item is how this class of trap goes stale — which is precisely how
 * `CombinedLegalGateScreen.consentInvariant.privacy.test.tsx` handed FEAT-470 its own
 * instructions.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReConsentScreen from '../ReConsentScreen';
import type { ConsentDelta, ConsentPreferences } from '@/core/stores/consentStore';

const DELTA: ConsentDelta = {
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  changes: [{ version: '1.1.0', summary: 'We raised the minimum age to use Being to 18.' }],
  changedKeys: ['ageGate', 'mentalHealthProcessingConsent'],
  isKnownVersion: true,
};

/** Everything the user previously had switched ON. The carry-forward trap. */
const ALL_ON: ConsentPreferences = {
  analyticsEnabled: true,
  crashReportsEnabled: true,
  cloudSyncEnabled: true,
  researchEnabled: true,
  mentalHealthProcessingConsent: true,
};

const renderScreen = (overrides: Partial<React.ComponentProps<typeof ReConsentScreen>> = {}) => {
  const onSubmit = jest.fn();
  const onDecline = jest.fn();
  const screen = render(
    <ReConsentScreen
      delta={DELTA}
      currentPreferences={ALL_ON}
      isSubmitting={false}
      errorMessage={null}
      onSubmit={onSubmit}
      onDecline={onDecline}
      {...overrides}
    />,
  );
  return { screen, onSubmit, onDecline };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FEAT-376 · no pre-checked boxes, ever', () => {
  it('mounts all four document acceptances unchecked even though the prior record was fully opted in', () => {
    const { screen } = renderScreen();
    const boxes = screen.getAllByRole('checkbox');

    expect(boxes).toHaveLength(4);
    boxes.forEach((box) => {
      expect(box.props.accessibilityState.checked).toBe(false);
    });
  });

  it('mounts all four optional preferences off even though the prior record had them all on', () => {
    // This is the assertion that catches a "helpful" pre-fill from
    // `currentPreferences`. The prop is display-only; if it ever reaches the
    // toggles' initial state, this goes red.
    const { screen } = renderScreen();
    const switches = screen.getAllByRole('switch');

    expect(switches).toHaveLength(4);
    switches.forEach((toggle) => {
      expect(toggle.props.accessibilityState.checked).toBe(false);
    });
  });

  it('submits every optional preference as false when the user ticks only the required four', () => {
    // The user re-accepts the documents and touches nothing in Group 2. Despite
    // ALL_ON having been their prior state, nothing carries forward.
    const { screen, onSubmit } = renderScreen();
    screen.getAllByRole('checkbox').forEach((box) => fireEvent.press(box));
    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].preferences).toEqual({
      analyticsEnabled: false,
      crashReportsEnabled: false,
      cloudSyncEnabled: false,
      researchEnabled: false,
      mentalHealthProcessingConsent: true,
    });
  });
});

describe('FEAT-376 · the Art. 9 tick reaches both records', () => {
  it('writes the same value into legalGate and preferences', () => {
    const { screen, onSubmit } = renderScreen();
    screen.getAllByRole('checkbox').forEach((box) => fireEvent.press(box));
    fireEvent.press(screen.getByTestId('reconsent-submit'));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.legalGate.mentalHealthProcessingConsent).toBe(true);
    expect(payload.preferences.mentalHealthProcessingConsent).toBe(true);
  });

  it('carries all four document acceptances through', () => {
    const { screen, onSubmit } = renderScreen();
    screen.getAllByRole('checkbox').forEach((box) => fireEvent.press(box));
    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit.mock.calls[0][0].legalGate).toEqual({
      tosAccepted: true,
      privacyAccepted: true,
      wellnessDisclaimerAcknowledged: true,
      mentalHealthProcessingConsent: true,
    });
  });
});

describe('FEAT-376 · submit is gated on all four acceptances', () => {
  it('does not submit with three of four ticked', () => {
    const { screen, onSubmit } = renderScreen();
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.press(boxes[0]);
    fireEvent.press(boxes[1]);
    fireEvent.press(boxes[2]);

    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit when a previously-ticked box is un-ticked again', () => {
    const { screen, onSubmit } = renderScreen();
    const boxes = screen.getAllByRole('checkbox');
    boxes.forEach((box) => fireEvent.press(box));
    fireEvent.press(boxes[3]);

    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('FEAT-376 · the current-preferences notice', () => {
  /**
   * Copy constraint (compliance, 2026-08-12): the notice may state THIS FORM's
   * mechanical effect — an unticked box is written `false`, because
   * `renewConsent` takes all five booleans non-optional and carries none forward
   * — but it may NOT characterise the lapse window (what happens if the user
   * does not re-consent at all). That characterisation is open counsel work and
   * `consentStore.ts:439-443` bars consent copy from pre-empting it.
   */
  it('names the preferences that are currently on', () => {
    const { screen } = renderScreen({
      currentPreferences: { ...ALL_ON, crashReportsEnabled: false, researchEnabled: false },
    });

    const notice = screen.getByTestId('reconsent-current-preferences-notice');
    expect(notice.props.children).toContain('Analytics');
    expect(notice.props.children).toContain('Cloud Backup');
    expect(notice.props.children).not.toContain('Crash Reports');
  });

  it('states this form\'s effect on an unticked box', () => {
    const { screen } = renderScreen();
    expect(screen.getByTestId('reconsent-current-preferences-notice').props.children).toContain(
      'turned off for your account when you submit',
    );
  });

  it('does not assert a state it does not have when currentPreferences is null', () => {
    // `null` means UNKNOWN, not "nothing enabled". Rendering an all-off readout
    // would misrepresent unknown as empty.
    const { screen } = renderScreen({ currentPreferences: null });
    const notice = screen.getByTestId('reconsent-current-preferences-notice').props.children;

    expect(notice).not.toContain('You currently have');
    expect(notice).not.toContain('don\'t currently have');
    // The mechanical-effect sentence stands on its own and stays true either way.
    expect(notice).toContain('turned off for your account when you submit');
  });

  it('says nothing is on rather than listing an empty set', () => {
    const { screen } = renderScreen({
      currentPreferences: {
        analyticsEnabled: false,
        crashReportsEnabled: false,
        cloudSyncEnabled: false,
        researchEnabled: false,
        mentalHealthProcessingConsent: true,
      },
    });

    expect(screen.getByTestId('reconsent-current-preferences-notice').props.children).toContain(
      'don\'t currently have any of these optional preferences on',
    );
  });
});

describe('FEAT-376 · decline is presentational only', () => {
  it('calls onDecline without submitting anything', () => {
    const { screen, onSubmit, onDecline } = renderScreen();

    fireEvent.press(screen.getByTestId('reconsent-decline'));

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('is reachable with zero boxes ticked', () => {
    // A decline must never be gated behind the acceptances it is refusing.
    const { screen, onDecline } = renderScreen();
    expect(screen.getByTestId('reconsent-decline').props.accessibilityState.disabled).toBe(false);
    fireEvent.press(screen.getByTestId('reconsent-decline'));
    expect(onDecline).toHaveBeenCalled();
  });
});
