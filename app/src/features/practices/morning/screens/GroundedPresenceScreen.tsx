/**
 * GROUNDED PRESENCE SCREEN - FEAT-139 Morning Flow UX Refactor
 *
 * Screen 1: Physical grounding FIRST per Stoic Mindfulness Aware Presence principle.
 * MAINT-140: Now uses SharedBreathingScreen for consistency.
 *
 * Time: 2-3 minutes | Principle: Aware Presence | Required inputs: None
 *
 * Key Design Decisions (Philosopher validated 9/10):
 * - Physical grounding FIRST (embodied awareness before cognitive work)
 * - No required text input = zero friction start
 * - Continue button appears after 60s minimum (encourages 2-3 min)
 * - Breathing animation at 60fps with haptic feedback (iOS)
 * - prefersReducedMotion: static glow alternative
 *
 * Classical Stoic Foundation:
 * - Marcus Aurelius: "Dwell on the beauty of life" (Meditations 4:3)
 *   - Present-moment attention grounds philosophical practice
 * - Epictetus: "First say to yourself what you would be; then do what you have to do"
 *   - Being precedes doing; grounding precedes intention
 *
 * @see /docs/product/stoic-mindfulness/principles/01-aware-presence.md
 */

import React from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import type { MorningFlowParamList, GroundedPresenceData } from '@/features/practices/types/flows';
import { SharedBreathingScreen } from '../../shared/components';

// Re-export for backward compatibility
export type { GroundedPresenceData } from '@/features/practices/types/flows';

// Minimum time before Continue button becomes active (milliseconds)
const MINIMUM_PRESENCE_TIME_MS = 60 * 1000;

type Props = StackScreenProps<MorningFlowParamList, 'GroundedPresence'> & {
  onSave?: (data: GroundedPresenceData) => void;
};

const GroundedPresenceScreen: React.FC<Props> = ({ navigation, route, onSave }) => {
  // FEAT-23: Restore initial data if resuming session
  const initialData = (route.params as any)?.initialData as GroundedPresenceData | undefined;
  const wasCompleted = !!initialData?.completed;
  const startTimeRef = React.useRef<Date>(new Date());

  const handleComplete = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
    const data: GroundedPresenceData = {
      completed: true,
      duration: elapsedSeconds,
      skipped: false,
    };

    if (onSave) {
      onSave(data);
    }

    navigation.navigate('GratitudeIntention' as never);
  };

  const handleSkip = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
    const data: GroundedPresenceData = {
      completed: false,
      duration: elapsedSeconds,
      skipped: true,
    };

    if (onSave) {
      onSave(data);
    }

    navigation.navigate('GratitudeIntention' as never);
  };

  return (
    <SharedBreathingScreen
      theme="morning"
      title="Grounded Presence"
      subtitle="Settle into your body. The day hasn't started yet."
      duration={MINIMUM_PRESENCE_TIME_MS}
      breathingPattern={{ inhale: 4000, exhale: 4000 }}
      phaseText={{
        inhale: 'Breathe in...',
        exhale: 'Breathe out...',
      }}
      guidanceTitle="Before this day begins, notice:"
      guidanceItems={[
        'The weight of your body',
        'The rhythm of your breath',
        'The sounds around you',
      ]}
      wasCompleted={wasCompleted}
      onComplete={handleComplete}
      onSkip={handleSkip}
      testID="grounded-presence-screen"
    />
  );
};

export default GroundedPresenceScreen;
