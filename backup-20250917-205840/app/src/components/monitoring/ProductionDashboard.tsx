/**
 * Production Monitoring Dashboard
 *
 * Real-time monitoring interface for P0-CLOUD production deployment
 * Crisis-first safety tracking with therapeutic effectiveness metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { productionMonitoring, ProductionMetrics, ProductionAlert } from '../../services/cloud/ProductionMonitoring';
import { emergencyProcedures, EmergencyEvent } from '../../services/cloud/EmergencyProcedures';

interface DashboardProps {
  environment: string;
  isProduction: boolean;
}

interface AlertSeverityProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  children: React.ReactNode;
}

const AlertSeverityIndicator: React.FC<AlertSeverityProps> = ({ severity, children }) => {
  const severityColors = {
    critical: '#FF0000',
    high: '#FF6B00',
    medium: '#FFB800',
    low: '#00A8FF'
  };

  return (
    <View style={[styles.alertContainer, { borderLeftColor: severityColors[severity] }]}>
      {children}
    </View>
  );
};

const CrisisMetricsCard: React.FC<{ metrics: ProductionMetrics['crisisMetrics'] }> = ({ metrics }) => (
  <View style={styles.metricsCard}>
    <Text style={styles.cardTitle}>🚨 Crisis Safety Metrics</Text>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Response Time:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.responseTimeMs <= 30 ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.responseTimeMs}ms
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Emergency Access:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.emergencyAccessAvailable ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.emergencyAccessAvailable ? 'Available' : 'Unavailable'}
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Offline Failsafe:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.offlineFailsafeActive ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.offlineFailsafeActive ? 'Active' : 'Inactive'}
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>988 Hotline:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.hotlineAccessible ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.hotlineAccessible ? 'Accessible' : 'Blocked'}
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Safety Violations:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.safetyViolations === 0 ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.safetyViolations}
      </Text>
    </View>
  </View>
);

const PerformanceMetricsCard: React.FC<{ metrics: ProductionMetrics['performanceMetrics'] }> = ({ metrics }) => (
  <View style={styles.metricsCard}>
    <Text style={styles.cardTitle}>⚡ Performance Metrics</Text>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>UI Performance:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.uiPerformanceFps >= 60 ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.uiPerformanceFps}fps
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Memory Usage:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.memoryUsageMb <= 50 ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.memoryUsageMb}MB
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Sync Latency:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.syncLatencyMs <= 31 ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.syncLatencyMs}ms
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>App Launch:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.appLaunchTimeMs <= 2000 ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.appLaunchTimeMs}ms
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Error Rate:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.errorRate <= 0.1 ? '#00D084' : '#FF4757' }
      ]}>
        {(metrics.errorRate * 100).toFixed(2)}%
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Crash Rate:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.crashRate <= 0.1 ? '#00D084' : '#FF4757' }
      ]}>
        {(metrics.crashRate * 100).toFixed(2)}%
      </Text>
    </View>
  </View>
);

const ComplianceMetricsCard: React.FC<{ metrics: ProductionMetrics['complianceMetrics'] }> = ({ metrics }) => (
  <View style={styles.metricsCard}>
    <Text style={styles.cardTitle}>⚖️ Compliance Metrics</Text>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>HIPAA Compliant:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.hipaaCompliant ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.hipaaCompliant ? 'Yes' : 'No'}
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Audit Trail:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.auditTrailActive ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.auditTrailActive ? 'Active' : 'Inactive'}
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Encryption:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.encryptionValidated ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.encryptionValidated ? 'Validated' : 'Failed'}
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Data Integrity:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.dataIntegrityScore >= 95 ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.dataIntegrityScore}%
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Region Compliant:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.regionCompliant ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.regionCompliant ? 'Yes' : 'No'}
      </Text>
    </View>
  </View>
);

const BusinessMetricsCard: React.FC<{ metrics: ProductionMetrics['businessMetrics'] }> = ({ metrics }) => (
  <View style={styles.metricsCard}>
    <Text style={styles.cardTitle}>📈 Business Metrics</Text>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Active Users:</Text>
      <Text style={styles.metricValue}>{metrics.activeUsers.toLocaleString()}</Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Rollout:</Text>
      <Text style={styles.metricValue}>{metrics.rolloutPercentage}%</Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Therapeutic Sessions:</Text>
      <Text style={styles.metricValue}>{metrics.therapeuticSessions.toLocaleString()}</Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Crisis Interventions:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.crisisInterventions > 0 ? '#FF4757' : '#00D084' }
      ]}>
        {metrics.crisisInterventions}
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Assessments:</Text>
      <Text style={styles.metricValue}>{metrics.assessmentCompletions.toLocaleString()}</Text>
    </View>
  </View>
);

const CostMetricsCard: React.FC<{ metrics: ProductionMetrics['costMetrics'] }> = ({ metrics }) => (
  <View style={styles.metricsCard}>
    <Text style={styles.cardTitle}>💰 Cost Metrics</Text>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Daily Cost:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.budgetUtilizationPercent <= 85 ? '#00D084' : '#FF4757' }
      ]}>
        ${metrics.estimatedDailyCost.toFixed(2)}
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Budget Utilization:</Text>
      <Text style={[
        styles.metricValue,
        { color: metrics.budgetUtilizationPercent <= 85 ? '#00D084' : '#FF4757' }
      ]}>
        {metrics.budgetUtilizationPercent.toFixed(1)}%
      </Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Requests:</Text>
      <Text style={styles.metricValue}>{metrics.supabaseRequestCount.toLocaleString()}</Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Storage:</Text>
      <Text style={styles.metricValue}>{metrics.storageUsageMb.toFixed(1)}MB</Text>
    </View>

    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>Bandwidth:</Text>
      <Text style={styles.metricValue}>{metrics.bandwidthUsageMb.toFixed(1)}MB</Text>
    </View>
  </View>
);

const AlertsList: React.FC<{ alerts: ProductionAlert[] }> = ({ alerts }) => (
  <View style={styles.alertsSection}>
    <Text style={styles.sectionTitle}>🚨 Active Alerts</Text>
    {alerts.length === 0 ? (
      <Text style={styles.noAlertsText}>No active alerts</Text>
    ) : (
      alerts.map((alert) => (
        <AlertSeverityIndicator key={alert.id} severity={alert.severity}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertDescription}>{alert.description}</Text>
            <Text style={styles.alertTimestamp}>
              {new Date(alert.timestamp).toLocaleString()}
            </Text>
            {alert.escalationRequired && (
              <Text style={styles.escalationText}>⚠️ Escalation Required</Text>
            )}
          </View>
        </AlertSeverityIndicator>
      ))
    )}
  </View>
);

const EmergencyEventsList: React.FC<{ events: EmergencyEvent[] }> = ({ events }) => (
  <View style={styles.emergencySection}>
    <Text style={styles.sectionTitle}>🆘 Emergency Events</Text>
    {events.length === 0 ? (
      <Text style={styles.noEventsText}>No emergency events</Text>
    ) : (
      events.map((event) => (
        <View key={event.id} style={styles.emergencyEvent}>
          <Text style={styles.emergencyTitle}>
            {event.category.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.emergencyDescription}>{event.description}</Text>
          <Text style={styles.emergencyTimestamp}>
            {new Date(event.timestamp).toLocaleString()}
          </Text>
          <View style={styles.emergencyStatus}>
            <Text style={styles.emergencyStatusText}>
              Rollback: {event.rollbackCompleted ? 'Completed' : 'Pending'}
            </Text>
            <Text style={styles.emergencyStatusText}>
              Status: {event.resolved ? 'Resolved' : 'Active'}
            </Text>
          </View>
        </View>
      ))
    )}
  </View>
);

export const ProductionDashboard: React.FC<DashboardProps> = ({ environment, isProduction }) => {
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [alerts, setAlerts] = useState<ProductionAlert[]>([]);
  const [emergencyEvents, setEmergencyEvents] = useState<EmergencyEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      // Fetch current metrics
      const currentMetrics = await productionMonitoring.getCurrentMetrics();
      setMetrics(currentMetrics);

      // Fetch active alerts
      const activeAlerts = productionMonitoring.getActiveAlerts();
      setAlerts(activeAlerts);

      // Fetch emergency events
      const activeEvents = emergencyProcedures.getEmergencyEvents();
      setEmergencyEvents(activeEvents);

      setLastUpdate(new Date().toLocaleString());

      // Check for critical alerts
      const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
      if (criticalAlerts.length > 0 && isProduction) {
        Alert.alert(
          '🚨 Critical Alert',
          `${criticalAlerts.length} critical alert(s) detected. Immediate attention required.`,
          [{ text: 'OK', style: 'default' }]
        );
      }

    } catch (error) {
      console.error('[ProductionDashboard] Failed to fetch data:', error);
      Alert.alert(
        'Monitoring Error',
        'Failed to fetch monitoring data. Check connection and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  }, [isProduction]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    // Initial data fetch
    fetchData();

    // Set up real-time updates
    const updateInterval = isProduction ? 10000 : 30000; // 10s prod, 30s dev
    const intervalId = setInterval(fetchData, updateInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchData, isProduction]);

  if (!metrics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading production metrics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>P0-CLOUD Production Dashboard</Text>
        <Text style={styles.subtitle}>Environment: {environment}</Text>
        <Text style={styles.lastUpdate}>Last Update: {lastUpdate}</Text>
      </View>

      {/* Crisis Safety Metrics - Highest Priority */}
      <CrisisMetricsCard metrics={metrics.crisisMetrics} />

      {/* Performance Metrics */}
      <PerformanceMetricsCard metrics={metrics.performanceMetrics} />

      {/* Compliance Metrics */}
      <ComplianceMetricsCard metrics={metrics.complianceMetrics} />

      {/* Business Metrics */}
      <BusinessMetricsCard metrics={metrics.businessMetrics} />

      {/* Cost Metrics */}
      <CostMetricsCard metrics={metrics.costMetrics} />

      {/* Active Alerts */}
      <AlertsList alerts={alerts} />

      {/* Emergency Events */}
      <EmergencyEventsList events={emergencyEvents} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🚨 Crisis Safety: Real-time monitoring active
        </Text>
        <Text style={styles.footerText}>
          📊 Auto-refresh: {isProduction ? '10s' : '30s'}
        </Text>
        <Text style={styles.footerText}>
          🔄 Emergency procedures: Ready
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#6C757D',
  },
  header: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 8,
  },
  lastUpdate: {
    fontSize: 14,
    color: '#95A5A6',
  },
  metricsCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6C757D',
    flex: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  alertsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  noAlertsText: {
    fontSize: 14,
    color: '#28A745',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  alertContainer: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertContent: {
    padding: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 4,
  },
  escalationText: {
    fontSize: 12,
    color: '#DC3545',
    fontWeight: 'bold',
  },
  emergencySection: {
    marginBottom: 16,
  },
  noEventsText: {
    fontSize: 14,
    color: '#28A745',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  emergencyEvent: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC3545',
    marginBottom: 4,
  },
  emergencyDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
  },
  emergencyTimestamp: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 8,
  },
  emergencyStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emergencyStatusText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#E9ECEF',
    borderRadius: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
});

export default ProductionDashboard;