/**
 * Cross-Device Coordination API
 *
 * Multi-device sync coordination with therapeutic session preservation
 * - Device registration and authentication for cross-device sync
 * - Session continuity across devices with payment context
 * - Conflict resolution with therapeutic priority
 * - Device-specific sync policies based on subscription tier
 */

import { z } from 'zod';
import type { SubscriptionTier } from '../../types/subscription';
import type { SyncPriority } from '../sync/payment-sync-context-api';

/**
 * Device Information Schema
 */
export const DeviceInfoSchema = z.object({
  deviceId: z.string().min(1),
  deviceName: z.string(),
  platform: z.enum(['ios', 'android', 'web']),
  platformVersion: z.string(),
  appVersion: z.string(),

  // Device capabilities
  capabilities: z.object({
    hasSecureEnclave: z.boolean(),
    supportsBackgroundSync: z.boolean(),
    supportsPushNotifications: z.boolean(),
    hasLocationServices: z.boolean(),
    storageCapacity: z.number().positive(), // bytes
    networkType: z.enum(['wifi', 'cellular', 'unknown'])
  }),

  // Device status
  status: z.object({
    lastSeen: z.string(),
    isOnline: z.boolean(),
    batteryLevel: z.number().min(0).max(1).optional(),
    syncEnabled: z.boolean(),
    isPrimary: z.boolean()
  }),

  // Security context
  security: z.object({
    encryptionKeyHash: z.string(),
    certificateFingerprint: z.string(),
    lastSecurityUpdate: z.string(),
    biometricEnabled: z.boolean(),
    lockScreenEnabled: z.boolean()
  }),

  registeredAt: z.string(),
  lastUpdated: z.string()
});

export type DeviceInfo = z.infer<typeof DeviceInfoSchema>;

/**
 * Cross-Device Sync Session
 */
export const CrossDeviceSyncSessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string(),
  initiatingDeviceId: z.string(),
  targetDeviceIds: z.array(z.string()).min(1),

  // Session context
  sessionType: z.enum([
    'therapeutic_session_transfer',
    'assessment_continuation',
    'crisis_data_sync',
    'preference_sync',
    'full_device_sync',
    'selective_sync'
  ]),

  // Therapeutic context
  therapeuticContext: z.object({
    sessionInProgress: z.boolean(),
    sessionType: z.enum(['morning', 'midday', 'evening', 'assessment', 'crisis']).optional(),
    completionPercentage: z.number().min(0).max(1),
    criticalData: z.boolean(),
    preserveState: z.boolean()
  }),

  // Payment context
  paymentContext: z.object({
    subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),
    tierSupportsMultiDevice: z.boolean(),
    deviceLimit: z.number().positive(),
    currentDeviceCount: z.number().min(0),
    crossDeviceEnabled: z.boolean()
  }),

  // Sync configuration
  syncConfig: z.object({
    syncTypes: z.array(z.enum([
      'check_ins',
      'assessments',
      'user_profile',
      'crisis_plans',
      'session_data',
      'preferences',
      'analytics'
    ])),
    priority: z.number().min(1).max(10),
    conflictResolution: z.enum(['merge', 'latest_wins', 'user_chooses', 'therapeutic_priority']),
    encryptionRequired: z.boolean().default(true)
  }),

  // Session status
  status: z.enum(['pending', 'active', 'completed', 'failed', 'canceled']),
  progress: z.object({
    devicesConnected: z.number().min(0),
    dataTransferred: z.number().min(0), // bytes
    conflictsDetected: z.number().min(0),
    conflictsResolved: z.number().min(0),
    estimatedCompletion: z.string().optional()
  }),

  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional()
});

export type CrossDeviceSyncSession = z.infer<typeof CrossDeviceSyncSessionSchema>;

/**
 * Device Conflict Resolution
 */
