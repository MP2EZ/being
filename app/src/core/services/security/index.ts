/**
 * SECURITY SERVICES BARREL
 *
 * Re-exports of the core security services and their public types. The high-level
 * `SecurityOrchestrator` was removed in INFRA-62 — it was never initialized at
 * runtime, and each consumer holds its own reference to the specific service(s)
 * it needs (e.g. `AnalyticsService` imports `SecurityMonitoringService` directly).
 *
 * Service layers (each kept):
 * 1. Encryption — data protection at rest and in transit
 * 2. Authentication — user identity and session management
 * 3. Secure Storage — protected data storage with audit trails
 * 4. Network Security — secure API communications
 * 5. Crisis Security Protocol — crisis data special protections
 * 6. Security Monitoring — vulnerability assessment (consumed by AnalyticsService)
 * 7. Deep Link Validation — URL scheme validation
 */

// Core security services — default-export re-exports
export { default as EncryptionService } from './EncryptionService';
export { default as AuthenticationService } from './AuthenticationService';
export { default as SecureStorageService } from './SecureStorageService';
export { default as NetworkSecurityService } from './NetworkSecurityService';
export { default as SecurityMonitoringService } from './SecurityMonitoringService';
export { default as DeepLinkValidationService } from './DeepLinkValidationService';

// Crisis-specific security
export { default as CrisisSecurityProtocol } from '@/features/crisis/services/CrisisSecurityProtocol';

// Type exports — Encryption Service
export type {
  DataSensitivityLevel,
  EncryptedDataPackage,
  EncryptionMetadata,
  KeyManagementResult,
  EncryptionPerformanceMetrics
} from './EncryptionService';

// Type exports — Authentication Service
export type {
  AuthenticationLevel,
  AuthenticationMethod,
  UserAuthenticationContext,
  AuthenticationToken,
  AuthenticationResult,
  SessionValidationResult,
  BiometricAuthOptions,
  AuthenticationAuditEntry
} from './AuthenticationService';

// Type exports — Secure Storage Service
export type {
  StorageTier,
  SecureStorageMetadata,
  StorageOperationResult,
  BulkStorageOperation,
  StorageAccessLogEntry
} from './SecureStorageService';

// Type exports — Network Security Service
export type {
  APIEndpointCategory,
  RequestSecurityContext,
  SecureRequestOptions,
  SecureResponse,
  NetworkSecurityMetrics,
  SecurityViolationEvent
} from './NetworkSecurityService';

// Type exports — Crisis Security Protocol
export type {
  CrisisSecurityLevel,
  CrisisAccessContext,
  CrisisDataProtectionResult,
  CrisisSecurityViolation,
  EmergencyAccessCredentials
} from '@/features/crisis/services/CrisisSecurityProtocol';

// Type exports — Security Monitoring Service
export type {
  VulnerabilityAssessment,
  SecurityVulnerability,
  SecurityRecommendation,
  ComplianceStatus,
  ThreatDetectionResult,
  SecurityMetrics,
  IncidentDetectionEvent
} from './SecurityMonitoringService';

// Type exports — Deep Link Validation Service
export type {
  DeepLinkValidationResult,
  DeepLinkValidationError,
  DeepLinkErrorCode,
  DeepLinkSecurityEvent
} from './DeepLinkValidationService';

export { DEEP_LINK_CONFIG } from './DeepLinkValidationService';
