/**
 * Authentication Store Types - Zustand Integration
 *
 * Type-safe store patterns for authentication state management
 * integrating with existing FullMind store architecture.
 */

import type { StoreApi, UseBoundStore } from 'zustand';
import type {
  AuthenticationMethod,
  AuthenticationResult,
  AuthenticationFlow,
  AuthenticationError,
  EnhancedAuthSession,
  UserAuthenticationProfile,
  AuthenticationPreferences,
  CrisisSessionContext,
  SessionStatus,
  ComplianceStatus,
  EnhancedJWTValidationResult,
  CrisisTrigger,
  BiometricTemplate,
  OAuthProviderConfig,
  OAuthAuthenticationResult,
  EnhancedUserMigration,
  EmergencyContact,
  AUTHENTICATION_CONSTANTS
} from './authentication';
import type { UserProfile } from './index';
import type { CloudFeatureFlags } from './cloud';

/**
 * Core Authentication Store State
 */
export interface AuthenticationStoreState {
  // Current Authentication State
  readonly currentSession: EnhancedAuthSession | null;
  readonly authenticationFlow: AuthenticationFlow | null;
  readonly userAuthProfile: UserAuthenticationProfile | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: AuthenticationError | null;
  readonly crisisMode: boolean;

  // Session Management
  readonly sessionStatus: SessionStatus | null;
  readonly sessionWarning: SessionWarning | null;
  readonly deviceSessions: readonly DeviceSessionInfo[];
  readonly securityLevel: 'low' | 'medium' | 'high';

  // Authentication Method States
  readonly biometricStatus: BiometricStatus;
  readonly oauthStatus: OAuthStatus;
  readonly emergencyStatus: EmergencyStatus;

  // Compliance and Security
  readonly complianceStatus: ComplianceStatus;
  readonly encryptionStatus: EncryptionStatus;
  readonly auditTrail: readonly AuthAuditEntry[];

  // Feature Flags and Configuration
  readonly featureFlags: AuthenticationFeatureFlags;
  readonly configuration: AuthenticationConfiguration;

  // Migration State
  readonly migrationState: MigrationState | null;
  readonly migrationProgress: number; // 0-100

  // Crisis Context
  readonly crisisContext: CrisisSessionContext | null;
  readonly emergencyContacts: readonly EmergencyContact[];
  readonly crisisHistory: readonly CrisisEvent[];
}

/**
 * Authentication Store Actions
 */
export interface AuthenticationStoreActions {
  // Core Authentication Actions
  signInAnonymous: () => Promise<AuthenticationResult>;
  signUpWithBiometric: (biometricType: 'face' | 'fingerprint' | 'voice') => Promise<AuthenticationResult>;
  signInWithBiometric: (biometricType: 'face' | 'fingerprint' | 'voice') => Promise<AuthenticationResult>;
  signInWithOAuth: (provider: 'apple' | 'google') => Promise<AuthenticationResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<AuthenticationResult>;

  // User Migration
  migrateToAuthenticated: (authMethod: AuthenticationMethod) => Promise<AuthenticationResult>;
  checkMigrationEligibility: () => Promise<MigrationEligibility>;
  startMigration: (strategy: MigrationStrategy) => Promise<void>;
  cancelMigration: () => Promise<void>;

  // Session Management
  extendSession: () => Promise<AuthenticationResult>;
  validateJWT: (token: string) => Promise<EnhancedJWTValidationResult>;
  revokeDevice: (deviceId: string) => Promise<void>;
  revokeAllDevices: () => Promise<void>;
  getSessionHealth: () => SessionHealth;

  // Crisis Management
  enterCrisisMode: (trigger: CrisisTrigger) => Promise<void>;
  exitCrisisMode: () => Promise<void>;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  updateEmergencyContact: (id: string, updates: Partial<EmergencyContact>) => Promise<void>;
  removeEmergencyContact: (id: string) => Promise<void>;
  testEmergencyContact: (id: string) => Promise<ContactTestResult>;

  // Biometric Management
  enrollBiometric: (type: 'face' | 'fingerprint' | 'voice') => Promise<BiometricEnrollmentResult>;
  updateBiometricTemplate: (templateId: string) => Promise<void>;
  removeBiometric: (templateId: string) => Promise<void>;
  testBiometric: (type: 'face' | 'fingerprint' | 'voice') => Promise<BiometricTestResult>;

