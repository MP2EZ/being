/**
 * QuickEmotionsScreen - Step 1 of Midday Reset
 * Quick emotion check-in for current state
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmotionGrid, StepsIndicator } from '../../components/checkin';
import { Button } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing } from '../../constants/colors';

interface QuickEmotionsScreenProps {
  onNext: () => void;
  onBack?: () => void;
}

export const QuickEmotionsScreen: React.FC<QuickEmotionsScreenProps> = ({
  onNext,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(
    (currentCheckIn as any)?.data?.currentEmotions || []
  );

  const handleNext = () => {
    updateCurrentCheckIn({ currentEmotions: selectedEmotions });
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
          totalSteps={3}
          currentStep={0}
          theme="midday"
        />
        
        <Text style={styles.title}>Midday Reset</Text>
        <Text style={styles.subtitle}>
          How are you feeling right now?
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <EmotionGrid
          selected={selectedEmotions}
          onSelectionChange={handleSelectionChange}
          theme="midday"
          multiSelect={true}
          columns={3}
        />

        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>Midday pause:</Text>
          <Text style={styles.guidanceText}>
            • Take a moment to check in with yourself{'\n'}
            • Notice any shift in emotions since this morning{'\n'}
            • This awareness helps you adjust your approach{'\n'}
            • You'll have a chance to reset and refocus next
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {onBack && (
          <Button
            variant="outline"
            onPress={onBack}
            fullWidth={false}
            style={styles.backButton}
          >
            Back
          </Button>
        )}
        
        <Button
          theme="midday"
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
  guidance: {
    padding: spacing.md,
    backgroundColor: colorSystem.base.white,
    borderRadius: 12,
    marginTop: spacing.lg,
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
  nextButton: {
    flex: 2,
  },
});

export default QuickEmotionsScreen;