/**
 * Being. Trial Configuration Validation
 * Runtime validation and type guards for trial configuration
 */

import { 
  type TrialConfig,
  type TrialConfigValidation,
  type ValidationError,
  type TrialValidationWarning,
  type ClinicalApproval,
  type TrialDuration,
  type TrialMessaging,
  type TrialLegal,
  type CTAVariant
} from '@/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Trial duration validation schema
 */
export const validateTrialDuration = (duration: TrialDuration): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (duration.days <= 0) {
    errors.push({
      field: 'duration.days',
      message: 'Trial duration must be greater than 0',
      code: 'INVALID_DURATION_MIN'
    });
  }

  if (duration.days > 365) {
    errors.push({
      field: 'duration.days',
      message: 'Trial duration cannot exceed 365 days',
      code: 'INVALID_DURATION_MAX'
    });
  }

  if (duration.maxDays && duration.days > duration.maxDays) {
    errors.push({
      field: 'duration.days',
      message: `Trial duration exceeds maximum of ${duration.maxDays} days`,
      code: 'DURATION_EXCEEDS_MAX'
    });
  }

  if (duration.minDays && duration.days < duration.minDays) {
    errors.push({
      field: 'duration.days',
      message: `Trial duration below minimum of ${duration.minDays} days`,
      code: 'DURATION_BELOW_MIN'
    });
  }

  if (!duration.displayText || duration.displayText.trim().length === 0) {
    errors.push({
      field: 'duration.displayText',
      message: 'Display text is required for trial duration',
      code: 'MISSING_DISPLAY_TEXT'
    });
  }

  return errors;
};

/**
 * Trial messaging validation schema
 */
export const validateTrialMessaging = (messaging: TrialMessaging): {
  errors: ValidationError[];
  warnings: TrialValidationWarning[];
} => {
  const errors: ValidationError[] = [];
  const warnings: TrialValidationWarning[] = [];

  // Primary message validation
  if (!messaging.primary || messaging.primary.trim().length === 0) {
    errors.push({
      field: 'messaging.primary',
      message: 'Primary message is required',
      code: 'MISSING_PRIMARY_MESSAGE'
    });
  } else if (messaging.primary.length < 10) {
    warnings.push({
      field: 'messaging.primary',
      message: 'Primary message is quite short',
      severity: 'medium',
      suggestion: 'Consider a more descriptive primary message for better conversion'
    });
  } else if (messaging.primary.length > 100) {
    warnings.push({
      field: 'messaging.primary',
      message: 'Primary message is very long',
      severity: 'low',
      suggestion: 'Consider shortening for better readability'
    });
  }

  // Secondary message validation
  if (!messaging.secondary || messaging.secondary.trim().length === 0) {
    warnings.push({
      field: 'messaging.secondary',
      message: 'Secondary message adds conversion value',
      severity: 'low',
      suggestion: 'Consider adding a secondary message to support the primary'
    });
  }

  // CTA validation
  if (!messaging.cta.primary || messaging.cta.primary.trim().length === 0) {
    errors.push({
      field: 'messaging.cta.primary',
      message: 'Primary CTA text is required',
      code: 'MISSING_CTA_PRIMARY'
    });
  }

  // CTA variants validation
  if (messaging.cta.variants) {
    const totalWeight = messaging.cta.variants.reduce((sum, variant) => sum + variant.weight, 0);
    
    if (totalWeight > 1.1) {
      warnings.push({
        field: 'messaging.cta.variants',
        message: 'CTA variant weights exceed 100%',
        severity: 'high',
        suggestion: 'Reduce variant weights to sum to 1.0 or less'
      });
    }

    if (totalWeight < 0.5) {
      warnings.push({
        field: 'messaging.cta.variants',
        message: 'CTA variant weights are very low',
        severity: 'medium',
        suggestion: 'Consider increasing variant weights for better A/B test coverage'
      });
    }

    // Validate individual variants
    messaging.cta.variants.forEach((variant, index) => {
      if (!variant.id || variant.id.trim().length === 0) {
        errors.push({
          field: `messaging.cta.variants[${index}].id`,
          message: 'CTA variant ID is required',
          code: 'MISSING_VARIANT_ID'
        });
      }

      if (!variant.text || variant.text.trim().length === 0) {
        errors.push({
          field: `messaging.cta.variants[${index}].text`,
          message: 'CTA variant text is required',
          code: 'MISSING_VARIANT_TEXT'
        });
      }

      if (variant.weight <= 0 || variant.weight > 1) {
        errors.push({
          field: `messaging.cta.variants[${index}].weight`,
          message: 'CTA variant weight must be between 0 and 1',
          code: 'INVALID_VARIANT_WEIGHT'
        });
      }
    });
  }

  // Features validation
  if (!messaging.features || messaging.features.trim().length === 0) {
    warnings.push({
      field: 'messaging.features',
      message: 'Features text helps with conversion',
      severity: 'medium',
      suggestion: 'Consider adding feature highlights for better conversion'
    });
  }

  // Disclaimer validation
  if (!messaging.disclaimer || messaging.disclaimer.trim().length === 0) {
    warnings.push({
      field: 'messaging.disclaimer',
      message: 'Legal disclaimer recommended for healthcare apps',
      severity: 'high',
      suggestion: 'Add appropriate medical/clinical disclaimer'
    });
  }

  // Benefits validation
  if (!messaging.benefits || messaging.benefits.length === 0) {
    warnings.push({
      field: 'messaging.benefits',
      message: 'Benefit list improves conversion rates',
      severity: 'medium',
      suggestion: 'Add specific benefits users will experience'
    });
  } else if (messaging.benefits.length > 5) {
    warnings.push({
      field: 'messaging.benefits',
      message: 'Many benefits may overwhelm users',
      severity: 'low',
      suggestion: 'Consider focusing on top 3-5 most compelling benefits'
    });
  }

  return { errors, warnings };
};

