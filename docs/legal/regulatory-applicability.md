# Regulatory Applicability & Compliance Source of Truth

**Version:** 1.5  
**Effective Date:** December 26, 2025  
**Last Updated:** October 24, 2026  
**Authority:** This document is the authoritative reference for regulatory compliance decisions.

---

## Document Purpose

This document defines which laws, regulations, and standards apply to Being and which do not. All agents, developers, and documentation must reference this document when making compliance-related decisions.

**Use this document to:**
- Determine regulatory applicability before implementing features
- Understand the legal basis for security and privacy decisions
- Avoid incorrect regulatory claims in code, documentation, or user-facing content
- Guide architectural decisions that have compliance implications

---

## What Being IS

Being is a **consumer wellness application** that provides:
- Stoic philosophy education and mindfulness practices
- Self-monitoring mood tracking and journaling
- Wellness screening tools (PHQ-9, GAD-7) for personal awareness
- Crisis resources, with direct access to 988, the Crisis Text Line and 911
- Progress visualization and personal insights

**Key Characteristics:**
- Local-first data storage (user's device)
- Optional encrypted cloud backup
- No clinician-patient relationship
- No diagnosis, treatment, or medical advice
- No insurance billing or claims
- No prescription or medication management

---

## What Being IS NOT

| Being IS NOT | Why This Matters |
|--------------|------------------|
| A healthcare provider | No HIPAA covered entity status |
| A medical device | No FDA regulation |
| A clinical tool | Assessments are self-monitoring, not clinical diagnosis |
| A telehealth platform | No provider-patient communication |
| A health insurance portal | No insurance transactions |
| A pharmacy or prescription service | No medication handling |

---

## Regulations That DO Apply

### 1. Federal Trade Commission (FTC) Regulations

| Regulation | Applicability | Requirements |
|------------|---------------|--------------|
| **FTC Act Section 5** | Applies | Prohibits unfair or deceptive practices; we must honor privacy promises made to users |
| **FTC Health Breach Notification Rule** | Applies | Requires notification if unsecured health information is breached (applies to non-HIPAA entities handling health data) |

**Compliance Approach:** Honor all privacy commitments in our Privacy Policy. Implement breach notification procedures per FTC requirements.

### 2. State Privacy Laws

As of 2025, 20 US states have comprehensive consumer privacy laws. The following are most relevant to Being:

| Law | State | Effective | Key Requirements |
|-----|-------|-----------|------------------|
| **CCPA/CPRA** | California | 2020/2023 | Right to know, delete, opt-out; privacy notice requirements |
| **TDPSA** | Texas | July 2024 | Consumer rights, universal opt-out (Jan 2025), no revenue threshold |
| **VCDPA** | Virginia | 2023 | Consumer data rights similar to CCPA |
| **CPA** | Colorado | 2023 | Consumer opt-out rights, data protection assessments |
| **CTDPA** | Connecticut | 2023 | Consumer rights, data protection assessments |

**States without comprehensive privacy law:** New York (only sector-specific health privacy law S929 as of Jan 2025, plus NY SHIELD Act for data security).

**Compliance Approach:** Provide data access, deletion, and export features. Maintain transparent privacy notices. Honor universal opt-out mechanisms (including Global Privacy Control signals). See `california-privacy.md` and the "No Sale or Sharing of Personal Information" section of `privacy-policy.md`.

**Sensitive-data processing assessment.** TDPSA (Tex. Bus. & Com. Code §541.105(a)), CPA (C.R.S. §6-1-1309), VCDPA (Va. Code §59.1-580), and CTDPA (Conn. Pub. Act 22-15 §6) each require a documented data protection assessment for processing of sensitive personal information — including mental health condition data. See [`dpia-sensitive-wellness-data.md`](dpia-sensitive-wellness-data.md) for the assessment covering Being's processing of PHQ-9, GAD-7, mood check-ins, journal entries, consent records, and subscription metadata.

### 2a. Consumer Health Data Laws (WA MHMDA, NV SB 370, CT)

**Status: APPLIES. Not compliant: open gaps below (DEBUG-793, 2026-10-19).** Remedy (B), minimise, was chosen and shipped in DEBUG-821 (v1.4). Gap 5 is closed in the data model by INFRA-861 (v1.5), pending counsel. Gaps 1 and 4, and gap 2's residual, stay open or are accepted pending counsel, so this section still does not record compliance. Statute citations are to be confirmed by counsel.

| Law | Citation (to be confirmed by counsel) | Threshold |
|-----|---------------------------------------|-----------|
| **My Health My Data Act** | Washington, RCW 19.373 | None (no revenue or volume threshold) |
| **SB 370 consumer health data** | Nevada, NRS 603A | None |
| **Consumer health data provisions** | Connecticut (CTDPA as amended) | None |

**Why it applies.** PostHog product events sent with *Usage Analytics* on include `crisis_resources_viewed`, `crisis_hotline_tapped` and `assessment_started` / `assessment_completed`. They are keyed to an install-persistent identifier (`distinct_id`) and carry city-level GeoIP (DPIA v2.42). These laws define personal information to include data tied to a persistent unique identifier such as a device ID. Their "health care services" covers services to assess, measure, improve or learn about mental health, which takes in PHQ-9 / GAD-7 self-screening and the 988 crisis line. Their consumer health data covers data identifying a consumer seeking such services, including inferences drawn from non-health data. A conservative reading also covers `check_in_*`, `practice_*` and `guidance_opened`, because the whole app is a mental-wellness service. Being is a Palouse Labs LLC product and the Terms of Service pick Washington law. **Updated v1.4 (DEBUG-821):** from the next app release, `crisis_resources_viewed`, `crisis_hotline_tapped`, the `assessment_*` pair and `guidance_opened` are no longer sent, and screen views of the crisis, screening, journal, guidance and screening-history screens are dropped rather than coarsened. Earlier installs keep sending them until updated; as of 2026-10-08 the only such installs are the founder's. The conservative reading still reaches the `check_in_*`, `practice_*` and `learn_*` events that remain.

**What this reverses.** The "access is not the finding" ruling in `docs/architecture/analytics-architecture.md` (and the DPIA v2.11 ACCESS/CONTENT distinction) assumed these access signals were unlinkable. They are not: every event carries the persistent `distinct_id` and city.

**Open gaps** (dispositions as of v1.4, DEBUG-821; gap 5 updated v1.5, INFRA-861):
1. No separate Consumer Health Data Privacy Policy is linked from the being.fyi homepage (website repo). **Accepted with reason, pending counsel:** after minimisation the remaining events are consumer health data only on the conservative reading. The page is tracked as MAINT-862.
2. The Analytics opt-in (`consentDetails.ts`) lacks the MHMDA consent elements: the named consumer-health-data categories, purpose, sources, and how to withdraw. **Closed for the screening and support signal:** no screening, support-resource, crisis-line, guidance or screening-history signal reaches PostHog. The opt-in copy still lists screenings and support resources, which over-discloses until MAINT-866. **Residual, accepted with reason pending counsel:** no MHMDA-specific consent was built for the `check_in_*`, `practice_*` and `learn_*` events.
3. Account erasure resets the PostHog identity but does not delete PostHog events, so `privacy-policy.md` §7.4 ("removes your data … on our servers") is untrue for PostHog. **Closed in the text:** privacy-policy v1.27 §7.4 states that in-app deletion does not delete events already sent. The events already stored are removed by DEBUG-820's purge (pending, after the release). Deleting PostHog events on erasure is FEAT-863.
4. The PostHog processor contract is unconfirmed. **Open** until the founder records the PostHog DPA version and date (MAINT-864).
5. The Supabase Crisis Detection Event (`crisis_detected`) carries `user_id` = `auth.uid()`, a persistent identifier. It is collected without consent under vital interests, which MHMDA does not recognise outside "necessary to provide the requested service". `privacy-policy.md` §3 also says it contains "nothing that identifies you", which conflicts with §7.4. This is recorded open, not assessed and cleared. **Updated v1.3 (DEBUG-850, 2026-10-23):** the §3 wording is corrected in privacy-policy v1.25. The finding is also stronger than first recorded: `user_id` joins `auth.sessions.ip` / `user_agent`, the latest connection's IP address and user agent, so the event is linkable to a network address. The MHMDA remedy itself remains open with DEBUG-821. **Accepted with reason v1.4, TIME-BOXED:** DEBUG-821 did not change this event. The acceptance lapses at the first external tester (no real users as of 2026-10-08); before then the event is de-linked from `auth.uid()` under INFRA-861, or this gap is re-ruled. **Closed in the data model v1.5 (INFRA-861, 2026-10-24), pending counsel.** `supabase/migrations/20261024000000_infra861_crisis_delink.sql` makes the table enforce the de-link for every role: a BEFORE INSERT trigger sets `user_id` and `session_id` to NULL, truncates `created_at` to the UTC day and rebuilds `properties` from five allowlisted keys, and CHECK constraints hold that shape for every role, service_role and UPDATE included. The app delivers the event without a user token, and the crisis path no longer creates the random account ID. Authenticated crisis inserts are closed. Crisis rows recorded before the change were deleted by the same migration, behind a guard that refuses the push if any identity carries an email or phone. Crisis rows are kept 90 days from receipt. The privacy policy (v1.32) no longer describes the event as linked to the random account ID, and states that it cannot be deleted on request because it carries no account or session identifier, so we cannot tell which records are whose. **Open for counsel, not closed by us:** (a) whether the rows meet MHMDA's deidentified-data definition (RCW 19.373.010, to be confirmed) given that Supabase request logs keep the connecting IP address and a timestamp for 1 day, and given a small, known tester cohort; (b) whether that collection-time IP address makes the collection itself consumer health data that needs consent or the "necessary to provide the requested service" exception. If counsel rules either way against us, this gap reopens. See `dpia-sensitive-wellness-data.md` §9 v2.65 and `lia-crisis-telemetry.md` §5.

**Remedy: a founder decision, tracked in DEBUG-821.** (A) build MHMDA compliance (CHD policy page, MHMDA-specific consent copy with a CONSENT_VERSION bump, erasure propagated to PostHog, processor contract), or (B) minimise (drop or de-link these events from PostHog, or disable GeoIP). See `dpia-sensitive-wellness-data.md` §9 v2.52. **Decided v1.4: (B), founder decision 2026-10-23.** The events are dropped rather than de-linked, every capture opts out of GeoIP (`$geoip_disable`), and the founder disables the project's GeoIP transformation. See `dpia-sensitive-wellness-data.md` §9 v2.60.

### 3. International Privacy Laws

| Law | Applicability | Key Requirements |
|-----|---------------|------------------|
| **GDPR (EU/EEA users)** | Applies if serving EU users | Lawful processing basis, data subject rights, data protection by design |

**Compliance Approach:** EU analytics data residency (Frankfurt), data portability, right to erasure.

### 4. App Store Requirements

| Platform | Requirements | Documentation |
|----------|--------------|---------------|
| **Apple App Privacy** | Privacy nutrition labels, App Tracking Transparency | `ios-privacy-manifest.md` |
| **Google Play Data Safety** | Data safety section, privacy policy requirements | Privacy Policy |

**Compliance Approach:** Complete and accurate privacy disclosures in app store listings.

### 5. General Consumer Protection

| Requirement | Source | Application |
|-------------|--------|-------------|
| Accurate advertising | FTC, state laws | Marketing claims must be truthful |
| Terms of service | Contract law | Enforceable user agreements |
| Age restrictions | COPPA (if under 13), general | 18+ age requirement |

---

## Regulations That DO NOT Apply

### HIPAA (Health Insurance Portability and Accountability Act)

**Status: DOES NOT APPLY**

**Reasoning:**
HIPAA applies only to "covered entities" and their "business associates." Covered entities are:
1. Health plans (insurance companies)
2. Healthcare clearinghouses
3. Healthcare providers who transmit health information electronically in connection with covered transactions

**Being does not meet any of these criteria because:**
- We are not a health plan
- We are not a healthcare clearinghouse  
- We are not a healthcare provider (we do not provide medical care, diagnosis, or treatment)
- We do not bill insurance or conduct covered transactions
- We do not create, receive, or transmit Protected Health Information (PHI) on behalf of a covered entity

**PHQ-9 and GAD-7 Note:** These standardized questionnaires are in the public domain. Their presence in a consumer app does not trigger HIPAA. They are used for self-monitoring wellness screening, not clinical assessment or diagnosis. Results are not shared with healthcare providers through Being (users may voluntarily export and share).

**Important:** Do not claim HIPAA compliance in code comments, documentation, or user-facing materials. Instead, reference our voluntary security standards and privacy commitments.

### FDA Medical Device Regulations

**Status: DOES NOT APPLY**

**Reasoning:**
The FDA regulates medical devices, including certain software (Software as a Medical Device, SaMD). Being does not meet the FDA's definition of a medical device because:

1. **No diagnosis, treatment, or prevention claims:** Being explicitly disclaims medical advice and does not claim to diagnose, treat, cure, or prevent any disease or condition
2. **Wellness exception:** FDA exercises enforcement discretion for general wellness products that make only general wellness claims
3. **No clinical decision support:** Being does not provide recommendations that healthcare providers use for diagnosis or treatment

**PHQ-9 and GAD-7 Note:** These tools are used for personal self-monitoring and awareness, not clinical assessment. We explicitly state they are not diagnostic tools and encourage users with concerning scores to consult healthcare providers.

See: `medical-disclaimer.md` for user-facing disclaimers.

### HIPAA Business Associate Requirements

**Status: DOES NOT APPLY**

**Reasoning:**
A Business Associate is an entity that handles PHI on behalf of a covered entity. Since Being:
- Does not receive PHI from healthcare providers
- Does not transmit data to healthcare providers through the app
- Does not have BAA agreements with healthcare entities

We are not a Business Associate.

**Note:** If users voluntarily export their data and share with a healthcare provider, that sharing happens outside our systems and does not create a BA relationship.

### 42 CFR Part 2 (Substance Abuse Records)

**Status: DOES NOT APPLY**

**Reasoning:**
These regulations apply to federally-assisted substance abuse treatment programs. Being is not a treatment program and does not receive federal assistance for substance abuse services.

---

## Voluntary Security Standards

While not legally required, Being voluntarily implements security measures that meet or exceed industry standards:

| Standard | Implementation | Rationale |
|----------|----------------|-----------|
| **AES-256-GCM encryption** | All sensitive data at rest | User trust; mental health data sensitivity |
| **TLS 1.2+** | All network transmission | Industry standard; user protection |
| **OWASP Mobile Security** | Development practices | Best practice; vulnerability prevention |
| **NIST encryption guidelines** | Key management | Federal standard for strong encryption |
| **iOS Security Guide / Android Security Framework** | Platform integration | Native security feature utilization |

**Why Voluntary Standards?**
We implement strong security because it's the right thing to do for users entrusting us with sensitive mental health information—not because regulations require it. This distinction matters for accurate compliance documentation.

---

## Guidance for Agents and Developers

### DO

- Reference this document when planning compliance-related features
- Use accurate terminology: "wellness app," "self-monitoring," "personal awareness"
- Implement FTC-compliant privacy practices
- Honor state privacy law requirements (access, deletion, portability)
- Maintain accurate app store privacy disclosures
- Describe security as "voluntary best practices" or "user protection measures"

### DO NOT

- Claim HIPAA compliance or reference HIPAA in code/docs
- Describe Being as a healthcare provider or clinical tool
- Claim PHQ-9/GAD-7 provide clinical diagnosis
- Reference FDA approval or medical device compliance
- Imply BAA (Business Associate Agreement) requirements
- Over-promise regulatory compliance we don't have

### Correct Terminology

| Instead of | Use |
|------------|-----|
| "HIPAA-compliant encryption" | "AES-256 encryption" or "bank-level encryption" |
| "PHI protection" | "Mental health data protection" or "wellness data protection" |
| "Clinical assessment" | "Wellness screening" or "self-monitoring tool" |
| "Patient data" | "User data" or "personal wellness data" |
| "Medical records" | "Wellness records" or "check-in history" |
| "HIPAA security rule" | "Security best practices" or "industry-standard security" |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `privacy-policy.md` | User-facing privacy commitments |
| `medical-disclaimer.md` | Medical/clinical disclaimers |
| `california-privacy.md` | CCPA-specific disclosures |
| `terms-of-service.md` | User agreement |
| `dpia-sensitive-wellness-data.md` | Documented data protection assessment for sensitive wellness data processing (TDPSA, CPA, VCDPA, CTDPA) — internal/regulator-facing |
| `/docs/security/security-architecture.md` | Technical security implementation |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-26 | Initial document creation |
| 1.5 | 2026-10-24 | INFRA-861: §2a gap 5 is closed in the data model, pending counsel. `crisis_detected` rows carry no `user_id` or `session_id`, `created_at` is truncated to the UTC day, the table enforces both for every role, the app sends the event without a user token and no longer creates the random account ID for it, and pre-change crisis rows were deleted. Two counsel questions are recorded on the gap. Gaps 1 and 4, and gap 2's residual, are unchanged, so compliance is still not recorded. See `dpia-sensitive-wellness-data.md` §9 v2.65. |
| 1.4 | 2026-10-23 | DEBUG-821: §2a records remedy (B), minimise. The crisis-access, screening, guidance and screening-history signals no longer reach PostHog and every capture opts out of GeoIP. Each gap gets a disposition: 1 accepted pending counsel (MAINT-862), 2 closed for that signal with the remaining events accepted pending counsel, 3 closed in the policy text with the purge pending (DEBUG-820, FEAT-863), 4 open (MAINT-864), 5 accepted until the first external tester (INFRA-861). Compliance is not recorded. See `dpia-sensitive-wellness-data.md` §9 v2.60. |
| 1.3 | 2026-10-23 | DEBUG-850: §2a gap 5 updated. Privacy-policy v1.25 corrects the §3 "nothing that identifies you" wording, and the gap now records that `user_id` joins the Supabase Auth session's IP address and user agent. The MHMDA remedy stays open with DEBUG-821. |
| 1.2 | 2026-10-19 | DEBUG-793: new §2a. WA MHMDA, Nevada SB 370 and Connecticut consumer-health-data provisions APPLY to the PostHog crisis-access and assessment events (persistent identifier plus city GeoIP). Five open gaps are listed, and the remedy is a founder decision (DEBUG-821). The analytics-architecture.md "access is not the finding" ruling is reversed. See `dpia-sensitive-wellness-data.md` §9 v2.52. |
| 1.1 | 2026-09-13 | DEBUG-608: "What Being IS" no longer lists emergency contact access, and the sensitive-data assessment summary no longer lists crisis safety plans. Being never collected either: the safety-plan screen and store were deleted before the first external distribution. Crisis access is to 988, the Crisis Text Line and 911. See `dpia-sensitive-wellness-data.md` §9 v2.14. |

---

## Questions?

For compliance questions, contact [legal@being.fyi](mailto:legal@being.fyi)

---

*This document is authoritative for regulatory applicability decisions within the Being codebase and documentation.*
