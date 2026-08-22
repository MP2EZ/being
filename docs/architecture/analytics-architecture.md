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
| **Supabase `analytics_events`** | **Vital-interest** safety telemetry (the crisis-detection event) **+ operational** telemetry (backup/sync ops). | Crisis: GDPR Art. 6(1)(d) vital interests — fires regardless of analytics consent **and** universal opt-out. Ops: legitimate-interest + `canPerformOperation` (T4). | `sanitizeAnalyticsProperties` — **bucket-transform** (accepts severity, down-converts; never raw scores). | schema-enforced daily-rotated anonymous `session_id`. |
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
  scores never transmitted; only `low`/`medium`/`high`/`critical`); schema-enforced daily-rotated
  anonymous `session_id`; PII-free JSONB (`CHECK` constraints). Vital-interests basis (GDPR Art.
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

**Whitelisted Events (25 total):**
- App lifecycle: `app_opened`, `app_backgrounded`, `session_started`, `session_ended`
- Navigation: `screen_viewed`
- Features: `check_in_started/completed`, `assessment_started/completed`, `practice_started/completed`, `breathing_exercise_started/completed`
- Crisis: `crisis_resources_viewed`, `crisis_hotline_tapped`
- Settings: `settings_opened`, `consent_changed`
- Errors: `error_occurred`
- Onboarding: `onboarding_started/completed/step_completed`
- Learn: `learn_content_viewed`, `learn_module_started/completed`
- Guidance: `guidance_opened` (FEAT-457) — **no properties, ever**

> The count above was stated as 27 before FEAT-457 and the whitelist held 24; it is
> derived by hand and had drifted. Read it from `PHIFilter.SAFE_EVENT_TYPES`, not
> from here, if the exact number matters.

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

### AnalyticsDeletion
**Location:** `src/core/analytics/AnalyticsDeletion.ts`

GDPR/CCPA compliant deletion workflow:
- Logs deletion requests with audit trail (CCPA 45-day requirement)
- Resets PostHog identity (immediate unlinking)
- Provides regulatory-appropriate user messaging

---

## Exports

All analytics components are exported from `@/core/analytics`:

```typescript
// Provider
export { PostHogProvider, usePostHogConfigured } from './PostHogProvider';

// PHI Filter
export { PHIFilter, AnalyticsEvents } from './PHIFilter';
export type { PHIValidationResult, AnalyticsEventType } from './PHIFilter';

// Deletion Workflow
export {
  handleAnalyticsDeletion,
  showDeletionConfirmation,
  getDeletionRequestHistory,
  hasPendingDeletionRequests,
} from './AnalyticsDeletion';
export type { DeletionRequestType } from './AnalyticsDeletion';
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

1. Add event to `SAFE_EVENT_TYPES` in `PHIFilter.ts`
2. Add constant to `AnalyticsEvents` object (same file)
3. Ensure no PHI is included in event properties
4. Update this documentation

### Deletion Requests

```typescript
import { handleAnalyticsDeletion, showDeletionConfirmation } from '@/core/analytics';

// User requests deletion
await handleAnalyticsDeletion('user_request');
showDeletionConfirmation('user_request');
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
- **Deletion requests**: Logged with audit trail
- **45-day response**: Audit log supports compliance verification

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
> - Opt-in via Settings > Privacy > Analytics
> - Request deletion via Settings > Privacy > Delete Analytics Data
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
