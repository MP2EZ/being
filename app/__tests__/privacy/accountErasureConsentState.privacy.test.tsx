/**
 * Account erasure leaves no live consent or onboarding state (DEBUG-755).
 *
 * `deleteAccountAndWipe` preserves the consent record, the legal-gate record and the
 * age verification (ERASURE_EXCLUDED_SECURE_STORE_KEYS), never touched
 * `app_settings_v1`, and left consentStore 'valid' in memory. So the next session —
 * possibly a different person on the same phone — ran on the deleted account's
 * consent: `canPerformOperation('cloud_sync')` stayed true, onboarding re-granted from
 * the preserved records, and a cold launch went straight to Main.
 *
 * This slice (scoped at batch approval) RETIRES those records rather than deleting them:
 * a record whose timestamp does not post-date the deletion attestation is never a live
 * grant and never an input to a new one. Deleting them, and the matching privacy-policy
 * copy, is DEBUG-762.
 *
 * Drives the REAL service, registry, consentStore, settingsStore and SecureStorageService
 * over in-memory disks, seeding through the stores' own writers, and asserts on memory
 * AND disk afterwards. Only the network delete, the analytics reset and the export sweep
 * are faked (each has its own suite). `.privacy.` so the Safety + privacy gates CI job
 * runs it (INFRA-368).
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockAsync = new Map<string, string>();
const mockSecure = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (k: string) => mockAsync.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockAsync.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockAsync.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockAsync.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockAsync.delete(k));
    }),
  };
  return { __esModule: true, default: api, ...api };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecure.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));

// Erasure deletes the master key, so the first post-erasure consent load regenerates
// one. The global AES mock's randomKey is not valid base64 and cannot; the shared
// helper's in-memory cipher can (same as accountDeletionAttestationDurability).
jest.mock('react-native-aes-crypto', () => require('../helpers/mockEncryption').createAesCryptoMock());
jest.mock('expo-crypto', () => require('../helpers/mockEncryption').createExpoCryptoMock());

jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { deleteAccount: jest.fn(async () => true) },
}));
jest.mock('@/core/analytics/analyticsIdentityReset', () => ({ resetAnalyticsIdentity: jest.fn() }));
jest.mock('@/core/services/privacy/exportArtifactSweeper', () => ({ sweepExportArtifacts: jest.fn(() => 0) }));

// OnboardingScreen's own leaf dependencies — the same set its privacy suite stubs. The
// consent store is deliberately NOT mocked: the point is the real post-erasure store.
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace }),
  useFocusEffect: jest.fn(),
  // The real service graph reaches navigationRef (crisis-destination checks); unmounted here.
  createNavigationContainerRef: () => ({
    isReady: () => false,
    getCurrentRoute: () => undefined,
    getRootState: () => undefined,
  }),
}));
jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: jest.fn(),
    trackOnboardingStarted: jest.fn(),
    trackOnboardingStepCompleted: jest.fn(),
    trackOnboardingCompleted: jest.fn(),
  }),
}));
jest.mock('@/core/components/shared/BrainIcon', () => {
  const React_ = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => React_.createElement(View, { testID: 'brain-icon' }) };
});
jest.mock('@/core/components/NotificationTimePicker', () => ({ __esModule: true, default: () => null }));
jest.mock('@/features/crisis/components/CollapsibleCrisisButton', () => ({ __esModule: true, default: () => null }));

import { ACCOUNT_DELETION_ATTESTATION_KEY } from '@/core/services/security/SecureStorageService';
import { deleteAccountAndWipe } from '@/core/services/privacy/AccountDeletionService';
import {
  decideWellnessWrite,
  getLegalGateConsents,
  recordLegalGateConsents,
  useConsentStore,
} from '@/core/stores/consentStore';
import { useSettingsStore } from '@/core/stores/settingsStore';
import OnboardingScreen from '@/features/onboarding/screens/OnboardingScreen';

const CONSENT_KEY = 'consent_record_v1';
const SETTINGS_KEY = 'app_settings_v1';
const OPERATIONS: Parameters<ReturnType<typeof useConsentStore.getState>['canPerformOperation']>[0][] = [
  'analytics',
  'crash_reports',
  'cloud_sync',
  'research',
  'mental_health_processing',
];

let now = 1_790_000_000_000;
const clock = () => now;

/** The pre-erasure account, written through the real writers in the order the app uses. */
async function seedOnboardedAccount(): Promise<void> {
  const consent = useConsentStore.getState();
  await consent.verifyAge(1990);
  await recordLegalGateConsents({
    tosAccepted: true,
    privacyAccepted: true,
    wellnessDisclaimerAcknowledged: true,
    mentalHealthProcessingConsent: true,
  });
  const age = await consent.getStoredAgeVerification();
  await consent.grantConsent(
    {
      analyticsEnabled: true,
      crashReportsEnabled: true,
      cloudSyncEnabled: true,
      researchEnabled: false,
      mentalHealthProcessingConsent: true,
    },
    age!,
  );
  await useConsentStore.getState().loadConsent();
  await useSettingsStore.getState().loadSettings();
  await useSettingsStore.getState().markOnboardingComplete();
  await useSettingsStore.getState().updatePracticeSettings({
    practiceHaptics: true,
    practiceHapticsInterval: 'minute',
    practiceHapticsPrompted: true,
  });
  await useSettingsStore.getState().updatePrivacySettings({ analyticsEnabled: true });
}

