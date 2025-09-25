/**
 * Subscription Hook Types
 * TypeScript definitions for subscription-related React hooks
 *
 * Day 17 Phase 4: Type-safe subscription hook implementations
 */

import type {
  SubscriptionState,
  TrialState,
  FeatureAccessResult,
  SubscriptionError,
  SubscriptionTier,
  SubscriptionPerformanceMetrics
} from './subscription';

/**
 * useSubscription Hook Types
 */
export interface UseSubscriptionHookOptions {
  // Auto-refresh settings
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
  refreshOnFocus?: boolean;

  // Performance settings
  cacheResults?: boolean;
  maxCacheAge?: number; // ms
  suspense?: boolean;

  // Error handling
  retryOnError?: boolean;
  maxRetries?: number;
  errorBoundary?: boolean;

  // Crisis mode
  crisisModeSupport?: boolean;
  crisisOverrides?: string[];
}

export interface UseSubscriptionHookReturn {
  // Core subscription state
  subscription: SubscriptionState;
  isLoading: boolean;
  error: SubscriptionError | null;

  // Trial state
  trial: TrialState | null;
  isInTrial: boolean;
  trialDaysRemaining: number;
  canExtendTrial: boolean;

  // Subscription status
  isActive: boolean;
  isPastDue: boolean;
  isExpired: boolean;
  needsPaymentMethod: boolean;

  // Actions
  refresh: () => Promise<void>;
  updateSubscription: (updates: Partial<SubscriptionState>) => Promise<void>;

  // Trial actions
  startTrial: (tier: SubscriptionTier, duration?: number) => Promise<TrialState>;
  extendTrial: (days: number, reason?: string) => Promise<TrialState>;
  cancelTrial: () => Promise<void>;

  // Subscription management
  upgrade: (tier: SubscriptionTier) => Promise<void>;
  downgrade: (tier: SubscriptionTier) => Promise<void>;
  cancel: () => Promise<void>;

  // Performance
  performanceMetrics: SubscriptionPerformanceMetrics;
  lastRefresh: number;
  nextRefresh?: number;
}

/**
 * useFeatureGate Hook Types
 */
export interface UseFeatureGateHookOptions {
  // Validation settings
  cacheResult?: boolean;
  validateOnMount?: boolean;
  revalidateOnFocus?: boolean;

  // Performance settings
  timeout?: number; // ms
  maxCacheAge?: number; // ms

  // Crisis handling
  allowCrisisOverride?: boolean;
  crisisComponent?: React.ComponentType;

  // Error handling
  fallbackOnError?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;

  // Analytics
  trackAccess?: boolean;
  trackDenials?: boolean;
}

export interface UseFeatureGateHookReturn {
  // Access status
  hasAccess: boolean;
  accessResult: FeatureAccessResult | null;
  isLoading: boolean;
  error: SubscriptionError | null;

  // Detailed access information
  reason: string;
  canUpgrade: boolean;
  requiresUpgrade: boolean;
  upgradeUrl?: string;
  requiredTier?: SubscriptionTier;

  // Trial information
  inTrial: boolean;
  trialAccess: boolean;
  trialDaysRemaining: number;

  // Crisis information
  crisisOverride: boolean;
  crisisMode: boolean;

  // Actions
  revalidate: () => Promise<FeatureAccessResult>;
  requestAccess: () => Promise<void>;
  upgrade: () => Promise<void>;

  // Performance
  validationTime: number;
  cacheHit: boolean;
  lastValidation: number;
}

/**
 * useMultipleFeatureGates Hook Types
 */
export interface UseMultipleFeatureGatesHookOptions {
  features: string[];

  // Validation settings
  validateInParallel?: boolean;
  cacheResults?: boolean;
  validateOnMount?: boolean;

  // Performance settings
  batchSize?: number;
  timeout?: number; // ms per feature
  maxCacheAge?: number; // ms

  // Error handling
  continueOnError?: boolean;
  maxRetries?: number;

  // Analytics
  trackBatchAccess?: boolean;
}

export interface UseMultipleFeatureGatesHookReturn {
  // Access results
  access: Record<string, FeatureAccessResult>;
  hasAccess: Record<string, boolean>;
  isLoading: boolean;
  errors: Record<string, SubscriptionError>;

  // Batch information
  accessibleFeatures: string[];
  lockedFeatures: string[];
  trialFeatures: string[];
  crisisOverrideFeatures: string[];

  // Actions
  revalidateAll: () => Promise<void>;
  revalidateFeature: (featureKey: string) => Promise<FeatureAccessResult>;

