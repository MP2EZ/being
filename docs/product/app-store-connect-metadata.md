# Being. App Store Connect Metadata

> **Purpose:** Reference document containing every metadata field required to create the Being. app record in App Store Connect and submit version 1.0 for review. Section order mirrors App Store Connect's own UI so you can paste answers field-by-field when enrollment clears.
>
> **Status:** Draft — populated from PRD v3.0 (2025-10-23) and Being CLAUDE.md positioning. Items marked `[DECIDE]` need Max's input. Items marked `[BLOCKED]` require active Apple Developer Program membership.
>
> **Last updated:** 2026-05-21

---

## 1. Bundle ID & Identifiers

| Field | Value | Notes |
|---|---|---|
| Bundle ID | `com.palouselabs.being` | Reverse-DNS of the LLC's domain. Effectively permanent — installed copies can't migrate to a new bundle ID. |
| App Name (internal) | `Being` | Used in ASC dashboard; not user-facing. |
| SKU | `BEING-IOS-001` | Internal-only, never shown. Stable identifier for your own bookkeeping. |
| Primary Language | English (U.S.) | |

`[BLOCKED]` Register the bundle ID at developer.apple.com → Identifiers → App IDs after enrollment approves.

---

## 2. App Store listing

### 2.1 App Name (≤30 chars, public)

**Decision:** `Being` (confirmed 2026-05-21).

The trailing-period brand identity (`Being.`) remains in copy throughout subtitle/description/screenshots, but the App Store display name omits it to avoid Apple's silent strip / metadata return.

### 2.2 Subtitle (≤30 chars, shown under name in search)

Candidates:

- `Stoic mindfulness, daily.` (25 chars)
- `Mindfulness with substance.` (27 chars)
- `Stoic-grounded mindfulness` (26 chars)
- `Daily Stoic mindfulness` (23 chars)

`[DECIDE]` Pick one, or propose your own.

### 2.3 Promotional Text (≤170 chars, updatable any time without resubmission)

Draft (169 chars):

> Daily mindfulness practice grounded in Stoic wisdom. Morning preparation, midday resets, evening reflection — built on Marcus Aurelius, Epictetus, Seneca.

`[DECIDE]` Approve or revise.

### 2.4 Description (≤4000 chars; first 3 lines visible before "more" tap)

Draft below. First three lines are load-bearing — they're what users see in the truncated preview.

```
Daily mindfulness practice with philosophical depth. Being is a Stoic-grounded mindfulness app for people who want their practice to mean something.

Morning preparation. Midday resets. Evening reflection. Rooted in time-tested wisdom from Marcus Aurelius, Epictetus, and Seneca.

WHY BEING
General mindfulness apps offer meditation without philosophical framework. Being integrates evidence-based mindfulness with Stoic wisdom — giving daily practice structure, meaning, and depth.

DAILY PRACTICE
• Morning: gratitude, intention setting, preparation for the day
• Midday: brief resets — return to principles when challenged
• Evening: reflection, virtue check-in, lessons from the day

PRIVACY-FIRST
• All practice data encrypted on device
• Works fully offline
• No data sold or shared
• No tracking

WELL-BEING SUPPORT
Being includes optional well-being check-ins that you control. If patterns suggest you'd benefit from support, Being surfaces resources including the 988 Suicide & Crisis Lifeline. Being is not a substitute for professional mental health care.

FOR WHO
• Professionals managing work stress with mindfulness
• Students seeking resilience under academic pressure
• Parents wanting daily self-care that fits real life
• Experienced practitioners ready for philosophical depth

SUBSCRIPTION
Being is free to try. Premium unlocks the full practice library:
• $9.99 / month
• $79.99 / year (33% savings)

Subscription auto-renews unless cancelled at least 24 hours before the end of the current period. Manage in Settings → Apple ID → Subscriptions.

Terms: palouselabs.com/terms
Privacy: being.fyi/privacy
Support: being.fyi
```

`[DECIDE]` Items to confirm/edit:
- First three lines — strongest hook? These appear in search/browse before tap.
- Mention PHQ-9 / GAD-7 by name, or keep them as "well-being check-ins"? Draft uses the softer wording to reduce review scrutiny (clinical instrument names trigger trained reviewers).
- Subscription auto-renew language is required by Apple — don't remove. Edit only if the prices or trial change.

