/**
 * Widget Integration Coordinator
 * Master coordinator for all widget functionality with clinical-grade safety
 * Orchestrates data flow, privacy validation, and error handling across all widget components
 */

import { AppState, AppStateStatus } from 'react-native';
import { useCheckInStore } from '../store/checkInStore';
import { widgetStoreIntegration } from '../store/widgetIntegration';
import { WidgetDataService } from './WidgetDataService';
import { widgetNativeBridge } from './WidgetNativeBridge';
import { NavigationService } from './NavigationService';
import {
  WidgetData,
  WidgetBridgeError,
  WidgetUpdateTrigger,
  WidgetConfiguration,
  PrivacyValidationResult,
  WidgetPerformanceMetrics,
  DeepReadonly,
  CheckInType
} from '../types/widget';

/**
 * Widget Integration Status
 */
interface WidgetIntegrationStatus {
  readonly isInitialized: boolean;
  readonly isHealthy: boolean;
  readonly lastUpdate: string | null;
  readonly currentError: WidgetBridgeError | null;
  readonly performanceMetrics: WidgetPerformanceMetrics;
  readonly privacyCompliant: boolean;
}

/**
 * Widget Integration Configuration
 */
interface WidgetIntegrationConfig {
  readonly autoInitialize: boolean;
  readonly healthCheckIntervalMs: number;
  readonly performanceMonitoring: boolean;
  readonly privacyAuditLevel: 'standard' | 'enhanced' | 'clinical';
  readonly errorRecoveryEnabled: boolean;
  readonly deepLinkHandlingEnabled: boolean;
}

const defaultConfig: WidgetIntegrationConfig = {
  autoInitialize: true,
  healthCheckIntervalMs: 300000, // 5 minutes
  performanceMonitoring: true,
  privacyAuditLevel: 'clinical',
  errorRecoveryEnabled: true,
  deepLinkHandlingEnabled: true
};

/**
 * Master Widget Integration Coordinator
 */
export class WidgetIntegrationCoordinator {
  private config: WidgetIntegrationConfig;
  private widgetDataService: WidgetDataService;
  private isInitialized: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private storeUnsubscribe: (() => void) | null = null;
  
  // State tracking
  private currentError: WidgetBridgeError | null = null;
  private lastSuccessfulUpdate: string | null = null;
  private integrationStatus: WidgetIntegrationStatus;
  
  // Deep link handling
  private deepLinkQueue: string[] = [];
  private isProcessingDeepLink: boolean = false;

  constructor(config: Partial<WidgetIntegrationConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.widgetDataService = new WidgetDataService();
    
    this.integrationStatus = {
      isInitialized: false,
      isHealthy: false,
      lastUpdate: null,
      currentError: null,
      performanceMetrics: {
        updateLatencyMs: 0,
        nativeCallLatencyMs: 0,
        dataSerializationMs: 0,
        privacyValidationMs: 0,
        totalOperationMs: 0
      },
      privacyCompliant: true
    };

    if (this.config.autoInitialize) {
      this.initialize();
    }
  }

  /**
   * Initialize the complete widget integration system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Widget integration already initialized');
      return;
    }

    try {
      console.log('Initializing widget integration coordinator...');
      
      // Initialize core components
      widgetStoreIntegration.initialize();
      
      // Setup store subscriptions
      this.setupStoreSubscriptions();
      
      // Setup app state monitoring
      this.setupAppStateMonitoring();
      
      // Setup deep link handling
      if (this.config.deepLinkHandlingEnabled) {
        this.setupDeepLinkHandling();
      }
      
      // Start health monitoring
      if (this.config.healthCheckIntervalMs > 0) {
        this.startHealthMonitoring();
      }
      
      // Perform initial widget data update
      await this.performInitialUpdate();
      
      this.isInitialized = true;
      this.updateIntegrationStatus({
        isInitialized: true,
        isHealthy: true,
        currentError: null
      });
      
      console.log('Widget integration coordinator initialized successfully');
      
    } catch (error) {
      const bridgeError = error instanceof WidgetBridgeError 
        ? error 
        : new WidgetBridgeError(
            'Widget integration initialization failed',
            'NATIVE_MODULE_NOT_AVAILABLE',
            error
          );
      
      this.currentError = bridgeError;
      this.updateIntegrationStatus({
        isInitialized: false,
        isHealthy: false,
        currentError: bridgeError
      });
      
      console.error('Widget integration initialization failed:', bridgeError);
      
      if (this.config.errorRecoveryEnabled) {
        this.scheduleRecoveryAttempt();
      }
    }
  }

  /**
   * Setup store subscriptions for widget updates
   */
  private setupStoreSubscriptions(): void {
    this.storeUnsubscribe = useCheckInStore.subscribe((state, prevState) => {
      this.handleStoreStateChange(state, prevState);
    });
    
    // Subscribe to widget-specific events
    widgetStoreIntegration.subscribeToCheckInUpdates(this.handleWidgetUpdate.bind(this));
    widgetStoreIntegration.subscribeToSessionProgress(this.handleProgressUpdate.bind(this));
    widgetStoreIntegration.subscribeToUserEvents(this.handleUserEvent.bind(this));
  }

