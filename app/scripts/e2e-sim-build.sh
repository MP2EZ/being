#!/usr/bin/env bash
#
# INFRA-383 — build the no-dev-client Release simulator app the Maestro safety gate runs
# against, using `expo run:ios` with an incremental DerivedData cache.
#
# Why not `eas build --local` (what this replaced): it cannot cache. eas-cli 19.0.8 skips
# the entire RESTORE_CACHE phase for local builds (`if (ctx.isLocal) return`, in
# @expo/build-tools/dist/builders/ios.js) and places derivedDataPath inside a per-run UUID
# temp dir that it deletes afterward, so every object file recompiles from zero on every
# invocation. There is no env var, eas.json field, or CLI flag that changes this.
# Measured: 11m08s cold, 1m03s warm. The EAS path is preserved as `e2e:safety:build:eas`.
#
# Why a plain Release build is a valid gate target — INFRA-216 said otherwise and was wrong.
# It claimed `expo-dev-client` links into any build because it is a project dependency.
# It does not: expo autolinking marks expo-dev-launcher/expo-dev-menu `debugOnly: true`, so
# `Pods-Being.release.xcconfig` never links them and ExpoModulesProvider.swift's Release
# branch of getReactDelegateHandlers() is an empty array. EAS's `developmentClient:false`
# only *defaults* buildConfiguration, and the e2e-sim profile sets Release explicitly, so
# the flag was unreachable — it never did the thing it was credited with.
# The likely misdiagnosis: INFRA-216's own documented verification command was
# `npm run ios --configuration Release`, which omits the `--` separator, so the flag went
# to npm rather than the script and it built Debug. Expect that failure mode to recur.
#
# WHAT THIS SCRIPT MUST GUARANTEE. Dropping EAS moves guarantees it supplied structurally
# into this file. Every one is a FALSE-GREEN vector — a gate that passes while testing the
# wrong binary — which is worse than a gate that fails, so each is asserted, fail-closed:
#
#   * Launcher-freeness (was `developmentClient:false`). A launcher build does not merely
#     flake; it can pass by coincidence via the guessed-coordinate tap in
#     _legal-and-onboarding.yaml, yielding a green crisis-path gate that proves nothing.
#   * Freshness (was `requireCommit` + the $OUT tarball assert). The hazard now is Xcode
#     deciding the React Native bundling phase is up to date and reusing a stale
#     main.jsbundle inside an otherwise-successful build. With --no-bundler there is no
#     Metro to notice. @expo/fingerprint CANNOT cover this — it does not hash app/src/**.
#   * CNG regeneration (was implicit — EAS prebuilt every build). `expo run:ios` prebuilds
#     ONLY when ios/ is absent (@expo/cli .../run/ensureNativeProject.js:40), so an
#     app.json edit with ios/ present silently yields a stale Info.plist. On this repo that
#     lands on LSApplicationQueriesSchemes — the 988 dial path.
#   * Fail-closed install. The previous script uninstalled AFTER the build, so a failed
#     build left the prior binary installed and /b-close Step 2.5.4's
#     `simctl listapps | grep fyi.being.app` greenlit flows against it. Uninstall now runs
#     FIRST and a trap re-runs it on any failure.
#
# The INFRA-329 clean-tree pre-flight is now a WARNING, not a hard stop (INFRA-384). It was
# only ever a stand-in for the `requireCommit` that vanished with EAS, and a blunt one — it
# forbade building from a dirty tree at all, taxing exactly the fast iteration INFRA-383's
# speedup existed to enable. The provenance marker (step 7g) replaced it with something both
# stronger and narrower: a dirty build is recorded as such, so e2e-safety.sh banners it as
# non-evidence and /b-close Phase 2.5 refuses it, while local iteration runs free. The
# relaxation landed in its own commit AFTER the marker, so the ordering is revertable.
#
# Prereqs: a booted iOS simulator. No eas-cli, no credentials, no fastlane.
# NEVER pipe this command (`| tee`, `| tail`) — a pipeline reports the LAST command's
# status, so a failed build reads as exit 0. Use `set -o pipefail` if you must capture.
set -euo pipefail

