/**
 * Sync Initialization Service - Orchestrates startup of the complete sync system
 * Clinical-grade initialization with proper service coordination and error handling
 */

import { syncOrchestrationService } from './SyncOrchestrationService';
import { offlineQueueService as enhancedOfflineQueueService } from './OfflineQueueService';
import { networkAwareService } from './NetworkAwareService';
import { assetCacheService } from './AssetCacheService';
import { resumableSessionService } from './ResumableSessionService';
import { syncPerformanceMonitor } from './SyncPerformanceMonitor';
import { offlineIntegrationService } from './OfflineIntegrationService';
import { SyncState, SyncOperation, SyncPerformanceMetrics } from '../types/cross-device-sync-canonical';
import { SyncEntityType, AppSyncState, SyncStatus } from '../types/sync';
import { NetworkQuality, OfflineServiceHealth } from '../types/offline';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Initialization status for each service
 */
interface ServiceStatus {
  readonly name: string;
  readonly initialized: boolean;
  readonly error?: string;
  readonly startTime?: number;
  readonly endTime?: number;
  readonly dependencies: readonly string[];
}

/**
 * Overall initialization result
 */
interface InitializationResult {
  readonly success: boolean;
  readonly duration: number;
  readonly services: readonly ServiceStatus[];
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly syncReady: boolean;
  readonly networkAvailable: boolean;
  readonly offlineCapable: boolean;
}

/**
 * Initialization configuration
 */
interface InitializationConfig {
  readonly enablePerformanceMonitoring: boolean;
  readonly enableOfflineMode: boolean;
  readonly enableAssetCaching: boolean;
  readonly enableResumableSessions: boolean;
  readonly autoStartSync: boolean;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly clinicalSafetyChecks: boolean;
}

/**
 * Service initialization manager for the sync system
 */
class SyncInitializationService {
  private readonly SERVICE_STATUS_KEY = 'being_sync_service_status';
  private readonly INIT_CONFIG_KEY = 'being_sync_init_config';
  
  // Service dependencies (initialization order)
  private readonly serviceDependencies = new Map<string, string[]>([
    ['networkAware', []],
    ['dataStore', []],
    ['assetCache', ['networkAware']],
    ['resumableSession', ['dataStore']],
    ['enhancedOfflineQueue', ['networkAware', 'dataStore']],
    ['offlineIntegration', ['networkAware', 'enhancedOfflineQueue', 'assetCache']],
    ['syncOrchestration', ['networkAware', 'enhancedOfflineQueue', 'offlineIntegration']],
    ['performanceMonitor', ['syncOrchestration', 'networkAware']]
  ]);
  
