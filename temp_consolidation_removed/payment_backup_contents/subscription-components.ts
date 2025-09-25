/**
 * Subscription Component Types
 * TypeScript definitions for subscription-related React components
 *
 * Day 17 Phase 4: Type-safe subscription component interfaces
 */

import type { ReactNode, ComponentType } from 'react';
import type {
  SubscriptionState,
  TrialState,
  FeatureAccessResult,
  SubscriptionError,
  SubscriptionTier,
  FeatureGateConfig
} from './subscription';
import type { ViewStyle, TextStyle } from 'react-native';

/**
 * FeatureGateWrapper Component Types
 */
export interface FeatureGateWrapperProps {
  // Core feature gate properties
  featureKey: string;
  children: ReactNode;

  // Fallback rendering
  fallback?: ReactNode;
  loadingComponent?: ComponentType<FeatureGateLoadingProps>;
  errorComponent?: ComponentType<FeatureGateErrorProps>;
  upgradeComponent?: ComponentType<FeatureGateUpgradeProps>;

  // Performance options
  validateOnMount?: boolean;
  cacheValidation?: boolean;
  maxValidationTime?: number; // ms
  timeout?: number; // ms

  // Crisis handling
  allowCrisisOverride?: boolean;
  crisisComponent?: ComponentType<FeatureGateCrisisProps>;
  crisisMessage?: string;

  // Styling
  style?: ViewStyle;
  loadingStyle?: ViewStyle;
  errorStyle?: ViewStyle;

  // Analytics
  trackAccess?: boolean;
  trackDenial?: boolean;
  analyticsMetadata?: Record<string, any>;

  // Callbacks
  onAccessGranted?: (result: FeatureAccessResult) => void;
  onAccessDenied?: (result: FeatureAccessResult) => void;
  onError?: (error: SubscriptionError) => void;
  onUpgradeRequested?: (requiredTier: SubscriptionTier) => void;
}

export interface FeatureGateLoadingProps {
  featureKey: string;
  validationTime?: number;
  style?: ViewStyle;
}

export interface FeatureGateErrorProps {
  featureKey: string;
  error: SubscriptionError;
  retry: () => Promise<void>;
  style?: ViewStyle;
}

export interface FeatureGateUpgradeProps {
  featureKey: string;
  featureName: string;
  currentTier: SubscriptionTier;
  requiredTier: SubscriptionTier;
  accessResult: FeatureAccessResult;
  onUpgrade: () => Promise<void>;
  onCancel?: () => void;
  style?: ViewStyle;
}

export interface FeatureGateCrisisProps {
  featureKey: string;
  crisisMessage?: string;
  onActivateCrisis: () => Promise<void>;
  style?: ViewStyle;
}

/**
 * SubscriptionCard Component Types
 */
export interface SubscriptionCardProps {
  // Subscription data
  subscription: SubscriptionState;
  trial?: TrialState;

  // Display options
  variant?: 'full' | 'compact' | 'minimal';
  showFeatures?: boolean;
  showTrialInfo?: boolean;
  showBilling?: boolean;
  showActions?: boolean;

  // Actions
  onUpgrade?: () => void;
  onManageBilling?: () => void;
  onCancelSubscription?: () => void;
  onExtendTrial?: () => void;

  // Styling
  style?: ViewStyle;
  cardStyle?: ViewStyle;
  titleStyle?: TextStyle;
  contentStyle?: ViewStyle;

  // Crisis mode
  crisisMode?: boolean;
  crisisMessage?: string;

  // Performance
  loading?: boolean;
  error?: SubscriptionError;
}

/**
 * TrialCountdown Component Types
 */
export interface TrialCountdownProps {
  // Trial data
  trial: TrialState;

  // Display options
  format?: 'full' | 'compact' | 'days-only' | 'time-only';
  showExtendOption?: boolean;
  showUpgradePrompt?: boolean;
  urgencyThreshold?: number; // days remaining to show urgency

  // Messaging
  customMessage?: string;
  therapeuticGuidance?: string;
  urgencyMessage?: string;

