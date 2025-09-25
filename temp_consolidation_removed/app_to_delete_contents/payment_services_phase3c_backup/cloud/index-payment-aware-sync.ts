/**
 * Payment-Aware Sync Services Export - Day 19 Phase 1
 *
 * Comprehensive export file for all payment-aware sync APIs and services
 */

// Core Payment-Aware Sync Service APIs
export {
  PaymentAwareSyncService,
  paymentAwareSyncService
} from './PaymentAwareSyncAPIImpl';

export {
  DEFAULT_PAYMENT_AWARE_SYNC_CONFIG,
  type IPaymentAwareSyncServiceAPI,
  type PaymentAwareSyncRequest,
  type PaymentAwareSyncResponse,
  type SyncPriorityLevel,
  type CrisisEmergencySyncRequest,
  type CrisisEmergencySyncResponse,
  type SubscriptionWebhookEvent,
  type SyncPerformanceMetrics,
  type SLAComplianceReport
} from './PaymentAwareSyncAPI';

// Compliance APIs
export {
  DEFAULT_COMPLIANCE_CONFIG,
  type IPaymentAwareSyncComplianceAPI,
  type HIPAAAuditLogEntry,
  type ComplianceViolation,
  type SubscriptionComplianceValidation,
  type CrisisSafetyCompliance,
  type DataRetentionPolicy
} from './PaymentAwareSyncComplianceAPI';

// Cross-Device Coordination APIs
export {
  DEFAULT_CROSS_DEVICE_CONFIG,
  type ICrossDeviceSyncCoordinationAPI,
  type DeviceInfo,
  type UserDeviceFleet,
  type CrossDeviceSession,
  type CrossDeviceSyncRequest,
  type CrossDeviceSyncResponse,
  type CrossDeviceWebhookEvent
} from './CrossDeviceSyncCoordinationAPI';

// Supporting Services
export { PaymentAwareSyncContext, paymentAwareSyncContext } from './PaymentAwareSyncContext';

/**
 * Unified Payment-Aware Sync Services
 *
 * Provides comprehensive API interface for all payment-aware sync operations
 * with crisis safety, subscription tier management, and cross-device coordination.
 */
export const paymentAwareSyncServices = {
  // Core sync service
  syncService: paymentAwareSyncService,
  syncContext: paymentAwareSyncContext,

  // Configuration defaults
  defaultSyncConfig: DEFAULT_PAYMENT_AWARE_SYNC_CONFIG,
  defaultComplianceConfig: DEFAULT_COMPLIANCE_CONFIG,
  defaultCrossDeviceConfig: DEFAULT_CROSS_DEVICE_CONFIG,
} as const;