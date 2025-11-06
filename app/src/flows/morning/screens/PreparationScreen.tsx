/**
 * PREPARATION SCREEN
 *
 * Stoic premeditatio malorum (negative visualization) with safety safeguards.
 * Philosopher-validated (9.5/10) - classical practice with modern safety.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a privilege it is
 *   to be alive... What if someone tried to take me from you today? How would you
 *   respond?" (Meditations 2:1)
 * - Seneca: "It is in times of security that the spirit should be preparing itself
 *   to deal with difficult times" (Letters to Lucilius 107)
 * - Epictetus: "What is the prize of a good man? To do his duty well." (Discourses 3.24)
 *
 * CRITICAL SAFETY SAFEGUARDS (NON-NEGOTIABLE):
 * 1. Max 2 obstacles (prevents rumination spiral)
 * 2. Time-boxing (flag if >120s, suggest opt-out)
 * 3. Anxiety detection (keywords + patterns)
 * 4. Opt-out pathway (user agency preserved)
 * 5. Self-compassion REQUIRED (if obstacles present)
 * 6. Crisis integration (show resources if severe distress)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Linking,
} from 'react-native';
import Slider from '@react-native-community/slider';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList, PreparationData } from '../../../types/flows';
import { PremeditationSafetyService } from '../../../services/premeditationSafetyService';
import type { ObstacleInput } from '../../../services/premeditationSafetyService';

type Props = StackScreenProps<MorningFlowParamList, 'Preparation'> & {
  onSave?: (data: PreparationData) => void;
};

interface ObstacleFormData {
  obstacle: string;
  howICanRespond: string;
  whatIControl: string;
  whatIDontControl: string;
}

const TIME_LIMIT_SECONDS = 120;

const PreparationScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as PreparationData | undefined;

  // Debug logging
  if (initialData) {
    console.log('[PreparationScreen] Restoring data:', {
      hasObstacles: !!initialData.obstacles?.length,
      hasSelfCompassion: !!initialData.selfCompassionNote,
      readinessRating: initialData.readinessRating
    });
  }

  const [sessionStartTime] = useState<Date>(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [obstacles, setObstacles] = useState<ObstacleFormData[]>(
    initialData?.obstacles?.map(o => ({
      obstacle: o.obstacle || '',
      howICanRespond: o.howICanRespond || '',
      whatIControl: o.whatIControl || '',
      whatIDontControl: o.whatIDontControl || ''
    })) || []
  );
  const [selfCompassionNote, setSelfCompassionNote] = useState(initialData?.selfCompassionNote || '');
  const [readinessRating, setReadinessRating] = useState(initialData?.readinessRating || 5);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [anxietyDetected, setAnxietyDetected] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [timeExceeded, setTimeExceeded] = useState(false);

  const safetyService = useRef(new PremeditationSafetyService()).current;
  const sessionId = useRef(safetyService.startSession().sessionId).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);

      if (elapsed > TIME_LIMIT_SECONDS) {
        setTimeExceeded(true);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionStartTime]);

  // Anxiety detection effect
  useEffect(() => {
    if (obstacles.length > 0) {
      const flags = safetyService.checkSafetyFlags(sessionId);
      setAnxietyDetected(flags.anxietyDetected);

      const crisisResources = safetyService.getCrisisResourcesIfNeeded(sessionId);
      setCrisisDetected(crisisResources !== null);
    }
  }, [obstacles, safetyService, sessionId]);

  const addObstacle = () => {
    if (obstacles.length < 2) {
      setObstacles([
        ...obstacles,
        {
          obstacle: '',
          howICanRespond: '',
          whatIControl: '',
          whatIDontControl: '',
        },
      ]);
    }
  };

  const removeObstacle = (index: number) => {
    // Only remove from safety service if obstacle was fully filled and added
    const obstacle = obstacles[index];
    if (!obstacle) return;

    const wasFullyFilled =
      obstacle.obstacle.trim() &&
      obstacle.howICanRespond.trim() &&
      obstacle.whatIControl.trim() &&
      obstacle.whatIDontControl.trim();

    const newObstacles = obstacles.filter((_, i) => i !== index);
    setObstacles(newObstacles);

    // Only remove from service if it was added
    if (wasFullyFilled) {
      try {
        safetyService.removeObstacle(sessionId, index);
      } catch (error) {
        // Obstacle wasn't in service, that's okay
      }
    }
  };

  // Direct anxiety/crisis detection without service
  const detectAnxietyInText = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    const anxietyKeywords = [
      'worried', 'anxious', 'panic', 'scared', 'terrified',
      'afraid', 'fear', 'nervous', 'stress', 'overwhelmed',
    ];
    const ruminationPatterns = [
      /what if.*wrong/i,
      /cannot.*stop.*think/i,
      /keep.*think/i,
      /terrible.*might/i,
      /scared.*that/i,
      /worried.*that/i,
    ];

    const hasAnxiety = anxietyKeywords.some(kw => lowerText.includes(kw));
    const hasRumination = ruminationPatterns.some(pattern => pattern.test(text));
    return hasAnxiety || hasRumination;
  };

  const detectCrisisInText = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    const crisisKeywords = [
      'suicidal', 'kill myself', 'end it all',
      'cannot go on', 'want to die', 'no point living',
    ];
    return crisisKeywords.some(kw => lowerText.includes(kw));
  };

  const updateObstacle = (index: number, field: keyof ObstacleFormData, value: string) => {
    const newObstacles = [...obstacles];
    if (!newObstacles[index]) return;

    newObstacles[index][field] = value;
    setObstacles(newObstacles);

    // Check anxiety/crisis in real-time for obstacle field
    if (field === 'obstacle' && value.trim()) {
      setAnxietyDetected(detectAnxietyInText(value));
      setCrisisDetected(detectCrisisInText(value));
    }

    // Add to main safety service if all fields filled
    const obstacle = newObstacles[index];
    if (!obstacle) return;

    if (
      obstacle.obstacle.trim() &&
      obstacle.howICanRespond.trim() &&
      obstacle.whatIControl.trim() &&
      obstacle.whatIDontControl.trim()
    ) {
      try {
        const obstacleInput: ObstacleInput = {
          obstacle: obstacle.obstacle,
          howICanRespond: obstacle.howICanRespond,
          whatIControl: obstacle.whatIControl,
          whatIDontControl: obstacle.whatIDontControl,
        };
        safetyService.addObstacle(sessionId, obstacleInput);
      } catch (error) {
        // Already added or max reached
      }
    }
  };

  const handleOptOut = (reason: 'anxiety' | 'not_needed_today' | 'prefer_gratitude') => {
    safetyService.optOut(sessionId, reason);
    const session = safetyService.completeSession(sessionId, '');

    const preparationData: PreparationData = {
      obstacles: [],
      readinessRating,
      selfCompassionNote: '',
      timeSpentSeconds: session.timeSpentSeconds,
      optedOut: true,
      optOutReason: reason,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(preparationData);
    }

    navigation.navigate('PrincipleFocus');
  };

  const handleContinue = () => {
    // Validate self-compassion if obstacles present
    if (obstacles.length > 0 && !selfCompassionNote.trim()) {
      return;
    }

    const session = safetyService.completeSession(sessionId, selfCompassionNote);

    const preparationData: PreparationData = {
      obstacles: obstacles
        .filter(
          (o) =>
            o.obstacle.trim() &&
            o.howICanRespond.trim() &&
            o.whatIControl.trim() &&
            o.whatIDontControl.trim()
        )
        .map((o) => ({
          obstacle: o.obstacle.trim(),
          howICanRespond: o.howICanRespond.trim(),
          whatIControl: o.whatIControl.trim(),
          whatIDontControl: o.whatIDontControl.trim(),
        })),
      readinessRating,
      selfCompassionNote: selfCompassionNote.trim(),
      timeSpentSeconds: session.timeSpentSeconds,
      optedOut: false,
      anxietyDetected,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(preparationData);
    }

    navigation.navigate('PrincipleFocus');
  };

  const formatTime = (seconds: number) => {
    const remaining = Math.max(0, TIME_LIMIT_SECONDS - seconds);
    const minutes = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const shouldSuggestOptOut = timeExceeded || anxietyDetected;

  return (
    <ScrollView style={styles.container} testID="preparation-screen">
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        testID="back-button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Preparation</Text>
        <Text style={styles.subtitle}>
          Premeditatio malorum (optional)
        </Text>
        <Text style={styles.helperText}>
          Contemplate potential obstacles and how you'll respond
        </Text>
      </View>

      {/* Safety Indicators */}
      <View style={styles.safetyIndicators}>
        <View style={styles.indicator}>
          <Text style={styles.indicatorLabel}>Time Remaining:</Text>
          <Text
            style={[styles.indicatorValue, timeExceeded && styles.indicatorWarning]}
            testID="time-remaining"
          >
            {formatTime(elapsedSeconds)} ({timeExceeded ? 'exceeded' : '2 min'})
          </Text>
        </View>
        <View style={styles.indicator}>
          <Text style={styles.indicatorLabel}>Obstacles:</Text>
          <Text
            style={[
              styles.indicatorValue,
              obstacles.length >= 2 && styles.indicatorWarning,
            ]}
          >
            {obstacles.length}/2
          </Text>
        </View>
      </View>

      {/* Time Warning */}
      {timeExceeded && (
        <View
          style={styles.warningBox}
          testID="time-warning"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.warningText}>
            This is taking longer than recommended. Consider stopping and trying
            gratitude instead.
          </Text>
        </View>
      )}

      {/* Anxiety Detection Warning */}
      {anxietyDetected && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Distress detected. This practice should feel constructive, not distressing.
          </Text>
        </View>
      )}

      {/* Opt-Out Suggestion */}
      {shouldSuggestOptOut && (
        <TouchableOpacity
          style={styles.optOutButton}
          onPress={() => setShowOptOutModal(true)}
          testID="opt-out-suggestion"
        >
          <Text style={styles.optOutButtonText}>Stop this practice</Text>
        </TouchableOpacity>
      )}

      {/* Crisis Resources */}
      {crisisDetected && (
        <View style={styles.crisisBox}>
          <Text style={styles.crisisText}>
            We're here to support you. If you're experiencing a mental health crisis,
            help is available.
          </Text>
          <TouchableOpacity
            style={styles.crisisButton}
            onPress={() => Linking.openURL('tel:988')}
            testID="crisis-resources-button"
            accessibilityLabel="Call 988 Suicide & Crisis Lifeline"
            accessibilityRole="button"
          >
            <Text style={styles.crisisButtonText}>Call 988</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Obstacles */}
      {obstacles.map((obstacle, index) => (
        <View key={index} style={styles.obstacleCard}>
          <View style={styles.obstacleHeader}>
            <Text style={styles.obstacleTitle}>Obstacle {index + 1}</Text>
            <TouchableOpacity
              onPress={() => removeObstacle(index)}
              testID={`remove-obstacle-${index}`}
            >
              <Text style={styles.removeButton}>✕ Remove</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>What might happen?</Text>
            <TextInput
              style={styles.input}
              value={obstacle.obstacle}
              onChangeText={(value) => updateObstacle(index, 'obstacle', value)}
              placeholder="e.g., Difficult meeting with stakeholders"
              placeholderTextColor="#999"
              testID={`obstacle-input-${index}`}
              accessibilityLabel={`Obstacle ${index + 1} description`}
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>How can I respond virtuously?</Text>
            <TextInput
              style={styles.input}
              value={obstacle.howICanRespond}
              onChangeText={(value) => updateObstacle(index, 'howICanRespond', value)}
              placeholder="e.g., Stay calm, listen actively"
              placeholderTextColor="#999"
              testID={`response-input-${index}`}
              accessibilityLabel={`How you can respond to obstacle ${index + 1}`}
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>What I control:</Text>
            <TextInput
              style={styles.input}
              value={obstacle.whatIControl}
              onChangeText={(value) => updateObstacle(index, 'whatIControl', value)}
              placeholder="e.g., My preparation, my response"
              placeholderTextColor="#999"
              testID={`control-input-${index}`}
              accessibilityLabel={`What is within your control for obstacle ${index + 1}`}
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>What I don't control:</Text>
            <TextInput
              style={styles.input}
              value={obstacle.whatIDontControl}
              onChangeText={(value) =>
                updateObstacle(index, 'whatIDontControl', value)
              }
              placeholder="e.g., Meeting outcome, others' reactions"
              placeholderTextColor="#999"
              testID={`no-control-input-${index}`}
              accessibilityLabel={`What is outside your control for obstacle ${index + 1}`}
              multiline
            />
          </View>
        </View>
      ))}

      {/* Add Obstacle Button */}
      {obstacles.length < 2 && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={addObstacle}
          testID="add-obstacle"
        >
          <Text style={styles.addButtonText}>+ Add Obstacle</Text>
        </TouchableOpacity>
      )}

      {/* Self-Compassion (Required if obstacles present) */}
      {obstacles.length > 0 && (
        <View style={styles.selfCompassionSection}>
          <Text style={styles.sectionTitle}>Self-Compassion (Required)</Text>
          <Text style={styles.helperText}>
            Remind yourself that you're doing your best
          </Text>
          <TextInput
            style={styles.input}
            value={selfCompassionNote}
            onChangeText={setSelfCompassionNote}
            placeholder="e.g., I'm prepared and learning, I'm doing my best"
            placeholderTextColor="#999"
            testID="self-compassion-note"
            accessibilityLabel="Self-compassion note"
            multiline
          />
        </View>
      )}

      {/* Readiness Rating */}
      <View style={styles.readinessSection}>
        <Text style={styles.sectionTitle}>How ready do you feel?</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={readinessRating}
          onValueChange={setReadinessRating}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#ddd"
          thumbTintColor="#007AFF"
          testID="readiness-rating"
          accessibilityLabel={`Set readiness rating. Current value: ${readinessRating}`}
        />
        <Text style={styles.ratingValue}>Rating: {readinessRating}/10</Text>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          obstacles.length > 0 &&
            !selfCompassionNote.trim() &&
            styles.continueButtonDisabled,
        ]}
        onPress={handleContinue}
        disabled={obstacles.length > 0 && !selfCompassionNote.trim()}
        accessibilityRole="button"
        accessibilityState={{
          disabled: obstacles.length > 0 && !selfCompassionNote.trim(),
        }}
      >
        <Text style={styles.continueButtonText}>Continue or Skip</Text>
      </TouchableOpacity>

      {/* Opt-Out Modal */}
      <Modal
        visible={showOptOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Why skip this practice?</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleOptOut('anxiety')}
              testID="opt-out-anxiety"
            >
              <Text style={styles.modalOptionText}>
                Feeling anxious or distressed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleOptOut('not_needed_today')}
              testID="opt-out-not-needed"
            >
              <Text style={styles.modalOptionText}>Don't need it today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleOptOut('prefer_gratitude')}
              testID="opt-out-prefer-gratitude"
            >
              <Text style={styles.modalOptionText}>Prefer gratitude practice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowOptOutModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
  },
  safetyIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 20,
  },
  indicator: {
    alignItems: 'center',
  },
  indicatorLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  indicatorValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  indicatorWarning: {
    color: '#FF3B30',
  },
  warningBox: {
    padding: 16,
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  crisisBox: {
    padding: 16,
    backgroundColor: '#F8D7DA',
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
    borderRadius: 8,
    marginBottom: 16,
  },
  crisisText: {
    fontSize: 14,
    color: '#721C24',
    marginBottom: 12,
  },
  crisisButton: {
    backgroundColor: '#DC3545',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  crisisButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optOutButton: {
    padding: 12,
    backgroundColor: '#FFC107',
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  optOutButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  obstacleCard: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  obstacleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  obstacleTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  removeButton: {
    color: '#FF3B30',
    fontSize: 14,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  addButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selfCompassionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  readinessSection: {
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
    marginVertical: 12,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#007AFF',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  modalOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalCancel: {
    padding: 16,
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
});

export default PreparationScreen;
