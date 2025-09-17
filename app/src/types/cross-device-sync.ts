/**
 * Cross-Device Sync Types - Complete Type Definitions
 *
 * Comprehensive type definitions for cross-device synchronization:
 * - Crisis-first sync types with performance guarantees
 * - Device management and trust establishment
 * - Emergency access and security override types
 * - Performance monitoring and optimization types
 * - Security integration and compliance types
 */

import { z } from 'zod';
import { DataSensitivity } from '../services/security/EncryptionService';

/**
 * Core sync operation types
 */
export enum SyncOperationType {
  CRISIS_SYNC = 'crisis_sync',
  THERAPEUTIC_SYNC = 'therapeutic_sync',
  GENERAL_SYNC = 'general_sync',
  BATCH_SYNC = 'batch_sync',
  EMERGENCY_SYNC = 'emergency_sync'
}

export enum SyncPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

export enum SyncMethod {
  WEBSOCKET = 'websocket',
  REST = 'rest',
  OFFLINE_QUEUE = 'offline_queue'
}

/**
 * Sync operation request and response types
 */
export interface SyncRequest {
  operationType: SyncOperationType;
  entityType: string;
  entityId: string;
  data: any;
  priority: SyncPriority;
  dataSensitivity: DataSensitivity;
  sessionContext?: {
    sessionId: string;
    exerciseType: string;
    therapeuticContext?: Record<string, any>;
  };
  metadata: {
    deviceId: string;
    userId: string;
    timestamp: string;
    version: number;
    checksum: string;
  };
}

export interface SyncResponse {
  success: boolean;
  syncId: string;
  operationType: SyncOperationType;
  method: SyncMethod;
  responseTime: number;
  dataSize: number;
  conflict?: SyncConflict;
  error?: SyncError;
  performance: {
    encryptionTime: number;
    networkTime: number;
    queueWaitTime?: number;
    compressionRatio?: number;
  };
  security: {
    encryptionValidated: boolean;
    integrityValidated: boolean;
    auditLogged: boolean;
  };
}

/**
 * Conflict resolution types
 */
export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  conflictType: ConflictType;
  localVersion: number;
  remoteVersion: number;
  localData: any;
  remoteData: any;
  detectedAt: string;
  autoResolvable: boolean;
  clinicalRelevant: boolean;
  resolutionStrategy?: ConflictResolutionStrategy;
}

export enum ConflictType {
  VERSION_MISMATCH = 'version_mismatch',
  TIMESTAMP_CONFLICT = 'timestamp_conflict',
  DATA_DIVERGENCE = 'data_divergence',
  ENCRYPTION_MISMATCH = 'encryption_mismatch'
}

export interface ConflictResolutionStrategy {
  strategy: 'client_wins' | 'server_wins' | 'merge' | 'user_choice' | 'crisis_priority';
  mergeRules?: {
    fieldPriority: Record<string, 'client' | 'server' | 'latest'>;
    arrayMergeStrategy: 'union' | 'client' | 'server';
    customMergeFields: string[];
  };
  crisisPriority?: {
    prioritizeLocal: boolean;
    emergencyOverride: boolean;
  };
}

/**
 * Device management types
 */
export interface DeviceRegistrationRequest {
  deviceName: string;
  platform: 'ios' | 'android';
  appVersion: string;
  deviceFingerprint: string;
  publicKey: string;
  capabilities: DeviceCapabilities;
  securityFeatures: SecurityFeatures;
}

export interface DeviceCapabilities {
  emergencyCapable: boolean;
  biometricCapable: boolean;
  offlineCapable: boolean;
  websocketSupported: boolean;
  compressionSupported: boolean;
  backgroundSyncSupported: boolean;
}

export interface SecurityFeatures {
  biometricTypes: ('fingerprint' | 'face' | 'voice')[];
  encryptionSupported: string[];
  keychainAvailable: boolean;
  deviceLockEnabled: boolean;
  jailbrokenRooted: boolean;
}

export interface DeviceRegistrationResponse {
  success: boolean;
  deviceId?: string;
  deviceKey?: string;
  trustLevel?: DeviceTrustLevel;
  emergencyCode?: string;
  sessionConfig?: DeviceSessionConfig;
  error?: string;
}

export enum DeviceTrustLevel {
  UNTRUSTED = 0,
  BASIC = 1,
  TRUSTED = 2,
  FULLY_TRUSTED = 3,
  EMERGENCY_ONLY = 4
}

