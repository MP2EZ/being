# Safety-path e2e with Maestro (INFRA-171)

## Why Maestro

Being is a wellness app touching at-risk users. Five user-visible safety contracts ship in every build:

1. PHQ-9 Q9 > 0 fires exactly one canonical alert with three buttons.
2. PHQ-9 score ≥20 completion shows a crisis-tier results banner.
3. GAD-7 score ≥15 completion shows a crisis-tier results banner.
4. Crisis button reaches `CrisisResources` from each tab (Home/Learn/Insights/Profile).
5. 988 dial does not surface the "Unable to Call" fallback alert (pins `LSApplicationQueriesSchemes`). *Primary pin is now the jest static-config test at `app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts`; the Maestro flow is device-only supplementary verification — see INFRA-184.*

Every Jest test in the suite mocks `Alert.alert` and `Linking.canOpenURL`. That's correct for Jest's job (fast logic verification), but it means these five user-visible contracts are invisible to the rest of the test stack. The MAINT-166 PR 1 double-Alert regression existed because nothing mechanically pinned them — the bug only surfaced because a code-review docstring (`⚠️`) flagged it.

Maestro fills that gap. It runs against a real iOS sim, where `LSApplicationQueriesSchemes` actually matters, real alerts actually appear, and the safety surface is observable end-to-end. YAML flows are cheap to author, `maestro studio` is a usable debugging tool, and the local-only execution model keeps macOS CI runner costs out of scope for a solo-founder project.

Detox was previously in the repo (`MAINT-119`) with one real test and zero commits since — never CI-integrated, never doc-referenced beyond a tagline. INFRA-171 replaces it.

## What this is NOT

- Not a CI gate. Local-only. The `/b-close` Phase 2.5 gate is the choke point.
- Not coverage for non-safety surfaces (onboarding content, settings, breathing screens). Jest handles those.
- Not a performance gate. Use `npm run perf:crisis` / `perf:breathing` / `perf:launch` for timing assertions.
- Not Android. iOS-only for v1 — Android UX is identical, so flows would be near-duplicates.

## One-time install (per developer Mac)

```bash
# IMPORTANT: do NOT use `brew install maestro` (that's a different cask —
# Maestro.app, the AI desktop tool). Use the explicit tap-scoped formula:
brew tap mobile-dev-inc/tap
brew install mobile-dev-inc/tap/maestro
maestro --version    # confirm — should print 2.x.x
```

