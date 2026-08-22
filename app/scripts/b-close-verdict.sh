#!/usr/bin/env bash
# =========================================================================================
# TYPED VERDICTS AND RUN STATE for a detached /b-close. SOURCED, never executed.
# (INFRA-492)
#
# WHY THIS FILE EXISTS
# --------------------
# `/b-close` Phase 2.5 blocks the calling session for the gate build (1-4 min warm, 11-14 min
# post-regen, 21m31s cold) plus the scoped flows (1-12 min). Serialising closes on the
# INFRA-436/463/472 leases is correct, but each blocked session is a blocked operator, and
# a silent terminal is indistinguishable from a hang. Detaching that block is cheap.
# Reporting its failure reliably is not, and that is what this file is.
#
# OK IS THE ONLY TOKEN THAT MERGES
# --------------------------------
# A detached close that merges on a misread verdict is strictly worse than the blocking it
# removes. So every stage's outcome is mapped through `b_close_stage_verdict`, whose `*)`
# arm on EVERY stage answers a named refusal rather than OK. An exit code added upstream
# therefore arrives as a refusal, not as consent, without anyone having to remember to
# extend this table.
#
# THE CI FILTER IS A CONSTANT, NOT A RE-IMPLEMENTATION
# ----------------------------------------------------
# `B_CLOSE_CI_JQ` is the filter from /b-close Step 3.4(c), verbatim. The runner hands it to
# `gh pr view -q` (gh embeds jq, so this adds no runtime dependency) and the test evaluates
# the same string against fixture JSON. Two known misreads are baked into it and must not
# be "simplified" out: `.conclusion // .state`, because non-Actions integrations report
# `.state` and reading only `.conclusion` renders them null and permanently red; and the
# explicit `length == 0` arm, because jq's `all` is true on an empty array, which would
# turn "no checks registered" into GREEN. `CI pass` is the sole required context, so an
# empty rollup is indistinguishable from "the workflow never triggered".
#
# THE RUN DIRECTORY LIVES OUTSIDE EVERY WORKTREE, AND THAT IS A CORRECTNESS CONSTRAINT
# ------------------------------------------------------------------------------------
# `e2e-provenance.js`'s fingerprint hashes UNTRACKED file contents repo-wide, so a status
# file under any worktree changes the tree hash and makes the next provenance verify return
# MISMATCH — under `E2E_REQUIRE_CLEAN_PROVENANCE=1`, refusing the very close it is
# tracking. Not $TMPDIR either: macOS gives each user a private /var/folders/<hash>/T, and
# a surface two sessions cannot both read answers the wrong question. This is the third
# sibling of /tmp/being-e2e-locks and /tmp/being-e2e-telemetry, for the same reason.
#
# DONE IS WRITTEN LAST, AND SILENCE IS NEVER A PASS
# -------------------------------------------------
# A run directory without `DONE` is in flight, not passed. A runner killed mid-flight
# leaves `status` frozen with no `DONE` at all, which looks exactly like a long build — so
# `b_close_status` ages `status` and reports STALE rather than letting it read as work in
# progress forever. Nothing here ever infers success from an absence.
# =========================================================================================

B_CLOSE_RUN_ROOT="${B_CLOSE_RUN_ROOT:-/tmp/being-e2e-closes}"

# Longest single phase is the cold gate build (measured 21m31s), and `status` is rewritten
# at every phase transition including each lease retry, so this ages a PHASE, not a run.
B_CLOSE_STALE_S="${B_CLOSE_STALE_S:-2700}"

# Exit 4 means a peer holds the gate pair lease — contention, saying nothing about this
# branch. Detached closes queue rather than dying on it, but the queue is bounded: an
# unbounded retry is a wedged gate nobody is watching.
B_CLOSE_LEASE_RETRIES="${B_CLOSE_LEASE_RETRIES:-3}"
B_CLOSE_LEASE_BACKOFF_S="${B_CLOSE_LEASE_BACKOFF_S:-600}"

B_CLOSE_CI_TIMEOUT_S="${B_CLOSE_CI_TIMEOUT_S:-2400}"

B_CLOSE_CI_JQ='[.statusCheckRollup[] | (.conclusion // .state)]
| if length == 0 then "EMPTY"
  elif all(. == "SUCCESS" or . == "NEUTRAL" or . == "SKIPPED") then "GREEN"
  else "RED" end'

