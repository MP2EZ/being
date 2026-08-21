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
# INFRA-486 — RATIFIED: the predicate is the derived VIEWPORT below, never this name and
# never a deviceTypeIdentifier allowlist. An allowlist would be the hand-kept model-to-
# viewport table this file exists to avoid, reintroduced one indirection later; the
# viewport is what the layout assertions actually depend on and is rename-proof by
# derivation. This constant is the REMEDIATION LABEL, and it is now read as one (see the
# warning text below) — INFRA-478 said it was retained for that and then never used it,
# which is how a dead constant keeps reading as live behaviour.
E2E_SMALLEST_SUPPORTED_MODEL="${E2E_SMALLEST_SUPPORTED_MODEL:-iPhone SE (3rd generation)}"
# INFRA-478 — the viewport is the real predicate (see e2e_warn_if_not_smallest_viewport).
# Compared by EQUALITY, never `<=`: we certify THE declared configuration, and `<=` would
# admit 320x568. That is not a supported viewport — iOS minimum is 16.4 (SDK 56) and every
# 320x568 iPhone caps at iOS 15.8, so no user can be there. Note SE 2 also derives to
# 375x667 and legitimately satisfies this, while SE 1 derives to 320x568 and does not — a
# distinction the old display-name substring could not make. The floor moves the day the
# deployment target rises past what SE 2/3 support.
E2E_SMALLEST_SUPPORTED_VIEWPORT="${E2E_SMALLEST_SUPPORTED_VIEWPORT:-375x667}"

# =========================================================================================
# DEVICE ATTRIBUTION (INFRA-478)
#
# The gate resolved exactly one UDID (INFRA-405) and pinned NO model and NO iOS version —
# and recorded neither. Two holes, and this file closes the second: the run summary, the
# JUnit report and the PR body all omitted the device, so a green was unauditable after the
# fact. You could not tell later which viewport it certified. DEBUG-432 (a false green that
# stood for a flow's entire life) and DEBUG-473 (a contention failure mis-filed as a
# 402x874 fold defect) are both products of that.
#
# Choosing the device is INFRA-486 — AC 2(a) "pin to the smallest model" and AC 3 "never
# refuse because the device is large" are the same behaviour with opposite verdicts, and
# resolving it needs a full 9-flow SE 3 measurement that does not exist yet.
#
# DERIVED, NEVER TABULATED. `deviceTypeIdentifier` and the runtime key are already in the
# `xcrun simctl list devices booted -j` response the resolver makes and discards; the
# viewport comes from the device type's own profile.plist (mainScreenWidth/Height/Scale).
# A hand-kept model-to-points table is the thing that rots, and every 375x667 / 430x932
# figure in this repo is hand-typed into a comment today.
# =========================================================================================

# Booted devices WITH their type + runtime, as `udid<TAB>name<TAB>deviceTypeIdentifier<TAB>runtimeKey`.
#
# A SIBLING of e2e_booted_devices, deliberately, rather than widening it. That function is
# the fail-closed enumeration primitive INFRA-434/466 depend on, and e2e-safety.sh matches
# its output with `grep -qx "$SIM_UDID"` — a fourth column would silently break the
# vanished-vs-unresolved discrimination.
e2e_booted_devices_detailed() {
  local raw
  raw="$(xcrun simctl list devices booted -j 2>/dev/null)" || return 1
  [ -n "$raw" ] || return 1
  printf '%s' "$raw" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let parsed;
      try { parsed = JSON.parse(s); } catch { process.exit(1); }
      const devices = parsed && parsed.devices;
      if (!devices || typeof devices !== "object") process.exit(1);
      for (const [runtime, list] of Object.entries(devices)) {
        if (!Array.isArray(list)) continue;
        for (const d of list) {
          if (d && d.state === "Booted" && d.udid) {
            console.log([d.udid, d.name || "unknown", d.deviceTypeIdentifier || "", runtime].join("\t"));
          }
        }
      }
      process.exit(0);
    });
  ' 2>/dev/null || return 1
}

