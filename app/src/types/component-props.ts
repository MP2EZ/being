/**
 * Component Props Types - Strict TypeScript Interfaces
 *
 * Type-safe component props with clinical data validation
 * and crisis intervention requirements.
 */

import { ReactNode, ComponentProps } from 'react';
import { ViewStyle, TextStyle, TouchableOpacityProps, TextInputProps } from 'react-native';
import { Assessment, PHQ9Score, GAD7Score, CrisisResponseTime, TherapeuticTiming } from './clinical';
import { UserProfile, CheckIn } from './index';

// Base Props Types
export interface BaseComponentProps {
  readonly testID?: string;
  readonly style?: ViewStyle;
  readonly accessible?: boolean;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: string;
}

export interface BaseTextProps {
  readonly style?: TextStyle;
  readonly allowFontScaling?: boolean;
  readonly maxFontSizeMultiplier?: number;
  readonly adjustsFontSizeToFit?: boolean;
}

// Theme Types for Components
export type ThemeVariant = 'morning' | 'midday' | 'evening';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'success' | 'emergency' | 'crisis';
export type StatusVariant = 'info' | 'success' | 'warning' | 'error' | 'critical';

// Crisis-Critical Button Props
export interface CrisisButtonProps extends BaseComponentProps {
  readonly variant?: 'floating' | 'header' | 'embedded';
  readonly onPress?: () => Promise<void>;
  readonly emergencyNumber?: '988' | '741741';
  readonly responseTime?: CrisisResponseTime;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly hapticFeedback?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
}

// Enhanced Button Props with Clinical Safety
export interface ButtonProps extends BaseComponentProps, Pick<TouchableOpacityProps, 'disabled' | 'activeOpacity'> {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
  readonly theme?: ThemeVariant | null;
  readonly onPress?: () => void | Promise<void>;
  readonly disabled?: boolean;
  readonly fullWidth?: boolean;
  readonly loading?: boolean;
  readonly haptic?: boolean;
  readonly emergency?: boolean;
  readonly size?: 'small' | 'medium' | 'large';
  readonly icon?: ReactNode;
  readonly iconPosition?: 'left' | 'right';
  readonly accessibilityState?: {
    readonly disabled?: boolean;
    readonly selected?: boolean;
    readonly checked?: boolean | 'mixed';
    readonly busy?: boolean;
    readonly expanded?: boolean;
  };
  readonly performanceRequirements?: {
    readonly maxResponseTime: number;
    readonly measurePerformance: boolean;
  };
}

// Text Input Props with Clinical Validation
export interface TextInputProps extends BaseComponentProps, Pick<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'secureTextEntry' | 'keyboardType' | 'autoComplete' | 'maxLength'> {
  readonly label?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly multiline?: boolean;
  readonly numberOfLines?: number;
  readonly variant?: 'default' | 'clinical' | 'assessment';
  readonly validation?: {
    readonly required?: boolean;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly pattern?: RegExp;
    readonly customValidator?: (value: string) => string | null;
  };
  readonly clinicalContext?: 'crisis_plan' | 'assessment_notes' | 'check_in_data';
  readonly encryptionRequired?: boolean;
}

// Assessment Component Props - Type-Safe Clinical Data
export interface AssessmentQuestionProps extends BaseComponentProps {
  readonly questionNumber: number;
  readonly questionText: string;
  readonly options: readonly AssessmentOptionProps[];
  readonly selectedValue?: 0 | 1 | 2 | 3;
  readonly onAnswer: (value: 0 | 1 | 2 | 3) => void;
  readonly assessmentType: 'phq9' | 'gad7';
  readonly required: true;
  readonly showProgress?: boolean;
  readonly isLastQuestion?: boolean;
}

export interface AssessmentOptionProps extends BaseComponentProps {
  readonly value: 0 | 1 | 2 | 3;
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: (value: 0 | 1 | 2 | 3) => void;
  readonly assessmentType: 'phq9' | 'gad7';
}

export interface AssessmentProgressProps extends BaseComponentProps {
  readonly currentQuestion: number;
  readonly totalQuestions: number;
  readonly assessmentType: 'phq9' | 'gad7';
  readonly canGoBack: boolean;
  readonly canProceed: boolean;
  readonly onBack?: () => void;
  readonly onNext?: () => void;
  readonly showPercentage?: boolean;
}

export interface AssessmentResultsProps extends BaseComponentProps {
  readonly assessment: Assessment;
  readonly showScore: boolean;
  readonly showSeverity: boolean;
  readonly showRecommendations: boolean;
  readonly onCrisisIntervention?: () => void;
  readonly onComplete: () => void;
}

