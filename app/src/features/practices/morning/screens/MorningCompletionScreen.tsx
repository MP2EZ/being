/**
 * MORNING COMPLETION SCREEN
 *
 * FEAT-46: Converted to auto-toast pattern for reduced friction.
 * Displays celebration toast, clears session, and navigates home.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "When you arise in the morning, think of what a precious privilege
 *   it is to be alive – to breathe, to think, to enjoy, to love." (Meditations 1:17)
 * - Seneca: "Begin at once to live" (Letters 101) - Daily renewal complete
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList, StoicMorningFlowData } from '@/types/flows';
import { SessionStorageService } from '@/services/session/SessionStorageService';
import { CelebrationToast } from '@/components/CelebrationToast';

type Props = StackScreenProps<MorningFlowParamList, 'MorningCompletion'> & {
  onSave?: (data: StoicMorningFlowData) => void;
};

const MorningCompletionScreen: React.FC<Props> = ({ route, onSave }) => {
  const { flowData, startTime } = (route.params as any) || {};

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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default MorningCompletionScreen;
