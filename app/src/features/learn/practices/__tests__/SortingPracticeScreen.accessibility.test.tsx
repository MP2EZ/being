/**
 * DEBUG-634 — SortingPracticeScreen's three controls clear the crisis FAB column.
 *
 * THE DEFECT CLASS
 * ================
 * `SortingPractice` is in `IMMERSIVE_ROUTES` (`RootCrisisButton.tsx:183`), absent from
 * `SUPPRESSED_ROUTES`, and registered headerless-modal — so the FAB is mounted over it at
 * `zIndex: 9999` and an overlap is a wrong-destination tap into `CrisisResources`. A crisis
 * FALSE POSITIVE (the DEBUG-547 shape), not a false negative: 988 reachability, the <3-tap
 * budget and the zero-FN contract are untouched.
 *
 * All three controls are stretch children of a `paddingHorizontal: spacing[24]` column, so
 * each spans x = 24 .. W−24 against a region whose left edge is W−72. Both are offsets from
 * the SAME screen-right edge, so W cancels and the 48pt overlap is DERIVED — it holds at
 * every viewport and text size, with no device capture. On-device bounds are DEBUG-626's.
 *
 * WHY THIS HOST WAS CARRIED OUT OF DEBUG-631 RATHER THAN FOLDED IN
 * ===============================================================
 * It is the first SCALE-TRANSFORMED host. The card is an `Animated.View` interpolating
 * 0.9 → 1, and `intersectsCrisisButtonExclusion` consumes LAYOUT frames, so a clearance
 * derived from layout could in principle be wrong in either direction mid-animation.
 *
 * The ruling: it cannot. A uniform scale by s about ANY origin p maps an edge coordinate E
 * to `p + s(E − p)`. For the right edge R ≥ p and s ≤ 1 that gives `p + s(R − p) ≤ R`; run
 * on all four edges it makes the transformed frame a strict SUBSET of the layout frame, and
 * every term in the predicate (`controlRight > regionLeft`, `control.y < regionBottom`,
 * `controlBottom > regionTop`) is monotone in exactly the direction that makes a subset
 * less likely to intersect. So s = 1 is the supremum and the transient state is strictly
 * SAFER than the resting one. Origin-independent, so it does not rest on RN's centre
 * default, and it composes through the ancestor placement.
 *
 * THE ONE THING THAT INVERTS IT is s > 1 — an overshoot or spring. Then layout frames stop
 * bounding the real hit area and the derivation silently under-clears. That is pinned
 * below; without it the ruling is prose with no detector, which is the DEBUG-586 shape.
 *
 * WHY THE SWEEP IS ALL-Y
 * ======================
 * The item's AC5 nominated max scroll as the worst case. It is not — it is the closest to
 * PASSING. With `paddingBottom: spacing[24]` and no SafeAreaView, a parked control's bottom
 * sits at H−24, so `overlapsY` needs `H−24−h < H−72`, i.e. h > 48 STRICTLY — and
 * `nextButton` declares `minHeight: spacing[48]` = exactly 48. A pin built on AC5's own
 * stated extremum would pass WITHOUT the fix. The real hazard is the wide RANGE of resting
 * positions: `scrollContent` has `flexGrow: 1` with no bottom spacer, so a short feedback
 * branch does not scroll at all and rests wherever the content ends. Hence [−H, 2H].
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@/features/learn/practices/shared/usePracticeCompletion', () => ({
  usePracticeCompletion: () => ({
    renderCompletion: () => null,
    markStarted: jest.fn(),
    markComplete: jest.fn(),
  }),
}));

import SortingPracticeScreen from '../SortingPracticeScreen';
import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';
import type { SortingScenario } from '@/features/learn/types/education';
import { expectExclusionCheckWired } from '../../../../../__tests__/helpers/crisisExclusionLayoutEvent';

const SCENARIOS: SortingScenario[] = [
  {
    id: 's1',
    text: 'The train is late and you will miss the start of the meeting.',
    correctAnswer: 'not-in-control',
    explanation: 'The timetable is not yours; your response to it is.',
  },
  {
    id: 's2',
    text: 'You have not prepared for the conversation you are about to have.',
    correctAnswer: 'in-control',
    explanation: 'Preparation is an action, and actions are yours.',
  },
];

const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 402, height: 874 },
];

const SOURCE = path.resolve(__dirname, '../SortingPracticeScreen.tsx');
const rawSource = () => fs.readFileSync(SOURCE, 'utf8');
const strippedSource = () =>
  rawSource()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

const flat = (node: { props: { style?: unknown } }) =>
  (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;

const renderScreen = () =>
  render(
    <SortingPracticeScreen
      moduleId={'stoic-foundations' as never}
      scenarios={SCENARIOS}
      onComplete={jest.fn()}
      onBack={jest.fn()}
    />
  );

/**
 * Slice one `key: { ... }` StyleSheet entry by BRACE BALANCE.
 *
 * Deliberately NOT DEBUG-628's `/\bfoo:\s*\{([^}]*)\}/`, and the reason is sharper on this
 * host than on DEBUG-631's. That form stops at the first closing brace, so any entry
 * containing a nested object slices short. Here the entries carrying nested objects are
 * `choiceButtonPressed` and `nextButtonPressed` (`transform: [{ scale: 0.98 }]`) — which
 * are exactly the entries carrying the NEGATIVE assertions. On DEBUG-631's host the
 * truncation hit a positive assertion and failed loudly; here it would make every negative
 * pass VACUOUSLY. The control below proves the naive form truncates on this file.
 */
