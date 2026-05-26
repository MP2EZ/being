/**
 * COMBINED LEGAL GATE SCREEN
 * Consolidates age verification + four separate legal consents into one screen
 *
 * COMPLIANCE:
 * - Age verification BEFORE any data collection (18+ per ToS §4 / Privacy §8)
 * - Four separated checkboxes:
 *     1. Terms of Service acceptance
 *     2. Privacy Policy acceptance
 *     3. Wellness Disclaimer acknowledgment (not medical care; crisis = 911/988)
 *     4. GDPR Art. 9(2)(a) explicit consent for mental-health data processing
 * - Crisis resources visible to ALL users (not just under-18)
 *
 * UX OPTIMIZATION:
 * - Single legal gate reduces cognitive load
 * - Crisis resources always accessible
 * - Progressive disclosure ("You'll choose what to share after experiencing the app")
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - 44px+ touch targets
 * - Screen reader support
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useConsentStore, recordLegalGateConsents } from '@/core/stores/consentStore';
import { logSecurity } from '@/core/services/logging';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

interface CombinedLegalGateScreenProps {
  /** Called when user passes legal gate (age verified + four consents accepted) */
  onComplete: () => void;
  /** Called when user is under 18 */
  onUnderAge: () => void;
}

const CombinedLegalGateScreen: React.FC<CombinedLegalGateScreenProps> = ({
  onComplete,
  onUnderAge,
}) => {
  const { verifyAge } = useConsentStore();

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [wellnessDisclaimerAcknowledged, setWellnessDisclaimerAcknowledged] = useState(false);
  const [mentalHealthProcessingConsented, setMentalHealthProcessingConsented] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnderAge, setShowUnderAge] = useState(false);

  const allConsentsTicked =
    tosAccepted && privacyAccepted && wellnessDisclaimerAcknowledged && mentalHealthProcessingConsented;

  // Generate years for picker (100 years back from current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const calculateAge = (birthYear: number): number => {
    return currentYear - birthYear;
  };

  const handleContinue = useCallback(async () => {
    // Validate year selected
    if (!selectedYear) {
      setError('Please select your birth year');
      AccessibilityInfo.announceForAccessibility('Error: Please select your birth year');
      return;
    }

    // Validate all four consents accepted
    if (!allConsentsTicked) {
      setError('Please accept all four consent items to continue');
      AccessibilityInfo.announceForAccessibility('Error: Please accept all four consent items');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { eligible, age } = await verifyAge(selectedYear);

      if (eligible) {
        // Persist the four legal-gate consents for OnboardingScreen to merge
        // into the ConsentRecord at grant time (GDPR Art. 7(1) record requirement)
        await recordLegalGateConsents({
          tosAccepted,
          privacyAccepted,
          wellnessDisclaimerAcknowledged,
          mentalHealthProcessingConsent: mentalHealthProcessingConsented,
        });
        AccessibilityInfo.announceForAccessibility('Verification complete. Proceeding to app.');
        onComplete();
      } else {
        setShowUnderAge(true);
        AccessibilityInfo.announceForAccessibility(
          `We're sorry. Being is available for ages 18 and older. You appear to be ${age} years old. Crisis resources are available if you need support.`
        );
        onUnderAge();
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      AccessibilityInfo.announceForAccessibility('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedYear,
    allConsentsTicked,
    tosAccepted,
    privacyAccepted,
    wellnessDisclaimerAcknowledged,
    mentalHealthProcessingConsented,
    verifyAge,
    onComplete,
    onUnderAge,
  ]);

  const handleCall988 = () => {
    Linking.openURL('tel:988');
  };

  const handleTextCrisis = () => {
    Linking.openURL('sms:741741?body=HELLO');
  };

  const handleReEnterAge = useCallback(() => {
    // Audit trail: re-entry from the under-age screen. Compliance per DEBUG-150
    // — captures "gate was invoked and re-entered, not bypassed invisibly."
    logSecurity('age_re_entry', 'low', {
      component: 'CombinedLegalGateScreen',
      action: 'under_age_back',
      result: 'success',
    });
    setShowUnderAge(false);
    setSelectedYear(null);
    setError(null);
    AccessibilityInfo.announceForAccessibility('Returned to birth year selection.');
  }, []);

  // Under-age screen with crisis resources
  if (showUnderAge) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Being is for ages 18+</Text>
            <Text style={styles.subtitle}>
              We hope to support you when you're older.{'\n'}
              If you're going through a difficult time right now, the resources below are available to you 24/7.
            </Text>
          </View>

          <View style={styles.crisisSection}>
            <Text style={styles.crisisSectionTitle}>Need Support Now?</Text>
            <Text style={styles.crisisDescription}>
              If you're going through a difficult time, these resources are here for you:
            </Text>

            <Pressable
              style={styles.crisisButton}
              onPress={handleCall988}
              accessibilityRole="button"
              accessibilityLabel="Call 988 Suicide and Crisis Lifeline"
              accessibilityHint="Opens phone dialer to call 988"
            >
              <Text style={styles.crisisButtonText}>Call 988</Text>
              <Text style={styles.crisisButtonSubtext}>Suicide & Crisis Lifeline (24/7)</Text>
            </Pressable>

            <Pressable
              style={styles.crisisButtonSecondary}
              onPress={handleTextCrisis}
              accessibilityRole="button"
              accessibilityLabel="Text HOME to 741741"
              accessibilityHint="Opens text message to Crisis Text Line"
            >
              <Text style={styles.crisisButtonSecondaryText}>Text HOME to 741741</Text>
              <Text style={styles.crisisButtonSubtextSecondary}>Crisis Text Line (24/7)</Text>
            </Pressable>
          </View>

          <View style={styles.resourcesSection}>
            <Text style={styles.resourcesTitle}>More Resources</Text>
            <Pressable
              onPress={() => Linking.openURL('https://www.childmind.org')}
              accessibilityRole="link"
              accessibilityLabel="Child Mind Institute"
              accessibilityHint="Opens external website in browser"
            >
              <Text style={styles.linkText}>Child Mind Institute</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://teenmentalhealth.org')}
              accessibilityRole="link"
              accessibilityLabel="Teen Mental Health"
              accessibilityHint="Opens external website in browser"
            >
              <Text style={styles.linkText}>Teen Mental Health</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.reEnterAgeButton}
            onPress={handleReEnterAge}
            accessibilityRole="button"
            accessibilityLabel="Re-enter birth year"
            accessibilityHint="Returns to the birth year selection screen"
          >
            <Text style={styles.reEnterAgeButtonText}>Re-enter birth year</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Being</Text>
          <Text style={styles.subtitle}>
            Before we begin, we need a few quick confirmations.
          </Text>
        </View>

        {/* Age Verification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Age Verification</Text>
          <Text style={styles.sectionDescription}>
            What year were you born?
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedYear}
              onValueChange={(value: number | null) => {
                setSelectedYear(value);
                setError(null);
              }}
              style={styles.picker}
              accessibilityLabel="Select your birth year"
            >
              <Picker.Item label="Select year..." value={null} color={colorSystem.gray[400]} />
              {years.map((year) => (
                <Picker.Item
                  key={year}
                  label={year.toString()}
                  value={year}
                  color={colorSystem.base.black}
                />
              ))}
            </Picker>
          </View>
          <Text style={styles.helperText}>
            We use your age only to confirm eligibility. Being is for adults 18 and older.
          </Text>
        </View>

        {/* Legal Agreement Section — four separate explicit consents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Your Consent</Text>
          <Text style={styles.sectionDescription}>
            Please review and accept each item separately:
          </Text>

          {/* 1. Terms of Service */}
          <Pressable
            style={[styles.checkbox, tosAccepted && styles.checkboxChecked]}
            onPress={() => {
              setTosAccepted(!tosAccepted);
              setError(null);
            }}
            testID="legal-consent-tos"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: tosAccepted }}
            accessibilityLabel="I agree to the Terms of Service"
          >
            <View style={styles.checkboxIndicator}>
              {tosAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the <Text style={styles.checkboxLink} onPress={() => Linking.openURL('https://being.fyi/terms')}>Terms of Service</Text>.
            </Text>
          </Pressable>

          {/* 2. Privacy Policy */}
          <Pressable
            style={[styles.checkbox, privacyAccepted && styles.checkboxChecked, styles.checkboxStacked]}
            onPress={() => {
              setPrivacyAccepted(!privacyAccepted);
              setError(null);
            }}
            testID="legal-consent-privacy"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: privacyAccepted }}
            accessibilityLabel="I agree to the Privacy Policy"
          >
            <View style={styles.checkboxIndicator}>
              {privacyAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I agree to the <Text style={styles.checkboxLink} onPress={() => Linking.openURL('https://being.fyi/privacy')}>Privacy Policy</Text>.
            </Text>
          </Pressable>

          {/* 3. Wellness Disclaimer */}
          <Pressable
            style={[styles.checkbox, wellnessDisclaimerAcknowledged && styles.checkboxChecked, styles.checkboxStacked]}
            onPress={() => {
              setWellnessDisclaimerAcknowledged(!wellnessDisclaimerAcknowledged);
              setError(null);
            }}
            testID="legal-consent-wellness"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: wellnessDisclaimerAcknowledged }}
            accessibilityLabel="I understand Being provides wellness support, not medical care, and in a crisis I will call 911 or 988"
          >
            <View style={styles.checkboxIndicator}>
              {wellnessDisclaimerAcknowledged && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I understand Being provides wellness support, not medical care. In a crisis I will call 911 (emergency) or 988 (mental health crisis).
            </Text>
          </Pressable>

          {/* 4. GDPR Art. 9(2)(a) explicit consent for mental-health data processing */}
          <Pressable
            style={[styles.checkbox, mentalHealthProcessingConsented && styles.checkboxChecked, styles.checkboxStacked]}
            onPress={() => {
              setMentalHealthProcessingConsented(!mentalHealthProcessingConsented);
              setError(null);
            }}
            testID="legal-consent-mh-processing"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: mentalHealthProcessingConsented }}
            accessibilityLabel="I explicitly consent to Being processing my personal wellness data including mood check-ins, anxiety and depression self-screenings, and journal entries, to provide wellness support features"
          >
            <View style={styles.checkboxIndicator}>
              {mentalHealthProcessingConsented && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I explicitly consent to Being processing my personal wellness data — including mood check-ins, anxiety and depression self-screenings, and journal entries — to provide wellness support features.
            </Text>
          </Pressable>
        </View>

        {/* Essential Services Info */}
        <View style={styles.essentialSection}>
          <Text style={styles.essentialTitle}>Essential Services (always on)</Text>
          <Text style={styles.essentialItem}>• App functionality</Text>
          <Text style={styles.essentialItem}>• Crisis resources (988)</Text>
          <Text style={styles.essentialItem}>• Local data storage</Text>
          <Text style={styles.essentialNote}>
            You'll choose what else to share after experiencing the app.
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Continue Button */}
        <Pressable
          style={[
            styles.continueButton,
            (!selectedYear || !allConsentsTicked || isLoading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedYear || !allConsentsTicked || isLoading}
          testID="legal-gate-continue"
          accessibilityRole="button"
          accessibilityLabel="Continue"
          accessibilityState={{ disabled: !selectedYear || !allConsentsTicked || isLoading }}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Verifying...' : 'Continue'}
          </Text>
        </Pressable>

        {/* Crisis Resources - Always Visible */}
        <View style={styles.crisisFooter}>
          <Text style={styles.crisisFooterTitle}>Need support now?</Text>
          <View style={styles.crisisFooterButtons}>
            <Pressable
              style={styles.crisisFooterButton}
              onPress={handleCall988}
              accessibilityRole="button"
              accessibilityLabel="Call 988"
            >
              <Text style={styles.crisisFooterButtonText}>988 Lifeline</Text>
            </Pressable>
            <Pressable
              style={styles.crisisFooterButton}
              onPress={handleTextCrisis}
              accessibilityRole="button"
              accessibilityLabel="Text Crisis Line"
            >
              <Text style={styles.crisisFooterButtonText}>Text 741741</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: spacing[24],
  },
  section: {
    marginBottom: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  sectionDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    marginBottom: spacing[16],
  },
  pickerContainer: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    overflow: 'hidden',
  },
  picker: {
    height: 150,
  },
  helperText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[500],
    marginTop: spacing[8],
    fontStyle: 'italic',
  },
  checkbox: {
    flexDirection: 'row',
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    padding: spacing[24],
    borderWidth: 2,
    borderColor: colorSystem.gray[200],
    minHeight: 56,
  },
  checkboxStacked: {
    marginTop: spacing[16],
  },
  checkboxChecked: {
    borderColor: colorSystem.base.midnightBlue,
    backgroundColor: '#F0F4FF',
  },
  checkboxLink: {
    color: colorSystem.base.midnightBlue,
    textDecorationLine: 'underline',
    fontWeight: typography.fontWeight.medium,
  },
  checkboxIndicator: {
    width: spacing[24],
    height: spacing[24],
    borderRadius: borderRadius.small,
    borderWidth: 2,
    borderColor: colorSystem.gray[400],
    marginRight: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorSystem.base.white,
  },
  checkboxCheck: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
  },
  checkboxText: {
    flex: 1,
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[16],
    gap: spacing[24],
  },
  linkText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.midnightBlue,
    textDecorationLine: 'underline',
  },
  essentialSection: {
    backgroundColor: '#FAFAFA',
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[24],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  essentialTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[500],
    marginBottom: spacing[8],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  essentialItem: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: spacing[24],
  },
  essentialNote: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[500],
    marginTop: spacing[16],
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  errorText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.status.error,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    minHeight: 56,
    marginBottom: spacing[24],
  },
  continueButtonDisabled: {
    backgroundColor: colorSystem.gray[400],
  },
  continueButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  crisisFooter: {
    alignItems: 'center',
    paddingTop: spacing[16],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  crisisFooterTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[500],
    marginBottom: spacing[8],
  },
  crisisFooterButtons: {
    flexDirection: 'row',
    gap: spacing[16],
  },
  crisisFooterButton: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.status.critical,
  },
  crisisFooterButtonText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.status.critical,
  },
  // Under-age screen styles
  crisisSection: {
    marginBottom: spacing[32],
  },
  crisisSectionTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  crisisDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing[24],
  },
  crisisButton: {
    backgroundColor: colorSystem.status.critical,
    paddingVertical: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginBottom: spacing[16],
    minHeight: 72,
  },
  crisisButtonText: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.white,
  },
  crisisButtonSubtext: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.base.white,
    marginTop: spacing[4],
  },
  crisisButtonSecondary: {
    backgroundColor: colorSystem.base.white,
    paddingVertical: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colorSystem.status.critical,
    minHeight: 72,
  },
  crisisButtonSecondaryText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.status.critical,
  },
  crisisButtonSubtextSecondary: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    marginTop: spacing[4],
  },
  resourcesSection: {
    marginTop: spacing[24],
    padding: spacing[24],
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
  },
  resourcesTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[16],
  },
  reEnterAgeButton: {
    marginTop: spacing[24],
    paddingVertical: spacing[16],
    alignItems: 'center',
    minHeight: 44,
  },
  reEnterAgeButtonText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[600],
    textDecorationLine: 'underline',
  },
});

export default CombinedLegalGateScreen;
