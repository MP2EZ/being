/**
 * MiddayFlowNavigator - Stoic Mindfulness Midday Reset
 *
 * DRD v2.0.0 SPECIFICATION (DRD-FLOW-003):
 * - 4 practices: Control → Embodiment → Reappraisal → Affirmation
 * - 3-7 minutes flexible duration
 * - Interrupt-friendly (can pause/resume)
 * - Modal presentation from CleanHomeScreen
 * - Midday theme throughout (#40B5AD)
 * - Crisis-accessible (<3s from any screen)
 *
 * FEAT-23: Session resumption with philosopher-validated Stoic language
 * - Supports resuming interrupted sessions (24hr TTL)
 * - Automatic session saving on screen navigation
 * - Sphere Sovereignty: Both resume and fresh start equally virtuous
 *
 * PHILOSOPHY:
 * - Mindfulness-first with Stoic wisdom enrichment
 * - NOT toxic positivity - realistic perspective shift
 * - Grounded affirmations (capability within control)
 * - Oikeiôsis framework (self-compassion as foundation)
 */

import { logSecurity, logPerformance, logError, LogCategory } from '../../services/logging';
import React, { useState, useEffect, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing } from '../../constants/colors';
import { SessionStorageService } from '../../services/session/SessionStorageService';
import { SessionMetadata } from '../../types/session';
import { ResumeSessionModal } from '../shared/components/ResumeSessionModal';
import ControlCheckScreen from './screens/ControlCheckScreen';
import EmbodimentScreen from './screens/EmbodimentScreen';
import ReappraisalScreen from './screens/ReappraisalScreen';
import AffirmationScreen from './screens/AffirmationScreen';
import MiddayCompletionScreen from './screens/MiddayCompletionScreen';

// Navigation types (DRD v2.0.0 compliant)
export type MiddayFlowParamList = {
  ControlCheck: undefined;
  Embodiment: undefined;
  Reappraisal: undefined;
  Affirmation: undefined;
  MiddayCompletion: undefined;
};

interface MiddayFlowNavigatorProps {
  onComplete: (sessionData: any) => void;
  onExit: () => void;
}

const Stack = createStackNavigator<MiddayFlowParamList>();

// Progress indicator component (consistent with Evening/Morning)
const ProgressIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: colorSystem.themes.midday.primary
            }
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

// Screen order mapping for progress calculation (DRD v2.0.0)
const SCREEN_ORDER: (keyof MiddayFlowParamList)[] = [
  'ControlCheck',
  'Embodiment',
  'Reappraisal',
  'Affirmation',
  'MiddayCompletion'
];