function sliceStyleEntry(src: string, key: string): string {
  const re = new RegExp(`\\b${key}:\\s*\\{`);
  const m = re.exec(src);
  if (!m) return '';
  const open = src.indexOf('{', m.index);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(m.index, i + 1);
    }
  }
  return '';
}

const naiveSlice = (src: string, key: string) =>
  (new RegExp(`\\b${key}:\\s*\\{([^}]*)\\}`).exec(src) ?? ['', ''])[0];

// ---------------------------------------------------------------------------
// AC1 — the premise, re-derived rather than inherited
// ---------------------------------------------------------------------------

describe('DEBUG-634 AC1 — the premise', () => {
  it('the route is immersive, not suppressed — so the FAB is mounted over this screen', () => {
    const rootCrisis = fs.readFileSync(
      path.resolve(__dirname, '../../../crisis/components/RootCrisisButton.tsx'),
      'utf8'
    );
    expect(rootCrisis).toMatch(/IMMERSIVE_ROUTES[\s\S]{0,400}?SortingPractice/);
    // Suppression must be EARNED by an affordance the screen owns and reaches without
    // scrolling. This screen owns none — it imports nothing from features/crisis/ but the
    // geometry constant — so it must never be added to SUPPRESSED_ROUTES.
    const suppressed = /SUPPRESSED_ROUTES[\s\S]{0,400}?\]/.exec(rootCrisis)?.[0] ?? '';
    expect(suppressed).not.toMatch(/SortingPractice/);
  });

  it('all three controls are stretch children of the padded column, so W cancels', () => {
    const src = strippedSource();
    expect(sliceStyleEntry(src, 'container')).toMatch(/paddingHorizontal:\s*spacing\[24\]/);
    // No flexDirection anywhere: `buttonRow` is a COLUMN despite its name, so both choice
    // buttons are full-width rather than side-by-side. The fix's cardinality depends on it.
    expect(src).not.toMatch(/flexDirection/);
  });
});

// ---------------------------------------------------------------------------
// AC3/AC6 — the clearance, on two base entries covering three controls
// ---------------------------------------------------------------------------

describe('DEBUG-634 AC3 — the clearance is on the controls, in x', () => {
  it('both choice buttons carry the derived inset', () => {
    const r = renderScreen();
    for (const id of [
      'sorting-practice-screen-in-control-button',
      'sorting-practice-screen-not-in-control-button',
    ]) {
      const s = flat(r.getByTestId(id) as never);
      expect(s.marginRight).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
      expect(s.paddingRight).toBeUndefined();
      expect(s.marginEnd).toBeUndefined();
      expect(s.marginHorizontal).toBeUndefined();
    }
  });

  it('the next button carries it too — reached by a DRIVEN state transition', () => {
    // The two branches are mutually exclusive, so one render cannot exercise both.
    const r = renderScreen();
    fireEvent.press(r.getByTestId('sorting-practice-screen-in-control-button'));

    const s = flat(r.getByTestId('sorting-practice-screen-next-button') as never);
    expect(s.marginRight).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
    expect(s.paddingRight).toBeUndefined();
    expect(s.marginEnd).toBeUndefined();
    expect(s.marginHorizontal).toBeUndefined();
  });

  it('CONTROL CENSUS: exactly these three interactive controls exist across both branches', () => {
    // The residual risk of a per-control fix is ENUMERATION, not geometry: a fourth
    // control added later escapes silently. This forces a ruling instead.
    const r = renderScreen();
    const before = r
      .getAllByRole('button')
      .map((n) => (n.props as { testID?: string }).testID)
      .filter(Boolean)
      .filter((id) => !String(id).includes('header'));
    expect(before.sort()).toEqual([
      'sorting-practice-screen-in-control-button',
      'sorting-practice-screen-not-in-control-button',
    ]);

    fireEvent.press(r.getByTestId('sorting-practice-screen-in-control-button'));
    const after = r
      .getAllByRole('button')
      .map((n) => (n.props as { testID?: string }).testID)
      .filter(Boolean)
      .filter((id) => !String(id).includes('header'));
    expect(after.sort()).toEqual(['sorting-practice-screen-next-button']);
  });

  it('AC6: the value is the imported constant, never a literal', () => {
    const src = strippedSource();
    expect(src).toMatch(/from '@\/features\/crisis\/constants\/crisisButtonGeometry'/);
    expect(src).toMatch(/marginRight:\s*CRISIS_BUTTON_EXCLUSION_RECT\.left/);
    expect(src).not.toMatch(/\b72\b|spacing\[72\]/);
    // The fix must not be smuggled in as a container inset or a route suppression.
    expect(src).not.toMatch(/paddingRight/);
    expect(src).not.toMatch(/SUPPRESSED_ROUTES/);
  });
});

