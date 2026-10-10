/**
 * Apple subscription status parity — the daily job and the webhook agree (DEBUG-772 AC1, AC2).
 *
 * One table of store states. Each row is asserted three ways: against the shared pure
 * decision (decideAppleStatus), against the webhook end to end (a DID_FAIL_TO_RENEW carrying
 * that signed transaction and renewal info, through createWebhookHandler), and — by a source
 * pin — the daily job, which must import the same decision rather than keep its own.
 *
 * The rule the table pins: billing retry alone is NOT access. 'grace' requires a signed
 * gracePeriodExpiresDate that is still in the future, after the transaction's expiry, and
 * within Apple's longest grace period (28 days) of it. Everything else past expiry is
 * 'expired'. Every 'grace' outcome carries its bounded end; nothing writes grace without one.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  APPLE_MAX_GRACE_MS,
  decideAppleStatus,
  decidePostExpiryStatus,
  renewalBoundToTransaction,
} from '../_shared/subscriptionStatusDecision.ts';
import { createWebhookHandler, type WebhookDeps } from '../subscription-webhook/handlers.ts';
import { fakeDb } from './helpers/fakeSupabase.ts';

const NOW = Date.parse('2026-10-06T12:00:00.000Z');
const DAY = 86_400_000;
const ORIGINAL_TXN = '2000000123456789';
const ROW_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER = '11111111-1111-4111-8111-111111111111';
const SCOPE = { bundleId: 'fyi.being.app', environment: 'Production' };
const iso = (ms: number) => new Date(ms).toISOString();

interface Row {
  label: string;
  expiresDate: number;
  revocationDate?: number;
  /** undefined = no renewal info at all. */
  renewal?: { gracePeriodExpiresDate?: number; isInBillingRetryPeriod?: boolean };
  status: 'active' | 'grace' | 'expired';
  gracePeriodEnd?: number;
}

const TABLE: Row[] = [
  { label: 'paid period still running', expiresDate: NOW + 10 * DAY, status: 'active' },
  {
    label: 'paid period running, billing retry flagged anyway',
    expiresDate: NOW + 10 * DAY,
    renewal: { isInBillingRetryPeriod: true },
    status: 'active',
  },
  { label: 'expired, no renewal info', expiresDate: NOW - 2 * DAY, status: 'expired' },
  {
    label: 'expired, billing retry WITHOUT a grace period (AC1)',
    expiresDate: NOW - 2 * DAY,
    renewal: { isInBillingRetryPeriod: true },
    status: 'expired',
  },
  {
    label: 'expired, inside a signed grace period',
    expiresDate: NOW - 2 * DAY,
    renewal: { isInBillingRetryPeriod: true, gracePeriodExpiresDate: NOW + 14 * DAY },
    status: 'grace',
    gracePeriodEnd: NOW + 14 * DAY,
  },
  {
    label: 'expired, grace period already elapsed',
    expiresDate: NOW - 20 * DAY,
    renewal: { isInBillingRetryPeriod: true, gracePeriodExpiresDate: NOW - 1000 },
    status: 'expired',
  },
  {
    label: 'expired, grace end not after the expiry (incoherent)',
    expiresDate: NOW - 2 * DAY,
    renewal: { gracePeriodExpiresDate: NOW - 3 * DAY },
    status: 'expired',
  },
  {
    label: 'expired, grace end beyond the 28-day cap',
    expiresDate: NOW - DAY,
    renewal: { isInBillingRetryPeriod: true, gracePeriodExpiresDate: NOW + 30 * DAY },
    status: 'expired',
  },
  {
    label: 'expired, grace end exactly at the cap',
    expiresDate: NOW - DAY,
    renewal: { gracePeriodExpiresDate: NOW - DAY + APPLE_MAX_GRACE_MS },
    status: 'grace',
    gracePeriodEnd: NOW - DAY + APPLE_MAX_GRACE_MS,
  },
  {
    label: 'revoked, even inside a grace period',
    expiresDate: NOW - 2 * DAY,
    revocationDate: NOW - DAY,
    renewal: { gracePeriodExpiresDate: NOW + 14 * DAY },
    status: 'expired',
  },
];

function txnClaims(r: Row) {
  return {
    ...SCOPE,
    originalTransactionId: ORIGINAL_TXN,
    expiresDate: r.expiresDate,
    ...(r.revocationDate !== undefined ? { revocationDate: r.revocationDate } : {}),
  };
}
function renewalClaims(r: Row) {
  return r.renewal === undefined
    ? null
    : { environment: SCOPE.environment, originalTransactionId: ORIGINAL_TXN, ...r.renewal };
}

