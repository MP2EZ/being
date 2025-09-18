/**
 * Payment Anxiety Detection Component - Proactive Mental Health Support
 *
 * CLINICAL REQUIREMENTS:
 * - Detects patterns indicating payment-related anxiety
 * - Provides therapeutic interventions before crisis escalation
 * - MBCT-compliant supportive messaging
 * - Non-judgmental approach to financial stress
 *
 * DETECTION PATTERNS:
 * - Rapid form corrections or hesitations
 * - Multiple failed payment attempts
 * - Extended time on payment screens
 * - Device sensors (if available) for stress indicators
 *
 * INTERVENTION STRATEGIES:
 * - Mindful breathing prompts
 * - Therapeutic reframing of payment challenges
 * - Crisis support escalation options
 * - Alternative access pathways
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Linking,
  AccessibilityInfo,
} from 'react-native';
import { useCrisisPaymentSafety } from '../../store';
import { colorSystem, spacing, typography } from '../../constants/colors';

export interface PaymentAnxietyDetectionProps {
  formInteractions?: number;
  errorCount?: number;
  timeOnScreen?: number;
  paymentFailures?: number;
  onAnxietyDetected?: (level: number) => void;
  onInterventionTriggered?: (intervention: string) => void;
}

interface AnxietyIndicators {
  rapidCorrections: number;
  formHesitation: number;
  paymentErrors: number;
  timeStress: number;
  overallLevel: number;
}

export const PaymentAnxietyDetection: React.FC<PaymentAnxietyDetectionProps> = ({
  formInteractions = 0,
  errorCount = 0,
  timeOnScreen = 0,
  paymentFailures = 0,
  onAnxietyDetected,
  onInterventionTriggered
}) => {
  const { enableCrisisMode } = useCrisisPaymentSafety();

  // Animation values
  const breathingAnimation = useRef(new Animated.Value(0)).current;
  const slideInAnimation = useRef(new Animated.Value(50)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // State
  const [anxietyIndicators, setAnxietyIndicators] = useState<AnxietyIndicators>({
    rapidCorrections: 0,
    formHesitation: 0,
    paymentErrors: 0,
    timeStress: 0,
    overallLevel: 0
  });

  const [showSupport, setShowSupport] = useState(false);
  const [currentIntervention, setCurrentIntervention] = useState<string | null>(null);
  const [breathingActive, setBreathingActive] = useState(false);

  // Detection timers
  const hesitationTimer = useRef<NodeJS.Timeout | null>(null);
  const interactionHistory = useRef<number[]>([]);

  useEffect(() => {
    analyzeAnxietyIndicators();
  }, [formInteractions, errorCount, timeOnScreen, paymentFailures]);

  useEffect(() => {
    if (anxietyIndicators.overallLevel >= 3 && !showSupport) {
      triggerSupportIntervention();
    }
  }, [anxietyIndicators.overallLevel, showSupport]);

  const analyzeAnxietyIndicators = () => {
    const indicators: AnxietyIndicators = {
      rapidCorrections: 0,
      formHesitation: 0,
      paymentErrors: 0,
      timeStress: 0,
      overallLevel: 0
    };

    // Detect rapid form corrections (anxiety indicator)
    interactionHistory.current.push(Date.now());
    if (interactionHistory.current.length > 5) {
      interactionHistory.current = interactionHistory.current.slice(-5);

      const rapidInteractions = interactionHistory.current.filter(
        (time, index, arr) => index > 0 && time - arr[index - 1] < 500
      ).length;

      indicators.rapidCorrections = Math.min(rapidInteractions, 5);
    }

    // Analyze form hesitation patterns
    if (timeOnScreen > 30000 && formInteractions < 3) {
      indicators.formHesitation = 3; // Long time, few interactions
    } else if (timeOnScreen > 60000 && formInteractions < 5) {
      indicators.formHesitation = 5; // Very long time, minimal progress
    }

    // Payment error stress factor
    indicators.paymentErrors = Math.min(paymentFailures * 2, 5);

    // Time-based stress (payment forms shouldn't take too long)
    if (timeOnScreen > 120000) { // 2 minutes
      indicators.timeStress = Math.min(Math.floor(timeOnScreen / 30000), 5);
    }

    // Calculate overall anxiety level (0-5 scale)
    indicators.overallLevel = Math.min(
      Math.floor(
        (indicators.rapidCorrections +
         indicators.formHesitation +
         indicators.paymentErrors +
         indicators.timeStress) / 4
      ),
      5
    );

    setAnxietyIndicators(indicators);

    // Notify parent component
    if (onAnxietyDetected) {
      onAnxietyDetected(indicators.overallLevel);
    }
  };

  const triggerSupportIntervention = useCallback(() => {
    setShowSupport(true);

    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideInAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Announce for screen readers
    AccessibilityInfo.announceForAccessibility(
      'Payment support is available. Take your time - there\'s no pressure to rush through this process.'
    );

    // Select appropriate intervention based on anxiety level
    const intervention = selectIntervention(anxietyIndicators.overallLevel);
    setCurrentIntervention(intervention);

    if (onInterventionTriggered) {
      onInterventionTriggered(intervention);
    }
  }, [anxietyIndicators.overallLevel, onInterventionTriggered]);

  const selectIntervention = (anxietyLevel: number): string => {
    if (anxietyLevel >= 4) {
      return 'crisis_escalation';
    } else if (anxietyLevel >= 3) {
      return 'breathing_exercise';
    } else {
      return 'gentle_support';
    }
  };

  const handleBreathingExercise = useCallback(() => {
    setBreathingActive(true);
    setCurrentIntervention('breathing_exercise');

    // Start breathing animation cycle
    const breathingCycle = () => {
      Animated.sequence([
        Animated.timing(breathingAnimation, {
          toValue: 1,
          duration: 4000, // 4 seconds in
          useNativeDriver: true,
        }),
        Animated.timing(breathingAnimation, {
          toValue: 0,
          duration: 4000, // 4 seconds out
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (breathingActive) {
          breathingCycle();
        }
      });
    };

    breathingCycle();

    // Auto-stop after 1 minute
    setTimeout(() => {
      if (breathingActive) {
        handleStopBreathing();
      }
    }, 60000);

    AccessibilityInfo.announceForAccessibility(
      'Beginning mindful breathing exercise. Breathe in slowly for 4 counts, then out for 4 counts.'
    );
  }, [breathingActive, breathingAnimation]);

  const handleStopBreathing = () => {
    setBreathingActive(false);
    breathingAnimation.stopAnimation();
    breathingAnimation.setValue(0);
  };

  const handleCrisisEscalation = useCallback(async () => {
    Alert.alert(
      'Payment Stress Support',
      'Payment difficulties can be overwhelming and trigger anxiety. Remember:\n\n• Your worth isn\'t determined by payment status\n• Crisis support is always free\n• Professional help is available now',
      [
        {
          text: 'Call 988 Crisis Line',
          onPress: () => Linking.openURL('tel:988'),
          style: 'destructive'
        },
        {
          text: 'Activate Crisis Mode',
          onPress: () => enableCrisisMode('payment_anxiety_escalation')
        },
        {
          text: 'Continue with Support',
          style: 'default'
        }
      ]
    );
  }, [enableCrisisMode]);

  const handleDismissSupport = () => {
    setShowSupport(false);
    setCurrentIntervention(null);
    if (breathingActive) {
      handleStopBreathing();
    }
  };

  const BreathingCircle: React.FC = () => {
    const scale = breathingAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.3],
    });

    const opacity = breathingAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
    });

    if (!breathingActive) return null;

    return (
      <View style={styles.breathingContainer}>
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <Text style={styles.breathingText}>Breathe</Text>
        </Animated.View>
        <Text style={styles.breathingInstruction}>
          Follow the circle - breathe in as it grows, out as it shrinks
        </Text>
      </View>
    );
  };

  const SupportMessage: React.FC = () => {
    const getMessage = () => {
      switch (currentIntervention) {
        case 'crisis_escalation':
          return {
            title: 'Payment Stress Detected',
            message: 'Payment challenges can cause significant anxiety. Your mental health matters more than any payment. Professional support is available right now.',
            actions: ['Call 988', 'Crisis Mode', 'Continue']
          };
        case 'breathing_exercise':
          return {
            title: 'Take a Mindful Moment',
            message: 'Payment forms can feel overwhelming. Let\'s take a moment to center ourselves with mindful breathing.',
            actions: ['Start Breathing', 'Skip', 'Get Support']
          };
        default:
          return {
            title: 'Payment Support Available',
            message: 'Take your time with this process. There\'s no pressure to rush, and support is available if you need it.',
            actions: ['Continue', 'Get Help', 'Dismiss']
          };
      }
    };

    const { title, message, actions } = getMessage();

    return (
      <View style={styles.supportMessage}>
        <Text style={styles.supportTitle}>{title}</Text>
        <Text style={styles.supportText}>{message}</Text>

        <View style={styles.supportActions}>
          {actions.includes('Call 988') && (
            <TouchableOpacity
              style={[styles.supportButton, styles.crisisButton]}
              onPress={() => Linking.openURL('tel:988')}
            >
              <Text style={styles.crisisButtonText}>Call 988</Text>
            </TouchableOpacity>
          )}

          {actions.includes('Crisis Mode') && (
            <TouchableOpacity
              style={[styles.supportButton, styles.crisisButton]}
              onPress={handleCrisisEscalation}
            >
              <Text style={styles.crisisButtonText}>Crisis Mode</Text>
            </TouchableOpacity>
          )}

          {actions.includes('Start Breathing') && (
            <TouchableOpacity
              style={[styles.supportButton, styles.primaryButton]}
              onPress={handleBreathingExercise}
            >
              <Text style={styles.primaryButtonText}>Start Breathing</Text>
            </TouchableOpacity>
          )}

          {actions.includes('Get Support') && (
            <TouchableOpacity
              style={[styles.supportButton, styles.secondaryButton]}
              onPress={handleCrisisEscalation}
            >
              <Text style={styles.secondaryButtonText}>Get Support</Text>
            </TouchableOpacity>
          )}

          {(actions.includes('Continue') || actions.includes('Skip') || actions.includes('Dismiss')) && (
            <TouchableOpacity
              style={[styles.supportButton, styles.dismissButton]}
              onPress={handleDismissSupport}
            >
              <Text style={styles.dismissButtonText}>
                {actions.includes('Continue') ? 'Continue' :
                 actions.includes('Skip') ? 'Skip' : 'Dismiss'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!showSupport && !breathingActive) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slideInAnimation }],
        },
      ]}
    >
      <BreathingCircle />

      {showSupport && <SupportMessage />}

      {breathingActive && (
        <TouchableOpacity
          style={styles.stopBreathingButton}
          onPress={handleStopBreathing}
        >
          <Text style={styles.stopBreathingText}>Stop Breathing Exercise</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.status.warningBackground,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.warning,
  },

  // Breathing Exercise
  breathingContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  breathingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colorSystem.status.info,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  breathingText: {
    color: colorSystem.base.white,
    fontSize: 18,
    fontWeight: '600',
  },

  breathingInstruction: {
    fontSize: 14,
    color: colorSystem.accessibility.text.secondary,
    textAlign: 'center',
  },

  stopBreathingButton: {
    alignSelf: 'center',
    backgroundColor: colorSystem.gray[400],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.md,
  },

  stopBreathingText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '500',
  },

  // Support Message
  supportMessage: {
    marginBottom: spacing.md,
  },

  supportTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.status.warning,
    marginBottom: spacing.sm,
  },

  supportText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
    lineHeight: typography.bodyRegular.lineHeight * typography.bodyRegular.size,
    marginBottom: spacing.md,
  },

  // Support Actions
  supportActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  supportButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },

  crisisButton: {
    backgroundColor: colorSystem.status.critical,
  },

  crisisButtonText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '700',
  },

  primaryButton: {
    backgroundColor: colorSystem.status.info,
  },

  primaryButtonText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '600',
  },

  secondaryButton: {
    backgroundColor: colorSystem.status.warning,
  },

  secondaryButtonText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '600',
  },

  dismissButton: {
    backgroundColor: colorSystem.gray[400],
  },

  dismissButtonText: {
    color: colorSystem.base.white,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PaymentAnxietyDetection;