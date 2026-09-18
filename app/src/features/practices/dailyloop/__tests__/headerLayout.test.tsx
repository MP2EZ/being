/**
 * DEBUG-629 — the Daily Loop step header's scaled-type geometry.
 *
 * WHAT THIS FILE CAN PROVE: the DECISION. No layout engine runs under jest, so nothing here
 * observes a rendered band, a wrapped line, or an overlap. It pins the arithmetic the
 * header asks for, the props it passes, and the shape of its declarations.
 *
 * WHAT ONLY A DEVICE CAN PROVE, and where: that the block actually fits the computed band,
 * that the title stays on one line at the cap, and that the ✕ can be TAPPED at AX5. Those
 * are `maestro hierarchy` predicates plus `daily-loop-ax5-virtuous` / `daily-loop-ax5-entry`
 * at AX5. A green run here is not evidence for any of them.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';

import {
  DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE,
  DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE,
  DAILY_LOOP_CLOSE_BUTTON_MARGIN_LEFT,
  DAILY_LOOP_CLOSE_BUTTON_SIZE,
  DAILY_LOOP_TITLE_ADVANCE_AT_1X,
  dailyLoopHeaderBlockHeight,
  dailyLoopHeaderStyleHeight,
  dailyLoopHeaderTitleMaxWidth,
} from '../config/headerLayout';
import { DailyLoopHeaderTitle } from '../components/DailyLoopHeaderTitle';

/** The real iOS multipliers, not round numbers — a threshold test written against 1.0 and
 *  2.0 would pass for any cap in between and so pins nothing a reader cares about. */
const IOS_FONT_SCALES = {
  default: 1.0,
  large: 1.176,
  xxxLarge: 1.353,
  AX1: 1.786,
  AX2: 2.143,
  AX5: 3.571,
} as const;

/** The narrowest viewport this app supports: iOS 16.4 excludes the 320pt SE 1. */
const SMALLEST_SUPPORTED_WIDTH = 375;

describe('dailyLoopHeaderStyleHeight', () => {
  // J1 — DEBUG-468's reclaimed 28pt, discharged in CI. An identity, not an approximation:
  // the default band must not move by a single point, because daily-loop-quick-depth.yaml's
  // measured fold and its timeout:25000 scroll budget are anchored to it.
  it('is exactly the DEBUG-468 band at the default font scale', () => {
    expect(dailyLoopHeaderStyleHeight(IOS_FONT_SCALES.default)).toBe(72);
    expect(dailyLoopHeaderStyleHeight(IOS_FONT_SCALES.default)).toBe(DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE);
  });

  // J2 — the cap binds. This is the assertion the pre-fix module fails.
  it('grows with font scale and stops growing at the chrome cap', () => {
    const atCap = dailyLoopHeaderStyleHeight(DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE);

    expect(atCap).toBeGreaterThan(DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE);
    expect(dailyLoopHeaderStyleHeight(IOS_FONT_SCALES.AX5)).toBe(atCap);
    expect(dailyLoopHeaderStyleHeight(IOS_FONT_SCALES.AX2)).toBe(atCap);
    expect(dailyLoopHeaderStyleHeight(99)).toBe(atCap);
  });

  it('is monotone non-decreasing across every iOS size', () => {
    const scales = Object.values(IOS_FONT_SCALES);
    const heights = scales.map(dailyLoopHeaderStyleHeight);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });

  // The crisis ceiling, and MIND THE UNITS — getting these wrong is how a ceiling check
  // passes vacuously. `headerStyle.height` is the header view's OWN height; React
  // Navigation adds the status inset above it. Measured on the gate viewport: a height of
  // 72 renders the band at [0,30][375,102], so the inset is 30 and additive, and
  //
  //     scroll viewport = 667 - (30 + height) - 323 = 314 - height
  //
  // where 323 is the pinned support bar's measured height at AX5 ([20,344][355,667]).
  // The 242pt that leaves today is exactly the measured screen node ([0,102][375,343]).
  //
  // The binding requirement is the GATE, not paint: at AX5 `continue-button` is 169pt tall
  // and Maestro's `scrollUntilVisible` only settles on a 100%-visible element, so a viewport
  // below 169 reds an existing AX5 safety flow at the scroll rather than at an assertion.
  // Every term named, so a future edit reds with a number a reader can hold against a
  // hierarchy capture. The SE 3 is the binding device by construction: at 390x844 the same
  // band leaves ~322pt, and the bar is SHORTER on a wider screen because it wraps less.
  const SE3_SCREEN_H = 667;
  const SE3_TOP_INSET = 30; // device-supplied; DEBUG-465's matrix reads 130 = 100 + 30
  const AX5_SUPPORT_BAR_H = 323; // measured, daily-loop-ax5-entry.yaml ([20,344][355,667])
  const AX5_CONTINUE_BUTTON_H = 169; // same capture ([20,458][283,627])

  const scrollViewportAt = (fontScale: number) =>
    SE3_SCREEN_H - SE3_TOP_INSET - dailyLoopHeaderStyleHeight(fontScale) - AX5_SUPPORT_BAR_H;

  // 206 is the anti-confusion pin: it is a quantity you can only produce by getting the
  // inset right. The first version of this test compared the knob against a TOTAL-band
  // ceiling and passed by mixing units.
  //
  // MEASURED post-fix at AX5: the screen node is [0,138][375,343], i.e. 205pt, against the
  // 206 this arithmetic gives. The 1pt is a seam, not an error — the support bar's frame
  // starts at 344 and the screen's ends at 343, so the two sibling frames share an edge
  // that the subtraction counts once. Both numbers are recorded so the next reader holding
  // this against a hierarchy capture is not hunting a phantom point.
  it('leaves exactly the budgeted AX5 scroll viewport, and enough to settle continue-button', () => {
    expect(scrollViewportAt(IOS_FONT_SCALES.AX5)).toBe(206);
    expect(scrollViewportAt(IOS_FONT_SCALES.AX5) - 1).toBe(205); // the measured node height
    expect(scrollViewportAt(IOS_FONT_SCALES.AX5)).toBeGreaterThanOrEqual(AX5_CONTINUE_BUTTON_H);
  });

  it('does not move the default-size scroll viewport at all', () => {
    expect(scrollViewportAt(IOS_FONT_SCALES.default)).toBe(242);
  });

  it('caps the band at the measured maximum', () => {
    expect(dailyLoopHeaderStyleHeight(IOS_FONT_SCALES.AX5)).toBe(108);
  });

  // J3 — DEBUG-299 house rule. A NaN fontScale must not produce a NaN band.
  it.each([NaN, Infinity, -1, 0, undefined, null, 'big'])(
    'falls back to the default band for a non-finite fontScale (%p)',
    (bad) => {
      expect(dailyLoopHeaderStyleHeight(bad as unknown as number)).toBe(DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE);
    },
  );
});

