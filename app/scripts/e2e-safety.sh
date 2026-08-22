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

# =========================================================================================
# THE EXIT ALPHABET (DEBUG-505) — normative. /b-close Step 2.5.5 routes the merge decision
# on these, and /b-batch reaches them one hop further out through the message /b-close
# prints. This block is where they are defined; every site below points here rather than
# restating the rule.
#
#   0  every selected flow passed
#   1  a Maestro flow was adjudicated RED — a regression in the branch under test
#   2  the harness could not complete — NO VERDICT was produced
#   3  the gate target was replaced mid-suite (INFRA-434); completed flows are VOID
#   4  NOT OURS — e2e-gate.sh's lease contention (INFRA-472). Never emitted here.
#
# THE INVARIANT: exit 1 has exactly ONE producer in this file, the terminal `exit "$fail"`,
# and `fail` is assigned 1 in exactly one place — the FAIL arm of the per-flow adjudication.
# Everything else that stops the run is 2 or 3.
#
# WHY IT MATTERS ENOUGH TO BE A RULE. Every non-1 fact that exited 1 produced the same
# /b-close message: "a Maestro safety flow FAILED — fix it, or on hotfix/* re-run with
# --skip-e2e." That is a false accusation against the branch WITH a pointer at the bypass,
# which is the reflex the whole safety-e2e design exists to prevent. The commonest case was
# the mildest fact in the file: the app simply not being installed yet on a fresh worktree.
#
# DO NOT propagate a callee's status. Both device resolvers carry private alphabets that
# collide numerically with this one — the resolver's 3 means "ambiguous selection", not
# "target replaced" — so a refusal collapses to a bare `exit 2` and never to `$?`.
# =========================================================================================
cd "$(dirname "$0")/.." || exit 2 # -> app/ (npm already sets cwd=app; belt + suspenders)

# INFRA-405 — the same device resolution e2e-sim-build.sh uses. Shared rather than
# duplicated so "both scripts resolve identically" holds by construction. Note this file
# runs under a bare `set -u` (no -e, no pipefail), so every call below handles its own
# failure explicitly rather than relying on the shell to abort.
# shellcheck source=scripts/e2e-sim-device.sh
. "$(dirname "$0")/e2e-sim-device.sh"

# INFRA-424 — the PHYSICAL-device equivalent of the above, for `safety-device-only` flows.
# Same sourced-helper contract: no `set` options, every call handles its own failure.
# shellcheck source=scripts/e2e-real-device.sh
. "$(dirname "$0")/e2e-real-device.sh"

# INFRA-423 — XCUITest driver ownership. Same sourced-helper contract as above: it sets no
# `set` options, because this file runs under a bare `set -u`.
# shellcheck source=scripts/e2e-driver-ownership.sh
. "$(dirname "$0")/e2e-driver-ownership.sh"

# INFRA-436 — simulator mutual exclusion. Complements ownership, it does not duplicate it:
# e2e-driver-ownership.sh decides which XCUITest drivers may be REAPED once a run is under
# way; this decides whether a run may START on this device at all. The gap it closes is a
# peer's e2e-sim-build.sh uninstalling fyi.being.app out from under the flows below.
# DEBUG-469 — Dynamic Type is a device-global, persistent input that nothing has ever
# asserted. A size left behind by an earlier run silently poisons every layout assertion
# here and in a peer worktree sharing this simulator.
# shellcheck source=scripts/e2e-content-size.sh
. "$(dirname "$0")/e2e-content-size.sh"

# shellcheck source=scripts/e2e-sim-lock.sh
. "$(dirname "$0")/e2e-sim-lock.sh"

# INFRA-476 — host contention is ADVISORY reporting, not exclusion. The lock above decides
# whether a run may start on this DEVICE; this only says whether the MACHINE is quiet
# enough for the result to mean anything. It warns and never refuses.
# shellcheck source=scripts/e2e-host-contention.sh
. "$(dirname "$0")/e2e-host-contention.sh"

# INFRA-490 — the host reading and each flow's wall-clock are written down rather than
# printed and dropped. Sourced explicitly rather than relied on transitively via
# e2e-sim-lock.sh: a reordering of the sources above should not silently stop the gate
# recording itself.
if [ -f "$(dirname "$0")/e2e-telemetry.sh" ]; then
  # shellcheck source=scripts/e2e-telemetry.sh
  . "$(dirname "$0")/e2e-telemetry.sh"
fi

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
        # DEBUG-505: the caller asked for a file that cannot be run. No flow started, so no
        # verdict exists. Fixing it is a one-word edit to the invocation, never to a flow.
        exit 2
        ;;
    esac
    if [ ! -f "$MAESTRO_DIR/$base.yaml" ]; then
      echo "❌ no such flow: $MAESTRO_DIR/$base.yaml" >&2
      # DEBUG-505: the closest call of the four invocation errors — a branch that renamed or
      # deleted a flow while /b-close's mapping still names it IS a branch fault. 2 still
      # wins, because this alphabet is defined by whether a VERDICT EXISTS, not by who is at
      # fault; and the exit-1 message tells the operator to debug a flow file that is not
      # there, while the exit-2 message tells them to look at the invocation.
      exit 2
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
  # DEBUG-505: two reachable causes with different characters — an explicit selection that
  # resolved to nothing (invocation error), and a bare tagged-suite run whose glob matched no
  # `safety`-tagged flow (a repo fact). They share the code because they share the fact this
  # alphabet keys on: zero flows ran, so there is no verdict either way.
  exit 2
fi

# --- Device-only detection --------------------------------------------------------------
# `crisis-988-dial` is tagged `safety-device-only` and is documented to be run by hand
# against a REAL iPhone, because the simulator's canOpenURL is reported to return false
# unconditionally regardless of LSApplicationQueriesSchemes. (That claim traces to
# INFRA-184 and has never been re-measured on iOS >= 26 — DEBUG-392 flagged it as
# unverified. It is stated here as the flow's premise, not as a checked fact. If it turns
# out to be stale the flow becomes sim-runnable, which is a one-line retag: the tag is the
# ONLY thing selecting which resolver runs below.)
#
# The SIMULATOR pre-flight below reasons about a booted simulator's installed app, so it
# cannot apply to a device run — its container lookup, otool/plutil shape checks and
# provenance marker are all simulator-container-bound.
#
# INFRA-424 — but "the simulator pre-flight does not apply" never implied "no target".
# That conflation is what left this the only flow running unpinned, free for `maestro test`
# to point at an arbitrary booted simulator. The two claims are now separated: the device
# path resolves and pins its own target (e2e-real-device.sh), and the run still declares
# that it carries NO artifact attestation — the target is named, the binary on it is not
# vouched for.
DEVICE_ONLY=1
DEVICE_ONLY_COUNT=0
for f in "${FLOWS[@]}"; do
  if grep -qE '^[[:space:]]*-[[:space:]]+safety-device-only[[:space:]]*$' "$f"; then
    DEVICE_ONLY_COUNT=$((DEVICE_ONLY_COUNT + 1))
  else
    DEVICE_ONLY=0
  fi
