/**
 * Cross-Device Sync Coordination API - Day 19 Phase 1
 *
 * Orchestrates payment-aware synchronization across multiple devices
 * with session preservation, conflict resolution, and crisis safety.
 *
 * COORDINATION FEATURES:
 * - Real-time device discovery and session coordination
 * - Subscription tier-aware device limits and prioritization
 * - Crisis override propagation across all user devices
 * - Session handoff with therapeutic continuity preservation
 * - Conflict resolution with clinical data integrity
 * - Webhook-driven real-time updates across device fleet
 */

import { SyncOperation, SyncEntityType, SyncMetadata } from '../../types/sync';
import { SubscriptionTier } from '../../types/subscription';
import { CrisisPaymentOverride } from '../../types/payment';
import { PaymentAwareSyncRequest, SyncPriorityLevel } from './PaymentAwareSyncAPI';

// ============================================================================
// DEVICE COORDINATION TYPES
// ============================================================================

/**
 * Device information for cross-device coordination
 */
export interface DeviceInfo {
  readonly deviceId: string;
  readonly deviceType: 'ios' | 'android' | 'web' | 'widget';
  readonly deviceName: string;
  readonly platformVersion: string;
  readonly appVersion: string;
  readonly lastSeen: string;
  readonly online: boolean;
  readonly capabilities: {
    readonly syncEnabled: boolean;
    readonly crisisCapable: boolean;          // Can handle crisis situations
    readonly offlineCapable: boolean;
    readonly encryptionSupported: boolean;
    readonly backgroundSyncSupported: boolean;
  };
  readonly location: {
    readonly timezone: string;
    readonly country: string;
    readonly dataResidencyCompliant: boolean;
  };
  readonly performance: {
    readonly connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
    readonly batteryLevel?: number;           // 0-1, if available
    readonly storageAvailable: number;        // bytes
    readonly processingCapacity: 'high' | 'medium' | 'low';
  };
}

/**
 * Device fleet for a user with subscription context
 */
export interface UserDeviceFleet {
  readonly userId: string;
  readonly subscriptionTier: SubscriptionTier;
  readonly devices: readonly DeviceInfo[];
  readonly activeDevices: readonly string[];   // Currently online device IDs
  readonly primaryDevice?: string;             // Primary device ID
  readonly crisisDevices: readonly string[];   // Devices capable of crisis response
  readonly fleetLimits: {
    readonly maxDevices: number;               // Based on subscription tier
    readonly maxActiveDevices: number;
    readonly prioritizedDevices: readonly string[]; // Get priority in resource conflicts
  };
  readonly coordinationMetadata: {
    readonly lastFleetSync: string;
    readonly sessionCoordination: boolean;
    readonly conflictResolutionStrategy: 'primary_wins' | 'latest_wins' | 'user_chooses' | 'clinical_priority';
    readonly crisisCoordinationEnabled: boolean;
  };
}

/**
 * Session coordination across devices
 */
export interface CrossDeviceSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly sessionType: 'check_in' | 'assessment' | 'breathing' | 'crisis' | 'widget_sync';
  readonly initiatingDevice: string;
  readonly participatingDevices: readonly string[];
  readonly sessionState: {
    readonly status: 'active' | 'paused' | 'completed' | 'transferred' | 'crisis_interrupted';
    readonly currentStep: number;
    readonly totalSteps: number;
    readonly progress: number;                 // 0-1
    readonly lastActivity: string;
  };
  readonly handoffCapability: {
    readonly canHandoff: boolean;
    readonly eligibleDevices: readonly string[];
    readonly handoffPreservesState: boolean;
    readonly therapeuticContinuityMaintained: boolean;
  };
  readonly crisisContext: {
    readonly crisisMode: boolean;
    readonly emergencyDevicePreference?: string; // Device best for crisis response
    readonly allDevicesNotified: boolean;
    readonly crisisResourcesSynced: boolean;
  };
  readonly dataSync: {
    readonly encryptedState: string;           // Encrypted session state
    readonly stateChecksum: string;
    readonly lastStateUpdate: string;
    readonly conflictDetected: boolean;
  };
}

/**
 * Device sync priority with subscription awareness
 */
