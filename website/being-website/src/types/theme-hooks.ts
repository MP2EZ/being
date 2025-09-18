/**
 * Being. Website - Theme Hook Type Definitions
 * Comprehensive TypeScript types for theme-related React hooks
 * 
 * Features:
 * - Clinical-grade theme hook interfaces
 * - Performance-optimized hook patterns
 * - Accessibility-aware hook types
 * - Crisis-safe theme management
 * - Developer experience optimization
 */

import type { 
  ThemeMode,
  ThemeVariant,
  ColorPalette,
  ClinicalColorRequirements,
  ThemeConfig,
  ThemeContextState,
  ThemeContextActions,
  ThemePerformanceMetrics,
  AccessibilityValidation,
  AccessibilityLevel,
  CrisisResponseConstraints,
  SystemThemePreference,
  ThemeTransitionState,
  HexColor,
} from './theme';

import type {
  ColorManipulation,
  ThemeError,
  ThemeValidationResult,
  AnimationPreferences,
  ThemeComputationCache,
  CSSCustomProperties,
} from './theme-utils';

// ============================================================================
// CORE THEME HOOK TYPES
// ============================================================================

/**
 * Main theme hook return interface
 * Provides complete theme system access with clinical safety
 */
export interface UseThemeReturn {
  // Current state
  readonly mode: ThemeMode;
  readonly variant: ThemeVariant;
  readonly colors: ColorPalette;
  readonly clinical: ClinicalColorRequirements;
  readonly isLoading: boolean;
  readonly error: ThemeError | null;
  readonly systemPreference: SystemThemePreference;
  readonly transitionState: ThemeTransitionState;
  
  // Actions
  readonly setMode: (mode: ThemeMode) => Promise<void>;
  readonly setVariant: (variant: ThemeVariant) => Promise<void>;
  readonly toggleMode: () => Promise<void>;
  readonly resetToSystem: () => Promise<void>;
  
  // Clinical functions
  readonly enableCrisisMode: () => Promise<void>;
  readonly disableCrisisMode: () => Promise<void>;
  readonly isCrisisMode: boolean;
  
  // Utilities
  readonly getOptimalTextColor: (backgroundColor: HexColor) => HexColor;
  readonly checkContrast: (fg: HexColor, bg: HexColor) => number;
  readonly isAccessible: (fg: HexColor, bg: HexColor, level?: AccessibilityLevel) => boolean;
  
  // Configuration
  readonly config: ThemeConfig;
  readonly updateConfig: (config: Partial<ThemeConfig>) => Promise<void>;
}

/**
 * Lightweight theme colors hook
 * Optimized for components that only need color access
 */
export interface UseThemeColorsReturn {
  readonly colors: ColorPalette;
  readonly clinical: ClinicalColorRequirements;
  readonly variant: ThemeVariant;
  readonly mode: ThemeMode;
  readonly isLoading: boolean;
  readonly cssVariables: CSSCustomProperties;
  readonly isDark: boolean;
  readonly isLight: boolean;
}

/**
 * Theme colors hook configuration
 */
export interface UseThemeColorsOptions {
  readonly enableMemoization?: boolean;
  readonly includeComputedColors?: boolean;
  readonly includeClinicalColors?: boolean;
  readonly includeCssVariables?: boolean;
  readonly watchSystemPreference?: boolean;
}

// ============================================================================
// PERFORMANCE OPTIMIZATION HOOK TYPES
// ============================================================================

/**
 * Theme performance monitoring hook
 */
export interface UseThemePerformanceReturn {
  readonly metrics: ThemePerformanceMetrics | null;
  readonly isOptimal: boolean;
  readonly isMonitoring: boolean;
  readonly recommendations: readonly string[];
  
  // Actions
  readonly startMonitoring: () => void;
  readonly stopMonitoring: () => void;
  readonly measureNow: () => Promise<ThemePerformanceMetrics>;
  readonly optimize: () => Promise<void>;
  readonly resetMetrics: () => void;
  
  // Performance checks
  readonly checkTransitionPerformance: () => Promise<boolean>;
  readonly checkRenderPerformance: () => Promise<boolean>;
  readonly checkMemoryUsage: () => Promise<boolean>;
}

/**
 * Performance monitoring configuration
 */
export interface UseThemePerformanceOptions {
  readonly enableAutoOptimization?: boolean;
  readonly monitoringInterval?: number; // ms
  readonly performanceThreshold?: {
    readonly transition?: number;
    readonly render?: number;
    readonly memory?: number;
  };
  readonly onThresholdExceeded?: (metric: string, value: number) => void;
  readonly onOptimizationApplied?: (optimization: string) => void;
}

