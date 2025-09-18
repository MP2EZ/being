/**
 * Comprehensive Authentication Types - Week 2 Implementation
 *
 * Type-safe authentication system with biometric support, session management,
 * OAuth integration, crisis response, and HIPAA compliance for Being. MBCT app.
 */

import { z } from 'zod';
import type {
  CloudFeatureFlags,
  CloudSyncMetadata,
  CloudSyncError,
  EmergencySyncConfig
} from './cloud';
import type {
  AuthSession as BaseAuthSession,
  BiometricAuthData as BaseBiometricAuthData,
  JWTValidationResult as BaseJWTValidationResult,
  UserMigration,
  DeviceInfo,
  SessionTokens,
  SessionSecurity,
  SessionPermissions,
  SessionCompliance
} from './auth-session';
import type {
  TypeSafeFeatureFlags,
  CloudClientConfig,
  AuthSession as CloudAuthSession,
  BiometricAuthData as CloudBiometricAuthData
} from './cloud-client';
import type { DataSensitivity, EncryptionResult } from './security';
import type { UserProfile, CrisisPlan, Assessment } from './index';

/**
 * Enhanced Authentication Flow Types
 */
export type AuthenticationMethod =
  | 'anonymous'
  | 'biometric_face'
  | 'biometric_fingerprint'
  | 'biometric_voice'
  | 'oauth_apple'
  | 'oauth_google'
  | 'emergency_bypass'
  | 'recovery_code';

export type AuthenticationResult = 'success' | 'failure' | 'cancelled' | 'requires_setup' | 'biometric_unavailable';

export interface AuthenticationFlow {
  readonly id: string;
  readonly method: AuthenticationMethod;
  readonly initiatedAt: string;
  readonly completedAt?: string;
  readonly result?: AuthenticationResult;
  readonly steps: readonly AuthenticationStep[];
  readonly securityContext: AuthSecurityContext;
  readonly deviceContext: AuthDeviceContext;
  readonly userContext: AuthUserContext;
}

export interface AuthenticationStep {
  readonly stepId: string;
  readonly type: 'biometric_prompt' | 'oauth_redirect' | 'user_consent' | 'device_verification' | 'emergency_validation';
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly data?: Record<string, unknown>;
  readonly error?: AuthenticationError;
}

export interface AuthSecurityContext {
  readonly riskScore: number; // 0-1
  readonly deviceTrusted: boolean;
  readonly locationVerified: boolean;
  readonly behaviorNormal: boolean;
  readonly biometricQuality?: number; // 0-1
  readonly securityFlags: readonly SecurityFlag[];
  readonly complianceChecks: readonly ComplianceCheck[];
}

export interface AuthDeviceContext {
  readonly deviceId: string;
  readonly deviceFingerprint: string;
  readonly biometricCapabilities: BiometricCapabilities;
  readonly encryptionCapabilities: DeviceEncryptionCapabilities;
  readonly platformInfo: PlatformInfo;
  readonly networkInfo: NetworkInfo;
}

export interface AuthUserContext {
  readonly userId?: string;
  readonly sessionType: 'anonymous' | 'authenticated' | 'emergency';
  readonly consentLevel: ConsentLevel;
  readonly dataProcessingAgreements: readonly DataProcessingAgreement[];
  readonly accessRequirements: AccessRequirements;
  readonly migrationStatus?: MigrationStatus;
}

/**
 * Enhanced User Authentication Types
 */
export interface UserAuthenticationProfile {
  readonly userId: string;
  readonly createdAt: string;
  readonly lastAuthenticated: string;
  readonly authenticationMethods: readonly EnabledAuthMethod[];
  readonly preferences: AuthenticationPreferences;
  readonly securitySettings: UserSecuritySettings;
  readonly complianceProfile: UserComplianceProfile;
  readonly devices: readonly AuthenticatedDevice[];
}

export interface EnabledAuthMethod {
  readonly method: AuthenticationMethod;
  readonly isEnabled: boolean;
  readonly enrolledAt: string;
  readonly lastUsed?: string;
  readonly failureCount: number;
  readonly isLocked: boolean;
  readonly biometricTemplate?: BiometricTemplate;
  readonly oauthProvider?: OAuthProviderInfo;
}

export interface AuthenticationPreferences {
  readonly preferredMethod: AuthenticationMethod;
  readonly fallbackMethods: readonly AuthenticationMethod[];
  readonly requireBiometric: boolean;
  readonly allowFallback: boolean;
  readonly sessionTimeout: number; // seconds
  readonly requireReauthForSensitive: boolean;
  readonly emergencyBypass: boolean;
}

