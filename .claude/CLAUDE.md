# Being

## What This Is

Stoic Mindfulness mental wellness app. Consumer wellness — not a healthcare provider, medical device, or HIPAA-covered entity. PHQ-9 and GAD-7 are wellness self-screening tools, not clinical assessments. Solo-founder project under Palouse Labs LLC.

## Repo Layout

Bare git repo at `~/dev/being/` with a long-lived worktree at `~/dev/being/development/` plus feature worktrees created by `/b-work`. **There is deliberately no `main` worktree.** `main` is only ever a ref here — the release moves it, nothing checks it out — and while one existed it silently desynced on every release (`update-ref` advances the pointer without touching a checked-out worktree). Need to inspect or branch from shipped state? Create one on demand: `git -C ~/dev/being worktree add ~/dev/being/<slug> -b <branch> origin/main`. Always launch `claude` from `~/dev/being/` (the bare-repo root). The app code lives under each worktree's `app/` directory.

## Tech Stack

- React Native `0.85.3`, Expo `56`, React `19.2.3` (pinned — see version-check script in `app/package.json`)
- Supabase (auth + DB), Zustand `5` (state), Stripe (subscriptions), Sentry (monitoring), expo-secure-store + react-native-aes-crypto (encryption)
- TypeScript `6.0.x` strict (SDK 56 default; landed in MAINT-162), Jest (unit/integration) + Maestro (safety-path e2e, local-only — INFRA-171)

## Setup & Run

```bash
cd app
npm start                  # Expo dev server
npm run ios                # iOS simulator
npm run android            # Android emulator
```

## Source Architecture

```
app/src/
├── core/         # Infrastructure: analytics, security, services, stores, types
└── features/     # Domain features: assessment, crisis, practices, learn, ...
```

Path aliases: `@/core/*`, `@/features/*`. Prefer aliases over relative imports. Types co-located with their consumers.

## Protected Paths → Specialist Agent

Editing these areas should invoke the matching agent for a planning pass before implementing:

| Path | Agent(s) |
|---|---|
| `app/src/features/crisis/` | `crisis` |
| `app/src/features/assessment/` | `crisis` + `philosopher` |
| `app/src/features/practices/` | `philosopher` |
| `app/src/features/practices/dailyloop/` | `crisis` + `philosopher` |
| `app/src/features/guidance/` | `crisis` + `philosopher` |
| `app/src/features/consent/` | `crisis` + `compliance` |
| `app/src/features/journal/` | `crisis` |
| `app/src/core/services/security/` | `compliance` |
| `app/src/core/stores/consentStore.ts` | `compliance` |
| `app/src/core/hooks/` | `crisis` |
| `app/src/core/components/ThresholdEducationModal.tsx` | `crisis` + `philosopher` |
| `app/src/features/insights/components/` | `crisis` + `philosopher` |
| `app/src/features/home/screens/CleanHomeScreen.tsx` | `crisis` |
| `app/src/features/profile/screens/DeleteAccountScreen.tsx` | `crisis` |
| `app/src/features/profile/screens/ExportDataScreen.tsx` | `crisis` |
| `app/src/core/services/logging/ExternalErrorReporter.ts` | `crisis` |
| `app/src/features/profile/screens/ProfileScreen.tsx` | `crisis` |
| `app/plugins/` | `crisis` |
| `app/src/core/services/speech/` | `crisis` |
| `app/patches/` | `crisis` |
| `app/src/core/navigation/` | `crisis` |
| `app/src/core/config/e2eSeed.ts` | `crisis` |
| `app/src/core/services/supabase/SupabaseService.ts` | `crisis` + `compliance` |
| `app/App.tsx` | `crisis` |
| `app/src/core/analytics/PostHogProvider.tsx` | `crisis` + `compliance` |
| `app/src/core/components/BugReportOverlay.tsx` | `crisis` |
| `app/src/core/stores/bugReportStore.ts` | `crisis` |
| `app/src/features/practices/shared/components/HapticsOptInPrompt.tsx` | `crisis` + `philosopher` |
| `app/src/features/practices/shared/components/ResumeSessionModal.tsx` | `crisis` + `philosopher` |
| `app/src/features/practices/shared/haptics/` | `crisis` |
| `app/src/features/practices/shared/components/BreathingCircle.tsx` | `crisis` |
| `app/src/features/practices/shared/useIsFocusedSafe.ts` | `crisis` |

`features/guidance/` is here despite owning no assessment or crisis code of its own:
`services/guidanceGate.ts` **consumes** the PHQ-9/GAD-7 thresholds to decide whether a
distressed user is shown Stoic content or routed to crisis resources, so a wrong edit there
is a false negative on a safety gate. It is the first of two entries that a path-based safety
detector will not catch by name, which is precisely why it needs listing — FEAT-55 slice 1
shipped that gate classifying GREEN, because a brand-new feature dir matches no existing
pattern. `philosopher` covers the tier content the same directory carries.

`features/consent/` is the second (added INFRA-416), and it is the one that proved the
failure class recurs. `CombinedLegalGateScreen.tsx` hosts the **pre-consent** 988 footer —
the only crisis affordance a user has before accepting anything, and `LegalGate` is in
`RootCrisisButton`'s `SUPPRESSED_ROUTES`, so the root overlay deliberately does not cover
for it. DEBUG-390 fixed that footer and Phase 2.5 fired *only* because the same branch also
edited two `.maestro` flows; the fix file itself matched nothing. `crisis` owns the
affordance, `compliance` owns the consent record the same directory writes.

**The two lists are reconciled mechanically** — `.claude/scripts/check-safety-paths.sh`
(INFRA-416) fails when a Protected Path is neither in Phase 2.5's `SAFETY_CANDIDATES` grep
nor in its declared exemption list. Run it after editing either list; `/b-close` Phase 0
runs it too. It is deliberately **not** a CI job: both files are tracked only on `_bare` and
gitignored on `development`, so a CI checkout cannot read them — and Phase 2.5's Maestro gate
is itself local-only, so a CI guard would go green on a list for flows CI never runs.
Adding a row to the table above without doing one or the other will fail that check.

`features/practices/dailyloop/` is the third (added DEBUG-465), and it is a carve-in from the
`practices/` exemption directly above rather than a new dir. `DailyLoopStepScreen.tsx` hosts
`SUPPORT_LINE` — a crisis affordance routing to `CrisisResources` — on whichever beat
`showsSupportLine()` selects, and crisis review ruled the floating root overlay does **not**
discharge its above-the-fold obligation. `crisis` owns that affordance; `philosopher` still
owns the beat's content. Phase 2.5 gates `practices/dailyloop` only; the rest of `practices/`
stays exempt.

`features/journal/` is the fourth (added DEBUG-480). `VoiceReflectionScreen.tsx` hosts the
app's only save-time crisis scan — `scanOnSave`, reachable solely through `journal-save-button`
— plus `journal-crisis-banner` and `journal-crisis-call-988`. It is the sole scan point for text
a user typed or corrected, so a reachability defect there is a crisis false negative, not a
usability bug. `crisis` owns the scan and the affordances.

The last four entries (DEBUG-525) are the fifth instance, and they consume
`features/crisis/constants/crisisButtonGeometry.ts` rather than owning crisis code — the
same shape as `guidance/`. `core/hooks/` is gated as a DIRECTORY: three of its four files
decide crisis-affordance placement or visibility, and the fourth (`useBugReportShake.ts`)
has one commit in its life. **That fourth file is not the benign member this once called it
(corrected DEBUG-533):** it arms a shake gesture from the app root that opens a
zero-988-affordance window on any screen. The directory clause was right and its stated
reason was wrong, which is the failure the standing rule below is meant to prevent — the
commit-frequency half held, the "reviewed non-crisis member" half was never reviewed. The
other three are gated as FILES because their directories
are 1-of-10 and 2-of-12. **Standing rule for the next instance:** gate the directory when
every non-crisis member can be named in the justification prose and each has been reviewed;
otherwise name the files. A directory clause that over-fires costs a build that announces
itself; a file list that under-fires is silent, which is how five instances accumulated.

`features/home/screens/CleanHomeScreen.tsx` is the seventh instance (added DEBUG-547) and
the first where the consumer is a plain layout screen. It carries a
`CRISIS_BUTTON_EXCLUSION_RECT` inset because the FAB's `zIndex: 9999` means any overlap is a
wrong-destination tap into `CrisisResources` — a crisis FALSE POSITIVE rather than an
unreachable affordance. Registered as a FILE, not as `features/home/`: the standing rule
above says gate the directory only when every non-crisis member can be named and reviewed,
and this directory's other members carry no crisis surface, so a directory clause would
charge a sim build to every future Home edit. Note the fix also had to touch
`features/guidance/` — already gated — and DEBUG-390's lesson applies: the home registration
must stand on its own rather than letting the co-edited guidance file be what arms the gate.

`features/profile/screens/DeleteAccountScreen.tsx` is the eighth instance (added
INFRA-531), and the first found by a mechanism rather than by someone noticing. It consumes
`crisisInputAccessory` — `crisisAccessoryProps()` on the confirmation `TextInput` — and the
keyboard is *necessarily* up there, because the user must type the confirmation word, so on
iOS the accessory is the sole 988 affordance for the duration. Registered as a FILE: the
directory's other members are legal, settings and backup screens with no crisis surface, and
`ProfileStackNavigator.tsx` — the one member that does host `CollapsibleCrisisButton` — is
already covered by the `CRISIS_HOST_CHANGED` content detector, so a directory clause would
buy nothing and charge a sim build to every Profile edit. Per DEBUG-390, the row stands on
its own rather than leaning on that detector to arm the gate.

