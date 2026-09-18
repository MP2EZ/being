/**
 * DEBUG-631 — the Guided Body Scan advance button must never share screen space with the
 * crisis FAB's touch band.
 *
 * `GuidedBodyScan` is in IMMERSIVE_ROUTES and absent from SUPPRESSED_ROUTES, so the FAB is
 * rendered FADED — not absent. `FADED_OPACITY` is an opacity and does not affect hit
 * testing, so at `zIndex: 9999` a direct tap still navigates, and any overlap turns a tap on
 * the corner of Next Area into CrisisResources: a crisis FALSE POSITIVE, the DEBUG-547 shape.
 *
 * Crisis ruling (DEBUG-631, mirroring DEBUG-622/628): the clearance is HORIZONTAL and on the
 * button's OWN FRAME — `marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left`. The column scrolls,
 * so the button rests at any y and no vertical inset can hold; padding would move only the
 * label and leave the frame in the contested column.
 *
 * TWO DIFFERENCES FROM THE DEBUG-628 PINS — do not "fix" this file back toward them:
 *
 *  1. It does NOT import `sharedPracticeStyles`. This host does not use
 *     `PracticeToggleButton` or the shared practice column; it declares its own local
 *     `styles.content`. Importing the shared module would assert a provenance this host
 *     does not have, and would keep passing if the local padding changed.
 *
 *  2. The StyleSheet slicer is BRACE-BALANCED, not `/\{([^}]*)\}/`. `nextButton` contains a
 *     nested `shadowOffset: { ... }`, so the naive slicer terminates at that inner brace —
 *     BEFORE `marginRight`. The positive assertions would go red (loud) but every negative
 *     one would pass VACUOUSLY (DEBUG-390). The matcher-integrity block below proves both
 *     that the balanced slicer reaches the entry's real end and that the naive one does not.
 *
 * The frames below are DERIVED from the real style values, not simulator captures — the
 * intersection is decidable because the button is a stretch child of a
 * `paddingHorizontal: spacing[24]` column and the rect's `left` is 72, both offsets from
 * screen-right, so W cancels. On-device bounds and a corner point-tap are DEBUG-626's.
 *
 * `crisis-button-reachability` does not render this screen, so its gate arm proves only the
 * FAB mount. This suite is the falsifier.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import GuidedBodyScanScreen from '@/features/learn/practices/GuidedBodyScanScreen';
import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';
import { spacing } from '@/core/theme';

jest.mock('@/features/practices/shared/components/ProgressiveBodyScanList', () => {
  const { View } = require('react-native');
  return ({ testID }: { testID?: string }) => <View testID={testID} />;
});

jest.mock('@/features/learn/practices/shared/usePracticeCompletion', () => ({
  usePracticeCompletion: () => ({
    renderCompletion: () => null,
    markStarted: jest.fn(),
    markComplete: jest.fn(),
  }),
}));

const NEXT_BUTTON = 'guided-body-scan-screen-next-button';
const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 402, height: 874 },
];

const renderedNextButtonStyle = () => {
  const { getByTestId } = render(
    <GuidedBodyScanScreen
      practiceId="resistance-body-check"
      moduleId="radical-acceptance"
      title="Resistance Body Check"
    />
  );
  return (StyleSheet.flatten(getByTestId(NEXT_BUTTON).props.style) ?? {}) as Record<
    string,
    unknown
  >;
};

const SOURCE = path.resolve(__dirname, '../GuidedBodyScanScreen.tsx');
const strippedSource = () =>
  fs
    .readFileSync(SOURCE, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/**
 * The `<key>: { ... }` entry of a StyleSheet, anchored on its key and BRACE-BALANCED so a
 * nested object (`shadowOffset`) cannot truncate the slice. See this file's header.
 */
const styleBlock = (source: string, key: string): string => {
  const at = source.search(new RegExp(`\\b${key}:\\s*\\{`));
  if (at === -1) return '';
  const open = source.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
};

