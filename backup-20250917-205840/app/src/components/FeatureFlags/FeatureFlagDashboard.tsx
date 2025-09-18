/**
 * Feature Flag Dashboard
 * Main control center for P0-CLOUD feature management
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  RefreshControl 
} from 'react-native';
import { 
  useFeatureFlagAdmin,
  useFeatureFlagContext,
  useEmergencyFeatureControl 
} from '../../hooks/useFeatureFlags';
import { FeatureFlagToggle } from './FeatureFlagToggle';
import { P0CloudFeatureFlags, FEATURE_FLAG_METADATA } from '../../types/feature-flags';

interface FeatureFlagDashboardProps {
  variant?: 'user' | 'admin' | 'emergency';
  showEmergencyControls?: boolean;
}

export const FeatureFlagDashboard: React.FC<FeatureFlagDashboardProps> = ({
  variant = 'user',
  showEmergencyControls = false
}) => {
  const admin = useFeatureFlagAdmin();
  const context = useFeatureFlagContext();
  const emergency = useEmergencyFeatureControl();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showCostDetails, setShowCostDetails] = useState(false);

  const categories = [
    { id: 'all', name: 'All Features', count: Object.keys(FEATURE_FLAG_METADATA).length },
    { id: 'core', name: 'Core', count: Object.values(FEATURE_FLAG_METADATA).filter(m => m.category === 'core').length },
    { id: 'premium', name: 'Premium', count: Object.values(FEATURE_FLAG_METADATA).filter(m => m.category === 'premium').length },
    { id: 'experimental', name: 'Experimental', count: Object.values(FEATURE_FLAG_METADATA).filter(m => m.category === 'experimental').length },
  ];

  const filteredFeatures = Object.entries(FEATURE_FLAG_METADATA).filter(([_, metadata]) => 
    selectedCategory === 'all' || metadata.category === selectedCategory
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await admin.refreshMetrics();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh metrics');
    } finally {
      setRefreshing(false);
    }
  };

  const handleEmergencyShutdown = async () => {
    Alert.alert(
      'Emergency Shutdown',
      'This will disable all non-critical cloud features immediately. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Emergency Shutdown', 
          style: 'destructive',
          onPress: async () => {
            try {
              await emergency.emergencyDisableAll();
              Alert.alert('Success', 'Emergency shutdown completed');
            } catch (error) {
              Alert.alert('Error', 'Emergency shutdown failed');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getCostEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 0.8) return '#10B981';
    if (efficiency >= 0.6) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feature Control Center</Text>
        <Text style={styles.headerSubtitle}>
          {context.enabledFeaturesCount} of {context.totalFeaturesCount} features enabled
        </Text>
      </View>

      {/* Status Overview */}
      <View style={styles.statusGrid}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>System Health</Text>
          <View style={styles.statusValue}>
            <View style={[
              styles.statusIndicator, 
              { backgroundColor: getStatusColor(admin.healthStatus.overall) }
            ]} />
            <Text style={styles.statusText}>
              {admin.healthStatus.overall.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Budget Remaining</Text>
          <Text style={[
            styles.statusText,
            { color: admin.costStatus.budgetRemaining > 0.3 ? '#10B981' : '#EF4444' }
          ]}>
            ${admin.costStatus.budgetRemaining.toFixed(0)}
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Crisis Response</Text>
          <Text style={[
            styles.statusText,
            { color: admin.safetyStatus.crisisResponseTime < 200 ? '#10B981' : '#EF4444' }
          ]}>
            {admin.safetyStatus.crisisResponseTime}ms
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Cost Efficiency</Text>
          <Text style={[
            styles.statusText,
            { color: getCostEfficiencyColor(admin.costStatus.costEfficiency) }
          ]}>
            {(admin.costStatus.costEfficiency * 100).toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* Emergency Controls */}
      {(showEmergencyControls || variant === 'emergency') && emergency.canTriggerEmergency && (
        <View style={styles.emergencySection}>
          <Text style={styles.sectionTitle}>Emergency Controls</Text>
          <View style={styles.emergencyControls}>
            <TouchableOpacity 
              style={[styles.emergencyButton, styles.shutdownButton]}
              onPress={handleEmergencyShutdown}
            >
              <Text style={styles.emergencyButtonText}>🚨 Emergency Shutdown</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.emergencyButton, styles.offlineButton]}
              onPress={emergency.emergencyEnableOffline}
            >
              <Text style={styles.emergencyButtonText}>📱 Force Offline Mode</Text>
            </TouchableOpacity>
          </View>
          
          {emergency.emergencyActive && (
            <View style={styles.emergencyAlert}>
              <Text style={styles.emergencyAlertText}>
                ⚠️ Emergency mode is active. Some features may be disabled.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Cost Overview */}
      <View style={styles.costSection}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setShowCostDetails(!showCostDetails)}
        >
          <Text style={styles.sectionTitle}>Cost Overview</Text>
          <Text style={styles.expandIcon}>
            {showCostDetails ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.costSummary}>
          <Text style={styles.costText}>
            Monthly Projected: ${admin.costStatus.projectedMonthlySpend.toFixed(2)}
          </Text>
          <Text style={styles.costSubtext}>
            Break-even at {admin.costStatus.breakEvenUsers} paying customers
          </Text>
        </View>

        {showCostDetails && (
          <View style={styles.costDetails}>
            {admin.costStatus.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationCard}>
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Category Filter */}
      <View style={styles.categoryFilter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category.id && styles.categoryButtonTextActive
              ]}>
                {category.name} ({category.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Feature Flags List */}
      <View style={styles.featuresSection}>
        {filteredFeatures.map(([flagKey, metadata]) => (
          <FeatureFlagToggle
            key={flagKey}
            flag={flagKey as keyof P0CloudFeatureFlags}
            variant={variant === 'admin' ? 'detailed' : 'default'}
            showCost={variant !== 'user'}
            showSafety={variant === 'admin'}
            showRollout={variant === 'admin'}
            onToggle={(enabled) => {
              console.log(`Feature ${flagKey} toggled: ${enabled}`);
            }}
          />
        ))}
      </View>

      {/* Next Recommended Feature */}
      {context.nextRecommendedFeature && variant === 'user' && (
        <View style={styles.recommendationSection}>
          <Text style={styles.sectionTitle}>Recommended Next</Text>
          <FeatureFlagToggle
            flag={context.nextRecommendedFeature}
            variant="detailed"
            showCost={true}
            showSafety={false}
            showRollout={false}
          />
        </View>
      )}

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All features are disabled by default to preserve offline functionality.
          Crisis response features are always protected and cannot be disabled.
        </Text>
        <Text style={styles.footerSubtext}>
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  emergencySection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyControls: {
    flexDirection: 'row',
    gap: 12,
  },
  emergencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shutdownButton: {
    backgroundColor: '#DC2626',
  },
  offlineButton: {
    backgroundColor: '#7C2D12',
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emergencyAlert: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F87171',
  },
  emergencyAlertText: {
    color: '#DC2626',
    fontWeight: '500',
    textAlign: 'center',
  },
  costSection: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  expandIcon: {
    fontSize: 14,
    color: '#6B7280',
  },
  costSummary: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  costText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  costSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  costDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recommendationCard: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryFilter: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  featuresSection: {
    paddingHorizontal: 16,
  },
  recommendationSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  footer: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});