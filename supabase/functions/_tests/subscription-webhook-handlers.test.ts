/**
 * subscription-webhook — handler and dispatch behaviour (DEBUG-739 AC3–AC6).
 *
 * Drives the DEPLOYED request handler (createWebhookHandler, which index.ts serves) with
 * stub verifiers and an in-memory database. The verifiers are stubs on purpose: a test
 * cannot mint an Apple-signed JWS (the root is pinned) or a Google-signed OIDC token, and
 * the real verifiers are covered by their own suites. What this file owns is everything
 * AFTER verification — which row is found, what is written, what is marked processed, and
 * what the store is told so it does or does not redeliver.
 *
 * Fixtures seed subscription rows exactly the way verify-apple-receipt and
 * verify-google-receipt write them (plaintext id in original_transaction_id, opaque
 * ciphertext in receipt_data_encrypted). That is what makes AC3 falsifiable: the old Google
 * lookup keyed on receipt_data_encrypted and could never find such a row.
 *
 * DEBUG-751 adds the monotonic guard (last_store_event_at), the optimistic write, Google
 * voided-purchase revocation and the package check; fixtures carry a store event time by
 * default (NOW - 60s) and rows carry a null watermark and an updated_at.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  createWebhookHandler,
  RTDN_MAX_AGE_MS,
  SubscriptionNotLinkedError,
  SubscriptionWriteRaceError,
  WebhookPayloadRejectedError,
  type WebhookDeps,
  webhookFailureReason,
} from '../subscription-webhook/handlers.ts';
import { captureConsole } from './helpers/consoleCapture.ts';
import { fakeDb, type FakeDb } from './helpers/fakeSupabase.ts';

const NOW = Date.parse('2026-10-06T12:00:00.000Z');
const APPLE_USER = '11111111-1111-4111-8111-111111111111';
const GOOGLE_USER = '22222222-2222-4222-8222-222222222222';
const APPLE_ROW_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GOOGLE_ROW_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ORIGINAL_TXN = '2000000123456789';
const PURCHASE_TOKEN = 'purchase-token-SENTINEL-opaque';
const ORDER_ID = 'GPA.3333-4444-5555-SENTINELORDER';
/** The store event time fixtures carry by default, and two ordered times for ordering tests. */
const EVENT_MS = NOW - 60_000;
const T1 = NOW - 3_600_000;
const T2 = NOW - 1_800_000;
const T3 = NOW - 900_000;
const ROW_UPDATED_AT = '2026-10-05T00:00:00.000Z';

/** A subscription row shaped the way the verify-*-receipt upserts write it. */
function appleRow(status = 'active') {
  return {
    id: APPLE_ROW_ID,
    user_id: APPLE_USER,
    platform: 'apple',
    platform_subscription_id: ORIGINAL_TXN,
    original_transaction_id: ORIGINAL_TXN,
    receipt_data_encrypted: 'AQ0xY2lwaGVydGV4dA==',
    status,
    last_store_event_at: null as string | null,
    updated_at: ROW_UPDATED_AT,
  };
}
function googleRow(status = 'active') {
  return {
    id: GOOGLE_ROW_ID,
    user_id: GOOGLE_USER,
    platform: 'google',
    platform_subscription_id: 'being_monthly',
    original_transaction_id: PURCHASE_TOKEN,
    receipt_data_encrypted: 'AQ1yYW5kb20taXYtY2lwaGVydGV4dA==',
    status,
    last_store_event_at: null as string | null,
    updated_at: ROW_UPDATED_AT,
  };
}

// ---------------------------------------------------------------------------
// Apple fixtures: the stub verifier decodes JSON, standing in for a verified JWS.
// ---------------------------------------------------------------------------

const SCOPE = { bundleId: 'fyi.being.app', environment: 'Production' };

function appleTransaction(over: Record<string, unknown> = {}) {
  return JSON.stringify({
    ...SCOPE,
    originalTransactionId: ORIGINAL_TXN,
    expiresDate: String(NOW + 30 * 86_400_000),
    ...over,
  });
}

function appleBody(
  notificationType: string,
  opts: {
    subtype?: string;
    data?: Record<string, unknown>;
    uuid?: string;
    /** Apple's outer signedDate; null omits it. Default: EVENT_MS. */
    signedDate?: number | string | null;
  } = {},
) {
  const signedDate = opts.signedDate === undefined ? EVENT_MS : opts.signedDate;
  return {
    signedPayload: JSON.stringify({
      notificationType,
      ...(opts.subtype ? { subtype: opts.subtype } : {}),
      ...(signedDate === null ? {} : { signedDate }),
      notificationUUID: opts.uuid ?? `uuid-${notificationType}-${opts.subtype ?? ''}`,
      data: opts.data ?? { ...SCOPE, signedTransactionInfo: appleTransaction() },
    }),
  };
}

// ---------------------------------------------------------------------------
// Google fixtures
// ---------------------------------------------------------------------------

function googleBody(
  message: Record<string, unknown> | string,
  opts: { messageId?: string; publishTime?: string } = {},
) {
  const data = typeof message === 'string' ? message : btoa(JSON.stringify(message));
  return {
    message: {
      data,
      messageId: opts.messageId ?? 'msg-1',
      publishTime: opts.publishTime ?? new Date(NOW - 60_000).toISOString(),
    },
    subscription: 'projects/being/subscriptions/rtdn',
  };
}

function rtdn(
  notificationType: number,
  purchaseToken: string | null = PURCHASE_TOKEN,
  over: Record<string, unknown> = {},
) {
  return {
    version: '1.0',
    packageName: 'fyi.being.app',
    eventTimeMillis: String(EVENT_MS),
    subscriptionNotification: { version: '1.0', notificationType, purchaseToken, subscriptionId: 'being_monthly' },
    ...over,
  };
}

/** A voidedPurchaseNotification message. `notification` overrides fields of the inner object. */
function voided(
  notification: Record<string, unknown> = {},
  over: Record<string, unknown> = {},
) {
  return {
    version: '1.0',
    packageName: 'fyi.being.app',
    eventTimeMillis: String(EVENT_MS),
    voidedPurchaseNotification: {
      purchaseToken: PURCHASE_TOKEN,
      orderId: ORDER_ID,
      productType: 1,
      refundType: 1,
      ...notification,
    },
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface RunOpts {
  db?: FakeDb;
  body?: unknown;
  method?: string;
  rawBody?: string;
  google?: { audience?: string; serviceAccount?: string };
  oidcThrows?: boolean;
  appleVerifyThrows?: boolean;
  /** MAINT-765: what the verifiers throw, when the test needs sentinel text in it. */
  appleVerifyError?: unknown;
  oidcError?: unknown;
  /** MAINT-765: collect every console line the request produced. */
  capture?: string[];
}

async function run(opts: RunOpts) {
  const db = opts.db ?? fakeDb();
  const oidcCalls: unknown[][] = [];
  let clientBuilds = 0;
  const deps: WebhookDeps = {
    createSupabase: () => {
      clientBuilds++;
      return db.client;
    },
    verifyAppleSignature: (s: string) => {
      if (opts.appleVerifyError !== undefined) return Promise.reject(opts.appleVerifyError);
      if (opts.appleVerifyThrows) return Promise.reject(new Error('JWS signature verification failed'));
      return Promise.resolve(JSON.parse(s));
    },
    verifyGoogleOIDC: (header, audience, sa) => {
      oidcCalls.push([header, audience, sa]);
      if (opts.oidcError !== undefined) return Promise.reject(opts.oidcError);
      if (opts.oidcThrows) return Promise.reject(new Error('OIDC token rejected'));
      return Promise.resolve({ serviceAccountEmail: sa });
    },
    readGoogleConfig: () =>
      opts.google ?? { audience: 'https://edge.test/subscription-webhook', serviceAccount: 'rtdn@being.iam.gserviceaccount.com' },
    now: () => NOW,
  };
  const req = new Request('https://edge.test/subscription-webhook', {
    method: opts.method ?? 'POST',
    headers: { Authorization: 'Bearer google-oidc-token', 'Content-Type': 'application/json' },
    body: (opts.method ?? 'POST') === 'POST' ? (opts.rawBody ?? JSON.stringify(opts.body)) : undefined,
  });
  const handler = createWebhookHandler(deps);
  const res = opts.capture
    ? (await captureConsole(() => handler(req), opts.capture)).result
    : await handler(req);
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  const marked = db.tables.webhook_replay_cache;
  return { res, body, db, marked, oidcCalls, clientBuilds };
}

const statusOf = (db: FakeDb, id: string) => db.tables.subscriptions.find((r) => r.id === id)?.status;

// ---------------------------------------------------------------------------
// AC3 — an unmatched Google notification is redelivered, never marked
// ---------------------------------------------------------------------------

Deno.test('AC3: a Google notification for a row bound the way verify-google-receipt binds it is FOUND and applied', async () => {
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  const r = await run({ db, body: googleBody(rtdn(13)) });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');
  assertEquals(r.marked.length, 1);
  assertEquals(db.rpcCalls[0].args.p_subscription_id, GOOGLE_ROW_ID);
});

Deno.test('AC3: a purchase token with no row yet is a 503 and is NOT marked processed', async () => {
  const r = await run({ body: googleBody(rtdn(4)) });
  assertEquals(r.res.status, 503);
  assertEquals(r.body.error, 'subscription_not_linked');
  assertEquals(r.marked.length, 0);
  assertEquals(r.db.updates.length, 0);
});

Deno.test('AC3: the same message is applied once its row appears, and marked then', async () => {
  const db = fakeDb();
  const first = await run({ db, body: googleBody(rtdn(4), { messageId: 'm-early' }) });
  assertEquals(first.res.status, 503);
  db.tables.subscriptions.push(googleRow('grace'));
  const second = await run({ db, body: googleBody(rtdn(4), { messageId: 'm-early' }) });
  assertEquals(second.res.status, 200);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'active');
  assertEquals(db.tables.webhook_replay_cache.length, 1);
});

Deno.test('AC3: an unmatched message older than the redelivery window is acknowledged, marked, and writes nothing', async () => {
  const stale = new Date(NOW - RTDN_MAX_AGE_MS - 1000).toISOString();
  const r = await run({ body: googleBody(rtdn(4), { publishTime: stale }) });
  assertEquals(r.res.status, 200);
  assertEquals(r.body.ignored, 'unresolved_rtdn_abandoned');
  assertEquals(r.marked.length, 1);
  assertEquals(r.db.updates.length, 0);
});

Deno.test('AC3: an unmatched message just inside the window is still deferred', async () => {
  const fresh = new Date(NOW - RTDN_MAX_AGE_MS + 60_000).toISOString();
  const r = await run({ body: googleBody(rtdn(4), { publishTime: fresh }) });
  assertEquals(r.res.status, 503);
  assertEquals(r.marked.length, 0);
});

Deno.test('AC3: a database error on the Google lookup is a 500 (transient), not "not linked", and not marked', async () => {
  const db = fakeDb({ subscriptions: [googleRow()] });
  db.failOn('subscriptions', 'select', { message: 'connection reset', code: '08006' });
  const r = await run({ db, body: googleBody(rtdn(2)) });
  assertEquals(r.res.status, 500);
  assertEquals(r.marked.length, 0);
});

Deno.test('AC3: the purchase token never appears in a response body', async () => {
  for (const body of [googleBody(rtdn(4)), googleBody(rtdn(4), { publishTime: 'not-a-date' })]) {
    const r = await run({ body });
    assertEquals(JSON.stringify(r.body).includes('SENTINEL'), false);
  }
});

// ---------------------------------------------------------------------------
// Google messages that are permanent, or carry no subscription change
// ---------------------------------------------------------------------------

for (const [label, message] of [
  ['a testNotification', { version: '1.0', packageName: 'fyi.being.app', testNotification: { version: '1.0' } }],
  ['a oneTimeProductNotification', { packageName: 'fyi.being.app', oneTimeProductNotification: { purchaseToken: 'x' } }],
  // DEBUG-751: a voided ONE-TIME product (productType 2) is not a subscription revocation.
  ['a voidedPurchaseNotification for a one-time product', voided({ productType: 2 })],
  ['a subscriptionNotification with no purchaseToken', rtdn(2, null)],
  ['an unhandled notificationType (PRICE_CHANGE_CONFIRMED)', rtdn(8)],
] as Array<[string, Record<string, unknown>]>) {
  Deno.test(`google: ${label} is acknowledged and marked, with no write`, async () => {
    const db = fakeDb({ subscriptions: [googleRow('expired')] });
    const r = await run({ db, body: googleBody(message) });
    assertEquals(r.res.status, 200);
    assert(typeof r.body.ignored === 'string');
    assertEquals(r.marked.length, 1);
    assertEquals(db.updates.length, 0);
    assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');
  });
}

Deno.test('google: undecodable message data is acknowledged (redelivering the same bytes cannot help)', async () => {
  const r = await run({ body: googleBody('%%% not base64 json %%%') });
  assertEquals(r.res.status, 200);
  assertEquals(r.body.ignored, 'malformed_message');
  assertEquals(r.db.updates.length, 0);
});

Deno.test('unhandled types no longer re-activate an expired row (both platforms)', async () => {
  const gdb = fakeDb({ subscriptions: [googleRow('expired')] });
  await run({ db: gdb, body: googleBody(rtdn(11)) }); // PAUSE_SCHEDULE_CHANGED
  assertEquals(statusOf(gdb, GOOGLE_ROW_ID), 'expired');

  const adb = fakeDb({ subscriptions: [appleRow('expired')] });
  await run({ db: adb, body: appleBody('PRICE_INCREASE') });
  assertEquals(statusOf(adb, APPLE_ROW_ID), 'expired');
});

// ---------------------------------------------------------------------------
// Apple: lookup, AC4, AC5
// ---------------------------------------------------------------------------

Deno.test('apple: a notification resolves the row by (platform, original_transaction_id) without appAccountToken', async () => {
  const db = fakeDb({ subscriptions: [appleRow('grace')] });
  const r = await run({ db, body: appleBody('DID_RENEW') });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, APPLE_ROW_ID), 'active');
  assertEquals(r.marked.length, 1);
  // The audit row carries the subscription row's UUID, not Apple's numeric transaction id.
  assertEquals(db.rpcCalls[0].args.p_subscription_id, APPLE_ROW_ID);
  assertEquals(db.rpcCalls[0].args.p_user_id, APPLE_USER);
});

