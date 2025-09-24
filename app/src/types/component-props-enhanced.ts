/**
 * Enhanced Component Props Types - Strict TypeScript with Validation
 *
 * Advanced component prop types with runtime validation, performance monitoring,
 * and clinical safety constraints for the Being. MBCT app.
 *
 * CRITICAL: These props ensure type-safe clinical components with 100% accuracy
 */

import type { ReactNode, ComponentProps, RefObject } from 'react';
import type {
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  TextInputProps as RNTextInputProps,
  AnimatedValue,
} from 'react-native';
import type { z } from 'zod';

import type {
  UserID,
  SessionID,
  ISODateString,
  CrisisSeverity,
  RiskLevel,
  DurationMs,
  Percentage,
  ValidationResult,
  DeepReadonly,
} from './core';
import type {
  Assessment,
  AssessmentID,
  PHQ9Answer,
  GAD7Answer,
  PHQ9Score,
  GAD7Score,
  PHQ9Severity,
  GAD7Severity,
} from './clinical';

// === BASE COMPONENT TYPES ===

/**
 * Enhanced base component props with validation
 */
export interface EnhancedBaseProps {
  readonly testID?: string;
  readonly style?: ViewStyle;
  readonly accessible?: boolean;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: string;
  readonly accessibilityState?: {
    readonly disabled?: boolean;
    readonly selected?: boolean;
    readonly checked?: boolean | 'mixed';
    readonly busy?: boolean;
    readonly expanded?: boolean;
  };
  readonly performanceTracking?: {
    readonly enabled: boolean;
    readonly metricName: string;
    readonly onPerformanceUpdate?: (metrics: ComponentPerformanceMetrics) => void;
  };
  readonly validation?: {
    readonly schema?: z.ZodSchema;
    readonly onValidationError?: (errors: ValidationResult['errors']) => void;
  };
}

/**
 * Component performance metrics
 */
export interface ComponentPerformanceMetrics {
  readonly componentName: string;
  readonly renderTime: DurationMs;
  readonly mountTime: DurationMs;
  readonly updateTime: DurationMs;
  readonly memoryUsage: number; // bytes
  readonly reRenderCount: number;
  readonly errorCount: number;
  readonly lastUpdate: ISODateString;
}

/**
 * Enhanced text props with therapeutic considerations
 */
export interface EnhancedTextProps {
  readonly style?: TextStyle;
  readonly allowFontScaling?: boolean;
  readonly maxFontSizeMultiplier?: number;
  readonly adjustsFontSizeToFit?: boolean;
  readonly therapeuticContext?: 'assessment' | 'crisis' | 'practice' | 'educational';
  readonly clinicalAccuracy?: boolean; // Prevents text modification
  readonly readabilityScore?: number; // Flesch-Kincaid grade level
}

// === CRISIS-AWARE COMPONENT PROPS ===

/**
 * Crisis button with emergency response requirements
 */
export interface CrisisButtonProps extends EnhancedBaseProps {
  readonly variant: 'floating' | 'header' | 'embedded' | 'emergency_only';
  readonly onPress: () => Promise<void>;
  readonly emergencyNumber?: '988' | '741741';
  readonly responseTimeTarget: DurationMs; // Must be < 200ms
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly hapticFeedback?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
  readonly crisisContext?: {
    readonly severity: CrisisSeverity;
    readonly trigger: string;
    readonly userId: UserID;
    readonly sessionId?: SessionID;
  };
  readonly performanceRequirements: {
    readonly maxResponseTime: 200; // milliseconds - non-negotiable
    readonly measurePerformance: true;
    readonly failureCallback: (responseTime: DurationMs) => void;
  };
  readonly accessibility: {
    readonly minimumTouchTarget: 52; // pixels - larger than standard
    readonly highContrast: boolean;
    readonly screenReaderOptimized: boolean;
  };
}

/**
 * Enhanced button with clinical safety
 */
