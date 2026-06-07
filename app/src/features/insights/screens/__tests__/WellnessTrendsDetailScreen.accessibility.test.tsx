/**
 * WellnessTrendsDetailScreen accessibility tests (FEAT-196).
 *
 * This is a safety surface. These tests pin the user-visible a11y contract for
 * the NEW chrome the screen adds around the reused (already-tested)
 * WellnessScreeningTrends component:
 * - the back control is a labelled, ≥44pt button that goes back,
 * - the screen title is an accessibility header,
 * - the always-reachable crisis button renders (988 < 3 taps),
 * - fullHistory is passed through so the accessible list shows every check-in.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type {
  AssessmentSession,
  AssessmentType,
  PHQ9Result,
  GAD7Result,
} from '@/features/assessment/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useFocusEffect: (cb: () => void) => cb(),
}));

const mockTrackScreenView = jest.fn();
jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackScreenView: mockTrackScreenView }),
  // FEAT-195 — notes ship dark; this screen exercises the flag-off contract.
  useFeatureFlag: () => false,
}));

// react-native-svg isn't in the jest transform allowlist; mock as host components
// so the embedded chart renders (mirrors WellnessScreeningTrends.test.tsx).
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
    Line: () => null,
    Rect: () => null,
    Text: ({ children }: { children?: React.ReactNode }) =>
      ReactLib.createElement(Text, null, children),
  };
});

// Inject the assessment history via the store selector.
let mockSessions: AssessmentSession[] = [];
jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: (selector: (s: { completedAssessments: AssessmentSession[] }) => unknown) =>
    selector({ completedAssessments: mockSessions }),
}));

import WellnessTrendsDetailScreen from '../WellnessTrendsDetailScreen';

// ── fixtures ────────────────────────────────────────────────────────────────

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

describe('WellnessTrendsDetailScreen accessibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessions = [session('phq9', 8, 'mild', 20), session('phq9', 11, 'moderate', 2)];
  });

  it('tracks the screen view by name (never score values)', () => {
    render(<WellnessTrendsDetailScreen />);
    expect(mockTrackScreenView).toHaveBeenCalledWith('WellnessTrendsDetailScreen');
  });

  describe('back control', () => {
    it('is a labelled button that meets the ≥44pt target', () => {
      const { getByLabelText } = render(<WellnessTrendsDetailScreen />);
      const back = getByLabelText('Back to Insights');
      expect(back.props.accessibilityRole).toBe('button');
      const flat = StyleSheet.flatten(back.props.style);
      expect(flat.minHeight).toBeGreaterThanOrEqual(44);
    });

    it('goes back when pressed', () => {
      const { getByLabelText } = render(<WellnessTrendsDetailScreen />);
      fireEvent.press(getByLabelText('Back to Insights'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('marks the screen title as an accessibility header', () => {
    const { getByText } = render(<WellnessTrendsDetailScreen />);
    const title = getByText('Full Wellness Screening Trends');
    expect(title.props.accessibilityRole).toBe('header');
  });

  it('always renders the reachable crisis button (988 path)', () => {
    const { getByTestId } = render(<WellnessTrendsDetailScreen />);
    expect(getByTestId('crisis-wellness-trends-detail')).toBeTruthy();
  });

  it('renders the embedded non-dismissible disclaimer with its 988 tap target', () => {
    const { getByText, getByLabelText } = render(<WellnessTrendsDetailScreen />);
    expect(getByText(/wellness screening tools for personal awareness/i)).toBeTruthy();
    expect(getByLabelText('Call or text 988 for immediate support')).toBeTruthy();
  });

  it('passes fullHistory so the accessible list shows every check-in', () => {
    // 80 check-ins > the 60-point downsample cap; fullHistory must list them all.
    mockSessions = Array.from({ length: 80 }, (_, i) =>
      session('phq9', (i % 27) + 0, 'mild', 80 - i)
    );
    const { getAllByLabelText } = render(<WellnessTrendsDetailScreen />);
    expect(getAllByLabelText(/: score \d+ of 27, .+ range\.$/)).toHaveLength(80);
  });

  it('shows a neutral, no-pressure empty state when there is no history', () => {
    mockSessions = [];
    const { getByText, queryByTestId } = render(<WellnessTrendsDetailScreen />);
    expect(getByText(/No screenings yet/i)).toBeTruthy();
    // Crisis button stays reachable even with no history.
    expect(queryByTestId('crisis-wellness-trends-detail')).toBeTruthy();
  });
});
