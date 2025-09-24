/**
 * Being. Website - Dark Mode Theme Type Definitions
 * Clinical-grade TypeScript types for comprehensive theme system
 * 
 * Features:
 * - Strict type safety for clinical components
 * - Performance-optimized patterns
 * - Accessibility compliance (WCAG AA/AAA)
 * - Runtime safety validation
 * - Developer experience optimization
 */

// ============================================================================
// CORE THEME TYPE SYSTEM
// ============================================================================

/**
 * Theme mode union type with strict constraints
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Theme variant types for therapeutic contexts
 * Matches existing THEME_VARIANTS from constants
 */
export type ThemeVariant = 'morning' | 'midday' | 'evening';

/**
 * System preference detection
 */
export type SystemThemePreference = 'light' | 'dark' | 'no-preference';

/**
 * Theme transition states for performance optimization
 */
export type ThemeTransitionState = 'idle' | 'transitioning' | 'complete' | 'error';

// ============================================================================
// COLOR SYSTEM TYPES
// ============================================================================

/**
 * Base color palette interface with semantic naming
 */
export interface ColorPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly info: string;
  readonly background: string;
  readonly foreground: string;
  readonly muted: string;
  readonly accent: string;
  readonly border: string;
  readonly card: string;
  readonly cardForeground: string;
  readonly popover: string;
  readonly popoverForeground: string;
  readonly input: string;
  readonly ring: string;
}

/**
 * Clinical-specific color requirements
 */
export interface ClinicalColorRequirements {
  readonly crisis: {
    readonly background: string;
    readonly foreground: string;
    readonly border: string;
    readonly contrastRatio: number; // Must be >= 7:1 for crisis components
  };
  readonly therapeutic: {
    readonly calm: string;
    readonly focus: string;
    readonly gentle: string;
  };
  readonly assessment: {
    readonly neutral: string;
    readonly progress: string;
    readonly completed: string;
  };
}

/**
 * Theme color system with light/dark variants
 */
export interface ThemeColorSystem {
  readonly light: ColorPalette;
  readonly dark: ColorPalette;
  readonly clinical: ClinicalColorRequirements;
}

/**
 * Extended color system with variant support
 */
export interface VariantColorSystem {
  readonly morning: ThemeColorSystem;
  readonly midday: ThemeColorSystem;
  readonly evening: ThemeColorSystem;
}

// ============================================================================
// ACCESSIBILITY CONSTRAINT TYPES
// ============================================================================

/**
 * Accessibility compliance levels
 */
export type AccessibilityLevel = 'AA' | 'AAA';

/**
 * Contrast ratio requirements by component type
 */
export interface ContrastRequirements {
  readonly normalText: number;    // 4.5:1 for AA, 7:1 for AAA
  readonly largeText: number;     // 3:1 for AA, 4.5:1 for AAA
  readonly uiComponents: number;  // 3:1 for AA/AAA
  readonly crisis: number;        // Always 7:1 for safety
  readonly therapeutic: number;   // 4.5:1 minimum for clinical content
}

/**
 * Accessibility validation result
 */
export interface AccessibilityValidation {
  readonly isValid: boolean;
  readonly level: AccessibilityLevel;
  readonly violations: readonly AccessibilityViolation[];
  readonly score: number; // 0-100 accessibility score
}

/**
 * Individual accessibility violation
 */
export interface AccessibilityViolation {
  readonly rule: string;
  readonly severity: 'minor' | 'moderate' | 'serious' | 'critical';
  readonly element: string;
  readonly description: string;
  readonly fix: string;
}

// ============================================================================
// PERFORMANCE OPTIMIZATION TYPES
// ============================================================================

/**
 * Theme performance constraints
 */
export interface ThemePerformanceConstraints {
  readonly maxTransitionDuration: number;  // ms - <200ms for therapeutic UX
  readonly maxRenderTime: number;         // ms - <16ms for 60fps
  readonly maxBundleSize: number;         // bytes - theme-related code
  readonly maxCssVariables: number;       // count - CSS custom properties
  readonly memoryThreshold: number;       // MB - theme state memory usage
}

