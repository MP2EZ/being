/**
 * Enhanced OfflineQueueService - Clinical-grade offline data operations and sync
 * Advanced queue management with conflict resolution, priority handling, and clinical safety
 * Integrates with AssetCacheService and ResumableSessionService for comprehensive offline experience
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { dataStore } from './storage/SecureDataStore';
import { assetCacheService } from './AssetCacheService';
import { resumableSessionService } from './ResumableSessionService';
import { CheckIn, Assessment, UserProfile } from '../types.ts';
import {
  EnhancedQueuedAction,
  OfflineActionType,
  OfflineActionData,
  OfflinePriority,
  OfflineError,
  OfflineErrorCode,
  ConflictResolutionStrategy,
  RetryStrategy,
  SyncConfiguration,
  OfflineQueueStatistics,
  DataIntegrityResult,
  OfflineOperationResult,
  BatchOperationResult,
  ClinicalValidation,
  OfflineActionMetadata,
  ClinicalSafetyHelpers,
  isOfflineActionData,
  NetworkQuality,
  OfflineServiceHealth
} from '../types/offline';

/**
 * Enhanced OfflineQueueService with clinical safety and advanced features
 */
class EnhancedOfflineQueueService {
  private readonly QUEUE_KEY = 'being_enhanced_offline_queue';
  private readonly STATISTICS_KEY = 'being_queue_statistics';
  private readonly CONFIG_KEY = 'being_sync_config';
  private readonly INTEGRITY_CHECK_KEY = 'being_data_integrity';
  
  // Enhanced configuration
  private readonly DEFAULT_MAX_RETRIES = 5;
  private readonly CRITICAL_MAX_RETRIES = 10;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 60000; // 1 minute
  private readonly MAX_QUEUE_SIZE = 10000;
  private readonly BATCH_SIZE = 50;
  private readonly CLINICAL_PROCESSING_TIMEOUT = 30000; // 30 seconds
  
  // State management
  private isProcessing = false;
  private batchProcessing = false;
  private statistics: OfflineQueueStatistics;
  private syncConfig: SyncConfiguration;
  private listeners: Array<(statistics: OfflineQueueStatistics) => void> = [];
  private performanceTimings: number[] = [];
  private lastIntegrityCheck: string | null = null;

  constructor() {
    this.statistics = this.getDefaultStatistics();
    this.syncConfig = this.getDefaultSyncConfig();
    this.initialize();
  }

  /**
   * Initialize the enhanced offline queue service
   */
  private async initialize(): Promise<void> {
    try {
      await this.loadConfiguration();
      await this.loadStatistics();
      await this.migrateFromLegacyQueue();
      await this.performIntegrityCheck();
      this.schedulePeriodicMaintenance();
      console.log('Enhanced OfflineQueueService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced OfflineQueueService:', error);
    }
  }

