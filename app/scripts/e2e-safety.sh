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

# INFRA-405 — the same device resolution e2e-sim-build.sh uses. Shared rather than
# duplicated so "both scripts resolve identically" holds by construction. Note this file
# runs under a bare `set -u` (no -e, no pipefail), so every call below handles its own
# failure explicitly rather than relying on the shell to abort.
# shellcheck source=scripts/e2e-sim-device.sh
. "$(dirname "$0")/e2e-sim-device.sh"

# INFRA-423 — XCUITest driver ownership. Same sourced-helper contract as above: it sets no
# `set` options, because this file runs under a bare `set -u`.
# shellcheck source=scripts/e2e-driver-ownership.sh
. "$(dirname "$0")/e2e-driver-ownership.sh"

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

# INFRA-405 — resolve the simulator ONCE, and only for simulator runs.
#
# Why the gate needs this at all: `maestro test` chooses its own device when not told one
# (it will even fan out across N connected devices). So with 2+ booted, the pre-flight
# below could open device A's container, print "✓ gate target verified / ✓ provenance",
# and then maestro could drive device B. That is attesting one binary while testing
# another — verbatim the failure the block above says this pre-flight exists to prevent.
# Resolving here and passing the device to BOTH the container lookup and `maestro test`
# makes "verified this binary" and "ran against this binary" the same claim.
#
# Scoped under DEVICE_ONLY so the real-iPhone procedure gains no simctl dependency: with
# two simulators booted it would otherwise abort a documented manual run.
SIM_UDID=""
if [ "$DEVICE_ONLY" != "1" ]; then
  SIM_UDID="$(e2e_resolve_sim_device "safety gate")" || exit 1
fi

if [ "$DEVICE_ONLY" = "1" ]; then
  echo "📱 Device-only flow(s) selected — skipping the simulator pre-flight."
  echo "   This run carries NO artifact attestation: shape and provenance both describe"
  echo "   the booted simulator's app, not the device's. Run it against a real iPhone"
  echo "   with a build you installed deliberately."
elif APP="$(xcrun simctl get_app_container "$SIM_UDID" "$BUNDLE_ID" 2>/dev/null)" && [ -d "$APP" ]; then
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
  echo "⚠️  $BUNDLE_ID is not installed on simulator $SIM_UDID — run 'npm run e2e:safety:build' first." >&2
  exit 1
fi

fail=0
ran=0
timeouts=0
results=()
LAST_EVIDENCE_DIR=""

# DEBUG-392 — how long ONE maestro invocation may run before the gate calls it wedged.
#
# The failure: on 2026-08-08 `maestro test` sat ~80 minutes inside
# `Maestro.clearAppState` (Maestro.kt:93), emitted no verdict, and had to be `kill -9`'d.
# /b-close Phase 2.5 routes the merge decision on this script's exit status, so an
# unbounded invocation is a gate that can silently never report.
#
# 600s is derived from this machine's own corpus of 41 recorded runs of the longest flow
# (crisis-button-reachability): complete runs span 90-174s, and the worst run ever seen —
# a cold XCUITest driver install — took 288s. So the bound is 2.1x the worst honest run
# and cannot fire on a slow-but-real one, which is the half that matters: a bound that
# produces spurious reds trains re-run-until-green, which is precisely the reflex that
# let this defect sit. It still catches the observed wedge at 1/8 of its cost.
#
# One global number rather than a per-flow table on purpose: a per-flow table rots
# silently against flows that grow, and what is being caught is an order-of-magnitude
# outlier, not a margin call.
FLOW_TIMEOUT_S="${E2E_FLOW_TIMEOUT_S:-600}"

