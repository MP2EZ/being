/**
 * Comprehensive Cross-Device Sync TypeScript Definitions
 *
 * Type-safe interfaces ensuring crisis safety, compliance validation,
 * and therapeutic data integrity for the cross-device sync API.
 *
 * Features:
 * - Crisis safety type guarantees with emergency response constraints
 * - Zero-knowledge encryption types with integrity validation
 * - Multi-tier sync types with performance monitoring
 * - Compliance validation with audit trail requirements
 * - Therapeutic data integrity with clinical accuracy validation
 */

import { z } from 'zod';

// ===========================================
// CORE TYPE SAFETY FOUNDATIONS
// ===========================================

/**
 * Crisis severity levels with strict type safety
 */
export enum CrisisSeverityLevel {
  NONE = 0,
  LOW = 1,
  MODERATE = 2,
  HIGH = 3,
  CRITICAL = 4,
  EMERGENCY = 5
}

/**
 * Data sensitivity classification for encryption requirements
 */
export enum DataSensitivityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  PERSONAL = 'personal',
  THERAPEUTIC = 'therapeutic',
  CLINICAL = 'clinical',
  EMERGENCY = 'emergency'
}

/**
 * Sync operation priorities with crisis preemption
 */
export enum SyncPriorityLevel {
  BACKGROUND = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
  CRISIS = 5,
  EMERGENCY = 6
}

/**
 * Performance SLA requirements by data type
 */
export interface PerformanceSLA {
  readonly maxLatencyMs: number;
  readonly maxRetryAttempts: number;
  readonly timeoutMs: number;
  readonly crisisResponseMs: number; // Must be ≤ 200ms for crisis data
}

// ===========================================
// CRISIS SAFETY TYPE SYSTEM
// ===========================================

/**
 * Crisis-safe data interface with mandatory validation
 */
export interface CrisisSafeData<T = unknown> {
  readonly data: T;
  readonly crisisLevel: CrisisSeverityLevel;
  readonly emergencyAccess: EmergencyAccessConstraints;
  readonly safetyValidation: CrisisSafetyValidation;
  readonly responseTimeRequirement: number; // milliseconds
}

/**
 * Emergency access constraints with security validation
 */
export interface EmergencyAccessConstraints {
  readonly allowEmergencyDecryption: boolean;
  readonly emergencyContactsRequired: boolean;
  readonly professionalReferralRequired: boolean;
  readonly bypassNormalAuth: boolean;
  readonly auditEmergencyAccess: boolean;
  readonly emergencyTimeout: number; // milliseconds
}

/**
 * Crisis safety validation with comprehensive checks
 */
export interface CrisisSafetyValidation {
  readonly validatedAt: string;
  readonly validatedBy: 'system' | 'clinician' | 'emergency_protocol';
  readonly crisisDetectionActive: boolean;
  readonly emergencyProtocolsEnabled: boolean;
  readonly responseTimeValidated: boolean;
  readonly complianceChecked: boolean;
  readonly integrityVerified: boolean;
}

/**
 * Crisis priority queue with preemption guarantees
 */
export interface CrisisPriorityQueue<T> {
  readonly id: string;
  readonly priority: SyncPriorityLevel;
  readonly item: CrisisSafeData<T>;
  readonly enqueuedAt: string;
  readonly estimatedProcessingTime: number;
  readonly preemptionAllowed: boolean;
  readonly maxWaitTime: number;
}

/**
 * Emergency contact validation with type safety
 */
export interface EmergencyContact {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly relationship: 'therapist' | 'family' | 'friend' | 'emergency_service';
  readonly priority: number;
  readonly validated: boolean;
  readonly encryptedDetails: string;
}

/**
 * Safety plan with completeness checking
 */
export interface SafetyPlan {
  readonly id: string;
  readonly userId: string;
  readonly warningSigns: readonly string[];
  readonly copingStrategies: readonly string[];
  readonly emergencyContacts: readonly EmergencyContact[];
  readonly safetyMeasures: readonly string[];
  readonly isComplete: boolean;
  readonly lastValidated: string;
  readonly clinicallyApproved: boolean;
}

// ===========================================
// ZERO-KNOWLEDGE ENCRYPTION TYPES
// ===========================================

/**
 * Encrypted data wrapper with comprehensive metadata
 */
export interface EncryptedDataWrapper<T> {
  readonly encryptedPayload: string;
  readonly encryptionMetadata: EncryptionMetadata;
  readonly integrityProof: DataIntegrityProof;
  readonly context: EncryptionContext;
  readonly originalType: string; // For type reconstruction
}

/**
 * Encryption metadata with versioning and rotation
 */
export interface EncryptionMetadata {
  readonly algorithm: 'AES-256-GCM';
  readonly keyVersion: number;
  readonly iv: string;
  readonly salt: string;
  readonly encryptedAt: string;
  readonly keyRotationDue: string;
  readonly biometricBinding: boolean;
  readonly deviceBinding: boolean;
}

/**
 * Data integrity proof with validation requirements
 */
export interface DataIntegrityProof {
  readonly hash: string;
  readonly hashAlgorithm: 'SHA-256' | 'SHA-3-256';
  readonly signature: string;
  readonly signatureAlgorithm: 'ECDSA-P256';
  readonly merkleRoot?: string; // For batch operations
  readonly timestampProof: string;
  readonly validationRequired: boolean;
}

/**
 * Encryption context for different data types
 */
export interface EncryptionContext {
  readonly dataType: 'crisis' | 'therapeutic' | 'general' | 'assessment';
  readonly sensitivityLevel: DataSensitivityLevel;
  readonly encryptionStrength: 'standard' | 'enhanced' | 'maximum';
  readonly auditRequired: boolean;
  readonly emergencyDecryptable: boolean;
  readonly retentionPeriod: number; // days
}

/**
 * Device-specific key with trust validation
 */
export interface DeviceKey {
  readonly deviceId: string;
  readonly publicKey: string;
  readonly keyType: 'ECDH-P256' | 'RSA-4096';
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly trustLevel: DeviceTrustLevel;
  readonly biometricBound: boolean;
  readonly attestationData?: string;
}

/**
 * Device trust levels with validation requirements
 */
export enum DeviceTrustLevel {
  UNTRUSTED = 0,
  BASIC = 1,
  VERIFIED = 2,
  TRUSTED = 3,
  HIGHLY_TRUSTED = 4
}

/**
 * Emergency decryption with audit requirements
 */
export interface EmergencyDecryption<T> {
  readonly originalData: T;
  readonly emergencyReason: string;
  readonly authorizedBy: string;
  readonly decryptedAt: string;
  readonly auditTrail: EmergencyAuditEntry[];
  readonly complianceValidation: ComplianceValidation;
  readonly timeConstraints: EmergencyTimeConstraints;
}

/**
 * Emergency time constraints for crisis response
 */
export interface EmergencyTimeConstraints {
  readonly maxDecryptionTime: number; // milliseconds
  readonly responseWindowStart: string;
  readonly responseWindowEnd: string;
  readonly escalationRequired: boolean;
  readonly automaticExpiry: string;
}

