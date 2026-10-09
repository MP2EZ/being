/**
 * verify-google-receipt handler - behavioural tests (MAINT-753).
 *
 * Drives the DEPLOYED handler (handle, imported by index.ts) with injected Google calls
 * (getGoogleAccessToken, fetchSubscriptionPurchase), the fakeSupabase tables and an injected
 * clock. Pins status, body, headers, the exact subscriptions upsert and the FULL audit
 * p_metadata (deep equality) per branch. Branches that write no audit row today are pinned as
 * writing none - a characterization, not an endorsement.
 *
 * ERROR TEXT (MAINT-759). No error text reaches an audit row or a log line. A failed Google
 * call is audited as a closed `reason` - the shared module's error class, matched by
 * instanceof, else 'unknown' - plus a numeric `upstream_status` (0 = no response). Logs carry
 * the same reason, or an allowlisted error name. Safety no longer rests on the shared module's
 * messages staying fixed: whatever a dependency throws, the handler never forwards its text.
 *
 * VALIDITY (DEBUG-758). Expiry is the time authority; payment, not acknowledgement, decides
 * entitlement. The client acknowledges AFTER a valid verify (DEBUG-697), so an unacknowledged
 * purchase is the normal first-verify state and this function never acknowledges. Each invalid
 * cause is audited with its own reason (googleInvalidReason).
 *
 * The GOOGLE_SERVICE_ACCOUNT secret is parsed INLINE by the handler (not a dep), so scenarios
 * that reach Google set a synthetic service-account JSON. Nothing here is a real key; the token
 * mint is faked. Global fetch is a throwing tripwire for every scenario.
 */

import {
  assert,
  assertEquals,
  assertNotEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  googleInvalidReason,
  handle,
  parseGoogleReceipt,
  type GoogleReceiptDeps,
} from '../verify-google-receipt/handler.ts';
import {
  fetchSubscriptionPurchase as realFetchSubscriptionPurchase,
  GoogleAuthError,
  GooglePlayApiError,
  type GoogleServiceAccountCredential,
  type GoogleSubscriptionPurchase,
} from '../_shared/googlePlayDeveloperApi.ts';
import { decryptReceipt, receiptHash } from '../_shared/receiptCrypto.ts';
import { fakeDb, type FakeDb } from './helpers/fakeSupabase.ts';
import {
  ANON_KEY_TOKEN,
  ANON_SESSION_TOKEN,
  assertCors,
  auditRows,
  bodyJson,
  DAY,
  ENC_KEY_B64,
  iso,
  JWT_SUB,
  NOW,
  OTHER_USER,
  request,
  scenario,
} from './helpers/receiptHandlerKit.ts';

const PACKAGE = 'fyi.being.app';
const SUB_MONTHLY = 'com.being.subscription.monthly';
const SUB_YEARLY = 'com.being.subscription.yearly';
const TOKEN = 'purchasetoken.AbCdEf-0123456789_xyz';
const ORDER_ID = 'GPA.3333-4444-5555-66666';
const ACCESS_TOKEN = 'ya29.synthetic-access-token';
const EXPIRY = NOW + 30 * DAY;

/** A synthetic service-account key file. The private key is a placeholder, never a PEM. */
const SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  project_id: 'being-test',
  private_key_id: 'kid-test-0001',
  private_key: 'synthetic-private-key-placeholder',
  client_email: 'receipts@being-test.iam.gserviceaccount.com',
});
const CREDENTIAL: GoogleServiceAccountCredential = {
  clientEmail: 'receipts@being-test.iam.gserviceaccount.com',
  privateKeyPem: 'synthetic-private-key-placeholder',
  privateKeyId: 'kid-test-0001',
};

function purchase(over: Partial<GoogleSubscriptionPurchase> = {}): GoogleSubscriptionPurchase {
  return {
    kind: 'androidpublisher#subscriptionPurchase',
    startTimeMillis: String(NOW - DAY),
    expiryTimeMillis: String(EXPIRY),
    autoRenewing: true,
    priceCurrencyCode: 'USD',
    priceAmountMicros: '4990000',
    countryCode: 'US',
    orderId: ORDER_ID,
    acknowledgementState: 1,
    paymentState: 1,
    ...over,
  };
}

interface Harness {
  db: FakeDb;
  deps: GoogleReceiptDeps;
  createSupabaseCalls: number;
  tokenCalls: unknown[][];
  lookupCalls: unknown[][];
}

function harness(opts: {
  purchase?: unknown;
  tokenThrows?: unknown;
  lookupThrows?: unknown;
  lookup?: GoogleReceiptDeps['fetchSubscriptionPurchase'];
  seed?: Record<string, Record<string, unknown>[]>;
} = {}): Harness {
  const db = fakeDb(opts.seed);
  const h: Harness = {
    db,
    createSupabaseCalls: 0,
    tokenCalls: [],
    lookupCalls: [],
    deps: {
      createSupabase: () => {
        h.createSupabaseCalls++;
        return db.client;
      },
      getGoogleAccessToken: (...args: unknown[]) => {
        h.tokenCalls.push(args);
        if (opts.tokenThrows !== undefined) return Promise.reject(opts.tokenThrows);
        return Promise.resolve(ACCESS_TOKEN);
      },
      fetchSubscriptionPurchase: opts.lookup ?? ((...args: unknown[]) => {
        h.lookupCalls.push(args);
        if (opts.lookupThrows !== undefined) return Promise.reject(opts.lookupThrows);
        return Promise.resolve((opts.purchase ?? purchase()) as GoogleSubscriptionPurchase);
      }),
      now: () => NOW,
    },
  };
  return h;
}

