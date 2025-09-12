/**
 * GratitudeLearningScreen - Step 2 of Evening Reflection  
 * Cultivate gratitude and identify learning from the day
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsIndicator } from '../../components/checkin';
import { Button, TextArea } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface GratitudeLearningScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const GratitudeLearningScreen: React.FC<GratitudeLearningScreenProps> = ({
  onNext,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  
  const [gratitude1, setGratitude1] = useState(
    (currentCheckIn as any)?.data?.gratitude1 || ''
  );
  const [gratitude2, setGratitude2] = useState(
    (currentCheckIn as any)?.data?.gratitude2 || ''
  );
  const [gratitude3, setGratitude3] = useState(
    (currentCheckIn as any)?.data?.gratitude3 || ''
  );
  const [dayLearning, setDayLearning] = useState(
    (currentCheckIn as any)?.data?.dayLearning || ''
  );

  const handleNext = () => {
    updateCurrentCheckIn({
      gratitude1: gratitude1.trim() || undefined,
      gratitude2: gratitude2.trim() || undefined,
      gratitude3: gratitude3.trim() || undefined,
      dayLearning: dayLearning.trim() || undefined
    });
    onNext();
  };

  const hasContent = gratitude1.trim().length > 0 || dayLearning.trim().length > 0;

  const getGratitudeCount = () => {
    let count = 0;
    if (gratitude1.trim().length > 0) count++;
    if (gratitude2.trim().length > 0) count++;
    if (gratitude3.trim().length > 0) count++;
    return count;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StepsIndicator 
        currentStep={2} 
        totalSteps={4} 
        theme="evening"
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Gratitude & Learning</Text>
            <Text style={styles.subtitle}>
              End your day by appreciating the good and acknowledging what you've learned.
            </Text>
          </View>

          {/* Gratitude Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Three things I'm grateful for today ({getGratitudeCount()}/3)
            </Text>
            <Text style={styles.sectionDescription}>
              They can be big or small - what matters is noticing the good in your day.
            </Text>

            <View style={styles.gratitudeItem}>
              <Text style={styles.gratitudeLabel}>1.</Text>
              <TextArea
                value={gratitude1}
                onChangeText={setGratitude1}
                placeholder="I'm grateful for..."
                maxLength={100}
                theme="evening"
                style={styles.gratitudeInput}
              />
            </View>

            {gratitude1.trim().length > 0 && (
              <View style={styles.gratitudeItem}>
                <Text style={styles.gratitudeLabel}>2.</Text>
                <TextArea
                  value={gratitude2}
                  onChangeText={setGratitude2}
                  placeholder="I'm also grateful for..."
                  maxLength={100}
                  theme="evening"
                  style={styles.gratitudeInput}
                />
              </View>
            )}

            {gratitude2.trim().length > 0 && (
              <View style={styles.gratitudeItem}>
                <Text style={styles.gratitudeLabel}>3.</Text>
                <TextArea
                  value={gratitude3}
                  onChangeText={setGratitude3}
                  placeholder="And I'm grateful for..."
                  maxLength={100}
                  theme="evening"
                  style={styles.gratitudeInput}
                />
              </View>
            )}
          </View>

          {/* Learning Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What did I learn about myself today?</Text>
            <Text style={styles.sectionDescription}>
              Every day offers insights - about our patterns, reactions, strengths, or areas for growth.
            </Text>
            <TextArea
              value={dayLearning}
              onChangeText={setDayLearning}
              placeholder="Today I learned that I..."
              maxLength={200}
              theme="evening"
            />
          </View>

          {/* Mindful Insight */}
          <View style={styles.insight}>
            <Text style={styles.insightText}>
              Gratitude and self-awareness are the foundation of emotional well-being. By acknowledging both, you're nurturing your inner wisdom.
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
  gratitudeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  gratitudeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.themes.evening.primary,
    marginRight: spacing.sm,
    marginTop: spacing.sm,
  },
  gratitudeInput: {
    flex: 1,
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

export default GratitudeLearningScreen;