done

# INFRA-424 — a MIXED selection is refused, not resolved.
#
# The flag above is set only when EVERY selected flow carries the tag, which reads as
# conservative and is the opposite. A selection like
#
#     bash scripts/e2e-safety.sh q9-single-alert crisis-988-dial
#
# clears DEVICE_ONLY, so the sim pre-flight runs, prints "✓ gate target verified" and
# "✓ provenance" — and then the 988 DEVICE flow is pinned to that simulator and run against
# it. That is a guaranteed red on the crisis path underneath two green attestation banners
# describing a binary the flow never touched: false attestation reachable from a supported
# invocation, and strictly worse than the unpinned case this work item was filed for,
# because it comes with reassurance attached.
#
# There is no correct target for a mixed set — the two families need different hardware —
# so the only honest answers are "refuse" or "silently pick one and mislabel the result".
# Refuse. Both families still run; they just run as two invocations.
if [ "$DEVICE_ONLY" != "1" ] && [ "$DEVICE_ONLY_COUNT" -gt 0 ]; then
  echo "❌ mixed flow selection: $DEVICE_ONLY_COUNT device-only flow(s) alongside simulator flow(s)." >&2
  echo "   These need different targets — a \`safety-device-only\` flow requires a real iPhone," >&2
  echo "   and every other safety flow requires the attested simulator. Running them together" >&2
  echo "   would pin the device flow to the simulator and then print artifact-attestation" >&2
  echo "   banners describing a binary it never ran against." >&2
  echo "   Run them as two invocations instead:" >&2
  for f in "${FLOWS[@]}"; do
    if grep -qE '^[[:space:]]*-[[:space:]]+safety-device-only[[:space:]]*$' "$f"; then
      echo "     bash scripts/e2e-safety.sh $(basename "$f" .yaml)      # real iPhone" >&2
    fi
  done
  # DEBUG-505: this INVERTS DEBUG-496's recorded decision, which read "the invocation is
  # wrong, not the harness" and kept it at 1. Under this item's stronger rule the question is
  # not whose fault it is but whether a verdict exists, and here the refusal fires during
  # selection — before any flow starts — so `ran` is 0 by construction. Recorded explicitly
  # because a reader comparing the two commits would otherwise read it as drift.
  exit 2
fi

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
# INFRA-424 — DEVICE_UDID is a SEPARATE variable from SIM_UDID, and that separation is
# load-bearing rather than stylistic.
#
# The tempting shortcut is to assign the resolved device UDID to SIM_UDID, since the
# MAESTRO_DEVICE_ARGS block below already builds `--device` from it. That would be a silent
# regression: an EMPTY SIM_UDID is a SENTINEL, not merely an unset value. e2e_reset_drivers
# reads it as "device-only run, no simulator driver to reset" and returns early, and
# e2e-driver-ownership.sh fails closed on an empty UDID for the same reason. Populating it
# would re-enable XCUITest driver reaping during a real-device run, filtered by a
# physical-device UDID that INFRA-423's classifier was never designed to reason about — a
# UDID is a device filter and never an ownership signal. So the two stay separate, and
# e2e_reset_drivers is deliberately NOT taught about DEVICE_UDID.
SIM_UDID=""
DEVICE_UDID=""

# INFRA-434 — mid-suite substitution watch. Declared HERE, before the DEVICE_ONLY branch,
# because this script runs under `set -u`: a device-only run never reaches the simulator
# pre-flight that populates them, and an unset expansion later would be a hard error.
#
# INFRA-466 — the marker FILENAME is the ONLY thing retained. There is deliberately no
# cached absolute path: the container is re-resolved on every check, so a failed re-resolve
# has nothing stale to fall back to and must refuse. Storing the path made the guard's
# safety depend on an invariant living outside it ("every install mints a new container
# UUID, so a substituted binary deletes the old container and the stale read comes back
# empty") — true today, owned by simctl rather than by this repo, and load-bearing inside a
# guard whose entire job is to fail closed. Re-resolving makes the fallback impossible by
# construction instead of merely unreachable.
#
# GATE_MARKER_NAME staying EMPTY is also how the guard is scoped to the simulator path by
# construction rather than by an `if DEVICE_ONLY` test at each call site — a device has no
# container, so there is nothing to watch and nothing to claim. Same empty-string-as-
# sentinel discipline INFRA-424 established for SIM_UDID. The sentinel moved here from the
# retired path variable; it must stay the first test in e2e_assert_gate_target(), or a
# device-only run starts consulting xcrun for a container it does not have.
GATE_MARKER_NAME=""
GATE_MARKER_SNAPSHOT=""
GATE_TARGET_REPLACED=0
GATE_REPLACED_AT=""
GATE_REPLACED_KIND=""
GATE_REPLACED_BY=""

# DEBUG-496 — a resolution refusal is exit 2, and specifically NOT the resolver's own code.
#
# These two lines carried `|| exit 1`, which reported "a Maestro safety flow FAILED — this
# is a regression" for a machine with two simulators booted. It fired live during the
# MAINT-487 close on 2026-08-20: the resolver refused CORRECTLY, the branch was fine, and
# the gate blamed the branch. That red is the documented pressure that produces a reflexive
# `--skip-e2e`, so the mislabel costs more than its size suggests.
#
# Note what is NOT done here: the resolver's status is DISCARDED, deliberately. Both
# resolvers carry their own private alphabet (1 could-not-enumerate / 2 none-present /
# 3 ambiguous-or-bad-override) which collides numerically with this script's while meaning
# something unrelated — propagating a resolver 3 would announce INFRA-434's "a peer replaced
# the installed binary mid-suite" for what is actually "two simulators are booted". Every
# refusal arm is ONE fact here: no target, so no flow ran, so no verdict exists. That is 2.
# `|| exit 2` is therefore the whole fix; capturing the status would be a more elaborate way
# to be wrong.
if [ "$DEVICE_ONLY" != "1" ]; then
  SIM_UDID="$(e2e_resolve_sim_device "safety gate")" || exit 2

  # DEBUG-469 — refuse a non-default content size BEFORE taking the simulator lease, so a
  # misconfigured device fails fast instead of holding a shared resource. Exit 2, not 1:
  # content size is device-global host state a peer session or an earlier run can leave
  # behind, so it flattens a HARNESS fact (no valid verdict is producible — every layout
  # assertion would measure a text size the app does not ship) and is not a statement about
  # this branch. Blaming the branch here is exactly the reflexive-`--skip-e2e` pressure
  # DEBUG-496 removed from the resolver refusal one line above.
  e2e_assert_default_content_size "$SIM_UDID" || exit 2
else
  DEVICE_UDID="$(e2e_resolve_real_device "safety gate (device-only flow)")" || exit 2
fi