const body = (over: Record<string, unknown> = {}) => ({
  packageName: PACKAGE,
  subscriptionId: SUB_MONTHLY,
  purchaseToken: TOKEN,
  ...over,
});
const req = (b: unknown = body()) => request(ANON_SESSION_TOKEN, b);

function t(name: string, fn: () => Promise<void>, env: Record<string, string | undefined> = {}) {
  Deno.test(name, () => scenario({ GOOGLE_SERVICE_ACCOUNT: SERVICE_ACCOUNT, ...env }, fn));
}

/** Call the handler; the purchase token must never appear in any response body. */
async function call(h: Harness, r: Request, token: string = TOKEN) {
  const res = await handle(r, h.deps);
  const text = await res.text();
  if (token.length >= 8) assert(!text.includes(token), 'the purchase token reached a response body');
  return { res, text, json: text ? JSON.parse(text) : null };
}

function assertNoWrites(h: Harness) {
  assertEquals(h.db.upserts, [], 'a subscriptions row was upserted');
  assertEquals(h.db.tables.subscriptions.length, 0, 'a subscriptions row exists');
}

function assertNoGoogleCalls(h: Harness) {
  assertEquals(h.tokenCalls.length, 0, 'an access token was minted');
  assertEquals(h.lookupCalls.length, 0, 'a purchase lookup was made');
}

const failureAudit = (reason: string, upstream_status?: number) => [{
  p_user_id: JWT_SUB,
  p_subscription_id: null,
  p_event_type: 'receipt_verification_failed',
  p_metadata: upstream_status === undefined
    ? { platform: 'google', reason, timestamp: iso(NOW) }
    : { platform: 'google', reason, upstream_status, timestamp: iso(NOW) },
}];

const reasonAudit = (reason: string) => [{
  p_user_id: JWT_SUB,
  p_subscription_id: null,
  p_event_type: 'receipt_verification_failed',
  p_metadata: { platform: 'google', reason, timestamp: iso(NOW) },
}];

// ---------------------------------------------------------------------------
// Transport: OPTIONS / method / identity / body
// ---------------------------------------------------------------------------

t('OPTIONS: null body with CORS, no client, no auth required', async () => {
  const h = harness();
  const res = await handle(request(null, undefined, 'OPTIONS'), h.deps);
  assertEquals(res.status, 200);
  assertEquals(await res.text(), '');
  assertCors(res);
  assertEquals(h.createSupabaseCalls, 0);
});

t('GET: 405 {error} and, as of today, NO CORS headers (pinned, not endorsed)', async () => {
  const h = harness();
  const res = await handle(request(ANON_SESSION_TOKEN, undefined, 'GET'), h.deps);
  assertEquals(res.status, 405);
  assertEquals(res.headers.get('content-type'), 'application/json');
  assertEquals(res.headers.get('access-control-allow-origin'), null);
  assertEquals(await bodyJson(res), { error: 'Method not allowed' });
  assertEquals(h.createSupabaseCalls, 0);
});

for (
  const [label, tok, error] of [
    ['no Authorization header', null, 'Missing or malformed Authorization header'],
    ['anon-key token (role anon, no sub)', ANON_KEY_TOKEN, 'JWT missing or invalid sub claim'],
    ['malformed token', 'abc', 'Malformed JWT'],
  ] as const
) {
  t(`401 with no client built and no Google call: ${label}`, async () => {
    const h = harness();
    const { res, json } = await call(h, request(tok, body()));
    assertEquals(res.status, 401);
    assertEquals(res.headers.get('content-type'), 'application/json');
    assertEquals(json, { error });
    assertEquals(h.createSupabaseCalls, 0);
    assertNoGoogleCalls(h);
    assertEquals(h.db.rpcCalls.length, 0);
    assertNoWrites(h);
  });
}

t('an unparseable JSON body is a 500 {valid:false,error:"Internal server error"} (pinned)', async () => {
  const h = harness();
  const { res, json } = await call(h, request(ANON_SESSION_TOKEN, 'not json{'));
  assertEquals(res.status, 500);
  assertEquals(json, { valid: false, error: 'Internal server error' });
  assertEquals(h.createSupabaseCalls, 0);
  assertEquals(h.db.rpcCalls.length, 0);
});

for (const missing of ['packageName', 'subscriptionId', 'purchaseToken']) {
  for (const value of [undefined, '']) {
    t(`400 missing field with no client: ${missing}=${JSON.stringify(value)}`, async () => {
      const h = harness();
      const { res, json } = await call(h, req(body({ [missing]: value })));
      assertEquals(res.status, 400);
      assertEquals(json, { error: 'Missing required fields: packageName, subscriptionId, purchaseToken' });
      assertEquals(h.createSupabaseCalls, 0);
      assertNoGoogleCalls(h);
      assertEquals(h.db.rpcCalls.length, 0);
    });
  }
}

// ---------------------------------------------------------------------------
// DEBUG-752 validation: before any client is built or token minted
// ---------------------------------------------------------------------------