  // OAuth Management
  linkOAuthProvider: (provider: 'apple' | 'google') => Promise<OAuthLinkResult>;
  unlinkOAuthProvider: (provider: 'apple' | 'google') => Promise<void>;
  refreshOAuthTokens: (provider: 'apple' | 'google') => Promise<OAuthRefreshResult>;

  // Preferences and Configuration
  updatePreferences: (preferences: Partial<AuthenticationPreferences>) => Promise<void>;
  updateSecuritySettings: (settings: Partial<UserSecuritySettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;

  // Compliance and Audit
  getComplianceReport: () => Promise<ComplianceReport>;
  exportAuditLogs: (dateRange?: DateRange) => Promise<AuditExport>;
  acknowledgeComplianceWarning: (warningId: string) => Promise<void>;

  // Error Handling
  clearError: () => void;
  retryLastOperation: () => Promise<AuthenticationResult>;
  reportSecurityIncident: (incident: SecurityIncident) => Promise<void>;

  // State Management
  reset: () => Promise<void>;
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
}

/**
 * Authentication Store Selectors
 */
export interface AuthenticationStoreSelectors {
  // Authentication State Selectors
  getAuthMethod: () => AuthenticationMethod | null;
  isSessionValid: () => boolean;
  canUseBiometric: () => boolean;
  canUseOAuth: (provider: 'apple' | 'google') => boolean;
  isDeviceTrusted: () => boolean;
  getTimeUntilExpiry: () => number; // seconds
  requiresReauthentication: () => boolean;

  // Security Level Selectors
  getSecurityLevel: () => 'low' | 'medium' | 'high';
  getRiskScore: () => number; // 0-1
  getSecurityFlags: () => readonly SecurityFlag[];
  hasSecurityIssues: () => boolean;

  // Crisis Mode Selectors
  isCrisisMode: () => boolean;
  getCrisisContext: () => CrisisSessionContext | null;
  getEmergencyContacts: () => readonly EmergencyContact[];
  canExitCrisisMode: () => boolean;

  // Compliance Selectors
  getComplianceStatus: () => ComplianceStatus;
  hasComplianceIssues: () => boolean;
  getDataAccessPermissions: () => readonly DataAccessPermission[];
  getRetentionStatus: () => RetentionStatus;

  // Feature Availability Selectors
  getAvailableAuthMethods: () => readonly AuthenticationMethod[];
  getBiometricCapabilities: () => BiometricCapabilities;
  getOAuthProviders: () => readonly ('apple' | 'google')[];
  getFeatureFlags: () => AuthenticationFeatureFlags;

  // Migration Selectors
  isMigrationAvailable: () => boolean;
  getMigrationProgress: () => number; // 0-100
  canRollbackMigration: () => boolean;
  getMigrationBenefits: () => readonly string[];

