/**
 * verify-apple-receipt handler - behavioural tests (MAINT-753).
 *
 * Until MAINT-753 this function's whole request path sat inside a module-scope serve(), so the
 * guards that decide whether a user is granted a subscription were pinned only by source-shape
 * tests. These drive the DEPLOYED handler (handle, imported by index.ts) with:
 *
 *   - a REAL signed transaction: a throwaway test PKI (_helpers/testPki.ts) signs the JWS and
 *     the injected verifyTransaction is verifyAppleJWS(jws, { trustAnchorSpki, now }), so the
 *     chain walk, signature check and app-scope assertion all really run;
 *   - the fakeSupabase tables, so the replay guard reads real seeded rows and the upsert
 *     payload is observable;
 *   - an injected clock, so every timestamp is exact.
 *
 * Pinned, branch by branch: status, body, headers, the exact subscriptions upsert, and the FULL
 * audit p_metadata (deep equality, never a subset). Branches that write no audit row today are
 * pinned as writing none - a characterization, not an endorsement.
 *
 * Synthetic fixtures only. Global fetch is a throwing tripwire for every scenario.
 */

import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStrictEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { handle, type AppleReceiptDeps } from '../verify-apple-receipt/handler.ts';
import { verifyAppleJWS } from '../_shared/verifyAppleJWS.ts';
import {
  AppleAuthError,
  AppleUnavailableError,
  AppStoreConnectConfigError,
  InvalidTransactionIdError,
  TransactionNotFoundError,
} from '../_shared/appStoreServerApi.ts';
import { decryptReceipt, receiptHash } from '../_shared/receiptCrypto.ts';
import { buildChain, generateKey, signJws } from './_helpers/testPki.ts';
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

const ORIGINAL_TXN = '2000000847061713';
const MONTHLY = 'com.being.subscription.monthly';
const YEARLY = 'com.being.subscription.yearly';

// One throwaway PKI for the file: building a chain is the expensive part.
const chain = await buildChain({ nowMs: NOW });

function claims(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    bundleId: 'fyi.being.app',
    environment: 'Production',
    originalTransactionId: ORIGINAL_TXN,
    productId: MONTHLY,
    expiresDate: NOW + 30 * DAY,
    signedDate: NOW - 1000,
    ...over,
  };
}

function sign(over: Record<string, unknown> = {}): Promise<string> {
  return signJws(claims(over), chain.leafKey.privateKey, chain.x5c);
}

interface FetchCall {
  args: unknown[];
}

interface Harness {
  db: FakeDb;
  deps: AppleReceiptDeps;
  createSupabaseCalls: number;
  fetchCalls: FetchCall[];
  verifyCalls: string[];
}

function harness(opts: {
  jws?: string;
  fetchThrows?: unknown;
  seed?: Record<string, Record<string, unknown>[]>;
} = {}): Harness {
  const db = fakeDb(opts.seed);
  const h: Harness = {
    db,
    createSupabaseCalls: 0,
    fetchCalls: [],
    verifyCalls: [],
    deps: {
      createSupabase: () => {
        h.createSupabaseCalls++;
        return db.client;
      },
      fetchSignedTransactionInfo: (...args: unknown[]) => {
        h.fetchCalls.push({ args });
        if (opts.fetchThrows !== undefined) return Promise.reject(opts.fetchThrows);
        return Promise.resolve({
          transactionId: String(args[0]),
          signedTransactionInfo: opts.jws ?? 'unset',
        });
      },
      verifyTransaction: (jws: string) => {
        h.verifyCalls.push(jws);
        return verifyAppleJWS(jws, { trustAnchorSpki: chain.anchorSpki, now: () => NOW });
      },
      now: () => NOW,
    },
  };
  return h;
}

const token = ANON_SESSION_TOKEN;
const req = (body: unknown = { transactionId: ORIGINAL_TXN }) => request(token, body);

function t(name: string, fn: () => Promise<void>, env: Record<string, string | undefined> = {}) {
  Deno.test(name, () => scenario(env, fn));
}

