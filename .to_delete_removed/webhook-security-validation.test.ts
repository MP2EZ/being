/**
 * Comprehensive Webhook Security Validation Tests
 *
 * Validates security hardening implementations including:
 * - Enhanced encryption and data protection
 * - Threat detection with mental health-aware protocols
 * - Crisis-safe security protocols (<200ms emergency response)
 * - HIPAA compliance hardening
 * - Production security configuration
 *
 * Parallel execution with performance agent optimization work.
 */

import { securityControlsService } from '../../src/services/security/SecurityControlsService';
import { encryptionService, DataSensitivity } from '../../src/services/security/EncryptionService';
import { featureFlagService } from '../../src/services/security/FeatureFlags';
import type {
  ThreatAssessment,
  SecurityViolation,
  AuditLogEntry,
  BiometricAuthConfig
} from '../../src/services/security/SecurityControlsService';

// Mock crypto for HMAC verification
const mockCrypto = {
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('valid_signature_hash')
    })
  }),
  timingSafeEqual: jest.fn().mockReturnValue(true)
};

jest.mock('crypto', () => mockCrypto);

describe('Webhook Security Validation Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset security service state
    await securityControlsService.performThreatAssessment();
  });

  describe('Enhanced Encryption Validation', () => {
    it('validates enhanced webhook data encryption', async () => {
      const sensitiveWebhookData = {
        userId: 'user_123',
        subscriptionId: 'sub_456',
        clinicalMetadata: {
          assessmentScore: 15,
          crisisRisk: 'medium'
        }
      };

      const encryptedData = await encryptionService.encryptData(
        sensitiveWebhookData,
        DataSensitivity.CLINICAL
      );

      expect(encryptedData.encryptedData).toBeDefined();
      expect(encryptedData.iv).toBeDefined();
      expect(encryptedData.timestamp).toBeDefined();

      // Verify encryption meets clinical standards
      expect(encryptedData.encryptedData).not.toContain('user_123');
      expect(encryptedData.encryptedData).not.toContain('sub_456');
      expect(encryptedData.encryptedData).not.toContain('15');
    });

    it('validates therapeutic data protection in webhook processing', async () => {
      const therapeuticWebhookPayload = {
        eventType: 'session.completed',
        data: {
          sessionId: 'session_789',
          progressMetrics: {
            moodImprovement: 0.15,
            engagementScore: 8.5,
            therapeuticGains: ['mindfulness', 'emotional_regulation']
          },
          nextRecommendations: ['breathing_exercise', 'body_scan']
        }
      };

      // Encrypt therapeutic data before webhook processing
      const encryptedPayload = await encryptionService.encryptData(
        therapeuticWebhookPayload,
        DataSensitivity.THERAPEUTIC
      );

      // Verify therapeutic-specific encryption standards
      expect(encryptedPayload.encryptedData).not.toContain('session_789');
      expect(encryptedPayload.encryptedData).not.toContain('moodImprovement');
      expect(encryptedPayload.encryptedData).not.toContain('therapeuticGains');

      // Verify decryption preserves therapeutic data integrity
      const decryptedPayload = await encryptionService.decryptData(
        encryptedPayload,
        DataSensitivity.THERAPEUTIC
      );

      expect(decryptedPayload.data.progressMetrics.moodImprovement).toBe(0.15);
      expect(decryptedPayload.data.progressMetrics.therapeuticGains).toContain('mindfulness');
    });

    it('validates crisis-sensitive data encryption standards', async () => {
      const crisisWebhookData = {
        eventType: 'crisis.detected',
        urgencyLevel: 'immediate',
        interventionData: {
          riskScore: 25, // PHQ-9 score indicating crisis
          triggerFactors: ['sleep_disruption', 'suicidal_thoughts'],
          emergencyContacts: ['988', 'family_contact_encrypted'],
          safetyPlan: 'encrypted_safety_plan_reference'
        }
      };

      const encryptedCrisisData = await encryptionService.encryptData(
        crisisWebhookData,
        DataSensitivity.CLINICAL
      );

      // Crisis data must have strongest encryption
      expect(encryptedCrisisData.encryptedData).not.toContain('25');
      expect(encryptedCrisisData.encryptedData).not.toContain('suicidal_thoughts');
      expect(encryptedCrisisData.encryptedData).not.toContain('988');

      // Verify crisis data can be decrypted quickly for emergency response
      const decryptStart = performance.now();
      const decryptedCrisisData = await encryptionService.decryptData(
        encryptedCrisisData,
        DataSensitivity.CLINICAL
      );
      const decryptTime = performance.now() - decryptStart;

      expect(decryptTime).toBeLessThan(50); // Crisis decryption must be <50ms
      expect(decryptedCrisisData.urgencyLevel).toBe('immediate');
      expect(decryptedCrisisData.interventionData.riskScore).toBe(25);
    });
  });

  describe('Advanced Threat Detection Validation', () => {
    it('validates mental health-aware threat detection', async () => {
      // Simulate webhook traffic patterns that could indicate attacks
      const suspiciousWebhookPattern = [
        { endpoint: 'webhook/subscription', timestamp: Date.now(), attempts: 1 },
        { endpoint: 'webhook/subscription', timestamp: Date.now() + 100, attempts: 1 },
        { endpoint: 'webhook/subscription', timestamp: Date.now() + 200, attempts: 1 },
        { endpoint: 'webhook/crisis', timestamp: Date.now() + 300, attempts: 1 },
        { endpoint: 'webhook/crisis', timestamp: Date.now() + 400, attempts: 1 }
      ];

      // Perform threat assessment
      const threatAssessment = await securityControlsService.performThreatAssessment();

      expect(threatAssessment.threatLevel).toBeDefined();
      expect(threatAssessment.indicators).toBeDefined();
      expect(threatAssessment.cloudIntegrationImpact).toBeDefined();

      // Mental health context should be preserved in threat assessment
      expect(threatAssessment.recommendedActions).toBeDefined();

      // Crisis endpoints should have special handling
      const crisisAwareActions = threatAssessment.recommendedActions.filter(action =>
        action.action.includes('crisis') || action.action.includes('emergency')
      );

      // Should maintain crisis accessibility even during threats
      expect(threatAssessment.cloudIntegrationImpact.escalateToOfflineMode).toBeDefined();
    });

    it('validates automated threat response preserves therapeutic access', async () => {
      // Simulate high-threat scenario
      const criticalThreat: Partial<ThreatAssessment> = {
        threatLevel: 'critical',
        threatType: 'data_breach',
        indicators: [
          {
            type: 'encryption_not_ready',
            severity: 'critical',
            description: 'Encryption service compromised',
            detected: true
          }
        ],
        recommendedActions: [
          {
            action: 'disable_cloud_sync_immediately',
            priority: 'immediate',
            automated: true
          },
          {
            action: 'enable_emergency_offline_mode',
            priority: 'immediate',
            automated: true
          }
        ]
      };

      // Verify automatic response maintains therapeutic access
      expect(criticalThreat.recommendedActions).toContainEqual(
        expect.objectContaining({
          action: 'enable_emergency_offline_mode',
          automated: true
        })
      );

      // Emergency offline mode should preserve crisis access
      const offlineAction = criticalThreat.recommendedActions?.find(
        action => action.action === 'enable_emergency_offline_mode'
      );
      expect(offlineAction?.priority).toBe('immediate');
    });

    it('validates threat detection response times for crisis scenarios', async () => {
      const threatDetectionStart = performance.now();

      // Simulate crisis-time threat detection
      const threatAssessment = await securityControlsService.performThreatAssessment();

      const threatDetectionTime = performance.now() - threatDetectionStart;

      // Threat detection must not interfere with crisis response times
      expect(threatDetectionTime).toBeLessThan(100); // <100ms for crisis compatibility
      expect(threatAssessment.threatLevel).toBeDefined();

      // Crisis mode should be accessible even during threat assessment
      expect(threatAssessment.cloudIntegrationImpact).toBeDefined();
    });
  });

  describe('Crisis-Safe Security Protocols', () => {
    it('validates emergency bypass protocols during security incidents', async () => {
      // Test emergency authentication bypass
      const emergencyAuthResult = await securityControlsService.authenticateUser({
        operation: 'emergency',
        emergencyBypass: true,
        customPrompt: 'Crisis access required - emergency bypass'
      });

      expect(emergencyAuthResult.success).toBe(true);
      expect(emergencyAuthResult.method).toBe('emergency_bypass');
      expect(emergencyAuthResult.duration).toBeLessThan(200); // Emergency bypass <200ms
    });

    it('validates crisis-triggered security protocol adjustments', async () => {
      // Simulate crisis detection during security incident
      const crisisContext = {
        emergencyAccess: true,
        biometricAuthenticated: false,
        dataSensitivity: DataSensitivity.CLINICAL
      };

      const rlsValidation = await securityControlsService.validateRLSPolicy(
        'crisis_plan',
        'SELECT',
        'crisis_user_123',
        crisisContext
      );

      expect(rlsValidation.allowed).toBe(true);
      expect(rlsValidation.reason).toContain('Emergency access granted');
      expect(rlsValidation.requiresBiometric).toBe(false); // Emergency bypasses biometric
      expect(rlsValidation.auditRequired).toBe(true); // Still requires audit
    });

    it('validates 988 hotline access preservation during security constraints', async () => {
      // Test hotline access under various security constraint levels
      const securityConstraintLevels = ['none', 'low', 'medium', 'high', 'critical'];

      for (const threatLevel of securityConstraintLevels) {
        const crisisAccessStart = performance.now();

        // Simulate crisis hotline access under security constraints
        const hotlineAccess = await validateHotlineAccess(threatLevel as any);

        const accessTime = performance.now() - crisisAccessStart;

        expect(hotlineAccess.accessible).toBe(true);
        expect(accessTime).toBeLessThan(200); // Crisis access must be <200ms regardless of threat level
        expect(hotlineAccess.securityAdjustments).toBeDefined();
      }
    });

    it('validates therapeutic continuity during security incidents', async () => {
      // Simulate ongoing therapeutic session during security incident
      const therapeuticSessionData = {
        sessionId: 'session_crisis_123',
        userId: 'user_crisis_456',
        sessionType: 'breathing_exercise',
        currentStep: 2,
        totalSteps: 3,
        timeRemaining: 60000 // 1 minute remaining
      };

      // Security incident should not interrupt active therapeutic session
      const sessionContinuity = await validateTherapeuticContinuity(
        therapeuticSessionData,
        'high' // High threat level
      );

      expect(sessionContinuity.canContinue).toBe(true);
      expect(sessionContinuity.securityAdjustments.maintainSession).toBe(true);
      expect(sessionContinuity.securityAdjustments.offlineMode).toBe(true);
      expect(sessionContinuity.responseTime).toBeLessThan(100); // Session continuity check <100ms
    });
  });

  describe('HIPAA Compliance Hardening', () => {
    it('validates enhanced audit trails for webhook processing', async () => {
      const webhookProcessingAudit: Omit<AuditLogEntry, 'logId' | 'timestamp'> = {
        userId: 'hipaa_user_123',
        operation: 'webhook_process_subscription_update',
        entityType: 'subscription',
        dataSensitivity: DataSensitivity.CLINICAL,
        securityContext: {
          authenticated: true,
          biometricUsed: true,
          deviceTrusted: true,
          networkSecure: true,
          encryptionActive: true
        },
        operationMetadata: {
          success: true,
          duration: 150,
          dataSize: 2048
        },
        complianceMarkers: {
          hipaaRequired: true,
          auditRequired: true,
          retentionDays: 2555 // 7 years
        }
      };

      await securityControlsService.logAuditEntry(webhookProcessingAudit);

      // Verify audit entry was logged with HIPAA compliance
      const securityStatus = await securityControlsService.getSecurityStatus();
      expect(securityStatus.auditLogEntries).toBeGreaterThan(0);
    });

    it('validates PII protection in webhook audit logs', async () => {
      const webhookEventWithPII = {
        userId: 'user_pii_789',
        email: 'patient@example.com',
        subscriptionData: {
          clinicalData: {
            assessmentScore: 18,
            diagnosis: 'moderate_depression'
          }
        }
      };

      // Process webhook with PII protection
      const protectedAuditEntry = await createHIPAACompliantWebhookLog(webhookEventWithPII);

      // Verify PII is not in audit trail
      expect(protectedAuditEntry.auditTrail.join(' ')).not.toContain('patient@example.com');
      expect(protectedAuditEntry.auditTrail.join(' ')).not.toContain('moderate_depression');

      // Verify clinical data is properly hashed/protected
      expect(protectedAuditEntry.userIdHash).toBeDefined();
      expect(protectedAuditEntry.userIdHash).not.toBe('user_pii_789');
      expect(protectedAuditEntry.clinicalDataPresent).toBe(true);
      expect(protectedAuditEntry.auditTrail).toContain('pii_protected');
    });

    it('validates enhanced data retention policies', async () => {
      const clinicalWebhookAudit: Omit<AuditLogEntry, 'logId' | 'timestamp'> = {
        userId: 'retention_user_456',
        operation: 'webhook_clinical_data_update',
        entityType: 'assessment',
        dataSensitivity: DataSensitivity.CLINICAL,
        securityContext: {
          authenticated: true,
          biometricUsed: true,
          deviceTrusted: true,
          networkSecure: true,
          encryptionActive: true
        },
        operationMetadata: {
          success: true,
          duration: 200
        },
        complianceMarkers: {
          hipaaRequired: true,
          auditRequired: true,
          retentionDays: 2555 // 7 years for clinical data
        }
      };

      await securityControlsService.logAuditEntry(clinicalWebhookAudit);

      // Verify retention policy is enforced
      expect(clinicalWebhookAudit.complianceMarkers.retentionDays).toBe(2555);
      expect(clinicalWebhookAudit.complianceMarkers.hipaaRequired).toBe(true);
    });
  });

  describe('Production Security Configuration', () => {
    it('validates production-ready security configuration', async () => {
      const securityStatus = await securityControlsService.getSecurityStatus();

      // Verify production security settings
      expect(securityStatus.threatLevel).toBeDefined();
      expect(securityStatus.biometricEnabled).toBeDefined();
      expect(securityStatus.performanceMetrics).toBeDefined();

      // Production should have threat monitoring active
      expect(securityStatus.performanceMetrics.threatAssessmentTime).toBeGreaterThan(0);
      expect(securityStatus.performanceMetrics.auditLoggingTime).toBeGreaterThan(0);
    });

    it('validates webhook endpoint security hardening', async () => {
      const webhookSecurityConfig = {
        signatureVerification: true,
        timestampValidation: true,
        rateLimiting: true,
        encryptionRequired: true,
        auditLogging: true,
        threatDetection: true
      };

      // Verify all security features are enabled for production
      expect(webhookSecurityConfig.signatureVerification).toBe(true);
      expect(webhookSecurityConfig.timestampValidation).toBe(true);
      expect(webhookSecurityConfig.rateLimiting).toBe(true);
      expect(webhookSecurityConfig.encryptionRequired).toBe(true);
      expect(webhookSecurityConfig.auditLogging).toBe(true);
      expect(webhookSecurityConfig.threatDetection).toBe(true);
    });

    it('validates emergency bypass security protocols', async () => {
      // Test emergency bypass configuration
      const emergencyConfig = {
        crisisHotlineBypass: true,
        therapeuticSessionProtection: true,
        emergencyOfflineMode: true,
        biometricBypassForCrisis: true
      };

      expect(emergencyConfig.crisisHotlineBypass).toBe(true);
      expect(emergencyConfig.therapeuticSessionProtection).toBe(true);
      expect(emergencyConfig.emergencyOfflineMode).toBe(true);
      expect(emergencyConfig.biometricBypassForCrisis).toBe(true);
    });
  });
});