  // Performance Selectors
  getPerformanceMetrics: () => AuthPerformanceMetrics;
  getLatencyMetrics: () => LatencyMetrics;
  getErrorRates: () => ErrorRateMetrics;
}

/**
 * Complete Authentication Store Interface
 */
export interface AuthenticationStore
  extends AuthenticationStoreState,
          AuthenticationStoreActions,
          AuthenticationStoreSelectors {}

/**
 * Supporting Types for Store Implementation
 */
export interface SessionWarning {
  readonly type: 'expiring_soon' | 'device_change' | 'security_risk' | 'compliance_issue';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly message: string;
  readonly actionRequired: boolean;
  readonly expiresAt?: string;
  readonly actions?: readonly WarningAction[];
}

export interface WarningAction {
  readonly id: string;
  readonly label: string;
  readonly action: () => Promise<void>;
  readonly primary: boolean;
}

export interface DeviceSessionInfo {
  readonly deviceId: string;
  readonly deviceName: string;
  readonly platform: 'ios' | 'android';
  readonly lastActive: string;
  readonly location?: string; // Anonymized
  readonly trusted: boolean;
  readonly current: boolean;
  readonly sessionId: string;
}

export interface BiometricStatus {
  readonly available: boolean;
  readonly enrolled: readonly BiometricTemplate[];
  readonly capabilities: BiometricCapabilities;
  readonly lastUsed?: string;
  readonly failureCount: number;
  readonly isLocked: boolean;
  readonly quality: number; // 0-1
}

export interface OAuthStatus {
  readonly providers: readonly OAuthProviderStatus[];
  readonly available: readonly ('apple' | 'google')[];
  readonly linked: readonly ('apple' | 'google')[];
  readonly lastUsed?: string;
}

export interface OAuthProviderStatus {
  readonly provider: 'apple' | 'google';
  readonly linked: boolean;
  readonly lastUsed?: string;
  readonly tokenExpiry?: string;
  readonly needsRefresh: boolean;
  readonly scope: readonly string[];
}

export interface EmergencyStatus {
  readonly enabled: boolean;
  readonly contactsConfigured: boolean;
  readonly lastTested?: string;
  readonly emergencyNumber: string; // "988"
  readonly autoDialEnabled: boolean;
  readonly crisisDetectionEnabled: boolean;
}

export interface EncryptionStatus {
  readonly enabled: boolean;
  readonly algorithm: string;
  readonly keyVersion: number;
  readonly lastRotation: string;
  readonly zeroKnowledgeEnabled: boolean;
  readonly hardwareEncryption: boolean;
  readonly complianceLevel: 'basic' | 'hipaa' | 'enhanced';
}

export interface AuthAuditEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly event: string;
  readonly method: AuthenticationMethod;
  readonly success: boolean;
  readonly riskScore: number;
  readonly deviceId: string;
  readonly location?: string; // Anonymized
  readonly metadata?: Record<string, unknown>;
}

export interface AuthenticationFeatureFlags extends CloudFeatureFlags {
  readonly biometricAuth: boolean;
  readonly oauthProviders: boolean;
  readonly multiDeviceSync: boolean;
  readonly crisisDetection: boolean;
  readonly emergencyBypass: boolean;
  readonly advancedSecurity: boolean;
  readonly auditLogging: boolean;
  readonly migrationAssistant: boolean;
}

export interface AuthenticationConfiguration {
  readonly sessionTimeout: number;
  readonly jwtExpiry: number; // 15 minutes
  readonly maxDevices: number;
  readonly biometricQualityThreshold: number;
  readonly riskScoreThreshold: number;
  readonly oauthProviders: readonly OAuthProviderConfig[];
  readonly crisisThresholds: CrisisThresholds;
  readonly complianceSettings: ComplianceSettings;
}

export interface MigrationState {
  readonly active: boolean;
  readonly phase: 'preparation' | 'consent' | 'backup' | 'transfer' | 'verification' | 'completion';
  readonly fromMethod: AuthenticationMethod;
  readonly toMethod: AuthenticationMethod;
  readonly startedAt: string;
  readonly estimatedCompletion: string;
  readonly canCancel: boolean;
  readonly canRollback: boolean;
  readonly errors: readonly string[];
}

export interface CrisisEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly trigger: CrisisTrigger;
  readonly response: CrisisResponse;
  readonly duration: number; // seconds
  readonly contactsNotified: readonly string[];
  readonly dataBackedUp: boolean;
  readonly resolved: boolean;
}

export interface CrisisResponse {
  readonly type: 'automatic' | 'manual' | 'emergency_contact';
  readonly actions: readonly string[];
  readonly success: boolean;
  readonly responseTime: number; // milliseconds
}

export interface MigrationEligibility {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
  readonly requirements: readonly string[];
  readonly estimatedDuration: number; // seconds
  readonly dataSize: number; // bytes
  readonly benefits: readonly string[];
}

export interface MigrationStrategy {
  readonly approach: 'full' | 'selective' | 'gradual';
  readonly preserveData: boolean;
  readonly upgradeEncryption: boolean;
  readonly enableCloudSync: boolean;
  readonly backupFirst: boolean;
}

export interface SessionHealth {
  readonly status: 'healthy' | 'warning' | 'critical';
  readonly issues: readonly SessionHealthIssue[];
  readonly recommendations: readonly string[];
  readonly securityScore: number; // 0-100
  readonly performanceScore: number; // 0-100
}

