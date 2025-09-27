/**
 * Design System Types - Being. MBCT App
 *
 * Type-safe design system with therapeutic theming and clinical safety.
 * Ensures consistent design implementation with accessibility compliance.
 *
 * CRITICAL: Design system types must enforce therapeutic timing and
 * accessibility standards for clinical use.
 */

import type {
  DurationMs,
  Percentage,
  DeepReadonly,
} from './core';

// === THEME TYPES ===

/**
 * Therapeutic theme variants based on time of day
 */
export type TherapeuticTheme = 'morning' | 'midday' | 'evening';

/**
 * Design system color palette with accessibility compliance
 */
export interface ColorPalette {
  readonly primary: {
    readonly 50: string;
    readonly 100: string;
    readonly 200: string;
    readonly 300: string;
    readonly 400: string;
    readonly 500: string; // Main color
    readonly 600: string;
    readonly 700: string;
    readonly 800: string;
    readonly 900: string;
  };
  readonly secondary: {
    readonly 50: string;
    readonly 100: string;
    readonly 200: string;
    readonly 300: string;
    readonly 400: string;
    readonly 500: string;
    readonly 600: string;
    readonly 700: string;
    readonly 800: string;
    readonly 900: string;
  };
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly crisis: string; // Emergency red
  readonly neutral: {
    readonly white: string;
    readonly 50: string;
    readonly 100: string;
    readonly 200: string;
    readonly 300: string;
    readonly 400: string;
    readonly 500: string;
    readonly 600: string;
    readonly 700: string;
    readonly 800: string;
    readonly 900: string;
    readonly black: string;
  };
}

/**
 * Therapeutic color schemes for different times of day
 */
export interface TherapeuticColorSchemes {
  readonly morning: {
    readonly primary: '#FF9F43'; // Warm orange
    readonly background: '#FFF8F0';
    readonly surface: '#FFFFFF';
    readonly text: '#2D2D2D';
    readonly accent: '#E8863A';
  };
  readonly midday: {
    readonly primary: '#40B5AD'; // Calming teal
    readonly background: '#F0F9F8';
    readonly surface: '#FFFFFF';
    readonly text: '#2D2D2D';
    readonly accent: '#2C8A82';
  };
  readonly evening: {
    readonly primary: '#4A7C59'; // Restful green
    readonly background: '#F0F6F2';
    readonly surface: '#FFFFFF';
    readonly text: '#2D2D2D';
    readonly accent: '#2D5016';
  };
}

/**
 * Typography scale with clinical readability
 */
export interface TypographyScale {
  readonly display: {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly fontWeight: '300' | '400' | '500' | '600' | '700';
    readonly letterSpacing?: number;
  };
  readonly headline: {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly fontWeight: '400' | '500' | '600' | '700';
    readonly letterSpacing?: number;
  };
  readonly title: {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly fontWeight: '400' | '500' | '600';
    readonly letterSpacing?: number;
  };
  readonly body: {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly fontWeight: '400' | '500';
    readonly letterSpacing?: number;
  };
  readonly caption: {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly fontWeight: '400' | '500';
    readonly letterSpacing?: number;
  };
  readonly button: {
    readonly fontSize: number;
    readonly lineHeight: number;
    readonly fontWeight: '500' | '600';
    readonly letterSpacing?: number;
  };
}

/**
 * Spacing scale for consistent layout
 */
export interface SpacingScale {
  readonly xs: number;   // 4px
  readonly sm: number;   // 8px
  readonly md: number;   // 16px
  readonly lg: number;   // 24px
  readonly xl: number;   // 32px
  readonly xxl: number;  // 48px
  readonly xxxl: number; // 64px
}

/**
 * Border radius scale
 */
export interface BorderRadiusScale {
  readonly none: number;   // 0px
  readonly sm: number;     // 4px
  readonly md: number;     // 8px
  readonly lg: number;     // 12px
  readonly xl: number;     // 16px
  readonly full: number;   // 9999px
}

