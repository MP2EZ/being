// Engagement dates are LOCAL calendar dates, so the cutoff tests need a zone that is
// never on UTC's date for part of the day. Set before anything reads a Date.
process.env.TZ = 'America/Los_Angeles';

/**
 * MAINT-747 — PrincipleEngagementChart: window filter, dominant-insight thresholds,
 * beginner detection, and the chart's own render paths.
 *
 * Dominant-insight rule (AC-1): 5+ total engagements, with the top principle holding 40%+
 * of the total and 2x+ the runner-up. A tie for the top spot therefore
 * yields NO dominant insight — intended: two co-leading principles is not a pattern to
 * name, and the chart observes rather than ranks.
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import type { PrincipleEngagement } from '@/features/practices/stores/stoicPracticeStore';
import type { StoicPrinciple } from '@/features/practices/types/stoic';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

import PrincipleEngagementChart, {
  BEGINNER_DAYS_THRESHOLD,
  DOMINANT_PERCENTAGE_THRESHOLD,
  DOMINANT_RATIO_THRESHOLD,
  MIN_ENGAGEMENTS_FOR_INSIGHT,
  MIN_ENGAGEMENTS_FOR_TIP,
  calculatePrincipleCounts,
  detectDominantPrinciple,
  filterByDateRange,
  isBeginnerUser,
} from '@/features/insights/components/PrincipleEngagementChart';
import { useEducationStore, resetEducationStoreForErasure } from '@/features/learn/stores/educationStore';
import { getModuleIdForPrinciple } from '@/features/learn/utils/principleMapping';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { PRINCIPLES } from '@/features/practices/shared/constants/principles';
import { seedWellnessWriteConsent } from '../../helpers/wellnessWriteConsent';

const DAY_MS = 24 * 60 * 60 * 1000;
const [P1, P2, P3, P4, P5] = PRINCIPLES.map((p) => p.key);

const localDate = (d: Date): string =>
  [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

const engagement = (principle: StoicPrinciple, date: string): PrincipleEngagement => ({
  principle,
  flowType: 'morning',
  engagementType: 'applied',
  date,
  timestamp: new Date(),
});

/** Counts by principle, in canonical order, as calculatePrincipleCounts would shape them. */
const countsOf = (byPrinciple: Partial<Record<StoicPrinciple, number>>) =>
  PRINCIPLES.map(({ key }) => ({ principle: key, count: byPrinciple[key] ?? 0, percentage: 0 }));
const totalOf = (byPrinciple: Partial<Record<StoicPrinciple, number>>): number =>
  Object.values(byPrinciple).reduce((sum, n) => sum + (n ?? 0), 0);
const dominantOf = (byPrinciple: Partial<Record<StoicPrinciple, number>>) =>
  detectDominantPrinciple(countsOf(byPrinciple), totalOf(byPrinciple));

describe('time zone', () => {
  it('control: the suite runs in America/Los_Angeles', () => {
    // 2026-10-14 is PDT (UTC-7).
    expect(new Date(2026, 9, 14, 12).getTimezoneOffset()).toBe(420);
  });
});

describe('thresholds', () => {
  it('pins the documented values the boundary tests below are built on', () => {
    expect(MIN_ENGAGEMENTS_FOR_INSIGHT).toBe(5);
    expect(DOMINANT_PERCENTAGE_THRESHOLD).toBe(40);
    expect(DOMINANT_RATIO_THRESHOLD).toBe(2);
    expect(BEGINNER_DAYS_THRESHOLD).toBe(90);
    expect(MIN_ENGAGEMENTS_FOR_TIP).toBe(3);
  });
});

describe('filterByDateRange — local-date cutoff', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps an engagement exactly `days` ago (inclusive) and drops the day before', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 14, 12, 0, 0)); // local noon
    const onCutoff = engagement(P1, '2026-10-07');
    const dayBefore = engagement(P1, '2026-10-06');
    const today = engagement(P1, '2026-10-14');

    expect(filterByDateRange([onCutoff, dayBefore, today], 7)).toEqual([onCutoff, today]);
  });

  it('near local midnight, where the UTC date has already rolled over: the cutoff day is still kept', () => {
    jest.useFakeTimers();
    // 18:00 PDT on Oct 14 is 01:00 UTC on Oct 15. A UTC-derived cutoff would be '2026-10-08'
    // and would drop an engagement stamped (locally) exactly 7 days ago.
    jest.setSystemTime(new Date(2026, 9, 14, 18, 0, 0));
    expect(new Date().toISOString().startsWith('2026-10-15')).toBe(true);

    const onCutoff = engagement(P1, '2026-10-07');
    const dayBefore = engagement(P1, '2026-10-06');

    expect(filterByDateRange([onCutoff, dayBefore], 7)).toEqual([onCutoff]);
  });

  it('crosses a month boundary on the local calendar', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 2, 23, 30, 0)); // Nov 2, 23:30 PST (already Nov 3 UTC)
    const onCutoff = engagement(P1, '2026-10-26');
    const dayBefore = engagement(P1, '2026-10-25');

    expect(filterByDateRange([onCutoff, dayBefore], 7)).toEqual([onCutoff]);
  });
});