export interface DeviceSessionConfig {
  sessionTimeout: number;
  biometricRequired: boolean;
  networkRestrictionsEnabled: boolean;
  auditLevel: 'basic' | 'enhanced' | 'full';
}

/**
 * Device authentication types
 */
export interface DeviceAuthenticationRequest {
  deviceId: string;
  challenge: string;
  signature: string;
  timestamp: string;
  biometricData?: BiometricAuthData;
  location?: DeviceLocation;
}

export interface BiometricAuthData {
  type: 'fingerprint' | 'face' | 'voice';
  hash: string;
  confidence: number;
  template?: string;
}

export interface DeviceLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp: string;
  source: 'gps' | 'network' | 'passive';
}

export interface DeviceAuthenticationResponse {
  success: boolean;
  sessionToken?: string;
  trustLevel?: DeviceTrustLevel;
  expiresAt?: string;
  permissions?: DevicePermissions;
  error?: string;
}

export interface DevicePermissions {
  syncOperations: SyncOperationType[];
  dataAccess: DataAccessLevel[];
  emergencyAccess: boolean;
  adminOperations: boolean;
}

export enum DataAccessLevel {
  READ_ONLY = 'read_only',
  READ_WRITE = 'read_write',
  FULL_ACCESS = 'full_access',
  CRISIS_ONLY = 'crisis_only'
}

/**
 * Emergency access types
 */
export interface EmergencyAccessRequest {
  deviceId: string;
  emergencyCode: string;
  crisisType: CrisisType;
  justification: string;
  timestamp: string;
  urgencyLevel: UrgencyLevel;
  requesterInfo?: EmergencyRequesterInfo;
}

export enum CrisisType {
  PHQ9_THRESHOLD = 'phq9_threshold',
  GAD7_THRESHOLD = 'gad7_threshold',
  CRISIS_BUTTON = 'crisis_button',
  MANUAL_EMERGENCY = 'manual_emergency',
  SYSTEM_DETECTED = 'system_detected'
}

export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface EmergencyRequesterInfo {
  role: 'user' | 'caregiver' | 'clinician' | 'emergency_contact';
  contactInfo?: string;
  relationship?: string;
  verificationCode?: string;
}

export interface EmergencyAccessResponse {
  success: boolean;
  emergencyToken?: string;
  accessLevel?: EmergencyAccessLevel;
  limitations: string[];
  expiresAt?: string;
  monitoringEnabled: boolean;
  error?: string;
}

export enum EmergencyAccessLevel {
  CRISIS_DATA_ONLY = 'crisis_data_only',
  ASSESSMENT_ACCESS = 'assessment_access',
  LIMITED_SYNC = 'limited_sync',
  FULL_EMERGENCY = 'full_emergency'
}

/**
 * Performance monitoring types
 */
export interface PerformanceMetric {
  id: string;
  timestamp: string;
  operationType: SyncOperationType;
  responseTime: number;
  dataSize: number;
  method: SyncMethod;
  networkConditions: NetworkConditions;
  batteryStatus: BatteryStatus;
  success: boolean;
  errorCode?: string;
  compressionRatio?: number;
  retryCount: number;
  queueWaitTime?: number;
}

export interface NetworkConditions {
  type: NetworkType;
  strength: number; // 0-100
  latency: number; // milliseconds
  bandwidth: number; // kbps
  reliability: number; // 0-1
  cellular?: CellularInfo;
  wifi?: WifiInfo;
}

export enum NetworkType {
  WIFI = 'wifi',
  CELLULAR = 'cellular',
  ETHERNET = 'ethernet',
  OFFLINE = 'offline'
}

export interface CellularInfo {
  carrier: string;
  technology: '3G' | '4G' | '5G';
  signalStrength: number;
  dataUsage: number;
}

export interface WifiInfo {
  ssid: string;
  frequency: number;
  signalStrength: number;
  security: string;
}

export interface BatteryStatus {
  level: number; // 0-100
  charging: boolean;
  lowPowerMode: boolean;
  estimatedTimeRemaining?: number;
  chargingSource?: 'ac' | 'usb' | 'wireless';
}

export interface PerformanceThresholds {
  crisisResponseMaxMs: number;
  therapeuticSyncMaxMs: number;
  generalSyncMaxMs: number;
  batchSyncMaxMs: number;
  successRateMin: number;
  networkLatencyMaxMs: number;
  batteryOptimizationThreshold: number;
  queueSizeMax: number;
}

