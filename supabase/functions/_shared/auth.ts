const MALFORMED_JWT = 'Malformed JWT';

/**
 * Extract auth.uid() from a request's Authorization header (INFRA-260).
 *
 * With the function's `verify_jwt = true` config, Supabase's gateway has already
 * cryptographically verified this JWT against the project's auth secret before
 * invoking us — so we only decode the payload and read `sub`. NEVER trust a
 * userId from the request body (forgeable by any caller holding the public key).
 *
 * verify_jwt=true is load-bearing for this: it is pinned by
 * app/__tests__/safety/verifyJwtConfig.test.ts. If it is ever flipped to false,
 * `sub` becomes attacker-forgeable.
 *
 * Throws one of exactly three fixed messages (pinned by _tests/auth-uid.test.ts), so a caller
 * may echo err.message into a 401 body: 'Missing or malformed Authorization header',
 * 'Malformed JWT', 'JWT missing or invalid sub claim'.
 */
export function getAuthUidFromRequest(req: Request): string {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }
  const segments = authHeader.slice('Bearer '.length).split('.');
  if (segments.length !== 3 || !segments[1]) throw new Error(MALFORMED_JWT);

  // Every parser failure collapses to one fixed message: the caller echoes err.message into a
  // 401 body, and a raw SyntaxError / atob DOMException would leak parser internals.
  let payload: unknown;
  try {
    const b64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    payload = JSON.parse(atob(b64));
  } catch {
    throw new Error(MALFORMED_JWT);
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error(MALFORMED_JWT);
  }

  // `sub` must be a non-empty string and NOTHING more. Do not add UUID, role or email checks:
  // a Being user is a silent anonymous Supabase session, and over-tightening here locks them
  // out of erasure (delete-account) and receipt verification.
  const sub = (payload as Record<string, unknown>).sub;
  if (typeof sub !== 'string' || !sub) {
    throw new Error('JWT missing or invalid sub claim');
  }
  return sub;
}
