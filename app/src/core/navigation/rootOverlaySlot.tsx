/**
 * Root overlay slot — one place for full-screen overlays that must never
 * occlude the crisis button (DEBUG-406).
 *
 * ── THE PROBLEM THIS REPLACES ──
 *
 * An overlay that needs to cover the screen has two ways to go wrong, and both
 * of them are silent.
 *
 * 1. RN `<Modal>` renders in a SEPARATE NATIVE WINDOW above the JS view
 *    hierarchy. `RootCrisisButton` mounts inside `NavigationContainer`, so any
 *    `<Modal>` removes the 988 affordance entirely — a zero-affordance render
 *    state, which `crisis-zero-988-windows.test.tsx` forbids.
 *
 * 2. A plain absolute overlay avoids that, but RN resolves `position: 'absolute'`
 *    against the PARENT's padding box, not the screen. An inset-0 overlay
 *    rendered inside a card inside a `ScrollView` covers the CARD and scrolls
 *    away with the content — and on Android it is clipped outright. It looks
 *    correct until you scroll.
 *
 * DEBUG-406 audited four `<Modal>` sites and found three needed converting; of
 * those, two rendered inside a card inside a `ScrollView` and one inside a
 * `ScrollView` directly. At that point the per-site state lift is the wrong
 * primitive: it makes every future overlay re-derive the paint-order rule by
 * hand, and getting it wrong is invisible in review and in jest.
 *
 * ── THE INVARIANT, MADE STRUCTURAL ──
 *
 * This slot is rendered in `CleanRootNavigator` as a sibling of the whole
 * `Stack.Navigator` and IMMEDIATELY BEFORE `RootCrisisButton`. Because siblings
 * paint in JSX order, nothing placed in this slot can ever paint above the
 * crisis button. Not "should not" — CANNOT, by construction. Its box is the
 * navigator's root `View`, so inset-0 means the screen.
 *
 * This is the same move `RootCrisisButton` itself made in MAINT-290, for the
 * same reason: the affordance stops being each screen's responsibility to get
 * right. There, ~10 per-screen button mounts became one root mount so a new
 * screen could not ship without 988 access. Here, N bespoke overlay hosts become
 * one slot so a new overlay cannot ship occluding it.
 *
 * ── MUTUAL EXCLUSION IS AN EXPLICIT INVARIANT ──
 *
 * As separate native windows, two `<Modal>`s on one screen could not conflict.
 * Sharing one slot, they can — `InsightsScreen` hosts two composers that were
 * previously independent `<Modal>`s. At most one overlay may hold the slot.
 * A second claim replaces the first and logs, rather than silently stacking two
 * overlays whose BackHandlers would fire LIFO and whose dismissals would leave
 * the other orphaned.
 *
 * ── THE FOCUS TRAP IS THE SLOT'S JOB, NOT THE OVERLAY'S (DEBUG-575) ──
 *
 * This section used to say the focus trap "remains the overlay's own
 * responsibility". That was wrong, and it was wrong in the one direction that
 * costs 988 access.
 *
 * An overlay published here is a DIRECT NATIVE SIBLING of `RootCrisisButton`
 * and `CrisisKeyboardAccessory` — `RootOverlaySlot` renders a bare fragment, so
 * it adds no view of its own. `accessibilityViewIsModal` prunes the RECEIVER'S
 * SIBLINGS from the accessibility tree. So an overlay that sets it here does not
 * trap focus within itself; it deletes both root crisis affordances from the
 * tree. Measured on the gate sim: with the weekly-reflection composer open,
 * `crisis-button-root` had ZERO occurrences in the hierarchy while being plainly
 * painted on screen, and one occurrence again the moment the sheet closed.
 *
 * That is DEBUG-406's own defect displaced one layer down — converted from
 * visual occlusion, which a screenshot catches, to tree-level occlusion for
 * assistive-technology users, which it does not.
 *
 * NEVER set `accessibilityViewIsModal` on an overlay published into this slot.
 * The trap is supplied instead by `CleanRootNavigator`, which hides the
 * `Stack.Navigator` subtree (and nothing else) while `isRootOverlayOccupied()`
 * holds — see `useIsRootOverlayOccupied` below. That confines assistive tech to
 * the overlay PLUS the crisis affordances, which is the trap actually wanted,
 * and it works on Android too, where `accessibilityViewIsModal` is a no-op.
 *
 * ── WHAT THIS SLOT STILL DOES NOT DO ──
 *
 * It does not supply the BackHandler, the reserved geometry or the backdrop.
 * Those remain the overlay's own responsibility, because they are per-overlay
 * decisions — see `crisisButtonGeometry.ts` and any DEBUG-406 conversion for
 * the pattern.
 */

