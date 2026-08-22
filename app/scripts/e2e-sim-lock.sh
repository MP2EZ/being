#!/usr/bin/env bash
#
# INFRA-436 — mutual exclusion on the simulator the safety gate builds and runs against.
# SOURCED, never executed (same contract as e2e-sim-device.sh and e2e-driver-ownership.sh),
# so it must not set shell options: e2e-sim-build.sh runs under `set -euo pipefail` and
# e2e-safety.sh under a bare `set -u`.
#
# WHY THIS EXISTS. Captured 2026-08-14: three sessions, one machine. A peer's
# `npm run e2e:safety` was mid-flow on a simulator while this session's e2e-sim-build.sh
# uninstalled and reinstalled fyi.being.app on that same device — twice. Step 3 of the build
# uninstalls FIRST by design, so the peer's app vanished under a running flow and both sides
# died on `java.net.ConnectException` from the XCUITest driver. b-batch.md Step 4.1 assumed
# "a single human serializes that naturally"; true within a batch, false across sessions.
#
# WHAT IT IS NOT FOR. Not correctness — INFRA-384 provenance already fails closed across
# sessions (a foreign binary carries a foreign repoRoot + treeHash, so a peer's verify
# returns MISMATCH and refuses rather than greening). This buys liveness and non-wasted
# work: it prevents the destructive interleaving, which provenance can only detect after
# the fact.
#
# SCOPE: PER-INVOCATION, NOT SPANNING BUILD -> FLOWS. A spanning lock would have to outlive
# the build process, so nothing running could anchor its liveness — there is no process
# meaning "this session is between its build and its flows". That forces a TTL, wrong in
# both directions: too short and it expires mid-review, too long and a crashed session
# wedges the gate for everyone. DEBUG-392 and INFRA-423 are two prior burns from
# process-identity heuristics in this subsystem; a timer would be the third. The residual
# gap — a peer rebuilding between your build and your flows — is exactly what provenance
# already refuses.
#
# THAT RULE IS ABOUT A HAND-RUN GATE, NOT ABOUT A SINGLE-PROCESS CLOSE (INFRA-484). Its whole
# premise is that no process spans build -> flows; run both from ONE shell and that shell is
# the anchor, so no TTL is needed and `E2E_LOCK_INHERITED` lets both children inherit rather
# than contend. So the span is available — and INFRA-484 DECIDED AGAINST IT, on measurement.
# Do not re-derive it as an oversight.
#
# The window is real: 4 of 28 flow-run attempts over 19h refused after a peer built into it
# (INFRA-490 telemetry, 2026-08-21). But the same window shows 17 of 18 gate->flows spans
# already overlapping another session, median 14.5 min and worst 58.3 — so a spanning lease
# would serialise every close on this machine, always, to remove a failure that already fails
# closed. `e2e-safety.sh` instead rebuilds ONCE on a peer-attributed mismatch: the same span,
# charged only to the runs that actually collide.
#
# HOLDER IDENTITY: PID + PROCESS START TIME, never command-line text. That is what keeps
# this clear of the DEBUG-392 defect class: there is no substring to over-match, so no
# `/bin/zsh -c '…'` wrapper can be mistaken for a holder. The start time is the half that
# matters — a bare PID is recycled by the OS, and reclaiming a live peer's lock because an
# unrelated new process inherited the old PID is the silent-wrong-answer failure. `comm` is
# recorded for the human-facing timeout message only and is never load-bearing.
#
# KEY = UDID. INFRA-423 established a UDID cannot ATTRIBUTE a running process to a run
# (two worktrees were pinned to one simulator). Here it is the key for EXCLUSION — the
# device is the contended resource. INFRA-423 observed that two worktrees could share a
# simulator; this is what stops them. Different jobs, nothing regressed.
#
# TWO RESOURCES, ONE PRIMITIVE (INFRA-463). The gate worktree is also shared mutable state
# and needs the same exclusion, so acquire/release take a NAMESPACE alongside the key:
# `sim` (default) keys on a UDID, `gatetree` on a gate-worktree path. The holder logic is
# subtle enough to have been re-derived wrongly twice in this subsystem (DEBUG-392,
# INFRA-423), so it is parameterised rather than copied. The default keeps every existing
# path at /tmp/being-e2e-locks/sim-<udid>.d, which matters: a peer session running an older
# checkout must still contend on the same path as a newer one.
#
# THE SCOPE RULE ABOVE IS ABOUT THE SIMULATOR, NOT ABOUT LOCKS IN GENERAL. It holds because
# both the build and the flows touch the device, with no process spanning them. The gate
# WORKTREE is different: `e2e-safety.sh` re-reads the provenance marker inside the installed
# container and never consults the worktree, so the worktree is an input to `e2e-gate.sh`
# alone. Its entire contention window sits inside one live process and is anchored to that
# process's pid — no TTL, so the objection above does not apply to it.
#
# NOT $TMPDIR. macOS gives each user a private /var/folders/<hash>/T, and a lock two
# sessions cannot both see is not a lock. The root is an explicit shared path.
#
# THE PAIR (INFRA-472). The gate leases two resources, and took them one at a time at
# different moments. That is not enough: the provenance marker lives inside the INSTALLED
# CONTAINER on a device and `simctl install` of the same bundle id replaces it, so two
# sessions building in separate worktrees but installing to one simulator still clobber.
# `e2e_lock_acquire_pair` takes both or neither.
#
# ORDER IS THE DEADLOCK GUARD, AND IT LIVES HERE, NOT AT THE CALL SITE. The moment a session
# holds one lease and waits for another, two sessions taking them in opposite orders wait out
# the full 1800 s — inside `/b-close`, indistinguishable from a hang. The helper sorts its own
# arguments, so every caller acquires in the same global order whether it knows to or not.
#
# INHERITANCE, BECAUSE A PARENT'S LEASE MUST NOT DEADLOCK ITS OWN CHILD. `e2e-gate.sh` holds
# the simulator lease and then invokes `e2e-sim-build.sh`, which acquires the same one.
# `E2E_LOCK_INHERITED` carries `<ns>:<key>:<pid>` tokens to the child. It is NOT inferred from
# the process tree — DEBUG-392 and INFRA-423 are two prior burns from process-identity
# heuristics in this subsystem. Nor is the token trusted on its own: it is honoured only when
# the record ON DISK names that same pid and that pid classifies LIVE, so a stale or
# hand-exported variable falls through to a normal acquire instead of silently disabling the
# lock. A child never owns what it inherited, so release is already a no-op for it — the
# owner pid is the parent's, not `$$`.
#
# ACQUISITION TIME IS RECORDED SEPARATELY FROM PROCESS START. They are different facts: a
# long-lived shell can take a lease hours after it started, and "running since 09:02" then
# badly misreports how long the gate has been held. Appended as a FIFTH field, which is why
# every reader uses `cut -f1..4` for the rest — a peer on an older checkout writes four
# fields, and a record that failed to parse would classify RECYCLED and get a LIVE peer's
# lease reclaimed underneath it.
#
# E2E_LOCK_FORCE EXISTS FOR A GENUINELY WEDGED HOLDER — a process alive but no longer doing
# anything, which the classifier correctly calls LIVE and will never reclaim. Without it the
# only remedy is `rm -rf`ing a path by hand, which the timeout message tells operators never
# to do. It prints the whole record it destroys, because an override that is quiet is
# indistinguishable from a lock that stopped working.

