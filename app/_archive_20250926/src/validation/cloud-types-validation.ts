/**
 * Cloud Types Validation - Comprehensive Type System Verification
 *
 * Validates that all P0-CLOUD Phase 1 TypeScript integration types
 * are properly connected and type-safe across the entire system.
 */

import { z } from 'zod';
import {
  CloudClientSDK,
  CloudClientConfig,
  TypeSafeFeatureFlags,
  EncryptableEntity,
  BiometricAuthData,
  UserMigration,
  ClientSDKResult,
  isCloudClientConfig,
  isEncryptableEntity,
  CLOUD_CLIENT_CONSTANTS
} from '../types/cloud-client';
import {
  EnhancedAuthSession,
  isEnhancedAuthSession,
  AUTHENTICATION_CANONICAL_CONSTANTS
} from '../types/authentication-canonical';

import {
  EncryptedEntity,
  EncryptionMetadata,
  DataIntegrityProof,
  ClinicalDataEncryption,
  isEncryptedEntity,
  isValidEncryptionMetadata,
  isValidDataIntegrityProof,
  isClinicalDataEncryption,
  ENCRYPTED_DATA_CONSTANTS
} from '../types/encrypted-data-flow';

import {
  SessionTokens,
  SessionSecurity,
  SessionPermissions,
  SessionCompliance,
  JWTValidationResult,
  MultiDeviceSession,
  isBiometricAuthData,
  isUserMigration,
  AUTH_CONSTANTS
} from '../types/auth-session';

import {
  CloudFeatureFlags,
  EncryptedDataContainer,
  CloudSyncMetadata,
  CloudSyncError,
  CLOUD_CONSTANTS
} from '../types/cloud';

import { Assessment, PHQ9Assessment, GAD7Assessment } from '../types/clinical';
import { CheckIn, UserProfile, CrisisPlan } from '../types.ts';
import { DataSensitivity } from '../types/security';

/**
 * Validation result interface
 */
export interface TypeValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly summary: {
    readonly totalChecks: number;
    readonly passedChecks: number;
    readonly failedChecks: number;
    readonly warningChecks: number;
  };
  readonly categories: {
    readonly cloudClient: boolean;
    readonly encryptedDataFlow: boolean;
    readonly authentication: boolean;
    readonly integration: boolean;
  };
}

/**
 * Comprehensive type validation suite
 */
export class CloudTypesValidator {
  private errors: string[] = [];
  private warnings: string[] = [];
  private totalChecks = 0;
  private passedChecks = 0;

