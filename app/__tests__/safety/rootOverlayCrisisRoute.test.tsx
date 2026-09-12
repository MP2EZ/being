/**
 * DEBUG-575 finding 2 — no overlay may hold the root slot on a crisis route.
 *
 * THE DEFECT. `RootOverlaySlot` paints above EVERY navigator route, including
 * `CrisisResources` (a `Stack.Screen` with `presentation: 'modal'` — a JS stack
 * modal, so there is no separate native window to escape into). An overlay left
 * holding the slot therefore covered the destination the crisis button had just
 * navigated to. Not dimmed: DEBUG-406 made these backdrops OPAQUE to satisfy
 * WCAG 1.4.11, and the overlay root claims the touch responder, so the crisis
 * screen was invisible AND inert. `RootCrisisButton` then suppressed itself on
 * that route, so the affordance the user had just pressed vanished with nothing
 * replacing it — a zero-988 state produced BY the crisis tap.
 *
 * This violates the invariant `crisis-zero-988-windows.test.tsx` already states:
 * a route may suppress the root crisis overlay ONLY IF every reachable render
 * state of that route mounts its own crisis affordance.
 *
 * WHY A UNIT TEST AND NOT A STATIC RULE. No static analysis reaches this. The
 * two-list reconciliation, INFRA-531's crisis-import detector and
 * check-modal-occlusion-guard.js all missed it, and none of them could catch it:
 * "an overlay published into a slot that paints above the navigator, while the
 * navigator's active route is the crisis destination" is a RUNTIME relation
 * between two independent subtrees. All three defects on this branch were found
 * by running the thing, not by reading it.
 *
 * The Maestro segment covers the user-visible half. This covers the invariant
 * directly, in milliseconds, and can go red.
 */
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  useRootOverlayStore,
  useRootOverlay,
  CRISIS_DESTINATION_ROUTES,
  SCREEN_OWNED_988_ROUTES,
} from '@/core/navigation/rootOverlaySlot';
import { SUPPRESSED_ROUTES } from '@/features/crisis/components/RootCrisisButton';

const node = <Text>overlay</Text>;

const reset = () =>
  useRootOverlayStore.setState({
    ownerId: null,
    node: null,
    overlayForbiddenRouteActive: false,
  });

describe('DEBUG-575 · the slot is released when a crisis route becomes active', () => {
  beforeEach(reset);

  it('releases an overlay that is holding the slot', () => {
    const s = useRootOverlayStore.getState();
    s.claim('weekly-reflection-composer', node);
    expect(useRootOverlayStore.getState().ownerId).toBe('weekly-reflection-composer');

    useRootOverlayStore.getState().syncActiveRoute('CrisisResources');

    const after = useRootOverlayStore.getState();
    expect(after.ownerId).toBeNull();
    expect(after.node).toBeNull();
  });

  it('releases unconditionally — the owner cannot veto it', () => {
    // Deliberately NOT the guarded `release(id)` path: the owner did not ask for
    // this and must not be able to keep the slot. 988 wins over what is on screen.
    useRootOverlayStore.getState().claim('session-note-composer', node);
    useRootOverlayStore.getState().syncActiveRoute('CrisisResources');
    expect(useRootOverlayStore.getState().ownerId).toBeNull();
  });

  it('refuses a NEW claim while a crisis route is active', () => {
    useRootOverlayStore.getState().syncActiveRoute('CrisisResources');
    useRootOverlayStore.getState().claim('weekly-reflection-composer', node);
    expect(useRootOverlayStore.getState().ownerId).toBeNull();
  });

  it('allows claims again once the user leaves the crisis route', () => {
    useRootOverlayStore.getState().syncActiveRoute('CrisisResources');
    useRootOverlayStore.getState().syncActiveRoute('Main');
    useRootOverlayStore.getState().claim('weekly-reflection-composer', node);
    expect(useRootOverlayStore.getState().ownerId).toBe('weekly-reflection-composer');
  });

  it('leaves the slot alone on every route that is not forbidden', () => {
    // Route-keyed, NOT release-on-any-navigation: killing overlays on unrelated
    // pushes would be a behaviour change nobody asked for.
    //
    // FEAT-570 NARROWED THIS LIST, deliberately. It used to include
    // `AssessmentFlow` and `LegalGate`, pinning that they do NOT release. Those
    // two moved into SCREEN_OWNED_988_ROUTES and now DO release — see the
    // FEAT-570 block below for why refuse-only was not enough. The routes left
    // here are the ones this assertion still means.
    useRootOverlayStore.getState().claim('weekly-reflection-composer', node);
    for (const route of ['Main', 'VoiceReflection', 'Learn', 'ExportData']) {
      useRootOverlayStore.getState().syncActiveRoute(route);
      expect(useRootOverlayStore.getState().ownerId).toBe('weekly-reflection-composer');
    }
  });

  it('is keyed on its own constant, not on SUPPRESSED_ROUTES', () => {
    // SUPPRESSED_ROUTES means "the FAB steps aside here" and also holds
    // AssessmentFlow and LegalGate, which are not crisis DESTINATIONS. Reusing a
    // set whose meaning is adjacent-but-different is how the guidance/ and
    // consent/ two-list failures started.
    expect(CRISIS_DESTINATION_ROUTES).toEqual(['CrisisResources']);
    expect(CRISIS_DESTINATION_ROUTES).not.toContain('AssessmentFlow');
    expect(CRISIS_DESTINATION_ROUTES).not.toContain('LegalGate');
  });

  it('tolerates an undefined route name without releasing', () => {
    useRootOverlayStore.getState().claim('weekly-reflection-composer', node);
    useRootOverlayStore.getState().syncActiveRoute(undefined);
    expect(useRootOverlayStore.getState().ownerId).toBe('weekly-reflection-composer');
  });
});

