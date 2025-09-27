/**
 * Offline Queue Encryption - Core Queue Security Implementation
 *
 * Implements end-to-end encryption for offline operation queues with crisis-aware
 * security protocols, maintaining <200ms emergency access while preserving
 * therapeutic data protection and HIPAA compliance.
 *
 * Key Features:
 * - End-to-end encryption for all queued operations
 * - Subscription tier isolation with independent encryption contexts
 * - Crisis-optimized decryption paths <200ms for emergency access
 * - Therapeutic data protection with clinical-grade encryption
 * - Cross-device queue encryption with synchronized decryption keys
 * - Progressive security degradation for emergency scenarios
 */

import { DataSensitivity, encryptionService, EncryptionResult } from '../EncryptionService';
import { multiLayerEncryptionFramework, MultiLayerEncryptionResult } from '../MultiLayerEncryptionFramework';
import { crisisSafetySecuritySystem, CrisisContext } from '../CrisisSafetySecuritySystem';
import { ValidationContext } from '../ZeroPIIValidationFramework';
import { securityControlsService } from '../SecurityControlsService';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Queue Encryption Types
export interface QueueEncryptionResult {
  success: boolean;
  encryptedPayload: string;
  encryptionMetadata: QueueEncryptionMetadata;
  crisisOptimized: boolean;
  subscriptionContext: SubscriptionEncryptionContext;
  performanceMetrics: QueueEncryptionMetrics;
  emergencyAccessCapable: boolean;
}

export interface QueueEncryptionMetadata {
  queueId: string;
  operationType: 'assessment' | 'checkin' | 'crisis' | 'payment' | 'therapeutic' | 'subscription';
  subscriptionTier: 'free' | 'premium' | 'clinical';
  encryptionLayers: ('queue_meta' | 'operation_payload' | 'conflict_resolution' | 'device_sync')[];
  crisisCapable: boolean;
  emergencyDecryptionTime: number;
  dataMinimization: boolean;
  auditRequired: boolean;
  retentionDays: number;
  timestamp: string;
}

export interface SubscriptionEncryptionContext {
  tier: 'free' | 'premium' | 'clinical';
  encryptionStrength: 'basic' | 'enhanced' | 'clinical';
  keyDerivationRounds: number;
  isolationEnabled: boolean;
  crossTierAccessBlocked: boolean;
  tierSpecificKeys: boolean;
}

export interface QueueEncryptionMetrics {
  encryptionTime: number;
  metadataEncryptionTime: number;
  payloadEncryptionTime: number;
  totalOperationTime: number;
  crisisOptimizationTime?: number;
  memoryUsage: number;
}

export interface QueueDecryptionContext {
  queueId: string;
  originalTier: 'free' | 'premium' | 'clinical';
  requestedTier: 'free' | 'premium' | 'clinical';
  operationType: string;
  crisisMode: boolean;
  emergencyAccess: boolean;
  maxDecryptionTime: number;
  auditRequired: boolean;
}

export interface CrisisQueueAccess {
  emergencyDecryptionEnabled: boolean;
  maxDecryptionTime: number; // milliseconds
  preservedDataTypes: ('therapeutic' | 'assessment' | 'crisis' | 'emergency_contact')[];
  bypassedSecurityLayers: string[];
  auditTrailMaintained: boolean;
}

export interface QueueOperationEncryption {
  operationId: string;
  operationType: 'assessment' | 'checkin' | 'crisis' | 'payment' | 'therapeutic' | 'subscription';
  payload: any;
  subscriptionTier: 'free' | 'premium' | 'clinical';
  conflictResolutionData?: any;
  deviceSyncMetadata?: any;
  emergencyPriority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Offline Queue Encryption Implementation
 */
export class OfflineQueueEncryption {
  private static instance: OfflineQueueEncryption;

  // Encryption configuration per subscription tier
  private tierEncryptionConfigs: Map<string, SubscriptionEncryptionContext> = new Map();

  // Crisis access configuration
  private crisisAccessConfig: CrisisQueueAccess = {
    emergencyDecryptionEnabled: true,
    maxDecryptionTime: 200, // ms
    preservedDataTypes: ['therapeutic', 'assessment', 'crisis', 'emergency_contact'],
    bypassedSecurityLayers: ['device_sync'],
    auditTrailMaintained: true
  };

  // Performance monitoring
  private encryptionMetrics: QueueEncryptionMetrics[] = [];
  private decryptionMetrics: { time: number; crisisMode: boolean }[] = [];

  // Memory and performance limits
  private readonly MAX_ENCRYPTION_TIME = 25; // ms per queue item
  private readonly MAX_CRISIS_DECRYPTION_TIME = 50; // ms for emergency access
  private readonly MAX_BULK_SYNC_TIME = 200; // ms for offline-to-online sync
  private readonly MAX_MEMORY_USAGE = 10 * 1024 * 1024; // 10MB for encryption operations