// Check-in Component Props
export interface CheckInStepProps extends BaseComponentProps {
  readonly step: number;
  readonly totalSteps: number;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly onNext?: () => void;
  readonly onBack?: () => void;
  readonly onSkip?: () => void;
  readonly canProceed: boolean;
  readonly skipAllowed?: boolean;
  readonly progress: number; // 0-100
}

export interface EmotionGridProps extends BaseComponentProps {
  readonly emotions: readonly string[];
  readonly selectedEmotions: readonly string[];
  readonly onSelectionChange: (emotions: readonly string[]) => void;
  readonly maxSelections?: number;
  readonly required?: boolean;
  readonly variant?: 'morning' | 'midday' | 'evening';
}

export interface BreathingCircleProps extends BaseComponentProps {
  readonly duration: TherapeuticTiming; // Must be exactly 60000ms
  readonly onComplete: () => void;
  readonly onStart?: () => void;
  readonly onPause?: () => void;
  readonly variant?: ThemeVariant;
  readonly showTimer?: boolean;
  readonly showInstructions?: boolean;
  readonly hapticFeedback?: boolean;
  readonly performanceMonitoring?: {
    readonly trackFrameRate: boolean;
    readonly targetFPS: 60;
    readonly reportPerformance: (metrics: BreathingPerformanceMetrics) => void;
  };
}

export interface BreathingPerformanceMetrics {
  readonly averageFPS: number;
  readonly frameDrops: number;
  readonly totalFrames: number;
  readonly duration: number;
  readonly memoryUsage: number;
  readonly qualityScore: number; // 0-100
}

// Form Component Props
export interface FormFieldProps extends BaseComponentProps {
  readonly name: string;
  readonly label?: string;
  readonly children: ReactNode;
  readonly error?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly helpText?: string;
}

export interface MultiSelectProps<T extends string> extends BaseComponentProps {
  readonly options: readonly T[];
  readonly selectedValues: readonly T[];
  readonly onSelectionChange: (values: readonly T[]) => void;
  readonly maxSelections?: number;
  readonly minSelections?: number;
  readonly placeholder?: string;
  readonly searchable?: boolean;
  readonly disabled?: boolean;
  readonly renderOption?: (option: T, selected: boolean) => ReactNode;
}

// Slider Component Props with Clinical Precision
export interface SliderProps extends BaseComponentProps {
  readonly value: number;
  readonly onValueChange: (value: number) => void;
  readonly minimumValue: number;
  readonly maximumValue: number;
  readonly step?: number;
  readonly disabled?: boolean;
  readonly showValue?: boolean;
  readonly label?: string;
  readonly unit?: string;
  readonly formatValue?: (value: number) => string;
  readonly clinicalScale?: {
    readonly type: 'mood' | 'anxiety' | 'energy' | 'sleep';
    readonly labels?: readonly string[];
  };
  readonly accessibilityIncrements?: readonly number[];
}

// Modal Component Props
export interface ModalProps extends BaseComponentProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  readonly children: ReactNode;
  readonly size?: 'small' | 'medium' | 'large' | 'fullscreen';
  readonly closeable?: boolean;
  readonly overlay?: boolean;
  readonly animationType?: 'none' | 'slide' | 'fade';
  readonly onShow?: () => void;
  readonly onDismiss?: () => void;
  readonly emergencyContext?: boolean; // For crisis modals
}

// Card Component Props
export interface CardProps extends BaseComponentProps {
  readonly children: ReactNode;
  readonly title?: string;
  readonly subtitle?: string;
  readonly variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  readonly theme?: ThemeVariant;
  readonly onPress?: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
}

// Alert Component Props
export interface AlertProps extends BaseComponentProps {
  readonly type: StatusVariant;
  readonly title?: string;
  readonly message: string;
  readonly visible: boolean;
  readonly onClose?: () => void;
  readonly actions?: readonly AlertAction[];
  readonly dismissible?: boolean;
  readonly autoClose?: boolean;
  readonly duration?: number;
  readonly emergencyAlert?: boolean;
}

export interface AlertAction {
  readonly text: string;
  readonly onPress: () => void;
  readonly style?: 'default' | 'cancel' | 'destructive';
  readonly disabled?: boolean;
}

// Loading Component Props
export interface LoadingProps extends BaseComponentProps {
  readonly visible: boolean;
  readonly message?: string;
  readonly size?: 'small' | 'large';
  readonly color?: string;
  readonly overlay?: boolean;
  readonly cancellable?: boolean;
  readonly onCancel?: () => void;
  readonly timeout?: number;
  readonly onTimeout?: () => void;
}

