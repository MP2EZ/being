/**
 * Thought Observation Screen - DRD-FLOW-002 Screen 3
 * Mindful thought awareness with positive examples per clinical safety
 * Clinical: CRITICAL - Positive thought examples, MBCT non-judgmental awareness
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius } from '../../../constants/colors';
import { MorningFlowParamList } from '../../../types/flows';
import { ThoughtBubbles } from '../../shared/components';

type ThoughtObservationScreenNavigationProp = StackNavigationProp<MorningFlowParamList, 'ThoughtObservation'>;

const ThoughtObservationScreen: React.FC = () => {
  const navigation = useNavigation<ThoughtObservationScreenNavigationProp>();
  const [acknowledgedThoughts, setAcknowledgedThoughts] = useState<string[]>([]);

  const handleThoughtAcknowledge = (thought: string) => {
    setAcknowledgedThoughts(prev => [...prev, thought]);
  };

  const handleContinue = () => {
    navigation.navigate('PhysicalMetrics');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Instruction */}
        <View style={styles.instructionSection}>
          <Text style={styles.instructionText}>
            Notice any thoughts that are here
          </Text>
          <Text style={styles.subInstructionText}>
            Tap any thoughts to acknowledge them with gentle awareness. Notice without judging.
          </Text>
        </View>

        {/* Thought Bubbles Component */}
        <View style={styles.thoughtSection}>
          <ThoughtBubbles
            onThoughtAcknowledge={handleThoughtAcknowledge}
            theme="morning"
          />
        </View>

        {/* Mindful Guidance */}
        <View style={styles.guidanceSection}>
          <Text style={styles.guidanceTitle}>
            🧘 Mindful Awareness
          </Text>
          <Text style={styles.guidanceText}>
            Thoughts are like clouds passing through the sky of awareness. 
            You can notice them without getting caught up in their stories.
          </Text>
        </View>

        {/* Progress Note */}
        {acknowledgedThoughts.length > 0 && (
          <View style={styles.progressSection}>
            <Text style={styles.progressText}>
              Beautiful! You've mindfully acknowledged {acknowledgedThoughts.length} thought{acknowledgedThoughts.length !== 1 ? 's' : ''}.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonSection}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor: colorSystem.themes.morning.primary,
              opacity: pressed ? 0.9 : 1,
            }
          ]}
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue to physical metrics"
          accessibilityHint="Move to the next step of your morning check-in"
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.morning.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  instructionSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subInstructionText: {
    fontSize: 16,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 22,
  },
  thoughtSection: {
    marginBottom: spacing.xl,
    minHeight: 380, // Ensure space for floating bubbles
  },
  guidanceSection: {
    backgroundColor: colorSystem.themes.morning.light,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  guidanceText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    fontStyle: 'italic',
  },
  progressSection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.themes.morning.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colorSystem.themes.morning.background,
  },
  continueButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // WCAG AA touch target
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
});

export default ThoughtObservationScreen;