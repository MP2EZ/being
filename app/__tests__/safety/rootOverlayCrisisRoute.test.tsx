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
import {
  useRootOverlayStore,
  CRISIS_DESTINATION_ROUTES,
} from '@/core/navigation/rootOverlaySlot';

const node = <Text>overlay</Text>;

const reset = () =>
  useRootOverlayStore.setState({
    ownerId: null,
    node: null,
    crisisRouteActive: false,
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

  it('leaves the slot alone on every non-crisis route', () => {
    // Route-keyed, NOT release-on-any-navigation: killing overlays on unrelated
    // pushes would be a behaviour change nobody asked for.
    useRootOverlayStore.getState().claim('weekly-reflection-composer', node);
    for (const route of ['Main', 'AssessmentFlow', 'LegalGate', 'VoiceReflection']) {
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