# INFRA-423 — reset the XCUITest driver(s) this run is entitled to kill.
#
# Supersedes DEBUG-392's `other_maestro_jvms()` skip-if-a-peer-is-live guard, which was a
# coarse proxy for ownership. Once ownership is exact the guard can only subtract, and it
# had become actively harmful in two directions: it was the mechanism that declined
# self-recovery, and on the observed steady state (two worktrees, one simulator) it
# suppressed EVERY reset across an 8-flow suite — reinstating the driver degradation
# INFRA-220 added the reset to prevent. Its JVM enumerator survives as
# `e2e_maestro_jvm_pids` in e2e-driver-ownership.sh, with a new job: input to the
# classifier rather than a reason to skip.
#
# Logging both outcomes is deliberate and is an acceptance criterion. The failure mode
# this work guards against is an over-narrow matcher that SILENTLY stops reaping — which
# on a quiet machine looks exactly like a healthy run. Saying "nothing was attributable"
# out loud is what makes that visible in the gate log instead of invisible.
#
#   $1 own_pgid — this run's process group ($child under `set -m`); "" at pre-flight,
#                 where nothing is ours yet and only orphans are in scope.
#   $2 phase    — human label for the log line.
e2e_reset_drivers() {
  _own_pgid="${1:-}"
  _phase="${2:-}"

  if [ -z "$SIM_UDID" ]; then
    # Device-only run: maestro drives a real iPhone and there is no simulator driver to
    # reset. Reaping on an empty UDID would match every driver on the machine.
    return 0
  fi

  _reap="$(e2e_drivers_to_reap "$_own_pgid" "$SIM_UDID" | tr '\n' ' ')"
  _peers="$(e2e_maestro_jvm_pids "$_own_pgid" | tr '\n' ' ')"

  if [ -n "$(printf '%s' "$_reap" | tr -d ' ')" ]; then
    echo "🧹 driver reset ($_phase) on $SIM_UDID — pid(s):$_reap"
    # shellcheck disable=SC2086  # deliberate word-splitting: an explicit pid list
    e2e_reap_pids $_reap
  else
    echo "ℹ️  driver reset ($_phase): nothing attributable to this run on $SIM_UDID."
  fi

  if [ -n "$(printf '%s' "$_peers" | tr -d ' ')" ]; then
    echo "   peer maestro JVM(s) live and PROTECTED:$_peers"
  fi
}

# INFRA-405: pin every flow to the device the pre-flight just attested. Empty for a
# device-only run, where maestro must be left to find the real iPhone.
MAESTRO_DEVICE_ARGS=()
if [ -n "$SIM_UDID" ]; then
  MAESTRO_DEVICE_ARGS=(--device "$SIM_UDID")
fi

