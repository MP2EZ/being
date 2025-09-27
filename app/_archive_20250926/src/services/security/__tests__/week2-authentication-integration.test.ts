/**
 * Week 2 Authentication Security Integration Tests
 *
 * Tests the integration of all new authentication security services:
 * - Session Security Service
 * - Authentication Security Service
 * - Crisis Authentication Service
 * - Consent & Privacy Service
 */

import {
  sessionSecurityService,
  authenticationSecurityService,
  crisisAuthenticationService,
  consentPrivacyService,
  securityManager
} from '../index';

// Mock external dependencies
jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
  digestStringAsync: jest.fn(() => Promise.resolve('test-hash')),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    addEventListener: jest.fn(),
  },
}));

describe('Week 2 Authentication Security Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Security Service', () => {
    it('should create HIPAA-compliant session with 15-minute timeout', async () => {
      const session = await sessionSecurityService.createSession(
        'test-user-123',
        'biometric',
        'test-device-456'
      );

      expect(session).toBeDefined();
      expect(session.userId).toBe('test-user-123');
      expect(session.deviceId).toBe('test-device-456');
      expect(session.sessionType).toBe('authenticated');

      // Check HIPAA-compliant timeout (15 minutes)
      const createdAt = new Date(session.createdAt);
      const expiresAt = new Date(session.expiresAt);
      const timeoutMinutes = (expiresAt.getTime() - createdAt.getTime()) / (60 * 1000);
      expect(timeoutMinutes).toBe(15);
    });

    it('should validate session with performance under 100ms', async () => {
      // Create session first
      await sessionSecurityService.createSession(
        'test-user-123',
        'biometric',
        'test-device-456'
      );

      const startTime = Date.now();
      const validation = await sessionSecurityService.validateSession();
      const duration = Date.now() - startTime;

      expect(validation.valid).toBe(true);
      expect(duration).toBeLessThan(100); // Performance requirement
      expect(validation.performanceMetrics.validationTime).toBeLessThan(100);
    });

    it('should handle idle detection and re-authentication', async () => {
      const session = await sessionSecurityService.createSession(
        'test-user-123',
        'biometric',
        'test-device-456'
      );

      // Mark user as active
      sessionSecurityService.markActivity();

      const validation = await sessionSecurityService.validateSession();
      expect(validation.valid).toBe(true);
      expect(validation.requiresReAuthentication).toBe(false);
    });
  });

  describe('Authentication Security Service', () => {
    it('should enforce rate limiting (5 attempts per 15 minutes)', async () => {
      const deviceId = 'test-device-rate-limit';
      const userId = 'test-user-rate-limit';

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const result = await authenticationSecurityService.authenticateUser(
          userId,
          'password',
          deviceId,
          { password: 'wrong-password' }
        );
        expect(result.success).toBe(false);
      }

      // 6th attempt should be rate limited
      const rateLimitedResult = await authenticationSecurityService.authenticateUser(
        userId,
        'password',
        deviceId,
        { password: 'wrong-password' }
      );

      expect(rateLimitedResult.success).toBe(false);
      expect(rateLimitedResult.rateLimited).toBe(true);
      expect(rateLimitedResult.lockedUntil).toBeDefined();
    });

    it('should validate JWT tokens correctly', async () => {
      // Mock a valid JWT token structure
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6OTk5OTk5OTk5OX0.test-signature';

      const validation = await authenticationSecurityService.validateJWT(mockToken, 'access');

      expect(validation.valid).toBeDefined();
      expect(validation.claims).toBeDefined();
      expect(validation.trustLevel).toBeGreaterThanOrEqual(0);
      expect(validation.trustLevel).toBeLessThanOrEqual(1);
    });

    it('should handle device binding and trust levels', async () => {
      const userId = 'test-user-device-binding';
      const deviceId = 'test-device-binding';

      const binding = await authenticationSecurityService.createDeviceBinding(userId, deviceId);

      expect(binding).toBeDefined();
      expect(binding.userId).toBe(userId);
      expect(binding.deviceId).toBe(deviceId);
      expect(binding.trustLevel).toBeGreaterThanOrEqual(0);
      expect(binding.trustLevel).toBeLessThanOrEqual(1);
      expect(binding.deviceFingerprint).toBeDefined();
    });
  });

  describe('Crisis Authentication Service', () => {
    it('should create emergency session under 200ms', async () => {
      const startTime = Date.now();

      const crisisResult = await crisisAuthenticationService.createCrisisAccess(
        'emergency-device-123',
        'suicidal_ideation',
        'critical',
        'crisis-user-123'
      );

      const duration = Date.now() - startTime;

      expect(crisisResult.success).toBe(true);
      expect(duration).toBeLessThan(200); // Critical performance requirement
      expect(crisisResult.performanceMetrics.responseTime).toBeLessThan(200);
      expect(crisisResult.session?.sessionType).toBe('emergency');
    });

    it('should detect crisis situations accurately', async () => {
      const crisisInput = {
        text: 'I want to kill myself and end it all',
        phq9Score: 22,
        gad7Score: 16
      };

      const detection = await crisisAuthenticationService.detectCrisis(
        crisisInput,
        'user-123',
        'device-123'
      );

      expect(detection.valid).toBe(true);
      expect(detection.crisisDetected).toBe(true);
      expect(detection.severity).toBe('critical');
      expect(detection.crisisType).toBe('suicidal_ideation');
      expect(detection.immediateIntervention).toBe(true);
      expect(detection.confidence).toBeGreaterThan(0.9);
    });

    it('should validate crisis operations without full authentication', async () => {
      // Create crisis session
      const crisisResult = await crisisAuthenticationService.createCrisisAccess(
        'emergency-device-456',
        'panic_attack',
        'severe'
      );

      const sessionId = crisisResult.session?.sessionId;
      expect(sessionId).toBeDefined();

      // Validate crisis operations
      const operations = ['crisis_plan_view', 'emergency_contact', 'crisis_button'];

      for (const operation of operations) {
        const validation = await crisisAuthenticationService.validateCrisisAccess(
          sessionId!,
          operation as any
        );

        expect(validation.allowed).toBe(true);
        expect(validation.performanceTime).toBeLessThan(100);
      }
    });

    it('should enforce 15-minute emergency session limit', async () => {
      const crisisResult = await crisisAuthenticationService.createCrisisAccess(
        'emergency-device-timeout',
        'severe_anxiety',
        'moderate'
      );

      expect(crisisResult.success).toBe(true);
      expect(crisisResult.session).toBeDefined();

      // Check session expiration is set to 15 minutes
      const createdAt = new Date(crisisResult.session!.initiatedAt);
      const expiresAt = new Date(crisisResult.session!.expiresAt);
      const timeoutMinutes = (expiresAt.getTime() - createdAt.getTime()) / (60 * 1000);

      expect(timeoutMinutes).toBe(15);
    });
  });

  describe('Consent & Privacy Service', () => {
    it('should create GDPR/CCPA compliant consent', async () => {
      const consent = await consentPrivacyService.createUserConsent(
        'privacy-user-123',
        'privacy-device-123',
        {
          dataProcessing: {
            collectClinicalData: true,
            therapeuticUse: true,
            localStorageOnly: true
          },
          privacy: {
            enableDataMinimization: true,
            requireBiometric: true,
            anonymizeData: true
          },
          communication: {
            allowPushNotifications: true,
            therapeuticReminders: true,
            allowEmergencyContact: true
          }
        }
      );

      expect(consent).toBeDefined();
      expect(consent.userId).toBe('privacy-user-123');
      expect(consent.deviceId).toBe('privacy-device-123');
      expect(consent.hipaaCompliant).toBe(true);
      expect(consent.gdprCompliant).toBe(true);
      expect(consent.ccpaCompliant).toBe(true);
      expect(consent.consentVersion).toBeDefined();
      expect(consent.categories).toHaveLength(4); // Default categories
    });

    it('should validate consent for operations', async () => {
      // Create consent first
      await consentPrivacyService.createUserConsent(
        'consent-user-456',
        'consent-device-456',
        {
          dataProcessing: {
            collectClinicalData: true,
            analyticsUse: false
          },
          privacy: {},
          communication: {}
        }
      );

      // Test clinical data access (should be allowed)
      const clinicalValidation = await consentPrivacyService.validateConsent(
        'consent-user-456',
        'consent-device-456',
        'clinical_data_access',
        ['clinical_data']
      );

      expect(clinicalValidation.valid).toBe(true);
      expect(clinicalValidation.missing).toHaveLength(0);

      // Test analytics (should not be allowed)
      const analyticsValidation = await consentPrivacyService.validateConsent(
        'consent-user-456',
        'consent-device-456',
        'analytics',
        ['usage_data']
      );

      expect(analyticsValidation.valid).toBe(false);
      expect(analyticsValidation.missing).toContain('analytics_consent');
    });

    it('should handle consent withdrawal with audit trail', async () => {
      // Create consent
      await consentPrivacyService.createUserConsent(
        'withdrawal-user-789',
        'withdrawal-device-789',
        {
          dataProcessing: { collectClinicalData: true },
          privacy: {},
          communication: {}
        }
      );

      // Withdraw consent
      const withdrawal = await consentPrivacyService.withdrawUserConsent(
        'withdrawal-user-789',
        'withdrawal-device-789',
        'User requested data deletion'
      );

      expect(withdrawal.success).toBe(true);
      expect(withdrawal.gracePeriodDays).toBe(30);
      expect(withdrawal.deletionScheduled).toBe(true);

      // Verify consent is withdrawn
      const validation = await consentPrivacyService.validateConsent(
        'withdrawal-user-789',
        'withdrawal-device-789',
        'any_operation'
      );

      expect(validation.valid).toBe(false);
      expect(validation.conflicts).toContain('consent_withdrawn');
    });

    it('should conduct privacy impact assessments', async () => {
      const assessment = await consentPrivacyService.conductPrivacyImpactAssessment(
        'cloud_sync',
        ['clinical_data', 'pii', 'biometric'],
        { thirdPartyInvolved: true }
      );

      expect(assessment).toBeDefined();
      expect(assessment.riskLevel).toBe('critical'); // High-risk operation with sensitive data
      expect(assessment.consentRequired).toBe(true);
      expect(assessment.approvalRequired).toBe(true);
      expect(assessment.mitigationMeasures).toContain('data_encryption');
      expect(assessment.complianceRequirements).toContain('HIPAA');
      expect(assessment.complianceRequirements).toContain('GDPR');
    });
  });

  describe('Unified Security Manager Integration', () => {
    it('should initialize all security services', async () => {
      await securityManager.initialize();

      const securityStatus = await securityManager.getSecurityStatus();
      expect(securityStatus).toBeDefined();
      expect(securityStatus.overall).toBeIn(['secure', 'warning', 'critical']);
    });

    it('should coordinate authentication with session and consent validation', async () => {
      const userId = 'integration-user-999';
      const deviceId = 'integration-device-999';

      // Create consent first
      await consentPrivacyService.createUserConsent(userId, deviceId, {
        dataProcessing: { collectClinicalData: true },
        privacy: {},
        communication: {}
      });

      // Test access validation through unified manager
      const accessResult = await securityManager.validateAccess(
        'clinical_data',
        'read',
        userId
      );

      expect(accessResult).toBeDefined();
      expect(typeof accessResult.allowed).toBe('boolean');
      expect(accessResult.reason).toBeDefined();
      expect(Array.isArray(accessResult.additionalRequirements)).toBe(true);
      expect(typeof accessResult.auditRequired).toBe('boolean');
    });

    it('should handle emergency authentication flow', async () => {
      const userId = 'emergency-user-888';
      const deviceId = 'emergency-device-888';

      // Test emergency authentication
      const authResult = await securityManager.authenticateUser(
        'crisis_access',
        true // emergency bypass
      );

      expect(authResult).toBeDefined();
      expect(authResult.method).toBe('emergency');
      expect(authResult.duration).toBeLessThan(200); // Performance requirement
    });
  });

  describe('Performance & Compliance Validation', () => {
    it('should meet all performance requirements', async () => {
      const performanceTests = [
        {
          name: 'Session Validation',
          test: () => sessionSecurityService.validateSession(),
          maxTime: 100
        },
        {
          name: 'Crisis Access Creation',
          test: () => crisisAuthenticationService.createCrisisAccess(
            'perf-device',
            'panic_attack',
            'moderate'
          ),
          maxTime: 200
        },
        {
          name: 'Consent Validation',
          test: () => consentPrivacyService.validateConsent(
            'perf-user',
            'perf-device',
            'test_operation'
          ),
          maxTime: 50
        }
      ];

      for (const test of performanceTests) {
        const startTime = Date.now();
        await test.test();
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(test.maxTime);
      }
    });

    it('should maintain HIPAA compliance requirements', () => {
      const config = sessionSecurityService.getConfiguration();

      // HIPAA-compliant session timeout
      expect(config.sessionTimeoutMinutes).toBe(15);

      // Required security features
      expect(config.enforceDeviceBinding).toBe(true);
      expect(config.requireBiometricForSensitive).toBe(true);
      expect(config.enableIdleDetection).toBe(true);
      expect(config.autoLockOnBackground).toBe(true);
    });

    it('should maintain audit trail integrity', async () => {
      // Create some auditable activities
      await sessionSecurityService.createSession('audit-user', 'biometric', 'audit-device');
      await crisisAuthenticationService.createCrisisAccess('audit-device', 'other', 'low');

      // Check audit trails exist
      const sessionActivities = sessionSecurityService.getSessionActivities();
      const crisisHistory = crisisAuthenticationService.getCrisisHistory();
      const consentAudits = consentPrivacyService.getConsentAudits();

      expect(Array.isArray(sessionActivities)).toBe(true);
      expect(Array.isArray(crisisHistory)).toBe(true);
      expect(Array.isArray(consentAudits)).toBe(true);

      // Each audit entry should have required fields
      if (sessionActivities.length > 0) {
        const activity = sessionActivities[0];
        expect(activity.activityId).toBeDefined();
        expect(activity.timestamp).toBeDefined();
        expect(activity.activityType).toBeDefined();
      }
    });
  });
});

// Helper function for expect extensions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeIn(items: any[]): R;
    }
  }
}

expect.extend({
  toBeIn(received, items) {
    const pass = items.includes(received);
    return {
      message: () => `expected ${received} to be in [${items.join(', ')}]`,
      pass,
    };
  },
});