/**
 * Payment & Subscription Canonical Types - Phase 4B Consolidation
 *
 * Consolidated from 12 payment/subscription type files:
 * - payment.ts (base)
 * - subscription.ts (base)
 * - payment-ui.ts
 * - payment-performance.ts
 * - payment-error-handling.ts
 * - enhanced-payment-components.ts
 * - payment-pressable-enhanced.ts
 * - payment-interaction-enhanced.ts
 * - payment-crisis-detection-enhanced.ts
 * - payment-hipaa-compliance-enhanced.ts
 * - subscription-components.ts
 * - subscription-store.ts
 *
 * CRITICAL PRESERVATION REQUIREMENTS:
 * - Crisis payment bypass protocols (IMMUTABLE)
 * - HIPAA + PCI DSS compliance validation (IMMUTABLE)
 * - Payment anxiety detection algorithms (IMMUTABLE)
 * - Therapeutic subscription continuity (IMMUTABLE)
 * - Emergency access override patterns (IMMUTABLE)
 *
 * @consolidation_result 12 files → 1 canonical file (92% reduction)
 */

import { z } from 'zod';
import type { ViewStyle, PressableProps, AccessibilityRole } from 'react-native';

// === BRANDED TYPES FOR PAYMENT SYSTEM ===

/**
 * Branded type for payment amounts with validation
 */
export type PaymentAmount = number & { readonly __brand: 'PaymentAmount' };

/**
 * Branded type for currency codes with ISO validation
 */
export type CurrencyCode = string & { readonly __brand: 'CurrencyCode' };

/**
 * Branded type for subscription tiers with therapeutic validation
 */
export type SubscriptionTier = ('free' | 'basic' | 'premium' | 'lifetime' | 'trial' | 'grace_period') & { readonly __brand: 'SubscriptionTier' };

/**
 * Branded type for payment anxiety severity levels
 */
export type PaymentAnxietySeverity = ('minimal' | 'mild' | 'moderate' | 'severe' | 'crisis') & { readonly __brand: 'PaymentAnxietySeverity' };

/**
 * Payment anxiety severity schema for validation
 */
export const PaymentAnxietySeveritySchema = z.enum(['minimal', 'mild', 'moderate', 'severe', 'crisis']);

// === CORE PAYMENT CONFIGURATION ===

/**
 * Payment environment configuration with crisis support
 */
export const PaymentEnvironmentConfigSchema = z.object({
  // Stripe configuration
  stripePublishableKey: z.string(),
  stripeSecretKey: z.string().optional(),
  webhookSecret: z.string().optional(),

  // Environment settings
  environment: z.enum(['development', 'staging', 'production']),
  testMode: z.boolean().default(false),

  // Crisis and therapeutic settings (IMMUTABLE)
  crisisMode: z.boolean().default(false),
  emergencyBypassEnabled: z.boolean().default(true),
  therapeuticContinuityEnabled: z.boolean().default(true),
  paymentAnxietyDetectionEnabled: z.boolean().default(true),

  // Compliance settings (IMMUTABLE)
  hipaaCompliant: z.boolean().default(true),
  pciDssCompliant: z.boolean().default(true),
  auditLoggingEnabled: z.boolean().default(true)
});

export type PaymentEnvironmentConfig = z.infer<typeof PaymentEnvironmentConfigSchema>;

// === SUBSCRIPTION SYSTEM ===

/**
 * Subscription plan with therapeutic features
 */
export const SubscriptionPlanSchema = z.object({
  // Plan identification
  planId: z.string(),
  name: z.string(),
  description: z.string(),

  // Pricing
  amount: z.number().positive(),
  currency: z.string().length(3),
  interval: z.enum(['month', 'year', 'lifetime']),

  // Plan configuration
  features: z.array(z.string()),
  trialDays: z.number().min(0).optional(),
  popular: z.boolean().optional(),

  // Stripe integration
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),

  // Therapeutic features (IMMUTABLE)
  therapeuticFeatures: z.object({
    unlimitedAssessments: z.boolean(),
    advancedMBCTExercises: z.boolean(),
    personalizedInsights: z.boolean(),
    crisisSupport: z.boolean(),
    crossDeviceSync: z.boolean(),
    dataExport: z.boolean(),
    prioritySupport: z.boolean()
  }),

  // Crisis access (IMMUTABLE)
  crisisAccess: z.object({
    emergencyBypass: z.boolean(),
    crisisHotlineIntegration: z.boolean(),
    emergencyContactNotification: z.boolean(),
    therapeuticContinuity: z.boolean()
  })
});

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

