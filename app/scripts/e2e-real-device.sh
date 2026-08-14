#!/usr/bin/env bash
# =========================================================================================
# Shared PHYSICAL-device resolution for the safety gate. SOURCED, never executed.
#
# Why this file exists (INFRA-424). INFRA-405 pins every flow to the simulator the
# pre-flight attested, so "verified this binary" and "ran against this binary" are the same
# claim. That pinning is scoped under `if [ "$DEVICE_ONLY" != "1" ]` — deliberately, so the
# real-iPhone procedure gains no simctl dependency. The consequence was that the ONE flow
# tagged `safety-device-only` (crisis-988-dial) was the only flow that ran UNPINNED:
#
#     DEVICE_ONLY=1  ->  SIM_UDID=""  ->  MAESTRO_DEVICE_ARGS=()  ->  no --device passed
#
# and `maestro test` chooses its own target when not told one — it will even fan out across
# N connected targets. With simulators booted and no iPhone attached, `npm run
# e2e:safety:988-dial` could attach to an arbitrary booted simulator, including one another
# worktree was mid-suite on. Two harms, and the second is the worse one:
#
#   1. The simulator's `canOpenURL('tel:')` returns false regardless of
#      LSApplicationQueriesSchemes, so the flow's terminal `notVisible: "Unable to Call"`
#      assertion fails. That is a guaranteed RED that proves nothing about the dial path —
#      a gate failing while blaming the wrong thing, which is the shape that trains the
#      `--skip-e2e` reflex the gate exists to prevent.
#   2. It can corrupt a PEER worktree's in-flight run, in a direction they cannot attribute
#      to their own diff. Cross-run contamination of safety evidence is a safety defect.
#
# So this file gives the device path the same three-outcome discipline the simulator path
# already has. It is a separate file rather than an addition to e2e-sim-device.sh so that
# neither path gains a concept from the other: e2e-sim-build.sh sources the simulator
# resolver and has no notion of a physical device, and must keep it that way.
#
# WHAT PINNING DOES AND DOES NOT BUY. Pinning does not strengthen the dial claim; it makes
# the claim ATTRIBUTABLE. Unpinned, a green means "some app on some target did not show the
# fallback alert". Pinned, it means "the build on device X did not show it". It does NOT
# restore artifact attestation: `simctl get_app_container`, the otool/plutil shape checks
# and e2e-provenance.js are all simulator-container-bound and remain unavailable here.
# Naming the target and vouching for the binary are two separate claims, and the caller's
# "NO artifact attestation" banner must survive in substance.
#
# NO `set` OPTIONS HERE. Sourced into e2e-safety.sh, which runs under a bare `set -u` (no
# -e, no pipefail). Setting options would silently change the caller's error semantics.
# =========================================================================================

# e2e_attached_devices — print one `<udid><TAB><name>` line per ELIGIBLE physical iOS device.
#
# Exit 0  enumeration succeeded (the list may legitimately be EMPTY)
# Exit 1  enumeration FAILED — devicectl unavailable, wrote nothing, or unparseable output
#
# Same distinction e2e_booted_devices draws, for the same reason: "no device is attached"
# and "I could not find out" are different facts, and callers must not report the first
# when the truth is the second. Collapsing them into a silent empty string is the defect
# e2e-sim-device.sh:37-40 exists to prevent, and it is sharper here — `devicectl` writes its
# JSON to a caller-supplied FILE rather than stdout, so an unwritten file is the NORMAL
# shape of a failure rather than an exotic one.
#
# THE FILTER IS LOAD-BEARING, NOT HYGIENE. `devicectl list devices` reports far more than
# usable iPhones: paired-but-disconnected devices, iPads, Apple Watches, and companions. A
# loose filter is not merely untidy — it resolves "exactly one", pins maestro to a target
# the flow cannot pass on, and produces a FALSE RED on the crisis path. That is not
# hypothetical: on the machine this was developed against, the only entry devicectl returns
# is an iPad in `tunnelState: unavailable`, which a naive resolver would have selected.
# Four conditions, each excluding a real failure:
#
#   platform      == iOS        drops the host Mac, watchOS and tvOS companions
#   deviceType    == iPhone     drops iPads — a Wi-Fi iPad has no telephony, so
#                               canOpenURL('tel:') is legitimately false there and the
#                               flow's negative assertion fails for a reason that is not
#                               a regression
#   pairingState  == paired     drops devices Xcode cannot drive
#   tunnelState   not unavailable/disconnected
#                               drops a device that is remembered but not present
e2e_attached_devices() {
  local out raw

  out="$(mktemp "${TMPDIR:-/tmp}/e2e-devicectl-XXXXXX.json")" || return 1

  # devicectl emits JSON ONLY via --json-output <path>; there is no stdout JSON mode, so
  # `-j -` is not an option. Its own stdout is a human table we deliberately discard.
  if ! xcrun devicectl list devices --json-output "$out" >/dev/null 2>&1; then
    rm -f "$out"
    return 1
  fi

  raw="$(cat "$out" 2>/dev/null)"
  rm -f "$out"
  [ -n "$raw" ] || return 1

  printf '%s' "$raw" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(s);
      } catch {
        process.exit(1); // unparseable => enumeration failure, NOT "none attached"
      }
      const devices = parsed && parsed.result && parsed.result.devices;
      if (!Array.isArray(devices)) process.exit(1);
      for (const d of devices) {
        const hw = (d && d.hardwareProperties) || {};
        const conn = (d && d.connectionProperties) || {};
        const props = (d && d.deviceProperties) || {};
        if (hw.platform !== "iOS") continue;
        if (hw.deviceType !== "iPhone") continue;
        if (conn.pairingState !== "paired") continue;
        if (conn.tunnelState === "unavailable" || conn.tunnelState === "disconnected") continue;
        if (!hw.udid) continue;
        console.log(`${hw.udid}\t${props.name || hw.productType || "unknown"}`);
      }
      process.exit(0);
    });
  ' 2>/dev/null || return 1
}

