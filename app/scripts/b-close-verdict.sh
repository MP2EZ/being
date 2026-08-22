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
    # INFRA-510 — the SECOND axis of a flow run, and the reason it is a separate stage
    # rather than a fifth `flows` arm: the exit alphabet is frozen at 0/1/2/3 and a
    # non-certifying all-green run still exits 0, so this verdict cannot be carried by an
    # exit code at all. Outcome is the token from `b_close_certification_verdict`, the
    # same word-outcome shape `ci` uses.
    certification)
      case "$outcome" in
        OK)                   printf 'OK' ;;
        CERT_UNCERTIFIED)     printf 'UNCERTIFIED_FLOW' ;;
        CERT_VOID)            printf 'CERT_VOID' ;;
        CERT_RECEIPT_MISSING) printf 'CERT_NO_RECEIPT' ;;
        *)                    printf 'CERT_UNKNOWN' ;;
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

# =========================================================================================
# INFRA-510 — THE VIEWPORT REFUSAL, SCOPED TO THE FLOWS THE CLOSE ACTUALLY REQUESTED
#
# INFRA-493 wrote the verdict; this reads it. It refuses on the INTERSECTION of the
# receipt's `uncertified_flows:` with the requested set, NEVER on the run-level
# `certification:` line. The suite carries more than one certifying target and
# `e2e_resolve_sim_device` pins ONE device, so no device produces a run-level CERTIFIED
# over the whole suite — a refusal reading that line would refuse every FULL_SUITE close,
# and the documented response to an unsatisfiable gate is `--skip-e2e` habit.
#
# NOT A SECOND COPY OF THE COMPARISON. `e2e_run_certifies` remains the single authority on
# whether a run certifies a flow; this never re-derives it. It is set membership over that
# function's already-published output, which is why the anti-drift pin the technical notes
# ask for is a WRITER/READER key pin and not a matrix.
#
# FAIL CLOSED ON EVERY PATH. No receipt, no `certification:` line, an unrecognised token
# and an empty requested set all refuse. The last is the one worth stating: an empty set
# means FULL_SUITE, i.e. every flow was requested, so the intersection is the whole set.
# Reading "no flows named" as "nothing to check" is the shape that merges everything.
# =========================================================================================

# b_close_uncertified_intersection <receipt> [requested-flow ...] -> names on stdout
#
# The offending set, in the receipt's own order, empty when the close requested none of
# them. Comparison is WORD-EXACT, never a substring: `reconsent-stale` is a proper prefix
# of `reconsent-stale-ineligible` and the two declare DIFFERENT targets, so a substring
# match refuses the wrong close in one direction and merges a red one in the other.
b_close_uncertified_intersection() {
  local receipt="${1:-}"
  [ "$#" -gt 0 ] && shift
  [ -n "$receipt" ] && [ -r "$receipt" ] || return 0
  local line
  line="$(sed -n 's/^uncertified_flows:[[:space:]]*//p' "$receipt" | head -1)"
  # `none` is the writer's empty rendering, not a flow name.
  [ -n "$line" ] && [ "$line" != "none" ] || return 0
  if [ "$#" -eq 0 ]; then printf '%s' "$line"; return 0; fi
  local out="" u r
  for u in $line; do
    for r in "$@"; do
      if [ "$u" = "$r" ]; then out="${out:+$out }$u"; break; fi
    done
  done
  printf '%s' "$out"
  return 0
}

# b_close_certification_verdict <receipt> [requested-flow ...] -> one token, never empty
#
# A PREDICATE, NOT A GATE — exits 0 on every path including the refusing ones, so it can be
# called from `set -e` territory without refusing the RUN rather than the MERGE. The
# refusal is the caller's, over this token.
b_close_certification_verdict() {
  local receipt="${1:-}"
  [ "$#" -gt 0 ] && shift
  [ -n "$receipt" ] && [ -r "$receipt" ] || { printf 'CERT_RECEIPT_MISSING'; return 0; }
  local cert
  cert="$(sed -n 's/^certification:[[:space:]]*\([A-Za-z_]*\).*/\1/p' "$receipt" | head -1)"
  case "$cert" in
    # INFRA-434 already ruled every completed flow inconclusive when the target moved.
    # VOID must not be salvageable by scoping: scoping narrows WHICH verdicts apply, not
    # WHETHER one exists.
    VOID)                    printf 'CERT_VOID'; return 0 ;;
    CERTIFIED|UNCERTIFIED)   : ;;
    *)                       printf 'CERT_UNKNOWN'; return 0 ;;
  esac
  # Derived from the intersection, not from the token above, so a receipt whose two halves
  # disagree refuses rather than merging on the friendlier one.
  if [ -n "$(b_close_uncertified_intersection "$receipt" "$@")" ]; then
    printf 'CERT_UNCERTIFIED'
  else
    printf 'OK'
  fi
  return 0
}

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