export interface DeviceSyncPriority {
  readonly deviceId: string;
  readonly basePriority: number;               // 1-10
  readonly subscriptionMultiplier: number;    // Based on tier
  readonly effectivePriority: number;         // Final calculated priority
  readonly priorityFactors: {
    readonly subscriptionTier: SubscriptionTier;
    readonly isPrimaryDevice: boolean;
    readonly crisisCapable: boolean;
    readonly connectionQuality: number;        // 0-1
    readonly batterLevel: number;              // 0-1
    readonly userPreference: number;           // 0-1
  };
  readonly resourceAllocation: {
    readonly bandwidthAllocation: number;      // bytes/second
    readonly syncFrequencyBonus: number;       // multiplier for sync frequency
    readonly queuePriorityBoost: number;       // queue position improvement
  };
}

// ============================================================================
// CROSS-DEVICE SYNC OPERATIONS
// ============================================================================

/**
 * Cross-device sync request
 */
export interface CrossDeviceSyncRequest {
  readonly requestId: string;
  readonly userId: string;
  readonly operation: SyncOperation;
  readonly targetDevices: readonly string[]; // Specific devices to sync to
  readonly broadcastToFleet: boolean;        // Send to all devices
  readonly priority: SyncPriorityLevel;
  readonly subscriptionContext: {
    readonly tier: SubscriptionTier;
    readonly deviceLimitsEnforced: boolean;
    readonly priorityTierApplied: boolean;
  };
  readonly coordination: {
    readonly requiresOrchestration: boolean;
    readonly conflictResolutionStrategy: string;
    readonly sessionPreservation: boolean;
    readonly therapeuticContinuity: boolean;
  };
  readonly crisisContext: {
    readonly crisisMode: boolean;
    readonly emergencyBroadcast: boolean;
    readonly overrideDeviceLimits: boolean;
    readonly requireImmediateResponse: boolean;
  };
  readonly performance: {
    readonly maxResponseTime: number;          // ms
    readonly allowPartialSuccess: boolean;
    readonly retryOnFailure: boolean;
    readonly trackDelivery: boolean;
  };
}

/**
 * Cross-device sync response
 */
export interface CrossDeviceSyncResponse {
  readonly requestId: string;
  readonly overallStatus: 'success' | 'partial_success' | 'failure' | 'crisis_override';
  readonly deviceResults: readonly {
    readonly deviceId: string;
    readonly status: 'delivered' | 'failed' | 'offline' | 'rejected' | 'crisis_activated';
    readonly responseTime: number;             // ms
    readonly syncCompleted: boolean;
    readonly errorMessage?: string;
    readonly dataIntegrityVerified: boolean;
  }[];
  readonly performance: {
    readonly totalResponseTime: number;        // ms
    readonly averageDeviceResponseTime: number;
    readonly successRate: number;              // 0-1
    readonly crisisResponseCompliant: boolean; // <200ms for crisis
  };
  readonly conflicts: readonly {
    readonly deviceId: string;
    readonly conflictType: string;
    readonly resolution: string;
    readonly dataIntegrityMaintained: boolean;
  }[];
  readonly coordinationMetadata: {
    readonly devicesReached: number;
    readonly devicesSuccessful: number;
    readonly sessionsContinued: number;
    readonly therapeuticContinuityPreserved: boolean;
  };
}

/**
 * Device fleet sync status
 */
export interface DeviceFleetSyncStatus {
  readonly userId: string;
  readonly fleetId: string;
  readonly timestamp: string;
  readonly overallHealth: 'healthy' | 'degraded' | 'critical' | 'crisis_mode';
  readonly devices: readonly {
    readonly deviceId: string;
    readonly syncStatus: 'synced' | 'syncing' | 'behind' | 'conflict' | 'offline';
    readonly lastSync: string;
    readonly pendingOperations: number;
    readonly dataIntegrity: 'verified' | 'corrupted' | 'unknown';
    readonly crisisReady: boolean;
  }[];
  readonly subscriptionCompliance: {
    readonly withinDeviceLimits: boolean;
    readonly tierRestrictionsApplied: boolean;
    readonly prioritizationActive: boolean;
  };
  readonly sessionCoordination: {
    readonly activeSessions: number;
    readonly handoffCapable: boolean;
    readonly crisisCoordinationReady: boolean;
  };
  readonly performance: {
    readonly averageSyncLatency: number;       // ms
    readonly syncSuccessRate: number;          // 0-1
    readonly conflictRate: number;             // 0-1
    readonly crisisResponseTime: number;       // ms
  };
}

// ============================================================================
// WEBHOOK INTEGRATION FOR REAL-TIME COORDINATION
// ============================================================================

/**
 * Cross-device webhook event for real-time sync coordination
 */
