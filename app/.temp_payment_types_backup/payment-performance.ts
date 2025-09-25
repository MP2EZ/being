/**
 * Payment Performance Monitoring Types
 *
 * CRISIS PERFORMANCE GUARANTEES:
 * - Crisis button response <200ms
 * - Emergency bypass activation <3 seconds
 * - Screen load times <500ms for payment screens
 * - Payment processing with real-time performance validation
 * - Crisis detection with immediate performance feedback
 */

import { z } from 'zod';

/**
 * Performance Metric Categories
 */
export const PerformanceMetricCategorySchema = z.enum([
  'crisis_response',      // Crisis button, emergency access
  'screen_load',          // Payment screen loading times
  'payment_processing',   // Payment API operations
  'form_interaction',     // User form interaction responsiveness
  'anxiety_detection',    // Payment anxiety detection timing
  'error_recovery',       // Error handling and recovery times
  'navigation',          // Payment flow navigation timing
  'validation',          // Form and payment validation times
  'network_request',     // Payment API network requests
  'local_operation'      // Local processing operations
]);

export type PerformanceMetricCategory = z.infer<typeof PerformanceMetricCategorySchema>;

/**
 * Performance Alert Levels
 */
export const PerformanceAlertLevelSchema = z.enum([
  'info',        // Performance within acceptable limits
  'warning',     // Performance degraded but functional
  'critical',    // Performance severely impacted
  'emergency'    // Crisis safety compromised
]);

export type PerformanceAlertLevel = z.infer<typeof PerformanceAlertLevelSchema>;

/**
 * Individual Performance Metric
 */
export const PaymentPerformanceMetricSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  category: PerformanceMetricCategorySchema,
  operation: z.string(),
  duration: z.number(), // milliseconds
  expectedDuration: z.number(), // milliseconds
  crisisCritical: z.boolean(), // Whether this operation affects crisis safety
  metadata: z.object({
    userId: z.string().optional(),
    sessionId: z.string().optional(),
    screen: z.enum(['subscription', 'payment_method', 'billing_history', 'payment_settings']).optional(),
    component: z.string().optional(),
    userAction: z.string().optional(),
    paymentMethodType: z.enum(['card', 'apple_pay', 'google_pay']).optional(),
    anxietyLevel: z.number().min(0).max(5).optional(),
    crisisMode: z.boolean().optional(),
    networkType: z.string().optional(),
    deviceType: z.enum(['ios', 'android']).optional(),
    appVersion: z.string().optional()
  })
});

export type PaymentPerformanceMetric = z.infer<typeof PaymentPerformanceMetricSchema>;

/**
 * Performance Session Tracking
 */
export const PaymentPerformanceSessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  totalDuration: z.number().optional(),
  screens: z.array(z.enum(['subscription', 'payment_method', 'billing_history', 'payment_settings'])),
  metrics: z.array(PaymentPerformanceMetricSchema),
  crisisEvents: z.array(z.object({
    timestamp: z.string(),
    event: z.string(),
    responseTime: z.number(),
    compliant: z.boolean()
  })),
  anxietyEvents: z.array(z.object({
    timestamp: z.string(),
    level: z.number().min(0).max(5),
    intervention: z.string().optional(),
    interventionTime: z.number().optional()
  })),
  violations: z.array(z.object({
    timestamp: z.string(),
    type: z.enum(['crisis_response', 'screen_load', 'payment_processing', 'emergency_access']),
    expected: z.number(),
    actual: z.number(),
    severity: PerformanceAlertLevelSchema
  })),
  summary: z.object({
    averageCrisisResponseTime: z.number(),
    averageScreenLoadTime: z.number(),
    averagePaymentProcessingTime: z.number(),
    crisisViolationCount: z.number(),
    maxAnxietyLevel: z.number(),
    totalInterventions: z.number(),
    complianceScore: z.number().min(0).max(100)
  })
});

export type PaymentPerformanceSession = z.infer<typeof PaymentPerformanceSessionSchema>;

/**
 * Performance Summary Report
 */
