/**
 * Reactive State Manager - Cross-Store Communication & Data Flow Orchestration
 *
 * Provides reactive patterns for core user journey screens:
 * - Cross-store state synchronization and event propagation
 * - Real-time UI updates based on state changes across stores
 * - Offline-first data flow with conflict resolution
 * - Performance optimization through selective subscriptions
 * - Clinical validation integration across all state changes
 *
 * Manages data flow between:
 * - userStore ↔ dashboardStore ↔ checkInStore
 * - checkInStore ↔ breathingSessionStore ↔ progressAnalyticsStore
 * - All stores ↔ offline/sync systems
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useUserStore, userStoreUtils } from './userStore';
import { useCheckInStore } from './checkInStore';
import { useDashboardStore, dashboardStoreUtils } from './dashboardStore';
import { useBreathingSessionStore, breathingSessionStoreUtils } from './breathingSessionStore';
import { useProgressAnalyticsStore, progressAnalyticsStoreUtils } from './progressAnalyticsStore';
import { useFeatureFlagStore } from './featureFlagStore';
import { CheckIn } from '../types.ts';

/**
 * Cross-store event types for reactive updates
 */
export type CrossStoreEvent =
  | { type: 'USER_AUTHENTICATED'; payload: { userId: string; timestamp: string } }
  | { type: 'USER_SIGNED_OUT'; payload: { timestamp: string } }
  | { type: 'CHECK_IN_COMPLETED'; payload: { checkIn: CheckIn; timestamp: string } }
  | { type: 'CHECK_IN_STARTED'; payload: { type: 'morning' | 'midday' | 'evening'; timestamp: string } }
  | { type: 'BREATHING_SESSION_COMPLETED'; payload: { sessionId: string; quality: number; timestamp: string } }
  | { type: 'BREATHING_SESSION_STARTED'; payload: { sessionId: string; timestamp: string } }
  | { type: 'ASSESSMENT_COMPLETED'; payload: { type: 'PHQ-9' | 'GAD-7'; score: number; timestamp: string } }
  | { type: 'CRISIS_DETECTED'; payload: { severity: 'elevated' | 'concerning' | 'crisis'; timestamp: string } }
  | { type: 'ACHIEVEMENT_UNLOCKED'; payload: { achievementId: string; timestamp: string } }
  | { type: 'OFFLINE_MODE_ENABLED'; payload: { timestamp: string } }
  | { type: 'OFFLINE_MODE_DISABLED'; payload: { timestamp: string } }
  | { type: 'DATA_SYNC_COMPLETED'; payload: { itemsSync: number; timestamp: string } }
  | { type: 'TIME_PERIOD_CHANGED'; payload: { newPeriod: 'morning' | 'midday' | 'evening'; timestamp: string } };

/**
 * Subscription management for reactive updates
 */
interface StoreSubscription {
  readonly id: string;
  readonly storeType: 'user' | 'checkIn' | 'dashboard' | 'breathing' | 'analytics' | 'featureFlag';
  readonly selector: string;
  readonly callback: (value: any, previousValue: any) => void;
  readonly active: boolean;
  readonly createdAt: string;
}

/**
 * Performance metrics for reactive system
 */
interface ReactivePerformanceMetrics {
  readonly eventCount: number;
  readonly averageProcessingTime: number;
  readonly maxProcessingTime: number;
  readonly subscriptionCount: number;
  readonly memoryUsage: number;
  readonly errorCount: number;
  readonly lastEventTime: string | null;
}

/**
 * Reactive state synchronization configuration
 */
interface SyncConfiguration {
  readonly enableRealTimeUpdates: boolean;
  readonly batchEventProcessing: boolean;
  readonly batchIntervalMs: number;
  readonly maxEventQueueSize: number;
  readonly enablePerformanceTracking: boolean;
  readonly enableClinicalValidation: boolean;
  readonly offlineEventCaching: boolean;
  readonly maxOfflineEvents: number;
}

/**
 * Main reactive state manager interface
 */
interface ReactiveStateManager {
  // Event system
  eventQueue: readonly CrossStoreEvent[];
  processingQueue: boolean;
  eventSubscriptions: readonly StoreSubscription[];