Maestro is a Java tool. If `which java` is empty, `brew install openjdk` and
export `JAVA_HOME` before invoking maestro (or add to your shell profile):

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk
export PATH="$JAVA_HOME/bin:$PATH"
```

## Per-session prereq — build a NO-DEV-CLIENT install (INFRA-216)

Maestro drives an already-installed app on an already-booted sim. It does **not** build the app. Build a **no-dev-client** install once per worktree session:

```bash
cd app
npm run e2e:safety:build   # EAS local build (e2e-sim profile) + install on the booted sim
```

> 🚨 **Do not pipe this command.** `npm run e2e:safety:build 2>&1 | tee build.log`
> (or `| tail`, `| head`, `| grep`) reports the exit status of the **last** command
> in the pipeline, not the build — so a failed build looks like success:
>
> ```bash
> bash -c 'exit 7' | cat; echo $?   # -> 0
> ```
>
> This is almost certainly what produced the 2026-08-02 report behind DEBUG-315:
> EAS aborted on a dirty tree, the piped invocation reported 0, and the full
> Maestro suite then ran 0/5 against the stale build still installed. The script
> itself propagates correctly (`set -euo pipefail`, verified) — the masking happens
> in the **calling** shell, which the script cannot fix. If you must capture output:
>
> ```bash
> set -o pipefail; npm run e2e:safety:build 2>&1 | tee build.log
> ```
>
> **Clean-tree pre-flight (INFRA-329).** `eas.json` sets `requireCommit: true`, so a
> dirty working tree was always fatal — but EAS only says so ~30 s in, after its own
> startup, in output that reads like progress. The script now runs `git status
> --porcelain` **first**, before even the booted-sim check, and fails immediately with
> the offending paths listed. There is deliberately **no bypass flag**: this script is
> the gate's only evidence that the build under test is fresh (DEBUG-315), so a
> dirty-tree escape hatch would exist purely to defeat it. The stage-level failure paths
> (dirty tree, build fails, build succeeds without producing an artifact, extraction,
> sim install) are covered by `app/__tests__/scripts/e2e-sim-build.test.js`, which
> PATH-shims `git`/`eas`/`xcrun` and runs anywhere in milliseconds. What stays manual is
> the genuine end-to-end run against real eas-cli and a real simulator — CI is 100%
> `ubuntu-latest`, so nothing here proves EAS itself honours `requireCommit`, only that
> the script refuses to reach EAS with a dirty tree.

> ⚠️ **The gate target is a build that EXCLUDES `expo-dev-client`, not just a
> Release build.** This is the load-bearing INFRA-216 finding, and it corrects
> earlier guidance in this doc:
>
> - `expo-dev-client` is a project dependency, so it is linked into **both**
>   `npm run ios` **and** `expo run:ios --configuration Release`. Both therefore
>   still show the Expo dev launcher ("DEVELOPMENT SERVERS" screen) after
>   `clearState: true`. The flows can only navigate that launcher by tapping a
>   guessed screen coordinate, which flakes badly (INFRA-216: every sim flow hit
>   0–1/5 on a dev build *and* on a plain `--configuration Release` build — the
>   launcher is present on both).
> - Only a build with `developmentClient: false` removes the launcher. That is
>   the EAS **`e2e-sim`** profile (`eas.json`: `developmentClient:false`,
>   `simulator:true`, Release), which `npm run e2e:safety:build` produces and
>   installs. With it, the app boots straight to the LegalGate (validated: the
>   `_legal-and-onboarding.yaml` launcher steps simply `WARN`+skip). This is also
>   effectively what TestFlight/App Store users get.

**Prereqs** (one-time per machine). Only the booted-simulator check is enforced by the
build script — the rest are **not** verified, so a missing one surfaces as an opaque EAS
failure rather than a named prereq error:
- `eas-cli` logged in — `npx eas whoami` (else `npx eas login`).
- `fastlane` — `brew install fastlane`. *(Heads-up: on some setups `brew install
  fastlane` upgrades Ruby and can orphan CocoaPods' `ffi` gem — if `pod --version`
  then errors, run `brew reinstall cocoapods`.)*
- A booted iOS simulator.
- First build is ~10–15 min (EAS local). After that the sim can stay open across
  many flow runs.

> ✅ **Resolved (INFRA-217): the sim flows skip the preamble via a seeded state.**
> The no-dev-client Release build boots/transitions slowly, and the long LegalGate
> + 16-question onboarding preamble in `_legal-and-onboarding.yaml` was too
> timing-fragile for consecutive ≥5/5. The robust fix shipped: the `e2e-sim` EAS
> profile sets **`EXPO_PUBLIC_E2E_SEED_ONBOARDED=true`** (eas.json
> `build.e2e-sim.env`), which makes `App.tsx` seed post-onboarding state at launch
> — legal consents + age verification (≥18) + onboarding-complete, written via the
> real store APIs (`grantConsent` / `verifyAge` / `recordLegalGateConsents`). With
> that state present, `CleanRootNavigator` routes straight to Main, so the four sim
> flows (`q9`, `phq9`, `gad7`, `crisis-button`) now `runFlow: _seeded-home.yaml`
> (just `extendedWaitUntil home-screen`) instead of traversing the preamble.
>
> **Compliance boundary.** The seed is impossible in any shipping build: the env
> var lives ONLY in the `e2e-sim` profile (absent from production / preview /
> production-emergency / development) and defaults to `'false'` in `env.ts`. There
> is deliberately no `EXPO_PUBLIC_ENV==='production'` guard — the `e2e-sim` profile
> `extends: production` and resolves `EXPO_PUBLIC_ENV=production`, so such a guard
> would refuse to boot the gate's own build. The boundary is pinned in CI by
> `app/__tests__/safety/e2eSeedGate.config.test.ts`. The seed does NOT weaken the
> canonical `useConsentStore.canPerformOperation(...)` gate. The device-only
> `crisis-988-dial.yaml` runs on a non-seeded real-device build and still uses the
> full `_legal-and-onboarding.yaml` traversal (left unchanged).

### Dev-mode caveats (INFRA-171 / INFRA-216 verification findings)

In **dev builds** (`npm run ios`), the safety surface is hidden behind a cascade
of dev-mode-only overlays that block flow execution:

1. **Expo Dev Launcher** — `clearState: true` resets the dev-client's launch
   preference, so it opens the "DEVELOPMENT SERVERS" screen. The flow can only
   pick the server by a guessed coordinate tap — the dominant flake.
2. **Dev tools first-launch tutorial** — "Continue" to dismiss.
3. **Dev menu bottom sheet** — pops up unpredictably; no reliable headless dismiss.
4. **RN LogBox red-screen** — `core/services/security/` uses `console.error` for
   routine info logs; in dev mode LogBox renders a full-screen stack over the
   LegalGate.

**A plain `expo run:ios --configuration Release` does NOT escape #1** — because
`expo-dev-client` is still linked, the launcher is present on Release too
(verified INFRA-216). #4 (LogBox) is gone on Release (`__DEV__` false), but the
launcher is the killer. The **`e2e-sim` no-dev-client build** is the only thing
that removes the launcher; `npm run e2e:safety:build` is the supported entry
point. CLAUDE.md "Known Gotchas" and `/b-close` Phase 2.5 were reconciled to this
in INFRA-216.

## Running the flows

```bash
# Sim suite (4 flows tagged `safety`, ~3–5 min) — runnable on iOS sim.
# INFRA-220: runs each flow as a SEPARATE maestro invocation with an XCUITest-
# driver reset between (scripts/e2e-safety.sh), NOT one batch
# `maestro test .maestro/` session. A shared session degrades across the suite
# and the 4th/longest flow (crisis-button) over-pops + desyncs; isolated
# invocations give each flow a fresh driver. New `safety`-tagged flows are
# auto-included; `safety-device-only` + `_helper` flows are excluded.
npm run e2e:safety

