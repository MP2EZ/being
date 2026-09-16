<!-- e2e-device-compensates: DEBUG-589 flows=crisis-988-dial.yaml,crisis-keyboard-accessory.yaml -->
<!-- e2e-device-triggers: b-release-phase-2.9,hotfix-pr -->

# Crisis device checklist: 988 dial + keyboard accessory (INFRA-591)

**This checklist exists because the automated device gate is unavailable.** DEBUG-589
measured that no released Maestro can run a flow on a physical iPhone, so
`crisis-988-dial.yaml` and `crisis-keyboard-accessory.yaml` cannot start. Nothing else
verifies these two contracts on real hardware. A green CI run, a green precommit and a green
`npm run e2e:safety` are **not** evidence for anything below.

**When it runs:** two triggers.

- **Before every release**, prompted by `/b-release` Phase 2.9, before anything is bumped or
  merged. The result goes into the release PR body. It is release-gated, not close-gated.
- **After every hotfix build reaches TestFlight** (INFRA-605), and after a waived release
  build does. Both run against the TestFlight binary — see §5, which owns that path. Nothing
  prompts for it: the hotfix procedure is hand-run, so the trigger is the hotfix PR itself.

**Scope:**
- **In:** the two runtime behaviours only hardware can show:
  - `tel:988` hands off to the iOS dialer with no in-app fallback alert.
  - The keyboard accessory sits on a real software keyboard on current iOS and reaches crisis
    resources in one tap.
- **Out:**
  - The generated `Info.plist`. CI's `Generated Info.plist keeps tel/sms` step checks it on
    every PR (INFRA-592).
  - VoiceOver.
  - The other `tel:988` call sites. They all go through `openCrisisUrl`, which D3 exercises.

---

## 1. Prerequisites

| Requirement | Why |
|---|---|
| An **iPhone** on the **current major iOS (26.x)** | An iPad legitimately returns `canOpenURL('tel:')` false. A run on 18.x only repeats what the simulator already shows. |
| **No hardware or Bluetooth keyboard** connected | With one attached, no software keyboard rises and the accessory cannot be tested. |
| A **Release** build of the release tree, installed on that iPhone | Debug ships the dev launcher. TestFlight only exists after the build fires, which is too late for the evidence `/b-release` needs. **This row is a timing constraint on the release path, not a statement about binary quality** — on the hotfix path the timing is inverted and the TestFlight binary is the evidence. See §5. |

From the `development` worktree, at `origin/development` HEAD, with the iPhone connected and
unlocked:

```bash
cd ~/dev/being/development/app
npx expo run:ios --device --configuration Release
```

- **Never pipe or chain the build command.** The shell reports the last command's status, so
  a failed build reads as exit 0.
- **If the device isn't listed, its tunnel may be asleep.** Wake it with
  `xcrun devicectl device info details --device <udid>`. See `.claude/CLAUDE.md`.
- **`/b-release` records the tested commit itself.** Do not type it.

If LegalGate or onboarding appears on launch, complete it. It is not part of the checklist.

---

## 2. Dial

**Never tap Call.** This half ends at iOS's call prompt, and you tap **Cancel** there.

- **If a call connects by accident**, hang up.
- **If someone answers**, tell them it was a misdial and that you are safe.
- **Record `call_connected: yes`.** The step still counts, and you must not repeat it to get
  a clean run.

| # | Do | PASS | FAIL |
|---|---|---|---|
| D1 | Open Being and go to the Home tab. | Home is showing. | — |
| D2 | Tap the round **lifebuoy** button in the bottom corner. It has no text. | Within ~3 s, a screen titled **"Crisis Support Resources"**. | Anything else, or nothing. |
| D3 | Tap **"📞 Call 988"**, pinned at the bottom of that screen. Tap no other call button: any **"Call Now"** on the screen dials a different line, and **"📞 Call 911"** is right beside it. | Within ~3 s, an iOS system prompt offering to call 988, with a **Cancel** option. | An alert titled **"Unable to Call"** with only an OK button appears before or instead of the prompt, or nothing happens within ~3 s. |
| D4 | Tap **Cancel**. | Record `after_cancel_alert: yes` or `no`. **This is not a FAIL.** | — |

