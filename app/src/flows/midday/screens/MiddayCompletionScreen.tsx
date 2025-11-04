/**
 * MIDDAY COMPLETION SCREEN
 *
 * Completion summary for midday Stoic Mindfulness practice.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * Classical Stoic Completion:
 * - Marcus Aurelius: "When you have done well and another has benefited by it, why
 *   do you still look for a third thing on top—credit for the good deed or a favor
 *   in return?" (Meditations 7:73) - Practice is its own reward
 * - Epictetus: "Don't explain your philosophy. Embody it." (Discourses) - Action
 *   matters more than words
 * - Seneca: "Let us balance life's ledger each day... and then begin the next with
 *   renewed purpose." (Letters 18:1) - Daily practice, continuous improvement
 * - Marcus Aurelius: "How satisfying it is to do good work—and then to do more."
 *   (Meditations 5:1) - The cycle continues
 *
 * Purpose: Acknowledge completion without seeking validation. The practice itself
 * is the point. Store progress, then return to living virtuously.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MiddayFlowParamList, StoicMiddayFlowData } from '../../../types/flows';
import { SessionStorageService } from '../../../services/session/SessionStorageService';

type Props = NativeStackScreenProps<MiddayFlowParamList, 'MiddayCompletion'> & {
  onComplete?: () => void;
};

const COMPLETED_PRACTICES = [
  { icon: '🧘', name: 'Current Situation', description: 'Checked in with present moment' },
  { icon: '⚖️', name: 'Control Check', description: 'Applied dichotomy of control' },
  { icon: '🔄', name: 'Reappraisal', description: 'Reframed obstacles as opportunities' },
  { icon: '🎯', name: 'Intention Progress', description: 'Reviewed morning intention' },
  { icon: '🫁', name: 'Embodiment', description: 'Connected breath and body' },
];

const MiddayCompletionScreen: React.FC<Props> = ({ navigation, onComplete }) => {
  // Auto-complete after 2 seconds
  useEffect(() => {
    const timer = setTimeout(async () => {
      // FEAT-23: Clear session on completion
      try {
        await SessionStorageService.clearSession('midday');
        console.log('[MiddayCompletion] Session cleared on flow completion');
      } catch (error) {
        console.error('[MiddayCompletion] Failed to clear session:', error);
      }

      if (onComplete) {
        onComplete();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleContinue = async () => {
    // FEAT-23: Clear session on completion
    try {
      await SessionStorageService.clearSession('midday');
      console.log('[MiddayCompletion] Session cleared on manual completion');
    } catch (error) {
      console.error('[MiddayCompletion] Failed to clear session:', error);
    }

    // Allow manual completion before 2-second timer
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <ScrollView style={styles.container} testID="midday-completion-screen">
      {/* Completion Header */}
      <View style={styles.header}>
        <Text style={styles.completionIcon}>✨</Text>
        <Text style={styles.title}>Midday Complete</Text>
        <Text style={styles.subtitle}>Well done</Text>
      </View>

      {/* Completion Message */}
      <View style={styles.messageSection}>
        <Text style={styles.messageText}>
          You've taken time to pause, reflect, and re-center. This is the practice of virtue in action.
        </Text>
      </View>

      {/* Practices Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Practices Completed</Text>
        {COMPLETED_PRACTICES.map((practice, index) => (
          <View key={index} style={styles.practiceItem}>
            <Text style={styles.practiceIcon}>{practice.icon}</Text>
            <View style={styles.practiceContent}>
              <Text style={styles.practiceName}>{practice.name}</Text>
              <Text style={styles.practiceDescription}>{practice.description}</Text>
            </View>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        ))}
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
        accessibilityRole="button"
        accessibilityLabel="Continue to home"
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "Don't explain your philosophy. Embody it." — Epictetus
        </Text>
        <Text style={styles.quoteSubtext}>
          The practice is its own reward
        </Text>
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
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  completionIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#40B5AD',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  messageSection: {
    backgroundColor: '#f0f8ff',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#40B5AD',
    marginBottom: 32,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  practiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  practiceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  practiceContent: {
    flex: 1,
  },
  practiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  practiceDescription: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    fontSize: 24,
    color: '#40B5AD',
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#40B5AD',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 32,
    shadowColor: '#40B5AD',
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
  quoteSection: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#40B5AD',
    marginBottom: 40,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  quoteSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default MiddayCompletionScreen;
