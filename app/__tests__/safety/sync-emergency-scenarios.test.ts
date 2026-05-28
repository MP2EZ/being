/**
 * SYNC EMERGENCY SCENARIO TESTING
 * Phase 5.3 - Crisis Safety and Emergency Protocol Validation
 *
 * STATUS (MAINT-166 PR 5 / MAINT-E):
 *   - SyncCoordinator API drift fixed: `new SyncCoordinator()` → singleton
 *     default import, `.shutdown()` → `.cleanup()`, `.performSync('crisis')`
 *     → `.triggerPriorityBackup('crisis')`, `.performSync('manual')` →
 *     `.performFullSync()`.
 *   - `EmergencySimulator.simulateAppTermination()` no longer throws inside
 *     a bare setTimeout (which used to kill the Jest worker). Now rejects
 *     the returned promise so the suite stays alive.
 *   - 2 of 15 tests pass locally. The other 13 assert that `Alert.alert`
 *     was called during sync operations — but Alert is fired by UI
 *     components (e.g. `CrisisAssessmentAlert`), not by SyncCoordinator's
 *     subscription callback. That's a layer mismatch in the original test
 *     design; fixing it requires moving the assertions into UI-level tests
 *     (or stubbing the UI dispatch from the sync side, which doesn't exist
 *     today). Out of scope for the API-drift PR.
 *   - File remains quarantined under jest.config.js's
 *     `testPathIgnorePatterns` for the INFRA-180 CI flake family until a
 *     proper test rewrite happens.
 *
 * EMERGENCY SCENARIO REQUIREMENTS:
 * - Crisis assessment sync during network failures
 * - Data preservation during app crashes during sync
 * - Emergency protocol activation during sync failures
 * - 988 hotline accessibility during sync operations
 * - Crisis data integrity during emergency scenarios
 * - Recovery from sync failures during crisis situations
 *
 * SAFETY-CRITICAL SCENARIOS:
 * - Crisis assessment completion during network outage
 * - App termination during crisis assessment sync
 * - Memory pressure during crisis data backup
 * - Storage failure during crisis assessment logging
 * - Service unavailability during emergency backup
 * - Concurrent crisis assessments during system stress
 *
 * EMERGENCY PROTOCOL VALIDATION:
 * - 988 accessibility independent of sync state
 * - Crisis intervention workflow preservation
 * - Emergency contact synchronization priority
 * - Offline crisis data persistence
 * - Emergency recovery from corrupted sync state
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert, Linking } from 'react-native';

import SyncCoordinator from '@/core/services/supabase/SyncCoordinator';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { EncryptionService } from '@/core/services/security/EncryptionService';
import { resetEncryptionMocks } from '../helpers/mockEncryption';

// Mock React Native components
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    openURL: jest.fn().mockResolvedValue(true)
  }
}));

// Encryption-stack mocks — SyncCoordinator transitively depends on
// EncryptionService → SecureStorageService. Without these, master-key
// initialization throws.
jest.mock('react-native-aes-crypto', () => {
  const { createAesCryptoMock } = require('../helpers/mockEncryption');
  return createAesCryptoMock();
});
jest.mock('expo-secure-store', () => {
  const { createExpoSecureStoreMock } = require('../helpers/mockEncryption');
  return createExpoSecureStoreMock();
});

// Auto-mock the assessment store so (useAssessmentStore as any).mockImplementation
// in beforeEach works. Without this, useAssessmentStore is the real module and
// has no .mockImplementation method.
jest.mock('@/features/assessment/stores/assessmentStore');

// Emergency scenario simulation utilities
class EmergencySimulator {
  static simulateNetworkFailure(): void {
    const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
    mockNetInfo.fetch.mockRejectedValue(new Error('Network unreachable'));
  }

  static simulateStorageFailure(): void {
    const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage quota exceeded'));
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage read failure'));
  }

  static simulateMemoryPressure(): void {
    // Simulate low memory conditions
    const originalMemoryUsage = process.memoryUsage;
    (process as any).memoryUsage = jest.fn(() => ({
      heapUsed: 512 * 1024 * 1024, // 512MB heap used
      heapTotal: 600 * 1024 * 1024, // 600MB total heap
      external: 50 * 1024 * 1024,
      rss: 650 * 1024 * 1024
    }));
  }

  static simulateAppTermination(): Promise<void> {
    // NOTE: previously threw inside a bare setTimeout, which escapes Jest
    // and kills the worker. Reworded to reject the returned promise — the
    // test can catch it like any other async failure, and the runner stays
    // alive for the remaining tests.
    return new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error('App terminated')), 50);
    });
  }

  static restoreNormalConditions(): void {
    jest.clearAllMocks();

    // Restore network
    const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true
    } as any);

    // Restore storage
    const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  }
}

// Crisis assessment fixtures
const EMERGENCY_PHQ9_ASSESSMENT = {
  id: 'emergency_phq9',
  type: 'phq9' as const,
  result: {
    totalScore: 26,
    severity: 'severe' as const,
    isCrisis: true,
    suicidalIdeation: true,
    completedAt: Date.now(),
    answers: [
      { questionId: 'phq9_1', response: 3, timestamp: Date.now() },
      { questionId: 'phq9_2', response: 3, timestamp: Date.now() },
      { questionId: 'phq9_3', response: 3, timestamp: Date.now() },
      { questionId: 'phq9_4', response: 3, timestamp: Date.now() },
      { questionId: 'phq9_5', response: 3, timestamp: Date.now() },
      { questionId: 'phq9_6', response: 3, timestamp: Date.now() },
      { questionId: 'phq9_7', response: 3, timestamp: Date.now() },
      { questionId: 'phq9_8', response: 3, timestamp: Date.now() },
      { questionId: 'phq9_9', response: 2, timestamp: Date.now() } // Suicidal ideation
    ]
  },
  progress: {
    type: 'phq9' as const,
    currentQuestionIndex: 9,
    totalQuestions: 9,
    startedAt: Date.now() - 300000,
    answers: [],
    isComplete: true
  }
};

const EMERGENCY_GAD7_ASSESSMENT = {
  id: 'emergency_gad7',
  type: 'gad7' as const,
  result: {
    totalScore: 19,
    severity: 'severe' as const,
    isCrisis: true,
    completedAt: Date.now(),
    answers: []
  },
  progress: {
    type: 'gad7' as const,
    currentQuestionIndex: 7,
    totalQuestions: 7,
    startedAt: Date.now() - 180000,
    answers: [],
    isComplete: true
  }
};

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('expo-crypto', () => {
  const { createExpoCryptoMock } = require('../helpers/mockEncryption');
  return createExpoCryptoMock();
});

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const mockLinking = Linking.openURL as jest.MockedFunction<typeof Linking.openURL>;

describe('🚨 SYNC EMERGENCY SCENARIO TESTING', () => {
  // SyncCoordinator is a singleton (default export is the instance). Using
  // `typeof SyncCoordinator` to type the local alias for the imported instance.
  let syncCoordinator: typeof SyncCoordinator;
  let mockAssessmentStore: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    resetEncryptionMocks();
    // NOTE: `await EncryptionService.getInstance().destroy()` is intentionally
    // omitted. It hangs under `--coverage --ci` on Ubuntu (same INFRA-180
    // family seen in PR 4 comprehensive-assessment). `resetEncryptionMocks()`
    // alone is sufficient because the mock backing is a fresh Map each call.

    // Initialize with normal conditions
    EmergencySimulator.restoreNormalConditions();

    // Initialize mock assessment store
    mockAssessmentStore = {
      currentResult: null,
      completedAssessments: [],
      currentSession: null,
      answers: [],
      crisisDetection: null,
      crisisIntervention: null,
      getState: jest.fn(() => mockAssessmentStore),
      setState: jest.fn(),
      subscribe: jest.fn()
    };

    (useAssessmentStore as any).mockImplementation(() => mockAssessmentStore);
    (useAssessmentStore as any).getState = jest.fn(() => mockAssessmentStore);
    (useAssessmentStore as any).subscribe = jest.fn();

    syncCoordinator = SyncCoordinator;
    await syncCoordinator.initialize();
  });

  afterEach(async () => {
    if (syncCoordinator) {
      try {
        await syncCoordinator.cleanup();
      } catch (error) {
        // Ignore cleanup errors in emergency scenarios
      }
    }
    EmergencySimulator.restoreNormalConditions();
  });

  describe('🌐 NETWORK FAILURE EMERGENCY SCENARIOS', () => {
    it('should preserve crisis assessment data during network failure', async () => {
      // Set up crisis assessment
      mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;

      // Simulate network failure during sync
      EmergencySimulator.simulateNetworkFailure();

      // Trigger crisis assessment sync
      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      let syncResult: any = null;

      try {
        if (mockSubscribeCallback) {
          await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
        }
        syncResult = await syncCoordinator.triggerPriorityBackup('crisis');
      } catch (error) {
        // Expected to fail due to network
      }

      // Verify crisis data was still logged locally
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/crisis_assessment_sync_/),
        expect.stringContaining('"type":"phq9_suicidal"')
      );

      // Verify emergency protocols were triggered
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Crisis Support'),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: expect.stringContaining('988') }),
          expect.objectContaining({ text: expect.stringContaining('741741') }),
          expect.objectContaining({ text: expect.stringContaining('911') })
        ]),
        expect.objectContaining({ cancelable: false })
      );
    });

    it('should enable 988 access despite network connectivity issues', async () => {
      EmergencySimulator.simulateNetworkFailure();

      // Simulate crisis detection
      mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;
      mockAssessmentStore.crisisDetection = {
        isTriggered: true,
        triggerType: 'phq9_suicidal',
        triggerValue: 2,
        timestamp: Date.now(),
        assessmentId: 'emergency_test'
      };

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      // Verify 988 access is available
      expect(mockAlert).toHaveBeenCalled();

      // Simulate user tapping 988 option
      const alertCall = mockAlert.mock.calls[0];
      const nineEightEightOption = alertCall?.[2]?.find((option: any) =>
        option.text.includes('988')
      );

      if (nineEightEightOption?.onPress) {
        nineEightEightOption.onPress();
      }

      expect(mockLinking).toHaveBeenCalledWith('tel:988');
    });

    it('should queue crisis data for sync when network recovers', async () => {
      // Start with network failure
      EmergencySimulator.simulateNetworkFailure();

      mockAssessmentStore.currentResult = EMERGENCY_GAD7_ASSESSMENT.result;

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        try {
          await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
        } catch (error) {
          // Expected during network failure
        }
      }

      // Restore network
      EmergencySimulator.restoreNormalConditions();

      // Attempt sync recovery
      const result = await syncCoordinator.performFullSync();

      expect(result.success).toBe(true);
      // Verify queued crisis data is processed
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('💾 STORAGE FAILURE EMERGENCY SCENARIOS', () => {
    it('should handle storage failure during crisis assessment logging', async () => {
      mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;

      // Simulate storage failure
      EmergencySimulator.simulateStorageFailure();

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];

      // Crisis detection should still trigger emergency protocols
      if (mockSubscribeCallback) {
        try {
          await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
        } catch (error) {
          // Storage failure expected
        }
      }

      // Verify emergency intervention still triggered despite storage failure
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Crisis Support'),
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ cancelable: false })
      );
    });

    it('should provide fallback emergency access when storage corrupted', async () => {
      // Simulate corrupted storage data
      mockAsyncStorage.getItem.mockResolvedValue('corrupted_data_not_json');

      mockAssessmentStore.currentResult = EMERGENCY_GAD7_ASSESSMENT.result;

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      // Emergency protocols should still work
      expect(mockAlert).toHaveBeenCalled();
    });

    it('should recover gracefully from storage quota exceeded', async () => {
      mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;

      // Simulate storage quota exceeded
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage quota exceeded'));

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      // Should still attempt emergency intervention
      expect(mockAlert).toHaveBeenCalled();
    });
  });

  describe('⚡ MEMORY PRESSURE EMERGENCY SCENARIOS', () => {
    it('should maintain crisis detection under memory pressure', async () => {
      EmergencySimulator.simulateMemoryPressure();

      mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;

      const startTime = Date.now();

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      const responseTime = Date.now() - startTime;

      // Should still meet crisis response time despite memory pressure
      expect(responseTime).toBeLessThan(500); // Slightly higher threshold under pressure
      expect(mockAlert).toHaveBeenCalled();
    });

    it('should prioritize crisis sync over memory optimization', async () => {
      EmergencySimulator.simulateMemoryPressure();

      // Multiple crisis assessments under memory pressure
      const crisisAssessments = [
        EMERGENCY_PHQ9_ASSESSMENT,
        EMERGENCY_GAD7_ASSESSMENT
      ];

      for (const assessment of crisisAssessments) {
        mockAssessmentStore.currentResult = assessment.result;

        const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
        if (mockSubscribeCallback) {
          await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
        }
      }

      // All crisis assessments should trigger emergency protocols
      expect(mockAlert).toHaveBeenCalledTimes(crisisAssessments.length);
    });
  });

  describe('📱 APP TERMINATION EMERGENCY SCENARIOS', () => {
    it('should preserve crisis data despite app termination during sync', async () => {
      mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;

      // Start crisis sync
      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];

      try {
        // Simulate app termination during sync
        const syncPromise = mockSubscribeCallback?.(mockAssessmentStore, { currentResult: null });
        const terminationPromise = EmergencySimulator.simulateAppTermination();

        await Promise.race([syncPromise, terminationPromise]);
      } catch (error) {
        // Expected termination
      }

      // Verify crisis data was logged before termination
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should recover crisis state after app restart', async () => {
      // Simulate persisted crisis data from previous session
      const persistedCrisisData = {
        detection: {
          isTriggered: true,
          triggerType: 'phq9_suicidal',
          triggerValue: 2,
          timestamp: Date.now() - 60000, // 1 minute ago
          assessmentId: 'recovered_crisis'
        },
        syncTriggered: false,
        responseTime: null
      };

      mockAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key.includes('crisis_assessment_sync_')) {
          return JSON.stringify(persistedCrisisData);
        }
        return null;
      });

      // Restart SyncCoordinator (simulating app restart).
      // NOTE: SyncCoordinator is a process-singleton — re-assigning the
      // imported default is a no-op. The cleanup()+initialize() cycle
      // does reset isInitialized + reload persisted queue, which is what
      // the test actually exercises.
      await syncCoordinator.cleanup();
      syncCoordinator = SyncCoordinator;
      await syncCoordinator.initialize();

      // Should recover and handle persisted crisis data
      const result = await syncCoordinator.performFullSync();
      expect(result.success).toBe(true);
    });
  });

  describe('🔄 SERVICE FAILURE EMERGENCY SCENARIOS', () => {
    it('should maintain emergency protocols when all sync services fail', async () => {
      // Mock all services to fail
      jest.spyOn(syncCoordinator as any, 'performActualSync').mockRejectedValue(
        new Error('All services unavailable')
      );

      mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      // Emergency intervention should still work
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Crisis Support'),
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ cancelable: false })
      );
    });

    it('should provide direct emergency contact when sync completely fails', async () => {
      // Simulate complete system failure
      EmergencySimulator.simulateNetworkFailure();
      EmergencySimulator.simulateStorageFailure();

      mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        try {
          await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
        } catch (error) {
          // Expected complete failure
        }
      }

      // Should still provide emergency access
      expect(mockAlert).toHaveBeenCalled();

      // Verify direct 988 access works
      const alertCall = mockAlert.mock.calls[0];
      const nineEightEightOption = alertCall?.[2]?.find((option: any) =>
        option.text.includes('988')
      );

      if (nineEightEightOption?.onPress) {
        nineEightEightOption.onPress();
      }

      expect(mockLinking).toHaveBeenCalledWith('tel:988');
    });
  });

  describe('⏱️ CONCURRENT CRISIS EMERGENCY SCENARIOS', () => {
    it('should handle multiple concurrent crisis assessments under emergency conditions', async () => {
      EmergencySimulator.simulateMemoryPressure();
      EmergencySimulator.simulateNetworkFailure();

      const concurrentCrises = 5;
      const startTime = Date.now();

      // Simulate multiple users having crisis assessments simultaneously
      const crisisPromises = Array(concurrentCrises).fill(0).map(async (_, index) => {
        const crisisResult = {
          ...EMERGENCY_PHQ9_ASSESSMENT.result,
          totalScore: 20 + index, // Different crisis scores
        };

        mockAssessmentStore.currentResult = crisisResult;

        const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
        if (mockSubscribeCallback) {
          try {
            await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
          } catch (error) {
            // Some may fail due to emergency conditions
          }
        }
      });

      await Promise.allSettled(crisisPromises);

      const totalResponseTime = Date.now() - startTime;

      // Should handle all crises within reasonable time despite emergency conditions
      expect(totalResponseTime).toBeLessThan(2000); // 2 seconds for 5 concurrent crises

      // Should trigger emergency protocols for each crisis
      expect(mockAlert).toHaveBeenCalled();
    });
  });

  describe('🛡️ EMERGENCY PROTOCOL VALIDATION', () => {
    it('should validate 988 hotline accessibility under all conditions', async () => {
      const emergencyConditions = [
        () => EmergencySimulator.simulateNetworkFailure(),
        () => EmergencySimulator.simulateStorageFailure(),
        () => EmergencySimulator.simulateMemoryPressure()
      ];

      for (const simulateCondition of emergencyConditions) {
        simulateCondition();

        mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;

        const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
        if (mockSubscribeCallback) {
          try {
            await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
          } catch (error) {
            // Some conditions may cause failures
          }
        }

        // 988 should always be accessible
        expect(mockAlert).toHaveBeenCalled();

        EmergencySimulator.restoreNormalConditions();
        jest.clearAllMocks();
      }
    });

    it('should maintain crisis intervention workflow integrity', async () => {
      mockAssessmentStore.currentResult = EMERGENCY_PHQ9_ASSESSMENT.result;
      mockAssessmentStore.crisisDetection = {
        isTriggered: true,
        triggerType: 'phq9_suicidal',
        triggerValue: 2,
        timestamp: Date.now(),
        assessmentId: 'workflow_test'
      };

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      // Verify complete crisis intervention workflow
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Crisis Support'),
        expect.stringContaining('not alone'),
        expect.arrayContaining([
          expect.objectContaining({ text: expect.stringContaining('988') }),
          expect.objectContaining({ text: expect.stringContaining('741741') }),
          expect.objectContaining({ text: expect.stringContaining('911') })
        ]),
        expect.objectContaining({ cancelable: false })
      );
    });
  });
});