INFRA-531 also shipped the detector that surfaced it: `/b-close` Step 2.5.1 now fails the
close when a file outside this table's gated set imports a crisis constant, printing the
path and the matched line and demanding a ruling — a Protected Paths row plus a gate clause,
or a recorded exemption. It is a **supplement**, not a replacement: it is a diff signal
rather than a set, it produces no agent mapping, and it inverts on extracted primitives
(`useOverlayBottomInset.ts` is caught, `useKeyboardFrameHeight.ts` is missed). The standing
directory-vs-file rule above is still what covers that gap.

`core/services/logging/ExternalErrorReporter.ts` and `features/profile/screens/ProfileScreen.tsx`
are the ninth instance (added DEBUG-533), and the first where the occluder is code we do not
render. `showFeedbackForm()` opens Sentry's feedback widget, which paints a 90%-opaque
inset-0 backdrop as a later sibling of our whole app — ruled a DEBUG-406 conversion site that
cannot be converted in place. Both are FILES: the logging directory and the rest of Profile
carry no crisis surface. **This is a new shape for the family and no detector reaches it** —
INFRA-531's import rule matches nothing here because nothing on the path imports from
`features/crisis/`, and `check-modal-occlusion-guard.js` scans `app/src`, so a `<Modal>` in
`node_modules` is invisible to it. Not "consumes a crisis constant while matching no path
pattern", but "mounts a third-party component that occludes the affordance while importing
nothing of ours at all". The hand-maintained table is the only control. Full ruling is
recorded at `showFeedbackForm()`.

`features/profile/screens/ExportDataScreen.tsx` is the sixteenth instance (added
DEBUG-577), and the first where the consumer owns a third-party PRESENTER CALL rather than
an affordance or a constant. `Sharing.shareAsync` was MEASURED to leave zero app-owned
nodes in the hierarchy for the sheet's duration — an absent app tree, not a covered FAB —
on a route absent from `SUPPRESSED_ROUTES`, reached by an always-on, never-flag-gated path.
That is the `ExternalErrorReporter` shape, already gated, and this site is strictly MORE
reachable: the export path is always on and never flag-gated, where the bug-report surface
is bounded by `bug_reporting`. FILE-level: the directory's legal, settings, account and
backup members carry no crisis surface, and its two that do are already listed. No detector
reaches it — the file imports `expo-sharing` and nothing from `features/crisis/`, so
INFRA-531's import rule misses it, and `check-modal-occlusion-guard.js` rule 4 catches the
CALL but produces no agent mapping and arms no gate. Note `IAPService.ts` is the same class
and is deliberately NOT gated yet: DEBUG-577 ruled its measurement unsatisfiable in this
environment (`mockMode = __DEV__`, no `.storekit` config, no Android harness), so a row
would arm a build against a surface nothing can verify. That is a recorded carry, not an
oversight — gate it the moment sandbox products exist.

`plugins/` is the sixth instance (added FEAT-522), and the first that is not app code:
`withPrivacyShield.js` injects a native view that covers every 988 affordance while the
app is inactive, and iOS is CNG so no AppDelegate diff is ever reviewed. No Maestro flow
can observe it — the suite drives an ACTIVE app — so the gate arms the surrounding crisis
paths and the real verification is an attended device session.

`core/services/speech/` and `patches/` are the tenth instance (added DEBUG-524), and the
first where the harm is the process DYING rather than an affordance being hidden.
`onDeviceSpeechGuard.ts` admits the capture whose text is the only save-time crisis scan and
builds the options driving native audio setup, so a wrong edit SIGABRTs the app mid-reflection.
DIRECTORY-level: two source files, both reviewed — `audioArtifactSweeper.ts` is the non-crisis
member (raw-audio erasure, data-at-rest, not 988 reachability). `patches/` mirrors `plugins/`:
it alters native behaviour on a crisis path with no reviewed generated diff, and DEBUG-524
established a patch is the ONLY remaining lever there. INFRA-531's import rule catches neither —
nothing on either path imports from `features/crisis/`.

`core/navigation/` and `core/config/e2eSeed.ts` are the eleventh instance (added DEBUG-575),
and the first found by the reconciliation script rather than by a human or a diff: both were
already in Phase 2.5's grep with **no table row**, so they armed a sim build while mapping to
no agent. `check-safety-paths.sh` only walked CLAUDE.md, so "gated but unlisted" reconciled
clean; DEBUG-575 added the reverse loop, and it named these two on its first run.
`core/navigation/` is DIRECTORY-level and clears the naming bar: `rootOverlaySlot.tsx` +
`CleanRootNavigator.tsx` + `NavigatorA11yHost.tsx` jointly own whether a root-slot overlay
hides the 988 affordances (DEBUG-575: `accessibilityViewIsModal` on a slot overlay pruned
both crisis affordances out of the accessibility tree), `navigationRef.ts` is the handle the
crisis button navigates through, `linking.ts` resolves deeplinks against `SUPPRESSED_ROUTES`,
and `CleanTabNavigator.tsx` hosts the tabs the reachability flow walks. `ActiveTabIndicator.tsx`
is the single reviewed non-crisis member. `e2eSeed.ts` decides what the safety flows can
REACH — before DEBUG-575's seed, `WeeklyReflectionCard` returned null and the composer did not
exist in the gate build at all — so a seed narrowing is coverage loss with nothing going red.

`core/services/supabase/SupabaseService.ts` is the twelfth instance (added INFRA-568), and
the first where the file OWNS the crisis audit sink rather than an affordance. It holds the
only writer of `crisis_detected` to `analytics_events`, and `trackCrisisDetection` runs
INSIDE the synchronous frame `handleCrisisDetection` awaits — yet it matches no path pattern
and imports nothing from `features/crisis/`, so INFRA-531's import detector cannot see it
and DEBUG-575's reconciliation had nothing to reconcile. FILE-level, not
`core/services/supabase/`: the directory also holds `CloudBackupService`,
`SyncCoordinator`, `secureStoreSessionAdapter`, `hooks/` and `index.ts`, and the standing
rule above says name the file whenever the non-crisis members cannot all be named and
reviewed. Note what the gate does NOT prove here: INFRA-411 suppresses egress in the gate
build, so the four armed flows cover the frame not throwing or blocking, never delivery.
Delivery is INFRA-412's attended `.env.production` measurement.

`App.tsx` and `core/analytics/PostHogProvider.tsx` are the thirteenth instance (added
DEBUG-559), and the first where the file is an ANCESTOR of every 988 affordance rather than
an owner or consumer of one. The provider returned a bare fragment without analytics consent
and `<PHProvider>` with it — an element-TYPE swap at a fixed position above
`SafeAreaProvider → RootCrisisBoundary → CleanRootNavigator` — so a consent grant destroyed
and recreated the whole crisis subtree. `App.tsx` mounts `SafeAreaProvider` with no
`initialMetrics`, and that provider renders NOTHING until its native insets land, so the
remount was a blank screen with every 988 affordance inside the curtain, not a FAB gap
LoadingScreen's `Static988Button` covers. The general class is **a render-withholding
ancestor**, and `SafeAreaProvider`'s is library-owned, so it generalises to ancestors that
never appear in a diff. Both FILE-level; `compliance` also owns the provider because the
pre-consent network-suppression options live there. **No detector reaches this shape** —
neither file imports from `features/crisis/`, so INFRA-531's import rule matches nothing, and
`check-modal-occlusion-guard.js` sees no `<Modal>`.

`core/components/BugReportOverlay.tsx` and `core/stores/bugReportStore.ts` are the
fourteenth instance (added FEAT-570), and the first where the consumer IS the converted
overlay. The overlay replaced `Sentry.showFeedbackWidget()` — a zero-988 window whose
occluder was third-party — and it is the first slot claimant armed at the APP ROOT, so
unlike the two `insights/` composers it can be raised on a FAB-suppressed route.
Both FILE-level: `core/components/` and `core/stores/` each hold many members that cannot
all be named and reviewed. The overlay consumes `crisisButtonGeometry` and
`crisisInputAccessory`, so INFRA-531's import rule catches it; **the store is caught by
nothing** — it imports only zustand — yet it is the sole gate on whether that overlay
opens, which is why the row is the only control.

`features/practices/shared/components/HapticsOptInPrompt.tsx` and
`ResumeSessionModal.tsx` are the fifteenth instance (added DEBUG-586), and the first
where the consumption the table already relied on **did not exist**. Both size a
`paddingBottom` from the FAB's geometry so their own controls cannot land under a
control at `zIndex: 9999` — the DEBUG-547 crisis FALSE-POSITIVE shape — and both
re-derived `104 + TOUCH_TARGETS.minimum + 12 + spacing[16]` as a literal for the whole
life of `crisisButtonGeometry.ts`, whose header meanwhile named them as consumers.
Two oracles, both wrong in the same direction: the module claimed coverage and the
import detector saw none, so neither a reader nor INFRA-531 could find the gap.
DEBUG-586 makes the import real, which is what puts them in the detector's reach.
FILE-level, not `practices/shared/components/`: the other twelve members carry no
crisis surface (`Timer.tsx:335` only cites the overlay in a comment), and a directory
clause would charge a sim build to every Stoic-copy edit — the over-trigger the
`practices/` exemption directly above exists to prevent. `philosopher` still owns
both files' content; `ResumeSessionModal`'s header declares its own Stoic
non-negotiables.

