/**
 * DEBUG-625 AC3 — the Cloud Backup consent card renders only where the feature can be used.
 *
 * WHY THIS IS A PRIVACY TEST, not a cosmetic one. `cloud_sync` gates exactly two Profile
 * screens (the backup-status entry and the one that performs a RESTORE). It gates NOTHING
 * in `CloudBackupService`, and `canPerformOperation('cloud_sync')` reads the consent cache
 * and never consults the flag. So a grant collected while the flag is dark is a LIVE egress
 * permission — real uploads to `encrypted_backups` and real rows in `analytics_events` —
 * for a feature whose benefit the build cannot deliver. Compliance ruled: consent and
 * capability ship together or neither ships.
 *
 * BUILD-TIME, never `useFeatureFlag`. A consent surface must not have availability that
 * depends on analytics consent or a network round-trip (the INFRA-199 carve-out, at its
 * strongest here: the runtime tier resolves through PostHog, which no-ops without the very
 * consent this screen is collecting).
 *
 * The sibling suites deliberately mock this flag ON so they can keep pinning the
 * consent-default contract over the full offered set. This file is the one that pins the
 * gate, so the mock there cannot hide a regression here.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

const mockIsFeatureEnabled = jest.fn();

jest.mock('@/core/services/featureFlags', () => ({
  ...jest.requireActual('@/core/services/featureFlags'),
  isFeatureEnabled: (name: string) => mockIsFeatureEnabled(name),
}));

import ReConsentScreen from '../ReConsentScreen';
import type { ConsentDelta, ConsentPreferences } from '@/core/stores/consentStore';

const ALL_ON: ConsentPreferences = {
  analyticsEnabled: true,
  crashReportsEnabled: true,
  cloudSyncEnabled: true,
  researchEnabled: true,
  mentalHealthProcessingConsent: true,
};

const delta: ConsentDelta = {
  fromVersion: '1.0.0',
  toVersion: '1.1.0',
  changes: [{ version: '1.1.0', summary: 'We raised the minimum age to use Being to 18.' }],
  changedKeys: ['ageGate', 'mentalHealthProcessingConsent'],
  isKnownVersion: true,
};

const renderScreen = () =>
  render(
    <ReConsentScreen
      delta={delta}
      currentPreferences={ALL_ON}
      onSubmit={jest.fn()}
      testID="reconsent"
    />
  );

describe('the Cloud Backup card follows the build-time cloud_sync flag', () => {
  afterEach(() => mockIsFeatureEnabled.mockReset());

  it('renders the card when the feature is available', () => {
    mockIsFeatureEnabled.mockImplementation((n: string) => n === 'cloud_sync');

    expect(renderScreen().queryByTestId('reconsent-cloud-sync')).not.toBeNull();
  });

  it('does NOT render the card when the feature is dark', () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    expect(renderScreen().queryByTestId('reconsent-cloud-sync')).toBeNull();
  });

  it('reads the BUILD-TIME flag, never the runtime PostHog tier', () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    renderScreen();

    // The gate must consult `isFeatureEnabled`. If a later edit swaps it for
    // `useFeatureFlag`, availability becomes contingent on analytics consent and a
    // network round-trip — and this assertion is what notices.
    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('cloud_sync');
  });
});

describe('a grant that can no longer be offered is revoked LOUDLY, not silently', () => {
  afterEach(() => mockIsFeatureEnabled.mockReset());

  /**
   * ReConsentScreen mounts every optional toggle OFF and submits what is set, so hiding
   * the card revokes an existing grant on submit. That direction is privacy-safe and is
   * deliberate — but the reader must be told, and the notice must not name a preference
   * they are given no control over.
   */
  it('tells the reader Cloud Backup will be turned off, and drops it from "currently on"', () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    const { getByTestId } = renderScreen();

    const notice = getByTestId('reconsent-current-preferences-notice').props.children;
    const text = Array.isArray(notice) ? notice.join('') : String(notice);

    expect(text).toMatch(/no longer offered and will be turned off/i);
    expect(text).not.toMatch(/You currently have[^.]*Cloud Backup/i);
  });

  it('says nothing about Cloud Backup being withdrawn when the card IS offered', () => {
    mockIsFeatureEnabled.mockImplementation((n: string) => n === 'cloud_sync');
    const { getByTestId } = renderScreen();

    const notice = getByTestId('reconsent-current-preferences-notice').props.children;
    const text = Array.isArray(notice) ? notice.join('') : String(notice);

    expect(text).not.toMatch(/no longer offered/i);
  });
});
