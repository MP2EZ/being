/**
 * Subscription Store Types
 * Enhanced TypeScript definitions for subscription state management
 *
 * Day 17 Phase 4: Complete type safety for subscription logic
 */

import { z } from 'zod';
import type {
  SubscriptionState,
  TrialState,
  FeatureAccessResult,
  SubscriptionError,
  SubscriptionPerformanceMetrics,
  SubscriptionTier,
  TrialManagement,
  FeatureValidationContext,
  CrisisFeatureOverride
} from './subscription';

/**
 * Enhanced Subscription Store State with Complete Type Safety
 */
export interface EnhancedSubscriptionStoreState {
  // Core subscription data
  subscription: SubscriptionState;

  // Trial management with full tracking
  trial: TrialManagement;

  // Feature access cache with TTL
  featureCache: Map<string, {
    result: FeatureAccessResult;
    cachedAt: number;
    expiresAt: number;
    validationCount: number;
  }>;

  // Performance monitoring
  performance: {
    metrics: SubscriptionPerformanceMetrics;
    recentValidations: Array<{
      featureKey: string;
      latency: number;
      success: boolean;
      timestamp: number;
      cacheHit: boolean;
    }>;
    crisisResponseTimes: Array<{
      featureKey: string;
      responseTime: number;
      timestamp: number;
      withinThreshold: boolean;
    }>;
  };

  // Error tracking and recovery
  errors: {
    current: SubscriptionError | null;
    history: Array<{
      error: SubscriptionError;
      timestamp: number;
      resolved: boolean;
      resolutionTime?: number;
    }>;
    retryQueue: Array<{
      featureKey: string;
      attempts: number;
      lastAttempt: number;
      nextAttempt: number;
    }>;
  };

  // Crisis management
  crisis: {
    active: boolean;
    overrides: CrisisFeatureOverride[];
    emergencyFeatures: string[];
    lastCrisisCheck: number;
    crisisHistory: Array<{
      startTime: number;
      endTime?: number;
      featuresOverridden: string[];
      resolved: boolean;
    }>;
  };

  // Loading and synchronization states
  loading: {
    initializing: boolean;
    validating: boolean;
    updating: boolean;
    syncing: boolean;
    operations: Set<string>; // Track concurrent operations
  };

  // Cache management
  cache: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    lastCleanup: number;
    warmupComplete: boolean;
  };

  // User context for validation
  userContext: FeatureValidationContext | null;

  // Configuration
  config: {
    maxCacheSize: number;
    cacheTTL: number;
    performanceThresholds: {
      maxValidationLatency: number;
      crisisResponseMaxLatency: number;
      errorRateThreshold: number;
    };
    retrySettings: {
      maxAttempts: number;
      baseDelay: number;
      maxDelay: number;
      backoffMultiplier: number;
    };
  };

  // Metadata
  metadata: {
    version: string;
    lastSync: number;
    lastValidation: number;
    initializationTime: number;
    uptime: number;
  };
}

/**
 * Enhanced Subscription Store Actions with Type Safety
 */
export interface EnhancedSubscriptionStoreActions {
  // Core initialization and lifecycle
  initialize: () => Promise<SubscriptionState>;
  destroy: () => Promise<void>;
  reset: () => Promise<void>;

  // Subscription management
  validateSubscription: (forceRefresh?: boolean) => Promise<SubscriptionState>;
  updateSubscription: (updates: Partial<SubscriptionState>) => Promise<void>;
  refreshSubscription: () => Promise<SubscriptionState>;

  // Feature access validation with performance monitoring
  validateFeature: (
    featureKey: string,
    options?: {
      allowCache?: boolean;
      timeout?: number;
      crisisMode?: boolean;
    }
  ) => Promise<FeatureAccessResult>;

  // Batch feature validation for performance
  validateMultipleFeatures: (
    featureKeys: string[],
    options?: {
      allowCache?: boolean;
      timeout?: number;
      parallel?: boolean;
    }
  ) => Promise<Record<string, FeatureAccessResult>>;

  // Feature access shortcuts
  hasFeature: (featureKey: string) => boolean;
  canAccessFeature: (featureKey: string) => Promise<boolean>;
  getFeatureAccess: (featureKey: string) => FeatureAccessResult | null;

  // Trial management
  startTrial: (tier: SubscriptionTier, options?: {
    duration?: number;
    autoConvert?: boolean;
    crisisExtensionEligible?: boolean;
  }) => Promise<TrialState>;