export const PaymentPerformanceSummarySchema = z.object({
  reportId: z.string(),
  generated: z.string(),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
    duration: z.number()
  }),
  sessions: z.number(),
  totalMetrics: z.number(),

  // Performance averages
  averages: z.object({
    crisisResponseTime: z.number(),
    screenLoadTime: z.number(),
    paymentProcessingTime: z.number(),
    errorRecoveryTime: z.number(),
    anxietyDetectionTime: z.number()
  }),

  // Crisis safety metrics
  crisisSafety: z.object({
    totalCrisisEvents: z.number(),
    compliantResponses: z.number(),
    violationCount: z.number(),
    complianceRate: z.number(), // percentage
    emergencyBypassCount: z.number(),
    averageEmergencyResponseTime: z.number()
  }),

  // User experience metrics
  userExperience: z.object({
    averageAnxietyLevel: z.number(),
    anxietyInterventions: z.number(),
    paymentCompletionRate: z.number(),
    userDropoffPoints: z.array(z.object({
      screen: z.string(),
      component: z.string(),
      dropoffRate: z.number()
    }))
  }),

  // Technical performance
  technical: z.object({
    errorRate: z.number(),
    networkErrorRate: z.number(),
    validationErrorRate: z.number(),
    retryRate: z.number(),
    fallbackActivationRate: z.number()
  }),

  // Compliance and audit
  compliance: z.object({
    hipaaCompliant: z.boolean(),
    pciCompliant: z.boolean(),
    auditTrailComplete: z.boolean(),
    dataRetentionCompliant: z.boolean(),
    lastComplianceCheck: z.string()
  }),

  // Recommendations
  recommendations: z.array(z.object({
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    category: z.enum(['performance', 'crisis_safety', 'user_experience', 'compliance']),
    issue: z.string(),
    recommendation: z.string(),
    estimatedImpact: z.string()
  }))
});

export type PaymentPerformanceSummary = z.infer<typeof PaymentPerformanceSummarySchema>;

/**
 * Performance Alert Definition
 */
export const PaymentPerformanceAlertSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  level: PerformanceAlertLevelSchema,
  category: PerformanceMetricCategorySchema,
  title: z.string(),
  description: z.string(),
  metric: PaymentPerformanceMetricSchema,
  thresholdViolated: z.object({
    expected: z.number(),
    actual: z.number(),
    violationPercentage: z.number()
  }),
  crisisImpact: z.object({
    affectsCrisisResponse: z.boolean(),
    affectsEmergencyAccess: z.boolean(),
    compromisesUserSafety: z.boolean()
  }),
  recommendations: z.array(z.string()),
  escalationRequired: z.boolean(),
  acknowledged: z.boolean(),
  resolvedAt: z.string().optional()
});

export type PaymentPerformanceAlert = z.infer<typeof PaymentPerformanceAlertSchema>;

/**
 * Performance Monitor Interface
 */
export interface PaymentPerformanceMonitor {
  // Session management
  startSession(userId: string, sessionId?: string): string;
  endSession(sessionId: string): PaymentPerformanceSession;
  getCurrentSession(): PaymentPerformanceSession | null;

  // Metric recording
  recordMetric(metric: Omit<PaymentPerformanceMetric, 'id' | 'timestamp'>): string;
  recordCrisisResponse(operation: string, duration: number): void;
  recordScreenLoad(screen: string, duration: number): void;
  recordPaymentProcessing(operation: string, duration: number): void;
  recordAnxietyEvent(level: number, intervention?: string): void;

  // Performance validation
  validateCrisisCompliance(): boolean;
  checkPerformanceThresholds(): PaymentPerformanceAlert[];
  getComplianceScore(): number;

  // Reporting
  getSessionSummary(sessionId: string): PaymentPerformanceSession;
  generatePerformanceSummary(timeRange?: { start: Date; end: Date }): PaymentPerformanceSummary;
  getActiveAlerts(): PaymentPerformanceAlert[];

  // Crisis safety validation
  validateCrisisResponse(duration: number): boolean;
  validateEmergencyAccess(duration: number): boolean;
  recordCrisisViolation(operation: string, expected: number, actual: number): void;

  // Real-time monitoring
  startTimer(operation: string, category: PerformanceMetricCategory): string;
  endTimer(timerId: string): number;
  isOperationCrisisCritical(operation: string): boolean;
}

/**
 * Performance Context for Operations
 */
export const PerformanceContextSchema = z.object({
  operation: z.string(),
  category: PerformanceMetricCategorySchema,
  crisisCritical: z.boolean(),
  expectedDuration: z.number(),
  timeoutDuration: z.number(),
  retryable: z.boolean(),
  fallbackAvailable: z.boolean(),
  userContext: z.object({
    userId: z.string(),
    sessionId: z.string(),
    anxietyLevel: z.number().min(0).max(5),
    crisisMode: z.boolean()
  }),
  technicalContext: z.object({
    screen: z.string(),
    component: z.string(),
    userAction: z.string(),
    paymentMethodType: z.string().optional(),
    networkType: z.string().optional()
  })
});

export type PerformanceContext = z.infer<typeof PerformanceContextSchema>;

