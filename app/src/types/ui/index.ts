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
  TouchableOpacityProps,
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
 * Core button props interface with therapeutic features
 */
export interface ButtonProps extends Omit<TouchableOpacityProps, 'style' | 'children'> {
  /** Button content */
  readonly children: ReactNode;

  /** Visual variant of the button */
  readonly variant?: ComponentVariant;

  /** Press handler function */
  readonly onPress?: () => void;

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

  /** Custom styling */
  readonly style?: ViewStyle | ViewStyle[];

  /** Test identifier for testing */
  readonly testID?: string;

  // Accessibility props (enhanced for therapeutic context)
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: AccessibilityRole;
}

/**
 * Button animation configuration for therapeutic interactions
 */
export interface ButtonAnimationConfig {
  readonly scaleAmount?: number; // Scale factor for press animation
  readonly duration?: number; // Animation duration in ms
  readonly dampening?: number; // Spring animation dampening
  readonly stiffness?: number; // Spring animation stiffness
  readonly breathingEnabled?: boolean; // Enable breathing animation for crisis buttons
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
 * Performance timing requirements for therapeutic UX
 */
export interface PerformanceConfig {
  readonly maxResponseTime: number; // Maximum response time in ms
  readonly targetFrameRate: 60; // Target FPS for animations
  readonly criticalPath?: boolean; // Flag for crisis-critical components
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
 * Check if component is crisis-critical
 */
export function isCrisisCritical(variant?: ComponentVariant, emergency?: boolean): boolean {
  return emergency === true || variant === 'crisis' || variant === 'emergency';
}

// === CONSTANTS ===

/**
 * UI constants for consistent styling
 */
export const UI_CONSTANTS = {
  TIMING: {
    CRISIS_RESPONSE_MAX: 200, // Maximum response time for crisis buttons (ms)
    ANIMATION_DURATION: 300, // Standard animation duration (ms)
    BREATHING_ANIMATION: 2000, // Breathing animation cycle (ms)
  },

  SIZING: {
    TOUCH_TARGET_MIN: 44, // Minimum touch target size (WCAG AA)
    BORDER_RADIUS: {
      SMALL: 4,
      MEDIUM: 8,
      LARGE: 12,
    },
  },

  COLORS: {
    CRISIS: '#DC3545',
    SUCCESS: '#28A745',
    WARNING: '#FFC107',
    INFO: '#17A2B8',
  },
} as const;

// === RE-EXPORTS ===

// Re-export basic types for convenience
export type { BaseProps, AppScreen, MoodState } from '../basic';