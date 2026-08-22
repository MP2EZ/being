#!/usr/bin/env bash
# =========================================================================================
# XCUITest driver OWNERSHIP for the safety gate. SOURCED, never executed. (INFRA-423)
#
# WHY THIS FILE EXISTS
# --------------------
# `e2e-safety.sh` reset the driver between flows with:
#
#     pkill -9 -f "test-without-building"
#
# `pkill -f` matches a SUBSTRING of every process's full command line. It is blind to
# which worktree, session, or device owns a driver, so it reaped every driver on the
# machine — including one another worktree's suite was actively using. It also matched any
# *shell* that merely MENTIONED the string: Claude Code wraps Bash calls in
# `/bin/zsh -c '<command>'`, so a check written that way matches its own wrapper. Correct
# when a human tests it interactively, wrong when it runs from a script or an agent, which
# is why review does not catch it.
#
# DEBUG-392 gated that reap on `other_maestro_jvms()` — "skip while a peer JVM is live".
# That changed how OFTEN it fired, never WHAT it targeted, and left two gaps:
#
#   1. When it DOES fire it is still machine-wide. A peer sitting between its own flows
#      has no live JVM — it is inside its own `sleep 8` settle — so the guard sees nothing,
#      fires, and reaps a driver belonging to a run that is very much alive.
#   2. It cannot tell a peer's LIVE JVM from a STALE driver left by this session's own
#      crashed run, so it declines the self-recovery the reset exists for.
#
# HOW OWNERSHIP IS ACTUALLY DECIDED
# ---------------------------------
# Captured live at planning (read-only `ps`, maestro 2.6.0, Xcode xcodebuild):
#
#   pid    pgid   ppid   args
#   47671  42244  42290  java … maestro.cli.AppKt test --device 5C81114E-… <flow>.yaml
#   47709  42244  47671  …/xcodebuild test-without-building -xctestrun /…/5C81114E-… \
#                        -destination id=5C81114E-…
#
# The driver is a DIRECT CHILD of the maestro JVM and inherits its PGID — maestro does not
# daemonize it away. The UDID really is in the driver's argv, twice.
#
# But that same capture killed UDID-as-ownership outright: TWO worktrees were pinned to
# the SAME simulator at once. On this machine the UDID is a DEVICE FILTER, never an owner.
# Reaping `test-without-building + $SIM_UDID` would be the identical defect with a longer
# pattern. The UDID below is therefore a NARROWING predicate applied to an already
# identity-established process set — which is not the substring-as-identity defect.
#
# So ownership is: **attributable to a live maestro JVM**.
#
#   pgid == our pgid          -> REAP     (ours)
#   ppid is a live maestro JVM-> PROTECT  (a peer, mid-flow)
#   ppid == 1, or absent      -> REAP     (orphan — belongs to no live run)
#   otherwise                 -> PROTECT  (unknown live parent; fail toward not-killing)
#
# The orphan rule deliberately also reaps a PEER's crashed leftover. An orphan wedges the
# shared simulator and cannot be serving a suite that is still going, so this is safe; and
# it is what makes self-recovery solvable with NO state file. A lease keyed on a PID can
# rot, be orphaned by a hard kill, and PIDs recycle. Orphanhood is self-maintaining.
#
# Note this is also the ordinary between-flows reset, not an extra case: by the time the
# reap runs, `wait "$child"` has already returned, so OUR OWN driver is an orphan too.
#
# Identity is taken from `comm` (the executable), never from a substring of the command
# line — the same shape DEBUG-392's `other_maestro_jvms()` established, and for the same
# reason. `ps` prints a BARE name for java but a FULL PATH for xcodebuild, hence the
# `(^|/)name$` anchoring on both — and hence the two-read table below, since the path form
# is the one macOS truncates.
#
# This file sets no `set` options: callers differ in `set -e`/`pipefail` (the mirror of
# e2e-sim-device.sh's contract), so every function handles its own failure explicitly.
# =========================================================================================