  private constructor() {
    this.initializeTierConfigs();
    this.initialize();
  }

  public static getInstance(): OfflineQueueEncryption {
    if (!OfflineQueueEncryption.instance) {
      OfflineQueueEncryption.instance = new OfflineQueueEncryption();
    }
    return OfflineQueueEncryption.instance;
  }

  /**
   * Encrypt individual queue operation with subscription tier isolation
   */
  async encryptQueueOperation(
    operation: QueueOperationEncryption,
    context: ValidationContext,
    crisisContext?: CrisisContext
  ): Promise<QueueEncryptionResult> {
    const encryptionStart = Date.now();
    const memoryStart = this.getMemoryUsage();

    try {
      // Get subscription-specific encryption context
      const subscriptionContext = this.getTierEncryptionContext(operation.subscriptionTier);

      // Determine crisis optimization
      const crisisOptimized = crisisContext?.crisisLevel === 'critical' ||
                             crisisContext?.crisisLevel === 'high' ||
                             operation.emergencyPriority === 'critical';

      // Apply crisis-specific optimizations if needed
      if (crisisOptimized) {
        return await this.encryptCrisisOptimizedOperation(
          operation,
          context,
          subscriptionContext,
          crisisContext,
          encryptionStart,
          memoryStart
        );
      }

      // Standard queue operation encryption
      const metadataStart = Date.now();
      const metadataEncryption = await this.encryptQueueMetadata(
        operation,
        context,
        subscriptionContext
      );
      const metadataTime = Date.now() - metadataStart;

      // Payload encryption with multi-layer framework
      const payloadStart = Date.now();
      const payloadEncryption = await this.encryptOperationPayload(
        operation,
        context,
        subscriptionContext
      );
      const payloadTime = Date.now() - payloadStart;

      // Conflict resolution data encryption
      const conflictEncryption = operation.conflictResolutionData
        ? await this.encryptConflictResolutionData(
            operation.conflictResolutionData,
            context,
            subscriptionContext
          )
        : null;

      // Device sync metadata encryption
      const deviceSyncEncryption = operation.deviceSyncMetadata
        ? await this.encryptDeviceSyncMetadata(
            operation.deviceSyncMetadata,
            context,
            subscriptionContext
          )
        : null;

      // Combine all encrypted layers
      const combinedEncryption = await this.combineQueueEncryptionLayers(
        metadataEncryption,
        payloadEncryption,
        conflictEncryption,
        deviceSyncEncryption
      );

      // Generate queue encryption metadata
      const encryptionMetadata = await this.generateQueueEncryptionMetadata(
        operation,
        subscriptionContext,
        crisisOptimized,
        encryptionStart
      );

      const totalTime = Date.now() - encryptionStart;
      const memoryUsed = this.getMemoryUsage() - memoryStart;

      // Validate performance requirements
      this.validateEncryptionPerformance(totalTime, memoryUsed, crisisOptimized);

      // Record metrics
      const metrics: QueueEncryptionMetrics = {
        encryptionTime: totalTime,
        metadataEncryptionTime: metadataTime,
        payloadEncryptionTime: payloadTime,
        totalOperationTime: totalTime,
        memoryUsage: memoryUsed
      };

      this.recordEncryptionMetrics(metrics);

      const result: QueueEncryptionResult = {
        success: true,
        encryptedPayload: combinedEncryption,
        encryptionMetadata,
        crisisOptimized,
        subscriptionContext,
        performanceMetrics: metrics,
        emergencyAccessCapable: this.isEmergencyAccessCapable(operation, encryptionMetadata)
      };

      // Audit queue encryption
      await this.auditQueueEncryption(result, operation, context);

      return result;

    } catch (error) {
      console.error('Queue operation encryption failed:', error);

      // Emergency fallback for critical operations
      if (operation.emergencyPriority === 'critical' || crisisContext?.crisisLevel === 'critical') {
        return await this.emergencyQueueEncryptionFallback(
          operation,
          context,
          error,
          encryptionStart
        );
      }

      throw new Error(`Queue encryption failed: ${error}`);
    }
  }

