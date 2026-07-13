/**
 * RootCrisisButton — MAINT-290 (Flow Redesign 1: crisis button → persistent root mount)
 *
 * Single persistent crisis-button overlay, mounted ONCE at the navigation root
 * (sibling of the root Stack.Navigator, inside NavigationContainer). Replaces the
 * ~10 per-screen / per-navigator CollapsibleCrisisButton mounts so 988 access can
 * never regress when flows are restructured (FEAT-286 Finding 5): a screen or
 * future practice step can no longer ship with no crisis affordance, because the
 * button is no longer the screen's responsibility to mount.
 *
 * Behavior is driven by the ACTIVE ROOT-STACK route name (see getActiveRootRouteName
 * — the leaf route is intentionally ignored so a practice flow's inner screens still
 * resolve to the practice route):
 *   - SUPPRESSED on routes that own their own crisis affordance:
 *       • CrisisResources — the destination itself (a button to the screen you're on)
 *       • AssessmentFlow  — keeps its per-screen `prominent` buttons; MAINT-290 must
 *                           NOT touch the assessment flow, so suppress here to avoid a
 *                           double mount / losing the safety-tuned prominent emphasis
 *       • LegalGate       — under-age gate with its own inline Call-988 / Text UI
 *   - `immersive` (starts faded 50%) during meditative practice flows/timers.
 *   - `standard` everywhere else (tabs, onboarding, library, module detail, subscription…).
 *
 * NATIVE <Modal> EXCEPTION: React Native's <Modal> renders in a separate native view
 * hierarchy ABOVE any JS overlay, so this button is covered while a RN <Modal> is open
 * (ThresholdEducationModal, ResumeSessionModal, CelebrationToast, NotificationTimePicker,
 * SessionNoteComposer, WeeklyReflectionComposer). This matches the prior per-screen
 * behavior — NOT a regression — and none of those modals sit on the crisis path.
 *
 * CrisisErrorBoundary keeps its OWN CollapsibleCrisisButton: it lives outside the
 * navigation tree and dials tel:988 directly, so it is the last-resort 988 access when
 * a render crash removes this root-mounted overlay.
 */
import React from 'react';
import { CollapsibleCrisisButton, type CrisisButtonMode } from './CollapsibleCrisisButton';
import { navigationRef } from '@/core/navigation/navigationRef';

/** Root-stack routes that already own a crisis affordance → suppress the overlay. */
const SUPPRESSED_ROUTES: ReadonlySet<string> = new Set([
  'CrisisResources',
  'AssessmentFlow',
  'LegalGate',
]);

/** Root-stack routes that are meditative practices → faded immersive mode. */
const IMMERSIVE_ROUTES: ReadonlySet<string> = new Set([
  'MorningFlow',
  'MiddayFlow',
  'EveningFlow',
  'DailyLoop', // FEAT-291 single-loop daily-practice prototype (meditative practice surface)
  'PracticeTimer',
  'ReflectionTimer',
  'SortingPractice',
  'BodyScan',
  'GuidedBodyScan',
]);

/** Stable testID for the single root crisis button (replaces the old per-screen ids). */
export const ROOT_CRISIS_BUTTON_TEST_ID = 'crisis-button-root';

export interface RootCrisisButtonProps {
  /**
   * Active ROOT-stack route name, supplied by NavigationContainer's onStateChange
   * (see CleanRootNavigator). Undefined before the container is ready → treated as a
   * non-suppressed standard surface.
   */
  routeName?: string | undefined;
}

export const RootCrisisButton: React.FC<RootCrisisButtonProps> = ({ routeName }) => {
  if (routeName && SUPPRESSED_ROUTES.has(routeName)) {
    return null;
  }

  const mode: CrisisButtonMode =
    routeName && IMMERSIVE_ROUTES.has(routeName) ? 'immersive' : 'standard';

  return (
    <CollapsibleCrisisButton
      mode={mode}
      testID={ROOT_CRISIS_BUTTON_TEST_ID}
      onNavigate={() => {
        // <200ms/<3s crisis-access contract: navigate via the root ref (no per-screen
        // navigation prop needed). Guarded on isReady so an early tap can't throw.
        if (navigationRef.isReady()) {
          navigationRef.navigate('CrisisResources', { source: 'crisis_button' });
        }
      }}
    />
  );
};

export default RootCrisisButton;
