/**
 * PrivacyDataScreen — the Art. 9 wellness-processing control (FEAT-470)
 *
 * WHY THIS FILE IS NEW. `npm run test:accessibility` matched 22 files before this
 * one and `PrivacyDataScreen` was not among them, even though `AppSettingsScreen`,
 * `AccountSettingsScreen`, `ExportDataScreen`, `DeleteAccountScreen` and
 * `ProfileScreen` all are. FEAT-470 adds a sensitive-category consent control to the
 * one Profile screen with zero accessibility coverage, so this is created rather
 * than extended.
 *
 * WHAT IT PINS, and why each is load-bearing rather than boilerplate:
 *
 *   1. The full declared a11y contract on the new Switch. The four pre-existing
 *      preference toggles on this screen carry NO accessibilityRole, label, hint or
 *      state — VoiceOver announces role and value only, and the visible description
 *      beside them is an unassociated node a form-controls-rotor user never reaches.
 *      Those four are a known defect, not the house pattern; the pattern is
 *      AppSettingsScreen.tsx:197-209. This suite stops the new control from being
 *      "made consistent" with the defective siblings.
 *
 *   2. 🔴 INDEPENDENCE FROM `universalOptOut`. The other four are swept by the
 *      GPC-equivalent signal (`value={x && !universalOptOut}`,
 *      `disabled={isSaving || universalOptOut}`). This one must not be: the store
 *      deliberately does not short-circuit `mental_health_processing` on
 *      `honorUniversalOptOut` (consentStore.ts:1536-1553) and
 *      docs/legal/multi-state-privacy.md:38 publishes that rule. A swept control
 *      would either misreport the user's real consent state or silently force it
 *      off. This is the assertion most likely to be broken by a well-meaning edit
 *      that unifies the toggles, so it is asserted explicitly in both directions.
 *
 *   3. The announcement fires AFTER the store write resolves, and NOT when it
 *      rejects. Announcing optimistically would tell a screen-reader user their
 *      consent was withdrawn and then contradict itself with the Save Failed alert —
 *      on a control whose whole purpose is that the user's decision is honoured.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

const mockUpdateConsent = jest.fn().mockResolvedValue(undefined);
const mockSetUniversalOptOut = jest.fn().mockResolvedValue(undefined);
const mockLoadConsent = jest.fn().mockResolvedValue(undefined);

/** Mutable so each case can pose a different stored consent state. */
let mockConsent: Record<string, unknown> = {};

jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({
    loadConsent: mockLoadConsent,
    currentConsent: mockConsent,
    updateConsent: mockUpdateConsent,
    setUniversalOptOut: mockSetUniversalOptOut,
  }),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackSettingsOpened: jest.fn(),
    trackConsentChanged: jest.fn(),
  }),
  useFeatureFlag: () => false,
}));

/**
 * `announceForAccessibility` is already a global `jest.fn()` from the shared setup
 * (__tests__/setup/jest.setup.js:341), so it is asserted through the react-native
 * import rather than re-mocked here. A local module mock would shadow the shared one
 * and silently never receive the screen's calls. `jest.config.js` sets no
 * `clearMocks`, so the beforeEach below is what stops it bleeding across cases.
 */
import { AccessibilityInfo } from 'react-native';

import PrivacyDataScreen from '../PrivacyDataScreen';

const mockAnnounce = AccessibilityInfo.announceForAccessibility as jest.Mock;

const TOGGLE = 'privacy-wellness-processing-toggle';

const consentWith = (overrides: Record<string, unknown> = {}) => ({
  preferences: {
    analyticsEnabled: false,
    crashReportsEnabled: false,
    cloudSyncEnabled: false,
    researchEnabled: false,
    mentalHealthProcessingConsent: true,
    ...(overrides.preferences as Record<string, unknown> | undefined),
  },
  universalOptOut: false,
  ...overrides,
});

const renderScreen = async () => {
  const api = render(<PrivacyDataScreen />);
  // The screen holds an isLoading gate until its mount-effect loadConsent resolves.
  await waitFor(() => expect(api.queryByTestId(TOGGLE)).not.toBeNull());
  return api;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateConsent.mockResolvedValue(undefined);
  mockLoadConsent.mockResolvedValue(undefined);
  mockConsent = consentWith();
});

