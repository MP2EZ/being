/**
 * INFRA-467 slice 3 — App Store Server API cutover.
 *
 * TWO CONCERNS, ONE FILE, following `apple-app-scope.test.ts`'s precedent: unit tests over
 * the extracted claim logic, then source-shape pins on the call site. The call site cannot
 * be imported — `verify-apple-receipt/index.ts` calls `serve()` at module top — which is
 * exactly why the decision logic was extracted to `_shared/appleTransactionClaims.ts`
 * rather than left inline where nothing could reach it.
 *
 * THE FAILURE THIS FILE EXISTS FOR. The legacy path derived trial status from
 * `latest_receipt_info[0].is_trial_period === 'true'`. The App Store Server API has no such
 * field. Omitting the replacement mapping does not throw, does not log, and does not fail a
 * type check — it silently writes EVERY trial subscriber as `active`. A silent billing-state
 * error is worth more test surface than a loud one.
 */

import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  AppleTransactionClaims,
  isFreeTrial,
  OFFER_TYPE_INTRODUCTORY,
  parseTransaction,
} from '../_shared/appleTransactionClaims.ts';

const NOW = 1_700_000_000_000;
const FUTURE = NOW + 30 * 24 * 60 * 60 * 1000;
const PAST = NOW - 1;

const BASE: AppleTransactionClaims = {
  productId: 'com.being.subscription.monthly',
  originalTransactionId: '2000000847061713',
  expiresDate: FUTURE,
};

// ---------------------------------------------------------------------------
// Trial mapping
// ---------------------------------------------------------------------------

Deno.test('an explicit FREE_TRIAL offer is a trial', () => {
  assertEquals(isFreeTrial({ offerType: 1, offerDiscountType: 'FREE_TRIAL' }), true);
});

Deno.test('THE REGRESSION — a trial subscriber is never written as active', () => {
  // This is the whole point. If isFreeTrial ever returns false here, updateSubscription
  // takes its `status = 'active'` default and the user is billed-state-wrong with no error
  // anywhere. Asserted through parseTransaction, not just the predicate, so the mapping
  // cannot be correct in isolation while being dropped on the way out.
  const result = parseTransaction(
    { ...BASE, offerType: 1, offerDiscountType: 'FREE_TRIAL' },
    'Production',
    NOW,
  );
  assertEquals(result.isTrialPeriod, true);
  assertEquals(result.valid, true);
});

Deno.test('paid introductory offers are NOT trials', () => {
  // A discounted first period is still a payment. Marking these `trial` would be wrong in
  // the other direction, so the ambiguity resolution below must not swallow them.
  assertEquals(isFreeTrial({ offerType: 1, offerDiscountType: 'PAY_AS_YOU_GO' }), false);
  assertEquals(isFreeTrial({ offerType: 1, offerDiscountType: 'PAY_UP_FRONT' }), false);
});

Deno.test('an introductory offer with NO stated discount type resolves toward trial', () => {
  // Older payload versions omit offerDiscountType. The asymmetry is deliberate and is
  // documented at the function: billing a trial user as active is the failure being
  // prevented; treating a discounted-but-paid offer as a trial is corrected at renewal.
  assertEquals(isFreeTrial({ offerType: OFFER_TYPE_INTRODUCTORY }), true);
  assertEquals(OFFER_TYPE_INTRODUCTORY, 1);
});

Deno.test('a plain renewal with no offer is not a trial', () => {
  assertEquals(isFreeTrial({}), false);
  assertEquals(isFreeTrial({ offerType: 2, offerDiscountType: 'PAY_UP_FRONT' }), false);
  // Promotional offer (type 2) with no discount type must NOT inherit the type-1 rule.
  assertEquals(isFreeTrial({ offerType: 2 }), false);
});

// ---------------------------------------------------------------------------
// parseTransaction
// ---------------------------------------------------------------------------

Deno.test('an unexpired, unrevoked transaction is valid and carries its identity', () => {
  const result = parseTransaction(BASE, 'Production', NOW);
  assertEquals(result.valid, true);
  assertEquals(result.subscriptionId, '2000000847061713');
  assertEquals(result.productId, 'com.being.subscription.monthly');
  assertEquals(result.expiresDate, new Date(FUTURE).toISOString());
  assertEquals(result.environment, 'Production');
});

Deno.test('an expired transaction is invalid', () => {
  assertEquals(parseTransaction({ ...BASE, expiresDate: PAST }, 'Production', NOW).valid, false);
});

Deno.test('a REVOKED transaction is invalid even while unexpired', () => {
  // Refunds arrive as a revocationDate on a transaction whose expiry is still in the
  // future. Reading expiry alone would keep granting entitlement to a refunded purchase.
  const result = parseTransaction(
    { ...BASE, revocationDate: NOW - 1000 },
    'Production',
    NOW,
  );
  assertEquals(result.valid, false);
});