export interface CrossDeviceWebhookEvent {
  readonly eventId: string;
  readonly eventType: CrossDeviceWebhookEventType;
  readonly timestamp: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly targetDevices: readonly string[];
  readonly payload: {
    readonly operation?: SyncOperation;
    readonly sessionUpdate?: Partial<CrossDeviceSession>;
    readonly crisisActivation?: {
      readonly emergencyId: string;
      readonly crisisType: string;
      readonly immediateAction: boolean;
    };
    readonly subscriptionChange?: {
      readonly newTier: SubscriptionTier;
      readonly deviceLimitChanged: boolean;
      readonly priorityChanged: boolean;
    };
  };
  readonly delivery: {
    readonly priority: 'immediate' | 'high' | 'normal' | 'low';
    readonly requiresAcknowledgment: boolean;
    readonly retryOnFailure: boolean;
    readonly expireAfter: number;              // seconds
  };
  readonly security: {
    readonly encrypted: boolean;
    readonly signature: string;
    readonly deviceAuthenticated: boolean;
  };
}

/**
 * Types of cross-device webhook events
 */
export enum CrossDeviceWebhookEventType {
  SYNC_OPERATION = 'sync_operation',
  SESSION_HANDOFF = 'session_handoff',
  SESSION_UPDATE = 'session_update',
  CRISIS_ACTIVATION = 'crisis_activation',
  CRISIS_RESOLUTION = 'crisis_resolution',
  DEVICE_ADDED = 'device_added',
  DEVICE_REMOVED = 'device_removed',
  SUBSCRIPTION_CHANGED = 'subscription_changed',
  CONFLICT_DETECTED = 'conflict_detected',
  CONFLICT_RESOLVED = 'conflict_resolved',
  FLEET_STATUS_UPDATE = 'fleet_status_update'
}

/**
 * Real-time coordination message
 */
export interface RealTimeCoordinationMessage {
  readonly messageId: string;
  readonly messageType: 'sync_update' | 'session_handoff' | 'crisis_alert' | 'conflict_resolution';
  readonly timestamp: string;
  readonly fromDevice: string;
  readonly toDevices: readonly string[];
  readonly priority: SyncPriorityLevel;
  readonly payload: unknown;
  readonly acknowledgment: {
    readonly required: boolean;
    readonly timeout: number;                  // seconds
    readonly receivedBy: readonly string[];
    readonly acknowledged: boolean;
  };
  readonly crisisContext: {
    readonly isCrisisMessage: boolean;
    readonly requiresImmediateAction: boolean;
    readonly safetyPriority: boolean;
  };
}

// ============================================================================
// CROSS-DEVICE COORDINATION API INTERFACES
// ============================================================================

/**
 * Device Fleet Management API
 */
export interface IDeviceFleetManagementAPI {
  /**
   * Register device in user's fleet
   */
  registerDevice(
    userId: string,
    deviceInfo: DeviceInfo,
    subscriptionTier: SubscriptionTier
  ): Promise<{
    registered: boolean;
    deviceId: string;
    fleetPosition: number;
    withinSubscriptionLimits: boolean;
    priority: DeviceSyncPriority;
  }>;

  /**
   * Get user's device fleet
   */
  getUserDeviceFleet(userId: string): Promise<UserDeviceFleet>;

  /**
   * Update device status and capabilities
   */
  updateDeviceStatus(
    deviceId: string,
    status: Partial<DeviceInfo>
  ): Promise<{ updated: boolean; fleetRebalanced: boolean }>;

  /**
   * Remove device from fleet
   */
  removeDevice(
    userId: string,
    deviceId: string
  ): Promise<{ removed: boolean; sessionsMigrated: number; dataPreserved: boolean }>;

  /**
   * Calculate device sync priorities
   */
  calculateDevicePriorities(
    userId: string,
    subscriptionTier: SubscriptionTier
  ): Promise<readonly DeviceSyncPriority[]>;

  /**
   * Enforce subscription tier device limits
   */
  enforceDeviceLimits(
    userId: string,
    subscriptionTier: SubscriptionTier
  ): Promise<{
    withinLimits: boolean;
    devicesDeactivated: readonly string[];
    priorityRebalanced: boolean;
  }>;
}

/**
 * Session Coordination API
 */
export interface ISessionCoordinationAPI {
  /**
   * Create cross-device session
   */
  createCrossDeviceSession(
    userId: string,
    sessionType: CrossDeviceSession['sessionType'],
    initiatingDevice: string
  ): Promise<CrossDeviceSession>;

