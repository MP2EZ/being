/**
 * Payment-Aware Sync Service API - Day 19 Phase 1
 *
 * Comprehensive API interfaces for subscription tier-aware synchronization
 * with crisis safety override and performance monitoring.
 *
 * ARCHITECT FOUNDATION:
 * - Multi-tier priority queue system (Crisis Emergency = 10, Background = 1)
 * - Crisis safety override with <200ms guaranteed response
 * - Subscription tier sync policies with bandwidth and resource management
 * - Cross-device coordination with session preservation
 * - Integration patterns with Day 18 webhook system
 *
 * CORE API CATEGORIES:
 * 1. Payment Sync Context API - Tier-aware sync with crisis escalation
 * 2. Crisis-Safe Endpoints - <200ms emergency response guarantee
 * 3. Subscription Integration - Real-time tier updates from webhooks
 * 4. Performance Monitoring - SLA compliance and crisis response tracking
 */

import { PaymentAwareSyncContext, PaymentSyncContextResult } from './PaymentAwareSyncContext';
import { SyncOperation, SyncEntityType, SyncStatus } from '../../types/sync';
import { SubscriptionTier, SubscriptionState } from '../../types/subscription';
import { CrisisPaymentOverride } from '../../types/payment';

// ============================================================================
// 1. PAYMENT SYNC CONTEXT API - Tier-aware sync with crisis escalation
// ============================================================================

/**
 * Priority queue levels with crisis emergency override
 */
export enum SyncPriorityLevel {
  CRISIS_EMERGENCY = 10,    // <200ms response, unlimited resources
  CRITICAL_SAFETY = 8,      // Crisis plan, assessment data
  HIGH_CLINICAL = 6,        // Check-ins, therapeutic data
  MEDIUM_USER = 4,          // User preferences, session data
  LOW_SYNC = 2,            // Widget data, non-essential
  BACKGROUND = 1           // Analytics, optimization data
}

/**
 * Subscription tier sync entitlements
 */
export interface SyncTierEntitlements {
  readonly tier: SubscriptionTier;
  readonly maxSyncFrequency: number;        // minutes between syncs
  readonly maxDataTransfer: number;         // bytes per sync operation
  readonly maxConcurrentOperations: number;
  readonly enabledEntityTypes: readonly SyncEntityType[];
  readonly priorityMultiplier: number;      // affects queue position
  readonly bandwidthLimit?: number;         // bytes per second
  readonly offlineQueueLimit: number;       // max queued operations
  readonly crisisOverrideEnabled: boolean;  // emergency bypass permissions
}

/**
 * Sync request with payment awareness
 */
export interface PaymentAwareSyncRequest {
  readonly operationId: string;
  readonly operation: SyncOperation;
  readonly priority: SyncPriorityLevel;
  readonly crisisMode: boolean;
  readonly subscriptionContext: {
    readonly tier: SubscriptionTier;
    readonly status: SubscriptionState;
    readonly gracePeriodActive: boolean;
  };
  readonly performanceRequirements: {
    readonly maxResponseTime: number;        // ms
    readonly requiresImmediateSync: boolean;
    readonly criticalData: boolean;
  };
  readonly requestMetadata: {
    readonly deviceId: string;
    readonly userId?: string;
    readonly sessionId?: string;
    readonly timestamp: string;
  };
}

/**
 * Sync response with tier-specific limitations
 */
export interface PaymentAwareSyncResponse {
  readonly operationId: string;
  readonly status: 'accepted' | 'rejected' | 'queued' | 'rate_limited';
  readonly priority: SyncPriorityLevel;
  readonly estimatedProcessingTime: number; // ms
  readonly queuePosition?: number;
  readonly tierLimitations: {
    readonly applied: boolean;
    readonly reason?: string;
    readonly nextAvailableSlot?: string;
    readonly upgradeRequired?: boolean;
  };
  readonly crisisOverride: {
    readonly active: boolean;
    readonly reason?: string;
    readonly bypassedLimits: readonly string[];
  };
  readonly performanceMetrics: {
    readonly responseTime: number;          // ms
    readonly queueWaitTime: number;         // ms
    readonly processingTime: number;        // ms
  };
}

