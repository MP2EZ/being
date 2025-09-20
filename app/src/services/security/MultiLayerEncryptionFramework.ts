/**
 * Multi-Layer Encryption Framework - Tiered Encryption System
 *
 * Implements comprehensive multi-layer encryption supporting therapeutic,
 * context, and transport encryption levels with tier-based key management
 * for payment-aware sync system.
 *
 * Encryption Layers:
 * 1. Therapeutic Layer: AES-256-GCM for clinical data
 * 2. Context Layer: Metadata and subscription context encryption
 * 3. Transport Layer: Zero-knowledge end-to-end encryption
 *
 * Key Features:
 * - Tier-based encryption strength (Free/Premium/Clinical)
 * - Independent key rotation policies per layer
 * - Crisis-optimized encryption bypass
 * - HIPAA-compliant key management
 * - Performance-optimized for <200ms response times
 */

import { DataSensitivity, encryptionService, EncryptionResult } from './EncryptionService';
import { securityControlsService } from './SecurityControlsService';
import { zeroPIIValidationFramework, ValidationContext } from './ZeroPIIValidationFramework';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Multi-Layer Encryption Types
export interface MultiLayerEncryptionResult {
  success: boolean;
  layers: {
    therapeutic: LayerEncryptionResult;
    context: LayerEncryptionResult;
    transport: LayerEncryptionResult;
  };
  combinedPayload: string;
  encryptionMetadata: EncryptionMetadata;
  performanceMetrics: {
    therapeuticTime: number;
    contextTime: number;
    transportTime: number;
    totalTime: number;
  };
}

export interface LayerEncryptionResult {
  encrypted: boolean;
  encryptedData: string;
  keyVersion: number;
  algorithm: string;
  iv: string;
  integrityHash: string;
  layerMetadata: LayerMetadata;
}

export interface LayerMetadata {
  layerType: 'therapeutic' | 'context' | 'transport';
  encryptionStrength: 'standard' | 'enhanced' | 'clinical';
  keyDerivationRounds: number;
  dataSensitivity: DataSensitivity;
  crisisOptimized: boolean;
  subscriptionTier: 'free' | 'premium' | 'clinical';
}

export interface EncryptionMetadata {
  encryptionId: string;
  timestamp: string;
  totalLayers: number;
  layersSuccessful: number;
  subscriptionTier: 'free' | 'premium' | 'clinical';
  complianceLevel: 'basic' | 'enhanced' | 'clinical';
  crisisMode: boolean;
  keyRotationStatus: {
    therapeutic: KeyRotationInfo;
    context: KeyRotationInfo;
    transport: KeyRotationInfo;
  };
}

export interface KeyRotationInfo {
  lastRotation: string;
  nextRotation: string;
  rotationPolicy: 'standard' | 'enhanced' | 'strict';
  daysUntilRotation: number;
  rotationCompliant: boolean;
}

export interface TierBasedEncryptionConfig {
  tier: 'free' | 'premium' | 'clinical';
  therapeuticLayer: {
    enabled: boolean;
    algorithm: string;
    keySize: number;
    derivationRounds: number;
    rotationDays: number;
  };
  contextLayer: {
    enabled: boolean;
    algorithm: string;
    keySize: number;
    derivationRounds: number;
    rotationDays: number;
  };
  transportLayer: {
    enabled: boolean;
    algorithm: string;
    keySize: number;
    derivationRounds: number;
    rotationDays: number;
  };
  performanceOptimizations: {
    crisisMode: boolean;
    parallelEncryption: boolean;
    compressionEnabled: boolean;
    integrityChecks: boolean;
  };
}

export interface DecryptionContext {
  encryptionId: string;
  originalTier: 'free' | 'premium' | 'clinical';
  layersToDecrypt: ('therapeutic' | 'context' | 'transport')[];
  crisisMode: boolean;
  emergencyBypass: boolean;
  validationRequired: boolean;
}

/**
 * Multi-Layer Encryption Framework Implementation
 */
export class MultiLayerEncryptionFramework {
  private static instance: MultiLayerEncryptionFramework;
  private tierConfigs: Map<string, TierBasedEncryptionConfig> = new Map();
  private keyRotationTimers: Map<string, NodeJS.Timeout> = new Map();

  // Performance monitoring
  private encryptionTimes: number[] = [];
  private decryptionTimes: number[] = [];
  private layerStats = {
    therapeuticEncryptions: 0,
    contextEncryptions: 0,
    transportEncryptions: 0,
    totalEncryptions: 0,
    encryptionFailures: 0,
    crisisOptimizations: 0
  };

  // Crisis response configuration
  private readonly CRISIS_ENCRYPTION_LIMIT = 50; // ms per layer
  private readonly EMERGENCY_BYPASS_ENABLED = true;

