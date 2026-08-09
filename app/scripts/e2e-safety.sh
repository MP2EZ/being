#!/usr/bin/env bash
#
# INFRA-220: run each `safety`-tagged Maestro flow as a SEPARATE maestro
# invocation with an XCUITest-driver reset between, instead of one batch
# `maestro test .maestro/ --include-tags=safety` invocation.
#
# Why: a single shared driver session degrades across the suite. By the 4th /
# longest flow (crisis-button-reachability) the accumulated lag makes
# `nav-back-button` over-pop the CrisisResources modal AND the underlying
# Profile-stack subscreen, landing on the Profile menu — where the next
# `profile-back-button` doesn't exist — so the flow desyncs and fails. The
# failure surfaced in the INFRA-217 /b-close gate; the longer the session, the
# likelier it is. Running each flow in its own invocation gives every flow a
# fresh driver, which runs reliably (>=5/5; cf. INFRA-217's 20/20 via the same
# per-flow pattern). See docs/testing/e2e-maestro.md.
#
# Flow selection mirrors the prior `--include-tags=safety`: every top-level
# (non-underscore-helper) flow tagged exactly `safety` runs; `safety-device-only`
# (crisis-988-dial) and `helper` flows are excluded. New `safety`-tagged flows
# are picked up automatically — no edit here needed.
set -u

cd "$(dirname "$0")/.." || exit 1 # -> app/ (npm already sets cwd=app; belt + suspenders)
MAESTRO_DIR=".maestro"

# INFRA-383 — artifact-shape pre-flight, once, before any flow runs (<1s).
#
# Why this lives HERE and not only in e2e-sim-build.sh: that script's failure trap only
# covers failures the build process survives to handle. A `kill -9`, a crash, a reboot, or
# an operator running `npm run ios` or a manual `simctl install` between build and gate all
# defeat it. THIS is the only check that runs at the moment evidence is produced, so it is
# the load-bearing one. A launcher-bearing or Debug build must never reach a flow: it does
# not merely flake, it can pass by coincidence via the guessed-coordinate tap in
# _legal-and-onboarding.yaml, producing a green crisis-path gate that proves nothing.
BUNDLE_ID="fyi.being.app"
if APP="$(xcrun simctl get_app_container booted "$BUNDLE_ID" 2>/dev/null)" && [ -d "$APP" ]; then
  preflight_fail() {
    echo "❌ e2e:safety pre-flight — $1" >&2
    echo "   Rebuild the gate target: npm run e2e:safety:build" >&2
    exit 1
  }
  [ -f "$APP/main.jsbundle" ] \
    || preflight_fail "the installed app has no main.jsbundle — it is a Debug/dev-client build, not the Release gate target"
  if otool -L "$APP/Being" 2>/dev/null | grep -qiE 'EXDevLauncher|EXDevMenu|expo-dev-'; then
    preflight_fail "the installed app links the Expo dev launcher"
  fi
  SCHEMES="$(plutil -extract LSApplicationQueriesSchemes json -o - "$APP/Info.plist" 2>/dev/null || true)"
  case "$SCHEMES" in
    *'"tel"'*) : ;;
    *) preflight_fail "the installed app's LSApplicationQueriesSchemes is missing 'tel' — the 988 dial path would fall back to a manual-dial alert" ;;
  esac
  echo "✓ gate target verified: Release build, launcher-free, 988 dial scheme intact"
else
  echo "⚠️  $BUNDLE_ID is not installed on the booted sim — run 'npm run e2e:safety:build' first." >&2
  exit 1
fi

fail=0
ran=0
results=()

for f in "$MAESTRO_DIR"/[!_]*.yaml; do
  # Match a tag line that is exactly `- safety` (excludes `- safety-device-only`).
  grep -qE '^[[:space:]]*-[[:space:]]+safety[[:space:]]*$' "$f" || continue
  name="$(basename "$f" .yaml)"
  ran=$((ran + 1))
  echo "🛡️  [$ran] maestro test $f"
  if maestro test "$f"; then
    results+=("PASS  $name")
  else
    results+=("FAIL  $name")
    fail=1
  fi
  # Reset the XCUITest driver between flows so the next flow starts fresh
  # (docs/testing/e2e-maestro.md "driver wedged" note). ~8s lets it settle.
  pkill -9 -f "test-without-building" 2>/dev/null || true
  sleep 8
done

echo ""
echo "──── e2e:safety summary (${ran} flow(s), isolated invocations) ────"
for r in "${results[@]}"; do echo "  $r"; done
if [ "$fail" -eq 0 ]; then
  echo "✅ all safety flows passed"
else
  echo "❌ one or more safety flows failed"
fi
exit "$fail"
