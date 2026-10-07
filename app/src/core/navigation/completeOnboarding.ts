/**
 * Onboarding completion that never moves the user off a crisis screen (DEBUG-711).
 *
 * The user can open CrisisResources from the root crisis button while completion is
 * still persisting. The old closure then ran a bare `navigation.replace('Main')` —
 * which StackRouter applies to the FOCUSED route, so CrisisResources was what got
 * replaced — and 100ms later pushed DailyLoop over whatever was on top.
 *
 * Crisis ruling (DEBUG-706's, shared with DEBUG-703 and this item; mechanism ruled
 * 2026-10-06): persist first, then DEFER THE WHOLE navigation while a crisis
 * destination is focused — never dropped, never redirected. Replacing Onboarding with
 * Main immediately was rejected: it would mount Main UNDER CrisisResources, and
 * CleanHomeScreen's IntroOverlay announces "Being app ready" on mount for a
 * just-onboarded user, speaking over the crisis screen.
 *
 * When it runs, it dispatches at the ROOT, never through the Onboarding screen's own
 * `navigation` (that route may be gone), and it replaces Onboarding by KEY. If the
 * Onboarding route no longer exists by then, the navigation is dropped with a log —
 * the stack it was meant for is gone (the same rule as dismissRouteThenNotify).
 * Navigation INTO a crisis destination is never touched here.
 */
import { StackActions, type NavigationAction } from '@react-navigation/native';
import { logSystem } from '@/core/services/logging';
import { runWhenNoCrisisDestinationFocused } from './crisisDestinationGuard';
import { navigationRef } from './navigationRef';

export type OnboardingDestination = 'home' | 'practice';

interface RootState {
  key: string;
  routes: readonly { key: string }[];
}

interface RootNavigation {
  getRootState: () => RootState | undefined;
  dispatch: (action: NavigationAction) => void;
  navigate: (name: 'DailyLoop') => void;
}

interface CompleteOnboardingDeps {
  /** The Onboarding route's own key: the only route this completion may replace. */
  onboardingRouteKey: string;
  /** Marks onboarding complete (an app setting, not wellness data). Awaited before any navigation decision. */
  markComplete: () => Promise<void>;
  root?: RootNavigation;
  isCrisisFocused?: () => boolean;
  subscribe?: (listener: () => void) => () => void;
}

export async function completeOnboarding(
  destination: OnboardingDestination | undefined,
  { onboardingRouteKey, markComplete, root = navigationRef as unknown as RootNavigation, isCrisisFocused, subscribe }: CompleteOnboardingDeps,
): Promise<void> {
  await markComplete();

  const go = (): void => {
    const state = root.getRootState();
    if (!state || !state.routes.some((r) => r.key === onboardingRouteKey)) {
      logSystem('[completeOnboarding] navigation dropped: the Onboarding route is gone');
      return;
    }
    root.dispatch({ ...StackActions.replace('Main'), source: onboardingRouteKey, target: state.key });
    // Same tick, no timer: the old 100ms wait was the window a crisis screen could open in.
    // No mode param — the daily loop infers its tense from the clock.
    if (destination === 'practice') root.navigate('DailyLoop');
  };

  runWhenNoCrisisDestinationFocused(go, {
    ...(isCrisisFocused ? { isCrisisFocused } : {}),
    ...(subscribe ? { subscribe } : {}),
  });
}
