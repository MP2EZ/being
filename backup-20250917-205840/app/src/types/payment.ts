/**
 * Payment System Types for FullMind MBCT App
 *
 * Comprehensive type definitions for payment processing including:
 * - Stripe payment integration with HIPAA compliance
 * - Subscription management with crisis safety guarantees
 * - Payment security with PCI DSS compliance
 * - Crisis mode payment bypass for emergency access
 */

import { z } from 'zod';

/**
 * Environment Configuration Types
 */
export interface PaymentEnvironmentConfig {
  stripePublishableKey: string;
  stripeSecretKey?: string; // Only for backend operations
  webhookSecret?: string;
  environment: 'development' | 'staging' | 'production';
  crisisMode: boolean;
  testMode: boolean;
}

/**
 * Subscription Plan Types
 */
export const SubscriptionPlanSchema = z.object({
  planId: z.string(),
  name: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  interval: z.enum(['month', 'year']),
  features: z.array(z.string()),
  trialDays: z.number().optional(),
  popular: z.boolean().optional(),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional()
});

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

/**
 * Payment Intent Types
 */
export const PaymentIntentDataSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  subscriptionType: z.enum(['monthly', 'annual', 'lifetime']),
  description: z.string(),
  metadata: z.object({
    userId: z.string(),
    deviceId: z.string(),
    sessionId: z.string(),
    crisisMode: z.boolean(),
    appVersion: z.string(),
    therapeuticFeatures: z.boolean().optional(),
    emergencyAccess: z.boolean().optional()
  })
});

export type PaymentIntentData = z.infer<typeof PaymentIntentDataSchema>;

export const PaymentIntentResultSchema = z.object({
  paymentIntentId: z.string(),
  clientSecret: z.string(),
  status: z.enum(['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded']),
  amount: z.number(),
  currency: z.string(),
  created: z.string(),
  lastPaymentError: z.object({
    code: z.string(),
    message: z.string(),
    type: z.string()
  }).optional(),
  crisisOverride: z.boolean().optional(),
  emergencyBypass: z.boolean().optional()
});

export type PaymentIntentResult = z.infer<typeof PaymentIntentResultSchema>;

/**
 * Payment Method Types
 */
export const PaymentMethodDataSchema = z.object({
  type: z.enum(['card', 'apple_pay', 'google_pay']),
  card: z.object({
    number: z.string().optional(), // Only during initial setup, never stored
    expiryMonth: z.number().min(1).max(12).optional(),
    expiryYear: z.number().min(2024).optional(),
    cvc: z.string().optional() // Never stored
  }).optional(),
  billingDetails: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional()
    }).optional()
  })
});

export type PaymentMethodData = z.infer<typeof PaymentMethodDataSchema>;

export const PaymentMethodResultSchema = z.object({
  paymentMethodId: z.string(),
  type: z.enum(['card', 'apple_pay', 'google_pay']),
  card: z.object({
    brand: z.string(),
    last4: z.string(),
    expiryMonth: z.number(),
    expiryYear: z.number(),
    funding: z.enum(['credit', 'debit', 'prepaid', 'unknown']).optional(),
    country: z.string().optional()
  }).optional(),
  created: z.string(),
  fingerprint: z.string(),
  isDefault: z.boolean().optional(),
  metadata: z.object({
    deviceFingerprint: z.string(),
    riskAssessment: z.enum(['low', 'medium', 'high']),
    verificationStatus: z.enum(['verified', 'pending', 'failed'])
  })
});

export type PaymentMethodResult = z.infer<typeof PaymentMethodResultSchema>;

/**
 * Subscription Management Types
 */