cd "$(dirname "$0")/.." || exit 1 # -> app/ (npm already sets cwd=app; belt + suspenders)

# INFRA-405 — shared device resolution, used identically by e2e-safety.sh. Sourced, so it
# must not set shell options (this script runs under `set -euo pipefail`, that one under a
# bare `set -u`).
# shellcheck source=scripts/e2e-sim-device.sh
. "$(dirname "$0")/e2e-sim-device.sh"

BUNDLE_ID="fyi.being.app"
PRODUCT_DIR="ios/build/Build/Products/Release-iphonesimulator"
CNG_STAMP="ios/.cng-stamp"
# CNG inputs: everything `expo prebuild` reads to generate ios/. app.json is the sole
# source of the generated Info.plist since INFRA-280 moved iOS to CNG.
CNG_INPUTS=(app.json package.json plugins patches)

BUILD_OK=0
# INFRA-405. Declared HERE, before the trap is armed at the bottom of this block: cleanup()
# references it, and under `set -euo pipefail` a trap body touching an unassigned variable
# aborts the very cleanup it exists to perform. Resolution happens at step 2 — before this
# script mutates any simulator state — so on every path where SIM_UDID is still empty,
# nothing has been installed and there is nothing to clean up.
SIM_UDID=""

fail() {
  echo "❌ e2e:safety:build failed at stage: $1" >&2
  exit 1
}

