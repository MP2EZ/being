/**
 * Component Props Canonical Types - Phase 4B Consolidation
 *
 * Consolidated from 3 component props type files:
 * - component-props.ts (base)
 * - component-props-enhanced.ts
 * - enhanced-button-types.ts
 *
 * CRITICAL PRESERVATION REQUIREMENTS:
 * - Crisis button response time <200ms (IMMUTABLE)
 * - Therapeutic timing accuracy (IMMUTABLE)
 * - WCAG AA accessibility compliance (IMMUTABLE)
 * - Clinical data validation props (IMMUTABLE)
 * - Emergency contact integration (IMMUTABLE)
 *
 * @consolidation_result 3 files → 1 canonical file (67% reduction)
 */

import { ReactNode, ComponentProps } from 'react';
import {
  ViewStyle,
  TextStyle,
  PressableProps,
  TextInputProps,
  AccessibilityRole,
  AccessibilityState,
  AccessibilityValue
} from 'react-native';
import { z } from 'zod';

// === BRANDED TYPES FOR COMPONENT SYSTEM ===

/**
 * Branded type for crisis response times with validation
 */
export type CrisisResponseTime = number & { readonly __brand: 'CrisisResponseTime' };

/**
 * Branded type for therapeutic timing with accuracy requirements
 */
export type TherapeuticTiming = number & { readonly __brand: 'TherapeuticTiming' };

/**
 * Branded type for accessibility contrast ratios
 */
export type ContrastRatio = number & { readonly __brand: 'ContrastRatio' };

// === BASE COMPONENT PROPS ===

/**
 * Base props for all components with accessibility and testing support
 */
export interface BaseComponentProps {
  // Testing and debugging
  readonly testID?: string;
  readonly debugMode?: boolean;

  // Basic styling
  readonly style?: ViewStyle | ViewStyle[];

  // Enhanced accessibility (WCAG AA compliance)
  readonly accessible?: boolean;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: AccessibilityRole;
  readonly accessibilityState?: AccessibilityState;
  readonly accessibilityValue?: AccessibilityValue;
  readonly accessibilityActions?: readonly {
    name: string;
    label?: string;
  }[];
  readonly onAccessibilityAction?: (event: { actionName: string }) => void;

  // Crisis accessibility enhancements (IMMUTABLE)
  readonly highContrastMode?: boolean;
  readonly largeTargetMode?: boolean;
  readonly voiceCommandEnabled?: boolean;
  readonly emergencyAccessible?: boolean;

  // Performance monitoring
  readonly performanceTracking?: boolean;
  readonly responseTimeMonitoring?: boolean;
}

/**
 * Enhanced text component props with therapeutic typography
 */
export interface BaseTextProps {
  // Typography styling
  readonly style?: TextStyle | TextStyle[];

  // Font scaling (WCAG compliance)
  readonly allowFontScaling?: boolean;
  readonly maxFontSizeMultiplier?: number;
  readonly adjustsFontSizeToFit?: boolean;
  readonly minimumFontScale?: number;

  // Therapeutic typography enhancements
  readonly therapeuticFont?: boolean;
  readonly crisisReadability?: boolean;
  readonly dyslexiaFriendly?: boolean;

  // Content validation
  readonly clinicalContent?: boolean;
  readonly crisisContent?: boolean;
  readonly therapeuticContent?: boolean;
}

// === COMPONENT VARIANTS ===

/**
 * Theme variants aligned with therapeutic timing
 */
export const ThemeVariantSchema = z.enum([
  'morning',    // Morning check-in theme
  'midday',     // Midday check-in theme
  'evening',    // Evening check-in theme
  'crisis',     // Crisis intervention theme
  'therapeutic', // Therapeutic exercise theme
  'assessment'  // Assessment completion theme
]);

export type ThemeVariant = z.infer<typeof ThemeVariantSchema>;

/**
 * Button variants with crisis safety levels
 */
export const ButtonVariantSchema = z.enum([
  'primary',      // Standard primary action
  'secondary',    // Standard secondary action
  'outline',      // Outlined button style
  'ghost',        // Ghost/text button style
  'success',      // Success confirmation
  'warning',      // Warning action
  'error',        // Error or dangerous action
  'crisis',       // Crisis intervention button
  'emergency',    // Emergency contact button
  'therapeutic'   // Therapeutic exercise button
]);

