/**
 * Authentication Integration Types
 *
 * Type-safe integration patterns for authentication with existing FullMind services:
 * - EncryptionService integration
 * - ZeroKnowledgeCloudSync integration
 * - FeatureFlags integration
 * - Store integration patterns
 * - Navigation and routing integration
 */

import type {
  AuthenticationMethod,
  AuthenticationResult,
  EnhancedAuthSession,
  AuthenticationError,
  CrisisSessionContext,
  EmergencyContact,
  EnhancedJWTClaims,
  BiometricTemplate
} from './authentication';
import type {
  DataSensitivity,
  EncryptionResult,
  EncryptionMetadata,
  SecureEncryptionService
} from './security';
import type {
  CloudFeatureFlags,
  CloudSyncMetadata,
  CloudSyncOperation,
  EncryptedDataContainer
} from './cloud';
import type {
  TypeSafeFeatureFlags,
  CloudClientConfig,
  EncryptableEntity
} from './cloud-client';
import type { UserProfile, CheckIn, Assessment, CrisisPlan } from './index';

/**
 * Authentication-Enhanced Encryption Service Integration
 */
export interface AuthenticatedEncryptionService extends SecureEncryptionService {
  // Authentication-aware encryption operations
  encryptWithAuthContext<T>(
    data: T,
    sensitivity: DataSensitivity,
    authContext: AuthEncryptionContext,
    metadata?: Partial<EncryptionMetadata>
  ): Promise<AuthenticatedEncryptionResult<T>>;

  decryptWithAuthContext<T>(
    encryptedResult: AuthenticatedEncryptionResult<T>,
    authContext: AuthEncryptionContext
  ): Promise<T>;

  // Biometric-derived encryption
  encryptWithBiometric<T>(
    data: T,
    biometricTemplate: BiometricTemplate,
    sensitivity: DataSensitivity
  ): Promise<BiometricEncryptionResult<T>>;

  decryptWithBiometric<T>(
    encryptedResult: BiometricEncryptionResult<T>,
    biometricTemplate: BiometricTemplate
  ): Promise<T>;

  // Session-based encryption keys
  deriveSessionKey(
    session: EnhancedAuthSession,
    purpose: KeyPurpose
  ): Promise<SessionDerivedKey>;

  rotateKeysForAuth(
    authMethod: AuthenticationMethod,
    migrationSafe: boolean
  ): Promise<KeyRotationResult>;

  // Crisis-mode encryption handling
  enableCrisisEncryption(
    crisisContext: CrisisSessionContext
  ): Promise<CrisisEncryptionConfig>;

  disableCrisisEncryption(): Promise<void>;

  // Compliance-aware encryption
  validateComplianceEncryption(
    data: unknown,
    requiredLevel: ComplianceLevel
  ): Promise<ComplianceValidationResult>;
}

export interface AuthEncryptionContext {
  readonly sessionId: string;
  readonly userId: string;
  readonly authMethod: AuthenticationMethod;
  readonly deviceId: string;
  readonly riskScore: number;
  readonly biometricVerified: boolean;
  readonly timestamp: string;
  readonly compliance: AuthComplianceContext;
}

export interface AuthComplianceContext {
  readonly level: ComplianceLevel;
  readonly auditRequired: boolean;
  readonly retentionDays: number;
  readonly anonymizationRequired: boolean;
  readonly dataProcessingConsent: boolean;
}

export interface AuthenticatedEncryptionResult<T> extends EncryptionResult<T> {
  readonly authContext: AuthEncryptionContext;
  readonly sessionBinding: SessionBinding;
  readonly complianceMarkers: ComplianceMarkers;
  readonly auditTrail: EncryptionAuditTrail;
}

export interface BiometricEncryptionResult<T> extends EncryptionResult<T> {
  readonly biometricBinding: BiometricBinding;
  readonly templateHash: string;
  readonly qualityScore: number;
  readonly livenessVerified: boolean;
  readonly hardwareSecured: boolean;
}

