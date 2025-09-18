/**
 * FullMind Website - Theme Integration Hook
 * Provides unified access to both Zustand theme store and React Theme Context
 * Optimized for performance and state synchronization
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeStore, themeSelectors } from '@/store/themeStore';
import type { AccessibilityPreferences, ThemePreferences, ThemeMetrics } from '@/store/themeStore';

// ============================================================================
// INTEGRATED THEME HOOK
// ============================================================================

export interface ThemeIntegration {
  // Core theme state (from Context)
  colorMode: 'light' | 'dark' | 'auto';
  themeVariant: 'morning' | 'midday' | 'evening';
  isDark: boolean;
  isThemeTransitioning: boolean;
  isCrisisMode: boolean;
  
  // Enhanced state (from Zustand store)
  preferences: ThemePreferences;
  accessibility: AccessibilityPreferences;
  metrics: ThemeMetrics | null;
  isHydrated: boolean;
  
  // Theme actions
  setColorMode: (mode: 'light' | 'dark' | 'auto') => void;
  setThemeVariant: (variant: 'morning' | 'midday' | 'evening') => void;
  toggleColorMode: () => void;
  resetToSystemTheme: () => void;
  
  // Accessibility actions
  updateAccessibilityPreference: <K extends keyof AccessibilityPreferences>(
    key: K, 
    value: AccessibilityPreferences[K]
  ) => void;
  enableHighContrast: () => void;
  disableHighContrast: () => void;
  toggleReducedMotion: () => void;
  
  // Crisis mode management
  enableCrisisMode: () => void;
  disableCrisisMode: () => void;
  
  // Performance utilities
  recordThemeTransition: (duration: number) => void;
  measureRenderTime: (renderTime: number) => void;
  
  // Visual utilities (from Context)
  colors: ReturnType<typeof useTheme>['colors'];
  getCrisisButtonColors: () => ReturnType<typeof useTheme>['colors']['crisis'];
  getContrastRatio: (foreground: string, background: string) => number;
  ensureMinimumContrast: (foreground: string, background: string, minRatio?: number) => string;
  
  // Computed selectors
  getEffectiveColorMode: () => 'light' | 'dark';
  getEffectiveThemeVariant: () => 'morning' | 'midday' | 'evening';
  shouldUseTransitions: () => boolean;
  
  // Error handling
  error: string | null;
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
}

/**
 * Unified theme integration hook combining Zustand store with React Context
 * Provides complete theme management with performance optimization
 */
export function useThemeIntegration(): ThemeIntegration {
  // Get all state from both sources
  const themeContext = useTheme();
  const themeStore = useThemeStore();
  
  // Compute derived values with selectors for performance
  const computedSelectors = useMemo(() => ({
    getEffectiveColorMode: () => themeSelectors.getEffectiveColorMode(themeStore),
    getEffectiveThemeVariant: () => themeSelectors.getEffectiveThemeVariant(themeStore),
    shouldUseTransitions: () => themeSelectors.getShouldUseTransitions(themeStore),
  }), [themeStore]);
  
  // Memoized integration object
  return useMemo<ThemeIntegration>(() => ({
    // Core theme state
    colorMode: themeStore.preferences.colorMode,
    themeVariant: themeStore.preferences.themeVariant,
    isDark: themeContext.isDark,
    isThemeTransitioning: themeStore.isThemeTransitioning,
    isCrisisMode: themeStore.isCrisisMode,
    
    // Enhanced state
    preferences: themeStore.preferences,
    accessibility: themeStore.preferences.accessibility,
    metrics: themeStore.metrics,
    isHydrated: themeStore.isHydrated,
    
    // Theme actions
    setColorMode: themeStore.setColorMode,
    setThemeVariant: themeStore.setThemeVariant,
    toggleColorMode: themeStore.toggleColorMode,
    resetToSystemTheme: themeStore.resetToSystemTheme,
    
    // Accessibility actions
    updateAccessibilityPreference: themeStore.updateAccessibilityPreference,
    enableHighContrast: themeStore.enableHighContrastMode,
    disableHighContrast: themeStore.disableHighContrastMode,
    toggleReducedMotion: themeStore.toggleReducedMotion,
    
    // Crisis mode management
    enableCrisisMode: themeContext.enableCrisisMode, // Use context for DOM integration
    disableCrisisMode: themeContext.disableCrisisMode,
    
    // Performance utilities
    recordThemeTransition: themeStore.recordThemeTransition,
    measureRenderTime: themeStore.measureRenderTime,
    
    // Visual utilities
    colors: themeContext.colors,
    getCrisisButtonColors: themeContext.getCrisisButtonColors,
    getContrastRatio: themeContext.getContrastRatio,
    ensureMinimumContrast: themeContext.ensureMinimumContrast,
    
    // Computed selectors
    ...computedSelectors,
    
    // Error handling
    error: themeStore.error,
    clearError: themeStore.clearError,
    retryLastOperation: themeStore.retryLastOperation,
  }), [themeContext, themeStore, computedSelectors]);
}