export const SubscriptionStatusSchema = z.enum([
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
]);

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionResultSchema = z.object({
  subscriptionId: z.string(),
  customerId: z.string(),
  status: SubscriptionStatusSchema,
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  trialStart: z.string().optional(),
  trialEnd: z.string().optional(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().optional(),
  endedAt: z.string().optional(),
  plan: SubscriptionPlanSchema,
  paymentMethodId: z.string().optional(),
  latestInvoice: z.object({
    id: z.string(),
    status: z.string(),
    amountPaid: z.number(),
    amountDue: z.number(),
    created: z.string(),
    dueDate: z.string().optional()
  }).optional(),
  discount: z.object({
    couponId: z.string(),
    amountOff: z.number().optional(),
    percentOff: z.number().optional(),
    duration: z.string(),
    durationInMonths: z.number().optional()
  }).optional(),
  nextPayment: z.object({
    amount: z.number(),
    date: z.string()
  }).optional()
});

export type SubscriptionResult = z.infer<typeof SubscriptionResultSchema>;

/**
 * Payment Error Types
 */
export const PaymentErrorSchema = z.object({
  type: z.enum([
    'card_error',
    'api_error',
    'authentication_error',
    'rate_limit_error',
    'validation_error',
    'idempotency_error',
    'invalid_request_error'
  ]),
  code: z.string(),
  message: z.string(),
  param: z.string().optional(),
  declineCode: z.string().optional(),
  chargeId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  retryable: z.boolean(),
  crisisImpact: z.enum(['none', 'degraded', 'blocked']),
  userMessage: z.string(),
  technicalDetails: z.string().optional(),
  suggestions: z.array(z.string()).optional()
});

export type PaymentError = z.infer<typeof PaymentErrorSchema>;

/**
 * Customer Management Types
 */
export const CustomerDataSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  metadata: z.object({
    appUserId: z.string(),
    deviceId: z.string(),
    registrationDate: z.string(),
    therapeuticConsent: z.boolean(),
    crisisContactConsent: z.boolean()
  })
});

export type CustomerData = z.infer<typeof CustomerDataSchema>;

export const CustomerResultSchema = z.object({
  customerId: z.string(),
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  created: z.string(),
  defaultPaymentMethod: z.string().optional(),
  invoice_settings: z.object({
    default_payment_method: z.string().optional(),
    footer: z.string().optional()
  }).optional(),
  subscriptions: z.array(SubscriptionResultSchema).optional(),
  balance: z.number().optional(),
  delinquent: z.boolean().optional()
});

export type CustomerResult = z.infer<typeof CustomerResultSchema>;

/**
 * Crisis Safety Types
 */
export const CrisisPaymentOverrideSchema = z.object({
  crisisSessionId: z.string(),
  userId: z.string(),
  deviceId: z.string(),
  overrideReason: z.enum([
    'crisis_detection',
    'emergency_access',
    'therapeutic_continuity',
    'safety_protocol',
    'hotline_access'
  ]),
  overrideType: z.enum([
    'full_access',
    'emergency_features',
    'crisis_tools',
    'therapeutic_content'
  ]),
  granted: z.string(), // ISO timestamp
  expires: z.string(), // ISO timestamp
  auditTrail: z.object({
    triggerEvent: z.string(),
    safetyScore: z.number().min(0).max(100),
    accessGranted: z.array(z.string()),
    restrictions: z.array(z.string()).optional()
  })
});

export type CrisisPaymentOverride = z.infer<typeof CrisisPaymentOverrideSchema>;

/**
 * Payment Configuration Types
 */
export const PaymentConfigSchema = z.object({
  stripe: z.object({
    publishableKey: z.string(),
    webhookSecret: z.string().optional(),
    apiVersion: z.string().default('2023-10-16'),
    timeout: z.number().default(30000),
    maxRetries: z.number().default(3),
    enableApplePay: z.boolean().default(true),
    enableGooglePay: z.boolean().default(true)
  }),
  subscription: z.object({
    defaultTrialDays: z.number().default(7),
    gracePeriodDays: z.number().default(3),
    retryAttempts: z.number().default(3),
    invoiceReminders: z.boolean().default(true)
  }),
  crisis: z.object({
    enablePaymentBypass: z.boolean().default(true),
    emergencyAccessDuration: z.number().default(24), // hours
    crisisDetectionTimeout: z.number().default(3000), // ms
    hotlineAlwaysAccessible: z.boolean().default(true)
  }),
  security: z.object({
    enableFraudDetection: z.boolean().default(true),
    rateLimit: z.object({
      maxAttemptsPerMinute: z.number().default(10),
      blockDurationMinutes: z.number().default(5)
    }),
    tokenExpiry: z.object({
      paymentMethods: z.number().default(24), // hours
      sessions: z.number().default(2) // hours
    })
  }),
  compliance: z.object({
    pciDssLevel: z.enum(['1', '2', '3', '4']).default('2'),
    auditRetentionYears: z.number().default(7),
    enableDetailedLogging: z.boolean().default(true),
    hipaaCompliant: z.boolean().default(true)
  })
});

