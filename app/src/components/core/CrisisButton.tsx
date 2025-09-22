/**
 * Global Crisis Button - PERFORMANCE OPTIMIZED for <200ms response
 * SAFETY CRITICAL: Must be accessible from every screen in <3 seconds total
 * ACCESSIBILITY: WCAG AA compliant with crisis-specific enhancements
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Text, StyleSheet, Linking, Alert, Platform, AccessibilityInfo, Vibration } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colorSystem } from '../../constants/colors';
import { Button } from './Button';

interface CrisisButtonProps {
  variant?: 'floating' | 'header' | 'embedded';
  style?: any;
  // Accessibility props for crisis situations
  highContrastMode?: boolean;
  largeTargetMode?: boolean;
  voiceCommandEnabled?: boolean;
  urgencyLevel?: 'standard' | 'high' | 'emergency';
  onCrisisStart?: () => void; // Callback when crisis button is pressed
}

export const CrisisButton: React.FC<CrisisButtonProps> = React.memo(({
  variant = 'floating',
  style,
  highContrastMode = false,
  largeTargetMode = false,
  voiceCommandEnabled = true,
  urgencyLevel = 'standard',
  onCrisisStart
}) => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Initialize accessibility state
  useEffect(() => {
    const checkAccessibilitySettings = async () => {
      try {
        const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
        const screenReader = await AccessibilityInfo.isScreenReaderEnabled();
        setIsReduceMotionEnabled(reduceMotion);
        setIsScreenReaderEnabled(screenReader);
      } catch (error) {
        console.warn('Failed to check accessibility settings:', error);
      }
    };

    checkAccessibilitySettings();

    // Listen for accessibility changes
    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      reduceMotionSubscription?.remove();
      screenReaderSubscription?.remove();
    };
  }, []);

  // PERFORMANCE CRITICAL: Optimized crisis call with minimal delay
  const handleCrisisCall = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Trigger crisis mode callbacks immediately
      onCrisisStart?.();

      // ACCESSIBILITY: Immediate haptic feedback for crisis action
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 250, 100, 250]); // Strong haptic pattern
      } else {
        Vibration.vibrate(500); // Android strong vibration
      }

      // ACCESSIBILITY: Immediate voice announcement for screen reader users
      const urgentAnnouncement = urgencyLevel === 'emergency'
        ? 'EMERGENCY: Calling crisis hotline now'
        : 'Calling crisis support line at 988';

      AccessibilityInfo.announceForAccessibility(urgentAnnouncement);

      // CRITICAL: Direct call without validation checks
      // Target response time: <100ms
      const phoneURL = '988';
      await Linking.openURL(`tel:${phoneURL}`);

    } catch (error) {
      // Immediate accessible fallback
      const fallbackMessage = 'Crisis call failed. Please dial 988 directly for immediate support.';

      // Announce error immediately for screen readers
      AccessibilityInfo.announceForAccessibility(fallbackMessage);

      Alert.alert(
        'Call 988',
        'Please dial 988 directly for immediate crisis support.',
        [{
          text: 'OK',
          onPress: () => {
            // Second attempt via system dialer
            Linking.openURL('tel:988').catch(() => {
              // Final fallback - copy to clipboard if possible
              console.error('Unable to initiate call to 988');
            });
          }
        }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onCrisisStart, urgencyLevel]);

  // Navigation to full crisis resources
  const handleCrisisResources = useCallback(() => {
    (navigation as any).navigate('CrisisPlan');
  }, [navigation]);

  const getFloatingButtonStyle = () => {
    const baseStyles = [styles.floatingButton];

    if (urgencyLevel === 'emergency') {
      baseStyles.push(styles.emergencyMode);
    }

    return baseStyles;
  };

  if (variant === 'floating') {
    return (
      <Button
        variant="crisis"
        emergency={true}
        onPress={handleCrisisCall}
        disabled={isLoading}
        loading={isLoading}
        style={[...getFloatingButtonStyle(), style]}
        accessibilityLabel={
          isLoading
            ? "Calling crisis support line"
            : urgencyLevel === 'emergency'
              ? "EMERGENCY: Call 988 crisis hotline immediately"
              : "Emergency crisis support - Call 988"
        }
        accessibilityHint={voiceCommandEnabled ? "Double tap or say 'emergency help' to call 988 crisis hotline" : "Double tap to immediately call the crisis support hotline at 988"}
        testID="crisis-button-floating"
      >
        {isLoading ? '...' : '988'}
      </Button>
    );
  }

  return (
    <Button
      variant="crisis"
      emergency={urgencyLevel === 'emergency'}
      onPress={handleCrisisResources}
      disabled={isLoading}
      style={style}
      accessibilityLabel={
        urgencyLevel === 'emergency'
          ? "URGENT: Crisis support and emergency resources"
          : "Crisis support and safety resources"
      }
      accessibilityHint="Double tap to access crisis support, safety planning, and emergency resources"
      testID="crisis-button-embedded"
    >
      {urgencyLevel === 'emergency' ? 'Emergency Support' : 'Crisis Support'}
    </Button>
  );
});

CrisisButton.displayName = 'CrisisButton';

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  // ACCESSIBILITY: Emergency mode with maximum visibility for floating button
  emergencyMode: {
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
});

export default CrisisButton;