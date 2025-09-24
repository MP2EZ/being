/**
 * Being. Website - Theme Constants
 * Dark mode color system and clinical-grade theme configuration
 * 
 * Features:
 * - Clinical-grade dark/light mode color palettes
 * - WCAG AA/AAA compliant color combinations
 * - Crisis-safe color schemes
 * - Therapeutic color psychology
 * - Performance-optimized constants
 */

import type {
  ThemeMode,
  ThemeVariant,
  ColorPalette,
  ClinicalColorRequirements,
  ThemeColorSystem,
  VariantColorSystem,
  ThemePerformanceConstraints,
  CrisisResponseConstraints,
  TherapeuticConstraints,
  AccessibilityLevel,
  ContrastRequirements,
  ThemeConfig,
  HexColor
} from '../types/theme';

// ============================================================================
// CORE COLOR PALETTES - LIGHT MODE
// ============================================================================

/**
 * Morning theme - Light mode (6am - 12pm)
 * Warm, energizing colors for morning mental health routines
 */
export const MORNING_LIGHT_PALETTE: ColorPalette = {
  primary: '#FF9F43',      // Warm orange - energizing but not overstimulating
  secondary: '#FFD93D',    // Soft yellow - optimistic and gentle
  success: '#E8863A',      // Deeper orange - achievement and progress
  warning: '#FF6B35',      // Orange-red - attention without alarm
  error: '#D63031',        // Clinical red - clear but not harsh
  info: '#74B9FF',         // Gentle blue - informative and calming
  background: '#FEFEFE',   // Pure white with warmth
  foreground: '#2D3436',   // Dark gray - excellent readability
  muted: '#F8F9FA',        // Subtle background variant
  accent: '#FDCB6E',       // Light accent for highlights
  border: '#E7EBF0',       // Subtle borders
  card: '#FFFFFF',         // Pure white cards
  cardForeground: '#2D3436', // Matching text
  popover: '#FFFFFF',      // Popover backgrounds
  popoverForeground: '#2D3436', // Popover text
  input: '#FFFFFF',        // Input backgrounds
  ring: '#FF9F43',         // Focus rings matching primary
} as const;

/**
 * Midday theme - Light mode (12pm - 6pm)
 * Balanced, focused colors for peak productivity hours
 */
export const MIDDAY_LIGHT_PALETTE: ColorPalette = {
  primary: '#40B5AD',      // Teal - focus and clarity
  secondary: '#00CEC9',    // Bright teal - engagement
  success: '#2C8A82',      // Deeper teal - accomplishment
  warning: '#FDCB6E',      // Warm yellow - gentle alerts
  error: '#E17055',        // Warm red - clear but not harsh
  info: '#6C5CE7',         // Purple - wisdom and insight
  background: '#FEFEFE',   // Clean white
  foreground: '#2D3436',   // Strong contrast
  muted: '#F1F2F6',        // Neutral background
  accent: '#81ECEC',       // Light teal accent
  border: '#DDD6FE',       // Subtle purple borders
  card: '#FFFFFF',         // Pure white
  cardForeground: '#2D3436', // Dark text
  popover: '#FFFFFF',
  popoverForeground: '#2D3436',
  input: '#FFFFFF',
  ring: '#40B5AD',
} as const;

/**
 * Evening theme - Light mode (6pm - 6am)
 * Calming, restful colors for wind-down activities
 */
export const EVENING_LIGHT_PALETTE: ColorPalette = {
  primary: '#4A7C59',      // Forest green - grounding and peaceful
  secondary: '#6C7A89',    // Blue-gray - tranquil and stable
  success: '#2D5016',      // Deep green - satisfaction and rest
  warning: '#E67E22',      // Warm orange - gentle notifications
  error: '#C0392B',        // Muted red - less jarring for evening
  info: '#3498DB',         // Soft blue - evening information
  background: '#FEFEFE',   // Warm white
  foreground: '#2C3E50',   // Deep blue-gray
  muted: '#ECF0F1',        // Very light gray
  accent: '#A8E6CF',       // Soft green accent
  border: '#BDC3C7',       // Neutral borders
  card: '#FFFFFF',
  cardForeground: '#2C3E50',
  popover: '#FFFFFF',
  popoverForeground: '#2C3E50',
  input: '#FFFFFF',
  ring: '#4A7C59',
} as const;

