/**
 * CombinedLegalGateScreen — the UNBUNDLED consent-capture contract
 *
 * WHY THIS SUITE EXISTS, AND WHY IT MUST NOT BE "FIXED" BY RELAXING IT
 *
 * NOTE (DEBUG-419): this suite no longer underwrites a reconstruction elsewhere.
 * It was written as a tripwire for DEBUG-382's inference — that reaching the
 * privacy step proved the tick had been given, so an unreadable record could be
 * reconstructed as `true`. DEBUG-419 removed that inference: an unreadable record
 * is now re-asked rather than reconstructed in either direction, because a value
 * derived at read time evidences the shape of the code, not the user's act.
 *
 * FEAT-470 UNBUNDLED THE ART. 9 TICK, which is what the previous revision of this
 * suite anticipated and demanded. It asserted the opposite contract — that the
 * Art. 9 tick gated Continue and that withholding it recorded nothing — and its
 * header instructed that when unbundling landed, the correct response was to
 * RE-STATE the capture contract for the unbundled gate, never to delete or loosen
 * the assertions. This file is that re-statement.
 *
 * THE CONTRACT NOW PINNED, in three parts:
 *
 *   1. ToS, Privacy Policy and the wellness disclaimer remain INDIVIDUALLY
 *      mandatory. These are contract terms and a scope acknowledgment, not GDPR
 *      Art. 4(11) consent, so conditioning entry on them is not an Art. 7(4)
 *      problem. The per-consent loop is kept, narrowed from four to three — it
 *      still guards the other direction, so the gate cannot be relaxed wholesale.
 *
 *   2. The Art. 9(2)(a) wellness-processing tick does NOT gate Continue, and
 *      never gates it alone. Bundling the one true special-category consent into
 *      the mandatory set is what made it not freely given; unbundling is the fix.
 *
 *   3. 🔴 EITHER ANSWER IS RECORDED, AND THE RECORDED VALUE TRACKS THE CHECKBOX.
 *      This is the assertion the previous contract had no equivalent of, and it is
 *      the one that matters most. Under the old contract the screen proved the
 *      checkbox was live two ways: Continue went disabled, and nothing was
 *      recorded. Both of those inverted. With `recordLegalGateConsents` now called
 *      unconditionally, a regression that hardcoded `mentalHealthProcessingConsent:
 *      false` regardless of what the user tapped would satisfy every other
 *      assertion here. That is DEBUG-419's fabrication risk exactly, inverted —
 *      fabricating a refusal instead of fabricating a grant — and it is why the
 *      two cases below assert the LITERAL PAYLOAD VALUE in both directions rather
 *      than merely that a call occurred.
 *
 * A recorded `false` IS the affirmative refusal signal. No discriminator field is
 * added: Art. 4(11)/Art. 7 put the "clear affirmative act" burden on GRANTING, so
 * refusal needs no special evidentiary form — the absence of a yes, captured with
 * this record's `timestamp` and `version` on a screen the user demonstrably
 * reached, is the record of non-consent. `isLegalGateConsents` already rejects a
 * record missing the field, so a malformed record can never masquerade as a
 * considered refusal; it reads as null and is re-asked.
 *
 * Filed under `.privacy.` deliberately: that puts it in the `Safety + privacy
 * gates` CI job (INFRA-368), so re-bundling the tick fails a PR rather than
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
/**
 * `verifyAge` must resolve `{ eligible, age }` — NOT `{ isEligible }`.
 *
 * The previous revision mocked `isEligible`, which the screen does not read
 * (`const { eligible, age } = await verifyAge(...)`). That left `eligible`
 * undefined, so every run took the UNDER-AGE branch and never reached
 * `recordLegalGateConsents`. It was invisible because the old contract only ever
 * asserted the call did NOT happen, and a disabled Continue meant it never did.
 * Now that the recorded payload is the point, an under-age mock would silently
 * assert nothing.
 */
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({
    verifyAge: jest.fn().mockResolvedValue({ eligible: true, age: 34 }),
  }),
  recordLegalGateConsents: (...args: unknown[]) => mockRecordLegalGateConsents(...args),
}));

import CombinedLegalGateScreen from '../CombinedLegalGateScreen';

