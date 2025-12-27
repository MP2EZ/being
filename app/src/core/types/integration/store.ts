/**
 * Store Integration Types - Type-Safe Zustand Store Interfaces
 * Comprehensive type definitions for crisis, compliance, and security store patterns
 * 
 * STORE REQUIREMENTS:
 * - Type-safe Zustand store interfaces with strict action typing
 * - Performance-constrained state updates (<5ms for crisis actions)
 * - Crisis-aware state management with immediate response capability
 * - Privacy-compliant data handling with encryption and audit trails
 * - Real-time synchronization with conflict resolution
 * - Memory-efficient state management with cleanup policies
 * 
 * PERFORMANCE CONSTRAINTS:
 * - State updates: <5ms for crisis actions, <10ms for standard
 * - Store hydration: <100ms on app startup
 * - Subscription notifications: <1ms per subscriber
 * - Memory usage: <50MB for complete store state
 * - Persistence operations: <20ms for critical data
 */

import { 
  CrisisDetection, 
  CrisisIntervention, 
  CrisisResource,
  CrisisSeverityLevel,
  CrisisActionType 
} from '@/features/crisis/types/safety';
import { 
  DataProtectionConsent, 
  ConsentStatus, 
  DataSensitivityLevel,
  DataProcessingPurpose,
  ComplianceAuditLog 
} from '../compliance/data-protection';
import { 
  AuthenticationSession, 
  SecurityEvent, 
  EncryptionKey,
  BiometricType,
  ThreatIntelligence 
} from '../security/encryption';
import { 
  AssessmentType, 
  PHQ9Result, 
  GAD7Result, 
  AssessmentProgress,
  AssessmentSession 
} from '@/features/assessment/types';

/**
 * Base Store Interface
 */
export interface BaseStore<T = any> {
  /** Store state */
  state: T;
  /** Store loading status */
  loading: boolean;
  /** Store error state */
  error: Error | null;
  /** Store metadata */
  metadata: StoreMetadata;
  /** Performance metrics */
  performance: StorePerformanceMetrics;
  /** Store actions */
  actions: StoreActions<T>;
  /** Store subscriptions */
  subscriptions: StoreSubscriptionManager;
}

/**
 * Store Metadata
 */
export interface StoreMetadata {
  /** Store name/identifier */
  name: string;
  /** Store version */
  version: string;
  /** Last updated timestamp */
  lastUpdated: number;
  /** Store initialization timestamp */
  createdAt: number;
  /** Data source information */
  dataSource: 'local' | 'remote' | 'hybrid';
  /** Persistence strategy */
  persistence: StorePersistenceConfig;
  /** Sync status */
  syncStatus: StoreSyncStatus;
  /** Encryption status */
  encryptionStatus: StoreEncryptionStatus;
}

/**
 * Store Performance Metrics
 */
export interface StorePerformanceMetrics {
  /** Average action execution time (ms) */
  averageActionTimeMs: number;
  /** Average state update time (ms) */
  averageUpdateTimeMs: number;
  /** Memory usage (MB) */
  memoryUsageMB: number;
  /** Number of active subscriptions */
  activeSubscriptions: number;
  /** Total number of actions executed */
  totalActions: number;
  /** Actions per second */
  actionsPerSecond: number;
  /** Last performance assessment */
  lastAssessmentAt: number;
  /** Performance violations */
  violations: PerformanceViolation[];
}

/**
 * Performance Violation
 */
export interface PerformanceViolation {
  /** Violation type */
  type: 'action_timeout' | 'memory_limit' | 'subscription_overflow' | 'sync_failure';
  /** Violation timestamp */
  timestamp: number;
  /** Violation details */
  details: string;
  /** Metric value that violated threshold */
  value: number;
  /** Threshold that was violated */
  threshold: number;
  /** Severity level */
  severity: 'warning' | 'error' | 'critical';
}

/**
 * Store Actions Interface
 */
