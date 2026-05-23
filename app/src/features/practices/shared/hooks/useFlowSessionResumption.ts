/**
 * useFlowSessionResumption Hook
 *
 * FEAT-23: Session resumption for flow navigators with philosopher-validated Stoic language.
 * Extracted from MorningFlowNavigator, MiddayFlowNavigator, EveningFlowNavigator
 * to reduce code duplication (~210 lines saved across 3 navigators).
 *
 * Features:
 * - Supports resuming interrupted sessions (24hr TTL)
 * - Automatic session saving on screen navigation
 * - Sphere Sovereignty: Both resume and fresh start equally virtuous
 *
 * Classical Stoic Foundation:
 * - Marcus Aurelius: Daily morning preparation (Meditations 2:1)
 * - Epictetus: Begin the day with right principles (Enchiridion 21)
 * - Seneca: "Begin at once to live" (Letters 101)
 *
 * INFRA-135: DRY refactor for flow navigators
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SessionStorageService } from '@/core/services/session/SessionStorageService';
import { SessionMetadata } from '@/core/types/session';

export type FlowType = 'morning' | 'midday' | 'evening';

interface UseFlowSessionResumptionOptions<TScreenName extends string> {
  /** Flow type for session storage */
  flowType: FlowType;
  /** Ordered list of screen names in the flow */
  screenOrder: readonly TScreenName[];
  /** Log prefix for debugging */
  logPrefix?: string;
}

interface UseFlowSessionResumptionResult<TScreenName extends string> {
  /** Whether the hook is still checking for a resumable session */
  isCheckingSession: boolean;
  /** Whether to show the resume modal */
  showResumeModal: boolean;
  /** The resumable session metadata (if any) */
  resumableSession: SessionMetadata | null;
  /** Initial navigation state for resuming (undefined = fresh start) */
  initialNavigationState: any;
  /** Whether to trigger an imperative navigation reset */
  shouldResetNav: boolean;
  /** Ref tracking the last saved step index (to prevent backward saves) */
  lastSavedStep: React.MutableRefObject<number>;
  /** Ref tracking if navigation reset has occurred */
  hasResetNav: React.MutableRefObject<boolean>;
  /** Accumulated screen data for session persistence */
  screenData: Record<string, any>;
  /** Ref for loaded screen data (for immediate access in handleResumeSession) */
  loadedScreenData: React.MutableRefObject<Record<string, any>>;
  /** Handler for resuming a session */
  handleResumeSession: () => void;
  /** Handler for beginning a fresh session */
  handleBeginFresh: () => Promise<void>;
  /** Update screen data and optionally save session */
  updateScreenData: (screenName: TScreenName, data: any, nextScreen?: TScreenName) => void;
  /** Save session progress (called from screenListeners) */
  saveSessionProgress: (currentRouteName: string, stepIndex: number) => void;
  /** Handle navigation state change (for screenListeners) */
  handleNavigationStateChange: (
    navigation: any,
    state: any,
    setCurrentStep: (step: number) => void
  ) => void;
  /** Clear shouldResetNav after reset complete */
  clearResetNav: () => void;
}

