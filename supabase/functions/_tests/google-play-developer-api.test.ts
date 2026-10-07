/**
 * DEBUG-752 — Google Play Developer API client.
 *
 * WHAT WAS BROKEN. `verify-google-receipt` built its service-account assertion as
 * `${header}.${payload}.signature_placeholder` and posted it to Google's token endpoint.
 * Google rejects that, so no Google receipt could ever verify. This suite pins the
 * replacement: a real RS256 assertion signed with the service account's private key, and
 * — folded in at batch approval, because a real token is what makes it reachable — a
 * purchase lookup whose URL cannot be rewritten by the client-supplied identifiers.
 *
 * WHY THE TESTS LOOK LIKE THIS. Every thrown message here lands in
 * `subscription_audit.metadata` and `console.error` (verify-google-receipt's Google-API
 * catch). So "no credential fragment, response body or purchase token ever reaches a
 * thrown message" is asserted directly, not assumed.
 *
 * NO KEY MATERIAL IS COMMITTED. Each test generates a throwaway RSA key with the
 * already-vendored jose, so `deno task test --cached-only` needs no new remote specifier.
 * Global fetch is a throwing tripwire during each call: CI grants --allow-net, so a
 * regression that ignored the injected fetch would otherwise reach Google for real.
 */

import {
  assert,
  assertEquals,
  assertRejects,
  assertThrows,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { exportPKCS8, generateKeyPair, jwtVerify } from 'https://esm.sh/jose@5.9.6';
import {
  ANDROIDPUBLISHER_ORIGIN,
  ANDROIDPUBLISHER_SCOPE,
  ASSERTION_LIFETIME_SECONDS,
  assertBeingPackageName,
  assertValidPurchaseToken,
  assertValidSubscriptionId,
  BEING_ANDROID_PACKAGE,
  fetchSubscriptionPurchase,
  getGoogleAccessToken,
  GoogleAuthError,
  GooglePlayApiError,
  GoogleServiceAccountConfigError,
  GOOGLE_TOKEN_ENDPOINT,
  InvalidGooglePurchaseError,
  parseServiceAccountCredential,
} from '../_shared/googlePlayDeveloperApi.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CLIENT_EMAIL = 'receipts@being-test.iam.gserviceaccount.com';
const KEY_ID = 'a1b2c3d4e5f6';
const NOW_MS = 1_790_000_000_000;
const NOW_S = Math.floor(NOW_MS / 1000);

async function keyPair() {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  return { pem: await exportPKCS8(privateKey), publicKey };
}

/** A service-account JSON key shaped like the one the Play Console issues. */
function serviceAccountJson(pem: string, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: 'service_account',
    project_id: 'being-test',
    private_key_id: KEY_ID,
    private_key: pem,
    client_email: CLIENT_EMAIL,
    // Present in every real key file, and deliberately NEVER read: an attacker-shaped
    // credential must not be able to choose where the signed assertion is sent.
    token_uri: 'https://evil.example/token',
    ...overrides,
  });
}

interface StubCall {
  url: string;
  init: RequestInit;
}

function stubFetch(responder: (call: StubCall) => Response | Promise<Response>) {
  const calls: StubCall[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return await responder(call);
  }) as typeof fetch;
  return { impl, calls };
}

/** Run `fn` with global fetch replaced by a tripwire. */
async function withNetworkTripwire<T>(fn: () => Promise<T>): Promise<T> {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error('network tripwire: googlePlayDeveloperApi reached for the real network');
  }) as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = realFetch;
  }
}

