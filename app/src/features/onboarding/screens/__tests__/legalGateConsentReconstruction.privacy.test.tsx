/**
 * An unreadable legal-gate record is RE-ASKED, never reconstructed (DEBUG-419)
 *
 * THIS SUITE REVERSES DEBUG-382. READ THAT FIRST.
 *
 * DEBUG-382 found that `?? false` at the onboarding call site silently recorded a
 * user who had TICKED the mandatory wellness-data box as having REFUSED it, and
 * fixed it by reconstructing `true` from the enforced gate invariant ("you could
 * not have reached this screen without ticking it"). That diagnosis was right and
 * its fix was a genuine improvement. DEBUG-419 rejects the remedy, not the finding.
 *
 * WHY THE REMEDY WAS WRONG
 *
 * Both `true` and `false` write a DERIVED value into a field whose sole evidentiary
 * purpose is to record a USER ACT. One fabricates a grant, the other fabricates a
 * refusal; neither is what happened. Sensitive-data consent must be DEMONSTRABLE,
 * and demonstrability means the record IS the evidence — a value computed at read
 * time evidences the shape of this code, not the user's decision.
 *
 * The codebase had already adjudicated this exact question for this exact field the
 * same way, at `consentStore.ts` `renewConsent` (FEAT-399): inferring it "would
 * fabricate GDPR Art. 9(2)(a) explicit consent, which requires an affirmative act",
 * and its remedy is to re-ask. Two live paths cannot hold opposite postures on one
 * field's provenance.
 *
 * The gate invariant is in fact STRONGER than DEBUG-382 claimed, and that cuts
 * against reconstruction rather than for it. `CombinedLegalGateScreen` awaits
 * `recordLegalGateConsents` inside a try whose catch does NOT call `onComplete()`,
 * so advancing proves the WRITE SUCCEEDED — not merely that a box was ticked. An
 * unreadable record later therefore means the record was destroyed or corrupted
 * AFTER a successful write: a data-integrity failure of unknown scope, in which you
 * cannot know that only this one field was lost.
 *
 * WHICH LAW ACTUALLY BINDS
 *
 * DEBUG-382's comment and this suite's previous header both named GDPR Art. 9(2)(a)
 * as the operative regime. That is not right for this app. `regulatory-applicability.md`
 * makes GDPR conditional on serving EU users, and the DPIA records minimal EU/EEA
 * presence and deliberately scopes a full Art. 35 DPIA out. What binds is STATE-LAW
 * sensitive-data opt-in consent — TDPSA (Tex. Bus. & Com. Code 541.105(a)), CPA
 * (C.R.S. 6-1-1309), VCDPA (Va. Code 59.1-580), CTDPA (Conn. Pub. Act 22-15 s6) —
 * plus FTC Act s5, because this record is the DSR-export artifact and the DPIA's
 * cited lawful-basis evidence. GDPR Art. 9(2)(a) is the contingent equivalent, where
 * applicable. The standard does NOT relax: all four state laws require a clear
 * affirmative act, so the ruling is unchanged and only the citation is corrected.
 *
 * WHAT THIS SUITE NOW PINS
 *
 * On an unreadable, unparseable, or shape-invalid gate record, onboarding records
 * NOTHING for this field and returns the user to the legal gate to re-capture it.
 * Fail-closed here means RE-ASK — never "brick the user", and never "block crisis
 * access". The gate's 988 footer is unconditional and is the only crisis affordance
 * at that point (LegalGate is in `RootCrisisButton`'s SUPPRESSED_ROUTES), so routing
 * back is safe in the sense DEBUG-341 relies on.
 *
 * WHY THIS SUITE IS A SEPARATE FILE (unchanged from DEBUG-382)
 *
 * `OnboardingScreen.test.tsx` is on the `ci-uncovered-tests.json` allowlist — it
 * matches no CI pattern and runs on no PR. These are the regression tests for a live
 * consent-integrity defect, so they live in a `.privacy.` file that the
 * `Safety + privacy gates` job actually runs (INFRA-368). A regression test that
 * cannot fail a PR is documentation, not a gate.
 *
 * The filename is retained deliberately: this is still the suite that owns the
 * "what happens to an unreadable gate record" question. It now answers it with
 * "nothing is reconstructed" rather than "true is reconstructed".
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace }),
  useFocusEffect: jest.fn(),
}));

const mockGrantConsent = jest.fn<Promise<void>, unknown[]>().mockResolvedValue(undefined);
const mockGetStoredAgeVerification = jest.fn();
const mockGetLegalGateConsents = jest.fn();
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({
    grantConsent: mockGrantConsent,
    getStoredAgeVerification: mockGetStoredAgeVerification,
  }),
  getLegalGateConsents: (...args: unknown[]) => mockGetLegalGateConsents(...args),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackOnboardingStarted: jest.fn(),
    trackOnboardingStepCompleted: jest.fn(),
    trackOnboardingCompleted: jest.fn(),
  }),
}));

jest.mock('@/core/components/shared/BrainIcon', () => {
  const React_ = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => React_.createElement(View, { testID: 'brain-icon' }) };
});
jest.mock('@/core/components/NotificationTimePicker', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/features/crisis/components/CollapsibleCrisisButton', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logPerformance: jest.fn(),
  logError: jest.fn(),
  LogCategory: { SECURITY: 'security' },
}));

import { logSecurity } from '@/core/services/logging';

import OnboardingScreen from '../OnboardingScreen';

const mockLogSecurity = logSecurity as jest.MockedFunction<typeof logSecurity>;

type Api = ReturnType<typeof render>;

const VALID_GATE_RECORD = {
  tosAccepted: true,
  privacyAccepted: true,
  wellnessDisclaimerAcknowledged: true,
  mentalHealthProcessingConsent: true,
  timestamp: 0,
  version: '1.1.0',
};

/** Drive the wizard welcome → privacy; the navigate mock skips both assessments. */
async function advanceToPrivacy(api: Api): Promise<void> {
  fireEvent.press(api.getByLabelText('Begin Your Practice'));
  await waitFor(() => expect(api.getByText('Welcome to Stoic Mindfulness')).toBeTruthy());
  fireEvent.press(api.getByText('Continue'));
  await waitFor(() => expect(api.getByText('Mindfulness Practice Reminders')).toBeTruthy());
  fireEvent.press(api.getByText('Continue'));
  await waitFor(() => expect(api.getByText('Privacy Settings')).toBeTruthy());
}

