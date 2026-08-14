# Practice-haptics device sign-off (INFRA-395)

The attended, on-device checklist that gates `practice_haptics:true` in
`.config/.env.production`. Nothing in CI can stand in for it, and nothing in CI ever
will: CI is 100% `ubuntu-latest`, and even a macOS runner would not help, because
**the iOS simulator emits no haptics at all**. `expo-haptics` no-ops silently rather
than erroring, so on a simulator "correctly wired" and "completely broken" produce
identical output — nothing.

Same class as `npm run e2e:safety:988-dial`: hand-run, device-attended, and the only
evidence that exists for the thing it covers.

> **A green CI run is not evidence for any criterion in this document.** The relevant
> precedent is the breathing 60fps budget, enforced in CI only by a *structural* proxy
> (`npm run check:breathing-worklets`) that explicitly does not measure frames.

---

## 1. What is being signed off, and why it is one-way

`practice_haptics` gates a ~3,200 LOC subsystem (FEAT-285) plus its entire Settings
surface. With the flag off there are **zero** discovery surfaces in production —
`AppSettingsScreen.tsx:324` gates the whole "Practices / Haptic Cues" block on the
same flag as the opt-in prompt.

**Treat the flip as irreversible.** `useHapticsOptIn` spends a once-ever,
unrepeatable prompt and persists `practiceHapticsPrompted: true`. A user who
declines during an ON window, followed by a rollback to OFF, has spent their only
choice on a capability that no longer exists — and will **never** be re-asked when it
returns. Consequences:

- Do not flip as a trial or a canary.
- Any rollback decision must be paired with an explicit decision about resetting
  `practiceHapticsPrompted` for affected users.

---

## 2. Prerequisites

| Requirement | Why |
|---|---|
| A real iPhone **with a Taptic Engine** | The measurement cases are unobservable anywhere else. |
| An iPad or other actuator-less iOS device | Case (ii) below. An **iPad Air M1 (`iPad13,16`) is registered on this machine** and is exactly the right hardware. |
| A **Release** build, from this repo, with two flags on | See §3. |
| Console.app, with the device attached | A Release build has **no Metro console**. This is how the trace is read. |
| VoiceOver, toggled via Accessibility Shortcut (triple-click) | §6 is executed with it running. |

### The sign-off build is a throwaway. Never merge it.

Two flags must be on, and **both are false in every committed env**:

- `practice_haptics:true` — otherwise `usePracticeHaptics`'s effect early-returns at
  line 212 and there is nothing to measure.
- `haptic_trace:true` — the INFRA-395 diagnostic. Without it the numbers do not exist
  in a Release build: the pre-existing `__DEV__` traces fold away, which is the whole
  reason the flag was added.

`haptic_trace` gates **observability only**. It can neither enable nor suppress a
single haptic, and that contract is pinned behaviourally in
`app/__tests__/unit/practices/haptics/hapticTraceFlag.test.ts`.

---

## 3. Build recipe

Edit `~/dev/being/.config/.env.production` **locally and temporarily** — it is
gitignored and symlinked into every worktree, so revert it the moment the session
ends:

```
EXPO_PUBLIC_FEATURE_FLAGS=...,practice_haptics:true,...,haptic_trace:true
```

Then, from the worktree's `app/`:

```bash
npx expo run:ios --device --configuration Release
```

**Never pipe this command** (`| tee`, `| tail`). A pipeline reports the *last*
command's status, so a failed build reads as exit 0. Use `set -o pipefail` if you must
capture it.

Revert `.config/.env.production` afterwards and confirm with
`grep EXPO_PUBLIC_FEATURE_FLAGS ~/dev/being/.config/.env.production`.

### Reading the trace

Console.app → select the device → filter on `[haptics]`. Two line shapes, and you need
both, because **neither is the cue latency on its own**:

```
[haptics] inhale delivered late=12ms          <- cueScheduler: timer jitter
[haptics] inhale → delivered in 8ms (impactLight)   <- hapticEngine: JS→native round trip
```

The scheduler closes out its report *before* `void engine.fire(cue)` runs
(`usePracticeHaptics.ts:229` is fire-and-forget), so the two segments are disjoint and
**add**. A third segment — the actuator itself, ~10-20ms on iOS and 30-80ms on Android
per `constants.ts:63-66` — is not observable from JS at all and must be cited, never
claimed as measured.

---

## 4. The acceptance bars

`MAX_CUE_LATENESS_MS = 150` (`constants.ts:38`) is a **drop threshold, not a quality
bar** — the scheduler discards anything past it, so a session where every cue lands at
149ms would deliver 100% of cues and still feel wrong.

