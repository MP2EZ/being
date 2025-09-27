/**
 * Values & Intention Screen - DRD-FLOW-002 Screen 5
 * Values-based intention setting with empowerment through intentional living
 * Clinical: Focus on empowerment, personal agency, meaningful direction
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius } from '../../../constants/colors';
import { MorningFlowParamList } from '../../../types/flows';

type ValuesIntentionScreenNavigationProp = StackNavigationProp<MorningFlowParamList, 'ValuesIntention'>;

// Core values with therapeutic framing
const CORE_VALUES = [
  { name: 'Connection', emoji: '🤝', description: 'Meaningful relationships' },
  { name: 'Growth', emoji: '🌱', description: 'Learning and evolving' },
  { name: 'Compassion', emoji: '💙', description: 'Kindness to self and others' },
  { name: 'Authenticity', emoji: '✨', description: 'Being true to yourself' },
  { name: 'Purpose', emoji: '🎯', description: 'Making a difference' },
  { name: 'Balance', emoji: '⚖️', description: 'Harmony in life' }
];

const ValuesIntentionScreen: React.FC = () => {
  const navigation = useNavigation<ValuesIntentionScreenNavigationProp>();
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [intention, setIntention] = useState('');

  const handleValuePress = (valueName: string) => {
    // Haptic feedback for selection
    Vibration.vibrate(50);
    
    setSelectedValues(prev => {
      if (prev.includes(valueName)) {
        return prev.filter(v => v !== valueName);
      } else {
        // Limit to 3 values for focus
        if (prev.length >= 3) {
          return [...prev.slice(1), valueName];
        }
        return [...prev, valueName];
      }
    });
  };

  const handleContinue = () => {
    navigation.navigate('DreamJournal');
  };

  const isValueSelected = (valueName: string) => selectedValues.includes(valueName);

  const ValueButton: React.FC<{ value: typeof CORE_VALUES[0] }> = ({ value }) => {
    const selected = isValueSelected(value.name);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.valueButton,
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
        onPress={() => handleValuePress(value.name)}
        accessibilityRole="button"
        accessibilityLabel={`${value.name}: ${value.description}`}
        accessibilityHint={`Tap to ${selected ? 'deselect' : 'select'} ${value.name} as a core value`}
        accessibilityState={{ selected }}
      >
        <Text style={styles.valueEmoji}>
          {value.emoji}
        </Text>
        <Text style={[
          styles.valueName,
          {
            color: selected 
              ? colorSystem.base.white 
              : colorSystem.base.black
          }
        ]}>
          {value.name}
        </Text>
        <Text style={[
          styles.valueDescription,
          {
            color: selected 
              ? colorSystem.base.white 
              : colorSystem.gray[600]
          }
        ]}>
          {value.description}
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
            What matters most to you today?
          </Text>
          <Text style={styles.subInstructionText}>
            Choose up to 3 values that feel most important for today. These will guide your intentions.
          </Text>
        </View>

        {/* Values Grid - 2 columns, 3 rows */}
        <View style={styles.valuesSection}>
          <Text style={styles.sectionTitle}>Core Values</Text>
          <View style={styles.gridContainer}>
            {CORE_VALUES.map((value) => (
              <ValueButton key={value.name} value={value} />
            ))}
          </View>
          
          {selectedValues.length === 3 && (
            <View style={styles.limitNote}>
              <Text style={styles.limitText}>
                💫 Perfect! You've selected 3 values for focused intention.
              </Text>
            </View>
          )}
        </View>

        {/* Intention Setting */}
        {selectedValues.length > 0 && (
          <View style={styles.intentionSection}>
            <Text style={styles.sectionTitle}>Daily Intention</Text>
            <Text style={styles.intentionPrompt}>
              Based on your values of {selectedValues.join(', ')}, what intention will guide you today?
            </Text>
            
            <View style={styles.intentionInputContainer}>
              <Text style={styles.inputPrefix}>Today I will...</Text>
              <TextInput
                style={styles.intentionInput}
                multiline
                numberOfLines={3}
                value={intention}
                onChangeText={setIntention}
                placeholder="be present with my family, focus on meaningful work, practice self-compassion..."
                placeholderTextColor={colorSystem.gray[500]}
                textAlignVertical="top"
                maxLength={200}
                accessibilityLabel="Daily intention text input"
                accessibilityHint="Describe your intention for today based on your selected values"
              />
            </View>
            
            <View style={styles.characterCount}>
              <Text style={styles.countText}>
                {intention.length}/200 characters
              </Text>
            </View>
          </View>
        )}

        {/* Values Summary */}
        {selectedValues.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>
              Your Values Foundation
            </Text>
            <Text style={styles.summaryText}>
              {selectedValues.join(' • ')}
            </Text>
            {intention.length > 0 && (
              <View style={styles.intentionSummary}>
                <Text style={styles.intentionLabel}>Today I will:</Text>
                <Text style={styles.intentionText}>{intention}</Text>
              </View>
            )}
          </View>
        )}

        {/* Empowerment Note */}
        <View style={styles.empowermentSection}>
          <Text style={styles.empowermentTitle}>
            🌟 Your Inner Compass
          </Text>
          <Text style={styles.empowermentText}>
            Your values are your inner compass, guiding you toward a life of meaning and authenticity. 
            Trust them to lead you well.
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
          accessibilityLabel="Continue to dream reflection"
          accessibilityHint="Move to the final step of your morning check-in"
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
  valuesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  valueButton: {
    width: '48%', // 2 columns with gap
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100, // Larger touch target for values
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  valueEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  valueName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  valueDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  limitNote: {
    backgroundColor: colorSystem.themes.morning.light,
    padding: spacing.sm,
    borderRadius: borderRadius.small,
    marginTop: spacing.sm,
  },
  limitText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    textAlign: 'center',
    fontStyle: 'italic',
  },
  intentionSection: {
    marginBottom: spacing.xl,
  },
  intentionPrompt: {
    fontSize: 16,
    color: colorSystem.gray[700],
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  intentionInputContainer: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '500',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  intentionInput: {
    fontSize: 16,
    color: colorSystem.base.black,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  countText: {
    fontSize: 12,
    color: colorSystem.gray[500],
  },
  summarySection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.themes.morning.primary,
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
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    marginBottom: spacing.sm,
  },
  intentionSummary: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colorSystem.gray[200],
  },
  intentionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  intentionText: {
    fontSize: 14,
    color: colorSystem.gray[700],
    fontStyle: 'italic',
    lineHeight: 20,
  },
  empowermentSection: {
    backgroundColor: colorSystem.themes.morning.light,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
  },
  empowermentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  empowermentText: {
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

export default ValuesIntentionScreen;