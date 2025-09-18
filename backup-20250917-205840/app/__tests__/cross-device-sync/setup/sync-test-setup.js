/**
 * Cross-Device Sync Test Setup
 *
 * Comprehensive test environment configuration for cross-device sync testing
 * with performance monitoring, crisis safety validation, and security testing
 */

import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';

// Mock React Native modules for testing
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      interpolate: jest.fn(() => ({ inputRange: [0, 1], outputRange: ['0%', '100%'] })),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    })),
    loop: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    })),
  },
  ActivityIndicator: 'ActivityIndicator',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
}));

// Mock WebSocket for testing
global.WebSocket = jest.fn(() => ({
  readyState: 1, // OPEN
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock crypto for device key generation
global.crypto = {
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// Performance testing utilities
global.SyncTestUtils = {
  // Performance measurement utilities
  measurePerformance: async (fn, label = 'operation') => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    return {
      result,
      duration,
      label,
      timestamp: new Date().toISOString(),
    };
  },

  // Crisis response time validation
  validateCrisisResponseTime: (duration, requirement = 200) => {
    const passed = duration < requirement;
    if (!passed) {
      console.warn(`Crisis response time exceeded: ${duration}ms > ${requirement}ms`);
    }
    return {
      passed,
      duration,
      requirement,
      margin: requirement - duration,
    };
  },

  // Memory usage tracking
  trackMemoryUsage: () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
    };
  },

  // Network condition simulation
  simulateNetworkConditions: (condition) => {
    const conditions = {
      excellent: { latency: 50, bandwidth: 1000, reliability: 0.99 },
      good: { latency: 150, bandwidth: 500, reliability: 0.95 },
      poor: { latency: 500, bandwidth: 100, reliability: 0.85 },
      offline: { latency: Infinity, bandwidth: 0, reliability: 0 },
    };

    return conditions[condition] || conditions.good;
  },

  // Device simulation utilities
  createMockDevice: (overrides = {}) => ({
    deviceId: `test_device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    deviceName: 'Test Device',
    platform: 'ios',
    appVersion: '1.0.0',
    lastSeen: new Date().toISOString(),
    syncEnabled: true,
    encryptionKey: 'test_encryption_key',
    ...overrides,
  }),

  // Conflict simulation
  createMockConflict: (overrides = {}) => ({
    id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    entityType: 'assessment',
    entityId: 'test_entity',
    conflictType: 'version_mismatch',
    localData: {
      encryptedData: 'local_encrypted_data',
      metadata: {
        version: 1,
        lastModified: new Date().toISOString(),
        deviceId: 'local_device',
        cloudVersion: 0,
      },
      updatedAt: new Date().toISOString(),
    },
    cloudData: {
      encryptedData: 'cloud_encrypted_data',
      metadata: {
        version: 2,
        lastModified: new Date(Date.now() - 1000).toISOString(),
        deviceId: 'cloud_device',
        cloudVersion: 1,
      },
      updatedAt: new Date(Date.now() - 1000).toISOString(),
    },
    localVersion: 1,
    cloudVersion: 2,
    detectedAt: new Date().toISOString(),
    clinicalRelevant: false,
    ...overrides,
  }),

  // Crisis scenario simulation
  createCrisisScenario: (type = 'phq9_threshold') => {
    const scenarios = {
      phq9_threshold: {
        assessmentType: 'phq9',
        score: 22,
        threshold: 20,
        severity: 'severe',
        interventionRequired: true,
      },
      gad7_threshold: {
        assessmentType: 'gad7',
        score: 18,
        threshold: 15,
        severity: 'severe',
        interventionRequired: true,
      },
      crisis_button: {
        trigger: 'manual',
        userInitiated: true,
        emergencyContact: true,
        hotlineRequired: true,
      },
    };

    return {
      id: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date().toISOString(),
      ...scenarios[type],
    };
  },

  // Sync operation factory
  createSyncOperation: (overrides = {}) => ({
    id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'upload',
    entityType: 'assessment',
    priority: 'normal',
    encryptedPayload: JSON.stringify({ test: 'data' }),
    metadata: {
      entityId: 'test_entity',
      entityType: 'assessment',
      version: 1,
      lastModified: new Date().toISOString(),
      checksum: 'test_checksum',
      deviceId: 'test_device',
      cloudVersion: 0,
    },
    retryCount: 0,
    scheduledAt: new Date().toISOString(),
    ...overrides,
  }),

  // Async testing utilities
  waitForCondition: async (condition, timeout = 5000, interval = 100) => {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Animation testing utilities
  mockAnimatedValue: (initialValue = 0) => {
    let currentValue = initialValue;

    return {
      setValue: jest.fn((value) => {
        currentValue = value;
      }),
      getValue: () => currentValue,
      interpolate: jest.fn(() => ({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      })),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    };
  },

  // Store state factory
  createMockStoreState: (overrides = {}) => ({
    globalStatus: 'idle',
    lastGlobalSync: new Date().toISOString(),
    conflicts: [],
    storeStatuses: [
      {
        storeType: 'assessment',
        status: 'idle',
        lastSync: new Date().toISOString(),
        pendingOperations: 0,
        conflicts: [],
        errors: [],
        syncProgress: null,
      },
    ],
    ...overrides,
  }),

  // Security context factory
  createSecurityContext: (overrides = {}) => ({
    authenticated: true,
    biometricUsed: false,
    deviceTrusted: true,
    networkSecure: true,
    encryptionActive: true,
    ...overrides,
  }),
};

// Global test configuration
global.SyncTestConfig = {
  // Performance requirements
  performance: {
    crisisResponseTime: 200, // ms
    therapeuticSyncTime: 500, // ms
    generalSyncTime: 2000, // ms
    animationFrameRate: 58, // fps minimum
    memoryLimit: 50 * 1024 * 1024, // 50MB
  },

  // Security requirements
  security: {
    encryptionRequired: true,
    auditTrailRequired: true,
    deviceTrustRequired: true,
    zeroKnowledgeRequired: true,
  },

  // Clinical safety requirements
  clinicalSafety: {
    crisisDetectionAccuracy: 1.0, // 100%
    assessmentScoreAccuracy: 1.0, // 100%
    emergencyAccessGuaranteed: true,
    offlineCapabilityRequired: true,
  },

  // Test environment settings
  testEnvironment: {
    mockWebSocket: true,
    mockNetworkConditions: true,
    enablePerformanceMonitoring: true,
    enableSecurityValidation: true,
    enableAccessibilityTesting: true,
  },
};

// Custom Jest matchers for sync testing
expect.extend({
  toRespondWithinTime(received, timeLimit) {
    const pass = received < timeLimit;

    return {
      message: () =>
        pass
          ? `Expected response time ${received}ms not to be within ${timeLimit}ms`
          : `Expected response time ${received}ms to be within ${timeLimit}ms`,
      pass,
    };
  },

  toHaveValidSyncStatus(received) {
    const validStatuses = ['idle', 'syncing', 'success', 'error', 'conflict', 'paused'];
    const pass = validStatuses.includes(received);

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid sync status`
          : `Expected ${received} to be a valid sync status. Valid statuses: ${validStatuses.join(', ')}`,
      pass,
    };
  },

  toMaintainCrisisAccess(received) {
    const requiredFeatures = ['emergency_button', 'hotline_access', 'crisis_plan_access'];
    const availableFeatures = Object.keys(received);
    const hasAllFeatures = requiredFeatures.every(feature => availableFeatures.includes(feature));

    return {
      message: () =>
        hasAllFeatures
          ? `Expected crisis access features not to be maintained`
          : `Expected all crisis access features to be maintained. Missing: ${requiredFeatures.filter(f => !availableFeatures.includes(f)).join(', ')}`,
      pass: hasAllFeatures,
    };
  },

  toBeSecurelyEncrypted(received) {
    const hasEncryptedData = received.encryptedData && typeof received.encryptedData === 'string';
    const hasMetadata = received.metadata && typeof received.metadata === 'object';
    const hasValidChecksum = received.metadata?.checksum && received.metadata.checksum.length > 0;

    const pass = hasEncryptedData && hasMetadata && hasValidChecksum;

    return {
      message: () =>
        pass
          ? `Expected data not to be securely encrypted`
          : `Expected data to be securely encrypted with encryptedData, metadata, and checksum`,
      pass,
    };
  },
});

