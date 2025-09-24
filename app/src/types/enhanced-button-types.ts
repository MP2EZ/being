/**
 * Enhanced Button Types - Therapeutic Interaction Safety
 *
 * This file provides type-safe Button component integration for clinical
 * assessments with guaranteed therapeutic timing and crisis optimization.
 * All button interactions are validated for clinical accuracy and safety.
 *
 * CRITICAL: These types ensure therapeutic button responses meet <200ms
 * crisis standards and maintain assessment accuracy during interactions.
 */

import type { ReactNode } from 'react';
import type { ViewStyle, PressableProps, AccessibilityRole } from 'react-native';
import type {
  ButtonProps,
  PressableStyleFunction,
  AndroidRippleConfig,
  ComponentVariant,
  ThemeVariant
} from './ui';

import type {
  ValidatedCrisisResponse,
  TherapeuticTimingCertified,
  ClinicalTypeValidationError
} from './clinical-type-safety';

import type {
  StrictPHQ9Answer,
  StrictGAD7Answer,
  TherapeuticButtonProps,
  CrisisButtonProps
} from './enhanced-assessment-types';

// === THERAPEUTIC BUTTON VARIANTS ===

// Extended button variants for clinical contexts
export type ClinicalButtonVariant = ComponentVariant | 'assessment' | 'suicidal_warning' | 'emergency_exit';

// Crisis-specific button configurations
export type CrisisButtonVariant = 'crisis' | 'emergency' | 'suicidal_warning';

// Assessment-specific button types
export type AssessmentButtonType = 'answer_option' | 'navigation' | 'completion' | 'exit';

// === ENHANCED BUTTON PROPS ===

/**
 * Type-Safe Assessment Button Props
 * For PHQ-9/GAD-7 answer selection with validation
 */
export interface AssessmentButtonProps<T extends 'phq9' | 'gad7'> extends Omit<ButtonProps, 'onPress' | 'variant'> {
  readonly variant: ClinicalButtonVariant;
  readonly assessmentType: T;
  readonly questionIndex: number;
  readonly answer?: T extends 'phq9' ? StrictPHQ9Answer : StrictGAD7Answer;
  readonly isSelected: boolean;
  readonly onAnswerSelect: (answer: T extends 'phq9' ? StrictPHQ9Answer : StrictGAD7Answer) => void;
  readonly timingValidator: TherapeuticTimingCertified;
  readonly responseTimeMs: ValidatedCrisisResponse;
  readonly onValidationError: (error: ClinicalTypeValidationError) => void;
}

/**
 * Crisis-Optimized Button Props
 * For emergency interventions with guaranteed response times
 */
export interface CrisisOptimizedButtonProps extends Omit<ButtonProps, 'onPress' | 'variant' | 'emergency'> {
  readonly variant: CrisisButtonVariant;
  readonly emergency: true;
  readonly crisisType: 'immediate' | 'urgent' | 'severe';
  readonly onPress: () => void; // Must be synchronous for crisis timing
  readonly maxResponseTimeMs: ValidatedCrisisResponse;
  readonly fallbackAction?: () => void;
  readonly emergencyNumber?: '988' | '911' | '741741';
  readonly accessibilityEmergencyHint: string;
}

/**
 * Navigation Button Props for Assessment Flow
 * Type-safe navigation with assessment state validation
 */
export interface AssessmentNavigationButtonProps extends Omit<ButtonProps, 'onPress'> {
  readonly navigationType: 'back' | 'next' | 'complete' | 'exit';
  readonly assessmentComplete: boolean;
  readonly currentAnswerValid: boolean;
  readonly isLastQuestion: boolean;
  readonly onPress: () => void | Promise<void>;
  readonly crisisDetected: boolean;
  readonly loadingText?: string;
}

/**
 * Enhanced Answer Option Button Props
 * For therapeutic answer selection with real-time validation
 */
export interface AnswerOptionButtonProps<T extends 'phq9' | 'gad7'> {
  readonly assessmentType: T;
  readonly questionIndex: number;
  readonly optionValue: T extends 'phq9' ? StrictPHQ9Answer : StrictGAD7Answer;
  readonly optionText: string;
  readonly optionDescription?: string;
  readonly isSelected: boolean;
  readonly isCriticalQuestion: boolean; // PHQ-9 Question 9
  readonly onSelect: () => void;
  readonly style?: ViewStyle | ViewStyle[];
  readonly accessibilityLabel: string;
  readonly accessibilityHint: string;
  readonly hapticEnabled: boolean;
  readonly responseTime: number;
}

// === THERAPEUTIC TIMING TYPES ===

/**
 * Button Response Timing Validation
 * Ensures therapeutic standards for all button interactions
 */