export interface SessionBinding {
  readonly sessionId: string;
  readonly deviceBinding: string;
  readonly timeBinding: string;
  readonly methodBinding: AuthenticationMethod;
  readonly validUntil: string;
}

export interface ComplianceMarkers {
  readonly level: ComplianceLevel;
  readonly tags: readonly string[];
  readonly retentionPolicy: string;
  readonly accessRestrictions: readonly string[];
  readonly auditLevel: 'minimal' | 'standard' | 'comprehensive';
}

export interface EncryptionAuditTrail {
  readonly operationId: string;
  readonly timestamp: string;
  readonly operation: 'encrypt' | 'decrypt' | 'key_derive' | 'key_rotate';
  readonly authMethod: AuthenticationMethod;
  readonly riskScore: number;
  readonly success: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface BiometricBinding {
  readonly templateId: string;
  readonly biometricType: 'face' | 'fingerprint' | 'voice' | 'iris';
  readonly deviceBinding: string;
  readonly keyDerivationProof: string;
  readonly enrollmentTimestamp: string;
}

export interface SessionDerivedKey {
  readonly keyId: string;
  readonly purpose: KeyPurpose;
  readonly derivedAt: string;
  readonly validUntil: string;
  readonly sessionId: string;
  readonly strength: 'standard' | 'enhanced' | 'crisis';
}

export interface KeyRotationResult {
  readonly success: boolean;
  readonly newKeyVersion: number;
  readonly rotatedAt: string;
  readonly affectedSessions: readonly string[];
  readonly migrationRequired: boolean;
  readonly rollbackAvailable: boolean;
}

export interface CrisisEncryptionConfig {
  readonly enabled: boolean;
  readonly emergencyKeyAccess: boolean;
  readonly bypassBiometric: boolean;
  readonly expeditedDecryption: boolean;
  readonly auditOverride: boolean;
  readonly sessionExtension: boolean;
}

export interface ComplianceValidationResult {
  readonly compliant: boolean;
  readonly level: ComplianceLevel;
  readonly issues: readonly string[];
  readonly recommendations: readonly string[];
  readonly auditRequired: boolean;
  readonly validUntil?: string;
}

export type KeyPurpose =
  | 'session_data'
  | 'user_profile'
  | 'clinical_data'
  | 'crisis_plan'
  | 'sync_operations'
  | 'backup_data'
  | 'audit_logs';

export type ComplianceLevel = 'basic' | 'hipaa' | 'enhanced' | 'crisis';

/**
 * Authentication-Enhanced Cloud Sync Integration
 */
export interface AuthenticatedCloudSync {
  // Authentication-aware sync operations
  syncWithAuth<T extends EncryptableEntity>(
    entity: T,
    authContext: CloudSyncAuthContext
  ): Promise<AuthenticatedSyncResult<T>>;

  syncAllWithAuth(
    authContext: CloudSyncAuthContext,
    syncStrategy: AuthSyncStrategy
  ): Promise<BatchAuthSyncResult>;

  // User migration sync
  migrateUserDataToCloud(
    migrationContext: UserMigrationSyncContext
  ): Promise<MigrationSyncResult>;

  // Crisis-mode sync
  emergencySync(
    crisisContext: CrisisSessionContext,
    priorityData: readonly string[]
  ): Promise<EmergencySyncResult>;

  // Cross-device authentication sync
  syncAuthenticationProfile(
    deviceContext: DeviceAuthContext
  ): Promise<AuthProfileSyncResult>;