export interface UserSecuritySettings {
  readonly maxDevices: number;
  readonly requireDeviceVerification: boolean;
  readonly allowRemoteWipe: boolean;
  readonly sessionManagement: SessionManagementSettings;
  readonly riskTolerance: 'low' | 'medium' | 'high';
  readonly auditLevel: 'minimal' | 'standard' | 'comprehensive';
}

export interface UserComplianceProfile {
  readonly consentVersion: string;
  readonly consentTimestamp: string;
  readonly dataProcessingConsent: boolean;
  readonly marketingConsent: boolean;
  readonly researchConsent: boolean;
  readonly complianceFlags: readonly ComplianceFlag[];
  readonly retentionSettings: DataRetentionSettings;
}

/**
 * Enhanced Session Management Types
 */
export interface EnhancedAuthSession extends BaseAuthSession {
  readonly authenticationFlow: AuthenticationFlow;
  readonly performanceMetrics: SessionPerformanceMetrics;
  readonly crisisContext?: CrisisSessionContext;
  readonly syncStatus: SessionSyncStatus;
  readonly encryptionStatus: SessionEncryptionStatus;
}

export interface SessionManagementSettings {
  readonly maxConcurrentSessions: number;
  readonly sessionTimeout: number;
  readonly idleTimeout: number;
  readonly absoluteTimeout: number;
  readonly extendOnActivity: boolean;
  readonly notifyOnNewSession: boolean;
}

export interface SessionPerformanceMetrics {
  readonly authDuration: number; // milliseconds
  readonly jwtValidationTime: number;
  readonly biometricProcessingTime?: number;
  readonly encryptionLatency: number;
  readonly networkLatency?: number;
  readonly overallLatency: number;
}

export interface CrisisSessionContext {
  readonly inCrisisMode: boolean;
  readonly crisisTrigger?: 'phq9_threshold' | 'gad7_threshold' | 'manual_trigger' | 'emergency_contact';
  readonly emergencyAccess: boolean;
  readonly crisisSessionId: string;
  readonly emergencyContacts: readonly EmergencyContact[];
  readonly crisisOverrides: CrisisOverrides;
}

export interface SessionSyncStatus {
  readonly cloudSyncEnabled: boolean;
  readonly lastSyncAttempt?: string;
  readonly lastSuccessfulSync?: string;
  readonly pendingOperations: number;
  readonly syncConflicts: number;
  readonly encryptedBackupStatus: 'current' | 'stale' | 'failed' | 'none';
}

export interface SessionEncryptionStatus {
  readonly encryptionEnabled: boolean;
  readonly algorithm: string;
  readonly keyVersion: number;
  readonly zeroKnowledgeEnabled: boolean;
  readonly encryptionLatency: number;
  readonly integrityVerified: boolean;
}

/**
 * Biometric Authentication Types
 */
export interface EnhancedBiometricAuthData extends BaseBiometricAuthData {
  readonly template: BiometricTemplate;
  readonly qualityMetrics: BiometricQualityMetrics;
  readonly securityFeatures: BiometricSecurityFeatures;
  readonly enrollmentContext: BiometricEnrollmentContext;
}

export interface BiometricTemplate {
  readonly templateId: string;
  readonly templateType: 'face' | 'fingerprint' | 'voice' | 'iris';
  readonly templateData: string; // Encrypted template
  readonly templateSize: number;
  readonly algorithm: string;
  readonly version: string;
  readonly createdAt: string;
  readonly lastUpdated: string;
}

export interface BiometricQualityMetrics {
  readonly overallQuality: number; // 0-1
  readonly templateQuality: number;
  readonly imageQuality?: number;
  readonly signalQuality?: number;
  readonly uniquenessScore: number;
  readonly spoofProbability: number;
  readonly qualityFactors: readonly QualityFactor[];
}

export interface BiometricSecurityFeatures {
  readonly livenessDetection: boolean;
  readonly antiSpoofing: boolean;
  readonly encryptionInHardware: boolean;
  readonly templateProtection: boolean;
  readonly biometricBinding: boolean;
  readonly challengeResponse: boolean;
}

export interface BiometricEnrollmentContext {
  readonly enrollmentMethod: 'guided' | 'self_service' | 'assisted';
  readonly enrollmentEnvironment: 'secure' | 'standard' | 'public';
  readonly multipleCaptures: boolean;
  readonly captureCount: number;
  readonly enrollmentDuration: number;
  readonly assistanceRequired: boolean;
}

/**
 * OAuth Integration Types
 */