/**
 * Subscription state with trial and payment status
 */
export const SubscriptionStateSchema = z.object({
  // Subscription status
  status: z.enum([
    'inactive',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused',
    'emergency_access'
  ]),

  // Current subscription
  currentPlan: SubscriptionPlanSchema.optional(),
  subscriptionId: z.string().optional(),
  customerId: z.string().optional(),

  // Trial information
  trial: z.object({
    isInTrial: z.boolean(),
    trialStartDate: z.string().optional(),
    trialEndDate: z.string().optional(),
    trialDaysRemaining: z.number().optional(),
    trialExtended: z.boolean().optional()
  }),

  // Billing information
  billing: z.object({
    currentPeriodStart: z.string().optional(),
    currentPeriodEnd: z.string().optional(),
    nextBillingDate: z.string().optional(),
    lastPaymentDate: z.string().optional(),
    lastPaymentAmount: z.number().optional(),
    paymentMethodAttached: z.boolean()
  }),

  // Crisis and emergency access (IMMUTABLE)
  emergency: z.object({
    emergencyAccessActive: z.boolean(),
    emergencyAccessReason: z.enum([
      'crisis_override',
      'payment_failure_grace',
      'therapeutic_continuity',
      'technical_issue',
      'clinical_need'
    ]).optional(),
    emergencyAccessExpiresAt: z.string().optional(),
    gracePeriodActive: z.boolean(),
    gracePeriodDaysRemaining: z.number().optional()
  })
});

export type SubscriptionState = z.infer<typeof SubscriptionStateSchema>;

// === PAYMENT PROCESSING ===

/**
 * Payment intent data with therapeutic context
 */
export const PaymentIntentDataSchema = z.object({
  // Payment details
  amount: z.number().positive(),
  currency: z.string().length(3),
  subscriptionType: z.enum(['monthly', 'annual', 'lifetime']),
  description: z.string(),

  // Metadata with therapeutic context
  metadata: z.object({
    userId: z.string(),
    deviceId: z.string(),
    sessionId: z.string(),
    appVersion: z.string(),

    // Crisis and therapeutic flags (IMMUTABLE)
    crisisMode: z.boolean(),
    therapeuticFeatures: z.boolean().optional(),
    emergencyAccess: z.boolean().optional(),
    paymentAnxietyDetected: z.boolean().optional(),

    // Compliance tracking
    hipaaCompliant: z.boolean(),
    pciCompliant: z.boolean(),
    auditTrailId: z.string().optional()
  })
});

export type PaymentIntentData = z.infer<typeof PaymentIntentDataSchema>;

/**
 * Payment method data with security validation
 */
export const PaymentMethodDataSchema = z.object({
  // Payment method type
  type: z.enum(['card', 'apple_pay', 'google_pay']),

  // Card details (PCI DSS compliant - never stored)
  card: z.object({
    // Transient data only - never persisted
    number: z.string().optional(),
    expiryMonth: z.number().min(1).max(12).optional(),
    expiryYear: z.number().min(2024).optional(),
    cvc: z.string().optional()
  }).optional(),

  // Billing details
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
  }),

  // Security and compliance
  security: z.object({
    tokenized: z.boolean(),
    pciCompliant: z.boolean(),
    fraudCheckPassed: z.boolean(),
    riskScore: z.number().min(0).max(100).optional()
  })
});

export type PaymentMethodData = z.infer<typeof PaymentMethodDataSchema>;

// === PAYMENT ANXIETY DETECTION ===

/**
 * Payment anxiety indicators for crisis detection
 */
