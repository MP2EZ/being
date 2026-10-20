/**
 * DEBUG-812 — the erasure-time identity reset must transmit NOTHING, in every opt state.
 *
 * THE FINDING. `resetAnalyticsIdentity` calls `client.reset()`, and the SDK's `reset()` ends
 * in `reloadFeatureFlags()` (@posthog/core 1.29.9). That path gates only on `disabled`, never
 * on `optedOut`, so it POSTs to `/flags` whatever the opt state. Worse, posthog-react-native's
 * `reset()` keeps `DeviceId` by default, and the RN constructor seeds `DeviceId` from the
 * anonymous id, so the request carries the PRE-ERASURE identifier, and that identifier
 * survived erasure on disk. DEBUG-559's options cover construction-time requests only.
 *
 * THE RULING (compliance, b-batch panel). Silence must not depend on opt state: once the user
 * has asked for erasure there is no consent basis for any analytics transmission. The reset
 * suppresses the instance's flag reload before calling `reset()` (and keeps it suppressed, so
 * a reset the SDK defers until init completes is covered too), and passes a keep-list without
 * `DeviceId`.
 *
 * WHY THE REAL SDK. Every other suite mocks `posthog-react-native`, so a network assertion
 * there is a statement about the mock. This drives the vendor's real class with the real
 * `POSTHOG_OPTIONS`, through the production `resetAnalyticsIdentity`, and spies `fetch`.
 *
 * HOW IT CANNOT GO VACUOUS (DEBUG-390). The first case is the raw `client.reset()` in the
 * same harness: it must record the `/flags` POST carrying the pre-erasure `$device_id`. It is
 * also the SDK-bump tripwire: if it stops firing, re-verify feature-flags.md section 4 rather
 * than delete it. The last case proves the client still works after the reset, so the zeros
 * are the fix and not a broken client. Assertions are on `fetch`, never on
 * `reloadFeatureFlags`, because a future SDK could reach `/flags` another way.
 */

import { PostHogPersistedProperty } from 'posthog-react-native';
import { POSTHOG_OPTIONS } from '../PostHogProvider';
import { resetAnalyticsIdentity } from '../analyticsIdentityReset';

function spyOnFetch(): jest.Mock {
  const spy = jest.fn().mockResolvedValue({
    status: 200,
    text: async () => '{}',
    json: async () => ({}),
  });
  (global as unknown as { fetch: unknown }).fetch = spy;
  return spy;
}

/** Init and the flags request are promise-chained; drain several macrotask turns. */
async function letInitSettle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

function urlsOf(spy: jest.Mock): string[] {
  return spy.mock.calls.map((call) => String(call[0]));
}

const TEST_KEY = 'phc_debug812_reset_silence';
const realFetch = (global as unknown as { fetch: unknown }).fetch;

type Client = {
  optIn: () => Promise<void>;
  optOut: () => Promise<void>;
  reset: (keep?: PostHogPersistedProperty[]) => void;
  capture: (event: string, props: Record<string, unknown>) => void;
  flush: () => Promise<unknown>;
  getDistinctId: () => string;
  getAnonymousId: () => string;
  getDeviceId: () => string;
  getPersistedProperty: (key: PostHogPersistedProperty) => unknown;
  setPersistedProperty: (key: PostHogPersistedProperty, value: unknown | null) => void;
};

async function newClient(): Promise<Client> {
  const { PostHog } = require('posthog-react-native');
  const client = new PostHog(TEST_KEY, POSTHOG_OPTIONS) as Client;
  await letInitSettle();
  return client;
}

function persistedValues(client: Client): string {
  return JSON.stringify(
    Object.values(PostHogPersistedProperty).map((key) => client.getPersistedProperty(key)),
  );
}

describe('DEBUG-812 — resetAnalyticsIdentity transmits nothing', () => {
  afterEach(() => {
    (global as unknown as { fetch: unknown }).fetch = realFetch;
  });

  it('CONTROL — a raw client.reset() POSTs /flags carrying the pre-erasure id as $device_id', async () => {
    const spy = spyOnFetch();
    const client = await newClient();
    await client.optOut();
    const preId = client.getAnonymousId();
    // RN seeds DeviceId from the anonymous id; under jest it is persisted on first read.
    expect(client.getDeviceId()).toBe(preId);
    spy.mockClear();

    client.reset();
    await letInitSettle();

    const flagsCall = spy.mock.calls.find((call) => String(call[0]).includes('/flags'));
    expect(flagsCall).toBeDefined();
    const body = JSON.parse(String((flagsCall?.[1] as { body?: unknown })?.body ?? '{}')) as {
      $device_id?: string;
    };
    expect(body.$device_id).toBe(preId);
  });

  it.each([
    ['never consented', async (_c: Client) => undefined],
    ['consented, then revoked', async (c: Client) => {
      await c.optIn();
      await c.optOut();
    }],
    ['opted in at erasure', async (c: Client) => {
      await c.optIn();
    }],
  ])('%s: zero requests to any URL', async (_label, arrange) => {
    const spy = spyOnFetch();
    const client = await newClient();
    await arrange(client);
    await letInitSettle();
    spy.mockClear();

    resetAnalyticsIdentity({ posthog: client });
    await letInitSettle();

    expect(urlsOf(spy)).toEqual([]);
  });

  it('DEBUG-539 holds: a new id, empty queues, and the pre-erasure id in no persisted property (DeviceId included)', async () => {
    spyOnFetch();
    const client = await newClient();
    await client.optIn();
    client.capture('debug812_probe', {});
    const preId = client.getAnonymousId();
    expect(client.getDeviceId()).toBe(preId);
    // Anti-vacuity: before the reset the pre-erasure id IS in DeviceId, so the check below
    // is a statement about the keep-list and not about a property that was never written.
    expect(client.getPersistedProperty(PostHogPersistedProperty.DeviceId)).toBe(preId);
    expect(persistedValues(client)).toContain(preId);

    resetAnalyticsIdentity({ posthog: client });
    await letInitSettle();

    expect(client.getDistinctId()).not.toBe(preId);
    expect(client.getDeviceId()).not.toBe(preId);
    expect(client.getPersistedProperty(PostHogPersistedProperty.Queue)).toBeFalsy();
    expect(client.getPersistedProperty(PostHogPersistedProperty.LogsQueue)).toBeFalsy();
    expect(persistedValues(client)).not.toContain(preId);
  });

  it('CONTROL — the client still works after the reset: optIn() then a capture reaches /batch/', async () => {
    const spy = spyOnFetch();
    const client = await newClient();
    resetAnalyticsIdentity({ posthog: client });
    await letInitSettle();
    spy.mockClear();

    await client.optIn();
    client.capture('debug812_probe', {});
    await client.flush().catch(() => undefined);
    await letInitSettle();

    expect(urlsOf(spy).some((url) => url.includes('/batch/'))).toBe(true);
  });
});
