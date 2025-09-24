/**
 * Being. MBCT App - TESTING: STEP 5 - NAVIGATION COMPONENTS
 * Testing NavigationContainer and Stack for property descriptor compatibility
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { BaseError } from './src/types/core';
import { getTimeOfDayTheme } from './src/utils/timeHelpers';
import { sanitizeTextInput } from './src/utils/validation';
import { Typography } from './src/components/core/Typography';
import { NewArchButton } from './src/components/core/NewArchButton';
import { Slider } from './src/components/core/Slider';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useSimpleUserStore } from './src/store/simpleUserStore';
import { PHQAssessmentPreview } from './src/components/clinical/components/PHQAssessmentPreview';

const Stack = createStackNavigator();

function HomeScreen({ navigation }: any) {
  const [testCounter, setTestCounter] = useState(0);
  const [moodValue, setMoodValue] = useState(5);

  // Test store integration
  const { user, isLoading, initializeUser, updateUser } = useSimpleUserStore();

  // Test the imported utilities
  const currentTheme = getTimeOfDayTheme();
  const testInput = sanitizeTextInput("test input");

  // Initialize user on mount
  React.useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Mock clinical data for testing
  const mockAssessmentData = {
    score: 8,
    maxScore: 27,
    severity: 'Mild' as const,
    assessmentType: 'PHQ-9' as const,
    interpretation: 'Mild depression symptoms detected. Continue monitoring and consider therapeutic support.',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Typography variant="h2">Being. MBCT App - Debugging</Typography>
        <Typography variant="body">Step 6: Testing Clinical Components</Typography>
        <Typography variant="caption">Status: PHQAssessmentPreview with New Architecture...</Typography>

        <PHQAssessmentPreview
          data={mockAssessmentData}
          title="Depression Assessment (PHQ-9)"
          subtitle="Clinical validation test"
        />

        <NewArchButton
          variant="primary"
          onPress={() => setTestCounter(prev => prev + 1)}
          accessibilityLabel="Test button for New Architecture compatibility"
        >
          Test Button - Pressed {testCounter} times
        </NewArchButton>

        <Slider
          label="Current Mood"
          value={moodValue}
          onChange={setMoodValue}
          min={1}
          max={10}
        />

        <NewArchButton
          variant="secondary"
          onPress={() => navigation.navigate('Test')}
          accessibilityLabel="Navigate to test screen"
        >
          Go to Test Screen
        </NewArchButton>

        <NewArchButton
          variant="primary"
          onPress={() => updateUser({ name: `User ${Date.now().toString().slice(-4)}` })}
          accessibilityLabel="Update user name"
        >
          Update User Name
        </NewArchButton>

        <Text style={styles.status}>User: {isLoading ? 'Loading...' : user?.name || 'No User'}</Text>
        <Text style={styles.status}>Onboarding: {user?.completedOnboarding ? 'Complete' : 'Pending'}</Text>
        <Text style={styles.status}>Mood: {moodValue}/10</Text>
        <Text style={styles.status}>Theme: {currentTheme}</Text>
        <Text style={styles.status}>Test input: {testInput}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function TestScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Typography variant="h2">Test Screen</Typography>
        <Typography variant="body">Navigation test successful!</Typography>

        <NewArchButton
          variant="primary"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back to home screen"
        >
          Go Back
        </NewArchButton>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: { backgroundColor: '#4A7C59' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Being. MBCT Debug' }}
            />
            <Stack.Screen
              name="Test"
              component={TestScreen}
              options={{ title: 'Test Screen' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A7C59',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  status: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});