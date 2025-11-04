/**
 * MORNING COMPLETION SCREEN
 *
 * Summary and completion screen for Stoic morning flow.
 * Displays completed practices and saves flow data.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious privilege
 *   it is to be alive – to breathe, to think, to enjoy, to love." (Meditations 1:17)
 * - Seneca: "Begin at once to live" (Letters 101) - Daily renewal complete
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
import type { MorningFlowParamList, StoicMorningFlowData } from '../../../types/flows';
import { SessionStorageService } from '../../../services/session/SessionStorageService';

type Props = NativeStackScreenProps<MorningFlowParamList, 'MorningCompletion'> & {
  onSave?: (data: StoicMorningFlowData) => void;
};

const COMPLETED_PRACTICES = [
  { icon: '🙏', name: 'Gratitude', description: 'Three things to be grateful for' },
  { icon: '🎯', name: 'Intention', description: 'Set your direction for the day' },
  { icon: '🛡️', name: 'Preparation', description: 'Anticipated obstacles with virtue' },
  { icon: '💎', name: 'Principle Focus', description: 'Chose a guiding principle' },
  { icon: '🫁', name: 'Physical Grounding', description: 'Connected breath and body' },
];

const MorningCompletionScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  const { flowData, startTime } = route.params || {};

  // Auto-complete after 2 seconds
  useEffect(() => {
    const timer = setTimeout(async () => {
      await handleFinish();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleFinish = async () => {
    const timeSpent = startTime
      ? Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
      : 0;

    const completeData: StoicMorningFlowData = {
      ...flowData,
      completedAt: new Date(),
      timeSpentSeconds: timeSpent,
      flowVersion: 'stoic_v1',
    };

    // FEAT-23: Clear session on completion
    try {
      await SessionStorageService.clearSession('morning');
      console.log('[MorningCompletion] Session cleared on flow completion');
    } catch (error) {
      console.error('[MorningCompletion] Failed to clear session:', error);
    }

    if (onSave) {
      onSave(completeData);
    }
    // Navigation handled by onComplete callback in CleanRootNavigator
  };

  return (
    <ScrollView style={styles.container} testID="morning-completion-screen">
      {/* Completion Header */}
      <View style={styles.header}>
        <Text style={styles.completionIcon}>✨</Text>
        <Text style={styles.title}>Morning Practice Complete</Text>
        <Text style={styles.subtitle}>Well done</Text>
      </View>

      {/* Completion Message */}
      <View style={styles.messageSection}>
        <Text style={styles.messageText}>
          You've set your intention, grounded your practice, and prepared your mind for the day ahead. This is living virtuously.
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
        onPress={handleFinish}
        accessibilityRole="button"
        accessibilityLabel="Continue to home"
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      {/* Stoic Quote */}
      <View style={styles.quoteSection}>
        <Text style={styles.quoteText}>
          "When you arise in the morning, think of what a precious privilege it is to be alive—to breathe, to think, to enjoy, to love." — Marcus Aurelius
        </Text>
        <Text style={styles.quoteSubtext}>
          Begin the day with presence
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
    color: '#FF9F43',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  messageSection: {
    backgroundColor: '#FFF8F0',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9F43',
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
    marginBottom: 2,
  },
  practiceDescription: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    fontSize: 24,
    color: '#FF9F43',
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#FF9F43',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF9F43',
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
    borderLeftColor: '#FF9F43',
    marginBottom: 40,
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  quoteSubtext: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default MorningCompletionScreen;
