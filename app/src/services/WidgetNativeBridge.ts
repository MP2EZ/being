/**
 * Widget Native Bridge Service
 * Production-ready TypeScript bridge for native widget communication
 * Implements comprehensive native module integration with error handling
 */

import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { 
  WidgetNativeBridge, 
  WidgetBridgeError, 
  WidgetData,
  WidgetPerformanceMetrics,
  DeepReadonly
} from '../types/widget';

// Native module interface
interface FullMindWidgetsModule {
  // iOS WidgetKit Methods
  updateWidgetData: (data: string) => Promise<void>;
  reloadWidgets: () => Promise<void>;
  setAppGroupData: (key: string, data: string) => Promise<void>;
  getAppGroupData: (key: string) => Promise<string | null>;
  
  // Android AppWidget Methods
  updateAllWidgets: () => Promise<void>;
  updateWidgetById: (widgetId: number, data: string) => Promise<void>;
  getActiveWidgetIds: () => Promise<number[]>;
  
  // Health check methods
  performHealthCheck: () => Promise<boolean>;
  clearWidgetData: () => Promise<void>;
  
  // Deep link registration
  registerDeepLinkHandler: (handler: (url: string) => void) => Promise<void>;
}

/**
 * Enhanced Native Bridge Implementation
 */
export class WidgetNativeBridgeService {
  private nativeModule: FullMindWidgetsModule | null = null;
  private eventEmitter: NativeEventEmitter | null = null;
  private isInitialized: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  // Performance tracking
  private performanceMetrics: WidgetPerformanceMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 100;
  
  // Constants
  private readonly HEALTH_CHECK_INTERVAL_MS = 300000; // 5 minutes
  private readonly WIDGET_DATA_KEY = 'fullmind_widget_data_v2';
  private readonly BACKUP_DATA_KEY = 'fullmind_widget_backup';
  
  constructor() {
    this.initializeNativeModule();
  }

  /**
   * Initialize native module and event emitter
   */
  private initializeNativeModule(): void {
    try {
      const nativeModule = NativeModules.FullMindWidgets;
      
      if (!nativeModule) {
        console.warn('FullMindWidgets native module not available - widget functionality disabled');
        return;
      }

      this.nativeModule = nativeModule as FullMindWidgetsModule;
      this.eventEmitter = new NativeEventEmitter(nativeModule);
      
      // Register for deep link events
      this.setupDeepLinkHandling();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.isInitialized = true;
      console.log('Widget native bridge initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize widget native bridge:', error);
      this.nativeModule = null;
      this.eventEmitter = null;
    }
  }

  /**
   * Setup deep link event handling
   */
  private setupDeepLinkHandling(): void {
    if (!this.eventEmitter) return;

    try {
      this.eventEmitter.addListener('onWidgetDeepLink', (event: { url: string }) => {
        console.log('Widget deep link received:', event.url);
        
        // Emit custom event for handling by WidgetDataService
        const deepLinkEvent = new CustomEvent('widgetDeepLink', {
          detail: { url: event.url, timestamp: new Date().toISOString() }
        });
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(deepLinkEvent);
        }
      });
      
      console.log('Widget deep link handling setup complete');
    } catch (error) {
      console.error('Failed to setup deep link handling:', error);
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get native bridge implementation
   */
  public getNativeBridge(): DeepReadonly<WidgetNativeBridge> | null {
    if (!this.nativeModule || !this.isInitialized) {
      return null;
    }

    const bridge: WidgetNativeBridge = {
      ios: {
        updateWidgetData: this.wrapWithPerformanceTracking(
          'ios_update_data',
          (data: string) => this.nativeModule!.updateWidgetData(data)
        ),
        reloadWidgets: this.wrapWithPerformanceTracking(
          'ios_reload_widgets',
          () => this.nativeModule!.reloadWidgets()
        ),
        setAppGroupData: this.wrapWithPerformanceTracking(
          'ios_set_app_group',
          (key: string, data: string) => this.nativeModule!.setAppGroupData(key, data)
        ),
        getAppGroupData: this.wrapWithPerformanceTracking(
          'ios_get_app_group',
          (key: string) => this.nativeModule!.getAppGroupData(key)
        )
      },
      android: {
        updateWidgetData: this.wrapWithPerformanceTracking(
          'android_update_data',
          (data: string) => this.nativeModule!.updateWidgetData(data)
        ),
        updateAllWidgets: this.wrapWithPerformanceTracking(
          'android_update_all',
          () => this.nativeModule!.updateAllWidgets()
        ),
        updateWidgetById: this.wrapWithPerformanceTracking(
          'android_update_by_id',
          (widgetId: number, data: string) => this.nativeModule!.updateWidgetById(widgetId, data)
        ),
        getActiveWidgetIds: this.wrapWithPerformanceTracking(
          'android_get_ids',
          () => this.nativeModule!.getActiveWidgetIds()
        )
      }
    };

    return Object.freeze(bridge) as DeepReadonly<WidgetNativeBridge>;
  }

  /**
   * Wrap method with performance tracking
   */
  private wrapWithPerformanceTracking<TArgs extends any[], TReturn>(
    operation: string,
    method: (...args: TArgs) => Promise<TReturn>
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      const startTime = performance.now();
      
      try {
        const result = await method(...args);
        const endTime = performance.now();
        
        this.recordPerformanceMetric(operation, endTime - startTime, true);
        return result;
        
      } catch (error) {
        const endTime = performance.now();
        this.recordPerformanceMetric(operation, endTime - startTime, false);
        
        throw new WidgetBridgeError(
          `Native bridge operation failed: ${operation}`,
          'NATIVE_MODULE_NOT_AVAILABLE',
          { operation, args, error }
        );
      }
    };
  }

