/**
 * SleepPreparationScreen - Step 4 of Evening Reflection (Final)
 * Set intentions for rest and prepare mind for peaceful sleep
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsIndicator } from '../../components/checkin';
import { Button, TextArea, MultiSelect } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface SleepPreparationScreenProps {
  onComplete?: () => void;
  onBack: () => void;
}

const SLEEP_INTENTIONS = [
  'Let go of today\'s worries',
  'Rest deeply and peacefully',
  'Wake up refreshed',
  'Trust in tomorrow',
  'Release control',
  'Feel grateful',
  'Embrace stillness',
  'Heal and restore'
];

export const SleepPreparationScreen: React.FC<SleepPreparationScreenProps> = ({
  onComplete,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  
  const [sleepIntentions, setSleepIntentions] = useState<string[]>(
    currentCheckIn?.data?.sleepIntentions || []
  );
  const [tomorrowFocus, setTomorrowFocus] = useState(
    currentCheckIn?.data?.tomorrowFocus || ''
  );
  const [lettingGo, setLettingGo] = useState(
    currentCheckIn?.data?.lettingGo || ''
  );

  const handleComplete = () => {
    updateCurrentCheckIn({
      sleepIntentions: sleepIntentions.length > 0 ? sleepIntentions : undefined,
      tomorrowFocus: tomorrowFocus.trim() || undefined,
      lettingGo: lettingGo.trim() || undefined
    });
    onComplete?.();
  };

  const hasContent = sleepIntentions.length > 0 || tomorrowFocus.trim().length > 0 || lettingGo.trim().length > 0;

  const getTimeGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 21) {
      return "It's time to prepare your mind and body for rest.";
    }
    if (currentHour >= 18) {
      return "As evening settles, it's good to prepare for peaceful rest.";
    }
    return "Taking time now to set intentions for rest will serve you well tonight.";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StepsIndicator 
        currentStep={4} 
        totalSteps={4} 
        theme="evening"
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sleep Preparation</Text>
            <Text style={styles.subtitle}>
              {getTimeGreeting()}
            </Text>
          </View>

          {/* Sleep Intentions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What intentions do you set for your rest?</Text>
            <Text style={styles.sectionDescription}>
              Choose intentions that will guide your mind toward peaceful sleep.
            </Text>
            <MultiSelect
              items={SLEEP_INTENTIONS}
              selected={sleepIntentions}
              onChange={setSleepIntentions}
              theme="evening"
            />
          </View>

          {/* Letting Go */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What are you ready to let go of from today?</Text>
            <Text style={styles.sectionDescription}>
              Release what doesn't need to come with you into rest.
            </Text>
            <TextArea
              value={lettingGo}
              onChangeText={setLettingGo}
              placeholder="I'm releasing..."
              maxLength={150}
              theme="evening"
            />
          </View>

          {/* Tomorrow's Focus */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What gentle focus would serve you tomorrow?</Text>
            <Text style={styles.sectionDescription}>
              Not a demand or pressure, but a kind intention to carry forward.
            </Text>
            <TextArea
              value={tomorrowFocus}
              onChangeText={setTomorrowFocus}
              placeholder="Tomorrow I would like to..."
              maxLength={150}
              theme="evening"
            />
          </View>

          {/* Sleep Ritual */}
          <View style={styles.ritual}>
            <Text style={styles.ritualTitle}>Evening Ritual</Text>
            <Text style={styles.ritualText}>
              Before sleep tonight, try this simple practice:
            </Text>
            <View style={styles.ritualSteps}>
              <Text style={styles.ritualStep}>• Take three deep, slow breaths</Text>
              <Text style={styles.ritualStep}>• Feel your body melting into your bed</Text>
              <Text style={styles.ritualStep}>• Repeat: "I have done enough today"</Text>
              <Text style={styles.ritualStep}>• Allow yourself to drift into rest</Text>
            </View>
          </View>

          {/* Mindful Insight */}
          <View style={styles.insight}>
            <Text style={styles.insightText}>
              Sleep is not earned, it is a gift. You deserve rest simply by being human. Sweet dreams.
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
          onPress={handleComplete}
          theme="evening"
          disabled={!hasContent}
          fullWidth={false}
          style={styles.nextButton}
        >
          Complete Evening Reflection
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
  ritual: {
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
  },
  ritualTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.themes.evening.primary,
    marginBottom: spacing.sm,
  },
  ritualText: {
    fontSize: 14,
    color: colorSystem.themes.evening.primary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  ritualSteps: {
    marginLeft: spacing.sm,
  },
  ritualStep: {
    fontSize: 14,
    color: colorSystem.themes.evening.primary,
    lineHeight: 20,
    marginBottom: spacing.xs,
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

export default SleepPreparationScreen;