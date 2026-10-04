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
 * - The set is CRISIS_DESTINATION_ROUTES ("the user was sent here for 988;
 *   nothing may cover it"). Not SUPPRESSED_ROUTES or RECONSENT_DEFERRAL_ROUTES:
 *   both include AssessmentFlow and LegalGate, which mean something else.
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