# iOS version from a runtime key: com.apple.CoreSimulator.SimRuntime.iOS-18-6 -> 18.6
e2e_ios_version_from_runtime() {
  printf '%s\n' "${1:-}" | sed -n 's/.*SimRuntime\.iOS-\([0-9][0-9-]*\)$/\1/p' | tr '-' '.'
}

# Viewport in POINTS for a deviceTypeIdentifier, as `WxH`. Empty when underivable — the
# caller degrades to "unknown" and never refuses on it: model + runtime already identify
# the device unambiguously, and turning a plist read into a merge blocker is the outage
# shape that trains the --skip-e2e reflex.
e2e_viewport_for_device_type() {
  local ident="${1:-}" bundle
  [ -n "$ident" ] || return 0
  bundle="$(xcrun simctl list devicetypes -j 2>/dev/null | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let parsed;
      try { parsed = JSON.parse(s); } catch { process.exit(0); }
      const want = process.argv[1];
      const t = (parsed.devicetypes || []).find((x) => x && x.identifier === want);
      if (t && t.bundlePath) console.log(t.bundlePath);
      process.exit(0);
    });
  ' "$ident" 2>/dev/null)" || return 0
  [ -n "$bundle" ] || return 0

  local plist w h sc
  plist="$bundle/Contents/Resources/profile.plist"
  [ -f "$plist" ] || return 0
  w="$(plutil -extract mainScreenWidth  raw "$plist" 2>/dev/null)" || return 0
  h="$(plutil -extract mainScreenHeight raw "$plist" 2>/dev/null)" || return 0
  sc="$(plutil -extract mainScreenScale raw "$plist" 2>/dev/null)" || return 0
  # Scale is a float ("2.000000"), so this must not be shell arithmetic.
  awk -v w="$w" -v h="$h" -v s="$sc" 'BEGIN {
    if (s + 0 <= 0) exit 0
    printf "%dx%d\n", w / s, h / s
  }' 2>/dev/null
  return 0
}

# Describe the resolved device, setting CALLER-SHELL globals:
#   E2E_SIM_NAME  E2E_SIM_MODEL_ID  E2E_SIM_IOS  E2E_SIM_VIEWPORT  E2E_SIM_DEVICE_LINE
#
# ⚠️  MUST be called SEPARATELY from e2e_resolve_sim_device, in the caller's own shell.
# Every call site uses `SIM_UDID="$(e2e_resolve_sim_device ...)"`, which runs in a SUBSHELL
# — globals assigned inside it die there. Do not try to smuggle these out through the
# resolver's stdout either: its bare-UDID contract is consumed identically at
# e2e-safety.sh, e2e-sim-build.sh and e2e-sim-build-eas.sh.
e2e_describe_sim_device() {
  local udid="${1:-}" listing row
  E2E_SIM_NAME="unknown"
  E2E_SIM_MODEL_ID=""
  E2E_SIM_IOS="unknown"
  E2E_SIM_VIEWPORT="unknown"

  if [ -n "$udid" ]; then
    listing="$(e2e_booted_devices_detailed 2>/dev/null)" || listing=""
    row="$(printf '%s\n' "$listing" | grep -F "$udid" | head -1)"
    if [ -n "$row" ]; then
      E2E_SIM_NAME="$(printf '%s' "$row" | cut -f2)"
      E2E_SIM_MODEL_ID="$(printf '%s' "$row" | cut -f3)"
      local rt; rt="$(printf '%s' "$row" | cut -f4)"
      local v; v="$(e2e_ios_version_from_runtime "$rt")"
      [ -n "$v" ] && E2E_SIM_IOS="$v"
      local vp; vp="$(e2e_viewport_for_device_type "$E2E_SIM_MODEL_ID")"
      [ -n "$vp" ] && E2E_SIM_VIEWPORT="$vp"
    fi
  fi

  E2E_SIM_DEVICE_LINE="${E2E_SIM_NAME} / iOS ${E2E_SIM_IOS} / ${E2E_SIM_VIEWPORT}"
  return 0
}

