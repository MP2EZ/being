/**
 * Payment Memory Management Optimizer
 *
 * Advanced memory management for payment sync components:
 * - Memory-efficient payment error handlers
 * - Optimized subscription tier status caching
 * - Memory leak prevention during extended payment outages
 * - Garbage collection optimization for payment queues
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { usePaymentStore } from '../../store/paymentStore';

// Memory monitoring utilities
class PaymentMemoryMonitor {
  private static instance: PaymentMemoryMonitor;
  private memoryUsage: number = 0;
  private peakMemory: number = 0;
  private gcCount: number = 0;
  private paymentCacheSize: number = 0;
  private subscriptionCacheSize: number = 0;
  private errorHandlerCount: number = 0;

  static getInstance(): PaymentMemoryMonitor {
    if (!PaymentMemoryMonitor.instance) {
      PaymentMemoryMonitor.instance = new PaymentMemoryMonitor();
    }
    return PaymentMemoryMonitor.instance;
  }

  updateMemoryUsage(usage: number): void {
    this.memoryUsage = usage;
    if (usage > this.peakMemory) {
      this.peakMemory = usage;
    }

    // Log warning if memory usage exceeds 50MB for payment components
    if (usage > 50 * 1024 * 1024) {
      console.warn(`Payment components memory usage high: ${(usage / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  trackGarbageCollection(): void {
    this.gcCount++;
  }

  updateCacheSize(paymentCache: number, subscriptionCache: number): void {
    this.paymentCacheSize = paymentCache;
    this.subscriptionCacheSize = subscriptionCache;

    const totalCacheSize = paymentCache + subscriptionCache;
    // Warn if cache size exceeds 10MB
    if (totalCacheSize > 10 * 1024 * 1024) {
      console.warn(`Payment cache size high: ${(totalCacheSize / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  updateErrorHandlerCount(count: number): void {
    this.errorHandlerCount = count;

    // Warn if too many error handlers are active
    if (count > 50) {
      console.warn(`High number of payment error handlers: ${count}`);
    }
  }

  getMetrics() {
    return {
      memoryUsage: this.memoryUsage,
      peakMemory: this.peakMemory,
      gcCount: this.gcCount,
      paymentCacheSize: this.paymentCacheSize,
      subscriptionCacheSize: this.subscriptionCacheSize,
      errorHandlerCount: this.errorHandlerCount,
    };
  }

  reset(): void {
    this.memoryUsage = 0;
    this.peakMemory = 0;
    this.gcCount = 0;
    this.paymentCacheSize = 0;
    this.subscriptionCacheSize = 0;
    this.errorHandlerCount = 0;
  }
}

/**
 * Memory-Efficient Payment Error Handler
 * Manages error state without memory leaks during extended outages
 */
interface MemoryEfficientErrorHandlerProps {
  readonly maxRetainedErrors?: number; // Default: 10
  readonly cleanupIntervalMs?: number; // Default: 60000 (1 minute)
  readonly children: (errorState: {
    errors: PaymentError[];
    addError: (error: PaymentError) => void;
    clearErrors: () => void;
    getLatestError: () => PaymentError | null;
  }) => React.ReactNode;
}

interface PaymentError {
  id: string;
  type: 'network' | 'payment' | 'sync' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const MemoryEfficientErrorHandler: React.FC<MemoryEfficientErrorHandlerProps> = ({
  maxRetainedErrors = 10,
  cleanupIntervalMs = 60000,
  children
}) => {
  const errorsRef = useRef<PaymentError[]>([]);
  const cleanupTimerRef = useRef<NodeJS.Timeout>();
  const memoryMonitor = PaymentMemoryMonitor.getInstance();

  // Memory-efficient error addition
  const addError = useCallback((error: PaymentError) => {
    const errors = errorsRef.current;

    // Add new error
    errors.push(error);

    // Memory management: remove oldest errors if exceeding limit
    if (errors.length > maxRetainedErrors) {
      const removeCount = errors.length - maxRetainedErrors;
      errors.splice(0, removeCount);
    }

    // Remove resolved errors older than 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    errorsRef.current = errors.filter(err =>
      !err.resolved || err.timestamp > fiveMinutesAgo
    );

    // Update memory monitoring
    memoryMonitor.updateErrorHandlerCount(errorsRef.current.length);
  }, [maxRetainedErrors, memoryMonitor]);

