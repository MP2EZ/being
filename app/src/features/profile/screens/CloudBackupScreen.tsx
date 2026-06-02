/**
 * CLOUD BACKUP SCREEN (MAINT-173)
 *
 * Wraps the comprehensive CloudBackupSettings controls as a profile sub-screen,
 * reached from the "Manage Cloud Backup" row in PrivacyDataScreen. Ships dark:
 * the entry row and this screen are both gated by the `cloud_sync` feature
 * flag, so users see nothing until the feature is enabled. As of INFRA-199 the
 * flag resolves through the runtime `useFeatureFlag` tier (PostHog promotes,
 * build-time default is the floor) — this gates UI visibility only; actual
 * backup egress stays gated independently by the cloud_sync consent in
 * CloudBackupService.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CloudBackupSettings from '@/core/components/settings/CloudBackupSettings';
import { useFeatureFlag } from '@/core/analytics';
import { colorSystem, spacing } from '@/core/theme';

// FEAT-212: rendered as a route (Privacy → CloudBackup) on ProfileStackNavigator;
// the native stack header supplies the back chevron (SubMenuHeader's ✕ removed).
const CloudBackupScreen: React.FC = () => {
  // Belt-and-suspenders: never render when the feature flag is off, even if
  // reached by some path other than the (already flag-gated) entry row.
  const cloudSyncAvailable = useFeatureFlag('cloud_sync');
  if (!cloudSyncAvailable) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <CloudBackupSettings />
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
    paddingBottom: spacing[32],
  },
});

export default CloudBackupScreen;