e2e_warn_if_not_smallest_viewport() {
  local udid="$1" listing="$2" name
  name="$(printf '%s\n' "$listing" | grep -F "$udid" | cut -f2 | head -1)"
  [ -n "$name" ] || name="unknown"

  # INFRA-478 — attribute the device on every run, pass or fail. A verdict that does not
  # name its device is not a verdict: the gate is the only runtime enforcement of the 988
  # reachability contract, and a green whose viewport is unrecorded cannot support a
  # "zero false negatives" claim, because the population it certified is unknown.
  e2e_describe_sim_device "$udid"
  echo "📱 Simulator: ${E2E_SIM_DEVICE_LINE}  ($udid)" >&2

  # THE PREDICATE IS THE DERIVED VIEWPORT, NOT THE DISPLAY NAME (INFRA-478).
  #
  # This used to `case` the simulator's display name against the bare substring
  # "iPhone SE". Two holes, in opposite directions: an iPhone SE 1st-gen is 320x568 —
  # genuinely SMALLER than the declared baseline — and silently satisfied it, while any
  # renamed simulator defeated it. CLAUDE.md already flagged the display-name-not-
  # deviceTypeIdentifier hazard; the viewport is better than either, because it is what
  # the layout assertions actually depend on and it is rename-proof by construction.
  #
  # Still WARN-ONLY. AC 3's reasoning is unchanged and is why INFRA-486 exists: a
  # pre-flight that refuses on a judgement the operator disagrees with trains the
  # `--skip-e2e` reflex the gate exists to prevent. Choosing the device is that item.
  if [ "$E2E_SIM_VIEWPORT" = "unknown" ]; then
    echo "ℹ️  Viewport could not be derived for this device, so the smallest-viewport check" >&2
    echo "   is not being applied. Model and runtime above still identify the run." >&2
    return 0
  fi
  if [ "$E2E_SIM_VIEWPORT" = "$E2E_SMALLEST_SUPPORTED_VIEWPORT" ]; then
    return 0
  fi
  echo "⚠️  This is NOT the smallest supported viewport (${E2E_SMALLEST_SUPPORTED_VIEWPORT}); this run is ${E2E_SIM_VIEWPORT}." >&2
  echo "   To certify it, boot a ${E2E_SMALLEST_SUPPORTED_MODEL} (a viewport is not bootable; a model is)." >&2
  echo "   Layout-sensitive safety assertions (above-the-fold 988 reachability) can pass" >&2
  echo "   here and fail there — DEBUG-432 measured exactly that on one unchanged build." >&2
  echo "   A green run on this device does not certify the small viewport." >&2
  return 0
}

# =========================================================================================
# PER-FLOW CERTIFYING VIEWPORT (INFRA-486)
#
# WHY PER FLOW AND NOT PER SUITE. Only some flows are layout-sensitive. Requiring the whole
# suite to certify 375x667 makes the pin expensive and fragile — DEBUG-477 showed flows
# going red there for HARNESS-geometry reasons that say nothing about the product — and an
# expensive gate is the pressure that produces `--skip-e2e`. Declaring per flow keeps the
# refusal surface small, so most closes never touch a layout-sensitive flow at all.
#
# THIS IS DATA, NOT A VERDICT. Both functions are WARN-ONLY and structurally cannot refuse;
# a jest pin asserts that. Turning a non-certifying run into a verdict token, and into a
# /b-close refusal, is INFRA-493 — deliberately sequenced AFTER the 375x667 measurement so
# a refusal is never armed over unmeasured or known-red flows.

# e2e_flow_certifies <flow-file>
#
# Echoes the viewport this flow's assertions are declared to certify, or `any` when its
# contract is viewport-independent. FAILS CLOSED: no declaration means the smallest
# supported viewport, so a newly added flow is flagged on a large device rather than
# silently certified everywhere. Prose would not survive this — the declaration is a
# grep-able key precisely so the runner, and not a reader, is the consumer.
e2e_flow_certifies() {
  local f="${1:-}" v=""
  if [ -n "$f" ] && [ -r "$f" ]; then
    v="$(grep -m1 -E '^#[[:space:]]*e2e-certifies:' "$f" 2>/dev/null \
         | sed -E 's/^#[[:space:]]*e2e-certifies:[[:space:]]*//; s/[[:space:]]*$//')"
  fi
  [ -n "$v" ] || v="$E2E_SMALLEST_SUPPORTED_VIEWPORT"
  printf '%s\n' "$v"
  return 0
}

