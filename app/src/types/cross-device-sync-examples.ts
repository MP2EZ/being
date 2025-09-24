/**
 * Cross-Device Sync UI Type Usage Examples
 *
 * Demonstrates best practices for using the comprehensive cross-device sync UI types
 * with React components, showing proper integration patterns for the React agent.
 *
 * This file serves as a reference for the React agent when implementing the actual
 * sync UI components, ensuring type safety and proper integration with stores.
 */

import {
  SyncStatusIndicatorProps,
  DeviceManagementScreenProps,
  SyncConflictResolverProps,
  CrisisSyncBadgeProps,
  SyncSettingsPanelProps,
  SyncStatus,
  DeviceStatus,
  CrisisSeverityLevel,
  DeviceTrustLevel,
  NetworkQuality,
  OptimizationLevel,
  SyncProgress,
  UIConflict,
  DeviceInfo,
  StoreSyncBridge,
  SYNC_UI_DEFAULTS,
  CRISIS_RESPONSE_TIMES
} from './cross-device-sync-ui';

// ===========================================
// EXAMPLE TYPE USAGE PATTERNS
// ===========================================

/**
 * Example: Type-safe sync status indicator with crisis handling
 */
export const EXAMPLE_SYNC_STATUS_INDICATOR_PROPS: SyncStatusIndicatorProps = {
  status: SyncStatus.SYNCING,
  lastSyncTime: new Date(),
  conflictCount: 2,
  crisisMode: false,
  progress: {
    current: 3,
    total: 10,
    percentage: 30,
    estimatedTimeRemaining: 5000,
    operationType: 'upload',
    criticalData: false
  },
  showDetails: true,
  size: 'medium',
  position: 'top-right',
  animationEnabled: true,
  hapticFeedback: true,
  accessibilityLabel: 'Sync Status: Currently syncing 3 of 10 items',
  testID: 'sync-status-indicator',
  onPress: () => console.log('Status pressed'),
  onConflictResolve: () => console.log('Resolving conflicts'),
  onCrisisDetected: (level: CrisisSeverityLevel) => console.log(`Crisis detected: ${level}`)
};

/**
 * Example: Device management screen with proper type constraints
 */
export const EXAMPLE_DEVICE_MANAGEMENT_PROPS: Partial<DeviceManagementScreenProps> = {
  devices: [
    {
      id: 'device-1',
      name: 'iPhone 15',
      type: 'phone',
      platform: 'ios',
      status: DeviceStatus.ONLINE,
      trustLevel: DeviceTrustLevel.TRUSTED,
      lastSeen: new Date(),
      conflictCount: 0,
      isCurrentDevice: true,
      storageUsed: 1024 * 1024 * 50, // 50MB
      batteryOptimized: true,
      version: '1.0.0',
      encryptionEnabled: true,
      emergencyAccess: true
    }
  ],
  currentDeviceId: 'device-1',
  registrationInProgress: false,
  showTrustVerification: false,
  allowDeviceRemoval: true,
  crisisMode: false,
  maxDevices: SYNC_UI_DEFAULTS.DEVICE_LIST.MAX_DEVICES,
  syncEnabled: true
};

/**
 * Example: Crisis sync badge with emergency configuration
 */
export const EXAMPLE_CRISIS_SYNC_BADGE_PROPS: CrisisSyncBadgeProps = {
  crisisLevel: CrisisSeverityLevel.HIGH,
  emergencyContacts: [
    {
      id: 'contact-1',
      name: 'Dr. Smith',
      phone: '+1-555-0123',
      relationship: 'therapist',
      priority: 1,
      validated: true,
      encryptedDetails: 'encrypted_contact_data'
    }
  ],
  syncStatus: SyncStatus.CRISIS_PRIORITY,
  emergencyMode: true,
  professionalContactAvailable: true,
  position: 'fixed',
  size: 'expanded',
  showEmergencyActions: true,
  pulseAnimation: true,
  hapticIntensity: 'heavy',
  accessibilityAnnouncements: true,
  onEmergencySync: async () => console.log('Emergency sync triggered'),
  onContactEmergency: async (contactId: string) => console.log(`Contacting: ${contactId}`),
  onAccessSafetyPlan: () => console.log('Accessing safety plan'),
  onReportCrisis: async (level: CrisisSeverityLevel) => console.log(`Reporting crisis: ${level}`),
  onDismissAlert: () => console.log('Alert dismissed'),
  testID: 'crisis-sync-badge'
};

