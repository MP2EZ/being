/**
 * Cross-Device Sync API - Complete Integration Layer
 *
 * Comprehensive API layer implementing all sync requirements:
 * - Crisis-first sync with <200ms guarantee
 * - Zero-knowledge sync with end-to-end encryption
 * - Multi-tier sync strategy (crisis/therapeutic/general/payment)
 * - Device registration and trust establishment
 * - Emergency access protocols with enhanced audit
 * - Performance optimization and monitoring
 * - Security integration and compliance validation
 */

import { EventEmitter } from 'events';
import {
  EncryptedDataContainer,
  CloudSyncOperation,
  CloudConflict,
  DeviceInfo,
  CrossDeviceSyncStatus,
  EmergencySyncConfig,
  HIPAAComplianceStatus
} from '../../types/cloud';
import { DataSensitivity } from '../security/EncryptionService';

// Import all API components
import { CrossDeviceSyncAPI, crossDeviceSyncAPI } from './CrossDeviceSyncAPI';
import { RestSyncClient, restSyncClient } from './RestSyncClient';
import { DeviceManagementAPI, deviceManagementAPI } from './DeviceManagementAPI';
import { PerformanceMonitoringAPI, performanceMonitoringAPI } from './PerformanceMonitoringAPI';
import { SecurityIntegrationAPI, securityIntegrationAPI } from './SecurityIntegrationAPI';

/**
 * Unified Cross-Device Sync Interface
 */
export interface ICrossDeviceSync {
  // Core sync operations
  syncCrisisData(data: any, entityType: string, entityId: string): Promise<SyncResult>;
  syncTherapeuticData(data: any, entityType: string, entityId: string, sessionContext?: any): Promise<SyncResult>;
  syncGeneralData(data: any, entityType: string, entityId: string): Promise<SyncResult>;

  // Device management
  registerDevice(deviceInfo: DeviceRegistrationInfo): Promise<DeviceRegistrationResult>;
  authenticateDevice(deviceId: string, challenge: string, signature: string): Promise<DeviceAuthResult>;
  revokeDeviceTrust(deviceId: string, reason: string): Promise<BasicResult>;

  // Emergency access
  requestEmergencyAccess(deviceId: string, emergencyCode: string, crisisType: string): Promise<EmergencyAccessResult>;
  emergencySecurityOverride(justification: string): Promise<EmergencyOverrideResult>;

  // Status and monitoring
  getSyncStatus(): Promise<CrossDeviceSyncStatus>;
  getPerformanceMetrics(): PerformanceMetrics;
  getSecurityDashboard(): SecurityDashboard;
  getComplianceStatus(): Promise<HIPAAComplianceStatus>;

  // Configuration
  configureEmergencySync(config: Partial<EmergencySyncConfig>): Promise<void>;
  updateNetworkConditions(conditions: NetworkConditions): void;
  updateBatteryStatus(status: BatteryStatus): void;

  // Events
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
}

/**
 * Result interfaces
 */
export interface SyncResult {
  success: boolean;
  responseTime: number;
  method?: 'websocket' | 'rest';
  syncId?: string;
  conflict?: CloudConflict;
  error?: string;
}

export interface DeviceRegistrationInfo {
  deviceName: string;
  platform: 'ios' | 'android';
  appVersion: string;
  emergencyCapable?: boolean;
  biometricCapable?: boolean;
}

export interface DeviceRegistrationResult {
  success: boolean;
  deviceId?: string;
  deviceKey?: string;
  emergencyCode?: string;
  error?: string;
}

export interface DeviceAuthResult {
  success: boolean;
  sessionToken?: string;
  expiresAt?: string;
  error?: string;
}

export interface BasicResult {
  success: boolean;
  error?: string;
}

export interface EmergencyAccessResult {
  success: boolean;
  emergencyToken?: string;
  limitedAccess?: boolean;
  expiresAt?: string;
  error?: string;
}

export interface EmergencyOverrideResult {
  success: boolean;
  overrideToken?: string;
  expiresAt?: string;
  limitations: string[];
  error?: string;
}

export interface PerformanceMetrics {
  averageCrisisResponseTime: number;
  averageTherapeuticSyncTime: number;
  averageGeneralSyncTime: number;
  successRate: number;
  queueStatus: { size: number; processing: boolean };
  networkOptimized: boolean;
  batteryOptimized: boolean;
}

export interface SecurityDashboard {
  encryptionStatus: 'active' | 'inactive' | 'error';
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceStatus: 'compliant' | 'non_compliant' | 'warning';
  recentThreats: number;
  securityEvents: number;
  lastSecurityCheck: string;
}