# INFRA-490 — the lease wait is recorded, not just waited out. Self-contained when this
# file is sourced alone (its own unit test does that); a no-op where a caller already
# sourced the writer. Every e2e_telemetry_* function returns 0 on every path, so nothing
# below can be failed by telemetry.
if ! command -v e2e_telemetry_lock >/dev/null 2>&1; then
  if [ -f "$(dirname "${BASH_SOURCE[0]}")/e2e-telemetry.sh" ]; then
    # shellcheck source=scripts/e2e-telemetry.sh
    . "$(dirname "${BASH_SOURCE[0]}")/e2e-telemetry.sh"
  else
    # A missing writer degrades to no-ops rather than killing the caller. An unconditional
    # source of an absent file aborts e2e-sim-build.sh outright under its `set -euo
    # pipefail` — a gate that refuses to run because it cannot measure itself is the exact
    # inversion this telemetry is built to avoid. Loud, though: a recorder that silently
    # stops recording looks identical to a machine with no contention on it.
    echo "⚠️  e2e-telemetry.sh not found — lease-wait telemetry (INFRA-490) is off for this run." >&2
    e2e_telemetry_lock() { return 0; }
    e2e_telemetry_flow() { return 0; }
    e2e_telemetry_append() { return 0; }
    e2e_telemetry_summary() { return 0; }
  fi
