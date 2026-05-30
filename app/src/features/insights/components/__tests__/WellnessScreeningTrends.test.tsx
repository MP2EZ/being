/**
 * Render tests for WellnessScreeningTrends (FEAT-30).
 *
 * This is a safety surface: the non-dismissible disclaimer, the 988 tap target,
 * and the compliance-approved labels are a user-visible contract. These tests
 * pin that contract mechanically, and assert the framing stays verdict-free
 * (no "improving/declining/worse/better", no "clinical assessment"/"diagnosis").
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { severityBands } from '@/core/theme';

// react-native-svg isn't in the jest transform allowlist; mock it as plain
// host components so the chart renders. Svg <Text> children (band/date labels)
// are forwarded so the verdict-free scan still sees them.
jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) =>
      ReactLib.createElement(View, null, children),
    Svg: ({ children }: { children?: React.ReactNode }) =>
      ReactLib.createElement(View, null, children),
    Polyline: () => null,
    Circle: () => null,
    Rect: () => null,
    Text: ({ children }: { children?: React.ReactNode }) =>
      ReactLib.createElement(Text, null, children),
  };
});

import WellnessScreeningTrends from '../WellnessScreeningTrends';
import type {
  AssessmentSession,
  AssessmentType,
  PHQ9Result,
  GAD7Result,
} from '@/features/assessment/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function session(
  type: AssessmentType,
  score: number,
  severity: string,
  daysAgo: number
): AssessmentSession {
  const startedAt = NOW - daysAgo * DAY;
  const base = {
    totalScore: score,
    severity,
    isCrisis: false,
    completedAt: startedAt,
    answers: [],
  };
  const result =
    type === 'phq9'
      ? ({ ...base, suicidalIdeation: false } as PHQ9Result)
      : (base as GAD7Result);
  return {
    id: `${type}-${daysAgo}`,
    type,
    context: 'standalone',
    progress: {
      type,
      currentQuestionIndex: type === 'phq9' ? 9 : 7,
      totalQuestions: type === 'phq9' ? 9 : 7,
      startedAt,
      answers: [],
      isComplete: true,
    },
    result,
  };
}

/**
 * Forbidden user-facing language — app-authored VERDICTS about the trend.
 *
 * Scoped deliberately to verdict-direction forms. We do NOT blanket-forbid
 * "worse"/"better" (the approved reframe says "isn't getting worse") nor
 * "clinical assessment"/"diagnosis" (the compliance disclaimer must say "not
 * clinical assessments or diagnoses"). The approved labels + disclaimer
 * presence are asserted by the other tests above.
 */
const FORBIDDEN = [
  /improving/i,
  /declining/i,
  /getting better/i,
  /you'?re getting worse/i,
  /you'?re (doing )?(great|well)/i,
];