  /**
   * Record performance metrics
   */
  private recordPerformanceMetric(
    operation: string, 
    latencyMs: number, 
    success: boolean
  ): void {
    const metric: WidgetPerformanceMetrics = {
      updateLatencyMs: 0,
      nativeCallLatencyMs: latencyMs,
      dataSerializationMs: 0,
      privacyValidationMs: 0,
      totalOperationMs: latencyMs
    };

    this.performanceMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS_HISTORY);
    }

    // Log slow operations
    if (latencyMs > 1000) {
      console.warn(`Slow native bridge operation: ${operation} took ${latencyMs.toFixed(2)}ms`);
    }
  }

  /**
   * Store widget data with platform-specific handling
   */
  public async storeWidgetData(widgetData: WidgetData): Promise<void> {
    if (!this.isInitialized) {
      throw new WidgetBridgeError(
        'Native bridge not initialized',
        'NATIVE_MODULE_NOT_AVAILABLE'
      );
    }

    const jsonData = JSON.stringify(widgetData);
    const bridge = this.getNativeBridge();
    
    if (!bridge) {
      throw new WidgetBridgeError(
        'Native bridge not available',
        'NATIVE_MODULE_NOT_AVAILABLE'
      );
    }

    const operations: Promise<void>[] = [];

    // Platform-specific storage
    if (Platform.OS === 'ios') {
      operations.push(bridge.ios.updateWidgetData(jsonData));
      operations.push(bridge.ios.setAppGroupData(this.WIDGET_DATA_KEY, jsonData));
    } else if (Platform.OS === 'android') {
      operations.push(bridge.android.updateWidgetData(jsonData));
    }

    // Secure backup storage
    operations.push(this.storeSecureBackup(jsonData));

    // Execute all storage operations
    await Promise.allSettled(operations);
  }

  /**
   * Trigger widget updates with platform-specific handling
   */
  public async triggerWidgetUpdate(): Promise<void> {
    if (!this.isInitialized) {
      console.warn('Cannot trigger widget update - native bridge not initialized');
      return;
    }

    const bridge = this.getNativeBridge();
    if (!bridge) {
      console.warn('Cannot trigger widget update - native bridge not available');
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        await bridge.ios.reloadWidgets();
      } else if (Platform.OS === 'android') {
        await bridge.android.updateAllWidgets();
      }
      
      console.log('Widget update triggered successfully');
    } catch (error) {
      console.error('Failed to trigger widget update:', error);
      throw new WidgetBridgeError(
        'Widget update trigger failed',
        'UPDATE_THROTTLED',
        error
      );
    }
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<boolean> {
    if (!this.isInitialized || !this.nativeModule) {
      return false;
    }

    try {
      const isHealthy = await this.nativeModule.performHealthCheck();
      
      if (!isHealthy) {
        console.warn('Widget native module health check failed');
        // Attempt to reinitialize
        this.initializeNativeModule();
      }
      
      return isHealthy;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Clear all widget data (for privacy/reset)
   */
  public async clearAllWidgetData(): Promise<void> {
    const operations: Promise<void>[] = [];

    if (this.nativeModule) {
      operations.push(this.nativeModule.clearWidgetData());
    }

    // Clear secure backup
    operations.push(this.clearSecureBackup());

    await Promise.allSettled(operations);
    console.log('All widget data cleared');
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): ReadonlyArray<WidgetPerformanceMetrics> {
    return [...this.performanceMetrics];
  }

  /**
   * Get average performance metrics
   */
  public getAveragePerformanceMetrics(): WidgetPerformanceMetrics {
    if (this.performanceMetrics.length === 0) {
      return {
        updateLatencyMs: 0,
        nativeCallLatencyMs: 0,
        dataSerializationMs: 0,
        privacyValidationMs: 0,
        totalOperationMs: 0
      };
    }

    const sum = this.performanceMetrics.reduce(
      (acc, metric) => ({
        updateLatencyMs: acc.updateLatencyMs + metric.updateLatencyMs,
        nativeCallLatencyMs: acc.nativeCallLatencyMs + metric.nativeCallLatencyMs,
        dataSerializationMs: acc.dataSerializationMs + metric.dataSerializationMs,
        privacyValidationMs: acc.privacyValidationMs + metric.privacyValidationMs,
        totalOperationMs: acc.totalOperationMs + metric.totalOperationMs
      }),
      {
        updateLatencyMs: 0,
        nativeCallLatencyMs: 0,
        dataSerializationMs: 0,
        privacyValidationMs: 0,
        totalOperationMs: 0
      }
    );

    const count = this.performanceMetrics.length;
    
    return {
      updateLatencyMs: sum.updateLatencyMs / count,
      nativeCallLatencyMs: sum.nativeCallLatencyMs / count,
      dataSerializationMs: sum.dataSerializationMs / count,
      privacyValidationMs: sum.privacyValidationMs / count,
      totalOperationMs: sum.totalOperationMs / count
    };
  }

  /**
   * Check if native bridge is available and healthy
   */
  public isAvailable(): boolean {
    return this.isInitialized && this.nativeModule !== null;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.stopHealthMonitoring();
    
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('onWidgetDeepLink');
    }
    
    this.nativeModule = null;
    this.eventEmitter = null;
    this.isInitialized = false;
    
    console.log('Widget native bridge disposed');
  }

  // Private helper methods

  private async storeSecureBackup(jsonData: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.BACKUP_DATA_KEY, jsonData);
    } catch (error) {
      console.warn('Failed to store widget data backup:', error);
    }
  }

  private async clearSecureBackup(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.BACKUP_DATA_KEY);
    } catch (error) {
      console.warn('Failed to clear widget data backup:', error);
    }
  }
}

// Export singleton instance
export const widgetNativeBridge = new WidgetNativeBridgeService();