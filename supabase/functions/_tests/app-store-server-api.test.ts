/**
 * INFRA-467 slice 1 — App Store Server API client.
 *
 * WHAT THIS MODULE IS FOR. The legacy `verifyReceipt` endpoint is deprecated. Its
 * replacement is `GET /inApps/v1/transactions/{transactionId}`, authenticated with an
 * ES256 JWT signed by an App Store Connect API key. This suite pins the client that
 * mints that token and makes that one call. Slice 1 wires it to NOTHING — the cutover
 * of `verify-apple-receipt/index.ts` is a later slice.
 *
 * WHY THE TESTS LOOK LIKE THIS. The module handles a private key and produces a bearer
 * token, and its errors land somewhere they can be read: `verify-apple-receipt/index.ts:316`
 * echoes `err.message` into an HTTP response body, and `:413`/`:493` write `error.message`
 * into `subscription_audit` metadata. So "no secret ever reaches a thrown message" is a
 * property with a real consumer, not a stylistic preference, and it is asserted directly.
 *
 * NO KEY MATERIAL IS COMMITTED. Every test generates a throwaway P-256 key in-process via
 * Web Crypto and exports it with jose's `exportPKCS8`, which is available under the same
 * already-vendored `esm.sh/jose@5.9.6` specifier the signer uses. That matters because CI
 * runs `deno task test --cached-only` on a cold DENO_DIR — a new remote specifier here
 * would fail there and nowhere else.
 */

import {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
  assertStringIncludes,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { exportPKCS8 } from 'https://esm.sh/jose@5.9.6';
import { BEING_BUNDLE_ID } from '../_shared/verifyAppleJWS.ts';
import {
  APP_STORE_CONNECT_AUDIENCE,
  APP_STORE_SERVER_API_ORIGINS,
  AppleAuthError,
  AppleUnavailableError,
  AppStoreConnectConfigError,
  assertValidTransactionId,
  fetchSignedTransactionInfo,
  InvalidTransactionIdError,
  resolveApiOrigin,
  TOKEN_LIFETIME_SECONDS,
  TOKEN_MAX_LIFETIME_SECONDS,
  TOKEN_REFRESH_MARGIN_SECONDS,
  TransactionNotFoundError,
  __resetTokenCacheForTests,
} from '../_shared/appStoreServerApi.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A throwaway P-256 private key as a PKCS#8 PEM. Never a real Apple key. */
async function generatePem(): Promise<string> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  return await exportPKCS8(pair.privateKey);
}

async function credentials(overrides: Record<string, string> = {}) {
  return {
    issuerId: '57246542-96fe-1a63-e053-0824d011072a',
    keyId: 'ABC123DEFG',
    privateKeyPem: await generatePem(),
    ...overrides,
  };
}

/** A syntactically-shaped JWS: three dot-separated segments. Never verified here. */
const FAKE_JWS = 'aGVhZGVy.cGF5bG9hZA.c2lnbmF0dXJl';

const VALID_TXN_ID = '2000000847061713';

interface StubCall {
  url: string;
  init: RequestInit;
}

/**
 * A fetch stub that records every call. The recorded COUNT is the assertion that
 * actually pins the one-call rule and the pre-flight rejections — a test that only
 * checks the thrown error would still pass if the network call happened first.
 */
function stubFetch(
  responder: (call: StubCall) => Response,
): { impl: typeof fetch; calls: StubCall[] } {
  const calls: StubCall[] = [];
  const impl = ((input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return Promise.resolve(responder(call));
  }) as unknown as typeof fetch;
  return { impl, calls };
}