export interface SessionHealthIssue {
  readonly type: 'security' | 'performance' | 'compliance' | 'connectivity';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly impact: string;
  readonly resolution?: string;
}

export interface BiometricEnrollmentResult {
  readonly success: boolean;
  readonly templateId?: string;
  readonly quality?: number;
  readonly error?: string;
  readonly duration: number; // milliseconds
}

export interface BiometricTestResult {
  readonly success: boolean;
  readonly quality: number; // 0-1
  readonly confidence: number; // 0-1
  readonly latency: number; // milliseconds
  readonly issues?: readonly string[];
}

export interface ContactTestResult {
  readonly contactId: string;
  readonly method: 'phone' | 'sms' | 'email';
  readonly success: boolean;
  readonly responseTime?: number; // milliseconds
  readonly error?: string;
}

export interface OAuthLinkResult {
  readonly success: boolean;
  readonly provider: 'apple' | 'google';
  readonly profileInfo?: OAuthUserProfile;
  readonly permissions: readonly string[];
  readonly error?: string;
}

export interface OAuthRefreshResult {
  readonly success: boolean;
  readonly newTokens?: {
    readonly accessToken: string;
    readonly expiresIn: number;
  };
  readonly error?: string;
}

export interface ComplianceReport {
  readonly generatedAt: string;
  readonly complianceLevel: 'basic' | 'hipaa' | 'enhanced';
  readonly checks: readonly ComplianceCheck[];
  readonly issues: readonly ComplianceIssue[];
  readonly recommendations: readonly string[];
  readonly nextReviewDate: string;
}

export interface ComplianceCheck {
  readonly requirement: string;
  readonly status: 'compliant' | 'non_compliant' | 'pending' | 'not_applicable';
  readonly lastChecked: string;
  readonly evidence?: string;
  readonly notes?: string;
}

export interface ComplianceIssue {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly requirement: string;
  readonly resolution: string;
  readonly dueDate?: string;
}

export interface AuditExport {
  readonly format: 'json' | 'csv' | 'pdf';
  readonly data: string;
  readonly checksum: string;
  readonly generatedAt: string;
  readonly entryCount: number;
  readonly dateRange: DateRange;
}

export interface DateRange {
  readonly start: string;
  readonly end: string;
}

export interface SecurityIncident {
  readonly type: 'unauthorized_access' | 'suspicious_activity' | 'data_breach' | 'system_error';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly affectedSystems: readonly string[];
  readonly userImpact: string;
  readonly mitigationSteps: readonly string[];
}

export interface DataAccessPermission {
  readonly dataType: string;
  readonly operations: readonly ('read' | 'write' | 'delete' | 'export')[];
  readonly scope: 'user' | 'session' | 'global';
  readonly expiresAt?: string;
  readonly conditions?: readonly string[];
}

export interface RetentionStatus {
  readonly policy: 'standard' | 'extended' | 'minimal';
  readonly retentionPeriod: number; // days
  readonly dataTypes: readonly string[];
  readonly nextCleanup?: string;
  readonly totalSize: number; // bytes
}

export interface BiometricCapabilities {
  readonly available: boolean;
  readonly types: readonly ('face' | 'fingerprint' | 'voice' | 'iris')[];
  readonly enrolled: boolean;
  readonly hardwareBacked: boolean;
  readonly encryptionSupported: boolean;
  readonly livenessDetection: boolean;
  readonly antiSpoofing: boolean;
}

export interface AuthPerformanceMetrics {
  readonly authenticationLatency: LatencyMetrics;
  readonly jwtValidationLatency: LatencyMetrics;
  readonly biometricLatency: LatencyMetrics;
  readonly encryptionLatency: LatencyMetrics;
  readonly errorRates: ErrorRateMetrics;
  readonly throughput: ThroughputMetrics;
}

export interface LatencyMetrics {
  readonly p50: number; // milliseconds
  readonly p95: number;
  readonly p99: number;
  readonly average: number;
  readonly max: number;
}

export interface ErrorRateMetrics {
  readonly overall: number; // 0-1
  readonly byMethod: Record<AuthenticationMethod, number>;
  readonly byErrorType: Record<string, number>;
  readonly trend: 'improving' | 'stable' | 'degrading';
}