/**
 * Payment Sync Context API Interface
 */
export interface IPaymentSyncContextAPI {
  /**
   * Evaluate sync context for subscription tier compliance
   */
  evaluateSyncContext(request: PaymentAwareSyncRequest): Promise<PaymentSyncContextResult>;

  /**
   * Get current subscription tier entitlements
   */
  getTierEntitlements(tier: SubscriptionTier): SyncTierEntitlements;

  /**
   * Check if operation is allowed under current subscription
   */
  isOperationAllowed(
    entityType: SyncEntityType,
    dataSize: number,
    priority: SyncPriorityLevel
  ): Promise<boolean>;

  /**
   * Calculate priority with subscription multiplier
   */
  calculateEffectivePriority(
    basePriority: SyncPriorityLevel,
    tier: SubscriptionTier,
    crisisMode: boolean
  ): number;

  /**
   * Get subscription-aware sync interval
   */
  getSyncInterval(tier: SubscriptionTier, entityType: SyncEntityType): number;

  /**
   * Update subscription tier in real-time (webhook integration)
   */
  updateSubscriptionTier(
    userId: string,
    newTier: SubscriptionTier,
    effectiveDate: string
  ): Promise<void>;
}

// ============================================================================
// 2. CRISIS-SAFE ENDPOINTS - <200ms emergency response guarantee
// ============================================================================

/**
 * Crisis emergency sync request
 */
export interface CrisisEmergencySyncRequest {
  readonly emergencyId: string;
  readonly crisisType: 'assessment_threshold' | 'manual_emergency' | 'system_detected';
  readonly entityType: SyncEntityType;
  readonly criticalData: unknown;
  readonly timestamp: string;
  readonly deviceId: string;
  readonly userId?: string;
  readonly emergencyContact?: string;      // 988 crisis hotline
}

/**
 * Crisis emergency response
 */
export interface CrisisEmergencySyncResponse {
  readonly emergencyId: string;
  readonly status: 'emergency_processed' | 'emergency_failed';
  readonly responseTime: number;           // must be <200ms
  readonly syncCompleted: boolean;
  readonly emergencyProtocolsActivated: readonly string[];
  readonly crisisResourcesProvided: {
    readonly hotlineNumber: string;        // 988
    readonly emergencyContacts: readonly string[];
    readonly crisisPlanActivated: boolean;
  };
  readonly fallbackMeasures?: readonly string[];
}

/**
 * Crisis monitoring and detection
 */
export interface CrisisMonitoringConfig {
  readonly assessmentThresholds: {
    readonly phq9CrisisScore: number;      // ≥20 triggers crisis
    readonly gad7CrisisScore: number;      // ≥15 triggers crisis
    readonly customThresholds: Record<string, number>;
  };
  readonly responseTimeRequirements: {
    readonly maxCrisisResponseTime: number; // <200ms
    readonly maxSyncLatency: number;       // <500ms
    readonly maxQueueWaitTime: number;     // <100ms
  };
  readonly automaticEscalation: {
    readonly enabled: boolean;
    readonly escalationTriggers: readonly string[];
    readonly notificationTargets: readonly string[];
  };
}

/**
 * Crisis-Safe Endpoints API Interface
 */
export interface ICrisisSafeEndpointsAPI {
  /**
   * Emergency sync with <200ms guarantee
   */
  emergencySync(request: CrisisEmergencySyncRequest): Promise<CrisisEmergencySyncResponse>;

  /**
   * Crisis threshold monitoring
   */
  monitorCrisisThresholds(
    assessmentData: unknown,
    config: CrisisMonitoringConfig
  ): Promise<boolean>;

  /**
   * Activate crisis override for user
   */
  activateCrisisOverride(
    userId: string,
    reason: string,
    duration?: number
  ): Promise<CrisisPaymentOverride>;

  /**
   * Emergency fallback when primary systems fail
   */
  emergencyFallback(
    failureReason: string,
    criticalData: unknown
  ): Promise<{ success: boolean; fallbackMeasures: readonly string[] }>;

