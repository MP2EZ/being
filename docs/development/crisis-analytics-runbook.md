# Crisis Analytics Runbook (FEAT-129)

**Audience:** founder-operator (release-health monitor) and the same person wearing the
compliance-evidence hat.
**Purpose:** confirm the crisis safety net is still firing correctly after each release,
catch detection drift, and produce an aggregate, PII-free record for the DPIA paper trail.

> [!IMPORTANT]
> **This dashboard is monitoring-only. It is NOT the safety mechanism.** The crisis
> safety guarantees (988 < 3 taps / < 3 s, detection < 200 ms, zero false negatives) are
> enforced in-app and recorded by the **on-device crisis audit log**, which is independent
> of this telemetry. These views observe an *aggregate copy* of detection events for
> operational assurance. Never treat the dashboard as the accountability record, and never
> wire it into a detection / 988 / intervention code path.

---

## What this is built on

INFRA-214 routes the crisis-detection event `crisis_detected` into the **first-party
Supabase** `analytics_events` table under the GDPR Art. 6(1)(d)/9(2)(c) **vital-interests**
basis (it fires regardless of analytics consent and is not suppressible by universal
opt-out). PostHog is **not** a source for crisis data — its SDK won't initialize without
analytics consent, so routing crisis signal there would be both a false all-clear and a
privacy-policy breach. See `docs/architecture/analytics-architecture.md`,
`docs/legal/lia-crisis-telemetry.md`, and `docs/legal/dpia-sensitive-wellness-data.md`.

The `crisis_detected` payload is bucketed and PII-free:

| Property | Values |
|---|---|
| `trigger_type` | `phq9_suicidal_ideation`, `phq9_severe_score`, `phq9_moderate_severe_score`, `gad7_severe_score` |
| `severity_bucket` | bucketed severity (e.g. `moderate` / `high` / `critical` / `emergency`) |
| `intervention_surfaced` | boolean — currently always `true` |
| `assessment_type` | `phq9` / `gad7` |

No raw scores, no Q9 value, no device id. `session_id` is a daily-rotated anonymous token
that cannot be joined to an identity.

### Views (defined in `app/src/core/services/supabase/schema.sql` §6b + migration `20260605000000_crisis_analytics_views.sql`)

| View | Use |
|---|---|
| `crisis_detection_daily` | detection mix — per day × `assessment_type` × `trigger_type` × `severity_bucket`, with `detection_count` and `intervention_surfaced_count` |
| `crisis_detection_volume_daily` | per-day total volume (`detection_count`, `distinct_sessions`) for spike/drift watching |
| `crisis_detection_liveness` | `total_detections_retained`, `last_detection_at`, `first_detection_retained_at` — for the pipeline-liveness check |

All three are **operator-only** (service-role) and emit counts only.

---

## Access

Query via the **Supabase SQL editor** or the Supabase MCP against project
`yliycxslzdsgjtpxggtf` (being-production) with **service-role** credentials. These views are
intentionally **not** granted to the `authenticated` / `anon` roles, so no app client can
read them.

### Latency lives in three places — don't conflate them

This dashboard shows **detection counts**, not latency. When reasoning about the safety
system's timing budgets, the numbers live in different stores:

| Signal | Where | Note |
|---|---|---|
| 988-button response (< 200 ms target) | **Sentry** span | not in Supabase or PostHog |
| Crisis detection counts / mix | **Supabase** (`crisis_detected`, these views) | counts only; no numeric latency is transmitted |
| Crisis *access* events (`crisis_resources_viewed`, `crisis_hotline_tapped`) | **PostHog** | property-less, consent-gated product analytics |

Button-access time (< 3 taps / < 3 s) is not instrumented as telemetry — it is pinned by
the Maestro safety e2e flow. Do not present the Supabase detection counts as if they hold
button-response latency.

---

## Post-release confidence check (target: < 5 min)

Run after every release. The goal is the question *"did the crisis safety net survive this
release?"* — which a count alone **cannot** answer, because a count view renders "no crises
happened" and "`crisis_detected` stopped firing" identically (both look like zero/absent
rows).

So the check has two parts:

**1. Active liveness assertion (mandatory — this is the real check).**
On a staging build, drive a known crisis path (e.g. a PHQ-9 ≥ 20 completion, or Q9 > 0) and
confirm it lands:

```sql
SELECT total_detections_retained, last_detection_at
FROM crisis_detection_liveness;
```

`last_detection_at` must advance to your synthetic detection's timestamp and
`total_detections_retained` must increment. If it does **not**, the detection→Supabase
pipeline is broken — treat as a release blocker, not "quiet day." (See INFRA-214's
verifiable crisis-landing test for the canonical end-to-end procedure.)

**2. Drift scan over recent production volume.**

