/**
 * Widget Test Infrastructure
 * Comprehensive testing utilities and mock infrastructure for widget integration testing
 * Supports clinical-grade validation and performance monitoring
 */

import { jest } from '@jest/globals';
import { Platform } from 'react-native';
import type {
  WidgetData,
  WidgetSessionStatus,
  WidgetTodayProgress,
  WidgetNativeBridge,
  PrivacyValidationResult,
  PrivacyViolation,
  WidgetPerformanceMetrics,
  CheckInType,
  WidgetUpdateTrigger,
  WidgetDeepLinkParams
} from '../../src/types/widget';

/**
 * Mock Native Bridge Implementation
 * Provides realistic native module simulation with performance tracking
 */
export class MockWidgetNativeBridge implements WidgetNativeBridge {
  private performanceMetrics: WidgetPerformanceMetrics[] = [];
  private isHealthy: boolean = true;
  private storedData: Map<string, string> = new Map();
  private activeWidgetIds: number[] = [1, 2, 3];

  ios = {
    updateWidgetData: jest.fn().mockImplementation(async (data: string) => {
      const startTime = performance.now();
      
      // Simulate iOS WidgetKit latency
      await this.simulateLatency(50, 150);
      
      // Validate data
      this.validateNativeData(data);
      
      // Store data
      this.storedData.set('ios_widget_data', data);
      
      const endTime = performance.now();
      this.trackPerformance('ios_updateWidgetData', endTime - startTime);
    }),

    reloadWidgets: jest.fn().mockImplementation(async () => {
      const startTime = performance.now();
      await this.simulateLatency(20, 80);
      const endTime = performance.now();
      this.trackPerformance('ios_reloadWidgets', endTime - startTime);
    }),

    setAppGroupData: jest.fn().mockImplementation(async (key: string, data: string) => {
      const startTime = performance.now();
      await this.simulateLatency(10, 30);
      this.storedData.set(`ios_appgroup_${key}`, data);
      const endTime = performance.now();
      this.trackPerformance('ios_setAppGroupData', endTime - startTime);
    }),

    getAppGroupData: jest.fn().mockImplementation(async (key: string) => {
      const startTime = performance.now();
      await this.simulateLatency(5, 20);
      const data = this.storedData.get(`ios_appgroup_${key}`) || '{}';
      const endTime = performance.now();
      this.trackPerformance('ios_getAppGroupData', endTime - startTime);
      return data;
    })
  };

  android = {
    updateWidgetData: jest.fn().mockImplementation(async (data: string) => {
      const startTime = performance.now();
      
      // Simulate Android App Widget latency
      await this.simulateLatency(30, 120);
      
      // Validate data
      this.validateNativeData(data);
      
      // Store data
      this.storedData.set('android_widget_data', data);
      
      const endTime = performance.now();
      this.trackPerformance('android_updateWidgetData', endTime - startTime);
    }),

    updateAllWidgets: jest.fn().mockImplementation(async () => {
      const startTime = performance.now();
      await this.simulateLatency(40, 100);
      const endTime = performance.now();
      this.trackPerformance('android_updateAllWidgets', endTime - startTime);
    }),

    updateWidgetById: jest.fn().mockImplementation(async (widgetId: number, data: string) => {
      const startTime = performance.now();
      await this.simulateLatency(25, 70);
      this.storedData.set(`android_widget_${widgetId}`, data);
      const endTime = performance.now();
      this.trackPerformance('android_updateWidgetById', endTime - startTime);
    }),

    getActiveWidgetIds: jest.fn().mockImplementation(async () => {
      const startTime = performance.now();
      await this.simulateLatency(10, 40);
      const endTime = performance.now();
      this.trackPerformance('android_getActiveWidgetIds', endTime - startTime);
      return [...this.activeWidgetIds];
    })
  };

  // Test utilities
  setHealthy(healthy: boolean): void {
    this.isHealthy = healthy;
  }

  getStoredData(key?: string): string | Map<string, string> {
    if (key) {
      return this.storedData.get(key) || '';
    }
    return new Map(this.storedData);
  }

