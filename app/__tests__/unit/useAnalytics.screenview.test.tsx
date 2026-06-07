/**
 * useAnalytics.trackScreenView COARSENING — INTEGRATION TEST (DEBUG-239)
 *
 * Pins the real contract: a sensitive screen name is coarsened to the generic
 * bucket BEFORE it reaches PHIFilter/PostHog; a non-sensitive name passes
 * through unchanged so per-screen funnels survive.
 */

import { renderHook } from '@testing-library/react-native';
import { useAnalytics } from '@/core/analytics/useAnalytics';

const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({ capture: (...args: unknown[]) => mockCapture(...args) }),
}));

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
