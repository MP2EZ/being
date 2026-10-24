/**
 * DEBUG-690 — useAnalyticsConsent honours consentStatus.
 *
 * Two branches of loadConsent (`expired`, `under_age`) and revokeConsent keep
 * `currentConsent` in memory with its analytics preference intact. The hook read only
 * that preference, so ConsentSync kept calling `optIn()` after consent had lapsed or
 * been withdrawn. It now emits exactly when `analyticsConsentOutcome` says `emit`.
 *
 * "optOut is called" alone is not the assertion: on the unfixed code optOut fires too
 * (at mount, while loading). What matters is that optIn never follows once the status
 * settles.
 *
 * Real consent store and real loadConsent over in-memory storage; the provider runs
 * in its configured branch with ConsentSync mounted; posthog-react-native is a
 * passthrough with a spy client (same harness as the DEBUG-686 wiring suite).
 */

jest.mock('@/core/config/env', () => {
  const actual = jest.requireActual('@/core/config/env');
  return {
    ...actual,
    env: {
      ...actual.env,
      EXPO_PUBLIC_POSTHOG_API_KEY: 'phc_debug690_status_pin',
      EXPO_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
    },
  };
});

function mockMakeClient() {
  return {
    optIn: jest.fn(),
    optOut: jest.fn(),
    register: jest.fn(),
    capture: jest.fn(),
    setPersistedProperty: jest.fn(),
  };
}
const mockClients = { current: mockMakeClient() };

jest.mock('posthog-react-native', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    PostHogPersistedProperty: { Queue: 'queue', LogsQueue: 'logs_queue' },
    PostHogProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, { testID: 'debug690-ph-provider-branch' }, children),
    usePostHog: () => mockClients.current,
  };
});

jest.mock('../AppLifecycleTracker', () => ({
  __esModule: true,
  AppLifecycleTracker: (): null => null,
}));

jest.mock('../analyticsIdentityReset', () => ({
  __esModule: true,
  registerAnalyticsClient: jest.fn(),
}));

const mockSecureStore: Record<string, string> = {};
const mockAsyncStorage: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStore[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockSecureStore[key];
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockAsyncStorage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockAsyncStorage[key];
    }),
  },
}));

jest.mock('@/core/constants/devMode', () => ({
  getCurrentUserId: () => 'test-user-id',
}));

const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = data;
      return { success: true, operationType: 'store', storageKey: `wellness_async_${key}`, operationTimeMs: 0, dataSize: 0 };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      delete mockWellnessBlobs[key];
    }),
  },
}));

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, renderHook, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PostHogProvider } from '../PostHogProvider';
import { useAnalytics } from '../useAnalytics';
import { useAnalyticsConsent } from '../useAnalyticsConsent';
import { AnalyticsEvents } from '../PHIFilter';
import { analyticsConsentOutcome } from '../analyticsConsentOutcome';
import {
  useConsentStore,
  CONSENT_VERSION,
  type ConsentRecord,
  type ConsentStatus,
} from '@/core/stores/consentStore';

type SetState = Parameters<typeof useConsentStore.setState>[0];

const CONSENT_SECURE_KEY = 'consent_record_v1';
const CONSENT_HISTORY_MIGRATION_FLAG = 'being.consent_history_migration_v2';
const CURRENT_YEAR = new Date().getFullYear();

/** A current-version record with analytics granted, written straight to storage. */
function seedRecord(overrides: Partial<ConsentRecord> = {}): void {
  const now = Date.now();
  const record = {
    consentId: 'consent_debug690_aaaaaa',
    userId: 'test-user-id',
    version: CONSENT_VERSION,
    preferences: {
      analyticsEnabled: true,
      crashReportsEnabled: false,
      cloudSyncEnabled: false,
      researchEnabled: false,
      mentalHealthProcessingConsent: true,
    },
    universalOptOut: false,
    ageVerification: {
      verified: true,
      birthYear: CURRENT_YEAR - 30,
      ageAtVerification: 30,
      verifiedAt: now - 1000,
      isEligible: true,
    },
    timestamp: now - 100_000,
    updatedAt: now - 100_000,
    expiresAt: now + 100_000,
    revoked: false,
    ...overrides,
  } as ConsentRecord;
  mockSecureStore[CONSENT_SECURE_KEY] = JSON.stringify(record);
}

