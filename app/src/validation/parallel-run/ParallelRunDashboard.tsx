/**
 * Parallel Run Dashboard - Phase 5E: Real-Time Monitoring
 * 
 * MISSION: Provide real-time visibility into 24-hour parallel validation
 * CRITICAL: Monitor data integrity, performance, rollback status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { ISODateString } from '../../types/clinical';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import monitoring systems
import ParallelValidationEngine from './ParallelValidationEngine';
import DualStoreOrchestrator from './DualStoreOrchestrator';
import AutomatedRollbackSystem from './AutomatedRollbackSystem';
import ParallelRunPerformanceMonitor, { PERFORMANCE_THRESHOLDS } from './ParallelRunPerformanceMonitor';

interface DashboardData {
  parallelRun: {
    isActive: boolean;
    startTime: ISODateString;
    duration: number;
    operationCount: number;
    healthScore: number;
  };
  validation: {
    discrepancies: number;
    criticalIssues: number;
    rollbacksTriggered: number;
  };
  performance: {
    totalMetrics: number;
    activeAlerts: number;
    complianceRate: number;
    crisisResponseTime: number;
    assessmentResponseTime: number;
  };
  stores: {
    user: { status: string; responseTime: number };
    assessment: { status: string; responseTime: number };
    crisis: { status: string; responseTime: number };
    settings: { status: string; responseTime: number };
  };
}

const ParallelRunDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  /**
   * Load dashboard data
   */
  const loadDashboardData = useCallback(async () => {
    try {
      // Load parallel run status
      const parallelRunStatus = await AsyncStorage.getItem('PARALLEL_RUN_STATUS');
      const validationStatus = await AsyncStorage.getItem('VALIDATION_ENGINE_STATUS');
      const performanceStatus = await AsyncStorage.getItem('PERFORMANCE_MONITORING_STATUS');
      const rollbackHistory = await AsyncStorage.getItem('ROLLBACK_HISTORY');
      const operationStats = await AsyncStorage.getItem('DUAL_STORE_OPERATIONS');

      // Parse data
      const parallelRun = parallelRunStatus ? JSON.parse(parallelRunStatus) : null;
      const validation = validationStatus ? JSON.parse(validationStatus) : null;
      const performance = performanceStatus ? JSON.parse(performanceStatus) : null;
      const rollbacks = rollbackHistory ? JSON.parse(rollbackHistory) : [];
      const operations = operationStats ? JSON.parse(operationStats) : [];

      // Calculate metrics
      const recentOperations = operations.filter((op: any) => 
        Date.now() - new Date(op.timestamp).getTime() < 60000 // Last minute
      );

      const crisisOps = recentOperations.filter((op: any) => op.store === 'CRISIS');
      const assessmentOps = recentOperations.filter((op: any) => op.store === 'ASSESSMENT');

      const avgCrisisTime = crisisOps.length > 0 ? 
        crisisOps.reduce((sum: number, op: any) => sum + op.responseTime, 0) / crisisOps.length : 0;
      
      const avgAssessmentTime = assessmentOps.length > 0 ? 
        assessmentOps.reduce((sum: number, op: any) => sum + op.responseTime, 0) / assessmentOps.length : 0;

      const successfulOps = recentOperations.filter((op: any) => op.success);
      const complianceRate = recentOperations.length > 0 ? 
        (successfulOps.length / recentOperations.length) * 100 : 100;

      const data: DashboardData = {
        parallelRun: {
          isActive: parallelRun?.running || false,
          startTime: parallelRun?.startTime || '',
          duration: parallelRun?.config?.duration || 24,
          operationCount: operations.length,
          healthScore: calculateHealthScore(validation, performance, rollbacks, complianceRate)
        },
        validation: {
          discrepancies: validation?.discrepancies || 0,
          criticalIssues: validation?.criticalIssues || 0,
          rollbacksTriggered: rollbacks.length
        },
        performance: {
          totalMetrics: operations.length,
          activeAlerts: performance?.activeAlerts || 0,
          complianceRate: Math.round(complianceRate * 100) / 100,
          crisisResponseTime: Math.round(avgCrisisTime),
          assessmentResponseTime: Math.round(avgAssessmentTime)
        },
        stores: {
          user: { 
            status: getStoreStatus('USER', recentOperations), 
            responseTime: getStoreAvgResponseTime('USER', recentOperations) 
          },
          assessment: { 
            status: getStoreStatus('ASSESSMENT', recentOperations), 
            responseTime: getStoreAvgResponseTime('ASSESSMENT', recentOperations) 
          },
          crisis: { 
            status: getStoreStatus('CRISIS', recentOperations), 
            responseTime: getStoreAvgResponseTime('CRISIS', recentOperations) 
          },
          settings: { 
            status: getStoreStatus('SETTINGS', recentOperations), 
            responseTime: getStoreAvgResponseTime('SETTINGS', recentOperations) 
          }
        }
      };

      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Calculate overall health score
   */
  const calculateHealthScore = (
    validation: any, 
    performance: any, 
    rollbacks: any[], 
    complianceRate: number
  ): number => {
    let score = 100;

    // Deduct for critical issues
    score -= (validation?.criticalIssues || 0) * 30;
    
    // Deduct for discrepancies
    score -= (validation?.discrepancies || 0) * 5;
    
    // Deduct for rollbacks
    score -= rollbacks.length * 15;
    
    // Deduct for poor compliance
    score -= (100 - complianceRate) * 0.5;

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  /**
   * Get store status
   */
  const getStoreStatus = (storeName: string, operations: any[]): string => {
    const storeOps = operations.filter((op: any) => op.store === storeName);
    if (storeOps.length === 0) return 'IDLE';

    const failedOps = storeOps.filter((op: any) => !op.success);
    const failureRate = failedOps.length / storeOps.length;

    if (failureRate > 0.1) return 'ERROR';
    if (failureRate > 0.05) return 'WARNING';
    return 'HEALTHY';
  };

  /**
   * Get store average response time
   */
  const getStoreAvgResponseTime = (storeName: string, operations: any[]): number => {
    const storeOps = operations.filter((op: any) => op.store === storeName);
    if (storeOps.length === 0) return 0;

    const totalTime = storeOps.reduce((sum: number, op: any) => sum + op.responseTime, 0);
    return Math.round(totalTime / storeOps.length);
  };

  /**
   * Handle refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  /**
   * Handle emergency rollback
   */
  const handleEmergencyRollback = () => {
    Alert.alert(
      'Emergency Rollback',
      'This will immediately rollback all stores to the old implementation. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rollback',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.setItem('EMERGENCY_ROLLBACK_TRIGGER', JSON.stringify({
                timestamp: new Date().toISOString(),
                reason: 'MANUAL_EMERGENCY_ROLLBACK'
              }));
              
              Alert.alert('Success', 'Emergency rollback initiated');
              loadDashboardData();
            } catch (error) {
              Alert.alert('Error', 'Failed to initiate rollback');
            }
          }
        }
      ]
    );
  };

  /**
   * Toggle auto refresh
   */
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!refreshing) {
        loadDashboardData();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refreshing, loadDashboardData]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Parallel Run Dashboard...</Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load dashboard data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Phase 5E: 24-Hour Parallel Run</Text>
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot,
            { backgroundColor: dashboardData.parallelRun.isActive ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={styles.statusText}>
            {dashboardData.parallelRun.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      {/* Health Score */}
      <View style={[styles.card, { backgroundColor: getHealthScoreColor(dashboardData.parallelRun.healthScore) }]}>
        <Text style={styles.cardTitle}>System Health Score</Text>
        <Text style={styles.healthScore}>{dashboardData.parallelRun.healthScore}/100</Text>
      </View>

      {/* Parallel Run Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Parallel Run Status</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Duration:</Text>
          <Text style={styles.value}>{dashboardData.parallelRun.duration} hours</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Operations:</Text>
          <Text style={styles.value}>{dashboardData.parallelRun.operationCount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Start Time:</Text>
          <Text style={styles.value}>
            {dashboardData.parallelRun.startTime ? 
              new Date(dashboardData.parallelRun.startTime).toLocaleString() : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Validation Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data Validation</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Discrepancies:</Text>
          <Text style={[
            styles.value,
            { color: dashboardData.validation.discrepancies > 0 ? '#F44336' : '#4CAF50' }
          ]}>
            {dashboardData.validation.discrepancies}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Critical Issues:</Text>
          <Text style={[
            styles.value,
            { color: dashboardData.validation.criticalIssues > 0 ? '#F44336' : '#4CAF50' }
          ]}>
            {dashboardData.validation.criticalIssues}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Rollbacks:</Text>
          <Text style={styles.value}>{dashboardData.validation.rollbacksTriggered}</Text>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Performance Metrics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Crisis Response:</Text>
          <Text style={[
            styles.value,
            { color: dashboardData.performance.crisisResponseTime > PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE ? '#F44336' : '#4CAF50' }
          ]}>
            {dashboardData.performance.crisisResponseTime}ms
            <Text style={styles.threshold}> (&lt;200ms)</Text>
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Assessment Load:</Text>
          <Text style={[
            styles.value,
            { color: dashboardData.performance.assessmentResponseTime > PERFORMANCE_THRESHOLDS.ASSESSMENT_LOAD ? '#F44336' : '#4CAF50' }
          ]}>
            {dashboardData.performance.assessmentResponseTime}ms
            <Text style={styles.threshold}> (&lt;500ms)</Text>
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Compliance Rate:</Text>
          <Text style={[
            styles.value,
            { color: dashboardData.performance.complianceRate < 95 ? '#F44336' : '#4CAF50' }
          ]}>
            {dashboardData.performance.complianceRate}%
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Active Alerts:</Text>
          <Text style={[
            styles.value,
            { color: dashboardData.performance.activeAlerts > 0 ? '#FF9800' : '#4CAF50' }
          ]}>
            {dashboardData.performance.activeAlerts}
          </Text>
        </View>
      </View>

      {/* Store Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Store Status</Text>
        {Object.entries(dashboardData.stores).map(([storeName, storeData]) => (
          <View key={storeName} style={styles.storeRow}>
            <Text style={styles.storeName}>{storeName.toUpperCase()}</Text>
            <View style={styles.storeMetrics}>
              <View style={[
                styles.storeStatus,
                { backgroundColor: getStatusColor(storeData.status) }
              ]}>
                <Text style={styles.storeStatusText}>{storeData.status}</Text>
              </View>
              <Text style={styles.storeResponseTime}>{storeData.responseTime}ms</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controlsCard}>
        <Text style={styles.cardTitle}>Controls</Text>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: autoRefresh ? '#4CAF50' : '#757575' }]}
            onPress={toggleAutoRefresh}
          >
            <Text style={styles.controlButtonText}>
              Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.emergencyButton]}
            onPress={handleEmergencyRollback}
          >
            <Text style={styles.controlButtonText}>Emergency Rollback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

/**
 * Get color for health score
 */
const getHealthScoreColor = (score: number): string => {
  if (score >= 90) return '#4CAF50'; // Green
  if (score >= 70) return '#FF9800'; // Orange
  return '#F44336'; // Red
};

/**
 * Get color for store status
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'HEALTHY': return '#4CAF50';
    case 'WARNING': return '#FF9800';
    case 'ERROR': return '#F44336';
    default: return '#757575';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  healthScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  threshold: {
    fontSize: 12,
    color: '#999'
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  storeMetrics: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  storeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12
  },
  storeStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white'
  },
  storeResponseTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 50,
    textAlign: 'right'
  },
  controlsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  emergencyButton: {
    backgroundColor: '#F44336'
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default ParallelRunDashboard;