function assertNoWrites(h: Harness) {
  assertEquals(h.db.upserts, [], 'a subscriptions row was upserted');
  assertEquals(h.db.tables.subscriptions.length, 0, 'a subscriptions row exists');
}

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
  const res = await handle(request(token, undefined, 'GET'), h.deps);
  assertEquals(res.status, 405);
  assertEquals(res.headers.get('content-type'), 'application/json');
  assertStrictEquals(res.headers.get('access-control-allow-origin'), null);
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
  t(`401 with no client built and no Apple call: ${label}`, async () => {
    const h = harness();
    const res = await handle(request(tok, { transactionId: ORIGINAL_TXN }), h.deps);
    assertEquals(res.status, 401);
    assertEquals(res.headers.get('content-type'), 'application/json');
    assertEquals(await bodyJson(res), { error });
    assertEquals(h.createSupabaseCalls, 0);
    assertEquals(h.fetchCalls.length, 0);
    assertEquals(h.db.rpcCalls.length, 0);
    assertNoWrites(h);
  });
}

t('an unparseable JSON body is a 500 {valid:false,error:"Internal server error"} (pinned)', async () => {
  const h = harness();
  const res = await handle(request(token, 'not json{'), h.deps);
  assertEquals(res.status, 500);
  assertEquals(await bodyJson(res), { valid: false, error: 'Internal server error' });
  assertEquals(h.createSupabaseCalls, 0);
  assertEquals(h.db.rpcCalls.length, 0);
});

for (const body of [{}, { transactionId: '' }, { environment: 'Production' }]) {
  t(`400 missing transactionId with no client: ${JSON.stringify(body)}`, async () => {
    const h = harness();
    const res = await handle(req(body), h.deps);
    assertEquals(res.status, 400);
    assertEquals(await bodyJson(res), { error: 'Missing required field: transactionId' });
    assertEquals(h.createSupabaseCalls, 0);
    assertEquals(h.fetchCalls.length, 0);
    assertEquals(h.db.rpcCalls.length, 0);
  });
}

// ---------------------------------------------------------------------------
// Mock gate: both ways
// ---------------------------------------------------------------------------

for (const value of [undefined, 'false', 'TRUE', '1', '', 'true ']) {
  t(`mock receipt REJECTED unless ALLOW_MOCK_RECEIPTS is exactly "true": ${JSON.stringify(value)}`, async () => {
    const h = harness();
    const res = await handle(req({ transactionId: 'mock_receipt_yearly_1700000000000' }), h.deps);
    assertEquals(res.status, 400);
    assertEquals(await bodyJson(res), { error: 'Invalid transaction' });
    assertEquals(h.fetchCalls.length, 0);
    assertEquals(h.verifyCalls.length, 0);
    assertEquals(h.db.rpcCalls.length, 0, 'a rejected mock wrote an audit row');
    assertNoWrites(h);
  }, { ALLOW_MOCK_RECEIPTS: value });
}

for (
  const [id, productId, days] of [
    ['mock_receipt_yearly_1700000000000', YEARLY, 365],
    ['mock_receipt_monthly_1700000000000', MONTHLY, 30],
    ['mock_receipt_', MONTHLY, 30],
  ] as const
) {
  t(`mock receipt ACCEPTED when ALLOW_MOCK_RECEIPTS is "true": ${id} writes no subscription and no audit row`, async () => {
    const h = harness();
    const res = await handle(req({ transactionId: id }), h.deps);
    assertEquals(res.status, 200);
    assertEquals(await bodyJson(res), {
      valid: true,
      subscriptionId: `mock_sub_${NOW}`,
      productId,
      expiresDate: iso(NOW + days * DAY),
      isTrialPeriod: false,
      environment: 'Sandbox',
    });
    assertEquals(h.fetchCalls.length, 0);
    assertEquals(h.verifyCalls.length, 0);
    assertEquals(h.db.rpcCalls.length, 0, 'a mock receipt wrote an audit row');
    assertNoWrites(h);
  }, { ALLOW_MOCK_RECEIPTS: 'true' });
}

// ---------------------------------------------------------------------------
// Upstream failures: four distinct types, kept distinct to the status code
// ---------------------------------------------------------------------------

