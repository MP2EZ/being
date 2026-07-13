/**
 * FEAT-284 — shake-to-report.
 *
 * Subscribes to the accelerometer ONLY when the build-time `bug_reporting` flag
 * is on (internal / TestFlight builds), and opens Sentry's feedback widget on a
 * shake. In the public App Store build the flag is off, so this never subscribes
 * — zero sensor cost for end users. Safe no-op on the dev sim (empty Sentry DSN
 * → showFeedbackForm short-circuits).
 */

import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { isFeatureEnabled } from '@/core/services/featureFlags';
import { showFeedbackForm } from '@/core/services/logging';

/** g-force magnitude above the ~1g rest reading that counts as a shake. */
const SHAKE_THRESHOLD = 1.8;
/** Ignore repeat shakes within this window so one shake opens one widget. */
const SHAKE_DEBOUNCE_MS = 2000;
/** Accelerometer sample interval (ms) — responsive enough, low battery cost. */
const SAMPLE_INTERVAL_MS = 200;

/**
 * Pure shake test: total acceleration magnitude exceeds the threshold. At rest
 * the vector magnitude is ~1 (gravity); a deliberate shake spikes well past it.
 */
export function isShake(
  sample: { x: number; y: number; z: number },
  threshold: number = SHAKE_THRESHOLD,
): boolean {
  const { x, y, z } = sample;
  return Math.sqrt(x * x + y * y + z * z) > threshold;
}

export function useBugReportShake(): void {
  const lastShakeAt = useRef(0);

  useEffect(() => {
    if (!isFeatureEnabled('bug_reporting')) return undefined;

    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    const subscription = Accelerometer.addListener((sample) => {
      if (!isShake(sample)) return;
      const now = Date.now();
      if (now - lastShakeAt.current < SHAKE_DEBOUNCE_MS) return;
      lastShakeAt.current = now;
      showFeedbackForm();
    });

    return () => subscription.remove();
  }, []);
}
