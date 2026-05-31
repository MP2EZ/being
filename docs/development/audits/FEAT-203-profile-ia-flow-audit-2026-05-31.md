# FEAT-203 — Profile Screen IA & Flow Audit

**Date:** 2026-05-31
**Ticket:** [FEAT-203 — Profile screen IA & flow audit](https://www.notion.so/371a1108c20881e4bfc5f965b5f8cc0e)
**Author:** `/b-work feat-203` — audit authored by the `ux` specialist; protected-path invariants set by the `crisis`, `compliance`, and `philosopher` specialist agents.
**Scope:** Information architecture, grouping, naming, navigation of the Profile screen and its subscreens. **Design recommendation only — no code changes ship from this work item.** Implementation splits into the validated tranches in §7.
**Grounded in:** `app/src/features/profile/` as read on branch `feat/feat-203-profile-screen-ia-flow-audit`.

---

## TL;DR

The founder's complaint — "the Profile screen is getting pretty long" — is a **symptom**. The disease is **ambiguity, not length**. The page reads as one undifferentiated scroll because 11 cards across 6 flat sections intermix five unrelated mental models (app config, wellness screening, commerce, privacy/legal, brand/education), and the single sharpest defect is a **naming collision**: two adjacent near-synonym cards ("App Settings" / "App Preferences") route to different destinations, and the destination screen contradicts the label you tapped.

| Finding | Severity | Pure-IA or protected path |
|---|---|---|
| C1 — "App Settings" vs "App Preferences" naming collision (3 names for 1 path) | **Critical** | Pure-IA |
| H1 — 4 dead-end disabled Account cards + "🚧 Implementation Status" TODO box ship to users | **High** | Protected (compliance) |
| H2 — "About Being." card is a "coming soon" placeholder behind a confident label | **High** | Pure-IA |
| H3 — Flat single-level IA mixes 5 unrelated mental models | **High** | Protected (assessment) |
| M1 — ~120 lines of Stoic Mindfulness article inlined in the 849-line root component | **Medium** | Protected (philosopher) |
| M2 — "App Preferences" card description lists its *siblings'* contents | **Medium** | Pure-IA |
| M3 — `✕` (modal-dismiss) close affordance on forward-navigated pages | **Medium** | Pure-IA (bundled w/ nav) |
| M4 — Cloud Backup buried two levels deep, conditionally invisible | **Medium** | Protected (compliance) |

**Recommended shape:** 6 flat sections → 3 intent clusters (**Check-ins / Settings / About** + a **Your Plan** card), promote assessments to the top, resolve the naming collision, and stop shipping dead-end/placeholder affordances. The pure-IA wins (C1, H2, H3, M2) deliver ~80% of the "flow" complaint at **zero navigation-model risk**. The deeper state-machine→React-Navigation migration is the right long-term call but is the **only** change that endangers the crisis overlay, so it ships **last, behind crisis-agent sign-off and a green `e2e:safety:crisis-button`**, never bundled with the cheap wins.

---

## 1. Current-State IA Inventory

### 1.1 Navigation model (as built)

The Profile tab is **two unrelated navigation systems stacked**:

- **React Navigation stack** (`useNavigation` / `RootStackParamList`) for *outbound* destinations that leave Profile: `LegalGate` (onboarding), `AssessmentFlow`, `Subscription`, `CrisisResources`.
- **A local `useState` machine** (`ProfileScreen.tsx:44-47`) — `currentScreen: 'menu'|'account'|'privacy'|'appSettings'|'about'|'stoicMindfulness'|'legal'` — for *inbound* subscreens that stay "inside" the Profile component. Each is a child component rendered conditionally (`renderContent()`, L:573-604) and dismissed by an `onReturn`/`onClose` callback rather than a nav pop.

Two of those subscreens run **their own nested `useState` sub-machines**:
- `PrivacyDataScreen` → `showCloudBackup` boolean → renders `CloudBackupScreen` (L:228-230).
- `LegalDocumentsListScreen` → `selectedDocument` state → renders `LegalDocumentScreen` (L:41-50).

Real depth is **three levels in places**, all hand-rolled, none visible to React Navigation. The `CollapsibleCrisisButton` (L:606-617) renders *outside* `renderContent()`, as a sibling overlay to the whole switch — **this is correct and is the one structural decision to preserve verbatim** (it is why the crisis button persists across every state).

### 1.2 Content tree (root + leaves, with tap depth)

Tap depth counted from the Profile tab already open (tab tap = 0).

```
Profile (tab)  [ProfileScreen.tsx — currentScreen='menu']
│  persistent: CollapsibleCrisisButton overlay (all screens)  → CrisisResources (RN stack)
│
├─ § Setup & Configuration
│   ├─ Onboarding Setup ........... 1 tap → RN stack 'LegalGate' (leaves Profile)   [L:208]
│   └─ App Settings ............... 1 tap → state 'appSettings' → AppSettingsScreen  [L:222]
│         ├─ Notifications: Check-in / Breathing / Values toggles
│         ├─ Accessibility: Text Size, Reduce Motion, High Contrast
│         ├─ App Information: Version, Last Updated
│         └─ Reset to Defaults (destructive)
│
├─ § Wellbeing Tracking
│   ├─ Depression Assessment (PHQ-9) ... 1 tap → RN stack 'AssessmentFlow' phq9      [L:249]
│   ├─ Anxiety Assessment (GAD-7) ...... 1 tap → RN stack 'AssessmentFlow' gad7      [L:272]
│   └─ Learn about assessment scoring .. 1 tap → ThresholdEducationModal (modal)     [L:295]
│
├─ § Subscription
│   └─ Subscription status card ....... 1 tap → RN stack 'Subscription'              [L:317]
│
├─ § Preferences
│   ├─ App Preferences ................ 1 tap → state 'account' → AccountSettingsScreen [L:343]
│   │     (UI screen title reads "Account Settings" — naming collision, §2 C1)
│   │     ├─ Account Information: Email, Member Since
│   │     ├─ Security: Change Password [DISABLED FEAT-16], Logout [DISABLED FEAT-58]
│   │     ├─ Data Management: Export Your Data [DISABLED FEAT-29]
│   │     ├─ Danger Zone: Delete Account [DISABLED FEAT-59]
│   │     └─ "🚧 Implementation Status" TODO box (ships to users)
│   └─ Privacy & Data ................. 1 tap → state 'privacy' → PrivacyDataScreen   [L:357]
│         ├─ Universal Opt-Out (GPC equivalent)
│         ├─ Data Sharing: Analytics, Crash Reports, Settings Backup, Research
│         ├─ Manage Cloud Backup [flag-gated cloud_sync] .. +1 tap → CloudBackupScreen (depth 2)
│         └─ Storage Locations: Check-ins / Assessments / Crisis / Preferences
│
└─ § Information
    ├─ About Being. ................... 1 tap → state 'about' → renderPlaceholder()   [L:381]
    │     ("This feature is coming soon" — PLACEHOLDER, ships to users)
    ├─ About Stoic Mindfulness ........ 1 tap → state 'stoicMindfulness'              [L:395]
    │     → renderAboutStoicMindfulness() — ~120 lines inline JSX (L:451-570)
    └─ Legal Documents ................ 1 tap → state 'legal' → LegalDocumentsListScreen [L:409]
          └─ {Privacy Policy, Terms of Service, Medical Disclaimer,
              California Privacy Rights, Multi-State Privacy Rights, Support}
              .. +1 tap each → LegalDocumentScreen (depth 2)
```

**Totals:** 11 pressable cards across 6 sections on the root, + 1 modal link, + a dev-mode banner (`isDevMode()`, L:175), + the persistent crisis overlay. The root component is **849 lines** because it carries the menu, the entire Stoic Mindfulness article inline, the placeholder renderer, and all styles for all of it.

### 1.3 Header inconsistency already in the code

`SubMenuHeader` uses an `✕` (close) glyph with `accessibilityHint="Returns to profile menu"` — **modal-dismiss semantics**, but the screens behave like **pushed pages** (you went forward into them). `✕` on a forward-navigated page is a mental-model mismatch (§2 M3).

---

## 2. Heuristic Evaluation (ranked by severity)

Severity = likelihood × user impact. Each tagged with the violated principle.

### CRITICAL

**C1 — "App Settings" vs "App Preferences" naming collision.**
*Heuristics: #2 Match system & real world, #4 Consistency & standards, information scent.*
Two adjacent root cards with near-synonymous labels route to different destinations: "App Settings" (L:229) → notifications/accessibility/version/reset; "App Preferences" (L:350) → account email/password/logout/export/delete. They sit in *different sections* (Setup & Configuration vs Preferences), so the user can't compare them side by side. Worse, "App Preferences" opens a screen whose own `SubMenuHeader` title reads **"Account Settings"** (`AccountSettingsScreen.tsx:94`) — **three words ("Preferences", "Settings", "Account") for one path.** *Impact:* a user looking for "log out" or "delete account" has a coin-flip chance of guessing right, and the label they land on contradicts the label they tapped. The single clearest cause of the founder's "how do I flow through this" complaint.

### HIGH

**H1 — Dead-end disabled controls shipped as primary affordances.**
*Heuristics: #1 Visibility of system status, #5 Error prevention, Hick's law.*
`AccountSettingsScreen` presents Change Password, Logout, Export Data, and Delete Account as tappable cards (`onPress` L:56-90) that only fire an "⚠️ Development Mode … Requires FEAT-16/58/29/59" alert. The screen also renders a literal **"🚧 Implementation Status" engineering TODO box** (L:189-204) referencing `FEAT-6-ARCHITECTURE.md` to end users. *Impact:* every actionable-looking control on this screen is a trap; the screen reads as broken. "Delete Account" looking available but refusing is an especially bad trust signal for a wellness app.

**H2 — "About Being." is a coming-soon placeholder behind a confident label.**
*Heuristics: #1 Visibility of system status, #8 Aesthetic & minimalist.*
The card promises "Learn about our mission… and how Being. supports your mental wellbeing" (L:389) but `renderPlaceholder('About Being.', …)` returns "This feature is coming soon" (L:443). *Impact:* the most brand-defining card in the menu is empty — and because the *adjacent* "About Stoic Mindfulness" card is fully built (120 lines of real content), the empty one looks like a bug, not a roadmap.

**H3 — Flat single-level IA mixes five unrelated mental models.**
*Heuristics: #4 Consistency, Miller's law / chunking, Gestalt proximity.*
Six sibling sections at one level intermix app config, wellness screening (a *task*, not a setting), commerce (subscription), privacy/legal compliance, and brand/education. No hierarchy beyond a `sectionTitle` text style — same weight, same card, same gray. *Impact:* reads as one long undifferentiated scroll (the founder's "getting pretty long"), with no visual anchor for "where do settings live vs where do I *do* something."

### MEDIUM

**M1 — ~120 lines of Stoic Mindfulness article inlined in the root component.**
*Maintainability / single-responsibility (architecture — the engine behind the "long" problem).*
`renderAboutStoicMindfulness()` (L:451-570) hard-codes an entire educational article — five principles, four developmental stages, three philosophers — inside `ProfileScreen.tsx`, plus its own `principleCard`/`bodyText` styles. This is *content*, not navigation, living in the menu component. *Impact (indirect):* bloats the file to 849 lines, makes every IA change risky, and the content can't be reused (e.g., surfaced from onboarding or practices) without copy-paste.

**M2 — Self-referential / redundant card description.**
*Heuristics: #6 Recognition over recall, information scent.*
The "App Preferences" card description says it manages "notifications, accessibility, and privacy options" (L:351) — but notifications/accessibility live in **App Settings** and privacy lives in **Privacy & Data**, not in the screen this card opens. The card describes its *siblings'* contents. *Impact:* actively misdirects; a user wanting notifications is told to tap the one card that doesn't have them.

**M3 — `✕` close affordance on forward-navigated pages.**
*Heuristics: #3 User control & freedom, #4 Consistency, iOS HIG.*
`SubMenuHeader` shows a top-left `✕` (dismiss) on screens the user pushed *into*. iOS convention for a pushed page is a back chevron ("‹ Profile"); `✕` signals a modal you're escaping. Combined with no system back gesture (local state, not a nav stack), the only way out is that small glyph. *Impact:* mild disorientation; swipe-back silently does nothing.

**M4 — Cloud Backup buried two levels deep and conditionally invisible.**
*Heuristics: #6 Recognition over recall, discoverability.*
"Manage Cloud Backup" only appears inside Privacy & Data, only when the `cloud_sync` flag is on (L:340), nested under "Data Sharing" next to a *separate* "Settings Backup" toggle. *Impact:* when it ships, two backup-named things sit adjacently with unclear relationship; the manage screen is depth-2 with no scent from the root.

### LOW

- **L1 —** Dev-mode banner renders inside the production menu tree (`devMode && …`, L:175). Correctly gated, but one more thing the root owns.
- **L2 —** Assessment cards mix "task" affordance with "status badge" under a "Tracking" heading that frames them as passive logs rather than the active 3–5-min tasks they are. The badges themselves are a strength to preserve.
- **L3 —** "Learn about assessment scoring" is a different interaction type (modal) presented as a third list item with a distinct underlined-link style — inconsistent with the surrounding card pattern.

---

## 3. Proposed Reorganized IA

### 3.1 Design principles applied

1. **Separate *doing* from *configuring*.** Wellness screening is a task, not a setting — it should not sit in the same flat list as "Reduce Motion."
2. **One settings home, not two collided ones.** Collapse the App Settings / App Preferences / Account confusion into a single "Settings" hub with clearly named sub-areas.
3. **Group by user intent, not by feature team.** Five sections → three intent clusters: *Check-ins, Settings, About* (+ a *Your Plan* card).
4. **Hide what isn't real yet.** Don't ship dead-end and placeholder cards as first-class affordances.

### 3.2 Proposed root (ASCII wireframe)

```
┌─────────────────────────────────────────────┐
│  Your Profile                            (1) │  h1
│  Personalize your Being. experience          │
├─────────────────────────────────────────────┤
│                                              │
│  WELLBEING CHECK-INS                     (2) │  h2  ← promoted to top, task framing
│  Self-screening tools. Recommended every 2 wks│
│  ┌────────────────────────────────────────┐ │
│  │ Depression (PHQ-9)        [Recommended]│ │  → AssessmentFlow phq9   (unchanged)
│  │ 3–5 min · Last completed 12 days ago   │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ Anxiety (GAD-7)               [Due Soon]│ │  → AssessmentFlow gad7   (unchanged)
│  │ 2–4 min · Last completed 20 days ago   │ │
│  └────────────────────────────────────────┘ │
│  ⓘ How scoring works                         │  → ThresholdEducationModal (inline link, co-located)
│                                              │
│  YOUR PLAN                               (2) │  h2  (renamed from "Subscription")
│  ┌────────────────────────────────────────┐ │
│  │ Free Trial — 18 days remaining      →  │ │  → Subscription   (unchanged)
│  └────────────────────────────────────────┘ │
│                                              │
│  SETTINGS                                (2) │  h2  ← single hub, collision resolved
│  ┌────────────────────────────────────────┐ │
│  │ Notifications & Display             →  │ │  → AppSettings   (was "App Settings")
│  │ Reminders, text size, motion, contrast │ │
│  ├────────────────────────────────────────┤ │
│  │ Privacy & Data                      →  │ │  → Privacy (unchanged dest + name)
│  │ Sharing, opt-out, storage, backup      │ │
│  ├────────────────────────────────────────┤ │
│  │ Account                             →  │ │  → Account (was "App Preferences")
│  │ Email, sign-in, export, delete         │ │     [see §3.5: gate until FEAT-16/29/59]
│  └────────────────────────────────────────┘ │
│                                              │
│  ABOUT                                   (2) │  h2  (renamed from "Information")
│  ┌────────────────────────────────────────┐ │
│  │ Stoic Mindfulness                   →  │ │  → StoicMindfulness (content extracted, §7-S3)
│  │ The 5 principles & how the app uses them│ │
│  ├────────────────────────────────────────┤ │
│  │ About Being.                        →  │ │  → AboutBeing  [SHIP ONLY WHEN REAL — §3.5]
│  ├────────────────────────────────────────┤ │
│  │ Legal & Support                     →  │ │  → LegalDocuments (unchanged dest)
│  │ Privacy Policy, Terms, Disclaimer…     │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Onboarding Setup  ↻  (text link, footer)    │  → LegalGate (demoted from a full card)
└─────────────────────────────────────────────┘
                              ◎ Crisis  ← persistent overlay, UNCHANGED
```

### 3.3 Before → After (renames / moves / removals)

| Item | Before | After | Rationale |
|---|---|---|---|
| Notif/accessibility hub | **"App Settings"** (§ Setup) | **"Notifications & Display"** (§ Settings) | Concrete contents, kills synonym collision |
| Account hub | **"App Preferences"** card → screen titled **"Account Settings"** | **"Account"** (card *and* screen title match) | One word, one place; resolves the 3-name path |
| Subscription | **"Subscription"** | **"Your Plan"** | Warmer, action-framed; section + card aligned |
| Information section | **"Information"** | **"About"** | Plain language; "Information" is a filler label |
| Assessments | mid-page under "Wellbeing Tracking" | **top**, under "Wellbeing Check-ins" | Tasks first; matches why people open Profile |
| Onboarding Setup | full card, top of menu | **footer text link** | One-time/rare re-entry, not a daily nav target |
| "Learn about assessment scoring" | full-width link row | inline **ⓘ** beside the section | Demote modal trigger; declutter (keep co-located — AS-5) |
| About Being. | placeholder card | **gated** — hidden until content exists | Stop shipping "coming soon" (H2) |
| Account dead-ends | 4 disabled cards + TODO box | **gated** — see §3.5 | Stop shipping traps (H1) |

Net root card count: **11 → 8 visible cards** (Onboarding demoted to a link; About Being. hidden until real). Three clean intent clusters instead of six flat sections.

### 3.4 Subscreen nesting (unchanged destinations, clarified hierarchy)

```
Settings ─┬─ Notifications & Display   (= today's AppSettingsScreen)
          ├─ Privacy & Data            (= today's PrivacyDataScreen)
          │     └─ Manage Cloud Backup (flag-gated, depth 2 — keep, but see M4)
          └─ Account                   (= today's AccountSettingsScreen, real actions only)

About ────┬─ Stoic Mindfulness         (content extracted out of ProfileScreen)
          ├─ About Being.              (gated until real)
          └─ Legal & Support           (= today's LegalDocumentsListScreen)
                └─ <document>           (depth 2 — keep)
```

### 3.5 Gating the unreal (resolves H1, H2) — touches protected paths

- **About Being.**: don't render the card until the screen has content. Pure-IA, trivial.
- **Account dead-ends**: the cleanest user-facing fix is to **not render** Change Password / Logout / Export / Delete until their FEATs ship, and delete the "🚧 Implementation Status" box. **But Export (FEAT-29) and Delete (FEAT-59) are privacy/compliance commitments** (right-to-access / right-to-deletion — see §5). Removing even disabled affordances needs **`compliance` review** before implementation, because "we show users where deletion *will* live" may be a deliberate transparency choice. **Recommendation:** replace four fake buttons with one honest **"Coming soon: data export & account deletion"** info row, wording confirmed by `compliance`. This is the one place the IA change crosses a protected path.

### 3.6 Navigation model: **migrate state machine → React Navigation stack** (recommended, later)

The hand-rolled `currentScreen` machine plus two nested `useState` sub-machines (`showCloudBackup`, `selectedDocument`) is the root cause of M3 and the awkward depth-2 flows, and worsens as the menu grows.

| | Keep local state machine | **Migrate to RN stack (recommended)** |
|---|---|---|
| Back gesture (iOS swipe-back) | ✗ does nothing | ✓ free |
| Header pattern | `✕` modal-dismiss (M3) | ✓ native back chevron "‹ Profile" |
| Per-screen deep-linking / analytics | ✗ all reads as "ProfileScreen" | ✓ each screen is a real route |
| Depth >2 (Privacy→Cloud, Legal→Doc) | hand-rolled nested booleans | ✓ native push/pop |
| Crisis overlay | sibling to switch (works) | **must move to navigator-level wrapper — non-trivial, must preserve <3-tap/persistent guarantee** |
| Root component size | 849 lines (everything inline) | splits naturally into route files |
| Effort | XS (status quo) | **M–L** (nested navigator + crisis-overlay re-host) |

**The catch:** the crisis overlay works *because* it's a sibling to the local switch (L:606-617). Migrating to a nested stack requires re-hosting the overlay at the navigator level (a wrapper around `<Stack.Navigator>`, or a shared header) so it still renders on **every** route including depth-2. This is the **highest-risk part** of the migration and a protected-path concern — it must be validated against `npm run e2e:safety:crisis-button` and the `<200ms` / `<3 taps` / `<3s` budgets. **Do not migrate navigation without `crisis`-agent sign-off and a green Maestro crisis-button flow on the new structure.**

**Pragmatic sequencing:** the *naming, grouping, gating* fixes (C1, H1, H2, H3, M2) deliver ~80% of the "flow" complaint and are **pure-IA, zero nav-model risk**. Ship those first. Treat the migration and the inline-content extraction as **separate, later tranches**. Don't couple them.

---

## 4. Prioritized Recommendations (Must / Should / Could)

Effort: XS (<½ day) · S (~1 day) · M (2–3 days) · L (>3 days). "Protected" = touches crisis/assessment/privacy/Stoic and needs specialist review + a follow-up implementation FEAT.

### MUST

| # | Change | Effort | Protected? | Depends on |
|---|---|---|---|---|
| C1 | Resolve naming collision: "App Settings"→"Notifications & Display", "App Preferences"→"Account"; make `AccountSettingsScreen` header read "Account" to match. | S | No (pure-IA) | — |
| H1 | Stop shipping the 4 disabled Account cards + "🚧 Implementation Status" box as live affordances; replace with one honest "coming soon" info row. | S | **Yes** (compliance) | C1 |
| H3 | Re-cluster 6 flat sections → Check-ins / Your Plan / Settings / About; promote assessments to top. | M | **Yes** (assessment — `crisis` confirms PHQ/GAD entry points stay obvious & thresholds untouched) | C1 |

### SHOULD

| # | Change | Effort | Protected? | Depends on |
|---|---|---|---|---|
| H2 | Gate "About Being." card until real content exists. | XS | No | — |
| M2 | Fix the "App Preferences"/Account card description that lists siblings' contents. | XS | No | C1 |
| M1 | Extract the ~120-line Stoic Mindfulness article out of `ProfileScreen.tsx` into its own screen/content module. | M | **Yes** (philosopher — verbatim content integrity) | — |

### COULD

| # | Change | Effort | Protected? | Depends on |
|---|---|---|---|---|
| Nav | Migrate `currentScreen` machine + nested booleans → nested RN stack; re-host crisis overlay at navigator level. | L | **Yes** (crisis — overlay reachability/latency re-validated) | M1, `e2e:safety` green |
| M3 | Swap `SubMenuHeader` `✕` for a native back chevron (falls out of the nav migration). | S | bundled w/ Nav | Nav migration |
| M4 | Clarify Cloud Backup vs "Settings Backup" toggle relationship; consider surfacing backup status one level up. | S | **Yes** (compliance/privacy) | — |
| L2/L3 | Reframe assessment section as active tasks; normalize the "scoring" link to inline ⓘ. | XS | assessment-adjacent | H3 |

**Dependency spine:** C1 unblocks H1/H3/M2. M1 (content extraction) should land *before* the nav migration so the root is smaller and the migration diff is reviewable. The nav migration is the only L and the only one gated on `e2e:safety` — keep it last.

---

## 5. Protected-Path Invariants (NON-NEGOTIABLE)

These were set by the specialist agents and bind any downstream implementation. The Profile is a protected path (CLAUDE.md): edits invoke the `crisis` agent (crisis button + assessment thresholds), `compliance` (privacy/wellness data), and `philosopher` (Stoic content).

### 5.1 Crisis & assessment (`crisis` agent)

Crisis button wiring: `ProfileScreen.tsx:27` (eager import), `:606-617` (overlay outside `renderContent()`). Assessment cards: `:249-293`; status logic `:95-159`.

- **CB-1 Reachability** — 988 stays **<3 taps / <3s** from any Profile screen; button response budget **<200ms** (`CollapsibleCrisisButton.tsx:183-212`). No intermediate tap, modal, or section-expand may be inserted.
- **CB-2 Persistent overlay** — renders *outside* the `currentScreen` switch; persists across all states. Any new subscreen / nested navigator MUST keep it as a sibling overlay above all routes, never inside a single screen's subtree.
- **CB-3 Never in collapsible content** — MUST NOT move into/behind any accordion, tab, "More" menu, or scrollable list. Stays absolute-positioned, always visible.
- **CB-4 Not displaced** — new sections MUST NOT re-anchor, overlap, or push it off-screen (`zIndex: 9999`, `bottom`, `position="right"` preserved).
- **CB-5 Eager-imported** — keep the static top-of-module import; never `React.lazy`/dynamic.
- **CB-6 Mode floor** — Profile uses `mode="standard"` (full opacity); MUST NOT downgrade to `immersive` (starts faded). `prominent` is acceptable.
- **CB-7 testID** — `testID="crisis-profile"` preserved (safety e2e targets it).
- **AS-1 Entry points** — PHQ-9 and GAD-7 each keep a discoverable, separately-actionable entry labeled by instrument name; neither merged nor collapsed-by-default.
- **AS-2 Thresholds untouchable** — PHQ-9 ≥15 / ≥20, Q9>0; GAD-7 ≥15. The launch contract (`assessmentType`, `context: 'standalone'`) must preserve downstream crisis detection (zero false negatives, audit-logged).
- **AS-3 Status badges not color-only** — text label + `accessibilityLabel` retained (`:148-159`, `:254-281`); WCAG 1.4.1.
- **AS-5 Education link co-located** — "Learn about assessment scoring" → `ThresholdEducationModal` stays adjacent to the assessment cards.
- **AS-6 No crisis-detection bypass** — an assessment entry point MUST NOT exist on any screen lacking the crisis overlay.

### 5.2 Privacy & wellness data (`compliance` agent)

Source of truth: `docs/legal/regulatory-applicability.md` (FTC Act §5, FTC HBNR, CCPA/CPRA, TDPSA, VCDPA, CPA, GDPR; **HIPAA does not apply**).

- **Universal Opt-Out (GPC)** — `PrivacyDataScreen.tsx:248-274` must stay the **first interactive control** in the privacy destination, above all data-sharing toggles; never collapsed or a tap deeper.
- **Four data-sharing toggles** (`:283-376`) — analytics, crash reports, settings backup, research — remain visible in a single, scannable list; never split across subscreens. Default privacy-preserving (all false, `:178-183`); the opt-out→toggles override relationship stays intact.
- **Storage-location transparency** (`:391-427`) — reachable within one tap of the opt-out; never relocated to an "About"/"Help" section.
- **Consent-gate independence** — UI visibility/grouping MUST NEVER substitute for the data-operation consent gate (`CloudBackupScreen.tsx:28-31`: `cloud_sync` flag gates UI; `CloudBackupService` independently checks `cloudSyncEnabled` before egress). A reorg may simplify UI but the consent value stays user-settable and is evaluated at the data operation.
- **Six legal docs** — all remain reachable from Profile, **offline** (bundled, `LegalDocumentsListScreen.tsx:7-9`); no refactor introduces a network dependency. Keep the "Medical Disclaimer" title (it correctly signals non-clinical nature).
- **FEAT-29 / FEAT-59 placeholders** — "Export Your Data" and "Delete Account" are regulatory rights (CCPA §1798.100 / §1798.105 + state analogues). They must keep named, first-class entry points in the final IA (Delete retains "Danger Zone" prominence); evaluate every grouping against "does this still work when FEAT-29/59 ship?" FEAT-16/58 (logout/password) are security controls and may be regrouped under "Security."
- **Terminology drift to fix** (flag, fix alongside copy changes): `PrivacyDataScreen.tsx:383` "health data are NEVER shared" → **"wellness data"**; `:289` "personal or health information" → **"personal or wellness data"**; `AccountSettingsScreen.tsx:159` generic "encrypted" → cite **AES-256** when expanded. Prohibited everywhere: "PHI", "HIPAA-compliant", "clinical assessment", "patient data".

### 5.3 Stoic Mindfulness content (`philosopher` agent)

The inline block to extract: `ProfileScreen.tsx:451-570`. Canonical source: `docs/product/stoic-mindfulness/INDEX.md` (the rendered framework matches it exactly).

- **Extract byte-for-byte** — on extraction, preserve verbatim: the **five principles in order** (Aware Presence → Radical Acceptance → Sphere Sovereignty → Virtuous Response → Interconnected Living; the order encodes the V2 developmental arc — no resequencing); the **four developmental stages with exact timeframes** (Fragmented 1-6mo / Effortful 6-18mo / Fluid 2-5yr / Integrated 5+yr); the **three attributions with dates** (Marcus Aurelius 121-180 CE, Epictetus 50-135 CE, Seneca 4 BCE-65 CE). No paraphrase, no reorder, no citation edits inside an IA-only PR.
- **Placement** — keep "About Stoic Mindfulness" a single-tap peer of "About Being." in the About/Information cluster; do not bury below legal/settings or behind a "More" expander. It is the only in-app explainer of the framework users practice.
- **Naming** — keep "About Stoic Mindfulness" and "About Being." **distinct**; don't collapse into one "About" entry. Keep the literal phrase "Stoic Mindfulness" (not "Our Philosophy"/"Approach").
- **Separately-logged accuracy flag (do NOT fix in the IA PR):** the three *Meditations* citations (10:6, 5:1, 8:59 at L:490/504/511) are paired with paraphrases yet one (L:490) is wrapped in quotation marks as if a direct quote — an attribution risk. The *Enchiridion 1* citation for Sphere Sovereignty (L:497) is correct/canonical. Track separately: verify the three book:section refs against a named translation (Hays/Hard) or restyle as "inspired by" rather than quoted.

---

## 6. Accessibility Notes (WCAG AA preserved/improved)

- **Heading hierarchy** — currently correct (root `accessibilityLevel={1}` L:189; section titles `level={2}` L:201+). The §3 re-cluster keeps the 1→2 structure; renamed sections inherit `level={2}`. **Improvement:** when extracting Stoic Mindfulness (S3), its in-content section titles (currently plain text, no role, L:464+) should *gain* `role="header" level={2}`.
- **Tap targets** — `SubMenuHeader` close is 44×44 (L:48-53); legal cards `minHeight:76` (L:125); proposed cards keep `spacing[24]` padding → >44px. **Watch:** the demoted footer "Onboarding Setup" link and the inline ⓘ "scoring" trigger must each present a ≥44×44 hit area (padding, not just text size).
- **Screen-reader traversal** — clustering *improves* the flat 11-button swipe; fewer top-level items, clearer rotor headings. The assessment cards' rich `accessibilityLabel` (status spoken, L:254) is the non-visual alternative to the color badge — **preserve verbatim** when the cards move to the top.
- **No accordion proposed** — deliberately. The problem is *ambiguity*, not *length*; the re-cluster already shortens the page, and accordions risk a crisis/assessment entry ending up behind a collapsed header (forbidden by CB-3/AS-1). If length still concerns post-recluster, the safe lever is the nav migration (push subscreens), not hiding root items.
- Validators for any implementation: `npm run test:accessibility` / `validate:accessibility` on every UI tranche.

---

## 7. Follow-up Implementation Slices

Each tranche is independently shippable, <400 LOC, carries at most one protected-path risk, and becomes its own FEAT off this design doc.

**Slice 1 — Naming & grouping** *(pure-IA + assessment-label review).*
C1 + M2 + H2 + H3. Rename labels, re-cluster sections, gate About Being., fix the misleading description. Touches `ProfileScreen.tsx` menu render + `AccountSettingsScreen` header title. *Validators:* `test:accessibility`; `crisis` confirms PHQ/GAD entry points still obvious. **Effort: M. Ships the bulk of the founder's ask.**

**Slice 2 — Honest Account screen** *(protected: compliance).*
H1. Remove the 4 dead-end cards + TODO box; add one "coming soon: export & deletion" info row. *Validators:* `compliance` (transparency wording for FEAT-29/59 rights). **Effort: S.**

**Slice 3 — Stoic content extraction** *(protected: philosopher).*
M1. Move `renderAboutStoicMindfulness()` (L:451-570) + styles into a dedicated `AboutStoicMindfulnessScreen` / content module; root drops ~150 LOC. *Validators:* `philosopher` verifies the five principles / four stages / verbatim attributions survive; `test:accessibility` for new heading roles. **Effort: M. Land before Slice 4.**

**Slice 4 — Navigation migration** *(protected: crisis — highest risk).*
Replace the `currentScreen` machine + nested booleans with a nested React Navigation stack; re-host `CollapsibleCrisisButton` at navigator level; swap `✕` → back chevron (M3). *Validators:* **`crisis` sign-off required**; `npm run e2e:safety:crisis-button` passes from every route; verify <200ms / <3 taps / <3s on-device. **Effort: L. Land last, after Slice 3 shrinks the root.**

**Slice 5 (optional) — Backup clarity & polish.**
M4 + L2/L3. Clarify Cloud Backup vs Settings Backup; reframe assessment task framing; normalize the scoring link. *Validators:* `compliance` for backup wording. **Effort: S.**

---

## Files referenced

- `app/src/features/profile/screens/ProfileScreen.tsx` (root, 849 lines — state machine L:44-47, 573-604; inline Stoic content L:451-570; crisis overlay L:606-617; assessment cards L:249-293)
- `app/src/features/profile/screens/AccountSettingsScreen.tsx` (dead-ends L:56-90, 122-179; TODO box L:189-204; header title "Account Settings" L:94)
- `app/src/features/profile/screens/AppSettingsScreen.tsx` (header title "App Settings" L:141)
- `app/src/features/profile/screens/PrivacyDataScreen.tsx` (opt-out L:248-274; toggles L:283-376; nested cloud-backup machine L:164, 228-230; storage L:391-427; terminology L:289, 383)
- `app/src/features/profile/screens/LegalDocumentsListScreen.tsx` (offline bundle L:7-9; nested doc machine L:41-50)
- `app/src/features/profile/screens/CloudBackupScreen.tsx` (flag/consent independence L:28-31)
- `app/src/features/profile/components/SubMenuHeader.tsx` (`✕` close affordance, L:28, 44px target L:48-53)
- `app/src/features/profile/content/legalDocuments.ts` (6 legal docs)
- `docs/product/stoic-mindfulness/INDEX.md` (canonical framework — extraction must stay consistent)
- `docs/legal/regulatory-applicability.md` (regulatory source of truth)
