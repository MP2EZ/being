/**
 * BodyTensionReleaseScreen - Step 3 of Evening Reflection
 * Identify areas of physical tension and practice release techniques
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsIndicator, BodyAreaGrid } from '../../components/checkin';
import { Button, TextArea } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface BodyTensionReleaseScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export const BodyTensionReleaseScreen: React.FC<BodyTensionReleaseScreenProps> = ({
  onNext,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  
  const [tensionAreas, setTensionAreas] = useState<string[]>(
    currentCheckIn?.data?.tensionAreas || []
  );
  const [releaseNote, setReleaseNote] = useState(
    currentCheckIn?.data?.releaseNote || ''
  );

  const handleNext = () => {
    updateCurrentCheckIn({
      tensionAreas: tensionAreas.length > 0 ? tensionAreas : undefined,
      releaseNote: releaseNote.trim() || undefined
    });
    onNext();
  };

  const hasSelection = tensionAreas.length > 0 || releaseNote.trim().length > 0;

  const getReleaseGuidance = () => {
    if (tensionAreas.length === 0) {
      return "First, scan your body to notice any areas of tension or tightness.";
    }
    
    const areas = tensionAreas.join(', ');
    return `You've noticed tension in: ${areas}. Take a moment to breathe into these areas and allow them to soften.`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StepsIndicator 
        currentStep={3} 
        totalSteps={4} 
        theme="evening"
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Body Tension Release</Text>
            <Text style={styles.subtitle}>
              Notice where you're holding tension from the day and practice letting it go.
            </Text>
          </View>

          {/* Body Areas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where do you notice tension in your body?</Text>
            <Text style={styles.sectionDescription}>
              Tap any areas where you feel tightness, soreness, or stress.
            </Text>
            <BodyAreaGrid
              selected={tensionAreas}
              onSelectionChange={setTensionAreas}
              theme="evening"
            />
          </View>

          {/* Release Guidance */}
          <View style={styles.guidance}>
            <Text style={styles.guidanceText}>
              {getReleaseGuidance()}
            </Text>
            
            {tensionAreas.length > 0 && (
              <View style={styles.breathingGuide}>
                <Text style={styles.breathingTitle}>💨 Quick Release Technique:</Text>
                <Text style={styles.breathingSteps}>
                  1. Take a deep breath in{'\n'}
                  2. Tense the affected area for 5 seconds{'\n'}
                  3. Exhale and completely relax{'\n'}
                  4. Repeat 2-3 times
                </Text>
              </View>
            )}
          </View>

          {/* Release Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How does your body feel after this awareness?</Text>
            <Text style={styles.sectionDescription}>
              Notice any changes or sensations as you bring attention to these areas.
            </Text>
            <TextArea
              value={releaseNote}
              onChangeText={setReleaseNote}
              placeholder="After focusing on these areas, I notice..."
              maxLength={200}
              theme="evening"
            />
          </View>

          {/* Mindful Insight */}
          <View style={styles.insight}>
            <Text style={styles.insightText}>
              🌿 Your body holds the story of your day. By listening to it with kindness, you can release what no longer serves you.
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
        >
          Back
        </Button>
        
        <Button
          onPress={handleNext}
          theme="evening"
          disabled={!hasSelection}
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
  guidance: {
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.xl,
  },
  guidanceText: {
    fontSize: 16,
    color: colorSystem.themes.evening.primary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  breathingGuide: {
    marginTop: spacing.sm,
  },
  breathingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.themes.evening.primary,
    marginBottom: spacing.sm,
  },
  breathingSteps: {
    fontSize: 14,
    color: colorSystem.themes.evening.primary,
    lineHeight: 20,
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
});

export default BodyTensionReleaseScreen;