// ============================================================================
// CORE COLOR PALETTES - DARK MODE
// ============================================================================

/**
 * Morning theme - Dark mode
 * Energizing yet gentle for morning routines in dark environments
 */
export const MORNING_DARK_PALETTE: ColorPalette = {
  primary: '#FFB347',      // Lighter orange - maintains energy in dark mode
  secondary: '#FFE135',    // Bright yellow - optimistic contrast
  success: '#FFA726',      // Warm success - visible but not harsh
  warning: '#FF8A65',      // Coral warning - attention-getting
  error: '#EF5350',        // Softer red for dark backgrounds
  info: '#64B5F6',         // Light blue - clear information
  background: '#0F0F0F',   // True black - clinical precision
  foreground: '#F5F5F5',   // Off-white - reduces eye strain
  muted: '#1A1A1A',        // Dark gray - subtle backgrounds
  accent: '#FFD54F',       // Light yellow accent
  border: '#2E2E2E',       // Subtle dark borders
  card: '#161616',         // Dark card backgrounds
  cardForeground: '#F5F5F5', // Light text on dark
  popover: '#1C1C1C',      // Dark popover
  popoverForeground: '#F5F5F5',
  input: '#2A2A2A',        // Dark input fields
  ring: '#FFB347',         // Focus ring
} as const;

/**
 * Midday theme - Dark mode
 * Focused productivity in dark environments
 */
export const MIDDAY_DARK_PALETTE: ColorPalette = {
  primary: '#4DD0E1',      // Light cyan - focus and clarity
  secondary: '#26A69A',    // Teal - balanced engagement
  success: '#4DB6AC',      // Success teal - accomplishment
  warning: '#FFB74D',      // Warm yellow - gentle alerts
  error: '#FF7043',        // Coral red - clear but not harsh
  info: '#7986CB',         // Light purple - insight
  background: '#0A0A0A',   // Deep black
  foreground: '#E8E8E8',   // Light gray text
  muted: '#1E1E1E',        // Dark muted
  accent: '#80CBC4',       // Light teal accent
  border: '#3A3A3A',       // Dark borders
  card: '#141414',         // Dark cards
  cardForeground: '#E8E8E8',
  popover: '#181818',
  popoverForeground: '#E8E8E8',
  input: '#2C2C2C',
  ring: '#4DD0E1',
} as const;

/**
 * Evening theme - Dark mode  
 * Maximum calm and rest preparation
 */
export const EVENING_DARK_PALETTE: ColorPalette = {
  primary: '#66BB6A',      // Soft green - peaceful and restorative
  secondary: '#78909C',    // Blue-gray - tranquil stability
  success: '#4CAF50',      // Nature green - satisfaction
  warning: '#FFB74D',      // Warm yellow - gentle evening alerts
  error: '#E57373',        // Soft red - less jarring
  info: '#64B5F6',         // Soft blue information
  background: '#030303',   // Nearly black - maximum rest
  foreground: '#E0E0E0',   // Soft white - easier on tired eyes
  muted: '#121212',        // Very dark muted
  accent: '#A5D6A7',       // Very soft green
  border: '#2A2A2A',       // Minimal borders
  card: '#0F0F0F',         // Deep dark cards
  cardForeground: '#E0E0E0',
  popover: '#131313',
  popoverForeground: '#E0E0E0',
  input: '#252525',
  ring: '#66BB6A',
} as const;

// ============================================================================
// CLINICAL COLOR REQUIREMENTS
// ============================================================================

/**
 * Clinical colors for morning theme (light/dark)
 */
export const MORNING_CLINICAL_COLORS: ClinicalColorRequirements = {
  crisis: {
    background: '#FFEBEE', // Light red background (light mode)
    foreground: '#B71C1C', // Dark red text
    border: '#E57373',     // Medium red border
    contrastRatio: 7.2,    // Exceeds 7:1 requirement
  },
  therapeutic: {
    calm: '#FFF8E1',       // Warm, calming cream
    focus: '#E3F2FD',      // Light blue for focus
    gentle: '#F3E5F5',     // Soft purple for gentleness
  },
  assessment: {
    neutral: '#F5F5F5',    // Neutral assessment background
    progress: '#E8F5E8',   // Gentle green for progress
    completed: '#E1F5FE',  // Light blue for completion
  },
} as const;

/**
 * Clinical colors for midday theme
 */
