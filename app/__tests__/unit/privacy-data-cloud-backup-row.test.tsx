/**
 * privacy-data-cloud-backup-row.test.tsx — MAINT-173 dark-ship contract.
 *
 * Verifies the "Manage Cloud Backup" entry row in PrivacyDataScreen is gated
 * by the cloud_sync feature flag: absent when off (dark ship), present and
 * navigable when on, with correct accessibility role/label.
 *
 * MAINT-809: the row resolves the flag at BUILD TIME (`isFeatureEnabled`), the
 * same tier as the consent cards that authorize Cloud Backup, so the control
 * point here is the mocked build-time resolver. INFRA-199 had moved it to a
 * runtime PostHog hook, which let a PostHog value split the row from its consent
 * card; MAINT-811 retired that tier, pinned by runtimeFlagTierRetired.contract.test.ts.
 *
 * FEAT-212: Cloud Backup is now a pushed route on ProfileStackNavigator rather
 * than an in-component sub-screen, so pressing the row calls
 * navigation.navigate('CloudBackup') instead of swapping rendered content.
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

// Consent store: provide the slice PrivacyDataScreen destructures.
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: () => ({
    loadConsent: jest.fn(async () => undefined),
    updateConsent: jest.fn(async () => undefined),
    setUniversalOptOut: jest.fn(async () => undefined),
    currentConsent: {
      preferences: {
        analyticsEnabled: false,
        crashReportsEnabled: false,
        cloudSyncEnabled: false,
        researchEnabled: false,
      },
      universalOptOut: false,
    },
  }),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackSettingsOpened: jest.fn(),
    trackConsentChanged: jest.fn(),
  }),
}));

import PrivacyDataScreen from '@/features/profile/screens/PrivacyDataScreen';

describe('PrivacyDataScreen — Manage Cloud Backup row (MAINT-173)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides the row when cloud_sync is OFF (dark ship)', async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    const { queryByText } = render(<PrivacyDataScreen />);

    // Wait for the post-load form to render.
    await waitFor(() => expect(queryByText('Settings Backup')).toBeTruthy());
    expect(queryByText('Manage Cloud Backup')).toBeNull();
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