export const PaymentAnxietyIndicatorsSchema = z.object({
  // Behavioral indicators
  behavioral: z.object({
    rapidTapping: z.boolean(),
    hesitationPatterns: z.boolean(),
    selectionChanges: z.boolean(),
    priceAvoidanceBehavior: z.boolean(),
    timeSpentOnPayment: z.number(), // milliseconds
    backNavigationCount: z.number(),
    formFieldRevisitCount: z.number()
  }),

  // Physiological indicators (if available)
  physiological: z.object({
    heartRateElevated: z.boolean().optional(),
    stressLevelDetected: z.boolean().optional(),
    anxietyScoreElevated: z.boolean().optional()
  }).optional(),

  // Contextual indicators
  contextual: z.object({
    recentAssessmentScores: z.object({
      phq9Score: z.number().optional(),
      gad7Score: z.number().optional(),
      lastAssessmentDate: z.string().optional()
    }).optional(),
    recentCrisisEvents: z.boolean(),
    financialStressHistory: z.boolean(),
    paymentFailureHistory: z.boolean()
  }),

  // Severity assessment
  severity: z.object({
    overallSeverity: PaymentAnxietySeveritySchema.optional(),
    riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
    interventionRecommended: z.boolean(),
    crisisEscalationNeeded: z.boolean(),
    therapeuticSupportNeeded: z.boolean()
  })
});

export type PaymentAnxietyIndicators = z.infer<typeof PaymentAnxietyIndicatorsSchema>;

/**
 * Payment anxiety intervention actions
 */
export const PaymentAnxietyInterventionSchema = z.object({
  // Intervention type
  interventionType: z.enum([
    'breathing_exercise',
    'payment_pause',
    'simplified_flow',
    'support_contact',
    'crisis_escalation',
    'therapeutic_content',
    'financial_counseling'
  ]),

  // Intervention details
  intervention: z.object({
    triggeredAt: z.string(),
    duration: z.number().optional(),
    effectiveness: z.enum(['very_helpful', 'somewhat_helpful', 'not_helpful', 'unknown']).optional(),
    userFeedback: z.string().optional(),
    followUpNeeded: z.boolean()
  }),

  // Therapeutic integration
  therapeutic: z.object({
    mbctExerciseUsed: z.boolean(),
    breathingExerciseDuration: z.number().optional(),
    mindfulnessContentShown: z.boolean(),
    copingStrategiesProvided: z.array(z.string()).optional()
  }).optional()
});

export type PaymentAnxietyIntervention = z.infer<typeof PaymentAnxietyInterventionSchema>;

// === CRISIS PAYMENT OVERRIDE ===

/**
 * Crisis payment override for emergency access
 */
export const CrisisPaymentOverrideSchema = z.object({
  // Override identification
  overrideId: z.string(),
  userId: z.string(),
  triggeredAt: z.string(),

  // Crisis context
  crisisContext: z.object({
    crisisId: z.string(),
    crisisSeverity: z.enum(['moderate', 'high', 'emergency']),
    crisisType: z.enum([
      'suicidal_ideation',
      'self_harm_risk',
      'severe_depression',
      'panic_disorder',
      'anxiety_crisis',
      'payment_anxiety_crisis'
    ]),
    emergencyServicesNeeded: z.boolean()
  }),

  // Override details
  override: z.object({
    overrideType: z.enum([
      'emergency_bypass',
      'grace_period_extension',
      'therapeutic_continuity',
      'crisis_support_access'
    ]),

    accessGranted: z.array(z.enum([
      'all_features',
      'assessment_tools',
      'breathing_exercises',
      'crisis_resources',
      'emergency_contacts',
      'therapeutic_content'
    ])),

    duration: z.object({
      durationHours: z.number(),
      expiresAt: z.string(),
      extensible: z.boolean(),
      autoRenewal: z.boolean()
    }),

    restrictions: z.object({
      dataExportDisabled: z.boolean(),
      socialSharingDisabled: z.boolean(),
      paymentPageHidden: z.boolean(),
      subscriptionPromptDisabled: z.boolean()
    })
  }),

  // Audit and compliance (IMMUTABLE)
  audit: z.object({
    authorizedBy: z.enum(['system_automatic', 'clinical_override', 'emergency_protocol']),
    clinicalJustification: z.string().optional(),
    hipaaCompliant: z.boolean(),
    auditTrailId: z.string(),
    reviewRequired: z.boolean(),
    clinicalFollowupScheduled: z.boolean()
  })
});

export type CrisisPaymentOverride = z.infer<typeof CrisisPaymentOverrideSchema>;

// === PAYMENT UI COMPONENTS ===

/**
 * Enhanced Payment Pressable Props
 */
export interface PaymentPressableProps extends Omit<PressableProps, 'style'> {
  // Payment-specific props
  readonly variant: 'subscribe' | 'upgrade' | 'payment_method' | 'billing';
  readonly subscriptionTier?: SubscriptionTier;
  readonly paymentAmount?: PaymentAmount;
  readonly currency?: CurrencyCode;