`features/practices/shared/haptics/` and `shared/components/BreathingCircle.tsx` are the
seventeenth instance (added DEBUG-587), and the first where the surface EMITS toward a crisis
screen rather than being occluded by one. `usePracticeHaptics` routes both the tactile and
paired-speech channels and its own docstring commits that "no haptic may fire on or over a
crisis surface"; `BreathingCircle` speaks every breath phase through
`announceForAccessibility` on a path touching no haptics code at all. Neither imports from
`features/crisis/`, so INFRA-531's rule matches nothing, and `practices/` is exempt outside
`dailyloop/` — so DEBUG-587, whose entire subject was whether practice output reaches a
crisis surface, merged with the gate never firing. `shared/haptics/` is DIRECTORY-level and
clears the naming bar: all eight members are on the cue-delivery path. `BreathingCircle.tsx`
is a FILE for the reason the two rows above are. `useIsFocusedSafe.ts` is gated because it
is the SOLE focus signal both of them read: its no-navigator default of `true` exists for
tests and direct embedding, and widening it — or breaking the blur listener — fails BOTH
gates open at once, silently. Note what a gate arm CANNOT prove here:
`eas.json`'s `e2e-sim` profile carries `practice_haptics:false`, so the pipeline is dark in
the gate build and no flow can render a cue — the arm is notice-only and the falsifier is
jest at the `expo-haptics` and `announceForAccessibility` boundaries.

Specialist agents live in `.claude/agents/{crisis,compliance,philosopher}.md` and self-describe via frontmatter.

## Safety Facts (non-negotiable)

- **PHQ-9 thresholds**: ≥15 = support resources offered; ≥20 = active intervention. Q9 (self-harm) >0 = immediate intervention regardless of total.
- **GAD-7 threshold**: ≥15 = support resources offered.
- **988 access**: <3 taps from any screen, <3 seconds load.
- **Crisis detection (score path)**: <200ms, audit-logged, **zero false negatives** — `detectCrisis()` over PHQ-9/GAD-7 integers, which is total and deterministic. This is where the zero-FN contract lives.
- **Crisis detection (free text)**: `textCrisisDetection` is a fixed keyword set — high precision, **recall unmeasured with verified misses** (INFRA-512 §3). Never cite it as zero-false-negative; a null scan is not evidence of no crisis.
- **Wellness data encryption**: AES-256 at rest via `expo-secure-store` / `react-native-aes-crypto`. (Terminology: "wellness data," not "PHI" — Being is not a HIPAA entity.)

## Performance Budgets

| Metric | Target |
|---|---|
| App launch | <2s |
| Crisis button response | <200ms |
| Check-in flow transition | <500ms |
| Assessment load | <300ms |
| Breathing circle animation | 60fps |

## Test & Validate Commands

```bash
npm run typecheck                  # tsc --noEmit
npm run lint                       # eslint src
npm run lint:clinical              # stricter rules for clinical/safety code
npm run test                       # full jest suite
npm run test:clinical              # PHQ/GAD scoring + thresholds
npm run test:crisis-detection      # crisis detection validation
npm run test:accessibility         # WCAG AA
npm run test:offline-crisis        # offline 988 access
npm run validate:accessibility     # accessibility validation

# Safety-path e2e (Maestro, local-only — INFRA-171)
npm run e2e:safety                 # the 15 sim-runnable safety flows (a jest tripwire pins the count)
npm run e2e:safety:q9              # PHQ-9 Q9 single-alert pinning
npm run e2e:safety:phq9            # PHQ-9 ≥20 completion path
npm run e2e:safety:gad7            # GAD-7 ≥15 severe handoff
npm run e2e:safety:crisis-button   # crisis button reachability from each tab
npm run e2e:safety:988-dial        # ⛔ refuses (exit 5) — no Maestro can drive a device, DEBUG-589
```

## Validation Matrix

Which validators are required for which work type. `crisis`, `compliance`, `philosopher` are specialist agents. Accessibility is validated via `npm run test:accessibility` / `validate:accessibility`.

**Performance budgets are only partly enforced — know which (corrected MAINT-307).** This section previously claimed they are "enforced on-device via the Maestro flows under `app/.maestro/`". **They are not.** Verified across all 8 flows: there is not one ms or fps assertion, only `timeout:` failure ceilings; `crisis-button-reachability.yaml:34-35` says so itself. What actually holds:

| Budget | Enforced by |
|---|---|
| Crisis detection <200ms | **Strict CI gate** — `__tests__/performance/assessment-performance.test.ts`, run by the `Performance regression` job |
| Crisis button <200ms | **Coarse jest proxy** — `CollapsibleCrisisButton.behavioral.test.tsx`; measures synthetic dispatch, not tap→render |
| Breathing 60fps | **Structural proxy only — the frame rate is still unmeasured.** INFRA-306 shipped `npm run check:breathing-worklets` (CI, `Performance regression` job): it fails if the PERF-01/PERF-02 shape returns to the animation path — `runOnJS`/state-setter inside a `useAnimatedStyle`/`useDerivedValue`/`useAnimatedReaction`/`useFrameCallback` body, `requestAnimationFrame` on that path, or `BreathingCircle` losing `React.memo` / its module-scope prop constants. It does **not** measure frames and cannot: CI is 100% `ubuntu-latest`. INFRA-373 built the on-device measurement — `BreathingFrameProbe` + a pure, unit-tested accumulator behind `EXPO_PUBLIC_PERF_HUD` — and it is a **hand-read instrument, not a gate**: nothing asserts on its output. Automating it needs a device Maestro flow, which DEBUG-589 established no Maestro version can run. Measured 2026-09-07, iPhone 16e/60Hz: 599 frames, nominal 16.66ms, zero drops. Derive nominal from the **modal** interval, never the minimum (measured min 16.42 is biased low). Procedure, evidence and the two still-owed control runs: `post-launch-monitoring-runbook.md` §5a |
| App launch <2s, check-in transition <500ms | **Nothing** — hand-validated |

The jest-side `perf:*` scripts were removed in MAINT-166 PR 7 (they ran zero matching tests). `__tests__/reporters/performance-regression-reporter.js` does **not** gate: it is non-strict unless `PERF_REGRESSION_STRICT=true`, so `performance-baselines.json`'s `crisis_response_ms` is a recorded baseline, not a threshold. A "performance" cell below therefore means *the budget applies*, not *a gate will catch you*.

| Work Type | crisis | compliance | philosopher | accessibility | performance | safety e2e |
|---|---|---|---|---|---|---|
| Crisis features | required | required | — | required | <200ms required | required |
| Assessment UI | required (thresholds) | — | — | required | — | required |
| Therapeutic content (Stoic) | — | — | required | required | 60fps if animation | — |
| Privacy / wellness data export | — | required | — | if UI | — | — |
| General UI | — | — | — | required | — | — |
| Backend-only | — | — | — | — | — | — |

Safety e2e = Maestro flow in `app/.maestro/` pinning the user-visible contract. Gated by `/b-close` Phase 2.5 when safety paths change. Authoring guide: `docs/testing/e2e-maestro.md`.

**What the safety gate does NOT cover — telemetry (INFRA-400, corrected INFRA-412).** It verifies UI reachability and thresholds. It does **not** verify that the `crisis_detected` → Supabase sink delivers, so a green gate is still narrower than "the crisis paths were verified." A full gate run writes **zero rows** and that is still the expected reading — but the *reason* changed on 2026-08-12/15, and the old reason is now the dangerous one to carry.

**Read a zero-row `analytics_events` against the BUILD, not against the table.** This entry used to say flatly that "a zero-row reading is the expected reading, not evidence of a dead pipeline." That was true of every build when INFRA-400 wrote it and is true of only one build now:

| Build | Zero rows means |
|---|---|
| Gate build (`npm run e2e:safety:build`) | **Expected.** INFRA-411 suppresses egress at `flushCrisisAnalytics`: `if (env.EXPO_PUBLIC_E2E_SEED_ONBOARDED === 'true') return;`. That flag exists only in `eas.json`'s `e2e-sim` profile. Events are retained, never dropped. |
| Normal Release build (`.env.production`) | **A REGRESSION.** Delivery is proven — see below. |

DEBUG-409 fixed the original defect: `flushCrisisAnalytics()` early-returned on `if (!this.client) return;`, and the only thing constructing a client was `initializeCloudServices()`, gated at module-load time on `canPerformOperation('cloud_sync')` while `consentStatus` was still `'loading'` — necessarily `false`, never re-run, so the eager init was dead code in every build. It is now a lazy `ensureClient()` called from the flush itself, reading no consent state.

**INFRA-412 measured it end-to-end (2026-08-15), which is what retires the old guidance.** A non-suppressed Release build on a default-configured device — fresh install, `cloudSyncEnabled: false`, Profile → Cloud Backup never opened — took a PHQ-9 Q9>0 detection to a landed row in **576 ms**: anonymous principal minted `20:02:50.403782+00`, row inserted `20:02:50.979599+00`, carrying exactly the four allow-listed properties (`trigger_type`, `severity_bucket`, `intervention_surfaced`, `assessment_type`) and nothing else. The principal did not exist beforehand, which is the proof the client was built *on the crisis* rather than at boot. `analytics_events` went 1 → 2 rows; a relaunch (second AppState-active flush) added no duplicate, exercising the coalescing guard.

