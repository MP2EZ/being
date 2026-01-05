/**
 * PRINCIPLE FOCUS SCREEN
 *
 * Daily Stoic principle selection for focused practice.
 * Philosopher-validated (9.7/10) - aligns with Architecture v1.1 (LOCKED).
 *
 * FEAT-45: Migrated to 5-principle framework (2025-10-29)
 * Philosopher verdict: "philosophically elegant, not reductive"
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "Begin the morning by saying to thyself, I shall meet with the
 *   busy-body, the ungrateful..." (Meditations 2:1) - Daily preparation through principles
 * - Epictetus: "Keep before your eyes, day by day, death and exile and all things which
 *   seem terrible." (Enchiridion 21) - Regular contemplation
 * - Seneca: "Begin at once to live, and count each separate day as a separate life."
 *   (Letters 101) - Daily renewal through principle focus
 *
 * 5 Stoic Mindfulness Principles (Consolidated Framework):
 * 1. Aware Presence - Present-moment attention (cognitive + metacognitive + somatic)
 * 2. Radical Acceptance - Amor fati, loving one's fate
 * 3. Sphere Sovereignty - Prohairesis, moral agency, dichotomy of control
 * 4. Virtuous Response - Virtue ethics in action (reappraisal + premeditatio + character)
 * 5. Interconnected Living - Relational ethics, oikeiosis, common good
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md (v1.1 LOCKED)
 * @see /docs/product/stoic-mindfulness/principles/ for detailed principle documentation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList, PrincipleFocusData } from '@/features/practices/types/flows';
import type { StoicPrinciple } from '@/features/practices/types/stoic';
import { FlowBackButton, SkipLink, FlowHeader } from '../../shared/components';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

type Props = StackScreenProps<MorningFlowParamList, 'PrincipleFocus'> & {
  onSave?: (data: PrincipleFocusData) => void;
};

interface PrincipleInfo {
  key: StoicPrinciple;
  title: string;
  description: string;
  integrates: string; // Which legacy principles this consolidates
  source: string;
}

/**
 * 5 Stoic Mindfulness Principles (Philosopher-Validated 9.7/10)
 *
 * FEAT-45: Consolidated from 12 principles to 5 integrative principles.
 * Each principle now integrates multiple legacy practices into a cohesive whole.
 *
 * @see /docs/product/stoic-mindfulness/principles/ for full documentation
 */
const PRINCIPLES: PrincipleInfo[] = [
  {
    key: 'aware_presence',
    title: 'Aware Presence',
    description: 'Be fully here now, observing thoughts as mental events rather than truth, and feeling what\'s happening in your body.',
    integrates: 'Present Perception + Metacognitive Space + Embodied Awareness',
    source: 'Marcus Aurelius, Meditations 2:1',
  },
  {
    key: 'radical_acceptance',
    title: 'Radical Acceptance',
    description: 'This is what\'s happening right now. I may not like it, prefer it, or want it, but it is the reality I face. What do I do from here?',
    integrates: 'Amor Fati (standalone principle)',
    source: 'Marcus Aurelius, Meditations 10:6',
  },
  {
    key: 'sphere_sovereignty',
    title: 'Sphere Sovereignty',
    description: 'Distinguish what you control (your intentions, judgments, character, responses) from what you don\'t (outcomes, others\' choices, externals). Focus energy only within your sphere.',
    integrates: 'Dichotomy of Control + Intention Over Outcome',
    source: 'Epictetus, Enchiridion 1',
  },
  {
    key: 'virtuous_response',
    title: 'Virtuous Response',
    description: 'In every situation, ask "What does wisdom, courage, justice, or temperance require here?" View obstacles as opportunities for practicing virtue.',
    integrates: 'Virtuous Reappraisal + Negative Visualization + Character Cultivation',
    source: 'Marcus Aurelius, Meditations 5:20',
  },
  {
    key: 'interconnected_living',
    title: 'Interconnected Living',
    description: 'Bring full presence to others. Recognize that we\'re all members of one human community. Act for the common good, not just personal benefit.',
    integrates: 'Relational Presence + Interconnected Action + Contemplative Praxis',
    source: 'Marcus Aurelius, Meditations 8:59',
  },
];

const PrincipleFocusScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as PrincipleFocusData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[PrincipleFocusScreen] Restoring data:', {
      principle: initialData.principleKey,
      hasInterpretation: !!initialData.personalInterpretation,
      hasReminder: !!initialData.reminderTime
    });
  }

  const [selectedPrinciple, setSelectedPrinciple] = useState<StoicPrinciple | null>(
    (initialData?.principleKey as StoicPrinciple) || null
  );
  const [personalInterpretation, setPersonalInterpretation] = useState(
    initialData?.personalInterpretation || ''
  );
  // FEAT-139: Reminder feature removed - simplifying flow

  const selectedPrincipleInfo = PRINCIPLES.find(p => p.key === selectedPrinciple);

  const handleContinue = () => {
    if (!selectedPrinciple) {
      return;
    }

    const principleFocusData: PrincipleFocusData = {
      principleKey: selectedPrinciple,
      personalInterpretation: personalInterpretation.trim() || undefined,
      reminderTime: undefined, // FEAT-139: Reminder removed
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(principleFocusData);
    }

    // FEAT-139: Navigate to RelationalClose instead of PhysicalGrounding
    navigation.navigate('RelationalClose' as never);
  };

  const handleSkip = () => {
    // Save empty data when skipping
    const principleFocusData: PrincipleFocusData = {
      principleKey: 'aware_presence', // Default principle when skipping
      personalInterpretation: undefined,
      reminderTime: undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(principleFocusData);
    }

    navigation.navigate('RelationalClose' as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID="principle-focus-screen"
        keyboardShouldPersistTaps="handled"
      >
      {/* Back Button */}
      <FlowBackButton onPress={() => navigation.goBack()} theme="morning" />

      {/* Header - FEAT-139: Simplified pedagogical framing */}
      <FlowHeader
        title="Principle Focus"
        subtitle="Which principle will you practice today?"
        large
      />

      {/* Principles List (Flat - WCAG AA accessible) */}
      <View style={styles.principlesSection}>
        {PRINCIPLES.map((principle, index) => (
          <TouchableOpacity
            key={principle.key}
            style={[
              styles.principleCard,
              selectedPrinciple === principle.key && styles.principleCardSelected,
            ]}
            onPress={() => setSelectedPrinciple(principle.key)}
            testID={`principle-${principle.key}`}
            accessibilityLabel={`Select ${principle.title}`}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedPrinciple === principle.key }}
          >
            <View style={styles.principleHeader}>
              <Text style={styles.principleNumber}>{index + 1}</Text>
              <Text
                style={[
                  styles.principleTitle,
                  selectedPrinciple === principle.key && styles.principleTitleSelected,
                ]}
              >
                {principle.title}
              </Text>
            </View>
            <Text style={styles.principleDescription}>{principle.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Selected Principle Details */}
      {selectedPrincipleInfo && (
        <View style={styles.selectedSection}>
          <Text style={styles.selectedTitle}>Selected Principle</Text>
          <View style={styles.selectedCard}>
            <Text style={styles.selectedPrincipleTitle}>{selectedPrincipleInfo.title}</Text>
            <Text style={styles.selectedPrincipleDescription}>
              {selectedPrincipleInfo.description}
            </Text>
            <Text style={styles.selectedPrincipleSource}>{selectedPrincipleInfo.source}</Text>

            {/* Personal Interpretation */}
            <View style={styles.interpretationSection}>
              <Text style={styles.interpretationLabel}>Personal Interpretation (Optional)</Text>
              <TextInput
                style={styles.interpretationInput}
                value={personalInterpretation}
                onChangeText={setPersonalInterpretation}
                placeholder="How will you apply this principle today?"
                placeholderTextColor={colorSystem.gray[500]}
                testID="personal-interpretation"
                accessibilityLabel="Personal interpretation of principle"
                multiline
              />
            </View>

            {/* FEAT-139: Reminder toggle removed - simplifying flow per UX review */}
          </View>
        </View>
      )}

      {/* Continue Button */}
      <AccessibleButton
        onPress={handleContinue}
        label="Continue"
        variant="primary"
        size="large"
        theme="morning"
        disabled={!selectedPrinciple}
        testID="continue-button"
        accessibilityHint={
          selectedPrinciple
            ? 'Continue to relational close'
            : 'Select a principle to continue'
        }
      />

      {/* Skip Link - FEAT-139 */}
      <SkipLink
        onPress={handleSkip}
        accessibilityLabel="Skip principle focus"
      />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white, // Match other check-in flows
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[20],
    paddingBottom: spacing[40],
  },
  principlesSection: {
    marginBottom: spacing[24],
  },
  principlesHeader: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[16],
    color: colorSystem.base.black,
  },
  principleCard: {
    padding: spacing[16],
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[12],
    borderWidth: 2,
    borderColor: 'transparent',
    // Touch target
    minHeight: 56,
  },
  principleCardSelected: {
    borderColor: colorSystem.themes.morning.primary,
    backgroundColor: colorSystem.themes.morning.background,
  },
  principleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  principleNumber: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.themes.morning.primary,
    marginRight: spacing[12],
    width: spacing[28],
  },
  principleTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    flex: 1,
  },
  principleTitleSelected: {
    color: colorSystem.themes.morning.primary,
  },
  principleDescription: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  selectedSection: {
    marginTop: spacing[20],
    marginBottom: spacing[20],
  },
  selectedTitle: {
    fontSize: typography.title.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[12],
    color: colorSystem.base.black,
  },
  selectedCard: {
    padding: spacing[20],
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.themes.morning.primary,
  },
  selectedPrincipleTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[8],
    color: colorSystem.themes.morning.primary,
  },
  selectedPrincipleDescription: {
    fontSize: typography.bodyRegular.size,
    marginBottom: spacing[8],
    color: colorSystem.base.black,
  },
  selectedPrincipleSource: {
    fontSize: typography.bodySmall.size,
    fontStyle: 'italic',
    color: colorSystem.gray[600],
    marginBottom: spacing[16],
  },
  interpretationSection: {
    marginTop: spacing[16],
  },
  interpretationLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[8],
    color: colorSystem.base.black,
  },
  interpretationInput: {
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.small,
    padding: spacing[12],
    fontSize: typography.bodySmall.size,
    backgroundColor: colorSystem.base.white,
    minHeight: 60,
    color: colorSystem.base.black,
  },
  reminderSection: {
    marginTop: spacing[16],
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderLabel: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.base.black,
  },
  timeInput: {
    marginTop: spacing[12],
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.small,
    padding: spacing[12],
    fontSize: typography.bodySmall.size,
    backgroundColor: colorSystem.base.white,
    color: colorSystem.base.black,
  },
});

export default PrincipleFocusScreen;
