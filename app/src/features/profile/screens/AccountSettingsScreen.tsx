/**
 * ACCOUNT SETTINGS SCREEN
 * Account information + an honest disclosure of forthcoming data rights.
 *
 * Self-service controls (change password, logout, data export, account
 * deletion) are not yet implemented. Rather than ship tappable controls that
 * only error, this screen shows account info and one honest, non-interactive
 * row signalling that export and deletion are coming.
 *
 * COMPLIANCE:
 * - Data export and account deletion are user data rights (CCPA §1798.100
 *   access, §1798.105 deletion). The data-rights row names them as forthcoming
 *   so their absence reads as a timing gap, not a policy retreat (FEAT-203 §5.2).
 *   Interim request mechanism is documented in the privacy policy, not in-app.
 * - Terminology: "wellness data", never "PHI". No encryption claims about
 *   export until FEAT-29 defines the export format.
 *
 * FUTURE WORK (each reimplements its own first-class control here):
 * - FEAT-16 change password · FEAT-58 logout
 * - FEAT-29 data export · FEAT-59 account deletion (with grace period)
 *
 * ACCESSIBILITY:
 * - WCAG AA; the data-rights row is informational text (accessibilityRole
 *   "text"), not a button, and carries no tappable affordance.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUserEmail, getUserCreatedAt, isDevMode } from '@/core/constants/devMode';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

// FEAT-212: rendered as a route on ProfileStackNavigator; the native stack header
// supplies the back chevron (SubMenuHeader's ✕ removed).

const DATA_RIGHTS_TITLE = 'Your data rights';
const DATA_RIGHTS_DESCRIPTION =
  'Data export and account deletion are coming soon. You have the right to access and delete your personal wellness data.';

const AccountSettingsScreen: React.FC = () => {
  // MVP: Use dev mode utilities for user information
  // V2 (FEAT-16): Replace with actual auth service
  const userEmail = getCurrentUserEmail();
  const userCreatedAt = getUserCreatedAt();
  const devMode = isDevMode();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Account Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>Email</Text>
            <Text style={styles.infoCardValue}>{userEmail}</Text>
            {devMode && (
              <Text style={styles.infoCardNote}>
                ⚠️ Development Mode - Single user only
              </Text>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>Member Since</Text>
            <Text style={styles.infoCardValue}>
              {userCreatedAt.toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Data rights — honest, non-interactive disclosure (FEAT-210). */}
        <View style={styles.section}>
          <View
            style={styles.dataRightsCard}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${DATA_RIGHTS_TITLE}. ${DATA_RIGHTS_DESCRIPTION}`}
          >
            <Text style={styles.dataRightsTitle}>{DATA_RIGHTS_TITLE}</Text>
            <Text style={styles.dataRightsDescription}>{DATA_RIGHTS_DESCRIPTION}</Text>
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
  section: {
    marginBottom: spacing[32],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  infoCard: {
    backgroundColor: colorSystem.gray[100],
    // MAINT-222: unified content-card radius (xl=16)
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    marginBottom: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  infoCardLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[500],
    marginBottom: spacing[8],
  },
  infoCardValue: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: 4,
  },
  infoCardNote: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.status.warning,
    fontStyle: 'italic',
  },
  dataRightsCard: {
    backgroundColor: colorSystem.gray[100],
    // MAINT-222: unified content-card radius (xl=16)
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.base.midnightBlue,
  },
  dataRightsTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  dataRightsDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
});

export default AccountSettingsScreen;
