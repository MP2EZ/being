/**
 * SyncSettingsPanel - User preferences for sync configuration
 *
 * Features:
 * - User preferences for sync frequency and scope
 * - Battery optimization settings
 * - Data type sync preferences (assessments, progress, settings)
 * - Privacy controls for data sharing across devices
 * - Emergency access settings configuration
 * - Crisis safety: Emergency access always preserved
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../core/Button';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';

// Sync preferences interface
interface SyncPreferences {
  // General sync settings
  syncEnabled: boolean;
  autoSyncEnabled: boolean;
  syncFrequency: 'realtime' | 'frequent' | 'normal' | 'conservative';

  // Data type preferences
  dataTypes: {
    assessments: boolean;
    checkIns: boolean;
    userProfile: boolean;
    crisisPlans: boolean;
    sessionData: boolean;
    preferences: boolean;
  };

  // Network and battery optimization
  wifiOnlySync: boolean;
  batteryOptimization: boolean;
  lowPowerModeSync: boolean;
  compressionEnabled: boolean;

  // Privacy and security
  encryptionLevel: 'standard' | 'enhanced' | 'maximum';
  allowBackgroundSync: boolean;
  shareAnonymousUsage: boolean;
  requireBiometric: boolean;

  // Emergency settings
  emergencyAccess: {
    enabled: boolean;
    allowEmergencySync: boolean;
    emergencyContacts: boolean;
    crisisDataPriority: boolean;
  };

  // Advanced settings
  maxDevices: number;
  syncTimeout: number;
  conflictResolution: 'ask' | 'auto' | 'manual';
  debugLogging: boolean;
}

interface SyncSettingsPanelProps {
  preferences: SyncPreferences;
  onPreferencesChange: (preferences: SyncPreferences) => void;
  onClose?: () => void;
  showAsModal?: boolean;
  testID?: string;
}

export const SyncSettingsPanel: React.FC<SyncSettingsPanelProps> = React.memo(({
  preferences,
  onPreferencesChange,
  onClose,
  showAsModal = false,
  testID = 'sync-settings-panel'
}) => {
  const { colorSystem } = useTheme();
  const { onPress, onSelect, onSuccess, onWarning } = useCommonHaptics();

  // Local state for editing with performance optimization
  const [editedPreferences, setEditedPreferences] = useState<SyncPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced change tracking for performance
  const changeTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    changeTimeoutRef.current = setTimeout(() => {
      const hasChanges = JSON.stringify(editedPreferences) !== JSON.stringify(preferences);
      setHasChanges(hasChanges);
    }, 100); // 100ms debounce

    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, [editedPreferences, preferences]);

  // Update preference helper
  const updatePreference = useCallback(<K extends keyof SyncPreferences>(
    key: K,
    value: SyncPreferences[K]
  ) => {
    setEditedPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update nested preference helper
  const updateNestedPreference = useCallback(<
    K extends keyof SyncPreferences,
    NK extends keyof SyncPreferences[K]
  >(
    key: K,
    nestedKey: NK,
    value: SyncPreferences[K][NK]
  ) => {
    setEditedPreferences(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [nestedKey]: value
      }
    }));
  }, []);

  // Handle save preferences
  const handleSave = useCallback(async () => {
    try {
      await onPress();

      // Validate critical settings
      if (!editedPreferences.emergencyAccess.enabled) {
        Alert.alert(
          'Emergency Access Warning',
          'Disabling emergency access may prevent crisis features from working properly. Are you sure?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              style: 'destructive',
              onPress: async () => {
                onPreferencesChange(editedPreferences);
                await onSuccess();
                onClose?.();
              }
            }
          ]
        );
        return;
      }

      onPreferencesChange(editedPreferences);
      await onSuccess();
      onClose?.();
    } catch (error) {
      console.error('Failed to save sync preferences:', error);
      await onWarning();
    }
  }, [editedPreferences, onPress, onSuccess, onWarning, onPreferencesChange, onClose]);

  // Handle reset to defaults
  const handleReset = useCallback(async () => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset all sync settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await onSelect();
            const defaultPreferences: SyncPreferences = {
              syncEnabled: true,
              autoSyncEnabled: true,
              syncFrequency: 'normal',
              dataTypes: {
                assessments: true,
                checkIns: true,
                userProfile: true,
                crisisPlans: true,
                sessionData: true,
                preferences: true
              },
              wifiOnlySync: false,
              batteryOptimization: true,
              lowPowerModeSync: false,
              compressionEnabled: true,
              encryptionLevel: 'enhanced',
              allowBackgroundSync: true,
              shareAnonymousUsage: false,
              requireBiometric: false,
              emergencyAccess: {
                enabled: true,
                allowEmergencySync: true,
                emergencyContacts: true,
                crisisDataPriority: true
              },
              maxDevices: 5,
              syncTimeout: 30,
              conflictResolution: 'ask',
              debugLogging: false
            };
            setEditedPreferences(defaultPreferences);
          }
        }
      ]
    );
  }, [onSelect]);

  // Get frequency display
  const getFrequencyDisplay = useCallback((frequency: SyncPreferences['syncFrequency']) => {
    switch (frequency) {
      case 'realtime':
        return { label: 'Real-time', description: 'Instant sync (uses more battery)' };
      case 'frequent':
        return { label: 'Frequent', description: 'Every few minutes' };
      case 'normal':
        return { label: 'Normal', description: 'Balanced performance and battery' };
      case 'conservative':
        return { label: 'Conservative', description: 'Hourly sync (saves battery)' };
    }
  }, []);

  // Get encryption level display
  const getEncryptionDisplay = useCallback((level: SyncPreferences['encryptionLevel']) => {
    switch (level) {
      case 'standard':
        return { label: 'Standard', description: 'AES-256 encryption' };
      case 'enhanced':
        return { label: 'Enhanced', description: 'End-to-end with key rotation' };
      case 'maximum':
        return { label: 'Maximum', description: 'Zero-knowledge encryption' };
    }
  }, []);

  // Render setting row
  const renderSettingRow = useCallback((
    title: string,
    description: string,
    value: boolean,
    onChange: (value: boolean) => void,
    disabled: boolean = false,
    warning?: string
  ) => (
    <View style={[styles.settingRow, disabled && styles.disabledRow]}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colorSystem.accessibility.text.primary }]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, { color: colorSystem.accessibility.text.secondary }]}>
          {description}
        </Text>
        {warning && (
          <Text style={[styles.settingWarning, { color: colorSystem.status.warning }]}>
            ⚠️ {warning}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colorSystem.gray[300], true: colorSystem.status.success }}
        thumbColor={value ? colorSystem.base.white : colorSystem.gray[400]}
      />
    </View>
  ), [colorSystem]);

  // Render selection row
  const renderSelectionRow = useCallback((
    title: string,
    description: string,
    options: Array<{ value: string; label: string; description: string }>,
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colorSystem.accessibility.text.primary }]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, { color: colorSystem.accessibility.text.secondary }]}>
          {description}
        </Text>
      </View>
      <View style={styles.selectionContainer}>
        {options.map(option => (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.selectionOption,
              {
                backgroundColor: selectedValue === option.value
                  ? colorSystem.status.infoBackground
                  : colorSystem.gray[100],
                borderColor: selectedValue === option.value
                  ? colorSystem.status.info
                  : colorSystem.gray[300]
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.selectionOptionText,
              {
                color: selectedValue === option.value
                  ? colorSystem.status.info
                  : colorSystem.accessibility.text.primary
              }
            ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  ), [colorSystem]);

  // Render section
  const renderSection = useCallback((title: string, children: React.ReactNode, icon?: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && <Text style={styles.sectionIcon}>{icon}</Text>}
        <Text style={[styles.sectionTitle, { color: colorSystem.accessibility.text.primary }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  ), [colorSystem]);

  // Main content
  const content = (
    <View style={[styles.container, { backgroundColor: colorSystem.gray[50] }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colorSystem.accessibility.text.primary }]}>
          Sync Settings
        </Text>
        <Text style={[styles.subtitle, { color: colorSystem.accessibility.text.secondary }]}>
          Configure how your data syncs across devices
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Sync Settings */}
        {renderSection('General', (
          <>
            {renderSettingRow(
              'Enable Sync',
              'Allow data synchronization across your devices',
              editedPreferences.syncEnabled,
              (value) => updatePreference('syncEnabled', value)
            )}

            {renderSettingRow(
              'Automatic Sync',
              'Automatically sync data in the background',
              editedPreferences.autoSyncEnabled,
              (value) => updatePreference('autoSyncEnabled', value),
              !editedPreferences.syncEnabled
            )}

            {editedPreferences.syncEnabled && (
              renderSelectionRow(
                'Sync Frequency',
                'How often to sync your data',
                [
                  { value: 'realtime', ...getFrequencyDisplay('realtime') },
                  { value: 'frequent', ...getFrequencyDisplay('frequent') },
                  { value: 'normal', ...getFrequencyDisplay('normal') },
                  { value: 'conservative', ...getFrequencyDisplay('conservative') }
                ],
                editedPreferences.syncFrequency,
                (value) => updatePreference('syncFrequency', value as SyncPreferences['syncFrequency'])
              )
            )}
          </>
        ), '⚙️')}

        {/* Data Types */}
        {renderSection('Data Types', (
          <>
            {renderSettingRow(
              'Assessments (PHQ-9, GAD-7)',
              'Sync clinical assessment results',
              editedPreferences.dataTypes.assessments,
              (value) => updateNestedPreference('dataTypes', 'assessments', value),
              false,
              'Clinical assessments should sync for continuity of care'
            )}

            {renderSettingRow(
              'Daily Check-ins',
              'Sync mood tracking and MBCT progress',
              editedPreferences.dataTypes.checkIns,
              (value) => updateNestedPreference('dataTypes', 'checkIns', value)
            )}

            {renderSettingRow(
              'Crisis Plans',
              'Sync safety plans and emergency contacts',
              editedPreferences.dataTypes.crisisPlans,
              (value) => updateNestedPreference('dataTypes', 'crisisPlans', value),
              false,
              'Crisis plans must sync for safety'
            )}

            {renderSettingRow(
              'Session Data',
              'Sync guided meditation and exercise progress',
              editedPreferences.dataTypes.sessionData,
              (value) => updateNestedPreference('dataTypes', 'sessionData', value)
            )}

            {renderSettingRow(
              'User Profile',
              'Sync personal information and preferences',
              editedPreferences.dataTypes.userProfile,
              (value) => updateNestedPreference('dataTypes', 'userProfile', value)
            )}

            {renderSettingRow(
              'App Preferences',
              'Sync settings and customizations',
              editedPreferences.dataTypes.preferences,
              (value) => updateNestedPreference('dataTypes', 'preferences', value)
            )}
          </>
        ), '📊')}

        {/* Network & Battery */}
        {renderSection('Network & Battery', (
          <>
            {renderSettingRow(
              'Wi-Fi Only Sync',
              'Only sync when connected to Wi-Fi',
              editedPreferences.wifiOnlySync,
              (value) => updatePreference('wifiOnlySync', value)
            )}

            {renderSettingRow(
              'Battery Optimization',
              'Reduce sync frequency when battery is low',
              editedPreferences.batteryOptimization,
              (value) => updatePreference('batteryOptimization', value)
            )}

            {renderSettingRow(
              'Low Power Mode Sync',
              'Continue syncing in low power mode',
              editedPreferences.lowPowerModeSync,
              (value) => updatePreference('lowPowerModeSync', value),
              false,
              'May impact battery life'
            )}

            {renderSettingRow(
              'Data Compression',
              'Compress data to reduce bandwidth usage',
              editedPreferences.compressionEnabled,
              (value) => updatePreference('compressionEnabled', value)
            )}
          </>
        ), '🔋')}

        {/* Privacy & Security */}
        {renderSection('Privacy & Security', (
          <>
            {renderSelectionRow(
              'Encryption Level',
              'Level of encryption for synced data',
              [
                { value: 'standard', ...getEncryptionDisplay('standard') },
                { value: 'enhanced', ...getEncryptionDisplay('enhanced') },
                { value: 'maximum', ...getEncryptionDisplay('maximum') }
              ],
              editedPreferences.encryptionLevel,
              (value) => updatePreference('encryptionLevel', value as SyncPreferences['encryptionLevel'])
            )}

            {renderSettingRow(
              'Background Sync',
              'Allow sync to continue when app is in background',
              editedPreferences.allowBackgroundSync,
              (value) => updatePreference('allowBackgroundSync', value)
            )}

            {renderSettingRow(
              'Require Biometric',
              'Require biometric authentication for sync operations',
              editedPreferences.requireBiometric,
              (value) => updatePreference('requireBiometric', value)
            )}

            {renderSettingRow(
              'Share Anonymous Usage',
              'Help improve sync performance with anonymous usage data',
              editedPreferences.shareAnonymousUsage,
              (value) => updatePreference('shareAnonymousUsage', value)
            )}
          </>
        ), '🔒')}

        {/* Emergency Access */}
        {renderSection('Emergency Access', (
          <>
            {renderSettingRow(
              'Emergency Access',
              'Enable emergency access to sync features',
              editedPreferences.emergencyAccess.enabled,
              (value) => updateNestedPreference('emergencyAccess', 'enabled', value),
              false,
              'Required for crisis response features'
            )}

            {renderSettingRow(
              'Emergency Sync',
              'Allow sync during emergency mode',
              editedPreferences.emergencyAccess.allowEmergencySync,
              (value) => updateNestedPreference('emergencyAccess', 'allowEmergencySync', value),
              !editedPreferences.emergencyAccess.enabled
            )}

            {renderSettingRow(
              'Emergency Contacts Sync',
              'Sync emergency contact information',
              editedPreferences.emergencyAccess.emergencyContacts,
              (value) => updateNestedPreference('emergencyAccess', 'emergencyContacts', value),
              !editedPreferences.emergencyAccess.enabled
            )}

            {renderSettingRow(
              'Crisis Data Priority',
              'Give crisis-related data highest sync priority',
              editedPreferences.emergencyAccess.crisisDataPriority,
              (value) => updateNestedPreference('emergencyAccess', 'crisisDataPriority', value),
              !editedPreferences.emergencyAccess.enabled
            )}
          </>
        ), '🚨')}

        {/* Advanced Settings */}
        <Pressable
          style={({ pressed }) => [
            styles.advancedToggle,
            pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
          ]}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={[styles.advancedToggleText, { color: colorSystem.status.info }]}>
            {showAdvanced ? '▼' : '▶'} Advanced Settings
          </Text>
        </Pressable>

        {showAdvanced && renderSection('Advanced', (
          <>
            {renderSelectionRow(
              'Conflict Resolution',
              'How to handle sync conflicts',
              [
                { value: 'ask', label: 'Ask Me', description: 'Always ask how to resolve conflicts' },
                { value: 'auto', label: 'Auto-resolve', description: 'Use smart suggestions when possible' },
                { value: 'manual', label: 'Manual Only', description: 'Never auto-resolve conflicts' }
              ],
              editedPreferences.conflictResolution,
              (value) => updatePreference('conflictResolution', value as SyncPreferences['conflictResolution'])
            )}

            {renderSettingRow(
              'Debug Logging',
              'Enable detailed sync logging for troubleshooting',
              editedPreferences.debugLogging,
              (value) => updatePreference('debugLogging', value),
              false,
              'May impact performance'
            )}
          </>
        ), '⚙️')}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Button
          variant="outline"
          onPress={handleReset}
          style={styles.resetButton}
          accessibilityLabel="Reset to default settings"
          accessibilityHint="Resets all sync settings to their default values"
        >
          Reset to Defaults
        </Button>

        <Button
          variant="primary"
          onPress={handleSave}
          disabled={!hasChanges}
          style={styles.saveButton}
          accessibilityLabel="Save sync settings"
          accessibilityHint="Saves the current sync configuration"
        >
          Save Settings
        </Button>
      </View>
    </View>
  );

  // Render as modal or screen
  if (showAsModal) {
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.fullScreen}>
          <View style={styles.modalHeader}>
            <Pressable 
              onPress={onClose}
              style={({ pressed }) => [
                pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
              ]}
            >
              <Text style={[styles.modalCloseButton, { color: colorSystem.status.info }]}>
                {hasChanges ? 'Cancel' : 'Done'}
              </Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colorSystem.accessibility.text.primary }]}>
              Sync Settings
            </Text>
            <Pressable 
              onPress={handleSave} 
              disabled={!hasChanges}
              style={({ pressed }) => [
                pressed && !hasChanges && { opacity: 0.8, transform: [{ scale: 0.96 }] }
              ]}
            >
              <Text style={[
                styles.modalSaveButton,
                {
                  color: hasChanges ? colorSystem.status.info : colorSystem.gray[400]
                }
              ]}>
                Save
              </Text>
            </Pressable>
          </View>
          {content}
        </SafeAreaView>
      </Modal>
    );
  }

  return <SafeAreaView style={styles.fullScreen}>{content}</SafeAreaView>;
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo optimization
  return (
    JSON.stringify(prevProps.preferences) === JSON.stringify(nextProps.preferences) &&
    prevProps.showAsModal === nextProps.showAsModal &&
    prevProps.onPreferencesChange === nextProps.onPreferencesChange &&
    prevProps.onClose === nextProps.onClose
  );
});

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.size * 1.3,
  },
  settingWarning: {
    fontSize: typography.caption.size,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  selectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  selectionOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    borderWidth: 1,
  },
  selectionOptionText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  advancedToggle: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  advancedToggleText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  resetButton: {
    flex: 1,
    marginBottom: 0,
  },
  saveButton: {
    flex: 2,
    marginBottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalCloseButton: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
  },
  modalSaveButton: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
  },
});

export default SyncSettingsPanel;