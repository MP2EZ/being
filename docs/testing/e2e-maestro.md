# Safety-path e2e with Maestro (INFRA-171)

## Why Maestro

Being is a wellness app touching at-risk users. These user-visible safety contracts ship in every build:

1. PHQ-9 Q9 > 0 fires exactly one canonical alert with three buttons.
2. PHQ-9 score ≥20 completion shows a crisis-tier results banner.
3. GAD-7 score ≥15 completion shows a crisis-tier results banner.
4. Crisis button reaches `CrisisResources` from each tab (Home/Learn/Insights/Profile).
5. 988 dial does not surface the "Unable to Call" fallback alert (pins `LSApplicationQueriesSchemes`). *Primary pin is now the jest static-config test at `app/__tests__/safety/lsApplicationQueriesSchemes.config.test.ts`; the Maestro flow is device-only supplementary verification — see INFRA-184.*
6. A voice-journal entry containing crisis language surfaces support, and a clean entry does not (FEAT-283 slice A).
7. A cold-start `being://daily` deep link mounts an immersive practice screen with the crisis overlay present and an escape available (FEAT-298 slice 4).
8. The DailyLoop **quick**-depth arc keeps the crisis affordance reachable despite omitting Radical Acceptance, deep's inline support-line carrier (FEAT-301).
9. A consent-gated deep link is blocked pre-consent while a crisis deep link never is (INFRA-308 / INFRA-317).

**Keep this list in step with the flows.** It read "Five" for a long stretch after contracts 6–9 shipped, which understates what the gate covers — the opposite error to the telemetry overclaim below, and just as misleading. The count is not enforced anywhere; the runner globs by tag. Verify with:

```bash
grep -lE '^[[:space:]]*-[[:space:]]+safety[[:space:]]*$' app/.maestro/*.yaml | wc -l   # 8 sim-runnable
```

Contract 5 is the ninth flow and is tagged `safety-device-only`, so it is excluded from that count and from `npm run e2e:safety`.

Every Jest test in the suite mocks `Alert.alert` and `Linking.canOpenURL`. That's correct for Jest's job (fast logic verification), but it means these user-visible contracts are invisible to the rest of the test stack. The MAINT-166 PR 1 double-Alert regression existed because nothing mechanically pinned them — the bug only surfaced because a code-review docstring (`⚠️`) flagged it.

Maestro fills that gap. It runs against a real iOS sim, where `LSApplicationQueriesSchemes` actually matters, real alerts actually appear, and the safety surface is observable end-to-end. YAML flows are cheap to author, `maestro studio` is a usable debugging tool, and the local-only execution model keeps macOS CI runner costs out of scope for a solo-founder project.

Detox was previously in the repo (`MAINT-119`) with one real test and zero commits since — never CI-integrated, never doc-referenced beyond a tagline. INFRA-171 replaces it.

## What this is NOT

- Not a CI gate. Local-only. The `/b-close` Phase 2.5 gate is the choke point.
- Not coverage for non-safety surfaces (onboarding content, settings, breathing screens). Jest handles those.
- **Not a performance gate.** The flows carry `timeout:` failure ceilings, not ms or fps assertions — `crisis-button-reachability.yaml` says so itself. This bullet used to point at `npm run perf:crisis` / `perf:breathing` / `perf:launch`; **those scripts do not exist** — MAINT-166 PR 7 removed them because they ran zero matching tests. What actually enforces the budgets is in CLAUDE.md's Validation Matrix: crisis detection <200ms is a strict CI gate (`__tests__/performance/assessment-performance.test.ts`), the crisis button has a coarse jest proxy, breathing 60fps has a structural proxy only (`npm run check:breathing-worklets`), and app launch / check-in transition are hand-validated.
- **Not telemetry coverage.** See the section below — this is the gap most likely to be assumed away.
- Not Android. iOS-only for v1 — Android UX is identical, so flows would be near-duplicates.

## What the gate does NOT cover: the `crisis_detected` → Supabase sink

The gate verifies **UI reachability and thresholds**. It does *not* verify that the crisis
audit trail is delivered off-device, and reading a green gate as "the crisis paths were
verified" is quietly broader than the truth (INFRA-400).