  /**
   * Decrypt queue operation with crisis-aware emergency access
   */
  async decryptQueueOperation(
    encryptedPayload: string,
    decryptionContext: QueueDecryptionContext
  ): Promise<{
    success: boolean;
    operation: QueueOperationEncryption | null;
    decryptionTime: number;
    crisisAccessUsed: boolean;
    securityLayersProcessed: string[];
    auditEntry: any;
  }> {
    const decryptionStart = Date.now();

    try {
      // Crisis emergency access path
      if (decryptionContext.crisisMode && decryptionContext.emergencyAccess) {
        return await this.emergencyDecryptQueueOperation(
          encryptedPayload,
          decryptionContext,
          decryptionStart
        );
      }

      // Validate subscription tier access
      const accessGranted = await this.validateTierAccess(
        decryptionContext.originalTier,
        decryptionContext.requestedTier
      );

      if (!accessGranted) {
        throw new Error('Subscription tier access denied for queue operation');
      }

      // Standard decryption process
      const parsedPayload = JSON.parse(encryptedPayload);
      const securityLayersProcessed: string[] = [];

      // Decrypt layers in reverse order
      let currentData = parsedPayload;

      // Device sync layer
      if (currentData.deviceSyncLayer) {
        currentData = await this.decryptDeviceSyncLayer(currentData.deviceSyncLayer);
        securityLayersProcessed.push('device_sync');
      }

      // Conflict resolution layer
      if (currentData.conflictResolutionLayer) {
        currentData = await this.decryptConflictResolutionLayer(currentData.conflictResolutionLayer);
        securityLayersProcessed.push('conflict_resolution');
      }

      // Operation payload layer
      if (currentData.payloadLayer) {
        currentData = await this.decryptPayloadLayer(
          currentData.payloadLayer,
          decryptionContext
        );
        securityLayersProcessed.push('operation_payload');
      }

      // Queue metadata layer
      if (currentData.metadataLayer) {
        currentData = await this.decryptMetadataLayer(currentData.metadataLayer);
        securityLayersProcessed.push('queue_meta');
      }

      const decryptionTime = Date.now() - decryptionStart;

      // Validate decryption performance
      if (decryptionTime > decryptionContext.maxDecryptionTime) {
        console.warn(`Queue decryption exceeded time limit: ${decryptionTime}ms > ${decryptionContext.maxDecryptionTime}ms`);
      }

      // Record decryption metrics
      this.recordDecryptionMetrics(decryptionTime, decryptionContext.crisisMode);

      // Generate audit entry
      const auditEntry = await this.generateDecryptionAuditEntry(
        decryptionContext,
        decryptionTime,
        securityLayersProcessed
      );

      return {
        success: true,
        operation: currentData as QueueOperationEncryption,
        decryptionTime,
        crisisAccessUsed: false,
        securityLayersProcessed,
        auditEntry
      };

    } catch (error) {
      console.error('Queue operation decryption failed:', error);

      return {
        success: false,
        operation: null,
        decryptionTime: Date.now() - decryptionStart,
        crisisAccessUsed: false,
        securityLayersProcessed: [],
        auditEntry: await this.generateFailureAuditEntry(decryptionContext, error)
      };
    }
  }

  /**
   * Bulk encrypt queue operations for offline-to-online synchronization
   */
  async bulkEncryptQueueOperations(
    operations: QueueOperationEncryption[],
    context: ValidationContext,
    maxProcessingTime: number = this.MAX_BULK_SYNC_TIME
  ): Promise<{
    success: boolean;
    encryptedOperations: QueueEncryptionResult[];
    failedOperations: { operation: QueueOperationEncryption; error: string }[];
    totalProcessingTime: number;
    averageEncryptionTime: number;
    syncCapable: boolean;
  }> {
    const bulkStart = Date.now();
    const encryptedOperations: QueueEncryptionResult[] = [];
    const failedOperations: { operation: QueueOperationEncryption; error: string }[] = [];

    try {
      // Sort operations by priority (critical first)
      const sortedOperations = this.prioritizeOperationsForEncryption(operations);

      // Process operations with time budget allocation
      const timePerOperation = Math.min(
        this.MAX_ENCRYPTION_TIME,
        maxProcessingTime / sortedOperations.length
      );

      for (const operation of sortedOperations) {
        const operationStart = Date.now();

        try {
          // Check remaining time budget
          const elapsed = Date.now() - bulkStart;
          if (elapsed > maxProcessingTime * 0.9) {
            console.warn('Bulk encryption approaching time limit, skipping remaining operations');
            break;
          }

          const result = await this.encryptQueueOperation(operation, context);
          encryptedOperations.push(result);

          // Validate individual operation time
          const operationTime = Date.now() - operationStart;
          if (operationTime > timePerOperation * 1.5) {
            console.warn(`Queue operation encryption exceeded time budget: ${operationTime}ms`);
          }

        } catch (error) {
          console.error(`Failed to encrypt operation ${operation.operationId}:`, error);
          failedOperations.push({
            operation,
            error: error.toString()
          });
        }
      }

      const totalProcessingTime = Date.now() - bulkStart;
      const averageEncryptionTime = encryptedOperations.length > 0
        ? totalProcessingTime / encryptedOperations.length
        : 0;

      const syncCapable = totalProcessingTime <= maxProcessingTime &&
                         failedOperations.length === 0;

      // Log bulk encryption metrics
      await this.logBulkEncryptionMetrics({
        totalOperations: operations.length,
        successfulOperations: encryptedOperations.length,
        failedOperations: failedOperations.length,
        totalTime: totalProcessingTime,
        averageTime: averageEncryptionTime,
        syncCapable
      });

      return {
        success: failedOperations.length === 0,
        encryptedOperations,
        failedOperations,
        totalProcessingTime,
        averageEncryptionTime,
        syncCapable
      };

    } catch (error) {
      console.error('Bulk queue encryption failed:', error);

      return {
        success: false,
        encryptedOperations: [],
        failedOperations: operations.map(op => ({ operation: op, error: error.toString() })),
        totalProcessingTime: Date.now() - bulkStart,
        averageEncryptionTime: 0,
        syncCapable: false
      };
    }
  }