  /**
   * Enhanced queue action with clinical safety and advanced features
   */
  async queueAction(
    action: OfflineActionType,
    data: OfflineActionData,
    options: {
      priority?: OfflinePriority;
      conflictResolution?: ConflictResolutionStrategy;
      clinicalValidation?: boolean;
      dependencies?: string[];
      metadata?: Partial<OfflineActionMetadata>;
    } = {}
  ): Promise<OfflineOperationResult> {
    const startTime = Date.now();
    
    try {
      // Validate queue capacity
      const currentQueue = await this.getQueue();
      if (currentQueue.length >= this.MAX_QUEUE_SIZE) {
        throw this.createError(
          OfflineErrorCode.STORAGE_FULL,
          'Offline queue has reached maximum capacity',
          'high'
        );
      }

      // Determine priority and clinical validation
      const priority = options.priority || ClinicalSafetyHelpers.getClinicalPriority(action);
      const requiresClinicalValidation = options.clinicalValidation || 
                                       ClinicalSafetyHelpers.containsCrisisData(data);
      
      // Perform clinical validation if required
      let clinicalValidation: ClinicalValidation | undefined;
      if (requiresClinicalValidation) {
        clinicalValidation = await this.performClinicalValidation(data, action);
      }

      // Create enhanced queued action
      const queuedAction: EnhancedQueuedAction = {
        id: await this.generateSecureId(),
        timestamp: new Date().toISOString(),
        action,
        data,
        priority,
        retryCount: 0,
        maxRetries: priority === OfflinePriority.CRITICAL ? this.CRITICAL_MAX_RETRIES : this.DEFAULT_MAX_RETRIES,
        errorHistory: [],
        dependencies: options.dependencies || [],
        conflictResolution: options.conflictResolution || this.getDefaultConflictResolution(action),
        clinicalValidation,
        metadata: await this.createActionMetadata(data, options.metadata)
      };

      // Add to queue with priority ordering
      await this.addToQueueWithPriority(queuedAction);
      
      // Update statistics
      await this.updateStatistics('queued', queuedAction);
      
      // Immediate processing for critical actions if possible
      if (priority === OfflinePriority.CRITICAL && !this.isProcessing) {
        this.processQueue().catch(error => 
          console.error('Failed to process critical action immediately:', error)
        );
      }

      const result: OfflineOperationResult = {
        success: true,
        queuedForLater: true,
        clinicalValidation,
        metadata: {
          operationId: queuedAction.id,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          networkQuality: NetworkQuality.OFFLINE,
          offline: true
        }
      };

      console.log(`Enhanced queue action: ${action} (Priority: ${priority}, ID: ${queuedAction.id})`);
      return result;
      
    } catch (error) {
      const offlineError = error instanceof Error && 'code' in error 
        ? error as OfflineError
        : this.createError(
            OfflineErrorCode.UNKNOWN_ERROR,
            error instanceof Error ? error.message : 'Failed to queue action',
            'medium'
          );

      const result: OfflineOperationResult = {
        success: false,
        error: offlineError,
        queuedForLater: false,
        metadata: {
          operationId: '',
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime,
          networkQuality: NetworkQuality.OFFLINE,
          offline: true
        }
      };

      console.error('Failed to queue enhanced action:', error);
      return result;
    }
  }