fi

E2E_LOCK_ROOT="${E2E_LOCK_ROOT:-/tmp/being-e2e-locks}"

# Default wait. Sized to outlast a legitimate peer: a full 8-flow suite plus its build.
# Fail-fast would make a queue of closes unusable; waiting forever inside /b-close is
# indistinguishable from a hang.
E2E_LOCK_TIMEOUT_DEFAULT="${E2E_LOCK_TIMEOUT:-1800}"

# e2e_lock_dir <key> [namespace]
e2e_lock_dir() {
  [ -n "${1:-}" ] || return 1
  printf '%s/%s-%s.d\n' "$E2E_LOCK_ROOT" "${2:-sim}" "$1"
}

# Human nouns for the contended resource, keyed off the namespace. A gate-worktree timeout
# that says "simulator lock" sends the operator hunting through the wrong subsystem, which
# is the failure mode this whole area keeps relearning.
e2e_lock_resource() {
  case "${1:-sim}" in
    sim)      printf 'simulator lock for %s' "${2:-}" ;;
    # No key: it is a path mangled into one segment, and the caller prints the real one.
    gatetree) printf 'gate-worktree lock' ;;
    *)        printf '%s lock for %s' "${1}" "${2:-}" ;;
  esac
}

e2e_lock_keyname() {
  case "${1:-sim}" in
    sim)      printf 'udid' ;;
    gatetree) printf 'gate worktree path' ;;
    *)        printf 'key' ;;
  esac
}

# lstart is ALWAYS 5 whitespace-separated tokens under awk, including when the day of month
# is space-padded ("Fri Aug  1 …"), because awk collapses runs of blanks. Fields 2-6.
e2e_lock_proc_start() {
  ps -axo pid=,lstart=,comm= 2>/dev/null \
    | awk -v p="$1" '$1 == p { print $2, $3, $4, $5, $6; exit }'
}

e2e_lock_proc_comm() {
  ps -axo pid=,lstart=,comm= 2>/dev/null \
    | awk -v p="$1" '$1 == p { print $7; exit }'
}

# LIVE | DEAD | RECYCLED — the only input to whether a lock may be reclaimed.
e2e_lock_holder_state() {
  local pid="${1:-}" recorded="${2:-}" actual

  # An empty or unreadable record is RECYCLED, never LIVE. A half-written owner file must
  # not wedge the gate permanently, and must not compare equal to an empty `ps` result
  # either — which is what an unguarded string comparison would do.
  if [ -z "$pid" ] || [ -z "$recorded" ]; then
    printf 'RECYCLED\n'
    return 0
  fi

  actual="$(e2e_lock_proc_start "$pid")"
  if [ -z "$actual" ]; then
    printf 'DEAD\n'
    return 0
  fi
  if [ "$actual" = "$recorded" ]; then
    printf 'LIVE\n'
  else
    printf 'RECYCLED\n'
  fi
}

e2e_lock_write_owner() {
  local dir="$1" label="$2" start comm
  start="$(e2e_lock_proc_start "$$")"
  comm="$(e2e_lock_proc_comm "$$")"
  # Refuse to claim ownership we cannot later prove. An owner record with no start time
  # reads as RECYCLED to every other session, i.e. a lock that silently protects nothing.
  [ -n "$start" ] || return 1
  # Published rather than discarded (INFRA-490): it is the acquisition instant, so the
  # telemetry writer reuses it instead of forking a second `date` on the critical path.
  E2E_LOCK_ACQUIRED_AT="$(date +%s)"
  printf '%s\t%s\t%s\t%s\t%s\n' "$$" "$start" "${comm:-unknown}" "$label" "$E2E_LOCK_ACQUIRED_AT" > "$dir/owner"
}

# Field 5 is absent on records written by an older checkout, so this must read as "unknown"
# rather than as a parse failure.
e2e_lock_fmt_time() {
  local e="${1:-}"
  [ -n "$e" ] || { printf 'unknown'; return 0; }
  date -r "$e" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || printf 'epoch %s' "$e"
}

