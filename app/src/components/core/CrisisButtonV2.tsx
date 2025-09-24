/**
 * Crisis Button V2 - New Architecture Optimized
 *
 * SAFETY CRITICAL: <200ms response time requirement
 * Uses NewArchButton for maximum New Architecture compatibility
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Linking, Alert, Platform, AccessibilityInfo, Vibration } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NewArchButton } from './NewArchButton';
import type { NewArchButtonProps } from './NewArchButton';

interface CrisisButtonV2Props extends Omit<NewArchButtonProps, 'variant' | 'emergency' | 'children'> {
  variant?: 'floating' | 'header' | 'embedded';
  urgencyLevel?: 'standard' | 'high' | 'emergency';
  onCrisisStart?: () => void;
}

export const CrisisButtonV2: React.FC<CrisisButtonV2Props> = ({
  variant = 'floating',
  urgencyLevel = 'standard',
  onCrisisStart,
  style,
  ...buttonProps
}) => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Monitor accessibility state for enhanced crisis support
  useEffect(() => {
    const checkScreenReader = async () => {
      try {
        const enabled = await AccessibilityInfo.isScreenReaderEnabled();
        setIsScreenReaderEnabled(enabled);
      } catch (error) {
        console.warn('Failed to check screen reader:', error);
      }
    };

    checkScreenReader();
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => subscription?.remove();
  }, []);

  // PERFORMANCE CRITICAL: Direct 988 call with minimal overhead
  const handleCrisisCall = useCallback(async () => {
    if (isLoading) return;

    const startTime = Date.now();
    setIsLoading(true);
    onCrisisStart?.();

    try {
      // Immediate accessibility feedback
      const announcement = urgencyLevel === 'emergency'
        ? 'EMERGENCY: Calling 988 crisis hotline now'
        : 'Calling 988 crisis support';

      AccessibilityInfo.announceForAccessibility(announcement);

      // Platform-optimized emergency vibration
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 200, 50, 200]); // Strong emergency pattern
      } else {
        Vibration.vibrate([200, 100, 200]); // Android emergency pattern
      }

      // Direct call - target <100ms execution
      await Linking.openURL('tel:988');

      // Log performance for crisis monitoring
      const responseTime = Date.now() - startTime;
      console.info(`Crisis call initiated in ${responseTime}ms`);

    } catch (error) {
      console.error('Crisis call failed:', error);

      // Immediate fallback for screen reader users
      const fallbackAnnouncement = 'Crisis call failed. Please dial 9-8-8 directly';
      AccessibilityInfo.announceForAccessibility(fallbackAnnouncement);

      Alert.alert(
        'Emergency: Call 988',
        'Please dial 988 directly for immediate crisis support.',
        [
          {
            text: 'Dial 988',
            onPress: () => Linking.openURL('tel:988').catch(console.error),
            style: 'default'
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onCrisisStart, urgencyLevel]);

  const handleCrisisResources = useCallback(() => {
    (navigation as any).navigate('CrisisResources');
  }, [navigation]);

  // Crisis button content based on variant
  const getCrisisContent = () => {
    if (variant === 'floating') {
      return isLoading ? '...' : '988';
    }
    return urgencyLevel === 'emergency' ? 'Emergency Support' : 'Crisis Support';
  };

  // Enhanced accessibility labels for crisis context
  const getAccessibilityLabel = () => {
    if (isLoading) {
      return 'Calling crisis support line';
    }

    if (variant === 'floating') {
      return urgencyLevel === 'emergency'
        ? 'EMERGENCY: Call 988 crisis hotline immediately'
        : 'Emergency crisis support - Call 988';
    }

    return urgencyLevel === 'emergency'
      ? 'URGENT: Crisis support and emergency resources'
      : 'Crisis support and safety resources';
  };

  const getAccessibilityHint = () => {
    if (variant === 'floating') {
      return isScreenReaderEnabled
        ? 'Double tap to immediately call the crisis support hotline at 9-8-8. This will open your phone app.'
        : 'Double tap to call 988 crisis hotline';
    }
    return 'Double tap to access crisis support, safety planning, and emergency resources';
  };

  return (
    <NewArchButton
      variant="crisis"
      emergency={true}
      onPress={variant === 'floating' ? handleCrisisCall : handleCrisisResources}
      disabled={isLoading}
      loading={isLoading}
      haptic={true}
      style={[
        variant === 'floating' && {
          position: 'absolute',
          right: 16,
          bottom: 100,
          width: 64,
          height: 64,
          borderRadius: 32,
          elevation: urgencyLevel === 'emergency' ? 12 : 8,
          shadowColor: urgencyLevel === 'emergency' ? '#B91C1C' : '#000',
          shadowOffset: { width: 0, height: urgencyLevel === 'emergency' ? 6 : 4 },
          shadowOpacity: urgencyLevel === 'emergency' ? 0.5 : 0.3,
          shadowRadius: urgencyLevel === 'emergency' ? 12 : 8,
          zIndex: 1000,
        },
        style
      ]}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={getAccessibilityHint()}
      testID={`crisis-button-${variant}`}
      {...buttonProps}
    >
      {getCrisisContent()}
    </NewArchButton>
  );
};

CrisisButtonV2.displayName = 'CrisisButtonV2';

export default CrisisButtonV2;