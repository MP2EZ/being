/**
 * AsyncStorageTurboModule - Native AsyncStorage acceleration
 *
 * TurboModule implementation for enhanced AsyncStorage performance
 * with clinical-grade encryption and crisis response optimization.
 */

import { TurboModule, TurboModuleRegistry } from 'react-native';

// TurboModule specification for AsyncStorage acceleration
export interface Spec extends TurboModule {
  // Basic AsyncStorage operations with native optimization
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;

  // Batch operations for enhanced performance
  batchGetItems(keys: string[]): Promise<Record<string, string | null>>;
  batchSetItems(items: Record<string, string>): Promise<void>;
  batchRemoveItems(keys: string[]): Promise<void>;

  // Enhanced operations for clinical data
  setItemWithEncryption(
    key: string,
    value: string,
    encryptionLevel: number
  ): Promise<void>;
  getItemWithDecryption(
    key: string,
    encryptionLevel: number
  ): Promise<string | null>;

  // Crisis-optimized operations
  setItemCrisisPriority(key: string, value: string): Promise<void>;
  getItemCrisisPriority(key: string): Promise<string | null>;

  // Performance monitoring
  getPerformanceMetrics(): Promise<{
    avgReadTime: number;
    avgWriteTime: number;
    totalOperations: number;
    cacheHitRate: number;
  }>;

  // Memory optimization
  optimizeStorage(): Promise<void>;
  getStorageInfo(): Promise<{
    usedSpace: number;
    totalSpace: number;
    fragmentationLevel: number;
  }>;
}

// Default implementation that falls back to JavaScript AsyncStorage
class AsyncStorageTurboModuleImpl implements Spec {
  private AsyncStorage: any;
  private performanceTracker: {
    readTimes: number[];
    writeTimes: number[];
    totalOps: number;
    cacheHits: number;
  };

  constructor() {
    this.AsyncStorage = require('@react-native-async-storage/async-storage').default;
    this.performanceTracker = {
      readTimes: [],
      writeTimes: [],
      totalOps: 0,
      cacheHits: 0
    };
  }