export interface OAuthProviderConfig {
  readonly provider: 'apple' | 'google';
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
  readonly additionalParameters?: Record<string, string>;
  readonly pkceEnabled: boolean;
  readonly state: string;
  readonly nonce: string;
}

export interface OAuthProviderInfo {
  readonly provider: 'apple' | 'google';
  readonly providerId: string;
  readonly providerUserId: string;
  readonly email?: string;
  readonly emailVerified: boolean;
  readonly profile?: OAuthUserProfile;
  readonly linkedAt: string;
  readonly lastUsed: string;
  readonly permissions: readonly string[];
}

export interface OAuthUserProfile {
  readonly displayName?: string;
  readonly givenName?: string;
  readonly familyName?: string;
  readonly avatarUrl?: string;
  readonly locale?: string;
  readonly timezone?: string;
}

export interface OAuthAuthenticationResult {
  readonly success: boolean;
  readonly provider: 'apple' | 'google';
  readonly authorizationCode?: string;
  readonly idToken?: string;
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly expiresIn?: number;
  readonly error?: OAuthError;
  readonly userInfo?: OAuthUserProfile;
}

/**
 * JWT Token Types with 15-minute Expiry
 */
export interface EnhancedJWTClaims extends BaseJWTValidationResult['claims'] {
  readonly iss: string; // Issuer
  readonly sub: string; // Subject (user ID)
  readonly aud: string; // Audience
  readonly exp: number; // Expiration time (15 minutes from issue)
  readonly iat: number; // Issued at
  readonly nbf?: number; // Not before
  readonly jti: string; // JWT ID
  readonly scope: readonly string[];
  readonly deviceId: string;
  readonly sessionId: string;
  readonly authMethod: AuthenticationMethod;
  readonly mfaVerified: boolean;
  readonly biometricVerified: boolean;
  readonly riskScore: number;
  readonly crisisMode?: boolean;
  readonly emergencyAccess?: boolean;
  readonly customClaims: JWTCustomClaims;
}

export interface JWTCustomClaims {
  readonly appVersion: string;
  readonly platformInfo: string;
  readonly encryptionEnabled: boolean;
  readonly complianceLevel: 'basic' | 'hipaa' | 'enhanced';
  readonly dataRetentionDays: number;
  readonly therapeuticAccess: boolean;
  readonly clinicalDataAccess: boolean;
  readonly emergencyProtocols: boolean;
}

export interface JWTValidationConfig {
  readonly issuer: string;
  readonly audience: string;
  readonly maxAge: number; // 900 seconds (15 minutes)
  readonly clockTolerance: number; // seconds
  readonly requireExp: boolean;
  readonly requireNbf: boolean;
  readonly requireIat: boolean;
  readonly algorithms: readonly string[];
  readonly verifySignature: boolean;
}

export interface EnhancedJWTValidationResult extends BaseJWTValidationResult {
  readonly performanceMetrics: {
    readonly validationDuration: number;
    readonly signatureVerificationTime: number;
    readonly claimsValidationTime: number;
  };
  readonly securityChecks: {
    readonly tokenAge: number;
    readonly remainingValidity: number;
    readonly riskAssessment: TokenRiskAssessment;
  };
  readonly complianceValidation: {
    readonly hipaaCompliant: boolean;
    readonly auditRequired: boolean;
    readonly dataAccess: readonly string[];
  };
}

export interface TokenRiskAssessment {
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly factors: readonly RiskFactor[];
  readonly recommendations: readonly string[];
  readonly actionRequired: boolean;
}

/**
 * User Migration Types (Anonymous to Authenticated)
 */
export interface EnhancedUserMigration extends UserMigration {
  readonly migrationStrategy: MigrationStrategy;
  readonly dataMapping: DataMigrationMapping;
  readonly securityUpgrade: SecurityMigrationInfo;
  readonly complianceTransition: ComplianceMigrationInfo;
  readonly validationResults: MigrationValidationResults;
}

export interface MigrationStrategy {
  readonly approach: 'full_migration' | 'selective_migration' | 'gradual_migration';
  readonly preserveAnonymousData: boolean;
  readonly upgradeEncryption: boolean;
  readonly enableCloudSync: boolean;
  readonly maintainLocalBackup: boolean;
  readonly rollbackStrategy: RollbackStrategy;
}

export interface DataMigrationMapping {
  readonly userProfile: ProfileMigrationPlan;
  readonly checkIns: CheckInMigrationPlan;
  readonly assessments: AssessmentMigrationPlan;
  readonly crisisPlan: CrisisPlanMigrationPlan;
  readonly settings: SettingsMigrationPlan;
}

