/**
 * AGE VERIFICATION SCREEN
 * COPPA compliance: Verify user is 13+ before any data collection
 *
 * COMPLIANCE:
 * - Age gate appears BEFORE onboarding (no data collection until verified)
 * - Users under 13 are blocked with crisis resources still available
 * - Birth year stored (not full DOB) for privacy
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Touch targets 44px minimum
 * - Screen reader support
 * - Clear error messaging
 *
 * CRITICAL:
 * - Crisis resources (988) shown to under-13 users
 * - No skip option (compliance requirement)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useConsentStore } from '@/core/stores/consentStore';
import { commonColors, spacing, borderRadius, typography } from '@/core/theme';

interface AgeVerificationScreenProps {
  onVerified: () => void;
  onUnderAge: () => void;
}

const AgeVerificationScreen: React.FC<AgeVerificationScreenProps> = ({
  onVerified,
  onUnderAge,
}) => {
  const { verifyAge } = useConsentStore();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showUnderAge, setShowUnderAge] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate year options (100 years back from current year)
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const handleContinue = async () => {
    if (!selectedYear) {
      setError('Please select your birth year');
      AccessibilityInfo.announceForAccessibility('Error: Please select your birth year');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { eligible, age } = await verifyAge(selectedYear);

      if (eligible) {
        AccessibilityInfo.announceForAccessibility('Age verified. Proceeding to app.');
        onVerified();
      } else {
        setShowUnderAge(true);
        AccessibilityInfo.announceForAccessibility(
          'We are sorry. Being is available for ages 13 and older. Crisis resources are available.'
        );
        onUnderAge();
      }
    } catch (err) {
      setError('Failed to verify age. Please try again.');
      AccessibilityInfo.announceForAccessibility('Error: Failed to verify age. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCall988 = () => {
    Linking.openURL('tel:988');
  };

  const handleTextCrisisLine = () => {
    Linking.openURL('sms:741741?body=HOME');
  };

  // Under 13 screen with crisis resources
  if (showUnderAge) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              We're Sorry
            </Text>
            <Text style={styles.subtitle}>
              Being is currently available for ages 13 and older.
            </Text>
          </View>

          {/* Crisis Resources - ALWAYS AVAILABLE */}
          <View style={styles.crisisSection}>
            <Text style={styles.crisisTitle}>
              If you're experiencing a crisis:
            </Text>

            <Pressable
              style={styles.crisisButton}
              onPress={handleCall988}
              accessibilityRole="button"
              accessibilityLabel="Call 988 Suicide and Crisis Lifeline"
              accessibilityHint="Opens phone dialer to call 988"
            >
              <Text style={styles.crisisButtonText}>Call 988</Text>
              <Text style={styles.crisisButtonSubtext}>
                Suicide & Crisis Lifeline
              </Text>
            </Pressable>

            <Pressable
              style={styles.crisisButtonSecondary}
              onPress={handleTextCrisisLine}
              accessibilityRole="button"
              accessibilityLabel="Text HOME to 741741 Crisis Text Line"
              accessibilityHint="Opens messaging app to text Crisis Text Line"
            >
              <Text style={styles.crisisButtonSecondaryText}>
                Text HOME to 741741
              </Text>
              <Text style={styles.crisisButtonSecondarySubtext}>
                Crisis Text Line
              </Text>
            </Pressable>
          </View>

          {/* Resources for parents */}
          <View style={styles.parentSection}>
            <Text style={styles.parentTitle}>For Parents & Guardians</Text>
            <Text style={styles.parentText}>
              If you're looking for mental health resources for children and teens,
              we recommend:
            </Text>
            <Pressable
              onPress={() => Linking.openURL('https://www.childmind.org')}
              accessibilityRole="link"
            >
              <Text style={styles.linkText}>Child Mind Institute</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL('https://teenmentalhealth.org')}
              accessibilityRole="link"
            >
              <Text style={styles.linkText}>Teen Mental Health</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Age verification form
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Welcome to Being
          </Text>
          <Text style={styles.subtitle}>
            Before we begin, we need to confirm you're eligible to use this app.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.questionLabel} accessibilityRole="text">
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
              accessibilityHint="Scroll to select the year you were born"
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

          {error && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <View style={styles.privacyNote}>
            <Text style={styles.privacyNoteText}>
              We ask this to comply with privacy laws protecting children's data.
              Your birth year is stored securely and never shared.
            </Text>
          </View>
        </View>

        <Pressable
          style={[
            styles.continueButton,
            (!selectedYear || isVerifying) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedYear || isVerifying}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          accessibilityState={{ disabled: !selectedYear || isVerifying }}
        >
          <Text style={styles.continueButtonText}>
            {isVerifying ? 'Verifying...' : 'Continue'}
          </Text>
        </Pressable>
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
  header: {
    marginBottom: spacing[32],
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
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    textAlign: 'center',
    lineHeight: 26,
  },
  formSection: {
    marginBottom: spacing[32],
  },
  questionLabel: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
    marginBottom: spacing[16],
    textAlign: 'center',
  },
  pickerContainer: {
    backgroundColor: commonColors.gray100,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: commonColors.gray200,
    marginBottom: spacing[16],
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 50,
    width: '100%',
  },
  errorText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: commonColors.error,
    textAlign: 'center',
    marginBottom: spacing[16],
  },
  privacyNote: {
    backgroundColor: commonColors.gray100,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginTop: spacing[8],
  },
  privacyNoteText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: 20,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: commonColors.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    minHeight: 56, // 44px + padding for touch target
  },
  continueButtonDisabled: {
    backgroundColor: commonColors.gray400,
  },
  continueButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.white,
  },
  // Under age screen styles
  crisisSection: {
    marginBottom: spacing[32],
  },
  crisisTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
    marginBottom: spacing[24],
    textAlign: 'center',
  },
  crisisButton: {
    backgroundColor: commonColors.crisis,
    paddingVertical: spacing[24],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginBottom: spacing[16],
    minHeight: 72, // Large touch target for crisis
  },
  crisisButtonText: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.bold,
    color: commonColors.white,
  },
  crisisButtonSubtext: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: commonColors.white,
    opacity: 0.9,
    marginTop: spacing[4],
  },
  crisisButtonSecondary: {
    backgroundColor: commonColors.white,
    paddingVertical: spacing[24],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: commonColors.crisis,
    minHeight: 72,
  },
  crisisButtonSecondaryText: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.crisis,
  },
  crisisButtonSecondarySubtext: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: commonColors.gray600,
    marginTop: spacing[4],
  },
  parentSection: {
    marginTop: spacing[24],
    padding: spacing[24],
    backgroundColor: commonColors.gray100,
    borderRadius: borderRadius.large,
  },
  parentTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
    marginBottom: spacing[8],
  },
  parentText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: commonColors.gray600,
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  linkText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: commonColors.midnightBlue,
    textDecorationLine: 'underline',
    marginBottom: spacing[8],
  },
});

export default AgeVerificationScreen;
