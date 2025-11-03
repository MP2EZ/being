/**
 * Profile Screen
 * Menu-based profile management with integrated onboarding
 * Provides access to settings, virtue dashboard, and onboarding
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
import OnboardingScreen from './OnboardingScreen';
import VirtueDashboardScreen from './VirtueDashboardScreen';
import AppSettingsScreen from './AppSettingsScreen';
import AccountSettingsScreen from './AccountSettingsScreen';
import { RootStackParamList } from '../navigation/CleanRootNavigator';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { isDevMode } from '../constants/devMode';
import { CollapsibleCrisisButton } from '../flows/shared/components/CollapsibleCrisisButton';

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

type Screen = 'menu' | 'onboarding' | 'virtueDashboard' | 'account' | 'privacy' | 'about' | 'stoicMindfulness';

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

  const devMode = isDevMode();

  const renderMenu = () => (
    <SafeAreaView style={styles.container}>
      {devMode && (
        <View style={styles.devModeBanner}>
          <Text style={styles.devModeText}>
            ⚠️ Development Mode - Single User Only
          </Text>
          <Text style={styles.devModeSubtext}>
            Auth features disabled until FEAT-16, FEAT-29, FEAT-58, FEAT-59 ship
          </Text>
        </View>
      )}
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
          <Text style={styles.sectionTitle}>Stoic Practice</Text>

          <Pressable
            style={styles.profileCard}
            onPress={() => setCurrentScreen('virtueDashboard')}
          >
            <Text style={styles.cardTitle}>Virtue Tracking Dashboard</Text>
            <Text style={styles.cardDescription}>
              View your character development journey. Track instances of practicing the four cardinal virtues and reflect on growth areas.
            </Text>
            <Text style={styles.cardAction}>View Dashboard →</Text>
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
              Learn about our mission, the philosophy and practice of Stoic Mindfulness, and how Being. supports your mental wellbeing.
            </Text>
            <Text style={styles.cardAction}>Learn More →</Text>
          </Pressable>

          <Pressable
            style={styles.profileCard}
            onPress={() => setCurrentScreen('stoicMindfulness')}
          >
            <Text style={styles.cardTitle}>About Stoic Mindfulness</Text>
            <Text style={styles.cardDescription}>
              Explore the 5 core principles, developmental stages, and how ancient Stoic wisdom combines with modern mindfulness practice.
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

  const renderAboutStoicMindfulness = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>About Stoic Mindfulness</Text>
          <Text style={styles.subtitle}>
            A comprehensive integration of ancient Stoic philosophy with modern mindfulness practice
          </Text>
        </View>

        {/* Introduction Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is Stoic Mindfulness?</Text>
          <Text style={styles.bodyText}>
            Stoic Mindfulness is a comprehensive integration of ancient Stoic philosophy with contemporary mindfulness practice, creating a comprehensive path to human flourishing through the transformation of consciousness.
          </Text>
          <Text style={styles.bodyText}>
            It combines the present-moment awareness of mindfulness with Stoic wisdom about what we control, how to respond virtuously, and how to live well in community with others.
          </Text>
        </View>

        {/* Five Principles Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Five Principles</Text>
          <Text style={styles.sectionDescription}>
            These integrative principles guide daily practice and long-term development:
          </Text>

          <View style={styles.principleCard}>
            <Text style={styles.principleTitle}>1. Aware Presence</Text>
            <Text style={styles.principleDescription}>
              Be fully here now, observing thoughts as mental events rather than truth, and feeling what's happening in your body. Integrates present perception, metacognitive space, and embodied awareness.
            </Text>
          </View>

          <View style={styles.principleCard}>
            <Text style={styles.principleTitle}>2. Radical Acceptance</Text>
            <Text style={styles.principleDescription}>
              Accept reality as it is, without resistance. "This is what's happening right now. I may not like it, but it is the reality I face. What do I do from here?" (Marcus Aurelius, Meditations 10:6)
            </Text>
          </View>

          <View style={styles.principleCard}>
            <Text style={styles.principleTitle}>3. Sphere Sovereignty</Text>
            <Text style={styles.principleDescription}>
              Distinguish what you control (your intentions, judgments, character, responses) from what you don't (outcomes, others' choices, externals). Focus energy only within your sphere. (Epictetus, Enchiridion 1)
            </Text>
          </View>

          <View style={styles.principleCard}>
            <Text style={styles.principleTitle}>4. Virtuous Response</Text>
            <Text style={styles.principleDescription}>
              In every situation, ask "What does wisdom, courage, justice, or temperance require here?" View obstacles as opportunities for practicing virtue. (Marcus Aurelius, Meditations 5:1)
            </Text>
          </View>

          <View style={styles.principleCard}>
            <Text style={styles.principleTitle}>5. Interconnected Living</Text>
            <Text style={styles.principleDescription}>
              Bring full presence to others. Recognize that we're all members of one human community. Act for the common good, not just personal benefit. (Marcus Aurelius, Meditations 8:59)
            </Text>
          </View>
        </View>

        {/* Developmental Stages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developmental Stages</Text>
          <Text style={styles.sectionDescription}>
            Stoic practice develops through four natural stages over time:
          </Text>

          <View style={styles.principleCard}>
            <Text style={styles.principleTitle}>Fragmented (1-6 months)</Text>
            <Text style={styles.principleDescription}>
              Building basic infrastructure - learning principles, inconsistent practice, conscious effort required.
            </Text>
          </View>

          <View style={styles.principleCard}>
            <Text style={styles.principleTitle}>Effortful (6-18 months)</Text>
            <Text style={styles.principleDescription}>
              Principles begin influencing behavior with conscious effort. More consistent practice across multiple domains.
            </Text>
          </View>

          <View style={styles.principleCard}>
            <Text style={styles.principleTitle}>Fluid (2-5 years)</Text>
            <Text style={styles.principleDescription}>
              Spontaneous application with less effort. Principles naturally arise in challenging moments.
            </Text>
          </View>

          <View style={styles.principleCard}>
            <Text style={styles.principleTitle}>Integrated (5+ years)</Text>
            <Text style={styles.principleDescription}>
              Embodied wisdom - practice becomes a natural way of being rather than something you do.
            </Text>
          </View>
        </View>

        {/* Philosophical Foundations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Philosophical Foundations</Text>
          <Text style={styles.bodyText}>
            Stoic Mindfulness draws on the wisdom of three major Stoic philosophers:
          </Text>
          <Text style={styles.bodyText}>
            <Text style={{ fontWeight: '600' }}>Marcus Aurelius</Text> (121-180 CE) - Roman Emperor whose Meditations provide intimate reflections on applying Stoic principles to daily challenges.
          </Text>
          <Text style={styles.bodyText}>
            <Text style={{ fontWeight: '600' }}>Epictetus</Text> (50-135 CE) - Former slave who taught that true freedom comes from focusing only on what we control.
          </Text>
          <Text style={styles.bodyText}>
            <Text style={{ fontWeight: '600' }}>Seneca</Text> (4 BCE-65 CE) - Statesman and advisor whose Letters provide practical guidance for living well.
          </Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleReturnToMenu}>
          <Text style={styles.primaryButtonText}>Return to Profile</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  // Render different screens based on state with crisis button overlay
  const renderContent = () => {
    if (currentScreen === 'menu') return renderMenu();

    if (currentScreen === 'onboarding') {
      return (
        <OnboardingScreen
          onComplete={handleOnboardingComplete}
          isEmbedded={true}
        />
      );
    }

    if (currentScreen === 'virtueDashboard') {
      return <VirtueDashboardScreen onReturn={handleReturnToMenu} />;
    }

    if (currentScreen === 'account') {
      return <AccountSettingsScreen onReturn={handleReturnToMenu} />;
    }

    if (currentScreen === 'privacy') {
      return <AppSettingsScreen onReturn={handleReturnToMenu} />;
    }

    if (currentScreen === 'about') {
      return renderPlaceholder(
        'About Being.',
        'Our mission and the science of mindfulness'
      );
    }

    if (currentScreen === 'stoicMindfulness') {
      return renderAboutStoicMindfulness();
    }

    return null;
  };

  return (
    <>
      {renderContent()}
      {/* Crisis Button Overlay - accessible across all profile screens */}
      <CollapsibleCrisisButton testID="crisis-profile" position="right" />
    </>
  );
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
  bodyText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  principleCard: {
    backgroundColor: colors.gray100,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.midnightBlue,
  },
  principleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  principleDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
  },
  devModeBanner: {
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: '#F59E0B',
  },
  devModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 4,
  },
  devModeSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#92400E',
    textAlign: 'center',
  },
});

export default ProfileScreen;