/**
 * crisisTapTrace — the real tap→render measurement for the crisis button (INFRA-297).
 *
 * WHAT THIS REPLACES
 * ==================
 * Before this, `CollapsibleCrisisButton` bracketed `onNavigate()` in a
 * `Sentry.startSpan` callback and reported the elapsed time as the crisis-button
 * response. That number measured navigation **dispatch** — `RootCrisisButton`'s
 * `onNavigate` is a bare `navigationRef.navigate(...)` call, ~9ms per
 * `performance-baselines.json`. It could never approach the 200ms budget, so any
 * alert built on it was guaranteed never to fire: false assurance on a safety
 * budget, which is worse than no metric. It was also the identical flaw the
 * monitoring runbook already condemns in the jest proxy.
 *
 * This module measures from the tap to the point the user can actually act:
 * either CrisisResources has committed to the screen, or the OS has taken the
 * dial. Those are physically different quantities, so they carry distinct
 * `outcome` labels and must never be aggregated into one statistic.
 *
 * HARD RULES (crisis specialist, non-negotiable)
 * ==============================================
 * `begin()` runs on the crisis tap path, ahead of the navigate. Therefore:
 *   - Synchronous, returns void, never async. No await, no Promise, no .then.
 *   - Zero I/O: no AsyncStorage, no SecureStore, no network, no Supabase.
 *   - Zero Sentry API. Sentry is strictly downstream of the dial — that
 *     ordering is the entire point of INFRA-297.
 *   - Zero logging, zero store writes, zero React state.
 *   - `performance.now()` only, NEVER `Date.now()` — wall clock is
 *     non-monotonic, and an NTP step would fabricate or hide a budget breach.
 *   - One module-scope slot, not a growing list. A list would leak on a path
 *     that can be tapped repeatedly.
 *   - Every public function is internally guarded: this module can never throw
 *     into its caller, because its caller is the crisis path.
 *
 * All emission (span attributes, logs) happens in `end()` or the watchdog, both
 * of which run outside the tap's synchronous frame. Net effect: the tap path is
 * FASTER than before, because the logging and span work left it.
 */

import * as Sentry from '@sentry/react-native';

import { logSecurity, logPerformance } from '@/core/services/logging';

/**
 * Where the crisis tap came from. Label only — never wellness data.
 *
 * ⚠️ Kept in sync BY HAND with the `CrisisResources` route param's own `source` union in
 * `core/navigation/CleanRootNavigator.tsx`. They are separately declared and nothing
 * enforces the correspondence; a member added here and not there compiles, and the route
 * silently receives a value its type does not admit.
 */
export type CrisisTapSource =
  | 'crisis_button'
  | 'error_boundary'
  | 'keyboard_accessory'; // DEBUG-450 — the InputAccessoryView control

/**
 * How the tap terminated. `screen_commit` and `url_open` are different physical
 * quantities (render vs. OS handoff) and are reported separately on purpose.
 */
export type CrisisTapOutcome =
  | 'screen_commit'
  | 'url_open'
  | 'manual_fallback'
  | 'deadline_exceeded';

/** The <200ms crisis-button budget from CLAUDE.md → Performance Budgets. */
const BUDGET_MS = 200;

/**
 * How long a tap may stay open before we declare it dropped. Well above the
 * budget, below user patience. Firing this is a SAFETY event, not a perf
 * datapoint — see the watchdog body.
 */
const WATCHDOG_MS = 5000;

interface OpenMark {
  readonly source: CrisisTapSource;
  readonly startedAt: number;
  watchdog: NodeJS.Timeout | null;
}

/** Single-flight: exactly one slot, never a list. */
let openMark: OpenMark | null = null;

function clearWatchdog(mark: OpenMark): void {
  if (mark.watchdog !== null) {
    clearTimeout(mark.watchdog);
    mark.watchdog = null;
  }
}

/**
 * Emit the measurement. Runs outside the tap frame. Individually guarded — a
 * telemetry failure here must never surface to a caller on the crisis path.
 */
