/**
 * DeviceManagementScreen - Device registration and trust management
 *
 * Features:
 * - List of registered devices with trust status
 * - Device registration flow with security validation
 * - Device removal with confirmation dialog
 * - Trust level indicators (trusted, basic, emergency-only)
 * - Last sync timestamp and sync health per device
 * - Crisis safety: Emergency access never blocked by sync issues
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Platform,
  RefreshControl,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../core/Button';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import {
  DeviceTrustLevel,
  DeviceRegistrationRequest,
  DeviceCapabilities,
  SecurityFeatures
} from '../../types/cross-device-sync';

// Mock device data - in real implementation this would come from sync stores
interface RegisteredDevice {
  id: string;
  name: string;
  platform: 'ios' | 'android';
  trustLevel: DeviceTrustLevel;
  lastSync: string;
  isCurrentDevice: boolean;
  isOnline: boolean;
  appVersion: string;
  capabilities: DeviceCapabilities;
  securityFeatures: SecurityFeatures;
  registeredAt: string;
  syncHealth: 'excellent' | 'good' | 'poor' | 'error';
  syncConflicts: number;
  emergencyCapable: boolean;
}

interface DeviceManagementScreenProps {
  onClose?: () => void;
  showAsModal?: boolean;
  testID?: string;
}

export const DeviceManagementScreen: React.FC<DeviceManagementScreenProps> = React.memo(({
  onClose,
  showAsModal = false,
  testID = 'device-management-screen'
}) => {
  const { colorSystem } = useTheme();
  const { onPress, onSelect, onSuccess, onError } = useCommonHaptics();

  // State management with performance optimization
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<RegisteredDevice | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [allowEmergencyAccess, setAllowEmergencyAccess] = useState(true);

  // Load devices data
  const loadDevices = useCallback(async () => {
    try {
      // Mock data - replace with actual sync service calls
      const mockDevices: RegisteredDevice[] = [
        {
          id: 'device-current',
          name: Platform.OS === 'ios' ? 'iPhone' : 'Android Device',
          platform: Platform.OS as 'ios' | 'android',
          trustLevel: DeviceTrustLevel.FULLY_TRUSTED,
          lastSync: new Date().toISOString(),
          isCurrentDevice: true,
          isOnline: true,
          appVersion: '1.0.0',
          capabilities: {
            emergencyCapable: true,
            biometricCapable: true,
            offlineCapable: true,
            websocketSupported: true,
            compressionSupported: true,
            backgroundSyncSupported: true
          },
          securityFeatures: {
            biometricTypes: ['fingerprint', 'face'],
            encryptionSupported: ['AES-256'],
            keychainAvailable: true,
            deviceLockEnabled: true,
            jailbrokenRooted: false
          },
          registeredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          syncHealth: 'excellent',
          syncConflicts: 0,
          emergencyCapable: true
        },
        {
          id: 'device-tablet',
          name: 'iPad Pro',
          platform: 'ios',
          trustLevel: DeviceTrustLevel.TRUSTED,
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isCurrentDevice: false,
          isOnline: false,
          appVersion: '1.0.0',
          capabilities: {
            emergencyCapable: true,
            biometricCapable: true,
            offlineCapable: true,
            websocketSupported: true,
            compressionSupported: true,
            backgroundSyncSupported: false
          },
          securityFeatures: {
            biometricTypes: ['face'],
            encryptionSupported: ['AES-256'],
            keychainAvailable: true,
            deviceLockEnabled: true,
            jailbrokenRooted: false
          },
          registeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          syncHealth: 'good',
          syncConflicts: 1,
          emergencyCapable: true
        }
      ];

      setDevices(mockDevices);
    } catch (error) {
      console.error('Failed to load devices:', error);
      await onError();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onError]);

  // Initialize data
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Refresh devices
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDevices();
  }, [loadDevices]);

  // Format relative time
  const formatRelativeTime = useCallback((timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diffMs = now - time;

    if (diffMs < 60000) return 'just now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  }, []);

  // Get trust level display
  const getTrustLevelDisplay = useCallback((level: DeviceTrustLevel) => {
    switch (level) {
      case DeviceTrustLevel.FULLY_TRUSTED:
        return { label: 'Fully Trusted', color: colorSystem.status.success };
      case DeviceTrustLevel.TRUSTED:
        return { label: 'Trusted', color: colorSystem.status.info };
      case DeviceTrustLevel.BASIC:
        return { label: 'Basic Access', color: colorSystem.status.warning };
      case DeviceTrustLevel.EMERGENCY_ONLY:
        return { label: 'Emergency Only', color: colorSystem.status.critical };
      case DeviceTrustLevel.UNTRUSTED:
      default:
        return { label: 'Untrusted', color: colorSystem.gray[500] };
    }
  }, [colorSystem]);

  // Get sync health display
  const getSyncHealthDisplay = useCallback((health: RegisteredDevice['syncHealth']) => {
    switch (health) {
      case 'excellent':
        return { label: 'Excellent', color: colorSystem.status.success, icon: '●' };
      case 'good':
        return { label: 'Good', color: colorSystem.status.info, icon: '●' };
      case 'poor':
        return { label: 'Poor', color: colorSystem.status.warning, icon: '●' };
      case 'error':
        return { label: 'Error', color: colorSystem.status.error, icon: '●' };
    }
  }, [colorSystem]);

  // Handle device removal
  const handleRemoveDevice = useCallback(async (device: RegisteredDevice) => {
    if (device.isCurrentDevice) {
      Alert.alert(
        'Cannot Remove Current Device',
        'You cannot remove the device you are currently using.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove Device',
      `Are you sure you want to remove "${device.name}"? This will revoke all access and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await onSelect();
              // In real implementation, call device removal service
              setDevices(prev => prev.filter(d => d.id !== device.id));
              await onSuccess();
            } catch (error) {
              console.error('Failed to remove device:', error);
              await onError();
            }
          }
        }
      ]
    );
  }, [onSelect, onSuccess, onError]);

  // Handle trust level change
  const handleTrustLevelChange = useCallback(async (device: RegisteredDevice, newLevel: DeviceTrustLevel) => {
    try {
      await onSelect();

      // In real implementation, call trust level update service
      setDevices(prev => prev.map(d =>
        d.id === device.id ? { ...d, trustLevel: newLevel } : d
      ));

      await onSuccess();
    } catch (error) {
      console.error('Failed to update trust level:', error);
      await onError();
    }
  }, [onSelect, onSuccess, onError]);

  // Handle device registration
  const handleAddDevice = useCallback(async () => {
    if (!newDeviceName.trim()) {
      Alert.alert('Device Name Required', 'Please enter a name for the new device.');
      return;
    }

    try {
      await onPress();

      // Mock device registration - in real implementation, this would involve
      // generating QR codes, pairing flows, etc.
      const newDevice: RegisteredDevice = {
        id: `device-${Date.now()}`,
        name: newDeviceName.trim(),
        platform: 'ios', // Would be detected during registration
        trustLevel: DeviceTrustLevel.BASIC,
        lastSync: 'Never',
        isCurrentDevice: false,
        isOnline: false,
        appVersion: '1.0.0',
        capabilities: {
          emergencyCapable: allowEmergencyAccess,
          biometricCapable: true,
          offlineCapable: true,
          websocketSupported: true,
          compressionSupported: true,
          backgroundSyncSupported: true
        },
        securityFeatures: {
          biometricTypes: ['fingerprint'],
          encryptionSupported: ['AES-256'],
          keychainAvailable: true,
          deviceLockEnabled: true,
          jailbrokenRooted: false
        },
        registeredAt: new Date().toISOString(),
        syncHealth: 'good',
        syncConflicts: 0,
        emergencyCapable: allowEmergencyAccess
      };

      setDevices(prev => [...prev, newDevice]);
      setNewDeviceName('');
      setShowAddDeviceModal(false);
      await onSuccess();
    } catch (error) {
      console.error('Failed to add device:', error);
      await onError();
    }
  }, [newDeviceName, allowEmergencyAccess, onPress, onSuccess, onError]);

  // Optimized device card renderer with memoization for FlatList
  const renderDeviceCard = useCallback(({ item: device }: { item: RegisteredDevice }) => {
    const trustDisplay = getTrustLevelDisplay(device.trustLevel);
    const healthDisplay = getSyncHealthDisplay(device.syncHealth);

    return (
      <View
        style={[
          styles.deviceCard,
          { backgroundColor: colorSystem.base.white, borderColor: colorSystem.gray[300] },
          device.isCurrentDevice && { borderColor: colorSystem.status.info, borderWidth: 2 }
        ]}
      >
        <View style={styles.deviceHeader}>
          <View style={styles.deviceInfo}>
            <View style={styles.deviceNameRow}>
              <Text style={[styles.deviceName, { color: colorSystem.accessibility.text.primary }]}>
                {device.name}
              </Text>
              {device.isCurrentDevice && (
                <View style={[styles.currentDeviceBadge, { backgroundColor: colorSystem.status.info }]}>
                  <Text style={styles.currentDeviceBadgeText}>Current</Text>
                </View>
              )}
            </View>
            <Text style={[styles.devicePlatform, { color: colorSystem.accessibility.text.secondary }]}>
              {device.platform === 'ios' ? 'iOS' : 'Android'} • v{device.appVersion}
            </Text>
          </View>

          <View style={styles.deviceStatus}>
            <View style={[styles.onlineIndicator, {
              backgroundColor: device.isOnline ? colorSystem.status.success : colorSystem.gray[400]
            }]} />
            <Text style={[styles.onlineText, { color: colorSystem.accessibility.text.tertiary }]}>
              {device.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.deviceDetails}>
          <View style={styles.trustSection}>
            <Text style={[styles.trustLabel, { color: colorSystem.accessibility.text.secondary }]}>
              Trust Level
            </Text>
            <TouchableOpacity
              style={[styles.trustBadge, { backgroundColor: `${trustDisplay.color}20`, borderColor: trustDisplay.color }]}
              onPress={() => {
                // Show trust level options
                Alert.alert(
                  'Change Trust Level',
                  `Current: ${trustDisplay.label}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Basic Access', onPress: () => handleTrustLevelChange(device, DeviceTrustLevel.BASIC) },
                    { text: 'Trusted', onPress: () => handleTrustLevelChange(device, DeviceTrustLevel.TRUSTED) },
                    { text: 'Fully Trusted', onPress: () => handleTrustLevelChange(device, DeviceTrustLevel.FULLY_TRUSTED) }
                  ]
                );
              }}
            >
              <Text style={[styles.trustText, { color: trustDisplay.color }]}>
                {trustDisplay.label}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.syncSection}>
            <View style={styles.syncHealth}>
              <Text style={[styles.syncHealthIcon, { color: healthDisplay.color }]}>
                {healthDisplay.icon}
              </Text>
              <Text style={[styles.syncHealthText, { color: colorSystem.accessibility.text.secondary }]}>
                {healthDisplay.label}
              </Text>
            </View>

            <Text style={[styles.lastSync, { color: colorSystem.accessibility.text.tertiary }]}>
              Last sync: {device.lastSync === 'Never' ? 'Never' : formatRelativeTime(device.lastSync)}
            </Text>
          </View>
        </View>

        {device.syncConflicts > 0 && (
          <View style={[styles.conflictWarning, { backgroundColor: colorSystem.status.warningBackground }]}>
            <Text style={[styles.conflictText, { color: colorSystem.status.warning }]}>
              {device.syncConflicts} sync conflict{device.syncConflicts !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {device.emergencyCapable && (
          <View style={[styles.emergencyBadge, { backgroundColor: colorSystem.status.criticalBackground }]}>
            <Text style={[styles.emergencyText, { color: colorSystem.status.critical }]}>
              🚨 Emergency Access Enabled
            </Text>
          </View>
        )}

        {!device.isCurrentDevice && (
          <View style={styles.deviceActions}>
            <Button
              variant="outline"
              onPress={() => handleRemoveDevice(device)}
              style={styles.removeButton}
              accessibilityLabel={`Remove ${device.name}`}
              accessibilityHint="Removes this device and revokes all access"
            >
              Remove Device
            </Button>
          </View>
        )}
      </View>
    );
  }, [colorSystem, getTrustLevelDisplay, getSyncHealthDisplay, formatRelativeTime, handleTrustLevelChange, handleRemoveDevice]);

  // Optimized key extractor for FlatList performance
  const keyExtractor = useCallback((device: RegisteredDevice) => device.id, []);

  // FlatList optimization props
  const getItemLayout = useCallback((data: RegisteredDevice[] | null | undefined, index: number) => ({
    length: 120, // Estimated device card height
    offset: 120 * index,
    index,
  }), []);

  // Render add device modal
  const renderAddDeviceModal = () => (
    <Modal
      visible={showAddDeviceModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddDeviceModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddDeviceModal(false)}>
            <Text style={[styles.modalCancelButton, { color: colorSystem.status.info }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colorSystem.accessibility.text.primary }]}>
            Add Device
          </Text>
          <View style={styles.modalPlaceholder} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.modalDescription, { color: colorSystem.accessibility.text.secondary }]}>
            To add a new device, you'll need to install the FullMind app on the target device and scan a QR code to establish a secure connection.
          </Text>

          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colorSystem.accessibility.text.primary }]}>
              Device Name
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colorSystem.gray[100],
                  borderColor: colorSystem.gray[300],
                  color: colorSystem.accessibility.text.primary
                }
              ]}
              value={newDeviceName}
              onChangeText={setNewDeviceName}
              placeholder="e.g., iPad, Work Phone"
              placeholderTextColor={colorSystem.accessibility.text.tertiary}
              accessibilityLabel="Device name"
              accessibilityHint="Enter a name to identify this device"
            />
          </View>

          <View style={styles.switchSection}>
            <View style={styles.switchContent}>
              <Text style={[styles.switchLabel, { color: colorSystem.accessibility.text.primary }]}>
                Emergency Access
              </Text>
              <Text style={[styles.switchDescription, { color: colorSystem.accessibility.text.secondary }]}>
                Allow this device to access crisis features even when sync is limited
              </Text>
            </View>
            <Switch
              value={allowEmergencyAccess}
              onValueChange={setAllowEmergencyAccess}
              trackColor={{ false: colorSystem.gray[300], true: colorSystem.status.critical }}
              thumbColor={allowEmergencyAccess ? colorSystem.base.white : colorSystem.gray[400]}
            />
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <Button
            variant="primary"
            onPress={handleAddDevice}
            disabled={!newDeviceName.trim()}
            accessibilityLabel="Add device"
            accessibilityHint="Creates a new device registration"
          >
            Add Device
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Main content
  const content = (
    <View style={[styles.container, { backgroundColor: colorSystem.gray[50] }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colorSystem.accessibility.text.primary }]}>
          Device Management
        </Text>
        <Text style={[styles.subtitle, { color: colorSystem.accessibility.text.secondary }]}>
          Manage devices with access to your FullMind data
        </Text>
      </View>

      <FlatList
        style={styles.content}
        data={devices}
        renderItem={renderDeviceCard}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        ListFooterComponent={
          <TouchableOpacity
            style={[styles.addDeviceButton, { backgroundColor: colorSystem.status.infoBackground }]}
            onPress={() => setShowAddDeviceModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Add new device"
            accessibilityHint="Opens the device registration flow"
          >
            <Text style={[styles.addDeviceIcon, { color: colorSystem.status.info }]}>+</Text>
            <Text style={[styles.addDeviceText, { color: colorSystem.status.info }]}>
              Add New Device
            </Text>
          </TouchableOpacity>
        }
      />

      {renderAddDeviceModal()}
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
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.modalCancelButton, { color: colorSystem.status.info }]}>
                Done
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colorSystem.accessibility.text.primary }]}>
              Device Management
            </Text>
            <View style={styles.modalPlaceholder} />
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
    prevProps.showAsModal === nextProps.showAsModal &&
    prevProps.testID === nextProps.testID &&
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
  listFooter: {
    paddingBottom: spacing.xl,
  },
  deviceCard: {
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  deviceName: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  currentDeviceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.small,
  },
  currentDeviceBadgeText: {
    color: 'white',
    fontSize: typography.micro.size,
    fontWeight: '600',
  },
  devicePlatform: {
    fontSize: typography.caption.size,
  },
  deviceStatus: {
    alignItems: 'flex-end',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  onlineText: {
    fontSize: typography.micro.size,
  },
  deviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  trustSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  trustLabel: {
    fontSize: typography.caption.size,
    marginBottom: spacing.xs,
  },
  trustBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  trustText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  syncSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  syncHealth: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  syncHealthIcon: {
    fontSize: 12,
    marginRight: spacing.xs,
  },
  syncHealthText: {
    fontSize: typography.caption.size,
  },
  lastSync: {
    fontSize: typography.micro.size,
  },
  conflictWarning: {
    padding: spacing.sm,
    borderRadius: borderRadius.small,
    marginBottom: spacing.sm,
  },
  conflictText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
  },
  emergencyBadge: {
    padding: spacing.sm,
    borderRadius: borderRadius.small,
    marginBottom: spacing.sm,
  },
  emergencyText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  deviceActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: spacing.sm,
  },
  removeButton: {
    marginBottom: 0,
  },
  addDeviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.xl,
  },
  addDeviceIcon: {
    fontSize: 24,
    fontWeight: '300',
    marginRight: spacing.sm,
  },
  addDeviceText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
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
  modalCancelButton: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
  },
  modalPlaceholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  modalDescription: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.xl,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    fontSize: typography.bodyRegular.size,
  },
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  switchContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  switchDescription: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.size * 1.3,
  },
  modalActions: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});

export default DeviceManagementScreen;