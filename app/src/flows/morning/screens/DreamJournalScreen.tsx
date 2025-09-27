/**
 * Dream Journal Screen - DRD-FLOW-002 Screen 6
 * Dream reflection with optional, non-pressured therapeutic language
 * Clinical: Optional engagement, supportive prompting, inner world insights
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius } from '../../../constants/colors';
import { MorningFlowParamList } from '../../../types/flows';
import { DreamJournal } from '../../shared/components';

type DreamJournalScreenNavigationProp = StackNavigationProp<MorningFlowParamList, 'DreamJournal'>;

const DreamJournalScreen: React.FC = () => {
  const navigation = useNavigation<DreamJournalScreenNavigationProp>();
  const [hasDream, setHasDream] = useState(false);
  const [dreamContent, setDreamContent] = useState('');

  const handleComplete = () => {
    // This is the final screen in the flow
    // Navigate back to the root or show completion
    navigation.getParent()?.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Instruction */}
        <View style={styles.instructionSection}>
          <Text style={styles.instructionText}>
            Dream Reflection
          </Text>
          <Text style={styles.subInstructionText}>
            If you had any dreams, what do you remember? Dreams can offer insights into our inner world.
          </Text>
        </View>

        {/* Dream Journal Component */}
        <View style={styles.journalSection}>
          <DreamJournal
            dreamContent={dreamContent}
            hasDream={hasDream}
            onDreamContentChange={setDreamContent}
            onHasDreamChange={setHasDream}
            theme="morning"
          />
        </View>

        {/* Completion Summary */}
        <View style={styles.completionSection}>
          <Text style={styles.completionTitle}>
            🌅 Morning Check-In Complete
          </Text>
          <Text style={styles.completionText}>
            You've taken time for mindful awareness this morning. This practice of presence 
            and self-compassion is a gift you give yourself and the world.
          </Text>
          
          <View style={styles.journeyNote}>
            <Text style={styles.journeyText}>
              Remember: Every moment of awareness is valuable, regardless of what you discovered. 
              Your willingness to check in with yourself matters.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.buttonSection}>
        <Pressable
          style={({ pressed }) => [
            styles.completeButton,
            {
              backgroundColor: colorSystem.themes.morning.success, // Darker completion color
              opacity: pressed ? 0.9 : 1,
            }
          ]}
          onPress={handleComplete}
          accessibilityRole="button"
          accessibilityLabel="Complete morning check-in"
          accessibilityHint="Finish your morning check-in and return to home"
        >
          <Text style={styles.completeButtonText}>
            Complete Check-In
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.morning.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  instructionSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subInstructionText: {
    fontSize: 16,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 22,
  },
  journalSection: {
    marginBottom: spacing.xl,
  },
  completionSection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.themes.morning.light,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  completionText: {
    fontSize: 16,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  journeyNote: {
    backgroundColor: colorSystem.themes.morning.light,
    padding: spacing.md,
    borderRadius: borderRadius.small,
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.themes.morning.primary,
  },
  journeyText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colorSystem.themes.morning.background,
  },
  completeButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // WCAG AA touch target
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
});

export default DreamJournalScreen;