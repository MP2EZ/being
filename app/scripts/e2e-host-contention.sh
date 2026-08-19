#!/usr/bin/env bash
# =========================================================================================
# HOST CONTENTION reporting for the safety gate. SOURCED, never executed. (INFRA-476)
#
# WHY THIS FILE EXISTS
# --------------------
# The gate is single-DEVICE by construction: `e2e_resolve_sim_device` resolves exactly one
# UDID and refuses when 2+ are booted (INFRA-405). It is NOT single-MACHINE-RUN, and
# nothing enforces that. Two worktrees can each resolve their own simulator, clear every
# pre-flight — provenance, launcher-free, env parity, LSApplicationQueriesSchemes — and
# still invalidate each other's result by starving the host.
#
# Measured on one unchanged tree, Release build, clean provenance (DEBUG-473):
#
#   host state                                  flow wall-clock          verdict
#   idle (load ~3-5, 0 peers)                   1m57s x5, <1% variance   PASS x5
#   2 peer drivers + 1 Xcode build (load 300+)  2m21s / 15m12s / 45m20s  FAIL
#
# A single `scrollUntilVisible` iteration cost ~1.5s idle and up to 13.7s contended. Under
# load the FAILING ELEMENT WANDERED between `profile-card-export` and `profile-card-delete`
# across runs of a byte-identical tree. So this is not "a flaky test" — it is a false red
# that carries a plausible, specific, and WRONG causal story, which is strictly more
# expensive than a red with no story at all. DEBUG-473 was filed as a 402x874 fold defect
# on the strength of one, blocked a feature branch, and cost a full investigation before
# `maestro hierarchy` showed both cards 100% inside the fold.
#
# IT WARNS. IT NEVER FAILS.
# -------------------------
# Same reasoning `e2e_warn_if_not_smallest_viewport` documents: a pre-flight that refuses
# on a judgement the operator disagrees with trains the `--skip-e2e` reflex the gate exists
# to prevent. A false "someone else is running" means the human does not run the gate at
# all — failing toward NOT TESTING, which DEBUG-392 recorded happening in exactly this
# shape. So: no `exit`, `return 0` on every path including the degraded one, and never
# invoked in a `|| exit 1` position.
#
# This is ADVISORY REPORTING ONLY. It takes no lock and grants no exclusion; INFRA-472
# owns any actual lease. It deliberately does not wait on that item.
#
# Identity is by EXECUTABLE, never by command line — `ps -o args` also matches any shell
# that merely MENTIONS the string, and Claude Code wraps Bash calls in `/bin/zsh -c '...'`,
# so an args-matched check is right interactively and wrong from a script or an agent
# (DEBUG-392, derived independently three times). Process reading is delegated to
# e2e-driver-ownership.sh's `_e2e_ps_table`, which since INFRA-476 reads `comm` and `args`
# in separate `ps` invocations because macOS caps `comm` at 16 characters when both are
# requested at once.
#
# This file sets no `set` options: callers differ in `set -e`/`pipefail`, so every function
# handles its own failure explicitly.
# =========================================================================================

# Self-contained when sourced alone (its own unit test does this); a no-op in the gate,
# where e2e-safety.sh has already sourced the ownership helper.
if ! command -v e2e_maestro_jvm_pids >/dev/null 2>&1; then
  # shellcheck source=scripts/e2e-driver-ownership.sh
  . "$(dirname "${BASH_SOURCE[0]}")/e2e-driver-ownership.sh"
fi

# 1-minute load average. `sysctl -n vm.loadavg` prints `{ 3.93 8.40 9.16 }`, so the 1-min
# figure is field 2. Prints nothing if unavailable — the caller degrades, never fails.
_e2e_load1() {
  sysctl -n vm.loadavg 2>/dev/null | awk '{ if ($2 ~ /^[0-9.]+$/) print $2 }'
}

_e2e_ncpu() {
  sysctl -n hw.ncpu 2>/dev/null | awk '{ if ($1 ~ /^[0-9]+$/) print $1 }'
}