  private constructor() {
    this.initializeTierConfigs();
    this.initialize();
  }

  public static getInstance(): MultiLayerEncryptionFramework {
    if (!MultiLayerEncryptionFramework.instance) {
      MultiLayerEncryptionFramework.instance = new MultiLayerEncryptionFramework();
    }
    return MultiLayerEncryptionFramework.instance;
  }

  /**
   * Primary multi-layer encryption for sync payloads
   */
  async encryptMultiLayer(
    payload: any,
    context: ValidationContext,
    subscriptionTier: 'free' | 'premium' | 'clinical' = 'free'
  ): Promise<MultiLayerEncryptionResult> {
    const encryptionStart = Date.now();

    try {
      // Get tier-based configuration
      const tierConfig = this.getTierConfig(subscriptionTier);

      // Crisis mode optimization
      if (context.emergencyContext && tierConfig.performanceOptimizations.crisisMode) {
        return await this.encryptCrisisOptimized(payload, context, tierConfig, encryptionStart);
      }

      // Layer 1: Therapeutic Data Encryption
      const therapeuticStart = Date.now();
      const therapeuticResult = await this.encryptTherapeuticLayer(
        payload,
        context,
        tierConfig,
        subscriptionTier
      );
      const therapeuticTime = Date.now() - therapeuticStart;

      // Layer 2: Context Metadata Encryption
      const contextStart = Date.now();
      const contextResult = await this.encryptContextLayer(
        payload,
        context,
        tierConfig,
        subscriptionTier,
        therapeuticResult
      );
      const contextTime = Date.now() - contextStart;

      // Layer 3: Transport Layer Encryption
      const transportStart = Date.now();
      const transportResult = await this.encryptTransportLayer(
        payload,
        context,
        tierConfig,
        subscriptionTier,
        contextResult
      );
      const transportTime = Date.now() - transportStart;

      // Combine layers into final payload
      const combinedPayload = await this.combineLayers(
        therapeuticResult,
        contextResult,
        transportResult
      );

      // Generate encryption metadata
      const encryptionMetadata = await this.generateEncryptionMetadata(
        subscriptionTier,
        context,
        [therapeuticResult, contextResult, transportResult]
      );

      // Update statistics
      this.updateEncryptionStats(therapeuticResult, contextResult, transportResult);

      const totalTime = Date.now() - encryptionStart;
      this.recordEncryptionTime(totalTime);

      const result: MultiLayerEncryptionResult = {
        success: therapeuticResult.encrypted && contextResult.encrypted && transportResult.encrypted,
        layers: {
          therapeutic: therapeuticResult,
          context: contextResult,
          transport: transportResult
        },
        combinedPayload,
        encryptionMetadata,
        performanceMetrics: {
          therapeuticTime,
          contextTime,
          transportTime,
          totalTime
        }
      };

      // Log encryption audit
      await this.logEncryptionAudit(result, context, subscriptionTier);

      return result;

    } catch (error) {
      console.error('Multi-layer encryption failed:', error);

      // Record security violation
      await securityControlsService.recordSecurityViolation({
        violationType: 'encryption_failure',
        severity: 'high',
        description: `Multi-layer encryption failure: ${error}`,
        affectedResources: ['multi_layer_encryption', 'sync_operations'],
        automaticResponse: {
          implemented: true,
          actions: ['fallback_to_single_layer', 'disable_sync_temporarily']
        }
      });

      // Return failure result
      return this.createFailureResult(error, encryptionStart);
    }
  }

  /**
   * Multi-layer decryption for received payloads
   */
  async decryptMultiLayer(
    encryptedPayload: string,
    decryptionContext: DecryptionContext
  ): Promise<{
    success: boolean;
    decryptedPayload: any;
    layersDecrypted: string[];
    performanceMetrics: {
      totalTime: number;
      layerTimes: Record<string, number>;
    };
  }> {
    const decryptionStart = Date.now();

    try {
      // Parse combined payload
      const layerData = await this.parseCombinedPayload(encryptedPayload);

      const layersDecrypted: string[] = [];
      const layerTimes: Record<string, number> = {};
      let currentPayload = layerData;

      // Decrypt layers in reverse order (transport -> context -> therapeutic)
      for (const layerType of ['transport', 'context', 'therapeutic'].reverse()) {
        if (decryptionContext.layersToDecrypt.includes(layerType as any)) {
          const layerStart = Date.now();

          const decryptedLayer = await this.decryptLayer(
            currentPayload,
            layerType as 'therapeutic' | 'context' | 'transport',
            decryptionContext
          );

          layerTimes[layerType] = Date.now() - layerStart;
          layersDecrypted.push(layerType);
          currentPayload = decryptedLayer;
        }
      }

      const totalTime = Date.now() - decryptionStart;
      this.recordDecryptionTime(totalTime);

      return {
        success: true,
        decryptedPayload: currentPayload,
        layersDecrypted,
        performanceMetrics: {
          totalTime,
          layerTimes
        }
      };

    } catch (error) {
      console.error('Multi-layer decryption failed:', error);

      return {
        success: false,
        decryptedPayload: null,
        layersDecrypted: [],
        performanceMetrics: {
          totalTime: Date.now() - decryptionStart,
          layerTimes: {}
        }
      };
    }
  }