describe('FEAT-470 — the wellness-processing control declares a full a11y contract', () => {
  it('carries role, label, hint and state — not the bare-Switch shape of its siblings', async () => {
    const { getByTestId } = await renderScreen();
    const toggle = getByTestId(TOGGLE);

    expect(toggle.props.accessibilityRole).toBe('switch');
    expect(toggle.props.accessibilityLabel).toBeTruthy();
    expect(toggle.props.accessibilityHint).toBeTruthy();
    // `checked`, not `selected` — the house convention for switches, duplicated
    // alongside `value` rather than left implicit.
    expect(toggle.props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true, disabled: false }),
    );
  });

  it('names the same data categories as the legal gate rather than fresh copy', async () => {
    // Two divergent descriptions of one consent is an Art. 7(2) problem. The
    // categories come from consentStore.ts:181-186's list.
    const { getByTestId } = await renderScreen();
    const hint = getByTestId(TOGGLE).props.accessibilityHint as string;

    expect(hint).toMatch(/mood check-ins/i);
    expect(hint).toMatch(/journal entries/i);
    expect(hint).toMatch(/self-screening/i);
  });

  it('reflects a withdrawn consent in accessibilityState, not just the value prop', async () => {
    mockConsent = consentWith({ preferences: { mentalHealthProcessingConsent: false } });
    const { getByTestId } = await renderScreen();

    expect(getByTestId(TOGGLE).props.value).toBe(false);
    expect(getByTestId(TOGGLE).props.accessibilityState.checked).toBe(false);
  });

  it('gives the Switch a hitSlop, since a native iOS Switch cannot meet 44pt', async () => {
    const { getByTestId } = await renderScreen();
    expect(getByTestId(TOGGLE).props.hitSlop).toBeTruthy();
  });
});

describe('🔴 FEAT-470 — universal opt-out must NOT sweep the Art. 9 control', () => {
  it('stays ON and operable while universal opt-out is enabled', async () => {
    mockConsent = consentWith({ universalOptOut: true });
    const { getByTestId } = await renderScreen();
    const toggle = getByTestId(TOGGLE);

    // If this control inherited the sibling pattern `value={x && !universalOptOut}`
    // these would be false/true respectively — a UI lie about consent that is in
    // fact still granted, and contradicting multi-state-privacy.md:38.
    expect(toggle.props.value).toBe(true);
    expect(toggle.props.disabled).toBe(false);
    expect(toggle.props.accessibilityState.checked).toBe(true);
  });

  it('remains togglable while universal opt-out is enabled', async () => {
    mockConsent = consentWith({ universalOptOut: true });
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(TOGGLE), 'valueChange', false);

    await waitFor(() =>
      expect(mockUpdateConsent).toHaveBeenCalledWith({ mentalHealthProcessingConsent: false }),
    );
  });

  it('proves the sweep assertion can fail — a swept sibling IS forced off', async () => {
    // Guards the guard. The three assertions above would pass vacuously if
    // `universalOptOut` never reached the render at all (a renamed field, a broken
    // mock). This proves the flag is live in this tree by showing it does sweep the
    // controls it is supposed to sweep.
    mockConsent = consentWith({
      universalOptOut: true,
      preferences: { analyticsEnabled: true, mentalHealthProcessingConsent: true },
    });
    const { getByTestId, UNSAFE_getAllByType } = await renderScreen();
    const { Switch } = require('react-native');

    const swept = UNSAFE_getAllByType(Switch).filter(
      (s: { props: Record<string, unknown> }) => s.props.testID !== TOGGLE,
    );
    // At least one non-Art.9 switch is forced off by the opt-out...
    expect(swept.some((s: { props: Record<string, unknown> }) => s.props.disabled === true)).toBe(
      true,
    );
    // ...while the Art. 9 one is not.
    expect(getByTestId(TOGGLE).props.disabled).toBe(false);
  });
});

describe('FEAT-470 — withdrawal is announced, but only once it has actually persisted', () => {
  it('announces the new state after the store write resolves', async () => {
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(TOGGLE), 'valueChange', false);

    await waitFor(() => expect(mockUpdateConsent).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockAnnounce).toHaveBeenCalledWith(expect.stringMatching(/disabled$/)),
    );
  });

  it('announces "enabled" when consent is re-granted', async () => {
    mockConsent = consentWith({ preferences: { mentalHealthProcessingConsent: false } });
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(TOGGLE), 'valueChange', true);

    await waitFor(() =>
      expect(mockAnnounce).toHaveBeenCalledWith(expect.stringMatching(/enabled$/)),
    );
  });

  it('does NOT announce when the write rejects', async () => {
    // The failure this pins: announcing "disabled" and then popping Save Failed tells
    // the user their withdrawal was honoured when it was not.
    mockUpdateConsent.mockRejectedValueOnce(new Error('secure store unavailable'));
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(TOGGLE), 'valueChange', false);

    await waitFor(() => expect(mockUpdateConsent).toHaveBeenCalled());
    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it('withdraws via updateConsent and never through revokeConsent', async () => {
    // revokeConsent flips the WHOLE record to the fail-closed `revoked` status,
    // killing analytics/crash/cloud/research consent too, and strands onboarded
    // users at Main (DEBUG-451). A single-preference withdrawal must not go there.
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(TOGGLE), 'valueChange', false);

    await waitFor(() =>
      expect(mockUpdateConsent).toHaveBeenCalledWith({ mentalHealthProcessingConsent: false }),
    );
    // Exactly one key — a withdrawal that also rewrote siblings would be over-broad.
    expect(Object.keys(mockUpdateConsent.mock.calls[0][0])).toEqual([
      'mentalHealthProcessingConsent',
    ]);
  });
});
