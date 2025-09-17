/**
 * Cross-Device Sync UI TypeScript Definitions
 *
 * Comprehensive type-safe interfaces for cross-device sync UI components,
 * building upon the Day 20 comprehensive sync types to provide:
 * - Crisis-first UI component types with emergency response patterns
 * - Type-safe integration with existing stores (userStore, assessmentStore)
 * - Performance-optimized component props with accessibility validation
 * - FullMind therapeutic UX patterns with MBCT compliance
 * - Dark mode and theme integration with crisis mode emphasis
 *
 * Features:
 * - Complete type safety for all UI component props and state
 * - Crisis detection with emergency UI patterns and response constraints
 * - Cross-platform accessibility with therapeutic UX considerations
 * - Real-time sync status with performance monitoring
 * - Conflict resolution UI with user-friendly guidance
 * - Battery optimization types for sustained sync operations
 */

import { StyleProp, ViewStyle, TextStyle } from 'react-native';
import {
  // Core sync types from Day 20
  SyncStatus as CoreSyncStatus,
  SyncOperation,
  SyncConflict,
  CrisisSafeData,
  CrisisSeverityLevel,
  SyncPriorityLevel,
  DeviceTrustLevel,
  ConflictResolutionStrategy,
  SyncPerformanceMetrics,
  PerformanceAlert,
  NetworkQuality,
  PowerState,
  OptimizationLevel,
  EntityType,
  ValidationError,
  ValidationWarning,
  BatteryOptimization,
  NetworkAdaptation,
  ThresholdViolation,
  ConflictResolution,
  ConflictResolutionResult,
  EmergencyContact,
  SafetyPlan
} from './comprehensive-cross-device-sync';

// ===========================================
// CORE UI STATUS AND STATE TYPES
// ===========================================

/**
 * Enhanced sync status for UI components with therapeutic UX
 */
export enum SyncStatus {
  SYNCING = 'syncing',
  SYNCED = 'synced',
  ERROR = 'error',
  OFFLINE = 'offline',
  CRISIS_PRIORITY = 'crisis_priority',
  PAUSED = 'paused',
  CONFLICT = 'conflict',
  INITIAL = 'initial',
  EMERGENCY_ONLY = 'emergency_only'
}

/**
 * Device status for UI display with trust visualization
 */
export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SYNCING = 'syncing',
  ERROR = 'error',
  UNTRUSTED = 'untrusted',
  PENDING_VERIFICATION = 'pending_verification',
  CRISIS_MODE = 'crisis_mode'
}

/**
 * Conflict severity for UI prioritization
 */
export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  CLINICAL = 'clinical'
}

/**
 * UI animation states for sync operations
 */
export enum SyncAnimationState {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  CONFLICT = 'conflict',
  CRISIS = 'crisis'
}

/**
 * Progress tracking for sync operations
 */
export interface SyncProgress {
  readonly current: number;
  readonly total: number;
  readonly percentage: number;
  readonly estimatedTimeRemaining?: number; // milliseconds
  readonly operationType: 'upload' | 'download' | 'merge' | 'conflict_resolve';
  readonly entityType?: EntityType;
  readonly criticalData: boolean;
}

// ===========================================
// SYNC STATUS INDICATOR COMPONENT TYPES
// ===========================================

/**
 * Sync status indicator props with crisis-aware design
 */
export interface SyncStatusIndicatorProps {
  readonly status: SyncStatus;
  readonly lastSyncTime?: Date;
  readonly conflictCount: number;
  readonly crisisMode: boolean;
  readonly progress?: SyncProgress;
  readonly showDetails?: boolean;
  readonly size?: 'small' | 'medium' | 'large';
  readonly position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  readonly animationEnabled?: boolean;
  readonly hapticFeedback?: boolean;
  readonly accessibilityLabel?: string;
  readonly testID?: string;
  readonly onPress?: () => void;
  readonly onLongPress?: () => void;
  readonly onConflictResolve?: () => void;
  readonly onCrisisDetected?: (level: CrisisSeverityLevel) => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly iconStyle?: StyleProp<ViewStyle>;
  readonly textStyle?: StyleProp<TextStyle>;
}

/**
 * Sync status indicator state with performance tracking
 */
export interface SyncStatusIndicatorState {
  readonly isVisible: boolean;
  readonly animationState: SyncAnimationState;
  readonly alertShown: boolean;
  readonly lastUpdate: Date;
  readonly performanceMetrics: ComponentPerformanceMetrics;
  readonly accessibilityFocus: boolean;
}

/**
 * Component performance metrics for optimization
 */
export interface ComponentPerformanceMetrics {
  readonly renderCount: number;
  readonly lastRenderTime: number;
  readonly averageRenderTime: number;
  readonly memoryUsage: number;
  readonly animationFramesDropped: number;
}

// ===========================================
// DEVICE MANAGEMENT SCREEN TYPES
// ===========================================

/**
 * Device management screen props with registration flows
 */
