/**
 * privacy-data-cloud-backup-row.test.tsx — MAINT-173 dark-ship contract.
 *
 * Verifies the "Manage Cloud Backup" entry row in PrivacyDataScreen is gated
 * by the cloud_sync feature flag: absent when off (dark ship), present and
 * navigable when on, with correct accessibility role/label.
 *
 * INFRA-199: the row now resolves the flag via the runtime `useFeatureFlag`
 * hook (from @/core/analytics) rather than the sync `isFeatureEnabled`, so the
 * control point here is the mocked hook. The dark-ship assertions are unchanged.
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

// Control the flag per test (the runtime hook is the gating point post-INFRA-199).
const mockUseFeatureFlag = jest.fn<boolean, [string]>();

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
  useFeatureFlag: (name: string) => mockUseFeatureFlag(name),
}));

import PrivacyDataScreen from '@/features/profile/screens/PrivacyDataScreen';

describe('PrivacyDataScreen — Manage Cloud Backup row (MAINT-173)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides the row when cloud_sync is OFF (dark ship)', async () => {
    mockUseFeatureFlag.mockReturnValue(false);
    const { queryByText } = render(<PrivacyDataScreen />);

    // Wait for the post-load form to render.
    await waitFor(() => expect(queryByText('Settings Backup')).toBeTruthy());
    expect(queryByText('Manage Cloud Backup')).toBeNull();
  });

  it('shows the row, with a11y role/label, and pushes the CloudBackup route when cloud_sync is ON', async () => {
    mockUseFeatureFlag.mockImplementation((name) => name === 'cloud_sync');
    const { findByRole } = render(<PrivacyDataScreen />);

    const row = await findByRole('button', { name: 'Manage Cloud Backup' });
    expect(row).toBeTruthy();

    fireEvent.press(row);
    expect(mockNavigate).toHaveBeenCalledWith('CloudBackup');
  });
});