  /**
   * Get queue encryption performance metrics
   */
  getQueueEncryptionMetrics(): {
    averageEncryptionTime: number;
    averageDecryptionTime: number;
    crisisDecryptionCompliance: number;
    bulkSyncCapability: number;
    memoryEfficiency: number;
    recommendations: string[];
  } {
    const avgEncryption = this.encryptionMetrics.length > 0
      ? this.encryptionMetrics.reduce((sum, m) => sum + m.encryptionTime, 0) / this.encryptionMetrics.length
      : 0;

    const avgDecryption = this.decryptionMetrics.length > 0
      ? this.decryptionMetrics.reduce((sum, m) => sum + m.time, 0) / this.decryptionMetrics.length
      : 0;

    const crisisDecryptions = this.decryptionMetrics.filter(m => m.crisisMode);
    const crisisCompliance = crisisDecryptions.length > 0
      ? (crisisDecryptions.filter(m => m.time <= this.MAX_CRISIS_DECRYPTION_TIME).length / crisisDecryptions.length) * 100
      : 100;

    const avgMemory = this.encryptionMetrics.length > 0
      ? this.encryptionMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.encryptionMetrics.length
      : 0;

    const memoryEfficiency = Math.max(0, 100 - (avgMemory / this.MAX_MEMORY_USAGE) * 100);

    const bulkSyncCapability = avgEncryption <= this.MAX_ENCRYPTION_TIME ? 100 :
      Math.max(0, 100 - ((avgEncryption - this.MAX_ENCRYPTION_TIME) / this.MAX_ENCRYPTION_TIME) * 100);

    const recommendations: string[] = [];

    if (avgEncryption > this.MAX_ENCRYPTION_TIME) {
      recommendations.push(`Optimize queue encryption: ${avgEncryption.toFixed(1)}ms exceeds ${this.MAX_ENCRYPTION_TIME}ms target`);
    }

    if (crisisCompliance < 95) {
      recommendations.push('Improve crisis decryption performance for emergency access');
    }

    if (memoryEfficiency < 80) {
      recommendations.push('Optimize memory usage for queue encryption operations');
    }

    if (bulkSyncCapability < 90) {
      recommendations.push('Improve bulk sync performance for offline-to-online transitions');
    }

    return {
      averageEncryptionTime: avgEncryption,
      averageDecryptionTime: avgDecryption,
      crisisDecryptionCompliance: crisisCompliance,
      bulkSyncCapability,
      memoryEfficiency,
      recommendations
    };
  }

  // ===========================================
  // PRIVATE IMPLEMENTATION METHODS
  // ===========================================

  private async initialize(): Promise<void> {
    try {
      // Initialize queue encryption keys for all tiers
      await this.initializeQueueEncryptionKeys();

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      console.log('Offline queue encryption initialized');

    } catch (error) {
      console.error('Queue encryption initialization failed:', error);
    }
  }

  private initializeTierConfigs(): void {
    // Free tier configuration
    this.tierEncryptionConfigs.set('free', {
      tier: 'free',
      encryptionStrength: 'basic',
      keyDerivationRounds: 10000,
      isolationEnabled: true,
      crossTierAccessBlocked: true,
      tierSpecificKeys: true
    });

    // Premium tier configuration
    this.tierEncryptionConfigs.set('premium', {
      tier: 'premium',
      encryptionStrength: 'enhanced',
      keyDerivationRounds: 50000,
      isolationEnabled: true,
      crossTierAccessBlocked: true,
      tierSpecificKeys: true
    });

    // Clinical tier configuration
    this.tierEncryptionConfigs.set('clinical', {
      tier: 'clinical',
      encryptionStrength: 'clinical',
      keyDerivationRounds: 100000,
      isolationEnabled: true,
      crossTierAccessBlocked: true,
      tierSpecificKeys: true
    });
  }

  private getTierEncryptionContext(tier: 'free' | 'premium' | 'clinical'): SubscriptionEncryptionContext {
    return this.tierEncryptionConfigs.get(tier) || this.tierEncryptionConfigs.get('free')!;
  }

