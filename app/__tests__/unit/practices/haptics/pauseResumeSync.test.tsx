/**
 * DEBUG-587 AC1/AC2 — the cue timeline and the breath agree across a pause.
 *
 * THE DECISION THIS FILE PINS (AC2). The scheduler is authoritative and the
 * VISUALS were re-anchored to it, not the other way round. `cueScheduler` is
 * deliberately pattern-agnostic and is shared with ReflectionTimerScreen's
 * interval cadence and BodyScanScreen's region timeline, both of which are
 * correct precisely because their targets are absolute against a fixed origin.
 * Snapping the scheduler forward on every resume would have made the cue COUNT a
 * function of how many times the practitioner paused — the "signature" the cue
 * catalog forbids — left the tail of a fixed-length schedule undelivered, and
 * reintroduced the accumulating error `phaseAtElapsed` exists to eliminate.
 *
 * So `schedulerHoldsAbsolutePositions` below is not a happy-path test. It is the
 * spec that goes RED if someone later re-anchors the scheduler to the visual
 * restart, which is the defensible-looking wrong answer to AC1.
 *
 * WHY BOTH MODALITIES LIVE IN ONE FILE. The defect is an AGREEMENT defect. A
 * file that asserts only what reaches `expo-haptics`, or only what reaches the
 * screen reader, cannot fail on a disagreement between them — each side is
 * self-consistent. Splitting these into two files would leave the actual bug
 * unpinned while both files stayed green.
 *
 * Note the reanimated mock never invokes a `withTiming` completion callback, so
 * the phase announcements that ride those callbacks are unobservable here. The
 * one that IS observable is the announcement made when the effect activates —
 * which is exactly the line that was wrong.
 */

import React from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { render, renderHook, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import BreathingCircle from '@/features/practices/shared/components/BreathingCircle';
import { usePracticeHaptics } from '@/features/practices/shared/haptics/usePracticeHaptics';
import { __resetHapticEngineForTest } from '@/features/practices/shared/haptics/hapticEngine';
import { boundariesWithin } from '@/features/practices/shared/haptics/phaseAtElapsed';
import { DEFAULT_PATTERN } from '@/features/practices/shared/breathingPatterns';
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
const mockAnnounce = AccessibilityInfo.announceForAccessibility as jest.MockedFunction<
  typeof AccessibilityInfo.announceForAccessibility
>;

/** PracticeTimerScreen's real schedule: 4000 exhale, 8000 inhale, 12000 exhale... */
const SCHEDULE: ScheduledCue[] = boundariesWithin(DEFAULT_PATTERN, 180_000, {
  skipOpening: true,
}).map((b) => ({ atMs: b.atMs, cue: b.phase }));

let clock = 0;

function advance(ms: number): void {
  act(() => {
    clock += ms;
    jest.advanceTimersByTime(ms);
  });
}

/** Everything spoken so far, in order. */
function spoken(): string[] {
  return mockAnnounce.mock.calls.map(([text]) => String(text));
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

describe('DEBUG-587 AC2: the scheduler keeps absolute positions across a pause', () => {
  it('resumes the cue timeline where the practice left it, not on a fresh cycle', () => {
    const { rerender } = renderHook(
      ({ isActive }: { isActive: boolean }) => usePracticeHaptics({ schedule: SCHEDULE, isActive }),
      { initialProps: { isActive: false } }
    );

    act(() => rerender({ isActive: true }));

    advance(4000); // the exhale boundary
    expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);

    advance(1000); // 1000 ms into the exhale
    act(() => rerender({ isActive: false })); // pause

    advance(10_000); // wall time passes; session time must not
    expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);

    act(() => rerender({ isActive: true })); // resume at session position 5000

    // The next boundary is at 5000 + 3000, NOT immediately (which a re-anchored
    // scheduler would give) and NOT a full phase away at 4000.
    advance(2999);
    expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);

    advance(1);
    expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(2);
    expect(mockHaptics.impactAsync).toHaveBeenLastCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });
});

describe('DEBUG-587 AC1: the breath resumes into the phase that was running', () => {
  /** CONTROL — a genuine start is still the top of an inhale. */
  it('opens on the inhale when the practice actually begins', () => {
    render(<BreathingCircle isActive />);
    expect(spoken()).toEqual(['Breathe in']);
  });

  /** CONTROL — resuming inside an inhale still says inhale, now for the right reason. */
  it('resumes into the inhale when the pause landed inside one', () => {
    const { rerender } = render(<BreathingCircle isActive />);
    expect(spoken()).toEqual(['Breathe in']);

    advance(2000); // 2000 ms into the opening inhale
    act(() => rerender(<BreathingCircle isActive={false} />));
    advance(10_000); // paused
    act(() => rerender(<BreathingCircle isActive />));

    expect(spoken()).toEqual(['Breathe in', 'Breathe in']);
  });

  /**
   * THE ONE THAT FAILS TODAY.
   *
   * Pausing 1000 ms into the exhale and resuming told the practitioner to breathe
   * IN while the cue timeline — and the session clock the timer is counting — were
   * both still inside the exhale. For a VoiceOver practitioner that spoken label is
   * the only phase channel there is, so it is not a cosmetic mismatch: it is the
   * app instructing the opposite of what it is timing.
   */
  it('resumes into the exhale when the pause landed inside one', () => {
    const { rerender } = render(<BreathingCircle isActive />);
    expect(spoken()).toEqual(['Breathe in']);

    advance(5000); // cycle 0: inhale 0-4000, exhale 4000-8000 → 1000 ms into the exhale
    act(() => rerender(<BreathingCircle isActive={false} />));
    advance(10_000); // paused; wall time must not advance the breath
    act(() => rerender(<BreathingCircle isActive />));

    expect(spoken()).toEqual(['Breathe in', 'Breathe out']);
  });

  /** Paused time is excluded, exactly as `cueScheduler.elapsedMs()` excludes it. */
  it('does not let time spent paused advance the breath', () => {
    const { rerender } = render(<BreathingCircle isActive />);

    advance(3000); // still inside the opening inhale
    act(() => rerender(<BreathingCircle isActive={false} />));
    advance(60_000); // a minute on the crisis screen, say
    act(() => rerender(<BreathingCircle isActive />));

    // If paused wall time counted, 63000 ms would land mid-exhale and say so.
    expect(spoken()).toEqual(['Breathe in', 'Breathe in']);
  });
});