// ===========================================
// MULTI-TIER SYNC TYPES
// ===========================================

/**
 * Sync operation with comprehensive metadata
 */
export interface SyncOperation<T> {
  readonly id: string;
  readonly type: SyncOperationType;
  readonly priority: SyncPriorityLevel;
  readonly payload: CrisisSafeData<T>;
  readonly metadata: SyncOperationMetadata;
  readonly constraints: SyncConstraints;
  readonly validation: SyncValidation;
}

/**
 * Sync operation types with specific handling
 */
export enum SyncOperationType {
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  MERGE = 'merge',
  DELETE = 'delete',
  CONFLICT_RESOLVE = 'conflict_resolve',
  EMERGENCY_SYNC = 'emergency_sync',
  BULK_SYNC = 'bulk_sync'
}

/**
 * Sync operation metadata with performance tracking
 */
export interface SyncOperationMetadata {
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly version: number;
  readonly timestamp: string;
  readonly checksumBeforeSync: string;
  readonly expectedSyncTime: number;
  readonly dependencies: readonly string[];
}

/**
 * Entity types with validation requirements
 */
export enum EntityType {
  USER_PROFILE = 'user_profile',
  CHECK_IN = 'check_in',
  ASSESSMENT = 'assessment',
  CRISIS_PLAN = 'crisis_plan',
  THERAPY_SESSION = 'therapy_session',
  EMERGENCY_DATA = 'emergency_data'
}

/**
 * Sync constraints with performance and security limits
 */
export interface SyncConstraints {
  readonly maxSizeBytes: number;
  readonly maxDurationMs: number;
  readonly requiresOnline: boolean;
  readonly requiresValidation: boolean;
  readonly allowsPartialSync: boolean;
  readonly networkRequirements: NetworkRequirements;
  readonly securityRequirements: SecurityRequirements;
}

/**
 * Network requirements for sync operations
 */
export interface NetworkRequirements {
  readonly minBandwidthKbps: number;
  readonly maxLatencyMs: number;
  readonly requiresSecureConnection: boolean;
  readonly allowsCellular: boolean;
  readonly requiresWifi: boolean;
  readonly compressionAllowed: boolean;
}

/**
 * Security requirements for sync operations
 */
export interface SecurityRequirements {
  readonly encryptionRequired: boolean;
  readonly integrityCheckRequired: boolean;
  readonly auditTrailRequired: boolean;
  readonly biometricVerificationRequired: boolean;
  readonly emergencyBypassAllowed: boolean;
  readonly complianceValidationRequired: boolean;
}

/**
 * Sync validation with comprehensive checks
 */
export interface SyncValidation {
  readonly preValidation: ValidationResult;
  readonly postValidation: ValidationResult;
  readonly integrityCheck: IntegrityCheckResult;
  readonly complianceCheck: ComplianceCheckResult;
  readonly performanceValidation: PerformanceValidationResult;
}

/**
 * Validation result with detailed feedback
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
  readonly validatedAt: string;
  readonly validatedBy: string;
}

/**
 * Validation error with severity and action
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly field?: string;
  readonly suggestedAction: string;
  readonly blocking: boolean;
}

/**
 * Validation warning with recommendations
 */
export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly recommendation: string;
  readonly impact: 'performance' | 'security' | 'compliance' | 'usability';
}

// ===========================================
// WEBSOCKET REAL-TIME SYNC TYPES
// ===========================================

/**
 * WebSocket sync event with type safety
 */
export interface WebSocketSyncEvent<T = unknown> {
  readonly type: WebSocketEventType;
  readonly id: string;
  readonly timestamp: string;
  readonly data: T;
  readonly priority: SyncPriorityLevel;
  readonly requiresAck: boolean;
  readonly expiresAt?: string;
}

/**
 * WebSocket event types with specific handling
 */
export enum WebSocketEventType {
  SYNC_REQUIRED = 'sync_required',
  CONFLICT_DETECTED = 'conflict_detected',
  EMERGENCY_SYNC = 'emergency_sync',
  DEVICE_CONNECTED = 'device_connected',
  DEVICE_DISCONNECTED = 'device_disconnected',
  VALIDATION_FAILED = 'validation_failed',
  COMPLIANCE_ALERT = 'compliance_alert'
}

/**
 * Real-time sync client with event handling
 */
export interface RealTimeSyncClient {
  readonly connect: (deviceId: string) => Promise<SyncClientResult<void>>;
  readonly disconnect: () => Promise<void>;
  readonly subscribe: <T>(
    eventType: WebSocketEventType,
    handler: WebSocketEventHandler<T>
  ) => Promise<SyncClientResult<string>>;
  readonly unsubscribe: (subscriptionId: string) => Promise<void>;
  readonly send: <T>(event: WebSocketSyncEvent<T>) => Promise<SyncClientResult<void>>;
  readonly getConnectionStatus: () => ConnectionStatus;
}

/**
 * WebSocket event handler with error handling
 */
export type WebSocketEventHandler<T> = (
  event: WebSocketSyncEvent<T>
) => Promise<WebSocketEventResponse>;

/**
 * WebSocket event response
 */
export interface WebSocketEventResponse {
  readonly handled: boolean;
  readonly acknowledged: boolean;
  readonly error?: string;
  readonly data?: unknown;
}

/**
 * Connection status with monitoring
 */
export interface ConnectionStatus {
  readonly connected: boolean;
  readonly lastConnected?: string;
  readonly lastDisconnected?: string;
  readonly reconnectAttempts: number;
  readonly latency?: number;
  readonly quality: 'poor' | 'fair' | 'good' | 'excellent';
}

// ===========================================
// REST API TYPES
// ===========================================

/**
 * REST API client with full type safety
 */
export interface RestSyncClient {
  readonly syncBatch: <T>(
    operations: readonly SyncOperation<T>[]
  ) => Promise<SyncClientResult<BatchSyncResult<T>>>;

  readonly syncSingle: <T>(
    operation: SyncOperation<T>
  ) => Promise<SyncClientResult<SingleSyncResult<T>>>;

  readonly resolveConflict: <T>(
    conflictId: string,
    resolution: ConflictResolution<T>
  ) => Promise<SyncClientResult<ConflictResolutionResult<T>>>;

  readonly getStatus: () => Promise<SyncClientResult<SyncStatus>>;

  readonly validateIntegrity: (
    entityIds: readonly string[]
  ) => Promise<SyncClientResult<IntegrityValidationResult>>;
}

/**
 * Sync client result with comprehensive error handling
 */
export interface SyncClientResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: SyncError;
  readonly metadata: SyncResultMetadata;
  readonly performance: SyncPerformanceMetrics;
}

/**
 * Sync result metadata
 */
export interface SyncResultMetadata {
  readonly requestId: string;
  readonly timestamp: string;
  readonly duration: number;
  readonly retryAttempt: number;
  readonly serverVersion: string;
  readonly clientVersion: string;
}

/**
 * Batch sync result with detailed reporting
 */