  // Biometric template sync (encrypted)
  syncBiometricTemplates(
    templates: readonly BiometricTemplate[],
    authContext: CloudSyncAuthContext
  ): Promise<BiometricSyncResult>;
}

export interface CloudSyncAuthContext {
  readonly session: EnhancedAuthSession;
  readonly encryptionContext: AuthEncryptionContext;
  readonly syncPermissions: SyncPermissions;
  readonly complianceRequirements: CloudComplianceRequirements;
  readonly deviceTrust: DeviceTrustLevel;
}

export interface AuthSyncStrategy {
  readonly approach: 'full_sync' | 'incremental' | 'selective' | 'crisis_only';
  readonly encryption: 'zero_knowledge' | 'enhanced' | 'standard';
  readonly priority: 'immediate' | 'high' | 'normal' | 'background';
  readonly conflictResolution: 'auth_wins' | 'cloud_wins' | 'merge' | 'manual';
  readonly retryPolicy: SyncRetryPolicy;
}

export interface UserMigrationSyncContext {
  readonly fromAuth: AuthenticationMethod;
  readonly toAuth: AuthenticationMethod;
  readonly preserveData: boolean;
  readonly upgradeEncryption: boolean;
  readonly syncProfile: boolean;
  readonly migrationId: string;
  readonly backupFirst: boolean;
}

export interface DeviceAuthContext {
  readonly deviceId: string;
  readonly authCapabilities: DeviceAuthCapabilities;
  readonly trustLevel: DeviceTrustLevel;
  readonly syncEnabled: boolean;
  readonly lastSync?: string;
  readonly conflicts: readonly AuthSyncConflict[];
}

export interface AuthenticatedSyncResult<T extends EncryptableEntity> {
  readonly entity: T;
  readonly syncMetadata: AuthenticatedSyncMetadata;
  readonly encryptionProof: EncryptionSyncProof;
  readonly complianceValidation: SyncComplianceValidation;
  readonly performanceMetrics: SyncPerformanceMetrics;
}

export interface AuthenticatedSyncMetadata extends CloudSyncMetadata {
  readonly authMethod: AuthenticationMethod;
  readonly sessionId: string;
  readonly deviceId: string;
  readonly riskScore: number;
  readonly complianceLevel: ComplianceLevel;
  readonly encryptionKeyVersion: number;
}

export interface EncryptionSyncProof {
  readonly encryptedOnDevice: boolean;
  readonly encryptedInTransit: boolean;
  readonly encryptedAtRest: boolean;
  readonly zeroKnowledgeProof: string;
  readonly integrityHash: string;
  readonly keyDerivationProof: string;
}

export interface SyncComplianceValidation {
  readonly hipaaCompliant: boolean;
  readonly auditLogged: boolean;
  readonly retentionCompliant: boolean;
  readonly consentValidated: boolean;
  readonly anonymizationApplied: boolean;
  readonly dataMinimized: boolean;
}

export interface SyncPerformanceMetrics {
  readonly syncDuration: number; // milliseconds
  readonly encryptionTime: number;
  readonly networkTime: number;
  readonly validationTime: number;
  readonly bytesTransferred: number;
  readonly compressionRatio: number;
}

export interface BatchAuthSyncResult {
  readonly results: readonly AuthenticatedSyncResult<EncryptableEntity>[];
  readonly summary: AuthSyncSummary;
  readonly conflicts: readonly AuthSyncConflict[];
  readonly complianceReport: SyncComplianceReport;
}

export interface AuthSyncSummary {
  readonly totalEntities: number;
  readonly successful: number;
  readonly failed: number;
  readonly conflicts: number;
  readonly duration: number;
  readonly bytesTransferred: number;
  readonly encryptionOverhead: number;
}

export interface AuthSyncConflict {
  readonly conflictId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly conflictType: 'auth_mismatch' | 'encryption_version' | 'device_trust' | 'compliance_level';
  readonly localAuth: AuthenticationMethod;
  readonly remoteAuth: AuthenticationMethod;
  readonly resolution: ConflictResolution;
  readonly requiresManualReview: boolean;
}

export interface ConflictResolution {
  readonly strategy: 'local_wins' | 'remote_wins' | 'merge' | 'manual' | 'escalate';
  readonly reasoning: string;
  readonly confidence: number; // 0-1
  readonly preserveHistory: boolean;
  readonly notifyUser: boolean;
}

export interface MigrationSyncResult {
  readonly success: boolean;
  readonly migratedEntities: number;
  readonly encryptionUpgraded: boolean;
  readonly authMethodTransitioned: boolean;
  readonly cloudSyncEnabled: boolean;
  readonly duration: number;
  readonly backupCreated: boolean;
  readonly rollbackAvailable: boolean;
}

export interface EmergencySyncResult {
  readonly triggered: boolean;
  readonly crisisTrigger: string;
  readonly syncedEntities: readonly string[];
  readonly emergencyContactsNotified: boolean;
  readonly criticalDataBacked: boolean;
  readonly responseTime: number; // milliseconds
  readonly complianceOverride: boolean;
}

export interface AuthProfileSyncResult {
  readonly profileSynced: boolean;
  readonly biometricsSynced: boolean;
  readonly deviceTrustUpdated: boolean;
  readonly preferencesUpdated: boolean;
  readonly securitySettingsApplied: boolean;
  readonly conflicts: readonly string[];
}

export interface BiometricSyncResult {
  readonly templatesSynced: number;
  readonly encryptionValidated: boolean;
  readonly deviceBinding: boolean;
  readonly crossDeviceEnabled: boolean;
  readonly qualityMaintained: boolean;
  readonly securityVerified: boolean;
}

export interface SyncPermissions {
  readonly canSync: boolean;
  readonly dataTypes: readonly string[];
  readonly operations: readonly ('read' | 'write' | 'delete')[];
  readonly deviceRestrictions: readonly string[];
  readonly timeRestrictions?: TimeRestrictions;
  readonly complianceRequired: boolean;
}

export interface CloudComplianceRequirements {
  readonly auditLevel: 'minimal' | 'standard' | 'comprehensive';
  readonly encryptionRequired: boolean;
  readonly retentionPolicy: string;
  readonly anonymizationLevel: 'none' | 'partial' | 'full';
  readonly geographicRestrictions: readonly string[];
  readonly dataClassification: readonly DataClassification[];
}

export interface DeviceTrustLevel {
  readonly level: 'unknown' | 'low' | 'medium' | 'high' | 'verified';
  readonly factors: readonly TrustFactor[];
  readonly lastVerified: string;
  readonly trustScore: number; // 0-1
  readonly requiresRevalidation: boolean;
}

export interface SyncRetryPolicy {
  readonly maxAttempts: number;
  readonly backoffStrategy: 'linear' | 'exponential' | 'fixed';
  readonly baseDelay: number; // milliseconds
  readonly maxDelay: number;
  readonly retryOn: readonly string[]; // error codes
}

export interface DeviceAuthCapabilities {
  readonly biometricSupport: readonly ('face' | 'fingerprint' | 'voice' | 'iris')[];
  readonly hardwareEncryption: boolean;
  readonly keychainAccess: boolean;
  readonly secureEnclave: boolean;
  readonly oauthSupport: readonly ('apple' | 'google')[];
  readonly multiDeviceSync: boolean;
}

export interface TimeRestrictions {
  readonly allowedHours: {
    readonly start: string; // HH:mm
    readonly end: string;   // HH:mm
  };
  readonly allowedDays: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
  readonly timezone: string;
  readonly emergencyOverride: boolean;
}

export interface DataClassification {
  readonly type: string;
  readonly sensitivity: DataSensitivity;
  readonly complianceLevel: ComplianceLevel;
  readonly encryptionRequired: boolean;
  readonly auditRequired: boolean;
}

export interface TrustFactor {
  readonly factor: 'device_history' | 'behavior_pattern' | 'location_consistency' | 'biometric_quality';
  readonly score: number; // 0-1
  readonly weight: number; // importance 0-1
  readonly lastUpdated: string;
}

export interface SyncComplianceReport {
  readonly compliant: boolean;
  readonly level: ComplianceLevel;
  readonly checks: readonly ComplianceCheckResult[];
  readonly violations: readonly ComplianceViolation[];
  readonly recommendations: readonly string[];
  readonly auditEntries: readonly SyncAuditEntry[];
}

export interface ComplianceCheckResult {
  readonly requirement: string;
  readonly status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  readonly details: string;
  readonly evidence?: string;
  readonly remediation?: string;
}

export interface ComplianceViolation {
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly requirement: string;
  readonly description: string;
  readonly impact: string;
  readonly remediation: string;
  readonly dueDate?: string;
}

export interface SyncAuditEntry {
  readonly timestamp: string;
  readonly operation: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly authMethod: AuthenticationMethod;
  readonly deviceId: string;
  readonly success: boolean;
  readonly complianceLevel: ComplianceLevel;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Authentication-Enhanced Feature Flags Integration
 */
export interface AuthenticatedFeatureFlags extends TypeSafeFeatureFlags {
  // Authentication-specific feature flags
  readonly biometricAuthentication: boolean;
  readonly multiDeviceSync: boolean;
  readonly oauthProviders: boolean;
  readonly crisisDetection: boolean;
  readonly emergencyBypass: boolean;
  readonly sessionExtension: boolean;
  readonly migrationAssistant: boolean;

