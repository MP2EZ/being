/**
 * PRODUCTION MONITORING DASHBOARD
 * Week 4 Phase 2b - Critical Production Infrastructure
 *
 * COMPREHENSIVE SYSTEM MONITORING:
 * - Real-time system health visualization
 * - Performance metrics against baselines
 * - Circuit breaker states and error rates
 * - Crisis intervention monitoring (safety-critical)
 * - Privacy-compliant metrics display
 *
 * SAFETY-CRITICAL MONITORING:
 * - Crisis detection system status (highest priority)
 * - Authentication service health
 * - Assessment store availability
 * - Sync operations performance
 * - Error rates and alerting status
 *
 * PRIVACY COMPLIANCE:
 * - Zero PHI exposure in all visualizations
 * - Anonymized error patterns
 * - Aggregated performance metrics only
 * - Secure audit trail access
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import our monitoring services
import { monitoringOrchestrator } from '@/core/services/monitoring';
import { resilienceOrchestrator, ProtectedService, CircuitBreakerState } from '@/core/services/resilience';
import { logSecurity, logPerformance } from '@/core/services/logging';
import { spacing, borderRadius, typography } from '@/core/theme';

// Dashboard configuration
const REFRESH_INTERVAL = 5000; // 5 seconds
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Health status color mapping
const HEALTH_COLORS = {
  healthy: '#10B981',    // Green
  degraded: '#F59E0B',   // Amber
  unhealthy: '#EF4444',  // Red
  critical: '#DC2626'    // Dark red
};

// Circuit breaker state colors
const CIRCUIT_COLORS = {
  [CircuitBreakerState.CLOSED]: '#10B981',    // Green
  [CircuitBreakerState.HALF_OPEN]: '#F59E0B', // Amber
  [CircuitBreakerState.OPEN]: '#EF4444'       // Red
};

// Service priority for display ordering
const SERVICE_PRIORITY = {
  [ProtectedService.CRISIS_DETECTION]: 1,
  [ProtectedService.AUTHENTICATION]: 2,
  [ProtectedService.ASSESSMENT_STORE]: 3,
  [ProtectedService.SYNC_OPERATIONS]: 4,
  [ProtectedService.NETWORK_REQUESTS]: 5,
  [ProtectedService.ANALYTICS]: 6,
  [ProtectedService.BACKUP_STORAGE]: 7
};

interface DashboardData {
  systemHealth: {
    overall: 'healthy' | 'degraded' | 'critical';
    criticalServiceFailures: number;
    openCircuits: number;
    degradedServices: number;
  };
  errorMonitoring: {
    isEnabled: boolean;
    isInitialized: boolean;
    activeErrors: number;
    alertsInLastHour: number;
    criticalErrors: number;
  };
  circuitBreakers: Record<string, {
    serviceName: string;
    state: CircuitBreakerState;
    healthStatus: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
    };
  }>;
  lastUpdated: number;
}

/**
 * PRODUCTION MONITORING DASHBOARD COMPONENT
 */
