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
set -euo pipefail

OUT="${TMPDIR:-/tmp}/being-e2e-sim.tar.gz"

if ! xcrun simctl list devices booted | grep -qE '\(Booted\)'; then
  echo "❌ No iOS simulator booted. Open Simulator (or 'xcrun simctl boot <device>') first."
  exit 1
fi

echo "🏗  Building no-dev-client Release simulator build via EAS (local, ~10–15 min)…"
echo "    profile: e2e-sim  ·  output: $OUT"
eas build --local --profile e2e-sim --platform ios --non-interactive --output "$OUT"

WORK="$(mktemp -d)"
tar -xzf "$OUT" -C "$WORK"
APP="$(find "$WORK" -maxdepth 2 -name '*.app' -type d | head -1)"
if [ -z "$APP" ]; then
  echo "❌ No .app found in build output ($OUT)"
  exit 1
fi

echo "📲 Installing $(basename "$APP") on the booted sim (replacing any dev-client build)…"
xcrun simctl uninstall booted com.being.app 2>/dev/null || true
xcrun simctl install booted "$APP"

echo "✅ No-dev-client build installed. The app now boots straight past the dev launcher."
echo "   Run flows:  npm run e2e:safety:<flow>   (or npm run e2e:safety)"
