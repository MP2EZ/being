/**
 * Cloud Backup Settings Component
 *
 * FEATURES:
 * - Backup status display
 * - Manual sync controls
 * - Configuration options (auto-backup, compression)
 * - Error handling and recovery
 * - Restore prompt for same-device recovery
 *
 * SCOPE (MAINT-173):
 * - Analytics consent + data-rights controls were removed from this surface.
 *   Analytics consent lives in PrivacyDataScreen (the single authoritative
 *   consent surface); a second toggle here bypassed the consent store and
 *   the "Delete Analytics Data" control was a non-functional stub.
 * - Cloud-sync consent is enforced in the service layer (CloudBackupService),
 *   so these controls operate only when the user has consented.
 *
 * ACCESSIBILITY:
 * - Screen reader support (button roles + labels)
 * - Large touch targets (≥44pt)
 * - Clear error messaging
 *
 * PERFORMANCE:
 * - Non-blocking operations
 * - Loading states
 */


import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  useCloudSync,
  useCloudBackupConfig,
  type BackupResult,
  type ConnectivityResult,
  type RestoreResult,
} from '@/core/services/supabase/hooks/useCloudSync';
import { colorSystem, spacing, borderRadius, typography, semantic } from '@/core/theme';

// DEBUG-767: plain-language copy for each connection-test outcome. Raw error strings and codes
// never reach the user. Since DEBUG-783 a success means a real authenticated round-trip, so the
// copy may claim reachability, but never that a backup exists or that data is backed up.
// The consent copy stays generic because the toggle is disabled under Universal Opt-Out.
const CONSENT_ABSENT = 'cloud_sync_consent_absent';
const NO_SESSION = 'cloud_no_session';
const UNREACHABLE_CODES: ReadonlySet<string> = new Set(['cloud_unreachable', 'cloud_init_failed']);
const CONSENT_OFF_TITLE = 'Cloud Backup Is Off';
const CONSENT_OFF_MESSAGE = 'You can turn on cloud backup in Privacy & Data.';
const NO_SESSION_TITLE = "Couldn't Set Up Cloud Backup";
const NO_SESSION_MESSAGE = "Being couldn't start a secure backup session. Check your internet connection and try again.";
const UNREACHABLE_TITLE = "Couldn't Connect";
const UNREACHABLE_MESSAGE = "We couldn't reach cloud backup. Check your internet connection and try again.";

export function connectionTestAlert(
  result: ConnectivityResult | null
): { title: string; message: string } | null {
  if (!result) return null; // a test was already running
  if (result.canConnect) return { title: 'Connection Test', message: 'Connected to cloud backup.' };
  if (result.error === CONSENT_ABSENT) return { title: CONSENT_OFF_TITLE, message: CONSENT_OFF_MESSAGE };
  if (result.error === NO_SESSION) return { title: NO_SESSION_TITLE, message: NO_SESSION_MESSAGE };
  return { title: UNREACHABLE_TITLE, message: UNREACHABLE_MESSAGE };
}

// DEBUG-784: Backup now and Restore follow the same rule. The backup holds app settings only,
// so success copy never claims more. Restore errors can carry fragments of decrypted content
// (DEBUG-625) and its store labels are internal, so no branch interpolates either. Restore has
// no consent branch: restoreFromCloud is consent-exempt by design (DEBUG-757).
const BACKUP_FAILED_TITLE = "Couldn't Back Up";
const BACKUP_FAILED_MESSAGE = "We couldn't back up your settings. Check your internet connection and try again.";
const RESTORE_FAILED_TITLE = "Couldn't Restore";
const RESTORE_FAILED_MESSAGE = "We couldn't restore your backup. Your current data hasn't changed. Try again later.";
const NO_BACKUP = 'No backup found';
const RESTORE_IN_FLIGHT = 'Operation in progress';
const BANNER_FALLBACK = 'Something went wrong with cloud backup. Please try again.';