// ============================================================================
// SPECIALIZED HOOKS FOR SPECIFIC USE CASES
// ============================================================================

/**
 * Lightweight hook for read-only theme state
 * Optimized for components that only need to read theme values
 */
export function useThemeState() {
  const { colorMode, themeVariant, isDark, isCrisisMode, colors } = useThemeIntegration();
  
  return useMemo(() => ({
    colorMode,
    themeVariant,
    isDark,
    isCrisisMode,
    colors,
  }), [colorMode, themeVariant, isDark, isCrisisMode, colors]);
}

/**
 * Hook for theme actions only
 * Optimized for components that only need to trigger theme changes
 */
export function useThemeActions() {
  const {
    setColorMode,
    setThemeVariant,
    toggleColorMode,
    resetToSystemTheme,
    enableCrisisMode,
    disableCrisisMode,
  } = useThemeIntegration();
  
  return useMemo(() => ({
    setColorMode,
    setThemeVariant,
    toggleColorMode,
    resetToSystemTheme,
    enableCrisisMode,
    disableCrisisMode,
  }), [
    setColorMode,
    setThemeVariant,
    toggleColorMode,
    resetToSystemTheme,
    enableCrisisMode,
    disableCrisisMode,
  ]);
}

/**
 * Hook for accessibility preferences
 * Specialized for accessibility-focused components
 */
export function useAccessibilityPreferences() {
  const {
    accessibility,
    updateAccessibilityPreference,
    enableHighContrast,
    disableHighContrast,
    toggleReducedMotion,
  } = useThemeIntegration();
  
  return useMemo(() => ({
    preferences: accessibility,
    updatePreference: updateAccessibilityPreference,
    enableHighContrast,
    disableHighContrast,
    toggleReducedMotion,
  }), [
    accessibility,
    updateAccessibilityPreference,
    enableHighContrast,
    disableHighContrast,
    toggleReducedMotion,
  ]);
}

/**
 * Hook for performance monitoring
 * Used by performance-sensitive components and debugging tools
 */
export function useThemePerformance() {
  const {
    metrics,
    recordThemeTransition,
    measureRenderTime,
    isThemeTransitioning,
  } = useThemeIntegration();
  
  const recordTransition = useCallback(() => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      recordThemeTransition(duration);
    };
  }, [recordThemeTransition]);
  
  const measureRender = useCallback(() => {
    const start = performance.now();
    return () => {
      const renderTime = performance.now() - start;
      measureRenderTime(renderTime);
    };
  }, [measureRenderTime]);
  
  return useMemo(() => ({
    metrics,
    isTransitioning: isThemeTransitioning,
    recordTransition,
    measureRender,
  }), [metrics, isThemeTransitioning, recordTransition, measureRender]);
}

/**
 * Hook for crisis mode management
 * Specialized for emergency and safety-critical components
 */
export function useCrisisMode() {
  const {
    isCrisisMode,
    enableCrisisMode,
    disableCrisisMode,
    getCrisisButtonColors,
  } = useThemeIntegration();
  
  return useMemo(() => ({
    isCrisisMode,
    enableCrisisMode,
    disableCrisisMode,
    getCrisisButtonColors,
  }), [isCrisisMode, enableCrisisMode, disableCrisisMode, getCrisisButtonColors]);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a theme-aware CSS class generator
 */
export function createThemeClassGenerator() {
  const { getEffectiveColorMode, getEffectiveThemeVariant } = useThemeIntegration();
  
  return useCallback((baseClasses: string = '') => {
    const colorMode = getEffectiveColorMode();
    const variant = getEffectiveThemeVariant();
    
    const themeClasses = [
      baseClasses,
      `theme-${variant}`,
      colorMode,
    ].filter(Boolean).join(' ');
    
    return themeClasses;
  }, [getEffectiveColorMode, getEffectiveThemeVariant]);
}

/**
 * Subscribe to theme changes with cleanup
 */
export function useThemeSubscription(
  callback: (theme: ThemeIntegration) => void,
  dependencies: (keyof ThemeIntegration)[] = ['colorMode', 'themeVariant']
) {
  const theme = useThemeIntegration();
  
  // Create dependency array from theme properties
  const watchedValues = useMemo(() => {
    return dependencies.map(dep => theme[dep]);
  }, [theme, dependencies]);
  
  // Subscribe to changes
  useMemo(() => {
    callback(theme);
  }, [callback, theme, ...watchedValues]);
}

export default useThemeIntegration;