/**
 * APP SETTINGS SCREEN
 * Configure app preferences: notifications, accessibility, and app info
 *
 * NOTE: Privacy & Data settings have been moved to PrivacyDataScreen.tsx
 *
 * TODO (FEAT-6 Open Questions):
 * - Notification scheduling integration (expo-notifications?)
 * - Global accessibility feature control
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
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '@/core/stores/settingsStore';
import { useAnalytics } from '@/core/analytics';
import { colorSystem, spacing, borderRadius, typography, semantic } from '@/core/theme';
import { isFeatureEnabled } from '@/core/services/featureFlags';
import { hasHapticActuator } from '@/features/practices/shared/haptics/hapticActuator';

/**
 * The Haptic Cues row's copy (DEBUG-426).
 *
 * Derived in ONE place and used for BOTH the visible description and the
 * Switch's accessibilityHint, which were previously verbatim duplicates
 * maintained by hand. That duplication is not redundancy — it is what makes
 * the control self-describing — but keeping it in sync manually is how a note
 * ends up in one and not the other.
 *
 * The note is required on BOTH channels. Description-only is insufficient: the
 * description is a separate accessibility node with no
 * accessibilityLabelledBy/DescribedBy relationship to the Switch, so anyone
 * navigating by VoiceOver's form-controls rotor, Switch Control, or full
 * keyboard access lands on the Switch and hears label + role + state + hint,
 * never reaching it. Hint-only is equally wrong: iOS lets users disable hint
 * speech outright and TalkBack truncates it, so a hint must never be the sole
 * carrier of load-bearing information.
 *
 * It states a hardware fact in plain present tense — not an error, not
 * something the practitioner can fix or retry, and not a comment on the choice
 * they made.
 */
const HAPTIC_CUES_DESCRIPTION =
  'Vibration marks phase changes during breathing, body scan, and timed practices';
const NO_ACTUATOR_NOTE = 'This device has no vibration motor, so these cues are silent here.';

