/**
 * NetworkStatusBanner - Shows connection status and offline queue information
 * Displays at the top of screens when offline or when sync is in progress
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';
import { colorSystem, spacing } from '../../constants/colors';

interface NetworkStatusBannerProps {
  style?: any;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ style }) => {
  const {
    isOnline,
    isOffline,
    queueSize,
    isProcessingQueue,
    networkQuality,
    forceProcessQueue
  } = useNetwork();

  const [animatedValue] = React.useState(new Animated.Value(0));

  // Show banner when offline OR when there are queued items
  const shouldShow = isOffline || queueSize > 0;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, animatedValue]);

  const handleBannerPress = async () => {
    if (isOnline && queueSize > 0) {
      await forceProcessQueue();
    }
  };

  const getBannerColor = () => {
    if (isOffline) {
      return colorSystem.status.error;
    }
    if (isProcessingQueue) {
      return colorSystem.themes.midday.primary;
    }
    if (queueSize > 0) {
      return colorSystem.status.warning;
    }
    return colorSystem.status.success;
  };

  const getBannerText = () => {
    if (isOffline && queueSize > 0) {
      return `Offline - ${queueSize} action${queueSize !== 1 ? 's' : ''} will sync when connected`;
    }
    if (isOffline) {
      return 'You\'re offline - changes will sync when connected';
    }
    if (isProcessingQueue) {
      return 'Syncing data...';
    }
    if (queueSize > 0) {
      return `${queueSize} action${queueSize !== 1 ? 's' : ''} pending sync - tap to retry`;
    }
    return '';
  };

  const getNetworkQualityIcon = () => {
    switch (networkQuality) {
      case 'excellent':
        return '📶';
      case 'good':
        return '📶';
      case 'poor':
        return '📵';
      case 'offline':
        return '❌';
      default:
        return '';
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBannerColor(),
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.touchable,
          pressed && (isOnline && queueSize > 0) && styles.touchablePressed
        ]}
        onPress={handleBannerPress}
        disabled={isOffline || queueSize === 0}
        accessibilityRole="button"
        accessibilityLabel={
          isOffline
            ? "Network offline status"
            : queueSize > 0
              ? `Tap to sync ${queueSize} queued items`
              : "Network connection status"
        }
        accessibilityHint={
          isOnline && queueSize > 0
            ? "Tap to process queued data synchronization"
            : undefined
        }
        android_ripple={
          isOnline && queueSize > 0
            ? { color: '#ffffff40', borderless: false }
            : undefined
        }
      >
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <Text style={styles.icon}>
              {isProcessingQueue ? '⏳' : getNetworkQualityIcon()}
            </Text>
            <View style={styles.textContainer}>
              <Text style={styles.text}>{getBannerText()}</Text>
              {isOffline && (
                <Text style={styles.subtext}>
                  Your progress is saved locally
                </Text>
              )}
            </View>
          </View>
          
          {isOnline && queueSize > 0 && !isProcessingQueue && (
            <View style={styles.rightContent}>
              <Text style={styles.actionText}>TAP TO SYNC</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    elevation: 4,
    shadowColor: colorSystem.base.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  touchable: {
    flex: 1,
  },
  touchablePressed: {
    opacity: 0.8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  subtext: {
    color: colorSystem.base.white,
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  rightContent: {
    marginLeft: spacing.sm,
  },
  actionText: {
    color: colorSystem.base.white,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
});

export default NetworkStatusBanner;