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
 *   4. Submit is unreachable until the THREE required document acceptances are
 *      ticked. The Art. 9(2)(a) tick is captured and recorded, but never gates.
 *
 * Invariant 4 was "all four" until FEAT-475 unbundled it, closing on this surface
 * the Art. 7(4) freely-given defect FEAT-470 closed on `CombinedLegalGateScreen`.
 *
 * The forward-note FEAT-470 left here also misstated the mechanism, and the
 * correction is worth keeping: refusing does NOT route through `declineReConsent`
 * "restricting all five operations". `declineReConsent` (`consentStore.ts:1293`)
 * writes only an audit entry and mutates no consent state. The over-breadth came
 * from `canPerformOperation` (`consentStore.ts:1549`) failing closed on
 * `consentStatus !== 'valid'` — declining leaves the record stale at
 * `version_mismatch`, so all five died together. Unbundling fixes it precisely
 * because a refusing user now SUBMITS: `renewConsent` writes a `valid` record with
 * `canProcessMentalHealthData: false`, and only `mental_health_processing` is
 * denied. `declineReConsent` is deliberately untouched — its stale-on-purpose
 * behaviour is load-bearing for the next-launch re-prompt
 * (`ReConsentRoute.tsx:128-137`).
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

/**
 * Checkbox order is load-bearing for every index below: Group 1 renders ToS,
 * Privacy, Wellness disclaimer, then Art. 9 LAST. `crisis` ruled the disclaimer
 * (index 2) must never drift into the optional group — it carries this screen's
 * only inline "call 911 or 988" string.
 */
const TOS = 0;
const PRIVACY = 1;
const DISCLAIMER = 2;
const ART9 = 3;

describe('FEAT-475 · the three contract acceptances remain individually required', () => {
  it.each([
    ['Terms of Service', TOS],
    ['Privacy Policy', PRIVACY],
    ['wellness disclaimer', DISCLAIMER],
  ])('does not submit when the %s is the one left unticked', (_label, omitted) => {
    const { screen, onSubmit } = renderScreen();
    const boxes = screen.getAllByRole('checkbox');
    [TOS, PRIVACY, DISCLAIMER].filter((i) => i !== omitted).forEach((i) => fireEvent.press(boxes[i]));

    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  /**
   * 🔴 The comparator, not just the count. Relaxing `=== 4` to `>= 3` while
   * leaving the Art. 9 term in the sum would satisfy every test above — a user
   * could tick Art. 9 plus any two required items and submit WITHOUT the
   * wellness disclaimer. `crisis` named this as the failure mode to pin.
   */
  it('does not submit on Art. 9 plus two required — the count is not interchangeable', () => {
    const { screen, onSubmit } = renderScreen();
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.press(boxes[ART9]);
    fireEvent.press(boxes[TOS]);
    fireEvent.press(boxes[PRIVACY]);

    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit when a previously-ticked REQUIRED box is un-ticked again', () => {
    const { screen, onSubmit } = renderScreen();
    const boxes = screen.getAllByRole('checkbox');
    boxes.forEach((box) => fireEvent.press(box));
    fireEvent.press(boxes[DISCLAIMER]);

    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('FEAT-475 · the Art. 9 wellness-processing tick is optional', () => {
  it('does NOT gate Submit — the three required ticked, Art. 9 withheld, still submits', () => {
    const { screen, onSubmit } = renderScreen();
    const boxes = screen.getAllByRole('checkbox');
    [TOS, PRIVACY, DISCLAIMER].forEach((i) => fireEvent.press(boxes[i]));

    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not gate Submit on its own either — the two gates are independent', () => {
    const { screen, onSubmit } = renderScreen();
    fireEvent.press(screen.getAllByRole('checkbox')[ART9]);

    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('un-ticking Art. 9 after ticking everything still submits', () => {
    const { screen, onSubmit } = renderScreen();
    const boxes = screen.getAllByRole('checkbox');
    boxes.forEach((box) => fireEvent.press(box));
    fireEvent.press(boxes[ART9]);

    fireEvent.press(screen.getByTestId('reconsent-submit'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('🔴 FEAT-475 · the recorded Art. 9 value tracks the checkbox in BOTH directions', () => {
  /**
   * The fabrication guard. An unbundle that silently recorded `true` regardless
   * — or dropped the field from one payload half — would pass every gating test
   * above while destroying the consent record's meaning. `submitReConsent.ts`
   * refuses outright (`art9_mismatch`) if the two halves disagree, so BOTH are
   * asserted, not just one.
   */
  const submitWith = (art9: boolean) => {
    const { screen, onSubmit } = renderScreen();
    const boxes = screen.getAllByRole('checkbox');
    [TOS, PRIVACY, DISCLAIMER].forEach((i) => fireEvent.press(boxes[i]));
    if (art9) fireEvent.press(boxes[ART9]);
    fireEvent.press(screen.getByTestId('reconsent-submit'));
    return onSubmit;
  };

  it('records mentalHealthProcessingConsent: true when the tick is GIVEN', () => {
    const onSubmit = submitWith(true);
    const payload = onSubmit.mock.calls[0][0];

    expect(payload.legalGate.mentalHealthProcessingConsent).toBe(true);
    expect(payload.preferences.mentalHealthProcessingConsent).toBe(true);
  });

  it('records mentalHealthProcessingConsent: false when the tick is WITHHELD', () => {
    const onSubmit = submitWith(false);
    const payload = onSubmit.mock.calls[0][0];

    expect(payload.legalGate.mentalHealthProcessingConsent).toBe(false);
    expect(payload.preferences.mentalHealthProcessingConsent).toBe(false);
  });

  /**
   * Proves the two assertions above can fail. Without this, a payload that hard-coded
   * one value would still satisfy one of them, and a reader could not tell which.
   */
  it('proves these assertions can fail — the two recorded values are not constants', () => {
    const granted = submitWith(true).mock.calls[0][0];
    const withheld = submitWith(false).mock.calls[0][0];

    expect(granted.legalGate.mentalHealthProcessingConsent).not.toBe(
      withheld.legalGate.mentalHealthProcessingConsent,
    );
    expect(granted.preferences.mentalHealthProcessingConsent).not.toBe(
      withheld.preferences.mentalHealthProcessingConsent,
    );
  });

  it('still carries the three required acceptances through as true', () => {
    const payload = submitWith(false).mock.calls[0][0];

    expect(payload.legalGate.tosAccepted).toBe(true);
    expect(payload.legalGate.privacyAccepted).toBe(true);
    expect(payload.legalGate.wellnessDisclaimerAcknowledged).toBe(true);
  });
});

describe('FEAT-376 · the current-preferences notice', () => {
  /**
   * Copy constraint (compliance, 2026-08-12): the notice may state THIS FORM's
   * mechanical effect — an unticked box is written `false`, because
   * `renewConsent` takes all five booleans non-optional and carries none forward
   * — but it may NOT characterise the lapse window (what happens if the user
   * does not re-consent at all). That characterisation is open counsel work and
   * `consentStore.ts:522-527` bars consent copy from pre-empting it.
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