### 2.5 Keywords (≤100 chars total, comma-separated, no spaces after commas)

Apple uses these for search but they're not displayed. App name, subtitle, and IAP names also feed search — don't duplicate them here.

Draft (98 chars):

```
stoic,philosophy,meditation,mental wellness,breathwork,calm,reflection,journal,virtue,resilience
```

`[DECIDE]` Approve or swap. Notes:
- `calm` is a common word but Calm (the company) is trademarked — low risk as a generic adjective, but Apple has historically been inconsistent. Safe alternative: `tranquility` or `serenity`.
- Singular/plural don't both need to appear; Apple matches stems.
- Don't include `Being` (your name) or `mindfulness` (already in subtitle if you pick that variant) — wastes character budget.

### 2.6 Support URL

`https://being.fyi`

App Review will visit this. Ensure it loads and has a way to contact you for support (a link to mailto:support@being.fyi or similar).

### 2.7 Marketing URL (optional)

`https://being.fyi` (same as support, or leave blank).

### 2.8 Privacy Policy URL

**Decision:** `https://being.fyi/privacy`

The canonical privacy policy is already authored at `docs/legal/privacy-policy.md` in this repo (v1.0, effective 2025-12-12) and is comprehensive (Supabase service-provider disclosure, AES-256 at rest, TLS 1.2+ in transit, GDPR/CCPA sections, retention policy). It just needs to be published to being.fyi.

**Status:** `being.fyi/privacy` confirmed live (2026-05-21).

**Action required before submission:** Publish the remaining legal pages — Apple reviewers will check the URLs cited in the privacy policy and your App Review notes:
- `docs/legal/terms-of-service.md` → `being.fyi/terms`
- `docs/legal/california-privacy.md` → `being.fyi/privacy/california` (referenced from the privacy policy)
- `docs/legal/medical-disclaimer.md` → `being.fyi/medical-disclaimer` (cited in App Review notes)

**Worth checking:** Confirm the deployed version of `being.fyi/privacy` matches the canonical `docs/legal/privacy-policy.md` (v1.0, 2025-12-12). If the deployed copy is older, sync them — otherwise reviewers see one story and the app's actual data flows tell another.

---

## 3. Category & content classification

### 3.1 Primary Category

`Health & Fitness`

Rationale: Mindfulness apps belong here. Avoid `Medical` — that category triggers heavier review and Apple expects medical credentials or FDA clearance for many apps in it. Being's pivot from "MBCT clinical therapy" to "Stoic mindfulness mental wellness" (PRD v3.0) explicitly supports Health & Fitness placement.

### 3.2 Secondary Category (optional)

`Lifestyle` — second-best fit. Stoic philosophy + daily ritual reads as Lifestyle.

`[DECIDE]` Confirm `Lifestyle` as secondary, or leave blank.

### 3.3 Age Rating Questionnaire

Apple presents ~11 questions. Proposed answers based on Being's content:

| Question | Answer | Reason |
|---|---|---|
| Cartoon or Fantasy Violence | None | |
| Realistic Violence | None | |
| Sexual Content or Nudity | None | |
| Profanity or Crude Humor | None | |
| Alcohol, Tobacco, or Drug Use or References | None | |
| Mature/Suggestive Themes | None | |
| Horror/Fear Themes | None | No graphic crisis content; 988 is referential |
| Gambling | None | |
| **Medical/Treatment Information** | **Frequent/Intense** | PHQ-9 includes Q9 on self-harm ideation; crisis routing reachable in <3 taps; well-being assessments are a primary feature |
| Unrestricted Web Access | None | |
| Contests | None | |

**Predicted result:** **17+** (Apple has no 18+ rating; 17+ is the closest match).

**Recommendation (2026-05-21):** Rate it 17+ rather than fighting for 12+. Three reasons:

