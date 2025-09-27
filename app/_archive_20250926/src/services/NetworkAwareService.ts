/**
 * NetworkAwareService - Advanced network connectivity monitoring and management
 * Provides intelligent network quality assessment, adaptive sync strategies, and clinical data prioritization
 * Integrates with enhanced offline services for comprehensive network-aware operations
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { offlineQueueService as enhancedOfflineQueueService } from './OfflineQueueService';
import { assetCacheService } from './AssetCacheService';
import { resumableSessionService } from './ResumableSessionService';
import {
  EnhancedNetworkState,
  NetworkQuality,
  NetworkMonitoringConfig,
  BackgroundSyncConfig,
  OfflinePriority,
  OfflineServiceHealth
} from '../types/offline';

/**
 * Network quality assessment result
 */
interface NetworkQualityAssessment {
  quality: NetworkQuality;
  bandwidth: number;      // Mbps
  latency: number;        // ms
  stability: number;      // 0-1 score
  reliability: number;    // 0-1 score
  timestamp: string;
  testDuration: number;   // ms
  recommendation: 'proceed' | 'delay' | 'offline_only';
}

/**
 * Sync recommendation based on network conditions
 */
interface SyncRecommendation {
  shouldSync: boolean;
  priority: OfflinePriority;
  estimatedDuration: number;    // minutes
  recommendedBatchSize: number;
  networkOptimal: boolean;
  reasons: string[];
  alternatives: string[];
}

/**
 * Enhanced NetworkAwareService with clinical data prioritization
 */
class NetworkAwareService {
  private readonly QUALITY_TEST_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly BANDWIDTH_TEST_TIMEOUT = 10000; // 10 seconds
  private readonly LATENCY_TEST_TIMEOUT = 5000; // 5 seconds
  private readonly STABILITY_SAMPLE_SIZE = 10;
  private readonly CLINICAL_SYNC_THRESHOLD = 0.7; // Quality threshold for clinical data
  
  // State management
  private currentState: EnhancedNetworkState;
  private qualityHistory: NetworkQualityAssessment[] = [];
  private listeners: Array<(state: EnhancedNetworkState) => void> = [];
  private subscription: NetInfoSubscription | null = null;
  private qualityTestInterval: NodeJS.Timeout | null = null;
  private backgroundSyncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  
  // Configuration
  private monitoringConfig: NetworkMonitoringConfig;
  private backgroundSyncConfig: BackgroundSyncConfig;
  
  // Performance tracking
  private bandwidthSamples: number[] = [];
  private latencySamples: number[] = [];
  private stabilityScore = 1.0;
  private lastQualityAssessment: NetworkQualityAssessment | null = null;

  constructor() {
    this.currentState = this.getDefaultNetworkState();
    this.monitoringConfig = this.getDefaultMonitoringConfig();
    this.backgroundSyncConfig = this.getDefaultBackgroundSyncConfig();
  }