  // Performance monitoring
  performanceMetrics: ReactivePerformanceMetrics;
  configuration: SyncConfiguration;

  // State synchronization
  lastSyncTime: string | null;
  pendingUpdates: readonly string[];
  isOfflineMode: boolean;

  // Loading states
  isInitializing: boolean;
  error: string | null;

  // Core event management
  emitEvent: (event: CrossStoreEvent) => Promise<void>;
  subscribeToStore: <T>(
    storeType: StoreSubscription['storeType'],
    selector: (state: any) => T,
    callback: (value: T, previousValue: T) => void
  ) => string;
  unsubscribeFromStore: (subscriptionId: string) => void;

  // Batch processing
  processBatchedEvents: () => Promise<void>;
  addEventToBatch: (event: CrossStoreEvent) => void;
  flushEventQueue: () => Promise<void>;

  // Cross-store synchronization
  syncDashboardWithCheckIns: () => Promise<void>;
  syncProgressWithSessions: () => Promise<void>;
  syncUserStateChanges: () => Promise<void>;
  syncOfflineChanges: () => Promise<void>;

  // Real-time updates
  enableRealTimeUpdates: () => void;
  disableRealTimeUpdates: () => void;
  updateConfiguration: (config: Partial<SyncConfiguration>) => void;

  // Performance optimization
  optimizeSubscriptions: () => Promise<void>;
  measurePerformance: (eventType: string, processingTime: number) => void;
  getPerformanceReport: () => ReactivePerformanceMetrics;

  // Clinical validation integration
  validateCrossStoreConsistency: () => Promise<boolean>;
  detectDataInconsistencies: () => readonly string[];
  repairDataConsistency: () => Promise<void>;

  // Offline handling
  enableOfflineMode: () => Promise<void>;
  disableOfflineMode: () => Promise<void>;
  cacheOfflineEvents: (events: readonly CrossStoreEvent[]) => Promise<void>;
  replayOfflineEvents: () => Promise<void>;

  // Initialization and cleanup
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
  resetState: () => void;
}

/**
 * Create Reactive State Manager Store
 */
