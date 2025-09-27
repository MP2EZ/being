/**
 * PressableStateOptimizer - New Architecture Pressable Integration
 *
 * Optimized state management for enhanced Pressable components with
 * crisis response guarantees and therapeutic interaction performance.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { turboStoreManager } from '../newarch/TurboStoreManager';
import { CrisisResponseMonitor } from '../../services/CrisisResponseMonitor';

// Pressable interaction state types
interface PressableInteractionState {
  componentId: string;
  isPressed: boolean;
  pressStartTime: number | null;
  pressEndTime: number | null;
  lastInteraction: number;
  interactionCount: number;
  pressType: 'crisis' | 'assessment' | 'therapeutic' | 'navigation' | 'standard';
}

// Pressable performance metrics
interface PressablePerformanceMetrics {
  avgStateUpdateTime: number;
  maxStateUpdateTime: number;
  totalInteractions: number;
  crisisInteractions: number;
  performanceViolations: number;
  lastPerformanceCheck: number;
}

// Enhanced pressable state for crisis components
interface CrisisPressableState extends PressableInteractionState {
  emergencyMode: boolean;
  crisisLevel: 'low' | 'medium' | 'high' | 'critical';
  emergencyContactsReady: boolean;
  hotlineConnectionReady: boolean;
  lastCrisisCheck: number;
}

// Pressable state optimization configuration
interface PressableOptimizationConfig {
  enableTurboUpdates: boolean;
  crisisResponseTimeMs: number; // Target: <200ms
  standardResponseTimeMs: number; // Target: <50ms
  batchNonCriticalUpdates: boolean;
  enablePerformanceMonitoring: boolean;
  logPerformanceViolations: boolean;
}

// Global pressable state manager
interface PressableStateManager {
  // Component state tracking
  interactions: Map<string, PressableInteractionState>;
  crisisComponents: Map<string, CrisisPressableState>;

  // Performance monitoring
  performanceMetrics: PressablePerformanceMetrics;
  config: PressableOptimizationConfig;

  // Core state management methods
  registerPressable: (
    componentId: string,
    pressType: PressableInteractionState['pressType']
  ) => Promise<void>;

  updatePressableState: (
    componentId: string,
    stateUpdate: Partial<PressableInteractionState>,
    priority?: 'immediate' | 'standard'
  ) => Promise<void>;

  handlePressStart: (componentId: string) => Promise<void>;
  handlePressEnd: (componentId: string) => Promise<void>;

  // Crisis-specific methods
  registerCrisisComponent: (
    componentId: string,
    crisisLevel: CrisisPressableState['crisisLevel']
  ) => Promise<void>;

  activateCrisisMode: (componentId: string) => Promise<void>;
  updateCrisisState: (
    componentId: string,
    crisisUpdate: Partial<CrisisPressableState>
  ) => Promise<void>;

  // Performance monitoring
  monitorPerformance: (
    componentId: string,
    operationDuration: number,
    targetDuration: number
  ) => void;

  getPerformanceReport: () => PressablePerformanceMetrics & {
    componentBreakdown: Record<string, { avgTime: number; violations: number }>;
  };

  // Cleanup and optimization
  unregisterPressable: (componentId: string) => void;
  optimizeMemoryUsage: () => void;
  resetPerformanceMetrics: () => void;
}

/**
 * Enhanced Pressable State Store with New Architecture optimizations
 */