export interface BatchSyncResult<T> {
  readonly successful: readonly SingleSyncResult<T>[];
  readonly failed: readonly FailedSyncOperation<T>[];
  readonly conflicts: readonly SyncConflict<T>[];
  readonly summary: BatchSyncSummary;
  readonly nextSyncToken?: string;
}

/**
 * Single sync result
 */
export interface SingleSyncResult<T> {
  readonly operation: SyncOperation<T>;
  readonly result: T;
  readonly checksum: string;
  readonly version: number;
  readonly syncedAt: string;
  readonly conflicts: readonly SyncConflict<T>[];
}

/**
 * Failed sync operation with retry information
 */
export interface FailedSyncOperation<T> {
  readonly operation: SyncOperation<T>;
  readonly error: SyncError;
  readonly retryable: boolean;
  readonly nextRetryAt?: string;
  readonly maxRetries: number;
  readonly currentRetries: number;
}

/**
 * Batch sync summary
 */
export interface BatchSyncSummary {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly conflicts: number;
  readonly duration: number;
  readonly dataTransferred: number; // bytes
  readonly compressionRatio?: number;
}

// ===========================================
// CONFLICT RESOLUTION TYPES
// ===========================================

/**
 * Sync conflict with comprehensive data
 */
export interface SyncConflict<T> {
  readonly id: string;
  readonly entityType: EntityType;
  readonly entityId: string;
  readonly conflictType: ConflictType;
  readonly localData: CrisisSafeData<T>;
  readonly remoteData: CrisisSafeData<T>;
  readonly metadata: ConflictMetadata;
  readonly resolutionOptions: readonly ConflictResolutionOption[];
  readonly autoResolvable: boolean;
  readonly clinicalRelevant: boolean;
}

/**
 * Conflict types with specific handling
 */
export enum ConflictType {
  VERSION_MISMATCH = 'version_mismatch',
  CONCURRENT_MODIFICATION = 'concurrent_modification',
  DATA_CORRUPTION = 'data_corruption',
  SCHEMA_INCOMPATIBILITY = 'schema_incompatibility',
  MERGE_CONFLICT = 'merge_conflict',
  DEPENDENCY_CONFLICT = 'dependency_conflict'
}

/**
 * Conflict metadata
 */
export interface ConflictMetadata {
  readonly detectedAt: string;
  readonly lastModifiedLocal: string;
  readonly lastModifiedRemote: string;
  readonly conflictSeverity: 'low' | 'medium' | 'high' | 'critical';
  readonly affectedFields: readonly string[];
  readonly userImpact: 'none' | 'minimal' | 'moderate' | 'significant';
}

/**
 * Conflict resolution option
 */
export interface ConflictResolutionOption {
  readonly strategy: ConflictResolutionStrategy;
  readonly description: string;
  readonly impact: string;
  readonly recommended: boolean;
  readonly preservesData: boolean;
  readonly requiresUserInput: boolean;
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  USE_LOCAL = 'use_local',
  USE_REMOTE = 'use_remote',
  MERGE_AUTOMATIC = 'merge_automatic',
  MERGE_MANUAL = 'merge_manual',
  CREATE_BRANCH = 'create_branch',
  DEFER_TO_USER = 'defer_to_user'
}

/**
 * Conflict resolution with validation
 */
export interface ConflictResolution<T> {
  readonly conflictId: string;
  readonly strategy: ConflictResolutionStrategy;
  readonly resolvedData?: CrisisSafeData<T>;
  readonly mergeInstructions?: MergeInstructions;
  readonly userConfirmation: boolean;
  readonly preserveHistory: boolean;
  readonly auditRequired: boolean;
}

/**
 * Merge instructions for complex conflicts
 */
export interface MergeInstructions {
  readonly fieldResolutions: Record<string, 'local' | 'remote' | 'merge'>;
  readonly arrayMergeStrategy: 'union' | 'intersection' | 'local' | 'remote';
  readonly customMergeRules: readonly CustomMergeRule[];
  readonly validationRules: readonly string[];
}

/**
 * Custom merge rule for specific fields
 */
