# Analytics Data Classification Guide

**Version**: 1.0
**Last Updated**: 2025-10-02
**Classification**: CRITICAL - Privacy & Compliance
**OWASP Categories**: A04:2021-Insecure Design, A01:2021-Broken Access Control

## Executive Summary

This document defines strict data classification rules for privacy-preserving analytics in Being. MBCT. The fundamental principle: **NO PHI or identifiable data ever leaves the device**.

### Classification Hierarchy

```
PROHIBITED (Never Collect):
├─ Protected Health Information (PHI)
├─ Personal Identifiers
├─ Mental Health Data
└─ Linkable Information

RESTRICTED (Anonymize Before Collection):
├─ Quasi-Identifiers (generalize)
├─ Behavioral Patterns (aggregate)
└─ Usage Metrics (add noise)

SAFE (Collect with Privacy Guarantees):
├─ Anonymized Events (k≥5, ε≤1.0)
├─ Aggregate Statistics
└─ Non-Identifiable Behavioral Data
```

---

## 1. Prohibited Data (NEVER Collect)

### 1.1 Protected Health Information (PHI)

**CRITICAL**: Any data that could be used to identify an individual's health status is PROHIBITED.

#### Mental Health Assessments
- ❌ PHQ-9 scores (individual or aggregate)
- ❌ GAD-7 scores (individual or aggregate)
- ❌ Individual question responses
- ❌ Assessment completion timestamps (exact)
- ❌ Score trends or changes
- ❌ Clinical interpretations

**Why Prohibited**: PHQ/GAD scores are clinical indicators of mental health conditions. Even anonymized scores could reveal sensitive health information.

#### Clinical Terminology
- ❌ Depression severity levels
- ❌ Anxiety severity levels
- ❌ Suicidal ideation indicators
- ❌ Crisis event details
- ❌ Therapeutic recommendations
- ❌ Treatment outcomes

**Why Prohibited**: Clinical terms directly indicate mental health status and diagnosis.

#### Personal Health Records
- ❌ Check-in mood data (exact values)
- ❌ Emotional state descriptions
- ❌ Journal entries or reflections
- ❌ Coping strategy effectiveness
- ❌ Medication tracking
- ❌ Therapy session notes

**Why Prohibited**: Personal health records contain sensitive information protected under HIPAA.

### 1.2 Direct Identifiers

**CRITICAL**: Any data that directly identifies an individual is PROHIBITED.

#### Personal Identifiers
- ❌ Email addresses
- ❌ Phone numbers
- ❌ Names (first, last, full)
- ❌ Social Security Numbers
- ❌ Government IDs
- ❌ IP addresses (exact)
- ❌ GPS coordinates (precise)

**Why Prohibited**: These are direct identifiers under HIPAA and GDPR.

#### Device & Session Identifiers
- ❌ Device IDs (exact)
- ❌ User IDs (persistent)
- ❌ Session IDs (long-lived)
- ❌ Installation IDs
- ❌ Advertising IDs
- ❌ Push notification tokens

**Why Prohibited**: Persistent identifiers enable tracking and re-identification across sessions.

#### Biometric Data
- ❌ Fingerprint data
- ❌ Face ID data
- ❌ Voice recordings
- ❌ Keystroke patterns (detailed)

**Why Prohibited**: Biometric data is highly sensitive and can uniquely identify individuals.

### 1.3 Linkable Information

**CRITICAL**: Data that could be combined to re-identify individuals is PROHIBITED.

#### Demographic Combinations
- ❌ Exact age + precise location
- ❌ Zip code + birthdate
- ❌ Age + rare condition + location
- ❌ Occupation + employer + city

**Why Prohibited**: Quasi-identifiers can be combined for re-identification attacks (k-anonymity prevents this by ensuring k≥5 in each group).

#### Temporal Data
- ❌ Exact timestamps (millisecond precision)
- ❌ Event sequences with precise timing
- ❌ Daily activity patterns (detailed)

**Why Prohibited**: Timing patterns can fingerprint individuals.

---

## 2. Restricted Data (Anonymize Before Collection)

