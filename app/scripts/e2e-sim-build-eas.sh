#!/usr/bin/env bash
#
# ⚠️  FALLBACK PATH (INFRA-383). This is the ORIGINAL EAS-based gate build, kept runnable
# as `npm run e2e:safety:build:eas`. The default gate build is now `e2e-sim-build.sh`,
# which uses `expo run:ios --configuration Release` and rebuilds in ~1 min instead of
# 10-15. This file exists for three reasons:
#   1. Rollback, if the incremental path misbehaves mid-tranche.
#   2. Keeping the EAS timing baseline re-measurable after an SDK or Xcode upgrade.
#   3. Re-verifying EAS-vs-local artifact equivalence when the toolchain moves.
# Its header below still contains INFRA-216's claim that only the EAS e2e-sim profile can
# produce a launcher-free build. That claim is FALSE — see e2e-sim-build.sh's header for
# the three-part disproof. It is left here unedited as the historical record.
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

# INFRA-405 — shared device resolution (see scripts/e2e-sim-device.sh). This script never
# cd's, so the helper is located relative to the script itself rather than to $PWD.
# shellcheck source=scripts/e2e-sim-device.sh
. "$(dirname "$0")/e2e-sim-device.sh"

OUT="${TMPDIR:-/tmp}/being-e2e-sim.tar.gz"

fail() {
  echo "❌ e2e:safety:build failed at stage: $1" >&2
  exit 1
}

# INFRA-329 — clean-tree pre-flight. eas.json sets requireCommit:true, so a dirty tree was
# already fatal, but only ~30s in, after EAS's own startup prints a wall of output. This
# costs milliseconds and names the offending paths. It runs FIRST, before the booted-sim
# check, so it is observable on any machine rather than only on one with a sim running.
#
# There is deliberately NO bypass flag. This script is the safety gate's only evidence that
# the build under test is fresh (DEBUG-315), and a --allow-dirty escape hatch would exist
# purely to defeat that. The jest harness PATH-shims `git` instead.
if REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  # `status --porcelain` is repo-wide, so this inspects exactly the tree EAS packages,
  # including files outside app/. The bare-repo + worktrees layout is fine: --show-toplevel
  # resolves to the worktree root, not the bare repo.
  DIRTY="$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null || true)"
  if [ -n "$DIRTY" ]; then
    echo "$DIRTY" >&2
    fail "clean-tree pre-flight — commit or stash the changes above first. eas.json sets requireCommit:true, so the EAS build would abort with 'Commit all changes. Aborting...'."
  fi
else
  # git missing, or not a work tree. Not fatal: the pre-flight is a fast-fail convenience
  # and EAS still enforces requireCommit on its own.
  echo "⚠️  Not inside a git work tree — skipping the clean-tree pre-flight (EAS still enforces requireCommit)." >&2
fi

# INFRA-405 — resolve the target simulator once, exactly as e2e-sim-build.sh does.
#
# This path had the same defect and one worse instance of it: the install at the bottom of
# this file targets the literal `booted` with no UDID resolution anywhere, so on a machine
# with 2+ simulators booted it installs to whichever one simctl happens to pick, and
# e2e-safety.sh then attests a different device. The rollback path deserves the same
# guarantee as the primary one — a fallback you reach for under pressure is the worst place
# for a silent mis-target.
SIM_UDID="$(e2e_resolve_sim_device "EAS gate build")" || exit 1
echo "🎯 Target simulator: $SIM_UDID"

# Remove any artifact left by a previous run BEFORE building. $OUT is a fixed path, so
# without this a build that exits 0 without writing output would silently hand the stale
# tarball to the extract+install stages below and report success (DEBUG-315).
rm -f "$OUT"

echo "🏗  Building no-dev-client Release simulator build via EAS (local, ~10–15 min)…"
echo "    profile: e2e-sim  ·  output: $OUT"
if ! eas build --local --profile e2e-sim --platform ios --non-interactive --output "$OUT"; then
  fail "EAS local build (profile e2e-sim). The clean-tree pre-flight above already rules out the dirty-tree abort, so read the EAS output for the real cause (credentials, provisioning, Xcode/CocoaPods state)."
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

echo "📲 Installing $(basename "$APP") on simulator $SIM_UDID (replacing any dev-client build)…"
# Deliberately tolerant: a fresh sim has nothing to uninstall, and that is not an error.
xcrun simctl uninstall "$SIM_UDID" fyi.being.app 2>/dev/null || true
if ! xcrun simctl install "$SIM_UDID" "$APP"; then
  fail "sim install ($APP on $SIM_UDID)"
fi

echo "✅ No-dev-client build installed. The app now boots straight past the dev launcher."
echo "   Run flows:  npm run e2e:safety:<flow>   (or npm run e2e:safety)"