Deno.test('apple: no bound row yet is a 503 and is NOT marked processed', async () => {
  const r = await run({ body: appleBody('SUBSCRIBED') });
  assertEquals(r.res.status, 503);
  assertEquals(r.marked.length, 0);
});

Deno.test('apple: an appAccountToken naming a different user is rejected, not applied, not marked', async () => {
  const db = fakeDb({ subscriptions: [appleRow('expired')] });
  const body = appleBody('DID_RENEW', {
    data: { ...SCOPE, signedTransactionInfo: appleTransaction({ appAccountToken: GOOGLE_USER }) },
  });
  const r = await run({ db, body });
  assertEquals(r.res.status, 422);
  assertEquals(statusOf(db, APPLE_ROW_ID), 'expired');
  assertEquals(r.marked.length, 0);
});

Deno.test('apple: a matching appAccountToken is accepted', async () => {
  const db = fakeDb({ subscriptions: [appleRow('grace')] });
  const body = appleBody('DID_RENEW', {
    data: { ...SCOPE, signedTransactionInfo: appleTransaction({ appAccountToken: APPLE_USER }) },
  });
  const r = await run({ db, body });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, APPLE_ROW_ID), 'active');
});

// AC4 ruling, named in the titles: a handled Apple type missing what it needs is a
// RETRYABLE NON-2xx (422) and is never marked processed — not a silent "handled", and not
// an audit row (impossible: subscription_events.user_id is NOT NULL).
for (const [label, data] of [
  ['no signedTransactionInfo', { ...SCOPE }],
  ['no originalTransactionId', { ...SCOPE, signedTransactionInfo: appleTransaction({ originalTransactionId: undefined }) }],
  ['an empty originalTransactionId', { ...SCOPE, signedTransactionInfo: appleTransaction({ originalTransactionId: '  ' }) }],
  ['no usable expiresDate', { ...SCOPE, signedTransactionInfo: appleTransaction({ expiresDate: undefined }) }],
] as Array<[string, Record<string, unknown>]>) {
  Deno.test(`AC4 (retryable non-2xx, not marked): a handled Apple type with ${label}`, async () => {
    const db = fakeDb({ subscriptions: [appleRow('active')] });
    const r = await run({ db, body: appleBody('EXPIRED', { data }) });
    assertEquals(r.res.status, 422);
    assertEquals(r.body.error, 'payload_rejected');
    assertEquals(r.marked.length, 0);
    assertEquals(db.updates.length, 0);
  });
}

Deno.test('AC4 (acknowledged, no write): an Apple TEST notification carries no transaction by design', async () => {
  const db = fakeDb({ subscriptions: [appleRow('active')] });
  const r = await run({ db, body: appleBody('TEST', { data: { ...SCOPE } }) });
  assertEquals(r.res.status, 200);
  assertEquals(r.body.ignored, 'apple_test_notification');
  assertEquals(r.marked.length, 1);
  assertEquals(db.updates.length, 0);
});

Deno.test('AC5: DID_CHANGE_RENEWAL_STATUS on an expired row leaves status expired', async () => {
  for (const subtype of ['AUTO_RENEW_DISABLED', 'AUTO_RENEW_ENABLED']) {
    for (const prior of ['expired', 'grace']) {
      const db = fakeDb({ subscriptions: [appleRow(prior)] });
      const r = await run({ db, body: appleBody('DID_CHANGE_RENEWAL_STATUS', { subtype }) });
      assertEquals(r.res.status, 200);
      assertEquals(statusOf(db, APPLE_ROW_ID), prior, `${subtype} on ${prior}`);
      assertEquals('status' in db.updates[0].patch, false);
    }
  }
});

Deno.test('AC5: the event type follows the subtype — a re-enable is not logged as a cancellation', async () => {
  const types: Record<string, string> = {};
  for (const subtype of ['AUTO_RENEW_DISABLED', 'AUTO_RENEW_ENABLED']) {
    const db = fakeDb({ subscriptions: [appleRow('active')] });
    await run({ db, body: appleBody('DID_CHANGE_RENEWAL_STATUS', { subtype }) });
    types[subtype] = String(db.rpcCalls[0].args.p_event_type);
  }
  assertEquals(types, {
    AUTO_RENEW_DISABLED: 'subscription_cancelled',
    AUTO_RENEW_ENABLED: 'subscription_restored',
  });
});

Deno.test('apple: an app-scope or environment mismatch throws before any subscriptions read', async () => {
  const db = fakeDb({ subscriptions: [appleRow('expired')] });
  const forged = appleBody('DID_RENEW', {
    data: { bundleId: 'com.other.app', environment: 'Production', signedTransactionInfo: appleTransaction() },
  });
  const r1 = await run({ db, body: forged });
  assertEquals(r1.res.status, 500);
  const envMismatch = appleBody('DID_RENEW', {
    data: { ...SCOPE, signedTransactionInfo: appleTransaction({ environment: 'Sandbox' }) },
  });
  const r2 = await run({ db, body: envMismatch });
  assertEquals(r2.res.status, 500);
  assertEquals(db.updates.length, 0);
  assertEquals(statusOf(db, APPLE_ROW_ID), 'expired');
  assertEquals(db.tables.webhook_replay_cache.length, 0);
});

// ---------------------------------------------------------------------------
// AC6 — dispatch
// ---------------------------------------------------------------------------

