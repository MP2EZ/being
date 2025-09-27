/**
 * Security and Encryption Types - HIPAA Compliance
 * 
 * These types ensure type safety for all encryption operations
 * and prevent accidental exposure of sensitive mental health data.
 */

// Branded Types for Security
type Brand<K, T> = K & { __brand: T };

// Data Sensitivity Classification
export enum DataSensitivity {
  CLINICAL = 'clinical',     // PHQ-9/GAD-7 answers, suicidal ideation
  PERSONAL = 'personal',     // Check-in emotional data, crisis plans  
  THERAPEUTIC = 'therapeutic', // User values, preferences, patterns
  SYSTEM = 'system'          // App settings, notification preferences
}

// Encryption Types
export type EncryptedData<T> = Brand<string, 'EncryptedData'> & {
  readonly __dataType: T;
};

export type PlaintextData<T> = Brand<T, 'PlaintextData'>;

// Encryption Result with Metadata
export interface EncryptionResult<T = unknown> {
  readonly encryptedData: EncryptedData<T>;
  readonly iv: string;
  readonly authTag?: string; // For GCM mode
  readonly timestamp: string;
  readonly metadata: EncryptionMetadata;
}

export interface EncryptionMetadata {
  readonly algorithm: 'aes-256-gcm';
  readonly keyVersion: number;
  readonly dataType: string;
  readonly sensitivity: DataSensitivity;
  readonly createdAt: string;
  readonly deviceInfo: {
    readonly platform: string;
    readonly version: string;
  };
}

// Key Management Types
export type EncryptionKey = Brand<Uint8Array, 'EncryptionKey'>;
export type MasterKey = Brand<Uint8Array, 'MasterKey'>;
export type DerivedKey = Brand<Uint8Array, 'DerivedKey'>;

export interface KeyRotationInfo {
  readonly lastRotation: string;
  readonly nextRotation: string;
  readonly rotationVersion: number;
  readonly daysUntilRotation: number;
}

// Encrypted Storage Schema
export interface EncryptedStorageSchema {
  readonly USER_PROFILE: EncryptedData<import('./clinical').Assessment[]>;
  readonly ASSESSMENTS: EncryptedData<import('../types').UserProfile>;
  readonly CHECKINS: EncryptedData<import('../types').CheckIn[]>;
  readonly CRISIS_PLAN: EncryptedData<import('../types').CrisisPlan>;
  readonly PARTIAL_SESSIONS: EncryptedData<import('../types').PartialSession[]>;
}

// Type Guards for Encrypted Data
export const isEncryptedData = <T>(data: unknown): data is EncryptedData<T> => {
  return typeof data === 'string' && data.includes('__encrypted__');
};

export const isPlaintextData = <T>(data: unknown): data is PlaintextData<T> => {
  return data !== null && data !== undefined && !isEncryptedData(data);
};

// Encryption Service Interface
export interface SecureEncryptionService {
  // Core Operations
  encrypt<T>(
    data: PlaintextData<T>,
    sensitivity: DataSensitivity,
    metadata?: Partial<EncryptionMetadata>
  ): Promise<EncryptionResult<T>>;
  
  decrypt<T>(
    encryptedResult: EncryptionResult<T>,
    sensitivity: DataSensitivity
  ): Promise<PlaintextData<T>>;
  
  // Validation
  validateDataIntegrity<T>(
    originalData: PlaintextData<T>,
    encryptedResult: EncryptionResult<T>,
    sensitivity: DataSensitivity
  ): Promise<boolean>;
  
  // Key Management
  rotateKeys(): Promise<void>;
  getKeyRotationInfo(): Promise<KeyRotationInfo>;
  
  // Security Status
  getEncryptionStatus(): Promise<EncryptionStatus>;
}

// Encryption Status for Compliance Reporting
export interface EncryptionStatus {
  readonly initialized: boolean;
  readonly keyVersion: number;
  readonly algorithm: string;
  readonly lastRotation: string | null;
  readonly daysUntilRotation: number;
  readonly complianceLevel: 'full' | 'partial' | 'none';
  readonly supportedAlgorithms: readonly string[];
  readonly criticalDataEncrypted: boolean;
}

// Audit Types for Clinical Compliance
export interface EncryptionAuditEvent {
  readonly timestamp: string;
  readonly operation: 'encrypt' | 'decrypt' | 'key_rotation' | 'key_access';
  readonly sensitivity: DataSensitivity;
  readonly dataType: string;
  readonly success: boolean;
  readonly errorCode?: string;
  readonly keyVersion: number;
  readonly platform: string;
  readonly sessionId: string;
}

// Type-Safe Encryption Wrappers
export type EncryptedClinicalData = EncryptedData<import('./clinical').Assessment>;
export type EncryptedPersonalData = EncryptedData<import('../types').CheckIn>;
export type EncryptedCrisisData = EncryptedData<import('../types').CrisisPlan>;