/** Records the hook on every render, and emits through the real useAnalytics gate. */
const seen: boolean[] = [];
function Probe(): React.ReactElement {
  const mayEmit = useAnalyticsConsent();
  const { trackEvent } = useAnalytics();
  seen.push(mayEmit);
  React.useEffect(() => {
    trackEvent(AnalyticsEvents.CHECK_IN_COMPLETED, { duration_ms: 5000 });
  }, [trackEvent]);
  return <Text>probe</Text>;
}

function renderProvider() {
  return render(
    <PostHogProvider>
      <Probe />
    </PostHogProvider>,
  );
}

async function load(): Promise<void> {
  await act(async () => {
    await useConsentStore.getState().loadConsent();
  });
}

/** optIn calls made after the given optOut-call count was reached. */
function optInAfterOptOut(client: ReturnType<typeof mockMakeClient>): number {
  const lastOptOut = Math.max(-1, ...client.optOut.mock.invocationCallOrder);
  return client.optIn.mock.invocationCallOrder.filter((order) => order > lastOptOut).length;
}

beforeEach(() => {
  for (const k of Object.keys(mockSecureStore)) delete mockSecureStore[k];
  for (const k of Object.keys(mockAsyncStorage)) delete mockAsyncStorage[k];
  for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];
  mockAsyncStorage[CONSENT_HISTORY_MIGRATION_FLAG] = '1';
  mockClients.current = mockMakeClient();
  seen.length = 0;
  useConsentStore.setState({
    currentConsent: null,
    staleConsent: null,
    consentHistory: [],
    consentStatus: 'loading',
    isLoading: false,
    error: null,
  } as unknown as SetState);
});

describe('DEBUG-690 — a settled non-emit status keeps PostHog opted out (cold launch)', () => {
  it.each<[string, Partial<ConsentRecord>, ConsentStatus]>([
    ['an expired grant', { expiresAt: Date.now() - 1000 }, 'expired'],
    [
      'an under-age record',
      {
        ageVerification: {
          verified: true,
          birthYear: CURRENT_YEAR - 15,
          ageAtVerification: 15,
          verifiedAt: Date.now() - 1000,
          isEligible: false,
        },
      } as Partial<ConsentRecord>,
      'under_age',
    ],
  ])('%s: the hook is false, optOut holds, optIn never follows, nothing registered or captured', async (_label, overrides, status) => {
    seedRecord(overrides);
    const { getByTestId } = renderProvider();
    expect(getByTestId('debug690-ph-provider-branch')).toBeTruthy(); // configured branch

    await load();

    const state = useConsentStore.getState();
    expect(state.consentStatus).toBe(status);
    // The branch retains the record with analytics on — the shape the old hook trusted.
    expect(state.currentConsent?.preferences.analyticsEnabled).toBe(true);
    expect(seen.at(-1)).toBe(false);
    const client = mockClients.current;
    expect(client.optOut).toHaveBeenCalled();
    expect(client.optIn).not.toHaveBeenCalled();
    expect(client.register).not.toHaveBeenCalled();
    expect(client.capture).not.toHaveBeenCalled();
  });

  it('CONTROL: a valid grant with analytics on opts in, registers and captures', async () => {
    seedRecord();
    renderProvider();

    await load();

    expect(useConsentStore.getState().consentStatus).toBe('valid');
    expect(seen.at(-1)).toBe(true);
    const client = mockClients.current;
    expect(client.optIn).toHaveBeenCalled();
    expect(client.register).toHaveBeenCalledWith({ surface: 'app' });
    expect(client.capture).toHaveBeenCalledWith(AnalyticsEvents.CHECK_IN_COMPLETED, expect.anything());
  });
});