> [!NOTE]
> **This drift scan is now AUTOMATED (INFRA-219).** A daily `pg_cron` job evaluates volume
> spike + liveness staleness and emails the founder on a breach — see
> [Automated alerting (INFRA-219)](#automated-alerting-infra-219) below. The manual query
> here remains a useful spot-check, but you no longer have to run it after every release.
> The **active-liveness assertion in step 1 stays manual** — it is the gold-standard
> end-to-end gate and is *not* replaced by the automated passive-staleness alert (a
> server-side cron cannot drive a real crisis path; see the residual note in the new section).

```sql
SELECT * FROM crisis_detection_volume_daily LIMIT 14;
```

Compare `detection_count` against the trailing baseline. A sudden spike or a drop to zero
across days where you'd expect activity both warrant investigation. `detection_count`
(`COUNT(*)`) is the **authoritative** number; `distinct_sessions` is a secondary
same-day-episode proxy that **under-counts** (the daily-rotated `session_id` collapses
repeat same-day detections on one device) — never treat it as the floor.

---

## Detection-mix review

```sql
SELECT * FROM crisis_detection_daily LIMIT 50;
```

Two integrity assertions to eyeball every time:

- **`intervention_surfaced_count` should equal `detection_count`.** `intervention_surfaced`
  is always `true` today, so any divergence means the emit shape changed or a detection
  surfaced no intervention — investigate immediately.
- **Watch for `severity_bucket` / `assessment_type` = the literal string `'undefined'`.**

```sql
-- Surfacing the known inline-Q9 mis-tag (do NOT filter these rows away)
SELECT event_date, trigger_type, severity_bucket, assessment_type, detection_count
FROM crisis_detection_daily
WHERE severity_bucket = 'undefined' OR assessment_type = 'undefined'
ORDER BY event_date DESC;
```

> [!WARNING]
> **Known upstream bug — `trigger_type = 'phq9_suicidal_ideation'` rows may carry
> `severity_bucket = 'undefined'` and `assessment_type = 'undefined'`.** The inline PHQ-9
> Q9 detection path (`app/src/features/assessment/stores/assessmentStore.ts` ~:551) builds
> the detection object without `severityLevel` / `assessmentType`, and
> `SupabaseService.trackCrisisDetection` coerces them via `String(undefined)`, landing the
> literal text `"undefined"`. This is the **highest-acuity** signal (suicidal ideation), so
> the views deliberately **surface** these rows rather than filter them. Fix is tracked as
> a follow-up (correct the inline emit path to set both fields); until it ships, the
> dashboard's job is to keep the mis-tag visible.

---

## Monthly compliance export (DPIA paper trail)

For the regulatory-applicability / DPIA record, export aggregate counts by bucket:

```sql
SELECT
  DATE_TRUNC('month', event_date) AS month,
  assessment_type, trigger_type, severity_bucket,
  SUM(detection_count) AS detections,
  SUM(intervention_surfaced_count) AS interventions_surfaced
FROM crisis_detection_daily
GROUP BY 1, 2, 3, 4
ORDER BY month DESC, detections DESC;
```

**Export only this counts-by-bucket output.** Never `SELECT *` from `analytics_events`, and
never include `session_id` or `user_id` in any exported artifact.

### Honest privacy posture (use this wording; do **not** claim k-anonymity)

> Re-identification is managed by five controls: (1) **severity-bucketing** — no raw
> PHQ-9/GAD-7 scores or Q9 values are stored or queried; (2) **absence of
> quasi-identifiers** — no device id, name, IP, or geolocation is associated with any
> crisis event; (3) **daily session rotation** — the anonymous `session_id` does not
> persist across calendar days and cannot be joined to a user identity; (4) **operator-only
> views** — aggregate data is reachable only via service-role credentials, never the
> `authenticated` role or a client-facing path; (5) **synthetic-probe isolation** (INFRA-265)
> — the liveness probe writes only to the dedicated `crisis_liveness_probe` table, never to
> `analytics_events`, and a schema-level CHECK on `analytics_events` actively rejects
> synthetic-tagged rows, so the monthly compliance export reflects only real detection events
> (the probe count is excluded by construction, not by filter). **k-anonymity and differential privacy are
> NOT claimed** — at pre-launch scale such thresholds are not operationally meaningful, and
> a safety-monitoring system must not suppress the first detected crisis.

Residual limitation to document honestly: at very low volume, a row with `detection_count =
1` for a rare bucket on a specific day reveals that exactly one session hit that threshold
that day. This is **not** re-identification (no identity link exists) — it is the practical
boundary of the bucketing control, and is the accepted trade-off for not hiding a real
crisis.

---

## Verify the access posture after applying the migration

Confirm the `authenticated` / `anon` roles cannot read the views:

```sql
SELECT has_table_privilege('authenticated', 'crisis_detection_daily', 'SELECT')        AS auth_can_read,
       has_table_privilege('anon',          'crisis_detection_daily', 'SELECT')        AS anon_can_read;
-- both must return false
```

---

## Automated alerting (INFRA-219)

The manual drift scan above is now automated. This is **monitoring-only** — it observes the
same aggregate views and never sits in a detection / 988 / intervention path.

### What runs

| Job (pg_cron) | Cadence | Does |
|---|---|---|
| `crisis-detection-alerting` | daily 14:15 UTC | `net.http_post` → the `crisis-detection-alerting` edge function, which reads the views, evaluates spike + liveness, and emails the founder (Resend) **only on a breach**. Every run writes a heartbeat row to `crisis_alert_runs` (`ok` / `alerted` / `error`). |
| `crisis-alerter-watchdog` | every 6h | `crisis_alert_watchdog()` — escalates via an **independent direct Resend POST** if no clean run landed in 26h or the latest run `error`ed (catches cron-unscheduled / edge-erroring / project-paused / alert-delivery-failed). |
| `crisis-alert-runs-prune` | daily 03:30 UTC | prunes `crisis_alert_runs` older than 90 days. |
| `crisis-liveness-probe` (INFRA-265) | every 6h | `net.http_post` → the `crisis-liveness-probe` edge function, which writes a tagged **synthetic** marker to `crisis_liveness_probe` (drives the real cron→edge→PostgREST write leg). The daily alerter reads `MAX(probed_at)` as the authoritative ingest-leg liveness signal. |
| `crisis-liveness-probe-prune` (INFRA-265) | daily 03:45 UTC | prunes `crisis_liveness_probe` older than 90 days. |

### Alert conditions (operator-tunable via edge-function env)

| Condition | Rule | Default env |
|---|---|---|
| Volume spike | `todayCount ≥ multiplier × trailing-baseline-mean` AND `todayCount ≥ absolute floor` (cold-start safe; no div-by-zero) | `CRISIS_ALERT_SPIKE_MULTIPLIER=3`, `CRISIS_ALERT_SPIKE_MIN=5`, `CRISIS_ALERT_BASELINE_DAYS=7` |
| Liveness staleness | `age(last_detection_at) ≥ threshold` (decided by AGE, never by volume==0; NULL → `unproven`, advisory not a page) | `CRISIS_ALERT_STALENESS_HOURS=48` |
| Bucket reporting floor | per-bucket rows below the floor are withheld from the external breakdown but counted in aggregate | `CRISIS_ALERT_BUCKET_FLOOR=3` |

### Alert payload (PII-free by construction)

Counts, category labels, verdict statuses, and a **day-level** date only — never `user_id`,
`session_id`, `distinct_sessions`, raw scores, the Q9 value, or a sub-day timestamp. Rare
per-bucket rows (`detection_count < floor`) are reported only as a suppressed aggregate
(`N rare bucket row(s) … withheld`), never at row granularity. The `severity_bucket = 'undefined'`
inline-Q9 mis-tag rows are still COUNTED (surfaced, not laundered) — they just don't transmit
at row granularity unless they clear the floor.

### When an alert fires

- **VOLUME spike** — confirm against `crisis_detection_volume_daily` and `crisis_detection_daily`
  in the SQL editor. A genuine spike may reflect a real-world event, a release that changed a
  threshold, or an emit-shape regression. Cross-check `intervention_surfaced_count == detection_count`.
- **LIVENESS** — possible dead detection→Supabase pipeline. Run the **manual active-liveness
  assertion (step 1 above)** to disambiguate: drive a known crisis path on staging and confirm
  `last_detection_at` advances. At low volume this alert can also be a genuinely quiet stretch
  (see residual below) — the active assertion is the authoritative discriminator.
- **WATCHDOG** — the alerter itself may be down. Check `SELECT * FROM crisis_alert_runs ORDER BY ran_at DESC LIMIT 10;`, that the `pg_cron` jobs are scheduled (`SELECT * FROM cron.job;`), and that the edge function deploys/logs are healthy.

### Setup (one-time; nothing here is committed to git)

The migration references all secrets BY NAME — bootstrap the values out of band before the jobs can fire.

1. **Resend:** verify `being.fyi` as a sending domain, create an API key, choose a sender (e.g. `alerts@being.fyi`). Sign the standard Resend DPA (recorded as a sub-processor in the DPIA v1.3).
2. **Supabase Edge secrets** (`supabase secrets set …`), read by the edge function: `CRON_SECRET` (fresh ≥256-bit random, **distinct from grace-period-automation's**), `RESEND_API_KEY`, `CRISIS_ALERT_FROM`, `CRISIS_ALERT_TO`, plus any threshold overrides above.
3. **Supabase Vault secrets** (dashboard → Vault, or non-committed psql), read by the cron/watchdog SQL: `crisis_alert_cron_secret` (must equal the edge `CRON_SECRET`), `crisis_alert_function_url`, `crisis_alert_resend_key`, `crisis_alert_from`, `crisis_alert_to`. (The Resend key/from/to are duplicated in Vault deliberately so the watchdog is an independent send path.)
4. Deploy: `supabase functions deploy crisis-detection-alerting` and `supabase db push`. Test-fire the function with a valid `x-cron-secret` and confirm a `crisis_alert_runs` row appears and (if forcing a breach) an email arrives.

### Synthetic liveness probe (INFRA-265)

A scheduled edge function (`crisis-liveness-probe`, pg_cron every 6h) writes a clearly-tagged
**synthetic** marker to the dedicated `crisis_liveness_probe` table by driving the real
cron → edge → PostgREST write leg. The daily alerter reads `MAX(probed_at)` as a third axis
alongside liveness and spike:

| Probe status | Meaning | Alerts? |
|---|---|---|
| `live` | latest probe within `CRISIS_PROBE_STALENESS_HOURS` (default 12h) | no |
| `dead` | latest probe at/over the threshold — **authoritative dead pipeline** (ingest leg) | **yes** |
| `cold_start` | no probe marker recorded yet (pre-first-run) | no (advisory) |
| `future_skew` | probe timestamp in the future (clock skew) | no (anomaly noted) |

This turns INFRA-219's advisory `unproven` (real-detection liveness at zero volume) into an
authoritative signal: a `dead` probe pages **even when real volume is zero** — the dead-vs-quiet
discriminator. The probe verdict is **strictly additive** — it can raise a page but never
suppresses a real liveness/spike alert (the three axes are OR'd), and it lands on a SEPARATE
table the FEAT-129 views cannot reference (R2 boundary), with a belt-and-suspenders CHECK on
`analytics_events` that rejects any synthetic-tagged row.

> [!IMPORTANT]
> **Scope / honesty.** A `live` probe proves only the **ingest/cron/edge leg** is alive. It does
> NOT run the on-device app code, so it is NOT an end-to-end guarantee. The manual active-liveness
> assertion (step 1) remains the gold standard for the **on-device emit leg**. A green probe is not
> proof the app emits correctly.

**Setup additions** (alongside the INFRA-219 setup): the probe shares the `CRON_SECRET` edge
secret + `crisis_alert_cron_secret` Vault value; add one Vault secret `crisis_probe_function_url`
(= `https://<project-ref>.functions.supabase.co/crisis-liveness-probe`); deploy with
`supabase functions deploy crisis-liveness-probe`. After `supabase db push`, confirm the first
probe row lands: `SELECT * FROM crisis_liveness_probe ORDER BY probed_at DESC LIMIT 3;`.

### Residual limitations (accepted pre-launch; tracked as follow-ups)

- **Passive staleness ≠ true liveness (now backstopped for the ingest leg by INFRA-265).** A
  server-side cron cannot prove the *on-device* detection→Supabase pipeline is alive — only that
  recent rows exist. The INFRA-265 synthetic probe now supplies an **authoritative** dead-vs-quiet
  signal for the **ingest/cron/edge leg** (a missed probe pages), but it does NOT run the app code,
  so the **on-device emit leg** is still covered only by the manual active-liveness assertion
  (step 1), which remains the gold-standard end-to-end gate.
- **Watchdog shares Supabase's failure domain.** A total Supabase/project outage takes down both
  the alerter and its watchdog. An **external dead-man's-switch (healthchecks.io)** is the tracked
  follow-up that closes this gap.

---

## Out of scope (follow-ups)

- **Automated alerting** — ✅ **shipped in INFRA-219** (see the section above).
- **External dead-man's-switch (healthchecks.io).** Close the watchdog's shared-failure-domain
  gap with an out-of-Supabase watcher. _(Tracked: follow-up work item.)_
- **Synthetic end-to-end liveness probe** — ✅ **shipped in INFRA-265** (server-side probe; see
  "Synthetic liveness probe (INFRA-265)" above). Covered by DPIA v1.5. Residual: it exercises the
  ingest/cron/edge leg only — the on-device emit leg stays covered by the manual active-liveness
  assertion (step 1).
- **Inline-Q9 emit fix.** Correct `assessmentStore.ts` so the inline Q9 / suicidal-ideation
  path sets `severityLevel` and `assessmentType` before emit. _(Tracked: create a follow-up
  work item.)_
- **Supabase → PostHog forward** (old "Option 2"). Deferred — re-introducing
  wellness-derived signal into a third-party processor requires its own DPIA amendment. Not
  part of FEAT-129.