const UPSTREAM: Array<{ name: string; err: unknown; status: number; error: string; reason: string }> = [
  {
    name: 'TransactionNotFoundError',
    err: new TransactionNotFoundError(4040010),
    status: 400,
    error: 'No App Store transaction matches this identifier',
    reason: 'TransactionNotFoundError',
  },
  {
    name: 'InvalidTransactionIdError',
    err: new InvalidTransactionIdError(),
    status: 400,
    error: 'No App Store transaction matches this identifier',
    reason: 'InvalidTransactionIdError',
  },
  {
    name: 'AppleUnavailableError',
    err: new AppleUnavailableError(503),
    status: 503,
    error: 'App Store is temporarily unavailable',
    reason: 'AppleUnavailableError',
  },
  {
    name: 'AppleAuthError',
    err: new AppleAuthError(401),
    status: 500,
    error: 'Receipt verification is misconfigured',
    reason: 'AppleAuthError',
  },
  {
    name: 'AppStoreConnectConfigError',
    err: new AppStoreConnectConfigError('APPLE_KEY_ID is not configured'),
    status: 500,
    error: 'Receipt verification is misconfigured',
    reason: 'AppStoreConnectConfigError',
  },
  {
    name: 'an unclassified Error',
    err: new Error('boom: SENTINEL_UPSTREAM_DETAIL'),
    status: 500,
    error: 'Failed to verify transaction with Apple',
    reason: 'Error',
  },
  {
    name: 'a thrown non-Error',
    err: 'SENTINEL_UPSTREAM_DETAIL',
    status: 500,
    error: 'Failed to verify transaction with Apple',
    reason: 'unknown',
  },
];

for (const row of UPSTREAM) {
  t(`upstream ${row.name}: ${row.status}, one failure audit keyed on error.name, no subscription`, async () => {
    const h = harness({ fetchThrows: row.err });
    const res = await handle(req(), h.deps);
    assertEquals(res.status, row.status);
    const text = await res.text();
    assertEquals(JSON.parse(text), { valid: false, error: row.error });
    assert(!text.includes('SENTINEL_UPSTREAM_DETAIL') && !text.includes('APPLE_KEY_ID'), 'upstream text leaked');
    assertEquals(auditRows(h.db), [{
      p_user_id: JWT_SUB,
      p_subscription_id: null,
      p_event_type: 'receipt_verification_failed',
      p_metadata: { platform: 'apple', reason: row.reason, timestamp: iso(NOW) },
    }]);
    assertNoWrites(h);
  });
}

// ---------------------------------------------------------------------------
// Trust checks: each must reject a payload Apple signed
// ---------------------------------------------------------------------------

function assertVerificationFailed(h: Harness, res: Response) {
  assertEquals(res.status, 500);
  return res.json().then((b) => {
    assertEquals(b, { valid: false, error: 'Failed to verify transaction with Apple' });
    assertEquals(auditRows(h.db), [{
      p_user_id: JWT_SUB,
      p_subscription_id: null,
      p_event_type: 'receipt_verification_failed',
      p_metadata: { platform: 'apple', reason: 'Error', timestamp: iso(NOW) },
    }]);
    assertNoWrites(h);
  });
}

t('ENV CROSS-CHECK: a Sandbox-signed transaction asked for as Production is refused', async () => {
  const h = harness({ jws: await sign({ environment: 'Sandbox' }) });
  // The client omits the hint, so the lookup defaults to Production.
  const res = await handle(req({ transactionId: ORIGINAL_TXN }), h.deps);
  assertEquals(h.fetchCalls[0].args[1], 'Production');
  await assertVerificationFailed(h, res);
});

t('ENV CROSS-CHECK: a Production-signed transaction asked for as Sandbox is refused', async () => {
  const h = harness({ jws: await sign({ environment: 'Production' }) });
  const res = await handle(req({ transactionId: ORIGINAL_TXN, environment: 'Sandbox' }), h.deps);
  assertEquals(h.fetchCalls[0].args[1], 'Sandbox');
  await assertVerificationFailed(h, res);
});

t('APP SCOPE: an Apple-signed transaction for ANOTHER app is refused', async () => {
  const h = harness({ jws: await sign({ bundleId: 'com.someone.else' }) });
  await assertVerificationFailed(h, await handle(req(), h.deps));
});

t('APP SCOPE: a transaction with no bundleId is refused', async () => {
  const h = harness({ jws: await sign({ bundleId: undefined }) });
  await assertVerificationFailed(h, await handle(req(), h.deps));
});

t('SIGNATURE: a JWS signed by a key outside the certificate chain is refused', async () => {
  const forged = await signJws(claims(), (await generateKey()).privateKey, chain.x5c);
  const h = harness({ jws: forged });
  await assertVerificationFailed(h, await handle(req(), h.deps));
});

