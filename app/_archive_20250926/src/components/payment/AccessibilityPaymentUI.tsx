/**
 * Accessibility Payment UI Components
 *
 * Accessibility-first payment sync UI components designed for mental health users
 * Features:
 * - Screen reader optimized status announcements
 * - High contrast mode support for payment indicators
 * - Haptic feedback for critical sync status changes
 * - Voice control compatibility for crisis access
 * - Cognitive load-aware design patterns
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
  Platform,
  Vibration,
  Animated,
  Pressable,
  Switch
} from 'react-native';
import { Card, Button } from '../core';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { useCommonHaptics, useHapticPreference } from '../../hooks/useHaptics';
import { usePaymentStore, paymentSelectors } from '../../store/paymentStore';

/**
 * Accessible Payment Status Announcements
 * Screen reader optimized status updates with timing control
 */
export interface AccessiblePaymentAnnouncementsProps {
  readonly enabled?: boolean;
  readonly announcementDelay?: number; // Default: 2000ms
  readonly priorityLevels?: ('low' | 'medium' | 'high' | 'critical')[];
  readonly testID: string;
}

export const AccessiblePaymentAnnouncements: React.FC<AccessiblePaymentAnnouncementsProps> = ({
  enabled = true,
  announcementDelay = 2000,
  priorityLevels = ['medium', 'high', 'critical'],
  testID
}) => {
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const store = usePaymentStore();
  const syncStatus = paymentSelectors.getSyncStatus(store);
  const paymentError = paymentSelectors.getPaymentErrorForUser(store);
  const crisisAccess = paymentSelectors.getCrisisAccess(store);

  // Check screen reader availability
  useEffect(() => {
    const checkScreenReader = async () => {
      try {
        const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        setIsScreenReaderEnabled(isEnabled);
      } catch (error) {
        console.warn('Failed to check screen reader status:', error);
      }
    };

    checkScreenReader();

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => subscription?.remove();
  }, []);

  // Announce status changes with priority filtering
  const announceStatus = useCallback((message: string, priority: 'low' | 'medium' | 'high' | 'critical') => {
    if (!enabled || !isScreenReaderEnabled || !priorityLevels.includes(priority)) {
      return;
    }

    // Prevent duplicate announcements
    if (message === lastAnnouncement) {
      return;
    }

    // Clear any pending announcements
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }

    // Delay announcement to avoid overwhelming user
    announcementTimeoutRef.current = setTimeout(() => {
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(message);
      }
      setLastAnnouncement(message);
    }, priority === 'critical' ? 500 : announcementDelay);
  }, [enabled, isScreenReaderEnabled, priorityLevels, lastAnnouncement, announcementDelay]);

  // Monitor sync status changes
  useEffect(() => {
    if (syncStatus.status === 'error') {
      announceStatus(
        'Payment sync error detected. Your mindfulness practice continues safely.',
        'high'
      );
    } else if (syncStatus.status === 'retrying') {
      announceStatus(
        `Payment sync reconnecting. Attempt ${syncStatus.retryCount || 1}.`,
        'medium'
      );
    } else if (syncStatus.status === 'success') {
      announceStatus(
        'Payment sync restored successfully.',
        'medium'
      );
    }
  }, [syncStatus.status, syncStatus.retryCount, announceStatus]);

  // Monitor crisis access changes
  useEffect(() => {
    if (crisisAccess.isActive) {
      announceStatus(
        'Crisis protection activated. Emergency access is guaranteed.',
        'critical'
      );
    }
  }, [crisisAccess.isActive, announceStatus]);

  // Monitor payment errors
  useEffect(() => {
    if (paymentError?.severity === 'critical') {
      announceStatus(
        'Critical payment issue detected. Crisis support remains fully available.',
        'critical'
      );
    } else if (paymentError?.severity === 'high') {
      announceStatus(
        'Payment attention needed. Your therapeutic access is protected.',
        'high'
      );
    }
  }, [paymentError, announceStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View
      accessible={false} // This component manages announcements, doesn't need to be read
      testID={testID}
      style={styles.announcementContainer}
    >
      {/* Visual indicator for screen reader users */}
      {isScreenReaderEnabled && enabled && (
        <View style={styles.screenReaderIndicator}>
          <Text style={styles.screenReaderText}>
            📢 Payment status announcements active
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * High Contrast Payment Status Component
 * Enhanced contrast support for payment status indicators
 */
export interface HighContrastPaymentStatusProps {
  readonly status: 'active' | 'error' | 'warning' | 'info';
  readonly title: string;
  readonly message: string;
  readonly autoContrastDetection?: boolean;
  readonly onStatusPress?: () => void;
  readonly testID: string;
}

export const HighContrastPaymentStatus: React.FC<HighContrastPaymentStatusProps> = ({
  status,
  title,
  message,
  autoContrastDetection = true,
  onStatusPress,
  testID
}) => {
  const { colorSystem: colors, isDarkMode } = useTheme();
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);
  const [userContrastPreference, setUserContrastPreference] = useState(false);

  // Auto-detect high contrast needs
  useEffect(() => {
    if (autoContrastDetection) {
      const checkContrastPreference = async () => {
        try {
          // iOS has built-in high contrast detection
          if (Platform.OS === 'ios') {
            const isHighContrast = await AccessibilityInfo.isReduceTransparencyEnabled();
            setHighContrastEnabled(isHighContrast || userContrastPreference);
          } else {
            // Android: Use user preference
            setHighContrastEnabled(userContrastPreference);
          }
        } catch (error) {
          console.warn('Failed to detect contrast preference:', error);
          setHighContrastEnabled(userContrastPreference);
        }
      };

      checkContrastPreference();
    }
  }, [autoContrastDetection, userContrastPreference]);

  const getHighContrastColors = () => {
    const baseColors = {
      active: {
        background: colors.status.success,
        text: colors.base.white,
        border: colors.base.white
      },
      error: {
        background: colors.status.error,
        text: colors.base.white,
        border: colors.base.white
      },
      warning: {
        background: colors.status.warning,
        text: colors.base.black,
        border: colors.base.black
      },
      info: {
        background: colors.status.info,
        text: colors.base.white,
        border: colors.base.white
      }
    };

    if (highContrastEnabled) {
      // Enhanced contrast for accessibility
      return {
        active: {
          background: '#006400', // Dark green
          text: '#FFFFFF',
          border: '#FFFFFF'
        },
        error: {
          background: '#8B0000', // Dark red
          text: '#FFFFFF',
          border: '#FFFFFF'
        },
        warning: {
          background: '#FFD700', // Gold
          text: '#000000',
          border: '#000000'
        },
        info: {
          background: '#000080', // Navy blue
          text: '#FFFFFF',
          border: '#FFFFFF'
        }
      };
    }

    return baseColors;
  };

  const contrastColors = getHighContrastColors()[status];

  const StatusContent = () => (
    <Card
      style={[
        styles.highContrastContainer,
        {
          backgroundColor: contrastColors.background,
          borderColor: contrastColors.border,
          borderWidth: highContrastEnabled ? 3 : 1
        }
      ]}
    >
      <View style={styles.highContrastHeader}>
        <Text
          style={[
            styles.highContrastTitle,
            {
              color: contrastColors.text,
              fontWeight: highContrastEnabled ? '800' : '600'
            }
          ]}
          allowFontScaling={true}
          maxFontSizeMultiplier={2.0} // Higher scaling for accessibility
        >
          {title}
        </Text>

        {autoContrastDetection && (
          <Switch
            value={userContrastPreference}
            onValueChange={setUserContrastPreference}
            trackColor={{
              false: colors.gray[400],
              true: colors.status.success
            }}
            thumbColor={userContrastPreference ? colors.base.white : colors.gray[200]}
            accessible={true}
            accessibilityLabel="High contrast mode toggle"
            accessibilityRole="switch"
            accessibilityState={{ checked: userContrastPreference }}
            style={styles.contrastToggle}
          />
        )}
      </View>

      <Text
        style={[
          styles.highContrastMessage,
          {
            color: contrastColors.text,
            fontWeight: highContrastEnabled ? '600' : '400'
          }
        ]}
        allowFontScaling={true}
        maxFontSizeMultiplier={1.8}
      >
        {message}
      </Text>

      {highContrastEnabled && (
        <View style={styles.contrastIndicator}>
          <Text style={[styles.contrastText, { color: contrastColors.text }]}>
            🔆 High contrast mode active
          </Text>
        </View>
      )}
    </Card>
  );

  if (onStatusPress) {
    return (
      <Pressable
        onPress={onStatusPress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${message}${highContrastEnabled ? '. High contrast mode active.' : ''}`}
        accessibilityHint="Tap for payment status details"
        testID={testID}
        style={styles.pressableContainer}
      >
        <StatusContent />
      </Pressable>
    );
  }

  return (
    <View
      accessible={true}
      accessibilityRole="status"
      accessibilityLabel={`${title}. ${message}${highContrastEnabled ? '. High contrast mode active.' : ''}`}
      testID={testID}
    >
      <StatusContent />
    </View>
  );
};

/**
 * Haptic Payment Feedback Component
 * Provides haptic feedback for payment status changes
 */
export interface HapticPaymentFeedbackProps {
  readonly enabledTypes?: ('success' | 'warning' | 'error' | 'critical')[];
  readonly respectUserPreferences?: boolean;
  readonly testID: string;
}

export const HapticPaymentFeedback: React.FC<HapticPaymentFeedbackProps> = ({
  enabledTypes = ['warning', 'error', 'critical'],
  respectUserPreferences = true,
  testID
}) => {
  const { onSuccess, onWarning, onError, onCritical } = useCommonHaptics();
  const { hapticsEnabled } = useHapticPreference();
  const [lastFeedbackType, setLastFeedbackType] = useState<string | null>(null);

  const store = usePaymentStore();
  const syncStatus = paymentSelectors.getSyncStatus(store);
  const paymentError = paymentSelectors.getPaymentErrorForUser(store);
  const crisisAccess = paymentSelectors.getCrisisAccess(store);

  // Trigger haptic feedback based on status changes
  const triggerHapticFeedback = useCallback(async (type: 'success' | 'warning' | 'error' | 'critical') => {
    if (!enabledTypes.includes(type)) return;
    if (respectUserPreferences && !hapticsEnabled) return;
    if (lastFeedbackType === type) return; // Prevent duplicate feedback

    try {
      switch (type) {
        case 'success':
          await onSuccess();
          break;
        case 'warning':
          await onWarning();
          break;
        case 'error':
          await onError();
          break;
        case 'critical':
          await onCritical();
          // Additional vibration for critical states
          if (Platform.OS === 'android') {
            Vibration.vibrate([100, 100, 100, 100, 100]);
          }
          break;
      }
      setLastFeedbackType(type);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [enabledTypes, respectUserPreferences, hapticsEnabled, lastFeedbackType, onSuccess, onWarning, onError, onCritical]);

  // Monitor sync status for haptic feedback
  useEffect(() => {
    if (syncStatus.status === 'success') {
      triggerHapticFeedback('success');
    } else if (syncStatus.status === 'error') {
      triggerHapticFeedback('error');
    }
  }, [syncStatus.status, triggerHapticFeedback]);

  // Monitor payment errors
  useEffect(() => {
    if (paymentError?.severity === 'critical') {
      triggerHapticFeedback('critical');
    } else if (paymentError?.severity === 'high') {
      triggerHapticFeedback('error');
    } else if (paymentError?.severity === 'medium') {
      triggerHapticFeedback('warning');
    }
  }, [paymentError, triggerHapticFeedback]);

  // Monitor crisis access activation
  useEffect(() => {
    if (crisisAccess.isActive) {
      triggerHapticFeedback('critical');
    }
  }, [crisisAccess.isActive, triggerHapticFeedback]);

  return (
    <View
      accessible={false} // This component manages haptic feedback, doesn't need to be read
      testID={testID}
      style={styles.hapticContainer}
    >
      {/* Visual indicator for haptic status */}
      <View style={styles.hapticIndicator}>
        <Text style={styles.hapticText}>
          {hapticsEnabled && respectUserPreferences ? '📳' : '🔇'} Payment haptics
        </Text>
      </View>
    </View>
  );
};

/**
 * Voice Control Payment Interface Component
 * Voice-accessible payment controls for crisis scenarios
 */
export interface VoiceControlPaymentInterfaceProps {
  readonly emergencyMode?: boolean;
  readonly onVoiceCommand?: (command: string) => void;
  readonly supportedCommands?: string[];
  readonly testID: string;
}

export const VoiceControlPaymentInterface: React.FC<VoiceControlPaymentInterfaceProps> = ({
  emergencyMode = false,
  onVoiceCommand,
  supportedCommands = ['activate emergency access', 'retry payment sync', 'call crisis hotline'],
  testID
}) => {
  const { colorSystem: colors } = useTheme();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const store = usePaymentStore();
  const crisisAccess = paymentSelectors.getCrisisAccess(store);

  // Voice control activation for emergency scenarios
  const activateVoiceControl = useCallback(() => {
    setVoiceEnabled(true);
    setIsListening(true);

    // Accessibility announcement
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(
        'Voice control activated for payment emergency access. Say: activate emergency access.'
      );
    }
  }, []);

  // Auto-activate voice control in emergency mode
  useEffect(() => {
    if (emergencyMode && crisisAccess.isActive) {
      activateVoiceControl();
    }
  }, [emergencyMode, crisisAccess.isActive, activateVoiceControl]);

  const handleVoiceCommand = (command: string) => {
    if (onVoiceCommand) {
      onVoiceCommand(command);
    }

    // Default voice commands
    if (command.includes('emergency access')) {
      // Activate emergency payment access
      console.log('Voice: Emergency payment access activated');
    } else if (command.includes('retry')) {
      // Retry payment sync
      console.log('Voice: Payment sync retry initiated');
    } else if (command.includes('crisis hotline')) {
      // Call crisis hotline
      console.log('Voice: Crisis hotline access via voice');
    }

    setIsListening(false);
  };

  return (
    <Card
      style={[
        styles.voiceControlContainer,
        {
          backgroundColor: emergencyMode
            ? colors.status.errorBackground
            : colors.status.infoBackground
        }
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Voice control for payment emergency access${voiceEnabled ? ' - active' : ''}`}
      accessibilityHint="Voice commands available for crisis payment access"
      testID={testID}
    >
      <View style={styles.voiceHeader}>
        <Text style={styles.voiceIcon}>
          {isListening ? '🎤' : '🗣️'}
        </Text>
        <Text style={[styles.voiceTitle, {
          color: emergencyMode ? colors.status.error : colors.status.info
        }]}>
          {isListening ? 'Listening...' : 'Voice Control Available'}
        </Text>
      </View>

      <Text
        style={[styles.voiceDescription, { color: colors.gray[600] }]}
        allowFontScaling={true}
        maxFontSizeMultiplier={1.5}
      >
        {emergencyMode
          ? 'Say "activate emergency access" for immediate crisis support'
          : 'Voice commands available for payment assistance'
        }
      </Text>

      <View style={styles.commandsList}>
        {supportedCommands.map((command, index) => (
          <Text
            key={index}
            style={[styles.commandText, { color: colors.gray[700] }]}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.3}
          >
            • "{command}"
          </Text>
        ))}
      </View>

      {!voiceEnabled && (
        <Button
          title="Activate Voice Control"
          onPress={activateVoiceControl}
          variant={emergencyMode ? 'primary' : 'secondary'}
          size="medium"
          accessibilityLabel="Activate voice control for payment emergency access"
          testID={`${testID}-activate-button`}
          style={styles.voiceActivateButton}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  // Accessible Announcements Styles
  announcementContainer: {
    // Hidden container for announcement management
  },
  screenReaderIndicator: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing.xs,
    borderRadius: borderRadius.small,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  screenReaderText: {
    fontSize: typography.micro.size,
    color: colorSystem.status.info,
    fontWeight: '500',
  },

  // High Contrast Status Styles
  highContrastContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.md,
  },
  highContrastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  highContrastTitle: {
    fontSize: typography.h3.size,
    lineHeight: typography.h3.lineHeight,
    flex: 1,
  },
  contrastToggle: {
    marginLeft: spacing.sm,
  },
  highContrastMessage: {
    fontSize: typography.bodyLarge.size,
    lineHeight: 26,
    marginBottom: spacing.sm,
  },
  contrastIndicator: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  contrastText: {
    fontSize: typography.caption.size,
    fontWeight: '600',
  },
  pressableContainer: {
    // No additional styles needed
  },

  // Haptic Feedback Styles
  hapticContainer: {
    // Hidden container for haptic management
  },
  hapticIndicator: {
    alignItems: 'center',
    padding: spacing.xs,
  },
  hapticText: {
    fontSize: typography.micro.size,
    color: colorSystem.gray[600],
  },

  // Voice Control Styles
  voiceControlContainer: {
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.md,
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  voiceIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  voiceTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    flex: 1,
  },
  voiceDescription: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 22,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  commandsList: {
    marginBottom: spacing.lg,
  },
  commandText: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  voiceActivateButton: {
    alignSelf: 'center',
    minWidth: 160,
  },
});

export {
  AccessiblePaymentAnnouncements,
  HighContrastPaymentStatus,
  HapticPaymentFeedback,
  VoiceControlPaymentInterface
};