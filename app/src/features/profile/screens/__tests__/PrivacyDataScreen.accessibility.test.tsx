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
 *   1. The full declared a11y contract on the new Switch. When FEAT-470 landed, the
 *      four preference toggles on this screen carried NO accessibilityRole, label,
 *      hint or state; DEBUG-818 gave them role, label and state (pinned in its own
 *      describe below). The pattern is AppSettingsScreen.tsx:197-209.
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
import path from 'path';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  expectEntryShape, expectInertMember, expectLiveness, expectMarginClearance,
  expectModelFidelity, expectSweepClear, flat, hostPad, readHost,
} from '../../../../../__tests__/helpers/crisisFabClearance';
import { expectExclusionCheckWired } from '../../../../../__tests__/helpers/crisisExclusionLayoutEvent';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

const mockUpdateConsent = jest.fn();
const mockSetUniversalOptOut = jest.fn().mockResolvedValue(undefined);
const mockLoadConsent = jest.fn().mockResolvedValue(undefined);

/** Mutable so each case can pose a different stored consent state. */
let mockConsent: Record<string, unknown> = {};

/**
 * A successful write commits to the stored record, as the real store does. DEBUG-816: the
 * screen confirms a write through getState() after the await, because the real
 * updateConsent swallows its own failures, so a mock that resolves without committing is
 * the swallowed-failure case.
 */
const commitUpdate = async (updates: Record<string, unknown>) => {
  mockConsent = {
    ...mockConsent,
    preferences: { ...(mockConsent.preferences as Record<string, unknown>), ...updates },
  };
};

jest.mock('@/core/stores/consentStore', () => {
  const useConsentStore = () => ({
    loadConsent: mockLoadConsent,
    currentConsent: mockConsent,
    updateConsent: mockUpdateConsent,
    setUniversalOptOut: mockSetUniversalOptOut,
  });
  useConsentStore.getState = () => ({ currentConsent: mockConsent });
  return { useConsentStore };
});

// Pinned rather than left to env.mock.js, so the cloud_sync cases below are deterministic.
// Default dark, matching what every earlier case in this file has always rendered.
let mockCloudSync = false;
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (name: string) => name === 'cloud_sync' && mockCloudSync,
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackSettingsOpened: jest.fn(),
    trackConsentChanged: jest.fn(),
  }),
}));

/**
 * `announceForAccessibility` is already a global `jest.fn()` from the shared setup
 * (__tests__/setup/jest.setup.js:341), so it is asserted through the react-native
 * import rather than re-mocked here. A local module mock would shadow the shared one
 * and silently never receive the screen's calls. `jest.config.js` sets no
 * `clearMocks`, so the beforeEach below is what stops it bleeding across cases.
 */
import { AccessibilityInfo, Alert } from 'react-native';

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
  mockUpdateConsent.mockImplementation(commitUpdate);
  mockCloudSync = false;
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

  // DEBUG-816: the real updateConsent never rejects. It catches its own write failure and
  // resolves with the record unchanged, so the case above could not happen in production
  // and a failed withdrawal was announced as honoured.
  it('does NOT announce, and shows Save Failed, when the write resolves without committing', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockUpdateConsent.mockImplementationOnce(async () => undefined);
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(TOGGLE), 'valueChange', false);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Save Failed', expect.any(String), expect.any(Array)));
    expect(mockAnnounce).not.toHaveBeenCalled();
    expect(getByTestId(TOGGLE).props.value).toBe(true);
    alertSpy.mockRestore();
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

