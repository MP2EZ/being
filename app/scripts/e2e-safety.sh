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
#
# INFRA-384 — this script now also accepts EXPLICIT FLOW NAMES:
#
#     bash scripts/e2e-safety.sh                      # the tagged suite (merge gate)
#     bash scripts/e2e-safety.sh crisis-button-reachability q9-single-alert
#
# Why that matters more than it looks. `/b-close` Phase 2.5 Step 2.5.3 scopes the gate to
# PER-FLOW npm scripts (e2e:safety:q9 / :phq9 / :gad7 / :crisis-button), and those entries
# used to be bare `maestro test .maestro/<flow>.yaml`. They bypassed this file entirely —
# so INFRA-383's artifact-shape pre-flight, and anything else guarding evidence quality,
# never ran on the ONE path the merge gate actually takes. Routing every e2e:safety:* entry
# through here is what makes the pre-flight and the provenance check load-bearing rather
# than decorative. Keep it that way: a new per-flow npm script must call this script, never
# `maestro` directly.
set -u

cd "$(dirname "$0")/.." || exit 1 # -> app/ (npm already sets cwd=app; belt + suspenders)
MAESTRO_DIR=".maestro"

BUNDLE_ID="fyi.being.app"

# --- Flow selection: explicit args, else the tagged suite -------------------------------
# Deliberately BEFORE the pre-flight: which flows were asked for decides whether a booted
# simulator is even relevant. Checking the sim first would break the device-only flow.
FLOWS=()
if [ "$#" -gt 0 ]; then
  for arg in "$@"; do
    # Accept a bare name (`q9-single-alert`) or a path (`.maestro/q9-single-alert.yaml`).
    base="$(basename "$arg" .yaml)"
    case "$base" in
      _*)
        echo "❌ '$base' is a helper subflow, not a runnable flow" >&2
        exit 1
        ;;
    esac
    if [ ! -f "$MAESTRO_DIR/$base.yaml" ]; then
      echo "❌ no such flow: $MAESTRO_DIR/$base.yaml" >&2
      exit 1
    fi
    FLOWS+=("$MAESTRO_DIR/$base.yaml")
  done
else
  for f in "$MAESTRO_DIR"/[!_]*.yaml; do
    # Match a tag line that is exactly `- safety` (excludes `- safety-device-only`).
    grep -qE '^[[:space:]]*-[[:space:]]+safety[[:space:]]*$' "$f" || continue
    FLOWS+=("$f")
  done
fi

# Zero flows must never read as success. It also keeps `"${FLOWS[@]}"` and
# `"${results[@]}"` off an empty array, which is an unbound-variable error under `set -u`
# in the bash 3.2 that ships with macOS.
if [ "${#FLOWS[@]}" -eq 0 ]; then
  echo "❌ no flows selected — refusing to report success on an empty run." >&2
  echo "   (No \`safety\`-tagged flow found in $MAESTRO_DIR/, or the named flows resolved to nothing.)" >&2
  exit 1
fi

# --- Device-only detection --------------------------------------------------------------
# `crisis-988-dial` is tagged `safety-device-only` and is documented to be run by hand
# against a REAL iPhone, because the simulator's canOpenURL returns false unconditionally
# regardless of LSApplicationQueriesSchemes. Everything below this line reasons about the
# booted SIMULATOR's installed app, so applying it to a device run is worse than useless:
# with no sim booted it aborts a documented procedure, and with an unrelated sim booted it
# would print "✓ gate target verified / ✓ provenance" banners describing an artifact the
# flow is not running against. Attesting the wrong binary is precisely the failure this
# work item exists to remove, so detect the case and say plainly that no attestation applies.
DEVICE_ONLY=1
for f in "${FLOWS[@]}"; do
  grep -qE '^[[:space:]]*-[[:space:]]+safety-device-only[[:space:]]*$' "$f" || DEVICE_ONLY=0
done

