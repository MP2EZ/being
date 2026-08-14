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
 * NATIVE <Modal> EXCEPTION — NARROWED BY DEBUG-403. React Native's <Modal> renders in a
 * separate native view hierarchy ABOVE any JS overlay, so this button is not merely
 * dimmed while a RN <Modal> is open: it is not on screen at all. The exception still
 * stands on STANDARD routes. It does NOT stand on an IMMERSIVE route.
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
 * Current state of each mounted RN <Modal>:
 *   • ResumeSessionModal    — DailyLoopNavigator, IMMERSIVE. FIXED by DEBUG-403: it is
 *                             no longer a <Modal>, but a full-bleed absolute overlay with
 *                             accessibilityViewIsModal, so this button paints above it.
 *                             It was also the worst case, being AUTO-triggered on stale-
 *                             session detection — a user could reach zero 988 affordance
 *                             without having tapped anything.
 *   • ThresholdEducationModal   — ProfileScreen,            standard route
 *   • NotificationTimePicker    — OnboardingScreen,         standard route
 *   • SessionNoteComposer       — WellnessScreeningTrends,  standard route
 *   • WeeklyReflectionComposer  — WeeklyReflectionCard,     standard route
 * Those four keep the exception: non-immersive, and each opened by an explicit user tap.
 * That reasoning is by analogy rather than individually verified, so it is tracked for
 * audit rather than treated as settled — DEBUG-406. Note the counter-argument it has to
 * answer: on a standard route this button renders at FULL opacity, so a <Modal> there is a
 * drop from fully-visible to absent — arguably a starker delta than an immersive route's.
 *
 * CelebrationToast was listed here as a live exception and is NOT one: it has zero JSX
 * mount sites anywhere in app/src and appears only in comments. Removed from the list.
 *
 * CrisisErrorBoundary keeps its OWN CollapsibleCrisisButton: it lives outside the
 * navigation tree and dials tel:988 directly, so it is the last-resort 988 access when
 * a render crash removes this root-mounted overlay.
 */
import React from 'react';
import { CollapsibleCrisisButton, type CrisisButtonMode } from './CollapsibleCrisisButton';
import { navigationRef } from '@/core/navigation/navigationRef';
// DEBUG-341: eager imports on the crisis path (CLAUDE.md rule). openCrisisUrl is the
// single guarded dial entry point (DEBUG-314) and closes the INFRA-297 trace mark itself.
import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';
import { logSecurity } from '@/core/services/logging';

/**
 * DEBUG-341 — hard ceiling before the not-ready branch stops waiting and dials.
 *
 * 2× the 200ms crisis-button budget: enough for one slow frame plus container-ready
 * latency on a cold Release build, below the ~1s point at which a user reads the control
 * as dead and re-taps, and leaving ≥2.6s of the <3s access contract for the OS handoff.
 * Not calibrated against real TestFlight cold-start telemetry — if that measurement ever
 * happens and disagrees, this is the number to move.
 */
const NAV_READY_DEADLINE_MS = 400;

/** Roughly one frame at 60fps. Retries are cheap; the deadline is what bounds them. */
const NAV_READY_RETRY_INTERVAL_MS = 16;

/** Root-stack routes that already own a crisis affordance → suppress the overlay. */
const SUPPRESSED_ROUTES: ReadonlySet<string> = new Set([
  'CrisisResources',
  'AssessmentFlow',
  'LegalGate',
]);

/** Root-stack routes that are meditative practices → faded immersive mode. */
const IMMERSIVE_ROUTES: ReadonlySet<string> = new Set([
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
        // <200ms/<3s crisis-access contract: navigate via the root ref (no per-screen
        // navigation prop needed). Guarded on isReady so an early tap can't throw.
        //
        // INFRA-297: this whole body runs INSIDE onNavigate, i.e. downstream of
        // CollapsibleCrisisButton's `beginCrisisTap → onNavigate() → resetFade()`
        // ordering. The ordering test treats onNavigate as an opaque spy, so everything
        // here is invisible to it — which is exactly why the retry/fallback machinery
        // belongs here and NOWHERE in handleCrisisAction. The synchronous first attempt
        // below must stay first and stay synchronous; only the FAILURE branch schedules.
        if (navigationRef.isReady()) {
          navigationRef.navigate('CrisisResources', { source: 'crisis_button' });
          return;
        }

        // DEBUG-341 — the silent no-op is gone.
        //
        // This branch used to be absent entirely: an early tap hit `isReady() === false`,
        // nothing happened, and nothing recorded it. crisisTapTrace.ts names this
        // verbatim as "the known live producer" of dropped taps, and its 5000ms watchdog
        // could only report the drop AFTER the fact — it gave the user nothing.
        //
        // Retry-then-fallback, not immediate-fallback: isReady() is legitimately false
        // for a transient window on a normal cold start (this component renders as a
        // child of NavigationContainer before onReady fires), and dialling 988 for
        // someone who tapped expecting the resources screen is a materially different,
        // higher-consequence action. We do not convert a one-frame race into a phone call.
        //
        // 400ms is derived, not chosen: 2× the 200ms crisis-button budget, which covers a
        // slow frame plus container-ready latency on a cold Release build; below the ~1s
        // threshold at which a user perceives a dead control and re-taps; and it leaves
        // ≥2.6s of the 3s access contract for the OS dial handoff.
        let settled = false;
        // performance.now(), never Date.now(): the clock is monotonic, so an NTP step
        // mid-tap cannot make this deadline fire instantly or never. Same rule
        // crisisTapTrace documents for its own marks.
        const deadline = performance.now() + NAV_READY_DEADLINE_MS;

        const attempt = (): void => {
          // SINGLE-FLIGHT. Without this, a navigate that lands on retry AND a fallback
          // dial can both fire — yanking the user out of the CrisisResources screen they
          // just reached and into the dialer. Exactly one terminal outcome per tap.
          if (settled) return;

          if (navigationRef.isReady()) {
            settled = true;
            navigationRef.navigate('CrisisResources', { source: 'crisis_button' });
            return;
          }

          if (performance.now() >= deadline) {
            settled = true;

            // Record that the DEGRADED path was taken. Deliberately a log, NOT an
            // endCrisisTap('nav_not_ready') call: endCrisisTap CONSUMES the open mark, so
            // closing it here would steal the terminal outcome from openCrisisUrl and we
            // would no longer know whether the dial actually reached the OS
            // ('url_open') or degraded again to the manual-dial Alert
            // ('manual_fallback'). The physical outcome is the more valuable of the two,
            // and this line preserves both. For the same reason no 'nav_not_ready' member
            // was added to CrisisTapOutcome — it could never be a terminal value here, and
            // an unused union member is just dead surface.
            logSecurity(
              'Crisis tap: navigator not ready at deadline, dialling 988 directly',
              'high',
              { component: 'RootCrisisButton', deadlineMs: NAV_READY_DEADLINE_MS },
            );

            // Unconditional. openCrisisUrl closes the INFRA-297 trace mark itself via
            // endCrisisTap('url_open' | 'manual_fallback'), so the outcome is recorded on
            // both the dial-succeeded and dial-unsupported paths with no new sink.
            openCrisisUrl('tel:988', { manualLabel: '988' });
            return;
          }

          setTimeout(attempt, NAV_READY_RETRY_INTERVAL_MS);
        };

        setTimeout(attempt, NAV_READY_RETRY_INTERVAL_MS);
      }}
    />
  );
};

export default RootCrisisButton;
