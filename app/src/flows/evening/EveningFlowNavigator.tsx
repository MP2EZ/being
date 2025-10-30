/**
 * Evening Flow Navigator - DRD v2.0.0
 * Stoic Mindfulness Evening Practice (8 screens)
 *
 * CRITICAL CLINICAL SAFETY IMPLEMENTATION:
 * - Crisis button always present in headers
 * - Gentle therapeutic language in titles
 * - Evening-appropriate header styling
 * - Safety-first navigation approach
 *
 * Flow (10-15 min adjustable):
 * 1. VirtueReflection - Mindful reflection
 * 2. SenecaQuestions - Seneca's 3 questions (OPTIONAL)
 * 3. Celebration - Celebrate efforts
 * 4. Gratitude - Gratitude practice
 * 5. Tomorrow - Intention + letting go
 * 6. Lessons - React vs Respond (OPTIONAL)
 * 7. SelfCompassion - Self-compassion (REQUIRED)
 * 8. SleepTransition - Mindful breathing for sleep
 * 9. EveningCompletion - Flow summary
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow)
 */

import { logSecurity, logPerformance, logError, LogCategory } from '../../services/logging';
import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography } from '../../constants/colors';
import { EveningFlowParamList } from '../../types/flows';

// Import DRD v2.0.0 Stoic Mindfulness screens
import VirtueReflectionScreen from './screens/VirtueReflectionScreen';
import SenecaQuestionsScreen from './screens/SenecaQuestionsScreen';
import CelebrationScreen from './screens/CelebrationScreen';
import GratitudeScreen from './screens/GratitudeScreen';
import TomorrowScreen from './screens/TomorrowScreen';
import LearningScreen from './screens/LearningScreen';
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

// Crisis Support Header Component
const CrisisHeaderButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <View style={headerStyles.crisisContainer}>
    <Pressable
      style={headerStyles.crisisButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Access crisis support"
      accessibilityHint="Opens immediate crisis support resources"
    >
      <Text style={headerStyles.crisisButtonText}>Support</Text>
    </Pressable>
  </View>
);

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

// Screen order mapping for progress calculation (DRD v2.0.0)
const SCREEN_ORDER: (keyof EveningFlowParamList)[] = [
  'VirtueReflection',
  'SenecaQuestions',
  'Celebration',
  'Gratitude',
  'Tomorrow',
  'Lessons',
  'SelfCompassion',
  'SleepTransition',
  'EveningCompletion'
];

const EveningFlowNavigator: React.FC<EveningFlowNavigatorProps> = ({
  onComplete,
  onExit
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SCREEN_ORDER.length;

  const handleCrisisSupport = () => {
    // TODO: Navigate to crisis support resources
    logPerformance('Crisis support accessed from evening flow');
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

  return (
    <Stack.Navigator
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
        // CRITICAL: Crisis button always present
        headerRight: () => (
          <CrisisHeaderButton onPress={handleCrisisSupport} />
        ),
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
        name="SenecaQuestions"
        component={SenecaQuestionsScreen}
        options={getHeaderOptions('SenecaQuestions', "Seneca's Questions (Optional)")}
      />

      <Stack.Screen
        name="Celebration"
        component={CelebrationScreen}
        options={getHeaderOptions('Celebration', 'Celebrate Your Efforts')}
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
        name="Lessons"
        component={LearningScreen}
        options={getHeaderOptions('Lessons', 'React vs Respond (Optional)')}
      />

      <Stack.Screen
        name="SelfCompassion"
        component={SelfCompassionScreen}
        options={getHeaderOptions('SelfCompassion', 'Self-Compassion (Required)')}
      />

      <Stack.Screen
        name="SleepTransition"
        component={SleepTransitionScreen}
        options={getHeaderOptions('SleepTransition', 'Transition to Rest')}
      />

      <Stack.Screen
        name="EveningCompletion"
        component={EveningCompletionScreen}
        options={getHeaderOptions('EveningCompletion', 'Evening Practice Complete')}
      />
    </Stack.Navigator>
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
  crisisContainer: {
    marginRight: spacing.md,
  },
  crisisButton: {
    backgroundColor: colorSystem.status.critical,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  crisisButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
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