  // Initialization state
  private isInitialized = false;
  private isInitializing = false;
  private services = new Map<string, ServiceStatus>();
  private config: InitializationConfig;
  private startTime = 0;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Initialize the complete sync system
   */
  async initialize(config?: Partial<InitializationConfig>): Promise<InitializationResult> {
    if (this.isInitialized) {
      return this.getSuccessResult();
    }

    if (this.isInitializing) {
      throw new Error('Sync system is already initializing');
    }

    this.isInitializing = true;
    this.startTime = Date.now();
    
    try {
      // Merge configuration
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Load any persisted configuration
      await this.loadPersistedConfig();

      const result = await this.performInitialization();
      
      if (result.success) {
        this.isInitialized = true;
        await this.saveInitializationStatus(result);
      }

      return result;

    } catch (error) {
      return this.getErrorResult(error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Perform the actual initialization sequence
   */
  private async performInitialization(): Promise<InitializationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const services: ServiceStatus[] = [];

    // Initialize services in dependency order
    const initOrder = this.getInitializationOrder();
    
    for (const serviceName of initOrder) {
      try {
        const serviceResult = await this.initializeService(serviceName);
        services.push(serviceResult);
        
        if (!serviceResult.initialized && this.isServiceRequired(serviceName)) {
          errors.push(`Required service ${serviceName} failed to initialize: ${serviceResult.error}`);
        } else if (!serviceResult.initialized) {
          warnings.push(`Optional service ${serviceName} failed to initialize: ${serviceResult.error}`);
        }
        
      } catch (error) {
        const errorMsg = `Service ${serviceName} initialization threw exception: ${error.message}`;
        errors.push(errorMsg);
        
        services.push({
          name: serviceName,
          initialized: false,
          error: errorMsg,
          dependencies: this.serviceDependencies.get(serviceName) || []
        });
      }
    }

    // Validate system readiness
    const systemValidation = await this.validateSystemReadiness();
    errors.push(...systemValidation.errors);
    warnings.push(...systemValidation.warnings);

    const duration = Date.now() - this.startTime;
    const success = errors.length === 0;

    return {
      success,
      duration,
      services,
      errors,
      warnings,
      syncReady: systemValidation.syncReady,
      networkAvailable: systemValidation.networkAvailable,
      offlineCapable: systemValidation.offlineCapable
    };
  }

  /**
   * Initialize a specific service
   */
  private async initializeService(serviceName: string): Promise<ServiceStatus> {
    const startTime = Date.now();
    const dependencies = this.serviceDependencies.get(serviceName) || [];
    
    // Check dependencies are met
    for (const dep of dependencies) {
      const depService = this.services.get(dep);
      if (!depService?.initialized) {
        return {
          name: serviceName,
          initialized: false,
          error: `Dependency ${dep} not initialized`,
          dependencies
        };
      }
    }

    try {
      let initialized = false;
      
      switch (serviceName) {
        case 'networkAware':
          await networkAwareService.initialize();
          initialized = true;
          break;
          
        case 'assetCache':
          if (this.config.enableAssetCaching) {
            await assetCacheService.initialize();
            initialized = true;
          } else {
            initialized = true; // Skip if disabled
          }
          break;
          
        case 'resumableSession':
          if (this.config.enableResumableSessions) {
            await resumableSessionService.initialize();
            initialized = true;
          } else {
            initialized = true; // Skip if disabled
          }
          break;
          
        case 'enhancedOfflineQueue':
          await enhancedOfflineQueueService.initialize();
          initialized = true;
          break;
          
        case 'offlineIntegration':
          if (this.config.enableOfflineMode) {
            await offlineIntegrationService.initialize();
            initialized = true;
          } else {
            initialized = true; // Skip if disabled
          }
          break;
          
        case 'syncOrchestration':
          await syncOrchestrationService.initialize();
          initialized = true;
          break;
          
        case 'performanceMonitor':
          if (this.config.enablePerformanceMonitoring) {
            await syncPerformanceMonitor.initialize();
            initialized = true;
          } else {
            initialized = true; // Skip if disabled
          }
          break;
          
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }

      const endTime = Date.now();
      const status: ServiceStatus = {
        name: serviceName,
        initialized,
        startTime,
        endTime,
        dependencies
      };

      this.services.set(serviceName, status);
      return status;

    } catch (error) {
      const endTime = Date.now();
      const status: ServiceStatus = {
        name: serviceName,
        initialized: false,
        error: error.message,
        startTime,
        endTime,
        dependencies
      };

      this.services.set(serviceName, status);
      return status;
    }
  }

  /**
   * Validate system readiness after initialization
   */
  private async validateSystemReadiness(): Promise<{
    syncReady: boolean;
    networkAvailable: boolean;
    offlineCapable: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check sync orchestration readiness
    let syncReady = false;
    try {
      const syncState = syncOrchestrationService.getSyncState();
      syncReady = syncState.globalStatus !== SyncStatus.ERROR;
    } catch (error) {
      errors.push('Sync orchestration service not ready');
    }

    // Check network availability
    let networkAvailable = false;
    try {
      const networkState = await networkAwareService.getNetworkState();
      networkAvailable = networkState.isConnected;
      
      if (!networkAvailable) {
        warnings.push('No network connection available - operating in offline mode');
      }
    } catch (error) {
      warnings.push('Network state service not available');
    }

    // Check offline capabilities
    let offlineCapable = false;
    try {
      if (this.config.enableOfflineMode) {
        const offlineHealth = await offlineIntegrationService.getServiceHealth();
        offlineCapable = offlineHealth.isHealthy;
      } else {
        offlineCapable = true; // Not required if disabled
      }
    } catch (error) {
      if (this.config.enableOfflineMode) {
        warnings.push('Offline capabilities may be limited');
      }
    }

    // Clinical safety validation
    if (this.config.clinicalSafetyChecks) {
      try {
        // Validate critical services for clinical data
        const criticalServices = ['syncOrchestration', 'enhancedOfflineQueue'];
        for (const serviceName of criticalServices) {
          const service = this.services.get(serviceName);
          if (!service?.initialized) {
            errors.push(`Critical service ${serviceName} not available - clinical data safety at risk`);
          }
        }
      } catch (error) {
        errors.push('Clinical safety validation failed');
      }
    }

    return {
      syncReady,
      networkAvailable,
      offlineCapable,
      errors,
      warnings
    };
  }

  /**
   * Get initialization order based on dependencies
   */
  private getInitializationOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (serviceName: string) => {
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving ${serviceName}`);
      }
      
      if (visited.has(serviceName)) {
        return;
      }

      visiting.add(serviceName);
      
      const dependencies = this.serviceDependencies.get(serviceName) || [];
      for (const dep of dependencies) {
        visit(dep);
      }
      
      visiting.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
    };

    for (const serviceName of this.serviceDependencies.keys()) {
      visit(serviceName);
    }

    return order;
  }

  /**
   * Check if service is required for basic operation
   */
  private isServiceRequired(serviceName: string): boolean {
    const requiredServices = ['networkAware', 'enhancedOfflineQueue', 'syncOrchestration'];
    return requiredServices.includes(serviceName);
  }

  /**
   * Get default initialization configuration
   */
  private getDefaultConfig(): InitializationConfig {
    return {
      enablePerformanceMonitoring: true,
      enableOfflineMode: true,
      enableAssetCaching: true,
      enableResumableSessions: true,
      autoStartSync: true,
      timeoutMs: 30000,
      retryAttempts: 3,
      clinicalSafetyChecks: true
    };
  }

  /**
   * Load persisted configuration
   */
  private async loadPersistedConfig(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.INIT_CONFIG_KEY);
      if (configData) {
        const persistedConfig = JSON.parse(configData);
        this.config = { ...this.config, ...persistedConfig };
      }
    } catch (error) {
      console.warn('Failed to load persisted sync configuration:', error);
    }
  }

  /**
   * Save initialization status
   */
  private async saveInitializationStatus(result: InitializationResult): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SERVICE_STATUS_KEY, JSON.stringify({
        timestamp: new Date().toISOString(),
        result,
        config: this.config
      }));
    } catch (error) {
      console.warn('Failed to save initialization status:', error);
    }
  }

  /**
   * Get success result for already initialized system
   */
  private getSuccessResult(): InitializationResult {
    return {
      success: true,
      duration: 0,
      services: Array.from(this.services.values()),
      errors: [],
      warnings: [],
      syncReady: true,
      networkAvailable: true,
      offlineCapable: true
    };
  }

  /**
   * Get error result for failed initialization
   */
  private getErrorResult(error: Error): InitializationResult {
    return {
      success: false,
      duration: Date.now() - this.startTime,
      services: Array.from(this.services.values()),
      errors: [error.message],
      warnings: [],
      syncReady: false,
      networkAvailable: false,
      offlineCapable: false
    };
  }

  /**
   * Start automatic sync if configured
   */
  async startAutoSync(): Promise<void> {
    if (!this.isInitialized || !this.config.autoStartSync) {
      return;
    }

    try {
      await syncOrchestrationService.synchronize();
    } catch (error) {
      console.warn('Failed to start automatic sync:', error);
    }
  }

  /**
   * Get initialization status
   */
  getInitializationStatus(): {
    isInitialized: boolean;
    isInitializing: boolean;
    services: ServiceStatus[];
    config: InitializationConfig;
  } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      services: Array.from(this.services.values()),
      config: { ...this.config }
    };
  }

  /**
   * Update configuration and reinitialize if needed
   */
  async updateConfiguration(updates: Partial<InitializationConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    
    // Save updated configuration
    try {
      await AsyncStorage.setItem(this.INIT_CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save updated configuration:', error);
    }
  }

  /**
   * Shutdown the sync system
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    const shutdownOrder = this.getInitializationOrder().reverse();
    
    for (const serviceName of shutdownOrder) {
      try {
        switch (serviceName) {
          case 'performanceMonitor':
            await syncPerformanceMonitor.shutdown();
            break;
          case 'syncOrchestration':
            await syncOrchestrationService.shutdown();
            break;
          case 'enhancedOfflineQueue':
            await enhancedOfflineQueueService.shutdown();
            break;
          // Other services would be shut down here
        }
      } catch (error) {
        console.warn(`Failed to shutdown ${serviceName}:`, error);
      }
    }

    this.isInitialized = false;
    this.services.clear();
  }

  /**
   * Health check for the entire sync system
   */
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    services: Array<{ name: string; status: 'healthy' | 'degraded' | 'critical' }>;
    recommendations: string[];
  }> {
    const serviceHealth: Array<{ name: string; status: 'healthy' | 'degraded' | 'critical' }> = [];
    const recommendations: string[] = [];
    
    for (const [serviceName, serviceStatus] of this.services.entries()) {
      if (!serviceStatus.initialized) {
        serviceHealth.push({ name: serviceName, status: 'critical' });
        recommendations.push(`Reinitialize ${serviceName} service`);
      } else {
        serviceHealth.push({ name: serviceName, status: 'healthy' });
      }
    }

    // Check sync orchestration health
    try {
      const syncState = syncOrchestrationService.getSyncState();
      if (syncState.globalStatus === SyncStatus.ERROR) {
        serviceHealth.push({ name: 'sync', status: 'critical' });
        recommendations.push('Investigate sync errors and resolve conflicts');
      }
    } catch (error) {
      serviceHealth.push({ name: 'sync', status: 'critical' });
      recommendations.push('Sync orchestration service is not responding');
    }

    // Determine overall health
    const criticalCount = serviceHealth.filter(s => s.status === 'critical').length;
    const degradedCount = serviceHealth.filter(s => s.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      services: serviceHealth,
      recommendations
    };
  }
}


// Export singleton instance
export const syncInitializationService = new SyncInitializationService();