/**
 * Example: Conflict resolution with therapeutic guidance
 */
export const EXAMPLE_CONFLICT_RESOLVER_PROPS: Partial<SyncConflictResolverProps> = {
  conflicts: [
    {
      id: 'conflict-1',
      entityType: 'assessment' as any,
      entityId: 'assessment-123',
      conflictType: 'concurrent_modification' as any,
      localData: {} as any,
      remoteData: {} as any,
      metadata: {} as any,
      resolutionOptions: [],
      autoResolvable: false,
      clinicalRelevant: true,
      displayTitle: 'PHQ-9 Assessment Conflict',
      displayDescription: 'Different scores recorded on two devices',
      severity: 'high' as any,
      therapeuticImpact: {
        level: 'significant',
        description: 'May affect treatment planning',
        affectedAssessments: ['phq-9'],
        affectedTherapyData: ['mood-tracking'],
        recommendation: 'Clinical review recommended',
        clinicalReviewRequired: true
      },
      userFriendlyOptions: [
        {
          strategy: 'use_local' as any,
          title: 'Keep Local Score',
          description: 'Use the score recorded on this device',
          pros: ['More recent', 'Includes additional context'],
          cons: ['May lose remote insights'],
          recommendation: 'recommended',
          preservesTherapeuticData: true,
          requiresUserInput: false,
          estimatedTime: 1,
          riskLevel: 'low'
        }
      ],
      previewData: {
        localPreview: {
          title: 'Local Assessment',
          lastModified: new Date(),
          deviceName: 'iPhone',
          summary: 'PHQ-9 Score: 12',
          keyChanges: ['Score updated to 12'],
          fieldPreviews: {}
        },
        remotePreview: {
          title: 'Remote Assessment',
          lastModified: new Date(),
          deviceName: 'iPad',
          summary: 'PHQ-9 Score: 10',
          keyChanges: ['Score updated to 10'],
          fieldPreviews: {}
        },
        changedFields: ['score'],
        addedFields: [],
        removedFields: [],
        mergePossible: false
      },
      requiresClinicalReview: true,
      estimatedResolutionTime: 5,
      lastUserAction: new Date()
    }
  ],
  autoResolveEnabled: false,
  showPreview: true,
  clinicalDataMode: true,
  therapeuticGuidance: true,
  allowDeferResolution: true
};

// ===========================================
// TYPE-SAFE HELPER FUNCTIONS
// ===========================================

/**
 * Type-safe crisis response time validator
 */
export const validateCrisisResponseTime = (
  crisisLevel: CrisisSeverityLevel,
  actualResponseTime: number
): boolean => {
  const requiredTime = CRISIS_RESPONSE_TIMES[crisisLevel];
  return actualResponseTime <= requiredTime;
};

/**
 * Type-safe device status color mapping
 */
export const getDeviceStatusColor = (status: DeviceStatus): string => {
  const colorMap: Record<DeviceStatus, string> = {
    [DeviceStatus.ONLINE]: '#34C759',
    [DeviceStatus.OFFLINE]: '#8E8E93',
    [DeviceStatus.SYNCING]: '#007AFF',
    [DeviceStatus.ERROR]: '#FF3B30',
    [DeviceStatus.UNTRUSTED]: '#FF9500',
    [DeviceStatus.PENDING_VERIFICATION]: '#FF9F0A',
    [DeviceStatus.CRISIS_MODE]: '#FF3B30'
  };
  return colorMap[status];
};

/**
 * Type-safe sync progress calculation
 */
export const calculateSyncProgress = (
  current: number,
  total: number
): SyncProgress => ({
  current,
  total,
  percentage: total > 0 ? Math.round((current / total) * 100) : 0,
  operationType: 'upload',
  criticalData: false
});

/**
 * Type-safe conflict severity assessment
 */
export const assessConflictSeverity = (
  conflict: UIConflict
): 'low' | 'medium' | 'high' | 'critical' => {
  if (conflict.clinicalRelevant && conflict.therapeuticImpact.level === 'critical') {
    return 'critical';
  }
  if (conflict.therapeuticImpact.level === 'significant') {
    return 'high';
  }
  if (conflict.therapeuticImpact.level === 'moderate') {
    return 'medium';
  }
  return 'low';
};

// ===========================================
// STORE INTEGRATION EXAMPLES
// ===========================================

/**
 * Example: Type-safe store integration bridge
 */
