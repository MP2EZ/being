/**
 * FullMind Website - Accessibility Context Provider
 * Global accessibility state management for WCAG AA compliance
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityContext as IAccessibilityContext, AccessibilityPreferences } from '@/types/accessibility';
import { useAccessibility } from '@/hooks/useAccessibility';

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AccessibilityContext = createContext<IAccessibilityContext | null>(null);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface AccessibilityProviderProps {
  children: React.ReactNode;
  defaultPreferences?: Partial<AccessibilityPreferences>;
}

export function AccessibilityProvider({ 
  children, 
  defaultPreferences = {} 
}: AccessibilityProviderProps) {
  const accessibility = useAccessibility('AccessibilityProvider');
  const [isInitialized, setIsInitialized] = useState(false);

  // Apply default preferences on initialization
  useEffect(() => {
    if (!isInitialized && Object.keys(defaultPreferences).length > 0) {
      accessibility.updatePreferences(defaultPreferences);
      setIsInitialized(true);
    }
  }, [accessibility, defaultPreferences, isInitialized]);

  // Apply accessibility preferences to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Add CSS classes based on preferences
    const classNames = [];
    
    if (accessibility.preferences.reduceMotion) {
      classNames.push('reduce-motion');
    }
    
    if (accessibility.preferences.highContrast) {
      classNames.push('high-contrast');
    }
    
    if (accessibility.preferences.largeText) {
      classNames.push('large-text');
    }
    
    if (accessibility.preferences.keyboardOnlyMode) {
      classNames.push('keyboard-navigation');
    }
    
    if (accessibility.preferences.focusIndicatorEnhanced) {
      classNames.push('enhanced-focus');
    }
    
    if (accessibility.preferences.simplifiedInterface) {
      classNames.push('simplified-interface');
    }

    // Remove existing accessibility classes
    root.classList.remove(
      'reduce-motion', 
      'high-contrast', 
      'large-text', 
      'keyboard-navigation',
      'enhanced-focus',
      'simplified-interface'
    );
    
    // Add current preference classes
    root.classList.add(...classNames);

    // Set CSS custom properties for dynamic styling
    root.style.setProperty('--fm-motion-duration', accessibility.preferences.reduceMotion ? '0.01s' : '0.3s');
    root.style.setProperty('--fm-text-scale', accessibility.preferences.largeText ? '1.25' : '1');
    root.style.setProperty('--fm-focus-width', accessibility.preferences.focusIndicatorEnhanced ? '3px' : '2px');
    
    // Set contrast multiplier
    const contrastMultiplier = accessibility.preferences.highContrast ? '1.5' : '1';
    root.style.setProperty('--fm-contrast-multiplier', contrastMultiplier);

  }, [accessibility.preferences]);

  // Add global keyboard event listener for accessibility shortcuts
  useEffect(() => {
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      // Crisis help shortcut (Alt + C)
      if (event.altKey && event.key === 'c') {
        event.preventDefault();
        const crisisButton = document.getElementById('crisis-help-button');
        if (crisisButton) {
          crisisButton.click();
          accessibility.announceToScreenReader('Crisis help accessed via keyboard shortcut', 'assertive');
        }
      }
      
      // Emergency shortcut (Alt + E)
      if (event.altKey && event.key === 'e') {
        event.preventDefault();
        const emergencyButton = document.getElementById('emergency-button');
        if (emergencyButton) {
          emergencyButton.click();
          accessibility.announceToScreenReader('Emergency resources accessed via keyboard shortcut', 'assertive');
        }
      }
      
      // Skip to main content (Alt + S)
      if (event.altKey && event.key === 's') {
        event.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
          accessibility.announceToScreenReader('Skipped to main content', 'polite');
        }
      }
      
      // Toggle keyboard navigation mode (Alt + K)
      if (event.altKey && event.key === 'k') {
        event.preventDefault();
        accessibility.updatePreferences({
          keyboardOnlyMode: !accessibility.preferences.keyboardOnlyMode
        });
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [accessibility]);

  // Add mouse detection for keyboard-only mode
  useEffect(() => {
    let isMouseUsed = false;

    const handleMouseMove = () => {
      if (!isMouseUsed) {
        isMouseUsed = true;
        // If user is using mouse, disable keyboard-only mode
        if (accessibility.preferences.keyboardOnlyMode) {
          accessibility.updatePreferences({ keyboardOnlyMode: false });
        }
      }
    };

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        // User is using keyboard for navigation
        accessibility.updatePreferences({ keyboardOnlyMode: true });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [accessibility]);

  return (
    <AccessibilityContext.Provider value={accessibility}>
      {children}
      {/* Global ARIA Live Region */}
      <accessibility.AriaLiveRegion />
    </AccessibilityContext.Provider>
  );
}

// ============================================================================
// HOOK FOR CONSUMING CONTEXT
// ============================================================================

export function useAccessibilityContext(): IAccessibilityContext {
  const context = useContext(AccessibilityContext);
  
  if (!context) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  
  return context;
}

// ============================================================================
// ACCESSIBILITY SETTINGS COMPONENT
// ============================================================================

interface AccessibilitySettingsProps {
  showAdvanced?: boolean;
  className?: string;
}

