/**
 * BodyScanScreen - Step 1 of Morning Check-in
 * Body awareness using BodyAreaGrid component
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BodyAreaGrid, StepsIndicator } from '../../components/checkin';
import { Button } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing } from '../../constants/colors';

interface BodyScanScreenProps {
  onNext: () => void;
  onBack?: () => void;
}

export const BodyScanScreen: React.FC<BodyScanScreenProps> = ({
  onNext,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    (currentCheckIn as any)?.data?.bodyAreas || []
  );

  const handleNext = () => {
    updateCurrentCheckIn({ bodyAreas: selectedAreas });
    onNext();
  };

  const handleSelectionChange = (areas: string[]) => {
    setSelectedAreas(areas);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={6}
          currentStep={0}
          theme="morning"
        />
        
        <Text style={styles.title}>Morning Body Scan</Text>
        <Text style={styles.subtitle}>
          Take a moment to notice how your body feels as you start your day
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <BodyAreaGrid
          selected={selectedAreas}
          onSelectionChange={handleSelectionChange}
          theme="morning"
        />

        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>How to do this:</Text>
          <Text style={styles.guidanceText}>
            • Close your eyes and take a deep breath{'\n'}
            • Slowly scan through your body from head to toe{'\n'}
            • Notice any areas of tension, relaxation, or sensation{'\n'}
            • Tap the areas where you feel something notable
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
  guidance: {
    marginTop: spacing.xl,
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

export default BodyScanScreen;