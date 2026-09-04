# Analytics Architecture

**Being's privacy-first analytics system using PostHog EU.**

---

## Routing Model & Current-State Audit (INFRA-214)

> Added 2026-06 by **INFRA-214** after an audit found the analytics layer had drifted into
> three disjoint sinks, with crisis-detection telemetry reaching none of them reliably. This
> section is the **authoritative routing model**; the detailed sections below describe the
> PostHog / PHIFilter path. The target model is implemented across INFRA-214 tranches T2–T6.

### Target routing model (decided — Option 1, refined in T3: legal-basis partition)

Every analytics event has exactly **one** sink, fixed at design time by its **legal basis** —
not by runtime consent state or call-site convenience. No event is eligible for both sinks;
there is **no dual-write**. (Verdict from the crisis + compliance + architect planning passes.)

| Sink | Carries | Legal basis / gate | Sanitizer | Identity |
|---|---|---|---|---|
| **PostHog (EU)** | Consent-gated **product** analytics only (screen views, feature counts, lifecycle, errors). **Never** crisis or wellness-derived signal. | User opt-in (`analyticsEnabled` && !universalOptOut); SDK not even initialized without consent. | `PHIFilter` — whitelist **reject-gate** (drops anything score-shaped or PHI-keyworded). | device-persistent `distinct_id`; deletable on request. |
| **Supabase `analytics_events`** | **Vital-interest** safety telemetry (the crisis-detection event) **+ operational** telemetry (backup/sync ops). | Crisis: GDPR Art. 6(1)(d) vital interests — fires regardless of analytics consent **and** universal opt-out. Ops: legitimate-interest + `canPerformOperation` (T4). | `sanitizeAnalyticsProperties` — **bucket-transform** (accepts severity, down-converts; never raw scores). | persistent anonymous `user_id` (`auth.uid()`) + a bounded-lifetime `session_id` rotating at the UTC day boundary and after 30 min idle (INFRA-568). |
| **Custom REST API (`api.being.fyi`)** | **REMOVED** (INFRA-214 T2). Was never deployed. | — | — | — |

**Shared invariant (both sinks):** no raw PHQ-9/GAD-7 integer ever leaves the device — PostHog
enforces by rejection, Supabase by bucketing. The two sanitizers are intentionally **not**
unified: they enforce opposite contracts (reject-gate vs. accept-and-bucket).

### Current-state audit (what INFRA-214 found, verified 2026-06-01/02)

1. **PostHog-direct — LIVE, the only working path.** Crisis events limited to
   `crisis_resources_viewed` / `crisis_hotline_tapped` (no properties). No crisis-detection
   event existed. PostHog project "Being" (111221) had zero product events (pre-launch + dev
   no-ops PostHog).
2. **Supabase `analytics_events` — table live, crisis emitters orphaned.** Only backup/sync
   ops wrote to it; the `useCloudSync` `crisis_intervention` / `assessment_completed` emitters
   were defined but never called. Its own `sanitizeAnalyticsProperties` / `scoreToSeverityBucket`
   bypassed PHIFilter and had no analytics-consent gate (only a `userId` check).
3. **Custom-API (`AnalyticsService` → `api.being.fyi`) — fully orphaned dead code.** Never
   `initialize()`d (so the `crisis_intervention_triggered` subscription never wired); host
   never resolved (DNS); placeholder certs; `NETWORK_CONFIG` self-described as "placeholders
   for future." The k-anonymity (k≥5) / differential-privacy (ε=0.1) / session-rotation engine
   (`AnalyticsPrivacyEngine`) lived **only** here — so it never protected any shipped data.

### Decision (Option 1 + T3 sink correction)

Consolidate analytics; delete the dead custom-API path (T2); route the canonical
crisis-detection event (fires on PHQ-9 ≥20 / Q9>0 / GAD-7 ≥15) to **Supabase `analytics_events`
under the vital-interests basis** — NOT PostHog. PostHog stays the consent-gated
product-analytics sink only.

