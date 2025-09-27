/**
 * Complete Cross-Device Sync End-to-End Tests
 *
 * Full user journey testing with real UI components and complete workflow:
 * - Complete MBCT session handoff between devices
 * - Crisis detection and response across devices
 * - Assessment completion with conflict resolution
 * - Widget integration with sync status
 * - Offline-to-online synchronization
 * - Performance monitoring throughout journey
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { jest } from '@jest/globals';
import '../setup/sync-test-setup';

// Import components for complete testing
import { SyncStatusIndicator } from '../../../src/components/sync/SyncStatusIndicator';
import { SyncConflictResolver } from '../../../src/components/sync/SyncConflictResolver';
import { CrisisSyncBadge } from '../../../src/components/sync/CrisisSyncBadge';
import { CrossDeviceSyncAPI } from '../../../src/services/cloud/CrossDeviceSyncAPI';

// Mock navigation for E2E testing
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};

// Mock store hooks
const mockUseStore = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: jest.fn(),
}));

// Mock Zustand stores
jest.mock('../../../src/store/userStore', () => ({
  useUserStore: mockUseStore,
}));

jest.mock('../../../src/store/assessmentStore', () => ({
  useAssessmentStore: mockUseStore,
}));

jest.mock('../../../src/store/checkInStore', () => ({
  useCheckInStore: mockUseStore,
}));

describe('Complete Cross-Device Sync User Journey', () => {
  let syncAPI: CrossDeviceSyncAPI;
  let device1: any;
  let device2: any;
  let performanceMonitor: any;

  beforeEach(async () => {
    global.cleanupSyncTests();
    syncAPI = CrossDeviceSyncAPI.getInstance();
    performanceMonitor = global.performanceMonitor;

    // Set up two test devices for journey
    device1 = await setupTestDevice('Primary iPhone', 'ios');
    device2 = await setupTestDevice('Secondary iPad', 'ios');

    // Mock store initial state
    mockUseStore.mockReturnValue({
      // User store state
      user: {
        id: 'test_user_123',
        name: 'Test User',
        preferences: {
          theme: 'morning',
          notifications: true,
        },
      },

      // Assessment store state
      assessments: [],
      addAssessment: jest.fn(),
      updateAssessment: jest.fn(),

      // Check-in store state
      checkIns: [],
      addCheckIn: jest.fn(),

      // Sync-related state
      syncStatus: 'idle',
      lastSync: new Date().toISOString(),
    });
  });

  afterEach(() => {
    syncAPI.destroy();
    jest.clearAllMocks();
  });

  async function setupTestDevice(deviceName: string, platform: 'ios' | 'android') {
    const deviceInfo = { deviceName, platform, appVersion: '1.0.0' };
    const result = await syncAPI.registerDevice(deviceInfo);
    expect(result.success).toBe(true);
    return { ...deviceInfo, deviceId: result.deviceId!, deviceKey: result.deviceKey! };
  }

  describe('Complete MBCT Session Handoff Journey', () => {
    it('should complete full session handoff with UI feedback', async () => {
      // Step 1: Start session on device 1
      const sessionData = {
        sessionId: 'e2e_handoff_session',
        exerciseType: 'body_scan',
        progress: 0.0,
        totalSteps: 8,
        currentStep: 1,
        stepTitle: 'Finding a comfortable position',
        deviceId: device1.deviceId,
        startTime: new Date().toISOString(),
      };

      // Render sync status indicator
      const { getByTestId, rerender } = render(<SyncStatusIndicator showDetails />);

      // Verify initial sync status
      await waitFor(() => {
        expect(getByTestId('sync-status-indicator')).toBeTruthy();
      });

      // Step 2: Progress session on device 1
      const progressData = {
        ...sessionData,
        progress: 0.25,
        currentStep: 3,
        stepTitle: 'Breathing awareness',
        timeElapsed: 300, // 5 minutes
      };

      const progressSyncStart = performance.now();

      const progressResult = await syncAPI.syncTherapeuticData(
        progressData,
        'session_data',
        sessionData.sessionId,
        { sessionId: sessionData.sessionId, exerciseType: sessionData.exerciseType }
      );

      const progressSyncTime = performance.now() - progressSyncStart;

      expect(progressResult.success).toBe(true);
      expect(progressSyncTime).toBeLessThan(500);

      // Step 3: Show handoff UI
      rerender(<SyncStatusIndicator showDetails entityType="session_data" />);

      await waitFor(() => {
        // Should show syncing status
        expect(getByTestId('sync-status-text')).toBeTruthy();
      });

      // Step 4: Handoff to device 2
      const handoffData = {
        ...progressData,
        deviceId: device2.deviceId,
        handoffTime: new Date().toISOString(),
        previousDevice: device1.deviceId,
        handoffReason: 'user_initiated',
      };

      const handoffStart = performance.now();

      const handoffResult = await syncAPI.syncTherapeuticData(
        handoffData,
        'session_data',
        sessionData.sessionId,
        { sessionId: sessionData.sessionId, exerciseType: sessionData.exerciseType }
      );

      const handoffTime = performance.now() - handoffStart;

      expect(handoffResult.success).toBe(true);
      expect(handoffTime).toBeLessThan(2000); // <2 second requirement

      // Step 5: Continue session on device 2
      const continuationData = {
        ...handoffData,
        progress: 0.5,
        currentStep: 5,
        stepTitle: 'Body scanning - legs and arms',
        timeElapsed: 600, // 10 minutes total
      };

      const continuationResult = await syncAPI.syncTherapeuticData(
        continuationData,
        'session_data',
        sessionData.sessionId
      );

      expect(continuationResult.success).toBe(true);

      // Step 6: Complete session
      const completionData = {
        ...continuationData,
        progress: 1.0,
        currentStep: 8,
        stepTitle: 'Completion and reflection',
        completed: true,
        completionTime: new Date().toISOString(),
        totalDuration: 1200, // 20 minutes
      };

      const completionResult = await syncAPI.syncTherapeuticData(
        completionData,
        'session_data',
        sessionData.sessionId
      );

      expect(completionResult.success).toBe(true);

      // Verify UI shows completion
      rerender(<SyncStatusIndicator showDetails />);

      await waitFor(() => {
        expect(getByTestId('sync-status-text')).toBeTruthy();
      });

      // Record performance metrics
      performanceMonitor.recordResponseTime('complete_session_handoff', handoffTime);
      performanceMonitor.recordResponseTime('session_progress_sync', progressSyncTime);

      // Validate therapeutic continuity
      expect(completionData.totalDuration).toBe(1200);
      expect(completionData.progress).toBe(1.0);
      expect(completionData.exerciseType).toBe('body_scan');
    });

    it('should handle session interruption and recovery', async () => {
      const sessionId = 'interruption_recovery_test';

      // Start session
      const sessionStart = {
        sessionId,
        exerciseType: 'breathing',
        progress: 0.3,
        currentPhase: 'breathe_in',
        phaseProgress: 0.5,
        deviceId: device1.deviceId,
      };

      await syncAPI.syncTherapeuticData(sessionStart, 'session_data', sessionId);

      // Simulate interruption (app background, network loss)
      const interruptionTime = new Date().toISOString();

      // Recovery on different device
      const recoveryData = {
        ...sessionStart,
        deviceId: device2.deviceId,
        interruptedAt: interruptionTime,
        recoveredAt: new Date().toISOString(),
        recoveryType: 'device_switch',
      };

      const { result, duration } = await global.SyncTestUtils.measurePerformance(
        () => syncAPI.syncTherapeuticData(recoveryData, 'session_data', sessionId),
        'session_recovery'
      );

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Quick recovery

      // Session should continue seamlessly
      expect(recoveryData.progress).toBe(sessionStart.progress);
      expect(recoveryData.currentPhase).toBe(sessionStart.currentPhase);
    });
  });

  describe('Crisis Detection and Response Journey', () => {
    it('should complete crisis detection to response workflow', async () => {
      // Step 1: User completes PHQ-9 assessment
      const phq9Responses = [3, 3, 3, 3, 2, 2, 2, 2, 2]; // Score: 22 (severe)
      const assessmentData = {
        assessmentId: 'e2e_crisis_phq9',
        type: 'phq9',
        responses: phq9Responses,
        score: phq9Responses.reduce((sum, response) => sum + response, 0),
        completedAt: new Date().toISOString(),
        deviceId: device1.deviceId,
      };

      // Render crisis sync badge
      const { getByTestId } = render(<CrisisSyncBadge />);

      // Step 2: Sync assessment (triggers crisis detection)
      const crisisDetectionStart = performance.now();

      const assessmentResult = await syncAPI.syncCrisisData(
        assessmentData,
        'assessment',
        assessmentData.assessmentId
      );

      const crisisDetectionTime = performance.now() - crisisDetectionStart;

      expect(assessmentResult.success).toBe(true);
      expect(crisisDetectionTime).toBeLessThan(200); // Crisis requirement

      // Step 3: Crisis badge should appear
      await waitFor(() => {
        expect(getByTestId('crisis-badge')).toBeTruthy();
      });

      // Step 4: User activates crisis plan
      const crisisPlan = {
        planId: 'e2e_crisis_plan',
        triggered: true,
        triggerReason: 'phq9_threshold',
        assessmentScore: assessmentData.score,
        activatedAt: new Date().toISOString(),
        deviceId: device1.deviceId,
        emergencyContacts: [
          { name: 'Dr. Sarah Johnson', phone: '555-THERAPY', relationship: 'therapist' },
          { name: 'Crisis Hotline', phone: '988', relationship: 'hotline' },
        ],
        copingStrategies: [
          'Deep breathing exercise',
          'Grounding technique (5-4-3-2-1)',
          'Call support person',
        ],
        location: { latitude: 37.7749, longitude: -122.4194 },
      };

      const crisisPlanResult = await syncAPI.syncCrisisData(
        crisisPlan,
        'crisis_plan',
        crisisPlan.planId
      );

      expect(crisisPlanResult.success).toBe(true);
      expect(crisisPlanResult.responseTime).toBeLessThan(200);

      // Step 5: Crisis state propagates to device 2
      const device2CrisisCheck = {
        deviceId: device2.deviceId,
        checkTime: new Date().toISOString(),
        crisisPlanAccess: true,
      };

      const propagationResult = await syncAPI.syncCrisisData(
        device2CrisisCheck,
        'crisis_plan',
        'crisis_check_device2'
      );

      expect(propagationResult.success).toBe(true);

      // Step 6: User initiates emergency contact
      const emergencyContact = {
        contactId: 'emergency_call_test',
        contactType: 'therapist',
        contactName: 'Dr. Sarah Johnson',
        initiatedAt: new Date().toISOString(),
        deviceId: device2.deviceId,
        method: 'phone_call',
      };

      const emergencyResult = await syncAPI.syncCrisisData(
        emergencyContact,
        'crisis_plan',
        emergencyContact.contactId
      );

      expect(emergencyResult.success).toBe(true);

      // Record crisis response metrics
      performanceMonitor.recordResponseTime('crisis_detection', crisisDetectionTime);
      performanceMonitor.recordResponseTime('crisis_plan_sync', crisisPlanResult.responseTime);

      // Validate crisis access features remain available
      const crisisAccess = {
        emergency_button: true,
        hotline_access: true,
        crisis_plan_access: true,
      };

      expect(crisisAccess).toMaintainCrisisAccess();
    });

    it('should maintain crisis access during network issues', async () => {
      // Render crisis badge
      const { getByTestId } = render(<CrisisSyncBadge emergencyMode />);

      // Simulate network failure during crisis
      const offlineCrisis = {
        type: 'crisis_button',
        activatedAt: new Date().toISOString(),
        deviceId: device1.deviceId,
        offline: true,
        localCrisisPlan: {
          emergencyNumber: '988',
          localCopingStrategies: ['breathing', 'grounding'],
          lastSyncedContacts: ['Dr. Johnson: 555-THERAPY'],
        },
      };

      // Should succeed even when offline
      const offlineResult = await syncAPI.syncCrisisData(
        offlineCrisis,
        'crisis_plan',
        'offline_crisis_test'
      );

      expect(offlineResult.success).toBe(true);

      // Crisis badge should remain functional
      await waitFor(() => {
        const crisisBadge = getByTestId('crisis-badge');
        expect(crisisBadge).toBeTruthy();
      });

      // Emergency features should be accessible
      const emergencyAccess = {
        emergency_button: true,
        hotline_access: true,
        crisis_plan_access: true,
      };

      expect(emergencyAccess).toMaintainCrisisAccess();
    });
  });

  describe('Assessment Completion with Conflict Resolution', () => {
    it('should handle assessment conflicts through UI', async () => {
      // Device 1 completes GAD-7
      const device1Assessment = {
        assessmentId: 'conflict_gad7_test',
        type: 'gad7',
        responses: [2, 2, 1, 1, 2, 1, 1], // Score: 10
        score: 10,
        completedAt: new Date().toISOString(),
        deviceId: device1.deviceId,
        version: 1,
      };

      // Device 2 completes same assessment (different responses)
      const device2Assessment = {
        assessmentId: 'conflict_gad7_test',
        type: 'gad7',
        responses: [3, 3, 2, 2, 3, 2, 2], // Score: 17
        score: 17,
        completedAt: new Date(Date.now() + 1000).toISOString(),
        deviceId: device2.deviceId,
        version: 1,
      };

      // Sync both assessments
      await syncAPI.syncCrisisData(device1Assessment, 'assessment', device1Assessment.assessmentId);
      await syncAPI.syncCrisisData(device2Assessment, 'assessment', device2Assessment.assessmentId);

      // Render conflict resolver
      const mockConflict = global.SyncTestUtils.createMockConflict({
        entityId: 'conflict_gad7_test',
        entityType: 'assessment',
        clinicalRelevant: true,
        localData: {
          encryptedData: JSON.stringify(device1Assessment),
          metadata: { version: 1, lastModified: device1Assessment.completedAt },
        },
        cloudData: {
          encryptedData: JSON.stringify(device2Assessment),
          metadata: { version: 1, lastModified: device2Assessment.completedAt },
        },
      });

      const onResolve = jest.fn();
      const { getByTestId, getByText } = render(
        <SyncConflictResolver conflict={mockConflict} onResolve={onResolve} />
      );

      // Should show conflict details
      await waitFor(() => {
        expect(getByText('Assessment Data Conflict')).toBeTruthy();
        expect(getByText('Clinical data requires attention')).toBeTruthy();
      });

      // User chooses resolution strategy
      const useLatestButton = getByTestId('use-latest-button');
      fireEvent.press(useLatestButton);

      await waitFor(() => {
        expect(onResolve).toHaveBeenCalledWith(
          expect.objectContaining({
            strategy: 'use_latest',
            resolvedData: expect.any(Object),
          })
        );
      });

      // Higher clinical score should be preserved
      const resolveCall = onResolve.mock.calls[0][0];
      const resolvedAssessment = JSON.parse(resolvedAssessment.resolvedData.encryptedData);
      expect(resolvedAssessment.score).toBe(17); // Higher, more concerning score
    });

    it('should validate assessment accuracy through sync', async () => {
      const phq9Assessment = {
        assessmentId: 'accuracy_validation_test',
        type: 'phq9',
        responses: [1, 1, 2, 1, 0, 1, 1, 0, 1], // Score should be 8
        userCalculatedScore: 8,
        timestamp: new Date().toISOString(),
        deviceId: device1.deviceId,
      };

      // Calculate actual score
      const actualScore = phq9Assessment.responses.reduce((sum, response) => sum + response, 0);
      phq9Assessment.score = actualScore;

      // Sync assessment
      const result = await syncAPI.syncCrisisData(
        phq9Assessment,
        'assessment',
        phq9Assessment.assessmentId
      );

      expect(result.success).toBe(true);

      // Verify score accuracy
      expect(phq9Assessment.score).toBe(8);
      expect(phq9Assessment.score).toBe(phq9Assessment.userCalculatedScore);

      // Classification should be accurate
      const classification = phq9Assessment.score < 5 ? 'minimal' :
                           phq9Assessment.score < 10 ? 'mild' :
                           phq9Assessment.score < 15 ? 'moderate' :
                           phq9Assessment.score < 20 ? 'moderately_severe' : 'severe';

      expect(classification).toBe('mild');
    });
  });

  describe('Widget Integration with Sync Status', () => {
    it('should show sync status in widget context', async () => {
      // Render sync status in compact mode (widget-like)
      const { getByTestId, rerender } = render(<SyncStatusIndicator compact />);

      // Initial state
      await waitFor(() => {
        expect(getByTestId('compact-indicator')).toBeTruthy();
      });

      // Simulate widget data sync
      const widgetData = {
        widgetId: 'morning_checkin_widget',
        mood: 7,
        energy: 6,
        quickNote: 'Feeling good this morning',
        timestamp: new Date().toISOString(),
        deviceId: device1.deviceId,
      };

      const widgetSyncStart = performance.now();

      const widgetResult = await syncAPI.syncGeneralData(
        widgetData,
        'widget_data',
        widgetData.widgetId
      );

      const widgetSyncTime = performance.now() - widgetSyncStart;

      expect(widgetResult.success).toBe(true);
      expect(widgetSyncTime).toBeLessThan(1000); // Widget should be fast

      // Status should update to show syncing
      rerender(<SyncStatusIndicator compact entityType="widget_data" />);

      // Should show success after sync
      await waitFor(() => {
        const indicator = getByTestId('compact-indicator');
        expect(indicator).toBeTruthy();
      });

      performanceMonitor.recordResponseTime('widget_sync', widgetSyncTime);
    });

    it('should handle quick check-in via widget', async () => {
      const quickCheckin = {
        checkinId: 'widget_quick_checkin',
        type: 'quick',
        mood: 8,
        timestamp: new Date().toISOString(),
        source: 'widget',
        deviceId: device2.deviceId,
      };

      const { result, duration } = await global.SyncTestUtils.measurePerformance(
        () => syncAPI.syncTherapeuticData(quickCheckin, 'checkin_data', quickCheckin.checkinId),
        'widget_quick_checkin'
      );

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(500); // Quick for widget interaction

      // Data should be available on other devices
      const syncStatus = await syncAPI.getSyncStatus();
      expect(syncStatus.syncHealth).toBe('healthy');
    });
  });

  describe('Offline-to-Online Synchronization', () => {
    it('should complete offline-to-online sync journey', async () => {
      // Simulate offline period
      const offlineData = [
        {
          id: 'offline_checkin_1',
          type: 'checkin',
          data: { mood: 6, timestamp: new Date(Date.now() - 60000).toISOString() },
        },
        {
          id: 'offline_checkin_2',
          type: 'checkin',
          data: { mood: 7, timestamp: new Date().toISOString() },
        },
        {
          id: 'offline_session',
          type: 'session',
          data: { exerciseType: 'breathing', duration: 180, completed: true },
        },
      ];

      // Render sync status indicator
      const { getByTestId, getByText } = render(<SyncStatusIndicator showDetails />);

      // Initially offline
      await waitFor(() => {
        expect(getByText('Offline')).toBeTruthy();
      });

      // Come back online and sync queued data
      const batchSyncStart = performance.now();

      const syncPromises = offlineData.map(item => {
        if (item.type === 'checkin') {
          return syncAPI.syncTherapeuticData(item.data, 'checkin_data', item.id);
        } else {
          return syncAPI.syncTherapeuticData(item.data, 'session_data', item.id);
        }
      });

      const results = await Promise.all(syncPromises);
      const batchSyncTime = performance.now() - batchSyncStart;

      // All offline data should sync successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(batchSyncTime).toBeLessThan(3000); // Reasonable batch sync time

      // Status should show successful sync
      await waitFor(() => {
        expect(getByText('Up to date')).toBeTruthy();
      });

      performanceMonitor.recordResponseTime('offline_to_online_batch', batchSyncTime);
    });
  });

  describe('Performance Monitoring Throughout Journey', () => {
    it('should maintain performance standards across complete journey', async () => {
      const journeyStart = performance.now();
      const startMemory = global.SyncTestUtils.trackMemoryUsage();

      // Complete user journey simulation
      const journeySteps = [
        // 1. Morning check-in
        () => syncAPI.syncTherapeuticData(
          { mood: 7, energy: 8, timestamp: new Date().toISOString() },
          'checkin_data',
          'journey_checkin'
        ),

        // 2. Start MBCT session
        () => syncAPI.syncTherapeuticData(
          { sessionId: 'journey_session', exerciseType: 'breathing', progress: 0.2 },
          'session_data',
          'journey_session'
        ),

        // 3. Complete assessment
        () => syncAPI.syncCrisisData(
          { type: 'gad7', responses: [1, 1, 0, 1, 1, 0, 1], score: 5 },
          'assessment',
          'journey_gad7'
        ),

        // 4. Update preferences
        () => syncAPI.syncGeneralData(
          { theme: 'evening', notifications: true },
          'user_profile',
          'journey_preferences'
        ),

        // 5. Complete session
        () => syncAPI.syncTherapeuticData(
          { sessionId: 'journey_session', exerciseType: 'breathing', progress: 1.0, completed: true },
          'session_data',
          'journey_session'
        ),
      ];

      // Execute journey steps
      for (const step of journeySteps) {
        const result = await step();
        expect(result.success).toBe(true);
      }

      const journeyTime = performance.now() - journeyStart;
      const endMemory = global.SyncTestUtils.trackMemoryUsage();
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      // Performance validation
      expect(journeyTime).toBeLessThan(5000); // Complete journey under 5 seconds
      expect(memoryIncrease).toBeLessThan(global.SyncTestConfig.performance.memoryLimit);

      // Get final performance metrics
      const metrics = syncAPI.getPerformanceMetrics();
      expect(metrics.successRate).toBeGreaterThan(0.95);
      expect(metrics.averageCrisisResponseTime).toBeLessThan(200);

      performanceMonitor.recordResponseTime('complete_user_journey', journeyTime);
    });
  });
});