import React, { useEffect } from 'react';
import { create } from 'zustand';
import { logSystem } from '@/core/services/logging';

interface RootOverlayState {
  /** Identity of the overlay currently holding the slot, or null. */
  ownerId: string | null;
  /** The element to render. */
  node: React.ReactNode | null;
  claim: (id: string, node: React.ReactNode) => void;
  release: (id: string) => void;
}

export const useRootOverlayStore = create<RootOverlayState>((set, get) => ({
  ownerId: null,
  node: null,

  claim: (id, node) => {
    const { ownerId } = get();
    if (ownerId !== null && ownerId !== id) {
      // Not a crash — a stacked overlay is a UI bug, not a safety one, and
      // throwing here would take down a screen. But it must be loud: the
      // displaced overlay's owner still believes it is visible, so its
      // BackHandler and focus management are now operating on nothing.
      logSystem(
        `Root overlay slot claimed by "${id}" while held by "${ownerId}" — replacing`,
      );
    }
    set({ ownerId: id, node });
  },

  release: (id) => {
    // Guarded: an overlay that was already displaced must not clear the slot
    // out from under whoever displaced it.
    if (get().ownerId !== id) return;
    set({ ownerId: null, node: null });
  },
}));

/**
 * Publish an overlay into the root slot for as long as `visible` holds.
 *
 * @param id     stable identity for this overlay (used for mutual exclusion)
 * @param visible whether the overlay should currently be shown
 * @param render  called to build the element; only invoked while visible
 *
 * The element is rebuilt on every render while visible, so it closes over fresh
 * props and state exactly as an inline render would.
 */
export function useRootOverlay(
  id: string,
  visible: boolean,
  render: () => React.ReactNode,
): void {
  const claim = useRootOverlayStore((s) => s.claim);
  const release = useRootOverlayStore((s) => s.release);

  // Effect, not render-phase: mutating a store during render is unsafe under
  // concurrent rendering, and the slot is a side effect on shared state.
  useEffect(() => {
    if (visible) {
      claim(id, render());
    } else {
      release(id);
    }
  });

  // Release on unmount too — a screen popped while its overlay is open would
  // otherwise leave the overlay orphaned on top of the next screen.
  useEffect(() => () => release(id), [id, release]);
}

/**
 * Renders whatever currently holds the slot.
 *
 * MUST be placed in `CleanRootNavigator` as a sibling of `Stack.Navigator` and
 * IMMEDIATELY BEFORE `RootCrisisButton`. Both halves matter: a sibling of the
 * navigator so its box is the screen, and before the button so the button always
 * paints above it.
 */
export const RootOverlaySlot: React.FC = () => {
  const node = useRootOverlayStore((s) => s.node);
  return <>{node}</>;
};

/**
 * Whether any overlay currently holds the slot (DEBUG-575).
 *
 * `CleanRootNavigator` subscribes to this to hide the `Stack.Navigator` subtree
 * from assistive technology while an overlay is up. A boolean is sufficient
 * because mutual exclusion is already an invariant of this store: at most one
 * overlay holds the slot at a time.
 *
 * Keyed on `ownerId` rather than `node` deliberately — `node` is a fresh element
 * on every render of the publishing component, so a selector on it would return
 * a new reference each time and re-render the whole navigator.
 */
export const useIsRootOverlayOccupied = (): boolean =>
  useRootOverlayStore((s) => s.ownerId !== null);

export default RootOverlaySlot;