  // Security feature flags
  readonly advancedEncryption: boolean;
  readonly auditLogging: boolean;
  readonly riskAssessment: boolean;
  readonly deviceTrustValidation: boolean;
  readonly complianceMonitoring: boolean;

  // Performance feature flags
  readonly fastAuthentication: boolean;
  readonly backgroundSync: boolean;
  readonly preemptiveKeyRotation: boolean;
  readonly compressionOptimization: boolean;

  // User experience flags
  readonly seamlessTransition: boolean;
  readonly contextualAuth: boolean;
  readonly adaptiveSecurity: boolean;
  readonly intelligentFallback: boolean;
}

export interface AuthFeatureFlagContext {
  readonly authMethod: AuthenticationMethod;
  readonly securityLevel: 'low' | 'medium' | 'high';
  readonly deviceTrusted: boolean;
  readonly complianceLevel: ComplianceLevel;
  readonly crisisMode: boolean;
  readonly userTier: 'anonymous' | 'authenticated' | 'premium';
}

export interface AuthFeatureFlagEvaluation {
  readonly flag: keyof AuthenticatedFeatureFlags;
  readonly enabled: boolean;
  readonly reason: string;
  readonly context: AuthFeatureFlagContext;
  readonly overrides: readonly FeatureFlagOverride[];
  readonly safeguards: readonly FeatureFlagSafeguard[];
}

export interface FeatureFlagOverride {
  readonly type: 'security' | 'compliance' | 'crisis' | 'performance';
  readonly condition: string;
  readonly action: 'enable' | 'disable' | 'conditional';
  readonly reason: string;
  readonly temporary: boolean;
  readonly expiresAt?: string;
}

export interface FeatureFlagSafeguard {
  readonly type: 'rate_limit' | 'rollback' | 'circuit_breaker' | 'data_validation';
  readonly threshold: number;
  readonly action: 'disable' | 'throttle' | 'alert' | 'rollback';
  readonly monitoring: boolean;
}

/**
 * Authentication Navigation Integration
 */
export interface AuthNavigationGuard {
  readonly canActivate: (
    route: string,
    authState: NavigationAuthState
  ) => Promise<NavigationGuardResult>;

