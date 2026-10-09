/**
 * DEBUG-619 — the practice header keeps its back glyph, title and progress count
 * readable at accessibility text sizes.
 *
 * `PracticeScreenHeader` put scaling text in fixed `width: 44, height: 44` boxes. From
 * AX3 the "←" glyph (headline4, 24pt × 2.643 ≈ 63pt) clipped to a sliver, Sorting's
 * counter read "1/", and the one-line title truncated to "3-Mi…". These modals are
 * `gestureEnabled: false`, so the glyph is the only visible way out.
 *
 * The fix, per founder defaults: min sizes instead of fixed sizes, a 2.0× cap on the
 * glyph and counter only (WCAG 1.4.4's 200% is still met), and an uncapped title that
 * takes its own line from font scale 1.6. Five consumers render this header:
 * PracticeTimer, BodyScan and ReflectionTimer via PracticeScreenLayout, plus
 * SortingPractice and GuidedBodyScan.
 *
 * Jest has no text layout, so this pins the declared styles and props. The captures
 * are DEBUG-626.
 */

import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import PracticeScreenHeader from '@/features/learn/practices/shared/PracticeScreenHeader';
import {
  PRACTICE_HEADER_CONTROL_MAX_FONT_SCALE,
  PRACTICE_HEADER_STACKED_FONT_SCALE,
  practiceHeaderStacksTitle,
} from '@/features/learn/practices/shared/practiceScreenHeaderLayout';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';
import { typography } from '@/core/theme';

const IOS_FONT_SCALES = {
  default: 1,
  large: 1.118,
  xLarge: 1.235,
  xxxLarge: 1.353,
  ax1: 1.786,
  ax2: 2.143,
  ax3: 2.643,
  ax5: 3.571,
};

const ID = 'practice-screen-header';

const setFontScale = (fontScale: number) =>
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({
    width: 390,
    height: 844,
    scale: 3,
    fontScale,
  });

const flat = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

const renderHeader = (props: { progress?: { current: number; total: number } } = {}) => {
  const onBack = jest.fn();
  const result = render(
    <PracticeScreenHeader title="Daily Social Impact Reflection" onBack={onBack} {...props} />
  );
  return { ...result, onBack };
};

beforeEach(() => setFontScale(IOS_FONT_SCALES.default));
afterEach(() => setFontScale(IOS_FONT_SCALES.default));

describe('layout constants', () => {
  it('stacks the title from AX1 up, never at standard slider sizes', () => {
    for (const scale of [IOS_FONT_SCALES.default, IOS_FONT_SCALES.large, IOS_FONT_SCALES.xLarge, IOS_FONT_SCALES.xxxLarge]) {
      expect({ scale, stacks: practiceHeaderStacksTitle(scale) }).toEqual({ scale, stacks: false });
    }
    for (const scale of [IOS_FONT_SCALES.ax1, IOS_FONT_SCALES.ax2, IOS_FONT_SCALES.ax3, IOS_FONT_SCALES.ax5]) {
      expect({ scale, stacks: practiceHeaderStacksTitle(scale) }).toEqual({ scale, stacks: true });
    }
    expect(practiceHeaderStacksTitle(Number.NaN)).toBe(false);
    expect(practiceHeaderStacksTitle(-1)).toBe(false);
    expect(PRACTICE_HEADER_STACKED_FONT_SCALE).toBeGreaterThan(IOS_FONT_SCALES.xxxLarge);
    expect(PRACTICE_HEADER_STACKED_FONT_SCALE).toBeLessThan(IOS_FONT_SCALES.ax1);
  });

  it('caps the glyph and counter above 1 and at no less than WCAG 1.4.4\'s 200%', () => {
    // iOS ignores a multiplier below 1, and exactly 1 is allowFontScaling={false}.
    expect(PRACTICE_HEADER_CONTROL_MAX_FONT_SCALE).toBeGreaterThan(1);
    expect(PRACTICE_HEADER_CONTROL_MAX_FONT_SCALE).toBeGreaterThanOrEqual(2);
  });

  it('control: the old fixed box really does clip the glyph at AX3', () => {
    expect(typography.headline4.size * IOS_FONT_SCALES.ax3).toBeGreaterThan(TOUCH_TARGETS.minimum);
  });
});

