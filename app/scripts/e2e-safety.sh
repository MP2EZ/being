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