### 2.1 Quasi-Identifiers (Require Generalization)

These attributes must be **generalized** before collection to prevent re-identification.

#### Age (Generalize to 10-Year Ranges)
✅ **ALLOWED**: Age ranges
- `18-27` (includes 18-27 years old)
- `28-37` (includes 28-37 years old)
- `38-47` (includes 38-47 years old)
- `48+` (includes 48+ years old)

❌ **PROHIBITED**: Exact ages
- `25` ❌
- `Born in 1998` ❌
- `25 years, 3 months` ❌

**Implementation**:
```typescript
function generalizeAge(age: number): string {
  if (age < 18) return "18-27"; // App minimum age is 18
  if (age < 28) return "18-27";
  if (age < 38) return "28-37";
  if (age < 48) return "38-47";
  return "48+";
}
```

#### Geographic Location (Generalize to State/Province)
✅ **ALLOWED**: State/province or international
- `CA` (California)
- `NY` (New York)
- `INTL` (International - outside US)
- `UNKNOWN` (Location permission denied)

❌ **PROHIBITED**: Precise locations
- `San Francisco, CA` ❌
- `ZIP 94102` ❌
- GPS coordinates `37.7749, -122.4194` ❌
- City-level `New York, NY` ❌

**Implementation**:
```typescript
function generalizeLocation(coords?: GeoCoordinates): string {
  if (!coords) return "UNKNOWN";

  // Reverse geocode to state level only
  const state = await reverseGeocodeToState(coords);

  if (!state || !isUSState(state)) {
    return "INTL";
  }

  return state; // 2-character state code
}
```

#### App Version (Generalize to Major.Minor)
✅ **ALLOWED**: Major.minor version
- `1.0` (from 1.0.x)
- `1.1` (from 1.1.x)
- `2.0` (from 2.0.x)

❌ **PROHIBITED**: Patch versions
- `1.0.3` ❌
- `1.0.3-beta.2` ❌
- `1.0.3+build.123` ❌

**Implementation**:
```typescript
function generalizeVersion(version: string): string {
  const [major, minor] = version.split('.');
  return `${major}.${minor}`;
}
```

#### Platform (Already Generalized)
✅ **ALLOWED**: Platform type
- `iOS`
- `Android`

❌ **PROHIBITED**: Detailed platform info
- `iOS 17.2.1` ❌
- `iPhone 15 Pro Max` ❌
- `Android 14, Samsung Galaxy S24` ❌

### 2.2 Behavioral Patterns (Require K-Anonymity)

Behavioral data must be grouped with k≥5 users sharing same quasi-identifiers.

#### Screen Views (Safe with K-Anonymity)
✅ **ALLOWED**: Screen name + generalized context
```json
{
  "event": "SCREEN_VIEW",
  "screen": "Home",
  "quasiIdentifiers": {
    "ageRange": "28-37",
    "region": "CA",
    "platform": "iOS",
    "appVersion": "1.0"
  },
  "bucketSize": 12  // k=12 ≥ 5 ✓
}
```

❌ **PROHIBITED**: Screen views with identifiable context
```json
{
  "event": "SCREEN_VIEW",
  "screen": "Home",
  "userId": "user_12345",  // ❌ User ID
  "timestamp": 1696284765432,  // ❌ Exact timestamp
  "previousScreen": "PHQ-9-Assessment"  // ❌ Reveals health behavior
}
```

#### Interaction Events (Safe with K-Anonymity)
✅ **ALLOWED**: Interaction type + anonymized context
```json
{
  "event": "BUTTON_PRESS",
  "button": "breathing_exercise_start",
  "quasiIdentifiers": { /* generalized */ },
  "bucketSize": 8  // k=8 ≥ 5 ✓
}
```

❌ **PROHIBITED**: Interactions revealing health data
```json
{
  "event": "BUTTON_PRESS",
  "button": "crisis_hotline_988",  // ❌ Reveals crisis state
  "userId": "user_12345"  // ❌ Linkable identifier
}
```