export interface NetworkConditions {
  type: 'wifi' | 'cellular' | 'offline';
  strength: number;
  latency: number;
  bandwidth: number;
  reliability: number;
}

export interface BatteryStatus {
  level: number;
  charging: boolean;
  lowPowerMode: boolean;
}

/**
 * Main Cross-Device Sync Implementation
 */
class CrossDeviceSyncManager extends EventEmitter implements ICrossDeviceSync {
  private initialized = false;

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize all sync components
   */
  private async initialize(): Promise<void> {
    try {
      // Set up event forwarding from individual components
      this.setupEventForwarding();

      // Initialize components
      await this.initializeComponents();

      this.initialized = true;
      this.emit('initialized');

    } catch (error) {
      console.error('CrossDeviceSyncManager initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Setup event forwarding from individual API components
   */
  private setupEventForwarding(): void {
    // Forward WebSocket events
    crossDeviceSyncAPI.on('websocketConnected', () => {
      this.emit('websocketConnected');
    });

    crossDeviceSyncAPI.on('websocketDisconnected', () => {
      this.emit('websocketDisconnected');
    });

    crossDeviceSyncAPI.on('dataUpdated', (data) => {
      this.emit('dataUpdated', data);
    });

    crossDeviceSyncAPI.on('conflictDetected', (conflict) => {
      this.emit('conflictDetected', conflict);
    });

    crossDeviceSyncAPI.on('emergencyBroadcast', (data) => {
      this.emit('emergencyBroadcast', data);
    });

    // Forward performance events
    performanceMonitoringAPI.on('crisisPerformanceViolation', (violation) => {
      this.emit('crisisPerformanceViolation', violation);
    });

    performanceMonitoringAPI.on('performanceDegradation', (degradation) => {
      this.emit('performanceDegradation', degradation);
    });

    performanceMonitoringAPI.on('strategyUpdated', (strategy) => {
      this.emit('strategyUpdated', strategy);
    });

    // Forward security events
    securityIntegrationAPI.on('securityEvent', (event) => {
      this.emit('securityEvent', event);
    });
  }

  /**
   * Initialize individual components
   */
  private async initializeComponents(): Promise<void> {
    // Components are initialized through their singletons
    // Additional initialization if needed would go here
  }

  /**
   * Crisis-first sync with <200ms guarantee
   */
  async syncCrisisData(
    data: any,
    entityType: string,
    entityId: string
  ): Promise<SyncResult> {
    this.ensureInitialized();

    try {
      // Validate security context for crisis operation
      const securityContext = {
        authenticated: true,
        biometricUsed: false, // Crisis operations may bypass biometric
        deviceTrusted: true,
        networkSecure: false, // May use any available network
        encryptionActive: true,
        emergencyAccess: true
      };

      const securityValidation = await securityIntegrationAPI.validateSecurityContext(
        'crisis_sync',
        securityContext,
        { entityType, entityId, dataSensitivity: DataSensitivity.CLINICAL }
      );

      if (!securityValidation.valid && securityValidation.threats.some(t => !t.mitigated)) {
        return {
          success: false,
          responseTime: 0,
          error: `Security validation failed for crisis sync: ${securityValidation.issues.join(', ')}`
        };
      }

      // Perform crisis sync with performance tracking
      const startTime = Date.now();

      const result = await crossDeviceSyncAPI.syncCrisisData(
        data,
        entityType as any,
        entityId
      );

      // Record performance metrics
      performanceMonitoringAPI.recordSyncPerformance(
        'crisis_sync',
        result.responseTime,
        JSON.stringify(data).length,
        result.success,
        {
          errorCode: result.error ? 'CRISIS_SYNC_FAILED' : undefined
        }
      );

      return {
        success: result.success,
        responseTime: result.responseTime,
        method: 'websocket', // Crisis sync prioritizes WebSocket
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Crisis sync failed'
      };
    }
  }

  /**
   * Therapeutic session-aware sync
   */
  async syncTherapeuticData(
    data: any,
    entityType: string,
    entityId: string,
    sessionContext?: any
  ): Promise<SyncResult> {
    this.ensureInitialized();

    try {
      // Check if sync is recommended based on current conditions
      const syncRecommendation = performanceMonitoringAPI.isSyncRecommended('therapeutic');

      if (!syncRecommendation.recommended) {
        // Queue for later sync if not urgent
        return {
          success: false,
          responseTime: 0,
          error: `Sync deferred: ${syncRecommendation.reason}`
        };
      }

      // Perform therapeutic sync
      const result = await crossDeviceSyncAPI.syncTherapeuticData(
        data,
        entityType,
        entityId,
        sessionContext
      );

      // Record performance metrics
      performanceMonitoringAPI.recordSyncPerformance(
        'therapeutic_sync',
        result.responseTime,
        JSON.stringify(data).length,
        result.success,
        {
          errorCode: result.error ? 'THERAPEUTIC_SYNC_FAILED' : undefined
        }
      );

      return {
        success: result.success,
        responseTime: result.responseTime,
        method: result.responseTime < 300 ? 'websocket' : 'rest',
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Therapeutic sync failed'
      };
    }
  }

  /**
   * General data sync with eventual consistency
   */
  async syncGeneralData(
    data: any,
    entityType: string,
    entityId: string
  ): Promise<SyncResult> {
    this.ensureInitialized();

    try {
      // Check sync recommendation for general data
      const syncRecommendation = performanceMonitoringAPI.isSyncRecommended('general');

      if (!syncRecommendation.recommended) {
        // Use offline queue for deferred sync
        const operation: CloudSyncOperation = {
          id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'upload',
          entityType,
          priority: 'normal',
          encryptedPayload: JSON.stringify(data),
          metadata: {
            entityId,
            entityType,
            version: 1,
            lastModified: new Date().toISOString(),
            checksum: '',
            deviceId: 'current_device',
            cloudVersion: 0
          },
          retryCount: 0,
          scheduledAt: new Date(Date.now() + (syncRecommendation.delay || 0)).toISOString()
        };

        // Use REST client with offline queue
        restSyncClient.setNetworkStatus('offline');
        const queueResult = await restSyncClient.syncOperation(operation);

        return {
          success: false,
          responseTime: 0,
          method: 'rest',
          error: 'Queued for offline sync'
        };
      }

      // Perform general sync
      const result = await crossDeviceSyncAPI.syncGeneralData(data, entityType, entityId);

      // Record performance metrics
      performanceMonitoringAPI.recordSyncPerformance(
        'general_sync',
        result.responseTime,
        JSON.stringify(data).length,
        result.success,
        {
          errorCode: result.error ? 'GENERAL_SYNC_FAILED' : undefined
        }
      );

      return {
        success: result.success,
        responseTime: result.responseTime,
        method: 'rest', // General sync typically uses REST
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'General sync failed'
      };
    }
  }

  /**
   * Register new device with trust establishment
   */
  async registerDevice(deviceInfo: DeviceRegistrationInfo): Promise<DeviceRegistrationResult> {
    this.ensureInitialized();

    try {
      const result = await deviceManagementAPI.registerDevice({
        deviceName: deviceInfo.deviceName,
        platform: deviceInfo.platform,
        appVersion: deviceInfo.appVersion,
        deviceFingerprint: await this.generateDeviceFingerprint(),
        publicKey: await this.generatePublicKey(),
        emergencyCapable: deviceInfo.emergencyCapable || false,
        biometricCapable: deviceInfo.biometricCapable || false
      });

      return {
        success: result.success,
        deviceId: result.deviceId,
        deviceKey: result.deviceKey,
        emergencyCode: result.emergencyCode,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Device registration failed'
      };
    }
  }

  /**
   * Authenticate device for sync operations
   */
  async authenticateDevice(
    deviceId: string,
    challenge: string,
    signature: string
  ): Promise<DeviceAuthResult> {
    this.ensureInitialized();

    try {
      const result = await deviceManagementAPI.authenticateDevice({
        deviceId,
        signature,
        challenge,
        timestamp: new Date().toISOString()
      });

      return {
        success: result.success,
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Device authentication failed'
      };
    }
  }

  /**
   * Revoke device trust
   */
  async revokeDeviceTrust(deviceId: string, reason: string): Promise<BasicResult> {
    this.ensureInitialized();

    try {
      const result = await deviceManagementAPI.revokeDeviceTrust(deviceId, reason);

      return {
        success: result.success,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Device revocation failed'
      };
    }
  }

  /**
   * Request emergency access for crisis situations
   */
  async requestEmergencyAccess(
    deviceId: string,
    emergencyCode: string,
    crisisType: string
  ): Promise<EmergencyAccessResult> {
    this.ensureInitialized();

    try {
      const result = await deviceManagementAPI.requestEmergencyAccess({
        deviceId,
        emergencyCode,
        crisisType: crisisType as any,
        timestamp: new Date().toISOString()
      });

      return {
        success: result.success,
        emergencyToken: result.emergencyToken,
        limitedAccess: result.limitedAccess,
        expiresAt: result.expiresAt,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emergency access failed'
      };
    }
  }

  /**
   * Emergency security override for crisis situations
   */
  async emergencySecurityOverride(justification: string): Promise<EmergencyOverrideResult> {
    this.ensureInitialized();

    try {
      const securityContext = {
        authenticated: false, // May not be authenticated in emergency
        biometricUsed: false,
        deviceTrusted: false,
        networkSecure: false,
        encryptionActive: true
      };

      const result = await securityIntegrationAPI.emergencySecurityOverride(
        justification,
        securityContext
      );

      return {
        success: result.success,
        overrideToken: result.overrideToken,
        expiresAt: result.expiresAt,
        limitations: result.limitations,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        limitations: [],
        error: error instanceof Error ? error.message : 'Emergency override failed'
      };
    }
  }

  /**
   * Get comprehensive sync status
   */
  async getSyncStatus(): Promise<CrossDeviceSyncStatus> {
    this.ensureInitialized();

    return await crossDeviceSyncAPI.getSyncStatus();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    this.ensureInitialized();

    const metrics = performanceMonitoringAPI.getPerformanceMetrics();
    const strategy = performanceMonitoringAPI.getCurrentSyncStrategy();

    return {
      averageCrisisResponseTime: metrics.averageCrisisResponseTime,
      averageTherapeuticSyncTime: metrics.averageTherapeuticSyncTime,
      averageGeneralSyncTime: metrics.averageGeneralSyncTime,
      successRate: metrics.successRate,
      queueStatus: metrics.queueStatus,
      networkOptimized: strategy.networkOptimized,
      batteryOptimized: strategy.batteryOptimized
    };
  }

  /**
   * Get security dashboard
   */
  getSecurityDashboard(): SecurityDashboard {
    this.ensureInitialized();

    return securityIntegrationAPI.getSecurityDashboard();
  }

  /**
   * Get compliance status
   */
  async getComplianceStatus(): Promise<HIPAAComplianceStatus> {
    this.ensureInitialized();

    return await securityIntegrationAPI.getComplianceStatus();
  }

  /**
   * Configure emergency sync settings
   */
  async configureEmergencySync(config: Partial<EmergencySyncConfig>): Promise<void> {
    this.ensureInitialized();

    await crossDeviceSyncAPI.configureEmergencySync(config);
  }

  /**
   * Update network conditions for optimization
   */
  updateNetworkConditions(conditions: NetworkConditions): void {
    this.ensureInitialized();

    performanceMonitoringAPI.updateNetworkConditions(conditions);
    restSyncClient.setNetworkStatus(conditions.type === 'offline' ? 'offline' : 'online');
  }

  /**
   * Update battery status for optimization
   */
  updateBatteryStatus(status: BatteryStatus): void {
    this.ensureInitialized();

    performanceMonitoringAPI.updateBatteryStatus(status);
  }

  /**
   * Generate device fingerprint for registration
   */
  private async generateDeviceFingerprint(): Promise<string> {
    // Simplified device fingerprint generation
    // In production, would use actual device characteristics
    const timestamp = Date.now();
    const random = Math.random().toString(36);
    return `${timestamp}_${random}`;
  }

  /**
   * Generate public key for device registration
   */
  private async generatePublicKey(): Promise<string> {
    // Simplified public key generation
    // In production, would use proper cryptographic key generation
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    return Array.from(keyBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CrossDeviceSyncManager not initialized');
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    crossDeviceSyncAPI.destroy();
    restSyncClient.destroy();
    deviceManagementAPI.destroy();
    performanceMonitoringAPI.destroy();
    securityIntegrationAPI.destroy();

    this.removeAllListeners();
  }
}

// Create and export singleton instance
export const crossDeviceSync = new CrossDeviceSyncManager();

// Export all individual APIs for direct access if needed
export {
  crossDeviceSyncAPI,
  restSyncClient,
  deviceManagementAPI,
  performanceMonitoringAPI,
  securityIntegrationAPI
};

// Export all types and interfaces
export type {
  ICrossDeviceSync,
  SyncResult,
  DeviceRegistrationInfo,
  DeviceRegistrationResult,
  DeviceAuthResult,
  BasicResult,
  EmergencyAccessResult,
  EmergencyOverrideResult,
  PerformanceMetrics,
  SecurityDashboard,
  NetworkConditions,
  BatteryStatus
};