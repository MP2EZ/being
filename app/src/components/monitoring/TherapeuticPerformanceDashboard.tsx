/**
 * Therapeutic Performance Dashboard - Phase 4.3A Implementation
 * 
 * Real-time performance monitoring dashboard for therapeutic effectiveness
 * with New Architecture optimization metrics and clinical compliance tracking.
 * 
 * DASHBOARD FEATURES:
 * - Real-time performance metrics visualization
 * - Crisis response time monitoring (<200ms guarantee)
 * - Clinical calculation accuracy tracking (100% required)
 * - Breathing session 60fps validation
 * - Memory optimization monitoring
 * - TurboModule effectiveness metrics
 * 
 * ✅ PRESSABLE MIGRATION: TouchableOpacity → Pressable with New Architecture optimization
 * - Enhanced android_ripple configuration for monitoring interface
 * - Improved accessibility with proper labeling for performance data
 * - Optimized hit areas for better usability in monitoring context
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert, Pressable } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolateColor,
  useDerivedValue
} from '../../utils/ReanimatedMock';

import { enhancedTherapeuticPerformanceMonitor, TherapeuticPerformanceDashboard } from '../../utils/EnhancedTherapeuticPerformanceMonitor';
import { enhancedClinicalCalculationAccelerator } from '../../services/EnhancedClinicalCalculationAccelerator';
import { enhancedBreathingPerformanceOptimizer } from '../../utils/EnhancedBreathingPerformanceOptimizer';
import { turboStoreManager } from '../../store/newarch/TurboStoreManager';

// Dashboard configuration
interface DashboardConfig {
  refreshInterval: number; // milliseconds
  enableRealTimeMetrics: boolean;
  enableAlerts: boolean;
  showDetailedMetrics: boolean;
  autoOptimization: boolean;
  performanceThresholds: {
    crisisResponse: number; // ms
    calculationTime: number; // ms
    frameRate: number; // fps
    memoryUsage: number; // MB
  };
}

// Performance status indicators
type PerformanceStatus = 'excellent' | 'good' | 'concerning' | 'critical';

// Dashboard props
interface TherapeuticPerformanceDashboardProps {
  config?: Partial<DashboardConfig>;
  onPerformanceAlert?: (alert: PerformanceAlert) => void;
  onOptimizationRecommendation?: (recommendation: OptimizationRecommendation) => void;
}

// Component state
interface DashboardState {
  dashboard: TherapeuticPerformanceDashboard | null;
  isLoading: boolean;
  lastUpdate: number;
  autoRefresh: boolean;
  selectedMetric: 'overview' | 'crisis' | 'calculations' | 'breathing' | 'memory' | 'newarch';
}

/**
 * Therapeutic Performance Dashboard Component
 */