  readonly canDeactivate: (
    route: string,
    authState: NavigationAuthState
  ) => Promise<NavigationGuardResult>;

  readonly resolveRoute: (
    requestedRoute: string,
    authState: NavigationAuthState
  ) => Promise<RouteResolution>;

  readonly handleAuthRequired: (
    route: string,
    requiredAuth: AuthenticationMethod[]
  ) => Promise<AuthNavigationAction>;

  readonly handleCrisisMode: (
    route: string,
    crisisContext: CrisisSessionContext
  ) => Promise<CrisisNavigationAction>;
}

export interface NavigationAuthState {
  readonly isAuthenticated: boolean;
  readonly authMethod: AuthenticationMethod | null;
  readonly sessionValid: boolean;
  readonly sessionExpiry: string | null;
  readonly securityLevel: 'low' | 'medium' | 'high';
  readonly crisisMode: boolean;
  readonly deviceTrusted: boolean;
  readonly complianceLevel: ComplianceLevel;
}

export interface NavigationGuardResult {
  readonly allowed: boolean;
  readonly redirectTo?: string;
  readonly authRequired?: AuthenticationMethod[];
  readonly reason?: string;
  readonly temporaryBlock?: boolean;
  readonly retryAfter?: number; // seconds
}

export interface RouteResolution {
  readonly targetRoute: string;
  readonly authenticationRequired: boolean;
  readonly permissionsRequired: readonly string[];
  readonly securityLevel: 'low' | 'medium' | 'high';
  readonly crisisAccessible: boolean;
  readonly fallbackRoute?: string;
}

export interface AuthNavigationAction {
  readonly action: 'authenticate' | 'redirect' | 'block' | 'upgrade_auth';
  readonly authMethods: readonly AuthenticationMethod[];
  readonly redirectTo?: string;
  readonly message?: string;
  readonly allowCancel: boolean;
  readonly timeout?: number; // seconds
}

export interface CrisisNavigationAction {
  readonly action: 'allow' | 'redirect_crisis' | 'emergency_only' | 'contact_emergency';
  readonly crisisRoutes: readonly string[];
  readonly emergencyContacts: readonly EmergencyContact[];
  readonly message: string;
  readonly urgency: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Performance and Monitoring Integration
 */
export interface AuthPerformanceMonitor {
  readonly recordAuthMetrics: (
    method: AuthenticationMethod,
    result: AuthenticationResult,
    duration: number,
    metadata?: Record<string, unknown>
  ) => Promise<void>;