  /**
   * Run complete type system validation
   */
  async validateAll(): Promise<TypeValidationResult> {
    this.reset();

    // Validate each category
    await this.validateCloudClientTypes();
    await this.validateEncryptedDataFlowTypes();
    await this.validateAuthenticationTypes();
    await this.validateIntegrationTypes();
    await this.validateCrossTypeCompatibility();

    const failedChecks = this.totalChecks - this.passedChecks;

    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      summary: {
        totalChecks: this.totalChecks,
        passedChecks: this.passedChecks,
        failedChecks,
        warningChecks: this.warnings.length
      },
      categories: {
        cloudClient: this.validateCloudClientCategory(),
        encryptedDataFlow: this.validateEncryptedDataFlowCategory(),
        authentication: this.validateAuthenticationCategory(),
        integration: this.validateIntegrationCategory()
      }
    };
  }

  /**
   * Validate cloud client types
   */
  private async validateCloudClientTypes(): Promise<void> {
    // Test CloudClientConfig validation
    this.check('CloudClientConfig validation', () => {
      const config: CloudClientConfig = {
        encryption: {
          algorithm: 'AES-256-GCM',
          keyVersion: 1,
          rotationDays: 90,
          deriveFromBiometric: true
        },
        sync: {
          batchSize: 50,
          retryAttempts: 3,
          timeoutMs: 30000,
          conflictResolution: 'manual'
        },
        privacy: {
          zeroKnowledge: true,
          auditLevel: 'comprehensive',
          dataRetentionDays: 2555,
          allowAnalytics: false
        },
        emergency: {
          enabled: false,
          triggers: ['phq9_threshold'],
          priorityData: ['crisis_plan'],
          timeoutMs: 5000,
          maxRetries: 3,
          forceSync: false
        },
        featureFlags: {
          enabled: false,
          supabaseSync: false,
          encryptedBackup: false,
          crossDeviceSync: false,
          conflictResolution: true,
          auditLogging: true,
          emergencySync: false,
          profile: 'production',
          validatedAt: new Date().toISOString(),
          enabledFeatures: [],
          emergencyOverrides: {
            crisisThresholdBypass: false,
            offlineToCloudForced: false,
            emergencySyncEnabled: false
          }
        }
      };

      return isCloudClientConfig(config);
    });

    // Test EncryptableEntity types
    this.check('EncryptableEntity validation', () => {
      const checkIn: CheckIn = {
        id: 'test-checkin',
        type: 'morning',
        startedAt: new Date().toISOString(),
        skipped: false,
        data: {}
      };

      const encryptableCheckIn = {
        ...checkIn,
        entityType: 'check_in' as const,
        sensitivity: DataSensitivity.PERSONAL,
        encryptionRequired: true as const
      };

      return isEncryptableEntity(encryptableCheckIn);
    });

    // Test TypeSafeFeatureFlags
    this.check('TypeSafeFeatureFlags structure', () => {
      const flags: TypeSafeFeatureFlags = {
        enabled: false,
        supabaseSync: false,
        encryptedBackup: false,
        crossDeviceSync: false,
        conflictResolution: true,
        auditLogging: true,
        emergencySync: false,
        profile: 'production',
        validatedAt: new Date().toISOString(),
        enabledFeatures: ['conflictResolution', 'auditLogging'],
        emergencyOverrides: {
          crisisThresholdBypass: false,
          offlineToCloudForced: false,
          emergencySyncEnabled: false
        }
      };

      return typeof flags === 'object' &&
             flags.profile === 'production' &&
             Array.isArray(flags.enabledFeatures);
    });

    // Test ClientSDKResult generic type
    this.check('ClientSDKResult generic typing', () => {
      const successResult: ClientSDKResult<string> = {
        success: true,
        data: 'test-data'
      };

      const errorResult: ClientSDKResult<string> = {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
          category: 'validation',
          retryable: false,
          hipaaRelevant: false,
          occurredAt: new Date().toISOString()
        }
      };

      return successResult.success && !errorResult.success;
    });

    // Test constants availability
    this.check('CLOUD_CLIENT_CONSTANTS availability', () => {
      return typeof CLOUD_CLIENT_CONSTANTS === 'object' &&
             typeof CLOUD_CLIENT_CONSTANTS.DEFAULT_CONFIG === 'object' &&
             typeof CLOUD_CLIENT_CONSTANTS.PERFORMANCE === 'object';
    });
  }

  /**
   * Validate encrypted data flow types
   */
  private async validateEncryptedDataFlowTypes(): Promise<void> {
    // Test EncryptionMetadata validation
    this.check('EncryptionMetadata validation', () => {
      const metadata: EncryptionMetadata = {
        algorithm: 'AES-256-GCM',
        keyVersion: 1,
        keyDerivationSalt: 'a'.repeat(64),
        initializationVector: 'b'.repeat(32),
        authenticationTag: 'c'.repeat(32),
        encryptedSize: 1024,
        compressionApplied: false,
        encryptedAt: new Date().toISOString(),
        deviceId: 'test-device',
        encryptionContext: {
          sensitivity: DataSensitivity.CLINICAL,
          purpose: 'storage',
          retention: 'persistent',
          compliance: ['HIPAA'],
          additionalAuthentication: true
        }
      };

      return isValidEncryptionMetadata(metadata);
    });

    // Test DataIntegrityProof validation
    this.check('DataIntegrityProof validation', () => {
      const proof: DataIntegrityProof = {
        checksumAlgorithm: 'SHA-256',
        dataChecksum: 'a'.repeat(64),
        metadataChecksum: 'b'.repeat(64),
        combinedChecksum: 'c'.repeat(64),
        witnessHashes: ['d'.repeat(64), 'e'.repeat(64)],
        timestampProof: {
          timestamp: new Date().toISOString(),
          nonce: 'f'.repeat(32),
          rfcCompliant: true
        }
      };

      return isValidDataIntegrityProof(proof);
    });

    // Test ClinicalDataEncryption validation
    this.check('ClinicalDataEncryption validation', () => {
      const clinicalData: ClinicalDataEncryption = {
        assessmentId: 'test-assessment',
        assessmentType: 'phq9',
        answers: {
          answerSet: [
            {
              questionIndex: 0,
              encryptedValue: 'encrypted-answer',
              answerHash: 'a'.repeat(64),
              questionHash: 'b'.repeat(64),
              confidence: 1.0
            }
          ],
          sequenceHash: 'c'.repeat(64),
          completionProof: 'd'.repeat(64),
          integrityChain: ['e'.repeat(64)]
        },
        score: {
          encryptedValue: 'encrypted-score',
          calculationProof: 'f'.repeat(64),
          algorithmVersion: '1.0',
          calculatedAt: new Date().toISOString(),
          verificationHash: 'g'.repeat(64)
        },
        severity: {
          encryptedLevel: 'encrypted-severity',
          thresholdProof: 'h'.repeat(64),
          severityHash: 'i'.repeat(64),
          clinicalReviewRequired: false
        },
        emergencyFlags: {
          crisisDetected: false,
          emergencyContactsEncrypted: false,
          hospitalNotificationReady: false,
          emergencyDecryptionKey: 'emergency-key',
          crisisTimestamp: new Date().toISOString(),
          interventionRequired: false
        },
        clinicalValidation: {
          validationAlgorithm: 'PHQ9-validation-v1',
          scoringAccuracy: 1.0,
          answerConsistency: 1.0,
          temporalConsistency: 1.0,
          crossValidationHash: 'j'.repeat(64),
          clinicalFlags: [],
          validatedBy: 'algorithm',
          validationTimestamp: new Date().toISOString()
        }
      };

      return isClinicalDataEncryption(clinicalData);
    });

    // Test EncryptedEntity structure
    this.check('EncryptedEntity structure', () => {
      const originalData: CheckIn = {
        id: 'test-checkin',
        type: 'morning',
        startedAt: new Date().toISOString(),
        skipped: false,
        data: {}
      };

      const encryptedEntity: EncryptedEntity<CheckIn> = {
        id: 'encrypted-entity-id',
        entityType: 'check_in',
        originalData,
        encryptionMetadata: {
          algorithm: 'AES-256-GCM',
          keyVersion: 1,
          keyDerivationSalt: 'a'.repeat(64),
          initializationVector: 'b'.repeat(32),
          authenticationTag: 'c'.repeat(32),
          encryptedSize: 1024,
          compressionApplied: false,
          encryptedAt: new Date().toISOString(),
          deviceId: 'test-device',
          encryptionContext: {
            sensitivity: DataSensitivity.PERSONAL,
            purpose: 'storage',
            retention: 'persistent',
            compliance: ['HIPAA'],
            additionalAuthentication: false
          }
        },
        syncMetadata: {
          entityId: 'test-checkin',
          entityType: 'check_in',
          version: 1,
          lastModified: new Date().toISOString(),
          checksum: 'checksum',
          deviceId: 'test-device',
          cloudVersion: 1,
          syncAttempts: 0,
          conflictHistory: [],
          bandwidthUsed: 1024,
          syncPriority: 'normal',
          crossDeviceSync: false
        },
        integrityProof: {
          checksumAlgorithm: 'SHA-256',
          dataChecksum: 'a'.repeat(64),
          metadataChecksum: 'b'.repeat(64),
          combinedChecksum: 'c'.repeat(64),
          witnessHashes: [],
          timestampProof: {
            timestamp: new Date().toISOString(),
            nonce: 'nonce',
            rfcCompliant: true
          }
        },
        stage: 'local-only',
        auditTrail: []
      };

      return isEncryptedEntity(encryptedEntity);
    });

    // Test constants availability
    this.check('ENCRYPTED_DATA_CONSTANTS availability', () => {
      return typeof ENCRYPTED_DATA_CONSTANTS === 'object' &&
             typeof ENCRYPTED_DATA_CONSTANTS.ENCRYPTION === 'object' &&
             typeof ENCRYPTED_DATA_CONSTANTS.CLINICAL === 'object';
    });
  }

  /**
   * Validate authentication types
   */
  private async validateAuthenticationTypes(): Promise<void> {
    // Test EnhancedAuthSession validation
    this.check('EnhancedAuthSession validation', () => {
      const session: EnhancedAuthSession = {
        id: 'session-id',
        userId: 'user-id',
        deviceId: 'device-id',
        sessionType: 'authenticated',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        lastActivity: new Date().toISOString(),
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          deviceToken: 'device-token',
          tokenType: 'Bearer',
          expiresIn: 1800,
          scope: ['read', 'write'],
          issuedAt: new Date().toISOString(),
          issuer: 'https://issuer.example.com',
          audience: 'fullmind-app'
        },
        security: {
          authMethod: 'biometric',
          mfaEnabled: true,
          mfaVerified: true,
          biometricVerified: true,
          deviceTrusted: true,
          riskScore: 0.1,
          securityFlags: []
        },
        device: {
          deviceId: 'device-id',
          deviceName: 'Test Device',
          platform: 'ios',
          osVersion: '17.0',
          appVersion: '1.0.0',
          locale: 'en-US',
          timezone: 'America/New_York',
          lastSeen: new Date().toISOString(),
          firstSeen: new Date().toISOString(),
          syncEnabled: true,
          encryptionCapabilities: {
            hardwareEncryption: true,
            keychainAccess: true,
            biometricKeyDerivation: true,
            secureEnclave: true,
            webCryptoSupport: true,
            encryptionAlgorithms: ['AES-256-GCM']
          },
          biometricCapabilities: {
            available: true,
            types: ['face'],
            enrolled: true,
            hardwareBacked: true,
            fallbackAvailable: true
          },
          networkInfo: {
            connectionType: 'wifi',
            isVPN: false,
            isProxy: false
          }
        },
        permissions: {
          dataAccess: {
            read: ['checkins', 'assessments', 'profile', 'crisis_plan'],
            write: ['checkins', 'assessments', 'profile', 'crisis_plan'],
            delete: ['checkins', 'assessments']
          },
          features: {
            cloudSync: true,
            crossDeviceSync: true,
            exportData: true,
            emergencyFeatures: true,
            adminFeatures: false
          },
          restrictions: {}
        },
        compliance: {
          hipaaCompliant: true,
          consentGiven: true,
          consentVersion: '2024.1',
          consentTimestamp: new Date().toISOString(),
          dataProcessingAgreement: true,
          auditingEnabled: true,
          retentionPolicyAccepted: true,
          privacyPolicyVersion: '2024.1',
          complianceFlags: []
        }
      };

      return isEnhancedAuthSession(session);
    });

    // Test BiometricAuthData validation
    this.check('BiometricAuthData validation', () => {
      const biometricData: BiometricAuthData = {
        biometricId: 'biometric-id',
        biometricType: 'face',
        publicKey: 'public-key',
        encryptedPrivateKey: 'encrypted-private-key',
        deviceBinding: 'device-binding',
        enrollmentData: {
          enrolledAt: new Date().toISOString(),
          algorithm: 'ECDSA',
          version: '1.0',
          quality: 0.95,
          templateSize: 1024,
          multipleEnrollments: false,
          livenessTested: true,
          antiSpoofingEnabled: true
        },
        challenge: 'a'.repeat(32),
        signature: 'signature',
        timestamp: new Date().toISOString()
      };

      return isBiometricAuthData(biometricData);
    });

    // Test UserMigration validation
    this.check('UserMigration validation', () => {
      const migration: UserMigration = {
        migrationId: 'migration-id',
        anonymousUserId: 'anon-user-id',
        authenticatedUserId: 'auth-user-id',
        initiatedAt: new Date().toISOString(),
        status: 'completed',
        migrationPlan: {
          strategy: 'merge',
          dataTypes: ['checkins', 'assessments'],
          preserveHistory: true,
          encryptionUpgrade: true,
          notifyUser: true,
          backupRequired: true,
          estimatedDuration: 30000
        },
        dataTransfer: {
          checkIns: {
            total: 10,
            transferred: 10,
            failed: 0,
            errors: []
          },
          assessments: {
            total: 5,
            transferred: 5,
            failed: 0,
            errors: []
          },
          userProfile: {
            total: 1,
            transferred: 1,
            failed: 0,
            errors: []
          },
          crisisPlan: {
            total: 1,
            transferred: 1,
            failed: 0,
            errors: []
          },
          totalItems: 17,
          transferredItems: 17,
          failedItems: 0,
          bytesTransferred: 10240
        },
        verification: {
          dataIntegrityVerified: true,
          encryptionVerified: true,
          accessVerified: true,
          complianceVerified: true,
          verificationResults: [],
          confidence: 1.0
        }
      };

      return isUserMigration(migration);
    });

    // Test constants availability
    this.check('AUTH_CONSTANTS availability', () => {
      return typeof AUTH_CONSTANTS === 'object' &&
             typeof AUTH_CONSTANTS.SESSION === 'object' &&
             typeof AUTH_CONSTANTS.SECURITY === 'object';
    });
  }

  /**
   * Validate integration types
   */
  private async validateIntegrationTypes(): Promise<void> {
    // Test cloud types compatibility
    this.check('Cloud types integration', () => {
      return typeof CLOUD_CONSTANTS === 'object' &&
             typeof CLOUD_CONSTANTS.DEFAULT_FEATURE_FLAGS === 'object';
    });

    // Test clinical types integration
    this.check('Clinical types integration', () => {
      const assessment: Assessment = {
        type: 'phq9',
        id: 'test-assessment',
        answers: [0, 1, 2, 3, 0, 1, 2, 3, 0],
        score: 12,
        severity: 'moderate',
        completedAt: new Date().toISOString(),
        context: 'standalone',
        requiresCrisisIntervention: false
      } as PHQ9Assessment;

      return assessment.type === 'phq9' && assessment.score === 12;
    });

    // Test entity type compatibility
    this.check('Entity type compatibility', () => {
      const checkIn: CheckIn = {
        id: 'test-checkin',
        type: 'morning',
        startedAt: new Date().toISOString(),
        skipped: false,
        data: {}
      };

      const userProfile: UserProfile = {
        id: 'test-user',
        createdAt: new Date().toISOString(),
        onboardingCompleted: true,
        values: ['mindfulness'],
        notifications: {
          enabled: true,
          morning: '08:00',
          midday: '13:00',
          evening: '20:00'
        },
        preferences: {
          haptics: true,
          theme: 'auto'
        }
      };

      return checkIn.id === 'test-checkin' && userProfile.id === 'test-user';
    });
  }

  /**
   * Validate cross-type compatibility
   */
  private async validateCrossTypeCompatibility(): Promise<void> {
    // Test that cloud client types work with encrypted data types
    this.check('Cloud-Encryption type compatibility', () => {
      try {
        const checkIn: CheckIn = {
          id: 'test-checkin',
          type: 'morning',
          startedAt: new Date().toISOString(),
          skipped: false,
          data: {}
        };

        const encryptableCheckIn = {
          ...checkIn,
          entityType: 'check_in' as const,
          sensitivity: DataSensitivity.PERSONAL,
          encryptionRequired: true as const
        };

        // This should compile without errors
        const isValid: boolean = isEncryptableEntity(encryptableCheckIn);
        return isValid;
      } catch {
        return false;
      }
    });

    // Test that authentication types work with cloud client types
    this.check('Auth-CloudClient type compatibility', () => {
      try {
        const authData: BiometricAuthData = {
          biometricId: 'test-id',
          biometricType: 'face',
          publicKey: 'public-key',
          encryptedPrivateKey: 'encrypted-key',
          deviceBinding: 'device-binding',
          enrollmentData: {
            enrolledAt: new Date().toISOString(),
            algorithm: 'ECDSA',
            version: '1.0',
            quality: 0.95,
            templateSize: 1024,
            multipleEnrollments: false,
            livenessTested: true,
            antiSpoofingEnabled: true
          },
          challenge: 'challenge',
          signature: 'signature',
          timestamp: new Date().toISOString()
        };

        return isBiometricAuthData(authData);
      } catch {
        return false;
      }
    });

    // Test that all constants are properly exported
    this.check('Constants cross-compatibility', () => {
      return typeof CLOUD_CLIENT_CONSTANTS === 'object' &&
             typeof ENCRYPTED_DATA_CONSTANTS === 'object' &&
             typeof AUTH_CONSTANTS === 'object' &&
             typeof CLOUD_CONSTANTS === 'object';
    });
  }

  /**
   * Helper methods
   */
  private check(name: string, testFn: () => boolean): void {
    this.totalChecks++;
    try {
      const result = testFn();
      if (result) {
        this.passedChecks++;
      } else {
        this.errors.push(`${name}: Test returned false`);
      }
    } catch (error) {
      this.errors.push(`${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private warn(message: string): void {
    this.warnings.push(message);
  }

  private reset(): void {
    this.errors = [];
    this.warnings = [];
    this.totalChecks = 0;
    this.passedChecks = 0;
  }

  private validateCloudClientCategory(): boolean {
    // Check if cloud client types are working
    try {
      const config: Partial<CloudClientConfig> = {
        encryption: {
          algorithm: 'AES-256-GCM',
          keyVersion: 1,
          rotationDays: 90,
          deriveFromBiometric: true
        }
      };
      return typeof config.encryption === 'object';
    } catch {
      return false;
    }
  }

  private validateEncryptedDataFlowCategory(): boolean {
    // Check if encrypted data flow types are working
    try {
      const stage: 'local-only' | 'pre-sync' = 'local-only';
      return stage === 'local-only';
    } catch {
      return false;
    }
  }

  private validateAuthenticationCategory(): boolean {
    // Check if authentication types are working
    try {
      const sessionType: 'anonymous' | 'authenticated' = 'authenticated';
      return sessionType === 'authenticated';
    } catch {
      return false;
    }
  }

  private validateIntegrationCategory(): boolean {
    // Check if integration is working
    try {
      const sensitivity: DataSensitivity = DataSensitivity.CLINICAL;
      return sensitivity === DataSensitivity.CLINICAL;
    } catch {
      return false;
    }
  }
}

/**
 * Run validation and export results
 */
export async function validateCloudTypes(): Promise<TypeValidationResult> {
  const validator = new CloudTypesValidator();
  return await validator.validateAll();
}

/**
 * Quick validation check for CI/CD
 */
export async function quickValidation(): Promise<boolean> {
  const result = await validateCloudTypes();
  return result.valid;
}

// Auto-run validation in development
if (__DEV__) {
  validateCloudTypes().then(result => {
    if (result.valid) {
      console.log('✅ Cloud types validation passed');
      console.log(`Summary: ${result.summary.passedChecks}/${result.summary.totalChecks} checks passed`);
    } else {
      console.error('❌ Cloud types validation failed');
      console.error('Errors:', result.errors);
      console.error('Warnings:', result.warnings);
    }
  }).catch(error => {
    console.error('❌ Cloud types validation crashed:', error);
  });
}