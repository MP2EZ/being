export { useUserStore } from './userStore';
export { useCheckInStore } from './checkInStore';
export { useAssessmentStore } from './assessmentStore';
export { useFeatureFlagStore, initializeFeatureFlags } from './featureFlagStore';
export {
  usePaymentStore,
  paymentSelectors,
  usePaymentActions,
  usePaymentStatus,
  useCrisisPaymentSafety,
  // Day 17 Phase 2: Enhanced subscription management hooks
  useFeatureAccess,
  useSubscriptionManagement,
  useTrialManagement
} from './paymentStore';

// Day 17 Phase 1: Subscription Management Exports
export { subscriptionManager } from '../services/cloud/SubscriptionManager';
export { paymentAwareFeatureGates } from '../services/cloud/PaymentAwareFeatureGates';

// Day 17 Phase 2: State Synchronization Service
export { stateSynchronizationService } from '../services/state/StateSynchronization';

// Day 17 Phase 4: Real-Time Webhook State Synchronization & Store Integration
// Enhanced webhook state management with crisis-safe real-time synchronization

// Core Webhook State Management
export {
  useWebhookStateManager,
  webhookStateSelectors,
} from './webhooks/webhook-state-manager';

export {
  usePaymentWebhookStore,
  paymentWebhookSelectors,
} from './webhooks/payment-webhook-store';

export {
  useSubscriptionSyncStore,
  subscriptionSyncSelectors,
} from './webhooks/subscription-sync-store';

export {
  useCrisisStateManager,
  crisisStateSelectors,
} from './webhooks/crisis-state-manager';

// Real-Time Synchronization
export {
  useRealTimeWebhookSync,
  realTimeWebhookSyncSelectors,
} from './sync/real-time-webhook-sync';

export {
  useOptimisticUpdateManager,
  optimisticUpdateSelectors,
} from './sync/optimistic-update-manager';

// State Persistence & Recovery
export {
  useEncryptedWebhookStorage,
  encryptedWebhookStorageSelectors,
} from './persistence/encrypted-webhook-storage';

// Performance & Monitoring
export {
  useWebhookPerformanceStore,
  webhookPerformanceSelectors,
} from './monitoring/webhook-performance-store';

// P0-CLOUD Phase 1: Enhanced Zustand Sync Store Patterns
// Advanced state synchronization with payment-aware, crisis-safe real-time coordination

// Enhanced Sync Store - Core real-time state synchronization
export {
  useEnhancedSyncStore,
  useEnhancedSync,
  useCrisisSafeSync,
  usePaymentAwareSync,
  useSyncPerformance,
  enhancedSyncSelectors,
} from './sync/enhanced-sync-store';

// Cross-Device Coordination Store - Multi-device state management
export {
  useCrossDeviceCoordinationStore,
  useCrossDeviceCoordination,
  crossDeviceSelectors,
} from './sync/cross-device-coordination-store';

// Conflict Resolution Store - Intelligent therapeutic data prioritization
export {
  useConflictResolutionStore,
  useConflictResolution,
  conflictResolutionSelectors,
} from './sync/conflict-resolution-store';

// P0-CLOUD Phase 6: Comprehensive Cross-Device State Management
// Advanced multi-device state synchronization with crisis-first design and therapeutic continuity

// Cross-Device State Manager - Core cross-device state orchestration
export {
  useCrossDeviceStateStore,
  crossDeviceStateSelectors,
} from './sync/cross-device-state-store';

// State Sync Integration - Unified store integration and coordination
export {
  useStateSyncIntegration,
  useIntegratedSync,
  useCrisisIntegration,
  useSyncPerformance as useIntegratedSyncPerformance,
} from './sync/state-sync-integration';

// P0-CLOUD Enhanced Sync Types
export type {
  SyncState,
  ConflictResolutionState,
  CrossDeviceSyncState,
  CrisisSafetyState,
  SubscriptionSyncContext,
  OptimisticUpdateState,
  PerformanceMonitoringState,
  EnhancedSyncStore,
} from './sync/enhanced-sync-store';

export type {
  DeviceInfo,
  SessionContext,
  DeviceNetworkState,
  FamilySharingState,
  CrisisCoordinationState,
  CrossDeviceCoordinationStore,
} from './sync/cross-device-coordination-store';

