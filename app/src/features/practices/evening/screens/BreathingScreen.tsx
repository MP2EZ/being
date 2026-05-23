/**
 * EVENING BREATHING SCREEN - FEAT-134 Evening Flow Redesign
 *
 * Screen 1 of 6: Pure settling breath (no decisions)
 * MAINT-140: Now uses SharedBreathingScreen for consistency.
 *
 * Design Philosophy:
 * - NO cognitive load - just breathe
 * - Calming entry point to evening practice
 * - Continue button appears only after 60s
 * - Evening theme with proper contrast
 *
 * Stoic Philosophy:
 * - "First, stillness" - grounding before reflection
 * - Seneca: The mind must be prepared before examination
 */

import React from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import type { EveningFlowParamList, EveningBreathingData } from '@/features/practices/types/flows';
import { SharedBreathingScreen } from '../../shared/components';

type Props = StackScreenProps<EveningFlowParamList, 'Breathing'> & {
  onSave?: (data: EveningBreathingData) => void;
};

const BREATHING_DURATION_MS = 60000; // 60 seconds

const BreathingScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session or returning via back button
  const initialData = (route.params as { initialData?: any } | undefined)?.initialData;
  const wasCompleted = !!initialData?.completed;

  const handleComplete = () => {
    const breathingData: EveningBreathingData = {
      completed: true,
      durationSeconds: 60,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(breathingData);
    }

    navigation.navigate('Gratitude');
  };

  const handleSkip = () => {
    const breathingData: EveningBreathingData = {
      completed: false,
      durationSeconds: 0,
      skipped: true,
      timestamp: new Date(),
    };

    if (onSave) {
      onSave(breathingData);
    }

    navigation.navigate('Gratitude');
  };

  return (
    <SharedBreathingScreen
      theme="evening"
      title="Let's settle into evening"
      subtitle="Let the day's activity settle."
      duration={BREATHING_DURATION_MS}
      breathingPattern={{ inhale: 4000, hold: 4000, exhale: 6000 }}
      phaseText={{
        inhale: 'Breathe in...',
        hold: 'Hold...',
        exhale: 'Release...',
      }}
      guidanceTitle="Before reflecting, notice:"
      guidanceItems={[
        "Where you hold the day's tension",
        'The rhythm of your breath',
        'The body settling',
      ]}
      wasCompleted={wasCompleted}
      onComplete={handleComplete}
      onSkip={handleSkip}
      testID="evening-breathing-screen"
    />
  );
};

export default BreathingScreen;
