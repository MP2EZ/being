import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { colorSystem, getContrastRatio } from '@/core/theme';
import { CollapsibleCrisisButton } from '../CollapsibleCrisisButton';

const COMPONENT_PATH = path.resolve(
  __dirname,
  '..',
  'CollapsibleCrisisButton.tsx'
);

/**
 * The fs-based checks below are fast defense-in-depth — they catch source-level
 * changes to the WIDTH constants without spinning up the renderer. The render-
 * based checks at the bottom catch actual runtime drift (a style override, a
 * conditional that bypasses the constant, etc.) that a grep cannot see.
 */
describe('CollapsibleCrisisButton WCAG 2.5.5 target size', () => {
  const source = fs.readFileSync(COMPONENT_PATH, 'utf-8');

  test('COLLAPSED_WIDTH_STANDARD source constant meets 44pt minimum (regression guard)', () => {
    const match = source.match(/const COLLAPSED_WIDTH_STANDARD = (\d+);/);
    expect(match).not.toBeNull();
    const value = parseInt(match![1], 10);
    expect(value).toBeGreaterThanOrEqual(44);
  });

  test('COLLAPSED_WIDTH_PROMINENT source constant meets 44pt minimum (regression guard)', () => {
    const match = source.match(/const COLLAPSED_WIDTH_PROMINENT = (\d+);/);
    expect(match).not.toBeNull();
    const value = parseInt(match![1], 10);
    expect(value).toBeGreaterThanOrEqual(44);
  });

  test('standard-variant renders with width and height >= 44pt', () => {
    const { getByTestId } = render(
      React.createElement(CollapsibleCrisisButton, {
        onNavigate: () => {},
        mode: 'standard',
        testID: 'crisis-button',
      })
    );

    const node = getByTestId('crisis-button');
    // RN style may be an array, an object, or undefined. Flatten and pick the
    // first matching numeric width/height. The component passes `style={...}`
    // as an Animated.View prop; the testID-tagged node carries it directly.
    const style = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style)
      : node.props.style;
    expect(style).toBeTruthy();
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });

  test('prominent-variant renders with width and height >= 44pt', () => {
    const { getByTestId } = render(
      React.createElement(CollapsibleCrisisButton, {
        onNavigate: () => {},
        mode: 'prominent',
        testID: 'crisis-prominent',
      })
    );

    const node = getByTestId('crisis-prominent');
    const style = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style)
      : node.props.style;
    expect(style).toBeTruthy();
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });
});

/**
 * DEBUG-396 — WCAG 1.4.11 (3:1 for non-text UI components) on the immersive
 * resting state of the root crisis button.
 *
 * WHY THE RATIO IS COMPUTED HERE RATHER THAN READ OFF THE TREE. `opacity` on an
 * Animated.View is applied by the native compositor, so no composited pixel
 * exists in jest. The repo's reanimated shim additionally returns a fresh
 * unmemoised `{value}` from `useSharedValue` and runs `useAnimatedStyle` during
 * render, before the effect mutates it — so a rendered node always reports
 * opacity 1 regardless of mode. Asserting against the source constant is the
 * only reading that tracks what actually ships, and it follows the fs-based
 * precedent already used for the WIDTH constants above.
 *
 * WHY A TABLE AND NOT ONE BACKGROUND. The item that raised this measured only
 * the white `HapticsOptInPrompt` backdrop and concluded the undismissable modal
 * was the cause. It is not: `sharedPracticeStyles.container` is already
 * `base.white`, so the faded button composites at the same ratio on those
 * screens with no overlay present. The modal governs SEVERITY (no dismissal
 * path), not the ratio — so the fix must hold on every immersive host, and
 * `IMMERSIVE_ROUTES` has six members spanning four themes plus white.
 */