1. **TOS alignment.** Being's privacy policy and medical disclaimer both state "18 and older." A 12+ rating contradicts your own legal docs and Apple's review can flag the mismatch. 17+ is the closest App Store rating to your stated TOS minimum.
2. **Target persona alignment.** None of the PRD's four personas (Sarah, Marcus, Elena, David) target under-18 users — Marcus is implicitly a college student. Rating to your actual audience is cleaner than fighting for a younger one.
3. **PHQ-9 Q9 risk.** The standard PHQ-9 Question 9 asks about thoughts of self-harm. Even as one item in an optional screening, combined with explicit crisis routing features, a thoughtful reviewer could legitimately mark Medical/Treatment Information as Frequent/Intense. Going in at 17+ removes the appeal risk.

**Audience impact:** 17+ only affects devices with parental controls configured for younger users. It does not affect search visibility, store presentation, or marketing reach for adults.

**Alternative (12+) — if Max wants to push it:** Mark Medical/Treatment = Infrequent/Mild and argue the primary content is mindfulness, not clinical. Defensible on paper. Risk: reviewer disagreement triggers re-submission with rating change, AND the TOS/rating mismatch question.

### 3.4 Content Rights

> "Does your app contain, show, or access third-party content?"

`[DECIDE]` Answer is almost certainly **No**:
- Marcus Aurelius / Epictetus / Seneca works are public domain (>2000 years old).
- However, **modern translations are copyrighted** (e.g., Gregory Hays's *Meditations*, Robin Waterfield's translations). Confirm Being uses either (a) public-domain translations like George Long's Marcus Aurelius, (b) original Greek/Latin with your own translation, or (c) licensed modern translations with documentation.

---

## 4. Pricing & In-App Purchases

### 4.1 App Price

`Free` (with subscription IAP).

### 4.2 In-App Purchases

| Product | Reference Name | Product ID | Price | Type |
|---|---|---|---|---|
| Monthly Subscription | `Being Premium Monthly` | `com.palouselabs.being.premium.monthly` | $9.99 USD (Tier 10) | Auto-renewable subscription |
| Annual Subscription | `Being Premium Annual` | `com.palouselabs.being.premium.annual` | $79.99 USD (Tier 80) | Auto-renewable subscription |

**Subscription group:** `Being Premium` — both products live in one group so users can upgrade/downgrade between monthly and annual without losing entitlement.

**Pricing decisions (confirmed 2026-05-21):**
- Monthly: $9.99 (Tier 10) — confirmed
- Annual: $79.99 (Tier 80) — confirmed

**Free trial — needs resolution:** being.fyi currently advertises a **28-day** free trial. Apple's StoreKit intro-offer matrix doesn't include 28 days. Allowed durations: 3 days / 1 week / 2 weeks / **1 month** / 2 months / 3 months / 6 months / 1 year. Two options:

| Option | Trial duration users get | Action |
|---|---|---|
| **A. Use "1 month" intro offer** | 28–31 days depending on subscription start date (calendar-month based) | Update being.fyi copy from "28-day free trial" to "1 month free" or "free for a month" |
| B. Use "2 weeks" intro offer | Exactly 14 days | Significantly shorter than your existing marketing; would require a marketing decision |

`[DECIDE]` Recommend Option A — closest to existing marketing promise, requires only minor website copy adjustment.

**Pricing mutability — what you can/can't change later:**
- *Mutable:* price, intro offer duration, intro offer existence, country availability, product display name
- *Immutable once a transaction occurs:* product ID, subscription group structure, base duration unit (monthly stays monthly forever)
- *For existing subscribers:* price increases require their opt-in; price decreases apply automatically; trial changes don't retroactively affect existing subscribers

### 4.3 Availability

`[DECIDE]` All territories (default = 175+ App Store regions) or restrict? Default is fine unless there's a specific regulatory or language reason to exclude markets.

---

## 5. App Privacy (the "nutrition label")

This is the hardest section. Apple requires you to declare every data type the app collects, whether each is linked to user identity, and whether each is used for tracking. Inaccurate labels are a Guideline 5.1.2 violation and a common rejection reason.

### 5.1 Authoritative source

The nutrition-label answers are already encoded in `app/ios/Being/PrivacyInfo.xcprivacy` and documented in `docs/security/ios-privacy-manifest.md`. The values below transcribe that source — they are not new decisions.

### 5.2 Data declarations for App Store Connect

