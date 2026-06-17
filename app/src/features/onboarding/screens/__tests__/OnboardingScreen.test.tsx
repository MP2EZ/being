/**
 * OnboardingScreen — consent-wizard coverage (MAINT-279)
 *
 * Rewritten to test the CURRENT screen: a 5-step onboarding wizard
 * (welcome → stoicIntro → notifications → privacy → celebration) whose
 * privacy step hosts the FEAT-90 granular-consent toggles. The previous
 * suite tested a removed welcome→PHQ-9→GAD-7 assessment flow (testIDs
 * `welcome-next-button`, `phq9-screen`, `gad7-screen`, `crisis-button`)
 * and never executed — a Jest ESM transform failure on react-native-svg
 * made the whole file fail to load, masking 19 stale tests.
 *
 * SCOPE (onboarding-UI only):
 *  - consent toggles mutate local state and persist via grantConsent() on
 *    "Continue" (not per-toggle), with the GDPR Art. 9 mental-health flag
 *    merged from the legal gate;
 *  - explore-app completion navigation;
 *  - accessibility (roles, labels, ≥44pt targets);
 *  - safety-net reachability — the current screen renders NO interactive
 *    crisis button on any onboarding step (removed by design — "only on
 *    assessment screens for safety"); the privacy step carries the static
 *    988 / 911 lifeline disclaimer, which is what we pin here.
 *
 * NOT covered here (already owned elsewhere — no duplication):
 *  - PHQ-9 / GAD-7 scoring, severity thresholds, Q9 handling, crisis
 *    detection → __tests__/clinical/** and crisis-thresholds.test.ts.
 */

import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

// --- Mocks ---------------------------------------------------------------
// `mock`-prefixed names are read lazily inside the returned closures (at
// render time), so the babel-jest-hoist whitelist + TDZ both stay happy.

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  // The screen reads navigation via the useNavigation() hook, not the
  // `navigation` prop — passing a prop (as the stale suite did) is ignored.
  useNavigation: () => ({ navigate: mockNavigate }),
  // useFocusEffect only drives analytics screen-view tracking here; no-op it.
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

// react-native-svg / datetimepicker are not in transformIgnorePatterns, so
// mock the consumers (not the raw ESM modules) to keep the seam small.
jest.mock('@/core/components/shared/BrainIcon', () => {
  const React_ = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => React_.createElement(View, { testID: 'brain-icon' }) };
});
jest.mock('@/core/components/NotificationTimePicker', () => ({
  __esModule: true,
  default: () => null,
}));
// Imported at module-top but never rendered on any onboarding step.
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

import OnboardingScreen from '../OnboardingScreen';

// --- Helpers -------------------------------------------------------------

type Api = ReturnType<typeof render>;

/** Drive the wizard welcome → privacy. The welcome "Begin" button opens the
 *  PHQ-9 then GAD-7 assessment modals via navigation.navigate; the mock skips
 *  both (onSkip), which advances the wizard to stoicIntro. */
async function advanceToPrivacy(api: Api): Promise<void> {
  fireEvent.press(api.getByLabelText('Begin Your Practice'));
  await waitFor(() => expect(api.getByText('Welcome to Stoic Mindfulness')).toBeTruthy());
  // Press by text and let the event bubble to the parent Pressable — the
  // notifications-step "Continue" carries no accessibilityLabel.
  fireEvent.press(api.getByText('Continue')); // stoicIntro → notifications
  await waitFor(() => expect(api.getByText('Mindfulness Practice Reminders')).toBeTruthy());
  fireEvent.press(api.getByText('Continue')); // notifications → privacy
  await waitFor(() => expect(api.getByText('Privacy Settings')).toBeTruthy());
}

/** Continue past privacy (persists consent) → celebration. */
async function advanceToCelebration(api: Api): Promise<void> {
  await advanceToPrivacy(api);
  fireEvent.press(api.getByLabelText('Continue')); // privacy → celebration
  await waitFor(() => expect(api.getByText('Your Mindfulness Journey Begins')).toBeTruthy());
}

function consentSwitch(api: Api, testID: string) {
  return within(api.getByTestId(testID)).getByRole('switch');
}

