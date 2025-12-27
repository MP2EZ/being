# PostHog Integration Plan

**FEAT-40: Privacy Analytics Implementation**

**Status**: Compliance Approved (with required modifications)
**Vendor**: PostHog Cloud EU (Frankfurt)
**Cost**: Free tier (1M events/month)
**Compliance Review**: 2025-12-26 (compliance agent validated)

---

## Pre-Production Blockers

| Requirement | Owner | Status |
|-------------|-------|--------|
| Execute PostHog Standard DPA | Legal/Max | Pending |
| Implement PHIFilter class | Engineering | Pending |
| Update privacy policy | Legal/Max | Pending |
| Complete Android Data Safety | Engineering | Pending |

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

This eliminates the need for complex anonymization (k-anonymity, differential privacy) described in the legacy `BAA-Free-Analytics-Design.md`. We simply don't send sensitive data.

---

## Architecture

```
User Action (e.g., completes check-in)
    │
    ▼
┌─────────────────────────────────┐
│  Consent Check                  │
│  - consentStore.canPerformOp()  │
│  - If no consent → silent drop  │
└────────────┬────────────────────┘
             │ (consent granted)
             ▼
┌─────────────────────────────────┐
│  PHI Filter                     │
│  - Block assessment scores      │
│  - Block mood values            │
│  - Block any health content     │
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

## Event Taxonomy

### Core Events

```typescript
// App lifecycle
'app_opened'
'app_backgrounded'
'session_started'
'session_ended'

// Navigation
'screen_viewed' // props: { screen_name: string }

// Feature usage (counts only, no content)
'check_in_started'
'check_in_completed'  // NO mood value
'assessment_started'  // props: { type: 'phq9' | 'gad7' }
'assessment_completed' // NO score
'practice_started'    // props: { practice_type: string }
'practice_completed'
'breathing_exercise_started'
'breathing_exercise_completed'

// Crisis (access only, no details)
'crisis_resources_viewed'
'crisis_hotline_tapped'  // NO which contact

// Settings
'settings_opened'
'consent_changed' // props: { analytics: boolean }

// Errors (sanitized)
'error_occurred' // props: { error_type: string } - NO stack traces with PHI
```

### Prohibited Events (NEVER implement)

```typescript
// These would transmit PHI - BLOCKED
❌ 'assessment_score_recorded'
❌ 'mood_selected'
❌ 'journal_entry_saved'
❌ 'crisis_contact_called'
❌ 'severity_level_changed'
```

---

## Implementation Steps

### 1. Install PostHog SDK

```bash
npx expo install posthog-react-native
```

### 2. Create PostHog Provider

```typescript
// src/core/analytics/PostHogProvider.tsx
import { PostHogProvider as PHProvider } from 'posthog-react-native';
import { useConsentStore } from '@/core/stores/consentStore';

const POSTHOG_API_KEY = 'phc_...'; // From PostHog dashboard
const POSTHOG_HOST = 'https://eu.posthog.com'; // EU data residency

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { analyticsConsent } = useConsentStore();

  return (
    <PHProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
        // Disable if no consent
        disabled: !analyticsConsent,
        // Disable automatic capture (we control what's sent)
        autocapture: false,
        // Disable session recording (privacy)
        disableSessionRecording: true,
      }}
    >
      {children}
    </PHProvider>
  );
}
```

### 3. PHI Filter (COMPLIANCE REQUIRED)

Whitelist-based validation - only explicitly safe events are transmitted.

```typescript
// src/core/analytics/PHIFilter.ts
export class PHIFilter {
  // Explicitly allowed event types (whitelist approach)
  private static readonly SAFE_EVENT_TYPES = [
    'app_opened', 'app_backgrounded', 'session_started', 'session_ended',
    'screen_viewed', 'check_in_started', 'check_in_completed',
    'assessment_started', 'assessment_completed',
    'practice_started', 'practice_completed',
    'breathing_exercise_started', 'breathing_exercise_completed',
    'crisis_resources_viewed', 'crisis_hotline_tapped',
    'settings_opened', 'consent_changed', 'error_occurred'
  ];

  // Keywords that indicate PHI - block if detected
  private static readonly PHI_KEYWORDS = [
    'score', 'phq', 'gad', 'severity', 'mood', 'feeling',
    'crisis_contact', 'journal', 'note', 'assessment_result',
    'suicid', 'harm', 'emergency'
  ];

