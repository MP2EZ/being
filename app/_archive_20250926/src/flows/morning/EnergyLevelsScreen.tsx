/**
 * EnergyLevelsScreen - Step 4 of Morning Check-in
 * Sleep quality, energy level, and anxiety level assessment
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsIndicator } from '../../components/checkin';
import { Button, Slider } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing } from '../../constants/colors';

interface EnergyLevelsScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const EnergyLevelsScreen: React.FC<EnergyLevelsScreenProps> = ({
  onNext,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  
  const [sleepQuality, setSleepQuality] = useState<number>(
    (currentCheckIn as any)?.data?.sleepQuality || 5
  );
  const [energyLevel, setEnergyLevel] = useState<number>(
    (currentCheckIn as any)?.data?.energyLevel || 5
  );
  const [anxietyLevel, setAnxietyLevel] = useState<number>(
    (currentCheckIn as any)?.data?.anxietyLevel || 5
  );

  const handleNext = () => {
    updateCurrentCheckIn({
      sleepQuality,
      energyLevel,
      anxietyLevel
    });
    onNext();
  };

  const getSleepQualityText = (value: number) => {
    if (value <= 2) return 'Very Poor';
    if (value <= 4) return 'Poor';
    if (value <= 6) return 'Fair';
    if (value <= 8) return 'Good';
    return 'Excellent';
  };

  const getEnergyLevelText = (value: number) => {
    if (value <= 2) return 'Very Low';
    if (value <= 4) return 'Low';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'High';
    return 'Very High';
  };

  const getAnxietyLevelText = (value: number) => {
    if (value <= 2) return 'Very Low';
    if (value <= 4) return 'Low';
    if (value <= 6) return 'Moderate';
    if (value <= 8) return 'High';
    return 'Very High';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={6}
          currentStep={3}
          theme="morning"
        />
        
        <Text style={styles.title}>Energy Assessment</Text>
        <Text style={styles.subtitle}>
          How did you sleep, and how are your energy levels?
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sliderSection}>
          <Slider
            label="Sleep Quality"
            value={sleepQuality}
            onChange={setSleepQuality}
            max={10}
            theme="morning"
            showEmoji={false}
          />
          <Text style={styles.levelText}>
            {getSleepQualityText(sleepQuality)}
          </Text>
        </View>

        <View style={styles.sliderSection}>
          <Slider
            label="Energy Level"
            value={energyLevel}
            onChange={setEnergyLevel}
            max={10}
            theme="morning"
            showEmoji={true}
          />
          <Text style={styles.levelText}>
            {getEnergyLevelText(energyLevel)}
          </Text>
        </View>

        <View style={styles.sliderSection}>
          <Slider
            label="Anxiety Level"
            value={anxietyLevel}
            onChange={setAnxietyLevel}
            max={10}
            theme="morning"
            showEmoji={true}
          />
          <Text style={styles.levelText}>
            {getAnxietyLevelText(anxietyLevel)}
          </Text>
        </View>

        <View style={styles.insight}>
          <Text style={styles.insightTitle}>Quick insight:</Text>
          <Text style={styles.insightText}>
            {sleepQuality >= 7 && energyLevel >= 6
              ? "Great rest leads to good energy! You're well-prepared for the day ahead."
              : sleepQuality <= 4 && energyLevel <= 4
                ? "Poor sleep affects energy. Consider gentle movement or a short nap if possible."
                : anxietyLevel >= 7
                  ? "High anxiety can drain energy. Today's mindfulness practices will be especially helpful."
                  : "Your body is giving you valuable information about what it needs today."
            }
          </Text>
        </View>

        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>Understanding your patterns:</Text>
          <Text style={styles.guidanceText}>
            • Sleep quality affects energy, mood, and decision-making{'\n'}
            • Energy levels naturally fluctuate throughout the day{'\n'}
            • Anxiety can be both cause and effect of low energy{'\n'}
            • Tracking patterns helps you plan your day mindfully
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
  sliderSection: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colorSystem.base.white,
    borderRadius: 12,
  },
  levelText: {
    textAlign: 'center',
    fontSize: 14,
    color: colorSystem.themes.morning.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  insight: {
    padding: spacing.md,
    backgroundColor: colorSystem.themes.morning.light,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  insightText: {
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

export default EnergyLevelsScreen;