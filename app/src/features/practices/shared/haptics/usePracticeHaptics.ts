/**
 * usePracticeHaptics — binds the cue scheduler to a practice screen (FEAT-285).
 *
 * Owns the three lifecycle concerns the scheduler cannot own for itself:
 *
 * THE GATE. Composed from three independent conditions, all of which must hold:
 * the build-time feature flag, the persisted preference, and the screen's own
 * active/paused state. The engine re-reads this before every cue, so revoking
 * any one of them takes effect on the next boundary rather than at the next
 * mount.
 *
 * APP STATE. Lives here rather than in the emitter or the screens. The emitter
 * can only drop cues — it cannot re-anchor the session origin, so a five-minute
 * background would leave the timeline silently phase-shifted against visuals
 * that also stalled. Putting it in each screen would give three implementations
 * of the same race and would conflate an OS suspend with a user pause. Anything
 * other than 'active' counts as suspended: iOS raises 'inactive' for the app
 * switcher, Control Centre, and incoming-call banners, and a cue firing behind
 * the app switcher is a real reported-bug class.
 *
 * TEARDOWN. On unmount AND on navigation blur, not just unmount. A leaked cue
 * that fires after the practitioner has navigated away is at best confusing,
 * and the crisis button is reachable from every practice screen — no haptic may
 * fire on or over a crisis surface.
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { NavigationContext } from '@react-navigation/native';

import { isFeatureEnabled } from '@/core/services/featureFlags';
import { logAccessibility } from '@/core/services/logging';
import { usePracticeSettings } from '@/core/stores/settingsStore';

import { createHapticEngine } from './hapticEngine';
import { createCueScheduler, type ScheduledCue } from './cueScheduler';
import { HAPTIC_ANNOUNCEMENT_STAGGER_MS } from './constants';
import type { PracticeCue } from './cueCatalog';

export interface UsePracticeHapticsOptions {
  /** Absolute cue timeline for this session. Rebuilt only when it changes. */
  schedule: ScheduledCue[];
  /** The screen's running/paused state. */
  isActive: boolean;
  /**
   * Optional paired screen-reader announcement, issued
   * HAPTIC_ANNOUNCEMENT_STAGGER_MS after the haptic. Provide this wherever the
   * screen does not already announce the same boundary by another route.
   *
   * Applies to SCHEDULED cues only. The session anchors deliberately never
   * route through it — see the anchor block below.
   */
  announce?: (cue: PracticeCue) => void;
  /**
   * Fire the `sessionStart` / `sessionEnd` anchors for this screen (FEAT-311).
   *
   * Rides the MASTER `practiceHaptics` consent, never `practiceHapticsInterval`.
   * Two boundary markers around the practice are a different thing from a
   * cadence inside it, and ReflectionTimerScreen's separate interval opt-in
   * exists so that enabling haptics does not start pulsing at someone
   * mid-contemplation.
   */
  sessionAnchors?: boolean;
}

export interface UsePracticeHapticsReturn {
  /**
   * Emit the `sessionEnd` anchor. Call from the screen's completion path.
   *
   * No-op unless `sessionAnchors` is set. Must be called ONLY on genuine
   * completion — never from unmount, back-navigation, or any abandoned exit.
   * The cue asserts "the practice is complete" to someone who may have their
   * eyes closed; firing it on a session the practitioner walked out of tells
   * them something untrue about their own practice.
   */
  emitSessionEnd: () => void;
}

/**
 * Navigation focus, WITHOUT requiring a navigation container.
 *
 * `useIsFocused` throws outright when there is no navigator above it. That
 * would make this hook — and therefore every practice screen using it —
 * unrenderable outside a NavigationContainer, which is how most of the existing
 * practice screen tests mount them, and would be a hard crash rather than a
 * degraded experience anywhere a practice is embedded directly.
 *
 * Reading the context instead lets the hook degrade honestly: inside a
 * navigator it tracks focus and blur properly; outside one it reports focused,
 * because there is no navigation state that could say otherwise.
 */
function useIsFocusedSafe(): boolean {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    if (!navigation) return undefined;

    setFocused(navigation.isFocused());
    const unsubscribeFocus = navigation.addListener('focus', () => setFocused(true));
    const unsubscribeBlur = navigation.addListener('blur', () => setFocused(false));

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  return focused;
}