/**
 * Crisis Performance Validator
 */
export interface CrisisPerformanceValidator {
  validateOperation(
    operation: string,
    duration: number,
    context: PerformanceContext
  ): {
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  };

  getCrisisPerformanceReport(): {
    totalOperations: number;
    compliantOperations: number;
    violations: {
      crisisResponse: number;
      emergencyAccess: number;
      screenLoad: number;
    };
    averageResponseTimes: {
      crisisButton: number;
      emergencyBypass: number;
      screenLoad: number;
    };
    complianceRate: number;
  };

  setPerformanceThresholds(thresholds: {
    crisisResponseMs: number;
    emergencyAccessMs: number;
    screenLoadMs: number;
    paymentProcessingMs: number;
  }): void;
}

/**
 * Performance Optimization Suggestions
 */
export const PerformanceOptimizationSuggestionSchema = z.object({
  id: z.string(),
  category: z.enum(['crisis_safety', 'user_experience', 'technical', 'compliance']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  currentMetric: z.number(),
  targetMetric: z.number(),
  estimatedImpact: z.string(),
  implementationEffort: z.enum(['low', 'medium', 'high']),
  affectedOperations: z.array(z.string()),
  crisisSafetyImprovement: z.boolean(),
  userExperienceImprovement: z.boolean(),
  technicalDetails: z.object({
    codeChangesRequired: z.boolean(),
    databaseChangesRequired: z.boolean(),
    apiChangesRequired: z.boolean(),
    configurationChanges: z.array(z.string())
  }).optional()
});

export type PerformanceOptimizationSuggestion = z.infer<typeof PerformanceOptimizationSuggestionSchema>;

/**
 * Performance Thresholds Configuration
 */
export const PAYMENT_PERFORMANCE_THRESHOLDS = {
  // Crisis safety requirements (non-negotiable)
  crisis: {
    crisisButtonResponseMs: 200,
    emergencyBypassActivationMs: 3000,
    hotlineAccessMs: 200,
    crisisDetectionMs: 100
  },

  // User experience targets
  userExperience: {
    screenLoadMs: 500,
    formValidationMs: 100,
    navigationMs: 300,
    animationMs: 16 // 60fps
  },

  // Payment processing targets
  payment: {
    paymentMethodCreationMs: 5000,
    subscriptionCreationMs: 10000,
    billingHistoryLoadMs: 2000,
    paymentValidationMs: 1000
  },

  // System performance targets
  system: {
    errorRecoveryMs: 5000,
    networkRequestMs: 10000,
    localValidationMs: 50,
    stateUpdateMs: 10
  },

  // Anxiety detection and intervention
  anxiety: {
    detectionIntervalMs: 1000,
    interventionResponseMs: 500,
    breathingExerciseStartMs: 300,
    supportMessageDisplayMs: 200
  }
} as const;

/**
 * Performance Alert Configurations
 */
export const PERFORMANCE_ALERT_THRESHOLDS = {
  warning: {
    crisisResponseMultiplier: 1.5,    // 150% of expected
    screenLoadMultiplier: 2.0,        // 200% of expected
    paymentProcessingMultiplier: 1.5,  // 150% of expected
    errorRecoveryMultiplier: 2.0      // 200% of expected
  },

  critical: {
    crisisResponseMultiplier: 2.0,    // 200% of expected
    screenLoadMultiplier: 3.0,        // 300% of expected
    paymentProcessingMultiplier: 2.5,  // 250% of expected
    errorRecoveryMultiplier: 3.0      // 300% of expected
  },

  emergency: {
    crisisResponseMultiplier: 3.0,    // 300% of expected (crisis safety compromised)
    emergencyAccessBlocked: true,     // Emergency access completely blocked
    systemUnresponsive: 10000         // System unresponsive for 10+ seconds
  }
} as const;

/**
 * Export validation schemas for runtime use
 */
export const PaymentPerformanceSchemas = {
  PerformanceMetricCategory: PerformanceMetricCategorySchema,
  PerformanceAlertLevel: PerformanceAlertLevelSchema,
  PaymentPerformanceMetric: PaymentPerformanceMetricSchema,
  PaymentPerformanceSession: PaymentPerformanceSessionSchema,
  PaymentPerformanceSummary: PaymentPerformanceSummarySchema,
  PaymentPerformanceAlert: PaymentPerformanceAlertSchema,
  PerformanceContext: PerformanceContextSchema,
  PerformanceOptimizationSuggestion: PerformanceOptimizationSuggestionSchema
} as const;

/**
 * Type guards for performance types
 */
export const isPaymentPerformanceMetric = (obj: any): obj is PaymentPerformanceMetric => {
  return PaymentPerformanceMetricSchema.safeParse(obj).success;
};

export const isPaymentPerformanceAlert = (obj: any): obj is PaymentPerformanceAlert => {
  return PaymentPerformanceAlertSchema.safeParse(obj).success;
};

export const isCrisisCriticalOperation = (category: PerformanceMetricCategory, operation: string): boolean => {
  const crisisCriticalOperations = [
    'crisis_response',
    'anxiety_detection'
  ];

  const crisisCriticalStrings = [
    'crisis_button',
    'emergency_bypass',
    'hotline_access',
    'crisis_detection',
    'emergency_mode'
  ];

  return crisisCriticalOperations.includes(category) ||
         crisisCriticalStrings.some(critical => operation.toLowerCase().includes(critical));
};

export const getPerformanceThreshold = (
  category: PerformanceMetricCategory,
  operation: string
): number => {
  switch (category) {
    case 'crisis_response':
      if (operation.includes('crisis_button') || operation.includes('hotline')) {
        return PAYMENT_PERFORMANCE_THRESHOLDS.crisis.crisisButtonResponseMs;
      }
      if (operation.includes('emergency_bypass')) {
        return PAYMENT_PERFORMANCE_THRESHOLDS.crisis.emergencyBypassActivationMs;
      }
      return PAYMENT_PERFORMANCE_THRESHOLDS.crisis.crisisDetectionMs;

    case 'screen_load':
      return PAYMENT_PERFORMANCE_THRESHOLDS.userExperience.screenLoadMs;

    case 'payment_processing':
      if (operation.includes('subscription')) {
        return PAYMENT_PERFORMANCE_THRESHOLDS.payment.subscriptionCreationMs;
      }
      if (operation.includes('payment_method')) {
        return PAYMENT_PERFORMANCE_THRESHOLDS.payment.paymentMethodCreationMs;
      }
      return PAYMENT_PERFORMANCE_THRESHOLDS.payment.paymentValidationMs;

    case 'form_interaction':
      return PAYMENT_PERFORMANCE_THRESHOLDS.userExperience.formValidationMs;

    case 'anxiety_detection':
      return PAYMENT_PERFORMANCE_THRESHOLDS.anxiety.detectionIntervalMs;

    case 'error_recovery':
      return PAYMENT_PERFORMANCE_THRESHOLDS.system.errorRecoveryMs;

    case 'navigation':
      return PAYMENT_PERFORMANCE_THRESHOLDS.userExperience.navigationMs;

    case 'validation':
      return PAYMENT_PERFORMANCE_THRESHOLDS.system.localValidationMs;

    case 'network_request':
      return PAYMENT_PERFORMANCE_THRESHOLDS.system.networkRequestMs;

    case 'local_operation':
      return PAYMENT_PERFORMANCE_THRESHOLDS.system.stateUpdateMs;

    default:
      return 1000; // Default 1 second
  }
};

/**
 * Utility functions for performance monitoring
 */
export const createPerformanceContext = (
  operation: string,
  category: PerformanceMetricCategory,
  userContext: {
    userId: string;
    sessionId: string;
    anxietyLevel?: number;
    crisisMode?: boolean;
  },
  technicalContext: {
    screen: string;
    component: string;
    userAction: string;
    paymentMethodType?: string;
    networkType?: string;
  }
): PerformanceContext => {
  const expectedDuration = getPerformanceThreshold(category, operation);
  const crisisCritical = isCrisisCriticalOperation(category, operation);

  return {
    operation,
    category,
    crisisCritical,
    expectedDuration,
    timeoutDuration: expectedDuration * 3, // 3x expected as timeout
    retryable: !crisisCritical, // Crisis critical operations should not be retried
    fallbackAvailable: crisisCritical, // Crisis operations need fallbacks
    userContext: {
      userId: userContext.userId,
      sessionId: userContext.sessionId,
      anxietyLevel: userContext.anxietyLevel || 0,
      crisisMode: userContext.crisisMode || false
    },
    technicalContext
  };
};

export const calculateComplianceScore = (session: PaymentPerformanceSession): number => {
  if (session.metrics.length === 0) return 100;

  const crisisCriticalMetrics = session.metrics.filter(m => m.crisisCritical);
  if (crisisCriticalMetrics.length === 0) return 100;

  const compliantMetrics = crisisCriticalMetrics.filter(m =>
    m.duration <= m.expectedDuration * 1.1 // Allow 10% tolerance
  );

  return Math.round((compliantMetrics.length / crisisCriticalMetrics.length) * 100);
};