  /**
   * Update session state across devices
   */
  updateSessionState(
    sessionId: string,
    stateUpdate: Partial<CrossDeviceSession['sessionState']>,
    sourceDevice: string
  ): Promise<{
    updated: boolean;
    devicesNotified: readonly string[];
    conflictsDetected: readonly string[];
  }>;

  /**
   * Handoff session to another device
   */
  handoffSession(
    sessionId: string,
    fromDevice: string,
    toDevice: string,
    preserveTherapeuticContinuity: boolean
  ): Promise<{
    handoffSuccessful: boolean;
    statePreserved: boolean;
    therapeuticContinuityMaintained: boolean;
    responseTime: number;
  }>;

  /**
   * Handle session conflicts
   */
  resolveSessionConflict(
    sessionId: string,
    conflictingDevices: readonly string[],
    resolutionStrategy: string
  ): Promise<{
    conflictResolved: boolean;
    winningDevice: string;
    dataIntegrityPreserved: boolean;
    therapeuticImpact: 'none' | 'minimal' | 'significant';
  }>;

  /**
   * Activate crisis mode across all devices
   */
  activateCrisisModeAcrossDevices(
    userId: string,
    crisisContext: {
      emergencyId: string;
      crisisType: string;
      sourceDevice: string;
    }
  ): Promise<{
    devicesActivated: readonly string[];
    responseTime: number;
    crisisResourcesDeployed: boolean;
    therapeuticContinuityPreserved: boolean;
  }>;
}

/**
 * Cross-Device Sync Operations API
 */
export interface ICrossDeviceSyncOperationsAPI {
  /**
   * Execute cross-device sync operation
   */
  executeCrossDeviceSync(request: CrossDeviceSyncRequest): Promise<CrossDeviceSyncResponse>;

  /**
   * Broadcast operation to all user devices
   */
  broadcastToDeviceFleet(
    userId: string,
    operation: SyncOperation,
    priority: SyncPriorityLevel,
    crisisMode: boolean
  ): Promise<{
    devicesReached: readonly string[];
    devicesSuccessful: readonly string[];
    devicesFailed: readonly string[];
    averageResponseTime: number;
  }>;

  /**
   * Synchronize specific data across device subset
   */
  syncToDeviceSubset(
    targetDevices: readonly string[],
    operation: SyncOperation,
    coordinationRequired: boolean
  ): Promise<{
    successfulDevices: readonly string[];
    failedDevices: readonly string[];
    conflictsDetected: readonly string[];
    dataIntegrityMaintained: boolean;
  }>;

  /**
   * Get device fleet sync status
   */
  getDeviceFleetSyncStatus(userId: string): Promise<DeviceFleetSyncStatus>;

  /**
   * Force sync reconciliation across all devices
   */
  forceSyncReconciliation(
    userId: string,
    entityType?: SyncEntityType
  ): Promise<{
    reconciled: boolean;
    conflictsResolved: number;
    dataIntegrityVerified: boolean;
    operationsProcessed: number;
  }>;
}

/**
 * Real-Time Coordination API
 */
export interface IRealTimeCoordinationAPI {
  /**
   * Send real-time coordination message
   */
  sendCoordinationMessage(message: RealTimeCoordinationMessage): Promise<{
    sent: boolean;
    devicesReached: readonly string[];
    acknowledgments: readonly string[];
    responseTime: number;
  }>;

  /**
   * Setup webhook endpoints for device coordination
   */
  setupDeviceWebhooks(
    userId: string,
    deviceEndpoints: Record<string, string>
  ): Promise<{
    configured: boolean;
    endpointsVerified: readonly string[];
    securityValidated: boolean;
  }>;

  /**
   * Process incoming webhook event
   */
  processWebhookEvent(event: CrossDeviceWebhookEvent): Promise<{
    processed: boolean;
    actionsTriggered: readonly string[];
    devicesNotified: readonly string[];
    conflictsDetected: readonly string[];
  }>;

  /**
   * Monitor real-time coordination health
   */
  monitorCoordinationHealth(userId: string): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    deviceConnectivity: Record<string, boolean>;
    messageLatency: number;        // ms
    acknowledgmentRate: number;    // 0-1
    webhookReliability: number;    // 0-1
  }>;

  /**
   * Handle coordination failures
   */
  handleCoordinationFailure(
    failureType: 'device_offline' | 'webhook_failure' | 'message_timeout' | 'conflict_unresolved',
    context: {
      userId: string;
      affectedDevices: readonly string[];
      failureDetails: string;
    }
  ): Promise<{
    failureHandled: boolean;
    fallbackMeasures: readonly string[];
    dataIntegrityPreserved: boolean;
    therapeuticContinuityMaintained: boolean;
  }>;
}

