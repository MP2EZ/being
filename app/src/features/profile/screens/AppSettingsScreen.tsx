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
 * - HIPAA compliance validation for privacy settings
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
  success: '#10B981',
  warning: '#F59E0B',
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

interface AppSettingsScreenProps {
  onReturn: () => void;
}

const AppSettingsScreen: React.FC<AppSettingsScreenProps> = ({ onReturn }) => {
  const settingsStore = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    settingsStore.loadSettings();
  }, []);

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
          <ActivityIndicator size="large" color={colors.midnightBlue} />
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
                trackColor={{ false: colors.gray300, true: colors.midnightBlue }}
                thumbColor={colors.white}
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
                trackColor={{ false: colors.gray300, true: colors.midnightBlue }}
                thumbColor={colors.white}
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
                trackColor={{ false: colors.gray300, true: colors.midnightBlue }}
                thumbColor={colors.white}
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
                trackColor={{ false: colors.gray300, true: colors.midnightBlue }}
                thumbColor={colors.white}
                disabled={isSaving}
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              🔒 Your check-in responses, therapeutic values, and health data are NEVER shared. Analytics are limited to app usage patterns only.
            </Text>
          </View>
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
                trackColor={{ false: colors.gray300, true: colors.midnightBlue }}
                thumbColor={colors.white}
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
                trackColor={{ false: colors.gray300, true: colors.midnightBlue }}
                thumbColor={colors.white}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#EF4444',
    marginBottom: spacing.lg,
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
  settingCard: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  settingDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
  },
  textSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  textSizeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    marginHorizontal: 4,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gray300,
    alignItems: 'center',
  },
  textSizeButtonActive: {
    backgroundColor: colors.midnightBlue,
    borderColor: colors.midnightBlue,
  },
  textSizeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray600,
  },
  textSizeButtonTextActive: {
    color: colors.white,
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
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  infoCardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
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
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    marginBottom: spacing.md,
  },
  dangerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AppSettingsScreen;
