#!/usr/bin/env bash
# =========================================================================================
# LEASE-WAIT AND HOST-CONTENTION TELEMETRY for the safety gate. SOURCED, never executed.
# (INFRA-490)
#
# WHY THIS FILE EXISTS
# --------------------
# Three locks exist — INFRA-436 (simulator), INFRA-463 (gate worktree), INFRA-472 (the
# pair) — and none of them recorded anything. So the only question that matters before
# building any more concurrency machinery had no answer: HOW OFTEN DOES A SESSION ACTUALLY
# WAIT, AND FOR HOW LONG? Each lock was filed on one captured incident. Each was real; none
# of them is a rate. INFRA-476 already computes peer JVM / driver / build counts and a load
# ratio, then prints an advisory line and discards it.
#
# The inputs were all present. Nothing wrote them down. That is all this file does.
#
# THE FILE LIVES OUTSIDE EVERY WORKTREE, AND THAT IS A CORRECTNESS CONSTRAINT
# ---------------------------------------------------------------------------
# `e2e-provenance.js`'s fingerprint hashes UNTRACKED file contents repo-wide, so a log
# under any worktree changes the tree hash and makes the next provenance verify return
# MISMATCH — forcing a rebuild on every gate run and, under
# `E2E_REQUIRE_CLEAN_PROVENANCE=1`, refusing the close outright. Not $TMPDIR either: macOS
# gives each user a private /var/folders/<hash>/T, and telemetry two sessions cannot both
# append to answers the wrong question. `/tmp/being-e2e-locks` is already an explicit
# shared path for the same class of reason; this is its sibling.
#
# NO LOCK AROUND THE LOG, DELIBERATELY
# ------------------------------------
# Locking the record of lock contention would be circular, and a writer that can block is a
# writer that can wedge the gate. Instead: one `printf` of one line, appended to a file
# opened O_APPEND. A single write under PIPE_BUF (4096) is atomic, so concurrent sessions
# interleave records but never characters. That is the reason records are kept small and
# the reason a label with a newline in it is flattened before it is written — a raw newline
# would split one record into two unparseable ones and silently corrupt every later reader.
#
# IT FAILS OPEN, ALWAYS
# ---------------------
# Every function returns 0 on every path. Telemetry that can fail an acquire would make the
# gate less reliable in the name of measuring its reliability — the same reasoning
# `e2e_host_contention_warn` documents for warning rather than refusing.
#
# NO FORKS ON THE HOT PATH (AC6)
# ------------------------------
# `e2e_lock_acquire` sits on the gate's critical path. JSON escaping and line assembly are
# done with `printf` and `${var//x/y}`, both bash builtins, and the acquisition epoch is
# REUSED from the owner record rather than re-`date`d — so an uncontended acquire pays one
# `>>` and nothing else. Helpers assign to a named global instead of printing, because
# `$( )` around a function forks a subshell even when nothing is executed.
#
# APPEND-ONLY. NO ROTATION, NO AGGREGATION AT WRITE TIME. This is a two-week collection
# feeding one decision (INFRA-491), not a metrics system. `e2e_telemetry_summary` reads it
# back; delete the file when the decision is made.
#
# This file sets no `set` options: callers differ in `set -e`/`pipefail`, so every function
# handles its own failure explicitly.
# =========================================================================================

E2E_TELEMETRY_DIR="${E2E_TELEMETRY_DIR:-/tmp/being-e2e-telemetry}"
E2E_TELEMETRY_FILE="${E2E_TELEMETRY_FILE:-$E2E_TELEMETRY_DIR/events.jsonl}"

e2e_telemetry_enabled() {
  case "${E2E_TELEMETRY:-1}" in
    '' | 0 | false | no | off) return 1 ;;
    *) return 0 ;;
  esac
}

# Sets _E2E_TEL_S to a JSON string literal, quotes included. Pure builtin — no fork.
# Order matters: backslashes first, or the escapes added for quotes get escaped again.
_e2e_tel_str() {
  local s="${1:-}"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/ }"
  s="${s//$'\r'/ }"
  s="${s//$'\t'/ }"
  _E2E_TEL_S="\"$s\""
}

