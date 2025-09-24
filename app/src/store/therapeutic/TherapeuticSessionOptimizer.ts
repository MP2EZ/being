/**
 * TherapeuticSessionOptimizer - New Architecture therapeutic state optimization
 *
 * Optimized state management for therapeutic sessions with precise timing,
 * 60fps animation requirements, and session continuity guarantees.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { turboStoreManager } from '../newarch/TurboStoreManager';
import { enhancedAsyncStorage } from '../turbomodules/AsyncStorageTurboModule';

// Therapeutic session types
export interface TherapeuticSession {
  id: string;
  type: 'breathing' | 'meditation' | 'checkin' | 'assessment';
  subType?: string;
  startedAt: number;
  expectedDuration: number;
  currentPhase: string;
  phaseProgress: number; // 0-1
  totalProgress: number; // 0-1
  isActive: boolean;
  isPaused: boolean;
  lastUpdate: number;
}

// Breathing session specific state
export interface BreathingSessionState extends TherapeuticSession {
  type: 'breathing';
  breathingPhase: 'inhale' | 'hold' | 'exhale' | 'pause';
  cycleCount: number;
  targetCycles: number;
  phaseTimings: {
    inhale: number;    // 4 seconds
    hold: number;      // 7 seconds
    exhale: number;    // 8 seconds
    pause: number;     // 1 second
  };
  animationState: {
    currentRadius: number;
    targetRadius: number;
    animationProgress: number;
    lastFrameTime: number;
  };
}

// Performance metrics for therapeutic sessions
export interface TherapeuticPerformanceMetrics {
  frameRate: number;
  averageFrameTime: number;
  droppedFrames: number;
  timingAccuracy: number; // Percentage accuracy for therapeutic timing
  sessionCompletionRate: number;
  backgroundRecoverySuccess: number;
  lastPerformanceCheck: number;
}

// Session continuity state for backgrounding/foregrounding
export interface SessionContinuityState {
  sessionId: string;
  backgroundedAt: number | null;
  foregroundedAt: number | null;
  totalBackgroundTime: number;
  recoveryAttempts: number;
  recoverySuccess: boolean;
  stateSnapshot: any;
}

// Therapeutic session manager interface
export interface TherapeuticSessionManager {
  // Active sessions
  activeSessions: Map<string, TherapeuticSession>;
  breathingSessions: Map<string, BreathingSessionState>;

  // Performance tracking
  performanceMetrics: TherapeuticPerformanceMetrics;

  // Session continuity
  continuityStates: Map<string, SessionContinuityState>;

  // Session lifecycle
  startTherapeuticSession: <T extends TherapeuticSession>(
    type: T['type'],
    config: Partial<T>
  ) => Promise<string>;

  updateSessionState: (
    sessionId: string,
    update: Partial<TherapeuticSession>,
    highFrequency?: boolean
  ) => Promise<void>;

  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;

  // Breathing session specific methods
  startBreathingSession: (
    duration?: number, // Default: 180000ms (3 minutes)
    customTimings?: Partial<BreathingSessionState['phaseTimings']>
  ) => Promise<string>;

  updateBreathingPhase: (
    sessionId: string,
    phase: BreathingSessionState['breathingPhase'],
    progress: number
  ) => Promise<void>;

  updateBreathingAnimation: (
    sessionId: string,
    animationUpdate: Partial<BreathingSessionState['animationState']>
  ) => Promise<void>;

  // Performance monitoring
  recordFrameMetrics: (
    sessionId: string,
    frameTime: number,
    droppedFrame: boolean
  ) => void;

  validateTimingAccuracy: (
    sessionId: string,
    expectedTiming: number,
    actualTiming: number
  ) => void;

  // Session continuity for backgrounding
  handleAppBackgrounded: (sessionId: string) => Promise<void>;
  handleAppForegrounded: (sessionId: string) => Promise<boolean>;

  // Memory optimization
  cleanupCompletedSessions: () => void;
  optimizePerformanceTracking: () => void;

  // Reporting
  getPerformanceReport: () => TherapeuticPerformanceMetrics & {
    sessionBreakdown: Record<string, { frameRate: number; timingAccuracy: number }>;
    recommendations: string[];
  };
}

/**
 * Enhanced Therapeutic Session Store with New Architecture optimizations
 */
