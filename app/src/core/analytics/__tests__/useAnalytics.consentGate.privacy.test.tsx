/**
 * DEBUG-559 — `trackEvent` must gate on CONSENT, not on client presence.
 *
 * WHAT THIS PINS, AND WHY IT DID NOT NEED PINNING BEFORE
 * -----------------------------------------------------
 * Until DEBUG-559, `useAnalytics.trackEvent`'s only gate was `if (!posthog)
 * return`. That was the app's effective consent gate for every emit site, and it
 * worked — but only as a side effect of a defect. `PostHogProvider` withheld
 * `<PHProvider>` while consent was absent, so `usePostHog()` was undefined and
 * every emit early-returned for free.
 *
 * That withholding was an element-TYPE swap at a fixed position above
 * `SafeAreaProvider`, so granting consent destroyed and recreated every 988
 * affordance in the app. Fixing it means the provider is always mounted, a client
 * exists from launch, and `!posthog` stops being a consent signal — collapsing
 * enforcement onto the vendored SDK's internal `optedOut` check inside `capture`.
 *
 * `optedOut` does hold today (`enqueue()` drops the event before persisting or
 * sending it), so nothing leaks either way. The point of this file is that our
 * privacy posture must not BE a property of a third party's internals: that is
 * unreviewable, untested by us, and silent when it changes on a version bump.
 * The DEBUG-559 compliance ruling made it non-negotiable — `usePostHog()`
 * truthiness is never again a consent signal.
 *
 * So these cases deliberately mock a client that is ALWAYS present and whose
 * `capture` always records. Under the pre-fix gate they would all pass
 * vacuously; the only thing that can stop the capture here is our own check.
 */

const mockCapture = jest.fn();
const mockClient = { capture: mockCapture };

// Always truthy — this is the whole point. It simulates the post-fix world in
// which a client exists regardless of consent, so `!posthog` can never fire and
// only an explicit consent read can withhold the event.
jest.mock('posthog-react-native', () => ({
  __esModule: true,
  usePostHog: () => mockClient,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { useAnalytics } from '../useAnalytics';
import { AnalyticsEvents } from '../PHIFilter';
import { useConsentStore } from '@/core/stores/consentStore';

function setConsent(analyticsEnabled: boolean, universalOptOut = false): void {
  useConsentStore.setState({
    currentConsent: { preferences: { analyticsEnabled }, universalOptOut },
  } as unknown as Parameters<typeof useConsentStore.setState>[0]);
}

/** Fires one whitelisted event on mount, through the real hook. */
function Emitter(): null {
  const { trackEvent } = useAnalytics();
  React.useEffect(() => {
    trackEvent(AnalyticsEvents.CRISIS_RESOURCES_VIEWED);
  }, [trackEvent]);
  return null;
}

describe('DEBUG-559 — trackEvent gates on consent, independently of the client', () => {
  beforeEach(() => {
    mockCapture.mockClear();
    useConsentStore.setState({ currentConsent: null } as unknown as Parameters<
      typeof useConsentStore.setState
    >[0]);
  });

  it('CONTROL — the harness can emit, so a "did not capture" result means something', () => {
    // Without this, every negative case below is indistinguishable from a broken
    // mock, a non-whitelisted event name, or a PHIFilter rejection.
    setConsent(true);
    render(<Emitter />);
    expect(mockCapture).toHaveBeenCalledWith(AnalyticsEvents.CRISIS_RESOURCES_VIEWED, {});
  });

  it('does not capture when consent has never been recorded', () => {
    render(<Emitter />);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('does not capture when analytics consent is explicitly declined', () => {
    setConsent(false);
    render(<Emitter />);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('does not capture under universalOptOut even when analyticsEnabled is true (INFRA-151)', () => {
    // The GPC-equivalent override. A gate reading only `analyticsEnabled` would
    // pass every other case in this file and fail exactly here.
    setConsent(true, true);
    render(<Emitter />);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('stops capturing when consent is revoked mid-session, with the same client', () => {
    setConsent(true);
    const { rerender } = render(<Emitter />);
    expect(mockCapture).toHaveBeenCalledTimes(1);

    mockCapture.mockClear();
    setConsent(false);
    rerender(<Emitter />);

    expect(mockCapture).not.toHaveBeenCalled();
  });
});