#### Session Metrics (Require Differential Privacy)
✅ **ALLOWED**: Aggregated session duration with noise
```json
{
  "event": "SESSION_DURATION",
  "durationSeconds": 1847,  // True: 1820s, Noise: +27s (Laplace)
  "epsilon": 0.1,
  "mechanism": "laplace",
  "quasiIdentifiers": { /* generalized */ },
  "bucketSize": 15  // k=15 ≥ 5 ✓
}
```

❌ **PROHIBITED**: Exact session metrics
```json
{
  "event": "SESSION_DURATION",
  "durationSeconds": 1820,  // ❌ Exact value (no noise)
  "startTime": 1696284765432,  // ❌ Exact timestamp
  "endTime": 1696286585432  // ❌ Exact timestamp
}
```

---

## 3. Safe Analytics Events (Collect with Privacy Guarantees)

### 3.1 Privacy Requirements for Safe Events

**ALL safe events MUST satisfy**:
1. ✅ K-anonymity: k≥5 users in bucket
2. ✅ Differential privacy: ε≤1.0 noise applied
3. ✅ Quasi-identifier generalization
4. ✅ No PHI content
5. ✅ PHI detector validation passed

### 3.2 Approved Event Types

#### App Lifecycle Events
```typescript
interface AppLifecycleEvent {
  event: 'APP_LAUNCH' | 'APP_BACKGROUND' | 'APP_FOREGROUND';
  platform: 'iOS' | 'Android';
  appVersion: string;  // Major.minor only (e.g., "1.0")
  quasiIdentifiers: QuasiIdentifiers;
  bucketSize: number;  // Must be ≥5
}
```

**Safe Example**:
```json
{
  "event": "APP_LAUNCH",
  "platform": "iOS",
  "appVersion": "1.0",
  "quasiIdentifiers": {
    "ageRange": "28-37",
    "region": "CA",
    "platform": "iOS",
    "appVersion": "1.0"
  },
  "bucketSize": 23
}
```

#### Feature Usage (Non-Clinical)
```typescript
interface FeatureUsageEvent {
  event: 'FEATURE_USED';
  feature: string;  // Non-clinical features only
  interactionType: 'view' | 'start' | 'complete';
  quasiIdentifiers: QuasiIdentifiers;
  bucketSize: number;
}
```

**Safe Features**:
- ✅ `breathing_exercise` (general, not linked to crisis)
- ✅ `daily_check_in_start` (start only, no mood data)
- ✅ `settings_viewed`
- ✅ `onboarding_completed`

**Prohibited Features**:
- ❌ `phq9_assessment` (reveals health assessment)
- ❌ `crisis_button_pressed` (reveals crisis state)
- ❌ `mood_sad_selected` (reveals emotional state)
- ❌ `988_called` (reveals crisis intervention)

#### Error & Performance Events
```typescript
interface ErrorEvent {
  event: 'ERROR_OCCURRED';
  errorType: string;  // Generic category only
  component: string;   // Component name (no user context)
  platform: 'iOS' | 'Android';
  appVersion: string;
  quasiIdentifiers: QuasiIdentifiers;
  bucketSize: number;
}
```

**Safe Example**:
```json
{
  "event": "ERROR_OCCURRED",
  "errorType": "network_timeout",
  "component": "AnalyticsService",
  "platform": "Android",
  "appVersion": "1.0",
  "quasiIdentifiers": { /* generalized */ },
  "bucketSize": 7
}
```

❌ **PROHIBITED**: Errors with user context
```json
{
  "event": "ERROR_OCCURRED",
  "errorType": "phq9_scoring_failed",  // ❌ Reveals assessment
  "userId": "user_12345",  // ❌ Identifier
  "stackTrace": "..."  // ❌ May contain PII in variables
}
```

---

## 4. Event Examples & Validation

### 4.1 Compliant Events

#### Example 1: Safe Screen View
```json
{
  "event": "SCREEN_VIEW",
  "screen": "Home",
  "timestamp": 1696284700000,  // Rounded to nearest 5 minutes
  "quasiIdentifiers": {
    "ageRange": "28-37",
    "region": "NY",
    "platform": "iOS",
    "appVersion": "1.0"
  },
  "bucketSize": 18,
  "privacyGuarantees": {
    "kAnonymity": 18,
    "epsilon": 0.05,
    "mechanism": "laplace"
  }
}
```

