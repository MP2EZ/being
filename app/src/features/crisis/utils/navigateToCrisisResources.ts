/**
 * The crisis navigation path, shared by every control that owns it (DEBUG-450).
 *
 * WHY THIS IS A MODULE AND NOT A CLOSURE.
 * This body lived inline in `RootCrisisButton`'s `onNavigate` prop. DEBUG-450 adds a
 * SECOND control carrying the same contract — a keyboard accessory, mounted because
 * the root button is occluded whenever a software keyboard is up. Two controls
 * re-typing a 400ms deadline, a single-flight guard and a degraded-dial fallback is
 * exactly the drift `crisisButtonGeometry.ts` was created to retire, and the failure
 * mode here is worse than a wrong inset: a second control that silently lacks the
 * fallback is a 988 path that dead-ends on a cold start.
 *
 * WHAT MUST NOT CHANGE, and why each line is load-bearing:
 *
 *   - INFRA-297 ORDERING. Callers run `beginCrisisTap(source)` and THEN call this.
 *     The synchronous first attempt below must stay first and stay synchronous; only
 *     the FAILURE branch schedules. The ordering test treats the navigate callback as
 *     an opaque spy, so everything in here is invisible to it — which is why the
 *     machinery belongs here and nowhere in a tap handler.
 *
 *   - RETRY-THEN-FALLBACK, not immediate-fallback (DEBUG-341). `isReady()` is
 *     legitimately false for a transient window on a normal cold start, and dialling
 *     988 for someone who tapped expecting the resources screen is a materially
 *     different, higher-consequence action. A one-frame race must not become a phone
 *     call.
 *
 *   - SINGLE-FLIGHT. Without `settled`, a navigate that lands on retry AND a fallback
 *     dial can both fire — yanking the user out of the screen they just reached and
 *     into the dialer. Exactly one terminal outcome per tap.
 *
 *   - THE DEGRADED PATH IS LOGGED, NOT `endCrisisTap`'d. `endCrisisTap` CONSUMES the
 *     open mark, so closing it here would steal the terminal outcome from
 *     `openCrisisUrl` and we would no longer know whether the dial reached the OS
 *     (`url_open`) or degraded again to the manual-dial Alert (`manual_fallback`).
 *     The physical outcome is the more valuable of the two; this preserves both.
 */

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
export const NAV_READY_DEADLINE_MS = 400;

/** Roughly one frame at 60fps. Retries are cheap; the deadline is what bounds them. */
export const NAV_READY_RETRY_INTERVAL_MS = 16;

/** Which control is navigating. Threaded into the route param and the degraded-path log. */
export type CrisisNavigationSource = 'crisis_button' | 'keyboard_accessory';

/**
 * Navigate to CrisisResourcesScreen, falling back to a direct 988 dial if the
 * navigator never becomes ready.
 *
 * Call AFTER `beginCrisisTap(...)` and BEFORE any cosmetic work — nothing may run
 * ahead of the crisis action.
 *
 * @param source    which control fired; recorded on the route and in the degraded log
 * @param component identifies the caller in the degraded-path security log
 */
export function navigateToCrisisResources(
  source: CrisisNavigationSource,
  component: string,
): void {
  // <200ms/<3s crisis-access contract: navigate via the root ref (no per-screen
  // navigation prop needed). Guarded on isReady so an early tap can't throw.
  if (navigationRef.isReady()) {
    navigationRef.navigate('CrisisResources', { source });
    return;
  }

  let settled = false;
  // performance.now(), never Date.now(): the clock is monotonic, so an NTP step
  // mid-tap cannot make this deadline fire instantly or never. Same rule
  // crisisTapTrace documents for its own marks.
  const deadline = performance.now() + NAV_READY_DEADLINE_MS;

  const attempt = (): void => {
    if (settled) return;

    if (navigationRef.isReady()) {
      settled = true;
      navigationRef.navigate('CrisisResources', { source });
      return;
    }

    if (performance.now() >= deadline) {
      settled = true;

      logSecurity(
        'Crisis tap: navigator not ready at deadline, dialling 988 directly',
        'high',
        { component, deadlineMs: NAV_READY_DEADLINE_MS, source },
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
}

export default navigateToCrisisResources;