describe('DEBUG-816 — Settings Backup withdrawal is announced, and only once it has committed', () => {
  const BACKUP = 'privacy-settings-backup-toggle';
  const DARK_HOLDER_WITHDRAWN =
    "Settings Backup disabled. This option is no longer shown because it isn't available in this version of Being.";

  const holder = () => consentWith({ preferences: { cloudSyncEnabled: true } });

  it("flag dark: a holder's withdrawal announces that the option is gone, once, and the card goes", async () => {
    mockConsent = holder();
    const { getByTestId, queryByTestId } = await renderScreen();

    fireEvent(getByTestId(BACKUP), 'valueChange', false);

    await waitFor(() => expect(mockAnnounce).toHaveBeenCalledWith(DARK_HOLDER_WITHDRAWN));
    expect(mockAnnounce).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(queryByTestId(BACKUP)).toBeNull());
  });

  it('flag on: withdrawal announces the plain state and the card stays', async () => {
    mockCloudSync = true;
    mockConsent = holder();
    const { getByTestId, queryByTestId } = await renderScreen();

    fireEvent(getByTestId(BACKUP), 'valueChange', false);

    await waitFor(() => expect(mockAnnounce).toHaveBeenCalledWith('Settings Backup disabled'));
    expect(queryByTestId(BACKUP)).not.toBeNull();
  });

  it('flag on: granting announces "Settings Backup enabled"', async () => {
    mockCloudSync = true;
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(BACKUP), 'valueChange', true);

    await waitFor(() => expect(mockAnnounce).toHaveBeenCalledWith('Settings Backup enabled'));
  });

  it.each([
    ['resolves without committing (the real store swallows the error)', () => mockUpdateConsent.mockImplementationOnce(async () => undefined)],
    ['rejects', () => mockUpdateConsent.mockRejectedValueOnce(new Error('secure store unavailable'))],
  ])('a write that %s: no announcement, Save Failed, and the switch stays on', async (_name, failWrite) => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockConsent = holder();
    failWrite();
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(BACKUP), 'valueChange', false);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Save Failed', expect.any(String), expect.any(Array)));
    expect(mockAnnounce).not.toHaveBeenCalled();
    expect(getByTestId(BACKUP).props.value).toBe(true);
    alertSpy.mockRestore();
  });
});

describe('DEBUG-818 — the four consent rows: switch contract, Learn more, announcements', () => {
  const ROWS = [
    { label: 'Usage Analytics', key: 'analyticsEnabled', testID: 'privacy-analytics-toggle' },
    { label: 'Crash Reports', key: 'crashReportsEnabled', testID: 'privacy-crash-reports-toggle' },
    { label: 'Research Participation', key: 'researchEnabled', testID: 'privacy-research-toggle' },
  ];

  /** Host testIDs in render-tree (and so screen-reader) order. */
  const testIDOrder = (node: unknown, out: string[] = []): string[] => {
    if (Array.isArray(node)) node.forEach((n) => testIDOrder(n, out));
    else if (node && typeof node === 'object') {
      const n = node as { props?: { testID?: string }; children?: unknown };
      if (n.props?.testID) out.push(n.props.testID);
      testIDOrder(n.children, out);
    }
    return out;
  };

  it.each(ROWS)('$label: the Switch declares role, label and state', async (r) => {
    const { getByTestId } = await renderScreen();
    const sw = getByTestId(r.testID);
    expect(sw.props.accessibilityRole).toBe('switch');
    expect(sw.props.accessibilityLabel).toBe(r.label);
    expect(sw.props.accessibilityState).toEqual(expect.objectContaining({ checked: false, disabled: false }));
  });

  it.each(ROWS)('$label: Learn more is a button reachable BEFORE the switch, and expands', async (r) => {
    const api = await renderScreen();
    const toggleID = `${r.testID}-details-toggle`;
    const learnMore = api.getByTestId(toggleID);

    expect(learnMore.props.accessibilityRole).toBe('button');
    // WCAG 2.5.3: the accessible name contains the visible words.
    expect(learnMore.props.accessibilityLabel).toMatch(/^Learn more/);
    expect(learnMore.props.accessibilityLabel).toContain(r.label);
    expect(learnMore.props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));

    // In Settings the switch saves immediately, so the disclosure must come first.
    const order = testIDOrder(api.toJSON());
    expect(order.indexOf(toggleID)).toBeGreaterThan(-1);
    expect(order.indexOf(toggleID)).toBeLessThan(order.indexOf(r.testID));

    fireEvent.press(learnMore);
    const expanded = api.getByTestId(toggleID);
    expect(expanded.props.accessibilityState).toEqual(expect.objectContaining({ expanded: true }));
    expect(expanded.props.accessibilityLabel).toMatch(/^Hide details/);
  });

  it('Learn more stays operable under Universal Opt-Out, so a holder can read what the grant covers', async () => {
    mockConsent = consentWith({ universalOptOut: true });
    const { getByTestId } = await renderScreen();
    const learnMore = getByTestId('privacy-analytics-toggle-details-toggle');
    expect(learnMore.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
    expect(getByTestId('privacy-analytics-toggle').props.disabled).toBe(true);
  });

  it.each(ROWS)('$label: announces "<label> enabled" only after the write resolves', async (r) => {
    let release!: () => void;
    mockUpdateConsent.mockImplementationOnce(async (updates: Record<string, unknown>) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await commitUpdate(updates);
    });
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(r.testID), 'valueChange', true);
    await waitFor(() => expect(mockUpdateConsent).toHaveBeenCalledWith({ [r.key]: true }));
    expect(mockAnnounce).not.toHaveBeenCalled();

    release();
    await waitFor(() => expect(mockAnnounce).toHaveBeenCalledWith(`${r.label} enabled`));
  });

  it.each(ROWS)('$label: a write that does not commit announces nothing and shows Save Failed', async (r) => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockUpdateConsent.mockImplementationOnce(async () => undefined);
    const { getByTestId } = await renderScreen();

    fireEvent(getByTestId(r.testID), 'valueChange', true);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Save Failed', expect.any(String), expect.any(Array)));
    expect(mockAnnounce).not.toHaveBeenCalled();
    expect(getByTestId(r.testID).props.value).toBe(false);
    alertSpy.mockRestore();
  });
});