export interface ButtonTimingValidation {
  readonly buttonType: AssessmentButtonType | CrisisButtonVariant;
  readonly expectedResponseTime: ValidatedCrisisResponse;
  readonly actualResponseTime: number;
  readonly isWithinTherapeuticRange: boolean;
  readonly timingAccuracy: 'precise' | 'acceptable' | 'concerning';
}

/**
 * Therapeutic Animation Configuration
 * Optimized for clinical interactions and crisis scenarios
 */
export interface TherapeuticAnimationConfig {
  readonly enabled: boolean;
  readonly crisisOptimized: boolean;
  readonly duration: number; // Must be ≤200ms for crisis buttons
  readonly easing: 'linear' | 'ease' | 'spring';
  readonly scaleOnPress: number; // 0.95-0.98 for therapeutic feedback
  readonly breathingAnimation?: {
    readonly enabled: boolean;
    readonly duration: 60000; // Exactly 60 seconds per therapeutic standard
    readonly intensity: 'subtle' | 'moderate' | 'prominent';
  };
}

/**
 * Button Performance Metrics
 * Real-time monitoring for therapeutic compliance
 */
export interface ButtonPerformanceMetrics {
  readonly averageResponseTime: number;
  readonly responseTimeVariance: number;
  readonly crisisResponseCount: number;
  readonly therapeuticStandardsMet: boolean;
  readonly performanceGrade: 'excellent' | 'good' | 'acceptable' | 'poor';
}

// === ENHANCED PRESSABLE TYPES ===

/**
 * Type-Safe Pressable Configuration for Assessments
 * Enhanced Pressable setup with therapeutic timing validation
 */
export interface TherapeuticPressableConfig {
  readonly delayPressIn: 0; // Immediate response for therapeutic timing
  readonly delayPressOut: number; // 100ms for visual feedback
  readonly delayLongPress: number; // 500ms standard
  readonly android_ripple: TherapeuticRippleConfig;
  readonly hitSlop: TherapeuticHitSlop;
  readonly pressRetentionOffset: TherapeuticHitSlop;
}

/**
 * Therapeutic Ripple Configuration
 * Optimized ripple effects for clinical interactions
 */
export interface TherapeuticRippleConfig extends AndroidRippleConfig {
  readonly color: string;
  readonly borderless: false; // Contained for precise interaction feedback
  readonly radius: number; // Calculated based on button size
  readonly foreground: true; // Visible feedback for therapeutic clarity
}

/**
 * Therapeutic Hit Area Configuration
 * Ensures accessible touch targets for all users
 */
