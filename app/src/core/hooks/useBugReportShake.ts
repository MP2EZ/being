/**
 * FEAT-284 — shake-to-report.
 *
 * Subscribes to the accelerometer ONLY when the build-time `bug_reporting` flag
 * is on (internal / TestFlight builds), and opens Sentry's feedback widget on a
 * shake. In the public App Store build the flag is off, so this never subscribes
 * — zero sensor cost for end users. Safe no-op on the dev sim (empty Sentry DSN
 * → showFeedbackForm short-circuits).
 *
 * ── DEBUG-533: WHY THE TRIGGER IS DELIBERATELY HARD TO FIRE ──
 *
 * What this opens is a zero-988-affordance window — see the ruling recorded at
 * `ExternalErrorReporter.showFeedbackForm()`. This hook is mounted at the app
 * root, so the gesture is armed on EVERY screen, including `CrisisResources`
 * and a mid-assessment `AssessmentFlow`. An accidental open is therefore a
 * crisis-reachability event, not a nuisance: it covers the 988 affordance with
 * a form the user did not ask for and cannot reliably leave in one tap.
 *
 * The old trigger was a SINGLE-SAMPLE magnitude test at 1.8g sampled at 5Hz.
 * At rest the vector magnitude is already ~1g, so that asked for 0.8g of net
 * acceleration in one instantaneous reading — cleared by a pocket-pull, a phone
 * set down hard, a car bump, or brisk walking. A TestFlight user reported it
 * (Sentry `JAVASCRIPT-REACT-F`, 2026-08-28) and they were right.
 *
 * ⚠️ THE BURST REQUIREMENT IS THE LOAD-BEARING HALF, NOT THE THRESHOLD. A hard
 * enough single jolt clears any threshold you pick; only requiring the
 * condition to HOLD ACROSS SAMPLES separates shaking from being jostled. Do not
 * "simplify" this back to a one-sample test by raising SHAKE_THRESHOLD further.
 *
 * ⚠️ AND THIS IS A RATE CONTROL, NOT AN INVARIANT. It reduces how often the
 * zero-988 window opens by accident; it cannot make opening it acceptable. The
 * structural fix is an in-hierarchy form rendered into `rootOverlaySlot`, which
 * is tracked separately.
 */

import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { isFeatureEnabled } from '@/core/services/featureFlags';
import { showFeedbackForm } from '@/core/services/logging';

/** g-force magnitude above the ~1g rest reading that counts as one crossing. */
const SHAKE_THRESHOLD = 2.7;
/** Crossings required inside SHAKE_WINDOW_MS before the widget opens. */
const SHAKE_MIN_CROSSINGS = 3;
/** Rolling window (ms) those crossings must fall inside. */
const SHAKE_WINDOW_MS = 1000;
/** Ignore repeat shakes within this window so one shake opens one widget. */
const SHAKE_DEBOUNCE_MS = 2000;
/** Accelerometer sample interval (ms). 10Hz — a 2s shake yields ~20 samples. */
const SAMPLE_INTERVAL_MS = 100;

/**
 * Pure single-sample test: total acceleration magnitude exceeds the threshold.
 * At rest the vector magnitude is ~1 (gravity). One crossing on its own decides
 * nothing — see `isShakeBurst`.
 */
export function isShake(
  sample: { x: number; y: number; z: number },
  threshold: number = SHAKE_THRESHOLD,
): boolean {
  const { x, y, z } = sample;
  return Math.sqrt(x * x + y * y + z * z) > threshold;
}

/**
 * Pure prune: the crossings still inside the rolling window at `now`. Inclusive
 * at the edge so a burst spanning exactly the window still counts as one burst.
 * Returns a new array; never mutates its input.
 */
export function recentCrossings(
  crossings: readonly number[],
  now: number,
  windowMs: number = SHAKE_WINDOW_MS,
): number[] {
  return crossings.filter((at) => now - at <= windowMs);
}

/**
 * Pure decision: did enough crossings land inside the window to count as a
 * deliberate shake? A deliberate 2s shake produces ~20 crossings at 10Hz; a
 * single jolt produces one or two.
 */
export function isShakeBurst(
  crossings: readonly number[],
  now: number,
  minCrossings: number = SHAKE_MIN_CROSSINGS,
  windowMs: number = SHAKE_WINDOW_MS,
): boolean {
  return recentCrossings(crossings, now, windowMs).length >= minCrossings;
}

export function useBugReportShake(): void {
  const lastShakeAt = useRef(0);
  const crossings = useRef<number[]>([]);

  useEffect(() => {
    if (!isFeatureEnabled('bug_reporting')) return undefined;

    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    const subscription = Accelerometer.addListener((sample) => {
      if (!isShake(sample)) return;
      const now = Date.now();
      // Inside the debounce the crossing is dropped outright rather than
      // accumulated, so the shake that just opened the widget cannot seed the
      // next burst.
      if (now - lastShakeAt.current < SHAKE_DEBOUNCE_MS) return;

      const retained = recentCrossings(crossings.current, now);
      retained.push(now);
      crossings.current = retained;
      if (!isShakeBurst(retained, now)) return;

      lastShakeAt.current = now;
      crossings.current = [];
      showFeedbackForm();
    });

    return () => subscription.remove();
  }, []);
}