  // Actions
  onExtend?: (days: number) => Promise<void>;
  onUpgrade?: (tier: SubscriptionTier) => Promise<void>;
  onDismiss?: () => void;

  // Styling
  style?: ViewStyle;
  timerStyle?: TextStyle;
  messageStyle?: TextStyle;
  actionStyle?: ViewStyle;

  // Crisis handling
  allowCrisisExtension?: boolean;
  crisisExtensionDays?: number;
}

/**
 * FeatureList Component Types
 */
export interface FeatureListProps {
  // Feature configuration
  features: string[] | FeatureGateConfig[];
  currentTier: SubscriptionTier;

  // Display options
  variant?: 'grid' | 'list' | 'compact';
  showAccessStatus?: boolean;
  showUpgradePrompts?: boolean;
  groupByCategory?: boolean;

  // Filtering
  showOnlyAccessible?: boolean;
  showOnlyLocked?: boolean;
  categoryFilter?: string[];

  // Actions
  onFeatureSelect?: (featureKey: string) => void;
  onUpgradeRequest?: (featureKey: string, requiredTier: SubscriptionTier) => void;

  // Styling
  style?: ViewStyle;
  itemStyle?: ViewStyle;
  accessibleStyle?: ViewStyle;
  lockedStyle?: ViewStyle;
  categoryStyle?: ViewStyle;

  // Performance
  virtualizeList?: boolean;
  batchValidation?: boolean;
}

export interface FeatureListItemProps {
  featureKey: string;
  config?: FeatureGateConfig;
  accessResult?: FeatureAccessResult;
  currentTier: SubscriptionTier;

  onSelect?: () => void;
  onUpgrade?: () => void;

  style?: ViewStyle;
  accessible?: boolean;
  showDetails?: boolean;
}

/**
 * SubscriptionTierSelector Component Types
 */
export interface SubscriptionTierSelectorProps {
  // Current state
  currentTier: SubscriptionTier;
  inTrial?: boolean;
  trialDaysRemaining?: number;

  // Available tiers
  availableTiers?: SubscriptionTier[];
  recommendedTier?: SubscriptionTier;
  popularTier?: SubscriptionTier;

  // Pricing display
  showMonthlyPricing?: boolean;
  showAnnualPricing?: boolean;
  showSavings?: boolean;
  currency?: string;

  // Trial options
  showTrialOptions?: boolean;
  trialDuration?: number;
  trialEligible?: boolean;

  // Actions
  onTierSelect: (tier: SubscriptionTier) => void;
  onStartTrial?: (tier: SubscriptionTier) => void;
  onCompareFeatures?: (tiers: SubscriptionTier[]) => void;

  // Styling
  style?: ViewStyle;
  tierCardStyle?: ViewStyle;
  selectedTierStyle?: ViewStyle;
  recommendedTierStyle?: ViewStyle;
  titleStyle?: TextStyle;
  priceStyle?: TextStyle;

  // Crisis mode
  crisisMode?: boolean;
  showCrisisMessage?: boolean;
}

export interface TierCardProps {
  tier: SubscriptionTier;
  isSelected: boolean;
  isRecommended?: boolean;
  isPopular?: boolean;
  isCurrent?: boolean;

  pricing: {
    monthly: number;
    annual: number;
    savings: number;
  };

  features: string[];
  therapeuticDescription?: string;

  onSelect: () => void;
  onStartTrial?: () => void;

  style?: ViewStyle;
  showTrial?: boolean;
  trialDuration?: number;
}

/**
 * UpgradePrompt Component Types
 */
export interface UpgradePromptProps {
  // Feature context
  featureKey: string;
  featureName: string;
  featureDescription?: string;

  // Subscription context
  currentTier: SubscriptionTier;
  requiredTier: SubscriptionTier;
  inTrial?: boolean;

  // Display options
  variant?: 'modal' | 'banner' | 'inline' | 'fullscreen';
  showFeatureBenefits?: boolean;
  showPricing?: boolean;
  showTrialOption?: boolean;

  // Messaging
  title?: string;
  message?: string;
  therapeuticGuidance?: string;
  urgencyLevel?: 'low' | 'medium' | 'high';