const INVALID_PARAMS: Array<[string, Record<string, unknown>]> = [
  ['packageName for another app', { packageName: 'com.someone.else' }],
  ['packageName with different case', { packageName: 'FYI.being.app' }],
  ['packageName that is not a string', { packageName: 5 }],
  ['subscriptionId "..": a path segment', { subscriptionId: '..' }],
  ['subscriptionId with a slash', { subscriptionId: 'a/b' }],
  ['subscriptionId with upper case', { subscriptionId: 'Com.Being.Monthly' }],
  ['subscriptionId over 100 characters', { subscriptionId: 'a'.repeat(101) }],
  ['purchaseToken ".."', { purchaseToken: '..' }],
  ['purchaseToken with a slash', { purchaseToken: 'abc/def' }],
  ['purchaseToken with a query', { purchaseToken: 'abc?x=1' }],
  ['purchaseToken over 2048 characters', { purchaseToken: 'a'.repeat(2049) }],
];

for (const [label, over] of INVALID_PARAMS) {
  t(`400 Invalid purchase parameters, no client, no token minted, no lookup: ${label}`, async () => {
    const h = harness();
    const { res, json } = await call(h, req(body(over)));
    assertEquals(res.status, 400);
    assertEquals(res.headers.get('content-type'), 'application/json');
    assertEquals(json, { error: 'Invalid purchase parameters' });
    assertEquals(h.createSupabaseCalls, 0);
    assertNoGoogleCalls(h);
    assertEquals(h.db.rpcCalls.length, 0);
    assertNoWrites(h);
  });
}

t('the validation runs BEFORE the mock gate: a mock token for another app is refused as invalid', async () => {
  const h = harness();
  const { res, json } = await call(h, req(body({ packageName: 'com.someone.else', purchaseToken: 'mock_token_abc123' })));
  assertEquals(res.status, 400);
  assertEquals(json, { error: 'Invalid purchase parameters' });
  assertEquals(h.createSupabaseCalls, 0);
}, { ALLOW_MOCK_RECEIPTS: 'true' });

// ---------------------------------------------------------------------------
// Mock gate: both ways
// ---------------------------------------------------------------------------

for (const value of [undefined, 'false', 'TRUE', '1', '', 'true ']) {
  t(`mock token REJECTED unless ALLOW_MOCK_RECEIPTS is exactly "true": ${JSON.stringify(value)}`, async () => {
    const h = harness();
    const { res, json } = await call(h, req(body({ purchaseToken: 'mock_token_abc123' })));
    assertEquals(res.status, 400);
    assertEquals(json, { error: 'Invalid purchase token' });
    assertNoGoogleCalls(h);
    assertEquals(h.db.rpcCalls.length, 0, 'a rejected mock wrote an audit row');
    assertNoWrites(h);
  }, { ALLOW_MOCK_RECEIPTS: value });
}

for (
  const [subscriptionId, days] of [[SUB_YEARLY, 365], [SUB_MONTHLY, 30]] as const
) {
  t(`mock token ACCEPTED when ALLOW_MOCK_RECEIPTS is "true": ${subscriptionId} writes no subscription and no audit row`, async () => {
    const h = harness();
    const { res, json } = await call(h, req(body({ subscriptionId, purchaseToken: 'mock_token_abc123' })));
    assertEquals(res.status, 200);
    assertEquals(json, {
      valid: true,
      subscriptionId: `mock_sub_${NOW}`,
      productId: subscriptionId,
      expiresDate: iso(NOW + days * DAY),
      autoRenewEnabled: true,
    });
    assertNoGoogleCalls(h);
    assertEquals(h.db.rpcCalls.length, 0, 'a mock token wrote an audit row');
    assertNoWrites(h);
  }, { ALLOW_MOCK_RECEIPTS: 'true' });
}

// ---------------------------------------------------------------------------
// Google failures: one 500 for every API/token failure; the audit row holds a closed reason
// ---------------------------------------------------------------------------

const GOOGLE_FAILURES: Array<{
  name: string;
  opts: Parameters<typeof harness>[0];
  env?: Record<string, string | undefined>;
  reason: string;
  upstream_status?: number;
  minted: boolean;
}> = [
  {
    name: 'lookup 410',
    opts: { lookupThrows: new GooglePlayApiError(410) },
    reason: 'GooglePlayApiError',
    upstream_status: 410,
    minted: true,
  },
  {
    name: 'lookup 503',
    opts: { lookupThrows: new GooglePlayApiError(503) },
    reason: 'GooglePlayApiError',
    upstream_status: 503,
    minted: true,
  },
  {
    name: 'lookup unreachable',
    opts: { lookupThrows: new GooglePlayApiError(0) },
    reason: 'GooglePlayApiError',
    upstream_status: 0,
    minted: true,
  },
  {
    name: 'lookup 401/403',
    opts: { lookupThrows: new GoogleAuthError(403) },
    reason: 'GoogleAuthError',
    upstream_status: 403,
    minted: true,
  },
  {
    name: 'token mint refused',
    opts: { tokenThrows: new GoogleAuthError(401) },
    reason: 'GoogleAuthError',
    upstream_status: 401,
    minted: true,
  },
  {
    name: 'token mint unreachable',
    opts: { tokenThrows: new GoogleAuthError(0) },
    reason: 'GoogleAuthError',
    upstream_status: 0,
    minted: true,
  },
  {
    name: 'GOOGLE_SERVICE_ACCOUNT unset (parsed inline, so no mint is attempted)',
    opts: {},
    env: { GOOGLE_SERVICE_ACCOUNT: undefined },
    reason: 'GoogleServiceAccountConfigError',
    minted: false,
  },
  {
    name: 'GOOGLE_SERVICE_ACCOUNT not JSON (parsed inline, so no mint is attempted)',
    opts: {},
    env: { GOOGLE_SERVICE_ACCOUNT: '{"private_key": "SENTINEL_KEY_FRAGMENT' },
    reason: 'GoogleServiceAccountConfigError',
    minted: false,
  },
];