export interface CustomMergeRule {
  readonly field: string;
  readonly rule: string;
  readonly priority: number;
  readonly validation: string;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult<T> {
  readonly conflictId: string;
  readonly resolvedData: CrisisSafeData<T>;
  readonly strategy: ConflictResolutionStrategy;
  readonly resolvedAt: string;
  readonly resolvedBy: string;
  readonly validation: ValidationResult;
  readonly auditEntry: AuditEntry;
}

// ===========================================
// OFFLINE QUEUE TYPES
// ===========================================

/**
 * Offline queue with persistence guarantees
 */
export interface OfflineQueue<T> {
  readonly id: string;
  readonly operations: readonly QueuedOperation<T>[];
  readonly maxSize: number;
  readonly currentSize: number;
  readonly priority: SyncPriorityLevel;
  readonly persistenceGuarantee: PersistenceGuarantee;
  readonly retryPolicy: RetryPolicy;
}

/**
 * Queued operation with retry tracking
 */
export interface QueuedOperation<T> {
  readonly id: string;
  readonly operation: SyncOperation<T>;
  readonly queuedAt: string;
  readonly attempts: number;
  readonly lastAttempt?: string;
  readonly nextAttempt?: string;
  readonly maxRetries: number;
  readonly backoffMultiplier: number;
  readonly priority: SyncPriorityLevel;
}

/**
 * Persistence guarantee levels
 */
export enum PersistenceGuarantee {
  NONE = 'none',
  MEMORY = 'memory',
  DISK = 'disk',
  ENCRYPTED_DISK = 'encrypted_disk',
  REPLICATED = 'replicated'
}

/**
 * Retry policy with backoff strategies
 */
export interface RetryPolicy {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffStrategy: 'linear' | 'exponential' | 'fibonacci';
  readonly jitterMs: number;
  readonly retryableErrors: readonly string[];
  readonly giveUpErrors: readonly string[];
}

// ===========================================
// PERFORMANCE MONITORING TYPES
// ===========================================

/**
 * Performance metrics with SLA validation
 */
export interface SyncPerformanceMetrics {
  readonly latency: LatencyMetrics;
  readonly throughput: ThroughputMetrics;
  readonly reliability: ReliabilityMetrics;
  readonly resource: ResourceMetrics;
  readonly compliance: ComplianceMetrics;
}

/**
 * Latency metrics with percentiles
 */
export interface LatencyMetrics {
  readonly p50: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly p999: number;
  readonly max: number;
  readonly violationCount: number;
  readonly slaTarget: number;
}

/**
 * Throughput metrics
 */
export interface ThroughputMetrics {
  readonly operationsPerSecond: number;
  readonly bytesPerSecond: number;
  readonly itemsPerSecond: number;
  readonly successRate: number;
  readonly errorRate: number;
  readonly conflictRate: number;
}

/**
 * Reliability metrics
 */
export interface ReliabilityMetrics {
  readonly uptime: number; // percentage
  readonly mtbf: number; // mean time between failures
  readonly mttr: number; // mean time to recovery
  readonly errorBudget: number;
  readonly errorBudgetConsumed: number;
  readonly availabilityTarget: number;
}

/**
 * Resource utilization metrics
 */
export interface ResourceMetrics {
  readonly cpuUsage: number; // percentage
  readonly memoryUsage: number; // bytes
  readonly networkUsage: number; // bytes
  readonly diskUsage: number; // bytes
  readonly batteryImpact: number; // percentage
  readonly efficiency: number; // operations per resource unit
}

/**
 * Compliance metrics with audit trail
 */
export interface ComplianceMetrics {
  readonly auditCoverage: number; // percentage
  readonly encryptionCompliance: number; // percentage
  readonly retentionCompliance: number; // percentage
  readonly accessControlCompliance: number; // percentage
  readonly violationCount: number;
  readonly lastAudit: string;
}

/**
 * Network adaptation with quality monitoring
 */
export interface NetworkAdaptation {
  readonly currentQuality: NetworkQuality;
  readonly adaptiveStrategy: AdaptiveStrategy;
  readonly qualityIndicators: QualityIndicators;
  readonly optimizations: readonly NetworkOptimization[];
  readonly recommendations: readonly string[];
}

/**
 * Network quality levels
 */
export enum NetworkQuality {
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  EXCELLENT = 'excellent'
}

/**
 * Adaptive strategy for network conditions
 */
export interface AdaptiveStrategy {
  readonly compressionLevel: number;
  readonly batchSize: number;
  readonly retryInterval: number;
  readonly timeoutMultiplier: number;
  readonly qualityThreshold: NetworkQuality;
}

/**
 * Quality indicators for network monitoring
 */
export interface QualityIndicators {
  readonly latency: number;
  readonly bandwidth: number;
  readonly packetLoss: number;
  readonly jitter: number;
  readonly stability: number;
}

/**
 * Network optimization applied
 */
export interface NetworkOptimization {
  readonly type: 'compression' | 'batching' | 'caching' | 'prioritization';
  readonly description: string;
  readonly impact: string;
  readonly enabled: boolean;
  readonly effectiveness: number; // percentage
}

// ===========================================
// BATTERY AND RESOURCE OPTIMIZATION
// ===========================================

/**
 * Battery optimization with power awareness
 */
export interface BatteryOptimization {
  readonly currentLevel: number; // percentage
  readonly powerState: PowerState;
  readonly optimizationLevel: OptimizationLevel;
  readonly restrictions: readonly PowerRestriction[];
  readonly adaptations: readonly PowerAdaptation[];
}

/**
 * Power states with different handling
 */
export enum PowerState {
  CRITICAL = 'critical',     // < 5%
  LOW = 'low',              // 5-20%
  MODERATE = 'moderate',    // 20-50%
  GOOD = 'good',           // 50-80%
  EXCELLENT = 'excellent'   // > 80%
}

/**
 * Optimization levels for battery conservation
 */
export enum OptimizationLevel {
  DISABLED = 'disabled',
  MINIMAL = 'minimal',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
  MAXIMUM = 'maximum'
}

/**
 * Power restrictions based on battery level
 */
export interface PowerRestriction {
  readonly type: 'sync_frequency' | 'batch_size' | 'background_sync' | 'encryption_level';
  readonly restriction: string;
  readonly threshold: PowerState;
  readonly impact: string;
}

/**
 * Power adaptations applied
 */
export interface PowerAdaptation {
  readonly type: string;
  readonly description: string;
  readonly energySavings: number; // percentage
  readonly performanceImpact: number; // percentage
  readonly enabled: boolean;
}

// ===========================================
// ALERT AND NOTIFICATION TYPES
// ===========================================

/**
 * Performance alert with escalation
 */
export interface PerformanceAlert {
  readonly id: string;
  readonly type: AlertType;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly threshold: number;
  readonly currentValue: number;
  readonly timestamp: string;
  readonly acknowledged: boolean;
  readonly escalated: boolean;
}

/**
 * Alert types for different scenarios
 */
export enum AlertType {
  LATENCY_VIOLATION = 'latency_violation',
  ERROR_RATE_HIGH = 'error_rate_high',
  CONFLICT_RATE_HIGH = 'conflict_rate_high',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  SECURITY_VIOLATION = 'security_violation',
  COMPLIANCE_VIOLATION = 'compliance_violation'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Threshold violation with context
 */
export interface ThresholdViolation {
  readonly metric: string;
  readonly threshold: number;
  readonly actualValue: number;
  readonly violationType: 'exceeded' | 'below' | 'outside_range';
  readonly duration: number; // milliseconds
  readonly impact: string;
  readonly suggestedAction: string;
}

// ===========================================
// SECURITY AND COMPLIANCE VALIDATION
// ===========================================

/**
 * Security validation with comprehensive checks
 */
export interface SecurityValidation {
  readonly validationId: string;
  readonly timestamp: string;
  readonly checks: readonly SecurityCheck[];
  readonly overallStatus: 'pass' | 'warn' | 'fail';
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly recommendations: readonly string[];
}

/**
 * Individual security check
 */
export interface SecurityCheck {
  readonly name: string;
  readonly category: 'encryption' | 'access_control' | 'audit' | 'integrity';
  readonly status: 'pass' | 'warn' | 'fail';
  readonly details: string;
  readonly evidence?: string;
  readonly requirement: string;
}

/**
 * Compliance validation with regulatory mapping
 */
export interface ComplianceValidation {
  readonly framework: 'HIPAA' | 'GDPR' | 'SOC2' | 'ISO27001';
  readonly validationId: string;
  readonly timestamp: string;
  readonly controls: readonly ComplianceControl[];
  readonly overallCompliance: number; // percentage
  readonly violations: readonly ComplianceViolation[];
  readonly attestation: ComplianceAttestation;
}

/**
 * Compliance control with evidence
 */
export interface ComplianceControl {
  readonly controlId: string;
  readonly description: string;
  readonly requirement: string;
  readonly implementation: string;
  readonly status: 'implemented' | 'partial' | 'not_implemented';
  readonly evidence: readonly string[];
  readonly lastTested: string;
}

/**
 * Compliance violation with remediation
 */
export interface ComplianceViolation {
  readonly violationId: string;
  readonly controlId: string;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly remediation: string;
  readonly deadline?: string;
  readonly responsible: string;
}

/**
 * Compliance attestation
 */
export interface ComplianceAttestation {
  readonly attestedBy: string;
  readonly attestedAt: string;
  readonly period: {
    readonly start: string;
    readonly end: string;
  };
  readonly scope: string;
  readonly limitations: readonly string[];
  readonly certification?: string;
}

// ===========================================
// AUDIT AND LOGGING TYPES
// ===========================================

/**
 * Comprehensive audit entry
 */
export interface AuditEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly userId?: string;
  readonly deviceId: string;
  readonly operation: string;
  readonly entityType?: EntityType;
  readonly entityId?: string;
  readonly before?: unknown;
  readonly after?: unknown;
  readonly outcome: 'success' | 'failure' | 'partial';
  readonly errorCode?: string;
  readonly duration: number;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly sessionId?: string;
  readonly complianceMetadata: ComplianceMetadata;
}

/**
 * Emergency audit entry for crisis situations
 */
export interface EmergencyAuditEntry extends AuditEntry {
  readonly emergencyType: 'crisis_detection' | 'emergency_access' | 'safety_override';
  readonly emergencyLevel: CrisisSeverityLevel;
  readonly emergencyContext: string;
  readonly responseTime: number;
  readonly emergencyContacts: readonly string[];
  readonly professionalNotified: boolean;
}

/**
 * Compliance metadata for audit entries
 */
export interface ComplianceMetadata {
  readonly retentionPeriod: number; // days
  readonly classification: 'public' | 'internal' | 'confidential' | 'restricted';
  readonly regulatoryRequirement: readonly string[];
  readonly dataSubjects: readonly string[];
  readonly legalBasis?: string;
  readonly consentRequired: boolean;
}

// ===========================================
// ERROR HANDLING TYPES
// ===========================================

/**
 * Comprehensive sync error with recovery information
 */
export interface SyncError {
  readonly code: string;
  readonly message: string;
  readonly category: SyncErrorCategory;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly retryable: boolean;
  readonly retryAfter?: number; // milliseconds
  readonly recoveryAction?: string;
  readonly context: ErrorContext;
  readonly stackTrace?: string;
  readonly timestamp: string;
}

/**
 * Sync error categories
 */
export enum SyncErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  ENCRYPTION = 'encryption',
  STORAGE = 'storage',
  CONFLICT = 'conflict',
  PERFORMANCE = 'performance',
  COMPLIANCE = 'compliance',
  SYSTEM = 'system'
}

