/**
 * FullMind Component Type Extensions for Trial Configuration
 * Enhanced prop types for trial-aware components
 */

import { 
  type BaseComponentProps, 
  type TrialConfigContext, 
  type TrialTrackingEvent,
  type MaybeWithTrialConfig,
  type WithTrialConfig
} from '@/types';

// ============================================================================
// ENHANCED COMPONENT PROP TYPES
// ============================================================================

/**
 * Enhanced Hero component props with trial configuration
 */
export interface EnhancedHeroProps extends BaseComponentProps, MaybeWithTrialConfig {
  className?: string;
  variant?: 'default' | 'clinical' | 'therapist' | 'trial-focused';
  showPhoneMockup?: boolean;
  trialVariant?: 'default' | 'urgent' | 'social-proof' | 'minimal';
  'data-testid'?: string;
}

/**
 * Enhanced Pricing component props with trial integration
 */
export interface EnhancedPricingProps extends BaseComponentProps, MaybeWithTrialConfig {
  className?: string;
  variant?: 'default' | 'compact' | 'detailed' | 'trial-emphasized';
  showAnnualDiscount?: boolean;
  highlightTrial?: boolean;
  'data-testid'?: string;
}

/**
 * Enhanced Mobile CTA Bar props with trial awareness
 */
export interface EnhancedMobileCTABarProps extends BaseComponentProps, MaybeWithTrialConfig {
  className?: string;
  variant?: 'download' | 'crisis' | 'simple' | 'trial-focused';
  showOnScroll?: boolean;
  threshold?: number;
  trialEmphasis?: boolean;
  'data-testid'?: string;
}

/**
 * Trial-specific CTA button props
 */
export interface TrialCTAProps extends BaseComponentProps, WithTrialConfig {
  context: 'hero' | 'pricing' | 'mobile';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'auto' | 'primary' | 'secondary' | 'outline' | 'ghost';
  showUrgency?: boolean;
  showSocialProof?: boolean;
  onTrialStart?: (event: TrialTrackingEvent) => void;
}

/**
 * Trial messaging component props
 */
export interface TrialMessagingProps extends BaseComponentProps, WithTrialConfig {
  context: 'hero' | 'pricing' | 'mobile';
  variant?: 'full' | 'minimal' | 'benefits-only';
  showFeatures?: boolean;
  showLegal?: boolean;
  showDisclaimer?: boolean;
}

/**
 * Trial progress indicator props
 */
