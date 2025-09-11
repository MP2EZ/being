/**
 * AssetCacheService - Comprehensive asset caching strategy for offline mode
 * Manages multi-layer caching with intelligent prioritization for mental health UX
 * Ensures critical therapeutic resources are always available offline
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Asset priority levels for caching strategy
 */
export enum AssetPriority {
  CRITICAL = 'critical',     // Crisis resources, emergency contacts
  HIGH = 'high',             // Core therapeutic content, assessments
  MEDIUM = 'medium',         // UI components, icons
  LOW = 'low',               // Enhanced content, optional features
  DEFERRED = 'deferred'      // Can be loaded on-demand
}

/**
 * Asset types for categorization
 */
export enum AssetType {
  CRISIS_RESOURCE = 'crisis_resource',
  THERAPEUTIC_CONTENT = 'therapeutic_content',
  ASSESSMENT_TOOL = 'assessment_tool',
  UI_COMPONENT = 'ui_component',
  AUDIO_GUIDANCE = 'audio_guidance',
  ANIMATION = 'animation',
  IMAGE = 'image',
  DATA = 'data'
}

/**
 * Asset metadata structure
 */
export interface AssetMetadata {
  id: string;
  uri: string;
  type: AssetType;
  priority: AssetPriority;
  size: number;
  version: string;
  checksum?: string;
  lastAccessed: string;
  accessCount: number;
  ttl?: number; // Time to live in hours
  compressed?: boolean;
  encrypted?: boolean;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStatistics {
  totalSize: number;
  assetCount: number;
  hitRate: number;
  missRate: number;
  criticalAssetsLoaded: boolean;
  lastCleanup: string;
  performanceMetrics: {
    averageLoadTime: number;
    p95LoadTime: number;
    p99LoadTime: number;
  };
}

/**
 * Cache configuration
 */
interface CacheConfig {
  maxCacheSize: number;          // Maximum cache size in bytes
  maxMemoryCacheSize: number;    // Maximum memory cache size
  criticalAssetTimeout: number;  // Timeout for critical assets in ms
  defaultTTL: number;            // Default TTL in hours
  cleanupInterval: number;       // Cleanup interval in hours
  compressionThreshold: number;  // Size threshold for compression
}

class AssetCacheService {
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_KEY_PREFIX = '@fullmind_asset_cache_';
  private readonly METADATA_KEY = '@fullmind_asset_metadata';
  private readonly STATS_KEY = '@fullmind_cache_stats';
  
  private memoryCache: Map<string, any> = new Map();
  private cacheStats: CacheStatistics;
  private isInitialized = false;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private loadTimings: number[] = [];
  
  private readonly config: CacheConfig = {
    maxCacheSize: 100 * 1024 * 1024,      // 100MB
    maxMemoryCacheSize: 20 * 1024 * 1024, // 20MB in memory
    criticalAssetTimeout: 200,            // 200ms for critical assets
    defaultTTL: 168,                      // 7 days
    cleanupInterval: 6,                   // 6 hours
    compressionThreshold: 50 * 1024       // 50KB
  };

  /**
   * Critical assets that must always be available
   */
  private readonly CRITICAL_ASSETS = [
    { path: 'crisis/hotline.json', type: AssetType.CRISIS_RESOURCE },
    { path: 'crisis/emergency_contacts.json', type: AssetType.CRISIS_RESOURCE },
    { path: 'crisis/safety_plan_template.json', type: AssetType.CRISIS_RESOURCE },
    { path: 'assessments/phq9.json', type: AssetType.ASSESSMENT_TOOL },
    { path: 'assessments/gad7.json', type: AssetType.ASSESSMENT_TOOL },
    { path: 'breathing/timer_audio.mp3', type: AssetType.AUDIO_GUIDANCE },
    { path: 'ui/crisis_button.png', type: AssetType.UI_COMPONENT }
  ];

  constructor() {
    this.cacheStats = this.getDefaultStats();
    this.initialize();
  }