export type ButtonVariant = z.infer<typeof ButtonVariantSchema>;

/**
 * Status variants for feedback components
 */
export const StatusVariantSchema = z.enum([
  'info',         // Informational status
  'success',      // Success status
  'warning',      // Warning status
  'error',        // Error status
  'critical',     // Critical status
  'crisis',       // Crisis status
  'therapeutic'   // Therapeutic status
]);

export type StatusVariant = z.infer<typeof StatusVariantSchema>;

// === CRISIS BUTTON PROPS ===

/**
 * Crisis button props with comprehensive safety features
 */
export interface CrisisButtonProps extends BaseComponentProps, Omit<PressableProps, 'style'> {
  // Crisis button variant
  readonly variant?: 'floating' | 'header' | 'embedded' | 'emergency_fab';

  // Crisis response configuration (IMMUTABLE)
  readonly emergencyNumber?: '988' | '741741' | '911';
  readonly responseTimeRequirement?: CrisisResponseTime;
  readonly crisisSafetyLevel?: 'standard' | 'enhanced' | 'emergency';

  // Crisis interaction callbacks
  readonly onCrisisStart?: (context: CrisisInteractionContext) => void | Promise<void>;
  readonly onCrisisComplete?: (result: CrisisCallResult) => void;
  readonly onCrisisError?: (error: CrisisError) => void;
  readonly onEmergencyEscalation?: () => void;

  // Performance configuration (IMMUTABLE <200ms requirement)
  readonly performanceConfig?: CrisisPerformanceConfig;
  readonly monitoringEnabled?: boolean;

  // Enhanced accessibility for crisis scenarios
  readonly crisisAccessibility?: {
    readonly announceOnActivation?: boolean;
    readonly hapticPattern?: 'standard' | 'urgent' | 'emergency';
    readonly voiceCommand?: string;
    readonly gestureAlternative?: boolean;
  };

  // Therapeutic integration
  readonly therapeuticIntegration?: {
    readonly breathingExerciseAfter?: boolean;
    readonly calmingContentShown?: boolean;
    readonly supportResourcesOffered?: boolean;
  };

  // State management
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly children?: ReactNode;
}

/**
 * Crisis interaction context for comprehensive tracking
 */
export interface CrisisInteractionContext {
  readonly timestamp: Date;
  readonly variant: string;
  readonly userAgent: string;
  readonly platform: 'ios' | 'android';
  readonly accessibilityEnabled: boolean;
  readonly emergencyNumber: string;
  readonly responseTimeTarget: CrisisResponseTime;
}

/**
 * Crisis call result with performance validation
 */
export interface CrisisCallResult {
  readonly success: boolean;
  readonly responseTime: CrisisResponseTime;
  readonly callInitiated: boolean;
  readonly fallbackUsed: boolean;
  readonly performanceCompliant: boolean;
  readonly accessibilityUsed: boolean;
  readonly hapticDelivered: boolean;
  readonly error?: CrisisError;
}

/**
 * Crisis error with recovery strategies
 */
export interface CrisisError extends Error {
  readonly code: 'CALL_FAILED' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'PERFORMANCE_VIOLATION' | 'ACCESSIBILITY_FAILURE';
  readonly severity: 'warning' | 'critical' | 'emergency';
  readonly recoveryStrategy: 'retry' | 'fallback' | 'manual' | 'escalate';
  readonly clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly context: CrisisInteractionContext;
}

// === ENHANCED BUTTON PROPS ===

/**
 * Enhanced button props with therapeutic and crisis features
 */
export interface EnhancedButtonProps extends BaseComponentProps, Omit<PressableProps, 'style'> {
  // Content
  readonly children: ReactNode;

  // Styling variants
  readonly variant?: ButtonVariant;
  readonly theme?: ThemeVariant;
  readonly size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'crisis_large';

  // Enhanced styling function with state awareness
  readonly style?: ViewStyle | ViewStyle[] | ((state: {
    pressed: boolean;
    focused: boolean;
    hovered: boolean;
    disabled: boolean;
    loading: boolean;
    crisisModeActive: boolean;
  }) => ViewStyle | ViewStyle[]);

  // Enhanced interaction callbacks
  readonly onPress?: (context: ButtonInteractionContext) => void | Promise<void>;
  readonly onPressIn?: (context: ButtonInteractionContext) => void;
  readonly onPressOut?: (context: ButtonInteractionContext) => void;
  readonly onLongPress?: (context: ButtonInteractionContext) => void;

