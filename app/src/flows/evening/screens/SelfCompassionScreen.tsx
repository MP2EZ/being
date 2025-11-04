/**
 * SELF-COMPASSION SCREEN - DRD v2.0.0
 *
 * REQUIRED screen for preventing harsh Stoicism (cannot be skipped).
 * Philosopher-validated (9.5/10) - CRITICAL for balanced practice.
 *
 * Classical Stoic Practice with Modern Balance:
 * - Marcus Aurelius: "Be tolerant with others and strict with yourself"
 *   (Meditations 10:4) - But NOT harshly strict!
 * - Seneca: "We are more often frightened than hurt; and we suffer more in
 *   imagination than in reality" (Letters 13:4) - Self-compassion prevents
 *   exaggerating our failures
 * - Epictetus: "If a person gave away your body to some passerby, you'd be
 *   furious. Yet you hand over your mind to anyone who comes along, so they
 *   may abuse you, leaving it disturbed and troubled — have you no shame in
 *   that?" (Enchiridion 28) - Treat yourself with respect
 *
 * CRITICAL PURPOSE: Without self-compassion, Stoicism can become harsh and
 * counterproductive. This screen is REQUIRED to maintain philosophical integrity
 * while being psychologically healthy.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 * @see /docs/product/Being. DRD.md (DRD-FLOW-004: Evening Flow, Screen 7)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { EveningFlowParamList, SelfCompassionData } from '../../../types/flows';

type SelfCompassionScreenNavigationProp = NativeStackNavigationProp<
  EveningFlowParamList,
  'SelfCompassion'
>;
type SelfCompassionScreenRouteProp = RouteProp<
  EveningFlowParamList,
  'SelfCompassion'
>;

interface Props {
  navigation: SelfCompassionScreenNavigationProp;
  route: SelfCompassionScreenRouteProp;
  onSave?: (data: SelfCompassionData) => void;
}

const EVENING_COLOR = '#8B4789';

const SelfCompassionScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = route.params?.initialData as SelfCompassionData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[SelfCompassionScreen] Restoring data:', {
      hasReflection: !!initialData.reflection
    });
  }

  const [reflection, setReflection] = useState(initialData?.reflection || '');

  const handleComplete = () => {
    // Validate required field
    if (!reflection.trim()) {
      return;
    }

    const data: SelfCompassionData = {
      reflection: reflection.trim(),
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(data);
    }

    navigation.navigate('SleepTransition');
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Self-Compassion</Text>
      </View>

      {/* Stoic Quote */}
      <View style={styles.quoteContainer}>
        <Text style={styles.quote}>
          "Be tolerant with others and strict with yourself"
        </Text>
        <Text style={styles.quoteAuthor}>— Marcus Aurelius</Text>
        <Text style={styles.quoteNote}>But not harshly strict!</Text>
      </View>

      {/* Importance Explanation */}
      <View style={styles.explanationContainer}>
        <Text style={styles.explanationTitle}>
          Why Self-Compassion Matters
        </Text>
        <Text style={styles.explanationText}>
          The Stoics examined their failures each evening, but without
          self-compassion, this practice can become harsh and counterproductive.
        </Text>
        <Text style={styles.explanationText}>
          True Stoicism balances accountability with kindness. You wouldn't
          berate a friend for struggling - extend the same gentleness to yourself.
        </Text>
        <Text style={styles.explanationText}>
          Growth comes from understanding, not punishment. Self-compassion
          enhances resilience and makes virtue practice sustainable.
        </Text>
      </View>

      {/* Self-Compassion Reflection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Speak to yourself with kindness
        </Text>
        <Text style={styles.sectionSubtitle}>(required)</Text>
        <Text style={styles.helperText}>
          Acknowledge your efforts today. What would you say to a dear friend
          who faced the same challenges?
        </Text>
        <TextInput
          testID="compassion-input"
          style={styles.textInput}
          multiline
          numberOfLines={6}
          placeholder="e.g., I did my best today with the resources I had. Tomorrow is another opportunity to practice virtue. I'm learning and growing, and that's what matters."
          placeholderTextColor="#999"
          value={reflection}
          onChangeText={setReflection}
          accessibilityLabel="Self-compassion reflection"
          accessibilityRole="text"
        />
      </View>

      {/* Prompts */}
      <View style={styles.promptsContainer}>
        <Text style={styles.promptsTitle}>If you're stuck, try:</Text>
        <Text style={styles.promptItem}>
          • "I practiced virtue today, even imperfectly"
        </Text>
        <Text style={styles.promptItem}>
          • "I'm learning and growing, one day at a time"
        </Text>
        <Text style={styles.promptItem}>
          • "Tomorrow is another opportunity to practice"
        </Text>
        <Text style={styles.promptItem}>
          • "I did my best with what I knew and had today"
        </Text>
        <Text style={styles.promptItem}>
          • "Progress, not perfection, is the goal"
        </Text>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        onPress={handleComplete}
        style={[
          styles.completeButton,
          !reflection.trim() && styles.completeButtonDisabled,
        ]}
        disabled={!reflection.trim()}
        accessibilityLabel="Continue to next screen"
        accessibilityRole="button"
      >
        <Text style={styles.completeButtonText}>Continue</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 28,
    color: EVENING_COLOR,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  quoteContainer: {
    backgroundColor: '#F0EDE6',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: EVENING_COLOR,
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'right',
    marginBottom: 8,
  },
  quoteNote: {
    fontSize: 14,
    color: EVENING_COLOR,
    textAlign: 'right',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  explanationContainer: {
    backgroundColor: '#FFF9F5',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFE6D5',
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 15,
    color: '#34495E',
    lineHeight: 22,
    marginBottom: 12,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  promptsContainer: {
    backgroundColor: '#F5F9FF',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5E5FF',
  },
  promptsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  promptItem: {
    fontSize: 14,
    color: '#34495E',
    lineHeight: 22,
    marginBottom: 6,
  },
  completeButton: {
    backgroundColor: EVENING_COLOR,
    padding: 18,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 32,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#BDB9B4',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SelfCompassionScreen;