  static validate(
    eventType: string,
    eventData: Record<string, unknown>
  ): { valid: boolean; reason?: string } {
    // 1. Whitelist check - event type must be explicitly allowed
    if (!this.SAFE_EVENT_TYPES.includes(eventType)) {
      return { valid: false, reason: `Event type "${eventType}" not whitelisted` };
    }

    // 2. PHI keyword check in data
    const dataString = JSON.stringify(eventData).toLowerCase();
    for (const keyword of this.PHI_KEYWORDS) {
      if (dataString.includes(keyword)) {
        return { valid: false, reason: `PHI keyword detected: "${keyword}"` };
      }
    }

    // 3. Block suspicious numeric values (potential scores)
    for (const [key, value] of Object.entries(eventData)) {
      if (typeof value === 'number' && !['duration', 'count', 'timestamp'].includes(key)) {
        return { valid: false, reason: `Suspicious numeric: ${key}` };
      }
    }

    return { valid: true };
  }
}
```

### 4. Analytics Service Integration

```typescript
// Update src/core/analytics/AnalyticsService.ts
import { PHIFilter } from './PHIFilter';

async trackEvent(eventType: string, eventData: Record<string, unknown>) {
  // 1. Consent check
  if (!consentStore.canPerformOperation('analytics')) {
    return false;
  }

  // 2. PHI filter (whitelist validation)
  const validation = PHIFilter.validate(eventType, eventData);
  if (!validation.valid) {
    logSecurity(`Analytics blocked: ${validation.reason}`, 'medium');
    return false;
  }

  // 3. Send to PostHog
  posthog.capture(eventType, eventData);
  return true;
}
```

### 5. Data Deletion Workflow (GDPR/CCPA Compliant)

```typescript
// src/core/analytics/AnalyticsDeletion.ts
import { usePostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DeletionRequest {
  timestamp: number;
  type: 'gdpr' | 'ccpa' | 'user_request';
  previousDistinctId: string;
}

export async function handleAnalyticsDeletion(
  type: 'gdpr' | 'ccpa' | 'user_request' = 'user_request'
): Promise<void> {
  const posthog = usePostHog();

  // 1. Capture distinct_id before reset (for audit trail)
  const previousId = posthog.getDistinctId();

  // 2. Log deletion request (CCPA requires 45-day response)
  const deletionRequest: DeletionRequest = {
    timestamp: Date.now(),
    type,
    previousDistinctId: previousId,
  };
  await AsyncStorage.setItem(
    `deletion_request_${Date.now()}`,
    JSON.stringify(deletionRequest)
  );

  // 3. Reset PostHog identity (immediate unlinking)
  posthog.reset();

  // 4. Confirm to user with regulatory-appropriate language
  Alert.alert(
    'Analytics Data Request Submitted',
    'Your analytics identity has been reset and previous data is no longer linked to you.\n\n' +
    'For complete deletion of historical data, contact privacy@being.app within 45 days.',
    [{ text: 'OK' }]
  );
}
```

### 6. App Store Privacy Labels

#### iOS Privacy Manifest (app.json)

```json
{
  "ios": {
    "privacyManifest": {
      "NSPrivacyTracking": false,
      "NSPrivacyCollectedDataTypes": [
        {
          "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeProductInteraction",
          "NSPrivacyCollectedDataTypeLinked": false,
          "NSPrivacyCollectedDataTypeTracking": false,
          "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAnalytics"]
        }
      ]
    }
  }
}
```

#### Android Data Safety (Google Play Console)

Configure in Play Console > App content > Data safety:

```
Data Collected:
├── App interactions
│   ├── Used for: Analytics
│   ├── Shared: No
│   ├── Encrypted in transit: Yes
│   └── Deletion available: Yes

