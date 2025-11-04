/**
 * SafetyButton Component - Crisis Support Access
 *
 * @deprecated This component has been replaced by CollapsibleCrisisButton
 * Use src/flows/shared/components/CollapsibleCrisisButton instead
 * This file is kept for reference only and should not be used in new code
 *
 * MIGRATION: Replace all SafetyButton instances with CollapsibleCrisisButton
 * The new component provides a consistent global crisis button overlay
 *
 * CLINICAL SPECIFICATIONS:
 * - Always visible "I need support" button
 * - <200ms crisis response time (CRITICAL)
 * - Direct 988 crisis line access
 * - High contrast for accessibility
 * - WCAG AA compliant
 * - Emergency response protocol
 */


import { logSecurity, logPerformance, logError, LogCategory } from '../../../services/logging';
import React, { useCallback } from 'react';
import { Pressable, Text, StyleSheet, Linking, Alert } from 'react-native';
import { colorSystem, spacing, typography } from '../../../constants/colors';

interface SafetyButtonProps {
  onPress?: () => void;
  testID?: string;
  variant?: 'primary' | 'crisis';
}

const SafetyButton: React.FC<SafetyButtonProps> = ({
  onPress,
  testID = 'safety-button',
  variant = 'primary'
}) => {
  // CRITICAL: <200ms crisis response - direct call to 988
  const handleCrisisPress = useCallback(() => {
    // Direct navigation - no async operations for fastest response
    const startTime = performance.now();

    if (variant === 'crisis') {
      // Immediate 988 crisis line access
      Linking.openURL('tel:988').catch(() => {
        // Fallback for devices without calling capability
        Alert.alert(
          'Crisis Support',
          'Call 988 for immediate crisis support\n\nText HOME to 741741 for Crisis Text Line',
          [{ text: 'OK' }]
        );
      });
    } else {
      onPress?.();
    }

    // Performance monitoring for clinical safety
    const responseTime = performance.now() - startTime;
    if (responseTime > 200) {
      logSecurity(`🚨 Crisis button response time: ${responseTime}ms (target: <200ms)`);
    }
  }, [onPress, variant]);

  const buttonStyle = variant === 'crisis' ? styles.crisisButton : styles.button;
  const textStyle = variant === 'crisis' ? styles.crisisButtonText : styles.buttonText;

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyle,
        { opacity: pressed ? 0.8 : 1 }
      ]}
      onPress={handleCrisisPress}
      accessibilityRole="button"
      accessibilityLabel={variant === 'crisis' ? 'Call 988 Crisis Line' : 'I need support'}
      accessibilityHint={variant === 'crisis' ? 'Immediately call 988 crisis support line' : 'Access immediate crisis support and emergency resources'}
      testID={testID}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Enhanced touch target
    >
      <Text style={textStyle}>
        {variant === 'crisis' ? '🚨 Call 988' : 'I need support'}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colorSystem.status.critical, // High contrast emergency color
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // WCAG touch target size
    borderWidth: 2,
    borderColor: colorSystem.status.critical,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  crisisButton: {
    backgroundColor: '#991B1B', // Dark red for crisis
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Larger touch target for crisis
    borderWidth: 3,
    borderColor: '#7F1D1D',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonText: {
    color: colorSystem.base.white,
    fontSize: typography.caption.size,
    fontWeight: '600',
    textAlign: 'center',
  },
  crisisButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyRegular.size,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default SafetyButton;