  // Actions
  onUpgrade: () => Promise<void>;
  onStartTrial?: () => Promise<void>;
  onCancel?: () => void;
  onLearnMore?: () => void;

  // Styling
  style?: ViewStyle;
  modalStyle?: ViewStyle;
  contentStyle?: ViewStyle;
  actionStyle?: ViewStyle;

  // Performance
  animateEntry?: boolean;
  preloadPricing?: boolean;
}

/**
 * PaymentForm Component Types (Enhanced for Crisis Safety)
 */
export interface PaymentFormProps {
  // Subscription context
  selectedTier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  trialDuration?: number;

  // Form behavior
  autoFocus?: boolean;
  validateOnChange?: boolean;
  showSecurityInfo?: boolean;
  enableApplePay?: boolean;
  enableGooglePay?: boolean;

  // Crisis safety
  crisisMode?: boolean;
  crisisPaymentOverride?: boolean;
  emergencyContactRequired?: boolean;

  // Actions
  onPaymentSuccess: (result: any) => Promise<void>;
  onPaymentError: (error: SubscriptionError) => void;
  onCancel?: () => void;

  // Styling
  style?: ViewStyle;
  formStyle?: ViewStyle;
  fieldStyle?: ViewStyle;
  buttonStyle?: ViewStyle;

  // Performance monitoring
  trackFormPerformance?: boolean;
  maxFormSubmissionTime?: number; // ms
}

/**
 * CrisisSubscriptionBanner Component Types
 */
export interface CrisisSubscriptionBannerProps {
  // Crisis context
  crisisMode: boolean;
  overriddenFeatures: string[];
  remainingTime?: number;

  // Display options
  variant?: 'banner' | 'modal' | 'floating';
  showFeatureList?: boolean;
  showExtendOption?: boolean;
  dismissible?: boolean;

  // Actions
  onExtendCrisis?: (additionalTime: number) => Promise<void>;
  onUpgrade?: () => Promise<void>;
  onDismiss?: () => void;

  // Styling
  style?: ViewStyle;
  bannerStyle?: ViewStyle;
  urgentStyle?: ViewStyle;
  messageStyle?: TextStyle;

  // Messaging
  title?: string;
  message?: string;
  therapeuticMessage?: string;
}

/**
 * SubscriptionSettings Component Types
 */
export interface SubscriptionSettingsProps {
  // Current subscription
  subscription: SubscriptionState;
  trial?: TrialState;

  // Settings categories
  showBillingSettings?: boolean;
  showNotificationSettings?: boolean;
  showPrivacySettings?: boolean;
  showDataSettings?: boolean;

  // Actions
  onUpdateSettings: (settings: any) => Promise<void>;
  onCancelSubscription?: () => Promise<void>;
  onPauseSubscription?: () => Promise<void>;
  onReactivateSubscription?: () => Promise<void>;

  // Styling
  style?: ViewStyle;
  sectionStyle?: ViewStyle;
  settingItemStyle?: ViewStyle;

  // Performance
  loading?: boolean;
  error?: SubscriptionError;
}

/**
 * Performance Monitoring Component Types
 */
export interface SubscriptionPerformanceMonitorProps {
  // Monitoring options
  realTimeUpdates?: boolean;
  showMetrics?: boolean;
  showAlerts?: boolean;

  // Display threshold
  showOnlyIssues?: boolean;
  minimumSeverity?: 'info' | 'warning' | 'error' | 'critical';

  // Styling
  style?: ViewStyle;
  metricStyle?: ViewStyle;
  alertStyle?: ViewStyle;

  // Actions
  onOptimize?: () => Promise<void>;
  onClearMetrics?: () => void;
}

/**
 * Component State Types
 */
export interface SubscriptionComponentState {
  // Loading states
  loading: boolean;
  validating: boolean;
  submitting: boolean;

  // Error states
  error: SubscriptionError | null;
  formErrors: Record<string, string>;

  // UI states
  showUpgradePrompt: boolean;
  showTrialExtension: boolean;
  showCrisisMode: boolean;
  selectedTier?: SubscriptionTier;

  // Performance states
  validationTime: number;
  lastUpdate: number;
  cacheHit: boolean;
}

