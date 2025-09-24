/**
 * New Architecture Enhanced Types - Button Component Optimization
 *
 * Enhanced TypeScript definitions for React Native New Architecture compatibility.
 * Focuses on Pressable migration, performance optimization, and therapeutic features.
 *
 * CRITICAL: Maintains strict type safety for crisis-critical components
 */

import type { PressableProps, ViewStyle, AccessibilityState } from 'react-native';
import type { ComponentVariant, ThemeVariant } from './ui';

// === NEW ARCHITECTURE PRESSABLE ENHANCEMENTS ===

/**
 * Enhanced Pressable State with Therapeutic Context
 */
export interface TherapeuticPressableState {
  readonly pressed: boolean;
  readonly focused?: boolean;
  readonly hovered?: boolean; // Future web support
  readonly disabled?: boolean;
  readonly emergency?: boolean; // Crisis mode indicator
}

/**
 * Type-Safe Pressable Style Function with Therapeutic States
 */
export type TherapeuticStyleFunction = (state: TherapeuticPressableState) => ViewStyle | ViewStyle[];

/**
 * Enhanced Android Ripple with Crisis Optimization
 */
export interface CrisisOptimizedRipple {
  readonly color?: string;
  readonly borderless?: boolean;
  readonly radius?: number;
  readonly foreground?: boolean;
  readonly crisisMode?: boolean; // Enhanced ripple for crisis buttons
  readonly therapeuticFeedback?: boolean; // Optimized for therapeutic timing
}

/**
 * Enhanced Accessibility State for Therapeutic Components
 */
export interface TherapeuticAccessibilityState extends AccessibilityState {
  readonly busy?: boolean;
  readonly checked?: boolean | 'mixed';
  readonly disabled?: boolean;
  readonly expanded?: boolean;
  readonly selected?: boolean;
  readonly crisisAlert?: boolean; // Indicates crisis-critical state
  readonly therapeuticContext?: 'calm' | 'focus' | 'emergency'; // Therapeutic state context
}

/**
 * New Architecture Performance Metrics for Button Components
 */
export interface ButtonPerformanceMetrics {
  readonly renderTime: number; // Time to render in ms
  readonly pressResponseTime: number; // Time from press to handler execution
  readonly animationFrameDrops: number; // Number of dropped animation frames
  readonly hapticLatency: number; // Haptic feedback delay
  readonly fabricOptimized: boolean; // Using Fabric renderer optimizations
  readonly turboModuleEnabled: boolean; // TurboModule optimizations enabled
}

/**
 * Crisis-Optimized Button Configuration
 */
export interface CrisisButtonConfig {
  readonly maxResponseTime: 200; // Maximum response time for crisis buttons
  readonly hapticIntensity: 'heavy'; // Required haptic intensity
  readonly accessibilityPriority: 'high'; // Accessibility priority level
  readonly visualFeedbackDelay: 0; // Immediate visual feedback
  readonly errorFallback: boolean; // Error handling enabled
  readonly offlineCapable: boolean; // Works without network
}

/**
 * Therapeutic Animation Configuration with Type Safety
 */
export interface TherapeuticAnimationConfig {
  readonly type: 'press' | 'breathing' | 'focus' | 'crisis';
  readonly duration: number; // Animation duration in ms
  readonly easing: 'spring' | 'timing' | 'ease' | 'linear';
  readonly springConfig?: {
    readonly damping: number; // 10-20 for therapeutic animations
    readonly stiffness: number; // 200-400 for responsive feel
    readonly mass: number; // 0.5-1.0 for natural movement
    readonly velocity?: number; // Initial velocity
  };
  readonly timingConfig?: {
    readonly duration: number;
    readonly delay?: number;
    readonly useNativeDriver?: boolean;
  };
  readonly crisisOptimized?: boolean; // Optimized for crisis response
  readonly reduceMotion?: boolean; // Respect accessibility preferences
}

// === ENHANCED BUTTON PROPS WITH NEW ARCHITECTURE ===

/**
 * Comprehensive Button Props with New Architecture Enhancements
 */
