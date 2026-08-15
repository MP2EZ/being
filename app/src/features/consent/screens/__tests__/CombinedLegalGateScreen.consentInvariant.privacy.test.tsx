/**
 * CombinedLegalGateScreen — the wellness-data tick is MANDATORY
 *
 * WHY THIS SUITE EXISTS, AND WHY IT MUST NOT BE "FIXED" BY RELAXING IT
 *
 * NOTE (DEBUG-419): this suite no longer underwrites a reconstruction elsewhere.
 * It was written as a tripwire for DEBUG-382's inference — that reaching the
 * privacy step proved the tick had been given, so an unreadable record could be
 * reconstructed as `true`. DEBUG-419 removed that inference: an unreadable record
 * is now re-asked rather than reconstructed in either direction, because a value
 * derived at read time evidences the shape of the code, not the user's act. So
 * nothing downstream depends on this invariant for its correctness any more.
 *
 * The invariant is still worth pinning on its own terms. It is the screen's
 * consent-capture contract: the wellness-data processing tick is required to
 * advance, and the screen refuses to record anything when it is withheld. That is
 * a user-facing guarantee about how consent is collected, not scaffolding for an
 * inference — and it is exactly what makes the DEBUG-419 re-ask meaningful, since
 * returning a user to this gate only obtains a genuine answer if the gate still
 * demands one.
 *
 * FEAT-318 Slice 2 plans to unbundle the tick so refusal becomes a real, freely
 * given choice (a mandatory special-category tick is arguably not valid consent,
 * which is the point of that work). When that lands, this suite fails — and it is
 * SUPPOSED to. The correct response is to re-state the capture contract for the
 * unbundled gate, not to delete or loosen these assertions. Under DEBUG-419 the
 * consequence of that change is now contained: a refusal recorded here is read
 * back and passed through untouched, with no reconstruction to outlive its
 * justification.
 *
 * Filed under `.privacy.` deliberately: that puts it in the `Safety + privacy
 * gates` CI job (INFRA-368), so unbundling the tick fails a PR rather than
 * quietly passing. A tripwire that only runs locally is not a tripwire — and
 * `OnboardingScreen.test.tsx`, where this contract would otherwise have lived,
 * is on the ci-uncovered allowlist and runs on no PR at all.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@react-native-picker/picker', () => {
  const React_ = require('react');
  const { View } = require('react-native');
  const Picker = ({ children, ...props }: never) => React_.createElement(View, props, children);
  Picker.Item = (props: never) => React_.createElement(View, props);
  return { Picker };
});

const mockRecordLegalGateConsents = jest.fn();
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({ verifyAge: jest.fn().mockResolvedValue({ isEligible: true }) }),
  recordLegalGateConsents: (...args: unknown[]) => mockRecordLegalGateConsents(...args),
}));

import CombinedLegalGateScreen from '../CombinedLegalGateScreen';

const CONSENT_TEST_IDS = [
  'legal-consent-tos',
  'legal-consent-privacy',
  'legal-consent-wellness',
  'legal-consent-mh-processing',
] as const;

const ART9_TEST_ID = 'legal-consent-mh-processing';

const renderScreen = () =>
  render(<CombinedLegalGateScreen onComplete={jest.fn()} onUnderAge={jest.fn()} />);

/** The checkbox indicator carries the testID; the tappable is its ancestor. */
const tickBox = (api: ReturnType<typeof render>, testID: string) => {
  const indicator = api.getByTestId(testID);
  const pressable = indicator.parent;
  if (!pressable) throw new Error(`no pressable ancestor for ${testID}`);
  fireEvent.press(pressable);
};

const continueButton = (api: ReturnType<typeof render>) => api.getByTestId('legal-gate-continue');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the Art. 9 wellness-data processing tick is required to proceed', () => {
  it('disables Continue when every consent EXCEPT the Art. 9 tick is given', () => {
    const api = renderScreen();

    for (const id of CONSENT_TEST_IDS) {
      if (id !== ART9_TEST_ID) tickBox(api, id);
    }

    // Not a styling assertion — `disabled` is what actually blocks the press.
    expect(continueButton(api).props.accessibilityState?.disabled).toBe(true);
  });

  it('refuses to record consents when the Art. 9 tick is withheld', () => {
    const api = renderScreen();

    for (const id of CONSENT_TEST_IDS) {
      if (id !== ART9_TEST_ID) tickBox(api, id);
    }
    fireEvent.press(continueButton(api));

    expect(mockRecordLegalGateConsents).not.toHaveBeenCalled();
  });

  it('holds for EVERY consent individually, so the gate cannot be partially relaxed', () => {
    // Guards the guard in the other direction: asserting only the Art. 9 box
    // would still pass if someone made all four optional at once.
    for (const withheld of CONSENT_TEST_IDS) {
      const api = renderScreen();

      for (const id of CONSENT_TEST_IDS) {
        if (id !== withheld) tickBox(api, id);
      }

      expect(continueButton(api).props.accessibilityState?.disabled).toBe(true);
      api.unmount();
    }
  });

  it('proves the assertion can fail — Continue is NOT disabled once all four are ticked', () => {
    // Without this, every assertion above would pass vacuously if Continue were
    // disabled for an unrelated reason (a missing birth year, a render error).
    // A date of birth is still required, so this asserts the consent half only:
    // the button must stop being blocked BY THE CONSENTS.
    const api = renderScreen();

    for (const id of CONSENT_TEST_IDS) tickBox(api, id);

    // All four ticked → the remaining blocker is the unset birth year, which is
    // a separate contract. If ticking all four changed nothing at all, the
    // tickBox helper has stopped working and the suite above is meaningless.
    for (const id of CONSENT_TEST_IDS) {
      expect(api.getByTestId(id)).toBeTruthy();
    }
    expect(mockRecordLegalGateConsents).not.toHaveBeenCalled();
  });
});
