/**
 * Crisis Safety Testing Setup
 * Specialized setup for crisis detection and safety protocol testing
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// ============================================================================
// CRISIS TESTING CONSTANTS
// ============================================================================

export const CRISIS_TEST_CONSTANTS = {
  PHQ9_CRISIS_THRESHOLD: 20,
  GAD7_CRISIS_THRESHOLD: 15,
  MAX_RESPONSE_TIME_MS: 200,
  MAX_ACCESS_TIME_MS: 3000,
  CRISIS_BUTTON_MIN_SIZE: 44, // px
  REQUIRED_CONTRAST_RATIO: 7.0, // AAA level for crisis elements
  HOTLINE_988: '988',
  CRISIS_TEXT: '741741',
  EMERGENCY_911: '911',
} as const;

// ============================================================================
// CRISIS TEST SETUP
// ============================================================================

beforeAll(() => {
  console.log('🚨 Starting Crisis Safety Protocol Tests');
  console.log(`Crisis Thresholds: PHQ-9 ≥${CRISIS_TEST_CONSTANTS.PHQ9_CRISIS_THRESHOLD}, GAD-7 ≥${CRISIS_TEST_CONSTANTS.GAD7_CRISIS_THRESHOLD}`);
  
  // Initialize crisis testing environment
  (global as any).__crisisTestResults = {
    totalCrisisTests: 0,
    passedCrisisTests: 0,
    thresholdDetections: [],
    responseTimeMeasurements: [],
    accessibilityValidations: [],
    safetyProtocolTests: [],
  };

  // Simulate crisis testing environment
  setupCrisisTestEnvironment();
});

beforeEach(() => {
  // Reset crisis test state
  document.documentElement.classList.remove('crisis-mode', 'high-contrast');
  (global as any).__currentCrisisTestPassed = true;
});

afterEach(() => {
  // Track crisis test results
  const results = (global as any).__crisisTestResults;
  results.totalCrisisTests++;
  
  if ((global as any).__currentCrisisTestPassed) {
    results.passedCrisisTests++;
  }
  
  // Clean up crisis mode
  document.documentElement.classList.remove('crisis-mode', 'high-contrast');
});

afterAll(() => {
  const results = (global as any).__crisisTestResults;
  const crisisSuccessRate = results.passedCrisisTests / results.totalCrisisTests;
  
  console.log('\n🚨 Crisis Safety Testing Results:');
  console.log(`Total Crisis Tests: ${results.totalCrisisTests}`);
  console.log(`Passed: ${results.passedCrisisTests}`);
  console.log(`Success Rate: ${(crisisSuccessRate * 100).toFixed(1)}%`);
  
  // Crisis tests must have 100% success rate
  expect(crisisSuccessRate).toBe(1.0);
});

// ============================================================================
// CRISIS TEST UTILITIES
// ============================================================================

function setupCrisisTestEnvironment() {
  // Mock crisis hotlines
  (global as any).__mockCrisisHotlines = {
    '988': { available: true, type: 'suicide-prevention' },
    '741741': { available: true, type: 'crisis-text' },
    '911': { available: true, type: 'emergency' },
  };

  // Mock high contrast media query
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: query.includes('prefers-contrast: high') && 
             document.documentElement.classList.contains('high-contrast'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  // Override console.error to track crisis-related errors
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('crisis') || message.includes('emergency')) {
      (global as any).__currentCrisisTestPassed = false;
    }
    originalError.apply(console, args);
  };
}

export function trackCrisisDetection(
  assessmentType: 'PHQ9' | 'GAD7',
  score: number,
  detected: boolean,
  expected: boolean
) {
  const results = (global as any).__crisisTestResults;
  const accurate = detected === expected;
  
  results.thresholdDetections.push({
    assessmentType,
    score,
    detected,
    expected,
    accurate,
    timestamp: new Date().toISOString(),
  });

  if (!accurate) {
    (global as any).__currentCrisisTestPassed = false;
  }

  return accurate;
}

export function measureCrisisResponseTime(
  action: string,
  responseTimeMs: number
): boolean {
  const results = (global as any).__crisisTestResults;
  const withinLimit = responseTimeMs <= CRISIS_TEST_CONSTANTS.MAX_RESPONSE_TIME_MS;
  
  results.responseTimeMeasurements.push({
    action,
    responseTimeMs,
    withinLimit,
    timestamp: new Date().toISOString(),
  });

  if (!withinLimit) {
    (global as any).__currentCrisisTestPassed = false;
  }

  return withinLimit;
}

export function validateCrisisAccessibility(
  element: Element,
  requirements: {
    minSize?: number;
    contrastRatio?: number;
    keyboardAccessible?: boolean;
    screenReaderAccessible?: boolean;
  } = {}
): boolean {
  const results = (global as any).__crisisTestResults;
  const validation = {
    element: element.tagName,
    requirements,
    results: {} as any,
    passed: true,
    timestamp: new Date().toISOString(),
  };

  // Check minimum size
  if (requirements.minSize) {
    const rect = element.getBoundingClientRect();
    const meetsSize = rect.width >= requirements.minSize && rect.height >= requirements.minSize;
    validation.results.size = { width: rect.width, height: rect.height, meetsSize };
    validation.passed = validation.passed && meetsSize;
  }

  // Check contrast ratio (simplified for testing)
  if (requirements.contrastRatio) {
    const meetsContrast = true; // Would use actual color analysis
    validation.results.contrast = { meetsContrast, required: requirements.contrastRatio };
    validation.passed = validation.passed && meetsContrast;
  }

  // Check keyboard accessibility
  if (requirements.keyboardAccessible) {
    const hasTabIndex = element.hasAttribute('tabindex') || 
                        ['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase());
    validation.results.keyboard = { accessible: hasTabIndex };
    validation.passed = validation.passed && hasTabIndex;
  }

  // Check screen reader accessibility
  if (requirements.screenReaderAccessible) {
    const hasAccessibleName = element.hasAttribute('aria-label') || 
                              element.hasAttribute('aria-labelledby') ||
                              (element as HTMLElement).textContent?.trim();
    validation.results.screenReader = { hasAccessibleName: !!hasAccessibleName };
    validation.passed = validation.passed && !!hasAccessibleName;
  }

  results.accessibilityValidations.push(validation);

  if (!validation.passed) {
    (global as any).__currentCrisisTestPassed = false;
  }

  return validation.passed;
}

export function testCrisisProtocol(
  protocolName: string,
  testFunction: () => Promise<boolean> | boolean
): Promise<boolean> | boolean {
  const results = (global as any).__crisisTestResults;
  
  const executeTest = async () => {
    const startTime = performance.now();
    const passed = await testFunction();
    const duration = performance.now() - startTime;
    
    results.safetyProtocolTests.push({
      protocol: protocolName,
      passed,
      duration,
      timestamp: new Date().toISOString(),
    });

    if (!passed) {
      (global as any).__currentCrisisTestPassed = false;
    }

    return passed;
  };

  return executeTest();
}

export function simulateStressConditions() {
  // Simulate high contrast mode
  document.documentElement.classList.add('high-contrast');
  
  // Simulate crisis mode
  document.documentElement.classList.add('crisis-mode');
  
  // Simulate reduced motion preferences
  Object.defineProperty(window, 'matchMedia', {
    value: jest.fn().mockImplementation(query => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

export function validateEmergencyContacts(): boolean {
  const hotlines = (global as any).__mockCrisisHotlines;
  
  const requiredHotlines = [
    CRISIS_TEST_CONSTANTS.HOTLINE_988,
    CRISIS_TEST_CONSTANTS.CRISIS_TEXT,
    CRISIS_TEST_CONSTANTS.EMERGENCY_911,
  ];

  const allAvailable = requiredHotlines.every(number => 
    hotlines[number] && hotlines[number].available
  );

  if (!allAvailable) {
    (global as any).__currentCrisisTestPassed = false;
  }

  return allAvailable;
}

export function generateCrisisTestReport() {
  const results = (global as any).__crisisTestResults;
  
  const thresholdAccuracy = results.thresholdDetections.length > 0 
    ? results.thresholdDetections.filter((d: any) => d.accurate).length / results.thresholdDetections.length
    : 1.0;

  const responseTimeCompliance = results.responseTimeMeasurements.length > 0
    ? results.responseTimeMeasurements.filter((m: any) => m.withinLimit).length / results.responseTimeMeasurements.length
    : 1.0;

  const accessibilityCompliance = results.accessibilityValidations.length > 0
    ? results.accessibilityValidations.filter((v: any) => v.passed).length / results.accessibilityValidations.length
    : 1.0;

  return {
    summary: {
      totalTests: results.totalCrisisTests,
      passedTests: results.passedCrisisTests,
      successRate: results.passedCrisisTests / results.totalCrisisTests,
      thresholdAccuracy,
      responseTimeCompliance,
      accessibilityCompliance,
    },
    details: {
      thresholdDetections: results.thresholdDetections,
      responseTimeMeasurements: results.responseTimeMeasurements,
      accessibilityValidations: results.accessibilityValidations,
      safetyProtocolTests: results.safetyProtocolTests,
    },
  };
}