**Why Supabase, not PostHog, for the crisis event** (crisis + compliance + architect agents,
unanimous): (1) PostHog's SDK does not initialize without analytics consent, so a crisis user
who never opted into analytics — the common case — would emit nothing → a false "all-clear"
safety-monitoring gap. (2) The privacy policy makes an unconditional promise that analytics is
opt-in and that Being **never collects** PHQ-9/GAD-7 or mental-health data in-app; a
crisis-detection event is a PHQ/GAD-derived signal, so routing it to PostHog (a third-party
processor) without consent is an FTC §5 deceptive-practice exposure — and `PHIFilter` would
itself reject the payload. (3) PostHog's `distinct_id` is device-persistent; the compliance
non-negotiable requires a session-rotated anonymous id, which the Supabase `analytics_events`
schema enforces. (4) Supabase is first-party, already in the DPA/DPIA (no material-change
trigger), and always available. This is the cleanest realization of Option 1's intent, not a
reversal of it.

**Re k-anon/DP:** neither the DPIA nor the privacy policy ever committed to k-anonymity or
differential privacy — they commit to severity-bucketing + no quasi-identifiers + EU residency
(DPIA §6.1, §7 #9; Privacy Policy §5.2). k≥5 is meaningless at pre-launch scale; client-side
k-anon/DP was never sound. The DPIA is honestly re-scoped (v1.2; T5).

**FEAT-129:** queries Supabase directly for v1 (a daily-aggregate `analytics_events` view
already exists in `schema.sql`). The **Supabase→PostHog forward (old "Option 2") is deferred** —
it would re-introduce wellness-derived signal into PostHog (complicating the "never collect"
promise + DPIA) and is unnecessary for v1. The crisis event is shaped as a pure projection so a
future forward stays a no-migration add; that forward requires its own DPIA before it ships.

### Privacy controls actually in force (post-INFRA-214)

- **PostHog path:** PHIFilter allow-list (`SAFE_EVENT_TYPES`) + numeric-key block
  (`SAFE_NUMERIC_KEYS`); consent-gated; EU residency (Frankfurt). Never receives crisis/wellness signal.
- **Supabase crisis path:** severity-bucketing (`sanitizeAnalyticsProperties` — raw PHQ-9/GAD-7
  scores never transmitted; only `low`/`medium`/`high`/`critical`); a bounded-lifetime anonymous `session_id`
  rotating at the UTC day boundary and after 30 min idle (INFRA-568) — note each row also
  carries the persistent `user_id`, so the token is not an anonymity control on its own; PII-free JSONB (`CHECK` constraints). Vital-interests basis (GDPR Art.
  6(1)(d) / 9(2)(c)) — fires without analytics consent.
- **Crisis event must be durably enqueued at fire-time** (survives restart, independent of
  network / `userId` provisioning) — otherwise a first-run/offline crisis silently drops,
  relocating the very safety-monitoring gap this work closes. The local crisis **audit log**
  (`logCrisisIntervention`) is separate, mandatory, and not discharged by this telemetry; an
  undeliverable telemetry event is recorded to the local security log.
- k-anonymity / differential privacy: **not claimed** (never ran; not meaningful at this scale).

### Migration note

Pre-launch v0.x, no users, no historical data → **no data migration**. Tranche order:
T1 (this doc) → T2 (delete dead path) → T3 (wire crisis-detection event) → T4 (reconcile
sanitizers + Supabase consent gate) → T5 (DPIA v1.2) → T6 (verifiable crisis-landing test).
Each tranche keeps the build green; rollback = revert that tranche's PR (no stateful migration
to unwind).

> **Terminology follow-up (INFRA-214 T5):** the legacy sections below use "PHI" / "HIPAA BAA"
> framing. Per project standards Being is a consumer-wellness app (not HIPAA-covered); the
> compliance pass in T5 re-terms these to "wellness data" and removes the HIPAA-applicability
> framing.

---

## Design Principle

Being's analytics follows a simple rule: **track feature usage, never health data**.

| We Track (Safe) | We NEVER Track (PHI) |
|-----------------|----------------------|
| Screen views | Assessment scores (PHQ-9, GAD-7) |
| Feature usage counts | Mood values or selections |
| Session duration | Journal content |
| Performance metrics | Crisis contact details |
| App version, platform | Any health outcomes |

This eliminates the need for HIPAA Business Associate Agreements (BAAs). If no PHI is transmitted, no BAA is required.

---

## Architecture

```
User Action (e.g., completes check-in)
    │
    ▼
┌─────────────────────────────────┐
│  PostHogProvider                │
│  - Checks consent via store     │
│  - If no consent → not rendered │
└────────────┬────────────────────┘
             │ (consent granted)
             ▼
┌─────────────────────────────────┐
│  PHI Filter                     │
│  - Whitelist validation         │
│  - Blocks non-approved events   │
│  - Blocks PHI keywords          │
└────────────┬────────────────────┘
             │ (safe event)
             ▼
┌─────────────────────────────────┐
│  PostHog SDK                    │
│  - posthog.capture(event, props)│
│  - Batched & sent to EU servers │
└─────────────────────────────────┘
```

