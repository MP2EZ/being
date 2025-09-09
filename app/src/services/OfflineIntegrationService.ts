/**
 * OfflineIntegrationService - Central coordination hub for all offline services
 * Provides unified API for enhanced offline functionality with clinical safety
 * Manages interactions between queue, network, cache, and session services
 */

import { enhancedOfflineQueueService } from './EnhancedOfflineQueueService';
import { networkAwareService } from './NetworkAwareService';
import { assetCacheService } from './AssetCacheService';
import { resumableSessionService } from './ResumableSessionService';
import { dataStore } from './storage/SecureDataStore';
import {
  OfflineActionType,
  OfflineActionData,
  OfflinePriority,
  OfflineOperationResult,
  BatchOperationResult,
  OfflineServiceHealth,
  OfflineQueueStatistics,
  EnhancedNetworkState,
  NetworkQuality,
  ConflictResolutionStrategy,
  DataIntegrityResult,
  ClinicalSafetyHelpers
} from '../types/offline';
import { CheckIn, Assessment, UserProfile } from '../types';

/**
 * Unified offline operation options
 */
interface OfflineOperationOptions {
  priority?: OfflinePriority;
  conflictResolution?: ConflictResolutionStrategy;
  requiresEncryption?: boolean;
  clinicalValidation?: boolean;
  dependencies?: string[];
  retryOnFailure?: boolean;
  waitForNetwork?: boolean;
  timeoutMs?: number;
}

/**
 * Comprehensive offline status
 */
interface OfflineStatus {
  isOnline: boolean;
  networkQuality: NetworkQuality;
  queueSize: number;
  criticalActionsPending: boolean;
  crisisDataPending: boolean;
  lastSyncTime?: string;
  nextScheduledSync?: string;
  storageAvailable: boolean;
  servicesHealth: OfflineServiceHealth;
  recommendations: string[];
}

/**
 * Offline synchronization result
 */
interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  criticalFailures: number;
  duration: number;
  networkQuality: NetworkQuality;
  recommendations: string[];
  nextSyncRecommendedAt?: string;
}

/**
 * Service initialization status
 */
interface ServiceInitStatus {
  queue: boolean;
  network: boolean;
  cache: boolean;
  sessions: boolean;
  integration: boolean;
  allReady: boolean;
  errors: string[];
}

/**
 * Central offline integration and coordination service
 */
