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
  // DEBUG-637: three of the six measured violations were captured at AX2. `axLayout` is a
  // binary threshold, so AX1/AX2/AX3/AX5 select identical styles and AX2 is covered by
  // construction — but naming it makes the suite say which case it is standing in for.
  ax2: 2.143,
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

/**
 * DEBUG-637 — no interactive node on this screen may satisfy
 * `intersectsCrisisButtonExclusion` at any scroll offset or text size.
 *
 * THE DEFECT
 * ==========
 * The screen imports `CRISIS_BUTTON_EXCLUSION_RECT` and violates its own predicate.
 * Measured on a clean Release gate build `40dc2905` / iOS 18.6 via `maestro hierarchy`:
 * `practice-library-item-reserve-clause` at DEFAULT size on both viewports, and
 * `practice-library-principle-link` / `practice-library-featured-start` at AX2 and at
 * intermediate AX5 offsets. The FAB sits at `zIndex: 9999`, so an overlap is a
 * wrong-destination tap into `CrisisResources` — a crisis FALSE POSITIVE. The zero-FN
 * contract, 988 reachability and the <3-tap budget are untouched.
 *
 * WHY THE INSET IS THE FULL `rect.left` AND NOT `rect.left − padding`
 * ==================================================================
 * The ticket's AC2 prescribed `CRISIS_BUTTON_EXCLUSION_RECT.left` minus the content
 * padding, describing 48/56 as "the content paddingHorizontal". They are not: the real
 * paddings are `spacing[24]` = 24 and `spacing[16]` = 16, and 48/56 are the RESULTS of
 * 72−24 and 72−16. Read literally the AC yields 72−48 = 24, which still intersects.
 *
 * Rather than repair that arithmetic, this uses the branch-free form the four settled
 * sibling hosts already use (`BodyScanScreen.tsx:276`, `GuidedBodyScanScreen.tsx:280`,
 * `PracticeTimerScreen.tsx:314`, `ReflectionTimerScreen.tsx:241`): the full `rect.left`,
 * unmodified. It needs no AX branch, it covers the featured-card controls — whose own
 * exact derivation runs through a FRACTIONAL `borderWidth: 1.5` and could not be proven
 * exact — and it leaves real slack instead of the exact form's zero, where the predicate
 * is half-open and any unaccounted ancestor term silently reopens the defect.
 *
 * WHY THE SWEEP IS ALL-Y RATHER THAN 0 → maxScroll
 * ================================================
 * Jest has no layout engine, so `maxScroll` has no derivable value. Sweeping y over
 * [−H, 2H] is a strict SUPERSET of the real continuum, which is what makes the missing
 * layout engine harmless — the same reasoning the four sibling suites record.
 */
