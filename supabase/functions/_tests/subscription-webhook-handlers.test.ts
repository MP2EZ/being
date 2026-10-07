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
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  createWebhookHandler,
  RTDN_MAX_AGE_MS,
  type WebhookDeps,
} from '../subscription-webhook/handlers.ts';
import { fakeDb, type FakeDb } from './helpers/fakeSupabase.ts';

const NOW = Date.parse('2026-10-06T12:00:00.000Z');
const APPLE_USER = '11111111-1111-4111-8111-111111111111';
const GOOGLE_USER = '22222222-2222-4222-8222-222222222222';
const APPLE_ROW_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GOOGLE_ROW_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ORIGINAL_TXN = '2000000123456789';
const PURCHASE_TOKEN = 'purchase-token-SENTINEL-opaque';

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
  opts: { subtype?: string; data?: Record<string, unknown>; uuid?: string } = {},
) {
  return {
    signedPayload: JSON.stringify({
      notificationType,
      ...(opts.subtype ? { subtype: opts.subtype } : {}),
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

function rtdn(notificationType: number, purchaseToken: string | null = PURCHASE_TOKEN) {
  return {
    version: '1.0',
    packageName: 'fyi.being.app',
    subscriptionNotification: { version: '1.0', notificationType, purchaseToken, subscriptionId: 'being_monthly' },
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
      if (opts.appleVerifyThrows) return Promise.reject(new Error('JWS signature verification failed'));
      return Promise.resolve(JSON.parse(s));
    },
    verifyGoogleOIDC: (header, audience, sa) => {
      oidcCalls.push([header, audience, sa]);
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
  const res = await createWebhookHandler(deps)(req);
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
  ['a voidedPurchaseNotification', { packageName: 'fyi.being.app', voidedPurchaseNotification: { purchaseToken: 'x' } }],
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
