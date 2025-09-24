/**
 * Enhanced Payment Error Handling Types
 *
 * CRISIS-SAFE ERROR HANDLING:
 * - Error categories with crisis impact assessment
 * - Recovery strategies that maintain therapeutic access
 * - Stripe error mapping with therapeutic messaging
 * - Performance-aware error recovery with <200ms crisis compliance
 * - HIPAA-compliant error logging and audit trails
 */

import { z } from 'zod';

/**
 * Payment Error Categories
 */
export const PaymentErrorCategorySchema = z.enum([
  'card_error',           // Card declined, insufficient funds, invalid card
  'authentication_error', // 3D Secure, SCA authentication required
  'network_error',        // Connection issues, API timeouts
  'validation_error',     // Form validation, input errors
  'rate_limit_error',     // Too many requests, rate limiting
  'system_error',         // Internal server errors, service unavailable
  'crisis_error',         // Error that impacts crisis access
  'compliance_error'      // HIPAA, PCI DSS compliance violations
]);

export type PaymentErrorCategory = z.infer<typeof PaymentErrorCategorySchema>;

/**
 * Crisis Impact Levels for Error Assessment
 */
export const CrisisImpactLevelSchema = z.enum([
  'none',      // No impact on crisis features
  'minimal',   // Slight delay but crisis features accessible
  'moderate',  // Some crisis features affected
  'severe',    // Crisis features significantly impacted
  'critical'   // Crisis access completely blocked
]);

export type CrisisImpactLevel = z.infer<typeof CrisisImpactLevelSchema>;

/**
 * Error Recovery Strategies
 */
export const ErrorRecoveryStrategySchema = z.enum([
  'immediate_retry',        // Retry immediately
  'delayed_retry',         // Retry after brief delay
  'fallback_method',       // Use alternative payment method
  'crisis_bypass',         // Activate crisis mode override
  'therapeutic_guidance',   // Show MBCT-compliant error messaging
  'user_intervention',     // Require manual user action
  'system_fallback',       // Fall back to basic functionality
  'emergency_mode'         // Activate emergency access mode
]);

export type ErrorRecoveryStrategy = z.infer<typeof ErrorRecoveryStrategySchema>;

/**
 * Payment Error Context Information
 */
export const PaymentErrorContextSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  deviceId: z.string(),
  screen: z.enum(['subscription', 'payment_method', 'billing_history', 'payment_settings']),
  component: z.string(),
  userAction: z.string(),
  timestamp: z.string(),
  crisisMode: z.boolean(),
  anxietyLevel: z.number().min(0).max(5),
  formData: z.record(z.any()).optional(),
  paymentMethodId: z.string().optional(),
  subscriptionId: z.string().optional(),
  customerContext: z.object({
    hasActiveSubscription: z.boolean(),
    subscriptionStatus: z.string(),
    paymentMethodCount: z.number(),
    lastSuccessfulPayment: z.string().optional()
  }),
  performanceContext: z.object({
    operationStartTime: z.number(),
    expectedDuration: z.number(),
    actualDuration: z.number().optional(),
    crisisTimingViolation: z.boolean()
  })
});

export type PaymentErrorContext = z.infer<typeof PaymentErrorContextSchema>;

/**
 * Payment Operations Enumeration
 */
export const PaymentOperationSchema = z.enum([
  'subscription_creation',
  'subscription_update',
  'subscription_cancellation',
  'payment_method_creation',
  'payment_method_update',
  'payment_method_deletion',
  'payment_processing',
  'customer_creation',
  'customer_update',
  'billing_history_load',
  'crisis_mode_activation',
  'emergency_bypass_activation',
  'subscription_plan_selection',
  'payment_form_validation',
  'transaction_review'
]);

export type PaymentOperation = z.infer<typeof PaymentOperationSchema>;

/**
 * Payment Error Sources
 */
export const PaymentErrorSourceSchema = z.enum([
  'stripe_api',
  'payment_form',
  'local_validation',
  'network_connection',
  'user_input',
  'system_configuration',
  'crisis_detector',
  'performance_monitor',
  'compliance_checker',
  'anxiety_detector'
]);

export type PaymentErrorSource = z.infer<typeof PaymentErrorSourceSchema>;

/**
 * Compliance Flags for Error Context
 */
export const ComplianceFlagSchema = z.object({
  pciCompliant: z.boolean(),
  hipaaCompliant: z.boolean(),
  auditRequired: z.boolean(),
  sensitiveDataExposed: z.boolean(),
  complianceViolationLevel: z.enum(['none', 'minor', 'major', 'critical'])
});

