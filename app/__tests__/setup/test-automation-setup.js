/**
 * TEST AUTOMATION SETUP - Week 3 Orchestration
 * Comprehensive test environment configuration for automated CI/CD testing
 * 
 * FEATURES:
 * - Performance monitoring and regression detection
 * - Safety validation and crisis response testing
 * - Real-time metrics collection and alerting
 * - Cross-platform compatibility validation
 * - Memory leak detection and resource monitoring
 */

import '@testing-library/jest-native/extend-expect';

// Global test configuration
global.__TEST__ = true;
global.__AUTOMATION__ = true;
global.PERFORMANCE_MONITORING = true;

// Performance monitoring setup
const performanceBaselines = {
  crisis_response_ms: 200,
  ui_render_ms: 16.67, // 60fps = 16.67ms per frame
  memory_limit_mb: 50,
  assessment_calculation_ms: 100,
  breathing_animation_fps: 60
};

global.PERFORMANCE_BASELINES = performanceBaselines;

// Test execution metrics
const testMetrics = {
  startTime: Date.now(),
  testsExecuted: 0,
  testsFailed: 0,
  performanceViolations: 0,
  memoryLeaks: 0,
  securityIssues: 0
};

global.TEST_METRICS = testMetrics;

// Mock React Native environment
jest.mock('react-native', () => {
  const RN = require('react-native/jest/setup');
  
  return {
    ...RN,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })), // iPhone X dimensions
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    },
    Platform: {
      OS: 'ios',
      Version: '14.0',
      select: jest.fn((obj) => obj.ios || obj.default)
    },
    Alert: {
      alert: jest.fn(),
      prompt: jest.fn()
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true))
    }
  };
});

// Mock Expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve())
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve())
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve())
}));

// Performance monitoring utilities
const performanceMonitor = {
  startTimer: (testName) => {
    const startTime = performance.now();
    return {
      end: () => {
        const duration = performance.now() - startTime;
        performanceMonitor.recordMetric(testName, duration);
        return duration;
      }
    };
  },
  
  recordMetric: (testName, duration) => {
    // Check against baselines
    if (testName.includes('crisis') && duration > performanceBaselines.crisis_response_ms) {
      testMetrics.performanceViolations++;
      console.warn(`⚠️ PERFORMANCE VIOLATION: ${testName} took ${duration}ms (baseline: ${performanceBaselines.crisis_response_ms}ms)`);
    }
    
    if (testName.includes('render') && duration > performanceBaselines.ui_render_ms) {
      testMetrics.performanceViolations++;
      console.warn(`⚠️ UI PERFORMANCE: ${testName} took ${duration}ms (target: ${performanceBaselines.ui_render_ms}ms)`);
    }
    
    // Store metrics for reporting
    if (!global.PERFORMANCE_METRICS) {
      global.PERFORMANCE_METRICS = {};
    }
    global.PERFORMANCE_METRICS[testName] = duration;
  },
  
  checkMemoryUsage: () => {
    if (process.memoryUsage) {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      
      if (heapUsedMB > performanceBaselines.memory_limit_mb) {
        testMetrics.memoryLeaks++;
        console.warn(`🧠 MEMORY WARNING: ${heapUsedMB.toFixed(2)}MB heap used (limit: ${performanceBaselines.memory_limit_mb}MB)`);
      }
      
      return heapUsedMB;
    }
    return 0;
  }
};

global.PERFORMANCE_MONITOR = performanceMonitor;

// Safety validation utilities
const safetyValidator = {
  validateCrisisResponse: (responseTime) => {
    if (responseTime > performanceBaselines.crisis_response_ms) {
      throw new Error(`🚨 CRISIS SAFETY VIOLATION: Response time ${responseTime}ms exceeds ${performanceBaselines.crisis_response_ms}ms threshold`);
    }
    return true;
  },
  
  validateAssessmentAccuracy: (phqScore, gadScore, expectedCrisis) => {
    const actualCrisis = phqScore >= 20 || gadScore >= 15;
    if (actualCrisis !== expectedCrisis) {
      testMetrics.securityIssues++;
      throw new Error(`🏥 CLINICAL ACCURACY ERROR: PHQ-9=${phqScore}, GAD-7=${gadScore}, Expected Crisis=${expectedCrisis}, Actual=${actualCrisis}`);
    }
    return true;
  },
  
  validateAccessibility: (component) => {
    // Basic accessibility validation
    const hasAriaLabel = component.props && component.props['aria-label'];
    const hasRole = component.props && component.props.role;
    
    if (!hasAriaLabel && !hasRole) {
      console.warn('♿ ACCESSIBILITY WARNING: Component missing aria-label or role');
    }
    
    return true;
  }
};

global.SAFETY_VALIDATOR = safetyValidator;

