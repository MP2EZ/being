/**
 * Encrypted Data Flow Types - Zero-Knowledge Cloud Architecture
 *
 * Type-safe definitions for client-side encryption before cloud sync,
 * conflict resolution, and PHQ-9/GAD-7 data integrity validation.
 */

import { z } from 'zod';
import { Assessment } from './clinical';
import { CheckIn, UserProfile, CrisisPlan } from './index';
import { DataSensitivity } from './security';
import { CloudSyncMetadata, EncryptedDataContainer } from './cloud';

/**
 * Encrypted data lifecycle stages
 */
export type EncryptionStage =
  | 'local-only'       // Not encrypted, local storage only
  | 'pre-sync'         // Encrypted, ready for cloud sync
  | 'cloud-stored'     // Encrypted and stored in cloud
  | 'post-sync'        // Downloaded and decrypted from cloud
  | 'conflict'         // Conflict detected, needs resolution
  | 'archived';        // Permanently archived with enhanced encryption

/**
 * Encrypted entity wrapper with full lifecycle tracking
 */
export interface EncryptedEntity<T> {
  readonly id: string;
  readonly entityType: string;
  readonly originalData: T;
  readonly encryptionMetadata: EncryptionMetadata;
  readonly syncMetadata: ExtendedSyncMetadata;
  readonly integrityProof: DataIntegrityProof;
  readonly stage: EncryptionStage;
  readonly auditTrail: readonly EncryptionAuditEntry[];
}

/**
 * Enhanced encryption metadata with versioning
 */
export interface EncryptionMetadata {
  readonly algorithm: 'AES-256-GCM';
  readonly keyVersion: number;
  readonly keyDerivationSalt: string;
  readonly initializationVector: string;
  readonly authenticationTag: string;
  readonly encryptedSize: number;
  readonly compressionApplied: boolean;
  readonly encryptedAt: string;
  readonly deviceId: string;
  readonly encryptionContext: EncryptionContext;
}

/**
 * Encryption context for different data types
 */
export interface EncryptionContext {
  readonly sensitivity: DataSensitivity;
  readonly purpose: 'storage' | 'transmission' | 'backup' | 'emergency';
  readonly retention: 'session' | 'persistent' | 'archival';
  readonly compliance: readonly ('HIPAA' | 'SOC2' | 'GDPR')[];
  readonly additionalAuthentication: boolean;
}

/**
 * Extended sync metadata with cloud-specific information
 */
export interface ExtendedSyncMetadata extends CloudSyncMetadata {
  readonly syncAttempts: number;
  readonly lastSyncError?: string;
  readonly conflictHistory: readonly ConflictHistoryEntry[];
  readonly bandwidthUsed: number; // bytes
  readonly syncPriority: 'low' | 'normal' | 'high' | 'emergency';
  readonly batchId?: string;
  readonly parentSyncId?: string;
  readonly crossDeviceSync: boolean;
}

/**
 * Data integrity proof for verification
 */
export interface DataIntegrityProof {
  readonly checksumAlgorithm: 'SHA-256' | 'SHA-512';
  readonly dataChecksum: string;
  readonly metadataChecksum: string;
  readonly combinedChecksum: string;
  readonly signatureAlgorithm?: 'ECDSA' | 'RSA-PSS';
  readonly digitalSignature?: string;
  readonly witnessHashes: readonly string[]; // Merkle tree leaves
  readonly timestampProof: TimestampProof;
}

/**
 * Cryptographic timestamp proof
 */
export interface TimestampProof {
  readonly timestamp: string;
  readonly nonce: string;
  readonly blockchainHash?: string; // Optional blockchain anchoring
  readonly trustedTimestampAuthority?: string;
  readonly rfcCompliant: boolean; // RFC 3161 compliance
}

/**
 * Encryption audit trail entry
 */
export interface EncryptionAuditEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly operation: 'encrypt' | 'decrypt' | 'key-rotation' | 'sync' | 'conflict-resolution';
  readonly success: boolean;
  readonly duration: number; // milliseconds
  readonly keyVersion: number;
  readonly deviceId: string;
  readonly ipAddress?: string; // Anonymized
  readonly errorCode?: string;
  readonly contextHash: string; // Anonymized context
}

/**
 * Conflict history for resolution tracking
 */
