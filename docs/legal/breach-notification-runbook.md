# FTC Health Breach Notification Rule — Operational Runbook

**Version:** 1.0
**Effective Date:** May 24, 2026
**Last Updated:** May 24, 2026
**Audience:** Internal — founder + counsel only (this is NOT a user-facing document)
**Authority:** Operational procedure honoring `privacy-policy.md` §4.4 (Breach Notification)
**Annual Review:** Required — next due May 24, 2027

---

> **Purpose:** Step-by-step procedure for responding to a breach of unsecured wellness data under the FTC Health Breach Notification Rule (16 CFR Part 318). Designed to be executed under stress with no external research — every form URL, deadline, threshold, and contact path is documented inline. If this document fails the "stressed founder at 2 AM" test, file a ticket to fix it.

---

## Document Purpose

`privacy-policy.md` §4.4 commits to notifying affected users "without unreasonable delay, and in no case later than 60 calendar days after discovery, in accordance with the Federal Trade Commission's Health Breach Notification Rule (16 CFR Part 318)." That promise creates an FTC Act §5 deceptive-practice exposure if not honored. This runbook is the internal procedure that delivers on the promise.

**Scope:** breaches of "unsecured PHR identifiable health information" as defined in 16 CFR §318.2 — including PHQ-9/GAD-7 wellness screening responses, check-in mood data, journal entries, crisis-resource interactions, and any identifiable wellness data that leaves AES-256-GCM encryption protection (see `docs/security/security-architecture.md` §1).

**Out of scope:** Account-only breaches with no wellness data exposure (still report internally per `app/src/core/services/security/IncidentResponseService.ts`, but no FTC notification required).

---

## 1. Trigger Criteria (16 CFR §318.2)

A "breach of unsecured PHR identifiable health information" triggers the HBNR procedure. Use the decision table to confirm applicability:

| Scenario | Triggers HBNR? | Notes |
|---|---|---|
| Unauthorized access to encrypted wellness data where encryption keys also exposed | ✅ YES | Keys exposed = data is no longer "secured" per 16 CFR §318.2 |
| Unauthorized access to AES-256-GCM-encrypted data, keys intact | ❌ NO | Data remains "secured" — log internally per `IncidentResponseService.ts`, no FTC notification |
| Plaintext wellness data leaked (e.g., via misconfigured backup, logging accident, API leak) | ✅ YES | Plaintext is unsecured by definition |
| Lost/stolen device with local AES-256-GCM-encrypted store, device PIN intact | ❌ NO | FBE + AES-256-GCM keeps data secured |
| Lost/stolen device with local AES-256-GCM-encrypted store, device PIN compromised or known | ✅ YES | Compromised authentication = data effectively unsecured |
| Internal staff (founder, contractor) accesses data without authorization | ✅ YES | "Unauthorized acquisition" per §318.2; even insider misuse counts |
| Vendor breach (Supabase, Sentry, Stripe) exposing wellness data | ✅ YES if Being's data is implicated | Vendor must notify Being; Being then has its own HBNR clock |
| Vendor breach exposing only billing/email (no wellness data) | ❌ NO HBNR | Standard state breach law may still apply — see §7 |
| Ransomware on systems holding wellness data, no proven exfiltration | ⚠️ ESCALATE | Per FTC 2023 guidance, ransomware that touches PHR data is presumed a breach unless investigation rebuts |

**"Unsecured" definition (operational):** wellness data that is **not** protected by encryption that meets `docs/security/security-architecture.md` §1 (AES-256-GCM, NIST-aligned key management). If any of these are true at incident time, the data is unsecured:
- Encryption was disabled, downgraded, or never applied to the affected store
- Encryption keys were exposed alongside the ciphertext
- Data left the encryption boundary in plaintext (logs, exports, backups, third-party API payloads)

If unsure → **escalate to counsel (`legal@being.fyi`) within 24 hours** and treat as a presumed breach until cleared.

---

## 2. The Discovery Clock (16 CFR §318.4(a))

Federal deadlines run from the **date of discovery**, defined as the day the breach is known or, by exercising reasonable diligence, would have been known. The clock starts on the calendar day discovery occurs — not the day investigation concludes.

