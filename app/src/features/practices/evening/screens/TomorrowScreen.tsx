/**
 * TOMORROW SCREEN - FEAT-134 Evening Flow Redesign
 *
 * Screen 5 of 6: Optional intention (skippable)
 * Uses shared AccessibleInput and AccessibleButton components
 *
 * Design Philosophy:
 * - Fully optional - respects users who just want to rest
 * - Progressive disclosure for "letting go" field
 * - Evening theme (dark, calming)
 * - NOT anxiety-inducing planning
 *
 * Stoic Philosophy:
 * - Marcus Aurelius: "Confine yourself to the present" (Meditations 7:29)
 * - Seneca: "True happiness is to enjoy the present, without anxious
 *   dependence upon the future" (Letters 23)
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
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
import type { EveningFlowParamList, TomorrowData } from '@/features/practices/types/flows';
import { AccessibleInput } from '@/core/components/accessibility/AccessibleInput';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { spacing, borderRadius, typography, colorSystem } from '@/core/theme';

type Props = StackScreenProps<EveningFlowParamList, 'Tomorrow'> & {
  onSave?: (data: TomorrowData) => void;
};

const TomorrowScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as { initialData?: any } | undefined)?.initialData;

  const [intention, setIntention] = useState(initialData?.intention || '');
  const [lettingGo, setLettingGo] = useState(initialData?.lettingGo || '');
  const [showLettingGo, setShowLettingGo] = useState(!!initialData?.lettingGo);

  // Always valid - this screen is fully optional/skippable
  const handleContinue = () => {
    const tomorrowData: TomorrowData = {
      intention: intention.trim() || undefined,
      lettingGo: lettingGo.trim() || undefined,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(tomorrowData);
    }

    navigation.navigate('SleepTransition');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        testID="tomorrow-screen"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Any intention for tomorrow?</Text>
          <Text style={styles.subtitle}>(optional)</Text>
        </View>

        {/* Intention input - optional */}
        <View style={styles.inputSection}>
          <AccessibleInput
            label=""
            value={intention}
            onChangeText={setIntention}
            placeholder="What matters tomorrow..."
            multiline
            numberOfLines={2}
            testID="intention-input"
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
          />
        </View>

        {/* Letting go - collapsed by default */}
        {!showLettingGo ? (
          <TouchableOpacity
            style={styles.addLettingGoButton}
            onPress={() => setShowLettingGo(true)}
            accessibilityRole="button"
            accessibilityLabel="Add what you want to let go of"
          >
            <Text style={styles.addLettingGoText}>+ Anything you want to let go of tonight?</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.inputSection}>
            <AccessibleInput
              label="What can you let go of tonight?"
              helperText="optional"
              value={lettingGo}
              onChangeText={setLettingGo}
              placeholder="Release what's not in your control..."
              multiline
              numberOfLines={2}
              testID="letting-go-input"
              containerStyle={styles.inputContainer}
              inputStyle={styles.input}
              labelStyle={styles.inputLabel}
            />
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Fixed bottom button - always enabled (skippable) */}
      <View style={styles.buttonContainer}>
        <AccessibleButton
          onPress={handleContinue}
          label="Continue"
          variant="primary"
          size="large"
          testID="continue-button"
          accessibilityHint="Continue to sleep transition"
        />
        <Text style={styles.skipHint}>
          Skip if you just want to rest
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white, // White content area (matches morning/midday)
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[20],
  },
  header: {
    marginBottom: spacing[24],
  },
  title: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[500],
    marginTop: spacing[4],
  },
  inputSection: {
    marginBottom: spacing[16],
  },
  inputContainer: {
    marginBottom: 0,
  },
  input: {
    backgroundColor: colorSystem.base.white,
    borderColor: colorSystem.gray[300],
    color: colorSystem.base.black,
  },
  inputLabel: {
    color: colorSystem.base.black,
  },
  addLettingGoButton: {
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderStyle: 'dashed',
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  addLettingGoText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[500],
  },
  spacer: {
    height: spacing[96],
  },
  buttonContainer: {
    padding: spacing[20],
    paddingBottom: spacing[32],
    backgroundColor: colorSystem.base.white,
  },
  skipHint: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'center',
    marginTop: spacing[8],
    fontStyle: 'italic',
  },
});

export default TomorrowScreen;