export interface ConflictHistoryEntry {
  readonly conflictId: string;
  readonly detectedAt: string;
  readonly resolvedAt?: string;
  readonly conflictType: 'data' | 'metadata' | 'encryption' | 'timestamp';
  readonly resolutionStrategy: 'local-wins' | 'remote-wins' | 'merge' | 'manual' | 'split';
  readonly confidence: number; // 0-1 for automatic resolutions
  readonly humanVerified: boolean;
  readonly preservedVersions: readonly string[];
}

/**
 * Clinical data encryption specifications
 */
export interface ClinicalDataEncryption {
  readonly assessmentId: string;
  readonly assessmentType: 'phq9' | 'gad7';
  readonly answers: EncryptedAnswers;
  readonly score: EncryptedScore;
  readonly severity: EncryptedSeverity;
  readonly suicidalIdeation?: EncryptedSuicidalIdeation;
  readonly emergencyFlags: EmergencyEncryptionFlags;
  readonly clinicalValidation: ClinicalValidationProof;
}

/**
 * Encrypted answers with individual question protection
 */
export interface EncryptedAnswers {
  readonly answerSet: readonly EncryptedAnswer[];
  readonly sequenceHash: string; // Prevents reordering attacks
  readonly completionProof: string;
  readonly integrityChain: readonly string[]; // Links between answers
}

export interface EncryptedAnswer {
  readonly questionIndex: number;
  readonly encryptedValue: string;
  readonly answerHash: string;
  readonly questionHash: string; // Prevents question substitution
  readonly responseTime?: number; // Milliseconds, for analysis
  readonly confidence: number; // User confidence in answer (0-1)
}

/**
 * Encrypted score with tamper protection
 */
export interface EncryptedScore {
  readonly encryptedValue: string;
  readonly calculationProof: string; // Proof score matches answers
  readonly algorithmVersion: string;
  readonly calculatedAt: string;
  readonly verificationHash: string;
}

/**
 * Encrypted severity assessment
 */
export interface EncryptedSeverity {
  readonly encryptedLevel: string;
  readonly thresholdProof: string; // Proof level matches score
  readonly severityHash: string;
  readonly clinicalReviewRequired: boolean;
}

/**
 * Special encryption for suicidal ideation (PHQ-9 Q9)
 */
export interface EncryptedSuicidalIdeation {
  readonly encryptedResponse: string;
  readonly flagged: boolean; // Cleartext flag for emergency detection
  readonly emergencyKeyUsed: boolean;
  readonly professionalNotified: boolean;
  readonly additionalEncryption: boolean; // Double encryption
  readonly auditAlert: boolean;
}

/**
 * Emergency encryption flags for crisis intervention
 */
export interface EmergencyEncryptionFlags {
  readonly crisisDetected: boolean;
  readonly emergencyContactsEncrypted: boolean;
  readonly hospitalNotificationReady: boolean;
  readonly emergencyDecryptionKey: string; // For authorized professionals
  readonly crisisTimestamp: string;
  readonly interventionRequired: boolean;
}

/**
 * Clinical validation proof for assessment integrity
 */
export interface ClinicalValidationProof {
  readonly validationAlgorithm: string;
  readonly scoringAccuracy: number; // 0-1
  readonly answerConsistency: number; // 0-1
  readonly temporalConsistency: number; // 0-1
  readonly crossValidationHash: string;
  readonly clinicalFlags: readonly string[];
  readonly validatedBy: 'algorithm' | 'human' | 'both';
  readonly validationTimestamp: string;
}

/**
 * Batch encryption operations for performance
 */
export interface BatchEncryptionOperation {
  readonly batchId: string;
  readonly entities: readonly EncryptedEntity<any>[];
  readonly batchMetadata: BatchEncryptionMetadata;
  readonly integrityProof: BatchIntegrityProof;
  readonly performance: BatchPerformanceMetrics;
}

export interface BatchEncryptionMetadata {
  readonly totalEntities: number;
  readonly totalSize: number; // bytes
  readonly encryptionAlgorithm: string;
  readonly batchEncryptionKey: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly priority: 'low' | 'normal' | 'high' | 'emergency';
}

export interface BatchIntegrityProof {
  readonly batchHash: string;
  readonly merkleRoot: string;
  readonly entityHashes: readonly string[];
  readonly batchSignature: string;
  readonly witnessCount: number;
}

