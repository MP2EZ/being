# Data Protection Impact Assessment — Sensitive Wellness Data

**Document scope:** Internal compliance artifact. Regulator-facing only. Not for public distribution.

---

## 1. Document Control

| Field | Value |
|---|---|
| Document title | Data Protection Impact Assessment — Sensitive Wellness Data |
| Version | 1.7 |
| Effective date | 2026-05-24 |
| Last amended | 2026-07-25 (INFRA-295 — see §9 change log) |
| Next scheduled review | 2027-05-24 |
| Owner | Palouse Labs LLC (sole proprietor) — responsibility is non-delegable |
| Application | Being (Stoic Mindfulness wellness app) |
| Triggering statutes | Tex. Bus. & Com. Code §541.105(a) (TDPSA), C.R.S. §6-1-1309 (CPA), Va. Code §59.1-580 (VCDPA), Conn. Pub. Act 22-15 §6 (CTDPA) |
| Surfaced by | INFRA-83 regulatory re-scope audit (2026-05-24) |

**Material change trigger.** This assessment will be revised before, not after, any of the following:

- A new category of sensitive wellness data is collected, derived, or inferred.
- A new third-party processor receives any sensitive wellness data.
- The local-first architecture changes — for example, sensitive wellness data becomes server-decryptable, or a non-user party gains decryption keys.
- Being begins serving a new jurisdiction whose privacy law differs materially from those listed above.

---

## 2. Scope

**Processing activities covered by this DPIA:**

- Local-first capture, storage, and display of sensitive wellness data on a user's own device.
- Optional end-to-end encrypted backup to Supabase. The user holds the encryption key; Supabase has no decryption capability.
- Subscription billing metadata processed via Stripe. Stripe receives payment instruments and transaction state; Stripe does not receive any wellness content.
- Product analytics (PostHog) — severity-bucket aggregates and feature-engagement events, transmitted only when the user has granted analytics consent (PostHog is not initialized without it; universal opt-out suppresses transmission). PostHog receives no raw screening scores, no Q9 value, no journal content, and no quasi-identifiers. EU data residency (Frankfurt).
- Crisis-detection telemetry (Supabase `analytics_events`) — a `crisis_detected` event recorded to Being's own first-party table when a PHQ-9 total ≥20, a non-zero PHQ-9 Q9, or a GAD-7 total ≥15 is detected. Recorded **regardless of analytics consent** under GDPR Art. 6(1)(d)/9(2)(c) vital interests (see §4 and the standalone `lia-crisis-telemetry.md`). Payload: `trigger_type` (category — `phq9_suicidal_ideation` / `phq9_severe_score` / `phq9_moderate_severe_score` / `gad7_severe_score`), `severity_bucket`, `intervention_surfaced`, `assessment_type`. No raw score, no Q9 value, no device identifier; `session_id` is a daily-rotated anonymous token that cannot be joined to a user identity.
- Error and crash telemetry via Sentry — payload scrubbing in place per §7. Sentry also receives release-health session data (session start/end, duration, crash status) carrying a per-install identifier (not linked to identity or wellness data); see §9 v1.7 for the retrospective finding.
- Crisis-monitoring operational egress — the `crisis-detection-alerting` edge function emails the founder on a breach via **Resend** (aggregate, non-personal alert payload; see §9 v1.4) and fires a PII-free liveness heartbeat to **healthchecks.io** as an external dead-man's-switch (INFRA-264; an opaque HTTP ping carrying no user data, no wellness data, and no identifier — see §9 v1.6). Neither receives sensitive wellness data.

**Out of scope.** Being does not engage in advertising, data sale, third-party sharing for non-service purposes, profiling for automated decisions, or training of generative models. See `docs/legal/privacy-policy.md` §5 for the public confirmation.

**Architecture summary.** Local-first by design. The user's device is the primary system of record; optional cloud backup contains only opaque encrypted blobs. The full technical specification is in `docs/security/security-architecture.md`.

---

## 3. Data Categories and Sensitivity Classification

The following categories are classified as **sensitive personal information** under one or more of the triggering statutes. Mental and physical health condition data is enumerated as "sensitive data" in each statute's definitional section (see §11).