**To reproduce, do NOT use `npm run e2e:safety:build`** — it resolves the `e2e-sim` profile and is the suppressed binary by construction. Build with `.env.production` (`expo run:ios --configuration Release`) and assert which env won *inside* the bundle: the two profiles differ on exactly `practice_haptics` / `voice_journal`, so the artifact is self-identifying. Note also that only 4 of the 8 sim flows could ever emit (`q9-single-alert`, `phq9-severe-completion`, `gad7-severe`, `journal-crisis-scan`) — the rest tap the crisis *button* without triggering crisis *detection* — and that DEBUG-413 drops any event enqueued before `PRE_FIX_CRISIS_BACKLOG_CUTOFF_MS` (`Date.UTC(2026, 7, 14)`) at queue adoption, so a pre-2026-08-14 backlog will never appear no matter which build reads it.

## State (Zustand)

- `user` — profile, preferences
- `checkIn` — mood (encrypted at rest)
- `assessment` — PHQ/GAD results (critical: encrypted, validated)
- `crisis` — emergency contacts, safety plan (critical: encrypted)

## Design System

Uses the `@mp2ez/being-design-system` npm package. Theme tokens imported from `@/core/theme`. UI work imports `colorSystem`, `semantic`, `spacing`, `borderRadius`, `typography` from there. **No hardcoded hex colors, magic-number spacing, or inline fontSize.** Themes vary by time of day (`morning|midday|evening`) via `getTheme(flowType)`.

## Branch Model (GitHub Flow — INFRA-145)

Two long-lived branches:
- **`main`** — last-shipped state. Updated only via `development → main` release PRs (created by `/b-release`) or `hotfix/* → main` PRs. TestFlight + App Store build from this branch.
- **`development`** — integration branch. All feature / chore / fix branches PR into this. Each merge is "ready to release"; multiple can accumulate before a release.

Short-lived branches:
- `feat/*`, `fix/*`, `chore/*` — branched off `development`, PR'd to `development`, deleted on merge.
- `hotfix/*` — branched off `main` (NOT dev), PR'd to `main`. After merge: **cherry-pick** the hotfix commit onto `development` (decision: cherry-pick over rebase, keeps dev's force-push protection on).

**Branch protection**: both `main` and `development` require `CI pass` (10 strict gates), enforce admins, prevent force-push and deletion, and require PRs (no direct push). Use `gh pr merge --admin` for solo workflow speed. "No direct push" is literal and applies to you: `required_pull_request_reviews` is present with 0 required approvals, and `enforce_admins: true` extends it to admins, so `git push origin development` is rejected with `GH006` — see the Hotfix Process below, whose backport step used to get this wrong.

**When CI runs**: `ci.yml` fires on `pull_request` (into `main` or `development`) and on `push` to **`main` and `development` only**. Short-lived branches are deliberately absent from the `push:` trigger — they used to be there, and every commit on one with an open PR produced *two* complete runs on the same SHA (22 check rows per PR), which is how INFRA-329 happened: `gh pr checks --watch` read only one of the two and reported all-green on a red commit. Since every short-lived branch PRs into a protected branch, the `pull_request` trigger already covers 100% of what can merge. Consequences worth knowing: a feature branch gets **no CI until its PR is opened**, and a `push` run on `main`/`development` is the post-merge integration signal — the only check that runs after `gh pr merge --admin`. Never take a merge verdict from `--watch`'s exit status; use `statusCheckRollup` (wired into `/b-close` Step 3.4 and `/b-release` 6.5).

**`main` runs whatever workflows the last release shipped (INFRA-459).** A workflow added,
changed or retired on `development` does not take effect on `main` until a release carries it,
and a branch cut from `main` inherits `main`'s set — so a `hotfix/*` can execute a workflow
already retired on `development`. Read `git show origin/main:.github/workflows/`, never this
worktree. Retiring one also needs an API disable (`gh api -X PUT .../workflows/<id>/disable`):
`state` is API state, invisible to git, and deleting the file does not clear it.

**Multi-agent rule**: each Claude agent runs in its own worktree on its own feature branch. All agents converge on `development` via PRs. This is why `development` exists — it's the convergence point for parallel work streams.

## Release Process (INFRA-145)

1. Tranches land on `development` via `/b-close [WORK_ITEM_ID]` (which PRs to dev, waits for CI, merges via merge-commit).
2. When ready to ship to TestFlight, run `/b-release` from the development worktree:
   - Interactive prompt for bump type (patch / minor / major) — pass as arg to skip.
   - Skill auto-generates release notes from squash commits since last semver tag.
   - Bumps version across **FOUR sources** (INFRA-141): `app/package.json`, `app/app.json`, `~/dev/being/.config/env.production`, `~/dev/being/.config/env.development`. Refuses to run if any source disagrees.
   - Opens PR `development → main` (CI runs the same 10 gates — the PR resolves its workflow from the merge commit, so it runs `development`'s `ci.yml`, not `main`'s older copy).
   - Merges via **merge commit** (NOT squash — preserves per-tranche history visible on main).
   - Tags `main` with `vX.Y.Z`, pushes the tag, syncs the bare repo's `refs/heads/main`.
3. **A release is one command.** `--finish` is a recovery re-entry point, not a
   required second step: Phase 6.6 merges the PR itself via `gh pr merge --admin`, so
   nothing is pending between merge and tag. Use it only when the merge landed but
   tagging did not (version mismatch, legacy-tag collision, interrupted run) — and
   never re-run bare `/b-release` in that state, which would bump and PR a second time.

Tag scheme: `vX.Y.Z` semver. Pre-launch: `v0.x.y`. App Store launch: `v1.0.0`. Legacy `v2.x` tags from earlier development phases are filtered out by the b-release `--match 'v[0-9]*.[0-9]*.[0-9]*'` pattern.

## Hotfix Process

For bugs found in production (or TestFlight) that need to ship without waiting on in-progress dev work:

1. Cut a worktree off `origin/main` — there is no standing `main` checkout, and
   `git checkout main` inside the `development` worktree would move it off
   `development`, which the rest of the tooling assumes:
   ```bash
   git -C ~/dev/being fetch origin main
   git -C ~/dev/being worktree add ~/dev/being/hotfix-<slug> -b hotfix/<slug> origin/main
   cd ~/dev/being/hotfix-<slug>
   ```
   Branching off `origin/main` (not a local ref) also satisfies `strict: true`
   by construction. If the fix needs a build or the test suite, create the env
   symlinks by hand — `worktree add` does not, only `/b-work` does:
   `ln -s ../../.config/.env.production app/.env.production` and the same for
   `.env.development`.
2. Fix + commit
3. **Open the PR `hotfix/* → main` immediately** (NOT to development) — draft is fine, don't batch commits first. `hotfix/*` is **not** in `ci.yml`'s `push:` trigger, so a hotfix branch gets no CI until its PR exists; combined with the `--no-verify` allowance below, the PR run can be the only gate a hotfix ever passes. The `opened` event fires it.
4. After merge:
   - Tag main with patch bump (e.g., `v1.0.1`).
   - **Cherry-pick** the hotfix commit onto development — **via a PR, not a direct push**:
     ```bash
     git -C ~/dev/being/development fetch origin
     git -C ~/dev/being/development checkout -b fix/backport-<slug> origin/development
     git -C ~/dev/being/development cherry-pick <hotfix-sha>
     git -C ~/dev/being/development push -u origin fix/backport-<slug>

     gh pr create --base development --head fix/backport-<slug> \
       --title "fix: backport <slug> from main" \
       --body "Cherry-pick of <hotfix-sha>, already shipped on main via PR #<N>."

     # verify per /b-close Step 3.4 — statusCheckRollup, never `gh pr checks --watch` alone
     gh pr merge <PR> --merge --delete-branch --admin
     ```

5. Remove the hotfix worktree once the backport PR has merged:
   `git -C ~/dev/being worktree remove hotfix-<slug>`

**Why a PR and not `git push origin development`.** This step used to end with a direct push. That cannot work and never could: `development` protection is `required_pull_request_reviews` present (0 approvals, but present) **+** `enforce_admins: true`, so a direct push is rejected with `GH006: Protected branch update failed — Changes must be made through a pull request`, admin or not. Requiring a PR *at all* blocks direct pushes; the 0-approval count is irrelevant. It went unnoticed because no `hotfix/*` branch has ever been cut — every commit on `development` has arrived via a PR merge — so the procedure was written but never executed, and it would have failed mid-incident with the fix already live on `main` and `development` silently missing it.

Two details that matter in the same step:
- **Name the `<hotfix-sha>`, never `origin/main`.** If `main` advanced after the hotfix (a release, a second hotfix), `cherry-pick origin/main` picks the wrong commit.
- **Branch off `origin/development`, don't `checkout development`.** It satisfies `strict: true` (required-branches-up-to-date) by construction so the merge won't be refused as BEHIND, and it leaves the `development` worktree on `development`, which `/b-release` and the rest of the tooling assume.

Cherry-pick is preferred over rebase to keep dev's "prevent force-push" protection on. The duplicate commit content is fine — git handles identical content gracefully on the next release PR.

**Workflow-only corrections are hotfix-eligible (INFRA-458).** A diff touching ONLY
`.github/workflows/**` may go `hotfix/* → main` without waiting for a release — it moves no
lockfile so it cherry-picks cleanly, and the PR's own run on `main`'s `ci.yml` validates it.
It may only RESTORE a gate already proven on `development`, never author new CI there, and it
still backports via the cherry-pick PR above. Otherwise a gate added on `development` does not
protect `main` until the next release.

## Workflow Commands

