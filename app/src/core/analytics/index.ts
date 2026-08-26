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
 * - resetAnalyticsIdentity: destroys the analytics identity on account erasure
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
// DEBUG-539: `getDeletionRequestHistory` / `hasPendingDeletionRequests` are GONE,
// along with the `previousDistinctId` audit record they read. That record was
// persisted to a key no erasure sweep reaches, so it RETAINED the identifier the
// erasure destroys. Both had zero production callers; exporting them left a
// loaded gun one wire-up away from reintroducing the leak.
export {
  resetAnalyticsIdentity,
  registerAnalyticsClient,
  handleAnalyticsDeletion,
  showDeletionConfirmation,
  POSTHOG_RN_STORAGE_FILES,
} from './analyticsIdentityReset';
export type { DeletionRequestType, AnalyticsIdentityResetTarget } from './analyticsIdentityReset';