# e2e_lock_inherited_holds <namespace> <key>
#
# 0 when this process's LINEAGE already holds the lease. Verified against the record on disk
# — the token names a pid and is believed only if that pid is the recorded owner AND is LIVE.
e2e_lock_inherited_holds() {
  local ns="${1:-sim}" key="${2:-}" tok want pid dir line
  [ -n "${E2E_LOCK_INHERITED:-}" ] || return 1
  [ -n "$key" ] || return 1
  want="${ns}:${key}:"

  # Deliberate word splitting: the variable is a space-separated token list.
  # shellcheck disable=SC2086
  for tok in ${E2E_LOCK_INHERITED}; do
    case "$tok" in "$want"*) ;; *) continue ;; esac
    pid="${tok#"$want"}"
    [ -n "$pid" ] || continue

    dir="$(e2e_lock_dir "$key" "$ns")" || return 1
    line="$(cat "$dir/owner" 2>/dev/null || true)"
    [ -n "$line" ] || return 1
    [ "$(printf '%s' "$line" | cut -f1)" = "$pid" ] || return 1
    [ "$(e2e_lock_holder_state "$pid" "$(printf '%s' "$line" | cut -f2)")" = "LIVE" ] || return 1
    return 0
  done
  return 1
}

e2e_lock_force_requested() {
  case "${E2E_LOCK_FORCE:-}" in
    '' | 0 | false | no) return 1 ;;
    *) return 0 ;;
  esac
}

