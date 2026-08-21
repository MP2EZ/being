/**
 * LegalGate Maestro-oracle pin (INFRA-494)
 *
 * `app/.maestro/legal-gate-art9-optional.yaml` is the ONLY automated coverage of
 * this screen's interactions — no other simulator flow ticks a box or presses
 * Continue. That flow cannot verify its own taps by visibility: XCUITest keeps
 * elements that are outside a ScrollView's clip but still on screen, so a clipped
 * checkbox reports 100% visible and `scrollUntilVisible` no-ops (DEBUG-465). Its
 * only un-spoofable oracle is the `legal-consent-*-check` glyph, which renders
 * ONLY when its own consent state is true.
 *
 * WHY THIS PIN EXISTS RATHER THAN TRUSTING THE FLOW. These testIDs have already
 * been deleted once: FEAT-470 added them, and its revert (`6ca5c71f`, dropping
 * the unreliable flow) took them out again as collateral. Nothing noticed,
 * because the flow that depended on them went in the same commit. Maestro is
 * local-only (INFRA-171), so CI cannot catch their removal — this jest pin is
 * the only mechanical guard, and it runs in `test:safety`, i.e. in `precommit`
 * and in the CI "Safety + privacy gates" job.
 *
 * A deleted testID does not fail the Maestro flow loudly either: `notVisible` on
 * a nonexistent id is trivially TRUE, so the flow's `repeat … while` bodies would
 * simply run their swipes and taps to exhaustion and the refusal assertion
 * (`assertNotVisible: legal-consent-mh-processing-check`) would pass vacuously.
 * That is the failure this file makes impossible: every assertion below is
 * written to go red in BOTH directions — absent when unticked, present when
 * ticked — so an id that stops existing cannot read as a pass.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Picker = ({ children, ...props }: never) => React.createElement(View, props, children);
  Picker.Item = (props: never) => React.createElement(View, props);
  return { Picker };
});

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({ verifyAge: jest.fn() }),
  recordLegalGateConsents: jest.fn(),
}));

import CombinedLegalGateScreen from '@/features/consent/screens/CombinedLegalGateScreen';

/** The Art. 9 glyph must be absent at the moment the gate opens. */
const queryGlyph = (get: (id: string) => unknown) => {
  try {
    return get('legal-consent-mh-processing-check');
  } catch {
    return null;
  }
};

const renderScreen = () =>
  render(<CombinedLegalGateScreen onComplete={jest.fn()} onUnderAge={jest.fn()} />);

/** testID of the tappable indicator, and of the glyph that proves it is ticked. */
const CONSENTS = [
  { box: 'legal-consent-tos', check: 'legal-consent-tos-check' },
  { box: 'legal-consent-privacy', check: 'legal-consent-privacy-check' },
  { box: 'legal-consent-wellness', check: 'legal-consent-wellness-check' },
  { box: 'legal-consent-mh-processing', check: 'legal-consent-mh-processing-check' },
] as const;

describe('LegalGate Maestro oracle (INFRA-494)', () => {
  describe.each(CONSENTS)('$box', ({ box, check }) => {
    it('renders no check glyph until the box is ticked, and one after', () => {
      const { queryByTestId, getByTestId } = renderScreen();

      // Both halves matter. The first proves the glyph is a real signal rather
      // than something always present; the second proves the id still exists at
      // all. A rename passes neither.
      expect(queryByTestId(check)).toBeNull();
      fireEvent.press(getByTestId(box));
      expect(queryByTestId(check)).not.toBeNull();
    });

    it('returns to no check glyph when unticked, so the glyph tracks state', () => {
      // Guards the re-tap semantics the flow relies on: its `repeat … while`
      // body is safe only because a second tap cannot happen once the glyph is
      // present. If the glyph ever latched on, a swallowed-tap retry would
      // silently toggle a consent back OFF and the flow would still green.
      const { queryByTestId, getByTestId } = renderScreen();

      fireEvent.press(getByTestId(box));
      expect(queryByTestId(check)).not.toBeNull();
      fireEvent.press(getByTestId(box));
      expect(queryByTestId(check)).toBeNull();
    });
  });

  it('exposes the swipe anchor the flow scrolls from', () => {
    // `legal-gate-age-help` is the only stable node below the DOB picker (which
    // claims any gesture starting inside it) and above the pinned 988 footer.
    // The flow's first swipe anchors here; without it there is no way to reach
    // the first checkbox, which sits below the fold at 375x667.
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('legal-gate-age-help')).not.toBeNull();
  });

  it('releases the gate with Art. 9 REFUSED — the contract, pinned independently of Maestro', () => {
    // The counter above and the gate here are computed SEPARATELY on this screen
    // (`requiredRemaining` is a sum; `requiredConsentsTicked` is a boolean AND), so
    // one assertion cannot cover both: a mutation that made the Art. 9 box required
    // in the GATE only left the count reading "1 remaining" and the counter test
    // green. This asserts the gate itself.
    //
    // The Picker is mocked to a plain View, so its wheel cannot be driven — set the
    // year through the prop the real Picker would call.
    const { getByTestId, getByLabelText } = renderScreen();
    const continueButton = () => getByLabelText('Continue');

    act(() => {
      getByTestId('legal-dob-picker').props.onValueChange(1990);
    });
    fireEvent.press(getByTestId('legal-consent-tos'));
    fireEvent.press(getByTestId('legal-consent-privacy'));

    // Still shut: the wellness disclaimer is a crisis instruction and stays required.
    expect(continueButton().props.accessibilityState.disabled).toBe(true);

    fireEvent.press(getByTestId('legal-consent-wellness'));

    // Open — with `legal-consent-mh-processing` never touched. This is FEAT-470's
    // whole contract: Art. 9 wellness-processing consent is refusable.
    expect(continueButton().props.accessibilityState.disabled).toBe(false);
    expect(queryGlyph(getByTestId)).toBeNull();
  });

  it('counts the outstanding REQUIRED consents, and excludes the Art. 9 box', () => {
    // The flow pins "the wellness disclaimer is still required" by asserting
    // ".*1 remaining.*" with ToS and Privacy ticked — without tapping Continue
    // in a state where the gate must not release. That assertion is only
    // meaningful if the count covers the three required items and ignores the
    // optional Art. 9 one, which is what this asserts.
    const { getByTestId, getByLabelText } = renderScreen();
    const hintOf = () => getByLabelText('Continue').props.accessibilityHint as string | undefined;

    expect(hintOf()).toContain('3 remaining');

    fireEvent.press(getByTestId('legal-consent-tos'));
    expect(hintOf()).toContain('2 remaining');

    fireEvent.press(getByTestId('legal-consent-privacy'));
    expect(hintOf()).toContain('1 remaining');

    // Ticking the OPTIONAL box must not move the counter — if it ever did, the
    // flow's "1 remaining" assertion would no longer mean "wellness is required".
    fireEvent.press(getByTestId('legal-consent-mh-processing'));
    expect(hintOf()).toContain('1 remaining');

    // The third REQUIRED tick clears the consent count — and the hint does NOT go
    // silent, it moves to the remaining blocker. No birth year is selected here, so
    // it names that instead (CombinedLegalGateScreen.tsx:604-608). The flow selects
    // a year FIRST, so at its own "1 remaining" assertion the count branch is the
    // live one; asserting the transition here is what proves the count reaching zero
    // is caused by the wellness tick rather than by the hint disappearing for some
    // unrelated reason.
    fireEvent.press(getByTestId('legal-consent-wellness'));
    expect(hintOf()).toBe('Disabled until you select your birth year.');
  });
});