export interface StoreActions<T> {
  /** Initialize store */
  initialize: () => Promise<void>;
  /** Reset store to initial state */
  reset: () => void;
  /** Update store state */
  setState: (updater: (state: T) => T | Partial<T>) => void;
  /** Get current store state */
  getState: () => T;
  /** Subscribe to store changes */
  subscribe: (listener: StoreListener<T>) => StoreUnsubscribe;
  /** Persist store state */
  persist: () => Promise<void>;
  /** Hydrate store from persistence */
  hydrate: () => Promise<void>;
  /** Cleanup store resources */
  cleanup: () => void;
}

/**
 * Store Listener and Unsubscribe Types
 */
export type StoreListener<T> = (state: T, previousState: T) => void;
export type StoreUnsubscribe = () => void;

/**
 * Store Persistence Configuration
 */
export interface StorePersistenceConfig {
  /** Persistence enabled */
  enabled: boolean;
  /** Storage type */
  storageType: 'async_storage' | 'secure_store' | 'keychain' | 'memory';
  /** Persistence key */
  key: string;
  /** Encryption required for persistence */
  encrypted: boolean;
  /** Persistence frequency */
  frequency: 'immediate' | 'debounced' | 'interval' | 'manual';
  /** Debounce delay (ms) */
  debounceMs?: number;
  /** Persistence interval (ms) */
  intervalMs?: number;
  /** Data migration strategy */
  migration: PersistenceMigrationConfig;
  /** Backup configuration */
  backup: PersistenceBackupConfig;
}

/**
 * Persistence Migration Configuration
 */
export interface PersistenceMigrationConfig {
  /** Current version */
  version: number;
  /** Migration functions by version */
  migrations: Record<number, (state: any) => any>;
  /** Fallback strategy for missing migrations */
  fallbackStrategy: 'reset' | 'preserve' | 'error';
}

/**
 * Persistence Backup Configuration
 */
export interface PersistenceBackupConfig {
  /** Backup enabled */
  enabled: boolean;
  /** Maximum number of backups */
  maxBackups: number;
  /** Backup frequency */
  frequency: 'daily' | 'weekly' | 'on_change' | 'manual';
  /** Backup compression */
  compressed: boolean;
  /** Backup encryption */
  encrypted: boolean;
}

/**
 * Store Sync Status
 */
export interface StoreSyncStatus {
  /** Sync enabled */
  enabled: boolean;
  /** Last sync timestamp */
  lastSyncAt?: number;
  /** Sync status */
  status: 'idle' | 'syncing' | 'success' | 'error' | 'conflict';
  /** Pending changes count */
  pendingChanges: number;
  /** Sync errors */
  errors: StoreSyncError[];
  /** Conflict resolution strategy */
  conflictResolution: 'local_wins' | 'remote_wins' | 'manual' | 'merge';
}

/**
 * Store Sync Error
 */
export interface StoreSyncError {
  /** Error timestamp */
  timestamp: number;
  /** Error type */
  type: 'network' | 'auth' | 'conflict' | 'validation' | 'server';
  /** Error message */
  message: string;
  /** Error details */
  details?: any;
  /** Retry count */
  retryCount: number;
  /** Max retries */
  maxRetries: number;
  /** Next retry timestamp */
  nextRetryAt?: number;
}

/**
 * Store Encryption Status
 */
export interface StoreEncryptionStatus {
  /** Encryption enabled */
  enabled: boolean;
  /** Encryption key ID */
  keyId?: string;
  /** Encryption algorithm */
  algorithm?: string;
  /** Encrypted fields */
  encryptedFields: string[];
  /** Last encryption update */
  lastEncryptionUpdate?: number;
}

/**
 * Store Subscription Manager
 */
export interface StoreSubscriptionManager {
  /** Active subscriptions */
  subscriptions: Map<string, StoreSubscription>;
  /** Subscribe to specific state path */
  subscribe: <K extends keyof any>(
    path: K[], 
    listener: (value: any, previousValue: any) => void
  ) => string;
  /** Unsubscribe from state path */
  unsubscribe: (subscriptionId: string) => void;
  /** Clear all subscriptions */
  clearAll: () => void;
  /** Get subscription count */
  getCount: () => number;
}

/**
 * Store Subscription
 */
