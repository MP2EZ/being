/**
 * MAINT-564 — the four cardinal-virtue chips lay out on a DECIDED grid.
 *
 * AC1 asked for "a 2x2 grid or full-width rows, decided rather than inherited from
 * `flexWrap`". The shipped answer is BOTH, split by type size, because each is wrong in
 * the other's range: a fixed 2x2 breaks at accessibility sizes (a ~171pt half-column
 * cannot hold "Temperance" on one line and RN falls back to per-glyph wrapping — the
 * exact trap AC3 names), while full-width rows at DEFAULT type read MORE like a
 * checklist, which is what AC4 exists to prevent.
 *
 * WHAT THIS FILE CAN AND CANNOT PROVE. No layout engine runs under jest: there are no
 * measured widths here and no evidence about wrapping. What is provable is the DECISION —
 * that a width is declared at all, that the breakpoint sits where it was specified, and
 * that the 44pt floor and AC4's bright lines survive both branches. AC3's AX5 half is
 * hand-verified on device and reported as hand-verified; no flow in the safety suite
 * reaches this beat (daily-loop-ax5-entry stops at SphereSovereignty).
 */
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { render } from '@testing-library/react-native';
import DailyLoopStepScreen, {
  VIRTUE_CHIP_SINGLE_COLUMN_FONT_SCALE,
  virtueChipsAreSingleColumn,
} from '../screens/DailyLoopStepScreen';
import { VIRTUE_REFERENCE } from '../config/tenseMode';
import type { DailyLoopMode } from '@/features/practices/types/flows';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import type { ModuleId, ModuleProgress } from '@/features/learn/types/education';

/**
 * The real iOS multipliers, not round numbers. A breakpoint test written against 1.0 and
 * 2.0 would pass for any threshold in between and so pins nothing a reader cares about.
 */
const IOS_FONT_SCALES = {
  default: 1.0,
  large: 1.176,
  xxxLarge: 1.353,
  AX1: 1.786,
  AX5: 3.571,
} as const;

const MODULE_IDS: ModuleId[] = [
  'aware-presence',
  'radical-acceptance',
  'sphere-sovereignty',
  'virtuous-response',
  'interconnected-living',
];

const clearStages = () => {
  const blank: ModuleProgress = {
    status: 'not_started',
    lastAccessedAt: new Date(),
    completedSections: [],
    developmentalStage: null,
    practiceCount: 0,
    reflectionResponses: [],
    optOutFlags: [],
  };
  useEducationStore.setState({
    modules: Object.fromEntries(MODULE_IDS.map((id) => [id, blank])) as Record<
      ModuleId,
      ModuleProgress
    >,
  });
};

/** Same convention as DailyLoopDepthSelectScreen.test.tsx — the sibling screen. */
const setFontScale = (fontScale: number) =>
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({
    width: 390, height: 844, scale: 3, fontScale,
  });

beforeEach(() => {
  clearStages();
  setFontScale(IOS_FONT_SCALES.default);
});
afterEach(() => setFontScale(IOS_FONT_SCALES.default));

/** VirtuousResponse is the only beat carrying virtueChips, in all three tenses. */
const renderVirtueBeat = (mode: DailyLoopMode = 'flat') =>
  render(
    <DailyLoopStepScreen stepKey="VirtuousResponse" mode={mode} depth="deep" onSave={jest.fn()} />,
  );

const chipStyle = (screen: ReturnType<typeof render>, key: string) => {
  const chip = screen.getByTestId(`virtue-chip-${key}`);
  return Object.assign({}, ...[chip.props.style].flat(Infinity).filter(Boolean));
};