export type ComplianceFlag = z.infer<typeof ComplianceFlagSchema>;

/**
 * Stripe Error Mapping to Therapeutic Messages
 */
export const StripeErrorMappingSchema = z.object({
  stripeCode: z.string(),
  category: PaymentErrorCategorySchema,
  crisisImpact: CrisisImpactLevelSchema,
  userMessage: z.string(),
  therapeuticMessage: z.string(),
  recoveryStrategy: ErrorRecoveryStrategySchema,
  showCrisisSupport: z.boolean(),
  showAnxietySupport: z.boolean(),
  allowRetry: z.boolean(),
  maxRetries: z.number()
});

export type StripeErrorMapping = z.infer<typeof StripeErrorMappingSchema>;

/**
 * Enhanced Payment Error Definition
 */
export const EnhancedPaymentErrorSchema = z.object({
  // Core error information
  id: z.string(),
  timestamp: z.string(),
  category: PaymentErrorCategorySchema,
  source: PaymentErrorSourceSchema,
  operation: PaymentOperationSchema,

  // Error details
  stripeError: z.object({
    type: z.string(),
    code: z.string(),
    message: z.string(),
    param: z.string().optional(),
    declineCode: z.string().optional()
  }).optional(),

  // Crisis and therapeutic context
  crisisImpact: CrisisImpactLevelSchema,
  therapeuticContext: z.object({
    anxietyTriggering: z.boolean(),
    financialStressIndicator: z.boolean(),
    therapeuticMessage: z.string(),
    supportResources: z.array(z.string()),
    recoveryGuidance: z.string()
  }),

  // Performance impact
  performanceImpact: z.object({
    crisisResponseBlocked: z.boolean(),
    emergencyAccessBlocked: z.boolean(),
    screenLoadDelayed: z.boolean(),
    operationTimeout: z.boolean(),
    expectedDuration: z.number(),
    actualDuration: z.number()
  }),

  // Recovery information
  recoveryStrategy: ErrorRecoveryStrategySchema,
  recoveryOptions: z.array(z.string()),
  automaticRecovery: z.boolean(),
  userInterventionRequired: z.boolean(),

  // Compliance and audit
  compliance: ComplianceFlagSchema,
  auditTrail: z.object({
    errorLogged: z.boolean(),
    userNotified: z.boolean(),
    crisisTeamAlerted: z.boolean(),
    complianceReported: z.boolean(),
    recoveryAttempted: z.boolean()
  }),

  // Context and metadata
  context: PaymentErrorContextSchema,
  metadata: z.object({
    userAgent: z.string().optional(),
    appVersion: z.string(),
    platform: z.enum(['ios', 'android']),
    networkType: z.string().optional(),
    retryCount: z.number(),
    escalationLevel: z.number()
  })
});

export type EnhancedPaymentError = z.infer<typeof EnhancedPaymentErrorSchema>;

/**
 * Error Recovery Result
 */
export const ErrorRecoveryResultSchema = z.object({
  success: z.boolean(),
  strategy: ErrorRecoveryStrategySchema,
  recoveryTime: z.number(),
  fallbackUsed: z.boolean(),
  crisisActivated: z.boolean(),
  userMessage: z.string(),
  therapeuticMessage: z.string().optional(),
  nextSteps: z.array(z.string()),
  performanceCompliant: z.boolean(),
  complianceViolations: z.array(z.string()),
  auditRequired: z.boolean()
});

export type ErrorRecoveryResult = z.infer<typeof ErrorRecoveryResultSchema>;

/**
 * Crisis-Safe Error Handler Interface
 */
export interface CrisisSafeErrorHandler {
  /**
   * Analyze error and determine crisis impact
   */
  analyzeError: (error: any, context: PaymentErrorContext) => EnhancedPaymentError;

  /**
   * Execute recovery strategy with crisis safety guarantees
   */
  executeRecovery: (
    error: EnhancedPaymentError,
    strategy: ErrorRecoveryStrategy
  ) => Promise<ErrorRecoveryResult>;

  /**
   * Handle crisis-triggering errors with immediate response
   */
  handleCrisisError: (
    error: EnhancedPaymentError,
    emergencyBypass?: boolean
  ) => Promise<ErrorRecoveryResult>;

