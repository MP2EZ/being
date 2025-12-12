/**
 * Security and Encryption Types - Enhanced Protection Framework
 * Comprehensive type definitions for encryption, authentication, and security monitoring
 * 
 * SECURITY REQUIREMENTS:
 * - AES-256 encryption for PHI data at rest
 * - TLS 1.3 for data in transit
 * - Key rotation every 90 days
 * - Biometric authentication where available
 * - Real-time threat monitoring and response
 * - Multi-factor authentication for sensitive operations
 * 
 * PERFORMANCE CONSTRAINTS:
 * - Encryption/decryption: <50ms for clinical data
 * - Authentication: <100ms for standard login
 * - Biometric auth: <200ms for crisis scenarios
 * - Key derivation: <500ms for initial setup
 * - Security monitoring: <5ms impact on operations
 */

import { PHIClassification } from '../compliance/hipaa';

/**
 * Encryption Algorithm Types
 */
export type EncryptionAlgorithm = 
  | 'AES-256-GCM'          // Primary for PHI data
  | 'AES-256-CBC'          // Legacy support
  | 'ChaCha20-Poly1305'    // Mobile-optimized alternative
  | 'RSA-4096'             // Key exchange and digital signatures
  | 'ECDSA-P256'           // Elliptic curve signatures
  | 'PBKDF2'               // Password-based key derivation
  | 'scrypt'               // Memory-hard key derivation
  | 'Argon2id';            // Modern password hashing

/**
 * Key Types and Purposes
 */
export type KeyType = 
  | 'master_key'           // Root encryption key
  | 'data_encryption_key'  // DEK for specific data types
  | 'key_encryption_key'   // KEK for wrapping DEKs
  | 'signing_key'          // Digital signature key
  | 'authentication_key'   // User authentication
  | 'session_key'          // Temporary session encryption
  | 'backup_key'           // Backup and recovery
  | 'emergency_key'        // Crisis scenario access
  | 'audit_key'            // Audit log integrity
  | 'transport_key';       // TLS/network encryption

/**
 * Key Status and Lifecycle
 */
export type KeyStatus = 
  | 'active'               // Currently in use
  | 'inactive'             // Temporarily disabled
  | 'rotating'             // In process of rotation
  | 'deprecated'           // Scheduled for retirement
  | 'compromised'          // Security breach detected
  | 'expired'              // Past expiration date
  | 'revoked';             // Permanently disabled

/**
 * Encryption Key Interface
 */
export interface EncryptionKey {
  /** Unique key identifier */
  keyId: string;
  /** Key type and purpose */
  type: KeyType;
  /** Encryption algorithm */
  algorithm: EncryptionAlgorithm;
  /** Key status */
  status: KeyStatus;
  /** Key length in bits */
  keyLength: number;
  /** When key was created */
  createdAt: number;
  /** When key becomes active */
  activeAt: number;
  /** When key expires */
  expiresAt: number;
  /** When key was last rotated */
  lastRotatedAt?: number;
  /** Key version for rotation tracking */
  version: number;
  /** Encrypted key material (never stored plain) */
  encryptedKeyData: string;
  /** Key derivation information */
  derivation?: KeyDerivationInfo;
  /** Hardware security module binding */
  hsmBinding?: HSMBinding;
  /** Allowed operations for this key */
  allowedOperations: KeyOperation[];
  /** Data types this key can encrypt */
  allowedDataTypes: PHIClassification[];
  /** Key usage statistics */
  usageStats: KeyUsageStats;
  /** Access control for key operations */
  accessControl: KeyAccessControl;
  /** Audit trail for key operations */
  auditTrail: KeyAuditEntry[];
}

/**
 * Key Derivation Information
 */
export interface KeyDerivationInfo {
  /** Derivation algorithm used */
  algorithm: 'PBKDF2' | 'scrypt' | 'Argon2id';
  /** Salt used for derivation */
  salt: string;
  /** Number of iterations/rounds */
  iterations: number;
  /** Memory cost (for scrypt/Argon2) */
  memoryCost?: number;
  /** Parallelism factor (for Argon2) */
  parallelism?: number;
  /** Key stretching factor */
  stretchingFactor: number;
}

/**
 * Hardware Security Module Binding
 */
export interface HSMBinding {
  /** HSM identifier */
  hsmId: string;
  /** Key slot in HSM */
  keySlot: number;
  /** HSM attestation signature */
  attestation: string;
  /** HSM firmware version */
  firmwareVersion: string;
  /** Whether key is hardware-bound */
  hardwareBound: boolean;
  /** TEE (Trusted Execution Environment) usage */
  teeProtected: boolean;
}