# Decides only whether to KEEP WAITING; the merge is gated on B_CLOSE_CI_JQ alone. A row
# with no `.status` is a StatusContext, which has no running state — defaulting it to
# COMPLETED stops one from holding the wait open forever.
B_CLOSE_CI_PENDING_JQ='[.statusCheckRollup[] | (.status // "COMPLETED")] | any(. != "COMPLETED")'

# ---------------------------------------------------------------------------------------
# b_close_stage_verdict <stage> <outcome> -> one token on stdout, never empty.
#
# `outcome` is an exit code for process stages and the rollup word for `ci`. Exit alphabets
# belong to the scripts that own them and are mirrored, not redefined: `gate` is
# e2e-gate.sh's (INFRA-472 added 4), `flows` is e2e-safety.sh's 0/1/2/3 (INFRA-434 added
# 3). Do NOT collapse the flows arms — 2 (harness could not complete) and 3 (target
# replaced mid-suite) are not verdicts about the branch at all, and reporting them as a
# regression trains the re-run-or-bypass reflex the gate exists to prevent.
# ---------------------------------------------------------------------------------------
b_close_stage_verdict() {
  local stage="${1:-}" outcome="${2:-}"
  case "$stage" in
    gate)
      case "$outcome" in
        0) printf 'OK' ;;
        4) printf 'LEASE_BUSY' ;;
        *) printf 'GATE_FAILED' ;;
      esac ;;
    flows)
      case "$outcome" in
        0) printf 'OK' ;;
        1) printf 'FLOW_RED' ;;
        2) printf 'HARNESS' ;;
        3) printf 'TARGET_REPLACED' ;;
        *) printf 'UNKNOWN_FLOWS' ;;
      esac ;;
    ci)
      case "$outcome" in
        GREEN)   printf 'OK' ;;
        RED)     printf 'CI_RED' ;;
        EMPTY)   printf 'CI_EMPTY' ;;
        TIMEOUT) printf 'CI_TIMEOUT' ;;
        *)       printf 'CI_UNKNOWN' ;;
      esac ;;
    precommit) [ "$outcome" = "0" ] && printf 'OK' || printf 'PRECOMMIT_RED' ;;
    # 1 is `git merge`'s conflict exit and needs a human in the worktree; anything else
    # means the sync could not be attempted at all. Opposite fixes, so opposite names.
    sync)
      case "$outcome" in
        0) printf 'OK' ;;
        1) printf 'CONFLICT' ;;
        *) printf 'SYNC_FAILED' ;;
      esac ;;
    push)      [ "$outcome" = "0" ] && printf 'OK' || printf 'PUSH_FAILED' ;;
    pr)        [ "$outcome" = "0" ] && printf 'OK' || printf 'PR_FAILED' ;;
    merge)     [ "$outcome" = "0" ] && printf 'OK' || printf 'MERGE_REFUSED' ;;
    *)         printf 'UNKNOWN_STAGE' ;;
  esac
}

# b_close_fail_hint <logfile> -> one line naming the failing suite/test, or nothing.
#
# A stage name alone is not "naming which": a precommit log runs to six figures of lines,
# so `PRECOMMIT_RED — exit 1` leaves the operator unable to tell a regression from the
# documented parallel-load flake without grepping it. Flattened to one line because a
# newline inside a DONE record would split it into unparseable records. Silent on a clean
# or missing log — a hint is an aid to the verdict, never a source of one.
b_close_fail_hint() {
  local log="${1:-}"
  [ -f "$log" ] || return 0
  grep -hoE '^(FAIL [^ ]+|[[:space:]]+✕ .*)' "$log" 2>/dev/null \
    | tail -2 | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//'
  return 0
}

# The whole merge gate, in one line. Everything else is a named refusal.
b_close_mergeable() { [ "${1:-}" = "OK" ]; }

b_close_run_dir() {
  local item="${1:-unknown}" epoch="${2:-0}"
  printf '%s/%s-%s' "$B_CLOSE_RUN_ROOT" "${item//\//-}" "$epoch"
}

b_close_run_init() {
  local dir="${1:-}" item="${2:-}" branch="${3:-}"
  [ -n "$dir" ] || return 0
  mkdir -p "$dir" 2>/dev/null || return 0
  printf 'item=%s\nbranch=%s\nstarted=%s\npid=%s\n' \
    "$item" "$branch" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$$" > "$dir/meta"
  b_close_status_write "$dir" queued
}

