/**
 * CONSENT MANAGEMENT SCREEN
 * Granular privacy consent settings (FEAT-90)
 *
 * COMPLIANCE:
 * - All toggles default to OFF (opt-out, privacy-first)
 * - No dark patterns (equal visual weight, no pre-checked boxes)
 * - Plain language explanations
 * - Immediate effect on toggle change
 *
 * DARK PATTERN PREVENTION:
 * - No pre-checked boxes
 * - Clear opt-out = default
 * - No confusing double-negatives
 * - Equal visual weight for accept/decline
 * - "Customize" equal prominence to "Accept all"
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Touch targets 44px minimum
 * - Screen reader support
 * - Focus management
 *
 * CRITICAL:
 * - Crisis button access NEVER gated by consent
 * - App fully functional with all consents OFF
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useConsentStore, ConsentPreferences, AgeVerification } from '@/core/stores/consentStore';
import ConsentToggleCard from '../components/ConsentToggleCard';
import { commonColors, spacing, borderRadius, typography } from '@/core/theme';

interface ConsentManagementScreenProps {
  /** 'onboarding' = condensed view, 'settings' = full view */
  mode: 'onboarding' | 'settings';
  /** Called when consent is collected (onboarding) or when returning (settings) */
  onComplete: () => void;
  /** Age verification data (required for initial consent) */
  ageVerification?: AgeVerification;
}

// Consent category details (plain language)
const CONSENT_DETAILS = {
  analytics: {
    title: 'Analytics',
    description: 'Help us improve the app by understanding how it\'s used',
    details: {
      whatWeCollect: [
        'Which features you use (e.g., "Daily Check-in completed")',
        'How long you spend in the app',
        'Device type (iPhone, Android, etc.)',
      ],
      whatWeDontCollect: [
        'Your journal entries, mood ratings, or assessment scores',
        'Any personally identifiable information',
        'Location data',
      ],
      whyItHelps: 'Understanding usage patterns helps us improve features you care about and fix confusing flows.',
      privacyNote: 'Data retention: 90 days, then automatically deleted. Anonymized before storage.',
    },
  },
  crashReports: {
    title: 'Crash Reports',
    description: 'Automatically report errors to fix bugs faster',
    details: {
      whatWeCollect: [
        'Technical error logs (which code failed)',
        'Device info (OS version, app version)',
        'What screen you were on when the crash occurred',
      ],
      whatWeDontCollect: [
        'Your personal data (mood, journal, assessments)',
        'Identifiable information',
      ],
      whyItHelps: 'Crashes disrupt your practice. Automatic reports help us detect and fix issues before they affect more people.',
      privacyNote: 'All crash reports are encrypted and anonymized.',
    },
  },
  cloudSync: {
    title: 'Cloud Backup',
    description: 'Securely sync your data across devices',
    details: {
      whatWeCollect: [
        'App preferences and settings',
        'Journal entries (encrypted)',
        'Mood tracking history',
        'Custom reminders',
      ],
      whatWeDontCollect: [
        'PHQ-9/GAD-7 assessment raw scores (local only for privacy)',
        'Crisis contact information (device-specific)',
      ],
      whyItHelps: 'Restore data if you get a new phone. Access your journal on tablet and phone. Automatic backup protection.',
      privacyNote: 'End-to-end encryption. We cannot decrypt or access your synced content.',
    },
  },
  research: {
    title: 'Research Participation',
    description: 'Help improve mental health care (fully anonymous)',
    details: {
      whatWeCollect: [
        'Aggregated mood trends (e.g., "60% of users report improvement")',
        'Feature effectiveness data (which practices help most)',
        'Anonymized usage patterns',
      ],
      whatWeDontCollect: [
        'Individual responses or identifiable data',
        'Data shared with third parties for advertising',
        'Anything that could identify you',
      ],
      whyItHelps: 'Research helps us validate that Stoic practices are effective, publish findings to help more people, and secure funding to keep the app accessible.',
      privacyNote: 'Fully anonymized. Aggregated with 1,000+ other users. You can opt out anytime.',
    },
  },
};