/** The happy path: the record was readable, so consent is recorded and we move on. */
async function continueThroughPrivacy(api: Api): Promise<void> {
  fireEvent.press(api.getByLabelText('Continue'));
  await waitFor(() => expect(mockGrantConsent).toHaveBeenCalledTimes(1));
}

/** The re-ask path: nothing is recorded, so wait on the route change instead. */
async function continueAndExpectReAsk(api: Api): Promise<void> {
  fireEvent.press(api.getByLabelText('Continue'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('LegalGate'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate.mockImplementation((routeName: string, params?: { onSkip?: () => void }) => {
    if (routeName === 'AssessmentFlow' && params?.onSkip) params.onSkip();
  });
  mockGetStoredAgeVerification.mockResolvedValue({
    verified: true,
    isEligible: true,
    birthYear: 1990,
    ageAtVerification: 35,
    verifiedAt: 0,
  });
  mockGetLegalGateConsents.mockResolvedValue(VALID_GATE_RECORD);
});

describe('an unreadable legal-gate record records NOTHING', () => {
  it('does not record a refusal when the read returns null', async () => {
    // Retained from DEBUG-382 — this was its finding and it still holds.
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueAndExpectReAsk(api);

    expect(mockGrantConsent).not.toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: false }),
      expect.anything(),
    );
  });

  it('does not record a grant either — the reversal of DEBUG-382', async () => {
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueAndExpectReAsk(api);

    expect(mockGrantConsent).not.toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: true }),
      expect.anything(),
    );
  });

  it('writes no consent record at all', async () => {
    // The strongest form of the contract: not "writes the right value" but
    // "declines to write". A later refactor that reintroduces a default would
    // pass both assertions above by writing the OTHER value; this one catches it.
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueAndExpectReAsk(api);

    expect(mockGrantConsent).not.toHaveBeenCalled();
  });

  it('records nothing when the read rejects', async () => {
    mockGetLegalGateConsents.mockRejectedValue(new Error('keychain unavailable'));
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueAndExpectReAsk(api);

    expect(mockGrantConsent).not.toHaveBeenCalled();
  });
});