/**
 * Trial legal validation schema
 */
export const validateTrialLegal = (legal: TrialLegal): {
  errors: ValidationError[];
  warnings: TrialValidationWarning[];
} => {
  const errors: ValidationError[] = [];
  const warnings: TrialValidationWarning[] = [];

  // Required fields
  if (!legal.terms || legal.terms.trim().length === 0) {
    errors.push({
      field: 'legal.terms',
      message: 'Trial terms are required',
      code: 'MISSING_LEGAL_TERMS'
    });
  }

  if (!legal.cancellation || legal.cancellation.trim().length === 0) {
    errors.push({
      field: 'legal.cancellation',
      message: 'Cancellation policy is required',
      code: 'MISSING_CANCELLATION_POLICY'
    });
  }

  if (!legal.requirements || legal.requirements.trim().length === 0) {
    errors.push({
      field: 'legal.requirements',
      message: 'Trial requirements are required',
      code: 'MISSING_TRIAL_REQUIREMENTS'
    });
  }

  // Compliance validation
  const { compliance } = legal;
  
  if (!compliance.clinicalDisclaimer || compliance.clinicalDisclaimer.trim().length === 0) {
    errors.push({
      field: 'legal.compliance.clinicalDisclaimer',
      message: 'Clinical disclaimer is required for healthcare apps',
      code: 'MISSING_CLINICAL_DISCLAIMER'
    });
  }

  if (!compliance.hipaaReady) {
    warnings.push({
      field: 'legal.compliance.hipaaReady',
      message: 'HIPAA readiness recommended for healthcare apps',
      severity: 'high',
      suggestion: 'Ensure HIPAA compliance for handling health data'
    });
  }

  if (!compliance.gdprCompliant) {
    warnings.push({
      field: 'legal.compliance.gdprCompliant',
      message: 'GDPR compliance required for EU users',
      severity: 'high',
      suggestion: 'Implement GDPR compliance for international users'
    });
  }

  return { errors, warnings };
};

// ============================================================================
// COMPREHENSIVE VALIDATION
// ============================================================================

/**
 * Comprehensive trial configuration validation
 */
export const validateTrialConfigComprehensive = (config: TrialConfig): TrialConfigValidation => {
  const allErrors: ValidationError[] = [];
  const allWarnings: TrialValidationWarning[] = [];

  // Validate duration
  const durationErrors = validateTrialDuration(config.duration);
  allErrors.push(...durationErrors);

  // Validate messaging
  const messagingValidation = validateTrialMessaging(config.messaging);
  allErrors.push(...messagingValidation.errors);
  allWarnings.push(...messagingValidation.warnings);

  // Validate legal
  const legalValidation = validateTrialLegal(config.legal);
  allErrors.push(...legalValidation.errors);
  allWarnings.push(...legalValidation.warnings);

  // Cross-field validation
  if (config.duration.days === 21 && !config.messaging.primary.includes('21')) {
    allWarnings.push({
      field: 'messaging.primary',
      message: 'Primary message should mention 21-day trial duration',
      severity: 'medium',
      suggestion: 'Include "21-day" in primary message for consistency'
    });
  }

  if (config.messaging.cta.primary.toLowerCase().includes('free') && 
      !config.messaging.features.toLowerCase().includes('free')) {
    allWarnings.push({
      field: 'messaging.features',
      message: 'Features should emphasize "free" when CTA mentions it',
      severity: 'low',
      suggestion: 'Add "free" to features description for consistency'
    });
  }

  // Clinical approval
  const clinicalApproval: ClinicalApproval = {
    approved: allErrors.length === 0,
    approvedBy: 'TypeScript Validation System',
    approvedAt: new Date(),
    mbctCompliant: config.legal.compliance.clinicalDisclaimer.length > 0,
    clinicalReview: allErrors.length === 0 && allWarnings.filter(w => w.severity === 'high').length === 0
  };

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    clinicalApproval
  };
};