  setActiveWidgetIds(ids: number[]): void {
    this.activeWidgetIds = [...ids];
  }

  getPerformanceMetrics(): WidgetPerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  reset(): void {
    this.storedData.clear();
    this.performanceMetrics = [];
    this.isHealthy = true;
    this.activeWidgetIds = [1, 2, 3];
    
    // Reset all mocks
    Object.values(this.ios).forEach(mock => (mock as jest.Mock).mockClear());
    Object.values(this.android).forEach(mock => (mock as jest.Mock).mockClear());
  }

  private async simulateLatency(min: number, max: number): Promise<void> {
    const latency = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, latency));
  }

  private validateNativeData(data: string): void {
    if (typeof data !== 'string') {
      throw new Error('Invalid data type - must be string');
    }

    try {
      const parsed = JSON.parse(data);
      
      // Security validation
      const dataString = JSON.stringify(parsed).toLowerCase();
      const prohibitedPatterns = [
        'phq9', 'gad7', 'assessment', 'suicidal', 'clinical',
        'patient', 'diagnosis', 'medication', 'therapy',
        '<script', 'javascript:', 'eval(', 'function('
      ];

      for (const pattern of prohibitedPatterns) {
        if (dataString.includes(pattern)) {
          throw new Error(`Security violation: prohibited pattern '${pattern}' detected`);
        }
      }

      // Size validation
      if (data.length > 50000) { // 50KB limit
        throw new Error('Data size exceeds maximum limit');
      }

    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format');
      }
      throw error;
    }
  }

  private trackPerformance(operation: string, latencyMs: number): void {
    this.performanceMetrics.push({
      updateLatencyMs: latencyMs,
      nativeCallLatencyMs: latencyMs,
      dataSerializationMs: 0,
      privacyValidationMs: 0,
      totalOperationMs: latencyMs
    });
  }
}

/**
 * Test Data Generators
 * Creates realistic test data for various widget scenarios
 */
export class WidgetTestDataGenerator {
  
  static createMockWidgetData(overrides?: Partial<WidgetData>): WidgetData {
    const baseData: WidgetData = {
      todayProgress: {
        morning: this.createMockSessionStatus('completed'),
        midday: this.createMockSessionStatus('not_started'),
        evening: this.createMockSessionStatus('not_started'),
        completionPercentage: 33
      },
      hasActiveCrisis: false,
      lastUpdateTime: new Date().toISOString(),
      appVersion: '1.7.0',
      encryptionHash: this.generateMockHash()
    };

    return { ...baseData, ...overrides };
  }

  static createMockSessionStatus(
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped',
    overrides?: Partial<WidgetSessionStatus>
  ): WidgetSessionStatus {
    const progressMap = {
      not_started: 0,
      in_progress: 45,
      completed: 100,
      skipped: 0
    };

    const timeMap = {
      not_started: 5,
      in_progress: 3,
      completed: 0,
      skipped: 0
    };

    const baseStatus: WidgetSessionStatus = {
      status,
      progressPercentage: progressMap[status],
      canResume: status === 'in_progress',
      estimatedTimeMinutes: timeMap[status]
    };

    return { ...baseStatus, ...overrides };
  }

  static createMockTodayProgress(overrides?: Partial<WidgetTodayProgress>): WidgetTodayProgress {
    const baseProgress: WidgetTodayProgress = {
      morning: this.createMockSessionStatus('completed'),
      midday: this.createMockSessionStatus('in_progress'),
      evening: this.createMockSessionStatus('not_started'),
      completionPercentage: 50
    };

    return { ...baseProgress, ...overrides };
  }

