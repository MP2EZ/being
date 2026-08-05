#!/usr/bin/env bash
#
# INFRA-216 — build a NO-DEV-CLIENT Release simulator build and install it on the
# booted iOS sim. This is the canonical target for the Maestro safety-e2e gate.
#
# Why not `npm run ios` (dev build) or `expo run:ios --configuration Release`:
# `expo-dev-client` is a project dependency, so BOTH of those still link the Expo
# dev launcher ("DEVELOPMENT SERVERS" screen). The flows can only navigate that
# launcher by tapping a guessed coordinate, which flakes badly (INFRA-216). Only
# a build that EXCLUDES expo-dev-client removes the launcher — that's the EAS
# `e2e-sim` profile (developmentClient:false, simulator:true, Release), which is
# also what TestFlight/App Store users effectively get.
#
# Prereqs (one-time per machine):
#   - eas-cli logged in:        npx eas login   (npx eas whoami to check)
#   - fastlane:                 brew install fastlane
#   - cocoapods working:        pod --version    (brew reinstall cocoapods if broken)
#   - a booted iOS simulator
#
# NOTE (INFRA-216 follow-up): the no-dev-client build removes the launcher, but
# the long LegalGate+onboarding preamble in `_legal-and-onboarding.yaml` is still
# timing-fragile on the slower Release build. Reliable ≥5/5 needs the preamble
# hardening / seed-state work tracked as the INFRA-216 follow-up. This script is
# the validated build half of the fix.
#
# DEBUG-315 — this script is the Maestro safety gate's only evidence that the build under
# test is fresh, so it must fail loudly and must never install a stale artifact.
# `set -euo pipefail` was already here and does propagate exit codes; what it does NOT do
# is name the failing stage (a `set -e` death prints the tool's stderr and nothing else),
# and it cannot help at all when a stage "succeeds" without producing output. Hence the
# explicit per-stage checks below and the $OUT freshness handling.
set -euo pipefail

OUT="${TMPDIR:-/tmp}/being-e2e-sim.tar.gz"

fail() {
  echo "❌ e2e:safety:build failed at stage: $1" >&2
  exit 1
}

if ! xcrun simctl list devices booted | grep -qE '\(Booted\)'; then
  echo "❌ No iOS simulator booted. Open Simulator (or 'xcrun simctl boot <device>') first."
  exit 1
fi

# Remove any artifact left by a previous run BEFORE building. $OUT is a fixed path, so
# without this a build that exits 0 without writing output would silently hand the stale
# tarball to the extract+install stages below and report success (DEBUG-315).
rm -f "$OUT"

echo "🏗  Building no-dev-client Release simulator build via EAS (local, ~10–15 min)…"
echo "    profile: e2e-sim  ·  output: $OUT"
if ! eas build --local --profile e2e-sim --platform ios --non-interactive --output "$OUT"; then
  fail "EAS local build (profile e2e-sim). If EAS printed 'Commit all changes. Aborting...', commit or stash your changes — eas.json sets requireCommit:true."
fi

# Freshness assert. Combined with the rm -f above this makes the guarantee independent of
# eas's own exit code: if the artifact is not here, the build did not produce one, whatever
# it reported. Refusing here is what stops the gate testing a stale binary.
[ -f "$OUT" ] || fail "EAS build reported success but wrote no artifact to $OUT — refusing to install a possibly stale build"

WORK="$(mktemp -d)" || fail "scratch directory creation"
trap 'rm -rf "$WORK"' EXIT

if ! tar -xzf "$OUT" -C "$WORK"; then
  fail "artifact extraction ($OUT)"
fi

# `-print -quit` rather than `... | head -1`: under `pipefail` on macOS system bash 3.2,
# head closing early SIGPIPEs find, the pipeline returns 141, and the assignment killed the
# script before the friendly message below could ever print.
APP="$(find "$WORK" -maxdepth 2 -name '*.app' -type d -print -quit)"
if [ -z "$APP" ]; then
  fail "artifact extraction — no .app found in build output ($OUT)"
fi

echo "📲 Installing $(basename "$APP") on the booted sim (replacing any dev-client build)…"
# Deliberately tolerant: a fresh sim has nothing to uninstall, and that is not an error.
xcrun simctl uninstall booted fyi.being.app 2>/dev/null || true
if ! xcrun simctl install booted "$APP"; then
  fail "sim install ($APP)"
fi

echo "✅ No-dev-client build installed. The app now boots straight past the dev launcher."
echo "   Run flows:  npm run e2e:safety:<flow>   (or npm run e2e:safety)"
