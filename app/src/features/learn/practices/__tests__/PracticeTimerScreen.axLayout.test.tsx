/**
 * DEBUG-638 — at accessibility text sizes the breathing circle shares the viewport with
 * the start/pause control.
 *
 * Measured at AX5 on 402x874 (DEBUG-633 AC5): the `breathing-circle` node was ~959pt tall
 * — the 120pt disc plus ~740pt of the component's own generic guidance copy — and the
 * Timer sat between it and the toggle, so the disc's bottom edge was ~1033pt above the
 * toggle's top in a ~502pt scroll viewport. Whenever the control was reachable, the breath
 * guide was not visible, before and after Begin.
 *
 * Founder decision: CIRCLE ABOVE TOGGLE. From PRACTICE_HEADER_STACKED_FONT_SCALE up, the
 * toggle renders directly after the circle section, and the circle hides its generic
 * guidance copy (philosopher-cleared for this screen at this threshold only). The
 * reduce-motion phase cue is never hidden: under reduce-motion it is the pacing.
 *
 * Jest has no layout engine, so this pins STRUCTURE — what sits between the disc and the
 * toggle — plus an arithmetic budget whose inputs DEBUG-654 measured on device, at both
 * viewports, with the live title.
 */

import React from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import PracticeTimerScreen, {
  practiceTimerUsesAxLayout,
} from '@/features/learn/practices/PracticeTimerScreen';
import {
  PRACTICE_HEADER_STACKED_FONT_SCALE,
  practiceHeaderStacksTitle,
} from '@/features/learn/practices/shared/practiceScreenHeaderLayout';
import { DEBUG_654_MEASURED_TITLES } from '../../../../../__tests__/helpers/debug654MeasuredTitles';

// useRef-backed so a shared value written by an effect survives to the next render, as on
// device; see BreathingCircle.reducedMotion.accessibility.test.tsx for why that matters.
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
    useSharedValue: (init: unknown) => ReactLocal.useRef({ value: init }).current,
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

// The REAL BreathingCircle, counted: a remount restarts the breath from an inhale and
// desyncs it from the haptic cue schedule (DEBUG-587), so a text-size change mid-practice
// must move the toggle, never remount the circle.
const mockMounts = { circle: 0, timer: 0 };
jest.mock('@/features/practices/shared/components/BreathingCircle', () => {
  const ReactLocal = require('react');
  const actual = jest.requireActual('@/features/practices/shared/components/BreathingCircle');
  const Counted = (props: Record<string, unknown>) => {
    ReactLocal.useEffect(() => {
      mockMounts.circle += 1;
    }, []);
    return ReactLocal.createElement(actual.default, props);
  };
  return { __esModule: true, ...actual, default: Counted };
});

// Timer renders TEXT, as the real one does, so misplacing it between the disc and the
// toggle is visible to the Text walk below.
const mockTimer: { onTick?: (remainingMs: number) => void } = {};
jest.mock('@/features/practices/shared/components/Timer', () => {
  const ReactLocal = require('react');
  const { View, Text } = require('react-native');
  return (props: { testID?: string; onTick?: (remainingMs: number) => void }) => {
    ReactLocal.useEffect(() => {
      mockMounts.timer += 1;
    }, []);
    mockTimer.onTick = props.onTick;
    return (
      <View testID={props.testID}>
        <Text>03:00</Text>
      </View>
    );
  };
});

jest.mock('@/features/learn/practices/shared/usePracticeCompletion', () => ({
  usePracticeCompletion: () => ({
    renderCompletion: () => null,
    markStarted: jest.fn(),
    markComplete: jest.fn(),
  }),
}));

const ID = 'practice-timer-screen';
const DISC = `${ID}-breathing-circle-disc`;
const CIRCLE = `${ID}-breathing-circle`;
const TOGGLE = `${ID}-toggle-button`;
const TIMER = `${ID}-timer`;

const SCALES = { default: 1.0, xxxLarge: 1.353, ax1: 1.786, ax5: 3.571 };
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 402, height: 874 },
];
const GENERIC_COPY = [
  'Follow the circle as it expands and contracts',
  'Each phase change is shown above as it happens',
  'Let your breath find its natural rhythm',
];

const setWindow = (fontScale: number, { width, height } = VIEWPORTS[1]) =>
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({ width, height, scale: 3, fontScale });

const setReduceMotion = (enabled: boolean) => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
};

