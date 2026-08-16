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
| 3 | Sustained Supabase connection failures | Supabase project notifications + **external healthchecks.io dead-man's-switch (INFRA-296)** | Supabase dashboard + healthchecks.io | ✅ code shipped; needs deploy + secret + check creation, **in that order** — see [§3](#3-supabase-connection-failure-alert) |
| 4 | Subscription-verification automation dead | `subscription_verification_watchdog()` pg_cron + Resend | **code (this PR)** | ✅ migration shipped; needs deploy + Vault bootstrap — see [§4](#4-subscription-verification-failure-watchdog-shipped) |
| 5 | Crisis-button / 60fps perf regression | crisis **detection** <200ms: strict CI gate. Crisis **button**: coarse jest proxy. 60fps: **structural proxy only, frame rate unmeasured** (INFRA-306 Layer A; measurement is INFRA-373) | jest / CI | ⚠️ partially covered — Maestro enforces none of these; prod RUM deferred — see [§5](#5-performance-degradation-alert-deferred-prod-rum) and [§5a](#5a-breathing-circle-60fps--what-the-control-actually-is) |

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

> [!NOTE]
> **CORRECTED 2026-07-25 (INFRA-295). The warning that used to sit here was wrong** — it said
> release-health sessions had "no data source today" because the app deliberately disabled them.
> It did not. `ExternalErrorReporter.ts` passed `autoSessionTracking: false`, but
> `@sentry/react-native` reads **`enableAutoSessionTracking`**; the key we set does not exist in
> the SDK, is forwarded verbatim to the native layer, and is ignored there — and both native SDKs
> default session tracking **ON**. So sessions have most likely been transmitting from every
> non-`__DEV__` build all along, and the "intentional privacy-first, error-only config" this
> runbook credited was never in effect.
>
> INFRA-295 corrected the key to `enableAutoSessionTracking: true`, keeping sessions as an
> intentional stability signal, and recorded the retrospective privacy review in
> `docs/legal/dpia-sensitive-wellness-data.md` §9 v1.7 + `privacy-policy.md` §5.1 (session
> envelopes bypass `beforeSend` entirely — they are envelope session items, not events — so that
> control never applied to them; the posture rests on the fixed session schema having no field
> for user content, and the residual is the per-install `did` identifier).
>
> **The "interim Number of Errors alert" this section used to recommend was never created** —
> verified live 2026-07-25: `being-prod/javascript-react` has exactly one rule, the default
> onboarding issue alert (ID 2878415), and **zero** metric alerts. There is nothing to supersede.
>
> **Crash attribution was also broken and is now fixed.** `applyAllowlist` stripped `mechanism`
> from the outbound payload, and the SDK's `isHardCrash()` requires
> `mechanism.handled === false && mechanism.type === 'onerror'`. Since `beforeSend` runs *before*
> envelope creation, no JS fatal ever marked its session crashed — crash-free session rate would
> have counted **native crashes only** and read systematically optimistic. Pinned by
> `app/__tests__/privacy/releaseHealthSession.contract.test.ts`.
>
> Dev no-ops Sentry (empty DSN), so this only populates from TestFlight/prod builds. **Still
> confirm data exists in Releases → Health before trusting the alert** — as of 2026-07-25
> `being-prod` had zero error events in 90 days, so the pipeline is not yet observed end-to-end.

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
> robust form needs an **external** watcher. **INFRA-296 shipped it for the ops domain**
> (code below); it mirrors the crisis pipeline's INFRA-264 switch one trust domain over.
> Do not re-implement it as an in-Supabase cron.

### The external dead-man's-switch (INFRA-296) — mechanism

On each clean run, the daily `grace-period-automation` edge function fires a bare `GET` to
an external healthchecks.io check as its **last** action. Nothing is transmitted but the
fact and timestamp of the request: no body, no query string, no headers, no identifiers.

The alert is the **silence**. If the ping does not arrive within the check's grace window,
healthchecks.io pages the founder from a failure domain Supabase cannot take down with it.
Every non-clean path is deliberately silent:

| Situation | Pings? |
|---|---|
| All five automation steps succeeded **and** the heartbeat row persisted | ✅ yes |
| Any step failed (note: the function still returns **HTTP 200** — errors are collected, not thrown, so the gate reads the error tally, never the status code) | ❌ no |
| The heartbeat write silently failed | ❌ no |
| Unauthorized call (401) — an unauthorized probe is not a run | ❌ no |
| Top-level exception (500) | ❌ no |
| Total Supabase/edge outage, or the cron is not scheduled — the function never runs | ❌ no |

> [!NOTE]
> **What a green check does and does not prove.** It proves ONLY that the daily ops cron
> executed cleanly and persisted its own heartbeat. It proves nothing about receipt
> validity, StoreKit/Play state, or whether any user's subscription status is correct —
> that is §4's job, and §4 is what a green-but-wrong pipeline would still trip.
>
> **Accepted residual:** the switch pings from the daily automation, not from the §4
> watchdog, so an *unscheduled watchdog* is not externally detected. The crisis domain
> accepts the identical residual — INFRA-264 also pings from the alerter rather than from
> `crisis_alert_watchdog`. Stated here so it is inherited knowingly rather than silently.

### Trust-domain separation (non-negotiable)

This check has its **own** healthchecks.io check and its **own** ping-URL secret
(`SUBSCRIPTION_HEALTHCHECK_PING_URL`), distinct from the crisis pipeline's
`CRISIS_HEALTHCHECK_PING_URL`. Never point both at one check: the two domains must rotate
and page independently, and a shared check would let an ops-side rotation silently break
crisis paging. This mirrors the `subscription_alert_*` vs `crisis_alert_*` Vault split.

The ping URL is a **capability secret** — anyone holding it can silence the alarm. It is
never committed, never logged, and never written to a row; the
`crisisAlertNoSecrets.config.test.ts` static pin fails the commit if a healthchecks.io
capability URL appears anywhere it scans (it matches URL *shape*, so it covers both
domains). The pin cannot verify *distinctness*, though — it forbids both URLs identically.
Keeping the two checks separate is console discipline, which is why it is written down here.

### Setup checklist (operator, out of PR)

> [!WARNING]
> **Order matters, and arming early is worse than arming late.** A check created before the
> daily cron exists pages continuously and correctly, because a never-pinged check is
> indistinguishable from a dead one. As of this writing the grace-period stack is **not
> applied in prod** (see the grounding note above), so steps 1–2 are genuine prerequisites,
> not formalities. Tracked as INFRA-379.

1. **Deploy the grace-period stack** (`supabase db push`, Vault secrets first) and confirm
   with `SELECT jobname, schedule, active FROM cron.job;` that `grace-period-automation`
   exists and is active, and that `grace_period_automation_runs` is present.
   **Both ends of the cron bearer are `GRACE_PERIOD_*`, never `CRON_SECRET`** — Vault
   `grace_period_cron_secret` must equal the `GRACE_PERIOD_CRON_SECRET` **edge** secret.
   INFRA-379 renamed the edge side: edge secrets are project-wide and `CRON_SECRET` is the
   crisis pipeline's bearer, so pointing this job at it is the one way to break the
   trust-domain separation stated above while appearing to follow the instructions.
2. **Redeploy the edge function** — `supabase functions deploy grace-period-automation
   --no-verify-jwt` — so the deployed code contains both the heartbeat and this ping.
   **Then trigger one run by hand before step 3.** The §4 watchdog fires every 6h and
   escalates when `grace_period_automation_runs` has no `ok` row inside 26h — an empty
   table reads as `never`, so a watchdog armed ahead of the first 02:00 UTC run pages on a
   pipeline that is in fact healthy. One manual run seeds the heartbeat and doubles as the
   step-5 ping check.
3. **Create the healthchecks.io check.** A NEW check, distinct from the crisis one.
   **Period 1 day, grace 26h** — the daily 02:00 UTC cadence plus one tolerated skip, which
   also matches the 26h healthy window hard-coded in the §4 watchdog. If the cron schedule
   ever changes, **these three move together**: the cron expression, the watchdog's
   interval, and this grace window.
4. **Set the secret:** `supabase secrets set SUBSCRIPTION_HEALTHCHECK_PING_URL='…'`.
   An unset secret makes the ping skip *silently* by design, so this step is not optional
   and its omission is not self-announcing.
5. **Verify the first ping actually landed.** `supabase secrets list` showing the name set
   is NOT sufficient — a never-pinged check looks identical to a newly-created one. Trigger
   a run with a valid `x-cron-secret`, confirm the check flips to *up*, then let one period
   lapse and confirm it pages.

**Remaining in-scope operator actions:**
1. **Enable Supabase project notifications:** Supabase dashboard → **Account → Notifications**
   (and Project settings) → turn on project-health / outage notifications for
   `being-production`. This covers Supabase-side incidents Supabase itself detects.
2. **Edge-function failures:** the §4 watchdog is the high-value, targeted signal (the
   revenue-critical scheduled job going silent). For broader edge error visibility, review
   **Edge Functions → Logs** post-release, or wire a **log drain** to an external service as the
   future robust path.

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
   Prod RUM is a *trailing* indicator; for a safety budget the *leading* gate dominates.

   > [!WARNING]
   > **CORRECTED 2026-07-25 (MAINT-307).** This point previously read *"That gate already exists:
   > the on-device Maestro flow enforcing `<200ms` / 60fps."* **It does not exist.** Verified across
   > all 8 flows in `app/.maestro/`: there is not one ms or fps assertion, only `timeout:` failure
   > ceilings. `crisis-button-reachability.yaml:34-35` says so itself — *"on-device timing budgets
   > live in CLAUDE.md's Performance Budgets section and are validated by hand until a real perf
   > harness exists."*
   >
   > What actually enforces what, as of 2026-07-25:
   > - **Crisis detection `<200ms` — strict CI gate.** `__tests__/performance/assessment-performance.test.ts`
   >   asserts `toBeLessThan(200)` for suicidal-ideation detection, run by the `Performance regression` job.
   > - **Crisis button `<200ms` — coarse jest proxy only.** `CollapsibleCrisisButton.behavioral.test.tsx:51`;
   >   its own comment concedes it measures synthetic event dispatch, not tap→render.
   > - **Breathing 60fps — no measurement; a structural proxy since INFRA-306.** See
   >   [§5a](#5a-breathing-circle-60fps--what-the-control-actually-is) below for exactly what
   >   the proxy does and does not cover. The frame rate itself is still unmeasured.
   > - **App launch `<2s`, check-in transition `<500ms` — nothing.** Hand-validated.
   >
   > Note `__tests__/reporters/performance-regression-reporter.js` does **not** gate: it is non-strict
   > unless `PERF_REGRESSION_STRICT=true`, and its own comment says it is for "really slow test"
   > warnings. `performance-baselines.json`'s `crisis_response_ms: 9.38` is a recorded baseline, not a
   > threshold.
   >
   > The deferral above still stands on its other leg — reason 3, that pre-launch there is no traffic
   > to alert on or tune against. But it can no longer lean on a leading gate that was never built.
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

## 5a. Breathing-circle 60fps — what the control actually is

**Shipped by INFRA-306 (Layer A), 2026-07-25.** Read this section before citing a 60fps control
anywhere, because the honest answer is narrower than the name suggests.

### What exists

`app/scripts/check-breathing-worklet-purity.js`, run as `npm run check:breathing-worklets` in the
`Performance regression` CI job. It **fails the build** when the shape of the already-fixed
PERF-01/PERF-02 regression (commit `ff591f3a`) reappears on the breathing animation path:

| Rule | What it catches |
|---|---|
| `runOnJS` inside a `useAnimatedStyle` / `useDerivedValue` / `useAnimatedReaction` body | a JS-thread hop on **every frame** — the PERF-02 regression |
| React state setter inside those same bodies | a re-render on every frame |
| `requestAnimationFrame` on the animation path | JS-thread frame sampling — wrong thread, and the pattern PERF-02 deleted |
| `BreathingCircle` default export losing its `React.memo` wrapper | parent re-renders reconciling the circle mid-animation |
| `DEFAULT_PATTERN` / `DEFAULT_PHASE_TEXT` ceasing to be module-scope constants | new object identity each render, defeating `React.memo` (the PERF-01 fix) |

Guarded files are listed explicitly in `ANIMATION_PATH_FILES`, so widening the guarded set is a
visible diff rather than a side effect of where a new component was placed. Escape hatch:
`// breathing-worklet-skip: <reason>` on the line directly above. Expect zero usages.

### What it does NOT cover — say this plainly

- **It does not measure frames.** Not one. It is a *structural proxy* that pins a known-good
  shape in place. A file can satisfy every rule above and still drop frames on a real device.
- **CI cannot ever measure them.** All 12 jobs in `.github/workflows/ci.yml` are
  `runs-on: ubuntu-latest`; nothing there renders a frame. This is the same constraint that made
  Maestro safety-e2e local-only (INFRA-171).
- **Maestro cannot measure them either.** Verified across all 8 flows in `app/.maestro/`: zero ms
  or fps assertions, only `timeout:` failure ceilings. `crisis-button-reachability.yaml:34-35`
  says so in-file.
- **The 60fps number has never been validated on hardware**, and it is device-naive as written —
  see below.

### Why "60fps" is the wrong unit, for whoever builds INFRA-373

ProMotion iPhones run at 120Hz, where nominal frame time is **8.3ms, not 16.67ms**. A UI thread
delivering a steady 60fps on such a device is dropping **half** its frames while sailing past any
`fps >= 55` floor. Mid-tier Android spans 60/90/120Hz. So the budget must eventually be expressed
as a **dropped-frame ratio against the device's own measured nominal refresh interval**, not the
literal `60` in `CLAUDE.md`'s Performance Budgets table. Reanimated's `FrameInfo` exposes only
`timestamp` / `timeSincePreviousFrame` / `timeSinceFirstFrame` — no refresh rate — so normalising
needs a native call (`UIScreen.maximumFramesPerSecond`, Android `Display.getRefreshRate()`) that
does not exist in this codebase yet.

### Removed in the same change: a fabricated metric

`RenderingOptimizer.getJSFrameRate()` and `getUIFrameRate()` returned `58 + Math.random() * 4` and
`59 + Math.random() * 2` under a *"Mock implementation - in real app, use native bridge"* comment.
They populated `FrameMetrics.jsFrameRate` / `.uiFrameRate`, which were **write-only** — nothing in
`src/` or `__tests__/` ever read them, and the `frame_metrics_collected` event they rode on has no
listeners. No live gate was asserting on random numbers, but the trap was set: anyone told to
"wire up the existing UI frame rate" would have produced a permanently-green control. Both getters
and both fields are gone.

**`RenderingOptimizer` no longer exists (MAINT-252).** The paragraph that stood here described it
as reachable only through `useAssessmentPerformance`, whose sole consumer was the demo component
`AssessmentIntegrationExample.tsx`, and pointed at a warning in its module header. MAINT-398
deleted that consumer chain and MAINT-252 then deleted the whole of
`app/src/core/services/performance/`, module header included — so the warning has to live here
instead, because the reasoning outlives the module:

> A `requestAnimationFrame` loop samples the **JS thread**. The breathing circle carries the
> therapeutic budget and runs entirely in Reanimated worklets on the **UI thread**, which a rAF
> loop cannot observe. A JS-thread rAF loop is also the exact pattern PERF-02 (commit `ff591f3a`)
> deleted from `BreathingCircle.tsx` *as a performance fix*. Do not rebuild one and call it the
> 60fps control.

Deleted with it: a `deltaTime > 20` dropped-frame constant and an `fps >= 55` "smooth" threshold —
both device-naive in exactly the way described two sections above, and both a live temptation for
whoever picks up INFRA-373.

The 60fps control is, and remains, `check-breathing-worklets` (structural proxy) plus INFRA-373
(the real on-device UI-thread measurement, still unbuilt).

### The real control

**INFRA-373** — a UI-thread `useFrameCallback` probe accumulating in shared values, a
flag-scoped HUD, and a device-only Maestro flow asserting the rendered number via
`copyTextFrom` + `assertTrue`. Blocked on naming a calibration handset: there is no device
inventory in this repo, and the only model named anywhere (`ACCESSIBILITY_TESTING_GUIDE.md:326`,
iPhone 13 Pro) is a bug-report template example — and is a 120Hz ProMotion device, so neither
mid-tier nor 60Hz.

---

## Out of scope (follow-ups)

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
- **What is now automated, and what is not (INFRA-442).** `node scripts/supabase-deploy-drift.js
  --reconcile` runs in CI's `security` job and fails a PR that introduces a secret name, a Vault
  name or a function nobody declared in `supabase/deploy-manifest.json`. That closes the commonest
  *cause* of live drift — a name nobody provisioned — on the PR that creates it. It does **not**
  observe the live project, so it cannot tell you whether anything is deployed; the bullet above
  still stands. The live probe is INFRA-448 and is blocked on a Supabase PAT (repo secrets hold
  only `SUPABASE_URL` + `SUPABASE_ANON_KEY`, and the anon key can read none of the three drift
  classes). Until it lands, the §4 manual verification remains the only check on deployed state.
- **The mirror direction — deployed ≠ merged (INFRA-454).** Everything above asks whether prod is
  behind the repo. It does not answer whether prod contains objects the repo has never heard of,
  and `supabase/migrations/` is **not** a complete description of production. A census dated
  2026-08-16 lists every such object and why each is platform-managed rather than ours:
  `supabase/README.md` → *Objects present in production but created by no migration*. Read it
  before treating "the migration is in the repo" as proof the object in prod came from it.