Deno.test('a missing expiresDate fails closed rather than defaulting to valid', () => {
  const result = parseTransaction({ originalTransactionId: '1' }, 'Production', NOW);
  assertEquals(result.valid, false);
  assertEquals(result.expiresDate, undefined);
});

Deno.test('autoRenewEnabled is NOT reinstated', () => {
  // It was written to no column and read by no client, and the Server API does not carry
  // it on the transaction — it lives on the separate subscription-status endpoint. Adding
  // it back would cost a second Apple round-trip and break the one-call rule to reproduce
  // a value nothing consumed.
  const result = parseTransaction(BASE, 'Production', NOW) as Record<string, unknown>;
  assertEquals('autoRenewEnabled' in result, false);
});

// ---------------------------------------------------------------------------
// Call-site pins — the parts that cannot be imported
// ---------------------------------------------------------------------------

/** Strip block and line comments so prose cannot satisfy a source assertion. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function verifierSource(): string {
  return stripComments(
    Deno.readTextFileSync(new URL('../verify-apple-receipt/index.ts', import.meta.url)),
  );
}

Deno.test('call site: the legacy verifyReceipt machinery is GONE, not merely unused', () => {
  const src = verifierSource();
  assert(src.length > 500, 'stripped source implausibly short — stripper is over-matching');

  // Each of these is a piece of the deprecated path. A dead branch that cannot execute
  // (APPLE_SHARED_SECRET is never provisioned) reads to the next maintainer as a working
  // fallback, which is worse than no fallback at all.
  for (const gone of ['APPLE_SHARED_SECRET', 'verifyReceipt', '21007', 'buy.itunes.apple.com']) {
    assertEquals(
      src.includes(gone),
      false,
      `verify-apple-receipt still references the legacy path: ${gone}`,
    );
  }
});

Deno.test('call site: verification is Apple-signed, app-scoped, and environment-matched', () => {
  const src = verifierSource();
  for (const required of ['fetchSignedTransactionInfo', 'verifyAppleJWS', 'assertAppleAppScope']) {
    assert(src.includes(required), `verify-apple-receipt does not call ${required}`);
  }

  // THE CROSS-CHECK. Without it the client's environment hint is load-bearing rather than
  // advisory, and a "Sandbox" claim buys a free entitlement — the same hole the deleted
  // 21007 fallback opened, re-entered from the other side.
  assert(
    /scope\.environment\s*!==\s*requestedEnvironment/.test(src),
    'verify-apple-receipt does not compare the SIGNED environment claim against the requested one',
  );
});

Deno.test('call site: the signed JWS is what gets hashed, not a bare identifier', () => {
  const src = verifierSource();
  // Hashing a ~13-digit integer would make the schema comment's "non-reversible" claim
  // false — that space is trivially enumerable.
  assert(
    /receiptHash\(\s*signedTransactionInfo\s*\)/.test(src),
    'receipt_hash is not computed over the verified signed JWS',
  );
  assert(
    /encryptReceipt\(\s*signedTransactionInfo\s*,/.test(src),
    'receipt_data_encrypted is not the verified signed JWS',
  );
});

Deno.test('call site: the cross-check runs BEFORE the claims are mapped', () => {
  const src = verifierSource();
  const crossCheck = src.search(/scope\.environment\s*!==\s*requestedEnvironment/);
  const mapping = src.search(/parseTransaction\(/);
  assert(crossCheck !== -1 && mapping !== -1, 'cross-check or mapping not found');
  assert(
    crossCheck < mapping,
    'the environment cross-check runs after the claims are mapped — a mismatched ' +
      'transaction would already have been turned into a verification result',
  );
});

Deno.test('CONTROL: the call-site matchers can go red, and stripping is not vacuous', () => {
  // Assertions by absence are worthless if the needle could never match (DEBUG-390).
  //
  // The fixture below deliberately does NOT spell the literal `Deno.env.get('NAME')` form.
  // `scripts/supabase-deploy-drift.js --reconcile` regex-scans every .ts file under
  // supabase/functions — `_tests/` included — and strips comments but not template
  // literals, so a realistic known-bad sample here reads to it as a genuine undeclared
  // env read and fails the Security + compliance job. The needle these assertions need is
  // the secret's NAME, not the call wrapping it.
  const knownBad = stripComments(`
    const password = readSecret('APPLE_SHARED_SECRET');
    if (appleResponse.status === 21007) { retry(); }
  `);
  assertEquals(knownBad.includes('APPLE_SHARED_SECRET'), true);
  assertEquals(knownBad.includes('21007'), true);

  // And the positive matchers must not be satisfiable by prose alone.
  const commentedOut = stripComments(`
    // if (scope.environment !== requestedEnvironment) { reject(); }
    /* receiptHash(signedTransactionInfo) */
  `);
  assertEquals(/scope\.environment\s*!==\s*requestedEnvironment/.test(commentedOut), false);
  assertEquals(/receiptHash\(\s*signedTransactionInfo\s*\)/.test(commentedOut), false);
});