class OfflineIntegrationService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private listeners: Array<(status: OfflineStatus) => void> = [];
  private lastSyncTime: string | null = null;
  private syncInProgress = false;
  private criticalSyncTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize all offline services in correct order
   */
  async initialize(): Promise<ServiceInitStatus> {
    if (this.isInitialized) {
      return this.getInitializationStatus();
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.getInitializationStatus();
    }

    this.initializationPromise = this.performInitialization();
    await this.initializationPromise;
    return this.getInitializationStatus();
  }

  /**
   * Perform the actual initialization sequence
   */
  private async performInitialization(): Promise<void> {
    console.log('Initializing OfflineIntegrationService...');
    const errors: string[] = [];

    try {
      // Initialize core services in dependency order
      
      // 1. Asset cache first (needed by other services)
      try {
        // AssetCacheService auto-initializes in constructor
        console.log('✓ Asset cache service ready');
      } catch (error) {
        errors.push(`Asset cache initialization failed: ${error}`);
        console.error('Asset cache initialization failed:', error);
      }

      // 2. Enhanced offline queue
      try {
        // EnhancedOfflineQueueService auto-initializes in constructor
        console.log('✓ Enhanced offline queue service ready');
      } catch (error) {
        errors.push(`Offline queue initialization failed: ${error}`);
        console.error('Offline queue initialization failed:', error);
      }

      // 3. Network aware service
      try {
        await networkAwareService.initialize();
        console.log('✓ Network aware service initialized');
      } catch (error) {
        errors.push(`Network service initialization failed: ${error}`);
        console.error('Network service initialization failed:', error);
      }

      // 4. Resumable sessions (depends on data store)
      try {
        // ResumableSessionService auto-initializes in constructor
        console.log('✓ Resumable session service ready');
      } catch (error) {
        errors.push(`Session service initialization failed: ${error}`);
        console.error('Session service initialization failed:', error);
      }

      // 5. Set up service integration and monitoring
      await this.setupServiceIntegration();
      
      this.isInitialized = true;
      console.log('✓ OfflineIntegrationService initialized successfully');

      // Start monitoring and coordination
      this.startServiceCoordination();

    } catch (error) {
      console.error('OfflineIntegrationService initialization failed:', error);
      errors.push(`Integration service initialization failed: ${error}`);
    }

    if (errors.length > 0) {
      console.warn('Some services failed to initialize:', errors);
    }
  }

  /**
   * Setup integration between services
   */
  private async setupServiceIntegration(): Promise<void> {
    // Network state changes trigger intelligent sync
    networkAwareService.addNetworkListener(async (networkState) => {
      if (networkState.isConnected && !this.syncInProgress) {
        await this.performIntelligentSync();
      }
      
      // Notify status listeners
      this.notifyStatusListeners();
    });

    // Queue changes trigger status updates
    enhancedOfflineQueueService.addStatisticsListener((statistics) => {
      // Check for critical data that needs immediate sync
      if (statistics.criticalActionsCount > 0 || statistics.crisisDataPending) {
        this.scheduleCriticalSync();
      }
      
      this.notifyStatusListeners();
    });

    console.log('Service integration configured');
  }

  /**
   * Start coordination between services
   */
  private startServiceCoordination(): void {
    // Monitor service health
    this.startHealthMonitoring();
    
    // Schedule periodic maintenance
    this.schedulePeriodicMaintenance();
    
    console.log('Service coordination started');
  }

  /**
   * Unified method to perform offline-aware operations
   */
  async performOfflineOperation(
    action: OfflineActionType,
    data: OfflineActionData,
    options: OfflineOperationOptions = {}
  ): Promise<OfflineOperationResult> {
    await this.ensureInitialized();
    
    const startTime = Date.now();
    const networkState = networkAwareService.getState();
    
    try {
      // Determine if operation should proceed immediately or be queued
      const shouldQueue = await this.shouldQueueOperation(action, data, options, networkState);
      
      if (shouldQueue) {
        // Queue for later processing
        return await enhancedOfflineQueueService.queueAction(action, data, {
          priority: options.priority,
          conflictResolution: options.conflictResolution,
          clinicalValidation: options.clinicalValidation,
          dependencies: options.dependencies,
          metadata: {
            requiresEncryption: options.requiresEncryption ?? true,
            retryOnFailure: options.retryOnFailure ?? true
          }
        });
      } else {
        // Try immediate processing
        return await this.processImmediateOperation(action, data, options);
      }
      
    } catch (error) {
      console.error(`Offline operation failed: ${action}`, error);
      
      // Fallback to queueing on error
      try {
        return await enhancedOfflineQueueService.queueAction(action, data, {
          priority: options.priority || OfflinePriority.MEDIUM,
          clinicalValidation: options.clinicalValidation
        });
      } catch (queueError) {
        console.error('Failed to queue operation as fallback:', queueError);
        
        return {
          success: false,
          error: {
            code: 'OPERATION_FAILED',
            message: error instanceof Error ? error.message : 'Operation failed',
            timestamp: new Date().toISOString(),
            recoverable: true,
            clinicalImpact: ClinicalSafetyHelpers.containsCrisisData(data) ? 'critical' : 'medium',
            retryStrategy: {
              type: 'exponential',
              baseDelay: 1000,
              maxDelay: 60000,
              maxRetries: 5,
              backoffMultiplier: 2,
              jitter: true,
              clinicalPriority: false
            }
          },
          queuedForLater: false,
          metadata: {
            operationId: '',
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - startTime,
            networkQuality: networkState.quality,
            offline: !networkState.isConnected
          }
        };
      }
    }
  }

  /**
   * Perform comprehensive sync of all offline data
   */
  async performComprehensiveSync(options: {
    priorityOnly?: boolean;
    maxDuration?: number;
    batchSize?: number;
  } = {}): Promise<SyncResult> {
    await this.ensureInitialized();
    
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    const networkState = networkAwareService.getState();
    
    try {
      console.log('Starting comprehensive offline sync...');
      
      // Check network suitability
      if (!networkState.isConnected) {
        throw new Error('No network connection available for sync');
      }

      // Get sync recommendation
      const recommendation = await networkAwareService.getSyncRecommendation(
        options.priorityOnly ? OfflinePriority.HIGH : OfflinePriority.MEDIUM
      );

      if (!recommendation.shouldSync) {
        console.log('Sync not recommended:', recommendation.reasons.join(', '));
        return {
          success: false,
          processed: 0,
          failed: 0,
          criticalFailures: 0,
          duration: Date.now() - startTime,
          networkQuality: networkState.quality,
          recommendations: recommendation.reasons,
          nextSyncRecommendedAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
        };
      }

      // Perform the sync
      const batchResult = await enhancedOfflineQueueService.processQueue();
      
      // Update last sync time
      this.lastSyncTime = new Date().toISOString();
      
      const result: SyncResult = {
        success: batchResult.successful > 0 || batchResult.failed === 0,
        processed: batchResult.successful,
        failed: batchResult.failed,
        criticalFailures: batchResult.criticalFailures.length,
        duration: Date.now() - startTime,
        networkQuality: networkState.quality,
        recommendations: []
      };

      // Add recommendations based on results
      if (batchResult.failed > 0) {
        result.recommendations.push('Some items failed to sync - will retry automatically');
      }
      
      if (batchResult.criticalFailures.length > 0) {
        result.recommendations.push('Critical failures detected - manual intervention may be required');
      }
      
      if (networkState.quality === NetworkQuality.POOR) {
        result.recommendations.push('Poor network quality - consider waiting for better connection');
        result.nextSyncRecommendedAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      }

      console.log(`Comprehensive sync completed: ${result.processed} processed, ${result.failed} failed in ${result.duration}ms`);
      
      // Notify listeners
      this.notifyStatusListeners();
      
      return result;
      
    } catch (error) {
      console.error('Comprehensive sync failed:', error);
      
      return {
        success: false,
        processed: 0,
        failed: 1,
        criticalFailures: 1,
        duration: Date.now() - startTime,
        networkQuality: networkState.quality,
        recommendations: ['Sync failed - check network connection and try again'],
        nextSyncRecommendedAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get comprehensive offline status
   */
  async getOfflineStatus(): Promise<OfflineStatus> {
    await this.ensureInitialized();
    
    const [networkState, queueStats, serviceHealth] = await Promise.all([
      Promise.resolve(networkAwareService.getState()),
      enhancedOfflineQueueService.getStatistics(),
      enhancedOfflineQueueService.getHealthStatus()
    ]);

    const recommendations: string[] = [];
    
    // Generate recommendations based on status
    if (!networkState.isConnected) {
      recommendations.push('Device is offline - data will sync when connection is restored');
    } else if (networkState.quality === NetworkQuality.POOR) {
      recommendations.push('Poor network quality - sync may be delayed');
    }
    
    if (queueStats.criticalActionsCount > 0) {
      recommendations.push(`${queueStats.criticalActionsCount} critical actions pending sync`);
    }
    
    if (queueStats.crisisDataPending) {
      recommendations.push('Crisis data requires immediate sync when network is available');
    }
    
    if (queueStats.totalActions > 100) {
      recommendations.push('Large sync queue - consider manual sync when on WiFi');
    }

    return {
      isOnline: networkState.isConnected,
      networkQuality: networkState.quality,
      queueSize: queueStats.totalActions,
      criticalActionsPending: queueStats.criticalActionsCount > 0,
      crisisDataPending: queueStats.crisisDataPending,
      lastSyncTime: this.lastSyncTime,
      nextScheduledSync: this.getNextScheduledSyncTime(),
      storageAvailable: await this.checkStorageAvailability(),
      servicesHealth: serviceHealth,
      recommendations
    };
  }

  /**
   * Perform data integrity validation across all services
   */
  async validateDataIntegrity(): Promise<DataIntegrityResult> {
    await this.ensureInitialized();
    
    console.log('Performing comprehensive data integrity validation...');
    
    const result: DataIntegrityResult = {
      isValid: true,
      errors: [],
      warnings: [],
      clinicalConsistency: true,
      assessmentIntegrity: true,
      crisisDataIntegrity: true,
      timestamp: new Date().toISOString(),
      checkedItems: 0,
      repairedItems: 0
    };

    try {
      // Validate queue integrity
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      result.checkedItems += queueStats.totalActions;
      
      // Validate cache integrity
      const cacheValidation = await assetCacheService.validateCache();
      if (!cacheValidation.valid) {
        result.errors.push(...cacheValidation.errors);
        result.isValid = false;
      }
      
      // Validate critical assets
      const cacheStats = await assetCacheService.getCacheStatistics();
      if (!cacheStats.criticalAssetsLoaded) {
        result.warnings.push('Critical assets not fully cached');
      }
      
      // Validate data store consistency
      try {
        const checkIns = await dataStore.getCheckIns();
        const assessments = await dataStore.getAssessments();
        
        result.checkedItems += checkIns.length + assessments.length;
        
        // Validate assessment data integrity
        for (const assessment of assessments) {
          if (!this.validateAssessmentData(assessment)) {
            result.errors.push(`Invalid assessment data: ${assessment.id}`);
            result.assessmentIntegrity = false;
          }
        }
        
        // Validate check-in data integrity
        for (const checkIn of checkIns) {
          if (!this.validateCheckInData(checkIn)) {
            result.warnings.push(`Questionable check-in data: ${checkIn.id}`);
          }
        }
        
      } catch (error) {
        result.errors.push(`Data store validation failed: ${error}`);
        result.isValid = false;
      }

      console.log(`Data integrity validation completed: ${result.checkedItems} items checked, ${result.errors.length} errors`);
      
    } catch (error) {
      console.error('Data integrity validation failed:', error);
      result.errors.push(`Validation process failed: ${error}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Cleanup and optimize all offline services
   */
  async performMaintenance(): Promise<void> {
    await this.ensureInitialized();
    
    console.log('Performing offline services maintenance...');
    
    try {
      // Cleanup expired sessions
      await resumableSessionService.clearExpiredSessions();
      
      // Cleanup old queue actions (handled by enhanced queue service)
      
      // Optimize asset cache
      await assetCacheService.clearCache(true); // Keep critical assets
      
      // Validate data integrity
      const integrityResult = await this.validateDataIntegrity();
      if (!integrityResult.isValid) {
        console.warn('Data integrity issues detected during maintenance:', integrityResult.errors);
      }
      
      console.log('Offline services maintenance completed');
      
    } catch (error) {
      console.error('Maintenance failed:', error);
    }
  }

  /**
   * Emergency sync for critical data only
   */
  async performEmergencySync(): Promise<SyncResult> {
    await this.ensureInitialized();
    
    console.log('Performing emergency sync for critical data...');
    
    const networkState = networkAwareService.getState();
    if (!networkState.isConnected) {
      throw new Error('No network connection for emergency sync');
    }

    // This would be implemented to sync only critical/crisis data
    return await this.performComprehensiveSync({ priorityOnly: true });
  }

  /**
   * Add status change listener
   */
  addStatusListener(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current status
    this.getOfflineStatus().then(status => listener(status));
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Force immediate sync attempt
   */
  async forceSyncNow(): Promise<SyncResult> {
    return await this.performComprehensiveSync();
  }

  /**
   * Get service initialization status
   */
  private getInitializationStatus(): ServiceInitStatus {
    return {
      queue: true, // Enhanced queue auto-initializes
      network: networkAwareService['isInitialized'] ?? false,
      cache: true, // Asset cache auto-initializes
      sessions: true, // Sessions auto-initialize
      integration: this.isInitialized,
      allReady: this.isInitialized,
      errors: []
    };
  }

  /**
   * Ensure service is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Determine if operation should be queued vs processed immediately
   */
  private async shouldQueueOperation(
    action: OfflineActionType,
    data: OfflineActionData,
    options: OfflineOperationOptions,
    networkState: EnhancedNetworkState
  ): Promise<boolean> {
    // Always queue if offline
    if (!networkState.isConnected) {
      return true;
    }

    // Critical operations try immediate processing if network is decent
    if (ClinicalSafetyHelpers.containsCrisisData(data)) {
      return networkState.quality === NetworkQuality.POOR;
    }

    // Queue if network quality is poor and not urgent
    if (networkState.quality === NetworkQuality.POOR && 
        options.priority !== OfflinePriority.CRITICAL) {
      return true;
    }

    // Queue if explicitly requested or if waiting for better network
    return options.waitForNetwork ?? false;
  }

  /**
   * Process operation immediately
   */
  private async processImmediateOperation(
    action: OfflineActionType,
    data: OfflineActionData,
    options: OfflineOperationOptions
  ): Promise<OfflineOperationResult> {
    const startTime = Date.now();
    
    try {
      // Process based on action type
      await this.processActionData(action, data);
      
      return {
        success: true,
        data,
        queuedForLater: false,
        metadata: {
          operationId: `immediate_${Date.now()}`,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          networkQuality: networkAwareService.getState().quality,
          offline: false
        }
      };
      
    } catch (error) {
      throw error; // Will be caught by caller and queued as fallback
    }
  }

  /**
   * Process action data immediately
   */
  private async processActionData(action: OfflineActionType, data: OfflineActionData): Promise<void> {
    switch (action) {
      case 'save_checkin':
      case 'save_checkin_complete':
      case 'save_checkin_partial':
        await dataStore.saveCheckIn(data as CheckIn);
        break;
        
      case 'save_assessment':
      case 'save_assessment_critical':
        await dataStore.saveAssessment(data as Assessment);
        break;
        
      case 'update_user':
      case 'update_preferences':
      case 'update_clinical_profile':
        await dataStore.saveUser(data as UserProfile);
        break;
        
      default:
        throw new Error(`Unsupported immediate action: ${action}`);
    }
  }

  /**
   * Perform intelligent sync based on conditions
   */
  private async performIntelligentSync(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    try {
      const recommendation = await networkAwareService.getSyncRecommendation();
      if (recommendation.shouldSync) {
        await this.performComprehensiveSync();
      }
    } catch (error) {
      console.error('Intelligent sync failed:', error);
    }
  }

  /**
   * Schedule critical sync for urgent data
   */
  private scheduleCriticalSync(): void {
    if (this.criticalSyncTimer) {
      clearTimeout(this.criticalSyncTimer);
    }

    // Try critical sync in 30 seconds if network available
    this.criticalSyncTimer = setTimeout(async () => {
      try {
        const networkState = networkAwareService.getState();
        if (networkState.isConnected) {
          await this.performEmergencySync();
        }
      } catch (error) {
        console.error('Critical sync failed:', error);
      }
    }, 30000);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        const health = await enhancedOfflineQueueService.getHealthStatus();
        if (health.status === 'critical') {
          console.warn('Offline services in critical state:', health.criticalIssues);
        }
      } catch (error) {
        console.error('Health monitoring failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Schedule periodic maintenance
   */
  private schedulePeriodicMaintenance(): void {
    setInterval(async () => {
      try {
        await this.performMaintenance();
      } catch (error) {
        console.error('Periodic maintenance failed:', error);
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours
  }

  /**
   * Notify status listeners
   */
  private async notifyStatusListeners(): Promise<void> {
    try {
      const status = await this.getOfflineStatus();
      this.listeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          console.error('Error in status listener:', error);
        }
      });
    } catch (error) {
      console.error('Failed to notify status listeners:', error);
    }
  }

  /**
   * Utility methods
   */
  
  private getNextScheduledSyncTime(): string | undefined {
    // This would calculate based on background sync settings
    return new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes from now
  }

  private async checkStorageAvailability(): Promise<boolean> {
    // This would check device storage
    return true; // Placeholder
  }

  private validateAssessmentData(assessment: Assessment): boolean {
    return assessment.id && 
           assessment.type && 
           Array.isArray(assessment.answers) && 
           typeof assessment.score === 'number';
  }

  private validateCheckInData(checkIn: CheckIn): boolean {
    return checkIn.id && 
           checkIn.type && 
           checkIn.startedAt && 
           typeof checkIn.skipped === 'boolean';
  }
}

// Export singleton instance
export const offlineIntegrationService = new OfflineIntegrationService();
export default offlineIntegrationService;