const tokenOk = () =>
  new Response(JSON.stringify({ access_token: 'ya29.test-access-token', expires_in: 3599 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

async function mint(pem: string, responder: (call: StubCall) => Response = tokenOk) {
  const cred = parseServiceAccountCredential(serviceAccountJson(pem));
  const stub = stubFetch(responder);
  const token = await withNetworkTripwire(() =>
    getGoogleAccessToken(cred, { fetchImpl: stub.impl, now: () => NOW_MS })
  );
  return { token, stub };
}

function assertion(call: StubCall): string {
  const body = new URLSearchParams(String(call.init.body));
  const a = body.get('assertion');
  assert(a, 'no assertion in the token request body');
  return a;
}

// ---------------------------------------------------------------------------
// The signed assertion (AC1, AC2)
// ---------------------------------------------------------------------------

Deno.test('the assertion verifies against the service account public key (RS256)', async () => {
  const { pem, publicKey } = await keyPair();
  const { token, stub } = await mint(pem);
  assertEquals(token, 'ya29.test-access-token');
  assertEquals(stub.calls.length, 1);

  const { payload, protectedHeader } = await jwtVerify(assertion(stub.calls[0]), publicKey, {
    algorithms: ['RS256'],
    issuer: CLIENT_EMAIL,
    audience: GOOGLE_TOKEN_ENDPOINT,
    currentDate: new Date(NOW_MS),
  });
  assertEquals(protectedHeader.alg, 'RS256');
  assertEquals(protectedHeader.typ, 'JWT');
  assertEquals(protectedHeader.kid, KEY_ID);
  assertEquals(payload.scope, ANDROIDPUBLISHER_SCOPE);
  assertEquals(payload.iat, NOW_S);
  assertEquals((payload.exp as number) - (payload.iat as number), ASSERTION_LIFETIME_SECONDS);
  assertEquals(payload.sub, undefined, 'no sub: there is no domain-wide delegation');
});

Deno.test('every assertion segment is unpadded base64url (jwtVerify alone accepts btoa padding)', async () => {
  const { pem } = await keyPair();
  const { stub } = await mint(pem);
  const segments = assertion(stub.calls[0]).split('.');
  assertEquals(segments.length, 3);
  for (const s of segments) assert(/^[A-Za-z0-9_-]+$/.test(s), `not base64url: ${s.slice(0, 12)}…`);
});

Deno.test('the signature is bound to the credential key, not merely present', async () => {
  const { pem } = await keyPair();
  const other = await keyPair();
  const { stub } = await mint(pem);
  await assertRejects(() =>
    jwtVerify(assertion(stub.calls[0]), other.publicKey, { algorithms: ['RS256'] })
  );
});

Deno.test('the token request goes to the constant endpoint, never the credential token_uri', async () => {
  const { pem } = await keyPair();
  const { stub } = await mint(pem);
  const call = stub.calls[0];
  assertEquals(call.url, GOOGLE_TOKEN_ENDPOINT);
  assertEquals(call.init.method, 'POST');
  assertEquals(call.init.redirect, 'error');
  assertEquals(
    new Headers(call.init.headers).get('Content-Type'),
    'application/x-www-form-urlencoded',
  );
  assertEquals(
    new URLSearchParams(String(call.init.body)).get('grant_type'),
    'urn:ietf:params:oauth:grant-type:jwt-bearer',
  );
});

Deno.test('a key pasted with literal backslash-n is normalised', async () => {
  const { pem, publicKey } = await keyPair();
  const cred = parseServiceAccountCredential(serviceAccountJson(pem.replace(/\n/g, '\\n')));
  const stub = stubFetch(tokenOk);
  await withNetworkTripwire(() => getGoogleAccessToken(cred, { fetchImpl: stub.impl, now: () => NOW_MS }));
  await jwtVerify(assertion(stub.calls[0]), publicKey, { algorithms: ['RS256'], currentDate: new Date(NOW_MS) });
});

// ---------------------------------------------------------------------------
// Credential hygiene — nothing secret reaches a thrown message
// ---------------------------------------------------------------------------

const SECRETISH = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC';

Deno.test('a malformed credential throws a fixed message that echoes none of the input', () => {
  const cases: unknown[] = [
    undefined,
    '',
    '   ',
    `{"private_key": "${SECRETISH}"`, // truncated JSON: V8's SyntaxError would quote it
    'null',
    '[]',
    JSON.stringify({ type: 'authorized_user', client_email: CLIENT_EMAIL, private_key: SECRETISH, private_key_id: KEY_ID }),
    JSON.stringify({ type: 'service_account', private_key: SECRETISH, private_key_id: KEY_ID }),
    JSON.stringify({ type: 'service_account', client_email: CLIENT_EMAIL, private_key_id: KEY_ID }),
    JSON.stringify({ type: 'service_account', client_email: CLIENT_EMAIL, private_key: SECRETISH }),
  ];
  for (const raw of cases) {
    const err = assertThrows(() => parseServiceAccountCredential(raw), GoogleServiceAccountConfigError);
    assert(!err.message.includes(SECRETISH), `message leaked key text: ${err.message}`);
    assert(!err.message.includes(CLIENT_EMAIL), `message leaked client_email: ${err.message}`);
  }
});

Deno.test('a private key that is not a valid PKCS#8 PEM throws a fixed message', async () => {
  const cred = parseServiceAccountCredential(
    serviceAccountJson(`-----BEGIN PRIVATE KEY-----\n${SECRETISH}\n-----END PRIVATE KEY-----\n`),
  );
  const stub = stubFetch(tokenOk);
  const err = await assertRejects(
    () => withNetworkTripwire(() => getGoogleAccessToken(cred, { fetchImpl: stub.impl, now: () => NOW_MS })),
    GoogleServiceAccountConfigError,
  );
  assert(!err.message.includes(SECRETISH), err.message);
  assertEquals(stub.calls.length, 0, 'no network call with an unusable key');
});

Deno.test('a token endpoint rejection carries the status and none of the response body', async () => {
  const { pem } = await keyPair();
  const leak = `invalid_grant: ${SECRETISH} ${CLIENT_EMAIL}`;
  const err = await assertRejects(
    () => mint(pem, () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: leak }), { status: 400 })),
    GoogleAuthError,
  );
  assertEquals(err.status, 400);
  assert(!err.message.includes(SECRETISH) && !err.message.includes(CLIENT_EMAIL), err.message);
});

