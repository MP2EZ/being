/**
 * Being. Website - Theme Utility Types
 * Advanced TypeScript utilities for theme system implementation
 * 
 * Features:
 * - Generic type helpers for theme-aware components
 * - Performance optimization type patterns
 * - Clinical safety constraint types
 * - Developer experience enhancements
 */

import type {
  ThemeMode,
  ThemeVariant,
  ColorPalette,
  ClinicalColorRequirements,
  AccessibilityLevel,
  ThemeConfig,
  CrisisResponseConstraints,
  ThemePerformanceConstraints,
  HexColor,
  ThemeContextState,
} from './theme';

// ============================================================================
// CONDITIONAL TYPE UTILITIES
// ============================================================================

/**
 * Conditional types based on theme mode
 */
export type IfLight<T, F = never> = ThemeMode extends 'light' ? T : F;
export type IfDark<T, F = never> = ThemeMode extends 'dark' ? T : F;
export type IfAuto<T, F = never> = ThemeMode extends 'auto' ? T : F;

/**
 * Conditional types based on theme variant
 */
export type IfMorning<T, F = never> = ThemeVariant extends 'morning' ? T : F;
export type IfMidday<T, F = never> = ThemeVariant extends 'midday' ? T : F;
export type IfEvening<T, F = never> = ThemeVariant extends 'evening' ? T : F;

/**
 * Theme-dependent property resolver
 */
export type ResolveThemeProperty<T> = T extends Record<ThemeMode, infer U> ? U : T;

/**
 * Variant-dependent property resolver
 */
export type ResolveVariantProperty<T> = T extends Record<ThemeVariant, infer U> ? U : T;

// ============================================================================
// COLOR MANIPULATION TYPES
// ============================================================================

/**
 * Color manipulation utility types
 */
export interface ColorManipulation {
  readonly lighten: (color: HexColor, amount: number) => HexColor;
  readonly darken: (color: HexColor, amount: number) => HexColor;
  readonly alpha: (color: HexColor, alpha: number) => string;
  readonly contrast: (fg: HexColor, bg: HexColor) => number;
  readonly isLight: (color: HexColor) => boolean;
  readonly isDark: (color: HexColor) => boolean;
  readonly getOptimalText: (bg: HexColor) => HexColor;
}

/**
 * Color scheme generation utilities
 */
export interface ColorSchemeGenerator {
  readonly generatePalette: (primary: HexColor, mode: ThemeMode) => ColorPalette;
  readonly generateClinicalColors: (base: ColorPalette) => ClinicalColorRequirements;
  readonly generateAccessibleVariants: (
    colors: ColorPalette, 
    level: AccessibilityLevel
  ) => ColorPalette;
  readonly generateCrisisColors: () => ColorPalette;
}

/**
 * Color validation utilities
 */
export interface ColorValidator {
  readonly validateContrast: (
    fg: HexColor, 
    bg: HexColor, 
    level: AccessibilityLevel
  ) => boolean;
  readonly validateClinicalSafety: (palette: ColorPalette) => boolean;
  readonly validateCrisisCompliance: (
    colors: ColorPalette,
    constraints: CrisisResponseConstraints
  ) => boolean;
  readonly validateTherapeuticAppropriate: (colors: ColorPalette) => boolean;
}

// ============================================================================
// CSS-IN-JS INTEGRATION TYPES
// ============================================================================

/**
 * CSS custom properties type mapping
 */
export interface CSSCustomProperties {
  readonly '--theme-mode': ThemeMode;
  readonly '--theme-variant': ThemeVariant;
  readonly '--color-primary': string;
  readonly '--color-secondary': string;
  readonly '--color-success': string;
  readonly '--color-warning': string;
  readonly '--color-error': string;
  readonly '--color-info': string;
  readonly '--color-background': string;
  readonly '--color-foreground': string;
  readonly '--color-muted': string;
  readonly '--color-accent': string;
  readonly '--color-border': string;
  readonly '--color-card': string;
  readonly '--color-card-foreground': string;
  readonly '--color-clinical-crisis-bg': string;
  readonly '--color-clinical-crisis-fg': string;
  readonly '--color-therapeutic-calm': string;
  readonly '--color-therapeutic-focus': string;
  readonly '--transition-duration': string;
  readonly '--animation-easing': string;
}