export const TherapeuticPerformanceDashboard: React.FC<TherapeuticPerformanceDashboardProps> = ({
  config,
  onPerformanceAlert,
  onOptimizationRecommendation
}) => {
  // Configuration with defaults
  const dashboardConfig: DashboardConfig = useMemo(() => ({
    refreshInterval: 2000, // 2 seconds
    enableRealTimeMetrics: true,
    enableAlerts: true,
    showDetailedMetrics: true,
    autoOptimization: false,
    performanceThresholds: {
      crisisResponse: 200,
      calculationTime: 50,
      frameRate: 58,
      memoryUsage: 100
    },
    ...config
  }), [config]);

  // Component state
  const [state, setState] = useState<DashboardState>({
    dashboard: null,
    isLoading: true,
    lastUpdate: 0,
    autoRefresh: true,
    selectedMetric: 'overview'
  });

  // Animation values
  const healthIndicator = useSharedValue(0);
  const alertsCount = useSharedValue(0);
  const optimizationLevel = useSharedValue(0);

  // Load dashboard data
  const loadDashboardData = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      // Get comprehensive performance dashboard
      const dashboard = enhancedTherapeuticPerformanceMonitor.getPerformanceDashboard();

      // Update animated values
      const healthValue = dashboard.overallHealth === 'excellent' ? 1 : 
                         dashboard.overallHealth === 'good' ? 0.75 :
                         dashboard.overallHealth === 'concerning' ? 0.5 : 0.25;
      
      healthIndicator.value = withTiming(healthValue, { duration: 1000 });
      alertsCount.value = withTiming(dashboard.criticalAlerts.length, { duration: 500 });
      optimizationLevel.value = withTiming(dashboard.newArchitectureEffectiveness / 100, { duration: 1000 });

      setState(prev => ({
        ...prev,
        dashboard,
        isLoading: false,
        lastUpdate: Date.now()
      }));

      // Handle alerts
      if (dashboardConfig.enableAlerts && dashboard.criticalAlerts.length > 0) {
        dashboard.criticalAlerts.forEach(alert => {
          if (onPerformanceAlert) {
            onPerformanceAlert(alert);
          }
        });
      }

      // Handle optimization recommendations
      if (dashboard.optimizationRecommendations.length > 0) {
        dashboard.optimizationRecommendations
          .filter(rec => rec.priority === 'high')
          .forEach(recommendation => {
            if (onOptimizationRecommendation) {
              onOptimizationRecommendation(recommendation);
            }
          });
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [dashboardConfig.enableAlerts, onPerformanceAlert, onOptimizationRecommendation]);

  // Auto-refresh setup
  useEffect(() => {
    if (!state.autoRefresh || !dashboardConfig.enableRealTimeMetrics) return;

    const interval = setInterval(loadDashboardData, dashboardConfig.refreshInterval);
    return () => clearInterval(interval);
  }, [state.autoRefresh, dashboardConfig.enableRealTimeMetrics, dashboardConfig.refreshInterval, loadDashboardData]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Auto-optimization effect
  useEffect(() => {
    if (!dashboardConfig.autoOptimization || !state.dashboard) return;

    const needsOptimization = 
      state.dashboard.overallHealth === 'concerning' || 
      state.dashboard.overallHealth === 'critical' ||
      state.dashboard.criticalAlerts.length > 0;

    if (needsOptimization) {
      console.log('🔧 Auto-optimization triggered by performance dashboard');
      performOptimization();
    }
  }, [state.dashboard, dashboardConfig.autoOptimization]);

  // Perform system optimization
  const performOptimization = useCallback(async (): Promise<void> => {
    try {
      console.log('🚀 Starting system optimization...');

      await Promise.all([
        turboStoreManager.optimizeForTherapeuticSession('therapeutic', 180000),
        enhancedClinicalCalculationAccelerator.updateConfiguration({ enableTurboAcceleration: true }),
        enhancedBreathingPerformanceOptimizer.optimizeStore?.()
      ]);

      // Refresh dashboard after optimization
      setTimeout(loadDashboardData, 1000);

      console.log('✅ System optimization completed');
    } catch (error) {
      console.error('System optimization failed:', error);
      Alert.alert('Optimization Failed', 'Unable to optimize system performance. Please try again.');
    }
  }, [loadDashboardData]);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback((): void => {
    setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }));
  }, []);

  // Change selected metric view
  const selectMetric = useCallback((metric: DashboardState['selectedMetric']): void => {
    setState(prev => ({ ...prev, selectedMetric: metric }));
  }, []);

  // Animated styles
  const healthIndicatorStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      healthIndicator.value,
      [0, 0.25, 0.5, 0.75, 1],
      ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE']
    );

    return {
      backgroundColor,
      transform: [{ scale: withTiming(0.8 + healthIndicator.value * 0.4) }]
    };
  });

  const alertsIndicatorStyle = useAnimatedStyle(() => {
    const opacity = alertsCount.value > 0 ? 1 : 0.3;
    const scale = alertsCount.value > 0 ? 1.1 : 1;

    return {
      opacity: withTiming(opacity),
      transform: [{ scale: withTiming(scale) }]
    };
  });

  // Helper functions
  const getStatusColor = (status: PerformanceStatus): string => {
    switch (status) {
      case 'excellent': return '#00C7BE';
      case 'good': return '#34C759';
      case 'concerning': return '#FFCC00';
      case 'critical': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const formatMetricValue = (value: number, unit: string): string => {
    if (unit === 'ms') {
      return `${value.toFixed(1)}ms`;
    } else if (unit === 'fps') {
      return `${value.toFixed(1)}fps`;
    } else if (unit === 'MB') {
      return `${value.toFixed(1)}MB`;
    } else if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return `${value.toFixed(1)}`;
  };

  // Render loading state
  if (state.isLoading || !state.dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Performance Dashboard...</Text>
      </View>
    );
  }

  const { dashboard } = state;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={state.isLoading}
          onRefresh={loadDashboardData}
          tintColor="#00C7BE"
        />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Therapeutic Performance</Text>
        <View style={styles.headerControls}>
          <Animated.View style={[styles.healthIndicator, healthIndicatorStyle]}>
            <Text style={styles.healthText}>
              {dashboard.overallHealth.toUpperCase()}
            </Text>
          </Animated.View>
          
          <Animated.View style={[styles.alertsIndicator, alertsIndicatorStyle]}>
            <Text style={styles.alertsText}>
              {dashboard.criticalAlerts.length} alerts
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Quick Stats Section */}
      <View style={styles.quickStatsContainer}>
        <QuickStatCard
          title="Active Sessions"
          value={dashboard.activeSessions.toString()}
          status={dashboard.activeSessions > 0 ? 'good' : 'concerning'}
        />
        <QuickStatCard
          title="New Arch Effectiveness"
          value={`${dashboard.newArchitectureEffectiveness.toFixed(1)}%`}
          status={dashboard.newArchitectureEffectiveness >= 80 ? 'excellent' : 'concerning'}
        />
        <QuickStatCard
          title="Crisis Response"
          value={formatMetricValue(dashboard.realTimeMetrics.avgCrisisResponseTime, 'ms')}
          status={dashboard.realTimeMetrics.avgCrisisResponseTime <= 200 ? 'excellent' : 'critical'}
          threshold={dashboardConfig.performanceThresholds.crisisResponse}
        />
        <QuickStatCard
          title="Current FPS"
          value={formatMetricValue(dashboard.realTimeMetrics.currentFPS, 'fps')}
          status={dashboard.realTimeMetrics.currentFPS >= 58 ? 'excellent' : 'concerning'}
          threshold={dashboardConfig.performanceThresholds.frameRate}
        />
      </View>

      {/* Metric Selection Tabs */}
      <View style={styles.tabsContainer}>
        {(['overview', 'crisis', 'calculations', 'breathing', 'memory', 'newarch'] as const).map(tab => (
          <TabButton
            key={tab}
            title={tab}
            isSelected={state.selectedMetric === tab}
            onPress={() => selectMetric(tab)}
          />
        ))}
      </View>

      {/* Detailed Metrics Section */}
      <View style={styles.metricsContainer}>
        {state.selectedMetric === 'overview' && (
          <OverviewMetrics dashboard={dashboard} config={dashboardConfig} />
        )}
        {state.selectedMetric === 'crisis' && (
          <CrisisMetrics dashboard={dashboard} config={dashboardConfig} />
        )}
        {state.selectedMetric === 'calculations' && (
          <CalculationMetrics dashboard={dashboard} config={dashboardConfig} />
        )}
        {state.selectedMetric === 'breathing' && (
          <BreathingMetrics dashboard={dashboard} config={dashboardConfig} />
        )}
        {state.selectedMetric === 'memory' && (
          <MemoryMetrics dashboard={dashboard} config={dashboardConfig} />
        )}
        {state.selectedMetric === 'newarch' && (
          <NewArchMetrics dashboard={dashboard} config={dashboardConfig} />
        )}
      </View>

      {/* Critical Alerts Section */}
      {dashboard.criticalAlerts.length > 0 && (
        <View style={styles.alertsContainer}>
          <Text style={styles.alertsTitle}>Critical Alerts</Text>
          {dashboard.criticalAlerts.map((alert, index) => (
            <AlertCard key={index} alert={alert} />
          ))}
        </View>
      )}

      {/* Optimization Recommendations */}
      {dashboard.optimizationRecommendations.length > 0 && (
        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Optimization Recommendations</Text>
          {dashboard.optimizationRecommendations.slice(0, 5).map((recommendation, index) => (
            <RecommendationCard key={index} recommendation={recommendation} />
          ))}
        </View>
      )}

      {/* Footer with last update time */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date(state.lastUpdate).toLocaleTimeString()}
        </Text>
        <Text style={styles.footerText}>
          Auto-refresh: {state.autoRefresh ? 'ON' : 'OFF'}
        </Text>
      </View>
    </ScrollView>
  );
};

