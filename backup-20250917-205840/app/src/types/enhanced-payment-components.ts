/**
 * Enhanced TypeScript Validation for Payment UI Components
 *
 * Type safety validation report and enhanced interfaces for webhook UI components
 * implementing React agent deliverables with comprehensive TypeScript coverage
 */

import React from 'react';
import type { ViewStyle, TextStyle, TouchableOpacityProps, ViewProps } from 'react-native';
import type {
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
  CrisisSafeComponent,
  AccessibilityProps
} from './webhook-ui-components';

/**
 * TYPE VALIDATION FIXES
 * Addresses gaps found in React agent implementation
 */

/**
 * Enhanced PaymentStatusIndicator Props with Complete Type Safety
 */
export interface EnhancedPaymentStatusIndicatorProps extends PaymentStatusIndicatorProps {
  // Fixed: onPress callback signature - ensure async handling
  readonly onPress?: (() => void) | (() => Promise<void>);

  // Fixed: style prop - ensure proper ViewStyle typing
  readonly style?: ViewStyle | ViewStyle[];

  // Enhanced: Crisis safety with performance monitoring
  readonly crisisResponseTimeMs?: number;
  readonly onCrisisViolation?: (duration: number) => void;

  // Enhanced: Accessibility with proper WCAG AA constraints
  readonly accessibilityLabel: string; // Now required for payment components
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: 'button' | 'text' | 'image';
  readonly accessibilityState?: {
    readonly disabled?: boolean;
    readonly selected?: boolean;
    readonly busy?: boolean;
  };

  // Enhanced: Theme typing with stricter validation
  readonly theme?: 'morning' | 'midday' | 'evening' | null;

  // Enhanced: Test infrastructure integration
  readonly testID: string; // Now required for comprehensive testing
}

/**
 * Enhanced SubscriptionTierDisplay Props with Feature Type Safety
 */
export interface EnhancedSubscriptionTierDisplayProps extends SubscriptionTierDisplayProps {
  // Fixed: Event handler typing with proper async support
  readonly onUpgrade?: (planId: SubscriptionPlanId) => void | Promise<void>;
  readonly onManageSubscription?: () => void | Promise<void>;

  // Enhanced: Feature comparison with type-safe feature list
  readonly showFeatureComparison?: boolean;
  readonly customFeatures?: ReadonlyArray<FeatureItem>;

  // Enhanced: Crisis mode integration
  readonly crisisMode?: boolean;
  readonly therapeuticAccessOverride?: boolean;

  // Enhanced: Performance monitoring
  readonly onRenderPerformance?: (metrics: ComponentRenderMetrics) => void;

  // Fixed: Style array support
  readonly style?: ViewStyle | ViewStyle[];
}

/**
 * Enhanced PaymentErrorModal Props with Therapeutic Error Handling
 */
export interface EnhancedPaymentErrorModalProps extends PaymentErrorModalProps {
  // Fixed: Modal visibility with proper state management
  readonly visible: boolean;
  readonly onClose: () => void;

  // Enhanced: Error recovery with type-safe strategies
  readonly onRetryPayment?: () => void | Promise<void>;
  readonly onUpdatePaymentMethod?: () => void | Promise<void>;
  readonly onContactSupport?: () => void | Promise<void>;
  readonly onActivateGracePeriod?: () => void | Promise<void>;

  // Enhanced: Error information with complete typing
  readonly error?: EnhancedPaymentErrorInfo | null;

  // Enhanced: Therapeutic messaging
  readonly therapeuticMessaging?: boolean;
  readonly showCrisisSafety?: boolean;
  readonly gracePeriodAvailable?: boolean;

  // Enhanced: Modal accessibility
  readonly accessibilityViewIsModal?: boolean;
  readonly accessibilityLabel: string; // Required for modals
  readonly onAccessibilityEscape?: () => void;

  // Fixed: Test infrastructure
  readonly testID: string;
}

/**
 * Enhanced GracePeriodBanner Props with Therapeutic Continuity
 */
export interface EnhancedGracePeriodBannerProps extends GracePeriodBannerProps {
  // Enhanced: Grace period status with complete information
  readonly gracePeriodStatus: EnhancedGracePeriodStatus;

  // Enhanced: Action handlers with proper async support
  readonly onDismiss?: () => void;
  readonly onResolvePayment?: () => void | Promise<void>;
  readonly onExtendGracePeriod?: (reason: string) => void | Promise<void>;
  readonly onContactSupport?: () => void | Promise<void>;