/**
 * Shadow definitions for elevation
 */
export interface ShadowScale {
  readonly none: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
}

// === ANIMATION TYPES ===

/**
 * Animation timing with therapeutic considerations
 */
export interface AnimationTiming {
  readonly duration: DurationMs;
  readonly easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'therapeutic';
  readonly delay?: DurationMs;
}

/**
 * Therapeutic animation specifications
 */
export interface TherapeuticAnimations {
  readonly breathingCircle: {
    readonly inhale: AnimationTiming;
    readonly hold: AnimationTiming;
    readonly exhale: AnimationTiming;
    readonly pause: AnimationTiming;
    readonly totalCycle: 60000; // Exactly 60 seconds
  };
  readonly transitions: {
    readonly fast: AnimationTiming;
    readonly medium: AnimationTiming;
    readonly slow: AnimationTiming;
    readonly crisis: AnimationTiming; // Emergency transitions
  };
  readonly feedback: {
    readonly success: AnimationTiming;
    readonly error: AnimationTiming;
    readonly loading: AnimationTiming;
    readonly haptic: AnimationTiming;
  };
}

// === COMPONENT TOKENS ===

/**
 * Button design tokens
 */
export interface ButtonTokens {
  readonly height: {
    readonly small: number;
    readonly medium: number;
    readonly large: number;
    readonly crisis: number; // Larger for emergency
  };
  readonly padding: {
    readonly horizontal: {
      readonly small: number;
      readonly medium: number;
      readonly large: number;
    };
    readonly vertical: {
      readonly small: number;
      readonly medium: number;
      readonly large: number;
    };
  };
  readonly borderRadius: number;
  readonly borderWidth: number;
  readonly minTouchTarget: 44; // WCAG compliance
  readonly crisisMinTouchTarget: 52; // Emergency accessibility
}

/**
 * Input field design tokens
 */
export interface InputTokens {
  readonly height: number;
  readonly padding: {
    readonly horizontal: number;
    readonly vertical: number;
  };
  readonly borderRadius: number;
  readonly borderWidth: number;
  readonly focusBorderWidth: number;
  readonly fontSize: number;
  readonly lineHeight: number;
}

/**
 * Card design tokens
 */
export interface CardTokens {
  readonly padding: {
    readonly small: number;
    readonly medium: number;
    readonly large: number;
  };
  readonly borderRadius: number;
  readonly borderWidth: number;
  readonly elevation: {
    readonly none: string;
    readonly small: string;
    readonly medium: string;
    readonly large: string;
  };
}

// === ACCESSIBILITY TYPES ===

/**
 * Accessibility compliance levels
 */
export type AccessibilityLevel = 'A' | 'AA' | 'AAA';

/**
 * Contrast ratio requirements
 */
export interface ContrastRequirements {
  readonly normal: {
    readonly AA: 4.5;
    readonly AAA: 7.0;
  };
  readonly large: {
    readonly AA: 3.0;
    readonly AAA: 4.5;
  };
  readonly crisis: 7.0; // Maximum contrast for emergency
}

/**
 * Accessibility features
 */
export interface AccessibilityFeatures {
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
  readonly largeText: boolean;
  readonly screenReader: boolean;
  readonly keyboardNavigation: boolean;
  readonly colorBlindFriendly: boolean;
}

/**
 * Screen reader optimizations
 */
export interface ScreenReaderSupport {
  readonly labels: boolean;
  readonly hints: boolean;
  readonly roles: boolean;
  readonly states: boolean;
  readonly landmarks: boolean;
  readonly liveRegions: boolean;
}

// === THERAPEUTIC DESIGN TYPES ===

/**
 * Therapeutic design principles
 */
export interface TherapeuticDesignPrinciples {
  readonly calmingColors: readonly string[];
  readonly energizingColors: readonly string[];
  readonly groundingColors: readonly string[];
  readonly progressColors: readonly string[];
  readonly crisisColors: readonly string[];
}

/**
 * Mindfulness-based design system
 */