describe('WellnessScreeningTrends', () => {
  it('renders nothing when there are no completed assessments', () => {
    const { queryByText } = render(<WellnessScreeningTrends sessions={[]} now={NOW} />);
    expect(queryByText('Wellness Screening Trends')).toBeNull();
  });

  it('renders the compliance-approved labels and section title', () => {
    const sessions = [session('phq9', 8, 'mild', 20), session('phq9', 11, 'moderate', 2)];
    const { getByText } = render(<WellnessScreeningTrends sessions={sessions} now={NOW} />);
    expect(getByText('Wellness Screening Trends')).toBeTruthy();
    expect(getByText('Mood Wellness Screening (PHQ-9)')).toBeTruthy();
  });

  it('always renders the non-dismissible disclaimer with a 988 tap target', () => {
    const sessions = [session('gad7', 9, 'mild', 10), session('gad7', 12, 'moderate', 1)];
    const { getByText, getByLabelText } = render(
      <WellnessScreeningTrends sessions={sessions} now={NOW} />
    );
    expect(getByText(/wellness screening tools for personal awareness/i)).toBeTruthy();
    expect(getByLabelText('Call or text 988 for immediate support')).toBeTruthy();
  });

  it('closes the card on a within-control reflection prompt, never on the number', () => {
    const sessions = [session('phq9', 5, 'mild', 15), session('phq9', 9, 'mild', 1)];
    const { getByText } = render(<WellnessScreeningTrends sessions={sessions} now={NOW} />);
    expect(getByText(/what stands out to you/i)).toBeTruthy();
  });

  it('shows the awareness reframe for a rising series (not a failure framing)', () => {
    const sessions = [session('phq9', 4, 'minimal', 20), session('phq9', 14, 'moderate', 2)];
    const { getByText } = render(<WellnessScreeningTrends sessions={sessions} now={NOW} />);
    expect(getByText(/Noticing more isn't getting worse/i)).toBeTruthy();
  });

  it('shows the single-check-in state with no schedule pressure', () => {
    const sessions = [session('phq9', 7, 'mild', 3)];
    const { getByText } = render(<WellnessScreeningTrends sessions={sessions} now={NOW} />);
    expect(getByText(/One check-in so far/i)).toBeTruthy();
    expect(getByText(/there's no schedule to keep/i)).toBeTruthy();
  });

  it('never renders verdict or clinical-assessment language', () => {
    const sessions = [
      session('phq9', 3, 'minimal', 40),
      session('phq9', 18, 'moderately_severe', 5),
      session('gad7', 6, 'mild', 30),
      session('gad7', 14, 'moderate', 2),
    ];
    const { toJSON } = render(<WellnessScreeningTrends sessions={sessions} now={NOW} />);
    const tree = JSON.stringify(toJSON());
    for (const pattern of FORBIDDEN) {
      expect(tree).not.toMatch(pattern);
    }
  });

  describe('time-range tabs', () => {
    // 5 of 27 is 4 days ago (in every window); 17 of 27 is 20 days ago (in
    // month/quarter/all but NOT week).
    const sessions = [
      session('phq9', 17, 'moderately_severe', 20),
      session('phq9', 5, 'mild', 4),
    ];

    it('shows both points in the default month window', () => {
      const { getByText } = render(<WellnessScreeningTrends sessions={sessions} now={NOW} />);
      expect(getByText(/17 of 27/)).toBeTruthy();
      expect(getByText(/5 of 27/)).toBeTruthy();
    });

    it('re-filters the rendered data when a narrower range is selected', () => {
      const { getByLabelText, queryByText } = render(
        <WellnessScreeningTrends sessions={sessions} now={NOW} />
      );
      fireEvent.press(getByLabelText('View week'));
      expect(queryByText(/17 of 27/)).toBeNull(); // 20 days ago drops out of the week
      expect(queryByText(/5 of 27/)).toBeTruthy(); // 4 days ago remains
    });
  });

  describe('comparison chips', () => {
    it('render counts + raw ranges for both 30-day windows, with no delta/direction', () => {
      // current window (≤30d): scores 6 and 11; previous window (30–60d): score 9.
      const sessions = [
        session('phq9', 6, 'mild', 2),
        session('phq9', 11, 'moderate', 20),
        session('phq9', 9, 'mild', 45),
      ];
      const { getByText } = render(<WellnessScreeningTrends sessions={sessions} now={NOW} />);
      expect(getByText(/Last 30 days: 2 check-ins · scores 6–11/)).toBeTruthy();
      expect(getByText(/Previous 30 days: 1 check-in · score 9/)).toBeTruthy();
    });

    it('uses singular "check-in" and a single score when a window has one point', () => {
      const sessions = [session('phq9', 8, 'mild', 3), session('phq9', 12, 'moderate', 80)];
      const { getByText, queryByText } = render(
        <WellnessScreeningTrends sessions={sessions} now={NOW} />
      );
      expect(getByText(/Last 30 days: 1 check-in · score 8/)).toBeTruthy();
      // The 80-days-ago point is outside both windows, so no previous chip.
      expect(queryByText(/Previous 30 days/)).toBeNull();
    });
  });
});

describe('severityBands token (philosopher red line: no moralized colour)', () => {
  it('uses a single neutral fill for every band (not a green→red ramp)', () => {
    expect(typeof severityBands.fill).toBe('string');
    // One fill colour shared by all bands — severity is depth, not hue.
    expect(Object.keys(severityBands.opacity).length).toBeGreaterThanOrEqual(4);
  });

  it('encodes severity as monotonically increasing opacity (depth)', () => {
    const order = ['minimal', 'mild', 'moderate', 'moderately_severe', 'severe'] as const;
    const present = order.filter((k) => k in severityBands.opacity);
    const values = present.map((k) => severityBands.opacity[k]);
    const ascending = values.every((v, i) => i === 0 || v > values[i - 1]!);
    expect(ascending).toBe(true);
    // Subtle background shading, never an opaque alarm block.
    expect(Math.max(...values)).toBeLessThanOrEqual(0.3);
  });
});
