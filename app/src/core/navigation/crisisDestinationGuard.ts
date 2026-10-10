/**
 * Keep a crisis destination from being popped or covered by a flow that
 * finishes underneath it (DEBUG-706).
 *
 * CRISIS RULING (recorded on DEBUG-706; shared with DEBUG-703 and DEBUG-711, so
 * the three do not grow three guards):
 * - A route that removes itself after an await or timer removes ITSELF, by key.
 *   A bare `navigation.goBack()` acts on the FOCUSED route, so a CrisisResources
 *   the user opened in the meantime is what gets popped.
 * - Forward navigation scheduled after an await or timer is DEFERRED while a
 *   crisis destination is the active root route — never dropped, never
 *   redirected. It runs once the user leaves the crisis screen.
 * - Navigation INTO a crisis destination is never guarded here or anywhere.
 * - RUNTIME EXTERNAL LINKS are the one exception to "deferred" (DEBUG-737): a
 *   non-crisis deep link arriving while a crisis destination is focused is
 *   DROPPED and logged by base path, never deferred. It is not the app's own
 *   follow-on but an outside party's request; replayed after the user leaves the
 *   crisis screen it would arrive out of context, unasked. `being://crisis` and
 *   the rate-limited crisis fallback return before the check and always deliver.
 *   Cold start is unaffected (no navigator is ready, so nothing is focused).
 * - The set is CRISIS_DESTINATION_ROUTES ("the user was sent here for 988;
 *   nothing may cover it"). Not SUPPRESSED_ROUTES or RECONSENT_DEFERRAL_ROUTES:
 *   both include AssessmentFlow and LegalGate, which mean something else.
 *
 * Consumers: CleanRootNavigator's AssessmentFlow completion (DEBUG-706,
 * `dismissRouteThenNotify`), DeleteAccountScreen's post-erasure reset
 * (DEBUG-703, `runWhenNoCrisisDestinationFocused`), and onboarding completion
 * (DEBUG-711, `completeOnboarding`, which defers its whole replace-then-push),
 * the ReConsent / ConsentBlocked dismissals in CleanRootNavigator (DEBUG-733,
 * `removeOwnRoute`), and linking.ts's runtime link subscriber (DEBUG-737,
 * `isCrisisDestinationFocused`, read per event in `secureSubscribe`).
 */
import { CommonActions } from '@react-navigation/native';
import { logSystem } from '@/core/services/logging';
import { CRISIS_DESTINATION_ROUTES } from './rootOverlaySlot';
import { getActiveRootRouteName, navigationRef } from './navigationRef';

/** True while a crisis destination is the active root route. */
export function isCrisisDestinationFocused(activeRoute: string | undefined = getActiveRootRouteName()): boolean {
  return activeRoute !== undefined && CRISIS_DESTINATION_ROUTES.includes(activeRoute);
}

interface StackState {
  key: string;
  routes: readonly { key: string }[];
}

interface ScreenNavigation {
  dispatch: (action: ReturnType<typeof CommonActions.goBack> & { source?: string; target?: string }) => void;
  getState: () => StackState;
}

/** Remove the route at `routeKey` from its stack, whatever is focused above it. */
export function removeOwnRoute(navigation: ScreenNavigation, routeKey: string): void {
  navigation.dispatch({ ...CommonActions.goBack(), source: routeKey, target: navigation.getState().key });
}

interface DismissThenNotify {
  navigation: ScreenNavigation;
  routeKey: string;
  /** The parent's follow-on — e.g. onboarding opening GAD-7. */
  notify: () => void;
  isCrisisFocused?: () => boolean;
  subscribe?: (listener: () => void) => () => void;
  /** Lets a dismissal animation finish before the follow-on (the prior behaviour). */
  delayMs?: number;
}

/**
 * Remove `routeKey`, then run `notify` once no crisis destination is focused.
 * If the route that was beneath it has gone by then (the stack was reset), the
 * follow-on is dropped with a log rather than pushed onto an unrelated stack.
 */
export function dismissRouteThenNotify({
  navigation,
  routeKey,
  notify,
  isCrisisFocused = (): boolean => isCrisisDestinationFocused(),
  subscribe = (listener): (() => void) => navigationRef.addListener('state', listener),
  delayMs = 50,
}: DismissThenNotify): void {
  const routes = navigation.getState().routes;
  const beneathKey = routes[routes.findIndex((r) => r.key === routeKey) - 1]?.key;

  removeOwnRoute(navigation, routeKey);

  let unsubscribe: (() => void) | null = null;
  let settled = false;
  const settle = (): void => {
    settled = true;
    unsubscribe?.();
    unsubscribe = null;
  };
  const attempt = (): void => {
    if (settled) return;
    if (beneathKey !== undefined && !navigation.getState().routes.some((r) => r.key === beneathKey)) {
      settle();
      logSystem('[crisisDestinationGuard] follow-on dropped: the route beneath was removed');
      return;
    }
    if (isCrisisFocused()) {
      unsubscribe ??= subscribe(attempt);
      return;
    }
    settle();
    notify();
  };

  setTimeout(attempt, delayMs);
}

interface RunWhenNoCrisisDestinationFocused {
  isCrisisFocused?: () => boolean;
  subscribe?: (listener: () => void) => () => void;
}

/**
 * Run `run` now if no crisis destination is focused; otherwise run it exactly once
 * on the first root navigation state in which none is, then stop listening
 * (DEBUG-703). Deferred, never dropped or redirected. No timer and no AppState
 * branch: a 988 call that backgrounds the app changes nothing. Module-lifetime —
 * the caller unmounting does not cancel it.
 */
export function runWhenNoCrisisDestinationFocused(
  run: () => void,
  {
    isCrisisFocused = (): boolean => isCrisisDestinationFocused(),
    subscribe = (listener): (() => void) => navigationRef.addListener('state', listener),
  }: RunWhenNoCrisisDestinationFocused = {},
): void {
  if (!isCrisisFocused()) {
    run();
    return;
  }

  let done = false;
  let unsubscribe: (() => void) | null = null;
  const attempt = (): void => {
    if (done || isCrisisFocused()) return;
    done = true;
    unsubscribe?.();
    unsubscribe = null;
    run();
  };

  const stop = subscribe(attempt);
  if (done) stop();
  else unsubscribe = stop;
}