The gate binary carries real Supabase configuration — INFRA-383 confirmed it by grepping
the embedded `main.jsbundle` — yet a full run writes **zero** rows. That is not a harness
artefact. Measured 2026-08-12 against the live project:

```sql
SELECT event_type, count(*) FROM public.analytics_events GROUP BY event_type;
 crisis_detected | 1     -- one row, total, of ANY event type, ever
```

The mechanism is a production defect, not a testing gap, and it is tracked in **DEBUG-409**:
`flushCrisisAnalytics()` early-returns at `if (!this.client) return;`, and the only thing
that ever constructs that client is `initializeCloudServices()`, whose module-scope eager
call is gated on `canPerformOperation('cloud_sync')` — evaluated at module-load time, when
consent has not yet hydrated from SecureStore and the predicate is necessarily `false`. It
never re-runs. So the client is built only if a user navigates to Profile → Cloud Backup.

Two consequences worth holding onto:

- **Zero rows in `analytics_events` is currently the EXPECTED reading**, for a gate run and
  for production alike. Do not diagnose it as a dead pipeline until DEBUG-409 lands — see
  `docs/development/crisis-analytics-runbook.md`.
- **Only 4 of the 8 sim flows could ever produce a row** (`q9-single-alert`,
  `phq9-severe-completion`, `gad7-severe`, `journal-crisis-scan`). The rest tap the crisis
  *button* without triggering crisis *detection*, so zero rows from those is correct
  behaviour rather than a gap.

Whether the gate *should* write rows at all is deliberately unresolved here: there is one
shared live Supabase project serving prod and dev with no staging, and `crisis_detected` is
the most sensitive row the system produces. That decision belongs with the fix, in DEBUG-409.

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

## Per-session prereq — build the Release gate target (INFRA-216, revised INFRA-383)

Maestro drives an already-installed app on an already-booted sim. It does **not** build the app. Build the launcher-free Release install once per worktree session (then ~1 min per rebuild):

