/**
 * API & Webhook Canonical Types - Phase 4E Consolidation
 *
 * Canonical definitions for API integration types that were previously scattered
 * across multiple webhook, security, and orchestration modules. Provides core
 * types needed for compilation without complex dependencies.
 *
 * CONSOLIDATION TARGET: API index compilation compatibility
 */

import { z } from 'zod';

// === WEBHOOK PROCESSING TYPES ===

/**
 * Core webhook processing configuration
 */
export interface WebhookProcessingConfig {
  readonly maxProcessingTime: number;
  readonly crisisResponseTimeLimit: number;
  readonly retryAttempts: number;
  readonly deadLetterQueue: boolean;
  readonly batchProcessing: boolean;
  readonly threadPoolSize: number;
}

/**
 * Webhook processing request structure
 */
export interface WebhookProcessingRequest {
  readonly webhookId: string;
  readonly source: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly signature: string;
  readonly timestamp: Date;
  readonly crisisContext?: {
    readonly detected: boolean;
    readonly level: 'low' | 'medium' | 'high' | 'critical';
  };
}

// === SECURITY & RATE LIMITING ===

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly skipSuccessfulRequests: boolean;
  readonly crisisOverride: boolean;
  readonly emergencyBurst: number;
}

/**
 * Threat detection configuration
 */
export interface ThreatDetectionConfig {
  readonly enabled: boolean;
  readonly suspiciousPatterns: string[];
  readonly blockedIPs: string[];
  readonly anomalyThreshold: number;
  readonly autoBlock: boolean;
  readonly crisisExemption: boolean;
}

/**
 * Crisis assessment configuration
 */
export interface CrisisAssessmentConfig {
  readonly enableAutomaticDetection: boolean;
  readonly severityThresholds: {
    readonly moderate: number;
    readonly high: number;
    readonly critical: number;
  };
  readonly responseTimeTargets: {
    readonly moderate: number;
    readonly high: number;
    readonly critical: number;
  };
}

/**
 * Emergency intervention configuration
 */
export interface EmergencyInterventionConfig {
  readonly automaticEscalation: boolean;
  readonly contactEmergencyServices: boolean;
  readonly notifyEmergencyContacts: boolean;
  readonly activateGracePeriod: boolean;
  readonly emergencyResourceLinks: string[];
}

// === STRIPE INTEGRATION ===

/**
 * Stripe integration configuration
 */
export interface StripeIntegrationConfig {
  readonly publishableKey: string;
  readonly secretKey?: string;
  readonly webhookSecret?: string;
  readonly apiVersion: string;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly therapeuticSettings: {
    readonly anxietyReductionMode: boolean;
    readonly crisisPaymentSupport: boolean;
    readonly gracePeriodEnabled: boolean;
  };
}

// === SUBSCRIPTION & FEATURE ACCESS ===

/**
 * Feature access configuration
 */
export interface FeatureAccessConfig {
  readonly tierBasedAccess: boolean;
  readonly crisisOverrideFeatures: string[];
  readonly gracePeriodFeatures: string[];
  readonly emergencyFeatures: string[];
  readonly defaultTier: 'free' | 'basic' | 'premium';
}

/**
 * Therapeutic access configuration
 */
export interface TherapeuticAccessConfig {
  readonly alwaysAllowAssessments: boolean;
  readonly crisisResourcesUnlimited: boolean;
  readonly breathingExercisesUnlimited: boolean;
  readonly emergencyContactsUnlimited: boolean;
  readonly therapeuticContentTiers: string[];
}

// === ORCHESTRATION TYPES (Re-export compatible types) ===

/**
 * Priority queue configuration for orchestration
 */
export interface PriorityQueueConfig {
  readonly maxConcurrentOperations: number;
  readonly crisisPriorityMultiplier: number;
  readonly therapeuticPriorityWeights: Record<string, number>;
  readonly timeoutMs: number;
  readonly retryPolicy: {
    readonly maxRetries: number;
    readonly backoffMs: number;
  };
}

/**
 * Clinical validation request for conflict resolution
 */
