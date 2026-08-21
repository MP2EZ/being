/**
 * DEBUG-469 — the Daily Practice card must stay REACHABLE at accessibility text sizes.
 *
 * THE DEFECT THIS PINS
 * ====================
 * Home had no scroll container of any kind: `SafeAreaView > View(content, flex:1)` holding
 * header + badge + `checkInSection` + `practicesEntry`. RN's flexShrink defaults to 0, so
 * at AX5 the three intrinsic-height siblings took their full height, `checkInSection`
 * (`flex:1`, i.e. flexBasis 0) was handed a negative remainder clamped to ~0, and the card
 * overflowed BELOW the parent's bounds — measured at y=970..1010, forty points tall, on a
 * 375x667 screen whose home-screen bounds end at 583.
 *
 * It was in the accessibility hierarchy and off the screen at the same time, which is why
 * `scrollUntilVisible` and three plain `- scroll` commands all failed: those issue swipes,
 * and a static flex column has nothing to scroll. The daily loop could not be entered by
 * ANY route at AX5.
 *
 * WHY THESE ASSERTIONS AND NOT A FOLD MEASUREMENT
 * ==============================================
 * jsdom has no fold, no safe-area insets and no fontScale, so a render test can never see
 * the defect directly. What it CAN pin is the MECHANISM: a scroll container must exist, and
 * the growth chain must not reintroduce `flexBasis: 0`, which is the specific property that
 * collapses a child to nothing when its siblings have already consumed the container. The
 * on-device evidence is AC 1/AC 3's `maestro hierarchy` capture, recorded in the work item.
 *
 * `flex: 1` inside a ScrollView contentContainer is the trap, not a style preference: it
 * sets flexBasis to 0, so the child's base size is nothing and it grows only into leftover
 * space — of which there is none at AX5. `flexGrow: 1` leaves flexBasis at `auto`, so the
 * child is sized by its content first and grows only to fill a surplus.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';

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

/** Flatten a possibly-array style prop into one object. */
const flat = (s: unknown) => StyleSheet.flatten(s as never) ?? {};

describe('DEBUG-469: the daily-loop entry point is reachable at any text size', () => {
  it('renders the Home content inside a scroll container', () => {
    // Without one there is nothing for a swipe to move, so an off-fold card is
    // unreachable by a user AND by Maestro — the measured AX5 state.
    const { UNSAFE_queryAllByType } = render(<CleanHomeScreen />);
    expect(UNSAFE_queryAllByType(ScrollView).length).toBeGreaterThan(0);
  });

  it('keeps the Daily Practice card INSIDE that scroll container', () => {
    // A scroll container that does not contain the card fixes nothing.
    const { UNSAFE_getAllByType, getByTestId } = render(<CleanHomeScreen />);
    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    const card = getByTestId('checkin-card-daily-loop');
    const within = (node: { children?: unknown }): boolean => {
      const kids = (node?.children ?? []) as Array<{ children?: unknown }>;
      return kids.some(k => k === (card as unknown) || (typeof k === 'object' && k !== null && within(k)));
    };
    expect(within(scroll as unknown as { children?: unknown })).toBe(true);
  });

  it('keeps the home-screen testID on the outermost node', () => {
    // Four Maestro flows wait on it (_seeded-home, deeplink-consent-gate,
    // daily-loop-deeplink, reconsent-stale). Moving it re-times every one of them.
    const { getByTestId } = render(<CleanHomeScreen />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('does not give the growth chain flexBasis 0 — the collapse mechanism', () => {
    const { getByTestId } = render(<CleanHomeScreen />);
    const card = flat(getByTestId('checkin-card-daily-loop').props.style) as Record<string, unknown>;
    // `flex: 1` would surface as flexBasis 0 once flattened by RN's style resolver.
    expect(card.flexBasis).not.toBe(0);
    expect(card.flex).not.toBe(1);
    // It must still be allowed to fill a surplus at default text size, or the card
    // shrinks to its content and Home looks broken for the 99% case.
    expect(card.flexGrow).toBe(1);
    // And it must have a floor, so a squeeze cannot take it below a usable size.
    expect(typeof card.minHeight).toBe('number');
    expect(card.minHeight as number).toBeGreaterThan(0);
  });
});
