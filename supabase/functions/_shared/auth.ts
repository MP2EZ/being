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
 */
export function getAuthUidFromRequest(req: Request): string {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header');
  }
  const jwt = authHeader.slice('Bearer '.length);
  const [, payloadB64] = jwt.split('.');
  if (!payloadB64) throw new Error('Malformed JWT: missing payload segment');
  const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(padded));
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('JWT missing or invalid sub claim');
  }
  return payload.sub;
}
