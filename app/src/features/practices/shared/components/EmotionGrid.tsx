/**
 * EmotionGrid Component - Awareness Screen Emotion Selection
 * 
 * CLINICAL SPECIFICATIONS:
 * - Multiple emotion selection for awareness
 * - Therapeutic emotion categories
 * - Accessible touch targets (44pt minimum)
 * - Clear visual feedback
 * - Non-judgmental language
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme/colors';

export interface Emotion {
  id: string;
  label: string;
  category: 'calm' | 'energized' | 'challenged';
}

const EMOTIONS: Emotion[] = [
  { id: 'stressed', label: 'Stressed', category: 'challenged' },
  { id: 'calm', label: 'Calm', category: 'calm' },
  { id: 'tired', label: 'Tired', category: 'challenged' },
  { id: 'focused', label: 'Focused', category: 'energized' },
  { id: 'anxious', label: 'Anxious', category: 'challenged' },
  { id: 'content', label: 'Content', category: 'calm' },
];

interface EmotionGridProps {
  selectedEmotions: string[];
  onSelectionChange: (emotions: string[]) => void;
  maxSelections?: number;
  theme?: 'morning' | 'midday' | 'evening';
  testID?: string;
}

const EmotionGrid: React.FC<EmotionGridProps> = ({
  selectedEmotions,
  onSelectionChange,
  maxSelections = 3,
  theme = 'midday',
  testID = 'emotion-grid'
}) => {
  // Safe theme access with fallback
  const neutralTheme = {
    primary: colorSystem.base.midnightBlue,
    light: colorSystem.gray[200],
    background: colorSystem.base.white,
  };

  const selectedTheme = colorSystem.themes[theme as keyof typeof colorSystem.themes];
  const themeColors = selectedTheme || neutralTheme;

  const handleEmotionPress = (emotionId: string) => {
    let newSelection: string[];
    
    if (selectedEmotions.includes(emotionId)) {
      // Remove if already selected
      newSelection = selectedEmotions.filter(id => id !== emotionId);
    } else {
      // Add if not selected and under limit
      if (selectedEmotions.length < maxSelections) {
        newSelection = [...selectedEmotions, emotionId];
      } else {
        // Replace oldest selection if at limit
        newSelection = [...selectedEmotions.slice(1), emotionId];
      }
    }
    
    onSelectionChange(newSelection);
  };

  const getEmotionStyle = (emotion: Emotion, isSelected: boolean) => {
    const dynamicStyle: ViewStyle = isSelected ? {
      backgroundColor: themeColors.primary,
      borderColor: themeColors.primary,
    } : {
      backgroundColor: themeColors.background,
      borderColor: colorSystem.gray[300],
    };

    return [styles.emotionButton, dynamicStyle];
  };

  const getEmotionTextStyle = (isSelected: boolean) => {
    return [
      styles.emotionText,
      { color: isSelected ? colorSystem.base.white : colorSystem.base.black }
    ];
  };

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.instructionText}>
        Notice what's present in your experience right now
      </Text>
      
      <Text style={styles.selectionHint}>
        Select up to {maxSelections} emotions that resonate with you
      </Text>

      <View style={styles.emotionGrid}>
        {EMOTIONS.map((emotion) => {
          const isSelected = selectedEmotions.includes(emotion.id);
          
          return (
            <Pressable
              key={emotion.id}
              style={({ pressed }) => [
                ...getEmotionStyle(emotion, isSelected),
                { opacity: pressed ? 0.8 : 1 }
              ]}
              onPress={() => handleEmotionPress(emotion.id)}
              accessibilityRole="button"
              accessibilityLabel={emotion.label}
              accessibilityHint={`${isSelected ? 'Selected' : 'Not selected'}. Tap to ${isSelected ? 'deselect' : 'select'} this emotion`}
              accessibilityState={{ selected: isSelected }}
              testID={`emotion-${emotion.id}`}
            >
              <Text style={getEmotionTextStyle(isSelected)}>
                {emotion.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedEmotions.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>
            Selected: {selectedEmotions.length}/{maxSelections}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
  },
  instructionText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: spacing.lg,
  },
  selectionHint: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: spacing[5],
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  emotionButton: {
    width: '48%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.large,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    minHeight: 44, // WCAG touch target
  },
  emotionText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  selectedContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    fontWeight: typography.fontWeight.medium,
  },
});

export default EmotionGrid;