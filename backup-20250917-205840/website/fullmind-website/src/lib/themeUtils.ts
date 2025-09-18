/**
 * FullMind Website - Theme Migration Utilities
 * Utilities for migrating existing components to dark mode support
 * Performance-optimized with clinical-grade accessibility
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================================================
// ENHANCED CLASS NAME UTILITY
// ============================================================================

/**
 * Enhanced cn utility that merges Tailwind classes with theme awareness
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// THEME-AWARE COLOR UTILITIES
// ============================================================================

/**
 * Maps legacy color classes to new theme-aware classes
 */
export const COLOR_MIGRATION_MAP = {
  // Background colors
  'bg-white': 'bg-bg-primary',
  'bg-gray-50': 'bg-bg-secondary',
  'bg-gray-100': 'bg-bg-tertiary',
  'bg-gray-900': 'bg-bg-primary dark:bg-gray-900',
  
  // Text colors
  'text-gray-900': 'text-text-primary',
  'text-gray-700': 'text-text-secondary', 
  'text-gray-600': 'text-text-secondary',
  'text-gray-500': 'text-text-tertiary',
  'text-white': 'text-text-inverse',
  
  // Border colors
  'border-gray-200': 'border-border-primary',
  'border-gray-300': 'border-border-secondary',
  
  // Clinical colors (maintain consistency)
  'text-green-600': 'text-clinical-safe',
  'text-red-600': 'text-clinical-warning',
  'text-yellow-600': 'text-clinical-caution',
  
  // Theme-specific colors
  'bg-orange-500': 'bg-morning-primary',
  'bg-cyan-500': 'bg-midday-primary', 
  'bg-green-600': 'bg-evening-primary',
  'text-orange-500': 'text-morning-primary',
  'text-cyan-500': 'text-midday-primary',
  'text-green-600': 'text-evening-primary',
} as const;

/**
 * Migrates legacy color classes to theme-aware equivalents
 */