**Why Compliant**:
- ✅ k=18 ≥ 5 (k-anonymity satisfied)
- ✅ ε=0.05 ≤ 1.0 (differential privacy applied)
- ✅ Quasi-identifiers generalized
- ✅ No PHI or identifiers
- ✅ Screen name is non-clinical

#### Example 2: Safe Feature Interaction
```json
{
  "event": "FEATURE_USED",
  "feature": "breathing_exercise",
  "interactionType": "complete",
  "durationSeconds": 183,  // True: 180s, Noise: +3s
  "quasiIdentifiers": {
    "ageRange": "18-27",
    "region": "CA",
    "platform": "Android",
    "appVersion": "1.1"
  },
  "bucketSize": 9,
  "privacyGuarantees": {
    "kAnonymity": 9,
    "epsilon": 0.1,
    "mechanism": "laplace",
    "sensitivity": 180  // Max duration: 3 minutes
  }
}
```

**Why Compliant**:
- ✅ k=9 ≥ 5
- ✅ ε=0.1 with Laplace noise added
- ✅ Duration has noise (true 180s, reported 183s)
- ✅ Feature is non-clinical
- ✅ No link to individual's mental health state

#### Example 3: Safe Error Event
```json
{
  "event": "ERROR_OCCURRED",
  "errorType": "network_failure",
  "component": "AnalyticsService",
  "count": 3,  // True: 2, Noise: +1 (Laplace)
  "platform": "iOS",
  "appVersion": "1.0",
  "quasiIdentifiers": {
    "ageRange": "38-47",
    "region": "INTL",
    "platform": "iOS",
    "appVersion": "1.0"
  },
  "bucketSize": 6,
  "privacyGuarantees": {
    "kAnonymity": 6,
    "epsilon": 0.1,
    "mechanism": "laplace"
  }
}
```

**Why Compliant**:
- ✅ k=6 ≥ 5
- ✅ Count has Laplace noise
- ✅ Error type is generic (no user context)
- ✅ No stack traces or PII

### 4.2 Non-Compliant Events (BLOCKED)

#### Example 1: PHI Leakage
```json
{
  "event": "ASSESSMENT_COMPLETED",
  "assessmentType": "PHQ-9",  // ❌ BLOCKED: PHI
  "score": 18,  // ❌ BLOCKED: Health data
  "quasiIdentifiers": { /* ... */ }
}
```

**Why Blocked**:
- ❌ Contains PHQ-9 score (protected health information)
- ❌ Reveals mental health assessment
- **Action**: PHI detector blocks transmission, logs security violation

#### Example 2: User Identifier
```json
{
  "event": "SCREEN_VIEW",
  "screen": "Home",
  "userId": "user_abc123",  // ❌ BLOCKED: Direct identifier
  "quasiIdentifiers": { /* ... */ }
}
```

**Why Blocked**:
- ❌ Contains persistent user ID (direct identifier)
- **Action**: PHI detector blocks, even if k≥5

#### Example 3: K-Anonymity Violation
```json
{
  "event": "FEATURE_USED",
  "feature": "breathing_exercise",
  "quasiIdentifiers": {
    "ageRange": "48+",
    "region": "VT",  // Vermont - small population
    "platform": "Android",
    "appVersion": "1.0"
  },
  "bucketSize": 2  // ❌ BLOCKED: k=2 < 5
}
```

**Why Blocked**:
- ❌ k=2 < 5 (k-anonymity violated)
- **Action**: Event buffered until bucket reaches k≥5 or timeout (24h)

#### Example 4: No Differential Privacy
```json
{
  "event": "SESSION_DURATION",
  "durationSeconds": 1820,  // ❌ Exact value (no noise)
  "quasiIdentifiers": { /* ... */ },
  "bucketSize": 10,
  "privacyGuarantees": {
    "kAnonymity": 10,
    "epsilon": 0  // ❌ BLOCKED: No DP applied
  }
}
```