function okResponse(): Response {
  return new Response(JSON.stringify({ signedTransactionInfo: FAKE_JWS }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function decodeSegment(segment: string): Record<string, unknown> {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(padded + '='.repeat((4 - (padded.length % 4)) % 4)));
}

function bearerFrom(call: StubCall): string {
  const headers = new Headers(call.init.headers);
  const auth = headers.get('Authorization') ?? '';
  return auth.replace(/^Bearer /, '');
}

// ---------------------------------------------------------------------------
// transactionId validation — runs BEFORE any network call or key use
// ---------------------------------------------------------------------------

Deno.test('transaction ids of real-world lengths are accepted (10, 16 and 19 digits)', () => {
  // Do NOT pin this to 13 digits. StoreKit 2 ids are commonly 16 (2000000…) and
  // legacy ids are 10; a 13-digit pin would reject genuine purchases while looking
  // like a tightened control.
  assertEquals(assertValidTransactionId('1000000123'), '1000000123');
  assertEquals(assertValidTransactionId(VALID_TXN_ID), VALID_TXN_ID);
  assertEquals(assertValidTransactionId('9'.repeat(19)), '9'.repeat(19));
});

Deno.test('THE PATH-INJECTION CASES — the id is a URL path segment from an untrusted body', () => {
  // Each of these rewrites the request path or appends a query if interpolated raw.
  for (
    const bad of [
      '../../inApps/v1/lookup/x',
      '123/../../x',
      '123%2f..%2fx',
      '123?foo=bar',
      '123#frag',
      '123 456',
      '2000000847061713\n',
    ]
  ) {
    assertThrows(
      () => assertValidTransactionId(bad),
      InvalidTransactionIdError,
      undefined,
      `expected rejection of ${JSON.stringify(bad)}`,
    );
  }
});

Deno.test('empty, over-long and non-string ids fail closed', () => {
  assertThrows(() => assertValidTransactionId(''), InvalidTransactionIdError);
  assertThrows(() => assertValidTransactionId('9'.repeat(20)), InvalidTransactionIdError);
  assertThrows(() => assertValidTransactionId(undefined), InvalidTransactionIdError);
  assertThrows(() => assertValidTransactionId(null), InvalidTransactionIdError);
  // A number is the dangerous one: >2^53 silently loses precision and would query a
  // DIFFERENT transaction. The identifier stays a string end to end.
  assertThrows(() => assertValidTransactionId(2000000847061713), InvalidTransactionIdError);
});

Deno.test('a malformed id throws before the key is read or any call is made', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  const creds = await credentials();
  await assertRejects(
    () => fetchSignedTransactionInfo('../evil', 'Production', creds, { fetchImpl: impl }),
    InvalidTransactionIdError,
  );
  // The count is the real assertion. Rejecting after the call would still throw.
  assertEquals(calls.length, 0);
});

// ---------------------------------------------------------------------------
// Environment routing — fail closed, no default host
// ---------------------------------------------------------------------------

Deno.test('the two Apple hosts are the documented ones and are distinct', () => {
  assertEquals(APP_STORE_SERVER_API_ORIGINS.Production, 'https://api.storekit.apple.com');
  assertEquals(APP_STORE_SERVER_API_ORIGINS.Sandbox, 'https://api.storekit-sandbox.apple.com');
  // The name promises distinctness; assert it rather than leaving it implied by the
  // two literals above, which a future edit could collapse without failing anything.
  assertNotEquals(APP_STORE_SERVER_API_ORIGINS.Production, APP_STORE_SERVER_API_ORIGINS.Sandbox);
  assertEquals(resolveApiOrigin('Production'), APP_STORE_SERVER_API_ORIGINS.Production);
  assertEquals(resolveApiOrigin('Sandbox'), APP_STORE_SERVER_API_ORIGINS.Sandbox);
});

Deno.test('an unrecognized environment fails closed — there is NO default host', () => {
  // Mirrors assertAppleAppScope's rule: an unset environment must never be read as
  // "unknown, allow". Defaulting to Production here would be the friendlier-looking
  // and strictly worse choice.
  for (const bad of ['', 'production', 'PRODUCTION', 'Staging', 'sandbox', undefined, null, 1]) {
    assertThrows(
      () => resolveApiOrigin(bad),
      Error,
      undefined,
      `expected rejection of ${JSON.stringify(bad)}`,
    );
  }
});

// ---------------------------------------------------------------------------
// The signed token
// ---------------------------------------------------------------------------

Deno.test('the JWT header is exactly {alg, kid, typ} with ES256 hard-coded', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  const creds = await credentials();
  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl });

  const header = decodeSegment(bearerFrom(calls[0]).split('.')[0]);
  assertEquals(Object.keys(header).sort(), ['alg', 'kid', 'typ']);
  assertEquals(header.alg, 'ES256');
  assertEquals(header.typ, 'JWT');
  assertEquals(header.kid, creds.keyId);
});