**Health & Fitness → Health**

| Field | Value |
|---|---|
| Collected | **Yes** |
| Data types | PHQ-9 responses, GAD-7 responses, daily mood check-in data, practice completion status |
| Linked to user identity | **No** — local-only by default; optional cloud sync is end-to-end encrypted with user-controlled keys |
| Used for tracking | **No** |
| Purpose | App Functionality |

**Diagnostics → Crash Data, Performance Data**

| Field | Value |
|---|---|
| Collected | **Yes** (when `SENTRY_DSN` env var is configured in the build) |
| Source | `@sentry/react-native` 7.7.0, abstracted via `ExternalErrorReporter.ts` |
| Linked to user identity | **No** — multi-layer PHI scrubbing + allowlist sanitization strips all wellness/PHI fields before transmission |
| Used for tracking | **No** |
| Purpose | App Functionality |

**Data Used to Track You:** None.

### 5.3 What's NOT collected (per code inspection + privacy policy)

- No location / GPS
- No contacts / address book
- No camera / microphone (unless explicitly enabled for a future feature)
- No third-party advertising identifiers (IDFA, etc.)
- No analytics SDKs (no Firebase, Mixpanel, Amplitude, PostHog)
- No account/auth in v1.0 (see §6.1)
- No subscription receipt server-side validation (StoreKit device-only)
- No iCloud or CloudKit backup

### 5.4 If a cloud-sync account flow ships later

The privacy policy anticipates an optional account flow ("Email, username (optional for cloud backup)"). When that ships, add these declarations:

- **Contact Info → Email Address:** Yes, Linked, Not Tracking, App Functionality
- **Identifiers → User ID:** Yes, Linked, Not Tracking, App Functionality
- The Health declaration would change `Linked = Yes` *only if* the cloud sync stores data tied to the user ID server-side without E2E encryption. Per privacy policy §4.2, cloud backups are E2E encrypted, so Health stays Linked = No.

---

## 6. App Review Information (visible to Apple reviewers only)

### 6.1 Sign-In Required?

**No.** Confirmed by code inspection 2026-05-21 — no auth code exists in `app/src/` (grep for `signIn|signUp|useAuth|AuthProvider|supabase.auth` returned zero matches). Being v1.0 is fully open: no account, no login, no signup flow. All practice data is stored encrypted on-device.

**No demo account needs to be provided to App Review.**

Note to reviewer (drafted in §6.3):
> "Being requires no account or login. Open the app to begin practice. Subscription paywall appears after the N-th session."

If a cloud-sync account flow ships in a future version, a demo account will be needed — at that point, create `appstorereview@palouselabs.com` as an M365 alias and document credentials securely (NOT in this repo).

### 6.2 Contact Information

| Field | Value |
|---|---|
| First name | John |
| Last name | Pengilly |
| Phone | (matches Apple Developer enrollment phone) |
| Email | `max@palouselabs.com` |

### 6.3 Notes for the Reviewer (≤4000 chars)

Draft:

```
Being is a Stoic mindfulness practice app. Key flows to review:

1. Onboarding (Welcome → theme selection → first practice)
2. Morning practice: Gratitude → Intention → Preparation for the day
3. Crisis support: Tap the heart icon in the top-right of any screen to access the 988 Suicide & Crisis Lifeline and breathing exercises. Reachable in <3 taps from any screen, per Being's safety architecture.
4. Well-being check-ins: Optional PHQ-9 and GAD-7 screening tools. These are SCREENING instruments, not diagnostic. Being surfaces external resources (988, professional help guidance) if scores suggest support would be beneficial. Being does NOT diagnose, treat, or claim to treat any medical condition.
5. Subscription paywall: Appears after [N] free sessions. Monthly ($9.99) and annual ($79.99) options. Tap "Restore Purchases" in Settings to verify restore flow.

All practice data is stored encrypted on device. The app works fully offline; no data is transmitted to external servers.

This app is not a substitute for professional mental health care. Crisis interventions reference standard public resources (988 Suicide & Crisis Lifeline).

For questions during review: max@palouselabs.com
```

`[DECIDE]` Confirm the flow descriptions match the actual app at submission time.

