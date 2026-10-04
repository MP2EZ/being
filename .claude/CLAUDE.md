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
| `app/src/core/stores/consentStore.ts` | `crisis` + `compliance` |
| `app/src/core/hooks/` | `crisis` |
| `app/src/core/components/ThresholdEducationModal.tsx` | `crisis` + `philosopher` |
| `app/src/features/insights/components/` | `crisis` + `philosopher` |
| `app/src/features/insights/screens/InsightsScreen.tsx` | `crisis` |
| `app/src/features/home/screens/CleanHomeScreen.tsx` | `crisis` |
| `app/src/features/profile/screens/DeleteAccountScreen.tsx` | `crisis` |
| `app/src/features/profile/screens/ExportDataScreen.tsx` | `crisis` |
| `app/src/features/profile/screens/PrivacyDataScreen.tsx` | `crisis` |
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
| `app/src/features/learn/practices/PracticeTimerScreen.tsx` | `crisis` |
| `app/src/features/learn/practices/ReflectionTimerScreen.tsx` | `crisis` |
| `app/src/features/learn/practices/BodyScanScreen.tsx` | `crisis` |
| `app/src/features/learn/practices/GuidedBodyScanScreen.tsx` | `crisis` |
| `app/src/features/learn/practices/SortingPracticeScreen.tsx` | `crisis` + `philosopher` |
| `app/src/features/learn/practices/shared/PracticeToggleButton.tsx` | `crisis` |
| `app/src/features/learn/practices/shared/usePracticeCompletion.tsx` | `crisis` |
| `app/src/features/learn/practices/PracticeCompletionScreen.tsx` | `crisis` + `philosopher` |
| `app/src/features/practices/screens/PracticeLibraryScreen.tsx` | `crisis` + `philosopher` |
| `app/assets/passages/` | `crisis` + `philosopher` |
| `app/src/core/services/security/DeepLinkValidationService.ts` | `crisis` + `compliance` |

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
zero-988-affordance window on any screen. A fifth member, `useCrisisExclusionAssertion.ts`
(DEBUG-643), is a `__DEV__`-only layout check that binds a no-op in Release; reviewed and
named here, so the directory clause still clears the standing rule below. The directory clause was right and its stated
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
directory's other crisis-bearing screens each carry their own row, the rest are legal, settings
and backup screens with no crisis surface, and
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
cannot be converted in place. Both are FILES: the logging directory carries no other crisis
surface, and Profile's other crisis-bearing screens carry rows of their own. **This is a new shape for the family and no detector reaches it** —
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
backup members carry no crisis surface, and those that do are listed individually. No detector
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