# DEBUG-422 — pre-approve the URL scheme(s) the flows open, before flow 1.
#
# WHAT BREAKS WITHOUT THIS. `openLink:` is `xcrun simctl openurl` and nothing else (Maestro
# 2.6.0: SimctlIOSDevice.openLink -> LocalSimulatorUtils.openURL -> argv
# ["xcrun","simctl","openurl",<udid>,<url>]; Maestro contributes zero logic). On a simulator
# carrying no approval for that scheme, LaunchServices answers the open by asking SpringBoard
# to raise `Open in "Being"?` and WAITS for it. The alert renders above the app, so the flow
# that opened the link fails its next assertion — and because the alert outlives the flow,
# every LATER flow in the same invocation dies on its first assertion too. The flow that
# looks broken is not the one at fault.
#
# THE MECHANISM, since two work items guessed at it and both guessed wrong. It is a
# LaunchServices *scheme approval*, not a Maestro bug and not an app defect:
#
#   SpringBoard … Received request to activate alertItem:
#     <SBUserNotificationAlert; title: Open in "Being"?; source: lsd>
#
# `lsd` requests it, SpringBoard only presents it, and the string is
# SCHEME_APPROVAL_PROMPT_TITLE_NO_SOURCE in CoreServices.framework/…/SchemeApproval.strings
# (the _NO_SOURCE variant because a simctl open has no originating app). The answer is
# recorded per-simulator in Library/Preferences/com.apple.launchservices.schemeapproval.plist
# keyed `<source-bundle>-->{scheme}`, and it survives reboot, uninstall and reinstall. Only
# `simctl erase` — or a newly created device — clears it.
#
# IT IS NOT AN iOS-VERSION ISSUE, despite presenting as one twice. A freshly created iPhone
# 16 Plus / iOS 18.6 device raises it identically to a 26.0 device; a long-lived 18.6 sim
# only looked like a green "baseline" because it had been approved by hand. Version and
# model are both confounds. The single variable is whether this simulator has been approved.
#
# WHY SEEDING, AND NOT DISMISSING. A `tapOn:` on the alert is forbidden in a flow — it
# silently no-ops once the alert stops appearing, then silently starts tapping whatever is
# under those coordinates. A `defaults write` has no such failure mode in either direction:
# if a runtime ever stops honouring the key the alert returns and the flows go red, which is
# the safe direction, and if the prompt is ever retired the key is inert. It also retires a
# manual setup step that had to be remembered after every `simctl erase` — which is itself
# this guide's remedy for driver rot, so the two procedures were in direct tension and the
# gate lost that race silently.
#
# SCOPE IS DELIBERATELY NARROW, and the allowlist is DERIVED, not parsed. The flows decide
# *whether* an approval is needed; `app.json`'s `expo.scheme` decides *what* may be approved.
# A flow file is repo-authored text, so letting it name the scheme would let a typo — or a
# well-meaning future flow — silently seed an arbitrary one. Deriving from `expo.scheme`
# excludes `fyi.being.app` and `exp+being` by construction (both are CNG-generated, not
# authored) and agrees with the app's own security allowlist, DEEP_LINK_CONFIG
# .ALLOWED_SCHEMES, without having to restate it.
#
# `exp+being` is excluded ON PURPOSE and must stay excluded (crisis ruling, DEBUG-422).
# `exp+being://expo-development-client/?url=…` reaching a launcher-free Release build is the
# signature of the INFRA-407 regression — the build having LAUNCHED the app instead of
# build-only + `simctl install`. The build's launcher-free asserts catch a dev-client
# *binary*; they do not catch a correct binary launched with a dev-client URL, and this
# alert is currently the only observable for that. Approving it would convert a loud,
# already-diagnosed failure into a silent one.
#
# AND: a red deeplink flow is NEVER to be triaged by widening this. If a flow goes red with
# approval verified below, that is the app's contract failing, which is what the flow is for.
if [ -n "$SIM_UDID" ]; then
  # Selected flows plus the helper subflows they actually run — not the whole directory. A
  # scoped Phase 2.5 run (`q9-single-alert`, say) opens no link and must not be blockable by
  # a write it has no use for; but a helper CAN carry an `openLink`, so one level of
  # `runFlow:` is resolved rather than assumed empty.
  SCHEME_SCAN_FILES=("${FLOWS[@]}")
  while IFS= read -r sub; do
    [ -n "$sub" ] && [ -f "$MAESTRO_DIR/$sub" ] && SCHEME_SCAN_FILES+=("$MAESTRO_DIR/$sub")
  done <<EOF
$(grep -hoE '^[[:space:]]*-[[:space:]]*runFlow:[[:space:]]*[A-Za-z0-9._-]+\.yaml' "${FLOWS[@]}" 2>/dev/null \
    | sed -E 's#.*runFlow:[[:space:]]*##' | sort -u)
