/**
 * TypeScript Interface Definitions for Webhook UI Components
 *
 * Comprehensive type safety for payment status components with:
 * - Crisis safety type constraints (<200ms response requirements)
 * - HIPAA-compliant type definitions (no payment details in logs)
 * - Therapeutic UX pattern enforcement through types
 * - Performance monitoring type integration
 * - WCAG AA accessibility compliance types
 */

import type { ViewStyle, TextStyle, AccessibilityRole, AccessibilityState } from 'react-native';
import type {
  SubscriptionStatus,
  PaymentError,
  SubscriptionPlan,
  CrisisPaymentOverride
} from './payment';

/**
 * HOOK RETURN TYPE INTERFACES
 * Validates store integration and ensures type safety
 */

/**
 * usePaymentStatus Hook Return Interface
 */
export interface PaymentStatusHookReturn {
  // Subscription state
  readonly subscriptionStatus: SubscriptionStatus | null;
  readonly subscriptionTier: SubscriptionPlan | null;
  readonly isSubscriptionActive: boolean;

  // Error handling
  readonly paymentError: PaymentError | null;

  // Grace period and trial info
  readonly gracePeriodInfo: GracePeriodInfo | null;
  readonly trialInfo: TrialInfo | null;

  // Loading states (must complete within performance constraints)
  readonly isLoading: boolean;
  readonly crisisMode: boolean;

  // Feature access (crisis-safe)
  readonly featureAccess: Record<string, boolean>;

  // Performance metrics (for monitoring <200ms constraint)
  readonly performanceMetrics: PaymentPerformanceMetrics;

  // Webhook status
  readonly webhookStatus: WebhookStatus | null;
  readonly realTimeUpdateStatus: RealTimeUpdateStatus | null;
  readonly syncStatus: SyncStatus | null;
}

/**
 * usePaymentActions Hook Return Interface
 */
export interface PaymentActionsHookReturn {
  // Core payment operations
  readonly initializePayments: () => Promise<void>;
  readonly loadCustomer: (userId: string) => Promise<void>;
  readonly createCustomer: (customerData: any) => Promise<void>;
  readonly addPaymentMethod: (paymentMethodData: any) => Promise<void>;
  readonly createSubscription: (planId: string, paymentMethodId?: string, trialDays?: number) => Promise<void>;

  // Subscription management
  readonly syncSubscriptionState: () => Promise<void>;
  readonly checkFeatureAccess: (featureId: string) => Promise<boolean>;
  readonly updateFeatureAccessFromSubscription: () => Promise<void>;

  // Crisis management (must maintain <200ms response)
  readonly enableCrisisMode: (reason: string) => Promise<void>;
  readonly disableCrisisMode: () => Promise<void>;

  // Trial management
  readonly startMindfulTrial: () => Promise<void>;
  readonly convertTrialToPaid: (planId: string) => Promise<void>;
  readonly handleSubscriptionPaymentFailure: () => Promise<void>;
  readonly cancelSubscriptionMindfully: () => Promise<void>;

  // Webhook operations
  readonly initializeWebhookProcessing: () => Promise<void>;
  readonly updateSubscriptionFromWebhook: (webhookData: any) => Promise<void>;
  readonly cleanupWebhookResources: () => void;

  // UI state actions
  readonly showPaymentSheet: () => void;
  readonly hidePaymentSheet: () => void;
  readonly showSubscriptionSelector: () => void;
  readonly hideSubscriptionSelector: () => void;

  // Recovery actions
  readonly retryFailedPayment?: () => Promise<void>;
  readonly activateGracePeriod?: (options: GracePeriodActivationOptions) => Promise<void>;
}

/**
 * useGracePeriodMonitoring Hook Return Interface
 */
export interface GracePeriodMonitoringHookReturn {
  readonly gracePeriodActive: boolean;
  readonly gracePeriodStatus: GracePeriodStatus | null;
  readonly daysRemaining: number;
  readonly daysRemainingFormatted: string | null;
  readonly therapeuticContinuity: boolean;
  readonly gracePeriodReason: string | null;
  readonly showGracePeriodBanner: boolean;
  readonly maintainedAccess: readonly string[];
  readonly totalActivePeriods: number;
  readonly gracePeriodActivations: number;

  // Actions
  readonly checkAndUpdateGracePeriods: () => Promise<void>;
}

/**
 * useWebhookProcessing Hook Return Interface
 */
export interface WebhookProcessingHookReturn {
  // Processing state
  readonly isProcessing: boolean;
  readonly lastEventType: string | null;
  readonly lastEventProcessed: string | null;
  readonly processingFailures: number;
  readonly averageProcessingTime: number;

  // Status objects
  readonly webhookStatus: WebhookStatus | null;
  readonly realTimeUpdateStatus: RealTimeUpdateStatus | null;
  readonly gracePeriodStatus: GracePeriodStatus | null;

