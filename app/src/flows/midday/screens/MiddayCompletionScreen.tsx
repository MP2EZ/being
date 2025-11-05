/**
 * MIDDAY COMPLETION SCREEN
 *
 * FEAT-46: Converted to auto-toast pattern for reduced friction.
 * Displays celebration toast, clears session, and navigates home.
 *
 * Classical Stoic Completion:
 * - Marcus Aurelius: "When you have done well and another has benefited by it, why
 *   do you still look for a third thing on top—credit for the good deed or a favor
 *   in return?" (Meditations 7:73) - Practice is its own reward
 * - Epictetus: "Don't explain your philosophy. Embody it." (Discourses) - Action
 *   matters more than words
 *
 * Purpose: Acknowledge completion without seeking validation. The practice itself
 * is the point. Store progress, then return to living virtuously.
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MiddayFlowParamList } from '../../../types/flows';
import { SessionStorageService } from '../../../services/session/SessionStorageService';
import { CelebrationToast } from '../../../components/CelebrationToast';

type Props = NativeStackScreenProps<MiddayFlowParamList, 'MiddayCompletion'> & {
  onComplete?: () => void;
};

const MiddayCompletionScreen: React.FC<Props> = ({ onComplete }) => {
  const handleComplete = async () => {
    // FEAT-23: Clear session on completion
    try {
      await SessionStorageService.clearSession('midday');
      console.log('[MiddayCompletion] Session cleared on flow completion');
    } catch (error) {
      console.error('[MiddayCompletion] Failed to clear session:', error);
    }

    if (onComplete) {
      onComplete();
    }
  };

  return (
    <View style={styles.container} testID="midday-completion-screen">
      <CelebrationToast
        flowType="midday"
        screenCount={5}
        duration={6}
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

export default MiddayCompletionScreen;
