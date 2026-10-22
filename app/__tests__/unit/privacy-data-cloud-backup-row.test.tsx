/**
 * privacy-data-cloud-backup-row.test.tsx — the Settings Backup switch and the Manage
 * Cloud Backup row on PrivacyDataScreen.
 *
 * MAINT-173 dark-ship contract: the "Manage Cloud Backup" entry row is gated by the
 * cloud_sync feature flag: absent when off, present and navigable when on.
 *
 * MAINT-809: the row resolves the flag at BUILD TIME (`isFeatureEnabled`), the
 * same tier as the consent cards that authorize Cloud Backup, so the control
 * point here is the mocked build-time resolver. INFRA-199 had moved it to the
 * runtime `useFeatureFlag` hook, which let a PostHog value split the row from its
 * consent card; that hook is mocked to "on" below so a regression back to it shows.
 *
 * FEAT-212: Cloud Backup is now a pushed route on ProfileStackNavigator rather
 * than an in-component sub-screen, so pressing the row calls
 * navigation.navigate('CloudBackup') instead of swapping rendered content.
 *
 * DEBUG-816: the Settings Backup switch is a grant point, so it renders only when the
 * flag is on OR a grant is already held. Visibility keys on the RAW stored value, never
 * on the UOO-masked display value, so a holder can always see and withdraw. A revoked
 * record is not a held grant (compliance ruling). The Maestro gate is seeded with a
 * grant, so the absent branch is pinned here and nowhere else.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();

// PrivacyDataScreen uses useFocusEffect (no-op it) and useNavigation (spy the
// navigate so we can assert the row pushes the CloudBackup route).
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Control the flag per test (the build-time resolver is the gating point, MAINT-809).
const mockIsFeatureEnabled = jest.fn<boolean, [string]>();
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (name: string) => mockIsFeatureEnabled(name),
}));
const mockUseFeatureFlag = jest.fn<boolean, [string]>(() => true);

type MockConsent = {
  preferences: Record<string, boolean>;
  universalOptOut: boolean;
  revoked?: boolean;
};

/** Mutable so each case can pose a different stored consent state. */
let mockConsent: MockConsent;
// A successful write commits to the stored record, as the real store does.
const mockUpdateConsent = jest.fn(async (updates: Record<string, boolean>) => {
  mockConsent = { ...mockConsent, preferences: { ...mockConsent.preferences, ...updates } };
});

// Consent store: provide the slice PrivacyDataScreen destructures, plus getState for
// the post-write commit check.
jest.mock('@/core/stores/consentStore', () => {
  const useConsentStore = () => ({
    loadConsent: jest.fn(async () => undefined),
    updateConsent: mockUpdateConsent,
    setUniversalOptOut: jest.fn(async () => undefined),
    currentConsent: mockConsent,
  });
  useConsentStore.getState = () => ({ currentConsent: mockConsent });
  return { useConsentStore };
});

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackSettingsOpened: jest.fn(),
    trackConsentChanged: jest.fn(),
  }),
  useFeatureFlag: (name: string) => mockUseFeatureFlag(name),
}));

import PrivacyDataScreen from '@/features/profile/screens/PrivacyDataScreen';

const TOGGLE = 'privacy-settings-backup-toggle';

const consentWith = (cloudSyncEnabled: boolean, universalOptOut = false): MockConsent => ({
  preferences: {
    analyticsEnabled: false,
    crashReportsEnabled: false,
    cloudSyncEnabled,
    researchEnabled: false,
  },
  universalOptOut,
});

/** Renders and waits on a control every state renders (the backup switch may be absent). */
const renderScreen = async () => {
  const api = render(<PrivacyDataScreen />);
  await waitFor(() => expect(api.queryByText('Usage Analytics')).toBeTruthy());
  return api;
};

/** The Preferences storage row's accessible label carries its location's description. */
const preferencesLocation = (getByLabelText: (m: RegExp) => { props: { accessibilityLabel: string } }) =>
  getByLabelText(/^Preferences\./).props.accessibilityLabel;

