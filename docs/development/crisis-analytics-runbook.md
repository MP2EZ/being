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

> Re-identification is managed by four controls: (1) **severity-bucketing** — no raw
> PHQ-9/GAD-7 scores or Q9 values are stored or queried; (2) **absence of
> quasi-identifiers** — no device id, name, IP, or geolocation is associated with any
> crisis event; (3) **daily session rotation** — the anonymous `session_id` does not
> persist across calendar days and cannot be joined to a user identity; (4) **operator-only
> views** — aggregate data is reachable only via service-role credentials, never the
> `authenticated` role or a client-facing path. **k-anonymity and differential privacy are
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

## Out of scope for v1 (follow-ups)

- **Automated alerting.** Native Supabase has no insight-alerting; volume/drift alerts
  would need new infra (pg_cron + an edge function notifying a founder-reachable
  destination). Deferred to a separate item — for v1, run the drift scan above manually
  after each release. _(Tracked: create a follow-up work item.)_
- **Inline-Q9 emit fix.** Correct `assessmentStore.ts` so the inline Q9 / suicidal-ideation
  path sets `severityLevel` and `assessmentType` before emit. _(Tracked: create a follow-up
  work item.)_
- **Supabase → PostHog forward** (old "Option 2"). Deferred — re-introducing
  wellness-derived signal into a third-party processor requires its own DPIA amendment. Not
  part of FEAT-129.
