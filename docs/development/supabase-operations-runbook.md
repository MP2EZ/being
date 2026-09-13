# Supabase operations runbook — backups, retention, monitoring, migration rollback

Covers INFRA-84 ACs 3, 5 and 7 for the shared project `yliycxslzdsgjtpxggtf`
(`being-production`, us-west-2, Postgres 17.6). One project serves every environment.

Companion docs: `post-launch-monitoring-runbook.md` (the five INFRA-87 app/ops alerts),
`crisis-analytics-runbook.md` (the separate crisis trust domain),
`app-store-credentials-runbook.md` (store credentials).

All facts below were verified live on **2026-08-21**. Re-verify before relying on any of
them — this project has a documented history of runbook groundings going stale.

---

## 1. Backups and retention (AC 3)

### The plan is `free`, so there are no automated backups

Organization `Being` (`ifmzpnkemdolpzotcdzw`) is on the **free** plan. Free-tier Supabase
projects get **no scheduled backups and no point-in-time recovery**; daily backups begin at
Pro. So AC 3's "automated backups configured" is a **billing decision, not an engineering
task** — the same shape as AC 1's Play Console enrollment. Nothing in this repo can satisfy
it.

### Recorded decision: accept no DB backups until launch

Measured loss exposure, 2026-08-21:

| Table | Rows | Nature |
|---|---|---|
| `crisis_liveness_probe` | 261 | ops telemetry, self-regenerating, pruned nightly |
| `crisis_alert_runs` | 69 | ops telemetry, pruned nightly |
| `grace_period_automation_runs` | 10 | ops telemetry, pruned nightly |
| `retention_prune_runs` | 7 | ops telemetry, pruned nightly |
| `users` | 3 | anonymous principals, no wellness content |
| `analytics_events` | 2 | the INFRA-412 crisis-telemetry proof rows |
| `encrypted_backups` | **0** | user wellness backups — none exist |
| `subscriptions` / `subscription_events` | **0** / **0** | no subscribers |
| `webhook_replay_cache` | 0 | replay guard, regenerates |

Total database is under 1 MB and holds **zero user-generated wellness data**. Two structural
facts make this tolerable rather than merely cheap:

- The device is authoritative. Wellness data lives on-device in `expo-secure-store`;
  `encrypted_backups` is an opt-in copy, not the system of record.
- The server holds **ciphertext only** — encryption happens client-side before upload, and the
  `encrypted_backups` table comment records "Server cannot decrypt contents". A restored
  backup would be equally undecryptable to us, so backups protect availability, never
  confidentiality.

**Upgrade trigger — do not defer past it:** the first non-zero row count in
`encrypted_backups` or `subscriptions`. That is the moment the server starts holding something
a user cannot reconstruct from their device, and the moment free-tier backup absence becomes a
real risk rather than a documented one. Check with:

```sql
SELECT (SELECT count(*) FROM public.encrypted_backups) AS backups,
       (SELECT count(*) FROM public.subscriptions)     AS subs;
```

### Interim manual snapshot

Until the plan changes, a snapshot is operator-run and unscheduled:

```bash
supabase db dump --linked -f schema-$(date +%F).sql              # schema
supabase db dump --linked --data-only -f data-$(date +%F).sql    # data
```

Treat the output as sensitive and store it in 1Password, not in the repo — it is gitignored
nowhere, and `--data-only` includes `analytics_events`.

### Retention is automated and running

Retention is enforced server-side by pg_cron, not by hand. Verified all-green over the
trailing 7 days (10 jobs, 0 failures):

| Job | Schedule | What it enforces |
|---|---|---|
| `analytics-retention-prune` | `20 4 * * *` | 90 days general, **3 years for crisis-flagged rows** (DEBUG-340, matching privacy-policy §7.2) |
| `crisis-alert-runs-prune` | `30 3 * * *` | ops telemetry |
| `crisis-liveness-probe-prune` | `45 3 * * *` | ops telemetry |
| `grace-period-automation-runs-prune` | `50 3 * * *` | ops telemetry |
| `retention-prune-runs-prune` | `55 3 * * *` | the pruner's own heartbeat (MAINT-347) |

Verify:

```sql
SELECT j.jobname, count(*) AS runs_7d,
       count(*) FILTER (WHERE d.status <> 'succeeded') AS failures,
       max(d.end_time) AS last_run
FROM cron.job j
LEFT JOIN cron.job_run_details d
  ON d.jobid = j.jobid AND d.start_time > now() - interval '7 days'
GROUP BY j.jobname ORDER BY j.jobname;
```

Note `cleanup_orphaned_backups()` is **deliberately deleted, not scheduled** (MAINT-347) —
privacy-policy §7.3 retains settings backup "until you disable backup", so a sweeper would
contradict the published policy. Do not reintroduce it.

### User-initiated deletion is consistent with the erasure flow

`delete-account` hard-deletes the caller's `auth.users` row; `ON DELETE CASCADE` on
`public.users.id` removes `encrypted_backups`, `analytics_events`, `subscriptions` and
`subscription_events`. That matches privacy-policy §7.4's promise that deletion removes data
"both on your device and on our servers".

The retention carve-out and this cascade are not in conflict: 3 years is a **ceiling** on how
long crisis rows may be kept, while a deletion request is a user right that overrides it. A
retention maximum never obliges us to retain.

Device-side erasure has a separate known gap — the consent-history blob is orphaned by
`clearAllWellnessData` — tracked outside this item.

---

## 2. Monitoring (AC 5)

### Function logs are reachable — verified, not assumed

