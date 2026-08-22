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
# `e2e_host_settle` (INFRA-500) is the one thing here that consumes time, and it does not
# weaken that contract: a bounded WAIT still runs every flow, changes no verdict, excludes
# nothing, and can be switched off with E2E_HOST_SETTLE_MAX_S=0. Waiting is not refusing.
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

# The always-printed one-liner. Identity of the host when the flows begin, contended or
# not — a quiet reading is evidence too, and only worth having if it is always present.
# Says FLOW start, not gate start: since INFRA-500 the reading is taken after the settle,
# so it can be minutes younger than the gate, and it is the load the flows actually ran
# under that a reader needs to correlate a slow or red flow against.
e2e_host_summary_line() {
  _f="${1:-}"
  printf '🖥️  Host at flow start: load1 %s / %s cpu (%sx) · %s peer maestro JVM · %s peer driver · %s other xcodebuild\n' \
    "$(_e2e_fact "$_f" load1)" "$(_e2e_fact "$_f" ncpu)" "$(_e2e_fact "$_f" ratio)" \
    "$(_e2e_fact "$_f" peer_jvms)" "$(_e2e_fact "$_f" peer_drivers)" "$(_e2e_fact "$_f" other_xcodebuild)"
  return 0
}

# Warn ONLY when contended. Returns 0 unconditionally — see the header. The threshold is
# env-tunable in the same shape as E2E_SMALLEST_SUPPORTED_MODEL.
#
# 0.7x, RE-DERIVED FROM INFRA-490 TELEMETRY (INFRA-500)
# ----------------------------------------------------
# This was 1.0x, justified as splitting a band that was "empty in the measurements". The
# band was not empty; it was UNSAMPLED. DEBUG-473's sample is bimodal — idle at 0.3-0.5x
# and catastrophic peer contention at 30-48x — and holds no observation of the MODERATE
# band that a gate's own build leaves behind. A 1073s `e2e:safety:gate` build drove load1
# to 14.88 on hw.ncpu=10; the documented recipe started the flows straight into that decay
# at 0.91x; `daily-loop-quick-depth` failed at `scrollUntilVisible`; and nothing warned,
# because 0.91 < 1.0 and the build had already exited so the peer count was 0.
#
# 9 paired same-flow comparisons on one unchanged binary (/tmp/being-e2e-telemetry):
#
#   0.29x -> 0.91x    deeplink-consent-gate 16s->30s (+88%)   daily-loop-deeplink 13s->22s (+69%)
#                     gad7-severe 23s->31s (+35%)   crisis-button-reachability 104s->140s (+35%)
#                     daily-loop-quick-depth 64s -> FAIL
#   did not move      phq9-severe-completion, q9-single-alert, reconsent-stale (-13%..-5%)
#
# Two readings any future re-derivation has to keep:
#   - The stretch is SELECTIVE. Flows dominated by `scrollUntilVisible` and waits stretch
#     35-88%; fixed-duration flows (typing, timed waits) do not move at all. The risk sits
#     in scroll budgets, not in wall-clock generally.
#   - Elapsed time HIDES the stretch on exactly the runs that fail. The FAIL above took
#     61s against 64s/65s passes — it aborted at the blown budget instead of completing.
#
# So 0.7x is the LOWER EDGE OF THE UNSAMPLED BAND, not a fit: 1.4x above the documented
# idle ceiling (0.5x) and 23% below the lowest ratio at which harm has ever been observed
# (0.91x). Deliberately not fitted to load, because load does not cleanly predict verdict —
# `crisis-button-reachability` PASSED at 1.21x, above the old threshold. The asymmetry
# settles it: the warning blocks nothing, so over-warning costs a line of stderr, while
# under-warning cost a full suite re-run plus the diagnosis to rule out a layout regression
# that was never there.
e2e_host_contention_warn() {
  _f="${1:-}"
  _jvms="$(_e2e_fact "$_f" peer_jvms)"
  _drivers="$(_e2e_fact "$_f" peer_drivers)"
  _builds="$(_e2e_fact "$_f" other_xcodebuild)"
  _ratio="$(_e2e_fact "$_f" ratio)"
  _threshold="${E2E_HOST_LOAD_WARN_RATIO:-0.7}"

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
    echo "    That is the severe end. The MODERATE end matters more here, because it is"
    echo "    where this threshold now fires (INFRA-490, paired same-flow, one binary): at"
    echo "    0.91x, scroll-bound flows stretched 35-88% and daily-loop-quick-depth failed"
    echo "    at scrollUntilVisible, while fixed-duration flows did not move at all. So a"
    echo "    modest ratio is not reassuring for a flow that scrolls."
    echo ""
    echo "    So treat a failure here as unattributed until the host is quiet. Do NOT raise"
    echo "    flow timeouts to survive this: a machine slow enough to blow a scroll budget"
    echo "    is one where the crisis assertions — the ~10s assertVisible standing in for"
    echo "    the <3s 988 budget — are not trustworthy either."
    echo ""
    echo "    This is ADVISORY. Nothing is blocked, and you may well be right to continue."
    echo "    Tune with E2E_HOST_LOAD_WARN_RATIO (current: ${_threshold}x); the pre-flight"
    echo "    settle that tries to avoid this is E2E_HOST_SETTLE_MAX_S."
    echo ""
  } >&2
  return 0
}

