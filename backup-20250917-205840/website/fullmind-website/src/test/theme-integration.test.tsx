/**
 * FullMind Website - Theme Integration Tests
 * Tests the integration between Zustand theme store and React ThemeContext
 * Validates localStorage persistence, system theme detection, and crisis mode
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useThemeStore } from '@/store/themeStore';
import { useThemeIntegration } from '@/hooks/useThemeIntegration';

// Mock localStorage for testing
const mockStorage = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
};

// Test component that uses theme integration
const TestThemeComponent = () => {
  const theme = useThemeIntegration();
  
  return (
    <div data-testid="theme-test-component">
      <div data-testid="color-mode">{theme.colorMode}</div>
      <div data-testid="theme-variant">{theme.themeVariant}</div>
      <div data-testid="is-dark">{theme.isDark.toString()}</div>
      <div data-testid="is-crisis">{theme.isCrisisMode.toString()}</div>
      <div data-testid="is-hydrated">{theme.isHydrated.toString()}</div>
      
      {/* Theme controls */}
      <button 
        data-testid="toggle-mode" 
        onClick={() => theme.toggleColorMode()}
      >
        Toggle Mode
      </button>
      
      <button 
        data-testid="set-morning" 
        onClick={() => theme.setThemeVariant('morning')}
      >
        Set Morning
      </button>
      
      <button 
        data-testid="enable-crisis" 
        onClick={() => theme.enableCrisisMode()}
      >
        Enable Crisis Mode
      </button>
      
      <button 
        data-testid="enable-high-contrast" 
        onClick={() => theme.enableHighContrast()}
      >
        Enable High Contrast
      </button>
      
      {/* Accessibility preferences display */}
      <div data-testid="high-contrast">
        {theme.accessibility.highContrast.toString()}
      </div>
      <div data-testid="reduced-motion">
        {theme.accessibility.reducedMotion.toString()}
      </div>
    </div>
  );
};

// Wrapper component with theme provider
const ThemeTestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider
    defaultColorMode="auto"
    defaultThemeVariant="midday"
    storageKey="test-fullmind-theme"
  >
    {children}
  </ThemeProvider>
);

