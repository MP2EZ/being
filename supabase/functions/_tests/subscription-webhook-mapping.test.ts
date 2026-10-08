/**
 * subscription-webhook notification mapping — table test (DEBUG-739 AC2, AC5; DEBUG-751).
 *
 * Every handled Apple and Google notification type maps to an expected status and event
 * type, and every UNHANDLED type maps to no transition at all. DEBUG-751 corrected the rows
 * that did not match store semantics (Google CANCELED keeps access, ON_HOLD and PAUSED
 * remove it, Apple DID_FAIL_TO_RENEW is grace only for the GRACE_PERIOD subtype); 'expired'
 * is the no-access status, so no status value was added.
 *
 * The unhandled rows are the point of the second half. Both switches used to default to
 * status 'active', so any type outside them re-activated the row it matched — an expired,
 * refunded or paused subscription included.
 */

import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  APPLE_NOTIFICATION_TYPES,
  GOOGLE_NOTIFICATION_TYPES,
  mapAppleNotification,
  mapGoogleNotification,
  isStaleEvent,
  mapGoogleVoidedPurchase,
  type StatusTransition,
} from '../subscription-webhook/notificationMapping.ts';

const APPLE_HANDLED: Array<[string, string | undefined, StatusTransition]> = [
  ['SUBSCRIBED', undefined, { status: 'active', eventType: 'subscription_started' }],
  ['DID_RENEW', undefined, { status: 'active', eventType: 'subscription_renewed' }],
  // DEBUG-751: grace only when Apple says the billing-retry grace period is on.
  ['DID_FAIL_TO_RENEW', undefined, { status: 'expired', eventType: 'payment_failed' }],
  ['DID_FAIL_TO_RENEW', 'BILLING_RETRY', { status: 'expired', eventType: 'payment_failed' }],
  ['DID_FAIL_TO_RENEW', 'GRACE_PERIOD', { status: 'grace', eventType: 'payment_failed' }],
  ['EXPIRED', undefined, { status: 'expired', eventType: 'subscription_expired' }],
  ['GRACE_PERIOD_EXPIRED', undefined, { status: 'expired', eventType: 'subscription_expired' }],
  ['REVOKE', undefined, { status: 'expired', eventType: 'subscription_cancelled' }],
  ['REFUND', undefined, { status: 'expired', eventType: 'subscription_cancelled' }],
  // AC5: auto-renew toggled — never a status write; the direction comes from `subtype`.
  ['DID_CHANGE_RENEWAL_STATUS', 'AUTO_RENEW_DISABLED', { status: null, eventType: 'subscription_cancelled' }],
  ['DID_CHANGE_RENEWAL_STATUS', 'AUTO_RENEW_ENABLED', { status: null, eventType: 'subscription_restored' }],
];

for (const [type, subtype, expected] of APPLE_HANDLED) {
  Deno.test(`apple mapping: ${type}${subtype ? `/${subtype}` : ''}`, () => {
    assertEquals(mapAppleNotification(type, subtype), expected);
  });
}

Deno.test('apple mapping: DID_CHANGE_RENEWAL_STATUS never writes status, whatever the subtype', () => {
  for (const subtype of ['AUTO_RENEW_DISABLED', 'AUTO_RENEW_ENABLED', undefined, 'SOMETHING_NEW']) {
    const t = mapAppleNotification('DID_CHANGE_RENEWAL_STATUS', subtype);
    assertEquals(t === null || t.status === null, true, `subtype ${subtype}`);
  }
});

Deno.test('apple mapping: DID_CHANGE_RENEWAL_STATUS with no recognisable direction records nothing', () => {
  assertEquals(mapAppleNotification('DID_CHANGE_RENEWAL_STATUS', undefined), null);
});

const APPLE_UNHANDLED = [
  'TEST',
  'CONSUMPTION_REQUEST',
  'PRICE_INCREASE',
  'REFUND_DECLINED',
  'REFUND_REVERSED',
  'RENEWAL_EXTENDED',
  'RENEWAL_EXTENSION',
  'OFFER_REDEEMED',
  'DID_CHANGE_RENEWAL_PREF',
  'EXTERNAL_PURCHASE_TOKEN',
  'ONE_TIME_CHARGE',
  'A_TYPE_APPLE_ADDS_NEXT_YEAR',
  undefined,
];

for (const type of APPLE_UNHANDLED) {
  Deno.test(`apple mapping: unhandled ${type} writes nothing`, () => {
    assertEquals(mapAppleNotification(type, undefined), null);
  });
}