/**
 * Allowed Key Operations
 */
export type KeyOperation = 
  | 'encrypt'              // Encrypt data
  | 'decrypt'              // Decrypt data
  | 'sign'                 // Create digital signature
  | 'verify'               // Verify digital signature
  | 'derive'               // Derive new keys
  | 'wrap'                 // Wrap other keys
  | 'unwrap'               // Unwrap other keys
  | 'export'               // Export key (if allowed)
  | 'rotate';              // Rotate key

/**
 * Key Usage Statistics
 */
export interface KeyUsageStats {
  /** Total number of operations performed */
  totalOperations: number;
  /** Operations performed in last 24 hours */
  operationsLast24h: number;
  /** Last time key was used */
  lastUsedAt: number;
  /** Average operation duration (ms) */
  averageOperationTimeMs: number;
  /** Number of failed operations */
  failedOperations: number;
  /** Data volume encrypted (bytes) */
  bytesEncrypted: number;
  /** Data volume decrypted (bytes) */
  bytesDecrypted: number;
}

/**
 * Key Access Control
 */
export interface KeyAccessControl {
  /** Users/roles allowed to use this key */
  allowedPrincipals: string[];
  /** Operations allowed per principal */
  principalOperations: Record<string, KeyOperation[]>;
  /** Time-based access restrictions */
  timeRestrictions?: {
    allowedHours: number[];
    allowedDays: number[];
    timezone: string;
  };
  /** Location-based access restrictions */
  locationRestrictions?: {
    allowedCountries: string[];
    allowedRegions: string[];
    allowedIpRanges: string[];
  };
  /** Device-based access restrictions */
  deviceRestrictions?: {
    allowedDeviceTypes: string[];
    allowedDeviceIds: string[];
    requireBiometric: boolean;
  };
}

/**
 * Key Audit Entry
 */
export interface KeyAuditEntry {
  /** Audit entry ID */
  entryId: string;
  /** Timestamp of operation */
  timestamp: number;
  /** Principal performing operation */
  principal: string;
  /** Operation performed */
  operation: KeyOperation;
  /** Operation result */
  result: 'success' | 'failure' | 'partial';
  /** Error details if operation failed */
  errorDetails?: string;
  /** Operation context */
  context: {
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
  };
  /** Performance metrics */
  performanceMetrics: {
    operationTimeMs: number;
    dataVolumeBytes?: number;
  };
}

/**
 * Encryption Context
 */
export interface EncryptionContext {
  /** Data type being encrypted */
  dataType: PHIClassification;
  /** Purpose of encryption */
  purpose: 'storage' | 'transit' | 'backup' | 'export' | 'sharing';
  /** User context */
  userId: string;
  /** Session context */
  sessionId: string;
  /** Encryption timestamp */
  timestamp: number;
  /** Additional authenticated data (AAD) */
  additionalData?: Record<string, unknown>;
  /** Compression applied before encryption */
  compressionApplied?: boolean;
  /** Integrity check method */
  integrityCheck: 'hmac' | 'gcm' | 'poly1305';
}

/**
 * Encryption Result
 */
export interface EncryptionResult {
  /** Encrypted data */
  encryptedData: string;
  /** Encryption algorithm used */
  algorithm: EncryptionAlgorithm;
  /** Key ID used for encryption */
  keyId: string;
  /** Initialization vector */
  iv: string;
  /** Authentication tag (for AEAD) */
  authTag?: string;
  /** Encryption context */
  context: EncryptionContext;
  /** Encryption performance metrics */
  metrics: {
    encryptionTimeMs: number;
    plaintextSizeBytes: number;
    ciphertextSizeBytes: number;
    compressionRatio?: number;
  };
}

/**
 * Authentication Types
 */
export type AuthenticationType = 
  | 'biometric'            // Fingerprint, face, voice
  | 'password'             // Traditional password
  | 'pin'                  // Numeric PIN
  | 'pattern'              // Gesture pattern
  | 'token'                // Hardware/software token
  | 'certificate'          // Digital certificate
  | 'social'               // OAuth/social login
  | 'device_based'         // Device trust
  | 'multi_factor';        // Combination of methods

/**
 * Biometric Authentication Types
 */
export type BiometricType = 
  | 'fingerprint'          // Touch ID, fingerprint scanner
  | 'face'                 // Face ID, facial recognition
  | 'voice'                // Voice recognition
  | 'iris'                 // Iris scanning
  | 'palm'                 // Palm print
  | 'behavioral';          // Typing patterns, usage behavior

