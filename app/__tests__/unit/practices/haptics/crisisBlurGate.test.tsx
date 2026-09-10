/**
 * DEBUG-587 AC3 — no practice output may reach a crisis surface.
 *
 * `usePracticeHaptics`' own docstring commits to it: "no haptic may fire on or
 * over a crisis surface." Navigation blur is the only signal the hook has that
 * the practitioner left, and until DEBUG-587 the hook could not hold that
 * signal for longer than one commit.
 *
 * WHY THESE SPECS EXIST AT ALL. Before this file, the blur path was pinned by
 * ZERO tests: `useIsFocusedSafe` reads `NavigationContext`, no existing suite
 * supplies one, and without a navigator above it the hook reports focused
 * unconditionally. So every prior test of this hook ran with focus welded true
 * and could not express blur — which is why the defect below survived a suite
 * that otherwise covers this module well.
 *
 * THE MECHANISM. `activeRef` had TWO writers with DIFFERENT meanings: the
 * render body wrote raw `isActive`, and a passive effect wrote
 * `isActive && isFocused`. Blur ran the effect once and set the ref false — and
 * then every subsequent render restored it to true, because the render-body
 * write has no focus term and the effect's deps had not changed. All three
 * practice screens re-render about once a second while blurred (the elapsed-time
 * tick), so the ref was stale-TRUE for the entire time the practitioner sat on
 * the crisis screen, not for the frame or two a naive reading suggests.
 *
 * These specs assert what a practitioner can actually receive — what reaches
 * `expo-haptics` and what reaches the announcement callback — never scheduler
 * internals. `nextIndex()` and `elapsedMs()` can both be perfectly correct while
 * the practitioner is being buzzed over a 988 screen.
 */

import React from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { render, renderHook, act, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import BreathingCircle from '@/features/practices/shared/components/BreathingCircle';
import { usePracticeHaptics } from '@/features/practices/shared/haptics/usePracticeHaptics';
import { __resetHapticEngineForTest } from '@/features/practices/shared/haptics/hapticEngine';
import { boundariesWithin } from '@/features/practices/shared/haptics/phaseAtElapsed';
import { DEFAULT_PATTERN } from '@/features/practices/shared/breathingPatterns';
import { HAPTIC_ANNOUNCEMENT_STAGGER_MS } from '@/features/practices/shared/haptics/constants';
import type { ScheduledCue } from '@/features/practices/shared/haptics/cueScheduler';

jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: jest.fn(() => true),
}));
jest.mock('@/core/stores/settingsStore', () => ({
  usePracticeSettings: jest.fn(() => ({ practiceHaptics: true })),
}));

import { isFeatureEnabled } from '@/core/services/featureFlags';
import { usePracticeSettings } from '@/core/stores/settingsStore';

const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;
const mockFlag = isFeatureEnabled as jest.MockedFunction<typeof isFeatureEnabled>;
const mockSettings = usePracticeSettings as jest.MockedFunction<typeof usePracticeSettings>;

/**
 * PracticeTimerScreen's real schedule, built from the same constant the screen
 * uses. Boundaries land at 4000 (exhale), 8000 (inhale), 12000 (exhale)... —
 * `skipOpening` drops the one at 0, which `sessionStart` occupies.
 *
 * Module scope, deliberately: `schedule` identity governs the scheduler effect,
 * so a fresh array per render would tear the scheduler down and reset the
 * session timeline mid-test.
 */
const SCHEDULE: ScheduledCue[] = boundariesWithin(DEFAULT_PATTERN, 180_000, {
  skipOpening: true,
}).map((b) => ({ atMs: b.atMs, cue: b.phase }));

/** A navigator that is not a container: `useIsFocusedSafe` reads the context only. */
function makeNavigation() {
  let focused = true;
  const listeners: Record<string, Set<() => void>> = { focus: new Set(), blur: new Set() };

  return {
    context: {
      isFocused: () => focused,
      addListener: (type: string, cb: () => void) => {
        listeners[type]?.add(cb);
        return () => listeners[type]?.delete(cb);
      },
    },
    blur: () => {
      focused = false;
      listeners.blur.forEach((cb) => cb());
    },
  };
}

