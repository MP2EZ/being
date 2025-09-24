/**
 * Theme Context System for Being. MBCT App
 *
 * Therapeutic theme system with time-of-day awareness and accessibility support.
 * Provides safe theme switching without property descriptor errors.
 */

import React, { ReactNode, useEffect, useState, useCallback } from 'react';
import { createSafeContext } from '../utils/SafeImports';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Theme configuration for therapeutic UI
 */
export interface ThemeColors {
  readonly primary: string;
  readonly success: string;
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly border: string;
  readonly warning: string;
  readonly error: string;
  readonly crisis: string;
}

export interface ThemeConfig {
  readonly colors: ThemeColors;
  readonly name: string;
  readonly timeOfDay: 'morning' | 'midday' | 'evening';
  readonly isDark: boolean;
}

/**
 * Pre-defined therapeutic themes
 */
const THERAPEUTIC_THEMES: Record<string, ThemeConfig> = {
  morning: {
    name: 'morning',
    timeOfDay: 'morning',
    isDark: false,
    colors: {
      primary: '#FF9F43',
      success: '#E8863A',
      background: '#FFFAF5',
      surface: '#FFFFFF',
      text: '#1B2951',
      textSecondary: '#666666',
      border: '#E8E8E8',
      warning: '#F59E0B',
      error: '#EF4444',
      crisis: '#DC2626',
    },
  },
  midday: {
    name: 'midday',
    timeOfDay: 'midday',
    isDark: false,
    colors: {
      primary: '#40B5AD',
      success: '#2C8A82',
      background: '#F0FDFC',
      surface: '#FFFFFF',
      text: '#1B2951',
      textSecondary: '#666666',
      border: '#E8E8E8',
      warning: '#F59E0B',
      error: '#EF4444',
      crisis: '#DC2626',
    },
  },
  evening: {
    name: 'evening',
    timeOfDay: 'evening',
    isDark: false,
    colors: {
      primary: '#4A7C59',
      success: '#2D5016',
      background: '#F8FAF9',
      surface: '#FFFFFF',
      text: '#1B2951',
      textSecondary: '#666666',
      border: '#E8E8E8',
      warning: '#F59E0B',
      error: '#EF4444',
      crisis: '#DC2626',
    },
  },
  dark: {
    name: 'dark',
    timeOfDay: 'evening',
    isDark: true,
    colors: {
      primary: '#4A7C59',
      success: '#2D5016',
      background: '#1A1A1A',
      surface: '#2D2D2D',
      text: '#FFFFFF',
      textSecondary: '#CCCCCC',
      border: '#404040',
      warning: '#F59E0B',
      error: '#EF4444',
      crisis: '#DC2626',
    },
  },
};

/**
 * Theme Context Interface
 */
export interface ThemeContextValue {
  readonly currentTheme: ThemeConfig;
  readonly availableThemes: readonly ThemeConfig[];
  readonly isAutoThemeEnabled: boolean;

  // Theme actions
  setTheme: (themeName: string) => Promise<void>;
  enableAutoTheme: (enabled: boolean) => Promise<void>;
  getCurrentTimeTheme: () => ThemeConfig;

  // Accessibility
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  resetTextSize: () => void;
  textScale: number;

  // Provider status
  isReady: boolean;
  error: string | null;
}

/**
 * Safe default theme context
 */
const defaultContextValue: ThemeContextValue = {
  currentTheme: THERAPEUTIC_THEMES.morning,
  availableThemes: Object.values(THERAPEUTIC_THEMES),
  isAutoThemeEnabled: true,
  setTheme: async () => {
    console.warn('ThemeContext: setTheme called before ready');
  },
  enableAutoTheme: async () => {
    console.warn('ThemeContext: enableAutoTheme called before ready');
  },
  getCurrentTimeTheme: () => THERAPEUTIC_THEMES.morning,
  increaseTextSize: () => {
    console.warn('ThemeContext: increaseTextSize called before ready');
  },
  decreaseTextSize: () => {
    console.warn('ThemeContext: decreaseTextSize called before ready');
  },
  resetTextSize: () => {
    console.warn('ThemeContext: resetTextSize called before ready');
  },
  textScale: 1.0,
  isReady: false,
  error: null,
};