/**
 * Theme performance metrics
 */
export interface ThemePerformanceMetrics {
  readonly transitionDuration: number;
  readonly renderTime: number;
  readonly bundleSize: number;
  readonly cssVariableCount: number;
  readonly memoryUsage: number;
  readonly lastMeasured: Date;
}

/**
 * Performance validation result
 */
export interface PerformanceValidation {
  readonly isOptimal: boolean;
  readonly metrics: ThemePerformanceMetrics;
  readonly constraints: ThemePerformanceConstraints;
  readonly recommendations: readonly string[];
}

// ============================================================================
// CLINICAL SAFETY TYPES
// ============================================================================

/**
 * Clinical component theme requirements
 */
export interface ClinicalThemeRequirements {
  readonly minimumContrast: number;         // Crisis components: 7:1
  readonly maxResponseTime: number;         // <200ms for crisis button
  readonly colorBlindnessSupport: boolean;  // Must work for all types
  readonly reducedMotionCompliance: boolean; // Respect prefers-reduced-motion
  readonly therapeuticSafety: boolean;      // Safe colors for mental health
}

/**
 * Crisis response constraint types
 */
export interface CrisisResponseConstraints {
  readonly maxButtonResponseTime: number;  // <200ms
  readonly minContrastRatio: number;       // 7:1 for crisis elements
  readonly maxTransitionDelay: number;     // <50ms for crisis state changes
  readonly emergencyModeColors: ColorPalette; // High-contrast emergency palette
}

/**
 * Therapeutic effectiveness constraints
 */
export interface TherapeuticConstraints {
  readonly calmingColors: readonly string[];      // Colors proven to reduce anxiety
  readonly avoidColors: readonly string[];        // Colors to avoid (red for crisis)
  readonly breathingSpaceSupport: boolean;       // Support for breathing exercises
  readonly mindfulnessOptimized: boolean;        // Optimized for MBCT practices
}

// ============================================================================
// THEME CONFIGURATION TYPES
// ============================================================================

/**
 * Complete theme configuration interface
 */
export interface ThemeConfig {
  readonly mode: ThemeMode;
  readonly variant: ThemeVariant;
  readonly colors: VariantColorSystem;
  readonly accessibility: {
    readonly level: AccessibilityLevel;
    readonly requirements: ContrastRequirements;
  };
  readonly performance: ThemePerformanceConstraints;
  readonly clinical: ClinicalThemeRequirements;
  readonly crisis: CrisisResponseConstraints;
  readonly therapeutic: TherapeuticConstraints;
  readonly respectSystemTheme: boolean;
  readonly enableTransitions: boolean;
  readonly version: string; // For cache busting
}

/**
 * Theme configuration with validation
 */
export interface ValidatedThemeConfig extends ThemeConfig {
  readonly __validated: true;
  readonly validationResult: {
    readonly accessibility: AccessibilityValidation;
    readonly performance: PerformanceValidation;
    readonly clinical: ClinicalValidationResult;
  };
  readonly validatedAt: Date;
  readonly validatedBy: string;
}

/**
 * Clinical validation result for themes
 */
export interface ClinicalValidationResult {
  readonly isTherapeuticallySafe: boolean;
  readonly crisisCompliant: boolean;
  readonly mbctOptimized: boolean;
  readonly colorBlindnessSupport: boolean;
  readonly findings: readonly ClinicalFinding[];
}

/**
 * Individual clinical finding
 */