describe('OnboardingScreen — consent wizard (MAINT-279)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // navigate() skips the assessment modals so the wizard can advance.
    mockNavigate.mockImplementation((routeName: string, params?: { onSkip?: () => void }) => {
      if (routeName === 'AssessmentFlow' && params?.onSkip) {
        params.onSkip();
      }
    });
    mockGetStoredAgeVerification.mockResolvedValue({
      verified: true,
      isEligible: true,
      birthYear: 1990,
      ageAtVerification: 35,
      verifiedAt: 0,
    });
    mockGetLegalGateConsents.mockResolvedValue({
      tosAccepted: true,
      privacyAccepted: true,
      wellnessDisclaimerAcknowledged: true,
      mentalHealthProcessingConsent: true,
      timestamp: 0,
      version: '1.1.0',
    });
  });

  describe('current screen, not the removed assessment flow', () => {
    it('renders the welcome step and none of the removed assessment-flow surface', () => {
      const api = render(<OnboardingScreen />);

      expect(api.getByLabelText('Begin Your Practice')).toBeTruthy();
      // The removed welcome→PHQ-9→GAD-7 testIDs must no longer resolve.
      expect(api.queryByTestId('welcome-next-button')).toBeNull();
      expect(api.queryByTestId('phq9-screen')).toBeNull();
      expect(api.queryByTestId('gad7-screen')).toBeNull();
      // No interactive crisis button is rendered on onboarding by design.
      expect(api.queryByTestId('crisis-button')).toBeNull();
    });
  });

  describe('granular consent toggles', () => {
    it('defaults every consent toggle to OFF (privacy-first, no pre-checked boxes)', async () => {
      const api = render(<OnboardingScreen />);
      await advanceToPrivacy(api);

      for (const id of ['consent-analytics', 'consent-crash-reports', 'consent-cloud-sync', 'consent-research']) {
        expect(consentSwitch(api, id).props.value).toBe(false);
      }
    });

    it('reflects a toggle in local UI state without persisting until Continue', async () => {
      const api = render(<OnboardingScreen />);
      await advanceToPrivacy(api);

      fireEvent(consentSwitch(api, 'consent-analytics'), 'valueChange', true);

      // UI reflects the change…
      expect(consentSwitch(api, 'consent-analytics').props.value).toBe(true);
      // …but nothing is persisted on the toggle itself.
      expect(mockGrantConsent).not.toHaveBeenCalled();
    });

    it('persists the merged preferences once on Continue, with the Art. 9 flag from the legal gate', async () => {
      const api = render(<OnboardingScreen />);
      await advanceToPrivacy(api);

      fireEvent(consentSwitch(api, 'consent-analytics'), 'valueChange', true);
      fireEvent(consentSwitch(api, 'consent-research'), 'valueChange', true);
      fireEvent.press(api.getByLabelText('Continue'));

      await waitFor(() => expect(mockGrantConsent).toHaveBeenCalledTimes(1));
      expect(mockGrantConsent).toHaveBeenCalledWith(
        expect.objectContaining({
          analyticsEnabled: true,
          researchEnabled: true,
          crashReportsEnabled: false,
          cloudSyncEnabled: false,
          // Sourced from getLegalGateConsents(), not a toggle.
          mentalHealthProcessingConsent: true,
        }),
        expect.objectContaining({ verified: true, isEligible: true }),
      );
    });

    it('still advances (consent is optional) when no age verification is stored', async () => {
      mockGetStoredAgeVerification.mockResolvedValue(null);
      const api = render(<OnboardingScreen />);
      await advanceToPrivacy(api);

      fireEvent.press(api.getByLabelText('Continue'));

      // grantConsent is gated on stored age verification; absent it, the
      // flow logs and proceeds without granting.
      await waitFor(() => expect(api.getByText('Your Mindfulness Journey Begins')).toBeTruthy());
      expect(mockGrantConsent).not.toHaveBeenCalled();
    });
  });

  describe('completion navigation', () => {
    it('invokes the embedded completion handler with "home" when Explore App is pressed', async () => {
      const onComplete = jest.fn();
      const api = render(<OnboardingScreen isEmbedded onComplete={onComplete} />);
      await advanceToCelebration(api);

      fireEvent.press(api.getByTestId('onboarding-explore-app'));

      await waitFor(() => expect(onComplete).toHaveBeenCalledWith('home'));
    });
  });

  describe('accessibility', () => {
    it('exposes the welcome CTA as a labelled button with a ≥44pt touch target', () => {
      const api = render(<OnboardingScreen />);
      const begin = api.getByLabelText('Begin Your Practice');

      expect(begin.props.accessibilityRole).toBe('button');
      expect(begin.props.accessibilityHint).toBeTruthy();

      const flat = StyleSheet.flatten(begin.props.style) as { minHeight?: number; minWidth?: number };
      expect(flat.minHeight).toBeGreaterThanOrEqual(44);
      expect(flat.minWidth).toBeGreaterThanOrEqual(44);
    });

    it('gives each consent toggle a screen-reader role and label', async () => {
      const api = render(<OnboardingScreen />);
      await advanceToPrivacy(api);

      for (const id of ['consent-analytics', 'consent-crash-reports', 'consent-cloud-sync', 'consent-research']) {
        const sw = consentSwitch(api, id);
        expect(sw.props.accessibilityRole).toBe('switch');
        expect(sw.props.accessibilityLabel).toBeTruthy();
      }
    });

    it('exposes the Explore App control as a labelled button with a ≥44pt touch target', async () => {
      const api = render(<OnboardingScreen isEmbedded onComplete={jest.fn()} />);
      await advanceToCelebration(api);

      const explore = api.getByTestId('onboarding-explore-app');
      expect(explore.props.accessibilityRole).toBe('button');
      expect(explore.props.accessibilityLabel).toBe('Explore App');
      const flat = StyleSheet.flatten(explore.props.style) as { minHeight?: number; minWidth?: number };
      expect(flat.minHeight).toBeGreaterThanOrEqual(44);
      expect(flat.minWidth).toBeGreaterThanOrEqual(44);
    });
  });

  describe('safety-net reachability', () => {
    it('shows the static 988 / 911 lifeline disclaimer on the privacy step', async () => {
      const api = render(<OnboardingScreen />);
      await advanceToPrivacy(api);

      // The current onboarding screens render no interactive crisis button
      // (removed by design); the privacy step carries this static disclaimer.
      expect(api.getByText(/988 Suicide & Crisis Lifeline/)).toBeTruthy();
      expect(api.getByText(/call 911/)).toBeTruthy();
      expect(api.queryByTestId('crisis-button')).toBeNull();
    });
  });
});
