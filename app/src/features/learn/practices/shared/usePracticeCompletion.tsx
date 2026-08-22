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
import { logError, LogCategory } from '@/core/services/logging';
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

    // DEBUG-344: no fallback chain. This used to be
    //   PRACTICE_QUOTES[practiceId] || PRACTICE_QUOTES['breathing-space']
    // which silently served the Aware-Presence quote to any practice without an
    // entry — three module-5 practices, for as long as they have shipped. The
    // `if (!quote) throw` below it was therefore unreachable, and its message
    // advertised a failure mode that could not occur, which is precisely why the
    // gap stayed invisible. Missing entries are now caught statically by the
    // key-set guard in practiceQuotes.test.ts instead.
    const quote = PRACTICE_QUOTES[practiceId];

    // Degrade, never throw. An unknown practiceId is reachable from OUTSIDE the
    // app: linking.ts accepts `practice/:practiceId` from an arbitrary URL and
    // only strips non-alphanumerics — it does not validate against the authored
    // set. And there is no error boundary anywhere above these screens
    // (src/core/components/ErrorBoundary.tsx has zero importers; App.tsx wraps
    // CleanRootNavigator in only GestureHandlerRootView / PostHogProvider /
    // SafeAreaProvider), while RootCrisisButton renders as a sibling in the same
    // tree. So a throw here white-screens the app and takes the 988 affordance
    // with it — remotely triggerable, on a `gestureEnabled: false` screen, at
    // the moment a user has just finished a practice. Rendering without a
    // citation is strictly better than that, and better than the old behaviour
    // of asserting someone else's quote.
    if (!quote) {
      logError(
        LogCategory.SYSTEM,
        `No PRACTICE_QUOTES entry for practiceId "${practiceId}"; rendering completion without a citation`
      );
    }

    return (
      <PracticeCompletionScreen
        practiceTitle={title}
        // exactOptionalPropertyTypes is on, so the prop must be OMITTED rather
        // than passed as undefined.
        {...(quote ? { quote } : {})}
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
