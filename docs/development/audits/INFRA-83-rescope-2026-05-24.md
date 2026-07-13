# INFRA-83 Re-scope — Wellness-Positioning Filter

**Date:** 2026-05-24
**Original ticket:** [INFRA-83 — TESTFLIGHT: Legal document deployment infrastructure](https://www.notion.so/2ada1108c2088104b1b2df4205c6a634)
**Author:** Audit triggered by `/b-work infra-83 - some of this work is already in progress`
**Compliance review:** Provided by the `compliance` specialist agent against `docs/legal/regulatory-applicability.md`

---

## TL;DR

INFRA-83's 80-item AC was written under the previous MBCT / semi-clinical positioning. Being is now a **Stoic Mindfulness consumer wellness app** — not a healthcare provider, not a medical device, not a HIPAA covered entity (see `docs/legal/regulatory-applicability.md`). This audit filters the original AC against the current regulatory framework and surfaces gaps the old AC missed.

| Category | Count | Notes |
|---|---|---|
| ✅ STILL REQUIRED | 42 | Grounded in FTC, CCPA/TDPSA/VCDPA/CPA/CTDPA, GDPR, App Store policies |
| ✏️ NEEDS REWORDING | 14 | Mostly `being.app` → `being.fyi` + "clinical/PHI" → "wellness/wellness data" |
| 🗑️ OUTDATED — RETIRE | 6 | HIPAA-era NPP (4) + sub-18 parental consent (1) + standalone Do-Not-Sell page (1) |
| 🌐 EXTERNAL / NON-CODE | 18 | App Store Connect data entry, legal review, ops runbooks |
| ➕ NET-NEW (missing from AC) | 5 | GPC code, GDPR Art. 9 capture, FTC Health Breach runbook, DPIA, CTDPA/VCDPA |

**Live hosting check (`being-website-preview.palouselabs.workers.dev`):**

| URL | Status | Positioning |
|---|---|---|
| `/privacy` | 200 | ✅ Stoic Mindfulness; no MBCT |
| `/terms` | 200 | ✅ Stoic; no MBCT |
| `/privacy/california` | 200 | ✅ Stoic; no MBCT |
| `/support` | 200 | ✅ |
| `/disclaimer` | **404** | 🔴 medical disclaimer markdown exists locally but is not deployed |
| `/do-not-sell` | 404 | ✅ **intentional** — privacy policy §5.3 uses CCPA §1798.135(b)(1) in-policy-notice provision in lieu of a separate page |

---

## Source-of-truth references

- `docs/legal/regulatory-applicability.md` — authoritative regulatory applicability statement (v1.0, 2025-12-26)
- `.claude/CLAUDE.md` — terminology rules and safety facts
- `app/app.json` `associatedDomains` — real domain is `being.fyi` (NOT `being.app`)
- `docs/legal/privacy-policy.md` — current policy (v1.2, Dec 2025)

---

## Section-by-section filtered AC

### Section 1 — Legal Documents: Core Requirements

| AC item | Verdict | Evidence |
|---|---|---|
| Privacy policy hosted | ✅ DONE | `/privacy` returns 200 |
| ToS hosted | ✅ DONE | `/terms` returns 200 |
| Medical disclaimer at `being.app/disclaimer` | ✏️ REWORD + 🔴 NOT DEPLOYED | URL must be `being.fyi/disclaimer`; route currently 404 |
| NPP at `being.app/privacy-practices` | 🗑️ RETIRE | NPP is a 45 CFR §164.520 HIPAA covered-entity artifact; Being is not a covered entity |
| Privacy at `being.app/privacy` | ✏️ REWORD | URL must be `being.fyi/privacy`; page itself is live |
| ToS at `being.app/terms` | ✏️ REWORD | Same — `being.fyi/terms` is live |
| Support at `being.app/support` | ✏️ REWORD | `being.fyi/support` is live |
| Do Not Sell page at `being.app/do-not-sell` | 🗑️ RETIRE | privacy-policy.md §5.3 lines 177-181 use CCPA §1798.135(b)(1) "in-policy notice in lieu of separate link"; this is the **chosen compliance posture**, not a gap |
| California Privacy at `being.app/privacy/california` | ✏️ REWORD | `being.fyi/privacy/california` is live |

### Section 2 — Legal Documents: Technical Requirements

All 10 items ✅ STILL REQUIRED. These are FTC reasonable-security, App Store, and accessibility requirements that survive any positioning pivot. Most appear satisfied by the Workers-hosted static site (HTTPS, mobile-responsive, fast). Items needing concrete verification:
- ✅ DONE: HTTPS, URLs return 200 (verified), <2s load (Workers default).
- 🔴 EVIDENCE NEEDED: WCAG AA audit on legal pages; version-number embed in deployed pages; changelog mechanism; verified-no-tracking attestation from hosting provider.

### Section 3 — Privacy & Security

All 4 items ✅ STILL REQUIRED. State:
- **In-app cached offline copies**: ✅ DONE. `app/src/features/profile/content/legalDocuments.ts` bundles 5 markdown files at build time via Metro.
- **No analytics tracking on legal pages**: 🔴 EVIDENCE NEEDED. Confirm with website maintainer that no PostHog/Plausible loads on `/privacy`, `/terms`, `/privacy/california`, `/support`.
- **Encryption standards disclosed (AES-256, TLS 1.2+)**: ✅ DONE. privacy-policy.md §4.3.
- **Standard secure hosting**: ✅ DONE. Cloudflare Workers / OpenNext.

### Section 4 — App Store Privacy Labels

All 9 items 🌐 EXTERNAL / NON-CODE — performed in App Store Connect / Google Play Console after Apple Dev approval (blocked by INFRA-82). Items ✅ STILL REQUIRED; positioning shift only affects the *labels* you check (e.g., "Health & Fitness" not "Medical").

### Section 5 — Privacy Policy Content: Required Disclosures

All 12 items ✅ STILL REQUIRED. Current `docs/legal/privacy-policy.md` (v1.2) already covers most:

| Disclosure | Location in current policy |
|---|---|
| "We do not sell" | §5.3 (line 124, 173-186) |
| GDPR rights | §6, §9 |
| CCPA rights | california-privacy.md |
| Sensitive PI (CPRA) | california-privacy.md |
| Retention period | §7 (90 days general / 3 years crisis) |
| Verification process | california-privacy.md |
| Cross-border transfers | §9 |
| GDPR Art. 9 explicit consent | **🔴 NOT EXPLICITLY CALLED OUT** (§9 mentions GDPR generally but no Art. 9 language) |
| Encryption standards | §4.3 |
| What data collected | §2.1 |
| How data used | §3 |
| Data storage model | §4.1, §4.2 |

Wording-level fix: replace any residual "clinical assessment" with "wellness screening tool" in the policy (none observed in v1.2, but worth a final grep before deploy).

### Section 6 — Medical Disclaimer Content

All 9 items ✅ STILL REQUIRED. These ground the FDA wellness-exception defense and the liability disclaimer. Existing `docs/legal/medical-disclaimer.md` already includes the Stoic-Mindfulness-as-philosophical-not-clinical framing. The remaining work is **deploying** this content (the `/disclaimer` 404 above).

### Section 7 — Crisis Disclaimer Content

All 5 items ✅ STILL REQUIRED. Existing `medical-disclaimer.md` already includes the crisis-disclaimer section with 988 directives and "not monitored" language.

### Section 8 — Notice of Privacy Practices (NPP)

All 4 items 🗑️ RETIRE. NPP is `45 CFR §164.520` HIPAA-mandated for covered entities. Being is not a covered entity per regulatory-applicability.md. The underlying disclosures (data use, user rights, complaint procedures, effective date) are covered by:
- privacy-policy.md §3 (use), §6 (rights), §11 (contact/complaints), version table
- california-privacy.md (state-specific rights and verification)

**Do not create or deploy a Notice of Privacy Practices page.**

### Section 9 — Age Verification & Parental Consent

| AC item | Verdict | Notes |
|---|---|---|
| Age verification documentation (hard 18+ gate) | ✅ STILL REQUIRED | Code in `app/src/features/consent/screens/CombinedLegalGateScreen.tsx` currently shows **"13 or older"** language in 3 places (lines 119, 215, 237) — **🔴 BUG**: contradicts the wellness-positioning 18+ floor. Underlying `verifyAge()` in `consentStore` controls the actual cutoff. |
| Age gate mechanism specified | ✏️ REWORD | AC mixes 13+ (COPPA app-store floor) and 18+ (mental-health policy). Restate as "Hard 18+ gate" — COPPA's 13+ floor is irrelevant once 18+ is enforced. |
| Parental consent flow for <18 | 🗑️ RETIRE | ToS §4 disallows users under 18. There is no <18 path; no parental flow required. |

### Section 10 — In-App Integration

| AC item | Verdict | Notes |
|---|---|---|
| Medical disclaimer linked from onboarding / PHQ-9 / GAD-7 / crisis | ✏️ REWORD + 🔴 PARTIAL | Reword to "wellness assessment screens." Disclaimer is not currently linked from PHQ-9/GAD-7 screens — verify by reading `app/src/features/assessment/`. Onboarding (`CombinedLegalGateScreen`) bundles the disclaimer in the same checkbox as ToS+Privacy. |
| ToS and Privacy acceptance **separated** (not bundled checkbox) | 🔴 NOT DONE | `CombinedLegalGateScreen.tsx` lines 222-242 use a **single checkbox** covering ToS + Privacy + wellness disclaimer + crisis acknowledgment. AC explicitly requires separation. |
| Explicit consent flow for mental-health data (GDPR Art. 9) | 🔴 NOT DONE | No Art. 9-shaped explicit-consent capture exists; the single checkbox doesn't satisfy "freely given, specific, informed, unambiguous" + explicit for special-category data. |
| In-app links updated with live URLs | ✅ DONE for consent gate | `CombinedLegalGateScreen.tsx` lines 246, 252 use `https://being.fyi/terms` and `https://being.fyi/privacy` correctly. |
| In-app data access/deletion mechanism | ✅ STILL REQUIRED | Profile > Privacy path exists; verify against `app/src/features/profile/`. |

### Section 11 — App Store Listing Compliance

All 3 items 🌐 EXTERNAL / NON-CODE. Wellness-positioning vocabulary (support, education, wellness, philosophical practice; avoid diagnose/treat/therapy/clinical) is already canonicalized in `.claude/CLAUDE.md` and the website overhaul (INFRA-88 area).

### Section 12 — Operational Processes + Final Legal Review

| AC item | Verdict | Notes |
|---|---|---|
| Breach notification protocol documented | 🔴 GAP — NEW TICKET | Privacy policy §4.4 states the user commitment, but no internal runbook exists (FTC Health Breach Notification Rule, 16 CFR Part 318) |
| Consumer data request verification process | 🌐 EXTERNAL | california-privacy.md describes user-facing; internal ops procedure needs to be documented |
| Authorized agent request handling (CCPA) | 🌐 EXTERNAL | mentioned in california-privacy.md as a right; internal procedure not documented |
| Version control system for legal docs | ✅ DONE (informal) | Version numbers embedded; git history is authoritative; formal change-notification trigger not documented |
| Legal review (FTC / state breach / GDPR / CCPA / FDA wellness exception) | 🌐 EXTERNAL | Required before App Store submission; not a code task |

---

## Items to retire (DO NOT IMPLEMENT)

1. **Notice of Privacy Practices page** at `/privacy-practices` — HIPAA artifact; we are not a covered entity.
2. **NPP describes PHQ-9/GAD-7 data use and protection** — covered by privacy-policy.md §3.
3. **NPP describes user rights** — covered by privacy-policy.md §6 + california-privacy.md.
4. **NPP describes complaint procedures** — covered by privacy-policy.md §11 + support.md.
5. **NPP effective date and revision procedures** — covered by general policy versioning.
6. **Standalone Do Not Sell page** at `/do-not-sell` — privacy-policy.md §5.3 uses CCPA §1798.135(b)(1) in-policy-notice provision. This is the chosen compliance posture; do not build a separate page unless legal review later disagrees.
7. **Parental consent flow for users under 18** — ToS §4 hard-disallows <18; no flow needed.

---

## Net-new requirements absent from original AC

1. **Global Privacy Control (GPC) signal detection** — privacy-policy.md §5.3 line 179 *claims* "we honor GPC" under CCPA, TDPSA, CPA. **No code in `app/src/` actually detects GPC.** This is a deceptive-practice exposure under FTC Act §5 if the claim outruns the implementation. CCPA Mar-2024 regs + TDPSA (Jan 2025) + CPA mandate technical recognition of universal opt-out signals.
2. **GDPR Article 9 explicit consent capture** — Art. 9(2)(a) requires explicit (stricter than Art. 6) consent for "data concerning health." The current bundled-checkbox in `CombinedLegalGateScreen.tsx` doesn't qualify. Consent record must persist per Art. 7(1).
3. **FTC Health Breach Notification Rule operational runbook** — 16 CFR Part 318 requires notification to FTC (online form) and affected individuals within 60 days of discovery. Missing from `/docs/legal/` and `/docs/security/`.
4. **TDPSA / CPA data protection assessment (DPIA)** — both laws require documented assessments for processing sensitive PI. Mental-health data qualifies. No assessment doc evidenced.
5. **CTDPA / VCDPA opt-out coverage** — `california-privacy.md` is California-only. Connecticut and Virginia residents have parallel rights that should be addressed (extend the page to multi-state, or add a separate page).

---

## Real bugs surfaced during the audit (code, not documentation)

These are bugs in the app that the AC list didn't directly call out but the audit found:

1. **`app/src/core/analytics/AnalyticsDeletion.ts` lines 11, 125, 129** — references `privacy@being.app`; should be `privacy@being.fyi`. User-visible string. Real bug.
2. **`app/src/core/services/security/DeepLinkValidationService.ts` lines 304, 481** — converts `being://` URLs to `https://being.app/` for parsing; should be `https://being.fyi/`. Internal parsing scaffold; not user-facing but stale.
3. **`app/src/features/consent/screens/CombinedLegalGateScreen.tsx` lines 119, 215, 237** — text says "13 or older" / "ages 13 and older" in three places. Contradicts the hard 18+ floor enforced in policy (ToS §4) and the wellness positioning. Real bug. The underlying `verifyAge()` in `consentStore` is the source of truth; the UI strings must match.
4. **Same file, lines 222-242** — single bundled checkbox for ToS + Privacy + wellness disclaimer + crisis acknowledgment. Violates AC ("ToS and Privacy acceptance separated, not bundled checkbox") and is the structural blocker for GDPR Art. 9 explicit consent.
5. **`https://being-website-preview.palouselabs.workers.dev/disclaimer` returns 404** — `docs/legal/medical-disclaimer.md` exists in this repo and is bundled in the app, but the website hasn't deployed a route for it. The in-app links work (offline-bundled), but external links to the disclaimer URL would fail.

Tests / mock fixtures referencing `api.being.app`, `cdn.being.app`, `analytics.being.app` are test scaffold (`__tests__/setup/env.mock.js`, `env.test.ts`, `security-90-improvements.js`) — non-bug but worth normalizing in a sweep.

`com.being.app` (in `app.json`, `eas.json`, IAPService) is the iOS/Android bundle identifier reverse-DNS namespace — **not** a URL. **Do not change.**

---

## Recommended follow-up tickets (do NOT auto-create — for your review)

In rough priority order. Sized for `/b-create`.

1. **INFRA — Domain hygiene: `being.app` → `being.fyi` sweep + deploy `/disclaimer`**
   Replace `privacy@being.app` (AnalyticsDeletion.ts), update `DeepLinkValidationService` URL-converter target, normalize test fixtures, deploy `medical-disclaimer.md` at `being.fyi/disclaimer` in the website repo. Smoke test all in-app legal links resolve. (1 PR, ~50-100 LOC + 1 website PR.)

2. **FIX — Onboarding consent: 18+ gate + separate ToS/Privacy/wellness checkboxes + GDPR Art. 9 explicit-consent record**
   Fix `CombinedLegalGateScreen.tsx` strings ("13 or older" → "18 or older"), split the single checkbox into three (ToS, Privacy Policy, Wellness/Medical Disclaimer), add a fourth explicit-consent capture for processing mental-health data under GDPR Art. 9, persist the consent record to `consentStore`. Specialist agents: `compliance` + `crisis` (verify no regression in crisis-resource visibility for under-age path). (1 PR, ~200 LOC + test updates.)

3. **INFRA — GPC signal detection (code) + CTDPA / VCDPA opt-out coverage (policy)**
   Implement Global Privacy Control signal recognition in the app's analytics-opt-in path (CCPA Mar-2024, TDPSA Jan-2025, CPA mandate). Extend `california-privacy.md` (or add a new multi-state page) to explicitly enumerate Connecticut and Virginia residents' opt-out rights. (1 PR, ~100 LOC + policy edits.)

4. **COMPLIANCE — FTC Health Breach Notification Rule operational runbook**
   Document the internal procedure under `docs/legal/breach-notification-runbook.md`: detection → FTC form URL + required data fields → 60-day timeline → user notification → post-incident review. Not user-facing. (1 PR, doc-only.)

5. *(Optional, can defer)* **COMPLIANCE — DPIA for sensitive PI processing (TDPSA / CPA)** — Documented data protection impact assessment covering PHQ-9/GAD-7 wellness data flows. Doc-only.

---

## Closing the loop on INFRA-83

INFRA-83 served its purpose: it framed the legal-deployment goal under the old positioning, drove the initial website hosting, and seeded `legalDocuments.ts` in the app. The remaining work doesn't belong in INFRA-83 itself — it belongs in the discrete tickets above, each scoped to current positioning.

**Recommendation:** Return INFRA-83 to "Done" with this audit doc + a Notion comment as the closing record. Spawn the 4-5 follow-up tickets via `/b-create` based on your priority calls.

---

## Verification log

- `git -C ~/dev/being/infra-83 status` shows only this audit doc staged.
- Compliance agent classification methodology cited at top.
- WebFetch results captured for 6 URLs (status codes + positioning checks).
- Real-bug evidence cited by file:line.
- No app code modified in this pass.