export interface MindfulnessDesign {
  readonly breathingVisuals: {
    readonly expandColor: string;
    readonly contractColor: string;
    readonly centerColor: string;
    readonly guideColor: string;
  };
  readonly progressVisuals: {
    readonly completedColor: string;
    readonly currentColor: string;
    readonly futureColor: string;
    readonly milestoneColor: string;
  };
  readonly moodVisuals: {
    readonly veryLow: string;
    readonly low: string;
    readonly neutral: string;
    readonly high: string;
    readonly veryHigh: string;
  };
}

/**
 * Crisis-aware design tokens
 */
export interface CrisisDesignTokens {
  readonly colors: {
    readonly emergencyRed: string;
    readonly urgentOrange: string;
    readonly cautionYellow: string;
    readonly safeGreen: string;
    readonly neutralGray: string;
  };
  readonly animations: {
    readonly pulse: AnimationTiming;
    readonly urgent: AnimationTiming;
    readonly immediate: AnimationTiming;
  };
  readonly sizes: {
    readonly emergencyButton: number;
    readonly crisisIcon: number;
    readonly alertBadge: number;
  };
}

// === COMPLETE DESIGN SYSTEM ===

/**
 * Complete design system configuration
 */
export interface DesignSystemConfig {
  readonly colors: ColorPalette;
  readonly therapeuticColors: TherapeuticColorSchemes;
  readonly typography: TypographyScale;
  readonly spacing: SpacingScale;
  readonly borderRadius: BorderRadiusScale;
  readonly shadows: ShadowScale;
  readonly animations: TherapeuticAnimations;
  readonly components: {
    readonly button: ButtonTokens;
    readonly input: InputTokens;
    readonly card: CardTokens;
  };
  readonly accessibility: {
    readonly level: AccessibilityLevel;
    readonly contrast: ContrastRequirements;
    readonly features: AccessibilityFeatures;
    readonly screenReader: ScreenReaderSupport;
  };
  readonly therapeutic: {
    readonly principles: TherapeuticDesignPrinciples;
    readonly mindfulness: MindfulnessDesign;
    readonly crisis: CrisisDesignTokens;
  };
}

/**
 * Theme context for React components
 */
export interface ThemeContext {
  readonly currentTheme: TherapeuticTheme;
  readonly designSystem: DesignSystemConfig;
  readonly isDarkMode: boolean;
  readonly isHighContrast: boolean;
  readonly isReducedMotion: boolean;
  readonly accessibilityLevel: AccessibilityLevel;
}

// === RESPONSIVE DESIGN TYPES ===

/**
 * Breakpoint definitions
 */
export interface Breakpoints {
  readonly xs: number;  // 0px
  readonly sm: number;  // 576px
  readonly md: number;  // 768px
  readonly lg: number;  // 992px
  readonly xl: number;  // 1200px
}

/**
 * Responsive value type
 */
export type ResponsiveValue<T> = T | {
  readonly xs?: T;
  readonly sm?: T;
  readonly md?: T;
  readonly lg?: T;
  readonly xl?: T;
};

/**
 * Device-specific design tokens
 */
export interface DeviceTokens {
  readonly phone: {
    readonly minTouchTarget: 44;
    readonly fontSize: {
      readonly min: 16;
      readonly max: 24;
    };
    readonly spacing: {
      readonly min: 8;
      readonly comfortable: 16;
    };
  };
  readonly tablet: {
    readonly minTouchTarget: 48;
    readonly fontSize: {
      readonly min: 18;
      readonly max: 28;
    };
    readonly spacing: {
      readonly min: 12;
      readonly comfortable: 24;
    };
  };
}

// === PERFORMANCE TYPES ===

/**
 * Design system performance metrics
 */
export interface DesignSystemPerformance {
  readonly themeLoadTime: DurationMs;
  readonly animationFrameRate: number;
  readonly memoryUsage: number; // bytes
  readonly renderTime: DurationMs;
  readonly accessibilityCompliance: Percentage;
}