  /**
   * Setup app state monitoring
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Setup deep link handling
   */
  private setupDeepLinkHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('widgetDeepLink', this.handleDeepLinkEvent.bind(this));
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Handle store state changes
   */
  private async handleStoreStateChange(state: any, prevState: any): Promise<void> {
    try {
      // Check if widget data needs updating
      const widgetStatus = state.getWidgetUpdateStatus?.();
      
      if (widgetStatus?.needsUpdate) {
        const trigger: WidgetUpdateTrigger = {
          source: 'manual_refresh',
          reason: 'data_refresh',
          timestamp: new Date().toISOString(),
          priority: 'normal'
        };
        
        await this.triggerWidgetUpdate(trigger);
      }
      
    } catch (error) {
      console.error('Error handling store state change:', error);
    }
  }

  /**
   * Handle widget update triggers
   */
  private async handleWidgetUpdate(trigger: WidgetUpdateTrigger): Promise<void> {
    try {
      await this.widgetDataService.updateWidgetData(trigger);
      this.lastSuccessfulUpdate = new Date().toISOString();
      this.clearError();
      
    } catch (error) {
      const bridgeError = error instanceof WidgetBridgeError 
        ? error 
        : new WidgetBridgeError(
            'Widget update failed in coordinator',
            'UPDATE_THROTTLED',
            error
          );
      
      this.setError(bridgeError);
      
      if (this.config.errorRecoveryEnabled) {
        this.scheduleRetry(() => this.handleWidgetUpdate(trigger));
      }
    }
  }

  /**
   * Handle progress updates
   */
  private handleProgressUpdate(progress: any): void {
    // Progress updates are handled internally by the widget data service
    console.log('Widget progress updated:', progress);
  }

  /**
   * Handle user events
   */
  private handleUserEvent(event: any): void {
    console.log('Widget user event:', event);
    
    // Handle crisis events with high priority
    if (event.type === 'crisis_mode_activated') {
      const crisisTrigger: WidgetUpdateTrigger = {
        source: 'crisis_mode_changed',
        reason: 'crisis_alert',
        timestamp: new Date().toISOString(),
        priority: 'critical'
      };
      
      this.triggerWidgetUpdate(crisisTrigger);
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      // App became active - update widgets
      const trigger: WidgetUpdateTrigger = {
        source: 'app_foreground',
        reason: 'data_refresh',
        timestamp: new Date().toISOString(),
        priority: 'normal'
      };
      
      this.triggerWidgetUpdate(trigger);
    }
  }

  /**
   * Handle deep link events
   */
  private handleDeepLinkEvent(event: CustomEvent): void {
    const { url } = event.detail;
    this.queueDeepLink(url);
  }

  /**
   * Queue deep link for processing
   */
  private queueDeepLink(url: string): void {
    this.deepLinkQueue.push(url);
    this.processDeepLinkQueue();
  }