describe('calculatePrincipleCounts', () => {
  it('returns every principle in canonical order, with bars scaled to the largest', () => {
    const counts = calculatePrincipleCounts([
      engagement(P1, '2026-10-14'),
      engagement(P1, '2026-10-14'),
      engagement(P3, '2026-10-14'),
    ]);
    expect(counts.map((c) => c.principle)).toEqual(PRINCIPLES.map((p) => p.key));
    expect(counts.map((c) => c.count)).toEqual([2, 0, 1, 0, 0]);
    expect(counts.map((c) => c.percentage)).toEqual([100, 0, 50, 0, 0]);
  });

  it('with no engagements: all zero, no NaN', () => {
    const counts = calculatePrincipleCounts([]);
    expect(counts.every((c) => c.count === 0 && c.percentage === 0)).toBe(true);
  });
});

describe('detectDominantPrinciple — boundaries', () => {
  it('4 total engagements: no insight; 5: insight', () => {
    expect(dominantOf({ [P1]: 4 })).toBeNull();
    expect(dominantOf({ [P1]: 5 })?.principle).toBe(P1);
  });

  it('39% share: no insight; 40%: insight (ratio held clear of 2x)', () => {
    // 39 vs 19/19/19/4 = 100 total
    expect(dominantOf({ [P1]: 39, [P2]: 19, [P3]: 19, [P4]: 19, [P5]: 4 })).toBeNull();
    // 40 vs 15/15/15/15 = 100 total
    const at40 = dominantOf({ [P1]: 40, [P2]: 15, [P3]: 15, [P4]: 15, [P5]: 15 });
    expect(at40?.principle).toBe(P1);
    expect(at40?.percentage).toBe(40);
  });

  it('ratio 1.99 to the runner-up: no insight; 2.0: insight (share held well above 40%)', () => {
    expect(dominantOf({ [P1]: 199, [P2]: 100 })).toBeNull();
    expect(dominantOf({ [P1]: 200, [P2]: 100 })?.principle).toBe(P1);
  });

  it('a tie for the top spot yields NO dominant insight (intended)', () => {
    expect(dominantOf({ [P1]: 5, [P2]: 5 })).toBeNull();
    expect(dominantOf({ [P1]: 10, [P4]: 10 })).toBeNull();
  });

  it('a second-highest of 0 skips the ratio check', () => {
    const result = dominantOf({ [P3]: 6 });
    expect(result).toEqual({ principle: P3, count: 6, percentage: 100 });
  });

  it('no engagements at all: no insight', () => {
    expect(dominantOf({})).toBeNull();
  });
});

describe('isBeginnerUser — boundaries', () => {
  const NOW = new Date(2026, 9, 14, 12, 0, 0);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const startedDaysAgo = (days: number): Date => new Date(NOW.getTime() - days * DAY_MS);

  it('89 days since start: beginner; 90: not', () => {
    expect(isBeginnerUser(startedDaysAgo(89))).toBe(true);
    expect(isBeginnerUser(startedDaysAgo(90))).toBe(false);
  });

  it('89 days 23h 59m is still day 89, hence beginner', () => {
    expect(isBeginnerUser(new Date(NOW.getTime() - (90 * DAY_MS - 60_000)))).toBe(true);
  });

  it('a null start date counts as a beginner', () => {
    expect(isBeginnerUser(null)).toBe(true);
  });
});

describe('PrincipleEngagementChart — rendering', () => {
  const today = (): string => localDate(new Date());
  const todaysEngagements = (principles: StoicPrinciple[]): PrincipleEngagement[] =>
    principles.map((p) => engagement(p, today()));
  const THREE = todaysEngagements([P1, P2, P3]);

  beforeEach(() => {
    mockNavigate.mockClear();
    resetEducationStoreForErasure();
    useStoicPracticeStore.setState({ practiceStartDate: new Date() });
    seedWellnessWriteConsent('granted');
  });

  it('beginner tip shows with 3 or more engagements and beginner status, and Dismiss tip removes it', () => {
    const screen = render(<PrincipleEngagementChart engagements={THREE} />);

    expect(screen.getByLabelText('Dismiss tip')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Dismiss tip'));

    expect(screen.queryByLabelText('Dismiss tip')).toBeNull();
    expect(useEducationStore.getState().dismissedInsightTips).toContain('principle-engagement-beginner');
  });

  it('no beginner tip below 3 engagements', () => {
    const screen = render(<PrincipleEngagementChart engagements={todaysEngagements([P1, P2])} />);
    expect(screen.queryByLabelText('Dismiss tip')).toBeNull();
  });

  it('no beginner tip once the practice start is 90 days back', () => {
    useStoicPracticeStore.setState({ practiceStartDate: new Date(Date.now() - 90 * DAY_MS) });
    const screen = render(<PrincipleEngagementChart engagements={THREE} />);
    expect(screen.queryByLabelText('Dismiss tip')).toBeNull();
  });

  it('a dismissed tip stays dismissed across a re-render', () => {
    act(() => {
      useEducationStore.getState().dismissInsightTip('principle-engagement-beginner');
    });
    const screen = render(<PrincipleEngagementChart engagements={THREE} />);
    expect(screen.queryByLabelText('Dismiss tip')).toBeNull();
  });

  it.each(PRINCIPLES.map((p) => [p.title, p.key] as const))(
    'pressing the %s bar navigates to its module',
    (title, key) => {
      const screen = render(<PrincipleEngagementChart engagements={THREE} />);

      fireEvent.press(screen.getByLabelText(new RegExp(`^${title}: `)));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('ModuleDetail', { moduleId: getModuleIdForPrinciple(key) });
    },
  );
});
