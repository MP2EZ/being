/**
 * MORNING COMPLETION SCREEN
 *
 * FEAT-46: Converted to auto-toast pattern for reduced friction.
 * MAINT-140: Enhanced with principle restatement + Marcus Aurelius quote.
 * Displays celebration toast, clears session, and navigates home.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious privilege
 *   it is to be alive – to breathe, to think, to enjoy, to love." (Meditations 1:17)
 * - Seneca: "Begin at once to live" (Letters 101) - Daily renewal complete
 *
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { colorSystem } from '@/core/theme';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList, StoicMorningFlowData } from '@/features/practices/types/flows';
import type { StoicPrinciple } from '@/features/practices/types/stoic';
import { SessionStorageService } from '@/core/services/session/SessionStorageService';
import { CelebrationToast } from '@/core/components/CelebrationToast';

// MAINT-140: Principle display names for completion restatement
const PRINCIPLE_NAMES: Record<StoicPrinciple, string> = {
  aware_presence: 'Aware Presence',
  radical_acceptance: 'Radical Acceptance',
  sphere_sovereignty: 'Sphere Sovereignty',
  virtuous_response: 'Virtuous Response',
  interconnected_living: 'Interconnected Living',
};

// MAINT-140: Marcus Aurelius quotes for morning completion
// Matched to each principle for philosophical reinforcement
const PRINCIPLE_QUOTES: Record<StoicPrinciple, { text: string; citation: string }> = {
  aware_presence: {
    text: 'Dwell on the beauty of life. Watch the stars, and see yourself running with them.',
    citation: '— Marcus Aurelius, Meditations 7:47',
  },
  radical_acceptance: {
    text: 'Accept the things to which fate binds you, and love the people with whom fate brings you together.',
    citation: '— Marcus Aurelius, Meditations 6:39',
  },
  sphere_sovereignty: {
    text: 'You have power over your mind — not outside events. Realize this, and you will find strength.',
    citation: '— Marcus Aurelius, Meditations 4:3',
  },
  virtuous_response: {
    text: 'Waste no more time arguing about what a good man should be. Be one.',
    citation: '— Marcus Aurelius, Meditations 10:16',
  },
  interconnected_living: {
    text: 'What injures the hive, injures the bee.',
    citation: '— Marcus Aurelius, Meditations 6:54',
  },
};

type Props = StackScreenProps<MorningFlowParamList, 'MorningCompletion'> & {
  onSave?: (data: StoicMorningFlowData) => void;
};

const MorningCompletionScreen: React.FC<Props> = ({ route, onSave }) => {
  const { flowData, startTime } = (route.params as any) || {};

  // MAINT-140: Extract principle for completion enhancement
  const selectedPrinciple = flowData?.principleFocus?.principleKey as StoicPrinciple | undefined;

  // MAINT-140: Build enhancement content based on selected principle
  const enhancement = useMemo(() => {
    if (!selectedPrinciple || !PRINCIPLE_NAMES[selectedPrinciple]) {
      return undefined;
    }

    const quote = PRINCIPLE_QUOTES[selectedPrinciple];
    return {
      message: `Today's focus: ${PRINCIPLE_NAMES[selectedPrinciple]}`,
      subtext: quote.text,
      attribution: quote.citation,
    };
  }, [selectedPrinciple]);

  const handleComplete = async () => {
    const timeSpent = startTime
      ? Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
      : 0;

    const completeData: StoicMorningFlowData = {
      ...flowData,
      completedAt: new Date(),
      timeSpentSeconds: timeSpent,
      flowVersion: 'stoic_v1',
    };

    // FEAT-23: Clear session on completion
    try {
      await SessionStorageService.clearSession('morning');
      console.log('[MorningCompletion] Session cleared on flow completion');
    } catch (error) {
      console.error('[MorningCompletion] Failed to clear session:', error);
    }

    if (onSave) {
      onSave(completeData);
    }
    // Navigation handled by onComplete callback in CleanRootNavigator
  };

  return (
    <View style={styles.container} testID="morning-completion-screen">
      <CelebrationToast
        flowType="morning"
        screenCount={5}
        duration={8}
        streak={1}
        onComplete={handleComplete}
        enhancement={enhancement}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
});

export default MorningCompletionScreen;
