/**
 * Being. Clinical Testing Setup
 * 
 * Global test setup for clinical-grade testing environment including:
 * - Jest DOM matchers with accessibility extensions
 * - Clinical data mocking and validation utilities
 * - Assessment scoring accuracy verification
 * - Crisis safety testing environments
 * - Performance monitoring for therapeutic UX
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { jest } from '@jest/globals';

// ============================================================================
// TESTING LIBRARY CONFIGURATION
// ============================================================================

// Configure testing library for clinical accessibility requirements
configure({
  // Longer timeouts for clinical accuracy validation
  asyncUtilTimeout: 10000,
  
  // Enhanced accessibility testing
  computedStyleSupportsPseudoElements: true,
  
  // Clinical-grade DOM testing
  getElementError: (message, container) => {
    const prettierMessage = `
      ${message}

      Clinical Testing Context:
      - Ensure all crisis elements are accessible
      - Verify assessment score accuracy
      - Check therapeutic content compliance
      
      ${container ? container.innerHTML : 'No container'}
    `;
    return new Error(prettierMessage);
  },
});

// ============================================================================
// GLOBAL TEST ENVIRONMENT SETUP
// ============================================================================

// Mock window.matchMedia for theme testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage for persistence testing
const mockStorage = (() => {
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
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage,
  writable: true,
});

// Mock ResizeObserver for responsive testing
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for performance testing
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock performance API for therapeutic UX timing validation
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    navigation: {
      type: 'navigate',
    },
  },
  writable: true,
});

// ============================================================================
// CLINICAL TESTING UTILITIES
// ============================================================================

/**
 * Clinical accuracy validation for assessment scores
 */
export const validateAssessmentAccuracy = (
  expected: number,
  actual: number,
  tolerance: number = 0.001
): boolean => {
  return Math.abs(expected - actual) <= tolerance;
};

/**
 * PHQ-9 score validation utility
 */
export const validatePHQ9Score = (score: number): boolean => {
  return Number.isInteger(score) && score >= 0 && score <= 27;
};

/**
 * GAD-7 score validation utility
 */
export const validateGAD7Score = (score: number): boolean => {
  return Number.isInteger(score) && score >= 0 && score <= 21;
};

/**
 * Crisis threshold validation
 */
export const isCrisisThreshold = (score: number, type: 'PHQ9' | 'GAD7'): boolean => {
  if (type === 'PHQ9') return score >= 20;
  if (type === 'GAD7') return score >= 15;
  return false;
};

/**
 * Mock clinical data generator for testing
 */
export const generateMockClinicalData = (overrides: Partial<any> = {}) => {
  return {
    assessments: [
      {
        id: 'test-assessment-1',
        type: 'PHQ9' as const,
        score: 12,
        severity: 'moderate' as const,
        crisisThreshold: false,
        completedAt: new Date('2024-01-15T10:00:00Z'),
        ...overrides.assessment,
      },
    ],
    progressTracking: [
      {
        id: 'test-progress-1',
        userId: 'test-user-1',
        date: new Date('2024-01-15T10:00:00Z'),
        mood: {
          valence: 3,
          arousal: 5,
          dominance: 6,
        },
        ...overrides.progress,
      },
    ],
    sessionSummaries: [
      {
        id: 'test-session-1',
        type: 'breathing' as const,
        duration: 180, // 3 minutes
        completedAt: new Date('2024-01-15T10:00:00Z'),
        ...overrides.session,
      },
    ],
    ...overrides,
  };
};

/**
 * Mock consent record for privacy testing
 */
export const generateMockConsent = (overrides: Partial<any> = {}) => {
  return {
    consentId: 'test-consent-1' as const,
    userId: 'test-user-1' as const,
    consentType: 'full-export' as const,
    dataCategories: ['assessments', 'mood-tracking', 'session-data'] as const,
    consentGiven: true,
    consentTimestamp: '2024-01-15T10:00:00Z' as const,
    ...overrides,
  };
};

/**
 * High contrast mode simulation for accessibility testing
 */
