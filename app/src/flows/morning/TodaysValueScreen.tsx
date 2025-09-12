/**
 * TodaysValueScreen - Step 5 of Morning Check-in (Values & Intention)
 * Select one value to focus on for the day and set intention
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsIndicator } from '../../components/checkin';
import { Button, TextArea } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';
import * as Haptics from 'expo-haptics';

interface TodaysValueScreenProps {
  onNext: () => void;
  onBack: () => void;
}

const CORE_VALUES = [
  { id: 'kindness', label: 'Kindness', description: 'Being gentle and compassionate with yourself and others' },
  { id: 'courage', label: 'Courage', description: 'Taking action despite fear or uncertainty' },
  { id: 'authenticity', label: 'Authenticity', description: 'Being true to yourself and your beliefs' },
  { id: 'growth', label: 'Growth', description: 'Learning and developing as a person' },
  { id: 'connection', label: 'Connection', description: 'Building meaningful relationships with others' },
  { id: 'creativity', label: 'Creativity', description: 'Expressing yourself and thinking innovatively' },
  { id: 'peace', label: 'Peace', description: 'Cultivating inner calm and tranquility' },
  { id: 'purpose', label: 'Purpose', description: 'Living with meaning and direction' },
  { id: 'gratitude', label: 'Gratitude', description: 'Appreciating what you have in life' },
  { id: 'resilience', label: 'Resilience', description: 'Bouncing back from challenges with strength' },
];

export const TodaysValueScreen: React.FC<TodaysValueScreenProps> = ({
  onNext,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  const [selectedValue, setSelectedValue] = useState<string>(
    (currentCheckIn as any)?.data?.todayValue || ''
  );
  const [intention, setIntention] = useState<string>(
    (currentCheckIn as any)?.data?.intention || ''
  );

  const handleValueSelect = async (valueId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedValue(valueId);
  };

  const handleNext = () => {
    updateCurrentCheckIn({ 
      todayValue: selectedValue,
      intention: intention.trim()
    });
    onNext();
  };

  const selectedValueData = CORE_VALUES.find(v => v.id === selectedValue);
  const hasSelection = selectedValue !== '';
  const hasIntention = intention.trim().length > 0;
  const canProceed = hasSelection && hasIntention;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={6}
          currentStep={4}
          theme="morning"
        />
        
        <Text style={styles.title}>What Matters Most Today?</Text>
        <Text style={styles.subtitle}>
          Choose one value and set your intention for the day
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.valuesGrid}>
          {CORE_VALUES.map((value) => {
            const isSelected = selectedValue === value.id;
            
            return (
              <TouchableOpacity
                key={value.id}
                style={[
                  styles.valueCard,
                  {
                    backgroundColor: isSelected 
                      ? colorSystem.themes.morning.background 
                      : colorSystem.base.white,
                    borderColor: isSelected 
                      ? colorSystem.themes.morning.primary 
                      : colorSystem.gray[200],
                    borderWidth: isSelected ? 2 : 1,
                  }
                ]}
                onPress={() => handleValueSelect(value.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.valueLabel,
                  {
                    color: isSelected 
                      ? colorSystem.themes.morning.primary 
                      : colorSystem.base.black,
                    fontWeight: isSelected ? '600' : '500',
                  }
                ]}>
                  {value.label}
                </Text>
                <Text style={[
                  styles.valueDescription,
                  {
                    color: isSelected 
                      ? colorSystem.gray[700] 
                      : colorSystem.gray[600],
                  }
                ]}>
                  {value.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {hasSelection && selectedValueData && (
          <View style={styles.selectionCard}>
            <Text style={styles.selectionTitle}>
              Today you're focusing on: {selectedValueData.label}
            </Text>
            <Text style={styles.selectionDescription}>
              {selectedValueData.description}
            </Text>
            <Text style={styles.selectionGuidance}>
              Throughout your day, ask yourself: "How can I honor {selectedValueData.label.toLowerCase()} in this moment?"
            </Text>
          </View>
        )}

        {hasSelection && (
          <View style={styles.intentionSection}>
            <Text style={styles.intentionTitle}>Today I will...</Text>
            <Text style={styles.intentionPrompt}>
              How will you honor {selectedValueData?.label.toLowerCase()} today?
            </Text>
            
            <TextArea
              value={intention}
              onChangeText={setIntention}
              placeholder="Today I will focus on..."
              minHeight={80}
              style={styles.intentionTextArea}
            />
            
            <View style={styles.intentionExamples}>
              <Text style={styles.examplesTitle}>Example intentions:</Text>
              <Text style={styles.examplesText}>
                • "I will approach challenges with curiosity rather than judgment"{"\n"}
                • "I will take three deep breaths before responding to stress"{"\n"}
                • "I will celebrate small victories throughout my day"
              </Text>
            </View>
          </View>
        )}

        {!hasSelection && (
          <View style={styles.guidance}>
            <Text style={styles.guidanceTitle}>Why choose just one value?</Text>
            <Text style={styles.guidanceText}>
              • Focusing on one value creates clarity in decision-making{"\n"}
              • It's easier to remember and apply throughout the day{"\n"}
              • You can rotate through different values over time{"\n"}
              • This practice builds intentional living habits
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
          disabled={!canProceed}
          style={styles.nextButton}
        >
          Next
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
  valuesGrid: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  valueCard: {
    padding: spacing.md,
    borderRadius: borderRadius.large,
    marginBottom: spacing.xs,
  },
  valueLabel: {
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  valueDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectionCard: {
    padding: spacing.lg,
    backgroundColor: colorSystem.themes.morning.primary,
    borderRadius: borderRadius.large,
    marginBottom: spacing.lg,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.white,
    marginBottom: spacing.sm,
  },
  selectionDescription: {
    fontSize: 14,
    color: colorSystem.base.white,
    opacity: 0.9,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  selectionGuidance: {
    fontSize: 14,
    color: colorSystem.base.white,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  intentionSection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.lg,
  },
  intentionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.themes.morning.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  intentionPrompt: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  intentionTextArea: {
    marginBottom: spacing.md,
  },
  intentionExamples: {
    padding: spacing.md,
    backgroundColor: colorSystem.themes.morning.background,
    borderRadius: borderRadius.medium,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  examplesText: {
    fontSize: 13,
    color: colorSystem.gray[600],
    lineHeight: 18,
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

export default TodaysValueScreen;