for (const row of GOOGLE_FAILURES) {
  t(`Google failure (${row.name}): one 500, a closed reason audited, nothing written`, async () => {
    const h = harness(row.opts);
    const { res, text, json } = await call(h, req());
    assertEquals(res.status, 500);
    assertEquals(json, { valid: false, error: 'Failed to verify receipt with Google Play' });
    assert(!text.includes('SENTINEL_KEY_FRAGMENT'));
    assertEquals(auditRows(h.db), failureAudit(row.reason, row.upstream_status));
    assertEquals(h.tokenCalls.length, row.minted ? 1 : 0);
    // A mint failure means the lookup is never attempted.
    assertEquals(h.lookupCalls.length, row.opts?.tokenThrows !== undefined || !row.minted ? 0 : 1);
    assertNoWrites(h);
  }, row.env ?? {});
}

t('a dependency throwing ANY other error is audited as reason "unknown": its text never forwarded (MAINT-759)', async () => {
  // Was pinned UNSANITIZED: the handler stored error.message verbatim, so safety rested on the
  // shared module's messages. 5KB also proves the row stays under the 2KB metadata_size CHECK,
  // which a forwarded message would break - silently dropping the audit row.
  const leaky = `connect ECONNREFUSED https://androidpublisher.googleapis.com/x/tokens/${TOKEN} `.repeat(60);
  assert(leaky.length > 5000);
  const h = harness({ lookupThrows: new Error(leaky) });
  const { res, json } = await call(h, req());
  assertEquals(res.status, 500);
  assertEquals(json, { valid: false, error: 'Failed to verify receipt with Google Play' });
  const audited = auditRows(h.db);
  assertEquals(audited, failureAudit('unknown'));
  assert(JSON.stringify(audited[0].p_metadata).length < 2048);
});

t('a foreign error borrowing a Google class NAME is still "unknown" - the reason is matched by class, not by name', async () => {
  const impostor = new Error(`impostor ${TOKEN}`);
  impostor.name = 'GooglePlayApiError';
  const h = harness({ lookupThrows: impostor });
  await call(h, req());
  assertEquals(auditRows(h.db), failureAudit('unknown'));
});

t('end to end through the REAL lookup: a fetch that throws a URL-bearing message audits only the fixed text', async () => {
  const urlBearing = `error sending request for url (https://androidpublisher.googleapis.com/.../tokens/${TOKEN}): connection refused`;
  const h = harness({
    lookup: (ids, accessToken) =>
      realFetchSubscriptionPurchase(ids, accessToken, {
        fetchImpl: (() => Promise.reject(new TypeError(urlBearing))) as typeof fetch,
      }),
  });
  const { res, json } = await call(h, req());
  assertEquals(res.status, 500);
  assertEquals(json, { valid: false, error: 'Failed to verify receipt with Google Play' });
  const audited = auditRows(h.db);
  assertEquals(audited, failureAudit('GooglePlayApiError', 0));
  const serialized = JSON.stringify(audited);
  assert(!serialized.includes(TOKEN) && !serialized.includes('androidpublisher.googleapis.com'));
});

// ---------------------------------------------------------------------------
// parseGoogleReceipt boundaries under the injected clock
// ---------------------------------------------------------------------------

Deno.test('parseGoogleReceipt: expiry is strictly greater than now (NOW-1 / NOW / NOW+1)', () => {
  for (const [expiry, valid] of [[NOW - 1, false], [NOW, false], [NOW + 1, true]] as const) {
    const v = parseGoogleReceipt(purchase({ expiryTimeMillis: String(expiry) }), SUB_MONTHLY, NOW);
    assertEquals(v.valid, valid, `expiry ${expiry - NOW}ms from now`);
    assertEquals(v.expiresDate, iso(expiry));
  }
});

const validity = (over: Partial<GoogleSubscriptionPurchase>) =>
  parseGoogleReceipt(purchase(over), SUB_MONTHLY, NOW).valid;

Deno.test('DEBUG-758: an unacknowledged, active, paid purchase is VALID (the first verify precedes the ack)', () => {
  for (const acknowledgementState of [0, undefined, 1]) {
    assertEquals(validity({ acknowledgementState }), true, `acknowledgementState ${acknowledgementState}`);
  }
});

Deno.test('DEBUG-758: cancelled-but-paid keeps access until expiry (cancelReason 0/1/3, paymentState absent)', () => {
  for (const cancelReason of [0, 1, 3]) {
    const v = parseGoogleReceipt(
      purchase({ cancelReason, paymentState: undefined, autoRenewing: false }),
      SUB_MONTHLY,
      NOW,
    );
    assertEquals(v.valid, true, `cancelReason ${cancelReason}`);
    assertEquals(v.autoRenewEnabled, false);
    assertEquals(v.expiresDate, iso(EXPIRY));
  }
});

Deno.test('DEBUG-758: an expired purchase is invalid in every ack / cancel / payment combination', () => {
  const past = String(NOW - 1);
  for (
    const over of [
      { acknowledgementState: 1 },
      { acknowledgementState: 0 },
      { cancelReason: 0, paymentState: undefined },
      { paymentState: 2 },
    ]
  ) {
    assertEquals(validity({ ...over, expiryTimeMillis: past }), false, JSON.stringify(over));
  }
});

