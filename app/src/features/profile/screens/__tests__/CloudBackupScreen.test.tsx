/**
 * CloudBackupScreen — feature-flag gate (MAINT-744)
 *
 * The screen renders the CloudBackupSettings controls only when the
 * `cloud_sync` feature flag is on, and renders nothing otherwise.
 *
 * The flag is an AVAILABILITY gate only. It decides whether the UI is
 * reachable; it says nothing about whether the user has consented to cloud
 * backup of wellness data. Consent is an independent control enforced where
 * egress happens (CloudBackupService / the cloud services barrel), so no test
 * here treats "flag on" as "consent given".
 *
 * MAINT-809: the flag resolves at build time (`isFeatureEnabled`), the same tier as
 * the consent cards. MAINT-811 retired the runtime tier, so there is no other.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import CloudBackupScreen from '../CloudBackupScreen';
import { isFeatureEnabled } from '@/core/services/featureFlags';

jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: jest.fn(),
}));
jest.mock('@/core/components/settings/CloudBackupSettings', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  const MockReact = jest.requireActual('react');
  return {
    __esModule: true,
    default: () => MockReact.createElement(MockText, { testID: 'cloud-backup-settings' }, 'settings'),
  };
});

const mockIsFeatureEnabled = isFeatureEnabled as jest.Mock;

beforeEach(() => {
  mockIsFeatureEnabled.mockReset();
});

describe('CloudBackupScreen', () => {
  it('renders nothing when the cloud_sync flag is off', () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    const { toJSON, queryByTestId } = render(<CloudBackupScreen />);

    expect(toJSON()).toBeNull();
    expect(queryByTestId('cloud-backup-settings')).toBeNull();
  });

  it('renders the CloudBackupSettings controls when the cloud_sync flag is on', () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    const { getByTestId } = render(<CloudBackupScreen />);

    expect(getByTestId('cloud-backup-settings')).toBeTruthy();
  });

  it("asks for the 'cloud_sync' flag", () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    render(<CloudBackupScreen />);

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('cloud_sync');
  });
});
