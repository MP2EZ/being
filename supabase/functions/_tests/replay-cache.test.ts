/**
 * replayCache.ts behavioral tests (TEST-10 sub-A)
 *
 * Validates the idempotency/replay-protection helpers for the subscription
 * webhook handler. Each test uses an in-memory mock Supabase client that
 * mimics the subset of the JS client used by replayCache.
 *
 * Coverage:
 *   - wasProcessed returns false for unknown notification (cache miss)
 *   - wasProcessed returns true for previously-inserted notification
 *   - wasProcessed returns false on missing notification_id (defensive)
 *   - wasProcessed throws on unexpected DB errors (fail fast)
 *   - markProcessed inserts a row with source+notification_id
 *   - markProcessed swallows unique-constraint violation (concurrent insert)
 *   - markProcessed throws on other DB errors
 *   - markProcessed no-ops on empty notification_id
 */

import {
  assertEquals,
  assertRejects,
  assert,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { wasProcessed, markProcessed, type WebhookSource } from '../subscription-webhook/replayCache.ts';

interface CacheRow {
  source: WebhookSource;
  notification_id: string;
}

/**
 * Minimal mock of the Supabase JS client that exercises only the surface
 * area used by replayCache.ts. Stores in-memory rows that survive across
 * .from(...).select() and .from(...).insert() calls.
 */
function makeMockSupabase(opts?: {
  selectError?: { message: string };
  insertError?: { code?: string; message: string };
}) {
  const rows: CacheRow[] = [];

  return {
    rows, // exposed for assertions
    from(_table: string) {
      let filters: Partial<CacheRow> = {};
      return {
        select(_cols: string) {
          return {
            eq(col: keyof CacheRow, val: string) {
              filters = { ...filters, [col]: val };
              return this;
            },
            maybeSingle() {
              if (opts?.selectError) {
                return Promise.resolve({ data: null, error: opts.selectError });
              }
              const match = rows.find(
                (r) => r.source === filters.source && r.notification_id === filters.notification_id
              );
              return Promise.resolve({ data: match ?? null, error: null });
            },
          };
        },
        insert(row: CacheRow) {
          if (opts?.insertError) {
            return Promise.resolve({ data: null, error: opts.insertError });
          }
          const dup = rows.find(
            (r) => r.source === row.source && r.notification_id === row.notification_id
          );
          if (dup) {
            return Promise.resolve({
              data: null,
              error: { code: '23505', message: 'unique violation' },
            });
          }
          rows.push(row);
          return Promise.resolve({ data: row, error: null });
        },
      };
    },
  };
}

Deno.test('wasProcessed: returns false for unknown notification (cache miss)', async () => {
  const supabase = makeMockSupabase();
  assertEquals(await wasProcessed(supabase, 'apple', 'unknown-uuid'), false);
});

Deno.test('wasProcessed: returns true after markProcessed (round-trip)', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'apple', 'uuid-1');
  assertEquals(await wasProcessed(supabase, 'apple', 'uuid-1'), true);
});

Deno.test('wasProcessed: source-scoped (apple uuid does not match google uuid)', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'apple', 'shared-id');
  assertEquals(await wasProcessed(supabase, 'google', 'shared-id'), false);
});

Deno.test('wasProcessed: returns false on empty notification_id (defensive — caller proceeds)', async () => {
  const supabase = makeMockSupabase();
  assertEquals(await wasProcessed(supabase, 'apple', ''), false);
});

Deno.test('wasProcessed: throws on unexpected DB errors (fail fast, no silent double-process)', async () => {
  const supabase = makeMockSupabase({ selectError: { message: 'connection refused' } });
  await assertRejects(
    () => wasProcessed(supabase, 'apple', 'uuid-2'),
    Error,
    'Replay-cache check failed'
  );
});

Deno.test('markProcessed: inserts a row with source + notification_id', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'google', 'msg-id-99');
  assertEquals(supabase.rows.length, 1);
  assertEquals(supabase.rows[0]!.source, 'google');
  assertEquals(supabase.rows[0]!.notification_id, 'msg-id-99');
});

Deno.test('markProcessed: swallows unique-constraint violation (concurrent insert race)', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'apple', 'race-uuid');
  // Second insert with same key → unique violation (code 23505) — should NOT throw
  await markProcessed(supabase, 'apple', 'race-uuid');
  // Only one row exists (the first insert won)
  assertEquals(supabase.rows.length, 1);
});

Deno.test('markProcessed: throws on non-unique-violation DB errors', async () => {
  const supabase = makeMockSupabase({
    insertError: { code: '08000', message: 'connection_exception' },
  });
  await assertRejects(
    () => markProcessed(supabase, 'apple', 'uuid-error'),
    Error,
    'Replay-cache mark failed'
  );
});

Deno.test('markProcessed: no-ops on empty notification_id (defensive)', async () => {
  const supabase = makeMockSupabase();
  await markProcessed(supabase, 'apple', '');
  assertEquals(supabase.rows.length, 0);
});

Deno.test('integration: wasProcessed → markProcessed → wasProcessed flow', async () => {
  const supabase = makeMockSupabase();

  // First arrival: not yet processed
  assertEquals(await wasProcessed(supabase, 'apple', 'flow-uuid'), false);

  // Process the notification, then mark
  await markProcessed(supabase, 'apple', 'flow-uuid');

  // Replay (Apple retry): now seen
  assert(await wasProcessed(supabase, 'apple', 'flow-uuid'));
});