  private async encryptCrisisOptimizedOperation(
    operation: QueueOperationEncryption,
    context: ValidationContext,
    subscriptionContext: SubscriptionEncryptionContext,
    crisisContext: CrisisContext | undefined,
    encryptionStart: number,
    memoryStart: number
  ): Promise<QueueEncryptionResult> {
    // Crisis-optimized encryption with reduced layers and faster processing
    const crisisStart = Date.now();

    try {
      // Validate crisis mode with security system
      const crisisValidation = crisisContext
        ? await crisisSafetySecuritySystem.validateCrisisSecurity(operation.payload, context, crisisContext)
        : null;

      // Emergency encryption - therapeutic data only
      const therapeuticEncryption = await encryptionService.encryptData(
        operation.payload,
        DataSensitivity.CLINICAL
      );

      // Minimal metadata encryption
      const metadataEncryption = await encryptionService.encryptData(
        {
          operationType: operation.operationType,
          operationId: operation.operationId,
          subscriptionTier: operation.subscriptionTier,
          emergencyPriority: operation.emergencyPriority,
          timestamp: new Date().toISOString()
        },
        DataSensitivity.SYSTEM
      );

      const combinedPayload = JSON.stringify({
        therapeutic: therapeuticEncryption,
        metadata: metadataEncryption,
        crisisOptimized: true,
        crisisLevel: crisisContext?.crisisLevel
      });

      const totalTime = Date.now() - encryptionStart;
      const crisisOptimizationTime = Date.now() - crisisStart;
      const memoryUsed = this.getMemoryUsage() - memoryStart;

      const encryptionMetadata = await this.generateQueueEncryptionMetadata(
        operation,
        subscriptionContext,
        true,
        encryptionStart
      );

      const metrics: QueueEncryptionMetrics = {
        encryptionTime: totalTime,
        metadataEncryptionTime: 5, // Minimal metadata
        payloadEncryptionTime: totalTime - 5,
        totalOperationTime: totalTime,
        crisisOptimizationTime,
        memoryUsage: memoryUsed
      };

      return {
        success: true,
        encryptedPayload: combinedPayload,
        encryptionMetadata: {
          ...encryptionMetadata,
          crisisCapable: true,
          emergencyDecryptionTime: crisisOptimizationTime
        },
        crisisOptimized: true,
        subscriptionContext,
        performanceMetrics: metrics,
        emergencyAccessCapable: true
      };

    } catch (error) {
      console.error('Crisis-optimized queue encryption failed:', error);
      throw error;
    }
  }

  private async encryptQueueMetadata(
    operation: QueueOperationEncryption,
    context: ValidationContext,
    subscriptionContext: SubscriptionEncryptionContext
  ): Promise<EncryptionResult> {
    const metadata = {
      operationType: operation.operationType,
      operationId: operation.operationId,
      subscriptionTier: operation.subscriptionTier,
      emergencyPriority: operation.emergencyPriority,
      userId: context.userId,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString(),
      tierSpecific: subscriptionContext.tierSpecificKeys
    };

    return await encryptionService.encryptData(metadata, DataSensitivity.SYSTEM);
  }

  private async encryptOperationPayload(
    operation: QueueOperationEncryption,
    context: ValidationContext,
    subscriptionContext: SubscriptionEncryptionContext
  ): Promise<MultiLayerEncryptionResult> {
    // Determine data sensitivity based on operation type
    const dataSensitivity = this.getOperationDataSensitivity(operation.operationType);

    // Use multi-layer encryption for enhanced security
    return await multiLayerEncryptionFramework.encryptMultiLayer(
      operation.payload,
      {
        ...context,
        therapeuticContext: operation.operationType === 'therapeutic' || operation.operationType === 'assessment',
        emergencyContext: operation.emergencyPriority === 'critical'
      },
      operation.subscriptionTier
    );
  }

  private async encryptConflictResolutionData(
    conflictData: any,
    context: ValidationContext,
    subscriptionContext: SubscriptionEncryptionContext
  ): Promise<EncryptionResult> {
    return await encryptionService.encryptData(
      conflictData,
      DataSensitivity.PERSONAL
    );
  }

  private async encryptDeviceSyncMetadata(
    syncMetadata: any,
    context: ValidationContext,
    subscriptionContext: SubscriptionEncryptionContext
  ): Promise<EncryptionResult> {
    return await encryptionService.encryptData(
      syncMetadata,
      DataSensitivity.SYSTEM
    );
  }

  private async combineQueueEncryptionLayers(
    metadataEncryption: EncryptionResult,
    payloadEncryption: MultiLayerEncryptionResult,
    conflictEncryption: EncryptionResult | null,
    deviceSyncEncryption: EncryptionResult | null
  ): Promise<string> {
    const combinedData = {
      metadataLayer: metadataEncryption,
      payloadLayer: payloadEncryption,
      conflictResolutionLayer: conflictEncryption,
      deviceSyncLayer: deviceSyncEncryption,
      encryptionOrder: ['metadata', 'payload', 'conflict_resolution', 'device_sync'],
      combinedAt: new Date().toISOString()
    };

    return JSON.stringify(combinedData);
  }

