/**
 * Accessibility Components Index
 * Enhanced therapeutic accessibility for mental health applications
 */

// Core Accessibility Provider
export {
  TherapeuticAccessibilityProvider,
  useTherapeuticAccessibility,
  default as AccessibilityProvider
} from './TherapeuticAccessibilityProvider';

// Enhanced Therapeutic Components
export {
  AccessibleBreathingCircle,
  default as EnhancedBreathingCircle
} from './AccessibleBreathingCircle';

export {
  AccessibleCrisisButton,
  default as EnhancedCrisisButton
} from './AccessibleCrisisButton';

export {
  AccessibleAssessmentFlow,
  default as EnhancedAssessmentFlow
} from './AccessibleAssessmentFlow';

// Existing Enhanced Components (re-export with accessibility)
export {
  PaymentAccessibilityProvider,
  usePaymentAccessibility
} from './PaymentAccessibilityProvider';

// Default configurations for different user needs
export const AccessibilityConfigs = {
  // Standard mental health app accessibility
  standard: {
    crisisButtonSize: 'medium' as const,
    crisisResponseTime: 200,
    anxietyLevelSupport: 'mild' as const,
    depressionSupportLevel: 'standard' as const,
    minimumTouchTargetSize: 48,
    breathingExercisesPacing: 'standard' as const,
    assessmentTimeouts: 30,
  },

  // Enhanced for anxiety disorders
  anxiety: {
    crisisButtonSize: 'large' as const,
    crisisResponseTime: 150,
    anxietyLevelSupport: 'severe' as const,
    depressionSupportLevel: 'enhanced' as const,
    minimumTouchTargetSize: 72,
    breathingExercisesPacing: 'anxiety' as const,
    assessmentTimeouts: 60,
    traumaInformedInteractions: true,
    animationSpeed: 'slow' as const,
  },

  // Enhanced for depression support
  depression: {
    crisisButtonSize: 'large' as const,
    crisisResponseTime: 200,
    anxietyLevelSupport: 'moderate' as const,
    depressionSupportLevel: 'enhanced' as const,
    minimumTouchTargetSize: 56,
    breathingExercisesPacing: 'standard' as const,
    assessmentTimeouts: 45,
    encouragementFrequency: 'enhanced' as const,
    maximumFontScaleMultiplier: 2.0,
  },

  // Emergency/Crisis mode
  crisis: {
    crisisButtonSize: 'emergency' as const,
    crisisResponseTime: 100,
    anxietyLevelSupport: 'severe' as const,
    depressionSupportLevel: 'enhanced' as const,
    minimumTouchTargetSize: 96,
    breathingExercisesPacing: 'anxiety' as const,
    assessmentTimeouts: 120,
    traumaInformedInteractions: true,
    emergencyVoiceCommands: ['emergency help', 'crisis support', 'need help', 'call 988'],
  },
};

// Utility functions for accessibility management
export const AccessibilityUtils = {
  // Calculate appropriate touch target size based on user state
  getTouchTargetSize: (
    baseSize: number,
    anxietyLevel: 'mild' | 'moderate' | 'severe' = 'mild',
    isCrisis: boolean = false
  ): number => {
    let multiplier = 1;

    if (isCrisis) multiplier = 2.0;
    else if (anxietyLevel === 'severe') multiplier = 1.6;
    else if (anxietyLevel === 'moderate') multiplier = 1.3;
    else if (anxietyLevel === 'mild') multiplier = 1.1;

    return Math.max(baseSize * multiplier, 44); // WCAG AA minimum
  },

  // Get appropriate animation duration based on accessibility needs
  getAnimationDuration: (
    baseDuration: number,
    reducedMotion: boolean = false,
    anxietyAdaptations: boolean = false
  ): number => {
    if (reducedMotion) return 0;
    if (anxietyAdaptations) return baseDuration * 1.5;
    return baseDuration;
  },

  // Determine voice command confidence threshold based on context
  getVoiceConfidenceThreshold: (
    context: 'standard' | 'crisis' | 'assessment' = 'standard'
  ): number => {
    switch (context) {
      case 'crisis':
        return 0.6; // Lower threshold for emergency situations
      case 'assessment':
        return 0.8; // Higher threshold for clinical accuracy
      default:
        return 0.7; // Standard threshold
    }
  },

  // Calculate appropriate timeout based on cognitive load
  getTimeoutDuration: (
    baseTimeout: number,
    cognitiveLevel: 'standard' | 'enhanced' | 'maximum' = 'standard'
  ): number => {
    switch (cognitiveLevel) {
      case 'maximum':
        return baseTimeout * 3;
      case 'enhanced':
        return baseTimeout * 2;
      default:
        return baseTimeout;
    }
  },
};

// Accessibility validation utilities
export const AccessibilityValidation = {
  // Validate touch target size for accessibility
  validateTouchTarget: (width: number, height: number, context: 'standard' | 'crisis' = 'standard'): boolean => {
    const minSize = context === 'crisis' ? 60 : 44; // WCAG AA minimum with crisis enhancement
    return width >= minSize && height >= minSize;
  },

  // Validate text readability
  validateTextReadability: (text: string, maxComplexity: 'simple' | 'moderate' | 'complex' = 'moderate'): boolean => {
    const words = text.split(' ');
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    switch (maxComplexity) {
      case 'simple':
        return avgWordLength <= 5 && words.length <= 15;
      case 'moderate':
        return avgWordLength <= 7 && words.length <= 25;
      default:
        return true;
    }
  },
};

export default {
  // Components
  TherapeuticAccessibilityProvider,
  AccessibleBreathingCircle,
  AccessibleCrisisButton,
  AccessibleAssessmentFlow,

  // Hooks
  useTherapeuticAccessibility,

  // Configurations
  AccessibilityConfigs,

  // Utilities
  AccessibilityUtils,
  AccessibilityValidation,
};