Deno.test('DEBUG-758: the payment truth table (paymentState x acknowledgementState x cancelReason)', () => {
  const rows: Array<[string, Partial<GoogleSubscriptionPurchase>, boolean]> = [
    ['received', { paymentState: 1 }, true],
    ['free trial', { paymentState: 2 }, true],
    ['pending first payment (unacknowledged)', { paymentState: 0, acknowledgementState: 0 }, false],
    ['pending first payment (ack absent)', { paymentState: 0, acknowledgementState: undefined }, false],
    ['grace-period renewal of an acknowledged subscription', { paymentState: 0, acknowledgementState: 1 }, true],
    ['pending deferred replacement', { paymentState: 3 }, false],
    ['replaced by upgrade/downgrade, even if paid', { cancelReason: 2, paymentState: 1 }, false],
    ['replaced, paymentState absent', { cancelReason: 2, paymentState: undefined }, false],
    ['paymentState absent and not cancelled (fail closed)', { paymentState: undefined }, false],
    ['an unknown paymentState (fail closed)', { paymentState: 7 }, false],
    ['a non-number paymentState reads as absent', { paymentState: '1' as unknown as number }, false],
  ];
  for (const [label, over, valid] of rows) assertEquals(validity(over), valid, label);
});

Deno.test('DEBUG-758: googleInvalidReason names each cause, and is null exactly when valid', () => {
  const rows: Array<[Partial<GoogleSubscriptionPurchase>, string | null]> = [
    [{}, null],
    [{ acknowledgementState: 0 }, null],
    [{ cancelReason: 0, paymentState: undefined }, null],
    [{ expiryTimeMillis: String(NOW) }, 'receipt_expired'],
    [{ cancelReason: 2 }, 'purchase_replaced'],
    [{ paymentState: 0, acknowledgementState: 0 }, 'payment_pending'],
    [{ paymentState: 3 }, 'replacement_pending'],
    [{ paymentState: undefined }, 'payment_state_missing'],
    [{ paymentState: 7 }, 'payment_state_unknown'],
  ];
  for (const [over, reason] of rows) {
    const p = purchase(over);
    assertEquals(googleInvalidReason(p, NOW), reason, JSON.stringify(over));
    assertEquals(parseGoogleReceipt(p, SUB_MONTHLY, NOW).valid, reason === null, JSON.stringify(over));
  }
});

Deno.test('parseGoogleReceipt: the result shape (orderId, productId from the REQUEST, expiry, autoRenewing)', () => {
  assertEquals(parseGoogleReceipt(purchase({ autoRenewing: false }), SUB_YEARLY, NOW), {
    valid: true,
    subscriptionId: ORDER_ID,
    productId: SUB_YEARLY,
    expiresDate: iso(EXPIRY),
    autoRenewEnabled: false,
  });
});

for (
  const [label, over, reason] of [
    ['expired a millisecond ago', { expiryTimeMillis: String(NOW - 1) }, 'receipt_expired'],
    ['expiring exactly now', { expiryTimeMillis: String(NOW) }, 'receipt_expired'],
    ['replaced by upgrade/downgrade (cancelReason 2)', { cancelReason: 2 }, 'purchase_replaced'],
    ['pending first payment', { paymentState: 0, acknowledgementState: 0 }, 'payment_pending'],
    ['pending deferred replacement (paymentState 3)', { paymentState: 3 }, 'replacement_pending'],
    ['paymentState absent and not cancelled', { paymentState: undefined }, 'payment_state_missing'],
  ] as const
) {
  t(`400 invalid receipt, audited with its cause, nothing written: ${label}`, async () => {
    const h = harness({ purchase: purchase(over) });
    const { res, json } = await call(h, req());
    assertEquals(res.status, 400);
    assertEquals(json.valid, false);
    assertEquals(json.subscriptionId, ORDER_ID);
    assertEquals(auditRows(h.db), reasonAudit(reason));
    assertNoWrites(h);
  });
}

t('DEBUG-758: a first, unacknowledged purchase verifies 200 and is written; the server makes NO other Google call', async () => {
  // AC3 pin: verify-google-receipt never acknowledges. The client acknowledges after this
  // verify (DEBUG-697), so exactly one mint and one lookup happen - no acknowledge request.
  const h = harness({ purchase: purchase({ acknowledgementState: 0 }) });
  const { res, json } = await call(h, req());
  assertEquals(res.status, 200);
  assertEquals(json.valid, true);
  assertEquals(h.tokenCalls.length, 1);
  assertEquals(h.lookupCalls.length, 1);
  assertEquals(h.db.upserts.length, 1);
  assertEquals(h.db.upserts[0].row.status, 'active');
  assertEquals(auditRows(h.db)[0].p_event_type, 'receipt_verification_succeeded');
});

t('DEBUG-758: a cancelled-but-paid purchase verifies 200, written active until its expiry', async () => {
  const h = harness({ purchase: purchase({ cancelReason: 0, paymentState: undefined, autoRenewing: false }) });
  const { res, json } = await call(h, req());
  assertEquals(res.status, 200);
  assertEquals(json.autoRenewEnabled, false);
  assertEquals(h.db.upserts[0].row.status, 'active');
  assertEquals(h.db.upserts[0].row.subscription_end_date, iso(EXPIRY));
});

