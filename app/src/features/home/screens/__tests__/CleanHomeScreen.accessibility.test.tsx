/**
 * CleanHomeScreen accessibility tests (MAINT-257).
 *
 * Pins the harmonized heading idiom for the Home tab: the "Being" brand wordmark
 * is the SINGLE screen heading (accessibilityRole="header", level 1), and the
 * time-of-day greeting below it is a PLAIN text line — not a heading. MAINT-257
 * demoted the greeting from a level-2 header so every tab screen exposes exactly
 * one h1 (matching InsightsScreen.accessibility.test.tsx). Guards against the
 * greeting silently regaining heading semantics.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

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
    // reducedMotion=true → shouldShowIntroInitially=false, so the intro overlay
    // never gates the header in the test.
    useAccessibilitySettings: () => ({ reducedMotion: true }),
  };
});

jest.mock('@/features/crisis/components/CollapsibleCrisisButton', () => ({
  __esModule: true,
  CollapsibleCrisisButton: () => null,
}));

jest.mock('@/features/assessment/components/AssessmentStatusBadge', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/IntroOverlay', () => ({
  __esModule: true,
  IntroOverlay: () => null,
  default: () => null,
}));

import CleanHomeScreen from '../CleanHomeScreen';

describe('CleanHomeScreen accessibility (MAINT-257)', () => {
  it('marks the "Being" brand title as a level-1 accessibility header', () => {
    const { getByText } = render(<CleanHomeScreen />);
    const title = getByText('Being');
    expect(title.props.accessibilityRole).toBe('header');
    expect(title.props.accessibilityLevel).toBe(1);
  });

  it('renders the greeting as plain text, NOT a heading (single h1 per screen)', () => {
    const { getByText } = render(<CleanHomeScreen />);
    // getGreeting() returns one of these depending on the host clock.
    const greeting = getByText(/Good (morning|afternoon|evening)/);
    expect(greeting.props.accessibilityRole).toBeUndefined();
    expect(greeting.props.accessibilityLevel).toBeUndefined();
  });
});

describe('CleanHomeScreen safe-area edges (MAINT-456)', () => {
  // Pins the VALUE, never the pixels: the safe-area-context jest mock holds every
  // inset at zero, so no test here can observe an edges value having a layout
  // effect. Home is tab-hosted and React Navigation reserves the tab bar's height,
  // so claiming `bottom` would re-add the ~34pt dead band MAINT-456 measured and
  // removed. `edges` must stay explicit — omitting it silently claims all four.
  it('claims only the top edge, matching InsightsScreen', () => {
    const { getByTestId } = render(<CleanHomeScreen />);
    expect(getByTestId('home-screen').props.edges).toEqual(['top']);
  });
});