/**
 * Memoized theme values hook
 */
export interface UseThemeMemoisedReturn<T> {
  readonly value: T;
  readonly isStale: boolean;
  readonly lastUpdate: Date;
  readonly invalidate: () => void;
  readonly refresh: () => Promise<T>;
}

/**
 * Theme computation cache hook
 */
export interface UseThemeCacheReturn {
  readonly cache: ThemeComputationCache;
  readonly hitRate: number;
  readonly size: number;
  readonly maxSize: number;
  
  // Cache management
  readonly clear: () => void;
  readonly invalidate: (key: string) => void;
  readonly precompute: (keys: readonly string[]) => Promise<void>;
  readonly optimize: () => void;
  
  // Cache utilities
  readonly get: <T>(key: string) => T | undefined;
  readonly set: <T>(key: string, value: T) => void;
  readonly has: (key: string) => boolean;
}

// ============================================================================
// ACCESSIBILITY HOOK TYPES
// ============================================================================

/**
 * Theme accessibility validation hook
 */
export interface UseThemeAccessibilityReturn {
  readonly validation: AccessibilityValidation | null;
  readonly isValidating: boolean;
  readonly level: AccessibilityLevel;
  readonly violations: readonly string[];
  readonly score: number; // 0-100
  
  // Actions
  readonly validate: () => Promise<AccessibilityValidation>;
  readonly validateColors: (
    foreground: HexColor, 
    background: HexColor
  ) => Promise<boolean>;
  readonly fixViolation: (violationId: string) => Promise<boolean>;
  readonly setLevel: (level: AccessibilityLevel) => void;
  
  // Utilities
  readonly getContrastRatio: (fg: HexColor, bg: HexColor) => number;
  readonly suggestColors: (
    baseColor: HexColor, 
    level: AccessibilityLevel
  ) => readonly HexColor[];
  readonly checkColorBlindness: (colors: readonly HexColor[]) => boolean;
}

/**
 * Accessibility validation options
 */
export interface UseThemeAccessibilityOptions {
  readonly autoValidate?: boolean;
  readonly validationInterval?: number; // ms
  readonly includeColorBlindnessCheck?: boolean;
  readonly includeMotionCheck?: boolean;
  readonly onViolationDetected?: (violation: string) => void;
  readonly onValidationComplete?: (score: number) => void;
}

/**
 * Motion preferences hook
 */
export interface UseMotionPreferencesReturn {
  readonly prefersReducedMotion: boolean;
  readonly animationPreferences: AnimationPreferences;
  readonly respectSystemPreferences: boolean;
  
  // Utilities
  readonly shouldAnimate: (property: string) => boolean;
  readonly getOptimalDuration: (baseMs: number) => number;
  readonly createTransition: (property: string, duration?: number) => string;
  readonly disableAnimations: () => void;
  readonly enableAnimations: () => void;
}

// ============================================================================
// CLINICAL & CRISIS HOOK TYPES
// ============================================================================

/**
 * Crisis-safe theme management hook
 */
export interface UseCrisisThemeReturn {
  readonly isActive: boolean;
  readonly colors: ColorPalette;
  readonly responseTime: number;
  readonly constraints: CrisisResponseConstraints;
  
  // Crisis management
  readonly activate: () => Promise<void>;
  readonly deactivate: () => Promise<void>;
  readonly toggle: () => Promise<void>;
  
  // Validation
  readonly validateResponseTime: () => Promise<boolean>;
  readonly validateColors: () => Promise<boolean>;
  readonly validateContrast: () => Promise<boolean>;
  
  // Utilities
  readonly getCrisisColors: () => ColorPalette;
  readonly isColorCrisisSafe: (color: HexColor) => boolean;
  readonly optimizeForCrisis: () => Promise<void>;
}

/**
 * Clinical theme validation hook
 */
export interface UseClinicalThemeReturn {
  readonly isValidated: boolean;
  readonly validation: ThemeValidationResult | null;
  readonly clinicalGrade: boolean;
  readonly therapeuticSafety: boolean;
  
  // Clinical validation
  readonly validate: () => Promise<ThemeValidationResult>;
  readonly validateTherapeuticColors: () => Promise<boolean>;
  readonly validateClinicalCompliance: () => Promise<boolean>;
  readonly validateMbctOptimization: () => Promise<boolean>;
  
  // Clinical utilities
  readonly getCalmingColors: () => readonly HexColor[];
  readonly getTherapeuticColors: () => ClinicalColorRequirements;
  readonly isColorTherapeuticallySafe: (color: HexColor) => boolean;
  readonly optimizeForTherapy: () => Promise<void>;
}