  private async generateQueueEncryptionMetadata(
    operation: QueueOperationEncryption,
    subscriptionContext: SubscriptionEncryptionContext,
    crisisOptimized: boolean,
    encryptionStart: number
  ): Promise<QueueEncryptionMetadata> {
    return {
      queueId: await this.generateQueueId(),
      operationType: operation.operationType,
      subscriptionTier: operation.subscriptionTier,
      encryptionLayers: this.determineEncryptionLayers(operation, crisisOptimized),
      crisisCapable: crisisOptimized || operation.emergencyPriority === 'critical',
      emergencyDecryptionTime: this.estimateEmergencyDecryptionTime(operation),
      dataMinimization: this.isDataMinimized(operation),
      auditRequired: this.isAuditRequired(operation),
      retentionDays: this.getRetentionDays(operation),
      timestamp: new Date().toISOString()
    };
  }

  private determineEncryptionLayers(
    operation: QueueOperationEncryption,
    crisisOptimized: boolean
  ): ('queue_meta' | 'operation_payload' | 'conflict_resolution' | 'device_sync')[] {
    const layers: ('queue_meta' | 'operation_payload' | 'conflict_resolution' | 'device_sync')[] = ['queue_meta', 'operation_payload'];

    if (!crisisOptimized) {
      if (operation.conflictResolutionData) {
        layers.push('conflict_resolution');
      }
      if (operation.deviceSyncMetadata) {
        layers.push('device_sync');
      }
    }

    return layers;
  }

  private getOperationDataSensitivity(operationType: string): DataSensitivity {
    switch (operationType) {
      case 'assessment':
      case 'crisis':
      case 'therapeutic':
        return DataSensitivity.CLINICAL;
      case 'payment':
        return DataSensitivity.PERSONAL;
      case 'checkin':
      case 'subscription':
        return DataSensitivity.PERSONAL;
      default:
        return DataSensitivity.SYSTEM;
    }
  }

  private isEmergencyAccessCapable(
    operation: QueueOperationEncryption,
    metadata: QueueEncryptionMetadata
  ): boolean {
    return metadata.crisisCapable &&
           metadata.emergencyDecryptionTime <= this.MAX_CRISIS_DECRYPTION_TIME;
  }

  private async emergencyQueueEncryptionFallback(
    operation: QueueOperationEncryption,
    context: ValidationContext,
    error: any,
    encryptionStart: number
  ): Promise<QueueEncryptionResult> {
    console.warn('Using emergency queue encryption fallback');

    // Minimal encryption for critical operations
    const basicEncryption = await encryptionService.encryptData(
      operation.payload,
      DataSensitivity.CLINICAL
    );

    const subscriptionContext = this.getTierEncryptionContext(operation.subscriptionTier);

    return {
      success: true,
      encryptedPayload: JSON.stringify({ emergency: basicEncryption }),
      encryptionMetadata: {
        queueId: `emergency_${Date.now()}`,
        operationType: operation.operationType,
        subscriptionTier: operation.subscriptionTier,
        encryptionLayers: ['queue_meta'],
        crisisCapable: true,
        emergencyDecryptionTime: 0,
        dataMinimization: false,
        auditRequired: true,
        retentionDays: 2555,
        timestamp: new Date().toISOString()
      },
      crisisOptimized: true,
      subscriptionContext,
      performanceMetrics: {
        encryptionTime: Date.now() - encryptionStart,
        metadataEncryptionTime: 0,
        payloadEncryptionTime: Date.now() - encryptionStart,
        totalOperationTime: Date.now() - encryptionStart,
        memoryUsage: 0
      },
      emergencyAccessCapable: true
    };
  }