export interface EnhancedButtonProps extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  // Core props
  readonly children: React.ReactNode;
  readonly variant?: ComponentVariant;
  readonly theme?: ThemeVariant;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly emergency?: boolean;

  // Enhanced interaction props
  readonly onPress?: () => void | Promise<void>;
  readonly onLongPress?: () => void;
  readonly onPressIn?: () => void;
  readonly onPressOut?: () => void;

  // Enhanced styling with Pressable support
  readonly style?: ViewStyle | ViewStyle[] | TherapeuticStyleFunction;
  readonly fullWidth?: boolean;

  // New Architecture optimizations
  readonly android_ripple?: CrisisOptimizedRipple;
  readonly performanceConfig?: ButtonPerformanceMetrics;
  readonly animationConfig?: TherapeuticAnimationConfig;

  // Therapeutic features
  readonly haptic?: boolean;
  readonly hapticConfig?: {
    readonly type: 'light' | 'medium' | 'heavy' | 'selection';
    readonly crisisIntensity?: boolean;
    readonly nonBlocking?: boolean; // Don't block onPress execution
  };

  // Crisis optimization
  readonly crisisConfig?: CrisisButtonConfig;
  readonly therapeuticTiming?: boolean; // Optimize for therapeutic response timing

  // Enhanced accessibility
  readonly accessibilityState?: TherapeuticAccessibilityState;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: 'button' | 'link' | 'imagebutton';

  // Performance optimization
  readonly hitSlop?: number | { top?: number; left?: number; bottom?: number; right?: number };
  readonly pressRetentionOffset?: number | { top?: number; left?: number; bottom?: number; right?: number };
  readonly delayLongPress?: number;
  readonly delayPressIn?: number;
  readonly delayPressOut?: number;

  // Testing and debugging
  readonly testID?: string;
  readonly debugMode?: boolean;
}

// === TYPE GUARDS AND UTILITIES ===

/**
 * Type guard for therapeutic style function
 */
export function isTherapeuticStyleFunction(style: unknown): style is TherapeuticStyleFunction {
  return typeof style === 'function';
}

/**
 * Type guard for crisis-optimized configuration
 */
export function isCrisisOptimized(props: Partial<EnhancedButtonProps>): boolean {
  return props.emergency === true ||
         props.variant === 'crisis' ||
         props.variant === 'emergency' ||
         props.crisisConfig !== undefined;
}

/**
 * Validate performance configuration
 */
export function validatePerformanceConfig(config: ButtonPerformanceMetrics): boolean {
  return config.renderTime <= 16 && // 60fps requirement
         config.pressResponseTime <= 200 && // Crisis response requirement
         config.hapticLatency <= 50; // Therapeutic haptic requirement
}

/**
 * Create crisis-optimized button configuration
 */
export function createCrisisButtonConfig(): CrisisButtonConfig {
  return {
    maxResponseTime: 200,
    hapticIntensity: 'heavy',
    accessibilityPriority: 'high',
    visualFeedbackDelay: 0,
    errorFallback: true,
    offlineCapable: true,
  };
}

/**
 * Create therapeutic animation configuration
 */
export function createTherapeuticAnimation(
  type: TherapeuticAnimationConfig['type'],
  options?: Partial<TherapeuticAnimationConfig>
): TherapeuticAnimationConfig {
  const baseConfig: TherapeuticAnimationConfig = {
    type,
    duration: type === 'crisis' ? 200 : 300,
    easing: 'spring',
    springConfig: {
      damping: 15,
      stiffness: 300,
      mass: 0.8,
    },
    crisisOptimized: type === 'crisis',
    reduceMotion: false,
  };

  return { ...baseConfig, ...options };
}

// === CONSTANTS ===

/**
 * New Architecture Constants for Button Components
 */
export const NEW_ARCHITECTURE_CONSTANTS = {
  PERFORMANCE: {
    MAX_RENDER_TIME: 16, // 60fps requirement
    CRISIS_RESPONSE_MAX: 200, // Crisis button max response time
    HAPTIC_LATENCY_MAX: 50, // Maximum haptic feedback delay
    ANIMATION_FRAME_BUDGET: 16.67, // Frame budget for 60fps
  },

  TIMING: {
    PRESS_FEEDBACK_IMMEDIATE: 0, // Immediate visual feedback
    HAPTIC_NON_BLOCKING: true, // Don't block press execution
    ANIMATION_SPRING_DAMPING: 15, // Therapeutic spring damping
    ANIMATION_SPRING_STIFFNESS: 300, // Therapeutic spring stiffness
  },

  ACCESSIBILITY: {
    CRISIS_PRIORITY: 'high' as const,
    TOUCH_TARGET_CRISIS: 52, // Larger touch target for crisis
    CONTRAST_RATIO_MIN: 4.5, // WCAG AA compliance
  },

  FEATURES: {
    FABRIC_OPTIMIZATIONS: true,
    TURBO_MODULES: true,
    CONCURRENT_RENDERING: true,
    NATIVE_DRIVER: true,
  },
} as const;

// === TYPE EXPORTS ===

export type {
  TherapeuticPressableState,
  CrisisOptimizedRipple,
  TherapeuticAccessibilityState,
  ButtonPerformanceMetrics,
  CrisisButtonConfig,
  TherapeuticAnimationConfig,
};