---

## Components

### PostHogProvider
**Location:** `src/core/analytics/PostHogProvider.tsx`
**Wired in:** `App.tsx` (wraps entire app)

Wraps the app and provides PostHog context. Key behaviors:
- **Consent-gated**: Only renders PostHog when analytics consent granted
- **EU data residency**: Configured for Frankfurt (GDPR compliance)
- **Privacy settings**: No autocapture, no session replay
- **Batching**: 10 events or 30 seconds before transmission

**Helper Hook:** `usePostHogConfigured()` - Returns true if PostHog API key is configured (for conditional UI rendering)

### PHIFilter
**Location:** `src/core/analytics/PHIFilter.ts`

Whitelist-based validation ensuring only safe events are transmitted.

**Whitelisted Events (13 total).** Every one has a production emitter — that is now
the entry condition, not an aspiration. INFRA-552 deleted the twelve that had none.

- App lifecycle: `app_opened` (`is_cold_start`, `since_last_active` — a coarse bucket,
  never a raw elapsed value), `app_backgrounded` (`duration_seconds` — FOREGROUND DWELL
  only, never time away)
- Navigation: `screen_viewed`
- Crisis: `crisis_resources_viewed`, `crisis_hotline_tapped`
- Settings: `settings_opened`, `consent_changed`
- Onboarding: `onboarding_started/completed/step_completed`
- Learn: `learn_content_viewed`, `learn_module_started`
- Guidance: `guidance_opened` (FEAT-457) — **no properties, ever**

Removed by INFRA-552, all with zero production emitters: `check_in_started/completed`,
`assessment_started/completed`, `practice_started/completed`, `learn_module_completed`,
`breathing_exercise_started/completed`, `error_occurred` (errors go to Sentry, not
PostHog), and `session_started`/`session_ended`, which never had a tracker function at
all. Each is recorded with its reason in the `NARROWED` ledger in
`app/__tests__/privacy/phiFilterDifferential.privacy.test.ts`.

> This list is still maintained by hand and has drifted before (stated as 27 while the
> whitelist held 24, pre-FEAT-457). Since INFRA-552 the whitelist is DERIVED from
> `AnalyticsEvents`, so catalog/whitelist parity can no longer drift — but this prose
> can. Read `AnalyticsEvents` in `PHIFilter.ts` if the exact set matters.
> Since INFRA-558 the drift is bounded rather than merely warned about: the differential
> suite asserts the live whitelist equals the frozen `d14d6178` baseline plus its
> `WIDENED` ledger, so a name can no longer be added here or there without the other
> noticing. Refreshing this list is step 4 of **Adding New Events** below.

**`guidance_opened` carries no `domain` — this is a ruling, not an omission.**
Domain-specific guidance is summoned for a named hardship (`conflict`, `career`,
`grief`, `pain`). That domain is a self-disclosed wellness inference — "this user
opened grief" — and shipping it would contradict the **What We NEVER Collect**
commitment below ("Any mental health data"), which is a published promise and so an
FTC Act §5 exposure rather than a disclosure gap that could be closed by editing
this document. It would also trip the DPIA's material-change trigger for a new
category of sensitive wellness data, and require new App Store mental-health privacy
labels. The event therefore measures REACH only, consistent with the house pattern:
`assessment_started` carries no score, `crisis_resources_viewed` carries no contact
details.

The four domain tokens are additionally in the blocklist below, so a future
reintroduction of a `domain` property fails closed instead of shipping. Pinned by
`app/__tests__/privacy/guidanceAnalyticsBoundary.contract.test.ts`.

**Blocked PHI Keywords:**
`score`, `phq`, `gad`, `severity`, `result`, `mood`, `feeling`, `emotion`, `anxious`, `depressed`, `crisis_contact`, `emergency_contact`, `hotline_number`, `suicid`, `harm`, `journal`, `note`, `entry`, `reflection`, `thought`, `email`, `phone`, `name`, `address`, `conflict`, `career`, `grief`, `pain`

**Safe Numeric Keys** (allowed in event data):
`duration`, `duration_ms`, `duration_seconds`, `count`, `timestamp`, `step`, `index`, `page`, `version`

