# Privacy Policy

**Version:** 1.25
**Effective Date:** December 12, 2025
**Last Updated:** October 22, 2026

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
- **Voice Reflections:** If you choose to speak a reflection rather than type it, your device's microphone captures audio for the sole purpose of transcribing it into text. Transcription runs entirely on your device — Being will not begin recording unless your device confirms it can transcribe without using the network. The audio is discarded as soon as transcription completes; only the resulting text is saved, encrypted, on your device. No audio and no transcript is sent to Being, to Palouse Labs, or to any third party.

### 2.2 Automatically Collected Information

- **Device Information:** Device type, OS version (for app compatibility)
- **Usage Data:** App usage patterns and feature engagement, with a random identifier generated per app installation and approximate location, collected only if you turn on *Usage Analytics* (see Section 5.2)
- **Technical Data:** Crash reports and app-stability diagnostics, including identifiers generated for this installation of the app and approximate location (see Section 5.1), collected only if you turn on *Crash Reports* (off by default) and *Honor Universal Opt-Out* is off

### 2.3 Information We Do NOT Collect

- Precise location or GPS tracking (Section 5 describes the approximate, city-level location our service providers estimate)
- Contacts or address book access
- Camera or photo library access
- Audio recordings — if you speak a reflection, the recording is transcribed on your device and then discarded. We never receive, transmit, or store audio (see 2.1)
- Third-party advertising identifiers

---

## 3. How We Use Your Information

We use your information solely to provide and improve the Being app:

- **Core Functionality:** Enable mindfulness check-ins, mood tracking, and progress visualization
- **Wellness Tools:** Calculate PHQ-9 and GAD-7 scores for self-monitoring, recommend crisis resources when wellness screening thresholds are reached
- **Safety Features:** Provide crisis support resources when wellness screening thresholds are met. When a PHQ-9 score of 20 or higher, a non-zero PHQ-9 Q9 (self-harm) response, or a GAD-7 score of 15 or higher is detected, Being also records an aggregate, PII-free crisis-detection event to our own first-party secure storage (Supabase). This recording happens under a vital-interests basis and is **not** gated on your analytics consent — crisis-safety monitoring is not something you can inadvertently disable. The event contains only a category label, a severity bucket, whether an intervention was surfaced, the assessment type, and the calendar day the detection happened — **no** raw score, no Q9 value, no time of day, no device identifier, and nothing that identifies you. The detection day is recorded so that a detection made while your device is offline is counted on the day it actually happened rather than the day your device next reconnects. It is a date only, never a clock time.
- **App Improvement:** Analyze usage patterns to improve user experience
- **Technical Support:** Debug issues, provide customer support
- **Legal Compliance:** Comply with applicable laws and regulations

> **We will NEVER:** Use your data for advertising, sell your information to third parties, or train AI models on your mental health data.

---

## 4. Data Storage & Security

### 4.1 Local-First Architecture

All your mental health data is stored locally on your device by default. We use AES-256 encryption to protect your data at rest.

To keep any data that does reach our servers isolated to you and to you alone, the app creates an **anonymous account identifier** with our database provider (Supabase). It is not created at startup: it is created the first time one is needed — when a crisis-detection event (§3) is recorded, when you use the optional settings backup (§4.2), or when you make or restore a purchase. This identifier is a randomly generated value — it contains **no** email address, name, phone number, or other personal information, and you are never asked to sign in. It exists only to enforce that one device's data cannot be read by another. It is removed when you delete your account or data (§7.4).

**Purchases.** When you make or restore a purchase, the app sends the transaction identifier Apple or Google issued for it (on Android, the purchase token) to our servers, so we can confirm the purchase with the store. We store that identifier against your anonymous account identifier, together with your subscription's plan, status and dates and an encrypted copy of the store's signed transaction record, so the subscription is tied to you and cannot be claimed from another device's account. None of this is wellness data. It is deleted with your account (§7.4).