Deno.test('AC6: OPTIONS returns CORS headers and builds no client', async () => {
  const r = await run({ method: 'OPTIONS' });
  assertEquals(r.res.status, 200);
  assertEquals(r.res.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assertEquals(r.clientBuilds, 0);
});

Deno.test('AC6: a GET is 405', async () => {
  const r = await run({ method: 'GET' });
  assertEquals(r.res.status, 405);
});

Deno.test('AC6: a body that is neither Apple nor Google is 400, and no verifier runs', async () => {
  const r = await run({ body: { hello: 'world' } });
  assertEquals(r.res.status, 400);
  assertEquals(r.oidcCalls.length, 0);
  assertEquals(r.marked.length, 0);
});

Deno.test('AC6: an Apple notification already processed is a 200 replay with no update', async () => {
  const db = fakeDb({
    subscriptions: [appleRow('expired')],
    webhook_replay_cache: [{ source: 'apple', notification_id: 'uuid-replayed' }],
  });
  const r = await run({ db, body: appleBody('DID_RENEW', { uuid: 'uuid-replayed' }) });
  assertEquals(r.res.status, 200);
  assertEquals(r.body.replay, true);
  assertEquals(db.updates.length, 0);
});

Deno.test('AC6: a Google message already processed is a 200 replay with no update', async () => {
  const db = fakeDb({
    subscriptions: [googleRow('expired')],
    webhook_replay_cache: [{ source: 'google', notification_id: 'msg-seen' }],
  });
  const r = await run({ db, body: googleBody(rtdn(4), { messageId: 'msg-seen' }) });
  assertEquals(r.res.status, 200);
  assertEquals(r.body.replay, true);
  assertEquals(db.updates.length, 0);
});

Deno.test('AC6: a handler error is a 500 and is NOT marked processed', async () => {
  const db = fakeDb({ subscriptions: [appleRow('active')] });
  db.failOn('subscriptions', 'update', { message: 'permission denied', code: '42501' });
  const r = await run({ db, body: appleBody('EXPIRED') });
  assertEquals(r.res.status, 500);
  assertEquals(r.marked.length, 0);
});

Deno.test('AC6: an Apple verification failure is non-2xx with no cache read, mark, or write', async () => {
  const db = fakeDb({ subscriptions: [appleRow('active')] });
  const r = await run({ db, body: appleBody('EXPIRED'), appleVerifyThrows: true });
  assertEquals(r.res.status, 500);
  assertEquals(r.marked.length, 0);
  assertEquals(db.updates.length, 0);
});

Deno.test('AC6: a Google OIDC failure is non-2xx with no mark and no write', async () => {
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  const r = await run({ db, body: googleBody(rtdn(13)), oidcThrows: true });
  assertEquals(r.res.status, 500);
  assertEquals(r.marked.length, 0);
  assertEquals(db.updates.length, 0);
});

Deno.test('Google path fails closed when the audience is unset', async () => {
  const r = await run({ body: googleBody(rtdn(4)), google: { serviceAccount: 'rtdn@being.iam.gserviceaccount.com' } });
  assertEquals(r.res.status, 500);
  assertEquals(r.oidcCalls.length, 0);
  assertEquals(r.marked.length, 0);
});

Deno.test('Google path fails closed when the service-account pin is unset', async () => {
  const db = fakeDb({ subscriptions: [googleRow('expired')] });
  const r = await run({ db, body: googleBody(rtdn(4)), google: { audience: 'https://edge.test/subscription-webhook' } });
  assertEquals(r.res.status, 500);
  assertEquals(r.oidcCalls.length, 0);
  assertEquals(r.marked.length, 0);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');
});

Deno.test('Google path passes the pinned service account to the OIDC verifier', async () => {
  const db = fakeDb({ subscriptions: [googleRow()] });
  const r = await run({ db, body: googleBody(rtdn(2)) });
  assertEquals(r.oidcCalls[0], [
    'Bearer google-oidc-token',
    'https://edge.test/subscription-webhook',
    'rtdn@being.iam.gserviceaccount.com',
  ]);
});

// ---------------------------------------------------------------------------
// MAINT-765: no identifier and no free text in any log line or response body
// ---------------------------------------------------------------------------
//
// Compliance ruling: a function log carries no user id, no store transaction id or purchase
// token, no subscription row id, no per-notification id, no whole Postgres error and no error
// text - and no hashed, truncated or prefixed form of any of them. A failure is described by
// a CLOSED reason, plus a validated 5-character SQLSTATE where the database supplied one.
// The 500 response body is a fixed string for the same reason: error.message reached it.

const NOTIFICATION_UUID = 'notif-uuid-9f8e7d6c-1a2b-3c4d';
const MESSAGE_ID = 'pubsub-msg-id-8841230099';
const TOKEN_TAIL = PURCHASE_TOKEN.slice(PURCHASE_TOKEN.indexOf('-') + 1);
const SENTINEL_TEXT = `SENTINEL ${APPLE_USER} ${ORIGINAL_TXN} ${PURCHASE_TOKEN}`;

const LOG_FORBIDDEN = [
  APPLE_USER,
  GOOGLE_USER,
  APPLE_ROW_ID,
  GOOGLE_ROW_ID,
  ORIGINAL_TXN,
  PURCHASE_TOKEN,
  ORDER_ID,
  'SENTINELORDER',
  NOTIFICATION_UUID,
  MESSAGE_ID,
  'google-oidc-token',
  'rtdn@being.iam.gserviceaccount.com',
  'edge.test',
  'SENTINEL',
  'JWS signature verification failed',
  ...Array.from({ length: TOKEN_TAIL.length - 7 }, (_, i) => TOKEN_TAIL.slice(i, i + 8)),
];
/** Audit rows hold the subscription row id and the user id by design; only error text is banned. */
const AUDIT_FORBIDDEN = ['SENTINEL'];

function assertNothingForbidden(where: string, text: string, forbidden: readonly string[] = LOG_FORBIDDEN) {
  for (const f of forbidden) assert(!text.includes(f), `${where} carries ${JSON.stringify(f)}: ${text}`);
}

const DB_LEAK = {
  code: '42501',
  message: SENTINEL_TEXT,
  details: `Key (original_transaction_id)=(${PURCHASE_TOKEN}) conflicts SENTINEL`,
  hint: SENTINEL_TEXT,
};

/** Apple's data envelope with the transaction carrying the given overrides. */
const appleData = (txn: Record<string, unknown> = {}) => ({
  ...SCOPE,
  signedTransactionInfo: appleTransaction(txn),
});

interface LeakCase {
  name: string;
  /** Expected status, so a case that silently stopped reaching its branch fails. */
  status: number;
  build: () => RunOpts;
}

const LEAK_CASES: LeakCase[] = [
  // --- Apple ---
  {
    name: 'apple: applied',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow('grace')] }),
      body: appleBody('DID_RENEW', { subtype: 'BILLING_RECOVERY', uuid: NOTIFICATION_UUID }),
    }),
  },
  {
    name: 'apple: TEST notification',
    status: 200,
    build: () => ({ body: appleBody('TEST', { data: { ...SCOPE }, uuid: NOTIFICATION_UUID }) }),
  },
  {
    name: 'apple: unhandled notification type',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow()] }),
      body: appleBody('PRICE_INCREASE', { subtype: 'PENDING', uuid: NOTIFICATION_UUID }),
    }),
  },
  {
    name: 'apple: not linked (503)',
    status: 503,
    build: () => ({ body: appleBody('SUBSCRIBED', { uuid: NOTIFICATION_UUID }) }),
  },
  {
    name: 'apple: replay hit',
    status: 200,
    build: () => ({
      db: fakeDb({
        subscriptions: [appleRow('expired')],
        webhook_replay_cache: [{ source: 'apple', notification_id: NOTIFICATION_UUID }],
      }),
      body: appleBody('DID_RENEW', { uuid: NOTIFICATION_UUID }),
    }),
  },
  {
    name: 'apple: payload rejected, no signedTransactionInfo',
    status: 422,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow()] }),
      body: appleBody('EXPIRED', { data: { ...SCOPE }, uuid: NOTIFICATION_UUID }),
    }),
  },
  {
    name: 'apple: payload rejected, no originalTransactionId',
    status: 422,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow()] }),
      body: appleBody('EXPIRED', { data: appleData({ originalTransactionId: undefined }), uuid: NOTIFICATION_UUID }),
    }),
  },
  {
    name: 'apple: payload rejected, no usable expiresDate',
    status: 422,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow()] }),
      body: appleBody('EXPIRED', { data: appleData({ expiresDate: undefined }), uuid: NOTIFICATION_UUID }),
    }),
  },
  {
    name: 'apple: payload rejected, appAccountToken names another user',
    status: 422,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow()] }),
      body: appleBody('DID_RENEW', {
        data: appleData({ appAccountToken: GOOGLE_USER }),
        uuid: NOTIFICATION_UUID,
      }),
    }),
  },
  {
    name: 'apple: environment mismatch',
    status: 500,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow()] }),
      body: appleBody('DID_RENEW', { data: appleData({ environment: 'Sandbox' }), uuid: NOTIFICATION_UUID }),
    }),
  },
  {
    name: 'apple: another app',
    status: 500,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow()] }),
      body: appleBody('DID_RENEW', { data: { ...appleData(), bundleId: 'com.other.app' }, uuid: NOTIFICATION_UUID }),
    }),
  },
  {
    name: 'apple: lookup error whose details quote the transaction id',
    status: 500,
    build: () => {
      const db = fakeDb({ subscriptions: [appleRow()] });
      db.failOn('subscriptions', 'select', { ...DB_LEAK, details: `Key (original_transaction_id)=(${ORIGINAL_TXN}) SENTINEL` });
      return { db, body: appleBody('DID_RENEW', { uuid: NOTIFICATION_UUID }) };
    },
  },
  {
    name: 'apple: update error with sentinel text',
    status: 500,
    build: () => {
      const db = fakeDb({ subscriptions: [appleRow()] });
      db.failOn('subscriptions', 'update', DB_LEAK);
      return { db, body: appleBody('EXPIRED', { uuid: NOTIFICATION_UUID }) };
    },
  },
  {
    name: 'apple: verifier throws with sentinel text',
    status: 500,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow()] }),
      body: appleBody('EXPIRED', { uuid: NOTIFICATION_UUID }),
      appleVerifyError: new Error(SENTINEL_TEXT),
    }),
  },
  {
    name: 'apple: replay-cache select error with sentinel text',
    status: 500,
    build: () => {
      const db = fakeDb({ subscriptions: [appleRow()] });
      db.failOn('webhook_replay_cache', 'select', DB_LEAK);
      return { db, body: appleBody('EXPIRED', { uuid: NOTIFICATION_UUID }) };
    },
  },
  {
    name: 'apple: replay-cache insert error with sentinel text',
    status: 500,
    build: () => {
      const db = fakeDb({ subscriptions: [appleRow()] });
      db.failOn('webhook_replay_cache', 'insert', DB_LEAK);
      return { db, body: appleBody('EXPIRED', { uuid: NOTIFICATION_UUID }) };
    },
  },
  {
    name: 'apple: replay-cache concurrent insert (23505)',
    status: 200,
    build: () => {
      const db = fakeDb({ subscriptions: [appleRow()] });
      db.failOn('webhook_replay_cache', 'insert', { ...DB_LEAK, code: '23505' });
      return { db, body: appleBody('EXPIRED', { uuid: NOTIFICATION_UUID }) };
    },
  },
  {
    name: 'apple: audit RPC failure with sentinel message, hint and details',
    status: 200,
    build: () => {
      const db = fakeDb({ subscriptions: [appleRow()] });
      db.failRpc('log_subscription_event', DB_LEAK);
      return { db, body: appleBody('EXPIRED', { uuid: NOTIFICATION_UUID }) };
    },
  },
  // --- Google ---
  {
    name: 'google: applied',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [googleRow()] }),
      body: googleBody(rtdn(13), { messageId: MESSAGE_ID }),
    }),
  },
  {
    name: 'google: not linked (503)',
    status: 503,
    build: () => ({ body: googleBody(rtdn(4), { messageId: MESSAGE_ID }) }),
  },
  {
    name: 'google: unresolved RTDN abandoned',
    status: 200,
    build: () => ({
      body: googleBody(rtdn(4), {
        messageId: MESSAGE_ID,
        publishTime: new Date(NOW - RTDN_MAX_AGE_MS - 1000).toISOString(),
      }),
    }),
  },
  {
    name: 'google: replay hit',
    status: 200,
    build: () => ({
      db: fakeDb({
        subscriptions: [googleRow('expired')],
        webhook_replay_cache: [{ source: 'google', notification_id: MESSAGE_ID }],
      }),
      body: googleBody(rtdn(4), { messageId: MESSAGE_ID }),
    }),
  },
  {
    name: 'google: unhandled notification type',
    status: 200,
    build: () => ({ body: googleBody(rtdn(8), { messageId: MESSAGE_ID }) }),
  },
  {
    name: 'google: subscriptionNotification with no purchaseToken',
    status: 200,
    build: () => ({ body: googleBody(rtdn(2, null), { messageId: MESSAGE_ID }) }),
  },
  {
    name: 'google: non-subscription message',
    status: 200,
    build: () => ({
      body: googleBody(voided({ productType: 2 }), { messageId: MESSAGE_ID }),
    }),
  },
  {
    name: 'google: undecodable message data',
    status: 200,
    build: () => ({ body: googleBody(`%%% ${PURCHASE_TOKEN} %%%`, { messageId: MESSAGE_ID }) }),
  },
  {
    name: 'google: lookup error whose details quote the purchase token',
    status: 500,
    build: () => {
      const db = fakeDb({ subscriptions: [googleRow()] });
      db.failOn('subscriptions', 'select', DB_LEAK);
      return { db, body: googleBody(rtdn(2), { messageId: MESSAGE_ID }) };
    },
  },
  {
    name: 'google: update error with sentinel text',
    status: 500,
    build: () => {
      const db = fakeDb({ subscriptions: [googleRow()] });
      db.failOn('subscriptions', 'update', DB_LEAK);
      return { db, body: googleBody(rtdn(2), { messageId: MESSAGE_ID }) };
    },
  },
  {
    name: 'google: OIDC verification throws with sentinel text',
    status: 500,
    build: () => ({
      body: googleBody(rtdn(13), { messageId: MESSAGE_ID }),
      oidcError: new Error(SENTINEL_TEXT),
    }),
  },
  {
    name: 'google: audience unset',
    status: 500,
    build: () => ({
      body: googleBody(rtdn(13), { messageId: MESSAGE_ID }),
      google: { serviceAccount: 'rtdn@being.iam.gserviceaccount.com' },
    }),
  },
  {
    name: 'google: replay-cache select error with sentinel text',
    status: 500,
    build: () => {
      const db = fakeDb({ subscriptions: [googleRow()] });
      db.failOn('webhook_replay_cache', 'select', DB_LEAK);
      return { db, body: googleBody(rtdn(13), { messageId: MESSAGE_ID }) };
    },
  },
  {
    name: 'google: replay-cache insert error with sentinel text',
    status: 500,
    build: () => {
      const db = fakeDb({ subscriptions: [googleRow()] });
      db.failOn('webhook_replay_cache', 'insert', DB_LEAK);
      return { db, body: googleBody(rtdn(13), { messageId: MESSAGE_ID }) };
    },
  },
  {
    name: 'google: audit RPC failure with sentinel message, hint and details',
    status: 200,
    build: () => {
      const db = fakeDb({ subscriptions: [googleRow()] });
      db.failRpc('log_subscription_event', DB_LEAK);
      return { db, body: googleBody(rtdn(13), { messageId: MESSAGE_ID }) };
    },
  },
  // --- DEBUG-751: ordering, optimistic write, voided purchases, package check ---
  {
    name: 'google: CANCELED applied (status untouched)',
    status: 200,
    build: () => ({ db: fakeDb({ subscriptions: [googleRow()] }), body: googleBody(rtdn(3), { messageId: MESSAGE_ID }) }),
  },
  {
    name: 'google: stale notification',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [{ ...googleRow('expired'), last_store_event_at: new Date(T3).toISOString() }] }),
      body: googleBody(rtdn(4, PURCHASE_TOKEN, { eventTimeMillis: String(T1) }), { messageId: MESSAGE_ID }),
    }),
  },
  {
    name: 'google: optimistic write lost the race (503)',
    status: 503,
    build: () => {
      const db = fakeDb({ subscriptions: [googleRow()] });
      db.beforeUpdate('subscriptions', () => { db.tables.subscriptions[0].updated_at = '2026-10-05T00:00:09.000Z'; });
      return { db, body: googleBody(rtdn(13), { messageId: MESSAGE_ID }) };
    },
  },
  {
    name: 'google: no usable eventTimeMillis',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [googleRow()] }),
      body: googleBody(rtdn(13, PURCHASE_TOKEN, { eventTimeMillis: `x ${PURCHASE_TOKEN}` }), { messageId: MESSAGE_ID }),
    }),
  },
  {
    name: 'google: package mismatch on a subscriptionNotification',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [googleRow()] }),
      body: googleBody(rtdn(13, PURCHASE_TOKEN, { packageName: `com.other.${PURCHASE_TOKEN}` }), { messageId: MESSAGE_ID }),
    }),
  },
  {
    name: 'google: voided purchase applied',
    status: 200,
    build: () => ({ db: fakeDb({ subscriptions: [googleRow()] }), body: googleBody(voided(), { messageId: MESSAGE_ID }) }),
  },
  {
    name: 'google: voided purchase, stale',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [{ ...googleRow(), last_store_event_at: new Date(T3).toISOString() }] }),
      body: googleBody(voided({}, { eventTimeMillis: String(T1) }), { messageId: MESSAGE_ID }),
    }),
  },
  {
    name: 'google: voided purchase, no row yet (503)',
    status: 503,
    build: () => ({ body: googleBody(voided(), { messageId: MESSAGE_ID }) }),
  },
  {
    name: 'google: voided purchase, unresolved and abandoned',
    status: 200,
    build: () => ({
      body: googleBody(voided(), { messageId: MESSAGE_ID, publishTime: new Date(NOW - RTDN_MAX_AGE_MS - 1000).toISOString() }),
    }),
  },
  {
    name: 'google: voided purchase with a malformed token carrying sentinel text',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [googleRow()] }),
      body: googleBody(voided({ purchaseToken: `bad token ${PURCHASE_TOKEN}` }), { messageId: MESSAGE_ID }),
    }),
  },
  {
    name: 'google: voided purchase, package mismatch',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [googleRow()] }),
      body: googleBody(voided({}, { packageName: `com.other.${PURCHASE_TOKEN}` }), { messageId: MESSAGE_ID }),
    }),
  },
  {
    name: 'google: voided purchase, update error with sentinel text',
    status: 500,
    build: () => {
      const db = fakeDb({ subscriptions: [googleRow()] });
      db.failOn('subscriptions', 'update', DB_LEAK);
      return { db, body: googleBody(voided(), { messageId: MESSAGE_ID }) };
    },
  },
  {
    name: 'apple: stale notification',
    status: 200,
    build: () => ({
      db: fakeDb({ subscriptions: [{ ...appleRow('expired'), last_store_event_at: new Date(T3).toISOString() }] }),
      body: appleBody('SUBSCRIBED', { signedDate: T1, uuid: NOTIFICATION_UUID }),
    }),
  },
  {
    name: 'apple: optimistic write lost the race (503)',
    status: 503,
    build: () => {
      const db = fakeDb({ subscriptions: [appleRow()] });
      db.beforeUpdate('subscriptions', () => { db.tables.subscriptions[0].updated_at = '2026-10-05T00:00:09.000Z'; });
      return { db, body: appleBody('EXPIRED', { uuid: NOTIFICATION_UUID }) };
    },
  },
  {
    name: 'apple: payload rejected, no signedDate',
    status: 422,
    build: () => ({
      db: fakeDb({ subscriptions: [appleRow()] }),
      body: appleBody('EXPIRED', { signedDate: null, uuid: NOTIFICATION_UUID }),
    }),
  },
  // --- dispatch ---
  {
    name: 'unknown webhook format',
    status: 400,
    build: () => ({ body: { hello: 'world', note: SENTINEL_TEXT } }),
  },
  {
    name: 'malformed JSON body quoting identifiers',
    status: 500,
    build: () => ({ rawBody: `{"signedPayload": ${NOTIFICATION_UUID} ${PURCHASE_TOKEN}` }),
  },
];

