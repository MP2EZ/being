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

// Hardcoded colors - consistent with ProfileScreen
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
  error: '#EF4444',
  warning: '#F59E0B',
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
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
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  dangerTitle: {
    color: colors.error,
  },
  infoCard: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  infoCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray500,
    marginBottom: spacing.sm,
  },
  infoCardValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 4,
  },
  infoCardNote: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.warning,
    fontStyle: 'italic',
  },
  actionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  actionCardDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
  },
  actionCardArrow: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.midnightBlue,
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  dangerCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  dangerCardDisabled: {
    opacity: 0.6,
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
    borderLeftColor: colors.gray400,
  },
  dangerCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.sm,
  },
  dangerCardDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  confirmationBox: {
    marginVertical: spacing.md,
  },
  confirmationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    marginBottom: spacing.sm,
  },
  confirmationInput: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gray300,
    padding: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  infoBox: {
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.midnightBlue,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    lineHeight: 20,
  },
  todoBox: {
    backgroundColor: colors.gray100,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  todoText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.midnightBlue,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  dangerButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AccountSettingsScreen;
