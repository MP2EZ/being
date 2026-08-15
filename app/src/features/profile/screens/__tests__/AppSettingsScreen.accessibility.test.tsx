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
import { fireEvent, render, waitFor } from '@testing-library/react-native';

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

/**
 * DEBUG-426 — the Practices rows on hardware that cannot vibrate.
 *
 * Suppressing the once-ever prompt (useHapticsOptIn) removes the false PROMISE
 * at the moment of asking, but it leaves a second false affirmative behind: this
 * row still says "Vibration marks phase changes", the Switch still reports
 * `checked: true` if the practitioner turned it on, and nothing is ever felt.
 * That defect is independent of the prompt and needs its own disclosure.
 *
 * The remedy is a note, NOT a removal and NOT a disabled state — see the
 * assertions below, each of which pins a thing that must NOT happen.
 */
describe('DEBUG-426: capability disclosure on the haptics row', () => {
  const mockDevice = jest.requireMock('expo-device') as {
    isDevice: boolean;
    modelId: string | null;
    deviceType: number;
  };

  const asCapableIPhone = (): void => {
    mockDevice.isDevice = true;
    mockDevice.modelId = 'iPhone14,2';
    mockDevice.deviceType = 1;
  };
  const asIPad = (): void => {
    mockDevice.isDevice = true;
    mockDevice.modelId = 'iPad13,16';
    mockDevice.deviceType = 2;
  };

  const NOTE = /no vibration motor/i;

  beforeEach(asCapableIPhone);
  afterEach(asCapableIPhone);

  it('says nothing about capability on hardware that CAN vibrate', async () => {
    // The two-sided half. A presence-only assertion cannot detect a note that
    // leaked onto every device, which would be its own false statement.
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    expect(getByTestId('haptics-master-description').props.children).not.toMatch(NOTE);
    expect(getByTestId('haptics-master-toggle').props.accessibilityHint).not.toMatch(NOTE);
  });

  it('discloses the hardware fact in the VISIBLE description on an iPad', async () => {
    asIPad();
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    expect(getByTestId('haptics-master-description').props.children).toMatch(NOTE);
  });

  it('also carries it in the HINT, which is the only channel a rotor user reaches', async () => {
    // Not redundant with the assertion above. The description is a SEPARATE
    // accessibility node with no labelledBy/describedBy relationship to the
    // Switch, so navigating by form-controls rotor, Switch Control, or full
    // keyboard access lands on the Switch and never encounters it.
    asIPad();
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    expect(getByTestId('haptics-master-toggle').props.accessibilityHint).toMatch(NOTE);
  });

  it('keeps the label byte-identical across capability', async () => {
    const { getByTestId, rerender } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));
    const labelWhenCapable = getByTestId('haptics-master-toggle').props.accessibilityLabel;

    asIPad();
    rerender(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    // A mutating label breaks find-by-name and rotor search — the same rule the
    // interval row already follows, for the same reason.
    expect(getByTestId('haptics-master-toggle').props.accessibilityLabel).toBe(labelWhenCapable);
  });

  it('keeps BOTH Practices rows rendered on the suppressed device', async () => {
    // getByTestId throws when absent, so this is a positive assertion rather
    // than a queryByTestId not-null shape that reads like one.
    asIPad();
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    expect(getByTestId('haptics-master-toggle')).toBeTruthy();
    expect(getByTestId('haptics-interval-toggle')).toBeTruthy();
  });

  it('does NOT disable the master switch on capability grounds', async () => {
    // `disabled` in this card already means a RECOVERABLE precondition — the
    // interval row's hint reads "Available when haptic cues are on". Reusing it
    // for a permanent hardware fact would send the practitioner looking for a
    // switch that will restore it.
    asIPad();
    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    expect(getByTestId('haptics-master-toggle').props.accessibilityState.disabled).toBe(false);
  });

  it('leaves the master switch OPERABLE, exercised rather than inspected', async () => {
    // accessibilityState.disabled is a CLAIM about operability; firing the
    // switch and observing the persisted write is evidence of it.
    asIPad();
    const updatePracticeSettings = jest.fn(async () => {});
    useSettingsStore.setState({ updatePracticeSettings } as never);

    const { getByTestId } = render(<AppSettingsScreen />);
    await waitFor(() => getByTestId('haptics-master-toggle'));

    fireEvent(getByTestId('haptics-master-toggle'), 'valueChange', true);

    await waitFor(() => {
      expect(updatePracticeSettings).toHaveBeenCalledWith({ practiceHaptics: true });
    });
  });
});
