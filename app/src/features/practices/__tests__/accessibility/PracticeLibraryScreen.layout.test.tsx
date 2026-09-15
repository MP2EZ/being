/**
 * DEBUG-620 — the Practices library header clears the status bar, reflows at
 * accessibility sizes, and its list still ends clear of the crisis FAB.
 *
 * The screen rendered a plain <View> root on a root-stack card route with
 * `headerShown: false`, so nothing supplied the top inset: "‹ Back" overlapped the
 * clock, and the title sat in the Dynamic Island row (TestFlight JAVASCRIPT-REACT-A).
 * The header was one `space-between` row, which collided at AX5 ("‹ BackPractice").
 *
 * Crisis ruling (batch panel): adding the top inset moves the whole list down
 * 47–62pt, which would rest the last row's right column in the FAB's touch band. The
 * trailing spacer is therefore sized from CRISIS_BUTTON_EXCLUSION_RECT.top, and no
 * bottom edge is added by any route — the FAB is positioned against the window, so
 * a bottom inset would only push content further into it.
 *
 * Jest has no layout engine and the safe-area mock pins every inset to zero, so this
 * pins VALUES (edges, spacer height, paddings, stacking) and the geometry they
 * imply. The simulator captures are DEBUG-626.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

const mockLoadModuleContent = jest.fn();
jest.mock('@/core/services/moduleContent', () => ({
  loadModuleContent: (...args: unknown[]) => mockLoadModuleContent(...args),
}));

import PracticeLibraryScreen, {
  PRACTICE_LIBRARY_AX_LAYOUT_FONT_SCALE,
  libraryHeaderStacks,
} from '../../screens/PracticeLibraryScreen';
import { STANDALONE_PRACTICES } from '@/features/practices/catalog/standalonePractices';
import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';
import { spacing } from '@/core/theme';

/** RN iOS `UIContentSizeCategory` multipliers. */
const IOS_FONT_SCALES = {
  default: 1,
  xxxLarge: 1.353,
  ax1: 1.786,
  ax3: 2.643,
  ax5: 3.571,
};

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 402, height: 874 },
];

const setFontScale = (fontScale: number) =>
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({
    width: 390,
    height: 844,
    scale: 3,
    fontScale,
  });

const flat = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