/**
 * Authentication Factor Strength
 */
export type AuthFactorStrength = 
  | 'weak'                 // Single factor, low entropy
  | 'moderate'             // Single strong factor
  | 'strong'               // Two factors
  | 'very_strong'          // Multiple factors + biometric
  | 'enterprise';          // Hardware tokens + certificates

/**
 * Authentication Session
 */
export interface AuthenticationSession {
  /** Session ID */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Authentication methods used */
  authMethods: AuthenticationType[];
  /** Session strength */
  strength: AuthFactorStrength;
  /** When session was created */
  createdAt: number;
  /** When session expires */
  expiresAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Session is active */
  isActive: boolean;
  /** Device information */
  deviceInfo: DeviceInfo;
  /** Location information */
  locationInfo?: LocationInfo;
  /** Risk assessment */
  riskAssessment: SessionRiskAssessment;
  /** Session privileges */
  privileges: SessionPrivilege[];
  /** Refresh token */
  refreshToken?: string;
  /** Session metadata */
  metadata: Record<string, unknown>;
}

/**
 * Device Information
 */
export interface DeviceInfo {
  /** Unique device identifier */
  deviceId: string;
  /** Device type */
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'embedded';
  /** Platform */
  platform: 'ios' | 'android' | 'web' | 'windows' | 'macos' | 'linux';
  /** OS version */
  osVersion: string;
  /** App version */
  appVersion: string;
  /** Device name */
  deviceName?: string;
  /** Hardware specifications */
  hardwareInfo: {
    model: string;
    manufacturer: string;
    screenResolution?: string;
    totalMemory?: number;
    availableStorage?: number;
  };
  /** Security features available */
  securityFeatures: {
    biometricAvailable: boolean;
    biometricTypes: BiometricType[];
    secureEnclaveAvailable: boolean;
    keychainAvailable: boolean;
    jailbroken: boolean;
    debuggerDetected: boolean;
  };
  /** Device trust level */
  trustLevel: 'unknown' | 'untrusted' | 'trusted' | 'verified';
  /** Device registration timestamp */
  registeredAt: number;
  /** Last seen timestamp */
  lastSeenAt: number;
}

/**
 * Location Information
 */
export interface LocationInfo {
  /** GPS coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  /** IP address */
  ipAddress: string;
  /** Geolocation from IP */
  geoLocation?: {
    country: string;
    region: string;
    city: string;
    timezone: string;
  };
  /** VPN/Proxy detection */
  proxyDetection: {
    isProxy: boolean;
    isVPN: boolean;
    proxyType?: string;
  };
  /** Location trust score */
  trustScore: number; // 0-100
}

/**
 * Session Risk Assessment
 */
export interface SessionRiskAssessment {
  /** Overall risk score */
  riskScore: number; // 0-100
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Risk factors detected */
  riskFactors: RiskFactor[];
  /** Behavioral analysis */
  behavioralAnalysis: {
    usagePatternMatch: number; // 0-100
    typingPatternMatch?: number; // 0-100
    navigationPatternMatch: number; // 0-100
    anomaliesDetected: string[];
  };
  /** Device analysis */
  deviceAnalysis: {
    deviceTrustScore: number; // 0-100
    newDevice: boolean;
    deviceCompromised: boolean;
    securityFeaturesEnabled: boolean;
  };
  /** Network analysis */
  networkAnalysis: {
    connectionTrustScore: number; // 0-100
    suspiciousActivity: boolean;
    anomalousLocation: boolean;
    knownBadIp: boolean;
  };
  /** Assessment timestamp */
  assessedAt: number;
}

/**
 * Risk Factors
 */
export type RiskFactor = 
  | 'new_device'           // First time login from device
  | 'new_location'         // Login from new geographic location
  | 'unusual_time'         // Login at unusual time
  | 'proxy_detected'       // VPN/proxy usage detected
  | 'multiple_failures'    // Recent authentication failures
  | 'device_compromised'   // Device shows signs of compromise
  | 'behavioral_anomaly'   // Usage pattern doesn't match
  | 'concurrent_sessions'  // Multiple active sessions
  | 'privilege_escalation' // Attempting higher privileges
  | 'suspicious_activity'  // Suspicious user behavior
  | 'threat_intelligence'; // Known threat indicators

/**
 * Session Privileges
 */
