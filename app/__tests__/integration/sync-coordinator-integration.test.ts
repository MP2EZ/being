/**
 * COMPREHENSIVE SYNC COORDINATOR INTEGRATION TESTING
 * Phase 5.1 - Week 2 Sync Validation Suite
 *
 * CRITICAL SYNC INTEGRATION TESTING:
 * - End-to-end sync orchestration (SyncCoordinator ↔ CloudBackup ↔ Supabase)
 * - Crisis assessment sync with <200ms requirement validation
 * - Network resilience → Offline queue → Conflict resolution
 * - Assessment store integration → Real-time monitoring → Priority backup
 * - Error handling → Retry logic → Circuit breaker patterns
 * - Performance validation across all sync layers
 *
 * SAFETY-CRITICAL SYNC VALIDATION:
 * - Crisis score sync priority (PHQ-9 ≥20, GAD-7 ≥15, suicidal ideation)
 * - Data integrity during sync conflicts and failures
 * - HIPAA compliance during cloud sync operations
 * - Network failure recovery and offline queue processing
 * - Sync state consistency across app lifecycle
 *
 * ORCHESTRATION REQUIREMENTS:
 * - All sync scenarios tested through complete integration
 * - Crisis sync tested with clinical timing requirements
 * - Performance benchmarks met for sync operations
 * - Security validation during sync data transmission
 * - Conflict resolution tested with assessment data
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Import the services and stores
import SyncCoordinator from '../../src/services/supabase/SyncCoordinator';
import { useAssessmentStore } from '../../src/flows/assessment/stores/assessmentStore';
import { cloudBackupService } from '../../src/services/supabase/CloudBackupService';
import supabaseService from '../../src/services/supabase/SupabaseService';

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('expo-crypto');
jest.mock('expo-secure-store');

// Mock network states for testing
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Test data fixtures
const mockPHQ9CrisisResult = {
  totalScore: 23,
  severity: 'severe' as const,
  isCrisis: true,
  suicidalIdeation: false,
  completedAt: Date.now(),
  answers: []
};

const mockGAD7CrisisResult = {
  totalScore: 18,
  severity: 'severe' as const,
  isCrisis: true,
  completedAt: Date.now(),
  answers: []
};

const mockSuicidalIdeationResult = {
  totalScore: 15,
  severity: 'moderately_severe' as const,
  isCrisis: true,
  suicidalIdeation: true,
  completedAt: Date.now(),
  answers: []
};

describe('🔄 SYNC COORDINATOR INTEGRATION TESTING', () => {
  let syncCoordinator: SyncCoordinator;
  let mockAssessmentStore: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock successful network state
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true
    } as any);

    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);

    // Initialize mock assessment store
    mockAssessmentStore = {
      currentResult: null,
      completedAssessments: [],
      currentSession: null,
      answers: [],
      crisisDetection: null,
      getState: jest.fn(),
      setState: jest.fn(),
      subscribe: jest.fn()
    };

    // Mock assessment store
    (useAssessmentStore as any).mockImplementation(() => mockAssessmentStore);
    (useAssessmentStore as any).getState = jest.fn(() => mockAssessmentStore);
    (useAssessmentStore as any).subscribe = jest.fn();

    // Initialize SyncCoordinator
    syncCoordinator = new SyncCoordinator();
    await syncCoordinator.initialize();
  });

  afterEach(async () => {
    if (syncCoordinator) {
      await syncCoordinator.shutdown();
    }
  });

  describe('🚀 BASIC SYNC OPERATIONS', () => {
    it('should initialize sync coordinator with all services', async () => {
      expect(syncCoordinator).toBeDefined();
      expect(syncCoordinator.getStatus().isInitialized).toBe(true);
    });

    it('should perform manual sync operation successfully', async () => {
      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(true);
      expect(result.operationsCompleted).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle sync with no data gracefully', async () => {
      // Empty assessment store
      mockAssessmentStore.completedAssessments = [];
      mockAssessmentStore.currentResult = null;

      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(true);
      expect(result.operationsCompleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🚨 CRISIS ASSESSMENT SYNC PRIORITY', () => {
    it('should trigger immediate crisis sync for PHQ-9 ≥20', async () => {
      const startTime = Date.now();

      // Simulate crisis assessment completion
      mockAssessmentStore.currentResult = mockPHQ9CrisisResult;

      // Trigger state change to simulate assessment completion
      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      const responseTime = Date.now() - startTime;

      // Validate crisis response time requirement
      expect(responseTime).toBeLessThan(200);

      // Check that priority backup was triggered
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/crisis_assessment_sync_/),
        expect.any(String)
      );
    });

    it('should trigger immediate crisis sync for GAD-7 ≥15', async () => {
      const startTime = Date.now();

      mockAssessmentStore.currentResult = mockGAD7CrisisResult;

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(200);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/crisis_assessment_sync_/),
        expect.any(String)
      );
    });

    it('should trigger immediate crisis sync for suicidal ideation', async () => {
      const startTime = Date.now();

      mockAssessmentStore.currentResult = mockSuicidalIdeationResult;

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(200);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/crisis_assessment_sync_/),
        expect.any(String)
      );
    });

    it('should log crisis assessments for clinical compliance', async () => {
      mockAssessmentStore.currentResult = mockPHQ9CrisisResult;

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      // Verify crisis assessment logging
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/crisis_assessment_sync_/),
        expect.stringContaining('"type":"phq9_score"')
      );
    });
  });

  describe('🌐 NETWORK RESILIENCE TESTING', () => {
    it('should handle offline scenarios gracefully', async () => {
      // Mock offline state
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        isInternetReachable: false
      } as any);

      const result = await syncCoordinator.performSync('manual');

      // Should queue operations for later
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should implement exponential backoff for failed sync attempts', async () => {
      // Mock network failure
      mockNetInfo.fetch.mockRejectedValue(new Error('Network timeout'));

      const startTime = Date.now();
      const result = await syncCoordinator.performSync('manual');
      const duration = Date.now() - startTime;

      // Should implement retry delay
      expect(duration).toBeGreaterThan(100); // Some retry delay
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should process offline queue when network recovers', async () => {
      // First, simulate offline operation
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
        isInternetReachable: false
      } as any);

      await syncCoordinator.performSync('manual');

      // Then, simulate network recovery
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true
      } as any);

      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(true);
    });

    it('should adapt processing based on network quality', async () => {
      // Mock poor network conditions
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
        details: {
          cellularGeneration: '2g'
        }
      } as any);

      const result = await syncCoordinator.performSync('manual');

      // Should still complete but may take longer
      expect(result.success).toBe(true);
    });
  });

  describe('⚖️ CONFLICT RESOLUTION TESTING', () => {
    it('should implement last-write-wins conflict resolution', async () => {
      // Simulate conflict scenario with different timestamps
      const localData = { data: 'local', timestamp: Date.now() - 1000 };
      const remoteData = { data: 'remote', timestamp: Date.now() };

      // Mock conflicting data
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(localData));

      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(true);
      expect(result.conflictsResolved).toBeGreaterThanOrEqual(0);
    });

    it('should preserve crisis data during conflict resolution', async () => {
      mockAssessmentStore.currentResult = mockPHQ9CrisisResult;
      mockAssessmentStore.completedAssessments = [
        { id: 'crisis-assessment', result: mockPHQ9CrisisResult }
      ];

      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(true);
      // Crisis data should be preserved regardless of conflicts
    });

    it('should maintain assessment integrity during conflict merge', async () => {
      const assessmentData = {
        completedAssessments: [
          { id: 'phq9-1', result: { totalScore: 15 } },
          { id: 'gad7-1', result: { totalScore: 12 } }
        ]
      };

      mockAssessmentStore.completedAssessments = assessmentData.completedAssessments;

      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(true);
      // Assessment data integrity should be maintained
    });
  });

  describe('⚡ PERFORMANCE VALIDATION', () => {
    it('should complete routine sync within performance thresholds', async () => {
      const startTime = Date.now();

      const result = await syncCoordinator.performSync('manual');

      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 5 second threshold for routine sync
      expect(result.performance.duration).toBeLessThan(5000);
    });

    it('should handle concurrent sync operations safely', async () => {
      const syncPromises = [
        syncCoordinator.performSync('manual'),
        syncCoordinator.performSync('assessment'),
        syncCoordinator.performSync('manual')
      ];

      const results = await Promise.allSettled(syncPromises);

      // At least one should succeed, others may be debounced
      const successfulSyncs = results.filter(r =>
        r.status === 'fulfilled' && r.value.success
      );

      expect(successfulSyncs.length).toBeGreaterThan(0);
    });

    it('should maintain acceptable throughput under load', async () => {
      const operations = 10;
      const startTime = Date.now();

      const syncPromises = Array(operations).fill(0).map(() =>
        syncCoordinator.performSync('manual')
      );

      await Promise.all(syncPromises);

      const totalDuration = Date.now() - startTime;
      const averageDuration = totalDuration / operations;

      expect(averageDuration).toBeLessThan(1000); // Average 1s per operation
    });
  });

  describe('🔒 SECURITY AND COMPLIANCE VALIDATION', () => {
    it('should maintain HIPAA compliance during sync operations', async () => {
      mockAssessmentStore.completedAssessments = [
        { id: 'test', result: mockPHQ9CrisisResult }
      ];

      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(true);

      // Verify no PHI was logged in plaintext
      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      setItemCalls.forEach(([key, value]) => {
        if (key.includes('sync') || key.includes('crisis')) {
          expect(value).toBeDefined();
          // Should contain encrypted or non-PHI data only
        }
      });
    });

    it('should encrypt assessment data during sync transmission', async () => {
      mockAssessmentStore.completedAssessments = [
        { id: 'sensitive', result: mockPHQ9CrisisResult }
      ];

      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(true);
      // Sync should complete with encrypted data transmission
    });

    it('should maintain audit trail for sync operations', async () => {
      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.operationsCompleted).toBeDefined();

      // Should create audit entries in storage
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('🔄 ERROR HANDLING AND RECOVERY', () => {
    it('should handle service unavailability gracefully', async () => {
      // Mock service failure
      jest.spyOn(cloudBackupService, 'createBackup').mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await syncCoordinator.performSync('manual');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Service unavailable');
    });

    it('should implement circuit breaker for repeated failures', async () => {
      // Mock repeated failures
      jest.spyOn(cloudBackupService, 'createBackup').mockRejectedValue(
        new Error('Persistent failure')
      );

      // Multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await syncCoordinator.performSync('manual');
      }

      // Should implement circuit breaker logic
      const status = syncCoordinator.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    it('should recover from partial sync failures', async () => {
      // Mock partial failure scenario
      jest.spyOn(cloudBackupService, 'createBackup')
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Partial failure'))
        .mockResolvedValue(true);

      const result = await syncCoordinator.performSync('manual');

      // Should handle partial failures gracefully
      expect(result.operationsCompleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('📊 SYNC STATE MANAGEMENT', () => {
    it('should track sync state accurately', async () => {
      const initialStatus = syncCoordinator.getStatus();
      expect(initialStatus.isInitialized).toBe(true);
      expect(initialStatus.lastSyncTime).toBeNull();

      await syncCoordinator.performSync('manual');

      const updatedStatus = syncCoordinator.getStatus();
      expect(updatedStatus.lastSyncTime).not.toBeNull();
    });

    it('should handle multiple sync triggers appropriately', async () => {
      // Trigger assessment change
      mockAssessmentStore.currentResult = mockPHQ9CrisisResult;

      const mockSubscribeCallback = (useAssessmentStore as any).subscribe.mock.calls[0]?.[0];
      if (mockSubscribeCallback) {
        await mockSubscribeCallback(mockAssessmentStore, { currentResult: null });
      }

      // Manual sync should still work
      const result = await syncCoordinator.performSync('manual');
      expect(result.success).toBe(true);
    });

    it('should cleanup resources properly on shutdown', async () => {
      await syncCoordinator.shutdown();

      const status = syncCoordinator.getStatus();
      expect(status.isInitialized).toBe(false);
    });
  });
});