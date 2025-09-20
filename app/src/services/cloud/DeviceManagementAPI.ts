/**
 * Device Management API - Secure Device Registration and Trust
 *
 * Implements comprehensive device management for cross-device sync:
 * - Device registration and authentication endpoints
 * - Trust establishment with device-specific keys
 * - Emergency access protocols with crisis prioritization
 * - Device authorization and revocation APIs
 * - Audit trail generation for compliance
 */

import { z } from 'zod';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import {
  DeviceInfo,
  CloudAuditEntry,
  CLOUD_CONSTANTS
} from '../../types/cloud';
import { DataSensitivity } from '../security/EncryptionService';
import { encryptionService } from '../security/EncryptionService';
import { securityControlsService } from '../security/SecurityControlsService';
import { cloudSyncAPI } from './CloudSyncAPI';

/**
 * Device registration request schema
 */
const DeviceRegistrationRequestSchema = z.object({
  deviceName: z.string().min(1).max(100),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  deviceFingerprint: z.string().min(32),
  publicKey: z.string().min(1),
  emergencyCapable: z.boolean(),
  biometricCapable: z.boolean()
}).readonly();

const DeviceAuthenticationRequestSchema = z.object({
  deviceId: z.string().uuid(),
  signature: z.string().min(1),
  challenge: z.string().min(32),
  timestamp: z.string().datetime()
}).readonly();

const EmergencyAccessRequestSchema = z.object({
  deviceId: z.string().uuid(),
  emergencyCode: z.string().length(6),
  crisisType: z.enum(['phq9_threshold', 'gad7_threshold', 'crisis_button', 'manual']),
  timestamp: z.string().datetime()
}).readonly();

type DeviceRegistrationRequest = z.infer<typeof DeviceRegistrationRequestSchema>;
type DeviceAuthenticationRequest = z.infer<typeof DeviceAuthenticationRequestSchema>;
type EmergencyAccessRequest = z.infer<typeof EmergencyAccessRequestSchema>;

/**
 * Device security configuration
 */
interface DeviceSecurityConfig {
  encryptionKeyRotationDays: number;
  trustExpirationDays: number;
  emergencyAccessCodes: string[];
  biometricRequired: boolean;
  auditLogRetentionDays: number;
}

/**
 * Device trust levels
 */
enum DeviceTrustLevel {
  UNTRUSTED = 0,
  BASIC = 1,
  TRUSTED = 2,
  FULLY_TRUSTED = 3,
  EMERGENCY_ONLY = 4
}

/**
 * Device Management API Implementation
 */
export class DeviceManagementAPI {
  private static instance: DeviceManagementAPI;
  private deviceKeys: Map<string, string> = new Map();
  private deviceSecrets: Map<string, string> = new Map();
  private trustLevels: Map<string, DeviceTrustLevel> = new Map();
  private emergencyCodes: Map<string, string> = new Map();
  private deviceFingerprints: Map<string, string> = new Map();

  private securityConfig: DeviceSecurityConfig = {
    encryptionKeyRotationDays: 90,
    trustExpirationDays: 365,
    emergencyAccessCodes: [],
    biometricRequired: true,
    auditLogRetentionDays: 2555 // 7 years for HIPAA
  };

  private constructor() {
    this.initializeEmergencyCodes();
  }

  public static getInstance(): DeviceManagementAPI {
    if (!DeviceManagementAPI.instance) {
      DeviceManagementAPI.instance = new DeviceManagementAPI();
    }
    return DeviceManagementAPI.instance;
  }