export interface PerformanceReport {
  timeRange: { start: string; end: string };
  summary: PerformanceSummary;
  operationAnalysis: OperationAnalysis[];
  networkAnalysis: NetworkAnalysis;
  batteryAnalysis: BatteryAnalysis;
  recommendations: PerformanceRecommendation[];
  violations: PerformanceViolation[];
}

export interface PerformanceSummary {
  totalOperations: number;
  successRate: number;
  averageResponseTime: number;
  crisisViolations: number;
  networkIssues: number;
  batteryOptimizations: number;
}

export interface OperationAnalysis {
  operationType: SyncOperationType;
  count: number;
  averageResponseTime: number;
  successRate: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface NetworkAnalysis {
  wifiPerformance: number;
  cellularPerformance: number;
  offlineQueueUsage: number;
  bandwidthUtilization: number;
  latencyDistribution: { p50: number; p95: number; p99: number };
}

export interface BatteryAnalysis {
  averageBatteryDrain: number;
  lowPowerModeOperations: number;
  chargingOptimizations: number;
  deferredOperations: number;
}

export interface PerformanceRecommendation {
  type: 'network' | 'battery' | 'compression' | 'batching' | 'scheduling';
  severity: 'low' | 'medium' | 'high';
  description: string;
  implementation: string;
  expectedImprovement: number; // percentage
}

export interface PerformanceViolation {
  type: 'crisis_timeout' | 'success_rate' | 'network_failure' | 'battery_drain';
  severity: 'warning' | 'critical';
  timestamp: string;
  details: string;
  impact: string;
  resolution?: string;
}

/**
 * Security and compliance types
 */
export interface SecurityValidationRequest {
  operation: string;
  context: SecurityContext;
  metadata: Record<string, any>;
}

export interface SecurityContext {
  authenticated: boolean;
  biometricUsed: boolean;
  deviceTrusted: boolean;
  networkSecure: boolean;
  encryptionActive: boolean;
  sessionValid?: boolean;
  emergencyAccess?: boolean;
  location?: DeviceLocation;
}

export interface SecurityValidationResponse {
  valid: boolean;
  issues: string[];
  threats: ThreatDetection[];
  recommendations: string[];
  complianceStatus: ComplianceStatus;
}

export interface ThreatDetection {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  source: string;
  timestamp: string;
  indicators: string[];
  mitigated: boolean;
  mitigation?: ThreatMitigation;
}

export enum ThreatType {
  BRUTE_FORCE = 'brute_force',
  DATA_EXFILTRATION = 'data_exfiltration',
  MAN_IN_MIDDLE = 'man_in_middle',
  REPLAY_ATTACK = 'replay_attack',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DEVICE_COMPROMISE = 'device_compromise'
}

export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ThreatMitigation {
  actions: string[];
  automated: boolean;
  effectiveness: number; // 0-1
  timeToMitigate: number; // seconds
}

export interface ComplianceStatus {
  hipaaCompliant: boolean;
  encryptionCompliant: boolean;
  auditCompliant: boolean;
  accessControlCompliant: boolean;
  issues: ComplianceIssue[];
  lastCheck: string;
}

export interface ComplianceIssue {
  type: 'hipaa' | 'encryption' | 'audit' | 'access_control' | 'data_retention';
  severity: 'warning' | 'violation';
  description: string;
  remediation: string[];
  deadline?: string;
}

/**
 * Error types
 */
export interface SyncError {
  code: string;
  message: string;
  category: ErrorCategory;
  retryable: boolean;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  ENCRYPTION = 'encryption',
  VALIDATION = 'validation',
  STORAGE = 'storage',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  SYSTEM = 'system'
}

/**
 * Configuration types
 */
export interface CrossDeviceSyncConfig {
  enabled: boolean;
  websocketConfig: WebSocketConfig;
  restConfig: RestConfig;
  securityConfig: SecurityConfig;
  performanceConfig: PerformanceConfig;
  emergencyConfig: EmergencyConfig;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  messageTimeout: number;
}

export interface RestConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
  compressionEnabled: boolean;
}

export interface SecurityConfig {
  encryptionRequired: boolean;
  biometricRequired: boolean;
  deviceTrustRequired: boolean;
  auditLoggingEnabled: boolean;
  threatDetectionEnabled: boolean;
  emergencyBypassAllowed: boolean;
}

