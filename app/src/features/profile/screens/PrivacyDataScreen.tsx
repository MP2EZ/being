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
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useConsentStore } from '@/core/stores/consentStore';
import { useAnalytics, useFeatureFlag } from '@/core/analytics';
import { semantic, colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import type { ProfileStackParamList } from '../ProfileStackNavigator';

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
          color={semantic.text.muted}
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
    color: semantic.text.muted,
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
    color: semantic.text.secondary,
  },
});

const PrivacyDataScreen: React.FC = () => {
  // FEAT-212: rendered as a route on ProfileStackNavigator. The cloud-backup
  // sub-screen is now a pushed route (Privacy → CloudBackup), not an in-component
  // state machine; the native stack header supplies the back chevron.
  const navigation = useNavigation<StackNavigationProp<ProfileStackParamList>>();
  const { loadConsent, currentConsent, updateConsent, setUniversalOptOut } = useConsentStore();
  const { trackScreenView, trackSettingsOpened, trackConsentChanged } = useAnalytics();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Runtime flag (INFRA-199): gates UI visibility of the cloud-backup entry.
  // PostHog promotes post-consent; build-time default is the fail-safe floor.
  const cloudSyncAvailable = useFeatureFlag('cloud_sync');

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
  // INFRA-151: GPC-equivalent universal opt-out flag
  const universalOptOut = currentConsent?.universalOptOut ?? false;

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

  const handleUniversalOptOutToggle = async (value: boolean): Promise<void> => {
    setIsSaving(true);
    try {
      await setUniversalOptOut(value);
      trackConsentChanged();
    } catch {
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
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Universal Opt-Out Section (INFRA-151) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Universal Opt-Out</Text>
          <Text style={styles.sectionDescription}>
            A single switch that opts you out of all non-essential data collection — the in-app equivalent of the Global Privacy Control (GPC) browser signal.
          </Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Honor Universal Opt-Out</Text>
                <Text style={styles.settingDescription}>
                  When enabled, Being treats your in-app session as opted out of all analytics, crash reports, settings backup, and research participation — overriding the individual toggles below. Honored under CCPA, TDPSA, CPA, and CTDPA.
                </Text>
              </View>
              <Switch
                value={universalOptOut}
                onValueChange={handleUniversalOptOutToggle}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
                accessibilityLabel="Honor Universal Opt-Out"
                accessibilityHint="Enables the Global Privacy Control equivalent — overrides all non-essential analytics and tracking preferences"
              />
            </View>
          </View>
        </View>

        {/* Data Sharing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.sectionDescription}>
            Control how your data is used and stored. Privacy-first by default.{universalOptOut ? ' These toggles are overridden while Universal Opt-Out is on.' : ''}
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
                value={analyticsEnabled && !universalOptOut}
                onValueChange={(value) => handleConsentToggle('analyticsEnabled', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving || universalOptOut}
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
                value={crashReportsEnabled && !universalOptOut}
                onValueChange={(value) => handleConsentToggle('crashReportsEnabled', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving || universalOptOut}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Settings Backup</Text>
                <Text style={styles.settingDescription}>
                  Back up app preferences to encrypted cloud storage
                </Text>
              </View>
              <Switch
                value={cloudSyncEnabled && !universalOptOut}
                onValueChange={(value) => handleConsentToggle('cloudSyncEnabled', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving || universalOptOut}
              />
            </View>
          </View>

          {/* Manage Cloud Backup — flag-gated entry to the comprehensive
              controls (backup now, restore, status). Ships dark: hidden
              until the cloud_sync feature flag is enabled. */}
          {cloudSyncAvailable && (
            <TouchableOpacity
              style={styles.settingCard}
              onPress={() => navigation.navigate('CloudBackup')}
              testID="profile-cloud-backup"
              accessibilityRole="button"
              accessibilityLabel="Manage Cloud Backup"
              accessibilityHint="Opens cloud backup status, manual backup, and restore controls"
            >
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Manage Cloud Backup</Text>
                  <Text style={styles.settingDescription}>
                    Back up now, restore, and view sync status
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colorSystem.gray[400]} />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Research Participation</Text>
                <Text style={styles.settingDescription}>
                  Help improve mental health care (fully anonymous)
                </Text>
              </View>
              <Switch
                value={researchEnabled && !universalOptOut}
                onValueChange={(value) => handleConsentToggle('researchEnabled', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving || universalOptOut}
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
              location={cloudSyncEnabled && !universalOptOut ? 'cloud' : 'app'}
            />
          </View>

          <Text style={styles.storageInfoText}>
            Device data survives reinstall. App data is lost if you delete the app.
          </Text>
        </View>

        {/* Your Data Rights Section (FEAT-267) — data-portability + erasure.
            Both rows push routes registered inside ProfileStackNavigator, which
            keeps the crisis-button overlay reachable on the destination screens. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data Rights</Text>
          <Text style={styles.sectionDescription}>
            Export a copy of your data or permanently delete your account, under CCPA, TDPSA, and GDPR.
          </Text>

          <TouchableOpacity
            style={styles.settingCard}
            onPress={() => navigation.navigate('ExportData')}
            testID="profile-card-export"
            accessibilityRole="button"
            accessibilityLabel="Export my data"
            accessibilityHint="Opens a screen to download a JSON copy of your on-device data"
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Export my data</Text>
                <Text style={styles.settingDescription}>
                  Download a portable JSON copy of your on-device data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colorSystem.gray[400]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingCard}
            onPress={() => navigation.navigate('DeleteAccount')}
            testID="profile-card-delete"
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            accessibilityHint="Opens a screen to permanently delete your account and wellness data"
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, styles.destructiveLabel]}>Delete account</Text>
                <Text style={styles.settingDescription}>
                  Permanently erase your account and wellness data
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colorSystem.gray[400]} />
            </View>
          </TouchableOpacity>
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
    color: semantic.text.secondary,
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
    color: semantic.text.secondary,
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
  destructiveLabel: {
    color: colorSystem.status.error,
  },
  settingDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: colorSystem.status.infoBackground,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginTop: spacing[8],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.base.midnightBlue,
  },
  infoText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
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
    color: semantic.text.muted,
    marginTop: spacing[12],
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default PrivacyDataScreen;