**If D4 records `yes`, file a DEBUG item.** It means a user who chose Cancel is then shown
the "Unable to Call" fallback and logged as a `manual_fallback` crisis tap. Whether iOS 26
reports Cancel as a failure has never been measured.

---

## 3. Keyboard accessory

| # | Do | PASS | FAIL |
|---|---|---|---|
| A1 | From Home, tap **"Daily Practice"**. If a resume prompt appears, take either option. When offered a choice, tap **"Quick"**. If a breathing circle appears, tap **"Skip →"**. | A practice screen with a reflection text field. | — |
| A2 | Tap the first reflection text field. If iOS's QuickPath typing tutorial appears, dismiss it (not a FAIL) and look again. | The software keyboard rises, and a bar reading **"I need support"** sits directly on top of it, fully visible. | The bar is missing, partly covered, or the keyboard does not rise. |
| A3 | Tap **"I need support"** on that bar **once**. | Within ~3 s, **"Crisis Support Resources"**. | More than one tap is needed, the tap does nothing, or it lands anywhere else. Tapping the floating lifebuoy button **does not count**. |

---

## 4. Reading the result

- **Any FAIL aborts the release.** Re-running to turn a FAIL into a PASS is not allowed.
- **An ambiguous observation** (a prompt that flashed, a bar you aren't sure sat on the
  keyboard):
  - Force-quit Being and run that half once more.
  - If it is still ambiguous, it is a FAIL.
  - There is no "PASS with notes" that describes a deviation.
- **WAIVED** is allowed only when no qualifying iPhone is available. It is never a way past a
  FAIL.
  - The operator types the reason.
  - The record carries this sentence: *988 dial and keyboard accessory NOT verified on
    hardware for vX.Y.Z.*
  - `/b-release` refuses a waiver if the previous release was also `WAIVED`.
  - A waived build must not be promoted to the App Store until this checklist passes against
    that TestFlight build. That run follows **§5**, and its result goes on the release PR as a
    comment.
  - **This clause is the release path's only. It does not extend to hotfixes** — see §5, which
    refuses a waiver there.

---

## 5. Running against a TestFlight build

Two paths land here and they run the same procedure:

- **A waived release build** (§4), before that release is promoted to the App Store.
- **Every hotfix build** (INFRA-605). A `hotfix/* → main` merge fires `release.yml` on push and
  `--auto-submit` delivers the binary with no human in the loop, so there is no pre-build slot
  and no `/b-release` prompt. The trigger is the hotfix PR.

**Wait for installable, not for green.** `release.yml` exiting green means *uploaded*, not
accepted — Apple processing can still reject a fully green submit, by email only, as ITMS-90683
did. The build is ready when TestFlight offers it for install.

**Run §2 and §3 in full. Do not let the diff decide which halves to run.** The hotfix path is
the one path where no Protected-Paths planning pass ever happens — `/b-work` is what consults
that table, and hotfixes are hand-run — and it is the branch class where `--no-verify` and
`--skip-e2e` are both permitted. A hotfix can therefore have passed zero safety gates,
including `crisis-keyboard-reachability.yaml`, which is the accessory half's only other
coverage. That is exactly when its hardware run stops being redundant.

**One mechanical exemption.** If the diff from the last build carrying a PASS record touches
nothing outside `.github/workflows/`, record `EXEMPT` with the diff output pasted and skip the
device run. INFRA-458 already treats workflow-only changes as a class that cannot move app
behaviour. This is computed, never judged — "the diff looks unrelated" is not this rule.

```bash
git diff --name-only <LAST_PASS_SHA> <MERGE_SHA> | grep -v '^\.github/workflows/'
# any output at all → run the checklist
```

### What the record must bind