const ConsentManagementScreen: React.FC<ConsentManagementScreenProps> = ({
  mode,
  onComplete,
  ageVerification,
}) => {
  const {
    currentConsent,
    consentStatus,
    isLoading,
    loadConsent,
    grantConsent,
    updateConsent,
  } = useConsentStore();

  // Local state for consent preferences
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    analyticsEnabled: false,
    crashReportsEnabled: false,
    cloudSyncEnabled: false,
    researchEnabled: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  // Load existing consent on mount (settings mode)
  useEffect(() => {
    if (mode === 'settings') {
      loadConsent();
    }
  }, [mode, loadConsent]);

  // Sync local state with loaded consent
  useEffect(() => {
    if (currentConsent?.preferences) {
      setPreferences(currentConsent.preferences);
    }
  }, [currentConsent]);

  const handleToggle = useCallback(async (
    key: keyof ConsentPreferences,
    value: boolean
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));

    // In settings mode, save immediately
    if (mode === 'settings' && currentConsent) {
      setIsSaving(true);
      try {
        await updateConsent({ [key]: value });
        AccessibilityInfo.announceForAccessibility(
          `${value ? 'Enabled' : 'Disabled'}. Changes saved.`
        );
      } catch (error) {
        Alert.alert('Error', 'Failed to save consent preference. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  }, [mode, currentConsent, updateConsent]);

  const handleContinue = useCallback(async () => {
    if (mode === 'onboarding') {
      if (!ageVerification) {
        Alert.alert('Error', 'Age verification required');
        return;
      }

      setIsSaving(true);
      try {
        await grantConsent(preferences, ageVerification);
        AccessibilityInfo.announceForAccessibility('Consent saved. Proceeding to app.');
        onComplete();
      } catch (error) {
        Alert.alert('Error', 'Failed to save consent. Please try again.');
      } finally {
        setIsSaving(false);
      }
    } else {
      onComplete();
    }
  }, [mode, preferences, ageVerification, grantConsent, onComplete]);

  // Loading state
  if (mode === 'settings' && isLoading && !currentConsent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={commonColors.midnightBlue} />
          <Text style={styles.loadingText}>Loading consent settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            {mode === 'onboarding' ? 'Choose What You Share' : 'Privacy & Data'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'onboarding'
              ? 'Being works fully with all options off. Choose what feels right for you.'
              : 'We believe your data belongs to you. Choose what you share.'
            }
          </Text>
        </View>

        {/* Essential Services Section (always on) */}
        <View style={styles.essentialSection} accessibilityRole="text">
          <Text style={styles.essentialTitle}>Essential (Always On)</Text>
          <Text style={styles.essentialItem}>• App functionality</Text>
          <Text style={styles.essentialItem}>• Crisis resources (988)</Text>
          <Text style={styles.essentialItem}>• Local data storage</Text>
        </View>

        {/* Consent Toggles */}
        <View style={styles.toggleSection}>
          <ConsentToggleCard
            title={CONSENT_DETAILS.analytics.title}
            description={CONSENT_DETAILS.analytics.description}
            details={CONSENT_DETAILS.analytics.details}
            value={preferences.analyticsEnabled}
            onValueChange={(value) => handleToggle('analyticsEnabled', value)}
            disabled={isSaving}
            testID="consent-analytics"
          />

          <ConsentToggleCard
            title={CONSENT_DETAILS.crashReports.title}
            description={CONSENT_DETAILS.crashReports.description}
            details={CONSENT_DETAILS.crashReports.details}
            value={preferences.crashReportsEnabled}
            onValueChange={(value) => handleToggle('crashReportsEnabled', value)}
            disabled={isSaving}
            testID="consent-crash-reports"
          />

          <ConsentToggleCard
            title={CONSENT_DETAILS.cloudSync.title}
            description={CONSENT_DETAILS.cloudSync.description}
            details={CONSENT_DETAILS.cloudSync.details}
            value={preferences.cloudSyncEnabled}
            onValueChange={(value) => handleToggle('cloudSyncEnabled', value)}
            disabled={isSaving}
            testID="consent-cloud-sync"
          />

          <ConsentToggleCard
            title={CONSENT_DETAILS.research.title}
            description={CONSENT_DETAILS.research.description}
            details={CONSENT_DETAILS.research.details}
            value={preferences.researchEnabled}
            onValueChange={(value) => handleToggle('researchEnabled', value)}
            disabled={isSaving}
            testID="consent-research"
          />
        </View>

        {/* Privacy Promise */}
        <View style={styles.privacyPromise}>
          <Text style={styles.privacyPromiseText}>
            Your check-in responses, therapeutic values, and health data are NEVER
            shared. You can change these settings anytime in Settings {'>'} Privacy.
          </Text>
        </View>

        {/* Last Updated (settings mode only) */}
        {mode === 'settings' && currentConsent && (
          <Text style={styles.lastUpdated}>
            Last updated: {new Date(currentConsent.updatedAt).toLocaleDateString()}
          </Text>
        )}

        {/* Continue/Done Button */}
        <Pressable
          style={[
            styles.continueButton,
            isSaving && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={mode === 'onboarding' ? 'Continue' : 'Done'}
          accessibilityState={{ disabled: isSaving }}
        >
          <Text style={styles.continueButtonText}>
            {isSaving ? 'Saving...' : mode === 'onboarding' ? 'Continue' : 'Done'}
          </Text>
        </Pressable>

        {/* Feature Limitation Note (if cloud sync off) */}
        {!preferences.cloudSyncEnabled && mode === 'settings' && (
          <View style={styles.limitationNote}>
            <Text style={styles.limitationNoteTitle}>Cloud Backup is off</Text>
            <Text style={styles.limitationNoteText}>
              Your data is stored locally only. To protect your data, you can
              export backups manually from Settings {'>'} Export Data.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: spacing[48],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[32],
  },
  loadingText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    marginTop: spacing[16],
  },
  header: {
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: commonColors.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  essentialSection: {
    backgroundColor: '#FAFAFA',
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[24],
    borderWidth: 1,
    borderColor: commonColors.gray200,
  },
  essentialTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.gray500,
    marginBottom: spacing[8],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  essentialItem: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: 24,
  },
  toggleSection: {
    marginBottom: spacing[24],
  },
  privacyPromise: {
    backgroundColor: '#E8F4EC',
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[24],
    borderLeftWidth: 3,
    borderLeftColor: commonColors.success,
  },
  privacyPromiseText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: 20,
  },
  lastUpdated: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray400,
    textAlign: 'center',
    marginBottom: spacing[24],
  },
  continueButton: {
    backgroundColor: commonColors.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    minHeight: 56,
  },
  continueButtonDisabled: {
    backgroundColor: commonColors.gray400,
  },
  continueButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.white,
  },
  limitationNote: {
    backgroundColor: '#FFF8E1',
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginTop: spacing[24],
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  limitationNoteTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#92400E',
    marginBottom: spacing[4],
  },
  limitationNoteText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: 20,
  },
});

export default ConsentManagementScreen;