export interface TrialProgressProps extends BaseComponentProps, WithTrialConfig {
  currentDay?: number;
  totalDays?: number;
  showMilestones?: boolean;
  variant?: 'linear' | 'circular' | 'steps';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Trial feature list props
 */
export interface TrialFeatureListProps extends BaseComponentProps, WithTrialConfig {
  variant?: 'compact' | 'detailed' | 'clinical';
  showClinicalValue?: boolean;
  showAccessLevel?: boolean;
  maxFeatures?: number;
}

// ============================================================================
// COMPONENT STATE TYPES
// ============================================================================

/**
 * Trial-aware component state
 */
export interface TrialComponentState {
  readonly trialContext: TrialConfigContext;
  readonly isTrialActive: boolean;
  readonly trialDaysRemaining: number;
  readonly hasTrialStarted: boolean;
  readonly lastInteraction?: Date;
}

/**
 * Trial CTA button state
 */
export interface TrialCTAState extends TrialComponentState {
  readonly selectedVariant?: string;
  readonly isLoading: boolean;
  readonly hasClicked: boolean;
  readonly clickCount: number;
}

/**
 * Trial messaging state
 */
export interface TrialMessagingState extends TrialComponentState {
  readonly showUrgency: boolean;
  readonly showSocialProof: boolean;
  readonly urgencyThreshold: number;
  readonly socialProofEnabled: boolean;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * useTrial hook return type
 */
export interface UseTrialReturn {
  readonly config: TrialConfigContext;
  readonly messaging: {
    readonly primary: string;
    readonly secondary: string;
    readonly cta: string;
    readonly features: string;
    readonly urgency?: string;
    readonly socialProof?: string;
  };
  readonly legal: {
    readonly terms: string;
    readonly cancellation: string;
    readonly requirements: string;
    readonly disclaimer: string;
    readonly compliance: string[];
  };
  readonly duration: {
    readonly days: number;
    readonly displayText: string;
    readonly description: string;
  };
  readonly tracking: {
    readonly trackEvent: (event: TrialTrackingEvent) => void;
    readonly trackInteraction: (interaction: string) => void;
    readonly trackConversion: (type: string) => void;
  };
}

/**
 * useTrialCTA hook return type
 */
export interface UseTrialCTAReturn {
  readonly variant: string;
  readonly text: string;
  readonly isLoading: boolean;
  readonly handleClick: () => void;
  readonly trackClick: () => void;
}

/**
 * useTrialMessaging hook return type
 */
export interface UseTrialMessagingReturn {
  readonly primary: string;
  readonly secondary: string;
  readonly features: string;
  readonly urgency?: string;
  readonly socialProof?: string;
  readonly showUrgency: boolean;
  readonly showSocialProof: boolean;
  readonly toggleUrgency: () => void;
  readonly toggleSocialProof: () => void;
}

// ============================================================================
// EVENT HANDLER TYPES
// ============================================================================

/**
 * Trial event handler type
 */
export type TrialEventHandler = (event: TrialTrackingEvent) => void | Promise<void>;

/**
 * Trial interaction handler type  
 */
export type TrialInteractionHandler = (
  interaction: string,
  context: TrialConfigContext
) => void | Promise<void>;

/**
 * Trial conversion handler type
 */
export type TrialConversionHandler = (
  type: 'started' | 'completed' | 'converted' | 'abandoned',
  data: Record<string, unknown>
) => void | Promise<void>;

// ============================================================================
// CONTEXT PROVIDER TYPES
// ============================================================================

/**
 * Trial configuration provider props
 */
export interface TrialConfigProviderProps {
  readonly children: React.ReactNode;
  readonly config: TrialConfigContext;
  readonly onEvent?: TrialEventHandler;
  readonly onInteraction?: TrialInteractionHandler;
  readonly onConversion?: TrialConversionHandler;
}

/**
 * Trial configuration context value
 */
export interface TrialConfigContextValue {
  readonly config: TrialConfigContext;
  readonly state: TrialComponentState;
  readonly actions: {
    readonly updateConfig: (config: Partial<TrialConfigContext>) => void;
    readonly trackEvent: TrialEventHandler;
    readonly trackInteraction: TrialInteractionHandler;
    readonly trackConversion: TrialConversionHandler;
  };
}

// ============================================================================
// VALIDATION AND ERROR TYPES
// ============================================================================

/**
 * Component validation error
 */
export interface ComponentValidationError {
  readonly component: string;
  readonly prop: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
}

/**
 * Trial component validation result
 */
export interface TrialComponentValidation {
  readonly valid: boolean;
  readonly errors: readonly ComponentValidationError[];
  readonly warnings: readonly ComponentValidationError[];
  readonly suggestions: readonly string[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract trial props from component props
 */
export type ExtractTrialProps<T> = T extends WithTrialConfig<infer U> ? U : never;

/**
 * Make trial props optional
 */
export type OptionalTrialProps<T extends WithTrialConfig> = Omit<T, 'trialConfig'> & MaybeWithTrialConfig;

/**
 * Trial-aware component factory type
 */
export type TrialAwareComponent<P extends BaseComponentProps> = React.FC<P & MaybeWithTrialConfig>;

/**
 * Trial-required component factory type
 */
export type TrialRequiredComponent<P extends BaseComponentProps> = React.FC<P & WithTrialConfig>;

// ============================================================================
// PERFORMANCE OPTIMIZATION TYPES
// ============================================================================

/**
 * Memoized trial component props
 */
export interface MemoizedTrialProps {
  readonly configHash: string;
  readonly propsHash: string;
  readonly lastUpdate: number;
}

/**
 * Trial component performance metrics
 */
export interface TrialComponentMetrics {
  readonly renderTime: number;
  readonly configLoadTime: number;
  readonly interactionLatency: number;
  readonly memoryUsage: number;
}

// ============================================================================
// A/B TESTING TYPES
// ============================================================================

/**
 * A/B test variant assignment for components
 */
export interface ComponentABTestVariant {
  readonly experimentId: string;
  readonly variantId: string;
  readonly variantName: string;
  readonly allocation: number;
  readonly active: boolean;
}

/**
 * A/B test context for trial components
 */
export interface TrialABTestContext {
  readonly experiments: readonly ComponentABTestVariant[];
  readonly activeVariant?: ComponentABTestVariant;
  readonly controlGroup: boolean;
  readonly experimentConfig: Record<string, unknown>;
}

// ============================================================================
// ACCESSIBILITY TYPES
// ============================================================================

/**
 * Trial component accessibility configuration
 */
export interface TrialAccessibilityConfig {
  readonly announceTrialStart: boolean;
  readonly announceTrialProgress: boolean;
  readonly highContrastSupport: boolean;
  readonly screenReaderOptimized: boolean;
  readonly keyboardNavigationEnabled: boolean;
  readonly focusManagement: 'auto' | 'manual' | 'disabled';
}

/**
 * Accessible trial component props
 */
export interface AccessibleTrialProps extends BaseComponentProps {
  readonly accessibility?: TrialAccessibilityConfig;
  readonly ariaLabel?: string;
  readonly ariaDescription?: string;
  readonly role?: string;
  readonly tabIndex?: number;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Re-export from main types
  TrialConfigContext,
  TrialTrackingEvent,
  WithTrialConfig,
  MaybeWithTrialConfig
} from '@/types';