export interface BatchPerformanceMetrics {
  readonly encryptionTime: number; // milliseconds
  readonly compressionRatio: number; // 0-1
  readonly throughput: number; // bytes per second
  readonly cpuUsage: number; // 0-1
  readonly memoryUsage: number; // bytes
  readonly concurrency: number; // parallel operations
}

/**
 * Conflict resolution types for encrypted data
 */
export interface EncryptedConflictResolution<T> {
  readonly conflictId: string;
  readonly localEntity: EncryptedEntity<T>;
  readonly remoteEntity: EncryptedEntity<T>;
  readonly conflictAnalysis: ConflictAnalysis;
  readonly resolutionStrategy: ConflictResolutionStrategy<T>;
  readonly resolvedEntity?: EncryptedEntity<T>;
  readonly confidence: number; // 0-1
  readonly requiresHumanReview: boolean;
}

export interface ConflictAnalysis {
  readonly conflictType: 'temporal' | 'data' | 'encryption' | 'metadata';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly affectedFields: readonly string[];
  readonly dataLossRisk: number; // 0-1
  readonly securityImpact: number; // 0-1
  readonly clinicalImpact?: number; // 0-1 for clinical data
  readonly automaticResolutionSafe: boolean;
}

export interface ConflictResolutionStrategy<T> {
  readonly strategy: 'latest-wins' | 'merge' | 'split' | 'manual' | 'clinical-review';
  readonly mergeAlgorithm?: string;
  readonly preserveHistory: boolean;
  readonly backupConflictingVersions: boolean;
  readonly notifyUser: boolean;
  readonly requireClinicalReview: boolean;
  readonly rollbackPossible: boolean;
}

/**
 * Zod schemas for runtime validation
 */
export const EncryptionMetadataSchema = z.object({
  algorithm: z.literal('AES-256-GCM'),
  keyVersion: z.number().int().positive(),
  keyDerivationSalt: z.string().min(64),
  initializationVector: z.string().min(32),
  authenticationTag: z.string().min(32),
  encryptedSize: z.number().int().nonnegative(),
  compressionApplied: z.boolean(),
  encryptedAt: z.string().datetime(),
  deviceId: z.string().min(1),
  encryptionContext: z.object({
    sensitivity: z.nativeEnum(DataSensitivity),
    purpose: z.enum(['storage', 'transmission', 'backup', 'emergency']),
    retention: z.enum(['session', 'persistent', 'archival']),
    compliance: z.array(z.enum(['HIPAA', 'SOC2', 'GDPR'])),
    additionalAuthentication: z.boolean()
  })
}).readonly();

export const DataIntegrityProofSchema = z.object({
  checksumAlgorithm: z.enum(['SHA-256', 'SHA-512']),
  dataChecksum: z.string().min(64),
  metadataChecksum: z.string().min(64),
  combinedChecksum: z.string().min(64),
  signatureAlgorithm: z.enum(['ECDSA', 'RSA-PSS']).optional(),
  digitalSignature: z.string().optional(),
  witnessHashes: z.array(z.string()),
  timestampProof: z.object({
    timestamp: z.string().datetime(),
    nonce: z.string().min(32),
    blockchainHash: z.string().optional(),
    trustedTimestampAuthority: z.string().optional(),
    rfcCompliant: z.boolean()
  })
}).readonly();

export const ClinicalDataEncryptionSchema = z.object({
  assessmentId: z.string().uuid(),
  assessmentType: z.enum(['phq9', 'gad7']),
  answers: z.object({
    answerSet: z.array(z.object({
      questionIndex: z.number().int().min(0),
      encryptedValue: z.string().min(1),
      answerHash: z.string().min(64),
      questionHash: z.string().min(64),
      responseTime: z.number().int().positive().optional(),
      confidence: z.number().min(0).max(1)
    })),
    sequenceHash: z.string().min(64),
    completionProof: z.string().min(64),
    integrityChain: z.array(z.string())
  }),
  score: z.object({
    encryptedValue: z.string().min(1),
    calculationProof: z.string().min(64),
    algorithmVersion: z.string(),
    calculatedAt: z.string().datetime(),
    verificationHash: z.string().min(64)
  }),
  severity: z.object({
    encryptedLevel: z.string().min(1),
    thresholdProof: z.string().min(64),
    severityHash: z.string().min(64),
    clinicalReviewRequired: z.boolean()
  }),
  suicidalIdeation: z.object({
    encryptedResponse: z.string().min(1),
    flagged: z.boolean(),
    emergencyKeyUsed: z.boolean(),
    professionalNotified: z.boolean(),
    additionalEncryption: z.boolean(),
    auditAlert: z.boolean()
  }).optional(),
  emergencyFlags: z.object({
    crisisDetected: z.boolean(),
    emergencyContactsEncrypted: z.boolean(),
    hospitalNotificationReady: z.boolean(),
    emergencyDecryptionKey: z.string(),
    crisisTimestamp: z.string().datetime(),
    interventionRequired: z.boolean()
  }),
  clinicalValidation: z.object({
    validationAlgorithm: z.string(),
    scoringAccuracy: z.number().min(0).max(1),
    answerConsistency: z.number().min(0).max(1),
    temporalConsistency: z.number().min(0).max(1),
    crossValidationHash: z.string().min(64),
    clinicalFlags: z.array(z.string()),
    validatedBy: z.enum(['algorithm', 'human', 'both']),
    validationTimestamp: z.string().datetime()
  })
}).readonly();

