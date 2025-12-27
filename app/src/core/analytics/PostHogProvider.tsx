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

import React, { useEffect, useState } from 'react';
import { PostHogProvider as PHProvider } from 'posthog-react-native';
import { useConsentStore } from '@/core/stores/consentStore';

// Environment configuration
const POSTHOG_API_KEY = process.env['EXPO_PUBLIC_POSTHOG_API_KEY'] || '';
const POSTHOG_HOST = process.env['EXPO_PUBLIC_POSTHOG_HOST'] || 'https://eu.i.posthog.com';

interface PostHogProviderProps {
  children: React.ReactNode;
}

/**
 * PostHog Provider Component
 *
 * Provides PostHog analytics context to the app with privacy-first configuration.
 * Analytics is DISABLED unless user explicitly grants consent.
 */
export function PostHogProvider({ children }: PostHogProviderProps): React.ReactElement {
  const { canPerformOperation } = useConsentStore();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  // Check consent status
  useEffect(() => {
    const hasConsent = canPerformOperation('analytics');
    setAnalyticsEnabled(hasConsent);
  }, [canPerformOperation]);

  // Don't render PostHog if no API key configured or no consent
  if (!POSTHOG_API_KEY || POSTHOG_API_KEY === 'phc_your_api_key_here' || !analyticsEnabled) {
    // Development mode or no consent - just render children without PostHog
    return <>{children}</>;
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

        // Don't capture device identifiers automatically
        captureAppLifecycleEvents: false, // We handle this ourselves
      }}
    >
      {children}
    </PHProvider>
  );
}

/**
 * Hook to check if PostHog is properly configured
 * Useful for conditional rendering of analytics UI
 */
export function usePostHogConfigured(): boolean {
  const apiKey = process.env['EXPO_PUBLIC_POSTHOG_API_KEY'] || '';
  return Boolean(apiKey && apiKey !== 'phc_your_api_key_here');
}

export default PostHogProvider;