export const useTherapeuticSessionStore = create<TherapeuticSessionManager>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State initialization
        activeSessions: new Map(),
        breathingSessions: new Map(),

        performanceMetrics: {
          frameRate: 60,
          averageFrameTime: 16.67, // 60fps target
          droppedFrames: 0,
          timingAccuracy: 100,
          sessionCompletionRate: 100,
          backgroundRecoverySuccess: 100,
          lastPerformanceCheck: Date.now()
        },

        continuityStates: new Map(),

        // Start any therapeutic session
        startTherapeuticSession: async <T extends TherapeuticSession>(
          type: T['type'],
          config: Partial<T>
        ): Promise<string> => {
          const startTime = performance.now();
          const sessionId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          try {
            const baseSession: TherapeuticSession = {
              id: sessionId,
              type,
              startedAt: Date.now(),
              expectedDuration: config.expectedDuration || 180000, // 3 minutes default
              currentPhase: 'start',
              phaseProgress: 0,
              totalProgress: 0,
              isActive: true,
              isPaused: false,
              lastUpdate: Date.now(),
              ...config
            };

            // Optimize session state for New Architecture
            const optimizedSession = turboStoreManager.optimizeForFabric(baseSession);

            // Update store state
            const { activeSessions } = get();
            const updatedSessions = new Map(activeSessions);
            updatedSessions.set(sessionId, baseSession);
            set({ activeSessions: updatedSessions });

            // Initialize session continuity tracking
            const continuityState: SessionContinuityState = {
              sessionId,
              backgroundedAt: null,
              foregroundedAt: null,
              totalBackgroundTime: 0,
              recoveryAttempts: 0,
              recoverySuccess: true,
              stateSnapshot: baseSession
            };

            const { continuityStates } = get();
            const updatedContinuity = new Map(continuityStates);
            updatedContinuity.set(sessionId, continuityState);
            set({ continuityStates: updatedContinuity });

            const duration = performance.now() - startTime;

            // Session start should be very fast
            if (duration > 50) {
              console.warn(`Therapeutic session start exceeded 50ms: ${duration}ms`);
            }

            console.log(`Started therapeutic session: ${type} (${sessionId})`);
            return sessionId;

          } catch (error) {
            console.error(`Failed to start therapeutic session ${type}:`, error);
            throw error;
          }
        },

        // Update session state with performance optimization
        updateSessionState: async (
          sessionId: string,
          update: Partial<TherapeuticSession>,
          highFrequency: boolean = false
        ): Promise<void> => {
          const startTime = performance.now();

          try {
            const { activeSessions } = get();
            const currentSession = activeSessions.get(sessionId);

            if (!currentSession) {
              throw new Error(`Session ${sessionId} not found`);
            }

            const updatedSession: TherapeuticSession = {
              ...currentSession,
              ...update,
              lastUpdate: Date.now()
            };

            // High frequency updates (animations) use immediate processing
            if (highFrequency) {
              const crisisResult = await turboStoreManager.guaranteeCrisisResponse(
                updatedSession,
                16 // 60fps requirement: <16.67ms
              );

              if (!crisisResult.meetsRequirement) {
                console.warn(`High frequency update exceeded 16ms: ${crisisResult.latency}ms`);
              }
            }

            // Update store state
            const updatedSessions = new Map(activeSessions);
            updatedSessions.set(sessionId, updatedSession);
            set({ activeSessions: updatedSessions });

            // Update continuity snapshot
            const { continuityStates } = get();
            const continuityState = continuityStates.get(sessionId);
            if (continuityState) {
              const updatedContinuity = new Map(continuityStates);
              updatedContinuity.set(sessionId, {
                ...continuityState,
                stateSnapshot: updatedSession
              });
              set({ continuityStates: updatedContinuity });
            }

            const duration = performance.now() - startTime;

            // Monitor performance based on update type
            const targetDuration = highFrequency ? 16 : 50;
            if (duration > targetDuration) {
              console.warn(
                `Session update exceeded ${targetDuration}ms target: ${duration}ms (${highFrequency ? 'high-freq' : 'standard'})`
              );
            }

          } catch (error) {
            console.error(`Session update failed for ${sessionId}:`, error);
            throw error;
          }
        },

        // Pause session with state preservation
        pauseSession: async (sessionId: string): Promise<void> => {
          const { activeSessions } = get();
          const session = activeSessions.get(sessionId);

          if (!session) {
            throw new Error(`Session ${sessionId} not found`);
          }

          await get().updateSessionState(sessionId, {
            isPaused: true
          });

          console.log(`Paused therapeutic session: ${sessionId}`);
        },

        // Resume session with timing compensation
        resumeSession: async (sessionId: string): Promise<void> => {
          const { activeSessions } = get();
          const session = activeSessions.get(sessionId);

          if (!session) {
            throw new Error(`Session ${sessionId} not found`);
          }

          await get().updateSessionState(sessionId, {
            isPaused: false,
            lastUpdate: Date.now()
          });

          console.log(`Resumed therapeutic session: ${sessionId}`);
        },

        // Complete session with cleanup
        completeSession: async (sessionId: string): Promise<void> => {
          const { activeSessions, continuityStates } = get();
          const session = activeSessions.get(sessionId);

          if (!session) {
            console.warn(`Session ${sessionId} not found for completion`);
            return;
          }

          try {
            // Mark as completed
            await get().updateSessionState(sessionId, {
              isActive: false,
              totalProgress: 1,
              currentPhase: 'completed'
            });

            // Calculate session metrics
            const sessionDuration = Date.now() - session.startedAt;
            const expectedDuration = session.expectedDuration;
            const completionRate = Math.min(1, sessionDuration / expectedDuration);

            // Update completion rate metrics
            const { performanceMetrics } = get();
            const updatedMetrics: TherapeuticPerformanceMetrics = {
              ...performanceMetrics,
              sessionCompletionRate: (performanceMetrics.sessionCompletionRate + completionRate * 100) / 2
            };
            set({ performanceMetrics: updatedMetrics });

            // Clean up session state
            setTimeout(() => {
              const { activeSessions, continuityStates, breathingSessions } = get();

              const updatedActiveSessions = new Map(activeSessions);
              updatedActiveSessions.delete(sessionId);

              const updatedContinuityStates = new Map(continuityStates);
              updatedContinuityStates.delete(sessionId);

              const updatedBreathingSessions = new Map(breathingSessions);
              updatedBreathingSessions.delete(sessionId);

              set({
                activeSessions: updatedActiveSessions,
                continuityStates: updatedContinuityStates,
                breathingSessions: updatedBreathingSessions
              });
            }, 5000); // 5 second delay for UI cleanup

            console.log(`Completed therapeutic session: ${sessionId} (${completionRate * 100}% completion)`);

          } catch (error) {
            console.error(`Failed to complete session ${sessionId}:`, error);
            throw error;
          }
        },

        // Start breathing session with precise timing
        startBreathingSession: async (
          duration: number = 180000, // 3 minutes
          customTimings?: Partial<BreathingSessionState['phaseTimings']>
        ): Promise<string> => {
          const defaultTimings = {
            inhale: 4000,  // 4 seconds
            hold: 7000,    // 7 seconds
            exhale: 8000,  // 8 seconds
            pause: 1000    // 1 second
          };

          const phaseTimings = { ...defaultTimings, ...customTimings };
          const totalCycleTime = Object.values(phaseTimings).reduce((sum, time) => sum + time, 0);
          const targetCycles = Math.floor(duration / totalCycleTime);

          const sessionId = await get().startTherapeuticSession('breathing', {
            expectedDuration: duration,
            subType: 'box_breathing'
          });

          const breathingSession: BreathingSessionState = {
            id: sessionId,
            type: 'breathing',
            subType: 'box_breathing',
            startedAt: Date.now(),
            expectedDuration: duration,
            currentPhase: 'inhale',
            phaseProgress: 0,
            totalProgress: 0,
            isActive: true,
            isPaused: false,
            lastUpdate: Date.now(),
            breathingPhase: 'inhale',
            cycleCount: 0,
            targetCycles,
            phaseTimings,
            animationState: {
              currentRadius: 50,
              targetRadius: 100,
              animationProgress: 0,
              lastFrameTime: Date.now()
            }
          };

          const { breathingSessions } = get();
          const updatedBreathingSessions = new Map(breathingSessions);
          updatedBreathingSessions.set(sessionId, breathingSession);
          set({ breathingSessions: updatedBreathingSessions });

          console.log(`Started breathing session: ${sessionId} (${targetCycles} cycles, ${duration}ms)`);
          return sessionId;
        },

        // Update breathing phase with precise timing
        updateBreathingPhase: async (
          sessionId: string,
          phase: BreathingSessionState['breathingPhase'],
          progress: number
        ): Promise<void> => {
          const startTime = performance.now();

          try {
            const { breathingSessions } = get();
            const breathingSession = breathingSessions.get(sessionId);

            if (!breathingSession) {
              throw new Error(`Breathing session ${sessionId} not found`);
            }

            // Calculate cycle completion
            let cycleCount = breathingSession.cycleCount;
            if (phase === 'inhale' && breathingSession.breathingPhase === 'pause') {
              cycleCount += 1; // New cycle started
            }

            const totalProgress = Math.min(1, cycleCount / breathingSession.targetCycles);

            const updatedBreathingSession: BreathingSessionState = {
              ...breathingSession,
              breathingPhase: phase,
              phaseProgress: progress,
              totalProgress,
              cycleCount,
              lastUpdate: Date.now()
            };

            // Update breathing session state
            const updatedBreathingSessions = new Map(breathingSessions);
            updatedBreathingSessions.set(sessionId, updatedBreathingSession);
            set({ breathingSessions: updatedBreathingSessions });

            // Update base session state (high frequency)
            await get().updateSessionState(sessionId, {
              currentPhase: phase,
              phaseProgress: progress,
              totalProgress
            }, true); // High frequency update

            const duration = performance.now() - startTime;

            // Breathing phase updates must be very fast for smooth animation
            if (duration > 8) {
              console.warn(`Breathing phase update exceeded 8ms: ${duration}ms`);
            }

          } catch (error) {
            console.error(`Breathing phase update failed for ${sessionId}:`, error);
            throw error;
          }
        },

        // Update breathing animation with 60fps optimization
        updateBreathingAnimation: async (
          sessionId: string,
          animationUpdate: Partial<BreathingSessionState['animationState']>
        ): Promise<void> => {
          const startTime = performance.now();

          try {
            const { breathingSessions } = get();
            const breathingSession = breathingSessions.get(sessionId);

            if (!breathingSession) {
              throw new Error(`Breathing session ${sessionId} not found`);
            }

            const updatedAnimationState = {
              ...breathingSession.animationState,
              ...animationUpdate,
              lastFrameTime: Date.now()
            };

            const updatedBreathingSession: BreathingSessionState = {
              ...breathingSession,
              animationState: updatedAnimationState,
              lastUpdate: Date.now()
            };

            // Use optimized state update for high-frequency animation
            const optimizedUpdate = turboStoreManager.optimizeForFabric(updatedBreathingSession);

            const updatedBreathingSessions = new Map(breathingSessions);
            updatedBreathingSessions.set(sessionId, updatedBreathingSession);
            set({ breathingSessions: updatedBreathingSessions });

            const duration = performance.now() - startTime;

            // Animation updates must complete within frame budget (16.67ms for 60fps)
            if (duration > 16) {
              console.warn(`Animation update exceeded 16ms frame budget: ${duration}ms`);
              get().recordFrameMetrics(sessionId, duration, true);
            } else {
              get().recordFrameMetrics(sessionId, duration, false);
            }

          } catch (error) {
            console.error(`Animation update failed for ${sessionId}:`, error);
            throw error;
          }
        },

        // Record frame metrics for performance monitoring
        recordFrameMetrics: (
          sessionId: string,
          frameTime: number,
          droppedFrame: boolean
        ): void => {
          const { performanceMetrics } = get();

          const currentFrameRate = 1000 / frameTime;
          const updatedMetrics: TherapeuticPerformanceMetrics = {
            ...performanceMetrics,
            frameRate: (performanceMetrics.frameRate + currentFrameRate) / 2,
            averageFrameTime: (performanceMetrics.averageFrameTime + frameTime) / 2,
            droppedFrames: droppedFrame ? performanceMetrics.droppedFrames + 1 : performanceMetrics.droppedFrames,
            lastPerformanceCheck: Date.now()
          };

          set({ performanceMetrics: updatedMetrics });

          // Log performance warnings
          if (currentFrameRate < 55) {
            console.warn(`Low frame rate detected: ${currentFrameRate.toFixed(1)}fps`);
          }
        },

        // Validate timing accuracy for therapeutic effectiveness
        validateTimingAccuracy: (
          sessionId: string,
          expectedTiming: number,
          actualTiming: number
        ): void => {
          const accuracy = Math.max(0, 100 - Math.abs(expectedTiming - actualTiming) / expectedTiming * 100);

          const { performanceMetrics } = get();
          const updatedMetrics: TherapeuticPerformanceMetrics = {
            ...performanceMetrics,
            timingAccuracy: (performanceMetrics.timingAccuracy + accuracy) / 2
          };

          set({ performanceMetrics: updatedMetrics });

          // Log timing accuracy warnings
          if (accuracy < 95) {
            console.warn(
              `Timing accuracy below 95%: ${accuracy.toFixed(1)}% (expected: ${expectedTiming}ms, actual: ${actualTiming}ms)`
            );
          }
        },

        // Handle app backgrounding with state preservation
        handleAppBackgrounded: async (sessionId: string): Promise<void> => {
          const { continuityStates } = get();
          const continuityState = continuityStates.get(sessionId);

          if (!continuityState) {
            console.warn(`No continuity state found for session ${sessionId}`);
            return;
          }

          const updatedContinuityState: SessionContinuityState = {
            ...continuityState,
            backgroundedAt: Date.now()
          };

          const updatedContinuityStates = new Map(continuityStates);
          updatedContinuityStates.set(sessionId, updatedContinuityState);
          set({ continuityStates: updatedContinuityStates });

          // Pause the session
          await get().pauseSession(sessionId);

          console.log(`Session ${sessionId} backgrounded at ${updatedContinuityState.backgroundedAt}`);
        },

        // Handle app foregrounding with state recovery
        handleAppForegrounded: async (sessionId: string): Promise<boolean> => {
          const { continuityStates } = get();
          const continuityState = continuityStates.get(sessionId);

          if (!continuityState || !continuityState.backgroundedAt) {
            console.warn(`No valid continuity state for session ${sessionId}`);
            return false;
          }

          try {
            const foregroundTime = Date.now();
            const backgroundDuration = foregroundTime - continuityState.backgroundedAt;

            const updatedContinuityState: SessionContinuityState = {
              ...continuityState,
              foregroundedAt: foregroundTime,
              totalBackgroundTime: continuityState.totalBackgroundTime + backgroundDuration,
              recoveryAttempts: continuityState.recoveryAttempts + 1
            };

            // Check if session can be recovered (not too much time passed)
            const maxBackgroundTime = 5 * 60 * 1000; // 5 minutes
            const canRecover = backgroundDuration < maxBackgroundTime;

            if (canRecover) {
              // Resume the session
              await get().resumeSession(sessionId);

              updatedContinuityState.recoverySuccess = true;

              const { performanceMetrics } = get();
              const updatedMetrics: TherapeuticPerformanceMetrics = {
                ...performanceMetrics,
                backgroundRecoverySuccess: (performanceMetrics.backgroundRecoverySuccess + 100) / 2
              };
              set({ performanceMetrics: updatedMetrics });

              console.log(`Session ${sessionId} recovered successfully after ${backgroundDuration}ms background`);
            } else {
              // Too much time passed, mark as failed recovery
              updatedContinuityState.recoverySuccess = false;

              const { performanceMetrics } = get();
              const updatedMetrics: TherapeuticPerformanceMetrics = {
                ...performanceMetrics,
                backgroundRecoverySuccess: (performanceMetrics.backgroundRecoverySuccess + 0) / 2
              };
              set({ performanceMetrics: updatedMetrics });

              console.log(`Session ${sessionId} recovery failed: too much time passed (${backgroundDuration}ms)`);
            }

            const updatedContinuityStates = new Map(continuityStates);
            updatedContinuityStates.set(sessionId, updatedContinuityState);
            set({ continuityStates: updatedContinuityStates });

            return canRecover;

          } catch (error) {
            console.error(`Session recovery failed for ${sessionId}:`, error);
            return false;
          }
        },

        // Clean up completed sessions to prevent memory growth
        cleanupCompletedSessions: (): void => {
          const { activeSessions, continuityStates, breathingSessions } = get();
          const now = Date.now();
          const maxAge = 10 * 60 * 1000; // 10 minutes

          let cleanedSessions = 0;

          // Clean up active sessions that are old and inactive
          const updatedActiveSessions = new Map();
          for (const [sessionId, session] of activeSessions.entries()) {
            if (session.isActive || (now - session.lastUpdate) < maxAge) {
              updatedActiveSessions.set(sessionId, session);
            } else {
              cleanedSessions++;
            }
          }

          // Clean up continuity states for non-existent sessions
          const updatedContinuityStates = new Map();
          for (const [sessionId, continuityState] of continuityStates.entries()) {
            if (updatedActiveSessions.has(sessionId)) {
              updatedContinuityStates.set(sessionId, continuityState);
            }
          }

          // Clean up breathing sessions for non-existent sessions
          const updatedBreathingSessions = new Map();
          for (const [sessionId, breathingSession] of breathingSessions.entries()) {
            if (updatedActiveSessions.has(sessionId)) {
              updatedBreathingSessions.set(sessionId, breathingSession);
            }
          }

          set({
            activeSessions: updatedActiveSessions,
            continuityStates: updatedContinuityStates,
            breathingSessions: updatedBreathingSessions
          });

          if (cleanedSessions > 0) {
            console.log(`Cleaned up ${cleanedSessions} completed therapeutic sessions`);
          }
        },

        // Optimize performance tracking to prevent memory growth
        optimizePerformanceTracking: (): void => {
          const { performanceMetrics } = get();

          // Reset counters periodically to prevent overflow
          const updatedMetrics: TherapeuticPerformanceMetrics = {
            ...performanceMetrics,
            droppedFrames: Math.min(performanceMetrics.droppedFrames, 1000),
            lastPerformanceCheck: Date.now()
          };

          set({ performanceMetrics: updatedMetrics });
        },

        // Get comprehensive performance report
        getPerformanceReport: () => {
          const { performanceMetrics, activeSessions, breathingSessions } = get();

          // Calculate per-session breakdown
          const sessionBreakdown: Record<string, { frameRate: number; timingAccuracy: number }> = {};

          for (const [sessionId, session] of activeSessions.entries()) {
            if (session.type === 'breathing') {
              const breathingSession = breathingSessions.get(sessionId);
              if (breathingSession) {
                // Calculate session-specific metrics (would need more detailed tracking)
                sessionBreakdown[sessionId] = {
                  frameRate: performanceMetrics.frameRate,
                  timingAccuracy: performanceMetrics.timingAccuracy
                };
              }
            }
          }

          const recommendations: string[] = [];

          // Performance recommendations
          if (performanceMetrics.frameRate < 55) {
            recommendations.push('Frame rate below 55fps - consider reducing animation complexity');
          }

          if (performanceMetrics.averageFrameTime > 20) {
            recommendations.push('Average frame time above 20ms - optimize animation updates');
          }

          if (performanceMetrics.droppedFrames > 100) {
            recommendations.push('High number of dropped frames - investigate performance bottlenecks');
          }

          if (performanceMetrics.timingAccuracy < 95) {
            recommendations.push('Timing accuracy below 95% - verify timing precision');
          }

          if (performanceMetrics.sessionCompletionRate < 80) {
            recommendations.push('Low session completion rate - investigate user experience issues');
          }

          if (performanceMetrics.backgroundRecoverySuccess < 80) {
            recommendations.push('Low background recovery success - improve session state management');
          }

          return {
            ...performanceMetrics,
            sessionBreakdown,
            recommendations
          };
        }
      }),
      {
        name: 'therapeutic-session-store',
        storage: createJSONStorage(() => ({
          getItem: async (name: string) => {
            return enhancedAsyncStorage.getItem(name);
          },
          setItem: async (name: string, value: string) => {
            return enhancedAsyncStorage.setItem(name, value);
          },
          removeItem: async (name: string) => {
            return enhancedAsyncStorage.removeItem(name);
          }
        })),
        partialize: (state) => ({
          performanceMetrics: state.performanceMetrics,
          // Don't persist active sessions - they should restart fresh
        }),
        version: 1,
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log('Therapeutic session store rehydrated successfully');
            // Clean up any stale data on rehydration
            state.cleanupCompletedSessions?.();
          }
        }
      }
    )
  )
);