// The title DEBUG-654 measured with, shared with DEBUG-679's AC3 pin so the two cannot drift.
const MEASURED_TITLE = DEBUG_654_MEASURED_TITLES[0]!;

const screenElement = () => (
  <PracticeTimerScreen
    practiceId="breathing-space"
    moduleId="aware-presence"
    duration={180}
    title={MEASURED_TITLE}
    testID={ID}
  />
);

/** Pre-order host nodes, each with the index where its subtree ends. */
type HostNode = { type: string; props: Record<string, unknown>; children: (HostNode | string)[] | null };
const preorder = (root: HostNode | HostNode[] | null) => {
  const out: { node: HostNode; end: number }[] = [];
  const walk = (n: HostNode | string) => {
    if (typeof n === 'string') return;
    const i = out.length;
    out.push({ node: n, end: -1 });
    (n.children ?? []).forEach(walk);
    out[i].end = out.length;
  };
  (Array.isArray(root) ? root : root ? [root] : []).forEach(walk);
  return out;
};
const textOf = (n: HostNode): string =>
  (n.children ?? []).map((c) => (typeof c === 'string' ? c : textOf(c))).join('');

/** Everything rendered after the disc's subtree and before the toggle, in document order. */
const betweenDiscAndToggle = () => {
  const nodes = preorder(screen.toJSON() as never);
  const disc = nodes.findIndex((e) => e.node.props.testID === DISC);
  const toggle = nodes.findIndex((e) => e.node.props.testID === TOGGLE);
  const timer = nodes.findIndex((e) => e.node.props.testID === TIMER);
  const between = disc >= 0 && toggle > disc ? nodes.slice(nodes[disc].end, toggle) : [];
  return {
    disc,
    toggle,
    timer,
    texts: between.filter((e) => e.node.type === 'Text').map((e) => textOf(e.node)),
    testIDs: between.map((e) => e.node.props.testID).filter(Boolean) as string[],
  };
};

const startPractice = () => {
  fireEvent.press(screen.getByTestId(TOGGLE));
  act(() => mockTimer.onTick?.(179_000));
};

beforeEach(() => {
  mockMounts.circle = 0;
  mockMounts.timer = 0;
  setWindow(SCALES.default);
  setReduceMotion(false);
});
afterEach(() => {
  jest.restoreAllMocks();
  setWindow(SCALES.default);
});

describe('the AX threshold is the header stacking threshold', () => {
  it('flips at the same font scale as the stacked header, and never at slider sizes', () => {
    for (const s of [SCALES.default, SCALES.xxxLarge, 1.59, PRACTICE_HEADER_STACKED_FONT_SCALE, SCALES.ax1, SCALES.ax5]) {
      expect(practiceTimerUsesAxLayout(s)).toBe(practiceHeaderStacksTitle(s));
    }
    expect(practiceTimerUsesAxLayout(SCALES.xxxLarge)).toBe(false);
    expect(practiceTimerUsesAxLayout(SCALES.ax1)).toBe(true);
    expect(practiceTimerUsesAxLayout(Number.NaN)).toBe(false);
  });
});

describe('the disc testID names the disc, not the ~959pt container', () => {
  it('sits on the labelled breathing guide inside the circle container', () => {
    render(screenElement());
    const disc = screen.getByTestId(DISC);
    expect(disc.props.accessibilityLabel).toBe('Breathing guide circle');
    expect(screen.getByTestId(CIRCLE)).toBeTruthy();
  });
});

describe('at the default text size the tree is unchanged', () => {
  it('keeps circle, timer, toggle order with the generic copy between disc and toggle', () => {
    render(screenElement());
    const { disc, toggle, timer, texts } = betweenDiscAndToggle();
    expect(disc).toBeGreaterThan(-1);
    expect(timer).toBeGreaterThan(disc);
    expect(toggle).toBeGreaterThan(timer);
    // Non-vacuity control for the AX assertions: the walk DOES see text in this slot.
    expect(texts).toEqual(expect.arrayContaining([GENERIC_COPY[0], GENERIC_COPY[2], '03:00']));
  });
});