// Quick stat card component
const QuickStatCard: React.FC<{
  title: string;
  value: string;
  status: PerformanceStatus;
  threshold?: number;
}> = ({ title, value, status, threshold }) => {
  const statusColor = getStatusColor(status);

  return (
    <View style={[styles.quickStatCard, { borderLeftColor: statusColor }]}>
      <Text style={styles.quickStatTitle}>{title}</Text>
      <Text style={[styles.quickStatValue, { color: statusColor }]}>{value}</Text>
      {threshold && (
        <Text style={styles.quickStatThreshold}>Target: {threshold}</Text>
      )}
    </View>
  );
};

// Tab button component
const TabButton: React.FC<{
  title: string;
  isSelected: boolean;
  onPress: () => void;
}> = ({ title, isSelected, onPress }) => (
  <Pressable
    style={({ pressed }) => [
      styles.tabButton, 
      isSelected && styles.tabButtonSelected,
      pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
    ]}
    onPress={onPress}
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel={`${title} tab`}
    android_ripple={{
      color: 'rgba(0, 0, 0, 0.1)',
      borderless: false,
      radius: 100
    }}
    hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}
  >
    <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextSelected]}>
      {title.charAt(0).toUpperCase() + title.slice(1)}
    </Text>
  </Pressable>
);

