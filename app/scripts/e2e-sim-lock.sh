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
# NOT $TMPDIR. macOS gives each user a private /var/folders/<hash>/T, and a lock two
# sessions cannot both see is not a lock. The root is an explicit shared path.

E2E_LOCK_ROOT="${E2E_LOCK_ROOT:-/tmp/being-e2e-locks}"

# Default wait. Sized to outlast a legitimate peer: a full 8-flow suite plus its build.
# Fail-fast would make a queue of closes unusable; waiting forever inside /b-close is
# indistinguishable from a hang.
E2E_LOCK_TIMEOUT_DEFAULT="${E2E_LOCK_TIMEOUT:-1800}"

e2e_lock_dir() {
  [ -n "${1:-}" ] || return 1
  printf '%s/sim-%s.d\n' "$E2E_LOCK_ROOT" "$1"
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
  printf '%s\t%s\t%s\t%s\n' "$$" "$start" "${comm:-unknown}" "$label" > "$dir/owner"
}

# e2e_lock_acquire <udid> [timeout_s] [label]
e2e_lock_acquire() {
  local udid="${1:-}" timeout="${2:-$E2E_LOCK_TIMEOUT_DEFAULT}" label="${3:-${E2E_LOCK_LABEL:-gate}}"
  local dir deadline line pid start comm held state now

  # An empty key would collapse every device onto a single lock path — the same "an empty
  # match string must never widen" rule INFRA-423 pins for the reaper.
  if [ -z "$udid" ]; then
    echo "e2e-sim-lock: refusing to acquire with an empty udid." >&2
    echo "  An empty key would lock every simulator onto one path. Resolve the device first" >&2
    echo "  (e2e-sim-device.sh), then pass the resolved UDID." >&2
    return 2
  fi

  dir="$(e2e_lock_dir "$udid")" || return 2
  mkdir -p "$E2E_LOCK_ROOT" 2>/dev/null || true
  now="$(date +%s)"
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
        echo "e2e-sim-lock: could not acquire the simulator lock for $udid within ${timeout}s," >&2
        echo "  and no live holder was found. Check that $E2E_LOCK_ROOT is writable and that" >&2
        echo "  $dir is not being recreated by a looping process." >&2
        return 1
      fi
    fi

    # mkdir is the atomic primitive: it either creates the directory or fails, with no
    # test-then-act window for a peer to slip through.
    if mkdir "$dir" 2>/dev/null; then
      if e2e_lock_write_owner "$dir" "$label"; then
        return 0
      fi
      rmdir "$dir" 2>/dev/null
      echo "e2e-sim-lock: acquired the lock but could not record ownership; released it." >&2
      return 1
    fi

    line="$(cat "$dir/owner" 2>/dev/null || true)"
    if [ -z "$line" ]; then
      # mkdir succeeded for someone but the owner write did not land (a kill in between).
      # Reclaimable: nobody can prove they hold it.
      rm -rf "$dir" 2>/dev/null || true
    else
      pid="$(printf '%s' "$line" | cut -f1)"
      start="$(printf '%s' "$line" | cut -f2)"
      comm="$(printf '%s' "$line" | cut -f3)"
      held="$(printf '%s' "$line" | cut -f4)"
      state="$(e2e_lock_holder_state "$pid" "$start")"
      case "$state" in
        DEAD|RECYCLED)
          rm -rf "$dir" 2>/dev/null || true
          ;;
        *)
          saw_live=1
          now="$(date +%s)"
          if [ "$now" -ge "$deadline" ]; then
            echo "e2e-sim-lock: could not acquire the simulator lock for $udid within ${timeout}s." >&2
            echo "  Held by pid $pid ($comm, label: ${held:-unknown}), running since $start." >&2
            echo "  Another session is building or running flows on this device. Wait for it," >&2
            echo "  or raise E2E_LOCK_TIMEOUT. Do NOT delete $dir by hand while that pid lives." >&2
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
e2e_lock_release() {
  local udid="${1:-}" dir line pid
  [ -n "$udid" ] || return 0
  dir="$(e2e_lock_dir "$udid")" || return 0
  [ -d "$dir" ] || return 0

  line="$(cat "$dir/owner" 2>/dev/null || true)"
  pid="$(printf '%s' "$line" | cut -f1)"
  if [ "$pid" = "$$" ]; then
    rm -rf "$dir" 2>/dev/null || true
  fi
  return 0
}
