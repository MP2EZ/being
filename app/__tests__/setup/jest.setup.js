/**
 * Jest Setup for Local Development Testing
 * Enhanced setup with performance monitoring and clinical safety validation
 */

import '@testing-library/jest-native/extend-expect';

// Performance monitoring for local development
global.performance = global.performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {}
};

// Clinical safety test utilities
global.CLINICAL_SAFETY = {
  PHQ9_CRISIS_THRESHOLD: 20,
  GAD7_CRISIS_THRESHOLD: 15,
  CRISIS_RESPONSE_TIME_MS: 3000,
  EMERGENCY_NUMBER: '988'
};

// Test performance tracking
const testPerformance = {
  startTimes: new Map(),
  results: []
};

global.testPerformance = testPerformance;

// Enhanced beforeEach for performance tracking
beforeEach(() => {
  const testName = expect.getState().currentTestName;
  testPerformance.startTimes.set(testName, performance.now());
  
  // Clinical safety validation setup
  if (testName?.includes('crisis') || testName?.includes('Crisis')) {
    console.log(`🔒 CRISIS TEST: ${testName} - Safety protocols active`);
  }
});

// Enhanced afterEach for performance reporting
afterEach(() => {
  const testName = expect.getState().currentTestName;
  const startTime = testPerformance.startTimes.get(testName);
  
  if (startTime) {
    const duration = performance.now() - startTime;
    testPerformance.results.push({
      testName,
      duration,
      timestamp: new Date().toISOString(),
      category: categorizeTest(testName)
    });
    
    // Performance warnings for local development
    if (duration > 5000) {
      console.warn(`⚠️  SLOW TEST: ${testName} took ${duration.toFixed(2)}ms`);
    }
    
    // Crisis test performance validation
    if (testName?.includes('crisis') && duration > 3000) {
      console.error(`🚨 CRISIS PERFORMANCE VIOLATION: ${testName} took ${duration.toFixed(2)}ms (max: 3000ms)`);
    }
  }
});

// Test categorization for reporting
function categorizeTest(testName) {
  if (testName?.includes('crisis') || testName?.includes('Crisis')) return 'crisis';
  if (testName?.includes('clinical') || testName?.includes('Clinical')) return 'clinical';
  if (testName?.includes('performance') || testName?.includes('Performance')) return 'performance';
  if (testName?.includes('accessibility') || testName?.includes('Accessibility')) return 'accessibility';
  if (testName?.includes('security') || testName?.includes('Security')) return 'security';
  return 'unit';
}

// Global test utilities
global.testUtils = {
  // Clinical test data generators
  generatePHQ9Score: (severity = 'moderate') => {
    const scores = {
      minimal: Math.floor(Math.random() * 5), // 0-4
      mild: Math.floor(Math.random() * 5) + 5, // 5-9
      moderate: Math.floor(Math.random() * 5) + 10, // 10-14
      moderatelySevere: Math.floor(Math.random() * 5) + 15, // 15-19
      severe: Math.floor(Math.random() * 8) + 20 // 20-27
    };
    return scores[severity] || scores.moderate;
  },
  
  generateGAD7Score: (severity = 'moderate') => {
    const scores = {
      minimal: Math.floor(Math.random() * 5), // 0-4
      mild: Math.floor(Math.random() * 5) + 5, // 5-9
      moderate: Math.floor(Math.random() * 6) + 10, // 10-15
      severe: Math.floor(Math.random() * 6) + 15 // 15-21
    };
    return scores[severity] || scores.moderate;
  },
  
  // Crisis simulation utilities
  simulateCrisisDetection: () => ({
    phq9Score: Math.floor(Math.random() * 8) + 20, // 20-27
    gad7Score: Math.floor(Math.random() * 7) + 15, // 15-21
    timestamp: new Date().toISOString(),
    triggerType: 'assessment'
  }),
  
  // Performance testing utilities
  measurePerformance: (fn, name) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`⏱️  ${name}: ${(end - start).toFixed(2)}ms`);
    return { result, duration: end - start };
  },
  
  // Accessibility testing utilities
  mockScreenReader: () => ({
    announcements: [],
    announce: function(text) {
      this.announcements.push({
        text,
        timestamp: Date.now()
      });
    },
    getLastAnnouncement: function() {
      return this.announcements[this.announcements.length - 1];
    }
  })
};

// Mock React Native modules for testing
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'ios',
      select: jest.fn(obj => obj.ios)
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 }))
    },
    Alert: {
      alert: jest.fn()
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve())
    }
  };
});

// Mock Expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Heavy: 'heavy'
  }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve())
}));

// Global teardown for performance reporting
afterAll(() => {
  if (global.testPerformance?.results?.length > 0) {
    const results = global.testPerformance.results;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const slowTests = results.filter(r => r.duration > 1000);
    
    console.log('\n📊 Local Test Performance Summary:');
    console.log(`   Total tests: ${results.length}`);
    console.log(`   Average duration: ${avgDuration.toFixed(2)}ms`);
    
    if (slowTests.length > 0) {
      console.log(`   Slow tests (>1s): ${slowTests.length}`);
      slowTests.forEach(test => {
        console.log(`     - ${test.testName}: ${test.duration.toFixed(2)}ms`);
      });
    }
  }
});