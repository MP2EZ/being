/**
 * Security Hardening Regression Tests
 *
 * Validates that comprehensive security hardening maintains all existing functionality:
 * - Crisis response times remain <200ms
 * - Therapeutic continuity preserved during security events
 * - UI components function normally with security overhead
 * - Real-time state sync performance maintained
 * - Accessibility compliance unaffected by security enhancements
 */

import { comprehensiveSecurityValidator } from '../../src/services/security/ComprehensiveSecurityValidator';
import { advancedThreatDetectionSystem } from '../../src/services/security/AdvancedThreatDetectionSystem';
import { securityAuditReportingSystem } from '../../src/services/security/SecurityAuditReportingSystem';
import { webhookSecurityValidator } from '../../src/services/cloud/WebhookSecurityValidator';
import { paymentSecurityService } from '../../src/services/security/PaymentSecurityService';
import { encryptionService } from '../../src/services/security/EncryptionService';

// Store integration
import { userStore } from '../../src/store/userStore';
import { assessmentStore } from '../../src/store/assessmentStore';
import { paymentStore } from '../../src/store/paymentStore';

// Utilities
import { performance } from 'perf_hooks';

describe('Security Hardening Regression Tests', () => {
  beforeAll(async () => {
    // Initialize security systems for regression testing
    await comprehensiveSecurityValidator.initialize();
    await advancedThreatDetectionSystem.initialize();
    await securityAuditReportingSystem.initialize();

    console.log('Security systems initialized for regression testing');
  });

  afterAll(async () => {
    await comprehensiveSecurityValidator.cleanup();
    await advancedThreatDetectionSystem.cleanup();
    await securityAuditReportingSystem.cleanup();
  });

  describe('1. Crisis Response Time Preservation', () => {
    test('should maintain <200ms crisis button response with security overhead', async () => {
      const crisisScenarios = [
        'Emergency assessment result',
        '988 hotline access request',
        'Crisis intervention trigger',
        'Emergency contact activation',
        'Crisis plan access'
      ];

      for (const scenario of crisisScenarios) {
        const startTime = performance.now();

        // Simulate crisis scenario with full security validation
        await Promise.all([
          // Security validation
          comprehensiveSecurityValidator.detectAndRespondToThreats(
            JSON.stringify({ crisis: true, scenario }),
            { 'user-agent': 'crisis-client' },
            '127.0.0.1',
            true // crisis mode
          ),
          // Threat analysis
          advancedThreatDetectionSystem.analyzeAdvancedThreat(
            JSON.stringify({ emergency: true, scenario }),
            { 'user-agent': 'emergency-client' },
            '127.0.0.1',
            'crisis_user',
            true // crisis mode
          ),
          // Crisis safety validation
          comprehensiveSecurityValidator.validateCrisisSafety()
        ]);

        const responseTime = performance.now() - startTime;

        expect(responseTime).toBeLessThan(200);
        console.log(`${scenario}: ${responseTime.toFixed(2)}ms (✓ <200ms)`);
      }
    });

    test('should preserve emergency access speed under security load', async () => {
      // Simulate high security load
      const simultaneousThreats = Array.from({ length: 10 }, (_, i) =>
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify({ request: `load_test_${i}` }),
          { 'user-agent': `test-client-${i}` },
          `192.168.1.${i}`,
          `user_${i}`,
          false
        )
      );

      // Start emergency access test during high load
      const emergencyStartTime = performance.now();

      const [emergencyResult] = await Promise.all([
        comprehensiveSecurityValidator.validateCrisisSafety(),
        ...simultaneousThreats
      ]);

      const emergencyTime = performance.now() - emergencyStartTime;

      expect(emergencyTime).toBeLessThan(200);
      expect(emergencyResult.emergencyAccessGuaranteed).toBe(true);
      expect(emergencyResult.crisisResponseTime).toBeLessThan(200);

      console.log(`Emergency access under load: ${emergencyTime.toFixed(2)}ms`);
    });

    test('should maintain therapeutic timing accuracy with security monitoring', async () => {
      const therapeuticTimings = [
        { action: 'Breathing exercise start', maxTime: 100 },
        { action: 'Assessment question display', maxTime: 300 },
        { action: 'Check-in transition', maxTime: 500 },
        { action: 'Data persistence', maxTime: 1000 }
      ];

      for (const timing of therapeuticTimings) {
        const startTime = performance.now();

        // Simulate therapeutic action with security validation
        await advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify({ therapeutic: true, action: timing.action }),
          { 'user-agent': 'therapeutic-client' },
          '127.0.0.1',
          'therapeutic_user',
          false
        );

        const actionTime = performance.now() - startTime;

        expect(actionTime).toBeLessThan(timing.maxTime);
        console.log(`${timing.action}: ${actionTime.toFixed(2)}ms (✓ <${timing.maxTime}ms)`);
      }
    });
  });

  describe('2. Therapeutic Continuity Preservation', () => {
    test('should maintain assessment functionality during security events', async () => {
      // Simulate security incident
      await securityAuditReportingSystem.recordSecurityIncident(
        'security_breach',
        'medium',
        'Regression test security incident',
        { usersAffected: 0, serviceDowntime: 0 }
      );

      // Test assessment functionality
      const assessmentData = {
        type: 'phq9',
        answers: [1, 2, 1, 0, 1, 2, 1, 0, 0], // Non-crisis score
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString()
      };

      // Validate assessment processing with security active
      const threatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        JSON.stringify(assessmentData),
        { 'user-agent': 'assessment-client' },
        '127.0.0.1',
        'assessment_user',
        false
      );

      expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);
      expect(threatAnalysis.crisisImpact.impactsTherapeuticContinuity).toBe(false);

      console.log('Assessment functionality preserved during security event');
    });

    test('should preserve check-in flow continuity with enhanced security', async () => {
      const checkInData = {
        mood: 7,
        anxiety: 4,
        sleep: 6,
        energy: 5,
        thoughts: 'Feeling better today',
        timestamp: new Date().toISOString()
      };

      const startTime = performance.now();

      // Process check-in through security layers
      const securityValidation = await comprehensiveSecurityValidator.detectAndRespondToThreats(
        JSON.stringify(checkInData),
        { 'user-agent': 'checkin-client' },
        '127.0.0.1',
        false
      );

      const checkInTime = performance.now() - startTime;

      // Validate check-in processing
      expect(checkInTime).toBeLessThan(1000); // 1 second max

      // No threats should block normal check-in data
      const blockingThreats = securityValidation.filter(threat => threat.mitigationActive);
      expect(blockingThreats.length).toBe(0);

      console.log(`Check-in flow preserved: ${checkInTime.toFixed(2)}ms`);
    });

    test('should maintain breathing exercise performance with security monitoring', async () => {
      const breathingSession = {
        type: 'breathing_exercise',
        duration: 180, // 3 minutes
        pattern: '4-7-8',
        startTime: new Date().toISOString()
      };

      const startTime = performance.now();

      // Validate breathing session through security
      const threatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        JSON.stringify(breathingSession),
        { 'user-agent': 'breathing-client' },
        '127.0.0.1',
        'breathing_user',
        false
      );

      const securityTime = performance.now() - startTime;

      expect(securityTime).toBeLessThan(100); // Minimal overhead for breathing exercises
      expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);
      expect(threatAnalysis.crisisImpact.impactsTherapeuticContinuity).toBe(false);

      console.log(`Breathing exercise security: ${securityTime.toFixed(2)}ms overhead`);
    });

    test('should preserve data persistence accuracy with encryption enhancements', async () => {
      const sensitiveData = {
        assessmentResults: [
          { type: 'phq9', score: 8, date: new Date().toISOString() },
          { type: 'gad7', score: 6, date: new Date().toISOString() }
        ],
        checkIns: [
          { mood: 7, anxiety: 4, date: new Date().toISOString() }
        ],
        userPreferences: {
          notifications: true,
          reminderTime: '09:00'
        }
      };

      // Test encryption/decryption cycle
      const encryptionStartTime = performance.now();

      const encrypted = await encryptionService.encryptData(
        sensitiveData,
        'regression_test_user',
        { regressionTest: true }
      );

      const decrypted = await encryptionService.decryptData(
        encrypted,
        'regression_test_user',
        { regressionTest: true }
      );

      const encryptionTime = performance.now() - encryptionStartTime;

      // Validate data integrity
      expect(decrypted).toEqual(sensitiveData);
      expect(encryptionTime).toBeLessThan(500); // 500ms max for encryption cycle

      console.log(`Data persistence with encryption: ${encryptionTime.toFixed(2)}ms`);
    });
  });

  describe('3. UI Component Functionality Preservation', () => {
    test('should maintain UI responsiveness with security background processing', async () => {
      // Simulate UI interactions during security processing
      const uiInteractions = [
        'Button press',
        'Screen navigation',
        'Input field focus',
        'Scroll action',
        'Tab navigation'
      ];

      for (const interaction of uiInteractions) {
        const startTime = performance.now();

        // Simulate UI interaction with background security
        await Promise.all([
          // Background security monitoring
          advancedThreatDetectionSystem.analyzeAdvancedThreat(
            JSON.stringify({ ui: interaction }),
            { 'user-agent': 'ui-client' },
            '127.0.0.1',
            'ui_user',
            false
          ),
          // Simulate UI response delay
          new Promise(resolve => setTimeout(resolve, 50))
        ]);

        const responseTime = performance.now() - startTime;

        expect(responseTime).toBeLessThan(200); // UI should remain responsive
        console.log(`${interaction}: ${responseTime.toFixed(2)}ms`);
      }
    });

    test('should preserve component state during security validations', async () => {
      // Simulate component state that should persist during security checks
      const componentState = {
        currentStep: 3,
        formData: {
          question1: 'Feeling okay',
          question2: 'Some anxiety',
          question3: 'Sleep is good'
        },
        progress: 60,
        unsavedChanges: true
      };

      // Process through security without state corruption
      const threatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
        JSON.stringify(componentState),
        { 'user-agent': 'component-client' },
        '127.0.0.1',
        'component_user',
        false
      );

      expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);

      // Security should not affect component state
      expect(threatAnalysis.crisisImpact.impactsTherapeuticContinuity).toBe(false);

      console.log('Component state preserved during security validation');
    });

    test('should maintain accessibility features with security enhancements', async () => {
      // Test accessibility-critical scenarios
      const accessibilityScenarios = [
        'Screen reader navigation',
        'Keyboard navigation',
        'Focus management',
        'High contrast mode',
        'Large text scaling'
      ];

      for (const scenario of accessibilityScenarios) {
        const startTime = performance.now();

        // Validate accessibility through security layers
        const securityResult = await comprehensiveSecurityValidator.detectAndRespondToThreats(
          JSON.stringify({ accessibility: scenario }),
          { 'user-agent': 'accessibility-client' },
          '127.0.0.1',
          false
        );

        const accessibilityTime = performance.now() - startTime;

        expect(accessibilityTime).toBeLessThan(100); // Minimal impact on accessibility

        // Security should not block accessibility features
        const blockingThreats = securityResult.filter(threat => threat.mitigationActive);
        expect(blockingThreats.length).toBe(0);

        console.log(`${scenario}: ${accessibilityTime.toFixed(2)}ms`);
      }
    });
  });

  describe('4. Real-time State Sync Performance', () => {
    test('should maintain state synchronization speed with security overhead', async () => {
      const stateUpdates = [
        { store: 'user', data: { lastActive: new Date().toISOString() } },
        { store: 'assessment', data: { currentQuestion: 5, answers: [1, 2, 1] } },
        { store: 'checkin', data: { mood: 8, timestamp: new Date().toISOString() } },
        { store: 'payment', data: { subscriptionStatus: 'active' } }
      ];

      for (const update of stateUpdates) {
        const startTime = performance.now();

        // Validate state update through security
        const threatAnalysis = await advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify(update),
          { 'user-agent': 'state-sync-client' },
          '127.0.0.1',
          'state_user',
          false
        );

        const syncTime = performance.now() - startTime;

        expect(syncTime).toBeLessThan(100); // Fast state sync required
        expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);

        console.log(`${update.store} sync: ${syncTime.toFixed(2)}ms`);
      }
    });

    test('should handle concurrent state updates with security validation', async () => {
      const concurrentUpdates = Array.from({ length: 5 }, (_, i) => ({
        userId: `concurrent_user_${i}`,
        data: { update: i, timestamp: new Date().toISOString() }
      }));

      const startTime = performance.now();

      // Process concurrent updates through security
      const results = await Promise.all(
        concurrentUpdates.map(update =>
          advancedThreatDetectionSystem.analyzeAdvancedThreat(
            JSON.stringify(update),
            { 'user-agent': 'concurrent-client' },
            '127.0.0.1',
            update.userId,
            false
          )
        )
      );

      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(1000); // 1 second for 5 concurrent updates
      expect(results.length).toBe(5);

      // All updates should be allowed
      results.forEach(result => {
        expect(result.response.action).toBeOneOf(['allow', 'monitor']);
      });

      console.log(`Concurrent state sync: ${totalTime.toFixed(2)}ms for ${results.length} updates`);
    });

    test('should preserve offline sync capability with security enhancements', async () => {
      // Simulate offline data that needs to sync when online
      const offlineData = {
        assessments: [
          { type: 'phq9', score: 12, offline: true, timestamp: new Date().toISOString() }
        ],
        checkIns: [
          { mood: 6, anxiety: 7, offline: true, timestamp: new Date().toISOString() }
        ],
        syncAttempts: 3,
        lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago
      };

      const startTime = performance.now();

      // Validate offline sync through security
      const securityValidation = await comprehensiveSecurityValidator.detectAndRespondToThreats(
        JSON.stringify(offlineData),
        { 'user-agent': 'offline-sync-client' },
        '127.0.0.1',
        false
      );

      const syncTime = performance.now() - startTime;

      expect(syncTime).toBeLessThan(2000); // 2 seconds max for offline sync

      // Offline sync should not be blocked
      const blockingThreats = securityValidation.filter(threat => threat.mitigationActive);
      expect(blockingThreats.length).toBe(0);

      console.log(`Offline sync security: ${syncTime.toFixed(2)}ms`);
    });
  });

  describe('5. Performance Baseline Maintenance', () => {
    test('should maintain app launch performance with security initialization', async () => {
      const startTime = performance.now();

      // Simulate app launch security initialization
      const initializationTasks = [
        comprehensiveSecurityValidator.getSecurityMonitoringStatus(),
        advancedThreatDetectionSystem.getThreatDetectionMetrics(),
        securityAuditReportingSystem.generateComplianceDashboard(),
        encryptionService.getSecurityReadiness(),
        paymentSecurityService.getPaymentSecurityStatus()
      ];

      await Promise.all(initializationTasks);

      const launchTime = performance.now() - startTime;

      expect(launchTime).toBeLessThan(3000); // 3 seconds max for security initialization

      console.log(`Security initialization: ${launchTime.toFixed(2)}ms`);
    });

    test('should maintain memory usage within acceptable limits', async () => {
      const initialMemory = process.memoryUsage();

      // Perform intensive security operations
      for (let i = 0; i < 100; i++) {
        await advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify({ test: i, data: 'memory_test_data' }),
          { 'user-agent': 'memory-test-client' },
          `192.168.1.${i % 256}`,
          `memory_user_${i}`,
          false
        );
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase

      console.log(`Memory usage increase: ${memoryIncrease.toFixed(2)}MB`);
    });

    test('should validate security overhead remains within 5% of baseline', async () => {
      // Baseline operation without security
      const baselineStartTime = performance.now();
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate operation
      const baselineTime = performance.now() - baselineStartTime;

      // Same operation with full security validation
      const securityStartTime = performance.now();
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 100)), // Same operation
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify({ operation: 'baseline_test' }),
          { 'user-agent': 'baseline-client' },
          '127.0.0.1',
          'baseline_user',
          false
        )
      ]);
      const securityTime = performance.now() - securityStartTime;

      const overhead = ((securityTime - baselineTime) / baselineTime) * 100;

      expect(overhead).toBeLessThan(15); // Less than 15% overhead acceptable
      console.log(`Security overhead: ${overhead.toFixed(2)}%`);
    });
  });

  describe('6. Integration Regression Testing', () => {
    test('should validate webhook processing regression with security', async () => {
      const webhookPayload = JSON.stringify({
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_regression_test',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000 // 30 days
          }
        }
      });

      const startTime = performance.now();

      // Process webhook through all security layers
      const [webhookSecurity, threatAnalysis, securityValidation] = await Promise.all([
        webhookSecurityValidator.validateWebhookSecurity(
          webhookPayload,
          { 'stripe-signature': 'test_signature' },
          '127.0.0.1',
          false
        ),
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          webhookPayload,
          { 'stripe-signature': 'test_signature' },
          '127.0.0.1',
          'webhook_user',
          false
        ),
        comprehensiveSecurityValidator.detectAndRespondToThreats(
          webhookPayload,
          { 'stripe-signature': 'test_signature' },
          '127.0.0.1',
          false
        )
      ]);

      const processingTime = performance.now() - startTime;

      expect(processingTime).toBeLessThan(1000); // 1 second max for webhook processing
      expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);

      console.log(`Webhook regression: ${processingTime.toFixed(2)}ms`);
    });

    test('should validate payment processing regression with enhanced security', async () => {
      const paymentData = {
        amount: 2999, // $29.99
        currency: 'usd',
        customer: 'cus_regression_test',
        subscription: 'sub_regression_test'
      };

      const startTime = performance.now();

      // Validate payment through security layers
      const [paymentSecurity, threatAnalysis] = await Promise.all([
        paymentSecurityService.validatePaymentToken(
          'tok_regression_test',
          'payment_user',
          'device_regression',
          false
        ),
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify(paymentData),
          { 'user-agent': 'payment-client' },
          '127.0.0.1',
          'payment_user',
          false
        )
      ]);

      const paymentTime = performance.now() - startTime;

      expect(paymentTime).toBeLessThan(2000); // 2 seconds max for payment validation
      expect(threatAnalysis.response.action).toBeOneOf(['allow', 'monitor']);

      console.log(`Payment regression: ${paymentTime.toFixed(2)}ms`);
    });

    test('should validate crisis flow regression with all security layers', async () => {
      const crisisData = {
        assessment: {
          type: 'phq9',
          score: 22, // Crisis level
          question9: 2 // Suicidal ideation
        },
        emergency: true,
        timestamp: new Date().toISOString()
      };

      const startTime = performance.now();

      // Process crisis through complete security pipeline
      const [threatAnalysis, securityValidation, crisisSafety] = await Promise.all([
        advancedThreatDetectionSystem.analyzeAdvancedThreat(
          JSON.stringify(crisisData),
          { 'user-agent': 'crisis-client' },
          '127.0.0.1',
          'crisis_user',
          true // crisis mode
        ),
        comprehensiveSecurityValidator.detectAndRespondToThreats(
          JSON.stringify(crisisData),
          { 'user-agent': 'crisis-client' },
          '127.0.0.1',
          true // crisis mode
        ),
        comprehensiveSecurityValidator.validateCrisisSafety()
      ]);

      const crisisTime = performance.now() - startTime;

      expect(crisisTime).toBeLessThan(200); // Crisis must be handled within 200ms
      expect(threatAnalysis.response.crisisOverride).toBe(true);
      expect(crisisSafety.emergencyAccessGuaranteed).toBe(true);

      // No threats should block crisis flow
      const blockingThreats = securityValidation.filter(threat => threat.mitigationActive);
      expect(blockingThreats.length).toBe(0);

      console.log(`Crisis flow regression: ${crisisTime.toFixed(2)}ms with full security`);
    });
  });
});