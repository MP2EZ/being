/**
 * EventsAndNeedsScreen - Step 3 of Midday Reset (Final)
 * Log pleasant/unpleasant events and current needs
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsIndicator } from '../../components/checkin';
import { Button, TextArea, MultiSelect } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface EventsAndNeedsScreenProps {
  onComplete?: () => void;
  onBack: () => void;
}

const CURRENT_NEEDS = [
  'Rest',
  'Movement',
  'Connection',
  'Focus',
  'Creativity',
  'Nourishment',
  'Quiet',
  'Accomplishment'
];

export const EventsAndNeedsScreen: React.FC<EventsAndNeedsScreenProps> = ({
  onComplete,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  
  const [pleasantEvent, setPleasantEvent] = useState<string>(
    currentCheckIn?.data?.pleasantEvent || ''
  );
  const [unpleasantEvent, setUnpleasantEvent] = useState<string>(
    currentCheckIn?.data?.unpleasantEvent || ''
  );
  const [currentNeed, setCurrentNeed] = useState<string[]>(
    currentCheckIn?.data?.currentNeed ? [currentCheckIn.data.currentNeed] : []
  );

  const handleComplete = () => {
    updateCurrentCheckIn({
      pleasantEvent: pleasantEvent.trim() || undefined,
      unpleasantEvent: unpleasantEvent.trim() || undefined,
      currentNeed: currentNeed.length > 0 ? currentNeed[0] : undefined
    });
    onComplete?.();
  };

  const handleNeedChange = (needs: string[]) => {
    // Only allow single selection for current need
    setCurrentNeed(needs.length > 1 ? [needs[needs.length - 1]] : needs);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={3}
          currentStep={2}
          theme="midday"
        />
        
        <Text style={styles.title}>Events & Needs</Text>
        <Text style={styles.subtitle}>
          Reflect on your day so far and identify what you need now
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>One pleasant thing today:</Text>
          <TextArea
            value={pleasantEvent}
            onChangeText={setPleasantEvent}
            placeholder="Something good that happened..."
            minHeight={80}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>One challenging thing today:</Text>
          <TextArea
            value={unpleasantEvent}
            onChangeText={setUnpleasantEvent}
            placeholder="Something difficult or stressful..."
            minHeight={80}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What do you need right now?</Text>
          <MultiSelect
            items={CURRENT_NEEDS}
            selected={currentNeed}
            onChange={handleNeedChange}
            columns={2}
            theme="midday"
          />
        </View>

        <View style={styles.completionCard}>
          <Text style={styles.completionTitle}>Your midday reset is complete!</Text>
          <Text style={styles.completionText}>
            You've checked in with your emotions, reset with breathing, and identified 
            what you need for the rest of your day. Use this awareness to guide your afternoon.
          </Text>
        </View>

        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>Moving forward:</Text>
          <Text style={styles.guidanceText}>
            • Honor the need you identified - even small actions help{'\n'}
            • Remember the pleasant moment when you feel stressed{'\n'}
            • Approach challenges with the calm you've cultivated{'\n'}
            • Your evening reflection will revisit these experiences
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
          theme="midday"
          variant="success"
          onPress={handleComplete}
          style={styles.completeButton}
        >
          Complete Reset
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.midday.background,
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
  section: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.themes.midday.primary,
    marginBottom: spacing.sm,
  },
  completionCard: {
    padding: spacing.lg,
    backgroundColor: colorSystem.themes.midday.success,
    borderRadius: borderRadius.large,
    marginBottom: spacing.lg,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.white,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 14,
    color: colorSystem.base.white,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.9,
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
    color: colorSystem.themes.midday.primary,
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
  completeButton: {
    flex: 2,
  },
});

export default EventsAndNeedsScreen;