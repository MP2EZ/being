/**
 * AppLifecycleTracker — INFRA-542.
 *
 * This component exists because the listener it replaces sat ABOVE
 * <PostHogProvider> in App.tsx, where `usePostHog()` is undefined and
 * `trackEvent` early-returns. Wiring the emits there would have compiled,
 * type-checked, passed review and transmitted nothing — the FEAT-137 shape.
 *
 * The two contracts worth pinning are therefore:
 *  1. the emits happen where a client can exist, and
 *  2. the `setLastActiveTimestamp` write — which feeds the Home intro
 *     animation and is NOT analytics — still runs for a user who has not
 *     consented, i.e. when there is no PostHog client at all.
 * (2) is the regression this component's placement is designed to avoid, and
 * it is invisible to any test that only checks the events.
 */

import React from 'react';
import { AppState } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLifecycleTracker } from '../AppLifecycleTracker';
import { useSettingsStore } from '@/core/stores/settingsStore';

const mockCapture = jest.fn();
let mockPosthogAvailable = true;

jest.mock('posthog-react-native', () => ({
  usePostHog: () =>
    mockPosthogAvailable ? { capture: (...args: unknown[]) => mockCapture(...args) } : undefined,
}));

const setLastActiveTimestamp = jest.fn().mockResolvedValue(undefined);

/** Drive the AppState listener the component registered. */
function emitAppState(next: 'active' | 'inactive' | 'background'): void {
  const calls = (AppState.addEventListener as unknown as jest.Mock).mock.calls;
  const handler = calls[calls.length - 1]?.[1] as (s: string) => void;
  handler(next);
}

describe('AppLifecycleTracker (INFRA-542)', () => {
  beforeEach(() => {
    mockCapture.mockClear();
    setLastActiveTimestamp.mockClear();
    mockPosthogAvailable = true;

    (AsyncStorage.getItem as jest.Mock).mockReset().mockResolvedValue('1');
    (AsyncStorage.setItem as jest.Mock).mockReset().mockResolvedValue(undefined);

    jest.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as unknown as ReturnType<typeof AppState.addEventListener>);

    jest.spyOn(useSettingsStore, 'getState').mockReturnValue({
      setLastActiveTimestamp,
      getLastActiveTimestamp: () => null,
    } as unknown as ReturnType<typeof useSettingsStore.getState>);
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders nothing', () => {
    const { toJSON } = render(<AppLifecycleTracker />);
    expect(toJSON()).toBeNull();
  });

  it('emits app_opened on mount with is_cold_start true on a first-ever launch', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    render(<AppLifecycleTracker />);

    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith(
        'app_opened',
        expect.objectContaining({ is_cold_start: true })
      )
    );
  });

  it('emits app_opened on mount with is_cold_start false once the marker exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');

    render(<AppLifecycleTracker />);

    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith(
        'app_opened',
        expect.objectContaining({ is_cold_start: false })
      )
    );
  });

  it('emits app_opened again on a background -> active transition, never as a cold start', async () => {
    render(<AppLifecycleTracker />);
    await waitFor(() => expect(mockCapture).toHaveBeenCalledTimes(1));
    mockCapture.mockClear();

    emitAppState('background');
    emitAppState('active');

    await waitFor(() =>
      expect(mockCapture).toHaveBeenCalledWith(
        'app_opened',
        expect.objectContaining({ is_cold_start: false })
      )
    );
  });

  it('emits app_backgrounded with a numeric duration_seconds on active -> background', async () => {
    render(<AppLifecycleTracker />);
    await waitFor(() => expect(mockCapture).toHaveBeenCalledTimes(1));
    mockCapture.mockClear();

    emitAppState('background');

    await waitFor(() => {
      const call = mockCapture.mock.calls.find(([name]) => name === 'app_backgrounded');
      expect(call).toBeDefined();
      expect(typeof (call?.[1] as { duration_seconds: unknown }).duration_seconds).toBe('number');
    });
  });

  it('writes lastActiveTimestamp exactly once per backgrounding', async () => {
    render(<AppLifecycleTracker />);
    await waitFor(() => expect(mockCapture).toHaveBeenCalledTimes(1));

    emitAppState('background');

    await waitFor(() => expect(setLastActiveTimestamp).toHaveBeenCalledTimes(1));
  });

  it('still writes lastActiveTimestamp when there is NO PostHog client', async () => {
    // The regression this component's placement exists to prevent: mounting it
    // only inside the consent-gated provider branch would silently stop the
    // Home intro animation's timestamp for every non-consenting user.
    mockPosthogAvailable = false;

    render(<AppLifecycleTracker />);
    emitAppState('background');

    await waitFor(() => expect(setLastActiveTimestamp).toHaveBeenCalledTimes(1));
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('emits nothing at all without a PostHog client', async () => {
    mockPosthogAvailable = false;

    render(<AppLifecycleTracker />);
    emitAppState('background');
    emitAppState('active');

    await waitFor(() => expect(setLastActiveTimestamp).toHaveBeenCalled());
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('removes its AppState subscription on unmount', () => {
    const remove = jest.fn();
    (AppState.addEventListener as unknown as jest.Mock).mockReturnValue({ remove });

    const { unmount } = render(<AppLifecycleTracker />);
    unmount();

    expect(remove).toHaveBeenCalled();
  });
});
