/**
 * ANALYTICS SERVICES INDEX
 *
 * Privacy-first analytics using PostHog EU with PHI protection.
 *
 * ARCHITECTURE (INFRA-214):
 * - PostHog EU (Frankfurt) is the single product-analytics + crisis-telemetry sink.
 * - Whitelist-based PHIFilter validation (no health data transmitted).
 * - Consent-gated (opt-in, default OFF); crisis-detection events use a vital-interests bypass.
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
