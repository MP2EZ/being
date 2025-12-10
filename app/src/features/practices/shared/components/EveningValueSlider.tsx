/**
 * Evening Value Slider Component
 * CRITICAL CLINICAL SAFETY MODIFICATIONS FOR EVENING USE
 * 
 * SAFETY FEATURES:
 * - NO DEFAULT VALUES (prevents comparison pressure)
 * - Distress detection for values < 4
 * - Gentle therapeutic language
 * - Evening-appropriate themes
 * - Overflow support integration
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  Pressable 
} from 'react-native';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

interface EveningValueSliderProps {
  overallMood?: number | null;
  energyManagement?: number | null;
  valuesAlignment?: number | null;
  onMoodChange?: (value: number) => void;
  onEnergyChange?: (value: number) => void;
  onValuesChange?: (value: number) => void;
  onDistressDetected?: (type: 'mood' | 'energy' | 'values', value: number) => void;
  disabled?: boolean;
}

const EveningValueSlider: React.FC<EveningValueSliderProps> = ({
  overallMood = null, // CRITICAL: No defaults
  energyManagement = null, // CRITICAL: No defaults
  valuesAlignment = null, // CRITICAL: No defaults
  onMoodChange,
  onEnergyChange,
  onValuesChange,
  onDistressDetected,
  disabled = false,
}) => {
  const themeColors = colorSystem.themes.evening;

  // CRITICAL: Distress detection when values < 4
  const handleValueChange = (
    type: 'mood' | 'energy' | 'values',
    value: number,
    onChange?: (value: number) => void
  ) => {
    onChange?.(value);
    
    // Trigger distress detection for low values
    if (value < 4) {
      onDistressDetected?.(type, value);
    }
  };

  const SliderRow: React.FC<{
    title: string;
    value: number | null;
    onValueChange?: (value: number) => void;
    lowLabel: string;
    highLabel: string;
    icon: string;
    type: 'mood' | 'energy' | 'values';
    description: string;
  }> = ({ title, value, onValueChange, lowLabel, highLabel, icon, type, description }) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderTitle}>
          {icon} {title}
        </Text>
        {value !== null && (
          <View style={[
            styles.valueIndicator,
            value < 4 && styles.valueIndicatorDistress
          ]}>
            <Text style={[
              styles.valueText,
              { color: value < 4 ? colorSystem.status.error : themeColors.primary }
            ]}>
              {Math.round(value)}
            </Text>
          </View>
        )}
      </View>
      
      <Text style={styles.sliderDescription}>{description}</Text>
      
      <View style={styles.sliderWrapper}>
        <View style={styles.customSlider}>
          {value !== null && (
            <View style={[
              styles.sliderTrack,
              { backgroundColor: colorSystem.gray[300] }
            ]}>
              <View style={[
                styles.sliderFill,
                { 
                  width: `${(value / 10) * 100}%`,
                  backgroundColor: value < 4 ? colorSystem.status.error : themeColors.primary 
                }
              ]} />
            </View>
          )}
          
          <View style={styles.sliderButtons}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <Pressable
                key={num}
                style={[styles.sliderButton, {
                  backgroundColor: value !== null && num <= value 
                    ? (value < 4 ? colorSystem.status.error : themeColors.primary)
                    : 'transparent',
                  borderColor: value === null ? colorSystem.gray[400] : colorSystem.gray[300]
                }]}
                onPress={() => handleValueChange(type, num, onValueChange)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Set ${title} to ${num} out of 10`}
              >
                <Text style={[styles.sliderButtonText, {
                  color: value !== null && num <= value 
                    ? colorSystem.base.white 
                    : colorSystem.gray[600]
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
      
      {/* Show encouragement for any selection */}
      {value !== null && (
        <View style={[
          styles.responseNote,
          { backgroundColor: value < 4 ? colorSystem.status.errorBackground : themeColors.light }
        ]}>
          <Text style={styles.responseNoteText}>
            {value < 4 
              ? "It's okay to have difficult days. Notice this with kindness."
              : "Thank you for noticing how this felt for you today."
            }
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Overall Mood Slider */}
      <SliderRow
        title="Overall Mood"
        value={overallMood}
        onValueChange={onMoodChange || (() => {})}
        lowLabel="Very difficult"
        highLabel="Very good"
        icon="💭"
        type="mood"
        description="Notice without needing to change or judge what you experienced today"
      />

      {/* Energy Management Slider */}
      <SliderRow
        title="Energy Management"
        value={energyManagement}
        onValueChange={onEnergyChange || (() => {})}
        lowLabel="Depleted"
        highLabel="Well-managed"
        icon="⚡"
        type="energy"
        description="How did your energy feel throughout the day?"
      />

      {/* Values Alignment Slider */}
      <SliderRow
        title="Values Alignment"
        value={valuesAlignment}
        onValueChange={onValuesChange || (() => {})}
        lowLabel="Disconnected"
        highLabel="Aligned"
        icon="⭐"
        type="values"
        description="How connected did you feel to what matters most to you?"
      />

      {/* Gentle Reminder */}
      <View style={[
        styles.reminderSection,
        { backgroundColor: themeColors.background }
      ]}>
        <Text style={styles.reminderText}>
          🌙 These numbers are just information, not judgments. Whatever you experienced today is valid.
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
    marginBottom: spacing[32],
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  sliderTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    flex: 1,
  },
  sliderDescription: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    marginBottom: spacing[8],
    fontStyle: 'italic',
    lineHeight: spacing[20],
  },
  valueIndicator: {
    backgroundColor: colorSystem.base.white,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.small,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    minWidth: 40,
    alignItems: 'center',
  },
  valueIndicatorDistress: {
    borderColor: colorSystem.status.error,
    backgroundColor: colorSystem.status.errorBackground,
  },
  valueText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold,
  },
  sliderWrapper: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  customSlider: {
    width: '100%',
  },
  sliderTrack: {
    height: spacing[8],
    borderRadius: borderRadius.xs,
    marginBottom: spacing[8],
  },
  sliderFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sliderButtonText: {
    fontSize: typography.micro.size,
    fontWeight: typography.fontWeight.semibold,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[8],
  },
  labelText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
  },
  responseNote: {
    padding: spacing[8],
    borderRadius: borderRadius.small,
    marginTop: spacing[4],
  },
  responseNoteText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: spacing[20],
  },
  reminderSection: {
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    marginTop: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.themes.evening.primary,
  },
  reminderText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: spacing[20],
    textAlign: 'center',
  },
});

export default EveningValueSlider;