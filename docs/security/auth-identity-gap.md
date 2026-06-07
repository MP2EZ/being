# Auth / identity gap — threat-model note (INFRA-232)

**Status:** documented gap. Fix tracked in **INFRA-260** (auth-model implementation).
**Scope of INFRA-232:** documentation + drift guard only — no behavior change.

## Summary

Being's server-side authorization on the shared Supabase project
(`yliycxslzdsgjtpxggtf`, one project for prod + dev) is **not currently
enforced by a per-user principal**. Several code comments asserted that it was;
INFRA-232 corrected those comments and added this note. The actual fix — a real
per-user identity, `auth.uid()`-based RLS, and IAP receipt binding — is
INFRA-260.

## The gap

1. **No per-user session.** `SupabaseService` initializes the client with
   `persistSession`/`autoRefreshToken` disabled and never calls
   `signInAnonymously()`. So `client.functions.invoke(...)` and PostgREST
   requests attach only the **anon publishable key**, not a per-user session
   JWT. `auth.uid()` is therefore the shared anon role (or null), identical
   across every device — not a per-user principal.

2. **RLS keyed off an unset GUC.** The current RLS policies predicate on
   `current_setting('app.device_id', true)`, a Postgres session GUC that the
   supabase-js client never sets. Per-device isolation is consequently **not
   enforced by RLS** on the client path (see
   [`supabase-rls-verification.md`](./supabase-rls-verification.md), to be
   re-verified against the runtime flow in INFRA-260).

3. **IAP receipt not bound to a verified identity.** Because `auth.uid()` is
   the shared anon role, receipt verification in
   `IAPService.verifyReceipt` cannot bind an entitlement to a specific user.
   The earlier "Closes SEC-VERIFY-RECEIPT-ANON" comment did not hold; it has
   been corrected. There is also no UNIQUE binding of
   `original_transaction_id` / `purchaseToken` to one identity, so a receipt
   could in principle be replayed across identities.

## Impact

- Tenant isolation for `analytics_events` / `encrypted_backups` rests on
  factors other than enforced RLS identity. (Backups are AES-256
  client-encrypted, which limits — but does not substitute for — server-side
  access control.)
- Crisis telemetry (`crisis_detected`, INFRA-214 vital-interest path) inserts
  are not currently forgery/flood-bounded at the identity layer.
- IAP entitlements are not bound to a verified principal.

## Mitigation / fix (INFRA-260)

Implement the ratified T0b identity model (MAINT-226, Done): persisted
anonymous Supabase session in expo-secure-store, an idempotent + reversible
migration moving all RLS to `auth.uid()` predicates with `WITH CHECK` on
inserts, IAP receipt-replay UNIQUE binding, `receipt_data_encrypted`
encryption at rest, and enabling Anonymous Sign-Ins in the Supabase dashboard —
staged on a Supabase branch with security + compliance sign-off. See INFRA-260.

## Pins added by INFRA-232

- `app/__tests__/unit/iapAndroidPackage.config.test.ts` — fails if
  `IAPService.ANDROID_PACKAGE_NAME` drifts from `app.json`'s
  `expo.android.package` (a silent-Android-verification-failure guard).