# e2e_run_certifies <declared> <ran>   →  `yes` | `no`   (INFRA-493)
#
# THE SINGLE AUTHORITY on whether a run certifies a flow. Both the human-readable label
# below and the verdict token in e2e-safety.sh derive from this one call, because two
# independent copies of the comparison drift: a summary line reading "certifies 375x667"
# beside a receipt reading UNCERTIFIED, with both halves looking right in isolation and
# nothing able to catch it. A jest pin drives the whole matrix through both.
#
# An underivable viewport is NON-certifying for a layout-sensitive flow — "we could not
# derive it" and "it was wrong" are the same quality of evidence. It is still certifying
# for a viewport-independent one: not knowing the viewport cannot invalidate a contract
# that never depended on it, and widening the refusal to those flows is what makes a gate
# unsatisfiable, which is the pressure that produces `--skip-e2e`.
#
# A PREDICATE, NOT A GATE — exits 0 on every path including the refusing one. The refusal
# is `/b-close`'s, over the receipt. A non-zero here would land inside `set -e` territory
# in three sourcing scripts and refuse the RUN rather than the MERGE.
e2e_run_certifies() {
  local declared="${1:-}" ran="${2:-unknown}"
  [ "$declared" = "any" ] && { printf 'yes\n'; return 0; }
  [ "$ran" = "unknown" ] && { printf 'no\n'; return 0; }
  [ "$declared" = "$ran" ] && { printf 'yes\n'; return 0; }
  printf 'no\n'
  return 0
}

# e2e_flow_certification_note <declared> <ran>
#
# The label that goes beside a per-flow result. It CONSUMES the predicate above rather
# than re-deriving it; only the WORDING is decided here.
e2e_flow_certification_note() {
  local declared="${1:-}" ran="${2:-unknown}"
  if [ "$(e2e_run_certifies "$declared" "$ran")" = "yes" ]; then
    [ "$declared" = "any" ] && { printf 'viewport-independent\n'; return 0; }
    printf 'certifies %s\n' "$declared"
    return 0
  fi
  if [ "$ran" = "unknown" ]; then
    printf 'declares %s, viewport underivable — does not certify\n' "$declared"
    return 0
  fi
  printf 'declares %s, ran %s — does not certify\n' "$declared" "$ran"
  return 0
}

# e2e_uncertified_remediation <ran-viewport> <current-udid>   (INFRA-493)
#
# What an operator does about an UNCERTIFIED verdict. PRINTS THE COMMAND; NEVER RUNS IT.
# The gate must not boot or create simulators: the simulator is shared across worktrees and
# INFRA-423's driver-ownership classifier assumes the operator owns the boot, so booting
# one here contaminates a peer's run. A jest pin stubs `xcrun` on PATH and asserts it is
# never invoked, rather than trusting this to look side-effect-free.
#
# Remediation must be ONE COMMAND. That is the whole reason this refusal does not train the
# `--skip-e2e` reflex — an operator who has to interpret a paragraph reaches for the bypass.
# The current device is named because `e2e_resolve_sim_device` refuses at 2+ booted, so
# booting the SE 3 alongside it produces exit 3 instead of a fix.
# STDOUT, not stderr: the only caller is inside e2e-safety.sh's verdict summary, which is
# all stdout. Splitting one block across two streams scrambles it under any redirect.
e2e_uncertified_remediation() {
  local ran="${1:-unknown}" udid="${2:-<udid>}"
  echo "   This run was on ${ran}. Each line above names what that flow declares."
  echo "   Boot the declared device (a viewport is not bootable; a model is):"
  echo "     xcrun simctl shutdown ${udid} && xcrun simctl boot '${E2E_SMALLEST_SUPPORTED_MODEL}'"
  echo "   Then re-run /b-close, which rebuilds onto it and re-runs the scoped set."
  echo "   By hand it is two steps, because the app is not installed on the new device:"
  echo "     npm run e2e:safety:gate && npm run e2e:safety"
  echo "   The gate does not boot it for you — the simulator is shared across worktrees and"
  echo "   whoever owns the boot owns the driver (INFRA-423). Check the UDID above is yours."
  return 0
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
