/**
 * Feature Flag Toggle Component
 * Individual feature toggle with consent management and cost transparency
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Switch } from 'react-native';
import { 
  useCostAwareFeature, 
  useSafetyAwareFeature,
  useProgressiveFeature 
} from '../../hooks/useFeatureFlags';
import { P0CloudFeatureFlags } from '../../types/feature-flags';
import { colors, spacing, typography } from '../../theme';

interface FeatureFlagToggleProps {
  flag: keyof P0CloudFeatureFlags;
  variant?: 'default' | 'compact' | 'detailed';
  showCost?: boolean;
  showSafety?: boolean;
  showRollout?: boolean;
  onToggle?: (enabled: boolean) => void;
}

export const FeatureFlagToggle: React.FC<FeatureFlagToggleProps> = ({
  flag,
  variant = 'default',
  showCost = true,
  showSafety = true,
  showRollout = true,
  onToggle
}) => {
  const costFeature = useCostAwareFeature(flag);
  const safetyFeature = useSafetyAwareFeature(flag);
  const progressiveFeature = useProgressiveFeature(flag);
  
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (value: boolean) => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      if (value) {
        // Check if consent is required
        if (costFeature.requiresConsent && !costFeature.hasConsent) {
          await showConsentDialog();
          return;
        }

        // Check if feature is available
        if (!progressiveFeature.enabled && progressiveFeature.waitlisted) {
          Alert.alert(
            'Feature Not Available',
            progressiveFeature.estimatedAvailability || 'This feature is not yet available for your account.'
          );
          return;
        }

        // Check cost implications
        if (showCost && costFeature.costImpact !== 'none' && costFeature.monthlyEstimate > 5) {
          await showCostConfirmation();
          return;
        }

        // Request access
        await costFeature.requestAccess();
        onToggle?.(true);
      } else {
        // Check if can be disabled
        if (safetyFeature.crisisProtected) {
          Alert.alert(
            'Cannot Disable',
            'This feature is protected and cannot be disabled as it may be needed in crisis situations.'
          );
          return;
        }

        // Confirm disabling
        Alert.alert(
          'Disable Feature',
          `Are you sure you want to disable ${costFeature.metadata.displayName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Disable', 
              style: 'destructive',
              onPress: async () => {
                await costFeature.updateConsent(false);
                onToggle?.(false);
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update feature'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const showConsentDialog = async () => {
    Alert.alert(
      'Data Consent Required',
      `${costFeature.metadata.displayName} requires access to your data. Do you consent to this?`,
      [
        { text: 'Decline', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: async () => {
            await costFeature.updateConsent(true);
            await costFeature.requestAccess();
            onToggle?.(true);
          }
        }
      ]
    );
  };

  const showCostConfirmation = async () => {
    Alert.alert(
      'Cost Confirmation',
      `This feature has an estimated monthly cost of $${costFeature.monthlyEstimate.toFixed(2)}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Enable', 
          onPress: async () => {
            await costFeature.requestAccess();
            onToggle?.(true);
          }
        }
      ]
    );
  };

  const getCostBadgeColor = () => {
    switch (costFeature.costImpact) {
      case 'none': return '#10B981'; // Green
      case 'low': return '#F59E0B'; // Yellow
      case 'medium': return '#F97316'; // Orange
      case 'high': return '#EF4444'; // Red
      case 'variable': return '#3B82F6'; // Blue
      default: return '#6B7280'; // Gray
    }
  };

  const getSafetyBadgeColor = () => {
    if (!safetyFeature.safetyValidated) return '#EF4444';
    if (safetyFeature.crisisProtected) return '#10B981';
    return '#F59E0B';
  };

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {costFeature.metadata.displayName}
        </Text>
        <Switch
          value={costFeature.enabled}
          onValueChange={handleToggle}
          disabled={isUpdating || costFeature.loading}
        />
      </View>
    );
  }

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        variant === 'detailed' && styles.detailedContainer,
        pressed && { backgroundColor: '#f8f9fa', transform: [{ scale: 0.998 }] }
      ]}
      onPress={() => handleToggle(!costFeature.enabled)}
      disabled={isUpdating || costFeature.loading}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {costFeature.metadata.displayName}
          </Text>
          <View style={styles.badges}>
            {showCost && costFeature.costImpact !== 'none' && (
              <View style={[styles.badge, { backgroundColor: getCostBadgeColor() }]}>
                <Text style={styles.badgeText}>
                  {costFeature.costImpact.toUpperCase()}
                </Text>
              </View>
            )}
            {showSafety && safetyFeature.hipaaRelevant && (
              <View style={[styles.badge, { backgroundColor: getSafetyBadgeColor() }]}>
                <Text style={styles.badgeText}>
                  HIPAA
                </Text>
              </View>
            )}
            {showRollout && progressiveFeature.isInRollout && (
              <View style={[styles.badge, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.badgeText}>
                  {progressiveFeature.rolloutPercentage}% ROLLOUT
                </Text>
              </View>
            )}
          </View>
        </View>
        <Switch
          value={costFeature.enabled}
          onValueChange={handleToggle}
          disabled={isUpdating || costFeature.loading}
        />
      </View>

      <Text style={styles.description}>
        {costFeature.metadata.description}
      </Text>

      {variant === 'detailed' && (
        <View style={styles.details}>
          {showCost && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Monthly Cost:</Text>
              <Text style={styles.detailValue}>
                {costFeature.costImpact === 'none' 
                  ? 'Free' 
                  : `$${costFeature.monthlyEstimate.toFixed(2)}`}
              </Text>
            </View>
          )}

          {showSafety && safetyFeature.hipaaRelevant && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Data Encryption:</Text>
              <Text style={[
                styles.detailValue,
                { color: safetyFeature.safetyValidated ? '#10B981' : '#EF4444' }
              ]}>
                {safetyFeature.safetyValidated ? 'Validated' : 'Pending'}
              </Text>
            </View>
          )}

          {showRollout && progressiveFeature.waitlisted && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Availability:</Text>
              <Text style={styles.detailValue}>
                {progressiveFeature.estimatedAvailability}
              </Text>
            </View>
          )}

          {costFeature.requiresConsent && (
            <View style={styles.consentContainer}>
              <Text style={styles.consentText}>
                {costFeature.hasConsent 
                  ? '✓ You have consented to data usage'
                  : '⚠️ Requires data consent'}
              </Text>
              {!costFeature.hasConsent && (
                <Pressable 
                  style={({ pressed }) => [
                    styles.consentButton,
                    pressed && { backgroundColor: '#2563eb', transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={() => costFeature.updateConsent(true)}
                >
                  <Text style={styles.consentButtonText}>
                    Grant Consent
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      {progressiveFeature.waitlisted && (
        <View style={styles.waitlistBanner}>
          <Text style={styles.waitlistText}>
            🎯 You're on the waitlist! {progressiveFeature.estimatedAvailability}
          </Text>
        </View>
      )}

      {costFeature.costLimited && (
        <View style={styles.limitedBanner}>
          <Text style={styles.limitedText}>
            💰 Temporarily limited due to budget constraints
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailedContainer: {
    padding: 20,
  },
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  compactTitle: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 10,
  },
  details: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  consentContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  consentText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  consentButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  consentButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  waitlistBanner: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#3B82F620',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  waitlistText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  limitedBanner: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F59E0B20',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  limitedText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
});