There is no `binding: ok` here. That check diffs two trees, and no tree diff reaches a binary
someone installed from Apple. The chain that *is* checkable is merge → EAS → App Store Connect
→ the phone, so the record prints each link rather than asserting the whole:

```
Merge commit:   <MERGE_SHA>                      # gh pr view <N> --json mergeCommit -q .mergeCommit.oid
EAS build:      <build-id>  gitCommitHash=<SHA>  # eas build:list --platform ios --json
Binding:        gitCommitHash == merge commit → ok | MISMATCH
ASC build:      <appVersion> (<appBuildVersion>)
Installed:      <version (build)> exactly as TestFlight shows it
```

- **The build number identifies the build; the version string does not.** A hotfix does not bump
  the version — `/b-release` owns the four-source bump — so two consecutive hotfix builds share
  an `appVersion` and differ only by build number.
- **`appVersionSource: remote`.** That build number is EAS's own counter. Read it from
  `eas build:list` or App Store Connect, never from `app/app.json` or the in-app version string.
- **Residual, and it stays on the record:** nothing proves the binary executing on the phone is
  that ASC build beyond what TestFlight displays. `Binding: ok` on the hash line is weaker than
  the release path's tree diff. Do not read it as the same guarantee.

For D3 specifically the TestFlight binary is **stronger** evidence than a local build: it is
EAS-built on the `production` profile with a CNG `expo prebuild` on EAS's runner, so it
exercises the *shipped* `Info.plist`. Nothing else in this repo reaches that — CI's INFRA-592
check reads prebuild output, not the binary.

### FAIL

"Any FAIL aborts the release" (§4) has no referent here: the build has already shipped.

1. **Record the FAIL block on the PR first**, before diagnosing anything. A FAIL that lives only
   in someone's head is what this step exists to prevent.
2. **Do not promote to the App Store.** That is the entire gate.
3. **Do not revert the hotfix.** It is on `main` because something needed fixing, and reverting a
   crisis-path hotfix over a device-check FAIL is plausibly net-worse.
4. **Disambiguate: install the last build carrying a PASS record and re-run only the failing
   half**, same device, same session. This is *not* the re-run §4 forbids — that bans re-running
   the same binary to convert a FAIL; this is a different binary answering a different question.
   - **Also FAILs** → the hotfix did not cause it, and **the live App Store build is affected**.
     Open a DEBUG at P0 and work it as a production crisis-path incident, not a release blocker.
     Do **not** expire the TestFlight build: that removes the fix and leaves testers on an
     equally-broken older one.
   - **Passes** → the hotfix caused it. Expire the TestFlight build in App Store Connect, open a
     DEBUG, and ship the correction as a second hotfix, which runs this section in turn.

### No waiver on the hotfix path

**`WAIVED` is not a permitted `Result:` for a hotfix build**, and §4's waiver clause does not
extend here. A release waiver exists because the release is *blocked* on the device; a hotfix
build is gated only on an App Store promotion that is already a manual, indefinitely deferrable
click, with the fix live on TestFlight meanwhile. So a waiver buys nothing that "not promoted
yet" does not already buy, and it would spend the one word that means *we knowingly shipped
unverified*. Urgency and device-absence have the same answer: **promote later.**

If a live emergency ever forces promotion anyway, that is an out-of-process decision, not a
waiver. Record it on the hotfix PR with the words *promoted without hardware verification*. Do
not spell it `WAIVED`, and do not expect the release path to notice: Phase 2.9's `PREV_WAIVED`
query is `--base main --head development`, blind to hotfix PRs by construction.

---

## 6. Result block

`/b-release` Phase 2.9 fills this in and embeds it in the release PR body. A §5 run fills in the
same block and posts it as a PR comment.

Pick ONE literal per two-valued field. `Build:` on a §5 record must never contain
`expo run:ios` — a reader scanning for that string must not find it on a TestFlight record.