export function AccessibilitySettings({ 
  showAdvanced = false, 
  className = '' 
}: AccessibilitySettingsProps) {
  const { preferences, updatePreferences, announceToScreenReader } = useAccessibilityContext();

  const handlePreferenceChange = (key: keyof AccessibilityPreferences, value: boolean) => {
    updatePreferences({ [key]: value });
    announceToScreenReader(`${key} ${value ? 'enabled' : 'disabled'}`, 'polite');
  };

  return (
    <div 
      className={`accessibility-settings ${className}`}
      role="region" 
      aria-labelledby="accessibility-settings-title"
      data-testid="accessibility-settings"
    >
      <h3 id="accessibility-settings-title" className="text-lg font-semibold text-text-primary mb-4">
        Accessibility Settings
      </h3>
      
      <div className="space-y-4">
        {/* Motion Preferences */}
        <div className="setting-group">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.reduceMotion}
              onChange={(e) => handlePreferenceChange('reduceMotion', e.target.checked)}
              className="h-5 w-5 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              aria-describedby="reduce-motion-desc"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">Reduce motion</span>
              <p id="reduce-motion-desc" className="text-xs text-text-secondary">
                Minimizes animations and transitions for a calmer experience
              </p>
            </div>
          </label>
        </div>

        {/* Visual Preferences */}
        <div className="setting-group">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.highContrast}
              onChange={(e) => handlePreferenceChange('highContrast', e.target.checked)}
              className="h-5 w-5 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              aria-describedby="high-contrast-desc"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">High contrast</span>
              <p id="high-contrast-desc" className="text-xs text-text-secondary">
                Increases contrast between text and background colors
              </p>
            </div>
          </label>
        </div>

        <div className="setting-group">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.largeText}
              onChange={(e) => handlePreferenceChange('largeText', e.target.checked)}
              className="h-5 w-5 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              aria-describedby="large-text-desc"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">Large text</span>
              <p id="large-text-desc" className="text-xs text-text-secondary">
                Increases text size for better readability
              </p>
            </div>
          </label>
        </div>

        {/* Navigation Preferences */}
        <div className="setting-group">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.focusIndicatorEnhanced}
              onChange={(e) => handlePreferenceChange('focusIndicatorEnhanced', e.target.checked)}
              className="h-5 w-5 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              aria-describedby="enhanced-focus-desc"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">Enhanced focus indicators</span>
              <p id="enhanced-focus-desc" className="text-xs text-text-secondary">
                Makes keyboard focus indicators more visible
              </p>
            </div>
          </label>
        </div>

        <div className="setting-group">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.simplifiedInterface}
              onChange={(e) => handlePreferenceChange('simplifiedInterface', e.target.checked)}
              className="h-5 w-5 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              aria-describedby="simplified-interface-desc"
            />
            <div>
              <span className="text-sm font-medium text-text-primary">Simplified interface</span>
              <p id="simplified-interface-desc" className="text-xs text-text-secondary">
                Reduces visual complexity and distractions
              </p>
            </div>
          </label>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-primary-500 hover:text-primary-600">
              Advanced Settings
            </summary>
            <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
              <div className="setting-group">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.screenReaderMode}
                    onChange={(e) => handlePreferenceChange('screenReaderMode', e.target.checked)}
                    className="h-5 w-5 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                    aria-describedby="screen-reader-desc"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">Screen reader optimizations</span>
                    <p id="screen-reader-desc" className="text-xs text-text-secondary">
                      Optimizes interface for screen reader users
                    </p>
                  </div>
                </label>
              </div>

              <div className="setting-group">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.audioDescriptions}
                    onChange={(e) => handlePreferenceChange('audioDescriptions', e.target.checked)}
                    className="h-5 w-5 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                    aria-describedby="audio-descriptions-desc"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">Audio descriptions</span>
                    <p id="audio-descriptions-desc" className="text-xs text-text-secondary">
                      Enable audio descriptions for visual content
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </details>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-text-primary mb-2">Keyboard Shortcuts</h4>
        <ul className="text-xs text-text-secondary space-y-1">
          <li><kbd>Alt + C</kbd> - Access crisis help</li>
          <li><kbd>Alt + E</kbd> - Emergency resources</li>
          <li><kbd>Alt + S</kbd> - Skip to main content</li>
          <li><kbd>Alt + K</kbd> - Toggle keyboard navigation mode</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// ACCESSIBILITY STATUS INDICATOR
// ============================================================================

export function AccessibilityStatusIndicator() {
  const { preferences, capabilities } = useAccessibilityContext();
  
  const activeFeatures = Object.entries(preferences).filter(([_, value]) => value).length;
  const statusColor = activeFeatures > 0 ? 'text-clinical-safe' : 'text-text-muted';

  return (
    <div 
      className="accessibility-status flex items-center space-x-2"
      role="status"
      aria-label={`${activeFeatures} accessibility features active`}
      data-testid="accessibility-status"
    >
      <svg 
        className={`h-5 w-5 ${statusColor}`}
        fill="currentColor" 
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
      </svg>
      <span className="sr-only">
        {activeFeatures} accessibility {activeFeatures === 1 ? 'feature' : 'features'} active
      </span>
    </div>
  );
}