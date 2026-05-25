# Data Protection Impact Assessment — Sensitive Wellness Data

**Document scope:** Internal compliance artifact. Regulator-facing only. Not for public distribution.

---

## 1. Document Control

| Field | Value |
|---|---|
| Document title | Data Protection Impact Assessment — Sensitive Wellness Data |
| Version | 1.0 |
| Effective date | 2026-05-24 |
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
- In-app analytics — severity-bucket aggregates only. No raw screening scores, journal content, or quasi-identifiers are transmitted to analytics.
- Error and crash telemetry via Sentry — payload scrubbing in place per §7.

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

| Purpose | Categories used | Lawful basis (where applicable) |
|---|---|---|
| Wellness self-monitoring — present a user's own screening history and trends to themselves | Wellness screening responses, mood check-ins, journal | User consent; service provision |
| Personal insights — derive aggregated, on-device patterns to support self-reflection | Wellness screening responses, mood check-ins | User consent; service provision |
| Crisis-resource access — surface 988 and personal crisis contacts when self-harm indicators are present | Wellness screening responses (PHQ-9 Q9), crisis safety plan content | Vital interests; user safety |
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

| # | Threat scenario | Pre-mitigation L × I | Post-mitigation L × I | Residual |
|---|---|---|---|---|
| 1 | Re-identification of an individual from in-app analytics aggregates | Med × Med | Low × Low | **Low** |
| 2 | Unauthorized access to sensitive wellness data via a lost, stolen, or shared device | High × High | Low × High | **Low** (likelihood) — see rationale |
| 3 | Compromise of optional cloud backup at the Supabase storage layer | Low × High | Low × Low | **Low** |
| 4 | Leakage of sensitive wellness data through error or crash telemetry (Sentry) | Med × Med | Low × Low | **Low** |

### 6.1 Rationale per scenario

**Scenario 1 — Re-identification from analytics.** Being's analytics pipeline transmits severity buckets (Low / Medium / High / Crisis) rather than raw screening scores or content. The technical basis is documented in `docs/security/supabase-rls-verification.md` (Analytics Events Table within RLS Policy Analysis). With score values bucketed and with no quasi-identifiers (location, device fingerprint, journal text) routed through analytics, re-identification of an individual from aggregates is not realistically achievable. Post-mitigation residual: Low.

**Scenario 2 — Unauthorized device access.** This is the highest-impact scenario because device loss is common. Mitigations: sensitive wellness data is encrypted at rest using AES-256-GCM with keys held in operating-system-protected stores (iOS Keychain configured without iCloud sync; Android Keystore with StrongBox where available). Sensitive views require operating-system-level device unlock. See `docs/security/security-architecture.md` §1 (Encryption Methods for Local Storage) and §3 (Biometric Authentication Implementation). Likelihood that an attacker with physical possession of the device also defeats the device-unlock layer and the OS keystore is Low. Impact, were they to succeed, remains High because the content is sensitive — but the chain of controls makes successful exploitation a Low-likelihood outcome. The user remains the last line of defense by setting and protecting their device passcode/biometric.

**Scenario 3 — Cloud backup breach.** Optional cloud backups are stored as opaque encrypted blobs in the `encrypted_backups` table. The decryption key never leaves the user's device. Supabase Row-Level Security prevents cross-user access at the database layer (see `docs/security/supabase-rls-verification.md`, Encrypted Backups Table within RLS Policy Analysis). Even in the event of a full Supabase compromise, attacker yield is encrypted blobs without accompanying keys. Residual: Low.

**Scenario 4 — Sentry telemetry leakage.** React Native error boundaries can capture local variable state into error payloads. Mitigations: Sentry's data-scrubbing configuration is enabled; sensitive-data variables are never passed into log lines or exception messages by convention; the development-environment Sentry DSN is empty so local debugging cannot leak through misconfiguration (see `CLAUDE.md`, "Known Gotchas" — env files). Residual: Low. This scenario warrants explicit attention at every annual review since the React Native error-boundary surface area can grow with new features.

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
| 6 | Row-Level Security on all Supabase tables containing user data | `docs/security/supabase-rls-verification.md` | RLS Policy Analysis (all five tables) |
| 7 | End-to-end encrypted backup blobs (decryption key never leaves the device) | `docs/security/supabase-rls-verification.md` | RLS Policy Analysis — Encrypted Backups Table |
| 8 | Audit logging on subscription events | `docs/security/supabase-rls-verification.md` | RLS Policy Analysis — Subscription Events Table |
| 9 | Analytics severity-bucketing (no raw scores transmitted) | `docs/security/supabase-rls-verification.md` | RLS Policy Analysis — Analytics Events Table |
| 10 | Sentry payload scrubbing; empty development DSN | `CLAUDE.md` | Known Gotchas — env files |
| 11 | Secure data export and complete data deletion | `docs/security/security-architecture.md` | §5 Secure Export Mechanisms; §6 Complete Data Deletion |

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

---

## 10. GDPR Article 35 Scope Note

A full GDPR Article 35 DPIA has been intentionally scoped out of this document. Being's EU/EEA user base is below the threshold at which an Art. 35 DPIA is warranted as a standalone artifact. This DPIA will be promoted into a GDPR-conformant DPIA before EU/EEA user count exceeds 500, or before any feature that constitutes "large-scale processing of special category data" under Art. 9 is enabled — whichever occurs first. The above is itself a material-change trigger per §1.

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