/**
 * Tailwind CSS class generation utilities
 */
export interface TailwindClassGenerator {
  readonly generateBackgroundClasses: (palette: ColorPalette) => Record<string, string>;
  readonly generateTextClasses: (palette: ColorPalette) => Record<string, string>;
  readonly generateBorderClasses: (palette: ColorPalette) => Record<string, string>;
  readonly generateUtilityClasses: (mode: ThemeMode, variant: ThemeVariant) => string[];
  readonly generateResponsiveClasses: (
    baseClasses: string[],
    breakpoints: readonly string[]
  ) => string[];
}

/**
 * Styled-components theme integration
 */
export interface StyledThemeProps {
  readonly theme: {
    readonly mode: ThemeMode;
    readonly variant: ThemeVariant;
    readonly colors: ColorPalette;
    readonly clinical: ClinicalColorRequirements;
    readonly spacing: Record<string, string>;
    readonly borderRadius: Record<string, string>;
    readonly boxShadow: Record<string, string>;
    readonly fontSize: Record<string, string>;
    readonly fontWeight: Record<string, string>;
    readonly lineHeight: Record<string, string>;
    readonly letterSpacing: Record<string, string>;
    readonly zIndex: Record<string, number>;
  };
}

// ============================================================================
// COMPONENT PROP ENHANCEMENT TYPES
// ============================================================================

/**
 * Theme-aware variant props
 */
export type ThemeVariantProps<T extends string> = {
  readonly [K in T]: {
    readonly light?: React.CSSProperties;
    readonly dark?: React.CSSProperties;
  }
};

/**
 * Clinical component theme props
 */
export interface ClinicalComponentThemeProps {
  readonly clinicalMode?: boolean;
  readonly crisisMode?: boolean;
  readonly therapeuticOptimization?: boolean;
  readonly accessibilityLevel?: AccessibilityLevel;
  readonly contrastOverride?: {
    readonly foreground?: HexColor;
    readonly background?: HexColor;
  };
}

/**
 * Performance-aware theme props
 */
export interface PerformanceThemeProps {
  readonly enableMemoization?: boolean;
  readonly preloadStyles?: boolean;
  readonly lazyLoadTheme?: boolean;
  readonly disableTransitions?: boolean;
  readonly staticColorMode?: boolean;
  readonly performanceProfile?: 'standard' | 'optimized' | 'clinical';
}

/**
 * Responsive theme props
 */
export interface ResponsiveThemeProps {
  readonly sm?: Partial<ThemeConfig>;
  readonly md?: Partial<ThemeConfig>;
  readonly lg?: Partial<ThemeConfig>;
  readonly xl?: Partial<ThemeConfig>;
  readonly '2xl'?: Partial<ThemeConfig>;
}

// ============================================================================
// MEMOIZATION & OPTIMIZATION TYPES
// ============================================================================

/**
 * Memoized theme selector types
 */
export type ThemeSelector<T> = (state: ThemeContextState) => T;

export type MemoizedThemeSelector<T> = ThemeSelector<T> & {
  readonly __memoized: true;
  readonly dependencies: readonly (keyof ThemeContextState)[];
  readonly cacheKey: string;
};

/**
 * Theme computation cache
 */
export interface ThemeComputationCache {
  readonly colors: Map<string, ColorPalette>;
  readonly styles: Map<string, React.CSSProperties>;
  readonly classes: Map<string, string>;
  readonly validators: Map<string, boolean>;
  readonly performance: Map<string, number>;
  readonly lastUpdate: Map<string, number>;
}

/**
 * Optimized theme provider state
 */
export interface OptimizedThemeState {
  readonly computed: {
    readonly colors: ColorPalette;
    readonly clinical: ClinicalColorRequirements;
    readonly styles: React.CSSProperties;
    readonly classes: Record<string, string>;
    readonly cssVariables: CSSCustomProperties;
  };
  readonly cache: ThemeComputationCache;
  readonly performance: {
    readonly renderCount: number;
    readonly lastRenderTime: number;
    readonly averageRenderTime: number;
    readonly cacheHitRate: number;
  };
}