  static generateMockHash(seed?: string): string {
    const input = seed || `${Date.now()}_${Math.random()}`;
    let hash = 0;
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  static createTestScenarios(): Array<{
    name: string;
    data: WidgetData;
    expectedBehavior: string;
  }> {
    return [
      {
        name: 'Empty day - no check-ins',
        data: this.createMockWidgetData({
          todayProgress: {
            morning: this.createMockSessionStatus('not_started'),
            midday: this.createMockSessionStatus('not_started'),
            evening: this.createMockSessionStatus('not_started'),
            completionPercentage: 0
          }
        }),
        expectedBehavior: 'Show encouraging start message'
      },
      {
        name: 'Partial day - morning completed',
        data: this.createMockWidgetData({
          todayProgress: {
            morning: this.createMockSessionStatus('completed'),
            midday: this.createMockSessionStatus('not_started'),
            evening: this.createMockSessionStatus('not_started'),
            completionPercentage: 33
          }
        }),
        expectedBehavior: 'Show progress and next session'
      },
      {
        name: 'Session in progress',
        data: this.createMockWidgetData({
          todayProgress: {
            morning: this.createMockSessionStatus('completed'),
            midday: this.createMockSessionStatus('in_progress', { progressPercentage: 60 }),
            evening: this.createMockSessionStatus('not_started'),
            completionPercentage: 53
          }
        }),
        expectedBehavior: 'Show resume option'
      },
      {
        name: 'Full day completed',
        data: this.createMockWidgetData({
          todayProgress: {
            morning: this.createMockSessionStatus('completed'),
            midday: this.createMockSessionStatus('completed'),
            evening: this.createMockSessionStatus('completed'),
            completionPercentage: 100
          }
        }),
        expectedBehavior: 'Show completion celebration'
      },
      {
        name: 'Crisis mode active',
        data: this.createMockWidgetData({
          hasActiveCrisis: true,
          todayProgress: {
            morning: this.createMockSessionStatus('not_started'),
            midday: this.createMockSessionStatus('not_started'),
            evening: this.createMockSessionStatus('not_started'),
            completionPercentage: 0
          }
        }),
        expectedBehavior: 'Prioritize crisis access'
      },
      {
        name: 'Mixed completion with skip',
        data: this.createMockWidgetData({
          todayProgress: {
            morning: this.createMockSessionStatus('completed'),
            midday: this.createMockSessionStatus('skipped'),
            evening: this.createMockSessionStatus('not_started'),
            completionPercentage: 33
          }
        }),
        expectedBehavior: 'Show understanding message for skip'
      }
    ];
  }
}

/**
 * Deep Link Test Utilities
 * Generates and validates deep link scenarios
 */
export class WidgetDeepLinkTestUtils {
  
  static generateValidDeepLinks(): Array<{
    url: string;
    expectedParams: WidgetDeepLinkParams;
    description: string;
  }> {
    return [
      {
        url: 'fullmind://checkin/morning',
        expectedParams: {
          url: 'fullmind://checkin/morning',
          timestamp: expect.any(String),
          source: 'ios_widget'
        },
        description: 'Morning check-in without resume'
      },
      {
        url: 'fullmind://checkin/midday?resume=true',
        expectedParams: {
          url: 'fullmind://checkin/midday?resume=true',
          timestamp: expect.any(String),
          source: 'ios_widget'
        },
        description: 'Midday check-in with resume'
      },
      {
        url: 'fullmind://checkin/evening?resume=false&source=widget',
        expectedParams: {
          url: 'fullmind://checkin/evening?resume=false&source=widget',
          timestamp: expect.any(String),
          source: 'ios_widget'
        },
        description: 'Evening check-in with explicit parameters'
      },
      {
        url: 'fullmind://crisis',
        expectedParams: {
          url: 'fullmind://crisis',
          timestamp: expect.any(String),
          source: 'ios_widget'
        },
        description: 'Crisis intervention access'
      }
    ];
  }

  static generateInvalidDeepLinks(): Array<{
    url: string;
    expectedError: string;
    description: string;
  }> {
    return [
      {
        url: 'http://evil.com/fullmind',
        expectedError: 'Invalid deep link protocol',
        description: 'Wrong protocol scheme'
      },
      {
        url: 'fullmind://../../private-data',
        expectedError: 'Invalid deep link URL',
        description: 'Path traversal attempt'
      },
      {
        url: 'javascript:alert("xss")',
        expectedError: 'Invalid deep link protocol',
        description: 'JavaScript injection attempt'
      },
      {
        url: 'fullmind://checkin/invalid_type',
        expectedError: 'Invalid check-in type',
        description: 'Invalid check-in type'
      },
      {
        url: 'data:text/html,<script>alert("xss")</script>',
        expectedError: 'Invalid deep link protocol',
        description: 'Data URI XSS attempt'
      },
      {
        url: '',
        expectedError: 'Invalid deep link URL format',
        description: 'Empty URL'
      }
    ];
  }