  /**
   * Crisis resource provisioning
   */
  provideCrisisResources(userId: string): Promise<{
    hotlineNumber: string;
    emergencyContacts: readonly string[];
    crisisPlan?: unknown;
    immediateActions: readonly string[];
  }>;

  /**
   * Validate crisis response time compliance
   */
  validateCrisisResponseTime(
    emergencyId: string,
    maxResponseTime: number
  ): Promise<{ compliant: boolean; actualResponseTime: number }>;
}

// ============================================================================
// 3. SUBSCRIPTION INTEGRATION - Real-time tier updates from webhooks
// ============================================================================

/**
 * Webhook subscription event
 */
export interface SubscriptionWebhookEvent {
  readonly eventId: string;
  readonly eventType: 'subscription.created' | 'subscription.updated' | 'subscription.cancelled' | 'payment.succeeded' | 'payment.failed';
  readonly userId: string;
  readonly subscriptionId: string;
  readonly previousTier?: SubscriptionTier;
  readonly newTier: SubscriptionTier;
  readonly effectiveDate: string;
  readonly paymentStatus: 'current' | 'past_due' | 'cancelled';
  readonly gracePeriodEnd?: string;
  readonly webhook: {
    readonly providerId: string;         // stripe, apple, google
    readonly eventTimestamp: string;
    readonly signature: string;
    readonly verified: boolean;
  };
}

/**
 * Subscription tier transition
 */
export interface SubscriptionTierTransition {
  readonly transitionId: string;
  readonly userId: string;
  readonly fromTier: SubscriptionTier;
  readonly toTier: SubscriptionTier;
  readonly reason: 'upgrade' | 'downgrade' | 'payment_failure' | 'cancellation' | 'trial_expiry';
  readonly effectiveDate: string;
  readonly gracePeriodDays?: number;
  readonly impactedSyncOperations: readonly string[];
  readonly migrationRequired: boolean;
  readonly notificationsSent: readonly string[];
}

/**
 * Real-time subscription sync update
 */
export interface RealtimeSubscriptionSyncUpdate {
  readonly updateId: string;
  readonly userId: string;
  readonly subscriptionChanges: {
    readonly tier: SubscriptionTier;
    readonly entitlements: SyncTierEntitlements;
    readonly limits: {
      readonly syncFrequency: number;
      readonly dataTransfer: number;
      readonly concurrentOperations: number;
    };
  };
  readonly syncAdjustments: {
    readonly queueReordering: boolean;
    readonly operationLimiting: boolean;
    readonly priorityAdjustments: Record<string, number>;
  };
  readonly immediateActions: readonly string[];
  readonly timestamp: string;
}

/**
 * Subscription Integration API Interface
 */
export interface ISubscriptionIntegrationAPI {
  /**
   * Process subscription webhook event
   */
  processWebhookEvent(event: SubscriptionWebhookEvent): Promise<SubscriptionTierTransition>;

  /**
   * Apply real-time subscription changes to sync service
   */
  applyRealtimeSubscriptionUpdate(
    update: RealtimeSubscriptionSyncUpdate
  ): Promise<{ success: boolean; adjustmentsMade: readonly string[] }>;

  /**
   * Handle subscription tier transition
   */
  handleTierTransition(transition: SubscriptionTierTransition): Promise<void>;

  /**
   * Sync subscription state across devices
   */
  syncSubscriptionAcrossDevices(
    userId: string,
    subscriptionState: {
      tier: SubscriptionTier;
      status: SubscriptionState;
      entitlements: SyncTierEntitlements;
    }
  ): Promise<{ devicesUpdated: number; failures: readonly string[] }>;

  /**
   * Validate subscription entitlements
   */
  validateSubscriptionEntitlements(
    userId: string,
    requestedOperation: SyncOperation
  ): Promise<{ valid: boolean; reason?: string; upgradeRequired?: boolean }>;

  /**
   * Handle payment failure gracefully
   */
  handlePaymentFailure(
    userId: string,
    gracePeriodDays: number
  ): Promise<{ gracePeriodActivated: boolean; limitedSyncEnabled: boolean }>;
}

// ============================================================================
// 4. PERFORMANCE MONITORING - SLA compliance and crisis response tracking
// ============================================================================

/**
 * Sync performance metrics
 */
