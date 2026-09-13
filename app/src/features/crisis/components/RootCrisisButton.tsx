/**
 * RootCrisisButton — MAINT-290 (Flow Redesign 1: crisis button → persistent root mount)
 *
 * Single persistent crisis-button overlay, mounted ONCE at the navigation root
 * (sibling of the root Stack.Navigator, inside NavigationContainer). Replaces the
 * ~10 per-screen / per-navigator CollapsibleCrisisButton mounts so 988 access can
 * never regress when flows are restructured (FEAT-286 Finding 5): a screen or
 * future practice step can no longer ship with no crisis affordance, because the
 * button is no longer the screen's responsibility to mount.
 *
 * Behavior is driven by the ACTIVE ROOT-STACK route name (see getActiveRootRouteName
 * — the leaf route is intentionally ignored so a practice flow's inner screens still
 * resolve to the practice route):
 *   - SUPPRESSED on routes that own their own crisis affordance:
 *       • CrisisResources — the destination itself (a button to the screen you're on)
 *       • AssessmentFlow  — keeps its per-screen `prominent` buttons; MAINT-290 must
 *                           NOT touch the assessment flow, so suppress here to avoid a
 *                           double mount / losing the safety-tuned prominent emphasis
 *       • LegalGate       — owns a persistent inline Call-988 / Text footer, pinned
 *                           OUTSIDE its ScrollView (DEBUG-390) so it is on screen at
 *                           every scroll offset, on both render branches.
 *
 *                           Suppression here is CONDITIONAL on that. Until DEBUG-390
 *                           this bullet read "under-age gate with its own inline
 *                           Call-988 / Text UI" — true of the under-age branch, false
 *                           of the main one, where the footer was the last child of a
 *                           1433pt ScrollView (988 button top at 95.3% of scroll
 *                           depth; 642pt of scrolling on iPhone 15, 754pt on SE 3).
 *                           DEBUG-372 then made LegalGate the route a dismissed
 *                           cold-start `being://crisis` LANDS on, turning a stale
 *                           comment into a live regression: a persistent 1-tap 988
 *                           traded for a scroll-then-tap one.
 *
 *                           Suppression is earned by an affordance reachable WITHOUT
 *                           SCROLLING, never by one that merely exists. Enforced by
 *                           __tests__/safety/crisis-zero-988-windows.test.tsx, which
 *                           now pins the footer's POSITION and not just its presence —
 *                           re-nesting it inside the ScrollView fails CI.
 *
 *                           Do NOT add LegalGate to IMMERSIVE_ROUTES: it is a consent
 *                           screen, not a meditative surface, and `standard` full
 *                           opacity is the correct emphasis.
 *   - `immersive` (starts faded — see FADED_OPACITY) during meditative practice flows/timers.
 *   - `standard` everywhere else (tabs, onboarding, library, module detail, subscription…).
 *
 * NATIVE <Modal> EXCEPTION — NARROWED BY DEBUG-403, THEN NARROWED TO ONE SITE BY
 * DEBUG-406. React Native's <Modal> renders in a separate native view hierarchy ABOVE any
 * JS overlay, so this button is not merely dimmed while a RN <Modal> is open: it is not on
 * screen at all. DEBUG-403 ruled it does NOT stand on an IMMERSIVE route and left it
 * standing on STANDARD routes as a class. DEBUG-406 dissolved the class: there is no
 * blanket standard-route exception, only one surviving per-site ruling (see below).
 *
 * Why the line falls there. IMMERSIVE_ROUTES is the set already treated as elevated
 * risk — meditative, eyes-closed, emotionally exposed practice surfaces — which is the
 * whole reason this button stays MOUNTED (faded) there rather than being dropped as it
 * is on SUPPRESSED_ROUTES. A <Modal> opening on top of one removes the affordance
 * entirely, for an indeterminate duration, on the surface class the app has already
 * classified as needing it most.
 *
 * The previous wording here — "this matches the prior per-screen behavior — NOT a
 * regression — and none of those modals sit on the crisis path" — was a MIGRATION-PARITY
 * claim (MAINT-290 did not regress against the pre-existing per-screen code), not a
 * correctness one. It also predated FEAT-291, which added DailyLoop to IMMERSIVE_ROUTES,
 * so it never actually evaluated the immersive-plus-Modal combination.
 *
 * DEBUG-406 AUDITED THE FOUR STANDARD-ROUTE SITES INDIVIDUALLY. Three were wrong.
 *
 * DEBUG-403 kept those four on the reasoning above — non-immersive, each opened by an
 * explicit user tap — but that was a judgement BY ANALOGY, not a verification of any one
 * of them, so it was tracked rather than treated as settled. The audit ruled per site,
 * and the standard it applied is worth keeping: a site's exception must be earned by
 * THAT SITE'S facts, never by its route class.
 *
 * It also retired the tap-count framing. "<3 taps" presumes the user can SEE the
 * affordance and is counting presses toward it; under a <Modal> there is nothing on
 * screen to count toward. The governing invariant is the one at lines 34-38 and in
 * __tests__/safety/crisis-zero-988-windows.test.tsx: NO REACHABLE RENDER STATE MAY HAVE
 * ZERO 988 AFFORDANCE. Suppression is earned by an affordance reachable without
 * scrolling; a <Modal> earns it with nothing at all.
 *
 *   • ResumeSessionModal    — DailyLoopNavigator, IMMERSIVE. FIXED by DEBUG-403: it is
 *                             no longer a <Modal>, but a full-bleed absolute overlay with
 *                             accessibilityViewIsModal, so this button paints above it.
 *                             It was also the worst case, being AUTO-triggered on stale-
 *                             session detection — a user could reach zero 988 affordance
 *                             without having tapped anything.
 *   • ThresholdEducationModal   — ProfileScreen. DOES NOT STAND → CONVERTED (DEBUG-406).
 *                             Its own copy tells the reader to seek help while occluding
 *                             the app's only route to it, it carries no 988 affordance of
 *                             its own, and its dwell is unbounded (four prose sections).
 *   • SessionNoteComposer       — WellnessScreeningTrends. DOES NOT STAND → CONVERTED.
 *                             The most severe: the only site occluding TWO affordances,
 *                             this button AND the host card's compliance-mandated
 *                             non-dismissible inline 988 link. Its entry gesture is
 *                             score-anchored — tapping a point on one's own PHQ-9/GAD-7
 *                             chart. Its feature flag being dark did not save it: the
 *                             flag model is "PostHog promotes; build-time is the floor",
 *                             so a dashboard toggle could open the window with no build.
 *   • WeeklyReflectionComposer  — WeeklyReflectionCard. DOES NOT STAND → CONVERTED.
 *                             The app already ships this content class WITH crisis access
 *                             (VoiceReflection keeps this button and runs a crisis scan);
 *                             this had neither. Its >=4-check-ins gate selects TOWARD
 *                             risk — habituated daily users — not away from it.
 *   • NotificationTimePicker    — OnboardingScreen. **STANDS** — the one surviving
 *                             exception, and it is CONDITIONAL. It stands because the
 *                             surface carries zero wellness or distress semantics (a
 *                             time spinner with a fixed, non-scrolling Cancel/Done
 *                             header), NOT because its route is standard and NOT because
 *                             the user tapped to open it. It is also the only site where
 *                             the <Modal> is iOS-only; Android renders a native OS dialog
 *                             no RN change can paint above. IF IT EVER GAINS WELLNESS
 *                             FRAMING — a mood-check-in reminder, an assessment-due nudge,
 *                             any copy referencing the user's state — THE RULING IS VOID
 *                             AND IT CONVERTS.
 *
 * The three conversions render into the ROOT OVERLAY SLOT
 * (core/navigation/rootOverlaySlot), a sibling of the Stack.Navigator painted immediately
 * BEFORE this button. That ordering is why they cannot occlude it — not by convention but
 * by construction, the same move MAINT-290 made for this button itself. It also fixes a
 * second trap: RN resolves position:'absolute' against the PARENT's padding box, so an
 * overlay rendered inside a card inside a ScrollView covers the card and scrolls away.
 *
 * MECHANICAL PIN: scripts/check-modal-occlusion-guard.js + the mirroring
 * __tests__/safety/modalOcclusionGuard.test.ts fail on any <Modal> in app/src outside an
 * allowlist, and fail on a STALE allowlist entry too. That guard exists because a
 * Protected Paths row could not have caught this — none of the four files is on that list
 * and none should be, since the risk is a component SHAPE, not a directory.
 *
 * KEYBOARD — A SECOND, UNRELATED OCCLUDER (DEBUG-406, tracked separately). The iOS
 * keyboard renders in UIRemoteKeyboardWindow, a separate UIWindow ABOVE the app's, so
 * zIndex 9999 is as irrelevant to it as it is to a <Modal>. This button's top edge sits at
 * most 156pt above the bottom, and every shipping iPhone keyboard is taller — so whenever
 * any keyboard is up, 988 access via this button is gone. That is APP-WIDE (the journal
 * and VoiceReflection have it too), not specific to the converted sheets, which is why
 * DEBUG-406 did not attempt it. The composers mitigate it by no longer auto-focusing their
 * input, so the sheet and this button are on screen together at the moment of opening, and
 * Cancel stays reachable above the keyboard.
 *
 * CelebrationToast was listed here as a live exception and is NOT one: it has zero JSX
 * mount sites across BOTH test roots and appears only in comments. Removed from the list.
 *
 * CrisisErrorBoundary keeps its OWN CollapsibleCrisisButton: it lives outside the
 * navigation tree and dials tel:988 directly, so it is the last-resort 988 access when
 * a render crash removes this root-mounted overlay.
 */
