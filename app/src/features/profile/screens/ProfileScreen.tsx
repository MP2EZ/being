/**
 * Profile Screen
 * Menu-based profile management with integrated onboarding
 * Provides access to settings, virtue dashboard, wellbeing tracking, and onboarding
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
// FEAT-212: subscreens are now routes on ProfileStackNavigator. This component is
// the "ProfileMenu" route — it only renders the menu and navigates to the others.
// OnboardingScreen no longer embedded - navigation to LegalGate handles full flow
import { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import type { ProfileStackParamList } from '../ProfileStackNavigator';
import { useSubscriptionStore } from '@/core/stores/subscriptionStore';
import { isDevMode } from '@/core/constants/devMode';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import ThresholdEducationModal from '@/core/components/ThresholdEducationModal';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import { useAnalytics } from '@/core/analytics';

// Navigates within the Profile stack (Privacy, Account, …) AND up to root-stack
// routes (Subscription, LegalGate, AssessmentFlow, CrisisResources).
type ProfileScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<ProfileStackParamList>,
  StackNavigationProp<RootStackParamList>
>;

type AssessmentType = 'phq9' | 'gad7';

interface AssessmentMetadata {
  lastCompleted?: number;
  daysSince?: number;
  status: 'recent' | 'due' | 'recommended' | 'never';
}

// FEAT-209 H2: gate the "About Being." card until real content exists, so we
// stop shipping a "coming soon" placeholder as a first-class menu affordance.
// Build-time constant (not a feature flag) — flip to true when content lands.
const ABOUT_BEING_CONTENT_READY = false;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const subscriptionStore = useSubscriptionStore();
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [phq9Metadata, setPhq9Metadata] = useState<AssessmentMetadata>({ status: 'never' });
  const [gad7Metadata, setGad7Metadata] = useState<AssessmentMetadata>({ status: 'never' });
  const { trackScreenView } = useAnalytics();

  // Get assessment history from encrypted store
  const completedAssessments = useAssessmentStore(state => state.completedAssessments);

  // Track screen view for analytics (FEAT-40)
  // useFocusEffect tracks on every focus, not just mount (handles consent timing)
  useFocusEffect(
    useCallback(() => {
      trackScreenView('ProfileScreen');
    }, [trackScreenView])
  );

  const handleStartOnboarding = () => {
    // Navigate to LegalGate for full first-time experience (age + ToS + onboarding)
    navigation.navigate('LegalGate');
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
    <SafeAreaView key="menu-screen" style={styles.container} testID="profile-screen">
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
          <Text
            style={styles.title}
            accessibilityRole="header"
            accessibilityLevel={1}
          >
            Your Profile
          </Text>
          <Text style={styles.subtitle}>
            Personalize your Being. experience
          </Text>
        </View>

        {/* FEAT-209 H3/L2: Wellbeing Check-ins promoted to the top — assessments
            are the most common reason users open Profile. L3: the scoring-education
            trigger is now an inline ⓘ beside the heading (stays co-located → AS-5). */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text
              style={[styles.sectionTitle, styles.sectionTitleFlush]}
              accessibilityRole="header"
              accessibilityLevel={2}
            >
              Wellbeing Check-ins
            </Text>
            <Pressable
              style={styles.infoIconButton}
              onPress={() => setShowEducationModal(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Learn about assessment scoring"
              accessibilityHint="Opens educational information about how assessments are scored"
            >
              <MaterialDesignIcons
                name="information-outline"
                size={22}
                color={colorSystem.base.midnightBlue}
              />
            </Pressable>
          </View>
          <Text style={styles.sectionDescription}>
            Periodic self-assessments to observe patterns in your mental wellbeing. Recommended every 2 weeks.
          </Text>

          <Pressable
            style={styles.assessmentCard}
            onPress={() => handleStartAssessment('phq9')}
            testID="take-phq9-button"
            accessibilityRole="button"
            accessibilityLabel={`Depression Assessment PHQ-9, 3 to 5 minutes, ${
              phq9Metadata.status === 'never' ? 'recommended' :
              phq9Metadata.status === 'recent' ? 'completed' :
              phq9Metadata.status === 'due' ? 'due soon' : 'recommended'
            }`}
            accessibilityHint="Start the depression assessment"
          >
            <Text style={styles.cardTitle}>Depression Assessment (PHQ-9)</Text>
            {getStatusIndicator(phq9Metadata)}
            <Text style={styles.cardDescription}>
              Observe your mood patterns over the past two weeks through 9 questions.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDuration} importantForAccessibility="no">3-5 minutes</Text>
              <Text style={styles.cardMetadata} importantForAccessibility="no">{getMetadataText(phq9Metadata)}</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.assessmentCard}
            onPress={() => handleStartAssessment('gad7')}
            testID="take-gad7-button"
            accessibilityRole="button"
            accessibilityLabel={`Anxiety Assessment GAD-7, 2 to 4 minutes, ${
              gad7Metadata.status === 'never' ? 'recommended' :
              gad7Metadata.status === 'recent' ? 'completed' :
              gad7Metadata.status === 'due' ? 'due soon' : 'recommended'
            }`}
            accessibilityHint="Start the anxiety assessment"
          >
            <Text style={styles.cardTitle}>Anxiety Assessment (GAD-7)</Text>
            {getStatusIndicator(gad7Metadata)}
            <Text style={styles.cardDescription}>
              Observe your relationship with worry and anxiety through 7 questions.
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDuration} importantForAccessibility="no">2-4 minutes</Text>
              <Text style={styles.cardMetadata} importantForAccessibility="no">{getMetadataText(gad7Metadata)}</Text>
            </View>
          </Pressable>

        </View>

        {/* FEAT-209 C1: "Subscription" → "Your Plan" */}
        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
            accessibilityRole="header"
            accessibilityLevel={2}
          >
            Your Plan
          </Text>

          <Pressable
            style={styles.profileCard}
            onPress={handleSubscriptionPress}
            accessibilityRole="button"
            accessibilityLabel={getSubscriptionStatus()}
            accessibilityHint={subscriptionStore.isSubscriptionActive() ? 'Manage your subscription' : 'Start your 28-day free trial'}
          >
            <Text style={styles.cardTitle}>{getSubscriptionStatus()}</Text>
            <Text style={styles.cardDescription}>
              Unlock all therapeutic exercises, progress insights, and personalized guidance with a subscription. Try free for 28 days.
            </Text>
            <Text style={styles.cardAction} importantForAccessibility="no">
              {subscriptionStore.isSubscriptionActive() ? 'Manage Subscription →' : 'Start Free Trial →'}
            </Text>
          </Pressable>
        </View>

        {/* FEAT-209 C1/H3: single "Settings" hub merging the old "Setup &
            Configuration" + "Preferences" sections; resolves the App Settings /
            App Preferences / Account Settings naming collision. */}
        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
            accessibilityRole="header"
            accessibilityLevel={2}
          >
            Settings
          </Text>

          <Pressable
            style={styles.profileCard}
            onPress={() => navigation.navigate('AppSettings')}
            testID="profile-card-appsettings"
            accessibilityRole="button"
            accessibilityLabel="Notifications & Display"
            accessibilityHint="Configure notifications and accessibility preferences"
          >
            <Text style={styles.cardTitle}>Notifications & Display</Text>
            <Text style={styles.cardDescription}>
              Configure notifications, accessibility options, and view app information.
            </Text>
            <Text style={styles.cardAction} importantForAccessibility="no">Configure →</Text>
          </Pressable>

          <Pressable
            style={styles.profileCard}
            onPress={() => navigation.navigate('Privacy')}
            testID="profile-card-privacy"
            accessibilityRole="button"
            accessibilityLabel="Privacy and Data"
            accessibilityHint="Control your data, export information, and manage privacy settings"
          >
            <Text style={styles.cardTitle}>Privacy & Data</Text>
            <Text style={styles.cardDescription}>
              Control your data, export your information, and manage privacy settings.
            </Text>
            <Text style={styles.cardAction} importantForAccessibility="no">Review →</Text>
          </Pressable>

          <Pressable
            style={styles.profileCard}
            onPress={() => navigation.navigate('Account')}
            testID="profile-card-account"
            accessibilityRole="button"
            accessibilityLabel="Account"
            accessibilityHint="Manage your account details and preferences"
          >
            <Text style={styles.cardTitle}>Account</Text>
            <Text style={styles.cardDescription}>
              Manage your account details and preferences.
            </Text>
            <Text style={styles.cardAction} importantForAccessibility="no">Manage →</Text>
          </Pressable>
        </View>

        {/* FEAT-209 C1: "Information" → "About" */}
        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
            accessibilityRole="header"
            accessibilityLevel={2}
          >
            About
          </Text>

          <Pressable
            style={styles.profileCard}
            onPress={() => navigation.navigate('StoicMindfulness')}
            testID="profile-card-stoic"
            accessibilityRole="button"
            accessibilityLabel="About Stoic Mindfulness"
            accessibilityHint="Explore the 5 core principles and developmental stages"
          >
            <Text style={styles.cardTitle}>About Stoic Mindfulness</Text>
            <Text style={styles.cardDescription}>
              Explore the 5 core principles, developmental stages, and how ancient Stoic wisdom combines with modern mindfulness practice.
            </Text>
            <Text style={styles.cardAction} importantForAccessibility="no">Learn More →</Text>
          </Pressable>

          {/* FEAT-209 H2: "About Being." stays hidden until real content exists. */}
          {ABOUT_BEING_CONTENT_READY && (
            <Pressable
              style={styles.profileCard}
              onPress={() => navigation.navigate('About')}
              testID="profile-card-about-being"
              accessibilityRole="button"
              accessibilityLabel="About Being"
              accessibilityHint="Learn about our mission and how Being supports your mental wellbeing"
            >
              <Text style={styles.cardTitle}>About Being.</Text>
              <Text style={styles.cardDescription}>
                Learn about our mission, the philosophy and practice of Stoic Mindfulness, and how Being. supports your mental wellbeing.
              </Text>
              <Text style={styles.cardAction} importantForAccessibility="no">Learn More →</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.profileCard}
            onPress={() => navigation.navigate('Legal')}
            testID="profile-card-legal"
            accessibilityRole="button"
            accessibilityLabel="Legal Documents"
            accessibilityHint="View Privacy Policy, Terms of Service, and Medical Disclaimer"
          >
            <Text style={styles.cardTitle}>Legal Documents</Text>
            <Text style={styles.cardDescription}>
              View our Privacy Policy, Terms of Service, Medical Disclaimer, and other important legal information.
            </Text>
            <Text style={styles.cardAction} importantForAccessibility="no">View Documents →</Text>
          </Pressable>
        </View>

        {/* FEAT-209 H3: Onboarding Setup demoted from a top card to a footer link. */}
        <Pressable
          style={styles.footerLink}
          onPress={handleStartOnboarding}
          accessibilityRole="button"
          accessibilityLabel="Onboarding Setup"
          accessibilityHint="Complete your initial assessment and configure preferences"
        >
          <Text style={styles.footerLinkText}>Onboarding Setup</Text>
        </Pressable>
      </ScrollView>

      {/* Education Modal */}
      <ThresholdEducationModal
        visible={showEducationModal}
        onDismiss={() => setShowEducationModal(false)}
      />
    </SafeAreaView>
  );

  // FEAT-212: this component is the ProfileMenu route. The crisis overlay is now
  // hosted by ProfileStackNavigator (sibling above the stack), so it is no longer
  // rendered here — it covers every Profile route including this one.
  return renderMenu();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
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
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing[32],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[16],
  },
  // Row that pairs a section heading with a trailing inline action (the ⓘ).
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[16],
  },
  // The heading already supplies the row's bottom margin, so drop its own.
  sectionTitleFlush: {
    marginBottom: 0,
    flexShrink: 1,
  },
  // ⓘ scoring trigger. hitSlop expands the 22pt glyph past the 44pt WCAG 2.5.5
  // minimum touch target without enlarging the visual icon.
  infoIconButton: {
    padding: spacing[4],
    marginLeft: spacing[8],
  },
  sectionDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 22,
    marginBottom: spacing[16],
  },
  profileCard: {
    backgroundColor: colorSystem.gray[100],
    // MAINT-222: unified content-card radius (xl=16)
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    marginBottom: spacing[16],
    borderWidth: 1,
// WCAG AA: Use gray400 for 3:1 minimum contrast ratio on borders
    borderColor: colorSystem.gray[400],
  },
  cardTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  cardDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 22,
    marginBottom: spacing[16],
  },
  cardAction: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.midnightBlue,
  },
  primaryButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginTop: spacing[24],
  },
  primaryButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  devModeBanner: {
    backgroundColor: colorSystem.status.warningBackground,
    padding: spacing[16],
    borderBottomWidth: 2,
    borderBottomColor: colorSystem.status.warning,
  },
  devModeText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.status.warning,
    textAlign: 'center',
    marginBottom: 4,
  },
  devModeSubtext: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.status.warning,
    textAlign: 'center',
  },
  assessmentCard: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
// WCAG AA: Use gray400 for 3:1 minimum contrast ratio on borders
    borderColor: colorSystem.gray[400],
    // MAINT-222: unified content-card radius (xl=16); border-preferred elevation,
    // dropped the hand-rolled #000 shadow (the gray[400] border is the elevation).
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    marginBottom: spacing[16],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDuration: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.midnightBlue,
  },
  cardMetadata: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[500],
  },
  statusRecent: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.status.success,
    backgroundColor: colorSystem.status.successBackground,
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
    color: colorSystem.gray[700],
    backgroundColor: colorSystem.gray[100],
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
    color: colorSystem.status.warning,
    backgroundColor: colorSystem.status.warningBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.small,
    alignSelf: 'flex-start',
    marginTop: spacing[8],
    marginBottom: spacing[8],
  },
  // FEAT-209 H3: low-emphasis footer link for the demoted Onboarding Setup entry.
  footerLink: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    alignItems: 'center',
    marginTop: spacing[8],
  },
  footerLinkText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.midnightBlue,
    textDecorationLine: 'underline',
  },
});

export default ProfileScreen;