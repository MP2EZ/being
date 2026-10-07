/**
 * subscription-webhook notification mapping — table test (DEBUG-739 AC2, AC5).
 *
 * Every handled Apple and Google notification type maps to an expected status and event
 * type, and every UNHANDLED type maps to no transition at all. The handled rows pin the
 * pre-existing mappings as they are; DEBUG-751 owns correcting the ones that do not match
 * store semantics, and will change this table when it does.
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
  type StatusTransition,
} from '../subscription-webhook/notificationMapping.ts';

const APPLE_HANDLED: Array<[string, string | undefined, StatusTransition]> = [
  ['SUBSCRIBED', undefined, { status: 'active', eventType: 'subscription_started' }],
  ['DID_RENEW', undefined, { status: 'active', eventType: 'subscription_renewed' }],
  ['DID_FAIL_TO_RENEW', undefined, { status: 'grace', eventType: 'payment_failed' }],
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
  [3, { status: 'expired', eventType: 'subscription_expired' }], // CANCELED — see DEBUG-751
  [4, { status: 'active', eventType: 'subscription_started' }], // PURCHASED
  [5, { status: 'grace', eventType: 'payment_failed' }], // ON_HOLD — see DEBUG-751
  [6, { status: 'grace', eventType: 'grace_period_started' }], // IN_GRACE_PERIOD
  [10, { status: 'grace', eventType: 'payment_failed' }], // PAUSED — see DEBUG-751
  [12, { status: 'expired', eventType: 'subscription_expired' }], // REVOKED
  [13, { status: 'expired', eventType: 'subscription_expired' }], // EXPIRED
];

for (const [type, expected] of GOOGLE_HANDLED) {
  Deno.test(`google mapping: notificationType ${type}`, () => {
    assertEquals(mapGoogleNotification(type), expected);
  });
}

// RESTARTED, PRICE_CHANGE_CONFIRMED, DEFERRED, PAUSE_SCHEDULE_CHANGED, and codes Google adds.
for (const type of [7, 8, 9, 11, 14, 20, 0, -1, undefined]) {
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
    7, 8, 9, 11,
  ]);
  for (const t of Object.values(GOOGLE_NOTIFICATION_TYPES)) {
    assertEquals(googleCovered.has(t), true, `google ${t} has no row in the table`);
  }
});
