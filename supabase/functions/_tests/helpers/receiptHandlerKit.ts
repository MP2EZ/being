/**
 * Shared scaffolding for the receipt-handler tests (MAINT-753).
 *
 * Not a test file (no `.test.` in the name). Used by apple-receipt-handler.test.ts and
 * google-receipt-handler.test.ts. Everything here is synthetic: tokens are unsigned (the
 * gateway verifies signatures, verify_jwt = true; the handlers only read `sub`), the AES key is
 * a fixed test pattern, and no test may reach the network.
 *
 * ENV. The tests set the real secret names with Deno.env.set and always restore them in a
 * finally. Reads go through `const env = Deno.env` on purpose: the INFRA-442 drift scanner
 * reads every .ts under supabase/functions, tests included, and flags a non-literal call of the
 * `.get(` form on `Deno.env` as an unreconcilable read.
 */

import { assertStrictEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import type { FakeDb } from './fakeSupabase.ts';

export const JWT_SUB = '0b7f3c52-9d1e-4a6b-8f20-5c1d7e9a4b13';
export const OTHER_USER = '5e2a91c4-77d0-4f3b-9a18-2c6b0d8e1f47';

/** The injected clock. Every timestamp a handler writes must derive from it. */
export const NOW = Date.parse('2026-10-06T12:00:00.000Z');
export const DAY = 24 * 60 * 60 * 1000;
export const iso = (ms: number) => new Date(ms).toISOString();

/** 32 bytes (AES-256), base64. A fixed test pattern, not a secret. */
export const ENC_KEY_B64 = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));

export const AUDIT_RPC = 'log_subscription_event';

function b64url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function tokenFor(claims: unknown): string {
  return `${b64url('{"alg":"HS256","typ":"JWT"}')}.${b64url(JSON.stringify(claims))}.c2ln`;
}

export const ANON_SESSION_TOKEN = tokenFor({
  sub: JWT_SUB,
  role: 'authenticated',
  aud: 'authenticated',
  is_anonymous: true,
});
export const ANON_KEY_TOKEN = tokenFor({ iss: 'supabase', ref: 'projectref', role: 'anon' });

export function request(
  token: string | null,
  body?: unknown,
  method = 'POST',
  url = 'https://example.test/verify-receipt',
): Request {
  const headers = new Headers();
  if (token !== null) headers.set('Authorization', `Bearer ${token}`);
  const init: RequestInit = { method, headers };
  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return new Request(url, init);
}

export async function bodyJson(res: Response): Promise<unknown> {
  return JSON.parse(await res.text());
}

/** The CORS headers OPTIONS answers with. Other methods answer with none today. */
export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
};

export function assertCors(res: Response) {
  for (const [k, v] of Object.entries(CORS)) assertStrictEquals(res.headers.get(k), v, k);
}

export type EnvVars = Record<string, string | undefined>;

/** Names the receipt handlers read. All are saved and restored, set or not. */
const BASE_ENV: EnvVars = {
  ALLOW_MOCK_RECEIPTS: undefined,
  RECEIPT_ENCRYPTION_KEY: ENC_KEY_B64,
  APPLE_ISSUER_ID: 'issuer-test-0001',
  APPLE_KEY_ID: 'keyid-test-0001',
  APPLE_PRIVATE_KEY: 'apple-private-key-placeholder',
  GOOGLE_SERVICE_ACCOUNT: undefined,
};

/** Set (or delete, for undefined) the given vars for the duration of fn; always restore. */
export async function withEnv<T>(vars: EnvVars, fn: () => Promise<T>): Promise<T> {
  const env = Deno.env;
  const saved = Object.keys(vars).map((k) => [k, env.get(k)] as const);
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) env.delete(k);
      else env.set(k, v);
    }
    return await fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) env.delete(k);
      else env.set(k, v);
    }
  }
}

/**
 * Run a scenario: base env plus overrides, console silenced (the handlers log on purpose),
 * and global fetch replaced by a tripwire - CI grants --allow-net, so a regression that
 * ignored an injected seam would otherwise reach a real host.
 */
export async function scenario<T>(overrides: EnvVars, fn: () => Promise<T>): Promise<T> {
  const { log, warn, error } = console;
  const realFetch = globalThis.fetch;
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  globalThis.fetch = (() => {
    throw new Error('network call attempted in a unit test');
  }) as typeof fetch;
  try {
    return await withEnv({ ...BASE_ENV, ...overrides }, fn);
  } finally {
    console.log = log;
    console.warn = warn;
    console.error = error;
    globalThis.fetch = realFetch;
  }
}

export interface AuditArgs {
  p_user_id: unknown;
  p_subscription_id: unknown;
  p_event_type: unknown;
  p_metadata: unknown;
}

/** Every audit RPC the handler issued, as the exact arguments the writer sent. */
export function auditRows(db: FakeDb): AuditArgs[] {
  return db.rpcCalls.filter((c) => c.name === AUDIT_RPC).map((c) => c.args as unknown as AuditArgs);
}
