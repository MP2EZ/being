/**
 * FEAT-284 — shake-to-report.
 *
 * Subscribes to the accelerometer ONLY when the build-time `bug_reporting` flag
 * is on (internal / TestFlight builds), and opens the first-party bug-report form
 * on a shake. In the public App Store build the flag is off, so this never
 * subscribes — zero sensor cost for end users. Since FEAT-570 the form OPENS on
 * the dev sim too (an empty DSN no longer short-circuits it); submission is what
 * refuses there, which is what keeps this surface verifiable.
 *
 * ── WHY THE TRIGGER IS DELIBERATELY HARD TO FIRE ──
 *
 * DEBUG-533 hardened this because what the gesture opened was a zero-988
 * -affordance window. FEAT-570 removed that window — the form is now our own,
 * published into `rootOverlaySlot`, which structurally cannot paint above the
 * crisis button, and the slot refuses it outright on the routes where the FAB
 * has stepped aside.
 *
 * ⚠️ THAT DOES NOT MAKE THIS ERGONOMICS. Do not delete the burst requirement on
 * the grounds that "the occlusion was fixed". Three residual costs survive it,
 * and this hook is a RATE CONTROL on all three:
 *   • the backdrop is OPAQUE by requirement (WCAG 1.4.11, DEBUG-406), so an
 *     accidental open still covers whatever screen the user was on;
 *   • `NavigatorA11yHost` hides the entire navigator subtree from assistive
 *     technology while the slot is held, so for a VoiceOver user an accidental
 *     shake still deletes the screen they were reading;
 *   • touching the message field raises the keyboard, which occludes the root
 *     FAB regardless of z-order (`UIRemoteKeyboardWindow` is a separate window).
 * And on `AssessmentFlow` / `LegalGate` it is the SCREEN-owned affordance at
 * stake, which is precisely why the slot gained `SCREEN_OWNED_988_ROUTES`.
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
 * ⚠️ AND THIS IS A RATE CONTROL, NOT AN INVARIANT. It bounds how often an
 * unasked-for overlay appears; it was never what made the surface safe. The
 * structural fix — the in-hierarchy form in `rootOverlaySlot` — LANDED in
 * FEAT-570, and the two controls are complementary rather than alternatives.
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