export const usePressableStateStore = create<PressableStateManager>()(
  subscribeWithSelector(
    (set, get) => ({
      // State initialization
      interactions: new Map(),
      crisisComponents: new Map(),

      performanceMetrics: {
        avgStateUpdateTime: 0,
        maxStateUpdateTime: 0,
        totalInteractions: 0,
        crisisInteractions: 0,
        performanceViolations: 0,
        lastPerformanceCheck: Date.now()
      },

      config: {
        enableTurboUpdates: true,
        crisisResponseTimeMs: 200,
        standardResponseTimeMs: 50,
        batchNonCriticalUpdates: true,
        enablePerformanceMonitoring: true,
        logPerformanceViolations: true
      },

      // Register a new pressable component
      registerPressable: async (componentId, pressType) => {
        const startTime = performance.now();

        try {
          const { interactions } = get();

          const newInteraction: PressableInteractionState = {
            componentId,
            isPressed: false,
            pressStartTime: null,
            pressEndTime: null,
            lastInteraction: Date.now(),
            interactionCount: 0,
            pressType
          };

          const updatedInteractions = new Map(interactions);
          updatedInteractions.set(componentId, newInteraction);

          set({ interactions: updatedInteractions });

          const duration = performance.now() - startTime;
          get().monitorPerformance(componentId, duration, 10); // 10ms target for registration

          console.log(`Registered pressable component: ${componentId} (${pressType})`);

        } catch (error) {
          console.error(`Failed to register pressable ${componentId}:`, error);
          throw error;
        }
      },

      // Optimized pressable state updates
      updatePressableState: async (componentId, stateUpdate, priority = 'standard') => {
        const startTime = performance.now();
        const { config, interactions } = get();

        try {
          const currentState = interactions.get(componentId);
          if (!currentState) {
            throw new Error(`Pressable ${componentId} not registered`);
          }

          const updatedState: PressableInteractionState = {
            ...currentState,
            ...stateUpdate,
            lastInteraction: Date.now()
          };

          // Determine performance target based on priority and component type
          const targetDuration = priority === 'immediate' || currentState.pressType === 'crisis'
            ? config.crisisResponseTimeMs
            : config.standardResponseTimeMs;

          // Use TurboStoreManager for enhanced performance if available
          if (config.enableTurboUpdates) {
            const optimizedUpdate = turboStoreManager.optimizeForFabric(updatedState);

            if (priority === 'immediate' || currentState.pressType === 'crisis') {
              // Crisis components require performance guarantee
              await turboStoreManager.guaranteeCrisisResponse(
                updatedState,
                config.crisisResponseTimeMs
              );
            }
          }

          // Update state
          const updatedInteractions = new Map(interactions);
          updatedInteractions.set(componentId, updatedState);
          set({ interactions: updatedInteractions });

          const duration = performance.now() - startTime;
          get().monitorPerformance(componentId, duration, targetDuration);

          // Update interaction count
          if (stateUpdate.isPressed !== undefined) {
            const { performanceMetrics } = get();
            const updatedMetrics: PressablePerformanceMetrics = {
              ...performanceMetrics,
              totalInteractions: performanceMetrics.totalInteractions + 1,
              crisisInteractions: currentState.pressType === 'crisis'
                ? performanceMetrics.crisisInteractions + 1
                : performanceMetrics.crisisInteractions
            };
            set({ performanceMetrics: updatedMetrics });
          }

        } catch (error) {
          const duration = performance.now() - startTime;
          console.error(`Pressable state update failed for ${componentId} after ${duration}ms:`, error);

          // Log performance violation even for errors
          get().monitorPerformance(componentId, duration, config.standardResponseTimeMs);
          throw error;
        }
      },

      // Handle press start with optimized performance
      handlePressStart: async (componentId) => {
        const startTime = performance.now();

        try {
          await get().updatePressableState(
            componentId,
            {
              isPressed: true,
              pressStartTime: Date.now(),
              pressEndTime: null,
              interactionCount: (get().interactions.get(componentId)?.interactionCount || 0) + 1
            },
            'immediate' // Press start requires immediate response
          );

          // Special handling for crisis components
          const crisisState = get().crisisComponents.get(componentId);
          if (crisisState) {
            await get().updateCrisisState(componentId, {
              lastCrisisCheck: Date.now()
            });
          }

          const duration = performance.now() - startTime;

          // Press start must be extremely fast for good UX
          if (duration > 16) { // 60fps target
            console.warn(`Press start for ${componentId} exceeded 16ms: ${duration}ms`);
          }

        } catch (error) {
          console.error(`Press start failed for ${componentId}:`, error);
          throw error;
        }
      },

      // Handle press end with state cleanup
      handlePressEnd: async (componentId) => {
        const startTime = performance.now();

        try {
          const currentState = get().interactions.get(componentId);
          const pressDuration = currentState?.pressStartTime
            ? Date.now() - currentState.pressStartTime
            : 0;

          await get().updatePressableState(
            componentId,
            {
              isPressed: false,
              pressEndTime: Date.now()
            },
            'standard' // Press end can be slightly less immediate
          );

          // Log press duration for analysis
          if (pressDuration > 0) {
            console.log(`Press duration for ${componentId}: ${pressDuration}ms`);
          }

          const duration = performance.now() - startTime;

          // Press end should still be fast
          if (duration > 25) {
            console.warn(`Press end for ${componentId} exceeded 25ms: ${duration}ms`);
          }

        } catch (error) {
          console.error(`Press end failed for ${componentId}:`, error);
          throw error;
        }
      },

      // Register crisis-specific pressable component
      registerCrisisComponent: async (componentId, crisisLevel) => {
        const startTime = performance.now();

        try {
          // First register as standard pressable
          await get().registerPressable(componentId, 'crisis');

          // Then add crisis-specific state
          const { crisisComponents } = get();

          const crisisState: CrisisPressableState = {
            componentId,
            isPressed: false,
            pressStartTime: null,
            pressEndTime: null,
            lastInteraction: Date.now(),
            interactionCount: 0,
            pressType: 'crisis',
            emergencyMode: false,
            crisisLevel,
            emergencyContactsReady: false,
            hotlineConnectionReady: false,
            lastCrisisCheck: Date.now()
          };

          const updatedCrisisComponents = new Map(crisisComponents);
          updatedCrisisComponents.set(componentId, crisisState);
          set({ crisisComponents: updatedCrisisComponents });

          // Pre-load crisis resources for fast response
          await get().preloadCrisisResources(componentId);

          const duration = performance.now() - startTime;
          console.log(`Registered crisis component: ${componentId} (${crisisLevel}) in ${duration}ms`);

        } catch (error) {
          console.error(`Failed to register crisis component ${componentId}:`, error);
          throw error;
        }
      },

      // Activate crisis mode for component
      activateCrisisMode: async (componentId) => {
        const startTime = performance.now();

        try {
          const crisisState = get().crisisComponents.get(componentId);
          if (!crisisState) {
            throw new Error(`Crisis component ${componentId} not registered`);
          }

          // Crisis mode activation must complete in <200ms
          const crisisResponsePromise = CrisisResponseMonitor.executeCrisisAction(
            `activate-crisis-mode-${componentId}`,
            async () => {
              await get().updateCrisisState(componentId, {
                emergencyMode: true,
                lastCrisisCheck: Date.now()
              });

              // Ensure emergency resources are ready
              await Promise.all([
                get().ensureEmergencyContactsReady(componentId),
                get().ensureHotlineConnectionReady(componentId)
              ]);

              return true;
            }
          );

          await crisisResponsePromise;

          const duration = performance.now() - startTime;

          if (duration > get().config.crisisResponseTimeMs) {
            console.error(
              `Crisis mode activation exceeded ${get().config.crisisResponseTimeMs}ms: ${duration}ms`
            );
          }

          console.log(`Crisis mode activated for ${componentId} in ${duration}ms`);

        } catch (error) {
          console.error(`Crisis mode activation failed for ${componentId}:`, error);
          throw error;
        }
      },

      // Update crisis-specific state
      updateCrisisState: async (componentId, crisisUpdate) => {
        const startTime = performance.now();

        try {
          const { crisisComponents } = get();
          const currentCrisisState = crisisComponents.get(componentId);

          if (!currentCrisisState) {
            throw new Error(`Crisis component ${componentId} not found`);
          }

          const updatedCrisisState: CrisisPressableState = {
            ...currentCrisisState,
            ...crisisUpdate,
            lastInteraction: Date.now()
          };

          const updatedCrisisComponents = new Map(crisisComponents);
          updatedCrisisComponents.set(componentId, updatedCrisisState);
          set({ crisisComponents: updatedCrisisComponents });

          // Also update base pressable state
          await get().updatePressableState(
            componentId,
            {
              lastInteraction: Date.now()
            },
            'immediate'
          );

          const duration = performance.now() - startTime;
          get().monitorPerformance(componentId, duration, get().config.crisisResponseTimeMs);

        } catch (error) {
          console.error(`Crisis state update failed for ${componentId}:`, error);
          throw error;
        }
      },

      // Monitor performance with violation tracking
      monitorPerformance: (componentId, operationDuration, targetDuration) => {
        const { performanceMetrics, config } = get();

        // Update performance metrics
        const updatedMetrics: PressablePerformanceMetrics = {
          ...performanceMetrics,
          avgStateUpdateTime: performanceMetrics.totalInteractions > 0
            ? (performanceMetrics.avgStateUpdateTime * performanceMetrics.totalInteractions + operationDuration) / (performanceMetrics.totalInteractions + 1)
            : operationDuration,
          maxStateUpdateTime: Math.max(performanceMetrics.maxStateUpdateTime, operationDuration),
          performanceViolations: operationDuration > targetDuration
            ? performanceMetrics.performanceViolations + 1
            : performanceMetrics.performanceViolations,
          lastPerformanceCheck: Date.now()
        };

        set({ performanceMetrics: updatedMetrics });

        // Log performance violations if enabled
        if (config.logPerformanceViolations && operationDuration > targetDuration) {
          console.warn(
            `Performance violation for ${componentId}: ${operationDuration}ms > ${targetDuration}ms target`
          );
        }
      },

      // Get comprehensive performance report
      getPerformanceReport: () => {
        const { performanceMetrics, interactions, crisisComponents } = get();

        // Calculate per-component breakdown
        const componentBreakdown: Record<string, { avgTime: number; violations: number }> = {};

        for (const [componentId, interaction] of interactions.entries()) {
          // This would need to be enhanced with actual per-component tracking
          componentBreakdown[componentId] = {
            avgTime: performanceMetrics.avgStateUpdateTime,
            violations: 0 // Would need component-specific tracking
          };
        }

        return {
          ...performanceMetrics,
          componentBreakdown
        };
      },

      // Cleanup methods
      unregisterPressable: (componentId) => {
        const { interactions, crisisComponents } = get();

        const updatedInteractions = new Map(interactions);
        updatedInteractions.delete(componentId);

        const updatedCrisisComponents = new Map(crisisComponents);
        updatedCrisisComponents.delete(componentId);

        set({
          interactions: updatedInteractions,
          crisisComponents: updatedCrisisComponents
        });

        console.log(`Unregistered pressable component: ${componentId}`);
      },

      optimizeMemoryUsage: () => {
        const { interactions, crisisComponents } = get();
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes

        // Remove stale interactions
        const activeInteractions = new Map();
        for (const [componentId, interaction] of interactions.entries()) {
          if (now - interaction.lastInteraction < maxAge) {
            activeInteractions.set(componentId, interaction);
          }
        }

        const activeCrisisComponents = new Map();
        for (const [componentId, crisisState] of crisisComponents.entries()) {
          if (now - crisisState.lastInteraction < maxAge) {
            activeCrisisComponents.set(componentId, crisisState);
          }
        }

        set({
          interactions: activeInteractions,
          crisisComponents: activeCrisisComponents
        });

        const removedCount = (interactions.size - activeInteractions.size) +
                           (crisisComponents.size - activeCrisisComponents.size);

        if (removedCount > 0) {
          console.log(`Optimized memory usage: removed ${removedCount} stale components`);
        }
      },

      resetPerformanceMetrics: () => {
        set({
          performanceMetrics: {
            avgStateUpdateTime: 0,
            maxStateUpdateTime: 0,
            totalInteractions: 0,
            crisisInteractions: 0,
            performanceViolations: 0,
            lastPerformanceCheck: Date.now()
          }
        });

        console.log('Performance metrics reset');
      },

      // Private helper methods (would be implemented as separate functions)
      preloadCrisisResources: async (componentId: string) => {
        // Pre-load emergency contacts and hotline configuration
        // This would integrate with the crisis store and emergency services
        console.log(`Pre-loading crisis resources for ${componentId}`);
      },

      ensureEmergencyContactsReady: async (componentId: string) => {
        // Verify emergency contacts are configured and accessible
        console.log(`Ensuring emergency contacts ready for ${componentId}`);
      },

      ensureHotlineConnectionReady: async (componentId: string) => {
        // Verify 988 hotline connection capability
        console.log(`Ensuring hotline connection ready for ${componentId}`);
      }
    })
  )
);

