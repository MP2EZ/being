/**
 * IntentionScreen - Step 6 of Morning Check-in (Final)
 * Set intention for the day and optional dream journal
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepsIndicator } from '../../components/checkin';
import { Button, TextArea } from '../../components/core';
import { useCheckInStore } from '../../store';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface IntentionScreenProps {
  onComplete?: () => void;
  onBack: () => void;
}

export const IntentionScreen: React.FC<IntentionScreenProps> = ({
  onComplete,
  onBack
}) => {
  const { currentCheckIn, updateCurrentCheckIn } = useCheckInStore();
  
  const [intention, setIntention] = useState<string>(
    currentCheckIn?.data?.intention || ''
  );
  const [dreams, setDreams] = useState<string>(
    currentCheckIn?.data?.dreams || ''
  );
  
  const [showDreamJournal, setShowDreamJournal] = useState(false);

  const handleComplete = () => {
    updateCurrentCheckIn({
      intention,
      dreams: dreams.trim() || undefined
    });
    onComplete?.();
  };

  const hasIntention = intention.trim().length > 0;

  const getIntentionPrompt = () => {
    // Get selected value from current check-in data
    const selectedValue = currentCheckIn?.data?.todayValue;
    if (selectedValue) {
      return `How will you honor ${selectedValue} today?`;
    }
    return "What is your intention for today?";
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <StepsIndicator
          totalSteps={6}
          currentStep={5}
          theme="morning"
        />
        
        <Text style={styles.title}>Set Your Intention</Text>
        <Text style={styles.subtitle}>
          Plant a seed of purpose for your day ahead
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intentionSection}>
          <Text style={styles.promptText}>{getIntentionPrompt()}</Text>
          
          <TextArea
            value={intention}
            onChangeText={setIntention}
            placeholder="Today I will focus on..."
            minHeight={100}
            style={styles.textArea}
          />
          
          <View style={styles.examples}>
            <Text style={styles.examplesTitle}>Example intentions:</Text>
            <Text style={styles.examplesText}>
              • "I will approach challenges with curiosity rather than judgment"
              {'\n'}• "I will take three deep breaths before responding to stress"
              {'\n'}• "I will celebrate small victories throughout my day"
            </Text>
          </View>
        </View>

        {!showDreamJournal && (
          <View style={styles.dreamToggle}>
            <Button
              variant="outline"
              onPress={() => setShowDreamJournal(true)}
              fullWidth={false}
            >
              Add Dream Journal Entry
            </Button>
          </View>
        )}

        {showDreamJournal && (
          <View style={styles.dreamSection}>
            <Text style={styles.sectionTitle}>Dream Journal (Optional)</Text>
            <Text style={styles.dreamPrompt}>
              Did you have any memorable dreams last night?
            </Text>
            
            <TextArea
              value={dreams}
              onChangeText={setDreams}
              placeholder="Describe any dreams you remember..."
              minHeight={80}
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
        )}

        {hasIntention && (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>Your morning awareness is complete!</Text>
            <Text style={styles.completionText}>
              You've taken time to connect with your body, emotions, thoughts, energy levels, 
              values, and intentions. This mindful start will support you throughout the day.
            </Text>
          </View>
        )}

        <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>Carrying intention forward:</Text>
          <Text style={styles.guidanceText}>
            • Set a gentle reminder to check in with your intention mid-day{'\n'}
            • Notice when you're aligned with your intention vs. when you're not{'\n'}
            • Be compassionate if you get off track - simply return to your intention{'\n'}
            • Your evening reflection will revisit how you honored this intention
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
          disabled={!hasIntention}
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
  intentionSection: {
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
  examples: {
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
  dreamToggle: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  dreamSection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  dreamPrompt: {
    fontSize: 14,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
  },
  dreamInfo: {
    padding: spacing.sm,
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    marginTop: spacing.sm,
  },
  dreamInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  dreamInfoText: {
    fontSize: 12,
    color: colorSystem.gray[600],
    lineHeight: 16,
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

export default IntentionScreen;