export const ProductionDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize monitoring dashboard
   */
  useEffect(() => {
    initializeDashboard();
  }, []);

  /**
   * Set up periodic refresh
   */
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      refreshDashboardData();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isInitialized]);

  /**
   * Initialize dashboard and monitoring services
   */
  const initializeDashboard = async (): Promise<void> => {
    try {
      // Initialize monitoring services
      await monitoringOrchestrator.initialize();
      await resilienceOrchestrator.initialize();

      // Initial data fetch
      await refreshDashboardData();

      setIsInitialized(true);
      setError(null);

      logSecurity('Production dashboard initialized', 'low', {
        component: 'production_dashboard',
        action: 'initialize'
      });

    } catch (error) {
      setError(`Failed to initialize dashboard: ${(error instanceof Error ? error.message : String(error))}`);
      logSecurity('Production dashboard initialization failed', 'medium', {
        component: 'production_dashboard',
        
      });
    }
  };

  /**
   * Refresh dashboard data
   */
  const refreshDashboardData = useCallback(async (): Promise<void> => {
    try {
      setIsRefreshing(true);

      // Fetch monitoring data
      const monitoringStatus = monitoringOrchestrator.getMonitoringStatus();
      const resilienceStatus = resilienceOrchestrator.getResilienceStatus();

      const data: DashboardData = {
        systemHealth: resilienceStatus.systemHealth,
        errorMonitoring: monitoringStatus.errorMonitoring,
        circuitBreakers: resilienceStatus.circuitBreakers,
        lastUpdated: Date.now()
      };

      setDashboardData(data);
      setError(null);

      // Log performance metrics
      logPerformance('Dashboard data refresh', 0, {
        systemHealth: data.systemHealth.overall,
        criticalServiceFailures: data.systemHealth.criticalServiceFailures,
        activeErrors: data.errorMonitoring.activeErrors
      });

    } catch (error) {
      setError(`Failed to refresh data: ${(error instanceof Error ? error.message : String(error))}`);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Handle emergency protocol trigger
   */
  const handleEmergencyProtocol = (): void => {
    Alert.alert(
      'Emergency Protocol',
      'This will attempt to force-recover critical services. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Execute',
          style: 'destructive',
          onPress: async () => {
            try {
              await resilienceOrchestrator.triggerEmergencyProtocol();
              await refreshDashboardData();

              Alert.alert('Success', 'Emergency protocol executed successfully');
            } catch (error) {
              Alert.alert('Error', `Emergency protocol failed: ${(error instanceof Error ? error.message : String(error))}`);
            }
          }
        }
      ]
    );
  };

  /**
   * Get formatted timestamp
   */
  const getFormattedTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  /**
   * Render system health overview
   */
  const renderSystemHealth = (): React.ReactElement | null => {
    if (!dashboardData) return null;

    const { systemHealth } = dashboardData;

    return (
      <View style={styles.healthOverview}>
        <Text style={styles.sectionTitle}>🏥 System Health</Text>

        <View style={styles.healthCard}>
          <View style={[
            styles.healthIndicator,
            { backgroundColor: HEALTH_COLORS[systemHealth.overall] }
          ]}>
            <Text style={styles.healthText}>{systemHealth.overall.toUpperCase()}</Text>
          </View>

          <View style={styles.healthMetrics}>
            <Text style={styles.metricText}>
              Critical Service Failures: {systemHealth.criticalServiceFailures}
            </Text>
            <Text style={styles.metricText}>
              Open Circuits: {systemHealth.openCircuits}
            </Text>
            <Text style={styles.metricText}>
              Degraded Services: {systemHealth.degradedServices}
            </Text>
          </View>

          {systemHealth.criticalServiceFailures > 0 && (
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={handleEmergencyProtocol}
            >
              <Text style={styles.emergencyButtonText}>🚨 Trigger Emergency Protocol</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  /**
   * Render error monitoring status
   */
  const renderErrorMonitoring = (): React.ReactElement | null => {
    if (!dashboardData) return null;

    const { errorMonitoring } = dashboardData;

    return (
      <View style={styles.monitoringSection}>
        <Text style={styles.sectionTitle}>📊 Error Monitoring</Text>

        <View style={styles.monitoringCard}>
          <View style={styles.monitoringRow}>
            <Text style={styles.monitoringLabel}>Status:</Text>
            <Text style={[
              styles.monitoringValue,
              { color: errorMonitoring.isEnabled ? HEALTH_COLORS.healthy : HEALTH_COLORS.unhealthy }
            ]}>
              {errorMonitoring.isEnabled ? 'Active' : 'Disabled'}
            </Text>
          </View>

          <View style={styles.monitoringRow}>
            <Text style={styles.monitoringLabel}>Active Errors:</Text>
            <Text style={styles.monitoringValue}>{errorMonitoring.activeErrors}</Text>
          </View>

          <View style={styles.monitoringRow}>
            <Text style={styles.monitoringLabel}>Critical Errors:</Text>
            <Text style={[
              styles.monitoringValue,
              { color: errorMonitoring.criticalErrors > 0 ? HEALTH_COLORS.unhealthy : HEALTH_COLORS.healthy }
            ]}>
              {errorMonitoring.criticalErrors}
            </Text>
          </View>

          <View style={styles.monitoringRow}>
            <Text style={styles.monitoringLabel}>Alerts (1h):</Text>
            <Text style={styles.monitoringValue}>{errorMonitoring.alertsInLastHour}</Text>
          </View>
        </View>
      </View>
    );
  };

  /**
   * Render circuit breaker status
   */
  const renderCircuitBreakers = (): React.ReactElement | null => {
    if (!dashboardData) return null;

    const { circuitBreakers } = dashboardData;

    // Sort services by priority (critical services first)
    const sortedServices = Object.entries(circuitBreakers).sort(([a], [b]) => {
      const priorityA = SERVICE_PRIORITY[a as ProtectedService] || 99;
      const priorityB = SERVICE_PRIORITY[b as ProtectedService] || 99;
      return priorityA - priorityB;
    });

    return (
      <View style={styles.circuitSection}>
        <Text style={styles.sectionTitle}>⚡ Circuit Breakers</Text>

        {sortedServices.map(([serviceName, status]) => {
          const successRate = status.metrics.totalRequests > 0
            ? (status.metrics.successfulRequests / status.metrics.totalRequests * 100).toFixed(1)
            : '100.0';

          const isCritical = [
            ProtectedService.CRISIS_DETECTION,
            ProtectedService.AUTHENTICATION,
            ProtectedService.ASSESSMENT_STORE
          ].includes(serviceName as ProtectedService);

          return (
            <View key={serviceName} style={styles.circuitCard}>
              <View style={styles.circuitHeader}>
                <Text style={styles.serviceName}>
                  {isCritical ? '🚨 ' : '⚙️ '}{serviceName.replace(/_/g, ' ')}
                </Text>
                <View style={[
                  styles.circuitState,
                  { backgroundColor: CIRCUIT_COLORS[status.state] }
                ]}>
                  <Text style={styles.circuitStateText}>{status.state}</Text>
                </View>
              </View>

              <View style={styles.circuitMetrics}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Health:</Text>
                  <Text style={[
                    styles.metricValue,
                    { color: HEALTH_COLORS[status.healthStatus] }
                  ]}>
                    {status.healthStatus}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Success Rate:</Text>
                  <Text style={styles.metricValue}>{successRate}%</Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Avg Response:</Text>
                  <Text style={styles.metricValue}>
                    {status.metrics.averageResponseTime.toFixed(0)}ms
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total Requests:</Text>
                  <Text style={styles.metricValue}>{status.metrics.totalRequests}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  /**
   * Render error state
   */
  const renderError = (): React.ReactElement => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>⚠️ Dashboard Error</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={initializeDashboard}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render loading state
   */
  const renderLoading = (): React.ReactElement => (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>🔄 Initializing Dashboard...</Text>
    </View>
  );

  // Main render
  if (error) return renderError();
  if (!isInitialized || !dashboardData) return renderLoading();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Production Monitoring</Text>
        <Text style={styles.lastUpdated}>
          Updated: {getFormattedTime(dashboardData.lastUpdated)}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshDashboardData}
            tintColor={HEALTH_COLORS.healthy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderSystemHealth()}
        {renderErrorMonitoring()}
        {renderCircuitBreakers()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 All metrics are PHI-sanitized and Privacy compliant
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },

  header: {
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[16],
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },

  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.bold,
    color: '#1F2937',
    marginBottom: spacing[4]
  },

  lastUpdated: {
    fontSize: typography.bodySmall.size,
    color: '#6B7280',
    fontFamily: 'monospace'
  },

  scrollView: {
    flex: 1
  },

  // System Health Styles
  healthOverview: {
    padding: spacing[20]
  },

  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#374151',
    marginBottom: spacing[12]
  },

  healthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.large,
    padding: spacing[16],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },

  healthIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: borderRadius.xxl,
    marginBottom: spacing[12]
  },

  healthText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.bodyRegular.size
  },

  healthMetrics: {
    marginBottom: spacing[12]
  },

  metricText: {
    fontSize: typography.bodySmall.size,
    color: '#4B5563',
    marginBottom: spacing[4]
  },

  emergencyButton: {
    backgroundColor: '#DC2626',
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center'
  },

  emergencyButtonText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.bodyRegular.size
  },

  // Error Monitoring Styles
  monitoringSection: {
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[20]
  },

  monitoringCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.large,
    padding: spacing[16],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },

  monitoringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[8]
  },

  monitoringLabel: {
    fontSize: typography.bodySmall.size,
    color: '#4B5563',
    fontWeight: typography.fontWeight.medium
  },

  monitoringValue: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.bold,
    color: '#1F2937'
  },

  // Circuit Breaker Styles
  circuitSection: {
    paddingHorizontal: spacing[20],
    paddingBottom: spacing[20]
  },

  circuitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.large,
    padding: spacing[16],
    marginBottom: spacing[12],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },

  circuitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[12]
  },

  serviceName: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#1F2937',
    flex: 1,
    textTransform: 'capitalize'
  },

  circuitState: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl
  },

  circuitStateText: {
    color: '#FFFFFF',
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase'
  },

  circuitMetrics: {},

  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[4]
  },

  metricLabel: {
    fontSize: typography.bodySmall.size,
    color: '#6B7280'
  },

  metricValue: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#1F2937'
  },

  // Error and Loading Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[20]
  },

  errorTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.bold,
    color: '#DC2626',
    marginBottom: spacing[12]
  },

  errorMessage: {
    fontSize: typography.bodySmall.size,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: spacing[20]
  },

  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: borderRadius.medium
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.bodyRegular.size
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  loadingText: {
    fontSize: typography.bodyRegular.size,
    color: '#6B7280'
  },

  // Footer
  footer: {
    padding: spacing[20],
    alignItems: 'center'
  },

  footerText: {
    fontSize: typography.micro.size,
    color: '#9CA3AF',
    textAlign: 'center'
  }
});

export default ProductionDashboard;