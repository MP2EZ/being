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

  It names a **simulator** only. The device-only flow (`e2e:safety:988-dial`) uses a
  separate `E2E_DEVICE_UDID`, deliberately — because you are told right here to export
  `E2E_SIM_UDID` for a whole session, a shared variable would hand a simulator UDID to the
  physical-device resolver and refuse a correctly-attached iPhone (INFRA-424).
- Working CocoaPods, for the prebuild stage — `pod --version`. *(If `brew install
  fastlane` ever upgrades Ruby and orphans CocoaPods' `ffi` gem, `brew reinstall
  cocoapods`.)*
- **Timing (measured, SDK 56 / Xcode 26.0.1):** ~14 min for the first build in a *fresh*
  worktree — it also pays the CNG prebuild and `pod install`; ~11 min if `app/ios/`
  already exists; **~35-75 s warm** thereafter. DerivedData is ~5-7 GB and keyed by
  project path, so each worktree pays its own cold build once. Use
  `npm run e2e:safety:clean` to see what that is costing and to reclaim it.
- **Orphaned DerivedData is the one that fills the disk (INFRA-435).** Removing a worktree
  does not remove its cache, and nothing reaped them, so they accumulated at roughly one
  per closed work item — observed at **119 GB across 24 `Being-*` directories against only
  5 live worktrees**, which surfaced as a build dying with `lipo: can't write to output
  file … (No space left on device)` and `xcodebuild` error 65. That message names the
  linker, not the disk. Reclaim with:

  ```bash
  npm run e2e:safety:clean:orphans            # list orphans + reclaimable total
  npm run e2e:safety:clean:orphans -- --yes   # reap them
  ```

  Orphanhood is keyed on the **worktree root**, never the `.xcworkspace` leaf: under CNG
  `app/ios/` is generated, and `e2e-sim-build.sh` deletes it for the duration of a
  `prebuild --clean`, so a leaf-keyed sweep would reap the shared gate worktree's own cache
  mid-build. A cache whose `WorkspacePath` is unreadable is reported as unknown and never
  reaped. `e2e-sim-build.sh` also refuses up front below `E2E_MIN_FREE_GB` (default 10)
  with a message naming **disk space**, so this never again presents as a linker error.
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

> **Operator rule (INFRA-434): do not replace the installed app while a suite is running.**
> The gate resolves and attests its target once at pre-flight, then runs for minutes.
> INFRA-436's per-UDID lock covers a peer's `npm run e2e:safety:build`, so that path now
> waits rather than trampling. It does **not** cover anything that never takes the lock:
> `npm run e2e:safety:build:eas` (zero lock acquisitions — it uninstalls and installs
> directly), `npm run ios`, Xcode Run, or a hand-run `xcrun simctl install` / `uninstall` /
> `erase`.
>
> Since INFRA-434 the gate re-reads its target's provenance marker between flows and after
> the last one, and **aborts with exit 3** if it changed or disappeared — distinct from
> exit 1 (a flow regression) and exit 2 (the harness could not complete). Every flow that
> had already finished is reported `VOID`, not `PASS`: a marker change bounds a window
> rather than an instant, so nothing that ran before it is evidence. When the marker was
> replaced rather than deleted, the abort names the replacing worktree's `repoRoot` and
> `branch`; an uninstall leaves no marker, so that case reports `VANISHED` with no
> attribution.

```bash
# Sim suite (currently 8 flows tagged `safety`, ~12 min) — runnable on iOS sim.
# The count is DESCRIPTIVE: the runner globs by tag, so adding a `safety`-tagged
# flow silently changes it. Verify with `grep -c 'safety$' app/.maestro/*.yaml`.
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
# device run executes — enforcing them here would print "gate target verified /
# provenance" banners about an artifact the flow never touches. A device-only run
# therefore carries NO artifact attestation; install the build you mean to test,
# deliberately.
#
# INFRA-424: it does NOT skip target resolution. That used to be bundled into the
# same sentence, and the bundling is what left this the only flow with no `--device`
# at all — so `maestro test` chose its own target and could attach to an arbitrary
# booted simulator, including one another worktree was mid-suite on. It now resolves
# a real iPhone and REFUSES rather than falling back:
#
#   exactly one eligible iPhone  -> pinned, flow runs
#   zero                         -> refuses, and says the 988 dial path is NOT verified
#   two or more                  -> refuses as ambiguous; name one with E2E_DEVICE_UDID
#   devicectl could not enumerate-> refuses, reported distinctly from "none attached"
#
# "Eligible" means platform iOS + deviceType iPhone + paired + a live tunnel. iPads and
# disconnected devices are excluded deliberately: a Wi-Fi iPad has no telephony, so
# canOpenURL('tel:') is legitimately false there and pinning one would produce a red
# that looks like a crisis-path regression and is not.
#
# The override is E2E_DEVICE_UDID, NOT E2E_SIM_UDID. They are separate on purpose —
# see the E2E_SIM_UDID note above, which tells you to export that one for a whole
# session; if the device resolver read it, that simulator UDID would refuse a
# correctly-attached iPhone.
npm run e2e:safety:988-dial        # 988 button does not show "Unable to Call" fallback (device-only)

# Two device-only + simulator flows in ONE invocation is REFUSED, not resolved — the
# two families need different hardware, and picking either one mislabels the result.
# Run them as two invocations.
```

`/b-close` Phase 2.5 automatically picks the scoped subset of flows based on changed paths — see CLAUDE.md Workflow Commands. `app.json` / `Info.plist` changes no longer trigger a Maestro flow: the jest static-config test in precommit catches `LSApplicationQueriesSchemes` regressions deterministically (INFRA-184).

## Run the gate on an UNCONTENDED machine (DEBUG-473)

The gate is single-*device* by construction (`e2e_resolve_sim_device` refuses when 2+ are
booted). It is not single-*machine-run*, and nothing enforces that — so two worktrees can
each resolve their own simulator, both pass the pre-flight, and still invalidate each
other's result by starving the host.

**Measured.** `crisis-button-reachability` at 402x874, one unchanged tree, Release build,
clean provenance:

| host state | flow wall-clock | verdict |
|---|---|---|
| idle (load ~3-5, 0 peer processes) | 1m57s, 5/5 | PASS |
| 2 peer Maestro drivers + 1 Xcode build (load 300-480) | 2m21s / 15m12s / **45m20s** | FAIL |

A single `scrollUntilVisible` iteration cost ~1.5s idle and up to 13.7s contended. Under
load the failing element **wandered** between `profile-card-export` and
`profile-card-delete` across runs of a byte-identical tree — which is the tell, because
geometry is deterministic about which element it hides and a budget is not.

**Why this matters beyond flakiness.** A contended red is indistinguishable from a layout
regression at the point of reading, and it invites a device-specific diagnosis that the
geometry does not support. DEBUG-473 was filed as a 402x874 fold defect on exactly that
basis; `maestro hierarchy` showed both cards 100% inside the fold.

**The gate now reports this itself (INFRA-476).** `e2e-safety.sh` prints a host reading at
pre-flight — after the INFRA-436 lock acquire and after the pre-flight driver reap, so the
figure is current and our own about-to-die orphans are not counted as someone else's load —
and repeats it beside the summary. Every verdict line also carries that flow's wall-clock,
so a 45-minute "pass" reads as untrustworthy rather than green:

```
🖥️  Host at gate start: load1 3.20 / 10 cpu (0.32x) · 0 peer maestro JVM · 0 peer driver · 0 other xcodebuild
    PASS  crisis-button-reachability  (1m57s)
```

**It WARNS and never refuses.** Same reasoning `e2e_warn_if_not_smallest_viewport`
documents: a pre-flight that refuses on a judgement the operator disagrees with trains the
`--skip-e2e` reflex the gate exists to prevent, and a false "someone else is running" means
the human does not run the gate at all — failing toward *not testing*, which DEBUG-392
recorded happening in this exact shape. Tune the threshold with
`E2E_HOST_LOAD_WARN_RATIO` (default `1.0`, i.e. load ≥ `hw.ncpu`). It is advisory reporting
only and takes no lock; INFRA-472 owns any actual lease.

To check by hand before starting a build, identify processes by executable, never by
command line — an `args` match also matches the shell that mentions it (DEBUG-392):

```bash
ps -axo comm= | awk '$0 ~ /(^|\/)(xcodebuild|java)$/'
```

Read that as *what else is running*, not as a verdict: it counts any unrelated Xcode build
or JVM on the machine, so a non-empty result is not proof a peer gate run is in progress.
**Use the single-column form.** Asking for `comm` and `args` in one `ps` invocation caps
`comm` at 16 characters, so `/Applications/Xcode.app/…/xcodebuild` arrives as
`/Applications/Xc` and matches nothing — the defect INFRA-476 fixed in
`e2e-driver-ownership.sh`, where it had silently disabled every xcodebuild matcher while
the `java` ones kept working because `java` is 4 characters.

Do not tune a flow's timeouts to survive a contended host. A machine slow enough to blow a
scroll budget is a machine on which that flow's crisis assertions — the ~10s `assertVisible`
standing in for the <3s 988 SLA, the 3000ms `notVisible: "Unable to Call"` windows — are not
trustworthy either. Contention must be **visible**, never absorbed: the run reports it
loudly and lets the operator decide, rather than failing closed on it.

## Which iOS runtime is a gate result allowed to be earned on? (INFRA-429)

**Decision: 18.6 is retired as a *gate* target and retained as a *triage* target.** The gate
runs against whichever single simulator is resolved. No runtime is pinned and none is refused.

**Validation record.** `npm run e2e:safety`, all 8 safety-tagged flows green in one
uninterrupted invocation on **iPhone 16 Plus / iOS 26.0** — a freshly created simulator with
no scheme approval and no driver history — clean-tree provenance, no reboot between flows
(2026-08-16, INFRA-429). This is the first full-suite result recorded on 26.x. The
per-device matrix lives in `daily-loop-quick-depth.yaml`; extend it, don't replace rows.

**Validation record — the SMALLEST supported viewport (DEBUG-477, 2026-08-18).**
`npm run e2e:safety` on **iPhone SE 3 / iOS 18.6 (375x667)**, a freshly created simulator,
Release build, clean-tree provenance `086d6139`, idle host: **7 of 8 green**. The eighth,
`daily-loop-quick-depth`, fails on `Element not found: Id matching regex: daily-loop-skip-breath`
— that is **DEBUG-468's** defect, whose fix is on `fix/DEBUG-468-daily-loop-skip-breath-fold`
and not yet on `development`. Every flow DEBUG-477 owns is green here.

This is the **first** full-suite result ever recorded at 375x667, and it matters more than the
count: the suite had never been run as a whole on this viewport, while `e2e-sim-device.sh`
actively directs operators to it and DEBUG-465 ruled the gate should be pinned to it. Do not
read the earlier 430x932 and 402x874 greens as covering it — two of the three flows that were
red here were red for reasons no larger viewport can exhibit.

**Why not "both runtimes must pass".** The version has never been the variable. Both prior
version-attributions in this repo were wrong and both resolved to simulator *state*: the
`Open in "Being"?` alert (DEBUG-422 — a fresh 18.6 sim alerts identically) and DEBUG-408's
iPhone 17 Pro / 26.0 failure (fixed by `simctl erase`). Two false signals, zero true ones.
Requiring both doubles the slowest gate in the repo, and a gate made slow enough is one
people learn to `--skip-e2e` past.

**Why not pin a runtime.** `e2e-sim-device.sh` only *resolves* among already-booted
simulators; it never boots one. A pin is therefore implementable only as a *refusal*, which
hard-fails on a machine whose sole booted simulator is 26.x — and `--skip-e2e` is a
`hotfix/*`-only bypass, so the operator's remaining options would be "boot a different sim"
or "don't merge". Fresh Xcode installs land on 26.x, so that population only grows.

**What "triage target" obliges.** Before concluding a red flow is a runtime difference rather
than an app regression, re-run it on the other runtime. That is not advice — it is the step
that disproved DEBUG-408's below-the-fold hypothesis in minutes, after a full investigation
had already accepted it.

**Residual risk, stated rather than hidden.** A reactive cross-version check catches 26.x
regressions that go *red* and misses any that go *false green*. The known instance is
`journal-crisis-scan.yaml`'s `hideKeyboard`: were a runtime to degrade it to a no-op, the
specificity assertions would pass without proving anything and nothing would turn red.
Measured on 26.0 for INFRA-429 and it is genuinely dismissing — hierarchy after `hideKeyboard`
contains no keyboard elements and no `journal-crisis-banner`, against a control with the
keyboard raised that shows nine. Closing the class rather than this instance would require
both-must-pass, and should be argued on that basis if it is ever revisited.

**Recorded since INFRA-478.** This used to say the runtime a green was earned on was not
recorded anywhere, leaving the hand-maintained flow headers as the only record. The gate now
derives and prints the resolved device's **model, iOS runtime and viewport** — on every
verdict line and in the run summary:

```
📱 Device: iPhone SE (3rd generation) / iOS 18.6 / 375x667
    PASS  crisis-button-reachability  (1m57s · 375x667)
```

Derived, not tabulated: `deviceTypeIdentifier` and the runtime key come from the
`xcrun simctl list devices booted -j` call the resolver already made and discarded, and the
viewport from the device type's own `profile.plist` (`mainScreenWidth`/`Height`/`Scale`). A
hand-kept model→points table is the thing that rots — every `375x667` and `430x932` figure
elsewhere in this repo is typed into a comment by hand.

The smallest-viewport check now keys on that **derived viewport** rather than on the
simulator's display name. The old `case` against the substring `"iPhone SE"` was wrong in
both directions: an iPhone SE 1st-gen (320x568) is genuinely smaller than the baseline and
silently satisfied it, while any renamed simulator defeated it. Both are pinned in
`app/__tests__/scripts/e2e-sim-device-attribution.test.js`.

**Still warn-only, and still not a pin.** The gate records which device it ran on; it does
not choose one. Choosing is **INFRA-486**, and it is deliberately separate: "pin to the
smallest model" and "never refuse because the device is large" are the same behaviour with
opposite verdicts, since the resolver consumes an already-booted simulator and never boots
one. That item is also blocked on a full **9-flow** SE 3 measurement that has never been run
— the 8-flow baseline predates `reconsent-stale.yaml`.

**Update (DEBUG-477, 2026-08-18):** `journal-crisis-scan` no longer uses `hideKeyboard`. The
false-green hazard described above is now pinned by a two-sided assertion on the keyboard
itself rather than trusted. See the next section.

## The swallowed tap: a mid-content swipe eats the next touch (DEBUG-477)

**The predicate, so you can recognise it without re-deriving it.** A Maestro
`scrollUntilVisible` whose swipe terminates **mid-content**, followed by a `tapOn`, loses
exactly **one** touch. The command reports `COMPLETED`; the app never receives it.

It is cleared by **any** prior touch, or by a scroll that terminates at a **content
boundary**. It is *not* cleared by time. `retryTapIfNoChange` cannot save you: the swallowed
tap nudges the list 1–3 pt, so Maestro sees "the hierarchy changed" and does not retry — the
defect defeats Maestro's own guard against it.

**Positive evidence, not inference.** The Profile `ScrollView` was temporarily instrumented
(`onScrollEndDrag` / `onMomentumScrollBegin` / `onMomentumScrollEnd`, plus `onPressIn` on the
card) with the counters rendered into the hierarchy so they could be read headlessly:

| point | `d` | `mb` | `me` | `pi` |
|---|---|---|---|---|
| after the scroll, before any tap | 1 | 1 | 1 | 0 |
| after the swallowed tap | 2 | 1 | 1 | 0 |

Momentum had already **begun and ended** before the tap, so the list was at rest by RN's own
accounting — this is not inertia. The tap incremented `onScrollEndDrag` (the ScrollView took
it as a zero-distance drag) and never fired `onPressIn`. `UIScrollView` consumed it.

**The probe table.** All on iPhone SE 3 / iOS 18.6 (375x667), Release, one flow each, idle
host. Nine observations; the model explains all nine.

| # | sequence | result |
|---|---|---|
| A/B | scroll DOWN to a mid-list card → tap → tap again | tap 1 does nothing, **tap 2 navigates** |
| C | same, `waitToSettleTimeoutMs: 6000` (honoured), one tap | **fails** — time is not the variable |
| D | scroll DOWN to card 2, scroll UP to card 1 (top boundary), tap card 1 | **passes** |
| E | DOWN → UP → DOWN to card 2, tap | fails |
| F | same as A but `centerElement: true` (centre y=300 not y=279) | fails — not position |
| G | DOWN past the card, UP back to it, tap | fails — not scroll direction |
| H | scroll, tap an **inert blank gap**, then tap the card | **passes** — not card-specific |
| I | scroll, tap `tab-profile` (outside the ScrollView), then tap the card | **passes**, offset survives |
| K | faster swipe: `speed: 60` → 0.401 s | fails. `speed: 100` → 0.001 s: the scroll itself fails |
| P | same-point `swipe` (a touch held for a stated duration) at 120 / 300 / 600 / 1200 ms | **all four fail** |
| P-ctl | same 120 ms touch, but with the swallow already absorbed by a prior tap | **passes** — so the primitive is valid and P's result is real |

**Which flows this can bite.** Only a flow that scrolls to a **mid-list** target and then taps
it. The suite's other card scrolls are immune by construction, and it is worth knowing why
rather than assuming they are lucky:

- `phq9-severe-completion` / `q9-single-alert` scroll to `take-phq9-button`, the **first**
  card, already 100% visible at offset 0 — **zero swipes**, so no swallowed touch.
- `crisis-button-reachability` uses `centerElement: true` + `visibilityPercentage: 100`
  throughout, which per DEBUG-453 drives those scrolls to **maximum scroll**, i.e. to a
  boundary.
- `journal-crisis-scan`'s `profile-card-voice-reflection` is the **last** card in the list, so
  its DOWN scroll *usually* terminates at the bottom boundary and the swallow does not
  reproduce — it passed 3/3 in isolation. **Do not read that as immunity.** The same site
  then failed in the Phase 2.5 gate, by a *different* mechanism: the scroll stopped short
  with the card at `[24,463][351,666]` while Maestro logged `Visibility Percent: 1.0`,
  because the ScrollView clip ends at y=583 and XCUITest keeps elements that are merely
  clipped. That is DEBUG-465's shape, not this one, and `centerElement: true` is its fix.
  **Two different defects can wear the same red on one line of a flow** — check the bounds
  before choosing a remedy, and do not let a handful of green runs stand in for that.

**Do not add the workaround to a flow that is green.** In particular do not add
`waitToSettleTimeoutMs` to `crisis-button-reachability`: it is spent per swipe iteration
*inside* the scroll's own timeout, and DEBUG-473 measured that flow's budget at 95% consumed
on an idle machine. Hardening a structurally immune flow at the cost of turning the suite's
most important flow red on a busy host is a net loss.

**The remedy, where it is needed:** an absorbing `tapOn` on an element-anchored target
*outside* the ScrollView, between the scroll and the real tap — `gad7-severe` re-taps
`tab-profile`, which is already the active tab. Comment it, because a bare extra tap on the
active tab reads as a copy-paste slip and will be tidied away otherwise.

**Open, and it is a close condition on DEBUG-477, not a curiosity — and probe P narrowed it
the wrong way.** Everything above shows the app never receives the touch. It does not show
that a *human's* first tap after a flick is delivered, and the obvious reassuring explanation
has now been tested and failed: **touch duration is not the variable.** A stationary touch
held for 120 ms — a normal human tap — is swallowed, and so are 300 ms, 600 ms and 1200 ms,
against a control proving the primitive activates the control when the swallow is
pre-absorbed. Position, gesture shape, card identity and elapsed time are all excluded too.

The only difference left between every probe here and a real finger is the **input producer**:
XCUITest synthesises on the automation path, while the Simulator's own trackpad input goes
through the simulated HID stack. That is a thinner reed than it looked, so treat "harness
artefact" as the *leading hypothesis with an untested premise*, not as established.

Verify by hand — it takes a minute and needs no tooling: open the Simulator on an iPhone SE 3,
go to Profile, flick the list so the GAD-7 card is mid-screen, and tap it **once**. Repeat five
times. If a human's first tap is also swallowed, that is an **app-side** defect reaching every
mid-list card in the app, it is P1, and it is tracked separately — the flow remedy above is
correct either way, which is why DEBUG-477 does not block on it.

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
> in that command's captured hierarchy.
>
> **CORRECTED 2026-08-13 (DEBUG-403 close-out) — it is NOT iOS-version-dependent.** This
> passage used to conclude that it was, from the same flow being green on iPhone 16 Plus /
> **iOS 18.6** across 9 runs (2026-08-08 → 2026-08-12). It reproduced **three times on that
> exact device and OS**, including standalone on a freshly-cycled sim.
>
> **It is a one-time per-simulator permission.** Tapping `Open` once turned the flow green
> with no code, flow, or build change, and the full 8-flow suite went green immediately
> after. The allowance then **survived a later rebuild + reinstall**, so only `simctl erase`
> wipes it — which is exactly what the 9 green runs and the two "iOS 26" failures have in
> common: state, not version. A long-lived sim has already been allowed; a freshly erased
> one has not.
>
> **NAMED AND AUTOMATED 2026-08-14 (DEBUG-422) — you no longer do anything about this.**
> `e2e-safety.sh` seeds the permission in its pre-flight on every run, so an erased or
> brand-new simulator is approved before flow 1 and the manual step below is retired. What
> follows is the mechanism, for whoever has to touch it next.
>
> It is a LaunchServices **scheme approval**. `openLink:` is `xcrun simctl openurl` and
> nothing else (Maestro 2.6.0: `SimctlIOSDevice.openLink` → `LocalSimulatorUtils.openURL` →
> `["xcrun","simctl","openurl",<udid>,<url>]`), so Maestro is not involved in the decision.
> `lsd` requests the alert and SpringBoard merely presents it — visible in the sim's own log:
>
> ```
> SpringBoard … Received request to activate alertItem:
>   <SBUserNotificationAlert; title: Open in “Being”?; source: lsd>
> ```
>
> The string is `SCHEME_APPROVAL_PROMPT_TITLE_NO_SOURCE` in
> `CoreServices.framework/…/SchemeApproval.strings` — the `_NO_SOURCE` variant because a
> `simctl` open has no originating app. This is why searching `SpringBoard.app` for the
> literal finds nothing. The answer is stored per-simulator at
> `data/Library/Preferences/com.apple.launchservices.schemeapproval.plist`, one key:
>
> ```
> "com.apple.CoreSimulator.CoreSimulatorBridge-->being" = "fyi.being.app"
> ```
>
> Verified 2026-08-14: it survives reboot, `stopApp` + `clearState` + `clearKeychain`, app
> uninstall and reinstall; only `simctl erase` or a newly created device clears it.
>
> **Reproduce it in one command**, on any simulator that has not been approved — which also
> retires the old claim that it could not be reproduced on demand (that observation was made
> against an *unhandled* scheme; `being://` is handled, declared at `app.json`):
>
> ```bash
> xcrun simctl openurl <udid> being://daily
> ```
>
> ⚠️ **The two remedies on this page used to be in direct tension, and that trap is now
> closed.** `simctl erase` is the fix for driver rot (next section) and is precisely what
> wipes this permission. Erase to clear a dead driver and your next run used to hit this
> alert — which the old text sent you off hunting as an iOS-26 issue on an iOS-18 device.
> Since DEBUG-422 the next `e2e-safety.sh` run reseeds it, so erase freely.
>
> **Why the gate seeds rather than dismisses, and why that is not the forbidden tap.** A
> `defaults write` is not a UI interaction, so it structurally cannot "silently start tapping
> something real"; it lives in the harness pre-flight rather than in a flow, so it asserts
> nothing about the app; and it fails in the safe direction — if a runtime stops honouring
> the key, or the prompt is retired, the alert returns and the flows go red. It gates
> *delivery* of the URL, not what the app does with it, so every contract these flows pin
> (`getSecureInitialURL`, `linkingConfig`'s `initialRouteName`, `isCrisisExemptPath`, the
> consent gate, the `?e2eSeed=ungranted` suppressor) is untouched.
>
> **The scope is derived, not parsed, and `exp+being` is excluded on purpose.** The flows
> decide *whether* an approval is needed; `app.json`'s `expo.scheme` decides *what* may be
> approved, so a flow file cannot name its own scheme. Approving `exp+being` would be a
> regression, not a convenience: `exp+being://expo-development-client/?url=…` reaching a
> launcher-free Release build is the *signature* of the INFRA-407 failure above, and this
> alert is currently the only observable for it.
>
> **A red deeplink flow is never triaged by widening the seed.** If a flow goes red with
> `✓ scheme approval seeded` in the log, that is the app's contract failing — which is what
> the flow is for.
>
> The prohibition above still stands and matters more now, not less: do **not** put
> `tapOn: "Open"` or `tapOn: "Cancel"` into `_seeded-home.yaml` or any other flow. The seed
> makes the alert rare, which is exactly the condition under which a stray tap sits dormant
> and then starts hitting something real.
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
> **Faster, from a SINGLE run: did Maestro print the element's BOUNDS?** The moving-step
> tell above needs several runs to establish. This one needs one log. On every `tapOn`
> Maestro logs the element it resolved, with pixel bounds, *before* acting:
>
> ```bash
> grep -a "Tapping on element" ~/.maestro/tests/<timestamp>/maestro.log | tail -3
> ```
>
> ```text
> Tapping on element: UiElement(… resource-id=continue-button,
>                     bounds=[20,478][410,534], enabled=true …)
> ```
>
> If that line exists for the element the run then reports as **not found**, the verdict
> contradicts the log: Maestro located it, printed where it was, tapped it, and died in the
> post-tap `waitForAppToSettle` (`IOSDriver.kt`). Below-the-fold and missing-testID are both
> falsified outright — you cannot print the bounds of an element you could not find. Observed
> on DEBUG-403's first gate run, where `bounds=[20,478][410,534]` on a 430x932 grid is
> mid-screen, nowhere near a fold.
>
> Cross-check the bounds against the viewport (`heightGrid` is in the same log,
> `Got device info: DeviceInfo(… widthGrid=430, heightGrid=932)`) before concluding a layout
> defect. **An element whose CENTRE is off-screen or under a reserved band is a real bug,
> not a dead driver** — Maestro taps centres, so it reports `COMPLETED` on a tap the app
> never receives. DEBUG-403 was exactly that: `begin-fresh-button` at `[56,730][374,785]`,
> centre y 757.5, against a content box ending at 756. Both shapes print bounds; the
> timestamp test below is what separates them.
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
> **Cause B — another worktree was running Maestro at the same time. FIXED in INFRA-423;
> kept because a run predating it, or a future regression, looks exactly like this.**
> `e2e-safety.sh` used to reset the driver between flows with
> `pkill -9 -f "test-without-building"`. That matches on a **pattern, not on ownership**, so
> it reaped every XCUITest driver on the machine, including ones belonging to another
> worktree's run. Erasing would not fix it and the sim was never at fault; pinning separate
> simulators did not help either, because the kill was machine-wide. Two `/b-close` runs
> overlapping was enough — observed 2026-08-12, one session's run died at command 57 of 83
> when another started ~20 s later.
>
> The reset now reaps an **explicit pid list** produced by `scripts/e2e-driver-ownership.sh`,
> which classifies each XCUITest driver on the resolved simulator by its **parent**:
>
> | Driver's parent | Verdict |
> |---|---|
> | our own process group (`$child` under `set -m`) | reap |
> | a **live** `maestro.cli.AppKt` JVM | **protect** — it is a peer, mid-flow |
> | gone (`ppid 1`) | reap — an orphan belongs to no live run |
> | live, but not a maestro JVM | protect — fail toward not-killing |
>
> Ownership is *attributable to a live maestro JVM*, not the device: two worktrees are
> routinely pinned to the **same** simulator, so a UDID is a device filter and never an
> owner. Reaping `test-without-building + $SIM_UDID` would have been the identical defect
> with a longer pattern.
>
> Two consequences worth knowing when you read a gate log. The reset also runs **pre-flight**,
> before flow 1, so a driver wedged by your own earlier crashed run is cleared rather than
> surviving into the first flow. And the gate prints the empty case out loud —
> `ℹ️ driver reset (…): nothing attributable to this run` — because the hazard with an
> ownership check is that it silently stops matching, which on a quiet machine is
> indistinguishable from a healthy run.
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
   # Reap only drivers with no live maestro JVM parent, on the sim you are using.
   # INFRA-423: do NOT reach for `pkill -9 -f "test-without-building"` — it is
   # ownership-blind and will reap a peer worktree's live driver too.
   ( cd app && . scripts/e2e-driver-ownership.sh \
       && pids="$(e2e_drivers_to_reap "" "<your-sim-udid>")" \
       && echo "reaping: ${pids:-<none>}" && e2e_reap_pids $pids )
   # then sleep ~8s and re-run
   ```
   Prefix with `E2E_DRIVER_REAP_DRY_RUN=1` to see what it would kill without killing it.
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
