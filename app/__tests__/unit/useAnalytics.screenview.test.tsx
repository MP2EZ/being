/**
 * useAnalytics.trackScreenView COARSENING — INTEGRATION TEST (DEBUG-239)
 *
 * Pins the real contract: a sensitive screen name is coarsened to the generic
 * bucket BEFORE it reaches PHIFilter/PostHog; a non-sensitive name passes
 * through unchanged so per-screen funnels survive.
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
 * both cases below emit nothing.
 */
beforeEach(() => {
  useConsentStore.setState({
    currentConsent: { preferences: { analyticsEnabled: true }, universalOptOut: false },
  } as unknown as Parameters<typeof useConsentStore.setState>[0]);
});

describe('useAnalytics.trackScreenView coarsening (DEBUG-239)', () => {
  beforeEach(() => mockCapture.mockClear());

  it('coarsens a sensitive screen name to the bucket before PostHog capture', () => {
    const { result } = renderHook(() => useAnalytics());
    result.current.trackScreenView('CrisisResourcesScreen');
    expect(mockCapture).toHaveBeenCalledWith('screen_viewed', { screen_name: 'App' });
  });

  it('passes a non-sensitive screen name through unchanged', () => {
    const { result } = renderHook(() => useAnalytics());
    result.current.trackScreenView('HomeScreen');
    expect(mockCapture).toHaveBeenCalledWith('screen_viewed', { screen_name: 'HomeScreen' });
  });
});
