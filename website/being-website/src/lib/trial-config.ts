/**
 * Being. Trial Configuration Utilities
 * Type-safe helpers for trial configuration management
 */

import { 
  type TrialConfig, 
  type TrialConfigContext, 
  type TrialConfigValidation,
  type CTAVariant,
  type TrialTrackingEvent,
  type ValidationError,
  type ValidationWarning,
  type ClinicalApproval,
  isValidTrialDuration,
  isClinicallyCompliant 
} from '@/types';

// ============================================================================
// TRIAL CONFIGURATION UTILITIES
// ============================================================================

/**
 * Generate trial configuration context for components
 */
export const createTrialContext = (
  config: TrialConfig,
  options: {
    variant?: string;
    personalization?: string;
    sessionId?: string;
    userId?: string;
    experimentId?: string;
  } = {}
): TrialConfigContext => {
  return {
    config,
    variant: options.variant,
    personalization: options.personalization,
    tracking: {
      sessionId: options.sessionId || generateSessionId(),
      userId: options.userId,
      experimentId: options.experimentId
    }
  } as const;
};

/**
 * Generate unique session identifier
 */
export const generateSessionId = (): string => {
  return `trial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Select optimal CTA variant based on context and A/B testing
 */
export const selectCTAVariant = (
  config: TrialConfig,
  context: 'hero' | 'pricing' | 'mobile' | 'all',
  options: {
    abTestEnabled?: boolean;
    userSegment?: string;
    randomSeed?: number;
  } = {}
): CTAVariant | null => {
  const { variants } = config.messaging.cta;
  
  if (!variants || variants.length === 0) {
    return null;
  }

  // Filter variants by context
  const contextVariants = variants.filter(
    variant => variant.context === context || variant.context === 'all'
  );

  if (contextVariants.length === 0) {
    return null;
  }

  // Simple weighted random selection
  const seed = options.randomSeed ?? Math.random();
  let cumulativeWeight = 0;
  
  for (const variant of contextVariants) {
    cumulativeWeight += variant.weight;
    if (seed <= cumulativeWeight) {
      return variant;
    }
  }

  // Fallback to first variant
  return contextVariants[0] || null;
};

/**
 * Get trial messaging based on context and personalization
 */
export const getTrialMessaging = (
  config: TrialConfig,
  context: 'hero' | 'pricing' | 'mobile',
  options: {
    showUrgency?: boolean;
    showSocialProof?: boolean;
    variant?: string;
  } = {}
): {
  primary: string;
  secondary: string;
  cta: string;
  features: string;
  urgency?: string;
  socialProof?: string;
} => {
  const messaging = config.messaging;
  const ctaVariant = selectCTAVariant(config, context);
  
  return {
    primary: messaging.primary,
    secondary: messaging.secondary,
    cta: ctaVariant?.text || messaging.cta.primary,
    features: messaging.features,
    urgency: options.showUrgency && messaging.urgency?.enabled 
      ? messaging.urgency.message 
      : undefined,
    socialProof: options.showSocialProof && messaging.social?.enabled 
      ? messaging.social.recentSignups 
      : undefined
  };
};

/**
 * Format trial duration for display
 */
export const formatTrialDuration = (config: TrialConfig): {
  days: number;
  displayText: string;
  description: string;
} => {
  const { duration } = config;
  
  return {
    days: duration.days,
    displayText: duration.displayText,
    description: `${duration.days} days of complete access to our MBCT program`
  };
};

/**
 * Get trial legal information formatted for display
 */
export const getTrialLegal = (config: TrialConfig): {
  terms: string;
  cancellation: string;
  requirements: string;
  disclaimer: string;
  compliance: string[];
} => {
  const { legal } = config;
  const compliance: string[] = [];
  
  if (legal.compliance.hipaaReady) compliance.push('HIPAA Ready');
  if (legal.compliance.gdprCompliant) compliance.push('GDPR Compliant');
  if (legal.compliance.coppaCompliant) compliance.push('COPPA Compliant');
  
  return {
    terms: legal.terms,
    cancellation: legal.cancellation,
    requirements: legal.requirements,
    disclaimer: legal.compliance.clinicalDisclaimer,
    compliance
  };
};

// ============================================================================
// VALIDATION AND SAFETY
// ============================================================================

/**
 * Comprehensive trial configuration validation
 */
export const validateTrialConfig = (config: TrialConfig): TrialConfigValidation => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Validate duration
  if (!isValidTrialDuration(config.duration)) {
    errors.push({
      field: 'duration.days',
      message: `Trial duration of ${config.duration.days} days is invalid`,
      code: 'INVALID_DURATION'
    });
  }
  
  // Validate clinical compliance
  if (!isClinicallyCompliant(config)) {
    errors.push({
      field: 'legal.compliance',
      message: 'Trial configuration does not meet clinical compliance requirements',
      code: 'CLINICAL_NON_COMPLIANT'
    });
  }
  
  // Validate messaging
  if (config.messaging.primary.length < 10) {
    warnings.push({
      field: 'messaging.primary',
      message: 'Primary message is too short for optimal conversion',
      severity: 'medium',
      suggestion: 'Consider a more descriptive primary message (minimum 10 characters)'
    });
  }
  
  // Validate CTA variants
  if (config.messaging.cta.variants) {
    const totalWeight = config.messaging.cta.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (totalWeight > 1.1) {
      warnings.push({
        field: 'messaging.cta.variants',
        message: 'CTA variant weights exceed 100%',
        severity: 'high',
        suggestion: 'Adjust variant weights to sum to 1.0 or less'
      });
    }
  }
  
  // Clinical approval mock (in real implementation, this would check actual approval status)
  const clinicalApproval: ClinicalApproval = {
    approved: errors.length === 0,
    approvedBy: 'System Validation',
    approvedAt: new Date(),
    mbctCompliant: isClinicallyCompliant(config),
    clinicalReview: true
  };
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    clinicalApproval
  };
};

/**
 * Type guard for validated trial configuration
 */
export const isValidatedTrialConfig = (
  config: TrialConfig
): config is TrialConfig & { __validated: true } => {
  const validation = validateTrialConfig(config);
  return validation.valid && validation.clinicalApproval.approved;
};

// ============================================================================
// TRACKING AND ANALYTICS
// ============================================================================

/**
 * Create trial tracking event
 */
export const createTrialEvent = (
  name: string,
  category: 'trial' | 'conversion' | 'engagement' | 'retention',
  properties: Record<string, string | number | boolean> = {},
  clinicalImportance: 'critical' | 'important' | 'optional' = 'optional'
): TrialTrackingEvent => {
  return {
    name,
    category,
    properties: {
      ...properties,
      timestamp: Date.now(),
      source: 'website'
    },
    clinicalImportance
  };
};

/**
 * Track trial configuration interaction
 */
export const trackTrialInteraction = (
  event: TrialTrackingEvent,
  context: TrialConfigContext
): void => {
  // In real implementation, this would send to analytics service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.name, {
      ...event.properties,
      session_id: context.tracking.sessionId,
      user_id: context.tracking.userId,
      experiment_id: context.tracking.experimentId,
      clinical_importance: event.clinicalImportance
    });
  }
  
  // Console log for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Trial Event:', {
      event,
      context: context.tracking
    });
  }
};

// ============================================================================
// PERFORMANCE OPTIMIZATION
// ============================================================================

/**
 * Memoized trial context creation for performance
 */
const trialContextCache = new Map<string, TrialConfigContext>();

export const createTrialContextMemo = (
  config: TrialConfig,
  options: Parameters<typeof createTrialContext>[1] = {}
): TrialConfigContext => {
  const cacheKey = JSON.stringify({ config: config.duration, options });
  
  if (trialContextCache.has(cacheKey)) {
    return trialContextCache.get(cacheKey)!;
  }
  
  const context = createTrialContext(config, options);
  trialContextCache.set(cacheKey, context);
  
  // Clear cache if it gets too large
  if (trialContextCache.size > 100) {
    trialContextCache.clear();
  }
  
  return context;
};

/**
 * Optimize trial configuration for bundle size
 */
export const getMinimalTrialConfig = (
  config: TrialConfig,
  context: 'hero' | 'pricing' | 'mobile'
): Pick<TrialConfig, 'duration' | 'messaging' | 'legal'> => {
  return {
    duration: config.duration,
    messaging: {
      primary: config.messaging.primary,
      secondary: config.messaging.secondary,
      cta: config.messaging.cta,
      features: config.messaging.features,
      disclaimer: config.messaging.disclaimer,
      benefits: config.messaging.benefits,
      // Include optional fields only if relevant for context
      ...(context === 'hero' && { urgency: config.messaging.urgency }),
      ...(context === 'pricing' && { social: config.messaging.social })
    },
    legal: {
      terms: config.legal.terms,
      cancellation: config.legal.cancellation,
      requirements: config.legal.requirements,
      compliance: config.legal.compliance
    }
  };
};

// ============================================================================
// TYPE EXPORTS FOR EXTERNAL USE
// ============================================================================

// Extend window interface for analytics
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type {
  TrialConfig,
  TrialConfigContext,
  TrialConfigValidation,
  CTAVariant,
  TrialTrackingEvent
} from '@/types';