  /**
   * Initialize network monitoring and quality assessment
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      await this.updateNetworkState(state);
      
      // Start continuous monitoring
      this.subscription = NetInfo.addEventListener(this.handleNetworkChange.bind(this));
      
      // Start quality assessment if enabled
      if (this.monitoringConfig.qualityAssessmentInterval > 0) {
        this.scheduleQualityAssessment();
      }
      
      // Start background sync if enabled
      if (this.backgroundSyncConfig.enabled) {
        this.scheduleBackgroundSync();
      }
      
      this.isInitialized = true;
      console.log('NetworkAwareService initialized with enhanced monitoring');
      
      // Initial queue processing if connected
      if (this.currentState.isConnected) {
        this.scheduleIntelligentSync();
      }
      
    } catch (error) {
      console.error('Failed to initialize NetworkAwareService:', error);
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
    
    if (this.qualityTestInterval) {
      clearInterval(this.qualityTestInterval);
      this.qualityTestInterval = null;
    }
    
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
      this.backgroundSyncInterval = null;
    }
    
    this.listeners = [];
    this.isInitialized = false;
    console.log('NetworkAwareService cleaned up');
  }

  /**
   * Handle network state changes with enhanced quality assessment
   */
  private async handleNetworkChange(state: NetInfoState): Promise<void> {
    const previousState = { ...this.currentState };
    await this.updateNetworkState(state);
    
    console.log('Enhanced network state changed:', {
      from: { 
        connected: previousState.isConnected, 
        quality: previousState.quality,
        type: previousState.type
      },
      to: { 
        connected: this.currentState.isConnected, 
        quality: this.currentState.quality,
        type: this.currentState.type
      }
    });
    
    // Notify listeners of state change
    this.notifyListeners(this.currentState);
    
    // Handle connectivity transitions
    if (!previousState.isConnected && this.currentState.isConnected) {
      await this.handleConnectivityRestored();
    } else if (previousState.isConnected && !this.currentState.isConnected) {
      await this.handleConnectivityLost();
    } else if (this.currentState.isConnected && 
               previousState.quality !== this.currentState.quality) {
      await this.handleQualityChange(previousState.quality, this.currentState.quality);
    }
  }

  /**
   * Update internal network state with quality assessment
   */
  private async updateNetworkState(netInfoState: NetInfoState): Promise<void> {
    const isConnected = netInfoState.isConnected ?? false;
    const isInternetReachable = netInfoState.isInternetReachable ?? null;
    const type = netInfoState.type;
    
    // Assess network quality
    let quality = NetworkQuality.OFFLINE;
    let bandwidth: number | undefined;
    let latency: number | undefined;
    
    if (isConnected && isInternetReachable) {
      // Immediate quality estimation based on connection type
      quality = this.estimateQualityFromType(type);
      
      // Perform detailed assessment if needed
      if (this.shouldPerformDetailedAssessment()) {
        const assessment = await this.performNetworkQualityAssessment();
        if (assessment) {
          quality = assessment.quality;
          bandwidth = assessment.bandwidth;
          latency = assessment.latency;
          this.lastQualityAssessment = assessment;
        }
      }
    }

    this.currentState = {
      isConnected,
      isInternetReachable,
      type,
      quality,
      bandwidth,
      latency,
      lastConnected: isConnected ? new Date().toISOString() : this.currentState.lastConnected,
      connectionStability: this.calculateConnectionStability()
    };
  }

  /**
   * Perform comprehensive network quality assessment
   */
  async performNetworkQualityAssessment(): Promise<NetworkQualityAssessment | null> {
    if (!this.currentState.isConnected) {
      return null;
    }

    const startTime = Date.now();
    console.log('Performing network quality assessment...');

    try {
      // Parallel bandwidth and latency tests
      const [bandwidthResult, latencyResult] = await Promise.allSettled([
        this.measureBandwidth(),
        this.measureLatency()
      ]);

      let bandwidth = 0;
      let latency = 999;

      if (bandwidthResult.status === 'fulfilled') {
        bandwidth = bandwidthResult.value;
        this.recordBandwidthSample(bandwidth);
      }

      if (latencyResult.status === 'fulfilled') {
        latency = latencyResult.value;
        this.recordLatencySample(latency);
      }

      // Calculate stability and reliability
      const stability = this.calculateNetworkStability();
      const reliability = this.calculateNetworkReliability();
      
      // Determine overall quality
      const quality = this.calculateNetworkQuality(bandwidth, latency, stability, reliability);
      
      const assessment: NetworkQualityAssessment = {
        quality,
        bandwidth,
        latency,
        stability,
        reliability,
        timestamp: new Date().toISOString(),
        testDuration: Date.now() - startTime,
        recommendation: this.getNetworkRecommendation(quality, stability)
      };

      this.qualityHistory.push(assessment);
      
      // Keep only recent assessments
      if (this.qualityHistory.length > 50) {
        this.qualityHistory.shift();
      }

      console.log(`Network quality assessment complete: ${quality} (${bandwidth} Mbps, ${latency}ms, ${Math.round(stability * 100)}% stable)`);
      return assessment;

    } catch (error) {
      console.error('Network quality assessment failed:', error);
      return null;
    }
  }

