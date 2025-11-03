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

import { logSecurity, logPerformance, logError, LogCategory } from '../../services/logging';
import React, { useState, useEffect, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography } from '../../constants/colors';
import { EveningFlowParamList } from '../../types/flows';
import { SessionStorageService } from '../../services/session/SessionStorageService';
import { SessionMetadata } from '../../types/session';
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

  // FEAT-23: Session resumption state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumableSession, setResumableSession] = useState<SessionMetadata | null>(null);
  const [initialScreen, setInitialScreen] = useState<keyof EveningFlowParamList>('VirtueReflection');
  const hasCheckedSession = useRef(false);

  // FEAT-23: Check for resumable session on mount
  useEffect(() => {
    const checkForResumableSession = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;

      try {
        const sessionMetadata = await SessionStorageService.getSessionMetadata('evening');
        if (sessionMetadata) {
          setResumableSession(sessionMetadata);
          setShowResumeModal(true);
        }
      } catch (error) {
        console.error('[EveningFlow] Failed to check for resumable session:', error);
      }
    };

    checkForResumableSession();
  }, []);

  // FEAT-23: Handle resume session
  const handleResumeSession = () => {
    if (!resumableSession) return;

    try {
      // Set the initial screen to the saved screen
      const screenName = resumableSession.currentScreen as keyof EveningFlowParamList;
      setInitialScreen(screenName);
      setShowResumeModal(false);

      console.log(`[EveningFlow] Resumed session at ${screenName}`);
    } catch (error) {
      console.error('[EveningFlow] Failed to resume session:', error);
    }
  };

  // FEAT-23: Handle begin fresh (clear old session)
  const handleBeginFresh = async () => {
    try {
      await SessionStorageService.clearSession('evening');
      setInitialScreen('VirtueReflection');
      setShowResumeModal(false);
      setResumableSession(null);
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

  // Wrapper for EveningCompletionScreen to pass onComplete callback
  const EveningCompletionScreenWrapper = ({ navigation, route }: any) => (
    <EveningCompletionScreen
      navigation={navigation}
      route={route}
      onComplete={onComplete}
    />
  );

  return (
    <>
      <Stack.Navigator
        initialRouteName={initialScreen}
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
        screenListeners={{
          state: (e) => {
            // Update progress based on current screen
            const state = e.data.state;
            if (state) {
              const currentRouteName = state.routes[state.index]?.name;
              const stepIndex = SCREEN_ORDER.indexOf(currentRouteName as keyof EveningFlowParamList);
              if (stepIndex !== -1) {
                setCurrentStep(stepIndex + 1);
              }

              // FEAT-23: Save session progress on screen change
              if (currentRouteName && currentRouteName !== 'EveningCompletion') {
                SessionStorageService.saveSession('evening', currentRouteName as string)
                  .catch(error => {
                    console.error('[EveningFlow] Failed to save session:', error);
                  });
              }
            }
          },
        }}
      >
      <Stack.Screen
        name="VirtueReflection"
        component={VirtueReflectionScreen}
        options={getHeaderOptions('VirtueReflection', 'Mindful Reflection')}
      />

      <Stack.Screen
        name="Gratitude"
        component={GratitudeScreen}
        options={getHeaderOptions('Gratitude', 'Gratitude Practice')}
      />

      <Stack.Screen
        name="Tomorrow"
        component={TomorrowScreen}
        options={getHeaderOptions('Tomorrow', 'Prepare for Tomorrow')}
      />

      <Stack.Screen
        name="SelfCompassion"
        component={SelfCompassionScreen}
        options={getHeaderOptions('SelfCompassion', 'Self-Compassion')}
      />

      <Stack.Screen
        name="SleepTransition"
        component={SleepTransitionScreen}
        options={getHeaderOptions('SleepTransition', 'Transition to Rest')}
      />

      <Stack.Screen
        name="EveningCompletion"
        component={EveningCompletionScreenWrapper}
        options={getHeaderOptions('EveningCompletion', 'Evening Practice Complete')}
      />
    </Stack.Navigator>

      {/* FEAT-23: Session resumption modal */}
      <ResumeSessionModal
        visible={showResumeModal}
        session={resumableSession}
        onResume={handleResumeSession}
        onBeginFresh={handleBeginFresh}
      />
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
    fontSize: 24,
    color: colorSystem.base.black,
    fontWeight: '300',
  },
});

export default EveningFlowNavigator;
