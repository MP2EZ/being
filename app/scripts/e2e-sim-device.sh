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
# e2e_warn_if_not_smallest_viewport <udid> <listing>
#
# DEBUG-432. The resolver above pins a UDID but says nothing about the device MODEL, and
# for layout-sensitive safety flows the model IS the verdict. Measured proof, on one
# unchanged build: `crisis-call-988-button` sat at y=746..797 against a fold of y=86..667
# on an iPhone SE 3 (below the fold, 0% of the tap target on screen) and at y=776..827
# against y=128..956 on an iPhone 16 Pro Max (fully visible). The identical assertion
# therefore failed on the small phone and passed on the large one.
#
# `.maestro/deeplink-consent-gate.yaml` had asserted that button visible on that screen,
# green, for its entire life — because nobody had booted a small device. The assertion was
# never vacuous; its CONFIGURATION was uninformative, which is strictly harder to notice.
#
# WARNS, does not fail. Most safety flows assert reachability and thresholds, not layout,
# and refusing to run them on a large simulator would block real verification to enforce a
# concern they do not have. A gate that fails for a reason the operator judges irrelevant
# is the shape that trains the --skip-e2e reflex this gate exists to prevent. What must not
# happen is a green result being READ as device-independent, so the device is named on
# every run and the understatement is stated out loud.
E2E_SMALLEST_SUPPORTED_MODEL="${E2E_SMALLEST_SUPPORTED_MODEL:-iPhone SE}"

e2e_warn_if_not_smallest_viewport() {
  local udid="$1" listing="$2" name
  name="$(printf '%s\n' "$listing" | grep -F "$udid" | cut -f2 | head -1)"
  [ -n "$name" ] || name="unknown"

  echo "📱 Simulator: $name  ($udid)" >&2
  case "$name" in
    *"$E2E_SMALLEST_SUPPORTED_MODEL"*) : ;;
    *)
      echo "⚠️  This is NOT the smallest supported viewport (${E2E_SMALLEST_SUPPORTED_MODEL}, 375x667)." >&2
      echo "   Layout-sensitive safety assertions (above-the-fold 988 reachability) can pass" >&2
      echo "   here and fail there — DEBUG-432 measured exactly that on one unchanged build." >&2
      echo "   A green run on this device does not certify the small viewport." >&2
      ;;
  esac
}

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
    udid="$(printf '%s' "$listing" | cut -f1)"
    e2e_warn_if_not_smallest_viewport "$udid" "$listing"
    printf '%s' "$udid"
    return 0
  fi

  # 2+ booted. Honour an explicit override when it names one of them; otherwise refuse.
  if [ -n "${E2E_SIM_UDID:-}" ]; then
    if udid="$(printf '%s\n' "$listing" | grep -F "$E2E_SIM_UDID" | cut -f1 | head -1)" && [ -n "$udid" ]; then
      e2e_warn_if_not_smallest_viewport "$udid" "$listing"
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
