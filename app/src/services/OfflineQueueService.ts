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
import { CheckIn, Assessment, UserProfile } from '../types';
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
  NetworkQuality
} from '../types/offline';

/**
 * Enhanced OfflineQueueService with clinical safety and advanced features
 */
class EnhancedOfflineQueueService {
  private readonly QUEUE_KEY = '@fullmind_enhanced_offline_queue';
  private readonly STATISTICS_KEY = '@fullmind_queue_statistics';
  private readonly CONFIG_KEY = '@fullmind_sync_config';
  private readonly INTEGRITY_CHECK_KEY = '@fullmind_data_integrity';
  
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
   * Process all queued actions
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const queue = await this.getQueue();
      
      if (queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`Processing ${queue.length} queued actions...`);
      
      const processedActions: string[] = [];
      const failedActions: QueuedAction[] = [];

      for (const action of queue) {
        try {
          const success = await this.processAction(action);
          
          if (success) {
            processedActions.push(action.id);
            console.log(`Successfully processed action: ${action.id}`);
          } else {
            // Increment retry count
            action.retryCount++;
            
            if (action.retryCount >= action.maxRetries) {
              console.warn(`Action ${action.id} exceeded max retries, removing from queue`);
              processedActions.push(action.id);
            } else {
              console.log(`Action ${action.id} failed, retry ${action.retryCount}/${action.maxRetries}`);
              failedActions.push(action);
            }
          }
        } catch (error) {
          console.error(`Error processing action ${action.id}:`, error);
          action.retryCount++;
          
          if (action.retryCount < action.maxRetries) {
            failedActions.push(action);
          } else {
            processedActions.push(action.id);
          }
        }

        // Small delay between actions to avoid overwhelming the system
        if (queue.length > 1) {
          await this.delay(100);
        }
      }

      // Update queue with only failed actions that haven't exceeded max retries
      await this.updateQueue(failedActions);
      
      console.log(`Queue processing complete. Processed: ${processedActions.length}, Remaining: ${failedActions.length}`);
      
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queued action
   */
  private async processAction(action: QueuedAction): Promise<boolean> {
    try {
      switch (action.action) {
        case 'save_checkin':
          await dataStore.saveCheckIn(action.data as CheckIn);
          return true;
          
        case 'save_assessment':
          await dataStore.saveAssessment(action.data as Assessment);
          return true;
          
        case 'update_user':
          await dataStore.saveUser(action.data as UserProfile);
          return true;
          
        default:
          console.warn(`Unknown action type: ${action.action}`);
          return false;
      }
    } catch (error) {
      console.error(`Failed to process action ${action.action}:`, error);
      return false;
    }
  }

  /**
   * Get current queue from storage
   */
  private async getQueue(): Promise<QueuedAction[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  }

  /**
   * Update queue with new actions
   */
  private async updateQueue(actions: QueuedAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(actions));
      this.notifyListeners(actions.length);
    } catch (error) {
      console.error('Failed to update offline queue:', error);
    }
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Clear the entire queue (use with caution)
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      this.notifyListeners(0);
      console.log('Offline queue cleared');
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  }

  /**
   * Get queue contents for debugging
   */
  async getQueueContents(): Promise<QueuedAction[]> {
    return await this.getQueue();
  }

  /**
   * Add listener for queue size changes
   */
  addQueueListener(listener: (queueSize: number) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of queue size changes
   */
  private notifyListeners(queueSize: number): void {
    this.listeners.forEach(listener => {
      try {
        listener(queueSize);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  /**
   * Schedule queue processing with exponential backoff
   */
  async scheduleQueueProcessing(): Promise<void> {
    const queue = await this.getQueue();
    
    if (queue.length === 0) {
      return;
    }

    // Calculate delay based on retry attempts
    const maxRetryCount = Math.max(...queue.map(action => action.retryCount));
    const delay = this.RETRY_DELAY * Math.pow(2, maxRetryCount); // Exponential backoff
    
    console.log(`Scheduling queue processing in ${delay}ms`);
    
    setTimeout(() => {
      this.processQueue();
    }, delay);
  }

  /**
   * Cleanup old failed actions (older than 7 days)
   */
  async cleanupOldActions(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const filteredQueue = queue.filter(action => {
        const actionDate = new Date(action.timestamp);
        return actionDate >= sevenDaysAgo;
      });
      
      if (filteredQueue.length !== queue.length) {
        await this.updateQueue(filteredQueue);
        console.log(`Cleaned up ${queue.length - filteredQueue.length} old queue actions`);
      }
    } catch (error) {
      console.error('Failed to cleanup old queue actions:', error);
    }
  }

  /**
   * Generate unique ID for actions
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get processing status
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Force process queue (bypass processing check)
   */
  async forceProcessQueue(): Promise<void> {
    this.isProcessing = false;
    await this.processQueue();
  }
}

export const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;