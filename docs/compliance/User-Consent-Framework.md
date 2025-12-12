# User Consent Framework for Analytics
**Being. Mental Health Application**

**Document Version**: 1.0
**Last Updated**: 2025-10-02
**Status**: Legal Foundation
**Related**: INFRA-24 Privacy-First Analytics, BAA-Free-Analytics-Design.md

---

## Executive Summary

This document establishes the user consent framework for analytics in Being's mental health application. Even though our BAA-free design means analytics data is NOT Protected Health Information (PHI), explicit user consent is still required under:

1. **App Store Requirements**: Apple and Google require disclosure and consent for analytics
2. **State Privacy Laws**: CCPA, VCDPA, CPA, and other state laws mandate consent
3. **FTC Guidelines**: Federal Trade Commission health app privacy best practices
4. **Ethical Principles**: Mental health users deserve maximum transparency and control

**Critical Principle**: Transparency builds trust. Users should know exactly what data is collected and have easy control over analytics participation.

---

## Legal Requirements for Consent

### 1. App Store Requirements

#### 1.1 Apple App Store Privacy Requirements

**App Privacy Nutrition Label** (Required):
```yaml
Data Used to Track You: None
  - Being does NOT track users across apps/websites

Data Linked to You: None
  - Being does NOT link analytics to user identity

Data Not Linked to You:
  - Product Interaction:
      - Usage data (aggregated feature usage)
  - Diagnostics:
      - Performance data (crash reports, load times)
  - Other Data:
      - None (we don't collect browsing, search, location, etc.)

Purpose:
  - Analytics: "To improve app performance and user experience"
```

**Privacy Policy Requirements**:
- [ ] Link to privacy policy in App Store listing
- [ ] Privacy policy accessible in-app
- [ ] Clear description of analytics practices
- [ ] User control over analytics clearly stated

#### 1.2 Google Play Store Privacy Requirements

**Data Safety Section** (Required):
```yaml
Data Collection:
  App Activity:
    - App interactions (collected, not shared, optional, deletable)
  App Performance:
    - Crash logs (collected, not shared, optional, deletable)
    - Diagnostics (collected, not shared, optional, deletable)

Data Sharing: None
  - Being shares NO data with third parties

Data Security:
  - Data encrypted in transit: Yes (TLS 1.3)
  - Data encrypted at rest: Yes (AES-256)
  - User can request deletion: Yes
  - Committed to Google Play Families Policy: No (not targeting children)

Privacy Policy: [URL]
```

### 2. State Privacy Laws

#### 2.1 California Consumer Privacy Act (CCPA)

**Applicability**: Being operates in California → CCPA applies

**CCPA Requirements**:

**Right to Know** (CCPA §1798.100):
```
Users have the right to know:
1. Categories of personal information collected
2. Categories of sources of personal information
3. Business or commercial purpose for collecting
4. Categories of third parties with whom we share information
5. Specific pieces of personal information collected
```

**Right to Delete** (CCPA §1798.105):
```
Users have the right to request deletion of their personal information,
subject to certain exceptions.
```

**Right to Opt-Out** (CCPA §1798.120):
```
If selling personal information: Right to opt-out
Being position: We do NOT sell personal information → No opt-out required
```

**Being's CCPA Compliance**:
- ✅ Privacy policy discloses analytics data collection
- ✅ User can opt-out of analytics entirely (in Settings)
- ✅ User can request deletion of analytics data
- ✅ NO sale of personal information (not applicable)

#### 2.2 Virginia Consumer Data Protection Act (VCDPA)

**Applicability**: Being has Virginia users → VCDPA applies (effective Jan 1, 2023)

**VCDPA Requirements**:

**Consent for Sensitive Data** (VCDPA §59.1-575):
```
"Sensitive data" includes:
- Personal data revealing racial or ethnic origin
- Mental or physical health diagnosis ← APPLICABLE TO BEING
- Sexual orientation
- Citizenship or immigration status
- etc.

Requirement: AFFIRMATIVE CONSENT required before processing sensitive data
```

