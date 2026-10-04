# Safety-path rulings — the case history behind each Protected Paths row

The Protected Paths table itself stays in `/Users/max/dev/being/.claude/CLAUDE.md`, byte-identical,
because `/Users/max/dev/being/.claude/scripts/check-safety-paths.sh` parses it. This file holds
the per-row rulings: why each row exists, its FILE-vs-DIRECTORY call, the detector-blind shapes,
and what is deliberately NOT gated. Read it before ruling on a new or changed safety path.
**New ruling prose goes here, never in `CLAUDE.md`.**

Relocated verbatim from `CLAUDE.md` by INFRA-726 (2026-10-04). Bracketed text is the only
addition: it resolves positional references ("the table above") that pointed into `CLAUDE.md`.
The standing directory-vs-file rule and the reconciliation-script paragraph also stay resident
in `CLAUDE.md`.

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
Adding a row to the table above [the Protected Paths table in `/Users/max/dev/being/.claude/CLAUDE.md`] without doing one or the other will fail that check.

`features/practices/dailyloop/` is the third (added DEBUG-465), and it is a carve-in from the
`practices/` exemption directly above [`EXEMPT_PATHS` in `/Users/max/dev/being/.claude/scripts/check-safety-paths.sh`] rather than a new dir. `DailyLoopStepScreen.tsx` hosts
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

The last four entries (DEBUG-525) [`core/hooks/`, `core/components/ThresholdEducationModal.tsx`, and the two `insights/components/` composer files, merged into one directory row by INFRA-532] are the fifth instance, and they consume
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
are 1-of-10 and 2-of-12 [`insights/components/` has since become a directory row (INFRA-532); `ThresholdEducationModal.tsx` stays a FILE]. **Standing rule for the next instance:** gate the directory when
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
close when a file outside this table's [CLAUDE.md's Protected Paths table] gated set imports a crisis constant, printing the
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
nothing of ours at all". The hand-maintained table [CLAUDE.md's Protected Paths table] is the only control. Full ruling is
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
`practices/` exemption directly above [`EXEMPT_PATHS` in `check-safety-paths.sh`] exists to prevent. `philosopher` still owns
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