for (const c of LEAK_CASES) {
  Deno.test(`no identifier or error text in any log line, audit row or response: ${c.name}`, async () => {
    const lines: string[] = [];
    const opts = c.build();
    const r = await run({ ...opts, capture: lines });
    assertEquals(r.res.status, c.status, `${c.name} no longer reaches its branch`);
    // Non-vacuity: every one of these paths logs, so an empty capture cannot pass for a clean one.
    assert(lines.length > 0, 'nothing was captured');
    for (const line of lines) assertNothingForbidden('a log line', line);
    assertNothingForbidden('an audit row', JSON.stringify(r.db.rpcCalls), AUDIT_FORBIDDEN);
    assertNothingForbidden('a response body', JSON.stringify(r.body), LOG_FORBIDDEN);
  });
}

Deno.test('control: the capture sees a user id in an Error and a notification id nested five levels deep', async () => {
  const lines: string[] = [];
  await captureConsole(() => {
    console.error(
      'probe',
      new Error(`x ${APPLE_USER}`),
      { nested: { a: { b: { c: { d: NOTIFICATION_UUID } } } } },
    );
  }, lines);
  assert(lines.some((l) => l.includes(APPLE_USER)), 'capture missed a logged user id');
  assert(lines.some((l) => l.includes(NOTIFICATION_UUID)), 'capture missed a deeply nested notification id');
});

Deno.test('control: the forbidden-string matcher throws on hand-built leaky lines', () => {
  for (
    const leaky of [
      `user ${APPLE_USER}`,
      `row ${GOOGLE_ROW_ID}`,
      `Replay detected, no-op: ${MESSAGE_ID}`,
      `Error: ${SENTINEL_TEXT}`,
      `token fragment ${TOKEN_TAIL.slice(3, 11)}`,
    ]
  ) {
    let threw = false;
    try {
      assertNothingForbidden('a log line', leaky);
    } catch {
      threw = true;
    }
    assert(threw, `matcher accepted ${JSON.stringify(leaky)}`);
  }
});

// ---------------------------------------------------------------------------
// The response bodies: a fixed 500, a closed-reason 422
// ---------------------------------------------------------------------------

Deno.test('the 500 body is the fixed string, whatever the error said (founder decision)', async () => {
  for (
    const opts of [
      { db: (() => { const d = fakeDb({ subscriptions: [appleRow()] }); d.failOn('subscriptions', 'update', DB_LEAK); return d; })(), body: appleBody('EXPIRED') },
      { body: googleBody(rtdn(13)), oidcError: new Error(SENTINEL_TEXT) },
      { appleVerifyError: new Error(SENTINEL_TEXT), body: appleBody('EXPIRED') },
      { body: googleBody(rtdn(13)), google: { serviceAccount: 'sa@x.test' } },
      { rawBody: '{"signedPayload": nope' },
    ] as RunOpts[]
  ) {
    const r = await run(opts);
    assertEquals(r.res.status, 500);
    assertEquals(r.body, { error: 'internal_error' });
  }
});