export interface SecurityMigrationInfo {
  readonly fromEncryption: string;
  readonly toEncryption: string;
  readonly keyRotationRequired: boolean;
  readonly biometricEnrollment: boolean;
  readonly deviceBinding: boolean;
  readonly zeroKnowledgeUpgrade: boolean;
}

export interface ComplianceMigrationInfo {
  readonly consentRequired: boolean;
  readonly dataProcessingAgreement: boolean;
  readonly auditTrailCreation: boolean;
  readonly retentionPolicyUpdate: boolean;
  readonly privacyPolicyAcceptance: boolean;
}

/**
 * Crisis Authentication Types
 */
export interface CrisisAuthenticationConfig {
  readonly enabled: boolean;
  readonly triggers: readonly CrisisTrigger[];
  readonly emergencyBypass: EmergencyBypassConfig;
  readonly crisisSessionManagement: CrisisSessionManagement;
  readonly emergencyContacts: readonly EmergencyContact[];
  readonly dataAccessRules: CrisisDataAccessRules;
}

export interface CrisisTrigger {
  readonly type: 'phq9_threshold' | 'gad7_threshold' | 'crisis_button' | 'manual_override';
  readonly threshold?: number;
  readonly enabled: boolean;
  readonly responseTime: number; // milliseconds
  readonly actions: readonly CrisisAction[];
}

export interface EmergencyBypassConfig {
  readonly allowBypass: boolean;
  readonly bypassMethods: readonly AuthenticationMethod[];
  readonly timeLimit: number; // seconds
  readonly auditLevel: 'comprehensive';
  readonly requiresJustification: boolean;
  readonly emergencyContactNotification: boolean;
}

export interface CrisisSessionManagement {
  readonly maxDuration: number; // seconds
  readonly extendedAccess: boolean;
  readonly dataEncryption: boolean;
  readonly auditLogging: boolean;
  readonly automaticBackup: boolean;
  readonly emergencySync: boolean;
}

export interface EmergencyContact {
  readonly id: string;
  readonly name: string;
  readonly relationship: string;
  readonly phoneNumber: string;
  readonly email?: string;
  readonly isPrimary: boolean;
  readonly verificationStatus: 'verified' | 'pending' | 'failed';
  readonly lastContacted?: string;
  readonly contactPreferences: ContactPreferences;
}

export interface CrisisDataAccessRules {
  readonly allowedOperations: readonly ('read' | 'write' | 'export' | 'share')[];
  readonly restrictedData: readonly string[];
  readonly emergencyDataTypes: readonly string[];
  readonly auditLevel: 'comprehensive';
  readonly dataRetention: 'extended' | 'standard' | 'minimal';
}

/**
 * Error Handling Types
 */
export interface AuthenticationError {
  readonly code: AuthErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
  readonly recoverable: boolean;
  readonly userMessage?: string;
  readonly suggestions?: readonly string[];
}

export type AuthErrorCode =
  | 'BIOMETRIC_UNAVAILABLE'
  | 'BIOMETRIC_ENROLLMENT_REQUIRED'
  | 'BIOMETRIC_AUTHENTICATION_FAILED'
  | 'OAUTH_PROVIDER_ERROR'
  | 'OAUTH_CANCELLED'
  | 'JWT_EXPIRED'
  | 'JWT_INVALID'
  | 'SESSION_EXPIRED'
  | 'DEVICE_NOT_TRUSTED'
  | 'ENCRYPTION_FAILED'
  | 'NETWORK_ERROR'
  | 'CRISIS_MODE_REQUIRED'
  | 'COMPLIANCE_VIOLATION'
  | 'MIGRATION_FAILED'
  | 'UNKNOWN_ERROR';

export interface OAuthError {
  readonly error: string;
  readonly errorDescription?: string;
  readonly errorUri?: string;
  readonly state?: string;
}

/**
 * Store Integration Types
 */
export interface AuthenticationStore {
  // State
  readonly currentSession: EnhancedAuthSession | null;
  readonly authenticationFlow: AuthenticationFlow | null;
  readonly userAuthProfile: UserAuthenticationProfile | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: AuthenticationError | null;
  readonly crisisMode: boolean;