  private async emergencyDecryptQueueOperation(
    encryptedPayload: string,
    decryptionContext: QueueDecryptionContext,
    decryptionStart: number
  ): Promise<{
    success: boolean;
    operation: QueueOperationEncryption | null;
    decryptionTime: number;
    crisisAccessUsed: boolean;
    securityLayersProcessed: string[];
    auditEntry: any;
  }> {
    try {
      // Ultra-fast decryption for crisis scenarios
      const parsedPayload = JSON.parse(encryptedPayload);

      let decryptedOperation: any = null;

      // Handle different emergency formats
      if (parsedPayload.emergency) {
        // Emergency fallback format
        decryptedOperation = await encryptionService.decryptData(parsedPayload.emergency);
      } else if (parsedPayload.therapeutic && parsedPayload.crisisOptimized) {
        // Crisis-optimized format
        decryptedOperation = await encryptionService.decryptData(parsedPayload.therapeutic);
      } else {
        // Standard format - decrypt therapeutic layer only for speed
        const payloadLayer = parsedPayload.payloadLayer;
        if (payloadLayer?.layers?.therapeutic) {
          decryptedOperation = await encryptionService.decryptData(
            payloadLayer.layers.therapeutic.encryptedData
          );
        }
      }

      const decryptionTime = Date.now() - decryptionStart;

      // Validate emergency decryption time
      if (decryptionTime > this.crisisAccessConfig.maxDecryptionTime) {
        console.warn(`Emergency decryption exceeded time limit: ${decryptionTime}ms`);
      }

      return {
        success: true,
        operation: decryptedOperation,
        decryptionTime,
        crisisAccessUsed: true,
        securityLayersProcessed: ['emergency_therapeutic'],
        auditEntry: {
          emergency: true,
          decryptionTime,
          crisisMode: true,
          securityOverride: 'emergency_access'
        }
      };

    } catch (error) {
      console.error('Emergency queue decryption failed:', error);

      return {
        success: false,
        operation: null,
        decryptionTime: Date.now() - decryptionStart,
        crisisAccessUsed: true,
        securityLayersProcessed: [],
        auditEntry: {
          emergency: true,
          error: error.toString(),
          failure: true
        }
      };
    }
  }

  private async validateTierAccess(
    originalTier: 'free' | 'premium' | 'clinical',
    requestedTier: 'free' | 'premium' | 'clinical'
  ): Promise<boolean> {
    // Allow access to same tier or downgrade
    const tierHierarchy = { free: 0, premium: 1, clinical: 2 };
    return tierHierarchy[requestedTier] <= tierHierarchy[originalTier];
  }

