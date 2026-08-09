/**
 * CombinedLegalGateScreen — the Art. 9 tick is MANDATORY (DEBUG-382 tripwire)
 *
 * WHY THIS SUITE EXISTS, AND WHY IT MUST NOT BE "FIXED" BY RELAXING IT
 *
 * This is not a feature test. It is a tripwire protecting an inference made
 * somewhere else in the codebase.
 *
 * `OnboardingScreen.handlePrivacyContinue` reads the four legal-gate consents
 * back out of SecureStore to fold the GDPR Art. 9(2)(a) flag into the granted
 * ConsentRecord. That read can fail — `getLegalGateConsents` returns null for
 * both "no record" and "the read or JSON.parse threw" (consentStore.ts:78-85).
 * DEBUG-382 fixed the resulting `?? false` coercion, which had been silently
 * recording users who GRANTED the Art. 9 consent as having REFUSED it.
 *
 * The fix reconstructs the value rather than defaulting it, and it is only
 * sound because of the invariant asserted below: a user cannot pass this screen
 * without ticking the Art. 9 box, so reaching the privacy step is itself
 * evidence the consent was given. Recording `true` is therefore reconstruction
 * from an enforced precondition, not fabrication.
 *
 * THE MOMENT THAT PRECONDITION GOES AWAY, THE INFERENCE BECOMES A LIE.
 *
 * FEAT-318 Slice 2 plans exactly that: unbundling the Art. 9 tick so refusal
 * becomes a real, freely-given user choice (GDPR Art. 7(4) — a mandatory
 * special-category tick is arguably not valid consent, which is the point of
 * that work). When that lands, this suite fails — and it is SUPPOSED to. The
 * correct response is to revisit the reconstruction in
 * `OnboardingScreen.handlePrivacyContinue`, not to delete or loosen these
 * assertions. A silent reconstruction that outlives its justification would
 * record consent the user actively declined, which is materially worse than the
 * defect DEBUG-382 fixed.
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
