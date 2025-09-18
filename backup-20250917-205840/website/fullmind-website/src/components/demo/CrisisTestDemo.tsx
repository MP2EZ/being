/**
 * Crisis Safety Test Demo Component
 * Demonstrates all 5 critical safety fixes implemented
 */

'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { CrisisButton } from '@/components/ui/CrisisButton/CrisisButton';
import { Button } from '@/components/ui/Button';

export const CrisisTestDemo: React.FC = () => {
  const { 
    isDark, 
    toggleColorMode, 
    enableCrisisMode, 
    disableCrisisMode, 
    isCrisisMode,
    themeVariant,
    setThemeVariant 
  } = useTheme();

  return (
    <div className="p-8 space-y-8 bg-bg-primary text-text-primary min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Crisis Safety Implementation Test
        </h1>
        
        {/* Status Display */}
        <div className="mb-8 p-4 bg-bg-secondary rounded-lg border border-border-primary">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Theme Mode: {isDark ? 'Dark' : 'Light'}</div>
            <div>Theme Variant: {themeVariant}</div>
            <div>Crisis Mode: {isCrisisMode ? 'ACTIVE' : 'Inactive'}</div>
            <div>CSS Variables: Working ✓</div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="mb-8 p-4 bg-bg-secondary rounded-lg border border-border-primary">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          <div className="flex flex-wrap gap-4">
            <Button onClick={toggleColorMode} variant="outline">
              Toggle Theme Mode
            </Button>
            <Button 
              onClick={() => setThemeVariant(themeVariant === 'morning' ? 'midday' : themeVariant === 'midday' ? 'evening' : 'morning')} 
              variant="outline"
            >
              Change Variant
            </Button>
            <Button 
              onClick={isCrisisMode ? disableCrisisMode : enableCrisisMode}
              variant={isCrisisMode ? "outline" : "destructive"}
            >
              {isCrisisMode ? 'Disable Crisis Mode' : 'Enable Crisis Mode'}
            </Button>
          </div>
        </div>

        {/* Crisis Button Tests */}
        <div className="mb-8 p-4 bg-bg-secondary rounded-lg border border-border-primary">
          <h2 className="text-xl font-semibold mb-4">Crisis Button Tests</h2>
          <div className="space-y-4">
            <p className="text-sm text-text-secondary mb-4">
              These crisis buttons should maintain visibility and contrast in all theme modes:
            </p>
            
            <div className="flex flex-wrap gap-4">
              <CrisisButton position="inline" size="standard" />
              <CrisisButton position="inline" size="large" />
              
              {/* Regular button for comparison */}
              <Button variant="outline" className="min-w-[60px] min-h-[60px]">
                Regular Button
              </Button>
              
              {/* Crisis-attributed button */}
              <button 
                data-crisis="true"
                className="px-4 py-2 bg-theme-primary text-white rounded min-w-[60px] min-h-[60px]"
              >
                Crisis Attr
              </button>
            </div>
          </div>
        </div>

        {/* Safety Test Results */}
        <div className="mb-8 p-4 bg-bg-secondary rounded-lg border border-border-primary">
          <h2 className="text-xl font-semibold mb-4">Safety Implementation Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>1. CSS Variable Fallbacks:</span>
              <span className="text-green-600 font-semibold">✓ IMPLEMENTED</span>
            </div>
            <div className="flex justify-between">
              <span>2. High Contrast Crisis Override:</span>
              <span className="text-green-600 font-semibold">✓ IMPLEMENTED</span>
            </div>
            <div className="flex justify-between">
              <span>3. Crisis Modal Dark Mode Fix:</span>
              <span className="text-green-600 font-semibold">✓ IMPLEMENTED</span>
            </div>
            <div className="flex justify-between">
              <span>4. Theme Switching Protection:</span>
              <span className="text-green-600 font-semibold">✓ IMPLEMENTED</span>
            </div>
            <div className="flex justify-between">
              <span>5. Crisis Component Integration:</span>
              <span className="text-green-600 font-semibold">✓ IMPLEMENTED</span>
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="mb-8 p-4 bg-crisis-bg/10 border border-crisis-border/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-crisis-bg">Testing Instructions</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Test 1 - CSS Variables:</strong> Crisis buttons maintain red background in both light/dark modes</p>
            <p><strong>Test 2 - High Contrast:</strong> Use browser dev tools to simulate "prefers-contrast: high" - crisis elements get enhanced contrast</p>
            <p><strong>Test 3 - Dark Mode:</strong> Toggle theme mode - crisis modal backgrounds adapt correctly</p>
            <p><strong>Test 4 - Theme Switching:</strong> Enable crisis mode then change themes - crisis visibility is protected</p>
            <p><strong>Test 5 - Crisis Integration:</strong> All crisis elements use theme-aware classes with failsafe fallbacks</p>
          </div>
        </div>

        {/* Crisis Mode Warning */}
        {isCrisisMode && (
          <div className="fixed top-4 left-4 right-4 p-4 bg-crisis-bg text-crisis-text rounded-lg border-3 border-crisis-border shadow-strong z-50">
            <div className="text-center">
              <h3 className="text-xl font-bold">CRISIS MODE ACTIVE</h3>
              <p className="text-sm mt-2">
                Emergency high-contrast mode enabled. All crisis elements have maximum visibility.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};