  // Crisis and anxiety handling (IMMUTABLE)
  readonly crisisSafetyLevel: 'standard' | 'anxiety_aware' | 'crisis_safe';
  readonly anxietyDetectionEnabled?: boolean;
  readonly crisisOverrideEnabled?: boolean;

  // Styling with anxiety considerations
  readonly style?: ViewStyle | ViewStyle[] | ((state: {
    pressed: boolean;
    anxietyDetected: boolean;
    crisisModeActive: boolean;
  }) => ViewStyle | ViewStyle[]);

  // Enhanced callbacks
  readonly onPress?: (context: PaymentInteractionContext) => void | Promise<void>;
  readonly onAnxietyDetected?: (indicators: PaymentAnxietyIndicators) => void;
  readonly onCrisisEscalation?: (crisisId: string) => void;
  readonly onPaymentComplete?: (result: PaymentResult) => void;
  readonly onPaymentError?: (error: PaymentError) => void;

  // Accessibility enhancements
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: AccessibilityRole;

  // Performance and monitoring
  readonly performanceTracking?: boolean;
  readonly anxietyMonitoring?: boolean;
}

/**
 * Payment interaction context
 */
export interface PaymentInteractionContext {
  readonly timestamp: Date;
  readonly variant: 'subscribe' | 'upgrade' | 'payment_method' | 'billing';
  readonly subscriptionTier?: SubscriptionTier;
  readonly paymentAmount?: PaymentAmount;
  readonly userAgent: string;
  readonly platform: 'ios' | 'android';
  readonly anxietyIndicators?: PaymentAnxietyIndicators;
  readonly crisisModeActive: boolean;
}

/**
 * Payment result with comprehensive tracking
 */
export const PaymentResultSchema = z.object({
  // Result status
  success: z.boolean(),
  paymentIntentId: z.string().optional(),
  subscriptionId: z.string().optional(),

  // Payment details
  amount: z.number().optional(),
  currency: z.string().optional(),
  paymentMethod: z.string().optional(),

  // Performance metrics
  performance: z.object({
    processingTime: z.number(),
    responseTime: z.number(),
    anxietyInterventionsUsed: z.number(),
    crisisOverrideActivated: z.boolean()
  }),

  // Error handling
  error: z.object({
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean(),
    fallbackUsed: z.boolean()
  }).optional(),

  // Therapeutic impact
  therapeutic: z.object({
    anxietyReduced: z.boolean().optional(),
    copingStrategiesUsed: z.array(z.string()).optional(),
    therapeuticContinuityMaintained: z.boolean(),
    followUpRecommended: z.boolean()
  })
});

export type PaymentResult = z.infer<typeof PaymentResultSchema>;

// === ERROR HANDLING ===

/**
 * Enhanced payment error with recovery strategies
 */
export interface PaymentError extends Error {
  readonly code: PaymentErrorCode;
  readonly category: PaymentErrorCategory;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly recoverable: boolean;
  readonly fallbackAvailable: boolean;
  readonly crisisImpact: 'none' | 'low' | 'medium' | 'high' | 'crisis_escalation';
  readonly recoveryStrategy: PaymentRecoveryStrategy;
  readonly therapeuticGuidance: string;
  readonly timestamp: Date;
  readonly context: PaymentInteractionContext;
}

/**
 * Payment error codes
 */
export type PaymentErrorCode =
  | 'CARD_DECLINED'
  | 'INSUFFICIENT_FUNDS'
  | 'PAYMENT_METHOD_INVALID'
  | 'NETWORK_ERROR'
  | 'STRIPE_ERROR'
  | 'SUBSCRIPTION_ERROR'
  | 'CRISIS_OVERRIDE_NEEDED'
  | 'ANXIETY_ESCALATION'
  | 'COMPLIANCE_VIOLATION'
  | 'UNKNOWN_ERROR';

/**
 * Payment error categories
 */
export type PaymentErrorCategory =
  | 'payment_processing'
  | 'subscription_management'
  | 'crisis_safety'
  | 'anxiety_intervention'
  | 'compliance_security'
  | 'network_connectivity'
  | 'user_experience';

/**
 * Payment recovery strategies
 */