export const DeviceConflictSchema = z.object({
  conflictId: z.string().uuid(),
  sessionId: z.string(),

  // Conflict context
  conflictType: z.enum([
    'data_version_mismatch',
    'concurrent_modification',
    'device_time_skew',
    'therapeutic_session_overlap',
    'assessment_score_divergence',
    'crisis_data_conflict'
  ]),

  // Conflicting devices
  devices: z.object({
    device1: z.object({
      deviceId: z.string(),
      lastModified: z.string(),
      version: z.number().positive(),
      dataChecksum: z.string()
    }),
    device2: z.object({
      deviceId: z.string(),
      lastModified: z.string(),
      version: z.number().positive(),
      dataChecksum: z.string()
    })
  }),

  // Conflict data
  conflictData: z.object({
    entityType: z.string(),
    entityId: z.string(),
    localData: z.any(),
    remoteData: z.any(),
    therapeuticImpact: z.enum(['none', 'low', 'medium', 'high', 'critical'])
  }),

  // Resolution strategy
  resolutionStrategy: z.enum([
    'automatic_merge',
    'latest_timestamp',
    'user_intervention',
    'therapeutic_priority',
    'clinical_validation_required'
  ]),

  // Resolution result
  resolution: z.object({
    resolved: z.boolean(),
    selectedData: z.any().optional(),
    mergedData: z.any().optional(),
    userChoice: z.boolean(),
    therapeuticValidated: z.boolean(),
    resolvedAt: z.string().optional()
  }).optional(),

  detectedAt: z.string()
});

export type DeviceConflict = z.infer<typeof DeviceConflictSchema>;

/**
 * Therapeutic Session Transfer
 */
export const TherapeuticSessionTransferSchema = z.object({
  transferId: z.string().uuid(),
  sessionId: z.string(),
  fromDeviceId: z.string(),
  toDeviceId: z.string(),
  userId: z.string(),

  // Session data
  sessionData: z.object({
    sessionType: z.enum(['morning', 'midday', 'evening', 'assessment', 'crisis']),
    currentStep: z.number().min(0),
    totalSteps: z.number().positive(),
    progress: z.record(z.any()),
    timeElapsed: z.number().min(0), // milliseconds
    remainingTime: z.number().min(0).optional()
  }),

  // Transfer context
  transferContext: z.object({
    transferReason: z.enum([
      'user_requested',
      'device_switch',
      'battery_low',
      'network_issues',
      'device_lost',
      'crisis_escalation'
    ]),
    preserveExactState: z.boolean(),
    allowDataLoss: z.boolean().default(false),
    requiresUserConfirmation: z.boolean()
  }),

  // Payment validation
  paymentValidation: z.object({
    tierSupportsTransfer: z.boolean(),
    crossDeviceQuotaAvailable: z.boolean(),
    transferAllowed: z.boolean(),
    upgradeRequired: z.boolean().optional()
  }),

  // Transfer status
  status: z.enum(['pending', 'transferring', 'completed', 'failed', 'canceled']),
  transferMetrics: z.object({
    dataSize: z.number().min(0),
    transferTime: z.number().min(0),
    successRate: z.number().min(0).max(1),
    integrityVerified: z.boolean()
  }).optional(),

  initiatedAt: z.string(),
  completedAt: z.string().optional()
});

export type TherapeuticSessionTransfer = z.infer<typeof TherapeuticSessionTransferSchema>;

/**
 * Cross-Device Coordination API Class
 */
