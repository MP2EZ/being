/**
 * Payment Interaction Enhancement Types - TouchableOpacity → Pressable Migration
 *
 * Comprehensive type safety for migrated payment components ensuring seamless
 * transition from TouchableOpacity to Pressable with enhanced payment security,
 * crisis detection, and therapeutic interaction patterns.
 *
 * COVERAGE: PaymentMethodScreen, PaymentAnxietyDetection, PaymentSettingsScreen
 */

import type { ReactNode } from 'react';
import type { ViewStyle, TextStyle, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import type { z } from 'zod';

import type {
  PaymentPressableProps,
  PaymentPressableState,
  PaymentAnxietyDetection,
  PaymentPressablePerformanceMetrics,
  PaymentCrisisSafetyLevel,
  PaymentDataSensitivity
} from './payment-pressable-enhanced';

import type {
  PaymentMethodResult,
  PaymentUIError,
  SubscriptionResult,
  Transaction,
  SubscriptionChangeOption
} from './payment-ui';

import type {
  ValidatedCrisisResponse,
  TherapeuticTimingCertified
} from './clinical-type-safety';

// === MIGRATED COMPONENT INTERACTION TYPES ===

/**
 * Payment Method Screen Interaction Types
 * Enhanced types for 3 migrated TouchableOpacity → Pressable components
 */
export interface PaymentMethodScreenInteractions {
  // Payment method selection (TouchableOpacity → Pressable)
  readonly paymentMethodSelection: {
    readonly interactionType: 'payment_method_card_select';
    readonly variant: 'payment_method_select';
    readonly onMethodSelect: (method: PaymentMethodResult) => Promise<void>;
    readonly selectionValidation: PaymentMethodSelectionValidation;
    readonly crisisOverride: boolean;
    readonly anxietyDetection: PaymentAnxietyDetection;
  };

  // Add new payment method (TouchableOpacity → Pressable)
  readonly addPaymentMethod: {
    readonly interactionType: 'add_payment_method_button';
    readonly variant: 'billing_action';
    readonly onAddMethod: () => Promise<void>;
    readonly formValidation: PaymentMethodFormValidation;
    readonly securityValidation: PciComplianceValidation;
    readonly performanceTracking: boolean;
  };

  // Payment method actions (TouchableOpacity → Pressable)
  readonly paymentMethodActions: {
    readonly interactionType: 'payment_method_action_menu';
    readonly variant: 'billing_action';
    readonly actions: readonly PaymentMethodAction[];
    readonly securityLevel: PaymentDataSensitivity;
    readonly auditRequired: boolean;
  };
}

/**
 * Payment Anxiety Detection Interaction Types
 * Enhanced types for 7 migrated TouchableOpacity → Pressable components
 */
export interface PaymentAnxietyDetectionInteractions {
  // Breathing exercise activation (TouchableOpacity → Pressable)
  readonly breathingExercise: {
    readonly interactionType: 'breathing_exercise_start';
    readonly variant: 'anxiety_intervention';
    readonly duration: 60000 | 180000 | 300000; // 1, 3, or 5 minutes
    readonly onBreathingStart: () => Promise<void>;
    readonly therapeuticValidation: TherapeuticBreathingValidation;
    readonly crisisEscalation: boolean;
  };

  // Mindfulness prompt (TouchableOpacity → Pressable)
  readonly mindfulnessPrompt: {
    readonly interactionType: 'mindfulness_intervention';
    readonly variant: 'anxiety_intervention';
    readonly promptType: 'grounding' | 'awareness' | 'acceptance';
    readonly onMindfulnessStart: () => Promise<void>;
    readonly therapeuticContent: string;
  };

  // Financial stress support (TouchableOpacity → Pressable)
  readonly financialStressSupport: {
    readonly interactionType: 'financial_stress_support';
    readonly variant: 'financial_stress_support';
    readonly supportType: 'counseling' | 'resources' | 'crisis_line';
    readonly onSupportAccess: () => Promise<void>;
    readonly emergencyEscalation: boolean;
  };

  // Crisis hotline access (TouchableOpacity → Pressable)
  readonly crisisHotlineAccess: {
    readonly interactionType: 'crisis_hotline_call';
    readonly variant: 'emergency_payment_bypass';
    readonly hotlineNumber: '988' | '211' | 'custom';
    readonly onHotlineCall: () => Promise<void>;
    readonly immediateResponse: ValidatedCrisisResponse;
  };

  // Payment pause option (TouchableOpacity → Pressable)
  readonly paymentPause: {
    readonly interactionType: 'payment_pause_activation';
    readonly variant: 'crisis_payment_override';
    readonly pauseDuration: number; // hours
    readonly onPauseActivate: () => Promise<void>;
    readonly therapeuticJustification: string;
  };

  // Anxiety level feedback (TouchableOpacity → Pressable)
  readonly anxietyLevelFeedback: {
    readonly interactionType: 'anxiety_level_selection';
    readonly variant: 'anxiety_intervention';
    readonly anxietyScale: 1 | 2 | 3 | 4 | 5;
    readonly onAnxietyReport: (level: number) => Promise<void>;
    readonly interventionTriggered: boolean;
  };

  // Dismiss anxiety support (TouchableOpacity → Pressable)
  readonly dismissAnxietySupport: {
    readonly interactionType: 'anxiety_support_dismiss';
    readonly variant: 'anxiety_intervention';
    readonly dismissReason: 'feeling_better' | 'not_helpful' | 'prefer_other';
    readonly onDismiss: () => Promise<void>;
    readonly followUpRequired: boolean;
  };
}

/**
 * Payment Settings Screen Interaction Types
 * Enhanced types for 5 migrated TouchableOpacity → Pressable components
 */
export interface PaymentSettingsScreenInteractions {
  // Subscription change (TouchableOpacity → Pressable)
  readonly subscriptionChange: {
    readonly interactionType: 'subscription_change_action';
    readonly variant: 'billing_action';
    readonly changeType: 'upgrade' | 'downgrade' | 'pause' | 'cancel';
    readonly onSubscriptionChange: (option: SubscriptionChangeOption) => Promise<void>;
    readonly therapeuticImpact: TherapeuticSubscriptionImpact;
    readonly confirmationRequired: boolean;
  };

  // Billing history access (TouchableOpacity → Pressable)
  readonly billingHistoryAccess: {
    readonly interactionType: 'billing_history_view';
    readonly variant: 'billing_action';
    readonly historyPeriod: 'current' | 'past_year' | 'all_time';
    readonly onHistoryView: () => Promise<void>;
    readonly financialStressMonitoring: boolean;
  };

  // Payment method management (TouchableOpacity → Pressable)
  readonly paymentMethodManagement: {
    readonly interactionType: 'payment_method_manage';
    readonly variant: 'billing_action';
    readonly managementAction: 'add' | 'edit' | 'delete' | 'set_default';
    readonly onMethodManage: (action: string, methodId?: string) => Promise<void>;
    readonly securityValidation: PciComplianceValidation;
  };

  // Auto-renewal toggle (TouchableOpacity → Pressable)
  readonly autoRenewalToggle: {
    readonly interactionType: 'auto_renewal_toggle';
    readonly variant: 'billing_action';
    readonly currentState: boolean;
    readonly onToggle: (enabled: boolean) => Promise<void>;
    readonly therapeuticConsiderations: string;
    readonly crisisOverride: boolean;
  };

  // Emergency payment support (TouchableOpacity → Pressable)
  readonly emergencyPaymentSupport: {
    readonly interactionType: 'emergency_payment_support';
    readonly variant: 'emergency_payment_bypass';
    readonly supportType: 'free_access' | 'payment_plan' | 'crisis_override';
    readonly onEmergencySupport: () => Promise<void>;
    readonly crisisSafetyLevel: 'crisis_mode' | 'emergency';
  };
}

// === VALIDATION TYPES ===

/**
 * Payment Method Selection Validation
 * Ensures secure and therapeutically appropriate payment method selection
 */
export interface PaymentMethodSelectionValidation {
  readonly methodId: string;
  readonly securityVerified: boolean;
  readonly fraudCheckPassed: boolean;
  readonly expirationValid: boolean;
  readonly therapeuticallyAppropriate: boolean;
  readonly crisisOverrideAvailable: boolean;
  readonly validationErrors: readonly string[];
  readonly securityWarnings: readonly string[];
}

/**
 * Payment Method Form Validation
 * Type-safe validation for payment method addition forms
 */
export interface PaymentMethodFormValidation {
  readonly cardNumber: {
    readonly valid: boolean;
    readonly masked: boolean;
    readonly issuer: string;
    readonly funding: 'credit' | 'debit' | 'prepaid';
  };
  readonly expirationDate: {
    readonly valid: boolean;
    readonly notExpired: boolean;
    readonly warningPeriod: boolean; // expires within 30 days
  };
  readonly securityCode: {
    readonly valid: boolean;
    readonly length: number;
    readonly verified: boolean;
  };
  readonly billingAddress: {
    readonly required: boolean;
    readonly valid: boolean;
    readonly avsVerified: boolean;
  };
  readonly overallValid: boolean;
  readonly validationMessages: readonly string[];
}

/**
 * PCI Compliance Validation
 * Ensures payment interactions meet PCI DSS requirements
 */
export interface PciComplianceValidation {
  readonly dataEncrypted: boolean;
  readonly transmissionSecure: boolean;
  readonly storageCompliant: boolean;
  readonly accessControlActive: boolean;
  readonly auditTrailEnabled: boolean;
  readonly vulnerabilityScanned: boolean;
  readonly complianceLevel: 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4';
  readonly complianceExpiry: string; // ISO date
  readonly violationRisk: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Therapeutic Breathing Validation
 * Ensures breathing exercises meet therapeutic standards during payment stress
 */
export interface TherapeuticBreathingValidation {
  readonly technique: 'box_breathing' | 'calm_breathing' | 'mindful_breathing';
  readonly duration: number; // seconds
  readonly breathingRate: number; // breaths per minute
  readonly therapeuticallyValid: boolean;
  readonly anxietyReductionExpected: boolean;
  readonly crisisAppropriate: boolean;
  readonly guidedInstructions: string;
}

/**
 * Therapeutic Subscription Impact
 * Analyzes therapeutic impact of subscription changes
 */
export interface TherapeuticSubscriptionImpact {
  readonly changeType: 'upgrade' | 'downgrade' | 'pause' | 'cancel';
  readonly therapeuticContinuity: 'maintained' | 'reduced' | 'interrupted';
  readonly featureImpact: {
    readonly assessments: boolean;
    readonly crisisSupport: boolean;
    readonly therapeuticContent: boolean;
    readonly dataBackup: boolean;
  };
  readonly recommendedAlternatives: readonly string[];
  readonly crisisRiskIncrease: boolean;
  readonly therapeuticRationale: string;
}

// === PAYMENT ACTION TYPES ===

/**
 * Payment Method Actions
 * Available actions for payment method management
 */
export interface PaymentMethodAction {
  readonly actionId: string;
  readonly actionType: 'set_default' | 'edit_details' | 'remove_method' | 'verify_security';
  readonly label: string;
  readonly therapeuticLabel: string; // User-friendly therapeutic language
  readonly destructive: boolean;
  readonly confirmationRequired: boolean;
  readonly securityLevel: PaymentDataSensitivity;
  readonly onAction: (methodId: string) => Promise<void>;
  readonly crisisOverrideAvailable: boolean;
}

// === INTERACTION PERFORMANCE TYPES ===

/**
 * Payment Interaction Performance Metrics
 * Performance tracking for all migrated payment interactions
 */
export interface PaymentInteractionPerformanceMetrics extends PaymentPressablePerformanceMetrics {
  // Component-specific metrics
  readonly paymentMethodScreenMetrics: {
    readonly methodSelectionTime: number;
    readonly formCompletionTime: number;
    readonly validationTime: number;
  };

  readonly anxietyDetectionMetrics: {
    readonly interventionActivationTime: number;
    readonly breathingExerciseStartTime: number;
    readonly crisisEscalationTime: number;
  };

  readonly paymentSettingsMetrics: {
    readonly subscriptionChangeTime: number;
    readonly billingHistoryLoadTime: number;
    readonly settingsUpdateTime: number;
  };

  // Cross-component metrics
  readonly anxietyInterventionEffectiveness: number; // 0-1 scale
  readonly crisisResponseAccuracy: number; // 0-1 scale
  readonly therapeuticComplianceRate: number; // 0-1 scale
}

// === ENHANCED ERROR TYPES ===

/**
 * Payment Interaction Error
 * Enhanced error handling for migrated payment components
 */
export interface PaymentInteractionError extends PaymentUIError {
  readonly interactionType: string;
  readonly component: 'PaymentMethodScreen' | 'PaymentAnxietyDetection' | 'PaymentSettingsScreen';
  readonly migrationRelated: boolean;
  readonly touchableOpacityFallback: boolean;
  readonly pressableEnhancementFailed: boolean;
  readonly recoveryStrategy: PaymentInteractionRecoveryStrategy;
}

/**
 * Payment Interaction Recovery Strategy
 * Recovery options for payment interaction failures
 */
export interface PaymentInteractionRecoveryStrategy {
  readonly strategy: 'retry_pressable' | 'fallback_touchable' | 'crisis_mode' | 'bypass_payment';
  readonly automaticRecovery: boolean;
  readonly userActionRequired: boolean;
  readonly therapeuticSupport: boolean;
  readonly emergencyEscalation: boolean;
  readonly recoveryTimeoutMs: number;
  readonly fallbackMessage: string;
  readonly therapeuticMessage: string;
}

// === VALIDATION SCHEMAS ===

export const PaymentMethodSelectionValidationSchema = z.object({
  methodId: z.string(),
  securityVerified: z.boolean(),
  fraudCheckPassed: z.boolean(),
  expirationValid: z.boolean(),
  therapeuticallyAppropriate: z.boolean(),
  crisisOverrideAvailable: z.boolean(),
  validationErrors: z.array(z.string()),
  securityWarnings: z.array(z.string())
});

export const PciComplianceValidationSchema = z.object({
  dataEncrypted: z.boolean(),
  transmissionSecure: z.boolean(),
  storageCompliant: z.boolean(),
  accessControlActive: z.boolean(),
  auditTrailEnabled: z.boolean(),
  vulnerabilityScanned: z.boolean(),
  complianceLevel: z.enum(['Level 1', 'Level 2', 'Level 3', 'Level 4']),
  complianceExpiry: z.string(),
  violationRisk: z.enum(['none', 'low', 'medium', 'high'])
});

export const TherapeuticSubscriptionImpactSchema = z.object({
  changeType: z.enum(['upgrade', 'downgrade', 'pause', 'cancel']),
  therapeuticContinuity: z.enum(['maintained', 'reduced', 'interrupted']),
  featureImpact: z.object({
    assessments: z.boolean(),
    crisisSupport: z.boolean(),
    therapeuticContent: z.boolean(),
    dataBackup: z.boolean()
  }),
  recommendedAlternatives: z.array(z.string()),
  crisisRiskIncrease: z.boolean(),
  therapeuticRationale: z.string()
});

// === TYPE GUARDS ===

export function isPaymentMethodSelectionValidation(obj: unknown): obj is PaymentMethodSelectionValidation {
  return PaymentMethodSelectionValidationSchema.safeParse(obj).success;
}

export function isPciComplianceValidation(obj: unknown): obj is PciComplianceValidation {
  return PciComplianceValidationSchema.safeParse(obj).success;
}

export function isTherapeuticSubscriptionImpact(obj: unknown): obj is TherapeuticSubscriptionImpact {
  return TherapeuticSubscriptionImpactSchema.safeParse(obj).success;
}

export function isPaymentInteractionError(obj: unknown): obj is PaymentInteractionError {
  return typeof obj === 'object' &&
         obj !== null &&
         'interactionType' in obj &&
         'component' in obj &&
         'migrationRelated' in obj;
}

// === FACTORY FUNCTIONS ===

/**
 * Create Payment Method Selection Props for Migrated Component
 */
export function createPaymentMethodSelectionProps(config: {
  readonly method: PaymentMethodResult;
  readonly isSelected: boolean;
  readonly onSelect: (method: PaymentMethodResult) => Promise<void>;
  readonly anxietyDetection?: boolean;
}): PaymentPressableProps {
  return {
    variant: 'payment_method_select',
    crisisSafetyLevel: 'standard',
    dataSensitivity: 'financial',
    onPress: () => config.onSelect(config.method),
    maxResponseTimeMs: 300 as ValidatedCrisisResponse,
    performanceTracking: true,
    hipaaCompliant: true,
    pciCompliant: true,
    auditTrail: true,
    encryptionRequired: true,
    anxietyDetection: config.anxietyDetection ? {
      enabled: true,
      sensitivity: 3,
      interventionThreshold: 3,
      indicators: {
        rapidTaps: true,
        hesitation: true,
        backAndForth: true,
        formErrors: true,
        timeStress: true
      },
      onAnxietyDetected: (level, indicators) => {
        console.log(`Payment anxiety detected: level ${level}, indicators: ${indicators.join(', ')}`);
      },
      onInterventionTriggered: (intervention) => {
        console.log(`Payment anxiety intervention triggered: ${intervention}`);
      }
    } : undefined,
    accessibilityLabel: `Payment method: ${config.method.card?.brand} ending in ${config.method.card?.last4}`,
    accessibilityHint: config.isSelected ? 'Currently selected' : 'Tap to select this payment method'
  };
}

/**
 * Create Crisis Payment Support Props for Migrated Component
 */
export function createCrisisPaymentSupportProps(config: {
  readonly crisisLevel: PaymentCrisisSafetyLevel;
  readonly supportType: 'breathing' | 'mindfulness' | 'financial_support' | 'crisis_hotline';
  readonly onSupport: () => Promise<void>;
}): PaymentPressableProps {
  return {
    variant: config.supportType === 'crisis_hotline' ? 'emergency_payment_bypass' : 'anxiety_intervention',
    crisisSafetyLevel: config.crisisLevel,
    dataSensitivity: 'emergency',
    onPress: config.onSupport,
    maxResponseTimeMs: config.supportType === 'crisis_hotline' ? 200 : 500 as ValidatedCrisisResponse,
    performanceTracking: true,
    hipaaCompliant: true,
    pciCompliant: false,
    auditTrail: true,
    encryptionRequired: true,
    accessibilityLabel: `${config.supportType.replace('_', ' ')} support`,
    crisisAccessibilityHint: 'Provides immediate therapeutic support during payment stress',
    emergencyAccessibilityActions: config.supportType === 'crisis_hotline' ? ['call', 'text', 'chat'] : ['start', 'learn_more']
  };
}

// === CONSTANTS ===

export const PAYMENT_INTERACTION_CONSTANTS = {
  MIGRATION: {
    TOUCHABLE_OPACITY_FALLBACK_TIMEOUT: 5000,
    PRESSABLE_ENHANCEMENT_RETRY_COUNT: 3,
    MIGRATION_VALIDATION_TIMEOUT: 1000,
  },
  PERFORMANCE: {
    PAYMENT_METHOD_SELECT_MAX_MS: 300,
    ANXIETY_INTERVENTION_MAX_MS: 500,
    CRISIS_HOTLINE_MAX_MS: 200,
    SUBSCRIPTION_CHANGE_MAX_MS: 1000,
  },
  ANXIETY_DETECTION: {
    RAPID_TAP_COUNT: 3,
    HESITATION_DURATION_MS: 3000,
    BACK_AND_FORTH_COUNT: 2,
    TIME_STRESS_DURATION_MS: 180000, // 3 minutes
    INTERVENTION_TRIGGERS: {
      BREATHING_THRESHOLD: 2,
      MINDFULNESS_THRESHOLD: 3,
      FINANCIAL_SUPPORT_THRESHOLD: 4,
      CRISIS_HOTLINE_THRESHOLD: 5,
    },
  },
  THERAPEUTIC: {
    BREATHING_DURATIONS: [60000, 180000, 300000], // 1, 3, 5 minutes
    MINDFULNESS_DURATION: 120000, // 2 minutes
    FINANCIAL_SUPPORT_SESSION: 900000, // 15 minutes
    CRISIS_RESPONSE_WINDOW: 3600000, // 1 hour
  },
} as const;

export type {
  PaymentMethodScreenInteractions,
  PaymentAnxietyDetectionInteractions,
  PaymentSettingsScreenInteractions,
  PaymentMethodSelectionValidation,
  PaymentMethodFormValidation,
  PciComplianceValidation,
  TherapeuticBreathingValidation,
  TherapeuticSubscriptionImpact,
  PaymentMethodAction,
  PaymentInteractionPerformanceMetrics,
  PaymentInteractionError,
  PaymentInteractionRecoveryStrategy,
};