  // Performance
  batchValidationTime: number;
  individualTimes: Record<string, number>;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * useTrial Hook Types
 */
export interface UseTrialHookOptions {
  // Monitoring settings
  trackTimeRemaining?: boolean;
  updateInterval?: number; // ms

  // Auto-actions
  autoExtendOnCrisis?: boolean;
  autoConvertOnExpiry?: boolean;

  // Performance
  cacheState?: boolean;
  suspense?: boolean;

  // Analytics
  trackTrialEvents?: boolean;
}

export interface UseTrialHookReturn {
  // Trial state
  trial: TrialState | null;
  isActive: boolean;
  isExpired: boolean;
  isExtended: boolean;

  // Time tracking
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  timeRemaining: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };

  // Extension information
  canExtend: boolean;
  extensionsUsed: number;
  maxExtensions: number;
  extensionReason?: string;

  // Conversion information
  conversionEligible: boolean;
  conversionRecommendedTier: SubscriptionTier;
  conversionDiscount?: number;

  // Actions
  start: (tier: SubscriptionTier, duration?: number) => Promise<TrialState>;
  extend: (days: number, reason?: string) => Promise<TrialState>;
  cancel: () => Promise<void>;
  convert: (tier: SubscriptionTier) => Promise<void>;

  // Performance
  isLoading: boolean;
  error: SubscriptionError | null;
  lastUpdate: number;
}

/**
 * useSubscriptionPerformance Hook Types
 */
export interface UseSubscriptionPerformanceHookOptions {
  // Monitoring settings
  realTimeUpdates?: boolean;
  alertThresholds?: {
    latency?: number; // ms
    errorRate?: number; // 0-1
    cacheHitRate?: number; // 0-1
  };

  // Reporting settings
  reportingInterval?: number; // ms
  includeHistoricalData?: boolean;
  maxHistoryAge?: number; // ms

  // Performance optimization
  autoOptimize?: boolean;
  optimizationThresholds?: {
    cacheSize?: number;
    validationFrequency?: number;
  };
}

export interface UseSubscriptionPerformanceHookReturn {
  // Current metrics
  metrics: SubscriptionPerformanceMetrics;
  isMonitoring: boolean;

  // Real-time status
  currentLatency: number;
  errorRate: number;
  cacheHitRate: number;

  // Health indicators
  isHealthy: boolean;
  warnings: Array<{
    type: 'latency' | 'errors' | 'cache' | 'memory';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    recommendation?: string;
  }>;

  // Performance alerts
  alerts: Array<{
    timestamp: number;
    type: string;
    severity: 'warning' | 'error' | 'critical';
    message: string;
    data?: any;
  }>;

  // Actions
  startMonitoring: () => void;
  stopMonitoring: () => void;
  clearMetrics: () => void;
  generateReport: () => Promise<SubscriptionPerformanceMetrics>;

  // Optimization
  optimize: () => Promise<void>;
  clearCache: () => void;
  warmupCache: (features: string[]) => Promise<void>;
}

/**
 * useFeatureFlags Hook Types (Enhanced for Subscriptions)
 */
export interface UseFeatureFlagsHookOptions {
  // Feature selection
  features?: string[];
  includeSubscriptionGated?: boolean;
  includeCrisisFeatures?: boolean;

  // Validation
  validateAccess?: boolean;
  revalidateOnSubscriptionChange?: boolean;

  // Performance
  cacheFlags?: boolean;
  batchValidation?: boolean;

  // Crisis handling
  crisisModeSupport?: boolean;
  crisisOverrides?: string[];
}

export interface UseFeatureFlagsHookReturn {
  // Flag states
  flags: Record<string, boolean>;
  isLoading: boolean;
  error: SubscriptionError | null;

  // Access information
  accessibleFlags: string[];
  gatedFlags: string[];
  trialFlags: string[];

  // Actions
  checkFlag: (flagKey: string) => boolean;
  validateFlag: (flagKey: string) => Promise<FeatureAccessResult>;
  refreshFlags: () => Promise<void>;

  // Subscription integration
  subscriptionGatedFlags: Record<string, {
    requiredTier: SubscriptionTier;
    hasAccess: boolean;
    canUpgrade: boolean;
  }>;
}

/**
 * useCrisisMode Hook Types
 */
export interface UseCrisisModeHookOptions {
  // Auto-activation
  autoActivate?: boolean;
  activationTriggers?: Array<'high_crisis_score' | 'emergency_button' | 'manual'>;

  // Feature overrides
  autoOverrideFeatures?: string[];
  customOverrideLogic?: (featureKey: string) => boolean;

  // Duration management
  defaultDuration?: number; // ms
  maxDuration?: number; // ms
  extensionDuration?: number; // ms

