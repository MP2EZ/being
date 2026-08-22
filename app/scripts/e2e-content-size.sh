#!/usr/bin/env bash
#
# DEBUG-469 — Dynamic Type is an UNCONTROLLED, DEVICE-GLOBAL input to the safety gate.
#
# Nothing in this repo has ever set or asserted the simulator's content size, so every
# safety flow has always run at whatever the device happened to be left at. That is not a
# theoretical gap: `xcrun simctl ui <udid> content_size <value>` is device-global and
# PERSISTENT — it survives app relaunch, `clearState`, `clearKeychain`, and the flow or
# script that set it. `e2e-safety.sh` resolves exactly ONE simulator and CLAUDE.md records
# that worktrees routinely share it, so a size left behind by a hand-run experiment or a
# crashed wrapper silently poisons every later flow AND a peer worktree's run — attributing
# results to the wrong cause, which is the DEBUG-473 failure shape.
#
# THIS REFUSES RATHER THAN WARNS, and that is a deliberate departure from the
# warn-don't-fail convention `e2e_warn_if_not_smallest_viewport` follows. The two cases are
# not alike. "Your device is large" is a judgement an operator can reasonably disagree with,
# so refusing on it trains the `--skip-e2e` reflex. "Your device is at accessibility text
# size" means every layout assertion in the run is measuring something other than the
# shipped default — the results are not about the product — and the remedy is one command.
# An unambiguous, instantly-fixable refusal does not train a bypass.
#
# Opt in deliberately with E2E_ALLOW_NON_DEFAULT_CONTENT_SIZE=1. That is the seam a future
# `safety-dynamic-type` flow class uses; it must also RESTORE the size in a trap on EXIT,
# INT and TERM, because a set without a guaranteed restore IS the leak described above.
#
# No `set` options — sourced into scripts running under a bare `set -u`.

# The iOS system default. `simctl ui <udid> content_size` prints the current value.
E2E_DEFAULT_CONTENT_SIZE="${E2E_DEFAULT_CONTENT_SIZE:-large}"

# e2e_content_size <udid> — echo the device's current content size, or nothing.
e2e_content_size() {
  local udid="${1:-}"
  [ -n "$udid" ] || return 0
  xcrun simctl ui "$udid" content_size 2>/dev/null | tr -d '\r' | head -1
  return 0
}

# e2e_assert_default_content_size <udid>
#   0 = default (or unreadable, or explicitly allowed) · 1 = non-default, refuse the run.
#
# Unreadable returns 0: an older simctl that does not support the subcommand must not
# become an unfixable red gate. That is the one place this degrades rather than refuses,
# and it is stated out loud rather than silent.
e2e_assert_default_content_size() {
  local udid="${1:-}" cs
  cs="$(e2e_content_size "$udid")"

  if [ -z "$cs" ]; then
    echo "ℹ️  Content size could not be read for this device, so the default-type check is" >&2
    echo "   not being applied. Layout assertions below assume default Dynamic Type." >&2
    return 0
  fi

  [ "$cs" = "$E2E_DEFAULT_CONTENT_SIZE" ] && return 0

  if [ "${E2E_ALLOW_NON_DEFAULT_CONTENT_SIZE:-}" = "1" ]; then
    echo "⚠️  Content size is '${cs}', NOT the default '${E2E_DEFAULT_CONTENT_SIZE}' —" >&2
    echo "   allowed by E2E_ALLOW_NON_DEFAULT_CONTENT_SIZE=1. These results describe that" >&2
    echo "   text size only. Restore it in a trap on EXIT/INT/TERM, or the next run inherits it." >&2
    return 0
  fi

  echo "❌ The simulator is at content size '${cs}', not the default '${E2E_DEFAULT_CONTENT_SIZE}'." >&2
  echo "   Every layout assertion in this suite would be measuring a text size the app does" >&2
  echo "   not ship by default, so a pass or a fail here says nothing about the product." >&2
  echo "   Content size is device-global and survives clearState, clearKeychain and relaunch," >&2
  echo "   so this was almost certainly left behind by an earlier run on this machine." >&2
  echo "" >&2
  echo "   Restore it:  xcrun simctl ui ${udid} content_size ${E2E_DEFAULT_CONTENT_SIZE}" >&2
  echo "   Deliberate scaled-type run:  E2E_ALLOW_NON_DEFAULT_CONTENT_SIZE=1 (restore in a trap)" >&2
  return 1
}
