/**
 * DayReviewScreen - Step 1 of Evening Reflection
 * Review the day's highlights, challenges, and overall emotions
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsIndicator } from '../../components/checkin';
import { Button, TextArea, MultiSelect } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface DayReviewScreenProps {
  onNext: () => void;
  onBack: () => void;
}

const DAY_EMOTIONS = [
  'Peaceful',
  'Content', 
  'Grateful',
  'Accomplished',
  'Challenged',
  'Overwhelmed',
  'Frustrated',
  'Disappointed',
  'Anxious',
  'Sad',
  'Angry',
  'Confused'
];

export const DayReviewScreen: React.FC<DayReviewScreenProps> = ({
  onNext,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  
  const [dayHighlight, setDayHighlight] = useState(
    (currentCheckIn as any)?.data?.dayHighlight || ''
  );
  const [dayChallenge, setDayChallenge] = useState(
    (currentCheckIn as any)?.data?.dayChallenge || ''
  );
  const [dayEmotions, setDayEmotions] = useState<string[]>(
    (currentCheckIn as any)?.data?.dayEmotions || []
  );

  const handleNext = () => {
    updateCurrentCheckIn({
      dayHighlight: dayHighlight.trim() || undefined,
      dayChallenge: dayChallenge.trim() || undefined,
      dayEmotions: dayEmotions.length > 0 ? dayEmotions : undefined
    });
    onNext();
  };

  const getPrompt = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 20) {
      return "As your day comes to a close, take a moment to reflect on what you experienced.";
    }
    return "Take a moment to pause and reflect on your day so far.";
  };

  const hasContent = dayHighlight.trim().length > 0 || dayChallenge.trim().length > 0 || dayEmotions.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StepsIndicator 
        currentStep={1} 
        totalSteps={4} 
        theme="evening"
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Day Review</Text>
            <Text style={styles.subtitle}>
              {getPrompt()}
            </Text>
          </View>

          {/* Day Highlight */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What was a highlight of your day?</Text>
            <Text style={styles.sectionDescription}>
              This could be something you accomplished, enjoyed, or felt good about.
            </Text>
            <TextArea
              value={dayHighlight}
              onChangeText={setDayHighlight}
              placeholder="I felt good when..."
              maxLength={200}
              theme="evening"
            />
          </View>

          {/* Day Challenge */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What was challenging today?</Text>
            <Text style={styles.sectionDescription}>
              Acknowledging difficulties helps us learn and grow.
            </Text>
            <TextArea
              value={dayChallenge}
              onChangeText={setDayChallenge}
              placeholder="Something that was difficult was..."
              maxLength={200}
              theme="evening"
            />
          </View>

          {/* Day Emotions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How are you feeling about your day?</Text>
            <Text style={styles.sectionDescription}>
              Select all emotions that resonate with your day's experience.
            </Text>
            <MultiSelect
              items={DAY_EMOTIONS}
              selected={dayEmotions}
              onChange={setDayEmotions}
              theme="evening"
            />
          </View>

          {/* Mindful Insight */}
          <View style={styles.insight}>
            <Text style={styles.insightText}>
              Remember: Each day brings both joys and challenges. Both are part of being human and both offer opportunities for growth.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <Button
          variant="outline"
          onPress={onBack}
          theme="evening"
          fullWidth={false}
          style={styles.backButton}
        >
          Back
        </Button>
        
        <Button
          onPress={handleNext}
          theme="evening"
          disabled={!hasContent}
          fullWidth={false}
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
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colorSystem.themes.evening.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[600],
    lineHeight: 24,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 14,
    color: colorSystem.gray[600],
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  insight: {
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.md,
  },
  insightText: {
    fontSize: 14,
    color: colorSystem.themes.evening.primary,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colorSystem.base.white,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});

export default DayReviewScreen;