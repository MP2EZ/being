/**
 * Evening Flow Navigator - DRD v2.0.0
 * Stoic Mindfulness Evening Practice (6 screens)
 *
 * CRITICAL CLINICAL SAFETY IMPLEMENTATION:
 * - Crisis button always present in headers
 * - Gentle therapeutic language in titles
 * - Evening-appropriate header styling
 * - Safety-first navigation approach
 *
 * FEAT-23: Session resumption with philosopher-validated Stoic language
 * - Supports resuming interrupted sessions (24hr TTL)
 * - Automatic session saving on screen navigation
 * - Sphere Sovereignty: Both resume and fresh start equally virtuous
 *
 * Flow (8-12 min):
 * 1. VirtueReflection - Mindful reflection on successes and growth areas
 * 2. Gratitude - Gratitude practice
 * 3. Tomorrow - Intention setting + letting go
 * 4. SelfCompassion - Self-compassion practice (REQUIRED)
 * 5. SleepTransition - Mindful breathing for sleep
 * 6. EveningCompletion - Flow summary and encouragement
 *
 * Note: Detailed virtue tracking (VirtueInstances/VirtueChallenges) available
 * separately via Profile > Virtue Dashboard to avoid evening flow fatigue.
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow)
 */

import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import React, { useState, useEffect, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import { EveningFlowParamList } from '@/features/practices/types/flows';
import { SessionStorageService } from '@/core/services/session/SessionStorageService';
import { SessionMetadata } from '@/core/types/session';
import { ResumeSessionModal } from '../shared/components/ResumeSessionModal';

// Import DRD v2.0.0 Stoic Mindfulness screens
import VirtueReflectionScreen from './screens/VirtueReflectionScreen';
import GratitudeScreen from './screens/GratitudeScreen';
import TomorrowScreen from './screens/TomorrowScreen';
import SelfCompassionScreen from './screens/SelfCompassionScreen';
import SleepTransitionScreen from './screens/SleepTransitionScreen';
import EveningCompletionScreen from './screens/EveningCompletionScreen';

const Stack = createStackNavigator<EveningFlowParamList>();

interface EveningFlowNavigatorProps {
  onComplete: (sessionData: any) => void;
  onExit: () => void;
}

// Progress indicator component
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
              backgroundColor: colorSystem.themes.evening.primary
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

// Close/Exit Header Component
const ExitHeaderButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <View style={headerStyles.exitContainer}>
    <Pressable
      style={headerStyles.exitButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Close evening flow"
      accessibilityHint="Returns to home screen"
    >
      <Text style={headerStyles.exitButtonText}>✕</Text>
    </Pressable>
  </View>
);

// Screen order mapping for progress calculation (streamlined 6-screen flow)
const SCREEN_ORDER: (keyof EveningFlowParamList)[] = [
  'VirtueReflection',
  'Gratitude',
  'Tomorrow',
  'SelfCompassion',
  'SleepTransition',
  'EveningCompletion'
];

const EveningFlowNavigator: React.FC<EveningFlowNavigatorProps> = ({
  onComplete,
  onExit
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length - 1; // Exclude EveningCompletion from count

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
        const fullSession = await SessionStorageService.loadSession('evening');
        if (fullSession) {
          const { flowState, ...metadata } = fullSession;

          // Don't show resume modal if we're at the first screen
          if (metadata.currentScreen === SCREEN_ORDER[0]) {
            console.log('[EveningFlow] Session at first screen, clearing and starting fresh');
            await SessionStorageService.clearSession('evening');
            setIsCheckingSession(false);
            return;
          }

          setResumableSession(metadata);
          setShowResumeModal(true);

          // Restore screen data if available
          if (flowState?.['screenData']) {
            loadedScreenData.current = flowState["screenData"]; // Store in ref immediately
            setScreenData(flowState["screenData"]); // Also update state for UI
            console.log(`[EveningFlow] Restored screen data for ${Object.keys(flowState["screenData"]).length} screens`);
          }
        }
      } catch (error) {
        console.error('[EveningFlow] Failed to check for resumable session:', error);
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
      const screenName = resumableSession.currentScreen as keyof EveningFlowParamList;
      const screenIndex = SCREEN_ORDER.indexOf(screenName);

      if (screenIndex === -1) {
        console.error(`[EveningFlow] Invalid screen name: ${screenName}`);
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
        index: screenIndex,
        routes
      };

      // Set lastSavedStep to resumed screen index to prevent earlier screens from saving
      lastSavedStep.current = screenIndex;

      setInitialNavigationState(navState);
      setShowResumeModal(false);
      setShouldResetNav(true); // Trigger imperative reset after navigator mounts

      // Debug logging
      const screensWithData = routes.filter(r => r.params?.initialData).map(r => r.name);
      console.log(`[EveningFlow] Resumed at ${screenName} (index ${screenIndex}) with ${routes.length} screens in stack`);
      console.log(`[EveningFlow] Screens with data: ${screensWithData.join(', ')}`);
      console.log(`[EveningFlow] Initial state:`, JSON.stringify(navState, null, 2));
    } catch (error) {
      console.error('[EveningFlow] Failed to resume session:', error);
    }
  };

  // FEAT-23: Handle begin fresh (clear old session)
  const handleBeginFresh = async () => {
    try {
      await SessionStorageService.clearSession('evening');
      setInitialNavigationState(undefined); // undefined = use default initialRouteName
      setShowResumeModal(false);
      setResumableSession(null);
      lastSavedStep.current = 0; // Reset saved step tracking
      hasResetNav.current = false; // Reset the flag
      console.log('[EveningFlow] Starting fresh evening session');
    } catch (error) {
      console.error('[EveningFlow] Failed to clear session:', error);
    }
  };

  // Custom header with progress
  const getHeaderOptions = (routeName: keyof EveningFlowParamList, title: string) => ({
    headerTitle: () => (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
      </View>
    ),
    headerTitleAlign: 'center' as const,
  });

  // Screen wrappers with data persistence (FEAT-23)
  const VirtueReflectionScreenWrapper = ({ navigation, route }: any) => (
    <VirtueReflectionScreen
      navigation={navigation}
      route={route}
      onSave={(data: any) => {
        const newScreenData = { ...screenData, VirtueReflection: data };
        setScreenData(newScreenData);

        const nextScreen = 'Gratitude';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from VirtueReflection:', error));
        }
      }}
    />
  );

  const GratitudeScreenWrapper = ({ navigation, route }: any) => (
    <GratitudeScreen
      navigation={navigation}
      route={route}
      onSave={(data: any) => {
        const newScreenData = { ...screenData, Gratitude: data };
        setScreenData(newScreenData);

        const nextScreen = 'Tomorrow';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from Gratitude:', error));
        }
      }}
    />
  );

  const TomorrowScreenWrapper = ({ navigation, route }: any) => (
    <TomorrowScreen
      navigation={navigation}
      route={route}
      onSave={(data: any) => {
        const newScreenData = { ...screenData, Tomorrow: data };
        setScreenData(newScreenData);

        const nextScreen = 'SelfCompassion';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from Tomorrow:', error));
        }
      }}
    />
  );

  const SelfCompassionScreenWrapper = ({ navigation, route }: any) => (
    <SelfCompassionScreen
      navigation={navigation}
      route={route}
      onSave={(data: any) => {
        const newScreenData = { ...screenData, SelfCompassion: data };
        setScreenData(newScreenData);

        const nextScreen = 'SleepTransition';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from SelfCompassion:', error));
        }
      }}
    />
  );

  const SleepTransitionScreenWrapper = ({ navigation, route }: any) => (
    <SleepTransitionScreen
      navigation={navigation}
      route={route}
      onSave={(data: any) => {
        const newScreenData = { ...screenData, SleepTransition: data };
        setScreenData(newScreenData);

        const nextScreen = 'EveningCompletion';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('evening', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[EveningFlow] Failed to save from SleepTransition:', error));
        }
      }}
    />
  );

  // Wrapper for EveningCompletionScreen to pass onComplete callback
  const EveningCompletionScreenWrapper = ({ navigation, route }: any) => {
    const props: any = {
      navigation,
      route,
      onComplete: (completionData: any) => onComplete(completionData || {})
    };
    return <EveningCompletionScreen {...props} />;
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
        initialRouteName="VirtueReflection"
        screenOptions={{
          headerStyle: {
            backgroundColor: colorSystem.themes.evening.background,
            borderBottomColor: colorSystem.themes.evening.primary,
            borderBottomWidth: 1,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 6,
            height: 100, // Increased height for progress indicator + safety elements
          },
          headerTintColor: colorSystem.themes.evening.primary,
          headerLeft: () => (
            <ExitHeaderButton onPress={onExit} />
          ),
          cardStyle: {
            backgroundColor: colorSystem.themes.evening.background,
          },
          // Modal presentation styling
          presentation: 'modal',
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
        screenListeners={({ navigation }) => ({
          state: (e) => {
            // FEAT-23: Trigger imperative reset if needed (on first mount after resume)
            if (shouldResetNav && !hasResetNav.current && initialNavigationState) {
              hasResetNav.current = true;
              console.log('[EveningFlow] Triggering imperative reset with state:', initialNavigationState);

              // Reset navigation state
              navigation.reset(initialNavigationState);
              setShouldResetNav(false);
              console.log('[EveningFlow] Imperative reset complete');
              return; // Don't process state update this cycle
            }

            // Update progress based on current screen
            const state = e.data.state;
            if (state) {
              const currentRouteName = state.routes[state.index]?.name;
              const stepIndex = SCREEN_ORDER.indexOf(currentRouteName as keyof EveningFlowParamList);
              if (stepIndex !== -1) {
                setCurrentStep(stepIndex + 1);
              }

              // FEAT-23: Save session progress only on forward navigation
              // Only save if we're moving to a new screen or staying on the same screen
              // Don't save if moving backward (exit/back button pressed)
              if (currentRouteName &&
                  currentRouteName !== 'EveningCompletion' &&
                  stepIndex >= lastSavedStep.current) {
                console.log(`[EveningFlow] Saving session: stepIndex=${stepIndex}, lastSavedStep=${lastSavedStep.current}, screen=${currentRouteName}`);
                lastSavedStep.current = stepIndex;
                SessionStorageService.saveSession('evening', currentRouteName as string, {
                  screenData // Save accumulated screen data
                })
                  .catch(error => {
                    console.error('[EveningFlow] Failed to save session:', error);
                  });
              } else if (currentRouteName && currentRouteName !== 'EveningCompletion') {
                console.log(`[EveningFlow] NOT saving (backward nav): stepIndex=${stepIndex}, lastSavedStep=${lastSavedStep.current}, screen=${currentRouteName}`);
              }
            }
          },
        })}
      >
      <Stack.Screen
        name="VirtueReflection"
        component={VirtueReflectionScreenWrapper}
        options={getHeaderOptions('VirtueReflection', 'Mindful Reflection')}
      />

      <Stack.Screen
        name="Gratitude"
        component={GratitudeScreenWrapper}
        options={getHeaderOptions('Gratitude', 'Gratitude Practice')}
      />

      <Stack.Screen
        name="Tomorrow"
        component={TomorrowScreenWrapper}
        options={getHeaderOptions('Tomorrow', 'Prepare for Tomorrow')}
      />

      <Stack.Screen
        name="SelfCompassion"
        component={SelfCompassionScreenWrapper}
        options={getHeaderOptions('SelfCompassion', 'Self-Compassion')}
      />

      <Stack.Screen
        name="SleepTransition"
        component={SleepTransitionScreenWrapper}
        options={getHeaderOptions('SleepTransition', 'Transition to Rest')}
      />

      <Stack.Screen
        name="EveningCompletion"
        component={EveningCompletionScreenWrapper}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    width: 120,
    height: spacing.xs,
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.xs,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  progressText: {
    fontSize: typography.micro.size,
    color: colorSystem.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
});

const headerStyles = StyleSheet.create({
  exitContainer: {
    marginLeft: spacing.md,
  },
  exitButton: {
    padding: spacing.sm,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    fontSize: typography.headline4.size,
    color: colorSystem.base.black,
    fontWeight: typography.fontWeight.regular,
  },
});

export default EveningFlowNavigator;
