/**
 * Widget Testing Utilities
 * Comprehensive testing support for widget bridge functionality
 * Provides mocks, validators, and test helpers for clinical-grade testing
 */

import {
  WidgetData,
  WidgetSessionStatus,
  WidgetCrisisButton,
  WidgetNativeBridge,
  PrivacyValidationResult,
  PrivacyViolation,
  WidgetTestingUtils,
  WidgetBridgeError,
  CheckInType,
  WidgetSessionStatusType
} from '../types/widget';

/**
 * Widget Testing Utilities Implementation
 */
class WidgetTestingUtilsImpl implements WidgetTestingUtils {
  
  /**
   * Create mock widget data for testing
   */
  createMockWidgetData = (overrides: Partial<WidgetData> = {}): WidgetData => {
    const defaultData: WidgetData = {
      todayProgress: {
        morning: this.createMockSessionStatus('completed'),
        midday: this.createMockSessionStatus('in_progress', 60),
        evening: this.createMockSessionStatus('not_started'),
        completionPercentage: 50
      },
      hasActiveCrisis: false,
      crisisButton: {
        alwaysVisible: true,
        prominence: 'standard',
        text: 'Crisis Support',
        style: 'standard'
      },
      lastUpdateTime: new Date().toISOString(),
      appVersion: '1.0.0',
      encryptionHash: 'mock_hash_12345'
    };

    return {
      ...defaultData,
      ...overrides,
      todayProgress: {
        ...defaultData.todayProgress,
        ...overrides.todayProgress
      },
      crisisButton: {
        ...defaultData.crisisButton,
        ...overrides.crisisButton
      }
    };
  };

  /**
   * Create mock crisis button
   */
  createMockCrisisButton = (
    hasActiveCrisis: boolean = false,
    responseTimeMs?: number
  ): WidgetCrisisButton => {
    return {
      alwaysVisible: true,
      prominence: hasActiveCrisis ? 'enhanced' : 'standard',
      text: hasActiveCrisis ? 'CRISIS SUPPORT NEEDED' : 'Crisis Support',
      style: hasActiveCrisis ? 'urgent' : 'standard',
      ...(responseTimeMs !== undefined && { responseTimeMs })
    };
  };

  /**
   * Create mock session status
   */
  createMockSessionStatus = (
    status: WidgetSessionStatusType = 'not_started',
    progressPercentage: number = 0
  ): WidgetSessionStatus => {
    return {
      status,
      progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
      canResume: status === 'in_progress',
      estimatedTimeMinutes: status === 'in_progress' 
        ? Math.ceil((100 - progressPercentage) / 20) // Rough estimate
        : status === 'not_started' ? 5 : 0
    };
  };

  /**
   * Create mock native bridge for testing
   */
  createMockNativeBridge = (): WidgetNativeBridge => {
    const mockLog: string[] = [];

    return {
      ios: {
        updateWidgetData: jest.fn().mockImplementation(async (data: string) => {
          mockLog.push(`iOS: updateWidgetData called with ${data.length} bytes`);
          return Promise.resolve();
        }),
        reloadWidgets: jest.fn().mockImplementation(async () => {
          mockLog.push('iOS: reloadWidgets called');
          return Promise.resolve();
        }),
        setAppGroupData: jest.fn().mockImplementation(async (key: string, data: string) => {
          mockLog.push(`iOS: setAppGroupData called with key=${key}, data=${data.length} bytes`);
          return Promise.resolve();
        }),
        getAppGroupData: jest.fn().mockImplementation(async (key: string) => {
          mockLog.push(`iOS: getAppGroupData called with key=${key}`);
          return Promise.resolve(key === 'fullmind_widget_data' ? JSON.stringify(this.createMockWidgetData()) : null);
        })
      },
      android: {
        updateWidgetData: jest.fn().mockImplementation(async (data: string) => {
          mockLog.push(`Android: updateWidgetData called with ${data.length} bytes`);
          return Promise.resolve();
        }),
        updateAllWidgets: jest.fn().mockImplementation(async () => {
          mockLog.push('Android: updateAllWidgets called');
          return Promise.resolve();
        }),
        updateWidgetById: jest.fn().mockImplementation(async (widgetId: number, data: string) => {
          mockLog.push(`Android: updateWidgetById called with id=${widgetId}, data=${data.length} bytes`);
          return Promise.resolve();
        }),
        getActiveWidgetIds: jest.fn().mockImplementation(async () => {
          mockLog.push('Android: getActiveWidgetIds called');
          return Promise.resolve([1, 2, 3]);
        })
      }
    };
  };