describe('default size', () => {
  it('back button and right slot use minimum sizes, never fixed sizes', () => {
    const { getByTestId } = renderHeader({ progress: { current: 1, total: 12 } });
    const back = flat(getByTestId(`${ID}-back-button`));
    const right = flat(getByTestId(`${ID}-right`));

    expect(back.width).toBeUndefined();
    expect(back.height).toBeUndefined();
    expect(back.minWidth).toBe(TOUCH_TARGETS.minimum);
    expect(back.minHeight).toBe(TOUCH_TARGETS.minimum);
    expect(right.width).toBeUndefined();
    expect(right.height).toBeUndefined();
    expect(right.minWidth).toBe(TOUCH_TARGETS.minimum);
  });

  it('caps the glyph and the counter, but never the title', () => {
    const { getByTestId, getByText } = renderHeader({ progress: { current: 1, total: 12 } });

    expect(getByText('←').props.maxFontSizeMultiplier).toBe(PRACTICE_HEADER_CONTROL_MAX_FONT_SCALE);
    expect(getByTestId(`${ID}-progress`).props.maxFontSizeMultiplier).toBe(PRACTICE_HEADER_CONTROL_MAX_FONT_SCALE);

    const title = getByTestId(`${ID}-title`);
    expect(title.props.maxFontSizeMultiplier).toBeUndefined();
    expect(title.props.allowFontScaling).not.toBe(false);
    expect(title.props.adjustsFontSizeToFit).toBeUndefined();
    expect(title.props.numberOfLines).toBe(1);
  });

  it('keeps the empty right slot so the one-line title stays centred', () => {
    const { getByTestId } = renderHeader();
    expect(getByTestId(`${ID}-right`)).toBeTruthy();
  });
});

describe.each([
  ['AX3', IOS_FONT_SCALES.ax3],
  ['AX5', IOS_FONT_SCALES.ax5],
])('%s', (_label, scale) => {
  beforeEach(() => setFontScale(scale));

  it('the title takes its own full-width line and wraps instead of truncating', () => {
    const { getByTestId } = renderHeader();
    const title = getByTestId(`${ID}-title`);

    expect(title.props.numberOfLines).toBeUndefined();
    expect(title.props.maxFontSizeMultiplier).toBeUndefined();
    expect(flat(title).flexBasis).toBe('100%');
    expect(flat(getByTestId(ID)).flexWrap).toBe('wrap');
  });

  it('drops the empty right slot, which would otherwise become a blank row', () => {
    const { queryByTestId } = renderHeader();
    expect(queryByTestId(`${ID}-right`)).toBeNull();
  });

  it('keeps the progress counter, pushed to the row end', () => {
    const { getByTestId } = renderHeader({ progress: { current: 12, total: 12 } });

    expect(getByTestId(`${ID}-progress`)).toBeTruthy();
    expect(flat(getByTestId(`${ID}-right`)).marginLeft).toBe('auto');
  });

  it('back still works and keeps its label and hint', () => {
    const { getByTestId, onBack } = renderHeader();
    const back = getByTestId(`${ID}-back-button`);

    expect(back.props.accessibilityLabel).toBe('Go back');
    expect(back.props.accessibilityHint).toBe('Return to previous screen');
    fireEvent.press(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('screen-reader wiring is unchanged', () => {
  it('announces the counter as "N of M" and back works at default size', () => {
    const { getByTestId, onBack } = renderHeader({ progress: { current: 1, total: 12 } });

    expect(getByTestId(`${ID}-progress`).props.accessibilityLabel).toBe('1 of 12');
    fireEvent.press(getByTestId(`${ID}-back-button`));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