for (const r of TABLE) {
  Deno.test(`parity (decision): ${r.label} -> ${r.status}`, () => {
    const d = decideAppleStatus(txnClaims(r), renewalClaims(r), NOW);
    assert(d !== null);
    assertEquals(d.status, r.status);
    assertEquals(d.gracePeriodEndMs, r.gracePeriodEnd);
  });

  Deno.test(`parity (webhook DID_FAIL_TO_RENEW): ${r.label} -> ${r.status}`, async () => {
    const db = fakeDb({
      subscriptions: [{
        id: ROW_ID,
        user_id: USER,
        platform: 'apple',
        original_transaction_id: ORIGINAL_TXN,
        status: 'active',
        subscription_end_date: null,
        grace_period_end: null,
        last_store_event_at: null,
        updated_at: '2026-10-05T00:00:00.000Z',
      }],
    });
    const renewal = renewalClaims(r);
    const body = {
      signedPayload: JSON.stringify({
        notificationType: 'DID_FAIL_TO_RENEW',
        ...(r.renewal?.gracePeriodExpiresDate !== undefined ? { subtype: 'GRACE_PERIOD' } : {}),
        signedDate: NOW - 60_000,
        notificationUUID: `uuid-${r.label}`,
        data: {
          ...SCOPE,
          signedTransactionInfo: JSON.stringify(txnClaims(r)),
          ...(renewal ? { signedRenewalInfo: JSON.stringify(renewal) } : {}),
        },
      }),
    };
    const deps: WebhookDeps = {
      createSupabase: () => db.client,
      verifyAppleSignature: (s: string) => Promise.resolve(JSON.parse(s)),
      verifyGoogleOIDC: () => Promise.reject(new Error('not used')),
      readGoogleConfig: () => ({}),
      now: () => NOW,
    };
    const res = await createWebhookHandler(deps)(
      new Request('https://edge.test/subscription-webhook', { method: 'POST', body: JSON.stringify(body) }),
    );
    assertEquals(res.status, 200);
    const row = db.tables.subscriptions[0];
    assertEquals(row.status, r.status);
    assertEquals(row.grace_period_end, r.gracePeriodEnd === undefined ? null : iso(r.gracePeriodEnd));
  });
}

Deno.test('parity: the post-expiry rule never yields grace without a bounded end', () => {
  for (const r of TABLE) {
    const d = decidePostExpiryStatus(r.expiresDate, renewalClaims(r), NOW);
    if (d.status === 'grace') assert(Number.isFinite(d.gracePeriodEndMs) && d.gracePeriodEndMs > NOW, r.label);
  }
});

Deno.test('parity: string-encoded signed dates decide the same as numbers', () => {
  const r = TABLE.find((x) => x.status === 'grace')!;
  const asStrings = {
    ...txnClaims(r),
    expiresDate: String(r.expiresDate),
  };
  const renewal = { ...renewalClaims(r)!, gracePeriodExpiresDate: String(r.renewal!.gracePeriodExpiresDate) };
  assertEquals(decideAppleStatus(asStrings, renewal, NOW), decideAppleStatus(txnClaims(r), renewalClaims(r), NOW));
});

Deno.test('parity: a transaction with no usable expiresDate is undecidable (null), never a status', () => {
  assertEquals(decideAppleStatus({ ...SCOPE, originalTransactionId: ORIGINAL_TXN }, null, NOW), null);
  assertEquals(decideAppleStatus({ expiresDate: 'soon' }, null, NOW), null);
});

Deno.test('renewalBoundToTransaction: environment and originalTransactionId must both match', () => {
  const txn = { originalTransactionId: ORIGINAL_TXN };
  assert(renewalBoundToTransaction({ environment: 'Production', originalTransactionId: ORIGINAL_TXN }, txn, 'Production'));
  assert(!renewalBoundToTransaction({ environment: 'Sandbox', originalTransactionId: ORIGINAL_TXN }, txn, 'Production'));
  assert(!renewalBoundToTransaction({ environment: 'Production', originalTransactionId: 'other' }, txn, 'Production'));
  assert(!renewalBoundToTransaction({ environment: 'Production' }, txn, 'Production'));
  assert(!renewalBoundToTransaction(null, txn, 'Production'));
});

Deno.test('parity (source pin): the daily job imports the shared decision and keeps no local decideStatus', async () => {
  const src = await Deno.readTextFile(new URL('../grace-period-automation/handler.ts', import.meta.url));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(/from ['"]\.\.\/_shared\/subscriptionStatusDecision\.ts['"]/.test(code), 'no import of the shared decision');
  assert(/\bdecideAppleStatus\s*\(/.test(code), 'the shared decision is imported but never called');
  assert(!/function\s+decideStatus\s*\(/.test(code), 'a local decideStatus survives');
  assert(/renewalBoundToTransaction\s*\(/.test(code), 'the renewal binding is not the shared helper');
});