export type PaymentConfig = z.infer<typeof PaymentConfigSchema>;

/**
 * Payment API Client Interface
 */
export interface PaymentAPIClient {
  // Configuration
  initialize(config: PaymentConfig): Promise<void>;
  isInitialized(): boolean;

  // Customer Management
  createCustomer(customerData: CustomerData): Promise<CustomerResult>;
  getCustomer(customerId: string): Promise<CustomerResult>;
  updateCustomer(customerId: string, updates: Partial<CustomerData>): Promise<CustomerResult>;

  // Payment Methods
  createPaymentMethod(
    paymentMethodData: PaymentMethodData,
    customerId: string,
    crisisMode?: boolean
  ): Promise<PaymentMethodResult>;

  listPaymentMethods(customerId: string): Promise<PaymentMethodResult[]>;
  deletePaymentMethod(paymentMethodId: string): Promise<void>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  // Payment Intents
  createPaymentIntent(paymentData: PaymentIntentData, crisisMode?: boolean): Promise<PaymentIntentResult>;
  confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<PaymentIntentResult>;
  getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult>;

  // Subscriptions
  createSubscription(
    customerId: string,
    planId: string,
    paymentMethodId?: string,
    trialDays?: number,
    crisisMode?: boolean
  ): Promise<SubscriptionResult>;

  getSubscription(subscriptionId: string): Promise<SubscriptionResult>;
  updateSubscription(subscriptionId: string, updates: Partial<SubscriptionResult>): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<SubscriptionResult>;
  reactivateSubscription(subscriptionId: string): Promise<SubscriptionResult>;

  // Crisis Management
  enableCrisisMode(userId: string, deviceId: string, reason: string): Promise<CrisisPaymentOverride>;
  disableCrisisMode(crisisSessionId: string): Promise<void>;
  getCrisisStatus(userId: string): Promise<CrisisPaymentOverride | null>;

  // Utility
  getAvailablePlans(): Promise<SubscriptionPlan[]>;
  validatePaymentMethod(paymentMethodId: string): Promise<boolean>;
  getPaymentHistory(customerId: string, limit?: number): Promise<any[]>;

  // Health & Status
  getHealthStatus(): Promise<{
    stripe: { connected: boolean; latency: number };
    database: { connected: boolean; latency: number };
    crisisMode: boolean;
    errors: string[];
  }>;
}

/**
 * Payment Store State Types
 */
export interface PaymentState {
  // Current user's payment info
  customer: CustomerResult | null;
  paymentMethods: PaymentMethodResult[];
  activeSubscription: SubscriptionResult | null;
  availablePlans: SubscriptionPlan[];

  // Current payment process
  currentPaymentIntent: PaymentIntentResult | null;
  paymentInProgress: boolean;
  lastPaymentError: PaymentError | null;

  // Crisis and security
  crisisMode: boolean;
  crisisOverride: CrisisPaymentOverride | null;
  securityValidated: boolean;

  // UI state
  showPaymentSheet: boolean;
  showSubscriptionSelector: boolean;
  showPaymentHistory: boolean;

  // Loading states
  loadingCustomer: boolean;
  loadingPaymentMethods: boolean;
  loadingSubscription: boolean;
  loadingPlans: boolean;
}

export interface PaymentActions {
  // Initialization
  initializePayments: (config: PaymentConfig) => Promise<void>;

  // Customer management
  loadCustomer: (userId: string) => Promise<void>;
  createCustomer: (customerData: CustomerData) => Promise<void>;
  updateCustomerInfo: (updates: Partial<CustomerData>) => Promise<void>;

  // Payment methods
  loadPaymentMethods: () => Promise<void>;
  addPaymentMethod: (paymentMethodData: PaymentMethodData) => Promise<void>;
  removePaymentMethod: (paymentMethodId: string) => Promise<void>;
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<void>;