for (
  const [label, data, reason] of [
    ['no signedTransactionInfo', { ...SCOPE }, 'missing_signed_transaction_info'],
    ['no originalTransactionId', appleData({ originalTransactionId: undefined }), 'missing_original_transaction_id'],
    ['no usable expiresDate', appleData({ expiresDate: undefined }), 'unusable_expires_date'],
    ['appAccountToken mismatch', appleData({ appAccountToken: GOOGLE_USER }), 'app_account_token_mismatch'],
  ] as Array<[string, Record<string, unknown>, string]>
) {
  Deno.test(`the 422 body carries the closed reason, never a message: ${label}`, async () => {
    const r = await run({ db: fakeDb({ subscriptions: [appleRow()] }), body: appleBody('DID_RENEW', { data }) });
    assertEquals(r.res.status, 422);
    assertEquals(r.body, { error: 'payload_rejected', reason });
  });
}

Deno.test('the 503 body is unchanged', async () => {
  const r = await run({ body: googleBody(rtdn(4)) });
  assertEquals(r.res.status, 503);
  assertEquals(r.body, { error: 'subscription_not_linked', retry: true });
});

// What the logs SAY, pinned positively so "log nothing useful" is as visible as a leak.

Deno.test('a failed update logs a reason and the SQLSTATE, and the catch-all logs the same', async () => {
  const lines: string[] = [];
  const db = fakeDb({ subscriptions: [appleRow()] });
  db.failOn('subscriptions', 'update', DB_LEAK);
  await run({ db, body: appleBody('EXPIRED'), capture: lines });
  const failed = lines.filter((l) => l.includes('Failed to update subscription'));
  assertEquals(failed.length, 1);
  assert(failed[0].includes('db_error') && failed[0].includes('42501'), failed[0]);
  const caught = lines.filter((l) => l.includes('Error processing webhook'));
  assertEquals(caught.length, 1);
  assert(caught[0].includes('db_error') && caught[0].includes('42501'), caught[0]);
});

Deno.test('a non-SQLSTATE code is not logged', async () => {
  const lines: string[] = [];
  const db = fakeDb({ subscriptions: [appleRow()] });
  db.failOn('subscriptions', 'update', { code: 'SENTINEL_CODE', message: 'x' });
  await run({ db, body: appleBody('EXPIRED'), capture: lines });
  assert(lines.length > 0 && lines.every((l) => !l.includes('SENTINEL_CODE')), lines.join('\n'));
});

Deno.test('a deferred notification logs the closed reason', async () => {
  const lines: string[] = [];
  await run({ body: appleBody('SUBSCRIBED'), capture: lines });
  assert(lines.some((l) => l.includes('Deferred for redelivery') && l.includes('subscription_not_linked')), lines.join('\n'));
});

Deno.test('a rejected payload logs the closed reason', async () => {
  const lines: string[] = [];
  await run({ db: fakeDb({ subscriptions: [appleRow()] }), body: appleBody('EXPIRED', { data: { ...SCOPE } }), capture: lines });
  assert(lines.some((l) => l.includes('Rejected') && l.includes('missing_signed_transaction_info')), lines.join('\n'));
});

Deno.test('a store notification type is logged, sanitised, and never a free-text one', async () => {
  const lines: string[] = [];
  await run({ db: fakeDb({ subscriptions: [appleRow()] }), body: appleBody('DID_RENEW'), capture: lines });
  assert(lines.some((l) => l.includes('Processing') && l.includes('DID_RENEW')));
  const hostile: string[] = [];
  await run({ body: googleBody(rtdn(8)), capture: hostile });
  assert(hostile.some((l) => l.includes('Unhandled notification') && /\b8\b/.test(l)), hostile.join('\n'));
});

// ---------------------------------------------------------------------------
// webhookFailureReason: closed reasons, validated SQLSTATE
// ---------------------------------------------------------------------------

Deno.test('webhookFailureReason: the table', () => {
  const impostor = new Error(SENTINEL_TEXT);
  impostor.name = 'SubscriptionNotLinkedError';
  const custom = new Error(SENTINEL_TEXT);
  custom.name = 'SomethingElseError';
  const pgErrorLike = Object.assign(new Error(SENTINEL_TEXT), { code: '23514' });
  const rows: Array<[string, unknown, { reason: string; code?: string }]> = [
    ['not linked (apple)', new SubscriptionNotLinkedError('apple'), { reason: 'subscription_not_linked' }],
    ['not linked (google)', new SubscriptionNotLinkedError('google'), { reason: 'subscription_not_linked' }],
    ['rejected: unusable_expires_date', new WebhookPayloadRejectedError('unusable_expires_date'), { reason: 'unusable_expires_date' }],
    ['rejected: app_account_token_mismatch', new WebhookPayloadRejectedError('app_account_token_mismatch'), { reason: 'app_account_token_mismatch' }],
    ['rejected: missing_signed_date', new WebhookPayloadRejectedError('missing_signed_date'), { reason: 'missing_signed_date' }],
    ['write race (DEBUG-751)', new SubscriptionWriteRaceError(), { reason: 'subscription_write_race' }],
    ['a PostgrestError-shaped plain object', { ...DB_LEAK, code: '23505' }, { reason: 'db_error', code: '23505' }],
    ['an Error carrying a SQLSTATE (checked before instanceof Error)', pgErrorLike, { reason: 'db_error', code: '23514' }],
    ['an alphabetic SQLSTATE', { code: '0A000', message: SENTINEL_TEXT }, { reason: 'db_error', code: '0A000' }],
    ['a code that is not a SQLSTATE', { code: 'SENTINEL_CODE', message: 'x' }, { reason: 'db_error' }],
    ['a lower-case five-character code', { code: '2350a', message: 'x' }, { reason: 'db_error' }],
    ['a six-character code', { code: '235050', message: 'x' }, { reason: 'db_error' }],
    ['a numeric code', { code: 23505, message: 'x' }, { reason: 'unknown' }],
    ['an Error with a non-SQLSTATE string code', Object.assign(new Error('x'), { code: 'ECONNREFUSED' }), { reason: 'db_error' }],
    ['a plain Error', new Error(SENTINEL_TEXT), { reason: 'Error' }],
    ['a TypeError', new TypeError(SENTINEL_TEXT), { reason: 'TypeError' }],
    ['a SyntaxError', new SyntaxError(SENTINEL_TEXT), { reason: 'SyntaxError' }],
    ['a RangeError', new RangeError(SENTINEL_TEXT), { reason: 'RangeError' }],
    ['an Error borrowing a webhook class NAME is not that class', impostor, { reason: 'unknown' }],
    ['an Error with a name outside the allowlist', custom, { reason: 'unknown' }],
    ['a string', SENTINEL_TEXT, { reason: 'unknown' }],
    ['null', null, { reason: 'unknown' }],
    ['undefined', undefined, { reason: 'unknown' }],
    ['a plain object', { message: SENTINEL_TEXT }, { reason: 'unknown' }],
  ];
  for (const [label, input, expected] of rows) {
    const got = webhookFailureReason(input);
    assertEquals(got, expected, label);
    assert(!JSON.stringify(got).includes('SENTINEL'), `${label}: the result carries error text`);
  }
});

Deno.test('WebhookPayloadRejectedError carries a closed reason and keeps a message that is never logged', () => {
  const err = new WebhookPayloadRejectedError('missing_original_transaction_id');
  assertEquals(err.reason, 'missing_original_transaction_id');
  assertEquals(err.name, 'WebhookPayloadRejectedError');
  assert(err instanceof Error && err.message.length > 0);
});

// ---------------------------------------------------------------------------
// DEBUG-751 - helpers
// ---------------------------------------------------------------------------

const iso = (ms: number) => new Date(ms).toISOString();
const auditTypes = (db: FakeDb) => db.rpcCalls.map((c) => c.args.p_event_type);
const watermarkOf = (db: FakeDb, id: string) => db.tables.subscriptions.find((r) => r.id === id)?.last_store_event_at;

/** A Google subscription message at a given store event time. */
const gmsg = (type: number, eventMs: number, messageId: string) =>
  googleBody(rtdn(type, PURCHASE_TOKEN, { eventTimeMillis: String(eventMs) }), { messageId });
/** An Apple notification at a given signedDate. */
const amsg = (type: string, signedDate: number, uuid: string, subtype?: string) =>
  appleBody(type, { signedDate, uuid, subtype });

// ---------------------------------------------------------------------------
// AC3 - the monotonic guard: an older store event never undoes a newer one
// ---------------------------------------------------------------------------

Deno.test('AC3: Google EXPIRED at T2 then a late PURCHASED from T1 is acknowledged as stale and not applied', async () => {
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  const first = await run({ db, body: gmsg(13, T2, 'm-expired') });
  assertEquals(first.res.status, 200);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');
  assertEquals(watermarkOf(db, GOOGLE_ROW_ID), iso(T2));

  const second = await run({ db, body: gmsg(4, T1, 'm-purchased-late') });
  assertEquals(second.res.status, 200);
  assertEquals(second.body, { success: true, ignored: 'stale_notification' });
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');
  assertEquals(watermarkOf(db, GOOGLE_ROW_ID), iso(T2));
  assertEquals(db.updates.length, 1);
  assertEquals(auditTypes(db), ['subscription_expired']);
  // Acknowledged means marked: redelivering the same stale bytes cannot change the answer.
  assertEquals(db.tables.webhook_replay_cache.map((r) => r.notification_id), ['m-expired', 'm-purchased-late']);
});

Deno.test('AC3: Apple EXPIRED at T2 then a late SUBSCRIBED from T1 is acknowledged as stale and not applied', async () => {
  const db = fakeDb({ subscriptions: [appleRow('active')] });
  assertEquals((await run({ db, body: amsg('EXPIRED', T2, 'u-expired') })).res.status, 200);
  assertEquals(statusOf(db, APPLE_ROW_ID), 'expired');
  assertEquals(watermarkOf(db, APPLE_ROW_ID), iso(T2));

  const late = await run({ db, body: amsg('SUBSCRIBED', T1, 'u-subscribed-late') });
  assertEquals(late.res.status, 200);
  assertEquals(late.body, { success: true, ignored: 'stale_notification' });
  assertEquals(statusOf(db, APPLE_ROW_ID), 'expired');
  assertEquals(db.updates.length, 1);
  assertEquals(auditTypes(db), ['subscription_expired']);
  assertEquals(late.marked.length, 2);
});

