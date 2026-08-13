#!/usr/bin/env bash
# =========================================================================================
# Shared simulator-device resolution for the safety gate. SOURCED, never executed.
#
# Why this file exists (INFRA-405). e2e-sim-build.sh used to resolve a concrete UDID and
# install to it, then assert against the LITERAL selector `booted`. `xcrun simctl help`
# states it plainly: "If multiple devices are booted when the 'booted' device is selected,
# simctl will choose one of them." Unspecified which. So with 2+ simulators booted the
# install target and the assert target could diverge, and the script exited with
#
#     ❌ e2e:safety:build failed at stage: artifact discovery —
#        the build reported success but installed no fyi.being.app
#
# which asserts the opposite of what happened: the build succeeded and the app WAS
# installed, on the device the build chose. A gate that fails while blaming the wrong
# thing is the shape that trains the `--skip-e2e` reflex the gate exists to prevent.
#
# The fix is to resolve the device ONCE, here, and thread it through every call site in
# both scripts. Resolving once (rather than re-querying `booted` at each step) is also what
# makes the fix hold against the observed case where Simulator.app auto-booted a second
# device MID-BUILD: a check performed before the build does not hold for its duration, but
# a UDID captured before the build does.
#
# NO `set` OPTIONS HERE. This is sourced into e2e-sim-build.sh (`set -euo pipefail`) and
# into e2e-safety.sh (bare `set -u`, no -e, no pipefail). Setting options would silently
# change the caller's error semantics.
# =========================================================================================

# e2e_booted_devices — print one `<udid><TAB><name>` line per booted simulator.
#
# Exit 0  enumeration succeeded (the list may legitimately be EMPTY)
# Exit 1  enumeration FAILED — simctl unavailable, or unparseable output
#
# That distinction is the point: "no devices are booted" and "I could not find out" are
# different facts and previously collapsed into the same silent empty string. Callers must
# not report the first when the truth is the second.
e2e_booted_devices() {
  local raw
  raw="$(xcrun simctl list devices booted -j 2>/dev/null)" || return 1
  [ -n "$raw" ] || return 1

  printf '%s' "$raw" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(s);
      } catch {
        process.exit(1); // unparseable => enumeration failure, NOT "none booted"
      }
      const devices = parsed && parsed.devices;
      if (!devices || typeof devices !== "object") process.exit(1);
      for (const list of Object.values(devices)) {
        if (!Array.isArray(list)) continue;
        for (const d of list) {
          if (d && d.state === "Booted" && d.udid) {
            console.log(`${d.udid}\t${d.name || "unknown"}`);
          }
        }
      }
      process.exit(0);
    });
  ' 2>/dev/null || return 1
}

# e2e_resolve_sim_device <context-label>
#
# Echoes the resolved UDID on stdout. Diagnostics go to stderr so the caller can wrap the
# failure in its own stage reporting.
#
# Exit 0  resolved; UDID on stdout
# Exit 1  could not ENUMERATE devices
# Exit 2  zero devices booted
# Exit 3  ambiguous: 2+ booted and no usable E2E_SIM_UDID override
#
# FAILS CLOSED on every non-zero path — it never falls back to the literal `booted`. The
# obvious shorthand `DEV="${UDID:-booted}"` is deliberately NOT used anywhere: it restores
# the ambiguous literal at exactly the moment resolution failed, so all call sites would
# look pinned while silently degrading together.
e2e_resolve_sim_device() {
  local context="${1:-gate}"
  local listing count udid

  if ! listing="$(e2e_booted_devices)"; then
    echo "❌ could not enumerate booted simulators (xcrun simctl list devices booted -j)." >&2
    echo "   This is NOT the same as 'no simulator booted' — Xcode command line tools may" >&2
    echo "   be missing or simctl may have failed. Check: xcrun simctl list devices booted" >&2
    return 1
  fi

  if [ -z "$listing" ]; then
    echo "❌ no iOS simulator booted. Open Simulator (or 'xcrun simctl boot <device>') first." >&2
    return 2
  fi

  count="$(printf '%s\n' "$listing" | grep -c .)"

  if [ "$count" -eq 1 ]; then
    printf '%s' "$(printf '%s' "$listing" | cut -f1)"
    return 0
  fi

  # 2+ booted. Honour an explicit override when it names one of them; otherwise refuse.
  if [ -n "${E2E_SIM_UDID:-}" ]; then
    if udid="$(printf '%s\n' "$listing" | grep -F "$E2E_SIM_UDID" | cut -f1 | head -1)" && [ -n "$udid" ]; then
      printf '%s' "$udid"
      return 0
    fi
    echo "❌ E2E_SIM_UDID=$E2E_SIM_UDID is not among the booted simulators." >&2
    printf '%s\n' "$listing" | sed 's/^/     /' >&2
    return 3
  fi

  echo "❌ $count simulators booted; 'booted' is ambiguous — simctl picks one of them and" >&2
  echo "   does not say which, so the $context could target a different device than it" >&2
  echo "   verifies. Boot exactly one, or name the target explicitly:" >&2
  echo "     xcrun simctl shutdown <udid>      # leave exactly one booted" >&2
  echo "     E2E_SIM_UDID=<udid> npm run …     # or pick one" >&2
  printf '%s\n' "$listing" | sed 's/^/     /' >&2
  return 3
}