// ---------------------------------------------------------------------------
// AC4 — array composition really does govern here
// ---------------------------------------------------------------------------

describe('DEBUG-634 AC4 — no variant entry may declare a margin', () => {
  it.each(['inControlButton', 'notInControlButton', 'choiceButtonPressed', 'nextButtonPressed'])(
    '%s declares no margin, so the base entry survives the array merge',
    (key) => {
      const slice = sliceStyleEntry(strippedSource(), key);
      expect(slice.length).toBeGreaterThan(10);
      expect(slice).not.toMatch(/margin/);
    }
  );

  it('the pressed variants are invisible to flatten, which is why the source slice is the lever', () => {
    // Pressable resolves with `pressed: false`, so a rendered-style assertion can never
    // see choiceButtonPressed / nextButtonPressed. Recorded so nobody "simplifies" the
    // source pins above into render assertions that cannot reach them.
    const r = renderScreen();
    const s = flat(r.getByTestId('sorting-practice-screen-in-control-button') as never);
    expect(s.opacity).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC2 — the transform ruling, given a detector
// ---------------------------------------------------------------------------

describe('DEBUG-634 AC2 — the scale transform stays <= 1', () => {
  it('the card interpolates to exactly 1 — an overshoot would invert the subset argument', () => {
    const src = strippedSource();
    const out = /outputRange:\s*\[([^\]]*)\]/.exec(src);
    expect(out).not.toBeNull();
    const bounds = (out as RegExpExecArray)[1].split(',').map((v) => parseFloat(v.trim()));
    expect(Math.max(...bounds)).toBeLessThanOrEqual(1);
  });

  it('no pressed variant scales above 1 either', () => {
    for (const key of ['choiceButtonPressed', 'nextButtonPressed']) {
      const slice = sliceStyleEntry(strippedSource(), key);
      for (const m of slice.matchAll(/scale:\s*([\d.]+)/g)) {
        expect(parseFloat(m[1])).toBeLessThanOrEqual(1);
      }
    }
  });

  it('DERIVED: a scaled frame is a strict subset, so s = 1 bounds every intermediate state', () => {
    // The ruling as arithmetic rather than prose. Frames are DERIVED, never measured.
    const { width: W, height: H } = VIEWPORTS[1];
    const layout = { x: 24, y: H - 200, width: W - 48 - CRISIS_BUTTON_EXCLUSION_RECT.left, height: 56 };
    expect(intersectsCrisisButtonExclusion(layout, { width: W, height: H })).toBe(false);

    for (const s of [0.9, 0.95, 0.99, 1]) {
      const cx = layout.x + layout.width / 2;
      const cy = layout.y + layout.height / 2;
      const scaled = {
        x: cx - (layout.width * s) / 2,
        y: cy - (layout.height * s) / 2,
        width: layout.width * s,
        height: layout.height * s,
      };
      expect({ s, intersects: intersectsCrisisButtonExclusion(scaled, { width: W, height: H }) }).toEqual({
        s,
        intersects: false,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// AC5 — the all-y sweep
// ---------------------------------------------------------------------------

describe('DEBUG-634 AC5 — no control intersects at any resting position', () => {
  it('THE SWEEP: every viewport, every height, every y in [-h, H]', () => {
    const offenders: string[] = [];
    const inset = CRISIS_BUTTON_EXCLUSION_RECT.left;
    const PAD = 24; // container paddingHorizontal, asserted from source in AC1

    for (const { width, height } of VIEWPORTS) {
      for (const h of [48, 56, 67, 120, 200]) {
        for (let y = -h; y <= height; y += 13) {
          const frame = { x: PAD, y, width: width - PAD * 2 - inset, height: h };
          if (intersectsCrisisButtonExclusion(frame, { width, height })) {
            offenders.push(`${width}x${height} h=${h} y=${y}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('LIVENESS: the same sweep WITHOUT the inset finds offenders, so it can still go red', () => {
    // Without this the sweep above is indistinguishable from one whose frames never reach
    // the band at all. Note it also falsifies AC5's own nominated extremum: at max scroll
    // a minHeight-48 control does NOT intersect, so a pin built there would have passed
    // unfixed. The mid-range y values are what actually carry this test.
    const offenders: string[] = [];
    const PAD = 24;
    for (const { width, height } of VIEWPORTS) {
      for (const h of [48, 56, 67, 120, 200]) {
        for (let y = -h; y <= height; y += 13) {
          const frame = { x: PAD, y, width: width - PAD * 2, height: h };
          if (intersectsCrisisButtonExclusion(frame, { width, height })) {
            offenders.push(`${width}x${height} h=${h} y=${y}`);
          }
        }
      }
    }
    expect(offenders.length).toBeGreaterThan(0);
  });

  it('records why max scroll is NOT the worst case (AC5 as filed nominated it)', () => {
    const { width, height } = VIEWPORTS[1];
    const PAD = 24;
    // minHeight: spacing[48] = 48, container paddingBottom: spacing[24] = 24.
    // overlapsY needs height - 24 - h < height - 72, i.e. h > 48 strictly.
    const parked = { x: PAD, y: height - 24 - 48, width: width - PAD * 2, height: 48 };
    expect(intersectsCrisisButtonExclusion(parked, { width, height })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC8 — matcher integrity (DEBUG-390)
// ---------------------------------------------------------------------------

describe('DEBUG-634 AC8 — the matchers can still fire', () => {
  it('the brace-balanced slicer reaches the entry\'s LAST pre-existing key', () => {
    const slice = sliceStyleEntry(strippedSource(), 'choiceButtonPressed');
    expect(slice).toMatch(/transform/);
    expect(slice).toMatch(/opacity/); // the last key, past the nested object
  });

  it('CONTROL: the naive DEBUG-628 slicer truncates on this file', () => {
    // Proven against the real source, not a synthetic string. If this ever stops failing,
    // the negatives in the AC4 block have quietly become vacuous.
    const naive = naiveSlice(strippedSource(), 'choiceButtonPressed');
    expect(naive).toMatch(/transform/);
    expect(naive).not.toMatch(/opacity/);
  });

  it('CONTROL: the slicer returns empty for a key that does not exist', () => {
    expect(sliceStyleEntry(strippedSource(), 'noSuchStyleEntryHere')).toBe('');
  });

  it('CONTROL: the comment stripper removes prose but keeps code', () => {
    const stripped = strippedSource();
    expect(rawSource()).toMatch(/^\s*\/\//m);
    expect(stripped).toMatch(/StyleSheet\.create/);
    expect(stripped.length).toBeGreaterThan(2000);
  });

  it('CONTROL: the margin negative fires when a margin is spliced into the slice', () => {
    const slice = sliceStyleEntry(strippedSource(), 'choiceButtonPressed');
    const mutated = slice.replace(/opacity/, 'marginRight: 0,\n    opacity');
    expect(mutated).toMatch(/margin/);
  });
});

describe('DEBUG-643 — the __DEV__ crisis-exclusion check is wired to the cleared control', () => {
  it('warns for both choice buttons', async () => {
    const r = renderScreen();
    for (const id of ['sorting-practice-screen-in-control-button', 'sorting-practice-screen-not-in-control-button']) {
      await expectExclusionCheckWired(r.getByTestId(id), id);
    }
  });

  it('warns for the next button once feedback shows', async () => {
    const r = renderScreen();
    fireEvent.press(r.getByTestId('sorting-practice-screen-in-control-button'));
    await expectExclusionCheckWired(
      r.getByTestId('sorting-practice-screen-next-button'),
      'sorting-practice-screen-next-button'
    );
  });
});