function emit(source: CrisisTapSource, outcome: CrisisTapOutcome, responseTime: number): void {
  // Sentry first but fully isolated: if the SDK is broken this must not stop the
  // audit record below, which is the part that actually matters.
  try {
    Sentry.startSpan({ name: 'crisis_button_response', op: 'ui.crisis.tap' }, (span) => {
      span?.setAttribute('response_time_ms', responseTime);
      span?.setAttribute('exceeded_budget', responseTime > BUDGET_MS);
      span?.setAttribute('outcome', outcome);
      span?.setAttribute('source', source);
    });
  } catch {
    // Telemetry is never allowed to affect the crisis path, including its audit
    // trail. Swallowed deliberately; the audit record still fires below.
  }

  try {
    if (responseTime > BUDGET_MS) {
      // Event string and payload shape preserved verbatim from the pre-INFRA-297
      // implementation so downstream log queries keep their history.
      logSecurity('Crisis button response time exceeded', 'high', {
        responseTime,
        threshold: BUDGET_MS,
      });
    } else {
      logPerformance('crisis_button_response', responseTime);
    }
  } catch {
    // As above.
  }
}

/**
 * Open a mark. Called on the crisis tap, immediately before the navigate/dial.
 *
 * Deliberately placed BEFORE `onNavigate()` — a tap→render measurement cannot
 * start after the navigate. That is safe only because this function does nothing
 * but read a clock, write one field, and schedule a timer, and because it cannot
 * throw. Do not add anything to it.
 *
 * A second `begin()` while one is open replaces it rather than double-counting:
 * the newer tap is the one the user is waiting on.
 */
export function beginCrisisTap(source: CrisisTapSource): void {
  try {
    if (openMark) {
      clearWatchdog(openMark);
    }

    const mark: OpenMark = {
      source,
      startedAt: performance.now(),
      watchdog: null,
    };

    mark.watchdog = setTimeout(() => {
      // Neither a screen nor a dial materialised. That is a DROPPED CRISIS TAP —
      // a false negative on a zero-false-negative path — so it is logged at
      // 'high' severity, not as a performance datapoint.
      //
      // The known live producer is RootCrisisButton's `navigationRef.isReady()`
      // guard: on an early tap it is false, nothing happens, and before this
      // watchdog existed nothing recorded that the tap vanished.
      const dropped = openMark;
      openMark = null;
      if (!dropped) return;
      try {
        logSecurity('Crisis button tap produced no screen or dial', 'high', {
          responseTime: performance.now() - dropped.startedAt,
          threshold: BUDGET_MS,
          outcome: 'deadline_exceeded' satisfies CrisisTapOutcome,
          source: dropped.source,
        });
      } catch {
        // Nothing further to do; must not throw out of a timer.
      }
    }, WATCHDOG_MS);

    openMark = mark;
  } catch {
    // Never throw onto the crisis path.
    openMark = null;
  }
}

/**
 * Close the open mark and emit.
 *
 * A no-op when nothing is open — silent, never a throw, never log spam. This
 * matters because `openCrisisUrl` has several other callers (a "Call Now" tap
 * inside CrisisResourcesScreen arrives after the commit already closed the
 * mark), and they must be unaffected.
 */
export function endCrisisTap(outcome: CrisisTapOutcome): void {
  try {
    const mark = openMark;
    if (!mark) return;
    openMark = null;
    clearWatchdog(mark);
    emit(mark.source, outcome, performance.now() - mark.startedAt);
  } catch {
    // Never throw onto the crisis path.
  }
}

/** Test-only reset so single-flight state cannot leak between cases. */
export function __resetCrisisTapTraceForTests(): void {
  if (openMark) clearWatchdog(openMark);
  openMark = null;
}

export const CRISIS_TAP_BUDGET_MS = BUDGET_MS;
export const CRISIS_TAP_WATCHDOG_MS = WATCHDOG_MS;
