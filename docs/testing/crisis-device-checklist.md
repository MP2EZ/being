<!-- e2e-device-compensates: DEBUG-589 flows=crisis-988-dial.yaml,crisis-keyboard-accessory.yaml -->

# Crisis device checklist: 988 dial + keyboard accessory (INFRA-591)

**This checklist exists because the automated device gate is unavailable.** DEBUG-589
measured that no released Maestro can run a flow on a physical iPhone, so
`crisis-988-dial.yaml` and `crisis-keyboard-accessory.yaml` cannot start. Nothing else
verifies these two contracts on real hardware. A green CI run, a green precommit and a green
`npm run e2e:safety` are **not** evidence for anything below.

**When it runs:** before every release, prompted by `/b-release` Phase 2.9, before anything
is bumped or merged. The result goes into the release PR body. It is release-gated, not
close-gated.

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
| A **Release** build of the release tree, installed on that iPhone | Debug ships the dev launcher. TestFlight only exists after the build fires, which is too late for the evidence `/b-release` needs. |

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
    that TestFlight build. Record that run as a comment on the release PR.

---

## 5. Result block

`/b-release` Phase 2.9 fills this in and embeds it in the release PR body.

```
### Crisis device checklist (INFRA-591)
Result:         PASS | FAIL | WAIVED
Tested commit:  <TESTED_SHA — computed by /b-release, bound to the release head>
Build:          local Release (npx expo run:ios --device --configuration Release)
Device:         <model>
iOS:            <version>
Date:           <YYYY-MM-DD>

DIAL       D2 [PASS|FAIL]  D3 [PASS|FAIL]  after_cancel_alert: yes|no  call_connected: yes|no
ACCESSORY  A2 [PASS|FAIL]  A3 [PASS|FAIL]
Re-runs:   none | <which half, and what was ambiguous>
Waiver:    <WAIVED only: reason + "988 dial and keyboard accessory NOT verified on hardware for vX.Y.Z">
```

---

## 6. Where this departs from the INFRA-591 wording

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

## 7. Known gaps this checklist does not close

- **Hotfixes ship without it.** A `hotfix/* → main` merge triggers the TestFlight build
  without passing through `/b-release`. Tracked as INFRA-605.
- **CI checks only the generated `Info.plist`, not the binary.** Its `Generated Info.plist
  keeps tel/sms` step (INFRA-592) reads the `expo prebuild` output, so it cannot see the
  Xcode build, the EAS binary, or `canOpenURL` on hardware. D3 is the only check of those.
- **The automated dial flow can only assert that the fallback alert is absent.** It cannot see
  the iOS prompt, so removing this checklist gives up that observation.

---

## 8. Removal

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