export interface PerformanceConfig {
  monitoringEnabled: boolean;
  optimizationEnabled: boolean;
  networkAdaptation: boolean;
  batteryOptimization: boolean;
  compressionThreshold: number;
  batchingThreshold: number;
}

export interface EmergencyConfig {
  enabled: boolean;
  triggers: CrisisType[];
  priorityData: string[];
  timeoutMs: number;
  maxRetries: number;
  forceSync: boolean;
  notificationEnabled: boolean;
}

/**
 * Zod schemas for runtime validation
 */
export const SyncRequestSchema = z.object({
  operationType: z.nativeEnum(SyncOperationType),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  data: z.any(),
  priority: z.nativeEnum(SyncPriority),
  dataSensitivity: z.nativeEnum(DataSensitivity),
  sessionContext: z.object({
    sessionId: z.string(),
    exerciseType: z.string(),
    therapeuticContext: z.record(z.any()).optional()
  }).optional(),
  metadata: z.object({
    deviceId: z.string().min(1),
    userId: z.string().min(1),
    timestamp: z.string().datetime(),
    version: z.number().int().positive(),
    checksum: z.string().min(32)
  })
}).readonly();

export const DeviceRegistrationRequestSchema = z.object({
  deviceName: z.string().min(1).max(100),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  deviceFingerprint: z.string().min(32),
  publicKey: z.string().min(64),
  capabilities: z.object({
    emergencyCapable: z.boolean(),
    biometricCapable: z.boolean(),
    offlineCapable: z.boolean(),
    websocketSupported: z.boolean(),
    compressionSupported: z.boolean(),
    backgroundSyncSupported: z.boolean()
  }),
  securityFeatures: z.object({
    biometricTypes: z.array(z.enum(['fingerprint', 'face', 'voice'])),
    encryptionSupported: z.array(z.string()),
    keychainAvailable: z.boolean(),
    deviceLockEnabled: z.boolean(),
    jailbrokenRooted: z.boolean()
  })
}).readonly();

export const EmergencyAccessRequestSchema = z.object({
  deviceId: z.string().uuid(),
  emergencyCode: z.string().length(6),
  crisisType: z.nativeEnum(CrisisType),
  justification: z.string().min(1),
  timestamp: z.string().datetime(),
  urgencyLevel: z.nativeEnum(UrgencyLevel),
  requesterInfo: z.object({
    role: z.enum(['user', 'caregiver', 'clinician', 'emergency_contact']),
    contactInfo: z.string().optional(),
    relationship: z.string().optional(),
    verificationCode: z.string().optional()
  }).optional()
}).readonly();

/**
 * Type guards for runtime type checking
 */
export const isSyncRequest = (data: unknown): data is SyncRequest => {
  try {
    SyncRequestSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

export const isDeviceRegistrationRequest = (data: unknown): data is DeviceRegistrationRequest => {
  try {
    DeviceRegistrationRequestSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

export const isEmergencyAccessRequest = (data: unknown): data is EmergencyAccessRequest => {
  try {
    EmergencyAccessRequestSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

/**
 * Constants and defaults
 */
export const CROSS_DEVICE_SYNC_CONSTANTS = {
  // Performance requirements
  CRISIS_RESPONSE_MAX_MS: 200,
  THERAPEUTIC_SYNC_MAX_MS: 500,
  GENERAL_SYNC_MAX_MS: 2000,
  BATCH_SYNC_MAX_MS: 5000,

  // Retry and timeout settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_MS: 1000,
  WEBSOCKET_TIMEOUT_MS: 10000,
  REST_TIMEOUT_MS: 30000,

  // Batch and queue limits
  MAX_BATCH_SIZE: 100,
  MAX_QUEUE_SIZE: 1000,
  OFFLINE_QUEUE_LIMIT: 5000,

  // Security settings
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  EMERGENCY_TOKEN_TIMEOUT_MS: 60 * 60 * 1000, // 1 hour
  DEVICE_TRUST_EXPIRY_DAYS: 365,

  // Performance monitoring
  METRICS_RETENTION_HOURS: 168, // 7 days
  PERFORMANCE_CHECK_INTERVAL_MS: 60000, // 1 minute
  OPTIMIZATION_INTERVAL_MS: 300000, // 5 minutes

  // Emergency settings
  EMERGENCY_CODE_LENGTH: 6,
  CRISIS_NOTIFICATION_DELAY_MS: 1000,
  EMERGENCY_OVERRIDE_TIMEOUT_MS: 3600000 // 1 hour
} as const;