export class CrossDeviceCoordinationAPI {
  private baseUrl: string;
  private apiKey: string;
  private defaultTimeout: number;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    defaultTimeout?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultTimeout = config.defaultTimeout || 15000;
  }

  /**
   * Register device for cross-device sync
   */
  async registerDevice(
    userId: string,
    deviceInfo: DeviceInfo,
    subscriptionTier: SubscriptionTier
  ): Promise<{
    registered: boolean;
    deviceId: string;
    withinDeviceLimit: boolean;
    crossDeviceEnabled: boolean;
    encryptionKeyExchanged: boolean;
    syncCapabilities: string[];
  }> {
    try {
      const validatedDeviceInfo = DeviceInfoSchema.parse(deviceInfo);

      const response = await this.makeRequest('POST', '/cross-device/register', {
        userId,
        deviceInfo: validatedDeviceInfo,
        subscriptionTier,
        registeredAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Device registration failed: ${error}`);
    }
  }

  /**
   * Get registered devices for user
   */
  async getUserDevices(userId: string): Promise<{
    devices: DeviceInfo[];
    primaryDevice: string;
    totalDevices: number;
    deviceLimit: number;
    crossDeviceEnabled: boolean;
  }> {
    try {
      const response = await this.makeRequest('GET', `/cross-device/devices/${userId}`);
      return response;
    } catch (error) {
      throw new Error(`User devices query failed: ${error}`);
    }
  }

  /**
   * Initiate cross-device sync session
   */
  async initiateSyncSession(
    session: CrossDeviceSyncSession
  ): Promise<{
    sessionId: string;
    initiated: boolean;
    devicesConnected: number;
    estimatedDuration: number;
    encryptionVerified: boolean;
  }> {
    try {
      const validatedSession = CrossDeviceSyncSessionSchema.parse(session);

      const response = await this.makeRequest('POST', '/cross-device/sync/initiate', validatedSession);
      return response;
    } catch (error) {
      throw new Error(`Sync session initiation failed: ${error}`);
    }
  }

  /**
   * Transfer therapeutic session between devices
   */
  async transferTherapeuticSession(
    transfer: TherapeuticSessionTransfer
  ): Promise<{
    transferred: boolean;
    sessionPreserved: boolean;
    dataIntegrityVerified: boolean;
    targetDeviceReady: boolean;
    transferTime: number;
  }> {
    try {
      const validatedTransfer = TherapeuticSessionTransferSchema.parse(transfer);

      const response = await this.makeRequest('POST', '/cross-device/transfer', validatedTransfer);
      return response;
    } catch (error) {
      throw new Error(`Therapeutic session transfer failed: ${error}`);
    }
  }

  /**
   * Resolve device conflict with therapeutic priority
   */
  async resolveDeviceConflict(
    conflictId: string,
    resolution: {
      strategy: 'automatic' | 'user_choice' | 'therapeutic_priority';
      selectedData?: any;
      userJustification?: string;
    }
  ): Promise<{
    resolved: boolean;
    finalData: any;
    therapeuticContinuityMaintained: boolean;
    conflictStrategy: string;
    requiresValidation: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', `/cross-device/conflicts/${conflictId}/resolve`, {
        ...resolution,
        resolvedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Device conflict resolution failed: ${error}`);
    }
  }

  /**
   * Validate cross-device sync eligibility
   */
  async validateSyncEligibility(
    userId: string,
    deviceIds: string[],
    syncType: string
  ): Promise<{
    eligible: boolean;
    tierSupported: boolean;
    devicesWithinLimit: boolean;
    allDevicesOnline: boolean;
    encryptionConsistent: boolean;
    quotaAvailable: boolean;
    restrictions: string[];
  }> {
    try {
      const response = await this.makeRequest('POST', '/cross-device/validate', {
        userId,
        deviceIds,
        syncType,
        validatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Cross-device sync validation failed: ${error}`);
    }
  }

  /**
   * Get sync session status
   */
  async getSyncSessionStatus(sessionId: string): Promise<{
    session: CrossDeviceSyncSession;
    realTimeStatus: {
      activeConnections: number;
      dataTransferRate: number;
      completionPercentage: number;
      estimatedTimeRemaining: number;
    };
    conflicts: DeviceConflict[];
    performance: {
      averageLatency: number;
      throughput: number;
      errorRate: number;
    };
  }> {
    try {
      const response = await this.makeRequest('GET', `/cross-device/sync/${sessionId}/status`);
      return response;
    } catch (error) {
      throw new Error(`Sync session status query failed: ${error}`);
    }
  }

  /**
   * Cancel sync session
   */
  async cancelSyncSession(
    sessionId: string,
    reason: string,
    preservePartialSync: boolean = true
  ): Promise<{
    canceled: boolean;
    partialDataPreserved: boolean;
    devicesNotified: number;
    rollbackRequired: boolean;
  }> {
    try {
      const response = await this.makeRequest('DELETE', `/cross-device/sync/${sessionId}`, {
        reason,
        preservePartialSync,
        canceledAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Sync session cancellation failed: ${error}`);
    }
  }

  /**
   * Set device as primary for sync coordination
   */
  async setPrimaryDevice(
    userId: string,
    deviceId: string
  ): Promise<{
    updated: boolean;
    previousPrimary: string;
    newPrimary: string;
    syncPoliciesUpdated: boolean;
  }> {
    try {
      const response = await this.makeRequest('PUT', `/cross-device/primary/${userId}`, {
        deviceId,
        updatedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Primary device update failed: ${error}`);
    }
  }

  /**
   * Get cross-device sync analytics
   */
  async getSyncAnalytics(
    userId: string,
    timeframe: '24h' | '7d' | '30d'
  ): Promise<{
    syncSessions: number;
    dataTransferred: number;
    conflictsResolved: number;
    averageSessionDuration: number;
    deviceUsagePatterns: Array<{
      deviceId: string;
      usage: number;
      lastUsed: string;
    }>;
    therapeuticSessionTransfers: number;
    successRate: number;
  }> {
    try {
      const response = await this.makeRequest('GET', `/cross-device/analytics/${userId}`, {
        params: { timeframe }
      });

      return response;
    } catch (error) {
      throw new Error(`Sync analytics query failed: ${error}`);
    }
  }

  /**
   * Emergency device access during crisis
   */
  async grantEmergencyDeviceAccess(
    userId: string,
    deviceId: string,
    crisisLevel: string,
    justification: string
  ): Promise<{
    accessGranted: boolean;
    emergencyCode: string;
    accessLevel: string;
    expiresAt: string;
    crisisDataAvailable: boolean;
  }> {
    try {
      const response = await this.makeRequest('POST', '/cross-device/emergency-access', {
        userId,
        deviceId,
        crisisLevel,
        justification,
        grantedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Emergency device access failed: ${error}`);
    }
  }

  /**
   * Private helper methods
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Client-Version': '1.0.0',
      'X-Request-ID': crypto.randomUUID(),
      'X-Cross-Device': 'true'
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.defaultTimeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Device Sync Tier Limits
 */
export const DEVICE_TIER_LIMITS: Record<SubscriptionTier, {
  maxDevices: number;
  crossDeviceSync: boolean;
  realTimeSync: boolean;
  sessionTransfer: boolean;
  conflictResolution: boolean;
}> = {
  trial: {
    maxDevices: 1,
    crossDeviceSync: false,
    realTimeSync: false,
    sessionTransfer: false,
    conflictResolution: false
  },
  basic: {
    maxDevices: 3,
    crossDeviceSync: true,
    realTimeSync: false,
    sessionTransfer: true,
    conflictResolution: true
  },
  premium: {
    maxDevices: 10,
    crossDeviceSync: true,
    realTimeSync: true,
    sessionTransfer: true,
    conflictResolution: true
  },
  grace_period: {
    maxDevices: 1,
    crossDeviceSync: false,
    realTimeSync: false,
    sessionTransfer: false,
    conflictResolution: false
  }
};

/**
 * Therapeutic Session Transfer Priority
 */
export const THERAPEUTIC_TRANSFER_PRIORITIES: Record<string, SyncPriority> = {
  crisis: 10,        // Crisis Emergency
  assessment: 8,     // Emergency Low
  morning: 5,        // High
  midday: 4,         // Elevated
  evening: 5         // High
};

export default CrossDeviceCoordinationAPI;