| Metric | Bar | Why this one |
|---|---|---|
| **Drops** | **Zero** | The real product metric. A late cue is bounded at 150ms by construction; a *dropped* cue is an unbounded, invisible failure, and for the eyes-closed practitioner the haptic **is** the pacing signal. Any drop in a clean, foreground, unpaused session is a scheduling defect, not tuning. |
| Cue latency | p50 ≤ 30ms, p95 ≤ 75ms | Half the budget, so ordinary jitter has headroom before it becomes a drop. Record max, but `max ≤ 150ms` is tautological and is not a bar. |
| Session length | ≥10 min continuous, per screen | Short sessions cannot surface accumulating drift. |
| Breathing frames | **No regression attributable to cue delivery** | See below. |

**If p95 exceeds 75ms, investigate — never raise `MAX_CUE_LATENESS_MS`.** That constant
is a perceptual finding (the visuotactile simultaneity ceiling), not a tuning knob.

### The 60fps criterion needs restating to be measurable

"Holds 60fps" is not a pass/fail on a ProMotion iPhone — nominal is **8.3ms, not
16.67ms**, the same device-naivety CLAUDE.md already flags for INFRA-373. Measure the
**differential** instead: same practice, same duration, haptics off, then on. The bar is
no frame-timing regression attributable to cue delivery.

Instrument: Xcode → Open Developer Tool → Instruments → **Animation Hitches**. This
works against a Release build and needs no code.

**Record the handset model and whether it is ProMotion.** A figure without the device
is not a measurement.

---

## 5. Procedure

### Case (a) — cue latency, per screen

One session each on `PracticeTimerScreen`, `ReflectionTimerScreen`, `BodyScanScreen`.
One session per screen is sufficient: the three differ only in schedule *shape*
(`intervalSchedule` / `regionSchedule` / breathing phases) and share one
`cueScheduler` and one module-scoped `hapticEngine`.

### Case (a2) — the adversarial lifecycle session

**Not named in the ACs, and the highest-value single measurement here.** It is the only
test of the invariant that `cueScheduler`'s entire single-timer design exists to hold.

One session, with: background/foreground ×2, pause/resume ×2, navigate away and back.
Assert **zero cues emitted on resume** and **zero cues after blur**.

### Case (b) — breathing frames

Per §4. Differential, Instruments, both haptics states.

### Case (c)(i) — system haptics disabled

Settings → Sounds & Haptics → System Haptics **off**. All must hold *simultaneously*:

- No vibration.
- **No alert, toast, error, or visible layout change of any kind.**
- The practice runs to completion with unchanged timing.
- The Settings "Haptic Cues" toggle still reads **ON**.
- `BreathingCircle` phase announcements continue at normal cadence under VoiceOver.
- Body Scan speaks "Next area" at every region boundary.

**Record FAIL if anything appears on screen.** A visible degradation notice during an
eyes-closed practice is precisely the interruption the subsystem exists to avoid.

### Case (c)(ii) — no actuator at all (the iPad)

**Executable today; does not wait on the iPhone.**

`expo-haptics@56.0.3` exports no capability API — its whole surface is
`notificationAsync` / `impactAsync` / `selectionAsync` / `performAndroidHapticsAsync` —
and on iOS `UIFeedbackGenerator` resolves normally on hardware with no Taptic Engine.
So `hapticEngine`'s `catch`-only latch **never fires on an iPad**.

Primary criterion is a negative: **the opt-in prompt must not appear** on any of the
three practice screens, on a fresh install, across at least two app launches. Then:

- Profile → App Settings → Practices still renders, both rows present and operable.
- Toggling the master on and running a practice produces the case (c)(i) observable set.
- `practiceHapticsPrompted` remains `false` afterwards.

> This case cannot pass until DEBUG-426 lands (§7). Until then the prompt still
> appears on the iPad and the primary criterion fails by construction.

### Case (c)(iii) — announcements survive

Positively assert a spoken utterance, never infer it from absence of a crash. On the
iPad, haptics accepted, VoiceOver running: every Body Scan region boundary produces
"Next area", every breathing phase transition produces its phase text.

---

## 6. VoiceOver checklist

Fresh install, VoiceOver on throughout. Each item names something a sighted tester
structurally **cannot** see.

1. **Prompt focus landing.** Enter `PracticeTimerScreen` cold. VoiceOver's *first*
   utterance must be the heading, announced as a header — not a button, not the screen
   title. (`HapticsOptInPrompt.tsx:151-168` is a rAF plus a 350ms retry; either can lose
   the race.)
2. **Modal scope.** Swipe right repeatedly past "Leave off". Focus must never reach
   "Begin", the practice title, the instructions, or the tab bar. **Record — do not
   judge — whether it reaches the crisis button** (§7).
3. **The recommendation survives the speech channel.** Confirm the body prose, including
   the suggestion sentence, is reached and read *before* either button. Repeat at the
   largest Dynamic Type size: the prose lives in a `flexShrink: 1` ScrollView that gives
   way first by design, so confirm it has not been clipped out of the swipe order.
