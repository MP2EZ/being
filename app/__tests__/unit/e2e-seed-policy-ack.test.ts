/**
 * FEAT-860 — every e2e seed branch that reaches Main ends with the current
 * privacy-policy acknowledgement.
 *
 * The Maestro safety flows start from a seeded Home, and their coordinates assume the
 * policy-change notice is not on it. The onboarded branch gets the acknowledgement from
 * `recordLegalGateConsents`; the two stale-consent branches skip that call on purpose
 * (see e2eSeed.ts), so they write it themselves. The ungranted branch writes nothing and
 * never reaches Main, so it must not gain one.
 */
const mockSecure = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecure.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));

import { getPolicyRevisions } from '@/features/consent/services/policyRevisions';

const ACK_KEY = 'privacy_policy_ack_v1';

function loadSeed(initialUrl: string | null) {
  jest.resetModules();
  jest.doMock('expo-linking', () => ({ getInitialURL: jest.fn().mockResolvedValue(initialUrl) }));
  jest.doMock('@/core/config/env', () => ({ env: { EXPO_PUBLIC_E2E_SEED_ONBOARDED: 'true' } }));
  jest.doMock('@/core/stores/settingsStore', () => ({
    useSettingsStore: {
      getState: () => ({
        loadSettings: jest.fn().mockResolvedValue(null),
        markOnboardingComplete: jest.fn().mockResolvedValue(undefined),
      }),
    },
  }));
  jest.doMock('@/core/stores/consentStore', () => {
    const actual = jest.requireActual('@/core/stores/consentStore');
    return {
      ...actual,
      useConsentStore: {
        getState: () => ({
          verifyAge: jest.fn().mockResolvedValue({ eligible: true, age: 36 }),
          grantConsent: jest.fn().mockResolvedValue(undefined),
        }),
      },
      __seedStaleConsentRecordForE2E: jest.fn().mockResolvedValue(true),
    };
  });
  jest.doMock('@/core/stores/bugReportStore', () => ({ openBugReport: jest.fn() }));
  jest.doMock('@/features/practices/stores/stoicPracticeStore', () => ({
    useStoicPracticeStore: {
      getState: () => ({
        loadPersistedState: jest.fn().mockResolvedValue(undefined),
        markCheckInComplete: jest.fn().mockResolvedValue(undefined),
      }),
    },
  }));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/core/config/e2eSeed') as {
    maybeSeedE2EOnboardedState: () => Promise<void>;
    E2E_SEED_UNGRANTED_MARKER: string;
    E2E_SEED_STALE_CONSENT_MARKER: string;
    E2E_SEED_STALE_INELIGIBLE_MARKER: string;
  };
}

/** The markers live in the seed module, which cannot be imported before its mocks exist. */
const markers = () => loadSeed(null);

const readAck = () => {
  const raw = mockSecure.get(ACK_KEY);
  return raw ? JSON.parse(raw) : null;
};

beforeEach(() => {
  mockSecure.clear();
});

afterEach(() => {
  jest.resetModules();
});

describe('e2e seed — privacy-policy acknowledgement (FEAT-860)', () => {
  const header = () => getPolicyRevisions().headerVersion;

  it('the onboarded branch ends with the current acknowledgement', async () => {
    await loadSeed(null).maybeSeedE2EOnboardedState();
    expect(readAck()).toMatchObject({ version: header(), source: 'legal_gate' });
  });

  it('the stale-consent branch ends with the current acknowledgement', async () => {
    await loadSeed(`being://home?${markers().E2E_SEED_STALE_CONSENT_MARKER}`).maybeSeedE2EOnboardedState();
    expect(readAck()).toMatchObject({ version: header(), source: 'legal_gate' });
  });

  it('the stale-consent INELIGIBLE branch ends with the current acknowledgement', async () => {
    await loadSeed(`being://home?${markers().E2E_SEED_STALE_INELIGIBLE_MARKER}`).maybeSeedE2EOnboardedState();
    expect(readAck()).toMatchObject({ version: header(), source: 'legal_gate' });
  });

  it('the ungranted branch never reaches Main and writes nothing', async () => {
    await loadSeed(`being://home?${markers().E2E_SEED_UNGRANTED_MARKER}`).maybeSeedE2EOnboardedState();
    expect(readAck()).toBeNull();
  });
});