# INFRA-478 — describe the resolved device in THIS shell.
#
# The resolver already describes it internally (that is where the smallest-viewport warning
# gets its numbers), but it is invoked as `$(...)` above, so it runs in a SUBSHELL and every
# global it sets dies there. Re-invoking here is not redundancy: it is the only way the
# values reach the verdict lines and the summary below. Do not "optimise" this away, and do
# not try to return them through the resolver's stdout — its bare-UDID contract is consumed
# identically by e2e-sim-build.sh and e2e-sim-build-eas.sh.
E2E_SIM_DEVICE_LINE=""
if [ -n "$SIM_UDID" ]; then
  e2e_describe_sim_device "$SIM_UDID"
fi

# INFRA-436 — claim the simulator for the whole run, before the provenance/shape pre-flights
# below read the installed container. Reading the artifact is exactly what a peer's build
# would invalidate underneath us, so the lock has to precede it, not merely precede the flows.
#
# Simulator runs only. A device-only run resolves DEVICE_UDID instead, and is deliberately
# left unlocked for the same reason e2e_reset_drivers is not taught about it (see above): the
# contended resource here is a simulator this machine owns, whereas a physical handset is
# attached by a human who already knows they are using it.
#
# The trap releases on every exit path. e2e_lock_release is a no-op unless we are the
# recorded owner, so an early `exit 1` from a pre-flight that ran before the acquire cannot
# release a peer's lock.
if [ -n "$SIM_UDID" ]; then
  # DEBUG-496 — same flattening, found by the AC4 sweep rather than by chance. A lock the
  # gate cannot take means a peer holds the device (or the lock root is unwritable): no
  # flow ran, so this is 2. Reporting 1 blamed the branch for a machine that was busy.
  e2e_lock_acquire "$SIM_UDID" "${E2E_LOCK_TIMEOUT:-1800}" "safety flows" || exit 2
  trap 'e2e_lock_release "$SIM_UDID"' EXIT INT TERM
fi

if [ "$DEVICE_ONLY" = "1" ]; then
  # The target is now RESOLVED and PINNED, so this no longer says "skipping the pre-flight"
  # wholesale — that conflated two separable claims and only one of them is still true.
  # Naming the target and vouching for the binary are different claims: the artifact-shape
  # checks (otool/plutil on the container) and provenance lineage are simulator-container-
  # bound and remain unavailable for a device, so the NO-attestation warning stands in
  # substance even though the run is no longer unpinned.
  echo "📱 Device-only flow(s) selected — pinned to device $DEVICE_UDID."
  echo "   The simulator pre-flight does not apply: its shape and provenance checks describe"
  echo "   a simulator container, which a device does not have."
  echo "   This run therefore carries NO artifact attestation — the target is named, but the"
  echo "   binary on it is not vouched for. Install a Release build deliberately."