| Command | Purpose |
|---|---|
| `/b-create [TYPE] - [Name]` | Create Notion work item from conversation context with dimension scores |
| `/b-work [WORK_ITEM_ID]` | Fetch work item, create worktree off `development` (with env symlinks per INFRA-141), install deps, then Phase 3 runs two test passes — Pass 1 picks the lane (test-first / test-after / skip; clinical/safety logic forced test-first), Pass 2 identifies tests via the Validation Matrix and writes them — before/around implement |
| `/b-close [WORK_ITEM_ID]` | Push feature branch, open PR to `development`, wait for CI, merge via merge-commit (INFRA-145), update Notion to Done. Phase 2.5 Maestro safety-e2e gate runs scoped flow(s) when safety paths change (INFRA-171). `--push` deprecated (PR merge always pushes). `--skip-e2e` hotfix-only. |
| `/b-release [BUMP] [--finish]` | Promote `development → main` as a release. Interactive bump prompt + FOUR-place version bump (INFRA-141) + env schema pre-flight + auto release notes. Tags + pushes inline; one command start to finish. `--finish` is recovery-only re-entry when the merge landed but tagging did not. |

Branch naming: `feat/*`, `fix/*`, `chore/*` (mapped from work item TYPE). Conventional commits. Aim for <400 LOC per PR.

**Notion work-items DB**: `NOTION_WORK_DB = 277a1108-c208-805c-810b-000b0f0aae22`. Single source of truth — referenced by slash commands as `${NOTION_WORK_DB}`. Rotate here only.

💡 **Recommended mode**: enable Accept Edits (Shift+Tab to cycle) for `/b-work` / `/b-close` / `/b-release` runs. These skills make many sequential tool calls (Notion + git + gh CLI + version bumps). For complex architectural work, consider Plan mode first.

## Docs Map

- `docs/product/` — PRD, TRD, DRD, roadmap, Stoic Mindfulness framework (`stoic-mindfulness/INDEX.md`)
- `docs/architecture/` — system design
- `docs/development/` — dev guides
- `docs/legal/regulatory-applicability.md` — **source of truth for what regulations apply** (FTC, CCPA, TDPSA, GDPR; NOT HIPAA/FDA)
- `docs/legal/breach-notification-runbook.md` — **internal operational procedure** for FTC HBNR (16 CFR Part 318) breach response; founder + counsel only, NOT user-facing (operationalizes the public commitment in `privacy-policy.md` §4.4)
- `docs/legal/dpia-sensitive-wellness-data.md` — **internal DPIA** for sensitive wellness-data processing (TDPSA/CPA/VCDPA/CTDPA); regulator-facing, NOT user-facing
- `docs/security/` — encryption, secure storage
- `docs/testing/` — test strategy
- Source architecture detail: `app/src/README.md`
- Full dev command reference: `QUICKSTART_COMMANDS.md` (at worktree root)

## Known Gotchas

- React must stay at `19.2.3` for RN 0.85.x compatibility — `version-check` script enforces.
- iOS minimum is `16.4` (SDK 56). New Architecture and edge-to-edge are mandatory and cannot be disabled.
- **Android platform config is answered from committed `app/android/`, never from `app.json`.** Only iOS is CNG
  (INFRA-280), so an absent `app.json` android key proves nothing — the generated project is the record and may
  already carry the setting (`edgeToEdgeEnabled=true` lives in `android/gradle.properties` today).