```bash
cd app
npm run e2e:safety:build   # Release build (expo run:ios) + verify + install on the booted sim
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
> **Clean-tree pre-flight (INFRA-329) — now a warning, replaced by provenance (INFRA-384).**
> It still runs `git status --porcelain` first and still lists the offending paths, but it
> no longer aborts the build.
>
> It originally existed to fail fast ahead of EAS's `requireCommit: true`. INFRA-383
> removed EAS — and with it `requireCommit`, which was the only thing forcing the
> installed binary to correspond to a *commit* — so the pre-flight was kept as a stand-in
> until something better existed. INFRA-384 is that something, and it is both **stronger
> and narrower**:
>
> * `e2e-sim-build.sh` writes `.e2e-provenance.json` into the installed container: git
>   HEAD, a tree hash, and a dirty flag. It lives inside the container because `simctl`
>   mints a new container UUID on every fresh install, so any reinstall takes the marker
>   with it — that disappearance *is* the binding.
> * `e2e-safety.sh` verifies it before any flow and refuses on `MISMATCH` / `MISSING`.
>   A `MATCH_DIRTY` run still executes, behind an unmissable "NOT MERGE EVIDENCE" banner.
> * `/b-close` Phase 2.5 sets `E2E_REQUIRE_CLEAN_PROVENANCE=1`, which turns that same
>   dirty state into a refusal. What merges is the commit, so the binary must correspond
>   to one.
>
> Net: local iteration on a dirty tree is free, and *merging* on a dirty-tree build is
> impossible. The old pre-flight could not tell those two cases apart — it banned both.
> The tree hash deliberately includes **untracked file contents**; `git status --porcelain`
> plus `git diff HEAD` is blind to them (same `?? path` line whatever the bytes), and
> untracked `.ts` under `app/src` is bundled into `main.jsbundle`.
>
> Blind spots worth knowing: `app/ios/` and `app/.env.*` are gitignored, so native and env
> edits do not move the fingerprint (INFRA-383's env-parity and `Info.plist` asserts cover
> that surface at build time); and the fingerprint is repo-wide, so editing a `.maestro`
> flow between build and run invalidates the marker. That is over-refusal — the safe
> direction — but it will surprise you once.
>
> Stage-level failure paths are covered by `app/__tests__/scripts/e2e-sim-build.test.js`,
> which PATH-shims `git`/`npx`/`xcrun`/`otool`/`plutil` and runs anywhere in
> milliseconds. What stays manual is the genuine end-to-end run against a real simulator
> — CI is 100% `ubuntu-latest`, so nothing there proves Xcode actually rebuilt the
> bundle, only that the script refuses to proceed when the evidence says it did not.

> ⚠️ **The gate target is a Release build — `npm run ios` (Debug) will not do.**
> The **configuration**, not the EAS profile, is what removes the dev launcher.
>
> - `npm run ios` builds **Debug**, which links `expo-dev-launcher` and shows the
>   "DEVELOPMENT SERVERS" screen. The flows can only navigate that by tapping a
>   guessed screen coordinate, which flakes badly — and worse, can *pass by
>   coincidence*, producing a green crisis-path gate that is evidence of nothing.
> - A **Release** build excludes it structurally. Expo autolinking marks
>   `expo-dev-launcher` / `expo-dev-menu` `debugOnly: true`, so
>   `Pods-Being.release.xcconfig` never links them and `ExpoModulesProvider.swift`'s
>   Release branch of `getReactDelegateHandlers()` is an empty array. Verified on
>   the built artifact: 0 `otool` linkage, 0 `EXDevLauncher` symbols, no dev
>   frameworks; app boots straight to the seeded home screen; 7/7 flows pass.
>
> **Correction (INFRA-383).** This callout previously said `expo run:ios
> --configuration Release` *also* ships the launcher and that only the EAS
> `e2e-sim` profile (`developmentClient: false`) removes it. That was false. EAS's
> `developmentClient` flag only *defaults* `buildConfiguration`, and `e2e-sim` sets
> `Release` explicitly — so the flag was unreachable and never did the thing it was
> credited with. **How the error happened, because it will recur:** INFRA-216's own
> documented verification command was `npm run ios --configuration Release`, which
> omits the `--` separator, so the flag went to *npm* rather than to the script and
> it built **Debug**. Its `0–1/5` figure is also the same number INFRA-217 later
> attributed to the onboarding-preamble timing, on a build with no launcher at all.
> When a flag seems not to take effect through an npm script, check the separator
> before concluding anything about the tool.

**Prereqs.** Since INFRA-383 the default path needs no `eas-cli`, no credentials and no
`fastlane` — only Xcode and a booted simulator:
- **Exactly ONE booted iOS simulator** (the one prereq the script enforces by name).

  The count matters, and the script fails closed on it (INFRA-405). `xcrun simctl help`
  says of the `booted` selector: *"If multiple devices are booted when the 'booted' device
  is selected, simctl will choose one of them."* Unspecified which — so with two or more
  booted, a build could install to one device while the asserts, the provenance check and
  `maestro test` each independently landed on another. Both scripts now resolve the device
  once and thread that UDID through every call site, including `maestro test --device`, so
  "verified this binary" and "ran against this binary" are the same claim.

  Note the second simulator is often not booted by a person: `Simulator.app` auto-boots
  devices, and one has been observed booting *mid-build*. If you hit the refusal:

  ```bash
  xcrun simctl list devices booted        # see what is up
  xcrun simctl shutdown <udid>            # leave exactly one
  E2E_SIM_UDID=<udid> npm run e2e:safety:build   # …or name the target explicitly
  ```

  `E2E_SIM_UDID` is honoured by `e2e:safety:build` and by `e2e:safety` alike. Set it for
  both halves of a session, or the gate will resolve a different device than the build did
  and refuse the artifact.
- Working CocoaPods, for the prebuild stage — `pod --version`. *(If `brew install
  fastlane` ever upgrades Ruby and orphans CocoaPods' `ffi` gem, `brew reinstall
  cocoapods`.)*
- **Timing (measured, SDK 56 / Xcode 26.0.1):** ~14 min for the first build in a *fresh*
  worktree — it also pays the CNG prebuild and `pod install`; ~11 min if `app/ios/`
  already exists; **~35-75 s warm** thereafter. DerivedData is ~7.5 GB and keyed by
  project path, so each worktree pays its own cold build once. Use
  `npm run e2e:safety:clean` to see what that is costing and to reclaim it.
- The EAS fallback (`npm run e2e:safety:build:eas`) *does* still need `eas-cli` logged in
  (`npx eas whoami`), `fastlane`, and a clean tree, and takes 10–15 min every run.
- **eas-cli version (INFRA-351).** That fallback calls the **bare global** `eas`, whose
  version must satisfy `cli.version` in `app/eas.json` — `>=21.6.0 <22.0.0`, with the floor
  pinned in lockstep with `release.yml`'s `eas-version:` and asserted by
  `app/__tests__/scripts/eas-cli-version-lockstep.test.js` in CI. The bound is
  **enforceable, not advisory**: eas-cli *throws* rather than warns when its own version
  misses the range, so a stale global CLI fails the fallback outright. Fix with
  `npm i -g eas-cli@21.6.0`; `EAS_SKIP_CLI_VERSION_CHECK=1` steps outside it deliberately.
  **The default path is unaffected** — since INFRA-383 `e2e-sim-build.sh` runs
  `expo run:ios` and invokes no `eas` at all, so this cannot take the `/b-close`
  Phase 2.5 gate offline. (It could have before INFRA-383; that is precisely why
  INFRA-351 sat blocked from 2026-08-06 until the build moved off EAS.)

> ✅ **Resolved (INFRA-217): the sim flows skip the preamble via a seeded state.**
> The no-dev-client Release build boots/transitions slowly, and the long LegalGate
> + 16-question onboarding preamble in `_legal-and-onboarding.yaml` was too
> timing-fragile for consecutive ≥5/5. The robust fix shipped:
> **`EXPO_PUBLIC_E2E_SEED_ONBOARDED=true`** is declared in `eas.json`
> `build.e2e-sim.env` and applied to the build by `e2e-sim-build.sh`, which resolves that
> profile (following `extends`) and scopes the vars to the single build invocation rather
> than exporting them. It is deliberately never restated in the script — `eas.json` stays
> the one place the consent-auto-grant boundary is declared, and
> `__tests__/safety/e2eSeedGate.config.test.ts` pins both halves. This makes `App.tsx`
> seed post-onboarding state at launch
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

**A Release build escapes #1 and #4** (INFRA-383, correcting INFRA-216). The dev
launcher is compiled out of any Release configuration — see the callout above for
the mechanism and for how the earlier claim went wrong. LogBox is likewise gone on
Release (`__DEV__` false). `npm run e2e:safety:build` is the supported entry point
and now uses `expo run:ios --configuration Release`, rebuilding in ~1 min warm
instead of 10–15 min; `npm run e2e:safety:build:eas` keeps the old EAS path as a
rollback and as a re-measurable baseline after toolchain upgrades.

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
#
# INFRA-384: this one SKIPS the simulator pre-flight and the provenance check, and
# says so. Both describe the booted simulator's installed app, which is not what a
# device run executes — enforcing them here would abort the procedure when no sim is
# booted, and, worse, print "gate target verified / provenance" banners about an
# artifact the flow never touches. A device-only run therefore carries NO artifact
# attestation; install the build you mean to test, deliberately.
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

> ### ⚠️ First: is EVERY flow failing on its FIRST assertion?
>
> If a whole run dies at `_seeded-home` → `home-screen is visible ... FAILED`, **suspect an
> iOS system alert before you suspect the app.** iOS alerts render in a window ABOVE the app
> and above anything Maestro can dismiss — `launchApp: { clearState: true }` resets the
> *app*, not the window on top of it. The app renders perfectly behind the alert, so the
> failure looks like a content regression and Maestro's own error text even suggests
> "this could be a real regression".
>
> **Confirm it in one look:** open the failure screenshot in `~/.maestro/tests/<timestamp>/`.
> If an alert is on screen, that is your answer. `e2e-safety.sh` also greps that run's
> `commands-*.json` for system-alert strings and prints a named diagnostic (INFRA-407).
>
> **Clear it — no rebuild needed.** The app container and its provenance marker survive a
> reboot, so this does *not* cost you a build:
> ```bash
> xcrun simctl shutdown <udid> && xcrun simctl boot <udid>
> ```
>
> **Where it came from (INFRA-407).** `expo run:ios` builds, installs *and launches*, and its
> launch step opened `exp+being://expo-development-client/?url=…`. The app registers
> `being://`, not `exp+being://`, and a launcher-free Release build links no dev-launcher, so
> nothing handled it and iOS raised **`Open in "Being"?`** and left it up. The build now uses
> `--device generic --output` and installs with `simctl install`, so it never launches the app
> and never opens a URL. If a build ever leaves an alert again, that is a regression in
> `e2e-sim-build.sh`, not something to work around in a flow.
>
> **Do not** paper over this with a `tapOn: Cancel` in `_seeded-home.yaml`. It would silently
> no-op once the alert stops appearing, and then silently start tapping something real.
>
> **A flow can also raise one itself, and INFRA-407 did not close that source.** Observed
> 2026-08-12 on iPhone 17 Pro / **iOS 26.0**: `daily-loop-deeplink.yaml`'s `openLink:
> being://daily` raises `Open in "Being"?` on its own. Confirmed causal, not ordering — on a
> freshly rebooted sim the flow's own `_seeded-home` assertion passes (so no alert at start),
> `Open being://daily` completes, and the next assertion fails with the alert present twice
> in that command's captured hierarchy. The same flow is green on iPhone 16 Plus / **iOS
> 18.6** across 9 runs (2026-08-08 → 2026-08-12), so this is iOS-version-dependent, not a
> flow regression.
>
> Two consequences worth knowing before you debug a red suite:
>
> - It **persists after the flow that raised it**, so every *subsequent* flow in the same run
>   dies on its first assertion. The flow that looks broken is usually not the one at fault —
>   check whether an earlier flow in the run did an `openLink`.
> - It is therefore **structurally invisible to a scoped run**. `/b-close` Phase 2.5 runs only
>   the flows mapped to changed paths, so a single-flow gate can be green while the full suite
>   cannot pass. "Scoped gate green" does not mean the safety flows are fine.