// DEBUG-653: since DEBUG-562 the Delete account card is the LAST control at max scroll, where
// the FAB (zIndex 9999) would win an overlapping tap — the DEBUG-547 shape. See crisisFabClearance.ts.
describe('DEBUG-653: the Delete account card clears the crisis FAB exclusion region', () => {
  const TEST_ID = 'profile-card-delete';
  const HOST = readHost(path.join(__dirname, '../PrivacyDataScreen.tsx'));
  // Measured pre-fix: iPhone SE (3rd generation), 375x667, iOS 18.6, installed gate binary
  // marker 184ab8af, 2026-09-25, max scroll — [24,415][351,533].
  const MEASURED = { x: 24, y: 415, width: 327, height: 118 };
  const renderHost = async () => {
    const api = await renderScreen();
    return { api, style: flat(api.getByTestId(TEST_ID).props.style), pad: hostPad(api) };
  };

  it('(a) carries a right MARGIN on the card with the testID, and on no sibling card', async () => {
    const { api, style } = await renderHost();
    expectMarginClearance(style, false);
    expect(flat(api.getByTestId('profile-card-export').props.style).marginRight).toBeUndefined();
  });

  it('(b) declares it in a dedicated entry applied LAST, never on the shared settingCard', () => {
    expectEntryShape(HOST, 'deleteCardClearance', false);
    expect(HOST.source).toMatch(/style=\{\[styles\.settingCard, styles\.deleteCardClearance\]\}/);
    expect(HOST.source.match(/styles\.deleteCardClearance(?!\w)/g)).toHaveLength(1);
    expectInertMember(HOST, 'settingCard');
    // Rules of hooks: the check is declared above the isLoading early return.
    const hook = HOST.source.indexOf("useCrisisExclusionAssertion('profile-card-delete', 'scrolls')");
    expect(hook).toBeGreaterThan(-1);
    expect(hook).toBeLessThan(HOST.source.indexOf('if (isLoading)'));
  });

  it('(c) never intersects the exclusion rect at any y, on any supported viewport', async () => {
    const { pad, style } = await renderHost();
    expectSweepClear(pad, style, [MEASURED.height, 200]);
  });

  it('(d) the model reproduces the measured frame; (e) at inset 0 everything goes red', async () => {
    const { pad } = await renderHost();
    expectModelFidelity(MEASURED, pad);
    expectLiveness(HOST, 'deleteCardClearance', MEASURED, pad);
  });

  it('DEBUG-643: the __DEV__ crisis-exclusion check is wired to the delete card', async () => {
    await expectExclusionCheckWired((await renderHost()).api.getByTestId(TEST_ID), TEST_ID);
  });
});

// DEBUG-652 — the destination fact crisis-button-reachability asserts after each
// profile-card-privacy tap, before the FAB or the next scroll. It must render while the
// consent load is still pending too: that loading screen IS the destination.
describe('DEBUG-652 — the destination root testID renders in every branch', () => {
  it('loaded branch', async () => {
    expect((await renderScreen()).queryByTestId('privacy-data-screen')).not.toBeNull();
  });

  it('loading branch', () => {
    mockLoadConsent.mockReturnValue(new Promise(() => {}));
    const { queryByTestId, queryByText } = render(<PrivacyDataScreen />);
    expect(queryByText('Loading settings...')).not.toBeNull();
    expect(queryByTestId('privacy-data-screen')).not.toBeNull();
  });
});
