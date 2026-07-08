---
title: "Flow Composition Audit — Four-Lens Review of Being's Core Flows"
work_item: "FEAT-286"
category: "Product / Flow Strategy"
status: "Report-only spike (zero app/ diffs)"
date: "2026-07-06"
reviewer: "Founder + specialist agents (philosopher, crisis, architecture)"
related:
  - "./stoic-mindfulness/INDEX.md"
  - "./stoic-mindfulness/practice/daily-architecture.md"
  - "./prioritization-framework-v2.md"
---

# Flow Composition Audit (FEAT-286)

**A four-lens heuristic review of Being's core flows, with a headline evaluation of the proposed single-loop restructure.**

## 0. Executive Summary

This is a **report-only** audit (no production code; zero `app/` diffs). It scores Being's
six core flows against four lenses — behavioral stickiness, philosophical building,
instructional UX, environmental graphic design — and produces a ranked set of follow-up
work items.

The audit was commissioned alongside a founder hypothesis worth stating up front:

> "Maybe the only loop is the original 5 steps — aware presence → radical acceptance →
> sphere sovereignty → virtues → social connection — and we drop morning/midday/evening,
> leaving just the loop with some variations plus the standalone learn modules."

**Headline verdict: the hypothesis is sound, and more faithful to Being's own framework
than the current three-flow layout — but only in its *conditional* form.** Three findings
drive the whole report:

1. **Your 5 steps already exist in code and docs as the canonical Five Principles, in
   canonical order.** The proposal is not "invent a new structure"; it is *promote the
   existing 5-principle spine to be the daily container, and demote morning/midday/evening
   from a structural axis to a posture parameter.* That is a far smaller, safer change than
   it sounds. (Architecture map §A; philosopher §2.)

2. **The app's only depth-progression mechanic is stranded in the Learn tab.** Every daily
   surface — including the loop you want to build — is stage-blind and identical
   day-to-day. The framework promises a staged developmental arc; the product delivers it
   in exactly one tab. This is the single most important product gap the audit surfaces.

3. **Time-of-day is genuine philosophical substance delivered as UI chrome.** Morning
   (prospective *praemeditatio*, Marcus *Meditations* II.1) and evening (retrospective
   *examen*, Seneca *De Ira* III.36) are *two different exercises*, not one exercise at two
   clock times. A **flat** time-agnostic loop discards that; a **single loop that carries a
   morning/evening tense** keeps it. Collapse the *screens*, keep the *tense*.

The recommended path is therefore **not** "rip out morning/midday/evening now," but:
prototype a single 5-step loop (with a tense parameter) behind a flag, on top of two
prerequisites that are worth doing regardless — a safety hardening (crisis button → root
mount) and the depth-progression wiring the framework already promises.

### Validity caveat (read this before trusting any score)

This is a **single-reviewer heuristic expert review** of the shipped code + TestFlight
build + framework docs. Being is **pre-launch with zero live users**, so there is **no
usage data, no funnel, no retention signal, no A/B evidence.** Every stickiness and
first-run claim is an *expert prediction*, not a measurement, and carries single-reviewer
bias. Scores are provisional and comparative (they rank flows against each other), not
absolute. Treat the ranked recommendations as *hypotheses to fund*, not conclusions.

---

## 1. Scoring Matrix (1–5 per lens)

Scale: **1** = generic / absent · **3** = competent · **5** = exemplary, unmistakably Being.
Philosophical-building scores are the `philosopher` agent's; the other three lenses are the
founder/product review (no dedicated `ux` agent — the UX lens is founder-driven, per the
work item).

| Flow | Behavioral stickiness | Philosophical building | Instructional UX | Environmental design | First-run verdict |
|---|:---:|:---:|:---:|:---:|---|
| Onboarding | 2 | 2 | 3 | 3 | Clear-but-heavy |
| **Daily check-in** (morning/midday/evening) | 3 | 4 | **2** | 4 | **Ambiguous** ⚠ |
| Practices (breathing / body-scan / reflection / sorting) | 2 | 3 | 2 | 4 | Ambiguous (discovery) |
| Assessment (PHQ-9 / GAD-7) | 2 | 1 | 3 | 2 | Clear |
| Learn | 2 | **5** | 4 | 3 | Clear |
| Profile / Settings | 1 | 2 | 3 | 2 | Clear |