export interface EnhancedButtonProps extends EnhancedBaseProps {
  readonly children: ReactNode;
  readonly variant: 'primary' | 'secondary' | 'outline' | 'success' | 'emergency' | 'crisis';
  readonly theme?: 'morning' | 'midday' | 'evening' | null;
  readonly onPress: () => void | Promise<void>;
  readonly disabled?: boolean;
  readonly fullWidth?: boolean;
  readonly loading?: boolean;
  readonly haptic?: boolean;
  readonly emergency?: boolean;
  readonly size: 'small' | 'medium' | 'large';
  readonly icon?: ReactNode;
  readonly iconPosition?: 'left' | 'right';
  readonly clinicalSafety?: {
    readonly preventDoublePress: boolean;
    readonly confirmationRequired?: boolean;
    readonly confirmationMessage?: string;
  };
  readonly performanceRequirements?: {
    readonly maxResponseTime: DurationMs;
    readonly measurePerformance: boolean;
    readonly onSlowResponse?: (responseTime: DurationMs) => void;
  };
}

/**
 * Validated text input with clinical data protection
 */
export interface ValidatedTextInputProps extends EnhancedBaseProps {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly placeholder?: string;
  readonly label?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly multiline?: boolean;
  readonly numberOfLines?: number;
  readonly maxLength?: number;
  readonly variant: 'default' | 'clinical' | 'assessment' | 'crisis_plan';
  readonly validation: {
    readonly schema: z.ZodSchema<string>;
    readonly validateOnChange?: boolean;
    readonly validateOnBlur?: boolean;
    readonly debounceMs?: DurationMs;
  };
  readonly clinicalContext?: {
    readonly dataType: 'pii' | 'phi' | 'assessment_data' | 'crisis_plan';
    readonly encryptionRequired: boolean;
    readonly auditRequired: boolean;
  };
  readonly security?: {
    readonly preventScreenshot: boolean;
    readonly obscureInBackground: boolean;
    readonly autoEncrypt: boolean;
  };
  readonly accessibility?: {
    readonly labelledBy?: string;
    readonly describedBy?: string;
    readonly errorAnnouncement?: boolean;
  };
}

// === ASSESSMENT COMPONENT PROPS ===

/**
 * Type-safe assessment question with validation
 */
export interface TypedAssessmentQuestionProps<T extends 'phq9' | 'gad7'> extends EnhancedBaseProps {
  readonly questionNumber: number;
  readonly questionText: string;
  readonly options: readonly AssessmentOptionProps<T>[];
  readonly selectedValue?: T extends 'phq9' ? PHQ9Answer : GAD7Answer;
  readonly onAnswer: (value: T extends 'phq9' ? PHQ9Answer : GAD7Answer) => void;
  readonly assessmentType: T;
  readonly required: true;
  readonly showProgress?: boolean;
  readonly isLastQuestion?: boolean;
  readonly clinicalAccuracy: {
    readonly preventModification: true;
    readonly validatedText: true;
    readonly clinicallyApproved: true;
  };
  readonly performanceTracking: {
    readonly trackResponseTime: boolean;
    readonly trackHesitation: boolean;
    readonly onResponseMetrics: (metrics: AssessmentResponseMetrics) => void;
  };
}

/**
 * Assessment response performance metrics
 */
export interface AssessmentResponseMetrics {
  readonly questionNumber: number;
  readonly responseTime: DurationMs;
  readonly hesitationCount: number; // Number of times user changed selection
  readonly finalAnswer: PHQ9Answer | GAD7Answer;
  readonly confidence?: Percentage; // If measured
  readonly timestamp: ISODateString;
}

/**
 * Type-safe assessment option
 */
export interface AssessmentOptionProps<T extends 'phq9' | 'gad7'> extends EnhancedBaseProps {
  readonly value: T extends 'phq9' ? PHQ9Answer : GAD7Answer;
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: (value: T extends 'phq9' ? PHQ9Answer : GAD7Answer) => void;
  readonly assessmentType: T;
  readonly clinicalValidation: {
    readonly valueValidated: boolean;
    readonly labelValidated: boolean;
  };
}

/**
 * Assessment progress with strict validation
 */
export interface ValidatedAssessmentProgressProps extends EnhancedBaseProps {
  readonly currentQuestion: number;
  readonly totalQuestions: number;
  readonly assessmentType: 'phq9' | 'gad7';
  readonly canGoBack: boolean;
  readonly canProceed: boolean;
  readonly onBack?: () => void;
  readonly onNext?: () => void;
  readonly showPercentage: boolean;
  readonly validation: {
    readonly questionBounds: { readonly min: 1; readonly max: number };
    readonly preventInvalidNavigation: true;
  };
  readonly clinicalSafety: {
    readonly preventDataLoss: boolean;
    readonly autoSave: boolean;
    readonly recoveryEnabled: boolean;
  };
}

