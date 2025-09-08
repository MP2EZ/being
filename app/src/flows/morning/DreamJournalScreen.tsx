/**
 * DreamJournalScreen - Step 6 of Morning Check-in (Final)
 * Record and reflect on dreams from the night
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsIndicator } from '../../components/checkin';
import { Button, TextArea } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface DreamJournalScreenProps {
  onComplete?: () => void;
  onBack: () => void;
}

export const DreamJournalScreen: React.FC<DreamJournalScreenProps> = ({
  onComplete,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  
  const [dreams, setDreams] = useState<string>(
    currentCheckIn?.data?.dreams || ''
  );

  const handleComplete = () => {
    updateCurrentCheckIn({
      dreams: dreams.trim() || undefined
    });
    onComplete?.();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={6}
          currentStep={6}
          theme="morning"
        />
        
        <Text style={styles.title}>Dream Journal</Text>
        <Text style={styles.subtitle}>
          Capture and reflect on your dreams from last night
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.dreamSection}>
          <Text style={styles.promptText}>
            Describe any dreams you remember...
          </Text>
          
          <TextArea
            value={dreams}
            onChangeText={setDreams}
            placeholder="I dreamed about..."
            minHeight={120}
            style={styles.textArea}
          />
          
          <View style={styles.dreamInfo}>
            <Text style={styles.dreamInfoTitle}>Why track dreams?</Text>
            <Text style={styles.dreamInfoText}>
              Dreams can reflect your subconscious processing of emotions, experiences, 
              and concerns. Noting patterns over time may provide insights into your 
              mental and emotional state.
            </Text>
          </View>
        </View>

        {dreams.trim().length > 0 && (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>Your morning awareness is complete!</Text>
            <Text style={styles.completionText}>
              You've taken time to connect with your body, emotions, thoughts, energy levels, 
              values, intentions, and dreams. This mindful start will support you throughout the day.
            </Text>
          </View>
        )}

        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>Dream awareness tips:</Text>
          <Text style={styles.guidanceText}>
            • Keep this journal nearby when you wake up{'\n'}
            • Record even fragments or feelings from dreams{'\n'}
            • Notice recurring themes or symbols over time{'\n'}
            • Dreams often process emotions from the previous day{'\n'}
            • It's okay if you don't remember any dreams today
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
          variant="success"
          onPress={handleComplete}
          style={styles.completeButton}
        >
          Complete Check-in
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
  dreamSection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.lg,
  },
  promptText: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.themes.morning.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  textArea: {
    marginBottom: spacing.md,
  },
  dreamInfo: {
    padding: spacing.md,
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
  },
  dreamInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  dreamInfoText: {
    fontSize: 13,
    color: colorSystem.gray[600],
    lineHeight: 18,
  },
  completionCard: {
    padding: spacing.lg,
    backgroundColor: colorSystem.themes.morning.success,
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
  completeButton: {
    flex: 2,
  },
});

export default DreamJournalScreen;