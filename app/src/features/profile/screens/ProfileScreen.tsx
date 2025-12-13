/**
 * Profile Screen
 * Menu-based profile management with integrated onboarding
 * Provides access to settings, virtue dashboard, wellbeing tracking, and onboarding
 */

import React, { useState, useEffect } from 'react';
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
// OnboardingScreen no longer embedded - navigation to LegalGate handles full flow
import AppSettingsScreen from './AppSettingsScreen';
import AccountSettingsScreen from './AccountSettingsScreen';
import LegalDocumentsListScreen from './LegalDocumentsListScreen';
import { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import { isDevMode } from '@/core/constants/devMode';
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';
import ThresholdEducationModal from '@/core/components/ThresholdEducationModal';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { commonColors, spacing, borderRadius, typography } from '@/core/theme';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type AssessmentType = 'phq9' | 'gad7';

interface AssessmentMetadata {
  lastCompleted?: number;
  daysSince?: number;
  status: 'recent' | 'due' | 'recommended' | 'never';
}

type Screen = 'menu' | 'account' | 'privacy' | 'about' | 'stoicMindfulness' | 'legal';

const ProfileScreen: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const subscriptionStore = useSubscriptionStore();
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [phq9Metadata, setPhq9Metadata] = useState<AssessmentMetadata>({ status: 'never' });
  const [gad7Metadata, setGad7Metadata] = useState<AssessmentMetadata>({ status: 'never' });

  // Get assessment history from encrypted store
  const completedAssessments = useAssessmentStore(state => state.completedAssessments);

  const handleStartOnboarding = () => {
    // Navigate to LegalGate for full first-time experience (age + ToS + onboarding)
    navigation.navigate('LegalGate');
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

  // Load assessment metadata when assessments change
  useEffect(() => {
    loadAssessmentMetadata();
  }, [completedAssessments]); // Re-calculate when assessments change

  const loadAssessmentMetadata = () => {
    const now = Date.now();

    // PHQ-9 metadata from encrypted store
    const phq9Sessions = completedAssessments.filter(s => s.type === 'phq9');
    if (phq9Sessions.length > 0) {
      const lastPhq9 = phq9Sessions[phq9Sessions.length - 1];
      if (!lastPhq9) return;

      const completedAt = lastPhq9.result?.completedAt;

      if (completedAt) {
        const daysSince = Math.floor((now - completedAt) / (1000 * 60 * 60 * 24));
        let status: 'recent' | 'due' | 'recommended' = 'recommended';
        if (daysSince < 14) status = 'recent';
        else if (daysSince < 21) status = 'due';
        else status = 'recommended';
        setPhq9Metadata({ lastCompleted: completedAt, daysSince, status });
      }
    } else {
      setPhq9Metadata({ status: 'never' });
    }

    // GAD-7 metadata from encrypted store
    const gad7Sessions = completedAssessments.filter(s => s.type === 'gad7');
    if (gad7Sessions.length > 0) {
      const lastGad7 = gad7Sessions[gad7Sessions.length - 1];
      if (!lastGad7) return;

      const completedAt = lastGad7.result?.completedAt;

      if (completedAt) {
        const daysSince = Math.floor((now - completedAt) / (1000 * 60 * 60 * 24));
        let status: 'recent' | 'due' | 'recommended' = 'recommended';
        if (daysSince < 14) status = 'recent';
        else if (daysSince < 21) status = 'due';
        else status = 'recommended';
        setGad7Metadata({ lastCompleted: completedAt, daysSince, status });
      }
    } else {
      setGad7Metadata({ status: 'never' });
    }
  };

  const handleStartAssessment = (type: AssessmentType) => {
    // Assessment results auto-saved to assessmentStore by EnhancedAssessmentFlow
    // ProfileScreen refreshes via useEffect watching completedAssessments
    navigation.navigate('AssessmentFlow', {
      assessmentType: type,
      context: 'standalone',
    });
  };

  const getStatusIndicator = (metadata: AssessmentMetadata) => {
    if (metadata.status === 'never') {
      return <Text style={styles.statusRecommended}>Recommended</Text>;
    }
    if (metadata.status === 'recent') {
      return <Text style={styles.statusRecent}>Completed</Text>;
    }
    if (metadata.status === 'due') {
      return <Text style={styles.statusDue}>Due Soon</Text>;
    }
    return <Text style={styles.statusRecommended}>Recommended</Text>;
  };

  const getMetadataText = (metadata: AssessmentMetadata) => {
    if (metadata.status === 'never') {
      return 'Not completed yet';
    }
    if (metadata.daysSince !== undefined) {
      return `Last completed ${metadata.daysSince} ${metadata.daysSince === 1 ? 'day' : 'days'} ago`;
    }
    return '';
  };

  const devMode = isDevMode();

  const renderMenu = () => (
    <SafeAreaView style={styles.container} testID="profile-screen">
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
          <Text style={styles.sectionTitle}>Wellbeing Tracking</Text>
          <Text style={styles.sectionDescription}>
            Periodic self-assessments to observe patterns in your mental wellbeing. Recommended every 2 weeks.
          </Text>

          <Pressable
            style={styles.assessmentCard}
            onPress={() => handleStartAssessment('phq9')}
            accessibilityLabel="Depression Assessment (PHQ-9)"
            accessibilityHint="3 to 5 minute assessment"
          >
            <Text style={styles.cardTitle}>Depression Assessment (PHQ-9)</Text>
            {getStatusIndicator(phq9Metadata)}
            <Text style={styles.cardDescription}>
              Observe your mood patterns over the past two weeks through 9 questions.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDuration}>3-5 minutes</Text>
              <Text style={styles.cardMetadata}>{getMetadataText(phq9Metadata)}</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.assessmentCard}
            onPress={() => handleStartAssessment('gad7')}
            accessibilityLabel="Anxiety Assessment (GAD-7)"
            accessibilityHint="2 to 4 minute assessment"
          >
            <Text style={styles.cardTitle}>Anxiety Assessment (GAD-7)</Text>
            {getStatusIndicator(gad7Metadata)}
            <Text style={styles.cardDescription}>
              Observe your relationship with worry and anxiety through 7 questions.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDuration}>2-4 minutes</Text>
              <Text style={styles.cardMetadata}>{getMetadataText(gad7Metadata)}</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.educationLink}
            onPress={() => setShowEducationModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Learn about assessment scoring"
          >
            <Text style={styles.educationLinkText}>
              Learn about assessment scoring
            </Text>
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

          <Pressable
            style={styles.profileCard}
            onPress={() => setCurrentScreen('legal')}
          >
            <Text style={styles.cardTitle}>Legal Documents</Text>
            <Text style={styles.cardDescription}>
              View our Privacy Policy, Terms of Service, Medical Disclaimer, and other important legal information.
            </Text>
            <Text style={styles.cardAction}>View Documents →</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Education Modal */}
      <ThresholdEducationModal
        visible={showEducationModal}
        onDismiss={() => setShowEducationModal(false)}
      />
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
            <Text style={{ fontWeight: typography.fontWeight.semibold }}>Marcus Aurelius</Text> (121-180 CE) - Roman Emperor whose Meditations provide intimate reflections on applying Stoic principles to daily challenges.
          </Text>
          <Text style={styles.bodyText}>
            <Text style={{ fontWeight: typography.fontWeight.semibold }}>Epictetus</Text> (50-135 CE) - Former slave who taught that true freedom comes from focusing only on what we control.
          </Text>
          <Text style={styles.bodyText}>
            <Text style={{ fontWeight: typography.fontWeight.semibold }}>Seneca</Text> (4 BCE-65 CE) - Statesman and advisor whose Letters provide practical guidance for living well.
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

    if (currentScreen === 'legal') {
      return <LegalDocumentsListScreen onReturn={handleReturnToMenu} />;
    }

    return null;
  };

  return (
    <>
      {renderContent()}
      {/* Crisis Button Overlay - accessible across all profile screens */}
      <CollapsibleCrisisButton
        mode="standard"
        onNavigate={() => navigation.navigate('CrisisResources')}
        testID="crisis-profile"
        position="right"
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commonColors.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[32],
  },
  header: {
    marginBottom: spacing[32],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: commonColors.midnightBlue,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing[32],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
    marginBottom: spacing[16],
  },
  sectionDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: 22,
    marginBottom: spacing[16],
  },
  profileCard: {
    backgroundColor: commonColors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[16],
    borderWidth: 1,
    borderColor: commonColors.gray200,
  },
  cardTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
    marginBottom: spacing[8],
  },
  cardDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: 22,
    marginBottom: spacing[16],
  },
  cardAction: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: commonColors.midnightBlue,
  },
  placeholderContent: {
    backgroundColor: commonColors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[32],
    marginVertical: spacing[32],
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray500,
    textAlign: 'center',
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: commonColors.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginTop: spacing[24],
  },
  primaryButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.white,
  },
  bodyText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: 24,
    marginBottom: spacing[16],
  },
  principleCard: {
    backgroundColor: commonColors.gray100,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[16],
    borderLeftWidth: 3,
    borderLeftColor: commonColors.midnightBlue,
  },
  principleTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
    marginBottom: spacing[8],
  },
  principleDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: 20,
  },
  devModeBanner: {
    backgroundColor: '#FEF3C7',
    padding: spacing[16],
    borderBottomWidth: 2,
    borderBottomColor: '#F59E0B',
  },
  devModeText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 4,
  },
  devModeSubtext: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.regular,
    color: '#92400E',
    textAlign: 'center',
  },
  assessmentCard: {
    backgroundColor: commonColors.white,
    borderWidth: 1,
    borderColor: commonColors.gray300,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[16],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDuration: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: commonColors.midnightBlue,
  },
  cardMetadata: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray500,
  },
  statusRecent: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.small,
    alignSelf: 'flex-start',
    marginTop: spacing[8],
    marginBottom: spacing[8],
  },
  statusDue: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#374151',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.small,
    alignSelf: 'flex-start',
    marginTop: spacing[8],
    marginBottom: spacing[8],
  },
  statusRecommended: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.small,
    alignSelf: 'flex-start',
    marginTop: spacing[8],
    marginBottom: spacing[8],
  },
  educationLink: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    marginTop: spacing[8],
  },
  educationLinkText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: commonColors.morningPrimary,
    textDecorationLine: 'underline',
  },
});

export default ProfileScreen;