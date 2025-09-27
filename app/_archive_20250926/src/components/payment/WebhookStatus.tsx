import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { usePaymentStore } from '../../store/paymentStore';
import { colors } from '../../constants/colors';
import { Button } from '../core/Button';

interface WebhookMetrics {
  totalProcessed: number;
  successRate: number;
  averageProcessingTime: number;
  lastProcessedAt: Date | null;
  queueSize: number;
  failedEvents: number;
  retryEvents: number;
}

interface WebhookStatusProps {
  showAdminControls?: boolean;
  onViewDetails?: (eventId: string) => void;
}

export const WebhookStatus: React.FC<WebhookStatusProps> = ({
  showAdminControls = false,
  onViewDetails
}) => {
  const [metrics, setMetrics] = useState<WebhookMetrics>({
    totalProcessed: 0,
    successRate: 0,
    averageProcessingTime: 0,
    lastProcessedAt: null,
    queueSize: 0,
    failedEvents: 0,
    retryEvents: 0
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const {
    subscription,
    syncWebhookState,
    isLoading
  } = usePaymentStore();

  useEffect(() => {
    loadWebhookMetrics();
    const interval = setInterval(loadWebhookMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadWebhookMetrics = async () => {
    try {
      // Simulate webhook metrics - in real implementation would call webhook service
      const mockMetrics: WebhookMetrics = {
        totalProcessed: 157,
        successRate: 98.7,
        averageProcessingTime: 234,
        lastProcessedAt: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        queueSize: 2,
        failedEvents: 1,
        retryEvents: 3
      };
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load webhook metrics:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadWebhookMetrics();
      await syncWebhookState([]);
    } catch (error) {
      Alert.alert('Refresh Failed', 'Unable to refresh webhook status. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (successRate: number) => {
    if (successRate >= 98) return colors.success;
    if (successRate >= 95) return colors.warning;
    return colors.error;
  };

  const getStatusIcon = (successRate: number) => {
    if (successRate >= 98) return 'check-circle';
    if (successRate >= 95) return 'warning';
    return 'error';
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const StatusIndicator = () => (
    <View style={styles.statusIndicator}>
      <MaterialIcons
        name={getStatusIcon(metrics.successRate)}
        size={20}
        color={getStatusColor(metrics.successRate)}
      />
      <Text style={[styles.statusText, { color: getStatusColor(metrics.successRate) }]}>
        {metrics.successRate >= 98 ? 'Healthy' :
         metrics.successRate >= 95 ? 'Warning' : 'Critical'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityRole="button"
        accessibilityLabel={`Webhook status: ${metrics.successRate >= 98 ? 'Healthy' : 'Warning'}. Tap to ${isExpanded ? 'collapse' : 'expand'} details`}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Webhook Status</Text>
          <StatusIndicator />
        </View>
        <MaterialIcons
          name={isExpanded ? 'expand-less' : 'expand-more'}
          size={24}
          color={colors.text.secondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView style={styles.details} showsVerticalScrollIndicator={false}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.totalProcessed}</Text>
              <Text style={styles.metricLabel}>Total Processed</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={[styles.metricValue, { color: getStatusColor(metrics.successRate) }]}>
                {metrics.successRate.toFixed(1)}%
              </Text>
              <Text style={styles.metricLabel}>Success Rate</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.averageProcessingTime}ms</Text>
              <Text style={styles.metricLabel}>Avg Processing</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.queueSize}</Text>
              <Text style={styles.metricLabel}>Queue Size</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Last Processed:</Text>
            <Text style={styles.statusRowValue}>{formatTime(metrics.lastProcessedAt)}</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Failed Events:</Text>
            <Text style={[styles.statusRowValue, metrics.failedEvents > 0 && { color: colors.error }]}>
              {metrics.failedEvents}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Retry Queue:</Text>
            <Text style={[styles.statusRowValue, metrics.retryEvents > 0 && { color: colors.warning }]}>
              {metrics.retryEvents}
            </Text>
          </View>

          {showAdminControls && (
            <View style={styles.adminControls}>
              <Button
                title={refreshing ? 'Refreshing...' : 'Refresh Status'}
                onPress={handleRefresh}
                variant="secondary"
                size="small"
                disabled={refreshing || isLoading}
                style={styles.adminButton}
              />

              {metrics.failedEvents > 0 && (
                <Button
                  title="View Failed Events"
                  onPress={() => onViewDetails?.('failed')}
                  variant="outline"
                  size="small"
                  style={styles.adminButton}
                />
              )}
            </View>
          )}

          {subscription?.status === 'active' && (
            <View style={styles.subscriptionStatus}>
              <MaterialIcons name="verified" size={16} color={colors.success} />
              <Text style={styles.subscriptionText}>
                Subscription webhooks active for {subscription.tier} plan
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = {
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
    overflow: 'hidden' as const,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    backgroundColor: colors.background.secondary,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginRight: 12,
  },
  statusIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginLeft: 4,
  },
  details: {
    maxHeight: 300,
  },
  metricsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    padding: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%' as const,
    backgroundColor: colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: colors.text.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center' as const,
  },
  statusRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  statusRowLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  statusRowValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.text.primary,
  },
  adminControls: {
    flexDirection: 'row' as const,
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  adminButton: {
    flex: 1,
  },
  subscriptionStatus: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    backgroundColor: colors.background.success,
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
  },
  subscriptionText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 6,
  },
};