EOF

  FLOW_SCHEMES="$(grep -hoE '^[[:space:]]*-[[:space:]]*openLink:[[:space:]]*[A-Za-z0-9.+-]+://' \
    "${SCHEME_SCAN_FILES[@]}" 2>/dev/null | sed -E 's#.*openLink:[[:space:]]*##; s#://$##' | sort -u)"

  # `https` needs no approval — LaunchServices routes it to Safari, and a universal link is
  # deliberately not how these flows enter the app (it would put an AASA network fetch inside
  # a safety gate). Filtered rather than rejected so an https flow is simply a no-op here.
  FLOW_SCHEMES="$(printf '%s\n' "$FLOW_SCHEMES" | grep -vE '^(https?)$' || true)"

  if [ -z "$(printf '%s' "$FLOW_SCHEMES" | tr -d '[:space:]')" ]; then
    # Not a failure — the selected flows open no custom-scheme link. Said out loud anyway:
    # a matcher that silently stops matching looks exactly like a run with nothing to do
    # (same reasoning as INFRA-423's "nothing attributable" line).
    echo "ℹ️  scheme approval: no selected flow opens a custom-scheme link — nothing to approve."
  else
    APP_SCHEME="$(node -e 'process.stdout.write(String(require("./app.json").expo.scheme || ""))' 2>/dev/null || true)"
    if [ -z "$APP_SCHEME" ]; then
      echo "❌ e2e:safety pre-flight — could not read expo.scheme from app.json, so the set of" >&2
      echo "   schemes this gate is allowed to approve cannot be established. Refusing rather" >&2
      echo "   than falling back to a literal: the derivation IS the guard." >&2
      exit 1
    fi

    for scheme in $FLOW_SCHEMES; do
      if [ "$scheme" != "$APP_SCHEME" ]; then
        echo "❌ e2e:safety pre-flight — a selected flow opens '$scheme://', which is not the" >&2
        echo "   app's declared scheme ('$APP_SCHEME://' per app.json expo.scheme)." >&2
        echo "   This gate approves only the declared scheme, by derivation and never from the" >&2
        echo "   flow text. If '$scheme://' is legitimate, declare it; if it is 'exp+being', the" >&2
        echo "   build launched the app and that is an INFRA-407 regression to fix, not approve." >&2
        exit 1
      fi

      KEY="com.apple.CoreSimulator.CoreSimulatorBridge-->$scheme"

      # Idempotent and additive. This simulator is shared across worktrees, so device-wide
      # state we did not author is not ours to reset: read first, write only what is missing,
      # never `defaults delete` the domain or touch another key in it.
      CURRENT="$(xcrun simctl spawn "$SIM_UDID" defaults read com.apple.launchservices.schemeapproval "$KEY" 2>/dev/null | tr -d '[:space:]')"
      if [ "$CURRENT" = "$BUNDLE_ID" ]; then
        echo "✓ scheme approval already present: \"$KEY\" = $BUNDLE_ID"
        continue
      fi

      xcrun simctl spawn "$SIM_UDID" defaults write com.apple.launchservices.schemeapproval \
        "$KEY" -string "$BUNDLE_ID" 2>/dev/null || true

      # READ BACK. `defaults write` can exit 0 without the value landing where lsd will look
      # for it (domain resolution, cfprefsd caching), and an unverified write treated as
      # success is the same class of defect as attesting one binary while testing another.
      VERIFY="$(xcrun simctl spawn "$SIM_UDID" defaults read com.apple.launchservices.schemeapproval "$KEY" 2>/dev/null | tr -d '[:space:]')"
      if [ "$VERIFY" = "$BUNDLE_ID" ]; then
        echo "✓ scheme approval seeded: \"$KEY\" = $BUNDLE_ID (DEBUG-422)"
      else
        # FAIL CLOSED — and deliberately NOT via preflight_fail(), whose remediation line
        # says "rebuild the gate target". A rebuild cannot fix this and would send the next
        # reader down a 14-minute dead end. The cost this guard exists to remove is
        # MISDIAGNOSIS, not false-green: without approval every flow after the first
        # `openLink` fails its first assertion against a perfectly healthy app.
        echo "❌ e2e:safety pre-flight — could not seed the '$scheme://' scheme approval on $SIM_UDID." >&2
        echo "   Wrote \"$KEY\" = $BUNDLE_ID but read back '${VERIFY:-<nothing>}'." >&2
        echo "   Without it iOS raises \`Open in …?\` on the first openLink, it outlives that flow," >&2
        echo "   and every later flow fails on its first assertion while the app is fine." >&2
        echo "   This is NOT fixed by rebuilding. Check the simulator is responsive:" >&2
        echo "     xcrun simctl spawn $SIM_UDID defaults read com.apple.launchservices.schemeapproval" >&2
        exit 1
      fi
    done
  fi