**Reading the matrix:** philosophical depth (col 2) and daily stickiness (col 1) are
*inversely distributed* — the one deeply-staged surface (Learn = 5) has the weakest daily
return trigger (2), while the surface users return to daily (check-in = stickiness 3) is
stage-blind. The product's depth and its habit loop live in different rooms. Unifying them
is the through-line of every recommendation below.

---

## 2. Per-Flow Narratives

### 2.1 Onboarding — *stickiness 2 · philosophy 2 · instructional 3 · environmental 3*

Onboarding gives an accurate, philosopher-signed exposition of the Five Principles and four
cardinal virtues (`renderStoicIntro`, single-sourced from `practices/shared/constants/principles.ts`).
It is *correct* but *declarative and read-once*: a front-loaded philosophy briefing with no
commitment device to seed the daily habit and no thread that hands the user into their first
practice. **Depth-progression mechanic: none (flagged).** First-run is clear but heavy —
the philosophy arrives as an info-dump before the user has done anything.

### 2.2 Daily check-in — *stickiness 3 · philosophy 4 · instructional 2 · environmental 4*

This is the core of the product and the center of gravity for the whole audit.

- **Correction to the roadmap's mental model:** there is **no discrete "mood" check-in in
  the codebase.** The daily check-in *is* the three time-of-day practice flows
  (`practices/{morning,midday,evening}/*FlowNavigator.tsx`); they capture
  gratitude/intention/reflection/principle-engagement, **not a mood rating.** The "mood
  check-in" framing in older docs is a misnomer and should be retired.
- **Philosophy (4):** each flow operationalizes principles with correct classical grounding
  — Morning cites *Meditations* 2:1 and is prep-shaped; Evening is a Senecan *examen*;
  Midday is presence → sphere → virtue → compassion. Unmistakably Stoic, well-staged
  *within a session*. It loses a point because it is **identical every day** — it records
  `principleEngagement` for Insights but never adapts. **No cross-session developmental-stage
  mechanic (flagged).**
- **Instructional UX (2) — the audit's weakest surface and its headline first-run problem:**
  the Home screen presents **three near-identical cards** ("Morning Awareness / Midday Reset
  / Evening Reflection", all with interchangeable "mindful awareness" copy,
  `home/screens/CleanHomeScreen.tsx:196–224`). A first-run user is told neither what a
  check-in *is*, why there are three, which to pick, nor what the underlying model is.
  Outside the current time window two of three cards are dimmed-but-still-tappable →
  decision paralysis. This is exactly the ambiguity the single-loop proposal dissolves.
- **Environmental design (4):** the time-of-day theming, immersive mode, and breathing
  animation are the app's strongest atmospheric asset. *This is the thing to preserve
  carefully* in any restructure — collapse the three flows, but keep the atmosphere as a
  morning/evening posture (see §3).

### 2.3 Practices (standalone) — *stickiness 2 · philosophy 3 · instructional 2 · environmental 4*

The **sorting** drill (in-control vs. not-in-control, `SortingScenario`) is distinctively
Stoic — a genuine dichotomy-of-control skill-builder and a differentiator. Breathing and
body-scan are generic mindfulness that carry Stoic weight only via framing; reflection
prompts are principle-linked. The atmospheric quality is high (60fps breathing circle,
body-scan visuals). But the flow's problem is **discoverability + stickiness**: practices
are launched as modals *from inside Learn*, so a new user won't find them, and `practiceCount`
increments without gating or adapting anything. **Counter, not a progression mechanic
(flagged).**

### 2.4 Assessment (PHQ-9 / GAD-7) — *stickiness 2 · philosophy 1 · instructional 3 · environmental 2*