**Why Blocked**:
- ❌ ε=0 (no differential privacy applied)
- **Action**: Privacy guarantee checker blocks transmission

---

## 5. Data Validation Rules

### 5.1 Pre-Transmission Checklist

**ALL events must pass these checks before transmission**:

```typescript
async function validateEventForTransmission(
  event: AnalyticsEvent
): Promise<ValidationResult> {
  // 1. PHI Detection
  const phiCheck = await phiDetector.validate(event);
  if (!phiCheck.valid) {
    return {
      valid: false,
      reason: 'PHI_DETECTED',
      action: 'BLOCK_AND_LOG'
    };
  }

  // 2. K-Anonymity Check
  if (!event.bucketSize || event.bucketSize < 5) {
    return {
      valid: false,
      reason: 'K_ANONYMITY_VIOLATION',
      action: 'BUFFER_UNTIL_K_SATISFIED'
    };
  }

  // 3. Differential Privacy Check
  if (!event.privacyGuarantees?.epsilon || event.privacyGuarantees.epsilon <= 0) {
    return {
      valid: false,
      reason: 'NO_DIFFERENTIAL_PRIVACY',
      action: 'BLOCK_AND_LOG'
    };
  }

  // 4. Quasi-Identifier Generalization Check
  const qiCheck = validateQuasiIdentifiers(event.quasiIdentifiers);
  if (!qiCheck.valid) {
    return {
      valid: false,
      reason: 'QUASI_IDENTIFIERS_NOT_GENERALIZED',
      action: 'BLOCK_AND_LOG'
    };
  }

  // 5. Approved Event Type Check
  if (!APPROVED_EVENT_TYPES.includes(event.event)) {
    return {
      valid: false,
      reason: 'UNAPPROVED_EVENT_TYPE',
      action: 'BLOCK_AND_LOG'
    };
  }

  // 6. Privacy Budget Check
  const budgetCheck = await budgetManager.canAfford(event.privacyGuarantees.epsilon);
  if (!budgetCheck) {
    return {
      valid: false,
      reason: 'PRIVACY_BUDGET_EXHAUSTED',
      action: 'BLOCK_AND_DISABLE_ANALYTICS'
    };
  }

  return {
    valid: true,
    action: 'TRANSMIT'
  };
}
```

### 5.2 Quasi-Identifier Validation

```typescript
function validateQuasiIdentifiers(qi: QuasiIdentifiers): ValidationResult {
  // Age Range: Must be 10-year bucket
  const validAgeRanges = ['18-27', '28-37', '38-47', '48+'];
  if (!validAgeRanges.includes(qi.ageRange)) {
    return {
      valid: false,
      reason: `Invalid age range: ${qi.ageRange}. Must be ${validAgeRanges.join(', ')}`
    };
  }

  // Region: Must be 2-char state code or "INTL" or "UNKNOWN"
  if (qi.region.length > 4 || (qi.region !== 'INTL' && qi.region !== 'UNKNOWN' && qi.region.length !== 2)) {
    return {
      valid: false,
      reason: `Invalid region: ${qi.region}. Must be 2-char state code, INTL, or UNKNOWN`
    };
  }

  // Platform: Must be iOS or Android
  if (qi.platform !== 'iOS' && qi.platform !== 'Android') {
    return {
      valid: false,
      reason: `Invalid platform: ${qi.platform}. Must be iOS or Android`
    };
  }

  // App Version: Must be major.minor format
  if (!/^\d+\.\d+$/.test(qi.appVersion)) {
    return {
      valid: false,
      reason: `Invalid app version: ${qi.appVersion}. Must be major.minor format (e.g., 1.0)`
    };
  }

  return { valid: true };
}
```

### 5.3 PHI Detection Patterns

