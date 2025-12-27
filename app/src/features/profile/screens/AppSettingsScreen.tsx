/**
 * APP SETTINGS SCREEN
 * Configure app preferences: notifications, privacy, accessibility
 *
 * PRIVACY:
 * - Privacy-first defaults (analytics opt-out)
 * - Non-sensitive settings → AsyncStorage (no encryption)
 *
 * TODO (FEAT-6 Open Questions):
 * - Notification scheduling integration (expo-notifications?)
 * - Analytics integration point
 * - Global accessibility feature control
 * - Privacy compliance validation for privacy settings
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader support
 * - Clear section organization
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/core/stores/settingsStore';
import { useConsentStore } from '@/core/stores/consentStore';
import { ConsentManagementScreen } from '@/features/consent';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

interface AppSettingsScreenProps {
  onReturn: () => void;
}

const AppSettingsScreen: React.FC<AppSettingsScreenProps> = ({ onReturn }) => {
  const settingsStore = useSettingsStore();
  const { loadConsent, currentConsent } = useConsentStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showConsentScreen, setShowConsentScreen] = useState(false);

  // Load settings and consent on mount
  useEffect(() => {
    settingsStore.loadSettings();
    loadConsent();
  }, [loadConsent]);

  const handleToggleSetting = async (
    category: 'notifications' | 'privacy' | 'accessibility',
    key: string,
    value: boolean | string
  ) => {
    setIsSaving(true);
    try {
      if (category === 'notifications') {
        await settingsStore.updateNotificationSettings({ [key]: value });
      } else if (category === 'privacy') {
        await settingsStore.updatePrivacySettings({ [key]: value });
      } else if (category === 'accessibility') {
        await settingsStore.updateAccessibilitySettings({ [key]: value });
      }
    } catch (error) {
      Alert.alert(
        'Save Failed',
        'Failed to save setting. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all app settings to their default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsSaving(true);
            try {
              await settingsStore.resetSettings();
              Alert.alert('Settings Reset', 'All settings have been reset to defaults.');
            } catch (error) {
              Alert.alert('Reset Failed', 'Failed to reset settings. Please try again.');
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  // Render loading state
  if (settingsStore.isLoading && !settingsStore.settings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSystem.base.midnightBlue} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (settingsStore.error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load settings</Text>
          <Pressable style={styles.primaryButton} onPress={() => settingsStore.loadSettings()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const settings = settingsStore.settings;
  if (!settings) return null;

  // Render consent management screen if selected
  if (showConsentScreen) {
    return (
      <ConsentManagementScreen
        mode="settings"
        onComplete={() => setShowConsentScreen(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>App Settings</Text>
          <Text style={styles.subtitle}>
            Manage notifications, privacy, and accessibility preferences
          </Text>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.sectionDescription}>
            Configure reminders and prompts to support your practice
          </Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Check-in Reminders</Text>
                <Text style={styles.settingDescription}>
                  Daily reminders for morning, midday, and evening check-ins
                </Text>
              </View>
              <Switch
                value={settings.notifications.checkInReminders}
                onValueChange={(value) => handleToggleSetting('notifications', 'checkInReminders', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Breathing Reminders</Text>
                <Text style={styles.settingDescription}>
                  Gentle prompts to practice mindful breathing throughout the day
                </Text>
              </View>
              <Switch
                value={settings.notifications.breathingReminders}
                onValueChange={(value) => handleToggleSetting('notifications', 'breathingReminders', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Values Reflection Prompts</Text>
                <Text style={styles.settingDescription}>
                  Periodic invitations to reflect on your therapeutic values
                </Text>
              </View>
              <Switch
                value={settings.notifications.valuesReflectionPrompts}
                onValueChange={(value) => handleToggleSetting('notifications', 'valuesReflectionPrompts', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📝 Note: Notification scheduling will be integrated in a future update. Your preferences are saved.
            </Text>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          <Text style={styles.sectionDescription}>
            Control how your data is used (privacy-first by default)
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
                value={settings.privacy.analyticsEnabled}
                onValueChange={(value) => handleToggleSetting('privacy', 'analyticsEnabled', value)}
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

          {/* Manage Consent Preferences Button */}
          <Pressable
            style={styles.consentButton}
            onPress={() => setShowConsentScreen(true)}
            accessibilityRole="button"
            accessibilityLabel="Manage consent preferences"
            accessibilityHint="Opens detailed privacy consent settings"
          >
            <View style={styles.consentButtonContent}>
              <View style={styles.consentButtonInfo}>
                <Text style={styles.consentButtonLabel}>Manage Consent Preferences</Text>
                <Text style={styles.consentButtonDescription}>
                  Control analytics, crash reports, cloud sync, and research participation
                </Text>
              </View>
              <Text style={styles.consentButtonArrow}>→</Text>
            </View>
          </Pressable>

          {currentConsent && (
            <Text style={styles.consentLastUpdated}>
              Last updated: {new Date(currentConsent.updatedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          <Text style={styles.sectionDescription}>
            Customize the app for your needs
          </Text>

          {/* Text Size */}
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>Text Size</Text>
            <View style={styles.textSizeContainer}>
              {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                <Pressable
                  key={size}
                  style={[
                    styles.textSizeButton,
                    settings.accessibility.textSize === size && styles.textSizeButtonActive,
                  ]}
                  onPress={() => handleToggleSetting('accessibility', 'textSize', size)}
                  disabled={isSaving}
                >
                  <Text
                    style={[
                      styles.textSizeButtonText,
                      settings.accessibility.textSize === size && styles.textSizeButtonTextActive,
                    ]}
                  >
                    {size === 'xlarge' ? 'XL' : size.charAt(0).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Reduced Motion */}
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Reduce Motion</Text>
                <Text style={styles.settingDescription}>
                  Minimize animations and transitions
                </Text>
              </View>
              <Switch
                value={settings.accessibility.reducedMotion}
                onValueChange={(value) => handleToggleSetting('accessibility', 'reducedMotion', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
              />
            </View>
          </View>

          {/* High Contrast */}
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>High Contrast</Text>
                <Text style={styles.settingDescription}>
                  Increase color contrast for better visibility
                </Text>
              </View>
              <Switch
                value={settings.accessibility.highContrast}
                onValueChange={(value) => handleToggleSetting('accessibility', 'highContrast', value)}
                trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                thumbColor={colorSystem.base.white}
                disabled={isSaving}
              />
            </View>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>Version</Text>
            <Text style={styles.infoCardValue}>{settings.appVersion}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>Last Updated</Text>
            <Text style={styles.infoCardValue}>
              {new Date(settings.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Pressable
            style={[styles.dangerButton, isSaving && styles.buttonDisabled]}
            onPress={handleResetSettings}
            disabled={isSaving}
          >
            <Text style={styles.dangerButtonText}>Reset to Defaults</Text>
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={onReturn}>
            <Text style={styles.primaryButtonText}>Return to Profile</Text>
          </Pressable>
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
  header: {
    marginBottom: spacing[32],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 24,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[32],
  },
  errorText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: '#EF4444',
    marginBottom: spacing[24],
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
  textSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[16],
  },
  textSizeButton: {
    flex: 1,
    paddingVertical: spacing[16],
    marginHorizontal: 4,
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    borderColor: colorSystem.gray[300],
    alignItems: 'center',
  },
  textSizeButtonActive: {
    backgroundColor: colorSystem.base.midnightBlue,
    borderColor: colorSystem.base.midnightBlue,
  },
  textSizeButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[600],
  },
  textSizeButtonTextActive: {
    color: colorSystem.base.white,
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
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[8],
  },
  infoCardLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  infoCardValue: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
  },
  actionContainer: {
    marginTop: spacing[24],
  },
  primaryButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  primaryButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  dangerButton: {
    backgroundColor: colorSystem.base.white,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    marginBottom: spacing[16],
  },
  dangerButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  consentButton: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.large,
    padding: spacing[24],
    marginTop: spacing[16],
    borderWidth: 2,
    borderColor: colorSystem.base.midnightBlue,
    minHeight: 56,
  },
  consentButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consentButtonInfo: {
    flex: 1,
    marginRight: spacing[16],
  },
  consentButtonLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
    marginBottom: spacing[8],
  },
  consentButtonDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  consentButtonArrow: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
  },
  consentLastUpdated: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[400],
    textAlign: 'center',
    marginTop: spacing[8],
  },
});

export default AppSettingsScreen;
