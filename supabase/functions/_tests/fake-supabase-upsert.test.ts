/**
 * The fakeDb upsert / failRpc extension (MAINT-753).
 *
 * The receipt handler tests lean on these two capabilities; a fake that silently recorded
 * nothing, or never failed on request, would make "no upsert happened" and "audit RPC error
 * stays non-fatal" assertions vacuous. These pin the fake itself, so those tests cannot pass
 * against a broken one.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { fakeDb } from './helpers/fakeSupabase.ts';

Deno.test('fakeDb.upsert records each call with its options and a copy of the row', async () => {
  const db = fakeDb();
  const row = { user_id: 'u1', status: 'active' };
  const { error } = await db.client.from('subscriptions').upsert(row, { onConflict: 'user_id' });
  assertEquals(error, null);
  row.status = 'mutated-after-the-call';
  assertEquals(db.upserts, [
    { table: 'subscriptions', row: { user_id: 'u1', status: 'active' }, options: { onConflict: 'user_id' } },
  ]);
});

Deno.test('fakeDb.upsert replaces the row sharing the onConflict column, else appends', async () => {
  const db = fakeDb({ subscriptions: [{ user_id: 'u1', status: 'trial' }] });
  await db.client.from('subscriptions').upsert({ user_id: 'u1', status: 'active' }, { onConflict: 'user_id' });
  await db.client.from('subscriptions').upsert({ user_id: 'u2', status: 'active' }, { onConflict: 'user_id' });
  assertEquals(db.tables.subscriptions, [
    { user_id: 'u1', status: 'active' },
    { user_id: 'u2', status: 'active' },
  ]);
});

Deno.test('fakeDb.failOn(upsert) fails once, still records the attempt, and writes no row', async () => {
  const db = fakeDb();
  db.failOn('subscriptions', 'upsert', { code: '23505', message: 'duplicate key value' });
  const first = await db.client.from('subscriptions').upsert({ user_id: 'u1' }, { onConflict: 'user_id' });
  assertEquals(first.error, { code: '23505', message: 'duplicate key value' });
  assertEquals(db.tables.subscriptions, []);
  assertEquals(db.upserts.length, 1);
  const second = await db.client.from('subscriptions').upsert({ user_id: 'u1' }, { onConflict: 'user_id' });
  assertEquals(second.error, null);
  assertEquals(db.tables.subscriptions.length, 1);
});

Deno.test('fakeDb.failRpc fails the named RPC once and leaves other RPCs alone', async () => {
  const db = fakeDb();
  db.failRpc('log_subscription_event', { message: 'check violation' });
  const other = await db.client.rpc('something_else', {});
  assertEquals(other.error, null);
  const failed = await db.client.rpc('log_subscription_event', { p_user_id: 'u1' });
  assertEquals(failed.error, { message: 'check violation' });
  const again = await db.client.rpc('log_subscription_event', { p_user_id: 'u1' });
  assertEquals(again.error, null);
  assert(db.rpcCalls.length === 3, 'every call is recorded, failed or not');
});

// ---------------------------------------------------------------------------
// DEBUG-751: update(...).select(...), .is(), beforeUpdate()
// ---------------------------------------------------------------------------

Deno.test('fakeDb: update().eq().eq().select() resolves the matched rows, and only they are patched', async () => {
  const db = fakeDb({ subscriptions: [{ id: 'a', v: 1, status: 'x' }, { id: 'b', v: 2, status: 'x' }] });
  const hit = await db.client.from('subscriptions').update({ status: 'y' }).eq('id', 'a').eq('v', 1).select('id');
  assertEquals(hit, { data: [{ id: 'a' }], error: null });
  const miss = await db.client.from('subscriptions').update({ status: 'z' }).eq('id', 'b').eq('v', 99).select('id');
  assertEquals(miss, { data: [], error: null });
  assertEquals(db.tables.subscriptions.map((r) => r.status), ['y', 'x']);
});

Deno.test('fakeDb: an update without select() still resolves { error } only', async () => {
  const db = fakeDb({ subscriptions: [{ id: 'a' }] });
  assertEquals(await db.client.from('subscriptions').update({ s: 1 }).eq('id', 'a'), { error: null });
});

Deno.test('fakeDb: a failed update().select() resolves { data: null, error }', async () => {
  const db = fakeDb({ subscriptions: [{ id: 'a' }] });
  db.failOn('subscriptions', 'update', { code: '42501' });
  assertEquals(
    await db.client.from('subscriptions').update({ s: 1 }).eq('id', 'a').select('id'),
    { data: null, error: { code: '42501' } },
  );
});

Deno.test('fakeDb: is(col, null) matches a null or absent column', async () => {
  const db = fakeDb({ subscriptions: [{ id: 'a', t: null }, { id: 'b' }, { id: 'c', t: 'x' }] });
  const r = await db.client.from('subscriptions').update({ s: 1 }).is('t', null).select('id');
  assertEquals(r.data.map((x: { id: string }) => x.id), ['a', 'b']);
});

Deno.test('fakeDb: beforeUpdate runs once, before the filters match, and reads return copies', async () => {
  const db = fakeDb({ subscriptions: [{ id: 'a', u: 1 }] });
  const { data: read } = await db.client.from('subscriptions').select('id, u').eq('id', 'a').maybeSingle();
  db.beforeUpdate('subscriptions', () => {
    db.tables.subscriptions[0].u = 2;
  });
  const raced = await db.client.from('subscriptions').update({ s: 1 }).eq('id', 'a').eq('u', read.u).select('id');
  assertEquals(raced.data, []);
  const again = await db.client.from('subscriptions').update({ s: 1 }).eq('id', 'a').eq('u', 2).select('id');
  assertEquals(again.data.length, 1);
});
