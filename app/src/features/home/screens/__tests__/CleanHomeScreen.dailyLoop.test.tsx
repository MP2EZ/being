/**
 * CleanHomeScreen — FEAT-291 daily-loop entry (flag on/off).
 *
 * Pins the build-time `daily_loop` gate on the Home entry:
 *  - flag OFF → the 3-card layout is unchanged (no "Daily Practice (Beta)" card),
 *  - flag ON  → a 4th card appears and navigates to the DailyLoop route.
 * Both flag states are exercised (AC requirement).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackScreenView: jest.fn() }),
}));

jest.mock('@/features/practices/stores/stoicPracticeStore', () => {
  const state = { isCheckInCompletedToday: () => false };
  return {
    useStoicPracticeStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

jest.mock('@/core/stores/settingsStore', () => {
  const state = { getLastActiveTimestamp: () => Date.now() };
  return {
    useSettingsStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
    useAccessibilitySettings: () => ({ reducedMotion: true }),
  };
});

jest.mock('@/features/assessment/components/AssessmentStatusBadge', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/IntroOverlay', () => ({
  __esModule: true,
  IntroOverlay: () => null,
  default: () => null,
}));

// Controllable build-time flag (prefixed `mock` per jest's factory scope rule).
let mockDailyLoopOn = false;
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (key: string) => (key === 'daily_loop' ? mockDailyLoopOn : false),
}));

import CleanHomeScreen from '../CleanHomeScreen';

const BETA = /Daily Practice \(Beta\)/i;

describe('CleanHomeScreen — daily_loop entry', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockDailyLoopOn = false;
  });

  it('flag OFF: renders the unchanged 3-card layout with no beta card', () => {
    const { queryByText, getByText } = render(<CleanHomeScreen />);
    expect(queryByText(BETA)).toBeNull();
    // The three legacy flows remain.
    expect(getByText('Morning Awareness')).toBeTruthy();
    expect(getByText('Midday Reset')).toBeTruthy();
    expect(getByText('Evening Reflection')).toBeTruthy();
  });

  it('flag ON: renders the beta card and navigates to DailyLoop on press', () => {
    mockDailyLoopOn = true;
    const { getByText, getByLabelText } = render(<CleanHomeScreen />);
    expect(getByText(BETA)).toBeTruthy();
    // The three legacy flows are still present alongside it.
    expect(getByText('Morning Awareness')).toBeTruthy();

    fireEvent.press(getByLabelText(/Daily Practice \(Beta\) check-in/i));
    expect(mockNavigate).toHaveBeenCalledWith('DailyLoop');
  });
});