```typescript
const PHI_DETECTION_PATTERNS = {
  // Direct Identifiers
  EMAIL: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  PHONE: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/,
  ZIP_CODE: /\b\d{5}(-\d{4})?\b/,

  // Health-Related Terms
  PHQ_SCORE: /PHQ[-\s]?\d+/i,
  GAD_SCORE: /GAD[-\s]?\d+/i,
  CLINICAL_TERMS: /\b(depression|anxiety|suicidal?|crisis|self-harm|bipolar|ptsd|trauma)\b/i,
  MEDICATION: /\b(ssri|snri|antidepressant|anxiolytic|benzodiazepine)\b/i,

  // Identifiers
  USER_ID: /user[-_]?id|userId|user_identifier/i,
  DEVICE_ID: /device[-_]?id|deviceId|device_identifier/i,
  SESSION_ID: /session[-_]?id|sessionId|session_identifier/i,

  // Precise Location
  COORDINATES: /[-]?\d+\.\d{4,},\s*[-]?\d+\.\d{4,}/,
  STREET_ADDRESS: /\d+\s+[\w\s]+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)/i,

  // Exact Timestamps (millisecond precision)
  PRECISE_TIMESTAMP: /timestamp["']?\s*:\s*\d{13,}/,
};

function detectPHI(event: any): PHIDetection {
  const serialized = JSON.stringify(event);
  const violations: string[] = [];

  for (const [name, pattern] of Object.entries(PHI_DETECTION_PATTERNS)) {
    if (pattern.test(serialized)) {
      violations.push(name);
    }
  }

  return {
    detected: violations.length > 0,
    violations,
    action: violations.length > 0 ? 'BLOCK' : 'ALLOW'
  };
}
```

---

## 6. Implementation Guidelines

### 6.1 Event Creation Template

```typescript
/**
 * Template for creating compliant analytics events
 */
async function createCompliantEvent(
  eventType: ApprovedEventType,
  data: EventData
): Promise<AnalyticsEvent | null> {
  // 1. Extract and generalize quasi-identifiers
  const quasiIdentifiers = await extractQuasiIdentifiers();

  // 2. Assign to k-anonymity bucket
  const bucket = await kAnonymityEngine.assignToBucket({
    eventType,
    data,
    quasiIdentifiers
  });

  // If bucket not ready (k < 5), buffer event
  if (!bucket.ready) {
    console.log('[PRIVACY] Buffering event until k≥5');
    return null;
  }

  // 3. Apply differential privacy
  const epsilon = budgetManager.getRecommendedEpsilon(eventType);
  const allocated = await budgetManager.allocateBudget(epsilon);

  if (!allocated) {
    console.warn('[PRIVACY] Budget exhausted, dropping event');
    return null;
  }

  const noisyData = await applyDifferentialPrivacy(data, epsilon);

  // 4. Construct event
  const event: AnalyticsEvent = {
    event: eventType,
    ...noisyData,
    quasiIdentifiers,
    bucketSize: bucket.size,
    privacyGuarantees: {
      kAnonymity: bucket.size,
      epsilon: allocated,
      mechanism: 'laplace'
    },
    timestamp: roundToNearest5Minutes(Date.now())
  };

  // 5. Validate before transmission
  const validation = await validateEventForTransmission(event);

  if (!validation.valid) {
    console.error(`[PRIVACY] Validation failed: ${validation.reason}`);
    return null;
  }

  return event;
}
```

### 6.2 Safe Event Logging Examples

#### Example: Log Screen View
```typescript
async function logScreenView(screenName: string) {
  // Only log non-clinical screens
  const SAFE_SCREENS = [
    'Home',
    'Settings',
    'About',
    'Onboarding',
    'BreathingExercise'  // Generic, not crisis-linked
  ];

  if (!SAFE_SCREENS.includes(screenName)) {
    console.warn(`[PRIVACY] Screen ${screenName} not approved for analytics`);
    return;
  }

  await createCompliantEvent('SCREEN_VIEW', {
    screen: screenName
  });
}
```

#### Example: Log Feature Usage
```typescript
async function logFeatureUsage(
  feature: string,
  interactionType: 'view' | 'start' | 'complete',
  durationSeconds?: number
) {
  // Prohibited features
  const PROHIBITED_FEATURES = [
    'phq9_assessment',
    'gad7_assessment',
    'crisis_button',
    'mood_tracking',
    '988_hotline'
  ];

  if (PROHIBITED_FEATURES.includes(feature)) {
    console.warn(`[PRIVACY] Feature ${feature} contains PHI, blocked`);
    return;
  }

  const data: any = {
    feature,
    interactionType
  };

  // Apply DP to duration if provided
  if (durationSeconds) {
    const sensitivity = 180; // 3 minutes max
    const epsilon = 0.1;
    data.durationSeconds = noiseGenerator.addLaplaceNoise(
      durationSeconds,
      sensitivity,
      epsilon
    );
  }

  await createCompliantEvent('FEATURE_USED', data);
}
```