/**
 * Error context for debugging
 */
export interface ErrorContext {
  readonly operationId?: string;
  readonly entityType?: EntityType;
  readonly entityId?: string;
  readonly userId?: string;
  readonly deviceId: string;
  readonly networkStatus: string;
  readonly batteryLevel?: number;
  readonly memoryUsage?: number;
  readonly previousErrors: readonly string[];
}

// ===========================================
// INTEGRATION AND SERVICE TYPES
// ===========================================

/**
 * Service integration with dependency injection
 */
export interface ServiceIntegration {
  readonly encryptionService: EncryptionServiceIntegration;
  readonly storageService: StorageServiceIntegration;
  readonly networkService: NetworkServiceIntegration;
  readonly auditService: AuditServiceIntegration;
  readonly monitoringService: MonitoringServiceIntegration;
}

/**
 * Encryption service integration
 */
export interface EncryptionServiceIntegration {
  readonly encrypt: <T>(
    data: T,
    context: EncryptionContext
  ) => Promise<EncryptedDataWrapper<T>>;

  readonly decrypt: <T>(
    encrypted: EncryptedDataWrapper<T>
  ) => Promise<T>;

  readonly rotateKeys: () => Promise<void>;
  readonly validateIntegrity: (proof: DataIntegrityProof) => Promise<boolean>;
}

/**
 * Storage service integration
 */
export interface StorageServiceIntegration {
  readonly store: <T>(
    key: string,
    data: T,
    options?: StorageOptions
  ) => Promise<void>;

  readonly retrieve: <T>(key: string) => Promise<T | null>;
  readonly delete: (key: string) => Promise<void>;
  readonly clear: () => Promise<void>;
  readonly getUsage: () => Promise<StorageUsage>;
}

/**
 * Storage options with encryption and compression
 */
export interface StorageOptions {
  readonly encrypt: boolean;
  readonly compress: boolean;
  readonly ttl?: number; // seconds
  readonly backup: boolean;
  readonly auditAccess: boolean;
}

/**
 * Storage usage information
 */
export interface StorageUsage {
  readonly total: number; // bytes
  readonly used: number; // bytes
  readonly available: number; // bytes
  readonly encrypted: number; // bytes
  readonly compressed: number; // bytes
}

/**
 * Network service integration
 */
export interface NetworkServiceIntegration {
  readonly isOnline: () => boolean;
  readonly getQuality: () => Promise<NetworkQuality>;
  readonly getAdaptation: () => Promise<NetworkAdaptation>;
  readonly optimizeForBattery: (level: OptimizationLevel) => Promise<void>;
}

/**
 * Audit service integration
 */
export interface AuditServiceIntegration {
  readonly log: (entry: AuditEntry) => Promise<void>;
  readonly logEmergency: (entry: EmergencyAuditEntry) => Promise<void>;
  readonly query: (filter: AuditFilter) => Promise<readonly AuditEntry[]>;
  readonly export: (options: AuditExportOptions) => Promise<string>;
}

/**
 * Audit filter for queries
 */
export interface AuditFilter {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly userId?: string;
  readonly operation?: string;
  readonly outcome?: 'success' | 'failure' | 'partial';
  readonly entityType?: EntityType;
  readonly limit?: number;
}

/**
 * Audit export options
 */
export interface AuditExportOptions {
  readonly format: 'json' | 'csv' | 'xml';
  readonly encrypted: boolean;
  readonly includePersonalData: boolean;
  readonly complianceFormat: 'HIPAA' | 'GDPR' | 'SOC2';
}

/**
 * Monitoring service integration
 */
export interface MonitoringServiceIntegration {
  readonly recordMetric: (
    name: string,
    value: number,
    tags?: Record<string, string>
  ) => Promise<void>;

  readonly recordAlert: (alert: PerformanceAlert) => Promise<void>;
  readonly getMetrics: () => Promise<SyncPerformanceMetrics>;
  readonly getDashboard: () => Promise<MonitoringDashboard>;
}

/**
 * Monitoring dashboard data
 */
export interface MonitoringDashboard {
  readonly summary: DashboardSummary;
  readonly charts: readonly DashboardChart[];
  readonly alerts: readonly PerformanceAlert[];
  readonly lastUpdated: string;
}

/**
 * Dashboard summary
 */
export interface DashboardSummary {
  readonly totalOperations: number;
  readonly successRate: number;
  readonly averageLatency: number;
  readonly activeAlerts: number;
  readonly complianceScore: number;
}

/**
 * Dashboard chart data
 */
export interface DashboardChart {
  readonly title: string;
  readonly type: 'line' | 'bar' | 'pie' | 'gauge';
  readonly data: readonly ChartDataPoint[];
  readonly timeRange: string;
  readonly unit: string;
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  readonly timestamp: string;
  readonly value: number;
  readonly label?: string;
}

// ===========================================
// EVENT SYSTEM TYPES
// ===========================================

/**
 * Event system with type-safe listeners
 */
export interface EventSystem {
  readonly subscribe: <T>(
    eventType: string,
    listener: EventListener<T>
  ) => Promise<string>;

  readonly unsubscribe: (subscriptionId: string) => Promise<void>;

  readonly emit: <T>(
    eventType: string,
    data: T,
    options?: EventOptions
  ) => Promise<void>;

  readonly getSubscriptions: () => readonly EventSubscription[];
}

/**
 * Event listener with error handling
 */
export type EventListener<T> = (
  event: Event<T>
) => Promise<EventResponse>;

/**
 * Event with comprehensive metadata
 */