# Sets _E2E_TEL_N to a JSON number, or to `null` when the value is absent or not a number.
# `unknown` is what e2e_host_contention_facts prints when sysctl gave nothing, and null is
# the honest rendering: "not measured" is not the same fact as zero.
_e2e_tel_num() {
  local v="${1:-}"
  case "$v" in
    '' | unknown) _E2E_TEL_N='null'; return 0 ;;
    *.*.* | *[!0-9.]*) _E2E_TEL_N='null'; return 0 ;;
    [0-9]*) _E2E_TEL_N="$v" ;;
    *) _E2E_TEL_N='null' ;;
  esac
}

# Sets _E2E_TEL_I to a non-negative integer, defaulting to 0. For fields where absent
# genuinely means zero (a wait that did not happen), unlike _e2e_tel_num above.
_e2e_tel_int() {
  case "${1:-}" in
    '' | *[!0-9]*) _E2E_TEL_I=0 ;;
    *) _E2E_TEL_I="$1" ;;
  esac
}

# Read one `key=value` token out of an e2e_host_contention_facts line. Sets _E2E_TEL_F.
# Pure builtin, so this does not depend on e2e-host-contention.sh having been sourced.
_e2e_tel_fact() {
  local key="$2" tok
  _E2E_TEL_F=''
  # Deliberate word splitting: the facts line is a space-separated token list.
  # shellcheck disable=SC2086
  for tok in ${1:-}; do
    case "$tok" in
      "$key="*) _E2E_TEL_F="${tok#"$key="}"; return 0 ;;
    esac
  done
  return 0
}

# e2e_telemetry_append <one-json-line>
e2e_telemetry_append() {
  e2e_telemetry_enabled || return 0
  local f="${E2E_TELEMETRY_FILE:-$E2E_TELEMETRY_DIR/events.jsonl}" d
  [ -n "$f" ] || return 0
  d="${f%/*}"
  # `[ -d ]` is a builtin, so the mkdir forks once per machine rather than once per write.
  [ "$d" = "$f" ] || [ -d "$d" ] || mkdir -p "$d" 2>/dev/null || return 0
  printf '%s\n' "$1" >> "$f" 2>/dev/null || true
  return 0
}

# e2e_telemetry_lock <epoch> <ns> <key> <outcome> <waited_s> <label> \
#                    [holder_pid] [holder_label] [forced]
#
# outcome ∈ acquired | reclaimed-stale | refused | inherited.
#
# `inherited` is a fourth value the acceptance criteria do not name, and it earns its place:
# a child honouring its parent's lease (INFRA-472) could never have waited, so folding it
# into `acquired` would drag the contended rate toward zero by construction — the
# "measuring the wrong thing" hazard this item was filed against. `e2e_telemetry_summary`
# excludes it from the denominator.
#
# A FORCED override is a flag, not a fifth outcome. It did acquire; what is unusual is that
# it stepped over a LIVE holder, which is a property of the acquire rather than a different
# kind of acquire.
e2e_telemetry_lock() {
  e2e_telemetry_enabled || return 0
  local epoch ns key outcome waited label holder_pid holder_label forced line contended

  _e2e_tel_int "${1:-}"; epoch="$_E2E_TEL_I"
  _e2e_tel_str "${2:-}"; ns="$_E2E_TEL_S"
  _e2e_tel_str "${3:-}"; key="$_E2E_TEL_S"
  _e2e_tel_str "${4:-}"; outcome="$_E2E_TEL_S"
  _e2e_tel_int "${5:-}"; waited="$_E2E_TEL_I"
  _e2e_tel_str "${6:-}"; label="$_E2E_TEL_S"
  holder_pid="${7:-}"
  forced="${9:-}"

  # Contended means the first `mkdir` lost. Deriving it from `waited > 0` alone would miss
  # a contended acquire that resolved inside the same second, and on a quiet machine those
  # are the common case — so a named holder counts, and so does `reclaimed-stale`, which
  # can only be reached by having lost a mkdir first.
  contended='false'
  if [ -n "$holder_pid" ] || [ "$waited" -gt 0 ] || [ "${4:-}" = "reclaimed-stale" ]; then
    contended='true'
  fi

  line="{\"epoch\":$epoch,\"kind\":\"lock\",\"ns\":$ns,\"key\":$key,\"outcome\":$outcome"
  line="$line,\"waited_s\":$waited,\"contended\":$contended,\"pid\":$$,\"label\":$label"
  if [ -n "$holder_pid" ]; then
    _e2e_tel_int "$holder_pid"
    _e2e_tel_str "${8:-}"; holder_label="$_E2E_TEL_S"
    line="$line,\"holder_pid\":$_E2E_TEL_I,\"holder_label\":$holder_label"
  fi
  case "$forced" in
    '' | 0 | false | no) ;;
    *) line="$line,\"forced\":true" ;;
  esac

  e2e_telemetry_append "$line}"
  return 0
}