Deno.test('the JWT payload carries exactly the five App Store Connect claims', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  const creds = await credentials();
  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl });

  const payload = decodeSegment(bearerFrom(calls[0]).split('.')[1]);
  // Extra claims are at best ignored by Apple and at worst a 401 you misdiagnose.
  // `iid` in particular is NOT an App Store Connect claim and must not appear.
  assertEquals(Object.keys(payload).sort(), ['aud', 'bid', 'exp', 'iat', 'iss']);
  assertEquals(payload.iss, creds.issuerId);
  assertEquals(payload.aud, APP_STORE_CONNECT_AUDIENCE);
  assertEquals(APP_STORE_CONNECT_AUDIENCE, 'appstoreconnect-v1');
});

Deno.test('`bid` is the pinned bundle id — it is never caller- or env-supplied', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', await credentials(), { fetchImpl: impl });

  // `bid` is the only claim scoping the token to our app. Parameterising it would hand
  // the scope decision to the caller. It is imported from verifyAppleJWS, not redeclared,
  // so INFRA-449's assertion and this token can never disagree about who we are.
  const payload = decodeSegment(bearerFrom(calls[0]).split('.')[1]);
  assertEquals(payload.bid, BEING_BUNDLE_ID);
  assertEquals(payload.bid, 'fyi.being.app');
});

Deno.test('token lifetime is 20 min and the 60-min Apple ceiling is enforced in code', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', await credentials(), { fetchImpl: impl });

  const payload = decodeSegment(bearerFrom(calls[0]).split('.')[1]) as { iat: number; exp: number };
  assertEquals(payload.exp - payload.iat, TOKEN_LIFETIME_SECONDS);
  assertEquals(TOKEN_LIFETIME_SECONDS, 1200);
  // Apple rejects anything over 60 min. A silent drift past it 401s 100% of
  // verifications, so the ceiling is a runtime invariant, not just a well-chosen constant.
  assertEquals(TOKEN_MAX_LIFETIME_SECONDS, 3600);
  assertEquals(TOKEN_LIFETIME_SECONDS <= TOKEN_MAX_LIFETIME_SECONDS, true);
  // Seconds, not milliseconds — a ms value here is silently ~1000x over the ceiling.
  assertEquals(Number.isInteger(payload.iat), true);
  assertEquals(payload.iat < 1e11, true);
});

// ---------------------------------------------------------------------------
// Token cache
// ---------------------------------------------------------------------------

/**
 * A NOTE ON HOW THE NEXT FOUR TESTS DISCRIMINATE.
 *
 * Deno's WebCrypto ECDSA is deterministic (RFC 6979 nonces), so the same claims signed with
 * the same key produce a byte-identical token. Token equality therefore proves NOTHING
 * about caching — an assertion that two tokens match would hold just as well with the cache
 * ripped out, and could never go red.
 *
 * The clock is the only honest discriminator. Move `now` between calls: a live cache ignores
 * it and `iat` stays put; a re-mint tracks it and `iat` moves. Every cache test below asserts
 * on `iat`, not on the token string.
 */
function iatOf(call: StubCall): number {
  return (decodeSegment(bearerFrom(call).split('.')[1]) as { iat: number }).iat;
}

Deno.test('the token is reused within its window — one signature serves many calls', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  const creds = await credentials();
  const t0 = 1_700_000_000_000;

  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl, now: () => t0 });
  // A full minute later, still far inside the window. Without a cache this would mint a
  // token with iat 60s later; the reuse is what pins it.
  await fetchSignedTransactionInfo('1000000123', 'Sandbox', creds, { fetchImpl: impl, now: () => t0 + 60_000 });

  assertEquals(calls.length, 2);
  assertEquals(iatOf(calls[1]), iatOf(calls[0]));
  // Same token across BOTH hosts: the token is a function of {issuer, kid, key, bid}
  // only and carries no host scope. Keying the cache on environment would double the
  // signing rate and imply a scoping that does not exist.
  assertEquals(bearerFrom(calls[0]), bearerFrom(calls[1]));
});

