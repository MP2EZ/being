/**
 * Physical Metrics Screen - DRD-FLOW-002 Screen 4
 * Physical wellness assessment with clinical safety modifications
 * Clinical: CRITICAL - Physical Comfort replaces Anxiety Level per safety requirements
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius } from '../../../constants/colors';
import { MorningFlowParamList } from '../../../types/flows';
import { ValueSlider } from '../../shared/components';

type PhysicalMetricsScreenNavigationProp = StackNavigationProp<MorningFlowParamList, 'PhysicalMetrics'>;

const PhysicalMetricsScreen: React.FC = () => {
  const navigation = useNavigation<PhysicalMetricsScreenNavigationProp>();
  
  // Default values with positive bias per clinical safety
  const [sleepQuality, setSleepQuality] = useState(7);
  const [energyLevel, setEnergyLevel] = useState(6);
  const [physicalComfort, setPhysicalComfort] = useState(7); // CRITICAL: Replaces anxiety

  const handleContinue = () => {
    navigation.navigate('ValuesIntention');
  };

  // Wellness summary calculation
  const getWellnessSummary = () => {
    const average = (sleepQuality + energyLevel + physicalComfort) / 3;
    if (average >= 7.5) return { text: 'feeling well', color: colorSystem.status.success };
    if (average >= 5.5) return { text: 'doing okay', color: colorSystem.themes.morning.primary };
    return { text: 'being gentle with yourself', color: colorSystem.status.info };
  };

  const wellnessSummary = getWellnessSummary();

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
            How is your body feeling?
          </Text>
          <Text style={styles.subInstructionText}>
            Take a moment to notice your physical state this morning. Adjust the sliders to reflect how you feel.
          </Text>
        </View>

        {/* Value Sliders Component */}
        <View style={styles.sliderSection}>
          <ValueSlider
            sleepQuality={sleepQuality}
            energyLevel={energyLevel}
            physicalComfort={physicalComfort}
            onSleepChange={setSleepQuality}
            onEnergyChange={setEnergyLevel}
            onPhysicalComfortChange={setPhysicalComfort}
            theme="morning"
          />
        </View>

        {/* Wellness Overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.overviewTitle}>
            Your Morning Wellness
          </Text>
          <Text style={[
            styles.overviewText,
            { color: wellnessSummary.color }
          ]}>
            You're {wellnessSummary.text} this morning
          </Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Sleep</Text>
              <Text style={[styles.metricValue, { color: colorSystem.themes.morning.primary }]}>
                {Math.round(sleepQuality)}/10
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Energy</Text>
              <Text style={[styles.metricValue, { color: colorSystem.themes.morning.primary }]}>
                {Math.round(energyLevel)}/10
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Comfort</Text>
              <Text style={[styles.metricValue, { color: colorSystem.themes.morning.primary }]}>
                {Math.round(physicalComfort)}/10
              </Text>
            </View>
          </View>
        </View>

        {/* Supportive Note */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>
            🌱 Remember
          </Text>
          <Text style={styles.supportText}>
            Your body's messages are valuable information. Whatever you're feeling is valid and deserves compassion.
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
          accessibilityLabel="Continue to values and intentions"
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
  sliderSection: {
    marginBottom: spacing.xl,
  },
  overviewSection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.medium,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  overviewText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: colorSystem.gray[600],
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  supportSection: {
    backgroundColor: colorSystem.themes.morning.light,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  supportText: {
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

export default PhysicalMetricsScreen;