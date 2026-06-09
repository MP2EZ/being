/**
 * Receipt AES-256-GCM round-trip (INFRA-260 PR2) — Node-native test.
 *
 * The edge helper lives in Deno-land (supabase/functions/_shared) and uses only
 * Web Crypto, so it can't be reached by the app's jest tree (different
 * node_modules root) and deno isn't installed. This runs it under Node, which has
 * the same Web Crypto APIs as the edge runtime.
 *
 * Run (Node >= 22.6):
 *   node --experimental-strip-types --test supabase/tests/receiptCrypto.node.test.mjs
 * Last validated: 2026-06-07 (Node v22.19) — all pass.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptReceipt, decryptReceipt, receiptHash } from '../functions/_shared/receiptCrypto.ts';

function makeKeyB64(bytes = 32) {
  const raw = new Uint8Array(bytes);
  crypto.getRandomValues(raw);
  return Buffer.from(raw).toString('base64');
}

const KEY = makeKeyB64();
const RECEIPT = 'A'.repeat(2500) + '·receipt·' + 'Z'.repeat(500);

test('round-trips a receipt byte-identical', async () => {
  const blob = await encryptReceipt(RECEIPT, KEY);
  assert.ok(!blob.includes(RECEIPT.slice(0, 32)), 'blob must be ciphertext, not plaintext');
  assert.equal(await decryptReceipt(blob, KEY), RECEIPT);
});

test('fresh IV per call → identical plaintext yields different ciphertext', async () => {
  const a = await encryptReceipt(RECEIPT, KEY);
  const b = await encryptReceipt(RECEIPT, KEY);
  assert.notEqual(a, b);
  assert.equal(await decryptReceipt(a, KEY), await decryptReceipt(b, KEY));
});

test('embeds version byte 1 for forward-compatible key rotation', async () => {
  const blob = await encryptReceipt('x', KEY);
  assert.equal(Buffer.from(blob, 'base64')[0], 1);
});

test('fails closed on a missing or wrong-length key', async () => {
  await assert.rejects(() => encryptReceipt(RECEIPT, undefined), /not configured/);
  await assert.rejects(() => encryptReceipt(RECEIPT, makeKeyB64(16)), /32 bytes/);
});

test('rejects a tampered ciphertext (GCM auth tag)', async () => {
  const blob = await encryptReceipt(RECEIPT, KEY);
  const bytes = Buffer.from(blob, 'base64');
  bytes[bytes.length - 1] ^= 0xff;
  await assert.rejects(() => decryptReceipt(bytes.toString('base64'), KEY));
});

test('cannot decrypt with a different key', async () => {
  const blob = await encryptReceipt(RECEIPT, KEY);
  await assert.rejects(() => decryptReceipt(blob, makeKeyB64()));
});

test('hashes deterministically to 64 hex chars (non-reversible)', async () => {
  const h1 = await receiptHash(RECEIPT);
  const h2 = await receiptHash(RECEIPT);
  assert.equal(h1, h2);
  assert.match(h1, /^[a-f0-9]{64}$/);
  assert.ok(!h1.includes(RECEIPT.slice(0, 16)));
});