/**
 * FEAT-570 — the slot also refuses, and releases, on routes where the SCREEN
 * owns the 988 affordance.
 *
 * THE GAP THIS CLOSES. `CRISIS_DESTINATION_ROUTES` is strictly narrower than
 * `RootCrisisButton.SUPPRESSED_ROUTES`. On `AssessmentFlow` and `LegalGate` the
 * root FAB deliberately hides and the screen supplies its own route to 988
 * (`EnhancedAssessmentFlow`'s own control; `CombinedLegalGateScreen`'s pinned
 * pre-consent footer). An overlay published there paints an OPAQUE backdrop over
 * the only affordance present, and `NavigatorA11yHost` additionally prunes the
 * whole navigator subtree from the accessibility tree while the slot is held —
 * so the state is zero-988 for sighted and assistive users alike.
 *
 * It was latent while both claimants lived in `features/insights/` and were
 * reachable only by a deliberate tap on Insights. FEAT-570 adds the first
 * claimant armed at the APP ROOT, which is what makes it live.
 *
 * WHY REFUSING THE CLAIM IS NOT ENOUGH — the finding that produced this block.
 * Refusal covers one ordering (route becomes active, then something claims). The
 * other ordering is reachable: `useBugReportShake()` is called at `App.tsx:49`,
 * inside `App()` and above `NavigationContainer`, so the gesture is armed while
 * `CleanRootNavigator` is still rendering `LoadingScreen`. A claim can therefore
 * be standing BEFORE any route exists to check, and the navigator's first real
 * route on a fresh install is `LegalGate`. `useRootOverlay`'s claim effect also
 * has no dependency array, so it races `onReady`'s first `syncActiveRoute` on
 * every launch. Release is the half that covers those orderings.
 *
 * ONE PREDICATE, NOT TWO FLAGS. The store carries a single
 * `overlayForbiddenRouteActive` computed from the union of the two constants.
 * Two booleans with adjacent meanings is the `guidance/` + `consent/`
 * two-list drift failure rebuilt inside the slot itself.
 */
describe('FEAT-570 · routes where the screen owns the 988 affordance', () => {
  beforeEach(reset);

  it.each([...SCREEN_OWNED_988_ROUTES])('refuses a new claim on %s', (route) => {
    useRootOverlayStore.getState().syncActiveRoute(route);
    useRootOverlayStore.getState().claim('bug-report-form', node);
    expect(useRootOverlayStore.getState().ownerId).toBeNull();
  });

  it.each([...SCREEN_OWNED_988_ROUTES])(
    'releases an overlay already holding the slot when %s becomes active',
    (route) => {
      // The boot-race half. Refusal alone leaves this state standing.
      useRootOverlayStore.getState().claim('bug-report-form', node);
      useRootOverlayStore.getState().syncActiveRoute(route);
      expect(useRootOverlayStore.getState().ownerId).toBeNull();
      expect(useRootOverlayStore.getState().node).toBeNull();
    },
  );

  it('allows claims again once the user leaves a screen-owned route', () => {
    useRootOverlayStore.getState().syncActiveRoute('LegalGate');
    useRootOverlayStore.getState().syncActiveRoute('Main');
    useRootOverlayStore.getState().claim('bug-report-form', node);
    expect(useRootOverlayStore.getState().ownerId).toBe('bug-report-form');
  });

  it('keeps its own named constant, distinct from the crisis-destination set', () => {
    // The two sets encode different REASONS, which is what makes their
    // maintenance rules different. CRISIS_DESTINATION_ROUTES means "the user was
    // sent here FOR 988 and an overlay covers the destination".
    // SCREEN_OWNED_988_ROUTES means "the FAB stepped aside because the screen
    // owns the affordance, and an overlay covers THAT". Merging them would make
    // CrisisResources and LegalGate look like the same kind of thing, and the
    // next editor would reasonably delete one.
    expect(SCREEN_OWNED_988_ROUTES).toEqual(['AssessmentFlow', 'LegalGate']);
    expect(SCREEN_OWNED_988_ROUTES).not.toContain('CrisisResources');
  });
});

