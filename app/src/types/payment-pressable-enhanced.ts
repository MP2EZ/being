/**
 * Payment Pressable Enhancement Types - PHASE 4.2A TypeScript Integration
 *
 * Comprehensive type safety for payment component TouchableOpacity → Pressable migration.
 * Ensures payment security, crisis detection accuracy, and HIPAA compliance through
 * enhanced type system for payment interactions.
 *
 * CRITICAL: Payment interactions require <200ms crisis response with financial data protection
 */

import type { ReactNode } from 'react';
import type { ViewStyle, PressableProps, PressableStateCallbackType, GestureResponderEvent } from 'react-native';
import type { z } from 'zod';

import type {
  PaymentMethodResult,
  PaymentError,
  CrisisPaymentOverride,
  PaymentUIError,
  PerformanceViolation,
  CrisisPerformanceMetrics
} from './payment-ui';

import type {
  ValidatedCrisisResponse,
  TherapeuticTimingCertified,
  ClinicalTypeValidationError
} from './clinical-type-safety';

import type {
  AndroidRippleConfig,
  ComponentVariant,
  ThemeVariant
} from './ui';

// === PAYMENT PRESSABLE VARIANTS ===

/**
 * Payment-specific Pressable variants with security and crisis considerations
 */
export type PaymentPressableVariant =
  | 'payment_method_select'
  | 'subscription_tier'
  | 'billing_action'
  | 'crisis_payment_override'
  | 'anxiety_intervention'
  | 'emergency_payment_bypass'
  | 'financial_stress_support';

/**
 * Crisis safety levels for payment interactions
 */
export type PaymentCrisisSafetyLevel =
  | 'standard'       // Normal payment flow
  | 'anxiety_aware'  // Detecting payment anxiety
  | 'crisis_mode'    // Crisis detected, payment bypass available
  | 'emergency'      // Emergency bypass active, free access granted
  | 'therapeutic';   // Therapeutic intervention in progress

/**
 * Payment data sensitivity classifications for HIPAA compliance
 */
export type PaymentDataSensitivity =
  | 'public'         // Plan descriptions, public pricing
  | 'financial'      // Payment methods, billing info (PCI DSS)
  | 'therapeutic'    // Payment anxiety data, financial stress indicators
  | 'clinical'       // Crisis triggers related to financial stress
  | 'emergency';     // Emergency bypass data, crisis payment overrides

// === ENHANCED PAYMENT PRESSABLE PROPS ===

/**
 * Base Enhanced Pressable Props for Payment Components
 * Extends standard Pressable with payment security and crisis safety
 */
export interface PaymentPressableProps extends Omit<PressableProps, 'style' | 'onPress'> {
  // Core payment properties
  readonly variant: PaymentPressableVariant;
  readonly crisisSafetyLevel: PaymentCrisisSafetyLevel;
  readonly dataSensitivity: PaymentDataSensitivity;

  // Enhanced interaction handling
  readonly onPress: (event?: GestureResponderEvent) => void | Promise<void>;
  readonly style?: ViewStyle | ViewStyle[] | ((state: PaymentPressableState) => ViewStyle | ViewStyle[]);

  // Crisis and performance monitoring
  readonly maxResponseTimeMs: ValidatedCrisisResponse;
  readonly crisisOverride?: CrisisPaymentOverride;
  readonly anxietyDetection?: PaymentAnxietyDetection;
  readonly performanceTracking: boolean;

  // Security and compliance
  readonly hipaaCompliant: boolean;
  readonly pciCompliant: boolean;
  readonly auditTrail: boolean;
  readonly encryptionRequired: boolean;

  // Accessibility enhancements
  readonly therapeuticAccessibilityLabel?: string;
  readonly crisisAccessibilityHint?: string;
  readonly emergencyAccessibilityActions?: readonly string[];

  // Error handling
  readonly onPaymentError?: (error: PaymentUIError) => void;
  readonly onCrisisDetected?: (crisisLevel: number) => void;
  readonly onPerformanceViolation?: (violation: PerformanceViolation) => void;
}

/**
 * Payment Method Selection Pressable Props
 * For selecting and managing payment methods with security validation
 */
