/**
 * SENECA QUESTIONS SCREEN - DRD v2.0.0
 *
 * Seneca's three evening examination questions.
 * OPTIONAL practice (can be skipped).
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * Classical Stoic Practice:
 * - Seneca: "What infirmity have I mastered today? What passions opposed? What
 *   temptation resisted? In what respect am I better?" (Letters 28:10)
 * - Marcus Aurelius: "At evening, ask yourself: did I master myself today? Did
 *   I progress in character?" (Meditations 5:1)
 *
 * Purpose: Seneca's evening examination focuses on growth and progress. These
 * three questions guide daily self-improvement and virtue development:
 *
 * 1. What vice did I resist today? - Recognizing moments of self-control
 * 2. What habit did I improve today? - Acknowledging incremental progress
 * 3. How am I better today than yesterday? - Celebrating character growth
 *
 * These are the classical Stoic examination questions - not customizable, as
 * they represent centuries of Stoic wisdom about self-improvement.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow, Screen 2)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { EveningFlowParamList, SenecaQuestionsData } from '../../../types/flows';

type Props = NativeStackScreenProps<EveningFlowParamList, 'SenecaQuestions'> & {
  onSave?: (data: SenecaQuestionsData) => void;
};

const SenecaQuestionsScreen: React.FC<Props> = ({ navigation, onSave }) => {
  const [whatViceDidIResist, setWhatViceDidIResist] = useState('');
  const [whatHabitDidIImprove, setWhatHabitDidIImprove] = useState('');
  const [howAmIBetterToday, setHowAmIBetterToday] = useState('');

  // All fields optional (can submit with some answers or skip entirely)
  const hasAnyAnswer =
    whatViceDidIResist.trim().length > 0 ||
    whatHabitDidIImprove.trim().length > 0 ||
    howAmIBetterToday.trim().length > 0;

  const handleContinue = () => {
    if (hasAnyAnswer) {
      const senecaData: SenecaQuestionsData = {
        whatViceDidIResist: whatViceDidIResist.trim(),
        whatHabitDidIImprove: whatHabitDidIImprove.trim(),
        howAmIBetterToday: howAmIBetterToday.trim(),
        timestamp: new Date(),
      };

      if (onSave) {
        onSave(senecaData);
      }
    }
    navigation.navigate('Celebration');
  };

  const handleSkip = () => {
    navigation.navigate('Celebration');
  };

  return (
    <ScrollView style={styles.container} testID="seneca-questions-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="back-button"
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Seneca's Questions</Text>
        <Text style={styles.subtitle}>Three questions for evening reflection (Optional)</Text>
      </View>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "What infirmity have I mastered today? What passions opposed? What temptation resisted? In what respect am I better?" — Seneca
        </Text>
        <Text style={styles.quoteSubtext}>
          Daily progress in virtue
        </Text>
      </View>

      {/* Question 1: Vice Resisted */}
      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>1</Text>
          <Text style={styles.questionText}>What vice did I resist today?</Text>
        </View>
        <Text style={styles.questionHint}>
          A temptation you overcame, an impulse you controlled, a negative pattern you avoided
        </Text>
        <TextInput
          style={styles.textInput}
          value={whatViceDidIResist}
          onChangeText={setWhatViceDidIResist}
          placeholder="e.g., Resisted the urge to interrupt others"
          multiline
          numberOfLines={3}
          testID="vice-input"
          accessibilityLabel="What vice did I resist today"
        />
      </View>

      {/* Question 2: Habit Improved */}
      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>2</Text>
          <Text style={styles.questionText}>What habit did I improve today?</Text>
        </View>
        <Text style={styles.questionHint}>
          A positive practice you maintained or strengthened, progress in character
        </Text>
        <TextInput
          style={styles.textInput}
          value={whatHabitDidIImprove}
          onChangeText={setWhatHabitDidIImprove}
          placeholder="e.g., Listened more carefully to my partner"
          multiline
          numberOfLines={3}
          testID="habit-input"
          accessibilityLabel="What habit did I improve today"
        />
      </View>

      {/* Question 3: How Better */}
      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>3</Text>
          <Text style={styles.questionText}>How am I better today than yesterday?</Text>
        </View>
        <Text style={styles.questionHint}>
          Any growth in wisdom, courage, justice, or temperance - however small
        </Text>
        <TextInput
          style={styles.textInput}
          value={howAmIBetterToday}
          onChangeText={setHowAmIBetterToday}
          placeholder="e.g., More present with my children"
          multiline
          numberOfLines={3}
          testID="better-input"
          accessibilityLabel="How am I better today than yesterday"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          accessibilityLabel="Continue to celebration"
          accessibilityRole="button"
        >
          <Text style={styles.continueButtonText}>
            {hasAnyAnswer ? 'Continue' : 'Skip for Now'}
          </Text>
        </TouchableOpacity>

        {hasAnyAnswer && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            testID="skip-button"
            accessibilityLabel="Skip Seneca's questions"
            accessibilityRole="button"
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 40,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 32,
    color: '#8B4789',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#8B4789',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  quoteSection: {
    padding: 16,
    backgroundColor: '#f9f3f9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4789',
    marginBottom: 32,
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 22,
    marginBottom: 4,
  },
  quoteSubtext: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  questionCard: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4789',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B4789',
    marginRight: 12,
    width: 32,
  },
  questionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    lineHeight: 24,
  },
  questionHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    marginTop: 12,
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: '#8B4789',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8B4789',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8B4789',
  },
  skipButtonText: {
    color: '#8B4789',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SenecaQuestionsScreen;