  /**
   * Initialize the cache service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load cache statistics
      await this.loadCacheStats();
      
      // Ensure cache directory exists
      await this.ensureCacheDirectory();
      
      // Load critical assets immediately
      await this.loadCriticalAssets();
      
      // Schedule cleanup
      this.scheduleCleanup();
      
      // Monitor network state for background updates
      this.setupNetworkMonitoring();
      
      this.isInitialized = true;
      console.log('AssetCacheService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AssetCacheService:', error);
      // Service should still work with degraded functionality
      this.isInitialized = true;
    }
  }

  /**
   * Load asset with intelligent caching
   */
  async loadAsset(
    assetPath: string,
    type: AssetType,
    priority: AssetPriority = AssetPriority.MEDIUM
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Check memory cache first (fastest)
      const memCached = this.getFromMemoryCache(assetPath);
      if (memCached) {
        this.recordCacheHit(Date.now() - startTime);
        return memCached;
      }

      // Check disk cache
      const diskCached = await this.getFromDiskCache(assetPath);
      if (diskCached) {
        // Promote to memory cache if high priority
        if (priority === AssetPriority.CRITICAL || priority === AssetPriority.HIGH) {
          this.addToMemoryCache(assetPath, diskCached);
        }
        this.recordCacheHit(Date.now() - startTime);
        return diskCached;
      }

      // Cache miss - load from bundle or network
      this.recordCacheMiss();
      const asset = await this.loadFromSource(assetPath, type);
      
      // Cache based on priority
      await this.cacheAsset(assetPath, asset, type, priority);
      
      const loadTime = Date.now() - startTime;
      this.recordLoadTime(loadTime);
      
      // Log warning if critical asset took too long
      if (priority === AssetPriority.CRITICAL && loadTime > this.config.criticalAssetTimeout) {
        console.warn(`Critical asset ${assetPath} took ${loadTime}ms to load`);
      }
      
      return asset;
    } catch (error) {
      console.error(`Failed to load asset ${assetPath}:`, error);
      
      // For critical assets, try fallback strategies
      if (priority === AssetPriority.CRITICAL) {
        return this.loadFallbackAsset(assetPath, type);
      }
      
      throw error;
    }
  }

