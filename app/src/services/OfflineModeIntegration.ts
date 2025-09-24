/**
 * Enhanced OfflineModeIntegration - Comprehensive offline mode orchestration
 * Now integrates with enhanced offline services for clinical-grade reliability
 * Provides backward compatibility while leveraging new advanced features
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { assetCacheService, AssetPriority, AssetType } from './AssetCacheService';
import { resumableSessionService } from './ResumableSessionService';
import { widgetDataService } from './WidgetDataService';
import { offlineIntegrationService } from './OfflineIntegrationService';
import { networkAwareService } from './NetworkAwareService';
import { offlineQueueService as enhancedOfflineQueueService } from './OfflineQueueService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OfflineActionType,
  OfflinePriority,
  NetworkQuality,
  OfflineOperationResult,
  ClinicalSafetyHelpers
} from '../types/offline';

/**
 * Offline mode status
 */
export interface OfflineModeStatus {
  isOffline: boolean;
  isInitialized: boolean;
  criticalAssetsReady: boolean;
  queueSize: number;
  activeSessions: number;
  cacheHealth: 'healthy' | 'degraded' | 'critical';
  lastSync: string | null;
  performance: {
    assetLoadTime: number;
    dataAccessTime: number;
    syncLatency: number;
  };
}

/**
 * Sync configuration for different network conditions
 */
interface SyncStrategy {
  priority: 'immediate' | 'background' | 'deferred';
  batchSize: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

class OfflineModeIntegrationService {
  private readonly STATUS_KEY = 'being_offline_status';
  private readonly SYNC_LOG_KEY = 'being_sync_log';
  
  private isInitialized = false;
  private currentNetworkState: NetInfoState | null = null;
  private appState: AppStateStatus = 'active';
  private syncTimer: NodeJS.Timeout | null = null;
  private performanceMetrics = {
    assetLoadTime: 0,
    dataAccessTime: 0,
    syncLatency: 0
  };
  
  private listeners = new Map<string, Set<(status: OfflineModeStatus) => void>>();

  /**
   * Essential assets for offline functionality
   */
  private readonly ESSENTIAL_ASSETS = [
    // Crisis resources (highest priority)
    { path: 'crisis/hotline.json', type: AssetType.CRISIS_RESOURCE, priority: AssetPriority.CRITICAL },
    { path: 'crisis/emergency_plan.json', type: AssetType.CRISIS_RESOURCE, priority: AssetPriority.CRITICAL },
    { path: 'crisis/safety_resources.json', type: AssetType.CRISIS_RESOURCE, priority: AssetPriority.CRITICAL },
    
    // Assessment tools
    { path: 'assessments/phq9_complete.json', type: AssetType.ASSESSMENT_TOOL, priority: AssetPriority.CRITICAL },
    { path: 'assessments/gad7_complete.json', type: AssetType.ASSESSMENT_TOOL, priority: AssetPriority.CRITICAL },
    
    // Core therapeutic content
    { path: 'breathing/3min_exercise.json', type: AssetType.THERAPEUTIC_CONTENT, priority: AssetPriority.HIGH },
    { path: 'breathing/timer_sounds.mp3', type: AssetType.AUDIO_GUIDANCE, priority: AssetPriority.HIGH },
    { path: 'checkin/morning_prompts.json', type: AssetType.THERAPEUTIC_CONTENT, priority: AssetPriority.HIGH },
    { path: 'checkin/midday_prompts.json', type: AssetType.THERAPEUTIC_CONTENT, priority: AssetPriority.HIGH },
    { path: 'checkin/evening_prompts.json', type: AssetType.THERAPEUTIC_CONTENT, priority: AssetPriority.HIGH },
    
    // UI components
    { path: 'ui/crisis_button.png', type: AssetType.UI_COMPONENT, priority: AssetPriority.CRITICAL },
    { path: 'ui/breathing_circle.json', type: AssetType.ANIMATION, priority: AssetPriority.HIGH },
    { path: 'ui/icons_set.json', type: AssetType.UI_COMPONENT, priority: AssetPriority.MEDIUM }
  ];

