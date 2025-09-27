/**
 * Body Scan Screen - DRD-FLOW-002 Screen 1
 * Therapeutic body awareness with inclusive, gentle language
 * MBCT compliance: Present-moment awareness, non-judgmental observation
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

type BodyScanScreenNavigationProp = StackNavigationProp<MorningFlowParamList, 'BodyScan'>;

// Body areas with inclusive, therapeutic language
const BODY_AREAS = [
  'Head',
  'Neck', 
  'Shoulders',
  'Chest',
  'Upper Back',
  'Lower Back',
  'Stomach',
  'Hips',
  'Legs',
  'Feet'
];

const BodyScanScreen: React.FC = () => {
  const navigation = useNavigation<BodyScanScreenNavigationProp>();
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const handleAreaPress = (area: string) => {
    // Haptic feedback for selection
    Vibration.vibrate(50);
    
    setSelectedAreas(prev => {
      if (prev.includes(area)) {
        return prev.filter(a => a !== area);
      } else {
        return [...prev, area];
      }
    });
  };

  const handleContinue = () => {
    // Navigate to next screen
    navigation.navigate('EmotionRecognition');
  };

  const isAreaSelected = (area: string) => selectedAreas.includes(area);

  const BodyAreaButton: React.FC<{ area: string; index: number }> = ({ area, index }) => {
    const selected = isAreaSelected(area);
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.areaButton,
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
        onPress={() => handleAreaPress(area)}
        accessibilityRole="button"
        accessibilityLabel={`${area} body area`}
        accessibilityHint={`Tap to ${selected ? 'deselect' : 'select'} ${area} for body awareness`}
        accessibilityState={{ selected }}
      >
        <Text style={[
          styles.areaButtonText,
          {
            color: selected 
              ? colorSystem.base.white 
              : colorSystem.base.black
          }
        ]}>
          {area}
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
            Take a moment to notice your body
          </Text>
          <Text style={styles.subInstructionText}>
            Select any areas where you notice sensations, tension, or simply want to bring awareness.
          </Text>
        </View>

        {/* Body Area Grid - 2 columns, 5 rows */}
        <View style={styles.gridContainer}>
          {BODY_AREAS.map((area, index) => (
            <BodyAreaButton key={area} area={area} index={index} />
          ))}
        </View>

        {/* Selection Summary */}
        {selectedAreas.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>
              Areas of awareness:
            </Text>
            <Text style={styles.summaryText}>
              {selectedAreas.join(', ')}
            </Text>
          </View>
        )}

        {/* Mindful Note */}
        <View style={styles.noteSection}>
          <Text style={styles.noteText}>
            💡 Remember, there's no "right" or "wrong" way to feel. Simply notice what's here with kindness.
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
          accessibilityLabel="Continue to emotion recognition"
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
  areaButton: {
    width: '48%', // 2 columns with gap
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.medium,
    borderWidth: 2,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56, // WCAG AA touch target size
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  areaButtonText: {
    fontSize: 16,
    fontWeight: '500',
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

export default BodyScanScreen;