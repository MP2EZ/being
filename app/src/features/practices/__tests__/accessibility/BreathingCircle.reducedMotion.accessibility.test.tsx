/**
 * BreathingCircle — OS reduce-motion suppression (DEBUG-394)
 *
 * WHY THIS FILE CARRIES ITS OWN REANIMATED MOCK
 *
 * The global shim at `app/__tests__/setup/jest.setup.js` defines
 * `useSharedValue: (init) => ({ value: init })` — a NEW object every render,
 * re-seeded from whatever `init` currently evaluates to. Under that shim a
 * shared value can never hold a stale write, which is the exact defect
 * DEBUG-394 exists to fix: `isReducedMotion` was seeded from
 * `effectiveReducedMotion` at mount and then clobbered by an effect writing the
 * raw `reducedMotion` prop. Re-seeding every render hides the clobber, so every
 * assertion below passes on the UNFIXED component and the test proves nothing.
 *
 * The mock here is `useRef`-backed, so a value written by an effect survives to
 * the next render exactly as it does on device. That is what makes the
 * suppression branch observable, and what lets this file fail.
 *
 * Do NOT "simplify" this by deleting the local mock and leaning on the global
 * one, and do NOT change the global one to match — it is load-bearing for every
 * other Reanimated-rendering suite in the tree.
 */

import React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const ReactLocal = require('react');
  const RN = jest.requireActual('react-native');
  const Animated = {
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    createAnimatedComponent: (C: unknown) => C,
  };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    // The whole point of this file — see the header block.
    useSharedValue: (init: unknown) => {
      const ref = ReactLocal.useRef({ value: init });
      return ref.current;
    },
    useAnimatedStyle: (fn: () => unknown) => {
      try {
        return fn() || {};
      } catch {
        return {};
      }
    },
    withTiming: (val: unknown) => val,
    withRepeat: (val: unknown) => val,
    withSequence: (val: unknown) => val,
    withDelay: (_d: unknown, val: unknown) => val,
    withSpring: (val: unknown) => val,
    runOnJS: (fn: unknown) => fn,
    runOnUI: (fn: unknown) => fn,
    cancelAnimation: jest.fn(),
    interpolate: (val: unknown) => val,
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Easing: {
      ease: () => 0,
      linear: () => 0,
      bezier: () => () => 0,
      inOut: () => () => 0,
      in: () => () => 0,
      out: () => () => 0,
    },
  };
});

// Imported after the mock factory so the component binds to it.
import BreathingCircle from '../../shared/components/BreathingCircle';

const TEST_ID = 'breathing-circle';

/** Flattened style of the animated circle, addressed by its a11y label. */
function circleStyle(): Record<string, unknown> {
  const circle = screen.getByLabelText('Breathing guide circle');
  return StyleSheet.flatten(circle.props.style) as Record<string, unknown>;
}

function mockReduceMotion(enabled: boolean): void {
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(enabled);
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as never);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
}

