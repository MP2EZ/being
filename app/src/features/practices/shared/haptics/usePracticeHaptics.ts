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

import { useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { NavigationContext } from '@react-navigation/native';

import { isFeatureEnabled } from '@/core/services/featureFlags';
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
   */
  announce?: (cue: PracticeCue) => void;
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
}: UsePracticeHapticsOptions): void {
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

  const schedulerRef = useRef<ReturnType<typeof createCueScheduler> | null>(null);

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
}