// Alert card component
const AlertCard: React.FC<{ alert: PerformanceAlert }> = ({ alert }) => {
  const severityColor = alert.severity === 'critical' ? '#FF3B30' : 
                       alert.severity === 'warning' ? '#FFCC00' : '#007AFF';

  return (
    <View style={[styles.alertCard, { borderLeftColor: severityColor }]}>
      <View style={styles.alertHeader}>
        <Text style={[styles.alertSeverity, { color: severityColor }]}>
          {alert.severity.toUpperCase()}
        </Text>
        <Text style={styles.alertCategory}>{alert.category}</Text>
      </View>
      <Text style={styles.alertMessage}>{alert.message}</Text>
      <Text style={styles.alertAction}>Recommended: {alert.recommendedAction}</Text>
      <Text style={styles.alertTime}>
        {new Date(alert.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
};

// Recommendation card component
const RecommendationCard: React.FC<{ recommendation: OptimizationRecommendation }> = ({ recommendation }) => {
  const priorityColor = recommendation.priority === 'high' ? '#FF3B30' :
                       recommendation.priority === 'medium' ? '#FFCC00' : '#34C759';

  return (
    <View style={[styles.recommendationCard, { borderLeftColor: priorityColor }]}>
      <View style={styles.recommendationHeader}>
        <Text style={[styles.recommendationPriority, { color: priorityColor }]}>
          {recommendation.priority.toUpperCase()}
        </Text>
        <Text style={styles.recommendationCategory}>{recommendation.category}</Text>
      </View>
      <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
      <Text style={styles.recommendationImpact}>Impact: {recommendation.estimatedImpact}</Text>
      <Text style={styles.recommendationComplexity}>
        Complexity: {recommendation.implementationComplexity}
      </Text>
    </View>
  );
};

// Detailed metric components would go here...
// OverviewMetrics, CrisisMetrics, CalculationMetrics, BreathingMetrics, MemoryMetrics, NewArchMetrics

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93'
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E'
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  healthIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center'
  },
  healthText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  alertsIndicator: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  alertsText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  },
  quickStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12
  },
  quickStatCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  quickStatTitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2
  },
  quickStatThreshold: {
    fontSize: 10,
    color: '#8E8E93'
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA'
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabButtonSelected: {
    borderBottomColor: '#00C7BE'
  },
  tabButtonText: {
    fontSize: 14,
    color: '#8E8E93'
  },
  tabButtonTextSelected: {
    color: '#00C7BE',
    fontWeight: '600'
  },
  metricsContainer: {
    padding: 16
  },
  alertsContainer: {
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12
  },
  alertsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12
  },
  alertCard: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8
  },
  alertCategory: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase'
  },
  alertMessage: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 4
  },
  alertAction: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4
  },
  alertTime: {
    fontSize: 10,
    color: '#8E8E93'
  },
  recommendationsContainer: {
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12
  },
  recommendationCard: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  recommendationPriority: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8
  },
  recommendationCategory: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase'
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 4
  },
  recommendationImpact: {
    fontSize: 12,
    color: '#34C759',
    marginBottom: 2
  },
  recommendationComplexity: {
    fontSize: 12,
    color: '#8E8E93'
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: 'white'
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4
  }
});

// Helper function for status colors
const getStatusColor = (status: PerformanceStatus): string => {
  switch (status) {
    case 'excellent': return '#00C7BE';
    case 'good': return '#34C759';
    case 'concerning': return '#FFCC00';
    case 'critical': return '#FF3B30';
    default: return '#8E8E93';
  }
};

export default TherapeuticPerformanceDashboard;