Deno.test('the token is re-minted inside the refresh margin, before Apple would reject it', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  const creds = await credentials();
  const t0 = 1_700_000_000_000;

  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl, now: () => t0 });
  // Just inside the margin: still valid to Apple, but too close to risk an in-flight
  // expiry. There is no retry on 401, so a mid-flight expiry is a hard user-visible
  // failure — the margin is what prevents it.
  const nearExpiry = t0 + (TOKEN_LIFETIME_SECONDS - TOKEN_REFRESH_MARGIN_SECONDS + 1) * 1000;
  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl, now: () => nearExpiry });

  assertEquals(TOKEN_REFRESH_MARGIN_SECONDS >= 300, true);
  assertEquals(iatOf(calls[1]), iatOf(calls[0]) + (TOKEN_LIFETIME_SECONDS - TOKEN_REFRESH_MARGIN_SECONDS + 1));
});

Deno.test('rotating the key id invalidates the cache — a stale token is never reused', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  const opts = { fetchImpl: impl, now: () => 1_700_000_000_000 };

  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', await credentials(), opts);
  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', await credentials({ keyId: 'ZZZ999YYY8' }), opts);

  assertEquals(decodeSegment(bearerFrom(calls[1]).split('.')[0]).kid, 'ZZZ999YYY8');
  assertEquals(bearerFrom(calls[0]) === bearerFrom(calls[1]), false);
});

Deno.test('a 401 from Apple evicts the cached token so the next call re-mints', async () => {
  __resetTokenCacheForTests();
  let status = 401;
  const { impl, calls } = stubFetch(() => status === 401 ? new Response('{}', { status: 401 }) : okResponse());
  const creds = await credentials();
  const t0 = 1_700_000_000_000;

  await assertRejects(
    () => fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl, now: () => t0 }),
    AppleAuthError,
  );
  status = 200;
  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl, now: () => t0 + 60_000 });

  // Still deep inside the refresh window, so a surviving cache entry would be served and
  // iat would not move. Only the eviction explains the re-mint. Reusing a token Apple just
  // rejected would turn one bad token into a persistent outage for the isolate.
  assertEquals(iatOf(calls[1]), iatOf(calls[0]) + 60);
});

// ---------------------------------------------------------------------------
// The request itself — exactly one call, no host fallback
// ---------------------------------------------------------------------------

Deno.test('exactly ONE outbound call is made, to the environment-selected host', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  const result = await fetchSignedTransactionInfo(
    VALID_TXN_ID,
    'Sandbox',
    await credentials(),
    { fetchImpl: impl },
  );

  assertEquals(calls.length, 1);
  assertEquals(
    calls[0].url,
    `${APP_STORE_SERVER_API_ORIGINS.Sandbox}/inApps/v1/transactions/${VALID_TXN_ID}`,
  );
  assertEquals(result.signedTransactionInfo, FAKE_JWS);
  assertEquals(result.transactionId, VALID_TXN_ID);
});

Deno.test('THE DELETED BUG — a 404 never falls back to the other host', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => new Response(JSON.stringify({ errorCode: 4040010 }), { status: 404 }));
  const creds = await credentials();

  await assertRejects(
    () => fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl }),
    TransactionNotFoundError,
  );

  // The legacy path retried production→sandbox on status 21007. That retry is exactly how
  // a sandbox-minted transaction got accepted as production. Removing it IS the migration's
  // security gain; a host-switching retry must never grow back here.
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url.startsWith(APP_STORE_SERVER_API_ORIGINS.Production), true);
});

Deno.test('the request refuses redirects and carries a timeout', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', await credentials(), { fetchImpl: impl });

  // redirect:'error' is the control that stops a 3xx forwarding the bearer token
  // off-origin. The timeout matters because there is no retry: a hung call would
  // otherwise burn the function's whole wall clock and produce no audit row.
  assertEquals(calls[0].init.redirect, 'error');
  assertEquals(calls[0].init.signal instanceof AbortSignal, true);
  assertEquals(calls[0].init.method, 'GET');
});

// ---------------------------------------------------------------------------
// Response shape + error typing
// ---------------------------------------------------------------------------