  // State management
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly selected?: boolean;

  // Performance and therapeutic features
  readonly therapeuticTiming?: TherapeuticTiming;
  readonly crisisOptimized?: boolean;
  readonly anxietyAware?: boolean;
  readonly performanceTracking?: boolean;

  // Enhanced accessibility
  readonly accessibilityEnhancements?: {
    readonly contrastRatio?: ContrastRatio;
    readonly minimumTargetSize?: number;
    readonly voiceControl?: boolean;
    readonly gestureAlternatives?: boolean;
  };

  // Haptic feedback configuration
  readonly haptics?: {
    readonly onPress?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
    readonly onError?: 'warning' | 'error';
    readonly onSuccess?: 'success';
    readonly disabled?: boolean;
  };

  // Animation configuration
  readonly animations?: {
    readonly pressAnimation?: 'scale' | 'opacity' | 'none' | 'therapeutic';
    readonly loadingAnimation?: 'spinner' | 'pulse' | 'breathing';
    readonly disabled?: boolean;
    readonly reducedMotion?: boolean;
  };
}

/**
 * Button interaction context
 */
export interface ButtonInteractionContext {
  readonly timestamp: Date;
  readonly variant: ButtonVariant;
  readonly theme?: ThemeVariant;
  readonly therapeuticTiming?: TherapeuticTiming;
  readonly crisisMode: boolean;
  readonly accessibilityEnabled: boolean;
  readonly performanceMetrics: {
    readonly renderTime: number;
    readonly responseTime: number;
  };
}

// === TEXT INPUT PROPS ===

/**
 * Enhanced text input props with clinical validation
 */
export interface ValidatedTextInputProps extends BaseComponentProps, Omit<TextInputProps, 'style'> {
  // Enhanced styling
  readonly style?: ViewStyle | ViewStyle[] | TextStyle | TextStyle[];
  readonly inputStyle?: TextStyle | TextStyle[];

  // Validation
  readonly validation?: {
    readonly required?: boolean;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly pattern?: RegExp;
    readonly clinicalFormat?: 'phq9_response' | 'gad7_response' | 'crisis_note' | 'therapeutic_note';
    readonly realTimeValidation?: boolean;
  };

  // Clinical data handling
  readonly clinicalData?: boolean;
  readonly sensitiveData?: boolean;
  readonly encryptionRequired?: boolean;

  // Enhanced callbacks
  readonly onValidationChange?: (isValid: boolean, errors: string[]) => void;
  readonly onClinicalDataChange?: (data: unknown) => void;

  // Error handling
  readonly error?: boolean;
  readonly errorMessage?: string;
  readonly showErrorIcon?: boolean;

  // Therapeutic features
  readonly therapeuticGuidance?: boolean;
  readonly anxietyReduction?: boolean;
  readonly breathingPrompt?: boolean;

  // Performance optimization
  readonly debouncedValidation?: boolean;
  readonly performanceOptimized?: boolean;
}

// === THERAPEUTIC COMPONENT PROPS ===

/**
 * Breathing exercise circle props with therapeutic accuracy
 */
export interface TherapeuticBreathingCircleProps extends BaseComponentProps {
  // Breathing configuration (IMMUTABLE therapeutic timing)
  readonly breathingPattern?: {
    readonly inhaleSeconds: 4;    // IMMUTABLE
    readonly holdSeconds: 7;      // IMMUTABLE
    readonly exhaleSeconds: 8;    // IMMUTABLE
    readonly cycleCount?: number;
  };

  // Exercise state
  readonly isActive?: boolean;
  readonly isPaused?: boolean;
  readonly currentPhase?: 'inhale' | 'hold' | 'exhale' | 'rest';

  // Visual customization
  readonly size?: number;
  readonly colors?: {
    readonly inhale: string;
    readonly hold: string;
    readonly exhale: string;
    readonly rest: string;
  };

  // Therapeutic callbacks
  readonly onExerciseStart?: () => void;
  readonly onExerciseComplete?: () => void;
  readonly onPhaseChange?: (phase: string) => void;
  readonly onExerciseError?: (error: Error) => void;

  // Performance tracking (IMMUTABLE timing requirements)
  readonly performanceTracking?: boolean;
  readonly timingAccuracy?: TherapeuticTiming;