  // Efficient error clearing
  const clearErrors = useCallback(() => {
    errorsRef.current = [];
    memoryMonitor.updateErrorHandlerCount(0);
  }, [memoryMonitor]);

  // Get latest error without array iteration
  const getLatestError = useCallback((): PaymentError | null => {
    const errors = errorsRef.current;
    return errors.length > 0 ? errors[errors.length - 1] : null;
  }, []);

  // Periodic cleanup to prevent memory leaks
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      // Remove errors older than 1 hour
      errorsRef.current = errorsRef.current.filter(error =>
        error.timestamp > oneHourAgo || error.severity === 'critical'
      );

      // Force garbage collection hint
      if (global.gc) {
        global.gc();
        memoryMonitor.trackGarbageCollection();
      }

      memoryMonitor.updateErrorHandlerCount(errorsRef.current.length);
    };

    cleanupTimerRef.current = setInterval(cleanup, cleanupIntervalMs);

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [cleanupIntervalMs, memoryMonitor]);

  // App state management for memory cleanup
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Aggressive cleanup when app goes to background
        const criticalErrors = errorsRef.current.filter(error =>
          error.severity === 'critical' && !error.resolved
        );
        errorsRef.current = criticalErrors;
        memoryMonitor.updateErrorHandlerCount(criticalErrors.length);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [memoryMonitor]);

  const errorState = useMemo(() => ({
    errors: errorsRef.current,
    addError,
    clearErrors,
    getLatestError
  }), [addError, clearErrors, getLatestError]);

  return <>{children(errorState)}</>;
};

/**
 * Optimized Subscription Tier Cache
 * Efficient caching for subscription tier status with automatic cleanup
 */
interface OptimizedSubscriptionCacheProps {
  readonly maxCacheSize?: number; // Default: 100 entries
  readonly cacheExpiryMs?: number; // Default: 300000 (5 minutes)
  readonly children: (cache: {
    getTierStatus: (userId: string) => SubscriptionTierStatus | null;
    setTierStatus: (userId: string, status: SubscriptionTierStatus) => void;
    clearCache: () => void;
    getCacheStats: () => CacheStats;
  }) => React.ReactNode;
}

interface SubscriptionTierStatus {
  tier: string;
  status: 'active' | 'inactive' | 'trial' | 'expired';
  features: string[];
  lastUpdated: number;
}

interface CacheStats {
  size: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
}