/**
 * Clinical validation options
 */
export interface UseClinicalThemeOptions {
  readonly autoValidate?: boolean;
  readonly strictMode?: boolean;
  readonly validateTherapeuticEffectiveness?: boolean;
  readonly validateColorPsychology?: boolean;
  readonly onValidationFailed?: (result: ThemeValidationResult) => void;
  readonly onClinicalViolation?: (violation: string) => void;
}

// ============================================================================
// UTILITY & HELPER HOOK TYPES
// ============================================================================

/**
 * System theme detection hook
 */
export interface UseSystemThemeReturn {
  readonly preference: SystemThemePreference;
  readonly isSupported: boolean;
  readonly hasPermission: boolean;
  
  // Utilities
  readonly listen: (callback: (preference: SystemThemePreference) => void) => () => void;
  readonly refresh: () => void;
  readonly requestPermission: () => Promise<boolean>;
}

/**
 * Theme persistence hook
 */
export interface UseThemePersistenceReturn {
  readonly isLoaded: boolean;
  readonly isSaving: boolean;
  readonly lastSaved: Date | null;
  readonly storageKey: string;
  
  // Persistence actions
  readonly save: () => Promise<void>;
  readonly load: () => Promise<void>;
  readonly clear: () => Promise<void>;
  readonly migrate: (fromVersion: string, toVersion: string) => Promise<void>;
  
  // Storage utilities
  readonly getStorageSize: () => number;
  readonly isStorageAvailable: () => boolean;
  readonly exportTheme: () => string;
  readonly importTheme: (themeJson: string) => Promise<void>;
}

/**
 * Theme persistence options
 */
export interface UseThemePersistenceOptions {
  readonly storageKey?: string;
  readonly enableEncryption?: boolean;
  readonly enableCompression?: boolean;
  readonly autoSave?: boolean;
  readonly autoSaveDelay?: number; // ms
  readonly onSaveError?: (error: Error) => void;
  readonly onLoadError?: (error: Error) => void;
}

/**
 * Theme transitions hook
 */
export interface UseThemeTransitionsReturn {
  readonly isTransitioning: boolean;
  readonly currentTransition: string | null;
  readonly transitionProgress: number; // 0-1
  readonly transitionDuration: number;
  
  // Transition control
  readonly startTransition: (
    property: string, 
    fromValue: string, 
    toValue: string,
    duration?: number
  ) => Promise<void>;
  readonly stopTransition: () => void;
  readonly pauseTransition: () => void;
  readonly resumeTransition: () => void;
  
  // Transition utilities
  readonly createTransition: (property: string, duration?: number) => string;
  readonly optimizeTransition: (property: string) => string;
  readonly validateTransition: (property: string, duration: number) => boolean;
}

/**
 * Theme debugging hook (development only)
 */
export interface UseThemeDebugReturn {
  readonly logs: readonly string[];
  readonly metrics: Record<string, number>;
  readonly warnings: readonly string[];
  readonly errors: readonly ThemeError[];
  
  // Debug actions
  readonly log: (message: string, level?: 'info' | 'warn' | 'error') => void;
  readonly clearLogs: () => void;
  readonly exportDebugInfo: () => string;
  readonly inspectTheme: () => void;
  
  // Performance debugging
  readonly profileRender: () => void;
  readonly measureTransition: (property: string) => Promise<number>;
  readonly analyzeBundle: () => Promise<{ size: number; composition: Record<string, number> }>;
}

// ============================================================================
// SPECIALIZED COMPONENT HOOK TYPES
// ============================================================================

/**
 * Component-specific theme hook for buttons
 */
export interface UseButtonThemeReturn {
  readonly colors: {
    readonly primary: { bg: HexColor; fg: HexColor; border: HexColor };
    readonly secondary: { bg: HexColor; fg: HexColor; border: HexColor };
    readonly clinical: { bg: HexColor; fg: HexColor; border: HexColor };
    readonly crisis: { bg: HexColor; fg: HexColor; border: HexColor };
  };
  readonly states: {
    readonly hover: Record<string, HexColor>;
    readonly active: Record<string, HexColor>;
    readonly disabled: Record<string, HexColor>;
    readonly focus: Record<string, HexColor>;
  };
  readonly styles: Record<string, React.CSSProperties>;
  readonly classes: Record<string, string>;
}

/**
 * Component-specific theme hook for forms
 */
