/**
 * DEBUG-474 — `fetchSubscriptionStatuses`, the App Store Server API subscription-status call.
 *
 * WHY A SECOND SUITE RATHER THAN CASES APPENDED TO `app-store-server-api.test.ts`.
 * Every hardening property of `fetchSignedTransactionInfo` is a property of THAT FUNCTION,
 * not of the module — identifier validation before key use, host selection with no default,
 * the origin/protocol re-assertion, redirect refusal, the timeout, reading only Apple's
 * numeric errorCode, and the 200-carrying-garbage check are each written out again in the
 * new function on purpose. A suite that assumed they carried over would be asserting the
 * module's reputation rather than the new code, so they are re-proven here from scratch.
 *
 * WHAT IS DELIBERATELY ABSENT FROM THE RETURN TYPE, and therefore tested as absent:
 * Apple's `LastTransactionsItem.status` (unsigned 1-5), its unsigned `originalTransactionId`,
 * and `StatusResponse.bundleId` / `.environment`. Surfacing any of them would create an
 * unauthenticated path to a subscription downgrade; not returning them is what stops a later
 * caller regressing into trusting them.
 *
 * NO KEY MATERIAL IS COMMITTED — throwaway P-256 keys are generated in-process, as in the
 * sibling suite. CI runs `deno task test --cached-only` against a COLD DENO_DIR, so only the
 * already-vendored `deno.land/std@0.177.0` and `esm.sh/jose@5.9.6` specifiers may appear here.
 */

import {
  assert,
  assertEquals,
  assertFalse,
  assertRejects,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { exportPKCS8 } from 'https://esm.sh/jose@5.9.6';
import {
  APP_STORE_SERVER_API_ORIGINS,
  AppleAuthError,
  AppleUnavailableError,
  fetchSubscriptionStatuses,
  InvalidTransactionIdError,
  REQUEST_TIMEOUT_MS,
  TransactionNotFoundError,
  __resetTokenCacheForTests,
} from '../_shared/appStoreServerApi.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

async function generatePem(): Promise<string> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  return await exportPKCS8(pair.privateKey);
}

async function credentials() {
  return { issuerId: 'issuer-uuid', keyId: 'KEYID12345', privateKeyPem: await generatePem() };
}

/** A JWS-SHAPED string. Not Apple-signed and not verifiable — this module never verifies.
 *
 * Deliberately NOT built from a realistic `eyJhbGci…` header, matching the fixture style in
 * the sibling suite. `__tests__/safety/crisisAlertNoSecrets.config.test.ts` scans this whole
 * directory for committed secrets and its JWT pattern is `eyJ…\.…` — a realistic-looking
 * fixture trips it, and a fixture is not worth weakening a secret scanner for. The `tag` is
 * stripped to base64url characters so the three segments stay well-formed. */
const JWS = (tag: string) =>
  `aGVhZGVy.cGF5bG9hZA${tag.replace(/[^A-Za-z0-9_-]/g, '')}.c2lnbmF0dXJl`;