export const OptimizedSubscriptionCache: React.FC<OptimizedSubscriptionCacheProps> = ({
  maxCacheSize = 100,
  cacheExpiryMs = 300000,
  children
}) => {
  const cacheRef = useRef<Map<string, SubscriptionTierStatus>>(new Map());
  const accessOrderRef = useRef<string[]>([]);
  const statsRef = useRef({ hits: 0, misses: 0 });
  const memoryMonitor = PaymentMemoryMonitor.getInstance();

  // LRU cache implementation for memory efficiency
  const updateAccessOrder = useCallback((userId: string) => {
    const accessOrder = accessOrderRef.current;
    const existingIndex = accessOrder.indexOf(userId);

    if (existingIndex > -1) {
      accessOrder.splice(existingIndex, 1);
    }
    accessOrder.push(userId);

    // Remove oldest entries if cache is full
    while (accessOrder.length > maxCacheSize) {
      const oldestUser = accessOrder.shift();
      if (oldestUser) {
        cacheRef.current.delete(oldestUser);
      }
    }
  }, [maxCacheSize]);

  // Memory-efficient cache getter
  const getTierStatus = useCallback((userId: string): SubscriptionTierStatus | null => {
    const cache = cacheRef.current;
    const cached = cache.get(userId);

    if (!cached) {
      statsRef.current.misses++;
      return null;
    }

    // Check expiry
    const now = Date.now();
    if (now - cached.lastUpdated > cacheExpiryMs) {
      cache.delete(userId);
      const accessOrder = accessOrderRef.current;
      const index = accessOrder.indexOf(userId);
      if (index > -1) {
        accessOrder.splice(index, 1);
      }
      statsRef.current.misses++;
      return null;
    }

    statsRef.current.hits++;
    updateAccessOrder(userId);
    return cached;
  }, [cacheExpiryMs, updateAccessOrder]);

  // Memory-efficient cache setter
  const setTierStatus = useCallback((userId: string, status: SubscriptionTierStatus) => {
    const cache = cacheRef.current;
    cache.set(userId, {
      ...status,
      lastUpdated: Date.now()
    });

    updateAccessOrder(userId);

    // Update memory monitoring
    const cacheSize = JSON.stringify(Array.from(cache.entries())).length;
    memoryMonitor.updateCacheSize(0, cacheSize);
  }, [updateAccessOrder, memoryMonitor]);

  // Cache clearing
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    accessOrderRef.current = [];
    statsRef.current = { hits: 0, misses: 0 };
    memoryMonitor.updateCacheSize(0, 0);
  }, [memoryMonitor]);

  // Cache statistics
  const getCacheStats = useCallback((): CacheStats => {
    const cache = cacheRef.current;
    const { hits, misses } = statsRef.current;
    const total = hits + misses;

    const memoryUsage = JSON.stringify(Array.from(cache.entries())).length;

    return {
      size: cache.size,
      memoryUsage,
      hitRate: total > 0 ? hits / total : 0,
      missRate: total > 0 ? misses / total : 0
    };
  }, []);

  // Periodic cache cleanup
  useEffect(() => {
    const cleanup = () => {
      const cache = cacheRef.current;
      const now = Date.now();
      let removedCount = 0;

      for (const [userId, status] of cache.entries()) {
        if (now - status.lastUpdated > cacheExpiryMs) {
          cache.delete(userId);
          removedCount++;

          // Remove from access order
          const accessOrder = accessOrderRef.current;
          const index = accessOrder.indexOf(userId);
          if (index > -1) {
            accessOrder.splice(index, 1);
          }
        }
      }

      if (removedCount > 0) {
        const cacheSize = JSON.stringify(Array.from(cache.entries())).length;
        memoryMonitor.updateCacheSize(0, cacheSize);
      }
    };

    const cleanupInterval = setInterval(cleanup, cacheExpiryMs / 2);

    return () => clearInterval(cleanupInterval);
  }, [cacheExpiryMs, memoryMonitor]);

  const cacheInterface = useMemo(() => ({
    getTierStatus,
    setTierStatus,
    clearCache,
    getCacheStats
  }), [getTierStatus, setTierStatus, clearCache, getCacheStats]);

  return <>{children(cacheInterface)}</>;
};

/**
 * Payment Queue Memory Manager
 * Manages payment operation queues with memory-efficient data structures
 */
interface PaymentQueueMemoryManagerProps {
  readonly maxQueueSize?: number; // Default: 1000
  readonly compressionThreshold?: number; // Default: 100
  readonly children: (queueManager: {
    addOperation: (operation: PaymentOperation) => void;
    processQueue: () => PaymentOperation[];
    clearProcessedOperations: () => void;
    getQueueStats: () => QueueStats;
  }) => React.ReactNode;
}

interface PaymentOperation {
  id: string;
  type: 'sync' | 'webhook' | 'retry' | 'cancel';
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  processed: boolean;
  attempts: number;
}

interface QueueStats {
  totalOperations: number;
  processedOperations: number;
  pendingOperations: number;
  memoryUsage: number;
  compressionRatio: number;
}