# Individual sim flows (one at a time, ~30–60s each)
npm run e2e:safety:q9              # PHQ-9 Q9 single-alert pinning
npm run e2e:safety:phq9            # PHQ-9 ≥20 completion banner
npm run e2e:safety:gad7            # GAD-7 ≥15 completion banner
npm run e2e:safety:crisis-button   # crisis button reaches CrisisResources from each tab

# Device-only flow (tag `safety-device-only`, excluded from `e2e:safety`).
# Cannot pass on iOS simulator because canOpenURL('tel:988') returns false
# on sim regardless of LSApplicationQueriesSchemes. Run manually against a
# real iPhone connected to the Mac. Primary pin for the
# LSApplicationQueriesSchemes contract is the jest static-config test at
# `app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts`, which
# runs in `npm run precommit` on every commit (INFRA-184).
npm run e2e:safety:988-dial        # 988 button does not show "Unable to Call" fallback (device-only)
```

`/b-close` Phase 2.5 automatically picks the scoped subset of flows based on changed paths — see CLAUDE.md Workflow Commands. `app.json` / `Info.plist` changes no longer trigger a Maestro flow: the jest static-config test in precommit catches `LSApplicationQueriesSchemes` regressions deterministically (INFRA-184).

## How a flow works

Each flow under `app/.maestro/`:

1. Starts with `appId: fyi.being.app` and `tags: [safety]`.
2. Calls `- launchApp: { clearState: true, clearKeychain: true }` for a fresh install.
3. Reaches the main tab navigator. The path differs by build:
   - **Sim flows** (`q9`, `phq9`, `gad7`, `crisis-button`) run on the seeded `e2e-sim`
     build and call `- runFlow: _seeded-home.yaml` — a one-line helper that just waits
     for the `home-screen` testID. The app self-seeds onboarding state at launch
     (INFRA-217), so there is no LegalGate / onboarding to traverse.
   - **Device-only** `crisis-988-dial.yaml` runs on a non-seeded real-device build and
     still calls `- runFlow: _legal-and-onboarding.yaml` to traverse the LegalGate (age
     picker + 4 consent toggles) and the 5-screen Onboarding flow.
4. Drives the safety surface (taps testIDs, asserts visible/notVisible).

The `_legal-and-onboarding.yaml` traversal subflow uses text-based selectors for legal-gate consent text (more robust than testIDs for legal copy that may rotate). It uses `optional: true` for onboarding intermediate Next/Continue taps so minor copy changes don't break flows — if a button isn't found, Maestro skips that step and continues.

## Anatomy of one flow

Take `q9-single-alert.yaml` as the canonical example:

```yaml
appId: fyi.being.app
tags:
  - safety
