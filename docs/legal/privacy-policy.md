# Privacy Policy

**Version:** 1.9
**Effective Date:** December 12, 2025
**Last Updated:** August 6, 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Information We Collect](#2-information-we-collect)
3. [How We Use Your Information](#3-how-we-use-your-information)
4. [Data Storage & Security](#4-data-storage--security)
   - [4.1 Local-First Architecture](#41-local-first-architecture)
   - [4.2 Optional Settings Backup](#42-optional-settings-backup)
   - [4.3 Security Measures](#43-security-measures)
   - [4.4 Breach Notification](#44-breach-notification)
5. [Data Sharing & Third Parties](#5-data-sharing--third-parties)
   - [5.1 Service Providers](#51-service-providers)
   - [5.2 Analytics](#52-analytics)
   - [5.3 No Sale or Sharing of Personal Information](#53-no-sale-or-sharing-of-personal-information)
6. [Your Privacy Rights](#6-your-privacy-rights)
7. [Data Retention](#7-data-retention)
8. [Children's Privacy](#8-childrens-privacy)
9. [International Users](#9-international-users)
10. [Changes to This Policy](#10-changes-to-this-policy)
11. [Contact Us](#11-contact-us)

---

## 1. Introduction

Being ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our mobile application and website (collectively, "Services").

**Our Privacy Philosophy:**

- **Local-First:** Your mental health data stays on your device by default
- **Never Sold:** We will never sell your personal information to third parties
- **Strong Security:** We use AES-256 encryption to protect your data
- **You're in Control:** Export or delete your data at any time

---

## 2. Information We Collect

### 2.1 Information You Provide

- **Check-In Data:** Daily mindfulness check-ins, mood tracking, journal entries
- **Wellness Assessments:** PHQ-9 and GAD-7 responses and scores (for self-monitoring, not clinical diagnosis)
- **Emergency Contacts:** Contact information for crisis support (stored locally only)
- **Voice Reflections:** If you choose to speak a reflection rather than type it, your device's microphone captures audio for the sole purpose of transcribing it into text. Transcription runs entirely on your device — Being will not begin recording unless your device confirms it can transcribe without using the network. The audio is discarded as soon as transcription completes; only the resulting text is saved, encrypted, on your device. No audio and no transcript is sent to Being, to Palouse Labs, or to any third party.

### 2.2 Automatically Collected Information

- **Device Information:** Device type, OS version (for app compatibility)
- **Usage Data:** App usage patterns, feature engagement (anonymized)
- **Technical Data:** Crash reports, performance data (no personal info included)

### 2.3 Information We Do NOT Collect

- Location data or GPS tracking
- Contacts or address book access
- Camera or photo library access
- Audio recordings — if you speak a reflection, the recording is transcribed on your device and then discarded. We never receive, transmit, or store audio (see 2.1)
- Third-party advertising identifiers

---

## 3. How We Use Your Information

We use your information solely to provide and improve the Being app:

- **Core Functionality:** Enable mindfulness check-ins, mood tracking, and progress visualization
- **Wellness Tools:** Calculate PHQ-9 and GAD-7 scores for self-monitoring, recommend crisis resources when wellness screening thresholds are reached
- **Safety Features:** Provide crisis support resources when wellness screening thresholds are met. When a PHQ-9 score of 20 or higher, a non-zero PHQ-9 Q9 (self-harm) response, or a GAD-7 score of 15 or higher is detected, Being also records an aggregate, PII-free crisis-detection event to our own first-party secure storage (Supabase). This recording happens under a vital-interests basis and is **not** gated on your analytics consent — crisis-safety monitoring is not something you can inadvertently disable. The event contains only a category label, a severity bucket, whether an intervention was surfaced, and the assessment type — **no** raw score, no Q9 value, no device identifier, and nothing that identifies you.
- **App Improvement:** Analyze anonymized usage patterns to improve user experience
- **Technical Support:** Debug issues, provide customer support
- **Legal Compliance:** Comply with applicable laws and regulations

> **We will NEVER:** Use your data for advertising, sell your information to third parties, or train AI models on your mental health data.

---

## 4. Data Storage & Security

### 4.1 Local-First Architecture

All your mental health data is stored locally on your device by default. We use AES-256 encryption to protect your data at rest.

To keep any data that does reach our servers (optional settings backup; the PII-free crisis-detection event described in §3) isolated to you and to you alone, the app creates — at startup — an **anonymous account identifier** with our database provider (Supabase). This identifier is a randomly generated value — it contains **no** email address, name, phone number, or other personal information, and you are never asked to sign in. It exists only to enforce that one device's data cannot be read by another. It is removed when you delete your account or data (§7.4).

### 4.2 Optional Settings Backup

You may optionally enable an encrypted settings backup. This is a narrow, opt-in feature that backs up a small set of non-wellness app preferences (such as autosave configuration and last-sync timestamps) to encrypted cloud storage. It does **not** back up your mental-health data — PHQ-9 / GAD-7 responses, mood check-ins, journal entries, and crisis records always stay on your device. Settings backups are:

- Encrypted in transit (TLS 1.2+) and at rest (AES-256) on Supabase infrastructure (SOC 2 Type II certified)
- Scoped to a strict allowlist of non-sensitive preference fields
- Deletable at any time from in-app *Settings → Privacy & Data*

### 4.3 Security Measures

- AES-256 encryption for data at rest
- TLS 1.2+ encryption for data in transit
- Regular security audits and penetration testing
- Limited employee access to encrypted data
- A documented Data Protection Impact Assessment covering our processing of sensitive wellness data is maintained as an internal compliance artifact in accordance with applicable state privacy laws

### 4.4 Breach Notification

In the unlikely event of a breach affecting your wellness or mental-health information, Being will notify affected users without unreasonable delay, and in no case later than 60 calendar days after discovery, in accordance with the Federal Trade Commission's Health Breach Notification Rule (16 CFR Part 318).

Notifications will include:

- A description of what happened and when it was discovered
- The types of information involved
- Steps you can take to protect yourself
- What we are doing to investigate the breach and prevent recurrence
- How to contact us for more information

Notifications will be delivered by prominent in-app notice. (Being does not collect email addresses in v1, so email notifications are not available; if email collection is introduced in a future release, this section will be updated accordingly.)

---

## 5. Data Sharing & Third Parties

**We do not sell your personal information.** We only share data in the following limited circumstances:

- **With Your Explicit Consent:** If you choose to export and share your data with healthcare providers
- **Legal Requirements:** When required by law, court order, or to protect rights and safety
- **Business Transfers:** In the event of merger/acquisition (your privacy rights remain protected)

### 5.1 Service Providers

We use the following third-party service providers to operate our Services:

- **[Supabase](https://supabase.com/privacy):** Database, authentication, and cloud storage (SOC 2 Type II certified, US data region). If you enable optional settings backup, your encrypted preference data is stored on Supabase infrastructure.
- **[PostHog](https://posthog.com/privacy):** Product analytics (EU data residency, Frankfurt). See Section 5.2 for details.
- **[Notion](https://www.notion.so/privacy):** Waitlist email storage for the being.fyi marketing website. When you submit your email via the pre-launch waitlist form, we store it (along with your A/B variant assignment, where applicable) in an internal Notion database. We do not transfer mental-health data, app usage, or any other personal data to Notion.
- **[Sentry](https://sentry.io/privacy/):** Crash, error, and performance diagnostics. Error event payloads are scrubbed of wellness data before transmission — no PHQ-9 / GAD-7 responses or scores, and no journal content are sent. Sentry also receives standard app-session diagnostics (session start/end, app version, crash status) used to measure app stability across releases; these session records include a random identifier generated per app installation by our mobile framework. This identifier is not linked to your account, your wellness data, or any other personal information we hold, and is not used to identify you or to track you across apps or websites.
- **[Resend](https://resend.com/legal/privacy-policy):** Transactional email delivery for internal operational alerts only — for example, automated notifications to our operators about the health of the crisis-detection pipeline. These alerts contain aggregate, non-personal operational data; no user personal data is sent to Resend.
- **[healthchecks.io](https://healthchecks.io/privacy/):** Uptime monitoring for our own internal scheduled jobs. Our servers send a periodic signal to healthchecks.io confirming that a maintenance job ran; if the signal stops arriving, healthchecks.io notifies our operators. The signal is an empty request carrying no message content — no account identifier, no wellness data, and nothing about you. Only the fact and time of the request are recorded. ("Health" in the provider's name refers to the health of our servers, not to health information.)
- **Expo:** Mobile app framework and over-the-air updates
- **Apple/Google:** App distribution and in-app purchases (no health data shared)

All service providers are contractually bound to protect your data and may only use it to provide services to us.

> **No Advertising Partners:** We do not share data with advertising networks, data brokers, or marketing platforms. Ever.

### 5.2 Analytics

Being uses PostHog (EU data residency, Frankfurt) for product analytics. We use it on two separate surfaces with different defaults: the **mobile app** (opt-in) and the **marketing website** at being.fyi (opt-out, GPC-honored).

#### Mobile app: opt-in only

**Analytics is OFF by default in the app and requires your explicit opt-in.**

What we collect (when opted in):

- Screen views and navigation patterns
- Feature usage counts (e.g., "check-in completed")
- App performance metrics
- Session duration
- Device type and OS version

What we **NEVER** collect in-app:

- Assessment scores (PHQ-9, GAD-7)
- Mood check-in values or notes
- Journal entries
- Crisis contact information
- Any mental health data

Your control:

- Analytics is **OFF by default**
- Opt-in via Settings > Privacy > Analytics
- Request deletion via Settings > Privacy > Delete Analytics Data

**Note on crisis-safety recording:** The analytics opt-in above controls what is sent to PostHog. It does **not** control the separate crisis-detection event described in §3 (Safety Features), which is recorded to Being's own first-party storage under a vital-interests basis and is not suppressible by analytics opt-out or universal opt-out. That event contains no raw scores and no identifying information — only aggregate category labels.

#### Marketing website (being.fyi): opt-out, GPC-honored

The marketing site uses PostHog for aggregate visitor measurement, scoped tightly:

- **Pageviews** (path, referrer, UTM parameters)
- **Waitlist signup events** (submission success, submission failure with reason)

What we **NEVER** do on the website:

- Autocapture (we do not record all clicks, form keystrokes, or DOM interactions)
- Session replay (we do not record video of your sessions)
- Heatmaps, surveys, or behavioral profiling
- Transmit raw email addresses or any other personally identifying information to PostHog

**Global Privacy Control (GPC) hard kill:** if your browser sends `Sec-GPC: 1` (Brave, DuckDuckGo, Firefox with an extension, etc.), PostHog does not load, no analytics cookie is set, and no event is transmitted. This is structurally enforced server-side and is independent of any in-app preference.

The website's reduced collection scope and GPC honoring is what allows opt-out-default on the web surface while preserving opt-in-only for the app. Both surfaces share the same data residency (EU, Frankfurt) and the same vendor.

**Data Residency:** EU (Frankfurt, Germany)

**Third Party:** [PostHog Inc.](https://posthog.com/privacy)

### 5.3 No Sale or Sharing of Personal Information

**Being does not sell or share your personal information.** Under the California Consumer Privacy Act (CCPA/CPRA), "sale" means disclosing personal information to a third party for monetary or other valuable consideration, and "sharing" means disclosing personal information for cross-context behavioral advertising. Being does neither.

In accordance with CCPA §1798.135(b)(1), we satisfy our opt-out obligation by publishing this notice in our privacy policy in lieu of maintaining a separate "Do Not Sell or Share My Personal Information" link.

**Global Privacy Control (GPC) and Universal Opt-Out:** Being honors universal opt-out signals as required under CCPA, the Texas Data Privacy and Security Act (TDPSA), the Colorado Privacy Act (CPA), and the Connecticut Data Privacy Act (CTDPA). In the app, you can enable *Settings → Privacy & Data → Honor Universal Opt-Out*, which immediately suppresses all non-essential analytics, crash reporting, settings backup, and research participation regardless of any granular consent previously granted — the in-app equivalent of a GPC signal. On the web, our privacy and support pages at `being.fyi` honor the `Sec-GPC: 1` request header sent by browsers and extensions implementing the Global Privacy Control specification. *(Web-side detection is rolling out and tracked separately; the in-app universal opt-out is live as of v1.3 of this policy.)*

To submit a formal opt-out request by email, write to [privacy@being.fyi](mailto:privacy@being.fyi) with the subject line "Do Not Sell or Share My Personal Information." We will confirm receipt and document your request.

For complete California privacy rights, see our [California Privacy Rights](/privacy/california) page. For Texas, Colorado, Connecticut, and Virginia rights, see our [Multi-State Privacy Rights](/privacy/multi-state) page.

---

## 6. Your Privacy Rights

You have the following rights regarding your personal information:

- **Access:** Request a copy of your data at any time
- **Correction:** Update or correct your information
- **Deletion:** Delete all of your in-app and backed-up data
- **Export:** Download your data in portable JSON format
- **Opt-Out:** Disable settings backup, analytics, or crash reporting

To exercise these rights, email [privacy@being.fyi](mailto:privacy@being.fyi) or use the in-app settings.

---

## 7. Data Retention

We retain your information as follows:

### 7.1 General Wellness Data (90 Days)

- **Daily Check-Ins:** Mood logs, mindfulness completions
- **Principle Engagements:** Stoic practice progress tracking
- **Non-Crisis Assessments:** PHQ-9 and GAD-7 results below crisis thresholds
- **Server-Side Product Analytics:** If you opt in to analytics, the usage events sent to our servers (see §2)

This data is automatically deleted after 90 days to minimize data collection while still enabling meaningful progress tracking.

### 7.2 Crisis-Related Data (3 Years)

For your safety and our liability protection, we retain crisis-related data for 3 years:

- **High-Severity Assessments:** PHQ-9 scores ≥ 20, GAD-7 scores ≥ 15
- **Suicidal Ideation Responses:** Any non-zero response to PHQ-9 question 9
- **Crisis Detection Events:** An aggregate, PII-free record of when a crisis threshold was detected and support resources were surfaced (see §3, Safety Features) — this records that a threshold was met and resources were shown, not whether you tapped through to 988 or another resource

This extended retention supports safety-monitoring continuity and protects both you and us in case of legal proceedings.

**Where this data lives, and what enforces the limit:** High-Severity Assessments and Suicidal Ideation Responses never leave your device — an automated on-device cleanup removes them 3 years after they are recorded. Crisis Detection Events are the only crisis-related records held on our servers; an automated daily job deletes them 3 years after they are recorded. All other analytics events on our servers are deleted after 90 days by the same job.

### 7.3 Other Data

- **Local Data:** Stored on your device until you delete the app or clear data
- **Settings Backup:** Retained until you disable backup or request deletion via in-app *Privacy & Data* settings
- **Data Deletion Requests:** Honored within 30 days of request
- **Audit Logs:** 3 years (for security and compliance)
- **Consent Records:** Retained indefinitely as proof of lawful data processing

### 7.4 Your Right to Delete

You can delete your data at any time in Settings, including crisis-related data. Deletion removes your data both on your device and on our servers: it erases your anonymous account identifier (§4.1), which automatically and permanently deletes every record tied to it (any settings backup, subscription records, and crisis-detection events). We will honor deletion requests within 30 days, though we may retain anonymized records for legal compliance.

---

## 8. Children's Privacy

Being is intended for users age 18 and older. We do not knowingly collect personal information from children under 18. If you believe we have inadvertently collected data from a minor, please contact us immediately at [privacy@being.fyi](mailto:privacy@being.fyi).

---

## 9. International Users

Being is based in the United States. If you access our Services from outside the U.S., your data may be transferred to and processed in the U.S. or other countries where our service providers operate.

**GDPR Compliance:** For European users, we comply with GDPR requirements, including data portability, right to erasure, and lawful processing bases.

---

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of material changes via in-app notification. Your continued use of Being after changes take effect constitutes acceptance of the updated policy.

**Recent revisions**

- **v1.9 (August 6, 2026):** Clarified §7.1 and §7.2 to state where each category of retained data lives and what enforces its time limit. The stated retention periods are unchanged — 90 days for general wellness and analytics data, 3 years for crisis-related data. §7.1 now explicitly names server-side product analytics, which the 90-day period already covered but did not list.

---

## 11. Contact Us

If you have questions about this Privacy Policy or our privacy practices:

**Email:** [privacy@being.fyi](mailto:privacy@being.fyi)

**Mailing Address (GDPR inquiries):**
Palouse Labs LLC
522 W Riverside Ave, Ste N
Spokane, WA 99201

---

*Being is a wellness app, not a healthcare provider. We adopt strong privacy practices as a commitment to our users.*