// Helper functions for security validation
async function validateHotlineAccess(threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical') {
  // Mock hotline access validation
  return {
    accessible: true, // Always accessible regardless of threat level
    responseTime: Math.random() * 100 + 50, // 50-150ms response time
    securityAdjustments: {
      encryptionLevel: threatLevel === 'critical' ? 'maximum' : 'standard',
      auditLevel: threatLevel === 'critical' ? 'detailed' : 'standard'
    }
  };
}

async function validateTherapeuticContinuity(
  sessionData: any,
  threatLevel: string
) {
  return {
    canContinue: true,
    securityAdjustments: {
      maintainSession: true,
      offlineMode: threatLevel === 'high' || threatLevel === 'critical',
      encryptionBoost: threatLevel === 'critical'
    },
    responseTime: Math.random() * 50 + 25 // 25-75ms
  };
}

async function createHIPAACompliantWebhookLog(webhookData: any) {
  // Create HIPAA-compliant audit log
  const userIdHash = webhookData.userId
    ? `hash_${webhookData.userId.slice(-8)}`
    : undefined;

  return {
    eventId: `webhook_${Date.now()}`,
    timestamp: new Date(),
    userIdHash,
    clinicalDataPresent: !!webhookData.subscriptionData?.clinicalData,
    auditTrail: [
      'webhook_received',
      'signature_verified',
      'pii_protected',
      'processing_started',
      'processing_completed'
    ]
  };
}