# e2e_telemetry_flow <flow> <verdict> <elapsed_s> <viewport> <host-facts-line>
#
# The host facts are the INFRA-476 reading taken once at gate start, restated on every flow
# rather than written once for the suite: correlating a slow or red flow with host load is
# the whole point, and a reader that has to join two record kinds to do it will not.
# `pid` is what groups the flows of one invocation back together.
e2e_telemetry_flow() {
  e2e_telemetry_enabled || return 0
  local flow verdict elapsed viewport facts line k
  local jvms drivers builds load1 ncpu ratio

  _e2e_tel_str "${1:-}"; flow="$_E2E_TEL_S"
  _e2e_tel_str "${2:-}"; verdict="$_E2E_TEL_S"
  _e2e_tel_int "${3:-}"; elapsed="$_E2E_TEL_I"
  _e2e_tel_str "${4:-}"; viewport="$_E2E_TEL_S"
  facts="${5:-}"

  line="{\"epoch\":$(date +%s),\"kind\":\"flow\",\"flow\":$flow,\"verdict\":$verdict"
  line="$line,\"elapsed_s\":$elapsed,\"viewport\":$viewport,\"pid\":$$"
  for k in peer_jvms peer_drivers other_xcodebuild load1 ncpu ratio; do
    _e2e_tel_fact "$facts" "$k"
    _e2e_tel_num "$_E2E_TEL_F"
    line="$line,\"$k\":$_E2E_TEL_N"
  done

  e2e_telemetry_append "$line}"
  return 0
}

# e2e_telemetry_settle <host-facts-line>
#
# INFRA-500. One record per gate run, written AFTER the settle, so `load1`/`ratio` are the
# figures the flows actually ran under rather than the ones they inherited from the build.
# outcome ∈ quiet | settled | timeout | peers | unknown | disabled.
#
# Deliberately its own kind rather than extra columns on the flow record: a settle happens
# once per invocation, so repeating it per flow would make anyone counting settles count
# flows instead — the same "measuring the wrong thing" hazard `inherited` is excluded for.
# `e2e_telemetry_summary` does not report it; this is written for the next recalibration of
# E2E_HOST_LOAD_WARN_RATIO, which read the raw log rather than the summary.
e2e_telemetry_settle() {
  e2e_telemetry_enabled || return 0
  local outcome waited line k
  _e2e_tel_fact "${1:-}" settle
  # A facts line with no settle tokens never went through the settle — nothing to record.
  [ -n "$_E2E_TEL_F" ] || return 0
  _e2e_tel_str "$_E2E_TEL_F"; outcome="$_E2E_TEL_S"
  _e2e_tel_fact "${1:-}" settle_waited_s
  _e2e_tel_int "$_E2E_TEL_F"; waited="$_E2E_TEL_I"

  line="{\"epoch\":$(date +%s),\"kind\":\"settle\",\"outcome\":$outcome"
  line="$line,\"waited_s\":$waited,\"pid\":$$"
  for k in peer_jvms peer_drivers other_xcodebuild load1 ncpu ratio; do
    _e2e_tel_fact "${1:-}" "$k"
    _e2e_tel_num "$_E2E_TEL_F"
    line="$line,\"$k\":$_E2E_TEL_N"
  done

  e2e_telemetry_append "$line}"
  return 0
}

