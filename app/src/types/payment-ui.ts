/**
 * Payment UI Component Types - Day 16 Phase 3 TypeScript Integration
 *
 * COMPREHENSIVE TYPE COVERAGE:
 * - Complete payment screen props interfaces
 * - Navigation types for payment flow routing
 * - Component state management types for payment UI
 * - Event handler types with crisis safety guarantees
 * - Performance monitoring types for <200ms crisis response
 *
 * CRISIS SAFETY REQUIREMENTS:
 * - All payment UI types maintain crisis response performance guarantees
 * - Emergency features always accessible through type system
 * - Type-safe payment failures with crisis mode fallback
 * - HIPAA compliance maintained through type separation
 */

import { z } from 'zod';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import {
  SubscriptionPlan,
  PaymentMethodResult,
  PaymentError,
  CustomerResult,
  SubscriptionResult,
  CrisisPaymentOverride
} from './payment';

/**
 * Navigation Types for Payment Flow
 */
export interface PaymentStackParamList {
  SubscriptionScreen: {
    upgradeContext?: boolean;
    currentPlan?: SubscriptionPlan;
    returnScreen?: string;
    crisisMode?: boolean;
  };
  PaymentMethodScreen: {
    selectedPlan?: SubscriptionPlan;
    returnScreen?: string;
    editMode?: boolean;
    crisisMode?: boolean;
  };
  BillingHistoryScreen: {
    customerId?: string;
    filterType?: 'all' | 'payments' | 'refunds' | 'trials';
    crisisMode?: boolean;
  };
  PaymentSettingsScreen: {
    section?: 'subscription' | 'methods' | 'billing';
    crisisMode?: boolean;
  };
}

export type PaymentNavigationProp<T extends keyof PaymentStackParamList> = NavigationProp<PaymentStackParamList, T>;
export type PaymentRouteProp<T extends keyof PaymentStackParamList> = RouteProp<PaymentStackParamList, T>;

/**
 * Crisis Performance Monitoring Types
 */
export interface CrisisPerformanceMetrics {
  readonly crisisButtonResponseTime: number; // Must be <200ms
  readonly screenLoadTime: number; // Must be <500ms
  readonly paymentProcessingTime: number;
  readonly errorRecoveryTime: number;
  readonly emergencyBypassActivationTime: number; // Must be <3s
}

export interface PerformanceViolation {
  readonly type: 'crisis_response' | 'screen_load' | 'payment_processing' | 'emergency_access';
  readonly measuredTime: number;
  readonly expectedTime: number;
  readonly severity: 'warning' | 'critical';
  readonly timestamp: string;
  readonly context: string;
}

/**
 * Subscription Screen Types
 */
export const SubscriptionTierSchema = z.object({
  planId: z.string(),
  name: z.string(),
  therapeuticName: z.string(),
  description: z.string(),
  price: z.number().min(0),
  interval: z.enum(['month', 'year']),
  originalPrice: z.number().optional(),
  features: z.array(z.string()),
  trialDays: z.number().optional(),
  recommended: z.boolean().optional(),
  therapeuticBenefits: z.array(z.string()),
  crisisSafe: z.boolean()
});

export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

export interface SubscriptionScreenProps {
  readonly navigation: PaymentNavigationProp<'SubscriptionScreen'>;
  readonly route: PaymentRouteProp<'SubscriptionScreen'>;
}

export interface SubscriptionScreenState {
  readonly selectedPlan: SubscriptionTier | null;
  readonly trialTimeRemaining: number | null;
  readonly showCrisisOverride: boolean;
  readonly isProcessingSubscription: boolean;
  readonly paymentAnxietyDetected: boolean;
  readonly screenLoadTime: number | null;
  readonly performanceMetrics: CrisisPerformanceMetrics;
}

export interface SubscriptionScreenActions {
  readonly handlePlanSelection: (plan: SubscriptionTier) => Promise<void>;
  readonly handleCrisisActivation: (reason: string) => Promise<void>;
  readonly proceedWithSubscription: (plan: SubscriptionTier) => Promise<void>;
  readonly handleSubscriptionError: (error: PaymentError, plan: SubscriptionTier) => void;
  readonly announceForScreenReader: (message: string) => void;
}