  /**
   * Process queued deep links
   */
  private async processDeepLinkQueue(): Promise<void> {
    if (this.isProcessingDeepLink || this.deepLinkQueue.length === 0) {
      return;
    }

    this.isProcessingDeepLink = true;

    try {
      while (this.deepLinkQueue.length > 0) {
        const url = this.deepLinkQueue.shift();
        if (url) {
          await this.widgetDataService.handleWidgetDeepLink(url);
          
          // Small delay to prevent overwhelming the navigation system
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Deep link processing failed:', error);
    } finally {
      this.isProcessingDeepLink = false;
    }
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<boolean> {
    try {
      // Check native bridge health
      const nativeBridgeHealthy = await widgetNativeBridge.performHealthCheck();
      
      // Check widget data service health
      const currentData = await this.widgetDataService.getCurrentWidgetData();
      const dataServiceHealthy = currentData !== null;
      
      // Check privacy compliance
      let privacyCompliant = true;
      if (currentData) {
        const privacyResult = this.validateDataPrivacy(currentData);
        privacyCompliant = privacyResult.isValid;
      }
      
      const isHealthy = nativeBridgeHealthy && dataServiceHealthy && privacyCompliant;
      
      this.updateIntegrationStatus({
        isHealthy,
        privacyCompliant,
        performanceMetrics: widgetNativeBridge.getAveragePerformanceMetrics()
      });
      
      if (!isHealthy) {
        console.warn('Widget integration health check failed');
        
        if (this.config.errorRecoveryEnabled) {
          this.scheduleRecoveryAttempt();
        }
      }
      
      return isHealthy;
      
    } catch (error) {
      console.error('Health check failed:', error);
      this.updateIntegrationStatus({ isHealthy: false });
      return false;
    }
  }

  /**
   * Validate data privacy compliance
   */
  private validateDataPrivacy(data: WidgetData): PrivacyValidationResult {
    // Use the widget data service's privacy validation
    const widgetDataService = this.widgetDataService as any;
    return widgetDataService.validatePrivacy(data);
  }

  /**
   * Perform initial widget data update
   */
  private async performInitialUpdate(): Promise<void> {
    const trigger: WidgetUpdateTrigger = {
      source: 'manual_refresh',
      reason: 'data_refresh',
      timestamp: new Date().toISOString(),
      priority: 'high'
    };
    
    await this.triggerWidgetUpdate(trigger);
  }

  /**
   * Trigger widget update with error handling
   */
  private async triggerWidgetUpdate(trigger: WidgetUpdateTrigger): Promise<void> {
    try {
      await this.widgetDataService.updateWidgetData(trigger);
      this.lastSuccessfulUpdate = new Date().toISOString();
      this.clearError();
      
      this.updateIntegrationStatus({
        lastUpdate: this.lastSuccessfulUpdate,
        currentError: null
      });
      
    } catch (error) {
      const bridgeError = error instanceof WidgetBridgeError 
        ? error 
        : new WidgetBridgeError(
            'Widget update failed in coordinator',
            'UPDATE_THROTTLED',
            error
          );
      
      this.setError(bridgeError);
    }
  }

  /**
   * Schedule error recovery attempt
   */
  private scheduleRecoveryAttempt(): void {
    const backoffMs = 5000 + Math.random() * 5000; // 5-10 seconds
    
    setTimeout(async () => {
      if (this.currentError) {
        console.log('Attempting widget integration recovery...');
        await this.initialize();
      }
    }, backoffMs);
  }

  /**
   * Schedule retry for failed operations
   */
  private scheduleRetry(operation: () => Promise<void>): void {
    const retryDelayMs = 2000 + Math.random() * 3000; // 2-5 seconds
    
    setTimeout(async () => {
      try {
        await operation();
      } catch (error) {
        console.error('Retry operation failed:', error);
      }
    }, retryDelayMs);
  }

  /**
   * Update integration status
   */
  private updateIntegrationStatus(updates: Partial<WidgetIntegrationStatus>): void {
    this.integrationStatus = {
      ...this.integrationStatus,
      ...updates
    };
  }

  /**
   * Set current error
   */
  private setError(error: WidgetBridgeError): void {
    this.currentError = error;
    this.updateIntegrationStatus({ currentError: error });
  }

  /**
   * Clear current error
   */
  private clearError(): void {
    this.currentError = null;
    this.updateIntegrationStatus({ currentError: null });
  }

  // Public API Methods

  /**
   * Get current integration status
   */
  public getIntegrationStatus(): DeepReadonly<WidgetIntegrationStatus> {
    return Object.freeze({ ...this.integrationStatus }) as DeepReadonly<WidgetIntegrationStatus>;
  }

  /**
   * Force widget data update
   */
  public async forceUpdate(): Promise<void> {
    const trigger: WidgetUpdateTrigger = {
      source: 'manual_refresh',
      reason: 'data_refresh',
      timestamp: new Date().toISOString(),
      priority: 'high'
    };
    
    await this.triggerWidgetUpdate(trigger);
  }

  /**
   * Handle external deep link
   */
  public async handleDeepLink(url: string): Promise<void> {
    this.queueDeepLink(url);
  }

  /**
   * Get widget configuration
   */
  public getConfiguration(): DeepReadonly<WidgetIntegrationConfig> {
    return Object.freeze({ ...this.config }) as DeepReadonly<WidgetIntegrationConfig>;
  }

  /**
   * Update configuration
   */
  public updateConfiguration(updates: Partial<WidgetIntegrationConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('Widget integration configuration updated:', updates);
  }

  /**
   * Dispose and cleanup resources
   */
  public dispose(): void {
    // Clear timers
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Remove subscriptions
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('widgetDeepLink', this.handleDeepLinkEvent.bind(this));
    }

    // Dispose native bridge
    widgetNativeBridge.dispose();

    this.isInitialized = false;
    this.updateIntegrationStatus({
      isInitialized: false,
      isHealthy: false
    });

    console.log('Widget integration coordinator disposed');
  }
}

// Export singleton instance
export const widgetIntegrationCoordinator = new WidgetIntegrationCoordinator();