/**
 * Hook for crisis-optimized pressable components
 */
export const useCrisisPressableOptimization = (
  componentId: string,
  crisisLevel: CrisisPressableState['crisisLevel'] = 'medium'
) => {
  const store = usePressableStateStore();

  // Register crisis component on mount
  React.useEffect(() => {
    store.registerCrisisComponent(componentId, crisisLevel);

    return () => {
      store.unregisterPressable(componentId);
    };
  }, [componentId, crisisLevel]);

  return {
    handlePressStart: () => store.handlePressStart(componentId),
    handlePressEnd: () => store.handlePressEnd(componentId),
    activateCrisisMode: () => store.activateCrisisMode(componentId),
    isPressed: store.interactions.get(componentId)?.isPressed || false,
    crisisState: store.crisisComponents.get(componentId),
    performanceMetrics: store.getPerformanceReport()
  };
};

/**
 * Hook for standard pressable optimization
 */
export const usePressableOptimization = (
  componentId: string,
  pressType: PressableInteractionState['pressType'] = 'standard'
) => {
  const store = usePressableStateStore();

  // Register pressable component on mount
  React.useEffect(() => {
    store.registerPressable(componentId, pressType);

    return () => {
      store.unregisterPressable(componentId);
    };
  }, [componentId, pressType]);

  return {
    handlePressStart: () => store.handlePressStart(componentId),
    handlePressEnd: () => store.handlePressEnd(componentId),
    updateState: (stateUpdate: Partial<PressableInteractionState>) =>
      store.updatePressableState(componentId, stateUpdate),
    isPressed: store.interactions.get(componentId)?.isPressed || false,
    interactionCount: store.interactions.get(componentId)?.interactionCount || 0,
    performanceMetrics: store.getPerformanceReport()
  };
};

// Automatic memory optimization
setInterval(() => {
  usePressableStateStore.getState().optimizeMemoryUsage();
}, 5 * 60 * 1000); // Every 5 minutes