/**
 * FullMind Website - Theme-Aware Styling Hook
 * Provides utilities for creating theme-responsive styles and components
 * Optimized for clinical-grade accessibility and performance
 */

import { useMemo } from 'react';
import { useTheme, useThemeUtils } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ThemeAwareStyleConfig {
  // Base styles that apply regardless of theme
  base?: string;
  
  // Light mode specific styles
  light?: string;
  
  // Dark mode specific styles
  dark?: string;
  
  // Theme variant specific styles
  morning?: string;
  midday?: string;
  evening?: string;
  
  // Clinical context styles
  clinical?: string;
  
  // Crisis context styles (always high contrast)
  crisis?: string;
  
  // Accessibility enhanced styles
  accessible?: string;
  
  // Motion-reduced styles
  motionReduced?: string;
  
  // High contrast styles
  highContrast?: string;
}

export interface ComponentVariantConfig {
  // Standard component variants
  default: ThemeAwareStyleConfig;
  primary?: ThemeAwareStyleConfig;
  secondary?: ThemeAwareStyleConfig;
  outline?: ThemeAwareStyleConfig;
  
  // Clinical variants
  clinical?: ThemeAwareStyleConfig;
  crisis?: ThemeAwareStyleConfig;
  safe?: ThemeAwareStyleConfig;
  
  // State variants
  loading?: ThemeAwareStyleConfig;
  disabled?: ThemeAwareStyleConfig;
  error?: ThemeAwareStyleConfig;
  success?: ThemeAwareStyleConfig;
}

