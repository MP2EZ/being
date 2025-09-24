/**
 * UI Component Types - Enhanced Component Interface Definitions
 *
 * Comprehensive type definitions for therapeutic-grade UI components.
 * Focuses on React Native components with MBCT compliance and accessibility.
 *
 * CRITICAL: Keep this module under 200 lines per architect guidelines
 */

import type { ReactNode } from 'react';
import type {
  ViewStyle,
  TextStyle,
  PressableProps,
  AccessibilityProps,
  AccessibilityRole
} from 'react-native';
import type { BaseProps } from '../basic';

// === CORE UI TYPES ===

/**
 * Therapeutic theme variants for time-adaptive theming
 */
export type ThemeVariant = 'morning' | 'midday' | 'evening' | null;

/**
 * Component variant types for different UI contexts
 */
export type ComponentVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'emergency'
  | 'crisis';

/**
 * Common size variations for consistent spacing
 */
export type ComponentSize = 'small' | 'medium' | 'large';

/**
 * Loading states for async operations
 */
export interface LoadingState {
  readonly isLoading: boolean;
  readonly loadingText?: string;
  readonly progress?: number; // 0-100 for progress indicators
}

// === ENHANCED BUTTON TYPES ===

/**
 * Enhanced Button Props Interface - New Architecture Compatible
 *
 * Migrated from TouchableOpacity to Pressable for New Architecture compatibility.
 * Maintains therapeutic features with enhanced type safety.
 */
export interface ButtonProps extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  /** Button content */
  readonly children: ReactNode;

  /** Visual variant of the button */
  readonly variant?: ComponentVariant;

  /** Press handler function - enhanced for therapeutic timing */
  readonly onPress?: () => void | Promise<void>;

  /** Disabled state */
  readonly disabled?: boolean;

  /** Therapeutic theme variant */
  readonly theme?: ThemeVariant;

  /** Full width styling */
  readonly fullWidth?: boolean;

  /** Loading state configuration */
  readonly loading?: boolean;

  /** Haptic feedback enabled */
  readonly haptic?: boolean;

  /** Emergency button flag for crisis optimization */
  readonly emergency?: boolean;

  /** Custom styling - enhanced for Pressable pressed state */
  readonly style?: ViewStyle | ViewStyle[] | ((state: { pressed: boolean }) => ViewStyle | ViewStyle[]);

  /** Test identifier for testing */
  readonly testID?: string;

  // Enhanced Accessibility props for therapeutic context
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: AccessibilityRole;

  // New Architecture enhancements
  /** Android ripple configuration for enhanced feedback */
  readonly android_ripple?: {
    readonly color?: string;
    readonly borderless?: boolean;
    readonly radius?: number;
    readonly foreground?: boolean;
  };

  /** Enhanced press event handlers for therapeutic timing */
  readonly onPressIn?: () => void;
  readonly onPressOut?: () => void;
  readonly onLongPress?: () => void;

  /** Performance optimization flags */
  readonly delayLongPress?: number;
  readonly delayPressIn?: number;
  readonly delayPressOut?: number;

  /** Hit area configuration for accessibility */
  readonly hitSlop?: number | { top?: number; left?: number; bottom?: number; right?: number };
  readonly pressRetentionOffset?: number | { top?: number; left?: number; bottom?: number; right?: number };
}

/**
 * Enhanced Button Animation Configuration - New Architecture Compatible
 *
 * Therapeutic animation types with enhanced performance and type safety.
 */
export interface ButtonAnimationConfig {
  readonly scaleAmount?: number; // Scale factor for press animation (0.8-1.0)
  readonly duration?: number; // Animation duration in ms (100-500)
  readonly dampening?: number; // Spring animation dampening (10-20)
  readonly stiffness?: number; // Spring animation stiffness (200-400)
  readonly breathingEnabled?: boolean; // Enable breathing animation for crisis buttons
  readonly breathingDuration?: number; // Breathing cycle duration (1000-3000ms)
  readonly pressedScale?: number; // Scale factor when pressed (0.95-0.98)
  readonly crisisIntensity?: 'subtle' | 'moderate' | 'prominent'; // Crisis animation intensity
}