// J11 — THE CONTROL, and it is not optional: it pins the fix's premise. Without it every
// assertion above could pass against a header that never needed changing.
describe('dailyLoopHeaderBlockHeight (the premise)', () => {
  it('overflows the DEBUG-468 band at exactly 200%, which is what makes this an SC failure', () => {
    expect(dailyLoopHeaderBlockHeight(2.0)).toBeGreaterThan(DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE);
  });

  it('overflows it at AX5 too', () => {
    expect(dailyLoopHeaderBlockHeight(IOS_FONT_SCALES.AX5)).toBeGreaterThan(
      DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE,
    );
  });

  it('fits the band at the default size, so the band is only wrong at scaled sizes', () => {
    expect(dailyLoopHeaderBlockHeight(1.0)).toBeLessThanOrEqual(DAILY_LOOP_HEADER_STYLE_HEIGHT_BASE);
  });
});

describe('dailyLoopHeaderTitleMaxWidth', () => {
  // J8 — derived from the ✕'s real style values, never restated literals.
  it("reserves the ✕'s outer edge plus the 8pt minimum target spacing, both sides", () => {
    const reserved = DAILY_LOOP_CLOSE_BUTTON_MARGIN_LEFT + DAILY_LOOP_CLOSE_BUTTON_SIZE + 8;
    expect(dailyLoopHeaderTitleMaxWidth(SMALLEST_SUPPORTED_WIDTH)).toBe(
      SMALLEST_SUPPORTED_WIDTH - 2 * reserved,
    );
    expect(dailyLoopHeaderTitleMaxWidth(SMALLEST_SUPPORTED_WIDTH)).toBe(239);
  });

  // C3 — the title can never share x with the ✕, and this is an EQUALITY with zero slack:
  // centred, a 239pt cell in 375 puts its left edge at exactly 68 = the ✕'s right edge (60)
  // plus the 8pt minimum. Any change to the ✕'s width or marginLeft breaks it in one
  // direction with no intermediate value, so it is asserted from the same constants that
  // produce both rather than eyeballed against a literal.
  it("puts the title cell's left edge exactly 8pt clear of the ✕", () => {
    const slot = dailyLoopHeaderTitleMaxWidth(SMALLEST_SUPPORTED_WIDTH);
    const titleCellLeft = (SMALLEST_SUPPORTED_WIDTH - slot) / 2;
    const exitRight = DAILY_LOOP_CLOSE_BUTTON_MARGIN_LEFT + DAILY_LOOP_CLOSE_BUTTON_SIZE;
    expect(titleCellLeft).toBe(exitRight + 8);
    expect(titleCellLeft).toBe(68);
  });

  // J7 — the one-line assumption, stated as an inequality so a token move goes red rather
  // than silently wrapping the title into a band sized for one line.
  it('leaves the capped title on one line at the narrowest viewport', () => {
    const needed = DAILY_LOOP_TITLE_ADVANCE_AT_1X * DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE;
    expect(needed).toBeLessThanOrEqual(dailyLoopHeaderTitleMaxWidth(SMALLEST_SUPPORTED_WIDTH));
  });
});