Data NOT Collected:
├── Health info (explicitly marked NOT collected)
├── Personal info
├── Financial info
├── Location
├── Messages
└── Photos/Videos
```

---

## Configuration Checklist

### Legal (BLOCKING - before any production use)

- [ ] Execute PostHog Standard DPA (request from PostHog support)
- [ ] Update privacy policy with analytics disclosure (see template below)
- [ ] Configure PostHog data retention to 24 months (vs 7-year default)
- [ ] Set up privacy@being.app for deletion requests

### Technical (BLOCKING)

- [ ] Create PostHog account (https://eu.posthog.com)
- [ ] Create project with EU data residency selected
- [ ] Implement PHIFilter class with whitelist validation
- [ ] Get API key from Project Settings
- [ ] Add API key to environment config (not committed to git)
- [ ] Test consent toggle disables tracking
- [ ] Verify no PHI in test events via PostHog dashboard
- [ ] Complete iOS privacy manifest
- [ ] Complete Android Data Safety disclosure

### Post-Launch (30-day SLA)

- [ ] Document GDPR/CCPA deletion request process
- [ ] Schedule quarterly analytics audit for PHI leakage
- [ ] Set PostHog DPA renewal reminder (annual)

---

## Validation

### PHI Leak Prevention Tests

```typescript
// __tests__/analytics/phi-prevention.test.ts
describe('PHI Prevention', () => {
  it('blocks assessment scores', async () => {
    const result = await analytics.trackEvent('assessment_completed', {
      score: 15, // PHI - should be blocked
      type: 'phq9'
    });

    expect(result).toBe(false);
    expect(mockPostHog.capture).not.toHaveBeenCalled();
  });

  it('allows feature usage without scores', async () => {
    const result = await analytics.trackEvent('assessment_completed', {
      type: 'phq9' // Safe - just the fact it was completed
    });

    expect(result).toBe(true);
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'assessment_completed',
      { type: 'phq9' }
    );
  });

  it('blocks non-whitelisted event types', async () => {
    const result = await analytics.trackEvent('mood_recorded', {
      value: 7 // Not in whitelist
    });

    expect(result).toBe(false);
  });

  it('blocks PHI keywords in data', async () => {
    const result = await analytics.trackEvent('screen_viewed', {
      screen: 'assessment_result_severe' // Contains PHI keywords
    });

    expect(result).toBe(false);
  });
});
```

### GDPR/CCPA Compliance Tests

```typescript
// __tests__/analytics/gdpr-ccpa-compliance.test.ts
describe('GDPR Compliance', () => {
  it('respects consent revocation', async () => {
    consentStore.revokeAnalyticsConsent();

    await analytics.trackEvent('screen_viewed', { screen: 'home' });

    expect(mockPostHog.capture).not.toHaveBeenCalled();
    expect(mockPostHog.optOut).toHaveBeenCalled();
  });

  it('resets identity on consent revocation', async () => {
    consentStore.revokeAnalyticsConsent();

    expect(mockPostHog.reset).toHaveBeenCalled();
  });
});

describe('CCPA Compliance', () => {
  it('logs deletion requests for audit', async () => {
    await handleAnalyticsDeletion('ccpa');

    const keys = await AsyncStorage.getAllKeys();
    const deletionKey = keys.find(k => k.startsWith('deletion_request_'));

    expect(deletionKey).toBeDefined();
    expect(mockPostHog.reset).toHaveBeenCalled();
  });
});
```

---

## Privacy Policy Template

Add to privacy policy under "Analytics and Usage Data":

```markdown
### Analytics and Usage Data

Being uses PostHog (EU data residency) to collect anonymous product analytics.
Analytics is disabled by default and requires your explicit opt-in.

**What We Collect (when opted in):**
- Screen views and navigation patterns
- Feature usage counts (e.g., "check-in completed")
- App performance metrics (load times, errors)
- Session duration
- Device type and operating system version

**What We NEVER Collect:**
- Assessment scores (PHQ-9, GAD-7)
- Mood check-in values or notes
- Journal entries or reflections
- Crisis contact information
- Any mental health data or outcomes

**Your Control:**
- Analytics is OFF by default
- Opt-in via Settings > Privacy > Analytics
- Opt-out at any time (same location)
- Request data deletion (Settings > Privacy > Delete Analytics Data)

**Data Residency:**
Analytics data is processed and stored in the EU (Frankfurt, Germany).

**Third Party:**
PostHog Inc. (privacy policy: https://posthog.com/privacy)
```

---

## Supersedes

This plan replaces the over-engineered approach in `BAA-Free-Analytics-Design.md`:

| Removed | Reason |
|---------|--------|
| k-anonymity (k≥5) | Not needed - no PHI sent |
| Differential privacy (ε≤1.0) | Not needed - no PHI sent |
| Device-side aggregation | PostHog handles aggregation |
| Weekly batch transmission | Real-time is fine for non-PHI |
| Severity bucket conversion | We don't send scores at all |
| Complex anonymization engine | Just don't send sensitive data |

---

## References

- PostHog React Native SDK: https://posthog.com/docs/libraries/react-native
- PostHog GDPR Compliance: https://posthog.com/docs/privacy/gdpr-compliance
- Being Privacy Architecture: `docs/architecture/data-privacy-architecture.md`
- Legacy Design (reference only): `docs/development/BAA-Free-Analytics-Design.md`