describe('DEBUG-396 immersive fade contrast (WCAG 1.4.11)', () => {
  const source = fs.readFileSync(COMPONENT_PATH, 'utf-8');

  const fadedMatch = source.match(/const FADED_OPACITY = ([\d.]+);/);
  const FADED = parseFloat(fadedMatch![1]!);

  /** sRGB source-over composite — what CoreAnimation does for a flat opacity. */
  const composite = (fg: string, bg: string, alpha: number): string => {
    const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const [fr, fg_, fb] = hex(fg);
    const [br, bg_, bb] = hex(bg);
    const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha));
    return (
      '#' +
      [mix(fr!, br!), mix(fg_!, bg_!), mix(fb!, bb!)]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')
    );
  };

  const BUTTON_FILL = colorSystem.status.critical;

  /**
   * Every background an IMMERSIVE_ROUTES member can render on. Read from the
   * tokens, never restated as literals, so a design-system change that moves a
   * theme background re-runs this assertion against the new value.
   */
  const IMMERSIVE_HOSTS: ReadonlyArray<readonly [string, string]> = [
    ['base.white (practice screens)', colorSystem.base.white],
    ['themes.morning.background', colorSystem.themes.morning.background],
    ['themes.midday.background (DailyLoop)', colorSystem.themes.midday.background],
    ['themes.evening.background', colorSystem.themes.evening.background],
    ['themes.learn.background', colorSystem.themes.learn.background],
  ];

  test.each(IMMERSIVE_HOSTS)(
    'faded resting state clears 3:1 over %s',
    (_name, background) => {
      const ratio = getContrastRatio(composite(BUTTON_FILL, background, FADED), background);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    }
  );

  test('ANTI-TAUTOLOGY: the pre-fix 0.5 fails on every one of those hosts', () => {
    // Without this the table above proves nothing — it would pass for any
    // sufficiently high opacity, including one that never shipped. White is the
    // mathematical ceiling (the composite is pinned halfway toward #991B1B, so
    // lightening the backdrop lightens the composite almost as fast), which is
    // why 0.5 fails even on the best possible background.
    for (const [, background] of IMMERSIVE_HOSTS) {
      const ratio = getContrastRatio(composite(BUTTON_FILL, background, 0.5), background);
      expect(ratio).toBeLessThan(3.0);
    }
  });

  test('the immersive fade is PRESERVED, not retired', () => {
    // MAINT-127's recessive-during-practice behaviour is deliberate. This item
    // raises the floor to clear 1.4.11; it does not un-fade the button. A future
    // change that "fixes" contrast by setting FADED_OPACITY = 1 fails here.
    expect(FADED).toBeLessThan(1);
    expect(FADED).toBeGreaterThan(0.5);
  });

  test('full opacity — reduce-motion, and post-interaction — clears 3:1 with margin', () => {
    for (const [, background] of IMMERSIVE_HOSTS) {
      const ratio = getContrastRatio(composite(BUTTON_FILL, background, 1), background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/**
 * DEBUG-396 — the auto-fade-back timer must not outlive the guard that armed it.
 *
 * `resetFade` schedules a 3s `setTimeout` whose body writes FADED_OPACITY
 * unconditionally, while its `mode === 'immersive' && !reduceMotionEnabled`
 * guard is evaluated at SCHEDULE time. An armed timer therefore re-fades the
 * button after the condition that justified fading has already gone away —
 * which reproduces the very under-contrast state this item exists to close, and
 * a resting-state assertion cannot see it. It already mis-fires today for a user
 * who enables reduce-motion within 3s of a tap: the listener restores opacity 1,
 * then the stale timer drives it back down.
 */
describe('DEBUG-396 immersive re-fade timer lifetime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderWithMode = (mode: 'immersive' | 'standard', testID: string) =>
    render(
      React.createElement(CollapsibleCrisisButton, {
        onNavigate: () => {},
        mode,
        testID,
      })
    );

  /**
   * `jest.getTimerCount()` is global, and React Native's own `Pressable` arms an
   * internal timer on press — so a raw count cannot attribute a timer to this
   * component. Standard mode is the control: `resetFade` arms nothing there, so
   * whatever a press schedules is RN's. Every assertion below is expressed as an
   * offset from that baseline, which isolates OUR timer without depending on
   * RN's internals staying the same across upgrades.
   */
  const rnPressBaseline = (): number => {
    const { getByTestId, unmount } = renderWithMode('standard', 'crisis-timer-baseline');
    fireEvent.press(getByTestId('crisis-timer-baseline'));
    const count = jest.getTimerCount();
    unmount();
    return count;
  };

  test('a tap in immersive mode arms exactly ONE re-fade timer, not one per call', () => {
    // One tap reaches resetFade twice — handleTap calls it, then
    // handleCrisisAction calls it again — which used to stack two independent
    // timers. Owning the handle coalesces them.
    const baseline = rnPressBaseline();

    const { getByTestId } = renderWithMode('immersive', 'crisis-timer-armed');
    fireEvent.press(getByTestId('crisis-timer-armed'));

    expect(jest.getTimerCount()).toBe(baseline + 1);
  });

  test('unmount disarms the pending re-fade', () => {
    const { getByTestId, unmount } = renderWithMode('immersive', 'crisis-timer-unmount');
    fireEvent.press(getByTestId('crisis-timer-unmount'));
    const armed = jest.getTimerCount();
    expect(armed).toBeGreaterThan(0);

    unmount();

    // Nothing of OURS may outlive the component; a queued re-fade would fire
    // into a torn-down tree. Offset again rather than `toBe(0)`: RN's own
    // press-internal timer is not released by unmount in this environment, and
    // asserting zero would be asserting RN's teardown, not ours.
    expect(jest.getTimerCount()).toBe(armed - 1);
  });

  test('leaving immersive mode disarms the pending re-fade', () => {
    const { getByTestId, rerender } = renderWithMode('immersive', 'crisis-timer-mode');
    fireEvent.press(getByTestId('crisis-timer-mode'));
    const armed = jest.getTimerCount();

    rerender(
      React.createElement(CollapsibleCrisisButton, {
        onNavigate: () => {},
        mode: 'standard',
        testID: 'crisis-timer-mode',
      })
    );

    // This is the failure the item describes: the surface stopped being
    // immersive, but a timer armed while it was would still drive the button
    // back to FADED_OPACITY up to 3s later. Exactly one timer — ours — is
    // released; RN's press-internal timer is not this component's to cancel.
    expect(jest.getTimerCount()).toBe(armed - 1);
  });
});
