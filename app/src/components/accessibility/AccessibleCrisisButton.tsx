/**
 * AccessibleCrisisButton - Enhanced Crisis Button with Mental Health Accessibility
 *
 * CRISIS ACCESSIBILITY REQUIREMENTS:
 * - <3 second total access time via voice or touch
 * - <200ms response time including accessibility features
 * - Emergency voice commands: "emergency help", "crisis support", "need help"
 * - Anxiety-aware larger targets and high contrast
 * - Trauma-informed predictable behavior
 * - Screen reader optimized emergency announcements
 * - Motor accessibility alternatives (voice, switch control)
 * - Crisis state haptic patterns for immediate feedback
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Linking,
  Alert,
  Platform,
  AccessibilityInfo,
  Vibration,
  Dimensions,
  View,
} from 'react-native';
// FIXED: Import from ReanimatedMock to prevent property descriptor conflicts
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
  withTiming,
  interpolateColor,
} from '../../utils/ReanimatedMock';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import { useTherapeuticAccessibility } from './TherapeuticAccessibilityProvider';

interface AccessibleCrisisButtonProps {
  variant?: 'floating' | 'header' | 'embedded' | 'emergency';
  style?: any;
  onCrisisStart?: () => void;
  emergencyMode?: boolean;
  anxietyAdaptations?: boolean;
  traumaInformed?: boolean;
  voiceActivated?: boolean;
  size?: 'small' | 'medium' | 'large' | 'emergency';
}

const { width: screenWidth } = Dimensions.get('window');

// Crisis-specific sizing for accessibility
const CRISIS_SIZES = {
  small: { width: 48, height: 48, fontSize: 12 },
  medium: { width: 64, height: 64, fontSize: 14 },
  large: { width: 80, height: 80, fontSize: 16 },
  emergency: { width: 96, height: 96, fontSize: 18 },
};

export const AccessibleCrisisButton: React.FC<AccessibleCrisisButtonProps> = React.memo(({
  variant = 'floating',
  style,
  onCrisisStart,
  emergencyMode = false,
  anxietyAdaptations = true,
  traumaInformed = true,
  voiceActivated = true,
  size = 'medium'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);

  // Button reference for accessibility focus
  const buttonRef = useRef<Pressable>(null);

  // Therapeutic Accessibility Context
  const {
    crisisEmergencyMode,
    anxietyAdaptationsEnabled,
    traumaInformedMode,
    isScreenReaderEnabled,
    isVoiceControlEnabled,
    announceForTherapy,
    announceEmergencyInstructions,
    setTherapeuticFocus,
    provideCrisisHaptics,
    activateEmergencyCrisisAccess,
    processVoiceCommand,
  } = useTherapeuticAccessibility();

  // Animation values for therapeutic feedback
  const scaleValue = useSharedValue(1);
  const colorValue = useSharedValue(0);
  const pulseValue = useSharedValue(1);

  // Dynamic sizing based on accessibility needs
  const buttonSize = CRISIS_SIZES[
    emergencyMode || crisisEmergencyMode ? 'emergency' :
    anxietyAdaptations || anxietyAdaptationsEnabled ? 'large' :
    size
  ];

  // Initialize crisis accessibility features
  useEffect(() => {
    if (emergencyMode || crisisEmergencyMode) {
      activateEmergencyCrisisAccess('crisis_button_display');
    }

    // Enable voice commands for crisis button
    if (voiceActivated && isVoiceControlEnabled) {
      setVoiceListening(true);
    }
  }, [emergencyMode, crisisEmergencyMode, voiceActivated, isVoiceControlEnabled, activateEmergencyCrisisAccess]);

  // Emergency pulse animation for urgent states
  useEffect(() => {
    if (emergencyMode || crisisEmergencyMode) {
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseValue.value = withTiming(1, { duration: 300 });
    }
  }, [emergencyMode, crisisEmergencyMode]);

  // PERFORMANCE CRITICAL: Optimized crisis call with <200ms response
  const handleCrisisCall = useCallback(async () => {
    if (isLoading) return;

    const startTime = Date.now();

    try {
      setIsLoading(true);
      setIsPressed(true);

      // Trigger crisis mode callbacks immediately
      onCrisisStart?.();

      // IMMEDIATE: Crisis haptic feedback for emergency recognition
      await provideCrisisHaptics();

      // IMMEDIATE: Visual feedback animation
      scaleValue.value = withSequence(
        withSpring(0.9, { damping: 20, stiffness: 400 }),
        withSpring(1, { damping: 20, stiffness: 400 })
      );

      colorValue.value = withTiming(1, { duration: 150 });

      // CRITICAL: Emergency voice announcement for screen readers
      const urgentAnnouncement = emergencyMode || crisisEmergencyMode
        ? 'EMERGENCY CRISIS BUTTON ACTIVATED. Calling 988 crisis hotline immediately.'
        : 'Crisis support button activated. Connecting to 988 crisis line.';

      await announceEmergencyInstructions(urgentAnnouncement);

      // CRITICAL: Direct call without validation - target <100ms
      const phoneURL = '988';
      await Linking.openURL(`tel:${phoneURL}`);

      const responseTime = Date.now() - startTime;
      console.log(`Crisis button response time: ${responseTime}ms`);

      if (responseTime > 200) {
        console.warn(`Crisis button exceeded 200ms target: ${responseTime}ms`);
      }

    } catch (error) {
      console.error('Crisis call failed:', error);

      // IMMEDIATE: Accessible fallback with emergency priority
      const fallbackMessage = 'Crisis call system unavailable. Please dial 988 directly for immediate crisis support.';

      await announceEmergencyInstructions(fallbackMessage);

      // TRAUMA-INFORMED: Non-startling alert for fallback
      Alert.alert(
        'Call 988 Directly',
        'The crisis call feature is temporarily unavailable. Please dial 988 directly on your phone for immediate crisis support.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Second attempt via system dialer
              try {
                await Linking.openURL('tel:988');
              } catch (secondError) {
                console.error('Second attempt to call 988 failed:', secondError);
              }
            }
          }
        ],
        { cancelable: false } // Don't allow dismissal during crisis
      );
    } finally {
      setIsLoading(false);
      setIsPressed(false);
      colorValue.value = withTiming(0, { duration: 300 });
    }
  }, [
    isLoading,
    onCrisisStart,
    emergencyMode,
    crisisEmergencyMode,
    provideCrisisHaptics,
    announceEmergencyInstructions,
    scaleValue,
    colorValue
  ]);

  // Voice command handler for crisis activation
  const handleVoiceActivation = useCallback(async (command: string) => {
    const crisisCommands = ['emergency help', 'crisis support', 'need help', 'call 988'];
    const lowerCommand = command.toLowerCase();

    if (crisisCommands.some(cmd => lowerCommand.includes(cmd))) {
      await handleCrisisCall();
      return true;
    }

    return false;
  }, [handleCrisisCall]);

  // Long press handler for crisis resources
  const handleLongPress = useCallback(async () => {
    if (traumaInformed || traumaInformedMode) {
      // Gentle announcement for trauma-informed interaction
      await announceForTherapy(
        'Long press detected. Opening crisis resources and safety planning tools.',
        'polite'
      );
    }

    // Navigate to crisis resources
    // Note: Navigation would be handled by parent component
    console.log('Opening crisis resources');
  }, [traumaInformed, traumaInformedMode, announceForTherapy]);

  // Animated styles for therapeutic feedback
  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      colorValue.value,
      [0, 1],
      [
        emergencyMode || crisisEmergencyMode
          ? colorSystem.status.critical
          : colorSystem.status.error,
        emergencyMode || crisisEmergencyMode
          ? '#990000' // Darker emergency red
          : '#CC0000'
      ]
    );

    return {
      transform: [
        { scale: scaleValue.value },
        { scale: pulseValue.value }
      ],
      backgroundColor,
    };
  }, [emergencyMode, crisisEmergencyMode]);

  // Get button styles based on variant and accessibility needs
  const getButtonStyles = () => {
    const baseStyles = [styles.crisisButton];

    // Variant-specific styles
    switch (variant) {
      case 'floating':
        baseStyles.push(styles.floatingButton);
        break;
      case 'header':
        baseStyles.push(styles.headerButton);
        break;
      case 'embedded':
        baseStyles.push(styles.embeddedButton);
        break;
      case 'emergency':
        baseStyles.push(styles.emergencyButton);
        break;
    }

    // Accessibility enhancements
    if (anxietyAdaptations || anxietyAdaptationsEnabled) {
      baseStyles.push(styles.anxietyAdaptations);
    }

    if (emergencyMode || crisisEmergencyMode) {
      baseStyles.push(styles.emergencyMode);
    }

    return [
      ...baseStyles,
      {
        width: buttonSize.width,
        height: buttonSize.height,
        borderRadius: variant === 'floating' ? buttonSize.width / 2 : borderRadius.medium,
      }
    ];
  };

  // Get text styles with accessibility considerations
  const getTextStyles = () => {
    const baseStyles = [styles.buttonText];

    if (emergencyMode || crisisEmergencyMode) {
      baseStyles.push(styles.emergencyText);
    }

    if (anxietyAdaptations || anxietyAdaptationsEnabled) {
      baseStyles.push(styles.anxietyText);
    }

    return [
      ...baseStyles,
      { fontSize: buttonSize.fontSize }
    ];
  };

  // Get accessibility label based on current state
  const getAccessibilityLabel = () => {
    if (isLoading) {
      return 'Calling crisis support line now';
    }

    if (emergencyMode || crisisEmergencyMode) {
      return 'EMERGENCY CRISIS BUTTON - Call 988 crisis hotline immediately';
    }

    return 'Crisis support button - Call 988 for immediate mental health emergency support';
  };

  // Get accessibility hint with voice command information
  const getAccessibilityHint = () => {
    let hint = 'Double tap to immediately call the 988 crisis support hotline. Long press for crisis resources.';

    if (voiceActivated && isVoiceControlEnabled) {
      hint += ' Voice commands: "emergency help", "crisis support", or "need help".';
    }

    if (traumaInformed || traumaInformedMode) {
      hint += ' This is a safe, predictable action that connects you to professional support.';
    }

    return hint;
  };

  // Floating variant with full accessibility
  if (variant === 'floating') {
    return (
      <Animated.View
        style={[
          ...getButtonStyles(),
          animatedStyle,
          style,
          {
            position: 'absolute',
            right: spacing.lg,
            bottom: 100,
            zIndex: 1000,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 12,
          }
        ]}
      >
        <Pressable
          ref={buttonRef}
          style={({ pressed }) => [
            StyleSheet.absoluteFill,
            {
              // Crisis-optimized pressed state with <200ms response
              opacity: pressed ? 0.8 : 1.0,
              transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1.0 }]
            }
          ]}
          onPress={handleCrisisCall}
          onLongPress={handleLongPress}
          disabled={isLoading}
          // Crisis-optimized android ripple for emergency accessibility
          android_ripple={{
            color: emergencyMode || crisisEmergencyMode
              ? 'rgba(255, 255, 255, 0.5)'
              : 'rgba(255, 255, 255, 0.3)',
            borderless: false,
            radius: buttonSize.width / 2,
            foreground: false
          }}
          // Enhanced hit area for crisis accessibility (WCAG AAA)
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint={getAccessibilityHint()}
          accessibilityState={{
            disabled: isLoading,
            busy: isLoading,
            selected: isPressed
          }}
          accessibilityLiveRegion={
            emergencyMode || crisisEmergencyMode || isLoading ? 'assertive' : 'polite'
          }
          accessibilityActions={[
            {
              name: 'activate',
              label: 'Call 988 crisis hotline'
            },
            {
              name: 'longpress',
              label: 'Open crisis resources'
            },
            ...(voiceActivated ? [{
              name: 'voice',
              label: 'Voice activate with "emergency help"'
            }] : [])
          ]}
          testID="accessible-crisis-button-floating"
        >
          <View style={styles.buttonContent}>
            <Text
              style={getTextStyles()}
              accessible={false}
              importantForAccessibility="no"
              allowFontScaling={true}
              maxFontSizeMultiplier={2.0}
            >
              {isLoading ? '...' : '988'}
            </Text>
            <Text
              style={[
                styles.buttonSubtext,
                emergencyMode && styles.emergencySubtext,
                { fontSize: Math.max(buttonSize.fontSize - 4, 10) }
              ]}
              accessible={false}
              importantForAccessibility="no"
              allowFontScaling={true}
              maxFontSizeMultiplier={1.5}
            >
              {emergencyMode || crisisEmergencyMode ? 'URGENT' : 'CRISIS'}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // Embedded/Header variants with accessibility
  return (
    <Animated.View style={[...getButtonStyles(), animatedStyle, style]}>
      <Pressable
        ref={buttonRef}
        style={({ pressed }) => [
          StyleSheet.absoluteFill,
          {
            // Crisis-optimized pressed state with <200ms response
            opacity: pressed ? 0.8 : 1.0,
            transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1.0 }]
          }
        ]}
        onPress={handleCrisisCall}
        onLongPress={handleLongPress}
        disabled={isLoading}
        // Crisis-optimized android ripple for emergency accessibility
        android_ripple={{
          color: emergencyMode || crisisEmergencyMode
            ? 'rgba(255, 255, 255, 0.5)'
            : 'rgba(255, 255, 255, 0.3)',
          borderless: false,
          radius: 200,
          foreground: false
        }}
        // Enhanced hit area for crisis accessibility (WCAG AAA)
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={getAccessibilityLabel()}
        accessibilityHint={getAccessibilityHint()}
        accessibilityState={{
          disabled: isLoading,
          busy: isLoading,
          selected: isPressed
        }}
        accessibilityLiveRegion={
          emergencyMode || crisisEmergencyMode || isLoading ? 'assertive' : 'polite'
        }
        testID={`accessible-crisis-button-${variant}`}
      >
        <View style={styles.buttonContent}>
          <Text
            style={getTextStyles()}
            accessible={false}
            importantForAccessibility="no"
            allowFontScaling={true}
            maxFontSizeMultiplier={2.0}
          >
            {emergencyMode || crisisEmergencyMode
              ? 'Emergency Support'
              : variant === 'header'
                ? 'Crisis'
                : 'Crisis Support'
            }
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

AccessibleCrisisButton.displayName = 'AccessibleCrisisButton';

const styles = StyleSheet.create({
  crisisButton: {
    alignItems: 'center',
    justifyContent: 'center',
    // WCAG AA compliance: minimum 44px touch targets
    minHeight: 44,
    minWidth: 44,
  },
  floatingButton: {
    // Floating button specific styles handled in render
  },
  headerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  embeddedButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emergencyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  // Accessibility adaptations
  anxietyAdaptations: {
    // Larger targets for anxiety/stress states
    minWidth: 60,
    minHeight: 60,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  emergencyMode: {
    // Maximum visibility for emergency
    borderWidth: 3,
    borderColor: colorSystem.base.white,
    shadowColor: colorSystem.status.critical,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 16,
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonText: {
    color: colorSystem.base.white,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emergencyText: {
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  anxietyText: {
    fontWeight: '600', // Softer weight for anxiety
    letterSpacing: 0.5,
  },
  buttonSubtext: {
    color: colorSystem.base.white,
    fontWeight: '500',
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 2,
  },
  emergencySubtext: {
    fontWeight: '700',
    opacity: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AccessibleCrisisButton;