**Being's Position**:
- Our analytics is NOT sensitive data (de-identified, aggregate only)
- However, out of abundance of caution: Obtain affirmative consent anyway

**Consumer Rights** (VCDPA §59.1-577):
- Right to access personal data
- Right to delete personal data
- Right to opt-out of targeted advertising (N/A for Being)
- Right to data portability

#### 2.3 Colorado Privacy Act (CPA)

**Applicability**: Being has Colorado users → CPA applies (effective July 1, 2023)

**Similar Requirements to VCDPA**:
- Affirmative consent for sensitive data processing
- Consumer rights (access, delete, opt-out, portability)
- Privacy notice requirements

### 3. Federal Trade Commission (FTC) Guidelines

#### 3.1 FTC Health Breach Notification Rule (16 CFR Part 318)

**Applicability**: Mental health apps that are NOT HIPAA-covered

**Being's Position**:
- Being is a consumer wellness app (not HIPAA-covered entity)
- FTC Health Breach Notification Rule applies

**Requirements**:
```
If breach of "personal health record":
1. Notify affected consumers (≤60 days)
2. Notify FTC (≤60 days)
3. Notify media if ≥500 residents of single state affected
```

**Being's Compliance**:
- Analytics data is de-identified (not "personal health record")
- However, maintain breach notification procedures as best practice

#### 3.2 FTC Fair Information Practice Principles

**Notice/Awareness**:
- ✅ Clear disclosure of analytics practices

**Choice/Consent**:
- ✅ User control over analytics participation

**Access/Participation**:
- ✅ User can view what analytics data contributed

**Integrity/Security**:
- ✅ Encryption and security measures for analytics data

**Enforcement/Redress**:
- ✅ Accountability mechanisms and user complaint process

---

## Consent Collection Implementation

### 4. Consent Timing and Flow

#### 4.1 Recommended Consent Timing

**Option 1: During Onboarding (Recommended)**:
```
Account Creation
    ↓
Privacy & Security Setup
    ↓
[CONSENT SCREEN: Analytics Opt-In] ← HERE
    ↓
Complete Onboarding
```

**Advantages**:
- User informed upfront
- Consent collected before any analytics sent
- Clear, undistracted moment for privacy decisions

**Option 2: First App Launch After Onboarding**:
```
User Opens App (First Time After Account Creation)
    ↓
[CONSENT SCREEN: Analytics Opt-In] ← HERE
    ↓
Main App Experience
```

**Advantages**:
- Separates privacy decisions from account creation flow
- User has completed onboarding and understands app value

**Being's Approach**: **Option 1 (Onboarding)** for maximum transparency

#### 4.2 Consent Screen Design

**Consent Screen Requirements**:

**Title**: "Help Us Improve Being."

**Subtitle**: "Your privacy is our priority. You choose what data to share."

**Body Text** (Plain Language):
```
Being uses anonymous analytics to understand how people use the app
and make it better. Here's what that means:

What We Collect:
• Which features you use (like breathing exercises or mood check-ins)
• How long it takes screens to load
• If the app crashes (so we can fix it)
• General trends (like "1,247 people completed assessments this week")

What We DON'T Collect:
✗ Your actual PHQ-9 or GAD-7 scores
✗ Your mood check-in details or notes
✗ Anything that identifies you personally
✗ Your location or device information

Your Data Security:
• All data is anonymized on your phone before being sent
• We use the same encryption as banks (TLS 1.3)
• No one (including us) can connect analytics to you

Your Control:
• You can turn analytics off anytime in Settings
• You can request deletion of your analytics data
• Choosing "No" won't affect any app features

Learn more about our privacy practices: [Privacy Policy Link]
```

**Consent Options**:
```
[ Yes, Help Improve Being ] (Primary button - green)
[ No, Don't Collect Analytics ] (Secondary button - gray)
```

