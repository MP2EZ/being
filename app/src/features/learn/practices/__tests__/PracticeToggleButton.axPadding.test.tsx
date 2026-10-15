/**
 * DEBUG-677 — the practice start/pause toggle breaks only between words at AX sizes.
 *
 * DEBUG-654's capture (Release, iOS 18.6, AX5) showed "Resum / e" and a three-line
 * "Begin Practice" at 390x844. The label box is W − 120 − 2 × paddingHorizontal:
 * the column's spacing[24] each side plus the host's 72pt crisis margin, then the
 * button's own padding. At spacing[32] that is 191 / 206 / 218pt at 375 / 390 / 402,
 * while "Resume" is ~204pt and "Practice" is in (206, 218] at AX5.
 *
 * Accessibility ruling (DEBUG-677, option A): from PRACTICE_HEADER_STACKED_FONT_SCALE
 * the button's paddingHorizontal drops to spacing[12]. No cap or shrink. Padding sits
 * inside the frame, so the frame's x-range, and with it the crisis-FAB clearance, does
 * not move.
 *
 * Crisis ruling (DEBUG-677): the AX entry carries paddingHorizontal/paddingVertical
 * keys only, never asymmetric padding (the DEBUG-622 wrong fix), and the host `style`
 * stays last in the merge. The hosts' own suites render at fontScale 1, so the
 * AX-branch clearance pins live here.
 *
 * Jest has no text layout, so this pins the declared styles and props. The on-device
 * captures are in the DEBUG-677 commit message.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { render } from '@testing-library/react-native';

import PracticeToggleButton from '@/features/learn/practices/shared/PracticeToggleButton';
import PracticeTimerScreen from '@/features/learn/practices/PracticeTimerScreen';
import ReflectionTimerScreen from '@/features/learn/practices/ReflectionTimerScreen';
import BodyScanScreen from '@/features/learn/practices/BodyScanScreen';
import { sharedPracticeStyles } from '@/features/learn/practices/shared/sharedPracticeStyles';
import { PRACTICE_HEADER_STACKED_FONT_SCALE } from '@/features/learn/practices/shared/practiceScreenHeaderLayout';
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

const AX5 = 3.571;
const ID = 'toggle';
const VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 402, height: 874 },
];
/** Upper bound of AX5 "Practice", the widest word: fits 218 at 402, breaks 206 at 390. */
const WIDEST_WORD_AX5 = 218;

const setFontScale = (fontScale: number) =>
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({
    width: 390,
    height: 844,
    scale: 3,
    fontScale,
  });

beforeEach(() => setFontScale(1));
afterEach(() => setFontScale(1));