export interface PaymentMethodPressableProps extends PaymentPressableProps {
  readonly variant: 'payment_method_select';
  readonly paymentMethod: PaymentMethodResult;
  readonly isSelected: boolean;
  readonly isDefault: boolean;
  readonly securityValidated: boolean;
  readonly onSelect: (paymentMethod: PaymentMethodResult) => Promise<void>;
  readonly onSecurityValidation?: (method: PaymentMethodResult) => Promise<boolean>;
  readonly cardMaskingEnabled: boolean;
  readonly fraudDetectionEnabled: boolean;
}

/**
 * Subscription Tier Selection Pressable Props
 * For therapeutic subscription plan selection with anxiety detection
 */
export interface SubscriptionTierPressableProps extends PaymentPressableProps {
  readonly variant: 'subscription_tier';
  readonly tier: {
    readonly planId: string;
    readonly name: string;
    readonly therapeuticName: string;
    readonly price: number;
    readonly interval: 'month' | 'year';
    readonly features: readonly string[];
    readonly therapeuticBenefits: readonly string[];
    readonly crisisSafe: boolean;
  };
  readonly isSelected: boolean;
  readonly isRecommended: boolean;
  readonly onTierSelect: (planId: string) => Promise<void>;
  readonly anxietyIndicators?: {
    readonly priceHesitation: number;
    readonly comparisonTime: number;
    readonly selectionChanges: number;
  };
}

/**
 * Crisis Payment Override Pressable Props
 * For emergency payment bypass activation with therapeutic safety
 */
export interface CrisisPaymentOverridePressableProps extends PaymentPressableProps {
  readonly variant: 'crisis_payment_override';
  readonly crisisSafetyLevel: 'crisis_mode' | 'emergency';
  readonly crisisType: 'financial_stress' | 'payment_anxiety' | 'subscription_block' | 'emergency_access';
  readonly overrideDuration: number; // hours
  readonly therapeuticRationale: string;
  readonly onCrisisOverride: (reason: string) => Promise<CrisisPaymentOverride>;
  readonly onTherapeuticSupport: () => void;
  readonly emergencyContacts?: readonly string[];
}

/**
 * Payment Anxiety Intervention Pressable Props
 * For triggering therapeutic interventions during payment stress
 */
export interface PaymentAnxietyInterventionPressableProps extends PaymentPressableProps {
  readonly variant: 'anxiety_intervention';
  readonly crisisSafetyLevel: 'anxiety_aware' | 'therapeutic';
  readonly interventionType: 'breathing_exercise' | 'mindfulness_prompt' | 'financial_counseling' | 'crisis_support';
  readonly anxietyLevel: number; // 0-5 scale
  readonly onIntervention: (type: string) => Promise<void>;
  readonly onBreathingExercise: () => void;
  readonly onFinancialSupport: () => void;
  readonly therapeuticDuration?: number; // seconds
}

// === PAYMENT PRESSABLE STATE ===

/**
 * Enhanced Pressable State for Payment Components
 * Tracks interaction state with payment security and crisis awareness
 */
export interface PaymentPressableState extends PressableStateCallbackType {
  // Standard Pressable state
  readonly pressed: boolean;

  // Payment-specific state
  readonly paymentProcessing: boolean;
  readonly securityValidated: boolean;
  readonly crisisMode: boolean;
  readonly anxietyDetected: boolean;
  readonly performanceCompliant: boolean;

  // Interaction tracking
  readonly responseTime: number;
  readonly interactionCount: number;
  readonly lastInteraction: number;

  // Security state
  readonly encryptionActive: boolean;
  readonly auditLogged: boolean;
  readonly complianceVerified: boolean;
}

// === PAYMENT ANXIETY DETECTION ===

/**
 * Payment Anxiety Detection Configuration
 * Real-time monitoring of user stress during payment interactions
 */