export const PaymentQueueMemoryManager: React.FC<PaymentQueueMemoryManagerProps> = ({
  maxQueueSize = 1000,
  compressionThreshold = 100,
  children
}) => {
  const queueRef = useRef<PaymentOperation[]>([]);
  const processedRef = useRef<Set<string>>(new Set());
  const memoryMonitor = PaymentMemoryMonitor.getInstance();

  // Memory-efficient operation addition with compression
  const addOperation = useCallback((operation: PaymentOperation) => {
    const queue = queueRef.current;

    // Add operation to queue
    queue.push(operation);

    // Memory management: compress old operations if threshold exceeded
    if (queue.length > compressionThreshold) {
      compressQueue();
    }

    // Hard limit: remove oldest operations if max size exceeded
    if (queue.length > maxQueueSize) {
      const removeCount = queue.length - maxQueueSize;
      queue.splice(0, removeCount);
    }

    // Update memory monitoring
    const queueSize = JSON.stringify(queue).length;
    memoryMonitor.updateCacheSize(queueSize, 0);
  }, [maxQueueSize, compressionThreshold, memoryMonitor]);

  // Compress queue by keeping only essential data for old operations
  const compressQueue = useCallback(() => {
    const queue = queueRef.current;
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    for (let i = 0; i < queue.length; i++) {
      const operation = queue[i];

      // Compress old, processed operations
      if (operation.timestamp < twoHoursAgo && operation.processed) {
        queue[i] = {
          id: operation.id,
          type: operation.type,
          data: null, // Remove heavy data
          timestamp: operation.timestamp,
          priority: operation.priority,
          processed: operation.processed,
          attempts: operation.attempts
        };
      }
    }
  }, []);

  // Process queue with priority sorting
  const processQueue = useCallback((): PaymentOperation[] => {
    const queue = queueRef.current;
    const pendingOperations = queue.filter(op => !op.processed);

    // Sort by priority and timestamp
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    pendingOperations.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp; // FIFO for same priority
    });

    return pendingOperations;
  }, []);

  // Clear processed operations to free memory
  const clearProcessedOperations = useCallback(() => {
    const queue = queueRef.current;
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Keep only unprocessed operations and recent processed ones
    queueRef.current = queue.filter(op =>
      !op.processed || op.timestamp > oneDayAgo
    );

    // Clear processed set
    processedRef.current.clear();

    // Update memory monitoring
    const queueSize = JSON.stringify(queueRef.current).length;
    memoryMonitor.updateCacheSize(queueSize, 0);
  }, [memoryMonitor]);

  // Queue statistics
  const getQueueStats = useCallback((): QueueStats => {
    const queue = queueRef.current;
    const processed = queue.filter(op => op.processed).length;
    const pending = queue.length - processed;

    const fullQueueSize = JSON.stringify(queue).length;
    const compressedQueue = queue.map(op => ({
      id: op.id,
      type: op.type,
      timestamp: op.timestamp
    }));
    const compressedSize = JSON.stringify(compressedQueue).length;

    return {
      totalOperations: queue.length,
      processedOperations: processed,
      pendingOperations: pending,
      memoryUsage: fullQueueSize,
      compressionRatio: compressedSize / fullQueueSize
    };
  }, []);

  // Periodic cleanup
  useEffect(() => {
    const cleanup = () => {
      clearProcessedOperations();

      // Force garbage collection hint
      if (global.gc) {
        global.gc();
        memoryMonitor.trackGarbageCollection();
      }
    };

    const cleanupInterval = setInterval(cleanup, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [clearProcessedOperations, memoryMonitor]);

  const queueManager = useMemo(() => ({
    addOperation,
    processQueue,
    clearProcessedOperations,
    getQueueStats
  }), [addOperation, processQueue, clearProcessedOperations, getQueueStats]);

  return <>{children(queueManager)}</>;
};

// Export memory monitoring utilities
export { PaymentMemoryMonitor };
export type { PaymentError, SubscriptionTierStatus, PaymentOperation };