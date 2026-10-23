/**
 * PrivacyDataScreen — consent rows disclose what their consent cards disclose (DEBUG-818)
 *
 * Privacy & Data is a grant point: each switch writes a consent preference the moment it
 * is turned on. Onboarding and re-consent show the full CONSENT_DETAILS account of each
 * category behind "Learn more"; these rows showed one hardcoded line. Consent given here
 * must be as informed as consent given anywhere else in the app.
 *
 * Every expected string is imported from CONSENT_DETAILS, never written as a literal, so
 * this suite follows the copy rather than freezing it. For Cloud Backup that includes
 * OPERATIONAL_TELEMETRY_DISCLOSURE (DEBUG-625), in both states the row can render.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  CONSENT_DETAILS,
  CLOUD_BACKUP_UNAVAILABLE_HOLDER_DESCRIPTION,
} from '@/features/consent/constants/consentDetails';
import { OPERATIONAL_TELEMETRY_DISCLOSURE } from '@/core/services/supabase/operationalEvents';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

let mockCloudSync = true;
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (name: string) => name === 'cloud_sync' && mockCloudSync,
}));

let mockConsent: Record<string, unknown> = {};
jest.mock('@/core/stores/consentStore', () => {
  const useConsentStore = () => ({
    loadConsent: jest.fn(async () => undefined),
    updateConsent: jest.fn(async () => undefined),
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
}));

import PrivacyDataScreen from '../PrivacyDataScreen';

type Category = keyof typeof CONSENT_DETAILS;

const ROWS: Array<{ label: string; category: Category; testID: string }> = [
  { label: 'Usage Analytics', category: 'analytics', testID: 'privacy-analytics-toggle' },
  { label: 'Crash Reports', category: 'crashReports', testID: 'privacy-crash-reports-toggle' },
  { label: 'Settings Backup', category: 'cloudSync', testID: 'privacy-settings-backup-toggle' },
  { label: 'Research Participation', category: 'research', testID: 'privacy-research-toggle' },
];

const consentWith = (cloudSyncEnabled: boolean) => ({
  preferences: {
    analyticsEnabled: false,
    crashReportsEnabled: false,
    cloudSyncEnabled,
    researchEnabled: false,
    mentalHealthProcessingConsent: true,
  },
  universalOptOut: false,
});

const renderScreen = async () => {
  const api = render(<PrivacyDataScreen />);
  await waitFor(() => expect(api.queryByTestId('privacy-analytics-toggle')).not.toBeNull());
  return api;
};

/** Every string the details panel must show, from the single copy. */
const detailStrings = (category: Category): string[] => {
  const d = CONSENT_DETAILS[category].details;
  return [...d.whatWeCollect, ...d.whatWeDontCollect, d.whyItHelps, d.privacyNote].filter(
    (s): s is string => typeof s === 'string' && s.length > 0,
  );
};

beforeEach(() => {
  mockCloudSync = true;
  mockConsent = consentWith(false);
});

describe('DEBUG-818 — each consent row discloses its category at onboarding parity', () => {
  it.each(ROWS)('$label: description from CONSENT_DETAILS, details behind Learn more', async (r) => {
    const { getByText, queryAllByText, getByTestId } = await renderScreen();
    const details = CONSENT_DETAILS[r.category].details;

    expect(getByText(CONSENT_DETAILS[r.category].description)).toBeTruthy();
    // Collapsed by default: the second layer is one tap away, not on screen.
    expect(queryAllByText(details.whyItHelps, { exact: false })).toHaveLength(0);

    fireEvent.press(getByTestId(`${r.testID}-details-toggle`));

    for (const s of detailStrings(r.category)) {
      expect(queryAllByText(s, { exact: false }).length).toBeGreaterThan(0);
    }
  });

  it('Cloud Backup with the flag on discloses the operational telemetry', async () => {
    const { getByTestId, queryAllByText } = await renderScreen();
    fireEvent.press(getByTestId('privacy-settings-backup-toggle-details-toggle'));
    expect(queryAllByText(OPERATIONAL_TELEMETRY_DISCLOSURE, { exact: false }).length).toBeGreaterThan(0);
  });
});

describe('DEBUG-818 AC5 — a flag-dark holder sees a withdrawable permission, not an offer', () => {
  beforeEach(() => {
    mockCloudSync = false;
    mockConsent = consentWith(true);
  });

  it('replaces only the description; the details still describe what the grant covers', async () => {
    const { getByText, queryByText, getByTestId, queryAllByText } = await renderScreen();

    expect(getByText(CLOUD_BACKUP_UNAVAILABLE_HOLDER_DESCRIPTION)).toBeTruthy();
    expect(queryByText(CONSENT_DETAILS.cloudSync.description)).toBeNull();

    fireEvent.press(getByTestId('privacy-settings-backup-toggle-details-toggle'));
    for (const s of detailStrings('cloudSync')) {
      expect(queryAllByText(s, { exact: false }).length).toBeGreaterThan(0);
    }
    expect(queryAllByText(OPERATIONAL_TELEMETRY_DISCLOSURE, { exact: false }).length).toBeGreaterThan(0);
  });

  it('with the flag on, the offer description is used and the holder description is not', async () => {
    mockCloudSync = true;
    const { getByText, queryByText } = await renderScreen();
    expect(getByText(CONSENT_DETAILS.cloudSync.description)).toBeTruthy();
    expect(queryByText(CLOUD_BACKUP_UNAVAILABLE_HOLDER_DESCRIPTION)).toBeNull();
  });
});

describe('DEBUG-818 — the infoBox no longer contradicts the disclosures', () => {
  // Compliance: once the expanders disclose an installation identifier and approximate
  // location, an always-visible "app usage and device details only" contradicts them.
  it('drops the "only" sentence and keeps the rest of the box', async () => {
    const { queryByText } = await renderScreen();
    expect(queryByText(/device details only/i)).toBeNull();
    expect(queryByText(/NEVER shared/)).not.toBeNull();
  });
});

describe('DEBUG-818 AC2 — the rows carry no hardcoded copy', () => {
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const screen = stripComments(
    fs.readFileSync(path.resolve(__dirname, '../PrivacyDataScreen.tsx'), 'utf8'),
  );

  it.each(['analytics', 'crashReports', 'cloudSync', 'research'] as Category[])(
    '%s: description and details are read from CONSENT_DETAILS',
    (category) => {
      expect(screen).toMatch(new RegExp(`CONSENT_DETAILS\\.${category}\\.description`));
      expect(screen).toMatch(new RegExp(`CONSENT_DETAILS\\.${category}\\.details`));
    },
  );

  it('the retired hardcoded descriptions are gone', () => {
    expect(screen).toMatch(/Usage Analytics/); // liveness: the stripped source is the screen
    expect(screen).not.toMatch(/Help improve Being by sharing which features you use/);
    expect(screen).not.toMatch(/Back up app preferences to encrypted cloud storage/);
    expect(screen).not.toMatch(/Automatically report errors to fix bugs faster/);
  });

  it('matcher integrity: the pre-fix markup fails the retired-copy check', () => {
    const preFix = '<Text style={styles.settingDescription}>\n  Back up app preferences to encrypted cloud storage\n</Text>';
    expect(stripComments(preFix)).toMatch(/Back up app preferences to encrypted cloud storage/);
  });
});