/**
 * Optimization configuration
 */
export interface DesignSystemOptimization {
  readonly lazyLoadThemes: boolean;
  readonly cacheAnimations: boolean;
  readonly optimizeImages: boolean;
  readonly preloadCriticalStyles: boolean;
  readonly enablePerformanceMonitoring: boolean;
}

// === TYPE GUARDS ===

/**
 * Type guard for therapeutic theme
 */
export const isTherapeuticTheme = (value: unknown): value is TherapeuticTheme => {
  return typeof value === 'string' && ['morning', 'midday', 'evening'].includes(value);
};

/**
 * Type guard for accessibility level
 */
export const isAccessibilityLevel = (value: unknown): value is AccessibilityLevel => {
  return typeof value === 'string' && ['A', 'AA', 'AAA'].includes(value);
};

/**
 * Type guard for design system config
 */
export const isDesignSystemConfig = (value: unknown): value is DesignSystemConfig => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'colors' in value &&
    'typography' in value &&
    'spacing' in value &&
    'therapeutic' in value
  );
};

// === CONSTANTS ===

/**
 * Design system constants
 */
export const DESIGN_SYSTEM_CONSTANTS = {
  // Base measurements
  BASE_UNIT: 4, // 4px base unit
  GOLDEN_RATIO: 1.618,

  // Typography
  BASE_FONT_SIZE: 16,
  LINE_HEIGHT_RATIO: 1.5,
  FONT_SCALE_RATIO: 1.25,

  // Spacing
  SPACING_SCALE: [0, 4, 8, 16, 24, 32, 48, 64, 96, 128] as const,

  // Accessibility
  MIN_TOUCH_TARGET: 44,
  CRISIS_TOUCH_TARGET: 52,
  MIN_CONTRAST_AA: 4.5,
  MIN_CONTRAST_AAA: 7.0,

  // Animation
  BREATHING_DURATION: 60000 as DurationMs,
  BREATHING_STEP: 20000 as DurationMs,
  CRISIS_ANIMATION: 100 as DurationMs,
  STANDARD_ANIMATION: 300 as DurationMs,

  // Therapeutic timing
  MINDFULNESS_PAUSE: 3000 as DurationMs,
  REFLECTION_TIME: 5000 as DurationMs,
  TRANSITION_TIME: 500 as DurationMs,

  // Crisis design
  CRISIS_RESPONSE_TIME: 200 as DurationMs,
  EMERGENCY_CONTRAST: 7.0,
  URGENT_PULSE_RATE: 1000 as DurationMs,

  // Performance
  MAX_THEME_LOAD_TIME: 100 as DurationMs,
  TARGET_FRAME_RATE: 60,
  MAX_MEMORY_USAGE_MB: 50,
} as const;

/**
 * Default therapeutic color schemes
 */
export const DEFAULT_THERAPEUTIC_COLORS: TherapeuticColorSchemes = {
  morning: {
    primary: '#FF9F43',
    background: '#FFF8F0',
    surface: '#FFFFFF',
    text: '#2D2D2D',
    accent: '#E8863A',
  },
  midday: {
    primary: '#40B5AD',
    background: '#F0F9F8',
    surface: '#FFFFFF',
    text: '#2D2D2D',
    accent: '#2C8A82',
  },
  evening: {
    primary: '#4A7C59',
    background: '#F0F6F2',
    surface: '#FFFFFF',
    text: '#2D2D2D',
    accent: '#2D5016',
  },
} as const;

/**
 * Accessibility-compliant contrast ratios
 */
export const ACCESSIBILITY_CONTRAST: ContrastRequirements = {
  normal: {
    AA: 4.5,
    AAA: 7.0,
  },
  large: {
    AA: 3.0,
    AAA: 4.5,
  },
  crisis: 7.0,
} as const;

// === EXPORTS ===

export type {
  ResponsiveValue,
  DeviceTokens,
  DesignSystemPerformance,
  DesignSystemOptimization,
  ThemeContext,
  Breakpoints,
};