// ============================================================================
// ANIMATION & TRANSITION TYPES
// ============================================================================

/**
 * Theme transition configuration
 */
export interface ThemeTransitionConfig {
  readonly duration: {
    readonly fast: number;     // 150ms
    readonly normal: number;   // 200ms
    readonly slow: number;     // 300ms
    readonly clinical: number; // <200ms for therapeutic UX
    readonly crisis: number;   // <50ms for emergency components
  };
  readonly easing: {
    readonly ease: string;
    readonly easeIn: string;
    readonly easeOut: string;
    readonly easeInOut: string;
    readonly therapeutic: string; // Calming easing for mental health UX
  };
  readonly properties: readonly string[]; // CSS properties to animate
}

/**
 * Animation preference detection
 */
export interface AnimationPreferences {
  readonly respectsReducedMotion: boolean;
  readonly prefersReducedMotion: boolean;
  readonly allowedTransitions: readonly string[];
  readonly disallowedTransitions: readonly string[];
  readonly therapeuticAnimations: boolean;
}

/**
 * Theme-aware animation utilities
 */
export interface ThemeAnimationUtils {
  readonly createTransition: (property: string, duration?: number) => string;
  readonly createClinicalTransition: (property: string) => string;
  readonly createCrisisTransition: (property: string) => string;
  readonly shouldAnimate: (property: string) => boolean;
  readonly getOptimalDuration: (complexity: 'simple' | 'medium' | 'complex') => number;
}

// ============================================================================
// ERROR HANDLING & VALIDATION TYPES
// ============================================================================

/**
 * Theme error types
 */
export type ThemeErrorType = 
  | 'INVALID_COLOR'
  | 'ACCESSIBILITY_VIOLATION'
  | 'PERFORMANCE_THRESHOLD_EXCEEDED'
  | 'CLINICAL_SAFETY_VIOLATION'
  | 'CONFIGURATION_ERROR'
  | 'STORAGE_ERROR'
  | 'VALIDATION_FAILED'
  | 'SYSTEM_PREFERENCE_ERROR';

/**
 * Theme error interface
 */
export interface ThemeError extends Error {
  readonly type: ThemeErrorType;
  readonly code: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly context: Record<string, unknown>;
  readonly suggestions: readonly string[];
  readonly clinicalImpact: boolean;
  readonly timestamp: Date;
}

/**
 * Theme validation pipeline
 */
export interface ThemeValidationPipeline {
  readonly validate: (config: ThemeConfig) => Promise<ThemeValidationResult>;
  readonly validators: readonly ThemeValidator[];
  readonly onError: (error: ThemeError) => void;
  readonly onWarning: (warning: ThemeValidationWarning) => void;
}

/**
 * Individual theme validator
 */
export interface ThemeValidator {
  readonly name: string;
  readonly priority: number;
  readonly validate: (config: ThemeConfig) => Promise<ThemeValidationResult>;
  readonly fix?: (config: ThemeConfig) => Promise<ThemeConfig>;
}

/**
 * Theme validation result
 */
export interface ThemeValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ThemeError[];
  readonly warnings: readonly ThemeValidationWarning[];
  readonly score: number; // 0-100 validation score
  readonly recommendations: readonly string[];
  readonly autoFixAvailable: boolean;
}

/**
 * Theme validation warning
 */
export interface ThemeValidationWarning {
  readonly type: 'PERFORMANCE' | 'ACCESSIBILITY' | 'CLINICAL' | 'USABILITY';
  readonly message: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly fix: string;
  readonly impact: 'minimal' | 'moderate' | 'significant';
}

// ============================================================================
// DEVELOPMENT EXPERIENCE TYPES
// ============================================================================

/**
 * Theme debugging utilities
 */
export interface ThemeDebugUtils {
  readonly logThemeState: () => void;
  readonly inspectColors: () => void;
  readonly validateAccessibility: () => void;
  readonly measurePerformance: () => void;
  readonly exportTheme: () => string;
  readonly importTheme: (themeJson: string) => void;
  readonly generateReport: () => ThemeAnalyticsReport;
}

/**
 * Theme analytics report
 */
