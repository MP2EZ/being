/**
 * Receipt encryption + hashing for the IAP verification edge functions (INFRA-260 PR2).
 *
 * The `subscriptions.receipt_data_encrypted` column previously stored the raw
 * receipt in plaintext (a `// TODO: Encrypt this`). Receipts are a bearer
 * credential for subscription state, so they are now encrypted at rest with
 * AES-256-GCM before the upsert and decrypted only in the edge function when
 * re-verifying against Apple/Google. The key lives in the RECEIPT_ENCRYPTION_KEY
 * function secret — NEVER the service-role key, and never the device.
 *
 * Stored format (base64 of): version(1) ∥ iv(12) ∥ ciphertext+gcmTag.
 * The 1-byte version prefix lets a future key rotation decrypt old blobs.
 *
 * Pure Web Crypto (crypto.subtle / crypto.getRandomValues / TextEncoder) — no
 * Deno- or Node-specific APIs — so it runs unchanged in the edge runtime and is
 * unit-testable under Node/jest.
 */

const VERSION = 1;
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32; // AES-256

function b64encode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Import the 32-byte AES key from a base64 secret. Throws if the secret is
 * missing or the wrong length — a misconfigured key must fail loud, not silently
 * store weakly-protected receipts.
 */
async function importKey(keyB64: string | undefined): Promise<CryptoKey> {
  if (!keyB64) {
    throw new Error('RECEIPT_ENCRYPTION_KEY is not configured');
  }
  const raw = b64decode(keyB64);
  if (raw.length !== KEY_BYTES) {
    throw new Error(`RECEIPT_ENCRYPTION_KEY must be ${KEY_BYTES} bytes (base64); got ${raw.length}`);
  }
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Encrypt a receipt → base64(version ∥ iv ∥ ciphertext+tag). Fresh random IV per call. */
export async function encryptReceipt(plaintext: string, keyB64: string | undefined): Promise<string> {
  const key = await importKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)),
  );
  const out = new Uint8Array(1 + IV_BYTES + ct.length);
  out[0] = VERSION;
  out.set(iv, 1);
  out.set(ct, 1 + IV_BYTES);
  return b64encode(out);
}

/** Decrypt a base64(version ∥ iv ∥ ciphertext+tag) blob back to the receipt string. */
export async function decryptReceipt(blobB64: string, keyB64: string | undefined): Promise<string> {
  const key = await importKey(keyB64);
  const blob = b64decode(blobB64);
  if (blob.length < 1 + IV_BYTES + 16) {
    throw new Error('Ciphertext too short / malformed');
  }
  if (blob[0] !== VERSION) {
    throw new Error(`Unsupported receipt key version: ${blob[0]}`);
  }
  const iv = blob.slice(1, 1 + IV_BYTES);
  const ct = blob.slice(1 + IV_BYTES);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/** SHA-256 hex of the raw receipt/token — for idempotent re-verify + dedup. */
export async function receiptHash(plaintext: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plaintext));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
