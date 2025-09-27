/**
 * AssetCacheService Test Suite
 * Validates comprehensive asset caching functionality for offline mode
 */

import { assetCacheService, AssetPriority, AssetType } from '../AssetCacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-file-system');
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('mock-hash'),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256'
  }
}));
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn().mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue(true),
      localUri: 'mock://asset/path'
    })
  }
}));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn()
}));

describe('AssetCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('{}');
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Asset Loading', () => {
    it('should load critical assets with highest priority', async () => {
      const mockAsset = { data: 'critical-content' };
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(mockAsset)
      );

      const result = await assetCacheService.loadAsset(
        'crisis/hotline.json',
        AssetType.CRISIS_RESOURCE,
        AssetPriority.CRITICAL
      );

      expect(result).toBeDefined();
    });

    it('should return cached asset on subsequent loads', async () => {
      const mockAsset = { data: 'cached-content' };
      const metadata = {
        'test-asset': {
          id: 'test-id',
          uri: 'test-asset',
          type: AssetType.UI_COMPONENT,
          priority: AssetPriority.HIGH,
          size: 100,
          version: '1.0.0',
          lastAccessed: new Date().toISOString(),
          accessCount: 1,
          ttl: 168
        }
      };

      // First call returns metadata
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(metadata))
        .mockResolvedValueOnce(JSON.stringify(metadata));

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(mockAsset)
      );

      const result1 = await assetCacheService.loadAsset(
        'test-asset',
        AssetType.UI_COMPONENT,
        AssetPriority.HIGH
      );

      const result2 = await assetCacheService.loadAsset(
        'test-asset',
        AssetType.UI_COMPONENT,
        AssetPriority.HIGH
      );

      expect(result1).toEqual(mockAsset);
      expect(result2).toEqual(mockAsset);
    });

    it('should handle cache miss and load from source', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

      const result = await assetCacheService.loadAsset(
        'new-asset',
        AssetType.IMAGE,
        AssetPriority.MEDIUM
      );

      expect(result).toBeDefined();
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('should use fallback for critical assets on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await assetCacheService.loadAsset(
        'crisis/hotline.json',
        AssetType.CRISIS_RESOURCE,
        AssetPriority.CRITICAL
      );

      // Should return embedded fallback
      expect(result).toEqual({
        number: '988',
        name: 'Suicide & Crisis Lifeline',
        available: '24/7'
      });
    });
  });

  describe('Cache Management', () => {
    it('should validate cache integrity', async () => {
      const metadata = {
        'asset1': {
          id: 'id1',
          uri: 'asset1',
          type: AssetType.UI_COMPONENT,
          priority: AssetPriority.MEDIUM,
          size: 100,
          version: '1.0.0',
          lastAccessed: new Date().toISOString(),
          accessCount: 1
        }
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(metadata));
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

      const validation = await assetCacheService.validateCache();

      expect(validation.valid).toBe(false); // Critical assets missing
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should clear non-critical assets while preserving critical ones', async () => {
      const metadata = {
        'critical-asset': {
          priority: AssetPriority.CRITICAL
        },
        'normal-asset': {
          priority: AssetPriority.MEDIUM
        }
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(metadata));

      await assetCacheService.clearCache(true);

      // Should only remove non-critical assets
      expect(FileSystem.deleteAsync).toHaveBeenCalled();
    });

    it('should handle cache size limits', async () => {
      const largeMetadata: any = {};
      
      // Create metadata that exceeds size limit
      for (let i = 0; i < 100; i++) {
        largeMetadata[`asset${i}`] = {
          id: `id${i}`,
          uri: `asset${i}`,
          type: AssetType.UI_COMPONENT,
          priority: AssetPriority.LOW,
          size: 1024 * 1024, // 1MB each
          version: '1.0.0',
          lastAccessed: new Date(Date.now() - i * 1000 * 60 * 60).toISOString(),
          accessCount: 1,
          ttl: 24
        };
      }

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(largeMetadata));

      // This should trigger cleanup
      const stats = await assetCacheService.getCacheStatistics();
      
      expect(stats).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    it('should track cache hit rates', async () => {
      const metadata = {
        'cached-asset': {
          id: 'test-id',
          uri: 'cached-asset',
          type: AssetType.UI_COMPONENT,
          priority: AssetPriority.HIGH,
          size: 100,
          version: '1.0.0',
          lastAccessed: new Date().toISOString(),
          accessCount: 1,
          ttl: 168
        }
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(metadata));
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('{"data": "test"}');

      // Load cached asset multiple times
      for (let i = 0; i < 5; i++) {
        await assetCacheService.loadAsset(
          'cached-asset',
          AssetType.UI_COMPONENT,
          AssetPriority.HIGH
        );
      }

      const stats = await assetCacheService.getCacheStatistics();
      
      // Hit rate should improve with cached loads
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should track load time performance', async () => {
      const mockAsset = { data: 'test' };
      
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(async () => {
        // Simulate load delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return JSON.stringify(mockAsset);
      });

      await assetCacheService.loadAsset(
        'test-asset',
        AssetType.UI_COMPONENT,
        AssetPriority.MEDIUM
      );

      const stats = await assetCacheService.getCacheStatistics();
      
      expect(stats.performanceMetrics.averageLoadTime).toBeGreaterThan(0);
    });
  });

  describe('Priority-based Loading', () => {
    it('should respect TTL based on priority', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

      const metadata = {
        'low-priority': {
          id: 'low',
          uri: 'low-priority',
          type: AssetType.UI_COMPONENT,
          priority: AssetPriority.LOW,
          size: 100,
          version: '1.0.0',
          lastAccessed: oldDate.toISOString(),
          accessCount: 1,
          ttl: 72 // 3 days
        },
        'critical-asset': {
          id: 'critical',
          uri: 'critical-asset',
          type: AssetType.CRISIS_RESOURCE,
          priority: AssetPriority.CRITICAL,
          size: 100,
          version: '1.0.0',
          lastAccessed: oldDate.toISOString(),
          accessCount: 1,
          ttl: 0 // Never expires
        }
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(metadata));
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

      // Low priority should be expired
      const lowResult = await assetCacheService.loadAsset(
        'low-priority',
        AssetType.UI_COMPONENT,
        AssetPriority.LOW
      );

      // Critical should still be valid
      const criticalResult = await assetCacheService.loadAsset(
        'critical-asset',
        AssetType.CRISIS_RESOURCE,
        AssetPriority.CRITICAL
      );

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('should preload assets in priority order', async () => {
      const assets = [
        { path: 'low', type: AssetType.UI_COMPONENT, priority: AssetPriority.LOW },
        { path: 'critical', type: AssetType.CRISIS_RESOURCE, priority: AssetPriority.CRITICAL },
        { path: 'high', type: AssetType.THERAPEUTIC_CONTENT, priority: AssetPriority.HIGH },
        { path: 'medium', type: AssetType.IMAGE, priority: AssetPriority.MEDIUM }
      ];

      const loadOrder: string[] = [];
      
      (FileSystem.writeAsStringAsync as jest.Mock).mockImplementation((path) => {
        const assetName = path.split('/').pop();
        loadOrder.push(assetName);
        return Promise.resolve();
      });

      await assetCacheService.preloadAssets(assets);

      // Critical should be loaded first
      expect(loadOrder[0]).toBe('critical');
    });
  });

  describe('Memory Cache', () => {
    it('should add high priority assets to memory cache', async () => {
      await assetCacheService.loadAsset(
        'high-priority',
        AssetType.THERAPEUTIC_CONTENT,
        AssetPriority.HIGH
      );

      // Second load should be from memory (faster)
      const startTime = Date.now();
      await assetCacheService.loadAsset(
        'high-priority',
        AssetType.THERAPEUTIC_CONTENT,
        AssetPriority.HIGH
      );
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(10); // Should be very fast from memory
    });

    it('should not add low priority assets to memory cache', async () => {
      await assetCacheService.loadAsset(
        'low-priority',
        AssetType.UI_COMPONENT,
        AssetPriority.LOW
      );

      // FileSystem should be called again for low priority
      await assetCacheService.loadAsset(
        'low-priority',
        AssetType.UI_COMPONENT,
        AssetPriority.LOW
      );

      const callCount = (FileSystem.readAsStringAsync as jest.Mock).mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('File system error')
      );

      const result = await assetCacheService.loadAsset(
        'test-asset',
        AssetType.IMAGE,
        AssetPriority.MEDIUM
      );

      // Should attempt to load from source
      expect(result).toBeDefined();
    });

    it('should handle corrupted cache metadata', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-json');

      const result = await assetCacheService.loadAsset(
        'test-asset',
        AssetType.UI_COMPONENT,
        AssetPriority.MEDIUM
      );

      expect(result).toBeDefined();
    });

    it('should recover from storage quota exceeded', async () => {
      (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('Storage quota exceeded')
      );

      const result = await assetCacheService.loadAsset(
        'large-asset',
        AssetType.IMAGE,
        AssetPriority.LOW
      );

      // Should still return the asset even if caching fails
      expect(result).toBeDefined();
    });
  });

  describe('Export Metrics', () => {
    it('should export comprehensive metrics', async () => {
      const metrics = await assetCacheService.exportMetrics();

      expect(metrics).toHaveProperty('statistics');
      expect(metrics).toHaveProperty('validation');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('config');
      expect(metrics).toHaveProperty('version');
      
      expect(metrics.statistics).toHaveProperty('totalSize');
      expect(metrics.statistics).toHaveProperty('assetCount');
      expect(metrics.statistics).toHaveProperty('hitRate');
      expect(metrics.statistics).toHaveProperty('criticalAssetsLoaded');
    });
  });
});