export interface InteractionStyleConfig {
  base: string;
  hover?: string;
  focus?: string;
  active?: string;
  disabled?: string;
  // Theme-specific overrides
  light?: Partial<InteractionStyleConfig>;
  dark?: Partial<InteractionStyleConfig>;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useThemeAwareStyles(config: ThemeAwareStyleConfig): string {
  const { isDark, themeVariant, colors } = useTheme();
  const { getThemeClasses } = useThemeUtils();

  return useMemo(() => {
    const classes = [
      // Base styles always apply
      config.base,
      
      // Color mode specific styles
      isDark ? config.dark : config.light,
      
      // Theme variant specific styles
      config[themeVariant],
      
      // Additional context styles
      config.clinical,
      config.crisis,
      config.accessible,
      config.motionReduced,
      config.highContrast,
    ];

    return cn(...classes.filter(Boolean));
  }, [config, isDark, themeVariant]);
}

// ============================================================================
// COMPONENT VARIANT HOOK
// ============================================================================

export function useComponentVariant(
  variants: ComponentVariantConfig,
  variant: keyof ComponentVariantConfig = 'default'
): string {
  const selectedVariant = variants[variant] || variants.default;
  return useThemeAwareStyles(selectedVariant);
}

// ============================================================================
// INTERACTION STYLES HOOK
// ============================================================================

export function useInteractionStyles(config: InteractionStyleConfig): {
  baseClasses: string;
  interactionClasses: string;
  getStateClasses: (state: 'hover' | 'focus' | 'active' | 'disabled') => string;
} {
  const { isDark } = useTheme();
  
  return useMemo(() => {
    const themeConfig = isDark ? config.dark : config.light;
    const mergedConfig = { ...config, ...themeConfig };
    
    const baseClasses = cn(
      mergedConfig.base,
      // Add transition for smooth interactions
      'transition-all duration-150 ease-in-out'
    );
    
    const interactionClasses = cn(
      mergedConfig.hover && 'hover:' + mergedConfig.hover,
      mergedConfig.focus && 'focus:' + mergedConfig.focus,
      mergedConfig.active && 'active:' + mergedConfig.active,
      mergedConfig.disabled && 'disabled:' + mergedConfig.disabled
    );
    
    const getStateClasses = (state: keyof InteractionStyleConfig) => {
      return mergedConfig[state] || '';
    };

    return {
      baseClasses,
      interactionClasses,
      getStateClasses
    };
  }, [config, isDark]);
}

// ============================================================================
// CLINICAL BUTTON STYLES HOOK
// ============================================================================

export function useClinicalButtonStyles(variant: 'primary' | 'secondary' | 'crisis' | 'safe' = 'primary') {
  const { colors, getCrisisButtonColors } = useTheme();
  
  return useMemo(() => {
    const baseStyles = 'font-semibold px-4 py-2 rounded-lg transition-all duration-150 ease-in-out touch-target';
    
    switch (variant) {
      case 'crisis':
        return cn(baseStyles, 'crisis-button focus-crisis');
      
      case 'safe':
        return cn(
          baseStyles,
          'bg-clinical-safe text-white border-2 border-clinical-safe',
          'hover:bg-green-600 hover:border-green-600',
          'focus:ring-2 focus:ring-clinical-safe focus:ring-offset-2'
        );
      
      case 'secondary':
        return cn(
          baseStyles,
          'bg-surface-interactive text-text-primary border-2 border-border-primary',
          'hover:bg-surface-hover hover:border-border-secondary',
          'focus:ring-2 focus:ring-border-focus focus:ring-offset-2'
        );
      
      case 'primary':
      default:
        return cn(
          baseStyles,
          'bg-theme-primary text-white border-2 border-transparent',
          'hover:opacity-90 hover:transform hover:scale-105',
          'focus:ring-2 focus:ring-theme-primary focus:ring-offset-2'
        );
    }
  }, [variant, colors, getCrisisButtonColors]);
}

// ============================================================================
// THERAPEUTIC COMPONENT STYLES
// ============================================================================

export function useTherapeuticCardStyles(purpose: 'assessment' | 'exercise' | 'crisis' | 'general' = 'general') {
  const { colors } = useTheme();
  
  return useMemo(() => {
    const baseStyles = cn(
      'theme-card p-6 rounded-xl transition-all duration-200',
      'border shadow-theme-soft'
    );
    
    switch (purpose) {
      case 'crisis':
        return cn(
          baseStyles,
          'border-crisis-border bg-crisis-bg/5',
          'hover:bg-crisis-bg/10 hover:shadow-crisis'
        );
      
      case 'assessment':
        return cn(
          baseStyles,
          'clinical-card',
          'hover:shadow-theme-medium'
        );
      
      case 'exercise':
        return cn(
          baseStyles,
          'border-theme-primary/20 bg-theme-primary/5',
          'hover:bg-theme-primary/10 hover:border-theme-primary/30'
        );
      
      case 'general':
      default:
        return cn(
          baseStyles,
          'hover:shadow-theme-medium hover:-translate-y-1'
        );
    }
  }, [purpose, colors]);
}

// ============================================================================
// ACCESSIBILITY ENHANCED STYLES
// ============================================================================

export function useAccessibilityStyles(
  options: {
    enhancedFocus?: boolean;
    largeTouch?: boolean;
    highContrast?: boolean;
    reduceMotion?: boolean;
  } = {}
) {
  const { 
    enhancedFocus = false, 
    largeTouch = false, 
    highContrast = false,
    reduceMotion = false 
  } = options;

  return useMemo(() => {
    return cn(
      // Base accessibility
      'focus-visible',
      
      // Enhanced focus if requested
      enhancedFocus && 'focus-enhanced',
      
      // Large touch targets
      largeTouch ? 'touch-target-large' : 'touch-target',
      
      // High contrast support
      highContrast && 'contrast-enhanced',
      
      // Motion preferences
      reduceMotion && 'motion-reduced'
    );
  }, [enhancedFocus, largeTouch, highContrast, reduceMotion]);
}

// ============================================================================
// RESPONSIVE THEME STYLES
// ============================================================================

export function useResponsiveThemeStyles(
  mobileConfig: ThemeAwareStyleConfig,
  desktopConfig: ThemeAwareStyleConfig
) {
  const mobileStyles = useThemeAwareStyles(mobileConfig);
  const desktopStyles = useThemeAwareStyles(desktopConfig);
  
  return useMemo(() => {
    return cn(
      // Mobile-first approach
      mobileStyles,
      // Desktop overrides with lg: prefix
      ...desktopStyles.split(' ').map(cls => cls ? `lg:${cls}` : '').filter(Boolean)
    );
  }, [mobileStyles, desktopStyles]);
}

// ============================================================================
// PERFORMANCE OPTIMIZED STYLE GENERATOR
// ============================================================================

export function useOptimizedStyles(
  styleGenerator: () => string,
  dependencies: React.DependencyList
): string {
  return useMemo(styleGenerator, dependencies);
}

// ============================================================================
// THEME TRANSITION STYLES
// ============================================================================

export function useThemeTransitionStyles(speed: 'fast' | 'normal' | 'slow' = 'normal') {
  return useMemo(() => {
    switch (speed) {
      case 'fast':
        return 'theme-transition-fast';
      case 'slow':
        return 'theme-transition-slow';
      case 'normal':
      default:
        return 'theme-transition';
    }
  }, [speed]);
}

// ============================================================================
// CLINICAL VALIDATION STYLES
// ============================================================================

export function useClinicalValidationStyles(
  validated: boolean = false,
  level: 'basic' | 'enhanced' | 'critical' = 'basic'
) {
  return useMemo(() => {
    if (!validated) return '';
    
    const baseStyles = 'clinical-validated';
    
    switch (level) {
      case 'critical':
        return cn(baseStyles, 'border-clinical-safe/50 bg-clinical-safe/10');
      case 'enhanced':
        return cn(baseStyles, 'border-clinical-safe/30 bg-clinical-safe/5');
      case 'basic':
      default:
        return cn(baseStyles, 'border-clinical-safe/20');
    }
  }, [validated, level]);
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  ThemeAwareStyleConfig,
  ComponentVariantConfig,
  InteractionStyleConfig
};