// FEAT-212: rendered as a route on ProfileStackNavigator; the native stack header
// supplies the back chevron (SubMenuHeader's ✕ removed).
const AppSettingsScreen: React.FC = () => {
  const settingsStore = useSettingsStore();
  const { trackScreenView, trackSettingsOpened } = useAnalytics();
  const [isSaving, setIsSaving] = useState(false);

  // DEBUG-426. Note what this does NOT do: it never gates whether the Practices
  // section renders, and never feeds either Switch's `disabled`. The rows stay
  // present and operable on hardware that cannot vibrate — the control is not
  // inert (it persists a real preference, and a settings surface may outlive
  // the device), and `disabled` in this very card already means a RECOVERABLE
  // precondition ("Available when haptic cues are on"), so reusing it for a
  // permanent hardware fact would tell the practitioner to go find a switch
  // that will restore it.
  const hapticsAvailable = hasHapticActuator();
  const hapticCuesDescription = hapticsAvailable
    ? HAPTIC_CUES_DESCRIPTION
    : `${HAPTIC_CUES_DESCRIPTION}. ${NO_ACTUATOR_NOTE}`;

  // Track screen view and settings opened for analytics
  useFocusEffect(
    useCallback(() => {
      trackScreenView('AppSettingsScreen');
      trackSettingsOpened();
    }, [trackScreenView, trackSettingsOpened])
  );

  // Load settings on mount
  useEffect(() => {
    settingsStore.loadSettings();
  }, []);

  const handleToggleSetting = async (
    category: 'notifications' | 'accessibility' | 'practices',
    key: string,
    value: boolean | string
  ) => {
    setIsSaving(true);
    try {
      if (category === 'notifications') {
        await settingsStore.updateNotificationSettings({ [key]: value });
      } else if (category === 'accessibility') {
        await settingsStore.updateAccessibilitySettings({ [key]: value });
      } else if (category === 'practices') {
        await settingsStore.updatePracticeSettings({ [key]: value });
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
          <Pressable
            style={styles.retryButton}
            onPress={() => settingsStore.loadSettings()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading settings"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
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
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="Check-in reminders"
                accessibilityHint="Daily reminders for morning, midday, and evening check-ins"
                accessibilityState={{ checked: settings.notifications.checkInReminders, disabled: isSaving }}
                testID="check-in-reminders-toggle"
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
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="Breathing reminders"
                accessibilityHint="Gentle prompts to practice mindful breathing throughout the day"
                accessibilityState={{ checked: settings.notifications.breathingReminders, disabled: isSaving }}
                testID="breathing-reminders-toggle"
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
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="Values reflection prompts"
                accessibilityHint="Periodic invitations to reflect on your therapeutic values"
                accessibilityState={{ checked: settings.notifications.valuesReflectionPrompts, disabled: isSaving }}
                testID="values-reflection-toggle"
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📝 Note: Notification scheduling will be integrated in a future update. Your preferences are saved.
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
              {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => {
                const label = size === 'xlarge' ? 'extra large' : size;
                return (
                  <Pressable
                    key={size}
                    style={[
                      styles.textSizeButton,
                      settings.accessibility.textSize === size && styles.textSizeButtonActive,
                    ]}
                    onPress={() => handleToggleSetting('accessibility', 'textSize', size)}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel={`Text size: ${label}`}
                    accessibilityState={{
                      selected: settings.accessibility.textSize === size,
                      disabled: isSaving,
                    }}
                  >
                    <Text
                      style={[
                        styles.textSizeButtonText,
                        settings.accessibility.textSize === size && styles.textSizeButtonTextActive,
                      ]}
                      importantForAccessibility="no"
                    >
                      {size === 'xlarge' ? 'XL' : size.charAt(0).toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
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
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="Reduce motion"
                accessibilityHint="Minimize animations and transitions"
                accessibilityState={{ checked: settings.accessibility.reducedMotion, disabled: isSaving }}
                testID="reduced-motion-toggle"
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
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel="High contrast"
                accessibilityHint="Increase color contrast for better visibility"
                accessibilityState={{ checked: settings.accessibility.highContrast, disabled: isSaving }}
                testID="high-contrast-toggle"
              />
            </View>
          </View>
        </View>

        {/* Practices Section — FEAT-285 */}
        {isFeatureEnabled('practice_haptics') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Practices</Text>
            <Text style={styles.sectionDescription}>
              How timed practices guide you
            </Text>

            {/* Master haptics toggle */}
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Haptic Cues</Text>
                  <Text style={styles.settingDescription} testID="haptics-master-description">
                    {hapticCuesDescription}
                  </Text>
                </View>
                <Switch
                  value={settings.practices.practiceHaptics}
                  onValueChange={(value) => handleToggleSetting('practices', 'practiceHaptics', value)}
                  trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                  thumbColor={colorSystem.base.white}
                  disabled={isSaving}
                  accessible={true}
                  accessibilityRole="switch"
                  // The LABEL stays byte-identical whatever the hardware —
                  // mutating it would break find-by-name and rotor search.
                  accessibilityLabel="Haptic cues in practices"
                  accessibilityHint={hapticCuesDescription}
                  accessibilityState={{ checked: settings.practices.practiceHaptics, disabled: isSaving }}
                  testID="haptics-master-toggle"
                />
              </View>
            </View>

            {/*
              Interval cues. Always rendered, disabled when the master is off —
              never hidden. Removing a row from the swipe order on toggle is a
              context change on input (WCAG 3.2.2), and worse, it makes the
              sub-setting undiscoverable to a blind user, who cannot know a row
              exists to be revealed.
            */}
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text
                    style={[
                      styles.settingLabel,
                      !settings.practices.practiceHaptics && styles.settingLabelDisabled,
                    ]}
                  >
                    Interval Cues
                  </Text>
                  <Text style={styles.settingDescription}>
                    A single pulse each minute during reflection and meditation timers
                  </Text>
                </View>
                <Switch
                  value={settings.practices.practiceHapticsInterval === 'minute'}
                  onValueChange={(value) =>
                    handleToggleSetting(
                      'practices',
                      'practiceHapticsInterval',
                      value ? 'minute' : 'none'
                    )
                  }
                  trackColor={{ false: colorSystem.gray[300], true: colorSystem.base.midnightBlue }}
                  thumbColor={colorSystem.base.white}
                  disabled={!settings.practices.practiceHaptics || isSaving}
                  accessible={true}
                  accessibilityRole="switch"
                  // The LABEL never changes — mutating it would break find-by-name
                  // and rotor search. The HINT carries the reason it is dimmed.
                  accessibilityLabel="Interval cues during timed practices"
                  accessibilityHint={
                    settings.practices.practiceHaptics
                      ? 'Vibration marks each minute during reflection and meditation timers'
                      : 'Available when haptic cues are on'
                  }
                  accessibilityState={{
                    checked: settings.practices.practiceHapticsInterval === 'minute',
                    disabled: !settings.practices.practiceHaptics || isSaving,
                  }}
                  testID="haptics-interval-toggle"
                />
              </View>
            </View>
          </View>
        )}

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

        {/* Reset Button */}
        <View style={styles.actionContainer}>
          <Pressable
            style={[styles.dangerButton, isSaving && styles.buttonDisabled]}
            onPress={handleResetSettings}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Reset to defaults"
            accessibilityHint="Resets all settings to their default values"
            accessibilityState={{ disabled: isSaving }}
          >
            <Text style={styles.dangerButtonText}>Reset to Defaults</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[32],
  },
  errorText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.status.error,
    marginBottom: spacing[24],
  },
  retryButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
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
    // MAINT-222: unified content-card radius (xl=16)
    borderRadius: borderRadius.xl,
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
  /**
   * Disabled label treatment (FEAT-285).
   *
   * Deliberately a colour swap, NOT `opacity`. Opacity on a container
   * multiplies through to its text, which is exactly how contrast gets silently
   * broken. This is the same token `settingDescription` below uses and holds AA
   * against the card background; the disabled affordance itself is carried by
   * the Switch's own track colour and the announced state.
   *
   * Read the token, not the raw ramp value: DEBUG-370 pins raw
   * `colorSystem.gray[600]` out of every text position (it clears 3:1 for
   * non-text but not the 4.5:1 text bar on every surface).
   */
  settingLabelDisabled: {
    color: semantic.text.secondary,
  },
  settingDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
  },
  textSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[16],
  },
  textSizeButton: {
    flex: 1,
    minHeight: 44, // ≥44pt tap target (WCAG 2.5.5), verified on iPhone SE
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
    color: semantic.text.secondary,
  },
  textSizeButtonTextActive: {
    color: colorSystem.base.white,
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
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colorSystem.gray[100],
    // MAINT-222: unified content-card radius (xl=16)
    borderRadius: borderRadius.xl,
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
    color: semantic.text.secondary,
  },
  actionContainer: {
    marginTop: spacing[24],
  },
  dangerButton: {
    backgroundColor: colorSystem.base.white,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colorSystem.status.error,
    marginBottom: spacing[16],
  },
  dangerButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.status.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default AppSettingsScreen;
