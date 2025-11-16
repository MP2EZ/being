/**
 * EVENING COMPLETION SCREEN
 *
 * FEAT-46: Converted to auto-toast pattern for reduced friction.
 * Displays celebration toast, clears session, and navigates home.
 * Sleep-friendly with dark overlay for evening users.
 *
 * Classical Stoic Practice:
 * - Marcus Aurelius: "You have power over your mind - not outside events.
 *   Realize this, and you will find strength" (Meditations 4:3)
 * - Seneca: "Each day acquire something that will fortify you against poverty,
 *   against death, indeed against other misfortunes as well" (Letters 2:1)
 *
 * Purpose: Complete the evening examination with quick acknowledgment,
 * then return to rest. Minimal friction before sleep.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { EveningFlowParamList } from '@/types/flows';
import { SessionStorageService } from '@/services/session/SessionStorageService';
import { CelebrationToast } from '@/components/CelebrationToast';

type EveningCompletionScreenNavigationProp = StackNavigationProp<
  EveningFlowParamList,
  'EveningCompletion'
>;
type EveningCompletionScreenRouteProp = RouteProp<
  EveningFlowParamList,
  'EveningCompletion'
>;

interface Props {
  navigation: EveningCompletionScreenNavigationProp;
  route: EveningCompletionScreenRouteProp;
  onComplete?: () => void;
}

const EveningCompletionScreen: React.FC<Props> = ({ onComplete }) => {
  const handleComplete = async () => {
    // FEAT-23: Clear session on completion
    try {
      await SessionStorageService.clearSession('evening');
      console.log('[EveningCompletion] Session cleared on flow completion');
    } catch (error) {
      console.error('[EveningCompletion] Failed to clear session:', error);
    }

    if (onComplete) {
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      <CelebrationToast
        flowType="evening"
        screenCount={7}
        duration={10}
        streak={1}
        onComplete={handleComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
});

export default EveningCompletionScreen;