  constructor() {
    this.initialize();
  }

  /**
   * Enhanced offline operation with clinical safety
   */
  async performEnhancedOfflineOperation(
    action: OfflineActionType,
    data: any,
    options: {
      priority?: OfflinePriority;
      clinicalValidation?: boolean;
      retryOnFailure?: boolean;
    } = {}
  ): Promise<OfflineOperationResult> {
    try {
      // Determine clinical priority if not specified
      const priority = options.priority || ClinicalSafetyHelpers.getClinicalPriority(action);
      
      // Use enhanced integration service for clinical-grade operations
      return await offlineIntegrationService.performOfflineOperation(action, data, {
        priority,
        clinicalValidation: options.clinicalValidation ?? ClinicalSafetyHelpers.containsCrisisData(data),
        retryOnFailure: options.retryOnFailure ?? true
      });
    } catch (error) {
      console.error('Enhanced offline operation failed:', error);
      
      // Fallback to legacy queue for compatibility
      await offlineQueueService.queueAction(
        action as 'save_checkin' | 'save_assessment' | 'update_user',
        data
      );
      
      return {
        success: true,
        queuedForLater: true,
        metadata: {
          operationId: `fallback_${Date.now()}`,
          timestamp: new Date().toISOString(),
          executionTime: 0,
          networkQuality: NetworkQuality.OFFLINE,
          offline: true
        }
      };
    }
  }

  /**
   * Enhanced sync with network quality awareness
   */
  async performEnhancedSync(): Promise<{ success: boolean; details: any }> {
    try {
      // Check if enhanced integration is ready
      const initStatus = await offlineIntegrationService.initialize();
      
      if (initStatus.allReady) {
        // Use enhanced sync
        const result = await offlineIntegrationService.performComprehensiveSync();
        return {
          success: result.success,
          details: {
            processed: result.processed,
            failed: result.failed,
            duration: result.duration,
            networkQuality: result.networkQuality,
            recommendations: result.recommendations
          }
        };
      } else {
        // Fallback to legacy sync
        return await this.legacySync();
      }
    } catch (error) {
      console.error('Enhanced sync failed, falling back to legacy:', error);
      return await this.legacySync();
    }
  }

  /**
   * Legacy sync method for backward compatibility
   */
  private async legacySync(): Promise<{ success: boolean; details: any }> {
    try {
      await this.handleNetworkRestored();
      return {
        success: true,
        details: {
          processed: 'unknown',
          failed: 0,
          duration: this.performanceMetrics.syncLatency,
          networkQuality: 'unknown',
          recommendations: []
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Legacy sync failed'
        }
      };
    }
  }

  /**
   * Get enhanced offline status with clinical context
   */
  async getEnhancedStatus(): Promise<OfflineModeStatus & {
    networkQuality: NetworkQuality;
    criticalDataPending: boolean;
    crisisDataPending: boolean;
    clinicalSafetyStatus: 'secure' | 'at_risk' | 'compromised';
  }> {
    try {
      // Get enhanced status if available
      const enhancedStatus = await offlineIntegrationService.getOfflineStatus();
      const legacyStatus = await this.getStatus();
      
      return {
        ...legacyStatus,
        networkQuality: enhancedStatus.networkQuality,
        criticalDataPending: enhancedStatus.criticalActionsPending,
        crisisDataPending: enhancedStatus.crisisDataPending,
        clinicalSafetyStatus: enhancedStatus.crisisDataPending ? 'at_risk' : 'secure'
      };
    } catch (error) {
      console.error('Enhanced status failed, using legacy:', error);
      const legacyStatus = await this.getStatus();
      return {
        ...legacyStatus,
        networkQuality: NetworkQuality.OFFLINE,
        criticalDataPending: false,
        crisisDataPending: false,
        clinicalSafetyStatus: 'secure'
      };
    }
  }

