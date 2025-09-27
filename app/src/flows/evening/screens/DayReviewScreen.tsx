/**
 * Evening Day Review Screen
 * CRITICAL CLINICAL SAFETY MODIFICATIONS:
 * - NO default slider values (prevents comparison pressure)
 * - Distress detection for low values
 * - Gentle therapeutic language
 * - Overflow support integration
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import { EveningValueSlider, OverflowSupport, SafetyButton } from '../../shared/components';

const DayReviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const [overallMood, setOverallMood] = useState<number | null>(null);
  const [energyManagement, setEnergyManagement] = useState<number | null>(null);
  const [valuesAlignment, setValuesAlignment] = useState<number | null>(null);
  const [showOverflowSupport, setShowOverflowSupport] = useState(false);
  const [distressType, setDistressType] = useState<'distress' | 'overflow' | 'difficulty'>('distress');

  // CRITICAL: Distress detection handler
  const handleDistressDetected = (type: 'mood' | 'energy' | 'values', value: number) => {
    setDistressType('distress');
    setShowOverflowSupport(true);
  };

  const handleContinue = () => {
    if (overallMood !== null || energyManagement !== null || valuesAlignment !== null) {
      navigation.navigate('PleasantUnpleasant' as never);
    }
  };

  const canContinue = overallMood !== null || energyManagement !== null || valuesAlignment !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Clinical Safety Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Gently reflecting on your day...</Text>
            <Text style={styles.subtitle}>
              Notice without needing to change or judge what you experienced today
            </Text>
          </View>

          {/* Value Sliders with Clinical Safety */}
          <View style={styles.slidersSection}>
            <EveningValueSlider
              overallMood={overallMood}
              energyManagement={energyManagement}
              valuesAlignment={valuesAlignment}
              onMoodChange={setOverallMood}
              onEnergyChange={setEnergyManagement}
              onValuesChange={setValuesAlignment}
              onDistressDetected={handleDistressDetected}
            />
          </View>

          {/* Gentle Guidance */}
          <View style={styles.guidanceSection}>
            <Text style={styles.guidanceText}>
              💝 These reflections are gifts to yourself - information, not judgment.
            </Text>
          </View>

          {/* Continue Button */}
          <View style={styles.buttonSection}>
            <Pressable
              style={[
                styles.continueButton,
                {
                  backgroundColor: canContinue 
                    ? colorSystem.themes.evening.primary 
                    : colorSystem.gray[300],
                }
              ]}
              onPress={handleContinue}
              disabled={!canContinue}
              accessibilityRole="button"
              accessibilityLabel={canContinue ? "Continue to next step" : "Please select at least one value to continue"}
            >
              <Text style={[
                styles.continueButtonText,
                {
                  color: canContinue 
                    ? colorSystem.base.white 
                    : colorSystem.gray[500]
                }
              ]}>
                {canContinue ? "Continue with Kindness" : "Choose one to continue"}
              </Text>
            </Pressable>
            
            {/* Safety Button Always Present */}
            <View style={styles.safetyButtonContainer}>
              <SafetyButton onPress={() => {
                setDistressType('difficulty');
                setShowOverflowSupport(true);
              }} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Overflow Support Modal */}
      <OverflowSupport
        visible={showOverflowSupport}
        onClose={() => setShowOverflowSupport(false)}
        onBreathingSpace={() => {
          setShowOverflowSupport(false);
          // TODO: Navigate to breathing exercise
        }}
        onSkipToCompletion={() => {
          setShowOverflowSupport(false);
          navigation.navigate('TomorrowPrep' as never);
        }}
        onCrisisSupport={() => {
          setShowOverflowSupport(false);
          // TODO: Navigate to crisis support
        }}
        triggerReason={distressType}
        theme="evening"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.themes.evening.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.base.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  slidersSection: {
    marginBottom: spacing.xl,
  },
  guidanceSection: {
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colorSystem.themes.evening.primary,
  },
  guidanceText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonSection: {
    gap: spacing.md,
  },
  continueButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  continueButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    textAlign: 'center',
  },
  safetyButtonContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
});

export default DayReviewScreen;