// The converse is the one that matters for users: a late "bad" event must not downgrade a
// subscriber who has since renewed.
for (
  const [platform, newer, olders] of [
    ['google', [2, 4], [13, 5, 12, 10]],
    ['apple', ['DID_RENEW', 'SUBSCRIBED'], ['EXPIRED', 'REVOKE', 'REFUND', 'GRACE_PERIOD_EXPIRED', 'DID_FAIL_TO_RENEW']],
  ] as Array<[string, Array<number | string>, Array<number | string>]>
) {
  for (const n of newer) {
    for (const o of olders) {
      Deno.test(`AC3 (converse): ${platform} ${o} from T2 after ${n} from T3 does not downgrade`, async () => {
        const db = fakeDb({ subscriptions: [platform === 'google' ? googleRow('expired') : appleRow('expired')] });
        const id = platform === 'google' ? GOOGLE_ROW_ID : APPLE_ROW_ID;
        const first = platform === 'google'
          ? await run({ db, body: gmsg(n as number, T3, 'm-new') })
          : await run({ db, body: amsg(n as string, T3, 'u-new') });
        assertEquals(first.res.status, 200);
        assertEquals(statusOf(db, id), 'active');
        const late = platform === 'google'
          ? await run({ db, body: gmsg(o as number, T2, 'm-old') })
          : await run({ db, body: amsg(o as string, T2, 'u-old') });
        assertEquals(late.res.status, 200);
        assertEquals(late.body.ignored, 'stale_notification');
        assertEquals(statusOf(db, id), 'active');
        assertEquals(watermarkOf(db, id), iso(T3));
        assertEquals(db.updates.length, 1);
      });
    }
  }
}

Deno.test('AC3: an event at exactly the watermark is a redelivery and applies (strictly older only is stale)', async () => {
  const db = fakeDb({ subscriptions: [{ ...googleRow('grace'), last_store_event_at: iso(T2) }] });
  const r = await run({ db, body: gmsg(2, T2, 'm-same-instant') });
  assertEquals(r.res.status, 200);
  assertEquals(r.body, { success: true });
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'active');
});

Deno.test('AC3: deferred-then-ordered - an early PURCHASED is 503, a newer EXPIRED lands, the redelivered PURCHASED is stale (google)', async () => {
  const db = fakeDb();
  const early = await run({ db, body: gmsg(4, T1, 'm-purchased') });
  assertEquals(early.res.status, 503);
  assertEquals(early.marked.length, 0);

  db.tables.subscriptions.push(googleRow('active'));
  const newer = await run({ db, body: gmsg(13, T2, 'm-expired') });
  assertEquals(newer.res.status, 200);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');

  const redelivered = await run({ db, body: gmsg(4, T1, 'm-purchased') });
  assertEquals(redelivered.res.status, 200);
  assertEquals(redelivered.body.ignored, 'stale_notification');
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');
  assertEquals(db.tables.webhook_replay_cache.length, 2);
});

Deno.test('AC3: deferred-then-ordered - the same sequence on Apple', async () => {
  const db = fakeDb();
  assertEquals((await run({ db, body: amsg('SUBSCRIBED', T1, 'u-sub') })).res.status, 503);
  db.tables.subscriptions.push(appleRow('active'));
  assertEquals((await run({ db, body: amsg('EXPIRED', T2, 'u-exp') })).res.status, 200);
  const redelivered = await run({ db, body: amsg('SUBSCRIBED', T1, 'u-sub') });
  assertEquals(redelivered.body.ignored, 'stale_notification');
  assertEquals(statusOf(db, APPLE_ROW_ID), 'expired');
});

Deno.test('AC3: a watermark an hour in the FUTURE is ignored and the event applies, replacing it', async () => {
  const future = iso(NOW + 3_600_000);
  for (const [db, body, id] of [
    [fakeDb({ subscriptions: [{ ...googleRow('active'), last_store_event_at: future }] }), gmsg(13, T1, 'm-1'), GOOGLE_ROW_ID],
    [fakeDb({ subscriptions: [{ ...appleRow('active'), last_store_event_at: future }] }), amsg('EXPIRED', T1, 'u-1'), APPLE_ROW_ID],
  ] as Array<[FakeDb, unknown, string]>) {
    const r = await run({ db, body });
    assertEquals(r.res.status, 200);
    assertEquals(r.body, { success: true });
    assertEquals(statusOf(db, id), 'expired');
    assertEquals(watermarkOf(db, id), iso(T1));
  }
});

Deno.test('AC3: a stale notification logs only the sanitised type and writes no audit row', async () => {
  const lines: string[] = [];
  const db = fakeDb({ subscriptions: [{ ...googleRow('expired'), last_store_event_at: iso(T3) }] });
  const r = await run({ db, body: gmsg(4, T1, 'm-stale'), capture: lines });
  assertEquals(r.body.ignored, 'stale_notification');
  assertEquals(db.rpcCalls.length, 0);
  assert(lines.some((l) => l.includes('Stale notification') && /\b4\b/.test(l)), lines.join('\n'));
});

// ---------------------------------------------------------------------------
// AC3 - the optimistic write
// ---------------------------------------------------------------------------

Deno.test('AC3: the update is conditioned on id AND the updated_at that was read', async () => {
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  await run({ db, body: gmsg(13, T2, 'm-1') });
  assertEquals(db.updates[0].filters, [['id', GOOGLE_ROW_ID], ['updated_at', ROW_UPDATED_AT]]);
});

Deno.test('AC3: a row whose updated_at is NULL is conditioned with IS NULL, not eq(null)', async () => {
  const db = fakeDb({ subscriptions: [{ ...googleRow('active'), updated_at: null as unknown as string }] });
  const r = await run({ db, body: gmsg(13, T2, 'm-1') });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');
});

for (
  const [platform, body, id] of [
    ['google', gmsg(13, T2, 'm-race'), GOOGLE_ROW_ID],
    ['apple', amsg('EXPIRED', T2, 'u-race'), APPLE_ROW_ID],
  ] as Array<[string, unknown, string]>
) {
  Deno.test(`AC3: ${platform}: a concurrent write between read and update is a retryable 503, not marked, no audit row`, async () => {
    const db = fakeDb({ subscriptions: [platform === 'google' ? googleRow('active') : appleRow('active')] });
    db.beforeUpdate('subscriptions', () => {
      db.tables.subscriptions[0].updated_at = '2026-10-05T00:00:07.000Z';
    });
    const r = await run({ db, body });
    assertEquals(r.res.status, 503);
    assertEquals(r.body, { error: 'subscription_write_race', retry: true });
    assertEquals(r.marked.length, 0);
    assertEquals(statusOf(db, id), 'active');
    assertEquals(db.rpcCalls.length, 0);

    // The store redelivers; with no concurrent writer the same message now applies.
    const again = await run({ db, body });
    assertEquals(again.res.status, 200);
    assertEquals(statusOf(db, id), 'expired');
    assertEquals(again.marked.length, 1);
  });
}

Deno.test('AC3: a lost race logs its closed reason', async () => {
  const lines: string[] = [];
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  db.beforeUpdate('subscriptions', () => {
    db.tables.subscriptions[0].updated_at = '2026-10-05T00:00:07.000Z';
  });
  await run({ db, body: gmsg(13, T2, 'm-race'), capture: lines });
  assert(lines.some((l) => l.includes('Deferred for redelivery') && l.includes('subscription_write_race')), lines.join('\n'));
});

// ---------------------------------------------------------------------------
// AC3 - store event time is required to order anything
// ---------------------------------------------------------------------------

for (
  const [label, signedDate] of [
    ['missing', null],
    ['a string', String(T2)],
    ['not finite', 'NaN'],
  ] as Array<[string, string | null]>
) {
  Deno.test(`AC3: a handled Apple type with a ${label} signedDate is a 422 (missing_signed_date), not marked, no write`, async () => {
    const db = fakeDb({ subscriptions: [appleRow('active')] });
    const r = await run({ db, body: appleBody('EXPIRED', { signedDate }) });
    assertEquals(r.res.status, 422);
    assertEquals(r.body, { error: 'payload_rejected', reason: 'missing_signed_date' });
    assertEquals(r.marked.length, 0);
    assertEquals(db.updates.length, 0);
  });
}

Deno.test('AC3: an UNHANDLED Apple type or a TEST needs no signedDate', async () => {
  const db = fakeDb({ subscriptions: [appleRow('active')] });
  const a = await run({ db, body: appleBody('PRICE_INCREASE', { signedDate: null }) });
  assertEquals(a.body.ignored, 'unhandled_notification_type');
  const t = await run({ db, body: appleBody('TEST', { signedDate: null, data: { ...SCOPE } }) });
  assertEquals(t.body.ignored, 'apple_test_notification');
});

for (
  const [label, value] of [
    ['absent', undefined],
    ['not a number', 'yesterday'],
    ['empty', ''],
    ['zero', '0'],
    ['more than five minutes in the future', String(NOW + 6 * 60_000)],
  ] as Array<[string, string | undefined]>
) {
  Deno.test(`AC3: a Google message with an eventTimeMillis that is ${label} is acknowledged, marked, and writes nothing`, async () => {
    const db = fakeDb({ subscriptions: [googleRow('active')] });
    const r = await run({ db, body: googleBody(rtdn(13, PURCHASE_TOKEN, { eventTimeMillis: value }), { messageId: 'm-1' }) });
    assertEquals(r.res.status, 200);
    assertEquals(r.body.ignored, 'missing_required_fields');
    assertEquals(r.marked.length, 1);
    assertEquals(db.updates.length, 0);
    assertEquals(statusOf(db, GOOGLE_ROW_ID), 'active');
  });
}

Deno.test('AC3: a Google eventTimeMillis a little ahead of our clock (within 5 minutes) is accepted', async () => {
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  const r = await run({ db, body: gmsg(13, NOW + 4 * 60_000, 'm-skew') });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');
});

// ---------------------------------------------------------------------------
// AC2 - mappings, end to end through the handler
// ---------------------------------------------------------------------------

Deno.test('AC2: Google CANCELED on an active row leaves it active, audits subscription_cancelled, stamps the watermark', async () => {
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  const r = await run({ db, body: gmsg(3, T2, 'm-cancel') });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'active');
  assertEquals('status' in db.updates[0].patch, false);
  assertEquals(watermarkOf(db, GOOGLE_ROW_ID), iso(T2));
  assertEquals(auditTypes(db), ['subscription_cancelled']);
});

Deno.test('AC2: Google ON_HOLD and PAUSED remove access (expired), with their audit types', async () => {
  const onHold = fakeDb({ subscriptions: [googleRow('active')] });
  await run({ db: onHold, body: gmsg(5, T2, 'm-hold') });
  assertEquals(statusOf(onHold, GOOGLE_ROW_ID), 'expired');
  assertEquals(auditTypes(onHold), ['payment_failed']);

  const paused = fakeDb({ subscriptions: [googleRow('active')] });
  await run({ db: paused, body: gmsg(10, T2, 'm-pause') });
  assertEquals(statusOf(paused, GOOGLE_ROW_ID), 'expired');
  assertEquals(auditTypes(paused), ['subscription_expired']);
});