### 6.4 Attachments (optional)

If Being uses any unusual permissions or features (HealthKit, Sign in with Apple, background audio, etc.), attach a short video or document explaining the use case. Reviewers spend ~5 minutes per app — make their job easy.

---

## 7. Version 1.0 — build-specific metadata

### 7.1 What's New in This Version (≤4000 chars)

For 1.0:

```
Welcome to Being.
```

Intentionally minimal — there's no "previous" to compare against.

### 7.2 Screenshots

**Required (one device size minimum, must be the largest you support):**
- 6.7" Display (iPhone 16 Pro Max): **1290 × 2796 px** — *required for iOS submissions*

**Optional but recommended for better presentation:**
- 6.1" Display (iPhone 16 Pro): 1206 × 2622 px
- iPad 13" (iPad Pro M4): 2064 × 2752 px — *required if app supports iPad*
- iPad 12.9": 2048 × 2732 px — *required if app supports iPad*

**3–10 screenshots per device size.** Recommended sequence (tells the story):
1. Morning practice hero — sets the daily-ritual frame
2. Stoic principle of the day — shows philosophical depth
3. Breathing exercise mid-flow — shows interactive practice
4. Evening reflection — closes the daily loop
5. Crisis support screen (shows 988 button) — demonstrates safety architecture
6. Progress / history view — shows continuity over time

`[BLOCKED]` Screenshots require actual builds. Produce closer to submission. The Being design system's `morning|midday|evening` themes give you a natural visual progression across the screenshot set.

### 7.3 App Preview Videos (optional)

15–30 seconds each, 1–3 per device size. Skip for 1.0 unless you already have polished footage. Apps without preview videos are not penalized.

### 7.4 Copyright (≤100 chars)

`© 2026 Palouse Labs LLC`

---

## 8. Decisions checklist for Max

### Decided as of 2026-05-21

- [x] **Display name:** `Being` (no trailing period)
- [x] **Pricing:** $9.99/mo, $79.99/yr (subscription)
- [x] **Privacy Policy URL:** `https://being.fyi/privacy`
- [x] **Login required:** No (no auth code in v1.0)
- [x] **Privacy nutrition labels:** Health (Not Linked) + Diagnostics/Crash (Not Linked); no tracking
- [x] **Age rating:** 17+ recommended (aligns with 18+ TOS minimum and PHQ-9 Q9 content)

### Open — quick decisions