  async getItem(key: string): Promise<string | null> {
    const startTime = performance.now();
    try {
      const result = await this.AsyncStorage.getItem(key);
      const duration = performance.now() - startTime;
      this.recordReadTime(duration);
      return result;
    } catch (error) {
      console.error('AsyncStorage getItem failed:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const startTime = performance.now();
    try {
      await this.AsyncStorage.setItem(key, value);
      const duration = performance.now() - startTime;
      this.recordWriteTime(duration);
    } catch (error) {
      console.error('AsyncStorage setItem failed:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    const startTime = performance.now();
    try {
      await this.AsyncStorage.removeItem(key);
      const duration = performance.now() - startTime;
      this.recordWriteTime(duration);
    } catch (error) {
      console.error('AsyncStorage removeItem failed:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    const startTime = performance.now();
    try {
      const keys = await this.AsyncStorage.getAllKeys();
      const duration = performance.now() - startTime;
      this.recordReadTime(duration);
      return keys;
    } catch (error) {
      console.error('AsyncStorage getAllKeys failed:', error);
      return [];
    }
  }

  async clear(): Promise<void> {
    const startTime = performance.now();
    try {
      await this.AsyncStorage.clear();
      const duration = performance.now() - startTime;
      this.recordWriteTime(duration);
    } catch (error) {
      console.error('AsyncStorage clear failed:', error);
      throw error;
    }
  }

  // Batch operations with JavaScript implementation
  async batchGetItems(keys: string[]): Promise<Record<string, string | null>> {
    const startTime = performance.now();
    try {
      const keyValuePairs = await this.AsyncStorage.multiGet(keys);
      const result: Record<string, string | null> = {};

      keyValuePairs.forEach(([key, value]: [string, string | null]) => {
        result[key] = value;
      });

      const duration = performance.now() - startTime;
      this.recordReadTime(duration);
      return result;
    } catch (error) {
      console.error('AsyncStorage batchGetItems failed:', error);
      return {};
    }
  }

  async batchSetItems(items: Record<string, string>): Promise<void> {
    const startTime = performance.now();
    try {
      const keyValuePairs = Object.entries(items);
      await this.AsyncStorage.multiSet(keyValuePairs);

      const duration = performance.now() - startTime;
      this.recordWriteTime(duration);
    } catch (error) {
      console.error('AsyncStorage batchSetItems failed:', error);
      throw error;
    }
  }

  async batchRemoveItems(keys: string[]): Promise<void> {
    const startTime = performance.now();
    try {
      await this.AsyncStorage.multiRemove(keys);

      const duration = performance.now() - startTime;
      this.recordWriteTime(duration);
    } catch (error) {
      console.error('AsyncStorage batchRemoveItems failed:', error);
      throw error;
    }
  }

  // Enhanced encryption operations (JavaScript fallback)
  async setItemWithEncryption(
    key: string,
    value: string,
    encryptionLevel: number
  ): Promise<void> {
    const startTime = performance.now();
    try {
      // In JavaScript implementation, we'll use the existing encryption service
      const { encryptionService, DataSensitivity } = await import('../../services/security');

      const sensitivityMap = {
        1: DataSensitivity.SYSTEM,
        2: DataSensitivity.PERSONAL,
        3: DataSensitivity.CLINICAL
      };

      const sensitivity = sensitivityMap[encryptionLevel as keyof typeof sensitivityMap] || DataSensitivity.PERSONAL;
      const encrypted = await encryptionService.encryptData(value, sensitivity);

      await this.AsyncStorage.setItem(key, JSON.stringify(encrypted));

      const duration = performance.now() - startTime;
      this.recordWriteTime(duration);
    } catch (error) {
      console.error('AsyncStorage setItemWithEncryption failed:', error);
      throw error;
    }
  }

  async getItemWithDecryption(
    key: string,
    encryptionLevel: number
  ): Promise<string | null> {
    const startTime = performance.now();
    try {
      const encryptedData = await this.AsyncStorage.getItem(key);
      if (!encryptedData) return null;

      const { encryptionService, DataSensitivity } = await import('../../services/security');

      const sensitivityMap = {
        1: DataSensitivity.SYSTEM,
        2: DataSensitivity.PERSONAL,
        3: DataSensitivity.CLINICAL
      };

      const sensitivity = sensitivityMap[encryptionLevel as keyof typeof sensitivityMap] || DataSensitivity.PERSONAL;
      const encrypted = JSON.parse(encryptedData);
      const decrypted = await encryptionService.decryptData(encrypted, sensitivity);

      const duration = performance.now() - startTime;
      this.recordReadTime(duration);
      return decrypted;
    } catch (error) {
      console.error('AsyncStorage getItemWithDecryption failed:', error);
      return null;
    }
  }

  // Crisis-optimized operations with priority handling
  async setItemCrisisPriority(key: string, value: string): Promise<void> {
    // For JavaScript implementation, this is the same as regular setItem
    // but we'll mark it for priority handling
    const startTime = performance.now();
    try {
      await this.AsyncStorage.setItem(key, value);
      const duration = performance.now() - startTime;

      // Log if crisis operation exceeds performance targets
      if (duration > 50) {
        console.warn(`Crisis priority setItem exceeded 50ms: ${duration}ms`);
      }

      this.recordWriteTime(duration);
    } catch (error) {
      console.error('AsyncStorage setItemCrisisPriority failed:', error);
      throw error;
    }
  }

  async getItemCrisisPriority(key: string): Promise<string | null> {
    const startTime = performance.now();
    try {
      const result = await this.AsyncStorage.getItem(key);
      const duration = performance.now() - startTime;

      // Log if crisis operation exceeds performance targets
      if (duration > 25) {
        console.warn(`Crisis priority getItem exceeded 25ms: ${duration}ms`);
      }

      this.recordReadTime(duration);
      return result;
    } catch (error) {
      console.error('AsyncStorage getItemCrisisPriority failed:', error);
      return null;
    }
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    avgReadTime: number;
    avgWriteTime: number;
    totalOperations: number;
    cacheHitRate: number;
  }> {
    const avgReadTime = this.performanceTracker.readTimes.length > 0
      ? this.performanceTracker.readTimes.reduce((sum, time) => sum + time, 0) / this.performanceTracker.readTimes.length
      : 0;

    const avgWriteTime = this.performanceTracker.writeTimes.length > 0
      ? this.performanceTracker.writeTimes.reduce((sum, time) => sum + time, 0) / this.performanceTracker.writeTimes.length
      : 0;

    const cacheHitRate = this.performanceTracker.totalOps > 0
      ? this.performanceTracker.cacheHits / this.performanceTracker.totalOps
      : 0;

    return {
      avgReadTime,
      avgWriteTime,
      totalOperations: this.performanceTracker.totalOps,
      cacheHitRate
    };
  }

  // Storage optimization
  async optimizeStorage(): Promise<void> {
    try {
      // In JavaScript implementation, we can't do native optimization
      // but we can clear our performance tracking cache
      this.performanceTracker.readTimes = this.performanceTracker.readTimes.slice(-100);
      this.performanceTracker.writeTimes = this.performanceTracker.writeTimes.slice(-100);

      console.log('Storage optimization completed (JavaScript fallback)');
    } catch (error) {
      console.error('Storage optimization failed:', error);
    }
  }

  async getStorageInfo(): Promise<{
    usedSpace: number;
    totalSpace: number;
    fragmentationLevel: number;
  }> {
    try {
      // JavaScript implementation can't get exact storage info
      // Return estimated values
      const keys = await this.getAllKeys();
      const estimatedUsedSpace = keys.length * 1000; // Rough estimate

      return {
        usedSpace: estimatedUsedSpace,
        totalSpace: 50 * 1024 * 1024, // 50MB estimate
        fragmentationLevel: 0.1 // Low fragmentation estimate
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        usedSpace: 0,
        totalSpace: 0,
        fragmentationLevel: 0
      };
    }
  }

  // Performance tracking helpers
  private recordReadTime(duration: number): void {
    this.performanceTracker.readTimes.push(duration);
    this.performanceTracker.totalOps++;

    // Keep only last 1000 measurements
    if (this.performanceTracker.readTimes.length > 1000) {
      this.performanceTracker.readTimes.shift();
    }
  }

  private recordWriteTime(duration: number): void {
    this.performanceTracker.writeTimes.push(duration);
    this.performanceTracker.totalOps++;

    // Keep only last 1000 measurements
    if (this.performanceTracker.writeTimes.length > 1000) {
      this.performanceTracker.writeTimes.shift();
    }
  }
}

// Get TurboModule instance or fallback to JavaScript implementation
export const AsyncStorageTurbo: Spec =
  TurboModuleRegistry.get<Spec>('AsyncStorageTurbo') ??
  new AsyncStorageTurboModuleImpl();

/**
 * Enhanced AsyncStorage wrapper with TurboModule integration
 */
export class EnhancedAsyncStorage {
  private turboModule: Spec;
  private isNativeTurboModule: boolean;

  constructor() {
    this.turboModule = AsyncStorageTurbo;
    this.isNativeTurboModule = TurboModuleRegistry.get('AsyncStorageTurbo') !== null;

    if (this.isNativeTurboModule) {
      console.log('Using native AsyncStorageTurbo module');
    } else {
      console.log('Using JavaScript AsyncStorage fallback');
    }
  }

  // Basic operations with performance monitoring
  async getItem(key: string): Promise<string | null> {
    return this.turboModule.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return this.turboModule.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    return this.turboModule.removeItem(key);
  }

  // Batch operations for Zustand store optimization
  async batchGetStores(storeKeys: string[]): Promise<Record<string, any>> {
    const results = await this.turboModule.batchGetItems(storeKeys);
    const parsedResults: Record<string, any> = {};

    for (const [key, value] of Object.entries(results)) {
      if (value) {
        try {
          parsedResults[key] = JSON.parse(value);
        } catch (error) {
          console.error(`Failed to parse store data for ${key}:`, error);
          parsedResults[key] = null;
        }
      } else {
        parsedResults[key] = null;
      }
    }

    return parsedResults;
  }

  async batchSetStores(storeData: Record<string, any>): Promise<void> {
    const serializedData: Record<string, string> = {};

    for (const [key, value] of Object.entries(storeData)) {
      try {
        serializedData[key] = JSON.stringify(value);
      } catch (error) {
        console.error(`Failed to serialize store data for ${key}:`, error);
        throw error;
      }
    }

    return this.turboModule.batchSetItems(serializedData);
  }

  // Clinical data operations with enhanced encryption
  async setStoreWithEncryption(
    storeName: string,
    storeData: any,
    encryptionLevel: 1 | 2 | 3 = 2
  ): Promise<void> {
    const serializedData = JSON.stringify(storeData);
    const storeKey = `zustand_${storeName}`;

    return this.turboModule.setItemWithEncryption(
      storeKey,
      serializedData,
      encryptionLevel
    );
  }

  async getStoreWithDecryption(
    storeName: string,
    encryptionLevel: 1 | 2 | 3 = 2
  ): Promise<any> {
    const storeKey = `zustand_${storeName}`;
    const decryptedData = await this.turboModule.getItemWithDecryption(
      storeKey,
      encryptionLevel
    );

    if (!decryptedData) return null;

    try {
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error(`Failed to parse decrypted store data for ${storeName}:`, error);
      return null;
    }
  }

  // Crisis-optimized operations for emergency state
  async setCrisisState(key: string, value: any): Promise<void> {
    const serializedValue = JSON.stringify(value);
    return this.turboModule.setItemCrisisPriority(key, serializedValue);
  }

  async getCrisisState(key: string): Promise<any> {
    const value = await this.turboModule.getItemCrisisPriority(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`Failed to parse crisis state for ${key}:`, error);
      return null;
    }
  }

  // Performance monitoring and optimization
  async getPerformanceReport(): Promise<{
    avgReadTime: number;
    avgWriteTime: number;
    totalOperations: number;
    cacheHitRate: number;
    storageInfo: {
      usedSpace: number;
      totalSpace: number;
      fragmentationLevel: number;
    };
    recommendations: string[];
  }> {
    const [metrics, storageInfo] = await Promise.all([
      this.turboModule.getPerformanceMetrics(),
      this.turboModule.getStorageInfo()
    ]);

    const recommendations: string[] = [];

    // Performance recommendations
    if (metrics.avgReadTime > 50) {
      recommendations.push('Consider enabling native caching for read operations');
    }

    if (metrics.avgWriteTime > 100) {
      recommendations.push('Consider batching write operations for better performance');
    }

    if (storageInfo.fragmentationLevel > 0.3) {
      recommendations.push('Storage fragmentation is high, consider optimization');
    }

    if (storageInfo.usedSpace / storageInfo.totalSpace > 0.8) {
      recommendations.push('Storage usage is high, consider cleanup');
    }

    return {
      ...metrics,
      storageInfo,
      recommendations
    };
  }

  async optimizeStorage(): Promise<void> {
    return this.turboModule.optimizeStorage();
  }

  // Utility methods
  get isUsingNativeTurboModule(): boolean {
    return this.isNativeTurboModule;
  }

  async healthCheck(): Promise<{
    isWorking: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = performance.now();
    const testKey = 'health_check_test';
    const testValue = 'test_value';

    try {
      await this.setItem(testKey, testValue);
      const retrievedValue = await this.getItem(testKey);
      await this.removeItem(testKey);

      const latency = performance.now() - startTime;
      const isWorking = retrievedValue === testValue;

      return {
        isWorking,
        latency,
        error: isWorking ? undefined : 'Value mismatch in health check'
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      return {
        isWorking: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance for global use
export const enhancedAsyncStorage = new EnhancedAsyncStorage();

// Export default enhanced instance
export default enhancedAsyncStorage;