/**
 * FEAT-570 — the two-list reconciliation, made mechanical.
 *
 * `rootOverlaySlot`'s docblock rules out importing `SUPPRESSED_ROUTES` in the
 * SOURCE, and that rule is correct: the sets mean different things and reuse is
 * how the `guidance/` and `consent/` failures started. But refusing to relate
 * them at all recreates the same hazard from the other side — add a route to
 * `SUPPRESSED_ROUTES` and a new zero-988 window opens here silently.
 *
 * A TEST may import both, and this is where the relation is enforced. Superset,
 * not equality, so over-refusal by the slot stays legal; the literal snapshot
 * above makes any addition a reviewed edit rather than a silent one.
 */
describe('FEAT-570 · every FAB-suppressed route is forbidden to the slot', () => {
  const covered = new Set([...CRISIS_DESTINATION_ROUTES, ...SCREEN_OWNED_988_ROUTES]);

  it.each([...SUPPRESSED_ROUTES])(
    '%s is covered by the slot’s forbidden set',
    (route) => {
      expect(covered.has(route)).toBe(true);
    },
  );

  it('is not vacuous — SUPPRESSED_ROUTES is populated and is the real set', () => {
    // Without this, an emptied SUPPRESSED_ROUTES would make every case above
    // pass by having nothing to iterate.
    expect(SUPPRESSED_ROUTES.size).toBeGreaterThanOrEqual(3);
    expect(SUPPRESSED_ROUTES.has('CrisisResources')).toBe(true);
    expect(SUPPRESSED_ROUTES.has('AssessmentFlow')).toBe(true);
    expect(SUPPRESSED_ROUTES.has('LegalGate')).toBe(true);
  });

  it('would go red if a route were added to SUPPRESSED_ROUTES and not here', () => {
    // Proves the relation can still fail — the matcher is not merely reporting
    // a superset that happens to be true today.
    const withNewRoute = new Set([...SUPPRESSED_ROUTES, 'SomeFutureSuppressedRoute']);
    const uncovered = [...withNewRoute].filter((r) => !covered.has(r));
    expect(uncovered).toEqual(['SomeFutureSuppressedRoute']);
  });
});

/**
 * FEAT-570 — a REFUSED claimant has to be told, or the refusal is worse than
 * the thing it prevents.
 *
 * `claim()` used to log and return with no signal, and `useRootOverlay`'s revoke
 * effect only fires for an owner that WAS holding — so a claimant refused at the
 * door was never told. Combined with the claim effect having no dependency array
 * (it re-runs on every render), a refused overlay leaves `visible` true, re-claims
 * on every render, and then pops at the user the instant they leave the route.
 *
 * The two `features/insights/` composers cannot reach this: they are mounted
 * inside `InsightsScreen` and can never be rendered while a forbidden route is
 * active. An overlay armed at the app root can, which is why this only becomes a
 * defect with FEAT-570's claimant.
 */
describe('FEAT-570 · refusal is signalled back to the owner', () => {
  beforeEach(reset);

  it('claim() reports whether the slot was actually taken', () => {
    expect(useRootOverlayStore.getState().claim('bug-report-form', node)).toBe(true);
    reset();
    useRootOverlayStore.getState().syncActiveRoute('LegalGate');
    expect(useRootOverlayStore.getState().claim('bug-report-form', node)).toBe(false);
  });

  it('calls onRevoked when the claim is refused at the door', () => {
    const onRevoked = jest.fn();
    useRootOverlayStore.getState().syncActiveRoute('AssessmentFlow');

    const Overlay: React.FC = () => {
      useRootOverlay('bug-report-form', true, () => node, onRevoked);
      return null;
    };
    render(<Overlay />);

    expect(useRootOverlayStore.getState().ownerId).toBeNull();
    expect(onRevoked).toHaveBeenCalled();
  });

  it('does not call onRevoked when the claim succeeds', () => {
    // Anti-vacuity: proves the assertion above is reading the refusal and not
    // just any render of the hook.
    const onRevoked = jest.fn();
    const Overlay: React.FC = () => {
      useRootOverlay('bug-report-form', true, () => node, onRevoked);
      return null;
    };
    render(<Overlay />);

    expect(useRootOverlayStore.getState().ownerId).toBe('bug-report-form');
    expect(onRevoked).not.toHaveBeenCalled();
  });
});