t('a lookup result with no expiryTimeMillis is a RangeError: 500 "Internal server error", no audit, no row (pinned)', async () => {
  // The REAL lookup rejects this shape before it gets here (googlePlayDeveloperApi: the
  // expiryTimeMillis must be a digit string), so this is reachable only through an injected
  // dep. It pins what the handler itself does with a malformed purchase.
  const h = harness({ purchase: purchase({ expiryTimeMillis: undefined as unknown as string }) });
  const { res, json } = await call(h, req());
  assertEquals(res.status, 500);
  assertEquals(json, { valid: false, error: 'Internal server error' });
  assertEquals(h.db.rpcCalls.length, 0);
  assertNoWrites(h);
});

// ---------------------------------------------------------------------------
// Success: the exact write
// ---------------------------------------------------------------------------

t('200: the exact subscriptions upsert and the receipt_verification_succeeded audit', async () => {
  const h = harness({ purchase: purchase() });
  const { res, json } = await call(h, req(body({ subscriptionId: SUB_YEARLY })));
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('content-type'), 'application/json');
  assertEquals(json, {
    valid: true,
    subscriptionId: ORDER_ID,
    productId: SUB_YEARLY,
    expiresDate: iso(EXPIRY),
    autoRenewEnabled: true,
  });

  // The Google calls: the parsed credential in, then the identifiers and the minted token,
  // with no fetch seam anywhere.
  assertEquals(h.tokenCalls, [[CREDENTIAL]]);
  assertEquals(h.lookupCalls, [[{ subscriptionId: SUB_YEARLY, purchaseToken: TOKEN }, ACCESS_TOKEN]]);

  assertEquals(h.db.upserts.length, 1);
  const { table, row, options } = h.db.upserts[0];
  assertEquals(table, 'subscriptions');
  assertEquals(options, { onConflict: 'user_id' });
  const ciphertext = row.receipt_data_encrypted as string;
  // No `environment` column for Google rows; the purchase token is original_transaction_id.
  assertEquals(row, {
    user_id: JWT_SUB,
    platform: 'google',
    platform_subscription_id: ORDER_ID,
    original_transaction_id: TOKEN,
    receipt_hash: await receiptHash(TOKEN),
    status: 'active',
    tier: 'standard',
    interval: 'yearly',
    subscription_start_date: iso(NOW),
    subscription_end_date: iso(EXPIRY),
    last_receipt_verified: iso(NOW),
    receipt_data_encrypted: ciphertext,
    updated_at: iso(NOW),
  });
  assertNotEquals(ciphertext, TOKEN);
  assert(!ciphertext.includes(TOKEN));
  assertEquals(await decryptReceipt(ciphertext, ENC_KEY_B64), TOKEN);

  assertEquals(auditRows(h.db), [{
    p_user_id: JWT_SUB,
    p_subscription_id: ORDER_ID,
    p_event_type: 'receipt_verification_succeeded',
    p_metadata: { platform: 'google', verified_at: iso(NOW) },
  }]);
});

t('a monthly product is written with interval "monthly"', async () => {
  const h = harness();
  assertEquals((await call(h, req())).res.status, 200);
  assertEquals(h.db.upserts[0].row.interval, 'monthly');
});

t('a missing RECEIPT_ENCRYPTION_KEY fails loud: 500, no row, no audit', async () => {
  const h = harness();
  const { res, json } = await call(h, req());
  assertEquals(res.status, 500);
  assertEquals(json, { valid: false, error: 'Internal server error' });
  assertNoWrites(h);
  assertEquals(h.db.rpcCalls.length, 0);
}, { RECEIPT_ENCRYPTION_KEY: undefined });

// ---------------------------------------------------------------------------
// Replay binding and upsert failures
// ---------------------------------------------------------------------------

t('REPLAY: a purchase token already bound to another user is a 409, audited, and writes nothing', async () => {
  const bound = { user_id: OTHER_USER, platform: 'google', original_transaction_id: TOKEN, status: 'active' };
  const h = harness({ seed: { subscriptions: [bound] } });
  const { res, json } = await call(h, req());
  assertEquals(res.status, 409);
  assertEquals(json, { valid: false, error: 'Receipt already bound to another account' });
  assertEquals(auditRows(h.db), reasonAudit('txn_bound_to_other_user'));
  assertEquals(h.db.upserts, []);
  assertEquals(h.db.tables.subscriptions, [bound], 'the victim row was modified');
});

t('REPLAY: the same user re-verifying (restore purchases) is an idempotent 200', async () => {
  const mine = { user_id: JWT_SUB, platform: 'google', original_transaction_id: TOKEN, status: 'active' };
  const h = harness({ seed: { subscriptions: [mine] } });
  assertEquals((await call(h, req())).res.status, 200);
  assertEquals(h.db.upserts.length, 1);
  assertEquals(h.db.tables.subscriptions.length, 1);
  assertEquals(auditRows(h.db).map((a) => a.p_event_type), ['receipt_verification_succeeded']);
});

t('REPLAY: the binding is per platform - an apple row with the same id does not block google', async () => {
  const apple = { user_id: OTHER_USER, platform: 'apple', original_transaction_id: TOKEN };
  const h = harness({ seed: { subscriptions: [apple] } });
  assertEquals((await call(h, req())).res.status, 200);
});