/**
 * Payment Method Screen Types
 */
export const PaymentMethodFormDataSchema = z.object({
  cardNumber: z.string().regex(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/).optional(),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/).optional(),
  expiryYear: z.string().regex(/^\d{4}$/).optional(),
  cvc: z.string().regex(/^\d{3,4}$/).optional(),
  nameOnCard: z.string().min(2).optional(),
  billingEmail: z.string().email().optional()
});

export type PaymentMethodFormData = z.infer<typeof PaymentMethodFormDataSchema>;

export interface PaymentMethodScreenProps {
  readonly navigation: PaymentNavigationProp<'PaymentMethodScreen'>;
  readonly route: PaymentRouteProp<'PaymentMethodScreen'>;
}

export interface PaymentMethodScreenState {
  readonly formData: PaymentMethodFormData;
  readonly formErrors: Partial<PaymentMethodFormData>;
  readonly isProcessing: boolean;
  readonly paymentAnxietyLevel: number; // 0-5 scale
  readonly showAnxietySupport: boolean;
  readonly selectedPaymentMethod: string | null;
  readonly showAddNewCard: boolean;
  readonly performanceMetrics: CrisisPerformanceMetrics;
}

export interface PaymentMethodScreenActions {
  readonly handleFormChange: (field: keyof PaymentMethodFormData, value: string) => void;
  readonly validateField: (field: keyof PaymentMethodFormData, value: string) => void;
  readonly validateForm: () => boolean;
  readonly handleAddPaymentMethod: () => Promise<void>;
  readonly handleSubscriptionCreation: (paymentMethodId: string) => Promise<void>;
  readonly handlePaymentMethodError: (error: PaymentError) => void;
  readonly handlePaymentSystemError: (error: any) => Promise<void>;
}

/**
 * Billing History Screen Types
 */
export const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(['payment', 'refund', 'trial_start', 'subscription_change']),
  status: z.enum(['succeeded', 'pending', 'failed', 'canceled']),
  amount: z.number().min(0),
  currency: z.string().length(3),
  description: z.string(),
  date: z.string(),
  paymentMethod: z.object({
    type: z.string(),
    last4: z.string(),
    brand: z.string()
  }).optional(),
  invoiceId: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  subscriptionPlan: z.string().optional(),
  metadata: z.object({
    therapeuticContext: z.string().optional(),
    crisisSupport: z.boolean().optional()
  }).optional()
});

export type Transaction = z.infer<typeof TransactionSchema>;

export interface BillingHistoryScreenProps {
  readonly navigation: PaymentNavigationProp<'BillingHistoryScreen'>;
  readonly route: PaymentRouteProp<'BillingHistoryScreen'>;
}

export interface BillingHistoryScreenState {
  readonly transactions: readonly Transaction[];
  readonly isRefreshing: boolean;
  readonly selectedFilter: 'all' | 'payments' | 'refunds' | 'trials';
  readonly showBillingSupport: boolean;
  readonly financialStressDetected: boolean;
  readonly performanceMetrics: CrisisPerformanceMetrics;
}

export interface BillingHistoryScreenActions {
  readonly loadTransactionHistory: (refresh?: boolean) => Promise<void>;
  readonly detectFinancialStress: () => void;
  readonly handleFinancialStressSupport: () => Promise<void>;
  readonly handleTransactionTap: (transaction: Transaction) => Promise<void>;
  readonly viewTransactionReceipt: (transaction: Transaction) => Promise<void>;
  readonly generateReceiptText: (transaction: Transaction) => string;
}

/**
 * Payment Settings Screen Types
 */
export const SubscriptionChangeOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  therapeuticRationale: z.string(),
  action: z.enum(['upgrade', 'downgrade', 'pause', 'cancel']),
  impact: z.enum(['positive', 'neutral', 'caution']),
  crisisSafe: z.boolean()
});

export type SubscriptionChangeOption = z.infer<typeof SubscriptionChangeOptionSchema>;

export interface PaymentSettingsScreenProps {
  readonly navigation: PaymentNavigationProp<'PaymentSettingsScreen'>;
  readonly route: PaymentRouteProp<'PaymentSettingsScreen'>;
}