  // Enhanced: Therapeutic messaging configuration
  readonly therapeuticMessaging: boolean; // Required for MBCT compliance
  readonly showTherapeuticReassurance: boolean; // Required for user safety
  readonly customTherapeuticMessage?: string;

  // Enhanced: Visual configuration
  readonly variant?: 'standard' | 'compact' | 'prominent';
  readonly urgencyLevel?: 'low' | 'medium' | 'high';

  // Enhanced: Accessibility with live region support
  readonly accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  readonly accessibilityLabel: string;
}

/**
 * Enhanced WebhookLoadingStates Props with Real-time Updates
 */
export interface EnhancedWebhookLoadingStatesProps extends WebhookLoadingStatesProps {
  // Enhanced: Processing configuration
  readonly showProcessingDetails: boolean; // Required for transparency
  readonly showPerformanceMetrics?: boolean;
  readonly realTimeUpdates?: boolean;

  // Enhanced: Performance monitoring with crisis constraints
  readonly performanceThreshold: number; // Required, default 200ms
  readonly crisisPerformanceThreshold: number; // Required, default 100ms
  readonly onPerformanceViolation: (violation: PerformanceViolation) => void; // Required

  // Enhanced: Loading state configuration
  readonly processingStates?: ReadonlyArray<ProcessingStateConfig>;
  readonly animationDuration?: number;
  readonly autoHideDelay?: number;

  // Enhanced: Crisis safety with mandatory monitoring
  readonly crisisMode?: boolean;
  readonly prioritizeTherapeuticAccess: boolean; // Required for safety
  readonly emergencyFallback?: () => void;

  // Enhanced: Accessibility with announcements
  readonly announceUpdates: boolean; // Required for screen readers
  readonly accessibilityLabel: string;
  readonly accessibilityLiveRegion: 'polite' | 'assertive'; // Required for updates
}

/**
 * Enhanced PaymentStatusDashboard Props with Complete Integration
 */
export interface EnhancedPaymentStatusDashboardProps extends PaymentStatusDashboardProps {
  // Enhanced: Navigation handlers with type safety
  readonly onNavigateToSubscription?: (context: NavigationContext) => void;
  readonly onNavigateToPaymentMethods?: (context: NavigationContext) => void;
  readonly onNavigateToBilling?: (context: NavigationContext) => void;
  readonly onNavigateToSupport?: () => void;

  // Enhanced: Dashboard configuration
  readonly showQuickActions: boolean; // Required for UX consistency
  readonly enableCrisisMode?: boolean;
  readonly showPerformanceMetrics?: boolean;

  // Enhanced: Data refresh capability
  readonly onRefresh?: () => void | Promise<void>;
  readonly refreshInterval?: number;
  readonly autoRefresh?: boolean;

  // Enhanced: Crisis integration
  readonly crisisOverride?: CrisisPaymentOverride | null;
  readonly emergencyContactsAvailable?: boolean;

  // Enhanced: Accessibility navigation
  readonly accessibilityLabel: string;
  readonly accessibilityHint: string; // Required for complex components
}

/**
 * SUPPORTING TYPE DEFINITIONS
 */

export type SubscriptionPlanId = 'basic' | 'premium' | 'premium_monthly' | 'premium_annual' | 'lifetime';

export interface FeatureItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly basicPlan: boolean;
  readonly premiumPlan: boolean;
  readonly therapeuticCore?: boolean;
  readonly crisisProtected?: boolean;
}

export interface ComponentRenderMetrics {
  readonly componentName: string;
  readonly renderTime: number;
  readonly reRenderCount: number;
  readonly propsChangeCount: number;
  readonly timestamp: string;
}

export interface EnhancedPaymentErrorInfo extends PaymentErrorInfo {
  readonly therapeuticMessage: string; // Required for MBCT compliance
  readonly crisisImpactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly recoveryStrategies: ReadonlyArray<ErrorRecoveryStrategy>;
  readonly supportContactInfo?: SupportContactInfo;
  readonly gracePeriodEligible: boolean;
}

export interface ErrorRecoveryStrategy {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly action: () => void | Promise<void>;
  readonly priority: 'primary' | 'secondary' | 'tertiary';
  readonly therapeutic?: boolean;
  readonly estimatedTime?: string;
}

export interface SupportContactInfo {
  readonly available: boolean;
  readonly estimatedResponseTime: string;
  readonly preferredMethod: 'chat' | 'email' | 'phone';
  readonly crisisSupport: boolean;
}