t('SIGNATURE: a JWS whose chain does not anchor in the trusted root is refused', async () => {
  const other = await buildChain({ nowMs: NOW });
  const h = harness({ jws: await signJws(claims(), other.leafKey.privateKey, other.x5c) });
  await assertVerificationFailed(h, await handle(req(), h.deps));
});

// ---------------------------------------------------------------------------
// Success: the exact write
// ---------------------------------------------------------------------------

t('200: the exact subscriptions upsert and the receipt_verification_succeeded audit', async () => {
  const jws = await sign({ productId: YEARLY });
  const h = harness({ jws });
  const res = await handle(req({ transactionId: ORIGINAL_TXN, environment: 'Production' }), h.deps);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('content-type'), 'application/json');
  assertEquals(await bodyJson(res), {
    valid: true,
    subscriptionId: ORIGINAL_TXN,
    productId: YEARLY,
    expiresDate: iso(NOW + 30 * DAY),
    isTrialPeriod: false,
    environment: 'Production',
  });

  // The Apple call: id, requested environment, the three credentials, and NO fourth argument
  // (the fetch seam must stay unreachable from a production call site).
  assertEquals(h.fetchCalls.length, 1);
  assertEquals(h.fetchCalls[0].args, [
    ORIGINAL_TXN,
    'Production',
    {
      issuerId: 'issuer-test-0001',
      keyId: 'keyid-test-0001',
      privateKeyPem: 'apple-private-key-placeholder',
    },
  ]);
  assertEquals(h.verifyCalls, [jws]);

  assertEquals(h.db.upserts.length, 1);
  const { table, row, options } = h.db.upserts[0];
  assertEquals(table, 'subscriptions');
  assertEquals(options, { onConflict: 'user_id' });
  const ciphertext = row.receipt_data_encrypted as string;
  assertEquals(row, {
    user_id: JWT_SUB,
    platform: 'apple',
    platform_subscription_id: ORIGINAL_TXN,
    original_transaction_id: ORIGINAL_TXN,
    receipt_hash: await receiptHash(jws),
    status: 'active',
    tier: 'standard',
    interval: 'yearly',
    subscription_start_date: iso(NOW),
    subscription_end_date: iso(NOW + 30 * DAY),
    last_receipt_verified: iso(NOW),
    receipt_data_encrypted: ciphertext,
    environment: 'Production',
    updated_at: iso(NOW),
  });
  // The signed JWS is what is encrypted and hashed - never stored, never a bare identifier.
  assertNotEquals(ciphertext, jws);
  assert(!ciphertext.includes(jws));
  assertEquals(await decryptReceipt(ciphertext, ENC_KEY_B64), jws);
  assertNotEquals(row.receipt_hash, await receiptHash(ORIGINAL_TXN));

  assertEquals(auditRows(h.db), [{
    p_user_id: JWT_SUB,
    p_subscription_id: ORIGINAL_TXN,
    p_event_type: 'receipt_verification_succeeded',
    p_metadata: { platform: 'apple', environment: 'Production', verified_at: iso(NOW) },
  }]);
  assertEquals(h.db.tables.subscriptions.length, 1);
});

t('the persisted environment is the SIGNED claim, never the client hint', async () => {
  // The hint is omitted. Storing body.environment would write undefined; the signed claim
  // (and the default lookup it matched) is Production.
  const h = harness({ jws: await sign({ environment: 'Production' }) });
  const res = await handle(req({ transactionId: ORIGINAL_TXN }), h.deps);
  assertEquals(res.status, 200);
  assertEquals(h.db.upserts[0].row.environment, 'Production');
  assertEquals((await bodyJson(res) as { environment: string }).environment, 'Production');
  assertEquals((auditRows(h.db)[0].p_metadata as { environment: string }).environment, 'Production');
});

t('a Sandbox transaction asked for as Sandbox is stored as Sandbox', async () => {
  const h = harness({ jws: await sign({ environment: 'Sandbox' }) });
  const res = await handle(req({ transactionId: ORIGINAL_TXN, environment: 'Sandbox' }), h.deps);
  assertEquals(res.status, 200);
  assertEquals(h.fetchCalls[0].args[1], 'Sandbox');
  assertEquals(h.db.upserts[0].row.environment, 'Sandbox');
});

t('a free trial is written as status "trial"; a monthly product as interval "monthly"', async () => {
  const h = harness({ jws: await sign({ offerType: 1, offerDiscountType: 'FREE_TRIAL' }) });
  assertEquals((await handle(req(), h.deps)).status, 200);
  assertEquals(h.db.upserts[0].row.status, 'trial');
  assertEquals(h.db.upserts[0].row.interval, 'monthly');
});