  extendTrial: (
    additionalDays: number,
    reason: 'crisis' | 'support' | 'technical',
    metadata?: Record<string, any>
  ) => Promise<TrialState>;

  cancelTrial: (reason?: string) => Promise<void>;

  checkTrialEligibility: () => Promise<{
    eligible: boolean;
    reason?: string;
    maxDuration?: number;
    availableExtensions?: number;
  }>;

  // Crisis management with enhanced safety
  activateCrisisMode: (
    features?: string[],
    duration?: number
  ) => Promise<CrisisFeatureOverride[]>;

  deactivateCrisisMode: () => Promise<void>;

  checkCrisisAccess: (featureKey?: string) => Promise<boolean>;

  extendCrisisAccess: (
    featureKey: string,
    additionalTime: number
  ) => Promise<CrisisFeatureOverride>;

  // Performance monitoring and optimization
  recordValidation: (
    featureKey: string,
    latency: number,
    success: boolean,
    cacheHit: boolean
  ) => void;

  getPerformanceMetrics: () => SubscriptionPerformanceMetrics;

  getPerformanceReport: (
    startTime?: number,
    endTime?: number
  ) => Promise<{
    summary: SubscriptionPerformanceMetrics;
    violations: Array<{
      type: 'latency' | 'error_rate' | 'crisis_response';
      count: number;
      details: any[];
    }>;
    recommendations: string[];
  }>;

  validatePerformanceRequirements: () => Promise<{
    passing: boolean;
    failures: Array<{
      requirement: string;
      expected: number;
      actual: number;
      severity: 'warning' | 'error' | 'critical';
    }>;
  }>;

  // Error handling and recovery
  handleError: (error: SubscriptionError, context?: any) => Promise<void>;

  retryFailedValidation: (
    featureKey: string,
    options?: {
      forceRetry?: boolean;
      maxWait?: number;
    }
  ) => Promise<FeatureAccessResult>;

  clearErrors: () => void;

  getErrorHistory: (
    limit?: number,
    since?: number
  ) => Array<{
    error: SubscriptionError;
    timestamp: number;
    resolved: boolean;
  }>;

  // Cache management
  warmupCache: (featureKeys?: string[]) => Promise<void>;

  clearCache: (featureKey?: string) => void;

  pruneCache: () => void;

  getCacheStats: () => {
    size: number;
    hitRate: number;
    entries: Array<{
      featureKey: string;
      age: number;
      hits: number;
      expiresIn: number;
    }>;
  };

  // Subscription tier management
  upgradeTier: (
    newTier: SubscriptionTier,
    options?: {
      immediate?: boolean;
      prorated?: boolean;
    }
  ) => Promise<SubscriptionState>;

  downgradeTier: (
    newTier: SubscriptionTier,
    options?: {
      atPeriodEnd?: boolean;
      reason?: string;
    }
  ) => Promise<SubscriptionState>;

  // Analytics and tracking
  trackFeatureAccess: (
    featureKey: string,
    granted: boolean,
    reason: string,
    metadata?: Record<string, any>
  ) => void;

  trackTrialEvent: (
    event: 'started' | 'extended' | 'converted' | 'expired' | 'canceled',
    metadata?: Record<string, any>
  ) => void;

  trackConversion: (
    fromTier: SubscriptionTier,
    toTier: SubscriptionTier,
    metadata?: Record<string, any>
  ) => void;

  // Synchronization with external systems
  syncWithPaymentSystem: () => Promise<SubscriptionState>;

  syncWithUserStore: () => Promise<void>;

  // Health checks
  healthCheck: () => Promise<{
    healthy: boolean;
    issues: Array<{
      component: string;
      severity: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      timestamp: number;
    }>;
    recommendations: string[];
  }>;

  // Development and debugging
  debugInfo: () => {
    state: Partial<EnhancedSubscriptionStoreState>;
    cache: any[];
    performance: any;
    errors: any[];
  };
}

/**
 * Complete Enhanced Subscription Store Type
 */
export interface EnhancedSubscriptionStore
  extends EnhancedSubscriptionStoreState,
          EnhancedSubscriptionStoreActions {}

/**
 * Subscription Store Event Types
 */
