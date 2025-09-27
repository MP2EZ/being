/**
 * Value Slider Component
 * DRD-compliant physical metrics sliders with clinical safety modifications
 * Clinical: Physical Comfort replaces Anxiety Level per safety requirements
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  Pressable 
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '../../../constants/colors';

interface ValueSliderProps {
  sleepQuality?: number;
  energyLevel?: number; 
  physicalComfort?: number;
  onSleepChange?: (value: number) => void;
  onEnergyChange?: (value: number) => void;
  onPhysicalComfortChange?: (value: number) => void;
  disabled?: boolean;
  theme?: 'morning' | 'midday' | 'evening';
}

const ValueSlider: React.FC<ValueSliderProps> = ({
  sleepQuality = 7,
  energyLevel = 6,
  physicalComfort = 7, // Default positive per clinical safety
  onSleepChange,
  onEnergyChange,
  onPhysicalComfortChange,
  disabled = false,
  theme = 'morning',
}) => {
  const themeColors = colorSystem.themes[theme];

  const SliderRow: React.FC<{
    title: string;
    value: number;
    onValueChange?: (value: number) => void;
    lowLabel: string;
    highLabel: string;
    icon: string;
  }> = ({ title, value, onValueChange, lowLabel, highLabel, icon }) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderTitle}>
          {icon} {title}
        </Text>
        <View style={styles.valueIndicator}>
          <Text style={[
            styles.valueText,
            { color: themeColors.primary }
          ]}>
            {Math.round(value)}
          </Text>
        </View>
      </View>
      
      <View style={styles.sliderWrapper}>
        <View style={styles.customSlider}>
          <View style={[
            styles.sliderTrack,
            { backgroundColor: colorSystem.gray[300] }
          ]}>
            <View style={[
              styles.sliderFill,
              { 
                width: `${(value / 10) * 100}%`,
                backgroundColor: themeColors.primary 
              }
            ]} />
          </View>
          <View style={styles.sliderButtons}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <Pressable
                key={num}
                style={[styles.sliderButton, {
                  backgroundColor: num <= value ? themeColors.primary : 'transparent'
                }]}
                onPress={() => onValueChange?.(num)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Set ${title} to ${num} out of 10`}
              >
                <Text style={[styles.sliderButtonText, {
                  color: num <= value ? colorSystem.base.white : colorSystem.gray[600]
                }]}>
                  {num}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      
      <View style={styles.sliderLabels}>
        <Text style={styles.labelText}>{lowLabel}</Text>
        <Text style={styles.labelText}>{highLabel}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sleep Quality Slider */}
      <SliderRow
        title="Sleep Quality"
        value={sleepQuality}
        {...(onSleepChange && { onValueChange: onSleepChange })}
        lowLabel="Poor sleep"
        highLabel="Excellent sleep"
        icon="🛌"
      />

      {/* Energy Level Slider */}
      <SliderRow
        title="Energy Level"
        value={energyLevel}
        {...(onEnergyChange && { onValueChange: onEnergyChange })}
        lowLabel="Very low"
        highLabel="Very high"
        icon="⚡"
      />

      {/* Physical Comfort Slider - CRITICAL: Replaces Anxiety Level */}
      <SliderRow
        title="Physical Comfort"
        value={physicalComfort}
        {...(onPhysicalComfortChange && { onValueChange: onPhysicalComfortChange })}
        lowLabel="Uncomfortable"
        highLabel="Very comfortable"
        icon="🤗"
      />

      {/* Summary Card */}
      <View style={[
        styles.summaryCard,
        { 
          backgroundColor: themeColors.background,
          borderColor: themeColors.primary 
        }
      ]}>
        <Text style={styles.summaryTitle}>Physical Wellness Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sleep:</Text>
          <Text style={[styles.summaryValue, { color: themeColors.primary }]}>
            {Math.round(sleepQuality)}/10
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Energy:</Text>
          <Text style={[styles.summaryValue, { color: themeColors.primary }]}>
            {Math.round(energyLevel)}/10
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Comfort:</Text>
          <Text style={[styles.summaryValue, { color: themeColors.primary }]}>
            {Math.round(physicalComfort)}/10
          </Text>
        </View>
      </View>

      {/* Therapeutic Note */}
      <View style={[
        styles.noteSection,
        { backgroundColor: themeColors.light }
      ]}>
        <Text style={styles.noteText}>
          🌟 Your body's signals are valuable information. Notice them with compassion.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sliderContainer: {
    marginBottom: spacing.xl,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sliderTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    flex: 1,
  },
  valueIndicator: {
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    minWidth: 40,
    alignItems: 'center',
  },
  valueText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '700',
  },
  sliderWrapper: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  customSlider: {
    width: '100%',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    marginBottom: spacing.sm,
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },
  sliderButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  labelText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
  },
  summaryValue: {
    fontSize: typography.caption.size,
    fontWeight: '700',
  },
  noteSection: {
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.sm,
  },
  noteText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ValueSlider;