# e2e_resolve_real_device <context-label>
#
# Echoes the resolved UDID on stdout. Diagnostics go to stderr so the caller can wrap the
# failure in its own stage reporting.
#
# Exit 0  resolved; UDID on stdout
# Exit 1  could not ENUMERATE devices
# Exit 2  zero eligible devices attached
# Exit 3  ambiguous: 2+ attached and no usable E2E_DEVICE_UDID override
#
# FAILS CLOSED on every non-zero path, and in particular NEVER falls back to a simulator.
# That is the whole point: a device-only flow silently retargeted at a simulator is exactly
# the defect this resolver was written to remove, so there is no `${UDID:-booted}`-shaped
# shorthand anywhere here and there must never be one.
#
# THE OVERRIDE IS E2E_DEVICE_UDID, NOT E2E_SIM_UDID — deliberately a separate name.
# docs/testing/e2e-maestro.md instructs operators to export E2E_SIM_UDID for BOTH halves of
# a session, so an operator following that guidance would have a SIMULATOR udid live in the
# environment. Reusing the variable would hand that simulator udid to this resolver, which
# would then refuse a correctly-attached iPhone as "not among the attached devices" —
# turning documented, correct operator behaviour into a confusing refusal. One variable
# that can name two different device namespaces is the silent-mistarget hazard wearing a
# different hat. Mirror the exit-3 SHAPE; never the variable.
e2e_resolve_real_device() {
  local context="${1:-gate}"
  local listing count udid

  if ! listing="$(e2e_attached_devices)"; then
    echo "❌ could not enumerate attached devices (xcrun devicectl list devices --json-output)." >&2
    echo "   This is NOT the same as 'no device attached' — Xcode command line tools may be" >&2
    echo "   missing or devicectl may have failed. Check: xcrun devicectl list devices" >&2
    return 1
  fi

  if [ -z "$listing" ]; then
    echo "❌ no eligible iPhone attached — this flow is tagged \`safety-device-only\` and must" >&2
    echo "   run against real hardware. It is NOT falling back to a simulator: the simulator's" >&2
    echo "   canOpenURL('tel:') returns false regardless of LSApplicationQueriesSchemes, so a" >&2
    echo "   simulator run would be a guaranteed red that proves nothing about the dial path." >&2
    echo "" >&2
    echo "   ⚠️  The 988 runtime dial path is NOT verified by this run." >&2
    echo "" >&2
    echo "   Attach and unlock an iPhone, then install a Release build on it. To see what is" >&2
    echo "   attached (iPads and disconnected devices are deliberately excluded):" >&2
    echo "     xcrun devicectl list devices" >&2
    echo "   To name a target explicitly:" >&2
    echo "     E2E_DEVICE_UDID=<udid> npm run e2e:safety:988-dial" >&2
    return 2
  fi

  count="$(printf '%s\n' "$listing" | grep -c .)"

  if [ "$count" -eq 1 ]; then
    printf '%s' "$(printf '%s' "$listing" | cut -f1)"
    return 0
  fi

  # 2+ attached. Honour an explicit override when it names one of them; otherwise refuse.
  if [ -n "${E2E_DEVICE_UDID:-}" ]; then
    if udid="$(printf '%s\n' "$listing" | grep -F "$E2E_DEVICE_UDID" | cut -f1 | head -1)" && [ -n "$udid" ]; then
      printf '%s' "$udid"
      return 0
    fi
    echo "❌ E2E_DEVICE_UDID=$E2E_DEVICE_UDID is not among the attached devices." >&2
    printf '%s\n' "$listing" | sed 's/^/     /' >&2
    return 3
  fi

  echo "❌ $count iPhones attached; the target is ambiguous — maestro picks one and does not" >&2
  echo "   say which, so the $context could run against a different device than you think." >&2
  echo "   Detach all but one, or name the target explicitly:" >&2
  echo "     E2E_DEVICE_UDID=<udid> npm run e2e:safety:988-dial" >&2
  printf '%s\n' "$listing" | sed 's/^/     /' >&2
  return 3
}