fi

# INFRA-423 — PRE-FLIGHT reset, before flow 1.
#
# The reset used to exist only INSIDE the per-flow loop, so a driver left wedged by this
# session's own earlier crashed run survived untouched through the whole of flow 1 — the
# exact self-recovery case the reset exists for, and the one the old skip-if-live guard
# also declined. Narrowing the in-loop reap could never deliver it; the step simply was
# not there.
#
# Ownership is passed as "" here on purpose: at pre-flight nothing is ours yet (no `$child`
# exists), so only ORPHANS are in scope — drivers with no live maestro JVM parent. A peer
# mid-flow is protected by the same rule that protects it later.
e2e_reset_drivers "" "pre-flight"

for f in "${FLOWS[@]}"; do
  name="$(basename "$f" .yaml)"

  # A second wedge aborts the rest. 8 flows x a 600s bound is an 80-minute worst case,
  # which would reinstate the very problem the bound solves; and the wedge lives down in
  # CoreSimulator, which does not un-wedge on its own, so the remaining flows would emit
  # garbage reds rather than evidence.
  if [ "$timeouts" -ge 2 ]; then
    results+=("SKIPPED  $name  (aborted after $timeouts timeouts)")
    continue
  fi

  ran=$((ran + 1))

  # DEBUG-392 — evidence goes in a directory THIS invocation owns.
  #
  # ~/.maestro/tests/ is global, and this machine drives one booted simulator from
  # several worktrees at once. The pre-existing `ls -dt ~/.maestro/tests/*/ | head -1`
  # below could therefore select a NEIGHBOURING session's run, and adjudicating a merge
  # on someone else's green report is a laundered pass. A private dir also means a
  # missing report is unambiguous: nothing else could have written there.
  RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/e2e-safety-$name-XXXXXX")" || {
    echo "❌ could not create a private run directory — refusing to run on shared evidence." >&2
    exit 1
  }
  REPORT="$RUN_DIR/report.xml"
  DEBUG_DIR="$RUN_DIR/debug"
  mkdir -p "$DEBUG_DIR"

  echo "🛡️  [$ran] maestro test $f${SIM_UDID:+ (device $SIM_UDID)}  [bound ${FLOW_TIMEOUT_S}s]"

  # `${arr[@]+"${arr[@]}"}` — NOT a bare "${arr[@]}". This script runs under `set -u`, and
  # in the bash 3.2 that ships with macOS expanding an EMPTY array is an unbound-variable
  # error. Same hazard the FLOWS/results guard above exists for; a device-only run leaves
  # this array empty by design.
  #
  # `set -m` puts the child in its OWN process group so the watchdog can kill the group.
  # That matters: the wedge is not in the JVM, it is in the `xcrun simctl` the JVM
  # spawned. Killing only the JVM leaves CoreSimulator stuck and every later flow
  # meaningless.
  set -m
  maestro test ${MAESTRO_DEVICE_ARGS[@]+"${MAESTRO_DEVICE_ARGS[@]}"} \
    --format=JUNIT --output="$REPORT" \
    --debug-output="$DEBUG_DIR" --flatten-debug-output \
    "$f" &
  child=$!
  set +m

  # The watchdog writes a sentinel BEFORE killing, so "did we time out?" is answered by a
  # file rather than by guessing from an exit status — a maestro that dies on its own
  # signal would otherwise be indistinguishable from one we killed.
  #
  # /bin/sleep by absolute path, deliberately: a watchdog that a `sleep` earlier on PATH
  # can neuter is not a watchdog. (The suite's own stubs shadow `sleep`; the 8s driver
  # settle below is fine to shadow, this is not.)
  #
  # Two details here are load-bearing and were both found by the tests rather than by
  # reading:
  #
  #   >/dev/null 2>&1 — the watchdog must NOT inherit this script's stdout. A backgrounded
  #   `sleep` holding the write end of the pipe keeps it open after the script exits, so
  #   any caller reading our output (CI, a test harness, `npm run` itself) blocks until
  #   the sleep expires. On the happy path that is a stray 600s hang per flow, caused
  #   entirely by the machinery meant to prevent hangs.
  #
  #   set -m again — so the watchdog is its own process-group leader. Killing the subshell
  #   alone orphans the `/bin/sleep` inside it; killing the group reaps both.
  set -m
  (
    /bin/sleep "$FLOW_TIMEOUT_S" 2>/dev/null || sleep "$FLOW_TIMEOUT_S"
    : > "$RUN_DIR/.timed-out"
    kill -TERM -"$child" 2>/dev/null || kill -TERM "$child" 2>/dev/null
    /bin/sleep 3 2>/dev/null || true
    kill -KILL -"$child" 2>/dev/null || kill -KILL "$child" 2>/dev/null
  ) >/dev/null 2>&1 &
  watchdog=$!
  set +m

  wait "$child" 2>/dev/null
  rc=$?
  kill -TERM -"$watchdog" 2>/dev/null || kill -TERM "$watchdog" 2>/dev/null || true
  wait "$watchdog" 2>/dev/null || true

  timed_out=0
  [ -f "$RUN_DIR/.timed-out" ] && timed_out=1

  # The flow's authored title, passed as an alias so a JUnit generator that names the
  # testcase after `name:` rather than the filename does not read as another flow's report.
  flow_title="$(sed -n 's/^name:[[:space:]]*//p' "$f" | head -1 | tr -d '"')"
  VERDICT="$(node scripts/e2e-verdict.js adjudicate "$REPORT" "$name" "$flow_title" 2>/dev/null)" || true

  # PASS is a CONJUNCTION, never a precedence. Each source is one-directional evidence:
  # exit 0 proves the process finished, not that the assertions held; a clean report
  # proves what the assertions did, not that the process finished. Neither can vouch for
  # the other, so neither may override the other. Everything else is a refusal — and the
  # `${VERDICT:-…}` default matters because this script runs under `set -u` without `-e`,
  # so a failed `node` leaves VERDICT empty and empty must refuse.
  if [ "$timed_out" = "1" ]; then
    timeouts=$((timeouts + 1))
    # Report the per-command adjudication ALONGSIDE the timeout rather than instead of
    # it: an all-COMPLETED run that had to be killed is still not merge evidence, but
    # throwing away what it did complete would discard the diagnosis for no gain.
    results+=("TIMEOUT  $name  (no verdict in ${FLOW_TIMEOUT_S}s; report: ${VERDICT:-<none>})")
    LAST_EVIDENCE_DIR="$DEBUG_DIR"
    echo "⏱️  $name exceeded ${FLOW_TIMEOUT_S}s and was killed. Evidence: $RUN_DIR" >&2
  elif [ "$rc" -eq 0 ] && [ "$VERDICT" = "PASS" ]; then
    results+=("PASS  $name")
    rm -rf "$RUN_DIR"
  else
    if [ "$rc" -ne 0 ] && [ "$VERDICT" = "PASS" ]; then
      echo "⚠️  $name: the two verdict sources disagree — maestro exited $rc but its JUnit" >&2
      echo "   report is clean. That is a harness bug and deserves its own work item; it is" >&2
      echo "   never a green." >&2
    fi
    results+=("FAIL  $name  (exit=$rc, report: ${VERDICT:-<none>})")
    LAST_EVIDENCE_DIR="$DEBUG_DIR"
    fail=1
    echo "   Evidence kept: $RUN_DIR" >&2
  fi

  # Reset the XCUITest driver between flows so the next flow starts fresh
  # (docs/testing/e2e-maestro.md "driver wedged" note). ~8s lets it settle.
  #
  # INFRA-423 — reap by OWNERSHIP, never by pattern. `pkill -f "test-without-building"`
  # was blind to which worktree owned a driver, so it reaped every one on the machine.
  # DEBUG-392's skip-if-a-peer-is-live guard reduced how often that fired but not what it
  # targeted, and it declined the self-recovery case the reset exists for. The classifier
  # now decides per-process — see e2e-driver-ownership.sh for the ownership rules and the
  # live `ps` capture they were derived from.
  e2e_reset_drivers "$child" "between flows"
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