// Conditional Encryption Based on Sensitivity
export type MaybeEncrypted<T, S extends DataSensitivity> = 
  S extends DataSensitivity.SYSTEM 
    ? PlaintextData<T>
    : EncryptedData<T>;

// Storage Key Types - Template Literals for Type Safety
export type StorageKey =
  | `being_encrypted_${'user' | 'assessments' | 'checkins' | 'crisis_plan'}_${string}`
  | `being_system_${'preferences' | 'notifications'}_${string}`;

export type SecureStorageKey = `being_secure_${'master_key' | 'clinical_key' | 'personal_key'}_v${number}`;

// Error Types for Security Operations
export class EncryptionError extends Error {
  constructor(
    message: string,
    public readonly operation: 'encrypt' | 'decrypt' | 'key_generation' | 'key_rotation',
    public readonly sensitivity: DataSensitivity,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class KeyManagementError extends Error {
  constructor(
    message: string,
    public readonly keyType: 'master' | 'derived' | 'clinical',
    public readonly operation: 'create' | 'retrieve' | 'rotate' | 'delete',
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'KeyManagementError';
  }
}

// Security Configuration
export interface SecurityConfig {
  readonly encryption: {
    readonly algorithm: 'aes-256-gcm';
    readonly keySize: 32; // 256 bits
    readonly ivSize: 16;  // 128 bits  
    readonly authTagSize: 16; // 128 bits
  };
  readonly keyRotation: {
    readonly intervalDays: 90;
    readonly warningThresholdDays: 7;
    readonly forceRotationAfterDays: 180;
  };
  readonly compliance: {
    readonly auditLogging: boolean;
    readonly requireBiometric: boolean;
    readonly offlineOnly: boolean;
  };
}

// Type Utils for Security Operations
export type ExtractDataType<T extends EncryptedData<any>> = 
  T extends EncryptedData<infer U> ? U : never;

export type SecureStorageOperation<T> = {
  readonly data: T;
  readonly operation: 'create' | 'read' | 'update' | 'delete';
  readonly timestamp: string;
  readonly encrypted: boolean;
};

// Migration Types for Encryption Upgrades
export interface EncryptionMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly description: string;
  readonly requiredOperations: readonly ('re-encrypt' | 'key-rotation' | 'algorithm-upgrade')[];
  readonly affectedDataTypes: readonly DataSensitivity[];
}

// Performance Types for Encryption Operations
export interface EncryptionPerformanceMetrics {
  readonly operationType: 'encrypt' | 'decrypt';
  readonly dataSize: number;
  readonly duration: number;
  readonly sensitivity: DataSensitivity;
  readonly success: boolean;
}

// Constants for Security Configuration
export const SECURITY_CONSTANTS = {
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm' as const,
    KEY_SIZE: 32 as const,
    IV_SIZE: 16 as const,
    AUTH_TAG_SIZE: 16 as const,
  },
  KEY_ROTATION: {
    INTERVAL_DAYS: 90 as const,
    WARNING_THRESHOLD_DAYS: 7 as const,
    FORCE_ROTATION_DAYS: 180 as const,
  },
  COMPLIANCE: {
    AUDIT_RETENTION_DAYS: 365 as const,
    MAX_FAILED_ATTEMPTS: 3 as const,
    LOCKOUT_DURATION_MINUTES: 15 as const,
  },
  PERFORMANCE: {
    MAX_ENCRYPTION_TIME_MS: 1000 as const,
    MAX_DECRYPTION_TIME_MS: 500 as const,
    BATCH_SIZE_LIMIT: 100 as const,
  },
} as const;

// Factory Functions for Type-Safe Creation
export const createEncryptedData = <T>(encryptedString: string): EncryptedData<T> => {
  return encryptedString as EncryptedData<T>;
};

export const createPlaintextData = <T>(data: T): PlaintextData<T> => {
  return data as PlaintextData<T>;
};

export const createStorageKey = (
  category: 'encrypted' | 'system',
  type: string,
  suffix?: string
): StorageKey => {
  const key = suffix
    ? `being_${category}_${type}_${suffix}`
    : `being_${category}_${type}`;
  return key as StorageKey;
};

// Validation Functions
export const isValidEncryptionResult = <T>(result: unknown): result is EncryptionResult<T> => {
  return (
    typeof result === 'object' &&
    result !== null &&
    'encryptedData' in result &&
    'iv' in result &&
    'timestamp' in result &&
    'metadata' in result
  );
};

export const isValidSecurityConfig = (config: unknown): config is SecurityConfig => {
  return (
    typeof config === 'object' &&
    config !== null &&
    'encryption' in config &&
    'keyRotation' in config &&
    'compliance' in config
  );
};