export interface PaymentAnxietyDetection {
  readonly enabled: boolean;
  readonly sensitivity: 1 | 2 | 3 | 4 | 5; // 1=low, 5=high sensitivity
  readonly interventionThreshold: number; // 0-5 scale
  readonly indicators: {
    readonly rapidTaps: boolean;           // Multiple rapid presses
    readonly hesitation: boolean;          // Long delays between interactions
    readonly backAndForth: boolean;        // Switching between options
    readonly formErrors: boolean;          // Input validation failures
    readonly timeStress: boolean;          // Spending excessive time on page
  };
  readonly onAnxietyDetected: (level: number, indicators: string[]) => void;
  readonly onInterventionTriggered: (intervention: string) => void;
}

// === PAYMENT PERFORMANCE MONITORING ===

/**
 * Payment Pressable Performance Metrics
 * Specialized performance tracking for payment component interactions
 */
export interface PaymentPressablePerformanceMetrics extends CrisisPerformanceMetrics {
  // Payment-specific timing
  readonly paymentMethodLoadTime: number;
  readonly subscriptionSelectionTime: number;
  readonly billingDataLoadTime: number;
  readonly crisisOverrideActivationTime: number;

  // Anxiety and stress indicators
  readonly averageAnxietyLevel: number;
  readonly stressInterventionCount: number;
  readonly financialSupportRequests: number;

  // Security performance
  readonly encryptionOverhead: number;
  readonly complianceCheckTime: number;
  readonly auditLoggingTime: number;

  // Crisis response validation
  readonly crisisResponseViolations: readonly PerformanceViolation[];
  readonly emergencyBypassTime: number;
  readonly therapeuticInterventionTime: number;
}

// === STYLE FUNCTIONS ===

/**
 * Payment Method Style Function
 * Specialized styling for payment method selection with security indicators
 */
export type PaymentMethodStyleFunction = (state: PaymentPressableState & {
  readonly isSelected: boolean;
  readonly isDefault: boolean;
  readonly securityValidated: boolean;
  readonly cardType: string;
  readonly expirationWarning: boolean;
}) => ViewStyle | ViewStyle[];

/**
 * Subscription Tier Style Function
 * Therapeutic styling for subscription plan selection
 */
export type SubscriptionTierStyleFunction = (state: PaymentPressableState & {
  readonly isSelected: boolean;
  readonly isRecommended: boolean;
  readonly tier: 'basic' | 'premium' | 'therapeutic';
  readonly anxietyLevel: number;
  readonly priceStress: boolean;
}) => ViewStyle | ViewStyle[];

/**
 * Crisis Override Style Function
 * Emergency styling for crisis payment bypass activation
 */
export type CrisisOverrideStyleFunction = (state: PaymentPressableState & {
  readonly crisisLevel: 'anxiety' | 'stress' | 'crisis' | 'emergency';
  readonly overrideActive: boolean;
  readonly therapeuticMode: boolean;
}) => ViewStyle | ViewStyle[];

// === PAYMENT RIPPLE EFFECTS ===

/**
 * Payment-Safe Ripple Configuration
 * Optimized ripple effects that don't interfere with payment security
 */
export interface PaymentSafeRippleConfig extends AndroidRippleConfig {
  readonly color: string;
  readonly borderless: false; // Always contained for payment security
  readonly radius?: number;
  readonly foreground: true; // Visible feedback for payment clarity
  readonly securityCompliant: boolean;
  readonly crisisOptimized: boolean;
}

/**
 * Therapeutic Ripple Effects for Payment Anxiety
 * Calming visual feedback during payment stress
 */
export interface TherapeuticPaymentRipple extends PaymentSafeRippleConfig {
  readonly therapeuticColor: string; // Calming colors for anxiety reduction
  readonly breathingAnimation: boolean;
  readonly anxietyReducing: boolean;
  readonly duration: number; // Extended for therapeutic effect
}

// === VALIDATION SCHEMAS ===

/**
 * Payment Pressable Props Validation Schema
 */
export const PaymentPressablePropsSchema = z.object({
  variant: z.enum(['payment_method_select', 'subscription_tier', 'billing_action', 'crisis_payment_override', 'anxiety_intervention', 'emergency_payment_bypass', 'financial_stress_support']),
  crisisSafetyLevel: z.enum(['standard', 'anxiety_aware', 'crisis_mode', 'emergency', 'therapeutic']),
  dataSensitivity: z.enum(['public', 'financial', 'therapeutic', 'clinical', 'emergency']),
  maxResponseTimeMs: z.number().min(50).max(500),
  performanceTracking: z.boolean(),
  hipaaCompliant: z.boolean(),
  pciCompliant: z.boolean(),
  auditTrail: z.boolean(),
  encryptionRequired: z.boolean()
});

