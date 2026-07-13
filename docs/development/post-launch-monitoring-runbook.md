# Post-Launch Monitoring & Alerting Runbook (INFRA-282)

**Audience:** founder-operator (release-health + ops).
**Purpose:** the single evidence ledger for the **five INFRA-87 "Monitoring alerts" line
items** — what each alert is, the mechanism, how to stand it up, how to *verify* it is live,
and (for the pieces that are dashboard-only) the exact operator steps. INFRA-282 ships the one
code-side alert (the subscription-verification watchdog) and documents the other four.

> [!IMPORTANT]
> **This is ops / subscription / app-health monitoring — a SEPARATE trust domain from the
> crisis pipeline.** The crisis-detection alerter, watchdog, liveness probe, and external
> dead-man's-switch (INFRA-219 / 264 / 265, see `crisis-analytics-runbook.md`) are
> safety-critical and use their own secrets and channels. Nothing in *this* runbook may sit in
> a detection / 988 / intervention path, and none of these alerts reuse the `crisis_alert_*`
> secrets. Keep the two domains independently rotatable.

> [!NOTE]
> **Pre-launch context (2026-06):** no live subscribers yet. Thresholds below are starting
> points to **tune after launch** once there is real traffic. This is a launch-readiness
> completeness item, not a pre-launch blocker.

---

## The five alerts at a glance (AC ledger)