# One process table, shared by every function below. Bash 3.2 on macOS has no associative
# arrays, so all classification happens inside awk.
#
# TWO READS, DELIBERATELY (INFRA-476). This was a single
# `ps -axo pid=,ppid=,pgid=,comm=,args=`. macOS caps `comm` at 16 characters whenever
# `args` is requested in the SAME invocation — measured, a 119-char comm comes back as
# `/System/Library/` — so the driver's
# `/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild` arrived as
# `/Applications/Xc` and could never satisfy the `(^|/)xcodebuild$` anchoring below.
# Every xcodebuild matcher in this file was dead. The java matchers kept working because
# `java` is 4 characters, which is why the asymmetry survived review and why the reap
# looked healthy on a quiet machine.
#
# Neither `-ww` nor reordering fixes it: `-ww` leaves the cap in place, and putting
# `args=` first just moves the truncation onto args. Read each column in the invocation
# where it is complete, then join on pid. Emitted shape is unchanged, so every consumer
# below is untouched: `pid ppid pgid comm args...`.
#
# A process that exits between the two reads is missing from the join and is simply not
# classified. That fails toward NOT reaping — the same direction as the unknown-parent
# rule below, and the safe one.
_e2e_ps_table() {
  {
    ps -axo pid=,ppid=,pgid=,comm= 2>/dev/null
    printf '%s\n' '===E2E_PS_SPLIT==='
    ps -axo pid=,args= 2>/dev/null
  } | awk '
    $0 == "===E2E_PS_SPLIT===" { seen_split = 1; next }
    !seen_split {
      _pid = $1
      pp[_pid] = $2
      pg[_pid] = $3
      c = $0
      sub(/^[[:space:]]*[0-9]+[[:space:]]+[0-9]+[[:space:]]+[0-9]+[[:space:]]+/, "", c)
      cm[_pid] = c
      have[_pid] = 1
      next
    }
    {
      _pid = $1
      if (!(_pid in have)) next
      a = $0
      sub(/^[[:space:]]*[0-9]+[[:space:]]+/, "", a)
      print _pid, pp[_pid], pg[_pid], cm[_pid], a
    }
  '
}

# Live maestro JVMs. Requires the executable to BE java AND the command line to carry the
# main class — a shell merely mentioning `maestro.cli.AppKt` is not a JVM.
#
# Optional arg: a PGID to exclude (ours). Absent/empty excludes nothing.
e2e_maestro_jvm_pids() {
  _own_pgid="${1:-}"
  _e2e_ps_table | awk -v own="$_own_pgid" '
    $4 ~ /(^|\/)java$/ && index($0, "maestro.cli.AppKt") {
      if (own != "" && $3 == own) next
      print $1
    }
  '
}

# XCUITest driver processes for one device, as `pid ppid pgid` rows.
#
# Fail-closed on an empty UDID: an empty match string would make `index()` true for every
# line and widen the set to every driver on the machine — the exact defect, reintroduced.
e2e_xcuitest_drivers() {
  _udid="${1:-}"
  [ -n "$_udid" ] || return 0
  _e2e_ps_table | awk -v udid="$_udid" '
    $4 ~ /(^|\/)xcodebuild$/ &&
    index($0, "test-without-building") &&
    index($0, udid) { print $1, $2, $3 }
  '
}

# THE decision function. Pure: prints pids, kills nothing, so it is testable against a
# synthetic `ps` table with no signals sent and no simulator.
#
#   $1 own_pgid — this run's process group (e2e-safety.sh's `$child` under `set -m`)
#   $2 udid     — the resolved simulator; empty means "no simulator driver applies"
e2e_drivers_to_reap() {
  _own_pgid="${1:-}"
  _udid="${2:-}"
  [ -n "$_udid" ] || return 0
  _e2e_ps_table | awk -v own="$_own_pgid" -v udid="$_udid" '
    {
      n++
      f_pid[n] = $1; f_ppid[n] = $2; f_pgid[n] = $3; f_comm[n] = $4; f_line[n] = $0
      alive[$1] = 1
      if ($4 ~ /(^|\/)java$/ && index($0, "maestro.cli.AppKt")) jvm[$1] = 1
    }
    END {
      for (i = 1; i <= n; i++) {
        if (f_comm[i] !~ /(^|\/)xcodebuild$/)          continue
        if (!index(f_line[i], "test-without-building")) continue
        if (!index(f_line[i], udid))                    continue

        # Ours, by process group — the driver inherits the maestro JVM PGID, and under
        # `set -m` that group is this run and nothing else.
        if (own != "" && f_pgid[i] == own) { print f_pid[i]; continue }

        # A peer, mid-flow. Never touch it. This is the whole point of the item.
        if (f_ppid[i] in jvm) continue

        # Ownerless: the JVM is gone, so it belongs to no running suite.
        if (f_ppid[i] == 1 || !(f_ppid[i] in alive)) { print f_pid[i]; continue }

        # Live parent that is not a maestro JVM — a future maestro may insert a wrapper.
        # Degrade to under-reaping rather than to reaping a peer.
      }
    }
  '
}

# Send the kill. Split from the decision so the classifier stays pure and so tests never
# have to signal synthetic PIDs on a developer machine — `kill` is a bash builtin, so the
# PATH-stub technique used for `ps` cannot intercept it.
#
# E2E_DRIVER_REAP_DRY_RUN=1 prints instead of killing. Safe by construction: it can only
# make the gate reap LESS. It can never produce a false green and never touches a peer.
e2e_reap_pids() {
  [ "$#" -gt 0 ] || return 0
  if [ "${E2E_DRIVER_REAP_DRY_RUN:-}" = "1" ]; then
    echo "DRY_RUN would kill: $*"
    return 0
  fi
  kill -9 "$@" 2>/dev/null || true
}
