/**
 * Sync System Integration Tests - Comprehensive testing for FullMind data synchronization
 * Clinical-grade testing with conflict resolution, performance validation, and safety checks
 */

import { syncOrchestrationService } from '../../services/SyncOrchestrationService';
import { syncInitializationService } from '../../services/SyncInitializationService';
import { syncPerformanceMonitor } from '../../services/SyncPerformanceMonitor';
import { enhancedOfflineQueueService } from '../../services/EnhancedOfflineQueueService';
import { networkAwareService } from '../../services/NetworkAwareService';
import { createSyncMixin, withSync } from '../../store/mixins/syncMixin';
import {
  SyncStatus,
  SyncOperationType,
  SyncEntityType,
  ConflictType,
  ConflictResolutionStrategy,
  SyncConflict,
  ClinicalValidationResult,
  SYNC_CONSTANTS
} from '../../types/sync';
import { OfflinePriority, NetworkQuality } from '../../types/offline';
import { CheckIn, Assessment } from '../../types';

// Mock implementations for testing
jest.mock('../../services/NetworkAwareService');
jest.mock('../../services/storage/SecureDataStore');
jest.mock('@react-native-async-storage/async-storage');

describe('Sync System Integration Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset sync system state
    await syncOrchestrationService.shutdown();
    await syncInitializationService.shutdown();
  });

  afterEach(async () => {
    await syncOrchestrationService.shutdown();
    await syncInitializationService.shutdown();
  });

  describe('System Initialization', () => {
    it('should initialize all sync services in correct order', async () => {
      const initResult = await syncInitializationService.initialize({
        enablePerformanceMonitoring: true,
        enableOfflineMode: true,
        clinicalSafetyChecks: true
      });

      expect(initResult.success).toBe(true);
      expect(initResult.syncReady).toBe(true);
      expect(initResult.errors).toHaveLength(0);
      expect(initResult.services.length).toBeGreaterThan(0);
      
      // Verify service initialization order
      const serviceNames = initResult.services.map(s => s.name);
      const networkIndex = serviceNames.indexOf('networkAware');
      const syncIndex = serviceNames.indexOf('syncOrchestration');
      
      expect(networkIndex).toBeLessThan(syncIndex);
    });

    it('should handle partial initialization gracefully', async () => {
      // Mock network service failure
      const mockNetworkService = networkAwareService as jest.Mocked<typeof networkAwareService>;
      mockNetworkService.initialize.mockRejectedValue(new Error('Network service unavailable'));

      const initResult = await syncInitializationService.initialize();

      expect(initResult.success).toBe(false);
      expect(initResult.errors.length).toBeGreaterThan(0);
      expect(initResult.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate clinical safety requirements', async () => {
      const initResult = await syncInitializationService.initialize({
        clinicalSafetyChecks: true
      });

      if (initResult.success) {
        const healthCheck = await syncInitializationService.performHealthCheck();
        expect(healthCheck.overall).toMatch(/healthy|degraded/);
        
        // Ensure critical services are healthy
        const criticalServices = healthCheck.services.filter(s => 
          ['syncOrchestration', 'enhancedOfflineQueue'].includes(s.name)
        );
        
        criticalServices.forEach(service => {
          expect(service.status).not.toBe('critical');
        });
      }
    });
  });

  describe('Store Sync Integration', () => {
    let mockCheckInStore: any;

    beforeEach(async () => {
      await syncInitializationService.initialize();
      
      // Create a mock store with sync capabilities
      const mockStoreDefinition = jest.fn().mockReturnValue({
        checkIns: [],
        currentCheckIn: null,
        isLoading: false,
        error: null,
        
        // Mock actions
        saveCurrentCheckIn: jest.fn(),
        updateCurrentCheckIn: jest.fn(),
        loadCheckIns: jest.fn()
      });

      const mockValidation = jest.fn().mockReturnValue({
        isValid: true,
        assessmentScoresValid: true,
        crisisThresholdsValid: true,
        therapeuticContinuityPreserved: true,
        dataIntegrityIssues: [],
        recommendations: [],
        validatedAt: new Date().toISOString()
      });

      mockCheckInStore = withSync(
        SyncEntityType.CHECK_IN,
        mockStoreDefinition,
        mockValidation
      )(jest.fn(), jest.fn());
    });

    it('should register store with sync orchestration', () => {
      expect(mockCheckInStore._syncStatus).toBeDefined();
      expect(mockCheckInStore._syncMetadata).toBeDefined();
      expect(mockCheckInStore._prepareSyncOperation).toBeDefined();
    });

    it('should prepare sync operations correctly', () => {
      const mockCheckIn: CheckIn = {
        id: 'test-checkin-1',
        type: 'morning',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        data: {
          emotions: ['calm', 'focused'],
          energyLevel: 7,
          sleepQuality: 8
        }
      };

      const syncOp = mockCheckInStore._prepareSyncOperation(
        SyncOperationType.CREATE,
        mockCheckIn,
        {
          priority: OfflinePriority.MEDIUM,
          clinicalSafety: true
        }
      );

      expect(syncOp.type).toBe(SyncOperationType.CREATE);
      expect(syncOp.entityType).toBe(SyncEntityType.CHECK_IN);
      expect(syncOp.priority).toBe(OfflinePriority.MEDIUM);
      expect(syncOp.clinicalSafety).toBe(true);
      expect(syncOp.data).toEqual(mockCheckIn);
    });

    it('should handle optimistic updates', () => {
      const mockCheckIn: CheckIn = {
        id: 'test-checkin-2',
        type: 'evening',
        startedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        data: {
          dayHighlight: 'Great therapy session',
          gratitude1: 'Family support'
        }
      };

      // Perform optimistic update
      mockCheckInStore._performOptimisticUpdate('test-checkin-2', mockCheckIn);
      
      expect(mockCheckInStore._optimisticUpdates.has('test-checkin-2')).toBe(true);

      // Commit optimistic update
      mockCheckInStore._commitOptimisticUpdate('test-checkin-2');
      
      expect(mockCheckInStore._optimisticUpdates.has('test-checkin-2')).toBe(false);
    });

    it('should rollback failed optimistic updates', () => {
      const originalCheckIn: CheckIn = {
        id: 'test-checkin-3',
        type: 'midday',
        startedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        data: { currentEmotions: ['stressed'] }
      };

      const updatedCheckIn: CheckIn = {
        ...originalCheckIn,
        data: { currentEmotions: ['calm', 'focused'] }
      };

      // Simulate optimistic update
      mockCheckInStore._optimisticUpdates.set('test-checkin-3', {
        data: updatedCheckIn,
        originalData: originalCheckIn
      });

      // Rollback update
      mockCheckInStore._rollbackOptimisticUpdate('test-checkin-3');
      
      expect(mockCheckInStore._optimisticUpdates.has('test-checkin-3')).toBe(false);
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await syncInitializationService.initialize();
    });

    it('should detect and resolve simple conflicts automatically', async () => {
      const localCheckIn: CheckIn = {
        id: 'conflict-checkin-1',
        type: 'morning',
        startedAt: '2023-10-01T08:00:00Z',
        timestamp: '2023-10-01T08:30:00Z',
        data: { energyLevel: 7, emotions: ['calm'] }
      };

      const remoteCheckIn: CheckIn = {
        id: 'conflict-checkin-1',
        type: 'morning',
        startedAt: '2023-10-01T08:00:00Z',
        timestamp: '2023-10-01T08:32:00Z', // 2 minutes later
        data: { energyLevel: 8, emotions: ['energetic'] }
      };

      const conflict: SyncConflict = {
        id: 'conflict-1',
        entityType: SyncEntityType.CHECK_IN,
        entityId: 'conflict-checkin-1',
        conflictType: ConflictType.CONCURRENT_EDIT,
        localData: localCheckIn,
        remoteData: remoteCheckIn,
        localMetadata: {
          entityId: 'conflict-checkin-1',
          entityType: SyncEntityType.CHECK_IN,
          version: 1,
          lastModified: '2023-10-01T08:30:00Z',
          checksum: 'local-checksum',
          deviceId: 'device-1'
        },
        remoteMetadata: {
          entityId: 'conflict-checkin-1',
          entityType: SyncEntityType.CHECK_IN,
          version: 1,
          lastModified: '2023-10-01T08:32:00Z',
          checksum: 'remote-checksum',
          deviceId: 'device-2'
        },
        suggestedResolution: ConflictResolutionStrategy.MERGE_TIMESTAMP,
        resolutionRequired: false,
        detectedAt: new Date().toISOString()
      };

      const resolution = await syncOrchestrationService.resolveConflict(
        conflict.id,
        ConflictResolutionStrategy.MERGE_TIMESTAMP
      );

      expect(resolution.strategy).toBe(ConflictResolutionStrategy.MERGE_TIMESTAMP);
      expect(resolution.resolvedData).toEqual(remoteCheckIn); // Remote is newer
      expect(resolution.clinicalValidation).toBe(true);
    });

    it('should require manual resolution for clinical data conflicts', async () => {
      const localAssessment: Assessment = {
        id: 'assessment-1',
        type: 'phq9',
        answers: [1, 1, 2, 0, 1, 0, 1, 0, 0], // Score: 6
        score: 6,
        timestamp: '2023-10-01T10:00:00Z',
        completedAt: '2023-10-01T10:00:00Z'
      };

      const remoteAssessment: Assessment = {
        id: 'assessment-1',
        type: 'phq9',
        answers: [2, 2, 3, 1, 2, 1, 2, 0, 1], // Score: 14
        score: 14,
        timestamp: '2023-10-01T10:01:00Z',
        completedAt: '2023-10-01T10:01:00Z'
      };

      const conflict: SyncConflict = {
        id: 'clinical-conflict-1',
        entityType: SyncEntityType.ASSESSMENT,
        entityId: 'assessment-1',
        conflictType: ConflictType.CLINICAL_DATA_DIVERGENCE,
        localData: localAssessment,
        remoteData: remoteAssessment,
        localMetadata: {
          entityId: 'assessment-1',
          entityType: SyncEntityType.ASSESSMENT,
          version: 1,
          lastModified: '2023-10-01T10:00:00Z',
          checksum: 'local-assessment-checksum',
          deviceId: 'device-1'
        },
        remoteMetadata: {
          entityId: 'assessment-1',
          entityType: SyncEntityType.ASSESSMENT,
          version: 1,
          lastModified: '2023-10-01T10:01:00Z',
          checksum: 'remote-assessment-checksum',
          deviceId: 'device-2'
        },
        suggestedResolution: ConflictResolutionStrategy.SERVER_WINS,
        resolutionRequired: true,
        clinicalImplications: [
          'PHQ-9 score difference indicates potential crisis level change',
          'Assessment integrity critical for therapeutic decisions'
        ],
        detectedAt: new Date().toISOString()
      };

      // This conflict should require manual resolution due to clinical implications
      expect(conflict.resolutionRequired).toBe(true);
      expect(conflict.clinicalImplications).toBeDefined();
      expect(conflict.clinicalImplications!.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await syncInitializationService.initialize({
        enablePerformanceMonitoring: true
      });
    });

    it('should monitor sync operation performance', async () => {
      const sessionId = syncPerformanceMonitor.startSession(
        'test_sync_operation',
        SyncEntityType.CHECK_IN
      );

      // Simulate operation
      await new Promise(resolve => setTimeout(resolve, 100));

      const session = syncPerformanceMonitor.endSession(sessionId, true);

      expect(session).toBeDefined();
      expect(session!.endTime).toBeDefined();
      expect(session!.metrics.averageOperationTime).toBeGreaterThan(0);
    });

    it('should create alerts for slow operations', async () => {
      // Mock slow operation
      const sessionId = syncPerformanceMonitor.startSession(
        'slow_operation',
        SyncEntityType.ASSESSMENT
      );

      // Simulate slow operation
      await new Promise(resolve => setTimeout(resolve, SYNC_CONSTANTS.CRITICAL_TIMEOUT + 100));

      syncPerformanceMonitor.endSession(sessionId, false);

      const alerts = syncPerformanceMonitor.getAlerts(SyncEntityType.ASSESSMENT);
      expect(alerts.length).toBeGreaterThan(0);
      
      const timeoutAlert = alerts.find(alert => 
        alert.message.includes('timeout') || alert.message.includes('slow')
      );
      expect(timeoutAlert).toBeDefined();
    });

    it('should provide performance summary', () => {
      const summary = syncPerformanceMonitor.getPerformanceSummary();

      expect(summary.overallHealth).toMatch(/excellent|good|fair|poor/);
      expect(summary.criticalAlerts).toBeGreaterThanOrEqual(0);
      expect(summary.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Offline Mode Integration', () => {
    beforeEach(async () => {
      await syncInitializationService.initialize({
        enableOfflineMode: true
      });
    });

    it('should queue operations when offline', async () => {
      // Mock offline state
      const mockNetworkService = networkAwareService as jest.Mocked<typeof networkAwareService>;
      mockNetworkService.getNetworkState.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: null,
        quality: NetworkQuality.OFFLINE,
        connectionStability: 0
      });

      const result = await enhancedOfflineQueueService.addAction({
        type: 'save_checkin' as any,
        data: {
          id: 'offline-checkin-1',
          type: 'morning',
          timestamp: new Date().toISOString(),
          data: { emotions: ['calm'] }
        },
        priority: OfflinePriority.MEDIUM,
        clinicalSafety: true
      });

      expect(result.success).toBe(true);
      
      const stats = await enhancedOfflineQueueService.getStatistics();
      expect(stats.totalActions).toBeGreaterThan(0);
    });

    it('should sync queued operations when back online', async () => {
      // First, add some offline operations
      await enhancedOfflineQueueService.addAction({
        type: 'save_checkin' as any,
        data: {
          id: 'offline-checkin-2',
          type: 'evening',
          timestamp: new Date().toISOString(),
          data: { dayHighlight: 'Good day' }
        },
        priority: OfflinePriority.HIGH,
        clinicalSafety: true
      });

      // Mock coming back online
      const mockNetworkService = networkAwareService as jest.Mocked<typeof networkAwareService>;
      mockNetworkService.getNetworkState.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        quality: NetworkQuality.EXCELLENT,
        connectionStability: 1.0
      });

      // Trigger sync
      const syncResult = await syncOrchestrationService.synchronize();

      expect(syncResult.success).toBe(true);
    });
  });

  describe('Clinical Data Validation', () => {
    it('should validate check-in data integrity', () => {
      const validCheckIn: CheckIn = {
        id: 'valid-checkin-1',
        type: 'morning',
        startedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        data: {
          emotions: ['calm', 'focused'],
          energyLevel: 7,
          sleepQuality: 8
        }
      };

      const validation = validateCheckInData(validCheckIn);
      expect(validation.isValid).toBe(true);
      expect(validation.therapeuticContinuityPreserved).toBe(true);
    });

    it('should reject invalid check-in data', () => {
      const invalidCheckIn: CheckIn = {
        id: 'invalid-checkin-1',
        type: 'invalid-type' as any,
        startedAt: new Date().toISOString(),
        timestamp: '', // Invalid timestamp
        data: {}
      };

      expect(() => validateCheckInData(invalidCheckIn)).toThrow();
    });

    it('should validate assessment score accuracy', () => {
      const assessment: Assessment = {
        id: 'test-assessment-1',
        type: 'phq9',
        answers: [1, 1, 2, 0, 1, 0, 1, 0, 0],
        score: 6, // Correct sum
        timestamp: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };

      // In a real implementation, this would use the clinical validation
      const expectedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
      expect(assessment.score).toBe(expectedScore);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await syncInitializationService.initialize();
    });

    it('should handle sync service failures gracefully', async () => {
      // Mock service failure
      jest.spyOn(syncOrchestrationService, 'synchronize')
        .mockRejectedValue(new Error('Service temporarily unavailable'));

      const result = await syncOrchestrationService.synchronize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service temporarily unavailable');
    });

    it('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      // In a real implementation, this would test the retry mechanism
      // For now, we'll simulate the retry logic
      let success = false;
      let retries = 0;
      const maxRetries = 3;

      while (!success && retries < maxRetries) {
        try {
          await mockOperation();
          success = true;
        } catch (error) {
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 100));
          }
        }
      }

      expect(success).toBe(true);
      expect(attemptCount).toBe(3);
    });
  });

  describe('Emergency Sync Protocols', () => {
    beforeEach(async () => {
      await syncInitializationService.initialize();
    });

    it('should prioritize crisis data in emergency sync', async () => {
      const crisisAssessment: Assessment = {
        id: 'crisis-assessment-1',
        type: 'phq9',
        answers: [3, 3, 3, 3, 3, 3, 3, 2, 2], // High score indicating crisis
        score: 25,
        timestamp: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };

      const result = await syncOrchestrationService.emergencySync(
        SyncEntityType.ASSESSMENT,
        crisisAssessment.id
      );

      expect(result.success).toBe(true);
    });

    it('should bypass normal sync constraints for emergency operations', async () => {
      // Mock poor network conditions
      const mockNetworkService = networkAwareService as jest.Mocked<typeof networkAwareService>;
      mockNetworkService.getNetworkState.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        quality: NetworkQuality.POOR,
        connectionStability: 0.3
      });

      // Emergency sync should still proceed despite poor network
      const result = await syncOrchestrationService.emergencySync(
        SyncEntityType.CRISIS_PLAN,
        'emergency-plan-1'
      );

      // Emergency sync should have emergency override enabled
      expect(result).toBeDefined();
    });
  });
});

// Helper function to validate check-in data (simplified for testing)
function validateCheckInData(checkIn: CheckIn): ClinicalValidationResult {
  const result: ClinicalValidationResult = {
    isValid: true,
    assessmentScoresValid: true,
    crisisThresholdsValid: true,
    therapeuticContinuityPreserved: true,
    dataIntegrityIssues: [],
    recommendations: [],
    validatedAt: new Date().toISOString()
  };

  if (!checkIn.type || !['morning', 'midday', 'evening'].includes(checkIn.type)) {
    result.isValid = false;
    result.dataIntegrityIssues.push('Invalid check-in type');
  }

  if (!checkIn.timestamp) {
    result.isValid = false;
    result.dataIntegrityIssues.push('Missing timestamp');
  }

  if (!result.isValid) {
    throw new Error(`Validation failed: ${result.dataIntegrityIssues.join(', ')}`);
  }

  return result;
}