  // Actions
  readonly signInAnonymous: () => Promise<AuthenticationResult>;
  readonly signUpWithBiometric: (biometricType: 'face' | 'fingerprint' | 'voice') => Promise<AuthenticationResult>;
  readonly signInWithBiometric: (biometricType: 'face' | 'fingerprint' | 'voice') => Promise<AuthenticationResult>;
  readonly signInWithOAuth: (provider: 'apple' | 'google') => Promise<AuthenticationResult>;
  readonly signOut: () => Promise<void>;
  readonly refreshSession: () => Promise<AuthenticationResult>;
  readonly migrateToAuthenticated: (authMethod: AuthenticationMethod) => Promise<AuthenticationResult>;
  readonly enterCrisisMode: (trigger: CrisisTrigger) => Promise<void>;
  readonly exitCrisisMode: () => Promise<void>;
  readonly validateJWT: (token: string) => Promise<EnhancedJWTValidationResult>;
  readonly revokeDevice: (deviceId: string) => Promise<void>;
  readonly getSessionStatus: () => SessionStatus;
  readonly updatePreferences: (preferences: Partial<AuthenticationPreferences>) => Promise<void>;

  // Selectors
  readonly getAuthMethod: () => AuthenticationMethod | null;
  readonly canUseBiometric: () => boolean;
  readonly isDeviceTrusted: () => boolean;
  readonly getSecurityLevel: () => 'low' | 'medium' | 'high';
  readonly getComplianceStatus: () => ComplianceStatus;
  readonly getCrisisContext: () => CrisisSessionContext | null;
}

export interface SessionStatus {
  readonly isValid: boolean;
  readonly expiresAt: string;
  readonly timeRemaining: number; // seconds
  readonly authMethod: AuthenticationMethod;
  readonly securityLevel: 'low' | 'medium' | 'high';
  readonly canExtend: boolean;
  readonly requiresRefresh: boolean;
}

export interface ComplianceStatus {
  readonly level: 'basic' | 'hipaa' | 'enhanced';
  readonly consentCurrent: boolean;
  readonly auditingEnabled: boolean;
  readonly encryptionCompliant: boolean;
  readonly dataRetentionCompliant: boolean;
  readonly issues: readonly string[];
}

/**
 * Navigation Integration Types
 */
export interface AuthProtectedRoute {
  readonly routeName: string;
  readonly requiresAuth: boolean;
  readonly allowedMethods: readonly AuthenticationMethod[];
  readonly minSecurityLevel: 'low' | 'medium' | 'high';
  readonly crisisAccessible: boolean;
  readonly biometricRequired?: boolean;
  readonly sessionTimeout?: number;
  readonly dataAccess: readonly DataSensitivity[];
}

export interface NavigationAuthState {
  readonly isAuthenticated: boolean;
  readonly authMethod: AuthenticationMethod | null;
  readonly securityLevel: 'low' | 'medium' | 'high';
  readonly sessionValid: boolean;
  readonly crisisMode: boolean;
  readonly pendingNavigation?: string;
  readonly authRequiredForRoute?: string;
}

/**
 * Supporting Utility Types
 */
export interface SecurityFlag {
  readonly type: 'suspicious_device' | 'unusual_location' | 'failed_attempts' | 'time_anomaly';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly detectedAt: string;
  readonly resolved: boolean;
}

export interface ComplianceCheck {
  readonly requirement: 'consent' | 'data_agreement' | 'audit_trail' | 'encryption' | 'retention';
  readonly status: 'compliant' | 'non_compliant' | 'pending';
  readonly details: string;
  readonly lastChecked: string;
}

export interface BiometricCapabilities {
  readonly available: boolean;
  readonly types: readonly ('face' | 'fingerprint' | 'voice' | 'iris')[];
  readonly enrolled: boolean;
  readonly hardwareBacked: boolean;
  readonly encryptionSupported: boolean;
}

export interface DeviceEncryptionCapabilities {
  readonly hardwareEncryption: boolean;
  readonly keychainAccess: boolean;
  readonly biometricKeyDerivation: boolean;
  readonly secureEnclave: boolean;
  readonly webCryptoSupport: boolean;
}

export interface PlatformInfo {
  readonly platform: 'ios' | 'android';
  readonly osVersion: string;
  readonly appVersion: string;
  readonly deviceModel: string;
  readonly screenSize: string;
  readonly locale: string;
  readonly timezone: string;
}

export interface NetworkInfo {
  readonly connectionType: 'wifi' | 'cellular' | 'ethernet' | 'none';
  readonly isConnected: boolean;
  readonly isVPN: boolean;
  readonly carrier?: string;
  readonly country?: string;
}

export interface ConsentLevel {
  readonly essential: boolean;
  readonly functional: boolean;
  readonly analytics: boolean;
  readonly marketing: boolean;
  readonly research: boolean;
}