  /**
   * Measure network bandwidth using a small test download
   */
  private async measureBandwidth(): Promise<number> {
    const testUrl = 'https://httpbin.org/bytes/1024'; // 1KB test
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.BANDWIDTH_TEST_TIMEOUT);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error('Bandwidth test request failed');
      }
      
      await response.blob(); // Download the data
      const duration = (Date.now() - startTime) / 1000; // seconds
      const bytes = 1024;
      const bitsPerSecond = (bytes * 8) / duration;
      const mbps = bitsPerSecond / (1024 * 1024);
      
      return Math.max(mbps, 0.1); // Minimum 0.1 Mbps
    } catch (error) {
      console.warn('Bandwidth measurement failed:', error);
      return 0.1; // Default low bandwidth
    }
  }

  /**
   * Measure network latency using a HEAD request
   */
  private async measureLatency(): Promise<number> {
    const testUrl = 'https://httpbin.org/status/200';
    const measurements: number[] = [];
    
    try {
      // Take 3 measurements for accuracy
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.LATENCY_TEST_TIMEOUT);
        
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
          measurements.push(Date.now() - startTime);
        }
        
        // Small delay between measurements
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (measurements.length === 0) {
        return 999; // High latency fallback
      }
      
      // Return median latency
      measurements.sort((a, b) => a - b);
      return measurements[Math.floor(measurements.length / 2)];
      
    } catch (error) {
      console.warn('Latency measurement failed:', error);
      return 999; // High latency fallback
    }
  }

  /**
   * Calculate overall network quality based on metrics
   */
  private calculateNetworkQuality(
    bandwidth: number,
    latency: number,
    stability: number,
    reliability: number
  ): NetworkQuality {
    // Weighted scoring system
    let score = 0;
    
    // Bandwidth scoring (0-40 points)
    if (bandwidth >= 10) score += 40;
    else if (bandwidth >= 5) score += 30;
    else if (bandwidth >= 1) score += 20;
    else if (bandwidth >= 0.5) score += 10;
    
    // Latency scoring (0-30 points)
    if (latency <= 50) score += 30;
    else if (latency <= 100) score += 25;
    else if (latency <= 200) score += 20;
    else if (latency <= 500) score += 10;
    else if (latency <= 1000) score += 5;
    
    // Stability scoring (0-20 points)
    score += Math.round(stability * 20);
    
    // Reliability scoring (0-10 points)
    score += Math.round(reliability * 10);
    
    // Determine quality based on total score
    if (score >= 85) return NetworkQuality.EXCELLENT;
    if (score >= 65) return NetworkQuality.GOOD;
    if (score >= 40) return NetworkQuality.POOR;
    return NetworkQuality.OFFLINE;
  }

  /**
   * Get sync recommendation based on current network conditions
   */
  async getSyncRecommendation(
    priority: OfflinePriority = OfflinePriority.MEDIUM
  ): Promise<SyncRecommendation> {
    const queueStats = await enhancedOfflineQueueService.getStatistics();
    const networkOptimal = this.isNetworkOptimalForSync();
    const reasons: string[] = [];
    const alternatives: string[] = [];
    
    let shouldSync = this.currentState.isConnected;
    let recommendedBatchSize = 20;
    let estimatedDuration = 5;

    // Adjust based on network quality
    switch (this.currentState.quality) {
      case NetworkQuality.EXCELLENT:
        recommendedBatchSize = 100;
        estimatedDuration = Math.ceil(queueStats.totalActions / 50);
        reasons.push('Excellent network quality');
        break;
        
      case NetworkQuality.GOOD:
        recommendedBatchSize = 50;
        estimatedDuration = Math.ceil(queueStats.totalActions / 30);
        reasons.push('Good network quality');
        break;
        
      case NetworkQuality.POOR:
        recommendedBatchSize = 10;
        estimatedDuration = Math.ceil(queueStats.totalActions / 5);
        
        if (priority === OfflinePriority.CRITICAL || queueStats.crisisDataPending) {
          reasons.push('Poor network but critical data requires sync');
        } else {
          shouldSync = false;
          reasons.push('Poor network quality, recommend waiting');
          alternatives.push('Wait for better connectivity');
        }
        break;
        
      case NetworkQuality.OFFLINE:
        shouldSync = false;
        reasons.push('No network connectivity');
        alternatives.push('Continue offline mode');
        break;
    }

    // Critical data always syncs if connected
    if (queueStats.criticalActionsCount > 0 || queueStats.crisisDataPending) {
      if (this.currentState.isConnected) {
        shouldSync = true;
        recommendedBatchSize = Math.max(recommendedBatchSize, queueStats.criticalActionsCount);
        reasons.push('Critical or crisis data requires immediate sync');
      } else {
        alternatives.push('Establish connection for critical data sync');
      }
    }

    // Battery and storage considerations
    if (shouldSync && this.backgroundSyncConfig.enabled) {
      // These would integrate with device APIs
      const batteryLevel = 100; // Placeholder
      const storageAvailable = 1000000; // Placeholder
      
      if (batteryLevel < this.backgroundSyncConfig.batteryThreshold) {
        if (priority !== OfflinePriority.CRITICAL) {
          shouldSync = false;
          reasons.push('Low battery level');
          alternatives.push('Charge device or wait for charging');
        }
      }
      
      if (storageAvailable < this.backgroundSyncConfig.storageThreshold) {
        shouldSync = false;
        reasons.push('Insufficient storage space');
        alternatives.push('Free up device storage');
      }
    }

    return {
      shouldSync,
      priority,
      estimatedDuration,
      recommendedBatchSize,
      networkOptimal,
      reasons,
      alternatives
    };
  }

  /**
   * Perform intelligent sync based on network conditions
   */
  async performIntelligentSync(): Promise<void> {
    if (!this.currentState.isConnected) {
      console.log('No network connection for intelligent sync');
      return;
    }

    try {
      // Get sync recommendation
      const recommendation = await this.getSyncRecommendation();
      
      if (!recommendation.shouldSync) {
        console.log('Intelligent sync skipped:', recommendation.reasons.join(', '));
        return;
      }

      console.log(`Starting intelligent sync: ${recommendation.recommendedBatchSize} batch size, ~${recommendation.estimatedDuration}min estimated`);
      
      // Prioritize critical data
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      
      if (queueStats.criticalActionsCount > 0 || queueStats.crisisDataPending) {
        console.log('Processing critical data with priority');
        await enhancedOfflineQueueService.processQueue();
      } else {
        // Process based on network quality
        await enhancedOfflineQueueService.processQueue();
      }
      
      console.log('Intelligent sync completed successfully');
      
    } catch (error) {
      console.error('Intelligent sync failed:', error);
      
      // Schedule retry based on network quality
      const retryDelay = this.getIntelligentRetryDelay();
      setTimeout(() => {
        this.performIntelligentSync();
      }, retryDelay);
    }
  }

  /**
   * Handle connectivity restoration with intelligent processing
   */
  private async handleConnectivityRestored(): Promise<void> {
    console.log('Enhanced connectivity restored, performing intelligent sync...');
    
    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Perform quality assessment
    await this.performNetworkQualityAssessment();
    
    // Start intelligent sync
    await this.performIntelligentSync();
    
    // Clean up old queue actions
    // This would call the enhanced cleanup method
  }

  /**
   * Handle connectivity loss with graceful degradation
   */
  private async handleConnectivityLost(): Promise<void> {
    console.log('Enhanced connectivity lost, enabling offline mode optimizations');
    
    // Cancel any ongoing sync operations
    // This would integrate with the queue service
    
    // Ensure critical assets are cached
    await assetCacheService.validateCache();
    
    // Optimize offline operations
    await this.optimizeOfflineMode();
  }

  /**
   * Handle network quality changes
   */
  private async handleQualityChange(
    previousQuality: NetworkQuality,
    currentQuality: NetworkQuality
  ): Promise<void> {
    console.log(`Network quality changed: ${previousQuality} → ${currentQuality}`);
    
    // Adapt sync strategy based on quality change
    if (this.isQualityImprovement(previousQuality, currentQuality)) {
      // Quality improved - consider more aggressive sync
      const recommendation = await this.getSyncRecommendation();
      if (recommendation.shouldSync && recommendation.networkOptimal) {
        await this.performIntelligentSync();
      }
    } else if (this.isQualityDegradation(previousQuality, currentQuality)) {
      // Quality degraded - reduce sync aggressiveness
      if (currentQuality === NetworkQuality.POOR) {
        // Switch to critical-only sync mode
        console.log('Network quality degraded, switching to critical-only sync');
      }
    }
  }

  /**
   * Schedule background sync based on configuration
   */
  private scheduleBackgroundSync(): void {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
    }
    
    const interval = this.backgroundSyncConfig.interval * 60 * 1000; // Convert to ms
    
    this.backgroundSyncInterval = setInterval(async () => {
      try {
        if (this.shouldPerformBackgroundSync()) {
          await this.performIntelligentSync();
        }
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }, interval);
    
    console.log(`Background sync scheduled every ${this.backgroundSyncConfig.interval} minutes`);
  }

  /**
   * Schedule periodic quality assessment
   */
  private scheduleQualityAssessment(): void {
    if (this.qualityTestInterval) {
      clearInterval(this.qualityTestInterval);
    }
    
    this.qualityTestInterval = setInterval(async () => {
      if (this.currentState.isConnected) {
        await this.performNetworkQualityAssessment();
      }
    }, this.monitoringConfig.qualityAssessmentInterval);
  }

  /**
   * Schedule intelligent sync with optimal timing
   */
  private scheduleIntelligentSync(delay: number = 1000): void {
    setTimeout(async () => {
      try {
        await this.performIntelligentSync();
      } catch (error) {
        console.error('Scheduled intelligent sync failed:', error);
      }
    }, delay);
  }

  /**
   * Utility methods
   */
  
  private getDefaultNetworkState(): EnhancedNetworkState {
    return {
      isConnected: false,
      isInternetReachable: null,
      type: null,
      quality: NetworkQuality.OFFLINE,
      connectionStability: 1.0
    };
  }

  private getDefaultMonitoringConfig(): NetworkMonitoringConfig {
    return {
      pollingInterval: 30000, // 30 seconds
      qualityAssessmentInterval: this.QUALITY_TEST_INTERVAL,
      bandwidthTestEnabled: true,
      latencyTestEnabled: true,
      backgroundSyncEnabled: true,
      adaptiveQualityEnabled: true,
      clinicalDataPriority: true
    };
  }

  private getDefaultBackgroundSyncConfig(): BackgroundSyncConfig {
    return {
      enabled: true,
      interval: 15, // 15 minutes
      wifiOnly: false,
      batteryThreshold: 20, // 20%
      storageThreshold: 100 * 1024 * 1024, // 100MB
      priorityQueuesOnly: false,
      clinicalDataFirst: true,
      maxSyncDuration: 10, // 10 minutes
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00'
      }
    };
  }

  private estimateQualityFromType(type: string | null): NetworkQuality {
    switch (type) {
      case 'wifi':
        return NetworkQuality.EXCELLENT;
      case 'cellular':
        return NetworkQuality.GOOD;
      case 'ethernet':
        return NetworkQuality.EXCELLENT;
      case 'bluetooth':
      case 'wimax':
        return NetworkQuality.POOR;
      default:
        return NetworkQuality.POOR;
    }
  }

  private shouldPerformDetailedAssessment(): boolean {
    // Perform detailed assessment if:
    // - No recent assessment
    // - Quality seems inconsistent
    // - Critical data is pending
    const lastAssessment = this.lastQualityAssessment;
    if (!lastAssessment) return true;
    
    const timeSinceAssessment = Date.now() - new Date(lastAssessment.timestamp).getTime();
    return timeSinceAssessment > this.QUALITY_TEST_INTERVAL;
  }

  private recordBandwidthSample(bandwidth: number): void {
    this.bandwidthSamples.push(bandwidth);
    if (this.bandwidthSamples.length > this.STABILITY_SAMPLE_SIZE) {
      this.bandwidthSamples.shift();
    }
  }

  private recordLatencySample(latency: number): void {
    this.latencySamples.push(latency);
    if (this.latencySamples.length > this.STABILITY_SAMPLE_SIZE) {
      this.latencySamples.shift();
    }
  }

  private calculateConnectionStability(): number {
    // Calculate stability based on connection consistency
    return this.stabilityScore;
  }

  private calculateNetworkStability(): number {
    if (this.bandwidthSamples.length < 3) return 0.8; // Default stability
    
    const mean = this.bandwidthSamples.reduce((a, b) => a + b, 0) / this.bandwidthSamples.length;
    const variance = this.bandwidthSamples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / this.bandwidthSamples.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
    
    // Lower coefficient of variation = higher stability
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private calculateNetworkReliability(): number {
    // Calculate reliability based on success rate of network operations
    return this.qualityHistory.length > 0 ? 0.9 : 0.8; // Placeholder
  }

  private getNetworkRecommendation(
    quality: NetworkQuality,
    stability: number
  ): 'proceed' | 'delay' | 'offline_only' {
    if (quality === NetworkQuality.OFFLINE) return 'offline_only';
    if (quality === NetworkQuality.POOR && stability < 0.5) return 'delay';
    if (quality === NetworkQuality.POOR) return 'delay';
    return 'proceed';
  }

  private isNetworkOptimalForSync(): boolean {
    return this.currentState.quality === NetworkQuality.EXCELLENT ||
           (this.currentState.quality === NetworkQuality.GOOD && 
            this.currentState.connectionStability > 0.8);
  }

  private shouldPerformBackgroundSync(): boolean {
    if (!this.backgroundSyncConfig.enabled) return false;
    if (!this.currentState.isConnected) return false;
    
    // Check quiet hours
    if (this.backgroundSyncConfig.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const start = this.backgroundSyncConfig.quietHours.start;
      const end = this.backgroundSyncConfig.quietHours.end;
      
      if (start > end) {
        // Overnight quiet hours (e.g., 22:00 to 07:00)
        if (currentTime >= start || currentTime <= end) return false;
      } else {
        // Same day quiet hours
        if (currentTime >= start && currentTime <= end) return false;
      }
    }
    
    // Check WiFi requirement
    if (this.backgroundSyncConfig.wifiOnly && this.currentState.type !== 'wifi') {
      return false;
    }
    
    return true;
  }

  private getIntelligentRetryDelay(): number {
    switch (this.currentState.quality) {
      case NetworkQuality.POOR:
        return 5 * 60 * 1000; // 5 minutes
      case NetworkQuality.GOOD:
        return 2 * 60 * 1000; // 2 minutes
      case NetworkQuality.EXCELLENT:
        return 30 * 1000; // 30 seconds
      default:
        return 10 * 60 * 1000; // 10 minutes
    }
  }

  private isQualityImprovement(previous: NetworkQuality, current: NetworkQuality): boolean {
    const qualityOrder = {
      [NetworkQuality.OFFLINE]: 0,
      [NetworkQuality.POOR]: 1,
      [NetworkQuality.GOOD]: 2,
      [NetworkQuality.EXCELLENT]: 3
    };
    return qualityOrder[current] > qualityOrder[previous];
  }

  private isQualityDegradation(previous: NetworkQuality, current: NetworkQuality): boolean {
    const qualityOrder = {
      [NetworkQuality.OFFLINE]: 0,
      [NetworkQuality.POOR]: 1,
      [NetworkQuality.GOOD]: 2,
      [NetworkQuality.EXCELLENT]: 3
    };
    return qualityOrder[current] < qualityOrder[previous];
  }

  private async optimizeOfflineMode(): Promise<void> {
    // Optimize for offline operations
    console.log('Optimizing for offline mode...');
    
    // Ensure critical assets are available
    const cacheStats = await assetCacheService.getCacheStatistics();
    if (!cacheStats.criticalAssetsLoaded) {
      console.warn('Critical assets not fully cached for offline mode');
    }
    
    // Cleanup non-essential background processes
    // This would integrate with other services
  }

  private notifyListeners(state: EnhancedNetworkState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in enhanced network listener:', error);
      }
    });
  }

  /**
   * Public API methods
   */

  /**
   * Get current enhanced network state
   */
  getState(): EnhancedNetworkState {
    return { ...this.currentState };
  }

  /**
   * Check if device is currently online with quality threshold
   */
  isOnline(minimumQuality: NetworkQuality = NetworkQuality.POOR): boolean {
    return this.currentState.isConnected && 
           this.getQualityScore(this.currentState.quality) >= this.getQualityScore(minimumQuality);
  }

  /**
   * Check if network is suitable for clinical data sync
   */
  isClinicalSyncReady(): boolean {
    return this.currentState.isConnected &&
           this.currentState.connectionStability >= this.CLINICAL_SYNC_THRESHOLD &&
           this.currentState.quality !== NetworkQuality.POOR;
  }

  /**
   * Get network quality history
   */
  getQualityHistory(hours: number = 24): NetworkQualityAssessment[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.qualityHistory.filter(assessment => 
      new Date(assessment.timestamp) >= cutoff
    );
  }

  /**
   * Force network quality assessment
   */
  async assessNetworkQuality(): Promise<NetworkQualityAssessment | null> {
    return await this.performNetworkQualityAssessment();
  }

  /**
   * Add network state change listener
   */
  addNetworkListener(listener: (state: EnhancedNetworkState) => void): () => void {
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
   * Update monitoring configuration
   */
  updateMonitoringConfig(config: Partial<NetworkMonitoringConfig>): void {
    this.monitoringConfig = { ...this.monitoringConfig, ...config };
    
    if (config.qualityAssessmentInterval) {
      this.scheduleQualityAssessment();
    }
  }

  /**
   * Update background sync configuration
   */
  updateBackgroundSyncConfig(config: Partial<BackgroundSyncConfig>): void {
    this.backgroundSyncConfig = { ...this.backgroundSyncConfig, ...config };
    
    if (config.enabled !== undefined || config.interval) {
      if (this.backgroundSyncConfig.enabled) {
        this.scheduleBackgroundSync();
      } else if (this.backgroundSyncInterval) {
        clearInterval(this.backgroundSyncInterval);
        this.backgroundSyncInterval = null;
      }
    }
  }

  /**
   * Get comprehensive network and sync status
   */
  async getComprehensiveStatus(): Promise<{
    network: EnhancedNetworkState;
    quality: NetworkQualityAssessment | null;
    recommendation: SyncRecommendation;
    health: OfflineServiceHealth;
  }> {
    const [recommendation, health] = await Promise.all([
      this.getSyncRecommendation(),
      enhancedOfflineQueueService.getHealthStatus()
    ]);

    return {
      network: this.currentState,
      quality: this.lastQualityAssessment,
      recommendation,
      health
    };
  }

  private getQualityScore(quality: NetworkQuality): number {
    const scores = {
      [NetworkQuality.OFFLINE]: 0,
      [NetworkQuality.POOR]: 1,
      [NetworkQuality.GOOD]: 2,
      [NetworkQuality.EXCELLENT]: 3
    };
    return scores[quality];
  }
}

// Export singleton instance
export const networkAwareService = new NetworkAwareService();
export default networkAwareService;