/** Erase, with the clock moved on so the attestation strictly post-dates the grant. */
async function erase(): Promise<void> {
  now += 60_000;
  const result = await deleteAccountAndWipe({ posthog: null });
  expect(result).toEqual({ ok: true });
}

beforeEach(() => {
  mockAsync.clear();
  mockSecure.clear();
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockImplementation(clock);
  useConsentStore.setState({ consentStatus: 'loading', currentConsent: null, staleConsent: null, consentHistory: [] });
  useSettingsStore.setState({ settings: null, error: null, isLoading: false });
  mockNavigate.mockImplementation((routeName: string, params?: { onSkip?: () => void }) => {
    if (routeName === 'AssessmentFlow' && params?.onSkip) params.onSkip();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('control: the seeded account is live before erasure', () => {
  it('grants every operation the account consented to, and is onboarded', async () => {
    await seedOnboardedAccount();
    expect(useConsentStore.getState().consentStatus).toBe('valid');
    expect(useConsentStore.getState().canPerformOperation('cloud_sync')).toBe(true);
    expect(useSettingsStore.getState().settings?.onboardingCompleted).toBe(true);
    expect(await getLegalGateConsents()).not.toBeNull();
    expect(await useConsentStore.getState().getStoredAgeVerification()).not.toBeNull();
  });
});

describe('the warm session after erasure (AC1, AC4)', () => {
  it('holds no live consent in memory: status missing, every operation refused', async () => {
    await seedOnboardedAccount();
    await erase();
    const consent = useConsentStore.getState();
    expect(consent.consentStatus).toBe('missing');
    expect(consent.currentConsent).toBeNull();
    for (const op of OPERATIONS) expect([op, consent.canPerformOperation(op)]).toEqual([op, false]);
    expect(decideWellnessWrite().allowed).toBe(false);
  });

  it('never offers the preserved legal-gate or age records as an input to a new grant', async () => {
    await seedOnboardedAccount();
    await erase();
    expect(await getLegalGateConsents()).toBeNull();
    expect(await useConsentStore.getState().getStoredAgeVerification()).toBeNull();
  });

  it('keeps the attestation and the retired records on disk (retire, not delete — DEBUG-762)', async () => {
    await seedOnboardedAccount();
    await erase();
    expect(mockSecure.has(ACCOUNT_DELETION_ATTESTATION_KEY)).toBe(true);
    expect(mockSecure.has(CONSENT_KEY)).toBe(true);
  });

  it('onboarding after erasure returns to the legal gate and grants nothing', async () => {
    await seedOnboardedAccount();
    await erase();
    const recordBefore = mockSecure.get(CONSENT_KEY);

    const api = render(<OnboardingScreen />);
    fireEvent.press(api.getByLabelText('Begin Your Practice'));
    await waitFor(() => expect(api.getByText('Welcome to Stoic Mindfulness')).toBeTruthy());
    fireEvent.press(api.getByText('Continue'));
    await waitFor(() => expect(api.getByText('Mindfulness Practice Reminders')).toBeTruthy());
    fireEvent.press(api.getByText('Continue'));
    await waitFor(() => expect(api.getByText('Privacy Settings')).toBeTruthy());
    fireEvent.press(api.getByLabelText('Continue'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('LegalGate'));
    expect(mockSecure.get(CONSENT_KEY)).toBe(recordBefore);
    expect(useConsentStore.getState().consentStatus).toBe('missing');
  });
});

describe('settings after erasure (AC3)', () => {
  it('leaves no onboardingCompleted:true in memory or on disk, and resets every section', async () => {
    await seedOnboardedAccount();
    await erase();
    const settings = useSettingsStore.getState().settings;
    expect(settings).not.toBeNull();
    expect(settings!.onboardingCompleted).toBe(false);
    expect(settings!.privacy.analyticsEnabled).toBe(false);
    expect(settings!.practices).toEqual({
      practiceHaptics: false,
      practiceHapticsInterval: 'none',
      practiceHapticsPrompted: false,
    });
    const onDisk = mockAsync.get(SETTINGS_KEY);
    expect(onDisk === undefined || JSON.parse(onDisk).onboardingCompleted === false).toBe(true);
  });

  it('a background write after erasure does not restore onboarding (AppLifecycleTracker)', async () => {
    await seedOnboardedAccount();
    await erase();
    await useSettingsStore.getState().setLastActiveTimestamp(now);
    expect(useSettingsStore.getState().settings!.onboardingCompleted).toBe(false);
    expect(JSON.parse(mockAsync.get(SETTINGS_KEY)!).onboardingCompleted).toBe(false);
  });
});

describe('a cold launch after erasure (AC1, AC2)', () => {
  it('loads no live consent and no onboarded settings from what erasure left on disk', async () => {
    await seedOnboardedAccount();
    await erase();

    // Simulate the kill: fresh module instances over the SAME disks.
    let status = '';
    let onboarded: boolean | undefined;
    let gate: unknown = 'unset';
    let age: unknown = 'unset';
    await new Promise<void>((resolve, reject) => {
      jest.isolateModules(() => {
        const { useConsentStore: freshConsent, getLegalGateConsents: freshGate } =
          require('@/core/stores/consentStore');
        const { useSettingsStore: freshSettings } = require('@/core/stores/settingsStore');
        (async () => {
          await freshConsent.getState().loadConsent();
          status = freshConsent.getState().consentStatus;
          onboarded = (await freshSettings.getState().loadSettings())?.onboardingCompleted;
          gate = await freshGate();
          age = await freshConsent.getState().getStoredAgeVerification();
        })().then(resolve, reject);
      });
    });
    expect(status).toBe('missing');
    expect(onboarded).toBe(false);
    expect(gate).toBeNull();
    expect(age).toBeNull();
  });

  it('a fresh grant after erasure is live again (the retirement is not permanent)', async () => {
    await seedOnboardedAccount();
    await erase();
    now += 60_000;
    const consent = useConsentStore.getState();
    await consent.verifyAge(1985);
    await recordLegalGateConsents({
      tosAccepted: true,
      privacyAccepted: true,
      wellnessDisclaimerAcknowledged: true,
      mentalHealthProcessingConsent: true,
    });
    const age = await consent.getStoredAgeVerification();
    expect(age?.birthYear).toBe(1985);
    expect(await getLegalGateConsents()).not.toBeNull();
    await consent.grantConsent(
      {
        analyticsEnabled: false,
        crashReportsEnabled: false,
        cloudSyncEnabled: false,
        researchEnabled: false,
        mentalHealthProcessingConsent: true,
      },
      age!,
    );
    await useConsentStore.getState().loadConsent();
    expect(useConsentStore.getState().consentStatus).toBe('valid');
    expect(useConsentStore.getState().canPerformOperation('cloud_sync')).toBe(false);
  });
});