export type SubscriptionStoreEvent =
  | { type: 'subscription_updated'; subscription: SubscriptionState }
  | { type: 'trial_started'; trial: TrialState }
  | { type: 'trial_extended'; trial: TrialState; reason: string }
  | { type: 'trial_expired'; previousTrial: TrialState }
  | { type: 'feature_access_granted'; featureKey: string; result: FeatureAccessResult }
  | { type: 'feature_access_denied'; featureKey: string; reason: string }
  | { type: 'crisis_mode_activated'; features: string[]; duration?: number }
  | { type: 'crisis_mode_deactivated'; duration: number }
  | { type: 'tier_upgraded'; fromTier: SubscriptionTier; toTier: SubscriptionTier }
  | { type: 'tier_downgraded'; fromTier: SubscriptionTier; toTier: SubscriptionTier }
  | { type: 'performance_violation'; category: string; details: any }
  | { type: 'error_occurred'; error: SubscriptionError }
  | { type: 'cache_warmed'; featureCount: number }
  | { type: 'sync_completed'; changes: string[] }
  | { type: 'health_check_failed'; issues: any[] };

/**
 * Subscription Store Configuration
 */
export interface SubscriptionStoreConfig {
  // Performance settings
  performance: {
    maxValidationLatency: number;
    crisisResponseMaxLatency: number;
    batchValidationSize: number;
    parallelValidations: number;
  };

  // Cache settings
  cache: {
    maxSize: number;
    defaultTTL: number;
    cleanupInterval: number;
    warmupOnInit: boolean;
    preloadFeatures: string[];
  };

  // Error handling
  errorHandling: {
    maxRetries: number;
    baseRetryDelay: number;
    maxRetryDelay: number;
    retryBackoffFactor: number;
    errorHistoryLimit: number;
  };

  // Crisis management
  crisis: {
    autoActivation: boolean;
    maxDuration: number;
    emergencyFeatures: string[];
    extensionThreshold: number;
  };

  // Sync settings
  sync: {
    autoSync: boolean;
    syncInterval: number;
    syncOnForeground: boolean;
    conflictResolution: 'client' | 'server' | 'merge';
  };

  // Analytics
  analytics: {
    enabled: boolean;
    trackingLevel: 'minimal' | 'standard' | 'detailed';
    anonymize: boolean;
    batchSize: number;
  };

  // Development
  debug: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    performanceLogging: boolean;
    errorReporting: boolean;
  };
}

/**
 * Subscription Store Selectors
 */
export interface SubscriptionStoreSelectors {
  // Subscription selectors
  getSubscription: () => SubscriptionState;
  getSubscriptionTier: () => SubscriptionTier;
  getSubscriptionStatus: () => string;
  isSubscriptionActive: () => boolean;

  // Trial selectors
  getTrial: () => TrialState | null;
  isInTrial: () => boolean;
  getTrialDaysRemaining: () => number;
  canExtendTrial: () => boolean;

  // Feature access selectors
  hasFeatureAccess: (featureKey: string) => boolean;
  getFeatureAccessResult: (featureKey: string) => FeatureAccessResult | null;
  getAccessibleFeatures: () => string[];
  getLockedFeatures: () => string[];

  // Crisis selectors
  isCrisisMode: () => boolean;
  getCrisisOverrides: () => CrisisFeatureOverride[];
  hasCrisisAccess: (featureKey: string) => boolean;

  // Performance selectors
  getPerformanceMetrics: () => SubscriptionPerformanceMetrics;
  getValidationLatency: (featureKey?: string) => number;
  getCacheHitRate: () => number;
  hasPerformanceIssues: () => boolean;

  // Error selectors
  getCurrentError: () => SubscriptionError | null;
  hasErrors: () => boolean;
  getErrorCount: () => number;
  getRecentErrors: (limit?: number) => SubscriptionError[];

  // Loading selectors
  isLoading: () => boolean;
  isValidating: () => boolean;
  isInitialized: () => boolean;
  getLoadingOperations: () => string[];

  // Cache selectors
  getCacheSize: () => number;
  isCacheWarmed: () => boolean;
  getCachedFeatures: () => string[];
}

/**
 * Store Middleware Types
 */
export interface SubscriptionStoreMiddleware {
  // Performance monitoring middleware
  performanceMonitor: (
    action: keyof EnhancedSubscriptionStoreActions,
    args: any[],
    startTime: number,
    endTime: number,
    result: any
  ) => void;

