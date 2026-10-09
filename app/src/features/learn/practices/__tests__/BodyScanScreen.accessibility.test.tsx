/**
 * DEBUG-628 — the Body Scan toggle must never share screen space with the crisis FAB's
 * touch band.
 *
 * BodyScan is in IMMERSIVE_ROUTES, which renders the FAB faded — NOT absent.
 * `FADED_OPACITY` does not affect hit testing, so at `zIndex: 9999` a direct tap still
 * navigates, and any overlap turns a tap on the corner of Begin Practice into
 * CrisisResources: a crisis FALSE POSITIVE, the DEBUG-547 shape.
 *
 * Crisis ruling (DEBUG-628, mirroring DEBUG-622): the clearance is HORIZONTAL and on the
 * toggle's OWN FRAME — `marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left`. The column
 * scrolls, so the toggle rests at any y and no vertical inset can hold; padding would move
 * only the label and leave the frame in the contested column. The FAB does not change.
 *
 * Accessibility ruling (DEBUG-628): the resulting asymmetry is acceptable — the frame keeps
 * `minHeight: 48`, so it stays well above WCAG 2.5.8 AA and 2.5.5 AAA in both axes, and the
 * clearance term IS target separation from a control at zIndex 9999. The label wraps freely
 * (no `numberOfLines`, no fixed height, no `maxFontSizeMultiplier`), so AX5 degrades by
 * reflow, never by clipping. Do not add any of those three.
 *
 * The frames below are DERIVED from the real style values, not simulator captures — the
 * intersection is decidable because the toggle is a stretch child of a
 * `paddingHorizontal: spacing[24]` column and the rect's left is 72, both offsets from
 * screen-right, so W cancels. On-device bounds and a corner point-tap are DEBUG-626's.
 *
 * Maestro taps element centres, which never enter the contested column, so this suite is
 * the falsifier.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import BodyScanScreen from '@/features/learn/practices/BodyScanScreen';
import { sharedPracticeStyles } from '@/features/learn/practices/shared/sharedPracticeStyles';
import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';
import { spacing } from '@/core/theme';
import { expectExclusionCheckWired } from '../../../../../__tests__/helpers/crisisExclusionLayoutEvent';

jest.mock('@/features/practices/shared/components/Timer', () => {
  const { View } = require('react-native');
  return ({ testID }: { testID?: string }) => <View testID={testID} />;
});

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

const TOGGLE = 'body-scan-screen-toggle-button';
const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 402, height: 874 },
];

const renderedToggleStyle = () => {
  const { getByTestId } = render(
    <BodyScanScreen practiceId="body-scan" moduleId="aware-presence" duration={300} />
  );
  return (StyleSheet.flatten(getByTestId(TOGGLE).props.style) ?? {}) as Record<string, unknown>;
};

const SOURCE = path.resolve(__dirname, '../BodyScanScreen.tsx');
const strippedSource = () =>
  fs
    .readFileSync(SOURCE, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/** The `toggleButton: { ... }` entry of the StyleSheet, anchored on its key. */
const toggleStyleBlock = (source: string): string => {
  const match = source.match(/\btoggleButton:\s*\{([^}]*)\}/);
  return match ? match[1] : '';
};

describe('the toggle frame clears the FAB column', () => {
  it('carries marginRight equal to the exclusion rect, as a margin and never padding', () => {
    const style = renderedToggleStyle();

    expect(style.marginRight).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
    expect(style.paddingRight).toBeUndefined();
    expect(style.marginHorizontal).toBeUndefined();
    expect(style.marginBottom).toBe(spacing[32]);
  });

  it('declares the clearance from the imported constant, last, in a named StyleSheet entry', () => {
    const source = strippedSource();
    const block = toggleStyleBlock(source);

    expect(block).toMatch(/marginBottom/);
    expect(block).toMatch(/marginRight:\s*CRISIS_BUTTON_EXCLUSION_RECT\.left/);
    expect(block.indexOf('marginRight')).toBeGreaterThan(block.indexOf('marginBottom'));
    expect(block).not.toMatch(/marginHorizontal|paddingRight/);
    expect(source).toMatch(/style=\{styles\.toggleButton\}/);
    expect(source).toMatch(/from '@\/features\/crisis\/constants\/crisisButtonGeometry'/);
    expect(source).not.toMatch(/spacing\[72\]|\b72\b/);
  });

  /**
   * The toggle is a stretched child of the padded column, so its frame spans
   * x = padding to W − padding − marginRight. Swept over every vertical position from
   * above the screen to below it, and three heights (one line, measured, AX5-wrapped):
   * that covers every scroll offset and text size, so it never needs to know which y is
   * real — which is what makes jest's missing layout engine harmless here.
   */
  it('never intersects the exclusion rect at any y, on any supported viewport', () => {
    const marginRight = (renderedToggleStyle().marginRight as number | undefined) ?? 0;
    const padding = StyleSheet.flatten(sharedPracticeStyles.content).paddingHorizontal as number;
    const offenders: string[] = [];

    for (const { width, height } of VIEWPORTS) {
      for (const toggleHeight of [48, 67, 200]) {
        for (let y = -height; y <= 2 * height; y += 17) {
          const frame = { x: padding, y, width: width - 2 * padding - marginRight, height: toggleHeight };
          if (intersectsCrisisButtonExclusion(frame, { width, height })) {
            offenders.push(`${width}x${height} h=${toggleHeight} y=${y}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('matcher integrity', () => {
  /**
   * DERIVED pre-fix frames for THIS host — x from the column's own paddingHorizontal,
   * y from the max-scroll resting position (H − bottomInset − content paddingVertical −
   * marginBottom). Deliberately NOT DEBUG-563's PracticeTimer simulator readings: those
   * were measured on a different screen and reusing them would assert a provenance this
   * host does not have.
   */
  it('the derived pre-fix frames DO intersect, so the sweep can go red', () => {
    expect(
      intersectsCrisisButtonExclusion({ x: 24, y: 709, width: 354, height: 67 }, { width: 402, height: 874 })
    ).toBe(true);
    expect(
      intersectsCrisisButtonExclusion({ x: 24, y: 679, width: 342, height: 67 }, { width: 390, height: 844 })
    ).toBe(true);
  });

  it('a full-width toggle with no margin intersects at a band position', () => {
    const { width, height } = VIEWPORTS[1];
    const frame = { x: spacing[24], y: height - 140, width: width - 2 * spacing[24], height: 48 };

    expect(intersectsCrisisButtonExclusion(frame, { width, height })).toBe(true);
  });

  it('the StyleSheet slicer finds the toggle entry in the real source', () => {
    expect(toggleStyleBlock(strippedSource()).trim().length).toBeGreaterThan(0);
    expect(toggleStyleBlock('const s = { other: { a: 1 } };')).toBe('');
  });
});

describe('DEBUG-643 — the __DEV__ crisis-exclusion check is wired to the cleared control', () => {
  it('warns when the toggle reaches the FAB column', async () => {
    const { getByTestId } = render(<BodyScanScreen practiceId="body-scan" moduleId="aware-presence" duration={300} />);
    await expectExclusionCheckWired(getByTestId(TOGGLE), TOGGLE);
  });
});