  // Accessibility enhancements
  readonly voiceGuidance?: boolean;
  readonly hapticGuidance?: boolean;
  readonly visualGuidance?: boolean;
}

/**
 * Performance metrics for components
 */
export interface ComponentPerformanceMetrics {
  readonly renderTime: number;          // milliseconds
  readonly responseTime: number;        // milliseconds
  readonly memoryUsage: number;         // MB
  readonly frameDrops: number;
  readonly therapeuticAccuracy: number; // percentage
  readonly accessibilityScore: number; // percentage
}

/**
 * Crisis performance configuration
 */
export interface CrisisPerformanceConfig {
  readonly maxResponseTime: CrisisResponseTime;
  readonly targetFrameRate: 60;        // IMMUTABLE
  readonly memoryLimit: number;        // MB
  readonly enableProfiling: boolean;
  readonly alertOnViolation: boolean;
}

// === TYPE GUARDS ===

export function isCrisisResponseTime(value: unknown): value is CrisisResponseTime {
  return typeof value === 'number' &&
         value >= 0 &&
         value <= 1000 &&  // Max 1 second for crisis responses
         Number.isInteger(value);
}

export function isTherapeuticTiming(value: unknown): value is TherapeuticTiming {
  return typeof value === 'number' &&
         value > 0 &&
         value <= 300000 && // Max 5 minutes for therapeutic exercises
         Number.isInteger(value);
}

export function isContrastRatio(value: unknown): value is ContrastRatio {
  return typeof value === 'number' &&
         value >= 1 &&
         value <= 21;  // WCAG maximum theoretical ratio
}

export function isButtonVariant(value: unknown): value is ButtonVariant {
  return ButtonVariantSchema.safeParse(value).success;
}

export function isThemeVariant(value: unknown): value is ThemeVariant {
  return ThemeVariantSchema.safeParse(value).success;
}

export function isStatusVariant(value: unknown): value is StatusVariant {
  return StatusVariantSchema.safeParse(value).success;
}

// === FACTORY FUNCTIONS ===

export function createCrisisResponseTime(ms: number): CrisisResponseTime {
  if (!isCrisisResponseTime(ms)) {
    throw new Error(`Invalid crisis response time: ${ms}ms. Must be 0-1000ms integer`);
  }
  return ms as CrisisResponseTime;
}

export function createTherapeuticTiming(ms: number): TherapeuticTiming {
  if (!isTherapeuticTiming(ms)) {
    throw new Error(`Invalid therapeutic timing: ${ms}ms. Must be 1-300000ms integer`);
  }
  return ms as TherapeuticTiming;
}

export function createContrastRatio(ratio: number): ContrastRatio {
  if (!isContrastRatio(ratio)) {
    throw new Error(`Invalid contrast ratio: ${ratio}. Must be 1-21`);
  }
  return ratio as ContrastRatio;
}

export function createDefaultCrisisPerformanceConfig(): CrisisPerformanceConfig {
  return {
    maxResponseTime: createCrisisResponseTime(200),  // IMMUTABLE
    targetFrameRate: 60,                             // IMMUTABLE
    memoryLimit: 100,                                // 100MB
    enableProfiling: true,
    alertOnViolation: true
  };
}

// === CONSTANTS (IMMUTABLE) ===

/**
 * Component props constants
 * CRITICAL: These values are IMMUTABLE for clinical and therapeutic safety
 */