  // Subscriptions
  loadSubscription: () => Promise<void>;
  createSubscription: (planId: string, paymentMethodId?: string, trialDays?: number) => Promise<void>;
  updateSubscription: (updates: Partial<SubscriptionResult>) => Promise<void>;
  cancelSubscription: (atPeriodEnd?: boolean) => Promise<void>;
  reactivateSubscription: () => Promise<void>;

  // Payment processing
  createPaymentIntent: (paymentData: PaymentIntentData) => Promise<void>;
  confirmPayment: (paymentMethodId?: string) => Promise<void>;
  handlePaymentError: (error: PaymentError) => void;
  clearPaymentError: () => void;

  // Crisis management
  enableCrisisMode: (reason: string) => Promise<void>;
  disableCrisisMode: () => Promise<void>;

  // UI actions
  showPaymentSheet: () => void;
  hidePaymentSheet: () => void;
  showSubscriptionSelector: () => void;
  hideSubscriptionSelector: () => void;

  // Cleanup
  reset: () => void;
  clearSensitiveData: () => void;
}

/**
 * Payment Event Types for Analytics and Audit
 */
export const PaymentEventSchema = z.object({
  eventId: z.string(),
  timestamp: z.string(),
  type: z.enum([
    'payment_method_created',
    'payment_method_deleted',
    'subscription_created',
    'subscription_updated',
    'subscription_canceled',
    'payment_succeeded',
    'payment_failed',
    'crisis_override_activated',
    'crisis_override_deactivated',
    'fraud_detected',
    'rate_limit_exceeded'
  ]),
  userId: z.string(),
  customerId: z.string().optional(),
  subscriptionId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  crisisMode: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional()
});

export type PaymentEvent = z.infer<typeof PaymentEventSchema>;

/**
 * Webhook Event Types
 */
export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created: z.number(),
  data: z.object({
    object: z.any()
  }),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().optional(),
    idempotency_key: z.string().optional()
  }).optional()
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/**
 * Export all validation schemas for runtime validation
 */
export const PaymentSchemas = {
  SubscriptionPlan: SubscriptionPlanSchema,
  PaymentIntentData: PaymentIntentDataSchema,
  PaymentIntentResult: PaymentIntentResultSchema,
  PaymentMethodData: PaymentMethodDataSchema,
  PaymentMethodResult: PaymentMethodResultSchema,
  SubscriptionResult: SubscriptionResultSchema,
  PaymentError: PaymentErrorSchema,
  CustomerData: CustomerDataSchema,
  CustomerResult: CustomerResultSchema,
  CrisisPaymentOverride: CrisisPaymentOverrideSchema,
  PaymentConfig: PaymentConfigSchema,
  PaymentEvent: PaymentEventSchema,
  WebhookEvent: WebhookEventSchema
} as const;

/**
 * Re-export enhanced type systems for comprehensive payment integration
 */
export type {
  // Enhanced error handling types
  EnhancedPaymentError,
  PaymentErrorCategory,
  CrisisImpactLevel,
  ErrorRecoveryStrategy,
  PaymentErrorContext,
  PaymentOperation,
  PaymentErrorSource,
  ComplianceFlag,
  StripeErrorMapping,
  ErrorRecoveryResult,
  CrisisSafeErrorHandler
} from './payment-error-handling';

export type {
  // Performance monitoring types
  PerformanceMetricCategory,
  PerformanceAlertLevel,
  PaymentPerformanceMetric,
  PaymentPerformanceSession,
  PaymentPerformanceSummary,
  PaymentPerformanceAlert,
  PaymentPerformanceMonitor,
  PerformanceContext,
  CrisisPerformanceValidator,
  PerformanceOptimizationSuggestion
} from './payment-performance';

