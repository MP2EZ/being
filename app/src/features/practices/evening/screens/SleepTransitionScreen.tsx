/**
 * SLEEP TRANSITION SCREEN - FEAT-134 Evening Flow Redesign
 *
 * Screen 6 of 6: Gentle breathing + completion card
 * Uses shared BreathingCircle (60fps) and AccessibleButton components
 *
 * Design Philosophy:
 * - Sleep-compatible (calming, minimal brightness)
 * - Auto-running breathing (no decisions)
 * - Personalized completion summary (positive closure)
 * - Brief practice (30-60s)
 *
 * Stoic Philosophy:
 * - Seneca: "Receive sleep as you would receive death—with serenity,
 *   trusting in tomorrow's renewal" (Letters 54:1)
 * - Marcus Aurelius: Evening reflection prepares the mind for rest
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, SleepTransitionData, EveningCompletionSummary } from '@/features/practices/types/flows';
import BreathingCircle from '../../shared/components/BreathingCircle';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { spacing, borderRadius, typography, colorSystem } from '@/core/theme';

// Map principle keys to friendly names for display
const PRINCIPLE_NAMES: Record<string, string> = {
  aware_presence: 'Aware Presence',
  radical_acceptance: 'Radical Acceptance',
  sphere_sovereignty: 'Sphere Sovereignty',
  virtuous_response: 'Virtuous Response',
  interconnected_living: 'Interconnected Living',
};

type Props = StackScreenProps<EveningFlowParamList, 'SleepTransition'> & {
  onComplete?: (data: SleepTransitionData) => void;
};

const BREATHING_DURATION_MS = 45000; // 45 seconds (gentle, not too long)

const SleepTransitionScreen: React.FC<Props> = ({ navigation, route, onComplete }) => {
  // Get summary from route params (passed from navigator)
  const summary = route.params?.summary;

  const [isBreathingActive, setIsBreathingActive] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;

  // Auto-transition to completion after breathing duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBreathingActive(false);
      setShowCompletion(true);
      // Fade in completion card
      Animated.timing(cardFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, BREATHING_DURATION_MS);

    return () => clearTimeout(timer);
  }, [cardFadeAnim]);

  // Fade in done button after completion card appears
  useEffect(() => {
    if (showCompletion) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showCompletion, fadeAnim]);

  const handleDone = () => {
    const sleepTransitionData: SleepTransitionData = {
      breathingCompleted: true,
      timestamp: new Date(),
    };

    if (onComplete) {
      onComplete(sleepTransitionData);
    }
    // Note: Navigation is handled by the EveningFlowNavigator's onComplete callback
    // which dismisses the entire flow - no need to navigate here
  };

  // Build personalized summary text
  const buildSummaryText = (summaryData?: EveningCompletionSummary): string[] => {
    const items: string[] = [];

    if (summaryData) {
      if (summaryData.gratitudeCount > 0) {
        items.push(`Named ${summaryData.gratitudeCount} gratitude${summaryData.gratitudeCount > 1 ? 's' : ''}`);
      }
      if (summaryData.principleReflected) {
        const principleName = PRINCIPLE_NAMES[summaryData.principleReflected] || summaryData.principleReflected;
        items.push(`Practiced ${principleName}`);
      }
      if (summaryData.selfCompassionCompleted) {
        items.push('Offered yourself kindness');
      }
      if (summaryData.tomorrowIntentionSet) {
        items.push('Set an intention for tomorrow');
      }
    }

    // Fallback if no data
    if (items.length === 0) {
      items.push('Completed your evening reflection');
    }

    return items;
  };

  const summaryItems = buildSummaryText(summary);

  return (
    <View style={styles.container} testID="sleep-transition-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {showCompletion ? 'Evening reflection complete' : 'Settling into rest...'}
        </Text>
      </View>

      {/* Breathing Circle - auto-running, gentle */}
      {!showCompletion && (
        <View style={styles.breathingContainer}>
          <BreathingCircle
            isActive={isBreathingActive}
            pattern={{ inhale: 4000, hold: 4000, exhale: 6000 }}
            showCountdown={false}
            phaseText={{
              inhale: 'Breathe in...',
              hold: 'Hold gently...',
              exhale: 'Release...',
            }}
            testID="sleep-breathing-circle"
          />
        </View>
      )}

      {/* Completion Card - fades in after breathing */}
      {showCompletion && (
        <Animated.View style={[styles.completionCard, { opacity: cardFadeAnim }]}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.completionTitle}>Tonight you:</Text>
          <View style={styles.summaryList}>
            {summaryItems.map((item, index) => (
              <Text key={index} style={styles.summaryItem}>• {item}</Text>
            ))}
          </View>

          {/* Seneca Quote */}
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>
              "Receive sleep as you would receive death—with serenity, trusting in tomorrow's renewal."
            </Text>
            <Text style={styles.quoteAttribution}>— Seneca, Letters 54</Text>
          </View>
        </Animated.View>
      )}

      {/* Done Button - fades in after completion card */}
      <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
        {showCompletion && (
          <AccessibleButton
            onPress={handleDone}
            label="Done for tonight"
            variant="primary"
            size="large"
            testID="done-button"
            accessibilityHint="Complete evening practice and return home"
          />
        )}
      </Animated.View>

      {/* Rest message - always visible */}
      <Text style={styles.restMessage}>
        Rest well. Tomorrow is a new practice.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white, // White content area (matches morning/midday)
    paddingHorizontal: spacing[20],
    paddingTop: spacing[24],
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing[32],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.base.black,
    textAlign: 'center',
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[32],
  },
  completionCard: {
    flex: 1,
    width: '100%',
    backgroundColor: colorSystem.themes.evening.background, // Light green card for completion
    borderRadius: borderRadius.large,
    padding: spacing[24],
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    marginBottom: spacing[24],
  },
  checkmark: {
    fontSize: typography.display1.size,
    color: colorSystem.status.success,
    textAlign: 'center',
    marginBottom: spacing[16],
  },
  completionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing[16],
  },
  summaryList: {
    marginBottom: spacing[24],
  },
  summaryItem: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[8],
    paddingLeft: spacing[8],
  },
  quoteContainer: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.themes.evening.primary,
  },
  quoteText: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: colorSystem.gray[600],
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  quoteAttribution: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'right',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing[16],
  },
  restMessage: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[500],
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing[32],
  },
});

export default SleepTransitionScreen;