  // Performance
  prioritizePerformance?: boolean;
  emergencyOptimizations?: boolean;
}

export interface UseCrisisModeHookReturn {
  // Crisis state
  isCrisisMode: boolean;
  isActivating: boolean;
  isDeactivating: boolean;

  // Crisis information
  activatedAt?: number;
  duration?: number;
  remainingTime?: number;
  overriddenFeatures: string[];

  // Auto-extension
  canExtend: boolean;
  autoExtensionActive: boolean;
  extensionsUsed: number;

  // Actions
  activate: (features?: string[], duration?: number) => Promise<void>;
  deactivate: () => Promise<void>;
  extend: (additionalTime: number) => Promise<void>;

  // Feature overrides
  addFeatureOverride: (featureKey: string, duration?: number) => Promise<void>;
  removeFeatureOverride: (featureKey: string) => Promise<void>;
  hasFeatureOverride: (featureKey: string) => boolean;

  // Performance
  crisisResponseTime: number;
  isOptimized: boolean;
  error: SubscriptionError | null;
}

/**
 * Hook Error Types
 */
export interface SubscriptionHookError extends Error {
  code: string;
  hook: string;
  feature?: string;
  recoverable: boolean;
  retryable: boolean;
  context?: any;
}

/**
 * Hook Performance Metrics
 */
export interface HookPerformanceMetrics {
  hookName: string;
  totalCalls: number;
  averageExecutionTime: number;
  maxExecutionTime: number;
  errorRate: number;
  cacheHitRate?: number;
  memoryUsage?: number;
  lastCall: number;
}

/**
 * Hook Context Types
 */
export interface SubscriptionHookContext {
  subscription: SubscriptionState;
  performanceMetrics: SubscriptionPerformanceMetrics;
  crisisMode: boolean;
  userTier: SubscriptionTier;
  cache: Map<string, any>;
}

/**
 * Utility Types for Hooks
 */
export type HookRefreshFunction = () => Promise<void>;
export type HookValidationFunction<T> = () => Promise<T>;
export type HookErrorHandler = (error: SubscriptionHookError) => void;
export type HookPerformanceCallback = (metrics: HookPerformanceMetrics) => void;

/**
 * Type Guards for Hook Returns
 */
export const isUseSubscriptionReturn = (
  value: unknown
): value is UseSubscriptionHookReturn => {
  if (!value || typeof value !== 'object') return false;
  const hook = value as any;
  return (
    'subscription' in hook &&
    'isLoading' in hook &&
    'error' in hook &&
    typeof hook.refresh === 'function'
  );
};

export const isUseFeatureGateReturn = (
  value: unknown
): value is UseFeatureGateHookReturn => {
  if (!value || typeof value !== 'object') return false;
  const hook = value as any;
  return (
    'hasAccess' in hook &&
    'accessResult' in hook &&
    'isLoading' in hook &&
    typeof hook.revalidate === 'function'
  );
};

/**
 * Hook Configuration Constants
 */
export const SUBSCRIPTION_HOOK_CONSTANTS = {
  // Default timeouts
  DEFAULT_TIMEOUT: 5000, // ms
  CRISIS_TIMEOUT: 1000, // ms
  BATCH_TIMEOUT: 10000, // ms

  // Cache settings
  DEFAULT_CACHE_AGE: 300000, // 5 minutes
  TRIAL_CACHE_AGE: 60000, // 1 minute
  FEATURE_CACHE_AGE: 180000, // 3 minutes

  // Refresh intervals
  DEFAULT_REFRESH_INTERVAL: 300000, // 5 minutes
  TRIAL_REFRESH_INTERVAL: 60000, // 1 minute
  PERFORMANCE_REFRESH_INTERVAL: 30000, // 30 seconds

  // Retry settings
  DEFAULT_MAX_RETRIES: 3,
  CRISIS_MAX_RETRIES: 1,
  RETRY_DELAY: 1000, // ms

  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    MAX_EXECUTION_TIME: 100, // ms
    MAX_ERROR_RATE: 0.05, // 5%
    MIN_CACHE_HIT_RATE: 0.7, // 70%
  },

  // Crisis settings
  CRISIS_SETTINGS: {
    DEFAULT_DURATION: 3600000, // 1 hour
    MAX_DURATION: 86400000, // 24 hours
    EXTENSION_DURATION: 1800000, // 30 minutes
    MAX_EXTENSIONS: 5,
  },
} as const;

export default {
  isUseSubscriptionReturn,
  isUseFeatureGateReturn,
  SUBSCRIPTION_HOOK_CONSTANTS
};