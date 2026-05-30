/**
 * CLOUD BACKUP SCREEN (MAINT-173)
 *
 * Wraps the comprehensive CloudBackupSettings controls as a profile sub-screen,
 * reached from the "Manage Cloud Backup" row in PrivacyDataScreen. Ships dark:
 * the entry row and this screen are both gated by the `cloud_sync` feature
 * flag (currently false), so users see nothing until the feature is enabled.
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubMenuHeader from '../components/SubMenuHeader';
import CloudBackupSettings from '@/core/components/settings/CloudBackupSettings';
import { isFeatureEnabled } from '@/core/services/featureFlags';
import { colorSystem, spacing } from '@/core/theme';

interface CloudBackupScreenProps {
  onReturn: () => void;
}

const CloudBackupScreen: React.FC<CloudBackupScreenProps> = ({ onReturn }) => {
  // Belt-and-suspenders: never render when the feature flag is off, even if
  // reached by some path other than the (already flag-gated) entry row.
  if (!isFeatureEnabled('cloud_sync')) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <SubMenuHeader title="Cloud Backup" onClose={onReturn} />
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