/**
 * Enhanced Pressable State Interface for Type-Safe Style Functions
 */
export interface PressableState {
  readonly pressed: boolean;
}

/**
 * Type-Safe Style Function for Pressable Components
 */
export type PressableStyleFunction = (state: PressableState) => ViewStyle | ViewStyle[];

/**
 * Combined Style Type for Enhanced Flexibility
 */
export type EnhancedStyleProp = ViewStyle | ViewStyle[] | PressableStyleFunction;

/**
 * Android Ripple Configuration with Type Safety
 */
export interface AndroidRippleConfig {
  readonly color?: string; // Ripple color (hex, rgba, named)
  readonly borderless?: boolean; // Ripple extends beyond component bounds
  readonly radius?: number; // Ripple radius in pixels
  readonly foreground?: boolean; // Ripple appears in foreground
}

/**
 * Enhanced Haptic Configuration for Therapeutic Context
 */
export interface EnhancedHapticConfig extends HapticConfig {
  readonly therapeuticTiming?: boolean; // Optimize for therapeutic response timing
  readonly crisisResponse?: boolean; // Enhanced haptic for crisis situations
  readonly asyncExecution?: boolean; // Non-blocking haptic execution
}

/**
 * New Architecture Performance Metrics
 */
export interface NewArchPerformanceConfig {
  readonly targetResponseTime: number; // Target response time in ms
  readonly maxFrameDrops: number; // Maximum acceptable frame drops
  readonly enableFabricOptimizations: boolean; // Enable Fabric-specific optimizations
  readonly enableTurboModules: boolean; // Enable TurboModule optimizations
}

// === COMMON COMPONENT PROPS ===

/**
 * Enhanced base props with therapeutic features
 */
export interface TherapeuticComponentProps extends BaseProps {
  readonly theme?: ThemeVariant;
  readonly size?: ComponentSize;
  readonly accessibilityProps?: AccessibilityProps;
  readonly optimizeForCrisis?: boolean;
}

// === INTERACTION TYPES ===

/**
 * Haptic feedback configuration
 */
export interface HapticConfig {
  readonly type: 'light' | 'medium' | 'heavy' | 'selection';
  readonly enabled: boolean;
  readonly crisisIntensity?: 'heavy'; // Override for crisis situations
}

/**
 * Enhanced Performance Configuration for New Architecture
 *
 * Performance timing requirements optimized for therapeutic UX and New Architecture.
 */
export interface PerformanceConfig {
  readonly maxResponseTime: number; // Maximum response time in ms
  readonly targetFrameRate: 60; // Target FPS for animations
  readonly criticalPath?: boolean; // Flag for crisis-critical components
  readonly newArchitecture?: NewArchPerformanceConfig; // New Architecture specific settings
  readonly therapeuticTiming?: {
    readonly crisisButtonMax: 200; // Maximum crisis button response (ms)
    readonly breathingAccuracy: 16; // Breathing timer accuracy (ms)
    readonly animationSmooth: 60; // Target FPS for therapeutic animations
  };
}

// === ADDITIONAL COMPONENT TYPES ===
// Note: Additional component types (Form, Layout, Navigation) will be added
// in future phases to maintain architect's 200-line guideline for this module.

// === TYPE GUARDS ===

/**
 * Check if value is a valid component variant
 */
export function isComponentVariant(value: unknown): value is ComponentVariant {
  return typeof value === 'string' &&
    ['primary', 'secondary', 'outline', 'success', 'emergency', 'crisis'].includes(value);
}

/**
 * Check if value is a valid theme variant
 */
export function isThemeVariant(value: unknown): value is ThemeVariant {
  return value === null ||
    (typeof value === 'string' && ['morning', 'midday', 'evening'].includes(value));
}

/**
 * Enhanced Type Guards for New Architecture Components
 */

/**
 * Check if component is crisis-critical
 */
export function isCrisisCritical(variant?: ComponentVariant, emergency?: boolean): boolean {
  return emergency === true || variant === 'crisis' || variant === 'emergency';
}

/**
 * Type guard for Pressable style function
 */
export function isPressableStyleFunction(style: unknown): style is PressableStyleFunction {
  return typeof style === 'function';
}