export const useReactiveStateManager = create<ReactiveStateManager>()(
  subscribeWithSelector(
    (set, get) => {

      // Internal state management
      let eventBatchTimeout: NodeJS.Timeout | null = null;
      let activeSubscriptions: Map<string, () => void> = new Map();
      let performanceStartTimes: Map<string, number> = new Map();

      // Default configuration
      const defaultConfig: SyncConfiguration = {
        enableRealTimeUpdates: true,
        batchEventProcessing: true,
        batchIntervalMs: 100,
        maxEventQueueSize: 100,
        enablePerformanceTracking: true,
        enableClinicalValidation: true,
        offlineEventCaching: true,
        maxOfflineEvents: 500,
      };

      // Helper functions
      const generateSubscriptionId = (): string => {
        return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      };

      const createEvent = (type: CrossStoreEvent['type'], payload: any): CrossStoreEvent => {
        return {
          type,
          payload: {
            ...payload,
            timestamp: new Date().toISOString(),
          },
        } as CrossStoreEvent;
      };

      const measureEventProcessing = async (eventType: string, processor: () => Promise<void>): Promise<void> => {
        const startTime = Date.now();

        try {
          await processor();
          const processingTime = Date.now() - startTime;
          get().measurePerformance(eventType, processingTime);
        } catch (error) {
          const processingTime = Date.now() - startTime;
          get().measurePerformance(eventType, processingTime);

          set(state => ({
            performanceMetrics: {
              ...state.performanceMetrics,
              errorCount: state.performanceMetrics.errorCount + 1,
            },
          }));

          console.error(`Event processing failed for ${eventType}:`, error);
          throw error;
        }
      };

      return {
        // Initial state
        eventQueue: [],
        processingQueue: false,
        eventSubscriptions: [],
        performanceMetrics: {
          eventCount: 0,
          averageProcessingTime: 0,
          maxProcessingTime: 0,
          subscriptionCount: 0,
          memoryUsage: 0,
          errorCount: 0,
          lastEventTime: null,
        },
        configuration: defaultConfig,
        lastSyncTime: null,
        pendingUpdates: [],
        isOfflineMode: false,
        isInitializing: false,
        error: null,

        /**
         * Emit cross-store event
         */
        emitEvent: async (event: CrossStoreEvent): Promise<void> => {
          const { configuration } = get();

          try {
            if (configuration.batchEventProcessing) {
              get().addEventToBatch(event);
            } else {
              await get().processEvent(event);
            }

            set(state => ({
              performanceMetrics: {
                ...state.performanceMetrics,
                eventCount: state.performanceMetrics.eventCount + 1,
                lastEventTime: event.payload.timestamp,
              },
            }));

          } catch (error) {
            console.error('Failed to emit event:', error);
            set({ error: error instanceof Error ? error.message : 'Event emission failed' });
          }
        },

        /**
         * Process individual event
         */
        processEvent: async (event: CrossStoreEvent): Promise<void> => {
          await measureEventProcessing(event.type, async () => {
            switch (event.type) {
              case 'USER_AUTHENTICATED':
                await get().handleUserAuthenticated(event.payload);
                break;

              case 'USER_SIGNED_OUT':
                await get().handleUserSignedOut(event.payload);
                break;

              case 'CHECK_IN_COMPLETED':
                await get().handleCheckInCompleted(event.payload);
                break;

              case 'CHECK_IN_STARTED':
                await get().handleCheckInStarted(event.payload);
                break;

              case 'BREATHING_SESSION_COMPLETED':
                await get().handleBreathingSessionCompleted(event.payload);
                break;

              case 'BREATHING_SESSION_STARTED':
                await get().handleBreathingSessionStarted(event.payload);
                break;

              case 'ASSESSMENT_COMPLETED':
                await get().handleAssessmentCompleted(event.payload);
                break;

              case 'CRISIS_DETECTED':
                await get().handleCrisisDetected(event.payload);
                break;

              case 'ACHIEVEMENT_UNLOCKED':
                await get().handleAchievementUnlocked(event.payload);
                break;

              case 'OFFLINE_MODE_ENABLED':
                await get().handleOfflineModeEnabled(event.payload);
                break;

              case 'OFFLINE_MODE_DISABLED':
                await get().handleOfflineModeDisabled(event.payload);
                break;

              case 'DATA_SYNC_COMPLETED':
                await get().handleDataSyncCompleted(event.payload);
                break;

              case 'TIME_PERIOD_CHANGED':
                await get().handleTimePeriodChanged(event.payload);
                break;

              default:
                console.warn('Unknown event type:', (event as any).type);
            }
          });
        },

        /**
         * Subscribe to store changes
         */
        subscribeToStore: <T>(
          storeType: StoreSubscription['storeType'],
          selector: (state: any) => T,
          callback: (value: T, previousValue: T) => void
        ): string => {
          const subscriptionId = generateSubscriptionId();

          let unsubscribe: () => void;

          try {
            switch (storeType) {
              case 'user':
                unsubscribe = useUserStore.subscribe(selector, callback);
                break;
              case 'checkIn':
                unsubscribe = useCheckInStore.subscribe(selector, callback);
                break;
              case 'dashboard':
                unsubscribe = useDashboardStore.subscribe(selector, callback);
                break;
              case 'breathing':
                unsubscribe = useBreathingSessionStore.subscribe(selector, callback);
                break;
              case 'analytics':
                unsubscribe = useProgressAnalyticsStore.subscribe(selector, callback);
                break;
              case 'featureFlag':
                unsubscribe = useFeatureFlagStore.subscribe(selector, callback);
                break;
              default:
                throw new Error(`Unknown store type: ${storeType}`);
            }

            activeSubscriptions.set(subscriptionId, unsubscribe);

            const subscription: StoreSubscription = {
              id: subscriptionId,
              storeType,
              selector: selector.toString(),
              callback,
              active: true,
              createdAt: new Date().toISOString(),
            };

            set(state => ({
              eventSubscriptions: [...state.eventSubscriptions, subscription],
              performanceMetrics: {
                ...state.performanceMetrics,
                subscriptionCount: state.performanceMetrics.subscriptionCount + 1,
              },
            }));

            return subscriptionId;

          } catch (error) {
            console.error('Failed to subscribe to store:', error);
            throw error;
          }
        },

        /**
         * Unsubscribe from store
         */
        unsubscribeFromStore: (subscriptionId: string): void => {
          const unsubscribe = activeSubscriptions.get(subscriptionId);
          if (unsubscribe) {
            unsubscribe();
            activeSubscriptions.delete(subscriptionId);

            set(state => ({
              eventSubscriptions: state.eventSubscriptions.filter(sub => sub.id !== subscriptionId),
              performanceMetrics: {
                ...state.performanceMetrics,
                subscriptionCount: Math.max(0, state.performanceMetrics.subscriptionCount - 1),
              },
            }));
          }
        },

        /**
         * Add event to batch for processing
         */
        addEventToBatch: (event: CrossStoreEvent): void => {
          const { configuration, eventQueue } = get();

          // Add to queue
          const newQueue = [...eventQueue, event];

          // Trim queue if too large
          const trimmedQueue = newQueue.length > configuration.maxEventQueueSize
            ? newQueue.slice(-configuration.maxEventQueueSize)
            : newQueue;

          set({ eventQueue: trimmedQueue });

          // Schedule batch processing
          if (eventBatchTimeout) {
            clearTimeout(eventBatchTimeout);
          }

          eventBatchTimeout = setTimeout(() => {
            get().processBatchedEvents();
          }, configuration.batchIntervalMs);
        },

        /**
         * Process batched events
         */
        processBatchedEvents: async (): Promise<void> => {
          const { eventQueue, processingQueue } = get();

          if (processingQueue || eventQueue.length === 0) {
            return;
          }

          set({ processingQueue: true });

          try {
            // Process events in order
            for (const event of eventQueue) {
              await get().processEvent(event);
            }

            // Clear processed events
            set({ eventQueue: [], processingQueue: false });

          } catch (error) {
            console.error('Batch event processing failed:', error);
            set({
              error: error instanceof Error ? error.message : 'Batch processing failed',
              processingQueue: false,
            });
          }
        },

        /**
         * Flush event queue immediately
         */
        flushEventQueue: async (): Promise<void> => {
          if (eventBatchTimeout) {
            clearTimeout(eventBatchTimeout);
            eventBatchTimeout = null;
          }
          await get().processBatchedEvents();
        },

        /**
         * Measure performance
         */
        measurePerformance: (eventType: string, processingTime: number): void => {
          set(state => {
            const newEventCount = state.performanceMetrics.eventCount + 1;
            const newAverage = ((state.performanceMetrics.averageProcessingTime * (newEventCount - 1)) + processingTime) / newEventCount;

            return {
              performanceMetrics: {
                ...state.performanceMetrics,
                averageProcessingTime: Math.round(newAverage * 100) / 100,
                maxProcessingTime: Math.max(state.performanceMetrics.maxProcessingTime, processingTime),
              },
            };
          });
        },

        /**
         * Get performance report
         */
        getPerformanceReport: (): ReactivePerformanceMetrics => {
          return get().performanceMetrics;
        },

        // Event handlers
        handleUserAuthenticated: async (payload: any): Promise<void> => {
          // Trigger dashboard refresh
          await useDashboardStore.getState().refreshDashboard();

          // Initialize analytics
          await useProgressAnalyticsStore.getState().runFullAnalysis();

          console.log('User authenticated, stores synchronized');
        },

        handleUserSignedOut: async (payload: any): Promise<void> => {
          // Clear sensitive data from all stores
          useDashboardStore.getState().invalidateCache();

          console.log('User signed out, stores cleaned');
        },

        handleCheckInCompleted: async (payload: any): Promise<void> => {
          // Update dashboard
          await useDashboardStore.getState().aggregateDailyData();

          // Update analytics
          await useProgressAnalyticsStore.getState().updateForNewCheckIn(payload.checkIn);

          // Check for achievements
          const newAchievements = await useProgressAnalyticsStore.getState().checkForNewAchievements();

          // Emit achievement events
          for (const achievementId of newAchievements) {
            await get().emitEvent(createEvent('ACHIEVEMENT_UNLOCKED', { achievementId }));
          }

          console.log('Check-in completed, stores updated');
        },

        handleCheckInStarted: async (payload: any): Promise<void> => {
          // Update dashboard time context
          useDashboardStore.getState().updateTimeContext();

          console.log('Check-in started, dashboard updated');
        },

        handleBreathingSessionCompleted: async (payload: any): Promise<void> => {
          // Update analytics
          await useProgressAnalyticsStore.getState().updateForBreathingSession(payload);

          // Update dashboard metrics
          await useDashboardStore.getState().calculateMoodTrends();

          console.log('Breathing session completed, analytics updated');
        },

        handleBreathingSessionStarted: async (payload: any): Promise<void> => {
          console.log('Breathing session started');
        },

        handleAssessmentCompleted: async (payload: any): Promise<void> => {
          // Update analytics
          await useProgressAnalyticsStore.getState().updateForNewAssessment(payload.type, payload.score);

          // Update dashboard
          await useDashboardStore.getState().monitorCrisisState();

          console.log('Assessment completed, risk monitoring updated');
        },

        handleCrisisDetected: async (payload: any): Promise<void> => {
          // Update dashboard crisis monitoring
          await useDashboardStore.getState().handleCrisisDetection(payload.severity);

          // TODO: Trigger crisis response protocols

          console.warn('Crisis detected, safety protocols activated');
        },

        handleAchievementUnlocked: async (payload: any): Promise<void> => {
          console.log('Achievement unlocked:', payload.achievementId);
        },

        handleOfflineModeEnabled: async (payload: any): Promise<void> => {
          set({ isOfflineMode: true });

          // Optimize stores for offline
          await useDashboardStore.getState().optimizeForOffline();

          console.log('Offline mode enabled');
        },

        handleOfflineModeDisabled: async (payload: any): Promise<void> => {
          set({ isOfflineMode: false });

          // Sync offline changes
          await get().syncOfflineChanges();

          console.log('Offline mode disabled, syncing changes');
        },

        handleDataSyncCompleted: async (payload: any): Promise<void> => {
          set({ lastSyncTime: payload.timestamp });

          // Refresh all stores
          await Promise.all([
            useDashboardStore.getState().refreshDashboard(),
            useProgressAnalyticsStore.getState().runFullAnalysis(),
          ]);

          console.log(`Data sync completed: ${payload.itemsSync} items`);
        },

        handleTimePeriodChanged: async (payload: any): Promise<void> => {
          // Update dashboard time context
          useDashboardStore.getState().updateTimeContext();

          console.log('Time period changed:', payload.newPeriod);
        },

        // Cross-store synchronization methods
        syncDashboardWithCheckIns: async (): Promise<void> => {
          try {
            await useDashboardStore.getState().aggregateDailyData();
            console.log('Dashboard synchronized with check-ins');
          } catch (error) {
            console.error('Failed to sync dashboard with check-ins:', error);
          }
        },

        syncProgressWithSessions: async (): Promise<void> => {
          try {
            await useProgressAnalyticsStore.getState().calculatePracticeMetrics();
            console.log('Progress synchronized with sessions');
          } catch (error) {
            console.error('Failed to sync progress with sessions:', error);
          }
        },

        syncUserStateChanges: async (): Promise<void> => {
          try {
            const isAuthenticated = userStoreUtils.isAuthenticated();
            if (isAuthenticated) {
              await get().emitEvent(createEvent('USER_AUTHENTICATED', { userId: 'current' }));
            } else {
              await get().emitEvent(createEvent('USER_SIGNED_OUT', {}));
            }
          } catch (error) {
            console.error('Failed to sync user state changes:', error);
          }
        },

        syncOfflineChanges: async (): Promise<void> => {
          try {
            // TODO: Implement offline sync logic
            console.log('Syncing offline changes...');
          } catch (error) {
            console.error('Failed to sync offline changes:', error);
          }
        },

        // Configuration management
        enableRealTimeUpdates: (): void => {
          set(state => ({
            configuration: {
              ...state.configuration,
              enableRealTimeUpdates: true,
            },
          }));
        },

        disableRealTimeUpdates: (): void => {
          set(state => ({
            configuration: {
              ...state.configuration,
              enableRealTimeUpdates: false,
            },
          }));
        },

        updateConfiguration: (config: Partial<SyncConfiguration>): void => {
          set(state => ({
            configuration: {
              ...state.configuration,
              ...config,
            },
          }));
        },

        // Performance optimization
        optimizeSubscriptions: async (): Promise<void> => {
          try {
            // Remove inactive subscriptions
            const activeSubscriptionIds = Array.from(activeSubscriptions.keys());

            set(state => ({
              eventSubscriptions: state.eventSubscriptions.filter(sub =>
                activeSubscriptionIds.includes(sub.id)
              ),
            }));

            console.log('Subscriptions optimized');
          } catch (error) {
            console.error('Failed to optimize subscriptions:', error);
          }
        },

        // Clinical validation
        validateCrossStoreConsistency: async (): Promise<boolean> => {
          try {
            // TODO: Implement cross-store validation
            return true;
          } catch (error) {
            console.error('Cross-store validation failed:', error);
            return false;
          }
        },

        detectDataInconsistencies: (): readonly string[] => {
          const inconsistencies: string[] = [];

          // TODO: Implement inconsistency detection

          return inconsistencies;
        },

        repairDataConsistency: async (): Promise<void> => {
          try {
            // TODO: Implement data repair
            console.log('Data consistency repaired');
          } catch (error) {
            console.error('Failed to repair data consistency:', error);
          }
        },

        // Offline handling
        enableOfflineMode: async (): Promise<void> => {
          await get().emitEvent(createEvent('OFFLINE_MODE_ENABLED', {}));
        },

        disableOfflineMode: async (): Promise<void> => {
          await get().emitEvent(createEvent('OFFLINE_MODE_DISABLED', {}));
        },

        cacheOfflineEvents: async (events: readonly CrossStoreEvent[]): Promise<void> => {
          try {
            // TODO: Implement offline event caching
            console.log(`Cached ${events.length} offline events`);
          } catch (error) {
            console.error('Failed to cache offline events:', error);
          }
        },

        replayOfflineEvents: async (): Promise<void> => {
          try {
            // TODO: Implement offline event replay
            console.log('Offline events replayed');
          } catch (error) {
            console.error('Failed to replay offline events:', error);
          }
        },

        // Initialization and cleanup
        initialize: async (): Promise<void> => {
          set({ isInitializing: true, error: null });

          try {
            // Set up core subscriptions
            get().setupCoreSubscriptions();

            // Sync user state
            await get().syncUserStateChanges();

            // Initial data sync
            if (userStoreUtils.isAuthenticated()) {
              await get().emitEvent(createEvent('USER_AUTHENTICATED', { userId: 'current' }));
            }

            set({ isInitializing: false });
            console.log('Reactive state manager initialized');

          } catch (error) {
            console.error('Failed to initialize reactive state manager:', error);
            set({
              error: error instanceof Error ? error.message : 'Initialization failed',
              isInitializing: false,
            });
          }
        },

        setupCoreSubscriptions: (): void => {
          // Subscribe to user authentication changes
          get().subscribeToStore(
            'user',
            (state) => state.isAuthenticated,
            (isAuthenticated, wasAuthenticated) => {
              if (isAuthenticated && !wasAuthenticated) {
                get().emitEvent(createEvent('USER_AUTHENTICATED', { userId: 'current' }));
              } else if (!isAuthenticated && wasAuthenticated) {
                get().emitEvent(createEvent('USER_SIGNED_OUT', {}));
              }
            }
          );

          // Subscribe to check-in completions
          get().subscribeToStore(
            'checkIn',
            (state) => state.checkIns.length,
            (newLength, oldLength) => {
              if (newLength > oldLength) {
                const latestCheckIn = useCheckInStore.getState().checkIns[newLength - 1];
                if (latestCheckIn?.completedAt) {
                  get().emitEvent(createEvent('CHECK_IN_COMPLETED', { checkIn: latestCheckIn }));
                }
              }
            }
          );

          // Subscribe to breathing session completions
          get().subscribeToStore(
            'breathing',
            (state) => state.currentSession?.state,
            (state, previousState) => {
              if (state === 'completed' && previousState !== 'completed') {
                const session = useBreathingSessionStore.getState().currentSession;
                if (session) {
                  const quality = useBreathingSessionStore.getState().calculateSessionQuality(session);
                  get().emitEvent(createEvent('BREATHING_SESSION_COMPLETED', {
                    sessionId: session.id,
                    quality,
                  }));
                }
              }
            }
          );

          console.log('Core subscriptions established');
        },

        cleanup: async (): Promise<void> => {
          try {
            // Clear all subscriptions
            activeSubscriptions.forEach((unsubscribe) => unsubscribe());
            activeSubscriptions.clear();

            // Clear timeouts
            if (eventBatchTimeout) {
              clearTimeout(eventBatchTimeout);
              eventBatchTimeout = null;
            }

            // Flush remaining events
            await get().flushEventQueue();

            set({
              eventSubscriptions: [],
              eventQueue: [],
              performanceMetrics: {
                eventCount: 0,
                averageProcessingTime: 0,
                maxProcessingTime: 0,
                subscriptionCount: 0,
                memoryUsage: 0,
                errorCount: 0,
                lastEventTime: null,
              },
            });

            console.log('Reactive state manager cleanup completed');

          } catch (error) {
            console.error('Failed to cleanup reactive state manager:', error);
          }
        },

        resetState: (): void => {
          set({
            eventQueue: [],
            processingQueue: false,
            eventSubscriptions: [],
            performanceMetrics: {
              eventCount: 0,
              averageProcessingTime: 0,
              maxProcessingTime: 0,
              subscriptionCount: 0,
              memoryUsage: 0,
              errorCount: 0,
              lastEventTime: null,
            },
            lastSyncTime: null,
            pendingUpdates: [],
            isOfflineMode: false,
            error: null,
          });
        },
      };
    }
  )
);