describe('DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE', () => {
  // J4 — iOS ignores a multiplier below 1.0, and exactly 1.0 is allowFontScaling={false}
  // under another name: either restores the defect with all the arithmetic still green.
  it('is above 1 and meets the WCAG 1.4.4 200% floor', () => {
    expect(DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE).toBeGreaterThan(1);
    expect(DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE).toBeGreaterThanOrEqual(2);
  });
});

describe('DailyLoopHeaderTitle', () => {
  const renderTitle = (showProgress = true) =>
    render(<DailyLoopHeaderTitle currentStep={3} totalSteps={3} showProgress={showProgress} />);

  // J5 — the title is capped, and capped is the ONLY thing done to it: no truncation, no
  // shrink-to-fit, no frozen scaling. The string itself is frozen by the philosopher ruling.
  it('caps the title without truncating, shrinking or freezing it', () => {
    const title = renderTitle().getByText('Daily Practice');
    expect(title.props.maxFontSizeMultiplier).toBe(DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE);
    expect(title.props.numberOfLines).toBeUndefined();
    expect(title.props.adjustsFontSizeToFit).toBeUndefined();
    expect(title.props.allowFontScaling).not.toBe(false);
  });

  // J6 — the counter is capped too, and it stays in the header at every scale.
  it('caps the step counter and keeps it in the header', () => {
    const counter = renderTitle().getByText(/3 of 3/);
    expect(counter.props.maxFontSizeMultiplier).toBe(DAILY_LOOP_HEADER_CHROME_MAX_FONT_SCALE);
  });

  // J9 — the hit-steal fix. MEASURED as an inoperable exit at AX5, so this is a crisis-
  // adjacent assertion, not a tidiness one.
  it('declines touches so it cannot hit-steal the ✕', () => {
    expect(renderTitle().getByTestId('daily-loop-header-title').props.pointerEvents).toBe('none');
  });

  it('suppresses progress chrome on the coda', () => {
    expect(renderTitle(false).queryByText(/of 3/)).toBeNull();
  });
});

// J10 — a source-shape assertion, because `headerTitleContainerStyle` is a navigator option
// and not a rendered prop we can read. Comments are stripped first (DEBUG-390): this repo
// deliberately names anti-patterns in prose, and a bare match would hit the docblock that
// warns against `width`.
describe('DailyLoopNavigator header options (source shape)', () => {
  const NAV = path.join(__dirname, '..', 'DailyLoopNavigator.tsx');
  const stripped = fs
    .readFileSync(NAV, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('proves the matcher still fires against the slice itself', () => {
    // Without this, comment-stripping plus a narrow regex can silently match nothing at all
    // and every negative below goes vacuous while staying green.
    expect(stripped).toMatch(/headerTitleContainerStyle\s*:/);
  });

  it('reserves the title slot with maxWidth and never width', () => {
    const option = stripped.match(/headerTitleContainerStyle\s*:\s*\{[^}]*\}/)?.[0] ?? '';
    expect(option).toMatch(/maxWidth\s*:/);
    expect(option).not.toMatch(/(^|[^x])width\s*:/);
    expect(option).not.toMatch(/flexBasis\s*:/);
  });

  it('computes the band from the font scale rather than a literal', () => {
    expect(stripped).toMatch(/height\s*:\s*dailyLoopHeaderStyleHeight\s*\(/);
  });

  // The knob sets `headerStyle.height` and NOTHING else. It excludes the device top inset,
  // so a second consumer treating it as a total band is the unit error this whole module
  // was renamed to prevent.
  it('uses the band height for headerStyle.height and nowhere else', () => {
    expect(stripped.match(/dailyLoopHeaderStyleHeight\s*\(/g)).toHaveLength(1);
  });
});

// The `pointerEvents="none"` fix is only safe while this container holds nothing tappable —
// a future Pressable inside it would be silently dead rather than obviously broken.
describe('DailyLoopHeaderTitle (source shape)', () => {
  const TITLE = path.join(__dirname, '..', 'components', 'DailyLoopHeaderTitle.tsx');
  const stripped = fs
    .readFileSync(TITLE, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('proves the matcher still fires against the slice itself', () => {
    expect(stripped).toMatch(/pointerEvents\s*=\s*"none"/);
  });

  it('holds no interactive child', () => {
    expect(stripped).not.toMatch(/<(Pressable|TouchableOpacity|TouchableHighlight|Button)\b/);
    expect(stripped).not.toMatch(/onPress\s*=/);
  });
});