Deliberately generic — a **wellness self-screening** and measurement surface, correctly
*not* dressed up as Stoic practice (`theme="neutral"`). Philosophy score of 1 is *by design
and appropriate*; a screening should not be gamified or made atmospheric. The cadence badge
(14/21-day re-screen prompt, `assessment/components/AssessmentStatusBadge.tsx`) is a smart,
infrequent return trigger. **This flow should not be touched by the restructure** — see the
safety section (§4). Its "no depth-progression mechanic" is the one flag that is *correct
to leave as-is*.

### 2.5 Learn — *stickiness 2 · philosophy 5 · instructional 4 · environmental 3*

The one true staged surface. Five modules mapped 1:1 to the Five Principles in canonical
order, each with a classical quote, "What It Is / Why It Matters / practices / obstacles /
reflection," a **developmental-stages timeline**, and a per-module **self-assessed
`developmentalStage`** feeding a recommendation engine. It is the *only* place the
framework's staged arc is realized in the app. Its weaknesses are that the stage is
self-declared and read-only, and — critically — that this machinery is **sealed inside the
Learn tab** and never touches daily practice (see §3, cross-cutting finding #1). Weak daily
return trigger (stickiness 2): it's consumed once, not returned to.

### 2.6 Profile / Settings — *stickiness 1 · philosophy 2 · instructional 3 · environmental 2*

Cleaned up by FEAT-203 (honest account, dead-end removal). Surfaces `LearningProgressStats`
(completion + per-module stage) — progression *visibility* but **no mechanic of its own
(flagged)**. Utilitarian; not a hook surface, appropriately.

---

## 3. Cross-Cutting Findings

### Finding 1 — The depth-progression mechanic is stranded in one tab *(highest priority)*

The framework documents a four-stage developmental arc (Fragmented → Effortful → Fluid →
Integrated Wisdom, `practice/developmental-stages.md`), and the app models it as a type
union and a per-module self-assessment. **But it lives only in Learn.** Onboarding (2),
daily check-in (no cross-session stage), practices (counters), and profile (visibility
only) are all stage-blind. The framework's central promise — *depth over time, not generic
wellness* — is delivered in exactly one surface the user visits least often. **Every daily
flow the founder wants to build inherits this blindness unless it is fixed.** This is the
audit's #1 recommendation-driver.

### Finding 2 — The daily loop's first-run comprehension is ambiguous *(cheapest high-leverage fix)*

The three-card Home is the app's front door, and it is confusing on day one (§2.2). This is
independently fixable with a small copy/UX change, and it is *also* the exact problem the
single-loop dissolves. It is the highest raw-priority item in §5 because it is cheap and
first-run comprehension is launch-critical.

### Finding 3 — Time-of-day is substance delivered as chrome

Per the `philosopher` pass, the morning (prospective) / evening (retrospective) distinction
is a real, canonically-mandated pair of exercises (Marcus's forward *praemeditatio*,
Seneca's backward *examen*), **not** decoration. The current app encodes this correctly but
pays for it with three separate flows, three screen counts, and a confusing front door. The
resolution is to keep the **tense** and drop the **triplication** — one loop, two postures:

| Lens (loop step — canonical Five Principles term) | Morning (prospective) | Evening (retrospective) |
|---|---|---|
| Aware Presence | arrive in the body to begin | settle the body to close |
| Radical Acceptance | accept the day as it will come (reserve clause) | accept the day as it was |
| Sphere Sovereignty | what will be up to me today | where did I confuse control today |
| Virtuous Response | which virtue will I rehearse (*Med.* II.1) | where did I express / miss virtue (*De Ira* III.36) |
| Interconnected Living | who will I meet, how will I show up | how did I affect others today |

### Finding 4 — The single-loop is a *conditional* philosophical upgrade

The proposal adopts the docs' *own* canonical order (P1→P5 = Epictetus' three disciplines:
assent → desire → action) and is the most literal possible implementation of the framework's
meta-principle **"Contemplative Praxis"** (the doctrine that the Five Principles are inert
without a repeating daily loop, `principles/05-interconnected-living.md`). It becomes a
**downgrade** only if executed carelessly. Three conditions convert it from downgrade to
upgrade:

1. **Preserve the morning/evening tense** as a posture parameter (Finding 3 table), not a
   flat tenseless loop.
2. **Defend steps 4 & 5 in copy.** "Virtues" retains the four cardinal virtues + reappraisal
   + *premeditatio*; "Social connection" retains *oikeiōsis* / cosmopolitanism / justice —
   the step most at risk of eroding into pop-wellness "connect with people."
3. **Wire the loop to the developmental-stage mechanic** (Finding 1) so daily practice is no
   longer stage-blind. Otherwise "same loop every day" persists under new paint.

### Finding 5 — Safety: the restructure's real hazard is the crisis button, not the assessment

Per the `crisis` consult:

- **Assessment cadence is safe under the loop.** Self-screening is already time-of-day
  agnostic (a root-level modal; cadence = wall-clock "days since last completion" surfaced
  by the Home `AssessmentStatusBadge`). Collapsing flows does **not** reduce screening
  frequency **provided the Home badge survives the restructure** — treat the badge as a
  safety surface, not decoration.
- **The 988 / crisis button is the biggest zero-false-negative risk.** It is mounted
  *per-flow-navigator*, not as a global root overlay. A naive loop rebuild could ship one
  or more of the five steps with **no 988 access**, and jest (which mocks `canOpenURL`)
  would not catch it — only the Maestro `crisis-button` reachability flow (INFRA-171) would.
- **Turn the risk into a win:** make "promote the crisis button to a single persistent
  root-level mount" a *precondition* of the restructure. That removes the per-screen
  fragility that exists *today* and guarantees coverage on every future step.
- **Do not touch the assessment flow.** It is already correct and time-agnostic; make
  "assessment flow unchanged" an explicit non-goal so no one refactors it as collateral.
  The 15-vs-20 `PHQ9_CRISIS_SCORE` divergence (support floor vs. intervention floor) is
  intentional and must not be "unified."

---

## 4. Assessment-Flow Safety Invariants (must survive any future build item)

These are carried verbatim from the `crisis` consult so the follow-up build item's crisis
review has a checklist. **This audit changes none of them; it records them.**

| # | Invariant | Enforced at |
|---|---|---|
| I1 | PHQ-9 ≥15 → support tier | `crisis/types/safety.ts:363`; `PHQ9_CRISIS_SCORE=15` `assessment/types/index.ts:197` |
| I2 | PHQ-9 ≥20 → active intervention | `safety.ts:356`; severity bucket `assessmentStore.ts:284` |
| I3 | **PHQ-9 Q9 >0 → immediate intervention regardless of total** | `safety.ts:343`; inline mid-assessment fire `assessmentStore.ts:591` |
| I4 | GAD-7 ≥15 → support | `safety.ts:372`; `GAD7_CRISIS_SCORE=15` `safety.ts:36` |
| I5 | Single source of truth = pure `detectCrisis`; store delegates | `safety.ts:330`; `assessmentStore.ts:52,322` |
| I6 | Crisis detection <200ms, audit-logged | `assessmentStore.ts:341–347`, `:163–179`, `:383` |
| I7 | 988 <3 taps / <3s from ANY screen; `CrisisResources` root route | `CleanRootNavigator.tsx:545` |
| I8 | 988 dial does not silently fall back (`LSApplicationQueriesSchemes` tel/sms) | `__tests__/safety/lsApplicationQueriesSchemes.config.test.ts` + Maestro `988-dial` |
| I9 | Crisis features accessible regardless of paywall | `CleanTabNavigator.tsx:167–178` (no FeatureGate on crisis screens) |

---

## 5. Ranked Recommendations

Ranked by the project prioritization formula
`Priority = (I × V^1.5 × SF × U) / (E × R)` (`prioritization-framework-v2.md`). Scores are
**provisional** and re-scored at intake. Tiers: >100 Must · 30–100 Should · 10–30 Could.

Coverage note (not padding): each recommendation maps to a distinct lens finding, and the
set is deliberately *sequenced* — R1 and R2 are do-regardless wins that also de-risk the big
bet in R3; R4 is the depth layer; R5 is a secondary discoverability fix; the full migration
(R6) is deliberately gated on R3 validating.

| Rank | Recommendation | I | V | SF | U | E | R | Priority | Tier |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| 1 | **Clarify daily-practice first-run comprehension** (interim Home primer) | 5 | 3 | 3 | 3 | 2 (S) | 1 | **117** | Must † |
| 2 | **Crisis button → persistent root-level mount** (safety hardening + loop prereq) | 5 | 5 | 5 | 4 | 3 (M) | 4 | **93** | Should |
| 3 | **Single-loop daily-practice prototype behind a flag** (the headline bet) | 5 | 4 | 5 | 3 | 3 (M) | 3 | **67** | Should |
| 4 | **Wire developmental-stage adaptivity into daily practice** (Finding 1) | 5 | 4 | 5 | 3 | 5 (L) | 2 | **60** | Should |
| 5 | **Improve standalone-practice discoverability** | 3 | 3 | 3 | 2 | 2 (S) | 1 | **47** | Should |
| 6 | **Full morning/midday/evening → single-loop migration** (epic; gated on R3) | 5 | 4 | 5 | 3 | 8 (XL) | 4 | **19** | Could |

### R1 — Clarify daily-practice first-run comprehension *(Priority 117 · Must †)*
Small copy/UX change on the Home three-card surface: explain what a check-in is, that the
user only needs the *current* one, and what the underlying practice is. **† Conditional
hedge** (founder-review decision): this polishes the exact 3-card layout the single-loop
(R3) *deletes*, and "the 3 cards cause churn" is an unvalidated hypothesis (no usage data).
Only worth building **if launch precedes the loop** — if R3 ships first, close this. Urgency
downgraded 4→3 to reflect that; it still computes >100 as a genuinely cheap fix, but treat
it as a conditional hedge, not a committed Must, and do not sequence it ahead of R3 unless a
launch date is set before the loop lands. Addresses Finding 2.

### R2 — Crisis button → persistent root-level mount *(Priority 93 · Should)*
Replace the per-navigator/per-screen crisis-button mounts with one root-level persistent
mount. Removes real fragility that exists today, and is the **precondition** that makes the
loop restructure safe (guaranteed 988 coverage on every step). Must keep 988 <3 taps / <3s;
extend `e2e:safety:crisis-button`. Addresses Finding 5. *Do this before or with R3.*

### R3 — Single-loop daily-practice prototype behind a flag *(Priority 67 · Should)*
Build **one** loop of the canonical Five Principles (Aware Presence → Radical Acceptance →
Sphere Sovereignty → Virtuous Response → Interconnected Living — the Stoic knowledge-base
terms, not narrowed shorthand), behind a build-time flag, extending the existing Midday flow as the closest
base (note: Midday is *missing* explicit acceptance + social steps — the loop adds beats,
it doesn't just rename). This is the de-risking slice of the epic — validate the founder's
thesis against today's three-flow structure *before* the full migration.

**Flat vs. tensed is the prototype's open question** (founder-review decision): rather than
mandating the morning-prospective / evening-retrospective tense (Finding 3), the prototype
ships an **optional tense toggle** and compares both modes head-to-head. The philosopher's
position — that a *flat* tenseless loop discards genuine classical substance (Marcus's
morning *praemeditatio*, Seneca's evening *examen*) — is the hypothesis to validate by feel,
not a precondition. Condition from Finding 4 still holds unconditionally: defend steps 4–5
copy (keep the cardinal virtues + reappraisal; keep *oikeiōsis*/justice). Requires
`philosopher` sign-off on copy and `crisis` sign-off on button coverage. Addresses Findings
2, 3, 4.

### R4 — Wire developmental-stage adaptivity into daily practice *(Priority 60 · Should)*
Take the stage mechanic out of the Learn silo: have the daily loop read the user's
self-assessed developmental stage and modulate depth/prompts. This is the framework's
promised "scaffold through the stages," currently unmet everywhere but Learn. Pairs
naturally with R3 (the loop is the vehicle) but is independently valuable. Effort is mostly
stage-differentiated content authoring (`philosopher` validation). Addresses Finding 1.

### R5 — Improve standalone-practice discoverability *(Priority 47 · Should)*
Surface breathing / body-scan / reflection / **sorting** outside the Learn tab (a home
entry point or a loop "variation" slot). The sorting drill in particular is a differentiated
Stoic asset currently buried. Addresses §2.3.

### R6 — Full single-loop migration *(Priority 19 · Could; gated on R3)*
The parent epic: retire the three flow navigators, unify `FlowType`/`CheckInType`, repoint
the ~15 theming call sites, migrate deep links, reminders, `flowType` telemetry allow-lists,
and Insights engagement records. Deliberately **Could-tier** — its high E×R + unvalidated
scope means it should *not* be committed until R3's prototype validates the thesis (this is
the framework working as intended: R≥4 epics require a de-risking spike first). Architecture
change-surface is catalogued in the audit's architecture appendix.

---

## 6. Method & Provenance

- **Method:** heuristic expert review (single reviewer) of shipped source + framework docs +
  TestFlight build. **Not** a user study — pre-launch, zero usage data. Single-reviewer bias
  and prediction-not-measurement caveats apply to every stickiness/first-run claim (§0).
- **Specialist inputs:** `philosopher` agent (philosophical-building lens, single-loop
  coherence, classical sourcing); `crisis` agent (assessment/safety invariants + restructure
  guardrails, consult-only); architecture map (flow/theme coupling, change-surface).
- **Terminology:** "wellness self-screening," never "clinical assessment," throughout.
- **Scope honored:** zero `app/` diffs; no feature PR; recommendations re-gated at
  `crisis` / `philosopher` review at build time, not changed here.
- **Classical sources invoked:** Epictetus *Enchiridion* 1 & 8, *Discourses* I.1 / II.18 /
  III.10; Marcus Aurelius *Meditations* II.1, IV.23, V.20, VI.54, VII.9; Seneca *De Ira*
  III.36; Pythagorean *Golden Verses*; Hierocles (concentric circles); Hadot on *prosochē*
  and the three disciplines.

---

## 7. Post-Audit Verification & Founder-Review Adjustments

A verification pass after the first draft checked the load-bearing assumptions against the
code and reconciled two recommendations with founder intent.

**Verified — "no mood check-in" (§2.2).** Confirmed against the codebase: there is **no
`checkInStore`, no mood store, and no mood-capture screen.** The only Zustand stores are
`consentStore`, `settingsStore`, `subscriptionStore`, `assessmentStore`, `educationStore`,
`stoicPracticeStore`. `educationStore.ts:263` carries a `TODO: Integrate with checkInStore`
— i.e. the store is referenced as *not-yet-existing*. **Corollary finding:** CLAUDE.md's
State section (`checkIn — mood (encrypted at rest)`) and this work item's own AC ("daily
check-in (mood)") both describe a store that was never built — a stale spec, worth
correcting in CLAUDE.md.

**Decision 1 — flat vs. tensed is the prototype's question, not a mandate.** The founder's
original framing ("get rid of morning/midday/evening") and the philosopher's
"keep-the-tense" recommendation are left for R3's prototype to resolve empirically: build
the loop with an optional tense toggle and compare flat vs. tensed by feel. Finding 3/4's
philosophical analysis stands as the *argument for* tensed, not a precondition. R3's AC
updated accordingly.

**Decision 2 — R1 downgraded to a conditional hedge.** R1 polishes the 3-card Home that R3
deletes, and rests on an unvalidated churn hypothesis; Urgency lowered 4→3 and it is flagged
"only if launch precedes the loop; close if R3 ships." It should not be sequenced ahead of
R3 absent a pre-loop launch date.
