/**
 * Evening Pleasant & Unpleasant Events Screen
 * CRITICAL CLINICAL SAFETY MODIFICATIONS:
 * - REDUCED unpleasant fields from 2 to 1 (prevents rumination)
 * - Skip option prominently available for difficult content
 * - Evening-appropriate safety language
 * - Gentle bedtime processing approach
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colorSystem, spacing, typography, borderRadius } from '../../../constants/colors';
import { OverflowSupport, SafetyButton } from '../../shared/components';

const PleasantUnpleasantScreen: React.FC = () => {
  const navigation = useNavigation();
  const [pleasant1, setPleasant1] = useState('');
  const [pleasant2, setPleasant2] = useState('');
  const [unpleasant, setUnpleasant] = useState(''); // CRITICAL: Only 1 field
  const [learning, setLearning] = useState('');
  const [showOverflowSupport, setShowOverflowSupport] = useState(false);
  const [skippedUnpleasant, setSkippedUnpleasant] = useState(false);

  const handleContinue = () => {
    const hasContent = pleasant1.trim() || pleasant2.trim() || unpleasant.trim() || learning.trim() || skippedUnpleasant;
    if (hasContent) {
      navigation.navigate('ThoughtPatterns' as never);
    }
  };

  const handleSkipUnpleasant = () => {
    setSkippedUnpleasant(true);
    setUnpleasant('');
  };

  const canContinue = pleasant1.trim() || pleasant2.trim() || unpleasant.trim() || learning.trim() || skippedUnpleasant;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Clinical Safety Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Notice Without Judging</Text>
            <Text style={styles.subtitle}>
              Gently acknowledge what your day brought, knowing all experiences are valid
            </Text>
          </View>

          {/* Pleasant Events Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌟 What brought you a moment of ease or joy today?</Text>
            <Text style={styles.sectionNote}>Even small moments count</Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="A moment that felt good..."
              placeholderTextColor={colorSystem.gray[500]}
              value={pleasant1}
              onChangeText={setPleasant1}
              multiline
              textAlignVertical="top"
              accessibilityLabel="First pleasant moment"
            />
            
            <TextInput
              style={styles.textInput}
              placeholder="Another moment of ease or lightness..."
              placeholderTextColor={colorSystem.gray[500]}
              value={pleasant2}
              onChangeText={setPleasant2}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Second pleasant moment"
            />
          </View>

          {/* Unpleasant Events Section - CRITICAL: Reduced to 1 field */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌧️ What felt challenging today?</Text>
            <Text style={styles.cautionNote}>
              You can skip if it feels too heavy for bedtime
            </Text>
            <Text style={styles.safetyNote}>
              It's okay to acknowledge briefly and let it rest for tonight
            </Text>
            
            {!skippedUnpleasant ? (
              <>
                <TextInput
                  style={styles.textInput}
                  placeholder="Something that felt difficult..."
                  placeholderTextColor={colorSystem.gray[500]}
                  value={unpleasant}
                  onChangeText={setUnpleasant}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Challenging moment"
                />
                
                <Pressable
                  style={styles.skipButton}
                  onPress={handleSkipUnpleasant}
                  accessibilityRole="button"
                  accessibilityLabel="Skip this section for tonight"
                >
                  <Text style={styles.skipButtonText}>Skip this for tonight</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.skippedContainer}>
                <Text style={styles.skippedText}>
                  ✨ You chose gentleness tonight. That's wisdom.
                </Text>
                <Pressable
                  style={styles.unskipButton}
                  onPress={() => setSkippedUnpleasant(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Return to this section"
                >
                  <Text style={styles.unskipButtonText}>I'd like to share after all</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Learning Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💎 What gentle wisdom did today offer?</Text>
            <Text style={styles.sectionNote}>
              This can be very simple - even "I got through today" is enough
            </Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="I learned..."
              placeholderTextColor={colorSystem.gray[500]}
              value={learning}
              onChangeText={setLearning}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Learning from today"
            />
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
              accessibilityLabel={canContinue ? "Continue to next step" : "Please add some reflection to continue"}
            >
              <Text style={[
                styles.continueButtonText,
                {
                  color: canContinue 
                    ? colorSystem.base.white 
                    : colorSystem.gray[500]
                }
              ]}>
                {canContinue ? "Continue Gently" : "Share something to continue"}
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
        triggerReason="difficulty"
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
  section: {
    marginBottom: spacing.xl,
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
    borderRadius: borderRadius.large,
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs,
  },
  sectionNote: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  cautionNote: {
    fontSize: typography.caption.size,
    color: colorSystem.status.warning,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  safetyNote: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[600],
    marginBottom: spacing.md,
    fontStyle: 'italic',
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.sm,
    borderRadius: borderRadius.small,
  },
  textInput: {
    backgroundColor: colorSystem.gray[50],
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.base.black,
    minHeight: 80,
    marginBottom: spacing.md,
  },
  skipButton: {
    backgroundColor: colorSystem.themes.evening.light,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colorSystem.themes.evening.primary,
  },
  skipButtonText: {
    fontSize: typography.caption.size,
    color: colorSystem.themes.evening.primary,
    fontWeight: '600',
  },
  skippedContainer: {
    backgroundColor: colorSystem.themes.evening.background,
    padding: spacing.md,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  skippedText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  unskipButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  unskipButtonText: {
    fontSize: typography.caption.size,
    color: colorSystem.themes.evening.primary,
    textDecorationLine: 'underline',
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

export default PleasantUnpleasantScreen;