# Fail-closed: unless we reached the end with every assert green, the simulator must be
# left with NO fyi.being.app, so /b-close Step 2.5.4's readiness check fails rather than
# greenlighting flows against a stale or unverified binary.
# EXIT INT TERM, not just a non-zero exit: Ctrl-C during the assert block is precisely the
# window in which an unverified binary is installed.
cleanup() {
  # INFRA-405: uninstall from the device we actually installed to. This used the literal
  # `booted`, so on a multi-simulator machine the cleanup could target a different device
  # and silently miss — leaving a marker-less app behind, which e2e-safety.sh then refuses
  # while reporting a provenance problem rather than the build failure that caused it.
  if [ "$BUILD_OK" != "1" ] && [ -n "$SIM_UDID" ]; then
    xcrun simctl uninstall "$SIM_UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

# ---------------------------------------------------------------------------------------
# 1. Clean-tree pre-flight (INFRA-329). See header for why this stays.
# ---------------------------------------------------------------------------------------
IN_GIT_REPO=0
if REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  IN_GIT_REPO=1
  DIRTY="$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null || true)"
  if [ -n "$DIRTY" ]; then
    # INFRA-384 relaxed this from a hard stop. It was never the real guarantee — only a
    # stand-in for the `requireCommit` that vanished with EAS, and a blunt one: it forbade
    # building from a dirty tree at all, taxing exactly the fast iteration INFRA-383's
    # speedup existed to enable.
    #
    # The replacement is stronger AND narrower. The provenance marker records `dirty:true`,
    # so e2e-safety.sh banners the run as non-evidence and /b-close Phase 2.5 refuses it
    # outright (E2E_REQUIRE_CLEAN_PROVENANCE=1). Iterating locally is now free; MERGING on
    # a dirty-tree build is impossible. The old pre-flight could not make that distinction.
    echo "$DIRTY" >&2
    echo "⚠️  Building from a DIRTY tree. Flows will run, but this build is NOT merge" >&2
    echo "    evidence — the marker records it, and /b-close Phase 2.5 will refuse it." >&2
    echo "    Commit and rebuild before closing." >&2
  fi
else
  echo "⚠️  Not inside a git work tree — skipping the clean-tree pre-flight." >&2
fi

# ---------------------------------------------------------------------------------------
# 2. Resolve the target simulator — ONCE, here, before anything is mutated.
#
#    INFRA-405. This used to be a bare "is anything booted?" probe, with the actual UDID
#    resolved ~80 lines later at build time and the post-build asserts using the literal
#    `booted`. Two problems: the two selectors could name different devices, and a device
#    that boots MID-BUILD (observed — Simulator.app auto-boots without being asked) makes
#    any pre-build count check stale before it is used. Resolving once and reusing the
#    value is immune to both; re-querying `booted` at each step is not.
# ---------------------------------------------------------------------------------------
SIM_UDID="$(e2e_resolve_sim_device "gate build")" || fail "simulator selection"
echo "🎯 Target simulator: $SIM_UDID"

# ---------------------------------------------------------------------------------------
# 3. Uninstall FIRST. One bundle ID is shared with the dev-client build (`npm run ios`),
#    and `expo run:ios` installs over the top — so a differently-linked prior binary must
#    be removed rather than overwritten.
# ---------------------------------------------------------------------------------------
xcrun simctl uninstall "$SIM_UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------------------
# 4. CNG staleness -> prebuild. Conditional ON PURPOSE: an unconditional prebuild would
#    erase the ~1 min warm rebuild that is the entire point of this script.
# ---------------------------------------------------------------------------------------
NEEDS_PREBUILD=0
if [ ! -d ios ] || [ ! -f "$CNG_STAMP" ]; then
  NEEDS_PREBUILD=1
elif [ -n "$(find "${CNG_INPUTS[@]}" -newer "$CNG_STAMP" -print -quit 2>/dev/null)" ]; then
  NEEDS_PREBUILD=1
fi

if [ "$NEEDS_PREBUILD" = "1" ]; then
  echo "🧱 CNG inputs changed (or ios/ missing) — regenerating the native project…"
  # --clean, not a plain prebuild: a partial regeneration can leave plugin output from an
  # older app.json in place, which is the stale-Info.plist failure this stage exists for.
  npx expo prebuild --platform ios --clean || fail "expo prebuild"
  touch "$CNG_STAMP" || fail "CNG stamp write"
else
  echo "✓ Native project is current with app.json / plugins / patches — skipping prebuild"
fi

# ---------------------------------------------------------------------------------------
# 5. Destroy the prior product, then assert it came back (§ freshness). Same shape as the
#    DEBUG-315 `rm -f "$OUT"` + `[ -f "$OUT" ]` remedy this replaces. Object files live in
#    Intermediates/, so this forces a re-copy and re-bundle without losing incrementality.
# ---------------------------------------------------------------------------------------
rm -rf "${PRODUCT_DIR:?}"/*.app

# Record the wall-clock second the build started, rather than touching a marker file and
# using `[ x -nt y ]`. Bash's -nt compares st_mtime at ONE-SECOND granularity, so a bundle
# written in the same second as the marker is not "newer" and the assert would misfire on
# a fast build. Comparing epochs with -ge is granularity-safe: a genuinely stale bundle is
# from a previous build minutes or hours ago, never the same second.
BUILD_STARTED_AT="$(date +%s)"

# Portable mtime. Decide the dialect ONCE by probing, and probe with `-c` (GNU) rather
# than `-f` (BSD).
#
# The obvious `stat -f %m "$1" || stat -c %Y "$1"` is subtly broken on GNU and CI caught
# it: GNU's `-f` means --file-system and takes NO format argument, so `stat -f %m file`
# treats `%m` as a second FILE operand. It fails on that operand (non-zero, so the `||`
# fires) but STILL prints filesystem info for `file` — so both branches emit and the
# variable ends up multi-line, making `[ "$m" -ge N ]` an integer-expression error that
# `set -e` turns into a dead script. Every happy-path test went red on ubuntu-latest.
#
# Probing with `-c` has no such failure mode: BSD stat rejects `-c` outright.
if stat -c %Y . >/dev/null 2>&1; then
  mtime_of() { stat -c %Y "$1"; }   # GNU (ubuntu-latest, where the jest harness runs)
else
  mtime_of() { stat -f %m "$1"; }   # BSD (macOS, where the build actually runs)
fi

# ---------------------------------------------------------------------------------------
# 6. Build. Env is derived from the RESOLVED e2e-sim profile (following `extends`) so it
#    cannot drift from eas.json, and is scoped to this one invocation rather than exported
#    — the ambient shell must not carry a consent-seeding variable.
#    NODE_ENV is pinned because Expo's setNodeEnv is `process.env.NODE_ENV || mode`: an
#    inherited NODE_ENV=test would silently produce a dev-mode, non-inlined bundle.
# ---------------------------------------------------------------------------------------
ENV_ARGS=()
while IFS= read -r line; do
  [ -n "$line" ] && ENV_ARGS+=("$line")
done < <(node -e '
  const j = require("./eas.json").build;
  const merge = (n) => { const p = j[n] || {}; return { ...(p.extends ? merge(p.extends) : {}), ...(p.env || {}) }; };
  for (const [k, v] of Object.entries(merge("e2e-sim"))) console.log(`${k}=${v}`);
' 2>/dev/null) || fail "eas.json env resolution"

if [ ${#ENV_ARGS[@]} -eq 0 ]; then
  fail "eas.json env resolution — resolved profile e2e-sim to an empty env block"
fi

# (INFRA-405: device resolution used to happen here. It moved to step 2 — see the comment
# there. It is a pure query with no dependency on the intervening steps, and hoisting it is
# the entire fix: the value must be captured before the build, not re-derived during it.)

# Snapshot the tree HERE, immediately before bundling — not at step 1 (an `expo prebuild`
# can touch tracked files) and not at step 7g (too late by definition). The binary about to
# be produced corresponds to THIS tree; step 7g refuses to write a marker describing any
# other one. Empty on failure, which disarms the guard rather than failing the build — the
# marker write itself still fails closed.
TREE_BEFORE_BUILD="$(node scripts/e2e-provenance.js fingerprint 2>/dev/null || true)"

echo "🏗  Building Release simulator app (warm ≈1 min, cold ≈11 min)…"

# INFRA-407: BUILD ONLY, then install ourselves. Never let expo launch the app.
#
# `expo run:ios` builds, installs AND launches as one invocation, and its launch step ends
# by opening the dev-client deep link `exp+being://expo-development-client/?url=…`. The app
# registers `being://` (app.json `scheme`), not `exp+being://`, and a launcher-free Release
# build links no dev-launcher — so nothing handles that URL, iOS raises a SpringBoard-level
# "Open in 'Being'?" confirmation, and LEAVES IT ON SCREEN.
#
# Maestro's `launchApp: { clearState: true }` resets the APP; it cannot dismiss a SYSTEM
# alert above it. The alert therefore survives into the gate run, and every flow fails its
# first assertion (`_seeded-home` → `home-screen is visible`) while the app renders
# perfectly behind it — a maximally misleading red on the one check that gates safety
# merges, whose own error text suggests "could be a real regression".
#
# The gate never needs the app launched: every flow issues its own `launchApp`. So build to
# a directory and install with simctl — no launch, no URL open, no alert. `--device generic
# --output <dir>` is the documented build-only form (`expo run:ios --help`).
#
# The output goes OUTSIDE the worktree deliberately. The provenance fingerprint hashes
# untracked files, and while `git ls-files -o --exclude-standard` would hide a gitignored
# directory, keeping the artifact out of the tree entirely removes the question.
#
# (The step-7 comment below used to assert "there is no --no-install". That was wrong.)
#
# `--device generic` is what makes it build-only, so it REPLACES INFRA-405's
# `--device "$SIM_UDID"` here rather than conflicting with it: expo no longer chooses a
# device because expo no longer installs. INFRA-405's guarantee is preserved and in fact
# tightened — `$SIM_UDID` is now passed to the explicit `simctl install` below, so the
# device we resolved is provably the device we install to, with no "let expo pick" path
# left anywhere.
BUILD_OUT="$(mktemp -d "${TMPDIR:-/tmp}/being-e2e-build.XXXXXX")"
BUILD_CMD=(npx expo run:ios --configuration Release --no-bundler --device generic --output "$BUILD_OUT")

if ! env "${ENV_ARGS[@]}" NODE_ENV=production BABEL_ENV=production "${BUILD_CMD[@]}"; then
  rm -rf "$BUILD_OUT"
  fail "Release build (expo run:ios --device generic)"
fi

APP_SRC="$(/usr/bin/find "$BUILD_OUT" -maxdepth 2 -name '*.app' -type d 2>/dev/null | head -1)"
if [ -z "$APP_SRC" ]; then
  rm -rf "$BUILD_OUT"
  fail "build output — expo reported success but produced no .app under $BUILD_OUT"
fi

# Install to INFRA-405's resolved device, never the bare `booted` alias — `booted` is
# ambiguous with two simulators up. Since INFRA-407 split build from install, this is the
# single point at which anything reaches a simulator, so "the device we resolved" and "the
# device carrying the gate target" are now the same claim by construction.
if ! xcrun simctl install "$SIM_UDID" "$APP_SRC"; then
  rm -rf "$BUILD_OUT"
  fail "install — simctl could not install $APP_SRC onto $SIM_UDID"
fi
rm -rf "$BUILD_OUT"

# ---------------------------------------------------------------------------------------
# 7. Post-build asserts, all against the INSTALLED container — that is the artifact the
#    flows actually run, and the only thing whose correctness matters.
#
#    These run after install because the asserts are about the INSTALLED artifact, which is
#    what the flows execute. Since INFRA-407 the build and the install are separate steps
#    (`--device generic --output` + `simctl install`) rather than one atomic `expo run:ios`
#    invocation — the launch that used to come with it is what left a system alert on the
#    simulator. The post-condition is unchanged: any failure below exits non-zero via the
#    trap with NO app installed, so no gate consumer can ever observe a binary that failed
#    an assert.
# ---------------------------------------------------------------------------------------
APP="$(xcrun simctl get_app_container "$SIM_UDID" "$BUNDLE_ID" 2>/dev/null)" \
  || fail "artifact discovery — the build reported success but installed no $BUNDLE_ID on $SIM_UDID"
[ -d "$APP" ] || fail "artifact discovery — container path does not exist: $APP"

# 7a. main.jsbundle present. Strongest single signal: a Debug/dev-client build has none
#     (it loads from Metro), so this simultaneously proves Release-embedded and rules out
#     "points at a dev server".
BUNDLE="$APP/main.jsbundle"
[ -f "$BUNDLE" ] || fail "freshness assert — no main.jsbundle in the installed app; this is a Debug/dev-client build, not a Release one"

# 7b. …and it belongs to THIS run. Guards Xcode skipping the bundling phase and shipping a
#     stale bundle inside a successful build.
BUNDLE_MTIME="$(mtime_of "$BUNDLE")"
[ -n "$BUNDLE_MTIME" ] || fail "freshness assert — could not read main.jsbundle mtime"
[ "$BUNDLE_MTIME" -ge "$BUILD_STARTED_AT" ] \
  || fail "freshness assert — main.jsbundle is stale (predates this run); Xcode reused a previous bundle"

# 7c. Launcher-freeness, signal 1: dynamic linkage.
if otool -L "$APP/Being" 2>/dev/null | grep -qiE 'EXDevLauncher|EXDevMenu|expo-dev-'; then
  fail "launcher-free assert — the binary links the Expo dev launcher; the gate cannot run against a dev-client build"
fi

# 7d. Launcher-freeness, signal 2: embedded frameworks. `otool -L` lists DYNAMIC libraries
#     only, so a statically linked or embedded launcher would pass 7c.
if [ -d "$APP/Frameworks" ] \
  && [ -n "$(find "$APP/Frameworks" -maxdepth 1 \( -iname 'EXDevLauncher*' -o -iname 'EXDevMenu*' \) -print -quit 2>/dev/null)" ]; then
  fail "launcher-free assert — an Expo dev launcher framework is embedded in the app bundle"
fi

# 7e. Env parity. The e2e seed + flag string exist only in eas.json; .env.production
#     carries a COMPETING EXPO_PUBLIC_FEATURE_FLAGS that must not win, or the gate tests a
#     differently-flagged app than the one the flows were written against.
EXPECTED_FLAGS=""
for kv in "${ENV_ARGS[@]}"; do
  case "$kv" in EXPO_PUBLIC_FEATURE_FLAGS=*) EXPECTED_FLAGS="${kv#EXPO_PUBLIC_FEATURE_FLAGS=}" ;; esac
done
if [ -n "$EXPECTED_FLAGS" ]; then
  LC_ALL=C grep -aqF -- "$EXPECTED_FLAGS" "$BUNDLE" \
    || fail "env parity assert — the e2e-sim feature-flag string is absent from the built bundle; the flags the flows depend on are not the ones that shipped"
fi
if [ -f .env.production ]; then
  PROD_FLAGS="$(grep -E '^EXPO_PUBLIC_FEATURE_FLAGS=' .env.production 2>/dev/null | head -1 | cut -d= -f2- || true)"
  if [ -n "$PROD_FLAGS" ] && [ "$PROD_FLAGS" != "$EXPECTED_FLAGS" ]; then
    LC_ALL=C grep -aqF -- "$PROD_FLAGS" "$BUNDLE" \
      && fail "env parity assert — .env.production's feature-flag string won over the e2e-sim profile's"
  fi
fi

# 7f. Crisis config survived CNG regeneration. This is the runtime-artifact analogue of the
#     INFRA-184 static-config test, which reads app.json and therefore cannot see a stale
#     generated Info.plist. Without tel/sms, Linking.canOpenURL('tel:988') returns false and
#     CrisisResourcesScreen falls back to "Unable to Call" during a crisis.
SCHEMES="$(plutil -extract LSApplicationQueriesSchemes json -o - "$APP/Info.plist" 2>/dev/null || true)"
for scheme in tel sms; do
  case "$SCHEMES" in
    *"\"$scheme\""*) : ;;
    *) fail "crisis config assert — LSApplicationQueriesSchemes is missing '$scheme' in the built Info.plist (988 dial path would fall back to a manual-dial alert)" ;;
  esac
done

# 7g. Provenance marker (INFRA-384). LAST, after every assert above, so the marker's
#     presence means "this artifact passed every shape check AND came from this tree".
#     Written INSIDE the installed container: simctl mints a new container UUID on every
#     fresh install, so any reinstall (`npm run ios`, a manual simctl install) takes the
#     marker with it and e2e-safety.sh refuses. That disappearance IS the binding.
#     Before BUILD_OK=1, so a failure here still trips the cleanup trap's uninstall and
#     satisfies AC1's "marker absent after a failed or refused build" for free.
#     Outside a git work tree there is nothing to fingerprint, so no marker can exist.
#     That does NOT fail the build — INFRA-329 deliberately allows building outside a
#     work tree, and breaking that here would be an unrelated regression. It does mean
#     the artifact carries no lineage, so e2e-safety.sh will refuse it with MISSING.
#     Say so now rather than letting the refusal arrive minutes later, unexplained.
if [ "$IN_GIT_REPO" = "1" ]; then
  node scripts/e2e-provenance.js write "$APP" --expect "$TREE_BEFORE_BUILD" \
    || fail "provenance marker write (did the working tree change during the build?)"
else
  echo "⚠️  Not inside a git work tree — no provenance marker written." >&2
  echo "    This artifact is NOT usable as gate evidence; e2e:safety will refuse it." >&2
fi

BUILD_OK=1
echo "✅ Launcher-free Release build installed and verified."
echo "   launcher-free · fresh bundle · env parity · LSApplicationQueriesSchemes intact"
echo "   provenance marker bound to this tree"
echo "   Run flows:  npm run e2e:safety   (or npm run e2e:safety:<flow>)"