/**
 * Create safe theme context
 */
const {
  Provider: ThemeContextProvider,
  useContext: useThemeContext,
} = createSafeContext(defaultContextValue, 'ThemeContext');

/**
 * Theme Provider Props
 */
export interface ThemeProviderProps {
  children: ReactNode;
  enabled?: boolean;
  defaultTheme?: string;
  enableAutoTheme?: boolean;
  onThemeChange?: (theme: ThemeConfig) => void;
  onError?: (error: Error) => void;
}

/**
 * Theme Provider Component
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  enabled = true,
  defaultTheme = 'morning',
  enableAutoTheme = true,
  onThemeChange,
  onError,
}) => {
  const [providerState, setProviderState] = useState({
    currentTheme: THERAPEUTIC_THEMES[defaultTheme] || THERAPEUTIC_THEMES.morning,
    isAutoThemeEnabled: enableAutoTheme,
    textScale: 1.0,
    isReady: false,
    error: null as string | null,
  });

  /**
   * Get theme based on current time
   */
  const getCurrentTimeTheme = useCallback((): ThemeConfig => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return THERAPEUTIC_THEMES.morning;
    } else if (hour >= 12 && hour < 17) {
      return THERAPEUTIC_THEMES.midday;
    } else {
      return THERAPEUTIC_THEMES.evening;
    }
  }, []);

  /**
   * Initialize theme system
   */
  useEffect(() => {
    if (!enabled) {
      setProviderState(prev => ({ ...prev, isReady: true }));
      return;
    }

    const initializeTheme = async () => {
      try {
        // Load saved theme preferences
        const savedTheme = await AsyncStorage.getItem('being_theme');
        const savedAutoTheme = await AsyncStorage.getItem('being_auto_theme');
        const savedTextScale = await AsyncStorage.getItem('being_text_scale');

        const isAutoEnabled = savedAutoTheme !== null
          ? JSON.parse(savedAutoTheme)
          : enableAutoTheme;

        let theme = THERAPEUTIC_THEMES[defaultTheme] || THERAPEUTIC_THEMES.morning;

        // Use saved theme or auto-detect
        if (isAutoEnabled) {
          theme = getCurrentTimeTheme();
        } else if (savedTheme && THERAPEUTIC_THEMES[savedTheme]) {
          theme = THERAPEUTIC_THEMES[savedTheme];
        }

        const textScale = savedTextScale
          ? parseFloat(savedTextScale)
          : 1.0;

        setProviderState({
          currentTheme: theme,
          isAutoThemeEnabled: isAutoEnabled,
          textScale: Math.max(0.8, Math.min(1.5, textScale)), // Clamp between 0.8 and 1.5
          isReady: true,
          error: null,
        });

        onThemeChange?.(theme);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Theme initialization failed';
        setProviderState(prev => ({
          ...prev,
          error: errorMessage,
          isReady: false,
        }));
        onError?.(new Error(errorMessage));
      }
    };

    initializeTheme();
  }, [enabled, defaultTheme, enableAutoTheme, getCurrentTimeTheme, onThemeChange, onError]);

  /**
   * Auto-theme timer for time-based switching
   */
  useEffect(() => {
    if (!enabled || !providerState.isAutoThemeEnabled || !providerState.isReady) {
      return;
    }

    const checkTimeTheme = () => {
      const timeTheme = getCurrentTimeTheme();
      if (timeTheme.name !== providerState.currentTheme.name) {
        setProviderState(prev => ({
          ...prev,
          currentTheme: timeTheme,
        }));
        onThemeChange?.(timeTheme);
      }
    };

    // Check every 30 minutes
    const interval = setInterval(checkTimeTheme, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [
    enabled,
    providerState.isAutoThemeEnabled,
    providerState.isReady,
    providerState.currentTheme.name,
    getCurrentTimeTheme,
    onThemeChange,
  ]);

  /**
   * Context value implementation
   */
  const contextValue: ThemeContextValue = {
    currentTheme: providerState.currentTheme,
    availableThemes: Object.values(THERAPEUTIC_THEMES),
    isAutoThemeEnabled: providerState.isAutoThemeEnabled,

    setTheme: async (themeName: string): Promise<void> => {
      if (!enabled || !providerState.isReady) {
        return;
      }

      try {
        const theme = THERAPEUTIC_THEMES[themeName];
        if (!theme) {
          throw new Error(`Theme "${themeName}" not found`);
        }

        setProviderState(prev => ({
          ...prev,
          currentTheme: theme,
          isAutoThemeEnabled: false, // Disable auto when manually setting
        }));

        // Save preferences
        await AsyncStorage.setItem('being_theme', themeName);
        await AsyncStorage.setItem('being_auto_theme', 'false');

        onThemeChange?.(theme);

      } catch (error) {
        console.error('Failed to set theme:', error);
        throw error;
      }
    },

    enableAutoTheme: async (enabled: boolean): Promise<void> => {
      if (!providerState.isReady) {
        return;
      }

      try {
        let newTheme = providerState.currentTheme;

        if (enabled) {
          newTheme = getCurrentTimeTheme();
        }

        setProviderState(prev => ({
          ...prev,
          isAutoThemeEnabled: enabled,
          currentTheme: newTheme,
        }));

        await AsyncStorage.setItem('being_auto_theme', JSON.stringify(enabled));

        if (newTheme !== providerState.currentTheme) {
          onThemeChange?.(newTheme);
        }

      } catch (error) {
        console.error('Failed to enable auto theme:', error);
        throw error;
      }
    },

    getCurrentTimeTheme,

    increaseTextSize: () => {
      if (!enabled || !providerState.isReady) {
        return;
      }

      const newScale = Math.min(1.5, providerState.textScale + 0.1);
      setProviderState(prev => ({ ...prev, textScale: newScale }));
      AsyncStorage.setItem('being_text_scale', newScale.toString());
    },

    decreaseTextSize: () => {
      if (!enabled || !providerState.isReady) {
        return;
      }

      const newScale = Math.max(0.8, providerState.textScale - 0.1);
      setProviderState(prev => ({ ...prev, textScale: newScale }));
      AsyncStorage.setItem('being_text_scale', newScale.toString());
    },

    resetTextSize: () => {
      if (!enabled || !providerState.isReady) {
        return;
      }

      setProviderState(prev => ({ ...prev, textScale: 1.0 }));
      AsyncStorage.setItem('being_text_scale', '1.0');
    },

    textScale: providerState.textScale,
    isReady: enabled && providerState.isReady,
    error: providerState.error,
  };

  return (
    <ThemeContextProvider value={contextValue}>
      {children}
    </ThemeContextProvider>
  );
};

/**
 * Hook to use Theme Context
 */
export const useTheme = () => {
  const context = useThemeContext();

  if (!context) {
    console.warn('useTheme called outside ThemeProvider');
    return defaultContextValue;
  }

  return context;
};

/**
 * Hook for current theme colors
 */
export const useThemeColors = () => {
  const { currentTheme } = useTheme();
  return currentTheme.colors;
};

/**
 * Hook for therapeutic theme switching
 */
export const useTherapeuticTheme = () => {
  const { currentTheme, setTheme, enableAutoTheme, isAutoThemeEnabled } = useTheme();

  const switchToTherapeuticMode = useCallback(async () => {
    try {
      // Enable auto theme for therapeutic benefit
      await enableAutoTheme(true);
    } catch (error) {
      console.error('Failed to switch to therapeutic mode:', error);
    }
  }, [enableAutoTheme]);

  return {
    currentTheme,
    isTherapeuticMode: isAutoThemeEnabled,
    switchToTherapeuticMode,
    manualSetTheme: setTheme,
  };
};

/**
 * Hook for accessibility features
 */
export const useAccessibility = () => {
  const {
    textScale,
    increaseTextSize,
    decreaseTextSize,
    resetTextSize,
    currentTheme,
  } = useTheme();

  const isLargeText = textScale > 1.2;
  const isHighContrast = currentTheme.name === 'dark';

  return {
    textScale,
    isLargeText,
    isHighContrast,
    increaseTextSize,
    decreaseTextSize,
    resetTextSize,
  };
};

export default ThemeProvider;