// ============================================================================
// UNIFIED CROSS-DEVICE COORDINATION API
// ============================================================================

/**
 * Main Cross-Device Sync Coordination API
 */
export interface ICrossDeviceSyncCoordinationAPI extends
  IDeviceFleetManagementAPI,
  ISessionCoordinationAPI,
  ICrossDeviceSyncOperationsAPI,
  IRealTimeCoordinationAPI {

  /**
   * Initialize cross-device coordination
   */
  initializeCoordination(config: {
    subscriptionTierLimits: Record<SubscriptionTier, {
      maxDevices: number;
      maxActiveDevices: number;
      priorityMultiplier: number;
    }>;
    webhookConfiguration: {
      endpoints: Record<string, string>;
      security: {
        signatureValidation: boolean;
        encryptionRequired: boolean;
      };
    };
    crisisCoordination: {
      enabled: boolean;
      maxResponseTime: number;      // ms
      requiresAllDeviceNotification: boolean;
    };
    performanceTargets: {
      maxSyncLatency: number;       // ms
      minSuccessRate: number;       // 0-1
      maxConflictRate: number;      // 0-1
    };
  }): Promise<void>;

  /**
   * Orchestrate complete cross-device sync
   */
  orchestrateCompleteSync(
    userId: string,
    operations: readonly SyncOperation[],
    priority: SyncPriorityLevel,
    crisisMode: boolean
  ): Promise<{
    orchestrationId: string;
    overallSuccess: boolean;
    deviceResults: Record<string, CrossDeviceSyncResponse>;
    sessionsContinued: number;
    therapeuticContinuityPreserved: boolean;
    performanceMetrics: {
      totalTime: number;
      averageDeviceResponseTime: number;
      conflictsResolved: number;
      dataIntegrityMaintained: boolean;
    };
  }>;

  /**
   * Handle subscription tier change across device fleet
   */
  handleSubscriptionTierChange(
    userId: string,
    newTier: SubscriptionTier,
    effectiveDate: string
  ): Promise<{
    fleetUpdated: boolean;
    deviceLimitsEnforced: boolean;
    prioritiesRebalanced: boolean;
    devicesDeactivated: readonly string[];
    syncCapabilitiesAdjusted: boolean;
  }>;

  /**
   * Emergency coordination for crisis situations
   */
  emergencyCoordination(
    userId: string,
    emergencyContext: {
      emergencyId: string;
      crisisType: string;
      sourceDevice: string;
      requiresImmediateResponse: boolean;
    }
  ): Promise<{
    emergencyActivated: boolean;
    allDevicesNotified: boolean;
    crisisResourcesDeployed: boolean;
    responseTime: number;          // must be <200ms
    therapeuticContinuityPreserved: boolean;
    fallbackMeasuresActivated: readonly string[];
  }>;

  /**
   * Health check for cross-device coordination
   */
  coordinationHealthCheck(userId: string): Promise<{
    status: 'healthy' | 'degraded' | 'critical' | 'crisis_ready';
    deviceFleetHealth: {
      totalDevices: number;
      onlineDevices: number;
      syncCapableDevices: number;
      crisisCapableDevices: number;
    };
    sessionCoordination: {
      activeSessions: number;
      handoffCapable: boolean;
      conflictResolutionReady: boolean;
    };
    realTimeCoordination: {
      webhookConnectivity: number;   // 0-1
      messageLatency: number;        // ms
      acknowledgmentRate: number;    // 0-1
    };
    subscriptionCompliance: {
      withinDeviceLimits: boolean;
      tierRestrictionsApplied: boolean;
      prioritizationActive: boolean;
    };
    lastHealthCheck: string;
  }>;
}

/**
 * Cross-device coordination configuration
 */
