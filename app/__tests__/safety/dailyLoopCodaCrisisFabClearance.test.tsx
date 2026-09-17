/**
 * DEBUG-520 — the daily-loop coda's Done button clears the crisis FAB's exclusion region.
 *
 * MEASURED, not derived. `maestro hierarchy` on iPhone 16e / iOS 18.6, viewport derived
 * from the device's own profile.plist as 390x844 (never from the device name — INFRA-478),
 * Release gate binary, provenance head e1c2584c, dirty:false, marker read before AND after
 * the observation and diff-identical:
 *
 *   daily-loop-complete-screen       bounds=[0,129][390,722]
 *   daily-loop-done-button           bounds=[20,738][370,794]
 *   crisis-button-root               bounds=[346,700][390,744]
 *
 * Painted intersection 24pt wide x 6pt tall at the button's top-right corner. At
 * `zIndex: 9999` the FAB WINS that tap, so the harm is a crisis FALSE POSITIVE (DEBUG-547's
 * class): the press fires an audit-logged navigation into CrisisResources AND swallows the
 * completion. That matters more here than on the sibling screens because
 * `DailyLoopNavigator.tsx:405` suppresses this route's header ✕, so `daily-loop-done-button`
 * is simultaneously the coda's ONLY exit and the only path that runs
 * `markCheckInComplete('daily')` and the principle engagements.
 *
 * WHY THIS IS A RENDER TEST AND NOT A SOURCE-SLICE ONE. The footer's padding has TWO write
 * paths — `styles.footer` and the inline `[styles.footer, { paddingBottom: ... }]` array —
 * and a source slice cannot see the second. Every number below is read back off the RENDERED,
 * flattened style; nothing here asserts against a literal. `crisis-zero-988-windows.test.tsx`
 * is the structural suite and renders nothing, which is why this is its own file.
 *
 * INSETS ARE MOCKED LOCALLY, AND THEY HAVE TO BE. `__tests__/setup/jest.setup.js:614`
 * mocks this module globally with `SafeAreaProvider` as a passthrough and
 * `useSafeAreaInsets` returning a hard-pinned all-zero inset — its own comment says
 * "Insets are pinned at zero here, so no test can see an edges value having a layout
 * EFFECT." A real `SafeAreaProvider initialMetrics` is therefore inert in this suite
 * (verified: it returned paddingBottom 16 for a requested 34pt inset), and the zero it
 * pins is exactly the ONE value at which this defect does not reproduce. So the module
 * mock is overridden for this file only, which is what lets the sweep vary the axis the
 * bug actually lives on. Do not delete this in favour of the global mock.
 *
 * WHY THE SWEEP IS UNCONDITIONAL. Solving the predicate symbolically, vertical overlap needs
 * `top < regionBottom`, i.e. `-spacing[16] - insets.bottom - 56 < -RECT.bottom`, which reduces
 * to `insets.bottom > 0`. So the overlap exists on EVERY device with a nonzero bottom inset
 * and is clear at exactly `inset === 0`. The iPhone SE 3 therefore does not "clear by 16pt" as
 * this item was originally filed: `regionBottom = 667 - 72 = 595` and the button's top is
 * `667 - 16 - 56 = 595` — it clears by ZERO, and only because `spacing[16] + 56 === RECT.bottom`
 * is an arithmetic coincidence. One Dynamic Type wrap step takes the frame to ~76pt and the SE
 * intersects too. The gate certifies 375x667, which is why no flow ever saw this, and it is
 * why the inset must NOT be made `insets.bottom`-aware: the false arm is the only arm the gate
 * would ever execute.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

/**
 * Overrides the global all-zero mock for this file only. Self-contained by necessity —
 * `jest.requireActual` on this module throws here — and mirroring the global mock's shape
 * so nothing else in the tree changes behaviour.
 */
let mockBottomInset = 34;
jest.mock('react-native-safe-area-context', () => {
  const React_ = require('react');
  const { View: RNView } = require('react-native');
  const passthrough = ({ children }) => children;
  const insets = () => ({ top: 47, right: 0, bottom: mockBottomInset, left: 0 });
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const consumerOf = (value) => ({ children }) => children(value);
  return {
    SafeAreaProvider: passthrough,
    SafeAreaConsumer: consumerOf(insets()),
    SafeAreaView: ({ children, edges, mode: _mode, ...props }) =>
      React_.createElement(RNView, { ...props, edges }, children),
    useSafeAreaInsets: () => insets(),
    useSafeAreaFrame: () => frame,
    SafeAreaInsetsContext: { Consumer: consumerOf(insets()), Provider: passthrough },
    SafeAreaFrameContext: { Consumer: consumerOf(frame), Provider: passthrough },
    initialWindowMetrics: { insets: insets(), frame },
  };
});

import DailyLoopCompleteScreen from '@/features/practices/dailyloop/screens/DailyLoopCompleteScreen';
import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';

type Viewport = { width: number; height: number };
type Style = Record<string, number | string | undefined>;

/**
 * Viewports the app actually ships against. 375x667 is the smallest supported and the one
 * the Maestro gate certifies; 390x844 is where the capture was taken.
 */
const VIEWPORTS: Viewport[] = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 402, height: 874 },
];

/** 0 = SE-class, 21 = older notch, 34 = home indicator, 44 = Pro-class. */
const BOTTOM_INSETS = [0, 21, 34, 44];