export interface SessionPrivilege {
  /** Privilege type */
  type: 'data_access' | 'data_modification' | 'administrative' | 'emergency' | 'export' | 'sharing';
  /** Specific resources accessible */
  resources: string[];
  /** Privilege level */
  level: 'read' | 'write' | 'admin' | 'root';
  /** Privilege granted timestamp */
  grantedAt: number;
  /** Privilege expires at */
  expiresAt?: number;
  /** Conditions for privilege usage */
  conditions: PrivilegeCondition[];
}

/**
 * Privilege Conditions
 */
export interface PrivilegeCondition {
  /** Condition type */
  type: 'time_window' | 'location_restriction' | 'additional_auth' | 'approval_required' | 'audit_required';
  /** Condition parameters */
  parameters: Record<string, unknown>;
  /** Whether condition is satisfied */
  satisfied: boolean;
}

/**
 * Security Monitoring Types
 */
export interface SecurityEvent {
  /** Event ID */
  eventId: string;
  /** Event timestamp */
  timestamp: number;
  /** Event type */
  type: SecurityEventType;
  /** Event severity */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** Event source */
  source: string;
  /** User context */
  userId?: string;
  /** Session context */
  sessionId?: string;
  /** Device context */
  deviceId?: string;
  /** Event description */
  description: string;
  /** Event details */
  details: Record<string, unknown>;
  /** Automatic response taken */
  autoResponse?: SecurityResponse;
  /** Manual response required */
  requiresResponse: boolean;
  /** Event resolution status */
  resolved: boolean;
  /** Resolution timestamp */
  resolvedAt?: number;
  /** Response actions taken */
  responseActions: string[];
}

/**
 * Security Event Types
 */
export type SecurityEventType = 
  | 'authentication_failure'   // Failed login attempt
  | 'authentication_success'   // Successful login
  | 'session_hijack_attempt'   // Session hijacking detected
  | 'privilege_escalation'     // Unauthorized privilege access
  | 'data_access_violation'    // Unauthorized data access
  | 'encryption_failure'       // Encryption operation failed
  | 'key_compromise_detected'  // Possible key compromise
  | 'device_compromise'        // Device compromise indicators
  | 'network_intrusion'        // Network-based attack
  | 'malware_detected'         // Malware presence detected
  | 'data_exfiltration'        // Suspicious data export
  | 'brute_force_attack'       // Brute force attempt
  | 'account_lockout'          // Account locked due to security
  | 'security_policy_violation' // Security policy breach
  | 'vulnerability_exploit';   // Known vulnerability exploited

/**
 * Security Response
 */
export interface SecurityResponse {
  /** Response ID */
  responseId: string;
  /** Response type */
  type: SecurityResponseType;
  /** Response triggered at */
  triggeredAt: number;
  /** Response actions */
  actions: SecurityAction[];
  /** Response effectiveness */
  effectiveness: 'effective' | 'partial' | 'ineffective' | 'unknown';
  /** Response duration */
  durationMs: number;
  /** Follow-up required */
  followUpRequired: boolean;
}

/**
 * Security Response Types
 */
export type SecurityResponseType = 
  | 'account_lockout'          // Lock user account
  | 'session_termination'      // Terminate active sessions
  | 'device_quarantine'        // Quarantine suspicious device
  | 'privilege_revocation'     // Remove elevated privileges
  | 'alert_notification'       // Send security alert
  | 'incident_escalation'      // Escalate to security team
  | 'automatic_mitigation'     // Apply automatic safeguards
  | 'emergency_protocol'       // Activate emergency procedures
  | 'forensic_capture'         // Capture forensic evidence
  | 'threat_blocking';         // Block known threats

/**
 * Security Actions
 */
export interface SecurityAction {
  /** Action type */
  type: string;
  /** Action timestamp */
  timestamp: number;
  /** Action result */
  result: 'success' | 'failure' | 'partial';
  /** Action details */
  details: Record<string, unknown>;
  /** Action duration */
  durationMs: number;
}

/**
 * Performance-Constrained Security Operations
 */
export interface SecurityPerformanceConstraints {
  /** Maximum encryption time (ms) */
  MAX_ENCRYPTION_TIME: 50;
  /** Maximum authentication time (ms) */
  MAX_AUTH_TIME: 100;
  /** Maximum biometric auth time (ms) */
  MAX_BIOMETRIC_AUTH_TIME: 200;
  /** Maximum key derivation time (ms) */
  MAX_KEY_DERIVATION_TIME: 500;
  /** Maximum security monitoring impact (ms) */
  MAX_MONITORING_IMPACT: 5;
  /** Maximum risk assessment time (ms) */
  MAX_RISK_ASSESSMENT_TIME: 30;
}