describe.each(VIEWPORTS)('at AX5 on $width x $height the toggle directly follows the circle', (viewport) => {
  beforeEach(() => setWindow(SCALES.ax5, viewport));

  it('has no text between the disc and the toggle, before Begin', () => {
    render(screenElement());
    const { disc, toggle, timer, texts } = betweenDiscAndToggle();
    expect(disc).toBeGreaterThan(-1);
    expect(toggle).toBeGreaterThan(disc);
    expect(timer).toBeGreaterThan(toggle);
    expect(texts).toEqual([]);
    GENERIC_COPY.forEach((copy) => expect(screen.queryByText(copy)).toBeNull());
  });

  it('still does after Begin, with the control reading Pause', () => {
    render(screenElement());
    startPractice();
    expect(screen.getByTestId(TOGGLE).props.accessibilityLabel).toBe('Pause practice');
    const { toggle, timer, texts } = betweenDiscAndToggle();
    expect(timer).toBeGreaterThan(toggle);
    expect(texts).toEqual([]);
  });
});

describe('under reduce-motion at AX5 the phase cue stays, and is the only text in the slot', () => {
  it('renders the cue between the disc and the toggle, with the generic copy hidden', async () => {
    setWindow(SCALES.ax5);
    setReduceMotion(true);
    render(screenElement());
    startPractice();

    const cue = await screen.findByTestId(`${CIRCLE}-phase-cue`, { includeHiddenElements: true });
    expect(cue).toBeTruthy();
    await waitFor(() => expect(betweenDiscAndToggle().testIDs).toContain(`${CIRCLE}-phase-cue`));
    const { texts } = betweenDiscAndToggle();
    expect(texts).toHaveLength(1);
    expect(['Breathe in', 'Breathe out']).toContain(texts[0]);
    GENERIC_COPY.forEach((copy) => expect(screen.queryByText(copy, { includeHiddenElements: true })).toBeNull());
  });
});

describe('a text-size change mid-practice moves the toggle and remounts nothing', () => {
  it('keeps the same BreathingCircle and Timer across default -> AX5 after Begin', () => {
    const { rerender } = render(screenElement());
    startPractice();
    expect(mockMounts).toEqual({ circle: 1, timer: 1 });

    setWindow(SCALES.ax5);
    rerender(screenElement());
    const { toggle, timer, texts } = betweenDiscAndToggle();
    expect(timer).toBeGreaterThan(toggle);
    expect(texts).toEqual([]);
    expect(mockMounts).toEqual({ circle: 1, timer: 1 });
    expect(screen.getByTestId(TOGGLE).props.accessibilityLabel).toBe('Pause practice');
  });

  it('control: the counter does see a remount', () => {
    const first = render(screenElement());
    first.unmount();
    render(screenElement());
    expect(mockMounts).toEqual({ circle: 2, timer: 2 });
  });
});

/**
 * DEBUG-654 capture: Release build of 2b183fd8, iOS 18.6 simulators, content size
 * accessibility-extra-extra-extra-large, live title '3-Minute Breathing Space', `maestro
 * hierarchy` at several scroll offsets before Begin, running and paused, with and without
 * reduce-motion.
 *
 *   viewport     the scroll view below the stacked header (402: 431..840, 390: 416..810)
 *   toggle*      the toggle's frame at each label. At 390 'Begin Practice' wraps to three
 *                lines and 'Resume' breaks mid-word onto two
 *   phaseCue     the cue's line box. It is hidden from the accessibility tree, so it is the
 *                container's growth on Begin (227 / 228) less guidanceContainer's marginTop and
 *                the cue's marginBottom
 *
 * Contract (accessibility ruling, DEBUG-654), keyed on whether pacing runs, not on the label:
 * - Pause is the only label shown while the disc paces, so the whole disc at full inhale and
 *   the whole toggle fit.
 * - Begin and Resume sit on a static disc with nothing to follow, so a fully visible toggle
 *   must leave at least half the disc in view. The whole disc does not fit at 390. The floor
 *   also covers the 300ms ease-back on pause: expansion only adds disc above the gap.
 * - Under reduce-motion the cue is the pacing, so while it paces the cue and the whole Pause
 *   toggle fit, without the disc. Paused under reduce-motion is exempt: the cue is not
 *   cleared on pause, but it is stale and nothing paces, and no disc floor can hold there
 *   either, since the cue puts ~292pt between the disc and the toggle.
 * - The live title is the only in-app header here. A deep-link title is free text, so no
 *   fixed number bounds it, and it is not an input to this budget.
 *
 * The gaps are read from the rendered styles, so a margin added to either path moves the
 * arithmetic. Only the cue may sit between disc and toggle (asserted above), which is what
 * lets a constant-height sum stand in for a layout engine.
 */
