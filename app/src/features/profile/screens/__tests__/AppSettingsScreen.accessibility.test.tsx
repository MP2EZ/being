/**
 * FEAT-285 — AppSettingsScreen accessibility contract.
 *
 * Two things are pinned here.
 *
 * The NEW practices toggles, and in particular the interval sub-setting's
 * disabled treatment: it stays rendered and announced when the master is off,
 * rather than disappearing. Removing a row from the swipe order on toggle is a
 * context change on input (WCAG 3.2.2) and, worse, makes the sub-setting
 * undiscoverable to a blind user — who cannot know a row exists to be revealed.
 *
 * The EXISTING five switches, retrofitted. Their labels lived in sibling <Text>
 * nodes, and RN does not associate a sibling Text with a Switch on iOS, so
 * VoiceOver announced each as an unnamed "switch button, on" — a WCAG 4.1.2
 * Name/Role/Value Level A failure. These assertions stop it regressing.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import AppSettingsScreen from '@/features/profile/screens/AppSettingsScreen';
import { useSettingsStore } from '@/core/stores/settingsStore';

// The screen calls useFocusEffect, which needs a navigation container. These
// assertions are about rendered a11y props, not navigation, so stub it out.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(() => cb(), []);
  },
  useIsFocused: () => true,
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackSettingsOpened: jest.fn(),
  }),
}));

jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: jest.fn(() => true),
}));

const BASE_SETTINGS = {
  userId: 'test-user',
  notifications: {
    checkInReminders: true,
    breathingReminders: false,
    valuesReflectionPrompts: false,
  },
  privacy: { analyticsEnabled: false },
  accessibility: { textSize: 'medium' as const, reducedMotion: false, highContrast: false },
  practices: {
    practiceHaptics: false,
    practiceHapticsInterval: 'none' as const,
    practiceHapticsPrompted: false,
  },
  onboardingCompleted: true,
  appVersion: '1.0.0',
  updatedAt: 0,
  lastActiveTimestamp: null,
};

function seed(overrides: Partial<typeof BASE_SETTINGS.practices> = {}) {
  useSettingsStore.setState({
    settings: { ...BASE_SETTINGS, practices: { ...BASE_SETTINGS.practices, ...overrides } },
    isLoading: false,
    error: null,
    loadSettings: jest.fn(async () => null),
  } as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  seed();
});

describe('practices master toggle', () => {
  it('announces as a switch with a name', async () => {
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));
    const toggle = getByTestId('haptics-master-toggle');

    expect(toggle.props.accessibilityRole).toBe('switch');
    expect(toggle.props.accessibilityLabel).toBe('Haptic cues in practices');
    expect(toggle.props.accessible).toBe(true);
  });

  it('reports state via `checked`, not `selected`', async () => {
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));
    const state = getByTestId('haptics-master-toggle').props.accessibilityState;

    // `selected` is silent on a switch role — the state would never be spoken.
    expect(state.checked).toBe(false);
    expect(state.selected).toBeUndefined();
  });

  it('reflects an enabled preference in the announced state', async () => {
    seed({ practiceHaptics: true });
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    expect(getByTestId('haptics-master-toggle').props.accessibilityState.checked).toBe(true);
  });

  it('carries a hint describing what the vibration marks', async () => {
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    expect(getByTestId('haptics-master-toggle').props.accessibilityHint).toMatch(/vibration/i);
  });
});

describe('interval sub-setting', () => {
  it('stays RENDERED when the master toggle is off', async () => {
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    expect(getByTestId('haptics-interval-toggle')).toBeTruthy();
  });

  it('announces itself as disabled rather than vanishing', async () => {
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-interval-toggle'));

    expect(getByTestId('haptics-interval-toggle').props.accessibilityState).toEqual(
      expect.objectContaining({ checked: false, disabled: true })
    );
  });

  it('explains WHY it is disabled, in the hint', async () => {
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-interval-toggle'));

    // iOS reads `disabled` as "dimmed" — which says off-limits, but not why.
    expect(getByTestId('haptics-interval-toggle').props.accessibilityHint).toBe(
      'Available when haptic cues are on'
    );
  });

  it('keeps the SAME label when disabled', async () => {
    const { getByTestId, rerender } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-interval-toggle'));
    const labelWhenOff = getByTestId('haptics-interval-toggle').props.accessibilityLabel;

    seed({ practiceHaptics: true });
    rerender(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-interval-toggle'));

    // A mutating label breaks find-by-name and VoiceOver rotor search.
    expect(getByTestId('haptics-interval-toggle').props.accessibilityLabel).toBe(labelWhenOff);
  });

  it('becomes enabled and re-hints once the master is on', async () => {
    seed({ practiceHaptics: true });
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-interval-toggle'));
    const toggle = getByTestId('haptics-interval-toggle');

    expect(toggle.props.accessibilityState.disabled).toBe(false);
    expect(toggle.props.accessibilityHint).toMatch(/each minute/i);
  });

  it('preserves a prior interval choice while the master is off', async () => {
    // Turning the master off must not silently rewrite the sub-choice, or
    // turning it back on would quietly lose what the user picked.
    seed({ practiceHaptics: false, practiceHapticsInterval: 'minute' });
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-interval-toggle'));

    expect(getByTestId('haptics-interval-toggle').props.accessibilityState.checked).toBe(true);
  });
});

describe('retrofitted switches — WCAG 4.1.2 Name, Role, Value', () => {
  const SWITCHES: Array<[string, string]> = [
    ['check-in-reminders-toggle', 'Check-in reminders'],
    ['breathing-reminders-toggle', 'Breathing reminders'],
    ['values-reflection-toggle', 'Values reflection prompts'],
    ['reduced-motion-toggle', 'Reduce motion'],
    ['high-contrast-toggle', 'High contrast'],
  ];

  it.each(SWITCHES)('%s announces a name and the switch role', async (testID, label) => {
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId(testID));
    const toggle = getByTestId(testID);

    expect(toggle.props.accessibilityRole).toBe('switch');
    expect(toggle.props.accessibilityLabel).toBe(label);
    expect(toggle.props.accessible).toBe(true);
  });

  it.each(SWITCHES)('%s reports a checked state', async (testID) => {
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId(testID));

    expect(typeof getByTestId(testID).props.accessibilityState.checked).toBe('boolean');
  });

  it('leaves no unnamed switch on the screen', async () => {
    const { UNSAFE_root } = render(<AppSettingsScreen />);
    await waitFor(() => UNSAFE_root);

    const switches = UNSAFE_root.findAll(
      (node) => node.props?.accessibilityRole === 'switch'
    );
    expect(switches.length).toBeGreaterThanOrEqual(7);
    for (const node of switches) {
      expect(node.props.accessibilityLabel).toBeTruthy();
    }
  });
});
