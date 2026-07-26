/**
 * hapticEngine — the only module permitted to call expo-haptics (FEAT-285).
 *
 * Everything else in the app asks the engine for a *cue*; the engine decides
 * whether that cue reaches the device. Centralising it buys three guarantees
 * that scattered call sites could not make:
 *
 * CONSENT. The gate is re-read on every single cue, not captured once at
 * construction. A practitioner who turns haptics off mid-session must stop
 * feeling them immediately, and "off" has to mean the native module is never
 * touched at all — not that it is called and its effect discarded.
 *
 * DEGRADATION. Haptic support varies enormously across Android hardware. The
 * engine treats the first failure as final and latches to a permanent no-op:
 * retrying every 4 seconds for the rest of a 20-minute session would burn
 * battery to no effect, and an error surfacing mid-practice is exactly the kind
 * of interruption this feature is supposed to avoid. Both rejections and
 * synchronous throws latch, because a missing native module does the latter.
 *
 * BURST CONTROL. Cues are dropped, never queued. A queued pulse arrives after
 * the moment it was describing, so a practitioner following it by feel is
 * actively misled — silence is the better failure.
 */

import * as Haptics from 'expo-haptics';

import { primitiveFor, type HapticPlatform, type HapticPrimitive, type PracticeCue } from './cueCatalog';
import { MIN_CUE_INTERVAL_MS } from './constants';

export interface HapticEngineOptions {
  /**
   * Re-read before every cue. Should reflect the persisted preference AND any
   * transient suppression (paused, backgrounded, feature flag off).
   */
  isEnabled: () => boolean;
  platform: HapticPlatform;
  /**
   * Injectable monotonic clock, for tests. Defaults to `performance.now`.
   *
   * Deliberately NOT `Date.now` (which `Timer.tsx` uses): wall-clock time steps
   * on NTP sync, and a step mid-session would silently re-phase every remaining
   * cue against a schedule that assumed monotonicity.
   */
  now?: () => number;
}

export interface HapticEngine {
  /**
   * Deliver `cue` if the gate allows, the device still works, and the throttle
   * window has elapsed. Resolves true only when the native layer was actually
   * reached. Never rejects.
   */
  fire: (cue: PracticeCue) => Promise<boolean>;
  /** False once the engine has latched off after a native failure. */
  isAvailable: () => boolean;
}

/** Map a catalog primitive onto the expo-haptics call that renders it. */
async function invokePrimitive(primitive: HapticPrimitive): Promise<void> {
  switch (primitive) {
    case 'impactLight':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'impactMedium':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'impactHeavy':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    case 'selection':
      return Haptics.selectionAsync();
    case 'notificationSuccess':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'notificationWarning':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case 'notificationError':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

/**
 * MODULE-SCOPED, deliberately.
 *
 * Both of these describe the device, not one hook instance. If a screen ever
 * mounts two schedulers (breathing phases plus interval cues, say), per-instance
 * state would give each its own throttle budget and its own idea of whether the
 * actuator works — so a burst could still get through, and a device that has
 * already failed once would be retried by the second engine. Sharing them makes
 * the guarantees hold across every cue source in the app.
 */
let available = true;
let lastDeliveredAt = Number.NEGATIVE_INFINITY;

/** Test-only seam: module-scoped state would otherwise leak between specs. */
export function __resetHapticEngineForTest(): void {
  available = true;
  lastDeliveredAt = Number.NEGATIVE_INFINITY;
}

export function createHapticEngine(options: HapticEngineOptions): HapticEngine {
  const { isEnabled, platform } = options;
  const now = options.now ?? (() => performance.now());

  return {
    isAvailable: () => available,

    fire: async (cue: PracticeCue): Promise<boolean> => {
      // Order matters. The gate is checked FIRST so that a disabled session
      // makes no native calls and — just as importantly — does not advance the
      // throttle clock. Otherwise a suppressed cue would swallow the next
      // legitimate one.
      if (!available || !isEnabled()) return false;

      const timestamp = now();
      if (timestamp - lastDeliveredAt < MIN_CUE_INTERVAL_MS) return false;

      try {
        await invokePrimitive(primitiveFor(cue, platform));
        lastDeliveredAt = timestamp;
        return true;
      } catch {
        // Latch off permanently. Deliberately swallowed: a device without an
        // actuator is an expected configuration, not an error worth reporting
        // from inside a practice.
        available = false;
        return false;
      }
    },
  };
}