export interface PaymentSettingsScreenState {
  readonly isProcessingChange: boolean;
  readonly showCancellationFlow: boolean;
  readonly showFinancialSupport: boolean;
  readonly autoRenewalEnabled: boolean;
  readonly billingEmailNotifications: boolean;
  readonly pauseUntilDate: Date | null;
  readonly performanceMetrics: CrisisPerformanceMetrics;
}

export interface PaymentSettingsScreenActions {
  readonly handleSubscriptionChange: (option: SubscriptionChangeOption) => Promise<void>;
  readonly processSubscriptionChange: (option: SubscriptionChangeOption) => Promise<void>;
  readonly handleUpgrade: (option: SubscriptionChangeOption) => Promise<void>;
  readonly handleDowngrade: (option: SubscriptionChangeOption) => Promise<void>;
  readonly handlePause: (option: SubscriptionChangeOption) => Promise<void>;
  readonly handleCancellation: (option: SubscriptionChangeOption) => Promise<void>;
  readonly processCancellation: (immediate?: boolean) => Promise<void>;
  readonly handleSubscriptionError: (error: PaymentError, option: SubscriptionChangeOption) => void;
}

/**
 * Crisis Safety Component Types
 */
export interface CrisisPaymentBannerProps {
  readonly variant?: 'standard' | 'prominent' | 'emergency';
  readonly showActivateButton?: boolean;
  readonly customMessage?: string;
  readonly onCrisisActivated?: () => void;
  readonly performanceTracking?: boolean;
}

export interface CrisisPaymentBannerState {
  readonly crisisMode: boolean;
  readonly crisisOverride: CrisisPaymentOverride | null;
  readonly performanceMetrics: CrisisPerformanceMetrics;
}

export interface CrisisPaymentBannerActions {
  readonly handleCrisisHotlineCall: () => Promise<void>;
  readonly handleCrisisActivation: (reason: string) => Promise<void>;
  readonly getBannerStyle: () => any;
  readonly getMessage: () => string;
}

/**
 * Payment Anxiety Detection Types
 */
export interface PaymentAnxietyDetectionProps {
  readonly formInteractions?: number;
  readonly errorCount?: number;
  readonly timeOnScreen?: number;
  readonly paymentFailures?: number;
  readonly onAnxietyDetected?: (level: number) => void;
  readonly onInterventionTriggered?: (intervention: string) => void;
}

export interface AnxietyIndicators {
  readonly rapidCorrections: number;
  readonly formHesitation: number;
  readonly paymentErrors: number;
  readonly timeStress: number;
  readonly overallLevel: number; // 0-5 scale
}

export interface PaymentAnxietyDetectionState {
  readonly anxietyIndicators: AnxietyIndicators;
  readonly showSupport: boolean;
  readonly currentIntervention: string | null;
  readonly breathingActive: boolean;
  readonly performanceMetrics: CrisisPerformanceMetrics;
}

export interface PaymentAnxietyDetectionActions {
  readonly analyzeAnxietyIndicators: () => void;
  readonly triggerSupportIntervention: () => void;
  readonly selectIntervention: (anxietyLevel: number) => string;
  readonly handleBreathingExercise: () => void;
  readonly handleStopBreathing: () => void;
  readonly handleCrisisEscalation: () => Promise<void>;
  readonly handleDismissSupport: () => void;
}

/**
 * Error Handling Types for Payment UI
 */
export interface PaymentUIError extends PaymentError {
  readonly uiContext: {
    readonly screen: keyof PaymentStackParamList;
    readonly component: string;
    readonly userAction: string;
    readonly formData?: Partial<PaymentMethodFormData>;
    readonly anxietyLevel?: number;
  };
  readonly recoveryOptions: readonly string[];
  readonly crisisEscalationRequired: boolean;
  readonly performanceImpact: PerformanceViolation | null;
}

export interface ErrorRecoveryStrategy {
  readonly strategy: 'retry' | 'fallback' | 'crisis_mode' | 'user_guidance';
  readonly message: string;
  readonly actions: readonly string[];
  readonly timeoutMs: number;
  readonly crisisSafe: boolean;
}

