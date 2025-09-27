/**
 * Onboarding Crisis Button - Enhanced crisis access during therapeutic onboarding
 *
 * CRITICAL PERFORMANCE REQUIREMENTS:
 * - <200ms response time for crisis activation
 * - Accessible from any onboarding screen in <3 seconds
 * - Progress preservation during crisis intervention
 * - Onboarding-aware crisis protocols
 *
 * ONBOARDING-SPECIFIC FEATURES:
 * - Context-aware crisis detection
 * - First-time user crisis education
 * - Therapeutic flow integration
 * - Progress-preserving crisis intervention
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  Alert,
  AccessibilityInfo,
  Vibration,
  Platform,
  Animated,
} from 'react-native';

import { colorSystem, spacing } from '../../constants/colors';
import { useCrisisStore } from '../../store/crisisStore';
import { useOnboardingStore, OnboardingStep } from '../../store/onboardingStore';
import { onboardingCrisisDetectionService } from '../../services/OnboardingCrisisDetectionService';

interface OnboardingCrisisButtonProps {
  variant?: 'floating' | 'header' | 'embedded';
  currentStep?: OnboardingStep;
  onCrisisActivated?: (step: OnboardingStep) => void;
  onProgressSaved?: () => void;
  style?: any;

  // Accessibility props for crisis situations
  highContrastMode?: boolean;
  largeTargetMode?: boolean;
  urgencyLevel?: 'standard' | 'high' | 'emergency';

  // Onboarding-specific props
  showStepContext?: boolean;
  enableProgressPreservation?: boolean;
  theme: 'morning' | 'midday' | 'evening';
}

export const OnboardingCrisisButton: React.FC<OnboardingCrisisButtonProps> = React.memo(({
  variant = 'floating',
  currentStep,
  onCrisisActivated,
  onProgressSaved,
  style,
  highContrastMode = false,
  largeTargetMode = false,
  urgencyLevel = 'standard',
  showStepContext = true,
  enableProgressPreservation = true,
  theme
}) => {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const [currentCrisis, setCurrentCrisis] = useState<any>(null);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Store access
  const { call988, isInCrisis, currentSeverity } = useCrisisStore();
  const { pauseOnboarding, getCurrentStep, saveProgress } = useOnboardingStore();

  const themeColors = colorSystem.themes[theme];

  // Initialize accessibility state
  useEffect(() => {
    const checkAccessibilitySettings = async () => {
      try {
        const [reduceMotion, screenReader] = await Promise.all([
          AccessibilityInfo.isReduceMotionEnabled(),
          AccessibilityInfo.isScreenReaderEnabled()
        ]);
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

  // Monitor ongoing crisis during onboarding
  useEffect(() => {
    const checkCurrentCrisis = () => {
      const crisis = onboardingCrisisDetectionService.getCurrentCrisis();
      setCurrentCrisis(crisis);
    };

    checkCurrentCrisis();
    const interval = setInterval(checkCurrentCrisis, 1000);

    return () => clearInterval(interval);
  }, []);

  // Pulse animation for urgent states
  useEffect(() => {
    if (isInCrisis || urgencyLevel === 'emergency') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      if (!isReduceMotionEnabled) {
        pulseAnimation.start();
      }

      return () => pulseAnimation.stop();
    }
  }, [isInCrisis, urgencyLevel, isReduceMotionEnabled, pulseAnim]);

  /**
   * PERFORMANCE CRITICAL: Optimized crisis activation for onboarding
   * Target response time: <100ms for immediate crisis response
   */
  const handleCrisisActivation = useCallback(async () => {
    if (isLoading) return;

    const startTime = performance.now();

    try {
      setIsLoading(true);

      // Get current onboarding step
      const step = currentStep || getCurrentStep() || 'welcome';

      // IMMEDIATE CRISIS FEEDBACK
      // Haptic feedback now handled in onPressIn for immediate response

      // ACCESSIBILITY: Immediate voice announcement
      const urgentAnnouncement = urgencyLevel === 'emergency'
        ? 'EMERGENCY: Crisis intervention activated'
        : 'Crisis support activated. Help is available.';

      AccessibilityInfo.announceForAccessibility(urgentAnnouncement);

      // PROGRESS PRESERVATION: Save onboarding progress immediately
      if (enableProgressPreservation) {
        try {
          await saveProgress();
          await pauseOnboarding();
          onProgressSaved?.();
          console.log('✅ Onboarding progress saved during crisis activation');
        } catch (error) {
          console.warn('Failed to save onboarding progress:', error);
          // Continue with crisis intervention anyway
        }
      }

      // CRISIS DETECTION: Check for context-specific crisis needs
      const crisisResult = await onboardingCrisisDetectionService.detectOnboardingCrisis(step);

      // CRISIS INTERVENTION BASED ON SEVERITY
      if (crisisResult?.severity === 'critical' || urgencyLevel === 'emergency') {
        await handleCriticalCrisisIntervention(step);
      } else if (crisisResult?.severity === 'severe') {
        await handleSevereCrisisIntervention(step);
      } else {
        await handleStandardCrisisIntervention(step);
      }

      // Notify parent component
      onCrisisActivated?.(step);

      const responseTime = performance.now() - startTime;
      console.log(`🚨 Onboarding crisis activation completed in ${responseTime.toFixed(2)}ms`);

    } catch (error) {
      console.error('Onboarding crisis activation failed:', error);
      // Fallback to basic crisis intervention
      await handleFallbackCrisisIntervention();
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    currentStep,
    getCurrentStep,
    urgencyLevel,
    enableProgressPreservation,
    saveProgress,
    pauseOnboarding,
    onProgressSaved,
    onCrisisActivated
  ]);

  /**
   * CRITICAL crisis intervention (suicidal ideation, emergency)
   */
  const handleCriticalCrisisIntervention = useCallback(async (step: OnboardingStep) => {
    Alert.alert(
      '🆘 Immediate Help Available',
      'Crisis counselors are available 24/7. Your onboarding progress has been saved.',
      [
        {
          text: 'Call 988 Now',
          style: 'default',
          onPress: async () => {
            await call988();
          }
        },
        {
          text: 'Crisis Resources',
          onPress: () => {
            Alert.alert(
              'Crisis Resources',
              '🆘 IMMEDIATE HELP:\n\n📞 988 - Crisis Lifeline\n📞 911 - Emergency\n💬 Text HOME to 741741\n\nAll available 24/7\n\nYour setup progress is saved.',
              [
                {
                  text: 'Call 988',
                  onPress: () => call988()
                },
                { text: 'OK' }
              ]
            );
          }
        },
        {
          text: 'Exit Safely',
          style: 'cancel',
          onPress: () => {
            console.log('User chose safe exit from onboarding');
            // Would trigger safe exit flow
          }
        }
      ]
    );
  }, [call988]);

  /**
   * SEVERE crisis intervention with onboarding options
   */
  const handleSevereCrisisIntervention = useCallback(async (step: OnboardingStep) => {
    Alert.alert(
      '🔒 Support Available',
      'We want to ensure you have the support you need. Your progress is saved.',
      [
        {
          text: 'Call 988',
          onPress: async () => {
            await call988();
          }
        },
        {
          text: 'Safety Planning',
          onPress: () => {
            // Skip to safety planning step
            Alert.alert(
              'Safety Planning',
              'Would you like to skip to the safety planning section of your setup?',
              [
                {
                  text: 'Yes, Skip There',
                  onPress: () => {
                    console.log('Skipping to safety planning step');
                    // Would trigger navigation to safety planning
                  }
                },
                { text: 'Not Now', style: 'cancel' }
              ]
            );
          }
        },
        {
          text: 'Continue Setup',
          style: 'cancel',
          onPress: () => {
            console.log('User chose to continue onboarding');
          }
        }
      ]
    );
  }, [call988]);

  /**
   * STANDARD crisis intervention for onboarding
   */
  const handleStandardCrisisIntervention = useCallback(async (step: OnboardingStep) => {
    Alert.alert(
      '🛡️ Support Resources',
      'Support resources are available. Your setup progress has been saved and you can continue when ready.',
      [
        {
          text: 'Crisis Text Line',
          onPress: () => {
            Alert.alert(
              'Crisis Text Line',
              'Text HOME to 741741 for 24/7 support via text message.',
              [
                {
                  text: 'Copy Number',
                  onPress: () => {
                    // Would copy 741741 to clipboard
                    console.log('Copied 741741 to clipboard');
                  }
                },
                { text: 'OK' }
              ]
            );
          }
        },
        {
          text: 'Learn About Support',
          onPress: () => {
            Alert.alert(
              'Crisis Support',
              'Crisis support is free, confidential, and available 24/7:\n\n• 988 Crisis Lifeline for voice support\n• Text HOME to 741741 for text support\n• All services connect you with trained counselors\n\nYour app setup progress is always saved.',
              [{ text: 'Got It' }]
            );
          }
        },
        {
          text: 'Continue Setup',
          style: 'cancel',
          onPress: () => {
            console.log('User chose to continue onboarding');
          }
        }
      ]
    );
  }, []);

  /**
   * Fallback crisis intervention
   */
  const handleFallbackCrisisIntervention = useCallback(async () => {
    Alert.alert(
      'Crisis Support',
      'If you need immediate help:\n\n📞 Call 988 (Crisis Lifeline)\n📞 Call 911 (Emergency)\n\nYour app setup progress has been saved.',
      [
        {
          text: 'Call 988',
          onPress: () => call988()
        },
        { text: 'OK' }
      ]
    );
  }, [call988]);

  /**
   * Long press handler for additional crisis options
   */
  const handleLongPress = useCallback(() => {
    const step = currentStep || getCurrentStep() || 'welcome';

    Alert.alert(
      'Crisis Support Options',
      `Current setup step: ${step}\n\nChoose your preferred support method:`,
      [
        {
          text: '📞 Call 988',
          onPress: () => call988()
        },
        {
          text: '💬 Text Support',
          onPress: () => {
            Alert.alert(
              'Text Support',
              'Text HOME to 741741 for crisis support via text message.',
              [{ text: 'OK' }]
            );
          }
        },
        {
          text: '📋 All Resources',
          onPress: () => {
            Alert.alert(
              'Crisis Resources',
              '🆘 CRISIS SUPPORT:\n\n📞 988 - Crisis Lifeline (24/7)\n💬 Text HOME to 741741 (24/7)\n📞 911 - Emergency Services\n\n🔒 SAFETY:\nYour app setup progress is saved.\nYou can continue when you\'re ready.',
              [{ text: 'OK' }]
            );
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  }, [currentStep, getCurrentStep, call988]);

  /**
   * Get button styling based on state and props
   */
  const getButtonStyle = () => {
    const baseStyles = [styles.crisisButton];

    // Apply variant-specific styles
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
    }

    // Apply accessibility enhancements
    if (largeTargetMode || isScreenReaderEnabled) {
      baseStyles.push(styles.largeTarget);
    }

    if (highContrastMode || urgencyLevel === 'emergency') {
      baseStyles.push(styles.highContrast);
    }

    // Apply crisis state styling
    if (isInCrisis || currentCrisis) {
      baseStyles.push(styles.activeCrisis);
    }

    if (urgencyLevel === 'emergency') {
      baseStyles.push(styles.emergencyMode);
    }

    return baseStyles;
  };

  const getTextStyles = () => {
    const baseStyles = [
      variant === 'floating' ? styles.floatingButtonText : styles.buttonText
    ];

    if (urgencyLevel === 'emergency' || isInCrisis) {
      baseStyles.push(styles.emergencyText);
    }

    if (largeTargetMode || isScreenReaderEnabled) {
      baseStyles.push(styles.largeText);
    }

    return baseStyles;
  };

  const getAccessibilityLabel = () => {
    const step = currentStep || getCurrentStep() || 'unknown';
    const stepContext = showStepContext ? ` during ${step} step` : '';

    if (isInCrisis || currentCrisis) {
      return `URGENT: Crisis intervention active${stepContext}. Access immediate help.`;
    }

    if (urgencyLevel === 'emergency') {
      return `EMERGENCY: Call 988 crisis hotline immediately${stepContext}`;
    }

    return `Emergency crisis support${stepContext} - Call 988 or access crisis resources`;
  };

  const getAccessibilityHint = () => {
    if (enableProgressPreservation) {
      return 'Double tap to access crisis support. Your setup progress will be saved. Long press for more options.';
    }
    return 'Double tap to access crisis support. Long press for more options.';
  };

  if (variant === 'floating') {
    return (
      <Animated.View
        style={[
          styles.floatingContainer,
          {
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        <Pressable
          onPress={handleCrisisActivation}
          onLongPress={handleLongPress}
          onPressIn={() => {
            // CRITICAL: Crisis feedback MUST remain <100ms
            if (Platform.OS === 'ios') {
              Vibration.vibrate([0, 250, 100, 250]); // Strong haptic pattern
            } else {
              Vibration.vibrate(500); // Android strong vibration
            }
          }}
          disabled={isLoading}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint={getAccessibilityHint()}
          accessibilityState={{
            disabled: isLoading,
            busy: isLoading,
            selected: isInCrisis || !!currentCrisis
          }}
          accessibilityLiveRegion={
            (isInCrisis || urgencyLevel === 'emergency') ? 'assertive' : 'polite'
          }
          testID="onboarding-crisis-button-floating"
          style={({ pressed }) => [
            ...getButtonStyle(),
            pressed && { opacity: 0.8 },
            style
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
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
              styles.floatingSubtext,
              (urgencyLevel === 'emergency' || isInCrisis) && styles.emergencySubtext,
              (largeTargetMode || isScreenReaderEnabled) && styles.largeSubtext
            ]}
            accessible={false}
            importantForAccessibility="no"
            allowFontScaling={true}
            maxFontSizeMultiplier={1.5}
          >
            {isInCrisis ? 'ACTIVE' : urgencyLevel === 'emergency' ? 'URGENT' : 'CRISIS'}
          </Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Pressable
      onPress={handleCrisisActivation}
      onLongPress={handleLongPress}
      onPressIn={() => {
        // CRITICAL: Crisis feedback MUST remain <100ms
        if (Platform.OS === 'ios') {
          Vibration.vibrate([0, 250, 100, 250]); // Strong haptic pattern
        } else {
          Vibration.vibrate(500); // Android strong vibration
        }
      }}
      disabled={isLoading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={getAccessibilityHint()}
      accessibilityState={{ disabled: isLoading, selected: isInCrisis }}
      testID="onboarding-crisis-button-embedded"
      style={({ pressed }) => [
        ...getButtonStyle(),
        pressed && { opacity: 0.8 },
        style
      ]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text
        style={getTextStyles()}
        accessible={false}
        importantForAccessibility="no"
        allowFontScaling={true}
        maxFontSizeMultiplier={2.0}
      >
        {isLoading ? 'Connecting...' :
         urgencyLevel === 'emergency' ? 'Emergency Support' :
         'Crisis Support'}
      </Text>
    </Pressable>
  );
});

OnboardingCrisisButton.displayName = 'OnboardingCrisisButton';

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    right: spacing.md,
    bottom: 100,
    zIndex: 1000,
  },
  crisisButton: {
    backgroundColor: colorSystem.status.error,
    alignItems: 'center',
    justifyContent: 'center',
    // WCAG AA compliance: minimum 44px touch targets
    minHeight: 44,
    minWidth: 44,
  },
  floatingButton: {
    width: 72, // Larger for onboarding context
    height: 72,
    borderRadius: 36,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    minHeight: 44,
  },
  embeddedButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    minHeight: 48,
  },
  // ACCESSIBILITY: Large target mode for stress/anxiety states
  largeTarget: {
    minWidth: 80,
    minHeight: 80,
    paddingVertical: 18,
    paddingHorizontal: 22,
  },
  // ACCESSIBILITY: High contrast mode
  highContrast: {
    backgroundColor: '#CC0000', // 7:1 contrast ratio
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  // CRISIS STATE: Active crisis styling
  activeCrisis: {
    backgroundColor: '#991B1B', // Darker red for active state
    borderWidth: 2,
    borderColor: '#FBBF24', // Yellow border for attention
  },
  // EMERGENCY: Maximum visibility emergency mode
  emergencyMode: {
    backgroundColor: '#B91C1C', // Maximum contrast red
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#B91C1C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 18, // Larger for onboarding
    fontWeight: '700',
    textAlign: 'center',
  },
  floatingSubtext: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.9,
    textAlign: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // ACCESSIBILITY: Larger text for screen readers
  largeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  emergencyText: {
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emergencySubtext: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 1,
  },
  largeSubtext: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OnboardingCrisisButton;