export interface UseFormThemeReturn {
  readonly colors: {
    readonly input: { bg: HexColor; fg: HexColor; border: HexColor };
    readonly label: HexColor;
    readonly error: HexColor;
    readonly success: HexColor;
    readonly focus: HexColor;
  };
  readonly validation: {
    readonly isValid: (value: string) => boolean;
    readonly getErrorColor: (errorType: string) => HexColor;
    readonly getSuccessColor: () => HexColor;
  };
  readonly styles: Record<string, React.CSSProperties>;
}

/**
 * Assessment-specific theme hook
 */
export interface UseAssessmentThemeReturn {
  readonly colors: {
    readonly neutral: HexColor;
    readonly progress: HexColor;
    readonly completed: HexColor;
    readonly crisis: HexColor;
  };
  readonly clinical: {
    readonly phq9Colors: Record<string, HexColor>;
    readonly gad7Colors: Record<string, HexColor>;
    readonly severityColors: Record<string, HexColor>;
  };
  readonly accessibility: {
    readonly highContrast: boolean;
    readonly colorBlindSafe: boolean;
    readonly reducedMotion: boolean;
  };
}

// ============================================================================
// HOOK OPTIONS & CONFIGURATION TYPES
// ============================================================================

/**
 * Base hook options interface
 */
export interface BaseThemeHookOptions {
  readonly enabled?: boolean;
  readonly suspense?: boolean;
  readonly errorBoundary?: boolean;
  readonly devMode?: boolean;
}

/**
 * Performance hook options
 */
export interface PerformanceHookOptions extends BaseThemeHookOptions {
  readonly enableMemoization?: boolean;
  readonly cacheSize?: number;
  readonly measureRender?: boolean;
  readonly measureTransition?: boolean;
  readonly profileMemory?: boolean;
}

/**
 * Clinical hook options
 */
export interface ClinicalHookOptions extends BaseThemeHookOptions {
  readonly strictValidation?: boolean;
  readonly therapeuticMode?: boolean;
  readonly crisisMode?: boolean;
  readonly accessibilityLevel?: AccessibilityLevel;
}

// ============================================================================
// HOOK FACTORY TYPES
// ============================================================================

/**
 * Theme hook factory interface
 */
export interface ThemeHookFactory {
  readonly createUseTheme: (options?: BaseThemeHookOptions) => () => UseThemeReturn;
  readonly createUseThemeColors: (options?: UseThemeColorsOptions) => () => UseThemeColorsReturn;
  readonly createUseThemePerformance: (options?: UseThemePerformanceOptions) => () => UseThemePerformanceReturn;
  readonly createUseThemeAccessibility: (options?: UseThemeAccessibilityOptions) => () => UseThemeAccessibilityReturn;
}

/**
 * Clinical hook factory
 */
export interface ClinicalHookFactory {
  readonly createUseCrisisTheme: (options?: ClinicalHookOptions) => () => UseCrisisThemeReturn;
  readonly createUseClinicalTheme: (options?: UseClinicalThemeOptions) => () => UseClinicalThemeReturn;
  readonly createUseAssessmentTheme: (options?: ClinicalHookOptions) => () => UseAssessmentThemeReturn;
}

// ============================================================================
// ADVANCED HOOK TYPES
// ============================================================================

/**
 * Compound hook that combines multiple theme hooks
 */
export interface UseThemeSystemReturn {
  readonly theme: UseThemeReturn;
  readonly colors: UseThemeColorsReturn;
  readonly performance: UseThemePerformanceReturn;
  readonly accessibility: UseThemeAccessibilityReturn;
  readonly clinical: UseClinicalThemeReturn;
  readonly crisis: UseCrisisThemeReturn;
  readonly system: UseSystemThemeReturn;
  readonly persistence: UseThemePersistenceReturn;
}

/**
 * Selector-based theme hook for optimized re-renders
 */
export type UseThemeSelector<T> = (
  selector: (state: ThemeContextState) => T,
  deps?: readonly unknown[]
) => T;

/**
 * Async theme hook for lazy-loaded theme features
 */
export interface UseAsyncThemeReturn<T> {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly error: ThemeError | null;
  readonly refetch: () => Promise<T>;
  readonly reset: () => void;
}

// ============================================================================
// TYPE UTILITIES & HELPERS
// ============================================================================

/**
 * Extract hook return type
 */
export type ExtractHookReturn<T> = T extends (...args: any[]) => infer R ? R : never;

/**
 * Hook options type extractor
 */
export type ExtractHookOptions<T> = T extends (options: infer O) => any ? O : never;

/**
 * Make hook return type partial
 */
export type PartialHookReturn<T> = {
  readonly [K in keyof T]?: T[K];
};

/**
 * Require specific properties in hook return
 */
export type RequireHookProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================================================
// EXPORTS
// ============================================================================

// Types are exported via interface/type declarations above