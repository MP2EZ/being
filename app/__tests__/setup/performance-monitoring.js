/**
 * Performance Monitoring Setup
 * Real-time performance tracking for local development
 */

// Enhanced performance API for testing
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {}
  };
}

// Performance monitoring state
global.performanceMonitor = {
  testMetrics: new Map(),
  crisisMetrics: [],
  clinicalMetrics: [],
  thresholds: {
    crisis: 3000,
    clinical: 5000,
    unit: 1000,
    integration: 10000,
    e2e: 30000
  },
  
  // Start monitoring a test
  startTest(testName) {
    const startTime = performance.now();
    this.testMetrics.set(testName, {
      startTime,
      category: this.categorizeTest(testName),
      isCrisis: /crisis|emergency|988/i.test(testName),
      isClinical: /clinical|phq|gad|assessment/i.test(testName)
    });
    
    // Mark start for crisis tests
    if (this.testMetrics.get(testName).isCrisis) {
      console.log(`🔒 Crisis test started: ${testName}`);
    }
  },
  
  // End monitoring and record metrics
  endTest(testName, status = 'passed') {
    const testData = this.testMetrics.get(testName);
    if (!testData) return null;
    
    const endTime = performance.now();
    const duration = endTime - testData.startTime;
    const threshold = this.thresholds[testData.category] || this.thresholds.unit;
    
    const result = {
      testName,
      duration,
      category: testData.category,
      isCrisis: testData.isCrisis,
      isClinical: testData.isClinical,
      status,
      threshold,
      isSlowTest: duration > threshold,
      timestamp: new Date().toISOString()
    };
    
    // Store in appropriate category
    if (testData.isCrisis) {
      this.crisisMetrics.push(result);
      
      // Immediate feedback for crisis tests
      if (duration > this.thresholds.crisis) {
        console.error(`🚨 CRISIS PERFORMANCE VIOLATION: ${testName} - ${duration.toFixed(2)}ms > ${this.thresholds.crisis}ms`);
      } else {
        console.log(`✅ Crisis test performance OK: ${testName} - ${duration.toFixed(2)}ms`);
      }
    }
    
    if (testData.isClinical) {
      this.clinicalMetrics.push(result);
    }
    
    // Clean up
    this.testMetrics.delete(testName);
    
    return result;
  },
  
  // Categorize test based on name/path
  categorizeTest(testName) {
    if (/crisis|emergency/i.test(testName)) return 'crisis';
    if (/clinical|phq|gad/i.test(testName)) return 'clinical';
    if (/integration|e2e/i.test(testName)) return 'integration';
    if (/performance|perf/i.test(testName)) return 'performance';
    return 'unit';
  },
  
  // Get current metrics summary
  getSummary() {
    return {
      totalCrisisTests: this.crisisMetrics.length,
      slowCrisisTests: this.crisisMetrics.filter(t => t.isSlowTest).length,
      totalClinicalTests: this.clinicalMetrics.length,
      slowClinicalTests: this.clinicalMetrics.filter(t => t.isSlowTest).length,
      criticalIssues: this.crisisMetrics.filter(t => t.isSlowTest).length
    };
  },
  
  // Reset metrics
  reset() {
    this.testMetrics.clear();
    this.crisisMetrics = [];
    this.clinicalMetrics = [];
  }
};

// Memory monitoring for performance tests
global.memoryMonitor = {
  measurements: [],
  
  // Record memory usage
  record(label = 'test') {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      this.measurements.push({
        label,
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss
      });
    }
  },
  
  // Get memory delta between two points
  getDelta(startLabel, endLabel) {
    const start = this.measurements.find(m => m.label === startLabel);
    const end = this.measurements.find(m => m.label === endLabel);
    
    if (!start || !end) return null;
    
    return {
      heapUsedDelta: end.heapUsed - start.heapUsed,
      heapTotalDelta: end.heapTotal - start.heapTotal,
      timeDelta: end.timestamp - start.timestamp
    };
  },
  
  // Clear measurements
  clear() {
    this.measurements = [];
  }
};

// Enhanced test utilities with performance monitoring
global.perfUtils = {
  // Measure async function performance
  async measureAsync(fn, label = 'async-operation') {
    global.performanceMonitor.startTest(label);
    global.memoryMonitor.record(`${label}-start`);
    
    try {
      const result = await fn();
      global.memoryMonitor.record(`${label}-end`);
      const perfResult = global.performanceMonitor.endTest(label, 'passed');
      
      return {
        result,
        performance: perfResult,
        memory: global.memoryMonitor.getDelta(`${label}-start`, `${label}-end`)
      };
    } catch (error) {
      global.memoryMonitor.record(`${label}-error`);
      global.performanceMonitor.endTest(label, 'failed');
      throw error;
    }
  },
  
  // Measure synchronous function performance
  measureSync(fn, label = 'sync-operation') {
    global.performanceMonitor.startTest(label);
    global.memoryMonitor.record(`${label}-start`);
    
    try {
      const result = fn();
      global.memoryMonitor.record(`${label}-end`);
      const perfResult = global.performanceMonitor.endTest(label, 'passed');
      
      return {
        result,
        performance: perfResult,
        memory: global.memoryMonitor.getDelta(`${label}-start`, `${label}-end`)
      };
    } catch (error) {
      global.memoryMonitor.record(`${label}-error`);
      global.performanceMonitor.endTest(label, 'failed');
      throw error;
    }
  },
  
  // Assert performance requirements
  assertPerformance(duration, maxDuration, testName) {
    if (duration > maxDuration) {
      throw new Error(`Performance assertion failed: ${testName} took ${duration}ms (max: ${maxDuration}ms)`);
    }
  },
  
  // Assert crisis test performance (strict 3s requirement)
  assertCrisisPerformance(duration, testName) {
    this.assertPerformance(duration, 3000, `Crisis test: ${testName}`);
  }
};

// Automatic performance monitoring hooks
const originalBeforeEach = global.beforeEach;
const originalAfterEach = global.afterEach;

global.beforeEach = function(fn) {
  return originalBeforeEach(() => {
    const testName = expect.getState().currentTestName;
    if (testName) {
      global.performanceMonitor.startTest(testName);
      global.memoryMonitor.record(`${testName}-start`);
    }
    
    if (fn) return fn();
  });
};

global.afterEach = function(fn) {
  return originalAfterEach(() => {
    const testName = expect.getState().currentTestName;
    if (testName) {
      global.memoryMonitor.record(`${testName}-end`);
      const perfResult = global.performanceMonitor.endTest(testName);
      
      // Store performance result for potential use in test
      if (perfResult) {
        global.lastTestPerformance = perfResult;
      }
    }
    
    if (fn) return fn();
  });
};

console.log('🔍 Performance monitoring enabled for local testing');