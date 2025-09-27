/**
 * TEMPORARY: Minimal API exports for Phase 5D TypeScript compilation
 *
 * This file provides minimal exports to allow TypeScript compilation
 * while the full API integration is completed. Focus is on store
 * consolidation component integration.
 */

// Essential exports that exist
export { SyncOrchestrationAPI } from './orchestration/sync-orchestration-api';
export { ConflictResolutionAPI } from './orchestration/conflict-resolution-api';
export { PerformanceMonitoringAPI } from './orchestration/performance-monitoring-api';

// Types that exist
export type { PriorityQueueConfig } from './orchestration/sync-orchestration-api';
export type { TherapeuticConflict } from './orchestration/conflict-resolution-api';
export type { PerformanceMetrics } from './orchestration/performance-monitoring-api';

// Essential webhook exports that exist
export { WebhookProcessorAPI } from './webhooks/webhook-processor-api';
export { StripeWebhookIntegration } from './webhooks/stripe-webhook-integration';
export { CrisisWebhookHandler } from './webhooks/crisis-webhook-handler';

// Security API
export { WebhookSecurityAPI } from './security/webhook-security-api';

// External integrations
export { StripeIntegrationAPI } from './external/stripe-integration';

// Sync APIs
export { SubscriptionSyncAPI } from './sync/subscription-sync-api';
export { PaymentSyncContextAPI } from './sync/payment-sync-context-api';

// Minimal configuration type
export interface MinimalAPIConfiguration {
  webhook?: {
    processor?: any;
    security?: any;
    crisis?: any;
  };
  stripe?: any;
}

// Placeholder for missing complex classes
export class APIManager {
  constructor(config: MinimalAPIConfiguration) {
    // Minimal implementation
  }

  async initialize() {
    return {
      initialized: true,
      message: 'Minimal API initialization for Phase 5D'
    };
  }
}

// Export as default for backward compatibility
export default {
  APIManager,
  // Add other essential exports as needed
};