/**
 * Performance Monitoring Types
 */
export interface PaymentUIPerformanceMetrics {
  readonly screenLoadTimes: Record<keyof PaymentStackParamList, number>;
  readonly crisisResponseTimes: readonly number[];
  readonly paymentProcessingTimes: readonly number[];
  readonly averageAnxietyLevel: number;
  readonly performanceViolations: readonly PerformanceViolation[];
  readonly lastMeasurement: string;
}

export interface PaymentUIPerformanceMonitor {
  readonly startTimer: (operation: string) => string;
  readonly endTimer: (timerId: string) => number;
  readonly recordCrisisResponse: (duration: number) => void;
  readonly validateCrisisCompliance: () => boolean;
  readonly getPerformanceSummary: () => PaymentUIPerformanceMetrics;
  readonly checkViolations: () => readonly PerformanceViolation[];
}

/**
 * Component State Aggregation Types
 */
export interface PaymentUIState {
  readonly subscription: SubscriptionScreenState;
  readonly paymentMethod: PaymentMethodScreenState;
  readonly billingHistory: BillingHistoryScreenState;
  readonly paymentSettings: PaymentSettingsScreenState;
  readonly crisisBanner: CrisisPaymentBannerState;
  readonly anxietyDetection: PaymentAnxietyDetectionState;
  readonly performance: PaymentUIPerformanceMetrics;
}

export interface PaymentUIActions {
  readonly subscription: SubscriptionScreenActions;
  readonly paymentMethod: PaymentMethodScreenActions;
  readonly billingHistory: BillingHistoryScreenActions;
  readonly paymentSettings: PaymentSettingsScreenActions;
  readonly crisisBanner: CrisisPaymentBannerActions;
  readonly anxietyDetection: PaymentAnxietyDetectionActions;
  readonly performance: PaymentUIPerformanceMonitor;
}

/**
 * Hook Types for Payment UI Components
 */
export interface UseSubscriptionScreenHook {
  readonly state: SubscriptionScreenState;
  readonly actions: SubscriptionScreenActions;
  readonly navigation: PaymentNavigationProp<'SubscriptionScreen'>;
  readonly route: PaymentRouteProp<'SubscriptionScreen'>;
  readonly performanceMonitor: PaymentUIPerformanceMonitor;
}

export interface UsePaymentMethodScreenHook {
  readonly state: PaymentMethodScreenState;
  readonly actions: PaymentMethodScreenActions;
  readonly navigation: PaymentNavigationProp<'PaymentMethodScreen'>;
  readonly route: PaymentRouteProp<'PaymentMethodScreen'>;
  readonly performanceMonitor: PaymentUIPerformanceMonitor;
}

export interface UseBillingHistoryScreenHook {
  readonly state: BillingHistoryScreenState;
  readonly actions: BillingHistoryScreenActions;
  readonly navigation: PaymentNavigationProp<'BillingHistoryScreen'>;
  readonly route: PaymentRouteProp<'BillingHistoryScreen'>;
  readonly performanceMonitor: PaymentUIPerformanceMonitor;
}

export interface UsePaymentSettingsScreenHook {
  readonly state: PaymentSettingsScreenState;
  readonly actions: PaymentSettingsScreenActions;
  readonly navigation: PaymentNavigationProp<'PaymentSettingsScreen'>;
  readonly route: PaymentRouteProp<'PaymentSettingsScreen'>;
  readonly performanceMonitor: PaymentUIPerformanceMonitor;
}

/**
 * Integration Types with Existing Store System
 */
export interface PaymentUIStoreIntegration {
  readonly customer: CustomerResult | null;
  readonly paymentMethods: readonly PaymentMethodResult[];
  readonly activeSubscription: SubscriptionResult | null;
  readonly availablePlans: readonly SubscriptionPlan[];
  readonly crisisMode: boolean;
  readonly crisisOverride: CrisisPaymentOverride | null;
  readonly lastPaymentError: PaymentUIError | null;
}

/**
 * Type Guards for Payment UI Types
 */
export const isSubscriptionTier = (obj: any): obj is SubscriptionTier => {
  return SubscriptionTierSchema.safeParse(obj).success;
};

