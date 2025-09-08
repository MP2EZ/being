/**
 * OfflineQueueService - Handles offline data operations and sync
 * Queues actions when offline and processes them when connectivity returns
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { dataStore } from './storage/SecureDataStore';
import { QueuedAction, CheckIn, Assessment, UserProfile } from '../types';

class OfflineQueueService {
  private readonly QUEUE_KEY = '@fullmind_offline_queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private isProcessing = false;
  private listeners: Array<(queueSize: number) => void> = [];

  /**
   * Add action to offline queue
   */
  async queueAction(
    action: 'save_checkin' | 'save_assessment' | 'update_user',
    data: any
  ): Promise<void> {
    try {
      const queuedAction: QueuedAction = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        action,
        data,
        retryCount: 0,
        maxRetries: this.MAX_RETRIES
      };

      const queue = await this.getQueue();
      queue.push(queuedAction);
      
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      
      // Notify listeners about queue size change
      this.notifyListeners(queue.length);
      
      console.log(`Queued ${action} action offline:`, queuedAction.id);
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw new Error('Failed to queue offline action');
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