/** The three that remain mandatory. Art. 9 is deliberately NOT in this list. */
const MANDATORY_TEST_IDS = [
  'legal-consent-tos',
  'legal-consent-privacy',
  'legal-consent-wellness',
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

const isDisabled = (api: ReturnType<typeof render>) =>
  continueButton(api).props.accessibilityState?.disabled;

/**
 * Select a birth year. Required before Continue can fire at all — `disabled`
 * reads `!selectedYear` independently of any consent — so every assertion about
 * the RECORDED PAYLOAD must call this first or it asserts against a no-op press.
 */
const selectBirthYear = (api: ReturnType<typeof render>, year = 1992) => {
  fireEvent(api.getByTestId('legal-dob-picker'), 'valueChange', year);
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the three contract acceptances remain individually required', () => {
  it.each(MANDATORY_TEST_IDS)('disables Continue when %s is withheld', (withheld) => {
    const api = renderScreen();
    selectBirthYear(api);

    for (const id of MANDATORY_TEST_IDS) {
      if (id !== withheld) tickBox(api, id);
    }
    tickBox(api, ART9_TEST_ID); // ticked, to prove it cannot substitute for a missing one

    // Not a styling assertion — `disabled` is what actually blocks the press.
    expect(isDisabled(api)).toBe(true);
  });

  it('records all three as true when all three are given', async () => {
    const api = renderScreen();
    selectBirthYear(api);
    for (const id of MANDATORY_TEST_IDS) tickBox(api, id);

    fireEvent.press(continueButton(api));
    await new Promise(process.nextTick);

    expect(mockRecordLegalGateConsents).toHaveBeenCalledWith(
      expect.objectContaining({
        tosAccepted: true,
        privacyAccepted: true,
        wellnessDisclaimerAcknowledged: true,
      }),
    );
  });
});

describe('the Art. 9 wellness-processing tick is optional', () => {
  it('does NOT gate Continue — all three mandatory ticked, Art. 9 withheld, still enabled', () => {
    const api = renderScreen();
    selectBirthYear(api);
    for (const id of MANDATORY_TEST_IDS) tickBox(api, id);

    // The whole point of FEAT-470. Under the previous contract this was `true`.
    expect(isDisabled(api)).toBe(false);
  });

  it('does not gate Continue on its own either — the two gates are independent', () => {
    const api = renderScreen();
    selectBirthYear(api);
    tickBox(api, ART9_TEST_ID);

    // Ticking ONLY Art. 9 must not satisfy the mandatory three. Guards against an
    // unbundling that accidentally made the Art. 9 box the whole gate.
    expect(isDisabled(api)).toBe(true);
  });
});

describe('🔴 the recorded Art. 9 value tracks the checkbox in BOTH directions', () => {
  /**
   * These two are the fabrication guard. Asserting only that a call happened
   * would pass against a screen that hardcoded either value.
   */
  it('records mentalHealthProcessingConsent: true when the tick is GIVEN', async () => {
    const api = renderScreen();
    selectBirthYear(api);
    for (const id of MANDATORY_TEST_IDS) tickBox(api, id);
    tickBox(api, ART9_TEST_ID);

    fireEvent.press(continueButton(api));
    await new Promise(process.nextTick);

    expect(mockRecordLegalGateConsents).toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: true }),
    );
  });

  it('records mentalHealthProcessingConsent: false when the tick is WITHHELD', async () => {
    const api = renderScreen();
    selectBirthYear(api);
    for (const id of MANDATORY_TEST_IDS) tickBox(api, id);
    // Art. 9 deliberately not ticked.

    fireEvent.press(continueButton(api));
    await new Promise(process.nextTick);

    // The affirmative refusal signal. A recorded `false` alongside a timestamp and
    // a policy version IS the Art. 7(1) record of non-consent — this assertion is
    // what makes refusal reachable state rather than an absence.
    expect(mockRecordLegalGateConsents).toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: false }),
    );
  });

  it('proves these assertions can fail — the two payloads are not identical', async () => {
    // Without this, both cases above would pass vacuously if the payload were
    // built from a constant: each asserts only its own value, so a hardcoded
    // `false` satisfies the refusal case and a hardcoded `true` the grant case.
    // Only comparing the two runs against each other catches a constant.
    const refused = renderScreen();
    selectBirthYear(refused);
    for (const id of MANDATORY_TEST_IDS) tickBox(refused, id);
    fireEvent.press(continueButton(refused));
    await new Promise(process.nextTick);
    const refusedPayload = mockRecordLegalGateConsents.mock.calls[0]?.[0];
    refused.unmount();

    jest.clearAllMocks();

    const granted = renderScreen();
    selectBirthYear(granted);
    for (const id of MANDATORY_TEST_IDS) tickBox(granted, id);
    tickBox(granted, ART9_TEST_ID);
    fireEvent.press(continueButton(granted));
    await new Promise(process.nextTick);
    const grantedPayload = mockRecordLegalGateConsents.mock.calls[0]?.[0];

    expect(refusedPayload).toBeDefined();
    expect(grantedPayload).toBeDefined();
    expect(refusedPayload.mentalHealthProcessingConsent).not.toBe(
      grantedPayload.mentalHealthProcessingConsent,
    );
  });
});
