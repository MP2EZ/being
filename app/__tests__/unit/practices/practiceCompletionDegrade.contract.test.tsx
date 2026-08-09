/**
 * DEBUG-344 CONTRACT — the completion screen degrades, it does not crash.
 *
 * Before this item, `usePracticeCompletion` did
 *   PRACTICE_QUOTES[practiceId] || PRACTICE_QUOTES['breathing-space']
 * so a practice with no entry silently borrowed the Aware-Presence quote. Three
 * module-5 practices shipped that way. The `if (!quote) throw` beneath it was
 * unreachable — the `||` always resolved — and its error message advertised a
 * failure mode that could not occur, which is structurally why the gap stayed
 * silent for as long as it did.
 *
 * Removing the fallback makes that branch live. This file pins the choice made
 * there, because getting it wrong is a SAFETY regression rather than a content
 * one:
 *
 *   • `linking.ts` accepts `practice/:practiceId` from an arbitrary URL and only
 *     strips non-alphanumerics — it does NOT validate against the authored set.
 *     So an unknown id is reachable from outside the app.
 *   • There is no error boundary anywhere above the practice screens.
 *     `src/core/components/ErrorBoundary.tsx` exists with ZERO importers, and
 *     App.tsx wraps CleanRootNavigator in only GestureHandlerRootView /
 *     PostHogProvider / SafeAreaProvider.
 *   • `RootCrisisButton` renders as a sibling in that same tree.
 *
 * A throw here would therefore white-screen the app and take the 988 affordance
 * with it — remotely triggerable, on a `gestureEnabled: false` screen, at the
 * moment a user has just finished a practice. Rendering without a citation is
 * strictly better, and better than asserting someone else's quote.
 *
 * The static half of this contract (every authored practice HAS an entry) lives
 * in src/features/learn/practices/__tests__/practiceQuotes.test.ts. This file
 * covers only the runtime fallthrough that static analysis cannot reach.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import PracticeCompletionScreen, {
  PRACTICE_QUOTES,
} from '@/features/learn/practices/PracticeCompletionScreen';
import type { ModuleId } from '@/features/learn/types/education';

const MODULE: ModuleId = 'interconnected-living';

describe('PracticeCompletionScreen — unknown practiceId degrades (DEBUG-344)', () => {
  it('renders without throwing when no quote is supplied', () => {
    expect(() =>
      render(
        <PracticeCompletionScreen
          practiceTitle="Unknown Practice"
          moduleId={MODULE}
          onContinue={() => {}}
        />
      )
    ).not.toThrow();
  });

  it('still shows the completion confirmation and the practice title', () => {
    // Degrading must not mean showing the user nothing — the practice they just
    // finished is still acknowledged.
    const { getByText } = render(
      <PracticeCompletionScreen
        practiceTitle="Unknown Practice"
        moduleId={MODULE}
        onContinue={() => {}}
      />
    );
    expect(getByText('Practice Complete')).toBeTruthy();
    expect(getByText('Unknown Practice')).toBeTruthy();
  });

  it('shows NO citation rather than borrowing another practice\'s quote', () => {
    // The regression this item exists to prevent: the old fallback rendered the
    // breathing-space quote here, asserting a false principle→practice mapping
    // on a surface users read as canonical.
    const { queryByText } = render(
      <PracticeCompletionScreen
        practiceTitle="Unknown Practice"
        moduleId={MODULE}
        onContinue={() => {}}
      />
    );
    const fallback = PRACTICE_QUOTES['breathing-space'];
    expect(fallback).toBeDefined();
    expect(queryByText(`"${fallback!.text}"`)).toBeNull();
    // No attribution line at all — not merely a different one.
    expect(queryByText(/^— /)).toBeNull();
  });

  it('renders the citation normally when a quote IS supplied', () => {
    // Guards the three cases above from passing vacuously against a screen that
    // never renders a citation under any circumstances.
    const quote = PRACTICE_QUOTES['loving-kindness'];
    expect(quote).toBeDefined();
    const { getByText } = render(
      <PracticeCompletionScreen
        practiceTitle="Loving-Kindness"
        quote={quote!}
        moduleId={MODULE}
        onContinue={() => {}}
      />
    );
    expect(getByText(`"${quote!.text}"`)).toBeTruthy();
  });
});