| # | Alert | Mechanism | Surface | Status (2026-06-18) |
|---|---|---|---|---|
| 1 | App crash rate > 1% | Sentry metric alert (release-health crash-free rate) | Sentry dashboard | ⏳ operator to create — see [§1](#1-crash-rate-alert-sentry) |
| 2 | API / edge error rate > 5% | Sentry metric alert (+ Supabase logs for edge) | Sentry dashboard | ⏳ operator to create — see [§2](#2-error-rate-alert-sentry) |
| 3 | Sustained Supabase connection failures | Supabase project notifications + external watcher | Supabase dashboard | ⏳ operator to enable — see [§3](#3-supabase-connection-failure-alert) |
| 4 | Subscription-verification automation dead | `subscription_verification_watchdog()` pg_cron + Resend | **code (this PR)** | ✅ migration shipped; needs deploy + Vault bootstrap — see [§4](#4-subscription-verification-failure-watchdog-shipped) |
| 5 | Crisis-button / 60fps perf regression | on-device Maestro budgets (prod RUM deferred) | Maestro / app | ✅ covered by pre-merge gate; prod RUM deferred — see [§5](#5-performance-degradation-alert-deferred-prod-rum) |

**Grounding (verified live 2026-06-18 against `being-production` = `yliycxslzdsgjtpxggtf` and
Sentry org `being-prod` / project `javascript-react`):**
- Sentry has **one** alert rule — the default onboarding issue rule "Send a notification for
  high priority issues" (ID `2878415`). **Zero metric alerts.** So §1/§2/§5 genuinely do not
  exist yet.
- Prod has 5 cron jobs, **all `crisis-*`**. The INFRA-266 grace-period stack
  (`grace_period_automation_runs` table + `grace-period-automation` cron) is **not applied in
  prod** — see the deploy-ordering prerequisite in [§4](#4-subscription-verification-failure-watchdog-shipped).

---

## PII-free constraint (applies to every alert)

Every alert payload — Sentry notification, Supabase email, the watchdog Resend body — carries
**counts, rates, category labels, statuses, and day-level timestamps only**. Never `user_id`,
`session_id`, `subscription_id`, receipt data, email addresses of users, or any per-user
value. This mirrors the INFRA-219 DPIA boundary (generalized to the ops domain — this is
subscription/ops data, not wellness data). The watchdog (§4) is PII-free by
construction (it transmits only status text + a timestamp). For Sentry, prefer aggregate
metric alerts over notifications that embed event detail; if an issue-alert notification is
used, confirm it does not forward user context fields.

---

## 1. Crash-rate alert (Sentry)

**AC:** fire when the app crash rate exceeds **1%** over a defined window. Sentry is already the
crash/error sink.

The Sentry MCP wired to this session is **read/verify-only for alerts** — it can inventory and
confirm rules (`find_alert_rules`, `get_alert_rule`) but **cannot create them**. Create the rule
in the dashboard, then verify with the MCP.

**Create (Sentry → Alerts → Create Alert):**
1. Alert type: **Metric alert** → dataset **Sessions / Release Health**.
2. Metric: **Crash free session rate**, project `javascript-react`.
3. Trigger: **Critical** when crash-free session rate **< 99%** (= crash rate > 1%) over a
   **1 hour** window. (Optionally a Warning at < 99.5%.)
4. Environment: `production`.
5. Action: notify the founder channel (email / Slack integration). No user context in payload.
6. Name it `crash-rate >1% (INFRA-87)`.

> [!WARNING]
> **The crash-free-session-rate metric has NO data source today.** Crash-free *session* rate
> depends on release-health **session** tracking, but the app deliberately disables it:
> `ExternalErrorReporter.ts:232` sets `autoSessionTracking: false` (an intentional privacy-first,
> error-only Sentry config — see the "Disable features that could leak sensitive data" block). So
> a crash-free-session-rate alert will sit at **"no data"** until sessions are enabled. Two paths:
> - **Interim (no code change):** create a **Number of Errors** metric alert (Critical when crash
>   events exceed a tuned absolute count/hour). A count, not a true 1% rate, but it fires today.
> - **True crash-rate (code change):** flip `autoSessionTracking: true`, which requires a privacy
>   re-review of the session payload against the existing `beforeSend`/`normalizeDepth` controls
>   (sessions add release/device/OS context) — then use crash-free-session-rate < 99%. Track as a
>   follow-up; don't flip it silently.
>
> Either way, dev no-ops Sentry (empty DSN), so this only populates from TestFlight/prod builds.
> Confirm data exists in **Releases → Health** before trusting the alert.

> [!IMPORTANT]
> **PostHog is NOT an alternative crash source — don't reach for it.** Verified 2026-06-18: the
> Being PostHog project (`111221`) has captured **0 exception / error-tracking issues in 90 days**
> (no `$exception` capture is wired; the app sends product events only). And it must not be the
> source even if wired: PostHog is **consent-gated** (it won't initialize without analytics
> consent — the same reason crisis telemetry routes to Supabase, not PostHog, per INFRA-214), so
> any crash rate derived from it has a **biased denominator** — it cannot see crashes from users
> who declined analytics or crashes before the consent gate. Crash-free rate belongs in **Sentry**
> (not consent-gated; the designated crash/error sink). **Net: a true crash-rate signal exists in
> neither sink today** — the interim error-count alert above is the honest option until Sentry
> session tracking is enabled.

**Verify (after creating):**
```
find_alert_rules(organizationSlug='being-prod', regionUrl='https://us.sentry.io', kind='metric')
```
The new rule must appear with `status: enabled`. Record its URL in the AC ledger.

---

## 2. Error-rate alert (Sentry)

**AC:** fire when the API / edge-function error rate exceeds **5%** over a defined window.

This AC spans two surfaces — be honest about which Sentry covers:

**2a. App-side API error rate → Sentry metric alert.** A true `failure_rate()` alert needs
transaction/tracing data — but the app has tracing **off today**: `ExternalErrorReporter.ts:233`
sets `enableAutoPerformanceTracing: false` and no `tracesSampleRate` (same intentional error-only
config as §1). So **today, only a count-based alert is available**: create a **Number of Errors**
metric alert (Critical when error events exceed a tuned absolute count/hour, env `production`) —
a count, not a true 5% rate. To get an actual rate, enable tracing (`tracesSampleRate > 0` +
`enableAutoPerformanceTracing: true`), which requires the same privacy re-review as §1
(transaction payloads vs. `beforeSend`/`normalizeDepth`), then alert on `failure_rate() > 0.05`
over 1h (dataset: Transactions/Spans). Verify current state: the Sentry **Performance** tab is
empty until tracing is on.

**2b. Edge-function error rate → Supabase, not this Sentry project.** The Supabase edge
functions (`grace-period-automation`, `crisis-*`, `subscription-webhook`, receipt verifiers) are
Deno and **do not report to the `javascript-react` Sentry project**. Their error rate is observed
via **Supabase → Edge Functions → Logs** (and the §3 connection/health notifications). The
subscription watchdog (§4) is the targeted alert for the one edge function whose silent death has
direct revenue impact; generic edge error-rate alerting is a Supabase-logs / log-drain concern,
overlapping §3.

**Verify:** same `find_alert_rules(... kind='metric')` check; confirm the app-side rule is
enabled.

---

## 3. Supabase connection-failure alert

**AC:** fire on **sustained** Supabase connection / edge-function failures.

> [!IMPORTANT]
> A connection-failure alert that lives **inside** Supabase shares the failure domain it is
> meant to watch — if the project is down, an in-DB `pg_cron` check can't fire either. The
> robust form needs an **external** watcher. That external dead-man's-switch already exists for
> the crisis pipeline (healthchecks.io, INFRA-264) and is tracked as a **separate follow-up** for
> the ops domain — it is out of scope here. Do not re-implement it as an in-Supabase cron.

**In-scope operator actions:**
1. **Enable Supabase project notifications:** Supabase dashboard → **Account → Notifications**
   (and Project settings) → turn on project-health / outage notifications for
   `being-production`. This covers Supabase-side incidents Supabase itself detects.
2. **Edge-function failures:** the §4 watchdog is the high-value, targeted signal (the
   revenue-critical scheduled job going silent). For broader edge error visibility, review
   **Edge Functions → Logs** post-release, or wire a **log drain** to an external service as the
   future robust path.
3. **Document the residual:** true "Supabase is wholly down" paging is the external-watcher
   follow-up, by design — note it as accepted until that item ships.

---

## 4. Subscription-verification-failure watchdog (SHIPPED)

**AC:** a `pg_cron` watchdog mirroring `crisis_alert_watchdog` escalates via Resend when
`grace-period-automation` has had no clean run in N hours **OR** its latest
`grace_period_automation_runs` row is `error`.

**What shipped (this PR):** `supabase/migrations/20260618000000_subscription_verification_watchdog.sql`
adds `public.subscription_verification_watchdog()` + the `subscription-verification-watchdog`
cron (every 6h). It reads the INFRA-266 heartbeat table `grace_period_automation_runs` (writes
nothing) and, when unhealthy, sends an **independent direct Resend POST** to the founder.

- **Healthy (silent)** ⟺ a `status='ok'` run landed within **26h** AND the latest run is not
  `error`. (Grace-period runs daily at 02:00 UTC; 26h tolerates one slightly-late run, pages on a
  missed day. Verified across 6 boundary scenarios incl. 25h→silent, 27h→escalate, latest-error→
  escalate, never-ran→escalate.)
- **Own trust domain:** distinct Vault secrets `subscription_alert_resend_key` / `_from` / `_to`
  (you MAY point them at the same Resend account + inbox as crisis; the names stay distinct so the
  domains rotate independently). PII-free payload — status text + timestamp only.

> [!WARNING]
> **Deploy-ordering prerequisite — INFRA-266 must reach prod FIRST.** As of 2026-06-18 the
> grace-period stack is **not applied in production**: `grace_period_automation_runs` does not
> exist and `grace-period-automation` is not scheduled. The watchdog reads that table, so until
> INFRA-266's migration (`20260616000000_grace_period_automation_cron`) is applied **and** the
> `grace-period-automation` edge function is deployed + firing, the watchdog cron will error at
> runtime (`relation … does not exist`) or correctly page "never ran." **`supabase db push` of
> this migration will NOT fail on the absent table** — plpgsql parses the function body lazily, so
> the failure is silent until the cron runs. Apply INFRA-266 first; then this.

**Setup (one-time; nothing here is committed to git):**
1. **Vault secrets** (dashboard → Vault, or non-committed psql), read by the watchdog SQL by name:
   `subscription_alert_resend_key` (a Resend API key), `subscription_alert_from`
   (e.g. `Being Alerts <alerts@being.fyi>`), `subscription_alert_to` (founder inbox).
2. **Deploy:** `supabase db push` (applies this migration — *after* INFRA-266's).
3. **Order of operations:** INFRA-266 migration + `grace-period-automation` edge deploy + first
   successful grace run → then rely on this watchdog. Otherwise expect a (correct) cold-start page.

**Verify it is live (row/fire-based, never inventory — mirrors the crisis deploy-verification):**

| # | Check | Query | Pass bar |
|---|---|---|---|
| 1 | Prereq table exists | `SELECT to_regclass('public.grace_period_automation_runs');` | non-null (INFRA-266 applied in prod) |
| 2 | Watchdog scheduled + active | `SELECT jobname, schedule, active FROM cron.job WHERE jobname='subscription-verification-watchdog';` | one row, `active = true`, `0 */6 * * *` |
| 3 | Function escalates correctly | with the table empty/stale, run `SELECT public.subscription_verification_watchdog();` then `SELECT status, count(*) FROM net._http_response WHERE created >= now()-interval '2 min' GROUP BY 1;` | a Resend POST was enqueued (a `200`) **only** when unhealthy; silent when a fresh `ok` row exists |
| 4 | Secrets present | (functional proof) a forced-unhealthy run produces a Resend `200`, not a `WARNING: escalation secrets missing` | email arrives at `subscription_alert_to` |

> [!NOTE]
> `net.http_post` is async (pg_net): a cron "success" only means the request was *enqueued*.
> Prove delivery by a `net._http_response` `200` and/or the email arriving — never by job status.

---

## 5. Performance-degradation alert (deferred prod RUM)

**AC:** flag when the crisis-button budget (`<200ms`) or breathing animation (`60fps`) regresses
**— or document why these remain on-device/Maestro-only and defer prod RUM as a follow-up.** This
runbook takes the documented-defer path. The rationale is substantive, not a dodge:

1. **A crisis-button latency regression is a safety contract, and the strongest control for a
   contract is a gate that blocks it pre-merge — not a prod alert that fires after users felt it.**
   That gate already exists: the on-device Maestro flow enforcing `<200ms` / 60fps
   (`app/.maestro/`, gated by `/b-close` Phase 2.5). Prod RUM is a *trailing* indicator; for a
   safety budget the *leading* gate dominates.
2. **The two AC5 budgets need app-code work, not a config flip.** The crisis-tap `<200ms`
   measurement needs a **custom span** wired into the tap handler (real app-code instrumentation).
   Sentry *does* auto-emit app-start and slow/frozen-frame metrics as config (no custom spans) —
   but (a) they're **not free today**: the app is error-only (`enableAutoPerformanceTracing: false`,
   no `tracesSampleRate` at `ExternalErrorReporter.ts:233`), so enabling them is a deliberate change
   + privacy re-review; and (b) they **don't map to either AC5 budget** — app-start measures the
   *launch* budget (`<2s`), not crisis-tap `<200ms`, and slow/frozen-frames is *app-wide*, not the
   *breathing-circle* 60fps specifically (mobile frame-rate alerting is coarse/noisy). So both the
   custom-span and config paths defer for the same reason as (3).
3. **Pre-launch there are no users → no RUM signal.** Building the alarm now wires it to a silent
   sensor; thresholds can't be tuned against zero traffic.

**Latency lives in three places — don't conflate** (mirrors the crisis runbook): the 988-button
`<200ms` span is a **Sentry** concept *if/when* RUM is wired; detection counts are **Supabase**;
button-access (`<3 taps / <3s`) is pinned by **Maestro**, not telemetry.

**Follow-up (post-launch):** revisit Sentry performance/RUM for the crisis-tap transaction once
there is real traffic, alongside the ops-domain external-watcher follow-up. Tracked as a Notion
item.

---

## Out of scope (follow-ups)

- **External ops dead-man's-switch** (healthchecks.io for Supabase/edge total-outage) — the §3
  robust form; mirrors INFRA-264 but for the subscription/ops domain. Not in this PR.
- **Prod performance RUM** (§5) — deferred with rationale above; revisit post-launch.
- **Generic edge-function error-rate alerting** (§2b) — Supabase log-drain concern; the §4
  watchdog covers the one revenue-critical scheduled job.

---

## Appendix — verifying the whole picture with the MCPs

- **Sentry (read/verify):** `find_alert_rules(organizationSlug='being-prod',
  regionUrl='https://us.sentry.io', kind='metric')` and `kind='issue', projectSlug='javascript-react'`
  to inventory rules and confirm the §1/§2 alerts exist after you create them in the dashboard.
- **Supabase (apply/verify):** `list_migrations` + `cron.job` query to confirm INFRA-266 then
  INFRA-282 are applied in prod; the §4 verification table proves the watchdog fires.
- **Merged ≠ deployed.** There is no CI auto-deploy for Supabase migrations/functions/secrets — a
  PR merging to `development`/`main` does not touch the live project. Run the §4 verification after
  every deploy and secret rotation. (This is why the grace-period stack was found dormant in prod.)
</content>
</invoke>