export interface DeviceManagementScreenProps {
  readonly devices: readonly DeviceInfo[];
  readonly currentDeviceId: string;
  readonly registrationInProgress: boolean;
  readonly showTrustVerification: boolean;
  readonly allowDeviceRemoval: boolean;
  readonly crisisMode: boolean;
  readonly maxDevices: number;
  readonly syncEnabled: boolean;
  readonly onDeviceRegister: (deviceName: string) => Promise<DeviceRegistrationResult>;
  readonly onDeviceRemove: (deviceId: string) => Promise<void>;
  readonly onDeviceTrust: (deviceId: string, trustLevel: DeviceTrustLevel) => Promise<void>;
  readonly onSyncToggle: (enabled: boolean) => Promise<void>;
  readonly onRefresh: () => Promise<void>;
  readonly onNavigateToConflicts: () => void;
  readonly onNavigateToSettings: () => void;
  readonly navigation: any; // React Navigation type
  readonly route: any; // React Navigation route type
}

/**
 * Device information for UI display
 */
export interface DeviceInfo {
  readonly id: string;
  readonly name: string;
  readonly type: 'phone' | 'tablet' | 'computer' | 'other';
  readonly platform: 'ios' | 'android' | 'web' | 'desktop';
  readonly status: DeviceStatus;
  readonly trustLevel: DeviceTrustLevel;
  readonly lastSeen: Date;
  readonly syncProgress?: SyncProgress;
  readonly conflictCount: number;
  readonly isCurrentDevice: boolean;
  readonly storageUsed: number; // bytes
  readonly batteryOptimized: boolean;
  readonly version: string;
  readonly encryptionEnabled: boolean;
  readonly emergencyAccess: boolean;
}

/**
 * Device registration result with validation
 */
export interface DeviceRegistrationResult {
  readonly success: boolean;
  readonly deviceId?: string;
  readonly error?: string;
  readonly requiresVerification: boolean;
  readonly trustLevel: DeviceTrustLevel;
  readonly estimatedSyncTime?: number;
}

/**
 * Device management screen state
 */
export interface DeviceManagementScreenState {
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly selectedDevice?: string;
  readonly showRemoveConfirmation: boolean;
  readonly registrationModal: DeviceRegistrationModalState;
  readonly trustModal: DeviceTrustModalState;
  readonly errorMessage?: string;
  readonly lastRefresh: Date;
}

/**
 * Device registration modal state
 */
export interface DeviceRegistrationModalState {
  readonly visible: boolean;
  readonly deviceName: string;
  readonly nameError?: string;
  readonly registrationInProgress: boolean;
  readonly verificationCode?: string;
  readonly verificationRequired: boolean;
}

/**
 * Device trust verification modal state
 */
export interface DeviceTrustModalState {
  readonly visible: boolean;
  readonly deviceId?: string;
  readonly currentTrustLevel: DeviceTrustLevel;
  readonly newTrustLevel: DeviceTrustLevel;
  readonly verificationInProgress: boolean;
  readonly verificationMethod: 'biometric' | 'code' | 'manual';
}

// ===========================================
// SYNC CONFLICT RESOLVER TYPES
// ===========================================

/**
 * Sync conflict resolver props with therapeutic guidance
 */
export interface SyncConflictResolverProps {
  readonly conflicts: readonly UIConflict[];
  readonly autoResolveEnabled: boolean;
  readonly showPreview: boolean;
  readonly clinicalDataMode: boolean;
  readonly therapeuticGuidance: boolean;
  readonly allowDeferResolution: boolean;
  readonly onResolveConflict: (
    conflictId: string,
    resolution: ConflictResolution<any>
  ) => Promise<ConflictResolutionResult<any>>;
  readonly onResolveAll: (
    resolutions: readonly ConflictResolution<any>[]
  ) => Promise<readonly ConflictResolutionResult<any>[]>;
  readonly onDeferConflict: (conflictId: string) => Promise<void>;
  readonly onRequestClinicalReview: (conflictId: string) => Promise<void>;
  readonly onNavigateBack: () => void;
  readonly navigation: any;
  readonly route: any;
}

/**
 * UI-enhanced conflict with display metadata
 */
export interface UIConflict extends SyncConflict<any> {
  readonly displayTitle: string;
  readonly displayDescription: string;
  readonly severity: ConflictSeverity;
  readonly therapeuticImpact: TherapeuticImpact;
  readonly userFriendlyOptions: readonly UIConflictOption[];
  readonly previewData: ConflictPreviewData;
  readonly requiresClinicalReview: boolean;
  readonly estimatedResolutionTime: number; // minutes
  readonly lastUserAction?: Date;
}

/**
 * Therapeutic impact assessment for conflicts
 */
export interface TherapeuticImpact {
  readonly level: 'none' | 'minimal' | 'moderate' | 'significant' | 'critical';
  readonly description: string;
  readonly affectedAssessments: readonly string[];
  readonly affectedTherapyData: readonly string[];
  readonly recommendation: string;
  readonly clinicalReviewRequired: boolean;
}

