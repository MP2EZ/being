# Supabase Row-Level Security (RLS) Verification

**Work Item**: INFRA-260 (supersedes MAINT-116); role-grant layer added MAINT-441
**Last verified**: 2026-06-08 (RLS) · 2026-08-16 (role grants) · 2026-10-14 (server-internal tables, DEBUG-795)
**Status**: VERIFIED — runtime-enforced

> **Scope note.** This document covers **two** access-control layers, not one. RLS is
> checked only after the GRANT passes, and `service_role` bypasses RLS entirely — so the
> RLS verdict below says nothing about server-side access. See *Role grants — the layer
> RLS does not cover*.

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
| `analytics_events` | ENABLED | `user_id = auth.uid()`; crisis rows: anon INSERT only, `user_id`/`session_id` NULL (INFRA-861) | Low (bucketed metrics; no raw scores) |
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
-- Superseded by INFRA-861 (20261024000000_infra861_crisis_delink.sql):
--   analytics_insert           TO authenticated WITH CHECK (user_id = auth.uid() AND event_type <> 'crisis_detected')
--   analytics_insert_crisis_anon TO anon        WITH CHECK (event_type = 'crisis_detected' AND user_id IS NULL AND session_id IS NULL)
--   GRANT INSERT (event_type, properties) ON analytics_events TO anon;  -- no SELECT

-- subscriptions / subscription_events (own rows only)
CREATE POLICY subscriptions_select ON subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY subscriptions_insert ON subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY subscriptions_update ON subscriptions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY subscription_events_select ON subscription_events FOR SELECT USING (user_id = auth.uid());
-- subscription_events_insert: DROPPED (DEBUG-841). Clients are SELECT-only; with RLS on and no
--   INSERT policy, a stray future GRANT of INSERT is still denied.
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

## Role grants — the layer RLS does not cover

**RLS and table grants are orthogonal, and a document that verifies only the first can
read PASS while the second is broken.** Postgres checks the GRANT before it ever
evaluates a policy: no grant means `permission denied` regardless of how correct the
policy is. And `service_role` carries `rolbypassrls = true`, so for that role the grant
is the *only* access control in play — every RLS conclusion above simply does not apply
to it.

This section exists because the omission has already cost something. `service_role` held
no DML on `subscriptions`, so every service-role `.from('subscriptions')` failed
`permission denied` — taking out receipt verification, store webhooks, and trial/grace
expiry, **invisibly**, because there are no live subscribers to notice. INFRA-379 found
it by accident. Until MAINT-441 this document mentioned `service_role` zero times, which
is the structural reason nothing pointed at it.

### Live grant matrix

Measured against `yliycxslzdsgjtpxggtf` on 2026-08-16 via
`information_schema.role_table_grants`; the last two rows on 2026-10-14 (DEBUG-795) —
`webhook_replay_cache`'s client-role column is the state once `20261014000000` is pushed.
`anon` holds **nothing** on any of these tables.

| Table | `service_role` | `authenticated` |
|---|---|---|
| `users` | REFERENCES, TRIGGER, TRUNCATE — **no DML** | SELECT, INSERT, UPDATE |
| `encrypted_backups` | REFERENCES, TRIGGER, TRUNCATE — **no DML** | SELECT, INSERT, UPDATE, DELETE |
| `analytics_events` | REFERENCES, TRIGGER, TRUNCATE — **no DML** | SELECT, INSERT |
| `subscription_events` | REFERENCES, TRIGGER, TRUNCATE — **no DML** | SELECT *(DEBUG-841: INSERT revoked, insert policy dropped)* |
| `subscriptions` | SELECT, INSERT, UPDATE *(INFRA-379)* — no DELETE | SELECT *(DEBUG-751: INSERT, UPDATE revoked)* |
| `webhook_replay_cache` | SELECT, INSERT *(DEBUG-795)* — no UPDATE, no DELETE | **nothing** |
| `grace_period_automation_runs` | SELECT, INSERT *(INFRA-266)* — no UPDATE, no DELETE | **nothing** |

The last two are server-internal: RLS on, no policies, written only by edge functions via
`service_role`, and `REVOKE ALL … FROM anon, authenticated` so the client roles hold no
privilege at all — not even the default REFERENCES/TRIGGER/TRUNCATE. `webhook_replay_cache`
holds a store-issued notification identifier (Apple notificationUUID / Google Pub/Sub
messageId); no user identifier column. It shipped with **no** grant, on the false premise that
RLS with no policies admits `service_role`, so every `wasProcessed()` failed
`permission denied` — the INFRA-379 class again. The founder granted SELECT, INSERT by hand on
2026-10-14; `20261014000000_webhook_replay_cache_service_role_grant.sql` encodes it and adds
the REVOKE. No prune job exists, so the table is unbounded.