export interface EnhancedGracePeriodStatus {
  readonly active: boolean;
  readonly daysRemaining: number;
  readonly daysRemainingFormatted: string;
  readonly hoursRemaining: number;
  readonly reason: GracePeriodReason;
  readonly therapeuticContinuity: boolean;
  readonly therapeuticContinuityEnabled: boolean;
  readonly totalActivePeriods: number;
  readonly extensionsUsed: number;
  readonly maxExtensions: number;
  readonly urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export type GracePeriodReason =
  | 'payment_failed'
  | 'card_expired'
  | 'insufficient_funds'
  | 'payment_processing_error'
  | 'user_requested'
  | 'crisis_override'
  | 'therapeutic_continuity';

export interface ProcessingStateConfig {
  readonly type: 'idle' | 'processing' | 'success' | 'error' | 'crisis-override';
  readonly message: string;
  readonly subMessage?: string;
  readonly icon?: string;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly duration?: number;
  readonly therapeutic?: boolean;
}

export interface PerformanceViolation {
  readonly component: string;
  readonly operation: string;
  readonly duration: number;
  readonly threshold: number;
  readonly timestamp: string;
  readonly crisisMode: boolean;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface NavigationContext {
  readonly source: string;
  readonly timestamp: string;
  readonly crisisMode?: boolean;
  readonly performanceMetrics?: ComponentRenderMetrics;
}

/**
 * HOOK INTEGRATION VALIDATION
 */

export interface ValidatedPaymentStatusHook extends PaymentStatusHookReturn {
  // Enhanced with validation metadata
  readonly isValid: boolean;
  readonly lastValidated: string;
  readonly validationErrors: ReadonlyArray<string>;

  // Performance tracking
  readonly hookPerformance: {
    readonly executionTime: number;
    readonly staleTime: number;
    readonly cacheHits: number;
  };
}

export interface ValidatedPaymentActionsHook extends PaymentActionsHookReturn {
  // Enhanced with action validation
  readonly actionsValidated: boolean;
  readonly availableActions: ReadonlyArray<string>;
  readonly restrictedActions: ReadonlyArray<string>;

  // Crisis safety validation
  readonly crisisSafetyValidated: boolean;
  readonly emergencyActionsAvailable: boolean;
}

/**
 * COMPONENT COMPOSITION TYPES
 */

export interface PaymentComponentTheme {
  readonly morning: PaymentThemeColors;
  readonly midday: PaymentThemeColors;
  readonly evening: PaymentThemeColors;
}

export interface PaymentThemeColors {
  readonly primary: string;
  readonly secondary: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly therapeutic: string;
  readonly crisis: string;
}

/**
 * ACCESSIBILITY ENHANCEMENT TYPES
 */

export interface EnhancedAccessibilityProps extends AccessibilityProps {
  readonly accessibilityLabel: string; // Always required
  readonly accessibilityHint?: string;
  readonly accessibilityRole: 'button' | 'text' | 'image' | 'header' | 'summary' | 'dialog'; // Required
  readonly accessibilityState?: {
    readonly disabled?: boolean;
    readonly selected?: boolean;
    readonly busy?: boolean;
    readonly expanded?: boolean;
    readonly checked?: boolean | 'mixed';
  };
  readonly accessibilityActions?: ReadonlyArray<AccessibilityAction>;
  readonly accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  readonly importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

export interface AccessibilityAction {
  readonly name: string;
  readonly label: string;
  readonly action: () => void;
}

/**
 * CRISIS SAFETY ENHANCEMENT TYPES
 */

export interface EnhancedCrisisSafeComponent extends CrisisSafeComponent {
  readonly crisisMode?: boolean;
  readonly crisisOverride?: CrisisPaymentOverride | null;
  readonly therapeuticAccessMaintained: boolean;
  readonly emergencyFallbackAvailable: boolean;

