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

BUNDLE_ID="fyi.being.app"
PRODUCT_DIR="ios/build/Build/Products/Release-iphonesimulator"
CNG_STAMP="ios/.cng-stamp"
# CNG inputs: everything `expo prebuild` reads to generate ios/. app.json is the sole
# source of the generated Info.plist since INFRA-280 moved iOS to CNG.
CNG_INPUTS=(app.json package.json plugins patches)

BUILD_OK=0

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
  if [ "$BUILD_OK" != "1" ]; then
    xcrun simctl uninstall booted "$BUNDLE_ID" >/dev/null 2>&1 || true
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
# 2. Booted simulator
# ---------------------------------------------------------------------------------------
if ! xcrun simctl list devices booted | grep -qE '\(Booted\)'; then
  fail "booted-simulator check — open Simulator (or 'xcrun simctl boot <device>') first"
fi

# ---------------------------------------------------------------------------------------
# 3. Uninstall FIRST. One bundle ID is shared with the dev-client build (`npm run ios`),
#    and `expo run:ios` installs over the top — so a differently-linked prior binary must
#    be removed rather than overwritten.
# ---------------------------------------------------------------------------------------
xcrun simctl uninstall booted "$BUNDLE_ID" >/dev/null 2>&1 || true

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

UDID="$(xcrun simctl list devices booted -j 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    try {
      for (const v of Object.values(JSON.parse(s).devices || {}))
        for (const d of v) if (d.state === "Booted") { console.log(d.udid); process.exit(0); }
    } catch {}
    process.exit(1);
  });' 2>/dev/null)" || UDID=""

# Snapshot the tree HERE, immediately before bundling — not at step 1 (an `expo prebuild`
# can touch tracked files) and not at step 7g (too late by definition). The binary about to
# be produced corresponds to THIS tree; step 7g refuses to write a marker describing any
# other one. Empty on failure, which disarms the guard rather than failing the build — the
# marker write itself still fails closed.
TREE_BEFORE_BUILD="$(node scripts/e2e-provenance.js fingerprint 2>/dev/null || true)"

echo "🏗  Building Release simulator app (warm ≈1 min, cold ≈11 min)…"
BUILD_CMD=(npx expo run:ios --configuration Release --no-bundler)
[ -n "$UDID" ] && BUILD_CMD+=(--device "$UDID")

if ! env "${ENV_ARGS[@]}" NODE_ENV=production BABEL_ENV=production "${BUILD_CMD[@]}"; then
  fail "Release build (expo run:ios)"
fi

# ---------------------------------------------------------------------------------------
# 7. Post-build asserts, all against the INSTALLED container — that is the artifact the
#    flows actually run, and the only thing whose correctness matters.
#
#    These run after install because `expo run:ios` builds, installs and launches as one
#    atomic invocation (there is no --no-install). The post-condition is what matters and
#    it is preserved: any failure below exits non-zero via the trap with NO app installed,
#    so no gate consumer can ever observe a binary that failed an assert.
# ---------------------------------------------------------------------------------------
APP="$(xcrun simctl get_app_container booted "$BUNDLE_ID" 2>/dev/null)" \
  || fail "artifact discovery — the build reported success but installed no $BUNDLE_ID"
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