### 4.2 Optional Settings Backup

You may optionally enable an encrypted settings backup. This is a narrow, opt-in feature that backs up a single non-wellness app preference (your autosave setting) to encrypted cloud storage. It does **not** back up your mental-health data — PHQ-9 / GAD-7 responses, mood check-ins, journal entries, and crisis records always stay on your device. Settings backups are:

- Encrypted in transit (TLS 1.2+) and at rest (AES-256) on Supabase infrastructure (SOC 2 Type II certified)
- Scoped to a strict allowlist of non-sensitive preference fields
- Removed when you delete your data or account (§7.4), which erases every record tied to your anonymous account identifier

Enabling this backup also sends us **operational records of the backup itself** — when a backup or restore ran, whether it succeeded, how long it took and how large it was. These are stored on our servers alongside your anonymous account identifier (§4.1), are retained for 90 days, and contain no wellness data. They exist so we can tell whether the backup feature is working.

### 4.3 Security Measures

- AES-256 encryption for data at rest
- TLS 1.2+ encryption for data in transit
- Automated dependency vulnerability scanning and automated safety and privacy test suites, enforced in continuous integration on every code change
- Being is operated solely by its founder, with no additional employees or staff who access user data
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
- **[Sentry](https://sentry.io/privacy/):** Crash, error, and performance diagnostics, sent only while *Crash Reports* is on (it is off by default) and *Honor Universal Opt-Out* is off; turning either setting off stops them. Error event payloads are scrubbed of wellness data before transmission — no PHQ-9 / GAD-7 responses or scores, and no journal content are sent. Sentry also receives standard app-session diagnostics (session start/end, app version, crash status) used to measure app stability across releases; these session records, and crash and app-freeze reports, include a random identifier generated per app installation by the crash-reporting software built into the app. This identifier is not linked to your account, your wellness data, or any other personal information we hold, and is not used to identify you or to track you across apps or websites. Crash reports also include a device identifier that Sentry derives from an identifier Apple assigns to our apps on your device. Like the installation identifier, it is not linked to your account or wellness data. Sentry also estimates your approximate location (city and country) from your internet connection and stores it with the reports it receives. Your IP address itself is not stored. **Bug reports you send:** if you choose to send a bug report from within the app, the message you type, the general area of the app you were in, and basic technical details such as the app version are sent to Sentry when you tap Send. This happens only when you send a report, and it is not affected by the *Crash Reports* setting or *Honor Universal Opt-Out*, because sending it is your choice to share it. If *Crash Reports* is on, the report also carries device and app details such as the device model, operating system version and app version. It does not carry the installation identifier or the device identifier described above, so it carries no identifier that links it to your crash reports. Whatever the *Crash Reports* setting, Sentry estimates your approximate location from your internet connection, no more precisely than your city and country, and stores it with the report, but not your IP address.
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

- Screen views and navigation patterns, including when you open a check-in, a wellness screening or support resources (never your answers, scores or what you write)
- Feature usage counts (e.g., "check-in completed")
- App performance metrics
- Session duration
- App open patterns (first open vs. return; time since last open, in coarse ranges)
- Device and app details: device model, OS and app version, screen size, language and time zone
- A random identifier generated per app installation. It is not linked to your account, your name or your email
- Your approximate location (city and country), which PostHog estimates from your internet connection. Your IP address itself is not stored

What we **NEVER** collect in-app:

- Your answers to a wellness screening (PHQ-9, GAD-7), your scores, or their severity
- Which screening you took
- Mood check-in values or notes
- Journal entries, or anything else you write or speak in the app
- Which practice you did

**What these events can show.** If you turn on Usage Analytics, analytics records when you open a wellness screening or support resources, and when you tap to call or text a crisis line. These events are tied to the installation identifier and approximate location described above, so they can show that someone using this installation looked for mental-health support. They never include what you answered, scored, wrote or said.

Your control:

- Analytics is **OFF by default**
- Opt-in via **Privacy & Data > Usage Analytics**; turning it off stops collection immediately
- Analytics events on our servers are automatically deleted after 90 days (see §7.2). To request deletion sooner, email privacy@being.fyi — requests are honored within 30 days (see §7.3)

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
- **Export:** Download your data in portable JSON format, or as a readable PDF summary that leaves some of it out
- **Opt-Out:** Disable settings backup, analytics, or crash reporting
- **Withdraw Wellness-Processing Consent:** Decline, or later withdraw, your explicit consent for Being to process your wellness data (mood check-ins, anxiety and depression self-screenings, journal entries). This consent is optional — declining it does not prevent you from using the app — and it can be changed at any time from *Settings → Privacy & Data*. Withdrawing does not by itself delete wellness data already stored on your device; use **Deletion** or **Export** above for that.

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
- **Suicidal Ideation Responses:** Any non-zero response to PHQ-9 question 9 in a check-in you complete
- **Crisis Detection Events:** An aggregate, PII-free record of when a crisis threshold was detected and support resources were surfaced (see §3, Safety Features) — this records that a threshold was met and resources were shown, not whether you tapped through to 988 or another resource

This extended retention supports safety-monitoring continuity and protects both you and us in case of legal proceedings.

**Where this data lives, and what enforces the limit:** High-Severity Assessments and Suicidal Ideation Responses never leave your device — an automated on-device cleanup removes them 3 years after they are recorded. Crisis Detection Events are the only crisis-related records held on our servers; an automated daily job deletes them 3 years after they are recorded. All other analytics events on our servers are deleted after 90 days by the same job.

### 7.3 Other Data

- **Unfinished Check-Ins:** If you leave a PHQ-9 or GAD-7 check-in before finishing it, or the app closes partway through, the answers you gave are not kept. They are deleted on your device no later than the next time you open Being, whatever they were, including any answer to PHQ-9 question 9. If one of those answers led Being to show you crisis support resources, the Crisis Detection Event described in §7.2 is still recorded and kept for 3 years; it does not contain your answers.
- **Local Data:** Stored on your device until you delete the app or clear data
- **Settings Backup:** Retained until you disable backup or request deletion via in-app *Privacy & Data* settings
- **Data Deletion Requests:** Honored within 30 days of request
- **Audit Logs:** 3 years (for security and compliance)
- **Consent Records:** Kept for as long as your account exists, as proof of lawful data processing. When you delete your account they are deleted with it, along with your age check and legal acceptances; only the account-deletion record below is kept.
- **Account-Deletion Record:** 3 years, on your device only. When you delete your account we keep a small confirmation that the deletion happened — the date, the privacy choices that were in effect at that moment, and a count of the consent changes recorded before it. It contains **no identifier of any kind**: nothing that names you, your device, or your account, and nothing that could be used to re-link you to anything you did before. We keep it because we have to be able to show that a deletion request was honored, and it survives the wipe for that reason alone.

### 7.4 Your Right to Delete

You can delete your data at any time in Settings, including crisis-related data. Deletion removes your data both on your device and on our servers: it erases your anonymous account identifier (§4.1), which automatically and permanently deletes every record tied to it (any settings backup, subscription records, and crisis-detection events). We will honor deletion requests within 30 days, though we may retain anonymized records for legal compliance.

Deletion also resets the analytics identity on your device and discards anything queued but not yet sent, so nothing captured before the deletion is transmitted afterward. Your consent, age-check and legal-acceptance records are deleted too. What stays on your device afterward is: the account-deletion record described in §7.3; a marker that records only that the app has been opened on this device before; and some app settings caches that hold no information about you. None of these identifies you. Anyone who uses Being on this device afterward is asked for their own age and consent, starts with an empty consent history, and sees nothing from your account in their data export.

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

- **v1.25 (October 22, 2026):** §6 adds a second export format: a readable PDF summary of the data on your device. It is made on your device and handed to you through your device's share sheet, like the JSON export. Neither file is encrypted or password-protected, so keep it somewhere private. The PDF leaves out voice journal entries, consent records, subscription state, individual screening answers and practice streaks and totals, and says so; the JSON export remains the complete copy of the wellness data on your device. Nothing about what Being collects or shares has changed.
- **v1.24 (October 22, 2026) — material change.** §5.2 said we never collect "any mental health data". That was broader than what happens. With Usage Analytics on, analytics records when you open a wellness screening or support resources and when you tap to call or text a crisis line, tied to an installation identifier and approximate location, so these events can show that someone looked for mental-health support. §5.2 now lists exactly what is never collected (screening answers, scores and severity, which screening you took, mood values, anything you write or speak, which practice you did) and states what these events can show. §2.3 now says we do not collect *precise* location, since §5 already describes approximate, city-level location. Nothing about what is collected has changed; this corrects how it was described. Because it withdraws a broader promise, it is treated as a material change. It does not change the retention described in §7.2.
- **v1.23 (October 22, 2026):** §2.2 now calls the in-app analytics setting *Usage Analytics*, the name it carries in the app and in §5.2. Every backup screen in the app now uses the *Settings Backup* name that §4.2 and §7.3 already use. These are names only: nothing about what is collected changes, so it is published with the next app release.
- **v1.22 (October 18, 2026):** A bug report you send while *Crash Reports* is on no longer carries the installation identifier or the device identifier described in §5.1, so it carries no identifier that links it to your crash reports; §5.1 is updated to match, and now states that Sentry stores an approximate location, no more precise than city and country, with any bug report you send, but not your IP address. Copies of the app installed before this version still attach both identifiers to a bug report sent with *Crash Reports* on, until they are updated. This narrows what is collected and adds no new kind of data, so it is published with the next app release.
- **v1.21 (October 14, 2026):** §5.1 said only Sentry's app-session records include the random identifier generated per app installation. Crash and app-freeze reports include it too, and so does a bug report you send while *Crash Reports* is on, along with device and app details; §5.1 also said nothing else is collected with a bug report. Both are corrected. §5.1 and §2.2 now also say that crash reports include a device identifier Sentry derives from an identifier Apple assigns to our apps on your device, and that Sentry stores an approximate location (city and country) estimated from your internet connection, though not your IP address. Nothing about what is collected has changed, and §2.2 already described crash reports as carrying the identifier.
- **v1.20 (October 14, 2026):** §2.2 and §3 described in-app usage analytics as "anonymized". Each event carries a random identifier generated per app installation, and PostHog estimates an approximate location (city and country) from the connection, so §2.2 and §5.2 now say so and list the device, language and time-zone details that are sent. The in-app control is renamed *Usage Analytics*, and the in-app *Analytics* and *Research Participation* descriptions were corrected the same way; the research setting now says plainly that nothing is collected for research today. This corrects how existing processing is described and adds no new kind of data, so it is published with the next app release.
- **v1.19 (October 12, 2026):** §2.2 said crash reports and app-stability diagnostics include no personal info. They include a random identifier generated per app installation, which Section 5.1 already described, so §2.2 now says so. The in-app *Crash Reports* description was corrected the same way: it no longer calls crash reports "anonymized". This narrows a claim and adds no new kind of data, so it is published with the next app release.
- **v1.18 (October 10, 2026):** Crash reporting now follows your choice. §2.2 and §5.1 said crash reports and app-stability diagnostics are collected, and §5.3 and §6 said you can turn crash reporting off. In practice the app sent crash reports, error reports and app-session diagnostics to Sentry whether or not you had turned *Crash Reports* on. That is corrected: nothing is sent to Sentry for crash or error reporting unless *Crash Reports* is on and *Honor Universal Opt-Out* is off, and turning either off stops it. §5.1 also now describes bug reports you choose to send from the app, which the policy did not mention: they go to Sentry when you tap Send, separately from the *Crash Reports* setting. This narrows what is collected without your permission and adds no new kind of data, so it is published with the next app release rather than separately.

- **v1.17 (October 8, 2026):** §7.2 now says the 3-year retention of answers to PHQ-9 question 9 applies to check-ins you complete, and §7.3 states that answers from an unfinished check-in are deleted on your device no later than the next time you open Being. This shortens how long some data is kept and changes nothing else: crisis detection events, completed check-ins and every other retention period are unchanged. Because it narrows what we keep, it is published with the next app release rather than separately.

- **v1.16 (October 8, 2026):** Correction to §7.3 and §7.4. §7.3 said consent records are retained indefinitely, and §7.4 said the account-deletion record was the one thing kept when you delete your account. In fact your consent, age-check and legal-acceptance records also stayed on your device after deletion. They are now deleted when you delete your account, and §7.3 limits consent-record retention to the life of your account. §7.4 now lists everything that stays on the device after deletion. This reduces what we keep and changes nothing we collect or share, so it is published with the next app release rather than separately.

- **v1.15 (October 5, 2026):** Correction and addition to §4.1. §4.1 said the anonymous account identifier is created at startup, and named only the settings backup and the crisis-detection event as data tied to it. It is not created at startup: it is created the first time it is needed, and making or restoring a purchase is now one of those occasions, alongside a crisis-detection event and the optional settings backup. §4.1 now also discloses what purchase verification sends and keeps: the store's transaction identifier for the purchase, sent to our servers and stored against your anonymous account identifier with your subscription's plan, status and dates and an encrypted copy of the store's signed transaction record. No wellness data is involved, and it is deleted with your account as §7.4 already described for subscription records.

- **v1.14 (September 23, 2026):** Correction. §4.3 listed "Regular security audits and penetration testing" and "Limited employee access to encrypted data" among our security measures. Being has never had a security audit or a penetration test, so the first line described a practice that has not happened; and Being is operated by its founder alone, so the second implied a staff access-control programme that does not exist. They are replaced with what Being actually does, automated dependency vulnerability scanning and automated safety and privacy test suites enforced in continuous integration on every code change, and with a plain statement that no employees or staff access user data. This narrows what §4.3 claims and nothing else: what Being collects, keeps and shares is unchanged, and AES-256 encryption at rest, TLS 1.2+ encryption in transit and the Data Protection Impact Assessment are unaffected. Because the correction narrows a claim rather than changing what we collect, it is published with the next app release rather than separately.

- **v1.13 (September 13, 2026):** Correction. §2.1 listed emergency contacts as information you provide, and §5.2 listed crisis contacts among the things analytics never collects. Being has never offered a way to enter or save personal emergency contacts, so neither entry described anything the app does, and both are removed. This narrows what the policy describes and nothing else: what Being collects, keeps and shares is unchanged, and the crisis resources the app points you to (988, the Crisis Text Line and 911) are unaffected. Because the correction only removes a description of more than we collect, it is published with the next app release rather than separately.

- **v1.12 (September 13, 2026):** §3 now names a fifth field in the crisis-detection event — the calendar day the detection happened. Previously the event was dated by when it reached our server, so a detection made offline was counted on the day the device reconnected. Nothing new is learned about you: the field is a date with no time of day, and it is capped at the day we received the event so a wrong clock on a device cannot place a detection in the future. This is disclosed because §3 previously said the event contained *only* four things, and that list is now five.

- **v1.11 (August 25, 2026):** §7.3 now names the account-deletion record and states its retention (3 years, on-device, no identifier). Nothing about what is kept has changed — the record already existed and already survived erasure — but it was not disclosed, and an undisclosed retention with no stated bound is not a defensible one. §7.4 additionally states that deletion resets the analytics identity and discards anything queued but unsent.

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
