/**
 * LegalGate consent-state contract pin (INFRA-494)
 *
 * WHAT THIS PINS. The four `legal-consent-*-check` glyphs render ONLY when their own
 * consent state is true, and the gate opens on the THREE required consents with the
 * optional GDPR Art. 9 wellness-processing box left unticked. That second half is
 * FEAT-470's user-visible contract, and until now it was asserted only against a
 * mocked consent store — never against the real gating expression.
 *
 * WHY IT EXISTS INDEPENDENTLY OF ANY MAESTRO FLOW. These testIDs were added by
 * FEAT-470 and removed again by its revert (`6ca5c71f`) as collateral when the flow
 * they served was dropped. Nothing noticed, because the only consumer went in the same
 * commit. `legal-gate-art9-optional.yaml` has since landed and consumes them again —
 * which is exactly when this file matters most, because a flow that CAN go red is also
 * a flow someone can delete.
 *
 * That history is the argument for this file. Maestro is local-only (INFRA-171), so CI
 * can never guard these ids; a jest pin can, and it runs in `test:safety` — i.e. in
 * `precommit` AND the CI "Safety + privacy gates" job. It also makes the contract
 * itself CI-enforced rather than dependent on a flow the gate runs only when a safety
 * path changes, on one developer's machine.
 *
 * Every assertion is written to fail in BOTH directions — absent when unticked,
 * present when ticked — because an id that silently stops existing must not read as a
 * pass. Verified by mutation: deleting a check testID, making Art. 9 required in the
 * gate, and making the wellness tick optional each turn this file red.
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

  it('counts the outstanding REQUIRED consents, and excludes the Art. 9 box', () => {
    // This is the ONLY place "the wellness disclaimer is still required" can be
    // pinned, and that is a measured fact rather than a preference (INFRA-494).
    // The contract lives on the Continue button's accessibilityHint, and iOS does
    // not publish accessibilityHint to XCUITest: on the running Release build every
    // node in this screen's hierarchy reports `hintText: ""`, including the four
    // checkboxes that demonstrably set one. So the Maestro flow's intended
    // `.*1 remaining.*` assertion was one that could never pass, and it is not in
    // `legal-gate-art9-optional.yaml`. Deleting this test does not fall back to
    // on-device coverage — it leaves the contract unpinned anywhere.
    const { getByTestId, getByLabelText } = renderScreen();
    const hintOf = () => getByLabelText('Continue').props.accessibilityHint as string | undefined;

    expect(hintOf()).toContain('3 remaining');

    fireEvent.press(getByTestId('legal-consent-tos'));
    expect(hintOf()).toContain('2 remaining');

    fireEvent.press(getByTestId('legal-consent-privacy'));
    expect(hintOf()).toContain('1 remaining');

    // Ticking the OPTIONAL box must not move the counter — if it ever did, the
    // count would no longer mean "wellness is required", which is the whole
    // reason it is asserted.
    fireEvent.press(getByTestId('legal-consent-mh-processing'));
    expect(hintOf()).toContain('1 remaining');

    // The third REQUIRED tick clears the consent count — and the hint does NOT go
    // silent, it moves to the remaining blocker. No birth year is selected here, so
    // it names that instead (CombinedLegalGateScreen.tsx:604-608). Asserting the
    // transition rather than merely the absence of "1 remaining" is what proves the
    // count reached zero BECAUSE of the wellness tick, rather than the hint having
    // disappeared for some unrelated reason.
    fireEvent.press(getByTestId('legal-consent-wellness'));
    expect(hintOf()).toBe('Disabled until you select your birth year.');
  });
});