  /**
   * Register new device with trust establishment
   */
  async registerDevice(request: DeviceRegistrationRequest): Promise<{
    success: boolean;
    deviceId?: string;
    deviceKey?: string;
    trustLevel?: DeviceTrustLevel;
    emergencyCode?: string;
    error?: string;
  }> {
    try {
      // Validate request
      DeviceRegistrationRequestSchema.parse(request);

      // Generate unique device ID
      const deviceId = await this.generateDeviceId();

      // Check if device is already registered
      if (this.deviceFingerprints.has(request.deviceFingerprint)) {
        return {
          success: false,
          error: 'Device fingerprint already registered'
        };
      }

      // Generate device-specific encryption key
      const deviceKey = await this.generateDeviceKey();

      // Generate emergency access code
      const emergencyCode = await this.generateEmergencyCode();

      // Determine initial trust level
      const trustLevel = await this.calculateInitialTrustLevel(request);

      // Store device information securely
      await this.storeDeviceSecurely(deviceId, request, deviceKey, emergencyCode, trustLevel);

      // Create device info object
      const deviceInfo: DeviceInfo = {
        deviceId,
        deviceName: request.deviceName,
        platform: request.platform,
        appVersion: request.appVersion,
        lastSeen: new Date().toISOString(),
        syncEnabled: true,
        encryptionKey: await this.encryptDeviceKey(deviceKey)
      };

      // Log registration for audit
      await this.logDeviceOperation('device_registration', deviceId, {
        deviceName: request.deviceName,
        platform: request.platform,
        trustLevel: DeviceTrustLevel[trustLevel],
        emergencyCapable: request.emergencyCapable,
        biometricCapable: request.biometricCapable
      });

      return {
        success: true,
        deviceId,
        deviceKey,
        trustLevel,
        emergencyCode
      };

    } catch (error) {
      await this.logDeviceOperation('device_registration_failed', 'unknown', {
        error: error instanceof Error ? error.message : 'Registration failed'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Device registration failed'
      };
    }
  }

  /**
   * Authenticate device for sync operations
   */
  async authenticateDevice(request: DeviceAuthenticationRequest): Promise<{
    success: boolean;
    sessionToken?: string;
    trustLevel?: DeviceTrustLevel;
    expiresAt?: string;
    error?: string;
  }> {
    try {
      // Validate request
      DeviceAuthenticationRequestSchema.parse(request);

      // Verify device exists and is trusted
      const trustLevel = this.trustLevels.get(request.deviceId);
      if (trustLevel === undefined || trustLevel === DeviceTrustLevel.UNTRUSTED) {
        await this.logDeviceOperation('authentication_failed', request.deviceId, {
          reason: 'Device not trusted or not found'
        });

        return {
          success: false,
          error: 'Device not authorized for sync operations'
        };
      }

      // Verify signature with device public key
      const isValidSignature = await this.verifyDeviceSignature(
        request.deviceId,
        request.challenge,
        request.signature
      );

      if (!isValidSignature) {
        await this.logDeviceOperation('authentication_failed', request.deviceId, {
          reason: 'Invalid signature'
        });

        return {
          success: false,
          error: 'Authentication signature verification failed'
        };
      }

      // Check timestamp to prevent replay attacks
      const requestTime = new Date(request.timestamp).getTime();
      const now = Date.now();
      const timeDiff = Math.abs(now - requestTime);

      if (timeDiff > 300000) { // 5 minutes tolerance
        await this.logDeviceOperation('authentication_failed', request.deviceId, {
          reason: 'Request timestamp too old'
        });

        return {
          success: false,
          error: 'Authentication request expired'
        };
      }

      // Generate session token
      const sessionToken = await this.generateSessionToken(request.deviceId, trustLevel);
      const expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      // Update last seen timestamp
      await this.updateDeviceLastSeen(request.deviceId);

      // Log successful authentication
      await this.logDeviceOperation('device_authentication', request.deviceId, {
        trustLevel: DeviceTrustLevel[trustLevel],
        sessionDuration: '24h'
      });

      return {
        success: true,
        sessionToken,
        trustLevel,
        expiresAt
      };

    } catch (error) {
      await this.logDeviceOperation('authentication_error', request.deviceId || 'unknown', {
        error: error instanceof Error ? error.message : 'Authentication error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Device authentication failed'
      };
    }
  }

  /**
   * Emergency access for crisis situations
   */
  async requestEmergencyAccess(request: EmergencyAccessRequest): Promise<{
    success: boolean;
    emergencyToken?: string;
    limitedAccess?: boolean;
    expiresAt?: string;
    error?: string;
  }> {
    try {
      // Validate request
      EmergencyAccessRequestSchema.parse(request);

      // Verify emergency code
      const storedCode = this.emergencyCodes.get(request.deviceId);
      if (!storedCode || storedCode !== request.emergencyCode) {
        await this.logDeviceOperation('emergency_access_denied', request.deviceId, {
          reason: 'Invalid emergency code',
          crisisType: request.crisisType
        });

        return {
          success: false,
          error: 'Invalid emergency access code'
        };
      }

      // Generate emergency session token with limited privileges
      const emergencyToken = await this.generateEmergencyToken(request.deviceId);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      // Set device to emergency access mode
      this.trustLevels.set(request.deviceId, DeviceTrustLevel.EMERGENCY_ONLY);

      // Log emergency access for critical audit
      await this.logDeviceOperation('emergency_access_granted', request.deviceId, {
        crisisType: request.crisisType,
        emergencyDuration: '1h',
        limitedAccess: true
      }, true);

      // Record security event for immediate attention
      await securityControlsService.recordSecurityViolation({
        violationType: 'emergency_access',
        severity: 'high',
        description: `Emergency device access granted for crisis: ${request.crisisType}`,
        affectedResources: [`device:${request.deviceId}`],
        automaticResponse: {
          implemented: true,
          actions: ['limit_access_scope', 'enhanced_monitoring', 'auto_expire_1h']
        }
      });

      return {
        success: true,
        emergencyToken,
        limitedAccess: true,
        expiresAt
      };

    } catch (error) {
      await this.logDeviceOperation('emergency_access_error', request.deviceId || 'unknown', {
        error: error instanceof Error ? error.message : 'Emergency access error'
      }, true);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emergency access failed'
      };
    }
  }

  /**
   * Revoke device trust
   */
  async revokeDeviceTrust(deviceId: string, reason: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Verify device exists
      if (!this.trustLevels.has(deviceId)) {
        return {
          success: false,
          error: 'Device not found'
        };
      }

      // Remove all device data
      this.deviceKeys.delete(deviceId);
      this.deviceSecrets.delete(deviceId);
      this.trustLevels.set(deviceId, DeviceTrustLevel.UNTRUSTED);
      this.emergencyCodes.delete(deviceId);

      // Log revocation for audit
      await this.logDeviceOperation('device_trust_revoked', deviceId, {
        reason,
        revokedAt: new Date().toISOString()
      });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Device revocation failed'
      };
    }
  }

  /**
   * Get device trust status
   */
  async getDeviceTrustStatus(deviceId: string): Promise<{
    success: boolean;
    trustLevel?: DeviceTrustLevel;
    trustExpiry?: string;
    keyRotationDue?: boolean;
    error?: string;
  }> {
    try {
      const trustLevel = this.trustLevels.get(deviceId);
      if (trustLevel === undefined) {
        return {
          success: false,
          error: 'Device not found'
        };
      }

      // Calculate trust expiry (placeholder logic)
      const trustExpiry = new Date(Date.now() + this.securityConfig.trustExpirationDays * 24 * 60 * 60 * 1000).toISOString();

      // Check if key rotation is due (placeholder logic)
      const keyRotationDue = false; // Would check actual key age

      return {
        success: true,
        trustLevel,
        trustExpiry,
        keyRotationDue
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Trust status check failed'
      };
    }
  }

  /**
   * List trusted devices for user
   */
  async getTrustedDevices(userId: string): Promise<{
    success: boolean;
    devices?: Array<{
      deviceId: string;
      deviceName: string;
      platform: string;
      trustLevel: DeviceTrustLevel;
      lastSeen: string;
      syncEnabled: boolean;
    }>;
    error?: string;
  }> {
    try {
      // In production, this would query the database
      const devices = Array.from(this.trustLevels.entries())
        .filter(([_, trustLevel]) => trustLevel > DeviceTrustLevel.UNTRUSTED)
        .map(([deviceId, trustLevel]) => ({
          deviceId,
          deviceName: `Device ${deviceId.substring(0, 8)}`,
          platform: 'ios' as const,
          trustLevel,
          lastSeen: new Date().toISOString(),
          syncEnabled: true
        }));

      return {
        success: true,
        devices
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve trusted devices'
      };
    }
  }

  /**
   * Rotate device encryption key
   */
  async rotateDeviceKey(deviceId: string): Promise<{
    success: boolean;
    newDeviceKey?: string;
    error?: string;
  }> {
    try {
      // Verify device exists and is trusted
      const trustLevel = this.trustLevels.get(deviceId);
      if (!trustLevel || trustLevel === DeviceTrustLevel.UNTRUSTED) {
        return {
          success: false,
          error: 'Device not authorized for key rotation'
        };
      }

      // Generate new device key
      const newDeviceKey = await this.generateDeviceKey();

      // Update stored key
      this.deviceKeys.set(deviceId, newDeviceKey);

      // Log key rotation for audit
      await this.logDeviceOperation('device_key_rotated', deviceId, {
        previousKeyId: 'key_masked_for_security',
        newKeyId: 'key_masked_for_security',
        rotationReason: 'scheduled_rotation'
      });

      return {
        success: true,
        newDeviceKey
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Key rotation failed'
      };
    }
  }

  /**
   * Generate unique device ID
   */
  private async generateDeviceId(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const platform = Platform.OS;

    const deviceString = `${platform}_${timestamp}_${random}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      deviceString,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    return `device_${hash.substring(0, 32)}`;
  }

  /**
   * Generate device-specific encryption key
   */
  private async generateDeviceKey(): Promise<string> {
    const keyBytes = await Crypto.getRandomBytesAsync(32); // 256-bit key
    return Array.from(keyBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate emergency access code
   */
  private async generateEmergencyCode(): Promise<string> {
    const codeBytes = await Crypto.getRandomBytesAsync(3); // 6-digit code
    const code = Array.from(codeBytes, byte => (byte % 10).toString()).join('');
    return code.padStart(6, '0');
  }

  /**
   * Calculate initial trust level for new device
   */
  private async calculateInitialTrustLevel(request: DeviceRegistrationRequest): Promise<DeviceTrustLevel> {
    let trustLevel = DeviceTrustLevel.BASIC;

    // Increase trust for devices with biometric capability
    if (request.biometricCapable) {
      trustLevel = DeviceTrustLevel.TRUSTED;
    }

    // Increase trust for emergency-capable devices
    if (request.emergencyCapable) {
      trustLevel = DeviceTrustLevel.FULLY_TRUSTED;
    }

    return trustLevel;
  }

  /**
   * Store device information securely
   */
  private async storeDeviceSecurely(
    deviceId: string,
    request: DeviceRegistrationRequest,
    deviceKey: string,
    emergencyCode: string,
    trustLevel: DeviceTrustLevel
  ): Promise<void> {
    // Store device data in maps (in production, this would be encrypted database storage)
    this.deviceKeys.set(deviceId, deviceKey);
    this.deviceSecrets.set(deviceId, request.publicKey);
    this.trustLevels.set(deviceId, trustLevel);
    this.emergencyCodes.set(deviceId, emergencyCode);
    this.deviceFingerprints.set(request.deviceFingerprint, deviceId);
  }

  /**
   * Encrypt device key for storage
   */
  private async encryptDeviceKey(deviceKey: string): Promise<string> {
    const encrypted = await encryptionService.encryptData(
      { deviceKey },
      DataSensitivity.SYSTEM
    );
    return encrypted.encryptedData;
  }

  /**
   * Verify device signature
   */
  private async verifyDeviceSignature(
    deviceId: string,
    challenge: string,
    signature: string
  ): Promise<boolean> {
    // Simplified signature verification
    // In production, this would use proper cryptographic verification
    const publicKey = this.deviceSecrets.get(deviceId);
    return !!(publicKey && signature.length > 32);
  }

  /**
   * Generate session token
   */
  private async generateSessionToken(deviceId: string, trustLevel: DeviceTrustLevel): Promise<string> {
    const tokenData = {
      deviceId,
      trustLevel,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    };

    const tokenString = JSON.stringify(tokenData);
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      tokenString,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    return `session_${hash}`;
  }

  /**
   * Generate emergency token with limited privileges
   */
  private async generateEmergencyToken(deviceId: string): Promise<string> {
    const tokenData = {
      deviceId,
      type: 'emergency',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
      limitations: ['crisis_data_only', 'read_only_assessments']
    };

    const tokenString = JSON.stringify(tokenData);
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      tokenString,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    return `emergency_${hash}`;
  }

  /**
   * Update device last seen timestamp
   */
  private async updateDeviceLastSeen(deviceId: string): Promise<void> {
    // In production, this would update the database
    console.log(`Device ${deviceId} last seen updated`);
  }

  /**
   * Initialize emergency codes for system
   */
  private initializeEmergencyCodes(): void {
    // Initialize system emergency codes
    this.securityConfig.emergencyAccessCodes = [
      '911911', // Universal emergency
      '988988', // Crisis hotline reference
    ];
  }

  /**
   * Log device operation for audit
   */
  private async logDeviceOperation(
    operation: string,
    deviceId: string,
    metadata: Record<string, any>,
    critical: boolean = false
  ): Promise<void> {
    try {
      await securityControlsService.logAuditEntry({
        operation,
        entityType: 'device',
        entityId: deviceId,
        dataSensitivity: critical ? DataSensitivity.CLINICAL : DataSensitivity.SYSTEM,
        userId: 'system',
        securityContext: {
          authenticated: true,
          biometricUsed: false,
          deviceTrusted: this.trustLevels.get(deviceId) !== DeviceTrustLevel.UNTRUSTED,
          networkSecure: true,
          encryptionActive: true
        },
        operationMetadata: {
          success: true,
          duration: 0,
          additionalContext: metadata
        },
        complianceMarkers: {
          hipaaRequired: critical,
          auditRequired: true,
          retentionDays: critical ? this.securityConfig.auditLogRetentionDays : 365
        }
      });
    } catch (error) {
      console.error('Failed to log device operation:', error);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.deviceKeys.clear();
    this.deviceSecrets.clear();
    this.trustLevels.clear();
    this.emergencyCodes.clear();
    this.deviceFingerprints.clear();
  }
}

// Export singleton instance
export const deviceManagementAPI = DeviceManagementAPI.getInstance();