> ### ⚠️ Second: does the failing STEP MOVE between runs? Erase the simulator (DEBUG-408)
>
> A simulator can rot. When it does, Maestro's XCUITest driver dies mid-flow and Maestro
> reports the aftermath as **`Element not found: Id matching regex: <whatever was next>`** —
> which is indistinguishable, in the console, from a real below-the-fold or missing-testID
> failure. Maestro's own error text will even offer *"This could be a real regression."*
>
> **The tell is that the failing step MOVES.** DEBUG-408 failed at `continue-button`, then
> `daily-loop-skip-breath`, then `nav-back-button` — three different elements on two
> different screens, same flow, same binary. A layout or testID defect is deterministic
> about *which* element it hides; a crashing driver fails wherever the crash lands.
>
> **Confirming it: do NOT just grep for `ConnectException`.** Every run has them. A clean
> 83-of-83 passing run contains **14** `Failed to connect to /127.0.0.1` lines; a run whose
> driver genuinely died contained **10**. By raw count the healthy run looks worse, so a
> grep-and-count rule fires on everything and ranks runs backwards. It is worse than no
> check, because the first time you use it on a green run you will conclude the signal is
> useless and stop looking.
>
> **The discriminator is the timestamp, not the count.** Driver startup polling is inherently
> *before* the first executed command. So: is there a connect error timestamped **after the
> first `COMPLETED`**?
>
> ```bash
> P=~/.maestro/tests/<timestamp>
> grep -m1 COMPLETED "$P/maestro.log"                          # first executed command
> grep 'Failed to connect to /127.0.0.1' "$P/maestro.log" | tail -1   # last connect error
> ```
>
> ```text
> healthy   first COMPLETED 16:28:33.490 | connect errors 16:28:27.049 → 16:28:32.750   all BEFORE
> dead      first COMPLETED 21:45:14.140 | connect errors 21:45:09.454 → 21:46:55.167   spans the run
> ```
>
> Errors confined to before the first `COMPLETED` are startup noise — look elsewhere for your
> failure. Errors *spanning* the run mean the driver died under you. This test also catches
> the silent variant below, because it never reads the verdict text.
>
> **It presents two ways, and only one of them is quiet.** Sometimes the `ConnectException`
> is recorded against the failing command in the artifact, with no `hierarchyRoot` on it —
> loud, and hard to misread. Sometimes it appears only elsewhere in the log while the
> verdict reads as a plain `Element not found` — silent, and the reason DEBUG-408 was filed
> as a layout bug. **Same root cause, two presentations**, so apply the timestamp test to
> *every* unexplained red, not only the ones that already look driver-shaped.
>
> ### Which of the two causes is it? The fix is different
>
> **Cause A — rotted simulator.** Fix by erasing. Nothing in the repo needs to change.
>
> ```bash
> xcrun simctl shutdown <udid> && xcrun simctl erase <udid> && xcrun simctl boot <udid>
> npm run e2e:safety:build   # the erase wipes the app AND its provenance marker
> ```
>
> **Cause B — another worktree was running Maestro at the same time.** `e2e-safety.sh` resets
> the driver between flows with `pkill -9 -f "test-without-building"`. That matches on a
> **pattern, not on ownership**, so it reaps every XCUITest driver on the machine, including
> ones belonging to another worktree's run. Erasing will not fix this and the sim was never
> at fault. Pinning separate simulators does not help either — the kill is machine-wide.
> Two `/b-close` runs overlapping is enough; observed 2026-08-12, one session's run died at
> command 57 of 83 when another started ~20 s later.
>
> ```bash
> # Is another Maestro ACTUALLY running? Empty == nobody; check BEFORE you blame the sim.
> ps -Ao pid=,comm=,args= | awk '$2 ~ /(^|\/)java$/ && /maestro\.cli\.AppKt/ {print $1}'
> ```
>
> **Do not use `pgrep -f 'maestro.cli.AppKt'` for this.** `-f` matches the pattern against
> every process's full command line, so it also matches any shell that merely *mentions* the
> string — including the wrapper running your own check. Claude Code executes Bash tool calls
> as `/bin/zsh -c '<command>'`, so the check reports itself as a live Maestro. Verified:
>
> ```text
> $ /bin/sh -c 'x="maestro.cli.AppKt"; sleep 6' &
> pgrep -fl :  90230 java … maestro.cli.AppKt test --device …     ← real
>              90462 /bin/sh -c x="maestro.cli.AppKt"; sleep 6    ← a mention, not a process
> ps identity: 90230 java                                          ← only the real one
> ```
>
> It is right when a human tries it interactively and wrong when it runs from a script or an
> agent, which is how it survives review. The failure direction is the bad one for a
> pre-flight: a false "someone else is running" means the operator doesn't run the gate at
> all. Require the executable to *be* `java`, as above. (Same defect class as the
> ownership-blind `pkill -9 -f` this section describes — the pattern-match shape has now been
> independently re-derived three times in this repo, so prefer the `ps` form anywhere you
> need to ask whether a process exists.)
>
> **A different driver port on each successive flow proves nothing** — every flow is its own
> `maestro test` invocation and starts its own driver, so the port always changes. An earlier
> draft of this callout offered that as the discriminator; it was measuring process startup,
> not process death. Use the timestamp test above.
>
> **Before you conclude the app regressed, run the flow on a second simulator.** DEBUG-408
> spent a full investigation on a "below the fold" hypothesis that three other devices —
> one *smaller in both dimensions* than the one in the flow's `SIM-VALIDATED` header —
> disproved in minutes. The device is an unpinned input (`e2e-sim-device.sh` enforces that
> exactly one simulator is booted, but pins no model and no iOS version), so "it fails on
> my machine" is never by itself evidence about the code.
>
> **Note the interaction with wall-clock UI.** A dying driver retries for tens of seconds,
> and any timer running in the app keeps running through those retries. In DEBUG-408 the
> daily loop's 30s breath auto-completed mid-retry and took `daily-loop-skip-breath` with
> it, producing a *second*, entirely genuine-looking "element not found" downstream of the
> real fault. Timer-gated steps amplify driver flakiness into what looks like an app bug.

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