const flat = (style: unknown) => (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;

const STATES = {
  begin: { elapsedTime: 0, isActive: false },
  pause: { elapsedTime: 5, isActive: true },
  resume: { elapsedTime: 5, isActive: false },
} as const;

const renderToggle = (
  state: keyof typeof STATES = 'begin',
  extra: Partial<React.ComponentProps<typeof PracticeToggleButton>> = {}
) => render(<PracticeToggleButton {...STATES[state]} onToggle={jest.fn()} testID={ID} {...extra} />);

const buttonStyle = (extra: Partial<React.ComponentProps<typeof PracticeToggleButton>> = {}) =>
  flat(renderToggle('begin', extra).getByTestId(ID).props.style);

const SOURCE = path.resolve(__dirname, '../shared/PracticeToggleButton.tsx');
const strippedSource = () =>
  fs
    .readFileSync(SOURCE, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/** The `buttonAx: { ... }` StyleSheet entry, anchored on its key. */
const axStyleBlock = (source: string): string => source.match(/\bbuttonAx:\s*\{([^}]*)\}/)?.[1] ?? '';
/** The label's `<Text ...>` opening tag. */
const labelTextTag = (source: string): string => source.match(/<Text\b[^>]*>/)?.[0] ?? '';

describe('AX padding switch', () => {
  it.each([1, 1.353, 1.59, Number.NaN])('keeps spacing[32] below the threshold (fontScale %p)', (scale) => {
    setFontScale(scale);
    expect(buttonStyle().paddingHorizontal).toBe(spacing[32]);
  });

  it.each([PRACTICE_HEADER_STACKED_FONT_SCALE, 1.786, 3.143, AX5])(
    'drops to spacing[12] from the threshold (fontScale %p)',
    (scale) => {
      setFontScale(scale);
      expect(buttonStyle().paddingHorizontal).toBe(spacing[12]);
    }
  );

  it('changes nothing else: the AX style differs from default only in horizontal padding', () => {
    const base = buttonStyle();
    setFontScale(AX5);
    const ax = buttonStyle();

    expect(Object.keys(ax).sort()).toEqual(Object.keys(base).sort());
    const changed = Object.keys(ax).filter((k) => ax[k] !== base[k]);
    expect(changed).toEqual(['paddingHorizontal']);
    expect(ax.minHeight).toBe(spacing[48]);
    expect(ax.paddingVertical).toBe(spacing[24]);
  });

  it('every iPhone width in scope fits the widest AX5 word with room to spare', () => {
    setFontScale(AX5);
    const padding = buttonStyle().paddingHorizontal as number;
    const column = StyleSheet.flatten(sharedPracticeStyles.content).paddingHorizontal as number;

    for (const { width } of VIEWPORTS) {
      const labelBox = width - 2 * column - CRISIS_BUTTON_EXCLUSION_RECT.left - 2 * padding;
      expect(labelBox).toBeGreaterThanOrEqual(WIDEST_WORD_AX5 + 8);
    }
  });

  it('control: the default padding cannot fit the widest word at 375, so the budget test can go red', () => {
    const column = StyleSheet.flatten(sharedPracticeStyles.content).paddingHorizontal as number;
    const labelBox = 375 - 2 * column - CRISIS_BUTTON_EXCLUSION_RECT.left - 2 * (buttonStyle().paddingHorizontal as number);
    expect(labelBox).toBeLessThan(WIDEST_WORD_AX5);
  });
});

describe('crisis ruling: the host style wins and the AX entry stays padding-only', () => {
  it('a host style passed last overrides the AX padding and keeps its margin', () => {
    setFontScale(AX5);
    const style = buttonStyle({ style: { paddingHorizontal: 99, marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left } });

    expect(style.paddingHorizontal).toBe(99);
    expect(style.marginRight).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
  });

  it('the source merges the AX entry before the host style, which stays last', () => {
    const source = strippedSource();
    expect(source).toMatch(/style=\{\[styles\.button, [^\]]*styles\.buttonAx[^\]]*, style\]\}/);
  });

  it('the AX StyleSheet entry declares only symmetric padding keys', () => {
    const block = axStyleBlock(strippedSource());
    const keys = [...block.matchAll(/(\w+)\s*:/g)].map((m) => m[1]);

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(['paddingHorizontal', 'paddingVertical']).toContain(key);
  });

  it('control: the key whitelist rejects a frame-moving or asymmetric key', () => {
    const forged = axStyleBlock('buttonAx: { paddingHorizontal: 12, paddingRight: 4, alignSelf: "x" }');
    const keys = [...forged.matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
    expect(keys.filter((k) => !['paddingHorizontal', 'paddingVertical'].includes(k))).toEqual([
      'paddingRight',
      'alignSelf',
    ]);
  });

  const HOSTS = [
    {
      name: 'PracticeTimerScreen',
      toggle: 'practice-timer-screen-toggle-button',
      el: (
        <PracticeTimerScreen
          practiceId="breathing-space"
          moduleId="aware-presence"
          duration={180}
          title="3-Minute Breathing Space"
        />
      ),
    },
    {
      name: 'ReflectionTimerScreen',
      toggle: 'reflection-timer-screen-toggle-button',
      el: (
        <ReflectionTimerScreen
          practiceId="evening-reflection"
          moduleId="aware-presence"
          duration={180}
          title="Evening Reflection"
        />
      ),
    },
    {
      name: 'BodyScanScreen',
      toggle: 'body-scan-screen-toggle-button',
      el: <BodyScanScreen practiceId="body-scan" moduleId="aware-presence" duration={300} />,
    },
  ];

  it.each(HOSTS)('$name at AX5 keeps its FAB clearance on the AX branch', ({ toggle, el }) => {
    setFontScale(AX5);
    const style = flat(render(el).getByTestId(toggle).props.style);

    expect(style.paddingHorizontal).toBe(spacing[12]);
    expect(style.marginRight).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
    expect(style.paddingRight).toBeUndefined();
    expect(style.paddingLeft).toBeUndefined();
    expect(style.marginHorizontal).toBeUndefined();
    expect(style.alignSelf).toBeUndefined();
    expect(style.width).toBeUndefined();

    const column = StyleSheet.flatten(sharedPracticeStyles.content).paddingHorizontal as number;
    const offenders: string[] = [];
    for (const { width, height } of VIEWPORTS) {
      for (const toggleHeight of [48, 67, 200]) {
        for (let y = -height; y <= 2 * height; y += 17) {
          const frame = { x: column, y, width: width - 2 * column - (style.marginRight as number), height: toggleHeight };
          if (intersectsCrisisButtonExclusion(frame, { width, height })) offenders.push(`${width} h=${toggleHeight} y=${y}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('the label reflows and is never capped', () => {
  it('declares no cap, shrink, line limit or fixed line height on the label', () => {
    const source = strippedSource();
    const tag = labelTextTag(source);

    expect(tag).toMatch(/<Text\b/);
    expect(tag).not.toMatch(/(maxFontSizeMultiplier|adjustsFontSizeToFit|minimumFontScale|allowFontScaling|numberOfLines)\s*=/);
    expect(source).not.toMatch(/(maxFontSizeMultiplier|adjustsFontSizeToFit|minimumFontScale|allowFontScaling|numberOfLines)\s*[=:]/);
    expect(source).not.toMatch(/lineHeight\s*:/);
  });

  it('control: the cap matcher fires on a capped tag', () => {
    expect(labelTextTag('<Text numberOfLines={1} style={s}>')).toMatch(/numberOfLines\s*=/);
  });

  it('centres each wrapped line', () => {
    setFontScale(AX5);
    const { getByText } = renderToggle('begin');
    expect(flat(getByText('Begin Practice').props.style).textAlign).toBe('center');
  });
});

describe('label-in-name holds at every scale (WCAG 2.5.3)', () => {
  const CASES = [
    { state: 'begin', label: 'Begin Practice' },
    { state: 'pause', label: 'Pause' },
    { state: 'resume', label: 'Resume' },
  ] as const;

  it.each([1, AX5])('the accessibility label contains the visible label at fontScale %p', (scale) => {
    setFontScale(scale);
    for (const { state, label } of CASES) {
      const { getByTestId, getByText, unmount } = renderToggle(state);
      expect(getByText(label)).toBeTruthy();
      expect(getByTestId(ID).props.accessibilityLabel).toContain(label);
      unmount();
    }
  });

  it('holds for host-supplied labels too', () => {
    setFontScale(AX5);
    const labels = { begin: 'Start', pause: 'Hold', resume: 'Go on' };
    for (const [state, label] of [['begin', 'Start'], ['pause', 'Hold'], ['resume', 'Go on']] as const) {
      const { getByTestId, getByText, unmount } = renderToggle(state, { labels });
      expect(getByText(label)).toBeTruthy();
      expect(getByTestId(ID).props.accessibilityLabel).toContain(label);
      unmount();
    }
  });
});