# PURE. Prints ONE machine-readable line and nothing else:
#
#   peer_jvms=<n> peer_drivers=<n> other_xcodebuild=<n> load1=<f|unknown> ncpu=<n|unknown> ratio=<f|unknown>
#
#   $1 own_pgid — this run's process group; rows in it are OURS and never counted as peers.
#                 Empty at pre-flight (no `$child` yet), which counts everything as a peer —
#                 correct, because at that point nothing IS ours.
#
# A peer DRIVER is an xcodebuild running `test-without-building`; anything else on the
# xcodebuild executable is a compile. The two mean different things to the operator, so
# they are counted separately rather than summed. `test-without-building` here is a
# NARROWING predicate applied to an already executable-established set, which is not the
# substring-as-identity defect — the same distinction e2e-driver-ownership.sh draws for
# the UDID.
e2e_host_contention_facts() {
  _own_pgid="${1:-}"

  _counts="$(_e2e_ps_table | awk -v own="$_own_pgid" '
    {
      is_ours = (own != "" && $3 == own)
      if (is_ours) next
      if ($4 ~ /(^|\/)java$/ && index($0, "maestro.cli.AppKt")) { jvms++; next }
      if ($4 ~ /(^|\/)xcodebuild$/) {
        if (index($0, "test-without-building")) drivers++; else builds++
      }
    }
    END { printf "%d %d %d", jvms + 0, drivers + 0, builds + 0 }
  ' 2>/dev/null)"
  [ -n "$_counts" ] || _counts="0 0 0"

  _jvms="$(echo "$_counts" | awk '{print $1}')"
  _drivers="$(echo "$_counts" | awk '{print $2}')"
  _builds="$(echo "$_counts" | awk '{print $3}')"

  _load1="$(_e2e_load1)"
  _ncpu="$(_e2e_ncpu)"
  _ratio="unknown"
  if [ -n "$_load1" ] && [ -n "$_ncpu" ] && [ "$_ncpu" != "0" ]; then
    _ratio="$(awk -v l="$_load1" -v n="$_ncpu" 'BEGIN { printf "%.2f", l / n }' 2>/dev/null)"
    [ -n "$_ratio" ] || _ratio="unknown"
  fi

  printf 'peer_jvms=%s peer_drivers=%s other_xcodebuild=%s load1=%s ncpu=%s ratio=%s\n' \
    "$_jvms" "$_drivers" "$_builds" "${_load1:-unknown}" "${_ncpu:-unknown}" "$_ratio"
  return 0
}

# Read one field out of a facts line.
_e2e_fact() {
  echo "$1" | tr ' ' '\n' | awk -F= -v k="$2" '$1 == k { print $2 }'
}

# The always-printed one-liner. Identity of the host at gate start, contended or not —
# a quiet reading is evidence too, and only worth having if it is always present.
e2e_host_summary_line() {
  _f="${1:-}"
  printf '🖥️  Host at gate start: load1 %s / %s cpu (%sx) · %s peer maestro JVM · %s peer driver · %s other xcodebuild\n' \
    "$(_e2e_fact "$_f" load1)" "$(_e2e_fact "$_f" ncpu)" "$(_e2e_fact "$_f" ratio)" \
    "$(_e2e_fact "$_f" peer_jvms)" "$(_e2e_fact "$_f" peer_drivers)" "$(_e2e_fact "$_f" other_xcodebuild)"
  return 0
}

# Warn ONLY when contended. Returns 0 unconditionally — see the header. The threshold is
# env-tunable in the same shape as E2E_SMALLEST_SUPPORTED_MODEL. 1.0x sits ~2x above the
# observed idle ceiling (3-5 on hw.ncpu=10, i.e. 0.3-0.5x) and an order of magnitude below
# the contended floor (30-48x), so the band it splits is empty in the measurements.
e2e_host_contention_warn() {
  _f="${1:-}"
  _jvms="$(_e2e_fact "$_f" peer_jvms)"
  _drivers="$(_e2e_fact "$_f" peer_drivers)"
  _builds="$(_e2e_fact "$_f" other_xcodebuild)"
  _ratio="$(_e2e_fact "$_f" ratio)"
  _threshold="${E2E_HOST_LOAD_WARN_RATIO:-1.0}"

  _peers=$(( ${_jvms:-0} + ${_drivers:-0} + ${_builds:-0} ))
  _loaded=0
  if [ "$_ratio" != "unknown" ] && [ -n "$_ratio" ]; then
    _loaded="$(awk -v r="$_ratio" -v t="$_threshold" 'BEGIN { print (r >= t) ? 1 : 0 }' 2>/dev/null)"
    [ -n "$_loaded" ] || _loaded=0
  fi

  if [ "$_peers" -eq 0 ] && [ "$_loaded" -eq 0 ]; then
    return 0
  fi

  {
    echo ""
    echo "⚠️  HOST LOOKS CONTENDED — a red below may not be about your code."
    echo "    $(e2e_host_summary_line "$_f")"
    echo ""
    echo "    Measured on one unchanged tree (DEBUG-473): idle 1m57s x5 with <1% variance,"
    echo "    contended 2m21s / 15m12s / 45m20s. One scrollUntilVisible iteration went from"
    echo "    ~1.5s to 13.7s, and the FAILING ELEMENT WANDERED between profile-card-export"
    echo "    and profile-card-delete across runs of a byte-identical tree."
    echo ""
    echo "    So treat a failure here as unattributed until the host is quiet. Do NOT raise"
    echo "    flow timeouts to survive this: a machine slow enough to blow a scroll budget"
    echo "    is one where the crisis assertions — the ~10s assertVisible standing in for"
    echo "    the <3s 988 budget — are not trustworthy either."
    echo ""
    echo "    This is ADVISORY. Nothing is blocked, and you may well be right to continue."
    echo "    Tune with E2E_HOST_LOAD_WARN_RATIO (current: ${_threshold}x)."
    echo ""
  } >&2
  return 0
}

# Seconds -> "1m57s" / "45s". Used on every verdict line so a 45-minute "pass" reads as
# untrustworthy rather than green.
e2e_fmt_elapsed() {
  _s="${1:-}"
  case "$_s" in
    ''|*[!0-9]*) printf '?s\n'; return 0 ;;
  esac
  if [ "$_s" -ge 60 ]; then
    printf '%dm%ds\n' $(( _s / 60 )) $(( _s % 60 ))
  else
    printf '%ds\n' "$_s"
  fi
  return 0
}