# e2e_telemetry_summary [file]
#
# AC5 — "a telemetry file nobody can read is not telemetry." One command, no dependencies
# beyond awk. Percentiles are NEAREST RANK on the sorted sample (p = value at
# ceil(p*n)), stated here because a p90 whose definition is unwritten is not comparable
# across readings.
#
# The sort is an insertion sort rather than a pipe to sort(1), so the whole report is one
# pass of one tool: macOS ships BWK awk, which has no asort(). O(n^2) is fine because the
# collection is bounded by design — two weeks of gate runs, not a metrics system. If this
# ever feels slow, the answer is to delete the log, which is also the answer to the
# question it was collected for.
e2e_telemetry_summary() {
  local file="${1:-${E2E_TELEMETRY_FILE:-$E2E_TELEMETRY_DIR/events.jsonl}}"

  if [ ! -s "$file" ]; then
    printf 'no telemetry recorded yet at %s\n' "$file"
    return 0
  fi

  awk -v FILE="$file" '
    function fstr(s, k,   m, t, e) {
      t = "\"" k "\":\""
      m = index(s, t); if (m == 0) return ""
      s = substr(s, m + length(t))
      e = index(s, "\"")
      return e ? substr(s, 1, e - 1) : ""
    }
    function fnum(s, k,   m, t) {
      t = "\"" k "\":"
      m = index(s, t); if (m == 0) return ""
      s = substr(s, m + length(t))
      if (match(s, /^-?[0-9]+(\.[0-9]+)?/)) return substr(s, 1, RLENGTH)
      return ""
    }
    function isort(a, n,   i, j, v) {
      for (i = 2; i <= n; i++) {
        v = a[i]; j = i - 1
        while (j >= 1 && a[j] > v) { a[j + 1] = a[j]; j-- }
        a[j + 1] = v
      }
    }
    function rank(a, n, p,   r) {
      if (n < 1) return "-"
      r = int(p * n); if (p * n > r) r = r + 1
      if (r < 1) r = 1; if (r > n) r = n
      return a[r] "s"
    }
    {
      kind = fstr($0, "kind")
      if (kind == "lock") {
        o = fstr($0, "outcome"); oc[o]++
        if (o == "inherited") { inherited++; next }
        locks++
        w = fnum($0, "waited_s"); if (w == "") w = 0
        waits[++nw] = w + 0
        if (index($0, "\"contended\":true")) contended++
      } else if (kind == "flow") {
        flows++
        vc[fstr($0, "verdict")]++
        e = fnum($0, "elapsed_s"); if (e != "") els[++ne] = e + 0
      }
    }
    END {
      isort(waits, nw); isort(els, ne)
      printf "📊 e2e gate telemetry — %s\n", FILE

      rate = (locks > 0) ? sprintf("%.1f%%", 100 * contended / locks) : "n/a"
      printf "   lock acquires   %d    (contended %d = %s; inherited %d not counted)\n",
             locks, contended, rate, inherited + 0
      printf "   wait median     %s     p90  %s     max  %s\n",
             rank(waits, nw, 0.5), rank(waits, nw, 0.9), rank(waits, nw, 1.0)

      order = "acquired reclaimed-stale refused inherited"
      n = split(order, ord, " "); line = ""
      for (i = 1; i <= n; i++) {
        if (ord[i] in oc) {
          line = line (line == "" ? "" : " · ") ord[i] " " oc[ord[i]]
          seen[ord[i]] = 1
        }
      }
      for (o in oc) if (!(o in seen)) line = line (line == "" ? "" : " · ") o " " oc[o]
      printf "   outcomes        %s\n", (line == "" ? "none" : line)

      if (flows > 0) {
        vline = ""
        vorder = "PASS FAIL TIMEOUT"
        m = split(vorder, vo, " ")
        for (i = 1; i <= m; i++) if (vo[i] in vc) {
          vline = vline (vline == "" ? "" : " · ") vo[i] " " vc[vo[i]]; vseen[vo[i]] = 1
        }
        for (v in vc) if (!(v in vseen)) vline = vline (vline == "" ? "" : " · ") v " " vc[v]
        printf "   flow runs       %d    (%s)\n", flows, vline
        printf "   flow median     %s     p90  %s     max  %s\n",
               rank(els, ne, 0.5), rank(els, ne, 0.9), rank(els, ne, 1.0)
      }
    }
  ' "$file"
  return 0
}
