/**
 * Complete Security System Integration Tests
 *
 * Tests the entire security-hardened webhook system working together:
 * - End-to-end security pipeline validation
 * - Multi-layer security coordination
 * - Crisis-aware security with therapeutic preservation
 * - Real-time threat detection and response integration
 * - Compliance validation across all security layers
 * - Performance validation with full security stack
 */

import { comprehensiveSecurityValidator } from '../../src/services/security/ComprehensiveSecurityValidator';
import { advancedThreatDetectionSystem } from '../../src/services/security/AdvancedThreatDetectionSystem';
import { securityAuditReportingSystem } from '../../src/services/security/SecurityAuditReportingSystem';
import { webhookSecurityValidator } from '../../src/services/cloud/WebhookSecurityValidator';
import { paymentSecurityService } from '../../src/services/security/PaymentSecurityService';
import { encryptionService } from '../../src/services/security/EncryptionService';

// Test utilities
import { performance } from 'perf_hooks';

describe('Complete Security System Integration Tests', () => {
  let systemStartTime: number;

  beforeAll(async () => {
    systemStartTime = performance.now();

    // Initialize complete security stack
    await Promise.all([
      comprehensiveSecurityValidator.initialize(),
      advancedThreatDetectionSystem.initialize(),
      securityAuditReportingSystem.initialize()
    ]);

    const initTime = performance.now() - systemStartTime;
    console.log(`Complete security system initialized in ${initTime.toFixed(2)}ms`);
  });

  afterAll(async () => {
    await Promise.all([
      comprehensiveSecurityValidator.cleanup(),
      advancedThreatDetectionSystem.cleanup(),
      securityAuditReportingSystem.cleanup()
    ]);

    const totalTime = performance.now() - systemStartTime;
    console.log(`Security system integration tests completed in ${totalTime.toFixed(2)}ms`);
  });

  describe('1. End-to-End Security Pipeline Validation', () => {
    test('should process legitimate webhook through complete security pipeline', async () => {
      const legitimateWebhook = {
        payload: JSON.stringify({
          type: 'customer.subscription.created',
          data: {
            object: {
              id: 'sub_legitimate_12345',
              customer: 'cus_legitimate_67890',
              status: 'active',
              current_period_end: Math.floor(Date.now() / 1000) + 2592000
            }
          }
        }),
        headers: {
          'stripe-signature': 'legitimate_signature_hash',
          'user-agent': 'Stripe/1.0 webhookengine',
          'content-type': 'application/json'
        },
        sourceIP: '54.187.174.169' // Stripe IP range
      };

      const pipelineStartTime = performance.now();

      // Process through complete security pipeline
      const [webhookValidation, threatAnalysis, securityValidation, complianceCheck] = await Promise.all([
        // Stage 1: Webhook-specific security
        webhookSecurityValidator.validateWebhookSecurity(
          legitimateWebhook.payload,
          legitimateWebhook.headers,
          legitimateWebhook.sourceIP,
          false
        ),

        // Stage 2: Advanced threat detection
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          legitimateWebhook.payload,
          legitimateWebhook.headers,
          legitimateWebhook.sourceIP,
          'webhook_processor',
          false
        ),

        // Stage 3: Comprehensive security validation
        comprehensiveSecurityValidator.detectAndRespondToThreats(
          legitimateWebhook.payload,
          legitimateWebhook.headers,
          legitimateWebhook.sourceIP,
          false
        ),

        // Stage 4: Compliance validation
        securityAuditReportingSystem.generateComplianceDashboard()
      ]);

      const pipelineTime = performance.now() - pipelineStartTime;

      // Validate pipeline results
      expect(pipelineTime).toBeLessThan(5000); // 5 seconds max for complete pipeline
      expect(webhookValidation.isValid).toBe(true);
      expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);
      expect(threatAnalysis.severity).toBeOneOf(['low', 'medium']);

      // No blocking threats for legitimate webhook
      const blockingThreats = securityValidation.filter(threat => threat.mitigationActive);
      expect(blockingThreats.length).toBe(0);

      // Compliance should remain high
      expect(complianceCheck.overallScore).toBeGreaterThanOrEqual(95);

      console.log(`Legitimate webhook pipeline: ${pipelineTime.toFixed(2)}ms - Action: ${threatAnalysis.response.action}`);
    });

    test('should detect and block malicious webhook through security pipeline', async () => {
      const maliciousWebhook = {
        payload: JSON.stringify({
          type: 'malicious.injection',
          data: {
            script: '<script>alert("XSS")</script>',
            sql: "'; DROP TABLE users; --",
            command: '$(rm -rf /)'
          }
        }),
        headers: {
          'user-agent': 'AttackBot/1.0 (Malicious Scanner)',
          'x-forwarded-for': '10.0.0.1,192.168.1.1',
          'content-type': 'application/json'
        },
        sourceIP: '10.0.0.1' // Suspicious private IP
      };

      const detectionStartTime = performance.now();

      // Process malicious request through security pipeline
      const [threatAnalysis, securityValidation, incidentRecording] = await Promise.all([
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          maliciousWebhook.payload,
          maliciousWebhook.headers,
          maliciousWebhook.sourceIP,
          'potential_attacker',
          false
        ),

        comprehensiveSecurityValidator.detectAndRespondToThreats(
          maliciousWebhook.payload,
          maliciousWebhook.headers,
          maliciousWebhook.sourceIP,
          false
        ),

        securityAuditReportingSystem.recordSecurityIncident(
          'security_breach',
          'high',
          'Malicious webhook detected and blocked',
          {
            usersAffected: 0,
            systemsAffected: ['webhook_processor'],
            dataCompromised: false
          }
        )
      ]);

      const detectionTime = performance.now() - detectionStartTime;

      // Validate threat detection
      expect(detectionTime).toBeLessThan(1000); // 1 second max for threat detection
      expect(threatAnalysis.severity).toBeOneOf(['high', 'critical']);
      expect(threatAnalysis.response.action).toBeOneOf(['block', 'challenge']);
      expect(threatAnalysis.indicators.length).toBeGreaterThan(0);

      // Validate security response
      const highSeverityThreats = securityValidation.filter(
        threat => threat.severity === 'high' || threat.severity === 'critical'
      );
      expect(highSeverityThreats.length).toBeGreaterThan(0);

      // Validate incident recording
      expect(incidentRecording.incidentId).toBeDefined();
      expect(incidentRecording.severity).toBe('high');

      console.log(`Malicious webhook detected: ${detectionTime.toFixed(2)}ms - Threats: ${securityValidation.length}`);
    });

    test('should handle crisis mode override through complete pipeline', async () => {
      const crisisWebhook = {
        payload: JSON.stringify({
          type: 'crisis.emergency',
          data: {
            user_id: 'crisis_user_12345',
            assessment_score: 24, // Critical PHQ-9 score
            emergency: true,
            hotline_access: '988',
            timestamp: new Date().toISOString()
          }
        }),
        headers: {
          'user-agent': 'FullMind-Crisis-Client/1.0',
          'x-crisis-mode': 'true',
          'content-type': 'application/json'
        },
        sourceIP: '192.168.1.100'
      };

      const crisisStartTime = performance.now();

      // Process crisis request through security pipeline
      const [threatAnalysis, securityValidation, crisisSafety] = await Promise.all([
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          crisisWebhook.payload,
          crisisWebhook.headers,
          crisisWebhook.sourceIP,
          'crisis_user_12345',
          true // crisis mode
        ),

        comprehensiveSecurityValidator.detectAndRespondToThreats(
          crisisWebhook.payload,
          crisisWebhook.headers,
          crisisWebhook.sourceIP,
          true // crisis mode
        ),

        comprehensiveSecurityValidator.validateCrisisSafety()
      ]);

      const crisisTime = performance.now() - crisisStartTime;

      // Validate crisis handling
      expect(crisisTime).toBeLessThan(200); // 200ms max for crisis processing
      expect(threatAnalysis.response.crisisOverride).toBe(true);
      expect(threatAnalysis.response.action).toBeOneOf(['crisis_allow', 'allow']);
      expect(threatAnalysis.crisisImpact.severity).toBeOneOf(['high', 'critical']);

      // No threats should block crisis requests
      const blockingThreats = securityValidation.filter(threat => threat.mitigationActive);
      expect(blockingThreats.length).toBe(0);

      // Crisis safety validation
      expect(crisisSafety.emergencyAccessGuaranteed).toBe(true);
      expect(crisisSafety.hotlineAccessProtected).toBe(true);
      expect(crisisSafety.therapeuticContinuityMaintained).toBe(true);

      console.log(`Crisis mode pipeline: ${crisisTime.toFixed(2)}ms - Override: ${threatAnalysis.response.crisisOverride}`);
    });
  });

  describe('2. Multi-Layer Security Coordination', () => {
    test('should coordinate threat intelligence across all security layers', async () => {
      const testThreat = {
        payload: JSON.stringify({
          type: 'suspicious.activity',
          data: { user_id: 'test_user', suspicious_pattern: true }
        }),
        headers: {
          'user-agent': 'suspicious-bot',
          'x-forwarded-for': '192.168.1.200'
        },
        sourceIP: '192.168.1.200'
      };

      // Layer 1: Initial threat detection
      const threatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        testThreat.payload,
        testThreat.headers,
        testThreat.sourceIP,
        'test_user',
        false
      );

      // Layer 2: Comprehensive validation
      const securityValidation = await comprehensiveSecurityValidator.detectAndRespondToThreats(
        testThreat.payload,
        testThreat.headers,
        testThreat.sourceIP,
        false
      );

      // Layer 3: Audit and reporting
      const auditResult = await comprehensiveSecurityValidator.performSecurityAudit();

      // Validate coordination
      expect(threatAnalysis.eventId).toBeDefined();
      expect(securityValidation.length).toBeGreaterThanOrEqual(0);
      expect(auditResult.threatDetectionResults.length).toBeGreaterThan(0);

      // Threat intelligence should be consistent across layers
      if (threatAnalysis.indicators.length > 0) {
        expect(securityValidation.length).toBeGreaterThan(0);
      }

      console.log(`Multi-layer coordination: Threat ${threatAnalysis.eventId}, Security checks: ${securityValidation.length}`);
    });

    test('should maintain security coordination during high load', async () => {
      const concurrentRequests = Array.from({ length: 20 }, (_, i) => ({
        payload: JSON.stringify({
          type: 'load.test',
          data: { request_id: i, timestamp: new Date().toISOString() }
        }),
        headers: {
          'user-agent': `LoadTest-Client-${i}`,
          'content-type': 'application/json'
        },
        sourceIP: `192.168.1.${100 + i}`
      }));

      const loadStartTime = performance.now();

      // Process concurrent requests through security layers
      const results = await Promise.all(
        concurrentRequests.map(async (request, index) => {
          const [threat, security] = await Promise.all([
            advancedThreatDetectionSystem.analyzeAdvancedThreat(
              request.payload,
              request.headers,
              request.sourceIP,
              `load_user_${index}`,
              false
            ),
            comprehensiveSecurityValidator.detectAndRespondToThreats(
              request.payload,
              request.headers,
              request.sourceIP,
              false
            )
          ]);
          return { threat, security };
        })
      );

      const loadTime = performance.now() - loadStartTime;

      // Validate high load performance
      expect(loadTime).toBeLessThan(10000); // 10 seconds for 20 concurrent requests
      expect(results.length).toBe(20);

      // All requests should be processed
      results.forEach((result, index) => {
        expect(result.threat.eventId).toBeDefined();
        expect(result.threat.response.action).toBeDefined();
      });

      const averageTime = loadTime / results.length;
      console.log(`High load coordination: ${loadTime.toFixed(2)}ms total, ${averageTime.toFixed(2)}ms average`);
    });

    test('should maintain security integrity during system stress', async () => {
      const stressStartTime = performance.now();

      // Create system stress with multiple security operations
      const stressOperations = await Promise.all([
        // Continuous threat detection
        ...Array.from({ length: 10 }, (_, i) =>
          advancedThreatDetectionSystem.analyzeAdvancedThreat(
            JSON.stringify({ stress: `test_${i}` }),
            { 'user-agent': `stress-client-${i}` },
            `127.0.0.${i}`,
            `stress_user_${i}`,
            false
          )
        ),

        // Security auditing
        comprehensiveSecurityValidator.performSecurityAudit(),

        // Compliance reporting
        securityAuditReportingSystem.generateComplianceDashboard(),

        // Crisis safety validation
        comprehensiveSecurityValidator.validateCrisisSafety()
      ]);

      const stressTime = performance.now() - stressStartTime;

      // Validate system maintains integrity under stress
      expect(stressTime).toBeLessThan(15000); // 15 seconds max
      expect(stressOperations.length).toBe(14); // 10 threats + 3 system operations + 1 crisis

      // Security audit should show good health
      const auditResult = stressOperations[10]; // Security audit result
      expect(auditResult.systemSecurityScore).toBeGreaterThanOrEqual(90);

      // Crisis safety should remain operational
      const crisisSafety = stressOperations[13]; // Crisis safety result
      expect(crisisSafety.emergencyAccessGuaranteed).toBe(true);

      console.log(`System stress test: ${stressTime.toFixed(2)}ms - Security score: ${auditResult.systemSecurityScore}/100`);
    });
  });

  describe('3. Real-Time Security Monitoring Integration', () => {
    test('should provide real-time threat metrics across all security layers', async () => {
      // Generate security activity
      await Promise.all([
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify({ activity: 'metrics_test_1' }),
          { 'user-agent': 'metrics-client' },
          '127.0.0.1',
          'metrics_user',
          false
        ),
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify({ activity: 'metrics_test_2' }),
          { 'user-agent': 'metrics-client' },
          '127.0.0.1',
          'metrics_user',
          false
        )
      ]);

      // Collect real-time metrics
      const [threatMetrics, monitoringStatus, complianceDashboard] = await Promise.all([
        advancedThreatDetectionSystem.getThreatDetectionMetrics(),
        comprehensiveSecurityValidator.getSecurityMonitoringStatus(),
        securityAuditReportingSystem.generateComplianceDashboard()
      ]);

      // Validate metrics consistency
      expect(threatMetrics.totalThreatsDetected).toBeGreaterThanOrEqual(2);
      expect(threatMetrics.accuracyScore).toBeGreaterThanOrEqual(95);
      expect(monitoringStatus.systemHealth).toBeGreaterThanOrEqual(95);
      expect(complianceDashboard.overallScore).toBeGreaterThanOrEqual(95);

      console.log(`Real-time metrics: Threats ${threatMetrics.totalThreatsDetected}, Health ${monitoringStatus.systemHealth}%, Compliance ${complianceDashboard.overallScore}%`);
    });

    test('should maintain monitoring performance during security events', async () => {
      const monitoringStartTime = performance.now();

      // Create security events
      const securityEvents = await Promise.all([
        securityAuditReportingSystem.recordSecurityIncident(
          'security_breach',
          'medium',
          'Monitoring test incident 1',
          { usersAffected: 0 }
        ),
        securityAuditReportingSystem.recordSecurityIncident(
          'system_failure',
          'low',
          'Monitoring test incident 2',
          { serviceDowntime: 0 }
        )
      ]);

      // Check monitoring responsiveness
      const monitoringStatus = await comprehensiveSecurityValidator.getSecurityMonitoringStatus();

      const monitoringTime = performance.now() - monitoringStartTime;

      // Validate monitoring performance
      expect(monitoringTime).toBeLessThan(1000); // 1 second max
      expect(securityEvents.length).toBe(2);
      expect(monitoringStatus.securityEvents.length).toBeGreaterThanOrEqual(2);

      // System health should reflect events but remain operational
      expect(monitoringStatus.systemHealth).toBeGreaterThanOrEqual(90);

      console.log(`Security monitoring: ${monitoringTime.toFixed(2)}ms, Events: ${securityEvents.length}`);
    });

    test('should coordinate automated security responses', async () => {
      const responseStartTime = performance.now();

      // Trigger automated response scenario
      const highThreatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        JSON.stringify({
          malicious: true,
          sql_injection: "'; DROP TABLE users; --",
          xss: '<script>document.location="http://evil.com"</script>'
        }),
        {
          'user-agent': 'Evil-Bot/1.0',
          'x-forwarded-for': '10.0.0.1'
        },
        '10.0.0.1',
        'potential_attacker',
        false
      );

      // Verify automated response
      const securityValidation = await comprehensiveSecurityValidator.detectAndRespondToThreats(
        JSON.stringify({ followup: 'automated_response_test' }),
        { 'user-agent': 'response-test' },
        '10.0.0.1',
        false
      );

      const responseTime = performance.now() - responseStartTime;

      // Validate automated response
      expect(responseTime).toBeLessThan(2000); // 2 seconds max
      expect(highThreatAnalysis.severity).toBeOneOf(['high', 'critical']);
      expect(highThreatAnalysis.response.action).toBeOneOf(['block', 'challenge']);

      // Subsequent requests from same IP should be affected
      const subsequentThreats = securityValidation.filter(threat =>
        threat.sourceAnalysis.ipAddresses.includes('10.0.0.1')
      );

      console.log(`Automated response: ${responseTime.toFixed(2)}ms - Action: ${highThreatAnalysis.response.action}`);
    });
  });

  describe('4. Compliance Integration Validation', () => {
    test('should maintain compliance throughout security operations', async () => {
      const complianceStartTime = performance.now();

      // Perform comprehensive security operations
      const [securityAudit, hipaaReport, complianceDashboard] = await Promise.all([
        comprehensiveSecurityValidator.performSecurityAudit(),
        securityAuditReportingSystem.generateHIPAAComplianceReport(),
        securityAuditReportingSystem.generateComplianceDashboard()
      ]);

      const complianceTime = performance.now() - complianceStartTime;

      // Validate compliance maintenance
      expect(complianceTime).toBeLessThan(30000); // 30 seconds max
      expect(securityAudit.complianceStatus.overhallCompliance).toBeGreaterThanOrEqual(98);
      expect(hipaaReport.overallCompliance).toBeGreaterThanOrEqual(98);
      expect(complianceDashboard.hipaaScore).toBeGreaterThanOrEqual(98);
      expect(complianceDashboard.pciScore).toBeGreaterThanOrEqual(98);

      // Critical compliance gaps should be zero
      const criticalGaps = hipaaReport.gaps.filter(gap => gap.impact === 'critical');
      expect(criticalGaps.length).toBe(0);

      console.log(`Compliance integration: ${complianceTime.toFixed(2)}ms - HIPAA ${hipaaReport.overallCompliance}%`);
    });

    test('should generate audit trails for all security activities', async () => {
      // Perform trackable security activities
      const activities = await Promise.all([
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify({ audit: 'trail_test_1' }),
          { 'user-agent': 'audit-client' },
          '127.0.0.1',
          'audit_user',
          false
        ),
        comprehensiveSecurityValidator.detectAndRespondToThreats(
          JSON.stringify({ audit: 'trail_test_2' }),
          { 'user-agent': 'audit-client' },
          '127.0.0.1',
          false
        ),
        securityAuditReportingSystem.recordSecurityIncident(
          'security_breach',
          'low',
          'Audit trail test incident',
          { usersAffected: 0 }
        )
      ]);

      // Verify audit trail creation
      const monitoringStatus = await comprehensiveSecurityValidator.getSecurityMonitoringStatus();
      const auditReport = await securityAuditReportingSystem.generateSecurityAuditReport('manual');

      // Validate audit trails
      expect(activities.length).toBe(3);
      expect(monitoringStatus.securityEvents.length).toBeGreaterThan(0);
      expect(auditReport.complianceAssessment.overallCompliance.auditReadiness).toBeDefined();

      // Audit trail completeness
      const auditResult = await comprehensiveSecurityValidator.performSecurityAudit();
      expect(auditResult.complianceStatus.auditTrailCompleteness).toBeGreaterThanOrEqual(85);

      console.log(`Audit trails: ${monitoringStatus.securityEvents.length} events, ${auditResult.complianceStatus.auditTrailCompleteness}% complete`);
    });

    test('should validate compliance reporting automation', async () => {
      const reportingStartTime = performance.now();

      // Generate automated compliance reports
      const [auditReport, crisisSafetyAudit, complianceReports] = await Promise.all([
        securityAuditReportingSystem.generateSecurityAuditReport('scheduled'),
        securityAuditReportingSystem.generateCrisisSafetyAudit(),
        Promise.all([
          securityAuditReportingSystem.getAuditReports(5),
          securityAuditReportingSystem.getSecurityIncidents(5)
        ])
      ]);

      const reportingTime = performance.now() - reportingStartTime;

      // Validate reporting automation
      expect(reportingTime).toBeLessThan(60000); // 60 seconds max
      expect(auditReport.reportId).toBeDefined();
      expect(auditReport.reportType).toBe('scheduled');
      expect(crisisSafetyAudit.emergencyAccessValidation).toBeDefined();

      // Reports should be retrievable
      expect(complianceReports[0].length).toBeGreaterThanOrEqual(1);
      expect(complianceReports[1].length).toBeGreaterThanOrEqual(0);

      console.log(`Compliance reporting: ${reportingTime.toFixed(2)}ms - Report: ${auditReport.reportId}`);
    });
  });

  describe('5. End-to-End System Validation', () => {
    test('should validate complete security system meets all requirements', async () => {
      const systemValidationStartTime = performance.now();

      // Comprehensive system validation
      const [
        securityAudit,
        threatMetrics,
        complianceDashboard,
        crisisSafety,
        monitoringStatus
      ] = await Promise.all([
        comprehensiveSecurityValidator.performSecurityAudit(),
        advancedThreatDetectionSystem.getThreatDetectionMetrics(),
        securityAuditReportingSystem.generateComplianceDashboard(),
        comprehensiveSecurityValidator.validateCrisisSafety(),
        comprehensiveSecurityValidator.getSecurityMonitoringStatus()
      ]);

      const validationTime = performance.now() - systemValidationStartTime;

      // Validate system requirements
      expect(validationTime).toBeLessThan(30000); // 30 seconds max

      // Security score requirement: ≥96/100
      expect(securityAudit.systemSecurityScore).toBeGreaterThanOrEqual(96);

      // Crisis safety requirement: 100% guarantee, <200ms
      expect(crisisSafety.emergencyAccessGuaranteed).toBe(true);
      expect(crisisSafety.crisisResponseTime).toBeLessThan(200);

      // HIPAA compliance requirement: ≥98.5%
      expect(complianceDashboard.hipaaScore).toBeGreaterThanOrEqual(98.5);

      // PCI compliance requirement: ≥98%
      expect(complianceDashboard.pciScore).toBeGreaterThanOrEqual(98);

      // Threat detection accuracy: ≥95.8%
      expect(threatMetrics.accuracyScore).toBeGreaterThanOrEqual(95.8);

      // System health requirement: ≥95%
      expect(monitoringStatus.systemHealth).toBeGreaterThanOrEqual(95);

      console.log(`System validation: Security ${securityAudit.systemSecurityScore}/100, Crisis ${crisisSafety.crisisResponseTime}ms, HIPAA ${complianceDashboard.hipaaScore}%`);
    });

    test('should validate security system scalability and reliability', async () => {
      const scalabilityStartTime = performance.now();

      // Test system scalability
      const scalabilityTests = [];

      // Burst load test
      for (let batch = 0; batch < 5; batch++) {
        const batchPromises = Array.from({ length: 10 }, (_, i) =>
          advancedThreatDetectionSystem.analyzeAdvancedThreat(
            JSON.stringify({ scalability: `batch_${batch}_request_${i}` }),
            { 'user-agent': `scalability-client-${batch}-${i}` },
            `192.168.${batch}.${i}`,
            `scalability_user_${batch}_${i}`,
            false
          )
        );
        scalabilityTests.push(Promise.all(batchPromises));
      }

      const scalabilityResults = await Promise.all(scalabilityTests);
      const scalabilityTime = performance.now() - scalabilityStartTime;

      // Validate scalability
      expect(scalabilityTime).toBeLessThan(20000); // 20 seconds for 50 requests
      expect(scalabilityResults.length).toBe(5);
      expect(scalabilityResults.flat().length).toBe(50);

      // All requests should be processed successfully
      scalabilityResults.flat().forEach(result => {
        expect(result.eventId).toBeDefined();
        expect(result.response.action).toBeDefined();
      });

      // System should maintain health under load
      const healthCheck = await comprehensiveSecurityValidator.getSecurityMonitoringStatus();
      expect(healthCheck.systemHealth).toBeGreaterThanOrEqual(90);

      console.log(`Scalability test: ${scalabilityTime.toFixed(2)}ms for 50 requests, Health: ${healthCheck.systemHealth}%`);
    });

    test('should validate security system recovery and resilience', async () => {
      // Simulate system stress and recovery
      const stressStartTime = performance.now();

      // Create system stress
      await comprehensiveSecurityValidator.emergencySecurityLockdown('Resilience test stress');

      // Test system recovery
      const recoveryOperations = await Promise.all([
        comprehensiveSecurityValidator.validateCrisisSafety(),
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify({ recovery: 'test_request' }),
          { 'user-agent': 'recovery-client' },
          '127.0.0.1',
          'recovery_user',
          false
        ),
        securityAuditReportingSystem.generateComplianceDashboard()
      ]);

      const recoveryTime = performance.now() - stressStartTime;

      // Validate system resilience
      expect(recoveryTime).toBeLessThan(5000); // 5 seconds max for recovery
      expect(recoveryOperations.length).toBe(3);

      // Crisis safety should remain operational
      const crisisSafety = recoveryOperations[0];
      expect(crisisSafety.emergencyAccessGuaranteed).toBe(true);

      // Threat detection should continue functioning
      const threatAnalysis = recoveryOperations[1];
      expect(threatAnalysis.eventId).toBeDefined();

      // Compliance should be maintained
      const compliance = recoveryOperations[2];
      expect(compliance.overallScore).toBeGreaterThanOrEqual(95);

      console.log(`System resilience: ${recoveryTime.toFixed(2)}ms recovery, Crisis safety: ${crisisSafety.emergencyAccessGuaranteed}`);
    });
  });
});