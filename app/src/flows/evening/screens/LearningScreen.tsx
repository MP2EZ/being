/**
 * LEARNING SCREEN - DRD v2.0.0
 *
 * Record react vs respond moments (core Stoic practice).
 * OPTIONAL practice (can be skipped).
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * Classical Stoic Practice:
 * - Epictetus: "It's not things that upset us, but our judgments about things"
 *   (Enchiridion 5) - Between impression and response lies choice
 * - Marcus Aurelius: "You have power over your mind - not outside events. Realize
 *   this, and you will find strength" (Meditations 8:51) - Choosing response
 * - Seneca: "The wise man is not disturbed by insult; the ignorant man is angered
 *   by it" (On Anger 3:25) - Response vs reaction
 *
 * Purpose: Build awareness of react vs respond pattern. Reactions are automatic
 * and emotional. Responses are chosen and intentional. This is core to Stoic
 * emotional regulation and the practice of virtue.
 *
 * React: Automatic, emotional, unconscious (lost the space)
 * Respond: Chosen, intentional, conscious (found the space)
 * Mixed: Started reactive, caught myself, chose response (progress!)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow, Screen 6)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, LearningData } from '../../../types/flows';
import { AccessibleButton } from '../../../components/accessibility/AccessibleButton';
import { AccessibleInput } from '../../../components/accessibility/AccessibleInput';
import { ACCESSIBLE_COLORS, TOUCH_TARGETS, SPACING } from '../../../theme/accessibility';

type Props = StackScreenProps<EveningFlowParamList, 'Lessons'> & {
  onSave?: (data: LearningData) => void;
};

type ResponseType = 'reacted' | 'responded' | 'mixed';

interface LearningMoment {
  situation: string;
  myResponse: ResponseType;
  whatILearned: string;
  whatIllPractice: string;
}

const RESPONSE_TYPES: Array<{
  key: ResponseType;
  label: string;
  icon: string;
  description: string;
  color: string;
}> = [
  {
    key: 'reacted',
    label: 'Reacted',
    icon: '⚡',
    description: 'Automatic, emotional response',
    color: '#d64545',
  },
  {
    key: 'responded',
    label: 'Responded',
    icon: '🧘',
    description: 'Chose my response mindfully',
    color: '#40B5AD',
  },
  {
    key: 'mixed',
    label: 'Mixed',
    icon: '🔄',
    description: 'Started reactive, then recovered',
    color: '#FFB84D',
  },
];

const LearningScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [moments, setMoments] = useState<LearningMoment[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [situation, setSituation] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<ResponseType | null>(null);
  const [whatILearned, setWhatILearned] = useState('');
  const [whatIllPractice, setWhatIllPractice] = useState('');

  const resetForm = () => {
    setSituation('');
    setSelectedResponse(null);
    setWhatILearned('');
    setWhatIllPractice('');
    setIsAdding(false);
  };

  const handleSaveMoment = () => {
    if (
      !situation.trim() ||
      !selectedResponse ||
      !whatILearned.trim() ||
      !whatIllPractice.trim()
    ) {
      return;
    }

    const newMoment: LearningMoment = {
      situation: situation.trim(),
      myResponse: selectedResponse,
      whatILearned: whatILearned.trim(),
      whatIllPractice: whatIllPractice.trim(),
    };

    setMoments([...moments, newMoment]);
    resetForm();
  };

  const handleDeleteMoment = (index: number) => {
    setMoments(moments.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (moments.length > 0) {
      const learningData: LearningData = {
        reactVsRespondMoments: moments,
        timestamp: new Date(),
      };

      if (onSave) {
        onSave(learningData);
      }
    }
    navigation.navigate('SelfCompassion');
  };

  const handleSkip = () => {
    navigation.navigate('SelfCompassion');
  };

  return (
    <ScrollView style={styles.container} testID="learning-screen">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backButtonContainer}>
          <AccessibleButton
            variant="icon"
            size="large"
            onPress={() => navigation.goBack()}
            label="Go back to previous screen"
            icon="←"
            testID="back-button"
          />
        </View>
        <Text style={styles.title} accessibilityRole="header">React vs Respond</Text>
        <Text style={styles.subtitle}>Today's learning moments (Optional)</Text>
      </View>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "It's not things that upset us, but our judgments about things" — Epictetus
        </Text>
        <Text style={styles.quoteSubtext}>
          Between impression and response lies the power to choose
        </Text>
      </View>

      {/* Moment Count */}
      <Text style={styles.countText}>
        {moments.length === 0 && 'No moments yet'}
        {moments.length === 1 && '1 moment'}
        {moments.length > 1 && `${moments.length} moments`}
      </Text>

      {/* Moments List */}
      {moments.map((moment, index) => {
        const responseType = RESPONSE_TYPES.find(r => r.key === moment.myResponse);
        return (
          <View key={index} style={styles.momentCard}>
            <View style={styles.momentHeader}>
              <View style={styles.momentBadge}>
                <Text style={styles.momentIcon}>{responseType?.icon}</Text>
                <Text style={[styles.momentLabel, { color: responseType?.color }]}>
                  {responseType?.label}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteMoment(index)}
                testID={`delete-moment-${index}`}
                accessibilityLabel={`Delete moment ${index + 1}`}
                accessibilityRole="button"
              >
                <Text style={styles.deleteButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.momentSituation}>{moment.situation}</Text>
            <Text style={styles.momentSubLabel}>What I learned:</Text>
            <Text style={styles.momentText}>{moment.whatILearned}</Text>
            <Text style={styles.momentSubLabel}>What I'll practice:</Text>
            <Text style={styles.momentText}>{moment.whatIllPractice}</Text>
          </View>
        );
      })}

      {/* Add Moment Form */}
      {isAdding ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add Learning Moment</Text>

          {/* Situation Input */}
          <AccessibleInput
            label="What happened?"
            value={situation}
            onChangeText={setSituation}
            placeholder="Describe the situation"
            multiline
            numberOfLines={2}
            testID="situation-input"
            required
            containerStyle={styles.inputContainer}
          />

          {/* Response Type Selection */}
          <Text style={styles.formLabel}>How did you respond?</Text>
          <View style={styles.responseGrid}>
            {RESPONSE_TYPES.map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.responseButton,
                  selectedResponse === type.key && {
                    borderColor: type.color,
                    backgroundColor: `${type.color}15`,
                  },
                ]}
                onPress={() => setSelectedResponse(type.key)}
                testID={`response-${type.key}`}
                accessibilityLabel={`Select ${type.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedResponse === type.key }}
              >
                <Text style={styles.responseIcon}>{type.icon}</Text>
                <Text style={styles.responseLabel}>{type.label}</Text>
                <Text style={styles.responseDescription}>{type.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* What I Learned */}
          <AccessibleInput
            label="What did you learn?"
            value={whatILearned}
            onChangeText={setWhatILearned}
            placeholder="What insight emerged from this moment?"
            multiline
            numberOfLines={2}
            testID="learned-input"
            required
            containerStyle={styles.inputContainer}
          />

          {/* What I'll Practice */}
          <AccessibleInput
            label="What will you practice next time?"
            value={whatIllPractice}
            onChangeText={setWhatIllPractice}
            placeholder="Specific action or mindset to practice"
            multiline
            numberOfLines={2}
            testID="practice-input"
            required
            containerStyle={styles.inputContainer}
          />

          {/* Form Actions */}
          <View style={styles.formActions}>
            <View style={styles.formActionButton}>
              <AccessibleButton
                variant="secondary"
                size="medium"
                onPress={resetForm}
                label="Cancel adding moment"
                testID="cancel-button"
              />
            </View>
            <View style={styles.formActionButton}>
              <AccessibleButton
                variant="primary"
                size="medium"
                onPress={handleSaveMoment}
                label="Save moment"
                disabled={
                  !situation.trim() ||
                  !selectedResponse ||
                  !whatILearned.trim() ||
                  !whatIllPractice.trim()
                }
                testID="save-button"
              />
            </View>
          </View>
        </View>
      ) : (
        <AccessibleButton
          variant="tertiary"
          size="large"
          onPress={() => setIsAdding(true)}
          label="Add learning moment"
          testID="add-moment-button"
          style={styles.addButton}
        />
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <AccessibleButton
          variant="primary"
          size="large"
          onPress={handleContinue}
          label={moments.length > 0 ? "Continue to self-compassion" : "Skip to self-compassion"}
          testID="continue-button"
          style={styles.continueButton}
        />
        {moments.length > 0 && (
          <AccessibleButton
            variant="secondary"
            size="large"
            onPress={handleSkip}
            label="Skip to self-compassion"
            testID="skip-button"
            style={styles.skipButton}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
    marginTop: 40,
  },
  backButtonContainer: {
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    color: ACCESSIBLE_COLORS.eveningPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: ACCESSIBLE_COLORS.textSecondary,
  },
  quoteSection: {
    padding: SPACING.md,
    backgroundColor: '#f9f3f9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: ACCESSIBLE_COLORS.eveningPrimary,
    marginBottom: SPACING.xl,
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: ACCESSIBLE_COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.xs,
  },
  quoteSubtext: {
    fontSize: 13,
    color: ACCESSIBLE_COLORS.textHelper,
    fontStyle: 'italic',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCESSIBLE_COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  momentCard: {
    backgroundColor: '#f9f9f9',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: ACCESSIBLE_COLORS.eveningPrimary,
  },
  momentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  momentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  momentIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  momentLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    fontSize: 24,
    color: ACCESSIBLE_COLORS.textHelper,
    padding: SPACING.xs,
    minWidth: TOUCH_TARGETS.minimum,
    minHeight: TOUCH_TARGETS.minimum,
    textAlign: 'center',
  },
  momentSituation: {
    fontSize: 16,
    color: ACCESSIBLE_COLORS.textPrimary,
    marginBottom: SPACING.md,
    lineHeight: 22,
    fontWeight: '500',
  },
  momentSubLabel: {
    fontSize: 12,
    color: ACCESSIBLE_COLORS.textHelper,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  momentText: {
    fontSize: 15,
    color: ACCESSIBLE_COLORS.textSecondary,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#f9f9f9',
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: ACCESSIBLE_COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCESSIBLE_COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  responseGrid: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  responseButton: {
    padding: SPACING.md,
    minHeight: TOUCH_TARGETS.minimum,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: ACCESSIBLE_COLORS.borderDefault,
    alignItems: 'center',
  },
  responseIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  responseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: ACCESSIBLE_COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  responseDescription: {
    fontSize: 13,
    color: ACCESSIBLE_COLORS.textSecondary,
    textAlign: 'center',
  },
  formActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  formActionButton: {
    flex: 1,
  },
  addButton: {
    marginBottom: SPACING.xl,
  },
  actionButtons: {
    marginTop: SPACING.md,
    marginBottom: 40,
  },
  continueButton: {
    marginBottom: SPACING.md,
  },
  skipButton: {
    // No additional styling needed (uses AccessibleButton variant="secondary")
  },
});

export default LearningScreen;