  /**
   * Map Stripe errors to therapeutic messaging
   */
  mapStripeError: (stripeError: any) => StripeErrorMapping;

  /**
   * Validate error handling performance against crisis requirements
   */
  validateCrisisCompliance: (
    error: EnhancedPaymentError,
    recoveryResult: ErrorRecoveryResult
  ) => boolean;

  /**
   * Generate audit trail for error and recovery
   */
  generateAuditTrail: (
    error: EnhancedPaymentError,
    recovery: ErrorRecoveryResult
  ) => {
    auditId: string;
    timestamp: string;
    complianceStatus: ComplianceFlag;
    escalationRequired: boolean;
    crisisTeamNotified: boolean;
  };
}

/**
 * Predefined Stripe Error Mappings
 */
export const STRIPE_ERROR_MAPPINGS: Record<string, StripeErrorMapping> = {
  card_declined: {
    stripeCode: 'card_declined',
    category: 'card_error',
    crisisImpact: 'moderate',
    userMessage: 'Your card was declined. Please try a different payment method or contact your bank.',
    therapeuticMessage: 'Payment difficulties can feel stressful, but they don\'t reflect your worth. Your therapeutic access continues regardless of payment status.',
    recoveryStrategy: 'fallback_method',
    showCrisisSupport: true,
    showAnxietySupport: true,
    allowRetry: true,
    maxRetries: 3
  },

  insufficient_funds: {
    stripeCode: 'insufficient_funds',
    category: 'card_error',
    crisisImpact: 'severe',
    userMessage: 'Insufficient funds. Please try a different payment method or add funds to your account.',
    therapeuticMessage: 'Financial challenges are temporary and don\'t define you. Crisis support and many therapeutic features remain free and available.',
    recoveryStrategy: 'crisis_bypass',
    showCrisisSupport: true,
    showAnxietySupport: true,
    allowRetry: true,
    maxRetries: 2
  },

  authentication_required: {
    stripeCode: 'authentication_required',
    category: 'authentication_error',
    crisisImpact: 'minimal',
    userMessage: 'Additional authentication required. Please complete the verification process.',
    therapeuticMessage: 'Security verification helps protect your account. Take your time with this process.',
    recoveryStrategy: 'user_intervention',
    showCrisisSupport: false,
    showAnxietySupport: false,
    allowRetry: true,
    maxRetries: 5
  },

  rate_limit_error: {
    stripeCode: 'rate_limit_error',
    category: 'rate_limit_error',
    crisisImpact: 'moderate',
    userMessage: 'Too many attempts. Please wait a moment before trying again.',
    therapeuticMessage: 'Take a mindful pause. Sometimes slowing down is exactly what we need.',
    recoveryStrategy: 'delayed_retry',
    showCrisisSupport: false,
    showAnxietySupport: true,
    allowRetry: true,
    maxRetries: 1
  },

  api_connection_error: {
    stripeCode: 'api_connection_error',
    category: 'network_error',
    crisisImpact: 'critical',
    userMessage: 'Connection error. Please check your internet connection and try again.',
    therapeuticMessage: 'Technical difficulties are temporary. Crisis support and emergency features remain accessible offline.',
    recoveryStrategy: 'emergency_mode',
    showCrisisSupport: true,
    showAnxietySupport: false,
    allowRetry: true,
    maxRetries: 3
  }
} as const;

/**
 * Error Recovery Strategy Configurations
 */
export const ERROR_RECOVERY_STRATEGIES: Record<ErrorRecoveryStrategy, {
  timeoutMs: number;
  crisisSafe: boolean;
  therapeuticGuidance: string;
  fallbackEnabled: boolean;
}> = {
  immediate_retry: {
    timeoutMs: 1000,
    crisisSafe: true,
    therapeuticGuidance: 'Retrying your request. Technical issues are temporary.',
    fallbackEnabled: true
  },

  delayed_retry: {
    timeoutMs: 5000,
    crisisSafe: true,
    therapeuticGuidance: 'Taking a brief pause before retrying. Sometimes patience leads to better outcomes.',
    fallbackEnabled: true
  },

  fallback_method: {
    timeoutMs: 2000,
    crisisSafe: true,
    therapeuticGuidance: 'Trying an alternative approach. Flexibility is a strength in both payments and life.',
    fallbackEnabled: false
  },

  crisis_bypass: {
    timeoutMs: 500,
    crisisSafe: true,
    therapeuticGuidance: 'Activating crisis support mode. Your wellbeing is our priority.',
    fallbackEnabled: false
  },

  therapeutic_guidance: {
    timeoutMs: 0,
    crisisSafe: true,
    therapeuticGuidance: 'Providing supportive guidance. Remember, your worth isn\'t determined by payment status.',
    fallbackEnabled: true
  },

  user_intervention: {
    timeoutMs: 30000,
    crisisSafe: true,
    therapeuticGuidance: 'Your input is needed. Take your time and proceed when you feel ready.',
    fallbackEnabled: true
  },

  system_fallback: {
    timeoutMs: 2000,
    crisisSafe: true,
    therapeuticGuidance: 'Using backup systems to maintain your access to therapeutic support.',
    fallbackEnabled: false
  },

  emergency_mode: {
    timeoutMs: 200,
    crisisSafe: true,
    therapeuticGuidance: 'Emergency mode activated. All safety features remain accessible.',
    fallbackEnabled: false
  }
} as const;

