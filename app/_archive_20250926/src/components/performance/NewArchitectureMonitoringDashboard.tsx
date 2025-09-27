/**
 * New Architecture Performance Monitoring Dashboard
 *
 * Real-time performance monitoring component for React Native New Architecture.
 * Displays critical therapeutic timing metrics and performance comparisons.
 *
 * This component is only shown in development mode or when explicitly enabled
 * for therapeutic content validation by clinical teams.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import {
  newArchitecturePerformanceValidator,
  useNewArchitectureValidation,
  type ValidationResult,
  type NewArchitectureMetrics,
} from '../../utils/NewArchitecturePerformanceValidator';
import { therapeuticPerformanceSystem } from '../../utils/TherapeuticPerformanceSystem';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  enableContinuousMonitoring?: boolean;
}

interface PerformanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: number;
  metric: keyof NewArchitectureMetrics;
  value: number;
  threshold: number;
}

const NewArchitectureMonitoringDashboard: React.FC<Props> = ({
  visible,
  onClose,
  enableContinuousMonitoring = false,
}) => {
  const [currentMetrics, setCurrentMetrics] = useState<NewArchitectureMetrics | null>(null);
  const [lastValidationResult, setLastValidationResult] = useState<ValidationResult | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'metrics' | 'alerts' | 'report'>('metrics');

  const {
    isValidating,
    runValidation,
    validateCrisisResponse,
    validateBreathing,
    generateReport,
  } = useNewArchitectureValidation();

  // Performance monitoring interval
  useEffect(() => {
    let monitoringInterval: NodeJS.Timeout;

    if (enableContinuousMonitoring && isMonitoring) {
      monitoringInterval = setInterval(async () => {
        try {
          const result = await runValidation();
          setLastValidationResult(result);
          setCurrentMetrics(result.metrics);

          // Check for new alerts
          checkForPerformanceAlerts(result);
        } catch (error) {
          console.error('Continuous monitoring failed:', error);
        }
      }, 5000); // Every 5 seconds
    }

    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    };
  }, [isMonitoring, enableContinuousMonitoring, runValidation]);

  // Register for performance alerts
  useEffect(() => {
    const unsubscribe = newArchitecturePerformanceValidator.onPerformanceAlert((result) => {
      checkForPerformanceAlerts(result);
    });

    return unsubscribe;
  }, []);

  const checkForPerformanceAlerts = useCallback((result: ValidationResult) => {
    const newAlerts: PerformanceAlert[] = [];

    // Check critical timing thresholds
    if (result.metrics.crisisButtonResponseTime > 200) {
      newAlerts.push({
        id: `crisis-${Date.now()}`,
        type: 'critical',
        message: `Crisis button response exceeded 200ms: ${result.metrics.crisisButtonResponseTime.toFixed(2)}ms`,
        timestamp: Date.now(),
        metric: 'crisisButtonResponseTime',
        value: result.metrics.crisisButtonResponseTime,
        threshold: 200,
      });
    }

    if (result.metrics.breathingAnimationFPS < 58) {
      newAlerts.push({
        id: `breathing-${Date.now()}`,
        type: 'critical',
        message: `Breathing animation FPS dropped below 58: ${result.metrics.breathingAnimationFPS.toFixed(1)}fps`,
        timestamp: Date.now(),
        metric: 'breathingAnimationFPS',
        value: result.metrics.breathingAnimationFPS,
        threshold: 58,
      });
    }

    if (result.metrics.assessmentTransitionTime > 300) {
      newAlerts.push({
        id: `assessment-${Date.now()}`,
        type: 'warning',
        message: `Assessment transition slow: ${result.metrics.assessmentTransitionTime.toFixed(2)}ms`,
        timestamp: Date.now(),
        metric: 'assessmentTransitionTime',
        value: result.metrics.assessmentTransitionTime,
        threshold: 300,
      });
    }

    if (result.metrics.memoryGrowthRatio > 1.5) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'warning',
        message: `Memory growth excessive: ${((result.metrics.memoryGrowthRatio - 1) * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        metric: 'memoryGrowthRatio',
        value: result.metrics.memoryGrowthRatio,
        threshold: 1.5,
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Keep last 50 alerts
    }
  }, []);

  const handleRunValidation = async () => {
    try {
      const result = await runValidation();
      setLastValidationResult(result);
      setCurrentMetrics(result.metrics);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleToggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      therapeuticPerformanceSystem.startRealTimeMonitoring();
    } else {
      therapeuticPerformanceSystem.stopRealTimeMonitoring();
    }
  };

  const renderMetricsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 Critical Therapeutic Metrics</Text>

        <MetricCard
          title="Crisis Button Response"
          value={currentMetrics?.crisisButtonResponseTime || 0}
          unit="ms"
          threshold={200}
          type="lower"
          critical
        />

        <MetricCard
          title="Breathing Animation FPS"
          value={currentMetrics?.breathingAnimationFPS || 0}
          unit="fps"
          threshold={58}
          type="higher"
          critical
        />

        <MetricCard
          title="Assessment Transitions"
          value={currentMetrics?.assessmentTransitionTime || 0}
          unit="ms"
          threshold={300}
          type="lower"
        />

        <MetricCard
          title="Memory Growth"
          value={((currentMetrics?.memoryGrowthRatio || 1) - 1) * 100}
          unit="%"
          threshold={50}
          type="lower"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Performance Metrics</Text>

        <MetricCard
          title="Frame Drop Rate"
          value={(currentMetrics?.frameDropPercentage || 0) * 100}
          unit="%"
          threshold={5}
          type="lower"
        />

        <MetricCard
          title="Baseline Memory"
          value={(currentMetrics?.baselineMemoryUsage || 0) / (1024 * 1024)}
          unit="MB"
          threshold={50}
          type="lower"
        />

        <MetricCard
          title="Animation Jank"
          value={currentMetrics?.animationJank || 0}
          unit="ms"
          threshold={16.67}
          type="lower"
        />

        <MetricCard
          title="Bridge Performance"
          value={currentMetrics?.bridgePerformance || 0}
          unit="ms"
          threshold={5}
          type="lower"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏗️ New Architecture Benefits</Text>

        {lastValidationResult?.comparisons.length > 0 ? (
          lastValidationResult.comparisons.map((comparison, index) => (
            <View key={index} style={styles.comparisonCard}>
              <Text style={styles.comparisonMetric}>{comparison.metric}</Text>
              <View style={styles.comparisonValues}>
                <Text style={styles.comparisonValue}>
                  {comparison.improvement > 0 ? '+' : ''}{comparison.improvement.toFixed(1)}%
                </Text>
                <Text style={[
                  styles.comparisonStatus,
                  comparison.status === 'improved' ? styles.improved :
                  comparison.status === 'degraded' ? styles.degraded : styles.stable
                ]}>
                  {comparison.status === 'improved' ? '📈' :
                   comparison.status === 'degraded' ? '📉' : '➡️'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>Run validation to see performance comparisons</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderAlertsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 Performance Alerts</Text>

        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <View key={alert.id} style={[
              styles.alertCard,
              alert.type === 'critical' ? styles.criticalAlert :
              alert.type === 'warning' ? styles.warningAlert : styles.infoAlert
            ]}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertType}>
                  {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                  {alert.type.toUpperCase()}
                </Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertDetails}>
                {alert.metric}: {alert.value.toFixed(2)} (threshold: {alert.threshold})
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No performance alerts</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderReportTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Performance Report</Text>

        <View style={styles.reportContainer}>
          <Text style={styles.reportText}>{generateReport()}</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🏗️ New Architecture Monitor</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={handleRunValidation}
            disabled={isValidating}
            style={[styles.button, isValidating && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {isValidating ? '⏳ Validating...' : '🔍 Run Validation'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleMonitoring}
            style={[styles.button, isMonitoring && styles.buttonActive]}
          >
            <Text style={styles.buttonText}>
              {isMonitoring ? '⏹️ Stop Monitor' : '▶️ Start Monitor'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={validateCrisisResponse}
            style={styles.button}
          >
            <Text style={styles.buttonText}>🚨 Test Crisis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={validateBreathing}
            style={styles.button}
          >
            <Text style={styles.buttonText}>🫁 Test Breathing</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setSelectedTab('metrics')}
            style={[styles.tab, selectedTab === 'metrics' && styles.activeTab]}
          >
            <Text style={[styles.tabText, selectedTab === 'metrics' && styles.activeTabText]}>
              Metrics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab('alerts')}
            style={[styles.tab, selectedTab === 'alerts' && styles.activeTab]}
          >
            <Text style={[styles.tabText, selectedTab === 'alerts' && styles.activeTabText]}>
              Alerts {alerts.length > 0 && `(${alerts.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab('report')}
            style={[styles.tab, selectedTab === 'report' && styles.activeTab]}
          >
            <Text style={[styles.tabText, selectedTab === 'report' && styles.activeTabText]}>
              Report
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'metrics' && renderMetricsTab()}
        {selectedTab === 'alerts' && renderAlertsTab()}
        {selectedTab === 'report' && renderReportTab()}

        {lastValidationResult && (
          <View style={styles.statusBar}>
            <Text style={[
              styles.statusText,
              lastValidationResult.passed ? styles.statusPassed : styles.statusFailed
            ]}>
              {lastValidationResult.passed ? '✅ All tests passed' : '❌ Tests failed'}
            </Text>
            <Text style={styles.statusTime}>
              {new Date(lastValidationResult.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  threshold: number;
  type: 'higher' | 'lower'; // Whether higher or lower values are better
  critical?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  threshold,
  type,
  critical = false,
}) => {
  const isGood = type === 'higher' ? value >= threshold : value <= threshold;
  const percentage = type === 'higher'
    ? (value / threshold) * 100
    : threshold > 0 ? (threshold / Math.max(value, 1)) * 100 : 100;

  return (
    <View style={[
      styles.metricCard,
      critical && !isGood && styles.criticalMetric
    ]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[
          styles.metricStatus,
          isGood ? styles.statusGood : styles.statusBad
        ]}>
          {isGood ? '✅' : '❌'}
        </Text>
      </View>

      <View style={styles.metricValueContainer}>
        <Text style={styles.metricValue}>
          {value.toFixed(value < 10 ? 2 : 1)} {unit}
        </Text>
        <Text style={styles.metricThreshold}>
          {type === 'higher' ? '≥' : '≤'} {threshold} {unit}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(percentage, 100)}%` },
            isGood ? styles.progressGood : styles.progressBad
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  button: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
  },
  buttonActive: {
    backgroundColor: '#4A7C59',
  },
  buttonDisabled: {
    backgroundColor: '#222',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A7C59',
  },
  tabText: {
    color: '#999',
    fontSize: 14,
  },
  activeTabText: {
    color: '#4A7C59',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metricCard: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  criticalMetric: {
    borderColor: '#ff6b6b',
    backgroundColor: '#2a1f1f',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  metricStatus: {
    fontSize: 16,
  },
  statusGood: {
    color: '#4CAF50',
  },
  statusBad: {
    color: '#ff6b6b',
  },
  metricValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  metricValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricThreshold: {
    color: '#999',
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressGood: {
    backgroundColor: '#4CAF50',
  },
  progressBad: {
    backgroundColor: '#ff6b6b',
  },
  comparisonCard: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonMetric: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  comparisonValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparisonValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  comparisonStatus: {
    fontSize: 16,
  },
  improved: {
    color: '#4CAF50',
  },
  degraded: {
    color: '#ff6b6b',
  },
  stable: {
    color: '#999',
  },
  alertCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  criticalAlert: {
    backgroundColor: '#2a1f1f',
    borderLeftColor: '#ff6b6b',
  },
  warningAlert: {
    backgroundColor: '#2a2a1f',
    borderLeftColor: '#ffa726',
  },
  infoAlert: {
    backgroundColor: '#1f2a2a',
    borderLeftColor: '#42a5f5',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertType: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertTime: {
    color: '#999',
    fontSize: 10,
  },
  alertMessage: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  alertDetails: {
    color: '#999',
    fontSize: 12,
  },
  reportContainer: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
  },
  reportText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#111',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusPassed: {
    color: '#4CAF50',
  },
  statusFailed: {
    color: '#ff6b6b',
  },
  statusTime: {
    color: '#999',
    fontSize: 12,
  },
  noData: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});

export default NewArchitectureMonitoringDashboard;