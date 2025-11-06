/**
 * PRODUCTION MONITORING COMPONENTS
 * Week 4 Phase 2b - Critical Production Infrastructure
 *
 * COMPREHENSIVE MONITORING VISUALIZATION:
 * - Real-time system health dashboard
 * - Circuit breaker status monitoring
 * - Error tracking visualization
 * - Crisis intervention system monitoring
 * - HIPAA-compliant metrics display
 *
 * SAFETY-CRITICAL MONITORING FEATURES:
 * - Crisis detection system status (highest priority)
 * - Critical service health monitoring
 * - Emergency protocol trigger capability
 * - Real-time alerting and notification
 * - PHI-safe visualization throughout
 *
 * USAGE:
 * import { ProductionDashboard, MonitoringWidget } from '@/components/monitoring';
 */


import {
  logSecurity,
  logPerformance,
  logError,
  LogCategory
} from '../../services/logging';

import {
  monitoringOrchestrator,
  errorMonitoringService,
  trackError,
  trackCrisisError,
  trackAuthError,
  trackSyncError
} from '../../services/monitoring';
import ProductionDashboard from './ProductionDashboard';

// Re-export monitoring services for integration
export {
  monitoringOrchestrator,
  errorMonitoringService,
  trackError,
  trackCrisisError,
  trackAuthError,
  trackSyncError
};

// Main Production Dashboard export
export { ProductionDashboard };

// Re-export resilience services for dashboard integration
export {
  resilienceOrchestrator,
  circuitBreakerService,
  ProtectedService,
  CircuitBreakerState,
  protectedCrisisDetection,
  protectedAuthentication,
  protectedSyncOperation
} from '../../services/resilience';

/**
 * MONITORING WIDGET - Compact Status Display
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { resilienceOrchestrator } from '../../services/resilience';

interface MonitoringWidgetProps {
  onPress?: () => void;
  refreshInterval?: number;
}

export const MonitoringWidget: React.FC<MonitoringWidgetProps> = ({
  onPress,
  refreshInterval = 10000 // 10 seconds default
}) => {
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  const [criticalFailures, setCriticalFailures] = useState(0);

  useEffect(() => {
    const updateStatus = () => {
      try {
        const status = resilienceOrchestrator.getResilienceStatus();
        setSystemHealth(status.systemHealth.overall);
        setCriticalFailures(status.systemHealth.criticalServiceFailures);
      } catch (error) {
        setSystemHealth('critical');
        setCriticalFailures(1);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (): string => {
    switch (systemHealth) {
      case 'healthy': return '#10B981';
      case 'degraded': return '#F59E0B';
      case 'critical': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getStatusText = (): string => {
    if (criticalFailures > 0) {
      return `${criticalFailures} Critical`;
    }
    return systemHealth.charAt(0).toUpperCase() + systemHealth.slice(1);
  };

  return React.createElement(
    TouchableOpacity,
    {
      style: [styles.widget, { borderColor: getStatusColor() }],
      onPress: onPress,
      activeOpacity: 0.7
    },
    React.createElement(
      View,
      { style: styles.widgetContent },
      React.createElement(
        View,
        { style: [styles.statusIndicator, { backgroundColor: getStatusColor() }] }
      ),
      React.createElement(
        Text,
        { style: styles.statusText },
        getStatusText()
      )
    ),
    criticalFailures > 0 && React.createElement(
      Text,
      { style: styles.criticalAlert },
      '🚨'
    )
  );
};

const styles = StyleSheet.create({
  widget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },

  widgetContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },

  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151'
  },

  criticalAlert: {
    fontSize: 16,
    marginLeft: 4
  }
});

/**
 * MONITORING INITIALIZATION HELPER
 */
export async function initializeMonitoringComponents(): Promise<void> {
  try {
    // Initialize all monitoring services
    await monitoringOrchestrator.initialize();
    await resilienceOrchestrator.initialize();

    console.log('Monitoring components initialized', 10);
  } catch (error) {
    logError(LogCategory.SYSTEM, 'Monitoring components initialization failed', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * MONITORING HEALTH CHECK
 */
export function getMonitoringComponentsHealth(): {
  monitoring: 'healthy' | 'degraded' | 'unhealthy';
  resilience: 'healthy' | 'degraded' | 'critical';
  overall: 'healthy' | 'degraded' | 'critical';
} {
  try {
    const monitoringStatus = monitoringOrchestrator.getMonitoringStatus();
    const resilienceStatus = resilienceOrchestrator.getResilienceStatus();

    let monitoring: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!monitoringStatus.isInitialized) {
      monitoring = 'unhealthy';
      logError(LogCategory.SYSTEM, 'Monitoring initialization issue');
    } else if (monitoringStatus.errorMonitoring.criticalErrors > 0) {
      monitoring = 'degraded';
      logError(LogCategory.SYSTEM, 'Critical errors detected');
    }

    const resilience = resilienceStatus.systemHealth.overall;

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (monitoring === 'unhealthy' || resilience === 'critical') {
      overall = 'critical';
      logError(LogCategory.SYSTEM, 'System health critical');
    } else if (monitoring === 'degraded' || resilience === 'degraded') {
      overall = 'degraded';
      logError(LogCategory.SYSTEM, 'System health degraded');
    }

    return { monitoring, resilience, overall };

  } catch (error) {
    logError(LogCategory.SYSTEM, 'Health check failure', error instanceof Error ? error : undefined);
    return {
      monitoring: 'unhealthy',
      resilience: 'critical',
      overall: 'critical'
    };
  }
}

export default ProductionDashboard;