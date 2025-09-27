/**
 * Payment Components Index - WCAG AA Accessible Crisis-Safe Payment UI
 *
 * Exports all payment-related components with crisis safety integration
 * and comprehensive WCAG 2.1 AA accessibility compliance:
 * - CrisisPaymentBanner: Always visible crisis safety banner
 * - PaymentAnxietyDetection: Proactive anxiety detection and support
 * - TherapeuticPaymentMessaging: MBCT-compliant payment messaging with accessibility
 * - AccessiblePaymentForm: WCAG AA compliant payment form
 * - PaymentAccessibilityProvider: Accessibility context and utilities
 *
 * Phase 2 Webhook UI Components:
 * - PaymentStatusIndicator: Visual subscription status indicator
 * - SubscriptionTierDisplay: Comprehensive tier display with upgrade flows
 * - PaymentErrorModal: Therapeutic error handling with recovery actions
 * - GracePeriodBanner: Grace period messaging with therapeutic language
 * - WebhookLoadingStates: Real-time webhook processing states
 *
 * P0-CLOUD Payment Sync Resilience UI Components:
 * - PaymentSyncResilienceUI: Core sync status, error handling, and performance feedback
 * - CrisisSafetyPaymentUI: Crisis-safe payment access and protection
 * - AccessibilityPaymentUI: Advanced accessibility features for payment sync
 * - PaymentSyncResilienceDashboard: Comprehensive dashboard integration
 */

export { default as CrisisPaymentBanner } from './CrisisPaymentBanner';
export { default as PaymentAnxietyDetection } from './PaymentAnxietyDetection';
export { default as TherapeuticPaymentMessaging } from './TherapeuticPaymentMessaging';

// Phase 2 Webhook UI Components
export { PaymentStatusIndicator } from './PaymentStatusIndicator';
export { SubscriptionTierDisplay } from './SubscriptionTierDisplay';
export { PaymentErrorModal } from './PaymentErrorModal';
export { GracePeriodBanner } from './GracePeriodBanner';
export { WebhookLoadingStates } from './WebhookLoadingStates';

// P0-CLOUD Payment Sync Resilience UI Components
export {
  PaymentSyncStatus,
  PaymentErrorHandling,
  PaymentPerformanceFeedback
} from './PaymentSyncResilienceUI';

export {
  CrisisSafetyIndicator,
  ProtectedCrisisButton,
  TherapeuticSessionProtection,
  EmergencyHotlineAccess
} from './CrisisSafetyPaymentUI';

export {
  AccessiblePaymentAnnouncements,
  HighContrastPaymentStatus,
  HapticPaymentFeedback,
  VoiceControlPaymentInterface
} from './AccessibilityPaymentUI';

export {
  PaymentSyncResilienceDashboard,
  CompactPaymentResilienceDashboard
} from './PaymentSyncResilienceDashboard';

// Re-export accessibility-enhanced components
export {
  PaymentAccessibilityProvider,
  usePaymentAccessibility,
  AccessiblePaymentForm,
  PaymentAccessibilityOverlay,
  ACCESSIBILITY_CONSTANTS,
  ACCESSIBILITY_COLORS,
  validateAccessibility,
} from '../accessibility';

// Type exports for component integration
export type {
  CrisisPaymentBannerProps,
} from './CrisisPaymentBanner';

export type {
  PaymentAnxietyDetectionProps,
} from './PaymentAnxietyDetection';

export type {
  TherapeuticPaymentMessagingProps,
} from './TherapeuticPaymentMessaging';

// Phase 2 Webhook UI Component Types
export type { PaymentStatusIndicatorProps } from './PaymentStatusIndicator';
export type { SubscriptionTierDisplayProps } from './SubscriptionTierDisplay';
export type { PaymentErrorModalProps } from './PaymentErrorModal';
export type { GracePeriodBannerProps } from './GracePeriodBanner';
export type { WebhookLoadingStatesProps } from './WebhookLoadingStates';

// P0-CLOUD Payment Sync Resilience UI Component Types
export type {
  PaymentSyncStatusProps,
  PaymentErrorHandlingProps,
  PaymentPerformanceFeedbackProps
} from './PaymentSyncResilienceUI';

export type {
  CrisisSafetyIndicatorProps,
  ProtectedCrisisButtonProps,
  TherapeuticSessionProtectionProps,
  EmergencyHotlineAccessProps
} from './CrisisSafetyPaymentUI';

export type {
  AccessiblePaymentAnnouncementsProps,
  HighContrastPaymentStatusProps,
  HapticPaymentFeedbackProps,
  VoiceControlPaymentInterfaceProps
} from './AccessibilityPaymentUI';

export type {
  PaymentSyncResilienceDashboardProps,
  CompactPaymentResilienceDashboardProps
} from './PaymentSyncResilienceDashboard';

// Accessibility type exports
export type {
  PaymentFormData,
  AccessiblePaymentFormProps,
} from '../accessibility';