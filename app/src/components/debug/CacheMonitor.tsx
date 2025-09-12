/**
 * CacheMonitor Component - Debug and monitoring interface for asset cache
 * Provides real-time cache statistics and management tools
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl
} from 'react-native';
import { assetCacheService } from '../../services/AssetCacheService';

interface CacheMonitorProps {
  visible?: boolean;
  onClose?: () => void;
}

/**
 * Cache monitoring dashboard for development
 */
export const CacheMonitor: React.FC<CacheMonitorProps> = ({
  visible = true,
  onClose
}) => {
  const [stats, setStats] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const metrics = await assetCacheService.exportMetrics();
      setStats(metrics.statistics);
      setValidation(metrics.validation);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  useEffect(() => {
    if (visible) {
      loadStats();
      
      // Auto-refresh every 5 seconds when visible
      const interval = setInterval(loadStats, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [visible, loadStats]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache',
      'Do you want to keep critical assets?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await assetCacheService.clearCache(false);
            await loadStats();
          }
        },
        {
          text: 'Keep Critical',
          onPress: async () => {
            await assetCacheService.clearCache(true);
            await loadStats();
          }
        }
      ]
    );
  }, [loadStats]);

  const handleValidateCache = useCallback(async () => {
    const result = await assetCacheService.validateCache();
    setValidation(result);
    
    if (!result.valid) {
      Alert.alert(
        'Cache Validation Failed',
        `Found ${result.errors.length} errors:\n${result.errors.slice(0, 3).join('\n')}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Cache Valid', 'All cache entries are valid', [{ text: 'OK' }]);
    }
  }, []);

  if (!visible || !stats) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const hitRateColor = stats.hitRate > 0.9 ? '#4CAF50' : 
                       stats.hitRate > 0.7 ? '#FF9800' : '#F44336';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cache Monitor</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Cache Overview</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Size:</Text>
            <Text style={styles.statValue}>{formatBytes(stats.totalSize)}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Asset Count:</Text>
            <Text style={styles.statValue}>{stats.assetCount}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Hit Rate:</Text>
            <Text style={[styles.statValue, { color: hitRateColor }]}>
              {(stats.hitRate * 100).toFixed(1)}%
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Critical Assets:</Text>
            <Text style={[
              styles.statValue,
              { color: stats.criticalAssetsLoaded ? '#4CAF50' : '#F44336' }
            ]}>
              {stats.criticalAssetsLoaded ? 'Loaded' : 'Not Loaded'}
            </Text>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Performance</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Avg Load Time:</Text>
            <Text style={styles.statValue}>
              {formatTime(stats.performanceMetrics.averageLoadTime)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>P95 Load Time:</Text>
            <Text style={styles.statValue}>
              {formatTime(stats.performanceMetrics.p95LoadTime)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>P99 Load Time:</Text>
            <Text style={styles.statValue}>
              {formatTime(stats.performanceMetrics.p99LoadTime)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last Cleanup:</Text>
            <Text style={styles.statValue}>
              {new Date(stats.lastCleanup).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        {/* Validation Status */}
        {validation && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Validation</Text>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Status:</Text>
              <Text style={[
                styles.statValue,
                { color: validation.valid ? '#4CAF50' : '#F44336' }
              ]}>
                {validation.valid ? 'Valid' : 'Invalid'}
              </Text>
            </View>
            
            {validation.errors && validation.errors.length > 0 && (
              <TouchableOpacity 
                onPress={() => setExpanded(!expanded)}
                style={styles.expandButton}
              >
                <Text style={styles.expandText}>
                  {expanded ? 'Hide' : 'Show'} Errors ({validation.errors.length})
                </Text>
              </TouchableOpacity>
            )}
            
            {expanded && validation.errors && (
              <View style={styles.errorList}>
                {validation.errors.map((error: string, index: number) => (
                  <Text key={index} style={styles.errorItem}>• {error}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleValidateCache}
          >
            <Text style={styles.actionButtonText}>Validate Cache</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.warningButton]}
            onPress={handleClearCache}
          >
            <Text style={styles.actionButtonText}>Clear Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Debug Info */}
        {__DEV__ && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Debug Info</Text>
            <Text style={styles.debugText}>
              {JSON.stringify({ stats, validation }, null, 2)}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  closeButton: {
    padding: 4
  },
  closeText: {
    fontSize: 24,
    color: '#666'
  },
  content: {
    flex: 1
  },
  statsCard: {
    margin: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  statLabel: {
    fontSize: 13,
    color: '#666'
  },
  statValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333'
  },
  actionsCard: {
    margin: 12,
    padding: 12
  },
  actionButton: {
    backgroundColor: '#40B5AD',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center'
  },
  warningButton: {
    backgroundColor: '#FF9F43'
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  expandButton: {
    marginTop: 8,
    padding: 4
  },
  expandText: {
    fontSize: 12,
    color: '#40B5AD',
    textDecorationLine: 'underline'
  },
  errorList: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4
  },
  errorItem: {
    fontSize: 11,
    color: '#F44336',
    paddingVertical: 2
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#666'
  }
});

export default CacheMonitor;