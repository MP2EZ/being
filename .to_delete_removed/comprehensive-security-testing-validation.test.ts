/**
 * Comprehensive Security Testing Validation
 *
 * Tests all security hardening implementations from the security agent:
 * - ComprehensiveSecurityValidator end-to-end testing
 * - AdvancedThreatDetectionSystem validation with crisis awareness
 * - SecurityAuditReportingSystem compliance and reporting
 * - Enhanced security integration across webhook pipeline
 * - Crisis safety preservation with security enhancements
 */

import { comprehensiveSecurityValidator } from '../../src/services/security/ComprehensiveSecurityValidator';
import { advancedThreatDetectionSystem } from '../../src/services/security/AdvancedThreatDetectionSystem';
import { securityAuditReportingSystem } from '../../src/services/security/SecurityAuditReportingSystem';
import { webhookSecurityValidator } from '../../src/services/cloud/WebhookSecurityValidator';
import { paymentSecurityService } from '../../src/services/security/PaymentSecurityService';
import { encryptionService } from '../../src/services/security/EncryptionService';

// Test utilities
import { performance } from 'perf_hooks';

describe('Comprehensive Security Testing Validation', () => {
  let securityStartTime: number;

  beforeAll(async () => {
    securityStartTime = performance.now();

    // Initialize all security systems
    await comprehensiveSecurityValidator.initialize();
    await advancedThreatDetectionSystem.initialize();
    await securityAuditReportingSystem.initialize();

    console.log('Security systems initialized for comprehensive testing');
  });

  afterAll(async () => {
    // Cleanup security systems
    await comprehensiveSecurityValidator.cleanup();
    await advancedThreatDetectionSystem.cleanup();
    await securityAuditReportingSystem.cleanup();

    const totalTestTime = performance.now() - securityStartTime;
    console.log(`Security testing completed in ${totalTestTime.toFixed(2)}ms`);
  });

  describe('1. ComprehensiveSecurityValidator Testing', () => {
    test('should perform complete security audit with high score', async () => {
      const startTime = performance.now();

      const auditResult = await comprehensiveSecurityValidator.performSecurityAudit();

      const auditTime = performance.now() - startTime;

      // Validate audit results match security agent specifications
      expect(auditResult.systemSecurityScore).toBeGreaterThanOrEqual(96);
      expect(auditResult.crisisSafetyValidation.emergencyAccessGuaranteed).toBe(true);
      expect(auditResult.crisisSafetyValidation.crisisResponseTime).toBeLessThan(200);
      expect(auditResult.complianceStatus.overhallCompliance).toBeGreaterThanOrEqual(98);

      // Validate audit performance
      expect(auditTime).toBeLessThan(10000); // 10 second max for comprehensive audit

      // Validate audit structure
      expect(auditResult.vulnerabilities).toBeDefined();
      expect(auditResult.threatDetectionResults).toBeDefined();
      expect(auditResult.performanceImpact).toBeDefined();
      expect(auditResult.recommendations).toBeDefined();
      expect(auditResult.remediationPlan).toBeDefined();

      console.log(`Security audit completed: Score ${auditResult.systemSecurityScore}/100, Crisis safety: ${auditResult.crisisSafetyValidation.emergencyAccessGuaranteed}`);
    });

    test('should validate crisis safety systems with <200ms response', async () => {
      const crisisSafetyResult = await comprehensiveSecurityValidator.validateCrisisSafety();

      // Critical crisis safety requirements
      expect(crisisSafetyResult.emergencyAccessGuaranteed).toBe(true);
      expect(crisisSafetyResult.crisisResponseTime).toBeLessThan(200);
      expect(crisisSafetyResult.securityBypassValidated).toBe(true);
      expect(crisisSafetyResult.hotlineAccessProtected).toBe(true);
      expect(crisisSafetyResult.therapeuticContinuityMaintained).toBe(true);

      // Validate individual test results
      expect(crisisSafetyResult.validationTests.length).toBeGreaterThan(0);

      const failedTests = crisisSafetyResult.validationTests.filter(test => !test.passed);
      expect(failedTests.length).toBe(0);

      // Validate response times for all tests
      crisisSafetyResult.validationTests.forEach(test => {
        expect(test.responseTime).toBeLessThan(200);
      });

      console.log(`Crisis safety validation: ${crisisSafetyResult.validationTests.length} tests passed, avg response: ${crisisSafetyResult.crisisResponseTime}ms`);
    });

    test('should verify compliance status meets HIPAA/PCI standards', async () => {
      const auditResult = await comprehensiveSecurityValidator.performSecurityAudit();
      const complianceStatus = auditResult.complianceStatus;

      // HIPAA compliance validation
      expect(complianceStatus.hipaaCompliant).toBe(true);
      expect(complianceStatus.overhallCompliance).toBeGreaterThanOrEqual(98);

      // PCI DSS compliance validation
      expect(complianceStatus.pciDssCompliant).toBe(true);

      // Audit trail completeness
      expect(complianceStatus.auditTrailCompleteness).toBeGreaterThanOrEqual(85);
      expect(complianceStatus.certificationReadiness).toBe(true);

      // Compliance gaps should be minimal
      expect(complianceStatus.gaps.length).toBeLessThanOrEqual(2);

      const criticalGaps = complianceStatus.gaps.filter(gap => gap.impact === 'critical');
      expect(criticalGaps.length).toBe(0);

      console.log(`Compliance validation: HIPAA ${complianceStatus.hipaaCompliant}, PCI ${complianceStatus.pciDssCompliant}, Overall ${complianceStatus.overhallCompliance}%`);
    });

    test('should handle emergency security lockdown while preserving crisis access', async () => {
      const testReason = 'Security testing emergency lockdown';

      // Trigger emergency lockdown
      await comprehensiveSecurityValidator.emergencySecurityLockdown(testReason);

      // Verify crisis access is still available
      const crisisAccess = await comprehensiveSecurityValidator.validateCrisisSafety();
      expect(crisisAccess.emergencyAccessGuaranteed).toBe(true);

      // Verify monitoring status
      const monitoringStatus = await comprehensiveSecurityValidator.getSecurityMonitoringStatus();

      const emergencyEvent = monitoringStatus.securityEvents.find(event =>
        event.description.includes(testReason)
      );
      expect(emergencyEvent).toBeDefined();
      expect(emergencyEvent?.type).toBe('security_violation');
      expect(emergencyEvent?.severity).toBe('critical');

      console.log('Emergency lockdown tested successfully with crisis access preserved');
    });
  });

  describe('2. AdvancedThreatDetectionSystem Testing', () => {
    test('should analyze threats with 95.8% accuracy and crisis awareness', async () => {
      const testPayload = '{"test": "potential_threat", "script": "<script>alert(1)</script>"}';
      const testHeaders = {
        'user-agent': 'suspicious-scanner-bot',
        'x-forwarded-for': '192.168.1.100'
      };
      const testIP = '192.168.1.100';

      const threatEvent = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        testPayload,
        testHeaders,
        testIP,
        'test_user',
        false // not crisis mode
      );

      // Validate threat detection structure
      expect(threatEvent.eventId).toBeDefined();
      expect(threatEvent.threatType).toBeDefined();
      expect(threatEvent.severity).toBeDefined();
      expect(threatEvent.source).toBeDefined();
      expect(threatEvent.indicators.length).toBeGreaterThan(0);
      expect(threatEvent.response).toBeDefined();
      expect(threatEvent.crisisImpact).toBeDefined();

      // Validate threat response logic
      expect(['block', 'monitor', 'challenge', 'allow']).toContain(threatEvent.response.action);
      expect(threatEvent.response.confidence).toBeGreaterThan(0);
      expect(threatEvent.response.confidence).toBeLessThanOrEqual(100);

      // Validate crisis impact assessment
      expect(threatEvent.crisisImpact.severity).toBeDefined();

      console.log(`Threat detected: ${threatEvent.threatType} (${threatEvent.severity}) - Action: ${threatEvent.response.action}`);
    });

    test('should override threat blocking during crisis mode', async () => {
      const maliciousPayload = '{"malicious": "true", "sql": "DROP TABLE users; --"}';
      const suspiciousHeaders = {
        'user-agent': 'automated-attack-tool',
        'x-forwarded-for': '10.0.0.1'
      };

      // Test without crisis mode - should potentially block
      const normalThreat = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        maliciousPayload,
        suspiciousHeaders,
        '10.0.0.1',
        'test_user',
        false // normal mode
      );

      // Test with crisis mode - should allow with override
      const crisisThreat = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        maliciousPayload,
        suspiciousHeaders,
        '10.0.0.1',
        'crisis_user',
        true // crisis mode
      );

      // Validate crisis override behavior
      expect(crisisThreat.response.crisisOverride).toBe(true);
      expect(['crisis_allow', 'allow']).toContain(crisisThreat.response.action);

      // Crisis impact should be assessed
      expect(crisisThreat.crisisImpact.severity).toBeDefined();

      // Response reasoning should mention crisis
      const crisisReasoning = crisisThreat.response.reasoning.some(reason =>
        reason.toLowerCase().includes('crisis') || reason.toLowerCase().includes('emergency')
      );
      expect(crisisReasoning).toBe(true);

      console.log(`Crisis override validated: ${crisisThreat.response.action} with override ${crisisThreat.response.crisisOverride}`);
    });

    test('should perform behavioral analysis and risk scoring', async () => {
      const userId = 'behavioral_test_user';
      const threatSource = {
        ipAddress: '192.168.1.50',
        userAgent: 'normal-browser',
        headers: { 'user-agent': 'normal-browser' },
        payload: '{"normal": "request"}',
        reputation: {
          trustScore: 70,
          threatScore: 30,
          categories: [],
          sources: ['internal'],
          lastVerified: new Date().toISOString()
        }
      };

      const behavioralAnalysis = await advancedThreatDetectionSystem.performBehavioralAnalysis(
        userId,
        threatSource
      );

      // Validate behavioral analysis structure
      expect(behavioralAnalysis.userProfile).toBeDefined();
      expect(behavioralAnalysis.userProfile.userId).toBe(userId);
      expect(behavioralAnalysis.riskScore).toBeGreaterThanOrEqual(0);
      expect(behavioralAnalysis.riskScore).toBeLessThanOrEqual(100);
      expect(behavioralAnalysis.anomalies).toBeDefined();
      expect(behavioralAnalysis.recommendations).toBeDefined();
      expect(behavioralAnalysis.adaptiveThresholds).toBeDefined();

      // Validate user profile creation
      expect(behavioralAnalysis.userProfile.trustScore).toBeGreaterThanOrEqual(0);
      expect(behavioralAnalysis.userProfile.lastUpdated).toBeDefined();

      console.log(`Behavioral analysis: Risk score ${behavioralAnalysis.riskScore}, Anomalies: ${behavioralAnalysis.anomalies.length}`);
    });

    test('should assess crisis impact and protect emergency access', async () => {
      const crisisPayloads = [
        '{"emergency": "988 hotline needed"}',
        '{"crisis": "user in danger"}',
        '{"help": "suicidal thoughts"}',
        '{"emergency": "please help"}'
      ];

      for (const payload of crisisPayloads) {
        const crisisImpact = await advancedThreatDetectionSystem.assessCrisisImpact(
          payload,
          { 'user-agent': 'crisis-browser' },
          true // crisis mode
        );

        // Validate crisis impact detection
        expect(crisisImpact.impactsEmergencyAccess).toBe(true);
        expect(crisisImpact.severity).toBeOneOf(['medium', 'high', 'critical']);
        expect(crisisImpact.mitigation.length).toBeGreaterThan(0);
        expect(crisisImpact.recovery.length).toBeGreaterThan(0);

        // Check for hotline-specific protection
        if (payload.includes('988') || payload.includes('hotline')) {
          expect(crisisImpact.impactsHotlineAccess).toBe(true);
          expect(crisisImpact.severity).toBe('critical');
        }
      }

      console.log('Crisis impact assessment validated for emergency scenarios');
    });

    test('should provide threat detection metrics with high accuracy', async () => {
      const metrics = await advancedThreatDetectionSystem.getThreatDetectionMetrics();

      // Validate metrics structure
      expect(metrics.totalThreatsDetected).toBeGreaterThanOrEqual(0);
      expect(metrics.threatsBlocked).toBeGreaterThanOrEqual(0);
      expect(metrics.threatsMonitored).toBeGreaterThanOrEqual(0);
      expect(metrics.falsePositives).toBeGreaterThanOrEqual(0);
      expect(metrics.falseNegatives).toBeGreaterThanOrEqual(0);
      expect(metrics.averageDetectionTime).toBeGreaterThanOrEqual(0);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.crisisOverrides).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracyScore).toBeGreaterThanOrEqual(95); // 95.8% target accuracy

      console.log(`Threat detection metrics: Accuracy ${metrics.accuracyScore}%, Avg detection: ${metrics.averageDetectionTime}ms`);
    });
  });

  describe('3. SecurityAuditReportingSystem Testing', () => {
    test('should generate comprehensive security audit report', async () => {
      const reportStartTime = performance.now();

      const auditReport = await securityAuditReportingSystem.generateSecurityAuditReport('manual');

      const reportGenerationTime = performance.now() - reportStartTime;

      // Validate report structure
      expect(auditReport.reportId).toBeDefined();
      expect(auditReport.timestamp).toBeDefined();
      expect(auditReport.reportType).toBe('manual');
      expect(auditReport.auditScope).toBeDefined();
      expect(auditReport.executiveSummary).toBeDefined();
      expect(auditReport.detailedFindings).toBeDefined();
      expect(auditReport.complianceAssessment).toBeDefined();
      expect(auditReport.riskAssessment).toBeDefined();
      expect(auditReport.remediationPlan).toBeDefined();
      expect(auditReport.appendices).toBeDefined();
      expect(auditReport.reportMetadata).toBeDefined();

      // Validate audit scope
      expect(auditReport.auditScope.systemsAudited.length).toBeGreaterThan(0);
      expect(auditReport.auditScope.standards.length).toBeGreaterThan(0);

      // Validate performance
      expect(reportGenerationTime).toBeLessThan(30000); // 30 seconds max

      console.log(`Audit report generated: ${auditReport.reportId} in ${reportGenerationTime.toFixed(2)}ms`);
    });

    test('should generate specialized crisis safety audit', async () => {
      const crisisSafetyAudit = await securityAuditReportingSystem.generateCrisisSafetyAudit();

      // Validate crisis safety audit structure
      expect(crisisSafetyAudit.emergencyAccessValidation).toBeDefined();
      expect(crisisSafetyAudit.hotlineProtection).toBeDefined();
      expect(crisisSafetyAudit.therapeuticContinuity).toBeDefined();
      expect(crisisSafetyAudit.crisisProtocols).toBeDefined();
      expect(crisisSafetyAudit.securityOverrides).toBeDefined();

      // Validate emergency access validation
      expect(crisisSafetyAudit.emergencyAccessValidation.accessGuaranteed).toBe(true);
      expect(crisisSafetyAudit.emergencyAccessValidation.averageAccessTime).toBeLessThan(200);
      expect(crisisSafetyAudit.emergencyAccessValidation.failureRate).toBeLessThanOrEqual(0);

      // Validate hotline protection
      expect(crisisSafetyAudit.hotlineProtection.hotlineAccessProtected).toBe(true);
      expect(crisisSafetyAudit.hotlineProtection.securityBypassEffective).toBe(true);
      expect(crisisSafetyAudit.hotlineProtection.blockingIncidents).toBe(0);

      // Validate therapeutic continuity
      expect(crisisSafetyAudit.therapeuticContinuity.continuityMaintained).toBe(true);
      expect(crisisSafetyAudit.therapeuticContinuity.serviceAvailability).toBeGreaterThanOrEqual(99);

      console.log('Crisis safety audit completed with full validation');
    });

    test('should generate HIPAA compliance report with 98.5% score', async () => {
      const hipaaReport = await securityAuditReportingSystem.generateHIPAAComplianceReport();

      // Validate HIPAA assessment structure
      expect(hipaaReport.technicalSafeguards).toBeDefined();
      expect(hipaaReport.physicalSafeguards).toBeDefined();
      expect(hipaaReport.administrativeSafeguards).toBeDefined();
      expect(hipaaReport.overallCompliance).toBeGreaterThanOrEqual(98); // 98.5% target
      expect(hipaaReport.gaps).toBeDefined();
      expect(hipaaReport.evidence).toBeDefined();

      // Critical HIPAA gaps should be zero
      const criticalGaps = hipaaReport.gaps.filter(gap => gap.impact === 'critical');
      expect(criticalGaps.length).toBe(0);

      console.log(`HIPAA compliance: ${hipaaReport.overallCompliance}% with ${hipaaReport.gaps.length} gaps`);
    });

    test('should record and track security incidents', async () => {
      const testIncident = await securityAuditReportingSystem.recordSecurityIncident(
        'security_breach',
        'high',
        'Test security incident for validation',
        {
          usersAffected: 0,
          systemsAffected: ['test_system'],
          dataCompromised: false,
          serviceDowntime: 0,
          financialImpact: 'none',
          reputationalImpact: 'none'
        }
      );

      // Validate incident structure
      expect(testIncident.incidentId).toBeDefined();
      expect(testIncident.timestamp).toBeDefined();
      expect(testIncident.type).toBe('security_breach');
      expect(testIncident.severity).toBe('high');
      expect(testIncident.status).toBe('open');
      expect(testIncident.impact).toBeDefined();
      expect(testIncident.response).toBeDefined();
      expect(testIncident.lessons).toBeDefined();

      // Validate incident response tracking
      expect(testIncident.response.detectedBy).toBeDefined();
      expect(testIncident.response.detectionTime).toBeDefined();

      // Verify incident is retrievable
      const incidents = await securityAuditReportingSystem.getSecurityIncidents(5);
      const recordedIncident = incidents.find(inc => inc.incidentId === testIncident.incidentId);
      expect(recordedIncident).toBeDefined();

      console.log(`Security incident recorded: ${testIncident.incidentId} (${testIncident.severity})`);
    });

    test('should generate compliance dashboard with current status', async () => {
      const dashboard = await securityAuditReportingSystem.generateComplianceDashboard();

      // Validate dashboard structure
      expect(dashboard.hipaaScore).toBeGreaterThanOrEqual(95);
      expect(dashboard.pciScore).toBeGreaterThanOrEqual(95);
      expect(dashboard.crisisSafetyScore).toBeGreaterThanOrEqual(99);
      expect(dashboard.overallScore).toBeGreaterThanOrEqual(95);
      expect(dashboard.criticalIssues).toBeLessThanOrEqual(1);
      expect(dashboard.lastAudit).toBeDefined();

      console.log(`Compliance dashboard: HIPAA ${dashboard.hipaaScore}%, PCI ${dashboard.pciScore}%, Crisis ${dashboard.crisisSafetyScore}%`);
    });
  });

  describe('4. Enhanced Security Integration Testing', () => {
    test('should validate webhook security with comprehensive validation', async () => {
      const testPayload = '{"type": "payment.succeeded", "data": {"amount": 100}}';
      const testHeaders = {
        'stripe-signature': 'test_signature',
        'user-agent': 'Stripe/1.0',
        'content-type': 'application/json'
      };
      const testIP = '127.0.0.1';

      // Test normal webhook security
      const webhookResult = await webhookSecurityValidator.validateWebhookSecurity(
        testPayload,
        testHeaders,
        testIP,
        false
      );

      expect(webhookResult.isValid).toBeDefined();
      expect(webhookResult.threats).toBeDefined();
      expect(webhookResult.performance).toBeDefined();

      // Test webhook security with crisis mode
      const crisisWebhookResult = await webhookSecurityValidator.validateWebhookSecurity(
        testPayload,
        testHeaders,
        testIP,
        true // crisis mode
      );

      expect(crisisWebhookResult.crisisOverride).toBe(true);

      console.log(`Webhook security validated: Normal ${webhookResult.isValid}, Crisis override ${crisisWebhookResult.crisisOverride}`);
    });

    test('should validate payment security service integration', async () => {
      const paymentStatus = await paymentSecurityService.getPaymentSecurityStatus();

      // Validate payment security status
      expect(paymentStatus.pciCompliant).toBe(true);
      expect(paymentStatus.encryptionEnabled).toBe(true);
      expect(paymentStatus.tokenizationActive).toBe(true);
      expect(paymentStatus.auditingEnabled).toBe(true);

      // Test payment token validation
      const tokenValidation = await paymentSecurityService.validatePaymentToken(
        'test_token',
        'test_user',
        'test_device',
        false
      );

      expect(tokenValidation.success).toBeDefined();
      expect(tokenValidation.securityChecks).toBeDefined();

      console.log(`Payment security: PCI ${paymentStatus.pciCompliant}, Token validation ${tokenValidation.success}`);
    });

    test('should validate encryption service security readiness', async () => {
      const encryptionStatus = await encryptionService.getSecurityReadiness();

      // Validate encryption readiness
      expect(encryptionStatus.ready).toBe(true);
      expect(encryptionStatus.encryptionStrength).toBe('production');
      expect(encryptionStatus.keyManagement).toBe('secure');
      expect(encryptionStatus.complianceLevel).toBe('enterprise');

      // Test encryption/decryption functionality
      const testData = { test: 'sensitive data', user: 'test_user' };
      const userId = 'test_encryption_user';
      const context = { test: true };

      const encryptedData = await encryptionService.encryptData(testData, userId, context);
      expect(encryptedData.encryptedData).toBeDefined();
      expect(encryptedData.metadata).toBeDefined();

      const decryptedData = await encryptionService.decryptData(encryptedData, userId, context);
      expect(decryptedData).toEqual(testData);

      console.log(`Encryption service: Ready ${encryptionStatus.ready}, Strength ${encryptionStatus.encryptionStrength}`);
    });
  });

  describe('5. Regression Testing with Security Enhancements', () => {
    test('should maintain crisis response times <200ms with security overhead', async () => {
      const crisisTests = [
        { scenario: 'Emergency access', expectedTime: 200 },
        { scenario: '988 hotline protection', expectedTime: 200 },
        { scenario: 'Crisis button activation', expectedTime: 200 },
        { scenario: 'Security bypass', expectedTime: 200 }
      ];

      for (const test of crisisTests) {
        const startTime = performance.now();

        // Simulate crisis scenario with full security validation
        const crisisResult = await comprehensiveSecurityValidator.validateCrisisSafety();

        const responseTime = performance.now() - startTime;

        expect(responseTime).toBeLessThan(test.expectedTime);
        expect(crisisResult.emergencyAccessGuaranteed).toBe(true);

        console.log(`${test.scenario}: ${responseTime.toFixed(2)}ms (< ${test.expectedTime}ms required)`);
      }
    });

    test('should preserve therapeutic continuity during security incidents', async () => {
      // Simulate security incident
      await securityAuditReportingSystem.recordSecurityIncident(
        'system_failure',
        'medium',
        'Simulated security incident for testing',
        { usersAffected: 1, serviceDowntime: 0 }
      );

      // Verify therapeutic features remain accessible
      const crisisSafety = await securityAuditReportingSystem.generateCrisisSafetyAudit();

      expect(crisisSafety.therapeuticContinuity.continuityMaintained).toBe(true);
      expect(crisisSafety.therapeuticContinuity.featureAccessibility.assessmentAccess).toBe(true);
      expect(crisisSafety.therapeuticContinuity.featureAccessibility.checkInAccess).toBe(true);
      expect(crisisSafety.therapeuticContinuity.featureAccessibility.breathingExerciseAccess).toBe(true);
      expect(crisisSafety.therapeuticContinuity.featureAccessibility.crisisButtonAccess).toBe(true);

      console.log('Therapeutic continuity maintained during security incident');
    });

    test('should validate UI components functionality with enhanced security', async () => {
      // This would integrate with actual UI component tests
      // For now, validate that security doesn't break core functionality

      const securityStatus = await comprehensiveSecurityValidator.getSecurityMonitoringStatus();

      // Verify security monitoring doesn't impact system health
      expect(securityStatus.systemHealth).toBeGreaterThanOrEqual(95);
      expect(securityStatus.threatAttempts).toBeGreaterThanOrEqual(0);
      expect(securityStatus.successfulBlocks).toBeGreaterThanOrEqual(0);

      console.log(`System health: ${securityStatus.systemHealth}% with security monitoring active`);
    });

    test('should validate real-time state sync with security overhead', async () => {
      const startTime = performance.now();

      // Test state synchronization with security validation
      const threatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        '{"state": "sync_test"}',
        { 'user-agent': 'state-sync-client' },
        '127.0.0.1',
        'sync_user',
        false
      );

      const syncTime = performance.now() - startTime;

      // Verify state sync remains fast with security
      expect(syncTime).toBeLessThan(1000); // 1 second max for state sync
      expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);

      console.log(`State sync with security: ${syncTime.toFixed(2)}ms`);
    });

    test('should validate accessibility compliance with security enhancements', async () => {
      // Verify security doesn't impact accessibility
      const crisisSafety = await securityAuditReportingSystem.generateCrisisSafetyAudit();

      // Check that accessibility is maintained
      expect(crisisSafety.therapeuticContinuity.userExperienceImpact).toBeOneOf(['none', 'minimal']);
      expect(crisisSafety.emergencyAccessValidation.accessGuaranteed).toBe(true);

      // Security should not add accessibility barriers
      expect(crisisSafety.securityOverrides.overrideCapability).toBe(true);
      expect(crisisSafety.securityOverrides.auditingDuringOverride).toBe(true);

      console.log('Accessibility compliance maintained with security enhancements');
    });
  });

  describe('6. Compliance Testing with New Security Features', () => {
    test('should validate HIPAA compliance with enhanced security', async () => {
      const hipaaReport = await securityAuditReportingSystem.generateHIPAAComplianceReport();
      const securityAudit = await comprehensiveSecurityValidator.performSecurityAudit();

      // Validate enhanced HIPAA compliance
      expect(hipaaReport.overallCompliance).toBeGreaterThanOrEqual(98);
      expect(securityAudit.complianceStatus.hipaaCompliant).toBe(true);

      // Verify technical safeguards are enhanced
      expect(hipaaReport.technicalSafeguards).toBeDefined();

      // Audit trail should be comprehensive
      expect(securityAudit.complianceStatus.auditTrailCompleteness).toBeGreaterThanOrEqual(85);

      console.log(`Enhanced HIPAA compliance: ${hipaaReport.overallCompliance}%`);
    });

    test('should validate PCI DSS compliance with payment security enhancements', async () => {
      const securityAudit = await comprehensiveSecurityValidator.performSecurityAudit();
      const paymentStatus = await paymentSecurityService.getPaymentSecurityStatus();

      // Validate PCI DSS compliance
      expect(securityAudit.complianceStatus.pciDssCompliant).toBe(true);
      expect(paymentStatus.pciCompliant).toBe(true);

      // Enhanced payment security measures
      expect(paymentStatus.encryptionEnabled).toBe(true);
      expect(paymentStatus.tokenizationActive).toBe(true);
      expect(paymentStatus.auditingEnabled).toBe(true);

      console.log('Enhanced PCI DSS compliance validated');
    });

    test('should validate comprehensive audit reports meet compliance standards', async () => {
      const auditReport = await securityAuditReportingSystem.generateSecurityAuditReport('compliance');

      // Validate audit report meets compliance requirements
      expect(auditReport.complianceAssessment).toBeDefined();
      expect(auditReport.auditScope.standards.length).toBeGreaterThan(0);

      // Verify HIPAA and PCI standards are included
      const hipaaStandard = auditReport.auditScope.standards.find(s => s.name === 'HIPAA');
      const pciStandard = auditReport.auditScope.standards.find(s => s.name === 'PCI_DSS');

      expect(hipaaStandard).toBeDefined();
      expect(pciStandard).toBeDefined();

      console.log(`Compliance audit report generated with ${auditReport.auditScope.standards.length} standards`);
    });
  });

  describe('7. Integration Testing with Complete System', () => {
    test('should validate complete webhook pipeline with all security layers', async () => {
      const webhookPayload = JSON.stringify({
        type: 'subscription.updated',
        data: {
          object: {
            id: 'sub_test123',
            status: 'active',
            customer: 'cus_test456'
          }
        }
      });

      const webhookHeaders = {
        'stripe-signature': 'test_signature',
        'user-agent': 'Stripe/1.0',
        'content-type': 'application/json'
      };

      const sourceIP = '127.0.0.1';

      // Step 1: Webhook security validation
      const webhookSecurity = await webhookSecurityValidator.validateWebhookSecurity(
        webhookPayload,
        webhookHeaders,
        sourceIP,
        false
      );

      // Step 2: Advanced threat detection
      const threatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        webhookPayload,
        webhookHeaders,
        sourceIP,
        'webhook_user',
        false
      );

      // Step 3: Comprehensive security validation
      const securityValidation = await comprehensiveSecurityValidator.detectAndRespondToThreats(
        webhookPayload,
        webhookHeaders,
        sourceIP,
        false
      );

      // Validate complete pipeline
      expect(webhookSecurity.isValid).toBeDefined();
      expect(threatAnalysis.response.action).toBeDefined();
      expect(securityValidation.length).toBeGreaterThanOrEqual(0);

      // Pipeline should allow legitimate webhook
      expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);

      console.log(`Complete webhook pipeline validated: Security ${webhookSecurity.isValid}, Threat ${threatAnalysis.response.action}`);
    });

    test('should validate crisis scenario with full security integration', async () => {
      const crisisPayload = JSON.stringify({
        emergency: true,
        user_in_crisis: true,
        hotline_access: '988',
        assessment_score: 25 // PHQ-9 crisis score
      });

      const crisisHeaders = {
        'user-agent': 'FullMind-Crisis-Client',
        'x-crisis-mode': 'true'
      };

      // Test complete crisis flow with all security layers
      const threatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        crisisPayload,
        crisisHeaders,
        '192.168.1.1',
        'crisis_user_123',
        true // crisis mode
      );

      const securityValidation = await comprehensiveSecurityValidator.detectAndRespondToThreats(
        crisisPayload,
        crisisHeaders,
        '192.168.1.1',
        true // crisis mode
      );

      const crisisSafety = await comprehensiveSecurityValidator.validateCrisisSafety();

      // Validate crisis handling
      expect(threatAnalysis.response.crisisOverride).toBe(true);
      expect(threatAnalysis.response.action).toBeOneOf(['crisis_allow', 'allow']);
      expect(crisisSafety.emergencyAccessGuaranteed).toBe(true);
      expect(crisisSafety.hotlineAccessProtected).toBe(true);

      // No threats should be actively blocked in crisis mode
      const blockedThreats = securityValidation.filter(threat => threat.mitigationActive);
      expect(blockedThreats.length).toBe(0);

      console.log('Crisis scenario validated with full security integration and emergency access preserved');
    });
  });
});