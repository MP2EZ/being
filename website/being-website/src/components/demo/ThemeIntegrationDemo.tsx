/**
 * Being. Website - Theme Integration Demo
 * Live demonstration of theme management with Zustand store integration
 * For testing and development purposes
 */

'use client';

import React from 'react';
import { useThemeIntegration } from '@/hooks/useThemeIntegration';
import { Card } from '@/components/ui/Card';

export function ThemeIntegrationDemo() {
  const theme = useThemeIntegration();

  return (
    <Card className="p-6 max-w-4xl mx-auto my-8" data-testid="theme-integration-demo">
      <h2 className="text-2xl font-bold text-[var(--fm-text-primary)] mb-6">
        Theme Integration Demo
      </h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Theme State */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--fm-text-primary)]">
            Current Theme State
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--fm-text-secondary)]">Color Mode:</span>
              <span className="text-[var(--fm-text-primary)] font-mono bg-[var(--fm-surface-elevated)] px-2 py-1 rounded">
                {theme.colorMode}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[var(--fm-text-secondary)]">Theme Variant:</span>
              <span className="text-[var(--fm-text-primary)] font-mono bg-[var(--fm-surface-elevated)] px-2 py-1 rounded">
                {theme.themeVariant}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[var(--fm-text-secondary)]">Is Dark Mode:</span>
              <span className={`font-mono px-2 py-1 rounded ${theme.isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'}`}>
                {theme.isDark.toString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[var(--fm-text-secondary)]">Crisis Mode:</span>
              <span className={`font-mono px-2 py-1 rounded ${theme.isCrisisMode ? 'bg-red-600 text-white' : 'bg-[var(--fm-surface-elevated)] text-[var(--fm-text-primary)]'}`}>
                {theme.isCrisisMode.toString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[var(--fm-text-secondary)]">Is Hydrated:</span>
              <span className="text-[var(--fm-text-primary)] font-mono bg-[var(--fm-surface-elevated)] px-2 py-1 rounded">
                {theme.isHydrated.toString()}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[var(--fm-text-secondary)]">High Contrast:</span>
              <span className="text-[var(--fm-text-primary)] font-mono bg-[var(--fm-surface-elevated)] px-2 py-1 rounded">
                {theme.accessibility.highContrast.toString()}
              </span>
            </div>
          </div>
        </div>
        
        {/* Theme Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--fm-text-primary)]">
            Theme Controls
          </h3>
          
          <div className="space-y-3">
            {/* Color Mode Controls */}
            <div>
              <label className="block text-sm font-medium text-[var(--fm-text-secondary)] mb-2">
                Color Mode
              </label>
              <div className="flex gap-2">
                {(['light', 'dark', 'auto'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => theme.setColorMode(mode)}
                    className={`px-3 py-2 text-sm rounded transition-all ${
                      theme.colorMode === mode
                        ? 'bg-[var(--fm-theme-primary)] text-white'
                        : 'bg-[var(--fm-surface-interactive)] text-[var(--fm-text-primary)] hover:bg-[var(--fm-surface-hover)]'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Theme Variant Controls */}
            <div>
              <label className="block text-sm font-medium text-[var(--fm-text-secondary)] mb-2">
                Theme Variant
              </label>
              <div className="flex gap-2">
                {(['morning', 'midday', 'evening'] as const).map((variant) => (
                  <button
                    key={variant}
                    onClick={() => theme.setThemeVariant(variant)}
                    className={`px-3 py-2 text-sm rounded transition-all ${
                      theme.themeVariant === variant
                        ? 'bg-[var(--fm-theme-primary)] text-white'
                        : 'bg-[var(--fm-surface-interactive)] text-[var(--fm-text-primary)] hover:bg-[var(--fm-surface-hover)]'
                    }`}
                  >
                    {variant.charAt(0).toUpperCase() + variant.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Accessibility Controls */}
            <div>
              <label className="block text-sm font-medium text-[var(--fm-text-secondary)] mb-2">
                Accessibility
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => theme.toggleReducedMotion()}
                  className={`w-full px-3 py-2 text-sm rounded transition-all text-left ${
                    theme.accessibility.reducedMotion
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : 'bg-[var(--fm-surface-interactive)] text-[var(--fm-text-primary)] hover:bg-[var(--fm-surface-hover)]'
                  }`}
                >
                  {theme.accessibility.reducedMotion ? '✓' : '○'} Reduced Motion
                </button>
                
                <button
                  onClick={() => 
                    theme.accessibility.highContrast 
                      ? theme.disableHighContrast() 
                      : theme.enableHighContrast()
                  }
                  className={`w-full px-3 py-2 text-sm rounded transition-all text-left ${
                    theme.accessibility.highContrast
                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100'
                      : 'bg-[var(--fm-surface-interactive)] text-[var(--fm-text-primary)] hover:bg-[var(--fm-surface-hover)]'
                  }`}
                >
                  {theme.accessibility.highContrast ? '✓' : '○'} High Contrast
                </button>
              </div>
            </div>
            
            {/* Crisis Mode Control */}
            <div>
              <label className="block text-sm font-medium text-[var(--fm-text-secondary)] mb-2">
                Emergency Mode
              </label>
              <button
                onClick={() => 
                  theme.isCrisisMode 
                    ? theme.disableCrisisMode() 
                    : theme.enableCrisisMode()
                }
                className={`w-full px-3 py-2 text-sm rounded font-medium transition-all ${
                  theme.isCrisisMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100'
                }`}
              >
                {theme.isCrisisMode ? 'Disable Crisis Mode' : 'Enable Crisis Mode'}
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="border-t border-[var(--fm-border-primary)] pt-3">
              <label className="block text-sm font-medium text-[var(--fm-text-secondary)] mb-2">
                Quick Actions
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => theme.toggleColorMode()}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--fm-surface-interactive)] text-[var(--fm-text-primary)] rounded hover:bg-[var(--fm-surface-hover)] transition-all"
                >
                  Toggle Mode
                </button>
                
                <button
                  onClick={() => theme.resetToSystemTheme()}
                  className="flex-1 px-3 py-2 text-sm bg-[var(--fm-surface-interactive)] text-[var(--fm-text-primary)] rounded hover:bg-[var(--fm-surface-hover)] transition-all"
                >
                  System Auto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Performance Metrics */}
      {theme.metrics && (
        <div className="mt-6 pt-6 border-t border-[var(--fm-border-primary)]">
          <h3 className="text-lg font-semibold text-[var(--fm-text-primary)] mb-3">
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-[var(--fm-text-secondary)]">Transition Time</div>
              <div className="text-[var(--fm-text-primary)] font-mono">
                {Math.round(theme.metrics.transitionDuration)}ms
              </div>
            </div>
            <div className="text-center">
              <div className="text-[var(--fm-text-secondary)]">Render Time</div>
              <div className="text-[var(--fm-text-primary)] font-mono">
                {Math.round(theme.metrics.renderTime)}ms
              </div>
            </div>
            <div className="text-center">
              <div className="text-[var(--fm-text-secondary)]">Operations</div>
              <div className="text-[var(--fm-text-primary)] font-mono">
                {theme.metrics.operationCount}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[var(--fm-text-secondary)]">Last Update</div>
              <div className="text-[var(--fm-text-primary)] font-mono text-xs">
                {theme.metrics.lastMeasured.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Color Palette Preview */}
      <div className="mt-6 pt-6 border-t border-[var(--fm-border-primary)]">
        <h3 className="text-lg font-semibold text-[var(--fm-text-primary)] mb-3">
          Current Color Palette
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { name: 'Primary BG', var: 'bg-primary' },
            { name: 'Secondary BG', var: 'bg-secondary' },
            { name: 'Theme Primary', var: 'theme-primary' },
            { name: 'Theme Success', var: 'theme-success' },
            { name: 'Text Primary', var: 'text-primary' },
            { name: 'Text Secondary', var: 'text-secondary' },
            { name: 'Border Primary', var: 'border-primary' },
            { name: 'Crisis BG', var: 'crisis-bg' },
          ].map((color) => (
            <div key={color.name} className="text-center">
              <div 
                className="w-full h-12 rounded border border-[var(--fm-border-primary)] mb-2"
                style={{ backgroundColor: `var(--fm-${color.var})` }}
              />
              <div className="text-xs text-[var(--fm-text-secondary)]">
                {color.name}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* localStorage Status */}
      <div className="mt-6 pt-6 border-t border-[var(--fm-border-primary)]">
        <h3 className="text-lg font-semibold text-[var(--fm-text-primary)] mb-3">
          Persistence Status
        </h3>
        <div className="bg-[var(--fm-surface-elevated)] rounded p-4">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-[var(--fm-text-secondary)]">Hydrated:</span>
              <span className={`ml-2 font-mono ${theme.isHydrated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {theme.isHydrated ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-[var(--fm-text-secondary)]">Error:</span>
              <span className={`ml-2 font-mono ${theme.error ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {theme.error || 'None'}
              </span>
            </div>
            <div>
              <span className="text-[var(--fm-text-secondary)]">Transitioning:</span>
              <span className={`ml-2 font-mono ${theme.isThemeTransitioning ? 'text-yellow-600 dark:text-yellow-400' : 'text-[var(--fm-text-primary)]'}`}>
                {theme.isThemeTransitioning ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          
          {theme.error && (
            <div className="mt-3">
              <button
                onClick={() => theme.clearError()}
                className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-100"
              >
                Clear Error
              </button>
              <button
                onClick={() => theme.retryLastOperation()}
                className="ml-2 px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100"
              >
                Retry Operation
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default ThemeIntegrationDemo;