  // Error handling middleware
  errorHandler: (
    action: keyof EnhancedSubscriptionStoreActions,
    error: Error,
    context: any
  ) => void;

  // Analytics middleware
  analytics: (
    event: SubscriptionStoreEvent,
    context: any
  ) => void;

  // Logging middleware
  logger: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: any
  ) => void;

  // Validation middleware
  validator: (
    action: keyof EnhancedSubscriptionStoreActions,
    args: any[]
  ) => boolean;
}

/**
 * Integration Types for User Store
 */
export interface UserStoreSubscriptionSlice {
  subscription: {
    tier: SubscriptionTier;
    status: string;
    hasActiveSubscription: boolean;
    trialActive: boolean;
    trialDaysRemaining: number;
    nextBillingDate?: string;
    cancelAtPeriodEnd: boolean;
  };

  featureAccess: {
    cached: Record<string, boolean>;
    lastValidation: number;
    validationInProgress: boolean;
  };

  crisis: {
    modeActive: boolean;
    overriddenFeatures: string[];
    lastCrisisCheck: number;
  };
}

/**
 * Performance Monitoring Types
 */
export interface SubscriptionPerformanceMonitor {
  // Metric collection
  recordMetric: (
    category: 'validation' | 'cache' | 'sync' | 'error',
    name: string,
    value: number,
    tags?: Record<string, string>
  ) => void;

  // Threshold monitoring
  checkThreshold: (
    metric: string,
    value: number,
    threshold: number
  ) => boolean;

  // Alert generation
  generateAlert: (
    severity: 'info' | 'warning' | 'error' | 'critical',
    message: string,
    data?: any
  ) => void;

  // Report generation
  generateReport: (
    timeRange: { start: number; end: number }
  ) => Promise<SubscriptionPerformanceMetrics>;
}

/**
 * Type Guards for Enhanced Store
 */
export const isEnhancedSubscriptionStore = (
  value: unknown
): value is EnhancedSubscriptionStore => {
  if (!value || typeof value !== 'object') return false;

  const store = value as any;

  // Check required state properties
  if (!store.subscription || !store.trial || !store.featureCache) {
    return false;
  }

  // Check required action methods
  const requiredActions = [
    'initialize',
    'validateFeature',
    'hasFeature',
    'activateCrisisMode'
  ];

  return requiredActions.every(action => typeof store[action] === 'function');
};

/**
 * Utility type for store action parameters
 */
export type StoreActionParams<T extends keyof EnhancedSubscriptionStoreActions> =
  Parameters<EnhancedSubscriptionStoreActions[T]>;

/**
 * Utility type for store action return types
 */
export type StoreActionReturn<T extends keyof EnhancedSubscriptionStoreActions> =
  ReturnType<EnhancedSubscriptionStoreActions[T]>;

/**
 * Constants for enhanced store
 */
export const ENHANCED_SUBSCRIPTION_STORE_CONSTANTS = {
  // Performance thresholds
  PERFORMANCE: {
    MAX_VALIDATION_LATENCY: 100, // ms
    CRISIS_MAX_LATENCY: 200, // ms
    CACHE_HIT_RATE_TARGET: 0.85, // 85%
    ERROR_RATE_THRESHOLD: 0.05, // 5%
  },

  // Cache settings
  CACHE: {
    DEFAULT_TTL: 300000, // 5 minutes
    MAX_SIZE: 1000,
    CLEANUP_INTERVAL: 60000, // 1 minute
    WARMUP_BATCH_SIZE: 50,
  },

  // Error handling
  ERROR: {
    MAX_RETRIES: 3,
    BASE_RETRY_DELAY: 1000, // ms
    MAX_RETRY_DELAY: 10000, // ms
    BACKOFF_FACTOR: 2,
    HISTORY_LIMIT: 100,
  },

  // Crisis management
  CRISIS: {
    MAX_DURATION: 86400000, // 24 hours in ms
    EXTENSION_LIMIT: 604800000, // 7 days in ms
    AUTO_ACTIVATION_DELAY: 30000, // 30 seconds
  },

  // Sync settings
  SYNC: {
    DEFAULT_INTERVAL: 300000, // 5 minutes
    FOREGROUND_DELAY: 5000, // 5 seconds
    MAX_SYNC_RETRIES: 3,
  },
} as const;

export default {
  isEnhancedSubscriptionStore,
  ENHANCED_SUBSCRIPTION_STORE_CONSTANTS
};