/** One line (measured 56), one wrap step, and an AX5-class wrapped frame. */
const FRAME_HEIGHTS = [56, 76, 120];

const DEFAULT_VIEWPORT = VIEWPORTS[1];
const DEFAULT_INSET = 34;

const flat = (s: unknown): Style => (StyleSheet.flatten(s) ?? {}) as Style;

/** Render and skip the closing breath — the footer only mounts once `breathDone`. */
const renderCoda = (bottom: number = DEFAULT_INSET) => {
  mockBottomInset = bottom;
  const utils = render(
    <DailyLoopCompleteScreen depth="quick" mode="flat" onComplete={jest.fn()} />,
  );
  fireEvent.press(utils.getByTestId('daily-loop-skip-closing-breath'));
  return utils;
};

const footerStyle = (
  _viewport: Viewport = DEFAULT_VIEWPORT,
  bottom: number = DEFAULT_INSET,
): Style => {
  const { getByTestId, unmount } = renderCoda(bottom);
  const style = flat(getByTestId('daily-loop-complete-footer').props.style);
  unmount();
  return style;
};

describe('DEBUG-520 — the coda CTA is disjoint from the crisis exclusion region', () => {
  it('never intersects, across viewport x bottom-inset x wrapped height', () => {
    const offenders: string[] = [];

    for (const viewport of VIEWPORTS) {
      for (const inset of BOTTOM_INSETS) {
        // Every term is read back off the RENDERED style — no literals.
        const style = footerStyle(viewport, inset);
        const padLeft = Number(style.paddingLeft ?? style.paddingHorizontal ?? 0);
        const padRight = Number(style.paddingRight ?? style.paddingHorizontal ?? 0);
        const padBottom = Number(style.paddingBottom ?? 0);

        for (const height of FRAME_HEIGHTS) {
          // The footer is pinned to the bottom, so the CTA grows UPWARD when it wraps.
          const frame = {
            x: padLeft,
            y: viewport.height - padBottom - height,
            width: viewport.width - padLeft - padRight,
            height,
          };
          if (intersectsCrisisButtonExclusion(frame, viewport)) {
            offenders.push(
              `${viewport.width}x${viewport.height} inset=${inset} h=${height} ` +
                `frame=[${frame.x},${frame.y}][${frame.x + frame.width},${frame.y + frame.height}]`,
            );
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('takes the inset from the DERIVED constant, not a hand-copied literal', () => {
    // A local `spacing[72]` would silently stop tracking the FAB if the button's size,
    // hitSlop or clearance ever moved (CleanHomeScreen.accessibility.test.tsx:461).
    expect(footerStyle().paddingRight).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
  });

  it('carries no padding SHORTHAND that could outrank the inset', () => {
    // Padding resolves by EDGE PRIORITY, not declaration order:
    // Start/End > Left/Right > Horizontal > All. So a later `paddingHorizontal` cannot
    // overwrite `paddingRight` — but a `paddingEnd` OUTRANKS it and would, silently, and
    // would also flip away from the FAB in RTL while the FAB stays hard-coded `right: 0`.
    // Absence of every shorthand is the contract, not merely today's key order.
    const style = footerStyle();
    for (const key of ['padding', 'paddingHorizontal', 'paddingEnd', 'paddingStart']) {
      expect(style[key]).toBeUndefined();
    }
  });

  it('sets the inset on the FOOTER, never on the button itself', () => {
    // THE DEBUG-547 TRAP. AccessibleButton applies its incoming `style` prop LAST
    // (AccessibleButton.tsx:135), so an inset moved onto the button would look correct and
    // change nothing: padding inside the button leaves its FRAME — and therefore its tap
    // target — exactly where it was. Only padding on the padded PARENT moves the frame.
    const { getByTestId } = renderCoda();
    const button = flat(getByTestId('daily-loop-done-button').props.style);

    expect(button.paddingRight).toBeUndefined();
    expect(button.marginRight).toBeUndefined();
    expect(button.marginHorizontal).toBeUndefined();
    // Either would break the stretch-child derivation the sweep above depends on.
    expect(button.width).toBeUndefined();
    expect(button.alignSelf).toBeUndefined();
  });

  it('PROOF OF LIVENESS — the measured pre-fix frame DOES intersect (DEBUG-390)', () => {
    // The device capture, encoded as a falsifier rather than as prose. If this ever returns
    // false the predicate or the constants moved, and every assertion above is vacuous.
    expect(
      intersectsCrisisButtonExclusion(
        { x: 20, y: 738, width: 350, height: 56 },
        { width: 390, height: 844 },
      ),
    ).toBe(true);

    // The SE 3 at one wrap step — the case the original filing thought was safe.
    expect(
      intersectsCrisisButtonExclusion(
        { x: 20, y: 667 - 16 - 76, width: 335, height: 76 },
        { width: 375, height: 667 },
      ),
    ).toBe(true);

    // The render helper really did reach the post-breath block and the provider really did
    // deliver the inset, so the lookups above are not silently reading a default frame.
    expect(footerStyle(DEFAULT_VIEWPORT, 34).paddingBottom).toBe(50);
    expect(footerStyle(DEFAULT_VIEWPORT, 0).paddingBottom).toBe(16);
  });
});