```
### Crisis device checklist (INFRA-591)
Result:         PASS | FAIL | WAIVED | EXEMPT
Trigger:        /b-release Phase 2.9 | hotfix PR #<N> (INFRA-605) | waived release <vX.Y.Z> (§5)
Build:          local Release (npx expo run:ios --device --configuration Release) | TestFlight (EAS <build-id>)
Device:         <model>
iOS:            <version>
Date:           <YYYY-MM-DD>

DIAL       D2 [PASS|FAIL]  D3 [PASS|FAIL]  after_cancel_alert: yes|no  call_connected: yes|no
ACCESSORY  A2 [PASS|FAIL]  A3 [PASS|FAIL]
Re-runs:   none | <which half, and what was ambiguous>

# Release path only (Phase 2.9):
Tested commit:  <TESTED_SHA — computed by /b-release, bound to the release head, binding: ok>
Waiver:         <WAIVED only: reason + "988 dial and keyboard accessory NOT verified on hardware for vX.Y.Z">

# TestFlight path only (§5) — every line, or the chain is not bound:
Merge commit:   <MERGE_SHA>
EAS build:      <build-id>  gitCommitHash=<SHA>
Binding:        ok | MISMATCH
ASC build:      <appVersion> (<appBuildVersion>)
Installed:      <version (build)> exactly as TestFlight shows it
Exempt:         <EXEMPT only: "workflows-only vs <LAST_PASS_SHA>" + the diff command's output>
```

---

## 7. Where this departs from the INFRA-591 wording

- **"Call Now" → "📞 Call 988".** On the 988 card the card-level Call Now is hidden, and every
  other Call Now dials a different line.
- **"journal composer" → Daily Practice.**
  - The journal sits behind `voice_journal`, which is off in production.
  - The Insights weekly reflection renders only after 4 or more check-ins in the week, so it
    does not exist on a fresh device.
  - Daily Practice is the surface `crisis-keyboard-reachability.yaml` uses. A green sim run
    next to a red device run therefore points at the hardware.
- **The accessory half stays** even though DEBUG-590 landed. The simulator covers
  reachability on iOS 18.6. Real keyboard layering on current iOS is only covered here.

---

## 8. Known gaps this checklist does not close

- **A hotfix reaches TestFlight before it is checked.** A `hotfix/* → main` merge fires
  `release.yml` on push, and `--auto-submit` delivers the binary to App Store Connect with no
  human in the loop — so TestFlight testers can install a hotfix whose dial and accessory
  halves nobody has run, for an unbounded and uninstrumented window. INFRA-605 gates only App
  Store **promotion** of that build, not its TestFlight distribution. There is no pre-build
  slot on the hotfix path to close the earlier window.
- **CI checks only the generated `Info.plist`, not the binary.** Its `Generated Info.plist
  keeps tel/sms` step (INFRA-592) reads the `expo prebuild` output, so it cannot see the
  Xcode build, the EAS binary, or `canOpenURL` on hardware. D3 is the only check of those.
- **The automated dial flow can only assert that the fallback alert is absent.** It cannot see
  the iOS prompt, so removing this checklist gives up that observation.

---

## 9. Removal

Remove this checklist and its `/b-release` Phase 2.9 step only when all three hold:

1. **DEBUG-589's exit condition is met:** a Maestro release that ships `MaestroDriverLib/`,
   or an upstream fix to the runner handshake on iOS ≥ 26.
2. **Both `safety-device-only` flows are re-certified** green on hardware at the pinned
   version.
3. **`/b-release` runs those flows in this same slot.**

Being runnable is not enough, because no gate runs device-only flows today.

Do it in one commit:
- The flow notices.
- The matching entries in `app/__tests__/safety/deviceOnlyFlowsUnavailable.test.ts`, which
  fails if this file outlives the notices or the notices outlive it.
- This file.
- The Phase 2.9 step.
- **The hotfix step in `.claude/CLAUDE.md`'s Hotfix Process** (INFRA-605), and the App Store
  promotion gate it carries. Nothing else removes it: it is prose on a path with no skill, so a
  removal that forgets it leaves a procedure step pointing at a deleted file.
