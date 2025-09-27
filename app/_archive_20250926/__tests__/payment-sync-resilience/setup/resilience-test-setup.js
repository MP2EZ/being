/**
 * Payment Sync Resilience Test Setup
 *
 * Global setup for resilience testing including:
 * - Performance monitoring
 * - Memory tracking
 * - Security validation utilities
 * - Crisis response time validation
 */

// Global test utilities for resilience testing
global.ResilienceTestUtils = {
  // Performance monitoring
  performanceMonitor: {
    start: () => {
      global._testStartTime = performance.now();
      global._memoryStart = process.memoryUsage();
    },

    end: () => {
      const endTime = performance.now();
      const memoryEnd = process.memoryUsage();

      return {
        duration: endTime - (global._testStartTime || endTime),
        memoryDelta: {
          heapUsed: memoryEnd.heapUsed - (global._memoryStart?.heapUsed || 0),
          heapTotal: memoryEnd.heapTotal - (global._memoryStart?.heapTotal || 0),
          external: memoryEnd.external - (global._memoryStart?.external || 0)
        }
      };
    }
  },

  // Security validation
  securityValidator: {
    validateNoPHIExposure: (data) => {
      const phiPatterns = [
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit cards
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /phq.*score.*\d+/i, // Assessment scores
        /gad.*score.*\d+/i,
        /suicidal/i,
        /depression/i,
        /anxiety/i,
        /@[\w.-]+\.[\w.-]+/, // Email
        /\b\d{10}\b/ // Phone
      ];

      const dataString = JSON.stringify(data).toLowerCase();
      return !phiPatterns.some(pattern => pattern.test(dataString));
    },

    validateEncryption: (mockEncryption) => {
      return mockEncryption.encryptData.mock?.calls?.length > 0;
    },

    validateTokenization: (data) => {
      const dataString = JSON.stringify(data);
      const rawCardPatterns = [
        /\b4\d{15}\b/, // Visa
        /\b5[1-5]\d{14}\b/, // MasterCard
        /\b3[47]\d{13}\b/, // Amex
        /\bcvv?\s*:?\s*\d{3,4}\b/i // CVV
      ];

      return !rawCardPatterns.some(pattern => pattern.test(dataString));
    }
  },

  // Crisis response validation
  crisisValidator: {
    validateResponseTime: (startTime, endTime, threshold = 200) => {
      const duration = endTime - startTime;
      return {
        duration,
        withinThreshold: duration < threshold,
        threshold
      };
    },

    validateCrisisResources: (result) => {
      return result?.crisisResources?.hotlineNumber === '988' &&
             result?.crisisResources?.localCrisisPlan === true &&
             result?.crisisResources?.offlineSupport === true;
    },

    validateEmergencyAccess: (result, responseTime) => {
      return result.success &&
             responseTime < 3000 &&
             result.result?.emergencyContactAccess === true;
    }
  },

  // Therapeutic continuity validation
  therapeuticValidator: {
    validateAssessmentAvailability: (result) => {
      return result.success && result.result?.assessmentAccess !== false;
    },

    validateProgressPreservation: (result) => {
      return result.result?.therapeuticContinuity === true ||
             result.result?.localStorageUsed === true;
    },

    validateMentalHealthPriority: (result) => {
      return result.crisisOverrideUsed ||
             result.result?.mentalHealthPriority === true ||
             result.fallbackTriggered;
    }
  },

  // Failure simulation utilities
  failureSimulator: {
    networkOutage: (duration = 100) => {
      return new Promise(resolve => setTimeout(resolve, duration));
    },

    createNetworkError: () => {
      return new Error('network_error: Connection lost');
    },

    createTimeoutError: () => {
      return new Error('timeout_error: Operation exceeded time limit');
    },

    createAuthError: () => {
      return new Error('authentication_error: Token expired');
    },

    createPaymentError: () => {
      return new Error('payment_service_unavailable: Payment gateway down');
    },

    createDataCorruptionError: () => {
      return new Error('data_corruption: Checksum validation failed');
    },

    simulatePartialFailure: (operations, failureRate = 0.3) => {
      return operations.map(op => ({
        operation: op,
        shouldFail: Math.random() < failureRate
      }));
    }
  },

  // Memory monitoring
  memoryMonitor: class {
    constructor() {
      this.measurements = [];
      this.interval = null;
    }

    start() {
      this.measurements = [];
      this.interval = setInterval(() => {
        if (global.gc) global.gc();
        const usage = process.memoryUsage();
        this.measurements.push(usage.heapUsed / 1024 / 1024); // MB
      }, 100);
    }

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }

      const peak = Math.max(...this.measurements);
      const average = this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length;

      return {
        peak,
        average,
        measurements: [...this.measurements]
      };
    }
  },

  // Test data generators
  dataGenerator: {
    createPaymentSyncRequest: (overrides = {}) => {
      return {
        operationId: 'test-sync-001',
        priority: 2, // SyncPriorityLevel.HIGH_CLINICAL
        subscriptionContext: {
          tier: 'premium',
          status: 'active',
          entitlements: ['test_sync']
        },
        operation: {
          id: 'test-op-001',
          type: 'create',
          entityType: 'test_data',
          entityId: 'test-001',
          priority: 'high',
          data: { test: true },
          metadata: {
            entityId: 'test-001',
            entityType: 'test_data',
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: 'test-checksum',
            deviceId: 'device-001',
            userId: 'user-001'
          },
          conflictResolution: 'merge',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          clinicalSafety: true
        },
        crisisMode: false,
        requestId: 'req-test-001',
        ...overrides
      };
    },

    createCrisisRequest: (overrides = {}) => {
      return {
        emergencyId: 'crisis-test-001',
        userId: 'user-001',
        deviceId: 'device-001',
        timestamp: new Date().toISOString(),
        criticalData: {
          phq9Score: 22,
          suicidalIdeation: true,
          emergencyContacts: ['988'],
          ...overrides.criticalData
        },
        ...overrides
      };
    }
  }
};

// Global test configuration
global.RESILIENCE_TEST_CONFIG = {
  CRISIS_RESPONSE_THRESHOLD_MS: 200,
  EMERGENCY_ACCESS_THRESHOLD_MS: 3000,
  MEMORY_LIMIT_MB: 100,
  CONCURRENT_OPERATIONS_LIMIT: 50,
  DEFAULT_TIMEOUT_MS: 30000
};

// Enhanced console methods for test logging
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

// Track console calls for security validation
global.testLogs = [];

console.log = (...args) => {
  global.testLogs.push({ level: 'log', args, timestamp: Date.now() });
  if (process.env.NODE_ENV !== 'test' || process.env.VERBOSE_TESTS) {
    originalConsole.log(...args);
  }
};

console.warn = (...args) => {
  global.testLogs.push({ level: 'warn', args, timestamp: Date.now() });
  if (process.env.NODE_ENV !== 'test' || process.env.VERBOSE_TESTS) {
    originalConsole.warn(...args);
  }
};

console.error = (...args) => {
  global.testLogs.push({ level: 'error', args, timestamp: Date.now() });
  if (process.env.NODE_ENV !== 'test' || process.env.VERBOSE_TESTS) {
    originalConsole.error(...args);
  }
};

// Global setup for resilience tests
beforeEach(() => {
  // Reset test logs
  global.testLogs = [];

  // Reset performance monitoring
  global._testStartTime = undefined;
  global._memoryStart = undefined;

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

afterEach(() => {
  // Cleanup after each test
  global.testLogs = [];
});

// Global cleanup
afterAll(() => {
  // Restore original console methods
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});