# INFRA-383 — artifact-shape pre-flight, once, before any flow runs (<1s).
#
# Why this lives HERE and not only in e2e-sim-build.sh: that script's failure trap only
# covers failures the build process survives to handle. A `kill -9`, a crash, a reboot, or
# an operator running `npm run ios` or a manual `simctl install` between build and gate all
# defeat it. THIS is the only check that runs at the moment evidence is produced, so it is
# the load-bearing one. A launcher-bearing or Debug build must never reach a flow: it does
# not merely flake, it can pass by coincidence via the guessed-coordinate tap in
# _legal-and-onboarding.yaml, producing a green crisis-path gate that proves nothing.
if [ "$DEVICE_ONLY" = "1" ]; then
  echo "📱 Device-only flow(s) selected — skipping the simulator pre-flight."
  echo "   This run carries NO artifact attestation: shape and provenance both describe"
  echo "   the booted simulator's app, not the device's. Run it against a real iPhone"
  echo "   with a build you installed deliberately."
elif APP="$(xcrun simctl get_app_container booted "$BUNDLE_ID" 2>/dev/null)" && [ -d "$APP" ]; then
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
  # Both schemes, matching e2e-sim-build.sh's 7f. This checked only `tel` while claiming
  # in its own comment above to be "the load-bearing one" — and `sms` is the Crisis Text
  # Line path, so a build that lost it would have passed here.
  SCHEMES="$(plutil -extract LSApplicationQueriesSchemes json -o - "$APP/Info.plist" 2>/dev/null || true)"
  for scheme in tel sms; do
    case "$SCHEMES" in
      *"\"$scheme\""*) : ;;
      *) preflight_fail "the installed app's LSApplicationQueriesSchemes is missing '$scheme' — the 988 dial / Crisis Text Line path would fall back to a manual-dial alert" ;;
    esac
  done
  echo "✓ gate target verified: Release build, launcher-free, 988 dial scheme intact"

  # INFRA-384 — artifact LINEAGE, as distinct from the artifact SHAPE checked above.
  #
  # Shape says "this is a valid Release build". Lineage says "…of THIS tree". Without it a
  # green gate means only that some Being build passed, which is not what anyone reads it
  # as. Same container we already opened, so no extra cost.
  #
  # FAIL CLOSED. The `*)` arm deliberately catches MISMATCH, MISSING, an unknown schema,
  # AND the empty string — this script runs under `set -u` but NOT `set -e`/pipefail, so a
  # failed `node` invocation yields an empty VERDICT, and empty must refuse rather than
  # fall through. Never rewrite this as `if [ -f "$MARKER" ]; then compare; fi`: the
  # marker being absent is exactly the reinstall case worth catching.
  VERDICT="$(node scripts/e2e-provenance.js verify "$APP" 2>/dev/null)" || true
  case "$VERDICT" in
    MATCH_CLEAN)
      echo "✓ provenance: built from this exact tree, clean at build time"
      ;;
    MATCH_DIRTY)
      # AC3/AC4 are opposite policies over one implementation, selected by this knob.
      # /b-close sets it (what merges is the commit, so the binary must correspond to
      # one); a human iterating locally does not, and their flows still run.
      if [ "${E2E_REQUIRE_CLEAN_PROVENANCE:-0}" = "1" ]; then
        preflight_fail "the gate target was built from a DIRTY tree. A merge gate's evidence must correspond to the commit being merged. Commit your changes and rebuild: npm run e2e:safety:build"
      fi
      echo ""
      echo "  ╔══════════════════════════════════════════════════════════════════════╗"
      echo "  ║  ⚠️   DIRTY-TREE RUN — THIS RESULT IS NOT MERGE EVIDENCE              ║"
      echo "  ║                                                                      ║"
      echo "  ║  The binary matches your working tree, but that tree has uncommitted  ║"
      echo "  ║  changes. What merges is the COMMIT. Re-run against a clean tree      ║"
      echo "  ║  before treating a pass as a gate result.                             ║"
      echo "  ╚══════════════════════════════════════════════════════════════════════╝"
      echo ""
      ;;
    *)
      preflight_fail "provenance check returned '${VERDICT:-<no verdict>}' — the installed binary was not built from the current tree (or carries no marker). Rebuild: npm run e2e:safety:build"
      ;;
  esac
