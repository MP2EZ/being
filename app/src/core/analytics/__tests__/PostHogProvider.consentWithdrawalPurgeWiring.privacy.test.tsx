/**
 * DEBUG-686 — ConsentSync installs the consent-withdrawal purge once per client
 * and removes it on unmount.
 *
 * The real-SDK suite (`PostHogProvider.consentWithdrawalPurge.privacy.test.ts`)
 * pins what the purge does; this file pins that the shipped provider actually
 * wires it, without disturbing the DEBUG-559 tree shape. Same harness as
 * `PostHogProvider.consentRemount.privacy.test.tsx`: the env override puts the
 * provider in its configured branch, and `posthog-react-native` is a passthrough
 * with a fake client.
 */

jest.mock('@/core/config/env', () => {
  const actual = jest.requireActual('@/core/config/env');
  return {
    ...actual,
    env: {
      ...actual.env,
      EXPO_PUBLIC_POSTHOG_API_KEY: 'phc_debug686_wiring_pin',
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
      ReactActual.createElement(View, { testID: 'debug686-ph-provider-branch' }, children),
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

// Wrap the REAL installer so both the call accounting and the real behaviour
// are observable.
const mockInstallSpy = jest.fn();
const mockUnsubscribeSpy = jest.fn();
jest.mock('../consentWithdrawalPurge', () => {
  const actual = jest.requireActual('../consentWithdrawalPurge');
  return {
    __esModule: true,
    ...actual,
    installConsentWithdrawalPurge: (client: unknown, store?: unknown) => {
      mockInstallSpy(client);
      const unsubscribe = actual.installConsentWithdrawalPurge(client, store);
      return () => {
        mockUnsubscribeSpy(client);
        unsubscribe();
      };
    },
  };
});

import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PostHogProvider } from '../PostHogProvider';
import { useConsentStore } from '@/core/stores/consentStore';

type SetState = Parameters<typeof useConsentStore.setState>[0];

function setConsent(analyticsEnabled: boolean, consentStatus: 'valid' | 'loading' = 'valid'): void {
  useConsentStore.setState({
    consentStatus,
    currentConsent: { preferences: { analyticsEnabled }, universalOptOut: false },
  } as unknown as SetState);
}

function queueNullCalls(client: ReturnType<typeof mockMakeClient>): number {
  return client.setPersistedProperty.mock.calls.filter((c) => c[0] === 'queue' && c[1] === null).length;
}

function renderProvider() {
  return render(
    <PostHogProvider>
      <Text>child</Text>
    </PostHogProvider>,
  );
}

beforeEach(() => {
  mockClients.current = mockMakeClient();
  mockInstallSpy.mockClear();
  mockUnsubscribeSpy.mockClear();
  useConsentStore.setState({ consentStatus: 'loading', currentConsent: null } as unknown as SetState);
});

describe('DEBUG-686 — ConsentSync wires the withdrawal purge', () => {
  it('installs exactly once per client, across consent flips that re-render ConsentSync', () => {
    setConsent(true);
    const { getByTestId } = renderProvider();
    expect(getByTestId('debug686-ph-provider-branch')).toBeTruthy(); // configured branch

    expect(mockInstallSpy).toHaveBeenCalledTimes(1);
    expect(mockInstallSpy).toHaveBeenCalledWith(mockClients.current);

    act(() => setConsent(false));
    act(() => setConsent(true));
    act(() => setConsent(false));

    expect(mockInstallSpy).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribeSpy).not.toHaveBeenCalled();
  });

  it('the installed subscription purges the queue on the withdrawal write', () => {
    setConsent(true);
    renderProvider();
    const client = mockClients.current;
    expect(queueNullCalls(client)).toBe(0); // grant side: nothing purged

    act(() => setConsent(false));

    expect(queueNullCalls(client)).toBeGreaterThan(0);
    expect(client.setPersistedProperty).toHaveBeenCalledWith('logs_queue', null);
  });

  it('unsubscribes on unmount: a withdrawal after unmount purges nothing', () => {
    setConsent(true);
    const { unmount } = renderProvider();
    const client = mockClients.current;

    unmount();
    expect(mockUnsubscribeSpy).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribeSpy).toHaveBeenCalledWith(client);

    act(() => setConsent(false));
    expect(queueNullCalls(client)).toBe(0);
  });

  it('a new client instance gets its own subscription and the old one is removed', () => {
    setConsent(true);
    const { rerender } = renderProvider();
    const first = mockClients.current;

    mockClients.current = mockMakeClient();
    rerender(
      <PostHogProvider>
        <Text>child</Text>
      </PostHogProvider>,
    );

    expect(mockInstallSpy).toHaveBeenCalledTimes(2);
    expect(mockUnsubscribeSpy).toHaveBeenCalledWith(first);

    act(() => setConsent(false));
    expect(queueNullCalls(first)).toBe(0);
    expect(queueNullCalls(mockClients.current)).toBeGreaterThan(0);
  });

  it('holds while the store is loading — nothing is purged before consent is known', () => {
    renderProvider();
    act(() => setConsent(false, 'loading'));
    expect(queueNullCalls(mockClients.current)).toBe(0);
  });
});

/**
 * The tree-shape invariants DEBUG-559 depends on are pinned by
 * consentRemount.privacy.test.tsx (unedited). This adds only what DEBUG-686
 * could have broken: ConsentSync still renders nothing and the purge is wired
 * inside it, not as a new sibling or a consent read in the provider body.
 * Comments stripped before matching (DEBUG-390).
 */
describe('DEBUG-686 — source shape', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'PostHogProvider.tsx'), 'utf8');
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('installs the purge inside ConsentSync, which still returns null', () => {
    const start = source.indexOf('function ConsentSync');
    const end = source.indexOf('function RegisterSurfaceProperty');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    expect(/installConsentWithdrawalPurge\s*\(\s*posthog\s*\)/.test(body)).toBe(true);
    expect(/return\s+null\s*;/.test(body)).toBe(true);
    // Known-bad literal control for the positive matcher.
    expect(/installConsentWithdrawalPurge\s*\(\s*posthog\s*\)/.test('installConsentWithdrawalPurge(posthog)')).toBe(true);
  });

  it('adds no purge call or consent read to the PostHogProvider body itself', () => {
    const body = source.slice(source.indexOf('export function PostHogProvider'));
    const component = body.slice(0, body.indexOf('export function usePostHogConfigured'));
    expect(/installConsentWithdrawalPurge|useConsentStore|useAnalyticsConsent/.test(component)).toBe(false);
    expect(/useConsentStore/.test('const s = useConsentStore((x) => x);')).toBe(true);
  });
});
