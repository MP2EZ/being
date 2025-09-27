/**
 * CrisisSyncBadge - Visual crisis data priority indicator
 *
 * Features:
 * - Visual crisis data priority indicator
 * - Emergency status communication
 * - Crisis mode activation indicator
 * - Accessibility: High contrast, large touch targets
 * - Haptic feedback for crisis state changes
 * - Performance: <100ms response to crisis state changes
 */

import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Platform
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';

// Crisis states and priorities
interface CrisisState {
  active: boolean;
  level: 'none' | 'detected' | 'confirmed' | 'emergency';
  source: 'phq9' | 'gad7' | 'crisis_button' | 'manual' | 'system';
  timestamp: string;
  dataTypes: Array<'assessment' | 'crisis_plan' | 'emergency_contacts' | 'session_data'>;
  syncStatus: 'syncing' | 'synced' | 'failed' | 'pending';
  priority: 'normal' | 'high' | 'critical' | 'immediate';
}

interface CrisisSyncBadgeProps {
  crisisState: CrisisState;
  onPress?: () => void;
  placement?: 'floating' | 'inline' | 'header';
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  testID?: string;
}

export const CrisisSyncBadge: React.FC<CrisisSyncBadgeProps> = React.memo(({
  crisisState,
  onPress,
  placement = 'floating',
  size = 'medium',
  showText = true,
  testID = 'crisis-sync-badge'
}) => {
  const { colorSystem } = useTheme();
  const { triggerHaptic } = useHaptics();

  // Pre-allocated animated values with refs for optimal performance (<100ms response)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Pre-calculate animation references to avoid re-creation
  const animationRefs = useRef({
    emergencyPulse: null as Animated.CompositeAnimation | null,
    confirmPulse: null as Animated.CompositeAnimation | null,
    rotation: null as Animated.CompositeAnimation | null
  });

  // Memoized crisis display configuration for performance
  const crisisConfig = useMemo(() => {
    if (!crisisState.active || crisisState.level === 'none') {
      return null;
    }

    switch (crisisState.level) {
      case 'detected':
        return {
          color: colorSystem.status.warning,
          backgroundColor: colorSystem.status.warningBackground,
          icon: '⚠️',
          label: 'Crisis Detected',
          shortLabel: 'ALERT',
          accessibilityHint: 'Crisis indicators detected, sync priority elevated',
          hapticType: 'warning' as const
        };
      case 'confirmed':
        return {
          color: colorSystem.status.error,
          backgroundColor: colorSystem.status.errorBackground,
          icon: '🚨',
          label: 'Crisis Confirmed',
          shortLabel: 'CRISIS',
          accessibilityHint: 'Crisis confirmed, emergency sync active',
          hapticType: 'error' as const
        };
      case 'emergency':
        return {
          color: colorSystem.status.critical,
          backgroundColor: colorSystem.status.criticalBackground,
          icon: '🆘',
          label: 'Emergency Mode',
          shortLabel: 'EMERGENCY',
          accessibilityHint: 'Emergency mode active, immediate sync priority',
          hapticType: 'heavy' as const
        };
      default:
        return null;
    }
  }, [crisisState.active, crisisState.level, colorSystem]);

  // Memoized sync status indicator for performance
  const syncStatus = useMemo(() => {
    switch (crisisState.syncStatus) {
      case 'syncing':
        return { icon: '↻', label: 'Syncing', color: colorSystem.status.info };
      case 'synced':
        return { icon: '✓', label: 'Synced', color: colorSystem.status.success };
      case 'failed':
        return { icon: '✗', label: 'Failed', color: colorSystem.status.error };
      case 'pending':
        return { icon: '○', label: 'Pending', color: colorSystem.gray[500] };
      default:
        return { icon: '?', label: 'Unknown', color: colorSystem.gray[400] };
    }
  }, [crisisState.syncStatus, colorSystem]);

  // Optimized crisis state change handling with pre-allocated animations
  useEffect(() => {
    if (!crisisConfig) {
      // Scale down and hide with immediate response
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150, // Reduced from 200ms for faster response
        useNativeDriver: true
      }).start();
      return;
    }

    // Immediate scale in animation for crisis display
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200, // Increased tension for faster response
      friction: 8
    }).start();

    // Immediate haptic feedback for crisis state changes
    if (crisisConfig.hapticType) {
      triggerHaptic(crisisConfig.hapticType).catch(() => {
        // Silent fail for haptic errors to maintain performance
      });
    }

    // Announce crisis state to screen readers (non-blocking)
    const announcement = `${crisisConfig.label}. ${crisisConfig.accessibilityHint}`;
    AccessibilityInfo.announceForAccessibility(announcement);

    // Optimized pulse animation management
    const refs = animationRefs.current;

    // Clean up previous animations immediately
    if (refs.emergencyPulse) refs.emergencyPulse.stop();
    if (refs.confirmPulse) refs.confirmPulse.stop();

    // Emergency pulse animation (high priority)
    if (crisisState.level === 'emergency') {
      refs.emergencyPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500, // Faster for emergency
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ])
      );
      refs.emergencyPulse.start();
    } else if (crisisState.level === 'confirmed') {
      refs.confirmPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800, // Reduced from 1000ms
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          })
        ])
      );
      refs.confirmPulse.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      // Cleanup on dependency change
      if (refs.emergencyPulse) refs.emergencyPulse.stop();
      if (refs.confirmPulse) refs.confirmPulse.stop();
    };
  }, [crisisState.level, crisisConfig, scaleAnim, pulseAnim, triggerHaptic]);

  // Optimized sync status rotation animation
  useEffect(() => {
    const refs = animationRefs.current;

    if (crisisState.syncStatus === 'syncing') {
      // Stop previous rotation if exists
      if (refs.rotation) refs.rotation.stop();

      refs.rotation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800, // Slightly faster for better responsiveness
          useNativeDriver: true
        })
      );
      refs.rotation.start();
    } else {
      if (refs.rotation) refs.rotation.stop();
      rotateAnim.setValue(0);
    }

    return () => {
      if (refs.rotation) refs.rotation.stop();
    };
  }, [crisisState.syncStatus, rotateAnim]);

  // Optimized press handler for <50ms response time
  const handlePress = useCallback(() => {
    if (!onPress) return;

    // Immediate action for crisis response
    onPress();

    // Non-blocking haptic feedback
    triggerHaptic('medium').catch(() => {
      // Silent fail to maintain performance
    });
  }, [onPress, triggerHaptic]);

  // Don't render if no crisis state
  if (!crisisConfig) {
    return null;
  }

  // Memoized size-specific styles for performance
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          container: { minWidth: 24, minHeight: 24, paddingHorizontal: 6, paddingVertical: 2 },
          icon: { fontSize: 12 },
          text: { fontSize: typography.micro.size },
          syncIcon: { fontSize: 8 }
        };
      case 'large':
        return {
          container: { minWidth: 48, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8 },
          icon: { fontSize: 20 },
          text: { fontSize: typography.bodyRegular.size },
          syncIcon: { fontSize: 12 }
        };
      case 'medium':
      default:
        return {
          container: { minWidth: 32, minHeight: 32, paddingHorizontal: 8, paddingVertical: 4 },
          icon: { fontSize: 16 },
          text: { fontSize: typography.caption.size },
          syncIcon: { fontSize: 10 }
        };
    }
  }, [size]);

  // Memoized placement-specific styles for performance
  const placementStyles = useMemo(() => {
    switch (placement) {
      case 'floating':
        return {
          position: 'absolute' as const,
          top: 60, // Below header
          right: spacing.md,
          zIndex: 1000,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        };
      case 'header':
        return {
          marginHorizontal: spacing.sm,
        };
      case 'inline':
      default:
        return {};
    }
  }, [placement]);

  // Render the badge
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: crisisConfig.backgroundColor,
          borderColor: crisisConfig.color,
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }]
        },
        sizeStyles.container,
        placementStyles
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.touchable,
          pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }
        ]}
        onPress={handlePress}
        disabled={!onPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${crisisConfig.label}, sync status: ${syncStatus.label}`}
        accessibilityHint={crisisConfig.accessibilityHint}
        accessibilityState={{
          busy: crisisState.syncStatus === 'syncing'
        }}
        testID={testID}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={[styles.crisisIcon, sizeStyles.icon]}>
              {crisisConfig.icon}
            </Text>

            {/* Sync status overlay */}
            <Animated.View
              style={[
                styles.syncStatusOverlay,
                {
                  backgroundColor: syncStatus.color,
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }
                  ]
                }
              ]}
            >
              <Text style={[styles.syncIcon, sizeStyles.syncIcon, { color: 'white' }]}>
                {syncStatus.icon}
              </Text>
            </Animated.View>
          </View>

          {showText && size !== 'small' && (
            <View style={styles.textContainer}>
              <Text style={[styles.crisisText, { color: crisisConfig.color }, sizeStyles.text]}>
                {size === 'large' ? crisisConfig.label : crisisConfig.shortLabel}
              </Text>

              {size === 'large' && (
                <Text style={[styles.syncText, { color: syncStatus.color }, { fontSize: typography.micro.size }]}>
                  {syncStatus.label}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Priority indicator */}
        {crisisState.priority === 'immediate' && (
          <View style={[styles.priorityIndicator, { backgroundColor: crisisConfig.color }]}>
            <Text style={styles.priorityText}>!</Text>
          </View>
        )}

        {/* Data type indicators */}
        {crisisState.dataTypes.length > 0 && size === 'large' && (
          <View style={styles.dataTypesContainer}>
            {crisisState.dataTypes.map((type, index) => (
              <View
                key={type}
                style={[styles.dataTypeBadge, { backgroundColor: `${crisisConfig.color}20` }]}
              >
                <Text style={[styles.dataTypeText, { color: crisisConfig.color }]}>
                  {getDataTypeIcon(type)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

// Helper function to get data type icons
const getDataTypeIcon = (type: CrisisState['dataTypes'][0]): string => {
  switch (type) {
    case 'assessment':
      return '📋';
    case 'crisis_plan':
      return '🛡️';
    case 'emergency_contacts':
      return '📞';
    case 'session_data':
      return '📊';
    default:
      return '📄';
  }
};

CrisisSyncBadge.displayName = 'CrisisSyncBadge';

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crisisIcon: {
    textAlign: 'center',
  },
  syncStatusOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  syncIcon: {
    fontWeight: '600',
    textAlign: 'center',
  },
  textContainer: {
    marginLeft: spacing.xs,
    alignItems: 'center',
  },
  crisisText: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  syncText: {
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
  priorityIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },
  dataTypesContainer: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  dataTypeBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  dataTypeText: {
    fontSize: 8,
  },
});

export default CrisisSyncBadge;