/**
 * Payment Anxiety Detection Schema
 */
export const PaymentAnxietyDetectionSchema = z.object({
  enabled: z.boolean(),
  sensitivity: z.number().min(1).max(5),
  interventionThreshold: z.number().min(0).max(5),
  indicators: z.object({
    rapidTaps: z.boolean(),
    hesitation: z.boolean(),
    backAndForth: z.boolean(),
    formErrors: z.boolean(),
    timeStress: z.boolean()
  })
});

// === TYPE GUARDS ===

/**
 * Type guard for payment pressable props
 */
export function isPaymentPressableProps(props: unknown): props is PaymentPressableProps {
  return PaymentPressablePropsSchema.safeParse(props).success;
}

/**
 * Type guard for payment method pressable props
 */
export function isPaymentMethodPressableProps(props: unknown): props is PaymentMethodPressableProps {
  return typeof props === 'object' &&
         props !== null &&
         'variant' in props &&
         props.variant === 'payment_method_select' &&
         'paymentMethod' in props;
}

/**
 * Type guard for crisis override pressable props
 */
export function isCrisisOverridePressableProps(props: unknown): props is CrisisPaymentOverridePressableProps {
  return typeof props === 'object' &&
         props !== null &&
         'variant' in props &&
         props.variant === 'crisis_payment_override' &&
         'crisisType' in props;
}

/**
 * Validate payment pressable crisis compliance
 */
export function validatePaymentCrisisCompliance(
  pressableProps: PaymentPressableProps,
  performanceMetrics: PaymentPressablePerformanceMetrics
): boolean {
  // Crisis response time validation
  if (pressableProps.crisisSafetyLevel === 'crisis_mode' || pressableProps.crisisSafetyLevel === 'emergency') {
    return performanceMetrics.crisisButtonResponseTime <= pressableProps.maxResponseTimeMs;
  }

  // Standard payment flow validation
  return performanceMetrics.screenLoadTime <= 500 && performanceMetrics.paymentProcessingTime <= 5000;
}

/**
 * Validate HIPAA compliance for payment interactions
 */
export function validatePaymentHIPAACompliance(props: PaymentPressableProps): boolean {
  // Ensure encryption for sensitive data
  if (['therapeutic', 'clinical', 'emergency'].includes(props.dataSensitivity)) {
    return props.encryptionRequired && props.hipaaCompliant && props.auditTrail;
  }

  // Financial data requires PCI compliance
  if (props.dataSensitivity === 'financial') {
    return props.pciCompliant && props.encryptionRequired;
  }

  return true;
}

// === FACTORY FUNCTIONS ===

/**
 * Create Payment Method Pressable Props
 */
export function createPaymentMethodPressableProps(config: {
  readonly paymentMethod: PaymentMethodResult;
  readonly isSelected: boolean;
  readonly isDefault: boolean;
  readonly onSelect: (method: PaymentMethodResult) => Promise<void>;
}): PaymentMethodPressableProps {
  return {
    variant: 'payment_method_select',
    crisisSafetyLevel: 'standard',
    dataSensitivity: 'financial',
    paymentMethod: config.paymentMethod,
    isSelected: config.isSelected,
    isDefault: config.isDefault,
    securityValidated: true,
    onSelect: config.onSelect,
    onPress: () => config.onSelect(config.paymentMethod),
    maxResponseTimeMs: 300 as ValidatedCrisisResponse,
    performanceTracking: true,
    hipaaCompliant: true,
    pciCompliant: true,
    auditTrail: true,
    encryptionRequired: true,
    cardMaskingEnabled: true,
    fraudDetectionEnabled: true,
    accessibilityLabel: `Payment method: ${config.paymentMethod.card?.brand} ending in ${config.paymentMethod.card?.last4}`,
    accessibilityHint: config.isSelected ? 'Currently selected payment method' : 'Tap to select this payment method'
  };
}