export interface ClinicalValidationRequest {
  readonly requestId: string;
  readonly operationType: string;
  readonly dataSnapshot: Record<string, unknown>;
  readonly conflictType: 'therapeutic' | 'assessment' | 'crisis' | 'subscription';
  readonly validationCriteria: string[];
  readonly emergencyFlag: boolean;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  readonly operationId: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly success: boolean;
  readonly errorCode?: string;
  readonly throughput: number;
  readonly memoryUsage: number;
  readonly crisisHandled: boolean;
}

/**
 * Store integration configuration
 */
export interface StoreIntegrationConfig {
  readonly batchSize: number;
  readonly syncInterval: number;
  readonly conflictResolution: 'client' | 'server' | 'merge';
  readonly therapeuticDataPriority: boolean;
  readonly crisisDataImmutability: boolean;
}

/**
 * Therapeutic safety configuration
 */
export interface TherapeuticSafetyConfig {
  readonly assessmentIntegrityChecks: boolean;
  readonly crisisDataValidation: boolean;
  readonly therapeuticContinuityGuards: boolean;
  readonly clinicalDataEncryption: boolean;
  readonly auditLogging: boolean;
}

/**
 * Subscription orchestration configuration
 */
export interface SubscriptionOrchestrationConfig {
  readonly tierBasedResourceAllocation: boolean;
  readonly crisisOverrideCapabilities: string[];
  readonly gracePeriodManagement: boolean;
  readonly featureGateCoordination: boolean;
  readonly paymentFailureHandling: 'graceful' | 'immediate' | 'crisis_aware';
}

/**
 * Crisis detection configuration
 */
export interface CrisisDetectionConfig {
  readonly automaticDetection: boolean;
  readonly severityMapping: Record<string, number>;
  readonly escalationRules: string[];
  readonly emergencyContactIntegration: boolean;
  readonly professionalServiceIntegration: boolean;
}

/**
 * Device information for cross-device coordination
 */
export interface DeviceInfo {
  readonly deviceId: string;
  readonly platform: 'ios' | 'android' | 'web';
  readonly version: string;
  readonly capabilities: string[];
  readonly therapeuticFeatures: string[];
  readonly crisisCapable: boolean;
}

// === TYPE GUARDS AND VALIDATION ===

export function isValidWebhookProcessingConfig(value: unknown): value is WebhookProcessingConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).maxProcessingTime === 'number' &&
    typeof (value as any).crisisResponseTimeLimit === 'number'
  );
}

export function isValidRateLimitConfig(value: unknown): value is RateLimitConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).windowMs === 'number' &&
    typeof (value as any).maxRequests === 'number'
  );
}

export function isValidCrisisDetectionConfig(value: unknown): value is CrisisDetectionConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).automaticDetection === 'boolean'
  );
}

// === CONSTANTS ===

/**
 * API canonical constants for configuration defaults
 */
export const API_CANONICAL_CONSTANTS = {
  WEBHOOK: {
    MAX_PROCESSING_TIME: 5000,
    CRISIS_RESPONSE_TIME_LIMIT: 200,
    DEFAULT_RETRY_ATTEMPTS: 3,
    DEFAULT_THREAD_POOL_SIZE: 10
  },
  RATE_LIMITING: {
    DEFAULT_WINDOW_MS: 60000, // 1 minute
    DEFAULT_MAX_REQUESTS: 100,
    CRISIS_BURST_MULTIPLIER: 5,
    EMERGENCY_WINDOW_MS: 1000 // 1 second for emergencies
  },
  CRISIS: {
    MODERATE_THRESHOLD: 3,
    HIGH_THRESHOLD: 4,
    CRITICAL_THRESHOLD: 5,
    MODERATE_RESPONSE_TIME: 1000,
    HIGH_RESPONSE_TIME: 500,
    CRITICAL_RESPONSE_TIME: 200
  },
  PERFORMANCE: {
    TARGET_SUCCESS_RATE: 0.99,
    MAX_MEMORY_USAGE_MB: 256,
    TARGET_THROUGHPUT_OPS_SEC: 1000
  }
} as const;

// === EXPORTS ===

export default {
  // Type guards
  isValidWebhookProcessingConfig,
  isValidRateLimitConfig,
  isValidCrisisDetectionConfig,

  // Constants
  API_CANONICAL_CONSTANTS
};