t('the legacy receiptData field is ignored', async () => {
  const jws = await sign();
  const h = harness({ jws });
  const res = await handle(req({ transactionId: ORIGINAL_TXN, receiptData: 'GARBAGE_LEGACY_BLOB' }), h.deps);
  assertEquals(res.status, 200);
  assertEquals(h.db.upserts[0].row.receipt_hash, await receiptHash(jws));
  assert(!JSON.stringify(h.db.upserts[0].row).includes('GARBAGE_LEGACY_BLOB'));
});

t('a missing RECEIPT_ENCRYPTION_KEY fails loud: 500, no row, no audit', async () => {
  const h = harness({ jws: await sign() });
  const res = await handle(req(), h.deps);
  assertEquals(res.status, 500);
  assertEquals(await bodyJson(res), { valid: false, error: 'Internal server error' });
  assertNoWrites(h);
  assertEquals(h.db.rpcCalls.length, 0);
}, { RECEIPT_ENCRYPTION_KEY: undefined });

// ---------------------------------------------------------------------------
// Not entitled: expired / revoked
// ---------------------------------------------------------------------------

for (
  const [label, over] of [
    ['expired a millisecond ago', { expiresDate: NOW - 1 }],
    ['expiring exactly now (strict >)', { expiresDate: NOW }],
    ['revoked while unexpired', { revocationDate: NOW - 1000 }],
    ['no expiresDate at all', { expiresDate: undefined }],
  ] as const
) {
  t(`400 expired_or_revoked, audited with the transaction id, no subscription: ${label}`, async () => {
    const h = harness({ jws: await sign(over) });
    const res = await handle(req(), h.deps);
    assertEquals(res.status, 400);
    const body = await bodyJson(res) as Record<string, unknown>;
    assertEquals(body.valid, false);
    assertEquals(body.error, 'Subscription is expired or revoked');
    assertEquals(body.subscriptionId, ORIGINAL_TXN);
    assertEquals(auditRows(h.db), [{
      p_user_id: JWT_SUB,
      p_subscription_id: ORIGINAL_TXN,
      p_event_type: 'receipt_verification_failed',
      p_metadata: { platform: 'apple', reason: 'expired_or_revoked', timestamp: iso(NOW) },
    }]);
    assertNoWrites(h);
  });
}

// ---------------------------------------------------------------------------
// Identifier guard and replay binding
// ---------------------------------------------------------------------------

for (const [label, id] of [['absent', undefined], ['empty', '']] as const) {
  t(`a verified transaction with an ${label} originalTransactionId is refused before any write (DEBUG-447)`, async () => {
    const h = harness({ jws: await sign({ originalTransactionId: id }) });
    const res = await handle(req(), h.deps);
    assertEquals(res.status, 500);
    assertEquals(await bodyJson(res), {
      valid: false,
      error: 'Verification produced no stable transaction identifier',
    });
    assertEquals(auditRows(h.db), [{
      p_user_id: JWT_SUB,
      p_subscription_id: null,
      p_event_type: 'receipt_verification_failed',
      p_metadata: { platform: 'apple', reason: 'missing_txn_identifier', timestamp: iso(NOW) },
    }]);
    assertNoWrites(h);
  });
}

t('REPLAY: a transaction already bound to another user is a 409, audited, and writes nothing', async () => {
  const bound = { user_id: OTHER_USER, platform: 'apple', original_transaction_id: ORIGINAL_TXN, status: 'active' };
  const h = harness({ jws: await sign(), seed: { subscriptions: [bound] } });
  const res = await handle(req(), h.deps);
  assertEquals(res.status, 409);
  assertEquals(await bodyJson(res), { valid: false, error: 'Receipt already bound to another account' });
  assertEquals(auditRows(h.db), [{
    p_user_id: JWT_SUB,
    p_subscription_id: null,
    p_event_type: 'receipt_verification_failed',
    p_metadata: { platform: 'apple', reason: 'txn_bound_to_other_user', timestamp: iso(NOW) },
  }]);
  assertEquals(h.db.upserts, []);
  assertEquals(h.db.tables.subscriptions, [bound], 'the victim row was modified');
});

