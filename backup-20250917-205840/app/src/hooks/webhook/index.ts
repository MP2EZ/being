/**
 * Webhook Hooks Index for FullMind MBCT App
 *
 * Central export point for all webhook-related hooks
 */

// Core webhook processing hooks
export { useWebhookProcessor } from './useWebhookProcessor';
export type { WebhookProcessorState, WebhookProcessorConfig, WebhookProcessorAPI } from './useWebhookProcessor';

// Payment-specific webhook hooks
export { usePaymentWebhooks } from './usePaymentWebhooks';
export type {
  PaymentWebhookState,
  PaymentEventDetails,
  GracePeriodConfig,
  PaymentWebhookAPI
} from './usePaymentWebhooks';

// Subscription status management
export { useSubscriptionStatus } from './useSubscriptionStatus';
export type {
  SubscriptionStatusState,
  SubscriptionFeatureAccess,
  SubscriptionStatusAPI
} from './useSubscriptionStatus';

// Security validation hooks
export { useWebhookSecurity } from './useWebhookSecurity';
export type {
  WebhookSecurityState,
  WebhookSignatureValidation,
  SecurityThreat,
  WebhookSecurityConfig,
  WebhookSecurityAPI
} from './useWebhookSecurity';

// Grace period management
export { useGracePeriodManager } from './useGracePeriodManager';
export type {
  GracePeriodManagerState,
  GracePeriodConfiguration,
  GracePeriodTrigger,
  GracePeriodTransition,
  GracePeriodAPI
} from './useGracePeriodManager';

// Crisis protection hooks
export { useCrisisProtection } from './useCrisisProtection';
export type {
  CrisisProtectionState,
  CrisisPaymentContext,
  CrisisProtectionTrigger,
  CrisisProtectionResponse,
  CrisisThresholds,
  CrisisConfiguration,
  CrisisProtectionAPI
} from './useCrisisProtection';