export interface ClinicalFinding {
  readonly category: 'safety' | 'effectiveness' | 'accessibility' | 'performance';
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly message: string;
  readonly recommendation: string;
  readonly impact: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// THEME CONTEXT & PROVIDER TYPES
// ============================================================================

/**
 * Theme context state interface
 */
export interface ThemeContextState {
  readonly currentMode: ThemeMode;
  readonly currentVariant: ThemeVariant;
  readonly systemPreference: SystemThemePreference;
  readonly transitionState: ThemeTransitionState;
  readonly config: ThemeConfig;
  readonly performanceMetrics: ThemePerformanceMetrics | null;
  readonly accessibility: {
    readonly level: AccessibilityLevel;
    readonly violations: readonly AccessibilityViolation[];
  };
}

/**
 * Theme context actions interface
 */
export interface ThemeContextActions {
  readonly setMode: (mode: ThemeMode) => Promise<void>;
  readonly setVariant: (variant: ThemeVariant) => Promise<void>;
  readonly toggleMode: () => Promise<void>;
  readonly resetToSystem: () => Promise<void>;
  readonly validateAccessibility: () => Promise<AccessibilityValidation>;
  readonly measurePerformance: () => Promise<ThemePerformanceMetrics>;
  readonly enableCrisisMode: () => Promise<void>;
  readonly disableCrisisMode: () => Promise<void>;
}

/**
 * Complete theme context interface
 */
export interface ThemeContextValue extends ThemeContextState, ThemeContextActions {
  readonly isInitialized: boolean;
  readonly error: Error | null;
}

/**
 * Theme provider props interface
 */
export interface ThemeProviderProps {
  readonly children: React.ReactNode;
  readonly defaultMode?: ThemeMode;
  readonly defaultVariant?: ThemeVariant;
  readonly config?: Partial<ThemeConfig>;
  readonly enablePerformanceMonitoring?: boolean;
  readonly enableAccessibilityValidation?: boolean;
  readonly onThemeChange?: (state: ThemeContextState) => void;
  readonly onError?: (error: Error) => void;
}

// ============================================================================
// STORAGE & PERSISTENCE TYPES
// ============================================================================

/**
 * Theme persistence configuration
 */
export interface ThemePersistenceConfig {
  readonly enabled: boolean;
  readonly storageKey: string;
  readonly encryption: boolean;
  readonly compression: boolean;
  readonly ttl: number; // Time to live in seconds
  readonly syncAcrossPages: boolean;
}

/**
 * Persisted theme state
 */
export interface PersistedThemeState {
  readonly mode: ThemeMode;
  readonly variant: ThemeVariant;
  readonly preferences: {
    readonly respectSystemTheme: boolean;
    readonly enableTransitions: boolean;
    readonly accessibilityLevel: AccessibilityLevel;
    readonly performanceMode: 'standard' | 'optimized' | 'clinical';
  };
  readonly timestamp: number;
  readonly version: string;
}

/**
 * AsyncStorage-compatible interface for persistence
 */
export interface ThemeStorage {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
  readonly getAllKeys: () => Promise<readonly string[]>;
}

// ============================================================================
// COMPONENT INTEGRATION TYPES
// ============================================================================

/**
 * Theme-aware component props base interface
 */
export interface ThemeAwareProps {
  readonly theme?: {
    readonly mode?: ThemeMode;
    readonly variant?: ThemeVariant;
    readonly forceColors?: Partial<ColorPalette>;
    readonly disableTransitions?: boolean;
    readonly accessibilityLevel?: AccessibilityLevel;
  };
}

/**
 * Clinical component theme integration
 */
export interface ClinicalThemeProps extends ThemeAwareProps {
  readonly clinicalGrade: boolean;
  readonly crisisMode?: boolean;
  readonly therapeuticOptimization?: boolean;
  readonly emergencyOverrides?: {
    readonly backgroundColor: string;
    readonly textColor: string;
    readonly borderColor: string;
  };
}

/**
 * Performance-optimized theme props
 */
export interface PerformantThemeProps extends ThemeAwareProps {
  readonly enableMemoization?: boolean;
  readonly disableTransitions?: boolean;
  readonly useStaticColors?: boolean;
  readonly preloadStyles?: boolean;
}

/**
 * Component theme utilities interface
 */
export interface ComponentThemeUtils {
  readonly getColors: () => ColorPalette;
  readonly getClinicalColors: () => ClinicalColorRequirements;
  readonly getContrastRatio: (fg: string, bg: string) => number;
  readonly isAccessible: (fg: string, bg: string, level: AccessibilityLevel) => boolean;
  readonly generateStyles: () => Record<string, string>;
  readonly validateClinicalCompliance: () => boolean;
}

// ============================================================================
// HOOK TYPES
// ============================================================================

/**
 * useTheme hook return type
 */
export interface UseThemeReturn extends ThemeContextValue {
  readonly utils: ComponentThemeUtils;
}

/**
 * useThemeColors hook return type
 */
export interface UseThemeColorsReturn {
  readonly colors: ColorPalette;
  readonly clinical: ClinicalColorRequirements;
  readonly variant: ThemeVariant;
  readonly mode: ThemeMode;
  readonly isLoading: boolean;
}

/**
 * useThemePerformance hook return type
 */
export interface UseThemePerformanceReturn {
  readonly metrics: ThemePerformanceMetrics | null;
  readonly isOptimal: boolean;
  readonly measure: () => Promise<ThemePerformanceMetrics>;
  readonly optimize: () => Promise<void>;
  readonly constraints: ThemePerformanceConstraints;
}

/**
 * useThemeAccessibility hook return type
 */
export interface UseThemeAccessibilityReturn {
  readonly level: AccessibilityLevel;
  readonly violations: readonly AccessibilityViolation[];
  readonly isCompliant: boolean;
  readonly validate: () => Promise<AccessibilityValidation>;
  readonly fix: (violation: AccessibilityViolation) => Promise<void>;
}

/**
 * useCrisisTheme hook return type
 */
export interface UseCrisisThemeReturn {
  readonly isActive: boolean;
  readonly colors: ColorPalette;
  readonly constraints: CrisisResponseConstraints;
  readonly enable: () => Promise<void>;
  readonly disable: () => Promise<void>;
  readonly responseTime: number;
}

// ============================================================================
// ADVANCED TYPE UTILITIES
// ============================================================================

/**
 * Conditional types for theme-dependent styling
 */
export type ThemeDependent<T> = {
  readonly light: T;
  readonly dark: T;
};

export type VariantDependent<T> = {
  readonly morning: T;
  readonly midday: T;
  readonly evening: T;
};

export type ThemeAndVariantDependent<T> = {
  readonly light: VariantDependent<T>;
  readonly dark: VariantDependent<T>;
};

/**
 * Brand types for color validation
 */
export type HexColor = string & { readonly __brand: 'HexColor' };
export type RgbColor = string & { readonly __brand: 'RgbColor' };
export type HslColor = string & { readonly __brand: 'HslColor' };
export type CssColor = HexColor | RgbColor | HslColor;

/**
 * Utility types for theme-aware components
 */
export type WithThemeMode<T> = T & { readonly mode: ThemeMode };
export type WithThemeVariant<T> = T & { readonly variant: ThemeVariant };
export type WithFullTheme<T> = T & { readonly theme: ThemeConfig };

/**
 * Clinical safety type guards
 */
export type ClinicallyValidatedTheme<T> = T & {
  readonly __clinicallyValidated: true;
  readonly __validationLevel: 'standard' | 'clinical' | 'crisis';
  readonly __safetyProfile: 'general' | 'therapeutic' | 'emergency';
};

/**
 * Performance-optimized type patterns
 */
export type MemoizedTheme<T> = T & {
  readonly __memoized: true;
  readonly __cacheKey: string;
  readonly __lastUpdate: number;
};

/**
 * Generic types for theme-aware components
 */
export type ThemeComponent<TProps = {}> = React.ComponentType<TProps & ThemeAwareProps>;
export type ClinicalThemeComponent<TProps = {}> = React.ComponentType<TProps & ClinicalThemeProps>;

/**
 * Theme transition utility types
 */
export type ThemeTransition<T> = {
  readonly from: T;
  readonly to: T;
  readonly duration: number;
  readonly easing: string;
  readonly onComplete?: () => void;
};

export type AnimatedThemeProperty<T> = {
  readonly value: T;
  readonly transition: ThemeTransition<T>;
  readonly isAnimating: boolean;
};

// ============================================================================
// TYPE GUARDS & VALIDATION
// ============================================================================

/**
 * Type guard for valid theme mode
 */
export const isThemeMode = (value: unknown): value is ThemeMode => {
  return typeof value === 'string' && ['light', 'dark', 'auto'].includes(value);
};

/**
 * Type guard for valid theme variant
 */
export const isThemeVariant = (value: unknown): value is ThemeVariant => {
  return typeof value === 'string' && ['morning', 'midday', 'evening'].includes(value);
};

/**
 * Type guard for valid hex color
 */
export const isHexColor = (value: unknown): value is HexColor => {
  return typeof value === 'string' && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
};

/**
 * Type guard for accessibility level
 */
export const isAccessibilityLevel = (value: unknown): value is AccessibilityLevel => {
  return typeof value === 'string' && ['AA', 'AAA'].includes(value);
};

/**
 * Type guard for clinical validation
 */
export const isClinicallyValidatedTheme = <T>(
  value: T
): value is ClinicallyValidatedTheme<T> => {
  return typeof value === 'object' && value !== null && 
         '__clinicallyValidated' in value && value.__clinicallyValidated === true;
};

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Theme configuration factory type
 */
export interface ThemeConfigFactory {
  readonly createConfig: (options: Partial<ThemeConfig>) => ValidatedThemeConfig;
  readonly validateConfig: (config: ThemeConfig) => Promise<ValidatedThemeConfig>;
  readonly mergeConfigs: (base: ThemeConfig, override: Partial<ThemeConfig>) => ThemeConfig;
  readonly optimizeForPerformance: (config: ThemeConfig) => ThemeConfig;
  readonly enableClinicalMode: (config: ThemeConfig) => ThemeConfig;
}

/**
 * Theme migration utility type
 */
export interface ThemeMigration {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly migrate: (oldState: PersistedThemeState) => PersistedThemeState;
  readonly validate: (state: PersistedThemeState) => boolean;
}

/**
 * Theme analytics tracking
 */
export interface ThemeAnalytics {
  readonly trackModeChange: (from: ThemeMode, to: ThemeMode) => void;
  readonly trackVariantChange: (from: ThemeVariant, to: ThemeVariant) => void;
  readonly trackPerformanceIssue: (metric: string, value: number, threshold: number) => void;
  readonly trackAccessibilityViolation: (violation: AccessibilityViolation) => void;
  readonly trackCrisisActivation: (responseTime: number) => void;
}

// ============================================================================
// EXPORTS & TYPE REGISTRY
// ============================================================================

/**
 * Centralized export of all theme-related types for easy consumption
 */
export interface ThemeTypeRegistry {
  // Core types
  readonly ThemeMode: ThemeMode;
  readonly ThemeVariant: ThemeVariant;
  readonly ThemeConfig: ThemeConfig;
  