Deno.test('a 200 without a usable access_token throws instead of returning undefined', async () => {
  const { pem } = await keyPair();
  for (const body of [{}, { access_token: '' }, { access_token: 42 }]) {
    await assertRejects(
      () => mint(pem, () => new Response(JSON.stringify(body), { status: 200 })),
      GoogleAuthError,
    );
  }
});

Deno.test('a network failure on the token request throws a fixed message', async () => {
  const { pem } = await keyPair();
  const err = await assertRejects(
    () => mint(pem, () => { throw new TypeError(`error sending request for url (${GOOGLE_TOKEN_ENDPOINT}): ${SECRETISH}`); }),
    GoogleAuthError,
  );
  assert(!err.message.includes(SECRETISH), err.message);
});

// ---------------------------------------------------------------------------
// The purchase lookup — identifiers cannot rewrite the URL
// ---------------------------------------------------------------------------

const PURCHASE = {
  kind: 'androidpublisher#subscriptionPurchase',
  startTimeMillis: String(NOW_MS - 1000),
  expiryTimeMillis: String(NOW_MS + 30 * 86_400_000),
  autoRenewing: true,
  priceCurrencyCode: 'USD',
  priceAmountMicros: '9990000',
  countryCode: 'US',
  orderId: 'GPA.1234-5678-9012-34567',
  acknowledgementState: 1,
};
const TOKEN = 'abcdefghijklmnop.AO-J1OzExampleToken_value-123';

function lookup(subscriptionId: unknown, purchaseToken: unknown, responder: (c: StubCall) => Response) {
  const stub = stubFetch(responder);
  const p = withNetworkTripwire(() =>
    fetchSubscriptionPurchase({ subscriptionId, purchaseToken }, 'ya29.access', { fetchImpl: stub.impl })
  );
  return { p, stub };
}

