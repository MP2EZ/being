/**
 * DEBUG-559 — a pre-consent PostHog client must transmit NOTHING.
 *
 * WHAT THIS FILE IS FOR
 * ---------------------
 * DEBUG-559 made `<PHProvider>` mount unconditionally. It had to: the provider
 * returned a bare fragment without analytics consent and `<PHProvider>` with it,
 * an element-TYPE swap at a fixed position above `SafeAreaProvider`, so granting
 * consent destroyed and recreated every 988 affordance in the app.
 *
 * The cost of that fix is that a real PostHog client now exists from launch,
 * before the user has consented to anything. The compliance ruling allowed it on
 * one condition, and the AC required the condition ESTABLISHED rather than
 * assumed: a mounted-but-no-op client must make no network call.
 *
 * WHY THIS DRIVES THE REAL SDK AND NOT A MOCK
 * -------------------------------------------
 * Every other suite that touches this path mocks `posthog-react-native`, so a
 * network assertion there would be a statement about the mock. The claim being
 * pinned is a claim about the SHIPPED LIBRARY's behaviour under our options, so
 * this file deliberately does not mock it. It constructs the vendor's real
 * `PostHog` class and spies `fetch`.
 *
 * It also imports the REAL `POSTHOG_OPTIONS` from the provider rather than
 * restating the values. A test asserting against its own copy would prove only
 * that two literals agree, including when both are wrong.
 *
 * WHY `defaultOptIn: false` IS NOT THE THING BEING TESTED
 * ------------------------------------------------------
 * This is the whole point, and it is counter-intuitive enough to state plainly:
 * `defaultOptIn: false` does NOT silence the client. The SDK's `optedOut` check
 * gates only `enqueue()`/`sendImmediate()` — the capture path. The constructor's
 * init sequence gates on `isDisabled`, which reads `disabled` and never consults
 * `optedOut`. So at the SDK's defaults the client fires remote-config and
 * feature-flag requests at construction, carrying an anonymous device id, before
 * consent exists. `disableRemoteConfig`, `preloadFeatureFlags: false` and
 * `disableSurveys` are what actually close that, and the "defaults" control below
 * is what proves they are load-bearing rather than decorative.
 *
 * HOW IT CANNOT GO VACUOUS (DEBUG-390)
 * ------------------------------------
 * "Zero fetch calls" is exactly what a broken harness reports — a client that
 * failed to construct, an env with no network layer, a spy on the wrong global.
 * Three controls make the zero mean something:
 *   1. the SAME harness, with the three suppression options removed, records real
 *      requests (so the harness can observe a call at all);
 *   2. that control also asserts the anonymous id is IN the request body (so it
 *      is the actual privacy exposure being prevented, not just traffic);
 *   3. after `optIn()`, a captured event reaches `/batch/` (so the client is
 *      genuinely functional and the silence is the opt state, not breakage).
 */

import { POSTHOG_OPTIONS } from '../PostHogProvider';

/** A stand-in for the network. Returns the shape the SDK expects of any endpoint. */
function spyOnFetch(): jest.Mock {
  const spy = jest.fn().mockResolvedValue({
    status: 200,
    text: async () => '{}',
    json: async () => ({}),
  });
  (global as unknown as { fetch: unknown }).fetch = spy;
  return spy;
}

/** The SDK's init work is `.then()`-chained, so an immediate assertion passes vacuously. */
async function letInitSettle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

function urlsOf(spy: jest.Mock): string[] {
  return spy.mock.calls.map((call) => String(call[0]));
}

const TEST_KEY = 'phc_debug559_network_silence';
const realFetch = (global as unknown as { fetch: unknown }).fetch;

describe('DEBUG-559 — the pre-consent client is silent', () => {
  afterEach(() => {
    (global as unknown as { fetch: unknown }).fetch = realFetch;
  });

  it('makes NO network call when constructed with the options the app actually ships', async () => {
    const spy = spyOnFetch();
    const { PostHog } = require('posthog-react-native');

    // POSTHOG_OPTIONS verbatim — no persistence override, no edits. This is the
    // exact object App.tsx's provider hands to <PHProvider>.
    new PostHog(TEST_KEY, POSTHOG_OPTIONS);
    await letInitSettle();

    expect(urlsOf(spy)).toEqual([]);
  });

  /**
   * The control that makes the case above mean something. Same harness, same
   * timing, same spy — only the three suppression options removed.
   */
  it('CONTROL — the same harness records real requests at the SDK defaults, carrying the anonymous id', async () => {
    const spy = spyOnFetch();
    const { PostHog } = require('posthog-react-native');

    new PostHog(TEST_KEY, { host: POSTHOG_OPTIONS.host });
    await letInitSettle();

    const urls = urlsOf(spy);
    expect(urls.length).toBeGreaterThan(0);
    // The feature-flag call is the one that matters: it is a request to a third
    // party, made before the user has consented to anything.
    const flagsCall = spy.mock.calls.find((call) => String(call[0]).includes('/flags'));
    expect(flagsCall).toBeDefined();

    // ...and it identifies the device. This is the exposure the options prevent,
    // asserted as a property of the payload rather than as a count of requests.
    const body = String((flagsCall?.[1] as { body?: unknown })?.body ?? '');
    const parsed = JSON.parse(body) as { distinct_id?: string; $anon_distinct_id?: string };
    expect(typeof parsed.distinct_id).toBe('string');
    expect(parsed.distinct_id).toBeTruthy();
    expect(parsed.$anon_distinct_id).toBe(parsed.distinct_id);
  });

  it('CONTROL — the client is functional: after optIn(), a captured event reaches /batch/', async () => {
    const spy = spyOnFetch();
    const { PostHog } = require('posthog-react-native');

    const client = new PostHog(TEST_KEY, POSTHOG_OPTIONS);
    await client.optIn();
    client.capture('debug559_probe', {});
    await client.flush().catch(() => undefined);
    await letInitSettle();

    // Separates "silent because opted out" from "silent because broken". Without
    // this, every zero above is equally consistent with a client that never worked.
    expect(urlsOf(spy).some((url) => url.includes('/batch/'))).toBe(true);
  });

  it('captures nothing while opted out, even when flush() is called explicitly', async () => {
    const spy = spyOnFetch();
    const { PostHog } = require('posthog-react-native');

    const client = new PostHog(TEST_KEY, POSTHOG_OPTIONS);
    // No optIn(): defaultOptIn:false leaves the client opted out from birth.
    client.capture('debug559_probe', {});
    await client.flush().catch(() => undefined);
    await letInitSettle();

    expect(urlsOf(spy)).toEqual([]);
  });

  /**
   * Guards the mechanism rather than the values. If a future edit drops one of the
   * three suppression keys, the first case above goes red — but only while this
   * file's control still proves the harness can see a request. Pinning the keys
   * here as well means the failure names WHICH option went missing.
   */
  it('ships the three keys that do the suppressing, not just defaultOptIn', () => {
    expect(POSTHOG_OPTIONS.disableRemoteConfig).toBe(true);
    expect(POSTHOG_OPTIONS.preloadFeatureFlags).toBe(false);
    expect(POSTHOG_OPTIONS.disableSurveys).toBe(true);
    // Kept for the capture path, and must stay false: there is no `enable()` to
    // undo `disabled: true`, and it would also kill the post-consent client.
    expect(POSTHOG_OPTIONS.defaultOptIn).toBe(false);
    expect(POSTHOG_OPTIONS.disabled).toBe(false);
  });
});
