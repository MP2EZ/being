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
 * ── AND NO OVERLAY MAY HOLD THE SLOT ON A CRISIS ROUTE (DEBUG-575 finding 2) ──
 *
 * The slot paints above EVERY navigator route, `CrisisResources` included — it is
 * a `Stack.Screen` with `presentation: 'modal'`, a JS stack modal with no separate
 * native window to escape into. So an overlay left holding the slot when the user
 * taps the crisis button covers the destination it just sent them to. Not dimmed:
 * DEBUG-406 made these backdrops OPAQUE to satisfy WCAG 1.4.11, and the overlay
 * root claims the touch responder, so the crisis screen is invisible AND inert.
 * `RootCrisisButton` then suppresses itself on that route, so the affordance the
 * user just pressed vanishes and nothing replaces it.
 *
 * That is the invariant `crisis-zero-988-windows.test.tsx` already states — "a
 * route may suppress the root crisis overlay ONLY IF every reachable render state
 * of that route mounts its own crisis affordance" — violated by a render state
 * DEBUG-406 created and nobody re-checked.
 *
 * Enforced HERE rather than in `RootCrisisButton`'s handler, for three reasons:
 * the button knows nothing about overlays and must not start (MAINT-290's whole
 * point); it is not the only entrant, so a handler-side release covers one of N
 * (`CrisisKeyboardAccessory`, `being://crisis` deep links, and the 400ms retry
 * inside `navigateToCrisisResources` all reach the same route); and the release
 * must come AFTER the navigate, which a tap handler cannot express — that util
 * requires its first attempt stay first and stay synchronous.
 *
 * Driven by navigation state, so every entrant is covered by construction rather
 * than by enumeration. Keyed on an explicit crisis-route set, NOT on
 * `RootCrisisButton.SUPPRESSED_ROUTES`: that set means "the FAB steps aside here"
 * and also holds `AssessmentFlow` and `LegalGate`, which are not crisis
 * destinations. Reusing a set whose meaning is adjacent-but-different is how the
 * `guidance/` and `consent/` two-list failures started.
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

/**
 * Routes on which no overlay may hold the slot (DEBUG-575).
 *
 * Deliberately its own named constant rather than a reuse of
 * `RootCrisisButton.SUPPRESSED_ROUTES` — see the docblock above.
 */
export const CRISIS_DESTINATION_ROUTES: readonly string[] = ['CrisisResources'];

const isCrisisRoute = (routeName?: string | null): boolean =>
  typeof routeName === 'string' && CRISIS_DESTINATION_ROUTES.includes(routeName);

interface RootOverlayState {
  /** Identity of the overlay currently holding the slot, or null. */
  ownerId: string | null;
  /** The element to render. */
  node: React.ReactNode | null;
  /** True while a crisis destination is the active root route. */
  crisisRouteActive: boolean;
  claim: (id: string, node: React.ReactNode) => void;
  release: (id: string) => void;
  /** Called from CleanRootNavigator's onStateChange / onReady. */
  syncActiveRoute: (routeName?: string | null) => void;
}

export const useRootOverlayStore = create<RootOverlayState>((set, get) => ({
  ownerId: null,
  node: null,
  crisisRouteActive: false,

  claim: (id, node) => {
    const { ownerId, crisisRouteActive } = get();

    // DEBUG-575 finding 2, the symmetric half: refuse rather than paint over the
    // crisis destination. Nothing publishes from CrisisResources today — both
    // claimants live in features/insights/components/ — but this closes the
    // direction a future overlay would otherwise walk into, and it is two lines.
    if (crisisRouteActive) {
      logSystem(
        `Root overlay slot claim by "${id}" REFUSED — a crisis route is active`,
      );
      return;
    }

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

  syncActiveRoute: (routeName) => {
    const active = isCrisisRoute(routeName);
    const { ownerId } = get();

    // Unconditional release, NOT the guarded `release(id)` above: the owner did
    // not ask for this and must not be able to veto it. 988 reachability wins
    // over whatever is on screen.
    if (active && ownerId !== null) {
      logSystem(
        `Root overlay slot released — "${ownerId}" cannot hold it on crisis route "${routeName}"`,
      );
      set({ ownerId: null, node: null, crisisRouteActive: true });
      return;
    }
    set({ crisisRouteActive: active });
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
  onRevoked?: () => void,
): void {
  const claim = useRootOverlayStore((s) => s.claim);
  const release = useRootOverlayStore((s) => s.release);
  const currentOwner = useRootOverlayStore((s) => s.ownerId);

  // DEBUG-575 finding 2. The slot can now be taken away without the owner
  // asking — `syncActiveRoute` releases it unconditionally when a crisis route
  // becomes active. Centralised here rather than left to each consumer: both
  // callers would otherwise have to remember the invariant, which is how the
  // two-list failures start.
  //
  // Without this the owner's `visible` stays true, so the claim effect below
  // re-runs and re-publishes the moment the user navigates BACK — throwing a
  // reflection sheet at someone returning from crisis resources. Telling the
  // owner to close is what makes the release stick.
  const onRevokedRef = React.useRef(onRevoked);
  onRevokedRef.current = onRevoked;
  const heldRef = React.useRef(false);

  useEffect(() => {
    if (currentOwner === id) {
      heldRef.current = true;
      return;
    }
    if (heldRef.current) {
      heldRef.current = false;
      if (visible) onRevokedRef.current?.();
    }
  }, [currentOwner, id, visible]);

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
