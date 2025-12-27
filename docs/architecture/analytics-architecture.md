# Analytics Architecture

**Being's privacy-first analytics system using PostHog EU.**

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

**Whitelisted Events (27 total):**
- App lifecycle: `app_opened`, `app_backgrounded`, `session_started`, `session_ended`
- Navigation: `screen_viewed`
- Features: `check_in_started/completed`, `assessment_started/completed`, `practice_started/completed`, `breathing_exercise_started/completed`
- Crisis: `crisis_resources_viewed`, `crisis_hotline_tapped`
- Settings: `settings_opened`, `consent_changed`
- Errors: `error_occurred`
- Onboarding: `onboarding_started/completed/step_completed`
- Learn: `learn_content_viewed`, `learn_module_started/completed`

**Blocked PHI Keywords:**
`score`, `phq`, `gad`, `severity`, `result`, `mood`, `feeling`, `emotion`, `anxious`, `depressed`, `crisis_contact`, `emergency_contact`, `hotline_number`, `suicid`, `harm`, `journal`, `note`, `entry`, `reflection`, `thought`, `email`, `phone`, `name`, `address`

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