/**
 * Type guard for Android ripple configuration
 */
export function isAndroidRippleConfig(config: unknown): config is AndroidRippleConfig {
  return typeof config === 'object' && config !== null;
}

/**
 * Validate button animation configuration
 */
export function isValidAnimationConfig(config: unknown): config is ButtonAnimationConfig {
  if (typeof config !== 'object' || config === null) return false;

  const animConfig = config as ButtonAnimationConfig;

  // Validate scale amount range
  if (animConfig.scaleAmount !== undefined && (animConfig.scaleAmount < 0.8 || animConfig.scaleAmount > 1.0)) {
    return false;
  }

  // Validate duration range
  if (animConfig.duration !== undefined && (animConfig.duration < 100 || animConfig.duration > 1000)) {
    return false;
  }

  return true;
}

/**
 * Type-safe style resolver for Pressable components
 */
export function resolvePressableStyle(
  style: EnhancedStyleProp | undefined,
  state: PressableState
): ViewStyle | ViewStyle[] {
  if (style === undefined) return {};

  if (isPressableStyleFunction(style)) {
    return style(state);
  }

  return style;
}

/**
 * Validate therapeutic timing requirements
 */
export function validateTherapeuticTiming(config: PerformanceConfig): boolean {
  if (config.therapeuticTiming) {
    const timing = config.therapeuticTiming;
    return timing.crisisButtonMax <= 200 &&
           timing.breathingAccuracy <= 16 &&
           timing.animationSmooth >= 60;
  }
  return true;
}

// === CONSTANTS ===

/**
 * Enhanced UI Constants for New Architecture
 *
 * Constants optimized for therapeutic UX and New Architecture performance.
 */
export const UI_CONSTANTS = {
  TIMING: {
    CRISIS_RESPONSE_MAX: 200, // Maximum response time for crisis buttons (ms)
    ANIMATION_DURATION: 300, // Standard animation duration (ms)
    BREATHING_ANIMATION: 2000, // Breathing animation cycle (ms)
    PRESSABLE_DELAY: {
      PRESS_IN: 0, // Immediate response for therapeutic timing
      PRESS_OUT: 100, // Brief delay for visual feedback
      LONG_PRESS: 500, // Standard long press duration
    },
    NEW_ARCHITECTURE: {
      FABRIC_OPTIMIZATION: true, // Enable Fabric optimizations
      TURBO_MODULE_TIMING: 50, // Maximum TurboModule response time
      RENDER_TARGET: 16, // Target render time per frame (ms)
    },
  },

  SIZING: {
    TOUCH_TARGET_MIN: 44, // Minimum touch target size (WCAG AA)
    TOUCH_TARGET_CRISIS: 52, // Larger touch target for crisis buttons
    BORDER_RADIUS: {
      SMALL: 4,
      MEDIUM: 8,
      LARGE: 12,
    },
    HIT_SLOP: {
      DEFAULT: 8, // Default hit area extension
      CRISIS: 12, // Extended hit area for crisis buttons
    },
  },

  COLORS: {
    CRISIS: '#DC3545',
    SUCCESS: '#28A745',
    WARNING: '#FFC107',
    INFO: '#17A2B8',
    RIPPLE: {
      LIGHT: 'rgba(0, 0, 0, 0.1)',
      DARK: 'rgba(255, 255, 255, 0.2)',
      CRISIS: 'rgba(255, 255, 255, 0.3)',
    },
  },

  ACCESSIBILITY: {
    CONTRAST_RATIO_MIN: 4.5, // WCAG AA minimum contrast ratio
    FONT_SCALE_MAX: 2.0, // Maximum font scaling for accessibility
    ANIMATION_REDUCE_MOTION: 'prefer-reduced-motion', // Respect user motion preferences
  },

  HAPTICS: {
    ENABLED_BY_DEFAULT: true, // Default haptic setting
    CRISIS_INTENSITY: 'heavy', // Haptic intensity for crisis buttons
    THERAPEUTIC_TIMING: true, // Optimize haptic timing for therapeutic use
  },
} as const;

// === RE-EXPORTS ===

// Re-export basic types for convenience
export type { BaseProps, AppScreen, MoodState } from '../basic';