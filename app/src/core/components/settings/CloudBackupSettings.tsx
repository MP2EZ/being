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
import { useCloudSync, useCloudBackupConfig } from '@/core/services/supabase/hooks/useCloudSync';
import SyncStatusIndicator from '../sync/SyncStatusIndicator';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

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

  // Handle manual backup
  const handleManualBackup = async () => {
    try {
      await createBackup();
      Alert.alert('Success', 'Backup completed successfully');
    } catch {
      Alert.alert('Backup Failed', 'Please check your connection and try again');
    }
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
            try {
              const result = await restoreFromBackup();

              if (result.success) {
                Alert.alert(
                  'Restore Complete',
                  `Restored: ${result.restoredStores.join(', ')}`
                );
                onRestoreComplete?.(result.restoredStores);
              } else {
                Alert.alert(
                  'Restore Failed',
                  result.errors.join('\n')
                );
              }
            } catch {
              Alert.alert('Restore Failed', 'Please try again later');
            }
          },
        },
      ]
    );
  };

  // Handle connection test
  const handleTestConnection = async () => {
    try {
      await testConnectivity();
      Alert.alert('Connection Test', 'Successfully connected to cloud');
    } catch {
      Alert.alert('Connection Failed', 'Unable to connect to cloud services');
    }
  };

  // Get status color
  const getStatusColor = (): string => {
    if (!isInitialized) return colorSystem.gray[600];
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
            {error || configError}
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

        {/* Integrated Status Indicator */}
        <SyncStatusIndicator
          showDetailed={showAdvanced}
          style={styles.statusIndicator}
          onStatusChange={(syncStatus) => {
            console.log('Overall system status:', syncStatus);
          }}
        />

        {!showAdvanced && (
          <>
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
          </>
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

        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Compression</Text>
          <Switch
            value={config.compressionEnabled}
            onValueChange={(value) => updateConfig({ compressionEnabled: value })}
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
    color: colorSystem.base.black,
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
    color: colorSystem.gray[700],
    fontSize: typography.bodySmall.size,
    marginBottom: spacing[8],
    lineHeight: 20,
  },

  privacyBold: {
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
  },

  privacyNoticeNote: {
    color: colorSystem.gray[600],
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
    color: colorSystem.base.black,
    marginBottom: spacing[12],
  },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[8],
  },

  statusLabel: {
    color: colorSystem.gray[600],
  },

  statusValue: {
    color: colorSystem.base.black,
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
    color: colorSystem.base.black,
    fontWeight: typography.fontWeight.medium,
  },

  tertiaryButton: {
    backgroundColor: colorSystem.gray[100],
  },

  tertiaryButtonText: {
    color: colorSystem.gray[600],
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
    color: colorSystem.gray[600],
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
    color: colorSystem.base.black,
  },

  configValue: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
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