export interface CrossDeviceCoordinationConfig {
  readonly subscriptionTierLimits: Record<SubscriptionTier, {
    readonly maxDevices: number;
    readonly maxActiveDevices: number;
    readonly priorityMultiplier: number;
    readonly bandwidthAllocation: number;      // bytes/second per device
    readonly concurrentSyncOperations: number;
  }>;
  readonly sessionCoordination: {
    readonly enabled: boolean;
    readonly handoffTimeout: number;           // seconds
    readonly statePreservationRequired: boolean;
    readonly therapeuticContinuityRequired: boolean;
    readonly conflictResolutionStrategy: 'primary_wins' | 'latest_wins' | 'clinical_priority';
  };
  readonly crisisCoordination: {
    readonly enabled: boolean;
    readonly maxResponseTime: number;          // ms, must be <200ms
    readonly requiresAllDeviceNotification: boolean;
    readonly automaticResourceDeployment: boolean;
    readonly fallbackMeasures: readonly string[];
  };
  readonly webhookConfiguration: {
    readonly endpoints: Record<string, string>; // deviceType -> webhook URL pattern
    readonly security: {
      readonly signatureValidation: boolean;
      readonly encryptionRequired: boolean;
      readonly deviceAuthentication: boolean;
      readonly rateLimiting: {
        readonly requestsPerMinute: number;
        readonly burstLimit: number;
      };
    };
    readonly reliability: {
      readonly retryAttempts: number;
      readonly timeoutMs: number;
      readonly acknowledgmentRequired: boolean;
    };
  };
  readonly performanceTargets: {
    readonly maxSyncLatency: number;           // ms
    readonly minSuccessRate: number;           // 0-1
    readonly maxConflictRate: number;          // 0-1
    readonly crisisResponseTime: number;       // ms
  };
  readonly monitoring: {
    readonly realTimeMonitoring: boolean;
    readonly healthCheckInterval: number;      // seconds
    readonly alertThresholds: {
      readonly deviceOfflineThreshold: number; // percentage
      readonly syncFailureThreshold: number;   // percentage
      readonly conflictRateThreshold: number;  // percentage
    };
  };
}

// Export default configuration for FullMind mental health app
export const DEFAULT_CROSS_DEVICE_CONFIG: CrossDeviceCoordinationConfig = {
  subscriptionTierLimits: {
    trial: {
      maxDevices: 2,
      maxActiveDevices: 1,
      priorityMultiplier: 0.5,
      bandwidthAllocation: 25 * 1024,         // 25KB/s per device
      concurrentSyncOperations: 1,
    },
    basic: {
      maxDevices: 3,
      maxActiveDevices: 2,
      priorityMultiplier: 1.0,
      bandwidthAllocation: 50 * 1024,         // 50KB/s per device
      concurrentSyncOperations: 2,
    },
    premium: {
      maxDevices: 10,
      maxActiveDevices: 5,
      priorityMultiplier: 2.0,
      bandwidthAllocation: 200 * 1024,        // 200KB/s per device
      concurrentSyncOperations: 10,
    },
  },
  sessionCoordination: {
    enabled: true,
    handoffTimeout: 30,                        // 30 seconds
    statePreservationRequired: true,
    therapeuticContinuityRequired: true,       // Critical for mental health
    conflictResolutionStrategy: 'clinical_priority', // Prioritize clinical data integrity
  },
  crisisCoordination: {
    enabled: true,
    maxResponseTime: 200,                      // 200ms crisis response requirement
    requiresAllDeviceNotification: true,      // Notify all devices for crisis
    automaticResourceDeployment: true,
    fallbackMeasures: [
      'local_crisis_plan_activation',
      'emergency_contact_notification',
      'hotline_direct_dial',
      'offline_crisis_resources'
    ],
  },
  webhookConfiguration: {
    endpoints: {
      ios: '/webhooks/device/ios/{deviceId}',
      android: '/webhooks/device/android/{deviceId}',
      web: '/webhooks/device/web/{sessionId}',
      widget: '/webhooks/widget/{widgetId}',
    },
    security: {
      signatureValidation: true,
      encryptionRequired: true,
      deviceAuthentication: true,
      rateLimiting: {
        requestsPerMinute: 60,
        burstLimit: 10,
      },
    },
    reliability: {
      retryAttempts: 3,
      timeoutMs: 5000,
      acknowledgmentRequired: true,
    },
  },
  performanceTargets: {
    maxSyncLatency: 2000,                      // 2 seconds
    minSuccessRate: 0.95,                      // 95%
    maxConflictRate: 0.05,                     // 5%
    crisisResponseTime: 200,                   // 200ms for crisis
  },
  monitoring: {
    realTimeMonitoring: true,
    healthCheckInterval: 30,                   // 30 seconds
    alertThresholds: {
      deviceOfflineThreshold: 20,              // 20% devices offline
      syncFailureThreshold: 10,                // 10% sync failures
      conflictRateThreshold: 5,                // 5% conflict rate
    },
  },
} as const;