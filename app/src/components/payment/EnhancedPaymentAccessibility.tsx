/**
 * Enhanced Payment Accessibility Components
 *
 * ACCESSIBILITY ENHANCEMENTS:
 * - Motor accessibility optimizations for payment forms under stress
 * - Enhanced screen reader support for financial data
 * - Crisis-responsive accessibility features
 * - Therapeutic touch targets and timing
 *
 * MOTOR ACCESSIBILITY REQUIREMENTS:
 * - Minimum 44px touch targets (WCAG 2.5.5)
 * - Extended touch tolerance during stress
 * - Gesture alternatives for complex interactions
 * - Reduced cognitive load during motor challenges
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
  Platform,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { colorSystem, spacing, typography } from '../../constants/colors';
import { usePaymentAccessibility } from '../accessibility/PaymentAccessibilityProvider';

interface EnhancedAccessibilityProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  isFinancialData?: boolean;
  isCrisisElement?: boolean;
  stressLevel?: number; // 0-5 scale for stress-responsive accessibility
  testID: string;
}

/**
 * Enhanced Pressable with Motor Accessibility Optimizations
 */
export const MotorAccessiblePressable: React.FC<EnhancedAccessibilityProps> = ({
  children,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  isFinancialData = false,
  isCrisisElement = false,
  stressLevel = 0,
  testID,
}) => {
  const {
    announceForScreenReader,
    crisisAccessibilityMode,
    isReduceMotionEnabled,
    ensureMinimumContrast,
  } = usePaymentAccessibility();

  // Enhanced touch state management
  const [isPressed, setIsPressed] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const pressAnimation = useRef(new Animated.Value(1)).current;
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stress-responsive accessibility settings
  const getStressResponsiveSettings = () => {
    const baseSettings = {
      touchTargetMinimum: 44,
      pressDelay: 100,
      touchTolerance: 8,
      hapticIntensity: 'medium' as const,
    };

    if (stressLevel >= 3 || crisisAccessibilityMode) {
      return {
        ...baseSettings,
        touchTargetMinimum: 56, // Larger targets for stress
        pressDelay: 200, // Longer delay to prevent accidental presses
        touchTolerance: 16, // Greater touch tolerance
        hapticIntensity: 'heavy' as const,
      };
    }

    if (stressLevel >= 1) {
      return {
        ...baseSettings,
        touchTargetMinimum: 48,
        pressDelay: 150,
        touchTolerance: 12,
        hapticIntensity: 'medium' as const,
      };
    }

    return baseSettings;
  };

  const settings = getStressResponsiveSettings();

  // Enhanced press handling with motor accessibility
  const handlePressIn = useCallback(() => {
    setIsPressed(true);

    // Announce financial data interaction
    if (isFinancialData) {
      announceForScreenReader(
        `Interacting with financial information: ${accessibilityLabel}`,
        isCrisisElement ? 'assertive' : 'polite'
      );
    }

    // Stress-responsive animation
    if (!isReduceMotionEnabled) {
      Animated.spring(pressAnimation, {
        toValue: isCrisisElement ? 0.95 : 0.98,
        useNativeDriver: true,
        tension: stressLevel >= 3 ? 50 : 100, // Gentler animation under stress
      }).start();
    }

    // Clear any existing timeout
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
  }, [
    isFinancialData,
    isCrisisElement,
    stressLevel,
    accessibilityLabel,
    announceForScreenReader,
    isReduceMotionEnabled,
  ]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    setTouchStart(null);

    if (!isReduceMotionEnabled) {
      Animated.spring(pressAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
      }).start();
    }

    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
  }, [isReduceMotionEnabled]);

  const handlePress = useCallback(() => {
    // Delayed press execution for stress scenarios
    touchTimeoutRef.current = setTimeout(() => {
      if (onPress) {
        onPress();

        // Confirm action for financial data
        if (isFinancialData) {
          announceForScreenReader(
            `${accessibilityLabel} activated`,
            isCrisisElement ? 'assertive' : 'polite'
          );
        }
      }
    }, settings.pressDelay);
  }, [onPress, isFinancialData, isCrisisElement, accessibilityLabel, announceForScreenReader, settings.pressDelay]);

  // Pan responder for enhanced touch handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => false,

    onPanResponderGrant: (event) => {
      setTouchStart({
        x: event.nativeEvent.pageX,
        y: event.nativeEvent.pageY,
      });
      handlePressIn();
    },

    onPanResponderMove: (event) => {
      if (!touchStart) return;

      const deltaX = Math.abs(event.nativeEvent.pageX - touchStart.x);
      const deltaY = Math.abs(event.nativeEvent.pageY - touchStart.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Cancel press if moved too far (with stress-responsive tolerance)
      if (distance > settings.touchTolerance) {
        handlePressOut();
      }
    },

    onPanResponderRelease: (event) => {
      if (isPressed && touchStart) {
        const deltaX = Math.abs(event.nativeEvent.pageX - touchStart.x);
        const deltaY = Math.abs(event.nativeEvent.pageY - touchStart.y);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance <= settings.touchTolerance) {
          handlePress();
        }
      }
      handlePressOut();
    },

    onPanResponderTerminate: () => {
      handlePressOut();
    },
  });

  // Ensure minimum touch target size
  const componentStyle = {
    minWidth: settings.touchTargetMinimum,
    minHeight: settings.touchTargetMinimum,
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        componentStyle,
        styles.motorAccessibleContainer,
        isCrisisElement && styles.crisisElement,
        {
          transform: [{ scale: pressAnimation }],
        },
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: false,
        selected: isPressed,
      }}
      testID={testID}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.pressableContent,
          isFinancialData && styles.financialDataContainer,
          pressed && styles.pressedState,
        ]}
        android_ripple={{
          color: ensureMinimumContrast('#000000', colorSystem.base.white, 4.5),
          borderless: false,
          radius: Math.max(settings.touchTargetMinimum / 2, 24),
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

/**
 * Financial Data Announcement Component
 * Enhanced screen reader support for payment information
 */
interface FinancialDataAnnouncerProps {
  amount?: number;
  currency?: string;
  cardLast4?: string;
  cardBrand?: string;
  transactionType?: 'charge' | 'refund' | 'subscription';
  status?: 'processing' | 'success' | 'failed' | 'cancelled';
  children: React.ReactNode;
  testID: string;
}

export const FinancialDataAnnouncer: React.FC<FinancialDataAnnouncerProps> = ({
  amount,
  currency = 'USD',
  cardLast4,
  cardBrand,
  transactionType = 'charge',
  status = 'processing',
  children,
  testID,
}) => {
  const {
    announceForScreenReader,
    simplifyPaymentLanguage,
    isScreenReaderEnabled,
  } = usePaymentAccessibility();

  const [hasAnnounced, setHasAnnounced] = useState(false);

  // Create comprehensive financial data announcement
  const createFinancialAnnouncement = useCallback(() => {
    let announcement = '';

    // Transaction type and status
    const typeDescription = {
      charge: 'Payment',
      refund: 'Refund',
      subscription: 'Subscription payment',
    }[transactionType];

    const statusDescription = {
      processing: 'being processed',
      success: 'completed successfully',
      failed: 'encountered an issue',
      cancelled: 'was cancelled',
    }[status];

    announcement += `${typeDescription} ${statusDescription}. `;

    // Amount information
    if (amount !== undefined) {
      const formattedAmount = (amount / 100).toFixed(2);
      announcement += `Amount: ${formattedAmount} ${currency}. `;
    }

    // Payment method information
    if (cardLast4 && cardBrand) {
      announcement += `Payment method: ${cardBrand} ending in ${cardLast4}. `;
    }

    // Add therapeutic context for failed payments
    if (status === 'failed') {
      announcement += 'Payment challenges are common and don\'t reflect your worth. Support is available. ';
    }

    // Add privacy assurance
    announcement += 'Your financial information is processed securely and privately.';

    return simplifyPaymentLanguage(announcement);
  }, [amount, currency, cardLast4, cardBrand, transactionType, status, simplifyPaymentLanguage]);

  // Announce financial data when component mounts or status changes
  useEffect(() => {
    if (isScreenReaderEnabled && !hasAnnounced) {
      const announcement = createFinancialAnnouncement();
      announceForScreenReader(announcement, status === 'failed' ? 'assertive' : 'polite');
      setHasAnnounced(true);
    }
  }, [isScreenReaderEnabled, hasAnnounced, createFinancialAnnouncement, announceForScreenReader, status]);

  // Reset announcement flag when key data changes
  useEffect(() => {
    setHasAnnounced(false);
  }, [amount, status, cardLast4]);

  return (
    <View
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={createFinancialAnnouncement()}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      {children}
    </View>
  );
};

/**
 * Crisis-Responsive Payment Form Container
 * Adapts accessibility based on user stress level
 */
interface CrisisResponsiveFormProps {
  children: React.ReactNode;
  stressLevel: number;
  onStressLevelChange?: (level: number) => void;
  testID: string;
}

export const CrisisResponsiveForm: React.FC<CrisisResponsiveFormProps> = ({
  children,
  stressLevel,
  onStressLevelChange,
  testID,
}) => {
  const {
    announceForScreenReader,
    activateCrisisAccessibility,
    crisisAccessibilityMode,
  } = usePaymentAccessibility();

  const [previousStressLevel, setPreviousStressLevel] = useState(stressLevel);
  const [supportOffered, setSupportOffered] = useState(false);

  // Monitor stress level changes
  useEffect(() => {
    if (stressLevel > previousStressLevel) {
      // Stress level increasing
      if (stressLevel >= 4 && !crisisAccessibilityMode && !supportOffered) {
        // Offer crisis support
        announceForScreenReader(
          'High stress detected during payment process. Crisis support is available. Would you like to activate enhanced accessibility features?',
          'assertive'
        );
        setSupportOffered(true);
      } else if (stressLevel >= 2) {
        // Provide gentle support
        announceForScreenReader(
          'Take your time with this payment form. You can pause anytime and support is always available.',
          'polite'
        );
      }
    }

    setPreviousStressLevel(stressLevel);
  }, [stressLevel, previousStressLevel, crisisAccessibilityMode, supportOffered, announceForScreenReader]);

  // Get stress-responsive styling
  const getStressResponsiveStyle = () => {
    if (stressLevel >= 4) {
      return styles.highStressContainer;
    } else if (stressLevel >= 2) {
      return styles.moderateStressContainer;
    }
    return styles.normalContainer;
  };

  return (
    <View
      style={[styles.formContainer, getStressResponsiveStyle()]}
      accessible={true}
      accessibilityRole="form"
      accessibilityLabel={`Payment form. Current stress level support: ${
        stressLevel >= 4 ? 'High - enhanced assistance available' :
        stressLevel >= 2 ? 'Moderate - gentle guidance provided' :
        'Normal - standard support'
      }`}
      testID={testID}
    >
      {/* Stress level indicator for screen readers */}
      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Stress support level: ${stressLevel} out of 5. Enhanced accessibility features ${
          stressLevel >= 3 ? 'are active' : 'are available if needed'
        }.`}
        accessibilityLiveRegion="polite"
        style={styles.hiddenAccessibilityText}
      />

      {children}

      {/* Crisis support prompt for high stress */}
      {stressLevel >= 4 && !crisisAccessibilityMode && (
        <View style={styles.crisisSupportPrompt}>
          <Text style={styles.crisisSupportText}>
            High stress detected. Enhanced accessibility available.
          </Text>
          <MotorAccessiblePressable
            onPress={() => activateCrisisAccessibility('payment_form_stress')}
            accessibilityLabel="Activate crisis accessibility mode"
            accessibilityHint="Enables enhanced accessibility features for high stress situations"
            isCrisisElement={true}
            stressLevel={stressLevel}
            testID={`${testID}-crisis-support`}
          >
            <Text style={styles.crisisSupportButtonText}>Activate Support</Text>
          </MotorAccessiblePressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Motor Accessible Pressable
  motorAccessibleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  crisisElement: {
    borderWidth: 2,
    borderColor: colorSystem.status.critical,
    shadowColor: colorSystem.status.critical,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pressableContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: 8,
  },
  financialDataContainer: {
    backgroundColor: colorSystem.status.infoBackground,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.info,
  },
  pressedState: {
    backgroundColor: colorSystem.gray[100],
  },

  // Crisis Responsive Form
  formContainer: {
    padding: spacing.md,
    borderRadius: 12,
  },
  normalContainer: {
    backgroundColor: colorSystem.base.white,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },
  moderateStressContainer: {
    backgroundColor: colorSystem.status.warningBackground,
    borderWidth: 2,
    borderColor: colorSystem.status.warning,
    padding: spacing.lg, // More padding for stress
  },
  highStressContainer: {
    backgroundColor: colorSystem.status.errorBackground,
    borderWidth: 3,
    borderColor: colorSystem.status.error,
    padding: spacing.xl, // Maximum padding for high stress
    shadowColor: colorSystem.status.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  hiddenAccessibilityText: {
    position: 'absolute',
    left: -9999,
    width: 1,
    height: 1,
    overflow: 'hidden',
  },

  crisisSupportPrompt: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colorSystem.status.critical,
    borderRadius: 8,
    alignItems: 'center',
  },
  crisisSupportText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  crisisSupportButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyLarge.size,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});

export {
  MotorAccessiblePressable,
  FinancialDataAnnouncer,
  CrisisResponsiveForm,
};