/**
 * EVENING COMPLETION SCREEN
 *
 * Final screen of evening flow - provides closure and encouragement.
 * Philosopher-validated (9.5/10) - aligns with Architecture v1.0.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "You have power over your mind - not outside events.
 *   Realize this, and you will find strength" (Meditations 4:3)
 * - Seneca: "Each day acquire something that will fortify you against poverty,
 *   against death, indeed against other misfortunes as well; and after you have
 *   run over many thoughts, select one to be thoroughly digested that day"
 *   (Letters 2:1)
 * - Epictetus: "Don't hope that events will turn out the way you want, welcome
 *   events in whichever way they happen: this is the path to peace" (Enchiridion 8)
 *
 * Purpose: Complete the evening examination with encouragement and preparation
 * for tomorrow. Creates closure for today and readiness for tomorrow.
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { EveningFlowParamList } from '../../../types/flows';
import { SessionStorageService } from '../../../services/session/SessionStorageService';

type EveningCompletionScreenNavigationProp = NativeStackNavigationProp<
  EveningFlowParamList,
  'EveningCompletion'
>;
type EveningCompletionScreenRouteProp = RouteProp<
  EveningFlowParamList,
  'EveningCompletion'
>;

interface Props {
  navigation: EveningCompletionScreenNavigationProp;
  route: EveningCompletionScreenRouteProp;
  onComplete?: () => void;
}

const EVENING_COLOR = '#8B4789';

const EveningCompletionScreen: React.FC<Props> = ({ navigation, onComplete }) => {
  // Auto-complete after 2 seconds
  useEffect(() => {
    const timer = setTimeout(async () => {
      // FEAT-23: Clear session on completion
      try {
        await SessionStorageService.clearSession('evening');
        console.log('[EveningCompletion] Session cleared on flow completion');
      } catch (error) {
        console.error('[EveningCompletion] Failed to clear session:', error);
      }

      if (onComplete) {
        onComplete();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleFinish = async () => {
    // FEAT-23: Clear session on completion
    try {
      await SessionStorageService.clearSession('evening');
      console.log('[EveningCompletion] Session cleared on manual completion');
    } catch (error) {
      console.error('[EveningCompletion] Failed to clear session:', error);
    }

    // Allow manual completion before 2-second timer
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Completion Header */}
        <View style={styles.completionHeader}>
          <Text style={styles.completionIcon}>✨</Text>
          <Text style={styles.completionTitle}>Evening Examination Complete</Text>
          <Text style={styles.completionSubtitle}>
            Well done on completing your Stoic practice
          </Text>
        </View>

        {/* Stoic Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quote}>
            "You have power over your mind - not outside events. Realize this, and
            you will find strength"
          </Text>
          <Text style={styles.quoteAuthor}>— Marcus Aurelius</Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>You Completed:</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>📊</Text>
            <Text style={styles.summaryText}>Day review and reflection</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>✅</Text>
            <Text style={styles.summaryText}>Virtue successes and challenges</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>🧠</Text>
            <Text style={styles.summaryText}>React vs respond learning</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>📝</Text>
            <Text style={styles.summaryText}>Seneca's evening questions</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>🙏</Text>
            <Text style={styles.summaryText}>Gratitude practice</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>🌅</Text>
            <Text style={styles.summaryText}>Tomorrow's intention</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>💚</Text>
            <Text style={styles.summaryText}>Self-compassion reflection</Text>
          </View>
        </View>

        {/* Encouragement */}
        <View style={styles.encouragementContainer}>
          <Text style={styles.encouragementTitle}>Keep Growing</Text>
          <Text style={styles.encouragementText}>
            By examining your day each evening, you're strengthening your practice
            of virtue. Progress, not perfection, is the goal.
          </Text>
          <Text style={styles.encouragementText}>
            Each reflection brings you closer to living in harmony with nature and
            developing your character.
          </Text>
          <Text style={styles.encouragementText}>
            Rest well tonight, and wake ready to practice tomorrow's intention.
          </Text>
        </View>

        {/* Finish Button */}
        <TouchableOpacity
          testID="finish-button"
          onPress={handleFinish}
          style={styles.finishButton}
          accessibilityLabel="Finish evening reflection and return home"
          accessibilityRole="button"
        >
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  completionHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  completionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  quoteContainer: {
    backgroundColor: '#F0EDE6',
    padding: 20,
    marginBottom: 28,
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
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 28,
  },
  summaryText: {
    fontSize: 15,
    color: '#34495E',
    flex: 1,
  },
  tomorrowContainer: {
    backgroundColor: '#FFF9F5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: EVENING_COLOR,
  },
  tomorrowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 12,
  },
  tomorrowIntention: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    lineHeight: 26,
    marginBottom: 8,
  },
  tomorrowVirtue: {
    fontSize: 14,
    color: EVENING_COLOR,
    fontWeight: '600',
  },
  encouragementContainer: {
    backgroundColor: '#F5F9FF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#D5E5FF',
  },
  encouragementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  encouragementText: {
    fontSize: 15,
    color: '#34495E',
    lineHeight: 22,
    marginBottom: 12,
  },
  finishButton: {
    backgroundColor: EVENING_COLOR,
    padding: 18,
    borderRadius: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default EveningCompletionScreen;