let clock = 0;

/** Advance the injected monotonic clock and the timer queue together. */
function advance(ms: number): void {
  act(() => {
    clock += ms;
    jest.advanceTimersByTime(ms);
  });
}

/** What the screen reader was actually handed. */
const mockSpeak = AccessibilityInfo.announceForAccessibility as jest.MockedFunction<
  typeof AccessibilityInfo.announceForAccessibility
>;

/** Every cue the practitioner could have felt, of either phase. */
function feltCueCount(): number {
  return mockHaptics.impactAsync.mock.calls.length;
}

/** The AppState handler the hook registered, so background/foreground is drivable. */
function appStateHandler(): (next: string) => void {
  const calls = (AppState.addEventListener as unknown as jest.Mock).mock.calls;
  return calls[calls.length - 1][1];
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  __resetHapticEngineForTest();
  clock = 0;
  jest.spyOn(performance, 'now').mockImplementation(() => clock);
  mockFlag.mockReturnValue(true);
  mockSettings.mockReturnValue({ practiceHaptics: true } as ReturnType<typeof usePracticeSettings>);
  (AppState as unknown as { currentState: string }).currentState = 'active';
});

afterEach(() => {
  jest.useRealTimers();
});

interface Props {
  isActive: boolean;
  announce?: (cue: string) => void;
}

function mountPractice(nav: ReturnType<typeof makeNavigation>, announce?: (cue: string) => void) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NavigationContext.Provider value={nav.context as never}>{children}</NavigationContext.Provider>
  );

  return renderHook(
    ({ isActive, announce: a }: Props) =>
      usePracticeHaptics({
        schedule: SCHEDULE,
        isActive,
        announce: a as never,
      }),
    { initialProps: { isActive: false, announce } as Props, wrapper }
  );
}

describe('DEBUG-587 AC3: the blur gate holds for the whole crisis-screen dwell', () => {
  /**
   * CONTROL — must stay GREEN across the change.
   *
   * Without this, a red on the specs below is indistinguishable from a harness
   * that never delivers a cue at all. This one proves cues reach expo-haptics
   * under exactly the setup the failing specs use.
   */
  it('delivers cues normally while the practice screen is focused', () => {
    const nav = makeNavigation();
    const { rerender } = mountPractice(nav);

    act(() => rerender({ isActive: true }));
    expect(feltCueCount()).toBe(0);

    advance(4000); // exhale boundary
    expect(feltCueCount()).toBe(1);

    advance(4000); // inhale boundary
    expect(feltCueCount()).toBe(2);
  });

  /** CONTROL — passes before and after; the single-commit half was always correct. */
  it('suppresses the next cue when the practitioner navigates away', () => {
    const nav = makeNavigation();
    const { rerender } = mountPractice(nav);

    act(() => rerender({ isActive: true }));
    advance(4000);
    expect(feltCueCount()).toBe(1);

    act(() => nav.blur());

    advance(8000); // two boundaries would have passed
    expect(feltCueCount()).toBe(1);
  });

  /**
   * THE ONE THAT FAILS TODAY, and the one a naive fix will not cover.
   *
   * A practice screen re-renders about once a second while blurred, because its
   * elapsed-time state keeps ticking behind the crisis screen. Each of those
   * renders re-ran the render-body write and restored the gate. Moving the
   * effect's assignment into a layout effect — the obvious fix — closes the
   * intra-commit gap and leaves this wide open.
   */
  it('stays suppressed across the elapsed-time re-renders that follow a blur', () => {
    const nav = makeNavigation();
    const { rerender } = mountPractice(nav);

    act(() => rerender({ isActive: true }));
    advance(4000);
    expect(feltCueCount()).toBe(1);

    act(() => nav.blur());

    // The tick. Nothing about the hook's inputs changed — this is the screen's
    // own clock re-rendering it behind CrisisResources.
    act(() => rerender({ isActive: true }));

    // Foregrounding after the blur: the app was backgrounded by the dial and
    // came back. This is the post-988-call return path.
    act(() => appStateHandler()('background'));
    act(() => appStateHandler()('active'));

    advance(4000);
    expect(feltCueCount()).toBe(1);
  });

  /**
   * The same stale gate, reached through the speech channel instead.
   *
   * A paired announcement is armed on a stagger timer and consults the gate at
   * FIRE time, not at schedule time. A cue delivered just before the navigation
   * therefore lands its utterance over the crisis screen — and for a VoiceOver
   * practitioner it collides with that screen's own announcements.
   */
  it('does not speak a boundary that was staggered across the navigation', () => {
    const nav = makeNavigation();
    const announce = jest.fn();
    const { rerender } = mountPractice(nav, announce);

    act(() => rerender({ isActive: true, announce }));

    advance(4000); // cue fires; the utterance is now pending on the stagger
    expect(announce).not.toHaveBeenCalled();

    advance(HAPTIC_ANNOUNCEMENT_STAGGER_MS - 50); // still pending
    act(() => nav.blur());
    act(() => rerender({ isActive: true, announce })); // the tick

    advance(100); // the stagger comes due, now over the crisis screen
    expect(announce).not.toHaveBeenCalled();
  });
});

