/**
 * RELATIONAL CLOSE SCREEN - FEAT-139 Morning Flow UX Refactor
 *
 * Screen 4: NEW screen adding missing Interconnected Living principle.
 * Brief relational awareness to close the morning flow.
 *
 * Time: 30-60s | Principle: Interconnected Living | Required inputs: None
 *
 * Key Design Decisions (Philosopher validated 9/10):
 * - All inputs optional (low friction close)
 * - "Begin Your Day" always enabled (respects user agency)
 * - Forward-oriented language (not "Complete" or "Finish")
 * - Quote rotates daily (5-7 quotes on interconnectedness)
 * - No celebration toast (orient toward the day, not self-congratulation)
 *
 * Classical Stoic Foundation:
 * - Marcus Aurelius: "We were born to work together like feet, hands, and eyes"
 *   (Meditations 2:1)
 * - Seneca: "We are members of one great body" (Letters 95:52)
 * - Epictetus: Oikeiosis - natural affinity extending to all humanity
 *
 * @see /docs/product/stoic-mindfulness/principles/05-interconnected-living.md
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList, RelationalCloseData } from '@/features/practices/types/flows';
import { FlowBackButton, SkipLink, StoicQuoteCard, FlowHeader } from '../../shared/components';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

// Re-export for backward compatibility
export type { RelationalCloseData } from '@/features/practices/types/flows';

/**
 * Relational quotes from classical Stoic sources
 * Rotates daily based on date
 */
const RELATIONAL_QUOTES = [
  {
    text: 'We were born to work together like feet, hands, and eyes.',
    author: 'Marcus Aurelius',
    source: 'Meditations 2:1',
  },
  {
    text: 'What injures the hive injures the bee.',
    author: 'Marcus Aurelius',
    source: 'Meditations 6:54',
  },
  {
    text: 'We are members of one great body.',
    author: 'Seneca',
    source: 'Letters 95:52',
  },
  {
    text: 'Never esteem anything as of advantage to you that will make you break your word or lose your self-respect.',
    author: 'Marcus Aurelius',
    source: 'Meditations 3:7',
  },
  {
    text: 'The fruit of this life is a good character and acts for the common good.',
    author: 'Marcus Aurelius',
    source: 'Meditations 6:30',
  },
  {
    text: 'To expect an impossibility is madness. And it is impossible that bad people will not do bad things.',
    author: 'Marcus Aurelius',
    source: 'Meditations 5:17',
  },
  {
    text: 'Begin the morning by saying to yourself: I shall meet with the meddling, ungrateful, arrogant, dishonest... But I cannot be angry.',
    author: 'Marcus Aurelius',
    source: 'Meditations 2:1',
  },
];

type Props = StackScreenProps<MorningFlowParamList, 'RelationalClose'> & {
  onSave?: (data: RelationalCloseData) => void;
};

const RelationalCloseScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as RelationalCloseData | undefined;

  const [encounters, setEncounters] = useState(initialData?.encounters || '');
  const [practice, setPractice] = useState(initialData?.practice || '');

  // Select quote based on day of year (rotates daily)
  const dailyQuote = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    // RELATIONAL_QUOTES has 7 items, so this will never be undefined
    return RELATIONAL_QUOTES[dayOfYear % RELATIONAL_QUOTES.length]!;
  }, []);

  const handleBeginDay = () => {
    const data: RelationalCloseData = {
      encounters: encounters.trim() || null,
      practice: practice.trim() || null,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(data);
    }

    // Navigate to completion - this signals flow is done
    navigation.navigate('MorningCompletion' as never);
  };

  const handleSkip = () => {
    const data: RelationalCloseData = {
      encounters: null,
      practice: null,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(data);
    }

    navigation.navigate('MorningCompletion' as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID="relational-close-screen"
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <FlowBackButton onPress={() => navigation.goBack()} theme="morning" />

        {/* Quote Card */}
        <StoicQuoteCard
          quote={dailyQuote.text}
          author={dailyQuote.author}
          source={dailyQuote.source}
          theme="morning"
        />

        {/* Principle Header */}
        <FlowHeader
          title="Interconnected Living"
          subtitle="We exist in relationship with others"
          centered
        />

        {/* Relational Prompts - All Optional */}
        <View style={styles.promptSection}>
          <Text style={styles.promptLabel}>
            Who might you encounter or serve today?
          </Text>
          <TextInput
            style={styles.textInput}
            value={encounters}
            onChangeText={setEncounters}
            placeholder="I might encounter..."
            placeholderTextColor={colorSystem.gray[400]}
            testID="encounters-input"
            accessibilityLabel="Who you might encounter today, optional"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.optionalText}>Optional</Text>
        </View>

        <View style={styles.promptSection}>
          <Text style={styles.promptLabel}>
            How will you show up for them?
          </Text>
          <TextInput
            style={styles.textInput}
            value={practice}
            onChangeText={setPractice}
            placeholder="I'll practice..."
            placeholderTextColor={colorSystem.gray[400]}
            testID="practice-input"
            accessibilityLabel="How you will show up for others, optional"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.optionalText}>Optional</Text>
        </View>

        {/* Begin Your Day Button - Always Enabled */}
        <TouchableOpacity
          style={styles.beginButton}
          onPress={handleBeginDay}
          accessibilityRole="button"
          accessibilityLabel="Begin your day"
          accessibilityHint="Completes morning check-in and returns to home"
          testID="begin-day-button"
        >
          <Text style={styles.beginButtonText}>Begin Your Day</Text>
        </TouchableOpacity>

        {/* Skip Link */}
        <SkipLink
          onPress={handleSkip}
          accessibilityLabel="Skip relational close"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white, // Match other check-in flows
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[20],
    paddingBottom: spacing[40],
  },
  promptSection: {
    marginBottom: spacing[20],
  },
  promptLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    padding: spacing[12],
    fontSize: typography.bodyRegular.size,
    backgroundColor: colorSystem.base.white,
    minHeight: 60,
    color: colorSystem.base.black,
  },
  optionalText: {
    fontSize: typography.caption.size,
    color: colorSystem.gray[500],
    marginTop: spacing[4],
  },
  beginButton: {
    backgroundColor: colorSystem.themes.morning.primary,
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    marginTop: spacing[16],
    marginBottom: spacing[16],
    minHeight: 48,
    justifyContent: 'center',
  },
  beginButtonText: {
    color: colorSystem.base.white,
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default RelationalCloseScreen;