// Error boundary for test isolation
global.SyncTestErrorBoundary = class {
  constructor() {
    this.errors = [];
  }

  captureError(error, context = {}) {
    this.errors.push({
      error,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    });
  }

  getErrors() {
    return this.errors;
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  clearErrors() {
    this.errors = [];
  }
};

// Performance monitoring for tests
global.SyncPerformanceMonitor = class {
  constructor() {
    this.metrics = {
      responseTimes: [],
      memoryUsage: [],
      operationCounts: {},
    };
  }

  recordResponseTime(operation, duration) {
    this.metrics.responseTimes.push({
      operation,
      duration,
      timestamp: Date.now(),
    });
  }

  recordMemoryUsage() {
    const usage = global.SyncTestUtils.trackMemoryUsage();
    this.metrics.memoryUsage.push({
      ...usage,
      timestamp: Date.now(),
    });
  }

  incrementOperationCount(operation) {
    this.metrics.operationCounts[operation] = (this.metrics.operationCounts[operation] || 0) + 1;
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.calculateAverageResponseTime(),
      peakMemoryUsage: this.calculatePeakMemoryUsage(),
    };
  }

  calculateAverageResponseTime() {
    if (this.metrics.responseTimes.length === 0) return 0;

    const total = this.metrics.responseTimes.reduce((sum, metric) => sum + metric.duration, 0);
    return total / this.metrics.responseTimes.length;
  }

  calculatePeakMemoryUsage() {
    if (this.metrics.memoryUsage.length === 0) return 0;

    return Math.max(...this.metrics.memoryUsage.map(usage => usage.heapUsed));
  }
};

// Initialize global test instances
global.testErrorBoundary = new global.SyncTestErrorBoundary();
global.performanceMonitor = new global.SyncPerformanceMonitor();

// Test cleanup utilities
global.cleanupSyncTests = () => {
  global.testErrorBoundary.clearErrors();
  global.performanceMonitor = new global.SyncPerformanceMonitor();
  jest.clearAllMocks();
};

console.log('✅ Cross-Device Sync Test Setup Complete');