export interface Event<T> {
  readonly id: string;
  readonly type: string;
  readonly data: T;
  readonly timestamp: string;
  readonly source: string;
  readonly priority: EventPriority;
  readonly metadata: EventMetadata;
}

/**
 * Event priority levels
 */
export enum EventPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5
}

/**
 * Event metadata
 */
export interface EventMetadata {
  readonly userId?: string;
  readonly deviceId: string;
  readonly sessionId?: string;
  readonly correlationId?: string;
  readonly causedBy?: string;
  readonly context: Record<string, unknown>;
}

/**
 * Event response from listener
 */
export interface EventResponse {
  readonly handled: boolean;
  readonly error?: string;
  readonly data?: unknown;
  readonly shouldPropagate: boolean;
}

/**
 * Event options for emission
 */
export interface EventOptions {
  readonly async: boolean;
  readonly timeout?: number;
  readonly retryOnFailure: boolean;
  readonly persistEvent: boolean;
  readonly requiresAck: boolean;
}

/**
 * Event subscription information
 */
export interface EventSubscription {
  readonly id: string;
  readonly eventType: string;
  readonly subscribedAt: string;
  readonly lastTriggered?: string;
  readonly triggerCount: number;
  readonly errorCount: number;
}

// ===========================================
// CONFIGURATION TYPES
// ===========================================

/**
 * Configuration with environment validation
 */
export interface SyncConfiguration {
  readonly environment: 'development' | 'staging' | 'production';
  readonly sync: SyncSettings;
  readonly performance: PerformanceSettings;
  readonly security: SecuritySettings;
  readonly compliance: ComplianceSettings;
  readonly monitoring: MonitoringSettings;
  readonly features: FeatureFlags;
}

/**
 * Sync settings with defaults
 */
export interface SyncSettings {
  readonly enabled: boolean;
  readonly batchSize: number;
  readonly intervalMs: number;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly backoffMs: number;
  readonly compressionEnabled: boolean;
  readonly prioritizeCrisisData: boolean;
}

/**
 * Performance settings with SLA targets
 */
export interface PerformanceSettings {
  readonly maxLatencyMs: number;
  readonly targetSuccessRate: number;
  readonly maxMemoryUsageMB: number;
  readonly batteryOptimizationLevel: OptimizationLevel;
  readonly networkAdaptationEnabled: boolean;
  readonly performanceMonitoringEnabled: boolean;
}

/**
 * Security settings with encryption requirements
 */
export interface SecuritySettings {
  readonly encryptionAlgorithm: 'AES-256-GCM';
  readonly keyRotationDays: number;
  readonly integrityChecksEnabled: boolean;
  readonly auditLoggingEnabled: boolean;
  readonly biometricBindingRequired: boolean;
  readonly emergencyDecryptionAllowed: boolean;
}

/**
 * Compliance settings with regulatory requirements
 */
export interface ComplianceSettings {
  readonly hipaaCompliance: boolean;
  readonly gdprCompliance: boolean;
  readonly auditRetentionDays: number;
  readonly dataRetentionDays: number;
  readonly consentRequired: boolean;
  readonly dataMinimization: boolean;
  readonly rightToErasure: boolean;
}

/**
 * Monitoring settings
 */
export interface MonitoringSettings {
  readonly metricsEnabled: boolean;
  readonly alertingEnabled: boolean;
  readonly dashboardEnabled: boolean;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly metricRetentionDays: number;
  readonly realTimeMonitoring: boolean;
}

/**
 * Feature flags with progressive rollout
 */
export interface FeatureFlags {
  readonly realTimeSync: boolean;
  readonly conflictResolution: boolean;
  readonly offlineQueue: boolean;
  readonly emergencySync: boolean;
  readonly performanceOptimization: boolean;
  readonly advancedEncryption: boolean;
  readonly complianceReporting: boolean;
}

// ===========================================
// TESTING AND MOCK TYPES
// ===========================================

/**
 * Mock sync client for testing
 */
export interface MockSyncClient {
  readonly setLatency: (latencyMs: number) => void;
  readonly setSuccessRate: (rate: number) => void;
  readonly simulateConflict: <T>(conflict: SyncConflict<T>) => void;
  readonly simulateNetworkIssue: (duration: number) => void;
  readonly reset: () => void;
  readonly getCallHistory: () => readonly MockCall[];
}

/**
 * Mock call record for testing
 */
export interface MockCall {
  readonly method: string;
  readonly args: readonly unknown[];
  readonly timestamp: string;
  readonly duration: number;
  readonly result: unknown;
  readonly error?: string;
}

/**
 * Test fixture for sync testing
 */
export interface SyncTestFixture<T> {
  readonly localData: CrisisSafeData<T>;
  readonly remoteData: CrisisSafeData<T>;
  readonly expectedResult: T;
  readonly expectedConflicts: readonly SyncConflict<T>[];
  readonly scenario: string;
  readonly tags: readonly string[];
}

// ===========================================
// RESULT AND STATUS TYPES
// ===========================================

/**
 * Comprehensive sync status
 */
export interface SyncStatus {
  readonly lastSync: string | null;
  readonly syncInProgress: boolean;
  readonly queueSize: number;
  readonly conflictCount: number;
  readonly errorCount: number;
  readonly performance: SyncPerformanceMetrics;
  readonly health: HealthStatus;
}

/**
 * Health status with detailed checks
 */
export interface HealthStatus {
  readonly overall: 'healthy' | 'degraded' | 'unhealthy';
  readonly components: readonly ComponentHealth[];
  readonly lastHealthCheck: string;
  readonly nextHealthCheck: string;
}

/**
 * Component health status
 */
export interface ComponentHealth {
  readonly component: string;
  readonly status: 'up' | 'down' | 'degraded';
  readonly message?: string;
  readonly lastCheck: string;
  readonly responseTime?: number;
}

/**
 * Integrity check result
 */
export interface IntegrityCheckResult {
  readonly passed: boolean;
  readonly checkedCount: number;
  readonly corruptedCount: number;
  readonly missingCount: number;
  readonly details: readonly IntegrityDetail[];
  readonly recommendation: string;
}

/**
 * Integrity detail for specific entity
 */
export interface IntegrityDetail {
  readonly entityId: string;
  readonly entityType: EntityType;
  readonly status: 'valid' | 'corrupted' | 'missing';
  readonly expectedChecksum?: string;
  readonly actualChecksum?: string;
  readonly lastValidated: string;
}

/**
 * Integrity validation result
 */
export interface IntegrityValidationResult {
  readonly validationId: string;
  readonly timestamp: string;
  readonly entityResults: readonly IntegrityCheckResult[];
  readonly overallStatus: 'pass' | 'fail';
  readonly summary: ValidationSummary;
}

/**
 * Validation summary
 */
export interface ValidationSummary {
  readonly totalEntities: number;
  readonly validEntities: number;
  readonly corruptedEntities: number;
  readonly missingEntities: number;
  readonly validationTime: number;
  readonly confidence: number; // percentage
}

/**
 * Performance validation result
 */
export interface PerformanceValidationResult {
  readonly metrics: SyncPerformanceMetrics;
  readonly slaCompliance: SLAComplianceResult;
  readonly violations: readonly ThresholdViolation[];
  readonly recommendations: readonly PerformanceRecommendation[];
  readonly nextValidation: string;
}