  static simulateDeepLink(type: CheckInType, resume: boolean = false): string {
    const baseUrl = `fullmind://checkin/${type}`;
    const params = new URLSearchParams();
    
    if (resume) {
      params.set('resume', 'true');
    }
    
    params.set('source', 'widget');
    params.set('timestamp', new Date().toISOString());
    
    return `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
  }

  static simulateCrisisDeepLink(): string {
    const params = new URLSearchParams({
      trigger: 'widget_emergency_access',
      source: 'widget',
      timestamp: new Date().toISOString()
    });
    
    return `fullmind://crisis?${params.toString()}`;
  }
}

/**
 * Privacy Test Utilities
 * Validates privacy compliance and detects violations
 */
export class WidgetPrivacyTestUtils {
  
  static validatePrivacy(data: unknown): PrivacyValidationResult {
    const violations: PrivacyViolation[] = [];
    
    if (!data || typeof data !== 'object') {
      violations.push({
        field: 'root',
        violationType: 'unauthorized_field',
        details: 'Data must be a valid object'
      });
      
      return {
        isValid: false,
        violations,
        filteredData: null
      };
    }

    const dataString = JSON.stringify(data).toLowerCase();
    
    // Clinical data detection
    const clinicalPatterns = [
      { pattern: 'phq9', type: 'assessment_data_detected' as const },
      { pattern: 'gad7', type: 'assessment_data_detected' as const },
      { pattern: 'assessment', type: 'assessment_data_detected' as const },
      { pattern: 'score', type: 'clinical_data_detected' as const },
      { pattern: 'suicidal', type: 'clinical_data_detected' as const },
      { pattern: 'depression', type: 'clinical_data_detected' as const },
      { pattern: 'anxiety', type: 'clinical_data_detected' as const },
      { pattern: 'medication', type: 'clinical_data_detected' as const },
      { pattern: 'diagnosis', type: 'clinical_data_detected' as const },
      { pattern: 'therapy', type: 'clinical_data_detected' as const },
      { pattern: 'treatment', type: 'clinical_data_detected' as const },
      { pattern: 'patient', type: 'clinical_data_detected' as const },
      { pattern: 'clinical', type: 'clinical_data_detected' as const }
    ];

    for (const { pattern, type } of clinicalPatterns) {
      if (dataString.includes(pattern)) {
        violations.push({
          field: 'content',
          violationType: type,
          details: `Clinical data pattern detected: ${pattern}`
        });
      }
    }

    // Personal information patterns
    const personalPatterns = [
      { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'personal_information_detected' as const, name: 'email' },
      { pattern: /\d{3}-\d{2}-\d{4}/g, type: 'personal_information_detected' as const, name: 'ssn' },
      { pattern: /\d{3}-\d{3}-\d{4}|\(\d{3}\)\s*\d{3}-\d{4}/g, type: 'personal_information_detected' as const, name: 'phone' },
      { pattern: /emergency.contact/gi, type: 'personal_information_detected' as const, name: 'emergency_contact' },
      { pattern: /personal.note/gi, type: 'personal_information_detected' as const, name: 'personal_note' }
    ];

    for (const { pattern, type, name } of personalPatterns) {
      if (pattern.test(dataString)) {
        violations.push({
          field: 'content',
          violationType: type,
          details: `Personal information detected: ${name}`
        });
      }
    }

    // Security patterns
    const securityPatterns = [
      /<script/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /function\s*\(/gi
    ];

    for (const pattern of securityPatterns) {
      if (pattern.test(dataString)) {
        violations.push({
          field: 'content',
          violationType: 'unauthorized_field',
          details: `Security threat detected: ${pattern.toString()}`
        });
      }
    }

    // Size validation
    const dataSize = dataString.length;
    const maxSize = 50000; // 50KB limit
    if (dataSize > maxSize) {
      violations.push({
        field: 'size',
        violationType: 'size_limit_exceeded',
        details: `Data size ${dataSize} bytes exceeds limit of ${maxSize} bytes`
      });
    }

    // Return result
    if (violations.length > 0) {
      return {
        isValid: false,
        violations,
        filteredData: null
      };
    }

    return {
      isValid: true,
      violations: [],
      filteredData: JSON.parse(JSON.stringify(data)) as any
    };
  }

  static generatePrivacyViolationCases(): Array<{
    name: string;
    data: unknown;
    expectedViolationType: string;
  }> {
    return [
      {
        name: 'PHQ-9 assessment data',
        data: { phq9Score: 15, severity: 'moderate' },
        expectedViolationType: 'assessment_data_detected'
      },
      {
        name: 'GAD-7 assessment data',
        data: { gad7Score: 12, anxietyLevel: 'high' },
        expectedViolationType: 'assessment_data_detected'
      },
      {
        name: 'Clinical notes',
        data: { clinicalNotes: 'Patient shows signs of severe depression' },
        expectedViolationType: 'clinical_data_detected'
      },
      {
        name: 'Personal information',
        data: { email: 'patient@example.com', phone: '555-123-4567' },
        expectedViolationType: 'personal_information_detected'
      },
      {
        name: 'Emergency contact',
        data: { emergencyContact: { name: 'John Doe', phone: '555-987-6543' } },
        expectedViolationType: 'personal_information_detected'
      },
      {
        name: 'XSS attempt',
        data: { message: '<script>alert("xss")</script>' },
        expectedViolationType: 'unauthorized_field'
      },
      {
        name: 'Oversized data',
        data: { largeField: 'x'.repeat(100000) },
        expectedViolationType: 'size_limit_exceeded'
      },
      {
        name: 'Suicidal ideation data',
        data: { suicidalThoughts: true, riskLevel: 'high' },
        expectedViolationType: 'clinical_data_detected'
      }
    ];
  }
}

/**
 * Performance Test Utilities
 * Tracks and validates performance metrics
 */
export class WidgetPerformanceTestUtils {
  private static operations: Map<string, number> = new Map();
  private static metrics: WidgetPerformanceMetrics[] = [];