/**
 * Threat Intelligence
 */
export interface ThreatIntelligence {
  /** Threat ID */
  threatId: string;
  /** Threat type */
  type: 'malware' | 'phishing' | 'credential_stuffing' | 'data_breach' | 'vulnerability' | 'insider_threat';
  /** Threat severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Threat indicators */
  indicators: ThreatIndicator[];
  /** First seen timestamp */
  firstSeenAt: number;
  /** Last seen timestamp */
  lastSeenAt: number;
  /** Threat description */
  description: string;
  /** Mitigation strategies */
  mitigations: string[];
  /** Affected systems */
  affectedSystems: string[];
  /** Confidence level */
  confidenceLevel: number; // 0-100
}

/**
 * Threat Indicators
 */
export interface ThreatIndicator {
  /** Indicator type */
  type: 'ip_address' | 'domain' | 'url' | 'file_hash' | 'email' | 'certificate' | 'user_agent';
  /** Indicator value */
  value: string;
  /** Indicator confidence */
  confidence: number; // 0-100
  /** First observed */
  firstObserved: number;
  /** Last observed */
  lastObserved: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Security Service Interfaces
 */
export interface EncryptionService {
  encrypt: (data: string, context: EncryptionContext) => Promise<EncryptionResult>;
  decrypt: (encryptedData: string, keyId: string, context: EncryptionContext) => Promise<string>;
  generateKey: (type: KeyType, algorithm: EncryptionAlgorithm) => Promise<EncryptionKey>;
  rotateKey: (keyId: string) => Promise<EncryptionKey>;
  validateKeyUsage: (keyId: string, operation: KeyOperation) => Promise<boolean>;
}

export interface AuthenticationService {
  authenticate: (credentials: any, deviceInfo: DeviceInfo) => Promise<AuthenticationSession>;
  validateSession: (sessionId: string) => Promise<boolean>;
  refreshSession: (refreshToken: string) => Promise<AuthenticationSession>;
  terminateSession: (sessionId: string) => Promise<void>;
  assessRisk: (sessionId: string) => Promise<SessionRiskAssessment>;
}

export interface SecurityMonitoringService {
  recordEvent: (event: Partial<SecurityEvent>) => Promise<string>;
  analyzeThreats: (timeWindowMs: number) => Promise<ThreatIntelligence[]>;
  respondToThreat: (threatId: string, responseType: SecurityResponseType) => Promise<SecurityResponse>;
  getSecurityStatus: () => Promise<SecurityStatus>;
}

/**
 * Overall Security Status
 */
export interface SecurityStatus {
  /** Overall security health score */
  healthScore: number; // 0-100
  /** Active threats count */
  activeThreats: number;
  /** Recent incidents count */
  recentIncidents: number;
  /** System vulnerabilities */
  vulnerabilities: string[];
  /** Security recommendations */
  recommendations: string[];
  /** Last security assessment */
  lastAssessmentAt: number;
  /** Security posture trend */
  trend: 'improving' | 'stable' | 'degrading' | 'critical';
}

/**
 * Default Security Constants
 */
export const DEFAULT_SECURITY_SETTINGS = {
  /** Default session timeout (8 hours) */
  DEFAULT_SESSION_TIMEOUT_MS: 8 * 60 * 60 * 1000,
  /** Default key rotation period (90 days) */
  DEFAULT_KEY_ROTATION_PERIOD_MS: 90 * 24 * 60 * 60 * 1000,
  /** Default encryption algorithm */
  DEFAULT_ENCRYPTION_ALGORITHM: 'AES-256-GCM' as EncryptionAlgorithm,
  /** Default key length */
  DEFAULT_KEY_LENGTH: 256,
  /** Performance constraints */
  PERFORMANCE_LIMITS: {
    MAX_ENCRYPTION_TIME: 50,
    MAX_AUTH_TIME: 100,
    MAX_BIOMETRIC_AUTH_TIME: 200,
    MAX_KEY_DERIVATION_TIME: 500,
    MAX_MONITORING_IMPACT: 5,
    MAX_RISK_ASSESSMENT_TIME: 30
  } as SecurityPerformanceConstraints,
  /** Risk thresholds */
  RISK_THRESHOLDS: {
    LOW_RISK_MAX: 25,
    MEDIUM_RISK_MAX: 50,
    HIGH_RISK_MAX: 75,
    CRITICAL_RISK_MIN: 76
  }
} as const;