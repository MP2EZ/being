/**
 * SyncComponentsDemo - Comprehensive demo showcasing all sync UI components
 *
 * This demo provides examples of all sync components working together:
 * - SyncStatusIndicator with different states
 * - DeviceManagementScreen integration
 * - SyncConflictResolver with sample conflicts
 * - CrisisSyncBadge with various crisis states
 * - SyncSettingsPanel configuration
 *
 * Used for development, testing, and component showcase
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../core/Button';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';

// Import all sync components
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { DeviceManagementScreen } from './DeviceManagementScreen';
import { SyncConflictResolver } from './SyncConflictResolver';
import { CrisisSyncBadge } from './CrisisSyncBadge';
import { SyncSettingsPanel } from './SyncSettingsPanel';

// Mock data for demonstrations
const mockSyncStatus = {
  status: 'synced' as const,
  lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  conflictCount: 2,
  isPriorityCrisisData: false,
  syncProgress: undefined,
  errorMessage: undefined,
  deviceCount: 3
};

const mockCrisisState = {
  active: true,
  level: 'confirmed' as const,
  source: 'phq9' as const,
  timestamp: new Date().toISOString(),
  dataTypes: ['assessment', 'crisis_plan'] as const,
  syncStatus: 'syncing' as const,
  priority: 'critical' as const
};

const mockConflicts = [
  {
    id: 'conflict-1',
    entityType: 'assessment',
    entityId: 'phq9-latest',
    conflictType: 'VERSION_MISMATCH' as const,
    localVersion: 3,
    remoteVersion: 4,
    localData: { score: 18, completedAt: '2024-01-15T10:00:00Z' },
    remoteData: { score: 16, completedAt: '2024-01-15T10:05:00Z' },
    detectedAt: new Date().toISOString(),
    autoResolvable: true,
    clinicalRelevant: true,
    domainPriority: 'crisis' as const,
    userImpact: 'high' as const,
    smartSuggestion: {
      strategy: 'client_wins' as const,
      confidence: 0.85,
      reasoning: 'Local version has higher crisis score and should take priority for safety'
    },
    previewData: {
      localPreview: 'PHQ-9 Score: 18 (Severe depression)',
      remotePreview: 'PHQ-9 Score: 16 (Moderately severe depression)',
      mergedPreview: 'Use highest score for safety: 18'
    }
  },
  {
    id: 'conflict-2',
    entityType: 'checkin',
    entityId: 'morning-checkin-today',
    conflictType: 'DATA_DIVERGENCE' as const,
    localVersion: 1,
    remoteVersion: 1,
    localData: { mood: 7, energy: 6, stress: 4 },
    remoteData: { mood: 6, energy: 5, stress: 5 },
    detectedAt: new Date().toISOString(),
    autoResolvable: false,
    clinicalRelevant: false,
    domainPriority: 'therapeutic' as const,
    userImpact: 'medium' as const,
    previewData: {
      localPreview: 'Mood: 7, Energy: 6, Stress: 4',
      remotePreview: 'Mood: 6, Energy: 5, Stress: 5'
    }
  }
];

const mockSyncPreferences = {
  syncEnabled: true,
  autoSyncEnabled: true,
  syncFrequency: 'normal' as const,
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
  encryptionLevel: 'enhanced' as const,
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
  conflictResolution: 'ask' as const,
  debugLogging: false
};

interface SyncComponentsDemoProps {
  onClose?: () => void;
}

export const SyncComponentsDemo: React.FC<SyncComponentsDemoProps> = ({
  onClose
}) => {
  const { colorSystem } = useTheme();
  const { onPress, onSelect } = useCommonHaptics();

  // Demo state
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState(mockSyncStatus);
  const [crisisState, setCrisisState] = useState(mockCrisisState);
  const [conflicts, setConflicts] = useState(mockConflicts);
  const [syncPreferences, setSyncPreferences] = useState(mockSyncPreferences);

  // Handle sync status changes
  const cycleSyncStatus = useCallback(async () => {
    await onSelect();
    const statuses = ['syncing', 'synced', 'error', 'offline', 'crisis-priority'] as const;
    const currentIndex = statuses.indexOf(syncStatus.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    setSyncStatus(prev => ({
      ...prev,
      status: nextStatus,
      isPriorityCrisisData: nextStatus === 'crisis-priority',
      conflictCount: nextStatus === 'error' ? 3 : nextStatus === 'synced' ? 0 : prev.conflictCount,
      errorMessage: nextStatus === 'error' ? 'Network timeout' : undefined,
      syncProgress: nextStatus === 'syncing' ? 65 : undefined
    }));
  }, [syncStatus.status, onSelect]);

  // Handle crisis state changes
  const cycleCrisisState = useCallback(async () => {
    await onSelect();
    const levels = ['none', 'detected', 'confirmed', 'emergency'] as const;
    const currentIndex = levels.indexOf(crisisState.level);
    const nextLevel = levels[(currentIndex + 1) % levels.length];

    setCrisisState(prev => ({
      ...prev,
      level: nextLevel,
      active: nextLevel !== 'none',
      priority: nextLevel === 'emergency' ? 'immediate' as const : 'critical' as const
    }));
  }, [crisisState.level, onSelect]);

  // Handle conflict resolution
  const handleResolveConflict = useCallback(async (conflictId: string, resolution: any) => {
    await onPress();
    setConflicts(prev => prev.filter(c => c.id !== conflictId));
    Alert.alert('Conflict Resolved', `Conflict ${conflictId} resolved using ${resolution.strategy}`);
  }, [onPress]);

  // Handle resolve all conflicts
  const handleResolveAllConflicts = useCallback(async (resolutions: any[]) => {
    await onPress();
    setConflicts([]);
    Alert.alert('All Conflicts Resolved', `${resolutions.length} conflicts resolved automatically`);
  }, [onPress]);

  // Render demo section
  const renderDemoSection = useCallback((
    title: string,
    description: string,
    children: React.ReactNode,
    actions?: React.ReactNode
  ) => (
    <View style={[styles.demoSection, { backgroundColor: colorSystem.base.white }]}>
      <View style={styles.demoHeader}>
        <Text style={[styles.demoTitle, { color: colorSystem.accessibility.text.primary }]}>
          {title}
        </Text>
        <Text style={[styles.demoDescription, { color: colorSystem.accessibility.text.secondary }]}>
          {description}
        </Text>
      </View>

      <View style={styles.demoContent}>
        {children}
      </View>

      {actions && (
        <View style={styles.demoActions}>
          {actions}
        </View>
      )}
    </View>
  ), [colorSystem]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colorSystem.accessibility.text.primary }]}>
          Sync Components Demo
        </Text>
        <Text style={[styles.subtitle, { color: colorSystem.accessibility.text.secondary }]}>
          Interactive demonstration of all cross-device sync UI components
        </Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: colorSystem.status.info }]}>
              Close Demo
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* SyncStatusIndicator Demo */}
        {renderDemoSection(
          'Sync Status Indicator',
          'Real-time sync status display with crisis priority and conflict indicators',
          <View style={styles.statusIndicatorDemo}>
            <SyncStatusIndicator
              status={syncStatus}
              onConflictsTap={() => Alert.alert('Conflicts', 'Navigate to conflict resolver')}
              onStatusTap={() => Alert.alert('Status', 'Show detailed sync information')}
              placement="bottom"
              compact={false}
            />

            <View style={styles.compactDemo}>
              <Text style={[styles.compactLabel, { color: colorSystem.accessibility.text.secondary }]}>
                Compact version:
              </Text>
              <SyncStatusIndicator
                status={syncStatus}
                onStatusTap={() => Alert.alert('Status', 'Compact status tapped')}
                placement="floating"
                compact={true}
              />
            </View>
          </View>,
          <Button
            variant="outline"
            onPress={cycleSyncStatus}
            style={styles.actionButton}
          >
            Cycle Status: {syncStatus.status}
          </Button>
        )}

        {/* CrisisSyncBadge Demo */}
        {renderDemoSection(
          'Crisis Sync Badge',
          'Visual crisis data priority indicator with emergency status communication',
          <View style={styles.crisisBadgeDemo}>
            <CrisisSyncBadge
              crisisState={crisisState}
              onPress={() => Alert.alert('Crisis', 'Crisis badge pressed - navigate to crisis resources')}
              placement="inline"
              size="large"
              showText={true}
            />

            <View style={styles.crisisSizes}>
              <Text style={[styles.sizesLabel, { color: colorSystem.accessibility.text.secondary }]}>
                Different sizes:
              </Text>
              <View style={styles.sizesRow}>
                <CrisisSyncBadge crisisState={crisisState} size="small" placement="inline" />
                <CrisisSyncBadge crisisState={crisisState} size="medium" placement="inline" />
                <CrisisSyncBadge crisisState={crisisState} size="large" placement="inline" />
              </View>
            </View>
          </View>,
          <Button
            variant="outline"
            onPress={cycleCrisisState}
            style={styles.actionButton}
          >
            Cycle Crisis: {crisisState.level}
          </Button>
        )}

        {/* Component Access Demos */}
        {renderDemoSection(
          'Device Management',
          'Manage registered devices, trust levels, and device capabilities',
          <View style={styles.componentAccess}>
            <Text style={[styles.accessNote, { color: colorSystem.accessibility.text.secondary }]}>
              Full-screen component for managing cross-device sync settings
            </Text>
          </View>,
          <Button
            variant="primary"
            onPress={() => setSelectedDemo('devices')}
            style={styles.actionButton}
          >
            Open Device Management
          </Button>
        )}

        {renderDemoSection(
          'Conflict Resolution',
          'User-friendly interface for resolving sync conflicts with smart suggestions',
          <View style={styles.componentAccess}>
            <Text style={[styles.accessNote, { color: colorSystem.accessibility.text.secondary }]}>
              {conflicts.length > 0
                ? `${conflicts.length} sample conflicts available for resolution`
                : 'No conflicts to resolve (resolve some to see demo)'
              }
            </Text>
          </View>,
          <Button
            variant={conflicts.length > 0 ? 'primary' : 'outline'}
            onPress={() => {
              if (conflicts.length > 0) {
                setSelectedDemo('conflicts');
              } else {
                setConflicts(mockConflicts);
              }
            }}
            style={styles.actionButton}
          >
            {conflicts.length > 0 ? 'Resolve Conflicts' : 'Add Sample Conflicts'}
          </Button>
        )}

        {renderDemoSection(
          'Sync Settings',
          'Comprehensive sync preferences and configuration options',
          <View style={styles.componentAccess}>
            <Text style={[styles.accessNote, { color: colorSystem.accessibility.text.secondary }]}>
              Configure sync frequency, data types, privacy settings, and emergency access
            </Text>
          </View>,
          <Button
            variant="primary"
            onPress={() => setSelectedDemo('settings')}
            style={styles.actionButton}
          >
            Open Sync Settings
          </Button>
        )}

        {/* Integration Examples */}
        {renderDemoSection(
          'Integration Examples',
          'How sync components work together in real app scenarios',
          <View style={styles.integrationExamples}>
            <Text style={[styles.exampleTitle, { color: colorSystem.accessibility.text.primary }]}>
              Crisis Detection Workflow:
            </Text>
            <Text style={[styles.exampleText, { color: colorSystem.accessibility.text.secondary }]}>
              1. PHQ-9 assessment triggers crisis detection{'\n'}
              2. CrisisSyncBadge appears with critical priority{'\n'}
              3. SyncStatusIndicator shows crisis data syncing{'\n'}
              4. Emergency access ensures data reaches all devices
            </Text>

            <Text style={[styles.exampleTitle, { color: colorSystem.accessibility.text.primary }]}>
              Multi-Device Sync Conflict:
            </Text>
            <Text style={[styles.exampleText, { color: colorSystem.accessibility.text.secondary }]}>
              1. Data modified on multiple devices simultaneously{'\n'}
              2. SyncStatusIndicator shows conflict count{'\n'}
              3. SyncConflictResolver provides smart suggestions{'\n'}
              4. Resolution prioritizes crisis/therapeutic data
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Components */}
      {selectedDemo === 'devices' && (
        <DeviceManagementScreen
          onClose={() => setSelectedDemo(null)}
          showAsModal={true}
        />
      )}

      {selectedDemo === 'conflicts' && conflicts.length > 0 && (
        <SyncConflictResolver
          conflicts={conflicts}
          onResolveConflict={handleResolveConflict}
          onResolveAll={handleResolveAllConflicts}
          onClose={() => setSelectedDemo(null)}
          showAsModal={true}
        />
      )}

      {selectedDemo === 'settings' && (
        <SyncSettingsPanel
          preferences={syncPreferences}
          onPreferencesChange={setSyncPreferences}
          onClose={() => setSelectedDemo(null)}
          showAsModal={true}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
  },
  closeButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  demoSection: {
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
    overflow: 'hidden',
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
  demoHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  demoTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    marginBottom: spacing.xs,
  },
  demoDescription: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },
  demoContent: {
    padding: spacing.lg,
  },
  demoActions: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    marginBottom: 0,
  },
  statusIndicatorDemo: {
    gap: spacing.lg,
  },
  compactDemo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compactLabel: {
    fontSize: typography.caption.size,
  },
  crisisBadgeDemo: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  crisisSizes: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  sizesLabel: {
    fontSize: typography.caption.size,
  },
  sizesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  componentAccess: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  accessNote: {
    fontSize: typography.bodyRegular.size,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  integrationExamples: {
    gap: spacing.lg,
  },
  exampleTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  exampleText: {
    fontSize: typography.bodyRegular.size,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
  },
});

export default SyncComponentsDemo;