| Category | Examples | Classified sensitive under |
|---|---|---|
| Wellness screening responses — depression module | PHQ-9 item responses, total score, Q9 self-harm indicator | TDPSA, CPA, VCDPA, CTDPA |
| Wellness screening responses — anxiety module | GAD-7 item responses, total score | TDPSA, CPA, VCDPA, CTDPA |
| Mood check-in records | Numeric mood rating, optional context tag | TDPSA, CPA, VCDPA, CTDPA |
| Reflective writing | Journal entries from Stoic Mindfulness practices | TDPSA, CPA, VCDPA, CTDPA |
| Crisis safety plan content | Personal warning signs, coping strategies, support contacts | TDPSA, CPA, VCDPA, CTDPA |
| Consent records for sensitive-data processing | Acknowledgment timestamps for explicit consent under GDPR Art. 9(2)(a) where applicable, and state-law sensitive-data consent | Derivative — sensitive because the consent record itself confirms a user's participation in mental wellness self-screening |
| Subscription status and transaction history | Active plan, billing events, entitlement status for crisis-resource features | Derivative — sensitive because correlation confirms ongoing engagement with mental wellness self-monitoring services |

Where this DPIA refers to "sensitive wellness data" without qualification, all seven categories are intended.

---

## 4. Purposes of Processing

Each of TDPSA, CPA, VCDPA, and CTDPA requires opt-in consent for processing of sensitive personal information. That state-law sensitive-data consent is the operative basis for each purpose involving categories enumerated in §3; tracking is described in the consent-records entry of §3. The "GDPR Art. 6 equivalent" column below maps each purpose to the corresponding GDPR lawful basis for cross-jurisdictional clarity — it is the equivalent, not a substitute for state-law consent.

| Purpose | Categories used | GDPR Art. 6 equivalent (where applicable) |
|---|---|---|
| Wellness self-monitoring — present a user's own screening history and trends to themselves | Wellness screening responses, mood check-ins, journal | User consent; service provision |
| Personal insights — derive aggregated, on-device patterns to support self-reflection | Wellness screening responses, mood check-ins | User consent; service provision |
| Crisis-resource access — surface 988 and personal crisis contacts when self-harm indicators are present | Wellness screening responses (PHQ-9 Q9), crisis safety plan content | Vital interests; user safety |
| Crisis-detection telemetry — record an aggregate, PII-free `crisis_detected` event to first-party Supabase `analytics_events` when a crisis threshold is met, for operational safety monitoring (verify interventions surface correctly) | Wellness screening responses (category only — trigger type + severity bucket; not raw score or Q9 value) | GDPR Art. 6(1)(d) / 9(2)(c) vital interests; user safety. Recorded without analytics consent; universal opt-out does **not** suppress it. See `lia-crisis-telemetry.md`. |
| Subscription entitlement — confirm whether a user's paid plan is active for crisis-feature access | Subscription status and transaction history | Contract performance |
| Security and operational integrity — error monitoring, RLS-based isolation, audit logging on subscription events | Subscription transaction history; scrubbed error telemetry | Legitimate interests; legal obligation (breach detection) |

Being **does not** use any of the categories listed in §3 for advertising, data sale, profiling for automated decisions about a user, training of generative models, or any purpose not enumerated above.

---

## 5. Necessity and Proportionality

For each category in §3, Being collects the minimum needed for the stated purpose.

- **PHQ-9 (nine items)** is the standard short-form depression screener. A shorter instrument (PHQ-2, PHQ-4) was considered and rejected: it omits Q9 (self-harm indicator), which is the technical basis of Being's crisis-resource routing. PHQ-9 is the minimum that preserves the crisis-detection capability.
- **GAD-7 (seven items)** is the standard short-form anxiety screener. The GAD-2 sub-score lacks the granularity needed for the trend visualizations that motivate sustained self-monitoring. GAD-7 is the minimum that preserves the user-facing insight.
- **Mood check-ins** capture a single numeric rating and an optional context tag. This is the minimum signal needed to plot a mood trend.
- **Journal entries** are user-authored reflective writing. The user controls content and length. No content analysis, classification, or machine-learning inference is performed by Being or by any third party.
- **Crisis safety plans** are user-authored. They are collected because the alternative — no safety plan — materially reduces the effectiveness of the crisis-resource purpose.
- **Consent records** are collected because GDPR Art. 9(2)(a) requires them where it applies, and because state-law sensitive-data consent is a best-practice control. The record contains a timestamp and the acknowledged scope only — no derivative information.
- **Subscription metadata** is the minimum needed to enforce paid-tier entitlements; raw payment instruments are processed by Stripe, not by Being.

Local-first storage is the primary proportionality control: sensitive wellness data does not leave the user's device unless the user opts into encrypted backup. When opted in, cloud backup transmits only opaque encrypted blobs.

