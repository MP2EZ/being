/**
 * CleanHomeScreen — the single daily practice entry (FEAT-298 slice 5).
 *
 * Rewritten from the FEAT-291 flag-state test. The `daily_loop` / `daily_loop_only` flags
 * and the three time-of-day cards are retired: Home now shows ONE indistinguishable
 * "Daily Practice" button, per the founder's recorded TENSED decision. The tense is
 * inferred from the clock inside the navigator and is never surfaced here, so there is no
 * mode choice on this screen to assert.
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

import CleanHomeScreen from '../CleanHomeScreen';

describe('CleanHomeScreen — the single daily practice (FEAT-298 slice 5)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders exactly one practice card, titled "Daily Practice"', () => {
    const { getByText } = render(<CleanHomeScreen />);
    expect(getByText('Daily Practice')).toBeTruthy();
  });

  it('drops the "(Beta)" tag — the loop is the real default, not a preview', () => {
    const { queryByText } = render(<CleanHomeScreen />);
    expect(queryByText(/Daily Practice \(Beta\)/i)).toBeNull();
  });

  it('no longer renders the three time-of-day cards', () => {
    const { queryByText } = render(<CleanHomeScreen />);
    expect(queryByText('Morning Awareness')).toBeNull();
    expect(queryByText('Midday Reset')).toBeNull();
    expect(queryByText('Evening Reflection')).toBeNull();
  });

  it('navigates to DailyLoop with NO mode param — the tense comes from the clock', () => {
    const { getByLabelText } = render(<CleanHomeScreen />);
    fireEvent.press(getByLabelText(/Daily Practice check-in/i));
    // A mode argument here would re-introduce a user-facing tense choice, which the
    // TENSED decision explicitly rejected ("one indistinguishable button").
    expect(mockNavigate).toHaveBeenCalledWith('DailyLoop');
  });

  it('surfaces no tense or mode wording to the user', () => {
    const { queryByText } = render(<CleanHomeScreen />);
    for (const word of [/\bFlat\b/, /Prospective/i, /Retrospective/i]) {
      expect(queryByText(word)).toBeNull();
    }
  });
});