export interface StoreSubscription {
  /** Subscription ID */
  id: string;
  /** State path being watched */
  path: string[];
  /** Subscription listener */
  listener: (value: any, previousValue: any) => void;
  /** Subscription created at */
  createdAt: number;
  /** Last notification timestamp */
  lastNotifiedAt?: number;
  /** Notification count */
  notificationCount: number;
}

/**
 * Crisis Store Interface
 */
export interface CrisisStore extends BaseStore<CrisisStoreState> {
  actions: CrisisStoreActions;
}

/**
 * Crisis Store State
 */
export interface CrisisStoreState {
  /** Current crisis detection */
  currentCrisis: CrisisDetection | null;
  /** Active intervention */
  activeIntervention: CrisisIntervention | null;
  /** Crisis history */
  crisisHistory: CrisisDetection[];
  /** Available crisis resources */
  resources: CrisisResource[];
  /** Emergency contacts */
  emergencyContacts: EmergencyContact[];
  /** Safety plan */
  safetyPlan: CrisisSafetyPlan | null;
  /** Crisis settings */
  settings: CrisisSettings;
  /** Real-time monitoring */
  monitoring: CrisisMonitoring;
}

/**
 * Emergency Contact
 */
export interface EmergencyContact {
  /** Contact ID */
  id: string;
  /** Contact name */
  name: string;
  /** Contact type */
  type: 'professional' | 'personal' | 'emergency_service' | 'crisis_hotline';
  /** Contact method */
  contactMethod: 'phone' | 'text' | 'app' | 'other';
  /** Contact information */
  contact: string;
  /** Availability */
  availability: '24/7' | 'business_hours' | 'emergency_only' | 'by_appointment';
  /** Priority level */
  priority: 'primary' | 'secondary' | 'backup';
  /** Last contacted */
  lastContacted?: number;
  /** Contact success rate */
  successRate: number;
}

/**
 * Crisis Safety Plan
 */
export interface CrisisSafetyPlan {
  /** Plan ID */
  id: string;
  /** Warning signs */
  warningSignsPersonal: string[];
  warningSignsEnvironmental: string[];
  /** Coping strategies */
  copingStrategies: CopingStrategy[];
  /** Support contacts */
  supportContacts: EmergencyContact[];
  /** Safe environment measures */
  environmentalSafety: string[];
  /** Reasons for living */
  reasonsForLiving: string[];
  /** Plan last updated */
  lastUpdated: number;
  /** Plan effectiveness tracking */
  effectiveness: PlanEffectiveness;
}

/**
 * Coping Strategy
 */
export interface CopingStrategy {
  /** Strategy name */
  name: string;
  /** Strategy description */
  description: string;
  /** Effectiveness rating */
  effectiveness: 1 | 2 | 3 | 4 | 5;
  /** Times used */
  timesUsed: number;
  /** Last used */
  lastUsed?: number;
  /** Strategy type */
  type: 'breathing' | 'mindfulness' | 'physical' | 'social' | 'creative' | 'other';
}

/**
 * Plan Effectiveness
 */
export interface PlanEffectiveness {
  /** Overall effectiveness score */
  overallScore: number;
  /** Times plan was used */
  timesUsed: number;
  /** Success rate */
  successRate: number;
  /** User feedback scores */
  userFeedback: number[];
  /** Last assessment */
  lastAssessment: number;
}

/**
 * Crisis Settings
 */
export interface CrisisSettings {
  /** Crisis detection enabled */
  detectionEnabled: boolean;
  /** Automatic intervention */
  autoIntervention: boolean;
  /** Emergency contact preferences */
  emergencyContactPreference: '988' | 'personal' | 'both';
  /** Notification preferences */
  notifications: CrisisNotificationSettings;
  /** Privacy settings */
  privacy: CrisisPrivacySettings;
  /** Accessibility settings */
  accessibility: CrisisAccessibilitySettings;
}

/**
 * Crisis Notification Settings
 */
