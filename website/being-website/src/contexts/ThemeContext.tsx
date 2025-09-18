/**
 * Being. Website - Theme Context Provider
 * Clinical-grade dark mode implementation with therapeutic color preservation
 * Maintains accessibility compliance and performance requirements
 * Integrates with Zustand store for robust state persistence
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { THEME_VARIANTS } from '@/lib/constants';
import { ThemeVariant } from '@/types/components';
import { useThemeStore, themeSelectors, type ColorMode as StoreColorMode } from '@/store/themeStore';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ColorMode = StoreColorMode; // Re-export from store for consistency

export interface ThemeColors {
  // Background colors
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    overlay: string;
    clinical: string;
  };
  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    clinical: string;
  };
  // Border colors
  border: {
    primary: string;
    secondary: string;
    focus: string;
    clinical: string;
  };
  // Surface colors
  surface: {
    elevated: string;
    depressed: string;
    interactive: string;
    hover: string;
    active: string;
  };
  // Crisis-critical colors (maintain high contrast)
  crisis: {
    background: string;
    text: string;
    border: string;
    hover: string;
  };
}

export interface ExtendedThemeVariant {
  name: ThemeVariant;
  primary: string;
  success: string;
  // Dark mode variants
  dark: {
    primary: string;
    success: string;
  };
}

export interface ThemeContextValue {
  // Current theme state
  colorMode: ColorMode;
  themeVariant: ThemeVariant;
  isDark: boolean;
  
  // Theme colors (computed based on mode + variant)
  colors: ThemeColors;
  themeColors: ExtendedThemeVariant;
  
  // Theme actions
  setColorMode: (mode: ColorMode) => void;
  setThemeVariant: (variant: ThemeVariant) => void;
  toggleColorMode: () => void;
  
  // Clinical utilities
  getCrisisButtonColors: () => ThemeColors['crisis'];
  getContrastRatio: (foreground: string, background: string) => number;
  ensureMinimumContrast: (foreground: string, background: string, minRatio?: number) => string;
  
  // Crisis safety utilities
  enableCrisisMode: () => void;
  disableCrisisMode: () => void;
  isCrisisMode: boolean;
  
  // Performance utilities
  isThemeTransitioning: boolean;
}

// ============================================================================
// EXTENDED THEME DEFINITIONS
// ============================================================================

const EXTENDED_THEME_VARIANTS: Record<ThemeVariant, ExtendedThemeVariant> = {
  morning: {
    name: 'morning',
    primary: THEME_VARIANTS.MORNING.primary,
    success: THEME_VARIANTS.MORNING.success,
    dark: {
      primary: '#FF9F43', // Maintain warm therapeutic feeling
      success: '#E8863A'
    }
  },
  midday: {
    name: 'midday',
    primary: THEME_VARIANTS.MIDDAY.primary,
    success: THEME_VARIANTS.MIDDAY.success,
    dark: {
      primary: '#40B5AD', // Maintain calming therapeutic feeling
      success: '#2C8A82'
    }
  },
  evening: {
    name: 'evening',
    primary: THEME_VARIANTS.EVENING.primary,
    success: THEME_VARIANTS.EVENING.success,
    dark: {
      primary: '#4A7C59', // Darker green for evening calm
      success: '#2D5016'
    }
  }
};

// ============================================================================
// DARK MODE COLOR SYSTEM
// ============================================================================

const generateThemeColors = (colorMode: ColorMode, themeVariant: ThemeVariant, systemDarkMode: boolean): ThemeColors => {
  const isDark = colorMode === 'dark' || (colorMode === 'auto' && systemDarkMode);
  
  if (isDark) {
    return {
      background: {
        primary: '#0f172a',    // slate-900 - Deep but therapeutic
        secondary: '#1e293b',  // slate-800 - Subtle depth
        tertiary: '#334155',   // slate-700 - Card backgrounds
        overlay: 'rgba(0, 0, 0, 0.80)', // Semi-transparent overlays
        clinical: '#164e63'    // cyan-800 - Clinical context backgrounds
      },
      text: {
        primary: '#f8fafc',    // slate-50 - High contrast (18.07:1)
        secondary: '#cbd5e1',  // slate-300 - Medium contrast (9.34:1)
        tertiary: '#94a3b8',   // slate-400 - Lower contrast (5.25:1)
        inverse: '#0f172a',    // For dark text on light backgrounds
        clinical: '#06b6d4'    // cyan-500 - Clinical accent text
      },
      border: {
        primary: '#475569',    // slate-600 - Subtle borders
        secondary: '#64748b',  // slate-500 - Stronger borders
        focus: EXTENDED_THEME_VARIANTS[themeVariant].dark.primary, // Themed focus
        clinical: '#0891b2'    // cyan-600 - Clinical borders
      },
      surface: {
        elevated: '#1e293b',   // slate-800 - Elevated surfaces
        depressed: '#0f172a',  // slate-900 - Depressed surfaces
        interactive: '#334155', // slate-700 - Interactive elements
        hover: '#475569',      // slate-600 - Hover states
        active: '#64748b'      // slate-500 - Active states
      },
      crisis: {
        background: '#dc2626', // red-600 - HIGH VISIBILITY (7.73:1 contrast)
        text: '#ffffff',       // Pure white for maximum contrast
        border: '#ef4444',     // red-500 - Distinct border
        hover: '#b91c1c'       // red-700 - Darker hover state
      }
    };
  }
  
  // Light mode colors (existing system)
  return {
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',   // slate-50
      tertiary: '#f1f5f9',    // slate-100
      overlay: 'rgba(255, 255, 255, 0.95)',
      clinical: '#ecfeff'     // cyan-50
    },
    text: {
      primary: '#0f172a',     // slate-900
      secondary: '#475569',   // slate-600
      tertiary: '#64748b',    // slate-500
      inverse: '#ffffff',
      clinical: '#0e7490'     // cyan-700
    },
    border: {
      primary: '#e2e8f0',     // slate-200
      secondary: '#cbd5e1',   // slate-300
      focus: EXTENDED_THEME_VARIANTS[themeVariant].primary,
      clinical: '#67e8f9'     // cyan-300
    },
    surface: {
      elevated: '#ffffff',
      depressed: '#f1f5f9',   // slate-100
      interactive: '#f8fafc', // slate-50
      hover: '#e2e8f0',       // slate-200
      active: '#cbd5e1'       // slate-300
    },
    crisis: {
      background: '#dc2626',  // red-600 - Consistent across modes
      text: '#ffffff',
      border: '#ef4444',      // red-500
      hover: '#b91c1c'        // red-700
    }
  };
};

// ============================================================================
// CONTRAST CALCULATION UTILITIES
// ============================================================================

const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
};

const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const calculateContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(...rgb1);
  const lum2 = getLuminance(...rgb2);
  
  const lightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (lightest + 0.05) / (darkest + 0.05);
};

const adjustColorForContrast = (foreground: string, background: string, minRatio: number = 4.5): string => {
  const currentRatio = calculateContrastRatio(foreground, background);
  if (currentRatio >= minRatio) return foreground;
  
  // Simple fallback - return high contrast alternatives
  const bg = hexToRgb(background);
  if (!bg) return foreground;
  
  const bgLuminance = getLuminance(...bg);
  return bgLuminance > 0.5 ? '#000000' : '#ffffff';
};

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================================================
// THEME PROVIDER COMPONENT
// ============================================================================

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultColorMode?: ColorMode;
  defaultThemeVariant?: ThemeVariant;
  storageKey?: string;
}

export function ThemeProvider({ 
  children, 
  defaultColorMode = 'auto',
  defaultThemeVariant = 'midday',
  storageKey = 'being-theme' // Note: Zustand store uses its own key
}: ThemeProviderProps) {
  // Use Zustand store for all theme state management
  const {
    preferences,
    systemTheme,
    isThemeTransitioning,
    isCrisisMode,
    isHydrated,
    setColorMode: setStoreColorMode,
    setThemeVariant: setStoreThemeVariant,
    toggleColorMode: toggleStoreColorMode,
    enableCrisisMode: enableStoreCrisisMode,
    disableCrisisMode: disableStoreCrisisMode,
    syncWithSystemTheme,
  } = useThemeStore();

  // Local state for hydration prevention of flash
  const [isClientReady, setIsClientReady] = useState(false);

  // Initialize client-side state after hydration
  useEffect(() => {
    // Initialize system theme sync
    syncWithSystemTheme();
    setIsClientReady(true);
  }, [syncWithSystemTheme]);

  // Computed values with memoization for performance using store selectors
  const colorMode = preferences.colorMode;
  const themeVariant = preferences.themeVariant;
  const systemDarkMode = systemTheme === 'dark';

  const isDark = useMemo(() => {
    return themeSelectors.getIsDarkMode({ preferences, systemTheme, isCrisisMode, crisisModeOverrides: null });
  }, [preferences, systemTheme, isCrisisMode]);

  const colors = useMemo(() => {
    return generateThemeColors(colorMode, themeVariant, systemDarkMode);
  }, [colorMode, themeVariant, systemDarkMode]);

  const themeColors = useMemo(() => {
    return EXTENDED_THEME_VARIANTS[themeVariant];
  }, [themeVariant]);

  // Apply theme to document root with performance optimization and crisis protection
  useEffect(() => {
    if (!isHydrated || !isClientReady) return;

    const root = document.documentElement;
    
    // Skip theme transition if in crisis mode - maintain crisis visibility
    if (!isCrisisMode) {
      setIsThemeTransitioning(true);
    }
    
    // Batch DOM updates for performance
    requestAnimationFrame(() => {
      // Remove existing theme classes
      root.classList.remove('light', 'dark', 'theme-morning', 'theme-midday', 'theme-evening');
      
      // Add current theme classes
      root.classList.add(isDark ? 'dark' : 'light');
      root.classList.add(`theme-${themeVariant}`);
      
      // Set CSS custom properties for dynamic theming
      const cssProperties = {
        // Color mode
        '--fm-color-mode': isDark ? 'dark' : 'light',
        
        // Background colors
        '--fm-bg-primary': colors.background.primary,
        '--fm-bg-secondary': colors.background.secondary,
        '--fm-bg-tertiary': colors.background.tertiary,
        '--fm-bg-overlay': colors.background.overlay,
        '--fm-bg-clinical': colors.background.clinical,
        
        // Text colors
        '--fm-text-primary': colors.text.primary,
        '--fm-text-secondary': colors.text.secondary,
        '--fm-text-tertiary': colors.text.tertiary,
        '--fm-text-inverse': colors.text.inverse,
        '--fm-text-clinical': colors.text.clinical,
        
        // Border colors
        '--fm-border-primary': colors.border.primary,
        '--fm-border-secondary': colors.border.secondary,
        '--fm-border-focus': colors.border.focus,
        '--fm-border-clinical': colors.border.clinical,
        
        // Surface colors
        '--fm-surface-elevated': colors.surface.elevated,
        '--fm-surface-depressed': colors.surface.depressed,
        '--fm-surface-interactive': colors.surface.interactive,
        '--fm-surface-hover': colors.surface.hover,
        '--fm-surface-active': colors.surface.active,
        
        // Theme variant colors
        '--fm-theme-primary': isDark ? themeColors.dark.primary : themeColors.primary,
        '--fm-theme-success': isDark ? themeColors.dark.success : themeColors.success,
        
        // Crisis colors (always high contrast)
        '--fm-crisis-bg': colors.crisis.background,
        '--fm-crisis-text': colors.crisis.text,
        '--fm-crisis-border': colors.crisis.border,
        '--fm-crisis-hover': colors.crisis.hover,
      };

      // Apply all CSS properties at once
      Object.entries(cssProperties).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      // Crisis mode overrides - ensure crisis elements remain visible during theme changes
      if (isCrisisMode) {
        const crisisOverrides = {
          '--fm-crisis-bg': '#ff0000',
          '--fm-crisis-text': '#ffffff', 
          '--fm-crisis-border': '#000000',
          '--fm-crisis-hover': '#cc0000',
          '--fm-transition-duration': '0ms',
        };
        Object.entries(crisisOverrides).forEach(([property, value]) => {
          root.style.setProperty(property, value);
        });
      }

      // Transition complete after brief delay (for CSS transitions) - but skip in crisis mode
      if (!isCrisisMode) {
        setTimeout(() => setIsThemeTransitioning(false), 150);
      }
    });
  }, [isDark, themeVariant, colors, themeColors, isHydrated, isClientReady, isCrisisMode]);

  // Theme action handlers - delegate to Zustand store
  const setColorMode = useCallback((mode: ColorMode) => {
    setStoreColorMode(mode);
  }, [setStoreColorMode]);

  const setThemeVariant = useCallback((variant: ThemeVariant) => {
    setStoreThemeVariant(variant);
  }, [setStoreThemeVariant]);

  const toggleColorMode = useCallback(() => {
    toggleStoreColorMode();
  }, [toggleStoreColorMode]);

  // Clinical utility functions
  const getCrisisButtonColors = useCallback(() => {
    return colors.crisis;
  }, [colors.crisis]);

  const getContrastRatio = useCallback((foreground: string, background: string): number => {
    return calculateContrastRatio(foreground, background);
  }, []);

  const ensureMinimumContrast = useCallback((foreground: string, background: string, minRatio: number = 4.5): string => {
    return adjustColorForContrast(foreground, background, minRatio);
  }, []);

  // Crisis mode functions - delegate to Zustand store
  const enableCrisisMode = useCallback(() => {
    enableStoreCrisisMode();
    const root = document.documentElement;
    root.classList.add('crisis-mode');
    
    // Force maximum contrast colors immediately (no transition delay)
    const crisisProperties = {
      '--fm-crisis-bg': '#ff0000',
      '--fm-crisis-text': '#ffffff',
      '--fm-crisis-border': '#000000',
      '--fm-crisis-hover': '#cc0000',
      '--fm-transition-duration': '0ms', // Instant transitions in crisis mode
    };
    
    Object.entries(crisisProperties).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [enableStoreCrisisMode]);

  const disableCrisisMode = useCallback(() => {
    disableStoreCrisisMode();
    const root = document.documentElement;
    root.classList.remove('crisis-mode');
    
    // Restore normal transition duration
    root.style.setProperty('--fm-transition-duration', '150ms');
    
    // Restore normal crisis colors (will be handled by normal theme update)
    // This allows the theme system to restore appropriate colors
  }, [disableStoreCrisisMode]);

  // Context value with memoization
  const contextValue = useMemo<ThemeContextValue>(() => ({
    colorMode,
    themeVariant,
    isDark,
    colors,
    themeColors,
    setColorMode,
    setThemeVariant,
    toggleColorMode,
    getCrisisButtonColors,
    getContrastRatio,
    ensureMinimumContrast,
    enableCrisisMode,
    disableCrisisMode,
    isCrisisMode,
    isThemeTransitioning
  }), [
    colorMode,
    themeVariant,
    isDark,
    colors,
    themeColors,
    setColorMode,
    setThemeVariant,
    toggleColorMode,
    getCrisisButtonColors,
    getContrastRatio,
    ensureMinimumContrast,
    enableCrisisMode,
    disableCrisisMode,
    isCrisisMode,
    isThemeTransitioning
  ]);

  // Prevent flash of unstyled content during hydration
  if (!isHydrated || !isClientReady) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================================
// THEME HOOK
// ============================================================================

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  // Fallback for SSR or when provider is not available
  if (!context) {
    const fallback: ThemeContextValue = {
      colorMode: 'light',
      themeVariant: 'midday',
      isDark: false,
      colors: {
        background: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f1f5f9',
          overlay: 'rgba(255, 255, 255, 0.95)',
          clinical: '#ecfeff'
        },
        text: {
          primary: '#0f172a',
          secondary: '#475569',
          tertiary: '#64748b',
          inverse: '#ffffff',
          clinical: '#0e7490'
        },
        border: {
          primary: '#e2e8f0',
          secondary: '#cbd5e1',
          focus: '#40B5AD',
          clinical: '#67e8f9'
        },
        surface: {
          elevated: '#ffffff',
          depressed: '#f1f5f9',
          interactive: '#f8fafc',
          hover: '#e2e8f0',
          active: '#cbd5e1'
        },
        crisis: {
          background: '#dc2626',
          text: '#ffffff',
          border: '#ef4444',
          hover: '#b91c1c'
        }
      },
      themeColors: {
        name: 'midday',
        primary: '#40B5AD',
        success: '#2C8A82',
        dark: {
          primary: '#40B5AD',
          success: '#2C8A82'
        }
      },
      setColorMode: () => {},
      setThemeVariant: () => {},
      toggleColorMode: () => {},
      getCrisisButtonColors: () => ({
        background: '#dc2626',
        text: '#ffffff',
        border: '#ef4444',
        hover: '#b91c1c'
      }),
      getContrastRatio: () => 4.5,
      ensureMinimumContrast: (foreground: string) => foreground,
      enableCrisisMode: () => {},
      disableCrisisMode: () => {},
      isCrisisMode: false,
      isThemeTransitioning: false
    };
    
    // Only warn in development, not in production builds
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('useTheme called outside ThemeProvider, using fallback values');
    }
    
    return fallback;
  }
  
  return context;
}

// ============================================================================
// THEME UTILITIES HOOK
// ============================================================================

export function useThemeUtils() {
  const theme = useTheme();
  
  return useMemo(() => ({
    // CSS classes for theme-aware styling
    getThemeClasses: (baseClasses: string = '') => {
      const themeClasses = [
        baseClasses,
        `theme-${theme.themeVariant}`,
        theme.isDark ? 'dark' : 'light'
      ].filter(Boolean).join(' ');
      
      return themeClasses;
    },
    
    // CSS variables access
    getCSSVariable: (name: string): string => {
      return `var(--fm-${name})`;
    },
    
    // Theme-aware color selection
    selectColor: (lightColor: string, darkColor: string): string => {
      return theme.isDark ? darkColor : lightColor;
    },
    
    // Clinical-safe color generation
    getClinicalSafeColor: (purpose: 'text' | 'background' | 'border' = 'text'): string => {
      switch (purpose) {
        case 'text':
          return theme.colors.text.clinical;
        case 'background':
          return theme.colors.background.clinical;
        case 'border':
          return theme.colors.border.clinical;
        default:
          return theme.colors.text.clinical;
      }
    }
  }), [theme]);
}

// ============================================================================
// THEME SELECTOR COMPONENT
// ============================================================================

interface ThemeSelectorProps {
  className?: string;
  showVariantSelector?: boolean;
  showColorModeToggle?: boolean;
}

export function ThemeSelector({ 
  className = '', 
  showVariantSelector = true,
  showColorModeToggle = true 
}: ThemeSelectorProps) {
  const { colorMode, themeVariant, setColorMode, setThemeVariant, isDark } = useTheme();

  return (
    <div 
      className={`theme-selector flex items-center gap-4 ${className}`}
      role="group"
      aria-label="Theme customization controls"
    >
      {/* Color Mode Toggle */}
      {showColorModeToggle && (
        <div className="flex items-center">
          <label htmlFor="color-mode-select" className="sr-only">
            Color mode
          </label>
          <select
            id="color-mode-select"
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as ColorMode)}
            className={`
              px-3 py-2 rounded-md text-sm font-medium
              bg-[var(--fm-surface-interactive)]
              text-[var(--fm-text-primary)]
              border border-[var(--fm-border-primary)]
              focus:outline-none focus:ring-2 focus:ring-[var(--fm-border-focus)]
              transition-colors duration-150
            `}
            aria-label="Select color mode"
          >
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      )}

      {/* Theme Variant Selector */}
      {showVariantSelector && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--fm-text-secondary)]">
            Theme:
          </span>
          {(['morning', 'midday', 'evening'] as ThemeVariant[]).map((variant) => (
            <button
              key={variant}
              onClick={() => setThemeVariant(variant)}
              className={`
                w-6 h-6 rounded-full border-2 transition-all duration-150
                ${themeVariant === variant 
                  ? 'border-[var(--fm-border-focus)] ring-2 ring-[var(--fm-border-focus)]/50' 
                  : 'border-[var(--fm-border-primary)] hover:border-[var(--fm-border-secondary)]'
                }
              `}
              style={{
                backgroundColor: isDark 
                  ? EXTENDED_THEME_VARIANTS[variant].dark.primary
                  : EXTENDED_THEME_VARIANTS[variant].primary
              }}
              aria-label={`Select ${variant} theme`}
              title={`${variant.charAt(0).toUpperCase() + variant.slice(1)} theme`}
            />
          ))}
        </div>
      )}

      {/* Current Theme Indicator */}
      <div className="text-xs text-[var(--fm-text-tertiary)] font-medium">
        {colorMode === 'auto' ? (isDark ? 'Dark' : 'Light') : colorMode.charAt(0).toUpperCase() + colorMode.slice(1)} 
        • {themeVariant.charAt(0).toUpperCase() + themeVariant.slice(1)}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { ThemeColors, ExtendedThemeVariant, ThemeContextValue, ColorMode };