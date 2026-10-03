/**
 * The daily loop's crisis affordances survive a withheld Art. 9 write (FEAT-667).
 *
 * FEAT-318 gates the WRITE, never the capture: a user who refused wellness-data
 * processing still does the whole loop, and every 988 affordance on it behaves
 * exactly as it does for a consenting user. Slice C gates below the screens, at
 * SessionStorageService and stoicPracticeStore, so nothing here SHOULD change —
 * this pins that nothing does, for every blocked reason, on every support beat.
 *
 * Crisis ruling 2026-09-29: with the gate blocked, `SUPPORT_LINE` renders exactly
 * once on the beat `showsSupportLine()` selects, stays pinned outside the
 * ScrollView, and routes to CrisisResources; Continue still advances; the root
 * crisis button is not suppressed on the DailyLoop route. The companion boundary
 * pin (wellnessWriteConsentBoundary.test.ts) keeps the predicate out of these
 * screens entirely. Neither proves on-device layout — that is Maestro's.
 *
 * Under `__tests__/safety/` so `npm run test:safety` runs it in precommit.
 */

import React from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import DailyLoopStepScreen from '@/features/practices/dailyloop/screens/DailyLoopStepScreen';
import DailyLoopDepthSelectScreen from '@/features/practices/dailyloop/screens/DailyLoopDepthSelectScreen';
import { DAILY_LOOP_STEP_KEYS, showsSupportLine } from '@/features/practices/dailyloop/config/tenseMode';
import { IMMERSIVE_ROUTES, SUPPRESSED_ROUTES } from '@/features/crisis/components/RootCrisisButton';
import { decideWellnessWrite, type WellnessWriteBlockReason } from '@/core/stores/consentStore';
import { navigationRef } from '@/core/navigation/navigationRef';
import type { DailyLoopDepth, DailyLoopMode } from '@/features/practices/types/flows';
import { seedWellnessWriteConsent } from '../helpers/wellnessWriteConsent';

jest.mock('@/core/navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(() => true), navigate: jest.fn() },
}));

const BLOCKED: WellnessWriteBlockReason[] = ['refused', 'revoked', 'under_age', 'missing', 'loading'];
const MODES: DailyLoopMode[] = ['flat', 'morning', 'evening'];
const DEPTHS: DailyLoopDepth[] = ['quick', 'deep'];

/** Every (depth, mode) paired with the one beat that hosts the support line. */
const SUPPORT_BEATS = DEPTHS.flatMap((depth) =>
  MODES.map((mode) => {
    const hosts = DAILY_LOOP_STEP_KEYS.filter((step) => showsSupportLine(depth, mode, step));
    return { depth, mode, hosts };
  }),
);

describe('the fixture covers what it claims', () => {
  it('finds exactly one support beat per depth and tense', () => {
    for (const { hosts } of SUPPORT_BEATS) expect(hosts).toHaveLength(1);
    expect(SUPPORT_BEATS).toHaveLength(6);
  });

  it.each(BLOCKED)('the seed really blocks (%s)', (reason) => {
    seedWellnessWriteConsent(reason);
    expect(decideWellnessWrite()).toEqual({ allowed: false, reason });
  });
});

describe.each(BLOCKED)('with the write gate blocked (%s)', (reason) => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedWellnessWriteConsent(reason);
  });

  it.each(SUPPORT_BEATS.map(({ depth, mode, hosts }) => [depth, mode, hosts[0]!] as const))(
    '%s / %s / %s: one pinned support line that reaches CrisisResources, and Continue advances',
    (depth, mode, step) => {
      const onSave = jest.fn();
      const screen = render(<DailyLoopStepScreen stepKey={step} mode={mode} depth={depth} onSave={onSave} />);

      expect(screen.getAllByTestId('daily-loop-support-line')).toHaveLength(1);
      expect(within(screen.UNSAFE_getByType(ScrollView)).queryByTestId('daily-loop-support-line')).toBeNull();

      fireEvent.press(screen.getByTestId('daily-loop-support-line'));
      expect(navigationRef.navigate).toHaveBeenCalledWith('CrisisResources', { source: 'crisis_button' });

      fireEvent.press(screen.getByTestId('continue-button'));
      expect(onSave).toHaveBeenCalledTimes(1);
    },
  );
});

/**
 * FEAT-669 (crisis ruling): the depth picker now READS the gate, to show its notice.
 * The decision may toggle that note and nothing else — block the write, never entry
 * to the loop. Both choices must fire for every reason, at default type and at AX5.
 */
describe.each([1, 3.1])('the depth picker at font scale %s', (fontScale) => {
  beforeEach(() => {
    (useWindowDimensions as unknown as jest.Mock).mockReturnValue({ width: 375, height: 667, scale: 2, fontScale });
  });
  afterEach(() => {
    (useWindowDimensions as unknown as jest.Mock).mockReturnValue({ width: 375, height: 812, scale: 2, fontScale: 1 });
  });

  it.each(BLOCKED)('blocked (%s): both choices still enter the loop', (reason) => {
    seedWellnessWriteConsent(reason);
    const onSelect = jest.fn();
    const screen = render(<DailyLoopDepthSelectScreen onSelect={onSelect} />);
    for (const depth of DEPTHS) {
      const card = screen.getByTestId(`daily-loop-depth-${depth}`);
      expect(card.props.accessibilityRole).toBe('button');
      fireEvent.press(card);
    }
    expect(onSelect.mock.calls).toEqual([['quick'], ['deep']]);
  });
});

describe('the root crisis button on the DailyLoop route', () => {
  it('is immersive, never suppressed', () => {
    expect(IMMERSIVE_ROUTES.has('DailyLoop')).toBe(true);
    expect(SUPPRESSED_ROUTES.has('DailyLoop')).toBe(false);
  });
});