describe('MAINT-564 AC1 — the breakpoint is where it was specified', () => {
  it('sits between xxxLarge and AX1, so every non-accessibility size keeps the grid', () => {
    // The load-bearing claim. If the constant drifted to 1.2 the two-up cases below
    // would still pass at default, and the grid would have silently vanished at Large.
    expect(VIRTUE_CHIP_SINGLE_COLUMN_FONT_SCALE).toBeGreaterThan(IOS_FONT_SCALES.xxxLarge);
    expect(VIRTUE_CHIP_SINGLE_COLUMN_FONT_SCALE).toBeLessThanOrEqual(IOS_FONT_SCALES.AX1);
  });

  it.each([
    ['default', IOS_FONT_SCALES.default, false],
    ['large', IOS_FONT_SCALES.large, false],
    ['xxxLarge', IOS_FONT_SCALES.xxxLarge, false],
    ['AX1', IOS_FONT_SCALES.AX1, true],
    ['AX5', IOS_FONT_SCALES.AX5, true],
  ])('%s (%f) → single column: %s', (_label, scale, expected) => {
    expect(virtueChipsAreSingleColumn(scale)).toBe(expected);
  });

  it('is a floor, not a band — the column never reverts above the threshold', () => {
    expect(virtueChipsAreSingleColumn(VIRTUE_CHIP_SINGLE_COLUMN_FONT_SCALE)).toBe(true);
    expect(virtueChipsAreSingleColumn(Number.MAX_SAFE_INTEGER)).toBe(true);
  });
});

describe('MAINT-564 AC1 — a width is DECLARED, not inherited from flexWrap', () => {
  it('gives every chip a two-up basis at default type', () => {
    setFontScale(IOS_FONT_SCALES.default);
    const screen = renderVirtueBeat();

    for (const v of VIRTUE_REFERENCE) {
      const style = chipStyle(screen, v.key);
      // Below half, so a third chip cannot share the row; flexGrow then spends the
      // remainder. Both halves matter: basis alone leaves a dead strip, grow alone
      // would let three chips share a row.
      expect(style.flexBasis).toBe('45%');
      expect(style.flexGrow).toBe(1);
    }
  });

  it('gives every chip a full-width basis at AX5', () => {
    setFontScale(IOS_FONT_SCALES.AX5);
    const screen = renderVirtueBeat();

    for (const v of VIRTUE_REFERENCE) {
      expect(chipStyle(screen, v.key).flexBasis).toBe('100%');
    }
  });

  it('renders all four virtues in both branches — the layout never drops one', () => {
    for (const scale of [IOS_FONT_SCALES.default, IOS_FONT_SCALES.AX5]) {
      setFontScale(scale);
      const screen = renderVirtueBeat();
      expect(VIRTUE_REFERENCE).toHaveLength(4);
      for (const v of VIRTUE_REFERENCE) {
        expect(screen.getByTestId(`virtue-chip-${v.key}`)).toBeTruthy();
      }
      screen.unmount();
    }
  });
});

describe('MAINT-564 AC3 — the 44pt target survives the reflow', () => {
  it.each([
    ['default', IOS_FONT_SCALES.default],
    ['AX5', IOS_FONT_SCALES.AX5],
  ])('keeps minHeight 44 as a FLOOR at %s, with no fixed height', (_label, scale) => {
    setFontScale(scale);
    const screen = renderVirtueBeat();

    for (const v of VIRTUE_REFERENCE) {
      const style = chipStyle(screen, v.key);
      expect(style.minHeight).toBe(44);
      // A fixed height would clip a two-line label at large type instead of growing the
      // row — the touch target must only ever grow.
      expect(style.height).toBeUndefined();
    }
  });
});

describe('MAINT-564 AC4 — the grid does not convert a lens into a checklist', () => {
  it('keeps the "Choose any" prompt visible above the grid in every tense', () => {
    // The prompt, not the layout, carries the optionality.
    for (const mode of ['flat', 'morning', 'evening'] as DailyLoopMode[]) {
      const screen = renderVirtueBeat(mode);
      expect(screen.getByText(/Choose any/i)).toBeTruthy();
      screen.unmount();
    }
  });

  it('shows no count, tally, or progress over the four slots', () => {
    const screen = renderVirtueBeat();
    // "N of 4" in any spacing, and the checkmark glyphs a checklist would reach for.
    expect(screen.queryByText(/\b\d\s*(of|\/)\s*4\b/)).toBeNull();
    expect(screen.queryByText(/[✓✔☑]/)).toBeNull();
  });

  it('keeps border+fill as the selection language — accessibility semantics unchanged', () => {
    const screen = renderVirtueBeat();
    const chip = screen.getByTestId(`virtue-chip-${VIRTUE_REFERENCE[0].key}`);
    expect(chip.props.accessibilityState).toEqual({ selected: false });
    expect(chip.props.accessibilityHint).toMatch(/Optional/i);
  });
});
