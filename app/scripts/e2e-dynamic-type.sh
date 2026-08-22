#!/usr/bin/env bash
#
# DEBUG-469 AC4 — run safety flows at a NON-DEFAULT Dynamic Type size, deliberately.
#
# WHY THIS EXISTS AT ALL. Every safety flow in this repo runs at whatever content size the
# device happened to be left at, which in practice is always the default. DEBUG-432 found
# 3 of 4 configurations failing only because it measured AX5, and DEBUG-469 measured two
# screens on which the daily loop could not be entered by ANY route at AX5 — a whole feature
# silently unavailable to a real cohort, invisible to all nine gate flows. Scaled type is
# therefore not an exotic dimension: it is an uncovered one that has already hidden defects.
#
# WHY IT IS A SEPARATE CLASS AND NOT A `safety` TAG. e2e-safety.sh selects the suite with an
# EXACT `- safety` tag match, so `safety-dynamic-type` is excluded from `npm run e2e:safety`
# by construction, exactly as `safety-device-only` is. That separation is deliberate and is
# the whole design:
#
#   - The default suite must keep measuring the SHIPPED default. Folding a scaled-type flow
#     into it would make the same nine-flow run assert two different products, and a red
#     could no longer be read without asking which text size produced it.
#   - A named flow still gets the full simulator pre-flight — provenance, artifact shape,
#     device pinning — because e2e-safety.sh only special-cases `safety-device-only`. So
#     this class trades none of the attestation the default suite has.
#
# WHY IT SETS AND RESTORES RATHER THAN ASKING THE OPERATOR TO. Content size is device-global
# and PERSISTENT: it survives relaunch, clearState, clearKeychain, and the process that set
# it. This machine shares one simulator across worktrees, so a size left behind poisons a
# peer's run and misattributes the cause. e2e-content-size.sh refuses a non-default size for
# precisely that reason; this script is the sanctioned opt-in it names, and the trap below is
# the obligation that opt-in carries. A set without a guaranteed restore IS the leak.
#
# WHY AN UNREADABLE SIZE REFUSES INSTEAD OF PROCEEDING. If `simctl ui content_size` cannot be
# read, the original cannot be captured, so the restore cannot be honoured. Setting anyway
# would leave the device poisoned with no way to put it back — strictly worse than not
# running. e2e_assert_default_content_size DEGRADES on an unreadable size because there it is
# only declining to add a check; here it would be creating the leak.
#
# EXIT CODES mirror e2e-safety.sh (INFRA-434 / DEBUG-496): 0 pass · 1 flow regression ·
# 2 harness could not complete · 3 target replaced · 4 peer owns the gate slot.

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/e2e-sim-device.sh
. "$HERE/e2e-sim-device.sh"
# shellcheck source=scripts/e2e-content-size.sh
. "$HERE/e2e-content-size.sh"

# AX5 is the calibration point, not an arbitrary large value: it is the largest size iOS
# offers and the one DEBUG-465's crisis pass named as must-hold for the daily-loop support
# line. A layout that holds here holds at every size below it.
CONTENT_SIZE="${E2E_DYNAMIC_TYPE_SIZE:-accessibility-extra-extra-extra-large}"

FLOWS=("$@")
[ "${#FLOWS[@]}" -gt 0 ] || FLOWS=(daily-loop-ax5-entry)

SIM_UDID="$(e2e_resolve_sim_device "dynamic-type gate")" || exit 2

ORIGINAL_SIZE="$(e2e_content_size "$SIM_UDID")"
if [ -z "$ORIGINAL_SIZE" ]; then
  echo "❌ Content size cannot be READ on ${SIM_UDID}, so it cannot be restored afterwards." >&2
  echo "   Setting it anyway would leave this shared simulator at ${CONTENT_SIZE} with no" >&2
  echo "   way to put it back, poisoning every later run on this machine including a peer's." >&2
  echo "   Refusing rather than leaking." >&2
  exit 2
fi

restore_content_size() {
  local now
  now="$(e2e_content_size "$SIM_UDID")"
  [ "$now" = "$ORIGINAL_SIZE" ] && return 0
  if xcrun simctl ui "$SIM_UDID" content_size "$ORIGINAL_SIZE" >/dev/null 2>&1; then
    echo "↩️  Content size restored to '${ORIGINAL_SIZE}'."
  else
    echo "⚠️  COULD NOT restore content size on ${SIM_UDID} — it is still '${now}'." >&2
    echo "   Fix by hand:  xcrun simctl ui ${SIM_UDID} content_size ${ORIGINAL_SIZE}" >&2
  fi
}
trap restore_content_size EXIT INT TERM

echo "🔠 Dynamic Type run: setting content size to '${CONTENT_SIZE}' (was '${ORIGINAL_SIZE}')."
xcrun simctl ui "$SIM_UDID" content_size "$CONTENT_SIZE" >/dev/null 2>&1 \
  || { echo "❌ could not set content size to '${CONTENT_SIZE}'." >&2; exit 2; }

# The opt-in the refusal in e2e-content-size.sh names. Scoped to this process, never exported
# into a shell an operator keeps using.
export E2E_ALLOW_NON_DEFAULT_CONTENT_SIZE=1

bash "$HERE/e2e-safety.sh" "${FLOWS[@]}"
rc=$?
exit "$rc"
