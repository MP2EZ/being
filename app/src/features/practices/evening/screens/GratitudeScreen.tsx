/**
 * GRATITUDE SCREEN (Evening) - FEAT-134 Redesign
 *
 * Screen 2 of 6: 1 required gratitude, up to 3 optional
 * Uses shared AccessibleInput and AccessibleButton components
 *
 * Design Philosophy:
 * - Positive priming before evaluative work
 * - Low friction: 1 required, 2 optional (not 3 required)
 * - Progressive disclosure for 3rd gratitude
 * - Evening theme (dark, calming)
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious
 *   privilege it is to be alive" (Meditations 2:1)
 * - Epictetus: "He is a wise man who does not grieve for the things which he has
 *   not, but rejoices for those which he has"
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, EveningGratitudeData } from '@/features/practices/types/flows';
import { AccessibleInput } from '@/core/components/accessibility/AccessibleInput';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { spacing, borderRadius, typography, colorSystem } from '@/core/theme';

type Props = StackScreenProps<EveningFlowParamList, 'Gratitude'> & {
  onSave?: (data: EveningGratitudeData) => void;
};

const MIN_CHARS = 10;

const GratitudeScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as { initialData?: any } | undefined)?.initialData;

  const [gratitude1, setGratitude1] = useState(initialData?.items?.[0] || '');
  const [gratitude2, setGratitude2] = useState(initialData?.items?.[1] || '');
  const [gratitude3, setGratitude3] = useState(initialData?.items?.[2] || '');
  const [showThird, setShowThird] = useState(!!initialData?.items?.[2]);

  // Only first gratitude is required
  const isValid = gratitude1.trim().length >= MIN_CHARS;

  const handleContinue = () => {
    if (!isValid) return;

    // Collect non-empty gratitudes
    const items = [gratitude1.trim()];
    if (gratitude2.trim()) items.push(gratitude2.trim());
    if (gratitude3.trim()) items.push(gratitude3.trim());

    const gratitudeData: EveningGratitudeData = {
      items,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(gratitudeData);
    }

    navigation.navigate('VirtueReflection');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        testID="gratitude-screen"
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressDots}>
            <View style={styles.dotComplete} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.progressText}>2/6</Text>
        </View>

        {/* Back button */}
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>{"<-"} Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What are you grateful for today?</Text>
        </View>

        {/* Gratitude 1 - Required */}
        <View style={styles.inputSection}>
          <AccessibleInput
            label="Something from today"
            value={gratitude1}
            onChangeText={setGratitude1}
            placeholder="I'm grateful for..."
            multiline
            numberOfLines={2}
            required
            testID="gratitude-1"
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
            labelStyle={styles.inputLabel}
          />
        </View>

        {/* Gratitude 2 - Optional */}
        <View style={styles.inputSection}>
          <AccessibleInput
            label="Add another"
            helperText="optional"
            value={gratitude2}
            onChangeText={setGratitude2}
            placeholder="Something else..."
            multiline
            numberOfLines={2}
            testID="gratitude-2"
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
            labelStyle={styles.inputLabel}
          />
        </View>

        {/* Gratitude 3 - Optional, collapsed by default */}
        {!showThird ? (
          <TouchableOpacity
            style={styles.addThirdButton}
            onPress={() => setShowThird(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a third gratitude"
          >
            <Text style={styles.addThirdText}>+ Add a third</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.inputSection}>
            <AccessibleInput
              label="One more"
              helperText="optional"
              value={gratitude3}
              onChangeText={setGratitude3}
              placeholder="And one more..."
              multiline
              numberOfLines={2}
              testID="gratitude-3"
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              labelStyle={styles.inputLabel}
            />
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.buttonContainer}>
        <AccessibleButton
          onPress={handleContinue}
          label="Continue"
          variant="primary"
          size="large"
          disabled={!isValid}
          testID="continue-button"
          accessibilityHint="Continue to reflection"
        />
        {!isValid && (
          <Text style={styles.validationHint}>
            Add at least one gratitude ({MIN_CHARS}+ characters)
          </Text>
        )}
      </View>
    </View>
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
  contentContainer: {
    padding: spacing[20],
    paddingTop: spacing[48],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  progressDots: {
    flexDirection: 'row',
    gap: spacing[8],
    marginRight: spacing[12],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colorSystem.gray[500],
  },
  dotActive: {
    backgroundColor: colorSystem.themes.evening.primary,
  },
  dotComplete: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colorSystem.status.success,
  },
  progressText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[400],
  },
  backButton: {
    marginBottom: spacing[16],
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.themes.evening.primary,
  },
  header: {
    marginBottom: spacing[24],
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  inputSection: {
    marginBottom: spacing[16],
  },
  inputContainer: {
    marginBottom: 0,
  },
  input: {
    backgroundColor: colorSystem.gray[700],
    borderColor: colorSystem.gray[600],
    color: colorSystem.base.white,
  },
  inputLabel: {
    color: colorSystem.base.white,
  },
  addThirdButton: {
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.gray[600],
    borderStyle: 'dashed',
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  addThirdText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[400],
  },
  spacer: {
    height: spacing[96],
  },
  buttonContainer: {
    padding: spacing[20],
    paddingBottom: spacing[32],
    backgroundColor: colorSystem.themes.evening.background,
  },
  validationHint: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[400],
    textAlign: 'center',
    marginTop: spacing[8],
    fontStyle: 'italic',
  },
});

export default GratitudeScreen;
