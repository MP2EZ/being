/**
 * DEBUG-622 — Begin Practice must never share screen space with the crisis FAB's
 * touch band.
 *
 * On PracticeTimer the FAB is in `immersive` mode: faded, but a direct tap still
 * navigates, and at `zIndex: 9999` it wins the tap. The full-width toggle overlapped it:
 * 20×17pt visibly on 402x874, and inside the 12pt hit slop on 390x844. A tap on the
 * corner of Begin Practice therefore opened CrisisResources, a crisis FALSE POSITIVE.
 * DEBUG-618 made the column scroll, so the toggle can now rest at any height, and
 * DEBUG-621 moved the whole column up.
 *
 * Crisis ruling: the clearance is HORIZONTAL and on the toggle's OWN FRAME —
 * `marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left`, the DEBUG-547 shape. That holds at
 * every scroll offset and text size. A vertical inset cannot, and padding moves only the
 * label. The FAB does not change.
 *
 * Maestro taps element centres, which never enter the contested column, so this suite
 * is the falsifier. The simulator bounds and a corner point-tap are DEBUG-626.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import PracticeTimerScreen from '@/features/learn/practices/PracticeTimerScreen';
import { sharedPracticeStyles } from '@/features/learn/practices/shared/sharedPracticeStyles';
import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';
import { spacing } from '@/core/theme';

jest.mock('@/features/practices/shared/components/BreathingCircle', () => {
  const { View } = require('react-native');
  return ({ testID }: { testID?: string }) => <View testID={testID} />;
});

jest.mock('@/features/practices/shared/components/Timer', () => {
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

const TOGGLE = 'practice-timer-screen-toggle-button';
const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 402, height: 874 },
];

const renderedToggleStyle = () => {
  const { getByTestId } = render(
    <PracticeTimerScreen
      practiceId="breathing-space"
      moduleId="aware-presence"
      duration={180}
      title="3-Minute Breathing Space"
    />
  );
  return (StyleSheet.flatten(getByTestId(TOGGLE).props.style) ?? {}) as Record<string, unknown>;
};

const SOURCE = path.resolve(__dirname, '../PracticeTimerScreen.tsx');
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
   * that covers every scroll offset and text size.
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
  it('the measured pre-fix frames DO intersect, so the sweep can go red', () => {
    expect(intersectsCrisisButtonExclusion({ x: 24, y: 757.3, width: 353.7, height: 67 }, { width: 402, height: 874 })).toBe(true);
    expect(intersectsCrisisButtonExclusion({ x: 24, y: 751.3, width: 342, height: 67 }, { width: 390, height: 844 })).toBe(true);
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