- Vector icons use scoped `@react-native-vector-icons/*` packages (migrated from `@expo/vector-icons` in INFRA-158). On the crisis path, keep `import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons'` eager at module top — do not lazy-import.
- `LSApplicationQueriesSchemes` in `app/app.json` (`tel`, `sms`) is **required** on iOS 13+ for the crisis dial path. Without it, `Linking.canOpenURL('tel:988')` returns `false` and `CrisisResourcesScreen` falls back to an "Unable to Call — please manually dial" alert during a crisis. Most jest tests mock `canOpenURL`, so they cannot catch a regression on the runtime path. **Primary mechanical pin (INFRA-184)**: the jest static-config test at `app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts` reads `app.json` directly and asserts the array contains `tel` and `sms`. It runs in `npm run precommit` in <100ms — a regression fails the commit before a build is produced — **and, since INFRA-368, in the `Safety + privacy gates` CI job**, which is in `ci-pass`'s `needs` and its exit condition. The CI half is not redundant, it is the load-bearing half — but it gates **`development` unconditionally and `main` only once a release carries it there**, because a PR into `main` resolves its workflow from the merge commit and so runs `main`'s own last-released `ci.yml`. That lag is a real exposure window, not a technicality: `hotfix/*` is the only branch class targeting `main` and is exactly where `--no-verify` is permitted. Verify before relying on it — `git show origin/main:.github/workflows/ci.yml | grep -c safety-privacy` — and see INFRA-458. This entry used to justify INFRA-184's removal of the Maestro trigger on `app.json` changes by claiming the pin "runs on every commit on every machine" — but a hook is not a control on what reaches `main`: `--no-verify` is permitted by policy on `hotfix/*` (the branch class most likely to touch crisis config under pressure), and a hook cannot run on a machine that never installed husky. INFRA-280 sharpened it further by moving iOS to CNG, so `app.json` is now the sole source of the generated `Info.plist` and no reviewer ever sees a plist diff. Dropping the Maestro trigger only became sound once the CI gate existed. **Supplementary device-only pin, CURRENTLY UNRUNNABLE**: `app/.maestro/crisis-988-dial.yaml` (tagged `safety-device-only`) is the only thing that ever verified the runtime dial behavior on real hardware, and DEBUG-589 measured that no Maestro version can execute it. So the config half is gated and the RUNTIME half is unverified indefinitely — a green precommit and a green `npm run e2e:safety` do not mean the dial path was verified. It is excluded from `npm run e2e:safety` because iOS simulator's `canOpenURL` returns false unconditionally regardless of the array contents. The `/b-close` Phase 2.5 gate no longer runs this flow on `app.json` / `Info.plist` changes (the jest test already caught the regression in precommit). If you add a new scheme to the crisis path (e.g., `mailto:`), add it to this array AND extend the jest test to assert the new scheme is present.
- App Groups entitlement for the iOS widget is injected via a local config plugin at `app/plugins/withAppGroupsEntitlement.js` (was previously `expo-build-properties`'s `ios.entitlements`, removed in SDK 56).
- Both INFRA-158 SDK 56 default opt-outs have now landed: `EXPO_PUBLIC_USE_RN_FETCH=1` was dropped in MAINT-163 (`globalThis.fetch` is Expo's `expo/fetch`), and TypeScript `5.9.x` → `6.0.x` in MAINT-162. **TS 6 gotcha**: it stopped auto-including `@types/node`'s ambient globals, so `tsconfig.json` now pins `types: ["node", "react"]` (without it, `NodeJS.Timeout` / `global` fail to resolve codebase-wide). TS 6 also deprecates `baseUrl` (removed in TS 7) — silenced via `ignoreDeprecations: "6.0"`; the clean `baseUrl` removal is deferred to the eventual TS 7 migration (it requires re-validating `@types`/`typeRoots` inclusion together).
- `AsyncStorage` is unencrypted by design; wellness data must use `expo-secure-store` + AES-256.
- Encryption tests are slow (`test:encryption`) — run during pre-push, not pre-commit.
- iOS and Android behavior must match (use `npm run platform:both` to verify).
- Slash commands in `.claude/commands/` must use **absolute paths** (`/Users/max/dev/being/.claude/...`) for any internal file references — never relative `./.claude/...`. This avoids the symlink dance.
- Compliance terminology: "wellness data" not "PHI"; "AES-256 encryption" not "HIPAA-compliant encryption"; "wellness screening" not "clinical assessment."
- Env files live canonically at `~/dev/being/.config/{.env.production,.env.development}` (gitignored at bare root). The leading-dot prefix on the target filenames is **required** since MAINT-190 (2026-05-29): Expo SDK 56's `@expo/metro-config` transform-worker pattern-matches `(^|\/)\.env(\.(local|...))?$` against the *resolved* symlink target, so the canonical files must themselves be named `.env.*`. Without the dot, Metro falls through to its JS parser and throws `SyntaxError: Unexpected token (1:0)` on the `#` comment, breaking every iOS dev build. Worktree `app/.env.{production,development}` are symlinks. `/b-work` creates the symlinks automatically; manual `git worktree add` requires creating them by hand (`ln -s ../../.config/.env.production app/.env.production` and same for development). Dev env has empty `EXPO_PUBLIC_SENTRY_DSN` so Sentry no-ops locally; production env carries the real DSN. Back up the canonical files in 1Password — deleting `.config/` breaks all worktrees.
- Maestro safety-e2e (INFRA-171) is **local-only** — no CI macOS runners. Install with `brew install mobile-dev-inc/tap/maestro` (NOT `brew install maestro` — different cask; see `docs/testing/e2e-maestro.md`). Prereq per run: an iOS sim booted with a **Release** build of `fyi.being.app` installed — run **`npm run e2e:safety:build`**, **not `npm run ios`** (Debug ships the dev launcher). **Since INFRA-383 this is `expo run:ios --configuration Release`, not `eas build --local`. Measured on-machine (INFRA-436, 2026-08-14): a first build in a *fresh* worktree is **21m31s**, not the ~14 min this entry used to claim — budget ~2× whatever you were planning. A rebuild after a branch switch is ~90 s and a no-op rebuild ~30 s. There is a THIRD tier between them, and it is the one that surprises people: after anything regenerates the native project (a CNG-input change firing `expo prebuild --clean`), the next build is **11–14 min** — measured 11m05s / 12m43s / 14m26s over three instrumented runs (INFRA-508), superseding an earlier single 419 s reading — because the regenerated project invalidates most of the object cache even though the cache itself survives. So the tiers are 21m31s cold / 11–14 min post-regen / 1–4 min switch / ~30 s no-op.** Warm time does **not** scale with diff size: a 112-file switch measured 87 s against 93 s for a 37-file one, because the RN bundling phase re-runs wholesale either way. Treat any switch as 1–4 min — **unless it moves dependency content, the lockfile, `app.json`, `plugins/` or `patches/`**, which regenerates the native project. **Since INFRA-508 the trigger is a content fingerprint (`app/scripts/cng-fingerprint.js`), not `app/package.json`'s mtime**, so an npm-script edit is warm; before that, ANY package.json move cost 11–14 min — including one a peer caused by re-pointing the shared gate worktree, which is why the cost looked unattributable from the session paying it. (The old "~11 min if `app/ios/` already exists" figure was not re-measured.) The EAS path remains as `npm run e2e:safety:build:eas` for re-measuring the baseline after toolchain upgrades; `npm run e2e:safety:clean` reports/reclaims the ~7.5 GB-per-worktree DerivedData. **Know where that cache actually is before reasoning about it (INFRA-436).** It is `~/Library/Developer/Xcode/DerivedData/Being-<hash>`, keyed by *workspace path* — measured 5.0–7.2 GB each and 27 GB across 5 worktrees — **not** `app/ios/build`, which is 1.1 MB of products only (the ~600 MB under `app/ios/` is `Pods/`). Two consequences that are easy to get backwards: `expo prebuild --clean` deletes `app/ios/` and therefore does **not** wipe the object cache, so a CNG-input change costs a `pod install` + project regen (measured 11–14 min — over half a cold build, not free), not a full cold recompile; and because the key is the path, a worktree that has lost `app/ios/` entirely can still be holding 5 GB (`feat-417` is the live example). Reclaim with `e2e:safety:clean`, not by deleting `ios/`. A plain `expo run:ios --configuration Release` is already launcher-free (autolinking marks `expo-dev-launcher`/`expo-dev-menu` `debugOnly: true`). The old EAS-only belief came from a verification command missing its `--` separator, so the flag went to npm and built Debug. **The build no longer needs a clean working tree (INFRA-384).** This entry used to say it did, and that the pre-flight would relax "only once a provenance marker replaces the guarantee" — the marker has landed, so it has. `e2e-sim-build.sh` now writes `.e2e-provenance.json` (git HEAD + a tree hash + a dirty flag) **inside the installed container**; `simctl` mints a new container UUID on every fresh install, so any reinstall — `npm run ios`, a manual `simctl install` — takes the marker with it, and that disappearance *is* the binding. `e2e-safety.sh` verifies before any flow and fails closed on `MISMATCH`/`MISSING`; a dirty build still runs behind a "NOT MERGE EVIDENCE" banner, and `/b-close` Phase 2.5 sets `E2E_REQUIRE_CLEAN_PROVENANCE=1` to refuse it outright. **Net: iterate dirty freely, but you cannot merge on a dirty-tree build** — a distinction the old pre-flight could not make, since it banned both. The tree hash includes **untracked file contents** (`git status --porcelain` + `git diff HEAD` is blind to them, and untracked `.ts` under `app/src` is bundled). **So keep notes, drafts and logs OUT of the worktree** — put them in the session scratchpad or `/tmp`. An untracked scratch file written between the gate build and `e2e-provenance.js verify` reads as MISMATCH and costs a rebuild, not a warning. Two blind spots: gitignored `app/ios/` and `app/.env.*` do not move the fingerprint, and the fingerprint is repo-wide, so editing a `.maestro` flow between build and run invalidates the marker (over-refusal — the safe direction). **The per-flow scripts (`e2e:safety:q9` etc.) now route through `e2e-safety.sh` rather than calling `maestro` directly** — as bare invocations they bypassed every pre-flight, so the one path `/b-close` Phase 2.5 actually takes was the one path with no checks on it; keep any new per-flow script routed the same way. Related: **never pipe the build command** (`| tee`, `| tail`) **or chain one after it** (`; echo`) — the shell reports the *last* command's status, so a failed build reads as exit 0; use `set -o pipefail` if you must capture. **And if you must abort a build mid-run** (typically because `development` advanced and the gate has to test the merged tree), kill the `xcodebuild` PID itself — `pkill -f e2e-sim-build` / `-f "expo run:ios"` reaps only the wrapper and leaves `xcodebuild` holding the DerivedData `build.db` lock, so the next build dies with `unable to attach DB … database is locked. Possibly there are two concurrent builds running in the same filesystem location.` The script's three internal retries cannot clear it — they re-enter the same lock. Find the survivor with `ps aux | grep [x]codebuild`. Since INFRA-383 the script also asserts, fail-closed, that the artifact is launcher-free (3 signals), carries a bundle newer than the run, matches the resolved `e2e-sim` env, and kept `tel`/`sms` in `LSApplicationQueriesSchemes`; `e2e-safety.sh` re-checks the artifact's shape before running any flow. **`Open in "Being"?` is a per-simulator LaunchServices scheme approval, seeded by the gate's pre-flight (DEBUG-422).** Not iOS-version- or model-specific — a fresh 18.6 sim alerts like a 26.0 one; the long-green baseline had merely been approved by hand. It outlives the flow that raised it, so later flows fail against a healthy app. Never approve `exp+being` — that is the INFRA-407 regression. **`simctl erase` is safe only for state the pre-flight seeds, and there are now two such pieces (DEBUG-506).** The second is iOS's QuickPath typing tutorial (`com.apple.keyboard.preferences DidShowContinuousPathIntroduction`): it fills the keyboard's whole region, is **not** a keyboard node, and erase restores it — so before it was seeded, an erased sim red-lined `journal-crisis-scan`'s three `UIKeyboardLayoutStar Preview` assertions against a healthy app. Same reflex both times: if a keyboard-up or deeplink flow reds right after an erase, suspect unseeded device state before the app. Related, and measured on the gate sim: `ConnectHardwareKeyboard` is unset by default and a software keyboard **does** rise, so `crisis-keyboard-accessory`'s device-only rationale was false; the pre-flight now refuses rather than seeds that half, because it is host-side and a write cannot be proven to have landed. **The Maestro version is pinned (DEBUG-589)**: `app/package.json` → `maestro.pinnedVersion`, enforced fail-closed by `e2e-safety.sh` (exit 2). Moving it means re-certifying every flow in the same commit; `E2E_ALLOW_MAESTRO_VERSION_DRIFT=1` trials one but is not merge evidence. Flows live in `app/.maestro/`; `npm run e2e:safety` runs the **15** sim-runnable safety-tagged flows (`crisis-988-dial` and `crisis-keyboard-accessory` are `safety-device-only` and `daily-loop-ax5-entry` is `safety-dynamic-type`, so none of the three are in it; `_`-prefixed files are `helper` subflows, not flows). The runner globs by tag, so a flow silently acquiring `- safety` changes what the gate runs; since FEAT-457 a jest tripwire in `__tests__/scripts/e2e-dynamic-type.test.js` pins the count, so adding a flow is SUPPOSED to red-line it — bump it in the same commit. Verify with `grep -c 'safety$' app/.maestro/*.yaml`. The `/b-close` Phase 2.5 gate runs scoped flows when safety paths change. `--skip-e2e` bypass mirrors the `--no-verify` policy below: **`hotfix/*` only**. **Never run the safety suite as a reap-able background task.** A killed run takes the XCUITest driver with it — the flow reports `Unknown error`, with `ConnectException` only in `maestro.log`, indistinguishable from a regression — and a kill during `clearState` leaves the app uninstalled. Launch detached (`nohup … &`) and poll for a completion sentinel. The same applies to `e2e:safety:build`. A reaped build reports `expo reported success but produced no .app` — indistinguishable from a real build failure, and it can leave `xcodebuild` holding the DerivedData lock. Launch it detached too, and poll for a sentinel. Authoring + debugging guide: `docs/testing/e2e-maestro.md`.
- **The safety gate is single-device — never fan out across simulators to "certify" a viewport.** `e2e_resolve_sim_device` resolves exactly one UDID and refuses when 2+ are booted; `e2e-gate.sh` dies unless it resolves a single one; nothing iterates devices. The smallest-viewport warning is informational, **not** an instruction to re-run elsewhere. It keys on the **derived viewport** (INFRA-478) — `mainScreenWidth`/`Height`/`Scale` from the booted device's own `profile.plist` — and is rename-proof by construction. This entry used to say it matched the *display name*: that was true, this bullet is what flagged it as a hazard, and INFRA-478 retired it. Do not reason from the name in either direction — the old `case` on the substring `iPhone SE` was wrong BOTH ways, silently satisfied by a 320x568 SE 1st-gen and defeated by any rename. A viewport that cannot be derived skips the check and says so. One device per close; multi-device is a diagnostic, on explicit request only.
- **A physical iPhone whose tunnel is asleep reads as “no device attached.”** `e2e_attached_devices` drops `tunnelState: "disconnected"` (`e2e-real-device.sh:35`) and the tunnel is lazy, so a wired, paired, Developer-Mode-enabled iPhone still enumerates EMPTY at exit 0 — which `e2e_resolve_real_device` refuses on, reporting no device while you are holding one. Distinguish the two rejected states before reacting: `disconnected` with `transport: wired` is a sleeping tunnel — wake it with `xcrun devicectl device info details --device <udid>` and re-resolve; `unavailable` with `transport: None` is genuinely unplugged. **But NO device flow can run, on any Maestro version (DEBUG-589), and `e2e-safety.sh` now refuses the device path up front with exit 5 rather than letting it die at ~8s with `NO_REPORT`.** Measured across 2.0.0..2.10.0: `>= 2.2.0` cannot build the driver (`MaestroDriverLib/` is declared by the shipped Xcode project and shipped in zero releases), `<= 2.1.0` builds but its runner never becomes ready on iOS >= 26. Upgrading cannot fix it. Read a device refusal as a toolchain failure, never as a dial-path regression — and never as this bullet's sleeping tunnel, which is a different, recoverable state. Simulator flows are unaffected: they use a prebuilt driver and never compile. A freshly-woken tunnel can also refuse `process launch` for an untrusted profile until it revalidates; re-wake and retry before sending anyone to Settings. Two flows are `safety-device-only`, not one: `crisis-988-dial` (unrecoverable — the sim's `canOpenURL` is unconditionally false) and `crisis-keyboard-accessory` (its reachability half MIGRATED to the sim suite as `crisis-keyboard-reachability` — DEBUG-506/590; only the hardware residual is unavailable). The dial's runtime behaviour is unverified indefinitely; the surviving jest pins cover config and call-site routing, not hardware. Compensating: INFRA-591 attended checklist, INFRA-592 generated-plist assertion.
- **`E2E_SIM_UDID` is honoured at any booted-device count, matched as an exact UDID
  (DEBUG-497).** A pin naming a device that is not booted REFUSES (exit 3, a pin-mismatch
  message distinct from the 2+ collision) rather than falling back — so a stale exported pin
  stops a session instead of mis-attributing it. Prefix and device-name pins are refused too.
- **Never identify a process with `pgrep -f` / `pkill -f` in the Maestro tooling (DEBUG-392).** `-f` matches against a process's *full command line*, so it also matches any shell that merely **mentions** the string. Claude Code wraps Bash calls in `/bin/zsh -c '<command>'`, so a check written this way matches its own wrapper: **correct when a human tests it interactively, wrong when it runs from a script, an alias, or an agent** — which is why review does not catch it. Three independent derivations of the broken form landed on 2026-08-12: DEBUG-392's driver-reset guard (it fired on all 5 quiet runs, having matched a *peer session's `pgrep` poll*, and stayed silent on the one genuinely contended run — exactly inverted); DEBUG-408's doc callout, where a false "someone else is running" in a pre-flight would have meant the human **doesn't run the gate**, failing toward not-testing; and INFRA-407's `pkill -9 -f "test-without-building"`. Reproduce with `/bin/sh -c 'x="maestro.cli.AppKt"; sleep 8' &` — the `-f` form reports a live JVM. Correct shape: require the executable to *be* the process (`ps -axo pid=,comm=,args=`, match `$2 ~ /(^|\/)java$/`) and exclude your own process group. **Both instances are now fixed — INFRA-423 closed the reaping half**, so `app/scripts/e2e-safety.sh` no longer contains any `pkill`/`pgrep` and `other_maestro_jvms()` is gone (absorbed into `app/scripts/e2e-driver-ownership.sh`). That helper reaps an **explicit pid list**, classifying each driver by its PARENT: our own process group → reap; a *live* `maestro.cli.AppKt` JVM parent → protect (a peer, mid-flow); `ppid 1` → reap (an orphan belongs to no live run, including a peer's crashed leftover); live non-JVM parent → protect. Note UDID is a device filter and **never** an owner — two worktrees routinely share one simulator, so reaping `test-without-building + $SIM_UDID` would be the same defect with a longer pattern. The reset also runs pre-flight, and logs the empty case out loud, because an ownership check that silently stops matching looks exactly like a quiet machine. Related: the two `safety-device-only` flows are the only ones INFRA-405 does **not** pin to a device, so they could attach to an arbitrary booted simulator — moot since DEBUG-589, which refuses the device path before maestro is invoked.
- **Verifying a bash block extracted from a skill file: run it under `bash`, not the tool's
  wrapper.** Claude Code wraps Bash calls in `/bin/zsh -c`, and zsh does not word-split
  unquoted expansions, so `for x in $LIST` yields one blob where bash yields N. An extracted
  Phase 2.5 block then produces phantom defects that vanish under `bash -c`. Same family as
  the DEBUG-392 `pgrep -f` rule, inverted: the test shell, not the tested code, is wrong.
  The same wrapper makes `${PIPESTATUS[0]}` EMPTY — zsh arrays are 1-indexed (`$pipestatus[1]`)
  — so `cmd | grep …; echo ${PIPESTATUS[0]}` prints nothing and a failed command reads as a
  blank pass. Capture with `; rc=$?` on an unpiped command, or run the block under `bash`.
- **The gate now watches its target for the whole suite, and exits 3 if it moves (INFRA-434).** Provenance was verified once at pre-flight, then flows ran for minutes with nothing re-reading the container — so a binary replaced mid-suite still reported PASS. `e2e-safety.sh` snapshots the marker's **bytes** after the pre-flight verdict and re-reads them before each flow and once after the last, which covers the 1-of-1 scoped run `/b-close` usually takes. Two arms, because an uninstall leaves nothing to attribute: `REPLACED` names the new marker's `repoRoot` and `branch`; `VANISHED` refuses without attribution. Completed flows are relabelled `VOID`, not `PASS` — a marker change bounds a window, not an instant. Exit codes are now 0 pass / 1 flow regression / 2 harness could not complete / **3 target replaced**. Bytes, deliberately, not a per-flow `e2e-provenance.js verify`: its `fingerprint()` hashes untracked file contents repo-wide, so re-verifying per flow would abort a suite whose binary never moved the moment you save a file. **INFRA-436's lock is not a substitute** — it covers a peer's `npm run e2e:safety:build` and nothing else; `e2e:safety:build:eas`, `npm run ios`, Xcode Run and a manual `simctl install`/`uninstall` all take no lock. Do not replace the installed app while a suite is running. Conversely, check for peer builds BEFORE spending one — `ps -axo pid=,args= | awk '/e2e-sim-build|expo run:ios/'`, never `pgrep -f`. The lock queues your build but is released before your flows run, so a peer finishing right after you costs the whole run.
- **A back-merge that moves `app/package.json` or the lockfile needs `npm ci` before any
  test run** — not only a `@mp2ez/being-design-system` pin move. A stale tree keeps
  packages the merge DELETED, so tests pass locally against a toolchain CI does not
  install (a jest-preset swap is the quiet case; a design-system pin fails loudly on
  token VALUES, looking like a bad merge rather than a stale install).
- **`patch-package` is wired into `app/package.json` (INFRA-176)** with a `postinstall: patch-package` script. Currently one patch: `app/patches/expo-modules-jsi+56.0.12.patch` rewrites `weak let` → `weak var` in 14 Swift files because Xcode 26.0.1's Swift 6.2 promoted `weak let` from warning to hard error and the SDK 56 pin of `expo-modules-jsi@56.0.12` predates that. **Every `npm install` reapplies the patch automatically** — do not manually edit `node_modules/expo-modules-jsi/` because the next install will overwrite. When the next Expo SDK upgrade lands, check whether `expo-modules-jsi` ships `weak var` natively; if so, delete the patch file and remove the postinstall script. New patches go alongside this one and stack automatically — no further wiring needed.
- **After back-merging dev when `app/ios/Podfile.lock` checksums shift** (typically `hermes-engine`, `React-Core-prebuilt`, `ExpoModulesCore`, or anything `expo-modules-jsi`-adjacent): the simulator's existing native binary and the worktree's CocoaPods integration are stale against the new lockfile, and the app throws `[runtime not ready]: ReferenceError: Property 'MessageQueue' doesn't exist` immediately after the JS bundle loads. This is **not** a JS-side issue — Sentry, Detox, and the other usual suspects don't access `MessageQueue` at runtime; the error is Hermes / bridge init failing because the native binary was compiled before the patched `expo-modules-jsi` (INFRA-176) reached the Pods integration. Fix sequence: `cd app/ios && pod deintegrate && pod install` (rewires the Xcode project against the patched source), `rm -rf ~/Library/Developer/Xcode/DerivedData/Being-*` (kills stale build artifacts), delete the Being app from the simulator (removes the pre-patch native binary), then `npm run ios`. Metro cache clear alone does not fix this — the binary mismatch is native-side. Discovered during the INFRA-62 → dev back-merge.
- **A long-lived worktree's `app/ios/Pods` ages out of sync with `node_modules`, and SDK 56 makes that a
  launch crash.** Expo modules ship as *prebuilt* xcframeworks, so `Pods/ExpoModulesCore.xcframework` is a
  build INPUT — no DerivedData clear can fix it. Symptom: `dyld: Symbol not found … ExpoModulesJSI`.
  Fix is `expo prebuild --clean --platform ios` (`--platform ios` is required: `app/android/` is committed).
- **Yargs array-coercion on duplicated `--testTimeout` CLI flag (INFRA-180, RESOLVED)**: ~15 tests were quarantined for "the CI fake-timer + coverage flake on Ubuntu" — a framing that turned out to be wrong. Actual root cause: `npm run test:integration -- --ci --testTimeout=30000` combined with the package.json script's own `--testTimeout=30000` made yargs produce an array `[30000, 30000]`. Jest formatted that into error messages as `"Exceeded timeout of 30000,30000 ms"` and coerced it to `NaN` for the actual timeout, which `setTimeout` treats as `0 ms`. Tests with async `waitFor` failed in ~10 ms; sync tests passed because they finished first. The asymmetry disguised a deterministic bug as flakiness. Fix shipped in PR #80 (commit `8a9b39e`): removed `--testTimeout=30000` from the package.json `test:integration` script (CI yaml still provides it). Re-enabled `PracticeTimerScreen`, `ReflectionTimerScreen`, `BodyScanScreen`, and `subscription.integration`. **Lesson**: when a Jest error contains an unexpected character (a comma, a duplicated value, malformed units), trust the literal message before reaching for environmental hypotheses — the original 2-hour investigation chased Ubuntu kernel timer resolution and Node-20 fake-timer bugs because it read `30000,30000` as `30000` with formatting noise. **Triage pattern for future**: reproduce locally with the EXACT CI invocation (including the `-- ` flag separator). If the local error string matches CI character-for-character, the variable is the command, not the environment. Resolution doc: `docs/development/test-fake-timer-ci-flake.md`. The remaining quarantined tests after INFRA-180 (sync/analytics integration, practices-flows-integration, comprehensive-assessment-integration, EmbodimentScreen and 4 other orphans) were resolved across **MAINT-188's 9 PRs** (2026-05-29) via a per-file audit pattern: re-enable cleanly (PR 1), shape-rewrite the genuine coverage (PRs 4-5), delete trust-debt (PRs 2-3, 6-7), fix the perf-budget anti-pattern (PR 8), and remove dead orchestrator scripts (PR 9). Net: +41 newly-passing tests on CI, -4156 LOC of dishonest/redundant tests deleted, precommit retry tax eliminated. **Pattern lesson for future quarantine audits**: each quarantined file deserves its own audit before applying a fix shape — inherited AC framings systematically understated rot, and ~50% of MAINT-188's files turned out to be redundant or aspirational rather than salvageable.
- **Source-string test assertions must strip comments before matching (DEBUG-390)**. Several suites assert against `fs.readFileSync` source rather than a rendered tree — `__tests__/safety/crisis-zero-988-windows.test.tsx`, `CollapsibleCrisisButton.accessibility.test.ts`, and any new structural pin that follows their shape. This codebase also *deliberately* names anti-patterns in prose to warn the next reader off them, which is a house convention worth keeping. The two collide: a bare `expect(source).not.toContain('accessibilityViewIsModal')` matches the comment saying **do not use** `accessibilityViewIsModal` and fails on correct code. It is not a flake and it is not fixed by rewording the comment around the test — the assertion is about what the file *does*, so strip block and line comments first (`.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')`) and match prop-shaped patterns (`/foo\s*[=:]/`) rather than the bare identifier. Note the second failure mode this creates: comment-stripping plus a narrow regex is exactly the combination that can silently match nothing at all, so pair it with an assertion proving the matcher still fires (assert the regex against a literal known-bad string, and that the stripped source is non-trivial). Same reasoning as the `check:breathing-worklets` structural guards — a source-shape assertion is only worth its cost if it can still go red.
- **A feature barrel (`index.ts`) re-export enlarges the eager module graph of every importer, including safety paths (FEAT-376).** Exporting unrouted code still loads it wherever the barrel is imported, so a path-based reading of "does this touch a safety surface" can answer no while the barrel is what makes it reachable. Same family as the `MaterialDesignIcons` eager-import rule, and jest does not stand in for it — no Metro, different eager-init ordering. Check the barrel's consumers before concluding new code is off a safety path, and before recording that a Phase 2.5 run cannot exercise your change.
- **An Expo config plugin registered as a bare string takes its library defaults, which can add permissions.** On a permission option `false` DELETES the Info.plist key rather than skipping it, so a later plugin can strip an earlier one's disclosure — omit to inherit. `app/ios/` is CNG, so none of it shows in a diff: regenerate, read the plist, pin it.
- **A control pinned below a ScrollView shares screen coordinates with the content clipped behind it (DEBUG-465).** XCUITest drops elements outside the SCREEN but keeps ones merely outside a ScrollView's clip, so Maestro scores them visible, skips `scrollUntilVisible`, and taps the pinned control instead. Use `centerElement: true` to force a real scroll.
- **`app/` has two test roots, so a `src`-scoped grep cannot answer "is this dead?" (INFRA-84).** Co-located suites sit under `app/src/**/__tests__/`, but a second tree at `app/__tests__/` holds 14 suite directories (`unit`, `safety`, `clinical`, `privacy`, `security`, `integration`, …) and the `package.json` scripts glob it by name — `test:unit` matches `/unit/i`, so a suite there runs in `precommit` while staying invisible to `grep -rn … app/src`. A "no callers, safe to delete" finding drawn from `app/src` alone is unverified; grep both roots, plus `supabase/functions` for anything the edge functions call.
- **A Notion comment over ~4,000 RENDERED characters is truncated mid-sentence, silently.** Measured: the cap is per comment (a single-`discussion_id` fetch cuts identically, so splitting across comments does work) and applies to the RENDERED form — `**`, backticks and `<br><br>` all count, so ~3,500 plain characters is the real ceiling. Nothing in the payload flags it: the cut ends in an ellipsis and reads as ordinary prose, so a half-read re-scope looks complete. Treat a comment ending mid-clause as truncated. **Page bodies are not capped** (a 14k-char body round-trips whole), so long re-scope findings belong in the body with a short comment pointing at it — which also fixes `Last edited time` being blind to comment-only rescopes. Also: a bare `CLAUDE.md` in a body gets auto-linkified to `[CLAUDE.md](http://CLAUDE.md)`; backtick filenames.
- **Proving a migration landed before an observed event**: `schema_migrations` is `(version, statements, name)` only and `track_commit_timestamp` is off, so no application timestamp exists. Compare `xmin::text::bigint` on the changed `pg_proc`/`pg_class` row against the observed row's — transaction ids are monotonic, so ordering is provable from data.
- **A new `Deno.env.get` in `supabase/functions/` needs a `deploy-manifest.json` entry in the SAME commit (INFRA-442).** `scripts/supabase-deploy-drift.js --reconcile` (CI `Security + compliance`) fails both ways — undeclared read, and declared-but-unread (`SECRET STALE`) — so a secret cannot be pre-declared ahead of its reader. It walks `_shared/` too, where nothing reads env at all: config arrives as a parameter.
- **An empty result from a filtered test run is not a pass.** Bash working directory
  persists between calls, so a `cd` earlier in a session leaves `npm run test:*`
  executing outside `app/`, where npm exits ENOENT and prints nothing a
  `grep -E "Tests:|FAIL"` would match. Assert the `Tests: N passed` line is PRESENT;
  never infer a pass from absent failures. Same family as the "never pipe the build
  command" rule — both turn a command that never ran into a green reading.
- **Stopping a backgrounded `npm run test:*` leaves its jest child running.** The wrapper
  dies, jest does not, so a re-run puts two suites on one tree — they contend, and an edit
  made "between" runs lands mid-flight in the survivor. Reap the jest PID itself, matched on
  YOUR worktree path; `pkill -f jest` and `grep -c jest` also hit other repos' stale workers.
- **A jest test that drives `e2e-safety.sh` end-to-end must set `E2E_HOST_SETTLE_MAX_S=0`.**
  The host-contention settle waits up to 120s for a busy machine to go quiet, so the suite's
  runtime becomes a function of peer load and blows its own `spawnSync` timeout — a kill, not
  a failure, so it reads as a defect in the code under test. It does NOT make
  `npm run test:scripts` runnable: sibling suites there spawn `e2e-sim-build.sh` per case
  (~4-5s each), so the full run can exceed 10 min with peers active. Run the affected suites
  by name and let CI's `Unit + integration tests` gate cover the rest.
  But NOT for the whole `__tests__/scripts` run: `e2e-host-contention.test.js` *tests* the
  settle, so the override reds 3 of its cases against healthy code. Exclude that file, or
  run it separately — it is 44/44 green without the variable.
- **A new `app/scripts/*` file needs `git add` before the npm script naming it will pass
  (DEBUG-389).** `check-workflow-scripts.js` resolves every `npm run` target against the git
  INDEX, not the working tree, so an unstaged new script fails `test:scripts` as an
  unrelated-looking red. Stage the file with the package.json edit.

## Git Hooks (INFRA-155)

Husky v9 wires two hooks. **pre-commit** (INFRA-156) runs `npm run precommit` → `typecheck && lint:baseline && test:safety && test:clinical && test:unit && test:privacy`; fires on every `git commit`. This entry used to list four scripts and "~16s", omitting `test:safety` and `test:privacy` — the real chain is six and `test:safety` alone measures ~15s warm / ~58s cold, so budget well past a minute. That understatement mattered: the argument below for keeping CI-class checks off the hook is precisely that slow hooks train `--no-verify`, and the hook was already heavier than the doc claimed. **pre-push** (INFRA-155) runs `npm run prepush` → `check:crisis-hotline` (~1s); fires on every `git push`. Heavy CI-class checks (test:ci, full clinical-complete) run on CI, not locally — running them on every push would train `--no-verify`. **Bypass policy**: `--no-verify` (commit or push) permitted *only on `hotfix/*` branches*. For `feat/*`, `fix/*`, `chore/*` — never. Full rationale: `docs/development/git-hooks.md`.

## Convention Reminders

- TDD for: bug fixes, pure logic, stateful algorithms, complex edge cases. Test-after for: API integrations, UI, glue code.
- When making multi-file or architectural changes: outline approach, get approval, then build.
- Push back with reasoning when something is wrong; no performative agreement.