/**
 * Component Action Types
 */
export interface SubscriptionComponentActions {
  // Core actions
  refresh: () => Promise<void>;
  validate: () => Promise<boolean>;
  reset: () => void;

  // Feature actions
  requestFeatureAccess: (featureKey: string) => Promise<FeatureAccessResult>;
  upgradeSubscription: (tier: SubscriptionTier) => Promise<void>;

  // Trial actions
  startTrial: (tier: SubscriptionTier) => Promise<TrialState>;
  extendTrial: (days: number) => Promise<TrialState>;

  // Crisis actions
  activateCrisisMode: () => Promise<void>;
  extendCrisisAccess: (time: number) => Promise<void>;

  // Error handling
  handleError: (error: SubscriptionError) => void;
  clearErrors: () => void;
  retry: () => Promise<void>;
}

/**
 * Component Props Common Interface
 */
export interface BaseSubscriptionComponentProps {
  // Common styling
  style?: ViewStyle;

  // Common behavior
  loading?: boolean;
  error?: SubscriptionError;

  // Common callbacks
  onError?: (error: SubscriptionError) => void;

  // Performance tracking
  trackPerformance?: boolean;
  performanceId?: string;

  // Crisis support
  crisisMode?: boolean;
  crisisSupport?: boolean;
}

/**
 * Theme Integration Types
 */
export interface SubscriptionTheme {
  // Colors
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    crisis: string;

    // Tier-specific colors
    freeTier: string;
    premiumTier: string;
    familyTier: string;
    enterpriseTier: string;
  };

  // Typography
  typography: {
    tier: TextStyle;
    price: TextStyle;
    feature: TextStyle;
    message: TextStyle;
    therapeutic: TextStyle;
  };

  // Spacing
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };

  // Component-specific themes
  components: {
    featureGate: ViewStyle;
    subscriptionCard: ViewStyle;
    trialCountdown: ViewStyle;
    upgradePrompt: ViewStyle;
    crisisBanner: ViewStyle;
  };
}

/**
 * Animation Types
 */
export interface SubscriptionAnimations {
  // Transition animations
  featureGateTransition: {
    duration: number;
    easing: string;
  };

  // Loading animations
  validationSpinner: {
    duration: number;
    iterations: number;
  };

  // State change animations
  tierUpgrade: {
    duration: number;
    delay: number;
  };

  // Crisis mode animations
  crisisActivation: {
    duration: number;
    intensity: number;
  };
}

/**
 * Accessibility Types
 */
export interface SubscriptionAccessibility {
  // Screen reader support
  featureGateAnnouncements: {
    granted: string;
    denied: string;
    loading: string;
    error: string;
  };

  // Focus management
  focusableElements: string[];
  focusOrder: number[];

  // High contrast support
  highContrastColors: Record<string, string>;

  // Haptic feedback
  hapticPatterns: {
    success: string;
    error: string;
    warning: string;
  };
}

// Export statement removed to avoid conflicts - types exported individually at definition

/**
 * Constants for component configuration
 */
export const SUBSCRIPTION_COMPONENT_CONSTANTS = {
  // Default timeouts
  DEFAULT_VALIDATION_TIMEOUT: 5000, // ms
  CRISIS_VALIDATION_TIMEOUT: 1000, // ms

  // Animation durations
  DEFAULT_ANIMATION_DURATION: 300, // ms
  CRISIS_ANIMATION_DURATION: 150, // ms

  // Cache settings
  COMPONENT_CACHE_TTL: 300000, // 5 minutes
  VALIDATION_CACHE_TTL: 180000, // 3 minutes

  // Performance thresholds
  MAX_RENDER_TIME: 16, // ms (60fps)
  MAX_VALIDATION_TIME: 100, // ms
  CRISIS_MAX_RESPONSE_TIME: 200, // ms

  // Error retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // ms

  // Crisis mode settings
  CRISIS_BANNER_AUTO_DISMISS: 30000, // 30 seconds
  CRISIS_EXTENSION_MAX: 86400000, // 24 hours

} as const;

export default {
  SUBSCRIPTION_COMPONENT_CONSTANTS
};