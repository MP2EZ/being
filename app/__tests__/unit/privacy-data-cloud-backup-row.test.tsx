/**
 * privacy-data-cloud-backup-row.test.tsx — MAINT-173 dark-ship contract.
 *
 * Verifies the "Manage Cloud Backup" entry row in PrivacyDataScreen is gated
 * by the cloud_sync feature flag: absent when off (dark ship), present and
 * navigable when on, with correct accessibility role/label.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// useFocusEffect needs a NavigationContainer in the real impl; no-op it.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

// Control the flag per test.
const mockIsFeatureEnabled = jest.fn<boolean, [string]>();
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (name: string) => mockIsFeatureEnabled(name),
}));

// Stub the heavy child screen so navigation is observable without rendering
// the full cloud-backup UI (and its useCloudSync hook chain).
jest.mock('@/features/profile/screens/CloudBackupScreen', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => <Text testID="cloud-backup-screen">Cloud Backup Screen</Text>,
  };
});

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
    const { queryByText } = render(<PrivacyDataScreen onReturn={jest.fn()} />);

    // Wait for the post-load form to render.
    await waitFor(() => expect(queryByText('Settings Backup')).toBeTruthy());
    expect(queryByText('Manage Cloud Backup')).toBeNull();
  });

  it('shows the row, with a11y role/label, and navigates when cloud_sync is ON', async () => {
    mockIsFeatureEnabled.mockImplementation((name) => name === 'cloud_sync');
    const { findByRole, getByTestId } = render(<PrivacyDataScreen onReturn={jest.fn()} />);

    const row = await findByRole('button', { name: 'Manage Cloud Backup' });
    expect(row).toBeTruthy();

    fireEvent.press(row);
    expect(getByTestId('cloud-backup-screen')).toBeTruthy();
  });
});
