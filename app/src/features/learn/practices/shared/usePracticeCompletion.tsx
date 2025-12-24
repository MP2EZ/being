/**
 * usePracticeCompletion Hook - Shared DRY Logic
 * Handles completion flow for all practice screens
 *
 * Encapsulates:
 * - Quote lookup from PRACTICE_QUOTES
 * - Error handling for missing quotes
 * - Practice count increment
 * - Completion screen rendering
 */

import { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import PracticeCompletionScreen, {
  PRACTICE_QUOTES,
} from '../PracticeCompletionScreen';
import { useEducationStore } from '../../stores/educationStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { getPrincipleForModuleId } from '@/features/learn/utils/principleMapping';
import type { ModuleId } from '@/features/learn/types/education';

interface UsePracticeCompletionOptions {
  practiceId: string;
  moduleId: ModuleId;
  title: string;
  onComplete?: (() => void) | undefined;
  testID?: string;
}

interface UsePracticeCompletionReturn {
  isComplete: boolean;
  setIsComplete: (complete: boolean) => void;
  markComplete: () => void; // Convenience function
  renderCompletion: () => ReactElement | null;
}

export function usePracticeCompletion({
  practiceId,
  moduleId,
  title,
  onComplete,
  testID = 'practice',
}: UsePracticeCompletionOptions): UsePracticeCompletionReturn {
  const [isComplete, setIsComplete] = useState(false);
  const incrementPracticeCount = useEducationStore(
    (state) => state.incrementPracticeCount
  );
  const recordPrincipleEngagement = useStoicPracticeStore(
    (state) => state.recordPrincipleEngagement
  );

  /**
   * Mark practice as complete, increment count, and record principle engagement
   * FEAT-133: Learn module practices now count toward Principle Embodiment chart
   */
  const markComplete = useCallback(() => {
    setIsComplete(true);
    incrementPracticeCount(moduleId);

    // Record engagement for Insights dashboard (FEAT-133)
    const principle = getPrincipleForModuleId(moduleId);
    recordPrincipleEngagement(principle, 'learn', 'practiced');
  }, [moduleId, incrementPracticeCount, recordPrincipleEngagement]);

  /**
   * Render completion screen with philosopher-validated quote
   */
  const renderCompletion = useCallback((): ReactElement | null => {
    if (!isComplete) {
      return null;
    }

    // Lookup quote with fallback chain
    const quote = PRACTICE_QUOTES[practiceId] || PRACTICE_QUOTES['breathing-space'];

    if (!quote) {
      throw new Error(
        `Missing quote for practiceId: ${practiceId}. ` +
        `Available quotes: ${Object.keys(PRACTICE_QUOTES).join(', ')}`
      );
    }

    return (
      <PracticeCompletionScreen
        practiceTitle={title}
        quote={quote}
        moduleId={moduleId}
        onContinue={onComplete || (() => {})}
        testID={`${testID}-completion`}
      />
    );
  }, [isComplete, practiceId, title, moduleId, onComplete, testID]);

  return {
    isComplete,
    setIsComplete,
    markComplete,
    renderCompletion,
  };
}
