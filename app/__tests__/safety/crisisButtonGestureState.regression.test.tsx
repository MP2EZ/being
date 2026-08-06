/**
 * DEBUG-299 — the crisis button vanished on tap and was "not active anywhere".
 *
 * ROOT CAUSE (confirmed from the project's own babel output, not inferred):
 * `CollapsibleCrisisButton` constructed `Gesture.Pan()` near the top of the
 * component and its `onUpdate`/`onEnd` worklets closed over `collapsedWidth`,
 * which was not declared until ~80 lines further down. Reanimated's babel
 * plugin serializes a worklet's `_closure` EAGERLY, at the construction site —
 * verified in the emitted bundle: the two `_closure` objects were written at
 * char 8779 and 10157 while `var collapsedWidth` landed at char 11832. And
 * because TypeScript's `const` is down-levelled to `var`, there was no TDZ
 * ReferenceError to catch it: the worklets simply captured `undefined`.
 *
 * The arithmetic from there is forced:
 *   Math.max(-260 + undefined, ...)  ->  NaN
 *   translateX.value = NaN           ->  transform: [{ translateX: NaN }]
 * On iOS/Fabric a NaN transform yields a layer that is neither drawn nor
 * hit-testable — invisible AND inert, throwing nothing. MAINT-290 had promoted
 * the button to a single root mount that never unmounts, so one NaN removed
 * 988 access from every screen for the rest of the session.
 *
 * WHY NO EXISTING TEST CAUGHT IT — and why this file carries its own mocks.
 * `__tests__/setup/jest.setup.js` stubs BOTH `react-native-reanimated` and
 * `react-native-gesture-handler` into no-op passthroughs: the fluent
 * `Gesture.Pan().onUpdate(fn).onEnd(fn)` chain composes, but `fn` is never
 * invoked and `useAnimatedStyle`'s output is never inspected. The entire suite
 * is therefore structurally blind to this defect class. The mocks below are
 * FILE-LOCAL and deliberately override the global ones so the gesture callbacks
 * are actually recorded and driven, and the animated style is actually read.
 * Do not delete them in favour of the global stubs — that silently restores the
 * blind spot this file exists to close.
 *
 * THE FIX this pins: the swipe-to-expand affordance is REMOVED. It existed only
 * to reveal a "Get Support" label that the collapsed tap already reaches, its
 * activation was what cancelled the crisis press (RNGH hands the touch to the
 * pan and the child Pressable never fires), and it was the sole consumer of the
 * defective clamp arithmetic. Deleting it removes the failure class outright
 * rather than tuning a gesture activation threshold on the 988 path.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppState } from 'react-native';

/* -------------------------------------------------------------------------- *
 * File-local mocks (see header). `mock`-prefixed so jest's factory hoisting
 * allows the out-of-scope reference.
 * -------------------------------------------------------------------------- */

/** Names of gesture recognizers constructed during render, in order. */
const mockGestureLog: string[] = [];
/** Gesture callbacks registered via the fluent chain, by method name. */
const mockGestureHandlers: Record<string, (...args: unknown[]) => unknown> = {};
/** Every shared value created, so a test can force one to a bad state. */
const mockSharedValues: Array<{ value: number }> = [];
/** Every `useAnimatedStyle` factory, so a test can re-evaluate it on demand. */
const mockStyleFactories: Array<() => Record<string, unknown>> = [];

jest.mock('react-native-gesture-handler', () => {
  const React_ = require('react');
  const RN = jest.requireActual('react-native');

  // A single chainable object: every fluent method records its callback and
  // returns `this`, so arbitrary chains compose exactly as the real API does.
  const chain: Record<string, unknown> = {};
  const FLUENT = [
    'onBegin', 'onStart', 'onUpdate', 'onChange', 'onEnd', 'onFinalize',
    'onTouchesDown', 'onTouchesUp', 'activeOffsetX', 'activeOffsetY',
    'failOffsetX', 'failOffsetY', 'minDistance', 'maxPointers', 'enabled',
    'shouldCancelWhenOutside', 'hitSlop', 'runOnJS', 'withRef', 'withTestId',
  ];
  for (const method of FLUENT) {
    chain[method] = (arg: unknown) => {
      if (typeof arg === 'function') {
        mockGestureHandlers[method] = arg as (...a: unknown[]) => unknown;
      }
      return chain;
    };
  }

  const construct = (name: string) => () => {
    mockGestureLog.push(name);
    return chain;
  };

  return {
    __esModule: true,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      React_.createElement(RN.View, null, children),
    Gesture: {
      Pan: construct('Pan'),
      Tap: construct('Tap'),
      LongPress: construct('LongPress'),
      Fling: construct('Fling'),
      Race: construct('Race'),
      Exclusive: construct('Exclusive'),
      Simultaneous: construct('Simultaneous'),
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      createAnimatedComponent: (C: unknown) => C,
    },
    useSharedValue: (initial: number) => {
      const sv = { value: initial };
      mockSharedValues.push(sv);
      return sv;
    },
    useAnimatedStyle: (factory: () => Record<string, unknown>) => {
      mockStyleFactories.push(factory);
      return factory();
    },
    // Animations resolve to their target synchronously — this file asserts the
    // VALUE that reaches the style, not the interpolation over time.
    withSpring: (toValue: number) => toValue,
    withTiming: (toValue: number) => toValue,
    withDelay: (_d: number, anim: number) => anim,
    runOnJS:
      (fn: (...a: unknown[]) => unknown) =>
      (...a: unknown[]) =>
        fn(...a),
    interpolate: (v: number) => v,
    Easing: { linear: (v: number) => v, inOut: (f: unknown) => f, ease: (v: number) => v },
  };
});