// Navigation Component Props
export interface NavigationHeaderProps extends BaseComponentProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly leftButton?: ButtonProps;
  readonly rightButton?: ButtonProps;
  readonly showBack?: boolean;
  readonly onBack?: () => void;
  readonly theme?: ThemeVariant;
  readonly emergencyMode?: boolean;
}

// Progress Component Props
export interface ProgressBarProps extends BaseComponentProps {
  readonly progress: number; // 0-100
  readonly showPercentage?: boolean;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly height?: number;
  readonly animated?: boolean;
  readonly duration?: number;
  readonly label?: string;
}

export interface StepsIndicatorProps extends BaseComponentProps {
  readonly steps: readonly string[];
  readonly currentStep: number;
  readonly completedSteps?: readonly number[];
  readonly variant?: 'horizontal' | 'vertical';
  readonly showLabels?: boolean;
  readonly onStepPress?: (step: number) => void;
  readonly disabled?: boolean;
}

// List Component Props
export interface ListItemProps extends BaseComponentProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly leftIcon?: ReactNode;
  readonly rightIcon?: ReactNode;
  readonly onPress?: () => void;
  readonly disabled?: boolean;
  readonly selected?: boolean;
  readonly variant?: 'default' | 'detailed' | 'simple';
  readonly value?: string | number;
}

// Crisis-Specific Component Props
export interface CrisisPlanProps extends BaseComponentProps {
  readonly plan: UserProfile['crisisPlan'];
  readonly onUpdate: (plan: UserProfile['crisisPlan']) => void;
  readonly editable?: boolean;
  readonly compact?: boolean;
  readonly showEmergencyContacts?: boolean;
  readonly showCopingStrategies?: boolean;
  readonly showWarningSigns?: boolean;
}

export interface EmergencyContactProps extends BaseComponentProps {
  readonly name: string;
  readonly phone: string;
  readonly relationship?: string;
  readonly onCall: () => void;
  readonly onEdit?: () => void;
  readonly primary?: boolean;
  readonly verified?: boolean;
}

// Performance Monitoring Props
export interface PerformanceMonitorProps extends BaseComponentProps {
  readonly enabled: boolean;
  readonly targetMetrics: {
    readonly responseTime: number;
    readonly frameRate: number;
    readonly memoryThreshold: number;
  };
  readonly onPerformanceIssue: (issue: PerformanceIssue) => void;
  readonly reportInterval?: number;
}

export interface PerformanceIssue {
  readonly type: 'response_time' | 'frame_rate' | 'memory' | 'network';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly value: number;
  readonly threshold: number;
  readonly timestamp: number;
  readonly context?: string;
}

// Type Guards for Component Props
export const isButtonProps = (props: unknown): props is ButtonProps => {
  return typeof props === 'object' && props !== null && 'children' in props;
};

export const isCrisisButtonProps = (props: unknown): props is CrisisButtonProps => {
  return typeof props === 'object' && props !== null && 'variant' in props;
};

export const isAssessmentQuestionProps = (props: unknown): props is AssessmentQuestionProps => {
  return (
    typeof props === 'object' &&
    props !== null &&
    'questionNumber' in props &&
    'assessmentType' in props &&
    'onAnswer' in props
  );
};

export const isBreathingCircleProps = (props: unknown): props is BreathingCircleProps => {
  return (
    typeof props === 'object' &&
    props !== null &&
    'duration' in props &&
    'onComplete' in props
  );
};

// Component Props Constants
export const COMPONENT_CONSTANTS = {
  TOUCH_TARGET: {
    MIN_SIZE: 44, // WCAG AA minimum
    CRISIS_MIN_SIZE: 52, // Larger for emergency
  },
  ANIMATION: {
    DURATION_SHORT: 200,
    DURATION_MEDIUM: 300,
    DURATION_LONG: 500,
    BREATHING_DURATION: 60000, // Exactly 60 seconds
  },
  PERFORMANCE: {
    TARGET_FPS: 60,
    MAX_RESPONSE_TIME_MS: 200,
    CRISIS_RESPONSE_TIME_MS: 100,
    MEMORY_THRESHOLD_MB: 50,
  },
  TEXT: {
    MAX_FONT_SCALE: 2.0,
    MIN_CONTRAST_RATIO: 4.5, // WCAG AA
  },
} as const;

export type ComponentConstants = typeof COMPONENT_CONSTANTS;