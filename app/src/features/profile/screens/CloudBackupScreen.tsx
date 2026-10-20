/**
 * CLOUD BACKUP SCREEN (MAINT-173)
 *
 * Wraps the comprehensive CloudBackupSettings controls as a profile sub-screen,
 * reached from the "Manage Cloud Backup" row in PrivacyDataScreen. Ships dark:
 * the entry row and this screen are both gated by the `cloud_sync` feature
 * flag, so users see nothing until the feature is enabled. The flag resolves at
 * BUILD TIME only (`isFeatureEnabled`, MAINT-809), the same resolver the onboarding
 * and re-consent Cloud Backup consent cards use, so this screen and the card that
 * authorizes it always appear or disappear together. `cloud_sync` is deliberately
 * not in `PRODUCT_FLAGS`: for those flags a clean PostHog boolean wins in both
 * directions for analytics consenters. This gates UI visibility only; actual
 * backup egress stays gated independently by the cloud_sync consent in
 * CloudBackupService.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CloudBackupSettings from '@/core/components/settings/CloudBackupSettings';
import { isFeatureEnabled } from '@/core/services/featureFlags';
import { colorSystem, spacing } from '@/core/theme';

// FEAT-212: rendered as a route (Privacy → CloudBackup) on ProfileStackNavigator;
// the native stack header supplies the back chevron (SubMenuHeader's ✕ removed).
const CloudBackupScreen: React.FC = () => {
  // Belt-and-suspenders: never render when the feature flag is off, even if
  // reached by some path other than the (already flag-gated) entry row.
  const cloudSyncAvailable = isFeatureEnabled('cloud_sync');
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