export interface DataProcessingAgreement {
  readonly type: 'essential' | 'therapeutic' | 'research' | 'marketing';
  readonly version: string;
  readonly agreedAt: string;
  readonly expiresAt?: string;
  readonly active: boolean;
}

export interface AccessRequirements {
  readonly dataTypes: readonly DataSensitivity[];
  readonly operations: readonly ('read' | 'write' | 'delete' | 'export')[];
  readonly minSecurityLevel: 'low' | 'medium' | 'high';
  readonly auditRequired: boolean;
  readonly encryptionRequired: boolean;
}

export interface MigrationStatus {
  readonly inProgress: boolean;
  readonly phase: 'preparation' | 'data_transfer' | 'security_upgrade' | 'validation' | 'completion';
  readonly progress: number; // 0-100
  readonly estimatedCompletion: string;
  readonly canRollback: boolean;
}

export interface QualityFactor {
  readonly factor: 'lighting' | 'angle' | 'distance' | 'motion' | 'focus' | 'coverage';
  readonly score: number; // 0-1
  readonly impact: 'positive' | 'negative' | 'neutral';
}

export interface CrisisOverrides {
  readonly skipBiometric: boolean;
  readonly extendSession: boolean;
  readonly enableEmergencyContacts: boolean;
  readonly allowDataExport: boolean;
  readonly bypassEncryption: boolean;
  readonly expediteSync: boolean;
}

export interface ContactPreferences {
  readonly methods: readonly ('phone' | 'sms' | 'email')[];
  readonly timeRestrictions?: {
    readonly startHour: number;
    readonly endHour: number;
  };
  readonly urgencyLevels: readonly ('low' | 'medium' | 'high' | 'emergency')[];
}

export interface RiskFactor {
  readonly type: 'token_age' | 'device_change' | 'location_change' | 'behavior_anomaly' | 'failed_attempts';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly impact: number; // 0-1
}

export interface RollbackStrategy {
  readonly enabled: boolean;
  readonly triggers: readonly string[];
  readonly dataBackup: string;
  readonly timeLimit: number; // seconds
  readonly verificationRequired: boolean;
}

export interface ProfileMigrationPlan {
  readonly strategy: 'merge' | 'replace' | 'selective';
  readonly preserveFields: readonly (keyof UserProfile)[];
  readonly upgradeFields: readonly (keyof UserProfile)[];
  readonly encryptionUpgrade: boolean;
}

export interface CheckInMigrationPlan {
  readonly batchSize: number;
  readonly encryptionUpgrade: boolean;
  readonly preserveHistory: boolean;
  readonly validation: 'strict' | 'lenient';
}

export interface AssessmentMigrationPlan {
  readonly encryptionUpgrade: boolean;
  readonly auditTrailCreation: boolean;
  readonly complianceValidation: boolean;
  readonly preserveScoring: boolean;
}

export interface CrisisPlanMigrationPlan {
  readonly encryptionUpgrade: boolean;
  readonly emergencyAccessUpdate: boolean;
  readonly contactVerification: boolean;
  readonly backupCreation: boolean;
}

export interface SettingsMigrationPlan {
  readonly preservePreferences: boolean;
  readonly upgradeNotifications: boolean;
  readonly enhancePrivacy: boolean;
  readonly enableFeatures: readonly string[];
}

export interface MigrationValidationResults {
  readonly dataIntegrity: boolean;
  readonly encryptionValidation: boolean;
  readonly complianceCheck: boolean;
  readonly performanceImpact: number; // 0-1
  readonly issues: readonly string[];
  readonly warnings: readonly string[];
}

export interface DataRetentionSettings {
  readonly retentionPeriod: number; // days
  readonly autoDelete: boolean;
  readonly exportBeforeDeletion: boolean;
  readonly notificationPeriod: number; // days before deletion
  readonly exemptions: readonly string[];
}

export interface CrisisAction {
  readonly type: 'emergency_contact' | 'data_backup' | 'session_extend' | 'enable_sync';
  readonly priority: 'immediate' | 'high' | 'normal' | 'low';
  readonly timeout: number; // seconds
  readonly retries: number;
  readonly failureHandling: 'continue' | 'abort' | 'retry';
}

/**
 * Runtime Validation Schemas
 */