export interface SyncPerformanceMetrics {
  readonly metricId: string;
  readonly timestamp: string;
  readonly subscriptionTier: SubscriptionTier;
  readonly responseTime: {
    readonly average: number;            // ms
    readonly p95: number;               // ms
    readonly p99: number;               // ms
    readonly crisisResponseTime?: number; // must be <200ms
  };
  readonly throughput: {
    readonly operationsPerSecond: number;
    readonly dataTransferRate: number;  // bytes/second
    readonly successRate: number;       // 0-1
  };
  readonly queueMetrics: {
    readonly averageWaitTime: number;   // ms
    readonly queueDepth: number;
    readonly priorityDistribution: Record<SyncPriorityLevel, number>;
  };
  readonly resourceUtilization: {
    readonly cpuUsage: number;          // 0-1
    readonly memoryUsage: number;       // bytes
    readonly networkBandwidth: number;  // bytes/second
    readonly batteryImpact: number;     // 0-1
  };
}

/**
 * SLA compliance tracking
 */
export interface SLAComplianceReport {
  readonly reportId: string;
  readonly period: {
    readonly start: string;
    readonly end: string;
    readonly duration: number;          // ms
  };
  readonly subscriptionTier: SubscriptionTier;
  readonly slaTargets: {
    readonly maxResponseTime: number;   // ms
    readonly minSuccessRate: number;    // 0-1
    readonly maxCrisisResponseTime: number; // 200ms
    readonly minUptime: number;         // 0-1
  };
  readonly actualPerformance: {
    readonly averageResponseTime: number;
    readonly successRate: number;
    readonly crisisResponseTimeCompliance: number; // 0-1
    readonly uptime: number;
  };
  readonly compliance: {
    readonly overall: boolean;
    readonly responseTimeCompliant: boolean;
    readonly successRateCompliant: boolean;
    readonly crisisResponseCompliant: boolean;
    readonly uptimeCompliant: boolean;
  };
  readonly violations: readonly SLAViolation[];
}

/**
 * SLA violation details
 */
export interface SLAViolation {
  readonly violationId: string;
  readonly timestamp: string;
  readonly violationType: 'response_time' | 'success_rate' | 'crisis_response' | 'uptime';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly details: {
    readonly expected: number | string;
    readonly actual: number | string;
    readonly deviation: number;
  };
  readonly impact: {
    readonly usersAffected: number;
    readonly operationsImpacted: number;
    readonly crisisSafetyRisk: boolean;
  };
  readonly remediation: {
    readonly actions: readonly string[];
    readonly completedAt?: string;
    readonly effectiveness: number;      // 0-1
  };
}

/**
 * Crisis response audit
 */
export interface CrisisResponseAudit {
  readonly auditId: string;
  readonly emergencyId: string;
  readonly timestamp: string;
  readonly responseMetrics: {
    readonly detectionTime: number;     // ms from trigger to detection
    readonly responseTime: number;      // ms from detection to response
    readonly totalTime: number;         // ms from trigger to completion
    readonly slaCompliant: boolean;     // <200ms requirement
  };
  readonly actions: readonly {
    readonly action: string;
    readonly timestamp: string;
    readonly duration: number;          // ms
    readonly success: boolean;
  }[];
  readonly resourcesProvided: {
    readonly crisisHotline: boolean;    // 988 provided
    readonly emergencyContacts: boolean;
    readonly crisisPlan: boolean;
    readonly immediateSupport: boolean;
  };
  readonly outcome: {
    readonly resolved: boolean;
    readonly escalated: boolean;
    readonly followUpRequired: boolean;
  };
}

/**
 * Performance Monitoring API Interface
 */
export interface IPerformanceMonitoringAPI {
  /**
   * Collect sync performance metrics
   */
  collectPerformanceMetrics(
    operationId: string,
    subscriptionTier: SubscriptionTier
  ): Promise<SyncPerformanceMetrics>;

  /**
   * Generate SLA compliance report
   */
  generateSLAComplianceReport(
    subscriptionTier: SubscriptionTier,
    startDate: string,
    endDate: string
  ): Promise<SLAComplianceReport>;