# e2e_lock_acquire <key> [timeout_s] [label] [namespace]
e2e_lock_acquire() {
  local udid="${1:-}" timeout="${2:-$E2E_LOCK_TIMEOUT_DEFAULT}" label="${3:-${E2E_LOCK_LABEL:-gate}}"
  local ns="${4:-sim}"
  local dir deadline line pid start comm held acq state now what
  # INFRA-490 — what this acquire cost, assembled as it happens. `reclaimed` counts stale
  # records cleared; `holder_*` is the FIRST contender observed, which is the one that
  # actually made us wait; `wait_t0` is the wait clock and is deliberately NOT `t0` — see
  # where it is stamped, below.
  local t0 wait_t0='' waited reclaimed=0 holder_pid='' holder_label='' forced=''
  E2E_LOCK_ACQUIRED_AT=''

  # An empty key would collapse every resource onto a single lock path — the same "an empty
  # match string must never widen" rule INFRA-423 pins for the reaper.
  if [ -z "$udid" ]; then
    echo "e2e-sim-lock: refusing to acquire with an empty $(e2e_lock_keyname "$ns")." >&2
    echo "  An empty key would collapse every resource in this namespace onto one path." >&2
    echo "  Resolve it first (e2e-sim-device.sh for a simulator), then pass the result." >&2
    return 2
  fi

  # Our own lineage already holds it (INFRA-472). Checked before the mkdir, because the mkdir
  # is exactly what would fail and send this process to wait out its own parent's lease.
  if e2e_lock_inherited_holds "$ns" "$udid"; then
    # Recorded as `inherited`, never as a zero-wait acquire: a child honouring its parent's
    # hold could not have waited, so counting it would drag the contended rate toward zero
    # by construction.
    e2e_telemetry_lock "$(date +%s)" "$ns" "$udid" inherited 0 "$label"
    return 0
  fi

  what="$(e2e_lock_resource "$ns" "$udid")"
  dir="$(e2e_lock_dir "$udid" "$ns")" || return 2
  mkdir -p "$E2E_LOCK_ROOT" 2>/dev/null || true
  now="$(date +%s)"
  t0="$now"
  deadline=$(( now + timeout ))

  attempts=0
  saw_live=0

  while :; do
    attempts=$(( attempts + 1 ))

    # The valve is checked HERE, at the top, gated on `attempts` as well as the clock.
    # `date +%s` has one-second granularity, so with a short timeout the clock can tick
    # between reclaiming a stale lock and re-attempting the mkdir — which made acquire
    # bail out on a lock it had just successfully freed (measured: 2 failures in 5 runs).
    # Requiring a few attempts guarantees a healthy reclaim gets its retry, while a
    # genuinely stuck loop still terminates.
    #
    # `saw_live` stops this path from pre-empting the LIVE branch's message: when a live
    # holder exists the operator must be told WHO holds it, not handed this generic text.
    if [ "$attempts" -ge 3 ] && [ "$saw_live" != "1" ]; then
      now="$(date +%s)"
      if [ "$now" -ge "$deadline" ]; then
        echo "e2e-sim-lock: could not acquire the $what within ${timeout}s," >&2
        echo "  and no live holder was found. Check that $E2E_LOCK_ROOT is writable and that" >&2
        echo "  $dir is not being recreated by a looping process." >&2
        e2e_telemetry_lock "$now" "$ns" "$udid" refused $(( now - ${wait_t0:-$t0} )) "$label" \
          "$holder_pid" "$holder_label" "$forced"
        return 1
      fi
    fi

    # mkdir is the atomic primitive: it either creates the directory or fails, with no
    # test-then-act window for a peer to slip through.
    if mkdir "$dir" 2>/dev/null; then
      if e2e_lock_write_owner "$dir" "$label"; then
        waited=0
        if [ -n "$wait_t0" ]; then
          waited=$(( ${E2E_LOCK_ACQUIRED_AT:-$wait_t0} - wait_t0 ))
          if [ "$waited" -lt 0 ]; then waited=0; fi
        fi
        if [ "$reclaimed" -gt 0 ]; then
          e2e_telemetry_lock "${E2E_LOCK_ACQUIRED_AT:-$t0}" "$ns" "$udid" reclaimed-stale \
            "$waited" "$label" "$holder_pid" "$holder_label" "$forced"
        else
          e2e_telemetry_lock "${E2E_LOCK_ACQUIRED_AT:-$t0}" "$ns" "$udid" acquired \
            "$waited" "$label" "$holder_pid" "$holder_label" "$forced"
        fi
        return 0
      fi
      rmdir "$dir" 2>/dev/null
      echo "e2e-sim-lock: acquired the lock but could not record ownership; released it." >&2
      e2e_telemetry_lock "$t0" "$ns" "$udid" refused 0 "$label" "$holder_pid" "$holder_label" "$forced"
      return 1
    fi

    # WE LOST THE MKDIR — only from here is the clock measuring someone else. Anchoring the
    # wait at function entry instead made an UNCONTENDED acquire report a phantom 1s wait
    # whenever it straddled a second boundary: `date +%s` is second-granular and this
    # function spends ~100ms in its own two `ps` scans, which is self-inflicted latency, not
    # a lease wait. Almost the entire population is uncontended, so that noise would land
    # directly on the median this item exists to produce. Same granularity trap the
    # `attempts >= 3` valve above documents. Stamped once, on a path that is about to sleep
    # anyway, so the fork costs nothing that matters.
    if [ -z "$wait_t0" ]; then wait_t0="$(date +%s)"; fi

    line="$(cat "$dir/owner" 2>/dev/null || true)"
    if [ -z "$line" ]; then
      # mkdir succeeded for someone but the owner write did not land (a kill in between).
      # Reclaimable: nobody can prove they hold it.
      reclaimed=$(( reclaimed + 1 ))
      rm -rf "$dir" 2>/dev/null || true
    else
      pid="$(printf '%s' "$line" | cut -f1)"
      start="$(printf '%s' "$line" | cut -f2)"
      comm="$(printf '%s' "$line" | cut -f3)"
      held="$(printf '%s' "$line" | cut -f4)"
      # Field 5 only exists on records written since INFRA-472; empty is a valid reading.
      acq="$(printf '%s' "$line" | cut -f5)"
      state="$(e2e_lock_holder_state "$pid" "$start")"
      # FIRST contender wins the attribution: on a long wait the record can be replaced by
      # a third session, and the one that actually blocked us is the one worth naming.
      if [ -z "$holder_pid" ] && [ -n "$pid" ]; then
        holder_pid="$pid"
        holder_label="$held"
      fi
      case "$state" in
        DEAD|RECYCLED)
          reclaimed=$(( reclaimed + 1 ))
          rm -rf "$dir" 2>/dev/null || true
          ;;
        *)
          if e2e_lock_force_requested; then
            echo "⚠️  e2e-sim-lock: FORCE — overriding a LIVE holder of the $what." >&2
            echo "     holder:        pid $pid ($comm), label: ${held:-unknown}" >&2
            echo "     running since: $start" >&2
            echo "     acquired:      $(e2e_lock_fmt_time "$acq")" >&2
            echo "   That process is still alive. If it is mid-build or mid-flow, this run" >&2
            echo "   will clobber it. E2E_LOCK_FORCE is for a holder you have confirmed is" >&2
            echo "   wedged — the classifier reclaims crashed and recycled holders by itself." >&2
            # A flag, not a fourth outcome, and deliberately NOT counted as a reclaim: the
            # holder was LIVE, so calling it stale would misreport the lock as unreliable.
            forced=1
            rm -rf "$dir" 2>/dev/null || true
            continue
          fi
          saw_live=1
          now="$(date +%s)"
          if [ "$now" -ge "$deadline" ]; then
            echo "e2e-sim-lock: could not acquire the $what within ${timeout}s." >&2
            echo "  Held by pid $pid ($comm, label: ${held:-unknown})." >&2
            echo "  running since $start; acquired $(e2e_lock_fmt_time "$acq")." >&2
            echo "  Another session holds this resource. Wait for it, or raise" >&2
            echo "  E2E_LOCK_TIMEOUT. Do NOT delete $dir by hand while that pid lives —" >&2
            echo "  if you have confirmed it is wedged, re-run with E2E_LOCK_FORCE=1." >&2
            e2e_telemetry_lock "$now" "$ns" "$udid" refused $(( now - ${wait_t0:-$t0} )) "$label" \
              "$holder_pid" "$holder_label" "$forced"
            return 1
          fi
          sleep 1
          ;;
      esac
    fi
  done
}