describe.each([
  { device: '402x874', width: 402, height: 874, viewport: 409, toggleBegin: 185, togglePause: 117, toggleResume: 117, phaseCue: 187 },
  { device: '390x844', width: 390, height: 844, viewport: 394, toggleBegin: 253, togglePause: 116, toggleResume: 184, phaseCue: 188 },
])('at AX5 on $device the measured viewport holds the breath guide and the control', (m) => {
  const DISC_PT = 120;
  const EXPANSION_PT = 0.25 * DISC_PT; // 1.5x scale about the centre adds 30pt each side

  const flat = (style: unknown) => (StyleSheet.flatten(style as never) ?? {}) as Record<string, number>;
  /** Nearest host ancestor: getByTestId returns host nodes, whose parents may be composite. */
  const hostParent = (n: { parent: unknown; type: unknown }) => {
    let p = n.parent as { parent: unknown; type: unknown; props: Record<string, unknown> } | null;
    while (p && typeof p.type !== 'string') p = p.parent as typeof p;
    return p;
  };
  const bottomOf = (style: unknown) => (flat(style).paddingBottom ?? flat(style).paddingVertical ?? 0);

  /** Container padding below its last child, plus the section margin before the toggle. */
  const containerToToggle = () => {
    const container = screen.getByTestId(CIRCLE);
    return bottomOf(container.props.style) + (flat(hostParent(container as never)?.props.style).marginBottom ?? 0);
  };
  /** A node whose subtree ends where the container's does: nothing follows it inside. */
  const isLastInContainer = (testID: string) => {
    const nodes = preorder(screen.toJSON() as never);
    const c = nodes.findIndex((e) => e.node.props.testID === CIRCLE);
    const n = nodes.findIndex((e) => e.node.props.testID === testID);
    return n > c && nodes[n].end === nodes[c].end;
  };

  beforeEach(() => setWindow(SCALES.ax5, { width: m.width, height: m.height }));

  it('before Begin, a fully visible toggle leaves at least half the static disc in view', () => {
    render(screenElement());
    expect(isLastInContainer(DISC)).toBe(true);
    expect(DISC_PT / 2 + containerToToggle() + m.toggleBegin).toBeLessThanOrEqual(m.viewport);
  });

  it('while pacing, the whole disc at full inhale and the whole Pause toggle fit', () => {
    render(screenElement());
    startPractice();
    expect(screen.getByTestId(TOGGLE).props.accessibilityLabel).toBe('Pause practice');
    expect(isLastInContainer(DISC)).toBe(true);
    const gap = containerToToggle();
    // The expansion below the disc must stay inside the gap, not on the toggle.
    expect(gap).toBeGreaterThanOrEqual(EXPANSION_PT);
    expect(EXPANSION_PT + DISC_PT + gap + m.togglePause).toBeLessThanOrEqual(m.viewport);
  });

  it('paused, a fully visible Resume toggle leaves at least half the disc in view', () => {
    render(screenElement());
    startPractice();
    fireEvent.press(screen.getByTestId(TOGGLE));
    expect(screen.getByTestId(TOGGLE).props.accessibilityLabel).toBe('Resume practice');
    expect(isLastInContainer(DISC)).toBe(true);
    expect(DISC_PT / 2 + containerToToggle() + m.toggleResume).toBeLessThanOrEqual(m.viewport);
  });

  it('under reduce-motion, while pacing, the phase cue and the whole Pause toggle fit', async () => {
    setReduceMotion(true);
    render(screenElement());
    startPractice();
    const cue = await screen.findByTestId(`${CIRCLE}-phase-cue`, { includeHiddenElements: true });
    expect(screen.getByTestId(TOGGLE).props.accessibilityLabel).toBe('Pause practice');
    expect(isLastInContainer(`${CIRCLE}-phase-cue`)).toBe(true);
    const guidance = hostParent(cue as never);
    const cueToToggle =
      (flat(cue.props.style).marginBottom ?? 0) +
      bottomOf(guidance?.props.style) +
      (flat(guidance?.props.style).marginBottom ?? 0) +
      containerToToggle();
    expect(m.phaseCue + cueToToggle + m.togglePause).toBeLessThanOrEqual(m.viewport);
  });
});