export const createExampleStoreBridge = (): Partial<StoreSyncBridge> => ({
  user: {
    syncUserPreferences: async () => {
      console.log('Syncing user preferences');
    },
    getUserSyncSettings: () => ({
      syncEnabled: true,
      autoSyncInterval: 30,
      syncOnlyOnWifi: false,
      syncInBackground: true,
      compressData: true,
      encryptionLevel: 'enhanced',
      conflictResolution: 'manual',
      crisisPriority: true,
      emergencyBypass: true,
      therapeuticDataFirst: true,
      batteryOptimization: OptimizationLevel.MODERATE,
      maxConcurrentOperations: 3,
      retryAttempts: 5,
      timeoutSeconds: 30
    }),
    updateUserSyncSettings: async (settings) => {
      console.log('Updating sync settings:', settings);
    },
    getUserDevices: () => [],
    addUserDevice: async (device) => {
      console.log('Adding device:', device);
    },
    removeUserDevice: async (deviceId) => {
      console.log('Removing device:', deviceId);
    }
  },
  assessment: {
    syncAssessmentData: async () => {
      console.log('Syncing assessment data');
    },
    getConflictingAssessments: () => [],
    resolveAssessmentConflict: async (conflictId, resolution) => {
      console.log('Resolving assessment conflict:', conflictId, resolution);
    },
    prioritizeCrisisAssessments: async (crisisLevel) => {
      console.log('Prioritizing crisis assessments:', crisisLevel);
    }
  },
  subscribeToSyncEvents: (handlers) => {
    console.log('Subscribing to sync events with handlers:', Object.keys(handlers));
    return () => console.log('Unsubscribing from sync events');
  },
  getGlobalSyncStatus: () => SyncStatus.SYNCED,
  triggerGlobalSync: async () => {
    console.log('Triggering global sync');
  },
  handleEmergencySync: async (crisisLevel) => {
    console.log('Handling emergency sync for crisis level:', crisisLevel);
  }
});

// ===========================================
// PERFORMANCE OPTIMIZATION EXAMPLES
// ===========================================

/**
 * Example: Component optimization configuration
 */
export const EXAMPLE_COMPONENT_OPTIMIZATION = {
  memoization: {
    enabled: true,
    dependencies: ['status', 'conflictCount', 'crisisMode'],
    customComparison: (prev: any, next: any) =>
      prev.status === next.status &&
      prev.conflictCount === next.conflictCount &&
      prev.crisisMode === next.crisisMode
  },
  callbacks: {
    throttleMs: 100,
    debounceMs: 500,
    memoize: true
  },
  rendering: {
    lazy: true,
    virtualizeList: true,
    batchUpdates: true,
    frameSkipping: false
  },
  animations: {
    useNativeDriver: true,
    optimizeForMemory: true,
    reduceMotion: false
  }
};

/**
 * Example: List optimization for device lists
 */
export const EXAMPLE_LIST_OPTIMIZATION = {
  virtualizeThreshold: 20,
  renderBatchSize: 10,
  getItemLayout: (data: DeviceInfo[], index: number) => ({
    length: 80,
    offset: 80 * index,
    index
  }),
  keyExtractor: (item: DeviceInfo) => item.id,
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  windowSize: 10,
  initialNumToRender: 10
};

// ===========================================
// ACCESSIBILITY EXAMPLES
// ===========================================

/**
 * Example: WCAG-compliant accessibility configuration
 */
export const EXAMPLE_ACCESSIBILITY_CONFIG = {
  level: 'AA' as const,
  colorContrast: {
    minimum: 4.5,
    enhanced: 7.0,
    testResults: [
      {
        foreground: '#FFFFFF',
        background: '#007AFF',
        ratio: 4.6,
        wcagLevel: 'AA' as const,
        context: 'Sync status text on blue background'
      }
    ]
  },
  focusManagement: {
    trapFocus: true,
    restoreFocus: true,
    skipLinks: ['#main-content', '#sync-settings']
  },
  screenReader: {
    announcements: true,
    descriptions: true,
    landmarks: true,
    headingStructure: true
  },
  motorImpairments: {
    minTouchTarget: 44,
    gestureAlternatives: true,
    voiceControl: true
  },
  cognitiveSupport: {
    clearInstructions: true,
    errorPrevention: true,
    timeoutWarnings: true,
    simplifiedUI: false
  }
};

// Note: All examples are exported individually above where they are defined
// This file provides usage examples for the React agent when implementing sync UI components