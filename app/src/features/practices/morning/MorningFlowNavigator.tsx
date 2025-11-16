/**
 * Morning Flow Navigator (Stoic Mindfulness - FEAT-45)
 * Handles navigation for Stoic morning practice with progress tracking
 * Modal presentation from home screen with philosophical UX
 *
 * FEAT-23: Session resumption with philosopher-validated Stoic language
 * - Supports resuming interrupted sessions (24hr TTL)
 * - Automatic session saving on screen navigation
 * - Sphere Sovereignty: Both resume and fresh start equally virtuous
 *
 * Classical Stoic Foundation:
 * - Marcus Aurelius: Daily morning preparation (Meditations 2:1)
 * - Epictetus: Begin the day with right principles (Enchiridion 21)
 * - Seneca: "Begin at once to live" (Letters 101)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colorSystem, spacing } from '@/core/theme/colors';
import { MorningFlowParamList } from '@/types/flows';
import { SessionStorageService } from '@/core/services/session/SessionStorageService';
import { SessionMetadata } from '@/types/session';
import { ResumeSessionModal } from '../shared/components/ResumeSessionModal';

// Import Stoic Mindfulness screens (DRD v2.0.0)
import GratitudeScreen from './screens/GratitudeScreen';
import IntentionScreen from './screens/IntentionScreen';
import ProtectedPreparationScreen from './screens/ProtectedPreparationScreen';
import PrincipleFocusScreen from './screens/PrincipleFocusScreen';
import PhysicalGroundingScreen from './screens/PhysicalGroundingScreen';
import MorningCompletionScreen from './screens/MorningCompletionScreen';

const Stack = createStackNavigator<MorningFlowParamList>();

interface MorningFlowNavigatorProps {
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
              backgroundColor: colorSystem.themes.morning.primary
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

// Screen order mapping for progress calculation (Stoic Mindfulness Flow - DRD v2.0.0)
const SCREEN_ORDER: (keyof MorningFlowParamList)[] = [
  'Gratitude',
  'Intention',
  'Preparation',
  'PrincipleFocus',
  'PhysicalGrounding',
  'MorningCompletion'
];

const MorningFlowNavigator: React.FC<MorningFlowNavigatorProps> = ({
  onComplete,
  onExit
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length - 1; // Exclude MorningCompletion from count

  // FEAT-23: Session resumption state
  const [isCheckingSession, setIsCheckingSession] = useState(true); // Prevent navigator mounting until checked
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumableSession, setResumableSession] = useState<SessionMetadata | null>(null);
  const [initialNavigationState, setInitialNavigationState] = useState<any>(undefined);
  const [shouldResetNav, setShouldResetNav] = useState(false); // Trigger navigation reset
  const hasCheckedSession = useRef(false);
  const lastSavedStep = useRef(0); // Track last saved step to prevent backward saves
  const hasResetNav = useRef(false); // Track if we've already reset to prevent loops

  // FEAT-23: Accumulated screen data for session persistence
  const [screenData, setScreenData] = useState<Record<string, any>>({});
  const loadedScreenData = useRef<Record<string, any>>({}); // Store loaded data immediately for handleResumeSession

  // FEAT-23: Check for resumable session on mount
  useEffect(() => {
    const checkForResumableSession = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;

      try {
        const fullSession = await SessionStorageService.loadSession('morning');
        if (fullSession) {
          const { flowState, ...metadata } = fullSession;

          // Don't show resume modal if we're at the first screen
          if (metadata.currentScreen === SCREEN_ORDER[0]) {
            console.log('[MorningFlow] Session at first screen, clearing and starting fresh');
            await SessionStorageService.clearSession('morning');
            setIsCheckingSession(false);
            return;
          }

          setResumableSession(metadata);
          setShowResumeModal(true);

          // Restore screen data if available
          if (flowState?.['screenData']) {
            loadedScreenData.current = flowState["screenData"]; // Store in ref immediately
            setScreenData(flowState["screenData"]); // Also update state for UI
            console.log(`[MorningFlow] Restored screen data for ${Object.keys(flowState["screenData"]).length} screens`);
          }
        }
      } catch (error) {
        console.error('[MorningFlow] Failed to check for resumable session:', error);
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
      const screenName = resumableSession.currentScreen as keyof MorningFlowParamList;
      const screenIndex = SCREEN_ORDER.indexOf(screenName);

      if (screenIndex === -1) {
        console.error(`[MorningFlow] Invalid screen name: ${screenName}`);
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
      console.log(`[MorningFlow] Resumed at ${screenName} (index ${screenIndex}) with ${routes.length} screens in stack`);
      console.log(`[MorningFlow] Screens with data: ${screensWithData.join(', ')}`);
      console.log(`[MorningFlow] Initial state:`, JSON.stringify(navState, null, 2));
    } catch (error) {
      console.error('[MorningFlow] Failed to resume session:', error);
    }
  };

  // FEAT-23: Handle begin fresh (clear old session)
  const handleBeginFresh = async () => {
    try {
      await SessionStorageService.clearSession('morning');
      setInitialNavigationState(undefined); // undefined = use default initialRouteName
      setShowResumeModal(false);
      setResumableSession(null);
      lastSavedStep.current = 0; // Reset saved step tracking
      hasResetNav.current = false; // Reset the flag
      console.log('[MorningFlow] Starting fresh morning session');
    } catch (error) {
      console.error('[MorningFlow] Failed to clear session:', error);
    }
  };

  // Screen wrappers with data persistence
  const GratitudeScreenWrapper = ({ navigation, route }: any) => (
    <GratitudeScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        // Update state
        const newScreenData = { ...screenData, Gratitude: data };
        setScreenData(newScreenData);

        // Save immediately with updated data (don't wait for navigation)
        const nextScreen = 'Intention';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('morning', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[MorningFlow] Failed to save from Gratitude:', error));
        }
      }}
    />
  );

  const IntentionScreenWrapper = ({ navigation, route }: any) => (
    <IntentionScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        // Update state
        const newScreenData = { ...screenData, Intention: data };
        setScreenData(newScreenData);

        // Save immediately with updated data
        const nextScreen = 'Preparation';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('morning', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[MorningFlow] Failed to save from Intention:', error));
        }
      }}
    />
  );

  const PreparationScreenWrapper = ({ navigation, route }: any) => (
    <ProtectedPreparationScreen
      {...{ navigation, route } as any}
      onSave={(data: any) => {
        const newScreenData = { ...screenData, Preparation: data };
        setScreenData(newScreenData);
        const nextScreen = 'PrincipleFocus';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('morning', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[MorningFlow] Failed to save from Preparation:', error));
        }
      }}
    />
  );

  const PrincipleFocusScreenWrapper = ({ navigation, route }: any) => (
    <PrincipleFocusScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        const newScreenData = { ...screenData, PrincipleFocus: data };
        setScreenData(newScreenData);
        const nextScreen = 'PhysicalGrounding';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('morning', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[MorningFlow] Failed to save from PrincipleFocus:', error));
        }
      }}
    />
  );

  const PhysicalGroundingScreenWrapper = ({ navigation, route }: any) => (
    <PhysicalGroundingScreen
      navigation={navigation}
      route={route}
      onSave={(data) => {
        const newScreenData = { ...screenData, PhysicalGrounding: data };
        setScreenData(newScreenData);
        const nextScreen = 'MorningCompletion';
        const nextIndex = SCREEN_ORDER.indexOf(nextScreen);
        if (nextIndex > lastSavedStep.current) {
          lastSavedStep.current = nextIndex;
          SessionStorageService.saveSession('morning', nextScreen, { screenData: newScreenData })
            .catch(error => console.error('[MorningFlow] Failed to save from PhysicalGrounding:', error));
        }
      }}
    />
  );

  // Custom header with progress
  const getHeaderOptions = (routeName: keyof MorningFlowParamList, title: string) => ({
    headerTitle: () => (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />
      </View>
    ),
    headerTitleAlign: 'center' as const,
    headerLeft: () => (
      <TouchableOpacity
        onPress={onExit}
        style={styles.closeButton}
        accessibilityLabel="Close morning flow"
        accessibilityRole="button"
        accessibilityHint="Returns to home screen"
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    ),
  });

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
        initialRouteName="Gratitude"
        screenOptions={{
          headerStyle: {
            backgroundColor: colorSystem.themes.morning.background,
            borderBottomColor: colorSystem.gray[200],
            borderBottomWidth: 1,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 1,
            },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 4,
            height: 100, // Increased height for progress indicator
          },
          headerTintColor: colorSystem.base.black,
          cardStyle: {
            backgroundColor: colorSystem.themes.morning.background,
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
              console.log('[MorningFlow] Triggering imperative reset with state:', initialNavigationState);

              // Reset navigation state
              navigation.reset(initialNavigationState);
              setShouldResetNav(false);
              console.log('[MorningFlow] Imperative reset complete');
              return; // Don't process state update this cycle
            }

            // Update progress based on current screen
            const state = e.data.state;
            if (state) {
              const currentRouteName = state.routes[state.index]?.name;
              const stepIndex = SCREEN_ORDER.indexOf(currentRouteName as keyof MorningFlowParamList);
              if (stepIndex !== -1) {
                setCurrentStep(stepIndex + 1);
              }

              // FEAT-23: Save session progress only on forward navigation
              // Only save if we're moving to a new screen or staying on the same screen
              // Don't save if moving backward (exit/back button pressed)
              if (currentRouteName &&
                  currentRouteName !== 'MorningCompletion' &&
                  stepIndex >= lastSavedStep.current) {
                console.log(`[MorningFlow] Saving session: stepIndex=${stepIndex}, lastSavedStep=${lastSavedStep.current}, screen=${currentRouteName}`);
                lastSavedStep.current = stepIndex;
                SessionStorageService.saveSession('morning', currentRouteName as string, {
                  screenData // Save accumulated screen data
                })
                  .catch(error => {
                    console.error('[MorningFlow] Failed to save session:', error);
                  });
              } else if (currentRouteName && currentRouteName !== 'MorningCompletion') {
                console.log(`[MorningFlow] NOT saving (backward nav): stepIndex=${stepIndex}, lastSavedStep=${lastSavedStep.current}, screen=${currentRouteName}`);
              }
            }
          },
        })}
      >
      <Stack.Screen
        name="Gratitude"
        component={GratitudeScreenWrapper}
        options={getHeaderOptions('Gratitude', 'Gratitude Practice')}
      />

      <Stack.Screen
        name="Intention"
        component={IntentionScreenWrapper}
        options={getHeaderOptions('Intention', 'Morning Intention')}
      />

      <Stack.Screen
        name="Preparation"
        component={PreparationScreenWrapper}
        options={getHeaderOptions('Preparation', 'Preparation')}
      />

      <Stack.Screen
        name="PrincipleFocus"
        component={PrincipleFocusScreenWrapper}
        options={getHeaderOptions('PrincipleFocus', 'Principle Focus')}
      />

      <Stack.Screen
        name="PhysicalGrounding"
        component={PhysicalGroundingScreenWrapper}
        options={getHeaderOptions('PhysicalGrounding', 'Ground in Your Body')}
      />

      <Stack.Screen
        name="MorningCompletion"
        options={{ headerShown: false }}
      >
        {(props) => <MorningCompletionScreen {...props} onSave={onComplete} />}
      </Stack.Screen>
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
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
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

export default MorningFlowNavigator;