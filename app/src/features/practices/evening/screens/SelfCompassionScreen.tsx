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
  Modal,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { EveningFlowParamList, SelfCompassionData } from '@/features/practices/types/flows';
import { spacing, borderRadius, typography } from '@/core/theme';

type SelfCompassionScreenNavigationProp = StackNavigationProp<
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

const EVENING_COLOR = '#4A7C59';

const SelfCompassionScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as SelfCompassionData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[SelfCompassionScreen] Restoring data:', {
      hasReflection: !!initialData.reflection
    });
  }

  const [reflection, setReflection] = useState(initialData?.reflection || '');
  const [showSkipModal, setShowSkipModal] = useState(false);

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
          onPress={() => {
            if (!reflection.trim()) {
              // User trying to skip without completing
              setShowSkipModal(true);
            } else {
              // User has completed, allow normal back navigation
              navigation.goBack();
            }
          }}
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

      {/* Skip Prevention Modal */}
      <Modal
        visible={showSkipModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSkipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💚 One More Moment</Text>
            <Text style={styles.modalMessage}>
              Self-compassion is a critical part of healthy Stoic practice. Without it,
              self-examination can become harsh and counterproductive.
            </Text>
            <Text style={styles.modalMessage}>
              Take a breath. What would you say to a dear friend who had your day?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalPrimaryButton}
                onPress={() => setShowSkipModal(false)}
                accessibilityLabel="Stay and complete self-compassion"
                accessibilityRole="button"
              >
                <Text style={styles.modalPrimaryButtonText}>Take a Breath</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setShowSkipModal(false);
                  navigation.goBack();
                }}
                accessibilityLabel="Leave anyway"
                accessibilityRole="button"
              >
                <Text style={styles.modalSecondaryButtonText}>Leave Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: spacing[20],
    paddingTop: 60,
  },
  backButton: {
    marginRight: spacing[16],
  },
  backButtonText: {
    fontSize: typography.headline2.size,
    color: EVENING_COLOR,
  },
  title: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#2C3E50',
    flex: 1,
  },
  quoteContainer: {
    backgroundColor: '#F0EDE6',
    padding: spacing[20],
    marginHorizontal: spacing[20],
    marginBottom: spacing[24],
    borderRadius: borderRadius.large,
    borderLeftWidth: spacing[4],
    borderLeftColor: EVENING_COLOR,
  },
  quote: {
    fontSize: typography.bodyRegular.size,
    fontStyle: 'italic',
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: spacing[8],
  },
  quoteAuthor: {
    fontSize: typography.bodySmall.size,
    color: '#7F8C8D',
    textAlign: 'right',
    marginBottom: spacing[8],
  },
  quoteNote: {
    fontSize: typography.bodySmall.size,
    color: EVENING_COLOR,
    textAlign: 'right',
    fontWeight: typography.fontWeight.semibold,
    fontStyle: 'italic',
  },
  explanationContainer: {
    backgroundColor: '#F0F5F1',
    padding: spacing[20],
    marginHorizontal: spacing[20],
    marginBottom: spacing[24],
    borderRadius: borderRadius.large,
    borderWidth: 2,
    borderColor: '#D5E8D5',
  },
  explanationTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#2C3E50',
    marginBottom: spacing[12],
  },
  explanationText: {
    fontSize: 15,
    color: '#34495E',
    lineHeight: 22,
    marginBottom: spacing[12],
  },
  section: {
    paddingHorizontal: spacing[20],
    marginBottom: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#2C3E50',
    marginBottom: spacing[4],
  },
  sectionSubtitle: {
    fontSize: typography.bodySmall.size,
    color: '#7F8C8D',
    marginBottom: spacing[8],
  },
  helperText: {
    fontSize: typography.bodySmall.size,
    color: '#7F8C8D',
    marginBottom: spacing[12],
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: borderRadius.large,
    padding: spacing[16],
    fontSize: typography.bodyRegular.size,
    color: '#2C3E50',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  promptsContainer: {
    backgroundColor: '#F0F5F1',
    padding: spacing[20],
    marginHorizontal: spacing[20],
    marginBottom: spacing[24],
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: '#C5E0C5',
  },
  promptsTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: '#2C3E50',
    marginBottom: spacing[12],
  },
  promptItem: {
    fontSize: typography.bodySmall.size,
    color: '#34495E',
    lineHeight: 22,
    marginBottom: 6,
  },
  completeButton: {
    backgroundColor: EVENING_COLOR,
    padding: spacing[24],
    borderRadius: borderRadius.large,
    marginHorizontal: spacing[20],
    marginVertical: spacing[32],
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#BDB9B4',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[20],
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing[24],
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: spacing[4] },
    shadowOpacity: 0.3,
    shadowRadius: spacing[8],
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    color: EVENING_COLOR,
    marginBottom: spacing[16],
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: typography.bodyRegular.size,
    color: '#2C3E50',
    lineHeight: 24,
    marginBottom: spacing[16],
    textAlign: 'center',
  },
  modalButtons: {
    marginTop: spacing[8],
  },
  modalPrimaryButton: {
    backgroundColor: EVENING_COLOR,
    paddingVertical: typography.bodySmall.size,
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.large,
    marginBottom: spacing[12],
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
  modalSecondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: '#7F8C8D',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
  },
});

export default SelfCompassionScreen;
