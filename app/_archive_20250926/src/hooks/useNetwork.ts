/**
 * useNetwork - Custom hook for network connectivity monitoring
 * Provides network state and offline queue information to React components
 */

import { useState, useEffect, useCallback } from 'react';
import { networkService } from '../services/NetworkService';
import { offlineQueueService } from '../services/OfflineQueueService';
import { NetworkState } from '../types.ts';

interface UseNetworkReturn {
  // Network state
  isOnline: boolean;
  isOffline: boolean;
  networkState: NetworkState;
  networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
  
  // Queue information
  queueSize: number;
  isProcessingQueue: boolean;
  
  // Actions
  refreshNetworkState: () => Promise<void>;
  testConnectivity: () => Promise<boolean>;
  getDetailedInfo: () => Promise<any>;
  
  // Queue actions
  forceProcessQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
}

export const useNetwork = (): UseNetworkReturn => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
    type: null
  });
  
  const [queueSize, setQueueSize] = useState(0);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Initialize network monitoring
  useEffect(() => {
    let isActive = true;
    
    const initializeNetwork = async () => {
      try {
        // Initialize network service if not already done
        await networkService.initialize();
        
        // Get initial state
        if (isActive) {
          const state = networkService.getState();
          setNetworkState(state);
          
          // Get initial queue size
          const initialQueueSize = await offlineQueueService.getQueueSize();
          setQueueSize(initialQueueSize);
        }
      } catch (error) {
        console.error('Failed to initialize network monitoring:', error);
      }
    };

    initializeNetwork();
    
    return () => {
      isActive = false;
    };
  }, []);

  // Set up network state listener
  useEffect(() => {
    const unsubscribe = networkService.addNetworkListener((state) => {
      setNetworkState(state);
    });

    return unsubscribe;
  }, []);

  // Set up queue size listener
  useEffect(() => {
    const unsubscribe = offlineQueueService.addQueueListener((size: number) => {
      setQueueSize(size);
    });

    return unsubscribe;
  }, []);

  // Monitor queue processing status
  useEffect(() => {
    const checkProcessingStatus = () => {
      setIsProcessingQueue(offlineQueueService.isCurrentlyProcessing());
    };

    // Check initially
    checkProcessingStatus();
    
    // Check periodically while queue has items
    const interval = queueSize > 0 ? setInterval(checkProcessingStatus, 1000) : null;
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [queueSize]);

  // Refresh network state
  const refreshNetworkState = useCallback(async () => {
    try {
      await networkService.refreshState();
    } catch (error) {
      console.error('Failed to refresh network state:', error);
    }
  }, []);

  // Test connectivity
  const testConnectivity = useCallback(async () => {
    try {
      return await networkService.testConnectivity();
    } catch (error) {
      console.error('Failed to test connectivity:', error);
      return false;
    }
  }, []);

  // Get detailed network information
  const getDetailedInfo = useCallback(async () => {
    try {
      return await networkService.getDetailedInfo();
    } catch (error) {
      console.error('Failed to get detailed network info:', error);
      return null;
    }
  }, []);

  // Force process queue
  const forceProcessQueue = useCallback(async () => {
    try {
      await offlineQueueService.forceProcessQueue();
    } catch (error) {
      console.error('Failed to force process queue:', error);
    }
  }, []);

  // Clear queue
  const clearQueue = useCallback(async () => {
    try {
      await offlineQueueService.clearQueue();
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }, []);

  return {
    // Network state
    isOnline: networkState.isConnected,
    isOffline: !networkState.isConnected,
    networkState,
    networkQuality: networkService.getNetworkQuality(),
    
    // Queue information
    queueSize,
    isProcessingQueue,
    
    // Actions
    refreshNetworkState,
    testConnectivity,
    getDetailedInfo,
    
    // Queue actions
    forceProcessQueue,
    clearQueue
  };
};

export default useNetwork;