import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RNSlider from '@react-native-community/slider';
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
  
  const getEmoji = (val: number) => {
    if (val <= 3) return '😔';
    if (val <= 6) return '😐';
    return '😊';
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: accentColor }]}>
          {value} {showEmoji && getEmoji(value)}
        </Text>
      </View>
      <View style={styles.sliderContainer}>
        <RNSlider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={accentColor}
          maximumTrackTintColor={colorSystem.gray[300]}
          thumbTintColor={colorSystem.base.white}
          step={1}
        />
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
  sliderContainer: {
    paddingHorizontal: 0,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});