/**
 * Assessment results with crisis detection
 */
export interface CrisisAwareAssessmentResultsProps extends EnhancedBaseProps {
  readonly assessment: Assessment;
  readonly showScore: boolean;
  readonly showSeverity: boolean;
  readonly showRecommendations: boolean;
  readonly onCrisisIntervention?: () => void;
  readonly onComplete: () => void;
  readonly crisisDetection: {
    readonly enabled: true;
    readonly automaticTrigger: boolean;
    readonly responseTimeTarget: 200; // milliseconds
  };
  readonly clinicalValidation: {
    readonly scoreValidated: boolean;
    readonly severityValidated: boolean;
    readonly crisisStatusValidated: boolean;
  };
}

// === THERAPEUTIC COMPONENT PROPS ===

/**
 * Breathing circle with therapeutic timing accuracy
 */
export interface TherapeuticBreathingCircleProps extends EnhancedBaseProps {
  readonly duration: 60000; // Exactly 60 seconds - therapeutic requirement
  readonly onComplete: () => void;
  readonly onStart?: () => void;
  readonly onPause?: () => void;
  readonly variant?: 'morning' | 'midday' | 'evening';
  readonly showTimer: boolean;
  readonly showInstructions: boolean;
  readonly hapticFeedback: boolean;
  readonly therapeuticAccuracy: {
    readonly enforceExactTiming: true;
    readonly targetFPS: 60;
    readonly measureFrameDrops: boolean;
  };
  readonly performanceMonitoring: {
    readonly trackFrameRate: true;
    readonly targetFPS: 60;
    readonly reportPerformance: (metrics: BreathingPerformanceMetrics) => void;
    readonly onPerformanceDegradation: (issue: PerformanceIssue) => void;
  };
  readonly accessibility: {
    readonly alternativeForMotionSensitive: boolean;
    readonly audioGuidanceAvailable: boolean;
    readonly hapticGuidanceAvailable: boolean;
  };
}

/**
 * Breathing performance metrics with therapeutic validation
 */
export interface BreathingPerformanceMetrics {
  readonly averageFPS: number;
  readonly frameDrops: number;
  readonly totalFrames: number;
  readonly actualDuration: DurationMs;
  readonly targetDuration: 60000; // Therapeutic requirement
  readonly timingAccuracy: Percentage;
  readonly memoryUsage: number;
  readonly qualityScore: Percentage; // 0-100
  readonly therapeuticEffectiveness: 'excellent' | 'good' | 'acceptable' | 'poor';
}

/**
 * Performance issue detection
 */
export interface PerformanceIssue {
  readonly type: 'frame_rate' | 'timing_drift' | 'memory_usage' | 'responsiveness';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly value: number;
  readonly threshold: number;
  readonly timestamp: ISODateString;
  readonly impact: 'none' | 'minor' | 'moderate' | 'major' | 'therapeutic_compromise';
  readonly recommendation?: string;
}

// === CHECK-IN COMPONENT PROPS ===

/**
 * Check-in step with type safety
 */
export interface TypedCheckInStepProps extends EnhancedBaseProps {
  readonly step: number;
  readonly totalSteps: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly onNext?: () => void;
  readonly onBack?: () => void;
  readonly onSkip?: () => void;
  readonly canProceed: boolean;
  readonly skipAllowed: boolean;
  readonly progress: Percentage; // 0-100
  readonly checkInType: 'morning' | 'midday' | 'evening';
  readonly validation: {
    readonly stepBounds: { readonly min: 1; readonly max: number };
    readonly progressValidation: boolean;
  };
  readonly dataIntegrity: {
    readonly autoSave: boolean;
    readonly validateOnStep: boolean;
    readonly preventDataLoss: boolean;
  };
}

/**
 * Emotion grid with multi-select validation
 */