import React from 'react';
import { CollapsibleCrisisButton, type CrisisButtonMode } from './CollapsibleCrisisButton';
// DEBUG-341/DEBUG-450: eager import on the crisis path (CLAUDE.md rule). The retry,
// deadline and guarded-dial fallback this used to declare inline now live in the shared
// module so the keyboard accessory runs the same path — see its header before editing.
import { navigateToCrisisResources } from '@/features/crisis/utils/navigateToCrisisResources';

/**
 * Root-stack routes that already own a crisis affordance → suppress the overlay.
 *
 * 🔴 EXPORTED ON PURPOSE (FEAT-417) — DO NOT "TIDY IT AWAY". Nothing in `app/src`
 * consumes this Set at runtime; the only importer is
 * `__tests__/RootCrisisButton.test.tsx`, and that is exactly why the export
 * exists. Until FEAT-417 the suite iterated hardcoded COPIES of these two Sets,
 * so adding a brand-new route name here — silently deleting the 988 affordance
 * from a whole screen — failed zero tests. The test now derives its behavioural
 * cases from these Sets and pins their membership literally.
 *
 * Adding a route here is a safety decision, not a cleanup. It must be earned by
 * an affordance reachable WITHOUT SCROLLING (see the header block above), and it
 * will fail the membership snapshot until someone deliberately updates it.
 */
