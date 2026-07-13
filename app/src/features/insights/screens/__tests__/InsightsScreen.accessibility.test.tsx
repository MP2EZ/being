/**
 * InsightsScreen accessibility tests (DEBUG-223).
 *
 * Pins the user-visible a11y contract for the Insights page title: it must be
 * an accessibility header at level 1, matching the Home (CleanHomeScreen) and
 * Learn (LearnScreen) page-title idiom. Without it, a screen-reader user gets no
 * heading landmark for the screen — a WCAG regression this test guards against.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackScreenView: jest.fn() }),
  useFeatureFlag: () => false,
}));

// react-native-svg isn't in the jest transform allowlist; mock as host
// components so the embedded charts render (mirrors the sibling a11y test).
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

// Stores the screen (and its embedded charts) read. The practice store is
// consumed both with a selector (InsightsScreen) and bare (PrincipleEngagementChart),
// so the mock returns the slice when given a selector and the full state otherwise.
jest.mock('@/features/practices/stores/stoicPracticeStore', () => {
  const state = {
    getCheckInHistory: () => [],
    getPrincipleEngagements: () => [],
    checkInCompletions: [],
    principleEngagements: [],
    practiceStartDate: null,
    getWeeklyReflectionForWeek: () => undefined,
    weeklyReflections: [],
    addWeeklyReflection: () => {},
  };
  return {
    useStoicPracticeStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

jest.mock('@/features/assessment/stores/assessmentStore', () => ({
  useAssessmentStore: (selector: (s: { completedAssessments: unknown[] }) => unknown) =>
    selector({ completedAssessments: [] }),
}));

// PrincipleEngagementChart (FEAT-133) reads dismissed-tip state.
jest.mock('@/features/learn/stores/educationStore', () => ({
  useEducationStore: () => ({
    dismissInsightTip: jest.fn(),
    dismissedInsightTips: [],
  }),
}));

import InsightsScreen from '../InsightsScreen';

describe('InsightsScreen accessibility', () => {
  it('marks the screen title as a level-1 accessibility header', () => {
    const { getByText } = render(<InsightsScreen />);
    const title = getByText('Insights');
    expect(title.props.accessibilityRole).toBe('header');
    expect(title.props.accessibilityLevel).toBe(1);
  });
});