  // Performance metrics
  readonly webhookMetrics: WebhookMetrics;
  readonly crisisEventsProcessed: number;
  readonly totalEventsProcessed: number;

  // Configuration
  readonly webhookConfig: WebhookConfig;
  readonly gracePeriodDays: number;
  readonly crisisTimeoutMs: number;

  // Actions
  readonly initializeWebhookProcessing: () => Promise<void>;
  readonly updateSubscriptionFromWebhook: (webhookData: any) => Promise<void>;
  readonly cleanupWebhookResources: () => void;
  readonly processRealTimeUpdate: (stateUpdate: any) => Promise<void>;
  readonly processQueuedRealTimeUpdates: () => Promise<void>;
}

/**
 * SUPPORTING TYPE DEFINITIONS
 */

export interface GracePeriodInfo {
  readonly active: boolean;
  readonly daysRemaining: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly reason: string;
  readonly therapeuticContinuityEnabled: boolean;
}

export interface GracePeriodStatus {
  readonly active: boolean;
  readonly daysRemaining: number;
  readonly daysRemainingFormatted: string;
  readonly reason: string;
  readonly therapeuticContinuity: boolean;
  readonly therapeuticContinuityEnabled: boolean;
  readonly totalActivePeriods: number;
}

export interface GracePeriodActivationOptions {
  readonly reason: string;
  readonly therapeuticContinuity: boolean;
  readonly duration?: number;
}

export interface TrialInfo {
  readonly active: boolean;
  readonly daysRemaining: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly extended: boolean;
  readonly planId: string;
}

export interface PaymentPerformanceMetrics {
  readonly averageResponseTime: number;
  readonly crisisResponseTimes: readonly number[];
  readonly lastOperationTime: number;
  readonly performanceViolations: number;
}

export interface WebhookStatus {
  readonly isProcessing: boolean;
  readonly lastEventType: string | null;
  readonly lastEventProcessed: string | null;
  readonly processingFailures: number;
}

export interface RealTimeUpdateStatus {
  readonly active: boolean;
  readonly queueSize: number;
  readonly lastUpdateProcessed: string | null;
  readonly processingDelay: number;
}

export interface SyncStatus {
  readonly lastSyncTime: string | null;
  readonly syncInProgress: boolean;
  readonly pendingSyncs: number;
  readonly syncErrors: number;
}

export interface WebhookMetrics {
  readonly totalProcessed: number;
  readonly crisisProcessed: number;
  readonly averageProcessingTime: number;
  readonly lastEventProcessed: string | null;
  readonly processingFailures: number;
  readonly stateUpdates: number;
  readonly gracePeriodActivations: number;
  readonly crisisOverrides: number;
  readonly realTimeUpdatesProcessed: number;
}

export interface WebhookConfig {
  readonly processingTimeoutMs: number;
  readonly crisisTimeoutMs: number;
  readonly maxRetryAttempts: number;
  readonly retryDelayMs: number;
  readonly batchSize: number;
  readonly enableMetrics: boolean;
  readonly enableStateSync: boolean;
  readonly gracePeriodDays: number;
  readonly therapeuticMessaging: boolean;
  readonly realTimeUpdates: boolean;
  readonly stateDeduplication: boolean;
}

/**
 * COMPONENT PROP INTERFACES
 * Type-safe component props with crisis safety and accessibility constraints
 */

/**
 * PaymentStatusIndicator Component Props
 */
export interface PaymentStatusIndicatorProps {
  readonly onPress?: (() => void) | (() => Promise<void>);
  readonly theme?: 'morning' | 'midday' | 'evening' | null;
  readonly showUpgradePrompt?: boolean;
  readonly compact?: boolean;
  readonly style?: ViewStyle;

  // Accessibility props (WCAG AA compliance)
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: AccessibilityRole;
  readonly accessibilityState?: AccessibilityState;
  readonly testID?: string;

  // Crisis safety constraints
  readonly crisisMode?: boolean;
  readonly maxResponseTimeMs?: number; // Default: 200ms

  // Performance monitoring
  readonly onPerformanceViolation?: (duration: number, operation: string) => void;
}

/**
 * SubscriptionTierDisplay Component Props
 */
export interface SubscriptionTierDisplayProps {
  readonly onUpgrade?: (planId: string) => void | Promise<void>;
  readonly onManageSubscription?: () => void | Promise<void>;
  readonly showFeatureComparison?: boolean;
  readonly theme?: 'morning' | 'midday' | 'evening' | null;
  readonly style?: ViewStyle;
  readonly testID?: string;

  // Crisis safety
  readonly crisisMode?: boolean;
  readonly maintainTherapeuticAccess?: boolean;