  static startOperation(name: string): string {
    const operationId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.operations.set(operationId, performance.now());
    return operationId;
  }

  static endOperation(operationId: string): WidgetPerformanceMetrics {
    const startTime = this.operations.get(operationId);
    const endTime = performance.now();
    
    if (!startTime) {
      throw new Error(`Operation ${operationId} not found`);
    }
    
    const totalLatency = endTime - startTime;
    
    const metrics: WidgetPerformanceMetrics = {
      updateLatencyMs: totalLatency,
      nativeCallLatencyMs: 0,
      dataSerializationMs: 0,
      privacyValidationMs: 0,
      totalOperationMs: totalLatency
    };
    
    this.metrics.push(metrics);
    this.operations.delete(operationId);
    
    return metrics;
  }

  static getAverageMetrics(): WidgetPerformanceMetrics {
    if (this.metrics.length === 0) {
      return {
        updateLatencyMs: 0,
        nativeCallLatencyMs: 0,
        dataSerializationMs: 0,
        privacyValidationMs: 0,
        totalOperationMs: 0
      };
    }

    const sum = this.metrics.reduce((acc, m) => ({
      updateLatencyMs: acc.updateLatencyMs + m.updateLatencyMs,
      nativeCallLatencyMs: acc.nativeCallLatencyMs + m.nativeCallLatencyMs,
      dataSerializationMs: acc.dataSerializationMs + m.dataSerializationMs,
      privacyValidationMs: acc.privacyValidationMs + m.privacyValidationMs,
      totalOperationMs: acc.totalOperationMs + m.totalOperationMs
    }));

    const count = this.metrics.length;

    return {
      updateLatencyMs: sum.updateLatencyMs / count,
      nativeCallLatencyMs: sum.nativeCallLatencyMs / count,
      dataSerializationMs: sum.dataSerializationMs / count,
      privacyValidationMs: sum.privacyValidationMs / count,
      totalOperationMs: sum.totalOperationMs / count
    };
  }

