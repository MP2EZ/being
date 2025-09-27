/**
 * Payment Sync Resilience Store Tests - P0-CLOUD Platform
 *
 * Comprehensive test suite for payment sync state resilience including:
 * - State recovery pattern validation
 * - Conflict resolution testing
 * - Persistence resilience verification
 * - Performance optimization validation
 * - Crisis safety integration testing
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePaymentSyncResilienceStore } from '../paymentSyncResilienceStore';
import { PaymentStoreState as PaymentState, CrisisPaymentOverride } from '../../types/payment-canonical';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('../../services/security/EncryptionService', () => ({
  encryptionService: {
    encryptData: jest.fn((data) => Promise.resolve(`encrypted_${data}`)),
    decryptData: jest.fn((data) => Promise.resolve(data.replace('encrypted_', ''))),
    createHash: jest.fn((data) => Promise.resolve(`hash_${data.length}`)),
  },
}));

describe('PaymentSyncResilienceStore', () => {
  let store: any;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();

    // Initialize store
    const { result } = renderHook(() => usePaymentSyncResilienceStore());
    store = result.current;

    // Reset store state
    await act(async () => {
      await store.resetResilienceStore(false);
    });
  });

  describe('State Recovery Patterns', () => {
    const mockPaymentState: PaymentState = {
      customer: null,
      paymentMethods: [],
      activeSubscription: {
        subscriptionId: 'sub_123',
        tier: 'basic',
        status: 'active',
        created: '2024-01-01T00:00:00Z',
        currentPeriodStart: '2024-01-01T00:00:00Z',
        currentPeriodEnd: '2024-02-01T00:00:00Z',
        planId: 'basic_monthly',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_stripe_123'
      },
      availablePlans: [],
      currentPaymentIntent: null,
      paymentInProgress: false,
      lastPaymentError: null,
      crisisMode: false,
      crisisOverride: null,
      securityValidated: true,
      showPaymentSheet: false,
      showSubscriptionSelector: false,
      showPaymentHistory: false,
      loadingCustomer: false,
      loadingPaymentMethods: false,
      loadingSubscription: false,
      loadingPlans: false
    };

    test('should create state checkpoint successfully', async () => {
      await act(async () => {
        const checkpointId = await store.createStateCheckpoint(mockPaymentState, {
          operationType: 'sync',
          operationId: 'test_operation',
          crisisMode: false
        });

        expect(checkpointId).toBeDefined();
        expect(checkpointId).toMatch(/^checkpoint_/);
        expect(store.checkpoints.has(checkpointId)).toBe(true);
      });

      // Verify AsyncStorage backup
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/^checkpoint_/),
        expect.stringMatching(/^encrypted_/)
      );
    });

    test('should detect state corruption accurately', async () => {
      await act(async () => {
        // Test with corrupted state (missing critical fields)
        const corruptedState = {
          ...mockPaymentState,
          customer: undefined,
          crisisMode: undefined
        } as any;

        const corruption = await store.detectStateCorruption(corruptedState);

        expect(corruption).toBeDefined();
        expect(corruption.severity).toBe('medium');
        expect(corruption.affectedFields).toContain('Critical field missing: customer');
        expect(corruption.affectedFields).toContain('Critical field missing: crisisMode');
      });
    });

    test('should detect crisis-related corruption with high severity', async () => {
      await act(async () => {
        // Test crisis mode without override
        const crisisCorruptedState = {
          ...mockPaymentState,
          crisisMode: true,
          crisisOverride: null
        };

        const corruption = await store.detectStateCorruption(crisisCorruptedState);

        expect(corruption).toBeDefined();
        expect(corruption.severity).toBe('high');
        expect(corruption.crisisImpact).toBe(true);
        expect(corruption.affectedFields).toContain('Crisis mode active without override');
      });
    });

    test('should perform automatic state recovery', async () => {
      await act(async () => {
        // First create a checkpoint
        const checkpointId = await store.createStateCheckpoint(mockPaymentState, {
          operationType: 'sync',
          operationId: 'test_operation',
          crisisMode: false
        });

        // Create corruption info
        const corruptionInfo = {
          corruptionId: 'test_corruption',
          detectedAt: new Date().toISOString(),
          corruptionType: 'invalid_structure' as const,
          affectedFields: ['customer'],
          severity: 'medium' as const,
          autoRecoverable: true,
          crisisImpact: false,
          lastValidCheckpoint: checkpointId
        };

        // Perform recovery
        const recovery = await store.performStateRecovery(corruptionInfo, 'checkpoint_rollback');

        expect(recovery.status).toBe('completed');
        expect(recovery.checkpointsUsed).toContain(checkpointId);
        expect(recovery.dataLoss).toBe(false);
        expect(recovery.performanceImpact.recoveryTime).toBeGreaterThan(0);
      });
    });

    test('should rollback to checkpoint successfully', async () => {
      await act(async () => {
        // Create checkpoint
        const checkpointId = await store.createStateCheckpoint(mockPaymentState, {
          operationType: 'sync',
          operationId: 'test_operation',
          crisisMode: false
        });

        // Rollback to checkpoint
        const success = await store.rollbackToCheckpoint(checkpointId, true);

        expect(success).toBe(true);
        expect(store.lastValidationTime).toBeDefined();
      });
    });

    test('should validate payment state integrity comprehensively', async () => {
      await act(async () => {
        // Test valid state
        const validation = await store.validatePaymentStateIntegrity(mockPaymentState, true);

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.recommendedAction).toBe('continue');
      });

      await act(async () => {
        // Test invalid state
        const invalidState = {
          ...mockPaymentState,
          paymentMethods: 'not_an_array' // Invalid type
        } as any;

        const validation = await store.validatePaymentStateIntegrity(invalidState, true);

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(validation.corruptedFields).toContain('paymentMethods');
      });
    });
  });

  describe('Conflict Resolution State', () => {
    test('should detect multi-device state conflicts', async () => {
      await act(async () => {
        const deviceStates = new Map([
          ['device1', {
            paymentState: {
              activeSubscription: { tier: 'basic', status: 'active' }
            },
            lastSync: new Date().toISOString()
          }],
          ['device2', {
            paymentState: {
              activeSubscription: { tier: 'premium', status: 'active' }
            },
            lastSync: new Date(Date.now() - 60000).toISOString()
          }]
        ]);

        const conflicts = await store.detectStateConflicts(deviceStates);

        expect(conflicts.length).toBeGreaterThan(0);
        expect(conflicts[0].conflictType).toBe('subscription_mismatch');
        expect(conflicts[0].deviceConflicts).toHaveLength(2);
        expect(conflicts[0].autoResolvable).toBe(true);
      });
    });

    test('should resolve conflicts using last-writer-wins strategy', async () => {
      await act(async () => {
        const conflict = {
          conflictId: 'test_conflict',
          detectedAt: new Date().toISOString(),
          conflictType: 'subscription_mismatch' as const,
          deviceConflicts: [
            {
              deviceId: 'device1',
              lastSyncTime: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
              paymentState: { activeSubscription: { tier: 'basic' } },
              confidence: 0.8
            },
            {
              deviceId: 'device2',
              lastSyncTime: new Date().toISOString(), // Now
              paymentState: { activeSubscription: { tier: 'premium' } },
              confidence: 0.9
            }
          ],
          resolutionStrategy: 'last_writer_wins' as const,
          crisisImpact: false,
          autoResolvable: true
        };

        const resolution = await store.resolveStateConflict(conflict);

        expect(resolution.resolvedAt).toBeDefined();
        expect(resolution.strategy).toBe('last_writer_wins');
        expect(resolution.winningState.activeSubscription?.tier).toBe('premium');
        expect(resolution.devicesUpdated).toContain('device1');
        expect(resolution.performanceMetrics.resolutionTime).toBeGreaterThan(0);
      });
    });

    test('should synchronize subscription tier across devices', async () => {
      await act(async () => {
        const result = await store.synchronizeSubscriptionTier(
          'premium',
          ['device1', 'device2', 'device3'],
          false
        );

        expect(result.success).toBe(true);
        expect(result.devicesUpdated).toContain('device1');
        expect(result.devicesUpdated).toContain('device2');
        expect(result.devicesUpdated).toContain('device3');
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should validate payment status consistency', async () => {
      await act(async () => {
        const consistency = await store.validatePaymentStatusConsistency([
          'device1',
          'device2',
          'device3'
        ]);

        expect(consistency.consistent).toBeDefined();
        expect(consistency.inconsistencies).toBeDefined();
        expect(consistency.requiresResolution).toBeDefined();
      });
    });
  });

  describe('Persistence Resilience', () => {
    test('should perform incremental state updates', async () => {
      await act(async () => {
        const fieldUpdates = [
          {
            field: 'activeSubscription.tier',
            oldValue: 'basic',
            newValue: 'premium',
            validationPassed: true
          }
        ];

        const update = await store.performIncrementalUpdate(
          'subscription_change',
          fieldUpdates,
          true
        );

        expect(update.updateId).toBeDefined();
        expect(update.updateType).toBe('subscription_change');
        expect(update.fieldUpdates).toEqual(expect.arrayContaining([
          expect.objectContaining({
            field: 'activeSubscription.tier',
            newValue: 'premium',
            validationPassed: true
          })
        ]));
        expect(update.checksum).toBeDefined();
      });

      // Verify AsyncStorage backup
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/^update_/),
        expect.stringMatching(/^encrypted_/)
      );
    });

    test('should create encrypted state backup', async () => {
      await act(async () => {
        const backup = await store.createStateBackup(mockPaymentState, true);

        expect(backup.backupId).toBeDefined();
        expect(backup.backupSize).toBeGreaterThan(0);
        expect(backup.encrypted).toBe(true);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/^backup_/),
        expect.stringMatching(/^encrypted_/)
      );
    });

    test('should restore state from backup', async () => {
      await act(async () => {
        // First create a backup
        const backup = await store.createStateBackup(mockPaymentState, true);

        // Mock AsyncStorage to return the backup
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
          `encrypted_${JSON.stringify(mockPaymentState)}`
        );

        // Restore from backup
        const restoration = await store.restoreFromBackup(backup.backupId, true);

        expect(restoration.success).toBe(true);
        expect(restoration.restoredState).toBeDefined();
        expect(restoration.validationErrors).toHaveLength(0);
        expect(restoration.dataLoss).toBe(false);
      });
    });

    test('should validate state hydration resilience', async () => {
      await act(async () => {
        const hydrationValidation = await store.validateStateHydration({
          enableValidation: true,
          fallbackToCheckpoint: true,
          checksumValidation: true
        });

        expect(hydrationValidation.hydrationSuccessful).toBeDefined();
        expect(hydrationValidation.performanceMetrics).toBeDefined();
        expect(hydrationValidation.performanceMetrics.hydrationTime).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance State Management', () => {
    test('should initialize lazy loading configuration', async () => {
      await act(async () => {
        await store.initializeLazyLoading({
          enableLazyLoading: true,
          compressionEnabled: true,
          compressionThreshold: 512
        });

        expect(store.lazyLoadingConfig.enableLazyLoading).toBe(true);
        expect(store.lazyLoadingConfig.compressionEnabled).toBe(true);
        expect(store.lazyLoadingConfig.compressionThreshold).toBe(512);
      });
    });

    test('should compress payment history data', async () => {
      await act(async () => {
        const compression = await store.compressPaymentHistory(2);

        expect(compression.originalSize).toBeGreaterThan(0);
        expect(compression.compressedSize).toBeGreaterThan(0);
        expect(compression.compressionRatio).toBeGreaterThanOrEqual(1);
        expect(compression.itemsCompressed).toBeGreaterThan(0);
      });
    });

    test('should start and stop background validation', async () => {
      await act(async () => {
        // Start background validation
        await store.startBackgroundValidation({
          enabled: true,
          validationInterval: 5000,
          crisisValidationPriority: true
        });

        expect(store.backgroundValidationConfig.enabled).toBe(true);
        expect(store._monitoringIntervals.validation).toBeDefined();

        // Stop background validation
        await store.stopBackgroundValidation();

        expect(store._monitoringIntervals.validation).toBeNull();
      });
    });

    test('should optimize memory usage effectively', async () => {
      await act(async () => {
        // Add some data to optimize
        await store.createStateCheckpoint(mockPaymentState, {
          operationType: 'sync',
          operationId: 'test',
          crisisMode: false
        });

        const optimization = await store.optimizeMemoryUsage();

        expect(optimization.memoryFreed).toBeGreaterThanOrEqual(0);
        expect(optimization.performanceImprovement).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Crisis Safety Integration', () => {
    const mockCrisisOverride: CrisisPaymentOverride = {
      overrideId: 'crisis_test_123',
      reason: 'Test crisis situation',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      therapeuticAccess: true,
      emergencyAccess: true,
      bypassSubscription: true
    };

    test('should enable crisis mode with override', async () => {
      await act(async () => {
        await store.enableCrisisMode(mockCrisisOverride, true);

        expect(store.crisisOverrides.has(mockCrisisOverride.overrideId)).toBe(true);
        expect(store.emergencyRecoveryEnabled).toBe(true);
        expect(store.therapeuticContinuityMode).toBe(true);
      });
    });

    test('should disable crisis mode and validate state', async () => {
      await act(async () => {
        // First enable crisis mode
        await store.enableCrisisMode(mockCrisisOverride, true);

        // Then disable it
        await store.disableCrisisMode(true);

        expect(store.therapeuticContinuityMode).toBe(false);
        // Override should remain until expiration
        expect(store.crisisOverrides.has(mockCrisisOverride.overrideId)).toBe(true);
      });
    });

    test('should ensure therapeutic continuity based on crisis level', async () => {
      await act(async () => {
        const continuity = await store.ensureTherapeuticContinuity('critical');

        expect(continuity.continuityMaintained).toBe(true);
        expect(continuity.overridesApplied).toHaveLength(1);
        expect(continuity.therapeuticFeaturesAvailable).toContain('breathing_exercises');
        expect(continuity.therapeuticFeaturesAvailable).toContain('crisis_button');
        expect(continuity.restrictedFeatures).toHaveLength(0); // Critical level = all features
      });
    });

    test('should provide limited features for low crisis level', async () => {
      await act(async () => {
        const continuity = await store.ensureTherapeuticContinuity('low');

        expect(continuity.continuityMaintained).toBe(true);
        expect(continuity.therapeuticFeaturesAvailable).toHaveLength(2);
        expect(continuity.restrictedFeatures).toContain('crisis_button');
        expect(continuity.restrictedFeatures).toContain('emergency_contacts');
      });
    });
  });

  describe('Monitoring and Diagnostics', () => {
    test('should generate comprehensive resilience diagnostics', async () => {
      await act(async () => {
        const diagnostics = await store.generateResilienceDiagnostics();

        expect(diagnostics.stateHealth).toMatch(/^(excellent|good|fair|poor|critical)$/);
        expect(diagnostics.checksumValidation).toBeDefined();
        expect(diagnostics.conflictsDetected).toBeGreaterThanOrEqual(0);
        expect(diagnostics.recoveryOperationsActive).toBeGreaterThanOrEqual(0);
        expect(diagnostics.performanceMetrics).toBeDefined();
        expect(diagnostics.recommendations).toBeInstanceOf(Array);
        expect(diagnostics.criticalIssues).toBeInstanceOf(Array);
      });
    });

    test('should cleanup old resilience data', async () => {
      await act(async () => {
        // Create some data to cleanup
        await store.createStateCheckpoint(mockPaymentState, {
          operationType: 'sync',
          operationId: 'test',
          crisisMode: false
        });

        const cleanup = await store.cleanupResilienceData(7);

        expect(cleanup.checkpointsRemoved).toBeGreaterThanOrEqual(0);
        expect(cleanup.historyItemsRemoved).toBeGreaterThanOrEqual(0);
        expect(cleanup.spaceFreed).toBeGreaterThanOrEqual(0);
        expect(cleanup.performanceImprovement).toBeGreaterThanOrEqual(0);
      });
    });

    test('should reset resilience store while preserving crisis overrides', async () => {
      await act(async () => {
        // Add some data
        await store.enableCrisisMode(mockCrisisOverride, true);
        await store.createStateCheckpoint(mockPaymentState, {
          operationType: 'sync',
          operationId: 'test',
          crisisMode: false
        });

        // Reset with crisis preservation
        await store.resetResilienceStore(true);

        // Crisis overrides should be preserved
        expect(store.crisisOverrides.has(mockCrisisOverride.overrideId)).toBe(true);

        // Other data should be cleared
        expect(store.checkpoints.size).toBe(0);
        expect(store.corruptionHistory).toHaveLength(0);
      });
    });

    test('should reset resilience store completely', async () => {
      await act(async () => {
        // Add some data
        await store.enableCrisisMode(mockCrisisOverride, true);
        await store.createStateCheckpoint(mockPaymentState, {
          operationType: 'sync',
          operationId: 'test',
          crisisMode: false
        });

        // Reset without preservation
        await store.resetResilienceStore(false);

        // Everything should be cleared
        expect(store.crisisOverrides.size).toBe(0);
        expect(store.checkpoints.size).toBe(0);
        expect(store.corruptionHistory).toHaveLength(0);
        expect(store.emergencyRecoveryEnabled).toBe(false);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle corrupted checkpoint gracefully', async () => {
      await act(async () => {
        // Mock corrupted AsyncStorage data
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('corrupted_data');

        const success = await store.rollbackToCheckpoint('nonexistent_checkpoint', false);

        expect(success).toBe(false);
      });
    });

    test('should handle validation errors in incremental updates', async () => {
      await act(async () => {
        const invalidUpdates = [
          {
            field: '', // Empty field name
            oldValue: 'test',
            newValue: 'new_test',
            validationPassed: false
          }
        ];

        await expect(
          store.performIncrementalUpdate('subscription_change', invalidUpdates, true)
        ).rejects.toThrow();

        // Verify failure count increased
        expect(store.persistenceHealth.consecutiveFailures).toBeGreaterThan(0);
      });
    });

    test('should handle crisis mode validation errors', async () => {
      await act(async () => {
        const invalidUpdates = [
          {
            field: 'crisisMode',
            oldValue: true,
            newValue: false,
            validationPassed: false
          }
        ];

        // Enable crisis mode first
        await store.enableCrisisMode(mockCrisisOverride, true);

        // Try to disable crisis mode with active override
        await expect(
          store.performIncrementalUpdate('crisis_override', invalidUpdates, true)
        ).rejects.toThrow('Cannot disable crisis mode with active overrides');
      });
    });

    test('should handle memory optimization failures gracefully', async () => {
      await act(async () => {
        // Should not throw even if optimization encounters issues
        const optimization = await store.optimizeMemoryUsage();

        expect(optimization).toBeDefined();
        expect(optimization.memoryFreed).toBeGreaterThanOrEqual(0);
      });
    });

    test('should handle background validation failures gracefully', async () => {
      await act(async () => {
        // Start background validation
        await store.startBackgroundValidation({
          enabled: true,
          validationInterval: 100 // Very short interval for testing
        });

        // Wait a bit for background process
        await new Promise(resolve => setTimeout(resolve, 150));

        // Stop validation
        await store.stopBackgroundValidation();

        // Should complete without errors
        expect(store._monitoringIntervals.validation).toBeNull();
      });
    });
  });
});

describe('Resilience Store Hooks', () => {
  test('useStateRecoveryMonitor should return recovery data', () => {
    const { result } = renderHook(() => {
      const store = usePaymentSyncResilienceStore();
      return {
        activeRecoveries: store.activeRecoveryOperations,
        corruptionHistory: store.corruptionHistory,
        averageRecoveryTime: store.performanceMetrics.averageRecoveryTime,
        emergencyRecoveryEnabled: store.emergencyRecoveryEnabled
      };
    });

    expect(result.current.activeRecoveries).toBeInstanceOf(Map);
    expect(result.current.corruptionHistory).toBeInstanceOf(Array);
    expect(result.current.averageRecoveryTime).toBeGreaterThanOrEqual(0);
    expect(typeof result.current.emergencyRecoveryEnabled).toBe('boolean');
  });

  test('useConflictResolutionMonitor should return conflict data', () => {
    const { result } = renderHook(() => {
      const store = usePaymentSyncResilienceStore();
      return {
        activeConflicts: store.activeConflicts,
        resolutionHistory: store.conflictResolutionHistory,
        averageResolutionTime: store.performanceMetrics.averageConflictResolutionTime,
        lastConflictCheck: store.lastConflictCheck
      };
    });

    expect(result.current.activeConflicts).toBeInstanceOf(Map);
    expect(result.current.resolutionHistory).toBeInstanceOf(Array);
    expect(result.current.averageResolutionTime).toBeGreaterThanOrEqual(0);
  });

  test('useCrisisSafetyMonitor should return crisis safety data', () => {
    const { result } = renderHook(() => {
      const store = usePaymentSyncResilienceStore();
      return {
        crisisOverrides: store.crisisOverrides,
        emergencyRecoveryEnabled: store.emergencyRecoveryEnabled,
        therapeuticContinuityMode: store.therapeuticContinuityMode
      };
    });

    expect(result.current.crisisOverrides).toBeInstanceOf(Map);
    expect(typeof result.current.emergencyRecoveryEnabled).toBe('boolean');
    expect(typeof result.current.therapeuticContinuityMode).toBe('boolean');
  });
});