// ============================================================================
// RUNTIME TYPE GUARDS
// ============================================================================

/**
 * Type guard for valid CTA variant
 */
export const isValidCTAVariant = (variant: unknown): variant is CTAVariant => {
  if (typeof variant !== 'object' || variant === null) return false;
  
  const v = variant as Record<string, unknown>;
  
  return (
    typeof v.id === 'string' &&
    typeof v.text === 'string' &&
    typeof v.variant === 'string' &&
    ['primary', 'secondary', 'outline', 'ghost'].includes(v.variant as string) &&
    typeof v.weight === 'number' &&
    v.weight > 0 &&
    v.weight <= 1 &&
    typeof v.context === 'string' &&
    ['hero', 'pricing', 'mobile', 'all'].includes(v.context as string)
  );
};

/**
 * Type guard for valid trial duration
 */
export const isValidTrialDurationStrict = (duration: unknown): duration is TrialDuration => {
  if (typeof duration !== 'object' || duration === null) return false;
  
  const d = duration as Record<string, unknown>;
  
  return (
    typeof d.days === 'number' &&
    d.days > 0 &&
    d.days <= 365 &&
    typeof d.displayText === 'string' &&
    d.displayText.trim().length > 0 &&
    (d.maxDays === undefined || (typeof d.maxDays === 'number' && d.maxDays >= d.days)) &&
    (d.minDays === undefined || (typeof d.minDays === 'number' && d.minDays <= d.days))
  );
};

/**
 * Type guard for complete trial configuration
 */
export const isCompleteTrialConfig = (config: unknown): config is TrialConfig => {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as Record<string, unknown>;
  
  return (
    isValidTrialDurationStrict(c['duration']) &&
    typeof c['messaging'] === 'object' &&
    c['messaging'] !== null &&
    typeof c['legal'] === 'object' &&
    c['legal'] !== null &&
    typeof c['features'] === 'object' &&
    c['features'] !== null &&
    typeof c['conversion'] === 'object' &&
    c['conversion'] !== null
  );
};

// ============================================================================
// PERFORMANCE VALIDATION
// ============================================================================

/**
 * Performance-oriented validation for components
 */
export const validateTrialConfigPerformance = (config: TrialConfig): {
  bundleSizeImpact: 'low' | 'medium' | 'high';
  runtimeComplexity: 'low' | 'medium' | 'high';
  suggestions: string[];
} => {
  let bundleSizeImpact: 'low' | 'medium' | 'high' = 'low';
  let runtimeComplexity: 'low' | 'medium' | 'high' = 'low';
  const suggestions: string[] = [];

  // Bundle size analysis
  const variantCount = config.messaging.cta.variants?.length || 0;
  if (variantCount > 5) {
    bundleSizeImpact = 'high';
    suggestions.push('Consider reducing CTA variants to 3-5 for optimal bundle size');
  } else if (variantCount > 2) {
    bundleSizeImpact = 'medium';
  }

  const benefitCount = config.messaging.benefits.length;
  if (benefitCount > 10) {
    bundleSizeImpact = bundleSizeImpact === 'high' ? 'high' : 'medium';
    suggestions.push('Consider reducing benefit list for better performance');
  }

  // Runtime complexity analysis
  const trackingEventCount = config.conversion.tracking.events.length;
  if (trackingEventCount > 10) {
    runtimeComplexity = 'high';
    suggestions.push('Consider reducing tracking events for better runtime performance');
  } else if (trackingEventCount > 5) {
    runtimeComplexity = 'medium';
  }

  const abTestCount = config.conversion.optimization.abTesting.tests.length;
  if (abTestCount > 3) {
    runtimeComplexity = runtimeComplexity === 'high' ? 'high' : 'medium';
    suggestions.push('Multiple A/B tests increase runtime complexity');
  }

  return {
    bundleSizeImpact,
    runtimeComplexity,
    suggestions
  };
};

// ============================================================================
// EXPORT VALIDATION UTILITIES
// ============================================================================

export { validateTrialConfigComprehensive as default };