  // Enhanced crisis constraints
  readonly maxCrisisResponseTimeMs: 200; // Hard constraint
  readonly therapeuticAccessPriority: 'highest';
  readonly emergencyBypassEnabled: boolean;
  readonly crisisDetectionEnabled: boolean;
  readonly failsafeMode?: boolean;
}

/**
 * PERFORMANCE MONITORING ENHANCEMENT
 */

export interface ComponentPerformanceConfig {
  readonly enableMetrics: boolean;
  readonly performanceThreshold: number;
  readonly crisisPerformanceThreshold: number;
  readonly reportViolations: boolean;
  readonly autoOptimize: boolean;
}

export interface PerformanceOptimizationSuggestion {
  readonly component: string;
  readonly issue: string;
  readonly suggestion: string;
  readonly impact: 'low' | 'medium' | 'high' | 'critical';
  readonly implementation: string;
  readonly estimatedImprovement: string;
}

/**
 * TYPE GUARD FUNCTIONS
 */

export function isPaymentStatusIndicatorProps(props: any): props is EnhancedPaymentStatusIndicatorProps {
  return (
    typeof props === 'object' &&
    props !== null &&
    typeof props.testID === 'string' &&
    typeof props.accessibilityLabel === 'string' &&
    (props.onPress === undefined || typeof props.onPress === 'function') &&
    (props.theme === null || ['morning', 'midday', 'evening'].includes(props.theme))
  );
}

export function isSubscriptionTierDisplayProps(props: any): props is EnhancedSubscriptionTierDisplayProps {
  return (
    typeof props === 'object' &&
    props !== null &&
    (props.onUpgrade === undefined || typeof props.onUpgrade === 'function') &&
    (props.showFeatureComparison === undefined || typeof props.showFeatureComparison === 'boolean')
  );
}

export function isPaymentErrorModalProps(props: any): props is EnhancedPaymentErrorModalProps {
  return (
    typeof props === 'object' &&
    props !== null &&
    typeof props.visible === 'boolean' &&
    typeof props.onClose === 'function' &&
    typeof props.accessibilityLabel === 'string' &&
    typeof props.testID === 'string'
  );
}

export function isGracePeriodBannerProps(props: any): props is EnhancedGracePeriodBannerProps {
  return (
    typeof props === 'object' &&
    props !== null &&
    typeof props.gracePeriodStatus === 'object' &&
    typeof props.therapeuticMessaging === 'boolean' &&
    typeof props.showTherapeuticReassurance === 'boolean' &&
    typeof props.accessibilityLabel === 'string'
  );
}

export function isWebhookLoadingStatesProps(props: any): props is EnhancedWebhookLoadingStatesProps {
  return (
    typeof props === 'object' &&
    props !== null &&
    typeof props.showProcessingDetails === 'boolean' &&
    typeof props.performanceThreshold === 'number' &&
    typeof props.onPerformanceViolation === 'function' &&
    typeof props.prioritizeTherapeuticAccess === 'boolean' &&
    typeof props.announceUpdates === 'boolean' &&
    typeof props.accessibilityLabel === 'string'
  );
}

/**
 * COMPONENT REF TYPES
 */

export interface PaymentStatusIndicatorRef {
  readonly focus: () => void;
  readonly blur: () => void;
  readonly measurePerformance: () => ComponentRenderMetrics;
  readonly triggerCrisisMode: () => void;
}

export interface PaymentErrorModalRef {
  readonly show: () => void;
  readonly hide: () => void;
  readonly focusFirstAction: () => void;
  readonly announceError: (message: string) => void;
}

export interface WebhookLoadingStatesRef {
  readonly startMonitoring: () => void;
  readonly stopMonitoring: () => void;
  readonly getMetrics: () => ComponentRenderMetrics;
  readonly reportViolation: (violation: PerformanceViolation) => void;
}

/**
 * COMPLETE TYPE EXPORTS
 */
export type {
  EnhancedPaymentStatusIndicatorProps,
  EnhancedSubscriptionTierDisplayProps,
  EnhancedPaymentErrorModalProps,
  EnhancedGracePeriodBannerProps,
  EnhancedWebhookLoadingStatesProps,
  EnhancedPaymentStatusDashboardProps,
  SubscriptionPlanId,
  FeatureItem,
  ComponentRenderMetrics,
  EnhancedPaymentErrorInfo,
  ErrorRecoveryStrategy,
  SupportContactInfo,
  EnhancedGracePeriodStatus,
  GracePeriodReason,
  ProcessingStateConfig,
  PerformanceViolation,
  NavigationContext,
  ValidatedPaymentStatusHook,
  ValidatedPaymentActionsHook,
  PaymentComponentTheme,
  PaymentThemeColors,
  EnhancedAccessibilityProps,
  AccessibilityAction,
  EnhancedCrisisSafeComponent,
  ComponentPerformanceConfig,
  PerformanceOptimizationSuggestion,
  PaymentStatusIndicatorRef,
  PaymentErrorModalRef,
  WebhookLoadingStatesRef
};