Five log sources are live. Confirmed 2026-08-21 over a 24-hour window: `postgres_logs` (71),
`function_logs` (30), `edge_logs` (15), `postgrest_logs` (7), `function_edge_logs` (6).

```sql
SELECT source, count(*) FROM logs GROUP BY source ORDER BY 2 DESC
```

CLI equivalent for a single function: `supabase functions logs <slug> --project-ref <ref>`.

### Error rate and execution time, in one query

This is the AC's "query performance and error rate" surface. **The attribute key is
`request.pathname`, not `request.path`** — the latter exists in no log row and returns an
empty string for every result, which reads as working. Verified query:

```sql
SELECT log_attributes['request.pathname'] AS path,
       count(*) AS calls,
       countIf(toInt32OrZero(log_attributes['response.status_code']) >= 500) AS errors_5xx,
       round(100.0 * countIf(toInt32OrZero(log_attributes['response.status_code']) >= 500)
             / count(*), 2) AS error_pct,
       round(quantile(0.95)(toFloat64OrZero(log_attributes['execution_time_ms'])), 1) AS p95_ms
FROM logs
WHERE source = 'function_edge_logs'
GROUP BY path ORDER BY calls DESC
```

Baseline at time of writing (cron traffic only, no user traffic): 0% 5xx across all functions;
p95 `crisis-liveness-probe` 9479 ms, `crisis-detection-alerting` 5814 ms,
`grace-period-automation` 5086 ms. Those are cold-start-dominated cron invocations, not a
user-facing latency budget — do not set a user-facing threshold from them.

Database-side query performance is available via **`pg_stat_statements` 1.11**, installed.

### PII constraint on anything built from these logs

`function_edge_logs` attributes include `request.headers.cf_connecting_ip`,
`request.headers.x_real_ip`, and coarse geo (`request.cf.city`, `.postalCode`, `.region`).
Any alert or dashboard built on this source must **aggregate** — counts, rates, percentiles —
and must never forward raw log rows into a notification channel. This is the same PII-free
constraint `post-launch-monitoring-runbook.md` applies to the Sentry and Resend paths.

### Correction to the companion runbook's grounding

`post-launch-monitoring-runbook.md` is grounded as of 2026-06-18 and states prod has "5 cron
jobs, all `crisis-*`" and that the INFRA-266 grace-period stack "is **not applied in prod**".
**Both are now false.** Prod has 10 active cron jobs; `grace-period-automation` (jobid 6),
`grace-period-automation-runs-prune` (7), `subscription-verification-watchdog` (8),
`analytics-retention-prune` (10) and `retention-prune-runs-prune` (11) are all live and have
run clean for the trailing 7 days. Alert #4 in that runbook's ledger is therefore genuinely
operational, not merely shipped. Alerts #1, #2 and #5 remain operator-to-create.

---

## 3. Migration rollback plan (AC 7)

### On the free plan, rollback means forward-fix — there is nothing to restore to

This is the constraint that shapes everything below. No PITR and no automated backups means
**"restore the database" is not an available response to a bad migration.** Any plan that
begins "roll back to the last snapshot" is fiction here. The only real options are forward-fix
and, for data loss, unrecoverable.

The 17 migrations are also **forward-only** — no `down` files exist, and `schema_migrations`
is `(version, statements, name)` with no rollback record.

### Before applying anything

1. Dump the schema first (§1) — cheap, and it is the only artifact that makes a structural
   mistake diagnosable after the fact.
2. Rehearse locally: `supabase start && supabase db reset` replays every migration from
   scratch. A migration that cannot survive a clean replay is broken regardless of whether it
   succeeded against prod once.
3. Confirm what prod actually has. Merging does **not** deploy — there is no CI auto-deploy of
   migrations or edge functions, so `origin/development` and the live project drift routinely
   and in either direction. Compare `list_migrations` against `supabase/migrations/` before
   assuming.

### If a migration fails mid-apply

Postgres runs each migration in a transaction, so a statement-level failure rolls that
migration back and leaves `schema_migrations` without its version. The database is consistent;
the repo is ahead. Fix the migration file and re-run `supabase db push`. Do **not** hand-insert
the version into `schema_migrations` to "skip" it — that permanently desynchronizes the repo
from the database with no way to detect it later.

### If a migration succeeds but is wrong

Write a **new forward migration** that corrects it. Never edit an applied migration file: its
version is already recorded, so an edit changes what a fresh replay produces while leaving prod
untouched — the two diverge silently, and local rehearsal stops predicting production.

For a destructive mistake (dropped column, deleted rows), there is no restore path on this
plan. Escalate to a plan upgrade before attempting recovery, and stop writing to the affected
table meanwhile.

### Proving when a change actually landed

`schema_migrations` carries no timestamp and `track_commit_timestamp` is off, so there is no
application time recorded anywhere. To establish whether a migration preceded an observed
event, compare transaction ids — they are monotonic, so ordering is provable from data:

```sql
SELECT xmin::text::bigint FROM pg_proc  WHERE proname = '<function>';
SELECT xmin::text::bigint FROM pg_class WHERE relname = '<table>';
```

A lower `xmin` than the row you are investigating means the change was already in place.

### Edge functions are a separate rollback surface

Functions version independently of migrations and are **not** covered by `db push`. Roll one
back by deploying from the previous commit:

```bash
git checkout <previous-sha> -- supabase/functions/<slug>
supabase functions deploy <slug> --project-ref yliycxslzdsgjtpxggtf
```

Then verify by reading the deployed bytes, not the version number — `supabase functions
download <slug>` and grep for something that distinguishes the two builds. A version increment
proves a deploy happened, not which build is live.