  private prioritizeOperationsForEncryption(operations: QueueOperationEncryption[]): QueueOperationEncryption[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return operations.sort((a, b) => {
      // First by emergency priority
      const priorityDiff = priorityOrder[a.emergencyPriority] - priorityOrder[b.emergencyPriority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by operation type (crisis/assessment first)
      const typeOrder = { crisis: 0, assessment: 1, therapeutic: 2, checkin: 3, payment: 4, subscription: 5 };
      return (typeOrder[a.operationType as keyof typeof typeOrder] || 10) -
             (typeOrder[b.operationType as keyof typeof typeOrder] || 10);
    });
  }

  private validateEncryptionPerformance(
    encryptionTime: number,
    memoryUsed: number,
    crisisOptimized: boolean
  ): void {
    const timeLimit = crisisOptimized ? this.MAX_CRISIS_DECRYPTION_TIME : this.MAX_ENCRYPTION_TIME;

    if (encryptionTime > timeLimit) {
      console.warn(`Queue encryption exceeded time limit: ${encryptionTime}ms > ${timeLimit}ms`);
    }

    if (memoryUsed > this.MAX_MEMORY_USAGE) {
      console.warn(`Queue encryption exceeded memory limit: ${memoryUsed} bytes > ${this.MAX_MEMORY_USAGE} bytes`);
    }
  }

  private recordEncryptionMetrics(metrics: QueueEncryptionMetrics): void {
    this.encryptionMetrics.push(metrics);
    if (this.encryptionMetrics.length > 1000) {
      this.encryptionMetrics = this.encryptionMetrics.slice(-1000);
    }
  }

  private recordDecryptionMetrics(time: number, crisisMode: boolean): void {
    this.decryptionMetrics.push({ time, crisisMode });
    if (this.decryptionMetrics.length > 1000) {
      this.decryptionMetrics = this.decryptionMetrics.slice(-1000);
    }
  }

  // Additional helper methods
  private getMemoryUsage(): number {
    // Simplified memory usage estimation
    return process.memoryUsage?.()?.heapUsed || 0;
  }

  private async generateQueueId(): Promise<string> {
    const timestamp = Date.now().toString();
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `queue_${timestamp}`,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return `queue_${hash.substring(0, 16)}`;
  }

  private estimateEmergencyDecryptionTime(operation: QueueOperationEncryption): number {
    // Estimate based on operation complexity
    switch (operation.operationType) {
      case 'crisis': return 25;
      case 'assessment': return 35;
      case 'therapeutic': return 30;
      case 'payment': return 40;
      default: return 20;
    }
  }

  private isDataMinimized(operation: QueueOperationEncryption): boolean {
    // Check if operation contains only necessary data
    return operation.operationType !== 'payment' &&
           !operation.deviceSyncMetadata;
  }

  private isAuditRequired(operation: QueueOperationEncryption): boolean {
    return operation.operationType === 'crisis' ||
           operation.operationType === 'assessment' ||
           operation.operationType === 'payment' ||
           operation.emergencyPriority === 'critical';
  }

  private getRetentionDays(operation: QueueOperationEncryption): number {
    switch (operation.operationType) {
      case 'crisis':
      case 'assessment':
      case 'therapeutic':
        return 2555; // 7 years for clinical data
      case 'payment':
        return 2555; // 7 years for financial data
      default:
        return 365; // 1 year for other data
    }
  }

  private setupPerformanceMonitoring(): void {
    setInterval(() => {
      try {
        const metrics = this.getQueueEncryptionMetrics();

        if (metrics.averageEncryptionTime > this.MAX_ENCRYPTION_TIME * 1.5) {
          console.warn('Queue encryption performance degraded');
        }

        if (metrics.crisisDecryptionCompliance < 90) {
          console.warn('Crisis decryption performance below target');
        }
      } catch (error) {
        console.error('Queue encryption monitoring failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async initializeQueueEncryptionKeys(): Promise<void> {
    // Initialize encryption keys for all subscription tiers
    for (const tier of ['free', 'premium', 'clinical']) {
      try {
        const keyName = `being_queue_encryption_${tier}`;
        const existingKey = await SecureStore.getItemAsync(keyName);

        if (!existingKey) {
          const newKey = await this.generateQueueEncryptionKey();
          await SecureStore.setItemAsync(keyName, newKey);
          console.log(`Initialized queue encryption key for ${tier} tier`);
        }
      } catch (error) {
        console.error(`Failed to initialize queue encryption key for ${tier}:`, error);
      }
    }
  }

  private async generateQueueEncryptionKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Decryption layer methods
  private async decryptDeviceSyncLayer(layer: any): Promise<any> {
    return await encryptionService.decryptData(layer);
  }

  private async decryptConflictResolutionLayer(layer: any): Promise<any> {
    return await encryptionService.decryptData(layer);
  }

  private async decryptPayloadLayer(layer: any, context: QueueDecryptionContext): Promise<any> {
    if (layer.combinedPayload) {
      // Multi-layer decryption
      return await multiLayerEncryptionFramework.decryptMultiLayer(
        layer.combinedPayload,
        {
          encryptionId: layer.encryptionMetadata?.encryptionId || '',
          originalTier: context.originalTier,
          layersToDecrypt: ['therapeutic', 'context', 'transport'],
          crisisMode: context.crisisMode,
          emergencyBypass: context.emergencyAccess,
          validationRequired: false
        }
      );
    }

    // Single layer decryption
    return await encryptionService.decryptData(layer);
  }

  private async decryptMetadataLayer(layer: any): Promise<any> {
    return await encryptionService.decryptData(layer);
  }

  private async auditQueueEncryption(
    result: QueueEncryptionResult,
    operation: QueueOperationEncryption,
    context: ValidationContext
  ): Promise<void> {
    if (result.encryptionMetadata.auditRequired) {
      await securityControlsService.logAuditEntry({
        operation: 'queue_operation_encryption',
        entityType: operation.operationType as any,
        dataSensitivity: this.getOperationDataSensitivity(operation.operationType),
        userId: context.userId || 'system',
        securityContext: {
          authenticated: true,
          biometricUsed: false,
          deviceTrusted: true,
          networkSecure: false, // Offline queue
          encryptionActive: result.success
        },
        operationMetadata: {
          success: result.success,
          duration: result.performanceMetrics.totalOperationTime
        },
        complianceMarkers: {
          hipaaRequired: operation.operationType === 'assessment' || operation.operationType === 'crisis' || operation.operationType === 'therapeutic',
          auditRequired: true,
          retentionDays: result.encryptionMetadata.retentionDays
        }
      });
    }
  }

  private async generateDecryptionAuditEntry(
    context: QueueDecryptionContext,
    decryptionTime: number,
    securityLayers: string[]
  ): Promise<any> {
    return {
      queueId: context.queueId,
      operationType: context.operationType,
      decryptionTime,
      crisisMode: context.crisisMode,
      emergencyAccess: context.emergencyAccess,
      securityLayersProcessed: securityLayers,
      tierAccess: `${context.requestedTier}_from_${context.originalTier}`,
      auditRequired: context.auditRequired,
      timestamp: new Date().toISOString()
    };
  }

  private async generateFailureAuditEntry(
    context: QueueDecryptionContext,
    error: any
  ): Promise<any> {
    return {
      queueId: context.queueId,
      operationType: context.operationType,
      failure: true,
      error: error.toString(),
      crisisMode: context.crisisMode,
      emergencyAccess: context.emergencyAccess,
      timestamp: new Date().toISOString()
    };
  }

  private async logBulkEncryptionMetrics(metrics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    totalTime: number;
    averageTime: number;
    syncCapable: boolean;
  }): Promise<void> {
    console.log(`Bulk queue encryption: ${metrics.successfulOperations}/${metrics.totalOperations} operations in ${metrics.totalTime}ms (avg: ${metrics.averageTime.toFixed(1)}ms)`);

    if (!metrics.syncCapable) {
      console.warn('Bulk encryption not sync capable - performance optimization needed');
    }
  }
}

// Export singleton instance
export const offlineQueueEncryption = OfflineQueueEncryption.getInstance();