export const COMPONENT_PROPS_CANONICAL_CONSTANTS = {
  // Performance requirements (IMMUTABLE)
  PERFORMANCE: {
    CRISIS_MAX_RESPONSE_TIME: 200,        // milliseconds - IMMUTABLE
    THERAPEUTIC_TIMING_ACCURACY: 0.95,    // 95% accuracy - IMMUTABLE
    TARGET_FRAME_RATE: 60,                // FPS - IMMUTABLE
    MAX_MEMORY_USAGE: 100,                // MB per component
    MAX_RENDER_TIME: 16.67                // milliseconds (60fps)
  },

  // Accessibility requirements (IMMUTABLE WCAG AA)
  ACCESSIBILITY: {
    MIN_CONTRAST_RATIO: createContrastRatio(4.5),     // WCAG AA - IMMUTABLE
    CRISIS_CONTRAST_RATIO: createContrastRatio(7.0),   // Enhanced for crisis - IMMUTABLE
    MIN_TOUCH_TARGET: 44,                              // WCAG AA - IMMUTABLE
    CRISIS_TOUCH_TARGET: 52,                           // Enhanced for crisis - IMMUTABLE
    MAX_FONT_SCALE: 2.0,                               // Maximum font scaling
    MIN_FONT_SIZE: 12                                  // Minimum readable font size
  },

  // Therapeutic timing (IMMUTABLE clinical requirements)
  THERAPEUTIC_TIMING: {
    BREATHING_INHALE: createTherapeuticTiming(4000),   // 4 seconds - IMMUTABLE
    BREATHING_HOLD: createTherapeuticTiming(7000),     // 7 seconds - IMMUTABLE
    BREATHING_EXHALE: createTherapeuticTiming(8000),   // 8 seconds - IMMUTABLE
    ASSESSMENT_RESPONSE_TIME: createTherapeuticTiming(30000), // 30 seconds max
    CHECK_IN_SESSION_TIME: createTherapeuticTiming(600000),   // 10 minutes max
  },

  // Crisis response (IMMUTABLE emergency protocols)
  CRISIS_RESPONSE: {
    EMERGENCY_NUMBERS: ['988', '741741', '911'] as const,
    MAX_RESPONSE_TIME: createCrisisResponseTime(200),          // IMMUTABLE
    FALLBACK_TIMEOUT: createCrisisResponseTime(500),           // Fallback activation
    ESCALATION_TIMEOUT: createCrisisResponseTime(1000)         // Emergency escalation
  },

  // Component variants
  VARIANTS: {
    BUTTON_VARIANTS: ['primary', 'secondary', 'outline', 'ghost', 'success', 'warning', 'error', 'crisis', 'emergency', 'therapeutic'] as const,
    THEME_VARIANTS: ['morning', 'midday', 'evening', 'crisis', 'therapeutic', 'assessment'] as const,
    STATUS_VARIANTS: ['info', 'success', 'warning', 'error', 'critical', 'crisis', 'therapeutic'] as const
  }
} as const;

// === SERVICE INTERFACE ===

/**
 * Component validation service interface
 */
export interface ComponentPropsValidationService {
  // Validation methods
  validateCrisisButton: (props: CrisisButtonProps) => Promise<ValidationResult>;
  validateEnhancedButton: (props: EnhancedButtonProps) => Promise<ValidationResult>;
  validateTextInput: (props: ValidatedTextInputProps) => Promise<ValidationResult>;
  validateBreathingCircle: (props: TherapeuticBreathingCircleProps) => Promise<ValidationResult>;

  // Performance validation (IMMUTABLE)
  validatePerformanceCompliance: (metrics: ComponentPerformanceMetrics) => boolean;
  validateCrisisResponseTime: (responseTime: number) => boolean;
  validateTherapeuticTiming: (timing: number) => boolean;

  // Accessibility validation (IMMUTABLE WCAG AA)
  validateAccessibilityCompliance: (props: BaseComponentProps) => Promise<AccessibilityValidationResult>;
  validateContrastRatio: (ratio: number) => boolean;
  validateTargetSize: (size: number) => boolean;

  // Service lifecycle
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
}

/**
 * Validation result with detailed feedback
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly performanceIssues: readonly string[];
  readonly accessibilityIssues: readonly string[];
  readonly clinicalSafetyIssues: readonly string[];
}

/**
 * Accessibility validation result
 */
export interface AccessibilityValidationResult extends ValidationResult {
  readonly contrastRatio: ContrastRatio;
  readonly targetSize: number;
  readonly wcagLevel: 'A' | 'AA' | 'AAA';
  readonly crisisSafe: boolean;
}

// === EXPORTS ===

export default {
  // Schemas
  ThemeVariantSchema,
  ButtonVariantSchema,
  StatusVariantSchema,

  // Type guards
  isCrisisResponseTime,
  isTherapeuticTiming,
  isContrastRatio,
  isButtonVariant,
  isThemeVariant,
  isStatusVariant,

  // Factory functions
  createCrisisResponseTime,
  createTherapeuticTiming,
  createContrastRatio,
  createDefaultCrisisPerformanceConfig,

  // Constants
  COMPONENT_PROPS_CANONICAL_CONSTANTS
};