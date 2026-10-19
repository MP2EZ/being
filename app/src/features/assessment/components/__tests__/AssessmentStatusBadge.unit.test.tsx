/**
 * MAINT-774 (TEST-59) — AssessmentStatusBadge pins the 14 / 21 day boundaries and the
 * navigation target.
 *
 * Contract (read from the component):
 * - no completed assessment            -> "Assessment Recommended"
 * - < 14 whole days since the latest   -> renders nothing (the badge is purely actionable)
 * - 14..20 whole days                  -> "Assessment Due Soon"
 * - >= 21 whole days                   -> "Assessment Recommended"
 * - due / recommended badge is a button that opens the standalone PHQ-9 flow
 *
 * Time is pinned through Date.now; completedAt is always NOW - n * 86_400_000.
 */
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

type MockSession = { result?: { completedAt?: number } };
let mockCompleted: MockSession[] = [];

jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: (selector: (s: { completedAssessments: MockSession[] }) => unknown) =>
    selector({ completedAssessments: mockCompleted }),
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AssessmentStatusBadge from '../AssessmentStatusBadge';

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

const sessionAgo = (days: number): MockSession => ({ result: { completedAt: NOW - days * DAY } });

describe('AssessmentStatusBadge', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCompleted = [];
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('with no completed assessment, recommends one', () => {
    const screen = render(<AssessmentStatusBadge />);
    expect(screen.getByText('Assessment Recommended')).toBeTruthy();
    expect(screen.getByText('Complete your first assessment')).toBeTruthy();
  });

  it('ignores sessions that carry no result', () => {
    mockCompleted = [{}, { result: {} }];
    const screen = render(<AssessmentStatusBadge />);
    expect(screen.getByText('Assessment Recommended')).toBeTruthy();
  });

  it('13 days since the last assessment: renders nothing', () => {
    mockCompleted = [sessionAgo(13)];
    const screen = render(<AssessmentStatusBadge />);
    expect(screen.toJSON()).toBeNull();
  });

  it('just under 14 days (13d 23h 59m): still renders nothing', () => {
    mockCompleted = [{ result: { completedAt: NOW - 14 * DAY + 60_000 } }];
    const screen = render(<AssessmentStatusBadge />);
    expect(screen.toJSON()).toBeNull();
  });

  it.each([14, 20])('%i days: "Assessment Due Soon"', (days) => {
    mockCompleted = [sessionAgo(days)];
    const screen = render(<AssessmentStatusBadge />);
    expect(screen.getByText('Assessment Due Soon')).toBeTruthy();
    expect(screen.getByText(`Last completed ${days} days ago`)).toBeTruthy();
    expect(screen.queryByText('Assessment Recommended')).toBeNull();
  });

  it('just under 21 days (20d 23h 59m): still "Assessment Due Soon"', () => {
    mockCompleted = [{ result: { completedAt: NOW - 21 * DAY + 60_000 } }];
    const screen = render(<AssessmentStatusBadge />);
    expect(screen.getByText('Assessment Due Soon')).toBeTruthy();
  });

  it('21 days: "Assessment Recommended"', () => {
    mockCompleted = [sessionAgo(21)];
    const screen = render(<AssessmentStatusBadge />);
    expect(screen.getByText('Assessment Recommended')).toBeTruthy();
    expect(screen.getByText('Last completed 21 days ago')).toBeTruthy();
    expect(screen.queryByText('Assessment Due Soon')).toBeNull();
  });

  it('measures from the most recent session, not the first or the oldest', () => {
    mockCompleted = [sessionAgo(30), sessionAgo(5), sessionAgo(40)];
    const screen = render(<AssessmentStatusBadge />);
    expect(screen.toJSON()).toBeNull();
  });

  it.each([
    ['due', 14],
    ['recommended', 21],
  ])('a %s badge is a button that opens the standalone PHQ-9 flow', (_label, days) => {
    mockCompleted = [sessionAgo(days)];
    const screen = render(<AssessmentStatusBadge />);

    fireEvent.press(screen.getByRole('button'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('AssessmentFlow', {
      assessmentType: 'phq9',
      context: 'standalone',
      allowSkip: false,
    });
  });

  it('with nothing completed the badge is also a button to the same flow', () => {
    const screen = render(<AssessmentStatusBadge />);
    fireEvent.press(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith('AssessmentFlow', {
      assessmentType: 'phq9',
      context: 'standalone',
      allowSkip: false,
    });
  });
});