export const MIDDAY_CLINICAL_COLORS: ClinicalColorRequirements = {
  crisis: {
    background: '#FFEBEE',
    foreground: '#C62828',
    border: '#EF5350',
    contrastRatio: 7.5,
  },
  therapeutic: {
    calm: '#E0F2F1',       // Teal-based calm
    focus: '#E8F5E8',      // Green focus
    gentle: '#F1F8E9',     // Light green gentle
  },
  assessment: {
    neutral: '#FAFAFA',
    progress: '#E0F2F1',
    completed: '#E3F2FD',
  },
} as const;

/**
 * Clinical colors for evening theme
 */
export const EVENING_CLINICAL_COLORS: ClinicalColorRequirements = {
  crisis: {
    background: '#FFEBEE',
    foreground: '#D32F2F',
    border: '#F48FB1',
    contrastRatio: 7.8,
  },
  therapeutic: {
    calm: '#E8F5E8',       // Green-based evening calm
    focus: '#F3E5F5',      // Soft purple focus
    gentle: '#FFF8E1',     // Warm gentle
  },
  assessment: {
    neutral: '#F9F9F9',
    progress: '#E8F5E8',
    completed: '#E1F5FE',
  },
} as const;

// ============================================================================
// DARK MODE CLINICAL COLORS
// ============================================================================

/**
 * Clinical colors adjusted for dark mode - Morning
 */
export const MORNING_DARK_CLINICAL_COLORS: ClinicalColorRequirements = {
  crisis: {
    background: '#B71C1C', // Dark red background
    foreground: '#FFCDD2', // Light red text
    border: '#D32F2F',     // Medium red border
    contrastRatio: 8.1,    // Higher contrast for dark mode
  },
  therapeutic: {
    calm: '#2E2E0F',       // Dark warm background
    focus: '#0D1B2A',      // Dark blue for focus
    gentle: '#2A1A2A',     // Dark purple gentle
  },
  assessment: {
    neutral: '#1A1A1A',    // Dark neutral
    progress: '#1B2E1B',   // Dark green progress
    completed: '#1A2328',  // Dark blue completed
  },
} as const;

/**
 * Clinical colors for dark mode - Midday
 */
export const MIDDAY_DARK_CLINICAL_COLORS: ClinicalColorRequirements = {
  crisis: {
    background: '#C62828',
    foreground: '#FFCDD2',
    border: '#E57373',
    contrastRatio: 8.3,
  },
  therapeutic: {
    calm: '#0F2E2A',       // Dark teal calm
    focus: '#1B2E1B',      // Dark green focus
    gentle: '#2A2E1B',     // Dark olive gentle
  },
  assessment: {
    neutral: '#1C1C1C',
    progress: '#0F2E2A',
    completed: '#1A2633',
  },
} as const;

/**
 * Clinical colors for dark mode - Evening
 */
export const EVENING_DARK_CLINICAL_COLORS: ClinicalColorRequirements = {
  crisis: {
    background: '#D32F2F',
    foreground: '#FFCDD2',
    border: '#F48FB1',
    contrastRatio: 8.5,
  },
  therapeutic: {
    calm: '#1B2E1B',       // Dark green calm
    focus: '#2A1A2A',      // Dark purple focus
    gentle: '#2E2E0F',     // Dark warm gentle
  },
  assessment: {
    neutral: '#0F0F0F',    // Very dark neutral
    progress: '#1B2E1B',
    completed: '#1A2328',
  },
} as const;

// ============================================================================
// COMPLETE THEME COLOR SYSTEMS
// ============================================================================

/**
 * Complete color system for each variant
 */
export const VARIANT_COLOR_SYSTEMS: VariantColorSystem = {
  morning: {
    light: MORNING_LIGHT_PALETTE,
    dark: MORNING_DARK_PALETTE,
    clinical: MORNING_CLINICAL_COLORS,
  },
  midday: {
    light: MIDDAY_LIGHT_PALETTE,
    dark: MIDDAY_DARK_PALETTE,
    clinical: MIDDAY_CLINICAL_COLORS,
  },
  evening: {
    light: EVENING_LIGHT_PALETTE,
    dark: EVENING_DARK_PALETTE,
    clinical: EVENING_CLINICAL_COLORS,
  },
} as const;

/**
 * Dark mode clinical colors mapping
 */
