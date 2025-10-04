/**
 * MiddayFlowNavigator - MBCT 3-Minute Breathing Space Navigation
 * 
 * CLINICAL SPECIFICATIONS:
 * - Modal presentation from CleanHomeScreen
 * - 3 screens, 60 seconds each (180 seconds total)
 * - Auto-advance between screens
 * - Safety exit always available
 * - Midday theme throughout
 * - Data collection and completion tracking
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../../services/logging';
import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert, Pressable, Text } from 'react-native';
import { colorSystem } from '../../constants/colors';
import AwarenessScreen from './screens/AwarenessScreen';
import GatheringScreen from './screens/GatheringScreen';
import ExpandingScreen from './screens/ExpandingScreen';

// Navigation types
export type MiddayFlowParamList = {
  Awareness: undefined;
  Gathering: { awarenessData: { emotions: string[] } };
  Expanding: { awarenessData: { emotions: string[] } };
  Complete: { 
    awarenessData: { emotions: string[] };
    expandingData: {
      pleasantEvent: string;
      challengingEvent: string;
      selectedNeed: string | null;
    };
  };
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
    awarenessData?: { emotions: string[] };
    expandingData?: {
      pleasantEvent: string;
      challengingEvent: string;
      selectedNeed: string | null;
    };
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

  const handleSkip = (screenName: string) => {
    logPerformance(`🔄 User skipped ${screenName} screen`);
    // For now, continue to next screen
    // In production, this would track skip behavior
  };

  const AwarenessScreenWrapper = ({ navigation }: any) => (
    <AwarenessScreen
      onComplete={(data) => {
        const updatedSessionData = {
          ...sessionData,
          awarenessData: data
        };
        setSessionData(updatedSessionData);
        navigation.navigate('Gathering', { awarenessData: data });
      }}
      onSafetyPress={handleSafetyPress}
      onSkip={() => {
        handleSkip('Awareness');
        navigation.navigate('Gathering', { awarenessData: { emotions: [] } });
      }}
    />
  );

  const GatheringScreenWrapper = ({ navigation, route }: any) => (
    <GatheringScreen
      onComplete={() => {
        navigation.navigate('Expanding', { awarenessData: route.params.awarenessData });
      }}
      onSafetyPress={handleSafetyPress}
      onSkip={() => {
        handleSkip('Gathering');
        navigation.navigate('Expanding', { awarenessData: route.params.awarenessData });
      }}
    />
  );

  const ExpandingScreenWrapper = ({ navigation, route }: any) => (
    <ExpandingScreen
      onComplete={(data) => {
        const finalSessionData = {
          ...sessionData,
          expandingData: data,
          completedAt: Date.now(),
          duration: Date.now() - sessionData.startTime
        };
        
        // Complete the session
        onComplete(finalSessionData);
      }}
      onSafetyPress={handleSafetyPress}
      onSkip={() => {
        handleSkip('Expanding');
        const finalSessionData = {
          ...sessionData,
          expandingData: {
            pleasantEvent: '',
            challengingEvent: '',
            selectedNeed: null
          },
          skipped: true,
          completedAt: Date.now(),
          duration: Date.now() - sessionData.startTime
        };
        onComplete(finalSessionData);
      }}
    />
  );

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
              backgroundColor: colorSystem.status.critical,
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
      initialRouteName="Awareness"
    >
      <Stack.Screen
        name="Awareness"
        component={AwarenessScreenWrapper}
        options={{
          title: 'Step 1: Awareness',
          animationTypeForReplace: 'push',
        }}
      />

      <Stack.Screen
        name="Gathering"
        component={GatheringScreenWrapper}
        options={{
          title: 'Step 2: Gathering',
          animationTypeForReplace: 'push',
        }}
      />

      <Stack.Screen
        name="Expanding"
        component={ExpandingScreenWrapper}
        options={{
          title: 'Step 3: Expanding',
          animationTypeForReplace: 'push',
        }}
      />
    </Stack.Navigator>
  );
};

export default MiddayFlowNavigator;