export const simulateHighContrast = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query.includes('prefers-contrast: high'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

/**
 * Crisis mode simulation for safety testing
 */
export const simulateCrisisMode = () => {
  document.documentElement.classList.add('crisis-mode');
  document.documentElement.style.setProperty('--crisis-mode', 'true');
};

/**
 * Therapeutic timing validation for breathing exercises
 */
export const validateBreathingTiming = (
  duration: number,
  expectedDuration: number = 180000 // 3 minutes
): boolean => {
  const tolerance = 1000; // 1 second tolerance
  return Math.abs(duration - expectedDuration) <= tolerance;
};

// ============================================================================
// JEST CUSTOM MATCHERS
// ============================================================================

expect.extend({
  /**
   * Custom matcher for clinical accuracy validation
   */
  toBeClinicallyAccurate(received: number, expected: number, tolerance: number = 0.001) {
    const pass = Math.abs(received - expected) <= tolerance;
    
    if (pass) {
      return {
        message: () => `Expected ${received} not to be clinically accurate to ${expected} within tolerance ${tolerance}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be clinically accurate to ${expected} within tolerance ${tolerance}. Difference: ${Math.abs(received - expected)}`,
        pass: false,
      };
    }
  },

  /**
   * Custom matcher for crisis threshold validation
   */
  toTriggerCrisisThreshold(received: { score: number; type: 'PHQ9' | 'GAD7' }) {
    const { score, type } = received;
    const pass = (type === 'PHQ9' && score >= 20) || (type === 'GAD7' && score >= 15);
    
    if (pass) {
      return {
        message: () => `Expected score ${score} for ${type} not to trigger crisis threshold`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected score ${score} for ${type} to trigger crisis threshold (PHQ9 >= 20, GAD7 >= 15)`,
        pass: false,
      };
    }
  },

  /**
   * Custom matcher for therapeutic timing validation
   */
  toHaveTherapeuticTiming(received: number, expected: number = 180000) {
    const tolerance = 1000; // 1 second tolerance
    const pass = Math.abs(received - expected) <= tolerance;
    
    if (pass) {
      return {
        message: () => `Expected ${received}ms not to match therapeutic timing of ${expected}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received}ms to match therapeutic timing of ${expected}ms within ${tolerance}ms tolerance`,
        pass: false,
      };
    }
  },

  /**
   * Custom matcher for accessibility compliance
   */
  toBeAccessible(received: HTMLElement) {
    const hasAriaLabel = received.hasAttribute('aria-label') || received.hasAttribute('aria-labelledby');
    const hasTabIndex = received.hasAttribute('tabindex') || received.tagName.toLowerCase() in ['button', 'a', 'input', 'select', 'textarea'];
    const hasRole = received.hasAttribute('role');
    
    const pass = hasAriaLabel && (hasTabIndex || hasRole);
    
    if (pass) {
      return {
        message: () => `Expected element not to be accessible`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to be accessible (needs aria-label and focusable/role)`,
        pass: false,
      };
    }
  },

  /**
   * Custom matcher for crisis visibility
   */
  toHaveCrisisVisibility(received: HTMLElement) {
    const styles = window.getComputedStyle(received);
    const backgroundColor = styles.backgroundColor;
    const color = styles.color;
    const opacity = parseFloat(styles.opacity);
    const visibility = styles.visibility;
    
    const pass = opacity >= 0.9 && visibility !== 'hidden' && backgroundColor !== 'transparent';
    
    if (pass) {
      return {
        message: () => `Expected element not to have crisis visibility`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to have crisis visibility (opacity >= 0.9, visible, non-transparent background)`,
        pass: false,
      };
    }
  },
});

// ============================================================================
// GLOBAL ERROR HANDLING
// ============================================================================

// Catch and report unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection in clinical tests:', { reason, promise });
  throw new Error(`Unhandled promise rejection: ${reason}`);
});

// Catch and report uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in clinical tests:', error);
  throw error;
});

// Console error tracking for clinical safety
const originalError = console.error;
console.error = (...args) => {
  // Track errors for clinical compliance
  if (process.env.NODE_ENV === 'test') {
    const errorMessage = args.join(' ');
    if (errorMessage.includes('Warning') || errorMessage.includes('Error')) {
      // Store error for test reporting
      if (!(global as any).__clinicalTestErrors) {
        (global as any).__clinicalTestErrors = [];
      }
      (global as any).__clinicalTestErrors.push({
        message: errorMessage,
        timestamp: new Date().toISOString(),
        stack: new Error().stack,
      });
    }
  }
  originalError.apply(console, args);
};

// ============================================================================
// TYPE DECLARATIONS FOR CUSTOM MATCHERS
// ============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeClinicallyAccurate(expected: number, tolerance?: number): R;
      toTriggerCrisisThreshold(): R;
      toHaveTherapeuticTiming(expected?: number): R;
      toBeAccessible(): R;
      toHaveCrisisVisibility(): R;
    }
  }
}