t('a failing ownership lookup is a 500 with no write and no audit row', async () => {
  const h = harness();
  h.db.failOn('subscriptions', 'select', { message: 'SENTINEL_DB_DETAIL connection reset' });
  const { res, text, json } = await call(h, req());
  assertEquals(res.status, 500);
  assertEquals(json, { valid: false, error: 'Internal server error' });
  assert(!text.includes('SENTINEL_DB_DETAIL'));
  assertNoWrites(h);
  assertEquals(h.db.rpcCalls.length, 0);
});

for (
  const [label, error] of [
    ['code 23505', { code: '23505', message: 'duplicate key value violates unique constraint' }],
    ['message only, no code', { message: 'duplicate key value violates unique constraint "uniq_txn_per_platform"' }],
  ] as const
) {
  t(`UPSERT unique violation (${label}) is the TOCTOU backstop: 409 as a replay`, async () => {
    const h = harness();
    h.db.failOn('subscriptions', 'upsert', error);
    const { res, json } = await call(h, req());
    assertEquals(res.status, 409);
    assertEquals(json, { valid: false, error: 'Receipt already bound to another account' });
    assertEquals(h.db.upserts.length, 1);
    assertEquals(auditRows(h.db), reasonAudit('txn_bound_to_other_user'));
  });
}

t('UPSERT any other error: 500, upstream text withheld, and NO failure audit row (pinned as writing none)', async () => {
  const h = harness();
  h.db.failOn('subscriptions', 'upsert', { code: '42501', message: 'SENTINEL_DB_DETAIL permission denied' });
  const { res, text, json } = await call(h, req());
  assertEquals(res.status, 500);
  assertEquals(json, { valid: false, error: 'Internal server error' });
  assert(!text.includes('SENTINEL_DB_DETAIL'));
  assertEquals(h.db.upserts.length, 1);
  assertEquals(h.db.rpcCalls.length, 0);
});

// ---------------------------------------------------------------------------
// Audit writes are non-fatal (DEBUG-446 ruling)
// ---------------------------------------------------------------------------

t('an audit RPC error on the success path still answers 200 with the row written', async () => {
  const h = harness();
  h.db.failRpc('log_subscription_event', { code: '23514', message: 'event_type check violation' });
  const { res } = await call(h, req());
  assertEquals(res.status, 200);
  assertEquals(h.db.upserts.length, 1);
  assertEquals(auditRows(h.db).length, 1, 'the audit write was attempted');
});

t('an audit RPC error on a failure path does not change the failure answer', async () => {
  const h = harness({ lookupThrows: new GooglePlayApiError(503) });
  h.db.failRpc('log_subscription_event', { message: 'down' });
  const { res, json } = await call(h, req());
  assertEquals(res.status, 500);
  assertEquals(json, { valid: false, error: 'Failed to verify receipt with Google Play' });
});

// ---------------------------------------------------------------------------
// No token or credential in any audit row or log line (MAINT-759 AC3)
// ---------------------------------------------------------------------------

/** Everything a log line or audit row must never carry. The token is also checked as every
 *  8-char window of its distinctive tail, so a truncated fragment (a JSON SyntaxError quotes
 *  ~10 characters of the body) is caught too. */
const TOKEN_TAIL = TOKEN.slice(TOKEN.indexOf('.') + 1);
const FORBIDDEN = [
  TOKEN,
  ACCESS_TOKEN,
  CREDENTIAL.clientEmail,
  CREDENTIAL.privateKeyId,
  CREDENTIAL.privateKeyPem,
  'SENTINEL',
  ...Array.from({ length: TOKEN_TAIL.length - 7 }, (_, i) => TOKEN_TAIL.slice(i, i + 8)),
];

function assertNothingForbidden(where: string, text: string, forbidden: readonly string[] = FORBIDDEN) {
  for (const f of forbidden) assert(!text.includes(f), `${where} carries ${JSON.stringify(f)}: ${text}`);
}

/**
 * MAINT-765: identifiers a LOG LINE must never carry. Audit rows are exempt by design - the
 * success row's p_user_id is the user and its p_subscription_id is the Google orderId - so
 * these are checked against the captured console only, on top of FORBIDDEN.
 */
const MOCK_TOKEN = 'mock_token_abc123';
const LOG_ONLY_FORBIDDEN = [
  JWT_SUB,
  OTHER_USER,
  ANON_SESSION_TOKEN,
  ANON_SESSION_TOKEN.split('.')[1],
  ORDER_ID,
  'mock_sub_',
  MOCK_TOKEN,
  SERVICE_ACCOUNT,
];

