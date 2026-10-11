/**
 * Legal gate completion, never moving the user off a crisis screen (DEBUG-735).
 *
 * CombinedLegalGateScreen calls onComplete only after awaiting verifyAge and
 * recordLegalGateConsents, and a runtime `being://crisis` link is consent-exempt, so
 * CrisisResources can be pushed above LegalGate by then. The old bare
 * `navigation.replace('Onboarding')` acts on the FOCUSED route — it replaced
 * CrisisResources.
 *
 * Crisis ruling (DEBUG-706's, shared with DEBUG-711 / DEBUG-734): defer the whole
 * navigation while a crisis destination is focused — never dropped, never redirected —
 * then replace LegalGate BY KEY at the ROOT (the LegalGate screen's own `navigation`
 * may be gone). If the LegalGate route no longer exists by then, the navigation is
 * dropped with a log. Navigation INTO a crisis destination is never touched here.
 *
 * Compliance ruling: the persistence writes stay in the screen, awaited before
 * onComplete, so deferring delays only the screen change — never the consent record.
 * This closure ONLY replaces LegalGate with Onboarding, and it never throws back into
 * the caller (whose catch would show "Verification failed" after consent was recorded).
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

interface CompleteLegalGateDeps {
  /** The LegalGate route's own key: the only route this may replace. */
  legalGateRouteKey: string;
  root?: RootNavigation;
  isCrisisFocused?: () => boolean;
  subscribe?: (listener: () => void) => () => void;
}

export function completeLegalGate({
  legalGateRouteKey,
  root = navigationRef as unknown as RootNavigation,
  isCrisisFocused,
  subscribe,
}: CompleteLegalGateDeps): void {
  const go = (): void => {
    try {
      const state = root.getRootState();
      if (!state || !state.routes.some((r) => r.key === legalGateRouteKey)) {
        logSystem('[completeLegalGate] navigation dropped: the LegalGate route is gone');
        return;
      }
      root.dispatch({ ...StackActions.replace('Onboarding'), source: legalGateRouteKey, target: state.key });
    } catch (error) {
      logError(LogCategory.SYSTEM, '[completeLegalGate] navigation failed', error instanceof Error ? error : undefined);
    }
  };

  try {
    runWhenNoCrisisDestinationFocused(go, {
      ...(isCrisisFocused ? { isCrisisFocused } : {}),
      ...(subscribe ? { subscribe } : {}),
    });
  } catch (error) {
    logError(LogCategory.SYSTEM, '[completeLegalGate] scheduling failed', error instanceof Error ? error : undefined);
  }
}
