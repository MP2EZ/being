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
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colorSystem, spacing } from '../../constants/colors';
import { MorningFlowParamList } from '../../types/flows';
import { SessionStorageService } from '../../services/session/SessionStorageService';
import { SessionMetadata } from '../../types/session';
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
  const [initialScreen, setInitialScreen] = useState<keyof MorningFlowParamList>('Gratitude');
  const hasCheckedSession = useRef(false);
  const lastSavedStep = useRef(0); // Track last saved step to prevent backward saves

  // FEAT-23: Check for resumable session on mount
  useEffect(() => {
    const checkForResumableSession = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;

      try {
        const sessionMetadata = await SessionStorageService.getSessionMetadata('morning');
        if (sessionMetadata) {
          setResumableSession(sessionMetadata);
          setShowResumeModal(true);
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
      // Set the initial screen to the saved screen
      const screenName = resumableSession.currentScreen as keyof MorningFlowParamList;
      setInitialScreen(screenName);
      setShowResumeModal(false);

      console.log(`[MorningFlow] Resumed session at ${screenName}`);
    } catch (error) {
      console.error('[MorningFlow] Failed to resume session:', error);
    }
  };

  // FEAT-23: Handle begin fresh (clear old session)
  const handleBeginFresh = async () => {
    try {
      await SessionStorageService.clearSession('morning');
      setInitialScreen('Gratitude');
      setShowResumeModal(false);
      setResumableSession(null);
      lastSavedStep.current = 0; // Reset saved step tracking
      console.log('[MorningFlow] Starting fresh morning session');
    } catch (error) {
      console.error('[MorningFlow] Failed to clear session:', error);
    }
  };

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
        initialRouteName={initialScreen}
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
        screenListeners={{
          state: (e) => {
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
                SessionStorageService.saveSession('morning', currentRouteName as string)
                  .catch(error => {
                    console.error('[MorningFlow] Failed to save session:', error);
                  });
              } else if (currentRouteName && currentRouteName !== 'MorningCompletion') {
                console.log(`[MorningFlow] NOT saving (backward nav): stepIndex=${stepIndex}, lastSavedStep=${lastSavedStep.current}, screen=${currentRouteName}`);
              }
            }
          },
        }}
      >
      <Stack.Screen
        name="Gratitude"
        component={GratitudeScreen}
        options={getHeaderOptions('Gratitude', 'Gratitude Practice')}
      />

      <Stack.Screen
        name="Intention"
        component={IntentionScreen}
        options={getHeaderOptions('Intention', 'Morning Intention')}
      />

      <Stack.Screen
        name="Preparation"
        component={ProtectedPreparationScreen}
        options={getHeaderOptions('Preparation', 'Preparation')}
      />

      <Stack.Screen
        name="PrincipleFocus"
        component={PrincipleFocusScreen}
        options={getHeaderOptions('PrincipleFocus', 'Principle Focus')}
      />

      <Stack.Screen
        name="PhysicalGrounding"
        component={PhysicalGroundingScreen}
        options={getHeaderOptions('PhysicalGrounding', 'Ground in Your Body')}
      />

      <Stack.Screen
        name="MorningCompletion"
        options={getHeaderOptions('MorningCompletion', 'Complete')}
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