/**
 * EmotionGrid Component - Emotion selection for all check-in types
 * Reusable grid with emoji support and theme awareness
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface EmotionGridProps {
  selected: string[];
  onSelectionChange: (emotions: string[]) => void;
  theme?: 'morning' | 'midday' | 'evening';
  multiSelect?: boolean;
  columns?: number;
}

interface Emotion {
  id: string;
  label: string;
}

const EMOTIONS: Emotion[] = [
  { id: 'happy', label: 'Happy' },
  { id: 'calm', label: 'Calm' },
  { id: 'excited', label: 'Excited' },
  { id: 'grateful', label: 'Grateful' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'sad', label: 'Sad' },
  { id: 'frustrated', label: 'Frustrated' },
  { id: 'tired', label: 'Tired' },
  { id: 'confused', label: 'Confused' },
  { id: 'hopeful', label: 'Hopeful' },
  { id: 'content', label: 'Content' },
  { id: 'stressed', label: 'Stressed' },
];

export const EmotionGrid: React.FC<EmotionGridProps> = ({
  selected = [],
  onSelectionChange,
  theme = 'morning',
  multiSelect = true,
  columns = 3
}) => {
  const handleEmotionPress = async (emotionId: string) => {
    // Haptic feedback on selection
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    let newSelected: string[];
    
    if (multiSelect) {
      newSelected = selected.includes(emotionId)
        ? selected.filter(e => e !== emotionId)
        : [...selected, emotionId];
    } else {
      // Single select mode
      newSelected = selected.includes(emotionId) ? [] : [emotionId];
    }
    
    onSelectionChange(newSelected);
  };

  const renderEmotion = ({ item }: { item: Emotion }) => {
    const isSelected = selected.includes(item.id);
    const themeColors = colorSystem.themes[theme];
    
    return (
      <TouchableOpacity
        style={[
          styles.emotionItem,
          {
            backgroundColor: isSelected ? themeColors.background : colorSystem.gray[100],
            borderColor: isSelected ? themeColors.primary : colorSystem.gray[200],
            borderWidth: isSelected ? 2 : 1,
            flex: 1 / columns - 0.02, // Dynamic width based on columns
          }
        ]}
        onPress={() => handleEmotionPress(item.id)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.emotionLabel,
            {
              color: isSelected ? themeColors.primary : colorSystem.gray[700],
              fontWeight: isSelected ? '600' : '400',
            }
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={EMOTIONS}
        renderItem={renderEmotion}
        numColumns={columns}
        key={`emotion-grid-${columns}`} // Force re-render on column change
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  grid: {
    paddingVertical: spacing.xs,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  emotionItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    marginHorizontal: spacing.xs / 2,
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  emotionLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default EmotionGrid;