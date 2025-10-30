/**
 * Simple Profile Screen - Minimal implementation
 * Menu-based profile management with integrated onboarding
 * Following ExercisesScreen.simple.tsx pattern exactly
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OnboardingScreen from './OnboardingScreen.simple';
import { RootStackParamList } from '../navigation/CleanRootNavigator';
import { useSubscriptionStore } from '../stores/subscriptionStore';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// Hardcoded colors - no dynamic theme system
const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  midnightBlue: '#1B2951',
  morningPrimary: '#FF9F43',
  eveningPrimary: '#4A7C59',
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

type Screen = 'menu' | 'onboarding' | 'account' | 'privacy' | 'about';

const ProfileScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const subscriptionStore = useSubscriptionStore();

  const handleStartOnboarding = () => {
    setCurrentScreen('onboarding');
  };

  const handleOnboardingComplete = () => {
    // Return to profile menu after onboarding
    setCurrentScreen('menu');
  };

  const handleReturnToMenu = () => {
    setCurrentScreen('menu');
  };

  const handleSubscriptionPress = () => {
    navigation.navigate('Subscription');
  };

  const getSubscriptionStatus = () => {
    if (subscriptionStore.isTrialActive()) {
      const daysRemaining = subscriptionStore.getTrialDaysRemaining();
      return `Free Trial - ${daysRemaining} days remaining`;
    }
    if (subscriptionStore.isSubscriptionActive()) {
      return 'Active Subscription';
    }
    return 'Start Your Free Trial';
  };

  const renderMenu = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Profile</Text>
          <Text style={styles.subtitle}>
            Manage your account and personalize your Being. experience
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setup & Configuration</Text>

          <Pressable
            style={styles.profileCard}
            onPress={handleStartOnboarding}
          >
            <Text style={styles.cardTitle}>Onboarding Setup</Text>
            <Text style={styles.cardDescription}>
              Complete your initial assessment and configure your therapeutic preferences for a personalized experience.
            </Text>
            <Text style={styles.cardAction}>Start Setup →</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crisis Resources</Text>
          <Text style={styles.sectionDescription}>
            If you're experiencing a mental health crisis, immediate help is available.
          </Text>

          <Pressable
            style={[styles.profileCard, styles.crisisCard]}
            onPress={() => Linking.openURL('tel:988')}
          >
            <Text style={styles.cardTitle}>🆘 988 Suicide & Crisis Lifeline</Text>
            <Text style={styles.cardDescription}>
              24/7 support for people in distress, prevention and crisis resources for you or your loved ones. Call or text 988.
            </Text>
            <Text style={styles.crisisAction}>Call 988 →</Text>
          </Pressable>

          <Pressable
            style={[styles.profileCard, styles.crisisCard]}
            onPress={() => Linking.openURL('sms:741741')}
          >
            <Text style={styles.cardTitle}>💬 Crisis Text Line</Text>
            <Text style={styles.cardDescription}>
              Free, 24/7 support for those in crisis. Text HOME to 741741 to connect with a trained Crisis Counselor.
            </Text>
            <Text style={styles.crisisAction}>Text HOME to 741741 →</Text>
          </Pressable>

          <Pressable
            style={[styles.profileCard, styles.crisisCard]}
            onPress={() => Linking.openURL('https://findtreatment.samhsa.gov/')}
          >
            <Text style={styles.cardTitle}>🏥 Find Local Treatment</Text>
            <Text style={styles.cardDescription}>
              SAMHSA's Treatment Locator helps you find mental health and substance use treatment facilities in your area.
            </Text>
            <Text style={styles.crisisAction}>Find Treatment →</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>

          <Pressable
            style={styles.profileCard}
            onPress={handleSubscriptionPress}
          >
            <Text style={styles.cardTitle}>{getSubscriptionStatus()}</Text>
            <Text style={styles.cardDescription}>
              Unlock all therapeutic exercises, progress insights, and personalized guidance with a subscription. Try free for 28 days.
            </Text>
            <Text style={styles.cardAction}>
              {subscriptionStore.isSubscriptionActive() ? 'Manage Subscription →' : 'Start Free Trial →'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Management</Text>

          <Pressable
            style={styles.profileCard}
            onPress={() => setCurrentScreen('account')}
          >
            <Text style={styles.cardTitle}>Account Settings</Text>
            <Text style={styles.cardDescription}>
              Manage your email, password, and account preferences.
            </Text>
            <Text style={styles.cardAction}>Manage →</Text>
          </Pressable>

          <Pressable
            style={styles.profileCard}
            onPress={() => setCurrentScreen('privacy')}
          >
            <Text style={styles.cardTitle}>Privacy & Data</Text>
            <Text style={styles.cardDescription}>
              Control your data, export your information, and manage privacy settings.
            </Text>
            <Text style={styles.cardAction}>Review →</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>

          <Pressable
            style={styles.profileCard}
            onPress={() => setCurrentScreen('about')}
          >
            <Text style={styles.cardTitle}>About Being.</Text>
            <Text style={styles.cardDescription}>
              Learn about our mission, the science behind MBCT, and how Being. supports your mental wellbeing.
            </Text>
            <Text style={styles.cardAction}>Learn More →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderPlaceholder = (title: string, description: string) => (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{description}</Text>
        </View>

        <View style={styles.placeholderContent}>
          <Text style={styles.placeholderText}>
            This feature is coming soon. We're working hard to bring you the best experience.
          </Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleReturnToMenu}>
          <Text style={styles.primaryButtonText}>Return to Profile</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  // Render different screens based on state
  if (currentScreen === 'menu') return renderMenu();

  if (currentScreen === 'onboarding') {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        isEmbedded={true}
      />
    );
  }

  if (currentScreen === 'account') {
    return renderPlaceholder(
      'Account Settings',
      'Manage your account details and preferences'
    );
  }

  if (currentScreen === 'privacy') {
    return renderPlaceholder(
      'Privacy & Data',
      'Your data privacy and security settings'
    );
  }

  if (currentScreen === 'about') {
    return renderPlaceholder(
      'About Being.',
      'Our mission and the science of mindfulness'
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.md,
  },
  sectionDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  profileCard: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  cardAction: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.midnightBlue,
  },
  crisisCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  crisisAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  placeholderContent: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.xl,
    marginVertical: spacing.xl,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.midnightBlue,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
});

export default ProfileScreen;