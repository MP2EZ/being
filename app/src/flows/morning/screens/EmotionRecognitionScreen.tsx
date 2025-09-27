/**
 * Emotion Recognition Screen - DRD-FLOW-002 Screen 2
 * Present-moment emotional awareness with MBCT compliance
 * Clinical note: Present-moment awareness language, multiple selection allowed
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius } from '../../../constants/colors';
import { MorningFlowParamList } from '../../../types/flows';

type EmotionRecognitionScreenNavigationProp = StackNavigationProp<MorningFlowParamList, 'EmotionRecognition'>;

// Emotions with therapeutic language - 2x4 grid (8 emotions)
const EMOTIONS = [
  { name: 'Joy', emoji: '😊', color: '#FFD93D' },
  { name: 'Sadness', emoji: '😢', color: '#6BB6FF' },
  { name: 'Anxiety', emoji: '😰', color: '#FF8A5B' },
  { name: 'Calm', emoji: '😌', color: '#A8E6CF' },
  { name: 'Anger', emoji: '😠', color: '#FF6B6B' },
  { name: 'Gratitude', emoji: '🙏', color: '#FFB347' },
  { name: 'Fear', emoji: '😨', color: '#C7CEEA' },
  { name: 'Hope', emoji: '🌟', color: '#FFEAA7' },
];

const EmotionRecognitionScreen: React.FC = () => {
  const navigation = useNavigation<EmotionRecognitionScreenNavigationProp>();
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);

  const handleEmotionPress = (emotionName: string) => {
    // Haptic feedback for selection
    Vibration.vibrate(50);
    
    setSelectedEmotions(prev => {
      if (prev.includes(emotionName)) {
        return prev.filter(e => e !== emotionName);
      } else {
        return [...prev, emotionName];
      }
    });
  };

  const handleContinue = () => {
    navigation.navigate('ThoughtObservation');
  };

  const isEmotionSelected = (emotionName: string) => selectedEmotions.includes(emotionName);

  const EmotionButton: React.FC<{ emotion: typeof EMOTIONS[0]; index: number }> = ({ 
    emotion, 
    index 
  }) => {
    const selected = isEmotionSelected(emotion.name);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.emotionButton,
          {
            backgroundColor: selected 
              ? colorSystem.themes.morning.primary
              : colorSystem.base.white,
            borderColor: selected 
              ? colorSystem.themes.morning.primary 
              : colorSystem.gray[300],
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          }
        ]}
        onPress={() => handleEmotionPress(emotion.name)}
        accessibilityRole="button"
        accessibilityLabel={`${emotion.name} emotion`}
        accessibilityHint={`Tap to ${selected ? 'deselect' : 'select'} ${emotion.name} as a current emotion`}
        accessibilityState={{ selected }}
      >
        <Text style={styles.emotionEmoji}>
          {emotion.emoji}
        </Text>
        <Text style={[
          styles.emotionText,
          {
            color: selected 
              ? colorSystem.base.white 
              : colorSystem.base.black
          }
        ]}>
          {emotion.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Instruction */}
        <View style={styles.instructionSection}>
          <Text style={styles.instructionText}>
            What emotions are here right now?
          </Text>
          <Text style={styles.subInstructionText}>
            Take a moment to notice what emotions are present. You can select multiple emotions - there's no limit.
          </Text>
        </View>

        {/* Emotion Grid - 2 columns, 4 rows */}
        <View style={styles.gridContainer}>
          {EMOTIONS.map((emotion, index) => (
            <EmotionButton key={emotion.name} emotion={emotion} index={index} />
          ))}
        </View>

        {/* Selection Summary */}
        {selectedEmotions.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>
              Emotions you're noticing:
            </Text>
            <Text style={styles.summaryText}>
              {selectedEmotions.join(', ')}
            </Text>
          </View>
        )}

        {/* Mindful Note */}
        <View style={styles.noteSection}>
          <Text style={styles.noteText}>
            💝 All emotions are welcome here. Simply notice them with kindness and curiosity.
          </Text>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonSection}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor: colorSystem.themes.morning.primary,
              opacity: pressed ? 0.9 : 1,
            }
          ]}
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue to thought observation"
          accessibilityHint="Move to the next step of your morning check-in"
        >
          <Text style={styles.continueButtonText}>
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.morning.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  instructionSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 24,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subInstructionText: {
    fontSize: 16,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 22,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  emotionButton: {
    width: '48%', // 2 columns with gap
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80, // Larger touch target for emotional engagement
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emotionEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  emotionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  summarySection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.themes.morning.primary,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
  },
  noteSection: {
    backgroundColor: colorSystem.themes.morning.light,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.lg,
  },
  noteText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colorSystem.themes.morning.background,
  },
  continueButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // WCAG AA touch target
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.white,
  },
});

export default EmotionRecognitionScreen;