const SCREEN_SOURCE = path.resolve(__dirname, '../../screens/PracticeLibraryScreen.tsx');
const strippedSource = () =>
  fs
    .readFileSync(SCREEN_SOURCE, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

const renderLoaded = async () => {
  const result = render(
    <PracticeLibraryScreen onBack={jest.fn()} onOpenPractice={jest.fn()} onOpenModule={jest.fn()} />
  );
  await waitFor(() => expect(result.getByTestId('practice-library-featured')).toBeTruthy());
  return result;
};

beforeEach(() => {
  setFontScale(IOS_FONT_SCALES.default);
  mockLoadModuleContent.mockReset();
  mockLoadModuleContent.mockImplementation(async (moduleId: string) => ({
    practices: STANDALONE_PRACTICES.filter((p) => p.moduleId === moduleId).map((p) => ({
      id: p.practiceId,
      title: `Practice ${p.practiceId}`,
      duration: 300,
    })),
  }));
});

afterEach(() => setFontScale(IOS_FONT_SCALES.default));

describe('top inset — only the top edge', () => {
  it('the outermost node is a SafeAreaView claiming exactly the top edge', async () => {
    const result = await renderLoaded();
    const root = result.toJSON() as { props: { testID?: string; edges?: unknown } };

    expect(root.props.testID).toBe('practice-library-screen');
    expect(root.props.edges).toEqual(['top']);
  });

  it('adds no bottom inset by any other route', () => {
    const source = strippedSource();

    expect(source).toContain('SafeAreaView');
    expect(source).not.toMatch(/insets\.bottom/);
    expect(source).not.toMatch(/contentInsetAdjustmentBehavior/);
    expect(source).not.toMatch(/useSafeAreaInsets/);
  });
});

describe('the list ends clear of the crisis FAB', () => {
  it('the trailing spacer is exactly the exclusion rect top, from the shared constant', async () => {
    const result = await renderLoaded();
    const spacer = result.getByTestId('practice-library-fab-clearance');

    expect(flat(spacer).height).toBe(CRISIS_BUTTON_EXCLUSION_RECT.top);

    const source = strippedSource();
    expect(source).toMatch(/from '@\/features\/crisis\/constants\/crisisButtonGeometry'/);
    expect(source).toMatch(/height:\s*CRISIS_BUTTON_EXCLUSION_RECT\.top/);
    expect(source).not.toMatch(/\b176\b/);
  });

  /**
   * With no bottom edge, the ScrollView reaches the window bottom, so at maximum scroll
   * the last row's bottom rests at most `H − spacer` (the section's own margin only
   * lifts it higher). Checked at the full row width, for a default and an AX5 row height.
   */
  it('the last row at its lowest resting position never intersects the exclusion rect', async () => {
    const result = await renderLoaded();
    const spacerHeight = flat(result.getByTestId('practice-library-fab-clearance')).height as number;

    for (const { width, height } of VIEWPORTS) {
      for (const rowHeight of [52, 200]) {
        const row = { x: spacing[16], y: height - spacerHeight - rowHeight, width: width - 2 * spacing[16], height: rowHeight };
        expect({ width, height, rowHeight, intersects: intersectsCrisisButtonExclusion(row, { width, height }) }).toEqual({
          width,
          height,
          rowHeight,
          intersects: false,
        });
      }
    }
  });

  it('control: the pre-fix spacing[48] spacer does rest the last row in the band', () => {
    const { width, height } = VIEWPORTS[1];
    const row = { x: spacing[24], y: height - spacing[48] - 52, width: width - 2 * spacing[24], height: 52 };

    expect(intersectsCrisisButtonExclusion(row, { width, height })).toBe(true);
  });
});

describe('header reflow at accessibility sizes', () => {
  it('stacks from AX1 up, never at standard slider sizes', () => {
    expect(PRACTICE_LIBRARY_AX_LAYOUT_FONT_SCALE).toBeGreaterThan(IOS_FONT_SCALES.xxxLarge);
    expect(PRACTICE_LIBRARY_AX_LAYOUT_FONT_SCALE).toBeLessThan(IOS_FONT_SCALES.ax1);
    expect(libraryHeaderStacks(IOS_FONT_SCALES.default)).toBe(false);
    expect(libraryHeaderStacks(IOS_FONT_SCALES.xxxLarge)).toBe(false);
    expect(libraryHeaderStacks(IOS_FONT_SCALES.ax1)).toBe(true);
    expect(libraryHeaderStacks(IOS_FONT_SCALES.ax3)).toBe(true);
    expect(libraryHeaderStacks(IOS_FONT_SCALES.ax5)).toBe(true);
    expect(libraryHeaderStacks(Number.NaN)).toBe(false);
  });

  it('default size: one centred row with the balancing spacer', async () => {
    const result = await renderLoaded();

    expect(flat(result.getByTestId('practice-library-header')).flexDirection).toBe('row');
    expect(result.getByTestId('practice-library-header-spacer')).toBeTruthy();
  });

  it.each([
    ['AX3', IOS_FONT_SCALES.ax3],
    ['AX5', IOS_FONT_SCALES.ax5],
  ])('%s: Back sits above a wrapping title, and nothing truncates or caps it', async (_label, scale) => {
    setFontScale(scale);
    const result = await renderLoaded();

    expect(flat(result.getByTestId('practice-library-header')).flexDirection).toBe('column');
    expect(result.queryByTestId('practice-library-header-spacer')).toBeNull();

    const title = result.getByTestId('practice-library-title');
    expect(title.props.numberOfLines).toBeUndefined();
    expect(title.props.adjustsFontSizeToFit).toBeUndefined();
    expect(title.props.maxFontSizeMultiplier).toBeUndefined();

    const back = flat(result.getByTestId('practice-library-back'));
    expect(back.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);
    expect(back.justifyContent).toBe('center');
  });
});

describe('featured card gives long words room at accessibility sizes', () => {
  it('default size keeps the original paddings and letter spacing', async () => {
    const result = await renderLoaded();

    expect(flat({ props: { style: result.getByTestId('practice-library-scroll').props.contentContainerStyle } }).paddingHorizontal).toBe(spacing[24]);
    const card = flat(result.getByTestId('practice-library-featured'));
    expect(card.paddingHorizontal ?? card.padding).toBe(spacing[24]);
    expect(flat(result.getByTestId('practice-library-featured-eyebrow')).letterSpacing).toBe(1);
  });

  it('AX5 tightens horizontal padding and drops the eyebrow letter spacing', async () => {
    setFontScale(IOS_FONT_SCALES.ax5);
    const result = await renderLoaded();

    expect(flat({ props: { style: result.getByTestId('practice-library-scroll').props.contentContainerStyle } }).paddingHorizontal).toBe(spacing[16]);
    const card = flat(result.getByTestId('practice-library-featured'));
    expect(card.paddingHorizontal).toBe(spacing[8]);
    expect(card.paddingVertical ?? card.padding).toBe(spacing[24]);
    expect(flat(result.getByTestId('practice-library-featured-eyebrow')).letterSpacing).toBe(0);
  });
});

describe('matcher integrity', () => {
  it('the comment stripper removes a warning comment and keeps code', () => {
    const sample = "// never use insets.bottom here\nconst a = 1;\n/* contentInsetAdjustmentBehavior */\n";
    const stripped = sample
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(stripped).not.toMatch(/insets\.bottom|contentInsetAdjustmentBehavior/);
    expect(stripped).toContain('const a = 1');
  });
});