/**
 * User-friendly conflict resolution option
 */
export interface UIConflictOption {
  readonly strategy: ConflictResolutionStrategy;
  readonly title: string;
  readonly description: string;
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly recommendation: 'recommended' | 'acceptable' | 'not_recommended';
  readonly preservesTherapeuticData: boolean;
  readonly requiresUserInput: boolean;
  readonly estimatedTime: number; // minutes
  readonly riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Conflict preview data for user review
 */
export interface ConflictPreviewData {
  readonly localPreview: DataPreview;
  readonly remotePreview: DataPreview;
  readonly changedFields: readonly string[];
  readonly addedFields: readonly string[];
  readonly removedFields: readonly string[];
  readonly mergePossible: boolean;
}

/**
 * Data preview for conflict resolution
 */
export interface DataPreview {
  readonly title: string;
  readonly lastModified: Date;
  readonly deviceName: string;
  readonly summary: string;
  readonly keyChanges: readonly string[];
  readonly fieldPreviews: Record<string, FieldPreview>;
}

/**
 * Field preview for detailed comparison
 */
export interface FieldPreview {
  readonly fieldName: string;
  readonly displayName: string;
  readonly oldValue: string;
  readonly newValue: string;
  readonly fieldType: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  readonly importance: 'low' | 'medium' | 'high' | 'critical';
  readonly therapeuticRelevance: boolean;
}

// ===========================================
// CRISIS SYNC BADGE TYPES
// ===========================================

/**
 * Crisis sync badge props with emergency state management
 */
export interface CrisisSyncBadgeProps {
  readonly crisisLevel: CrisisSeverityLevel;
  readonly emergencyContacts: readonly EmergencyContact[];
  readonly safetyPlan?: SafetyPlan;
  readonly syncStatus: SyncStatus;
  readonly emergencyMode: boolean;
  readonly professionalContactAvailable: boolean;
  readonly lastEmergencySync?: Date;
  readonly position?: 'fixed' | 'relative';
  readonly size?: 'compact' | 'standard' | 'expanded';
  readonly showEmergencyActions: boolean;
  readonly pulseAnimation: boolean;
  readonly hapticIntensity: 'light' | 'medium' | 'heavy';
  readonly accessibilityAnnouncements: boolean;
  readonly onEmergencySync: () => Promise<void>;
  readonly onContactEmergency: (contactId: string) => Promise<void>;
  readonly onAccessSafetyPlan: () => void;
  readonly onReportCrisis: (level: CrisisSeverityLevel) => Promise<void>;
  readonly onDismissAlert: () => void;
  readonly testID?: string;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Crisis sync badge state with emergency tracking
 */
export interface CrisisSyncBadgeState {
  readonly visible: boolean;
  readonly alertActive: boolean;
  readonly emergencyContactsLoaded: boolean;
  readonly safetyPlanAccessible: boolean;
  readonly lastAlertTime?: Date;
  readonly emergencySyncInProgress: boolean;
  readonly professionalNotified: boolean;
  readonly userAcknowledged: boolean;
}

/**
 * Emergency sync operation with crisis prioritization
 */
export interface EmergencySyncOperation {
  readonly id: string;
  readonly crisisLevel: CrisisSeverityLevel;
  readonly data: CrisisSafeData<any>;
  readonly emergencyContacts: readonly string[];
  readonly professionalRequired: boolean;
  readonly maxResponseTime: number; // milliseconds, must be ≤ 200ms
  readonly startedAt: Date;
  readonly estimatedCompletion: Date;
  readonly retryCount: number;
  readonly escalationLevel: number;
}

// ===========================================
// SYNC SETTINGS PANEL TYPES
// ===========================================

/**
 * Sync settings panel props with user preferences
 */
export interface SyncSettingsPanelProps {
  readonly settings: SyncUserSettings;
  readonly capabilities: DeviceCapabilities;
  readonly networkSettings: NetworkPreferences;
  readonly batterySettings: BatteryPreferences;
  readonly privacySettings: PrivacyPreferences;
  readonly therapeuticSettings: TherapeuticSyncSettings;
  readonly advancedMode: boolean;
  readonly showDiagnostics: boolean;
  readonly onSettingChange: <K extends keyof SyncUserSettings>(
    key: K,
    value: SyncUserSettings[K]
  ) => Promise<void>;
  readonly onNetworkChange: (settings: NetworkPreferences) => Promise<void>;
  readonly onBatteryChange: (settings: BatteryPreferences) => Promise<void>;
  readonly onPrivacyChange: (settings: PrivacyPreferences) => Promise<void>;
  readonly onTherapeuticChange: (settings: TherapeuticSyncSettings) => Promise<void>;
  readonly onResetToDefaults: () => Promise<void>;
  readonly onExportDiagnostics: () => Promise<void>;
  readonly onRunDiagnostics: () => Promise<DiagnosticsResult>;
  readonly navigation: any;
  readonly route: any;
}

/**
 * User sync settings with validation
 */
export interface SyncUserSettings {
  readonly syncEnabled: boolean;
  readonly autoSyncInterval: number; // minutes
  readonly syncOnlyOnWifi: boolean;
  readonly syncInBackground: boolean;
  readonly compressData: boolean;
  readonly encryptionLevel: 'standard' | 'enhanced' | 'maximum';
  readonly conflictResolution: 'auto' | 'manual' | 'defer';
  readonly crisisPriority: boolean;
  readonly emergencyBypass: boolean;
  readonly therapeuticDataFirst: boolean;
  readonly batteryOptimization: OptimizationLevel;
  readonly maxConcurrentOperations: number;
  readonly retryAttempts: number;
  readonly timeoutSeconds: number;
}

/**
 * Device capabilities for sync optimization
 */
export interface DeviceCapabilities {
  readonly supportsBiometric: boolean;
  readonly supportsBackground: boolean;
  readonly supportsEncryption: boolean;
  readonly supportsCompression: boolean;
  readonly maxStorageGB: number;
  readonly networkTypes: readonly ('wifi' | 'cellular' | 'ethernet')[];
  readonly batteryOptimizations: readonly OptimizationLevel[];
  readonly concurrentOperations: number;
  readonly encryptionMethods: readonly string[];
}

/**
 * Network preferences with quality adaptation
 */
export interface NetworkPreferences {
  readonly wifiOnly: boolean;
  readonly cellularAllowed: boolean;
  readonly roamingAllowed: boolean;
  readonly qualityThreshold: NetworkQuality;
  readonly compressionEnabled: boolean;
  readonly batchingEnabled: boolean;
  readonly adaptiveQuality: boolean;
  readonly maxBandwidthKbps?: number;
  readonly connectionTimeout: number; // seconds
}

/**
 * Battery preferences with power management
 */
export interface BatteryPreferences {
  readonly optimizationLevel: OptimizationLevel;
  readonly syncOnLowBattery: boolean;
  readonly backgroundSyncMinLevel: number; // percentage
  readonly crisisOverrideBattery: boolean;
  readonly adaptiveScheduling: boolean;
  readonly wakeForCrisis: boolean;
  readonly maxCpuUsage: number; // percentage
  readonly thermalThrottling: boolean;
}

/**
 * Privacy preferences with compliance validation
 */
export interface PrivacyPreferences {
  readonly dataMinimization: boolean;
  readonly encryptMetadata: boolean;
  readonly auditLogging: boolean;
  readonly shareAnalytics: boolean;
  readonly therapeuticDataOnly: boolean;
  readonly emergencyDataSharing: boolean;
  readonly anonymizeExports: boolean;
  readonly consentGranularity: 'basic' | 'detailed' | 'full';
  readonly dataRetentionDays: number;
  readonly rightToErasure: boolean;
}

/**
 * Therapeutic sync settings for MBCT compliance
 */
export interface TherapeuticSyncSettings {
  readonly prioritizeAssessments: boolean;
  readonly prioritizeCrisisData: boolean;
  readonly therapeuticTimingPreserved: boolean;
  readonly moodDataEncryption: 'standard' | 'enhanced';
  readonly clinicalDataValidation: boolean;
  readonly therapistAccess: boolean;
  readonly emergencySharing: boolean;
  readonly progressTracking: boolean;
  readonly interventionData: boolean;
  readonly anonymizeNonClinical: boolean;
}

/**
 * Diagnostics result with comprehensive analysis
 */
export interface DiagnosticsResult {
  readonly overall: 'pass' | 'warning' | 'fail';
  readonly timestamp: Date;
  readonly deviceInfo: DeviceDiagnostics;
  readonly networkDiagnostics: NetworkDiagnostics;
  readonly storageDiagnostics: StorageDiagnostics;
  readonly syncDiagnostics: SyncDiagnostics;
  readonly securityDiagnostics: SecurityDiagnostics;
  readonly performanceDiagnostics: PerformanceDiagnostics;
  readonly recommendations: readonly DiagnosticRecommendation[];
}

/**
 * Device diagnostics information
 */
export interface DeviceDiagnostics {
  readonly osVersion: string;
  readonly appVersion: string;
  readonly deviceModel: string;
  readonly availableStorage: number; // bytes
  readonly totalMemory: number; // bytes
  readonly batteryLevel: number; // percentage
  readonly biometricAvailable: boolean;
  readonly encryptionSupported: boolean;
  readonly backgroundModeEnabled: boolean;
}

/**
 * Network diagnostics information
 */
export interface NetworkDiagnostics {
  readonly connectionType: 'wifi' | 'cellular' | 'none';
  readonly quality: NetworkQuality;
  readonly latency: number; // milliseconds
  readonly bandwidth: number; // kbps
  readonly stability: number; // percentage
  readonly lastConnected: Date;
  readonly connectionErrors: number;
}

/**
 * Storage diagnostics information
 */
export interface StorageDiagnostics {
  readonly totalUsed: number; // bytes
  readonly syncDataSize: number; // bytes
  readonly encryptedDataSize: number; // bytes
  readonly compressionRatio: number;
  readonly corruptedEntries: number;
  readonly lastBackup?: Date;
  readonly integrityScore: number; // percentage
}

/**
 * Sync diagnostics information
 */
export interface SyncDiagnostics {
  readonly lastSuccessfulSync?: Date;
  readonly pendingOperations: number;
  readonly conflictCount: number;
  readonly errorCount: number;
  readonly averageLatency: number; // milliseconds
  readonly successRate: number; // percentage
  readonly queueBacklog: number;
}

/**
 * Security diagnostics information
 */
export interface SecurityDiagnostics {
  readonly encryptionEnabled: boolean;
  readonly keyRotationCurrent: boolean;
  readonly integrityChecksPass: boolean;
  readonly auditLogIntact: boolean;
  readonly biometricBinding: boolean;
  readonly securityViolations: number;
  readonly lastSecurityScan: Date;
}

/**
 * Performance diagnostics information
 */
export interface PerformanceDiagnostics {
  readonly cpuUsage: number; // percentage
  readonly memoryUsage: number; // bytes
  readonly diskIO: number; // operations per second
  readonly networkUsage: number; // kbps
  readonly batteryDrain: number; // mAh per hour
  readonly frameDrops: number;
  readonly responseTime: number; // milliseconds
}

/**
 * Diagnostic recommendation with priority
 */
export interface DiagnosticRecommendation {
  readonly category: 'performance' | 'security' | 'network' | 'storage' | 'battery';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly issue: string;
  readonly recommendation: string;
  readonly impact: string;
  readonly effort: 'easy' | 'moderate' | 'complex';
  readonly autoFixAvailable: boolean;
}

// ===========================================
// HOOK TYPES FOR COMPONENT INTEGRATION
// ===========================================

/**
 * Sync status hook return type
 */
export interface UseSyncStatusResult {
  readonly status: SyncStatus;
  readonly progress?: SyncProgress;
  readonly lastSync?: Date;
  readonly errorMessage?: string;
  readonly isLoading: boolean;
  readonly refresh: () => Promise<void>;
  readonly retryLastOperation: () => Promise<void>;
}

/**
 * Device management hook return type
 */
export interface UseDeviceManagementResult {
  readonly devices: readonly DeviceInfo[];
  readonly currentDevice: DeviceInfo;
  readonly isLoading: boolean;
  readonly error?: string;
  readonly registerDevice: (name: string) => Promise<DeviceRegistrationResult>;
  readonly removeDevice: (deviceId: string) => Promise<void>;
  readonly updateTrust: (deviceId: string, level: DeviceTrustLevel) => Promise<void>;
  readonly refreshDevices: () => Promise<void>;
}

/**
 * Conflict resolution hook return type
 */
export interface UseConflictResolutionResult {
  readonly conflicts: readonly UIConflict[];
  readonly hasConflicts: boolean;
  readonly isResolving: boolean;
  readonly error?: string;
  readonly resolveConflict: (
    conflictId: string,
    resolution: ConflictResolution<any>
  ) => Promise<ConflictResolutionResult<any>>;
  readonly resolveAll: () => Promise<void>;
  readonly refreshConflicts: () => Promise<void>;
}

/**
 * Crisis sync hook return type
 */
export interface UseCrisisSyncResult {
  readonly crisisLevel: CrisisSeverityLevel;
  readonly emergencyContacts: readonly EmergencyContact[];
  readonly safetyPlan?: SafetyPlan;
  readonly emergencyMode: boolean;
  readonly lastEmergencySync?: Date;
  readonly isEmergencySyncing: boolean;
  readonly triggerEmergencySync: () => Promise<void>;
  readonly contactEmergency: (contactId: string) => Promise<void>;
  readonly updateCrisisLevel: (level: CrisisSeverityLevel) => Promise<void>;
}

/**
 * Sync settings hook return type
 */
export interface UseSyncSettingsResult {
  readonly settings: SyncUserSettings;
  readonly capabilities: DeviceCapabilities;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly error?: string;
  readonly updateSetting: <K extends keyof SyncUserSettings>(
    key: K,
    value: SyncUserSettings[K]
  ) => Promise<void>;
  readonly resetToDefaults: () => Promise<void>;
  readonly runDiagnostics: () => Promise<DiagnosticsResult>;
  readonly exportSettings: () => Promise<string>;
}

// ===========================================
// EVENT HANDLER TYPES
// ===========================================

/**
 * Sync event handler types with therapeutic context
 */
export interface SyncEventHandlers {
  readonly onSyncStart: (operation: SyncOperation<any>) => void;
  readonly onSyncProgress: (progress: SyncProgress) => void;
  readonly onSyncComplete: (result: any) => void;
  readonly onSyncError: (error: Error, operation?: SyncOperation<any>) => void;
  readonly onConflictDetected: (conflict: UIConflict) => void;
  readonly onCrisisDetected: (level: CrisisSeverityLevel) => void;
  readonly onEmergencySync: (operation: EmergencySyncOperation) => void;
  readonly onDeviceStatusChange: (deviceId: string, status: DeviceStatus) => void;
  readonly onPerformanceAlert: (alert: PerformanceAlert) => void;
  readonly onNetworkChange: (quality: NetworkQuality) => void;
  readonly onBatteryOptimization: (settings: BatteryOptimization) => void;
}

/**
 * User interaction event handlers
 */
export interface UserInteractionHandlers {
  readonly onStatusPress: () => void;
  readonly onStatusLongPress: () => void;
  readonly onDeviceSelect: (deviceId: string) => void;
  readonly onConflictResolve: (conflictId: string) => void;
  readonly onEmergencyAction: () => void;
  readonly onSettingsChange: (settings: Partial<SyncUserSettings>) => void;
  readonly onDiagnosticsRequest: () => void;
  readonly onHelpRequest: (topic: string) => void;
}

// ===========================================
// NAVIGATION TYPES
// ===========================================

/**
 * Cross-device sync navigation stack
 */
export interface CrossDeviceSyncNavigationParams {
  readonly SyncStatus: undefined;
  readonly DeviceManagement: {
    readonly highlightDevice?: string;
    readonly showRegistration?: boolean;
  };
  readonly ConflictResolution: {
    readonly conflictId?: string;
    readonly autoResolve?: boolean;
  };
  readonly SyncSettings: {
    readonly section?: 'general' | 'network' | 'battery' | 'privacy' | 'therapeutic';
    readonly showAdvanced?: boolean;
  };
  readonly CrisisSync: {
    readonly crisisLevel?: CrisisSeverityLevel;
    readonly emergencyMode?: boolean;
  };
  readonly Diagnostics: {
    readonly runImmediate?: boolean;
  };
}

/**
 * Screen navigation props type helper
 */
export type SyncNavigationProp<T extends keyof CrossDeviceSyncNavigationParams> = {
  navigate: (screen: T, params?: CrossDeviceSyncNavigationParams[T]) => void;
  goBack: () => void;
  canGoBack: () => boolean;
};

// ===========================================
// THEME INTEGRATION TYPES
// ===========================================

/**
 * Sync theme colors with crisis mode support
 */
export interface SyncThemeColors {
  readonly syncing: string;
  readonly synced: string;
  readonly error: string;
  readonly offline: string;
  readonly conflict: string;
  readonly crisis: string;
  readonly emergency: string;
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly border: string;
  readonly success: string;
  readonly warning: string;
  readonly info: string;
}

/**
 * Sync theme with FullMind integration
 */
export interface SyncTheme {
  readonly colors: SyncThemeColors;
  readonly typography: SyncTypography;
  readonly spacing: SyncSpacing;
  readonly animations: SyncAnimations;
  readonly accessibility: SyncAccessibility;
}

/**
 * Typography for sync components
 */
export interface SyncTypography {
  readonly status: TextStyle;
  readonly statusLarge: TextStyle;
  readonly deviceName: TextStyle;
  readonly conflictTitle: TextStyle;
  readonly conflictDescription: TextStyle;
  readonly emergencyText: TextStyle;
  readonly settingLabel: TextStyle;
  readonly settingValue: TextStyle;
  readonly diagnosticText: TextStyle;
}

/**
 * Spacing for consistent layout
 */
export interface SyncSpacing {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly statusIndicator: number;
  readonly deviceList: number;
  readonly conflictItem: number;
  readonly settingGroup: number;
}

/**
 * Animation configurations
 */
export interface SyncAnimations {
  readonly syncPulse: {
    readonly duration: number;
    readonly easing: string;
  };
  readonly conflictHighlight: {
    readonly duration: number;
    readonly colors: readonly string[];
  };
  readonly crisisAlert: {
    readonly duration: number;
    readonly intensity: number;
    readonly haptic: boolean;
  };
  readonly statusTransition: {
    readonly duration: number;
    readonly springTension: number;
  };
}

/**
 * Accessibility configurations
 */
export interface SyncAccessibility {
  readonly announcements: {
    readonly syncStart: string;
    readonly syncComplete: string;
    readonly conflictDetected: string;
    readonly crisisAlert: string;
    readonly deviceConnected: string;
  };
  readonly labels: {
    readonly statusIndicator: string;
    readonly deviceList: string;
    readonly conflictResolver: string;
    readonly emergencyButton: string;
    readonly settingsPanel: string;
  };
  readonly hints: {
    readonly tapForDetails: string;
    readonly longPressForOptions: string;
    readonly swipeToResolve: string;
  };
}

// ===========================================
// PERFORMANCE OPTIMIZATION TYPES
// ===========================================

/**
 * Component optimization configuration
 */
export interface ComponentOptimization {
  readonly memoization: {
    readonly enabled: boolean;
    readonly dependencies: readonly string[];
    readonly customComparison?: (prev: any, next: any) => boolean;
  };
  readonly callbacks: {
    readonly throttleMs?: number;
    readonly debounceMs?: number;
    readonly memoize: boolean;
  };
  readonly rendering: {
    readonly lazy: boolean;
    readonly virtualizeList: boolean;
    readonly batchUpdates: boolean;
    readonly frameSkipping: boolean;
  };
  readonly animations: {
    readonly useNativeDriver: boolean;
    readonly optimizeForMemory: boolean;
    readonly reduceMotion: boolean;
  };
}

/**
 * List rendering optimization for device and conflict lists
 */
export interface ListOptimization {
  readonly virtualizeThreshold: number;
  readonly renderBatchSize: number;
  readonly getItemLayout?: (data: any, index: number) => { length: number; offset: number; index: number };
  readonly keyExtractor: (item: any, index: number) => string;
  readonly removeClippedSubviews: boolean;
  readonly maxToRenderPerBatch: number;
  readonly windowSize: number;
  readonly initialNumToRender: number;
}

// ===========================================
// ACCESSIBILITY COMPLIANCE TYPES
// ===========================================

/**
 * WCAG compliance for sync components
 */
export interface SyncAccessibilityCompliance {
  readonly level: 'A' | 'AA' | 'AAA';
  readonly colorContrast: {
    readonly minimum: number;
    readonly enhanced: number;
    readonly testResults: readonly ContrastTestResult[];
  };
  readonly focusManagement: {
    readonly trapFocus: boolean;
    readonly restoreFocus: boolean;
    readonly skipLinks: readonly string[];
  };
  readonly screenReader: {
    readonly announcements: boolean;
    readonly descriptions: boolean;
    readonly landmarks: boolean;
    readonly headingStructure: boolean;
  };
  readonly motorImpairments: {
    readonly minTouchTarget: number; // pixels
    readonly gestureAlternatives: boolean;
    readonly voiceControl: boolean;
  };
  readonly cognitiveSupport: {
    readonly clearInstructions: boolean;
    readonly errorPrevention: boolean;
    readonly timeoutWarnings: boolean;
    readonly simplifiedUI: boolean;
  };
}

/**
 * Color contrast test result
 */
export interface ContrastTestResult {
  readonly foreground: string;
  readonly background: string;
  readonly ratio: number;
  readonly wcagLevel: 'fail' | 'AA' | 'AAA';
  readonly context: string;
}

// ===========================================
// ERROR BOUNDARY TYPES
// ===========================================

/**
 * Sync error boundary props
 */
export interface SyncErrorBoundaryProps {
  readonly children: React.ReactNode;
  readonly fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  readonly onError?: (error: Error, errorInfo: any) => void;
  readonly isolateErrors: boolean;
  readonly emergencyMode: boolean;
  readonly showDiagnostics: boolean;
}

/**
 * Sync error boundary state
 */
export interface SyncErrorBoundaryState {
  readonly hasError: boolean;
  readonly error?: Error;
  readonly errorId: string;
  readonly timestamp: Date;
  readonly retryCount: number;
  readonly emergencyFallback: boolean;
  readonly diagnosticsAvailable: boolean;
}

// ===========================================
// TESTING SUPPORT TYPES
// ===========================================

/**
 * Component test helpers
 */
export interface SyncComponentTestHelpers {
  readonly mockSyncStatus: (status: SyncStatus) => void;
  readonly mockConflicts: (conflicts: readonly UIConflict[]) => void;
  readonly mockDevices: (devices: readonly DeviceInfo[]) => void;
  readonly simulateCrisis: (level: CrisisSeverityLevel) => void;
  readonly simulateNetworkChange: (quality: NetworkQuality) => void;
  readonly simulateBatteryChange: (level: number) => void;
  readonly triggerEmergency: () => void;
  readonly validateAccessibility: () => Promise<boolean>;
  readonly measurePerformance: () => ComponentPerformanceMetrics;
}

/**
 * Mock data generators for testing
 */
export interface SyncMockDataGenerators {
  readonly generateDeviceInfo: (overrides?: Partial<DeviceInfo>) => DeviceInfo;
  readonly generateUIConflict: (overrides?: Partial<UIConflict>) => UIConflict;
  readonly generateSyncProgress: (overrides?: Partial<SyncProgress>) => SyncProgress;
  readonly generateEmergencyContact: (overrides?: Partial<EmergencyContact>) => EmergencyContact;
  readonly generateDiagnosticsResult: (overrides?: Partial<DiagnosticsResult>) => DiagnosticsResult;
}

// ===========================================
// INTEGRATION TYPES WITH EXISTING STORES
// ===========================================

/**
 * User store integration for sync UI
 */
export interface UserStoreSyncIntegration {
  readonly syncUserPreferences: () => Promise<void>;
  readonly getUserSyncSettings: () => SyncUserSettings;
  readonly updateUserSyncSettings: (settings: Partial<SyncUserSettings>) => Promise<void>;
  readonly getUserDevices: () => readonly DeviceInfo[];
  readonly addUserDevice: (device: DeviceInfo) => Promise<void>;
  readonly removeUserDevice: (deviceId: string) => Promise<void>;
}

/**
 * Assessment store integration for therapeutic sync
 */
export interface AssessmentStoreSyncIntegration {
  readonly syncAssessmentData: () => Promise<void>;
  readonly getConflictingAssessments: () => readonly UIConflict[];
  readonly resolveAssessmentConflict: (
    conflictId: string,
    resolution: ConflictResolution<any>
  ) => Promise<void>;
  readonly prioritizeCrisisAssessments: (crisisLevel: CrisisSeverityLevel) => Promise<void>;
}

/**
 * Store integration bridge for all sync operations
 */
export interface StoreSyncBridge {
  readonly user: UserStoreSyncIntegration;
  readonly assessment: AssessmentStoreSyncIntegration;
  readonly subscribeToSyncEvents: (handlers: SyncEventHandlers) => () => void;
  readonly getGlobalSyncStatus: () => SyncStatus;
  readonly triggerGlobalSync: () => Promise<void>;
  readonly handleEmergencySync: (crisisLevel: CrisisSeverityLevel) => Promise<void>;
}

// ===========================================
// EXPORT COLLECTION
// ===========================================

// Re-export core sync types for convenience
export {
  CrisisSeverityLevel,
  SyncPriorityLevel,
  DeviceTrustLevel,
  ConflictResolutionStrategy,
  EntityType,
  NetworkQuality,
  PowerState,
  OptimizationLevel
} from './comprehensive-cross-device-sync';

// Note: All types are exported individually above where they are defined
// This file provides comprehensive type definitions for cross-device sync UI components

// ===========================================
// CONSTANTS AND DEFAULTS
// ===========================================

/**
 * Default UI configurations
 */
export const SYNC_UI_DEFAULTS = {
  STATUS_INDICATOR: {
    SIZE: 'medium' as const,
    POSITION: 'top-right' as const,
    ANIMATION_ENABLED: true,
    HAPTIC_FEEDBACK: true
  },
  DEVICE_LIST: {
    MAX_DEVICES: 5,
    REFRESH_INTERVAL: 30000, // 30 seconds
    TRUST_VERIFICATION_TIMEOUT: 300000 // 5 minutes
  },
  CONFLICT_RESOLUTION: {
    AUTO_RESOLVE_TIMEOUT: 60000, // 1 minute
    CLINICAL_REVIEW_REQUIRED_THRESHOLD: 'high' as ConflictSeverity,
    DEFER_TIMEOUT: 3600000 // 1 hour
  },
  CRISIS_BADGE: {
    PULSE_DURATION: 1000,
    EMERGENCY_TIMEOUT: 30000, // 30 seconds
    PROFESSIONAL_CONTACT_REQUIRED: CrisisSeverityLevel.HIGH
  },
  SETTINGS: {
    DIAGNOSTICS_INTERVAL: 86400000, // 24 hours
    SETTING_PERSIST_DELAY: 1000, // 1 second debounce
    ADVANCED_MODE_DEFAULT: false
  },
  PERFORMANCE: {
    RENDER_BATCH_SIZE: 10,
    ANIMATION_DURATION: 300,
    THROTTLE_MS: 100,
    DEBOUNCE_MS: 500
  },
  ACCESSIBILITY: {
    MIN_TOUCH_TARGET: 44,
    ANNOUNCEMENT_DELAY: 500,
    CONTRAST_RATIO_MIN: 4.5,
    FOCUS_RING_WIDTH: 2
  }
} as const;

/**
 * Crisis response time requirements (must align with Day 20 specs)
 */
export const CRISIS_RESPONSE_TIMES = {
  [CrisisSeverityLevel.NONE]: 10000,
  [CrisisSeverityLevel.LOW]: 5000,
  [CrisisSeverityLevel.MODERATE]: 2000,
  [CrisisSeverityLevel.HIGH]: 1000,
  [CrisisSeverityLevel.CRITICAL]: 500,
  [CrisisSeverityLevel.EMERGENCY]: 200
} as const;

/**
 * Theme color mappings for sync status
 */
export const SYNC_STATUS_COLORS = {
  [SyncStatus.SYNCING]: '#007AFF',
  [SyncStatus.SYNCED]: '#34C759',
  [SyncStatus.ERROR]: '#FF3B30',
  [SyncStatus.OFFLINE]: '#8E8E93',
  [SyncStatus.CRISIS_PRIORITY]: '#FF9500',
  [SyncStatus.CONFLICT]: '#FF9F0A',
  [SyncStatus.PAUSED]: '#A0A0A0',
  [SyncStatus.INITIAL]: '#007AFF',
  [SyncStatus.EMERGENCY_ONLY]: '#FF3B30'
} as const;