/**
 * A failed legal-gate read must never become a recorded refusal (DEBUG-382)
 *
 * THE DEFECT
 *
 * `CombinedLegalGateScreen` makes the GDPR Art. 9(2)(a) wellness-data processing
 * tick MANDATORY — all four consents are required to advance. Onboarding then
 * reads that decision back out of SecureStore to fold into the granted
 * `ConsentRecord`.
 *
 * `getLegalGateConsents` returns null for BOTH "no record exists" and "the read
 * or JSON.parse threw" — its catch is bare (`consentStore.ts:78-85`). The call
 * site coerced that with `?? false`, so a transient SecureStore hiccup during
 * onboarding permanently recorded a user who had GRANTED the Art. 9 consent as
 * having REFUSED it. Silently: no error, no log, no trace, in the artifact
 * exported for DSR requests and cited in the DPIA as lawful-basis evidence.
 *
 * It is also the loaded gun for FEAT-318's write gate, which blocks on exactly
 * `consentStatus: 'valid'` + `canProcessMentalHealthData: false` — the precise
 * state this bug manufactures, and (the tick being mandatory) the only way that
 * state is reachable today. With that gate shipped, no Settings toggle, and
 * FEAT-332 unbuilt, an affected user would lose all wellness capture with no
 * visible cause and no way back.
 *
 * WHY THIS SUITE IS A SEPARATE FILE
 *
 * `OnboardingScreen.test.tsx` is on the `ci-uncovered-tests.json` allowlist — it
 * matches no CI pattern and runs on no PR. These are the regression tests for a
 * live consent-integrity defect, so they live in a `.privacy.` file that the
 * `Safety + privacy gates` job actually runs (INFRA-368). A regression test that
 * cannot fail a PR is documentation, not a gate.
 *
 * The reconstruction these tests pin depends on the legal gate keeping the Art. 9
 * tick mandatory. That precondition has its own tripwire:
 * `CombinedLegalGateScreen.consentInvariant.privacy.test.tsx`.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
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

async function continueThroughPrivacy(api: Api): Promise<void> {
  fireEvent.press(api.getByLabelText('Continue'));
  await waitFor(() => expect(mockGrantConsent).toHaveBeenCalledTimes(1));
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

describe('an unreadable legal-gate record is never recorded as a refusal', () => {
  it('does NOT record a refusal when the read returns null', async () => {
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueThroughPrivacy(api);

    expect(mockGrantConsent).not.toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: false }),
      expect.anything(),
    );
  });

  it('does NOT record a refusal when the read rejects', async () => {
    mockGetLegalGateConsents.mockRejectedValue(new Error('keychain unavailable'));
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueThroughPrivacy(api);

    expect(mockGrantConsent).not.toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: false }),
      expect.anything(),
    );
  });

  it('reconstructs the grant the mandatory gate proves the user made', async () => {
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueThroughPrivacy(api);

    expect(mockGrantConsent).toHaveBeenCalledWith(
      expect.objectContaining({ mentalHealthProcessingConsent: true }),
      expect.anything(),
    );
  });
});

describe('the read is retried before anything is reconstructed', () => {
  it('retries once, and uses the value the second read returns', async () => {
    // Transient failures dominate. Reconstructing on the first miss would
    // discard a value a second read would have returned truthfully.
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
    // A successful retry is not a reconstruction — nothing to report.
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

describe('the failure is recorded — silence is what let this survive', () => {
  it('logs at high severity, flagged as reconstructed', async () => {
    mockGetLegalGateConsents.mockResolvedValue(null);
    const api = render(<OnboardingScreen />);
    await advanceToPrivacy(api);

    await continueThroughPrivacy(api);

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('legal-gate'),
      'high',
      expect.objectContaining({ reconstructed: true, reconstructedValue: true }),
    );
  });
});

describe('a genuine recorded refusal is passed through untouched', () => {
  it('does not overwrite a `false` that was actually read back', async () => {
    // Only an ABSENT read is reconstructed. If the record is readable and says
    // false, that is the user's answer — and once FEAT-318 Slice 2 makes refusal
    // reachable, this is the case that must survive intact.
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
    expect(mockLogSecurity).not.toHaveBeenCalledWith(
      expect.stringContaining('legal-gate'),
      'high',
      expect.anything(),
    );
  });
});
