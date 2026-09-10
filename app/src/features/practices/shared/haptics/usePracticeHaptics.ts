/**
 * usePracticeHaptics — binds the cue scheduler to a practice screen (FEAT-285).
 *
 * Owns the three lifecycle concerns the scheduler cannot own for itself:
 *
 * THE GATE. Two channels ride this hook, and they are gated differently
 * (DEBUG-425).
 *
 * The build-time feature flag gates the WHOLE pipeline: with it off, neither
 * channel exists. Below it, the persisted `practiceHaptics` preference gates
 * ONLY the tactile channel, and the screen's active/paused state gates both.
 * Consent to be vibrated is not consent to be told where you are: a
 * practitioner who declines vibration must keep the paired speech, because on
 * Body Scan it is the only signal that a region boundary passed. The engine
 * re-reads the tactile gate before every cue, so revoking it takes effect on
 * the next boundary rather than at the next mount.
 *
 * The scheduler therefore runs whenever EITHER channel is live — see
 * `schedulerNeeded` below. It must never be widened to run on the flag alone:
 * ReflectionTimerScreen and PracticeTimerScreen supply no `announce`, and an
 * empty schedule must keep short-circuiting the effect entirely.
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
 *
 * THE ONE RESIDUAL, WITH ITS BOUND (DEBUG-587). React Navigation emits `blur`
 * from an effect AFTER the incoming screen's push has committed, so between
 * CrisisResources committing and `focused` going false there is a 1-3 frame gap
 * that no assignment-timing change inside this hook can close — it is upstream of
 * every signal the hook has. It is partially masked by the stack push animation.
 * That gap is RECORDED, not fixed. Nothing else here is: the every-tick gate
 * re-open, the AppState re-arm on returning from a 988 call, and the uncleared
 * stagger timers were all defects and are all closed, pinned by
 * `__tests__/unit/practices/haptics/crisisBlurGate.test.tsx`. Closing the residual
 * too would need the crisis press itself to publish a suppression signal that
 * practice surfaces read; that is a design change, not a timing one.
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { isFeatureEnabled } from '@/core/services/featureFlags';
import { logAccessibility } from '@/core/services/logging';
import { usePracticeSettings } from '@/core/stores/settingsStore';

import { useIsFocusedSafe } from '../useIsFocusedSafe';
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

export function usePracticeHaptics({
  schedule,
  isActive,
  announce,
  sessionAnchors = false,
}: UsePracticeHapticsOptions): UsePracticeHapticsReturn {
  const practices = usePracticeSettings();

  const flagOn = isFeatureEnabled('practice_haptics');
  /** The tactile channel: flag AND the practitioner's recorded answer. */
  const tactileEnabled = flagOn && practices?.practiceHaptics === true;
  /** The speech channel: flag AND a screen that asked for paired speech. */
  const speechEnabled = flagOn && announce !== undefined;
  /**
   * Run the scheduler if EITHER channel is live.
   *
   * Derived here rather than inside the effect so that `announce` itself never
   * enters the dependency array — it is `!== undefined` that matters, not the
   * callback's identity, and depending on the identity would tear down and
   * rebuild the scheduler on any render that re-created it, resetting the
   * absolute region timeline to zero mid-session.
   */
  const schedulerNeeded = tactileEnabled || speechEnabled;

  const isFocused = useIsFocusedSafe();

  // Refs so the effect below does not re-run (and tear down the scheduler) every
  // time one of these changes.
  //
  // ONE WRITER, ONE MEANING (DEBUG-587). Each of these is assigned exactly once,
  // here in the render body, and carries exactly the value its name says. The
  // scheduled gate is COMPOSED from them at read time (`isRunning` below), never
  // pre-combined into a ref. It used to be: `activeRef` was written here as raw
  // `isActive` and again in the focus effect as `isActive && isFocused`, so the
  // two writers disagreed and the last one to run won. Since a blurred practice
  // screen keeps re-rendering on its elapsed-time tick — and the effect's deps do
  // not change when it does — the render-body write restored the gate about once a
  // second for the entire time the practitioner sat on the crisis screen.
  const enabledRef = useRef(tactileEnabled);
  enabledRef.current = tactileEnabled;
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
   * Cancels any announcement still waiting out its stagger (DEBUG-587).
   *
   * The handles live in the scheduler effect's closure, but the transition that
   * must cancel them — pause, or a navigation away — is observed by the focus
   * effect below. Pausing the scheduler is not enough on its own: a stagger timer
   * is already armed and consults the gate when it FIRES, so an utterance
   * scheduled up to HAPTIC_ANNOUNCEMENT_STAGGER_MS before the navigation would
   * still land, on the crisis screen, with a correct gate.
   */
  const clearPendingSpeechRef = useRef<(() => void) | null>(null);

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
    // Only the tactile half of the old gate is relaxed. `schedule.length === 0`
    // MUST stay: ReflectionTimerScreen's schedule is empty by default, and
    // arming a scheduler plus an AppState listener on a screen that has neither
    // today would be a behaviour change nobody asked for.
    if (!schedulerNeeded || schedule.length === 0) return undefined;

    /** Pending announcement timers, so a stray utterance cannot outlive us. */
    const staggerHandles = new Set<ReturnType<typeof setTimeout>>();

    /**
     * The scheduled channels' gate, composed at read time from single-writer refs.
     *
     * Deliberately shaped like the anchor engine's gate above rather than reading
     * one pre-combined ref: a ref that means two things is a ref two code paths
     * can disagree about, which is the DEBUG-587 defect exactly. Note what is
     * absent — `enabledRef`. Declining vibration must not silence the paired
     * speech (DEBUG-425), so the tactile preference is ANDed in at the tactile
     * call site only, never folded in here.
     */
    const isRunning = (): boolean => activeRef.current && focusedRef.current;

    const clearPendingSpeech = (): void => {
      staggerHandles.forEach(clearTimeout);
      staggerHandles.clear();
    };
    clearPendingSpeechRef.current = clearPendingSpeech;

    /**
     * Speak the boundary.
     *
     * The stagger is a TACTILE accommodation — every justification for it in
     * `constants.ts` is about letting the tap land first and own the "now".
     * With no tap there is nothing to trail, so a practitioner who declined
     * vibration hears the boundary on the boundary.
     */
    const scheduleAnnouncement = (cue: PracticeCue): void => {
      const announceFn = announceRef.current;
      if (!announceFn) return;

      if (!enabledRef.current) {
        if (isRunning()) announceFn(cue);
        return;
      }

      const handle = setTimeout(() => {
        staggerHandles.delete(handle);
        if (isRunning()) announceFn(cue);
      }, HAPTIC_ANNOUNCEMENT_STAGGER_MS);
      staggerHandles.add(handle);
    };

    const engine = createHapticEngine({
      // Re-read on every cue: the practitioner may revoke mid-session.
      isEnabled: () => enabledRef.current && isRunning(),
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });

    const scheduler = createCueScheduler({
      schedule,
      now: () => performance.now(),
      // INFRA-395: the cue-latency figures the sign-off records.
      //
      // Same `__DEV__` gate as `hapticEngine`'s trace, deliberately — and for
      // the same unavoidable reason (a production bundle strips console.* twice
      // over; see that file's trace block). The two must switch together
      // regardless: this reports scheduler-side timer JITTER, the engine reports
      // the JS→native ROUND TRIP, and they are disjoint because `onCue` below
      // dispatches `void engine.fire(cue)` without awaiting. A figure taken from
      // only one of them is not the cue latency.
      onLateness: __DEV__
        ? ({ cue, latenessMs, delivered }) =>
            logAccessibility(
              `[haptics] ${cue} ${delivered ? 'delivered' : 'DROPPED'} late=${Math.round(latenessMs)}ms`,
              { action: delivered ? 'triggered' : 'disabled' }
            )
        : undefined,
      onCue: (cue) => {
        // ORDER IS LOAD-BEARING (DEBUG-425). The speech channel is scheduled
        // FIRST, so it is neither textually nor causally downstream of the
        // tactile call. `engine.fire` returns a promise whose value is
        // discarded below; the announcement's independence used to rest on
        // nothing but that `void`, and a later refactor to
        // `if (await engine.fire(cue)) { ...announce... }` would have silently
        // made the utterance conditional on the actuator. Keeping it ahead of
        // the fire makes that impossible rather than merely unlikely.
        //
        // Felt order is unchanged: the stagger timer is armed microseconds
        // before `fire()` is invoked synchronously below.
        scheduleAnnouncement(cue);

        // Fire-and-forget. The engine never rejects; the void is deliberate so
        // a slow actuator cannot delay the next scheduling decision.
        void engine.fire(cue);
      },
    });

    const onAppStateChange = (next: AppStateStatus): void => {
      if (next === 'active') {
        // Re-arm from the current position. The scheduler drops every boundary
        // that went stale while suspended, so this emits nothing itself.
        //
        // The focus term is load-bearing (DEBUG-587), not defensive symmetry.
        // Dialling 988 from CrisisResources backgrounds the app, so THIS is the
        // handler that runs when the practitioner comes back from the call — and
        // with a gate that could not stay closed, it re-armed the scheduler onto a
        // practice screen sitting behind the crisis surface, for the rest of the
        // session.
        if (isRunning()) scheduler.start();
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
      clearPendingSpeech();
      clearPendingSpeechRef.current = null;
    };
    // `schedule` identity governs the session; callers must memoise it.
    //
    // Note this depends on `schedulerNeeded`, NOT on `tactileEnabled`: toggling
    // the preference mid-session no longer tears down and rebuilds the
    // scheduler, so the absolute timeline is not reset to zero. That is what
    // the hook's own docstring has always claimed ("revoking any one of them
    // takes effect on the next boundary rather than at the next mount") — the
    // engine re-reads the gate per cue, so the teardown was never what enforced
    // it.
  }, [schedulerNeeded, schedule]);

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

    // No assignment here. `activeRef` and `focusedRef` are each written once, in
    // the render body, and the gate composes them at read time — see the
    // one-writer-one-meaning note above. Writing a combined value here is what
    // made the gate re-openable by an unrelated re-render (DEBUG-587).
    if (!running) clearPendingSpeechRef.current?.();

    const scheduler = schedulerRef.current;
    if (!scheduler) return;

    if (running) scheduler.start();
    else scheduler.pause();
  }, [isActive, isFocused, schedulerNeeded, schedule]);

  return { emitSessionEnd };
}