---

## 6. Risk Assessment

Scored on a qualitative 3×3 likelihood × impact matrix (Low / Med / High). "Pre-mitigation" assumes only baseline operating-system controls (no Being-specific protections). "Post-mitigation" reflects the controls inventoried in §7.

| # | Threat scenario | Pre-mitigation (Likelihood × Impact) | Post-mitigation (Likelihood × Impact) | Residual |
|---|---|---|---|---|
| 1 | Re-identification of an individual from in-app analytics aggregates | Med × Med | Low × Low | **Low** |
| 2 | Unauthorized access to sensitive wellness data via a lost, stolen, or shared device | High × High | Low × High | **Low** (likelihood) — see rationale |
| 3 | Compromise of optional cloud backup at the Supabase storage layer | Low × High | Low × Low | **Low** |
| 4 | Leakage of sensitive wellness data through error or crash telemetry (Sentry) | Med × Med | Low × Low | **Low** |

### 6.1 Rationale per scenario

**Scenario 1 — Re-identification from analytics aggregates.** After the INFRA-214 consolidation the analytics pipeline has two sinks, neither of which receives raw screening scores, Q9 values, journal content, location, device fingerprint, or any other quasi-identifier. **PostHog** (product analytics, consent-gated) carries severity buckets and feature-engagement events under EU data residency (Frankfurt). **Supabase `analytics_events`** (crisis-detection telemetry, vital-interests basis) carries only `trigger_type` (category), `severity_bucket`, `intervention_surfaced`, and `assessment_type`; its `session_id` is a daily-rotated anonymous token generated at app launch that does not persist across calendar days and cannot be joined to a user identity, and a DB CHECK constraint enforces that format. RLS isolates rows by an opaque identifier (`docs/security/supabase-rls-verification.md`, Analytics Events Table). **k-anonymity and differential privacy are NOT claimed** — the dead custom-API engine that notionally provided them was deleted in INFRA-214, and at pre-launch scale such thresholds are not operationally meaningful. Re-identification is instead managed by severity-bucketing, absence of quasi-identifiers, daily `session_id` rotation, and first-party RLS — sufficient to keep re-identification not realistically achievable. Post-mitigation residual: Low.

**Scenario 2 — Unauthorized device access.** This is the highest-impact scenario because device loss is common. Mitigations: sensitive wellness data is encrypted at rest using AES-256-GCM with keys held in operating-system-protected stores (iOS Keychain configured without iCloud sync; Android Keystore with StrongBox where available). Sensitive views require operating-system-level device unlock. See `docs/security/security-architecture.md` §1 (Encryption Methods for Local Storage) and §3 (Biometric Authentication Implementation). Likelihood that an attacker with physical possession of the device also defeats the device-unlock layer and the OS keystore is Low. Impact, were they to succeed, remains High because the content is sensitive — but the chain of controls makes successful exploitation a Low-likelihood outcome. The user remains the last line of defense by setting and protecting their device passcode/biometric.

**Scenario 3 — Cloud backup breach.** Optional cloud backups are stored as opaque encrypted blobs in the `encrypted_backups` table. The decryption key never leaves the user's device. Supabase Row-Level Security prevents cross-user access at the database layer (see `docs/security/supabase-rls-verification.md`, Encrypted Backups Table within RLS Policy Analysis). Even in the event of a full Supabase compromise, attacker yield is encrypted blobs without accompanying keys. Residual: Low.

**Scenario 4 — Sentry telemetry leakage.** React Native error boundaries can capture local variable state into error payloads. Production mitigations: a `beforeSend` hook in `app/src/core/services/logging/ExternalErrorReporter.ts` (line 226) sanitizes every event before transmission via a dedicated wellness-data scrubbing path (line 333); sensitive-data variables are never passed into log lines or exception messages by convention. Defense-in-depth for the development environment: the dev-environment Sentry DSN is empty (configured in `app/src/core/config/env.ts`), so a developer's local debugging cannot transmit at all — this is a developer-side safeguard, not a production control. Residual: Low. This scenario warrants explicit attention at every annual review since the React Native error-boundary surface area can grow with new features.