/**
 * SLA compliance result
 */
export interface SLAComplianceResult {
  readonly overall: number; // percentage
  readonly latencyCompliance: number;
  readonly throughputCompliance: number;
  readonly reliabilityCompliance: number;
  readonly violationCount: number;
  readonly period: {
    readonly start: string;
    readonly end: string;
  };
}

/**
 * Performance recommendation
 */
export interface PerformanceRecommendation {
  readonly type: 'configuration' | 'hardware' | 'network' | 'software';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly expectedImpact: string;
  readonly estimatedEffort: string;
  readonly deadline?: string;
}

/**
 * Compliance check result
 */
export interface ComplianceCheckResult {
  readonly framework: string;
  readonly controls: readonly ComplianceControlResult[];
  readonly overallScore: number; // percentage
  readonly violations: readonly ComplianceViolation[];
  readonly recommendations: readonly ComplianceRecommendation[];
  readonly certification: ComplianceCertification;
}

/**
 * Compliance control result
 */
export interface ComplianceControlResult {
  readonly controlId: string;
  readonly requirement: string;
  readonly status: 'compliant' | 'partial' | 'non_compliant';
  readonly score: number; // percentage
  readonly evidence: readonly string[];
  readonly gaps: readonly string[];
}

/**
 * Compliance recommendation
 */
export interface ComplianceRecommendation {
  readonly controlId: string;
  readonly issue: string;
  readonly recommendation: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly effort: 'low' | 'medium' | 'high';
  readonly deadline?: string;
}

/**
 * Compliance certification
 */
export interface ComplianceCertification {
  readonly certified: boolean;
  readonly framework: string;
  readonly level: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly certifiedBy: string;
  readonly limitations: readonly string[];
}

// ===========================================
// RUNTIME VALIDATION SCHEMAS
// ===========================================

/**
 * Zod schema for crisis-safe data validation
 */
export const CrisisSafeDataSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  data: dataSchema,
  crisisLevel: z.nativeEnum(CrisisSeverityLevel),
  emergencyAccess: z.object({
    allowEmergencyDecryption: z.boolean(),
    emergencyContactsRequired: z.boolean(),
    professionalReferralRequired: z.boolean(),
    bypassNormalAuth: z.boolean(),
    auditEmergencyAccess: z.boolean(),
    emergencyTimeout: z.number().int().positive()
  }),
  safetyValidation: z.object({
    validatedAt: z.string().datetime(),
    validatedBy: z.enum(['system', 'clinician', 'emergency_protocol']),
    crisisDetectionActive: z.boolean(),
    emergencyProtocolsEnabled: z.boolean(),
    responseTimeValidated: z.boolean(),
    complianceChecked: z.boolean(),
    integrityVerified: z.boolean()
  }),
  responseTimeRequirement: z.number().int().positive().max(200) // Crisis must be ≤ 200ms
}).readonly();

/**
 * Sync operation schema with validation
 */
export const SyncOperationSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(SyncOperationType),
  priority: z.nativeEnum(SyncPriorityLevel),
  payload: CrisisSafeDataSchema(dataSchema),
  metadata: z.object({
    entityType: z.nativeEnum(EntityType),
    entityId: z.string().min(1),
    userId: z.string().uuid(),
    deviceId: z.string().min(1),
    version: z.number().int().positive(),
    timestamp: z.string().datetime(),
    checksumBeforeSync: z.string().min(64), // SHA-256
    expectedSyncTime: z.number().int().positive(),
    dependencies: z.array(z.string()).readonly()
  }),
  constraints: z.object({
    maxSizeBytes: z.number().int().positive(),
    maxDurationMs: z.number().int().positive(),
    requiresOnline: z.boolean(),
    requiresValidation: z.boolean(),
    allowsPartialSync: z.boolean(),
    networkRequirements: z.object({
      minBandwidthKbps: z.number().positive(),
      maxLatencyMs: z.number().int().positive(),
      requiresSecureConnection: z.boolean(),
      allowsCellular: z.boolean(),
      requiresWifi: z.boolean(),
      compressionAllowed: z.boolean()
    }),
    securityRequirements: z.object({
      encryptionRequired: z.boolean(),
      integrityCheckRequired: z.boolean(),
      auditTrailRequired: z.boolean(),
      biometricVerificationRequired: z.boolean(),
      emergencyBypassAllowed: z.boolean(),
      complianceValidationRequired: z.boolean()
    })
  }),
  validation: z.object({
    preValidation: z.object({
      valid: z.boolean(),
      errors: z.array(z.object({
        code: z.string(),
        message: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        field: z.string().optional(),
        suggestedAction: z.string(),
        blocking: z.boolean()
      })).readonly(),
      warnings: z.array(z.object({
        code: z.string(),
        message: z.string(),
        recommendation: z.string(),
        impact: z.enum(['performance', 'security', 'compliance', 'usability'])
      })).readonly(),
      validatedAt: z.string().datetime(),
      validatedBy: z.string()
    }),
    postValidation: z.object({
      valid: z.boolean(),
      errors: z.array(z.object({
        code: z.string(),
        message: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        field: z.string().optional(),
        suggestedAction: z.string(),
        blocking: z.boolean()
      })).readonly(),
      warnings: z.array(z.object({
        code: z.string(),
        message: z.string(),
        recommendation: z.string(),
        impact: z.enum(['performance', 'security', 'compliance', 'usability'])
      })).readonly(),
      validatedAt: z.string().datetime(),
      validatedBy: z.string()
    }),
    integrityCheck: z.object({
      passed: z.boolean(),
      checkedCount: z.number().int().nonnegative(),
      corruptedCount: z.number().int().nonnegative(),
      missingCount: z.number().int().nonnegative(),
      details: z.array(z.object({
        entityId: z.string(),
        entityType: z.nativeEnum(EntityType),
        status: z.enum(['valid', 'corrupted', 'missing']),
        expectedChecksum: z.string().optional(),
        actualChecksum: z.string().optional(),
        lastValidated: z.string().datetime()
      })).readonly(),
      recommendation: z.string()
    }),
    complianceCheck: z.object({
      framework: z.string(),
      controls: z.array(z.object({
        controlId: z.string(),
        requirement: z.string(),
        status: z.enum(['compliant', 'partial', 'non_compliant']),
        score: z.number().min(0).max(100),
        evidence: z.array(z.string()).readonly(),
        gaps: z.array(z.string()).readonly()
      })).readonly(),
      overallScore: z.number().min(0).max(100),
      violations: z.array(z.object({
        violationId: z.string(),
        controlId: z.string(),
        description: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        remediation: z.string(),
        deadline: z.string().datetime().optional(),
        responsible: z.string()
      })).readonly(),
      recommendations: z.array(z.object({
        controlId: z.string(),
        issue: z.string(),
        recommendation: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'critical']),
        effort: z.enum(['low', 'medium', 'high']),
        deadline: z.string().datetime().optional()
      })).readonly(),
      certification: z.object({
        certified: z.boolean(),
        framework: z.string(),
        level: z.string(),
        validFrom: z.string().datetime(),
        validUntil: z.string().datetime(),
        certifiedBy: z.string(),
        limitations: z.array(z.string()).readonly()
      })
    }),
    performanceValidation: z.object({
      metrics: z.object({
        latency: z.object({
          p50: z.number().nonnegative(),
          p90: z.number().nonnegative(),
          p95: z.number().nonnegative(),
          p99: z.number().nonnegative(),
          p999: z.number().nonnegative(),
          max: z.number().nonnegative(),
          violationCount: z.number().int().nonnegative(),
          slaTarget: z.number().positive()
        }),
        throughput: z.object({
          operationsPerSecond: z.number().nonnegative(),
          bytesPerSecond: z.number().nonnegative(),
          itemsPerSecond: z.number().nonnegative(),
          successRate: z.number().min(0).max(1),
          errorRate: z.number().min(0).max(1),
          conflictRate: z.number().min(0).max(1)
        }),
        reliability: z.object({
          uptime: z.number().min(0).max(100),
          mtbf: z.number().nonnegative(),
          mttr: z.number().nonnegative(),
          errorBudget: z.number().min(0).max(1),
          errorBudgetConsumed: z.number().min(0).max(1),
          availabilityTarget: z.number().min(0).max(1)
        }),
        resource: z.object({
          cpuUsage: z.number().min(0).max(100),
          memoryUsage: z.number().int().nonnegative(),
          networkUsage: z.number().int().nonnegative(),
          diskUsage: z.number().int().nonnegative(),
          batteryImpact: z.number().min(0).max(100),
          efficiency: z.number().positive()
        }),
        compliance: z.object({
          auditCoverage: z.number().min(0).max(100),
          encryptionCompliance: z.number().min(0).max(100),
          retentionCompliance: z.number().min(0).max(100),
          accessControlCompliance: z.number().min(0).max(100),
          violationCount: z.number().int().nonnegative(),
          lastAudit: z.string().datetime()
        })
      }),
      slaCompliance: z.object({
        overall: z.number().min(0).max(100),
        latencyCompliance: z.number().min(0).max(100),
        throughputCompliance: z.number().min(0).max(100),
        reliabilityCompliance: z.number().min(0).max(100),
        violationCount: z.number().int().nonnegative(),
        period: z.object({
          start: z.string().datetime(),
          end: z.string().datetime()
        })
      }),
      violations: z.array(z.object({
        metric: z.string(),
        threshold: z.number(),
        actualValue: z.number(),
        violationType: z.enum(['exceeded', 'below', 'outside_range']),
        duration: z.number().int().nonnegative(),
        impact: z.string(),
        suggestedAction: z.string()
      })).readonly(),
      recommendations: z.array(z.object({
        type: z.enum(['configuration', 'hardware', 'network', 'software']),
        priority: z.enum(['low', 'medium', 'high', 'critical']),
        description: z.string(),
        expectedImpact: z.string(),
        estimatedEffort: z.string(),
        deadline: z.string().datetime().optional()
      })).readonly(),
      nextValidation: z.string().datetime()
    })
  })
}).readonly();