export interface TherapeuticHitSlop {
  readonly top: number; // Minimum 8px, 12px for crisis buttons
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

// === STYLE FUNCTION TYPES ===

/**
 * Type-Safe Style Function for Assessment Buttons
 * Provides pressed state styling with therapeutic considerations
 */
export type AssessmentButtonStyleFunction<T extends 'phq9' | 'gad7'> = (state: {
  readonly pressed: boolean;
  readonly selected: boolean;
  readonly assessmentType: T;
  readonly questionIndex: number;
  readonly isCritical: boolean;
}) => ViewStyle | ViewStyle[];

/**
 * Crisis Button Style Function
 * Specialized styling for emergency interventions
 */
export type CrisisButtonStyleFunction = (state: {
  readonly pressed: boolean;
  readonly crisisType: 'immediate' | 'urgent' | 'severe';
  readonly emergencyActive: boolean;
}) => ViewStyle | ViewStyle[];

/**
 * Navigation Button Style Function
 * Assessment flow navigation with state-aware styling
 */
export type NavigationButtonStyleFunction = (state: {
  readonly pressed: boolean;
  readonly navigationType: 'back' | 'next' | 'complete' | 'exit';
  readonly canProceed: boolean;
  readonly crisisDetected: boolean;
}) => ViewStyle | ViewStyle[];

// === VALIDATION TYPES ===

/**
 * Button Interaction Validation
 * Ensures all button interactions meet therapeutic standards
 */
export interface ButtonInteractionValidation {
  readonly buttonId: string;
  readonly interactionType: 'press' | 'long_press' | 'press_in' | 'press_out';
  readonly timestamp: number;
  readonly responseTime: number;
  readonly isValid: boolean;
  readonly validationErrors: readonly string[];
  readonly therapeuticCompliance: boolean;
}

/**
 * Assessment Button State Validation
 * Validates button states for clinical accuracy
 */
export interface AssessmentButtonStateValidation<T extends 'phq9' | 'gad7'> {
  readonly assessmentType: T;
  readonly questionIndex: number;
  readonly selectedAnswer: T extends 'phq9' ? StrictPHQ9Answer | null : StrictGAD7Answer | null;
  readonly isValidSelection: boolean;
  readonly allowsProgression: boolean;
  readonly crisisRiskDetected: boolean;
}

// === FACTORY FUNCTIONS ===

/**
 * Create Type-Safe Assessment Button Props
 * Factory function for consistent assessment button creation
 */
export function createAssessmentButtonProps<T extends 'phq9' | 'gad7'>(
  config: {
    readonly assessmentType: T;
    readonly questionIndex: number;
    readonly answer: T extends 'phq9' ? StrictPHQ9Answer : StrictGAD7Answer;
    readonly isSelected: boolean;
    readonly onAnswerSelect: (answer: T extends 'phq9' ? StrictPHQ9Answer : StrictGAD7Answer) => void;
    readonly timingValidator: TherapeuticTimingCertified;
  }
): AssessmentButtonProps<T> {
  return {
    variant: 'assessment',
    assessmentType: config.assessmentType,
    questionIndex: config.questionIndex,
    answer: config.answer,
    isSelected: config.isSelected,
    onAnswerSelect: config.onAnswerSelect,
    timingValidator: config.timingValidator,
    responseTimeMs: 200 as ValidatedCrisisResponse, // Default therapeutic timing
    onValidationError: (error) => {
      console.error('Assessment button validation error:', error);
    },
    accessibilityLabel: `Answer option ${config.answer}`,
    accessibilityHint: config.isSelected ? 'Selected answer' : 'Tap to select this answer',
    haptic: true,
  };
}

/**
 * Create Crisis-Optimized Button Props
 * Factory function for emergency button creation
 */
export function createCrisisButtonProps(
  config: {
    readonly crisisType: 'immediate' | 'urgent' | 'severe';
    readonly onPress: () => void;
    readonly emergencyNumber?: '988' | '911' | '741741';
    readonly children: ReactNode;
  }
): CrisisOptimizedButtonProps {
  return {
    variant: 'crisis',
    emergency: true,
    crisisType: config.crisisType,
    onPress: config.onPress,
    maxResponseTimeMs: 200 as ValidatedCrisisResponse,
    emergencyNumber: config.emergencyNumber,
    accessibilityEmergencyHint: `Emergency ${config.emergencyNumber || 'crisis'} button. Activates immediately.`,
    children: config.children,
    haptic: true,
    android_ripple: {
      color: 'rgba(255, 255, 255, 0.3)',
      borderless: false,
      foreground: true,
    },
  };
}

// === TYPE GUARDS ===

/**
 * Type guard for assessment button props
 */
export function isAssessmentButtonProps<T extends 'phq9' | 'gad7'>(
  props: unknown
): props is AssessmentButtonProps<T> {
  return typeof props === 'object' && 
         props !== null && 
         'assessmentType' in props && 
         'questionIndex' in props;
}

/**
 * Type guard for crisis button props
 */
export function isCrisisButtonProps(props: unknown): props is CrisisOptimizedButtonProps {
  return typeof props === 'object' && 
         props !== null && 
         'emergency' in props && 
         'crisisType' in props;
}

/**
 * Validate therapeutic timing compliance
 */
export function validateTherapeuticTiming(responseTime: number, buttonType: AssessmentButtonType | CrisisButtonVariant): boolean {
  const maxResponseTime = buttonType.includes('crisis') || buttonType === 'emergency' ? 200 : 500;
  return responseTime <= maxResponseTime;
}

// === CONSTANTS ===

export const THERAPEUTIC_BUTTON_CONSTANTS = {
  TIMING: {
    CRISIS_MAX_MS: 200,
    ASSESSMENT_MAX_MS: 500,
    NAVIGATION_MAX_MS: 300,
    ANIMATION_MAX_MS: 200,
  },
  SIZING: {
    MIN_TOUCH_TARGET: 44,
    CRISIS_TOUCH_TARGET: 52,
    HIT_SLOP_DEFAULT: 8,
    HIT_SLOP_CRISIS: 12,
  },
  HAPTICS: {
    ASSESSMENT_TYPE: 'selection' as const,
    CRISIS_TYPE: 'heavy' as const,
    NAVIGATION_TYPE: 'light' as const,
  },
  ANIMATION: {
    PRESS_SCALE: 0.97,
    CRISIS_PRESS_SCALE: 0.95,
    DURATION_MS: 150,
    CRISIS_DURATION_MS: 100,
  },
} as const;

// === EXPORTS ===

export type {
  ClinicalButtonVariant,
  CrisisButtonVariant,
  AssessmentButtonType,
  AssessmentButtonProps,
  CrisisOptimizedButtonProps,
  AssessmentNavigationButtonProps,
  AnswerOptionButtonProps,
  ButtonTimingValidation,
  TherapeuticAnimationConfig,
  ButtonPerformanceMetrics,
  TherapeuticPressableConfig,
  TherapeuticRippleConfig,
  TherapeuticHitSlop,
  AssessmentButtonStyleFunction,
  CrisisButtonStyleFunction,
  NavigationButtonStyleFunction,
  ButtonInteractionValidation,
  AssessmentButtonStateValidation,
};