describe('DEBUG-690 — an in-session withdrawal', () => {
  it('revokeConsent: the hook goes false and optIn never follows the optOut', async () => {
    seedRecord();
    renderProvider();
    await load();
    const client = mockClients.current;
    expect(client.optIn).toHaveBeenCalled(); // the grant took effect first

    await act(async () => {
      await useConsentStore.getState().revokeConsent('debug690');
    });

    const state = useConsentStore.getState();
    expect(state.consentStatus).toBe('revoked');
    expect(state.currentConsent?.preferences.analyticsEnabled).toBe(true); // retained
    expect(seen.at(-1)).toBe(false);
    expect(client.optOut).toHaveBeenCalled();
    expect(optInAfterOptOut(client)).toBe(0);
  });

  it('CONTROL: returning to valid flips back to optIn', async () => {
    seedRecord({ expiresAt: Date.now() - 1000 });
    renderProvider();
    await load();
    const client = mockClients.current;
    expect(client.optIn).not.toHaveBeenCalled();

    act(() => {
      useConsentStore.setState({ consentStatus: 'valid' } as unknown as SetState);
    });

    expect(seen.at(-1)).toBe(true);
    expect(optInAfterOptOut(client)).toBe(1);
  });
});

/** Every member of the ConsentStatus union, read from the source with comments stripped. */
function consentStatusUnion(): string[] {
  const raw = fs.readFileSync(path.join(__dirname, '..', '..', 'stores', 'consentStore.ts'), 'utf8');
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const match = source.match(/export type ConsentStatus\s*=([^;]*);/);
  expect(match).not.toBeNull();
  return [...match![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
}

describe('DEBUG-690 — the hook is analyticsConsentOutcome === emit, for every status', () => {
  const STATUSES: ConsentStatus[] = [
    'loading',
    'valid',
    'version_mismatch',
    'integrity_error',
    'revoked',
    'expired',
    'missing',
    'under_age',
  ];
  const PREFERENCES = [
    ['analytics on', { preferences: { analyticsEnabled: true }, universalOptOut: false }],
    ['analytics off', { preferences: { analyticsEnabled: false }, universalOptOut: false }],
    ['universal opt-out', { preferences: { analyticsEnabled: true }, universalOptOut: true }],
    ['no record', null],
  ] as const;

  it('the table covers the whole ConsentStatus union', () => {
    expect([...STATUSES].sort()).toEqual(consentStatusUnion());
  });

  it('CONTROL: the union scan reads a fixture union', () => {
    const fixture = "export type ConsentStatus =\n  | 'a'\n  /** 'not_me' */\n  | 'b';";
    const stripped = fixture.replace(/\/\*[\s\S]*?\*\//g, '');
    const members = [...stripped.match(/export type ConsentStatus\s*=([^;]*);/)![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(members).toEqual(['a', 'b']);
  });

  const rows = STATUSES.flatMap((status) => PREFERENCES.map(([label, consent]) => [status, label, consent] as const));
  it.each(rows)('%s with %s', (status, _label, consent) => {
    useConsentStore.setState({ consentStatus: status, currentConsent: consent } as unknown as SetState);
    const { result } = renderHook(() => useAnalyticsConsent());
    const expected = analyticsConsentOutcome({ consentStatus: status, currentConsent: consent as never }) === 'emit';
    expect(result.current).toBe(expected);
  });

  it('only valid with analytics on and no universal opt-out emits', () => {
    useConsentStore.setState({ consentStatus: 'valid', currentConsent: PREFERENCES[0][1] } as unknown as SetState);
    expect(renderHook(() => useAnalyticsConsent()).result.current).toBe(true);
  });

  it('an unknown status is false and does not throw (the hook renders above RootCrisisBoundary)', () => {
    useConsentStore.setState({ consentStatus: 'not_a_status', currentConsent: PREFERENCES[0][1] } as unknown as SetState);
    expect(() => analyticsConsentOutcome({ consentStatus: 'not_a_status' as never, currentConsent: null })).toThrow();
    const { result } = renderHook(() => useAnalyticsConsent());
    expect(result.current).toBe(false);
  });
});
