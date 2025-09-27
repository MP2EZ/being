import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
  min?: number;
  showEmoji?: boolean;
  theme?: 'morning' | 'midday' | 'evening' | null;
  style?: any;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onChange,
  max = 10,
  min = 1,
  showEmoji = false,
  theme = null,
  style
}) => {
  const { colorSystem } = useTheme();
  const accentColor = theme ? colorSystem.themes[theme].primary : colorSystem.status.info;

  // Simple button-based approach for therapeutic reliability
  const renderValueButtons = () => {
    const buttons = [];
    for (let i = min; i <= max; i++) {
      buttons.push(
        <Pressable
          key={i}
          style={({ pressed }) => [
            styles.valueButton,
            value === i && { backgroundColor: accentColor },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => onChange(i)}
          accessibilityLabel={`${label} value ${i}`}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.buttonText,
              value === i && { color: colorSystem.base.white },
            ]}
          >
            {i}
          </Text>
        </Pressable>
      );
    }
    return buttons;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: accentColor }]}>
          {value}
        </Text>
      </View>
      <View style={styles.buttonsContainer}>
        {renderValueButtons()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  valueButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});