/**
 * EmotionsScreen - Step 2 of Morning Check-in
 * Emotion awareness using EmotionGrid component
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmotionGrid, StepsIndicator } from '../../components/checkin';
import { Button } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing } from '../../constants/colors';

interface EmotionsScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const EmotionsScreen: React.FC<EmotionsScreenProps> = ({
  onNext,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(
    currentCheckIn?.data?.emotions || []
  );

  const handleNext = () => {
    updateCurrentCheckIn({ emotions: selectedEmotions });
    onNext();
  };

  const handleSelectionChange = (emotions: string[]) => {
    setSelectedEmotions(emotions);
  };

  const hasSelection = selectedEmotions.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={6}
          currentStep={1}
          theme="morning"
        />
        
        <Text style={styles.title}>How are you feeling?</Text>
        <Text style={styles.subtitle}>
          Notice your emotional state without judgment
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <EmotionGrid
          selected={selectedEmotions}
          onSelectionChange={handleSelectionChange}
          theme="morning"
          multiSelect={true}
          columns={3}
        />

        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>Remember:</Text>
          <Text style={styles.guidanceText}>
            • All emotions are valid and temporary{'\n'}
            • You can select multiple emotions{'\n'}
            • Notice feelings without trying to change them{'\n'}
            • This is just awareness, not analysis
          </Text>
        </View>

        {hasSelection && (
          <View style={styles.reflection}>
            <Text style={styles.reflectionTitle}>Your current emotions:</Text>
            <Text style={styles.reflectionText}>
              {selectedEmotions.length === 1 
                ? 'You\'re feeling a single, clear emotion this morning.'
                : `You\'re experiencing ${selectedEmotions.length} different emotions this morning. This is completely normal.`
              }
            </Text>
          </View>
        )}
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
          disabled={!hasSelection}
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
  guidance: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colorSystem.base.white,
    borderRadius: 12,
    marginBottom: spacing.md,
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
  reflection: {
    padding: spacing.md,
    backgroundColor: colorSystem.themes.morning.light,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  reflectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  reflectionText: {
    fontSize: 14,
    color: colorSystem.gray[700],
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

export default EmotionsScreen;