Deno.test('AC2: Google RESTARTED does not touch status and audits subscription_restored', async () => {
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  const r = await run({ db, body: gmsg(7, T2, 'm-restart') });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'active');
  assertEquals(auditTypes(db), ['subscription_restored']);
});

// ---------------------------------------------------------------------------
// DEBUG-772 - status from signed state, bounded grace, refunds of older transactions
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;
/** A renewal-info JWS (stub-decoded JSON) bound to the fixture transaction. */
const renewalInfo = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ environment: 'Production', originalTransactionId: ORIGINAL_TXN, ...over });
/** An Apple notification whose signed transaction (and optionally renewal info) is given. */
const amsgWith = (
  type: string,
  uuid: string,
  txn: Record<string, unknown>,
  opts: { subtype?: string; renewal?: string; signedDate?: number } = {},
) =>
  appleBody(type, {
    uuid,
    subtype: opts.subtype,
    signedDate: opts.signedDate ?? T2,
    data: {
      ...SCOPE,
      signedTransactionInfo: appleTransaction(txn),
      ...(opts.renewal ? { signedRenewalInfo: opts.renewal } : {}),
    },
  });
const graceEndOf = (db: FakeDb, id: string) => db.tables.subscriptions.find((r) => r.id === id)?.grace_period_end;
const endOf = (db: FakeDb, id: string) => db.tables.subscriptions.find((r) => r.id === id)?.subscription_end_date;

Deno.test('DEBUG-772 AC1: Apple DID_FAIL_TO_RENEW in billing retry with no grace period is expired, whatever the subtype', async () => {
  for (const subtype of [undefined, 'GRACE_PERIOD']) {
    const db = fakeDb({ subscriptions: [appleRow('active')] });
    const r = await run({
      db,
      body: amsgWith('DID_FAIL_TO_RENEW', `u-${subtype}`, { expiresDate: String(NOW - 2 * DAY_MS) }, {
        subtype,
        renewal: renewalInfo({ isInBillingRetryPeriod: true }),
      }),
    });
    assertEquals(r.res.status, 200);
    assertEquals(statusOf(db, APPLE_ROW_ID), 'expired', `subtype ${subtype}`);
    assertEquals(graceEndOf(db, APPLE_ROW_ID), null);
    assertEquals(auditTypes(db), ['payment_failed']);
  }
});

Deno.test('DEBUG-772 AC2: Apple DID_FAIL_TO_RENEW inside a signed grace period is grace with that end written', async () => {
  const db = fakeDb({ subscriptions: [appleRow('active')] });
  const graceEnd = NOW + 14 * DAY_MS;
  const r = await run({
    db,
    body: amsgWith('DID_FAIL_TO_RENEW', 'u-grace', { expiresDate: String(NOW - 2 * DAY_MS) }, {
      subtype: 'GRACE_PERIOD',
      renewal: renewalInfo({ isInBillingRetryPeriod: true, gracePeriodExpiresDate: graceEnd }),
    }),
  });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, APPLE_ROW_ID), 'grace');
  assertEquals(graceEndOf(db, APPLE_ROW_ID), iso(graceEnd));
});

Deno.test('DEBUG-772 AC2: a DID_FAIL_TO_RENEW with no signedRenewalInfo is expired, never an unbounded grace', async () => {
  const db = fakeDb({ subscriptions: [appleRow('active')] });
  await run({
    db,
    body: amsgWith('DID_FAIL_TO_RENEW', 'u-no-renewal', { expiresDate: String(NOW - DAY_MS) }, { subtype: 'GRACE_PERIOD' }),
  });
  assertEquals(statusOf(db, APPLE_ROW_ID), 'expired');
  assertEquals(graceEndOf(db, APPLE_ROW_ID), null);
});

Deno.test('DEBUG-772: renewal info bound to a different transaction or environment is a 422, never applied or marked', async () => {
  for (const renewal of [renewalInfo({ originalTransactionId: '2000000999999999' }), renewalInfo({ environment: 'Sandbox' })]) {
    const db = fakeDb({ subscriptions: [appleRow('active')] });
    const r = await run({
      db,
      body: amsgWith('DID_FAIL_TO_RENEW', 'u-mismatch', { expiresDate: String(NOW - DAY_MS) }, {
        subtype: 'GRACE_PERIOD',
        renewal,
      }),
    });
    assertEquals(r.res.status, 422);
    assertEquals(r.body.reason, 'renewal_info_mismatch');
    assertEquals(db.updates.length, 0);
    assertEquals(r.marked.length, 0);
  }
});

Deno.test('DEBUG-772 AC2: leaving grace clears grace_period_end (Apple DID_RENEW, Google RENEWED)', async () => {
  const apple = fakeDb({ subscriptions: [{ ...appleRow('grace'), grace_period_end: iso(NOW + DAY_MS) }] });
  await run({ db: apple, body: amsg('DID_RENEW', T2, 'u-renew') });
  assertEquals(statusOf(apple, APPLE_ROW_ID), 'active');
  assertEquals(graceEndOf(apple, APPLE_ROW_ID), null);

  const google = fakeDb({ subscriptions: [{ ...googleRow('grace'), grace_period_end: iso(NOW + DAY_MS) }] });
  await run({ db: google, body: gmsg(2, T2, 'm-renew') });
  assertEquals(statusOf(google, GOOGLE_ROW_ID), 'active');
  assertEquals(graceEndOf(google, GOOGLE_ROW_ID), null);
});

Deno.test('DEBUG-772 AC2: a status-null transition leaves grace_period_end untouched', async () => {
  const db = fakeDb({ subscriptions: [{ ...appleRow('grace'), grace_period_end: iso(NOW + DAY_MS) }] });
  await run({ db, body: amsg('DID_CHANGE_RENEWAL_STATUS', T2, 'u-toggle', 'AUTO_RENEW_DISABLED') });
  assertEquals('grace_period_end' in db.updates[0].patch, false);
});

Deno.test('DEBUG-772 AC2: Google IN_GRACE_PERIOD no longer writes an unbounded grace - status untouched, audit row only', async () => {
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  const r = await run({ db, body: gmsg(6, T2, 'm-grace') });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'active');
  assertEquals('status' in db.updates[0].patch, false);
  assertEquals('grace_period_end' in db.updates[0].patch, false);
  assertEquals(auditTypes(db), ['grace_period_started']);
});

Deno.test('DEBUG-772 AC3: a REFUND of an OLDER transaction keeps the paid period - no write, no audit row, acknowledged', async () => {
  for (const type of ['REFUND', 'REVOKE']) {
    const paidEnd = NOW + 20 * DAY_MS;
    const db = fakeDb({ subscriptions: [{ ...appleRow('active'), subscription_end_date: iso(paidEnd) }] });
    const r = await run({
      db,
      body: amsgWith(type, `u-old-${type}`, { expiresDate: String(NOW - 10 * DAY_MS), revocationDate: NOW - DAY_MS }),
    });
    assertEquals(r.res.status, 200, type);
    assertEquals(r.body.ignored, 'refund_of_superseded_transaction', type);
    assertEquals(statusOf(db, APPLE_ROW_ID), 'active', type);
    assertEquals(endOf(db, APPLE_ROW_ID), iso(paidEnd), type);
    assertEquals(db.updates.length, 0, type);
    assertEquals(auditTypes(db), [], type);
    assertEquals(r.marked.length, 1, type);
  }
});

Deno.test('DEBUG-772 AC3: a REFUND of the CURRENT transaction revokes access and never moves the end date backwards', async () => {
  const paidEnd = NOW + 20 * DAY_MS;
  const db = fakeDb({ subscriptions: [{ ...appleRow('active'), subscription_end_date: iso(paidEnd) }] });
  const r = await run({ db, body: amsgWith('REFUND', 'u-current', { expiresDate: String(paidEnd), revocationDate: NOW - DAY_MS }) });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, APPLE_ROW_ID), 'expired');
  assertEquals(endOf(db, APPLE_ROW_ID), iso(paidEnd));
  assertEquals(auditTypes(db), ['subscription_cancelled']);
});

Deno.test('DEBUG-772 AC3: a REFUND against a row with no usable end date is not applied (the daily job converges)', async () => {
  for (const end of [null, 'not-a-date']) {
    const db = fakeDb({ subscriptions: [{ ...appleRow('active'), subscription_end_date: end }] });
    const r = await run({ db, body: amsgWith('REFUND', `u-null-${end}`, { expiresDate: String(NOW + DAY_MS) }) });
    assertEquals(r.res.status, 200);
    assertEquals(r.body.ignored, 'refund_of_superseded_transaction');
    assertEquals(statusOf(db, APPLE_ROW_ID), 'active');
    assertEquals(db.updates.length, 0);
  }
});

Deno.test('DEBUG-772 AC3: REFUND_REVERSED restores access from the signed transaction', async () => {
  const end = NOW + 20 * DAY_MS;
  const db = fakeDb({ subscriptions: [{ ...appleRow('expired'), subscription_end_date: iso(end) }] });
  const r = await run({ db, body: amsgWith('REFUND_REVERSED', 'u-reversed', { expiresDate: String(end) }) });
  assertEquals(r.res.status, 200);
  assertEquals(statusOf(db, APPLE_ROW_ID), 'active');
  assertEquals(endOf(db, APPLE_ROW_ID), iso(end));
  assertEquals(auditTypes(db), ['subscription_restored']);
});

Deno.test('DEBUG-772 AC3: REFUND_REVERSED for an elapsed or superseded period never downgrades or writes', async () => {
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ['elapsed', { expiresDate: String(NOW - DAY_MS) }, 'expired'],
    ['older than the current period', { expiresDate: String(NOW + 5 * DAY_MS) }, 'active'],
    ['still revoked', { expiresDate: String(NOW + 20 * DAY_MS), revocationDate: NOW - DAY_MS }, 'active'],
  ];
  for (const [label, txn, rowStatus] of cases) {
    const db = fakeDb({ subscriptions: [{ ...appleRow(rowStatus), subscription_end_date: iso(NOW + 20 * DAY_MS) }] });
    const r = await run({ db, body: amsgWith('REFUND_REVERSED', `u-${label}`, txn) });
    assertEquals(r.res.status, 200, label);
    assertEquals(r.body.ignored, 'refund_reversal_no_current_period', label);
    assertEquals(statusOf(db, APPLE_ROW_ID), rowStatus, label);
    assertEquals(db.updates.length, 0, label);
  }
});

Deno.test('DEBUG-772: a late REFUND_REVERSED older than a newer EXPIRED is stale and not applied', async () => {
  const db = fakeDb({ subscriptions: [appleRow('active')] });
  assertEquals((await run({ db, body: amsg('EXPIRED', T2, 'u-exp') })).res.status, 200);
  const late = await run({ db, body: amsg('REFUND_REVERSED', T1, 'u-reversed-late') });
  assertEquals(late.res.status, 200);
  assertEquals(late.body.ignored, 'stale_notification');
  assertEquals(statusOf(db, APPLE_ROW_ID), 'expired');
});