export function backupAlert(
  result: BackupResult | null | undefined
): { title: string; message: string } | null {
  if (!result) return null; // an operation was already running
  if (result.success) return { title: 'Backup Complete', message: 'Your settings are backed up.' };
  if (result.error === CONSENT_ABSENT) return { title: CONSENT_OFF_TITLE, message: CONSENT_OFF_MESSAGE };
  return { title: BACKUP_FAILED_TITLE, message: BACKUP_FAILED_MESSAGE };
}

export function restoreAlert(result: RestoreResult): { title: string; message: string } | null {
  if (result.success && result.errors.length === 0) {
    return result.restoredStores.length > 0
      ? { title: 'Restore Complete', message: 'Your settings were restored from your cloud backup.' }
      : { title: 'Nothing to Restore', message: "Your backup didn't have any settings to restore." };
  }
  if (result.errors.length === 1 && result.errors[0] === RESTORE_IN_FLIGHT) return null;
  if (result.errors.includes(NO_BACKUP)) {
    return { title: 'No Backup Found', message: "We couldn't find a cloud backup to restore." };
  }
  return { title: RESTORE_FAILED_TITLE, message: RESTORE_FAILED_MESSAGE };
}

/** The error banner shares the mapping for known codes; any other message gets one generic line. */
function errorBannerText(error: string): string {
  if (error === CONSENT_ABSENT) return `${CONSENT_OFF_TITLE}. ${CONSENT_OFF_MESSAGE}`;
  if (error === NO_SESSION) return `${NO_SESSION_TITLE}. ${NO_SESSION_MESSAGE}`;
  if (UNREACHABLE_CODES.has(error)) return `${UNREACHABLE_TITLE}. ${UNREACHABLE_MESSAGE}`;
  return BANNER_FALLBACK;
}

interface CloudBackupSettingsProps {
  style?: StyleProp<ViewStyle>;
  onRestoreComplete?: (restoredStores: string[]) => void;
}