`features/learn/practices/PracticeTimerScreen.tsx`,
`features/practices/screens/PracticeLibraryScreen.tsx`,
`features/learn/practices/ReflectionTimerScreen.tsx`,
`features/learn/practices/BodyScanScreen.tsx` and
`features/learn/practices/GuidedBodyScanScreen.tsx` are the eighteenth instance (added
DEBUG-618/620/622, extended DEBUG-628/631): the DEBUG-547 shape on five screens. Each clears the
FAB with a `CRISIS_BUTTON_EXCLUSION_RECT` inset (three toggle right-margins, the library's
trailing spacer, GuidedBodyScan's own `nextButton` margin), because at `zIndex: 9999` an
overlap is a wrong-destination tap into
`CrisisResources`. FILE-level; the rest of `practices/` stays exempt.
`crisis-button-reachability` renders none of them, so its arm proves the FAB mount only; the
falsifier is the jest geometry pin. **The overlap is derivable, so do not buy a device matrix
for it**: the control is a stretch child of a `paddingHorizontal: spacing[24]` column and the
rect's `left` is 72 — both offsets from screen-right, so W cancels and the 48pt overlap holds
at every viewport and text size. On-device bounds are DEBUG-626's. **Do not copy the
"last-key-wins" rationale onto a new host** (corrected DEBUG-631): it governs an ARRAY merge
via `PracticeToggleButton`, not two distinct margin keys in one object, which Yoga resolves by
edge specificity regardless of order. Both shapes are now live and they are NOT
interchangeable — `SortingPracticeScreen` composes real arrays
(`[choiceButton, inControlButton, pressed && choiceButtonPressed]`), so a later member
declaring `marginRight` would clobber the clearance and the pin must assert none does;
`GuidedBodyScanScreen` passes a bare object, where edge specificity decides. Read the host
before copying either.

`features/learn/practices/SortingPracticeScreen.tsx` (added DEBUG-634) is the same family on
the first **scale-transformed** host, and the ruling generalises: a uniform scale by s about
any origin maps edge E to `p + s(E − p)`, so for s ≤ 1 the transformed frame is a strict
SUBSET of the layout frame on all four edges, and every term in
`intersectsCrisisButtonExclusion` is monotone in the safe direction. The clearance is
therefore computed against the LAYOUT frame at s = 1, which is the supremum — the transient
mid-animation state is strictly safer, not riskier. **An `outputRange` above 1 inverts that**
(an overshoot pushes the right edge outward, W-dependently), so the pin fixes the card's
interpolate at `[0.9, 1]` and any change to it comes back through `crisis`. FILE-level: the
directory's remainder includes an unreviewed `PracticeCompletionScreen.tsx` and twelve
`shared/` members, two of which — `PracticeToggleButton.tsx` (the array four gated hosts'
clearance flows through) and `practiceSafeAreaEdges.ts` (it decides the content bottom for
four gated hosts) — are plausibly crisis-bearing and have had no review. Named here rather
than gated, because an unnamed non-crisis member is exactly what the standing rule exists to
catch.

`features/learn/practices/shared/PracticeToggleButton.tsx` is the nineteenth instance (added
2026-09-23 on two independent `crisis` rulings, DEBUG-638 and DEBUG-643) and retires the first of
those two names. Its `[styles.button, style]` merge is where three gated hosts' `marginRight`
clearance lands, so a base-style `width`, `alignSelf` or margin key there defeats all three while
each host's pin, which reads only its own style, stays green. It imports nothing from
`features/crisis/`, so INFRA-531 cannot see it. FILE-level; `practiceSafeAreaEdges.ts` stays named,
not gated.

`features/profile/screens/PrivacyDataScreen.tsx` is the twentieth instance (added DEBUG-653):
the DEBUG-547 shape on the account-deletion card, which clears the FAB with a
`CRISIS_BUTTON_EXCLUSION_RECT` margin in its own style entry, never the shared `settingCard`.
DEBUG-653 cleared the in-band controls on `ProfileScreen`, `ExportDataScreen` and
`DeleteAccountScreen` (its button and confirmation input) the same way; those rows existed.
FILE-level: the directory's other crisis-bearing members are already listed, and the rest
carry no crisis surface.
`crisis-button-reachability` taps element centres, so the falsifier is the host's jest sweep.

`app/assets/passages/` (added FEAT-581) is the first CONTENT row: it admits primary-source text
read by PHQ-9 ≥15 users, from authors who hold that one may leave life by choice. Exit, method
and abuse-tolerance spans are banned by `__tests__/safety/classicalCorpusCrisisAdmission.test.ts`;
exempt from Phase 2.5, since no Maestro flow can falsify passage text.

`core/services/security/DeepLinkValidationService.ts` is the twenty-first instance (added
DEBUG-636). Once `ALLOWED_PATHS` enforced, the validator decides whether `being://crisis` is
delivered at all and holds the single-code invariant `isRateLimitedCrisisIntent` needs — yet
Step 2.5.3's security carve-out stripped it as service-layer, so a validator-only diff closed
with zero flows. FILE-level: its siblings (encryption, secure storage, pinning, the plaintext
sweeper) carry no crisis surface. The directory row keeps `compliance`; this row adds `crisis`.

`features/learn/practices/PracticeCompletionScreen.tsx` is the twenty-second instance (added
DEBUG-678, founder ruling) and retires the DEBUG-634 paragraph's remaining unreviewed name. All
five gated practice hosts return it IN PLACE of their own tree on IMMERSIVE routes, so none of
their FAB clearances carry over. DEBUG-682 cleared its Continue with a `primaryButton` right margin
(right only, last, pressed member inert, transform scale ≤ 1). FILE-level; `philosopher` co-owns
`PRACTICE_QUOTES`.

`features/insights/screens/InsightsScreen.tsx` is the twenty-third instance (added FEAT-669, crisis
ruling): the DEBUG-620 trailing-spacer shape on a tab screen. Its scroll content ends in a
`CRISIS_BUTTON_EXCLUSION_RECT.top` spacer, because the old 32pt padding left the last control in the
FAB's band at maximum scroll. FILE-level: `WellnessTrendsDetailScreen.tsx` is unreviewed.
`crisis-button-reachability` taps element centres, so the falsifier is the jest spacer pin.

`features/learn/practices/shared/usePracticeCompletion.tsx` is the twenty-fourth instance (added
DEBUG-695, crisis ruling): the completion path all five gated practice hosts share. It owns both
"degrade, never throw" contracts (DEBUG-344 practiceId, DEBUG-695 moduleId) on a timer callback no
error boundary covers, so a throw there is process death with 988 lost. It imports nothing from
`features/crisis/`, so INFRA-531 cannot see it. FILE-level: `useTimerPractice.ts` and the other
`shared/` members are unreviewed. No sim flow completes a practice; the falsifiers are the jest
degrade contracts.

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
| Crisis button <200ms | **Not measured in CI — contract-pinned only (corrected DEBUG-596).** The instrument is `features/crisis/services/crisisTapTrace.ts` (tap→`screen_commit` / tap→`url_open`, never aggregated); `crisisTapTrace.contract.test.ts` pins WHICH outcome and severity a completed vs. dropped tap records — a contract, not a timing. `CollapsibleCrisisButton.behavioral.test.tsx`'s elapsed-time assertion measures synthetic dispatch, the quantity INFRA-297's own header condemns, and is NOT evidence for this budget. The tap→render number is device-only and hand-read, like the 60fps row |
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

**What the safety gate does NOT cover — telemetry (INFRA-400, corrected INFRA-412).** A green gate verifies UI reachability and thresholds, never that `crisis_detected` reaches Supabase. **Read a zero-row `analytics_events` against the BUILD, not against the table** — zero rows is NOT the expected reading in every build, though it once was:

| Build | Zero rows means |
|---|---|
| Gate build (`npm run e2e:safety:build`) | **Expected.** INFRA-411 suppresses egress at `flushCrisisAnalytics`: `if (env.EXPO_PUBLIC_E2E_SEED_ONBOARDED === 'true') return;`. That flag exists only in `eas.json`'s `e2e-sim` profile. Events are retained, never dropped. |
| Normal Release build (`.env.production`) | **A REGRESSION.** Delivery is proven (INFRA-412: a Q9>0 detection landed a row in 576 ms). |

To reproduce delivery, never use `npm run e2e:safety:build` (suppressed by construction) — build from `.env.production` and assert which env won inside the bundle. The DEBUG-409 defect, the INFRA-412 measurement and the full procedure: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Crisis telemetry.
## State (Zustand)

Stores live with their owners: `core/stores/` (bugReport,
consent, settings, subscription) and per feature
(`assessment/stores/assessmentStore`,
`practices/stores/stoicPracticeStore`,
`learn/stores/educationStore`). There is no crisis store —
no safety plan or emergency contacts exist (DEBUG-608). What
is encrypted is a per-store fact: read the store, not this list.

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
   - **Before any bump, prompts for the attended crisis device checklist** (`docs/testing/crisis-device-checklist.md`, Phase 2.9, INFRA-591). You need an iPhone on the current iOS. Any FAIL aborts the release. The release PR body records the result, and the merge is bound to the tested tree. **Hotfixes run it too, after the fact** (INFRA-605): their build has already fired by merge time, so the checklist's §5 runs against the TestFlight binary and gates App Store promotion, not TestFlight distribution.
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
4. **Run the crisis device checklist against the TestFlight build** (INFRA-605). Listed here
   because it is a gate, not because it is next: it needs the build, so start step 5 while you
   wait. The merge fires `release.yml` on push to `main` and `--auto-submit` ships the binary
   with no human in the loop, so this is the one release path with no pre-build slot — the
   check runs after the fact, and the build it gates is already on TestFlight.
   - Wait until TestFlight offers the build for **install**. A green `release.yml` means
     uploaded, not accepted.
   - Follow `docs/testing/crisis-device-checklist.md` **§5**, which owns this path: both halves
     in full, the binding lines, the workflows-only `EXEMPT` carve-out, and the FAIL procedure.
   - Post the §6 result block as a **comment on the hotfix PR**, with
     `Trigger: hotfix PR #<N> (INFRA-605)`.
   - **The hotfix build is not promoted to the App Store until that result is PASS or EXEMPT.**
     `WAIVED` is not permitted here — §5 says why. Urgency is not an exception: the fix is
     already live on TestFlight, so the answer is promote later.
5. After merge — tag and backport, without waiting on step 4:
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

6. Remove the hotfix worktree once the backport PR has merged **and step 4's result block is on
   the PR**. That ordering is the only enforcement this path has: no skill runs here, so a
   missing comment on an open PR is the sole visible sign the check was skipped.
   `git -C ~/dev/being worktree remove hotfix-<slug>`

**Never `git push origin development`, even as admin** — protection requires a PR (`enforce_admins: true`) and rejects a direct push with `GH006`; backport only through step 5's PR. Why: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Hotfix backport.

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
- `LSApplicationQueriesSchemes` in `app/app.json` (`tel`, `sms`) is **required** on iOS 13+ for the crisis dial path: without it `Linking.canOpenURL('tel:988')` returns `false` and `CrisisResourcesScreen` falls back to an "Unable to Call" alert during a crisis. Most jest tests mock `canOpenURL`, so they cannot catch this. **The pin is `app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts`**, run by `npm run precommit` and by the `Safety + privacy gates` CI job (INFRA-368). The CI half is the load-bearing one — a hook is not a control (`--no-verify` is permitted on `hotfix/*`; iOS is CNG, so no plist diff is ever reviewed) — and it gates `main` only once a release carries it: verify with `git show origin/main:.github/workflows/ci.yml | grep -c safety-privacy` (INFRA-458). `app.json` changes do not trigger a Phase 2.5 Maestro run. **No automation verifies the runtime dial**: `crisis-988-dial.yaml` is device-only and unrunnable (DEBUG-589), and the simulator's `canOpenURL` is unconditionally false — a green precommit and a green `npm run e2e:safety` do NOT mean the dial path was verified; only the attended checklist `/b-release` Phase 2.9 runs does. A new crisis-path scheme (e.g. `mailto:`) goes into the array AND the jest test. History: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § LSApplicationQueriesSchemes.
- App Groups entitlement for the iOS widget is injected via a local config plugin at `app/plugins/withAppGroupsEntitlement.js` (was previously `expo-build-properties`'s `ios.entitlements`, removed in SDK 56).
- INFRA-158's SDK 56 opt-outs have both landed (`globalThis.fetch` is `expo/fetch`; TypeScript `6.0.x`). **TS 6**: keep `types: ["node", "react"]` in `tsconfig.json` (without it `NodeJS.Timeout` / `global` fail codebase-wide). `baseUrl` is deprecated and silenced via `ignoreDeprecations: "6.0"`; remove it only in the TS 7 migration, re-validating `@types`/`typeRoots` together. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § INFRA-158.
- `AsyncStorage` is unencrypted by design; wellness data must use `expo-secure-store` + AES-256.
- Encryption tests are slow (`test:encryption`) — run during pre-push, not pre-commit.
- iOS and Android behavior must match (use `npm run platform:both` to verify).
- Slash commands in `.claude/commands/` must use **absolute paths** (`/Users/max/dev/being/.claude/...`) for any internal file references — never relative `./.claude/...`. This avoids the symlink dance.
- Compliance terminology: "wellness data" not "PHI"; "AES-256 encryption" not "HIPAA-compliant encryption"; "wellness screening" not "clinical assessment."
- Env files live canonically at `~/dev/being/.config/{.env.production,.env.development}` (gitignored at bare root). The leading-dot prefix on the target filenames is **required** since MAINT-190 (2026-05-29): Expo SDK 56's `@expo/metro-config` transform-worker pattern-matches `(^|\/)\.env(\.(local|...))?$` against the *resolved* symlink target, so the canonical files must themselves be named `.env.*`. Without the dot, Metro falls through to its JS parser and throws `SyntaxError: Unexpected token (1:0)` on the `#` comment, breaking every iOS dev build. Worktree `app/.env.{production,development}` are symlinks. `/b-work` creates the symlinks automatically; manual `git worktree add` requires creating them by hand (`ln -s ../../.config/.env.production app/.env.production` and same for development). Dev env has empty `EXPO_PUBLIC_SENTRY_DSN` so Sentry no-ops locally; production env carries the real DSN. Back up the canonical files in 1Password — deleting `.config/` breaks all worktrees.
- **Maestro / simulator / gate rules — full text and history in `/Users/max/dev/being/.claude/docs/e2e-gotchas.md`; read it before running or debugging the gate.** One line each:
  - Safety e2e is local-only (no CI macOS runners); install `brew install mobile-dev-inc/tap/maestro`, never `brew install maestro`. Build with **`npm run e2e:safety:build`** (Release), never `npm run ios` (Debug ships the dev launcher). Budget 21m31s cold / 11–14 min after a native regen (dependency content, lockfile, `app.json`, `plugins/`, `patches/`) / 1–4 min branch switch / ~30 s no-op. Reclaim the DerivedData cache with `npm run e2e:safety:clean`, never by deleting `app/ios/`.
  - Iterate dirty, but **never merge on a dirty-tree build** — `/b-close` Phase 2.5 sets `E2E_REQUIRE_CLEAN_PROVENANCE=1`. Keep notes, drafts and logs OUT of the worktree (session scratchpad or `/tmp`): untracked contents move the provenance hash and read as MISMATCH, costing a rebuild.
  - **Never pipe or chain the build command** (`| tee`, `; echo`) — the last command's status wins and a failed build reads as exit 0. **Never run the suite, a gate build or an ad-hoc `maestro` capture as a reap-able background task** — launch detached in its own session, poll a sentinel, abort with `kill -TERM -- -PGID`. To abort a build, kill the `xcodebuild` PID itself, or it holds the DerivedData lock. A reaped run's `Unknown error`, or a reaped build's `produced no .app`, is the reap, not a regression or a build defect.
  - After `simctl erase`, a red keyboard-up or deeplink flow means unseeded device state before it means the app. Never approve `exp+being`.
  - A flow newly tagged `- safety` must bump the jest tripwire count in `__tests__/scripts/e2e-dynamic-type.test.js` in the same commit. The Maestro version is pinned (`maestro.pinnedVersion`); moving it re-certifies every flow, and `E2E_ALLOW_MAESTRO_VERSION_DRIFT=1` trials a version but is never merge evidence. Keep any new per-flow `e2e:safety:*` script routed through `e2e-safety.sh`.
  - **One device per close — never fan out across simulators to "certify" a viewport.** The smallest-viewport warning is informational; multi-device is a diagnostic on explicit request only.
  - **No device flow runs on any Maestro version (DEBUG-589)**: `e2e-safety.sh` exit 5 on the device path is a toolchain refusal — never a dial-path regression, never a sleeping tunnel. The dial is checked only by the attended device checklist.
  - `E2E_SIM_UDID` pins an exact booted UDID; a pin naming an unbooted device refuses rather than falling back, and the gate reports that refusal as exit 2 (no verdict), never 3.
  - Gate exit codes: 0 pass / 1 flow regression (its only producer) / 2 harness could not complete — no verdict, never a pass and never a regression / 3 target replaced mid-suite / 5 device path refused. A resolver's own return code is never the gate's.
  - **Never identify a process with `pgrep -f` / `pkill -f` in the Maestro tooling (DEBUG-392)** — it matches its own `zsh -c` wrapper. Match the executable with `ps -axo pid=,comm=,args=` and exclude your own process group.
  - **Never replace the installed app while a suite runs**: the gate exits 3 (`REPLACED` / `VANISHED`) and relabels finished flows `VOID`. INFRA-436's lock covers only a peer's `npm run e2e:safety:build`, not `npm run ios`, Xcode Run or `simctl install`. Check for peer builds with `ps -axo`, never `pgrep -f`, before spending one.
  - A manual launch outside `e2e-safety.sh` is unwatched: read `.e2e-provenance.json` from the app container immediately before AND after, or you may be reading a peer's binary.
  - To only observe, diff the installed marker's `head` against your paths before paying a build — an empty diff means a peer's binary already renders it (observation only, never merge evidence).
  - A control pinned below a ScrollView: use `centerElement: true` to force a real scroll (DEBUG-465).
  - `maestro hierarchy` puts iOS label text in `accessibilityText`, not `text` — an all-empty `text` sweep is a parser bug. `accessibilityHint` cannot be asserted on iOS.
  - A jest test driving `e2e-safety.sh` end to end sets `E2E_HOST_SETTLE_MAX_S=0` — but never for the whole `__tests__/scripts` run (it reds `e2e-host-contention.test.js`); run affected suites by name.
- **Verify a bash block extracted from a skill file under `bash -c`, not the tool's `/bin/zsh -c` wrapper** — zsh does not word-split unquoted expansions (`for x in $LIST` yields one blob) and leaves `${PIPESTATUS[0]}` EMPTY, so a failed command reads as a blank pass; capture with `; rc=$?` on an unpiped command. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Verifying extracted bash blocks.
- **A back-merge that moves `app/package.json` or the lockfile needs `npm ci` before any
  test run** — not only a `@mp2ez/being-design-system` pin move. A stale tree keeps
  packages the merge DELETED, so tests pass locally against a toolchain CI does not
  install (a jest-preset swap is the quiet case; a design-system pin fails loudly on
  token VALUES, looking like a bad merge rather than a stale install).
- **A back-merge can leave a hand-maintained value wrong while merging CLEAN.** Two branches
  writing the identical `| Version | 2.N |` into a `docs/legal/*.md` header merge without
  conflict — after any merge touching a legal doc, check §1's version against §9's highest row.
  `legalContent.generated.ts` is gitignored and built from those docs, so the same merge leaves
  it stale and reds `safetyPlanClaims.privacy.test.ts` (`npm run generate:legal-content`).
- **`patch-package` reapplies `app/patches/` on every `npm install`** (`postinstall`, INFRA-176) — never hand-edit `node_modules/`; new patches stack with no wiring. The `expo-modules-jsi` patch (`weak let` → `weak var` for Xcode 26's Swift 6.2) goes when an Expo SDK upgrade ships `weak var` natively: then delete the patch file and the postinstall script. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § patch-package.
- **After a back-merge shifts `app/ios/Podfile.lock` checksums**, `[runtime not ready]: ReferenceError: Property 'MessageQueue' doesn't exist` right after the bundle loads is a stale native binary, not a JS issue. Fix sequence: `cd app/ios && pod deintegrate && pod install`, `rm -rf ~/Library/Developer/Xcode/DerivedData/Being-*`, delete the Being app from the simulator, then `npm run ios`. Metro cache clear alone does not fix it. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Podfile.lock.
- **A long-lived worktree's `app/ios/Pods` ages out of sync with `node_modules`, and SDK 56 makes that a
  launch crash.** Expo modules ship as *prebuilt* xcframeworks, so `Pods/ExpoModulesCore.xcframework` is a
  build INPUT — no DerivedData clear can fix it. Symptom: `dyld: Symbol not found … ExpoModulesJSI`.
  Fix is `expo prebuild --clean --platform ios` (`--platform ios` is required: `app/android/` is committed).
- **Trust a Jest error's literal text before any environmental hypothesis (INFRA-180).** `Exceeded timeout of 30000,30000 ms` was a `--testTimeout` passed twice, which yargs made an array and jest coerced to `NaN` → a 0 ms timeout. Reproduce with the EXACT CI invocation, `--` separator included; a character-for-character match means the command is the variable, not the environment. Audit each quarantined file on its own before choosing a fix shape — about half of MAINT-188's were redundant or aspirational, not salvageable. History: `/Users/max/dev/being/development/docs/development/test-fake-timer-ci-flake.md` (per worktree) and `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Yargs.
- **Source-string test assertions must strip comments before matching (DEBUG-390)** — this codebase deliberately names anti-patterns in prose, so a bare `not.toContain('x')` fails on correct code; never fix it by rewording the comment. Strip block and line comments, match prop-shaped patterns (`/foo\s*[=:]/`), pair it with an assertion that fires against the SLICE itself (never a literal), and anchor the slice to a semantic boundary, never a byte count. Rationale: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Source-string.
- **A feature barrel (`index.ts`) re-export puts unrouted code in every importer's eager module graph, safety paths included (FEAT-376)** — check the barrel's consumers before concluding new code is off a safety path or that Phase 2.5 cannot exercise it; jest does not stand in (no Metro). Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Feature barrels.
- **An Expo config plugin registered as a bare string takes its library defaults, which can add permissions.** On a permission option `false` DELETES the Info.plist key rather than skipping it, so a later plugin can strip an earlier one's disclosure — omit to inherit. `app/ios/` is CNG, so none of it shows in a diff: regenerate, read the plist, pin it.
- **`app/` has two test roots (INFRA-84)** — `app/src/**/__tests__/` and `app/__tests__/`, which npm scripts glob by name — so a "no callers" finding from `app/src` alone is unverified: grep both roots, plus `supabase/functions`. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Two test roots.
- **A Notion comment over ~4,000 RENDERED characters (~3,500 plain) is truncated mid-sentence, silently** — treat one ending mid-clause as truncated. Long findings go in the page body (uncapped) with a short pointer comment. Backtick filenames: a bare `CLAUDE.md` gets auto-linkified. Detail: `/Users/max/dev/being/.claude/docs/gotcha-history.md` § Notion.
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
- **Under `CI=true`, type-aware ESLint lints the file ON DISK, not the text you pass.**
  typescript-estree infers a single CLI run from `CI=true` and builds its program from
  disk, so `ESLint#lintText` silently lints the real file. A jest probe that lints via
  `lintText` needs `parserOptions.disallowAutomaticSingleRunInference: true`, and must
  assert a message is PRESENT, or it passes vacuously in CI.
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