export interface ThemeAnalyticsReport {
  readonly usage: {
    readonly modeDistribution: Record<ThemeMode, number>;
    readonly variantDistribution: Record<ThemeVariant, number>;
    readonly switchFrequency: number;
    readonly averageSessionDuration: number;
  };
  readonly performance: {
    readonly averageTransitionTime: number;
    readonly renderPerformance: number;
    readonly cacheEfficiency: number;
    readonly memoryUsage: number;
  };
  readonly accessibility: {
    readonly complianceLevel: AccessibilityLevel;
    readonly violationCount: number;
    readonly userAssistiveTechUsage: number;
  };
  readonly clinical: {
    readonly crisisActivations: number;
    readonly therapeuticEffectiveness: number;
    readonly safetyIncidents: number;
  };
  readonly generatedAt: Date;
}

/**
 * Theme development tools
 */
export interface ThemeDevTools {
  readonly colorPicker: {
    readonly pickColor: () => Promise<HexColor>;
    readonly generatePalette: (primary: HexColor) => ColorPalette;
    readonly testContrast: (fg: HexColor, bg: HexColor) => number;
  };
  readonly validator: {
    readonly liveValidation: boolean;
    readonly showWarnings: boolean;
    readonly autoFix: boolean;
  };
  readonly performance: {
    readonly showMetrics: boolean;
    readonly alertThresholds: boolean;
    readonly optimizationSuggestions: boolean;
  };
  readonly preview: {
    readonly showAllVariants: boolean;
    readonly enableA11ySimulation: boolean;
    readonly enableColorBlindnessSimulation: boolean;
  };
}

// ============================================================================
// INTEGRATION PATTERN TYPES
// ============================================================================

/**
 * Theme integration with external libraries
 */
export interface ThemeIntegrationAdapters {
  readonly tailwind: {
    readonly generateConfig: (theme: ThemeConfig) => Record<string, unknown>;
    readonly generateUtilities: (theme: ThemeConfig) => Record<string, string>;
  };
  readonly styledComponents: {
    readonly createThemeProvider: (theme: ThemeConfig) => React.ComponentType;
    readonly withTheme: <T>(Component: React.ComponentType<T>) => React.ComponentType<T>;
  };
  readonly emotion: {
    readonly createTheme: (config: ThemeConfig) => Record<string, unknown>;
    readonly useThemeStyles: () => Record<string, string>;
  };
  readonly materialUI: {
    readonly adaptTheme: (theme: ThemeConfig) => Record<string, unknown>;
    readonly createPalette: (colors: ColorPalette) => Record<string, unknown>;
  };
}

/**
 * Server-side rendering support
 */
export interface SSRThemeSupport {
  readonly extractCriticalCSS: (theme: ThemeConfig) => string;
  readonly generateStaticCSS: (themes: ThemeConfig[]) => string;
  readonly inlineThemeVars: (html: string, theme: ThemeConfig) => string;
  readonly preventFlashOfUnstyled: (theme: ThemeConfig) => string;
}

// ============================================================================
// UTILITY TYPE EXPORTS
// ============================================================================

/**
 * Extract theme-related props from component props
 */
export type ExtractThemeProps<T> = Pick<T, {
  [K in keyof T]: T[K] extends { theme?: unknown } ? K : never
}[keyof T]>;

/**
 * Omit theme props from component props
 */
export type OmitThemeProps<T> = Omit<T, keyof ThemeVariantProps<string> | 'theme'>;

/**
 * Require theme props on component
 */
export type RequireTheme<T> = T & {
  readonly theme: ThemeConfig;
};

/**
 * Make theme props optional
 */
export type OptionalTheme<T> = T & {
  readonly theme?: Partial<ThemeConfig>;
};

/**
 * Theme-aware component factory
 */
export type ThemeComponentFactory<TProps> = (
  baseComponent: React.ComponentType<TProps>
) => React.ComponentType<TProps & ClinicalComponentThemeProps>;

/**
 * Theme utility function type
 */
export type ThemeUtilityFunction<TInput, TOutput> = (
  input: TInput,
  theme: ThemeConfig
) => TOutput;

// Types are exported via interface/type declarations above