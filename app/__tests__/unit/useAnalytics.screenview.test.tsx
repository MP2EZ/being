/**
 * useAnalytics.trackScreenView — INTEGRATION TEST (DEBUG-239, then DEBUG-821)
 *
 * Pins the real contract: a sensitive screen, or a screen showing a person's
 * PHQ-9/GAD-7 history, sends NOTHING (DEBUG-821 — coarsening to `App` was a 1:1
 * proxy for the crisis screen, since it was the only sensitive screen that called
 * this). A non-sensitive name passes through unchanged so per-screen funnels
 * survive, and every capture opts out of GeoIP enrichment.
 */

import { renderHook } from '@testing-library/react-native';
import { useConsentStore } from '@/core/stores/consentStore';
import { useAnalytics } from '@/core/analytics/useAnalytics';

const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: (...args: unknown[]) => mockCapture(...args) }),
}));

/**
 * DEBUG-559: consent is a precondition. `trackEvent` reads the consent store
 * directly now — `!posthog` stood in for consent only while PostHogProvider
 * withheld the client, and that withholding was remounting every 988 affordance
 * in the app. Without this the mocked client is present, consent is absent, and
 * every case below emits nothing.
 */
beforeEach(() => {
  useConsentStore.setState({
    consentStatus: 'valid', // DEBUG-690: the hook emits only on a valid status
    currentConsent: { preferences: { analyticsEnabled: true }, universalOptOut: false },
  } as unknown as Parameters<typeof useConsentStore.setState>[0]);
});

describe('useAnalytics.trackScreenView (DEBUG-239, DEBUG-821)', () => {
  beforeEach(() => mockCapture.mockClear());

  it.each([
    'CrisisResourcesScreen',
    'DomainGuidanceScreen',
    'InsightsScreen',
    'WellnessTrendsDetailScreen',
  ])('sends nothing for %s', (screen) => {
    const { result } = renderHook(() => useAnalytics());
    result.current.trackScreenView(screen);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('passes a non-sensitive screen name through unchanged, with GeoIP off', () => {
    // Also the control for the cases above: the harness can emit.
    const { result } = renderHook(() => useAnalytics());
    result.current.trackScreenView('HomeScreen');
    expect(mockCapture).toHaveBeenCalledWith('screen_viewed', {
      screen_name: 'HomeScreen',
      $geoip_disable: true,
    });
  });
});
