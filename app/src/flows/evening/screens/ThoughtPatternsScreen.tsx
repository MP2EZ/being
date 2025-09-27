/**
 * Evening Thought Patterns Screen
 * CRITICAL CLINICAL SAFETY: Educational, non-pathologizing approach
 * - Normalizes thought patterns as human experiences
 * - Overflow detection for multiple pattern selection
 * - Supportive messaging throughout
 * - Evening-appropriate processing
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import { ThoughtPatternGrid, OverflowSupport, SafetyButton, ThoughtPattern } from '../../shared/components';

const ThoughtPatternsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedPatterns, setSelectedPatterns] = useState<ThoughtPattern[]>([]);
  const [showOverflowSupport, setShowOverflowSupport] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handlePatternsSelected = (patterns: ThoughtPattern[]) => {
    setSelectedPatterns(patterns);
    setHasInteracted(true);
  };

  const handleOverflowDetected = (selectedCount: number) => {
    setShowOverflowSupport(true);
  };

  const handleContinue = () => {
    navigation.navigate('TomorrowPrep' as never);
  };

  const canContinue = hasInteracted; // Can continue after any interaction

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Educational Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Observing Thought Patterns</Text>
            <Text style={styles.subtitle}>
              These are normal ways minds work - noticing them is wisdom, not a problem
            </Text>
          </View>

          {/* Thought Pattern Grid */}
          <View style={styles.patternSection}>
            <ThoughtPatternGrid
              onPatternsSelected={handlePatternsSelected}
              onOverflowDetected={handleOverflowDetected}
              theme="evening"
            />
          </View>

          {/* Selection Summary */}
          {selectedPatterns.length > 0 && (
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>Patterns You Noticed Today</Text>
              {selectedPatterns.map((pattern, index) => (
                <View key={pattern.id} style={styles.summaryItem}>
                  <Text style={styles.summaryPattern}>
                    {index + 1}. {pattern.title}
                  </Text>
                </View>
              ))}
              
              <View style={styles.affirmationBox}>
                <Text style={styles.affirmationText}>
                  {selectedPatterns.length >= 3
                    ? "You're developing deep awareness. This skill of noticing is exactly how mindfulness grows."
                    : "Whatever patterns you noticed, you're developing the skill of awareness. This is exactly how mindfulness grows."
                  }
                </Text>
              </View>
            </View>
          )}

          {/* No Selection Encouragement */}
          {hasInteracted && selectedPatterns.length === 0 && (
            <View style={styles.noSelectionSection}>
              <Text style={styles.noSelectionText}>
                🌿 Not noticing these particular patterns today is also wisdom. 
                Every mind is different, and awareness takes many forms.
              </Text>
            </View>
          )}

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
              accessibilityLabel={canContinue ? "Continue to tomorrow preparation" : "Please interact with the patterns to continue"}
            >
              <Text style={[
                styles.continueButtonText,
                {
                  color: canContinue 
                    ? colorSystem.base.white 
                    : colorSystem.gray[500]
                }
              ]}>
                {canContinue ? "Prepare for Tomorrow" : "Explore the patterns above"}
              </Text>
            </Pressable>
            
            {/* Safety Button Always Present */}
            <View style={styles.safetyButtonContainer}>
              <SafetyButton onPress={() => setShowOverflowSupport(true)} />
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
        triggerReason="overflow"
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
  patternSection: {
    marginBottom: spacing.xl,
  },
  summarySection: {
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colorSystem.themes.evening.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryItem: {
    marginBottom: spacing.sm,
  },
  summaryPattern: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
  },
  affirmationBox: {
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    marginTop: spacing.md,
  },
  affirmationText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  noSelectionSection: {
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colorSystem.themes.evening.primary,
  },
  noSelectionText: {
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

export default ThoughtPatternsScreen;