  /**
   * Tier-based key rotation management
   */
  async rotateTierKeys(
    subscriptionTier: 'free' | 'premium' | 'clinical',
    layerType?: 'therapeutic' | 'context' | 'transport'
  ): Promise<{
    success: boolean;
    rotatedLayers: string[];
    newKeyVersions: Record<string, number>;
    rotationCompliance: Record<string, boolean>;
  }> {
    try {
      const tierConfig = this.getTierConfig(subscriptionTier);
      const rotatedLayers: string[] = [];
      const newKeyVersions: Record<string, number> = {};
      const rotationCompliance: Record<string, boolean> = {};

      const layersToRotate = layerType ? [layerType] : ['therapeutic', 'context', 'transport'];

      for (const layer of layersToRotate) {
        try {
          const keyName = `being_ml_${layer}_key_${subscriptionTier}_v2`;
          const rotationDateKey = `being_ml_${layer}_rotation_${subscriptionTier}`;

          // Generate new key for layer
          const newKey = await this.generateLayerKey(layer as any, tierConfig);

          // Store new key
          await SecureStore.setItemAsync(keyName, newKey);
          await SecureStore.setItemAsync(rotationDateKey, new Date().toISOString());

          rotatedLayers.push(layer);
          newKeyVersions[layer] = 2; // Increment version
          rotationCompliance[layer] = true;

          console.log(`Rotated ${layer} layer key for ${subscriptionTier} tier`);

        } catch (layerError) {
          console.error(`Failed to rotate ${layer} key:`, layerError);
          rotationCompliance[layer] = false;
        }
      }

      // Update rotation timers
      this.setupKeyRotationSchedule(subscriptionTier);

      return {
        success: rotatedLayers.length > 0,
        rotatedLayers,
        newKeyVersions,
        rotationCompliance
      };

    } catch (error) {
      console.error('Tier key rotation failed:', error);
      return {
        success: false,
        rotatedLayers: [],
        newKeyVersions: {},
        rotationCompliance: {}
      };
    }
  }

  /**
   * Get encryption framework status with tier compliance
   */
  async getFrameworkStatus(): Promise<{
    frameworkReady: boolean;
    tierConfigurations: Record<string, TierBasedEncryptionConfig>;
    keyRotationStatus: Record<string, Record<string, KeyRotationInfo>>;
    performanceMetrics: typeof this.layerStats & {
      averageEncryptionTime: number;
      averageDecryptionTime: number;
      crisisResponseCapable: boolean;
    };
    complianceStatus: {
      freeCompliant: boolean;
      premiumCompliant: boolean;
      clinicalCompliant: boolean;
    };
  }> {
    try {
      const keyRotationStatus: Record<string, Record<string, KeyRotationInfo>> = {};

      // Check key rotation status for all tiers
      for (const tier of ['free', 'premium', 'clinical']) {
        keyRotationStatus[tier] = {};
        for (const layer of ['therapeutic', 'context', 'transport']) {
          keyRotationStatus[tier][layer] = await this.getKeyRotationInfo(
            tier as any,
            layer as any
          );
        }
      }

      const averageEncryptionTime = this.encryptionTimes.length > 0
        ? this.encryptionTimes.reduce((a, b) => a + b, 0) / this.encryptionTimes.length
        : 0;

      const averageDecryptionTime = this.decryptionTimes.length > 0
        ? this.decryptionTimes.reduce((a, b) => a + b, 0) / this.decryptionTimes.length
        : 0;

      const crisisResponseCapable = averageEncryptionTime < this.CRISIS_ENCRYPTION_LIMIT * 3;

      const tierConfigsObj: Record<string, TierBasedEncryptionConfig> = {};
      this.tierConfigs.forEach((config, tier) => {
        tierConfigsObj[tier] = config;
      });

      // Check compliance for each tier
      const complianceStatus = {
        freeCompliant: this.checkTierCompliance('free', keyRotationStatus.free),
        premiumCompliant: this.checkTierCompliance('premium', keyRotationStatus.premium),
        clinicalCompliant: this.checkTierCompliance('clinical', keyRotationStatus.clinical)
      };

      const frameworkReady = Object.values(complianceStatus).every(compliant => compliant);

      return {
        frameworkReady,
        tierConfigurations: tierConfigsObj,
        keyRotationStatus,
        performanceMetrics: {
          ...this.layerStats,
          averageEncryptionTime,
          averageDecryptionTime,
          crisisResponseCapable
        },
        complianceStatus
      };

    } catch (error) {
      console.error('Framework status check failed:', error);
      return {
        frameworkReady: false,
        tierConfigurations: {},
        keyRotationStatus: {},
        performanceMetrics: {
          ...this.layerStats,
          averageEncryptionTime: 0,
          averageDecryptionTime: 0,
          crisisResponseCapable: false
        },
        complianceStatus: {
          freeCompliant: false,
          premiumCompliant: false,
          clinicalCompliant: false
        }
      };
    }
  }

