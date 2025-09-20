/**
 * FeatureList Component
 *
 * Displays clinical features with consistent styling and accessibility.
 * Used across multiple panes to highlight key capabilities.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';

import { FeatureListProps } from '../types';
import { ClinicalIcon } from './ClinicalIcon';

const FeatureList: React.FC<FeatureListProps & { showIcons?: boolean }> = memo(({
  features,
  showIcons = true,
  icon
}) => {
  const getFeatureIcon = (feature: string) => {
    if (feature.toLowerCase().includes('share')) return 'share';
    if (feature.toLowerCase().includes('track') || feature.toLowerCase().includes('history')) return 'history';
    if (feature.toLowerCase().includes('validated') || feature.toLowerCase().includes('accuracy')) return 'verified';
    return 'info';
  };

  return (
    <View
      style={styles.featureList}
      accessible={true}
      accessibilityRole="list"
      accessibilityLabel="Clinical features list"
    >
      {features.map((feature, index) => (
        <View
          key={index}
          style={styles.featureRow}
          accessible={true}
          accessibilityRole="listitem"
          accessibilityLabel={feature}
        >
          {showIcons && (
            <View style={styles.iconContainer}>
              {icon || (
                <ClinicalIcon
                  type={getFeatureIcon(feature)}
                  size={18}
                  color="#2C5282"
                  accessibilityLabel=""
                />
              )}
            </View>
          )}
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  featureList: {
    gap: 12
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  featureText: {
    fontSize: 14,
    color: '#2D3748',
    flex: 1,
    lineHeight: 20,
    fontWeight: '400'
  }
});

FeatureList.displayName = 'FeatureList';

export { FeatureList };