/**
 * Type guards for encrypted data validation
 */
export const isEncryptedEntity = <T>(entity: unknown): entity is EncryptedEntity<T> => {
  return (
    typeof entity === 'object' &&
    entity !== null &&
    'id' in entity &&
    'entityType' in entity &&
    'originalData' in entity &&
    'encryptionMetadata' in entity &&
    'syncMetadata' in entity &&
    'integrityProof' in entity &&
    'stage' in entity &&
    'auditTrail' in entity
  );
};

export const isValidEncryptionMetadata = (metadata: unknown): metadata is EncryptionMetadata => {
  try {
    EncryptionMetadataSchema.parse(metadata);
    return true;
  } catch {
    return false;
  }
};

export const isValidDataIntegrityProof = (proof: unknown): proof is DataIntegrityProof => {
  try {
    DataIntegrityProofSchema.parse(proof);
    return true;
  } catch {
    return false;
  }
};

export const isClinicalDataEncryption = (data: unknown): data is ClinicalDataEncryption => {
  try {
    ClinicalDataEncryptionSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

/**
 * Utility types for encrypted entity operations
 */
export type EncryptedCheckIn = EncryptedEntity<CheckIn>;
export type EncryptedAssessment = EncryptedEntity<Assessment>;
export type EncryptedUserProfile = EncryptedEntity<UserProfile>;
export type EncryptedCrisisPlan = EncryptedEntity<CrisisPlan>;

export type AnyEncryptedEntity =
  | EncryptedCheckIn
  | EncryptedAssessment
  | EncryptedUserProfile
  | EncryptedCrisisPlan;

/**
 * Constants for encrypted data flow
 */
export const ENCRYPTED_DATA_CONSTANTS = {
  // Encryption parameters
  ENCRYPTION: {
    ALGORITHM: 'AES-256-GCM' as const,
    KEY_SIZE: 256,
    IV_SIZE: 96,
    TAG_SIZE: 128,
    SALT_SIZE: 256,
    NONCE_SIZE: 256
  },

  // Integrity verification
  INTEGRITY: {
    CHECKSUM_ALGORITHM: 'SHA-256' as const,
    SIGNATURE_ALGORITHM: 'ECDSA' as const,
    MERKLE_TREE_DEPTH: 32,
    WITNESS_COUNT: 3
  },

  // Clinical data protection
  CLINICAL: {
    DOUBLE_ENCRYPTION_THRESHOLD: 15, // PHQ-9/GAD-7 scores requiring extra protection
    SUICIDAL_IDEATION_KEY_ROTATION_HOURS: 24,
    EMERGENCY_DECRYPTION_TIMEOUT_MINUTES: 15,
    CLINICAL_VALIDATION_CONFIDENCE_THRESHOLD: 0.95
  },

  // Performance and limits
  PERFORMANCE: {
    MAX_BATCH_SIZE: 100,
    MAX_ENTITY_SIZE_MB: 10,
    ENCRYPTION_TIMEOUT_MS: 30000,
    COMPRESSION_THRESHOLD_KB: 1,
    PARALLEL_ENCRYPTION_LIMIT: 4
  },

  // Audit and compliance
  AUDIT: {
    MAX_AUDIT_ENTRIES: 10000,
    AUDIT_RETENTION_DAYS: 2555, // 7 years
    CRITICAL_OPERATION_ALERT_THRESHOLD: 5,
    ANOMALY_DETECTION_WINDOW_HOURS: 24
  }
} as const;