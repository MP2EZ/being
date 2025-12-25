/**
 * SELF-COMPASSION SCREEN - FEAT-134 Evening Flow Redesign
 *
 * Screen 4 of 6: Dedicated self-kindness (required)
 * Uses shared AccessibleInput and AccessibleButton components
 *
 * Design Philosophy:
 * - Dedicated screen ensures self-compassion isn't skipped
 * - Quick-tap starters reduce friction
 * - Evening theme (dark, calming)
 * - Prevents harsh Stoicism
 *
 * Classical Stoic Practice with Modern Balance:
 * - Marcus Aurelius: "Be tolerant with others and strict with yourself"
 *   (Meditations 10:4) - But NOT harshly strict!
 * - Seneca: Self-compassion prevents exaggerating our failures
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
import type { EveningFlowParamList, SelfCompassionData } from '@/features/practices/types/flows';
import { AccessibleInput } from '@/core/components/accessibility/AccessibleInput';
import { AccessibleButton } from '@/core/components/accessibility/AccessibleButton';
import { spacing, borderRadius, typography, colorSystem } from '@/core/theme';

type Props = StackScreenProps<EveningFlowParamList, 'SelfCompassion'> & {
  onSave?: (data: SelfCompassionData) => void;
};

const MIN_CHARS = 10;

// Quick-tap starters to reduce friction
const QUICK_STARTERS = [
  'I did my best',
  "I'm learning",
  "Tomorrow's new",
];

const SelfCompassionScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as { initialData?: any } | undefined)?.initialData;

  const [reflection, setReflection] = useState(initialData?.reflection || '');

  const isValid = reflection.trim().length >= MIN_CHARS;

  const handleQuickStarter = (starter: string) => {
    setReflection(starter);
  };

  const handleContinue = () => {
    if (!isValid) return;

    const data: SelfCompassionData = {
      reflection: reflection.trim(),
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(data);
    }

    navigation.navigate('Tomorrow');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        testID="self-compassion-screen"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>What kindness can you offer yourself?</Text>
          <Text style={styles.subtitle}>
            The Stoics practiced self-examination with gentleness, not harsh self-judgment
          </Text>
        </View>

        {/* Main input */}
        <View style={styles.inputSection}>
          <AccessibleInput
            label=""
            value={reflection}
            onChangeText={setReflection}
            placeholder="I did my best with what I knew and had today..."
            multiline
            numberOfLines={4}
            testID="compassion-input"
            containerStyle={styles.inputContainer}
            inputStyle={styles.input}
          />
        </View>

        {/* Quick starters */}
        {reflection.length < MIN_CHARS && (
          <View style={styles.quickStartersSection}>
            <Text style={styles.quickStartersLabel}>Quick starters:</Text>
            <View style={styles.quickStartersRow}>
              {QUICK_STARTERS.map((starter) => (
                <TouchableOpacity
                  key={starter}
                  style={styles.quickStarterChip}
                  onPress={() => handleQuickStarter(starter)}
                  accessibilityRole="button"
                  accessibilityLabel={`Use starter: ${starter}`}
                >
                  <Text style={styles.quickStarterText}>{starter}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
          accessibilityHint="Continue to tomorrow's intention"
        />
        {!isValid && (
          <Text style={styles.validationHint}>
            Add a self-compassion note ({MIN_CHARS}+ characters)
          </Text>
        )}
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
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
    fontStyle: 'italic',
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
    minHeight: 120,
  },
  quickStartersSection: {
    marginBottom: spacing[24],
  },
  quickStartersLabel: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    marginBottom: spacing[8],
  },
  quickStartersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  quickStarterChip: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
  },
  quickStarterText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[600],
  },
  spacer: {
    height: spacing[96],
  },
  buttonContainer: {
    padding: spacing[20],
    paddingBottom: spacing[32],
    backgroundColor: colorSystem.base.white,
  },
  validationHint: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    textAlign: 'center',
    marginTop: spacing[8],
    fontStyle: 'italic',
  },
});

export default SelfCompassionScreen;