export interface CrisisNotificationSettings {
  /** Push notifications enabled */
  pushEnabled: boolean;
  /** SMS notifications enabled */
  smsEnabled: boolean;
  /** Email notifications enabled */
  emailEnabled: boolean;
  /** Notification contacts */
  notificationContacts: string[];
  /** Quiet hours */
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

/**
 * Crisis Privacy Settings
 */
export interface CrisisPrivacySettings {
  /** Share data with providers */
  shareWithProviders: boolean;
  /** Anonymous data sharing */
  anonymousSharing: boolean;
  /** Emergency override consent */
  emergencyOverride: boolean;
  /** Data retention period */
  dataRetentionDays: number;
}

/**
 * Crisis Accessibility Settings
 */
export interface CrisisAccessibilitySettings {
  /** High contrast mode */
  highContrastMode: boolean;
  /** Large text */
  largeText: boolean;
  /** Voice guidance */
  voiceGuidance: boolean;
  /** Haptic feedback */
  hapticFeedback: boolean;
  /** Reduced motion */
  reducedMotion: boolean;
  /** Quick access shortcuts */
  quickAccessShortcuts: boolean;
}

/**
 * Crisis Monitoring
 */
export interface CrisisMonitoring {
  /** Monitoring enabled */
  enabled: boolean;
  /** Real-time assessment scores */
  realTimeScores: {
    phq9: number | null;
    gad7: number | null;
    lastUpdated: number;
  };
  /** Risk indicators */
  riskIndicators: CrisisRiskIndicator[];
  /** Trend analysis */
  trends: CrisisTrendAnalysis;
  /** Monitoring frequency */
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly';
}

/**
 * Crisis Risk Indicator
 */
export interface CrisisRiskIndicator {
  /** Indicator type */
  type: 'behavioral' | 'assessment' | 'environmental' | 'social';
  /** Indicator name */
  name: string;
  /** Current value */
  value: number;
  /** Risk threshold */
  threshold: number;
  /** Risk level */
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  /** Last updated */
  lastUpdated: number;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'worsening';
}

/**
 * Crisis Trend Analysis
 */
export interface CrisisTrendAnalysis {
  /** Overall trend direction */
  overallTrend: 'improving' | 'stable' | 'worsening';
  /** Trend confidence */
  confidence: number;
  /** Key factors */
  keyFactors: string[];
  /** Predicted risk level */
  predictedRisk: CrisisSeverityLevel;
  /** Time to predicted risk */
  timeToRiskHours?: number;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Crisis Store Actions
 */
export interface CrisisStoreActions extends StoreActions<CrisisStoreState> {
  /** Crisis detection actions */
  detectCrisis: (assessment: PHQ9Result | GAD7Result) => Promise<CrisisDetection | null>;
  activateIntervention: (detection: CrisisDetection) => Promise<CrisisIntervention>;
  resolveIntervention: (interventionId: string, resolution: any) => Promise<void>;
  
  /** Emergency contact actions */
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<string>;
  updateEmergencyContact: (id: string, updates: Partial<EmergencyContact>) => Promise<void>;
  removeEmergencyContact: (id: string) => Promise<void>;
  contactEmergency: (contactId: string) => Promise<void>;
  
  /** Safety plan actions */
  createSafetyPlan: (plan: Omit<CrisisSafetyPlan, 'id'>) => Promise<string>;
  updateSafetyPlan: (id: string, updates: Partial<CrisisSafetyPlan>) => Promise<void>;
  activateSafetyPlan: (id: string) => Promise<void>;
  
  /** Settings actions */
  updateSettings: (settings: Partial<CrisisSettings>) => Promise<void>;
  
  /** Monitoring actions */
  updateMonitoring: (monitoring: Partial<CrisisMonitoring>) => Promise<void>;
  assessRisk: () => Promise<CrisisRiskIndicator[]>;
  analyzeTrends: () => Promise<CrisisTrendAnalysis>;
  