export default function CloudBackupSettings({
  style,
  onRestoreComplete,
}: CloudBackupSettingsProps) {
  const {
    status,
    stats,
    isInitialized,
    isOnline,
    isLoading,
    error,
    restoreFromBackup,
    forceSync,
    hasCloudBackup,
    shouldPromptRestore,
    lastBackupTime,
    testConnectivity,
    clearError,
    refreshStatus,
    createBackup,
  } = useCloudSync();

  const {
    config,
    updateConfig,
    isLoading: isConfigLoading,
    error: configError,
    clearError: clearConfigError,
  } = useCloudBackupConfig();

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  // Handle manual backup (DEBUG-784: the alert follows the returned result)
  const handleManualBackup = async () => {
    let alert: { title: string; message: string } | null;
    try {
      alert = backupAlert(await createBackup());
    } catch {
      alert = backupAlert({ success: false });
    }
    if (alert) Alert.alert(alert.title, alert.message);
  };

  // Handle restore with confirmation (destructive — overwrites local data)
  const handleRestore = async () => {
    Alert.alert(
      'Restore Data',
      'This will replace your current data with your cloud backup. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            let result: RestoreResult;
            try {
              result = await restoreFromBackup();
            } catch {
              result = { success: false, restoredStores: [], errors: [] };
            }
            const alert = restoreAlert(result);
            if (alert) Alert.alert(alert.title, alert.message);
            if (result.success && result.errors.length === 0 && result.restoredStores.length > 0) {
              onRestoreComplete?.(result.restoredStores);
            }
          },
        },
      ]
    );
  };

  // Handle connection test (DEBUG-767: the alert follows the returned result)
  const handleTestConnection = async () => {
    let alert: { title: string; message: string } | null;
    try {
      alert = connectionTestAlert(await testConnectivity());
    } catch {
      alert = connectionTestAlert({ canConnect: false });
    }
    if (alert) Alert.alert(alert.title, alert.message);
  };

  // Get status color
  const getStatusColor = (): string => {
    if (!isInitialized) return semantic.text.secondary;
    if (!isOnline) return colorSystem.status.error;
    if (status.circuitBreakerState === 'open') return colorSystem.status.warning;
    return colorSystem.status.success;
  };

  // Get status text
  const getStatusText = (): string => {
    if (!isInitialized) return 'Initializing...';
    if (!isOnline) return 'Offline';
    if (status.circuitBreakerState === 'open') return 'Connection Issues';
    return 'Online';
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cloud Backup</Text>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
      </View>

      {/* Error Display */}
      {(error || configError) && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error ? errorBannerText(error) : configError}
          </Text>
          <TouchableOpacity
            onPress={() => {
              clearError();
              clearConfigError();
            }}
            style={styles.errorDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
          >
            <Text style={styles.errorDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Restore Prompt (same-device recovery) */}
      {shouldPromptRestore && (
        <View style={styles.restorePrompt}>
          <Text style={styles.restorePromptTitle}>
            Backup Found
          </Text>
          <Text style={styles.restorePromptText}>
            We found a backup of your settings on this device. Would you like to restore it?
          </Text>
          <TouchableOpacity
            onPress={handleRestore}
            style={styles.restoreButton}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Restore data from backup"
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color={colorSystem.base.white} size="small" />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Data</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Privacy Notice - Privacy Compliance (MAINT-117) */}
      <View style={styles.privacyNotice}>
        <Text style={styles.privacyNoticeTitle}>
          Privacy Protection
        </Text>
        <Text style={styles.privacyNoticeText}>
          <Text style={styles.privacyBold}>What is backed up: </Text>
          App settings and preferences only.
        </Text>
        <Text style={styles.privacyNoticeText}>
          <Text style={styles.privacyBold}>What stays on your device: </Text>
          Your wellness check-in responses, self-screening results, and crisis data are never backed up to the cloud.
        </Text>
        <Text style={styles.privacyNoticeNote}>
          Your wellness data stays on this device only, protected by device-level encryption. If you uninstall the app or lose your device, that history cannot be recovered.
        </Text>
      </View>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Status</Text>

        {/* Rendered in both modes: it was the dormant SyncCoordinator indicator's
            sibling, and it is the screen's only status reading (MAINT-702). */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Connection:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Backup:</Text>
          <Text style={styles.statusValue}>
            {formatDate(lastBackupTime)}
          </Text>
        </View>

        {status.pendingOperations > 0 && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Pending Operations:</Text>
            <Text style={styles.statusValue}>
              {status.pendingOperations}
            </Text>
          </View>
        )}
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity
          onPress={handleManualBackup}
          style={[styles.button, styles.primaryButton]}
          disabled={isLoading || !isOnline}
          accessibilityRole="button"
          accessibilityLabel="Back up now"
          accessibilityState={{ disabled: isLoading || !isOnline, busy: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color={colorSystem.base.white} size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Backup Now</Text>
          )}
        </TouchableOpacity>

        {hasCloudBackup && (
          <TouchableOpacity
            onPress={handleRestore}
            style={[styles.button, styles.secondaryButton]}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Restore from cloud"
            accessibilityState={{ disabled: isLoading, busy: isLoading }}
          >
            <Text style={styles.secondaryButtonText}>Restore from Cloud</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={forceSync}
          style={[styles.button, styles.secondaryButton]}
          disabled={isLoading || !isOnline}
          accessibilityRole="button"
          accessibilityLabel="Force sync"
        >
          <Text style={styles.secondaryButtonText}>Force Sync</Text>
        </TouchableOpacity>
      </View>

      {/* Configuration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Automatic Backup</Text>
          <Switch
            value={config.autoBackupEnabled}
            onValueChange={(value) => updateConfig({ autoBackupEnabled: value })}
            disabled={isConfigLoading}
          />
        </View>

        {/* Advanced Settings Toggle */}
        <TouchableOpacity
          onPress={() => setShowAdvanced(!showAdvanced)}
          style={styles.advancedToggle}
          accessibilityRole="button"
          accessibilityLabel={`${showAdvanced ? 'Hide' : 'Show'} advanced settings`}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </Text>
        </TouchableOpacity>

        {/* Advanced Settings */}
        {showAdvanced && (
          <View style={styles.advancedSection}>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Backup Interval</Text>
              <Text style={styles.configValue}>
                {Math.round(config.autoBackupIntervalMs / (1000 * 60 * 60))} hours
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleTestConnection}
              style={[styles.button, styles.tertiaryButton]}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
              accessibilityLabel="Test connection"
            >
              <Text style={styles.tertiaryButtonText}>Test Connection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={refreshStatus}
              style={[styles.button, styles.tertiaryButton]}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Refresh status"
            >
              <Text style={styles.tertiaryButtonText}>Refresh Status</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Statistics Section (Advanced) */}
      {showAdvanced && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>

          {/* Backup Statistics */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Backup</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Total Backups:</Text>
              <Text style={styles.statusValue}>{stats.totalBackups}</Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Success Rate:</Text>
              <Text style={styles.statusValue}>
                {Math.round(stats.successRate * 100)}%
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Average Size:</Text>
              <Text style={styles.statusValue}>
                {stats.averageBackupSizeMB.toFixed(1)} MB
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[16],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[20],
  },

  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.bold,
    color: semantic.text.primary,
  },

  statusIndicator: {
    width: spacing[12],
    height: spacing[12],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[16],
  },

  errorContainer: {
    backgroundColor: colorSystem.status.errorBackground,
    padding: spacing[12],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[16],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  errorText: {
    color: colorSystem.status.error,
    flex: 1,
  },

  errorDismiss: {
    marginLeft: spacing[12],
  },

  errorDismissText: {
    color: colorSystem.status.error,
    fontWeight: typography.fontWeight.bold,
  },

  restorePrompt: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[16],
  },

  restorePromptTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[8],
  },

  restorePromptText: {
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[12],
  },

  restoreButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    padding: spacing[12],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    minHeight: 44, // Accessibility requirement
  },

  restoreButtonText: {
    color: colorSystem.base.white,
    fontWeight: typography.fontWeight.bold,
  },

  // Privacy Notice - Privacy Compliance (MAINT-117)
  privacyNotice: {
    backgroundColor: colorSystem.status.successBackground, // green tint for privacy/trust
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.status.success,
  },

  privacyNoticeTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.status.success, // green for privacy/security
    marginBottom: spacing[12],
  },

  privacyNoticeText: {
    color: semantic.text.secondary,
    fontSize: typography.bodySmall.size,
    marginBottom: spacing[8],
    lineHeight: 20,
  },

  privacyBold: {
    fontWeight: typography.fontWeight.bold,
    color: semantic.text.primary,
  },

  privacyNoticeNote: {
    color: semantic.text.secondary,
    fontSize: typography.micro.size,
    marginTop: spacing[8],
    fontStyle: 'italic',
    lineHeight: 18,
  },

  section: {
    marginBottom: spacing[24],
  },

  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.bold,
    color: semantic.text.primary,
    marginBottom: spacing[12],
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
  },

  statusLabel: {
    color: semantic.text.secondary,
  },

  statusValue: {
    color: semantic.text.primary,
    fontWeight: typography.fontWeight.medium,
  },

  button: {
    padding: spacing[12],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginBottom: spacing[8],
    minHeight: 44, // Accessibility requirement
  },

  primaryButton: {
    backgroundColor: colorSystem.status.success,
  },

  primaryButtonText: {
    color: colorSystem.base.white,
    fontWeight: typography.fontWeight.bold,
  },

  secondaryButton: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },

  secondaryButtonText: {
    color: semantic.text.primary,
    fontWeight: typography.fontWeight.medium,
  },

  tertiaryButton: {
    backgroundColor: colorSystem.gray[100],
  },

  tertiaryButtonText: {
    color: semantic.text.secondary,
  },

  subsection: {
    marginBottom: spacing[16],
    paddingBottom: spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[100],
  },

  subsectionTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.bold,
    color: semantic.text.secondary,
    marginBottom: spacing[8],
    textTransform: 'uppercase',
  },

  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[12],
    minHeight: 44, // Accessibility requirement
  },

  configLabel: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
  },

  configValue: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
  },

  advancedToggle: {
    padding: spacing[8],
    alignItems: 'center',
  },

  advancedToggleText: {
    color: colorSystem.base.midnightBlue,
    fontWeight: typography.fontWeight.medium,
  },

  advancedSection: {
    marginTop: spacing[12],
    paddingTop: spacing[12],
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
});

// Export prop types for documentation
export type { CloudBackupSettingsProps };