Deno.test('a 200 carrying a malformed signedTransactionInfo fails rather than propagating', async () => {
  for (const body of [{}, { signedTransactionInfo: '' }, { signedTransactionInfo: 'not.a' }, { signedTransactionInfo: 42 }]) {
    __resetTokenCacheForTests();
    const { impl } = stubFetch(() => new Response(JSON.stringify(body), { status: 200 }));
    const creds = await credentials();
    await assertRejects(
      () => fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl }),
      Error,
      undefined,
      `expected rejection of ${JSON.stringify(body)}`,
    );
  }
});

Deno.test('the four failure modes get four DISTINCT error types', async () => {
  // Collapsing 401 into the same bucket as 404 makes a key-rotation outage present as
  // "every user suddenly has an invalid receipt", and the audit table records it that way.
  const cases: Array<[number, unknown]> = [
    [401, AppleAuthError],
    [403, AppleAuthError],
    [404, TransactionNotFoundError],
    [429, AppleUnavailableError],
    [500, AppleUnavailableError],
    [503, AppleUnavailableError],
  ];
  for (const [status, type] of cases) {
    __resetTokenCacheForTests();
    const { impl } = stubFetch(() => new Response('{}', { status }));
    const creds = await credentials();
    await assertRejects(
      () => fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl }),
      type as ErrorConstructor,
      undefined,
      `status ${status}`,
    );
  }
});

Deno.test('a malformed private key names the variable and never echoes its content', async () => {
  __resetTokenCacheForTests();
  const { impl, calls } = stubFetch(() => okResponse());
  const err = await assertRejects(
    () =>
      fetchSignedTransactionInfo(
        VALID_TXN_ID,
        'Production',
        { issuerId: 'iss', keyId: 'kid', privateKeyPem: '-----BEGIN PRIVATE KEY-----\nSEKRIT\n-----END PRIVATE KEY-----' },
        { fetchImpl: impl },
      ),
    AppStoreConnectConfigError,
  );
  assertStringIncludes(err.message, 'APPLE_PRIVATE_KEY');
  // Underlying ASN.1/DER errors can echo decoded fragments of the input.
  assertEquals(err.message.includes('SEKRIT'), false);
  assertEquals(calls.length, 0);
});

// ---------------------------------------------------------------------------
// Nothing secret reaches a thrown message
// ---------------------------------------------------------------------------

Deno.test('NO thrown message carries the key, the bearer token or the transaction id', async () => {
  const creds = await credentials();
  const pemBody = creds.privateKeyPem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
  const messages: string[] = [];
  let issuedToken = '';

  for (const status of [401, 404, 429, 500]) {
    __resetTokenCacheForTests();
    const { impl, calls } = stubFetch(() => new Response(JSON.stringify({ errorCode: 4040010, errorMessage: 'internal detail' }), { status }));
    try {
      await fetchSignedTransactionInfo(VALID_TXN_ID, 'Production', creds, { fetchImpl: impl });
    } catch (err) {
      messages.push((err as Error).message);
      if (calls.length) issuedToken = bearerFrom(calls[0]);
    }
  }

  assertEquals(messages.length, 4);
  for (const msg of messages) {
    assertEquals(msg.includes(pemBody.slice(0, 24)), false, 'key material leaked');
    assertEquals(msg.includes(issuedToken), false, 'bearer token leaked');
    assertEquals(msg.includes(creds.issuerId), false, 'issuer id leaked');
    assertEquals(msg.includes(creds.keyId), false, 'key id leaked');
    // The id is the caller's own input, so echoing it discloses nothing TO THEM — but
    // it lands in subscription_audit.metadata, where it does not belong.
    assertEquals(msg.includes(VALID_TXN_ID), false, 'transaction id leaked');
    assertEquals(msg.includes('internal detail'), false, "Apple's response text leaked");
  }
});

Deno.test('CONTROL — the leak matchers actually fire against known-bad strings', () => {
  // An assertion by ABSENCE is worthless if the needle could never match. DEBUG-390:
  // pair every not-contains check with proof the matcher still goes red.
  const pem = '-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEG\n-----END PRIVATE KEY-----';
  const pemBody = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
  const knownBad = `failed for key ${pemBody} on txn ${VALID_TXN_ID}: internal detail`;
  assertEquals(knownBad.includes(pemBody.slice(0, 24)), true);
  assertEquals(knownBad.includes(VALID_TXN_ID), true);
  assertEquals(knownBad.includes('internal detail'), true);
});
