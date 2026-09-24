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
 * toggle — plus an arithmetic budget. The budget's measured inputs are PROVISIONAL: they
 * come from DEBUG-633's 402x874 capture, taken with a deep-link title, and 390x844 was never
 * measured. DEBUG-654 replaces them with an on-device capture.
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

const screenElement = () => (
  <PracticeTimerScreen
    practiceId="breathing-space"
    moduleId="aware-presence"
    duration={180}
    title="3-Minute Breathing Space"
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
 * PROVISIONAL budget, DEBUG-633 AC5's 402x874 capture: viewport 338..840 (502pt), toggle
 * 185pt at 'Begin Practice' and 116pt at 'Pause'. That capture used the deep-link title
 * 'Breathing Space'; the live title stacks a taller header, and 390x844 has no capture at
 * all. DEBUG-654 measures both and replaces these numbers.
 *
 * The gap between the disc and the toggle is read from the rendered styles, so a margin
 * added to that path moves the arithmetic. Only fixed, non-text elements may sit in it —
 * asserted above — which is what lets a constant-height sum stand in for a layout engine.
 */
describe('the co-visible span fits the measured viewport (provisional)', () => {
  const MEASURED = { viewport: 502, toggleBegin: 185, togglePause: 116, worstHeaderViewport: 315 };
  const DISC_PT = 120;
  const EXPANSION_PT = 0.25 * DISC_PT; // 1.5x scale about the centre adds 30pt each side

  const flat = (style: unknown) => (StyleSheet.flatten(style as never) ?? {}) as Record<string, number>;
  /** Nearest host ancestor: getByTestId returns host nodes, whose parents may be composite. */
  const hostParent = (n: { parent: unknown; type: unknown }) => {
    let p = n.parent as { parent: unknown; type: unknown; props: Record<string, unknown> } | null;
    while (p && typeof p.type !== 'string') p = p.parent as typeof p;
    return p;
  };

  it('fits disc (at full inhale) plus toggle, at both labels, and keeps a sliver at the worst header', () => {
    setWindow(SCALES.ax5);
    render(screenElement());
    const container = screen.getByTestId(CIRCLE);
    const section = hostParent(container as never);
    // At AX nothing follows the disc inside its container, so the container's own padding
    // is all that separates the disc from what comes next.
    const nodes = preorder(screen.toJSON() as never);
    const c = nodes.findIndex((e) => e.node.props.testID === CIRCLE);
    const d = nodes.findIndex((e) => e.node.props.testID === DISC);
    expect(d).toBeGreaterThan(c);
    expect(nodes[d].end).toBe(nodes[c].end);
    const gap =
      (flat(container.props.style).paddingBottom ?? flat(container.props.style).paddingVertical ?? 0) +
      (flat(section?.props.style).marginBottom ?? 0);

    // The expansion below the disc must stay inside its own padding, not on the toggle.
    expect(gap).toBeGreaterThanOrEqual(EXPANSION_PT);
    for (const toggle of [MEASURED.toggleBegin, MEASURED.togglePause]) {
      expect(EXPANSION_PT + DISC_PT + gap + toggle).toBeLessThanOrEqual(MEASURED.viewport);
      expect(gap + toggle + 1).toBeLessThanOrEqual(MEASURED.worstHeaderViewport);
    }
  });
});