/**
 * Crisis Performance Validation Constants
 */
export const CRISIS_PERFORMANCE_REQUIREMENTS = {
  maxCrisisResponseMs: 200,
  maxEmergencyBypassMs: 3000,
  maxErrorRecoveryMs: 5000,
  maxScreenLoadMs: 500,
  maxPaymentProcessingMs: 30000
} as const;

/**
 * Export validation schemas for runtime use
 */
export const PaymentErrorSchemas = {
  PaymentErrorCategory: PaymentErrorCategorySchema,
  CrisisImpactLevel: CrisisImpactLevelSchema,
  ErrorRecoveryStrategy: ErrorRecoveryStrategySchema,
  PaymentErrorContext: PaymentErrorContextSchema,
  PaymentOperation: PaymentOperationSchema,
  PaymentErrorSource: PaymentErrorSourceSchema,
  ComplianceFlag: ComplianceFlagSchema,
  StripeErrorMapping: StripeErrorMappingSchema,
  EnhancedPaymentError: EnhancedPaymentErrorSchema,
  ErrorRecoveryResult: ErrorRecoveryResultSchema
} as const;

/**
 * Type guards for error handling types
 */
export const isEnhancedPaymentError = (obj: any): obj is EnhancedPaymentError => {
  return EnhancedPaymentErrorSchema.safeParse(obj).success;
};

export const isErrorRecoveryResult = (obj: any): obj is ErrorRecoveryResult => {
  return ErrorRecoveryResultSchema.safeParse(obj).success;
};

export const isCrisisImpactingError = (error: EnhancedPaymentError): boolean => {
  return error.crisisImpact === 'severe' || error.crisisImpact === 'critical';
};

export const requiresImmediateAttention = (error: EnhancedPaymentError): boolean => {
  return error.performanceImpact.crisisResponseBlocked ||
         error.performanceImpact.emergencyAccessBlocked ||
         error.crisisImpact === 'critical';
};

/**
 * Utility functions for error handling
 */
export const createErrorContext = (
  baseContext: Partial<PaymentErrorContext>
): PaymentErrorContext => {
  return {
    userId: baseContext.userId || 'unknown',
    sessionId: baseContext.sessionId || 'unknown',
    deviceId: baseContext.deviceId || 'unknown',
    screen: baseContext.screen || 'subscription',
    component: baseContext.component || 'unknown',
    userAction: baseContext.userAction || 'unknown',
    timestamp: new Date().toISOString(),
    crisisMode: baseContext.crisisMode || false,
    anxietyLevel: baseContext.anxietyLevel || 0,
    formData: baseContext.formData,
    paymentMethodId: baseContext.paymentMethodId,
    subscriptionId: baseContext.subscriptionId,
    customerContext: baseContext.customerContext || {
      hasActiveSubscription: false,
      subscriptionStatus: 'unknown',
      paymentMethodCount: 0
    },
    performanceContext: baseContext.performanceContext || {
      operationStartTime: Date.now(),
      expectedDuration: 0,
      crisisTimingViolation: false
    }
  };
};

export const getTherapeuticErrorMessage = (
  error: EnhancedPaymentError,
  userAnxietyLevel: number
): string => {
  if (userAnxietyLevel >= 4 || error.therapeuticContext.anxietyTriggering) {
    return `${error.therapeuticContext.therapeuticMessage}\n\nRemember: Your worth isn't determined by payment status. Crisis support is always available.`;
  }

  return error.therapeuticContext.therapeuticMessage;
};