/**
 * Reads assessment state and asks the gate how much of the guidance ladder this
 * reader may see (FEAT-433, slice 3a).
 *
 * This hook is the FIRST production consumer of `decideGuidanceAccess`. Everything
 * below exists because a wrong answer here is a false negative on a safety gate —
 * not a rendering bug.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ WHY THIS GATES ON HYDRATION, AND WHY THAT IS NOT OPTIONAL
 *
 * `assessmentStore` is `persist`-wrapped over an ENCRYPTED, ASYNC storage adapter,
 * and declares no `onRehydrateStorage` hook. Before rehydration finishes,
 * `completedAssessments` is `[]`, so `getLastResult` returns null on BOTH axes and
 * `decideGuidanceAccess(null, null, null)` answers `gentle`.
 *
 * `gentle` is the correct conservative answer for that instant — it is what the
 * gate's own docblock calls "the safe landing for a not-yet-hydrated store read".
 * But it is only safe if the decision is RE-EVALUATED once the real data lands.
 * `gentle` still permits Tier 0 and Tier 1, so a reader scoring PHQ-9 24, or with
 * Q9 > 0, who opens guidance during a SecureStore + AES decrypt would otherwise be
 * shown domain content for the whole mount and never routed to crisis resources.
 *
 * Slice 2's loader is lazy for the stated reason that "a suppressed reader must be
 * routed BEFORE any of this content is loaded". Lazy loading alone does not deliver
 * that: it defers the CONTENT, not the DECISION. This hook is the other half.
 *
 * So: while hydrating, the hook reports `pending` and the screen renders no content
 * and starts no load. It also SUBSCRIBES rather than snapshotting — see below.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useState } from 'react';

import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import type { GAD7Result, PHQ9Result } from '@/features/assessment/types';
import { decideGuidanceAccess } from '../services/guidanceGate';
import type { GuidanceAccessDecision } from '../types/guidance';

export type GuidanceGateState =
  | { readonly status: 'pending' }
  | { readonly status: 'ready'; readonly decision: GuidanceAccessDecision };

/**
 * Narrow `getLastResult`'s undiscriminated return by RUNTIME SHAPE, never a cast.
 *
 * `getLastResult(type): PHQ9Result | GAD7Result | null` is not discriminated by its
 * argument, so TypeScript rejects the raw return in either slot and the caller is
 * forced to act. An `as PHQ9Result` would satisfy the compiler and let a GAD-7
 * result reach the PHQ-9 slot, where `suicidalIdeation` is `undefined` → falsy →
 * the "Q9 > 0 regardless of total" rule silently stops firing. That is the single
 * most safety-critical row in the gate's matrix, and no type checker can catch it
 * once a cast is in play.
 *
 * `suicidalIdeation` is the discriminant because `PHQ9Result` has it and
 * `GAD7Result` does not. A mis-shaped record narrows to `null`, which the gate
 * reads as "never assessed" → `gentle`. That is the safe direction.
 */
function asPhq9(result: PHQ9Result | GAD7Result | null): PHQ9Result | null {
  if (result && 'suicidalIdeation' in result) return result;
  return null;
}

function asGad7(result: PHQ9Result | GAD7Result | null): GAD7Result | null {
  if (result && !('suicidalIdeation' in result)) return result;
  return null;
}

/**
 * Has the encrypted assessment store finished rehydrating?
 *
 * Shape copied from `ExportDataScreen`'s `useExportStoresHydrated`, including the
 * re-check inside the effect: hydration can finish between the initial render and
 * the effect running, in which case `onFinishHydration` never fires again and a
 * naive subscription would wait forever.
 */
function useAssessmentHydrated(): boolean {
  const [hydrated, setHydrated] = useState<boolean>(() =>
    useAssessmentStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (hydrated) return undefined;
    const unsubscribe = useAssessmentStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useAssessmentStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, [hydrated]);

  return hydrated;
}

/**
 * Decide only. This hook does NOT navigate and does NOT load content — those are
 * the screen's job, and keeping them out keeps this testable as a pure-ish read.
 */
export function useGuidanceGate(): GuidanceGateState {
  const hydrated = useAssessmentHydrated();

  // Subscribe to the RESULTS, not to the accessor and not via getState().
  //
  // Selecting `state.getLastResult` would return a stable function reference, so the
  // component would never re-render when hydration lands — the stale-snapshot failure
  // this hook exists to prevent. Reading through `getState()` inside the memo is the
  // same bug wearing a subscription's clothes: the value is fetched imperatively and
  // the dependency array only pretends to track it.
  //
  // Calling the accessor inside the selector gets both properties at once: zustand
  // re-runs it on every state change, and the store's own semantics are reused rather
  // than reimplemented here.
  const lastPhq9 = useAssessmentStore((state) => state.getLastResult('phq9'));
  const lastGad7 = useAssessmentStore((state) => state.getLastResult('gad7'));

  return useMemo<GuidanceGateState>(() => {
    if (!hydrated) return { status: 'pending' };

    const decision = decideGuidanceAccess(
      asPhq9(lastPhq9),
      asGad7(lastGad7),
      // No global developmental stage exists: `educationStore` holds it per module and
      // `setDevelopmentalStage` has zero call sites, so aggregating one would be a new
      // product decision rather than a wiring choice. Passed explicitly rather than
      // omitted — it only feeds `allowPremeditatio`, which is unreachable in slice 3a.
      null,
    );

    return { status: 'ready', decision };
    // All three dependencies are genuinely read above. They are also exactly what
    // changes when hydration lands or a new assessment is recorded, which is what
    // lets a gentle→suppressed flip tear content down mid-view rather than leaving a
    // suppressed reader looking at philosophy for the rest of the mount.
  }, [hydrated, lastPhq9, lastGad7]);
}