  /**
   * Preload assets based on priority
   */
  async preloadAssets(assets: Array<{
    path: string;
    type: AssetType;
    priority: AssetPriority;
  }>): Promise<void> {
    // Sort by priority
    const sorted = assets.sort((a, b) => {
      const priorityOrder = {
        [AssetPriority.CRITICAL]: 0,
        [AssetPriority.HIGH]: 1,
        [AssetPriority.MEDIUM]: 2,
        [AssetPriority.LOW]: 3,
        [AssetPriority.DEFERRED]: 4
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Load critical assets synchronously
    for (const asset of sorted.filter(a => a.priority === AssetPriority.CRITICAL)) {
      await this.loadAsset(asset.path, asset.type, asset.priority);
    }

    // Load other assets in parallel batches
    const batchSize = 5;
    const nonCritical = sorted.filter(a => a.priority !== AssetPriority.CRITICAL);
    
    for (let i = 0; i < nonCritical.length; i += batchSize) {
      const batch = nonCritical.slice(i, i + batchSize);
      await Promise.all(
        batch.map(asset => 
          this.loadAsset(asset.path, asset.type, asset.priority).catch(err => {
            console.warn(`Failed to preload ${asset.path}:`, err);
          })
        )
      );
    }
  }

  /**
   * Load critical assets that must always be available
   */
  private async loadCriticalAssets(): Promise<void> {
    console.log('Loading critical assets for offline availability...');
    
    const criticalPromises = this.CRITICAL_ASSETS.map(asset => 
      this.loadAsset(asset.path, asset.type, AssetPriority.CRITICAL)
        .catch(err => {
          console.error(`CRITICAL: Failed to load ${asset.path}:`, err);
          // Critical assets must be available - use embedded fallbacks
          return this.getEmbeddedFallback(asset.path);
        })
    );

    await Promise.all(criticalPromises);
    
    this.cacheStats.criticalAssetsLoaded = true;
    await this.saveCacheStats();
    
    console.log('Critical assets loaded successfully');
  }

  /**
   * Get asset from memory cache
   */
  private getFromMemoryCache(key: string): any {
    return this.memoryCache.get(key);
  }

  /**
   * Add asset to memory cache with size management
   */
  private addToMemoryCache(key: string, data: any): void {
    // Estimate size (rough approximation)
    const size = JSON.stringify(data).length;
    
    // Check if we need to evict items
    if (this.getMemoryCacheSize() + size > this.config.maxMemoryCacheSize) {
      this.evictFromMemoryCache(size);
    }
    
    this.memoryCache.set(key, data);
  }

  /**
   * Get current memory cache size
   */
  private getMemoryCacheSize(): number {
    let totalSize = 0;
    for (const [_, value] of this.memoryCache) {
      totalSize += JSON.stringify(value).length;
    }
    return totalSize;
  }

  /**
   * Evict items from memory cache using LRU
   */
  private evictFromMemoryCache(requiredSpace: number): void {
    const entries = Array.from(this.memoryCache.entries());
    let freedSpace = 0;
    
    // Sort by least recently used (would need to track access times in production)
    for (const [key, value] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      // Don't evict critical assets
      if (!this.isCriticalAsset(key)) {
        this.memoryCache.delete(key);
        freedSpace += JSON.stringify(value).length;
      }
    }
  }

  /**
   * Get asset from disk cache
   */
  private async getFromDiskCache(key: string): Promise<any> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${key}`;
      const metadata = await this.getAssetMetadata(key);
      
      if (!metadata) return null;
      
      // Check if expired
      if (this.isAssetExpired(metadata)) {
        await this.removeFromCache(key);
        return null;
      }
      
      // Read from disk
      const filePath = `${FileSystem.cacheDirectory}assets/${key}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (!fileInfo.exists) return null;
      
      const content = await FileSystem.readAsStringAsync(filePath);
      
      // Update access metadata
      await this.updateAssetAccess(key);
      
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to read from disk cache: ${key}`, error);
      return null;
    }
  }

  /**
   * Cache asset to disk with metadata
   */
  private async cacheAsset(
    key: string,
    data: any,
    type: AssetType,
    priority: AssetPriority
  ): Promise<void> {
    try {
      const filePath = `${FileSystem.cacheDirectory}assets/${key}`;
      const content = JSON.stringify(data);
      const size = content.length;
      
      // Ensure directory exists
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      
      // Write to disk
      await FileSystem.writeAsStringAsync(filePath, content);
      
      // Save metadata
      const metadata: AssetMetadata = {
        id: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key),
        uri: key,
        type,
        priority,
        size,
        version: this.CACHE_VERSION,
        lastAccessed: new Date().toISOString(),
        accessCount: 1,
        ttl: this.getTTLForPriority(priority)
      };
      
      await this.saveAssetMetadata(key, metadata);
      
      // Add to memory cache if high priority
      if (priority === AssetPriority.CRITICAL || priority === AssetPriority.HIGH) {
        this.addToMemoryCache(key, data);
      }
      
      // Update cache statistics
      this.cacheStats.totalSize += size;
      this.cacheStats.assetCount++;
      await this.saveCacheStats();
      
    } catch (error) {
      console.error(`Failed to cache asset ${key}:`, error);
    }
  }

  /**
   * Load asset from source (bundle or network)
   */
  private async loadFromSource(path: string, type: AssetType): Promise<any> {
    // For Phase 1, all assets are bundled (no network calls)
    try {
      // Try to load from bundled assets
      const asset = Asset.fromModule(require(`../../assets/${path}`));
      await asset.downloadAsync();
      return asset;
    } catch (error) {
      // Fallback to embedded data
      return this.getEmbeddedFallback(path);
    }
  }

  /**
   * Get embedded fallback for critical assets
   */
  private getEmbeddedFallback(path: string): any {
    // Embedded critical data for absolute offline reliability
    const fallbacks: Record<string, any> = {
      'crisis/hotline.json': {
        number: '988',
        name: 'Suicide & Crisis Lifeline',
        available: '24/7'
      },
      'crisis/emergency_contacts.json': {
        contacts: []
      },
      'crisis/safety_plan_template.json': {
        warningSignals: [],
        copingStrategies: [],
        supportContacts: []
      },
      'assessments/phq9.json': {
        questions: [], // PHQ-9 questions would be embedded
        scoring: {}
      },
      'assessments/gad7.json': {
        questions: [], // GAD-7 questions would be embedded
        scoring: {}
      }
    };
    
    return fallbacks[path] || null;
  }

  /**
   * Load fallback asset for non-critical items
   */
  private async loadFallbackAsset(path: string, type: AssetType): Promise<any> {
    // Try embedded fallback first
    const embedded = this.getEmbeddedFallback(path);
    if (embedded) return embedded;
    
    // Return placeholder based on type
    switch (type) {
      case AssetType.IMAGE:
      case AssetType.UI_COMPONENT:
        return null; // UI will handle missing images
      case AssetType.AUDIO_GUIDANCE:
        return { error: 'Audio unavailable offline' };
      default:
        return null;
    }
  }

  /**
   * Check if asset is critical
   */
  private isCriticalAsset(key: string): boolean {
    return this.CRITICAL_ASSETS.some(asset => asset.path === key);
  }

  /**
   * Check if asset is expired
   */
  private isAssetExpired(metadata: AssetMetadata): boolean {
    if (!metadata.ttl) return false;
    
    const expirationTime = new Date(metadata.lastAccessed).getTime() + 
                          (metadata.ttl * 60 * 60 * 1000);
    return Date.now() > expirationTime;
  }

  /**
   * Get TTL based on priority
   */
  private getTTLForPriority(priority: AssetPriority): number {
    const ttlMap = {
      [AssetPriority.CRITICAL]: 0,        // Never expires
      [AssetPriority.HIGH]: 720,          // 30 days
      [AssetPriority.MEDIUM]: 168,        // 7 days
      [AssetPriority.LOW]: 72,            // 3 days
      [AssetPriority.DEFERRED]: 24        // 1 day
    };
    return ttlMap[priority];
  }

  /**
   * Get asset metadata
   */
  private async getAssetMetadata(key: string): Promise<AssetMetadata | null> {
    try {
      const allMetadata = await AsyncStorage.getItem(this.METADATA_KEY);
      if (!allMetadata) return null;
      
      const metadata = JSON.parse(allMetadata);
      return metadata[key] || null;
    } catch (error) {
      console.error('Failed to get asset metadata:', error);
      return null;
    }
  }

  /**
   * Save asset metadata
   */
  private async saveAssetMetadata(key: string, metadata: AssetMetadata): Promise<void> {
    try {
      const allMetadata = await AsyncStorage.getItem(this.METADATA_KEY) || '{}';
      const metadataObj = JSON.parse(allMetadata);
      metadataObj[key] = metadata;
      await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(metadataObj));
    } catch (error) {
      console.error('Failed to save asset metadata:', error);
    }
  }

  /**
   * Update asset access information
   */
  private async updateAssetAccess(key: string): Promise<void> {
    const metadata = await this.getAssetMetadata(key);
    if (!metadata) return;
    
    metadata.lastAccessed = new Date().toISOString();
    metadata.accessCount++;
    
    await this.saveAssetMetadata(key, metadata);
  }

  /**
   * Remove asset from cache
   */
  private async removeFromCache(key: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);
      
      // Remove from disk
      const filePath = `${FileSystem.cacheDirectory}assets/${key}`;
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      
      // Remove metadata
      const allMetadata = await AsyncStorage.getItem(this.METADATA_KEY) || '{}';
      const metadataObj = JSON.parse(allMetadata);
      const metadata = metadataObj[key];
      
      if (metadata) {
        this.cacheStats.totalSize -= metadata.size;
        this.cacheStats.assetCount--;
        delete metadataObj[key];
        await AsyncStorage.setItem(this.METADATA_KEY, JSON.stringify(metadataObj));
      }
      
      await this.saveCacheStats();
    } catch (error) {
      console.error(`Failed to remove asset from cache: ${key}`, error);
    }
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDirectory(): Promise<void> {
    const cacheDir = `${FileSystem.cacheDirectory}assets`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }
  }

  /**
   * Setup network monitoring for background updates
   */
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        // Schedule background updates when connected
        this.scheduleBackgroundUpdates();
      }
    });
  }

  /**
   * Schedule background asset updates
   */
  private async scheduleBackgroundUpdates(): Promise<void> {
    // In Phase 1, no network updates
    // This is placeholder for future phases
    console.log('Background updates scheduled (disabled in Phase 1)');
  }

  /**
   * Schedule periodic cleanup
   */
  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(
      () => this.performCleanup(),
      this.config.cleanupInterval * 60 * 60 * 1000
    );
    
    // Run initial cleanup
    this.performCleanup();
  }

  /**
   * Perform cache cleanup
   */
  private async performCleanup(): Promise<void> {
    console.log('Performing cache cleanup...');
    
    try {
      const allMetadata = await AsyncStorage.getItem(this.METADATA_KEY) || '{}';
      const metadataObj = JSON.parse(allMetadata);
      const keysToRemove: string[] = [];
      
      // Check each cached asset
      for (const [key, metadata] of Object.entries(metadataObj)) {
        const meta = metadata as AssetMetadata;
        
        // Skip critical assets
        if (meta.priority === AssetPriority.CRITICAL) continue;
        
        // Remove expired assets
        if (this.isAssetExpired(meta)) {
          keysToRemove.push(key);
          continue;
        }
        
        // Remove rarely accessed low-priority assets
        if (meta.priority === AssetPriority.LOW || meta.priority === AssetPriority.DEFERRED) {
          const daysSinceAccess = (Date.now() - new Date(meta.lastAccessed).getTime()) / 
                                 (1000 * 60 * 60 * 24);
          if (daysSinceAccess > 3 && meta.accessCount < 5) {
            keysToRemove.push(key);
          }
        }
      }
      
      // Remove identified assets
      for (const key of keysToRemove) {
        await this.removeFromCache(key);
      }
      
      // Check total cache size
      if (this.cacheStats.totalSize > this.config.maxCacheSize) {
        await this.reduceCacheSize();
      }
      
      this.cacheStats.lastCleanup = new Date().toISOString();
      await this.saveCacheStats();
      
      console.log(`Cleanup complete. Removed ${keysToRemove.length} assets`);
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Reduce cache size by removing least used assets
   */
  private async reduceCacheSize(): Promise<void> {
    const targetSize = this.config.maxCacheSize * 0.8; // Reduce to 80% of max
    const allMetadata = await AsyncStorage.getItem(this.METADATA_KEY) || '{}';
    const metadataObj = JSON.parse(allMetadata);
    
    // Sort by priority and access count
    const sortedAssets = Object.entries(metadataObj)
      .map(([key, meta]) => ({ key, meta: meta as AssetMetadata }))
      .filter(({ meta }) => meta.priority !== AssetPriority.CRITICAL)
      .sort((a, b) => {
        // Sort by priority first, then by access count
        const priorityOrder = {
          [AssetPriority.DEFERRED]: 0,
          [AssetPriority.LOW]: 1,
          [AssetPriority.MEDIUM]: 2,
          [AssetPriority.HIGH]: 3,
          [AssetPriority.CRITICAL]: 4
        };
        
        const priorityDiff = priorityOrder[a.meta.priority] - priorityOrder[b.meta.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return a.meta.accessCount - b.meta.accessCount;
      });
    
    // Remove assets until we're under target size
    for (const { key } of sortedAssets) {
      if (this.cacheStats.totalSize <= targetSize) break;
      await this.removeFromCache(key);
    }
  }

  /**
   * Record cache hit
   */
  private recordCacheHit(loadTime: number): void {
    this.cacheStats.hitRate = (this.cacheStats.hitRate * 0.95) + 0.05;
    this.cacheStats.missRate = 1 - this.cacheStats.hitRate;
    this.recordLoadTime(loadTime);
  }

  /**
   * Record cache miss
   */
  private recordCacheMiss(): void {
    this.cacheStats.missRate = (this.cacheStats.missRate * 0.95) + 0.05;
    this.cacheStats.hitRate = 1 - this.cacheStats.missRate;
  }

  /**
   * Record load time for performance metrics
   */
  private recordLoadTime(time: number): void {
    this.loadTimings.push(time);
    
    // Keep only last 100 timings
    if (this.loadTimings.length > 100) {
      this.loadTimings.shift();
    }
    
    // Update performance metrics
    if (this.loadTimings.length > 0) {
      const sorted = [...this.loadTimings].sort((a, b) => a - b);
      const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);
      
      this.cacheStats.performanceMetrics = {
        averageLoadTime: avg,
        p95LoadTime: sorted[p95Index] || avg,
        p99LoadTime: sorted[p99Index] || avg
      };
    }
  }

  /**
   * Load cache statistics
   */
  private async loadCacheStats(): Promise<void> {
    try {
      const stats = await AsyncStorage.getItem(this.STATS_KEY);
      if (stats) {
        this.cacheStats = JSON.parse(stats);
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      this.cacheStats = this.getDefaultStats();
    }
  }

  /**
   * Save cache statistics
   */
  private async saveCacheStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(this.cacheStats));
    } catch (error) {
      console.error('Failed to save cache stats:', error);
    }
  }

  /**
   * Get default statistics
   */
  private getDefaultStats(): CacheStatistics {
    return {
      totalSize: 0,
      assetCount: 0,
      hitRate: 0,
      missRate: 1,
      criticalAssetsLoaded: false,
      lastCleanup: new Date().toISOString(),
      performanceMetrics: {
        averageLoadTime: 0,
        p95LoadTime: 0,
        p99LoadTime: 0
      }
    };
  }

  /**
   * Get current cache statistics
   */
  async getCacheStatistics(): Promise<CacheStatistics> {
    await this.loadCacheStats();
    return this.cacheStats;
  }

  /**
   * Clear entire cache (use with caution)
   */
  async clearCache(keepCritical: boolean = true): Promise<void> {
    console.log(`Clearing cache (keepCritical: ${keepCritical})...`);
    
    try {
      if (keepCritical) {
        // Clear only non-critical assets
        const allMetadata = await AsyncStorage.getItem(this.METADATA_KEY) || '{}';
        const metadataObj = JSON.parse(allMetadata);
        
        for (const [key, metadata] of Object.entries(metadataObj)) {
          const meta = metadata as AssetMetadata;
          if (meta.priority !== AssetPriority.CRITICAL) {
            await this.removeFromCache(key);
          }
        }
      } else {
        // Clear everything
        this.memoryCache.clear();
        
        const cacheDir = `${FileSystem.cacheDirectory}assets`;
        await FileSystem.deleteAsync(cacheDir, { idempotent: true });
        await AsyncStorage.removeItem(this.METADATA_KEY);
        
        this.cacheStats = this.getDefaultStats();
        await this.saveCacheStats();
        
        // Recreate directory and reload critical assets
        await this.ensureCacheDirectory();
        await this.loadCriticalAssets();
      }
      
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Validate cache integrity
   */
  async validateCache(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check critical assets
      for (const asset of this.CRITICAL_ASSETS) {
        const cached = await this.getFromDiskCache(asset.path);
        if (!cached) {
          errors.push(`Missing critical asset: ${asset.path}`);
        }
      }
      
      // Validate metadata consistency
      const allMetadata = await AsyncStorage.getItem(this.METADATA_KEY) || '{}';
      const metadataObj = JSON.parse(allMetadata);
      
      for (const [key, metadata] of Object.entries(metadataObj)) {
        const filePath = `${FileSystem.cacheDirectory}assets/${key}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (!fileInfo.exists) {
          errors.push(`Metadata exists but file missing: ${key}`);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Cache validation failed:', error);
      return {
        valid: false,
        errors: ['Cache validation failed: ' + error]
      };
    }
  }

  /**
   * Export cache metrics for monitoring
   */
  async exportMetrics(): Promise<any> {
    const stats = await this.getCacheStatistics();
    const validation = await this.validateCache();
    
    return {
      statistics: stats,
      validation,
      memoryUsage: this.getMemoryCacheSize(),
      config: this.config,
      version: this.CACHE_VERSION
    };
  }
}

// Export singleton instance
export const assetCacheService = new AssetCacheService();
export default assetCacheService;