  static reset(): void {
    this.operations.clear();
    this.metrics = [];
  }

  static validatePerformanceThresholds(metrics: WidgetPerformanceMetrics, thresholds: {
    updateLatencyMs?: number;
    nativeCallLatencyMs?: number;
    totalOperationMs?: number;
  }): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (thresholds.updateLatencyMs && metrics.updateLatencyMs > thresholds.updateLatencyMs) {
      violations.push(`Update latency ${metrics.updateLatencyMs}ms exceeds threshold ${thresholds.updateLatencyMs}ms`);
    }

    if (thresholds.nativeCallLatencyMs && metrics.nativeCallLatencyMs > thresholds.nativeCallLatencyMs) {
      violations.push(`Native call latency ${metrics.nativeCallLatencyMs}ms exceeds threshold ${thresholds.nativeCallLatencyMs}ms`);
    }

    if (thresholds.totalOperationMs && metrics.totalOperationMs > thresholds.totalOperationMs) {
      violations.push(`Total operation time ${metrics.totalOperationMs}ms exceeds threshold ${thresholds.totalOperationMs}ms`);
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }
}

/**
 * Accessibility Test Utilities
 * Validates widget accessibility for mental health users
 */
export class WidgetAccessibilityTestUtils {
  
  static generateAccessibilityScenarios(): Array<{
    name: string;
    userProfile: string;
    requirements: string[];
    testData: WidgetData;
  }> {
    return [
      {
        name: 'Screen reader user with depression',
        userProfile: 'User with visual impairment using VoiceOver/TalkBack',
        requirements: [
          'Clear status announcements',
          'Logical reading order',
          'Meaningful button labels',
          'Time estimates provided'
        ],
        testData: WidgetTestDataGenerator.createMockWidgetData({
          todayProgress: {
            morning: WidgetTestDataGenerator.createMockSessionStatus('completed'),
            midday: WidgetTestDataGenerator.createMockSessionStatus('in_progress', { 
              progressPercentage: 30,
              estimatedTimeMinutes: 4
            }),
            evening: WidgetTestDataGenerator.createMockSessionStatus('not_started', {
              estimatedTimeMinutes: 7
            }),
            completionPercentage: 43
          }
        })
      },
      {
        name: 'Motor impairment user',
        userProfile: 'User with limited fine motor control',
        requirements: [
          'Large touch targets (44px minimum)',
          'Reduced interaction complexity',
          'Clear visual feedback',
          'No time pressure'
        ],
        testData: WidgetTestDataGenerator.createMockWidgetData({
          todayProgress: {
            morning: WidgetTestDataGenerator.createMockSessionStatus('not_started'),
            midday: WidgetTestDataGenerator.createMockSessionStatus('not_started'),
            evening: WidgetTestDataGenerator.createMockSessionStatus('not_started'),
            completionPercentage: 0
          }
        })
      },
      {
        name: 'Cognitive load sensitivity',
        userProfile: 'User with anxiety and attention difficulties',
        requirements: [
          'Minimal cognitive load',
          'Clear, simple messaging',
          'Consistent layout',
          'Stress-free interactions'
        ],
        testData: WidgetTestDataGenerator.createMockWidgetData({
          todayProgress: {
            morning: WidgetTestDataGenerator.createMockSessionStatus('skipped'),
            midday: WidgetTestDataGenerator.createMockSessionStatus('not_started'),
            evening: WidgetTestDataGenerator.createMockSessionStatus('not_started'),
            completionPercentage: 0
          }
        })
      },
      {
        name: 'Crisis accessibility',
        userProfile: 'User in mental health crisis',
        requirements: [
          'Immediate crisis button access',
          'High contrast crisis indicators',
          'Simple crisis navigation',
          'Clear emergency messaging'
        ],
        testData: WidgetTestDataGenerator.createMockWidgetData({
          hasActiveCrisis: true,
          todayProgress: {
            morning: WidgetTestDataGenerator.createMockSessionStatus('not_started'),
            midday: WidgetTestDataGenerator.createMockSessionStatus('not_started'),
            evening: WidgetTestDataGenerator.createMockSessionStatus('not_started'),
            completionPercentage: 0
          }
        })
      }
    ];
  }