  // Accessibility
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
}

/**
 * PaymentErrorModal Component Props
 */
export interface PaymentErrorModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onRetryPayment?: () => void | Promise<void>;
  readonly onUpdatePaymentMethod?: () => void | Promise<void>;
  readonly onContactSupport?: () => void | Promise<void>;
  readonly error?: PaymentErrorInfo | null;
  readonly testID?: string;

  // Crisis safety - must never block therapeutic access
  readonly therapeuticContinuityEnabled?: boolean;
  readonly crisisOverride?: CrisisPaymentOverride | null;

  // Accessibility
  readonly accessibilityLabel?: string;
  readonly accessibilityViewIsModal?: boolean;
}

/**
 * GracePeriodBanner Component Props
 */
export interface GracePeriodBannerProps {
  readonly gracePeriodStatus: GracePeriodStatus;
  readonly onDismiss?: () => void;
  readonly onResolvePayment?: () => void | Promise<void>;
  readonly onExtendGracePeriod?: () => void | Promise<void>;
  readonly style?: ViewStyle;
  readonly testID?: string;

  // Therapeutic messaging
  readonly therapeuticMessaging?: boolean;
  readonly showTherapeuticReassurance?: boolean;

  // Accessibility
  readonly accessibilityLabel?: string;
  readonly accessibilityRole?: AccessibilityRole;
}

/**
 * WebhookLoadingStates Component Props
 */
export interface WebhookLoadingStatesProps {
  readonly showProcessingDetails?: boolean;
  readonly compact?: boolean;
  readonly theme?: 'morning' | 'midday' | 'evening' | null;
  readonly style?: ViewStyle;
  readonly testID?: string;

  // Performance monitoring
  readonly performanceThreshold?: number; // Default: 200ms
  readonly onPerformanceViolation?: (duration: number, operation: string) => void;

  // Crisis safety
  readonly crisisMode?: boolean;
  readonly prioritizeTherapeuticAccess?: boolean;

  // Accessibility
  readonly accessibilityLabel?: string;
  readonly announceUpdates?: boolean; // Screen reader announcements
}

/**
 * PaymentStatusDashboard Component Props
 */
export interface PaymentStatusDashboardProps {
  readonly onNavigateToSubscription?: () => void;
  readonly onNavigateToPaymentMethods?: () => void;
  readonly onNavigateToBilling?: () => void;
  readonly showQuickActions?: boolean;
  readonly theme?: 'morning' | 'midday' | 'evening' | null;
  readonly style?: ViewStyle;
  readonly testID?: string;

  // Crisis integration
  readonly crisisMode?: boolean;
  readonly crisisOverride?: CrisisPaymentOverride | null;

  // Accessibility
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
}

/**
 * ERROR HANDLING TYPES
 */

export interface PaymentErrorInfo {
  readonly code: string;
  readonly message: string;
  readonly type: string;
  readonly severity?: 'low' | 'medium' | 'high' | 'critical';
  readonly retryable?: boolean;
  readonly crisisImpact?: 'none' | 'degraded' | 'blocked';
  readonly userMessage?: string;
  readonly suggestions?: readonly string[];
}

/**
 * EVENT HANDLER TYPE DEFINITIONS
 * Type-safe event handlers with performance constraints
 */

export type CrisisSafeClickHandler = () => void | Promise<void>;
export type PerformanceMonitoredHandler = (duration: number, operation: string) => void;
export type TherapeuticContinuityHandler = (reason: string) => Promise<void>;
export type PaymentRetryHandler = () => Promise<void>;
export type SubscriptionUpgradeHandler = (planId: string) => void | Promise<void>;
export type ErrorRecoveryHandler = (error: PaymentErrorInfo, strategy: string) => Promise<void>;

/**
 * ACCESSIBILITY TYPE CONSTRAINTS
 * Enforces WCAG AA compliance through TypeScript
 */

export interface AccessibilityProps {
  readonly accessibilityLabel: string; // Required for payment components
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: AccessibilityRole;
  readonly accessibilityState?: AccessibilityState;
  readonly accessibilityActions?: readonly any[];
  readonly accessibilityValue?: any;
}