const LEAK_CASES: Array<{
  name: string;
  setup: () => Harness;
  request?: () => Request;
  env?: Record<string, string | undefined>;
}> = [
  ...GOOGLE_FAILURES.map((row) => ({ name: row.name, setup: () => harness(row.opts), env: row.env })),
  {
    name: 'a dependency throws an Error carrying the token and the key',
    setup: () => harness({ lookupThrows: new Error(`${TOKEN} ${SERVICE_ACCOUNT} ${ACCESS_TOKEN} SENTINEL`) }),
  },
  { name: 'a dependency throws a non-Error string', setup: () => harness({ tokenThrows: `${TOKEN} SENTINEL` }) },
  {
    name: 'the REAL lookup with a fetch rejecting a URL-bearing TypeError',
    setup: () =>
      harness({
        lookup: (ids, accessToken) =>
          realFetchSubscriptionPurchase(ids, accessToken, {
            fetchImpl: (() =>
              Promise.reject(
                new TypeError(`error sending request for url (https://androidpublisher.googleapis.com/x/tokens/${TOKEN})`),
              )) as typeof fetch,
          }),
      }),
  },
  {
    name: 'a malformed JSON body whose unquoted token reaches the SyntaxError message',
    setup: () => harness(),
    request: () => request(ANON_SESSION_TOKEN, `{"packageName":"${PACKAGE}","purchaseToken":${TOKEN_TAIL}}`),
  },
  {
    name: 'an upsert error carrying sentinel database text',
    setup: () => {
      const h = harness();
      h.db.failOn('subscriptions', 'upsert', { code: '42501', message: `SENTINEL_DB ${TOKEN}` });
      return h;
    },
  },
  {
    name: 'a failing ownership lookup carrying sentinel database text',
    setup: () => {
      const h = harness();
      h.db.failOn('subscriptions', 'select', { message: `SENTINEL_DB ${TOKEN}` });
      return h;
    },
  },
  // MAINT-765: the success and failure branches that log an identifier rather than an error.
  { name: 'valid success', setup: () => harness() },
  { name: 'invalid receipt (expired)', setup: () => harness({ purchase: purchase({ expiryTimeMillis: String(NOW - 1) }) }) },
  {
    name: 'replay: purchase token bound to another user',
    setup: () =>
      harness({
        seed: {
          subscriptions: [{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', user_id: OTHER_USER, platform: 'google', original_transaction_id: TOKEN }],
        },
      }),
  },
  {
    name: 'upsert unique violation carrying sentinel text (TOCTOU replay)',
    setup: () => {
      const h = harness();
      h.db.failOn('subscriptions', 'upsert', { code: '23505', message: `SENTINEL_DB ${TOKEN}`, details: `SENTINEL ${ORDER_ID}` });
      return h;
    },
  },
  {
    name: 'mock branch accepted (ALLOW_MOCK_RECEIPTS=true)',
    setup: () => harness(),
    request: () => req(body({ purchaseToken: MOCK_TOKEN })),
    env: { ALLOW_MOCK_RECEIPTS: 'true' },
  },
  {
    name: 'mock branch rejected (ALLOW_MOCK_RECEIPTS unset)',
    setup: () => harness(),
    request: () => req(body({ purchaseToken: MOCK_TOKEN })),
  },
  {
    name: 'audit RPC failure with sentinel message, hint and details (success path)',
    setup: () => {
      const h = harness();
      h.db.failRpc('log_subscription_event', {
        code: '23514',
        message: `SENTINEL ${JWT_SUB} ${ORDER_ID}`,
        details: `SENTINEL ${ORDER_ID}`,
        hint: 'SENTINEL hint',
      });
      return h;
    },
  },
  {
    name: 'audit RPC failure with sentinel text (failure path)',
    setup: () => {
      const h = harness({ lookupThrows: new GooglePlayApiError(503) });
      h.db.failRpc('log_subscription_event', { message: `SENTINEL ${JWT_SUB}`, hint: 'SENTINEL hint', details: 'SENTINEL' });
      return h;
    },
  },
];

for (const c of LEAK_CASES) {
  Deno.test(`no token or credential in any audit row or log line: ${c.name}`, async () => {
    const lines: string[] = [];
    await scenario({ GOOGLE_SERVICE_ACCOUNT: SERVICE_ACCOUNT, ...(c.env ?? {}) }, async () => {
      const h = c.setup();
      await handle(c.request ? c.request() : req(), h.deps);
      assertNothingForbidden('an audit row', JSON.stringify(h.db.rpcCalls));
    }, lines);
    // Non-vacuity: every one of these paths logs, so an empty capture cannot pass as clean.
    assert(lines.length > 0, 'nothing was captured');
    for (const line of lines) assertNothingForbidden('a log line', line, [...FORBIDDEN, ...LOG_ONLY_FORBIDDEN]);
  });
}

Deno.test('control: the log-only matcher throws on a user id, an orderId and a mock id', () => {
  for (const leaky of [`user: ${JWT_SUB}`, `Success: ${ORDER_ID}`, 'mock_sub_1', `${OTHER_USER}`]) {
    let threw = false;
    try {
      assertNothingForbidden('a log line', leaky, [...FORBIDDEN, ...LOG_ONLY_FORBIDDEN]);
    } catch {
      threw = true;
    }
    assert(threw, `matcher accepted ${JSON.stringify(leaky)}`);
  }
});

Deno.test('control: the capture does see a token that is logged', async () => {
  const lines: string[] = [];
  await scenario({}, () => {
    console.error('probe', new Error(`x ${TOKEN}`));
    return Promise.resolve();
  }, lines);
  assert(lines.some((l) => l.includes(TOKEN)), 'capture missed a logged token - the leak tests would be vacuous');
});

Deno.test('control: the capture sees a user id in an Error and an orderId nested five levels deep (MAINT-765)', async () => {
  const lines: string[] = [];
  await scenario({}, () => {
    console.error(
      'probe',
      new Error(`x ${JWT_SUB}`),
      { nested: { a: { b: { c: { d: ORDER_ID } } } } },
    );
    return Promise.resolve();
  }, lines);
  assert(lines.some((l) => l.includes(JWT_SUB)), 'capture missed a logged user id');
  assert(lines.some((l) => l.includes(ORDER_ID)), 'capture missed a deeply nested orderId');
});