# Release only what we actually hold. An unconditional `rm -rf` in a trap would hand a
# peer's device away mid-flow — precisely the interleaving this exists to prevent.
# e2e_lock_release <key> [namespace]
e2e_lock_release() {
  local udid="${1:-}" ns="${2:-sim}" dir line pid
  [ -n "$udid" ] || return 0
  dir="$(e2e_lock_dir "$udid" "$ns")" || return 0
  [ -d "$dir" ] || return 0

  line="$(cat "$dir/owner" 2>/dev/null || true)"
  pid="$(printf '%s' "$line" | cut -f1)"
  if [ "$pid" = "$$" ]; then
    rm -rf "$dir" 2>/dev/null || true
  fi
  return 0
}

# --- The pair (INFRA-472) ---------------------------------------------------------------

# e2e_lock_pair_order <ns1> <key1> <ns2> <key2>
#
# The canonical acquisition order, as `<ns><TAB><key>` lines. Sorted rather than taken as
# given: this is the ONLY thing standing between two sessions and a mutual 1800 s wait, and
# a rule the call sites have to remember is a rule that gets forgotten. `gatetree` sorts
# before `sim`, which also happens to put the cheaper refusal first.
e2e_lock_pair_order() {
  printf '%s\t%s\n%s\t%s\n' "${1:-}" "${2:-}" "${3:-}" "${4:-}" | LC_ALL=C sort
}

# e2e_lock_acquire_pair <ns1> <key1> <ns2> <key2> [timeout_s] [label]
#
# Both or neither. A partial acquire is worse than none: this session refuses anyway, and a
# peer that needed only the OTHER resource is left blocked by a lease whose holder is LIVE
# (this pid) and therefore not reclaimable.
e2e_lock_acquire_pair() {
  local timeout="${5:-$E2E_LOCK_TIMEOUT_DEFAULT}" label="${6:-${E2E_LOCK_LABEL:-gate}}"
  local ordered ns key taken_ns='' taken_key=''

  ordered="$(e2e_lock_pair_order "$1" "$2" "$3" "$4")"

  # Heredoc, not a pipe: a pipeline would run this loop in a subshell and lose `taken_*`,
  # so the rollback below would silently never fire.
  while IFS=$'\t' read -r ns key; do
    [ -n "$ns" ] || continue
    if ! e2e_lock_acquire "$key" "$timeout" "$label" "$ns"; then
      [ -n "$taken_ns" ] && e2e_lock_release "$taken_key" "$taken_ns"
      return 1
    fi
    taken_ns="$ns"
    taken_key="$key"
  done <<EOF
$ordered
EOF
  return 0
}

# e2e_lock_release_pair <ns1> <key1> <ns2> <key2>
e2e_lock_release_pair() {
  e2e_lock_release "${2:-}" "${1:-sim}"
  e2e_lock_release "${4:-}" "${3:-sim}"
  return 0
}