---
- launchApp: { clearState: true }
- runFlow: _legal-and-onboarding.yaml
- tapOn: { text: "Profile" }
- tapOn: { id: "take-phq9-button" }
- tapOn: { id: "assessment-begin-button" }
- repeat:
    times: 8
    commands:
      - tapOn: { id: "assessment-response-group-option-0" }
- tapOn: { id: "assessment-response-group-option-1" }   # Q9 > 0
- assertVisible: "Crisis Support Available"
- assertVisible: "Call 988 (Crisis Lifeline)"
- assertVisible: "Text 741741 (Crisis Text)"
- assertVisible: "Emergency 911"
- assertNotVisible: "View Resources"                    # old mockCrisisEngine copy
- assertNotVisible: "Call 988 Now"                       # old mockCrisisEngine copy
```

The `assertNotVisible` lines pin the MAINT-166 PR 1 fix: the old `mockCrisisEngine` alert ("View Resources" / "Call 988 Now") must not appear alongside the canonical alert. That was the double-Alert bug.

## Adding a new flow

When a work item touches the safety surface (signals: `crisis`, `988`, `PHQ`, `GAD`, `threshold`, `assessment`, `safety plan`, `emergency`), the deliverable extends to include a Maestro flow pinning the new contract.

1. Copy the closest existing flow as a starting point.
2. Use `maestro studio` (`maestro studio fyi.being.app`) to record taps against the sim — gives you exact testID / accessibility selectors.
3. Update the `name:` and `tags:` lines.
4. Wire it into `app/package.json`: add `e2e:safety:<name>` script.
5. Extend `/b-close` Phase 2.5 path-to-flow mapping if the new flow pins a contract not already covered by the path globs.
6. Add the test-only testIDs your flow needs to source files (prefer testID over text selectors for anything that isn't legal/copy-stable). **For anything you `tapOn` this is load-bearing, not stylistic**: a `text:` selector that matches two nodes taps the first and still reports `COMPLETED`, so an ambiguous tap selector produces a green run that never touched the control — see the selector gotchas at the end of "Debugging a failing flow".
7. Document in this file under the flow list.

## Debugging a failing flow

Maestro's output names the failing step. Three common causes:

1. **TestID doesn't exist** — the most common failure. Grep the source for the testID. If it's missing, add it. If it changed, update the flow.
2. **Race condition** — assertion ran before the UI rendered. Use `extendedWaitUntil` instead of `assertVisible`:
   ```yaml
   - extendedWaitUntil:
       visible: { id: "results-crisis-banner" }
       timeout: 5000
   ```
   The 988-dial flow uses this pattern for the `notVisible: "Unable to Call"` assertion because the `Linking.openURL` → `canOpenURL` race resolves async.
3. **Onboarding traversal drift** — the `_legal-and-onboarding.yaml` subflow uses `optional: true` for intermediate Next/Continue taps because the Onboarding state machine has 5 sub-screens and copy may rotate. If a Next button has a new label that doesn't match `text: "Continue"` or `text: "Next"`, add the new label or use a testID.
4. **XCUITest driver wedged across consecutive runs (NOT a flow bug)** — Maestro's iOS driver (`xcodebuild test-without-building`) leaks/wedges when the suite is run repeatedly back-to-back (e.g. a `for i in 1 2 3 4 5; do npm run e2e:safety; done` determinism loop). It surfaces as `CommandFailed: Failed to connect to /127.0.0.1:<port>` / `Connection refused`, flows that die 4–6 s after launch, or a flow that hangs for minutes on a fully-wedged driver. The traversal and assertions are fine — the *driver* is dead. Reset it between runs:
   ```bash
   pkill -9 -f "test-without-building"   # then sleep ~8s and re-run
   ```
   Verified during INFRA-208: a no-reset 5× loop gave **1/5**; the same loop with a driver reset between runs gave a clean **5/5 (20/20 flows)**. **INFRA-220 update:** the degradation also accumulates *within a single batch session* — the old `npm run e2e:safety` (`maestro test .maestro/`, all 4 flows in one driver) failed on the 4th/longest flow (`crisis-button`) as the driver slowed and `nav-back-button` over-popped. `npm run e2e:safety` now runs each flow as a separate invocation with a driver reset between (`scripts/e2e-safety.sh`), so the real `/b-close` usage gets a fresh driver per flow and is unaffected. A related **dev-build-only** flake: the Expo dev launcher can time out at the `legal-dob-picker` wait while the JS bundle is still loading from Metro (the failure screenshot shows the bundle spinner, not the LegalGate). Mitigate by raising `MAESTRO_DRIVER_STARTUP_TIMEOUT` (e.g. `120000`) and/or warming the bundle (`curl -s -o /dev/null "http://localhost:8081/index.bundle?platform=ios&dev=true"`) before the run. Absent in Release builds (no Metro, no dev launcher).

> One more selector gotcha (INFRA-208): Maestro's `text:` selector is a **full-match** regex, and React Native merges a `Focusable`/`accessible` container's child `Text` with a sibling's `accessibilityLabel` into one node. The assessment progress counter renders as "Question 1 of 9" but its accessibility text is `"Question 1 of 9, Progress: 1 of 9 questions completed"`, so a bare `text: "Question 1 of 9"` silently fails to match. Wrap such selectors in `.*…*` (e.g. `text: ".*Question 1 of 9.*"`). Confirm the real accessibility string with `maestro hierarchy`.
>
> **And its mirror image (FEAT-298): a selector matching _two_ nodes does not fail — it silently taps the first.** The daily-loop flow used `text: ".*Begin [Ff]resh.*"` for the resume modal's button, but the modal's **body copy** contains the phrase too (*"…or begin fresh with full presence now?"*), and that `<Text>` precedes the button in the hierarchy. Maestro tapped the paragraph and reported **`COMPLETED`** — truthfully, since it did tap *something*. Two device runs were burned before a screenshot showed the modal still open, and for that window a committed fix looked verified when it had never executed. The rule: **for any control whose surrounding copy could contain its label, add a `testID` and target by id** (FEAT-298 added `resume-session-button` / `begin-fresh-button`). The two gotchas compose badly — the first makes a selector match *nothing*, the second makes it match the *wrong thing*, and **only the first one fails your run**. So the general lesson is the one to carry: *a passing step is not proof the intended element was hit.* When a flow passes but the assertion it was protecting looks untested, re-run with `maestro hierarchy` (or a screenshot at that step) before believing it.

To debug interactively:

```bash
cd app
maestro test .maestro/q9-single-alert.yaml --debug
maestro studio fyi.being.app
```

`maestro studio` opens a recorder window where each tap on the sim is captured and shown as YAML. Copy the captured YAML into a flow.

## `/b-close` Phase 2.5 gate

When `/b-close` is invoked, after the local commit, it runs:

```
git diff --name-only origin/development...HEAD | grep ...safety paths...
```

If anything matches (`app/src/features/(assessment|crisis)/`, `app/src/core/services/security/`, `app/src/core/navigation/CleanRootNavigator`, `app/app.json`, `app/ios/**/Info.plist`), the gate kicks in:

- **No match** → skipped with `ℹ️ No safety-surface changes`. Proceed to push.
- **Match, `--skip-e2e` set on `hotfix/*`** → bypassed with warning. Document why in PR body.
- **Match, `--skip-e2e` set on `feat/*` / `fix/*` / `chore/*`** → **hard refusal**. Run Maestro flows or rebase onto hotfix.
- **Match, no bypass** → sim-readiness check, then scoped flow run:
  - Touched `features/crisis/` → `e2e:safety:crisis-button`
  - Touched `features/assessment/` → `e2e:safety:q9` + `e2e:safety:phq9` + `e2e:safety:gad7`
  - Touched `app.json` / `Info.plist` only → no Maestro flow (INFRA-184: the jest static-config test at `app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts` runs in `precommit` and catches the regression before this gate)
  - Touched `services/security/` or `CleanRootNavigator` → full sim suite (cross-cutting; excludes the `safety-device-only` 988-dial flow)
- **Sim not ready** → exit cleanly with "Run `npm run ios` first, then retry /b-close". No auto-boot.
- **Flow fails** → print Maestro output, exit. Push is blocked.

## The flows + what each pins

**8 flows tagged `safety`** run under `npm run e2e:safety`, plus 1 tagged
`safety-device-only` that does not. (This table read "The 5 flows" until
INFRA-317; it had drifted three behind — the count here and in CLAUDE.md is worth
re-checking whenever a flow is added, since nothing enforces it.)

| Flow | What it pins | Source contract |
|---|---|---|
| `q9-single-alert.yaml` | PHQ-9 Q9 > 0 fires exactly one canonical alert (no `View Resources` / `Call 988 Now` from old mockCrisisEngine) | `assessmentStore.ts` `triggerEmergencyResponse` (alert copy) + MAINT-166 PR 1 (single-alert) |
| `phq9-severe-completion.yaml` | Score ≥20 (Q9=0) shows `results-crisis-banner` on completion | `safety.ts` `PHQ9_SEVERE_THRESHOLD = 20` |
| `gad7-severe.yaml` | Score ≥15 shows `results-crisis-banner` on completion | `safety.ts` `GAD7_SEVERE_THRESHOLD = 15` |
| `crisis-button-reachability.yaml` | Crisis button → `CrisisResources` from each of 4 tabs | CLAUDE.md "988 access <3 taps from any screen" |
| `journal-crisis-scan.yaml` | Journal crisis-content scan fires its intervention | crisis detection contract |
| `daily-loop-deeplink.yaml` | `being://daily` cold start keeps the crisis overlay AND an escape from the immersive practice | FEAT-298 slice 4 + `linking.ts` `initialRouteName` |
| `daily-loop-quick-depth.yaml` | Quick-depth loop path completes | FEAT-301 |
| `deeplink-consent-gate.yaml` (INFRA-317) | With consent **ungranted**: `being://daily` is dropped and LegalGate renders; `being://crisis` still reaches crisis resources with a visible 988 affordance | INFRA-308 contracts 28–29 + `linking.ts` `isCrisisExemptPath` running before any consent read |
| `crisis-988-dial.yaml` (device-only — see INFRA-184) | Tapping 988 does NOT show "Unable to Call" fallback (i.e., `LSApplicationQueriesSchemes` still allows `tel:`). **Primary pin is the jest test at `app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts`** — runs in precommit on every commit. | `app/app.json` + `app/ios/Being/Info.plist` `LSApplicationQueriesSchemes` array (INFRA-147; INFRA-184 decomposition) |

### Booting with consent ungranted (INFRA-317)

Every sim flow except `deeplink-consent-gate.yaml` calls `_seeded-home.yaml` and
relies on the INFRA-217 launch seed. A consent gate cannot be tested from a build
that has already granted consent, so INFRA-317 added a per-flow opt-out.

Append `?e2eSeed=ungranted` to the launch URL. The seed then skips all of its
writes and the app boots from empty state (`onboardingCompleted` false,
`consentStatus` `'missing'`) → LegalGate. Three properties make this safe, and any
future flow using it must preserve them:

- **Suppressor only.** It writes nothing and revokes nothing; the empty state comes
  from `clearState` + `clearKeychain`. It can decline a grant, never cause one.
- **No new env var, no new EAS profile.** The marker is read only inside the
  existing `EXPO_PUBLIC_E2E_SEED_ONBOARDED` branch, so with that var at its
  `'false'` default the path is unreachable dead code and the compliance boundary
  stays exactly where INFRA-217 put it. Pinned by
  `__tests__/safety/e2eSeedGate.config.test.ts`.
- **Invisible to navigation.** `DeepLinkValidationService` strips the param (not in
  `ALLOWED_PARAMS`) and rebuilds the URL from the survivors, so the link under test
  reaches React Navigation bare.

Use `stopApp` → `clearState` → `clearKeychain` → `openLink`, **not** `launchApp`.
The marker must reach `Linking.getInitialURL()`, which only carries a URL on a cold
start, and an intervening `launchApp` would seed consent before the marker is ever
seen — making every later assertion vacuous.

## Out of scope (deferred)

- CI macOS-runner integration (cost vs. flake risk not justified)
- Non-safety surfaces (onboarding content, breathing, settings)
- Performance-budget assertions (Jest perf hooks own those)
- Android-specific flows (UX is identical)
- Maestro Cloud or paid Maestro products

## Predecessor work

INFRA-171 scoping/design lives at `~/.claude/plans/infra-171-shiny-hopcroft.md` (and the predecessor scoping note at `maint-166-sleepy-popcorn.md`). The MAINT-166 PR 1 incident is the proximate trigger.