#### Example: Log Error (Safe)
```typescript
async function logError(error: Error, component: string) {
  // Sanitize error message (remove any potential PII)
  const sanitizedMessage = error.message
    .replace(/user_\w+/gi, '[USER_ID]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/\d{10,}/g, '[IDENTIFIER]');

  await createCompliantEvent('ERROR_OCCURRED', {
    errorType: error.name,
    component,
    message: sanitizedMessage,
    // NO stack traces (may contain variable values with PII)
  });
}
```

---

## 7. Compliance & Audit

### 7.1 Audit Requirements

**Quarterly Privacy Audit**:
1. Review all approved event types
2. Validate PHI detection patterns are comprehensive
3. Verify k-anonymity buckets meet k≥5
4. Check privacy budget consumption
5. Test PHI detector with new potential leakage patterns
6. Penetration test for re-identification attacks

### 7.2 Compliance Checklist

- [ ] **PHI Protection**: No mental health data in analytics
- [ ] **K-Anonymity**: All events have k≥5
- [ ] **Differential Privacy**: All metrics have ε≤1.0
- [ ] **Quasi-Identifier Generalization**: Age, location, version generalized
- [ ] **PHI Detector**: Blocking all prohibited patterns
- [ ] **Privacy Budget**: Tracking and enforcing ε≤1.0 lifetime budget
- [ ] **Encryption**: AES-256-GCM + TLS 1.3 for transmission
- [ ] **Audit Trail**: All privacy events logged to encrypted storage
- [ ] **Incident Response**: Privacy breach detection and shutdown procedures

### 7.3 Data Retention & Deletion

**Device-Side**:
- Buffered events (k<5): Delete after 24 hours
- Privacy budget state: Persist indefinitely (small footprint)
- Audit logs: Retain 90 days, then delete

**Server-Side** (Zero-Knowledge):
- Anonymized events: Aggregate immediately, delete raw events after 7 days
- No individual event storage
- No re-identification attempts

---

## 8. Security Testing

### 8.1 PHI Detection Tests

```typescript
describe('PHI Detection', () => {
  const testCases = [
    // Direct Identifiers
    { data: { email: 'user@example.com' }, shouldBlock: true },
    { data: { phone: '555-123-4567' }, shouldBlock: true },
    { data: { ssn: '123-45-6789' }, shouldBlock: true },

    // Health Data
    { data: { score: 'PHQ-9: 15' }, shouldBlock: true },
    { data: { assessment: 'GAD-7 score is 12' }, shouldBlock: true },
    { data: { note: 'Patient reports depression' }, shouldBlock: true },

    // Identifiers
    { data: { userId: 'user_12345' }, shouldBlock: true },
    { data: { deviceId: 'device_abc' }, shouldBlock: true },

    // Safe Data
    { data: { screen: 'Home' }, shouldBlock: false },
    { data: { feature: 'breathing_exercise' }, shouldBlock: false },
    { data: { ageRange: '28-37', region: 'CA' }, shouldBlock: false },
  ];

  testCases.forEach(({ data, shouldBlock }) => {
    it(`should ${shouldBlock ? 'block' : 'allow'}: ${JSON.stringify(data)}`, async () => {
      const result = await phiDetector.validate(data);
      expect(result.blocked).toBe(shouldBlock);
    });
  });
});
```

### 8.2 K-Anonymity Tests