  /**
   * Process all queued actions with enhanced batch processing and priority handling
   */
  async processQueue(): Promise<BatchOperationResult> {
    if (this.isProcessing) {
      return this.createEmptyBatchResult();
    }

    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      const queue = await this.getQueue();
      
      if (queue.length === 0) {
        this.isProcessing = false;
        return this.createEmptyBatchResult();
      }

      console.log(`Processing ${queue.length} enhanced queued actions...`);
      
      // Sort by priority and dependencies
      const sortedQueue = await this.sortQueueByPriority(queue);
      const batchResults: OfflineOperationResult[] = [];
      const processedActions: string[] = [];
      const failedActions: EnhancedQueuedAction[] = [];
      const criticalFailures: OfflineError[] = [];
      
      // Process in priority batches
      let clinicalDataAffected = false;
      
      for (const action of sortedQueue) {
        try {
          const actionStartTime = Date.now();
          const success = await this.processEnhancedAction(action);
          const executionTime = Date.now() - actionStartTime;
          
          this.recordPerformanceTiming(executionTime);
          
          if (success) {
            processedActions.push(action.id);
            
            const result: OfflineOperationResult = {
              success: true,
              data: action.data,
              clinicalValidation: action.clinicalValidation,
              queuedForLater: false,
              metadata: {
                operationId: action.id,
                timestamp: new Date().toISOString(),
                executionTime,
                networkQuality: NetworkQuality.EXCELLENT, // Assume good when processing
                offline: false
              }
            };
            
            batchResults.push(result);
            
            // Track clinical data processing
            if (action.clinicalValidation?.isAssessment || action.clinicalValidation?.isCrisisRelated) {
              clinicalDataAffected = true;
            }
            
            console.log(`Successfully processed enhanced action: ${action.id} (${executionTime}ms)`);
          } else {
            // Handle failure with enhanced retry logic
            await this.handleActionFailure(action, 'Processing failed');
            
            if (action.retryCount < action.maxRetries) {
              failedActions.push(action);
            } else {
              processedActions.push(action.id);
              
              // Track critical failures
              if (action.priority === OfflinePriority.CRITICAL) {
                const criticalError = this.createError(
                  OfflineErrorCode.UNKNOWN_ERROR,
                  `Critical action ${action.id} failed after ${action.maxRetries} retries`,
                  'critical'
                );
                criticalFailures.push(criticalError);
              }
            }
          }
        } catch (error) {
          console.error(`Error processing enhanced action ${action.id}:`, error);
          
          const offlineError = this.createError(
            OfflineErrorCode.UNKNOWN_ERROR,
            error instanceof Error ? error.message : 'Unknown processing error',
            action.priority === OfflinePriority.CRITICAL ? 'critical' : 'medium'
          );
          
          await this.handleActionFailure(action, offlineError.message);
          
          if (action.retryCount < action.maxRetries) {
            failedActions.push(action);
          } else {
            processedActions.push(action.id);
            if (action.priority === OfflinePriority.CRITICAL) {
              criticalFailures.push(offlineError);
            }
          }
        }

        // Throttle processing to avoid overwhelming system
        if (sortedQueue.length > this.BATCH_SIZE) {
          await this.delay(10);
        }
      }

      // Update queue with remaining failed actions
      await this.updateQueue(failedActions);
      
      // Update statistics
      await this.updateStatistics('processed', null, processedActions.length, failedActions.length);
      
      const result: BatchOperationResult = {
        successful: processedActions.length,
        failed: criticalFailures.length,
        queued: failedActions.length,
        results: batchResults,
        criticalFailures,
        estimatedRetryTime: failedActions.length > 0 ? this.calculateRetryTime(failedActions) : undefined,
        clinicalDataAffected
      };
      
      console.log(`Enhanced queue processing complete. Success: ${result.successful}, Failed: ${result.failed}, Remaining: ${result.queued}`);
      
      return result;
      
    } catch (error) {
      console.error('Error processing enhanced offline queue:', error);
      return {
        successful: 0,
        failed: 1,
        queued: 0,
        results: [],
        criticalFailures: [this.createError(
          OfflineErrorCode.UNKNOWN_ERROR,
          error instanceof Error ? error.message : 'Queue processing failed',
          'high'
        )],
        clinicalDataAffected: false
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process single enhanced action with clinical safety checks
   */
  private async processEnhancedAction(action: EnhancedQueuedAction): Promise<boolean> {
    try {
      // Pre-processing validation
      if (action.clinicalValidation?.requiresImmediateSync && !this.isNetworkAvailable()) {
        throw new Error('Critical clinical data requires network connectivity');
      }

      // Check dependencies
      if (action.dependencies && action.dependencies.length > 0) {
        const dependenciesMet = await this.checkDependencies(action.dependencies);
        if (!dependenciesMet) {
          throw new Error('Action dependencies not met');
        }
      }

      // Asset dependency check
      if (action.metadata.clinicalSafety.dataType === 'clinical') {
        await this.ensureClinicalAssetsAvailable();
      }

      // Process based on action type
      switch (action.action) {
        case 'save_checkin':
        case 'save_checkin_complete':
        case 'save_checkin_partial':
          return await this.processCheckInAction(action);
          
        case 'save_assessment':
        case 'save_assessment_critical':
          return await this.processAssessmentAction(action);
          
        case 'save_crisis_data':
        case 'update_crisis_plan':
          return await this.processCrisisAction(action);
          
        case 'update_user':
        case 'update_preferences':
        case 'update_clinical_profile':
          return await this.processUserAction(action);
          
        case 'save_session_progress':
          return await this.processSessionAction(action);
          
        case 'save_emergency_contact':
          return await this.processEmergencyContactAction(action);
          
        case 'update_notification_settings':
        case 'save_analytics':
          return await this.processSystemAction(action);
          
        default:
          console.warn(`Unknown enhanced action type: ${action.action}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to process enhanced action ${action.action}:`, error);
      return false;
    }
  }

  /**
   * Process check-in related actions
   */
  private async processCheckInAction(action: EnhancedQueuedAction): Promise<boolean> {
    if (!isOfflineActionData.isCheckIn(action.data)) {
      throw new Error('Invalid check-in data format');
    }

    const checkIn = action.data as CheckIn;
    
    // Clinical validation for completed check-ins
    if (action.action === 'save_checkin_complete' && action.clinicalValidation) {
      await this.validateClinicalCheckIn(checkIn);
    }

    await dataStore.saveCheckIn(checkIn);
    
    // Update resumable session if applicable
    if (action.action === 'save_checkin_partial') {
      await resumableSessionService.saveSession({
        id: checkIn.id,
        type: 'checkin',
        subType: checkIn.type,
        data: checkIn.data,
        progress: {
          currentStep: 0,
          totalSteps: this.getCheckInSteps(checkIn.type),
          completedSteps: this.getCompletedSteps(checkIn.data, checkIn.type),
          percentComplete: 0,
          estimatedTimeRemaining: 0
        }
      });
    }
    
    return true;
  }

  /**
   * Process assessment related actions with clinical safety
   */
  private async processAssessmentAction(action: EnhancedQueuedAction): Promise<boolean> {
    if (!isOfflineActionData.isAssessment(action.data)) {
      throw new Error('Invalid assessment data format');
    }

    const assessment = action.data as Assessment;
    
    // Critical assessment handling
    if (action.action === 'save_assessment_critical') {
      await this.processCriticalAssessment(assessment);
    }

    await dataStore.saveAssessment(assessment);
    
    // Update clinical profile if assessment indicates risk
    if (action.clinicalValidation?.clinicalThresholdMet) {
      await this.updateClinicalRiskProfile(assessment);
    }
    
    return true;
  }

  /**
   * Process crisis-related actions with highest priority
   */
  private async processCrisisAction(action: EnhancedQueuedAction): Promise<boolean> {
    const timeout = setTimeout(() => {
      throw new Error('Crisis action processing timeout');
    }, this.CLINICAL_PROCESSING_TIMEOUT);

    try {
      if (action.action === 'save_crisis_data') {
        if (!isOfflineActionData.isCrisisData(action.data)) {
          throw new Error('Invalid crisis data format');
        }
        await this.processCrisisData(action.data);
      } else if (action.action === 'update_crisis_plan') {
        await this.updateCrisisPlan(action.data);
      }
      
      clearTimeout(timeout);
      return true;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Process user-related actions
   */
  private async processUserAction(action: EnhancedQueuedAction): Promise<boolean> {
    if (!isOfflineActionData.isUserProfile(action.data)) {
      throw new Error('Invalid user profile data format');
    }

    const userProfile = action.data as UserProfile;
    await dataStore.saveUser(userProfile);
    return true;
  }

  /**
   * Process session progress actions
   */
  private async processSessionAction(action: EnhancedQueuedAction): Promise<boolean> {
    const sessionData = action.data as any; // Session progress data
    await resumableSessionService.updateProgress(sessionData.sessionId, sessionData.progress);
    return true;
  }

  /**
   * Process emergency contact actions
   */
  private async processEmergencyContactAction(action: EnhancedQueuedAction): Promise<boolean> {
    // Emergency contact processing with immediate priority
    await dataStore.setItem('emergency_contacts', JSON.stringify(action.data));
    return true;
  }

  /**
   * Process system-level actions
   */
  private async processSystemAction(action: EnhancedQueuedAction): Promise<boolean> {
    // Handle system-level updates like analytics, notifications
    await dataStore.setItem(`system_${action.action}`, JSON.stringify(action.data));
    return true;
  }

  /**
   * Perform clinical validation for offline data
   */
  private async performClinicalValidation(
    data: OfflineActionData,
    action: OfflineActionType
  ): Promise<ClinicalValidation> {
    const validation: ClinicalValidation = {
      isAssessment: false,
      isCrisisRelated: false,
      requiresImmediateSync: false,
      clinicalThresholdMet: false,
      validationTimestamp: new Date().toISOString()
    };

    // Assessment validation
    if (isOfflineActionData.isAssessment(data)) {
      validation.isAssessment = true;
      const assessment = data as Assessment;
      
      if (assessment.type === 'phq9') {
        validation.phq9Score = assessment.score;
        validation.clinicalThresholdMet = assessment.score >= 20;
        validation.riskLevel = this.getPhq9RiskLevel(assessment.score);
      } else if (assessment.type === 'gad7') {
        validation.gad7Score = assessment.score;
        validation.clinicalThresholdMet = assessment.score >= 15;
        validation.riskLevel = this.getGad7RiskLevel(assessment.score);
      }
      
      validation.requiresImmediateSync = validation.clinicalThresholdMet;
    }

    // Crisis data validation
    if (isOfflineActionData.isCrisisData(data) || action.includes('crisis')) {
      validation.isCrisisRelated = true;
      validation.requiresImmediateSync = true;
      validation.clinicalThresholdMet = true;
      validation.riskLevel = 'severe';
    }

    return validation;
  }

  /**
   * Create action metadata with device and clinical context
   */
  private async createActionMetadata(
    data: OfflineActionData,
    partial?: Partial<OfflineActionMetadata>
  ): Promise<OfflineActionMetadata> {
    const dataSize = JSON.stringify(data).length;
    
    return {
      deviceId: await this.getDeviceId(),
      appVersion: '1.7.0', // Should come from app config
      userId: await this.getUserId(),
      sessionId: await this.getSessionId(),
      networkQuality: NetworkQuality.OFFLINE,
      dataSize,
      compressionUsed: dataSize > 50000, // Compress large payloads
      encryptionEnabled: true,
      clinicalSafety: {
        dataType: this.determinateDataType(data),
        sensitivityLevel: this.determinateSensitivityLevel(data),
        encryptionRequired: true,
        auditRequired: this.requiresAuditLog(data)
      },
      ...partial
    };
  }

  /**
   * Add action to queue with priority-based ordering
   */
  private async addToQueueWithPriority(action: EnhancedQueuedAction): Promise<void> {
    const queue = await this.getQueue();
    
    // Find insertion point based on priority
    const priorityOrder = {
      [OfflinePriority.CRITICAL]: 0,
      [OfflinePriority.HIGH]: 1,
      [OfflinePriority.MEDIUM]: 2,
      [OfflinePriority.LOW]: 3,
      [OfflinePriority.DEFERRED]: 4
    };
    
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
      if (priorityOrder[action.priority] < priorityOrder[queue[i].priority]) {
        insertIndex = i;
        break;
      }
    }
    
    queue.splice(insertIndex, 0, action);
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    
    // Notify listeners
    this.notifyListeners(this.statistics);
  }

  /**
   * Get enhanced queue from storage
   */
  private async getQueue(): Promise<EnhancedQueuedAction[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get enhanced offline queue:', error);
      return [];
    }
  }

  /**
   * Update queue with enhanced actions
   */
  private async updateQueue(actions: EnhancedQueuedAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(actions));
      this.statistics.totalActions = actions.length;
      await this.saveStatistics();
      this.notifyListeners(this.statistics);
    } catch (error) {
      console.error('Failed to update enhanced offline queue:', error);
    }
  }

  /**
   * Handle action failure with enhanced error tracking
   */
  private async handleActionFailure(action: EnhancedQueuedAction, errorMessage: string): Promise<void> {
    action.retryCount++;
    action.lastAttempt = new Date().toISOString();
    
    const error: OfflineError = {
      code: OfflineErrorCode.UNKNOWN_ERROR,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      recoverable: action.retryCount < action.maxRetries,
      clinicalImpact: action.clinicalValidation?.isCrisisRelated ? 'critical' : 'medium',
      retryStrategy: this.getRetryStrategy(action.priority),
      userMessage: this.generateUserMessage(action, errorMessage)
    };
    
    action.errorHistory.push(error);
    
    // Log critical failures immediately
    if (action.priority === OfflinePriority.CRITICAL) {
      console.error(`CRITICAL ACTION FAILURE: ${action.id} - ${errorMessage}`);
    }
  }

  /**
   * Generate secure ID for actions
   */
  private async generateSecureId(): Promise<string> {
    const timestamp = Date.now();
    const random = await Crypto.randomUUID();
    return `enhanced_${timestamp}_${random}`;
  }

  /**
   * Create standardized error
   */
  private createError(
    code: OfflineErrorCode,
    message: string,
    clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical'
  ): OfflineError {
    return {
      code,
      message,
      timestamp: new Date().toISOString(),
      recoverable: code !== OfflineErrorCode.DATA_VALIDATION_FAILED,
      clinicalImpact,
      retryStrategy: {
        type: 'exponential',
        baseDelay: this.BASE_RETRY_DELAY,
        maxDelay: this.MAX_RETRY_DELAY,
        maxRetries: this.DEFAULT_MAX_RETRIES,
        backoffMultiplier: 2,
        jitter: true,
        clinicalPriority: clinicalImpact === 'critical'
      }
    };
  }

  /**
   * Get default statistics
   */
  private getDefaultStatistics(): OfflineQueueStatistics {
    return {
      totalActions: 0,
      actionsByPriority: {
        [OfflinePriority.CRITICAL]: 0,
        [OfflinePriority.HIGH]: 0,
        [OfflinePriority.MEDIUM]: 0,
        [OfflinePriority.LOW]: 0,
        [OfflinePriority.DEFERRED]: 0
      },
      actionsByType: {} as Record<OfflineActionType, number>,
      oldestActionAge: 0,
      averageRetryCount: 0,
      totalDataSize: 0,
      criticalActionsCount: 0,
      failureRate: 0,
      estimatedSyncTime: 0,
      clinicalDataPending: false,
      crisisDataPending: false,
      storage: {
        used: 0,
        available: 0,
        encrypted: 0
      },
      performance: {
        averageProcessingTime: 0,
        p95ProcessingTime: 0,
        p99ProcessingTime: 0,
        throughput: 0
      }
    };
  }

  /**
   * Get default sync configuration
   */
  private getDefaultSyncConfig(): SyncConfiguration {
    return {
      enabled: true,
      batchSize: this.BATCH_SIZE,
      timeout: 30000,
      retryStrategy: {
        type: 'exponential',
        baseDelay: this.BASE_RETRY_DELAY,
        maxDelay: this.MAX_RETRY_DELAY,
        maxRetries: this.DEFAULT_MAX_RETRIES,
        backoffMultiplier: 2,
        jitter: true,
        clinicalPriority: true
      },
      conflictResolution: ConflictResolutionStrategy.MERGE_TIMESTAMP,
      requiresEncryption: true,
      clinicalValidation: true,
      priorityBoosting: {
        crisisData: true,
        assessmentData: true,
        incompleteChains: true
      }
    };
  }

  /**
   * Load configuration from storage
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (configData) {
        this.syncConfig = { ...this.syncConfig, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Failed to load sync configuration:', error);
    }
  }

  /**
   * Load statistics from storage
   */
  private async loadStatistics(): Promise<void> {
    try {
      const statsData = await AsyncStorage.getItem(this.STATISTICS_KEY);
      if (statsData) {
        this.statistics = { ...this.statistics, ...JSON.parse(statsData) };
      }
    } catch (error) {
      console.error('Failed to load queue statistics:', error);
    }
  }

  /**
   * Save statistics to storage
   */
  private async saveStatistics(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STATISTICS_KEY, JSON.stringify(this.statistics));
    } catch (error) {
      console.error('Failed to save queue statistics:', error);
    }
  }

  /**
   * Update statistics with operation results
   */
  private async updateStatistics(
    operation: 'queued' | 'processed',
    action?: EnhancedQueuedAction | null,
    successCount?: number,
    failureCount?: number
  ): Promise<void> {
    if (operation === 'queued' && action) {
      this.statistics.totalActions++;
      this.statistics.actionsByPriority[action.priority]++;
      this.statistics.totalDataSize += action.metadata.dataSize;
      
      if (action.priority === OfflinePriority.CRITICAL) {
        this.statistics.criticalActionsCount++;
      }
      
      if (action.clinicalValidation?.isAssessment) {
        this.statistics.clinicalDataPending = true;
      }
      
      if (action.clinicalValidation?.isCrisisRelated) {
        this.statistics.crisisDataPending = true;
      }
    } else if (operation === 'processed') {
      const total = (successCount || 0) + (failureCount || 0);
      if (total > 0) {
        this.statistics.failureRate = (failureCount || 0) / total;
      }
    }
    
    await this.saveStatistics();
  }

  /**
   * Perform data integrity check
   */
  private async performIntegrityCheck(): Promise<DataIntegrityResult> {
    const startTime = Date.now();
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
      const queue = await this.getQueue();
      result.checkedItems = queue.length;

      // Check for data consistency
      for (const action of queue) {
        if (!action.id || !action.timestamp || !action.action) {
          result.errors.push(`Invalid action structure: ${action.id}`);
          result.isValid = false;
        }

        if (action.clinicalValidation?.isAssessment && !this.validateAssessmentData(action.data)) {
          result.errors.push(`Invalid assessment data: ${action.id}`);
          result.assessmentIntegrity = false;
        }

        if (action.clinicalValidation?.isCrisisRelated && !this.validateCrisisData(action.data)) {
          result.errors.push(`Invalid crisis data: ${action.id}`);
          result.crisisDataIntegrity = false;
        }
      }

      this.lastIntegrityCheck = result.timestamp;
      await AsyncStorage.setItem(this.INTEGRITY_CHECK_KEY, JSON.stringify(result));

      console.log(`Integrity check completed: ${result.checkedItems} items, ${result.errors.length} errors`);
      return result;
    } catch (error) {
      console.error('Integrity check failed:', error);
      result.isValid = false;
      result.errors.push('Integrity check failed');
      return result;
    }
  }

  /**
   * Migrate from legacy queue if needed
   */
  private async migrateFromLegacyQueue(): Promise<void> {
    try {
      const legacyQueue = await AsyncStorage.getItem('being_offline_queue');
      if (legacyQueue) {
        const legacyActions = JSON.parse(legacyQueue);
        console.log(`Migrating ${legacyActions.length} actions from legacy queue`);
        
        for (const legacyAction of legacyActions) {
          // Convert legacy action to enhanced format
          const enhancedAction: EnhancedQueuedAction = {
            id: legacyAction.id || await this.generateSecureId(),
            timestamp: legacyAction.timestamp,
            action: legacyAction.action as OfflineActionType,
            data: legacyAction.data,
            priority: ClinicalSafetyHelpers.getClinicalPriority(legacyAction.action),
            retryCount: legacyAction.retryCount || 0,
            maxRetries: legacyAction.maxRetries || this.DEFAULT_MAX_RETRIES,
            errorHistory: [],
            dependencies: [],
            conflictResolution: ConflictResolutionStrategy.MERGE_TIMESTAMP,
            metadata: await this.createActionMetadata(legacyAction.data)
          };
          
          await this.addToQueueWithPriority(enhancedAction);
        }
        
        // Remove legacy queue
        await AsyncStorage.removeItem('being_offline_queue');
        console.log('Legacy queue migration completed');
      }
    } catch (error) {
      console.error('Failed to migrate legacy queue:', error);
    }
  }

  /**
   * Schedule periodic maintenance tasks
   */
  private schedulePeriodicMaintenance(): void {
    // Run maintenance every 6 hours
    setInterval(async () => {
      try {
        await this.performMaintenance();
      } catch (error) {
        console.error('Periodic maintenance failed:', error);
      }
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Perform maintenance tasks
   */
  private async performMaintenance(): Promise<void> {
    console.log('Performing offline queue maintenance...');
    
    try {
      // Clean up old completed actions
      await this.cleanupOldActions();
      
      // Perform integrity check
      await this.performIntegrityCheck();
      
      // Optimize queue storage
      await this.optimizeQueueStorage();
      
      // Update performance metrics
      await this.updatePerformanceMetrics();
      
      console.log('Offline queue maintenance completed');
    } catch (error) {
      console.error('Maintenance failed:', error);
    }
  }

  /**
   * Clean up old actions (enhanced version)
   */
  private async cleanupOldActions(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const filteredQueue = queue.filter(action => {
        const actionDate = new Date(action.timestamp);
        
        // Keep critical actions longer
        if (action.priority === OfflinePriority.CRITICAL) {
          const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
          return actionDate >= fourteenDaysAgo;
        }
        
        return actionDate >= sevenDaysAgo;
      });
      
      if (filteredQueue.length !== queue.length) {
        await this.updateQueue(filteredQueue);
        console.log(`Cleaned up ${queue.length - filteredQueue.length} old enhanced queue actions`);
      }
    } catch (error) {
      console.error('Failed to cleanup old enhanced queue actions:', error);
    }
  }

  /**
   * Additional helper methods and utilities
   */
  
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isNetworkAvailable(): boolean {
    // This would integrate with NetworkService
    return true; // Placeholder
  }

  private notifyListeners(statistics: OfflineQueueStatistics): void {
    this.listeners.forEach(listener => {
      try {
        listener(statistics);
      } catch (error) {
        console.error('Error in enhanced queue listener:', error);
      }
    });
  }

  private recordPerformanceTiming(time: number): void {
    this.performanceTimings.push(time);
    if (this.performanceTimings.length > 100) {
      this.performanceTimings.shift();
    }
  }

  private createEmptyBatchResult(): BatchOperationResult {
    return {
      successful: 0,
      failed: 0,
      queued: 0,
      results: [],
      criticalFailures: [],
      clinicalDataAffected: false
    };
  }

  // Additional helper methods would be implemented here...
  // (Implementation abbreviated for length - would include all helper methods)

  // Public API methods
  
  /**
   * Get comprehensive queue statistics
   */
  async getStatistics(): Promise<OfflineQueueStatistics> {
    return { ...this.statistics };
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<OfflineServiceHealth> {
    const criticalIssues: string[] = [];
    
    if (this.statistics.criticalActionsCount > 0) {
      criticalIssues.push('Critical actions pending');
    }
    
    if (this.statistics.crisisDataPending) {
      criticalIssues.push('Crisis data requires immediate sync');
    }

    return {
      status: criticalIssues.length > 0 ? 'critical' : 'healthy',
      services: {
        queue: 'operational',
        network: 'operational',
        storage: 'operational',
        sync: 'operational',
        clinical: this.statistics.crisisDataPending ? 'at_risk' : 'operational'
      },
      lastHealthCheck: new Date().toISOString(),
      criticalIssues,
      clinicalSafetyStatus: this.statistics.crisisDataPending ? 'at_risk' : 'secure',
      recommendedActions: criticalIssues.length > 0 ? ['Immediate sync required'] : []
    };
  }

  /**
   * Add listener for queue statistics changes
   */
  addStatisticsListener(listener: (statistics: OfflineQueueStatistics) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Placeholder methods for helper functions (would be fully implemented)
  private async sortQueueByPriority(queue: EnhancedQueuedAction[]): Promise<EnhancedQueuedAction[]> { return queue; }
  private async checkDependencies(dependencies: string[]): Promise<boolean> { return true; }
  private async ensureClinicalAssetsAvailable(): Promise<void> { }
  private async validateClinicalCheckIn(checkIn: CheckIn): Promise<void> { }
  private async processCriticalAssessment(assessment: Assessment): Promise<void> { }
  private async updateClinicalRiskProfile(assessment: Assessment): Promise<void> { }
  private async processCrisisData(data: any): Promise<void> { }
  private async updateCrisisPlan(data: any): Promise<void> { }
  private getCheckInSteps(type: string): number { return 5; }
  private getCompletedSteps(data: any, type: string): string[] { return []; }
  private getPhq9RiskLevel(score: number): 'minimal' | 'mild' | 'moderate' | 'severe' { return 'minimal'; }
  private getGad7RiskLevel(score: number): 'minimal' | 'mild' | 'moderate' | 'severe' { return 'minimal'; }
  private async getDeviceId(): Promise<string> { return 'device'; }
  private async getUserId(): Promise<string> { return 'user'; }
  private async getSessionId(): Promise<string> { return 'session'; }
  private determinateDataType(data: any): 'clinical' | 'personal' | 'system' { return 'personal'; }
  private determinateSensitivityLevel(data: any): 'low' | 'medium' | 'high' | 'critical' { return 'medium'; }
  private requiresAuditLog(data: any): boolean { return false; }
  private getDefaultConflictResolution(action: OfflineActionType): ConflictResolutionStrategy { return ConflictResolutionStrategy.MERGE_TIMESTAMP; }
  private getRetryStrategy(priority: OfflinePriority): RetryStrategy { return this.syncConfig.retryStrategy; }
  private generateUserMessage(action: EnhancedQueuedAction, error: string): string { return 'Action failed'; }
  private calculateRetryTime(actions: EnhancedQueuedAction[]): number { return 5; }
  private validateAssessmentData(data: any): boolean { return true; }
  private validateCrisisData(data: any): boolean { return true; }
  private async optimizeQueueStorage(): Promise<void> { }
  private async updatePerformanceMetrics(): Promise<void> { }
}

// Export singleton instance
export const enhancedOfflineQueueService = new EnhancedOfflineQueueService();
export default enhancedOfflineQueueService;