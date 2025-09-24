/**
 * OnboardingPlaceholder - Temporary placeholder for onboarding flow
 * TODO: Replace with actual onboarding implementation
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/core';
import { useUserStore } from '../../store';
import { colorSystem, spacing } from '../../constants/colors';

export const OnboardingPlaceholder: React.FC = () => {
  console.log('🎯 OnboardingPlaceholder: Rendering onboarding screen');
  // Temporarily bypass userStore to debug UI
  // const { signUp, updateProfile } = useUserStore();

  const handleSkipOnboarding = async () => {
    console.log('🚧 Skip onboarding temporarily disabled for debugging');
    // try {
    //   console.log('Creating user...');
    //   // Create a temporary user to bypass onboarding for testing
    //   const authResult = await signUp('test@example.com', 'tempPassword123');
    //   // ... rest of auth logic
    // } catch (error) {
    //   console.error('Failed to create user:', error);
    // }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Being</Text>
        <Text style={styles.subtitle}>
          Mindful awareness for emotional well-being
        </Text>
        
        <Text style={styles.description}>
          This is a placeholder for the onboarding flow. 
          In a complete app, this would guide users through:
          {'\n\n'}• Personal value selection{'\n'}
          • Notification preferences{'\n'}
          • Introduction to MBCT practices{'\n'}
          • Initial assessment setup
        </Text>

        <Button
          onPress={handleSkipOnboarding}
          style={styles.button}
        >
          Skip to App (Testing)
        </Button>
        
        <Button
          onPress={() => {
            console.log('🚧 Force skip temporarily disabled for debugging');
            // updateProfile({ onboardingCompleted: true });
          }}
          variant="outline"
          style={[styles.button, { marginTop: spacing.md }]}
        >
          Force Skip (Backup)
        </Button>
        
        <Text style={styles.debugText}>
          Try the backup button if the main button doesn't work
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  description: {
    fontSize: 16,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  button: {
    minWidth: 200,
  },
  debugText: {
    fontSize: 14,
    color: colorSystem.gray[500],
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});

export default OnboardingPlaceholder;