**Where to log the discovery timestamp:**
1. Create an incident record via the detection hooks in `app/src/core/services/security/IncidentResponseService.ts` (auto-fired by SecurityMonitoringService for in-app triggers).
2. For out-of-band discoveries (vendor disclosure, researcher report, user complaint): manually create the incident record with the discovery timestamp matching the moment Being was notified or detected the issue.
3. Record the discovery timestamp in the founder-only ops log alongside the incident ID: `~/dev/being/.config/incidents/{YYYY-MM-DD}-{incident-id}.md` (gitignored; back up to 1Password).

**Countdown from discovery (calendar days, not business days):**

| Deadline | Days | Reference |
|---|---|---|
| Internal containment + counsel notification | 1 | This runbook §3 |
| State AG notification (CA/NY 500+, TX 250+) | 30 | `STATE_NOTIFICATION_MATRIX` |
| State consumer notification (CA/NY/TX) | 30 | strictest applicable state law |
| Media notification if 500+ residents of any state | 30 (state) / 10 (FTC) | see §6 |
| **FTC notification** | **60** | **16 CFR §318.4** |
| **Affected-individual notification** | **60** | **16 CFR §318.5(a)** |
| Post-incident review filed | 90 | This runbook §3 Step F |

> **The strictest applicable deadline wins.** If state law requires 30-day consumer notification and federal allows 60, you have 30 days. The runbook is structured so the 30-day state deadlines come first.

---

## 3. Escalation Order

Execute in order. Each step has a checklist; tick before advancing.

### Step A — Detection (Day 0, hour 0)
- [ ] Incident captured in `IncidentResponseService.ts` with severity, affected data classes, estimated user count
- [ ] Discovery timestamp recorded in founder ops log
- [ ] Incident ID assigned
- [ ] Preliminary scope: which data sensitivity levels affected (see `DataProtectionEngine.ts` `DataSensitivityLevel`)

### Step B — Containment (Day 0, within 5 minutes for automated triggers; within 1 hour for manual)
- [ ] Affected systems isolated (revoke compromised credentials, rotate keys via `docs/security/key-rotation.md`, suspend impacted endpoints)
- [ ] Evidence preserved (logs, snapshots, network captures) — do NOT delete or "clean up" anything until forensics complete
- [ ] If crisis-intervention data exposed (`CrisisSecurityProtocol`): immediate professional notification per `INCIDENT_RESPONSE_CONFIG.NOTIFICATION_REQUIREMENTS.crisis_data`

### Step C — Assessment (Day 0–1)
- [ ] Confirm trigger criteria match §1 (HBNR applies / does not apply)
- [ ] Count affected individuals (exact, not estimate, before notifications go out)
- [ ] Map affected individuals to state of residence (for state-law matrix in §7)
- [ ] Classify breach severity per `BreachSeverity` enum

### Step D — Counsel Notification (Day 1, within 24 hours of discovery)
- [ ] Email `legal@being.fyi` with: incident ID, discovery timestamp, scope summary, affected count by state, severity
- [ ] Counsel confirms HBNR applicability and any state-law parallel obligations
- [ ] Counsel reviews notification templates before they go out

### Step E — Notifications (deadlines per §2 table)
- [ ] State AG notifications (§7 matrix)
- [ ] Consumer notifications (§5)
- [ ] FTC notification (§4) — submitted via FTC online form
- [ ] Media notification if 500+ in any state (§6)

### Step F — Post-Incident Review (within 90 days)
- [ ] Root-cause analysis written and stored with the incident record
- [ ] Mitigation measures implemented (code changes, policy changes, vendor changes)
- [ ] Update this runbook if procedural gaps were discovered
- [ ] Update `STATE_NOTIFICATION_MATRIX` and §7 of this runbook if statute changed

---

## 4. Federal Step — FTC Notification

**Form:** https://www.ftc.gov/HBNR (FTC Health Breach Notification Form — verify the URL still resolves before submitting; last confirmed May 2026. The FTC occasionally redesigns the submission portal; the annual review in §9 catches drift.)

**Deadline:** 60 calendar days from discovery (16 CFR §318.4).

**Who files:** Founder files. Counsel reviews the submitted content before transmission for accuracy and privilege considerations.

**Required data fields (16 CFR §318.6):**