  /**
   * Initialize offline mode integration with enhanced services
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing enhanced offline mode integration...');
      
      // Initialize enhanced services first
      try {
        const enhancedInitStatus = await offlineIntegrationService.initialize();
        if (enhancedInitStatus.allReady) {
          console.log('✓ Enhanced offline services initialized');
        } else {
          console.warn('Enhanced services partially initialized:', enhancedInitStatus.errors);
        }
      } catch (error) {
        console.warn('Enhanced services failed to initialize, using legacy mode:', error);
      }
      
      // Setup network monitoring (enhanced)
      this.setupEnhancedNetworkMonitoring();
      
      // Setup app state monitoring
      this.setupAppStateMonitoring();
      
      // Load essential assets
      await this.loadEssentialAssets();
      
      // Initialize sync strategy
      await this.initializeSyncStrategy();
      
      // Validate offline readiness
      const ready = await this.validateOfflineReadiness();
      
      this.isInitialized = true;
      
      // Notify listeners of initial status
      this.notifyStatusChange();
      
      console.log(`Enhanced offline mode initialized. Ready: ${ready}`);
    } catch (error) {
      console.error('Failed to initialize enhanced offline mode:', error);
      // Continue with degraded functionality
      this.isInitialized = true;
    }
  }

  /**
   * Setup enhanced network monitoring with quality awareness
   */
  private setupEnhancedNetworkMonitoring(): void {
    // Try to use enhanced network monitoring
    try {
      networkAwareService.addNetworkListener(async (enhancedState) => {
        // Update legacy state for compatibility
        this.currentNetworkState = {
          isConnected: enhancedState.isConnected,
          isInternetReachable: enhancedState.isInternetReachable,
          type: enhancedState.type
        } as NetInfoState;
        
        // Handle enhanced state changes
        const wasOffline = !enhancedState.isConnected;
        const isNowOnline = enhancedState.isConnected;
        
        if (wasOffline && isNowOnline) {
          console.log(`Enhanced network restored - Quality: ${enhancedState.quality}`);
          await this.handleEnhancedNetworkRestored(enhancedState);
        } else if (!wasOffline && !isNowOnline) {
          console.log('Enhanced network lost - entering advanced offline mode');
          await this.handleEnhancedNetworkLost();
        }
        
        this.notifyStatusChange();
      });
    } catch (error) {
      console.warn('Enhanced network monitoring failed, using legacy:', error);
      this.setupNetworkMonitoring(); // Fallback to legacy
    }
  }

  /**
   * Handle enhanced network restoration with quality awareness
   */
  private async handleEnhancedNetworkRestored(networkState: any): Promise<void> {
    console.log(`Enhanced network restored - Quality: ${networkState.quality}`);
    
    const startTime = Date.now();
    
    try {
      // Use enhanced sync if network quality is sufficient
      if (networkState.quality !== NetworkQuality.POOR) {
        const syncResult = await offlineIntegrationService.performComprehensiveSync();
        
        this.performanceMetrics.syncLatency = syncResult.duration;
        
        if (syncResult.success) {
          await this.recordSyncEvent('success', syncResult.duration);
          console.log(`Enhanced sync completed: ${syncResult.processed} processed, ${syncResult.failed} failed`);
        } else {
          await this.recordSyncEvent('failed', syncResult.duration);
          console.warn('Enhanced sync had issues:', syncResult.recommendations);
        }
      } else {
        // Poor quality - use critical-only sync
        console.log('Poor network quality - attempting critical data sync only');
        const emergencyResult = await offlineIntegrationService.performEmergencySync();
        
        this.performanceMetrics.syncLatency = emergencyResult.duration;
        await this.recordSyncEvent(emergencyResult.success ? 'success' : 'failed', emergencyResult.duration);
      }
      
      // Update sync time
      await this.updateLastSyncTime();
      
    } catch (error) {
      console.error('Enhanced sync failed, falling back to legacy:', error);
      await this.handleNetworkRestored(); // Legacy fallback
    }
  }

