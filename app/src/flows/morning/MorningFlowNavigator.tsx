/**
 * Morning Flow Navigator (Stoic Mindfulness - FEAT-45)
 * Handles navigation for Stoic morning practice with progress tracking
 * Modal presentation from home screen with philosophical UX
 *
 * Classical Stoic Foundation:
 * - Marcus Aurelius: Daily morning preparation (Meditations 2:1)
 * - Epictetus: Begin the day with right principles (Enchiridion 21)
 * - Seneca: "Begin at once to live" (Letters 101)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colorSystem, spacing } from '../../constants/colors';
import { MorningFlowParamList } from '../../types/flows';

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
  const totalSteps = SCREEN_ORDER.length;

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

  return (
    <Stack.Navigator
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
        component={MorningCompletionScreen}
        options={getHeaderOptions('MorningCompletion', 'Complete')}
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