export const isPaymentMethodFormData = (obj: any): obj is PaymentMethodFormData => {
  return PaymentMethodFormDataSchema.safeParse(obj).success;
};

export const isTransaction = (obj: any): obj is Transaction => {
  return TransactionSchema.safeParse(obj).success;
};

export const isSubscriptionChangeOption = (obj: any): obj is SubscriptionChangeOption => {
  return SubscriptionChangeOptionSchema.safeParse(obj).success;
};

export const isPaymentUIError = (obj: any): obj is PaymentUIError => {
  return obj &&
         typeof obj === 'object' &&
         'uiContext' in obj &&
         'recoveryOptions' in obj &&
         'crisisEscalationRequired' in obj;
};

export const isCrisisPerformanceViolation = (metrics: CrisisPerformanceMetrics): boolean => {
  return metrics.crisisButtonResponseTime > 200 ||
         metrics.screenLoadTime > 500 ||
         metrics.emergencyBypassActivationTime > 3000;
};

/**
 * Crisis Safety Validation Types
 */
export interface CrisisSafetyValidator {
  readonly validateCrisisResponse: (duration: number) => boolean;
  readonly validateScreenLoad: (duration: number) => boolean;
  readonly validateEmergencyAccess: (duration: number) => boolean;
  readonly validatePaymentFlow: (flowStep: string, duration: number) => boolean;
  readonly getCrisisSafetyReport: () => {
    readonly compliant: boolean;
    readonly violations: readonly PerformanceViolation[];
    readonly recommendations: readonly string[];
  };
}

/**
 * Payment UI Configuration Types
 */
export interface PaymentUIConfig {
  readonly performanceThresholds: {
    readonly crisisResponseMs: 200;
    readonly screenLoadMs: 500;
    readonly emergencyAccessMs: 3000;
    readonly paymentProcessingMs: 5000;
  };
  readonly anxietyDetection: {
    readonly enabled: boolean;
    readonly sensitivityLevel: 1 | 2 | 3 | 4 | 5;
    readonly interventionThreshold: number;
    readonly breathingExerciseDuration: number;
  };
  readonly crisisSafety: {
    readonly alwaysShowHotline: boolean;
    readonly emergencyBypassEnabled: boolean;
    readonly crisisButtonAlwaysVisible: boolean;
    readonly therapeuticMessaging: boolean;
  };
  readonly accessibility: {
    readonly screenReaderEnabled: boolean;
    readonly highContrastMode: boolean;
    readonly largeText: boolean;
    readonly reducedMotion: boolean;
  };
}

/**
 * Export all validation schemas for runtime validation
 */
export const PaymentUISchemas = {
  SubscriptionTier: SubscriptionTierSchema,
  PaymentMethodFormData: PaymentMethodFormDataSchema,
  Transaction: TransactionSchema,
  SubscriptionChangeOption: SubscriptionChangeOptionSchema
} as const;

/**
 * Utility Types for Enhanced Type Safety
 */
export type PaymentUIComponent =
  | 'SubscriptionScreen'
  | 'PaymentMethodScreen'
  | 'BillingHistoryScreen'
  | 'PaymentSettingsScreen'
  | 'CrisisPaymentBanner'
  | 'PaymentAnxietyDetection';

export type CrisisSafeOperation<T> = (
  operation: () => Promise<T>,
  fallback: T,
  timeoutMs?: number
) => Promise<T>;

export type PaymentUIEventHandler<T extends keyof PaymentUIActions> =
  PaymentUIActions[T][keyof PaymentUIActions[T]];

export type TherapeuticPaymentAction =
  | 'plan_selection'
  | 'payment_method_addition'
  | 'subscription_change'
  | 'crisis_activation'
  | 'anxiety_intervention'
  | 'billing_review';

/**
 * Complete Payment UI Type Integration
 */
export interface CompletePaymentUITypes {
  readonly state: PaymentUIState;
  readonly actions: PaymentUIActions;
  readonly config: PaymentUIConfig;
  readonly validator: CrisisSafetyValidator;
  readonly performanceMonitor: PaymentUIPerformanceMonitor;
  readonly storeIntegration: PaymentUIStoreIntegration;
}