const GOOGLE_HANDLED: Array<[number, StatusTransition]> = [
  [1, { status: 'active', eventType: 'subscription_renewed' }], // RECOVERED
  [2, { status: 'active', eventType: 'subscription_renewed' }], // RENEWED
  [3, { status: null, eventType: 'subscription_cancelled' }], // CANCELED: access continues to period end
  [4, { status: 'active', eventType: 'subscription_started' }], // PURCHASED
  [5, { status: 'expired', eventType: 'payment_failed' }], // ON_HOLD: access suspended
  [6, { status: 'grace', eventType: 'grace_period_started' }], // IN_GRACE_PERIOD
  [7, { status: null, eventType: 'subscription_restored' }], // RESTARTED: auto-renew back on
  [10, { status: 'expired', eventType: 'subscription_expired' }], // PAUSED: access suspended
  [12, { status: 'expired', eventType: 'subscription_expired' }], // REVOKED
  [13, { status: 'expired', eventType: 'subscription_expired' }], // EXPIRED
];

for (const [type, expected] of GOOGLE_HANDLED) {
  Deno.test(`google mapping: notificationType ${type}`, () => {
    assertEquals(mapGoogleNotification(type), expected);
  });
}

// PRICE_CHANGE_CONFIRMED, DEFERRED, PAUSE_SCHEDULE_CHANGED, and codes Google adds.
for (const type of [8, 9, 11, 14, 20, 0, -1, undefined]) {
  Deno.test(`google mapping: unhandled ${type} writes nothing`, () => {
    assertEquals(mapGoogleNotification(type), null);
  });
}

Deno.test('mapping tables are exhaustive over the exported type constants', () => {
  const appleCovered = new Set(APPLE_HANDLED.map(([t]) => t));
  for (const t of Object.values(APPLE_NOTIFICATION_TYPES)) {
    assertEquals(appleCovered.has(t), true, `apple ${t} has no row in the table`);
  }
  const googleCovered = new Set<number | undefined>([
    ...GOOGLE_HANDLED.map(([t]) => t),
    8, 9, 11,
  ]);
  for (const t of Object.values(GOOGLE_NOTIFICATION_TYPES)) {
    assertEquals(googleCovered.has(t), true, `google ${t} has no row in the table`);
  }
});

Deno.test('google mapping: CANCELED never writes status (access continues to the paid-through date)', () => {
  assertEquals(mapGoogleNotification(3)?.status, null);
});

// ---------------------------------------------------------------------------
// DEBUG-751: voided purchases
// ---------------------------------------------------------------------------

Deno.test('google voided purchase: a subscription (productType 1) revokes access', () => {
  assertEquals(mapGoogleVoidedPurchase(1), { status: 'expired', eventType: 'subscription_cancelled' });
});

for (const productType of [2, 0, -1, '1', null, undefined, 1.5, NaN]) {
  Deno.test(`google voided purchase: productType ${String(productType)} is not a subscription`, () => {
    assertEquals(mapGoogleVoidedPurchase(productType), null);
  });
}

// ---------------------------------------------------------------------------
// DEBUG-751: isStaleEvent - the monotonic guard
// ---------------------------------------------------------------------------

const NOW = Date.parse('2026-10-08T12:00:00.000Z');
const iso = (ms: number) => new Date(ms).toISOString();
const MIN = 60_000;

const STALE_ROWS: Array<[string, number, string | null | undefined, boolean]> = [
  ['no stored watermark', NOW - MIN, null, false],
  ['an undefined watermark', NOW - MIN, undefined, false],
  ['an unparseable watermark', NOW - MIN, 'not a date', false],
  ['an empty watermark', NOW - MIN, '', false],
  ['strictly older than the watermark', NOW - 2 * MIN, iso(NOW - MIN), true],
  ['equal to the watermark (a redelivery of the newest applied)', NOW - MIN, iso(NOW - MIN), false],
  ['newer than the watermark', NOW - MIN, iso(NOW - 2 * MIN), false],
  ['one millisecond older', NOW - MIN - 1, iso(NOW - MIN), true],
  // Defence in depth: a watermark far in the future would otherwise freeze the row forever.
  ['a watermark more than 5 minutes in the future is treated as absent', NOW - MIN, iso(NOW + 6 * MIN), false],
  ['a watermark an hour in the future is treated as absent', NOW - MIN, iso(NOW + 60 * MIN), false],
  ['a watermark exactly 5 minutes ahead still counts', NOW - MIN, iso(NOW + 5 * MIN), true],
  ['a watermark 4 minutes ahead still counts', NOW - MIN, iso(NOW + 4 * MIN), true],
];

for (const [label, eventMs, stored, expected] of STALE_ROWS) {
  Deno.test(`isStaleEvent: ${label}`, () => {
    assertEquals(isStaleEvent(eventMs, stored, NOW), expected);
  });
}
