/**
 * SLEEP TRANSITION SCREEN - DRD v2.0.0
 *
 * Mindful breathing for peaceful sleep transition.
 * Progressive relaxation + release day's tensions.
 *
 * Stoic Philosophy:
 * - Seneca: "Receive sleep as you would receive death" (Letters 54:1)
 *   - Release control of the day
 *   - Trust in tomorrow's renewal
 * - Marcus Aurelius: Evening reflection prepares the mind for rest
 * - Epictetus: "Don't let the sun set on your anger" (implicit in evening practice)
 *
 * Design Philosophy:
 * - Sleep-compatible (calming, no blue light spikes)
 * - Brief practice (2-3 minutes max)
 * - Progressive relaxation guidance
 * - Peaceful completion
 * - Release day's tensions
 *
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow, Screen 8)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, SleepTransitionData } from '@/features/practices/types/flows';
import BreathingCircle from '../../shared/components/BreathingCircle';
import { CollapsibleCrisisButton } from '@/features/crisis/components';
import { spacing, borderRadius, typography } from '@/core/theme';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

type Props = StackScreenProps<EveningFlowParamList, 'SleepTransition'> & {
  onSave?: (data: SleepTransitionData) => void;
};

const SleepTransitionScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const rootNavigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [breathingCompleted, setBreathingCompleted] = useState(false);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingStarted, setBreathingStarted] = useState(false);

  const handleComplete = () => {
    const sleepTransitionData: SleepTransitionData = {
      breathingCompleted,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(sleepTransitionData);
    }

    navigation.navigate('EveningCompletion');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        testID="sleep-transition-screen"
        contentContainerStyle={styles.contentContainer}
      >
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        testID="back-button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transition to Rest</Text>
        <Text style={styles.subtitle}>Complete Your Evening Practice</Text>
        <Text style={styles.helperText}>
          Release the day, prepare for peaceful rest
        </Text>
      </View>

      {/* Sphere Sovereignty Framing */}
      <View style={styles.sovereigntySection}>
        <Text style={styles.sovereigntyTitle}>Sphere Sovereignty: Sleep</Text>
        <Text style={styles.sovereigntyText}>
          You cannot control when sleep comes, but you can create the conditions for rest.
        </Text>
        <Text style={styles.sovereigntyText}>
          This 4-7-8 breathing pattern signals your nervous system that it's safe to release the day.
        </Text>
      </View>

      {/* 4-7-8 Breathing Practice */}
      <View style={styles.breathingSection}>
        <Text style={styles.breathingTitle}>4-7-8 Breathing for Sleep</Text>

        {!breathingStarted ? (
          <>
            <Text style={styles.breathingInstructions}>
              • Inhale through your nose for 4 seconds{'\n'}
              • Hold your breath for 7 seconds{'\n'}
              • Exhale slowly through your mouth for 8 seconds{'\n'}
              {'\n'}
              Repeat 3-4 cycles to prepare for sleep.
            </Text>
            <TouchableOpacity
              style={styles.startBreathingButton}
              onPress={() => {
                setBreathingStarted(true);
                setBreathingActive(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Start 4-7-8 breathing practice"
            >
              <Text style={styles.startBreathingText}>Begin Practice</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <BreathingCircle
              isActive={breathingActive}
              pattern={{ inhale: 4000, hold: 7000, exhale: 8000 }}
              showCountdown={true}
              phaseText={{
                inhale: 'Inhale (nose)',
                hold: 'Hold gently',
                exhale: 'Exhale (mouth)',
              }}
              testID="sleep-breathing-circle"
            />
            {!breathingCompleted && (
              <TouchableOpacity
                style={styles.stopBreathingButton}
                onPress={() => {
                  setBreathingActive(false);
                  setBreathingCompleted(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Complete breathing practice"
              >
                <Text style={styles.stopBreathingText}>Complete Practice</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Progressive Relaxation (shown after breathing) */}
      {breathingCompleted && (
        <View style={styles.relaxationSection}>
          <Text style={styles.relaxationTitle}>Release and Rest</Text>
          <Text style={styles.relaxationText}>
            Notice your body settling...
            {'\n\n'}
            Release any remaining tension...
            {'\n\n'}
            You've done what you could today. That's enough.
          </Text>
        </View>
      )}

      {/* Completion Message */}
      <View style={styles.completionMessage}>
        <Text style={styles.completionText}>
          Rest well. Tomorrow is a new practice.
        </Text>
      </View>

      {/* Complete Button */}
      <TouchableOpacity
        style={styles.completeButton}
        onPress={handleComplete}
        accessibilityRole="button"
        accessibilityLabel="Complete evening practice"
      >
        <Text style={styles.completeButtonText}>Complete Evening Practice</Text>
      </TouchableOpacity>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "Receive sleep as you would receive death—with serenity, trusting in
          tomorrow's renewal." — Seneca, Letters 54:1
        </Text>
      </View>
      </ScrollView>
      <CollapsibleCrisisButton
        mode="immersive"
        onNavigate={() => rootNavigation.navigate('CrisisResources')}
        testID="crisis-button"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Dark, sleep-compatible
  },
  contentContainer: {
    padding: spacing[20],
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: spacing[20],
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    color: '#7A9C85', // Muted green, not bright
  },
  header: {
    marginBottom: spacing[24],
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[8],
    color: '#E8E8E8', // Soft white, not harsh
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: '#B8B8B8',
    marginBottom: spacing[4],
  },
  helperText: {
    fontSize: typography.bodySmall.size,
    color: '#888',
    fontStyle: 'italic',
  },
  guidanceSection: {
    padding: spacing[20],
    backgroundColor: '#252525',
    borderRadius: borderRadius.large,
    marginBottom: spacing[24],
    borderLeftWidth: spacing[4],
    borderLeftColor: '#5A7C65', // Muted evening green
  },
  guidanceTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[12],
    color: '#B8C8B8',
  },
  guidanceText: {
    fontSize: 15,
    color: '#A8A8A8',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  relaxationSection: {
    padding: spacing[20],
    backgroundColor: '#252525',
    borderRadius: borderRadius.large,
    marginBottom: spacing[24],
    borderLeftWidth: spacing[4],
    borderLeftColor: '#5A7C65',
  },
  relaxationTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[12],
    color: '#B8C8B8',
  },
  relaxationText: {
    fontSize: 15,
    color: '#A8A8A8',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  sovereigntySection: {
    padding: spacing[20],
    backgroundColor: '#2A3A2D',
    borderRadius: borderRadius.large,
    marginBottom: spacing[24],
    borderLeftWidth: spacing[4],
    borderLeftColor: '#7A9C85',
  },
  sovereigntyTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[12],
    color: '#C8D8C8',
  },
  sovereigntyText: {
    fontSize: 15,
    color: '#B8B8B8',
    lineHeight: 24,
    marginBottom: spacing[12],
  },
  breathingSection: {
    padding: spacing[20],
    backgroundColor: '#252525',
    borderRadius: borderRadius.large,
    marginBottom: spacing[24],
    alignItems: 'center',
    borderLeftWidth: spacing[4],
    borderLeftColor: '#5A7C65',
  },
  breathingTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[16],
    color: '#B8C8B8',
    textAlign: 'center',
  },
  breathingInstructions: {
    fontSize: 15,
    color: '#A8A8A8',
    lineHeight: 24,
    marginBottom: spacing[20],
    textAlign: 'left',
    width: '100%',
  },
  startBreathingButton: {
    backgroundColor: '#5A7C65',
    paddingVertical: typography.bodySmall.size,
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.medium,
    marginTop: spacing[12],
  },
  startBreathingText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#E8F0E8',
  },
  stopBreathingButton: {
    backgroundColor: '#2D5016',
    paddingVertical: typography.bodySmall.size,
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.medium,
    marginTop: spacing[20],
  },
  stopBreathingText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#E8F0E8',
  },
  completionMessage: {
    padding: spacing[20],
    backgroundColor: '#2A3A2D',
    borderRadius: borderRadius.large,
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  completionText: {
    fontSize: 17,
    color: '#C8D8C8',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: typography.fontWeight.medium,
  },
  completeButton: {
    backgroundColor: '#2D5016', // Evening success green from DRD
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginBottom: spacing[24],
  },
  completeButtonText: {
    color: '#E8F0E8',
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
  quoteSection: {
    padding: spacing[16],
    backgroundColor: '#252525',
    borderRadius: borderRadius.medium,
    borderLeftWidth: spacing[4],
    borderLeftColor: '#5A7C65',
    marginBottom: spacing[20],
  },
  quoteText: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: '#A8A8A8',
    lineHeight: 20,
  },
});

export default SleepTransitionScreen;
