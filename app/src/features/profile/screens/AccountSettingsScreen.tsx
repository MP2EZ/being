/**
 * ACCOUNT SETTINGS SCREEN
 * Account management: email, password, logout, deletion
 *
 * BLOCKED (FEAT-6 Open Questions):
 * - Authentication integration - how to get current user?
 * - Account deletion flow - app store compliance requirements
 * - Data export requirements
 *
 * COMPLIANCE:
 * - Account deletion must be app store compliant
 * - Data export for HIPAA compliance (right to access)
 * - Clear explanation of what gets deleted
 * - Confirmation flow for destructive actions
 *
 * SECURITY:
 * - Logout must clear sensitive data
 * - Account deletion must be irreversible with confirmation
 * - No credentials displayed
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader support
 * - Clear warnings for destructive actions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentUserEmail, getUserCreatedAt, isDevMode } from '@/core/constants/devMode';
import { colors as dsColors, spacing, borderRadius, typography } from '@/core/theme/colors';

// Local colors for easier reference
const localColors = {
  white: dsColors.base.white,
  black: dsColors.base.black,
  gray100: dsColors.gray[100],
  gray200: dsColors.gray[200],
  gray300: dsColors.gray[300],
  gray400: dsColors.gray[400],
  gray500: dsColors.gray[500],
  gray600: dsColors.gray[600],
  midnightBlue: dsColors.themes.morning.primary,
  error: dsColors.status.error,
  warning: dsColors.status.warning,
};

interface AccountSettingsScreenProps {
  onReturn: () => void;
}

const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({ onReturn }) => {
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // MVP: Use dev mode utilities for user information
  // V2 (FEAT-16): Replace with actual auth service
  const userEmail = getCurrentUserEmail();
  const userCreatedAt = getUserCreatedAt();
  const devMode = isDevMode();

  const handleChangePassword = () => {
    // MVP: Disabled until FEAT-16 (authentication) ships
    Alert.alert(
      'Feature Not Available',
      '⚠️ Development Mode\n\nPassword change requires authentication system (FEAT-16). This feature will be available in V2.',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    // MVP: Disabled until FEAT-58 (logout flow) ships
    Alert.alert(
      'Feature Not Available',
      '⚠️ Development Mode\n\nLogout requires authentication system (FEAT-16) and logout flow (FEAT-58). This feature will be available in V2.',
      [{ text: 'OK' }]
    );
  };

  const handleExportData = () => {
    // MVP: Disabled until FEAT-29 (export & sharing) ships
    Alert.alert(
      'Feature Not Available',
      '⚠️ Development Mode\n\nData export is blocked by FEAT-29 (Export & Sharing). This feature has been validated and will use client-side PDF generation to comply with HIPAA requirements.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    // MVP: Disabled until FEAT-59 (account deletion with grace period) ships
    Alert.alert(
      'Feature Not Available',
      '⚠️ Development Mode\n\nAccount deletion is blocked by FEAT-59 (Account Deletion with Grace Period). This feature will include:\n\n• 30-day recovery period\n• App store compliance\n• Pre-deletion data export\n• Full HIPAA compliance\n\nThis feature will be available in V2.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Account Settings</Text>
          <Text style={styles.subtitle}>
            Manage your account details and security
          </Text>
        </View>

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

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <Pressable style={[styles.actionCard, styles.actionCardDisabled]} onPress={handleChangePassword}>
            <View>
              <Text style={styles.actionCardTitle}>Change Password</Text>
              <Text style={styles.actionCardDescription}>
                Update your account password (Requires FEAT-16)
              </Text>
            </View>
            <Text style={styles.actionCardArrow}>🔒</Text>
          </Pressable>

          <Pressable style={[styles.actionCard, styles.actionCardDisabled]} onPress={handleLogout}>
            <View>
              <Text style={styles.actionCardTitle}>Logout</Text>
              <Text style={styles.actionCardDescription}>
                Sign out of your account (Requires FEAT-58)
              </Text>
            </View>
            <Text style={styles.actionCardArrow}>🔒</Text>
          </Pressable>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <Pressable style={[styles.actionCard, styles.actionCardDisabled]} onPress={handleExportData}>
            <View>
              <Text style={styles.actionCardTitle}>Export Your Data</Text>
              <Text style={styles.actionCardDescription}>
                Download all your therapeutic data (Requires FEAT-29)
              </Text>
            </View>
            <Text style={styles.actionCardArrow}>🔒</Text>
          </Pressable>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📦 Your data export will include: check-in responses, therapeutic values, settings, and progress history. All data is encrypted for your privacy.
            </Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <Text style={styles.sectionDescription}>
            ⚠️ Irreversible actions - proceed with caution
          </Text>

          <View style={[styles.dangerCard, styles.dangerCardDisabled]}>
            <Text style={styles.dangerCardTitle}>Delete Account</Text>
            <Text style={styles.dangerCardDescription}>
              ⚠️ Feature disabled in MVP - Requires FEAT-59 (Account Deletion with Grace Period)
            </Text>
            <Text style={styles.dangerCardDescription}>
              V2 will include: 30-day recovery period, app store compliance, pre-deletion data export.
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Before deleting: Consider exporting your data first. Account deletion is permanent and cannot be reversed.
            </Text>
          </View>
        </View>

        {/* Return Button */}
        <View style={styles.actionContainer}>
          <Pressable style={styles.primaryButton} onPress={onReturn}>
            <Text style={styles.primaryButtonText}>Return to Profile</Text>
          </Pressable>
        </View>

        {/* Implementation Notice */}
        <View style={styles.todoBox}>
          <Text style={styles.todoTitle}>🚧 Implementation Status</Text>
          <Text style={styles.todoText}>
            This screen is a UI shell. The following integrations are pending:
          </Text>
          <Text style={styles.todoText}>
            • Authentication service (user ID, email, credentials){'\n'}
            • Password change flow{'\n'}
            • Logout functionality (clear tokens, navigate to login){'\n'}
            • Data export (gather data, encrypt, offer download){'\n'}
            • Account deletion (compliance validation, grace period)
          </Text>
          <Text style={styles.todoText}>
            See FEAT-6-ARCHITECTURE.md for open questions and integration plan.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: localColors.white,
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
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: localColors.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  dangerTitle: {
    color: localColors.error,
  },
  infoCard: {
    backgroundColor: localColors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: localColors.gray200,
  },
  infoCardLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.gray500,
    marginBottom: spacing.sm,
  },
  infoCardValue: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: 4,
  },
  infoCardNote: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.warning,
    fontStyle: 'italic',
  },
  actionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: localColors.gray100,
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: localColors.gray200,
  },
  actionCardTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing.sm,
  },
  actionCardDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    lineHeight: 20,
  },
  actionCardArrow: {
    fontSize: 24,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.midnightBlue,
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  dangerCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: localColors.error,
  },
  dangerCardDisabled: {
    opacity: 0.6,
    backgroundColor: localColors.gray100,
    borderColor: localColors.gray300,
    borderLeftColor: localColors.gray400,
  },
  dangerCardTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.error,
    marginBottom: spacing.sm,
  },
  dangerCardDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  confirmationBox: {
    marginVertical: spacing.md,
  },
  confirmationLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.gray600,
    marginBottom: spacing.sm,
  },
  confirmationInput: {
    backgroundColor: localColors.white,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: localColors.gray300,
    padding: spacing.md,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
  },
  infoBox: {
    backgroundColor: '#F0F4FF',
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: localColors.midnightBlue,
  },
  infoText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: localColors.warning,
  },
  warningText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: '#92400E',
    lineHeight: 20,
  },
  todoBox: {
    backgroundColor: localColors.gray100,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: localColors.warning,
  },
  todoTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.black,
    marginBottom: spacing.sm,
  },
  todoText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: localColors.gray600,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: localColors.midnightBlue,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.white,
  },
  dangerButton: {
    backgroundColor: localColors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.large,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: localColors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AccountSettingsScreen;