/**
 * Create Crisis Payment Override Pressable Props
 */
export function createCrisisPaymentOverridePressableProps(config: {
  readonly crisisType: 'financial_stress' | 'payment_anxiety' | 'subscription_block' | 'emergency_access';
  readonly onCrisisOverride: (reason: string) => Promise<CrisisPaymentOverride>;
  readonly therapeuticRationale: string;
}): CrisisPaymentOverridePressableProps {
  return {
    variant: 'crisis_payment_override',
    crisisSafetyLevel: config.crisisType === 'emergency_access' ? 'emergency' : 'crisis_mode',
    dataSensitivity: 'emergency',
    crisisType: config.crisisType,
    overrideDuration: config.crisisType === 'emergency_access' ? 24 : 4,
    therapeuticRationale: config.therapeuticRationale,
    onCrisisOverride: config.onCrisisOverride,
    onTherapeuticSupport: () => {
      // Navigate to therapeutic support resources
    },
    onPress: () => config.onCrisisOverride(config.therapeuticRationale),
    maxResponseTimeMs: 200 as ValidatedCrisisResponse,
    performanceTracking: true,
    hipaaCompliant: true,
    pciCompliant: false, // No payment data involved in crisis override
    auditTrail: true,
    encryptionRequired: true,
    accessibilityLabel: 'Crisis payment override',
    crisisAccessibilityHint: 'Activates emergency access to therapeutic features during financial crisis',
    emergencyAccessibilityActions: ['activate', 'call_hotline', 'get_support']
  };
}

// === CONSTANTS ===

export const PAYMENT_PRESSABLE_CONSTANTS = {
  PERFORMANCE: {
    CRISIS_RESPONSE_MAX_MS: 200,
    PAYMENT_METHOD_LOAD_MAX_MS: 500,
    SUBSCRIPTION_SELECT_MAX_MS: 300,
    BILLING_LOAD_MAX_MS: 1000,
    ENCRYPTION_OVERHEAD_MAX_MS: 50,
  },
  ANXIETY_DETECTION: {
    RAPID_TAP_THRESHOLD: 3, // taps within 1 second
    HESITATION_THRESHOLD: 5000, // 5 seconds without interaction
    BACK_AND_FORTH_THRESHOLD: 3, // selection changes
    TIME_STRESS_THRESHOLD: 300000, // 5 minutes on payment screen
    INTERVENTION_COOLDOWN: 30000, // 30 seconds between interventions
  },
  SECURITY: {
    ENCRYPTION_REQUIRED_FOR: ['therapeutic', 'clinical', 'emergency', 'financial'],
    AUDIT_REQUIRED_FOR: ['therapeutic', 'clinical', 'emergency'],
    PCI_REQUIRED_FOR: ['financial'],
    HIPAA_REQUIRED_FOR: ['therapeutic', 'clinical', 'emergency'],
  },
  RIPPLE: {
    PAYMENT_COLOR: 'rgba(0, 122, 255, 0.2)',
    CRISIS_COLOR: 'rgba(255, 69, 58, 0.3)',
    THERAPEUTIC_COLOR: 'rgba(52, 199, 89, 0.2)',
    ANXIETY_COLOR: 'rgba(255, 204, 0, 0.2)',
    DURATION_MS: 300,
    THERAPEUTIC_DURATION_MS: 500,
  },
} as const;

// === EXPORTS ===

export type {
  PaymentPressableVariant,
  PaymentCrisisSafetyLevel,
  PaymentDataSensitivity,
  PaymentPressableProps,
  PaymentMethodPressableProps,
  SubscriptionTierPressableProps,
  CrisisPaymentOverridePressableProps,
  PaymentAnxietyInterventionPressableProps,
  PaymentPressableState,
  PaymentAnxietyDetection,
  PaymentPressablePerformanceMetrics,
  PaymentMethodStyleFunction,
  SubscriptionTierStyleFunction,
  CrisisOverrideStyleFunction,
  PaymentSafeRippleConfig,
  TherapeuticPaymentRipple,
};