const MiddayFlowNavigator: React.FC<MiddayFlowNavigatorProps> = ({
  onComplete,
  onExit
}) => {
  const [sessionData, setSessionData] = useState<{
    startTime: number;
    controlCheckData?: any;
    embodimentData?: any;
    reappraisalData?: any;
    affirmationData?: any;
  }>({
    startTime: Date.now()
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length - 1; // 4 steps (exclude MiddayCompletion)

  // FEAT-23: Accumulated screen data for session persistence
  const [screenData, setScreenData] = useState<Record<string, any>>({});
  const loadedScreenData = useRef<Record<string, any>>({}); // Store loaded data immediately for handleResumeSession

  // FEAT-23: Session resumption state
  const [isCheckingSession, setIsCheckingSession] = useState(true); // Prevent navigator mounting until checked
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumableSession, setResumableSession] = useState<SessionMetadata | null>(null);
  const [initialNavigationState, setInitialNavigationState] = useState<any>(undefined);
  const [shouldResetNav, setShouldResetNav] = useState(false); // Trigger navigation reset
  const hasCheckedSession = useRef(false);
  const lastSavedStep = useRef(0); // Track last saved step to prevent backward saves
  const hasResetNav = useRef(false); // Track if we've already reset to prevent loops

  // FEAT-23: Check for resumable session on mount
  useEffect(() => {
    const checkForResumableSession = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;

      try {
        const fullSession = await SessionStorageService.loadSession('midday');
        if (fullSession) {
          const { flowState, ...metadata } = fullSession;

          // Don't show resume modal if we're at the first screen
          if (metadata.currentScreen === SCREEN_ORDER[0]) {
            console.log('[MiddayFlow] Session at first screen, clearing and starting fresh');
            await SessionStorageService.clearSession('midday');
            setIsCheckingSession(false);
            return;
          }

          setResumableSession(metadata);
          setShowResumeModal(true);

          // Restore screen data if available
          if (flowState?.['screenData']) {
            loadedScreenData.current = flowState["screenData"]; // Store in ref immediately
            setScreenData(flowState["screenData"]); // Also update state for UI
            console.log(`[MiddayFlow] Restored screen data for ${Object.keys(flowState["screenData"]).length} screens`);
          }
        }
      } catch (error) {
        console.error('[MiddayFlow] Failed to check for resumable session:', error);
      } finally {
        setIsCheckingSession(false); // Done checking, safe to render navigator
      }
    };

    checkForResumableSession();
  }, []);

  // FEAT-23: Handle resume session
  const handleResumeSession = () => {
    if (!resumableSession) return;

    try {
      // Build navigation state with full stack up to resumed screen
      const screenName = resumableSession.currentScreen as keyof MiddayFlowParamList;
      const screenIndex = SCREEN_ORDER.indexOf(screenName);

      if (screenIndex === -1) {
        console.error(`[MiddayFlow] Invalid screen name: ${screenName}`);
        return;
      }

      // Create navigation state with all screens up to and including the resumed screen
      // Use loadedScreenData.current (not screenData state) because state hasn't updated yet
      const routes = SCREEN_ORDER.slice(0, screenIndex + 1).map((name, idx) => ({
        key: `${name}-${idx}`,
        name,
        params: {
          initialData: loadedScreenData.current[name] // Use ref, not state
        }
      }));

      const navState = {
        type: 'stack',
        index: screenIndex,
        routes,
        key: `stack-${Date.now()}`
      };

      // Set lastSavedStep to resumed screen index to prevent earlier screens from saving
      lastSavedStep.current = screenIndex;

      setInitialNavigationState(navState);
      setShowResumeModal(false);
      setShouldResetNav(true); // Trigger imperative reset after navigator mounts

      // Debug logging
      const screensWithData = routes.filter(r => r.params?.initialData).map(r => r.name);
      console.log(`[MiddayFlow] Resumed at ${screenName} (index ${screenIndex}) with ${routes.length} screens in stack`);
      console.log(`[MiddayFlow] Screens with data: ${screensWithData.join(', ')}`);
      console.log(`[MiddayFlow] Initial state:`, JSON.stringify(navState, null, 2));
    } catch (error) {
      console.error('[MiddayFlow] Failed to resume session:', error);
    }
  };

  // FEAT-23: Handle begin fresh (clear old session)
  const handleBeginFresh = async () => {
    try {
      await SessionStorageService.clearSession('midday');
      setInitialNavigationState(undefined); // undefined = use default initialRouteName
      setShowResumeModal(false);
      setResumableSession(null);
      lastSavedStep.current = 0; // Reset saved step tracking
      hasResetNav.current = false; // Reset the flag
      console.log('[MiddayFlow] Starting fresh midday session');
    } catch (error) {
      console.error('[MiddayFlow] Failed to clear session:', error);
    }
  };

  // Custom header with progress
  const getHeaderOptions = (routeName: keyof MiddayFlowParamList, title: string) => ({
    headerTitle: () => (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
      </View>
    ),
    headerTitleAlign: 'center' as const,
  });

  // Screen wrappers with data persistence
  const ControlCheckScreenWrapper = ({ navigation, route }: any) => (
    <ControlCheckScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        // Update state
        const newScreenData = { ...screenData, ControlCheck: data };
        setScreenData(newScreenData);

        // Also update sessionData for completion screen
        const updatedSessionData = {
          ...sessionData,
          controlCheckData: data
        };
        setSessionData(updatedSessionData);

        // Save immediately with updated data (don't wait for navigation)
        const nextScreen = 'Embodiment';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('midday', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[MiddayFlow] Failed to save from ControlCheck:', error));
        }

        console.log('✅ ControlCheck completed');
      }}
    />
  );

  const EmbodimentScreenWrapper = ({ navigation, route }: any) => (
    <EmbodimentScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        // Update state
        const newScreenData = { ...screenData, Embodiment: data };
        setScreenData(newScreenData);

        // Also update sessionData for completion screen
        const updatedSessionData = {
          ...sessionData,
          embodimentData: data
        };
        setSessionData(updatedSessionData);

        // Save immediately with updated data
        const nextScreen = 'Reappraisal';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('midday', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[MiddayFlow] Failed to save from Embodiment:', error));
        }

        console.log('✅ Embodiment completed');
      }}
    />
  );

  const ReappraisalScreenWrapper = ({ navigation, route }: any) => (
    <ReappraisalScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        // Update state
        const newScreenData = { ...screenData, Reappraisal: data };
        setScreenData(newScreenData);

        // Also update sessionData for completion screen
        const updatedSessionData = {
          ...sessionData,
          reappraisalData: data
        };
        setSessionData(updatedSessionData);

        // Save immediately with updated data
        const nextScreen = 'Affirmation';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('midday', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[MiddayFlow] Failed to save from Reappraisal:', error));
        }

        console.log('✅ Reappraisal completed');
      }}
    />
  );

  const AffirmationScreenWrapper = ({ navigation, route }: any) => (
    <AffirmationScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        // Update state
        const newScreenData = { ...screenData, Affirmation: data };
        setScreenData(newScreenData);

        // Also update sessionData for completion screen
        const updatedSessionData = {
          ...sessionData,
          affirmationData: data
        };
        setSessionData(updatedSessionData);

        // Save immediately with updated data
        const nextScreen = 'MiddayCompletion';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('midday', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[MiddayFlow] Failed to save from Affirmation:', error));
        }

        console.log('✅ Affirmation completed');
      }}
    />
  );

  const MiddayCompletionScreenWrapper = ({ navigation }: any) => {
    const finalSessionData = {
      ...sessionData,
      completedAt: Date.now(),
      duration: Date.now() - sessionData.startTime
    };

    return (
      <MiddayCompletionScreen
        navigation={navigation}
        route={{ params: {} } as any}
        onComplete={() => {
          console.log('✅ Midday flow completed');
          onComplete(finalSessionData);
        }}
      />
    );
  };

  // Don't render anything until we've checked for a session
  if (isCheckingSession) {
    return null; // Could show a loading spinner here if desired
  }

  // Don't render navigator until resume modal is dismissed to prevent premature saves
  if (showResumeModal) {
    return (
      <ResumeSessionModal
        visible={showResumeModal}
        session={resumableSession}
        onResume={handleResumeSession}
        onBeginFresh={handleBeginFresh}
      />
    );
  }

  return (
    <>
      <Stack.Navigator
        initialRouteName="ControlCheck"
        screenOptions={{
          headerShown: true,
          gestureEnabled: true, // Allow swipe back for safety
          cardStyle: { backgroundColor: 'transparent' },
          headerStyle: {
            backgroundColor: colorSystem.themes.midday.background,
            borderBottomColor: colorSystem.themes.midday.primary,
            borderBottomWidth: 1,
            height: 100, // Increased height for progress indicator
          },
          headerTintColor: colorSystem.themes.midday.primary,
          headerLeft: () => (
            <Pressable
              onPress={onExit}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close midday flow"
              accessibilityHint="Returns to home screen"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          ),
        }}
        screenListeners={({ navigation }) => ({
          state: (e) => {
            // FEAT-23: Trigger imperative reset if needed (on first mount after resume)
            if (shouldResetNav && !hasResetNav.current && initialNavigationState) {
              hasResetNav.current = true;
              console.log('[MiddayFlow] Triggering imperative reset with state:', initialNavigationState);

              // Reset navigation state
              navigation.reset(initialNavigationState);
              setShouldResetNav(false);
              console.log('[MiddayFlow] Imperative reset complete');
              return; // Don't process state update this cycle
            }

            // Update progress based on current screen
            const state = e.data.state;
            if (state) {
              const currentRouteName = state.routes[state.index]?.name;
              const stepIndex = SCREEN_ORDER.indexOf(currentRouteName as keyof MiddayFlowParamList);
              if (stepIndex !== -1) {
                setCurrentStep(stepIndex + 1);
              }

              // FEAT-23: Save session progress only on forward navigation
              // Only save if we're moving to a new screen or staying on the same screen
              // Don't save if moving backward (exit/back button pressed)
              if (currentRouteName &&
                  currentRouteName !== 'MiddayCompletion' &&
                  stepIndex >= lastSavedStep.current) {
                console.log(`[MiddayFlow] Saving session: stepIndex=${stepIndex}, lastSavedStep=${lastSavedStep.current}, screen=${currentRouteName}`);
                lastSavedStep.current = stepIndex;
                SessionStorageService.saveSession('midday', currentRouteName as string, {
                  screenData // Save accumulated screen data
                })
                  .catch(error => {
                    console.error('[MiddayFlow] Failed to save session:', error);
                  });
              } else if (currentRouteName && currentRouteName !== 'MiddayCompletion') {
                console.log(`[MiddayFlow] NOT saving (backward nav): stepIndex=${stepIndex}, lastSavedStep=${lastSavedStep.current}, screen=${currentRouteName}`);
              }
            }
          },
        })}
      >
      <Stack.Screen
        name="ControlCheck"
        component={ControlCheckScreenWrapper}
        options={getHeaderOptions('ControlCheck', 'Pause & Center')}
      />

      <Stack.Screen
        name="Embodiment"
        component={EmbodimentScreenWrapper}
        options={getHeaderOptions('Embodiment', 'Ground in Your Body')}
      />

      <Stack.Screen
        name="Reappraisal"
        component={ReappraisalScreenWrapper}
        options={getHeaderOptions('Reappraisal', 'Reframe with Wisdom')}
      />

      <Stack.Screen
        name="Affirmation"
        component={AffirmationScreenWrapper}
        options={getHeaderOptions('Affirmation', 'Self-Compassion')}
      />

      <Stack.Screen
        name="MiddayCompletion"
        component={MiddayCompletionScreenWrapper}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
    </>
  );
};

const styles = StyleSheet.create({
  // Header container and title
  headerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },

  // Progress indicator styles
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    width: 120,
    height: 4,
    backgroundColor: colorSystem.gray[200],
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colorSystem.gray[600],
    fontWeight: '500',
  },

  // Exit button (consistent with Evening/Morning)
  closeButton: {
    marginLeft: spacing.md,
    padding: spacing.sm,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: colorSystem.base.black,
    fontWeight: '300',
  },
});

export default MiddayFlowNavigator;