t('REPLAY: the same user re-verifying (restore purchases) is an idempotent 200', async () => {
  const mine = { user_id: JWT_SUB, platform: 'apple', original_transaction_id: ORIGINAL_TXN, status: 'trial' };
  const h = harness({ jws: await sign(), seed: { subscriptions: [mine] } });
  const res = await handle(req(), h.deps);
  assertEquals(res.status, 200);
  assertEquals(h.db.upserts.length, 1);
  assertEquals(h.db.tables.subscriptions.length, 1);
  assertEquals(h.db.tables.subscriptions[0].status, 'active');
  assertEquals(auditRows(h.db).map((a) => a.p_event_type), ['receipt_verification_succeeded']);
});

t('REPLAY: the binding is per platform - a google row with the same id does not block apple', async () => {
  const google = { user_id: OTHER_USER, platform: 'google', original_transaction_id: ORIGINAL_TXN };
  const h = harness({ jws: await sign(), seed: { subscriptions: [google] } });
  assertEquals((await handle(req(), h.deps)).status, 200);
});

t('a failing ownership lookup is a 500 with no write and no audit row', async () => {
  const h = harness({ jws: await sign() });
  h.db.failOn('subscriptions', 'select', { message: 'SENTINEL_DB_DETAIL connection reset' });
  const res = await handle(req(), h.deps);
  assertEquals(res.status, 500);
  const text = await res.text();
  assertEquals(JSON.parse(text), { valid: false, error: 'Internal server error' });
  assert(!text.includes('SENTINEL_DB_DETAIL'));
  assertNoWrites(h);
  assertEquals(h.db.rpcCalls.length, 0);
});

// ---------------------------------------------------------------------------
// Upsert failures
// ---------------------------------------------------------------------------

for (
  const [label, error] of [
    ['code 23505', { code: '23505', message: 'duplicate key value violates unique constraint' }],
    ['message only, no code', { message: 'duplicate key value violates unique constraint "uniq_txn_per_platform"' }],
  ] as const
) {
  t(`UPSERT unique violation (${label}) is the TOCTOU backstop: 409 as a replay`, async () => {
    const h = harness({ jws: await sign() });
    h.db.failOn('subscriptions', 'upsert', error);
    const res = await handle(req(), h.deps);
    assertEquals(res.status, 409);
    assertEquals(await bodyJson(res), { valid: false, error: 'Receipt already bound to another account' });
    assertEquals(h.db.upserts.length, 1);
    assertEquals(auditRows(h.db), [{
      p_user_id: JWT_SUB,
      p_subscription_id: null,
      p_event_type: 'receipt_verification_failed',
      p_metadata: { platform: 'apple', reason: 'txn_bound_to_other_user', timestamp: iso(NOW) },
    }]);
  });
}

t('UPSERT any other error: 500, upstream text withheld, and NO failure audit row (pinned as writing none)', async () => {
  const h = harness({ jws: await sign() });
  h.db.failOn('subscriptions', 'upsert', { code: '42501', message: 'SENTINEL_DB_DETAIL permission denied' });
  const res = await handle(req(), h.deps);
  assertEquals(res.status, 500);
  const text = await res.text();
  assertEquals(JSON.parse(text), { valid: false, error: 'Internal server error' });
  assert(!text.includes('SENTINEL_DB_DETAIL'));
  assertEquals(h.db.upserts.length, 1);
  assertEquals(h.db.rpcCalls.length, 0);
});

// ---------------------------------------------------------------------------
// Audit writes are non-fatal (DEBUG-446 ruling)
// ---------------------------------------------------------------------------

t('an audit RPC error on the success path still answers 200 with the row written', async () => {
  const h = harness({ jws: await sign() });
  h.db.failRpc('log_subscription_event', { code: '23514', message: 'event_type check violation' });
  const res = await handle(req(), h.deps);
  assertEquals(res.status, 200);
  assertEquals(h.db.upserts.length, 1);
  assertEquals(auditRows(h.db).length, 1, 'the audit write was attempted');
});

t('an audit RPC error on a failure path does not change the failure answer', async () => {
  const h = harness({ fetchThrows: new AppleUnavailableError(503) });
  h.db.failRpc('log_subscription_event', { message: 'down' });
  const res = await handle(req(), h.deps);
  assertEquals(res.status, 503);
  assertEquals(await bodyJson(res), { valid: false, error: 'App Store is temporarily unavailable' });
});