export type PaymentRecoveryStrategy =
  | 'retry_payment'
  | 'try_different_method'
  | 'activate_grace_period'
  | 'crisis_override_enable'
  | 'anxiety_intervention'
  | 'contact_support'
  | 'therapeutic_guidance'
  | 'no_recovery_available';

// === FEATURE GATES ===

/**
 * Feature gate configuration for subscription tiers
 */
export const FeatureGateConfigSchema = z.object({
  featureId: z.string(),
  name: z.string(),
  description: z.string(),

  // Tier requirements
  requiredTier: z.enum(['free', 'basic', 'premium', 'lifetime']),
  crisisOverrideAllowed: z.boolean(),
  emergencyAccessAllowed: z.boolean(),

  // Gate behavior
  gateType: z.enum(['hard_gate', 'soft_gate', 'trial_gate', 'crisis_gate']),
  fallbackBehavior: z.enum(['show_upgrade', 'disable_feature', 'crisis_access', 'trial_extension']),

  // Therapeutic considerations
  therapeutic: z.object({
    clinicallyRequired: z.boolean(),
    crisisEssential: z.boolean(),
    therapeuticValue: z.enum(['low', 'medium', 'high', 'critical']),
    mbctIntegrated: z.boolean()
  })
});

export type FeatureGateConfig = z.infer<typeof FeatureGateConfigSchema>;

// === STORE INTEGRATION ===

/**
 * Payment store state
 */
export interface PaymentStoreState {
  // Configuration
  readonly config: PaymentEnvironmentConfig;

  // Subscription state
  readonly subscription: SubscriptionState;

  // Payment processing state
  readonly payment: {
    readonly isProcessing: boolean;
    readonly currentIntent?: string;
    readonly lastResult?: PaymentResult;
    readonly lastError?: PaymentError;
  };

  // Crisis and anxiety state (IMMUTABLE)
  readonly crisis: {
    readonly overrideActive: boolean;
    readonly override?: CrisisPaymentOverride;
    readonly gracePeriodActive: boolean;
    readonly emergencyAccessActive: boolean;
  };

  readonly anxiety: {
    readonly detectionEnabled: boolean;
    readonly currentLevel: PaymentAnxietySeverity;
    readonly indicators?: PaymentAnxietyIndicators;
    readonly interventionActive: boolean;
    readonly intervention?: PaymentAnxietyIntervention;
  };

  // Performance and monitoring
  readonly performance: {
    readonly metricsEnabled: boolean;
    readonly responseTime: number;
    readonly errorRate: number;
    readonly anxietyInterventionRate: number;
  };
}

/**
 * Payment store actions
 */
export interface PaymentStoreActions {
  // Configuration actions
  updateConfig: (config: Partial<PaymentEnvironmentConfig>) => void;