```typescript
describe('K-Anonymity', () => {
  it('should buffer events until k≥5', async () => {
    const events = Array(4).fill(null).map(() => ({
      event: 'SCREEN_VIEW',
      screen: 'Home',
      quasiIdentifiers: { ageRange: '18-27', region: 'CA', platform: 'iOS', appVersion: '1.0' }
    }));

    for (const event of events) {
      const result = await kAnonymityEngine.process(event);
      expect(result.transmitted).toBe(false); // Should buffer
    }

    // 5th event should trigger transmission
    const fifthEvent = { ...events[0] };
    const result = await kAnonymityEngine.process(fifthEvent);
    expect(result.transmitted).toBe(true);
    expect(result.bucketSize).toBeGreaterThanOrEqual(5);
  });

  it('should generalize quasi-identifiers correctly', async () => {
    const event = {
      age: 25,
      location: { lat: 37.7749, lon: -122.4194 }, // San Francisco
      version: '1.2.3',
      platform: 'iOS'
    };

    const anonymized = await kAnonymityEngine.anonymize(event);

    expect(anonymized.quasiIdentifiers).toEqual({
      ageRange: '18-27',
      region: 'CA',
      platform: 'iOS',
      appVersion: '1.2'
    });
  });
});
```

### 8.3 Differential Privacy Tests

```typescript
describe('Differential Privacy', () => {
  it('should add Laplace noise to counts', async () => {
    const trueValue = 100;
    const epsilon = 0.1;
    const sensitivity = 1;

    const noisyValues = Array(1000).fill(null).map(() =>
      noiseGen.addLaplaceNoise(trueValue, sensitivity, epsilon)
    );

    const mean = noisyValues.reduce((a, b) => a + b, 0) / noisyValues.length;

    // Mean should be close to true value
    expect(Math.abs(mean - trueValue)).toBeLessThan(5);

    // Distribution should have variance ~ 2(sensitivity/epsilon)^2
    const variance = noisyValues.reduce((acc, val) =>
      acc + Math.pow(val - mean, 2), 0
    ) / noisyValues.length;

    const expectedVariance = 2 * Math.pow(sensitivity / epsilon, 2);
    expect(Math.abs(variance - expectedVariance)).toBeLessThan(expectedVariance * 0.2);
  });

  it('should respect privacy budget', async () => {
    const budget = new PrivacyBudgetManager();

    // Allocate 0.8 of budget
    const allocated1 = await budget.allocateBudget(0.8);
    expect(allocated1).toBe(0.8);
    expect(budget.remainingBudget).toBe(0.2);

    // Should allow 0.2
    const allocated2 = await budget.allocateBudget(0.2);
    expect(allocated2).toBe(0.2);
    expect(budget.remainingBudget).toBe(0);

    // Should block further allocations
    const allocated3 = await budget.allocateBudget(0.1);
    expect(allocated3).toBeNull();
  });
});
```

---

## 9. Quick Reference

### Approved Event Types
- ✅ `APP_LAUNCH`, `APP_BACKGROUND`, `APP_FOREGROUND`
- ✅ `SCREEN_VIEW` (non-clinical screens only)
- ✅ `FEATURE_USED` (non-clinical features only)
- ✅ `ERROR_OCCURRED` (sanitized errors only)
- ✅ `SESSION_DURATION` (with DP noise)

### Prohibited Data
- ❌ PHQ-9 / GAD-7 scores or responses
- ❌ Mental health data (mood, emotions, symptoms)
- ❌ Crisis events (988 calls, crisis button)
- ❌ Direct identifiers (email, phone, user ID)
- ❌ Precise location (GPS, ZIP codes)
- ❌ Exact timestamps (millisecond precision)

### Privacy Requirements
- **K-Anonymity**: k≥5 users per bucket
- **Differential Privacy**: ε≤1.0 lifetime budget
- **Quasi-Identifiers**: Age (10y ranges), Location (state), Version (major.minor)
- **PHI Detection**: Multi-pattern validation, fail-safe blocking
- **Encryption**: AES-256-GCM + TLS 1.3

---

## Document Control

**Classification**: CRITICAL - Privacy Compliance
**Review Cycle**: Quarterly
**Last Review**: 2025-10-02
**Next Review**: 2026-01-02
**Approved By**: Security Team + Compliance Officer + Clinical Director

**Change Log**:
- 2025-10-02: Initial data classification guide
