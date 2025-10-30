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

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MorningFlowParamList, StoicMorningFlowData } from '../../../types/flows';

type Props = NativeStackScreenProps<MorningFlowParamList, 'MorningCompletion'> & {
  onSave?: (data: StoicMorningFlowData) => void;
};

// Map principle keys to display names
const PRINCIPLE_NAMES: Record<string, string> = {
  attention_to_present: 'Attention to Present',
  perception_examination: 'Examine Perceptions',
  judgment_suspension: 'Suspend Judgment',
  dichotomy_of_control: 'Dichotomy of Control',
  events_vs_interpretations: 'Events vs. Interpretations',
  pause_before_reaction: 'Pause Before Reaction',
  reframe_adversity: 'Reframe Adversity',
  contemplation: 'Daily Contemplation',
  view_from_above: 'View from Above',
  virtue_as_foundation: 'Virtue as Foundation',
  service_to_others: 'Service to Others',
  amor_fati: 'Amor Fati',
};

const VIRTUE_NAMES: Record<string, string> = {
  wisdom: 'Wisdom',
  courage: 'Courage',
  justice: 'Justice',
  temperance: 'Temperance',
};

const MorningCompletionScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  const { flowData, startTime } = route.params || {};
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    if (startTime) {
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      setTimeSpent(elapsed);
    }
  }, [startTime]);

  const handleFinish = () => {
    const completeData: StoicMorningFlowData = {
      ...flowData,
      completedAt: new Date(),
      timeSpentSeconds: timeSpent,
      flowVersion: 'stoic_v1',
    };

    if (onSave) {
      onSave(completeData);
    }

    navigation.navigate('Home' as any);
  };

  const handleReview = () => {
    navigation.goBack();
  };

  const gratitudeCount = flowData?.gratitude?.items?.length || 0;
  const obstaclesCount = flowData?.preparation?.obstacles?.length || 0;
  const virtueName = flowData?.intention?.virtue
    ? VIRTUE_NAMES[flowData.intention.virtue]
    : '';
  const principleName = flowData?.principleFocus?.principleKey
    ? PRINCIPLE_NAMES[flowData.principleFocus.principleKey]
    : '';

  return (
    <ScrollView style={styles.container} testID="completion-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Morning Practice Complete</Text>
        <Text style={styles.subtitle}>Well done! You've completed your morning Stoic Mindfulness practice.</Text>
      </View>

      {/* Gratitude Summary */}
      {flowData?.gratitude && (
        <View
          style={styles.section}
          testID="gratitude-summary"
          accessibilityLabel="Gratitude summary"
        >
          <Text style={styles.sectionTitle}>Gratitude</Text>
          <Text style={styles.sectionMeta}>{gratitudeCount} gratitude items</Text>
          {flowData.gratitude.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <Text style={styles.itemText}>• {item.what}</Text>
              {item.impermanenceReflection?.acknowledged && (
                <Text style={styles.itemSubtext}>
                  {item.impermanenceReflection.awareness}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Intention Summary */}
      {flowData?.intention && (
        <View
          style={styles.section}
          testID="intention-summary"
          accessibilityLabel="Intention summary"
        >
          <Text style={styles.sectionTitle}>Intention</Text>
          <View style={styles.itemCard}>
            <Text style={styles.virtueLabel}>{virtueName}</Text>
            <Text style={styles.itemText}>{flowData.intention.intentionStatement}</Text>
            <View style={styles.controlSection}>
              <Text style={styles.controlLabel}>I control:</Text>
              <Text style={styles.controlText}>{flowData.intention.whatIControl}</Text>
              <Text style={styles.controlLabel}>I don't control:</Text>
              <Text style={styles.controlText}>{flowData.intention.whatIDontControl}</Text>
            </View>
            {flowData.intention.reserveClause && (
              <Text style={styles.reserveClause}>{flowData.intention.reserveClause}</Text>
            )}
          </View>
        </View>
      )}

      {/* Principle Summary */}
      {flowData?.principleFocus && (
        <View
          style={styles.section}
          testID="principle-summary"
          accessibilityLabel="Principle summary"
        >
          <Text style={styles.sectionTitle}>Principle Focus</Text>
          <View style={styles.itemCard}>
            <Text style={styles.principleLabel}>{principleName}</Text>
            {flowData.principleFocus.personalInterpretation && (
              <Text style={styles.itemText}>
                {flowData.principleFocus.personalInterpretation}
              </Text>
            )}
            {flowData.principleFocus.reminderTime && (
              <Text style={styles.reminderText}>
                Reminder set for {flowData.principleFocus.reminderTime}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Preparation Summary */}
      {flowData?.preparation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preparation</Text>
          {obstaclesCount > 0 ? (
            <>
              <Text style={styles.sectionMeta}>{obstaclesCount} obstacle contemplated</Text>
              <Text style={styles.readinessText}>
                Readiness: {flowData.preparation.readinessRating}/10
              </Text>
            </>
          ) : (
            <Text style={styles.itemText}>No obstacles contemplated</Text>
          )}
        </View>
      )}

      {/* Physical Metrics Summary */}
      {flowData?.physicalMetrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Metrics</Text>
          <View style={styles.metricsGrid}>
            <Text style={styles.metricItem}>
              {flowData.physicalMetrics.sleepHours} hours sleep
            </Text>
            <Text style={styles.metricItem}>
              {flowData.physicalMetrics.exerciseMinutes} min exercise
            </Text>
            <Text style={styles.metricItem}>
              {flowData.physicalMetrics.mealsCount} meals
            </Text>
          </View>
        </View>
      )}

      {/* Time Spent */}
      {timeSpent > 0 && (
        <View style={styles.timeSection}>
          <Text style={styles.timeText}>
            Time spent: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={handleReview}
          accessibilityRole="button"
          accessibilityLabel="Review practices"
        >
          <Text style={styles.reviewButtonText}>Review</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinish}
          accessibilityRole="button"
          accessibilityLabel="Finish morning practice"
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
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    marginBottom: 24,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  itemSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  virtueLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  principleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  controlSection: {
    marginTop: 12,
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  controlText: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  reserveClause: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  reminderText: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  readinessText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  timeSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timeText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  reviewButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  finishButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default MorningCompletionScreen;