describe('PrivacyDataScreen — Manage Cloud Backup row (MAINT-173)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsent = consentWith(false);
  });

  it('hides the row when cloud_sync is OFF (dark ship), even if the runtime tier would say on', async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockUseFeatureFlag.mockReturnValue(true);
    const { queryByText } = await renderScreen();

    expect(queryByText('Manage Cloud Backup')).toBeNull();
    expect(mockUseFeatureFlag).not.toHaveBeenCalledWith('cloud_sync');
  });

  it('shows the row, with a11y role/label, and pushes the CloudBackup route when cloud_sync is ON', async () => {
    mockIsFeatureEnabled.mockImplementation((name) => name === 'cloud_sync');
    const { findByRole } = render(<PrivacyDataScreen />);

    const row = await findByRole('button', { name: 'Manage Cloud Backup' });
    expect(row).toBeTruthy();

    fireEvent.press(row);
    expect(mockNavigate).toHaveBeenCalledWith('CloudBackup');
  });
});

describe('PrivacyDataScreen — Settings Backup switch visibility (DEBUG-816)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // flag × grant × UOO. Present iff flag || grant; the stored grant survives UOO.
  it.each([
    [true, true, false],
    [true, true, true],
    [true, false, false],
    [true, false, true],
    [false, true, false],
    [false, true, true],
    [false, false, false],
    [false, false, true],
  ])('flag=%s grant=%s uoo=%s', async (flag, grant, uoo) => {
    mockIsFeatureEnabled.mockImplementation((name) => flag && name === 'cloud_sync');
    mockConsent = consentWith(grant, uoo);
    const { queryByTestId, queryByText, getByLabelText } = await renderScreen();

    const toggle = queryByTestId(TOGGLE);
    if (flag || grant) {
      expect(toggle).not.toBeNull();
      expect(toggle!.props.accessibilityLabel).toBe('Settings Backup');
      expect(toggle!.props.value).toBe(grant && !uoo);
      expect(toggle!.props.disabled).toBe(uoo);
    } else {
      expect(toggle).toBeNull();
      expect(queryByText('Settings Backup')).toBeNull();
    }

    expect(queryByText('Manage Cloud Backup') !== null).toBe(flag);
    // AC7: 'cloud' only when something can actually be backed up.
    expect(preferencesLocation(getByLabelText)).toMatch(
      flag && grant && !uoo ? /Synced to Being Cloud\./ : /Stored in this app only\./,
    );
  });

  // Mirrors the e2e seed (src/core/config/e2eSeed.ts, the grantConsent preferences
  // object): the gate build holds a grant and ships cloud_sync dark. Fails if
  // visibility is ever gated on the flag alone.
  it('renders the switch for the e2e-seeded consent with cloud_sync dark', async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockConsent = {
      preferences: {
        analyticsEnabled: true,
        crashReportsEnabled: false,
        cloudSyncEnabled: true,
        researchEnabled: true,
        mentalHealthProcessingConsent: true,
      },
      universalOptOut: false,
    };
    const { queryByTestId } = await renderScreen();

    expect(queryByTestId(TOGGLE)).not.toBeNull();
  });

  // Compliance ruling: `revoked` is the whole-record withdrawal, so a stored
  // cloudSyncEnabled on it is a historical snapshot, not a held grant.
  it('a revoked record is not a held grant: no switch and no cloud location while dark', async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockConsent = { ...consentWith(true), revoked: true };
    const { queryByTestId, getByLabelText } = await renderScreen();

    expect(queryByTestId(TOGGLE)).toBeNull();
    expect(preferencesLocation(getByLabelText)).toMatch(/Stored in this app only\./);
  });

  // The server-copy delete this withdrawal triggers is DEBUG-764's and is pinned by
  // src/core/services/supabase/__tests__/backupDeleteOnWithdrawal.privacy.test.ts.
  it('a dark-build holder withdraws with one write of exactly cloudSyncEnabled: false, and the card goes', async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockConsent = consentWith(true);
    const { getByTestId, queryByTestId } = await renderScreen();

    fireEvent(getByTestId(TOGGLE), 'valueChange', false);

    await waitFor(() => expect(mockUpdateConsent).toHaveBeenCalledWith({ cloudSyncEnabled: false }));
    expect(mockUpdateConsent).toHaveBeenCalledTimes(1);
    // Disappear-on-withdraw, not a latch: with the grant gone and the flag dark, nothing
    // here offers it again.
    await waitFor(() => expect(queryByTestId(TOGGLE)).toBeNull());
  });
});
