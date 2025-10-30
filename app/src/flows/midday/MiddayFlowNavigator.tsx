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
 * PHILOSOPHY:
 * - Mindfulness-first with Stoic wisdom enrichment
 * - NOT toxic positivity - realistic perspective shift
 * - Grounded affirmations (capability within control)
 * - Oikeiôsis framework (self-compassion as foundation)
 */

import { logSecurity, logPerformance, logError, LogCategory } from '../../services/logging';
import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert, Pressable, Text } from 'react-native';
import { colorSystem } from '../../constants/colors';
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

  const handleSafetyPress = () => {
    Alert.alert(
      'Support Available',
      'If you need immediate support, please contact:\n\n• Crisis Text Line: Text HOME to 741741\n• National Suicide Prevention Lifeline: 988\n• Emergency Services: 911',
      [
        {
          text: 'Continue Session',
          style: 'cancel'
        },
        {
          text: 'Exit to Safety',
          style: 'destructive',
          onPress: onExit
        }
      ]
    );
  };

  // Screen wrappers with data persistence
  const ControlCheckScreenWrapper = ({ navigation }: any) => (
    <ControlCheckScreen
      navigation={navigation}
      route={{ params: {} } as any}
      onSave={(data) => {
        const updatedSessionData = {
          ...sessionData,
          controlCheckData: data
        };
        setSessionData(updatedSessionData);
        logPerformance('✅ ControlCheck completed');
      }}
    />
  );

  const EmbodimentScreenWrapper = ({ navigation }: any) => (
    <EmbodimentScreen
      navigation={navigation}
      route={{ params: {} } as any}
      onSave={(data) => {
        const updatedSessionData = {
          ...sessionData,
          embodimentData: data
        };
        setSessionData(updatedSessionData);
        logPerformance('✅ Embodiment completed');
      }}
    />
  );

  const ReappraisalScreenWrapper = ({ navigation }: any) => (
    <ReappraisalScreen
      navigation={navigation}
      route={{ params: {} } as any}
      onSave={(data) => {
        const updatedSessionData = {
          ...sessionData,
          reappraisalData: data
        };
        setSessionData(updatedSessionData);
        logPerformance('✅ Reappraisal completed');
      }}
    />
  );

  const AffirmationScreenWrapper = ({ navigation }: any) => (
    <AffirmationScreen
      navigation={navigation}
      route={{ params: {} } as any}
      onSave={(data) => {
        const updatedSessionData = {
          ...sessionData,
          affirmationData: data
        };
        setSessionData(updatedSessionData);
        logPerformance('✅ Affirmation completed');
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
          logPerformance('✅ Midday flow completed');
          onComplete(finalSessionData);
        }}
      />
    );
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        gestureEnabled: true, // Allow swipe back for safety
        cardStyle: { backgroundColor: 'transparent' },
        headerStyle: {
          backgroundColor: colorSystem.themes.midday.background,
          borderBottomColor: colorSystem.themes.midday.primary,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: colorSystem.base.black,
        },
        headerTintColor: colorSystem.themes.midday.primary,
        headerLeft: () => (
          <Pressable
            onPress={onExit}
            style={{
              marginLeft: 16,
              padding: 8,
              borderRadius: 8,
              backgroundColor: colorSystem.themes.midday.primary,
            }}
            accessibilityRole="button"
            accessibilityLabel="Exit session"
            accessibilityHint="Returns to home screen"
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              Exit
            </Text>
          </Pressable>
        ),
        headerRight: () => (
          <Pressable
            onPress={handleSafetyPress}
            style={{
              marginRight: 16,
              padding: 8,
              borderRadius: 8,
              backgroundColor: colorSystem.status.critical,
            }}
            accessibilityRole="button"
            accessibilityLabel="Crisis support"
            accessibilityHint="Opens immediate crisis support resources"
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              Support
            </Text>
          </Pressable>
        ),
      }}
      initialRouteName="ControlCheck"
    >
      <Stack.Screen
        name="ControlCheck"
        component={ControlCheckScreenWrapper}
        options={{
          title: 'Pause & Center',
          animationTypeForReplace: 'push',
        }}
      />

      <Stack.Screen
        name="Embodiment"
        component={EmbodimentScreenWrapper}
        options={{
          title: 'Ground in Your Body',
          animationTypeForReplace: 'push',
        }}
      />

      <Stack.Screen
        name="Reappraisal"
        component={ReappraisalScreenWrapper}
        options={{
          title: 'Reframe with Wisdom',
          animationTypeForReplace: 'push',
        }}
      />

      <Stack.Screen
        name="Affirmation"
        component={AffirmationScreenWrapper}
        options={{
          title: 'Self-Compassion',
          animationTypeForReplace: 'push',
        }}
      />

      <Stack.Screen
        name="MiddayCompletion"
        component={MiddayCompletionScreenWrapper}
        options={{
          title: 'Complete',
          headerLeft: () => null, // Remove exit button on completion
          animationTypeForReplace: 'push',
        }}
      />
    </Stack.Navigator>
  );
};

export default MiddayFlowNavigator;