export interface CrisisAccessibilityProps extends AccessibilityProps {
  readonly accessibilityLabel: string; // Must describe crisis safety
  readonly accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  readonly importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

/**
 * CRISIS SAFETY TYPE CONSTRAINTS
 * Enforces <200ms response time and therapeutic access preservation
 */

export interface CrisisSafetyConstraints {
  readonly maxResponseTimeMs: 200;
  readonly therapeuticAccessPriority: 'highest';
  readonly emergencyBypassEnabled: boolean;
  readonly crisisDetectionEnabled: boolean;
}

export interface CrisisSafeComponent {
  readonly crisisMode?: boolean;
  readonly crisisOverride?: CrisisPaymentOverride | null;
  readonly therapeuticAccessMaintained: boolean;
  readonly emergencyFallbackAvailable: boolean;
}

/**
 * PERFORMANCE MONITORING TYPES
 */

export interface ComponentPerformanceMetrics {
  readonly renderTime: number;
  readonly interactionResponseTime: number;
  readonly crisisResponseTime: number;
  readonly memoryUsage: number;
  readonly reRenderCount: number;
}

export interface PerformanceViolation {
  readonly component: string;
  readonly operation: string;
  readonly duration: number;
  readonly threshold: number;
  readonly timestamp: string;
  readonly crisisMode: boolean;
}

/**
 * STYLE TYPE CONSTRAINTS
 * Theme-aware and accessibility-compliant styling
 */

export interface PaymentComponentStyles {
  readonly container?: ViewStyle;
  readonly content?: ViewStyle;
  readonly header?: ViewStyle;
  readonly title?: TextStyle;
  readonly subtitle?: TextStyle;
  readonly errorText?: TextStyle;
  readonly successText?: TextStyle;
  readonly warningText?: TextStyle;
  readonly therapeuticText?: TextStyle;
}

/**
 * INTEGRATION VALIDATION TYPES
 * Ensures proper integration with existing systems
 */

export interface StoreIntegrationValidation {
  readonly usePaymentStatus: () => PaymentStatusHookReturn;
  readonly usePaymentActions: () => PaymentActionsHookReturn;
  readonly useGracePeriodMonitoring: () => GracePeriodMonitoringHookReturn;
  readonly useWebhookProcessing: () => WebhookProcessingHookReturn;
  readonly paymentSelectors: PaymentSelectorsValidation;
}

export interface PaymentSelectorsValidation {
  readonly getSubscriptionStatus: (store: any) => SubscriptionStatus | null;
  readonly getSubscriptionTier: (store: any) => SubscriptionPlan | null;
  readonly getFeatureAccess: (store: any) => Record<string, boolean>;
  readonly getPaymentErrorForUser: (store: any) => PaymentError | null;
  readonly getGracePeriodStatus: (store: any) => GracePeriodStatus | null;
  readonly getWebhookStatus: (store: any) => WebhookStatus | null;
  readonly getRealTimeUpdateStatus: (store: any) => RealTimeUpdateStatus | null;
  readonly getPerformanceMetrics: (store: any) => PaymentPerformanceMetrics;
  readonly canAccessFeature: (store: any, featureId: string) => boolean;
}

/**
 * TYPE VALIDATION UTILITIES
 */

export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type CrisisSafeProps<T> = T & CrisisSafeComponent;
export type AccessibleProps<T> = T & AccessibilityProps;
export type PerformanceMonitoredProps<T> = T & {
  readonly onPerformanceViolation?: PerformanceMonitoredHandler;
};

/**
 * COMPONENT TYPE COMPOSITION
 * Complete type definitions for component integration
 */

export type PaymentStatusIndicatorFullProps = CrisisSafeProps<AccessibleProps<PerformanceMonitoredProps<PaymentStatusIndicatorProps>>>;
export type SubscriptionTierDisplayFullProps = CrisisSafeProps<AccessibleProps<SubscriptionTierDisplayProps>>;
export type PaymentErrorModalFullProps = CrisisSafeProps<AccessibleProps<PaymentErrorModalProps>>;
export type GracePeriodBannerFullProps = CrisisSafeProps<AccessibleProps<GracePeriodBannerProps>>;
export type WebhookLoadingStatesFullProps = CrisisSafeProps<AccessibleProps<PerformanceMonitoredProps<WebhookLoadingStatesProps>>>;

/**
 * EXPORT ALL INTERFACES
 */
export type {
  PaymentStatusHookReturn,
  PaymentActionsHookReturn,
  GracePeriodMonitoringHookReturn,
  WebhookProcessingHookReturn,
  PaymentStatusIndicatorProps,
  SubscriptionTierDisplayProps,
  PaymentErrorModalProps,
  GracePeriodBannerProps,
  WebhookLoadingStatesProps,
  PaymentStatusDashboardProps,
  PaymentErrorInfo,
  CrisisSafeClickHandler,
  PerformanceMonitoredHandler,
  TherapeuticContinuityHandler,
  PaymentRetryHandler,
  SubscriptionUpgradeHandler,
  ErrorRecoveryHandler,
  AccessibilityProps,
  CrisisAccessibilityProps,
  CrisisSafetyConstraints,
  CrisisSafeComponent,
  ComponentPerformanceMetrics,
  PerformanceViolation,
  PaymentComponentStyles,
  StoreIntegrationValidation,
  PaymentSelectorsValidation
};