describe('Theme Integration', () => {
  let mockLocalStorage: ReturnType<typeof mockStorage>;
  
  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = mockStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    // Mock matchMedia for system theme detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
    
    // Mock performance API
    Object.defineProperty(window, 'performance', {
      value: {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
      },
      writable: true
    });
    
    // Clear any existing store state
    mockLocalStorage.clear();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Basic Theme Integration', () => {
    test('initializes with default theme preferences', async () => {
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('color-mode')).toHaveTextContent('auto');
        expect(screen.getByTestId('theme-variant')).toHaveTextContent('midday');
        expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
        expect(screen.getByTestId('is-crisis')).toHaveTextContent('false');
      });
    });
    
    test('toggles color mode correctly', async () => {
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('color-mode')).toHaveTextContent('auto');
      });
      
      // Toggle to dark mode
      fireEvent.click(screen.getByTestId('toggle-mode'));
      
      await waitFor(() => {
        expect(screen.getByTestId('color-mode')).toHaveTextContent('light');
      });
      
      // Toggle to light mode  
      fireEvent.click(screen.getByTestId('toggle-mode'));
      
      await waitFor(() => {
        expect(screen.getByTestId('color-mode')).toHaveTextContent('dark');
      });
    });
    
    test('changes theme variant correctly', async () => {
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('theme-variant')).toHaveTextContent('midday');
      });
      
      // Change to morning theme
      fireEvent.click(screen.getByTestId('set-morning'));
      
      await waitFor(() => {
        expect(screen.getByTestId('theme-variant')).toHaveTextContent('morning');
      });
    });
  });
  
  describe('Crisis Mode Integration', () => {
    test('enables crisis mode correctly', async () => {
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('is-crisis')).toHaveTextContent('false');
      });
      
      // Enable crisis mode
      fireEvent.click(screen.getByTestId('enable-crisis'));
      
      await waitFor(() => {
        expect(screen.getByTestId('is-crisis')).toHaveTextContent('true');
      });
    });
    
    test('crisis mode enables high contrast automatically', async () => {
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      // Initially high contrast should be false
      await waitFor(() => {
        expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
      });
      
      // Enable crisis mode
      fireEvent.click(screen.getByTestId('enable-crisis'));
      
      // Crisis mode should automatically enable high contrast
      await waitFor(() => {
        expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      });
    });
  });
  
  describe('Accessibility Preferences', () => {
    test('manages accessibility preferences correctly', async () => {
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      // Initially high contrast should be false
      await waitFor(() => {
        expect(screen.getByTestId('high-contrast')).toHaveTextContent('false');
      });
      
      // Enable high contrast
      fireEvent.click(screen.getByTestId('enable-high-contrast'));
      
      await waitFor(() => {
        expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      });
    });
  });
  
  describe('LocalStorage Persistence', () => {
    test('persists theme preferences to localStorage', async () => {
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      // Wait for hydration
      await waitFor(() => {
        expect(screen.getByTestId('is-hydrated')).toHaveTextContent('true');
      });
      
      // Change theme settings
      fireEvent.click(screen.getByTestId('toggle-mode'));
      fireEvent.click(screen.getByTestId('set-morning'));
      
      // Allow time for persistence
      await waitFor(() => {
        const stored = mockLocalStorage.getItem('fullmind-theme-preferences');
        expect(stored).toBeTruthy();
        
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed).toMatchObject({
            preferences: expect.objectContaining({
              colorMode: 'light',
              themeVariant: 'morning'
            }),
            persistenceVersion: '1.0.0'
          });
        }
      }, { timeout: 3000 });
    });
    
    test('loads theme preferences from localStorage on initialization', async () => {
      // Pre-populate localStorage with preferences
      const mockPreferences = {
        preferences: {
          colorMode: 'dark',
          themeVariant: 'evening',
          accessibility: {
            highContrast: true,
            reducedMotion: false,
            largeText: false,
            keyboardOnlyMode: false,
            focusIndicatorEnhanced: false,
            audioDescriptions: false,
            simplifiedInterface: false,
          },
          enableTransitions: true,
          respectSystemTheme: true,
          performanceMode: 'standard'
        },
        systemTheme: 'dark',
        persistenceVersion: '1.0.0',
        lastSavedAt: new Date().toISOString()
      };
      
      mockLocalStorage.setItem('fullmind-theme-preferences', JSON.stringify(mockPreferences));
      
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      // Should load the stored preferences
      await waitFor(() => {
        expect(screen.getByTestId('color-mode')).toHaveTextContent('dark');
        expect(screen.getByTestId('theme-variant')).toHaveTextContent('evening');
        expect(screen.getByTestId('high-contrast')).toHaveTextContent('true');
      }, { timeout: 3000 });
    });
  });
  
  describe('System Theme Detection', () => {
    test('detects system dark mode preference', async () => {
      // Mock system dark mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)' ? true : false,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
      
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      // With auto mode and system dark mode, should show as dark
      await waitFor(() => {
        expect(screen.getByTestId('color-mode')).toHaveTextContent('auto');
        expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
      });
    });
  });
  
  describe('Performance Monitoring', () => {
    test('records theme transition metrics', async () => {
      const performanceNowSpy = jest.spyOn(performance, 'now');
      let callCount = 0;
      performanceNowSpy.mockImplementation(() => {
        callCount++;
        return callCount * 100; // Simulate time passage
      });
      
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      // Wait for hydration
      await waitFor(() => {
        expect(screen.getByTestId('is-hydrated')).toHaveTextContent('true');
      });
      
      // Trigger theme change to record transition
      fireEvent.click(screen.getByTestId('toggle-mode'));
      
      // Performance should have been called for timing
      expect(performanceNowSpy).toHaveBeenCalled();
    });
  });
  
  describe('Error Handling', () => {
    test('handles localStorage errors gracefully', async () => {
      // Mock localStorage to throw errors
      const mockFailingStorage = {
        getItem: jest.fn(() => { throw new Error('Storage access denied'); }),
        setItem: jest.fn(() => { throw new Error('Storage write denied'); }),
        removeItem: jest.fn(),
        clear: jest.fn()
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: mockFailingStorage,
        writable: true
      });
      
      // Should not crash despite storage errors
      render(
        <ThemeTestWrapper>
          <TestThemeComponent />
        </ThemeTestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('theme-test-component')).toBeInTheDocument();
        expect(screen.getByTestId('color-mode')).toHaveTextContent('auto');
      });
    });
  });
});

// Integration test with actual DOM CSS variable application
describe('Theme CSS Integration', () => {
  test('applies CSS variables to document root', async () => {
    render(
      <ThemeTestWrapper>
        <TestThemeComponent />
      </ThemeTestWrapper>
    );
    
    // Wait for theme to be applied
    await waitFor(() => {
      expect(screen.getByTestId('is-hydrated')).toHaveTextContent('true');
    });
    
    // Check if CSS variables are set on document root
    await waitFor(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      
      // Should have theme CSS variables
      expect(document.documentElement.style.getPropertyValue('--fm-color-mode')).toBeTruthy();
      expect(document.documentElement.classList.contains('light') || 
             document.documentElement.classList.contains('dark')).toBeTruthy();
      expect(document.documentElement.classList.contains('theme-midday')).toBeTruthy();
    });
  });
  
  test('updates CSS variables when theme changes', async () => {
    render(
      <ThemeTestWrapper>
        <TestThemeComponent />
      </ThemeTestWrapper>
    );
    
    // Wait for initial theme application
    await waitFor(() => {
      expect(screen.getByTestId('is-hydrated')).toHaveTextContent('true');
    });
    
    // Change theme variant
    fireEvent.click(screen.getByTestId('set-morning'));
    
    // Should update CSS classes
    await waitFor(() => {
      expect(document.documentElement.classList.contains('theme-morning')).toBeTruthy();
      expect(document.documentElement.classList.contains('theme-midday')).toBeFalsy();
    });
  });
});

// Export for external testing use
export { TestThemeComponent, ThemeTestWrapper };