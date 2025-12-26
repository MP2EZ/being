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
// MEMORY FIX: Limited array sizes to prevent unbounded growth (DEBUG-48)
const MAX_METRICS_ENTRIES = 50;

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

    // Mark start for crisis tests (only in verbose mode)
    if (this.testMetrics.get(testName).isCrisis && process.env.JEST_VERBOSE) {
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

    // Store in appropriate category with size limits (DEBUG-48 memory fix)
    if (testData.isCrisis) {
      if (this.crisisMetrics.length >= MAX_METRICS_ENTRIES) {
        this.crisisMetrics.shift(); // Remove oldest entry
      }
      this.crisisMetrics.push(result);

      // Immediate feedback for crisis tests (only violations, to reduce console spam)
      if (duration > this.thresholds.crisis) {
        console.error(`🚨 CRISIS PERFORMANCE VIOLATION: ${testName} - ${duration.toFixed(2)}ms > ${this.thresholds.crisis}ms`);
      }
    }

    if (testData.isClinical) {
      if (this.clinicalMetrics.length >= MAX_METRICS_ENTRIES) {
        this.clinicalMetrics.shift(); // Remove oldest entry
      }
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
// MEMORY FIX: Limited measurements array to prevent unbounded growth (DEBUG-48)
const MAX_MEMORY_MEASUREMENTS = 100;

global.memoryMonitor = {
  measurements: [],

  // Record memory usage
  record(label = 'test') {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      // Limit array size to prevent memory leak (DEBUG-48)
      if (this.measurements.length >= MAX_MEMORY_MEASUREMENTS) {
        this.measurements.shift();
      }
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

/**
 * MEMORY FIX (DEBUG-48): Removed global beforeEach/afterEach wrapping
 *
 * The previous implementation wrapped ALL beforeEach/afterEach calls globally,
 * which created additional closures and memory overhead for every test.
 * This contributed to the heap exhaustion crash.
 *
 * Instead, performance monitoring is now opt-in via perfUtils functions.
 * Tests that need performance monitoring should use:
 *   - global.perfUtils.measureAsync(fn, label)
 *   - global.perfUtils.measureSync(fn, label)
 *
 * The automatic monitoring hooks have been removed to prevent memory issues.
 */

// Only log in development mode
if (process.env.NODE_ENV !== 'test' || process.env.JEST_VERBOSE) {
  console.log('🔍 Performance monitoring available (opt-in via perfUtils)');
}