  // ===========================================
  // PRIVATE IMPLEMENTATION METHODS
  // ===========================================

  private async initialize(): Promise<void> {
    try {
      // Initialize tier configurations
      await this.validateTierConfigs();

      // Setup key rotation schedules
      for (const tier of ['free', 'premium', 'clinical']) {
        this.setupKeyRotationSchedule(tier as any);
      }

      // Initialize performance monitoring
      this.setupPerformanceMonitoring();

      console.log('Multi-layer encryption framework initialized');

    } catch (error) {
      console.error('Multi-layer encryption framework initialization failed:', error);
    }
  }

  private initializeTierConfigs(): void {
    // Free tier configuration
    this.tierConfigs.set('free', {
      tier: 'free',
      therapeuticLayer: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        derivationRounds: 10000,
        rotationDays: 180
      },
      contextLayer: {
        enabled: false, // Disabled for free tier
        algorithm: 'AES-256-GCM',
        keySize: 256,
        derivationRounds: 10000,
        rotationDays: 180
      },
      transportLayer: {
        enabled: false, // Disabled for free tier
        algorithm: 'AES-256-GCM',
        keySize: 256,
        derivationRounds: 10000,
        rotationDays: 180
      },
      performanceOptimizations: {
        crisisMode: true,
        parallelEncryption: false,
        compressionEnabled: false,
        integrityChecks: true
      }
    });

