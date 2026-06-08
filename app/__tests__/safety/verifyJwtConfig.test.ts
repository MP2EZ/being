/**
 * verify_jwt config pin (INFRA-260 PR2) — mechanical guard.
 *
 * The receipt-verification edge functions read auth.uid() by DECODING the JWT
 * payload WITHOUT verifying its signature (supabase/functions/verify-apple-receipt
 * getAuthUidFromRequest). That is safe ONLY because Supabase's gateway
 * cryptographically verifies the JWT first — which it does ONLY when the
 * function's `verify_jwt = true` in supabase/config.toml.
 *
 * If anyone flips either function to `verify_jwt = false`, auth.uid() becomes
 * attacker-forgeable (any caller can mint a JWT with any `sub`) and every
 * per-user receipt guarantee — including the IAP replay binding — collapses
 * silently. This test fails the build before that can ship. Mirrors the
 * lsApplicationQueriesSchemes.config.test.ts mechanical-pin pattern.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const configToml = readFileSync(
  join(__dirname, '../../../supabase/config.toml'),
  'utf8',
);

/** Read `verify_jwt` from a `[functions.<name>]` block (until the next [section]). */
function verifyJwtFor(fnName: string): string | null {
  const blockRe = new RegExp(
    `\\[functions\\.${fnName.replace(/[-.]/g, '\\$&')}\\]([\\s\\S]*?)(?=\\n\\[|$)`,
  );
  const block = configToml.match(blockRe)?.[1];
  if (!block) return null;
  return block.match(/verify_jwt\s*=\s*(true|false)/)?.[1] ?? null;
}

describe('Edge function verify_jwt pin (INFRA-260)', () => {
  it.each(['verify-apple-receipt', 'verify-google-receipt'])(
    '%s has verify_jwt = true (auth.uid() is gateway-verified, not forgeable)',
    (fn) => {
      expect(verifyJwtFor(fn)).toBe('true');
    },
  );

  it('the unauthenticated webhook stays verify_jwt = false (provider-signed, not JWT)', () => {
    // Sanity that the parser distinguishes blocks — the webhook is intentionally
    // false (it authenticates via provider signature, not a Supabase JWT).
    expect(verifyJwtFor('subscription-webhook')).toBe('false');
  });
});