if [ "$timeouts" -gt 0 ]; then
  # A distinct exit code, because "the gate found a regression" and "the gate could not
  # run" are different facts. /b-close and a human triaging a red both need to tell them
  # apart — and a TIMEOUT is never something to shrug at and re-run, it means the harness
  # itself is in an unknown state.
  echo "❌ the gate could not complete: $timeouts flow(s) exceeded ${FLOW_TIMEOUT_S}s and were killed."
  echo "   This is NOT a pass and NOT an ordinary failure. The simulator is likely wedged;"
  echo "   restart it before re-running:  xcrun simctl shutdown all"
elif [ "$fail" -eq 0 ]; then
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
  # CLAUSE (c) IS NOW FALSE, and DEBUG-422 records why: that observation was made on an
  # UNHANDLED scheme. On a HANDLED one — `being://`, which app.json declares — the alert
  # reproduces on demand every time, on any simulator with no approval on record, from the
  # single command `xcrun simctl openurl <udid> being://daily`.
  #
  # (a) and (b) SURVIVE UNCHANGED, and this block stays exactly as it is. DEBUG-422 added a
  # SEEDER for one derived scheme, not a DETECTOR: it removes the one alert the gate can
  # legitimately pre-empt, and buys no probe for any other. This grep still owns everything
  # the seeder does not and must not cover — the notification-permission alert, and an
  # `Open in …?` raised by an `exp+being` dev-client URL, which is the INFRA-407 build
  # regression and must stay loud rather than be approved away.
  #
  # Reading Maestro's own failure artifact costs nothing and needs no output capture: it
  # writes the UI hierarchy AT THE POINT OF FAILURE into commands-*.json, which is exactly
  # where the alert was found.
  # DEBUG-392 — read THIS run's private dir, not `ls -dt ~/.maestro/tests/*/ | head -1`.
  # That selection could pick a neighbouring worktree's run on this machine, and an
  # explanation drawn from someone else's failure is worse than none.
  LATEST_ARTIFACT="$LAST_EVIDENCE_DIR"
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
    else
      # DEBUG-392 — only if INFRA-407 did NOT already explain this failure. Two
      # contradictory explanations for one red is worse than the single misdiagnosis
      # INFRA-407 exists to prevent, and a system alert also yields "the app is not
      # visible", so the two matchers can both fire on the same artifact.
      if [ "$(node scripts/e2e-verdict.js diagnose "$LATEST_ARTIFACT" 2>/dev/null)" = "DIAL_FALLBACK" ]; then
        echo "" >&2
        echo "🔎 The crisis button DIALLED 988 instead of navigating (DEBUG-392)." >&2
        echo "   openCrisisUrl's manual-dial alert was on screen when the assertion failed," >&2
        echo "   which only happens via RootCrisisButton's not-ready fallback: navigationRef" >&2
        echo "   was still not ready 400ms after the tap (NAV_READY_DEADLINE_MS), so it" >&2
        echo "   stopped waiting and dialled." >&2
        echo "" >&2
        echo "   This is NOT a flaky test. The user reached the dialer instead of" >&2
        echo "   CrisisResources, skipping the resource list, the safety plan and the" >&2
        echo "   text-line option. Confirm in the app log:" >&2
        echo "     xcrun simctl spawn ${SIM_UDID:-<udid>} log show --last 10m \\" >&2
        echo "       --predicate 'eventMessage CONTAINS \"navigator not ready at deadline\"'" >&2
        echo "   Evidence: $LATEST_ARTIFACT" >&2
      fi
    fi
  fi
fi

if [ "$timeouts" -gt 0 ]; then
  exit 2
fi
exit "$fail"