REFERENCES / TRIGGER / TRUNCATE are **not granted by our migrations**. `pg_default_acl`
carries `service_role=Dxtm/postgres` with grantor `postgres`, and the platform re-applies
it at every `CREATE TABLE`. `service_role` is also `rolcanlogin = false` (assumed via
`SET ROLE` by PostgREST/GoTrue only) and PostgREST exposes no TRUNCATE verb, so no
request shape reaches it. Revoking it on two tables would create an undocumented
exception that the next `supabase db push` silently re-establishes for any new table.

### Decision: no `service_role` grant on `users` or `encrypted_backups` (MAINT-441)

Every edge function was grepped for direct `.from('users')` and
`.from('encrypted_backups')`, including non-literal forms — double and backtick quotes,
`.from(<identifier>)`, `.schema()`, raw `rest/v1` fetches, table names held in constants,
and the `_shared/` helper wrappers. **Zero call sites.** The live deployed function set
matches the repo set, so no prod-only function evades the repo grep, and nothing outside
`supabase/functions/` holds the service-role key.

Standing privilege is a data-minimisation negative, not a neutral no-op, so the grant was
declined rather than added "for symmetry".

**State the reasoning correctly — a widely-repeated version of it is wrong.** Both
`20260814000000_service_role_subscriptions_grant.sql` and MAINT-441's own body cite DPIA
§6.1 Scenario 3 / control 7 as crediting "no operational reason to touch these rows".
It does not say that. Scenario 3 credits **key custody and blob opacity** ("decryption
key never leaves the device") and expressly holds *even in the event of a full Supabase
compromise*; control 12 in the same table credits the `delete-account` cascade **over**
those rows. The argument that actually holds is control 6: it credits `auth.uid()` RLS as
a live isolation control, and `service_role.rolbypassrls` is true — so a `service_role`
DML grant sits entirely **outside** the credited control, converting a per-row privilege
into an all-users one.

Relatedly, "`delete-account` touches no table directly" is grant-correct but misleading
about reach: the live FKs `users_id_auth_fkey` and `encrypted_backups_user_id_fkey` both
carry `ON DELETE CASCADE`, so `auth.admin.deleteUser()` does delete rows in both. No DML
grant is needed (referential actions run with the referencing table's owner privileges),
but the tables **are** reached on that path.

### ⚠️ If a real call site ever appears

The minimal grant is not what it looks like. `public.update_backup_stats()` is
`SECURITY INVOKER` and its body is `UPDATE users …`, wired `AFTER INSERT OR UPDATE ON
public.encrypted_backups`. Because it is INVOKER, that inner UPDATE is permission-checked
against the **calling** role — so granting `service_role` INSERT on `encrypted_backups`
and nothing else dies on the first insert with `permission denied for table users`. The
genuinely minimal set for that call site is {INSERT on `encrypted_backups`} ∪ {UPDATE on
`users`}.

Per-table rules for any future grant:

- **`users`** — SELECT only, column-scoped, and prefer routing a read-only need through
  an existing view or a `SECURITY DEFINER` function over a table grant. UPDATE only if a
  server path must maintain `last_sync`/`backup_count`. **INSERT never** (rows are
  provisioned by the `handle_new_auth_user` trigger and the FK forbids a parentless row,
  so the grant would be inert and misleading). **DELETE never** (it would orphan a live
  `auth.users` principal while cascading away its backups, analytics and subscriptions).
- **`encrypted_backups`** — SELECT only for a named purpose, column-scoped to exclude
  `encrypted_data` and `checksum`. **INSERT/UPDATE never** without a DPIA §1
  material-change review *first*: control 7's credited invariant is that ciphertext is
  only ever produced on-device, so a server write path is the capability to corrupt or
  substitute a user's only restore point. **DELETE never** — MAINT-347 removed
  `cleanup_orphaned_backups()` because a non-user-act server-side delete contradicts
  privacy-policy §7.3, an FTC Act §5 promise.
- **Never justify a `service_role` grant by symmetry with `authenticated`.** INFRA-379
  used that reasoning; it does not hold. `authenticated` is RLS-confined to one row,
  `service_role` bypasses RLS across all rows, so identical verbs are not identical
  privileges.

### Enforcement

`supabase/tests/maint441_service_role_grants.sql` asserts the no-grant state, pins the
`update_backup_stats` coupling above, and carries a positive control on `subscriptions`
(SELECT/INSERT/UPDATE present, DELETE absent) so the privilege query cannot silently stop
discriminating and let the negative assertions pass vacuously. Test 7 (DEBUG-795) pins the two
server-internal rows: `service_role` SELECT + INSERT present, UPDATE/DELETE absent, and no
privilege of any kind for `anon` or `authenticated`.

`supabase/tests/infra828_service_table_rls.sql` (INFRA-828) pins the other lock on those two
tables. It checks the catalog for RLS enabled and zero policies, which no other suite asserts,
so a permissive policy added while the grant stays revoked fails CI instead of waiting for the
next GRANT. It then checks behaviour against a seeded row: `anon` (no claims) and
`authenticated` (with a `sub`) read no row, and INSERT, UPDATE and DELETE raise 42501.

**It runs in CI, but not yet as a gate.** Since INFRA-782, ci.yml's `Supabase SQL suites`
job runs it, and every other `supabase/tests/*.sql` suite, on each PR against a freshly
reset local stack. The step is `continue-on-error` until INFRA-829 promotes it, so read the
job log's `N/N suites passed, 0 SKIP` line, not the check colour. It is read-only and still
safe to run against the shared project.

**A fresh reset is not the shared project.** The local image's `pg_default_acl` grants
`anon`, `authenticated` and `service_role` `arwdDxtm` on every new public relation; the
shared project's grants `service_role` only `Dxtm`. Every no-grant decision in this section
used to hold on the shared project by absence alone. INFRA-782 encodes them:
`20261022000100_service_role_dml_revoke.sql` (the matrix above) and
`20261022000200_operator_views_client_revoke.sql`, which takes client roles off the eight
operator-only views. Those views run with owner privileges, so RLS does not cover a client
reading them. A new table or view needs its grants written explicitly; the default ACL
differs by environment.

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

**Crisis-telemetry note — superseded by INFRA-861.** `crisis_detected` events were a direct *client*
insert under the user session, passing `analytics_insert` (`user_id = auth.uid()`). Since
`supabase/migrations/20261024000000_infra861_crisis_delink.sql`
they are inserted by the **anon** role, with no user token, under `analytics_insert_crisis_anon`;
`analytics_insert` now refuses them for `authenticated`. A BEFORE INSERT trigger and CHECK constraints
force `user_id` and `session_id` to NULL and `created_at` to the UTC day for every role, service_role
included. No client role can read crisis rows: anon has no SELECT and `analytics_select` never matches a
NULL `user_id` (never widen it to `user_id IS NULL OR …`). They are still NOT written by the service role.
The never-drop durable queue (INFRA-214) holds an event until delivery succeeds; it no longer waits for,
or creates, a session.

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
| Compliance Review | Claude (Compliance Agent) | 2026-08-16 | ✅ APPROVED — role grants (MAINT-441): no `service_role` grant on `users` / `encrypted_backups` |
| Compliance Review | Claude (Compliance Agent) | 2026-10-14 | ✅ APPROVED — DEBUG-795: `service_role` SELECT, INSERT on `webhook_replay_cache`; REVOKE ALL from client roles |
| Compliance Review | Claude (Compliance Agent) | 2026-10-22 | ✅ APPROVED — INFRA-782: REVOKE `service_role` DML on `users` / `encrypted_backups`, DELETE on `subscriptions`, UPDATE/DELETE on `webhook_replay_cache` / `grace_period_automation_runs` (grantor `postgres`, measured); REFERENCES/TRIGGER/TRUNCATE/MAINTAIN kept; no ALTER DEFAULT PRIVILEGES |

---

## References

- Schema: `app/src/core/services/supabase/schema.sql`
- Migrations: `supabase/migrations/20260607120000_auth_uid_rls.sql`, `…130000_iap_receipt_binding.sql`
- Runtime tests: `supabase/tests/infra260_{rls_negative,iap_replay,account_deletion_cascade}.sql`
- Role-grant assertion: `supabase/tests/maint441_service_role_grants.sql`
- Service-table RLS behaviour: `supabase/tests/infra828_service_table_rls.sql`
- Grant migrations: `supabase/migrations/20260523000000_base_schema.sql` §9 (`users`,
  `encrypted_backups` → `authenticated`), `…20260814000000_service_role_subscriptions_grant.sql`
  (§16 is the *subscriptions* block — a commonly mis-cited reference),
  `…20261014000000_webhook_replay_cache_service_role_grant.sql`
- Supabase RLS docs: https://supabase.com/docs/guides/auth/row-level-security

---

**Document Version**: 2.2
**Last Updated**: 2026-10-14
**Work Item**: INFRA-260 (supersedes MAINT-116 v1.0); role-grant layer MAINT-441; server-internal tables DEBUG-795