export function useFlowSessionResumption<TScreenName extends string>({
  flowType,
  screenOrder,
  logPrefix = `[${flowType.charAt(0).toUpperCase() + flowType.slice(1)}Flow]`,
}: UseFlowSessionResumptionOptions<TScreenName>): UseFlowSessionResumptionResult<TScreenName> {
  // Session resumption state
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumableSession, setResumableSession] = useState<SessionMetadata | null>(null);
  const [initialNavigationState, setInitialNavigationState] = useState<any>(undefined);
  const [shouldResetNav, setShouldResetNav] = useState(false);

  // Refs for tracking state across renders
  const hasCheckedSession = useRef(false);
  const lastSavedStep = useRef(0);
  const hasResetNav = useRef(false);

  // Accumulated screen data for session persistence
  const [screenData, setScreenData] = useState<Record<string, any>>({});
  const loadedScreenData = useRef<Record<string, any>>({});

  // Check for resumable session on mount
  useEffect(() => {
    const checkForResumableSession = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;

      try {
        const fullSession = await SessionStorageService.loadSession(flowType);
        if (fullSession) {
          const { flowState, ...metadata } = fullSession;

          // Don't show resume modal if we're at the first screen
          if (metadata.currentScreen === screenOrder[0]) {
            console.log(`${logPrefix} Session at first screen, clearing and starting fresh`);
            await SessionStorageService.clearSession(flowType);
            setIsCheckingSession(false);
            return;
          }

          setResumableSession(metadata);
          setShowResumeModal(true);

          // Restore screen data if available
          if (flowState?.['screenData']) {
            loadedScreenData.current = flowState['screenData'];
            setScreenData(flowState['screenData']);
            console.log(
              `${logPrefix} Restored screen data for ${Object.keys(flowState['screenData']).length} screens`
            );
          }
        }
      } catch (error) {
        console.error(`${logPrefix} Failed to check for resumable session:`, error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkForResumableSession();
  }, [flowType, screenOrder, logPrefix]);

  // Handle resume session
  const handleResumeSession = useCallback(() => {
    if (!resumableSession) return;

    try {
      const screenName = resumableSession.currentScreen as TScreenName;
      const screenIndex = screenOrder.indexOf(screenName);

      if (screenIndex === -1) {
        console.error(`${logPrefix} Invalid screen name: ${screenName}`);
        return;
      }

      // Create navigation state with all screens up to and including the resumed screen
      const routes = screenOrder.slice(0, screenIndex + 1).map((name, idx) => ({
        key: `${name}-${idx}`,
        name,
        params: {
          initialData: loadedScreenData.current[name],
        },
      }));

      const navState = {
        index: screenIndex,
        routes,
      };

      // Set lastSavedStep to resumed screen index to prevent earlier screens from saving
      lastSavedStep.current = screenIndex;

      setInitialNavigationState(navState);
      setShowResumeModal(false);
      setShouldResetNav(true);

      // Debug logging
      const screensWithData = routes.filter((r) => r.params?.initialData).map((r) => r.name);
      console.log(
        `${logPrefix} Resumed at ${screenName} (index ${screenIndex}) with ${routes.length} screens in stack`
      );
      console.log(`${logPrefix} Screens with data: ${screensWithData.join(', ')}`);
    } catch (error) {
      console.error(`${logPrefix} Failed to resume session:`, error);
    }
  }, [resumableSession, screenOrder, logPrefix]);

  // Handle begin fresh
  const handleBeginFresh = useCallback(async () => {
    try {
      await SessionStorageService.clearSession(flowType);
      setInitialNavigationState(undefined);
      setShowResumeModal(false);
      setResumableSession(null);
      lastSavedStep.current = 0;
      hasResetNav.current = false;
      console.log(`${logPrefix} Starting fresh ${flowType} session`);
    } catch (error) {
      console.error(`${logPrefix} Failed to clear session:`, error);
    }
  }, [flowType, logPrefix]);

  // Update screen data and optionally save session
  const updateScreenData = useCallback(
    (screenName: TScreenName, data: any, nextScreen?: TScreenName) => {
      const newScreenData = { ...screenData, [screenName]: data };
      setScreenData(newScreenData);

      if (nextScreen) {
        const nextIndex = screenOrder.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession(flowType, nextScreen, {
            screenData: newScreenData,
          }).catch((error) =>
            console.error(`${logPrefix} Failed to save from ${screenName}:`, error)
          );
        }
      }
    },
    [screenData, screenOrder, flowType, logPrefix]
  );

  // Save session progress (for screenListeners)
  const saveSessionProgress = useCallback(
    (currentRouteName: string, stepIndex: number) => {
      const completionScreen = screenOrder[screenOrder.length - 1];
      if (currentRouteName !== completionScreen && stepIndex >= lastSavedStep.current) {
        console.log(
          `${logPrefix} Saving session: stepIndex=${stepIndex}, lastSavedStep=${lastSavedStep.current}, screen=${currentRouteName}`
        );
        lastSavedStep.current = stepIndex;
        SessionStorageService.saveSession(flowType, currentRouteName, {
          screenData,
        }).catch((error) => {
          console.error(`${logPrefix} Failed to save session:`, error);
        });
      } else if (currentRouteName !== completionScreen) {
        console.log(
          `${logPrefix} NOT saving (backward nav): stepIndex=${stepIndex}, lastSavedStep=${lastSavedStep.current}, screen=${currentRouteName}`
        );
      }
    },
    [flowType, screenData, screenOrder, logPrefix]
  );

  // Handle navigation state change (for screenListeners)
  const handleNavigationStateChange = useCallback(
    (navigation: any, state: any, setCurrentStep: (step: number) => void) => {
      // Trigger imperative reset if needed (on first mount after resume)
      if (shouldResetNav && !hasResetNav.current && initialNavigationState) {
        hasResetNav.current = true;
        console.log(`${logPrefix} Triggering imperative reset with state:`, initialNavigationState);
        navigation.reset(initialNavigationState);
        setShouldResetNav(false);
        console.log(`${logPrefix} Imperative reset complete`);
        return;
      }

      // Update progress based on current screen
      if (state) {
        const currentRouteName = state.routes[state.index]?.name;
        const stepIndex = screenOrder.indexOf(currentRouteName as TScreenName);
        if (stepIndex !== -1) {
          setCurrentStep(stepIndex + 1);
        }

        // Save session progress only on forward navigation
        if (currentRouteName) {
          saveSessionProgress(currentRouteName, stepIndex);
        }
      }
    },
    [shouldResetNav, initialNavigationState, screenOrder, saveSessionProgress, logPrefix]
  );

  // Clear shouldResetNav
  const clearResetNav = useCallback(() => {
    setShouldResetNav(false);
  }, []);

  return {
    isCheckingSession,
    showResumeModal,
    resumableSession,
    initialNavigationState,
    shouldResetNav,
    lastSavedStep,
    hasResetNav,
    screenData,
    loadedScreenData,
    handleResumeSession,
    handleBeginFresh,
    updateScreenData,
    saveSessionProgress,
    handleNavigationStateChange,
    clearResetNav,
  };
}

export default useFlowSessionResumption;
