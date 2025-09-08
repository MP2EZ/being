/**
 * ThoughtsScreen - Step 3 of Morning Check-in
 * Thought awareness and acknowledgment using ThoughtBubbles
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThoughtBubbles, StepsIndicator } from '../../components/checkin';
import { Button } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing } from '../../constants/colors';

interface ThoughtsScreenProps {
  onNext: () => void;
  onBack: () => void;
}

// Common morning thoughts for users to acknowledge
const MORNING_THOUGHTS = [
  "I have so much to do today",
  "I don't feel ready",
  "What if something goes wrong?",
  "I'm already behind schedule",
  "I need to be perfect today",
  "Everyone is counting on me"
];

export const ThoughtsScreen: React.FC<ThoughtsScreenProps> = ({
  onNext,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  const [acknowledgedThoughts, setAcknowledgedThoughts] = useState<string[]>(
    currentCheckIn?.data?.thoughts || []
  );
  
  // Track which thoughts have been acknowledged in this session
  const [sessionAcknowledged, setSessionAcknowledged] = useState<string[]>([]);

  useEffect(() => {
    // Initialize with any previously acknowledged thoughts
    setSessionAcknowledged(acknowledgedThoughts);
  }, []);

  const handleThoughtAcknowledge = (thought: string) => {
    const newAcknowledged = sessionAcknowledged.includes(thought)
      ? sessionAcknowledged.filter(t => t !== thought)
      : [...sessionAcknowledged, thought];
    
    setSessionAcknowledged(newAcknowledged);
    setAcknowledgedThoughts(newAcknowledged);
  };

  const handleNext = () => {
    updateCurrentCheckIn({ thoughts: acknowledgedThoughts });
    onNext();
  };

  const allAcknowledged = sessionAcknowledged.length === MORNING_THOUGHTS.length;
  const progress = sessionAcknowledged.length / MORNING_THOUGHTS.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={6}
          currentStep={2}
          theme="morning"
        />
        
        <Text style={styles.title}>Notice Your Thoughts</Text>
        <Text style={styles.subtitle}>
          Acknowledge thoughts without getting caught up in them
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ThoughtBubbles
          thoughts={MORNING_THOUGHTS}
          acknowledgedThoughts={sessionAcknowledged}
          onAcknowledge={handleThoughtAcknowledge}
          theme="morning"
        />

        {progress > 0.3 && (
          <View style={[
            styles.progressCard,
            { opacity: Math.min(progress, 1) }
          ]}>
            <Text style={styles.progressTitle}>
              {allAcknowledged 
                ? "Excellent awareness!" 
                : "You're doing great!"
              }
            </Text>
            <Text style={styles.progressText}>
              {allAcknowledged
                ? "You've acknowledged all the thoughts. Notice how they feel less overwhelming when you don't resist them."
                : `You've acknowledged ${sessionAcknowledged.length} thoughts. Each acknowledgment helps you step back from automatic thinking patterns.`
              }
            </Text>
          </View>
        )}

        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>Mindful observation:</Text>
          <Text style={styles.guidanceText}>
            • Thoughts are like clouds passing in the sky{'\n'}
            • You don't need to believe or act on every thought{'\n'}
            • Acknowledging thoughts reduces their emotional impact{'\n'}
            • This practice builds mental flexibility
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          variant="outline"
          onPress={onBack}
          fullWidth={false}
          style={styles.backButton}
        >
          Back
        </Button>
        
        <Button
          theme="morning"
          onPress={handleNext}
          style={styles.nextButton}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.morning.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  progressCard: {
    padding: spacing.md,
    backgroundColor: colorSystem.base.white,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.themes.morning.primary,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.themes.morning.primary,
    marginBottom: spacing.xs,
  },
  progressText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  guidance: {
    padding: spacing.md,
    backgroundColor: colorSystem.base.white,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.themes.morning.primary,
    marginBottom: spacing.sm,
  },
  guidanceText: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});

export default ThoughtsScreen;