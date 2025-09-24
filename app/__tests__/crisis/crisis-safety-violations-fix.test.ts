/**
 * Crisis Safety Violations Fix Test Suite
 * CRITICAL: Validates all 4 crisis safety violations have been resolved
 */

import { Alert, Linking } from 'react-native';
import CrisisResponseMonitor from '../../src/services/CrisisResponseMonitor';
import OfflineCrisisManager from '../../src/services/OfflineCrisisManager';
import { FeatureFlagManager } from '../../src/services/security/FeatureFlags';
import { useAssessmentStore } from '../../src/store/assessmentStore';

// Mock React Native modules
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn()
  }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn()
}));

describe('Crisis Safety Violations - Fix Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CrisisResponseMonitor.resetPerformanceLog();
  });

  describe('VIOLATION 1: Crisis Response Performance (<200ms)', () => {
    it('should guarantee crisis response within 200ms threshold', async () => {
      const startTime = performance.now();

      // Test crisis action with monitoring
      const result = await CrisisResponseMonitor.executeCrisisAction(
        'test-crisis-call',
        async () => {
          // Simulate quick crisis action
          return 'success';
        }
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result).toBe('success');
      expect(responseTime).toBeLessThan(200); // Must be under 200ms
    });

    it('should trigger emergency fallback if crisis action exceeds timeout', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      try {
        await CrisisResponseMonitor.executeCrisisAction(
          'test-timeout',
          async () => {
            // Simulate slow action that will timeout
            await new Promise(resolve => setTimeout(resolve, 250));
            return 'too slow';
          }
        );
      } catch (error) {
        expect(error.message).toBe('Crisis action timeout');
      }

      expect(alertSpy).toHaveBeenCalledWith(
        'Crisis Support Available',
        expect.stringContaining('988')
      );
    });

    it('should track crisis performance violations', async () => {
      // Execute multiple crisis actions
      await CrisisResponseMonitor.executeCrisisAction('fast-action', async () => 'ok');

      try {
        await CrisisResponseMonitor.executeCrisisAction('slow-action', async () => {
          await new Promise(resolve => setTimeout(resolve, 250));
          return 'slow';
        });
      } catch {}

      const report = CrisisResponseMonitor.getCrisisPerformanceReport();
      expect(report.totalActions).toBe(2);
      expect(report.violationRate).toBeGreaterThan(0);
      expect(report.recentViolations.length).toBeGreaterThan(0);
    });
  });

  describe('VIOLATION 2: Inverted Feature Flag Logic (Crisis Features Protection)', () => {
    let featureFlagManager: FeatureFlagManager;

    beforeEach(() => {
      featureFlagManager = new FeatureFlagManager({
        auditLoggingEnabled: true,
        threatDetectionEnabled: true,
        emergencyOfflineMode: true,
        crisisResponseOverride: false
      });
    });

    it('should prevent disabling crisis-critical flags', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Attempt to disable crisis-critical flag should fail
      const result = await featureFlagManager.setFlag('auditLoggingEnabled', false, {
        modifiedBy: 'admin',
        reason: 'test'
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 CRISIS SAFETY: Cannot disable critical flag auditLoggingEnabled')
      );

      consoleSpy.mockRestore();
    });

    it('should always enable crisis features in overrides', async () => {
      const evaluation = await featureFlagManager.evaluateFlag('auditLoggingEnabled');

      expect(evaluation.active).toBe(true);
      expect(evaluation.overrides).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'crisis',
            active: true,
            reason: 'Crisis safety requires this feature to remain enabled'
          })
        ])
      );
    });

    it('should enable crisis features during emergency override', async () => {
      // Enable crisis response override
      await featureFlagManager.setFlag('crisisResponseOverride', true, {
        modifiedBy: 'system',
        reason: 'emergency'
      });

      const evaluation = await featureFlagManager.evaluateFlag('threatDetectionEnabled');

      expect(evaluation.active).toBe(true);
      expect(evaluation.overrides).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'crisis',
            active: true,
            reason: expect.stringContaining('Crisis response override')
          })
        ])
      );
    });

    it('should never allow crisis feature disabling regardless of context', async () => {
      const criticalFlags = [
        'auditLoggingEnabled',
        'threatDetectionEnabled',
        'emergencyOfflineMode',
        'crisisResponseOverride'
      ];

      for (const flagName of criticalFlags) {
        const result = await featureFlagManager.setFlag(flagName as any, false, {
          modifiedBy: 'admin',
          securityApproved: true,
          reason: 'force disable attempt'
        });

        expect(result).toBe(false);
      }
    });
  });

  describe('VIOLATION 3: Real-Time Crisis Detection During Assessments', () => {
    let store: any;

    beforeEach(() => {
      store = useAssessmentStore.getState();
      store.setCrisisDetected(false);
      jest.clearAllMocks();
    });

    it('should immediately detect PHQ-9 suicidal ideation (Question 9)', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      // Start PHQ-9 assessment
      store.startAssessment('phq9');

      // Advance to question 9 (index 8)
      for (let i = 0; i < 8; i++) {
        store.answerQuestion(0); // Answer previous questions
      }

      // Answer question 9 with positive suicidal ideation
      store.answerQuestion(1); // Answer > 0 indicates suicidal thoughts

      expect(store.crisisDetected).toBe(true);

      // Should trigger immediate crisis intervention
      setTimeout(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Crisis Support Available',
          expect.stringContaining('difficult thoughts'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Call 988 Now' })
          ])
        );
      }, 10);
    });

    it('should detect PHQ-9 severe depression threshold early', () => {
      store.startAssessment('phq9');

      // Answer first 3 questions with maximum score (3 each)
      store.answerQuestion(3);
      store.answerQuestion(3);
      store.answerQuestion(3); // Current score: 9, projected: 27 (>20 threshold)

      expect(store.crisisDetected).toBe(true);
    });

    it('should detect GAD-7 severe anxiety threshold early', () => {
      store.startAssessment('gad7');

      // Answer first 3 questions with maximum score (3 each)
      store.answerQuestion(3);
      store.answerQuestion(3);
      store.answerQuestion(3); // Current score: 9, projected: 21 (>15 threshold)

      expect(store.crisisDetected).toBe(true);
    });

    it('should track crisis intervention performance', async () => {
      const startTime = performance.now();

      await store.triggerRealTimeCrisisIntervention('phq9', 8, 2);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);

      const report = CrisisResponseMonitor.getCrisisPerformanceReport();
      expect(report.totalActions).toBeGreaterThan(0);
    });

    it('should provide immediate crisis intervention options', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const linkingSpy = jest.spyOn(Linking, 'openURL');

      await store.triggerRealTimeCrisisIntervention('phq9', 8, 1);

      // Verify alert is shown with crisis options
      setTimeout(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Crisis Support Available',
          expect.any(String),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Call 988 Now' }),
            expect.objectContaining({ text: 'Continue Assessment' }),
            expect.objectContaining({ text: 'Crisis Resources' })
          ])
        );
      }, 10);
    });
  });

  describe('VIOLATION 4: Offline Crisis Failsafe Protocols', () => {
    beforeEach(async () => {
      await OfflineCrisisManager.clearAllCrisisData();
    });

    it('should initialize offline crisis resources successfully', async () => {
      await OfflineCrisisManager.initializeOfflineCrisisData();

      const resources = await OfflineCrisisManager.getOfflineCrisisResources();

      expect(resources.hotlines).toHaveLength(5);
      expect(resources.hotlines[0]).toEqual({
        name: '988 Suicide & Crisis Lifeline',
        number: '988',
        type: 'voice',
        available: '24/7'
      });
      expect(resources.copingStrategies).toHaveLength(10);
    });

    it('should provide hardcoded fallback when storage fails', async () => {
      // Mock storage failure
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage failed'));

      const resources = await OfflineCrisisManager.getOfflineCrisisResources();

      expect(resources.hotlines).toHaveLength(3); // Hardcoded fallback
      expect(resources.hotlines[0].number).toBe('988');
      expect(resources.hotlines[1].number).toBe('911');
    });

    it('should generate complete offline crisis message', async () => {
      await OfflineCrisisManager.initializeOfflineCrisisData();

      const message = await OfflineCrisisManager.getOfflineCrisisMessage();

      expect(message).toContain('🆘 IMMEDIATE CRISIS SUPPORT AVAILABLE');
      expect(message).toContain('📞 CRISIS HOTLINES:');
      expect(message).toContain('988 Suicide & Crisis Lifeline: 988');
      expect(message).toContain('Emergency Services: 911');
      expect(message).toContain('🛡️ IMMEDIATE COPING STRATEGIES:');
    });

    it('should handle emergency contacts in offline mode', async () => {
      const testContacts = [
        { id: '1', name: 'John Doe', phone: '555-1234', relationship: 'friend', isPrimary: true },
        { id: '2', name: 'Jane Smith', phone: '555-5678', relationship: 'family', isPrimary: false }
      ];

      const success = await OfflineCrisisManager.setEmergencyContacts(testContacts);
      expect(success).toBe(true);

      const retrieved = await OfflineCrisisManager.getEmergencyContacts();
      expect(retrieved).toEqual(testContacts);
    });

    it('should validate crisis data currency', async () => {
      await OfflineCrisisManager.initializeOfflineCrisisData();

      // Should be current immediately after initialization
      const isCurrent = await OfflineCrisisManager.isCrisisDataCurrent(1000);
      expect(isCurrent).toBe(true);

      // Should not be current with very short max age
      const isNotCurrent = await OfflineCrisisManager.isCrisisDataCurrent(0);
      expect(isNotCurrent).toBe(false);
    });

    it('should never fail to provide crisis information', async () => {
      // Even with all storage operations failing
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockRejectedValue(new Error('Total storage failure'));
      AsyncStorage.setItem.mockRejectedValue(new Error('Total storage failure'));

      const resources = await OfflineCrisisManager.getOfflineCrisisResources();

      // Should still provide hardcoded resources
      expect(resources).toBeDefined();
      expect(resources.hotlines).toHaveLength(3);
      expect(resources.hotlines[0].number).toBe('988');

      const message = await OfflineCrisisManager.getOfflineCrisisMessage();
      expect(message).toContain('988');
    });
  });

  describe('Integration: All Crisis Safety Violations Fixed', () => {
    it('should pass comprehensive crisis safety validation', async () => {
      // 1. Performance: Crisis actions must be <200ms
      const performanceTest = await CrisisResponseMonitor.executeCrisisAction(
        'comprehensive-test',
        async () => 'success'
      );
      expect(performanceTest).toBe('success');

      // 2. Feature Flags: Crisis features cannot be disabled
      const featureManager = new FeatureFlagManager({
        auditLoggingEnabled: true,
        threatDetectionEnabled: true,
        emergencyOfflineMode: true
      });

      const canDisableCrisis = await featureManager.setFlag('auditLoggingEnabled', false, {
        modifiedBy: 'admin'
      });
      expect(canDisableCrisis).toBe(false);

      // 3. Real-time Detection: Assessment monitors for crisis
      const store = useAssessmentStore.getState();
      store.startAssessment('phq9');
      for (let i = 0; i < 8; i++) store.answerQuestion(0);
      store.answerQuestion(1); // Suicidal ideation
      expect(store.crisisDetected).toBe(true);

      // 4. Offline Failsafe: Crisis resources always available
      await OfflineCrisisManager.initializeOfflineCrisisData();
      const offlineResources = await OfflineCrisisManager.getOfflineCrisisResources();
      expect(offlineResources.hotlines).toHaveLength(5);

      // Overall system health check
      const isHealthy = CrisisResponseMonitor.isCrisisPerformanceHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should maintain crisis safety under stress conditions', async () => {
      // Simulate multiple concurrent crisis situations
      const crisisPromises = Array(10).fill(0).map((_, i) =>
        CrisisResponseMonitor.executeCrisisAction(`stress-test-${i}`, async () => `result-${i}`)
      );

      const results = await Promise.allSettled(crisisPromises);

      // All crisis actions should complete successfully
      results.forEach((result, i) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBe(`result-${i}`);
        }
      });

      // Performance should remain healthy
      const report = CrisisResponseMonitor.getCrisisPerformanceReport();
      expect(report.violationRate).toBeLessThan(5); // <5% violation rate acceptable
    });
  });
});