  /** Performance-critical actions */
  emergencyActivation: () => Promise<void>; // Must complete in <200ms
  quickContact988: () => Promise<void>; // Must complete in <100ms
}

/**
 * Compliance Store Interface
 */
export interface ComplianceStore extends BaseStore<ComplianceStoreState> {
  actions: ComplianceStoreActions;
}

/**
 * Compliance Store State
 */
export interface ComplianceStoreState {
  /** User consents */
  consents: Record<string, DataProtectionConsent>;
  /** Audit logs */
  auditLogs: ComplianceAuditLog[];
  /** PHI data inventory */
  phiInventory: PHIDataInventory;
  /** Compliance status */
  complianceStatus: ComplianceStatus;
  /** Data retention policies */
  retentionPolicies: DataRetentionPolicy[];
  /** Breach incidents */
  breachIncidents: DataBreachIncident[];
  /** Compliance settings */
  settings: ComplianceSettings;
}

/**
 * PHI Data Inventory
 */
export interface PHIDataInventory {
  /** Data categories */
  categories: Record<DataSensitivityLevel, PHIDataCategory>;
  /** Total data volume */
  totalVolumeBytes: number;
  /** Data locations */
  dataLocations: DataLocation[];
  /** Last inventory update */
  lastUpdated: number;
  /** Compliance score */
  complianceScore: number;
}

/**
 * PHI Data Category
 */
export interface PHIDataCategory {
  /** Category type */
  type: DataSensitivityLevel;
  /** Number of records */
  recordCount: number;
  /** Data volume in bytes */
  volumeBytes: number;
  /** Encryption status */
  encrypted: boolean;
  /** Consent coverage */
  consentCoverage: number;
  /** Retention compliance */
  retentionCompliant: boolean;
  /** Last access */
  lastAccessed?: number;
}

/**
 * Data Location
 */
export interface DataLocation {
  /** Location identifier */
  id: string;
  /** Location type */
  type: 'device_storage' | 'secure_store' | 'keychain' | 'remote_server' | 'backup';
  /** Encryption status */
  encrypted: boolean;
  /** Data categories stored */
  dataCategories: DataSensitivityLevel[];
  /** Access controls */
  accessControls: string[];
  /** Compliance status */
  compliant: boolean;
}

/**
 * Compliance Status
 */
export interface ComplianceStatus {
  /** Overall compliance score */
  overallScore: number;
  /** Privacy compliance status */
  privacyCompliant: boolean;
  /** GDPR compliance status */
  gdprCompliant: boolean;
  /** Consent compliance */
  consentCompliance: number;
  /** Audit compliance */
  auditCompliance: number;
  /** Security compliance */
  securityCompliance: number;
  /** Last assessment */
  lastAssessment: number;
  /** Violations */
  violations: ComplianceViolation[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Compliance Violation
 */
export interface ComplianceViolation {
  /** Violation ID */
  id: string;
  /** Violation type */
  type: 'consent' | 'audit' | 'retention' | 'security' | 'access';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Violation description */
  description: string;
  /** Detected timestamp */
  detectedAt: number;
  /** Resolution required */
  resolutionRequired: boolean;
  /** Resolution deadline */
  resolutionDeadline?: number;
  /** Resolution status */
  resolved: boolean;
  /** Resolution timestamp */
  resolvedAt?: number;
}

/**
 * Data Retention Policy
 */
export interface DataRetentionPolicy {
  /** Policy ID */
  id: string;
  /** Data type */
  dataType: DataSensitivityLevel;
  /** Retention period (ms) */
  retentionPeriodMs: number;
  /** Auto-deletion enabled */
  autoDelete: boolean;
  /** Grace period (ms) */
  gracePeriodMs: number;
  /** Backup retention (ms) */
  backupRetentionMs: number;
  /** Policy effective date */
  effectiveDate: number;
  /** Policy version */
  version: number;
}

/**
 * Data Breach Incident
 */
export interface DataBreachIncident {
  /** Incident ID */
  id: string;
  /** Incident type */
  type: 'unauthorized_access' | 'data_theft' | 'system_compromise' | 'human_error';
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Affected data types */
  affectedDataTypes: DataSensitivityLevel[];
  /** Number of affected users */
  affectedUserCount: number;
  /** Incident timestamp */
  timestamp: number;
  /** Discovery timestamp */
  discoveryTimestamp: number;
  /** Containment status */
  contained: boolean;
  /** Notification required */
  notificationRequired: boolean;
  /** Authorities notified */
  authoritiesNotified: boolean;
  /** Users notified */
  usersNotified: boolean;
}

/**
 * Compliance Settings
 */
export interface ComplianceSettings {
  /** Auto-audit enabled */
  autoAudit: boolean;
  /** Audit frequency */
  auditFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  /** Consent reminder frequency */
  consentReminderDays: number;
  /** Data retention defaults */
  defaultRetentionDays: number;
  /** Breach notification settings */
  breachNotification: {
    autoNotify: boolean;
    notificationDelayHours: number;
    includeDetails: boolean;
  };
}

/**
 * Compliance Store Actions
 */
export interface ComplianceStoreActions extends StoreActions<ComplianceStoreState> {
  /** Consent management */
  requestConsent: (type: string, purposes: DataProcessingPurpose[]) => Promise<string>;
  grantConsent: (consentId: string) => Promise<void>;
  withdrawConsent: (consentId: string, reason: string) => Promise<void>;
  renewConsent: (consentId: string) => Promise<void>;
  
  /** Audit logging */
  logAuditEvent: (event: Partial<ComplianceAuditLog>) => Promise<void>;
  getAuditTrail: (userId: string, timeRange: [number, number]) => Promise<ComplianceAuditLog[]>;
  
  /** PHI management */
  updatePHIInventory: () => Promise<void>;
  validateDataCompliance: (dataType: DataSensitivityLevel) => Promise<boolean>;
  
  /** Breach management */
  reportBreach: (incident: Partial<DataBreachIncident>) => Promise<string>;
  investigateBreach: (incidentId: string) => Promise<void>;
  resolveBreach: (incidentId: string) => Promise<void>;
  
  /** Settings management */
  updateComplianceSettings: (settings: Partial<ComplianceSettings>) => Promise<void>;
  
  /** Performance-critical actions */
  validateConsentFast: (userId: string, dataType: DataSensitivityLevel) => Promise<boolean>; // <5ms
  auditAccessFast: (userId: string, resourceId: string) => Promise<void>; // <10ms
}

/**
 * Security Store Interface
 */
export interface SecurityStore extends BaseStore<SecurityStoreState> {
  actions: SecurityStoreActions;
}

/**
 * Security Store State
 */
export interface SecurityStoreState {
  /** Current authentication session */
  session: AuthenticationSession | null;
  /** Security events */
  securityEvents: SecurityEvent[];
  /** Encryption keys */
  encryptionKeys: Record<string, EncryptionKey>;
  /** Threat intelligence */
  threatIntelligence: ThreatIntelligence[];
  /** Security settings */
  settings: SecuritySettings;
  /** Device security status */
  deviceSecurity: DeviceSecurityStatus;
  /** Network security status */
  networkSecurity: NetworkSecurityStatus;
}

/**
 * Security Settings
 */
export interface SecuritySettings {
  /** Authentication settings */
  authentication: {
    biometricEnabled: boolean;
    biometricTypes: BiometricType[];
    passwordRequired: boolean;
    twoFactorRequired: boolean;
    sessionTimeoutMs: number;
  };
  /** Encryption settings */
  encryption: {
    algorithm: string;
    keyRotationDays: number;
    backupEncryption: boolean;
  };
  /** Monitoring settings */
  monitoring: {
    realTimeMonitoring: boolean;
    threatDetection: boolean;
    anomalyDetection: boolean;
    alertThresholds: Record<string, number>;
  };
}

/**
 * Device Security Status
 */
export interface DeviceSecurityStatus {
  /** Device is trusted */
  trusted: boolean;
  /** Device is compromised */
  compromised: boolean;
  /** Jailbreak/root detected */
  jailbroken: boolean;
  /** Debugger detected */
  debuggerDetected: boolean;
  /** Security features available */
  securityFeatures: {
    biometric: boolean;
    secureEnclave: boolean;
    keychain: boolean;
  };
  /** Last security check */
  lastSecurityCheck: number;
}

/**
 * Network Security Status
 */
export interface NetworkSecurityStatus {
  /** Connection is secure */
  secure: boolean;
  /** VPN detected */
  vpnDetected: boolean;
  /** Proxy detected */
  proxyDetected: boolean;
  /** Known malicious IP */
  maliciousIP: boolean;
  /** Network trust score */
  trustScore: number;
  /** Last network check */
  lastNetworkCheck: number;
}

/**
 * Security Store Actions
 */
export interface SecurityStoreActions extends StoreActions<SecurityStoreState> {
  /** Authentication actions */
  authenticate: (method: string, credentials: any) => Promise<AuthenticationSession>;
  validateSession: () => Promise<boolean>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  
  /** Encryption actions */
  generateKey: (type: string) => Promise<string>;
  encryptData: (data: string, keyId: string) => Promise<string>;
  decryptData: (encryptedData: string, keyId: string) => Promise<string>;
  rotateKeys: () => Promise<void>;
  
  /** Security monitoring */
  recordSecurityEvent: (event: Partial<SecurityEvent>) => Promise<void>;
  assessThreat: (indicators: any[]) => Promise<ThreatIntelligence>;
  respondToThreat: (threatId: string) => Promise<void>;
  
  /** Device security */
  checkDeviceSecurity: () => Promise<DeviceSecurityStatus>;
  validateDeviceTrust: () => Promise<boolean>;
  
  /** Network security */
  checkNetworkSecurity: () => Promise<NetworkSecurityStatus>;
  validateNetworkTrust: () => Promise<boolean>;
  
  /** Performance-critical actions */
  fastAuth: (biometric: boolean) => Promise<boolean>; // <200ms
  fastEncrypt: (data: string) => Promise<string>; // <50ms
  emergencyLockdown: () => Promise<void>; // <100ms
}

/**
 * Store Integration Utilities
 */
export type TypedStore<T> = BaseStore<T>;
export type StoreWithActions<T, A> = BaseStore<T> & { actions: A };
export type PerformanceStore<T> = BaseStore<T> & { 
  performance: Required<StorePerformanceMetrics>;
  enforceConstraints: boolean;
};

/**
 * Store Factory Types
 */
export interface StoreFactory {
  createCrisisStore: () => CrisisStore;
  createComplianceStore: () => ComplianceStore;
  createSecurityStore: () => SecurityStore;
  createStore: <T, A>(config: StoreConfig<T, A>) => StoreWithActions<T, A>;
}

/**
 * Store Configuration
 */
export interface StoreConfig<T, A> {
  /** Store name */
  name: string;
  /** Initial state */
  initialState: T;
  /** Store actions */
  actions: A;
  /** Persistence configuration */
  persistence?: StorePersistenceConfig;
  /** Performance constraints */
  performance?: StorePerformanceConstraints;
  /** Security requirements */
  security?: StoreSecurityConfig;
}

/**
 * Store Performance Constraints
 */
export interface StorePerformanceConstraints {
  /** Maximum action execution time (ms) */
  maxActionTimeMs: number;
  /** Maximum state update time (ms) */
  maxUpdateTimeMs: number;
  /** Maximum memory usage (MB) */
  maxMemoryMB: number;
  /** Maximum subscriptions */
  maxSubscriptions: number;
  /** Performance monitoring enabled */
  monitoringEnabled: boolean;
}

/**
 * Store Security Configuration
 */
export interface StoreSecurityConfig {
  /** Encryption required */
  encryptionRequired: boolean;
  /** Audit logging required */
  auditRequired: boolean;
  /** Access control enabled */
  accessControlEnabled: boolean;
  /** Session validation required */
  sessionValidationRequired: boolean;
}

/**
 * Default Store Settings
 */
export const DEFAULT_STORE_SETTINGS = {
  /** Performance constraints */
  PERFORMANCE: {
    MAX_ACTION_TIME_MS: 10,
    MAX_CRISIS_ACTION_TIME_MS: 5,
    MAX_UPDATE_TIME_MS: 5,
    MAX_MEMORY_MB: 50,
    MAX_SUBSCRIPTIONS: 100
  },
  /** Persistence settings */
  PERSISTENCE: {
    DEBOUNCE_MS: 500,
    BACKUP_COUNT: 5,
    MIGRATION_TIMEOUT_MS: 5000
  },
  /** Security settings */
  SECURITY: {
    SESSION_TIMEOUT_MS: 8 * 60 * 60 * 1000, // 8 hours
    KEY_ROTATION_DAYS: 90,
    AUDIT_RETENTION_DAYS: 2555 // 7 years
  }
} as const;