export function usePracticeHaptics({
  schedule,
  isActive,
  announce,
  sessionAnchors = false,
}: UsePracticeHapticsOptions): UsePracticeHapticsReturn {
  const practices = usePracticeSettings();
  const enabled = isFeatureEnabled('practice_haptics') && practices?.practiceHaptics === true;
  const isFocused = useIsFocusedSafe();

  // Refs so the effect below does not re-run (and tear down the scheduler) every
  // time one of these changes.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const activeRef = useRef(isActive);
  activeRef.current = isActive;
  const announceRef = useRef(announce);
  announceRef.current = announce;
  const focusedRef = useRef(isFocused);
  focusedRef.current = isFocused;
  const anchorsRef = useRef(sessionAnchors);
  anchorsRef.current = sessionAnchors;

  const schedulerRef = useRef<ReturnType<typeof createCueScheduler> | null>(null);

  /**
   * THE SESSION ANCHORS (FEAT-311) — a second, imperative path.
   *
   * Deliberately NOT routed through the scheduler below, for three independent
   * reasons, any one of which is sufficient:
   *
   *   1. The scheduler drops a cue arriving more than MAX_CUE_LATENESS_MS late.
   *      The first tick after a Begin press on a cold device can exceed that,
   *      so a scheduled `sessionStart` would go missing on exactly the low-end
   *      devices where an eyes-closed practitioner most depends on it.
   *   2. The scheduler effect early-returns on an empty schedule, and
   *      ReflectionTimerScreen's schedule IS empty unless interval cadence was
   *      separately opted into. An anchor riding that effect would never fire
   *      there at all.
   *   3. `sessionEnd` is due at a moment when `isActive` has ALREADY flipped
   *      false — `handleTimerComplete` clears it before invoking the completion
   *      callback, in the same tick. Gating the anchors on the scheduler's
   *      `activeRef` would silence the session's most meaningful cue, and
   *      relying on that ref being stale-true is a race, not a design.
   *
   * The engine instance is separate but the guarantees are not: `available` and
   * `lastDeliveredAt` are module-scoped in hapticEngine, so this shares the
   * device-failure latch and the burst throttle with the scheduled path.
   */
  const anchorEngineRef = useRef<ReturnType<typeof createHapticEngine> | null>(null);
  if (anchorEngineRef.current === null) {
    anchorEngineRef.current = createHapticEngine({
      // Read through refs so the gate is current at fire time. Note what is
      // absent: `activeRef`. See reason 3 above. Foreground is checked here
      // rather than inherited, because the imperative path bypasses the
      // scheduler's AppState pause and Timer is timestamp-based — a session
      // can complete while backgrounded and buzz in a pocket.
      isEnabled: () =>
        enabledRef.current && focusedRef.current && AppState.currentState === 'active',
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  }

  /**
   * `sessionStart` fires on the first false→true transition of the practice,
   * latched so it cannot repeat.
   *
   * A resume is not a beginning. Firing per-resume would make the pulse count
   * encode how many times the practitioner paused — precisely the "signature"
   * the cue catalog forbids — and it is redundant, since a resume is a touch
   * they just performed. The same latch covers returning from background,
   * which is not a resume either.
   *
   * Latching happens even while gated off, so that enabling haptics mid-session
   * cannot produce a late "the practice has begun" for a practice already
   * underway. The engine decides whether anything is felt; the latch decides
   * whether the moment has passed.
   */
  const startedRef = useRef(false);
  useEffect(() => {
    if (!sessionAnchors) return;
    if (!(isActive && isFocused)) return;
    if (startedRef.current) return;
    startedRef.current = true;
    void anchorEngineRef.current?.fire('sessionStart');
  }, [sessionAnchors, isActive, isFocused]);

  /**
   * `sessionEnd`, emitted by the screen at genuine completion.
   *
   * Note it never touches `announce`: BodyScanScreen's announcement callback
   * takes no cue argument and speaks "Next area" unconditionally, so routing an
   * anchor through it would instruct a blind practitioner to move body region
   * at completion. Anchors are silent in the speech channel by construction.
   */
  const emitSessionEnd = useCallback((): void => {
    if (!anchorsRef.current) return;
    void anchorEngineRef.current?.fire('sessionEnd');
  }, []);

  useEffect(() => {
    if (!enabled || schedule.length === 0) return undefined;

    /** Pending announcement timers, so a stray utterance cannot outlive us. */
    const staggerHandles = new Set<ReturnType<typeof setTimeout>>();

    const engine = createHapticEngine({
      // Re-read on every cue: the practitioner may revoke mid-session.
      isEnabled: () => enabledRef.current && activeRef.current,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });

    const scheduler = createCueScheduler({
      schedule,
      now: () => performance.now(),
      // INFRA-395: the cue-latency figures the production flag flip is gated on.
      //
      // Same predicate as `hapticEngine`'s trace, deliberately: this reports
      // scheduler-side timer jitter and the engine reports the JS→native round
      // trip, and a latency figure assembled from only one of them is not the
      // cue latency. They must switch on together. See
      // docs/testing/haptics-device-signoff.md.
      onLateness:
        __DEV__ || isFeatureEnabled('haptic_trace')
          ? ({ cue, latenessMs, delivered }) =>
              logAccessibility(
                `[haptics] ${cue} ${delivered ? 'delivered' : 'DROPPED'} late=${Math.round(latenessMs)}ms`,
                { action: delivered ? 'triggered' : 'disabled' }
              )
          : undefined,
      onCue: (cue) => {
        // Fire-and-forget. The engine never rejects; the void is deliberate so
        // a slow actuator cannot delay the next scheduling decision.
        void engine.fire(cue);

        const announceFn = announceRef.current;
        if (!announceFn) return;

        // The haptic leads; the announcement follows. See the constant.
        const handle = setTimeout(() => {
          staggerHandles.delete(handle);
          if (activeRef.current) announceFn(cue);
        }, HAPTIC_ANNOUNCEMENT_STAGGER_MS);
        staggerHandles.add(handle);
      },
    });

    const onAppStateChange = (next: AppStateStatus): void => {
      if (next === 'active') {
        // Re-arm from the current position. The scheduler drops every boundary
        // that went stale while suspended, so this emits nothing itself.
        if (activeRef.current) scheduler.start();
      } else {
        scheduler.pause();
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    schedulerRef.current = scheduler;

    return () => {
      subscription.remove();
      scheduler.stop();
      schedulerRef.current = null;
      staggerHandles.forEach(clearTimeout);
      staggerHandles.clear();
    };
    // `schedule` identity governs the session; callers must memoise it.
  }, [enabled, schedule]);

  /**
   * Drive the scheduler from the screen's running state AND navigation focus.
   *
   * Blur counts as paused, not merely as "the engine will suppress it": leaving
   * the timer armed across a navigation would keep a wake-up scheduled for a
   * screen the practitioner has left, and the crisis surface is one tap away
   * from here.
   */
  useEffect(() => {
    const running = isActive && isFocused;
    activeRef.current = running;

    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    if (running) scheduler.start();
    else scheduler.pause();
  }, [isActive, isFocused, enabled, schedule]);

  return { emitSessionEnd };
}