  /**
   * Simulate deep link URLs for testing
   */
  simulateDeepLink = (type: CheckInType, resume: boolean = false): string => {
    const baseUrl = 'fullmind://checkin';
    const params = new URLSearchParams({
      resume: resume.toString(),
      timestamp: new Date().toISOString(),
      source: 'test_widget'
    });
    
    return `${baseUrl}/${type}?${params.toString()}`;
  };

  /**
   * Simulate crisis deep link
   */
  simulateCrisisDeepLink = (): string => {
    const params = new URLSearchParams({
      trigger: 'widget_emergency_access',
      timestamp: new Date().toISOString(),
      source: 'test_widget'
    });
    
    return `fullmind://crisis?${params.toString()}`;
  };

  /**
   * Validate privacy compliance of data
   */
  validatePrivacy = (data: unknown): PrivacyValidationResult => {
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
    
    // Check for clinical data patterns
    const clinicalPatterns = [
      'phq', 'gad', 'assessment', 'score', 'suicidal', 'depression',
      'anxiety', 'medication', 'diagnosis', 'therapy', 'treatment'
    ];

    for (const pattern of clinicalPatterns) {
      if (dataString.includes(pattern)) {
        violations.push({
          field: 'content',
          violationType: 'clinical_data_detected',
          details: `Clinical data pattern detected: ${pattern}`
        });
      }
    }

    // Check for personal information
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phonePattern = /\d{3}-\d{3}-\d{4}|\(\d{3}\)\s*\d{3}-\d{4}/;
    
    if (emailPattern.test(dataString)) {
      violations.push({
        field: 'content',
        violationType: 'personal_information_detected',
        details: 'Email address pattern detected'
      });
    }
    
    if (phonePattern.test(dataString)) {
      violations.push({
        field: 'content',
        violationType: 'personal_information_detected',
        details: 'Phone number pattern detected'
      });
    }

    // Check data size
    const dataSize = dataString.length;
    if (dataSize > 50000) {
      violations.push({
        field: 'size',
        violationType: 'size_limit_exceeded',
        details: `Data size ${dataSize} exceeds 50KB limit`
      });
    }

    return {
      isValid: violations.length === 0,
      violations,
      filteredData: violations.length === 0 ? data as WidgetData : null
    };
  };
}

// Export singleton instance
export const widgetTestUtils = new WidgetTestingUtilsImpl();

/**
 * Test Assertion Helpers
 */
export class WidgetTestAssertions {
  
  /**
   * Assert widget data is valid
   */
  static assertValidWidgetData(data: unknown): asserts data is WidgetData {
    if (!data || typeof data !== 'object') {
      throw new Error('Widget data must be an object');
    }

    const d = data as any;
    
    if (typeof d.lastUpdateTime !== 'string') {
      throw new Error('lastUpdateTime must be a string');
    }
    
    if (typeof d.appVersion !== 'string') {
      throw new Error('appVersion must be a string');
    }
    
    if (typeof d.encryptionHash !== 'string') {
      throw new Error('encryptionHash must be a string');
    }
    
    if (typeof d.hasActiveCrisis !== 'boolean') {
      throw new Error('hasActiveCrisis must be a boolean');
    }

    this.assertValidCrisisButton(d.crisisButton);
    
    this.assertValidTodayProgress(d.todayProgress);
  }

  /**
   * Assert crisis button is valid
   */
  static assertValidCrisisButton(button: unknown): void {
    if (!button || typeof button !== 'object') {
      throw new Error('crisisButton must be an object');
    }

    const b = button as any;
    
    if (b.alwaysVisible !== true) {
      throw new Error('crisisButton.alwaysVisible must be true for safety');
    }
    
    const validProminence = ['standard', 'enhanced'];
    if (!validProminence.includes(b.prominence)) {
      throw new Error(`crisisButton.prominence must be one of: ${validProminence.join(', ')}`);
    }
    
    const validStyle = ['standard', 'urgent'];
    if (!validStyle.includes(b.style)) {
      throw new Error(`crisisButton.style must be one of: ${validStyle.join(', ')}`);
    }
    
    if (typeof b.text !== 'string' || b.text.length === 0) {
      throw new Error('crisisButton.text must be a non-empty string');
    }
    
    if (b.responseTimeMs !== undefined && (typeof b.responseTimeMs !== 'number' || b.responseTimeMs < 0)) {
      throw new Error('crisisButton.responseTimeMs must be a non-negative number if provided');
    }
  }

