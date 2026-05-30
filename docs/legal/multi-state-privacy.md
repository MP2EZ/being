# Multi-State Privacy Rights

**Version:** 1.0
**Effective Date:** May 25, 2026
**Last Updated:** May 29, 2026

> **Not legal advice.** This page is informational and reflects our understanding of the named laws as of the Last Updated date. State privacy law is changing quickly; rules, deadlines, and cure periods may have changed since this page was written. For authoritative and current information, consult your state Attorney General (links in the [Escalation](#escalation) section) or a qualified attorney.

---

## Overview

This page supplements our [Privacy Policy](/privacy) and enumerates the rights available to Being users who reside in U.S. states with comprehensive consumer privacy laws. California residents should also consult the dedicated [California Privacy Rights](/privacy/california) page; the California section here is a summary.

Being honors the following state laws:

| State | Law | Effective |
|---|---|---|
| California | CCPA / CPRA | 2020 / 2023 |
| Texas | TDPSA | July 2024 |
| Colorado | CPA | July 2023 |
| Connecticut | CTDPA | July 2023 |
| Virginia | VCDPA | January 2023 |

If you reside in a state not listed here, the rights in our base [Privacy Policy](/privacy) still apply, including the right to access, correct, delete, and export your data via in-app settings or by emailing [privacy@being.fyi](mailto:privacy@being.fyi).

---

## Universal Opt-Out Signals

Four of the five laws above (CCPA, TDPSA, CPA, CTDPA) mandate technical recognition of universal opt-out signals such as Global Privacy Control (GPC). Virginia (VCDPA) does not currently mandate a universal opt-out signal.

**How Being honors these signals:**

- **In the app**: enable *Settings → Privacy & Data → Honor Universal Opt-Out*. When on, Being treats your in-app session as opted out of all non-essential analytics, crash reporting, settings backup, and research participation, regardless of any granular preferences previously granted. The setting is persisted on-device alongside your consent record (AES-256 encrypted via `expo-secure-store`).
- **On the web**: our privacy and support pages at `being.fyi` honor the `Sec-GPC: 1` request header sent by browsers and extensions implementing the [Global Privacy Control specification](https://globalprivacycontrol.org/). *(Web-side detection is rolling out and tracked separately.)*

Universal opt-out does **not** affect your explicit consent for mental-health data processing (mood check-ins, PHQ-9 / GAD-7 self-screening responses, journal entries) — that consent is governed separately by GDPR Article 9(2)(a) and your active use of the wellness features. Universal opt-out targets analytics and tracking, not the wellness data you actively consented to during onboarding.

**Crisis intervention is never gated by opt-out.** The 988 Suicide & Crisis Lifeline button, crisis resources, and offline safety information remain fully accessible regardless of whether Universal Opt-Out is enabled. This is a non-negotiable invariant in the codebase (`canPerformCrisisIntervention()` always returns true) — opt-out controls analytics and tracking, not access to safety features.

---

## California (CCPA / CPRA)

California residents have rights under the California Consumer Privacy Act and California Privacy Rights Act, including the right to know, delete, correct, opt out, and limit use of sensitive personal information. See the dedicated [California Privacy Rights](/privacy/california) page for the full enumeration, verification procedures, and authorized-agent process.

- **Response timing**: 45 days, with a 45-day extension when reasonably necessary.
- **Cure period**: the 30-day right-to-cure under the original CCPA was eliminated for general violations effective January 1, 2023 (per CPRA amendments to Cal. Civ. Code §1798.155). The California Attorney General and the California Privacy Protection Agency retain discretion to provide notice and a cure opportunity in limited circumstances.
- **Verification**: see the [Verification Procedures](#verification-procedures) section below for v1's account-free verification process. Authorized agents must provide signed authorization and proof of identity.

---

## Texas (TDPSA)

The Texas Data Privacy and Security Act (TDPSA), effective July 1, 2024 with universal-opt-out signal recognition mandatory from January 1, 2025, grants Texas residents the following rights:

- **Right to confirm** whether Being is processing your personal data and to access that data.
- **Right to correct** inaccuracies in your personal data.
- **Right to delete** your personal data.
- **Right to a portable copy** of personal data you provided to Being.
- **Right to opt out** of (a) targeted advertising, (b) sale of personal data, and (c) profiling in furtherance of solely-automated decisions producing legal or similarly significant effects. Being does not engage in any of these activities; the opt-out request is recorded for compliance.
- **Right to appeal** a denial of any of the above. We will provide a written response within 60 days.

**How to exercise**: in-app via *Settings → Privacy & Data*, or by email to [privacy@being.fyi](mailto:privacy@being.fyi) with the subject line "Texas Privacy Request."

- **Response timing**: 45 days, with a 45-day extension when reasonably necessary.
- **Cure period**: removed effective January 1, 2025; the Texas Attorney General may now bring an enforcement action without first providing notice and an opportunity to cure.
- **Verification**: see the [Verification Procedures](#verification-procedures) section below for v1's account-free verification process.

---

## Colorado (CPA)

The Colorado Privacy Act (CPA), effective July 1, 2023, grants Colorado residents the same core rights as TDPSA: access, correction, deletion, data portability, opt-out of targeted advertising / sale / profiling, and appeal. Universal opt-out signal recognition has been mandatory since July 1, 2024.

- **Response timing**: 45 days, with a 45-day extension when reasonably necessary.
- **Cure period**: 60 days following written notice from the Colorado Attorney General. The cure period sunset on January 1, 2025 for violations occurring after that date (C.R.S. §6-1-1311(1)(d)).
- **Verification**: see the [Verification Procedures](#verification-procedures) section below for v1's account-free verification process.

**How to exercise**: in-app via *Settings → Privacy & Data*, or by email to [privacy@being.fyi](mailto:privacy@being.fyi) with the subject line "Colorado Privacy Request."

---

## Connecticut (CTDPA)

The Connecticut Data Privacy Act (CTDPA), effective July 1, 2023, grants Connecticut residents the same core rights as CPA. Universal opt-out signal recognition has been mandatory since January 1, 2025.

- **Response timing**: 45 days, with a 45-day extension when reasonably necessary.
- **Cure period**: 60 days following written notice from the Connecticut Attorney General, at the AG's discretion (Conn. Gen. Stat. §42-525(b)). The discretionary cure period sunset on December 31, 2024 for violations occurring after that date.
- **Verification**: see the [Verification Procedures](#verification-procedures) section below for v1's account-free verification process.

**How to exercise**: in-app via *Settings → Privacy & Data*, or by email to [privacy@being.fyi](mailto:privacy@being.fyi) with the subject line "Connecticut Privacy Request."

---

## Virginia (VCDPA)

The Virginia Consumer Data Protection Act (VCDPA), effective January 1, 2023, grants Virginia residents access, correction, deletion, data portability, opt-out of targeted advertising / sale / profiling, and appeal rights. **VCDPA does not currently mandate technical recognition of universal opt-out signals such as GPC.**

- **Response timing**: 45 days, with a 45-day extension when reasonably necessary.
- **Cure period**: 30 days following written notice from the Virginia Attorney General (Va. Code §59.1-580). The Virginia cure period remains a statutory right — it has not been sunset.
- **Verification**: see the [Verification Procedures](#verification-procedures) section below for v1's account-free verification process.

**How to exercise**: in-app via *Settings → Privacy & Data*, or by email to [privacy@being.fyi](mailto:privacy@being.fyi) with the subject line "Virginia Privacy Request." Virginia residents who wish to apply an opt-out without sending individual requests can use the in-app *Honor Universal Opt-Out* toggle, which Being will treat as a binding opt-out request even though VCDPA does not require it.

---

## Comparison Matrix

| | CA (CCPA/CPRA) | TX (TDPSA) | CO (CPA) | CT (CTDPA) | VA (VCDPA) |
|---|---|---|---|---|---|
| Response window | 45 + 45 days | 45 + 45 days | 45 + 45 days | 45 + 45 days | 45 + 45 days |
| Appeal response | Not specified | 60 days | 45 days | 60 days | 60 days |
| Universal opt-out mandate | Yes | Yes (Jan 2025) | Yes (Jul 2024) | Yes (Jan 2025) | No |
| Cure period (post-2025) | AG discretion only | None | None | None | 30 days (statutory) |
| Sensitive-PI default | Opt-out (right to limit) | Opt-in (consent required) | Opt-in (consent required) | Opt-in (consent required) | Opt-in (consent required) |

---

## Verification Procedures

In v1, Being operates in anonymous local-only mode: we do not collect email addresses, usernames, or account records that could be matched to a privacy request. We verify privacy requests using a usage-pattern fallback rather than account-record matching:

1. **In-app fulfillment is preferred.** Most rights (access, deletion, export, opt-out) can be exercised directly from *Settings → Privacy & Data* without sending us a request — your device is the authoritative copy of your data.
2. **Email requests are accepted.** If you email [privacy@being.fyi](mailto:privacy@being.fyi), we will respond within 45 days. For requests we can fulfill through in-app controls, we will direct you to those controls and confirm completion. For requests we cannot fulfill in-app, we will work with you manually.
3. **Usage-pattern matching** in lieu of account verification: where verification of identity is required (for example, before purging settings backup data tied to a specific device), we may ask for information describing your use of the app (approximate first-use date, device type, time zone) to help us locate the relevant data.
4. **Authorized agents** (CCPA only): provide a signed authorization from the consumer, plus proof of the agent's identity. Being may attempt to confirm the agent's authority via in-app controls.

If we cannot verify your identity within a reasonable time, we will inform you and decline to act on the request, without charge.

---

## Escalation

If you are dissatisfied with our response to a privacy request, you may:

1. **Appeal in writing** to [privacy@being.fyi](mailto:privacy@being.fyi) within 60 days. Being will respond within 60 days of the appeal.
2. **Contact your state Attorney General** for authoritative current law and to file a complaint:
   - California: [oag.ca.gov/privacy](https://oag.ca.gov/privacy)
   - Texas: [texasattorneygeneral.gov](https://www.texasattorneygeneral.gov/)
   - Colorado: [coag.gov](https://coag.gov/)
   - Connecticut: [portal.ct.gov/AG](https://portal.ct.gov/AG)
   - Virginia: [oag.state.va.us](https://www.oag.state.va.us/)

---

## Contact

For all privacy requests: [privacy@being.fyi](mailto:privacy@being.fyi)

For general support: [support@being.fyi](mailto:support@being.fyi)

Being. — a project of Palouse Labs LLC.
