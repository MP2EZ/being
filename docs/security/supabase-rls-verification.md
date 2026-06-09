# Supabase Row-Level Security (RLS) Verification

**Work Item**: INFRA-260 (supersedes MAINT-116)
**Last verified**: 2026-06-08
**Status**: VERIFIED — runtime-enforced

---

## Executive Summary

This document verifies Row-Level Security (RLS) on all Supabase tables containing
user data. It verifies user isolation against the **runtime application path**, not
just the SQL editor.

### Correction over the prior (MAINT-116) verification

The 2025-12-13 verification marked RLS "PASS", but it only ever exercised policies
via `SET LOCAL app.device_id = …` in the SQL editor. The app **never set that GUC**
on a real request, so at runtime `current_setting('app.device_id', true)` was always
NULL and every policy evaluated `device_id = NULL` → matched nothing. RLS was enabled
but **operationally inert**: isolation was not actually enforced on the runtime path.
The DPIA (§7 Control 6) had credited this as a *live* mitigation — it was not.

### What changed (INFRA-260 / MAINT-226 T0b)

The device-hash identity was replaced with a real Supabase **anonymous session**
(`signInAnonymously`). `auth.uid()` is now a non-null per-user principal on every
request, set by PostgREST from the JWT `sub` claim — no app-layer `SET LOCAL`. All
policies were rewritten to key on `auth.uid()`, split into explicit verbs with
`WITH CHECK` on writes. `users.id` **is** `auth.uid()` (FK → `auth.users`), and an
`on_auth_user_created` trigger provisions the `public.users` row on sign-in.

### Verification Result: PASS (runtime)

Verified by a committed, reproducible SQL suite
(`supabase/tests/infra260_rls_negative.sql`) run against a real Postgres + GoTrue
stack, asserting policy behavior via `request.jwt.claims` (what `auth.uid()` reads at
runtime). See **Runtime Verification** below for the verbatim result.

---

## Table Inventory

| Table | RLS | Policy key | Data sensitivity |
|-------|-----|-----------|------------------|
| `users` | ENABLED | `id = auth.uid()` | Low (anonymous; id == auth principal) |
| `encrypted_backups` | ENABLED | `user_id = auth.uid()` | HIGH (encrypted wellness data) |
| `analytics_events` | ENABLED | `user_id = auth.uid()` | Low (bucketed metrics; no raw scores) |
| `subscriptions` | ENABLED | `user_id = auth.uid()` | MEDIUM (subscription transaction history) |
| `subscription_events` | ENABLED | `user_id = auth.uid()` | MEDIUM (subscription transaction history) |

### Tables NOT in Supabase (local only)

`check_ins`, `assessments`, `crisis_plans`, `user_profiles` do not exist server-side —
they are client-encrypted and, when synced, live inside the `encrypted_backups` blob.
Supabase cannot decrypt their contents (no server-side keys).

---

## RLS Policy Analysis (post-INFRA-260)

Every write-capable policy carries `WITH CHECK (… = auth.uid())` so a client cannot
insert/update a row bearing another principal's id. `FOR ALL` was deliberately split
into explicit verbs so DELETE is granted or withheld per table.

```sql
-- users (the row id IS the principal)
CREATE POLICY users_select ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY users_update ON users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- encrypted_backups (own row only; DELETE allowed — re-backup + erasure)
CREATE POLICY backups_select ON encrypted_backups FOR SELECT USING (user_id = auth.uid());
CREATE POLICY backups_insert ON encrypted_backups FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY backups_update ON encrypted_backups FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY backups_delete ON encrypted_backups FOR DELETE USING (user_id = auth.uid());

-- analytics_events (SELECT + INSERT only; client DELETE withheld — crisis-audit integrity)
CREATE POLICY analytics_select ON analytics_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY analytics_insert ON analytics_events FOR INSERT WITH CHECK (user_id = auth.uid());

-- subscriptions / subscription_events (own rows only)
CREATE POLICY subscriptions_select ON subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY subscriptions_insert ON subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY subscriptions_update ON subscriptions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY subscription_events_select ON subscription_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY subscription_events_insert ON subscription_events FOR INSERT WITH CHECK (user_id = auth.uid());
```

**`auth.uid()` is NULL for the bare `anon` (unauthenticated) role** → every policy
fails closed (0 rows). Broad `anon` grants on these tables are revoked; the anonymous
*session* runs as the `authenticated` role and keeps the existing grants.

Source: `app/src/core/services/supabase/schema.sql` + migration
`supabase/migrations/20260607120000_auth_uid_rls.sql`.

---

## SECURITY DEFINER functions

`SECURITY DEFINER` functions bypass RLS and need review.

- **`handle_new_auth_user()`** *(new, INFRA-260)* — `AFTER INSERT ON auth.users`
  trigger; inserts the matching `public.users` row (`id = NEW.id`). `search_path`
  pinned to `public`; `ON CONFLICT DO NOTHING`. Only ever writes the caller's own id.
  **SAFE.**