# e2e_host_settle [own_pgid]
#
# A BOUNDED WAIT for the host to quieten, run once immediately before flow 1. Prints the
# POST-settle facts line on stdout with two extra tokens appended:
#
#   ... ratio=<f> settle=<outcome> settle_waited_s=<n>
#
# outcome ∈ quiet | settled | timeout | peers | unknown | disabled.
#
# Extra TOKENS rather than globals because the caller reads this through `$( )`, which
# forks a subshell and would discard anything assigned inside. `_e2e_fact` matches by key,
# so every existing reader ignores the additions.
#
# IT IS A WAIT AND NEVER A REFUSAL (AC3)
# --------------------------------------
# The header's rejection of refusing stands and is not overturned here: a pre-flight that
# refuses on a judgement the operator disagrees with trains the `--skip-e2e` reflex the
# gate exists to prevent. Waiting 60-120s and then running still RUNS — every flow, same
# verdict alphabet, nothing excluded. There is no path out of this function that skips a
# flow, and there must never be one.
#
# WHY IT TARGETS OUR OWN LOAD AND NOT A PEER'S (AC4)
# --------------------------------------------------
# The reproducible case is SELF-INFLICTED: `e2e:safety:gate` compiles for 90s to 21min and
# the documented recipe starts the flows immediately into the decay. A 1-minute load
# average sheds that on a ~60s time constant, so 14.88 -> under 7.0 is ~16s of waiting —
# precisely what a bounded wait fixes. A peer mid-build holds the host for as long as ITS
# build takes, which no useful bound waits out, so a peer ends the wait and the warning
# does the work instead. The facts are re-read on EVERY poll, not trusted from entry, so a
# peer that starts during the wait ends it too.
e2e_host_settle() {
  _sp_pgid="${1:-}"
  _sp_max="${E2E_HOST_SETTLE_MAX_S:-120}"
  _sp_int="${E2E_HOST_SETTLE_INTERVAL_S:-5}"
  _sp_thresh="${E2E_HOST_LOAD_WARN_RATIO:-0.7}"
  # Degrade to the defaults rather than failing: a typo'd knob must not wedge the gate.
  case "$_sp_max" in '' | *[!0-9]*) _sp_max=120 ;; esac
  case "$_sp_int" in '' | *[!0-9]* | 0) _sp_int=5 ;; esac

  _sp_waited=0
  _sp_announced=0
  _sp_outcome=''
  _sp_facts="$(e2e_host_contention_facts "$_sp_pgid")"
  [ "$_sp_max" -eq 0 ] && _sp_outcome='disabled'

  while [ -z "$_sp_outcome" ]; do
    _sp_j="$(_e2e_fact "$_sp_facts" peer_jvms)"
    _sp_d="$(_e2e_fact "$_sp_facts" peer_drivers)"
    _sp_b="$(_e2e_fact "$_sp_facts" other_xcodebuild)"
    _sp_ratio="$(_e2e_fact "$_sp_facts" ratio)"

    if [ $(( ${_sp_j:-0} + ${_sp_d:-0} + ${_sp_b:-0} )) -gt 0 ]; then
      _sp_outcome='peers'
    elif [ -z "$_sp_ratio" ] || [ "$_sp_ratio" = 'unknown' ]; then
      # No load reading means no basis for waiting. Proceed; the summary line still prints
      # `unknown`, which is the honest thing to show.
      _sp_outcome='unknown'
    elif [ "$(awk -v r="$_sp_ratio" -v t="$_sp_thresh" 'BEGIN { print (r < t) ? 1 : 0 }' 2>/dev/null)" = '1' ]; then
      [ "$_sp_waited" -eq 0 ] && _sp_outcome='quiet' || _sp_outcome='settled'
    elif [ "$_sp_waited" -ge "$_sp_max" ]; then
      _sp_outcome='timeout'
    else
      if [ "$_sp_announced" -eq 0 ]; then
        _sp_announced=1
        printf '\n⏳ Host is still warm from the build (%sx, threshold %sx) — settling for up to %ss\n' \
          "$_sp_ratio" "$_sp_thresh" "$_sp_max" >&2
        printf '    before flow 1. This is a WAIT, NOT A REFUSAL: every flow still runs either\n' >&2
        printf '    way. Disable with E2E_HOST_SETTLE_MAX_S=0.\n' >&2
      fi
      sleep "$_sp_int"
      _sp_waited=$(( _sp_waited + _sp_int ))
      _sp_facts="$(e2e_host_contention_facts "$_sp_pgid")"
      continue
    fi
  done

  # Say WHICH of the two things happened (AC2), but only if a wait was ever announced —
  # otherwise the common quiet run gains a line that reports nothing.
  if [ "$_sp_announced" -eq 1 ]; then
    case "$_sp_outcome" in
      settled)
        printf '    … settled to %sx after %ss. Running.\n\n' \
          "$(_e2e_fact "$_sp_facts" ratio)" "$_sp_waited" >&2 ;;
      timeout)
        printf '    … still %sx after %ss, so the bound is up and the flows run anyway.\n' \
          "$(_e2e_fact "$_sp_facts" ratio)" "$_sp_waited" >&2
        printf '      The warning below is the record of that, not a refusal.\n\n' >&2 ;;
      peers)
        printf '    … a peer started work on this host, which no bounded wait clears.\n' >&2
        printf '      Not waiting further; see the warning below.\n\n' >&2 ;;
      *)
        printf '    … proceeding after %ss (%s).\n\n' "$_sp_waited" "$_sp_outcome" >&2 ;;
    esac
  fi

  printf '%s settle=%s settle_waited_s=%s\n' "$_sp_facts" "$_sp_outcome" "$_sp_waited"
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