describe('the user is returned to the legal gate to re-capture the consent', () => {
  it('replaces the route with LegalGate rather than advancing the wizard', async () => {
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueAndExpectReAsk(api);

    expect(mockReplace).toHaveBeenCalledWith('LegalGate');
  });

  it('uses replace, not navigate — the wizard step must not stay on the stack', async () => {
    // A `navigate` would leave Onboarding beneath the gate, so completing the gate
    // would pop back into a half-finished wizard holding stale local consent state.
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueAndExpectReAsk(api);

    expect(mockNavigate).not.toHaveBeenCalledWith('LegalGate', expect.anything());
    expect(mockNavigate).not.toHaveBeenCalledWith('LegalGate');
  });
});

describe('the decision is recorded — silence is what let the original defect survive', () => {
  it('logs at high severity, naming the re-ask as the outcome', async () => {
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueAndExpectReAsk(api);

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('legal-gate'),
      'high',
      expect.objectContaining({ outcome: 'returned-to-legal-gate' }),
    );
  });

  it('no longer claims to have reconstructed anything', async () => {
    // `reconstructed: true` / `reconstructedValue` described the rejected posture.
    // Leaving them in place would make the audit trail describe a fabrication that
    // no longer happens — worse than no field at all.
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueAndExpectReAsk(api);

    expect(mockLogSecurity).not.toHaveBeenCalledWith(
      expect.anything(),
      'high',
      expect.objectContaining({ reconstructed: true }),
    );
  });
});

describe('the read is still retried before anything is concluded', () => {
  it('retries once, and uses the value the second read returns', async () => {
    // Retained from DEBUG-382. Transient failures dominate this call's failure
    // modes, and re-asking on the first miss would send a user back through the
    // gate over a hiccup a second read would have resolved truthfully.
    mockGetLegalGateConsents
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(VALID_GATE_RECORD);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueThroughPrivacy(api);

    expect(mockGetLegalGateConsents).toHaveBeenCalledTimes(2);
    expect(mockGrantConsent).toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: true }),
      expect.anything(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
    // A successful retry is not a failure — nothing to report.
    expect(mockLogSecurity).not.toHaveBeenCalledWith(
      expect.stringContaining('legal-gate'),
      'high',
      expect.anything(),
    );
  });

  it('does not retry when the first read succeeds', async () => {
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueThroughPrivacy(api);

    expect(mockGetLegalGateConsents).toHaveBeenCalledTimes(1);
  });
});

describe('a genuine recorded decision is passed through untouched', () => {
  it('does not overwrite a `false` that was actually read back', async () => {
    // Retained from DEBUG-382, and it matters more under this posture: re-asking is
    // for an ABSENT answer. A readable `false` IS the user's answer, and once
    // FEAT-318 Slice 2 makes refusal reachable, this is the case that must survive.
    mockGetLegalGateConsents.mockResolvedValue({
      ...VALID_GATE_RECORD,
      mentalHealthProcessingConsent: false,
    });
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueThroughPrivacy(api);

    expect(mockGrantConsent).toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: false }),
      expect.anything(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockLogSecurity).not.toHaveBeenCalledWith(
      expect.stringContaining('legal-gate'),
      'high',
      expect.anything(),
    );
  });

  it('passes a readable `true` through without touching it', async () => {
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueThroughPrivacy(api);

    expect(mockGrantConsent).toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: true }),
      expect.anything(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