  /**
   * Assert today progress is valid
   */
  static assertValidTodayProgress(progress: unknown): void {
    if (!progress || typeof progress !== 'object') {
      throw new Error('todayProgress must be an object');
    }

    const p = progress as any;
    
    this.assertValidSessionStatus(p.morning);
    this.assertValidSessionStatus(p.midday);  
    this.assertValidSessionStatus(p.evening);
    
    if (typeof p.completionPercentage !== 'number' || 
        p.completionPercentage < 0 || 
        p.completionPercentage > 100) {
      throw new Error('completionPercentage must be a number between 0 and 100');
    }
  }

  /**
   * Assert session status is valid
   */
  static assertValidSessionStatus(status: unknown): void {
    if (!status || typeof status !== 'object') {
      throw new Error('Session status must be an object');
    }

    const s = status as any;
    const validStatuses = ['not_started', 'in_progress', 'completed', 'skipped'];
    
    if (!validStatuses.includes(s.status)) {
      throw new Error(`Invalid status: ${s.status}`);
    }
    
    if (typeof s.progressPercentage !== 'number' || 
        s.progressPercentage < 0 || 
        s.progressPercentage > 100) {
      throw new Error('progressPercentage must be a number between 0 and 100');
    }
    
    if (typeof s.canResume !== 'boolean') {
      throw new Error('canResume must be a boolean');
    }
    
    if (typeof s.estimatedTimeMinutes !== 'number' || s.estimatedTimeMinutes < 0) {
      throw new Error('estimatedTimeMinutes must be a non-negative number');
    }
  }

  /**
   * Assert no privacy violations
   */
  static assertNoPrivacyViolations(data: unknown): void {
    const result = widgetTestUtils.validatePrivacy(data);
    
    if (!result.isValid) {
      const violationDetails = result.violations
        .map(v => `${v.violationType}: ${v.details}`)
        .join(', ');
      throw new Error(`Privacy violations detected: ${violationDetails}`);
    }
  }

  /**
   * Assert deep link URL is valid
   */
  static assertValidDeepLink(url: string): void {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.protocol !== 'fullmind:') {
        throw new Error(`Invalid protocol: ${urlObj.protocol}`);
      }
      
      if (!urlObj.pathname.startsWith('/checkin/') && urlObj.pathname !== '/crisis') {
        throw new Error(`Invalid path: ${urlObj.pathname}`);
      }
      