  static validateAccessibilityCompliance(widgetData: WidgetData): {
    passed: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Time estimate validation
    const sessions = [widgetData.todayProgress.morning, widgetData.todayProgress.midday, widgetData.todayProgress.evening];
    
    for (const session of sessions) {
      if (session.status === 'not_started' && session.estimatedTimeMinutes === 0) {
        violations.push('Missing time estimates for unstarted sessions');
      }
      
      if (session.status === 'in_progress' && session.estimatedTimeMinutes === 0) {
        violations.push('Missing remaining time estimates for in-progress sessions');
      }
    }

    // Crisis accessibility
    if (widgetData.hasActiveCrisis) {
      recommendations.push('Ensure crisis button is prominently displayed with high contrast');
      recommendations.push('Provide immediate access to emergency contacts');
    }

    // Progress clarity
    if (widgetData.todayProgress.completionPercentage === 0) {
      recommendations.push('Provide encouraging messaging for users starting their day');
    } else if (widgetData.todayProgress.completionPercentage === 100) {
      recommendations.push('Celebrate completion with positive reinforcement');
    }

    return {
      passed: violations.length === 0,
      violations,
      recommendations
    };
  }
}

/**
 * Complete Test Infrastructure
 * Combines all testing utilities into a comprehensive suite
 */
export class WidgetTestInfrastructure {
  static mockBridge = new MockWidgetNativeBridge();
  static dataGenerator = WidgetTestDataGenerator;
  static deepLinkUtils = WidgetDeepLinkTestUtils;
  static privacyUtils = WidgetPrivacyTestUtils;
  static performanceUtils = WidgetPerformanceTestUtils;
  static accessibilityUtils = WidgetAccessibilityTestUtils;

  static async initializeTestEnvironment(): Promise<void> {
    // Reset all utilities
    this.mockBridge.reset();
    this.performanceUtils.reset();

    // Setup global mocks
    if (!global.performance) {
      global.performance = {
        now: () => Date.now(),
        mark: jest.fn(),
        measure: jest.fn()
      } as any;
    }

    // Mock Platform for consistent testing
    Platform.OS = 'ios';

    console.log('✅ Widget test infrastructure initialized');
  }

  static cleanup(): void {
    this.mockBridge.reset();
    this.performanceUtils.reset();
    console.log('🧹 Widget test infrastructure cleaned up');
  }

  static async runComprehensiveValidation(widgetData: WidgetData): Promise<{
    privacy: { passed: boolean; violations: string[] };
    accessibility: { passed: boolean; violations: string[] };
    performance: { passed: boolean; violations: string[] };
    overall: boolean;
  }> {
    // Privacy validation
    const privacyResult = this.privacyUtils.validatePrivacy(widgetData);
    
    // Accessibility validation
    const accessibilityResult = this.accessibilityUtils.validateAccessibilityCompliance(widgetData);
    
    // Performance validation (mock)
    const performanceResult = {
      passed: true,
      violations: [] as string[]
    };

    const overall = privacyResult.isValid && accessibilityResult.passed && performanceResult.passed;

    return {
      privacy: {
        passed: privacyResult.isValid,
        violations: privacyResult.violations.map(v => v.details)
      },
      accessibility: {
        passed: accessibilityResult.passed,
        violations: accessibilityResult.violations
      },
      performance: performanceResult,
      overall
    };
  }
}

// Export everything for easy consumption
export default WidgetTestInfrastructure;

export {
  MockWidgetNativeBridge,
  WidgetTestDataGenerator,
  WidgetDeepLinkTestUtils,
  WidgetPrivacyTestUtils,
  WidgetPerformanceTestUtils,
  WidgetAccessibilityTestUtils
};