// ===========================================
// TYPE GUARDS AND UTILITY FUNCTIONS
// ===========================================

/**
 * Type guard for crisis-safe data
 */
export const isCrisisSafeData = <T>(data: unknown): data is CrisisSafeData<T> => {
  try {
    CrisisSafeDataSchema(z.unknown()).parse(data);
    return true;
  } catch {
    return false;
  }
};

/**
 * Type guard for sync operations
 */
export const isSyncOperation = <T>(operation: unknown): operation is SyncOperation<T> => {
  try {
    SyncOperationSchema(z.unknown()).parse(operation);
    return true;
  } catch {
    return false;
  }
};

/**
 * Type guard for emergency data
 */
export const isEmergencyData = <T>(data: CrisisSafeData<T>): boolean => {
  return data.crisisLevel >= CrisisSeverityLevel.HIGH;
};

/**
 * Type guard for crisis response time requirements
 */
export const requiresCrisisResponseTime = <T>(data: CrisisSafeData<T>): boolean => {
  return data.responseTimeRequirement <= 200; // 200ms for crisis
};

/**
 * Type guard for clinical data
 */
export const isClinicalData = (entityType: EntityType): boolean => {
  return [
    EntityType.ASSESSMENT,
    EntityType.CRISIS_PLAN,
    EntityType.THERAPY_SESSION,
    EntityType.EMERGENCY_DATA
  ].includes(entityType);
};

/**
 * Type guard for compliance-required operations
 */
export const requiresCompliance = <T>(operation: SyncOperation<T>): boolean => {
  return operation.constraints.securityRequirements.complianceValidationRequired ||
         isClinicalData(operation.metadata.entityType);
};

/**
 * Performance SLA constants
 */
export const PERFORMANCE_SLAS: Record<SyncPriorityLevel, PerformanceSLA> = {
  [SyncPriorityLevel.BACKGROUND]: {
    maxLatencyMs: 10000,
    maxRetryAttempts: 3,
    timeoutMs: 30000,
    crisisResponseMs: 200
  },
  [SyncPriorityLevel.NORMAL]: {
    maxLatencyMs: 5000,
    maxRetryAttempts: 5,
    timeoutMs: 15000,
    crisisResponseMs: 200
  },
  [SyncPriorityLevel.HIGH]: {
    maxLatencyMs: 1000,
    maxRetryAttempts: 10,
    timeoutMs: 5000,
    crisisResponseMs: 200
  },
  [SyncPriorityLevel.URGENT]: {
    maxLatencyMs: 500,
    maxRetryAttempts: 15,
    timeoutMs: 2000,
    crisisResponseMs: 200
  },
  [SyncPriorityLevel.CRISIS]: {
    maxLatencyMs: 200,
    maxRetryAttempts: 20,
    timeoutMs: 1000,
    crisisResponseMs: 200
  },
  [SyncPriorityLevel.EMERGENCY]: {
    maxLatencyMs: 100,
    maxRetryAttempts: 25,
    timeoutMs: 500,
    crisisResponseMs: 200
  }
} as const;

/**
 * Default configuration constants
 */
export const SYNC_DEFAULTS = {
  BATCH_SIZE: 10,
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  COMPRESSION_THRESHOLD: 1024, // bytes
  CRISIS_RESPONSE_TIME_MS: 200,
  MAX_QUEUE_SIZE: 1000,
  ENCRYPTION_ALGORITHM: 'AES-256-GCM' as const,
  HASH_ALGORITHM: 'SHA-256' as const
} as const;

// Export all types for easy importing
export type {
  // Core types
  CrisisSafeData,
  EncryptedDataWrapper,
  SyncOperation,
  SyncClientResult,

  // Service interfaces
  RealTimeSyncClient,
  RestSyncClient,
  ServiceIntegration,

  // Configuration
  SyncConfiguration,
  FeatureFlags,

  // Results and status
  SyncStatus,
  HealthStatus,
  PerformanceValidationResult,
  ComplianceCheckResult
};