// Imported AFTER the mocks so the component binds to them.
// eslint-disable-next-line import/first
import { CollapsibleCrisisButton } from '@/features/crisis/components/CollapsibleCrisisButton';

/** Collect every finite-checkable number reachable in a style object. */
const numbersIn = (value: unknown, acc: number[] = []): number[] => {
  if (typeof value === 'number') acc.push(value);
  else if (Array.isArray(value)) value.forEach((v) => numbersIn(v, acc));
  else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((v) => numbersIn(v, acc));
  }
  return acc;
};

const MODES = ['standard', 'immersive', 'prominent'] as const;

describe('DEBUG-299 — crisis button cannot be rendered invisible or inert', () => {
  beforeEach(() => {
    mockGestureLog.length = 0;
    mockSharedValues.length = 0;
    mockStyleFactories.length = 0;
    for (const k of Object.keys(mockGestureHandlers)) delete mockGestureHandlers[k];
  });

  test.each(MODES)(
    'registers no pan gesture that could intercept the crisis press (mode=%s)',
    (mode) => {
      render(
        <CollapsibleCrisisButton onNavigate={jest.fn()} mode={mode} testID="crisis-button" />,
      );

      // A pan on the crisis control is what cancelled the child Pressable's
      // press (RNGH awards the touch to the recognizer), so a tap with any
      // finger drift produced no navigation at all. The button must not carry
      // a gesture recognizer that can win the touch away from the press.
      expect(mockGestureLog).not.toContain('Pan');
    },
  );

  test.each(MODES)('animated style is finite at rest (mode=%s)', (mode) => {
    render(
      <CollapsibleCrisisButton onNavigate={jest.fn()} mode={mode} testID="crisis-button" />,
    );

    expect(mockStyleFactories.length).toBeGreaterThan(0);
    for (const factory of mockStyleFactories) {
      for (const n of numbersIn(factory())) {
        expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  test('driving each registered gesture callback leaves the style finite', () => {
    render(
      <CollapsibleCrisisButton onNavigate={jest.fn()} mode="standard" testID="crisis-button" />,
    );

    // The literal reproduction of the shipped defect. Assert after EACH handler
    // rather than after all of them — that distinction is load-bearing. Before
    // the fix, `onUpdate` alone wrote NaN (the moment the button vanished
    // mid-drag), but the subsequent `onEnd` took its collapse branch and
    // assigned `withSpring(0)`, which THIS MOCK resolves synchronously to a
    // finite 0. Draining every handler in one go therefore ended finite and
    // hid the bug.
    //
    // On device it does not recover that way: Reanimated's spring termination
    // check compares against the current value, so a spring seeded from NaN
    // never satisfies its predicate and translateX stays NaN permanently. A
    // synchronous mock cannot model a non-terminating spring, so we assert at
    // the first point of corruption instead — which is both faithful to the
    // user-visible failure and strictly stronger.
    for (const [name, handler] of Object.entries(mockGestureHandlers)) {
      handler({ translationX: -30, translationY: 0, velocityX: -100 });

      for (const factory of mockStyleFactories) {
        for (const n of numbersIn(factory())) {
          expect(`${name}:${Number.isFinite(n)}`).toBe(`${name}:true`);
        }
      }
    }
  });

  test('a non-finite shared value cannot blank the button — style guard fails open', () => {
    render(
      <CollapsibleCrisisButton onNavigate={jest.fn()} mode="immersive" testID="crisis-button" />,
    );

    // Belt-and-braces per the crisis specialist's blocking constraint: the
    // guard must sit at the useAnimatedStyle boundary, so that a FUTURE
    // closure-capture or arithmetic bug upstream still cannot remove 988
    // access. Corrupt every shared value, then re-evaluate the style.
    for (const sv of mockSharedValues) sv.value = NaN;

    for (const factory of mockStyleFactories) {
      for (const n of numbersIn(factory())) {
        expect(Number.isFinite(n)).toBe(true);
      }
    }
  });

  test('self-heals a corrupted shared value when the app returns to foreground', () => {
    const listeners: Array<(s: string) => void> = [];
    const spy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event: string, cb: (s: string) => void) => {
        if (event === 'change') listeners.push(cb);
        return { remove: jest.fn() } as never;
      });

    try {
      render(
        <CollapsibleCrisisButton onNavigate={jest.fn()} mode="immersive" testID="crisis-button" />,
      );

      for (const sv of mockSharedValues) sv.value = NaN;
      expect(listeners.length).toBeGreaterThan(0);
      listeners.forEach((cb) => cb('active'));

      for (const sv of mockSharedValues) {
        expect(Number.isFinite(sv.value)).toBe(true);
      }
    } finally {
      spy.mockRestore();
    }
  });

  test.each(MODES)('press still reaches onNavigate (mode=%s)', (mode) => {
    const onNavigate = jest.fn();
    const { getByTestId } = render(
      <CollapsibleCrisisButton onNavigate={onNavigate} mode={mode} testID="crisis-button" />,
    );

    fireEvent.press(getByTestId('crisis-button'));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