export interface ValidatedEmotionGridProps extends EnhancedBaseProps {
  readonly emotions: readonly string[];
  readonly selectedEmotions: readonly string[];
  readonly onSelectionChange: (emotions: readonly string[]) => void;
  readonly maxSelections?: number;
  readonly minSelections?: number;
  readonly required: boolean;
  readonly variant: 'morning' | 'midday' | 'evening';
  readonly validation: {
    readonly emotionListValidated: boolean;
    readonly selectionBoundsValidated: boolean;
  };
  readonly therapeuticContext: {
    readonly trackingEnabled: boolean;
    readonly emotionMapping: Record<string, number>; // Emotion to therapeutic value
  };
}

// === FORM COMPONENT PROPS ===

/**
 * Validated form field with error handling
 */
export interface ValidatedFormFieldProps extends EnhancedBaseProps {
  readonly name: string;
  readonly label?: string;
  readonly children: ReactNode;
  readonly error?: string;
  readonly required: boolean;
  readonly disabled?: boolean;
  readonly helpText?: string;
  readonly validation: {
    readonly schema: z.ZodSchema;
    readonly validateOnChange?: boolean;
    readonly validateOnBlur?: boolean;
  };
  readonly clinicalContext?: {
    readonly fieldType: 'pii' | 'phi' | 'clinical_data' | 'assessment_data';
    readonly sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Multi-select with type constraints
 */
export interface TypedMultiSelectProps<T extends string> extends EnhancedBaseProps {
  readonly options: readonly T[];
  readonly selectedValues: readonly T[];
  readonly onSelectionChange: (values: readonly T[]) => void;
  readonly maxSelections?: number;
  readonly minSelections?: number;
  readonly placeholder?: string;
  readonly searchable?: boolean;
  readonly disabled?: boolean;
  readonly renderOption?: (option: T, selected: boolean) => ReactNode;
  readonly validation: {
    readonly optionsValidated: boolean;
    readonly selectionBoundsValidated: boolean;
  };
}

/**
 * Clinical slider with precision requirements
 */
export interface ClinicalSliderProps extends EnhancedBaseProps {
  readonly value: number;
  readonly onValueChange: (value: number) => void;
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly step: number;
  readonly disabled?: boolean;
  readonly showValue: boolean;
  readonly label?: string;
  readonly unit?: string;
  readonly formatValue?: (value: number) => string;
  readonly clinicalScale: {
    readonly type: 'mood' | 'anxiety' | 'energy' | 'sleep' | 'pain';
    readonly labels: readonly string[];
    readonly therapeuticRange?: { readonly min: number; readonly max: number };
  };
  readonly validation: {
    readonly boundsValidated: boolean;
    readonly stepValidated: boolean;
    readonly clinicallyValid: boolean;
  };
  readonly accessibility: {
    readonly incrementalValues: readonly number[];
    readonly semanticLabels: Record<number, string>;
  };
}

// === MODAL AND OVERLAY PROPS ===

/**
 * Crisis-aware modal with emergency handling
 */
export interface CrisisAwareModalProps extends EnhancedBaseProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly size: 'small' | 'medium' | 'large' | 'fullscreen';
  readonly closeable: boolean;
  readonly overlay: boolean;
  readonly animationType: 'none' | 'slide' | 'fade';
  readonly onShow?: () => void;
  readonly onDismiss?: () => void;
  readonly emergencyContext?: {
    readonly isCrisisModal: boolean;
    readonly emergencyClosePrevention: boolean;
    readonly crisisExitConfirmation: boolean;
  };
  readonly performanceRequirements?: {
    readonly maxOpenTime: DurationMs;
    readonly maxRenderTime: DurationMs;
  };
}

/**
 * Alert with clinical severity handling
 */
export interface ClinicalAlertProps extends EnhancedBaseProps {
  readonly type: 'info' | 'success' | 'warning' | 'error' | 'critical' | 'crisis';
  readonly title?: string;
  readonly message: string;
  readonly visible: boolean;
  readonly onClose?: () => void;
  readonly actions?: readonly ClinicalAlertAction[];
  readonly dismissible: boolean;
  readonly autoClose?: boolean;
  readonly duration?: DurationMs;
  readonly clinicalSeverity?: {
    readonly severity: CrisisSeverity;
    readonly requiresAcknowledgment: boolean;
    readonly escalationRequired: boolean;
  };
  readonly accessibility: {
    readonly announceImmediately: boolean;
    readonly persistentFocus: boolean;
  };
}

/**
 * Clinical alert action with validation
 */
export interface ClinicalAlertAction {
  readonly text: string;
  readonly onPress: () => void | Promise<void>;
  readonly style: 'default' | 'cancel' | 'destructive' | 'emergency';
  readonly disabled?: boolean;
  readonly validation?: {
    readonly confirmationRequired: boolean;
    readonly confirmationMessage?: string;
  };
}

// === PERFORMANCE MONITORING PROPS ===

/**
 * Performance monitor component
 */
export interface PerformanceMonitorProps extends EnhancedBaseProps {
  readonly enabled: boolean;
  readonly targetMetrics: {
    readonly responseTime: DurationMs;
    readonly frameRate: number;
    readonly memoryThreshold: number; // bytes
  };
  readonly onPerformanceIssue: (issue: PerformanceIssue) => void;
  readonly reportInterval: DurationMs;
  readonly criticalThresholds: {
    readonly crisisResponseTime: 200; // milliseconds
    readonly therapeuticFrameRate: 60; // fps
    readonly memoryLimit: number; // bytes
  };
}

// === TYPE GUARDS FOR ENHANCED PROPS ===

/**
 * Type guard for crisis button props
 */
export const isCrisisButtonProps = (props: unknown): props is CrisisButtonProps => {
  return (
    typeof props === 'object' &&
    props !== null &&
    'variant' in props &&
    'responseTimeTarget' in props &&
    'performanceRequirements' in props
  );
};

/**
 * Type guard for therapeutic breathing props
 */
export const isTherapeuticBreathingCircleProps = (
  props: unknown
): props is TherapeuticBreathingCircleProps => {
  return (
    typeof props === 'object' &&
    props !== null &&
    'duration' in props &&
    (props as any).duration === 60000 &&
    'therapeuticAccuracy' in props
  );
};

/**
 * Type guard for validated assessment question props
 */
export const isTypedAssessmentQuestionProps = <T extends 'phq9' | 'gad7'>(
  props: unknown,
  type: T
): props is TypedAssessmentQuestionProps<T> => {
  return (
    typeof props === 'object' &&
    props !== null &&
    'assessmentType' in props &&
    (props as any).assessmentType === type &&
    'clinicalAccuracy' in props &&
    'performanceTracking' in props
  );
};

// === CONSTANTS ===

/**
 * Enhanced component constants
 */
export const ENHANCED_COMPONENT_CONSTANTS = {
  // Touch targets
  TOUCH_TARGET: {
    MIN_SIZE: 44, // WCAG AA minimum
    CRISIS_MIN_SIZE: 52, // Larger for emergency
    THERAPEUTIC_MIN_SIZE: 48, // Therapeutic interactions
  },

  // Animation timing
  ANIMATION: {
    DURATION_SHORT: 200 as DurationMs,
    DURATION_MEDIUM: 300 as DurationMs,
    DURATION_LONG: 500 as DurationMs,
    BREATHING_DURATION: 60000 as DurationMs, // Exactly 60 seconds
    BREATHING_STEP: 20000 as DurationMs, // 20 seconds per step
  },

  // Performance requirements
  PERFORMANCE: {
    TARGET_FPS: 60,
    CRISIS_RESPONSE_TIME: 200 as DurationMs,
    THERAPEUTIC_RESPONSE_TIME: 100 as DurationMs,
    STANDARD_RESPONSE_TIME: 500 as DurationMs,
    MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB
    FRAME_DROP_THRESHOLD: 5, // Maximum dropped frames per second
  },

  // Validation
  VALIDATION: {
    DEBOUNCE_MS: 300 as DurationMs,
    MAX_ERROR_COUNT: 10,
    VALIDATION_TIMEOUT: 1000 as DurationMs,
  },

  // Clinical safety
  CLINICAL: {
    PHQ9_QUESTIONS: 9,
    GAD7_QUESTIONS: 7,
    CRISIS_THRESHOLD_PHQ9: 20,
    CRISIS_THRESHOLD_GAD7: 15,
    SUICIDAL_IDEATION_INDEX: 8,
  },

  // Accessibility
  ACCESSIBILITY: {
    MIN_CONTRAST_RATIO: 4.5, // WCAG AA
    MAX_FONT_SCALE: 2.0,
    FOCUS_TIMEOUT: 3000 as DurationMs,
  },
} as const;

export type EnhancedComponentConstants = typeof ENHANCED_COMPONENT_CONSTANTS;