  // Color system
  readonly ColorPalette: ColorPalette;
  readonly ThemeColorSystem: ThemeColorSystem;
  readonly ClinicalColorRequirements: ClinicalColorRequirements;
  
  // Context & state
  readonly ThemeContextValue: ThemeContextValue;
  readonly ThemeProviderProps: ThemeProviderProps;
  
  // Component integration
  readonly ThemeAwareProps: ThemeAwareProps;
  readonly ClinicalThemeProps: ClinicalThemeProps;
  
  // Hooks
  readonly UseThemeReturn: UseThemeReturn;
  readonly UseThemeColorsReturn: UseThemeColorsReturn;
  
  // Validation & safety
  readonly AccessibilityValidation: AccessibilityValidation;
  readonly ClinicalValidationResult: ClinicalValidationResult;
  readonly PerformanceValidation: PerformanceValidation;
}

/**
 * Default export for comprehensive theme type system
 */
export interface Being.ThemeSystem extends ThemeTypeRegistry {
  readonly version: '1.0.0';
  readonly compatibility: {
    readonly reactNative: boolean;
    readonly nextjs: boolean;
    readonly typescript: string;
  };
  readonly features: {
    readonly clinicalGrade: boolean;
    readonly accessibilityCompliant: boolean;
    readonly performanceOptimized: boolean;
    readonly crisisSafe: boolean;
  };
}

// Types are exported via interface/type declarations above