// Custom matchers for automated testing
expect.extend({
  toBeWithinPerformanceThreshold(received, testName, threshold) {
    const pass = received <= threshold;
    
    if (!pass) {
      testMetrics.performanceViolations++;
    }
    
    return {
      message: () => 
        pass 
          ? `Expected ${testName} performance ${received}ms to exceed threshold ${threshold}ms`
          : `Expected ${testName} performance ${received}ms to be within threshold ${threshold}ms`,
      pass
    };
  },
  
  toHaveCrisisResponseTime(received, maxMs = 200) {
    const pass = received <= maxMs;
    
    if (!pass) {
      testMetrics.performanceViolations++;
      console.error(`🚨 CRISIS RESPONSE FAILURE: ${received}ms > ${maxMs}ms`);
    }
    
    return {
      message: () => 
        pass 
          ? `Expected crisis response time ${received}ms to exceed ${maxMs}ms`
          : `Expected crisis response time ${received}ms to be within ${maxMs}ms`,
      pass
    };
  },
  
  toHaveCorrectCrisisDetection(received, phqScore, gadScore) {
    const expectedCrisis = phqScore >= 20 || gadScore >= 15;
    const pass = received === expectedCrisis;
    
    if (!pass) {
      testMetrics.securityIssues++;
    }
    
    return {
      message: () => 
        pass 
          ? `Expected crisis detection to be incorrect for PHQ-9=${phqScore}, GAD-7=${gadScore}`
          : `Expected crisis detection ${received} to match clinical thresholds for PHQ-9=${phqScore}, GAD-7=${gadScore} (expected: ${expectedCrisis})`,
      pass
    };
  },
  
  toBeAccessible(received) {
    const hasAriaLabel = received.props && received.props['aria-label'];
    const hasRole = received.props && received.props.role;
    const hasTestId = received.props && received.props.testID;
    
    const pass = hasAriaLabel || hasRole || hasTestId;
    
    return {
      message: () => 
        pass 
          ? `Expected component to be inaccessible`
          : `Expected component to have accessibility attributes (aria-label, role, or testID)`,
      pass
    };
  }
});

// Test environment setup hooks
beforeAll(() => {
  console.log('🚀 Starting automated test execution...');
  console.log(`📊 Performance baselines: Crisis <${performanceBaselines.crisis_response_ms}ms, Memory <${performanceBaselines.memory_limit_mb}MB`);
  
  testMetrics.startTime = Date.now();
  
  // Reset performance metrics
  global.PERFORMANCE_METRICS = {};
});

beforeEach(() => {
  testMetrics.testsExecuted++;
  
  // Check memory usage before each test
  performanceMonitor.checkMemoryUsage();
  
  // Mock console methods to capture warnings and errors
  jest.spyOn(console, 'warn');
  jest.spyOn(console, 'error');
});

afterEach(() => {
  // Check for console warnings and errors
  const warnings = console.warn.mock.calls.length;
  const errors = console.error.mock.calls.length;
  
  if (warnings > 0) {
    console.log(`⚠️ Test generated ${warnings} warnings`);
  }
  
  if (errors > 0) {
    testMetrics.testsFailed++;
    console.log(`❌ Test generated ${errors} errors`);
  }
  
  // Restore console methods
  console.warn.mockRestore();
  console.error.mockRestore();
  
  // Memory usage check after test
  performanceMonitor.checkMemoryUsage();
});

afterAll(() => {
  const totalDuration = Date.now() - testMetrics.startTime;
  
  console.log('📊 Test Execution Summary:');
  console.log(`  📝 Tests executed: ${testMetrics.testsExecuted}`);
  console.log(`  ❌ Tests failed: ${testMetrics.testsFailed}`);
  console.log(`  ⚡ Performance violations: ${testMetrics.performanceViolations}`);
  console.log(`  🧠 Memory warnings: ${testMetrics.memoryLeaks}`);
  console.log(`  🔒 Security issues: ${testMetrics.securityIssues}`);
  console.log(`  ⏱️ Total duration: ${totalDuration}ms`);
  
  // Write metrics to file for CI/CD reporting
  if (process.env.CI || process.env.WRITE_METRICS) {
    const fs = require('fs');
    const path = require('path');
    
    const metricsReport = {
      timestamp: new Date().toISOString(),
      execution_summary: testMetrics,
      performance_metrics: global.PERFORMANCE_METRICS || {},
      baselines: performanceBaselines,
      total_duration_ms: totalDuration
    };
    
    const reportPath = path.join(process.cwd(), 'test-results', 'automation-metrics.json');
    
    // Ensure directory exists
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(metricsReport, null, 2));
    console.log(`📊 Metrics report written to: ${reportPath}`);
  }
  
  // Fail if critical issues detected
  if (testMetrics.securityIssues > 0) {
    console.error('🚨 CRITICAL: Security issues detected - failing test suite');
    process.exit(1);
  }
  
  if (testMetrics.performanceViolations > 5) {
    console.error('⚡ CRITICAL: Too many performance violations - failing test suite');
    process.exit(1);
  }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  testMetrics.testsFailed++;
});

// Export utilities for use in tests
module.exports = {
  performanceMonitor,
  safetyValidator,
  performanceBaselines,
  testMetrics
};