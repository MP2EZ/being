/**
 * Morning Flow Navigator
 * Handles navigation for DRD morning check-in flow with progress tracking
 * Modal presentation from home screen with therapeutic UX
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colorSystem, spacing } from '../../constants/colors';
import { MorningFlowParamList } from '../../types/flows';

// Import screens
import BodyScanScreen from './screens/BodyScanScreen';
import EmotionRecognitionScreen from './screens/EmotionRecognitionScreen';
import ThoughtObservationScreen from './screens/ThoughtObservationScreen';
import PhysicalMetricsScreen from './screens/PhysicalMetricsScreen';
import ValuesIntentionScreen from './screens/ValuesIntentionScreen';
import DreamJournalScreen from './screens/DreamJournalScreen';

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

// Screen order mapping for progress calculation
const SCREEN_ORDER: (keyof MorningFlowParamList)[] = [
  'BodyScan',
  'EmotionRecognition', 
  'ThoughtObservation',
  'PhysicalMetrics',
  'ValuesIntention',
  'DreamJournal'
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
        name="BodyScan"
        component={BodyScanScreen}
        options={getHeaderOptions('BodyScan', 'Body Awareness')}
      />
      
      <Stack.Screen
        name="EmotionRecognition"
        component={EmotionRecognitionScreen}
        options={getHeaderOptions('EmotionRecognition', 'Emotional Awareness')}
      />
      
      <Stack.Screen
        name="ThoughtObservation"
        component={ThoughtObservationScreen}
        options={getHeaderOptions('ThoughtObservation', 'Thought Awareness')}
      />
      
      <Stack.Screen
        name="PhysicalMetrics"
        component={PhysicalMetricsScreen}
        options={getHeaderOptions('PhysicalMetrics', 'Physical Wellness')}
      />
      
      <Stack.Screen
        name="ValuesIntention"
        component={ValuesIntentionScreen}
        options={getHeaderOptions('ValuesIntention', 'Daily Intention')}
      />
      
      <Stack.Screen
        name="DreamJournal"
        component={DreamJournalScreen}
        options={getHeaderOptions('DreamJournal', 'Dream Reflection')}
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

export default MorningFlowNavigator;