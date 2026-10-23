/**
 * The fakeDb upsert / failRpc extension (MAINT-753).
 *
 * The receipt handler tests lean on these two capabilities; a fake that silently recorded
 * nothing, or never failed on request, would make "no upsert happened" and "audit RPC error
 * stays non-fatal" assertions vacuous. These pin the fake itself, so those tests cannot pass
 * against a broken one.
 */

import { assert, assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { fakeDb, UUID_RE } from './helpers/fakeSupabase.ts';

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
  const db = fakeDb({ subscriptions: [{ id: SEEDED_ID, user_id: 'u1', status: 'trial' }] });
  await db.client.from('subscriptions').upsert({ user_id: 'u1', status: 'active' }, { onConflict: 'user_id' });
  await db.client.from('subscriptions').upsert({ user_id: 'u2', status: 'active' }, { onConflict: 'user_id' });
  const [replaced, appended] = db.tables.subscriptions;
  assertEquals(db.tables.subscriptions.length, 2);
  assertEquals(replaced, { id: SEEDED_ID, user_id: 'u1', status: 'active' });
  assertEquals({ ...appended, id: undefined }, { id: undefined, user_id: 'u2', status: 'active' });
});

// ---------------------------------------------------------------------------
// DEBUG-836: upsert(...).select(...) RETURNING, Postgres-like ids, uuid-typed audit RPC
// ---------------------------------------------------------------------------

const SEEDED_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

Deno.test('fakeDb: upsert().select(id).single() resolves the written row id; an insert gets a uuid', async () => {
  const db = fakeDb();
  const res = await db.client.from('subscriptions').upsert({ user_id: 'u1' }, { onConflict: 'user_id' })
    .select('id').single();
  assertEquals(res.error, null);
  assertEquals(Object.keys(res.data), ['id']);
  assert(UUID_RE.test(res.data.id as string), `not a uuid: ${res.data.id}`);
  assertEquals(db.tables.subscriptions[0].id, res.data.id);
});

Deno.test('fakeDb: a conflict-replace keeps the existing row id, as ON CONFLICT DO UPDATE does', async () => {
  const db = fakeDb({ subscriptions: [{ id: SEEDED_ID, user_id: 'u1', status: 'trial' }] });
  const res = await db.client.from('subscriptions').upsert({ user_id: 'u1', status: 'active' }, { onConflict: 'user_id' })
    .select('id').maybeSingle();
  assertEquals(res, { data: { id: SEEDED_ID }, error: null });
});

Deno.test('fakeDb: a failed upsert().select().single() resolves { data: null, error }', async () => {
  const db = fakeDb();
  db.failOn('subscriptions', 'upsert', { code: '23505' });
  const res = await db.client.from('subscriptions').upsert({ user_id: 'u1' }, { onConflict: 'user_id' })
    .select('id').single();
  assertEquals(res, { data: null, error: { code: '23505' } });
  assertEquals(db.tables.subscriptions, []);
});

Deno.test('fakeDb: log_subscription_event rejects a non-uuid p_subscription_id with 22P02, without echoing it', async () => {
  const db = fakeDb();
  const bad = await db.client.rpc('log_subscription_event', { p_user_id: 'u1', p_subscription_id: '2000000847061713' });
  assertEquals(bad.error?.code, '22P02');
  assert(!JSON.stringify(bad.error).includes('2000000847061713'), 'the rejected value is echoed');
  const okNull = await db.client.rpc('log_subscription_event', { p_user_id: 'u1', p_subscription_id: null });
  assertEquals(okNull.error, null);
  const okUuid = await db.client.rpc('log_subscription_event', { p_user_id: 'u1', p_subscription_id: SEEDED_ID });
  assertEquals(okUuid.error, null);
  // Other RPCs are untouched by the check.
  assertEquals((await db.client.rpc('something_else', { p_subscription_id: 'x' })).error, null);
  assertEquals(db.rpcCalls.length, 4, 'a rejected call is still recorded');
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