**Additional Elements**:
- [ ] Link to full Privacy Policy
- [ ] Link to detailed analytics documentation (optional)
- [ ] "Learn More" expandable section with technical details

#### 4.3 Affirmative Consent Requirements

**What Constitutes Valid Consent**:

**REQUIRED for Affirmative Consent**:
- ✅ User takes affirmative action (taps button)
- ✅ Consent is specific (not bundled with other consents)
- ✅ Consent is informed (user understands what they're consenting to)
- ✅ Consent is freely given (can say no without consequences)

**PROHIBITED (Not Valid Consent)**:
- ❌ Pre-checked checkboxes
- ❌ Opt-out only (must be opt-in for sensitive data)
- ❌ Consent bundled with Terms of Service acceptance
- ❌ Consent required to use app (must be optional)

**Being's Implementation**:
```typescript
interface AnalyticsConsentRequest {
  consentType: 'analytics_data_collection',
  required: false, // Optional - user can decline
  preChecked: false, // User must actively consent
  bundled: false, // Separate from other consents
  plainLanguage: true, // Clear, understandable language
  specificPurpose: 'product_improvement', // Specific use case
  withdrawable: true // User can withdraw anytime
}
```

---

## Consent Storage and Management

### 5. Consent Record Requirements

#### 5.1 Consent Data to Store

**Required Consent Record**:
```typescript
interface ConsentRecord {
  // Consent metadata
  consentId: string; // Unique identifier for this consent event
  userId: string; // Anonymous analytics ID (NOT user account ID)
  consentType: 'analytics_data_collection';

  // Consent status
  status: 'granted' | 'denied' | 'withdrawn';
  grantedAt: number; // Unix timestamp
  withdrawnAt: number | null; // If withdrawn

  // Consent context
  version: string; // Privacy policy/consent version shown
  language: string; // Language consent was presented in (e.g., 'en-US')

  // Presentation details
  consentScreenVersion: string; // e.g., 'v1.0_onboarding'
  userAction: 'explicit_opt_in' | 'explicit_opt_out';

  // Audit trail
  ipAddress: string | null; // Optional, for audit purposes
  deviceType: 'ios' | 'android';
  appVersion: string;
}
```

**Example Consent Record**:
```json
{
  "consentId": "consent_2025-10-02_x7k9m2p1q",
  "userId": "analytics_user_a3f8h5n2r",
  "consentType": "analytics_data_collection",
  "status": "granted",
  "grantedAt": 1727884800000,
  "withdrawnAt": null,
  "version": "privacy_policy_v2.1",
  "language": "en-US",
  "consentScreenVersion": "v1.0_onboarding",
  "userAction": "explicit_opt_in",
  "ipAddress": null,
  "deviceType": "ios",
  "appVersion": "1.2.0"
}
```

#### 5.2 Consent Storage Location

**Storage Requirements**:

**Encrypted Storage**:
```typescript
// Store consent records encrypted at rest
const consentRecord: EncryptedConsentRecord = await EncryptionService.encrypt(
  consentData,
  {
    algorithm: 'AES-256-GCM',
    sensitivityLevel: 'medium', // Not clinical data, but user preference
    keyDerivation: 'user_authentication'
  }
);

await SecureStorage.store('consent_records', consentRecord);
```

**Retention Period**:
```
Active consent: Indefinite (until withdrawn)
Withdrawn consent: 6 years (HIPAA audit requirement)
Denied consent: 6 years (proof of no data collection)
```

**Backup and Sync**:
```
Local device only: YES
Cloud backup: NO (consent is device-specific)
Cross-device sync: NO (each device requires separate consent)
```

#### 5.3 Consent Audit Trail

**Audit Log Requirements**:
```typescript
interface ConsentAuditLog {
  timestamp: number;
  action: 'consent_granted' | 'consent_withdrawn' | 'consent_renewed' | 'consent_viewed';
  consentId: string;
  userId: string;
  details: {
    previousStatus?: 'granted' | 'denied' | 'withdrawn';
    newStatus: 'granted' | 'denied' | 'withdrawn';
    triggeredBy: 'user_action' | 'policy_update' | 'system_event';
    ipAddress?: string; // Optional
    deviceId: string; // Anonymous device identifier
  };
}
```

**Audit Events to Log**:
- ✅ Consent granted (first time)
- ✅ Consent withdrawn by user
- ✅ Consent renewed after policy update
- ✅ User viewed consent details
- ✅ Analytics data transmitted (with consent ID reference)
- ✅ Consent verification failed (analytics blocked)

---

## Opt-Out Mechanisms

### 6. User Control Over Analytics

#### 6.1 In-App Opt-Out

**Settings Location**: Settings → Privacy & Security → Analytics

**Settings UI Design**:
```
┌────────────────────────────────────┐
│ Privacy & Security                 │
├────────────────────────────────────┤
│                                    │
│ ANALYTICS                          │
│                                    │
│ [✓] Help improve Being             │
│                                    │
│ We collect anonymous usage data    │
│ to improve the app. No personal    │
│ health information is included.    │
│                                    │
│ [Learn More]                       │
│                                    │
│ Last updated: Oct 2, 2025          │
│                                    │
│ [Request Analytics Data Deletion]  │
│                                    │
└────────────────────────────────────┘
```

**Toggle Behavior**:
```typescript
async function handleAnalyticsToggle(enabled: boolean): Promise<void> {
  if (enabled) {
    // Re-enabling analytics
    const consent = await showConsentConfirmation();
    if (consent.granted) {
      await AnalyticsService.enableAnalytics();
      await ConsentManager.recordConsent('granted');
      showToast('Analytics enabled. Thank you for helping improve Being.');
    }
  } else {
    // Disabling analytics
    const confirmation = await showDisableConfirmation();
    if (confirmation.confirmed) {
      await AnalyticsService.disableAnalytics();
      await ConsentManager.recordConsent('withdrawn');
      showToast('Analytics disabled. No data will be collected.');

      // Offer deletion of existing data
      const deletionRequest = await showDeletionOption();
      if (deletionRequest.delete) {
        await handleAnalyticsDeletionRequest();
      }
    }
  }
}
```

#### 6.2 Immediate Effect of Opt-Out

**Enforcement Requirements**:

**Immediate Actions on Opt-Out**:
```typescript
async function disableAnalytics(): Promise<void> {
  // 1. Stop all analytics collection immediately
  AnalyticsService.stopCollection();

  // 2. Clear in-memory analytics queue
  AnalyticsService.clearQueue();

  // 3. Block all analytics transmission
  AnalyticsService.blockTransmission();

  // 4. Update consent status
  await ConsentManager.withdrawConsent();

  // 5. Log opt-out event
  await AuditLogger.log('analytics_opted_out', {
    timestamp: Date.now(),
    userId: anonymousUserId
  });

  // 6. Notify user
  showNotification('Analytics disabled', 'No analytics data will be collected.');
}
```

**Verification**:
```typescript
// Before every analytics transmission
async function transmitAnalytics(data: AnalyticsData): Promise<void> {
  const consentStatus = await ConsentManager.getStatus();

  if (consentStatus !== 'granted') {
    // BLOCK transmission
    await AuditLogger.log('analytics_transmission_blocked', {
      reason: `consent_status_${consentStatus}`,
      timestamp: Date.now()
    });
    return; // NO DATA SENT
  }

  // Consent granted - proceed with transmission
  await securelyTransmit(data);
}
```

#### 6.3 Re-Opt-In Process

**Re-Enabling Analytics**:

**Requirements for Re-Opt-In**:
- ✅ Must show consent screen again (not just toggle)
- ✅ Inform user of current privacy policy version
- ✅ Generate new consent record
- ✅ Optional: Inform user what has changed since last consent

**Re-Opt-In Flow**:
```typescript
async function handleReOptIn(): Promise<void> {
  // 1. Show current consent screen
  const consent = await showConsentScreen({
    context: 're_opt_in',
    previousConsentDate: user.previousConsentDate,
    policyVersion: 'v2.1',
    changedSinceLastConsent: [
      'Added differential privacy for enhanced anonymization',
      'Reduced data retention from 12 months to 6 months'
    ]
  });

  // 2. Process consent response
  if (consent.granted) {
    await ConsentManager.grantConsent();
    await AnalyticsService.enableAnalytics();
  } else {
    // User declined re-opt-in
    await ConsentManager.denyConsent();
  }
}
```

---

## Data Deletion Requests

### 7. User Right to Delete Analytics Data

#### 7.1 Deletion Request Process

**Deletion Request UI**:
```
Settings → Privacy & Security → Analytics → [Request Analytics Data Deletion]

┌────────────────────────────────────┐
│ Delete Analytics Data              │
├────────────────────────────────────┤
│                                    │
│ This will permanently delete all   │
│ anonymous analytics data we have   │
│ collected from your device.        │
│                                    │
│ What will be deleted:              │
│ • Feature usage statistics         │
│ • Performance metrics              │
│ • Crash reports                    │
│ • All aggregated data              │
│                                    │
│ What will NOT be affected:         │
│ • Your assessments and mood data   │
│   (stored locally on your device)  │
│ • Your app settings                │
│ • Your crisis plan                 │
│                                    │
│ Deletion timeline: 30 days         │
│                                    │
│ [Cancel]    [Delete Analytics Data]│
│                                    │
└────────────────────────────────────┘
```

**Confirmation Flow**:
```typescript
async function requestAnalyticsDeletion(): Promise<DeletionResult> {
  // 1. Show deletion confirmation
  const confirmed = await showDeletionConfirmation();
  if (!confirmed) return { cancelled: true };

  // 2. Create deletion request
  const deletionRequest: DeletionRequest = {
    requestId: generateRequestId(),
    userId: anonymousUserId,
    requestedAt: Date.now(),
    dataType: 'analytics_data',
    status: 'pending',
    estimatedCompletionDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
  };

  // 3. Submit to analytics vendor
  await AnalyticsVendor.submitDeletionRequest(deletionRequest);

  // 4. Track locally
  await DeletionManager.trackRequest(deletionRequest);

  // 5. Notify user
  showNotification(
    'Deletion Request Submitted',
    'Your analytics data will be deleted within 30 days. You will receive confirmation when complete.'
  );

  return {
    success: true,
    requestId: deletionRequest.requestId,
    estimatedCompletion: deletionRequest.estimatedCompletionDate
  };
}
```

#### 7.2 Deletion Timeline and Verification

**Deletion SLA**: ≤30 days from request

**Deletion Process**:
```
Day 0: User submits deletion request
  ↓
Day 1-7: Request queued and validated
  ↓
Day 7-14: Data identified and tagged for deletion
  ↓
Day 14-21: Data deleted from primary storage
  ↓
Day 21-28: Data deleted from backup systems
  ↓
Day 28-30: Deletion verification and confirmation
  ↓
Day 30: User notified of completion
```

**Verification Requirements**:
```typescript
interface DeletionVerification {
  requestId: string;
  completedAt: number;
  verificationMethod: 'vendor_certification' | 'automated_verification';
  dataDeleted: {
    primaryStorage: boolean;
    backupSystems: boolean;
    aggregatedReports: boolean; // Re-computed without user's data
    auditLogs: 'retained'; // Deletion audit log retained per legal requirement
  };
  certificationDocument?: string; // URL to vendor's deletion certificate
}
```

**User Notification on Completion**:
```
Subject: Analytics Data Deletion Complete

Your request to delete analytics data (Request ID: del_x7k9m2p1q)
has been completed.

What was deleted:
• All feature usage statistics associated with your device
• All performance metrics from your sessions
• All crash reports
• All aggregated data that included your contributions

What was retained:
• Deletion request audit log (required by law)
• Consent records (proof of your privacy preferences)

If you have any questions, please contact privacy@being.app

Thank you for using Being.
```

#### 7.3 Partial Deletion Options

**Granular Deletion** (Optional Enhancement):
```
Allow users to delete specific categories:

[ ] Feature usage data
[ ] Performance metrics
[ ] Crash reports
[ ] All analytics data (complete deletion)
```

**Implementation**:
```typescript
async function requestPartialDeletion(
  categories: AnalyticsCategory[]
): Promise<DeletionResult> {
  const deletionRequest: PartialDeletionRequest = {
    requestId: generateRequestId(),
    userId: anonymousUserId,
    requestedAt: Date.now(),
    categoriesToDelete: categories, // e.g., ['feature_usage', 'performance']
    status: 'pending'
  };

  await AnalyticsVendor.submitPartialDeletionRequest(deletionRequest);
  return { success: true, requestId: deletionRequest.requestId };
}
```

---

## Privacy Policy Updates

### 8. Privacy Policy Requirements for Analytics

#### 8.1 Required Disclosures

**Privacy Policy Section: Analytics**

```markdown
# Analytics and Product Improvement

## What We Collect

Being collects anonymous analytics data to understand how people use the app
and improve the experience for everyone. This data includes:

- **Feature usage**: Which features you use (like breathing exercises, mood check-ins, or assessments)
- **Performance metrics**: How long screens take to load and how the app performs on your device
- **Crash reports**: Technical information when the app crashes, so we can fix bugs
- **General trends**: Aggregated statistics like "1,247 people completed assessments this week"

## What We DON'T Collect

We do NOT collect:

- Your actual PHQ-9 or GAD-7 assessment scores
- Your mood check-in details, notes, or reflections
- Your name, email, phone number, or any personal identifiers
- Your location or GPS coordinates
- Your device's unique identifiers (we use rotating anonymous IDs)
- Any information that could identify you personally

## How We Protect Your Privacy

- **Anonymized on your device**: All data is anonymized on your phone before being sent
- **Encrypted transmission**: Data is encrypted using TLS 1.3 (bank-level security)
- **No re-identification**: We use advanced privacy techniques (k-anonymity and differential privacy) to ensure no one can connect analytics data to you
- **No Business Associate Agreement required**: Because we never collect Protected Health Information (PHI) in analytics, we don't need special agreements with analytics vendors

## Your Control

You have complete control over analytics:

- **Opt-in required**: We won't collect analytics unless you explicitly agree
- **Easy opt-out**: You can turn off analytics anytime in Settings → Privacy & Security → Analytics
- **Request deletion**: You can request deletion of your analytics data anytime
- **No impact on features**: Choosing not to participate in analytics doesn't affect any app features

## How We Use Analytics Data

We use analytics data solely to:

- Improve app performance and fix bugs
- Understand which features are most helpful
- Make data-driven decisions about new features
- Ensure the app works well on different devices

We do NOT:

- Sell your data to anyone
- Use analytics for advertising
- Share data with third parties (except our analytics vendor, bound by strict privacy terms)
- Combine analytics with external datasets

## Data Retention

- **Analytics data**: Retained for up to 12 months, then automatically deleted
- **Consent records**: Retained for 6 years (legal requirement)
- **Deletion requests**: Processed within 30 days

## Third-Party Analytics Vendor

We use [Analytics Vendor Name] to process anonymous analytics data. [Vendor] is:

- SOC 2 Type II certified for data security
- Contractually prohibited from re-identifying users
- Required to delete data upon request
- Subject to strict data retention limits

[Vendor] does NOT have access to your health information, assessments, or mood data.

## Changes to This Policy

If we make material changes to our analytics practices, we will:

- Notify you in-app
- Request fresh consent if required by law
- Give you the option to opt-out

Last updated: October 2, 2025
```

#### 8.2 Privacy Policy Version Control

**Version Management**:
```typescript
interface PrivacyPolicyVersion {
  version: string; // e.g., 'v2.1'
  effectiveDate: number; // Unix timestamp
  previousVersion: string | null;
  changes: PolicyChange[];
  requiresReConsent: boolean; // If material changes made
}

interface PolicyChange {
  section: string; // e.g., 'Analytics and Product Improvement'
  changeType: 'added' | 'modified' | 'removed';
  description: string;
  materialChange: boolean; // Requires user re-consent
}
```

**Example Version Update**:
```typescript
const policyUpdate: PrivacyPolicyVersion = {
  version: 'v2.1',
  effectiveDate: 1727884800000, // Oct 2, 2025
  previousVersion: 'v2.0',
  changes: [
    {
      section: 'Analytics and Product Improvement',
      changeType: 'modified',
      description: 'Reduced analytics data retention from 12 months to 6 months',
      materialChange: false // User-favorable change, no re-consent needed
    },
    {
      section: 'Analytics and Product Improvement',
      changeType: 'added',
      description: 'Added differential privacy (ε≤1.0) for enhanced anonymization',
      materialChange: false // Enhanced privacy, no re-consent needed
    }
  ],
  requiresReConsent: false
};
```

**When to Request Re-Consent**:
```
Material changes requiring re-consent:
✓ Collecting NEW categories of analytics data
✓ Changing data retention from 6 months to 12 months
✓ Sharing analytics with NEW third parties
✓ Using analytics for NEW purposes (e.g., advertising)

Non-material changes (no re-consent needed):
✓ Reducing data retention period
✓ Enhancing privacy protections
✓ Clarifying existing practices
✓ Fixing typos or improving readability
```

---

## Consent Compliance Checklist

### 9. Pre-Launch Validation

**Legal Requirements**:
- [ ] Privacy policy includes analytics section
- [ ] Privacy policy reviewed by legal counsel
- [ ] Consent language reviewed for plain language compliance
- [ ] State privacy law compliance verified (CCPA, VCDPA, CPA)
- [ ] App Store privacy labels completed (Apple & Google)

**Technical Implementation**:
- [ ] Consent screen implemented in onboarding
- [ ] Opt-out mechanism in Settings
- [ ] Consent records stored encrypted
- [ ] Consent verification before analytics transmission
- [ ] Immediate opt-out enforcement
- [ ] Deletion request workflow implemented

**User Experience**:
- [ ] Consent screen uses plain language (8th grade reading level)
- [ ] User can easily understand what data is collected
- [ ] User can easily opt-out
- [ ] No dark patterns or manipulation
- [ ] No pre-checked consent boxes

**Audit and Monitoring**:
- [ ] Consent grant/withdrawal logging
- [ ] Analytics transmission blocked if consent withdrawn
- [ ] Deletion request tracking
- [ ] Consent status verification in analytics pipeline

---

## Conclusion

This consent framework ensures Being. complies with all legal requirements for analytics data collection while maintaining the highest ethical standards for mental health app privacy. Key principles:

1. **Transparency**: Users know exactly what data is collected
2. **Control**: Users have easy, immediate control over analytics
3. **Respect**: User preferences are honored immediately and completely
4. **Compliance**: Meets App Store, state privacy laws, and FTC guidelines
5. **Trust**: Consent builds user trust in Being's privacy practices

**Critical Success Factors**:
- ✅ Plain language consent (no legalese)
- ✅ Opt-in required (no pre-checked boxes)
- ✅ Easy opt-out (Settings toggle)
- ✅ Immediate effect (consent enforced in real-time)
- ✅ User deletion rights (30-day SLA)
- ✅ Privacy policy transparency

---

**Document Status**: Legal Foundation Complete
**Next Steps**: Legal counsel review → UX design → Technical implementation
**Implementation Authorization**: PENDING legal counsel sign-off
**Risk Level**: Low (exceeds legal requirements for user consent)
