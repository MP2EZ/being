/**
 * PRACTICE NAVIGATION — shared launch resolver (FEAT-293)
 *
 * A single source of truth for "which screen does this practice open, with what
 * params". Extracted from the switch that used to live inline in
 * `features/learn/tabs/PracticeTab.tsx` so that Learn and the standalone
 * Practice Library launch through IDENTICAL code — FEAT-293's AC3 requires no
 * regression to the Learn-launched entry points, and two parallel switches is
 * exactly how that regression would arrive.
 *
 * Deliberately PURE: it returns a route descriptor rather than calling
 * `navigation.navigate` itself. That is what makes the Learn contract testable
 * without mounting a navigator — before FEAT-293 there were zero tests
 * referencing PracticeTab, so AC3 had no mechanical pin at all.
 */

import type { ModuleId, Practice } from '@/features/learn/types/education';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

/** Default durations, preserved verbatim from the original PracticeTab switch. */
const DEFAULT_TIMER_SECONDS = 180;
const DEFAULT_BODY_SCAN_SECONDS = 300;
const DEFAULT_REFLECTION_SECONDS = 300;

export type PracticeRoute = {
  [K in keyof RootStackParamList]: { screen: K; params: RootStackParamList[K] };
}[
  | 'PracticeTimer'
  | 'ReflectionTimer'
  | 'SortingPractice'
  | 'BodyScan'
  | 'GuidedBodyScan'
];

/**
 * Resolve the screen + params a practice should launch with.
 *
 * Never returns null: an unrecognised type falls back to the guided timer,
 * matching the original switch's `default` branch. Keeping the fallback means a
 * new practice type authored in module JSON degrades to a usable screen rather
 * than a dead button.
 */
export function resolvePracticeRoute(
  practice: Practice,
  moduleId: ModuleId
): PracticeRoute {
  switch (practice.type) {
    case 'sorting':
      // FEAT-293: `scenarios` is now OPTIONAL on the route. When Learn launches
      // this it already holds the loaded module content and passes them through
      // (unchanged behaviour); when the standalone library launches it, they are
      // omitted and SortingPracticeScreen self-loads from module content. That
      // also repairs the pre-existing `/sorting` deep link, which could never
      // have supplied a scenarios array.
      return {
        screen: 'SortingPractice',
        params: {
          practiceId: practice.id,
          moduleId,
          ...(practice.scenarios?.length ? { scenarios: practice.scenarios } : {}),
        },
      };

    case 'body-scan':
      return {
        screen: 'BodyScan',
        params: {
          practiceId: practice.id,
          moduleId,
          duration: practice.duration ?? DEFAULT_BODY_SCAN_SECONDS,
        },
      };

    case 'reflection':
      return {
        screen: 'ReflectionTimer',
        params: {
          practiceId: practice.id,
          moduleId,
          duration: practice.duration ?? DEFAULT_REFLECTION_SECONDS,
          title: practice.title,
          prompt: practice.description,
          ...(practice.instructions && { instructions: practice.instructions }),
        },
      };

    case 'guided-body-scan':
      return {
        screen: 'GuidedBodyScan',
        params: {
          practiceId: practice.id,
          moduleId,
          title: practice.title,
        },
      };

    case 'guided-timer':
    default:
      // DEBUG-353: forward the authored instructions and visualMode, mirroring
      // what the 'reflection' branch above already does. Without this,
      // PracticeTimerScreen had no source of practice-specific copy and fell
      // back to hardcoded breathing-space text — so selecting Loving-Kindness
      // guided the user through breath work for the whole session.
      return {
        screen: 'PracticeTimer',
        params: {
          practiceId: practice.id,
          moduleId,
          duration: practice.duration ?? DEFAULT_TIMER_SECONDS,
          title: practice.title,
          ...(practice.instructions?.length && {
            instructions: practice.instructions,
          }),
          ...(practice.visualMode && { visualMode: practice.visualMode }),
        },
      };
  }
}