- **`get_or_create_user(device_id)`** — **REMOVED** in INFRA-260 (identity is no
  longer device-hash-minted).
- **`log_subscription_event(...)`** — insert-only audit logging called by the receipt
  edge functions; ownership-validates `subscription_id` against `user_id`. **SAFE.**
- **Subscription expiry functions** (`get_expiring_trials`, `expire_old_trials`, …) —
  server-side cron automation; minimal data; no user-facing endpoint. **SAFE.**

Note: the receipt-verification edge functions use the **service-role** key (bypassing
RLS). Their per-user guarantee (one IAP transaction → one `auth.uid()`) is enforced by
a DB UNIQUE index (`uniq_txn_per_platform`) + an in-function ownership check, not RLS
(INFRA-260 PR2). The `delete-account` function (PR3) likewise uses the admin API and
deletes only the JWT-verified caller's `auth.uid()`.

---

## Runtime Verification

Reproducible suite (committed): `supabase/tests/infra260_rls_negative.sql`. It seeds two
anonymous principals, sets `request.jwt.claims` (the value `auth.uid()` reads at
runtime — NOT `SET LOCAL app.device_id`) and asserts isolation via real table access.

Run:
```
supabase start && supabase db reset
docker exec -i supabase_db_$(basename "$PWD") psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < supabase/tests/infra260_rls_negative.sql
```

Result (2026-06-08, local stack):
```
PASS: on_auth_user_created provisioned public.users for both principals
PASS: A inserted + reads its own backup
PASS: WITH CHECK rejected A inserting a forged user_id (B)
PASS: B sees 0 rows of A's backups
PASS: anon role denied table access entirely (grants revoked)
PASS: client DELETE on analytics_events affected 0 rows (no DELETE policy)
ALL RLS NEGATIVE TESTS PASSED
```

Evidence captured:
- An unauthenticated request (no JWT) returns 0 rows (fail-closed), not an error.
- Principal A cannot read principal B's `encrypted_backups` via the user session.
- `WITH CHECK` rejects an insert bearing a forged `user_id` — the hole the old
  `FOR ALL` / null-`WITH CHECK` policies left open.
- The erasure cascade (`supabase/tests/infra260_account_deletion_cascade.sql`) and the
  IAP replay backstop (`supabase/tests/infra260_iap_replay.sql`) pass alongside it.

**Crisis-telemetry note:** `crisis_detected` events are a direct *client* insert into
`analytics_events` under the user session, so they pass `analytics_insert`
(`user_id = auth.uid()`). They are NOT written by the service role. The never-drop
durable queue (INFRA-214) holds an event until a session exists, then it lands.

---

## Data Protection Controls

| Control | Implementation | Status |
|---------|----------------|--------|
| Access Control | RLS policies keyed on `auth.uid()`, runtime-verified | ✅ |
| User Identification | Supabase anonymous auth sessions (`auth.uid()`) | ✅ |
| Write integrity | `WITH CHECK (= auth.uid())` on every INSERT/UPDATE | ✅ |
| Session Security | JWT persisted in expo-secure-store (chunked), auto-refresh | ✅ |
| Encryption | Client-side AES-256-GCM (backups); receipts AES-256-GCM at rest | ✅ |
| Erasure | `delete-account` → `auth.admin.deleteUser` → FK cascade | ✅ |

### Data-breach prevention

| Vector | Mitigation | Status |
|--------|------------|--------|
| Horizontal privilege escalation | `auth.uid()` RLS isolation (runtime-verified) | PROTECTED |
| Forged `user_id` on write | `WITH CHECK (= auth.uid())` | PROTECTED |
| IDOR | RLS denies cross-user access | PROTECTED |
| IAP receipt replay across identities | UNIQUE `(platform, original_transaction_id)` + in-fn check | PROTECTED |
| Forged JWT `sub` | Edge functions `verify_jwt = true` (gateway-verified) | PROTECTED |

---

## Verification Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Security Review | Claude (Security Agent) | 2026-06-08 | ✅ APPROVED (runtime) |
| Compliance Review | Claude (Compliance Agent) | 2026-06-08 | ✅ APPROVED (runtime) |

---

## References

- Schema: `app/src/core/services/supabase/schema.sql`
- Migrations: `supabase/migrations/20260607120000_auth_uid_rls.sql`, `…130000_iap_receipt_binding.sql`
- Runtime tests: `supabase/tests/infra260_{rls_negative,iap_replay,account_deletion_cascade}.sql`
- Supabase RLS docs: https://supabase.com/docs/guides/auth/row-level-security

---

**Document Version**: 2.0
**Last Updated**: 2026-06-08
**Work Item**: INFRA-260 (supersedes MAINT-116 v1.0)