**Type-safe Constants:**
Use `AnalyticsEvents.EVENT_NAME` instead of raw strings for compile-time safety.

**Blocked patterns:**
- Any event type not in whitelist
- Events containing PHI keywords in data
- Numeric values in non-safe keys (potential assessment scores)

### analyticsIdentityReset
**Location:** `src/core/analytics/analyticsIdentityReset.ts`

Destroys the analytics identity as part of account erasure:
- Resets the PostHog identity and nulls BOTH persisted queues (`Queue` and
  `LogsQueue` route to different files, so nulling one leaves the other intact)
- Where no instance was ever built, removes `.posthog-rn.json` /
  `.posthog-rn-logs.json` from the document directory
- Provides regulatory-appropriate user messaging

**No local deletion-request audit trail (DEBUG-539).** This module previously
persisted a record keyed by `previousDistinctId` to
`@being/analytics_deletion_requests` — a key no erasure sweep reaches, so it
RETAINED the identifier the erasure exists to destroy. It had zero production
callers, so nothing was ever written; wiring it up as documented would have
introduced the leak. The record and its readers are gone.

**The reset is invoked automatically inside full-account erasure**
(`AccountDeletionService.deleteAccountAndWipe`), between the terminal attestation
and the local wipe. It is NOT a standalone user-facing analytics control:
DEBUG-534 ruled the privacy policy's "Delete Analytics Data" wording is corrected
in copy rather than built.

**It resets THROUGH a live instance, never around one.** Revoking consent
unmounts `<PHProvider>` but does not destroy the client, which keeps an in-memory
cache that re-persists on its next write — so deleting the storage files under a
live instance restores the pre-erasure id and reads as a fix. The client is
registered at module scope so the reset can reach an instance that exists but is
no longer rendered.

---

## Exports

All analytics components are exported from `@/core/analytics`:

```typescript
// Provider
export { PostHogProvider, usePostHogConfigured } from './PostHogProvider';

// PHI Filter
export { PHIFilter, AnalyticsEvents } from './PHIFilter';
export type { PHIValidationResult, AnalyticsEventType } from './PHIFilter';

// Analytics identity reset (account erasure)
export {
  resetAnalyticsIdentity,
  registerAnalyticsClient,
  handleAnalyticsDeletion,
  showDeletionConfirmation,
  POSTHOG_RN_STORAGE_FILES,
} from './analyticsIdentityReset';
export type { DeletionRequestType, AnalyticsIdentityResetTarget } from './analyticsIdentityReset';
```

---

## Configuration

### Environment Variables
```
EXPO_PUBLIC_POSTHOG_API_KEY=phc_...  # PostHog project API key
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com  # EU data residency
```

### PostHog Dashboard Settings
- **Data residency**: EU (Frankfurt)
- **Autocapture**: Disabled (controlled via PHIFilter)
- **Session replay**: Disabled (privacy)
- **Data retention**: 24 months (configurable)

---

## Usage

### Tracking Events

```typescript
import { usePostHog } from 'posthog-react-native';
import { PHIFilter, AnalyticsEvents } from '@/core/analytics';

const posthog = usePostHog();

// Type-safe event tracking with PHI validation
const eventData = { screen_name: 'home' };
const validation = PHIFilter.validate(AnalyticsEvents.SCREEN_VIEWED, eventData);

if (validation.valid) {
  posthog.capture(AnalyticsEvents.SCREEN_VIEWED, eventData);
} else {
  // Event blocked - logged automatically by PHIFilter
  console.warn('Analytics blocked:', validation.reason);
}
```

### Quick Pattern (for simple events)

```typescript
// For events with no properties, validation is simpler
if (PHIFilter.isWhitelisted(AnalyticsEvents.CHECK_IN_COMPLETED)) {
  posthog.capture(AnalyticsEvents.CHECK_IN_COMPLETED);
}
```

### Adding New Events

Adding an event type is a **widening of the app's only third-party egress filter**, so it
carries obligations beyond registering the name. All of these land in ONE pull request:

1. Add the string to `SAFE_EVENT_TYPES` **and** the constant to `AnalyticsEvents` — both in
   `PHIFilter.ts`. A name in one but not the other cannot transmit, and fails silently.
2. Record a `WIDENED` ledger entry in `app/__tests__/privacy/phiFilterDifferential.privacy.test.ts`
   naming the event, the work item and the rationale. Omit it and that suite red-lines.
