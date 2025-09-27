/**
 * Evening Tomorrow Preparation Screen
 * CRITICAL CLINICAL SAFETY: Sleep preparation and gentle transition
 * - Bedtime-appropriate intention setting
 * - Self-compassion messaging
 * - Gentle completion affirmation
 * - Sleep transition focus
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import { OverflowSupport, SafetyButton } from '../../shared/components';

interface IntentionOption {
  id: string;
  text: string;
  selected: boolean;
}

interface TomorrowPrepScreenProps {
  onComplete: (sessionData: any) => void;
  onExit: () => void;
}

const INTENTION_OPTIONS: IntentionOption[] = [
  { id: 'rest', text: 'I will rest well tonight', selected: false },
  { id: 'gentle', text: 'I will be gentle with myself', selected: false },
  { id: 'present', text: 'I will stay present to what matters', selected: false },
  { id: 'trust', text: 'I trust my ability to handle what comes', selected: false },
];

const TomorrowPrepScreen: React.FC<TomorrowPrepScreenProps> = ({
  onComplete,
  onExit
}) => {
  const [reminder, setReminder] = useState('');
  const [intentions, setIntentions] = useState<IntentionOption[]>(INTENTION_OPTIONS);
  const [showOverflowSupport, setShowOverflowSupport] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const handleIntentionToggle = (id: string) => {
    setIntentions(prev => 
      prev.map(intention => 
        intention.id === id 
          ? { ...intention, selected: !intention.selected }
          : intention
      )
    );
  };

  const handleComplete = () => {
    setHasCompleted(true);

    // Collect session data
    const sessionData = {
      reminder: reminder.trim(),
      selectedIntentions: selectedIntentions.map(i => ({
        id: i.id,
        text: i.text
      })),
      completedAt: Date.now(),
      screenName: 'TomorrowPrep'
    };

    // Show completion message for 3 seconds, then complete the flow
    setTimeout(() => {
      onComplete(sessionData);
    }, 3000);
  };

  const selectedIntentions = intentions.filter(i => i.selected);
  const canComplete = reminder.trim() || selectedIntentions.length > 0;

  if (hasCompleted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completionContainer}>
          <Text style={styles.completionTitle}>
            🌙 You've honored your day with awareness and kindness
          </Text>
          <Text style={styles.completionMessage}>
            Rest well knowing you are enough, exactly as you are.
          </Text>
          <View style={styles.completionAffirmation}>
            <Text style={styles.affirmationText}>
              Tomorrow is a new opportunity to practice compassion — starting with yourself.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Sleep Preparation Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Prepare for Tomorrow</Text>
            <Text style={styles.subtitle}>
              Set gentle intentions and transition mindfully toward rest
            </Text>
          </View>

          {/* Gentle Reminder Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              🌱 One gentle thing to carry forward
            </Text>
            <Text style={styles.sectionNote}>
              (or nothing at all is perfect too)
            </Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="I am enough as I am"
              placeholderTextColor={colorSystem.gray[500]}
              value={reminder}
              onChangeText={setReminder}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Gentle reminder for tomorrow"
            />
          </View>

          {/* Intention Setting Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              🌌 How would you like to meet tomorrow?
            </Text>
            <Text style={styles.sectionNote}>
              Choose what feels right for you tonight
            </Text>
            
            <View style={styles.intentionsGrid}>
              {intentions.map((intention) => (
                <Pressable
                  key={intention.id}
                  style={[
                    styles.intentionCard,
                    intention.selected && styles.intentionCardSelected
                  ]}
                  onPress={() => handleIntentionToggle(intention.id)}
                  accessibilityRole="button"
                  accessibilityLabel={intention.text}
                  accessibilityState={{ selected: intention.selected }}
                >
                  <View style={styles.intentionContent}>
                    <Text style={[
                      styles.intentionText,
                      intention.selected && styles.intentionTextSelected
                    ]}>
                      {intention.text}
                    </Text>
                    {intention.selected && (
                      <View style={styles.intentionCheckmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Selected Intentions Summary */}
          {selectedIntentions.length > 0 && (
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>Your Intentions for Tomorrow</Text>
              {selectedIntentions.map((intention, index) => (
                <Text key={intention.id} style={styles.summaryItem}>
                  • {intention.text}
                </Text>
              ))}
            </View>
          )}

          {/* Complete Button */}
          <View style={styles.buttonSection}>
            <Pressable
              style={[
                styles.completeButton,
                {
                  backgroundColor: canComplete 
                    ? colorSystem.themes.evening.primary 
                    : colorSystem.gray[300],
                }
              ]}
              onPress={handleComplete}
              disabled={!canComplete}
              accessibilityRole="button"
              accessibilityLabel={canComplete ? "Complete evening reflection" : "Add a reminder or intention to complete"}
            >
              <Text style={[
                styles.completeButtonText,
                {
                  color: canComplete 
                    ? colorSystem.base.white 
                    : colorSystem.gray[500]
                }
              ]}>
                {canComplete ? "Complete with Gratitude" : "Add something to complete"}
              </Text>
            </Pressable>
            
            {/* Safety Button Always Present */}
            <View style={styles.safetyButtonContainer}>
              <SafetyButton onPress={() => setShowOverflowSupport(true)} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Overflow Support Modal */}
      <OverflowSupport
        visible={showOverflowSupport}
        onClose={() => setShowOverflowSupport(false)}
        onBreathingSpace={() => {
          setShowOverflowSupport(false);
          // TODO: Navigate to breathing exercise
        }}
        onSkipToCompletion={handleComplete}
        onCrisisSupport={() => {
          setShowOverflowSupport(false);
          // TODO: Navigate to crisis support
        }}
        triggerReason="difficulty"
        theme="evening"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.evening.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.xl,
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  sectionNote: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: colorSystem.gray[50],
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    minHeight: 80,
  },
  intentionsGrid: {
    gap: spacing.md,
  },
  intentionCard: {
    backgroundColor: colorSystem.gray[50],
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
  },
  intentionCardSelected: {
    backgroundColor: colorSystem.themes.evening.light,
    borderColor: colorSystem.themes.evening.primary,
    borderWidth: 2,
  },
  intentionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intentionText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    flex: 1,
  },
  intentionTextSelected: {
    color: colorSystem.themes.evening.primary,
    fontWeight: '600',
  },
  intentionCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colorSystem.themes.evening.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  checkmarkText: {
    color: colorSystem.base.white,
    fontSize: 12,
    fontWeight: '600',
  },
  summarySection: {
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colorSystem.themes.evening.primary,
  },
  summaryTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryItem: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  buttonSection: {
    gap: spacing.md,
  },
  completeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completeButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    textAlign: 'center',
  },
  safetyButtonContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  // Completion Screen Styles
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  completionTitle: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  completionMessage: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: spacing.xl,
  },
  completionAffirmation: {
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colorSystem.themes.evening.primary,
  },
  affirmationText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
});

export default TomorrowPrepScreen;