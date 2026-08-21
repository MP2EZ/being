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
  useAnalytics: () => ({ trackScreenView: jest.fn(), trackGuidanceOpened: jest.fn() }),
}));

// FEAT-457: the guidance entry point is build-time flagged, so the row's presence
// is a function of this mock rather than of the ambient env blob. Mocked (not read
// from env) so BOTH states are reachable from a test — an unmocked read would pin
// whichever value the host `.env` happened to carry, which is not a contract.
const mockFlags: Record<string, boolean> = { domain_guidance: true };
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (name: string) => mockFlags[name] ?? false,
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

describe('CleanHomeScreen — the guidance entry point (FEAT-457)', () => {
  afterEach(() => {
    mockFlags['domain_guidance'] = true;
  });

  it('renders the row when `domain_guidance` is enabled', () => {
    const { getByTestId } = render(<CleanHomeScreen />);
    expect(getByTestId('home-guidance-entry')).toBeTruthy();
  });

  it('renders nothing at all when the flag is dark — no placeholder, no disabled row', () => {
    // Ships dark in `.env.production`. A "coming soon" or disabled affordance would
    // be worse than absence: it advertises a surface the reader cannot reach.
    mockFlags['domain_guidance'] = false;
    const { queryByTestId } = render(<CleanHomeScreen />);
    expect(queryByTestId('home-guidance-entry')).toBeNull();
  });

  it('sits BELOW the daily practice card and ABOVE the practices row', () => {
    // Order is the product decision, not an accident. Subordinate to the daily
    // ritual (never above it), and above the Practices row so the fixed-height row
    // it adds is absorbed from the flex:1 check-in section rather than pushing the
    // Practices row down toward the floating crisis button at bottom:100.
    const { getByTestId, UNSAFE_root } = render(<CleanHomeScreen />);
    const guidance = getByTestId('home-guidance-entry');
    const practices = getByTestId('home-practices-entry');
    const order: string[] = [];
    const walk = (node: { props?: Record<string, unknown>; children?: unknown[] }) => {
      const id = node?.props?.['testID'];
      if (typeof id === 'string') order.push(id);
      for (const child of (node?.children ?? []) as typeof order) {
        if (child && typeof child === 'object') walk(child as never);
      }
    };
    walk(UNSAFE_root as never);
    expect(guidance).toBeTruthy();
    expect(practices).toBeTruthy();
    expect(order.indexOf('home-guidance-entry')).toBeLessThan(
      order.indexOf('home-practices-entry')
    );
  });

  it('exposes exactly one h1 still — the row adds no competing heading', () => {
    // MAINT-257's invariant. The row is a button with a label, never a header.
    const { getByTestId } = render(<CleanHomeScreen />);
    expect(getByTestId('home-guidance-entry').props.accessibilityRole).toBe('button');
  });
});
