/**
 * NetworkService - Network connectivity monitoring and offline/online handling
 * Integrates with OfflineQueueService to process queued actions when online
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { offlineQueueService } from './OfflineQueueService';
import { NetworkState } from '../types.ts';

class NetworkService {
  private currentState: NetworkState = {
    isConnected: true,
    isInternetReachable: null,
    type: null
  };
  
  private listeners: Array<(state: NetworkState) => void> = [];
  private subscription: NetInfoSubscription | null = null;
  private isInitialized = false;
  private queueProcessingTimeoutId: NodeJS.Timeout | null = null;

  /**
   * Initialize network monitoring
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      this.updateState(state);
      
      // Start monitoring network changes
      this.subscription = NetInfo.addEventListener(this.handleNetworkChange.bind(this));
      
      this.isInitialized = true;
      console.log('NetworkService initialized with state:', this.currentState);
      
      // Process any existing offline queue if we're online
      if (this.currentState.isConnected) {
        this.scheduleQueueProcessing();
      }
      
    } catch (error) {
      console.error('Failed to initialize NetworkService:', error);
      throw error;
    }
  }

  /**
   * Clean up network monitoring
   */
  cleanup(): void {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    
    if (this.queueProcessingTimeoutId) {
      clearTimeout(this.queueProcessingTimeoutId);
      this.queueProcessingTimeoutId = null;
    }
    
    this.listeners = [];
    this.isInitialized = false;
    console.log('NetworkService cleaned up');
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const previousState = { ...this.currentState };
    this.updateState(state);
    
    console.log('Network state changed:', {
      from: previousState,
      to: this.currentState
    });
    
    // Notify listeners of state change
    this.notifyListeners(this.currentState);
    
    // Handle connectivity changes
    if (!previousState.isConnected && this.currentState.isConnected) {
      this.handleConnectivityRestored();
    } else if (previousState.isConnected && !this.currentState.isConnected) {
      this.handleConnectivityLost();
    }
  }

  /**
   * Update internal state from NetInfo state
   */
  private updateState(netInfoState: NetInfoState): void {
    this.currentState = {
      isConnected: netInfoState.isConnected ?? false,
      isInternetReachable: netInfoState.isInternetReachable,
      type: netInfoState.type
    };
  }

  /**
   * Handle when connectivity is restored
   */
  private handleConnectivityRestored(): void {
    console.log('Connectivity restored, processing offline queue...');
    
    // Wait a brief moment for connection to stabilize
    this.scheduleQueueProcessing(2000);
    
    // Clean up old actions when coming back online
    offlineQueueService.cleanupOldActions();
  }

  /**
   * Handle when connectivity is lost
   */
  private handleConnectivityLost(): void {
    console.log('Connectivity lost, future actions will be queued');
    
    // Cancel any pending queue processing
    if (this.queueProcessingTimeoutId) {
      clearTimeout(this.queueProcessingTimeoutId);
      this.queueProcessingTimeoutId = null;
    }
  }

  /**
   * Schedule offline queue processing
   */
  private scheduleQueueProcessing(delay: number = 1000): void {
    if (this.queueProcessingTimeoutId) {
      clearTimeout(this.queueProcessingTimeoutId);
    }
    
    this.queueProcessingTimeoutId = setTimeout(async () => {
      try {
        if (this.currentState.isConnected) {
          await offlineQueueService.processQueue();
        }
      } catch (error) {
        console.error('Error processing queue after connectivity restored:', error);
      } finally {
        this.queueProcessingTimeoutId = null;
      }
    }, delay);
  }

  /**
   * Get current network state
   */
  getState(): NetworkState {
    return { ...this.currentState };
  }

  /**
   * Check if device is currently online
   */
  isOnline(): boolean {
    return this.currentState.isConnected;
  }

  /**
   * Check if device is currently offline
   */
  isOffline(): boolean {
    return !this.currentState.isConnected;
  }

  /**
   * Check if internet is reachable (more strict than just connected)
   */
  isInternetReachable(): boolean | null {
    return this.currentState.isInternetReachable;
  }

  /**
   * Get connection type
   */
  getConnectionType(): string | null {
    return this.currentState.type;
  }

  /**
   * Add network state change listener
   */
  addNetworkListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call listener with current state
    listener(this.currentState);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(state: NetworkState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  /**
   * Force refresh network state
   */
  async refreshState(): Promise<NetworkState> {
    try {
      const state = await NetInfo.fetch();
      this.updateState(state);
      this.notifyListeners(this.currentState);
      return this.currentState;
    } catch (error) {
      console.error('Failed to refresh network state:', error);
      throw error;
    }
  }

  /**
   * Perform an action with offline fallback
   */
  async performWithOfflineFallback<T>(
    action: () => Promise<T>,
    offlineFallback: () => Promise<void>,
    actionType: 'save_checkin' | 'save_assessment' | 'update_user',
    data: any
  ): Promise<T | null> {
    try {
      if (this.isOnline()) {
        // Try to perform action immediately
        return await action();
      } else {
        // Queue for offline processing
        await offlineQueueService.queueAction(actionType, data);
        await offlineFallback();
        return null;
      }
    } catch (error) {
      console.error('Action failed, falling back to offline queue:', error);
      
      try {
        // If online action fails, queue it for retry
        await offlineQueueService.queueAction(actionType, data);
        await offlineFallback();
        return null;
      } catch (fallbackError) {
        console.error('Offline fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Test network connectivity (ping-like functionality)
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get detailed connectivity information
   */
  async getDetailedInfo(): Promise<{
    isConnected: boolean;
    isInternetReachable: boolean | null;
    type: string | null;
    canReachInternet: boolean;
    queueSize: number;
  }> {
    const canReachInternet = await this.testConnectivity();
    const queueSize = await offlineQueueService.getQueueSize();
    
    return {
      ...this.currentState,
      canReachInternet,
      queueSize
    };
  }

  /**
   * Get network quality indicator
   */
  getNetworkQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!this.currentState.isConnected) {
      return 'offline';
    }
    
    switch (this.currentState.type) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        return 'good';
      case 'bluetooth':
      case 'ethernet':
        return 'good';
      case 'wimax':
        return 'poor';
      default:
        return 'poor';
    }
  }
}

export const networkService = new NetworkService();
export default networkService;