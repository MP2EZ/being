/**
 * ANALYTICS SERVICES INDEX
 *
 * Privacy-first analytics using PostHog EU with PHI protection.
 *
 * ARCHITECTURE (INFRA-214):
 * - PostHog EU (Frankfurt) is the CONSENT-GATED PRODUCT-ANALYTICS sink ONLY.
 *   Crisis/safety telemetry (e.g. crisis_detected) routes to Supabase under a
 *   vital-interests legal basis — NOT PostHog. The two sinks are partitioned by
 *   legal basis (consent vs vital-interest); do not route crisis events here.
 * - Whitelist-based PHIFilter validation (no wellness/health data transmitted);
 *   sensitive screen names are coarsened to a generic bucket before transmission
 *   (DEBUG-239), mirroring the Sentry path via a shared sensitive-route list.
 * - Consent-gated (opt-in, default OFF).
 * - No autocapture, no session replay.
 * - The former custom-API AnalyticsService / AnalyticsOrchestrator (→ api.being.fyi) was
 *   confirmed-dead and removed in INFRA-214 T2.
 *
 * KEY EXPORTS:
 * - PostHogProvider: Wraps app with analytics context
 * - PHIFilter: Validates events before transmission
 * - AnalyticsEvents: Type-safe event constants
 * - useAnalytics: Hook for tracking events through PHIFilter → PostHog
 * - handleAnalyticsDeletion: GDPR/CCPA deletion workflow
 *
 * @see docs/architecture/analytics-architecture.md
 */

// PostHog Integration (FEAT-40)
export { PostHogProvider, usePostHogConfigured } from './PostHogProvider';
export { PHIFilter, AnalyticsEvents } from './PHIFilter';
export { useAnalytics } from './useAnalytics';
// Runtime (PostHog-backed) feature-flag tier (INFRA-199)
export { useFeatureFlag, PRODUCT_FLAGS } from './useFeatureFlag';
export type { PHIValidationResult, AnalyticsEventType } from './PHIFilter';
export {
  handleAnalyticsDeletion,
  showDeletionConfirmation,
  getDeletionRequestHistory,
  hasPendingDeletionRequests,
} from './AnalyticsDeletion';
export type { DeletionRequestType } from './AnalyticsDeletion';
