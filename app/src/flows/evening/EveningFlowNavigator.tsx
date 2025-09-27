/**
 * Evening Flow Navigator
 * CRITICAL CLINICAL SAFETY IMPLEMENTATION:
 * - Crisis button always present in headers
 * - Gentle therapeutic language in titles
 * - Evening-appropriate header styling
 * - Safety-first navigation approach
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colorSystem, spacing, typography } from '../../constants/colors';
import { EveningFlowParamList } from '../../types/flows';
import { SafetyButton } from '../shared/components';

// Import screens
import DayReviewScreen from './screens/DayReviewScreen';
import PleasantUnpleasantScreen from './screens/PleasantUnpleasantScreen';
import ThoughtPatternsScreen from './screens/ThoughtPatternsScreen';
import TomorrowPrepScreen from './screens/TomorrowPrepScreen';

const Stack = createStackNavigator<EveningFlowParamList>();

interface EveningFlowNavigatorProps {
  onComplete: (sessionData: any) => void;
  onExit: () => void;
}

// Crisis Support Header Component
const CrisisHeaderButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <View style={headerStyles.crisisContainer}>
    <Pressable
      style={headerStyles.crisisButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Access crisis support"
    >
      <Text style={headerStyles.crisisButtonText}>Support</Text>
    </Pressable>
  </View>
);

const EveningFlowNavigator: React.FC<EveningFlowNavigatorProps> = ({
  onComplete,
  onExit
}) => {
  const handleCrisisSupport = () => {
    // TODO: Navigate to crisis support resources
    console.log('Crisis support accessed from evening flow');
  };

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
          height: 100, // Increased height for safety elements
        },
        headerTitleStyle: {
          fontSize: typography.bodyLarge.size,
          fontWeight: '600',
          color: colorSystem.base.black,
        },
        headerTintColor: colorSystem.themes.evening.primary,
        headerLeft: () => null,
        cardStyle: {
          backgroundColor: colorSystem.themes.evening.background,
        },
        // CRITICAL: Crisis button always present
        headerRight: () => (
          <CrisisHeaderButton onPress={handleCrisisSupport} />
        ),
      }}
    >
      <Stack.Screen
        name="DayReview"
        component={DayReviewScreen}
        options={{
          title: 'Evening Reflection',
          headerTitle: 'Gently reflecting on your day', // Therapeutic language
        }}
      />
      
      <Stack.Screen
        name="PleasantUnpleasant"
        component={PleasantUnpleasantScreen}
        options={{
          title: 'Notice Without Judging',
          headerTitle: 'Notice Without Judging', // Clinical safety language
        }}
      />
      
      <Stack.Screen
        name="ThoughtPatterns"
        component={ThoughtPatternsScreen}
        options={{
          title: 'Observing Patterns',
          headerTitle: 'Observing Thought Patterns', // Educational approach
        }}
      />
      
      <Stack.Screen
        name="TomorrowPrep"
        component={TomorrowPrepScreen}
        options={{
          title: 'Prepare for Rest',
          headerTitle: 'Prepare for Tomorrow', // Sleep transition focus
        }}
      />
    </Stack.Navigator>
  );
};

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
});

export default EveningFlowNavigator;