export const SUPPRESSED_ROUTES: ReadonlySet<string> = new Set([
  'CrisisResources',
  'AssessmentFlow',
  'LegalGate',
]);

/**
 * Root-stack routes that are meditative practices → faded immersive mode.
 *
 * Exported for the same reason as `SUPPRESSED_ROUTES` above.
 */
export const IMMERSIVE_ROUTES: ReadonlySet<string> = new Set([
  'DailyLoop', // FEAT-291 single-loop daily-practice prototype (meditative practice surface)
  'PracticeTimer',
  'ReflectionTimer',
  'SortingPractice',
  'BodyScan',
  'GuidedBodyScan',
]);

/** Stable testID for the single root crisis button (replaces the old per-screen ids). */
export const ROOT_CRISIS_BUTTON_TEST_ID = 'crisis-button-root';

export interface RootCrisisButtonProps {
  /**
   * Active ROOT-stack route name, supplied by NavigationContainer's onStateChange
   * (see CleanRootNavigator). Undefined before the container is ready → treated as a
   * non-suppressed standard surface.
   */
  routeName?: string | undefined;
}

export const RootCrisisButton: React.FC<RootCrisisButtonProps> = ({ routeName }) => {
  if (routeName && SUPPRESSED_ROUTES.has(routeName)) {
    return null;
  }

  const mode: CrisisButtonMode =
    routeName && IMMERSIVE_ROUTES.has(routeName) ? 'immersive' : 'standard';

  return (
    <CollapsibleCrisisButton
      mode={mode}
      testID={ROOT_CRISIS_BUTTON_TEST_ID}
      onNavigate={() => {
        // DEBUG-450 — this body was extracted VERBATIM to
        // utils/navigateToCrisisResources.ts so the keyboard accessory runs the identical
        // path rather than a re-typed copy. Behaviour is unchanged: synchronous first
        // attempt, then DEBUG-341's retry-then-fallback with its single-flight guard and
        // 400ms deadline. Read that module before changing anything here.
        //
        // INFRA-297: this call still runs INSIDE onNavigate, i.e. downstream of
        // CollapsibleCrisisButton's `beginCrisisTap → onNavigate() → resetFade()`
        // ordering, which the ordering test pins by treating onNavigate as an opaque spy.
        navigateToCrisisResources('crisis_button', 'RootCrisisButton');
      }}
    />
  );
};

export default RootCrisisButton;