// Automatic cleanup and optimization
setInterval(() => {
  const state = useTherapeuticSessionStore.getState();
  state.cleanupCompletedSessions();
  state.optimizePerformanceTracking();
}, 2 * 60 * 1000); // Every 2 minutes

// App state change handlers
let appStateChangeHandlers: (() => void)[] = [];

export const registerAppStateHandlers = () => {
  const { AppState } = require('react-native');

  const handleAppStateChange = (nextAppState: string) => {
    const state = useTherapeuticSessionStore.getState();

    if (nextAppState === 'background') {
      // Handle all active sessions going to background
      for (const sessionId of state.activeSessions.keys()) {
        state.handleAppBackgrounded(sessionId);
      }
    } else if (nextAppState === 'active') {
      // Handle all sessions coming back to foreground
      for (const sessionId of state.activeSessions.keys()) {
        state.handleAppForegrounded(sessionId);
      }
    }
  };

  AppState.addEventListener('change', handleAppStateChange);

  appStateChangeHandlers.push(() => {
    AppState.removeEventListener('change', handleAppStateChange);
  });
};

// Cleanup function for app state handlers
export const cleanupAppStateHandlers = () => {
  appStateChangeHandlers.forEach(cleanup => cleanup());
  appStateChangeHandlers = [];
};

// Hooks for easier component integration
export const useBreathingSession = (sessionId?: string) => {
  const store = useTherapeuticSessionStore();

  return {
    startSession: store.startBreathingSession,
    updatePhase: store.updateBreathingPhase,
    updateAnimation: store.updateBreathingAnimation,
    pauseSession: () => sessionId ? store.pauseSession(sessionId) : Promise.resolve(),
    resumeSession: () => sessionId ? store.resumeSession(sessionId) : Promise.resolve(),
    completeSession: () => sessionId ? store.completeSession(sessionId) : Promise.resolve(),
    currentSession: sessionId ? store.breathingSessions.get(sessionId) : null,
    performanceMetrics: store.getPerformanceReport()
  };
};

export const useTherapeuticPerformance = () => {
  const store = useTherapeuticSessionStore();

  return {
    recordFrame: store.recordFrameMetrics,
    validateTiming: store.validateTimingAccuracy,
    getReport: store.getPerformanceReport,
    cleanup: store.cleanupCompletedSessions
  };
};