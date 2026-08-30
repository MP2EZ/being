/**
 * PostHog Analytics Provider
 *
 * Wraps the app with PostHog context for privacy-respecting analytics.
 * - EU data residency (Frankfurt)
 * - Consent-based (opt-in, default OFF)
 * - No session recording (privacy)
 * - No autocapture (we control what's sent)
 *
 * @see docs/architecture/analytics-architecture.md
 */

import React from 'react';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-react-native';
import { registerAnalyticsClient } from './analyticsIdentityReset';
import { AppLifecycleTracker } from './AppLifecycleTracker';
import { useConsentStore } from '@/core/stores/consentStore';
import { env } from '@/core/config/env';

// Environment configuration (validated at startup — see core/config/env.ts)
const POSTHOG_API_KEY = env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = env.EXPO_PUBLIC_POSTHOG_HOST;

interface PostHogProviderProps {
  children: React.ReactNode;
}

/**
 * Tags every PostHog event with `surface: 'app'` so the app's data
 * stays distinguishable from being-website's data in the shared PostHog
 * project (free-tier constraint: 1 project per account). The website
 * mirrors this with `ph.register({ surface: 'web' })` in its own
 * PosthogProvider — see mp2ez/being-website#42.
 *
 * Renders inside <PHProvider> so `usePostHog()` returns the initialized
 * instance. Runs once when the instance becomes available.
 */
function RegisterSurfaceProperty(): null {
  const posthog = usePostHog();
  React.useEffect(() => {
    if (posthog) {
      posthog.register({ surface: 'app' });
      // DEBUG-539: hand the instance to module scope so account erasure can reset
      // it even after this provider stops rendering. Revoking consent unmounts
      // <PHProvider> but does NOT destroy the client — it keeps AppState
      // listeners and an in-memory cache that re-persists the pre-erasure
      // distinct_id on the next write. Erasing by deleting the storage files
      // under a live instance is therefore a fake control; the reset has to go
      // THROUGH the instance, which means holding a reference that outlives the
      // render tree.
      registerAnalyticsClient(posthog);
    }
  }, [posthog]);
  return null;
}

/**
 * PostHog Provider Component
 *
 * Provides PostHog analytics context to the app with privacy-first configuration.
 * Analytics is DISABLED unless user explicitly grants consent.
 */
export function PostHogProvider({ children }: PostHogProviderProps): React.ReactElement {
  // Subscribe directly to consent state (reactive to changes)
  const analyticsEnabled = useConsentStore(
    (state) => state.currentConsent?.preferences?.analyticsEnabled ?? false
  );
  // INFRA-151: GPC-equivalent universal opt-out overrides granular analytics consent.
  const universalOptOut = useConsentStore(
    (state) => state.currentConsent?.universalOptOut ?? false
  );

  // Don't render PostHog if no API key configured, no consent, or universal opt-out is active
  if (
    !POSTHOG_API_KEY ||
    POSTHOG_API_KEY === 'phc_your_api_key_here' ||
    !analyticsEnabled ||
    universalOptOut
  ) {
    // Development mode, no consent, or honoring universal opt-out — render children without PostHog.
    // AppLifecycleTracker still mounts here: it owns the always-on
    // setLastActiveTimestamp write that feeds the Home intro animation, which
    // is not analytics and must keep working without consent. Its emits
    // self-disable — usePostHog() is undefined outside <PHProvider>, so
    // trackEvent early-returns (INFRA-542).
    return (
      <>
        <AppLifecycleTracker />
        {children}
      </>
    );
  }

  return (
    <PHProvider
      apiKey={POSTHOG_API_KEY}
      autocapture={false} // We control exactly what's sent via PHIFilter
      options={{
        // EU data residency for GDPR compliance
        host: POSTHOG_HOST,

        // Privacy settings - session replay is OFF by default
        enableSessionReplay: false,

        // Batching settings
        flushAt: 10, // Batch 10 events before sending
        flushInterval: 30000, // Or flush every 30 seconds

        // Don't capture device identifiers automatically.
        // Stays false, and since INFRA-542 the claim below is true:
        // AppLifecycleTracker (mounted just under this provider) emits our own
        // app_opened / app_backgrounded with a first-open marker and a coarse
        // time-away bucket that pass PHIFilter. Enabling PostHog's own
        // Application Installed/Opened/Backgrounded would double-count them.
        captureAppLifecycleEvents: false, // We handle this ourselves — see AppLifecycleTracker
      }}
    >
      <RegisterSurfaceProperty />
      <AppLifecycleTracker />
      {children}
    </PHProvider>
  );
}

/**
 * Hook to check if PostHog is properly configured
 * Useful for conditional rendering of analytics UI
 */
export function usePostHogConfigured(): boolean {
  return Boolean(POSTHOG_API_KEY && POSTHOG_API_KEY !== 'phc_your_api_key_here');
}

export default PostHogProvider;