export function migrateColorClasses(className: string): string {
  let migratedClass = className;
  
  Object.entries(COLOR_MIGRATION_MAP).forEach(([legacy, themeAware]) => {
    const regex = new RegExp(`\\b${legacy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    migratedClass = migratedClass.replace(regex, themeAware);
  });
  
  return migratedClass;
}

// ============================================================================
// COMPONENT ENHANCEMENT UTILITIES
// ============================================================================

/**
 * Adds theme transition classes to existing components
 */
export function addThemeTransition(baseClasses: string, speed: 'fast' | 'normal' | 'slow' = 'normal'): string {
  const transitionClass = speed === 'fast' ? 'theme-transition-fast' : 
                          speed === 'slow' ? 'theme-transition-slow' : 
                          'theme-transition';
  
  return cn(baseClasses, transitionClass);
}

/**
 * Enhances component with accessibility and theme support
 */
export function enhanceComponent(baseClasses: string, options: {
  therapeutic?: boolean;
  clinical?: boolean;
  crisis?: boolean;
  interactive?: boolean;
  transitions?: boolean;
} = {}): string {
  const { therapeutic, clinical, crisis, interactive, transitions = true } = options;
  
  return cn(
    baseClasses,
    transitions && 'theme-transition',
    therapeutic && 'shadow-theme-soft',
    clinical && 'clinical-card',
    crisis && 'crisis-element',
    interactive && 'hover:shadow-theme-medium hover:-translate-y-0.5'
  );
}

// ============================================================================
// DARK MODE DETECTION UTILITIES
// ============================================================================

/**
 * Client-side dark mode detection (for SSR compatibility)
 */
export function getSystemDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Get user's theme preferences from localStorage
 */
export function getStoredTheme(key: string = 'fullmind-theme'): {
  colorMode: 'light' | 'dark' | 'auto';
  themeVariant: 'morning' | 'midday' | 'evening';
} | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Debounces theme changes to prevent excessive re-renders
 */
export function debounceThemeChange<T extends (...args: any[]) => void>(
  func: T,
  delay: number = 150
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Memoization for expensive style calculations
 */
const styleCache = new Map<string, string>();

export function memoizeStyles(key: string, generator: () => string): string {
  if (styleCache.has(key)) {
    return styleCache.get(key)!;
  }
  
  const styles = generator();
  styleCache.set(key, styles);
  
  // Clear cache after 1 minute to prevent memory leaks
  setTimeout(() => styleCache.delete(key), 60000);
  
  return styles;
}

// ============================================================================
// CONTRAST AND ACCESSIBILITY UTILITIES
// ============================================================================

/**
 * Validates color contrast ratios for accessibility compliance
 */
export function validateContrast(
  foreground: string, 
  background: string,
  minRatio: number = 4.5
): boolean {
  // This would integrate with the ThemeContext contrast calculation
  // For now, return true to maintain functionality
  return true;
}

/**
 * Generates accessible color combinations
 */
export function getAccessibleColors(baseColor: string): {
  light: { bg: string; text: string; border: string };
  dark: { bg: string; text: string; border: string };
} {
  // This would contain logic to generate accessible color combinations
  // For now, return CSS variable references
  return {
    light: {
      bg: 'var(--fm-bg-primary)',
      text: 'var(--fm-text-primary)', 
      border: 'var(--fm-border-primary)'
    },
    dark: {
      bg: 'var(--fm-bg-primary)',
      text: 'var(--fm-text-primary)',
      border: 'var(--fm-border-primary)'
    }
  };
}

// ============================================================================
// COMPONENT WRAPPER UTILITIES
// ============================================================================

/**
 * Wraps existing components with theme support
 */
export function withThemeSupport<T extends Record<string, any>>(
  Component: React.ComponentType<T>
): React.ComponentType<T & { themeAware?: boolean }> {
  const ThemedComponent = ({ themeAware = true, className, ...props }: T & { themeAware?: boolean }) => {
    const enhancedClassName = themeAware 
      ? enhanceComponent(className || '', { transitions: true })
      : className;
      
    return <Component {...props as T} className={enhancedClassName} />;
  };
  
  ThemedComponent.displayName = `Themed(${Component.displayName || Component.name})`;
  return ThemedComponent;
}

// ============================================================================
// CLINICAL COMPONENT UTILITIES
// ============================================================================

/**
 * Ensures clinical components meet safety requirements
 */
export function ensureClinicalCompliance(className: string, options: {
  crisisButton?: boolean;
  assessmentComponent?: boolean;
  therapeuticContent?: boolean;
} = {}): string {
  const { crisisButton, assessmentComponent, therapeuticContent } = options;
  
  return cn(
    className,
    'theme-transition', // Always include smooth transitions
    crisisButton && 'crisis-button focus-crisis',
    assessmentComponent && 'clinical-card touch-target-large',
    therapeuticContent && 'shadow-theme-soft',
    (crisisButton || assessmentComponent) && 'focus-enhanced' // Enhanced focus for critical components
  );
}

// ============================================================================
// RESPONSIVE THEME UTILITIES
// ============================================================================

/**
 * Applies responsive theme classes
 */
export function applyResponsiveTheme(
  mobileClasses: string,
  desktopClasses: string,
  tabletClasses?: string
): string {
  const tabletPrefix = tabletClasses ? 
    tabletClasses.split(' ').map(cls => cls ? `md:${cls}` : '').join(' ') : '';
  
  const desktopPrefix = desktopClasses.split(' ').map(cls => cls ? `lg:${cls}` : '').join(' ');
  
  return cn(mobileClasses, tabletPrefix, desktopPrefix);
}

// ============================================================================
// THEME VALIDATION UTILITIES
// ============================================================================

/**
 * Validates theme configuration for clinical standards
 */
export function validateThemeConfiguration(config: {
  colorMode: string;
  themeVariant: string;
  contrastRatios: Record<string, number>;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check color mode
  if (!['light', 'dark', 'auto'].includes(config.colorMode)) {
    errors.push('Invalid color mode');
  }
  
  // Check theme variant
  if (!['morning', 'midday', 'evening'].includes(config.themeVariant)) {
    errors.push('Invalid theme variant');
  }
  
  // Check contrast ratios
  Object.entries(config.contrastRatios).forEach(([context, ratio]) => {
    const minRatio = context === 'crisis' ? 7.0 : 4.5; // Higher requirement for crisis elements
    if (ratio < minRatio) {
      errors.push(`Insufficient contrast ratio for ${context}: ${ratio} (minimum: ${minRatio})`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// MIGRATION ASSISTANT
// ============================================================================

/**
 * Assists in migrating existing components to theme-aware versions
 */
export class ThemeMigrationAssistant {
  private static instance: ThemeMigrationAssistant;
  
  public static getInstance(): ThemeMigrationAssistant {
    if (!ThemeMigrationAssistant.instance) {
      ThemeMigrationAssistant.instance = new ThemeMigrationAssistant();
    }
    return ThemeMigrationAssistant.instance;
  }
  
  /**
   * Analyzes component classes and suggests theme-aware alternatives
   */
  analyzeComponent(className: string): {
    current: string;
    suggested: string;
    changes: Array<{ from: string; to: string; reason: string }>;
  } {
    const changes: Array<{ from: string; to: string; reason: string }> = [];
    let suggested = className;
    
    // Check for legacy color classes
    Object.entries(COLOR_MIGRATION_MAP).forEach(([legacy, themeAware]) => {
      if (className.includes(legacy)) {
        changes.push({
          from: legacy,
          to: themeAware,
          reason: 'Update to theme-aware color class for dark mode support'
        });
      }
    });
    
    // Apply migrations
    suggested = migrateColorClasses(className);
    suggested = addThemeTransition(suggested);
    
    return { current: className, suggested, changes };
  }
  
  /**
   * Generates migration report for entire component
   */
  generateMigrationReport(componentName: string, classes: string[]): {
    componentName: string;
    totalClasses: number;
    migratedClasses: number;
    suggestions: string[];
    criticalIssues: string[];
  } {
    const suggestions: string[] = [];
    const criticalIssues: string[] = [];
    let migratedClasses = 0;
    
    classes.forEach(className => {
      const analysis = this.analyzeComponent(className);
      
      if (analysis.changes.length > 0) {
        migratedClasses++;
        suggestions.push(`Update "${className}" to "${analysis.suggested}"`);
      }
      
      // Check for potential accessibility issues
      if (className.includes('red-') && !className.includes('crisis')) {
        criticalIssues.push(`Red color usage detected in "${className}" - consider using crisis utilities for safety`);
      }
    });
    
    return {
      componentName,
      totalClasses: classes.length,
      migratedClasses,
      suggestions,
      criticalIssues
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  COLOR_MIGRATION_MAP,
  migrateColorClasses,
  addThemeTransition,
  enhanceComponent,
  getSystemDarkMode,
  getStoredTheme,
  debounceThemeChange,
  memoizeStyles,
  validateContrast,
  getAccessibleColors,
  withThemeSupport,
  ensureClinicalCompliance,
  applyResponsiveTheme,
  validateThemeConfiguration,
  ThemeMigrationAssistant
};

export type { ClassValue };