/**
 * OfflineQueueIndicator - Small indicator for buttons and UI elements
 * Shows when actions will be queued due to offline status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';
import { colorSystem, spacing } from '../../constants/colors';

interface OfflineQueueIndicatorProps {
  showWhenQueued?: boolean; // Show indicator when there are queued items (not just offline)
  inline?: boolean; // Show inline with other content vs as overlay
  style?: any;
}

export const OfflineQueueIndicator: React.FC<OfflineQueueIndicatorProps> = ({
  showWhenQueued = false,
  inline = false,
  style
}) => {
  const { isOffline, queueSize } = useNetwork();

  const shouldShow = isOffline || (showWhenQueued && queueSize > 0);

  if (!shouldShow) {
    return null;
  }

  const getIndicatorText = () => {
    if (isOffline) {
      return 'Will sync when online';
    }
    if (queueSize > 0) {
      return `${queueSize} pending`;
    }
    return '';
  };

  const getIndicatorColor = () => {
    if (isOffline) {
      return colorSystem.status.warning;
    }
    return colorSystem.status.info;
  };

  if (inline) {
    return (
      <View style={[styles.inlineContainer, style]}>
        <View style={[styles.dot, { backgroundColor: getIndicatorColor() }]} />
        <Text style={[styles.inlineText, { color: getIndicatorColor() }]}>
          {getIndicatorText()}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.overlayContainer, style]}>
      <View style={[styles.badge, { backgroundColor: getIndicatorColor() }]}>
        <Text style={styles.badgeText}>
          {isOffline ? '⚠️' : `${queueSize}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Inline variant
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  inlineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Overlay variant
  overlayContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    elevation: 2,
    shadowColor: colorSystem.base.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  badgeText: {
    color: colorSystem.base.white,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
});

export default OfflineQueueIndicator;