  readonly recordSessionMetrics: (
    sessionId: string,
    operation: 'create' | 'refresh' | 'extend' | 'revoke',
    duration: number,
    success: boolean
  ) => Promise<void>;

  readonly recordEncryptionMetrics: (
    operation: 'encrypt' | 'decrypt' | 'key_derive',
    dataSize: number,
    duration: number,
    authContext: AuthEncryptionContext
  ) => Promise<void>;

  readonly getPerformanceReport: (
    timeRange?: DateRange
  ) => Promise<AuthPerformanceReport>;

  readonly detectPerformanceAnomalies: () => Promise<readonly PerformanceAnomaly[]>;
}

export interface AuthPerformanceReport {
  readonly timeRange: DateRange;
  readonly authenticationMetrics: AuthMethodMetrics[];
  readonly sessionMetrics: SessionMetrics;
  readonly encryptionMetrics: EncryptionMetrics;
  readonly overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  readonly recommendations: readonly string[];
}

export interface AuthMethodMetrics {
  readonly method: AuthenticationMethod;
  readonly attempts: number;
  readonly successRate: number; // 0-1
  readonly averageDuration: number; // milliseconds
  readonly p95Duration: number;
  readonly errorDistribution: Record<string, number>;
}

export interface SessionMetrics {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly averageLifetime: number; // seconds
  readonly refreshRate: number; // per hour
  readonly revocationRate: number; // per day
}

export interface EncryptionMetrics {
  readonly operations: number;
  readonly averageLatency: number; // milliseconds
  readonly throughput: number; // operations per second
  readonly keyRotations: number;
  readonly complianceValidations: number;
}

export interface PerformanceAnomaly {
  readonly type: 'latency_spike' | 'error_rate_increase' | 'throughput_drop' | 'resource_exhaustion';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly detectedAt: string;
  readonly description: string;
  readonly impact: string;
  readonly recommendations: readonly string[];
}

export interface DateRange {
  readonly start: string;
  readonly end: string;
}

/**
 * Type Utilities for Integration
 */
export type AuthenticationIntegrationTypes =
  | AuthenticatedEncryptionService
  | AuthenticatedCloudSync
  | AuthenticatedFeatureFlags
  | AuthNavigationGuard
  | AuthPerformanceMonitor;

export type AuthContextTypes =
  | AuthEncryptionContext
  | CloudSyncAuthContext
  | AuthFeatureFlagContext
  | NavigationAuthState;

export type AuthResultTypes =
  | AuthenticatedEncryptionResult<any>
  | AuthenticatedSyncResult<any>
  | AuthFeatureFlagEvaluation
  | NavigationGuardResult
  | AuthPerformanceReport;