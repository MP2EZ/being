/**
 * Real-Time State Sync Integration Tests - Being. MBCT App
 *
 * Comprehensive testing of real-time state synchronization including:
 * - WebSocket-style live updates across all stores
 * - Optimistic updates with intelligent conflict resolution
 * - Crisis-aware sync prioritization and batching
 * - Performance monitoring with SLA compliance tracking
 * - Offline queue management with encrypted persistence
 * - Multi-store orchestration for payment, subscription, and crisis state
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRealTimeWebhookSync } from '../../src/store/sync/real-time-webhook-sync';
import { useOptimisticUpdateManager } from '../../src/store/sync/optimistic-update-manager';
import { useEncryptedWebhookStorage } from '../../src/store/persistence/encrypted-webhook-storage';
import { useWebhookPerformanceStore } from '../../src/store/monitoring/webhook-performance-store';
import {
  WebhookEvent,
  WebhookProcessingResult,
  CRISIS_RESPONSE_TIME_MS,
  NORMAL_RESPONSE_TIME_MS
} from '../../src/types/webhooks/webhook-events';
import { performance } from 'perf_hooks';

// Mock comprehensive store ecosystem
const mockStores = {
  payment: {
    state: { subscription: { status: 'active' }, gracePeriod: { active: false } },
    updateState: jest.fn(),
    syncFromWebhook: jest.fn(),
    handleConflict: jest.fn(),
    validateState: jest.fn()
  },
  user: {
    state: { profile: { tier: 'premium' }, therapeuticAccess: true },
    updateState: jest.fn(),
    syncFromWebhook: jest.fn(),
    handleConflict: jest.fn(),
    validateState: jest.fn()
  },
  crisis: {
    state: { level: 'none', emergencyAccess: true, protectionActive: false },
    updateState: jest.fn(),
    syncFromWebhook: jest.fn(),
    handleConflict: jest.fn(),
    validateState: jest.fn()
  },
  features: {
    state: { premium: true, crisisSupport: true, offline: true },
    updateState: jest.fn(),
    syncFromWebhook: jest.fn(),
    handleConflict: jest.fn(),
    validateState: jest.fn()
  }
};

// Mock optimistic update manager
const mockOptimisticManager = {
  createOptimisticUpdate: jest.fn(),
  commitOptimisticUpdate: jest.fn(),
  rollbackOptimisticUpdate: jest.fn(),
  getPendingUpdates: jest.fn().mockReturnValue([]),
  clearPendingUpdates: jest.fn(),
  hasConflicts: jest.fn().mockReturnValue(false),
  resolveConflicts: jest.fn()
};

// Mock encrypted storage
const mockEncryptedStorage = {
  storeSyncEvent: jest.fn(),
  retrieveSyncEvents: jest.fn().mockResolvedValue([]),
  clearExpiredEvents: jest.fn(),
  encryptSyncData: jest.fn(),
  decryptSyncData: jest.fn(),
  validateIntegrity: jest.fn().mockReturnValue(true)
};

// Mock performance monitoring
const mockPerformanceStore = {
  trackSyncOperation: jest.fn(),
  getSyncMetrics: jest.fn().mockReturnValue({
    averageTime: 150,
    successRate: 98.5,
    throughput: 25,
    violations: 0
  }),
  checkSLACompliance: jest.fn().mockReturnValue(true),
  optimizePerformance: jest.fn(),
  generateReport: jest.fn()
};

jest.mock('../../src/store/sync/optimistic-update-manager', () => ({
  useOptimisticUpdateManager: () => mockOptimisticManager
}));

jest.mock('../../src/store/persistence/encrypted-webhook-storage', () => ({
  useEncryptedWebhookStorage: () => mockEncryptedStorage
}));

jest.mock('../../src/store/monitoring/webhook-performance-store', () => ({
  useWebhookPerformanceStore: () => mockPerformanceStore
}));

describe('Real-Time State Sync Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset all mock store states
    Object.values(mockStores).forEach(store => {
      store.updateState.mockClear();
      store.syncFromWebhook.mockClear();
      store.handleConflict.mockClear();
      store.validateState.mockClear();
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('WebSocket-Style Live Updates', () => {
    it('should provide real-time updates across all connected stores', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();

        // Connect all stores with real-time configuration
        Object.entries(mockStores).forEach(([storeId, store]) => {
          result.current.connectStore(storeId, store, {
            syncPriority: 'high',
            batchingEnabled: false, // Real-time mode
            syncEnabled: true,
            batchTimeout: 100 // Fast real-time updates
          });
        });
      });

      // Enable real-time mode
      act(() => {
        result.current.configureSync({
          realTimeMode: true,
          syncInterval: 100 // 100ms for near real-time
        });
      });

      // Create rapid sequence of state changes
      const realTimeUpdates = [
        { type: 'subscription_status_change', data: { status: 'past_due' }, stores: ['payment', 'user'] },
        { type: 'crisis_level_change', data: { level: 'medium' }, stores: ['crisis', 'features'] },
        { type: 'payment_status_update', data: { gracePeriod: true }, stores: ['payment'] },
        { type: 'emergency_access_granted', data: { emergencyAccess: true }, stores: ['crisis', 'user'] }
      ];

      const startTime = performance.now();
      const eventIds: string[] = [];

      // Queue all updates rapidly
      realTimeUpdates.forEach(({ type, data, stores }) => {
        const eventId = result.current.queueSyncEvent(
          type as any,
          data,
          stores,
          'immediate' // Real-time priority
        );
        eventIds.push(eventId);
      });

      // Process real-time queue
      await act(async () => {
        await result.current.processEventQueue();
      });

      const totalSyncTime = performance.now() - startTime;

      // Validate real-time performance (<500ms for all updates)
      expect(totalSyncTime).toBeLessThan(500);

      // Validate all events completed
      expect(result.current.completedEvents.size).toBe(4);
      expect(result.current.eventQueue.length).toBe(0);

      // Validate real-time store updates
      expect(mockStores.payment.syncFromWebhook).toHaveBeenCalledTimes(2);
      expect(mockStores.user.syncFromWebhook).toHaveBeenCalledTimes(2);
      expect(mockStores.crisis.syncFromWebhook).toHaveBeenCalledTimes(2);
      expect(mockStores.features.syncFromWebhook).toHaveBeenCalledTimes(1);

      // Validate sync interval optimization for real-time
      expect(result.current.syncInterval).toBeLessThanOrEqual(500);
    });

    it('should handle concurrent real-time updates with proper ordering', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
        result.current.connectStore('crisis', mockStores.crisis, { syncPriority: 'immediate' });
      });

      // Create concurrent updates with different priorities
      const concurrentUpdates = [
        { type: 'payment_status_update', priority: 'normal', timestamp: Date.now() },
        { type: 'crisis_level_change', priority: 'immediate', timestamp: Date.now() + 1 },
        { type: 'subscription_status_change', priority: 'high', timestamp: Date.now() + 2 },
        { type: 'emergency_access_granted', priority: 'immediate', timestamp: Date.now() + 3 }
      ];

      const processingOrder: Array<{ type: string; processedAt: number }> = [];

      // Mock sync handlers to track processing order
      mockStores.payment.syncFromWebhook.mockImplementation(async (data) => {
        processingOrder.push({ type: data.type || 'payment', processedAt: Date.now() });
        return Promise.resolve();
      });

      mockStores.crisis.syncFromWebhook.mockImplementation(async (data) => {
        processingOrder.push({ type: data.type || 'crisis', processedAt: Date.now() });
        return Promise.resolve();
      });

      // Queue all updates simultaneously
      const eventIds = concurrentUpdates.map(({ type, priority }) =>
        result.current.queueSyncEvent(
          type as any,
          { type, timestamp: Date.now() },
          type.includes('crisis') ? ['crisis'] : ['payment'],
          priority as any
        )
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate immediate priority events were processed first
      const immediateEvents = processingOrder.filter(p =>
        p.type.includes('crisis') || p.type.includes('emergency')
      );
      const normalEvents = processingOrder.filter(p =>
        p.type.includes('payment') && !p.type.includes('emergency')
      );

      if (immediateEvents.length > 0 && normalEvents.length > 0) {
        expect(immediateEvents[0].processedAt).toBeLessThanOrEqual(normalEvents[0].processedAt);
      }

      // Validate all updates completed
      expect(result.current.completedEvents.size).toBe(4);
    });

    it('should maintain WebSocket-style connection state', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
      });

      // Validate initial connection state
      expect(result.current.syncActive).toBe(true);
      expect(result.current.realTimeMode).toBe(true);
      expect(result.current.globalSyncHealth).toBe('healthy');

      // Simulate connection issues
      act(() => {
        result.current.configureSync({
          globalSyncHealth: 'degraded'
        });
      });

      expect(result.current.globalSyncHealth).toBe('degraded');

      // Test connection recovery
      const eventId = result.current.queueSyncEvent(
        'subscription_status_change',
        { status: 'active' },
        ['payment'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate automatic health recovery after successful sync
      expect(result.current.completedEvents.size).toBe(1);
    });
  });

  describe('Optimistic Updates with Conflict Resolution', () => {
    it('should handle optimistic updates with intelligent rollback', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, {
          conflictResolution: 'merge'
        });
      });

      // Create optimistic update
      const optimisticData = {
        subscription: { status: 'active' },
        payment: { lastUpdated: Date.now() },
        optimistic: true
      };

      mockOptimisticManager.createOptimisticUpdate.mockReturnValue('opt_update_001');
      mockStores.payment.syncFromWebhook.mockRejectedValueOnce(
        new Error('Temporary sync failure')
      );

      const eventId = result.current.queueSyncEvent(
        'subscription_status_change',
        optimisticData,
        ['payment'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate optimistic update was created
      expect(mockOptimisticManager.createOptimisticUpdate).toHaveBeenCalledWith(
        'payment',
        optimisticData
      );

      // Validate rollback was triggered on failure
      expect(mockOptimisticManager.rollbackOptimisticUpdate).toHaveBeenCalledWith('opt_update_001');

      // Simulate successful retry
      mockStores.payment.syncFromWebhook.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.retryFailedEvents();
        await result.current.processEventQueue();
      });

      // Validate optimistic update was committed
      expect(mockOptimisticManager.commitOptimisticUpdate).toHaveBeenCalled();
    });

    it('should resolve conflicts prioritizing user safety and therapeutic continuity', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, {
          conflictResolution: 'merge'
        });
      });

      // Create conflict scenario
      const localState = {
        subscription: { status: 'active' },
        therapeuticAccess: true,
        emergencyFeatures: ['crisis_button', 'hotline']
      };

      const remoteState = {
        subscription: { status: 'canceled' },
        therapeuticAccess: false, // Conflict: would remove access
        emergencyFeatures: [] // Conflict: would remove emergency features
      };

      // Detect conflict
      const conflictId = result.current.detectSyncConflict('payment', localState, remoteState);

      expect(conflictId).toBeTruthy();
      expect(result.current.activeConflicts.size).toBe(1);

      // Mock conflict resolution prioritizing safety
      mockOptimisticManager.resolveConflicts.mockResolvedValue({
        resolution: 'therapeutic_safety_priority',
        resolvedState: {
          subscription: { status: 'canceled' }, // Accept status change
          therapeuticAccess: true, // Preserve therapeutic access
          emergencyFeatures: ['crisis_button', 'hotline'], // Preserve emergency features
          gracePeriodActivated: true // Activate grace period for continuity
        }
      });

      await act(async () => {
        await result.current.resolveSyncConflict(conflictId!, 'merge');
      });

      // Validate conflict was resolved with safety priority
      expect(result.current.activeConflicts.size).toBe(0);
      expect(mockStores.payment.syncFromWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          resolvedState: expect.objectContaining({
            therapeuticAccess: true, // Safety preserved
            emergencyFeatures: expect.arrayContaining(['crisis_button']) // Emergency preserved
          })
        })
      );
    });

    it('should auto-resolve simple conflicts without user intervention', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, {
          conflictResolution: 'merge'
        });
      });

      // Create multiple auto-resolvable conflicts
      const conflicts = [
        {
          local: { subscription: { status: 'active' }, lastSync: 1000 },
          remote: { subscription: { status: 'active' }, lastSync: 2000 }
        },
        {
          local: { payment: { amount: 2999 }, metadata: { old: true } },
          remote: { payment: { amount: 2999 }, metadata: { new: true } }
        }
      ];

      const conflictIds = conflicts.map(({ local, remote }) =>
        result.current.detectSyncConflict('payment', local, remote)
      );

      expect(result.current.activeConflicts.size).toBe(2);

      // Mock auto-resolution
      mockOptimisticManager.hasConflicts.mockReturnValue(true);
      mockOptimisticManager.resolveConflicts.mockResolvedValue({
        autoResolved: 2,
        manualRequired: 0
      });

      await act(async () => {
        await result.current.autoResolveConflicts();
      });

      // Validate auto-resolution completed
      expect(result.current.activeConflicts.size).toBe(0);
      expect(mockOptimisticManager.resolveConflicts).toHaveBeenCalled();
    });

    it('should handle rapid optimistic updates without state corruption', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
      });

      // Create rapid sequence of optimistic updates
      const rapidUpdates = Array.from({ length: 20 }, (_, i) => ({
        subscription: { status: i % 2 === 0 ? 'active' : 'past_due' },
        timestamp: Date.now() + i,
        optimistic: true
      }));

      const optimisticIds = rapidUpdates.map((_, i) => `opt_${i}`);
      mockOptimisticManager.createOptimisticUpdate
        .mockImplementation((storeId, data) => optimisticIds[rapidUpdates.indexOf(data)]);

      const eventIds = rapidUpdates.map((data, i) =>
        result.current.queueSyncEvent(
          'subscription_status_change',
          data,
          ['payment'],
          'high'
        )
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate all optimistic updates were created
      expect(mockOptimisticManager.createOptimisticUpdate).toHaveBeenCalledTimes(20);

      // Validate state integrity
      expect(result.current.completedEvents.size).toBe(20);
      expect(result.current.syncPerformanceMetrics.successfulSyncs).toBe(20);
    });
  });

  describe('Crisis-Aware Sync Prioritization', () => {
    it('should prioritize crisis events with <200ms processing', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockStores.crisis, { syncPriority: 'immediate' });
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
      });

      // Activate crisis mode
      await act(async () => {
        await result.current.activateCrisisSync('critical');
      });

      expect(result.current.crisisSyncState.crisisMode).toBe(true);
      expect(result.current.crisisSyncState.crisisLevel).toBe('critical');

      // Create mixed priority events
      const events = [
        { type: 'payment_status_update', priority: 'normal', stores: ['payment'] },
        { type: 'crisis_level_change', priority: 'immediate', stores: ['crisis'], crisis: true },
        { type: 'subscription_status_change', priority: 'high', stores: ['payment'] },
        { type: 'emergency_access_granted', priority: 'immediate', stores: ['crisis'], crisis: true }
      ];

      const startTime = performance.now();
      const eventIds = events.map(({ type, priority, stores, crisis }) =>
        result.current.queueSyncEvent(
          type as any,
          { crisis: crisis || false, timestamp: Date.now() },
          stores,
          priority as any
        )
      );

      // Process with crisis prioritization
      await act(async () => {
        await result.current.prioritizeCrisisEvents();
        await result.current.processEventQueue();
      });

      const processingTime = performance.now() - startTime;

      // Validate crisis response time
      expect(processingTime).toBeLessThan(CRISIS_RESPONSE_TIME_MS);

      // Validate crisis events were prioritized
      const completedEvents = Array.from(result.current.completedEvents.values());
      const crisisEvents = completedEvents.filter(e => e.data.crisis);
      const normalEvents = completedEvents.filter(e => !e.data.crisis);

      if (crisisEvents.length > 0 && normalEvents.length > 0) {
        expect(crisisEvents[0].timestamp).toBeLessThanOrEqual(normalEvents[0].timestamp);
      }
    });

    it('should preserve therapeutic continuity during crisis sync', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockStores.crisis, { syncPriority: 'immediate' });
        result.current.connectStore('user', mockStores.user, { syncPriority: 'high' });
      });

      // Trigger therapeutic continuity preservation
      await act(async () => {
        await result.current.preserveTherapeuticSyncContinuity();
      });

      expect(result.current.crisisSyncState.therapeuticContinuityProtected).toBe(true);

      // Validate therapeutic continuity events were queued
      expect(result.current.eventQueue.length).toBeGreaterThan(0);

      const therapeuticEvents = result.current.eventQueue.filter(
        event => event.type === 'therapeutic_continuity_update'
      );

      expect(therapeuticEvents.length).toBe(2); // One for each connected store
      expect(therapeuticEvents.every(event => event.priority === 'immediate')).toBe(true);
    });

    it('should activate emergency bypass during system failures', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('crisis', mockStores.crisis, { syncPriority: 'immediate' });
      });

      // Simulate system failure requiring emergency bypass
      mockStores.crisis.syncFromWebhook.mockRejectedValue(
        new Error('Crisis system temporarily unavailable')
      );

      const emergencyEventId = result.current.queueSyncEvent(
        'emergency_access_granted',
        {
          bypassRequired: true,
          therapeuticContinuity: true,
          emergencyFeatures: ['crisis_button', 'hotline', 'chat']
        },
        ['crisis'],
        'immediate'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate emergency bypass activation
      expect(result.current.crisisSyncState.emergencyBypassActive).toBe(true);

      // Validate retry with bypass
      mockStores.crisis.syncFromWebhook.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.retryFailedEvents();
        await result.current.processEventQueue();
      });

      expect(result.current.completedEvents.size).toBe(1);
    });
  });

  describe('Performance Monitoring and SLA Compliance', () => {
    it('should track and enforce SLA compliance for all sync operations', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
      });

      // Process multiple events to generate performance metrics
      const events = Array.from({ length: 10 }, (_, i) => ({
        type: 'subscription_status_change',
        data: { iteration: i, timestamp: Date.now() }
      }));

      const startTimes: number[] = [];
      const endTimes: number[] = [];

      // Mock performance tracking
      mockPerformanceStore.trackSyncOperation.mockImplementation((eventId, startTime, endTime, success) => {
        startTimes.push(startTime);
        endTimes.push(endTime);
      });

      for (const event of events) {
        const eventId = result.current.queueSyncEvent(
          event.type as any,
          event.data,
          ['payment'],
          'normal'
        );
      }

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate performance tracking
      expect(mockPerformanceStore.trackSyncOperation).toHaveBeenCalledTimes(10);

      // Validate SLA compliance
      const processingTimes = endTimes.map((end, i) => end - startTimes[i]);
      const slaViolations = processingTimes.filter(time => time > NORMAL_RESPONSE_TIME_MS);

      expect(slaViolations.length).toBe(0); // No SLA violations

      // Check overall performance metrics
      const metrics = result.current.syncPerformanceMetrics;
      expect(metrics.averageSyncTime).toBeLessThan(NORMAL_RESPONSE_TIME_MS);
      expect(metrics.successfulSyncs).toBe(10);
      expect(metrics.failedSyncs).toBe(0);
    });

    it('should automatically optimize performance based on metrics', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, {
          batchSize: 5,
          batchTimeout: 1000
        });
      });

      // Simulate performance degradation
      act(() => {
        result.current.trackSyncPerformance('test_event', Date.now() - 3000, Date.now(), true);
      });

      // Trigger performance optimization
      await act(async () => {
        await result.current.optimizeSyncPerformance();
      });

      // Validate sync interval was adjusted for poor performance
      expect(result.current.syncInterval).toBeGreaterThan(1000);

      // Simulate performance improvement
      act(() => {
        result.current.trackSyncPerformance('test_event', Date.now() - 300, Date.now(), true);
      });

      await act(async () => {
        await result.current.optimizeSyncPerformance();
      });

      // Validate sync interval was optimized for good performance
      expect(result.current.syncInterval).toBeLessThan(1000);
    });

    it('should generate comprehensive performance reports', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
      });

      // Generate varied performance data
      const performanceScenarios = [
        { duration: 100, success: true, crisis: false },
        { duration: 150, success: true, crisis: false },
        { duration: 50, success: true, crisis: true },
        { duration: 300, success: false, crisis: false },
        { duration: 80, success: true, crisis: true }
      ];

      performanceScenarios.forEach(({ duration, success, crisis }, i) => {
        const startTime = Date.now() - duration;
        const endTime = Date.now();
        result.current.trackSyncPerformance(`perf_test_${i}`, startTime, endTime, success);
      });

      // Get sync health report
      const healthReport = result.current.getSyncHealth();

      expect(healthReport.metrics.successRate).toBeGreaterThan(0);
      expect(healthReport.metrics.averageTime).toBeGreaterThan(0);
      expect(healthReport.metrics.throughput).toBeGreaterThanOrEqual(0);

      // Validate health assessment
      expect(healthReport.healthy).toBeDefined();
      expect(Array.isArray(healthReport.issues)).toBe(true);
    });
  });

  describe('Offline Queue Management', () => {
    it('should queue events during offline mode and sync on recovery', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
      });

      // Simulate going offline
      await act(async () => {
        await result.current.handleOfflineMode();
      });

      expect(result.current.networkStatus).toBe('offline');

      // Queue events while offline
      const offlineEvents = [
        { type: 'subscription_status_change', data: { status: 'offline_update_1' } },
        { type: 'payment_status_update', data: { status: 'offline_update_2' } },
        { type: 'crisis_level_change', data: { level: 'low', offline: true } }
      ];

      offlineEvents.forEach(({ type, data }) => {
        result.current.queueSyncEvent(
          type as any,
          data,
          ['payment'],
          'high'
        );
      });

      // Validate events were queued offline
      expect(result.current.offlineSyncQueue.length).toBe(3);
      expect(result.current.eventQueue.length).toBe(0);

      // Mock encrypted storage of offline events
      mockEncryptedStorage.storeSyncEvent.mockResolvedValue();

      // Simulate network recovery
      await act(async () => {
        await result.current.handleOnlineRecovery();
      });

      expect(result.current.networkStatus).toBe('online');
      expect(result.current.offlineSyncQueue.length).toBe(0);

      // Validate offline events were processed
      expect(result.current.completedEvents.size).toBe(3);
    });

    it('should encrypt offline sync data for HIPAA compliance', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { syncPriority: 'high' });
      });

      await act(async () => {
        await result.current.handleOfflineMode();
      });

      // Queue sensitive data while offline
      const sensitiveEventId = result.current.queueSyncEvent(
        'subscription_status_change',
        {
          subscription: { id: 'sub_sensitive_123' },
          therapeuticData: { moodScore: 7 },
          metadata: { hipaaProtected: true }
        },
        ['payment'],
        'high'
      );

      // Validate encryption was called for offline storage
      expect(mockEncryptedStorage.encryptSyncData).toHaveBeenCalled();

      // Simulate recovery and decryption
      mockEncryptedStorage.retrieveSyncEvents.mockResolvedValue([
        {
          id: sensitiveEventId,
          encryptedData: 'encrypted_payload',
          timestamp: Date.now()
        }
      ]);

      mockEncryptedStorage.decryptSyncData.mockResolvedValue({
        subscription: { id: 'sub_sensitive_123' },
        therapeuticData: { moodScore: 7 }
      });

      await act(async () => {
        await result.current.handleOnlineRecovery();
      });

      // Validate decryption was called during recovery
      expect(mockEncryptedStorage.decryptSyncData).toHaveBeenCalled();
      expect(mockEncryptedStorage.validateIntegrity).toHaveBeenCalled();
    });

    it('should handle offline queue cleanup and expiration', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
      });

      // Simulate extended offline period with queue cleanup
      await act(async () => {
        await result.current.handleOfflineMode();
      });

      // Add events to offline queue
      for (let i = 0; i < 50; i++) {
        result.current.queueSyncEvent(
          'subscription_status_change',
          { iteration: i, timestamp: Date.now() + i },
          ['payment'],
          'normal'
        );
      }

      expect(result.current.offlineSyncQueue.length).toBe(50);

      // Mock cleanup of expired events
      mockEncryptedStorage.clearExpiredEvents.mockResolvedValue(10); // 10 expired

      // Trigger cleanup
      await act(async () => {
        await result.current.flushOfflineQueue();
      });

      // Validate cleanup was called
      expect(mockEncryptedStorage.clearExpiredEvents).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle sync failures with graceful degradation', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();
        result.current.connectStore('payment', mockStores.payment, { maxRetries: 2 });
      });

      // Mock persistent sync failures
      mockStores.payment.syncFromWebhook
        .mockRejectedValueOnce(new Error('Sync failure 1'))
        .mockRejectedValueOnce(new Error('Sync failure 2'))
        .mockResolvedValueOnce(undefined);

      const eventId = result.current.queueSyncEvent(
        'subscription_status_change',
        { status: 'failing_sync' },
        ['payment'],
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate failure was tracked
      expect(result.current.failedEvents.size).toBe(1);

      // Trigger retry
      await act(async () => {
        await result.current.retryFailedEvents();
        await result.current.processEventQueue();
      });

      // Validate eventual success
      expect(result.current.completedEvents.size).toBe(1);
      expect(result.current.failedEvents.size).toBe(0);
    });

    it('should maintain system stability during cascade failures', async () => {
      const { result } = renderHook(() => useRealTimeWebhookSync());

      await act(async () => {
        await result.current.initializeRealTimeSync();

        // Connect multiple stores
        Object.entries(mockStores).forEach(([storeId, store]) => {
          result.current.connectStore(storeId, store, { syncPriority: 'high' });
        });
      });

      // Simulate cascade failure across stores
      Object.values(mockStores).forEach(store => {
        store.syncFromWebhook.mockRejectedValue(new Error('System-wide failure'));
      });

      // Queue events affecting all stores
      const eventId = result.current.queueSyncEvent(
        'subscription_status_change',
        { systemWideUpdate: true },
        Object.keys(mockStores),
        'high'
      );

      await act(async () => {
        await result.current.processEventQueue();
      });

      // Validate system remained stable despite failures
      expect(result.current.globalSyncHealth).toBe('critical');
      expect(result.current.syncActive).toBe(true); // System still active

      // Validate all failures were tracked
      expect(result.current.failedEvents.size).toBe(1);

      // Simulate partial recovery
      mockStores.crisis.syncFromWebhook.mockResolvedValue(undefined); // Crisis store recovers first

      await act(async () => {
        await result.current.retryFailedEvents();
        await result.current.processEventQueue();
      });

      // System should maintain crisis capability even with partial failure
      expect(mockStores.crisis.syncFromWebhook).toHaveBeenCalled();
    });
  });
});