else
  echo "⚠️  $BUNDLE_ID is not installed on the booted sim — run 'npm run e2e:safety:build' first." >&2
  exit 1
fi

fail=0
ran=0
results=()

for f in "${FLOWS[@]}"; do
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

# A zero-flow run must never be laundered into a green. This script previously printed
# "all safety flows passed" and exited 0 when `ran` was 0 — vacuously true and read by
# /b-close as a passing gate. The selection guard above should make this unreachable;
# this is the assertion that keeps it that way if the loop ever gains a `continue`.
if [ "$ran" -lt 1 ]; then
  echo "❌ no flows actually ran — refusing to report success." >&2
  exit 1
fi

if [ "$fail" -eq 0 ]; then
  echo "✅ all safety flows passed"
else
  echo "❌ one or more safety flows failed"

  # INFRA-407 — name a system alert instead of letting it read as an app regression.
  #
  # An iOS system alert (SpringBoard-level) sits ABOVE the app and above anything Maestro
  # can dismiss: `launchApp: { clearState: true }` resets the app, not the window above it.
  # Every flow then fails on its FIRST assertion while the app renders perfectly behind the
  # alert, and Maestro's own error text suggests "this could be a real regression". That
  # misdiagnosis cost a full investigation cycle, including a rebuild and a bisect.
  #
  # WHY THIS DIAGNOSES RATHER THAN PRE-FLIGHTS. A blocking pre-flight was considered and
  # rejected: (a) the gate is ALREADY fail-closed here — an alert breaks every flow, so a
  # green run is not reachable with one up, and the harm was diagnosis, not false-green;
  # (b) the only probe available is a full `maestro hierarchy` dump, which costs ~25s on
  # every run and adds another way for an already-flaky harness to wedge; (c) the specific
  # "Open in …?" alert could not be reproduced on demand (`simctl openurl` on an unhandled
  # scheme fails silently rather than prompting), so a pre-flight's refusal path could not
  # have been demonstrated — and an undemonstrated guard is the shape this repo distrusts.
  #
  # Reading Maestro's own failure artifact costs nothing and needs no output capture: it
  # writes the UI hierarchy AT THE POINT OF FAILURE into commands-*.json, which is exactly
  # where the alert was found.
  LATEST_ARTIFACT="$(ls -dt "$HOME"/.maestro/tests/*/ 2>/dev/null | head -1 || true)"
  if [ -n "$LATEST_ARTIFACT" ]; then
    # Strings owned by iOS, not by this app. Deliberately narrow: matching something the
    # app itself renders would turn every ordinary failure into a wrong explanation, which
    # is worse than no explanation at all.
    if grep -qE '"(accessibilityText|text|title)"[[:space:]]*:[[:space:]]*"(Open in [^"]*|[^"]*Would Like to Send You Notifications[^"]*|Don.t Allow|Allow While Using App)"' \
         "$LATEST_ARTIFACT"/commands-*.json 2>/dev/null; then
      echo "" >&2
      echo "🔎 A system alert was on screen when this run failed (INFRA-407)." >&2
      echo "   iOS alerts render ABOVE the app and above anything Maestro can dismiss, so" >&2
      echo "   flows fail their first assertion while the app itself is fine." >&2
      echo "   Matched in: $LATEST_ARTIFACT" >&2
      grep -ohE '"(accessibilityText|text|title)"[[:space:]]*:[[:space:]]*"Open in [^"]*"' \
        "$LATEST_ARTIFACT"/commands-*.json 2>/dev/null | sort -u | sed 's/^/     /' >&2
      echo "   Clear it and re-run — the app container (and its provenance marker) survive:" >&2
      echo "     xcrun simctl shutdown <udid> && xcrun simctl boot <udid>" >&2
      echo "   If a BUILD put it there, that is a regression in e2e-sim-build.sh: since" >&2
      echo "   INFRA-407 the build must install via simctl and never launch the app." >&2
    fi
  fi
fi
exit "$fail"