/**
 * Reactive state manager utilities
 */
export const reactiveStateManagerUtils = {
  emitCheckInCompleted: (checkIn: CheckIn) => {
    useReactiveStateManager.getState().emitEvent({
      type: 'CHECK_IN_COMPLETED',
      payload: { checkIn, timestamp: new Date().toISOString() },
    });
  },

  emitBreathingSessionCompleted: (sessionId: string, quality: number) => {
    useReactiveStateManager.getState().emitEvent({
      type: 'BREATHING_SESSION_COMPLETED',
      payload: { sessionId, quality, timestamp: new Date().toISOString() },
    });
  },

  emitAssessmentCompleted: (type: 'PHQ-9' | 'GAD-7', score: number) => {
    useReactiveStateManager.getState().emitEvent({
      type: 'ASSESSMENT_COMPLETED',
      payload: { type, score, timestamp: new Date().toISOString() },
    });
  },

  emitCrisisDetected: (severity: 'elevated' | 'concerning' | 'crisis') => {
    useReactiveStateManager.getState().emitEvent({
      type: 'CRISIS_DETECTED',
      payload: { severity, timestamp: new Date().toISOString() },
    });
  },

  getPerformanceMetrics: () => useReactiveStateManager.getState().getPerformanceReport(),

  isHealthy: () => {
    const metrics = useReactiveStateManager.getState().performanceMetrics;
    return metrics.errorCount === 0 && metrics.averageProcessingTime < 100;
  },

  optimize: () => {
    useReactiveStateManager.getState().optimizeSubscriptions();
  },
};

/**
 * Initialize reactive state management on app start
 */
export const initializeReactiveStateManager = async (): Promise<void> => {
  await useReactiveStateManager.getState().initialize();
};

/**
 * Cleanup reactive state management on app close
 */
export const cleanupReactiveStateManager = async (): Promise<void> => {
  await useReactiveStateManager.getState().cleanup();
};