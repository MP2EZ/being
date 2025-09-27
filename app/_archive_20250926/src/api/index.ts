/**
 * API Integration Index for Being. MBCT App - Phase 5D TypeScript Fix
 *
 * Simplified exports to ensure TypeScript compilation during Phase 5D component updates.
 * Exports only verified existing APIs and orchestration services.
 */

// P0-CLOUD: Orchestration Service APIs (VERIFIED EXISTING)
export {
  OrchestrationServiceFactory,
  OrchestrationServiceCoordinator,
  DEFAULT_ORCHESTRATION_CONFIG,
  performOrchestrationHealthCheck,

  // Core Orchestration APIs
  SyncOrchestrationAPI,
  ConflictResolutionAPI,
  PerformanceMonitoringAPI,

  // Integration APIs
  EnhancedStoreAPI,
  TherapeuticSafetyAPI,
  SubscriptionOrchestrationAPI,
  CrisisEscalationAPI,
  CrossDeviceCoordinationAPI,

  // Types
  type OrchestrationOperation,
  type SLAMonitoring,
  type TherapeuticConflict,

  // Constants
  ORCHESTRATION_TIER_LIMITS,
  CRISIS_PRIORITY_MAPPING,
  THERAPEUTIC_PRECEDENCE_HIERARCHY,
  PERFORMANCE_SLA_TARGETS,
  STORE_INTEGRATION_PERFORMANCE_TARGETS,
  THERAPEUTIC_SAFETY_STANDARDS,
  SUBSCRIPTION_TIER_POLICIES,
  CRISIS_RESPONSE_STANDARDS,
  DEVICE_TIER_LIMITS
} from './orchestration';

// Individual API exports (verified existing files)
export { WebhookProcessorAPI } from './webhooks/webhook-processor-api';
export { StripeWebhookIntegration } from './webhooks/stripe-webhook-integration';
export { CrisisWebhookHandler } from './webhooks/crisis-webhook-handler';
export { WebhookSecurityAPI } from './security/webhook-security-api';
export { StripeIntegrationAPI } from './external/stripe-integration';
export { SubscriptionSyncAPI } from './sync/subscription-sync-api';
export { PaymentSyncContextAPI } from './sync/payment-sync-context-api';
export { SubscriptionStatusAPI } from './subscription/subscription-status-api';

// Aliases for backward compatibility
export { PaymentSyncContextAPI as PaymentStatusSyncAPI } from './sync/payment-sync-context-api';

// Essential types for configuration
export interface MinimalAPIConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Simplified API Manager - Phase 5D Focus
 *
 * Minimal implementation to ensure TypeScript compilation during
 * store consolidation component updates.
 */
export class APIManager {
  private initialized = false;

  constructor(private config: MinimalAPIConfig = {}) {}

  async initialize() {
    if (this.initialized) return { success: true };

    // Minimal initialization for Phase 5D
    this.initialized = true;
    return {
      success: true,
      message: 'Phase 5D minimal API initialization complete'
    };
  }

  getInitialized() {
    return this.initialized;
  }
}

// Default export for compatibility
export default {
  APIManager
};