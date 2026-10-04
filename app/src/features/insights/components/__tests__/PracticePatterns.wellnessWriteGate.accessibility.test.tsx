/**
 * Insights' practice cards under the Art. 9 write gate (FEAT-669, the FEAT-667 remainder).
 *
 * Founder ruling: while practice writes are withheld, DotCalendar and
 * PrincipleEngagementChart each keep their card and title and show one static line in
 * place of the chart. A chart there would show either nothing or a tally that lasts only
 * as long as the process. Crisis ruling: the blocked card has no touchables at all (no
 * time-range tabs, no tappable bars, no dismissible tip), and a consent change while the
 * tab stays mounted must swap the child rather than change a hook count, which would
 * throw into RootCrisisBoundary. `loading` is not a withdrawal.
 *
 * `.accessibility.` so `npm run test:accessibility` runs it.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';
import DotCalendar from '../DotCalendar';
import PrincipleEngagementChart from '../PrincipleEngagementChart';
import { PRACTICE_PATTERNS_NOT_RECORDED } from '../practicePatternsNotice';
import {
  seedWellnessWriteConsent,
  type SeededWellnessWriteConsent,
} from '../../../../../__tests__/helpers/wellnessWriteConsent';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('@/features/practices/stores/stoicPracticeStore', () => {
  const state = { practiceStartDate: new Date() };
  return {
    useStoicPracticeStore: (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
  };
});

jest.mock('@/features/learn/stores/educationStore', () => ({
  useEducationStore: () => ({ dismissInsightTip: jest.fn(), dismissedInsightTips: [] }),
}));

const today = (): string => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
};

const CHECK_INS = [{ type: 'morning' as const, completedAt: new Date(), date: today() }];
const ENGAGEMENTS = Array.from({ length: 6 }, () => ({
  principle: 'aware_presence' as const,
  flowType: 'morning' as const,
  engagementType: 'applied' as const,
  date: today(),
  timestamp: new Date(),
}));

const CARDS = [
  {
    name: 'DotCalendar',
    title: 'Your Practice Rhythm',
    blockedId: 'dot-calendar-not-recorded',
    chartText: /Practice appears on|No practice recorded yet/,
    renderCard: () => <DotCalendar checkInHistory={CHECK_INS as never} />,
  },
  {
    name: 'PrincipleEngagementChart',
    title: 'Principle Embodiment',
    blockedId: 'principle-engagement-not-recorded',
    chartText: /How often each principle appears/,
    renderCard: () => <PrincipleEngagementChart engagements={ENGAGEMENTS as never} />,
  },
];

const BLOCKED: SeededWellnessWriteConsent[] = ['refused', 'revoked', 'under_age', 'missing'];

describe.each(CARDS)('$name', ({ title, blockedId, chartText, renderCard }) => {
  it.each(BLOCKED)('blocked (%s): title and the static line, no chart and no touchables', (reason) => {
    seedWellnessWriteConsent(reason);
    const screen = render(renderCard());
    expect(screen.getByTestId(blockedId)).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(PRACTICE_PATTERNS_NOT_RECORDED)).toBeTruthy();
    expect(screen.queryByText(chartText)).toBeNull();
    for (const role of ['tab', 'button', 'link'] as const) {
      expect({ role, count: screen.queryAllByRole(role).length }).toEqual({ role, count: 0 });
    }
  });

  it.each<SeededWellnessWriteConsent>(['granted', 'loading'])('%s: the chart renders as before', (state) => {
    seedWellnessWriteConsent(state);
    const screen = render(renderCard());
    expect(screen.queryByTestId(blockedId)).toBeNull();
    expect(screen.queryByText(chartText)).not.toBeNull();
    // Positive control for the touchables assertion above: the chart's tabs are found.
    expect(screen.queryAllByRole('tab').length).toBeGreaterThan(0);
  });

  it('swaps on a consent change while mounted, without throwing', () => {
    seedWellnessWriteConsent('refused');
    const screen = render(renderCard());
    expect(screen.getByTestId(blockedId)).toBeTruthy();
    act(() => seedWellnessWriteConsent('granted'));
    expect(screen.queryByTestId(blockedId)).toBeNull();
    act(() => seedWellnessWriteConsent('revoked'));
    expect(screen.getByTestId(blockedId)).toBeTruthy();
  });
});

it('the copy is true for every reason and carries no CTA, safety or principle wording', () => {
  expect(PRACTICE_PATTERNS_NOT_RECORDED).toMatch(/aren't recorded/);
  expect(PRACTICE_PATTERNS_NOT_RECORDED).not.toMatch(
    /\b(chose|choice|choose|declin\w*|refus\w*|settings?|tap|988|crisis|support|safety|help|let go|accept\w*|control)\b/i,
  );
  // DEBUG-390: the matcher fires on the line it replaced.
  expect("Practice patterns aren't recorded here, in line with your wellness data choice.").toMatch(/\bchoice\b/i);
});
