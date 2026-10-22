/**
 * FEAT-833: the transfer status set and RPC outcomes are closed, and the tombstone column
 * list in TS matches the migration's UPDATE.
 *
 * The SQL behaviour itself is pinned by supabase/tests/feat833_subscription_transfer.sql,
 * which is hand-run (no CI job reaches a Postgres). This file is the CI-run half: it fails if
 * a status is added or renumbered without a deliberate edit here, or if the migration NULLs a
 * column the shared constant does not name (or the reverse).
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  TOMBSTONE_NULLED_COLUMNS,
  TRANSFER_RPC_OUTCOMES,
  TRANSFER_STATUSES,
} from '../_shared/subscriptionTransfer.ts';

Deno.test('FEAT-833: the transfer status set is exactly these eight, with these HTTP codes', () => {
  const actual = Object.fromEntries(Object.entries(TRANSFER_STATUSES).map(([k, v]) => [k, v.http]));
  assertEquals(actual, {
    transferred: 200,
    transfer_request_invalid: 400,
    transfer_proof_rejected: 403,
    bound_elsewhere: 409,
    transfer_not_eligible: 422,
    transfer_rate_limited: 429,
    store_unavailable: 503,
    transfer_internal: 500,
  });
});

Deno.test('FEAT-833: every status states its meaning, and no two share an HTTP code', () => {
  const codes = Object.values(TRANSFER_STATUSES).map((s) => s.http);
  assertEquals(new Set(codes).size, codes.length);
  for (const [k, v] of Object.entries(TRANSFER_STATUSES)) {
    assert(v.meaning.trim().length > 0, `${k} has no meaning`);
  }
});

Deno.test('FEAT-833: the RPC outcome set is exactly these seven', () => {
  assertEquals([...TRANSFER_RPC_OUTCOMES].sort(), [
    'caller_has_live_row',
    'cas_miss',
    'not_found',
    'proof_reused',
    'rate_limited',
    'same_holder',
    'transferred',
  ]);
});

const MIGRATION = new URL('../../migrations/20261021000000_subscription_transfer.sql', import.meta.url);

/** The `SET col = NULL` assignments of the tombstone UPDATE, comments stripped. */
async function migrationTombstoneNulls(): Promise<string[]> {
  const sql = (await Deno.readTextFile(MIGRATION)).replace(/--.*$/gm, '');
  const m = sql.match(/UPDATE\s+public\.subscriptions\s+SET([\s\S]*?)WHERE\s+id\s*=\s*v_old\.id/);
  assert(m, 'the tombstone UPDATE was not found in the migration');
  return [...m[1].matchAll(/(\w+)\s*=\s*NULL\b/g)].map((x) => x[1]);
}

Deno.test('FEAT-833 (source pin): the migration NULLs exactly TOMBSTONE_NULLED_COLUMNS, in order', async () => {
  assertEquals(await migrationTombstoneNulls(), [...TOMBSTONE_NULLED_COLUMNS]);
});

Deno.test('FEAT-833 (source pin): the tombstone never moves user_id and the function never DELETEs a subscription', async () => {
  const sql = (await Deno.readTextFile(MIGRATION)).replace(/--.*$/gm, '');
  assert(/UPDATE\s+public\.subscriptions\s+SET/.test(sql), 'the tombstone UPDATE was not found');
  assert(!/UPDATE\s+public\.subscriptions\s+SET[^;]*\buser_id\s*=/.test(sql), 'the tombstone assigns user_id');
  assert(/DO UPDATE SET/.test(sql), 'the caller upsert was not found');
  assert(!/DO UPDATE SET[^;]*\buser_id\s*=/.test(sql), 'the caller upsert reassigns user_id');
  assert(!/DELETE\s+FROM\s+public\.subscriptions\b/.test(sql), 'the migration deletes from subscriptions');
});

Deno.test('control: the column parser finds an assignment it is shown', async () => {
  // Non-vacuity: if the regex matched nothing, the equality above would compare [] to a list
  // and fail loudly, but a parser that returned a fixed list would not. Exercise it directly.
  const sample = 'UPDATE public.subscriptions SET\n  a = NULL,\n  b = 1,\n  c = NULL\nWHERE id = v_old.id;';
  const m = sample.match(/UPDATE\s+public\.subscriptions\s+SET([\s\S]*?)WHERE\s+id\s*=\s*v_old\.id/);
  assert(m);
  assertEquals([...m[1].matchAll(/(\w+)\s*=\s*NULL\b/g)].map((x) => x[1]), ['a', 'c']);
  assertEquals((await migrationTombstoneNulls()).length, TOMBSTONE_NULLED_COLUMNS.length);
});