elif APP="$(xcrun simctl get_app_container "$SIM_UDID" "$BUNDLE_ID" 2>/dev/null)" && [ -d "$APP" ]; then
  # DEBUG-505 — ONE exit, EIGHT callers, decided individually. Recorded here rather than at
  # each call site because the decision is per FACT and the exit is shared; a note at each
  # `preflight_fail` line would restate one rule eight times.
  #
  #   caller                                          verdict  reason
  #   no main.jsbundle (Debug/dev-client build)        2        the installed artifact is not
  #                                                             the gate target; nothing about
  #                                                             the branch was measured
  #   links the Expo dev launcher                      2        same — artifact identity
  #   LSApplicationQueriesSchemes lost tel/sms         2        the most 1-flavoured arm, and
  #                                                             still 2: the SOURCE contract
  #                                                             has an owner that CAN say
  #                                                             "regression" (INFRA-184's jest
  #                                                             pin, in precommit). Here the
  #                                                             gate knows only that this
  #                                                             binary is not the attested one
  #   dirty tree under E2E_REQUIRE_CLEAN_PROVENANCE    2        "commit and rebuild" is an
  #                                                             evidence instruction; no flow
  #                                                             ran
  #   provenance MISMATCH / MISSING                    2        lineage, not behaviour
  #   marker filename unresolvable                     2        cannot watch → refuse to run
  #   marker verified then reads empty                 2        and explicitly NOT 3: 3 means
  #                                                             COMPLETED flows are VOID, and
  #                                                             here zero completed
  #
  # Deliberately NOT parameterised with an exit code. No caller wants a different one, and
  # the parameter would invite a future 1 back into this file.
  preflight_fail() {
    echo "❌ e2e:safety pre-flight — $1" >&2
    echo "   Rebuild the gate target: npm run e2e:safety:build" >&2
    exit 2
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
  #
  # INFRA-484 — the loop exists so a PEER's install can be recovered from ONCE, in place,
  # rather than sent back to a human. Everything else about the arms below is unchanged: a
  # refusal is still a refusal, and the recovery is reachable only from the `*)` arm. The
  # body keeps its original indentation on purpose, so the diff that added this loop shows
  # the loop rather than a re-indent of forty lines of load-bearing commentary.
  PROVENANCE_REGATED=0
  while :; do
  VERDICT="$(node scripts/e2e-provenance.js verify "$APP" 2>/dev/null)" || true
  case "$VERDICT" in
    MATCH_CLEAN)
      echo "✓ provenance: built from this exact tree, clean at build time"
      break
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
      break
      ;;
    *)
      # INFRA-436 — print WHAT moved before refusing. "Rebuild" alone costs up to 21m31s
      # of blind guessing, and under the gate-worktree workflow the same verdict covers two
      # unrelated causes (different commits vs. stray local files) whose fixes differ.
      # Diagnostic only: it always exits 0, so it can never soften the refusal below.
      node scripts/e2e-provenance.js explain "$APP" 2>/dev/null || true

      # INFRA-484 — AUTOMATIC SINGLE RE-GATE, on a peer-attributed mismatch only.
      #
      # `e2e-gate.sh` releases its leases on EXIT and this script acquires the simulator
      # lease when it starts, so inside /b-close nothing owns the device between the two
      # steps. A peer acquiring there builds and installs, and this pre-flight then refuses
      # against a binary the operator never chose. Measured at 4 of 28 flow-run attempts
      # over 19h (INFRA-490 telemetry, 2026-08-21): every contended flow-lease acquisition
      # ran zero flows, and every one of them had a peer's `gate build` as the prior holder.
      #
      # Why recovery and not one lease spanning gate -> flows: the same window shows 17 of
      # 18 spans already overlapping another session, median 14.5 min and worst 58.3. A
      # spanning lease would serialise every close on the machine, always, to remove a
      # failure that already fails closed. This is that span, paid only when a collision
      # actually happened.
      #
      # PEER only, and once. SELF is the operator's own edit and stays their call; NONE has
      # no attribution and must never be guessed at (INFRA-434's ruling, same reasoning).
      REGATE_ATTRIB="$(node scripts/e2e-provenance.js attribute "$APP" 2>/dev/null || true)"
      case "$REGATE_ATTRIB" in
        PEER\ *)
          if [ "$PROVENANCE_REGATED" = "1" ]; then
            preflight_fail "the gate target STILL does not match this tree after an automatic rebuild. Something is replacing it faster than the gate can rebuild it, or the rebuild is not producing this tree. Refusing to loop."
          fi
          case "${E2E_NO_AUTO_REGATE:-0}" in
            ''|0|false|no) ;;
            *) preflight_fail "provenance check returned '${VERDICT:-<no verdict>}' — a peer replaced the gate target, and E2E_NO_AUTO_REGATE is set. Rebuild: npm run e2e:safety:build" ;;
          esac

          PROVENANCE_REGATED=1
          echo ""
          echo "🔁 the gate target was replaced by ${REGATE_ATTRIB#PEER }"
          echo "   Nothing in this worktree moved — a peer built into the window between"
          echo "   this close's gate build and its flows. Rebuilding once, then continuing."
          echo "   ~90s warm; a cold DerivedData cache can reach 21m31s. Set"
          echo "   E2E_NO_AUTO_REGATE=1 to refuse instead."
          echo ""

          # The simulator lease is ALREADY ours and is held across the rebuild — that is
          # what makes this safe to automate. The child's own `e2e_lock_acquire "gate build"`
          # must inherit it rather than contend, or it would wait out E2E_LOCK_TIMEOUT
          # against its own parent. APPEND rather than assign: under an enclosing e2e-gate.sh
          # we are not the recorded owner, and dropping its token would strand the child.
          E2E_LOCK_INHERITED="${E2E_LOCK_INHERITED:-} sim:${SIM_UDID}:$$"
          export E2E_LOCK_INHERITED

          if ! bash scripts/e2e-sim-build.sh; then
            preflight_fail "the automatic rebuild FAILED after a peer replaced the gate target. Its output is above. Rebuild by hand: npm run e2e:safety:build"
          fi

          # Re-resolve, never reuse. A fresh install mints a NEW container UUID, so the
          # path captured before the rebuild names the directory the peer's binary was in.
          # Verifying that again would refuse forever, and — worse — a stale path that still
          # happens to exist would attest the wrong container.
          APP="$(xcrun simctl get_app_container "$SIM_UDID" "$BUNDLE_ID" 2>/dev/null)" \
            || preflight_fail "the rebuild reported success but the app container can no longer be resolved on $SIM_UDID."
          [ -d "$APP" ] \
            || preflight_fail "the rebuild reported success but the resolved container does not exist: $APP"
          continue
          ;;
      esac

      preflight_fail "provenance check returned '${VERDICT:-<no verdict>}' — the installed binary was not built from the current tree (or carries no marker). Rebuild: npm run e2e:safety:build"
      ;;
  esac
  done

  # INFRA-434 — snapshot the marker BYTES for the mid-suite watch below.
  #
  # Taken AFTER the case closes, deliberately: reaching here means the verdict was
  # MATCH_CLEAN or an accepted MATCH_DIRTY, so the marker provably exists and parses. An
  # empty read at THIS point is therefore an anomaly in its own right, not the ordinary
  # not-yet-built case the `else` branch below handles — hence preflight_fail rather than
  # a silent skip. Fail closed, same rule as the `*)` arm.
  #
  # Bytes, not a recomputed fingerprint: e2e-provenance.js's fingerprint() hashes untracked
  # file contents repo-wide, so re-verifying per flow would abort a suite whose binary never
  # moved the moment an operator saves a file. That is the half of the original reasoning
  # that survived.
  #
  # INFRA-466 — only the FILENAME is retained. `$APP` is used here to take the snapshot and
  # is then discarded; nothing outside this block ever holds a container path again. The
  # validation therefore targets the name rather than a composed path: empty means node
  # failed and the suite would run unwatched, and a value containing a slash means a path
  # has been smuggled back in, which is the shape this item removed. Both refuse.
  GATE_MARKER_NAME="$(node -e 'process.stdout.write(require("./scripts/e2e-provenance.js").MARKER_NAME)' 2>/dev/null || true)"
  case "$GATE_MARKER_NAME" in
    ""|*/*) preflight_fail "could not resolve the provenance marker filename from e2e-provenance.js — refusing to run an unwatched suite." ;;
  esac
  GATE_MARKER_SNAPSHOT="$(cat "$APP/$GATE_MARKER_NAME" 2>/dev/null || true)"
  if [ -z "$GATE_MARKER_SNAPSHOT" ]; then
    preflight_fail "the provenance marker verified a moment ago but reads empty now — the gate target is already moving. Rebuild: npm run e2e:safety:build"
  fi
else
  echo "⚠️  $BUNDLE_ID is not installed on simulator $SIM_UDID — run 'npm run e2e:safety:build' first." >&2
  # DEBUG-505: the likeliest of all eleven to fire in practice — a fresh worktree whose gate
  # target has not been built yet is a routine state, and it was reported as a crisis-flow
  # regression pointing at --skip-e2e. The arm also covers a FAILED get_app_container (empty
  # APP), which is unambiguously a lookup failure. Kept distinct from preflight_fail on
  # purpose: its remedy is the first build, not a rebuild.
  exit 2
fi

fail=0
ran=0
timeouts=0
results=()
# INFRA-493 — a THIRD outcome, deliberately not a fourth exit code. The alphabet is spent
# (0 pass / 1 regression / 2 harness / 3 target replaced) and both /b-close and e2e-gate.sh
# route on it, so the policy is carried by a verdict token and a receipt line instead.
uncertified=0
uncertified_flows=()
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
    #
    # INFRA-424 — this early return is why the resolved device UDID lives in DEVICE_UDID
    # and NOT in SIM_UDID. An empty SIM_UDID is the sentinel that selects this branch, so
    # assigning the device UDID to it (the obvious way to get `--device` for free from the
    # block below) would silently re-enable reaping for device runs. Do NOT teach this
    # function about DEVICE_UDID: e2e_drivers_to_reap classifies SIMULATOR XCUITest
    # drivers, a physical-device UDID means nothing to that classifier, and a UDID is a
    # device filter and never an ownership signal (INFRA-423).
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

# INFRA-434 — has the gate target been replaced since the pre-flight attested it?
#
# The pre-flight verifies ONCE and the flow loop then runs for minutes. INFRA-436's mutex
# closed the peer-`e2e:safety:build` case, but several replacement paths never take that
# lock: e2e-sim-build-eas.sh (no acquisition; uninstall+install), `npm run ios`, Xcode Run,
# a hand-run `xcrun simctl install`, a lock reclaimed as DEAD/RECYCLED, and a peer running
# with a different E2E_LOCK_ROOT. Any of those swaps the binary underneath a suite that
# then reports PASS about someone else's build.
#
# Returns 0 to continue, 1 to abort. Never exits directly — the caller owns the summary.
e2e_assert_gate_target() {
  # No marker to watch: device-only run, or no container. Nothing to claim either way.
  # MUST stay the first statement — before any xcrun — or a device-only run starts
  # consulting simctl for a container it does not have.
  [ -n "$GATE_MARKER_NAME" ] || return 0

  # DEBUG-432 — RE-RESOLVE the container before reading, because its path is NOT stable.
  # Verified on iOS 18.6, one simulator, one build, nothing else running: a single
  # `launchApp: { clearState: true }` moved the bundle —
  #     before  …/Application/F52767BD-…/fyi.being.app-1786869100818.app
  #     after   …/Application/EC9AA845-…/fyi.being.app-1786869250864.app
  # Maestro implements iOS clearState as an uninstall+reinstall and EVERY safety flow opens
  # with one, so a bound path is dead by the first command of the first flow. Binding one
  # made the read come back empty and reported a healthy suite as "vanished" — VOID, every
  # run, for every close reaching Phase 2.5. A gate that cannot return PASS is not a strict
  # gate; it is an outage that trains --skip-e2e.
  #
  # What is compared is UNCHANGED and still the marker's BYTES: the marker is
  # content-addressed (INFRA-436), so a peer's build swapped in underneath us carries a
  # different repoRoot/head/treeHash and still trips the replaced arm below, wherever the
  # container happens to live. Only "which file do I read" is resolved here — not "what
  # counts as substitution". Deliberately NOT a per-flow `e2e-provenance.js verify`: its
  # fingerprint() hashes untracked file contents repo-wide, so that would abort a suite
  # whose binary never moved the moment an operator saves a file.
  #
  # INFRA-466 — the re-resolve is now the ONLY source of the path, and a failed one is a
  # REFUSAL rather than a fallback. Previously this assigned into a cached GATE_MARKER only
  # on success, so a failed lookup left the pre-flight's path in place; if that container
  # was still readable the marker bytes matched and the guard returned 0, continuing on a
  # target it could not verify. Proven reachable in the harness: a container indirection
  # pointing at a missing directory fails the lookup while leaving the original container
  # and its marker intact, and the suite ran to completion reporting PASS.
  _app="$(xcrun simctl get_app_container "$SIM_UDID" "$BUNDLE_ID" 2>/dev/null || true)"

  if [ -z "$_app" ] || [ ! -d "$_app" ]; then
    # AC6 — a tightened arm converts a flaky lookup into an aborted suite, so it must say
    # WHICH of the two happened. Discriminating on simctl's stderr would be brittle; the
    # independent probe is e2e_booted_devices, which already separates "none booted" (exit
    # 0, empty) from "could not find out" (exit 1).
    #
    #   enumeration failed, or this simulator is no longer booted
    #     -> `unresolved`: the lookup itself is unavailable. Says nothing about the binary,
    #        so it is an aborted suite rather than a verdict about substitution.
    #   simulator still booted, app will not resolve
    #     -> `vanished`: a genuine uninstall, the meaning this kind has always carried.
    GATE_TARGET_REPLACED=1
    GATE_REPLACED_BY=""
    if _booted="$(e2e_booted_devices 2>/dev/null)" \
       && printf '%s\n' "$_booted" | grep -qx "$SIM_UDID"; then
      GATE_REPLACED_KIND="vanished"
    else
      GATE_REPLACED_KIND="unresolved"
    fi
    return 1
  fi

  _now="$(cat "$_app/$GATE_MARKER_NAME" 2>/dev/null || true)"

  if [ -z "$_now" ]; then
    # The container resolved but the marker is gone — an uninstall+reinstall that landed a
    # markerless build, an interrupted build, a Debug reinstall. There is no new marker, so
    # there is no repoRoot to name; refusing without attribution is correct here, and
    # inventing one would be worse.
    GATE_TARGET_REPLACED=1
    GATE_REPLACED_KIND="vanished"
    GATE_REPLACED_BY=""
    return 1
  fi

  if [ "$_now" != "$GATE_MARKER_SNAPSHOT" ]; then
    GATE_TARGET_REPLACED=1
    GATE_REPLACED_KIND="replaced"
    # Attribution is free: the marker already carries repoRoot and branch. Diagnostics must
    # never be able to fail the refusal, so every extraction defaults rather than erroring.
    _who="$(printf '%s' "$_now" \
      | sed -n 's/.*"repoRoot"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
    _br="$(printf '%s' "$_now" \
      | sed -n 's/.*"branch"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
    GATE_REPLACED_BY="${_who:-<unknown worktree>} (${_br:-<unknown branch>})"
    return 1
  fi

  return 0
}

# INFRA-405: pin every flow to the simulator the pre-flight just attested.
# INFRA-424: and pin a device-only run to the iPhone resolved above, rather than leaving
# maestro to choose. Exactly one of the two is set — the branch above resolves SIM_UDID or
# DEVICE_UDID and exits non-zero if it cannot — so the array is never empty on a successful
# run and the fall-through is unreachable by construction. It is kept as a refusal anyway:
# an empty --device list is the original defect, and it must not be reachable by a future
# edit that adds a third target class without noticing.
MAESTRO_DEVICE_ARGS=()
if [ -n "$SIM_UDID" ]; then
  MAESTRO_DEVICE_ARGS=(--device "$SIM_UDID")
elif [ -n "$DEVICE_UDID" ]; then
  MAESTRO_DEVICE_ARGS=(--device "$DEVICE_UDID")
else
  echo "❌ no target resolved — refusing to let maestro choose its own device." >&2
  # DEBUG-496 — a device-resolution refusal, so 2 like the two above. Bare rather than
  # `|| exit 1`, which is why the sweep had to be read for the FACT each exit reports and
  # not merely grepped for the idiom that first exposed it.
  exit 2
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
      # DEBUG-505: the derivation is the guard, so if it cannot be established there is
      # nothing to approve and no flow has started.
      exit 2
    fi

    for scheme in $FLOW_SCHEMES; do
      if [ "$scheme" != "$APP_SCHEME" ]; then
        echo "❌ e2e:safety pre-flight — a selected flow opens '$scheme://', which is not the" >&2
        echo "   app's declared scheme ('$APP_SCHEME://' per app.json expo.scheme)." >&2
        echo "   This gate approves only the declared scheme, by derivation and never from the" >&2
        echo "   flow text. If '$scheme://' is legitimate, declare it; if it is 'exp+being', the" >&2
        echo "   build launched the app and that is an INFRA-407 regression to fix, not approve." >&2
        # DEBUG-505 — the hardest call of the eleven: this arm collapses two facts. A
        # repo-authored flow naming an undeclared scheme is a branch fault; `exp+being`
        # means the BUILD launched the app, a harness fault (INFRA-407). Both are "the gate
        # refuses to approve", never "the crisis path failed". 1 was considered and rejected
        # — the loud diagnostic above is what fixes this in ten seconds and is unchanged;
        # 1-vs-2 changes ROUTING, not visibility.
        exit 2
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
        # DEBUG-505: cfprefsd or domain resolution on an unresponsive simulator. The block's
        # own comment above already says this is NOT fixed by rebuilding — it is a machine
        # fact, and no flow has run.
        exit 2
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

# INFRA-476 — host contention, reported once, immediately before the first flow.
#
# Placement is load-bearing and both halves are deliberate. AFTER the INFRA-436 lock
# acquire, which can block up to 1800s and would make an earlier reading stale by the time
# a flow runs. AFTER the pre-flight reap, so our own about-to-die orphans are not counted
# as someone else's contention.
#
# Deliberately NOT scoped under `[ -n "$SIM_UDID" ]` the way the driver reset is: host
# starvation hurts a device-only run identically, and unlike the reset nothing is killed
# here, so the empty-UDID widening hazard does not apply.
#
# INFRA-500 — SETTLE FIRST, then read. The documented recipe is `npm run e2e:safety:gate`
# followed immediately by the flows, and the gate's own 90s-to-21min build leaves the host
# at several times its idle load. That is the reliably reproducible contention on this
# machine, and unlike a peer's it decays on its own, so a bounded wait removes it. The
# reading below is therefore the POST-settle one — the load the flows will actually run
# under, not the one they inherited. `e2e_host_settle` never skips a flow; see its header.
HOST_FACTS="$(e2e_host_settle "")"
e2e_host_summary_line "$HOST_FACTS"
e2e_host_contention_warn "$HOST_FACTS"
if command -v e2e_telemetry_settle >/dev/null 2>&1; then
  e2e_telemetry_settle "$HOST_FACTS"
fi

flow_idx=0
FLOW_TOTAL=${#FLOWS[@]}

for f in "${FLOWS[@]}"; do
  name="$(basename "$f" .yaml)"

  # INFRA-486 — does THIS flow's declared viewport match the device we are running on?
  # INFRA-493 — and it is now a VERDICT, armed on the 9/9 measurement at 375x667 that PR 1
  # recorded. It still does not change the EXIT CODE; the token and the receipt carry it.
  FLOW_CERTIFIES="$(e2e_flow_certifies "$f")"
  FLOW_CERT_NOTE="$(e2e_flow_certification_note "$FLOW_CERTIFIES" "${E2E_SIM_VIEWPORT:-unknown}")"
  FLOW_CERTIFYING="$(e2e_run_certifies "$FLOW_CERTIFIES" "${E2E_SIM_VIEWPORT:-unknown}")"
  flow_idx=$((flow_idx + 1))

  # INFRA-434 — is the binary we attested still the binary installed?
  if ! e2e_assert_gate_target; then
    GATE_REPLACED_AT="$flow_idx"
    results+=("ABORTED  $name  (gate target $GATE_REPLACED_KIND before this flow)")
    break
  fi

  # A second wedge aborts the rest. 8 flows x a 600s bound is an 80-minute worst case,
  # which would reinstate the very problem the bound solves; and the wedge lives down in
  # CoreSimulator, which does not un-wedge on its own, so the remaining flows would emit
  # garbage reds rather than evidence.
  if [ "$timeouts" -ge 2 ]; then
    results+=("SKIPPED  $name  (aborted after $timeouts timeouts)")
    continue
  fi

  # DEBUG-392 — evidence goes in a directory THIS invocation owns.
  #
  # ~/.maestro/tests/ is global, and this machine drives one booted simulator from
  # several worktrees at once. The pre-existing `ls -dt ~/.maestro/tests/*/ | head -1`
  # below could therefore select a NEIGHBOURING session's run, and adjudicating a merge
  # on someone else's green report is a laundered pass. A private dir also means a
  # missing report is unambiguous: nothing else could have written there.
  RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/e2e-safety-$name-XXXXXX")" || {
    echo "❌ could not create a private run directory — refusing to run on shared evidence." >&2
    # DEBUG-505: this is the site that proves reading each exit for its FACT was necessary,
    # in the opposite direction from DEBUG-496's :600. `ran` used to be incremented ABOVE
    # this line, so a mechanical "no exit 1 where ran is 0" sweep would have PASSED this
    # site unchanged and still been wrong — exit 1 would claim a flow was adjudicated red
    # when this iteration never invoked maestro at all.
    exit 2
  }
  REPORT="$RUN_DIR/report.xml"
  DEBUG_DIR="$RUN_DIR/debug"
  mkdir -p "$DEBUG_DIR"

  # DEBUG-505 — count flows that actually LAUNCHED maestro. The increment used to sit above
  # the mktemp, so an iteration that refused before invoking anything still counted as a
  # flow that ran: the receipt's flows_ran over-reported, and AC 2's proof obligation
  # (stated in terms of `ran`) was only approximately true.
  ran=$((ran + 1))

  echo "🛡️  [$ran] maestro test $f${SIM_UDID:+ (simulator $SIM_UDID)}${DEVICE_UDID:+ (device $DEVICE_UDID)}  [bound ${FLOW_TIMEOUT_S}s]"

  # `${arr[@]+"${arr[@]}"}` — NOT a bare "${arr[@]}". This script runs under `set -u`, and
  # in the bash 3.2 that ships with macOS expanding an EMPTY array is an unbound-variable
  # error. Same hazard the FLOWS/results guard above exists for; a device-only run leaves
  # this array empty by design.
  #
  # `set -m` puts the child in its OWN process group so the watchdog can kill the group.
  # That matters: the wedge is not in the JVM, it is in the `xcrun simctl` the JVM
  # spawned. Killing only the JVM leaves CoreSimulator stuck and every later flow
  # meaningless.
  flow_t0="$(date +%s)"   # INFRA-476 — stopped at `wait` below, so the 8s settle is
                          # not laundered into the flow's own time.
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
  flow_secs=$(( $(date +%s) - flow_t0 ))
  flow_elapsed="$(e2e_fmt_elapsed "$flow_secs")"
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
    flow_outcome=TIMEOUT
    timeouts=$((timeouts + 1))
    # Report the per-command adjudication ALONGSIDE the timeout rather than instead of
    # it: an all-COMPLETED run that had to be killed is still not merge evidence, but
    # throwing away what it did complete would discard the diagnosis for no gain.
    results+=("TIMEOUT  $name  ($flow_elapsed · ${E2E_SIM_VIEWPORT:-unknown} · ${FLOW_CERT_NOTE}; no verdict in ${FLOW_TIMEOUT_S}s; report: ${VERDICT:-<none>})")
    LAST_EVIDENCE_DIR="$DEBUG_DIR"
    echo "⏱️  $name exceeded ${FLOW_TIMEOUT_S}s and was killed. Evidence: $RUN_DIR" >&2
  elif [ "$rc" -eq 0 ] && [ "$VERDICT" = "PASS" ] && [ "$FLOW_CERTIFYING" != "yes" ]; then
    # INFRA-493 — the assertions held, but not on the viewport this flow declares, so this
    # run does not certify it. NOT `FAIL`: that re-creates the "refuses because the device
    # is large" shape INFRA-478's AC 3 forbade, and makes a real 988 regression
    # indistinguishable from a wrong-device run. NOT `PASS`: a PASS a grep or a reader can
    # salvage is an unenforced guarantee. INFRA-434's VOID is the in-tree precedent.
    #
    # `fail` is untouched on purpose — see the exit-alphabet note at the counters.
    flow_outcome=UNCERTIFIED
    uncertified=$((uncertified + 1))
    uncertified_flows+=("$name")
    results+=("UNCERTIFIED  $name  ($flow_elapsed · ${E2E_SIM_VIEWPORT:-unknown} · ${FLOW_CERT_NOTE})")
    rm -rf "$RUN_DIR"
  elif [ "$rc" -eq 0 ] && [ "$VERDICT" = "PASS" ]; then
    flow_outcome=PASS
    results+=("PASS  $name  ($flow_elapsed · ${E2E_SIM_VIEWPORT:-unknown} · ${FLOW_CERT_NOTE})")
    rm -rf "$RUN_DIR"
  else
    flow_outcome=FAIL
    if [ "$rc" -ne 0 ] && [ "$VERDICT" = "PASS" ]; then
      echo "⚠️  $name: the two verdict sources disagree — maestro exited $rc but its JUnit" >&2
      echo "   report is clean. That is a harness bug and deserves its own work item; it is" >&2
      echo "   never a green." >&2
    fi
    results+=("FAIL  $name  ($flow_elapsed · ${E2E_SIM_VIEWPORT:-unknown} · ${FLOW_CERT_NOTE}; exit=$rc, report: ${VERDICT:-<none>})")
    LAST_EVIDENCE_DIR="$DEBUG_DIR"
    fail=1
    echo "   Evidence kept: $RUN_DIR" >&2
  fi

  # INFRA-490 — this flow's wall-clock and verdict, against the host reading taken at gate
  # start. DEBUG-473 measured the same unchanged tree at 1m57s idle and 45m20s contended,
  # and nothing recorded either; without the pair on one line the correlation has to be
  # reconstructed from memory. Written for every flow that RAN — a suite later voided by
  # INFRA-434 still leaves its rows, because how long a flow took under a given load is a
  # real measurement whatever the provenance verdict says about its verdict.
  e2e_telemetry_flow "$name" "$flow_outcome" "$flow_secs" \
    "${E2E_SIM_VIEWPORT:-unknown}" "$HOST_FACTS"

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

# INFRA-434 — check once more AFTER the loop. A top-of-loop-only watch cannot see a
# replacement during the last flow, and the 1-of-1 case is not an edge case: it is the
# common /b-close Phase 2.5 shape, where a scoped run is a single flow. Without this the
# guard would be absent from exactly the run type that most often adjudicates a merge.
if [ "$GATE_TARGET_REPLACED" != "1" ]; then
  if ! e2e_assert_gate_target; then
    GATE_REPLACED_AT="$flow_idx"
  fi
fi

echo ""
echo "──── e2e:safety summary (${ran} flow(s), isolated invocations) ────"
# INFRA-478 — name the device the verdicts below were earned on. A verdict that does not
# name its device is not a verdict: the same tree measured 8/8 PASS on an iPhone 16 Pro and
# 5/8 on an SE 3, so a green whose viewport is unrecorded is unauditable after the fact.
# WHICH device the gate should run on is INFRA-486; this only records the one it did.
if [ -n "${E2E_SIM_DEVICE_LINE:-}" ]; then
  echo "📱 Device: ${E2E_SIM_DEVICE_LINE}"
elif [ -n "${DEVICE_UDID:-}" ]; then
  echo "📱 Device: physical device ${DEVICE_UDID}"
fi
# INFRA-476 — restate the host reading beside the verdicts. Per-flow wall-clock alone does
# not say WHY a flow was slow, and the pre-flight line has scrolled far off screen by now.
e2e_host_summary_line "${HOST_FACTS:-}"
if [ "$GATE_TARGET_REPLACED" = "1" ]; then
  # Every completed flow is VOID, unconditionally — not merely under
  # E2E_REQUIRE_CLEAN_PROVENANCE. A marker change bounds a WINDOW, not an instant: the
  # substitution could have happened at any point during the flow that preceded it, and a
  # marker could even be changed and changed back. So no completed flow survives as
  # evidence, and none is printed as PASS for a reader (or a grep) to salvage.
  for r in "${results[@]}"; do
    case "$r" in
      ABORTED*) echo "  $r" ;;
      *) echo "  VOID     ${r#* } — inconclusive, ran against an unverified target" ;;
    esac
  done
else
  for r in "${results[@]}"; do echo "  $r"; done
fi

# INFRA-486 (AC 6) — RETAIN a durable, device-attributed record of this run.
#
# The per-flow RUN_DIRs are mktemp'd and `rm -rf`'d in the PASS arm, so on exactly the run
# that adjudicates a merge, nothing survives. Note the AC's own premise needed correcting:
# device properties CANNOT live in the JUnit — Maestro authors report.xml via
# --format=JUNIT and nothing in this repo writes to it, so this is a SIBLING file.
#
# It must NOT live inside the worktree: the provenance fingerprint is repo-wide and
# includes untracked file contents, so a receipt written there would read as MISMATCH on
# the next verify and cost a rebuild. TMPDIR by default, overridable.
#
# INFRA-493 — this is now READ: /b-close routes on the `certification:` line below, because
# the frozen exit alphabet cannot carry that verdict. E2E_RECEIPT_PATH lets the CALLER name
# the file — the default path is timestamped and PID-suffixed, so a reader would have to
# glob for it and would race every peer gate on the machine. The other option, capturing
# this script's stdout and grepping it, is the shape that makes a failed command read as
# exit 0 (CLAUDE.md), on the one run that adjudicates a merge.
SUITE_RECEIPT_DIR="${E2E_EVIDENCE_DIR:-${TMPDIR:-/tmp}}"
SUITE_RECEIPT="${E2E_RECEIPT_PATH:-${SUITE_RECEIPT_DIR%/}/e2e-safety-receipt-$(date -u +%Y%m%dT%H%M%SZ)-$$.txt}"
{
  echo "e2e:safety receipt"
  echo "generated_utc:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "repo_head:       $(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "repo_branch:     $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  echo "device_line:     ${E2E_SIM_DEVICE_LINE:-${DEVICE_UDID:+physical device $DEVICE_UDID}}"
  # INFRA-493 — the UDID, so a caller's refusal can print a PASTEABLE remediation rather
  # than a `<current-udid>` placeholder. A command the operator has to fill in by hand is
  # not the one-command remediation the policy rests on.
  echo "device_udid:     ${SIM_UDID:-${DEVICE_UDID:-unknown}}"
  echo "device_model_id: ${E2E_SIM_MODEL_ID:-unknown}"
  echo "device_ios:      ${E2E_SIM_IOS:-unknown}"
  echo "device_viewport: ${E2E_SIM_VIEWPORT:-unknown}"
  echo "declared_target: ${E2E_SMALLEST_SUPPORTED_VIEWPORT}"
  echo "host_at_start:   ${HOST_FACTS:-unknown}"
  echo "flows_ran:       ${ran} of ${FLOW_TOTAL}"
  echo "target_replaced: ${GATE_TARGET_REPLACED}"
  # INFRA-493 — the machine-readable verdict /b-close routes on. CERTIFIED means every
  # flow that ran certified its declared target; it is NOT a synonym for green. A flow can
  # be red and certifying (a real regression on the right device), and green and
  # non-certifying (this token). The two axes are reported separately because collapsing
  # them is exactly what made a large-device green readable as merge evidence.
  # VOID subsumes both axes. When the target moved, INFRA-434 already ruled every completed
  # flow inconclusive, so `CERTIFIED` here would be a claim about flows this run no longer
  # vouches for — and the receipt outlives the terminal that printed the exit 3.
  if [ "$GATE_TARGET_REPLACED" = "1" ]; then
    echo "certification:   VOID"
  else
    echo "certification:   $([ "$uncertified" -eq 0 ] && echo CERTIFIED || echo UNCERTIFIED)"
  fi
  echo "uncertified_flows: ${uncertified_flows[*]:-none}"
  echo "results:"
  for r in "${results[@]}"; do echo "  $r"; done
} > "$SUITE_RECEIPT" 2>/dev/null && echo "🧾 Receipt: $SUITE_RECEIPT" \
  || echo "⚠️  could not write the run receipt to ${SUITE_RECEIPT_DIR} — verdict unaffected." >&2

# INFRA-434 — the target moved. Checked BEFORE the pass/fail branches below, because
# neither of their verdicts is available any more: a PASS would describe someone else's
# binary and a FAIL might too. This is "the gate could not render a verdict", which is a
# third outcome and gets a third exit code.
#
# DEBUG-505 — this block was BELOW the zero-flow guard, which made exit 3 unreachable in
# the case it matters most. The flow loop `break`s when e2e_assert_gate_target fails, and
# that break is above the `ran` increment, so a target replaced before the FIRST flow leaves
# `ran` at 0 — it fell through the guard below and exited 1. For the 1-of-1 scoped run
# /b-close Phase 2.5 usually takes, that meant a mid-suite substitution was reported as a
# crisis-flow regression and INFRA-434's protection never fired. Ordering is the whole fix.
if [ "$GATE_TARGET_REPLACED" = "1" ]; then
  echo ""
  # INFRA-466 — three kinds, so this is a case rather than an if/else. A third kind added to
  # a two-way branch falls into the `replaced` arm and prints "Replaced by:" with an empty
  # attribution, which reads as a substitution that was never observed.
  case "$GATE_REPLACED_KIND" in
    unresolved)
      echo "❌ aborted — the gate target could not be RESOLVED at flow ${GATE_REPLACED_AT} of ${FLOW_TOTAL}."
      echo "   The container lookup itself failed, so this says NOTHING about the binary —"
      echo "   it is not a substitution and not an uninstall. The simulator is gone, was"
      echo "   shut down or erased mid-suite, or 'xcrun simctl' is unavailable or flaking."
      echo "   Confirm the simulator is still booted, then re-run:  npm run e2e:safety:gate"
      ;;
    vanished)
      echo "❌ aborted — the gate target VANISHED at flow ${GATE_REPLACED_AT} of ${FLOW_TOTAL}."
      echo "   The app was uninstalled or reinstalled mid-suite, so no marker remains to"
      echo "   attribute it. Likely causes: 'npm run ios', Xcode Run, a manual"
      echo "   'xcrun simctl install/uninstall', or e2e-sim-build-eas.sh (which takes no lock)."
      ;;
    *)
      echo "❌ aborted — the gate target was REPLACED at flow ${GATE_REPLACED_AT} of ${FLOW_TOTAL}."
      echo "   Replaced by: ${GATE_REPLACED_BY}"
      ;;
  esac
  echo ""
  echo "   This is NOT a flow failure and NOT a pass. The flows that completed ran against"
  echo "   a binary this gate never attested, so they are inconclusive rather than green."
  echo "   Rebuild and re-run:  npm run e2e:safety:gate"
  echo ""
  echo "   INFRA-436's simulator lock covers a peer's 'npm run e2e:safety:build'. It does"
  echo "   NOT cover the paths above — none of them acquire it."
  exit 3
fi

# A zero-flow run must never be laundered into a green. This script previously printed
# "all safety flows passed" and exited 0 when `ran` was 0 — vacuously true and read by
# /b-close as a passing gate. The selection guard above should make this unreachable;
# this is the assertion that keeps it that way if the loop ever gains a `continue`.
#
# DEBUG-505: now BELOW the target-replaced check (see there for why), and exit 2 rather
# than 1 — "no flow ran" is the definition of "no verdict", never an adjudicated red.
if [ "$ran" -lt 1 ]; then
  echo "❌ no flows actually ran — refusing to report success." >&2
  exit 2
fi

if [ "$timeouts" -gt 0 ]; then
  # A distinct exit code, because "the gate found a regression" and "the gate could not
  # run" are different facts. /b-close and a human triaging a red both need to tell them
  # apart — and a TIMEOUT is never something to shrug at and re-run, it means the harness
  # itself is in an unknown state.
  echo "❌ the gate could not complete: $timeouts flow(s) exceeded ${FLOW_TIMEOUT_S}s and were killed."
  echo "   This is NOT a pass and NOT an ordinary failure. The simulator is likely wedged;"
  echo "   restart it before re-running:  xcrun simctl shutdown all"
elif [ "$fail" -eq 0 ] && [ "$uncertified" -gt 0 ]; then
  # INFRA-493 — a bare "✅ all safety flows passed" printed under an UNCERTIFIED result
  # reads as an all-clear, and the whole failure this item closes is a green being read as
  # merge evidence for a viewport it never touched. The assertions DID hold, so this is not
  # a red; it is a green of narrower scope than the one the flows declare.
  echo "⚠️  all safety flows passed, but ${uncertified} of ${ran} did NOT certify their"
  echo "   declared viewport: ${uncertified_flows[*]}"
  e2e_uncertified_remediation "${E2E_SIM_VIEWPORT:-unknown}" "${SIM_UDID:-<udid>}"
  echo "   Iterating or debugging? Nothing here blocks you — this run still exits 0 and"
  echo "   every flow reported. It is /b-close that refuses, and only for a MERGE."
elif [ "$fail" -eq 0 ]; then
  echo "✅ all safety flows passed"
else
  echo "❌ one or more safety flows failed"
  if [ "$uncertified" -gt 0 ]; then
    echo "   Separately, ${uncertified} flow(s) did not certify their declared viewport:"
    echo "     ${uncertified_flows[*]}"
    echo "   That is a different fact from the failure above and does not explain it."
  fi

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