# Atomic: a reader must never see a half-written phase name.
b_close_status_write() {
  local dir="${1:-}" phase="${2:-}"
  [ -d "$dir" ] || return 0
  printf '%s %s\n' "$phase" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$dir/.status.tmp" 2>/dev/null || return 0
  mv -f "$dir/.status.tmp" "$dir/status" 2>/dev/null || true
}

# DONE is written LAST and is the only thing that ends a run. Its presence means a verdict
# was reached; its absence never means success.
b_close_done() {
  local dir="${1:-}" verdict="${2:-UNKNOWN}" stage="${3:-}" detail="${4:-}"
  [ -d "$dir" ] || return 0
  printf 'verdict=%s\nstage=%s\ndetail=%s\nfinished=%s\n' \
    "$verdict" "$stage" "${detail//$'\n'/ }" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    > "$dir/.done.tmp" 2>/dev/null || return 0
  mv -f "$dir/.done.tmp" "$dir/DONE" 2>/dev/null || true
}

# ---------------------------------------------------------------------------------------
# b_close_status — the operator surface. Exits non-zero when something needs a human, so a
# caller can gate on it; `/b-close` and `/b-work` read it before starting new work, which
# is what makes "not silently absorbed" structural rather than a matter of remembering to
# look. An acknowledged run (ACK) goes quiet; a merged-but-unacknowledged one is still
# listed, because the Notion record is deliberately NOT the runner's job.
# ---------------------------------------------------------------------------------------
b_close_status() {
  local rc=0 dir meta item branch verdict stage detail phase now age
  [ -d "$B_CLOSE_RUN_ROOT" ] || { printf 'No detached closes recorded.\n'; return 0; }
  now=$(date +%s)

  for dir in "$B_CLOSE_RUN_ROOT"/*/; do
    [ -d "$dir" ] || continue
    dir="${dir%/}"
    item=''; branch=''
    meta="$dir/meta"
    if [ -f "$meta" ]; then
      item=$(sed -n 's/^item=//p' "$meta")
      branch=$(sed -n 's/^branch=//p' "$meta")
    fi
    [ -n "$item" ] || item='(unknown)'

    if [ -f "$dir/DONE" ]; then
      [ -f "$dir/ACK" ] && continue
      verdict=$(sed -n 's/^verdict=//p' "$dir/DONE")
      stage=$(sed -n 's/^stage=//p' "$dir/DONE")
      detail=$(sed -n 's/^detail=//p' "$dir/DONE")
      if [ "$verdict" = "MERGED" ]; then
        printf '✅ %s  %s  MERGED  %s\n' "$item" "$branch" "$detail"
        printf '   Notion is NOT updated by the runner — record it, then: touch %s/ACK\n' "$dir"
      else
        printf '❌ %s  %s  %s at stage %s  %s\n' "$item" "$branch" "$verdict" "$stage" "$detail"
        printf '   log: %s/log   ack: touch %s/ACK\n' "$dir" "$dir"
        rc=1
      fi
      continue
    fi

    phase=$(awk '{print $1}' "$dir/status" 2>/dev/null)
    [ -n "$phase" ] || phase='(none)'
    # GNU first, BSD second — NOT the reverse. On GNU coreutils `stat -f` is
    # --file-system and `%m` is the MOUNT POINT, so `stat -f %m` prints "/" and exits 0,
    # defeating a `||` fallback and feeding a non-number to the arithmetic below. BSD stat
    # has no -c, so it errors cleanly and falls through. Ordering is the whole fix.
    mtime=$(stat -c %Y "$dir/status" 2>/dev/null || stat -f %m "$dir/status" 2>/dev/null || echo "$now")
    case "$mtime" in (*[!0-9]*|'') mtime="$now" ;; esac
    age=$(( now - mtime ))
    if [ "$age" -gt "$B_CLOSE_STALE_S" ]; then
      printf '⚠️  %s  %s  STALE at %s (%ss without progress) — presumed dead, no verdict\n' \
        "$item" "$branch" "$phase" "$age"
      printf '   log: %s/log\n' "$dir"
      rc=1
    else
      printf '⏳ %s  %s  in flight: %s (%ss)\n' "$item" "$branch" "$phase" "$age"
    fi
  done
  return $rc
}