function statusResponse(groups: unknown[]): Response {
  return new Response(JSON.stringify({
    // Present in Apple's real payload and deliberately ignored by the client — included
    // here precisely so the tests below can prove they are not surfaced.
    environment: 'Production',
    bundleId: 'fyi.being.app',
    appAppleId: 123456789,
    data: groups,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function group(items: unknown[]) {
  return { subscriptionGroupIdentifier: '20job7dbc', lastTransactions: items };
}

function item(tag: string, extra: Record<string, unknown> = {}) {
  return {
    originalTransactionId: '2000000012345678',
    status: 1,
    signedTransactionInfo: JWS(`txn${tag}`),
    signedRenewalInfo: JWS(`rnw${tag}`),
    ...extra,
  };
}

const VALID_ID = '2000000012345678';

/** `iat` out of the bearer token in an Authorization header. Used to prove a RE-MINT:
 * comparing signature bytes cannot, because ECDSA signing is not required to be
 * deterministic, so two mints of an identical payload may or may not differ. */
function iatOf(authHeader: string): number {
  const token = authHeader.replace(/^Bearer /, '');
  const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  return claims.iat as number;
}

// ---------------------------------------------------------------------------
// Identifier + host selection — must happen before any key use or network call
// ---------------------------------------------------------------------------

Deno.test('a malformed original_transaction_id throws before any key read or call', async () => {
  __resetTokenCacheForTests();
  let called = 0;
  const fetchImpl = (() => {
    called++;
    return Promise.resolve(statusResponse([]));
  }) as unknown as typeof fetch;

  for (const bad of ['', '../../inApps/v1/lookup/x', '20000000123456789012', 'abc', null]) {
    await assertRejects(
      () => fetchSubscriptionStatuses(bad, 'Production', {
        issuerId: 'i', keyId: 'k', privateKeyPem: 'not-a-pem',
      }, { fetchImpl }),
      InvalidTransactionIdError,
    );
  }
  // The unusable PEM would have thrown a DIFFERENT error had validation not come first,
  // which is what proves the ordering rather than merely the rejection.
  assertEquals(called, 0, 'no outbound call may be made for a malformed identifier');
});

Deno.test('an unrecognized environment fails closed — there is NO default host', async () => {
  __resetTokenCacheForTests();
  let called = 0;
  const fetchImpl = (() => {
    called++;
    return Promise.resolve(statusResponse([]));
  }) as unknown as typeof fetch;

  for (const bad of ['production', 'PROD', '', undefined, null, 'Staging']) {
    await assertRejects(() =>
      fetchSubscriptionStatuses(VALID_ID, bad, {
        issuerId: 'i', keyId: 'k', privateKeyPem: 'not-a-pem',
      }, { fetchImpl }));
  }
  assertEquals(called, 0);
});

Deno.test('exactly ONE call is made, to the environment-selected subscriptions path', async () => {
  __resetTokenCacheForTests();
  const urls: string[] = [];
  const fetchImpl = ((url: string) => {
    urls.push(url);
    return Promise.resolve(statusResponse([group([item('a')])]));
  }) as unknown as typeof fetch;

  await fetchSubscriptionStatuses(VALID_ID, 'Sandbox', await credentials(), { fetchImpl });

  assertEquals(urls.length, 1);
  assertEquals(
    urls[0],
    `${APP_STORE_SERVER_API_ORIGINS.Sandbox}/inApps/v1/subscriptions/${VALID_ID}`,
  );
});

Deno.test('the endpoint is subscriptions, NOT transactions — they answer different questions', async () => {
  __resetTokenCacheForTests();
  const urls: string[] = [];
  const fetchImpl = ((url: string) => {
    urls.push(url);
    return Promise.resolve(statusResponse([group([item('a')])]));
  }) as unknown as typeof fetch;

  await fetchSubscriptionStatuses(VALID_ID, 'Production', await credentials(), { fetchImpl });

  assert(urls[0].includes('/inApps/v1/subscriptions/'));
  assertFalse(
    urls[0].includes('/inApps/v1/transactions/'),
    'a point-in-time transaction cannot answer "is this still renewing?"',
  );
});

Deno.test('NO ?status= filter is sent — an unsigned enum must not select what is processed', async () => {
  __resetTokenCacheForTests();
  const urls: string[] = [];
  const fetchImpl = ((url: string) => {
    urls.push(url);
    return Promise.resolve(statusResponse([group([item('a')])]));
  }) as unknown as typeof fetch;

  await fetchSubscriptionStatuses(VALID_ID, 'Production', await credentials(), { fetchImpl });
  assertFalse(urls[0].includes('?'), 'no query string at all');
  assertFalse(urls[0].includes('status='));
});

Deno.test('THE DELETED BUG — a 404 never falls back to the other host', async () => {
  __resetTokenCacheForTests();
  const urls: string[] = [];
  const fetchImpl = ((url: string) => {
    urls.push(url);
    return Promise.resolve(new Response(JSON.stringify({ errorCode: 4040005 }), { status: 404 }));
  }) as unknown as typeof fetch;

  const creds = await credentials();
  await assertRejects(
    () => fetchSubscriptionStatuses(VALID_ID, 'Production', creds, { fetchImpl }),
  );
  // One call, to Production only. A sandbox retry here is the 21007 fallback growing back
  // in a nightly cron nobody watches.
  assert(urls.every((u) => u.startsWith(APP_STORE_SERVER_API_ORIGINS.Production)));
  assert(urls.length <= 1);
});

Deno.test('the request refuses redirects and carries the shared timeout', async () => {
  __resetTokenCacheForTests();
  let init: RequestInit | undefined;
  const fetchImpl = ((_u: string, i: RequestInit) => {
    init = i;
    return Promise.resolve(statusResponse([group([item('a')])]));
  }) as unknown as typeof fetch;

  await fetchSubscriptionStatuses(VALID_ID, 'Production', await credentials(), { fetchImpl });

  // A 3xx would forward the Authorization header off-origin.
  assertEquals(init?.redirect, 'error');
  assert(init?.signal instanceof AbortSignal);
  assert(REQUEST_TIMEOUT_MS > 0);
});

// ---------------------------------------------------------------------------
// Error classification — the same four distinct types, re-proven
// ---------------------------------------------------------------------------

Deno.test('401/403/404/5xx map to four DISTINCT error types', async () => {
  const cases: Array<[number, unknown]> = [
    [401, AppleAuthError],
    [403, AppleAuthError],
    [404, TransactionNotFoundError],
    [429, AppleUnavailableError],
    [500, AppleUnavailableError],
    [418, AppleUnavailableError],
  ];
  // Real credentials, because `getBearerToken` validates them BEFORE the call — an unusable
  // PEM would short-circuit to AppStoreConnectConfigError and the HTTP mapping would never
  // be reached, so the test would pass for the wrong reason or fail for an unrelated one.
  const creds = await credentials();
  for (const [status, expected] of cases) {
    __resetTokenCacheForTests();
    const fetchImpl = (() =>
      Promise.resolve(new Response(JSON.stringify({ errorCode: 1 }), { status }))
    ) as unknown as typeof fetch;

    await assertRejects(
      () => fetchSubscriptionStatuses(VALID_ID, 'Production', creds, { fetchImpl }),
      // deno-lint-ignore no-explicit-any
      expected as any,
      undefined,
      `status ${status}`,
    );
  }
});

Deno.test('a 429 is distinguishable by status so the caller can abort the whole batch', async () => {
  __resetTokenCacheForTests();
  const fetchImpl = (() =>
    Promise.resolve(new Response(JSON.stringify({ errorCode: 4290000 }), { status: 429 }))
  ) as unknown as typeof fetch;

  const creds = await credentials();
  const err = await assertRejects(
    () => fetchSubscriptionStatuses(VALID_ID, 'Production', creds, { fetchImpl }),
    AppleUnavailableError,
  );
  // Continuing a 100-row batch through a 429 is what starves the live user-facing path.
  assertEquals((err as AppleUnavailableError).status, 429);
  assertEquals((err as AppleUnavailableError).errorCode, 4290000);
});

Deno.test('a 401 evicts the cached token so the next call re-mints', async () => {
  __resetTokenCacheForTests();
  const creds = await credentials();
  const tokens: string[] = [];
  let status = 401;
  const fetchImpl = ((_u: string, i: RequestInit) => {
    tokens.push(String((i.headers as Record<string, string>).Authorization));
    const res = status === 401
      ? new Response(JSON.stringify({ errorCode: 1 }), { status: 401 })
      : statusResponse([group([item('a')])]);
    return Promise.resolve(res);
  }) as unknown as typeof fetch;

  const t0 = 1_700_000_000_000;
  await assertRejects(
    () => fetchSubscriptionStatuses(VALID_ID, 'Production', creds, { fetchImpl, now: () => t0 }),
    AppleAuthError,
  );
  status = 200;
  await fetchSubscriptionStatuses(VALID_ID, 'Production', creds, {
    fetchImpl,
    now: () => t0 + 60_000,
  });

  assertEquals(tokens.length, 2);
  // 60s later is still deep inside the 20-minute window, so a SURVIVING cache entry would
  // be served and `iat` would not move. Only the eviction explains the re-mint. Reusing a
  // token Apple just rejected turns one bad token into a persistent outage for the isolate.
  assertEquals(iatOf(tokens[1]), iatOf(tokens[0]) + 60);
});

// ---------------------------------------------------------------------------
// 200-carrying-garbage — must fail rather than propagate as success
// ---------------------------------------------------------------------------

Deno.test('a 200 with a malformed body fails rather than propagating as success', async () => {
  const bodies: unknown[] = [
    { data: 'not-an-array' },
    { data: [{ subscriptionGroupIdentifier: 'g' }] }, // lastTransactions missing
    { data: [group([{ signedRenewalInfo: JWS('r') }])] }, // transaction half missing
    { data: [group([{ signedTransactionInfo: JWS('t') }])] }, // renewal half missing
    { data: [group([item('a', { signedTransactionInfo: 'not.a' })])] }, // 2 segments
    { data: [group([item('a', { signedRenewalInfo: 'a..c' })])] }, // empty segment
    { data: [group([item('a', { signedTransactionInfo: null })])] },
    {}, // no data key at all
  ];

  const creds = await credentials();
  for (const [i, body] of bodies.entries()) {
    __resetTokenCacheForTests();
    const fetchImpl = (() =>
      Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
    ) as unknown as typeof fetch;

    const err = await assertRejects(
      () => fetchSubscriptionStatuses(VALID_ID, 'Production', creds, { fetchImpl }),
      AppleUnavailableError,
      undefined,
      `body #${i}`,
    );
    // Status 200 on an AppleUnavailableError is how the caller tells "Apple sent garbage"
    // apart from "Apple is down" — they are different operator stories.
    assertEquals((err as AppleUnavailableError).status, 200, `body #${i}`);
  }
});

Deno.test('BOTH signed halves are required — a partially usable item is never returned', async () => {
  // The renewal half carries no bundleId and cannot be app-scoped alone, so an item without
  // its transaction half is unusable; an item without its renewal half cannot answer the
  // question this endpoint exists to answer. Returning either would invite a caller to act
  // on half a record.
  __resetTokenCacheForTests();
  const fetchImpl = (() =>
    Promise.resolve(statusResponse([group([item('good'), { signedTransactionInfo: JWS('t') }])]))
  ) as unknown as typeof fetch;
  const creds = await credentials();

  await assertRejects(
    () => fetchSubscriptionStatuses(VALID_ID, 'Production', creds, { fetchImpl }),
    AppleUnavailableError,
  );
});

// ---------------------------------------------------------------------------
// The unsigned fields — structurally unreachable
// ---------------------------------------------------------------------------

Deno.test('UNSIGNED FIELDS ARE NOT SURFACED — status, ids, bundleId, environment', async () => {
  __resetTokenCacheForTests();
  const fetchImpl = (() =>
    Promise.resolve(statusResponse([group([item('a', { status: 2 })])]))
  ) as unknown as typeof fetch;

  const result = await fetchSubscriptionStatuses(
    VALID_ID, 'Production', await credentials(), { fetchImpl },
  );

  const surfaced = Object.keys(result.items[0]);
  assertEquals(surfaced.sort(), ['signedRenewalInfo', 'signedTransactionInfo']);
  // `status: 2` means Expired in Apple's unsigned enum. If it were reachable, a downgrade
  // could be driven by an unauthenticated field.
  const serialized = JSON.stringify(result);
  assertFalse(serialized.includes('"status"'));
  assertFalse(serialized.includes('bundleId'));
  assertFalse(serialized.includes('appAppleId'));
  assertFalse(serialized.includes('subscriptionGroupIdentifier'));
});

Deno.test('CONTROL — the unsigned fields really were present in the response body', () => {
  // Pairs with the test above: if the fixture stopped carrying them, that assertion would
  // pass vacuously and prove nothing about the client.
  const body = JSON.stringify({
    environment: 'Production', bundleId: 'fyi.being.app', appAppleId: 1,
    data: [group([item('a', { status: 2 })])],
  });
  assert(body.includes('"status":2'));
  assert(body.includes('bundleId'));
  assert(body.includes('subscriptionGroupIdentifier'));
});

// ---------------------------------------------------------------------------
// Flattening + the empty case
// ---------------------------------------------------------------------------

Deno.test('items are flattened across subscription groups, order not relied upon', async () => {
  __resetTokenCacheForTests();
  const fetchImpl = (() =>
    Promise.resolve(statusResponse([group([item('a'), item('b')]), group([item('c')])]))
  ) as unknown as typeof fetch;

  const result = await fetchSubscriptionStatuses(
    VALID_ID, 'Production', await credentials(), { fetchImpl },
  );
  assertEquals(result.items.length, 3);
  assertEquals(result.originalTransactionId, VALID_ID);
});

Deno.test('an empty data[] is RETURNED, not thrown — the caller decides what it means', async () => {
  // Apple answering "no subscription records for this id" is a real answer. Throwing here
  // would collapse it into an upstream failure; the ruling that it never means "expired"
  // belongs at the call site, where the row is.
  __resetTokenCacheForTests();
  const fetchImpl = (() =>
    Promise.resolve(statusResponse([]))
  ) as unknown as typeof fetch;

  const result = await fetchSubscriptionStatuses(
    VALID_ID, 'Production', await credentials(), { fetchImpl },
  );
  assertEquals(result.items, []);
});

Deno.test('nothing is decoded — the returned JWS strings are byte-identical to Apple\'s', async () => {
  __resetTokenCacheForTests();
  const txn = JWS('exact-txn');
  const rnw = JWS('exact-rnw');
  const fetchImpl = (() =>
    Promise.resolve(statusResponse([group([
      { originalTransactionId: 'x', status: 1, signedTransactionInfo: txn, signedRenewalInfo: rnw },
    ])]))
  ) as unknown as typeof fetch;

  const result = await fetchSubscriptionStatuses(
    VALID_ID, 'Production', await credentials(), { fetchImpl },
  );
  assertEquals(result.items[0].signedTransactionInfo, txn);
  assertEquals(result.items[0].signedRenewalInfo, rnw);
});

// ---------------------------------------------------------------------------
// Leak hygiene
// ---------------------------------------------------------------------------

Deno.test('NO thrown message carries the key, the bearer token or the identifier', async () => {
  const pem = await generatePem();
  const secretFragment = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '').slice(0, 24);

  const statuses = [401, 404, 429, 500, 200];
  for (const status of statuses) {
    __resetTokenCacheForTests();
    const fetchImpl = (() =>
      Promise.resolve(new Response(
        status === 200 ? '{"data":"garbage"}' : JSON.stringify({
          errorCode: 1,
          errorMessage: `secret-upstream-text-${secretFragment}`,
        }),
        { status },
      ))
    ) as unknown as typeof fetch;

    try {
      await fetchSubscriptionStatuses(
        VALID_ID, 'Production',
        { issuerId: 'ISSUER-SECRET', keyId: 'KEYID-SECRET', privateKeyPem: pem },
        { fetchImpl },
      );
      throw new Error(`expected a rejection for status ${status}`);
    } catch (err) {
      const message = (err as Error).message;
      assertFalse(message.includes(secretFragment), `key material leaked (${status})`);
      assertFalse(message.includes('ISSUER-SECRET'), `issuer leaked (${status})`);
      assertFalse(message.includes('KEYID-SECRET'), `key id leaked (${status})`);
      assertFalse(message.includes(VALID_ID), `transaction id leaked (${status})`);
      assertFalse(message.includes('secret-upstream-text'), `Apple's text leaked (${status})`);
      assertFalse(message.includes('Bearer'), `bearer token leaked (${status})`);
    }
  }
});

Deno.test('CONTROL — the leak matchers fire against known-bad strings', () => {
  // A hygiene assertion that cannot go red reads as coverage while providing none.
  const knownBad = `boom ISSUER-SECRET KEYID-SECRET ${VALID_ID} secret-upstream-text Bearer abc`;
  for (const needle of ['ISSUER-SECRET', 'KEYID-SECRET', VALID_ID, 'secret-upstream-text', 'Bearer']) {
    assert(knownBad.includes(needle), `matcher for ${needle} must be able to fire`);
  }
});