  // Subscription actions
  createSubscription: (planId: string) => Promise<void>;
  updateSubscription: (planId: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;

  // Payment processing actions
  processPayment: (data: PaymentIntentData) => Promise<PaymentResult>;
  addPaymentMethod: (data: PaymentMethodData) => Promise<void>;
  removePaymentMethod: (methodId: string) => Promise<void>;

  // Crisis and anxiety actions (IMMUTABLE)
  activateCrisisOverride: (crisisId: string, reason: string) => Promise<void>;
  deactivateCrisisOverride: () => Promise<void>;
  detectPaymentAnxiety: (indicators: PaymentAnxietyIndicators) => Promise<void>;
  triggerAnxietyIntervention: (type: string) => Promise<void>;

  // Feature gate actions
  checkFeatureAccess: (featureId: string) => Promise<boolean>;
  requestFeatureAccess: (featureId: string) => Promise<void>;

  // Utility actions
  reset: () => void;
  clearErrors: () => void;
}

// === TYPE GUARDS ===

export function isPaymentAmount(value: unknown): value is PaymentAmount {
  return typeof value === 'number' && value > 0 && value < 1000000; // Up to $10,000
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' &&
         value.length === 3 &&
         /^[A-Z]{3}$/.test(value);
}

export function isSubscriptionTier(value: unknown): value is SubscriptionTier {
  return typeof value === 'string' &&
         ['free', 'basic', 'premium', 'lifetime'].includes(value);
}

export function isPaymentAnxietySeverity(value: unknown): value is PaymentAnxietySeverity {
  return typeof value === 'string' &&
         ['minimal', 'mild', 'moderate', 'severe', 'crisis'].includes(value);
}

export const isPaymentResult = (value: unknown): value is PaymentResult => {
  try {
    PaymentResultSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isCrisisPaymentOverride = (value: unknown): value is CrisisPaymentOverride => {
  try {
    CrisisPaymentOverrideSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

// === FACTORY FUNCTIONS ===

export function createPaymentAmount(amount: number): PaymentAmount {
  if (!isPaymentAmount(amount)) {
    throw new Error(`Invalid payment amount: ${amount}. Must be positive and under $10,000`);
  }
  return amount as PaymentAmount;
}

export function createCurrencyCode(currency: string): CurrencyCode {
  if (!isCurrencyCode(currency)) {
    throw new Error(`Invalid currency code: ${currency}. Must be 3-letter ISO code`);
  }
  return currency.toUpperCase() as CurrencyCode;
}

export function createSubscriptionTier(tier: string): SubscriptionTier {
  if (!isSubscriptionTier(tier)) {
    throw new Error(`Invalid subscription tier: ${tier}`);
  }
  return tier as SubscriptionTier;
}

export function createPaymentAnxietySeverity(severity: string): PaymentAnxietySeverity {
  if (!isPaymentAnxietySeverity(severity)) {
    throw new Error(`Invalid payment anxiety severity: ${severity}`);
  }
  return severity as PaymentAnxietySeverity;
}

// === CONSTANTS (IMMUTABLE) ===

/**
 * Payment system constants
 * CRITICAL: These values are IMMUTABLE for clinical and therapeutic safety
 */
export const PAYMENT_CANONICAL_CONSTANTS = {
  // Crisis override settings (IMMUTABLE)
  CRISIS_OVERRIDE: {
    DEFAULT_DURATION_HOURS: 24,
    MAX_DURATION_HOURS: 168, // 7 days
    AUTO_RENEWAL_ENABLED: true,
    CLINICAL_REVIEW_REQUIRED: true
  },

  // Payment anxiety thresholds (IMMUTABLE)
  ANXIETY_THRESHOLDS: {
    MILD_THRESHOLD: 2,
    MODERATE_THRESHOLD: 3,
    SEVERE_THRESHOLD: 4,
    CRISIS_THRESHOLD: 5,
    INTERVENTION_THRESHOLD: 3
  },

  // Performance requirements (IMMUTABLE)
  PERFORMANCE: {
    MAX_PROCESSING_TIME: 5000, // 5 seconds
    MAX_RESPONSE_TIME: 2000,   // 2 seconds
    MAX_ANXIETY_DETECTION_TIME: 500, // 500ms
    TARGET_SUCCESS_RATE: 0.99  // 99%
  },

  // Compliance requirements (IMMUTABLE)
  COMPLIANCE: {
    HIPAA_REQUIRED: true,
    PCI_DSS_REQUIRED: true,
    AUDIT_RETENTION_DAYS: 2555, // 7 years
    CLINICAL_VALIDATION_REQUIRED: true
  },

  // Subscription defaults
  SUBSCRIPTION: {
    DEFAULT_TRIAL_DAYS: 7,
    GRACE_PERIOD_DAYS: 3,
    DEFAULT_CURRENCY: createCurrencyCode('USD'),
    DEFAULT_TIER: createSubscriptionTier('free')
  },

  // Feature gate settings
  FEATURE_GATES: {
    CRISIS_OVERRIDE_FEATURES: [
      'crisis_resources',
      'emergency_contacts',
      'breathing_exercises',
      'assessment_tools'
    ],
    EMERGENCY_ACCESS_FEATURES: [
      'all_therapeutic_content',
      'unlimited_assessments',
      'cross_device_sync'
    ]
  }
} as const;

// === SERVICE INTERFACE ===

/**
 * Payment service interface compatible with Phase 3D services
 */
export interface PaymentCanonicalService {
  // Configuration
  initialize: (config: PaymentEnvironmentConfig) => Promise<void>;
  updateConfig: (config: Partial<PaymentEnvironmentConfig>) => Promise<void>;

  // Subscription management
  createSubscription: (userId: string, planId: string) => Promise<string>;
  updateSubscription: (subscriptionId: string, planId: string) => Promise<void>;
  cancelSubscription: (subscriptionId: string) => Promise<void>;
  getSubscriptionStatus: (userId: string) => Promise<SubscriptionState>;

  // Payment processing
  createPaymentIntent: (data: PaymentIntentData) => Promise<PaymentResult>;
  processPayment: (intentId: string, paymentMethodId: string) => Promise<PaymentResult>;

  // Crisis and anxiety management (IMMUTABLE)
  detectPaymentAnxiety: (userId: string, indicators: PaymentAnxietyIndicators) => Promise<PaymentAnxietySeverity>;
  triggerAnxietyIntervention: (userId: string, interventionType: string) => Promise<PaymentAnxietyIntervention>;
  activateCrisisOverride: (userId: string, crisisId: string) => Promise<CrisisPaymentOverride>;
  deactivateCrisisOverride: (overrideId: string) => Promise<void>;

  // Feature gates
  checkFeatureAccess: (userId: string, featureId: string) => Promise<boolean>;

  // Service lifecycle
  shutdown: () => Promise<void>;
}

// === CUSTOMER DATA TYPES ===

/**
 * Customer data for payment processing
 */
export interface CustomerData {
  readonly customerId: string;
  readonly email: string;
  readonly name: string;
  readonly phone?: string;
  readonly address?: {
    readonly line1: string;
    readonly line2?: string;
    readonly city: string;
    readonly state: string;
    readonly postal_code: string;
    readonly country: string;
  };
  readonly metadata?: Record<string, string>;
  readonly therapeuticProfile?: {
    readonly anxietyProfile: PaymentAnxietySeverity;
    readonly crisisRisk: boolean;
    readonly therapeuticContinuity: boolean;
  };
}

/**
 * Customer operation result
 */
export interface CustomerResult {
  readonly success: boolean;
  readonly customerId: string;
  readonly customer?: CustomerData;
  readonly error?: PaymentError;
  readonly compliance: {
    readonly hipaaCompliant: boolean;
    readonly pciCompliant: boolean;
    readonly auditTrailId: string;
  };
}

// === PAYMENT EVENT TYPES ===

/**
 * Payment system events for audit and monitoring
 */
export interface PaymentEvent {
  readonly eventId: string;
  readonly eventType: 'payment_created' | 'payment_succeeded' | 'payment_failed' | 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'crisis_override_activated';
  readonly timestamp: string;
  readonly data: Record<string, unknown>;
  readonly metadata?: {
    readonly userId: string;
    readonly crisisMode: boolean;
    readonly therapeuticContext: boolean;
    readonly complianceValidated: boolean;
  };
}

// === SUBSCRIPTION RESULT (alias for compatibility) ===

/**
 * Subscription result (alias for SubscriptionState for backward compatibility)
 */
export type SubscriptionResult = SubscriptionState;

// === CONSOLIDATED SCHEMAS ===

/**
 * All payment schemas in one export for validation utilities
 */
export const PaymentSchemas = {
  PaymentEnvironmentConfigSchema,
  SubscriptionPlanSchema,
  SubscriptionStateSchema,
  PaymentIntentDataSchema,
  PaymentMethodDataSchema,
  PaymentAnxietyIndicatorsSchema,
  PaymentAnxietyInterventionSchema,
  CrisisPaymentOverrideSchema,
  PaymentResultSchema,
  FeatureGateConfigSchema,
  PaymentAnxietySeveritySchema
} as const;

// === EXPORTS ===

export default {
  // Schemas
  PaymentEnvironmentConfigSchema,
  SubscriptionPlanSchema,
  SubscriptionStateSchema,
  PaymentIntentDataSchema,
  PaymentMethodDataSchema,
  PaymentAnxietyIndicatorsSchema,
  PaymentAnxietyInterventionSchema,
  CrisisPaymentOverrideSchema,
  PaymentResultSchema,
  FeatureGateConfigSchema,
  PaymentAnxietySeveritySchema,

  // Type guards
  isPaymentAmount,
  isCurrencyCode,
  isSubscriptionTier,
  isPaymentAnxietySeverity,
  isPaymentResult,
  isCrisisPaymentOverride,

  // Factory functions
  createPaymentAmount,
  createCurrencyCode,
  createSubscriptionTier,
  createPaymentAnxietySeverity,

  // Constants
  PAYMENT_CANONICAL_CONSTANTS,

  // Additional exports
  PaymentSchemas
};