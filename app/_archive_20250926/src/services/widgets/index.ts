/**
 * Widget Services Index
 * Centralized export for all widget integration components
 * Production-ready TypeScript bridge for Being. MBCT App
 */

// Core Services
export { WidgetDataService } from '../WidgetDataService';
export { widgetNativeBridge, WidgetNativeBridgeService } from '../WidgetNativeBridge';
export { widgetIntegrationCoordinator, WidgetIntegrationCoordinator } from '../WidgetIntegrationCoordinator';
export { NavigationService } from '../NavigationService';

// Store Integration
export { widgetStoreIntegration } from '../../store/widgetIntegration';
export { useCheckInStoreWithWidgets, enhanceCheckInStoreWithWidgets } from '../../store/widgetIntegration';

// Hooks
export { 
  useWidgetIntegration,
  useSimpleWidgetIntegration,
  useMinimalWidgetIntegration,
  useCrisisAwareWidgetIntegration,
  useTestableWidgetIntegration
} from '../../hooks/useWidgetIntegration';

// Types
export type {
  WidgetData,
  WidgetSessionStatus,
  WidgetTodayProgress,
  WidgetNativeBridge,
  WidgetBridgeError,
  WidgetUpdateTrigger,
  WidgetConfiguration,
  PrivacyValidationResult,
  PrivacyViolation,
  WidgetTypeGuards,
  CheckInType,
  WidgetSafeData,
  DeepReadonly,
  WidgetDeepLinkParams,
  CheckInDeepLinkParams,
  CrisisDeepLinkParams,
  CrisisTrigger,
  PrivacyFilter,
  WidgetUpdateSource,
  WidgetUpdateReason,
  WidgetUpdatePriority,
  WidgetErrorCode,
  WidgetPrivacyLevel,
  WidgetFeature,
  WidgetStoreIntegration,
  WidgetUpdateCallback,
  WidgetProgressCallback,
  WidgetEventCallback,
  WidgetEvent,
  WidgetEventType,
  SafeForWidget,
  PrivacyCompliant,
  UseWidgetIntegrationOptions,
  UseWidgetIntegrationReturn,
  WidgetTestingUtils,
  WidgetPerformanceMetrics,
  WidgetPerformanceTracker
} from '../../types/widget';

// Test Utilities
export { 
  widgetTestUtils,
  widgetTestAssertions,
  widgetTestScenarios,
  widgetPerformanceTestUtils,
  WidgetTestAssertions,
  WidgetTestScenarios,
  WidgetPerformanceTestUtils
} from '../../utils/widgetTestUtils';

// Constants and Configurations
export const WIDGET_CONFIG = {
  UPDATE_FREQUENCIES: {
    REALTIME: 60000, // 1 minute
    FREQUENT: 300000, // 5 minutes  
    NORMAL: 900000, // 15 minutes
    MINIMAL: 3600000, // 1 hour
  },
  PRIVACY_LEVELS: {
    MINIMAL: 'minimal',
    STANDARD: 'standard', 
    ENHANCED: 'enhanced',
  },
  DEEP_LINK_SCHEME: 'being',
  PERFORMANCE_THRESHOLDS: {
    ACCEPTABLE_LATENCY_MS: 1000,
    WARNING_LATENCY_MS: 2000,
    CRITICAL_LATENCY_MS: 5000,
  },
} as const;

/**
 * Widget Integration Factory
 * Creates configured widget integration instances
 */
export class WidgetIntegrationFactory {
  
  /**
   * Create standard widget integration for production use
   */
  static createStandard() {
    return new WidgetIntegrationCoordinator({
      autoInitialize: true,
      healthCheckIntervalMs: 300000, // 5 minutes
      performanceMonitoring: true,
      privacyAuditLevel: 'clinical',
      errorRecoveryEnabled: true,
      deepLinkHandlingEnabled: true
    });
  }

  /**
   * Create minimal widget integration for testing
   */
  static createMinimal() {
    return new WidgetIntegrationCoordinator({
      autoInitialize: false,
      healthCheckIntervalMs: 0,
      performanceMonitoring: false,
      privacyAuditLevel: 'standard',
      errorRecoveryEnabled: false,
      deepLinkHandlingEnabled: false
    });
  }

  /**
   * Create enhanced widget integration for debugging
   */
  static createEnhanced() {
    return new WidgetIntegrationCoordinator({
      autoInitialize: true,
      healthCheckIntervalMs: 60000, // 1 minute
      performanceMonitoring: true,
      privacyAuditLevel: 'clinical',
      errorRecoveryEnabled: true,
      deepLinkHandlingEnabled: true
    });
  }
}

/**
 * Widget Integration Utilities
 * Helper functions for common widget operations
 */
export class WidgetIntegrationUtils {
  
  /**
   * Initialize widget integration for app startup
   */
  static async initializeForApp(): Promise<void> {
    try {
      await widgetIntegrationCoordinator.initialize();
      console.log('Widget integration initialized for app');
    } catch (error) {
      console.error('Failed to initialize widget integration:', error);
    }
  }

  /**
   * Cleanup widget integration for app shutdown
   */
  static cleanup(): void {
    try {
      widgetIntegrationCoordinator.dispose();
      widgetNativeBridge.dispose();
      console.log('Widget integration cleaned up');
    } catch (error) {
      console.error('Failed to cleanup widget integration:', error);
    }
  }

  /**
   * Validate widget data for privacy compliance
   */
  static validatePrivacy(data: unknown): boolean {
    return !widgetTestUtils.validatePrivacy(data).violations.length;
  }

  /**
   * Get widget integration health status
   */
  static getHealthStatus() {
    return widgetIntegrationCoordinator.getIntegrationStatus();
  }

  /**
   * Force immediate widget update
   */
  static async forceUpdate(): Promise<void> {
    await widgetIntegrationCoordinator.forceUpdate();
  }

  /**
   * Handle external deep link
   */
  static async handleDeepLink(url: string): Promise<void> {
    await widgetIntegrationCoordinator.handleDeepLink(url);
  }
}

/**
 * Widget Integration Status Monitor
 * Real-time monitoring utilities for widget health
 */
export class WidgetStatusMonitor {
  private static listeners: Array<(status: any) => void> = [];
  private static isMonitoring: boolean = false;
  
  /**
   * Start monitoring widget integration status
   */
  static startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    const monitor = setInterval(() => {
      const status = WidgetIntegrationUtils.getHealthStatus();
      this.notifyListeners(status);
    }, intervalMs);
    
    // Store interval for cleanup
    (globalThis as any).__widgetStatusMonitorInterval = monitor;
  }
  
  /**
   * Stop monitoring
   */
  static stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    const interval = (globalThis as any).__widgetStatusMonitorInterval;
    if (interval) {
      clearInterval(interval);
      delete (globalThis as any).__widgetStatusMonitorInterval;
    }
    
    this.isMonitoring = false;
    this.listeners = [];
  }
  
  /**
   * Add status change listener
   */
  static addListener(listener: (status: any) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  private static notifyListeners(status: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Widget status listener error:', error);
      }
    });
  }
}

// Default export
export default {
  // Main coordinator
  coordinator: widgetIntegrationCoordinator,
  
  // Core services
  dataService: WidgetDataService,
  nativeBridge: widgetNativeBridge,
  navigationService: NavigationService,
  
  // Store integration
  storeIntegration: widgetStoreIntegration,
  
  // Utilities
  utils: WidgetIntegrationUtils,
  factory: WidgetIntegrationFactory,
  monitor: WidgetStatusMonitor,
  testUtils: widgetTestUtils,
  
  // Configuration
  config: WIDGET_CONFIG,
};