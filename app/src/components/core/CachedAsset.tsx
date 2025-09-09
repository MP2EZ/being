/**
 * CachedAsset Component - Performance-optimized asset loading with caching
 * Provides seamless offline asset loading with fallback support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Image,
  View,
  ActivityIndicator,
  StyleSheet,
  ImageStyle,
  ViewStyle,
  Text,
  Platform
} from 'react-native';
import { 
  assetCacheService, 
  AssetType, 
  AssetPriority 
} from '../../services/AssetCacheService';

interface CachedImageProps {
  source: string | { uri: string };
  style?: ImageStyle;
  priority?: AssetPriority;
  fallback?: React.ReactNode;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

/**
 * Cached Image component with intelligent loading
 */
export const CachedImage: React.FC<CachedImageProps> = React.memo(({
  source,
  style,
  priority = AssetPriority.MEDIUM,
  fallback,
  placeholder,
  onLoad,
  onError,
  testID,
  accessible = true,
  accessibilityLabel
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const sourcePath = useMemo(() => {
    if (typeof source === 'string') {
      return source;
    }
    return source.uri;
  }, [source]);

  const loadImage = useCallback(async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      const asset = await assetCacheService.loadAsset(
        sourcePath,
        AssetType.IMAGE,
        priority
      );

      // Handle different asset types
      if (asset?.localUri) {
        setImageUri(asset.localUri);
      } else if (asset?.uri) {
        setImageUri(asset.uri);
      } else if (typeof asset === 'string') {
        setImageUri(asset);
      } else {
        throw new Error('Invalid asset format');
      }

      const loadTime = Date.now() - startTime;
      
      // Log performance warning for slow loads
      if (priority === AssetPriority.CRITICAL && loadTime > 200) {
        console.warn(`Critical image ${sourcePath} took ${loadTime}ms to load`);
      }

      onLoad?.();
    } catch (err) {
      const error = err as Error;
      console.error(`Failed to load image ${sourcePath}:`, error);
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [sourcePath, priority, onLoad, onError]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  // Show placeholder while loading
  if (loading && placeholder) {
    return (
      <View style={[styles.container, style]} testID={`${testID}-loading`}>
        {placeholder}
      </View>
    );
  }

  // Show loading indicator if no placeholder
  if (loading) {
    return (
      <View style={[styles.container, style]} testID={`${testID}-loading`}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  // Show fallback on error
  if (error && fallback) {
    return (
      <View style={[styles.container, style]} testID={`${testID}-error`}>
        {fallback}
      </View>
    );
  }

  // Show error message if no fallback
  if (error) {
    return (
      <View style={[styles.container, style]} testID={`${testID}-error`}>
        <Text style={styles.errorText}>Failed to load image</Text>
      </View>
    );
  }

  // Render the cached image
  return (
    <Image
      source={{ uri: imageUri! }}
      style={style}
      testID={testID}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      onError={() => {
        setError(new Error('Image failed to render'));
        onError?.(new Error('Image failed to render'));
      }}
    />
  );
});

CachedImage.displayName = 'CachedImage';

interface CachedAssetProps {
  path: string;
  type: AssetType;
  priority?: AssetPriority;
  children: (asset: any, loading: boolean, error: Error | null) => React.ReactNode;
  onLoad?: (asset: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Generic cached asset component for any asset type
 */
export const CachedAsset: React.FC<CachedAssetProps> = React.memo(({
  path,
  type,
  priority = AssetPriority.MEDIUM,
  children,
  onLoad,
  onError
}) => {
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAsset = useCallback(async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      const loadedAsset = await assetCacheService.loadAsset(path, type, priority);
      setAsset(loadedAsset);
      
      const loadTime = Date.now() - startTime;
      
      // Performance monitoring
      if (priority === AssetPriority.CRITICAL && loadTime > 200) {
        console.warn(`Critical asset ${path} took ${loadTime}ms to load`);
      }

      onLoad?.(loadedAsset);
    } catch (err) {
      const error = err as Error;
      console.error(`Failed to load asset ${path}:`, error);
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [path, type, priority, onLoad, onError]);

  useEffect(() => {
    loadAsset();
  }, [loadAsset]);

  return <>{children(asset, loading, error)}</>;
});

CachedAsset.displayName = 'CachedAsset';

interface AssetPreloaderProps {
  assets: Array<{
    path: string;
    type: AssetType;
    priority: AssetPriority;
  }>;
  onComplete?: () => void;
  onProgress?: (loaded: number, total: number) => void;
  children?: React.ReactNode;
}

/**
 * Asset preloader component for batch loading
 */
export const AssetPreloader: React.FC<AssetPreloaderProps> = ({
  assets,
  onComplete,
  onProgress,
  children
}) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const preloadAssets = async () => {
      setLoading(true);
      let loaded = 0;

      // Sort by priority
      const sorted = [...assets].sort((a, b) => {
        const priorityOrder = {
          [AssetPriority.CRITICAL]: 0,
          [AssetPriority.HIGH]: 1,
          [AssetPriority.MEDIUM]: 2,
          [AssetPriority.LOW]: 3,
          [AssetPriority.DEFERRED]: 4
        };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Load critical assets first
      const critical = sorted.filter(a => a.priority === AssetPriority.CRITICAL);
      for (const asset of critical) {
        try {
          await assetCacheService.loadAsset(asset.path, asset.type, asset.priority);
          loaded++;
          setProgress(loaded);
          onProgress?.(loaded, assets.length);
        } catch (error) {
          console.error(`Failed to preload critical asset ${asset.path}:`, error);
        }
      }

      // Load remaining assets in parallel batches
      const remaining = sorted.filter(a => a.priority !== AssetPriority.CRITICAL);
      const batchSize = 3;
      
      for (let i = 0; i < remaining.length; i += batchSize) {
        const batch = remaining.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async asset => {
            try {
              await assetCacheService.loadAsset(asset.path, asset.type, asset.priority);
              loaded++;
              setProgress(loaded);
              onProgress?.(loaded, assets.length);
            } catch (error) {
              console.error(`Failed to preload asset ${asset.path}:`, error);
            }
          })
        );
      }

      setLoading(false);
      onComplete?.();
    };

    preloadAssets();
  }, [assets, onComplete, onProgress]);

  if (loading) {
    return (
      <View style={styles.preloaderContainer}>
        <ActivityIndicator size="large" color="#40B5AD" />
        <Text style={styles.preloaderText}>
          Loading resources... {progress}/{assets.length}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

/**
 * Hook for preloading assets
 */
export const useAssetPreloader = (
  assets: Array<{
    path: string;
    type: AssetType;
    priority: AssetPriority;
  }>
) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const preload = async () => {
      try {
        setLoading(true);
        setError(null);
        
        await assetCacheService.preloadAssets(assets);
        
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    preload();
  }, []);

  return { loading, progress, error };
};

/**
 * Hook for loading a single cached asset
 */
export const useCachedAsset = (
  path: string,
  type: AssetType,
  priority: AssetPriority = AssetPriority.MEDIUM
) => {
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadAsset = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const loadedAsset = await assetCacheService.loadAsset(path, type, priority);
        setAsset(loadedAsset);
        
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    loadAsset();
  }, [path, type, priority]);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const loadedAsset = await assetCacheService.loadAsset(path, type, priority);
      setAsset(loadedAsset);
      
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [path, type, priority]);

  return { asset, loading, error, reload };
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  errorText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center'
  },
  preloaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  preloaderText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666'
  }
});

export default CachedImage;