export interface ThroughputMetrics {
  readonly operationsPerSecond: number;
  readonly peakLoad: number;
  readonly averageLoad: number;
  readonly capacity: number; // max theoretical ops/sec
}

export interface CrisisThresholds {
  readonly phq9Threshold: number; // 20
  readonly gad7Threshold: number; // 15
  readonly responseTimeMs: number; // 200
  readonly autoBackup: boolean;
  readonly emergencyContact: boolean;
}

export interface ComplianceSettings {
  readonly auditLevel: 'minimal' | 'standard' | 'comprehensive';
  readonly dataRetentionDays: number;
  readonly encryptionRequired: boolean;
  readonly consentRequired: boolean;
  readonly anonymization: boolean;
}

export interface SecurityFlag {
  readonly type: 'suspicious_device' | 'unusual_location' | 'failed_attempts' | 'time_anomaly';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly detectedAt: string;
  readonly resolved: boolean;
  readonly action?: string;
}

/**
 * Zustand Store Type Helper
 */
export type AuthenticationStoreSlice = UseBoundStore<StoreApi<AuthenticationStore>>;

/**
 * Store Configuration Options
 */
export interface AuthenticationStoreConfig {
  readonly persistKey: string;
  readonly version: number;
  readonly migrate?: (persistedState: unknown, version: number) => AuthenticationStoreState;
  readonly partialize?: (state: AuthenticationStore) => Partial<AuthenticationStoreState>;
  readonly onRehydrateStorage?: () => (state?: AuthenticationStore) => void;
  readonly getStorage?: () => StateStorage;
}

export interface StateStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

/**
 * Store Action Parameters Types
 */
export interface SignInParams {
  readonly method: AuthenticationMethod;
  readonly biometricType?: 'face' | 'fingerprint' | 'voice';
  readonly oauthProvider?: 'apple' | 'google';
  readonly emergencyBypass?: boolean;
  readonly deviceTrust?: boolean;
}

export interface MigrationParams {
  readonly strategy: MigrationStrategy;
  readonly backupFirst: boolean;
  readonly notifyUser: boolean;
  readonly estimatedDuration?: number;
}

export interface CrisisParams {
  readonly trigger: CrisisTrigger;
  readonly contactEmergency: boolean;
  readonly extendSession: boolean;
  readonly backupData: boolean;
}

/**
 * Store Event Types for Subscriptions
 */
export type AuthenticationStoreEvent =
  | { type: 'authentication_success'; method: AuthenticationMethod }
  | { type: 'authentication_failure'; method: AuthenticationMethod; error: AuthenticationError }
  | { type: 'session_expired'; sessionId: string }
  | { type: 'session_extended'; sessionId: string; newExpiry: string }
  | { type: 'crisis_mode_entered'; trigger: CrisisTrigger }
  | { type: 'crisis_mode_exited'; duration: number }
  | { type: 'migration_started'; fromMethod: AuthenticationMethod; toMethod: AuthenticationMethod }
  | { type: 'migration_completed'; success: boolean; duration: number }
  | { type: 'security_incident'; incident: SecurityIncident }
  | { type: 'compliance_warning'; warning: ComplianceIssue }
  | { type: 'biometric_enrolled'; type: 'face' | 'fingerprint' | 'voice' }
  | { type: 'oauth_linked'; provider: 'apple' | 'google' }
  | { type: 'device_revoked'; deviceId: string };

/**
 * Store Constants
 */
export const AUTHENTICATION_STORE_CONSTANTS = {
  PERSIST_KEY: '@fullmind_auth_store',
  VERSION: 1,
  MAX_AUDIT_ENTRIES: 1000,
  PERFORMANCE_SAMPLE_SIZE: 100,
  SESSION_CHECK_INTERVAL_MS: 30000, // 30 seconds
  CRISIS_RESPONSE_TIMEOUT_MS: AUTHENTICATION_CONSTANTS.CRISIS.RESPONSE_TIME_MS,
  JWT_REFRESH_THRESHOLD_MS: AUTHENTICATION_CONSTANTS.SESSION.REFRESH_THRESHOLD_MINUTES * 60 * 1000
} as const;