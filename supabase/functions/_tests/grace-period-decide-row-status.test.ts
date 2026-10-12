/**
 * INFRA-741 — the daily job's row decision (`grace-period-automation/decideRowStatus.ts`).
 *
 * The store-state decision is shared with the webhook and pinned by
 * subscription-status-parity.test.ts; these cases do not repeat its table. They pin what is
 * local to the cron: the trial overlay, the ISO shape of the write, the strict grace boundary
 * as the cron sees it, and that billing retry alone never buys a grace row (DEBUG-772).
 */

import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { decideRowStatus } from '../grace-period-automation/decideRowStatus.ts';

const NOW = Date.parse('2026-10-12T12:00:00.000Z');
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

Deno.test('a trial inside its period stays a trial; any other live row is active', () => {
  const txn = { expiresDate: NOW + 3 * DAY };
  assertEquals(decideRowStatus(txn, {}, 'trial', NOW), { status: 'trial', expiresDateIso: iso(NOW + 3 * DAY) });
  assertEquals(decideRowStatus(txn, {}, 'active', NOW), { status: 'active', expiresDateIso: iso(NOW + 3 * DAY) });
  assertEquals(decideRowStatus(txn, {}, 'grace', NOW), { status: 'active', expiresDateIso: iso(NOW + 3 * DAY) });
});

Deno.test('revocation beats a future expiry, and a trial overlay never resurrects it', () => {
  const txn = { revocationDate: NOW - DAY, expiresDate: NOW + 10 * DAY };
  assertEquals(decideRowStatus(txn, {}, 'active', NOW), { status: 'expired' });
  assertEquals(decideRowStatus(txn, {}, 'trial', NOW), { status: 'expired' });
});

Deno.test('the grace boundary is strict: graceEnd > now, at equal and ±1 ms', () => {
  const expiresDate = NOW - DAY;
  const at = (graceEnd: number) =>
    decideRowStatus({ expiresDate }, { gracePeriodExpiresDate: graceEnd }, 'active', NOW);

  assertEquals(at(NOW + 1), { status: 'grace', expiresDateIso: iso(expiresDate), gracePeriodEndIso: iso(NOW + 1) });
  assertEquals(at(NOW), { status: 'expired', expiresDateIso: iso(expiresDate) });
  assertEquals(at(NOW - 1), { status: 'expired', expiresDateIso: iso(expiresDate) });
});

Deno.test('a trial past its expiry inside a signed grace period is grace, not trial', () => {
  const expiresDate = NOW - DAY;
  assertEquals(
    decideRowStatus({ expiresDate }, { gracePeriodExpiresDate: NOW + 5 * DAY }, 'trial', NOW),
    { status: 'grace', expiresDateIso: iso(expiresDate), gracePeriodEndIso: iso(NOW + 5 * DAY) },
  );
});

Deno.test('billing retry WITHOUT a signed grace period is expired, never an open-ended grace row', () => {
  assertEquals(
    decideRowStatus({ expiresDate: NOW - DAY }, { isInBillingRetryPeriod: true }, 'active', NOW),
    { status: 'expired', expiresDateIso: iso(NOW - DAY) },
  );
});

Deno.test('a past expiry with no renewal info is expired', () => {
  assertEquals(
    decideRowStatus({ expiresDate: NOW - 2 * DAY }, {}, 'trial', NOW),
    { status: 'expired', expiresDateIso: iso(NOW - 2 * DAY) },
  );
});

Deno.test('a missing or non-positive expiresDate is undecidable: null, which the job counts malformed', () => {
  for (const txn of [{}, { expiresDate: 0 }, { expiresDate: -5 }, { expiresDate: 'soon' }]) {
    assertEquals(decideRowStatus(txn, {}, 'active', NOW), null);
  }
});