export type {
  ConflictType,
  TherapeuticImpact,
  ConflictContext,
  ConflictResolutionStrategy,
  ActiveConflict,
  ResolutionAnalytics,
  ConflictResolutionStore,
} from './sync/conflict-resolution-store';

// P0-CLOUD Phase 6: Cross-Device State Management Types
export type {
  DeviceState,
  CrossDeviceSessionState,
  CrisisStateCoordination,
  StateConflictContext,
  StateOrchestrationEvent,
  CrossDeviceStateManager,
} from './sync/cross-device-state-manager';

export type {
  SyncIntegrationEvent,
  StateSyncIntegration,
} from './sync/state-sync-integration';

// P0-CLOUD Phase 4: Comprehensive Queue State Management
// Advanced queue state management with crisis protection and offline resilience

// Core Queue State Management
export {
  useOfflineQueueStore,
  useOfflineQueue,
  offlineQueueSelectors,
} from './queue/offline-queue-store';

export {
  useQueueOperationTrackerStore,
  useQueueOperationTracker,
  queueOperationTrackerSelectors,
} from './queue/queue-operation-tracker';

export {
  useCrisisQueueStore,
  useCrisisQueue,
  crisisQueueSelectors,
} from './queue/crisis-queue-state';

export {
  useQueuePerformanceStore,
  useQueuePerformance,
  queuePerformanceSelectors,
} from './queue/queue-performance-state';

// Cross-Device Coordination State
export {
  useCrossDeviceQueueStore,
  useCrossDeviceQueue,
  crossDeviceQueueSelectors,
} from './coordination/cross-device-queue-state';

export {
  useDeviceCapabilityStore,
  useDeviceCapability,
  deviceCapabilitySelectors,
} from './coordination/device-capability-state';

// Queue State Management Types
export type {
  QueueOperationStatus,
  CrisisPriorityState,
  QueuePerformanceMetrics,
  OperationTrackingState,
  ExecutionHistoryEntry,
  CrisisLevel,
  CrisisResponseState,
  EmergencyOperation,
  TherapeuticContinuityState,
} from './queue/offline-queue-store';

export type {
  PerformanceMetricSample,
  TimeSeriesPerformanceData,
  PerformanceAlert,
  SLADefinition,
  SLACompliance,
  ResourceUsage,
  PerformanceOptimization,
} from './queue/queue-performance-state';

export type {
  QueueDistributionStrategy,
  DeviceQueueState,
  ConflictResolutionContext,
  SessionHandoffState,
} from './coordination/cross-device-queue-state';

export type {
  DevicePerformanceProfile,
  SubscriptionCapabilities,
  ResourceConstraint,
  CapabilityOptimization,
} from './coordination/device-capability-state';

// P0-CLOUD Phase 2: Performance Optimization System
// Comprehensive performance optimization with <500ms sync, <200ms crisis response

// Core Performance Optimization
export {
  useUnifiedPerformanceSystem,
  initializePerformanceSystem,
  createPerformanceConfig,
  performHealthCheck,
  PERFORMANCE_CONSTANTS,
} from '../performance';

// Sync Performance Optimization
export {
  useSyncPerformanceOptimizer,
  useSyncPerformanceOptimizerStore,
} from '../performance/sync/sync-performance-optimizer';

// Crisis Performance Guarantee
export {
  useCrisisPerformanceGuarantee,
  useCrisisPerformanceGuaranteeStore,
} from '../performance/sync/crisis-performance-guarantee';

// Subscription Tier Optimization
export {
  useSubscriptionTierOptimization,
  useSubscriptionTierOptimizationStore,
} from '../performance/sync/subscription-tier-optimization';

// Cross-Device Performance
export {
  useCrossDevicePerformance,
  useCrossDevicePerformanceStore,
} from '../performance/sync/cross-device-performance';

// Memory Optimization
export {
  useMobileMemoryOptimization,
  useMobileMemoryOptimizationStore,
} from '../performance/resources/mobile-memory-optimization';

// Real-Time Performance Monitoring
export {
  useRealTimePerformanceMonitor,
  useRealTimePerformanceMonitorStore,
} from '../performance/monitoring/real-time-performance-monitor';

// Performance Types
export type {
  SyncPerformanceConfig,
  PerformanceMetrics,
  CrisisPerformanceMetrics,
  TierPerformanceConfig,
  DevicePerformanceProfile,
  MemoryUsageStats,
  RealTimePerformanceMetrics,
  PerformanceViolation,
  SLACompliance,
} from '../performance';