  /**
   * Handle enhanced network loss with asset validation
   */
  private async handleEnhancedNetworkLost(): Promise<void> {
    console.log('Entering enhanced offline mode');
    
    try {
      // Validate critical assets are available
      const validation = await assetCacheService.validateCache();
      
      if (!validation.valid) {
        console.warn('Cache validation failed in enhanced offline mode:', validation.errors);
        await this.recoverCriticalAssets();
      }
      
      // Check for critical data that needs immediate sync when network returns
      const offlineStatus = await offlineIntegrationService.getOfflineStatus();
      
      if (offlineStatus.crisisDataPending) {
        console.warn('CRITICAL: Crisis data pending sync - will prioritize when network returns');
      }
      
    } catch (error) {
      console.error('Enhanced offline mode setup failed:', error);
      await this.handleNetworkLost(); // Legacy fallback
    }
    
    this.notifyStatusChange();
  }

  /**
   * Setup network state monitoring
   */
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = this.currentNetworkState && !this.currentNetworkState.isConnected;
      const isNowOnline = state.isConnected && state.isInternetReachable;
      
      this.currentNetworkState = state;
      
      // Handle network state changes
      if (wasOffline && isNowOnline) {
        console.log('Network restored - initiating sync');
        this.handleNetworkRestored();
      } else if (!wasOffline && !isNowOnline) {
        console.log('Network lost - entering offline mode');
        this.handleNetworkLost();
      }
      