  /**
   * Track crisis response times
   */
  trackCrisisResponseTime(
    emergencyId: string,
    triggerTimestamp: string,
    responseTimestamp: string
  ): Promise<CrisisResponseAudit>;

  /**
   * Monitor subscription tier performance
   */
  monitorTierPerformance(
    tier: SubscriptionTier
  ): Promise<{
    currentMetrics: SyncPerformanceMetrics;
    trendAnalysis: {
      improvingMetrics: readonly string[];
      degradingMetrics: readonly string[];
      recommendations: readonly string[];
    };
  }>;

  /**
   * Alert on SLA violations
   */
  alertOnSLAViolation(violation: SLAViolation): Promise<{
    alertSent: boolean;
    notificationTargets: readonly string[];
    escalationRequired: boolean;
  }>;

  /**
   * Optimize performance based on subscription tier
   */
  optimizePerformanceForTier(
    tier: SubscriptionTier,
    currentMetrics: SyncPerformanceMetrics
  ): Promise<{
    optimizations: readonly string[];
    expectedImprovement: number; // percentage
    implementationPriority: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

// ============================================================================
// UNIFIED PAYMENT-AWARE SYNC SERVICE API
// ============================================================================

/**
 * Main Payment-Aware Sync Service API
 * Orchestrates all payment-aware sync operations with crisis safety
 */
export interface IPaymentAwareSyncServiceAPI extends
  IPaymentSyncContextAPI,
  ICrisisSafeEndpointsAPI,
  ISubscriptionIntegrationAPI,
  IPerformanceMonitoringAPI {

  /**
   * Initialize payment-aware sync service
   */
  initialize(config: {
    subscriptionTiers: Record<SubscriptionTier, SyncTierEntitlements>;
    crisisMonitoring: CrisisMonitoringConfig;
    performanceTargets: Record<SubscriptionTier, SLAComplianceReport['slaTargets']>;
  }): Promise<void>;

  /**
   * Process sync request with full payment awareness
   */
  processSyncRequest(request: PaymentAwareSyncRequest): Promise<PaymentAwareSyncResponse>;

  /**
   * Get comprehensive sync status
   */
  getSyncStatus(userId: string): Promise<{
    subscriptionTier: SubscriptionTier;
    syncEntitlements: SyncTierEntitlements;
    queueStatus: {
      position: number;
      estimatedWaitTime: number;
      priorityLevel: SyncPriorityLevel;
    };
    performanceMetrics: SyncPerformanceMetrics;
    crisisOverride: CrisisPaymentOverride | null;
  }>;

  /**
   * Health check for payment-aware sync service
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      paymentIntegration: boolean;
      crisisResponse: boolean;
      subscriptionWebhooks: boolean;
      performanceMonitoring: boolean;
    };
    responseTime: number;
    lastUpdate: string;
  }>;
}

/**
 * Payment-Aware Sync Service Configuration
 */
export interface PaymentAwareSyncServiceConfig {
  readonly subscriptionTiers: Record<SubscriptionTier, SyncTierEntitlements>;
  readonly crisisMonitoring: CrisisMonitoringConfig;
  readonly performanceTargets: Record<SubscriptionTier, SLAComplianceReport['slaTargets']>;
  readonly webhookIntegration: {
    readonly endpoints: Record<string, string>; // provider -> webhook URL
    readonly security: {
      readonly signatureValidation: boolean;
      readonly ipWhitelist: readonly string[];
      readonly rateLimiting: {
        readonly requestsPerMinute: number;
        readonly burstLimit: number;
      };
    };
  };
  readonly compliance: {
    readonly hipaaCompliant: boolean;
    readonly auditLogging: boolean;
    readonly dataRetention: {
      readonly performanceMetrics: number;  // days
      readonly auditLogs: number;          // days
      readonly slaReports: number;         // days
    };
  };
  readonly emergency: {
    readonly crisisHotline: string;      // 988
    readonly maxResponseTime: number;     // 200ms
    readonly fallbackMeasures: readonly string[];
    readonly escalationProcedures: readonly string[];
  };
}

// Export default configuration for FullMind mental health app
export const DEFAULT_PAYMENT_AWARE_SYNC_CONFIG: PaymentAwareSyncServiceConfig = {
  subscriptionTiers: {
    trial: {
      tier: 'trial',
      maxSyncFrequency: 15,              // 15 minutes
      maxDataTransfer: 10 * 1024 * 1024, // 10MB
      maxConcurrentOperations: 2,
      enabledEntityTypes: ['check_in', 'user_profile', 'crisis_plan'],
      priorityMultiplier: 0.5,
      bandwidthLimit: 50 * 1024,         // 50KB/s
      offlineQueueLimit: 20,
      crisisOverrideEnabled: true,       // Always enabled for safety
    },
    basic: {
      tier: 'basic',
      maxSyncFrequency: 5,               // 5 minutes
      maxDataTransfer: 50 * 1024 * 1024, // 50MB
      maxConcurrentOperations: 5,
      enabledEntityTypes: ['check_in', 'user_profile', 'assessment', 'crisis_plan'],
      priorityMultiplier: 1.0,
      bandwidthLimit: 100 * 1024,        // 100KB/s
      offlineQueueLimit: 50,
      crisisOverrideEnabled: true,
    },
    premium: {
      tier: 'premium',
      maxSyncFrequency: 1,               // 1 minute
      maxDataTransfer: Number.MAX_SAFE_INTEGER, // unlimited
      maxConcurrentOperations: 20,
      enabledEntityTypes: ['check_in', 'user_profile', 'assessment', 'crisis_plan', 'widget_data', 'session_data'],
      priorityMultiplier: 2.0,
      offlineQueueLimit: 200,
      crisisOverrideEnabled: true,
    },
  },
  crisisMonitoring: {
    assessmentThresholds: {
      phq9CrisisScore: 20,               // ≥20 triggers crisis
      gad7CrisisScore: 15,               // ≥15 triggers crisis
      customThresholds: {},
    },
    responseTimeRequirements: {
      maxCrisisResponseTime: 200,        // <200ms
      maxSyncLatency: 500,               // <500ms
      maxQueueWaitTime: 100,             // <100ms
    },
    automaticEscalation: {
      enabled: true,
      escalationTriggers: ['crisis_threshold_exceeded', 'emergency_button_pressed'],
      notificationTargets: ['988', 'emergency_contacts'],
    },
  },
  performanceTargets: {
    trial: {
      maxResponseTime: 5000,             // 5s
      minSuccessRate: 0.95,              // 95%
      maxCrisisResponseTime: 200,        // 200ms
      minUptime: 0.99,                   // 99%
    },
    basic: {
      maxResponseTime: 2000,             // 2s
      minSuccessRate: 0.98,              // 98%
      maxCrisisResponseTime: 200,        // 200ms
      minUptime: 0.995,                  // 99.5%
    },
    premium: {
      maxResponseTime: 1000,             // 1s
      minSuccessRate: 0.99,              // 99%
      maxCrisisResponseTime: 200,        // 200ms
      minUptime: 0.999,                  // 99.9%
    },
  },
  webhookIntegration: {
    endpoints: {
      stripe: '/webhooks/stripe/subscription',
      apple: '/webhooks/apple/subscription',
      google: '/webhooks/google/subscription',
    },
    security: {
      signatureValidation: true,
      ipWhitelist: [], // To be configured per provider
      rateLimiting: {
        requestsPerMinute: 100,
        burstLimit: 20,
      },
    },
  },
  compliance: {
    hipaaCompliant: true,
    auditLogging: true,
    dataRetention: {
      performanceMetrics: 90,            // 90 days
      auditLogs: 2555,                   // 7 years for HIPAA
      slaReports: 365,                   // 1 year
    },
  },
  emergency: {
    crisisHotline: '988',                // National crisis hotline
    maxResponseTime: 200,                // 200ms for crisis response
    fallbackMeasures: [
      'local_crisis_plan_activation',
      'emergency_contact_notification',
      'hotline_direct_dial',
      'offline_crisis_resources'
    ],
    escalationProcedures: [
      'immediate_crisis_resource_provision',
      'emergency_service_coordination',
      'therapeutic_continuity_preservation'
    ],
  },
} as const;