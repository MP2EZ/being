/**
 * Onboarding's re-ask at the legal gate, never moving the user off a crisis screen
 * (DEBUG-734).
 *
 * handlePrivacyContinue decides to re-ask (DEBUG-419 / DEBUG-755) only after awaiting
 * the consent reads and the grant, and the root crisis button is live on Onboarding,
 * so CrisisResources can be focused by then. The old bare
 * `navigation.replace('LegalGate')` acts on the FOCUSED route — it replaced
 * CrisisResources.
 *
 * Crisis ruling (DEBUG-706's, shared with DEBUG-703 / DEBUG-711): defer the whole
 * navigation while a crisis destination is focused — never dropped, never
 * redirected — then replace Onboarding BY KEY at the ROOT (the Onboarding screen's own
 * `navigation` may be gone). If the Onboarding route no longer exists by then, the
 * navigation is dropped with a log. Navigation INTO a crisis destination is never
 * touched here.
 *
 * Compliance ruling: the fail-closed DECISION is the caller's and stays synchronous —
 * it logs and returns before anything here runs, so nothing reaches grantConsent,
 * navigateNext or onboarding completion. This closure ONLY replaces Onboarding with
 * LegalGate, and it never throws back into the caller (whose catch is itself a re-ask
 * branch).
 */
import { StackActions, type NavigationAction } from '@react-navigation/native';
import { LogCategory, logError, logSystem } from '@/core/services/logging';
import { runWhenNoCrisisDestinationFocused } from './crisisDestinationGuard';
import { navigationRef } from './navigationRef';

interface RootState {
  key: string;
  routes: readonly { key: string }[];
}

interface RootNavigation {
  getRootState: () => RootState | undefined;
  dispatch: (action: NavigationAction) => void;
}

interface ReturnToLegalGateDeps {
  /** The Onboarding route's own key: the only route this may replace. */
  onboardingRouteKey: string;
  root?: RootNavigation;
  isCrisisFocused?: () => boolean;
  subscribe?: (listener: () => void) => () => void;
}

export function returnToLegalGate({
  onboardingRouteKey,
  root = navigationRef as unknown as RootNavigation,
  isCrisisFocused,
  subscribe,
}: ReturnToLegalGateDeps): void {
  const go = (): void => {
    try {
      const state = root.getRootState();
      if (!state || !state.routes.some((r) => r.key === onboardingRouteKey)) {
        logSystem('[returnToLegalGate] navigation dropped: the Onboarding route is gone');
        return;
      }
      root.dispatch({ ...StackActions.replace('LegalGate'), source: onboardingRouteKey, target: state.key });
    } catch (error) {
      logError(LogCategory.SYSTEM, '[returnToLegalGate] navigation failed', error instanceof Error ? error : undefined);
    }
  };

  try {
    runWhenNoCrisisDestinationFocused(go, {
      ...(isCrisisFocused ? { isCrisisFocused } : {}),
      ...(subscribe ? { subscribe } : {}),
    });
  } catch (error) {
    logError(LogCategory.SYSTEM, '[returnToLegalGate] scheduling failed', error instanceof Error ? error : undefined);
  }
}