3. Add a per-event boundary suite in the FEAT-457 shape — see
   `guidanceAnalyticsBoundary.contract.test.ts`: whitelist/constant parity, the exact
   emitted payload, and an explicit non-vacuity case.
4. Refresh the enumerated list above (it is hand-derived and has drifted before).
5. Get a `compliance` pass. The durable artifact is the ledger entry plus the boundary
   suite — a review with no checkable output is indistinguishable afterwards from one that
   never happened.

**The frozen baseline is never amended.** `app/__tests__/helpers/phiFilterBaselineV1.ts` is
a fixed reference to `d14d6178`; editing it to track live makes the differential compare the
implementation to itself. Its `size` pin is an anti-tamper guard, not a headcount — never
bump it. The registered delta is the ledger.

**What the harness does and does not prove.** It verifies a widening was DECLARED. It
cannot verify one was WARRANTED, and its behavioural relation runs over a hand-authored
corpus, so it does not by itself notice a new name. Do not read green as review.

Authoritative procedure, with the traps: the header of
`app/__tests__/privacy/phiFilterDifferential.privacy.test.ts`.

### Analytics identity reset

Normally you do not call this: `deleteAccountAndWipe` invokes it as part of
erasure. Pass the client explicitly — the parameter is required and explicitly
nullable so a new caller must decide rather than silently inheriting the defect
DEBUG-539 fixed.

```typescript
import { resetAnalyticsIdentity } from '@/core/analytics';
import { usePostHog } from 'posthog-react-native';

// `usePostHog()` is typed non-nullable but is undefined when no provider is
// mounted — which is the common case, since analytics is opt-in and default OFF.
const posthog = usePostHog() ?? null;
resetAnalyticsIdentity({ posthog });
```

---

## Compliance

### HIPAA
No BAA required because no PHI is transmitted. The PHIFilter enforces this at the code level.

### GDPR
- **Data residency**: EU (Frankfurt)
- **Consent**: Opt-in, default OFF
- **Right to erasure**: Implemented via deletion workflow
- **Data minimization**: Only feature usage tracked

### CCPA
- **Deletion requests**: handled through full-account erasure, which resets the
  analytics identity and drops anything queued under it
- **45-day response**: evidenced by the terminal attestation in
  `consent_history_v1`, which carries NO identifier — deliberately not by a local
  log keyed to the erased `distinct_id` (DEBUG-539)

### App Store Privacy Labels

**iOS** (Privacy Manifest in app.json):
- Data type: Product Interaction
- Linked to identity: No
- Used for tracking: No
- Purpose: Analytics

**Android** (Data Safety in Play Console):
- App interactions collected for Analytics
- Not shared with third parties
- Encrypted in transit
- Deletion available

---

## Privacy Policy Disclosure

Required disclosure for privacy policy:

> **Analytics and Usage Data**
>
> Being uses PostHog (EU data residency) to collect anonymous product analytics.
> Analytics is disabled by default and requires your explicit opt-in.
>
> **What We Collect (when opted in):**
> - Screen views and navigation patterns
> - Feature usage counts (e.g., "check-in completed")
> - App performance metrics
> - Session duration
> - App open patterns (first open vs. return; time since last open, in coarse ranges)
> - Device type and OS version
>
> **What We NEVER Collect:**
> - Assessment scores (PHQ-9, GAD-7)
> - Mood check-in values or notes
> - Journal entries
> - Crisis contact information
> - Any mental health data
>
> **Your Control:**
> - Analytics is OFF by default
> - Opt-in via **Privacy & Data > Anonymous Usage Analytics**; turning it off stops collection immediately
> - Analytics events on our servers are automatically deleted after 90 days. To request deletion sooner, email privacy@being.fyi
>
> **Data Residency:** EU (Frankfurt, Germany)
>
> **Third Party:** PostHog Inc. (https://posthog.com/privacy)

---

## Vendor Details

| Attribute | Value |
|-----------|-------|
| Vendor | PostHog Inc. |
| Plan | Cloud (Free tier: 1M events/month) |
| Data residency | EU (Frankfurt) |
| DPA | Standard DPA available on request |
| SDK | posthog-react-native |

---

## Related Documentation

- [Data Privacy Architecture](./data-privacy-architecture.md)
- [Security Architecture](../security/security-architecture.md)