- [ ] **Subtitle:** pick one of the 4 candidates in §2.2, or propose your own
- [ ] **Promotional text:** approve §2.3 draft or revise
- [ ] **Description:** approve §2.4 draft or revise (key sub-choice: name PHQ-9/GAD-7 explicitly, or keep as "well-being check-ins"?)
- [ ] **Keywords:** approve §2.5 list or swap (esp. `calm` vs. `tranquility`/`serenity`)
- [ ] **Secondary category:** `Lifestyle` or blank?
- [ ] **Availability:** all territories (default), or restrict?
- [ ] **Content rights:** confirm Being uses only public-domain translations (George Long's Marcus Aurelius, etc.) or your own translations — *not* copyrighted modern translations like Gregory Hays's *Meditations*
- [ ] **Free trial duration:** "1 month" (Option A in §4.2 — closest to existing 28-day marketing) or "2 weeks" (Option B — exact)
- [ ] **Update being.fyi copy:** change "28-day free trial" language to match Apple-supported duration

### Open — content alignment between site and app

**Currently live and verified on being.fyi (per footer audit 2026-05-21):**
- [x] `/privacy` — keep as-is (verify it matches canonical `docs/legal/privacy-policy.md` v1.0)
- [x] `/terms` — keep as-is
- [x] `/crisis` — ✅ production-quality, accurate hotline numbers (988, 741741, Trevor Project, NAMI), no placeholders. No changes needed.

**Currently live, needs fixing before App Review:**
- [ ] **Delete `/hipaa` + remove footer link.** Draft banner, `[TO BE DETERMINED]` placeholders, and un-lawyered voluntary HIPAA-equivalent commitments make this a multi-vector liability. Page is in the global footer so every page on being.fyi advertises it — highest-visibility risk. Delete route AND remove `HIPAA Notice` link from `Legal` footer section.
- [ ] **Fix `/cookie-policy` date.** Currently shows `Last Updated: [DATE - TO BE DETERMINED]`. Content is honest and accurate ("we don't use cookies" + minimal server log disclosure with 30-day retention). Replace placeholder with actual last-updated date. Keep page — it's an asset for privacy-conscious positioning.
- [ ] **Fix `/accessibility` date.** Same placeholder issue. Content makes specific WCAG 2.1 AA claims including automated testing with aXe/Lighthouse and manual screen-reader testing. Two parts to this fix:
  - Replace `[DATE - TO BE DETERMINED]` with actual last-updated date
  - Verify each claim is true for v1.0. If aXe/Lighthouse automation or screen-reader testing isn't actually running today, soften those claims to "we design to WCAG 2.1 AA standards" without claiming ongoing audit processes. Same exposure pattern as /hipaa: don't make process commitments you can't fulfill.

**Medical disclaimer (path A — chosen 2026-05-21):** TOS Section 3 already contains the load-bearing medical-disclaimer language; user acknowledges via TOS acceptance. Decision: no separate page required.
- [x] ~~Edit canonical TOS to remove broken `/disclaimer` link~~ — applied to `docs/legal/terms-of-service.md` and `being-website/content/legal/terms-of-service.md` (uncommitted as of 2026-05-21)

**Ghost pages discovered on being.fyi** (deployed routes that aren't linked in the footer):

| Route | Source file | Verdict |
|---|---|---|
| `/disclaimers` (plural) | `content/legal/medical-disclaimer.md` | **Keep deployed (optional).** Content is substantive and accurate. With the TOS link removed, the page exists as an unlinked-but-valid asset. No action required, but if you want to be ruthlessly minimal, delete the route + content file. |
| `/privacy-practices` | `content/legal/notice-of-privacy-practices.md` | **Delete route + content file.** Same HIPAA-term-of-art problem as /hipaa: uses §164.520 terminology while stating Being isn't HIPAA-covered. Redundant with privacy policy. |
| `/do-not-sell` | `content/legal/do-not-sell.md` | **Spot-check, likely delete.** Being doesn't sell data — page is unnecessary. Probably has same TBD-date template artifact as /hipaa/cookie-policy/accessibility. CCPA "do not sell" obligation is satisfied by a statement in the privacy policy. |

**Pre-submission ghost-page cleanup:**
- [ ] **Delete `/privacy-practices` route + content file.** Same legal-exposure pattern as /hipaa.
- [ ] **Delete `/do-not-sell` route + content file** (unless privacy policy explicitly delegates here — then spot-check and fix date).
- [ ] **Decide `/disclaimers` fate:** keep as unlinked asset, or delete for full minimalism.

**Verifications still owed:**
- [ ] Confirm deployed `being.fyi/privacy` matches `docs/legal/privacy-policy.md` (canonical v1.0, 2025-12-12). Sync if drifted.
- [ ] Confirm email aliases `support@being.fyi` and `accessibility@being.fyi` (linked in footer) actually deliver. Send a test email to each.

**Pre-launch (before Being ships to App Store):**
- [ ] **Remove front-page signup gate on being.fyi.** Currently being.fyi serves a signup form as the landing page; the rest of the site is reachable by direct URL but invisible from the homepage. When Being launches, App Store users discovering being.fyi shouldn't hit a gate — they should land on something that explains what Being is and links to the App Store. Not urgent until Apple Developer enrollment approves, but a blocker before submission.
- [ ] **Verify reviewer notes (§6.3) match the actual onboarding flow** at submission time — specifically the "after N free sessions" paywall threshold.

### Blocked by Apple Developer Program enrollment

- [ ] Register bundle ID `com.palouselabs.being` at developer.apple.com
- [ ] Create App Store Connect app record
- [ ] Generate distribution certificate
- [ ] Create App Store provisioning profile
- [ ] Sign Paid Apps Agreement (required for subscription IAP)
- [ ] Configure both subscription products + group in ASC
- [ ] Upload first build via Xcode / Transporter
- [ ] Generate screenshots from real build (6.7" minimum)
- [ ] Submit for App Review
