/**
 * Simple Theme Context - New Architecture Compatible
 * Lightweight theming system without SafeImports dependencies
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { logSecurity } from '@/core/services/logging';

/**
 * Theme configuration
 */
export interface SimpleThemeColors {
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

export interface SimpleTheme {
  readonly colors: SimpleThemeColors;
  readonly name: string;
  readonly isDark: boolean;
}

/**
 * Therapeutic themes
 */
const THERAPEUTIC_THEME: SimpleTheme = {
  name: 'therapeutic',
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
};

/**
 * Context value interface
 */
export interface SimpleThemeContextValue {
  readonly theme: SimpleTheme;
}

/**
 * Default context value
 */
const defaultValue: SimpleThemeContextValue = {
  theme: THERAPEUTIC_THEME,
};

/**
 * Create theme context - using basic React Context
 */
const SimpleThemeContext = createContext<SimpleThemeContextValue>(defaultValue);

/**
 * Provider props
 */
export interface SimpleThemeProviderProps {
  children: ReactNode;
  theme?: SimpleTheme;
}

/**
 * Simple Theme Provider - No SafeImports dependency
 */
export const SimpleThemeProvider: React.FC<SimpleThemeProviderProps> = ({
  children,
  theme = THERAPEUTIC_THEME,
}) => {
  const value: SimpleThemeContextValue = {
    theme,
  };

  return (
    <SimpleThemeContext.Provider value={value}>
      {children}
    </SimpleThemeContext.Provider>
  );
};

/**
 * Hook to use theme context
 */
export const useSimpleTheme = (): SimpleThemeContextValue => {
  const context = useContext(SimpleThemeContext);

  if (!context) {
    // Fallback to default instead of throwing error for stability
    logSecurity('useSimpleTheme used outside provider, using default', 'low');
    return defaultValue;
  }

  return context;
};

/**
 * Hook for just theme colors
 */
export const useSimpleThemeColors = (): SimpleThemeColors => {
  const { theme } = useSimpleTheme();
  return theme.colors;
};

export default SimpleThemeProvider;