Retrospective correction (INFRA-295, v1.7): a naming mismatch (`autoSessionTracking` vs. the SDK's actual `enableAutoSessionTracking`) meant release-health session envelopes — which carry no wellness content but, absent an explicit `Sentry.setUser` call, do carry a per-install identifier via the native layer's `did` fallback — were most likely transmitted from every production build to date. Note also that session envelopes are envelope *session items*, not events, so the `beforeSend` mitigation credited above does not apply to them; their privacy posture rests on the fixed session schema having no field for user content. See §9 v1.7 for the finding and remediation.

---

## 7. Mitigation Measures

This table inventories the controls in place and cites the authoritative reference for each. Algorithm parameters (key sizes, iteration counts, exact protocol versions) are intentionally not duplicated here — refer to the cited source so that this DPIA remains coherent if those parameters are tightened over time.

| # | Control | Authoritative reference | Section |
|---|---|---|---|
| 1 | AES-256-GCM at rest for sensitive wellness data | `docs/security/security-architecture.md` | §1 Encryption Methods for Local Storage |
| 2 | Operating-system-protected key storage (iOS Keychain without iCloud sync; Android Keystore / StrongBox) | `docs/security/security-architecture.md` | §1 Encryption Methods for Local Storage |
| 3 | Biometric / passcode authentication for sensitive data views | `docs/security/security-architecture.md` | §3 Biometric Authentication Implementation |
| 4 | Auto-timeout and session lock | `docs/security/security-architecture.md` | §4 Auto-Timeout and Session Management |
| 5 | TLS 1.2+ in transit | `docs/legal/privacy-policy.md` | §4.3 Security Measures |
| 6 | Row-Level Security on all Supabase tables containing user data — keyed on `auth.uid()` and **runtime-enforced** (INFRA-260). The prior `device_id`-GUC policies were SQL-editor-verified only and inert on the runtime path; INFRA-260 re-verified isolation via the authenticated API path with `WITH CHECK` on writes. | `docs/security/supabase-rls-verification.md` v2.0 | RLS Policy Analysis (all five tables) + Runtime Verification |
| 7 | End-to-end encrypted backup blobs (decryption key never leaves the device) | `docs/security/supabase-rls-verification.md` | RLS Policy Analysis — Encrypted Backups Table |
| 8 | Audit logging on subscription events | `docs/security/supabase-rls-verification.md` | RLS Policy Analysis — Subscription Events Table |
| 9 | Analytics severity-bucketing (no raw scores transmitted) | `docs/security/supabase-rls-verification.md` | RLS Policy Analysis — Analytics Events Table |
| 10 | Sentry `beforeSend` payload scrubbing applied to every transmitted event | `app/src/core/services/logging/ExternalErrorReporter.ts` | `beforeSendHook` (line 226); wellness-data scrubbing (line 333) |
| 11 | Sentry disabled in development environment via empty DSN (defense-in-depth) | `app/src/core/config/env.ts` | `EXPO_PUBLIC_SENTRY_DSN` handling |
| 12 | Secure data export and complete data deletion — on-device wipe plus, post-INFRA-260, server-side erasure: the `delete-account` edge function hard-deletes the user's `auth.users` row and the FK `ON DELETE CASCADE` removes every `auth.uid()`-keyed row (backups, analytics, subscriptions). | `docs/security/security-architecture.md`; `supabase/functions/delete-account` | §5 Secure Export Mechanisms; §6 Complete Data Deletion |
| 13 | Crisis-detection telemetry: PII-free payload (no raw score, no Q9 value, no device identifier; daily-rotated anonymous `session_id`), enforced by the emitter's explicit allow-list + a DB CHECK constraint | `docs/legal/lia-crisis-telemetry.md` | §4 Safeguards |
| 14 | Crisis-detection telemetry: durable lossless capture (enqueued at fire-time, reconciled to anonymous user on connectivity) so a first-run/offline crisis is recorded, not silently dropped; separate mandatory on-device audit log | `app/src/core/services/supabase/SupabaseService.ts` | `trackCrisisDetection` / `flushCrisisAnalytics` |

---

## 8. Residual Risk Acceptance

After applying the controls inventoried in §7, residual **likelihood** for all four scenarios in §6 is assessed as Low. Residual **impact** is Low for scenarios 1, 3, and 4. For scenario 2 (unauthorized device access), residual impact remains High — the layered controls reduce likelihood to Low, but successful exploitation of the device-unlock plus OS-keystore chain would expose sensitive wellness content. The per-scenario rationale is recorded in §6.1.

**Acceptance.** Palouse Labs LLC accepts the residual risk for the processing described in §2 on the basis that:

1. No single mitigation in §7 is the sole defense for any scenario in §6 — controls are layered.
2. Local-first architecture limits attacker yield in cloud scenarios to encrypted blobs.
3. The user retains direct control over device access and over whether to enable cloud backup.
4. No technical control can eliminate device-loss risk; for scenario 2, the user's enrollment of a device passcode/biometric is the irreducible final layer.

**Backstop.** Should any of the residual-risk scenarios materialize as an actual breach, the Federal Trade Commission's Health Breach Notification Rule (16 CFR Part 318) governs the notification obligation. User-facing notification procedures are documented in `docs/legal/privacy-policy.md` §4.4.

---

## 9. Review Schedule and Change Log

**Scheduled review:** at minimum every 12 months from the effective date in §1.

**Off-schedule review triggers:** per the material-change clause in §1.

**Change log:**

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-05-24 | Palouse Labs LLC | Initial assessment surfaced by INFRA-83 |
| 1.1 | 2026-05-30 | Palouse Labs LLC | INFRA-199: PostHog now evaluates feature flags (`cloud_sync`, `cross_device_sync`, `emergency_sync`) in addition to capturing behavioral events. Flag evaluation payload confirmed to contain only anonymous `distinct_id` and `surface: 'app'` super-property — no sensitive wellness data categories from §3 are transmitted as targeting properties. Data scope of PostHog as sub-processor is unchanged. Analytics-consent gate remains the condition for PostHog provider mounting; cloud_sync consent gate remains the independent condition for data transmission to Supabase. Reviewed under INFRA-199 compliance pass. |
| 1.2 | 2026-06-03 | Palouse Labs LLC | INFRA-214 T5: analytics consolidation. (1) Added crisis-detection telemetry as a new processing activity (§2, §4): the `crisis_detected` event (PHQ-9 ≥20 / Q9>0 / GAD-7 ≥15) is recorded to first-party Supabase `analytics_events` under GDPR Art. 6(1)(d)/9(2)(c) vital interests, without analytics consent, with a PII-free bucketed payload (no raw score/Q9). Full lawful-basis record: `lia-crisis-telemetry.md`. (2) Revised §6.1 Scenario 1 to reflect the two-sink model and to state explicitly that k-anonymity / differential privacy are NOT claimed (the dead engine that notionally provided them was deleted in INFRA-214). (3) Added §7 controls 13–14 (PII-free crisis payload; durable lossless capture). (4) Material-change assessment recorded below. |
| 1.3 | 2026-06-08 | Palouse Labs LLC | INFRA-260: identity hardening + control-status correction. (1) **Control 6 correction** — the device-hash RLS credited as a *live* isolation control in v1.0–v1.2 was SQL-editor-verified only and inert on the runtime path (the app never set the `app.device_id` GUC). INFRA-260 replaced it with a Supabase anonymous session so `auth.uid()` is non-null, rewrote all policies to key on it with `WITH CHECK` on writes, and re-verified isolation against the runtime API path (`supabase-rls-verification.md` v2.0). Control 6 is now genuinely live. (2) Control 12 extended: server-side erasure (`delete-account` → `auth.admin.deleteUser` → FK cascade) now backs the right-to-deletion. (3) Subscription receipts encrypted at rest (AES-256-GCM) + IAP transactions bound to one `auth.uid()`. **Material-change assessment:** NOT a §1 trigger — no new data category, no new processor, no local-first change, no new jurisdiction. This is a control-status correction (a credited mitigation made genuinely effective) + a security improvement, not a new processing activity. Founder self-certification. |
| 1.6 | 2026-06-16 | Palouse Labs LLC | INFRA-264: external dead-man's-switch for the crisis-detection alerter. On every clean run the `crisis-detection-alerting` edge function fires a heartbeat to **healthchecks.io** — a NEW third-party sub-processor — so a total Supabase/edge outage (which would blind the in-Supabase watchdog) is caught by the resulting missed ping. The ping is an **opaque HTTP GET**: no request body, no `user_id`/`session_id`, no wellness data, no quasi-identifier — only the fact and timestamp of the request, logged by healthchecks.io for uptime monitoring. **No new sensitive-data category.** Material-change assessment recorded below. (Surfaced + verified live in prod via INFRA-278's deploy-state check, 2026-06-16, which confirmed `CRISIS_HEALTHCHECK_PING_URL` is provisioned.) |
| 1.5 | 2026-06-13 | Palouse Labs LLC | INFRA-265: synthetic crisis-detection liveness probe. A new `pg_cron` job invokes the `crisis-liveness-probe` edge function every 6h, which writes a clearly-tagged **synthetic** marker row to a NEW dedicated `crisis_liveness_probe` table (PII-free synthetic ops telemetry; RLS-on/no-policies/service_role-only/90-day prune, mirroring `crisis_alert_runs`). The INFRA-219 alerter reads `MAX(probed_at)` as an authoritative dead-vs-quiet liveness signal for the ingest/cron/edge leg. **No new sub-processor** (Supabase-internal; no Resend/EAS). **No new sensitive-data category** — the marker holds only a timestamp + a `synthetic_liveness` constant + a status, never user/session id or wellness data. R2 boundary enforced structurally: a separate table the FEAT-129 views cannot reference, plus a belt-and-suspenders CHECK on `analytics_events` that rejects any synthetic-tagged row, so the synthetic signal can never enter the compliance export. Material-change assessment recorded below. |
| 1.7 | 2026-07-25 | Palouse Labs LLC | INFRA-295: Sentry release-health control-status correction (**retrospective**). (1) **Finding** — `ExternalErrorReporter.ts` set `autoSessionTracking: false` at Sentry init, but `@sentry/react-native` reads `enableAutoSessionTracking`; the option was a dead no-op forwarded verbatim to the native layer, and both native SDKs default session tracking ON. Sentry release-health session envelopes have most likely been transmitted from every non-`__DEV__` build since Sentry was activated, including the 2026-06-15 TestFlight build. (2) **Scope of exposure** — session envelopes carry no wellness content (no PHQ-9/GAD-7 responses, scores, journal text, or crisis data) and bypass `beforeSend` / `normalizeDepth` / the FEAT-284 event processor entirely, being envelope session items rather than events. However, because no `Sentry.setUser` call exists anywhere in `app/src`, the iOS native layer injects `user.id = <installationID>` (a persistent per-install UUID) into the scope, and the session envelope's `did` field carries that value to Sentry — a previously-undisclosed identifier reaching an **already-authorized** sub-processor, not disclosure to a new or unauthorized recipient. (3) **Remediation** — the init key was corrected to `enableAutoSessionTracking: true` and session tracking is **kept** as an intentional app-stability signal (crash-free session rate); `docs/legal/privacy-policy.md` §5.1 was updated to disclose session diagnostics and the per-install identifier. A companion correctness fix restored the `mechanism` scalars and `level` to the scrubbed error payload — without them the SDK's `isHardCrash()` never matched, so JS fatal errors were not marking their sessions crashed and any crash-rate signal would have been systematically optimistic. Both are pinned by `app/__tests__/privacy/releaseHealthSession.contract.test.ts`, which imports the SDK's real `isHardCrash` so an upstream change to the crash-attribution rule fails the build. (4) **Not a breach** — no wellness content was exposed; the exposed value is a device-scoped installation identifier, not "PHR identifiable health information" under 16 CFR Part 318, so the FTC Health Breach Notification Rule backstop in §8 is not triggered. **Material-change assessment:** NOT a §1 trigger — no new sensitive wellness data category (§3), no new sub-processor (Sentry already in scope), no local-first architecture change, no new jurisdiction. This is a retrospective control-status correction (documenting and closing a pre-existing configuration defect), not a new processing activity requiring pre-activity assessment. Founder self-certification. **Open operator action:** verify the App Store Connect App Privacy questionnaire declares Diagnostics (Crash Data / Performance Data) as "Not Linked to You" / "Not Used for Tracking". |
| 1.4 | 2026-06-13 | Palouse Labs LLC | INFRA-219: automated crisis-detection alerting. A `pg_cron` job invokes the `crisis-detection-alerting` edge function daily; on a volume-spike or liveness/pipeline-dead breach over the FEAT-129 operator-only views it emails the founder via **Resend** — a NEW third-party sub-processor. The alert payload is aggregate-only and **non-personal**: bucketed counts, category labels, verdict statuses, and a DAY-level date; a ≥3 minimum-count floor withholds rare per-bucket rows from external transmission; it never carries user_id / session_id / distinct_sessions / raw score / Q9 / sub-day timestamp. The function reads ONLY the views, never `analytics_events`. A Supabase-internal watchdog cron escalates if the alerter stops running (shared-failure-domain residual accepted pre-launch; external dead-man's-switch is a tracked follow-up). Material-change assessment recorded below. |

**INFRA-214 T5 material-change assessment (2026-06-03).** Assessed against the §1 triggers: *new derived category of sensitive wellness data* — **yes** (`crisis_detected` encodes a trigger/severity category derived from PHQ-9/GAD-7; a new processing activity within the §3 categories); *new third-party processor* — **no** (Supabase `analytics_events` is first-party, already in scope per §2/§5); *local-first architecture change* — **no** (raw PHQ-9/GAD-7 responses remain local-only; this is a server-side write of a derived category); *new jurisdiction* — **no**. **Conclusion:** the revise-trigger is met; this v1.2 amendment is the required pre-activity assessment under TDPSA §541.105(a), CPA §6-1-1309, VCDPA §59.1-580, and CTDPA §6. **Founder self-certification** suffices pre-launch (no EU/EEA base near the §10 500-user threshold); counsel review of the Art. 6(1)(d)/9(2)(c) basis is required before that threshold per §10.

**INFRA-219 material-change assessment (2026-06-13).** Assessed against the §1 triggers: *new category of sensitive wellness data* — **no** (no new category; this is downstream operational use of the already-recorded `crisis_detected` aggregate from v1.2). *New third-party processor receives sensitive wellness data* — **processor yes, sensitive personal data no**: Resend is a new transactional-email sub-processor, but the alert payload it carries is aggregate, non-personal data that cannot be linked to an identified or identifiable natural person (no `session_id` / `user_id`; a ≥3 minimum-count floor on per-bucket rows; day-level date granularity only), so it falls outside the "sensitive wellness data" boundary of the §1 trigger and the "sensitive data" definitions in TDPSA §541.001, CPA §6-1-1303, VCDPA §59.1-575, and CTDPA §1; the recipient is the data controller's own founder mailbox. *Local-first architecture change* — **no**. *New jurisdiction* — **no**. **Conclusion:** the revise-trigger is met on the new-sub-processor limb; this v1.4 amendment is the required pre-activity record. **Resend is added to the sub-processor inventory**, and a signed Resend DPA (standard click-through) must be on file before the alerter goes live. k-anonymity / differential privacy are NOT claimed for the payload (consistent with the runbook and v1.2). **Founder self-certification** suffices pre-launch per §10.

**INFRA-265 material-change assessment (2026-06-13).** Assessed against the §1 triggers: *new processing activity* — **yes** (a new scheduled `pg_cron` job + a new `crisis-liveness-probe` edge function + a new `crisis_liveness_probe` table; this v1.5 amendment is therefore the required pre-activity record under TDPSA §541.105(a), CPA §6-1-1309, VCDPA §59.1-580, and CTDPA §6). *New category of sensitive wellness data* — **no**: the probe is purely synthetic ops telemetry and the marker table holds only a timestamp, the `synthetic_liveness` constant, a status, and an optional duration — **no** user_id / session_id / score / Q9 / wellness data, so it is not "sensitive data" under TDPSA §541.001, CPA §6-1-1303, VCDPA §59.1-575, or CTDPA §1. *New third-party processor* — **no** (Supabase-internal: pg_cron + edge function + a Supabase table; no Resend, no Expo/EAS — the rejected Option C would have added EAS and would have required a further sub-processor entry before going live). *Local-first architecture change* — **no**. *New jurisdiction* — **no**. **Structural integrity controls (R2):** the synthetic marker can never be miscounted as a real crisis because (a) it lives in a dedicated table the FEAT-129 `crisis_detection_*` views (`WHERE event_type = 'crisis_detected'`) physically cannot reference, and (b) a belt-and-suspenders CHECK on `analytics_events` rejects any row carrying a `probe_type` tag, so accidental routing fails loud at the DB layer rather than silently inflating the monthly compliance export. **Conclusion:** the revise-trigger is met on the new-processing-activity limb; the probe itself processes no sensitive personal data. **Founder self-certification** suffices pre-launch per §10.

**INFRA-264 material-change assessment (2026-06-16).** Assessed against the §1 triggers: *new category of sensitive wellness data* — **no** (the external switch carries no data at all). *New third-party processor receives sensitive wellness data* — **processor yes, sensitive personal data no**: healthchecks.io is a new uptime-monitoring sub-processor, but it receives a bare HTTP GET ping — no request body, no user identifier, no session identifier, no wellness data, and no metadata that could be linked to an identified or identifiable natural person. The sole signal is the fact of the request and its timestamp, internal operational telemetry logged by healthchecks.io for uptime monitoring. This falls outside the "personal data" definition under GDPR Art. 4(1) and outside the "sensitive data" definitions in TDPSA §541.001, CPA §6-1-1303, VCDPA §59.1-575, and CTDPA §1. (The word "health" in healthchecks.io denotes service uptime, not wellness data — no health information of any kind is transmitted.) *Local-first architecture change* — **no**. *New jurisdiction* — **no**. **Conclusion:** the revise-trigger is met on the new-sub-processor limb; this v1.6 amendment is the required pre-activity record. **healthchecks.io is added to the sub-processor inventory**; its standard DPA/ToS should be on file, and the ping URL (`hc-ping.com/<uuid>`) is a capability secret handled per the crisis-analytics runbook (never committed — enforced by the `crisisAlertNoSecrets.config.test.ts` static pin). **Founder self-certification** suffices pre-launch per §10.

---

## 10. GDPR Article 35 Scope Note

A full GDPR Article 35 DPIA has been intentionally scoped out of this document. Being currently has minimal EU/EEA user presence. GDPR Art. 35 has no numeric threshold for when a DPIA is required — the test is qualitative ("high risk to the rights and freedoms of natural persons," with the WP29/EDPB nine-criterion guidance). Being has adopted the following self-imposed conservative triggers, which are stricter than the GDPR qualitative test alone: promote this DPIA into a GDPR-conformant artifact (a) before EU/EEA user count exceeds 500, or (b) before any feature constituting "large-scale processing of special category data" under Art. 9 is enabled — whichever occurs first. The above is itself a material-change trigger per §1.

---

## 11. Statutory Citations Appendix

The following statutes require a documented data protection assessment for processing of sensitive personal information. Mental and physical health condition data is enumerated as sensitive in each statute's definitional section.

### Texas Data Privacy and Security Act (TDPSA)

- **Citation:** Tex. Bus. & Com. Code §541.105(a).
- **Effective:** July 1, 2024.
- **Sensitive data definition (Tex. Bus. & Com. Code §541.001):** Personal data revealing physical or mental health diagnosis is enumerated as sensitive.
- **Assessment requirement (§541.105(a)):** A controller "shall conduct and document a data protection assessment" for processing of sensitive data.

### Colorado Privacy Act (CPA)

- **Citation:** C.R.S. §6-1-1309.
- **Effective:** July 1, 2023.
- **Sensitive data definition (C.R.S. §6-1-1303):** Personal data revealing mental or physical health condition is enumerated as sensitive.
- **Assessment requirement (§6-1-1309):** Controllers must conduct a data protection assessment of processing activities that involve sensitive data.

### Virginia Consumer Data Protection Act (VCDPA)

- **Citation:** Va. Code §59.1-580.
- **Effective:** January 1, 2023.
- **Sensitive data definition (Va. Code §59.1-575):** Personal data revealing mental or physical health diagnosis is enumerated as sensitive.
- **Assessment requirement (§59.1-580):** Controllers shall conduct and document a data protection assessment for processing of sensitive data.

### Connecticut Data Privacy Act (CTDPA)

- **Citation:** Conn. Pub. Act 22-15 §6.
- **Effective:** July 1, 2023.
- **Sensitive data definition (§1):** Personal data revealing mental or physical health condition or diagnosis is enumerated as sensitive.
- **Assessment requirement (§6):** Controllers must conduct and document a data protection assessment of processing of sensitive data. The Connecticut requirement is substantively parallel to the Colorado requirement.

### Federal Trade Commission Act, Section 5

Not an assessment-requiring statute. Listed for context: misrepresentation in this DPIA, in Being's privacy policy, or in any user-facing surface would constitute a "deceptive practice" under 15 U.S.C. §45.

### Federal Trade Commission Health Breach Notification Rule

- **Citation:** 16 CFR Part 318.
- Applies to non-HIPAA entities (including Being) that handle "PHR identifiable health information." Sets a 60-day notification window. Operationalized in `docs/legal/privacy-policy.md` §4.4. Referenced here as the breach-time backstop to the residual-risk acceptance in §8.

---

## Related Documents

- `docs/legal/privacy-policy.md` — user-facing privacy notice. §4 (Data Storage & Security) is the public counterpart to this DPIA's §7.
- `docs/legal/regulatory-applicability.md` — authoritative source of what regulations apply to Being and what framing language to use.
- `docs/legal/california-privacy.md` — CCPA/CPRA-specific consumer rights and disclosures.
- `docs/security/security-architecture.md` — cited throughout §7 of this DPIA.
- `docs/security/supabase-rls-verification.md` — cited throughout §6 and §7 of this DPIA.
- `docs/development/audits/INFRA-83-rescope-2026-05-24.md` — surfacing audit.

---

*End of document. Internal compliance artifact — not for public distribution.*