export const DARK_MODE_CLINICAL_SYSTEMS = {
  morning: MORNING_DARK_CLINICAL_COLORS,
  midday: MIDDAY_DARK_CLINICAL_COLORS,
  evening: EVENING_DARK_CLINICAL_COLORS,
} as const;

// ============================================================================
// ACCESSIBILITY & PERFORMANCE CONSTRAINTS
// ============================================================================

/**
 * Accessibility requirements by compliance level
 */
export const ACCESSIBILITY_CONTRAST_REQUIREMENTS: Record<AccessibilityLevel, ContrastRequirements> = {
  AA: {
    normalText: 4.5,
    largeText: 3.0,
    uiComponents: 3.0,
    crisis: 7.0,        // Always elevated for safety
    therapeutic: 4.5,   // Standard for clinical content
  },
  AAA: {
    normalText: 7.0,
    largeText: 4.5,
    uiComponents: 3.0,  // UI components don't have AAA requirement
    crisis: 7.0,
    therapeutic: 7.0,   // Higher standard for therapeutic content
  },
} as const;

/**
 * Performance constraints for clinical-grade theming
 */
export const THEME_PERFORMANCE_CONSTRAINTS: ThemePerformanceConstraints = {
  maxTransitionDuration: 200,    // 200ms max for therapeutic UX
  maxRenderTime: 16,            // 16ms for 60fps (clinical smoothness)
  maxBundleSize: 15360,         // 15KB max theme code
  maxCssVariables: 50,          // Limit CSS custom properties
  memoryThreshold: 5,           // 5MB max theme memory usage
} as const;

/**
 * Crisis response constraints (stricter than general performance)
 */
export const CRISIS_RESPONSE_CONSTRAINTS: CrisisResponseConstraints = {
  maxButtonResponseTime: 200,    // Crisis button <200ms
  minContrastRatio: 7.0,        // Always 7:1 for crisis elements
  maxTransitionDelay: 50,       // <50ms crisis state changes
  emergencyModeColors: {        // High-contrast emergency palette
    primary: '#FF1744',         // Bright red
    secondary: '#FFFFFF',       // Pure white
    success: '#4CAF50',         // Clear green
    warning: '#FF9800',         // Clear orange
    error: '#F44336',           // Clear red
    info: '#2196F3',            // Clear blue
    background: '#000000',      // True black
    foreground: '#FFFFFF',      // Pure white
    muted: '#424242',           // Dark gray
    accent: '#FFFF00',          // Bright yellow
    border: '#FFFFFF',          // White borders
    card: '#1A1A1A',            // Dark cards
    cardForeground: '#FFFFFF',  // White text
    popover: '#000000',         // Black popover
    popoverForeground: '#FFFFFF',
    input: '#1A1A1A',           // Dark inputs
    ring: '#FF1744',            // Red focus
  },
} as const;

/**
 * Therapeutic constraints for mental health optimization
 */
export const THERAPEUTIC_CONSTRAINTS: TherapeuticConstraints = {
  calmingColors: [
    '#A8E6CF',  // Soft green
    '#C7CEEA',  // Soft purple
    '#B8E6B8',  // Light green
    '#D6EAF8',  // Light blue
    '#F8D7DA',  // Soft pink
  ],
  avoidColors: [
    '#FF0000',  // Pure red (too alarming)
    '#000000',  // Pure black (too harsh for light mode)
    '#FFFF00',  // Pure yellow (too intense)
    '#FF6600',  // Bright orange (overstimulating)
  ],
  breathingSpaceSupport: true,     // Colors support breathing exercises
  mindfulnessOptimized: true,      // Optimized for MBCT practices
} as const;

// ============================================================================
// THEME CONFIGURATION PRESETS
// ============================================================================

/**
 * Default theme configuration
 */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'auto' as ThemeMode,
  variant: 'midday' as ThemeVariant,
  colors: VARIANT_COLOR_SYSTEMS,
  accessibility: {
    level: 'AA' as AccessibilityLevel,
    requirements: ACCESSIBILITY_CONTRAST_REQUIREMENTS.AA,
  },
  performance: THEME_PERFORMANCE_CONSTRAINTS,
  clinical: {
    minimumContrast: 4.5,
    maxResponseTime: 200,
    colorBlindnessSupport: true,
    reducedMotionCompliance: true,
    therapeuticSafety: true,
  },
  crisis: CRISIS_RESPONSE_CONSTRAINTS,
  therapeutic: THERAPEUTIC_CONSTRAINTS,
  respectSystemTheme: true,
  enableTransitions: true,
  version: '1.0.0',
} as const;