4. **Neither choice is pre-selected in speech.** Both buttons announce role "button",
   byte-identical hints, and neither announces "selected" or "dimmed". (A sighted tester
   sees the fill on "Turn on" and cannot hear whether that asymmetry leaked into
   `accessibilityState` — the boundary the equal-cost design rests on.)
5. **Accept, then Body Scan.** At each region boundary: haptic felt, then "Next area"
   spoken ~150ms later, not interrupted or duplicated by the region list's label
   updates. Log the felt-then-heard order per boundary — the only direct evidence for
   case (a) that does not come from a trace.
6. **Breathing with the scheduler live.** Phase announcements continue at unchanged
   cadence with haptics on; no utterance swallowed by a cue. Repeat with **Reduce Motion
   enabled**.
7. **Anchors are silent, completion is not.** `sessionStart` / `sessionEnd` produce no
   speech by design. Confirm the practitioner still learns the session ended through
   *some* channel, and name it here. A blind practitioner who feels one pulse and hears
   nothing has no confirmation the practice completed rather than crashed.
8. **Settings, with the master toggled.** Both rows in the swipe order; Interval Cues
   announces disabled with its hint; toggle master off and on and confirm the row
   neither disappears nor reorders and focus does not move. (The live WCAG 3.2.2 pin
   that `AppSettingsScreen.tsx:393-394` asserts in prose but nothing tests.)
9. **Post-decline recovery — fresh install, last.** Decline with VoiceOver on, then
   reach the Settings toggle by VoiceOver alone, turn it on, run a practice, confirm
   cues fire. The AC asks whether the block *renders*; this asks whether the remedy
   *works*.

---

## 7. Open prerequisites

The flip is blocked on these. All three are `Blocked by` relations on INFRA-395.

1. **DEBUG-426 — prompt suppression on actuator-less hardware.** Today `useHapticsOptIn.ts:73-79`
   gates on the flag and prompted-state only, never on capability — so an iPad user is
   asked a permanent question about vibration and, on accept, gets silence forever.
   `expo-device` is already a dependency. Suppression must be a **pure read**: it must
   not write `practiceHapticsPrompted`, so the prompt survives unspent for a device that
   can deliver.
2. **DEBUG-425 — Body Scan announcement decoupling.** `usePracticeHaptics.ts:212` early-returns on
   `!enabled`, and `enabled` includes `practiceHaptics === true` — so a blind
   practitioner who declines loses "Next area" entirely. `BodyScanScreen.tsx:150-152`
   states in its own comment that the hook is the *only* speech on that boundary.
3. **INFRA-427 — 988 reachability under the undismissable prompt.** The prompt sets
   `accessibilityViewIsModal` with no dismissal path, on three screens in
   `RootCrisisButton`'s `IMMERSIVE_ROUTES`. The component argues at length that the
   crisis button stays *perceivable* over the backdrop — but **contrast is not
   reachability**, and nobody has confirmed with VoiceOver running that it is still in
   the swipe order. Owned by the `crisis` agent.

**Also unresolved: Android.** One flag string turns this on for both platforms, and
`constants.ts:63-66` documents Android's actuator at 30-80ms against iOS's 10-20ms — a
4× worse timing regime. The ACs name iOS only. Confirm whether Android ships from the
same string; if so, either run one Android session or split the flag.

---

## 8. Results

Fill in and copy into the INFRA-395 work item. **Figures, never a "verified" claim — a
sign-off with no numbers is not a sign-off.**

```
Date:              
Handset:                          ProMotion? [ ]
iOS version:       
Build:             Release, practice_haptics:true, haptic_trace:true
Commit:            

CUE LATENCY (scheduler jitter + JS→native; actuator segment cited, not measured)
  screen                  cues   drops   p50    p95    max
  PracticeTimerScreen                                       
  ReflectionTimerScreen                                     
  BodyScanScreen                                            

  Adversarial lifecycle:  cues on resume ____   cues after blur ____   (both must be 0)

BREATHING FRAMES (differential, Instruments Animation Hitches)
  haptics off:  hitches ____   worst frame ____ ms
  haptics on:   hitches ____   worst frame ____ ms
  Regression attributable to cue delivery?  [ ] no  [ ] yes → 

DEGRADATION
  (c)(i)  system haptics off      [ ] pass  [ ] fail → 
  (c)(ii) no actuator (iPad)      [ ] pass  [ ] fail → 
  (c)(iii) announcements survive  [ ] pass  [ ] fail → 

VOICEOVER CHECKLIST  1[ ] 2[ ] 3[ ] 4[ ] 5[ ] 6[ ] 7[ ] 8[ ] 9[ ]
  Item 2 — crisis button reachable under the prompt?  [ ] yes  [ ] no   (record only)

VERDICT   [ ] flip  [ ] do not flip →
```