Deno.test('the lookup URL is the exact androidpublisher path for Being, encoded, origin-pinned', async () => {
  const { p, stub } = lookup('subscription_monthly', TOKEN, () => new Response(JSON.stringify(PURCHASE)));
  const purchase = await p;
  assertEquals(purchase.orderId, PURCHASE.orderId);
  assertEquals(stub.calls.length, 1);
  const url = new URL(stub.calls[0].url);
  assertEquals(url.origin, ANDROIDPUBLISHER_ORIGIN);
  assertEquals(
    url.pathname,
    `/androidpublisher/v3/applications/${BEING_ANDROID_PACKAGE}/purchases/subscriptions/subscription_monthly/tokens/${TOKEN}`,
  );
  assertEquals(url.search, '');
  assertEquals(stub.calls[0].init.redirect, 'error');
  assertEquals(new Headers(stub.calls[0].init.headers).get('Authorization'), 'Bearer ya29.access');
});

Deno.test('path-shaped identifiers are rejected before any request', async () => {
  const badIds = ['', '.', '..', '%2e%2e', '.%2E', 'a/b', 'a?b', 'a#b', 'a%2Fb', 'A_upper', ' monthly', 'x'.repeat(101), 42, null];
  for (const id of badIds) {
    assertThrows(() => assertValidSubscriptionId(id), InvalidGooglePurchaseError);
    const { p, stub } = lookup(id, TOKEN, () => new Response(JSON.stringify(PURCHASE)));
    await assertRejects(() => p, InvalidGooglePurchaseError);
    assertEquals(stub.calls.length, 0, `requested with subscriptionId ${String(id)}`);
  }
  const badTokens = ['', '.', '..', '...', '%2e%2e', '../x', 'a/b', 'a?b', 'a#b', 'a%b', 'a b', 'x'.repeat(2049), 7, undefined];
  for (const t of badTokens) {
    assertThrows(() => assertValidPurchaseToken(t), InvalidGooglePurchaseError);
    const { p, stub } = lookup('subscription_monthly', t, () => new Response(JSON.stringify(PURCHASE)));
    await assertRejects(() => p, InvalidGooglePurchaseError);
    assertEquals(stub.calls.length, 0, `requested with purchaseToken ${String(t)}`);
  }
});

Deno.test('only Being\'s package name is accepted', () => {
  assertEquals(assertBeingPackageName(BEING_ANDROID_PACKAGE), BEING_ANDROID_PACKAGE);
  for (const pkg of ['com.being.app', 'fyi.being.app.evil', 'fyi.being', '', undefined, 1]) {
    assertThrows(() => assertBeingPackageName(pkg), InvalidGooglePurchaseError);
  }
});

Deno.test('a network failure on the lookup never carries the purchase token', async () => {
  const { p } = lookup('subscription_monthly', TOKEN, (c) => {
    // Deno's real message embeds the full URL, purchase token included.
    throw new TypeError(`error sending request for url (${c.url}): connection refused`);
  });
  const err = await assertRejects(() => p, GooglePlayApiError);
  assert(!err.message.includes(TOKEN), err.message);
  assertEquals(err.status, 0);
});

Deno.test('a non-2xx lookup carries the status and none of Google\'s response body', async () => {
  const leak = `purchase token ${TOKEN} belongs to ${CLIENT_EMAIL}`;
  for (const status of [400, 404, 410, 500, 503]) {
    const { p } = lookup('subscription_monthly', TOKEN, () => new Response(leak, { status }));
    const err = await assertRejects(() => p, GooglePlayApiError);
    assertEquals(err.status, status);
    assert(!err.message.includes(TOKEN) && !err.message.includes(CLIENT_EMAIL), err.message);
  }
  for (const status of [401, 403]) {
    const { p } = lookup('subscription_monthly', TOKEN, () => new Response(leak, { status }));
    const err = await assertRejects(() => p, GoogleAuthError);
    assertEquals(err.status, status);
    assert(!err.message.includes(TOKEN), err.message);
  }
});