/**
 * The same contract, on a channel that touches no haptics code at all.
 *
 * `BreathingCircle` speaks every phase through `announceForAccessibility` and had
 * no idea whether it was still on screen — so a VoiceOver practitioner who tapped
 * 988 kept hearing the practice over CrisisResources. It is not behind
 * `practice_haptics`, so unlike everything above it shipped to every VoiceOver
 * user on all four screens that render this component.
 *
 * What is drivable here is the announcement made when the animation effect
 * activates. The steady-state per-leg announcements ride `withTiming` completion
 * worklets, and the reanimated mock deliberately never invokes those (INFRA-373),
 * so they are unobservable in jest on any test anyone could write. Both routes go
 * through the one `announcePhase` guard, which is what makes this reachable entry
 * point worth pinning.
 */
describe('DEBUG-587: the breath does not speak over a crisis surface', () => {
  it('announces the phase while the practice is on screen', () => {
    const nav = makeNavigation();
    render(
      <NavigationContext.Provider value={nav.context as never}>
        <BreathingCircle isActive />
      </NavigationContext.Provider>
    );

    expect(mockSpeak).toHaveBeenCalledWith('Breathe in');
  });

  it('falls silent once the practitioner has navigated away', () => {
    const nav = makeNavigation();
    const { rerender } = render(
      <NavigationContext.Provider value={nav.context as never}>
        <BreathingCircle isActive={false} />
      </NavigationContext.Provider>
    );

    act(() => nav.blur());
    act(() =>
      rerender(
        <NavigationContext.Provider value={nav.context as never}>
          <BreathingCircle isActive />
        </NavigationContext.Provider>
      )
    );

    expect(mockSpeak).not.toHaveBeenCalled();
  });

  /**
   * Silence is the SPEECH channel only. The visible reduced-motion label is
   * on-screen state rather than an interruption, so it must still track the
   * breath — otherwise a practitioner returning from the crisis screen finds a
   * stale phase label waiting for them.
   */
  it('keeps the visible reduced-motion cue current while silent', () => {
    const nav = makeNavigation();
    const { rerender } = render(
      <NavigationContext.Provider value={nav.context as never}>
        <BreathingCircle isActive={false} reducedMotion testID="bc" />
      </NavigationContext.Provider>
    );

    act(() => nav.blur());
    act(() =>
      rerender(
        <NavigationContext.Provider value={nav.context as never}>
          <BreathingCircle isActive reducedMotion testID="bc" />
        </NavigationContext.Provider>
      )
    );

    expect(mockSpeak).not.toHaveBeenCalled();
    expect(screen.getByTestId('bc-phase-cue', { includeHiddenElements: true })).toHaveTextContent(
      'Breathe in'
    );
  });
});
