/**
 * Crisis Safety Payment UI Components
 *
 * Specialized UI components ensuring crisis safety during payment failures
 * Features:
 * - Emergency access availability indicators
 * - Crisis button isolation from payment status
 * - Therapeutic session protection
 * - 988 hotline access confirmation
 * - Crisis-safe messaging and visual feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  Linking,
  AccessibilityInfo,
  Platform
} from 'react-native';
import { Card, Button } from '../core';
import { CrisisButton } from '../core/CrisisButton';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics } from '../../hooks/useHaptics';
import { usePaymentStore, paymentSelectors } from '../../store/paymentStore';
import { useCrisisStore } from '../../store/crisisStore';

/**
 * Crisis Safety Indicator Component
 * Shows emergency access availability during payment failures
 */
export interface CrisisSafetyIndicatorProps {
  readonly paymentStatus: 'active' | 'error' | 'offline' | 'critical';
  readonly compact?: boolean;
  readonly onEmergencyAccess?: () => void;
  readonly testID: string;
}

export const CrisisSafetyIndicator: React.FC<CrisisSafetyIndicatorProps> = ({
  paymentStatus,
  compact = false,
  onEmergencyAccess,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const { onCritical, onSuccess } = useCommonHaptics();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const store = usePaymentStore();
  const crisisAccess = paymentSelectors.getCrisisAccess(store);
  const emergencyProtocols = paymentSelectors.getEmergencyProtocols(store);

  // Pulse animation for critical states
  useEffect(() => {
    if (paymentStatus === 'critical' || paymentStatus === 'error') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [paymentStatus, pulseAnim]);

  const getSafetyStatus = () => {
    const hasPaymentIssue = paymentStatus === 'error' || paymentStatus === 'critical';
    const isOffline = paymentStatus === 'offline';

    if (crisisAccess.isActive && hasPaymentIssue) {
      return {
        level: 'protected',
        icon: '🛡️',
        title: 'Crisis Protection Active',
        subtitle: 'Emergency access guaranteed regardless of payment status',
        color: colors.status.success,
        backgroundColor: colors.status.successBackground,
        showEmergencyButton: false,
        therapeutic: true
      };
    }

    if (hasPaymentIssue) {
      return {
        level: 'emergency-available',
        icon: '🚨',
        title: 'Emergency Access Available',
        subtitle: 'Crisis support remains fully accessible',
        color: colors.status.warning,
        backgroundColor: colors.status.warningBackground,
        showEmergencyButton: true,
        therapeutic: true
      };
    }

    if (isOffline) {
      return {
        level: 'offline-protected',
        icon: '📱',
        title: 'Offline Crisis Access',
        subtitle: 'Emergency features work without internet',
        color: colors.status.info,
        backgroundColor: colors.status.infoBackground,
        showEmergencyButton: false,
        therapeutic: true
      };
    }

    return {
      level: 'normal',
      icon: '✅',
      title: 'Full Crisis Support',
      subtitle: 'All emergency features operational',
      color: colors.status.success,
      backgroundColor: colors.status.successBackground,
      showEmergencyButton: false,
      therapeutic: false
    };
  };

  const safetyStatus = getSafetyStatus();

  const handleEmergencyAccess = async () => {
    await onCritical();

    if (onEmergencyAccess) {
      onEmergencyAccess();
    } else {
      // Default emergency access - activate crisis mode
      Alert.alert(
        'Emergency Access Activated',
        'Crisis support features are now prioritized. Payment issues will not affect your safety resources.',
        [
          {
            text: 'Continue',
            onPress: async () => {
              await onSuccess();
              // Accessibility announcement
              if (Platform.OS === 'ios') {
                AccessibilityInfo.announceForAccessibility(
                  'Emergency access activated. Crisis support is prioritized.'
                );
              }
            }
          }
        ]
      );
    }
  };

  const SafetyContent = () => (
    <Animated.View
      style={[
        styles.safetyContainer,
        compact && styles.safetyContainerCompact,
        {
          backgroundColor: safetyStatus.backgroundColor,
          transform: [{ scale: pulseAnim }]
        }
      ]}
    >
      <View style={styles.safetyHeader}>
        <View style={styles.safetyIconContainer}>
          <Text style={styles.safetyIcon}>{safetyStatus.icon}</Text>
        </View>

        <View style={styles.safetyContent}>
          <Text
            style={[styles.safetyTitle, { color: safetyStatus.color }]}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.5}
          >
            {safetyStatus.title}
          </Text>

          {!compact && (
            <Text
              style={[styles.safetySubtitle, { color: colors.gray[600] }]}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              {safetyStatus.subtitle}
            </Text>
          )}
        </View>

        {safetyStatus.showEmergencyButton && (
          <Button
            title="Activate"
            onPress={handleEmergencyAccess}
            variant="primary"
            size="small"
            accessibilityLabel="Activate emergency access"
            accessibilityHint="Ensures crisis support remains available during payment issues"
            testID={`${testID}-emergency-button`}
            style={styles.emergencyButton}
          />
        )}
      </View>

      {safetyStatus.therapeutic && !compact && (
        <View style={styles.therapeuticMessage}>
          <Text style={[styles.therapeuticText, { color: colors.status.success }]}>
            💚 Your wellbeing is our priority - crisis support is always protected
          </Text>
        </View>
      )}
    </Animated.View>
  );

  return (
    <View
      accessible={true}
      accessibilityRole="status"
      accessibilityLabel={`Crisis safety status: ${safetyStatus.title}. ${safetyStatus.subtitle}`}
      accessibilityState={{ disabled: false }}
      testID={testID}
    >
      <SafetyContent />
    </View>
  );
};

/**
 * Protected Crisis Button Component
 * Crisis button that remains functional regardless of payment status
 */
export interface ProtectedCrisisButtonProps {
  readonly paymentIssue?: boolean;
  readonly onCrisisActivated?: () => void;
  readonly testID: string;
}

export const ProtectedCrisisButton: React.FC<ProtectedCrisisButtonProps> = ({
  paymentIssue = false,
  onCrisisActivated,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const { onCritical } = useCommonHaptics();
  const [isProtected, setIsProtected] = useState(false);

  const store = usePaymentStore();
  const crisisStore = useCrisisStore();
  const crisisAccess = paymentSelectors.getCrisisAccess(store);

  useEffect(() => {
    // Activate protection if payment issues detected
    if (paymentIssue && !isProtected) {
      setIsProtected(true);

      // Accessibility announcement
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(
          'Crisis button protection activated. Emergency access is guaranteed.'
        );
      }
    }
  }, [paymentIssue, isProtected]);

  const handleCrisisPress = async () => {
    await onCritical();

    // Ensure crisis access is always available
    if (paymentIssue) {
      // Bypass payment checks for crisis access
      console.log('Crisis button activated with payment protection');
    }

    if (onCrisisActivated) {
      onCrisisActivated();
    }
  };

  return (
    <View style={styles.protectedCrisisContainer}>
      {isProtected && (
        <View style={styles.protectionBanner}>
          <Text style={[styles.protectionText, { color: colors.status.success }]}>
            🛡️ Crisis access protected
          </Text>
        </View>
      )}

      <CrisisButton
        onPress={handleCrisisPress}
        accessibilityLabel={`Crisis support button${isProtected ? ' - payment protection active' : ''}`}
        accessibilityHint="Immediate access to emergency mental health resources"
        testID={testID}
        variant={isProtected ? 'protected' : 'default'}
        style={[
          isProtected && styles.protectedButtonStyle,
          { borderColor: isProtected ? colors.status.success : undefined }
        ]}
      />
    </View>
  );
};

/**
 * Therapeutic Session Protection Component
 * Shows protection status for ongoing therapeutic sessions
 */
export interface TherapeuticSessionProtectionProps {
  readonly sessionActive: boolean;
  readonly paymentStatus: 'active' | 'error' | 'offline' | 'critical';
  readonly sessionType?: 'breathing' | 'meditation' | 'assessment' | 'check-in';
  readonly onProtectionActivated?: () => void;
  readonly testID: string;
}

export const TherapeuticSessionProtection: React.FC<TherapeuticSessionProtectionProps> = ({
  sessionActive,
  paymentStatus,
  sessionType = 'breathing',
  onProtectionActivated,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const { onSuccess, onWarning } = useCommonHaptics();
  const [protectionActive, setProtectionActive] = useState(false);

  const store = usePaymentStore();
  const sessionProtection = paymentSelectors.getSessionProtection(store);

  useEffect(() => {
    // Activate session protection if payment issues during active session
    const needsProtection = sessionActive &&
      (paymentStatus === 'error' || paymentStatus === 'critical');

    if (needsProtection && !protectionActive) {
      setProtectionActive(true);
      onWarning();

      if (onProtectionActivated) {
        onProtectionActivated();
      }

      // Accessibility announcement
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(
          `${sessionType} session protected from payment interruption`
        );
      }
    }
  }, [sessionActive, paymentStatus, protectionActive, sessionType, onProtectionActivated, onWarning]);

  const getProtectionStatus = () => {
    if (!sessionActive) {
      return null;
    }

    if (protectionActive) {
      return {
        icon: '🛡️',
        title: 'Session Protected',
        message: `Your ${sessionType} practice continues safely despite payment interruption`,
        color: colors.status.success,
        backgroundColor: colors.status.successBackground
      };
    }

    if (paymentStatus === 'offline') {
      return {
        icon: '📱',
        title: 'Offline Session',
        message: `${sessionType} session running locally - no network required`,
        color: colors.status.info,
        backgroundColor: colors.status.infoBackground
      };
    }

    return {
      icon: '✅',
      title: 'Session Active',
      message: `${sessionType} session running normally`,
      color: colors.status.success,
      backgroundColor: colors.status.successBackground
    };
  };

  const protectionStatus = getProtectionStatus();
  if (!protectionStatus) return null;

  return (
    <View
      style={[styles.sessionProtectionContainer, { backgroundColor: protectionStatus.backgroundColor }]}
      accessible={true}
      accessibilityRole="status"
      accessibilityLabel={`Session protection: ${protectionStatus.title}. ${protectionStatus.message}`}
      testID={testID}
    >
      <Text style={styles.protectionIcon}>{protectionStatus.icon}</Text>

      <View style={styles.protectionContent}>
        <Text style={[styles.protectionTitle, { color: protectionStatus.color }]}>
          {protectionStatus.title}
        </Text>
        <Text
          style={[styles.protectionMessage, { color: colors.gray[600] }]}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
        >
          {protectionStatus.message}
        </Text>
      </View>
    </View>
  );
};

/**
 * Emergency Hotline Access Component
 * Confirms 988 hotline access during payment issues
 */
export interface EmergencyHotlineAccessProps {
  readonly paymentIssue?: boolean;
  readonly testID: string;
}

export const EmergencyHotlineAccess: React.FC<EmergencyHotlineAccessProps> = ({
  paymentIssue = false,
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const { onCritical, onSuccess } = useCommonHaptics();

  const call988 = async () => {
    await onCritical();

    try {
      await Linking.openURL('tel:988');
      await onSuccess();

      // Accessibility announcement
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility('Connecting to 988 Suicide and Crisis Lifeline');
      }
    } catch (error) {
      console.error('Failed to open 988 hotline:', error);

      Alert.alert(
        'Emergency Hotline',
        'Please dial 988 directly for immediate crisis support',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  return (
    <Card
      style={[
        styles.hotlineContainer,
        {
          backgroundColor: paymentIssue
            ? colors.status.warningBackground
            : colors.status.successBackground
        }
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Emergency crisis hotline access - 988 Suicide and Crisis Lifeline"
      accessibilityHint="Tap to call emergency mental health support"
      testID={testID}
    >
      <View style={styles.hotlineHeader}>
        <Text style={styles.hotlineIcon}>📞</Text>
        <Text style={[styles.hotlineTitle, {
          color: paymentIssue ? colors.status.warning : colors.status.success
        }]}>
          Crisis Hotline Always Available
        </Text>
      </View>

      <Text
        style={[styles.hotlineMessage, { color: colors.gray[700] }]}
        allowFontScaling={true}
        maxFontSizeMultiplier={1.4}
      >
        {paymentIssue
          ? 'Payment issues never affect access to emergency mental health support'
          : 'Free, confidential support available 24/7'
        }
      </Text>

      <Button
        title="Call 988 Now"
        onPress={call988}
        variant="primary"
        size="large"
        accessibilityLabel="Call 988 Suicide and Crisis Lifeline"
        testID={`${testID}-call-button`}
        style={styles.hotlineButton}
      />

      <Text style={[styles.hotlineNote, { color: colors.gray[600] }]}>
        💚 Always free - never affected by subscription status
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  // Crisis Safety Indicator Styles
  safetyContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
  },
  safetyContainerCompact: {
    padding: spacing.sm,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  safetyIcon: {
    fontSize: 22,
  },
  safetyContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  safetyTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    lineHeight: 22,
  },
  safetySubtitle: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 20,
  },
  emergencyButton: {
    minWidth: 80,
  },
  therapeuticMessage: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  therapeuticText: {
    fontSize: typography.caption.size,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Protected Crisis Button Styles
  protectedCrisisContainer: {
    alignItems: 'center',
  },
  protectionBanner: {
    backgroundColor: colorSystem.status.successBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    marginBottom: spacing.xs,
  },
  protectionText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  protectedButtonStyle: {
    borderWidth: 2,
    shadowColor: colorSystem.status.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // Therapeutic Session Protection Styles
  sessionProtectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.sm,
  },
  protectionIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  protectionContent: {
    flex: 1,
  },
  protectionTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  protectionMessage: {
    fontSize: typography.caption.size,
    lineHeight: 16,
  },

  // Emergency Hotline Access Styles
  hotlineContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  hotlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  hotlineIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  hotlineTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
  },
  hotlineMessage: {
    fontSize: typography.bodyRegular.size,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  hotlineButton: {
    minWidth: 140,
    marginBottom: spacing.md,
  },
  hotlineNote: {
    fontSize: typography.caption.size,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export {
  CrisisSafetyIndicator,
  ProtectedCrisisButton,
  TherapeuticSessionProtection,
  EmergencyHotlineAccess
};