/** The naive DEBUG-628 slicer, kept ONLY so matcher integrity can prove it is unsafe here. */
const naiveStyleBlock = (source: string, key: string): string => {
  const match = source.match(new RegExp(`\\b${key}:\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
};

describe('the next-button frame clears the FAB column', () => {
  it('carries marginRight equal to the exclusion rect, as a margin and never padding', () => {
    const style = renderedNextButtonStyle();

    expect(style.marginRight).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
    expect(style.paddingRight).toBeUndefined();
    expect(style.marginHorizontal).toBeUndefined();
    expect(style.marginBottom).toBe(spacing[32]);
  });

  it('declares the clearance from the imported constant, last, in a named StyleSheet entry', () => {
    const source = strippedSource();
    const block = styleBlock(source, 'nextButton');

    expect(block).toMatch(/marginBottom/);
    expect(block).toMatch(/marginRight:\s*CRISIS_BUTTON_EXCLUSION_RECT\.left/);
    expect(block.indexOf('marginRight')).toBeGreaterThan(block.indexOf('marginBottom'));
    expect(block).not.toMatch(/marginHorizontal|paddingRight/);
    expect(source).toMatch(/style=\{styles\.nextButton\}/);
    expect(source).toMatch(/from '@\/features\/crisis\/constants\/crisisButtonGeometry'/);
    expect(source).not.toMatch(/spacing\[72\]|\b72\b/);
  });

  /**
   * This host declares its OWN column padding — it does not consume sharedPracticeStyles —
   * so the sweep's padding is pinned to the source rather than imported from elsewhere.
   */
  it('takes its column padding from this host, not the shared practice column', () => {
    const source = strippedSource();

    expect(styleBlock(source, 'content')).toMatch(/paddingHorizontal:\s*spacing\[24\]/);
    expect(source).not.toMatch(/sharedPracticeStyles/);
  });

  /**
   * The button is a stretched child of the padded column, so its frame spans
   * x = padding to W − padding − marginRight. Swept over every vertical position from above
   * the screen to below it, and three heights (one line, measured, AX5-wrapped): that covers
   * every scroll offset and text size, so it never needs to know which y is real — which is
   * what makes jest's missing layout engine harmless here.
   *
   * This matters more on this host than on the DEBUG-628 ones: the button is NOT the last
   * child (a `noteSection` follows it) and `content` has `flexGrow: 1`, so no single resting
   * y is derivable. The all-y sweep is what makes that irrelevant.
   */
  it('never intersects the exclusion rect at any y, on any supported viewport', () => {
    const marginRight = (renderedNextButtonStyle().marginRight as number | undefined) ?? 0;
    const padding = spacing[24];
    const offenders: string[] = [];

    for (const { width, height } of VIEWPORTS) {
      for (const buttonHeight of [48, 67, 200]) {
        for (let y = -height; y <= 2 * height; y += 17) {
          const frame = {
            x: padding,
            y,
            width: width - 2 * padding - marginRight,
            height: buttonHeight,
          };
          if (intersectsCrisisButtonExclusion(frame, { width, height })) {
            offenders.push(`${width}x${height} h=${buttonHeight} y=${y}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('matcher integrity', () => {
  /**
   * DERIVED pre-fix frames for THIS host. x from this host's own `content` padding; y is the
   * scroll offset that rests the button flush inside the band (H − rect.bottom − height),
   * whose provenance is "a reachable offset in the scroll range". Deliberately NOT a
   * max-scroll stack — unlike the DEBUG-628 hosts this button is not the last child, so a
   * max-scroll derivation would carry a guessed `noteSection` height. Equally deliberately
   * NOT DEBUG-563's PracticeTimer simulator readings or DEBUG-628's frames: both were derived
   * for different columns.
   */
  it('the derived pre-fix frames DO intersect, so the sweep can go red', () => {
    expect(
      intersectsCrisisButtonExclusion(
        { x: 24, y: 528, width: 327, height: 67 },
        { width: 375, height: 667 }
      )
    ).toBe(true);
    expect(
      intersectsCrisisButtonExclusion(
        { x: 24, y: 705, width: 342, height: 67 },
        { width: 390, height: 844 }
      )
    ).toBe(true);
    expect(
      intersectsCrisisButtonExclusion(
        { x: 24, y: 735, width: 354, height: 67 },
        { width: 402, height: 874 }
      )
    ).toBe(true);
  });

  it('a full-width button with no margin intersects at a band position', () => {
    const { width, height } = VIEWPORTS[1];
    const frame = { x: spacing[24], y: height - 140, width: width - 2 * spacing[24], height: 48 };

    expect(intersectsCrisisButtonExclusion(frame, { width, height })).toBe(true);
  });

  /**
   * The slicer controls. The first proves the balanced slice reaches the entry's real end —
   * `elevation` is its last pre-existing key, and a slice that stops at the nested
   * `shadowOffset` would not contain it. The second proves the naive DEBUG-628 slicer really
   * does truncate here, which is the whole reason this file does not reuse it: without the
   * balanced form, every `not.toMatch` above would pass against a slice holding no code.
   *
   * Both assert ONLY pre-existing keys, never `marginRight`. That is deliberate: a control
   * naming the thing the fix adds goes red under the mutation run alongside the contract it
   * is supposed to be independent of, which conflates two mechanisms and leaves neither
   * proven. `marginRight` is asserted by the contract block above, and nowhere else.
   */
  it('the balanced slicer spans the nested shadowOffset to the end of the entry', () => {
    const block = styleBlock(strippedSource(), 'nextButton');

    expect(block).toMatch(/shadowOffset/);
    expect(block).toMatch(/elevation/);
  });

  it('the naive slicer truncates at the nested brace, which is why it is not used', () => {
    const naive = naiveStyleBlock(strippedSource(), 'nextButton');

    expect(naive).toMatch(/shadowOffset/);
    expect(naive).not.toMatch(/elevation/);
    expect(naive).not.toMatch(/marginRight/);
  });

  it('the slicer returns empty for a key the source does not declare', () => {
    expect(styleBlock(strippedSource(), 'noSuchStyleKey')).toBe('');
  });
});
