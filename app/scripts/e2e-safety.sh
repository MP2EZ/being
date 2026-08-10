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

# --- Flow selection: explicit args, else the tagged suite -------------------------------
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
fi
exit "$fail"
