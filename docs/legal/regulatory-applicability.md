# Regulatory Applicability & Compliance Source of Truth

**Version:** 1.0  
**Effective Date:** December 26, 2025  
**Last Updated:** December 26, 2025  
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
- Crisis resources and emergency contact access
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

**Compliance Approach:** Provide data access, deletion, and export features. Maintain transparent privacy notices. Honor universal opt-out mechanisms. See `california-privacy.md` and `do-not-sell.md`.

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
| `notice-of-privacy-practices.md` | Detailed privacy practices |
| `medical-disclaimer.md` | Medical/clinical disclaimers |
| `california-privacy.md` | CCPA-specific disclosures |
| `terms-of-service.md` | User agreement |
| `/docs/security/security-architecture.md` | Technical security implementation |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-26 | Initial document creation |

---

## Questions?

For compliance questions, contact [legal@being.fyi](mailto:legal@being.fyi)

---

*This document is authoritative for regulatory applicability decisions within the Being codebase and documentation.*