export const AuthenticationFlowSchema = z.object({
  id: z.string().uuid(),
  method: z.enum(['anonymous', 'biometric_face', 'biometric_fingerprint', 'biometric_voice', 'oauth_apple', 'oauth_google', 'emergency_bypass', 'recovery_code']),
  initiatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  result: z.enum(['success', 'failure', 'cancelled', 'requires_setup', 'biometric_unavailable']).optional(),
  steps: z.array(z.object({
    stepId: z.string(),
    type: z.enum(['biometric_prompt', 'oauth_redirect', 'user_consent', 'device_verification', 'emergency_validation']),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
    data: z.record(z.unknown()).optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
      timestamp: z.string().datetime(),
      recoverable: z.boolean(),
      userMessage: z.string().optional(),
      suggestions: z.array(z.string()).optional()
    }).optional()
  })),
  securityContext: z.object({
    riskScore: z.number().min(0).max(1),
    deviceTrusted: z.boolean(),
    locationVerified: z.boolean(),
    behaviorNormal: z.boolean(),
    biometricQuality: z.number().min(0).max(1).optional(),
    securityFlags: z.array(z.object({
      type: z.enum(['suspicious_device', 'unusual_location', 'failed_attempts', 'time_anomaly']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      detectedAt: z.string().datetime(),
      resolved: z.boolean()
    })),
    complianceChecks: z.array(z.object({
      requirement: z.enum(['consent', 'data_agreement', 'audit_trail', 'encryption', 'retention']),
      status: z.enum(['compliant', 'non_compliant', 'pending']),
      details: z.string(),
      lastChecked: z.string().datetime()
    }))
  }),
  deviceContext: z.object({
    deviceId: z.string(),
    deviceFingerprint: z.string(),
    biometricCapabilities: z.object({
      available: z.boolean(),
      types: z.array(z.enum(['face', 'fingerprint', 'voice', 'iris'])),
      enrolled: z.boolean(),
      hardwareBacked: z.boolean(),
      encryptionSupported: z.boolean()
    }),
    encryptionCapabilities: z.object({
      hardwareEncryption: z.boolean(),
      keychainAccess: z.boolean(),
      biometricKeyDerivation: z.boolean(),
      secureEnclave: z.boolean(),
      webCryptoSupport: z.boolean()
    }),
    platformInfo: z.object({
      platform: z.enum(['ios', 'android']),
      osVersion: z.string(),
      appVersion: z.string(),
      deviceModel: z.string(),
      screenSize: z.string(),
      locale: z.string(),
      timezone: z.string()
    }),
    networkInfo: z.object({
      connectionType: z.enum(['wifi', 'cellular', 'ethernet', 'none']),
      isConnected: z.boolean(),
      isVPN: z.boolean(),
      carrier: z.string().optional(),
      country: z.string().optional()
    })
  }),
  userContext: z.object({
    userId: z.string().optional(),
    sessionType: z.enum(['anonymous', 'authenticated', 'emergency']),
    consentLevel: z.object({
      essential: z.boolean(),
      functional: z.boolean(),
      analytics: z.boolean(),
      marketing: z.boolean(),
      research: z.boolean()
    }),
    dataProcessingAgreements: z.array(z.object({
      type: z.enum(['essential', 'therapeutic', 'research', 'marketing']),
      version: z.string(),
      agreedAt: z.string().datetime(),
      expiresAt: z.string().datetime().optional(),
      active: z.boolean()
    })),
    accessRequirements: z.object({
      dataTypes: z.array(z.enum(['clinical', 'personal', 'therapeutic', 'system'])),
      operations: z.array(z.enum(['read', 'write', 'delete', 'export'])),
      minSecurityLevel: z.enum(['low', 'medium', 'high']),
      auditRequired: z.boolean(),
      encryptionRequired: z.boolean()
    }),
    migrationStatus: z.object({
      inProgress: z.boolean(),
      phase: z.enum(['preparation', 'data_transfer', 'security_upgrade', 'validation', 'completion']),
      progress: z.number().int().min(0).max(100),
      estimatedCompletion: z.string().datetime(),
      canRollback: z.boolean()
    }).optional()
  })
}).readonly();

export const EnhancedJWTClaimsSchema = z.object({
  iss: z.string().url(),
  sub: z.string().uuid(),
  aud: z.string(),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  nbf: z.number().int().positive().optional(),
  jti: z.string().uuid(),
  scope: z.array(z.string()),
  deviceId: z.string(),
  sessionId: z.string().uuid(),
  authMethod: z.enum(['anonymous', 'biometric_face', 'biometric_fingerprint', 'biometric_voice', 'oauth_apple', 'oauth_google', 'emergency_bypass', 'recovery_code']),
  mfaVerified: z.boolean(),
  biometricVerified: z.boolean(),
  riskScore: z.number().min(0).max(1),
  crisisMode: z.boolean().optional(),
  emergencyAccess: z.boolean().optional(),
  customClaims: z.object({
    appVersion: z.string(),
    platformInfo: z.string(),
    encryptionEnabled: z.boolean(),
    complianceLevel: z.enum(['basic', 'hipaa', 'enhanced']),
    dataRetentionDays: z.number().int().positive(),
    therapeuticAccess: z.boolean(),
    clinicalDataAccess: z.boolean(),
    emergencyProtocols: z.boolean()
  })
}).readonly();