| Field | Source / How to gather |
|---|---|
| Vendor / entity name | "Palouse Labs LLC, d/b/a Being" |
| Address, phone, email | From corporate records; `legal@being.fyi` for contact |
| Type of entity | "Vendor of personal health records" (non-HIPAA) |
| Date(s) of breach | Both **breach occurrence** date and **discovery** date |
| Number of individuals affected | Exact count from §3 Step C |
| Description of unsecured PHR identifiable health information involved | Itemize: PHQ-9 responses, GAD-7 responses, mood check-ins, journal entries, etc. — match `DataSensitivityLevel` taxonomy in `DataProtectionEngine.ts` |
| Description of the breach | What happened, how it was discovered, sequence of events |
| Mitigation steps taken | Containment actions from §3 Step B + any user-protective measures |
| Steps individuals can take to protect themselves | Mirror the language used in user notification (§5) — must be consistent |

**After submission:**
- [ ] Save submission confirmation (PDF or screenshot) to incident record
- [ ] Note FTC reference number in ops log
- [ ] If FTC requests follow-up info, respond within their stated deadline (typically 10 business days)

---

## 5. User Notification Step (§318.5(a))

**Deadline:** 60 calendar days from discovery — **but state law often requires 30 days** (see §7). Default to 30 days to satisfy both.

**Language requirement:** Plain language. Match the user-facing voice in `privacy-policy.md` §4.4 — short sentences, no legalese, no compliance jargon.

**Required content (16 CFR §318.6(a) — same fields users were promised in privacy-policy.md §4.4):**
- A description of what happened and when it was discovered
- The types of information involved
- Steps the individual can take to protect themselves
- What Being is doing to investigate the breach and prevent recurrence
- Contact information for more information (`privacy@being.fyi` is the standing contact per `support.md`)

**Delivery method matrix (§318.5(a)(1)–(3)):**

| Affected user state | Primary method | Substitute notice required when |
|---|---|---|
| Email on file, deliverable | Email | — |
| No email on file, postal address on file | First-class mail | — |
| Email returned undeliverable | Substitute notice | per (3) |
| 10+ users with insufficient contact info | Substitute notice | per (3) |

**Substitute notice (§318.5(a)(3))** = all three of:
1. Prominent notice on `being.fyi` homepage for ≥90 days
2. Notice in major print or broadcast media in geographic areas where affected individuals likely reside
3. Toll-free phone number, active for ≥90 days, where individuals can learn whether their info was involved

> Being doesn't currently maintain a toll-free line. If substitute notice is triggered, **counsel coordinates standing up a temporary toll-free line via a service like Grasshopper or Twilio** — record the cost in the incident budget. Estimated lead time: 24–48 hours.

**Template skeleton** (counsel customizes per incident, do not send without legal review):

```
Subject: Important security notice from Being

We are writing to inform you of a security incident that affected your Being account.

What happened: [1–2 sentences, plain language]
When we discovered it: [date]
What information was involved: [itemize from §4 table]
What you can do to protect yourself: [actionable steps — change password, monitor for phishing, etc.]
What we are doing: [containment, investigation, prevention measures]

If you have questions, please contact us at privacy@being.fyi.

We are sorry this happened. Your trust matters to us.

— The Being team
```

---

## 6. Media Notification Step (§318.5(b))

**Trigger:** Breach affects **500 or more residents of any single state, U.S. territory, District of Columbia, or possession**.

**Deadline:** Prominent media notice in the affected jurisdiction, provided **without unreasonable delay** and in no case later than 60 days from discovery. *Note: `STATE_NOTIFICATION_MATRIX.FTC.mediaDeadlineDays` in code is set to 10 — that's the operational target this runbook adopts to stay well inside the federal deadline.*

**Outlet selection:** at least one prominent media outlet serving the geographic area. Reasonable choices:
- Major daily newspaper in the affected state's largest metro
- Statewide broadcast affiliate (CBS / NBC / ABC / Fox)
- Online local news outlet with verified statewide reach

**Content:** Mirror the user notification (§5) plus instructions for how individuals can determine if they were affected (`privacy@being.fyi`).

**Counsel handles outlet selection and submission.** Founder approves the press release before transmission.

---

## 7. State-Specific Timelines

The following table mirrors `STATE_NOTIFICATION_MATRIX` in `app/src/compliance/BreachResponseEngine.ts:174`. **That code constant is the authoritative source — if it changes, update this table in the same PR.** Code-side `BreachResponseEngine.computeStateDeadlines()` enforces these values at runtime.