Deno.test('a 200 that is not a subscription purchase is an upstream failure, not a receipt', async () => {
  for (const body of [{}, { ...PURCHASE, kind: 'androidpublisher#productPurchase' }, { ...PURCHASE, expiryTimeMillis: 'soon' }, { ...PURCHASE, expiryTimeMillis: undefined }]) {
    const { p } = lookup('subscription_monthly', TOKEN, () => new Response(JSON.stringify(body)));
    await assertRejects(() => p, GooglePlayApiError);
  }
  const { p } = lookup('subscription_monthly', TOKEN, () => new Response('not json'));
  await assertRejects(() => p, GooglePlayApiError);
});

// ---------------------------------------------------------------------------
// Source pins (DEBUG-390: comments stripped first; each matcher shown able to fire)
// ---------------------------------------------------------------------------

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const SHARED = stripComments(
  Deno.readTextFileSync(new URL('../_shared/googlePlayDeveloperApi.ts', import.meta.url)),
);
const HANDLER = stripComments(
  Deno.readTextFileSync(new URL('../verify-google-receipt/index.ts', import.meta.url)),
);

Deno.test('verify-google-receipt signs for real: no placeholder, no local token minting', () => {
  assertEquals(/signature_placeholder/.test(HANDLER), false);
  assertEquals(/function\s+getGoogleAccessToken\b/.test(HANDLER), false);
  assertEquals(/\bbtoa\(/.test(HANDLER), false);
  assert(/from\s*['"]\.\.\/_shared\/googlePlayDeveloperApi\.ts['"]/.test(HANDLER));
  // The INFRA-442 reconcile needs a LITERAL reader of the secret to stay in the function.
  assert(/Deno\.env\.get\(\s*'GOOGLE_SERVICE_ACCOUNT'\s*\)/.test(HANDLER));
  // The injected seams are test-only: production passes neither.
  assertEquals(/\bfetchImpl\b/.test(HANDLER), false);
});

Deno.test('verify-google-receipt validates the request before any token is minted', () => {
  const pkgCheck = HANDLER.search(/\bassertBeingPackageName\(/);
  const idCheck = HANDLER.search(/\bassertValidSubscriptionId\(/);
  const tokenCheck = HANDLER.search(/\bassertValidPurchaseToken\(/);
  // The mint happens inside verifyWithGoogle, so the request-path anchor is its CALL in the
  // handler (its definition sits above the handler and would order trivially).
  const mint = HANDLER.search(/\bawait verifyWithGoogle\(/);
  const client = HANDLER.search(/\bcreateClient\(/);
  for (const at of [pkgCheck, idCheck, tokenCheck, mint, client]) assert(at > -1, 'anchor not found');
  assert(pkgCheck < mint && idCheck < mint && tokenCheck < mint);
  // No Supabase client is built for a request that fails validation.
  assert(pkgCheck < client && idCheck < client && tokenCheck < client);
  // verifyWithGoogle itself mints: the mint is reachable only through that call.
  assert(/async function verifyWithGoogle[\s\S]*?getGoogleAccessToken\(/.test(HANDLER));
});

Deno.test('the shared module never reads env and never honours token_uri', () => {
  assertEquals(/Deno\.env/.test(SHARED), false);
  assertEquals(/token_uri|auth_uri/.test(SHARED), false);
});

Deno.test('CONTROL: the source matchers fire on real code and not on prose', () => {
  assert(/signature_placeholder/.test('const a = `${x}.signature_placeholder`;'));
  assertEquals(/signature_placeholder/.test(stripComments('// was: signature_placeholder\nconst a = 1;')), false);
  assert(/function\s+getGoogleAccessToken\b/.test('async function getGoogleAccessToken() {}'));
  // Not a `.get('…')` call: the INFRA-442 drift scanner reads test files too.
  assert(/Deno\.env/.test('const env = Deno.env;'));
  assert(/token_uri|auth_uri/.test('const u = cred.token_uri;'));
  assert(/\bfetchImpl\b/.test('getGoogleAccessToken(c, { fetchImpl })'));
});
