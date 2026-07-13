/**
 * Root navigation ref (MAINT-290)
 *
 * Shared NavigationContainer ref so surfaces rendered OUTSIDE any navigator —
 * notably the single persistent RootCrisisButton overlay — can navigate and read
 * the active root-stack route without a `navigation` prop.
 *
 * Type-only import of RootStackParamList (erased at compile time) → no runtime
 * import cycle with CleanRootNavigator.
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './CleanRootNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Active ROOT-stack route name (not the leaf route). The routes that drive crisis
 * overlay suppression/mode — MorningFlow, AssessmentFlow, CrisisResources,
 * LegalGate, … — are all top-level root-stack screens, so nested/leaf routes are
 * intentionally ignored here.
 */
export function getActiveRootRouteName(): string | undefined {
  if (!navigationRef.isReady()) return undefined;
  const state = navigationRef.getRootState();
  if (!state || typeof state.index !== 'number') return undefined;
  return state.routes[state.index]?.name;
}