| State | Consumer deadline | AG threshold | AG deadline | Media threshold | Media deadline | Statute |
|---|---|---|---|---|---|---|
| **California (SB 446)** | 30 days | 500 residents | 30 days | 500 residents | 30 days | CA Civ. Code §1798.82; SB 446 effective Jan 1, 2026 |
| **New York (SHIELD Act)** | 30 days | 500 residents | 30 days | 500 residents | 30 days | NY Gen. Bus. Law §899-aa |
| **Texas (TDPSA)** | 30 days ("without unreasonable delay") | **250 residents** | 30 days | 500 residents | 30 days | Tex. Bus. & Com. Code §521.053; TDPSA |
| **Federal (FTC HBNR)** | 60 days | n/a | n/a (form goes to FTC, not state AG) | 500 residents of a single state, territory, DC, or possession | 10 days (operational target; statute is "without unreasonable delay") | 16 CFR Part 318 |

**Notes that affect execution:**
- **TX has the strictest AG threshold (250).** Any breach affecting more than 250 Texas residents triggers Texas AG notification at 30 days even if no other state is implicated.
- **NY SHIELD Act §899-aa(8).** The statute requires notification to **four New York agencies**: the NY Attorney General, NY Department of State, NY Division of State Police, and NY Division of Consumer Protection. Counsel files all four contemporaneously. *(Code constant `STATE_NOTIFICATION_MATRIX.NY` currently models only AG notification — file a follow-up MAINT ticket to extend the matrix to enumerate all four agencies and surface them in `computeStateDeadlines()` output.)*
- **CA SB 446 (effective Jan 1, 2026)** extended California's existing breach notification to cover "personal health information" held by non-HIPAA entities — the rule Being is most clearly subject to at the state level.
- **Other states.** This matrix covers CA/NY/TX because those are the states with the most stringent / earliest-triggering requirements. For breaches affecting residents of other states, counsel consults state-by-state. The 60-day federal floor covers any state without its own faster timeline.

---

## 8. Cross-References to Code

| Concern | Code reference |
|---|---|
| 60-day FTC enforcement, state matrix | `app/src/compliance/BreachResponseEngine.ts` (`STATE_NOTIFICATION_MATRIX` at line 174, `computeStateDeadlines()`) |
| Encryption state (determines "secured" vs "unsecured") | `app/src/compliance/DataProtectionEngine.ts`, `app/src/core/services/security/EncryptionService.ts` |
| Detection + incident creation hooks | `app/src/core/services/security/IncidentResponseService.ts` (`INCIDENT_RESPONSE_CONFIG`) |
| Crisis-data special handling | `app/src/features/crisis/services/CrisisSecurityProtocol.ts` |
| Key rotation procedure (containment step) | `docs/security/key-rotation.md` |

---

## 9. Annual Review

- [ ] Review trigger criteria (§1) against current 16 CFR Part 318 text and FTC guidance
- [ ] Confirm FTC form URL (`https://www.ftc.gov/HBNR`) still resolves; capture any field changes
- [ ] Confirm `STATE_NOTIFICATION_MATRIX` in `BreachResponseEngine.ts` still mirrors current statute for CA / NY / TX
- [ ] Confirm contact paths (`legal@being.fyi`, `privacy@being.fyi`) still active
- [ ] Confirm `docs/security/security-architecture.md` encryption posture unchanged; if changed, update §1 "unsecured" definition
- [ ] Run a tabletop exercise: simulate a hypothetical breach; walk through every step end-to-end; record gaps

**Responsibilities:**

| Role | Reviews |
|---|---|
| Founder | Trigger criteria, FTC form URL, contact paths, tabletop exercise |
| Counsel | Legal accuracy (statute citations, deadlines, notification language) |

**Next review due:** May 24, 2027

---

## Related Documents

| Document | Purpose |
|---|---|
| `docs/legal/privacy-policy.md` §4.4 | User-facing breach notification commitment (this runbook delivers on it) |
| `docs/legal/regulatory-applicability.md` | Why FTC HBNR applies to Being (non-HIPAA wellness app) |
| `docs/legal/support.md` | Contact paths (`legal@being.fyi`, `privacy@being.fyi`) |
| `docs/security/security-architecture.md` | Encryption standards — defines what counts as "secured" |
| `docs/security/key-rotation.md` | Key rotation procedure (containment step) |
| `docs/development/audits/INFRA-83-rescope-2026-05-24.md` (lines 141–165) | Source citation: why this runbook was added |

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-24 | Initial runbook (INFRA-152) |

---

*This document is the internal procedure honoring the public commitment in `privacy-policy.md` §4.4. For compliance questions, contact `legal@being.fyi`.*