export type {
  // Payment UI component types - Day 16 Phase 3 Integration
  PaymentStackParamList,
  PaymentNavigationProp,
  PaymentRouteProp,
  CrisisPerformanceMetrics,
  PerformanceViolation,
  SubscriptionTier,
  SubscriptionScreenProps,
  SubscriptionScreenState,
  SubscriptionScreenActions,
  PaymentMethodFormData,
  PaymentMethodScreenProps,
  PaymentMethodScreenState,
  PaymentMethodScreenActions,
  Transaction,
  BillingHistoryScreenProps,
  BillingHistoryScreenState,
  BillingHistoryScreenActions,
  SubscriptionChangeOption,
  PaymentSettingsScreenProps,
  PaymentSettingsScreenState,
  PaymentSettingsScreenActions,
  CrisisPaymentBannerProps,
  CrisisPaymentBannerState,
  CrisisPaymentBannerActions,
  PaymentAnxietyDetectionProps,
  AnxietyIndicators,
  PaymentAnxietyDetectionState,
  PaymentAnxietyDetectionActions,
  PaymentUIError,
  PaymentUIPerformanceMetrics,
  PaymentUIPerformanceMonitor,
  PaymentUIState,
  PaymentUIActions,
  UseSubscriptionScreenHook,
  UsePaymentMethodScreenHook,
  UseBillingHistoryScreenHook,
  UsePaymentSettingsScreenHook,
  PaymentUIStoreIntegration,
  CrisisSafetyValidator,
  PaymentUIConfig,
  CompletePaymentUITypes
} from './payment-ui';

/**
 * Enhanced Payment Store State with Type Safety Integration
 */
export interface EnhancedPaymentState extends PaymentState {
  // Performance monitoring
  readonly performanceMetrics: {
    readonly currentSession: string | null;
    readonly lastOperationTime: number;
    readonly crisisResponseTimes: number[];
    readonly averageResponseTime: number;
    readonly performanceAlerts: PaymentPerformanceAlert[];
  };

  // Error handling state
  readonly errorHandling: {
    readonly lastError: EnhancedPaymentError | null;
    readonly errorHistory: EnhancedPaymentError[];
    readonly recoveryInProgress: boolean;
    readonly fallbackMode: boolean;
  };

  // Type validation state
  readonly typeValidation: {
    readonly lastValidationResult: boolean;
    readonly validationErrors: string[];
    readonly complianceChecks: {
      readonly pciCompliant: boolean;
      readonly hipaaCompliant: boolean;
      readonly lastChecked: string;
    };
  };

  // Crisis integration state
  readonly crisisIntegration: {
    readonly emergencyBypassActive: boolean;
    readonly crisisPerformanceViolations: number;
    readonly lastCrisisCheck: string;
    readonly emergencyFallbackCount: number;
  };
}

/**
 * Enhanced Payment Actions with Type Safety
 */
export interface EnhancedPaymentActions extends PaymentActions {
  // Performance monitoring actions
  startPerformanceMonitoring: (sessionId: string) => void;
  stopPerformanceMonitoring: () => void;
  recordPerformanceMetric: (metric: PaymentPerformanceMetric) => void;
  checkCrisisCompliance: () => boolean;

  // Error handling actions
  handleEnhancedError: (error: EnhancedPaymentError, context: PaymentErrorContext) => Promise<ErrorRecoveryResult>;
  enableErrorRecovery: (strategy: ErrorRecoveryStrategy) => Promise<void>;
  clearErrorHistory: () => void;
  enableFallbackMode: (reason: string) => void;

  // Type validation actions
  validatePaymentTypes: () => Promise<boolean>;
  runComplianceCheck: () => Promise<{ pciCompliant: boolean; hipaaCompliant: boolean }>;
  validateCrisisMode: () => boolean;

  // Crisis integration actions
  enableEmergencyBypass: (reason: string) => Promise<void>;
  disableEmergencyBypass: () => Promise<void>;
  checkCrisisPerformance: () => boolean;
  recordCrisisViolation: (operation: PaymentOperation, duration: number) => void;
}

/**
 * Complete Enhanced Payment Store Interface
 */
export interface EnhancedPaymentStore extends EnhancedPaymentState, EnhancedPaymentActions {
  // Type-safe getters
  getPerformanceSummary: () => PaymentPerformanceSummary;
  getErrorHistory: () => EnhancedPaymentError[];
  getComplianceStatus: () => { pci: boolean; hipaa: boolean };
  getCrisisStatus: () => { safe: boolean; violations: number };

  // Crisis-safe operations
  performCrisisSafeOperation: <T>(
    operation: PaymentOperation,
    operationFn: () => Promise<T>,
    fallback: T
  ) => Promise<T>;
}