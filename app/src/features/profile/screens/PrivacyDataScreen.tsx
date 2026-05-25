/**
 * PRIVACY & DATA SCREEN
 * Focused privacy settings: data sharing preferences and storage location transparency
 *
 * PRIVACY:
 * - Privacy-first defaults (analytics opt-out)
 * - Storage location indicators for user transparency
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader support
 * - Clear section organization
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useConsentStore } from '@/core/stores/consentStore';
import { useAnalytics } from '@/core/analytics';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import SubMenuHeader from '../components/SubMenuHeader';

interface PrivacyDataScreenProps {
  onReturn: () => void;
}

/**
 * Storage Location Row Component
 * Displays a data type with its storage location indicator
 *
 * Storage locations:
 * - 'device': SecureStore (iOS Keychain / Android Keystore) - tied to device, survives reinstall
 * - 'app': AsyncStorage - inside app only, lost if app deleted
 * - 'cloud': Supabase - Being's cloud, accessible from any device
 */
type StorageLocation = 'device' | 'app' | 'cloud';

interface StorageLocationRowProps {
  label: string;
  description: string;
  location: StorageLocation;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const getStorageDisplay = (location: StorageLocation): { icon: IoniconName; text: string; accessibilityText: string } => {
  const isIOS = Platform.OS === 'ios';

  switch (location) {
    case 'device':
      return {
        icon: 'phone-portrait-outline',
        text: isIOS ? 'iPhone / iCloud' : 'This device',
        accessibilityText: isIOS
          ? 'Stored on your iPhone. May sync to iCloud if you have iCloud Keychain enabled.'
          : 'Stored on this device only. Will not sync to other devices.',
      };
    case 'app':
      return {
        icon: 'cube-outline',
        text: 'App',
        accessibilityText: 'Stored in this app only. Lost if you delete the app.',
      };
    case 'cloud':
      return {
        icon: 'cloud-outline',
        text: 'Being Cloud',
        accessibilityText: 'Synced to Being Cloud. Accessible from any device you sign into.',
      };
  }
};

const StorageLocationRow: React.FC<StorageLocationRowProps> = ({
  label,
  description,
  location,
}) => {
  const { icon, text, accessibilityText } = getStorageDisplay(location);

  return (
    <View
      style={storageRowStyles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${label}. ${description}. ${accessibilityText}`}
    >
      <View style={storageRowStyles.labelContainer}>
        <Text style={storageRowStyles.label}>{label}</Text>
        <Text style={storageRowStyles.description}>{description}</Text>
      </View>
      <View style={storageRowStyles.indicatorContainer}>
        <Ionicons
          name={icon}
          size={18}
          color={colorSystem.gray[500]}
          style={storageRowStyles.icon}
        />
        <Text style={storageRowStyles.storageText}>{text}</Text>
      </View>
    </View>
  );
};

const storageRowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[12],
  },
  labelContainer: {
    flex: 1,
    marginRight: spacing[12],
  },
  label: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  description: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[500],
    lineHeight: 18,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.gray[100],
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: borderRadius.medium,
  },
  icon: {
    marginRight: spacing[4],
  },
  storageText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.gray[600],
  },
});

const PrivacyDataScreen: React.FC<PrivacyDataScreenProps> = ({ onReturn }) => {
  const { loadConsent, currentConsent, updateConsent } = useConsentStore();
  const { trackScreenView, trackSettingsOpened, trackConsentChanged } = useAnalytics();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Track screen view and settings opened for analytics
  useFocusEffect(
    useCallback(() => {
      trackScreenView('PrivacyDataScreen');
      trackSettingsOpened();
    }, [trackScreenView, trackSettingsOpened])
  );

  // Consent preferences from consentStore (source of truth)
  const analyticsEnabled = currentConsent?.preferences?.analyticsEnabled ?? false;
  const crashReportsEnabled = currentConsent?.preferences?.crashReportsEnabled ?? false;
  const cloudSyncEnabled = currentConsent?.preferences?.cloudSyncEnabled ?? false;
  const researchEnabled = currentConsent?.preferences?.researchEnabled ?? false;

  // Load consent on mount
  useEffect(() => {
    const load = async () => {
      await loadConsent();
      setIsLoading(false);
    };
    load();
  }, [loadConsent]);

  // Consent toggles write directly to consentStore (source of truth)
  const handleConsentToggle = async (key: string, value: boolean) => {
    setIsSaving(true);
    try {
      await updateConsent({ [key]: value });
      trackConsentChanged();
    } catch (error) {
      Alert.alert(
        'Save Failed',
        'Failed to save preference. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSystem.base.midnightBlue} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SubMenuHeader title="Privacy & Data" onClose={onReturn} />
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Data Sharing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.sectionDescription}>
            Control how your data is used and stored. Privacy-first by default.
          </Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Anonymous Usage Analytics</Text>
                <Text style={styles.settingDescription}>
                  Help improve Being. by sharing anonymous usage data (NO personal or health information)
                </Text>
              </View>
              <Switch
                value={analyticsEnabled}
                onValueChange={(value) => handleConsentToggle('analyticsEnabled', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Crash Reports</Text>
                <Text style={styles.settingDescription}>
                  Automatically report errors to fix bugs faster
                </Text>
              </View>
              <Switch
                value={crashReportsEnabled}
                onValueChange={(value) => handleConsentToggle('crashReportsEnabled', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Cloud Backup</Text>
                <Text style={styles.settingDescription}>
                  Securely sync your preferences across devices
                </Text>
              </View>
              <Switch
                value={cloudSyncEnabled}
                onValueChange={(value) => handleConsentToggle('cloudSyncEnabled', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Research Participation</Text>
                <Text style={styles.settingDescription}>
                  Help improve mental health care (fully anonymous)
                </Text>
              </View>
              <Switch
                value={researchEnabled}
                onValueChange={(value) => handleConsentToggle('researchEnabled', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Your check-in responses, therapeutic values, and health data are NEVER shared. Analytics are limited to app usage patterns only.
            </Text>
          </View>

          {currentConsent && (
            <Text style={styles.consentLastUpdated}>
              Last updated: {new Date(currentConsent.updatedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Storage Locations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Locations</Text>
          <Text style={styles.sectionDescription}>
            Where your data is stored for privacy protection
          </Text>

          <View style={styles.storageCard}>
            <StorageLocationRow
              label="Check-ins"
              description="Mood, thoughts, and daily reflections"
              location="device"
            />
            <View style={styles.storageDivider} />
            <StorageLocationRow
              label="Assessments"
              description="PHQ-9 and GAD-7 results"
              location="device"
            />
            <View style={styles.storageDivider} />
            <StorageLocationRow
              label="Crisis Contacts"
              description="Emergency contacts and safety plan"
              location="device"
            />
            <View style={styles.storageDivider} />
            <StorageLocationRow
              label="Preferences"
              description="App settings and customizations"
              location={cloudSyncEnabled ? 'cloud' : 'app'}
            />
          </View>

          <Text style={styles.storageInfoText}>
            Device data survives reinstall. App data is lost if you delete the app.
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[32],
  },
  loadingText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    marginTop: spacing[16],
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
  sectionDescription: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 22,
    marginBottom: spacing[16],
  },
  settingCard: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginBottom: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing[16],
  },
  settingLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  settingDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#F0F4FF',
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginTop: spacing[8],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.base.midnightBlue,
  },
  infoText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  consentLastUpdated: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[400],
    textAlign: 'center',
    marginTop: spacing[8],
  },
  storageCard: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  storageDivider: {
    height: 1,
    backgroundColor: colorSystem.gray[200],
  },
  storageInfoText: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[500],
    marginTop: spacing[12],
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default PrivacyDataScreen;