      this.notifyStatusChange();
    });
  }

  /**
   * Setup app state monitoring
   */
  private setupAppStateMonitoring(): void {
    AppState.addEventListener('change', nextAppState => {
      const wasBackground = this.appState.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';
      
      this.appState = nextAppState;
      
      if (wasBackground && isNowActive) {
        console.log('App became active - checking offline status');
        this.handleAppBecameActive();
      } else if (!wasBackground && !isNowActive) {
        console.log('App entering background - saving state');
        this.handleAppEnteringBackground();
      }
    });
  }

  /**
   * Load essential assets for offline mode
   */
  private async loadEssentialAssets(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Preload all essential assets
      await assetCacheService.preloadAssets(this.ESSENTIAL_ASSETS);
      
      this.performanceMetrics.assetLoadTime = Date.now() - startTime;
      
      console.log(`Essential assets loaded in ${this.performanceMetrics.assetLoadTime}ms`);
    } catch (error) {
      console.error('Failed to load essential assets:', error);
      // Continue with partial assets
    }
  }

  /**
   * Initialize sync strategy based on network conditions
   */
  private async initializeSyncStrategy(): Promise<void> {
    // Load last sync status
    const lastSync = await this.getLastSyncTime();
    
    // Determine sync strategy based on time since last sync
    const hoursSinceSync = lastSync 
      ? (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60)
      : Infinity;
    
    if (hoursSinceSync > 24) {
      // High priority sync needed
      this.scheduleSyncWithStrategy('immediate');
    } else if (hoursSinceSync > 6) {
      // Normal sync
      this.scheduleSyncWithStrategy('background');
    } else {
      // Can defer sync
      this.scheduleSyncWithStrategy('deferred');
    }
  }

  /**
   * Handle network restoration
   */
  private async handleNetworkRestored(): Promise<void> {
    console.log('Network restored - processing offline queue');
    
    const startTime = Date.now();
    
    try {
      // Process offline queue
      await offlineQueueService.processQueue();
      
      // Sync widget data
      await widgetDataService.syncWithWidget();
      
      // Update sync metrics
      this.performanceMetrics.syncLatency = Date.now() - startTime;
      
      // Record successful sync
      await this.recordSyncEvent('success', this.performanceMetrics.syncLatency);
      
      // Update last sync time
      await this.updateLastSyncTime();
      
      console.log(`Sync completed in ${this.performanceMetrics.syncLatency}ms`);
    } catch (error) {
      console.error('Sync failed:', error);
      await this.recordSyncEvent('failed', Date.now() - startTime);
      
      // Retry with exponential backoff
      this.scheduleSyncWithStrategy('background');
    }
  }

  /**
   * Handle network loss
   */
  private async handleNetworkLost(): Promise<void> {
    console.log('Entering offline mode');
    
    // Validate critical assets are available
    const validation = await assetCacheService.validateCache();
    
    if (!validation.valid) {
      console.warn('Cache validation failed in offline mode:', validation.errors);
      // Attempt to recover critical assets from embedded fallbacks
      await this.recoverCriticalAssets();
    }
    
    // Notify user of offline mode
    this.notifyStatusChange();
  }

  /**
   * Handle app becoming active
   */
  private async handleAppBecameActive(): Promise<void> {
    // Check for resumable sessions
    const sessions = await resumableSessionService.getAllActiveSessions();
    
    if (sessions.length > 0) {
      console.log(`Found ${sessions.length} resumable sessions`);
      // App will handle session resumption UI
    }
    
    // Refresh cache statistics
    const stats = await assetCacheService.getCacheStatistics();
    
    // Process any pending offline actions
    if (this.currentNetworkState?.isConnected) {
      await offlineQueueService.scheduleQueueProcessing();
    }
    
    this.notifyStatusChange();
  }

  /**
   * Handle app entering background
   */
  private async handleAppEnteringBackground(): Promise<void> {
    // Save current state
    await this.saveOfflineStatus();
    
    // Clean up old cached data
    await offlineQueueService.cleanupOldActions();
    
    // Clear sync timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Validate offline readiness
   */
  private async validateOfflineReadiness(): Promise<boolean> {
    const checks = {
      criticalAssets: false,
      dataStore: false,
      sessionManagement: false,
      widgetIntegration: false
    };
    
    try {
      // Check critical assets
      const cacheStats = await assetCacheService.getCacheStatistics();
      checks.criticalAssets = cacheStats.criticalAssetsLoaded;
      
      // Check data store
      const testKey = 'being_offline_test';
      await AsyncStorage.setItem(testKey, 'test');
      const testValue = await AsyncStorage.getItem(testKey);
      checks.dataStore = testValue === 'test';
      await AsyncStorage.removeItem(testKey);
      
      // Check session management
      checks.sessionManagement = true; // Service is singleton, always ready
      
      // Check widget integration
      const widgetData = await widgetDataService.getQuickCheckIn();
      checks.widgetIntegration = widgetData !== null;
      
    } catch (error) {
      console.error('Offline readiness check failed:', error);
    }
    
    const allReady = Object.values(checks).every(check => check);
    
    if (!allReady) {
      console.warn('Offline mode not fully ready:', checks);
    }
    
    return allReady;
  }

  /**
   * Recover critical assets from embedded fallbacks
   */
  private async recoverCriticalAssets(): Promise<void> {
    console.log('Attempting to recover critical assets...');
    
    const criticalAssets = this.ESSENTIAL_ASSETS.filter(
      asset => asset.priority === AssetPriority.CRITICAL
    );
    
    for (const asset of criticalAssets) {
      try {
        await assetCacheService.loadAsset(
          asset.path,
          asset.type,
          asset.priority
        );
      } catch (error) {
        console.error(`Failed to recover critical asset ${asset.path}:`, error);
      }
    }
  }

  /**
   * Schedule sync with appropriate strategy
   */
  private scheduleSyncWithStrategy(priority: 'immediate' | 'background' | 'deferred'): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    
    const delays = {
      immediate: 0,
      background: 5000,  // 5 seconds
      deferred: 30000    // 30 seconds
    };
    
    this.syncTimer = setTimeout(
      () => this.handleNetworkRestored(),
      delays[priority]
    );
  }

  /**
   * Get current offline mode status
   */
  async getStatus(): Promise<OfflineModeStatus> {
    const [cacheStats, queueSize, sessions] = await Promise.all([
      assetCacheService.getCacheStatistics(),
      offlineQueueService.getQueueSize(),
      resumableSessionService.getAllActiveSessions()
    ]);
    
    const cacheHealth = this.evaluateCacheHealth(cacheStats);
    const lastSync = await this.getLastSyncTime();
    
    return {
      isOffline: !this.currentNetworkState?.isConnected,
      isInitialized: this.isInitialized,
      criticalAssetsReady: cacheStats.criticalAssetsLoaded,
      queueSize,
      activeSessions: sessions.length,
      cacheHealth,
      lastSync,
      performance: this.performanceMetrics
    };
  }

  /**
   * Evaluate cache health
   */
  private evaluateCacheHealth(stats: any): 'healthy' | 'degraded' | 'critical' {
    if (!stats.criticalAssetsLoaded) return 'critical';
    if (stats.hitRate < 0.5) return 'degraded';
    if (stats.assetCount < 10) return 'degraded';
    return 'healthy';
  }

  /**
   * Get last sync time
   */
  private async getLastSyncTime(): Promise<string | null> {
    try {
      const status = await AsyncStorage.getItem(this.STATUS_KEY);
      if (status) {
        const parsed = JSON.parse(status);
        return parsed.lastSync || null;
      }
    } catch (error) {
      console.error('Failed to get last sync time:', error);
    }
    return null;
  }

  /**
   * Update last sync time
   */
  private async updateLastSyncTime(): Promise<void> {
    try {
      const status = await AsyncStorage.getItem(this.STATUS_KEY) || '{}';
      const parsed = JSON.parse(status);
      parsed.lastSync = new Date().toISOString();
      await AsyncStorage.setItem(this.STATUS_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  /**
   * Save offline status
   */
  private async saveOfflineStatus(): Promise<void> {
    try {
      const status = await this.getStatus();
      await AsyncStorage.setItem(this.STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      console.error('Failed to save offline status:', error);
    }
  }

  /**
   * Record sync event for debugging
   */
  private async recordSyncEvent(
    result: 'success' | 'failed',
    duration: number
  ): Promise<void> {
    try {
      const log = await AsyncStorage.getItem(this.SYNC_LOG_KEY) || '[]';
      const events = JSON.parse(log);
      
      events.push({
        timestamp: new Date().toISOString(),
        result,
        duration,
        networkType: this.currentNetworkState?.type,
        queueSize: await offlineQueueService.getQueueSize()
      });
      
      // Keep only last 50 events
      if (events.length > 50) {
        events.shift();
      }
      
      await AsyncStorage.setItem(this.SYNC_LOG_KEY, JSON.stringify(events));
    } catch (error) {
      console.error('Failed to record sync event:', error);
    }
  }

  /**
   * Subscribe to status changes
   */
  subscribeToStatus(
    callback: (status: OfflineModeStatus) => void
  ): () => void {
    const id = Math.random().toString(36);
    
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    
    this.listeners.get(id)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(id);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private async notifyStatusChange(): Promise<void> {
    const status = await this.getStatus();
    
    for (const callbacks of this.listeners.values()) {
      for (const callback of callbacks) {
        try {
          callback(status);
        } catch (error) {
          console.error('Error in status listener:', error);
        }
      }
    }
  }

  /**
   * Force sync (for manual trigger)
   */
  async forceSync(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentNetworkState?.isConnected) {
      return { success: false, error: 'No network connection' };
    }
    
    try {
      await this.handleNetworkRestored();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      };
    }
  }

  /**
   * Get sync history for debugging
   */
  async getSyncHistory(): Promise<any[]> {
    try {
      const log = await AsyncStorage.getItem(this.SYNC_LOG_KEY) || '[]';
      return JSON.parse(log);
    } catch (error) {
      console.error('Failed to get sync history:', error);
      return [];
    }
  }

  /**
   * Clear all offline data (use with caution)
   */
  async clearAllOfflineData(): Promise<void> {
    console.warn('Clearing all offline data...');
    
    await Promise.all([
      assetCacheService.clearCache(false),
      offlineQueueService.clearQueue(),
      AsyncStorage.multiRemove([this.STATUS_KEY, this.SYNC_LOG_KEY])
    ]);
    
    // Reinitialize
    this.isInitialized = false;
    await this.initialize();
  }
}

// Export singleton instance
export const offlineModeIntegration = new OfflineModeIntegrationService();
export default offlineModeIntegration;