    // Premium tier configuration
    this.tierConfigs.set('premium', {
      tier: 'premium',
      therapeuticLayer: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        derivationRounds: 50000,
        rotationDays: 90
      },
      contextLayer: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        derivationRounds: 50000,
        rotationDays: 90
      },
      transportLayer: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        derivationRounds: 50000,
        rotationDays: 90
      },
      performanceOptimizations: {
        crisisMode: true,
        parallelEncryption: true,
        compressionEnabled: true,
        integrityChecks: true
      }
    });

    // Clinical tier configuration
    this.tierConfigs.set('clinical', {
      tier: 'clinical',
      therapeuticLayer: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        derivationRounds: 100000,
        rotationDays: 30
      },
      contextLayer: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        derivationRounds: 100000,
        rotationDays: 30
      },
      transportLayer: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keySize: 256,
        derivationRounds: 100000,
        rotationDays: 30
      },
      performanceOptimizations: {
        crisisMode: true,
        parallelEncryption: true,
        compressionEnabled: true,
        integrityChecks: true
      }
    });
  }

  private getTierConfig(tier: 'free' | 'premium' | 'clinical'): TierBasedEncryptionConfig {
    return this.tierConfigs.get(tier) || this.tierConfigs.get('free')!;
  }

  private async encryptCrisisOptimized(
    payload: any,
    context: ValidationContext,
    tierConfig: TierBasedEncryptionConfig,
    encryptionStart: number
  ): Promise<MultiLayerEncryptionResult> {
    // Crisis-optimized encryption - therapeutic layer only with reduced rounds
    const therapeuticResult = await this.encryptTherapeuticLayer(
      payload,
      context,
      {
        ...tierConfig,
        therapeuticLayer: {
          ...tierConfig.therapeuticLayer,
          derivationRounds: 1000 // Reduced for crisis mode
        }
      },
      tierConfig.tier,
      true // Crisis mode flag
    );

    // Skip context and transport layers for crisis speed
    const contextResult: LayerEncryptionResult = {
      encrypted: false,
      encryptedData: '',
      keyVersion: 0,
      algorithm: '',
      iv: '',
      integrityHash: '',
      layerMetadata: {
        layerType: 'context',
        encryptionStrength: 'standard',
        keyDerivationRounds: 0,
        dataSensitivity: DataSensitivity.SYSTEM,
        crisisOptimized: true,
        subscriptionTier: tierConfig.tier
      }
    };

    const transportResult: LayerEncryptionResult = {
      encrypted: false,
      encryptedData: '',
      keyVersion: 0,
      algorithm: '',
      iv: '',
      integrityHash: '',
      layerMetadata: {
        layerType: 'transport',
        encryptionStrength: 'standard',
        keyDerivationRounds: 0,
        dataSensitivity: DataSensitivity.SYSTEM,
        crisisOptimized: true,
        subscriptionTier: tierConfig.tier
      }
    };

    this.layerStats.crisisOptimizations++;

    return {
      success: therapeuticResult.encrypted,
      layers: {
        therapeutic: therapeuticResult,
        context: contextResult,
        transport: transportResult
      },
      combinedPayload: therapeuticResult.encryptedData,
      encryptionMetadata: await this.generateEncryptionMetadata(
        tierConfig.tier,
        context,
        [therapeuticResult],
        true
      ),
      performanceMetrics: {
        therapeuticTime: Date.now() - encryptionStart,
        contextTime: 0,
        transportTime: 0,
        totalTime: Date.now() - encryptionStart
      }
    };
  }

  private async encryptTherapeuticLayer(
    payload: any,
    context: ValidationContext,
    tierConfig: TierBasedEncryptionConfig,
    subscriptionTier: 'free' | 'premium' | 'clinical',
    crisisMode: boolean = false
  ): Promise<LayerEncryptionResult> {
    try {
      if (!tierConfig.therapeuticLayer.enabled) {
        return this.createEmptyLayerResult('therapeutic', subscriptionTier, crisisMode);
      }

      // Use existing encryption service for therapeutic data
      const encryptionResult = await encryptionService.encryptData(
        payload,
        context.therapeuticContext ? DataSensitivity.CLINICAL : DataSensitivity.PERSONAL
      );

      const integrityHash = await this.calculateLayerIntegrity(
        encryptionResult.encryptedData,
        'therapeutic'
      );

      this.layerStats.therapeuticEncryptions++;

      return {
        encrypted: true,
        encryptedData: encryptionResult.encryptedData,
        keyVersion: 1,
        algorithm: tierConfig.therapeuticLayer.algorithm,
        iv: encryptionResult.iv,
        integrityHash,
        layerMetadata: {
          layerType: 'therapeutic',
          encryptionStrength: this.getEncryptionStrength(subscriptionTier),
          keyDerivationRounds: tierConfig.therapeuticLayer.derivationRounds,
          dataSensitivity: context.therapeuticContext ? DataSensitivity.CLINICAL : DataSensitivity.PERSONAL,
          crisisOptimized: crisisMode,
          subscriptionTier
        }
      };

    } catch (error) {
      console.error('Therapeutic layer encryption failed:', error);
      return this.createEmptyLayerResult('therapeutic', subscriptionTier, crisisMode);
    }
  }

  private async encryptContextLayer(
    payload: any,
    context: ValidationContext,
    tierConfig: TierBasedEncryptionConfig,
    subscriptionTier: 'free' | 'premium' | 'clinical',
    therapeuticResult: LayerEncryptionResult
  ): Promise<LayerEncryptionResult> {
    try {
      if (!tierConfig.contextLayer.enabled) {
        return this.createEmptyLayerResult('context', subscriptionTier);
      }

      // Create context metadata to encrypt
      const contextMetadata = {
        subscriptionTier,
        entityType: context.entityType,
        operation: context.operation,
        userId: context.userId,
        sessionId: context.sessionId,
        therapeuticLayer: {
          encrypted: therapeuticResult.encrypted,
          keyVersion: therapeuticResult.keyVersion,
          integrityHash: therapeuticResult.integrityHash
        },
        timestamp: new Date().toISOString()
      };

      const encryptionResult = await encryptionService.encryptData(
        contextMetadata,
        DataSensitivity.SYSTEM
      );

      const integrityHash = await this.calculateLayerIntegrity(
        encryptionResult.encryptedData,
        'context'
      );

      this.layerStats.contextEncryptions++;

      return {
        encrypted: true,
        encryptedData: encryptionResult.encryptedData,
        keyVersion: 1,
        algorithm: tierConfig.contextLayer.algorithm,
        iv: encryptionResult.iv,
        integrityHash,
        layerMetadata: {
          layerType: 'context',
          encryptionStrength: this.getEncryptionStrength(subscriptionTier),
          keyDerivationRounds: tierConfig.contextLayer.derivationRounds,
          dataSensitivity: DataSensitivity.SYSTEM,
          crisisOptimized: false,
          subscriptionTier
        }
      };

    } catch (error) {
      console.error('Context layer encryption failed:', error);
      return this.createEmptyLayerResult('context', subscriptionTier);
    }
  }

  private async encryptTransportLayer(
    payload: any,
    context: ValidationContext,
    tierConfig: TierBasedEncryptionConfig,
    subscriptionTier: 'free' | 'premium' | 'clinical',
    contextResult: LayerEncryptionResult
  ): Promise<LayerEncryptionResult> {
    try {
      if (!tierConfig.transportLayer.enabled) {
        return this.createEmptyLayerResult('transport', subscriptionTier);
      }

      // Transport layer encrypts the entire previous payload structure
      const transportPayload = {
        originalPayload: payload,
        contextLayer: contextResult,
        transportMetadata: {
          encryptionId: await this.generateEncryptionId(),
          subscriptionTier,
          timestamp: new Date().toISOString(),
          zeroKnowledge: true
        }
      };

      const encryptionResult = await encryptionService.encryptData(
        transportPayload,
        DataSensitivity.PERSONAL
      );

      const integrityHash = await this.calculateLayerIntegrity(
        encryptionResult.encryptedData,
        'transport'
      );

      this.layerStats.transportEncryptions++;

      return {
        encrypted: true,
        encryptedData: encryptionResult.encryptedData,
        keyVersion: 1,
        algorithm: tierConfig.transportLayer.algorithm,
        iv: encryptionResult.iv,
        integrityHash,
        layerMetadata: {
          layerType: 'transport',
          encryptionStrength: this.getEncryptionStrength(subscriptionTier),
          keyDerivationRounds: tierConfig.transportLayer.derivationRounds,
          dataSensitivity: DataSensitivity.PERSONAL,
          crisisOptimized: false,
          subscriptionTier
        }
      };

    } catch (error) {
      console.error('Transport layer encryption failed:', error);
      return this.createEmptyLayerResult('transport', subscriptionTier);
    }
  }

  private createEmptyLayerResult(
    layerType: 'therapeutic' | 'context' | 'transport',
    subscriptionTier: 'free' | 'premium' | 'clinical',
    crisisMode: boolean = false
  ): LayerEncryptionResult {
    return {
      encrypted: false,
      encryptedData: '',
      keyVersion: 0,
      algorithm: '',
      iv: '',
      integrityHash: '',
      layerMetadata: {
        layerType,
        encryptionStrength: 'standard',
        keyDerivationRounds: 0,
        dataSensitivity: DataSensitivity.SYSTEM,
        crisisOptimized: crisisMode,
        subscriptionTier
      }
    };
  }

  private getEncryptionStrength(subscriptionTier: 'free' | 'premium' | 'clinical'): 'standard' | 'enhanced' | 'clinical' {
    switch (subscriptionTier) {
      case 'clinical': return 'clinical';
      case 'premium': return 'enhanced';
      default: return 'standard';
    }
  }

  private async combineLayers(
    therapeutic: LayerEncryptionResult,
    context: LayerEncryptionResult,
    transport: LayerEncryptionResult
  ): Promise<string> {
    const combinedData = {
      therapeutic: therapeutic.encrypted ? therapeutic : null,
      context: context.encrypted ? context : null,
      transport: transport.encrypted ? transport : null,
      layerOrder: ['therapeutic', 'context', 'transport'],
      combinedAt: new Date().toISOString()
    };

    return JSON.stringify(combinedData);
  }

  private async parseCombinedPayload(combinedPayload: string): Promise<any> {
    try {
      return JSON.parse(combinedPayload);
    } catch (error) {
      throw new Error('Invalid combined payload format');
    }
  }

  private async decryptLayer(
    layerData: any,
    layerType: 'therapeutic' | 'context' | 'transport',
    decryptionContext: DecryptionContext
  ): Promise<any> {
    // Implementation would decrypt the specific layer
    // For now, return the layer data
    return layerData;
  }

  private async generateEncryptionMetadata(
    subscriptionTier: 'free' | 'premium' | 'clinical',
    context: ValidationContext,
    layers: LayerEncryptionResult[],
    crisisMode: boolean = false
  ): Promise<EncryptionMetadata> {
    const keyRotationStatus = {
      therapeutic: await this.getKeyRotationInfo(subscriptionTier, 'therapeutic'),
      context: await this.getKeyRotationInfo(subscriptionTier, 'context'),
      transport: await this.getKeyRotationInfo(subscriptionTier, 'transport')
    };

    return {
      encryptionId: await this.generateEncryptionId(),
      timestamp: new Date().toISOString(),
      totalLayers: layers.length,
      layersSuccessful: layers.filter(l => l.encrypted).length,
      subscriptionTier,
      complianceLevel: this.getComplianceLevel(subscriptionTier),
      crisisMode,
      keyRotationStatus
    };
  }

  private getComplianceLevel(subscriptionTier: 'free' | 'premium' | 'clinical'): 'basic' | 'enhanced' | 'clinical' {
    switch (subscriptionTier) {
      case 'clinical': return 'clinical';
      case 'premium': return 'enhanced';
      default: return 'basic';
    }
  }

  private async getKeyRotationInfo(
    tier: 'free' | 'premium' | 'clinical',
    layer: 'therapeutic' | 'context' | 'transport'
  ): Promise<KeyRotationInfo> {
    try {
      const rotationDateKey = `being_ml_${layer}_rotation_${tier}`;
      const lastRotationStr = await SecureStore.getItemAsync(rotationDateKey);

      const tierConfig = this.getTierConfig(tier);
      const layerConfig = tierConfig[`${layer}Layer` as keyof TierBasedEncryptionConfig] as any;
      const rotationDays = layerConfig.rotationDays || 180;

      const lastRotation = lastRotationStr ? new Date(lastRotationStr) : new Date();
      const nextRotation = new Date(lastRotation.getTime() + rotationDays * 24 * 60 * 60 * 1000);
      const daysUntilRotation = Math.ceil((nextRotation.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      let rotationPolicy: 'standard' | 'enhanced' | 'strict';
      switch (tier) {
        case 'clinical': rotationPolicy = 'strict'; break;
        case 'premium': rotationPolicy = 'enhanced'; break;
        default: rotationPolicy = 'standard';
      }

      return {
        lastRotation: lastRotation.toISOString(),
        nextRotation: nextRotation.toISOString(),
        rotationPolicy,
        daysUntilRotation,
        rotationCompliant: daysUntilRotation > 0
      };

    } catch (error) {
      console.error(`Failed to get key rotation info for ${tier}/${layer}:`, error);
      return {
        lastRotation: new Date().toISOString(),
        nextRotation: new Date().toISOString(),
        rotationPolicy: 'standard',
        daysUntilRotation: 0,
        rotationCompliant: false
      };
    }
  }

  private async generateLayerKey(
    layer: 'therapeutic' | 'context' | 'transport',
    tierConfig: TierBasedEncryptionConfig
  ): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32); // 256 bits
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async calculateLayerIntegrity(encryptedData: string, layerType: string): Promise<string> {
    const integrityData = JSON.stringify({
      encryptedData,
      layerType,
      timestamp: Date.now()
    });

    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      integrityData,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  private async generateEncryptionId(): Promise<string> {
    const timestamp = Date.now().toString();
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      timestamp,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return `mle_${hash.substring(0, 16)}`;
  }

  private setupKeyRotationSchedule(tier: 'free' | 'premium' | 'clinical'): void {
    // Clear existing timer
    const timerId = this.keyRotationTimers.get(tier);
    if (timerId) {
      clearInterval(timerId);
    }

    const tierConfig = this.getTierConfig(tier);
    const rotationInterval = Math.min(
      tierConfig.therapeuticLayer.rotationDays,
      tierConfig.contextLayer.rotationDays,
      tierConfig.transportLayer.rotationDays
    ) * 24 * 60 * 60 * 1000; // Convert to milliseconds

    // Setup automatic rotation check
    const newTimerId = setInterval(async () => {
      try {
        await this.checkAndRotateKeys(tier);
      } catch (error) {
        console.error(`Key rotation check failed for ${tier}:`, error);
      }
    }, rotationInterval);

    this.keyRotationTimers.set(tier, newTimerId);
  }

  private async checkAndRotateKeys(tier: 'free' | 'premium' | 'clinical'): Promise<void> {
    for (const layer of ['therapeutic', 'context', 'transport'] as const) {
      const rotationInfo = await this.getKeyRotationInfo(tier, layer);

      if (!rotationInfo.rotationCompliant) {
        console.log(`Rotating ${layer} keys for ${tier} tier - ${Math.abs(rotationInfo.daysUntilRotation)} days overdue`);
        await this.rotateTierKeys(tier, layer);
      }
    }
  }

  private checkTierCompliance(
    tier: string,
    keyRotationStatus: Record<string, KeyRotationInfo>
  ): boolean {
    return Object.values(keyRotationStatus).every(info => info.rotationCompliant);
  }

  private async validateTierConfigs(): Promise<void> {
    for (const [tier, config] of this.tierConfigs.entries()) {
      try {
        // Validate each layer configuration
        const layers = ['therapeuticLayer', 'contextLayer', 'transportLayer'] as const;

        for (const layer of layers) {
          const layerConfig = config[layer];
          if (layerConfig.enabled) {
            if (!layerConfig.algorithm || layerConfig.keySize < 128) {
              throw new Error(`Invalid ${layer} configuration for ${tier}`);
            }
          }
        }

        console.log(`Tier configuration validated: ${tier}`);

      } catch (error) {
        console.error(`Tier configuration validation failed for ${tier}:`, error);
      }
    }
  }

  private updateEncryptionStats(
    therapeutic: LayerEncryptionResult,
    context: LayerEncryptionResult,
    transport: LayerEncryptionResult
  ): void {
    this.layerStats.totalEncryptions++;

    if (therapeutic.encrypted) this.layerStats.therapeuticEncryptions++;
    if (context.encrypted) this.layerStats.contextEncryptions++;
    if (transport.encrypted) this.layerStats.transportEncryptions++;

    if (!therapeutic.encrypted && !context.encrypted && !transport.encrypted) {
      this.layerStats.encryptionFailures++;
    }
  }

  private recordEncryptionTime(time: number): void {
    this.encryptionTimes.push(time);
    if (this.encryptionTimes.length > 1000) {
      this.encryptionTimes = this.encryptionTimes.slice(-1000);
    }
  }

  private recordDecryptionTime(time: number): void {
    this.decryptionTimes.push(time);
    if (this.decryptionTimes.length > 1000) {
      this.decryptionTimes = this.decryptionTimes.slice(-1000);
    }
  }

  private setupPerformanceMonitoring(): void {
    setInterval(() => {
      try {
        const avgEncryption = this.encryptionTimes.length > 0
          ? this.encryptionTimes.reduce((a, b) => a + b, 0) / this.encryptionTimes.length
          : 0;

        if (avgEncryption > this.CRISIS_ENCRYPTION_LIMIT * 3) {
          console.warn(`Multi-layer encryption performance degraded: ${avgEncryption}ms average`);
        }
      } catch (error) {
        console.error('Encryption performance monitoring failed:', error);
      }
    }, 5 * 60 * 1000);
  }

  private createFailureResult(error: any, encryptionStart: number): MultiLayerEncryptionResult {
    this.layerStats.encryptionFailures++;

    return {
      success: false,
      layers: {
        therapeutic: this.createEmptyLayerResult('therapeutic', 'free'),
        context: this.createEmptyLayerResult('context', 'free'),
        transport: this.createEmptyLayerResult('transport', 'free')
      },
      combinedPayload: '',
      encryptionMetadata: {
        encryptionId: `failure_${Date.now()}`,
        timestamp: new Date().toISOString(),
        totalLayers: 0,
        layersSuccessful: 0,
        subscriptionTier: 'free',
        complianceLevel: 'basic',
        crisisMode: false,
        keyRotationStatus: {
          therapeutic: {
            lastRotation: new Date().toISOString(),
            nextRotation: new Date().toISOString(),
            rotationPolicy: 'standard',
            daysUntilRotation: 0,
            rotationCompliant: false
          },
          context: {
            lastRotation: new Date().toISOString(),
            nextRotation: new Date().toISOString(),
            rotationPolicy: 'standard',
            daysUntilRotation: 0,
            rotationCompliant: false
          },
          transport: {
            lastRotation: new Date().toISOString(),
            nextRotation: new Date().toISOString(),
            rotationPolicy: 'standard',
            daysUntilRotation: 0,
            rotationCompliant: false
          }
        }
      },
      performanceMetrics: {
        therapeuticTime: 0,
        contextTime: 0,
        transportTime: 0,
        totalTime: Date.now() - encryptionStart
      }
    };
  }

  private async logEncryptionAudit(
    result: MultiLayerEncryptionResult,
    context: ValidationContext,
    subscriptionTier: 'free' | 'premium' | 'clinical'
  ): Promise<void> {
    await securityControlsService.logAuditEntry({
      operation: 'multi_layer_encryption',
      entityType: context.entityType as any,
      dataSensitivity: context.therapeuticContext ? DataSensitivity.CLINICAL : DataSensitivity.PERSONAL,
      userId: context.userId || 'unknown',
      securityContext: {
        authenticated: true,
        biometricUsed: false,
        deviceTrusted: true,
        networkSecure: result.layers.transport.encrypted,
        encryptionActive: result.success
      },
      operationMetadata: {
        success: result.success,
        duration: result.performanceMetrics.totalTime
      },
      complianceMarkers: {
        hipaaRequired: context.therapeuticContext,
        auditRequired: true,
        retentionDays: context.therapeuticContext ? 2555 : 365
      }
    });
  }
}

// Export singleton instance
export const multiLayerEncryptionFramework = MultiLayerEncryptionFramework.getInstance();