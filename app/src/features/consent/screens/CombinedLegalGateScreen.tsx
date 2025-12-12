/**
 * COMBINED LEGAL GATE SCREEN
 * Consolidates age verification + ToS acceptance into one screen
 *
 * COMPLIANCE:
 * - COPPA: Age verification BEFORE any data collection
 * - ToS: Legal agreement separate from granular consent
 * - Crisis resources visible to ALL users (not just under-13)
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
import { useConsentStore } from '@/core/stores/consentStore';
import { commonColors, spacing, borderRadius, typography } from '@/core/theme';

interface CombinedLegalGateScreenProps {
  /** Called when user passes legal gate (age verified + ToS accepted) */
  onComplete: () => void;
  /** Called when user is under 13 */
  onUnderAge: () => void;
}

const CombinedLegalGateScreen: React.FC<CombinedLegalGateScreenProps> = ({
  onComplete,
  onUnderAge,
}) => {
  const { verifyAge } = useConsentStore();

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnderAge, setShowUnderAge] = useState(false);

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

    // Validate ToS accepted
    if (!tosAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy');
      AccessibilityInfo.announceForAccessibility('Error: Please accept the Terms of Service');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { eligible, age } = await verifyAge(selectedYear);

      if (eligible) {
        AccessibilityInfo.announceForAccessibility('Verification complete. Proceeding to app.');
        onComplete();
      } else {
        setShowUnderAge(true);
        AccessibilityInfo.announceForAccessibility(
          `We're sorry. Being is available for ages 13 and older. You appear to be ${age} years old. Crisis resources are available if you need support.`
        );
        onUnderAge();
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      AccessibilityInfo.announceForAccessibility('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, tosAccepted, verifyAge, onComplete, onUnderAge]);

  const handleCall988 = () => {
    Linking.openURL('tel:988');
  };

  const handleTextCrisis = () => {
    Linking.openURL('sms:741741?body=HELLO');
  };

  // Under-age screen with crisis resources
  if (showUnderAge) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>We're Sorry</Text>
            <Text style={styles.subtitle}>
              Being is designed for ages 13 and older.{'\n'}
              If you're under 13, please talk to a parent or trusted adult about your feelings.
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
            <Text style={styles.resourcesTitle}>Resources for Young People</Text>
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
              <Picker.Item label="Select year..." value={null} color={commonColors.gray400} />
              {years.map((year) => (
                <Picker.Item
                  key={year}
                  label={year.toString()}
                  value={year}
                  color={commonColors.black}
                />
              ))}
            </Picker>
          </View>
          <Text style={styles.helperText}>
            We ask this to comply with privacy laws protecting children's data.
          </Text>
        </View>

        {/* Legal Agreement Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Legal Agreement</Text>
          <Pressable
            style={[styles.checkbox, tosAccepted && styles.checkboxChecked]}
            onPress={() => {
              setTosAccepted(!tosAccepted);
              setError(null);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: tosAccepted }}
            accessibilityLabel="Terms of Service and Privacy Policy agreement"
          >
            <View style={styles.checkboxIndicator}>
              {tosAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>
              I confirm:{'\n'}
              • I am 13 or older (or have parental permission if under 18){'\n'}
              • I agree to the Terms of Service and Privacy Policy{'\n'}
              • I understand this app provides wellness support, not medical care{'\n'}
              • In a crisis, I should call 911 (emergency) or 988 (mental health crisis)
            </Text>
          </Pressable>

          <View style={styles.linkRow}>
            <Pressable
              onPress={() => Linking.openURL('https://being.fyi/terms')}
              accessibilityRole="link"
            >
              <Text style={styles.linkText}>View Terms</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://being.fyi/privacy')}
              accessibilityRole="link"
            >
              <Text style={styles.linkText}>View Privacy Policy</Text>
            </Pressable>
          </View>
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
            (!selectedYear || !tosAccepted || isLoading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedYear || !tosAccepted || isLoading}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          accessibilityState={{ disabled: !selectedYear || !tosAccepted || isLoading }}
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
    lineHeight: spacing[24],
  },
  section: {
    marginBottom: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
    marginBottom: spacing[8],
  },
  sectionDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    marginBottom: spacing[16],
  },
  pickerContainer: {
    backgroundColor: commonColors.gray100,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: commonColors.gray200,
    overflow: 'hidden',
  },
  picker: {
    height: 150,
  },
  helperText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray500,
    marginTop: spacing[8],
    fontStyle: 'italic',
  },
  checkbox: {
    flexDirection: 'row',
    backgroundColor: commonColors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    borderWidth: 2,
    borderColor: commonColors.gray200,
    minHeight: 56,
  },
  checkboxChecked: {
    borderColor: commonColors.midnightBlue,
    backgroundColor: '#F0F4FF',
  },
  checkboxIndicator: {
    width: spacing[24],
    height: spacing[24],
    borderRadius: borderRadius.small,
    borderWidth: 2,
    borderColor: commonColors.gray400,
    marginRight: spacing[16],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: commonColors.white,
  },
  checkboxCheck: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold,
    color: commonColors.midnightBlue,
  },
  checkboxText: {
    flex: 1,
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
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
    color: commonColors.midnightBlue,
    textDecorationLine: 'underline',
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
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: spacing[24],
  },
  essentialNote: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray500,
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
    color: commonColors.error,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: commonColors.midnightBlue,
    paddingVertical: spacing[16],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    minHeight: 56,
    marginBottom: spacing[24],
  },
  continueButtonDisabled: {
    backgroundColor: commonColors.gray400,
  },
  continueButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.white,
  },
  crisisFooter: {
    alignItems: 'center',
    paddingTop: spacing[16],
    borderTopWidth: 1,
    borderTopColor: commonColors.gray200,
  },
  crisisFooterTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: commonColors.gray500,
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
    borderColor: commonColors.crisis,
  },
  crisisFooterButtonText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.crisis,
  },
  // Under-age screen styles
  crisisSection: {
    marginBottom: spacing[32],
  },
  crisisSectionTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  crisisDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    textAlign: 'center',
    marginBottom: spacing[24],
  },
  crisisButton: {
    backgroundColor: commonColors.crisis,
    paddingVertical: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginBottom: spacing[16],
    minHeight: 72,
  },
  crisisButtonText: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.bold,
    color: commonColors.white,
  },
  crisisButtonSubtext: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.white,
    marginTop: spacing[4],
  },
  crisisButtonSecondary: {
    backgroundColor: commonColors.white,
    paddingVertical: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: commonColors.crisis,
    minHeight: 72,
  },
  crisisButtonSecondaryText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.crisis,
  },
  crisisButtonSubtextSecondary: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    marginTop: spacing[4],
  },
  resourcesSection: {
    marginTop: spacing[24],
    padding: spacing[24],
    backgroundColor: commonColors.gray100,
    borderRadius: borderRadius.large,
  },
  resourcesTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
    marginBottom: spacing[16],
  },
});

export default CombinedLegalGateScreen;