describe('DEBUG-637 — no interactive node intersects the crisis FAB column', () => {
  /** Every interactive testID inside the scroll view, read off the render. */
  const interactiveIds = (result: { getAllByTestId: (m: RegExp) => { props: Record<string, unknown> }[] }) =>
    result.getAllByTestId(/^practice-library-(item-|principle-link$|featured-start$)/);

  it.each([
    ['default', IOS_FONT_SCALES.default],
    ['ax2', IOS_FONT_SCALES.ax2],
    ['ax5', IOS_FONT_SCALES.ax5],
  ])('every interactive node carries the derived inset at %s', async (_label, fontScale) => {
    setFontScale(fontScale);
    const result = await renderLoaded();

    const nodes = interactiveIds(result);
    // Non-vacuity: a sweep over an empty set asserts nothing.
    expect(nodes.length).toBeGreaterThan(2);

    for (const node of nodes) {
      const s = flat(node as never);
      expect(s.marginRight).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
      // The inset must move the FRAME. Padding stays inside the border box, so the hit
      // rect — and the maestro-hierarchy bounds — would not move at all.
      expect(s.paddingRight).toBeUndefined();
      // marginEnd/marginStart outrank marginRight and FLIP in RTL, while the FAB is
      // hard-coded `right: 0`. marginHorizontal would be silently overridden either way.
      expect(s.marginEnd).toBeUndefined();
      expect(s.marginStart).toBeUndefined();
      expect(s.marginHorizontal).toBeUndefined();
    }
  });

  it('the row divider stays full-bleed — the border moved to a wrapper, not the Pressable', async () => {
    const result = await renderLoaded();
    const row = result.getAllByTestId(/^practice-library-item-/)[0];
    const practiceId = (row.props as { testID: string }).testID.replace(
      'practice-library-item-',
      ''
    );

    // The Pressable no longer draws the divider...
    expect(flat(row as never).borderBottomWidth).toBeUndefined();
    // ...and the full-width wrapper that does carries no inset of its own, so the rule
    // still bleeds to the content column while the tap target stops short of the FAB.
    const wrapper = result.getByTestId(`practice-library-row-divider-${practiceId}`);
    expect(flat(wrapper as never).borderBottomWidth).toBe(1);
    expect(flat(wrapper as never).marginRight).toBeUndefined();
  });

  it('THE SWEEP: no interactive frame intersects at any y, viewport or text size', async () => {
    const offenders: string[] = [];

    for (const fontScale of [IOS_FONT_SCALES.default, IOS_FONT_SCALES.ax2, IOS_FONT_SCALES.ax5]) {
      setFontScale(fontScale);
      const result = await renderLoaded();
      const scroll = result.getByTestId('practice-library-scroll');
      // Read the padding BACK OFF THE RENDER. A literal here would certify the test's
      // own arithmetic rather than the screen's.
      const padH = (StyleSheet.flatten(
        (scroll.props as { contentContainerStyle?: unknown }).contentContainerStyle as never
      ) ?? {}) as Record<string, number>;
      const inherited = padH.paddingHorizontal ?? 0;

      for (const node of interactiveIds(result)) {
        const marginRight = (flat(node as never).marginRight as number) ?? 0;
        for (const { width, height } of VIEWPORTS) {
          for (const h of [52, 73, 76, 120, 200]) {
            for (let y = -h; y <= height; y += 17) {
              const frame = {
                x: inherited,
                y,
                width: width - inherited * 2 - marginRight,
                height: h,
              };
              if (intersectsCrisisButtonExclusion(frame, { width, height })) {
                offenders.push(`${fontScale}@${width}x${height} h=${h} y=${y}`);
              }
            }
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('MODEL FIDELITY: with the inset removed the sweep reproduces the measured device frames', () => {
    // The fix lives entirely in x, so a sweep whose x-model is wrong would go green for
    // the wrong reason. These are the DEBUG-633 captures; each MUST intersect at
    // marginRight = 0, which proves the geometry model is the device's.
    const measured = [
      { label: '390x844 default row', frame: { x: 24, y: 663, width: 342, height: 52 }, screen: { width: 390, height: 844 } },
      { label: '390x844 AX2 principle-link', frame: { x: 25, y: 668, width: 339, height: 76 }, screen: { width: 390, height: 844 } },
      { label: '390x844 AX2 featured-start', frame: { x: 25, y: 768, width: 339, height: 73 }, screen: { width: 390, height: 844 } },
      { label: '402x874 default row', frame: { x: 24, y: 678, width: 354, height: 52 }, screen: { width: 402, height: 874 } },
      { label: '402x874 AX2 featured-start', frame: { x: 25, y: 722, width: 351, height: 73 }, screen: { width: 402, height: 874 } },
    ];

    for (const { label, frame, screen } of measured) {
      expect({ label, intersects: intersectsCrisisButtonExclusion(frame, screen) }).toEqual({
        label,
        intersects: true,
      });
      // ...and the same frame, inset by the fix, clears.
      const fixed = { ...frame, width: frame.width - CRISIS_BUTTON_EXCLUSION_RECT.left };
      expect({ label, intersects: intersectsCrisisButtonExclusion(fixed, screen) }).toEqual({
        label,
        intersects: false,
      });
    }
  });

  it('DERIVED CONSTANT: no magic inset literal survives in the source', () => {
    const source = strippedSource();
    expect(source).toMatch(/marginRight:\s*CRISIS_BUTTON_EXCLUSION_RECT\.left/);
    // `\b72\b` alone is VACUOUS here — 72 never appears in this file, before or after.
    // 48 and 56 are the literals an implementer is actually tempted to write, and both
    // are real `spacing` keys, so `spacing[48]` would pass a 72-only matcher.
    expect(source).not.toMatch(/\b(48|56|72)\b/);
  });
});