describe('BreathingCircle — OS reduce-motion (DEBUG-394)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('the worklet honours the OS setting with no prop passed', () => {
    it('suppresses the scale pulse when OS reduce-motion is ON', async () => {
      mockReduceMotion(true);

      render(<BreathingCircle isActive testID={TEST_ID} />);

      // The OS read resolves asynchronously, so the suppression state only
      // exists after that promise settles and re-renders.
      await waitFor(() => {
        expect(circleStyle().opacity).toBe(0.9);
      });

      expect(circleStyle().transform).toEqual([{ scale: 1 }]);
    });

    it('leaves the animation untouched when OS reduce-motion is OFF', async () => {
      mockReduceMotion(false);

      render(<BreathingCircle isActive testID={TEST_ID} />);

      // Settle the async read so this is a genuine comparison against the case
      // above rather than an assertion made before the promise resolved.
      await waitFor(() => {
        expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      });

      // `opacity` is the discriminator, not `transform`. Under this harness the
      // suppression branch and the un-animated initial state BOTH read
      // `scale: 1` (identity `withTiming` plus a shared value that has not been
      // re-read since mount), so a transform assertion here would pass for the
      // wrong reason. Only the branch's literal `opacity: 0.9` is unique to it.
      expect(circleStyle().opacity).not.toBe(0.9);
    });

    it('still honours an explicit reducedMotion prop', async () => {
      mockReduceMotion(false);

      render(<BreathingCircle isActive reducedMotion testID={TEST_ID} />);

      await waitFor(() => {
        expect(circleStyle().opacity).toBe(0.9);
      });
    });
  });

  describe('the visible phase cue is seeded when suppression turns on', () => {
    it('shows a phase cue without waiting for the next leg boundary', async () => {
      mockReduceMotion(true);

      render(<BreathingCircle isActive testID={TEST_ID} />);

      // The first inhale cue is announced synchronously when the animation
      // effect runs — before the async OS read has flipped the component into
      // reduced-motion. If the cue is only ever set from inside that
      // announcement, the practitioner gets a static circle and NO pacing text
      // until the next leg completes (up to a full inhale, ~4s).
      // `includeHiddenElements` is REQUIRED here, not incidental. The cue is
      // deliberately marked `accessibilityElementsHidden` /
      // `importantForAccessibility="no-hide-descendants"` so that a
      // VoiceOver/TalkBack user does not hear every phase twice (once from
      // `announcePhase`, once from this label). RNTL defaults to
      // `includeHiddenElements: false`, so it excludes exactly those nodes —
      // without this option the query returns null even when the cue renders.
      const cue = await screen.findByTestId(`${TEST_ID}-phase-cue`, {
        includeHiddenElements: true,
      });
      expect(cue).toBeTruthy();
      // Seeded from the phase already announced, not a hardcoded guess.
      expect(cue).toHaveTextContent('Breathe in');
    });

    it('renders no phase cue when motion is allowed', async () => {
      mockReduceMotion(false);

      render(<BreathingCircle isActive testID={TEST_ID} />);

      await waitFor(() => {
        expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
      });

      // `includeHiddenElements: true` matters MORE on the negative assertion
      // than the positive one: the cue is hidden from the a11y tree, so without
      // this option the query returns null whether or not the cue rendered, and
      // the assertion would pass vacuously.
      expect(
        screen.queryByTestId(`${TEST_ID}-phase-cue`, {
          includeHiddenElements: true,
        })
      ).toBeNull();
    });
  });

  describe('guidance copy is true for a user with no screen reader', () => {
    it('does not promise announcements the platform only makes to VoiceOver/TalkBack', async () => {
      mockReduceMotion(true);

      render(<BreathingCircle isActive testID={TEST_ID} />);

      await waitFor(() => {
        expect(circleStyle().opacity).toBe(0.9);
      });

      // Reduce-motion is a vestibular/migraine setting; the modal user of this
      // branch is sighted with no screen reader, and Being ships no audio.
      // "announced" describes announceForAccessibility, which such a user never
      // hears.
      expect(screen.queryByText(/announced/i)).toBeNull();
    });

    it('lets a paced grounding anchor stack BELOW the cue, never take its slot', async () => {
      // DEBUG-468 gave this component an opt-in guidance slot that replaces the
      // generic copy with authored anchors, one per breath cycle. It must not
      // reach the phase cue: with the circle static and no audio in the app, that
      // cue is the ONLY pacing a sighted vestibular-sensitive practitioner gets.
      // The anchor is content; the cue is the metronome. Both, or the
      // accommodation regresses into a silent, untimed sit.
      mockReduceMotion(true);

      render(
        <BreathingCircle
          isActive
          testID={TEST_ID}
          guidanceItems={['one physical sensation — feet on the ground']}
        />
      );

      const cue = await screen.findByTestId(`${TEST_ID}-phase-cue`, {
        includeHiddenElements: true,
      });
      expect(cue).toHaveTextContent('Breathe in');
      expect(
        screen.getByTestId(`${TEST_ID}-grounding`, { includeHiddenElements: true })
      ).toHaveTextContent('one physical sensation — feet on the ground');
    });
  });
});