Deno.test('DEBUG-772: an Apple write never moves subscription_end_date backwards', async () => {
  const paidEnd = NOW + 40 * DAY_MS;
  const db = fakeDb({ subscriptions: [{ ...appleRow('active'), subscription_end_date: iso(paidEnd) }] });
  await run({ db, body: amsgWith('DID_RENEW', 'u-renew-short', { expiresDate: String(NOW + 10 * DAY_MS) }) });
  assertEquals(endOf(db, APPLE_ROW_ID), iso(paidEnd));
});

Deno.test('DEBUG-772: the row lookup selects status and subscription_end_date (the fake does not project, so pin the source)', async () => {
  const src = await Deno.readTextFile(new URL('../subscription-webhook/handlers.ts', import.meta.url));
  const m = src.match(/const ROW_COLUMNS\s*=\s*'([^']*)'/);
  assert(m, 'ROW_COLUMNS not found');
  const cols = m[1].split(',').map((c) => c.trim());
  for (const c of ['status', 'subscription_end_date', 'last_store_event_at', 'updated_at']) {
    assert(cols.includes(c), `ROW_COLUMNS lacks ${c}`);
  }
});

Deno.test('AC2: a status-null transition stamps the watermark too', async () => {
  const db = fakeDb({ subscriptions: [appleRow('active')] });
  await run({ db, body: amsg('DID_CHANGE_RENEWAL_STATUS', T2, 'u-toggle', 'AUTO_RENEW_DISABLED') });
  assertEquals(watermarkOf(db, APPLE_ROW_ID), iso(T2));
  assertEquals('status' in db.updates[0].patch, false);
});

// ---------------------------------------------------------------------------
// AC4 - Google voided purchases revoke
// ---------------------------------------------------------------------------

Deno.test('AC4: a voided subscription purchase on a bound row expires it, with one closed-key audit row', async () => {
  const lines: string[] = [];
  const db = fakeDb({ subscriptions: [{ ...googleRow('active'), crisis_access_enabled: true }] });
  const r = await run({ db, body: googleBody(voided(), { messageId: 'm-void' }), capture: lines });
  assertEquals(r.res.status, 200);
  assertEquals(r.body, { success: true });
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'expired');
  assertEquals(watermarkOf(db, GOOGLE_ROW_ID), iso(EVENT_MS));
  assertEquals(r.marked.length, 1);
  // Crisis access is never an entitlement this path can touch.
  assertEquals('crisis_access_enabled' in db.updates[0].patch, false);
  assertEquals(db.tables.subscriptions[0].crisis_access_enabled, true);

  assertEquals(db.rpcCalls.length, 1);
  const call = db.rpcCalls[0].args;
  assertEquals(call.p_event_type, 'subscription_cancelled');
  assertEquals(call.p_subscription_id, GOOGLE_ROW_ID);
  const meta = call.p_metadata as Record<string, unknown>;
  assertEquals(Object.keys(meta).sort(), ['notification_type', 'platform', 'product_type', 'refund_type', 'timestamp']);
  assertEquals(meta.platform, 'google');
  assertEquals(meta.notification_type, 'voided_purchase');
  assertEquals(meta.product_type, 1);
  assertEquals(meta.refund_type, 1);
  assertEquals(typeof meta.timestamp, 'string');
  assertNothingForbidden('the audit metadata', JSON.stringify(meta), [PURCHASE_TOKEN, ORDER_ID, 'SENTINEL']);
  for (const line of lines) assertNothingForbidden('a log line', line);
});

Deno.test('AC4: refundType is recorded only when it is an integer', async () => {
  for (const [refundType, present] of [[undefined, false], ['1', false], [1.5, false], [2, true]] as Array<[unknown, boolean]>) {
    const db = fakeDb({ subscriptions: [googleRow('active')] });
    await run({ db, body: googleBody(voided({ refundType }), { messageId: 'm-v' }) });
    const meta = db.rpcCalls[0].args.p_metadata as Record<string, unknown>;
    assertEquals('refund_type' in meta, present, `refundType ${String(refundType)}`);
    if (present) assertEquals(meta.refund_type, refundType);
  }
});

for (const productType of [2, 0, undefined, '1', null]) {
  Deno.test(`AC4: a voided purchase with productType ${String(productType)} is acknowledged and writes nothing`, async () => {
    const db = fakeDb({ subscriptions: [googleRow('active')] });
    const r = await run({ db, body: googleBody(voided({ productType }), { messageId: 'm-v' }) });
    assertEquals(r.res.status, 200);
    assertEquals(r.body.ignored, 'voided_non_subscription');
    assertEquals(r.marked.length, 1);
    assertEquals(db.updates.length, 0);
    assertEquals(db.rpcCalls.length, 0);
    assertEquals(statusOf(db, GOOGLE_ROW_ID), 'active');
  });
}

for (const token of [undefined, null, '', '   ', 'has a space', 'a/b', '...', 'x'.repeat(2049)]) {
  Deno.test(`AC4: a voided subscription with an unusable purchaseToken (${JSON.stringify(token)?.slice(0, 20)}) is acknowledged as missing_required_fields`, async () => {
    const db = fakeDb({ subscriptions: [googleRow('active')] });
    const r = await run({ db, body: googleBody(voided({ purchaseToken: token }), { messageId: 'm-v' }) });
    assertEquals(r.res.status, 200);
    assertEquals(r.body.ignored, 'missing_required_fields');
    assertEquals(r.marked.length, 1);
    assertEquals(db.updates.length, 0);
  });
}

Deno.test('AC4: a voided purchase with no usable eventTimeMillis is acknowledged and writes nothing', async () => {
  const db = fakeDb({ subscriptions: [googleRow('active')] });
  const r = await run({ db, body: googleBody(voided({}, { eventTimeMillis: undefined }), { messageId: 'm-v' }) });
  assertEquals(r.body.ignored, 'missing_required_fields');
  assertEquals(db.updates.length, 0);
});

Deno.test('AC4: a voided purchase for a token with no row yet is a 503 within the window, abandoned past it', async () => {
  const within = await run({ body: googleBody(voided(), { messageId: 'm-v' }) });
  assertEquals(within.res.status, 503);
  assertEquals(within.marked.length, 0);

  const past = await run({
    body: googleBody(voided(), { messageId: 'm-v', publishTime: iso(NOW - RTDN_MAX_AGE_MS - 1000) }),
  });
  assertEquals(past.res.status, 200);
  assertEquals(past.body.ignored, 'unresolved_rtdn_abandoned');
  assertEquals(past.marked.length, 1);
  assertEquals(past.db.updates.length, 0);
});

Deno.test('AC4: a voided purchase older than the watermark is stale, not applied', async () => {
  const db = fakeDb({ subscriptions: [{ ...googleRow('active'), last_store_event_at: iso(T3) }] });
  const r = await run({ db, body: googleBody(voided({}, { eventTimeMillis: String(T2) }), { messageId: 'm-v' }) });
  assertEquals(r.body.ignored, 'stale_notification');
  assertEquals(statusOf(db, GOOGLE_ROW_ID), 'active');
  assertEquals(db.updates.length, 0);
});

Deno.test('AC4: on the revocation path a lookup error, an update error and a lost race are all non-2xx and never marked', async () => {
  const lookup = fakeDb({ subscriptions: [googleRow('active')] });
  lookup.failOn('subscriptions', 'select', { code: '08006', message: 'x' });
  const a = await run({ db: lookup, body: googleBody(voided(), { messageId: 'm-v' }) });
  assertEquals(a.res.status, 500);
  assertEquals(a.marked.length, 0);

  const update = fakeDb({ subscriptions: [googleRow('active')] });
  update.failOn('subscriptions', 'update', { code: '42501', message: 'x' });
  const b = await run({ db: update, body: googleBody(voided(), { messageId: 'm-v' }) });
  assertEquals(b.res.status, 500);
  assertEquals(b.marked.length, 0);
  assertEquals(statusOf(update, GOOGLE_ROW_ID), 'active');

  const race = fakeDb({ subscriptions: [googleRow('active')] });
  race.beforeUpdate('subscriptions', () => {
    race.tables.subscriptions[0].updated_at = '2026-10-05T00:00:07.000Z';
  });
  const c = await run({ db: race, body: googleBody(voided(), { messageId: 'm-v' }) });
  assertEquals(c.res.status, 503);
  assertEquals(c.marked.length, 0);
  assertEquals(statusOf(race, GOOGLE_ROW_ID), 'active');
});

Deno.test('AC4: a voided purchase is resolved by (platform google, purchase token), never an Apple row', async () => {
  const db = fakeDb({ subscriptions: [{ ...appleRow('active'), original_transaction_id: PURCHASE_TOKEN }] });
  const r = await run({ db, body: googleBody(voided(), { messageId: 'm-v' }) });
  assertEquals(r.res.status, 503);
  assertEquals(statusOf(db, APPLE_ROW_ID), 'active');
});

// ---------------------------------------------------------------------------
// Package check - a message for another app never reaches a write
// ---------------------------------------------------------------------------

for (
  const [label, message] of [
    ['a voided purchase for another package', voided({}, { packageName: 'com.other.app' })],
    ['a voided purchase with no packageName', voided({}, { packageName: undefined })],
    ['a subscriptionNotification for another package', rtdn(13, PURCHASE_TOKEN, { packageName: 'com.other.app' })],
    ['a subscriptionNotification with no packageName', rtdn(13, PURCHASE_TOKEN, { packageName: undefined })],
  ] as Array<[string, Record<string, unknown>]>
) {
  Deno.test(`security: ${label} is acknowledged as package_mismatch, loudly, and writes nothing`, async () => {
    const lines: string[] = [];
    const db = fakeDb({ subscriptions: [googleRow('active')] });
    const r = await run({ db, body: googleBody(message, { messageId: 'm-pkg' }), capture: lines });
    assertEquals(r.res.status, 200);
    assertEquals(r.body.ignored, 'package_mismatch');
    assertEquals(r.marked.length, 1);
    assertEquals(db.updates.length, 0);
    assertEquals(db.rpcCalls.length, 0);
    assertEquals(statusOf(db, GOOGLE_ROW_ID), 'active');
    assert(lines.some((l) => /package/i.test(l)), lines.join('\n'));
    // The foreign package name is attacker-chosen text; it is not logged.
    for (const line of lines) assert(!line.includes('com.other.app'), line);
  });
}

Deno.test('security: a test notification from another package is still just acknowledged (no entitlement path)', async () => {
  const r = await run({ body: googleBody({ packageName: 'com.other.app', testNotification: { version: '1.0' } }) });
  assertEquals(r.res.status, 200);
  assert(typeof r.body.ignored === 'string');
});