/**
 * Type Guards for Authentication Types
 */
export const isAuthenticationFlow = (flow: unknown): flow is AuthenticationFlow => {
  try {
    AuthenticationFlowSchema.parse(flow);
    return true;
  } catch {
    return false;
  }
};

export const isEnhancedJWTClaims = (claims: unknown): claims is EnhancedJWTClaims => {
  try {
    EnhancedJWTClaimsSchema.parse(claims);
    return true;
  } catch {
    return false;
  }
};

export const isAuthenticationError = (error: unknown): error is AuthenticationError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error &&
    'recoverable' in error
  );
};

export const isCrisisMode = (session: unknown): session is EnhancedAuthSession => {
  return (
    typeof session === 'object' &&
    session !== null &&
    'crisisContext' in session &&
    session.crisisContext !== null
  );
};

/**
 * Constants for Authentication System
 */
export const AUTHENTICATION_CONSTANTS = {
  // Session Management
  SESSION: {
    ANONYMOUS_TIMEOUT_MINUTES: 60,
    AUTHENTICATED_TIMEOUT_MINUTES: 30,
    EMERGENCY_TIMEOUT_MINUTES: 15,
    JWT_EXPIRY_MINUTES: 15,
    REFRESH_THRESHOLD_MINUTES: 5,
    MAX_CONCURRENT_SESSIONS: 3
  },

  // Biometric Settings
  BIOMETRIC: {
    QUALITY_THRESHOLD: 0.8,
    MAX_ATTEMPTS: 3,
    TIMEOUT_SECONDS: 30,
    ENROLLMENT_SAMPLES: 3,
    LIVENESS_REQUIRED: true
  },

  // OAuth Configuration
  OAUTH: {
    APPLE_CLIENT_ID: 'com.being.mbct',
    GOOGLE_CLIENT_ID: 'your-google-client-id',
    REDIRECT_URI: 'com.being.mbct://oauth/callback',
    PKCE_ENABLED: true,
    STATE_LENGTH: 32,
    NONCE_LENGTH: 32
  },

  // Security Thresholds
  SECURITY: {
    MAX_FAILED_ATTEMPTS: 3,
    LOCKOUT_DURATION_MINUTES: 15,
    RISK_SCORE_THRESHOLD: 0.7,
    DEVICE_TRUST_PERIOD_DAYS: 30,
    SESSION_EXTENSION_LIMIT: 3
  },

  // Crisis Response
  CRISIS: {
    RESPONSE_TIME_MS: 200,
    PHQ9_THRESHOLD: 20,
    GAD7_THRESHOLD: 15,
    EMERGENCY_SESSION_MINUTES: 60,
    AUTO_BACKUP_ENABLED: true,
    CONTACT_TIMEOUT_SECONDS: 30
  },

  // Compliance
  COMPLIANCE: {
    CONSENT_VERSION_CURRENT: '2024.2',
    PRIVACY_POLICY_VERSION: '2024.2',
    DATA_RETENTION_DAYS: 2555, // 7 years
    AUDIT_LOG_RETENTION_DAYS: 2555,
    ENCRYPTION_REQUIRED_SENSITIVITY: ['clinical', 'personal']
  },

  // Performance Requirements
  PERFORMANCE: {
    MAX_AUTH_TIME_MS: 3000,
    MAX_BIOMETRIC_TIME_MS: 5000,
    MAX_JWT_VALIDATION_MS: 100,
    MAX_MIGRATION_TIME_MS: 30000,
    TARGET_SUCCESS_RATE: 0.99
  }
} as const;

/**
 * Export convenience type unions
 */
export type AuthenticationTypes =
  | AuthenticationFlow
  | EnhancedAuthSession
  | UserAuthenticationProfile
  | EnhancedBiometricAuthData
  | OAuthAuthenticationResult
  | EnhancedJWTClaims
  | EnhancedUserMigration
  | CrisisAuthenticationConfig;

export type AuthenticationStoreTypes =
  | AuthenticationStore
  | SessionStatus
  | ComplianceStatus
  | NavigationAuthState;

export type AuthenticationErrorTypes =
  | AuthenticationError
  | OAuthError
  | AuthErrorCode;