      if (urlObj.pathname.startsWith('/checkin/')) {
        const type = urlObj.pathname.split('/')[2];
        if (!['morning', 'midday', 'evening'].includes(type)) {
          throw new Error(`Invalid check-in type: ${type}`);
        }
      }
      
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid URL format: ${url}`);
      }
      throw error;
    }
  }
}

/**
 * Test Scenario Generators
 */
export class WidgetTestScenarios {
  
  /**
   * Generate privacy violation test cases
   */
  static generatePrivacyViolationCases(): Array<{ name: string; data: any; expectedViolationType: string }> {
    return [
      {
        name: 'PHQ-9 assessment data',
        data: { phq9Score: 15, assessment: 'depression' },
        expectedViolationType: 'assessment_data_detected'
      },
      {
        name: 'GAD-7 assessment data',
        data: { gad7Result: 'moderate_anxiety' },
        expectedViolationType: 'assessment_data_detected'
      },
      {
        name: 'Email address',
        data: { contact: 'user@example.com' },
        expectedViolationType: 'personal_information_detected'
      },
      {
        name: 'Phone number',
        data: { phone: '555-123-4567' },
        expectedViolationType: 'personal_information_detected'
      },
      {
        name: 'Clinical terminology',
        data: { notes: 'Patient shows signs of suicidal ideation' },
        expectedViolationType: 'clinical_data_detected'
      },
      {
        name: 'Emergency contact info',
        data: { emergency_contact: 'Dr. Smith 555-999-8888' },
        expectedViolationType: 'personal_information_detected'
      }
    ];
  }

  /**
   * Generate valid widget data scenarios
   */
  static generateValidWidgetScenarios(): Array<{ name: string; data: WidgetData }> {
    return [
      {
        name: 'Morning completed, others not started',
        data: widgetTestUtils.createMockWidgetData({
          todayProgress: {
            morning: widgetTestUtils.createMockSessionStatus('completed', 100),
            midday: widgetTestUtils.createMockSessionStatus('not_started'),
            evening: widgetTestUtils.createMockSessionStatus('not_started'),
            completionPercentage: 33
          }
        })
      },
      {
        name: 'Midday in progress',
        data: widgetTestUtils.createMockWidgetData({
          todayProgress: {
            morning: widgetTestUtils.createMockSessionStatus('completed', 100),
            midday: widgetTestUtils.createMockSessionStatus('in_progress', 45),
            evening: widgetTestUtils.createMockSessionStatus('not_started'),
            completionPercentage: 48
          }
        })
      },
      {
        name: 'All sessions completed',
        data: widgetTestUtils.createMockWidgetData({
          todayProgress: {
            morning: widgetTestUtils.createMockSessionStatus('completed', 100),
            midday: widgetTestUtils.createMockSessionStatus('completed', 100),
            evening: widgetTestUtils.createMockSessionStatus('completed', 100),
            completionPercentage: 100
          }
        })
      },
      {
        name: 'Crisis mode active - enhanced prominence',
        data: widgetTestUtils.createMockWidgetData({
          hasActiveCrisis: true,
          crisisButton: {
            alwaysVisible: true,
            prominence: 'enhanced',
            text: 'CRISIS SUPPORT NEEDED',
            style: 'urgent'
          }
        })
      },
      {
        name: 'Crisis mode active - with performance tracking',
        data: widgetTestUtils.createMockWidgetData({
          hasActiveCrisis: true,
          crisisButton: {
            alwaysVisible: true,
            prominence: 'enhanced',
            text: 'CRISIS SUPPORT NEEDED',
            style: 'urgent',
            responseTimeMs: 150
          }
        })
      }
    ];
  }

  /**
   * Generate deep link test scenarios
   */
  static generateDeepLinkScenarios(): Array<{ name: string; url: string; shouldBeValid: boolean }> {
    return [
      {
        name: 'Morning check-in without resume',
        url: widgetTestUtils.simulateDeepLink('morning', false),
        shouldBeValid: true
      },
      {
        name: 'Evening check-in with resume',
        url: widgetTestUtils.simulateDeepLink('evening', true),
        shouldBeValid: true
      },
      {
        name: 'Crisis intervention',
        url: widgetTestUtils.simulateCrisisDeepLink(),
        shouldBeValid: true
      },
      {
        name: 'Invalid protocol',
        url: 'http://example.com/checkin/morning',
        shouldBeValid: false
      },
      {
        name: 'Invalid check-in type',
        url: 'fullmind://checkin/invalid?resume=false',
        shouldBeValid: false
      },
      {
        name: 'Malformed URL',
        url: 'not-a-valid-url',
        shouldBeValid: false
      }
    ];
  }
}

/**
 * Performance Testing Utilities
 */
export class WidgetPerformanceTestUtils {
  
  /**
   * Measure widget data generation performance
   */
  static async measureWidgetDataGeneration(
    iterations: number = 100
  ): Promise<{ averageMs: number; minMs: number; maxMs: number }> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      widgetTestUtils.createMockWidgetData();
      const end = performance.now();
      times.push(end - start);
    }
    
    return {
      averageMs: times.reduce((sum, time) => sum + time, 0) / times.length,
      minMs: Math.min(...times),
      maxMs: Math.max(...times)
    };
  }

  /**
   * Measure privacy validation performance
   */
  static async measurePrivacyValidation(
    testData: unknown[],
    iterations: number = 100
  ): Promise<{ averageMs: number; minMs: number; maxMs: number }> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const data = testData[i % testData.length];
      const start = performance.now();
      widgetTestUtils.validatePrivacy(data);
      const end = performance.now();
      times.push(end - start);
    }
    
    return {
      averageMs: times.reduce((sum, time) => sum + time, 0) / times.length,
      minMs: Math.min(...times),
      maxMs: Math.max(...times)
    };
  }
}

// Export all test utilities
export {
  WidgetTestAssertions as widgetTestAssertions,
  WidgetTestScenarios as widgetTestScenarios,
  WidgetPerformanceTestUtils as widgetPerformanceTestUtils
};