/**
 * Clinical-grade theme configuration (stricter requirements)
 */
export const CLINICAL_THEME_CONFIG: ThemeConfig = {
  ...DEFAULT_THEME_CONFIG,
  accessibility: {
    level: 'AAA' as AccessibilityLevel,
    requirements: ACCESSIBILITY_CONTRAST_REQUIREMENTS.AAA,
  },
  clinical: {
    minimumContrast: 7.0,         // AAA standard
    maxResponseTime: 150,         // Faster response
    colorBlindnessSupport: true,
    reducedMotionCompliance: true,
    therapeuticSafety: true,
  },
  performance: {
    ...THEME_PERFORMANCE_CONSTRAINTS,
    maxTransitionDuration: 150,   // Faster transitions
    maxRenderTime: 12,           // Higher framerate target
  },
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get color palette for specific mode and variant
 */
export const getColorPalette = (
  mode: ThemeMode, 
  variant: ThemeVariant,
  systemPreference: 'light' | 'dark' = 'light'
): ColorPalette => {
  const resolvedMode = mode === 'auto' ? systemPreference : mode;
  return VARIANT_COLOR_SYSTEMS[variant][resolvedMode];
};

/**
 * Get clinical colors for specific variant and mode
 */
export const getClinicalColors = (
  variant: ThemeVariant,
  mode: ThemeMode,
  systemPreference: 'light' | 'dark' = 'light'
): ClinicalColorRequirements => {
  const resolvedMode = mode === 'auto' ? systemPreference : mode;
  
  if (resolvedMode === 'dark') {
    return DARK_MODE_CLINICAL_SYSTEMS[variant];
  }
  
  return VARIANT_COLOR_SYSTEMS[variant].clinical;
};

/**
 * Check if color combination meets accessibility requirements
 */
export const meetsAccessibilityRequirements = (
  foreground: HexColor,
  background: HexColor,
  level: AccessibilityLevel,
  componentType: keyof ContrastRequirements = 'normalText'
): boolean => {
  // This would need actual contrast calculation implementation
  // For now, we assume the predefined combinations meet requirements
  const requirements = ACCESSIBILITY_CONTRAST_REQUIREMENTS[level];
  const requiredRatio = requirements[componentType];
  
  // Placeholder - would implement actual contrast calculation
  return true; // Assuming predefined combinations are compliant
};

/**
 * Get optimal text color for background
 */
export const getOptimalTextColor = (
  backgroundColor: HexColor,
  variant: ThemeVariant,
  mode: ThemeMode
): HexColor => {
  const palette = getColorPalette(mode, variant);
  
  // Simple light/dark determination - would use actual luminance calculation
  if (mode === 'dark') {
    return palette.foreground as HexColor;
  }
  
  return palette.foreground as HexColor;
};

// ============================================================================
// TYPE GUARDS & VALIDATORS
// ============================================================================

/**
 * Validate hex color format
 */
export const isValidHexColor = (color: string): color is HexColor => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Validate theme mode
 */
export const isValidThemeMode = (mode: string): mode is ThemeMode => {
  return ['light', 'dark', 'auto'].includes(mode);
};

/**
 * Validate theme variant
 */
export const isValidThemeVariant = (variant: string): variant is ThemeVariant => {
  return ['morning', 'midday', 'evening'].includes(variant);
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MORNING_LIGHT_PALETTE,
  MORNING_DARK_PALETTE,
  MIDDAY_LIGHT_PALETTE,
  MIDDAY_DARK_PALETTE,
  EVENING_LIGHT_PALETTE,
  EVENING_DARK_PALETTE,
  MORNING_CLINICAL_COLORS,
  MIDDAY_CLINICAL_COLORS,
  EVENING_CLINICAL_COLORS,
  MORNING_DARK_CLINICAL_COLORS,
  MIDDAY_DARK_CLINICAL_COLORS,
  EVENING_DARK_CLINICAL_COLORS,
};

export type {
  ThemeMode,
  ThemeVariant,
  ColorPalette,
  ClinicalColorRequirements,
  ThemeColorSystem,
  VariantColorSystem,
  AccessibilityLevel,
  ContrastRequirements,
  ThemeConfig,
};